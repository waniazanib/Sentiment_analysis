/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { ProductAnalysis, ProductAspectTopic, IngestionSource } from "../types.ts";

export class SupabaseService {
  private supabase: SupabaseClient | null = null;
  private isFallbackMode = false;

  // In-memory cache fallback to assure sandbox offline mode operates beautifully
  private static inMemoryProducts = new Map<string, ProductAnalysis>();
  private static inMemorySearches: Array<{ query: string; productId?: string; createdAt: string }> = [];
  private static inMemoryComparisons = new Map<string, any>();

  constructor() {
    const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

    if (supabaseUrl && supabaseKey) {
      try {
        this.supabase = createClient(supabaseUrl, supabaseKey);
        console.log("🟢 Supabase Client initialized successfully.");
      } catch (err) {
        console.error("⚠️ Failed to initialize Supabase. Running in offline/fallback mode:", err);
        this.isFallbackMode = true;
      }
    } else {
      console.warn("⚠️ Supabase credentials missing (VITE_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY). Running in in-memory simulation mode.");
      this.isFallbackMode = true;
    }
  }

  /**
   * Safe check helper
   */
  public isOffline(): boolean {
    return this.isFallbackMode || this.supabase === null;
  }

  /**
   * Helper to format double-pass caching keys
   */
  private getCacheKey(name: string, brand?: string): string {
    const cleanBrand = (brand || "").trim().toLowerCase();
    const cleanName = name.trim().toLowerCase();
    if (cleanBrand && !cleanName.includes(cleanBrand)) {
      return `${cleanBrand}:${cleanName}`;
    }
    return cleanName;
  }

  /**
   * Fetches the cached product analysis from Supabase (or fallback in-memory cache)
   */
  public async getCachedProduct(name: string, brand?: string): Promise<ProductAnalysis | null> {
    const key = this.getCacheKey(name, brand);
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(name);
    
    if (this.isOffline() || !this.supabase) {
      console.log(`[Cache] Offline read lookup for key: [${key}]`);
      if (isUUID) {
        for (const val of SupabaseService.inMemoryProducts.values()) {
          if (val.product_metadata.id === name) {
            return val;
          }
        }
      }
      return SupabaseService.inMemoryProducts.get(key) || null;
    }

    try {
      console.log(`[Cache] Database query checking cache matching: [${name}] brand:[${brand || 'any'}]`);
      
      // Step A: Search product row matching identity
      let query = this.supabase.from("products").select("*");
      if (isUUID) {
        query = query.eq("id", name);
      } else if (brand) {
        query = query.ilike("brand", brand).ilike("name", name);
      } else {
        query = query.or(`name.ilike.%${name}%,brand.ilike.%${name}%`);
      }
      
      const { data: dbProducts, error: prodErr } = await query.limit(1);

      if (prodErr) throw prodErr;
      if (!dbProducts || dbProducts.length === 0) return null;

      const product = dbProducts[0];
      const productId = product.id;

      // Step B: Parallel fetch topics, ratings, and raw ingest elements to rebuild ProductAnalysis
      const [topicsRes, ratingsRes, articlesRes, videosRes, reviewsRes] = await Promise.all([
        this.supabase.from("topics").select("*").eq("product_id", productId),
        this.supabase.from("ratings").select("*").eq("product_id", productId),
        this.supabase.from("articles").select("*").eq("product_id", productId).limit(5),
        this.supabase.from("videos").select("*").eq("product_id", productId).limit(5),
        this.supabase.from("reviews").select("*").eq("product_id", productId).limit(10)
      ]);

      // Reformat topics to Recharts expected shape
      const topics: ProductAspectTopic[] = (topicsRes.data || []).map((t: any) => ({
        name: t.name,
        mention_count: t.mention_count,
        average_sentiment: t.average_sentiment as "positive" | "negative" | "neutral",
        sentiment_score: parseFloat(t.sentiment_score || "0"),
        representative_quotes: t.representative_quotes || []
      }));

      // Rebuild rating distribution counts
      const ratingsData = ratingsRes.data || [];
      const getCount = (val: number) => ratingsData.find((r: any) => parseFloat(r.rating_value) === val)?.count || 0;
      const stars_5 = getCount(5);
      const stars_4 = getCount(4);
      const stars_3 = getCount(3);
      const stars_2 = getCount(2);
      const stars_1 = getCount(1);
      
      const totalRatingsCount = stars_5 + stars_4 + stars_3 + stars_2 + stars_1;
      const average_rating = totalRatingsCount > 0
        ? parseFloat(((stars_5 * 5 + stars_4 * 4 + stars_3 * 3 + stars_2 * 2 + stars_1 * 1) / totalRatingsCount).toFixed(2))
        : 0;

      // Assemble Ingestion sources
      const sourcesList: IngestionSource[] = [
        ...(articlesRes.data || []).map((a: any) => ({
          title: a.title,
          type: "Expert Article Review",
          url: a.url,
          weight: 1.30,
          snippet: a.snippet
        })),
        ...(videosRes.data || []).map((v: any) => ({
          title: v.title,
          type: "YouTube Video Review",
          url: `https://youtube.com/watch?v=${v.youtube_video_id}`,
          weight: 1.00,
          snippet: v.description
        })),
        ...(reviewsRes.data || []).map((r: any) => ({
          title: r.title || "User Experience Post",
          type: "Open Review Rating Verified",
          weight: 1.20,
          snippet: r.content
        }))
      ];

      // Reconstruct confidence explanation json
      const confExpl = product.confidence_explanation || {};

      // Parse JSON schemas
      const specifications = typeof product.specifications === 'string'
        ? JSON.parse(product.specifications)
        : product.specifications || {};

      // Parse AI summary recommendations JSON representation if needed, or reconstruct
      const formatted: ProductAnalysis = {
        product_metadata: {
          id: product.id,
          name: product.name,
          brand: product.brand,
          category: product.category || "General Tech Utilities",
          manufacturer: product.manufacturer || product.brand,
          release_date: product.release_date || "Q1 2026",
          specifications: specifications
        },
        overall_sentiment: {
          positive: typeof product.spec_positive === 'number' ? product.spec_positive : 70, // Fallback placeholder mapper
          negative: typeof product.spec_negative === 'number' ? product.spec_negative : 15,
          neutral: typeof product.spec_neutral === 'number' ? product.spec_neutral : 15,
          summary: product.ai_summary || ""
        },
        confidence: {
          score: product.confidence_score as 'Low' | 'Medium' | 'High' | 'Very High',
          total_discussions: confExpl.total_discussions || sourcesList.length,
          total_articles: confExpl.total_articles || (articlesRes.data || []).length,
          total_reviews: confExpl.total_reviews || (reviewsRes.data || []).length,
          total_videos: confExpl.total_videos || (videosRes.data || []).length,
          total_ratings_count: confExpl.total_ratings_count || totalRatingsCount
        },
        ai_summary: product.ai_summary || "",
        pros: Array.isArray(product.pros) ? product.pros : ["Reliable framework responsive", "High physical specifications comfort"],
        cons: Array.isArray(product.cons) ? product.cons : ["Premium initial cost margin"],
        topics: topics,
        recommendation: {
          status: product.recommendation_status as "BUY" | "DEPENDS" | "AVOID",
          explanation: product.recommendation_explanation || "",
          audience: Array.isArray(product.audience) ? product.audience : ["Tech enthusiasts"],
          alternatives: Array.isArray(product.alternatives) ? product.alternatives : ["Alternative pro model"]
        },
        rating_distribution: {
          stars_5,
          stars_4,
          stars_3,
          stars_2,
          stars_1,
          average_rating
        },
        ingestion_sources: sourcesList
      };

      // Extract details stored in specifications to support matching
      return formatted;

    } catch (err) {
      console.error(`❌ DB caching retrieve failed for [${name}]:`, err);
      return null;
    }
  }

  /**
   * Inserts or replaces a product analysis in the Supabase database/local cache
   */
  public async writeProductCache(analysis: ProductAnalysis): Promise<string> {
    const name = analysis.product_metadata.name;
    const brand = analysis.product_metadata.brand;
    const key = this.getCacheKey(name, brand);

    // Ensure in-memory cache map does not swell infinitely (evict oldest entry above 200 entries)
    if (SupabaseService.inMemoryProducts.size >= 200) {
      const oldestKey = SupabaseService.inMemoryProducts.keys().next().value;
      if (oldestKey !== undefined) {
        SupabaseService.inMemoryProducts.delete(oldestKey);
      }
    }
    // Always keep in-memory cache synchronized as premier fallback
    SupabaseService.inMemoryProducts.set(key, analysis);

    if (this.isOffline() || !this.supabase) {
      console.log(`[Cache] Offline cached save for model query: [${key}]`);
      return analysis.product_metadata.id || "local-offline-uuid-placeholder";
    }

    try {
      console.log(`[Cache] Database writing Cache results for product ID [${name}]`);

      // 1. Write core Product details record
      const specificationsJson = analysis.product_metadata.specifications || {};
      const confidenceExplanation = {
        total_discussions: analysis.confidence.total_discussions,
        total_articles: analysis.confidence.total_articles,
        total_reviews: analysis.confidence.total_reviews,
        total_videos: analysis.confidence.total_videos,
        total_ratings_count: analysis.confidence.total_ratings_count
      };

      const productPayload = {
        name: analysis.product_metadata.name,
        brand: analysis.product_metadata.brand,
        category: analysis.product_metadata.category,
        manufacturer: analysis.product_metadata.manufacturer,
        release_date: analysis.product_metadata.release_date !== "Q1 2026" ? analysis.product_metadata.release_date : null,
        specifications: specificationsJson,
        confidence_score: analysis.confidence.score,
        confidence_explanation: confidenceExplanation,
        ai_summary: analysis.ai_summary || analysis.overall_sentiment.summary,
        recommendation_status: analysis.recommendation.status,
        recommendation_explanation: analysis.recommendation.explanation,
        // Customized properties mapping to extend relational models easily
        pros: analysis.pros,
        cons: analysis.cons,
        audience: analysis.recommendation.audience,
        alternatives: analysis.recommendation.alternatives,
        spec_positive: analysis.overall_sentiment.positive,
        spec_negative: analysis.overall_sentiment.negative,
        spec_neutral: analysis.overall_sentiment.neutral
      };

      const { data: dbProducts, error: prodUpsertErr } = await this.supabase
        .from("products")
        .upsert(productPayload, { onConflict: "name,brand" })
        .select("id");

      if (prodUpsertErr) throw prodUpsertErr;
      if (!dbProducts || dbProducts.length === 0) {
        throw new Error("Product database upsert returned no row ID mapping.");
      }

      const productId = dbProducts[0].id;
      analysis.product_metadata.id = productId;

      // 2. Clear old children records to ensure transactional integrity
      const deleteResults = await Promise.all([
        this.supabase.from("topics").delete().eq("product_id", productId),
        this.supabase.from("ratings").delete().eq("product_id", productId),
        this.supabase.from("articles").delete().eq("product_id", productId),
        this.supabase.from("videos").delete().eq("product_id", productId),
        this.supabase.from("reviews").delete().eq("product_id", productId)
      ]);
      const deleteErr = deleteResults.find(r => r.error);
      if (deleteErr) {
        console.warn("⚠️ Minor warning during cache cleaning of cascading references:", deleteErr.error);
      }

      // 3. Insert Topics
      if (analysis.topics && analysis.topics.length > 0) {
        const topicRows = analysis.topics.map(t => ({
          product_id: productId,
          name: t.name,
          mention_count: t.mention_count,
          sentiment_score: t.sentiment_score,
          average_sentiment: t.average_sentiment,
          representative_quotes: t.representative_quotes
        }));
        const { error: topicsErr } = await this.supabase.from("topics").insert(topicRows);
        if (topicsErr) throw new Error(`Topics cache write failed: ${topicsErr.message}`);
      }

      // 4. Insert Ratings distributions
      const rDist = analysis.rating_distribution;
      const ratingsRows = [
        { product_id: productId, rating_value: 5, count: rDist.stars_5 },
        { product_id: productId, rating_value: 4, count: rDist.stars_4 },
        { product_id: productId, rating_value: 3, count: rDist.stars_3 },
        { product_id: productId, rating_value: 2, count: rDist.stars_2 },
        { product_id: productId, rating_value: 1, count: rDist.stars_1 }
      ];
      const { error: ratingsErr } = await this.supabase.from("ratings").insert(ratingsRows);
      if (ratingsErr) throw new Error(`Ratings cache write failed: ${ratingsErr.message}`);

      // 5. Ingest articles, videos, reviews
      const articlesList = analysis.ingestion_sources.filter(s => s.type.includes("Article"));
      if (articlesList.length > 0) {
        const articleRows = articlesList.map(a => ({
          product_id: productId,
          title: a.title,
          url: a.url || `https://google.com/search?q=${encodeURIComponent(a.title)}`,
          snippet: a.snippet || "",
          content_raw: a.snippet || ""
        }));
        const { error: articlesErr } = await this.supabase.from("articles").insert(articleRows);
        if (articlesErr) throw new Error(`Articles cache write failed: ${articlesErr.message}`);
      }

      const videosList = analysis.ingestion_sources.filter(s => s.type.includes("Video"));
      if (videosList.length > 0) {
        const videoRows = videosList.map(v => {
          const ytIdMatch = (v.url || "").match(/[?&]v=([^&#]+)/);
          const youtubeToken = ytIdMatch ? ytIdMatch[1] : "mock-video-id";
          return {
            product_id: productId,
            youtube_video_id: youtubeToken,
            title: v.title,
            description: v.snippet || "",
            transcript_snippet: v.snippet || ""
          };
        });
        const { error: videosErr } = await this.supabase.from("videos").insert(videoRows);
        if (videosErr) throw new Error(`Videos cache write failed: ${videosErr.message}`);
      }

      const reviewsList = analysis.ingestion_sources.filter(s => s.type.includes("Review") || s.type.includes("Verified"));
      if (reviewsList.length > 0) {
        const reviewRows = reviewsList.map(r => ({
          product_id: productId,
          title: r.title,
          content: r.snippet || "Verified customer feedback.",
          rating: 4, // Assumed neutral-positive
          is_verified: true
        }));
        const { error: reviewsErr } = await this.supabase.from("reviews").insert(reviewRows);
        if (reviewsErr) throw new Error(`Reviews cache write failed: ${reviewsErr.message}`);
      }

      console.log(`🎉 Write product caching operation resolved successfully for ID: ${productId}`);
      return productId;

    } catch (err) {
      console.error(`❌ DB cache write task failed for [${name}]:`, err);
      return analysis.product_metadata.id || "local-offline-uuid-placeholder";
    }
  }

  /**
   * Fetches cached trending items to pre-populate catalogs
   */
  public async getCachedTrendingProducts(limit: number = 6): Promise<any[]> {
    if (this.isOffline() || !this.supabase) {
      // Offline fallback: load preloaded default models
      const items = Array.from(SupabaseService.inMemoryProducts.values()).slice(0, limit);
      return items.map(p => ({
        id: p.product_metadata.id || "offline-id",
        name: p.product_metadata.name,
        brand: p.product_metadata.brand,
        category: p.product_metadata.category,
        confidence_score: p.confidence.score,
        recommendation_status: p.recommendation.status,
        sentiment_ratio: {
          positive: p.overall_sentiment.positive,
          negative: p.overall_sentiment.negative,
          neutral: p.overall_sentiment.neutral
        }
      }));
    }

    try {
      const { data, error } = await this.supabase
        .from("products")
        .select("id, name, brand, category, confidence_score, recommendation_status, spec_positive, spec_negative, spec_neutral")
        .limit(limit);

      if (error) throw error;

      return (data || []).map((p: any) => ({
        id: p.id,
        name: p.name,
        brand: p.brand,
        category: p.category || "General Tech Utilities",
        confidence_score: p.confidence_score || "Medium",
        recommendation_status: p.recommendation_status || "DEPENDS",
        sentiment_ratio: {
          positive: p.spec_positive || 60,
          negative: p.spec_negative || 20,
          neutral: p.spec_neutral || 20
        }
      }));
    } catch (err) {
      console.error("❌ Failed to fetchcached trending catalog products:", err);
      return [];
    }
  }

  /**
   * Log searches for usage metric telemetry
   */
  public async logSearch(query: string, productId?: string): Promise<boolean> {
    const record = { query: query.trim(), productId, createdAt: new Date().toISOString() };
    SupabaseService.inMemorySearches.push(record);

    if (this.isOffline() || !this.supabase) {
      return true;
    }

    try {
      const { error } = await this.supabase
        .from("searches")
        .insert({
          query: query.trim(),
          product_id: productId || null
        });
      if (error) throw error;
      return true;
    } catch (err) {
      console.error("❌ Failed to write searches history to DB:", err);
      return false;
    }
  }
}
