
export interface OpenReviewItem {
  id: string;
  title: string;
  content: string;
  rating: number; // Normalized star rating (1.0 to 5.0)
  reviewerName: string;
  reviewDate: string;
  isVerified: boolean;
  metadata: Record<string, any>;
}

// Normalized rating distribution (useful for Recharts horizontal bar charts)
export interface OpenReviewRatingDistribution {
  stars_5: number;
  stars_4: number;
  stars_3: number;
  stars_2: number;
  stars_1: number;
  averageRating: number;
  totalRatingsCount: number;
}

// Service response interface enclosing payloads and cache details
export interface OpenReviewServiceResponse {
  productName: string;
  reviews: OpenReviewItem[];
  distribution: OpenReviewRatingDistribution;
  source: 'api' | 'cache' | 'fallback';
  cachedAt?: number;
}

// Cache storage structural entry
interface OpenReviewCacheEntry {
  reviews: OpenReviewItem[];
  distribution: OpenReviewRatingDistribution;
  timestamp: number;
}

export class OpenReviewService {
  private apiKey: string;
  private static cache = new Map<string, OpenReviewCacheEntry>();

  private readonly cacheTTLMs: number;
  private readonly maxRetries: number;
  private readonly initDelayMs: number;

  /**
   * Initializes the Open Review Core Platform Service
   * @param config Optional parameters to override defaults
   */
  constructor(config?: { cacheTTLMinutes?: number; maxRetries?: number; initDelayMs?: number }) {
    // Collect specific API credentials safely from system environment variables
    this.apiKey = process.env.OPEN_REVIEW_API_KEY || '';
    
    // Default Cache TTL set to 6 hours (360 minutes) to keep metrics highly precise
    this.cacheTTLMs = (config?.cacheTTLMinutes ?? 360) * 60 * 1000;
    this.maxRetries = config?.maxRetries ?? 3;
    this.initDelayMs = config?.initDelayMs ?? 1000;
  }

  /**
   * Normalizes search keyword indicators to prevent duplicate cache entries
   */
  private normalizeQuery(query: string): string {
    return query.trim().toLowerCase().replace(/\s+/g, ' ');
  }

  /**
   * Normalizes variable incoming review rating scores into clean 1.0 - 5.0 range
   * @param rating Raw rating metric
   * @param scaleMax Underlying rating base scale (default 5)
   */
  private normalizeRatingToFiveStars(rating: number, scaleMax: number = 5): number {
    if (!rating || rating <= 0) return 0;
    if (scaleMax === 5) return parseFloat(Math.min(rating, 5).toFixed(1));
    
    // Perform standard linear mathematical adjustment
    const ratio = rating / scaleMax;
    const normalized = ratio * 5;
    return parseFloat(Math.min(normalized, 5).toFixed(1));
  }

  /**
   * Fetches reviews and constructs rating distributions for a product
   * @param productName Full brand name & model of targeted product
   * @param limit Maximum reviews to retrieve
   */
  public async getProductReviews(productName: string, limit: number = 20): Promise<OpenReviewServiceResponse> {
    if (!productName || productName.trim().length === 0) {
      return { productName, reviews: [], distribution: this.createEmptyDistribution(), source: 'fallback' };
    }

    const normalized = this.normalizeQuery(productName);

    // 1. Caching Check
    const cached = OpenReviewService.cache.get(normalized);
    const now = Date.now();
    if (cached && (now - cached.timestamp < this.cacheTTLMs)) {
      return {
        productName,
        reviews: cached.reviews.slice(0, limit),
        distribution: cached.distribution,
        source: 'cache',
        cachedAt: cached.timestamp
      };
    }

    // 2. Secret Key Presence check. Fallback early if not defined to preserve performance.
    if (!this.apiKey) {
      console.warn('⚠️ OPEN_REVIEW_API_KEY not set in environment. Mocking API results with empty structured models.');
      return { productName, reviews: [], distribution: this.createEmptyDistribution(), source: 'fallback' };
    }

    // Construct valid request details
    // Assuming standard endpoint path /api/v1/reviews for structured ingestion
    const url = `https://api.openreviewplatform.com/v1/reviews?product=${encodeURIComponent(
      productName
    )}&limit=${Math.min(limit * 2, 50)}`;

    try {
      const apiResponse = await this.fetchWithRetry(url);
      const rawReviews = apiResponse.reviews || [];

      // Step A: Parse and normalize individual review records
      const normalizedReviews: OpenReviewItem[] = rawReviews.map((rev: any, index: number) => {
        const ratingScale = parseInt(rev.rating_scale || rev.scale_max || '5', 10);
        const rawRating = parseFloat(rev.rating || rev.score || '0');
        
        return {
          id: rev.id || rev.review_id || `openreview-${normalized}-${index}`,
          title: rev.title || rev.summary || '',
          content: rev.content || rev.text || '',
          rating: this.normalizeRatingToFiveStars(rawRating, ratingScale),
          reviewerName: rev.reviewer || rev.author || 'Anonymous Expert',
          reviewDate: rev.date || rev.published_at || new Date().toISOString(),
          isVerified: Boolean(rev.verified || rev.is_verified || false),
          metadata: rev.metadata || {}
        };
      });

      // Step B: Calculate highly polished rating distribution metrics
      const distribution = this.computeRatingDistribution(normalizedReviews);

      // Save complete dataset to Cache Map (bounded to 500 items max to prevent memory leaks)
      if (OpenReviewService.cache.size >= 500) {
        const oldestKey = OpenReviewService.cache.keys().next().value;
        if (oldestKey !== undefined) {
          OpenReviewService.cache.delete(oldestKey);
        }
      }
      OpenReviewService.cache.set(normalized, {
        reviews: normalizedReviews,
        distribution,
        timestamp: Date.now()
      });

      return {
        productName,
        reviews: normalizedReviews.slice(0, limit),
        distribution,
        source: 'api'
      };

    } catch (error: any) {
      // 3. Fault Tolerance Shield: Catch failures silently, fallback to stale caches or clean metrics
      console.error(`❌ Open Review Platform Service failed for [${productName}]:`, error?.message || error);

      if (cached) {
        console.warn(`Serving expired stale Open Review cache details for product [${productName}]`);
        return {
          productName,
          reviews: cached.reviews.slice(0, limit),
          distribution: cached.distribution,
          source: 'cache',
          cachedAt: cached.timestamp
        };
      }

      // Final elegant fallback
      return {
        productName,
        reviews: [],
        distribution: this.createEmptyDistribution(),
        source: 'fallback'
      };
    }
  }

  /**
   * Aggregates individual normalized user profiles to establish numerical distributions
   */
  private computeRatingDistribution(reviews: OpenReviewItem[]): OpenReviewRatingDistribution {
    const distribution: OpenReviewRatingDistribution = {
      stars_5: 0,
      stars_4: 0,
      stars_3: 0,
      stars_2: 0,
      stars_1: 0,
      averageRating: 0,
      totalRatingsCount: reviews.length
    };

    if (reviews.length === 0) return distribution;

    let summedScore = 0;

    reviews.forEach((rev) => {
      const rounded = Math.round(rev.rating);
      summedScore += rev.rating;

      if (rounded >= 5) distribution.stars_5 += 1;
      else if (rounded === 4) distribution.stars_4 += 1;
      else if (rounded === 3) distribution.stars_3 += 1;
      else if (rounded === 2) distribution.stars_2 += 1;
      else if (rounded <= 1) distribution.stars_1 += 1;
    });

    distribution.averageRating = parseFloat((summedScore / reviews.length).toFixed(2));

    return distribution;
  }

  /**
   * Fast initialization fallback builder
   */
  private createEmptyDistribution(): OpenReviewRatingDistribution {
    return {
      stars_5: 0,
      stars_4: 0,
      stars_3: 0,
      stars_2: 0,
      stars_1: 0,
      averageRating: 0.0,
      totalRatingsCount: 0
    };
  }

  /**
   * Executes network queries with exponential retry routines
   */
  private async fetchWithRetry(url: string, attempt: number = 1): Promise<any> {
    try {
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        const isTransient = response.status >= 500 || response.status === 429;
        
        if (isTransient && attempt <= this.maxRetries) {
          const delay = this.initDelayMs * Math.pow(2, attempt - 1);
          console.warn(`Transient Open Review API error (${response.status}). Retrying ${attempt}/${this.maxRetries} in ${delay}ms...`);
          await this.sleep(delay);
          return this.fetchWithRetry(url, attempt + 1);
        }

        throw new Error(`Open Review API responded with status Code: ${response.status}`);
      }

      return await response.json();

    } catch (err: any) {
      if (attempt <= this.maxRetries) {
        const delay = this.initDelayMs * Math.pow(2, attempt - 1);
        console.warn(`Open Review platform connection failure. Retrying ${attempt}/${this.maxRetries} in ${delay}ms...`);
        await this.sleep(delay);
        return this.fetchWithRetry(url, attempt + 1);
      }
      throw err;
    }
  }

  /**
   * Helper utility containing promise-wrapped setTimeout timeouts
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Clear static cache map manually when fresh runs are initiated
   */
  public static clearCache(): void {
    OpenReviewService.cache.clear();
  }
}
