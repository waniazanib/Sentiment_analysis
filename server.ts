/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from "express";
import path from "path";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";

// Load backend secrets before initializing services
dotenv.config();

import { ProductAnalysisEngine } from "./src/services/productAnalysisEngine.ts";
import { SupabaseService } from "./src/services/supabaseService.ts";
import { GeminiService } from "./src/services/geminiService.ts";

const app = express();
const PORT = 3000;

// Universal body parsers
app.use(express.json());

// Main Service Orchestration Singletons
const engine = new ProductAnalysisEngine();
const dbService = new SupabaseService();
const gemini = new GeminiService();


// ============================================================================
// BACKEND REST API ENDPOINTS (as designed in API_DESIGN.md)
// ============================================================================

/**
 * Endpoint: GET /api/products/search
 * Dynamic search lookup matching cached items
 */
app.get("/api/products/search", async (req, res) => {
  try {
    const q = req.query.q as string;
    if (!q || q.trim().length === 0) {
      return res.status(400).json({
        status: 400,
        code: "BAD_REQUEST",
        message: "Search keyword query parameter 'q' is required.",
        timestamp: new Date().toISOString()
      });
    }

    const hits = await dbService.getCachedTrendingProducts(12);
    const filtered = hits.filter(h => 
      h.name.toLowerCase().includes(q.toLowerCase()) || 
      h.brand.toLowerCase().includes(q.toLowerCase())
    );

    return res.json({ hits: filtered });
  } catch (err: any) {
    return res.status(500).json({
      status: 500,
      code: "INTERNAL_ERROR",
      message: err.message || "Endpoint search query failure.",
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Endpoint: GET /api/products/cached
 * Fetches standardtrending categories to present in catalogs instantly
 */
app.get("/api/products/cached", async (req, res) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 6;
    const items = await dbService.getCachedTrendingProducts(limit);
    return res.json(items);
  } catch (err: any) {
    return res.status(500).json({
      status: 500,
      code: "INTERNAL_ERROR",
      message: err.message || "Failed to fetch cached catalog elements.",
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Endpoint: GET /api/products/:id
 * Acquires a complete comprehensive analysis model from Supabase
 */
app.get("/api/products/:id", async (req, res) => {
  try {
    const id = req.params.id;
    if (!id) {
      return res.status(400).json({
        status: 400,
        code: "BAD_REQUEST",
        message: "Endpoint path parameter 'id' is required.",
        timestamp: new Date().toISOString()
      });
    }

    const product = await dbService.getCachedProduct(id);
    if (!product) {
      return res.status(404).json({
        status: 404,
        code: "PRODUCT_NOT_FOUND",
        message: "Target diagnostic product can't be resolved with matching index records.",
        timestamp: new Date().toISOString()
      });
    }

    return res.json(product);
  } catch (err: any) {
    return res.status(500).json({
      status: 500,
      code: "INTERNAL_ERROR",
      message: err.message || "Failed to recover dynamic details.",
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Endpoint: POST /api/products/analyze
 * Main entrypoint trigger. Runs Google Search, YT, OpenReviews, Gemini and saves to database
 */
app.post("/api/products/analyze", async (req, res) => {
  try {
    const { name, brand, category, forceRefresh } = req.body;
    if (!name) {
      return res.status(400).json({
        status: 400,
        code: "BAD_REQUEST",
        message: "Payload parameter 'name' is required to start query mapping.",
        timestamp: new Date().toISOString()
      });
    }

    const inferredBrand = brand || name.split(" ")[0] || "Generic";

    // Step A: Cache Lookup
    if (!forceRefresh) {
      const cached = await dbService.getCachedProduct(name, inferredBrand);
      if (cached) {
        // Automatically bypass cache if the stored data is a diagnostic fallback mock, but we now have a live Gemini client
        const isMockSentiment = cached.overall_sentiment.positive === 65 && cached.overall_sentiment.neutral === 20 && cached.overall_sentiment.negative === 15;
        const isGenericMockSummary = cached.overall_sentiment.summary.includes("general consensus is fairly favorable") || cached.overall_sentiment.summary.includes("reliable baseline functionality");
        const hasLiveGemini = gemini.hasLiveClient();

        if ((isMockSentiment || isGenericMockSummary) && hasLiveGemini) {
          console.log(`[Cache] Detected cached product is a placeholder mock. Upgrading to live analysis since GEMINI_API_KEY is available.`);
        } else {
          console.log(`[Cache] Dynamic cache HIT in database for: [${name}]`);
          await dbService.logSearch(name, cached.product_metadata.id);
          return res.json(cached);
        }
      }
    }

    // Step B: Live crawl extraction & Gemini processing
    console.log(`[Cache] Cache MISS. Crawling third-party servers for: [${name}]`);
    const analysisResult = await engine.analyzeProduct(name, inferredBrand);

    if (category) {
      analysisResult.product_metadata.category = category;
    }

    // Save into caching database rules
    const id = await dbService.writeProductCache(analysisResult);
    analysisResult.product_metadata.id = id;

    // Log searches telemetry
    await dbService.logSearch(name, id);

    return res.json(analysisResult);

  } catch (err: any) {
    console.error("❌ Analytical API pipeline collapsed:", err);
    return res.status(500).json({
      status: 500,
      code: "UPSTREAM_FAILED",
      message: err.message || "Analytical parser failure during Gemini synthesis.",
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Endpoint: POST /api/products/compare
 * Multi criteria comparison algorithm runs through Gemini comparison matrices
 */
app.post("/api/products/compare", async (req, res) => {
  try {
    const { productIds } = req.body;
    if (!productIds || !Array.isArray(productIds) || productIds.length < 2 || productIds.length > 4) {
      return res.status(400).json({
        status: 400,
        code: "BAD_REQUEST",
        message: "Comparative matrix expects between 2 and 4 valid product record IDs.",
        timestamp: new Date().toISOString()
      });
    }

    // Retrieve details for matching IDs
    const resolvedProductsDetails = await Promise.all(
      productIds.map(async (pId) => {
        // Safe database lookup fallback inline
        const details = await dbService.getCachedProduct(pId);
        return details;
      })
    );

    const validProducts = resolvedProductsDetails.filter((p): p is any => p !== null);

    if (validProducts.length < 2) {
      return res.status(400).json({
        status: 400,
        code: "BAD_REQUEST",
        message: "Not enough matching active product records were resolved in database indexes to compare.",
        timestamp: new Date().toISOString()
      });
    }

    // Run comparison synthesis through Gemini AI
    console.log(`[Compare] Aggregating comparison details for ${validProducts.length} items...`);
    const formattedPayloads = validProducts.map(p => ({
      name: p.product_metadata.name,
      specs: p.product_metadata.specifications,
      sentiment: {
        sentiment: (p.overall_sentiment.positive > p.overall_sentiment.negative ? "POSITIVE" : "NEUTRAL") as "POSITIVE" | "NEUTRAL" | "NEGATIVE",
        positivePercentage: p.overall_sentiment.positive,
        neutralPercentage: p.overall_sentiment.neutral,
        negativePercentage: p.overall_sentiment.negative,
        summary: p.overall_sentiment.summary,
        sentimentTrend: "STEADY" as "STEADY" | "UPWARD" | "DOWNWARD"
      },
      recommendation: {
        decision: p.recommendation.status as "BUY" | "DEPENDS" | "AVOID",
        confidenceLevel: "HIGH" as "LOW" | "MEDIUM" | "HIGH" | "VERY HIGH",
        confidenceScore: 0.8,
        primaryReasoning: p.recommendation.explanation,
        targetAudience: p.recommendation.audience,
        alternativeSuggestions: p.recommendation.alternatives
      }
    }));

    const synthesis = await gemini.generateComparison(formattedPayloads);

    return res.json({
      comparison_id: "compare-matrix-uuid",
      products: validProducts.map(p => ({
        id: p.product_metadata.id,
        name: p.product_metadata.name,
        brand: p.product_metadata.brand,
        sentiment_score: p.overall_sentiment.positive - p.overall_sentiment.negative,
        average_rating: p.rating_distribution?.average_rating || 4.2,
        ai_summary: p.ai_summary
      })),
      category_winners: synthesis.categoryWinners,
      key_takeaways: synthesis.keyTakeaways,
      spec_comparison_summary: synthesis.specComparisonSummary,
      overall_winner: synthesis.overallWinner,
      matrix: synthesis.recommendationMatrix
    });

  } catch (err: any) {
    console.error("❌ Comparative controller collapsed:", err);
    return res.status(500).json({
      status: 500,
      code: "PIPELINE_STALL",
      message: err.message || "Comparison mapping failure.",
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Endpoint: POST /api/searches
 * Logs tracking log records
 */
app.post("/api/searches", async (req, res) => {
  try {
    const { query, productId } = req.body;
    if (!query) {
      return res.status(400).json({
        status: 400,
        code: "BAD_REQUEST",
        message: "Search query string parameter required.",
        timestamp: new Date().toISOString()
      });
    }

    const success = await dbService.logSearch(query, productId);
    return res.status(201).json({ id: "audit-uuid", success });
  } catch (err: any) {
    return res.status(500).json({
      status: 500,
      code: "INTERNAL_ERROR",
      message: err.message,
      timestamp: new Date().toISOString()
    });
  }
});

// ============================================================================
// INTEGRATE VITE SPA FRAMEWORK MIDDLEWARES
// ============================================================================
const startServer = async () => {
  if (process.env.NODE_ENV !== "production") {
    console.log("🛠️ Mounting Vite dev-middleware services...");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Production serves compiled files in dist/
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  if (process.env.NODE_ENV !== "test" && !process.env.VITEST) {
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`🚀 Production server online running on: http://localhost:${PORT}`);
    });
  }
};

if (process.env.NODE_ENV !== "test" && !process.env.VITEST) {
  startServer().catch(err => {
    console.error("❌ High level boot server crash:", err);
  });
}

export { app };
