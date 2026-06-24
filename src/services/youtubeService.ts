
export interface YouTubeVideoItem {
  id: string; // YouTube Video Unique Token ID
  title: string;
  description: string;
  channelTitle: string;
  publishedAt: string;
  thumbnailUrl: string;
  viewCount: number; // Discovered via detailed statistics lookup
  isComparisonVideo: boolean; // Computed based on title markers
}

// Service response encapsulating payload and cache traces
export interface YouTubeServiceResponse {
  query: string;
  videos: YouTubeVideoItem[];
  source: 'api' | 'cache' | 'fallback';
  cachedAt?: number;
}

// Internal cash layout format
interface YouTubeCacheEntry {
  data: YouTubeVideoItem[];
  timestamp: number;
}

export class YouTubeService {
  private apiKey: string;
  private static cache = new Map<string, YouTubeCacheEntry>();
  
  private readonly cacheTTLMs: number;
  private readonly maxRetries: number;
  private readonly initDelayMs: number;

  /**
   * Initializes the YouTube Video Analytics Service
   * @param config Optional parameters to override defaults
   */
  constructor(config?: { cacheTTLMinutes?: number; maxRetries?: number; initDelayMs?: number }) {
    // Safely collect key from private system environment variables
    this.apiKey = process.env.YOUTUBE_DATA_API_KEY || '';
    
    // Default Cache TTL set to 12 hours to maintain high performance
    this.cacheTTLMs = (config?.cacheTTLMinutes ?? 720) * 60 * 1000;
    this.maxRetries = config?.maxRetries ?? 3;
    this.initDelayMs = config?.initDelayMs ?? 1000;
  }

  /**
   * Normalizes search queries to prevent duplicate cache keys
   */
  private normalizeQuery(query: string): string {
    return query.trim().toLowerCase().replace(/\s+/g, ' ');
  }

  /**
   * Evaluates video titles to automatically mark comparison patterns
   */
  private evaluateComparisonPattern(title: string): boolean {
    const cleanTitle = title.toLowerCase();
    // Look for versus matches (e.g., "vs", "versus", "compare", "comparison")
    return /\bvs\b|\bversus\b|\bcompare\b|\bcomparison\b/.test(cleanTitle);
  }

  /**
   * Searches for YouTube reviews of a specific product and collects detailed video stats
   * @param productName Name of the target product (e.g., "Sony WH-1000XM6")
   * @param limit Maximum results to return (default 5, max 15 to safeguard quota)
   */
  public async getProductReviews(productName: string, limit: number = 5): Promise<YouTubeServiceResponse> {
    if (!productName || productName.trim().length === 0) {
      return { query: productName, videos: [], source: 'fallback' };
    }

    // Construct clean search term explicitly targeting product video reviews
    const reviewQuery = `${productName} review`;
    const normalized = this.normalizeQuery(reviewQuery);

    // 1. Caching Check: Instantly return fresh cached items to shield upstream quotas
    const cached = YouTubeService.cache.get(normalized);
    const now = Date.now();
    if (cached && (now - cached.timestamp < this.cacheTTLMs)) {
      return {
        query: reviewQuery,
        videos: cached.data.slice(0, limit),
        source: 'cache',
        cachedAt: cached.timestamp
      };
    }

    // 2. Client Parameter Validation Shield
    if (!this.apiKey) {
      console.warn('⚠️ YOUTUBE_DATA_API_KEY is not defined in system environment. Empty fallback array returned.');
      return { query: reviewQuery, videos: [], source: 'fallback' };
    }

    try {
      // Step A: Search videos matching product review criteria
      const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&q=${encodeURIComponent(
        reviewQuery
      )}&maxResults=${Math.min(limit * 2, 25)}&key=${encodeURIComponent(this.apiKey)}`;

      const searchData = await this.fetchWithRetry(searchUrl);
      const searchItems = searchData.items || [];

      if (searchItems.length === 0) {
        return { query: reviewQuery, videos: [], source: 'api' };
      }

      // Step B: Batch resolve video statistics (e.g., view counts) to render charts
      const videoIds = searchItems.map((item: any) => item.id.videoId).filter(Boolean);
      const statsMap = await this.getVideoStatistics(videoIds);

      // Step C: Map results to internal typed structures
      const matchedVideos: YouTubeVideoItem[] = searchItems
        .map((item: any) => {
          const videoId = item.id.videoId;
          const snippet = item.snippet || {};
          const title = snippet.title || '';
          
          return {
            id: videoId,
            title,
            description: snippet.description || '',
            channelTitle: snippet.channelTitle || '',
            publishedAt: snippet.publishedAt || '',
            thumbnailUrl: snippet.thumbnails?.high?.url || snippet.thumbnails?.medium?.url || '',
            viewCount: statsMap.get(videoId) || 0,
            isComparisonVideo: this.evaluateComparisonPattern(title)
          };
        })
        .filter((vid) => vid.id); // Eliminate null items

      // Update Local cache (bounded to 500 items max to prevent memory leaks)
      if (YouTubeService.cache.size >= 500) {
        const oldestKey = YouTubeService.cache.keys().next().value;
        if (oldestKey !== undefined) {
          YouTubeService.cache.delete(oldestKey);
        }
      }
      YouTubeService.cache.set(normalized, {
        data: matchedVideos,
        timestamp: Date.now()
      });

      return {
        query: reviewQuery,
        videos: matchedVideos.slice(0, limit),
        source: 'api'
      };

    } catch (error: any) {
      // 3. Fault Tolerance Strategy: Catch failures gracefully and logs to standard diagnostic channels
      console.error(`❌ YouTube Ingestion pipeline stall for product [${productName}]:`, error?.message || error);
      
      // Serve stale cache representation if available
      if (cached) {
        console.warn(`Fallback serving stale YouTube cache for query: [${reviewQuery}]`);
        return {
          query: reviewQuery,
          videos: cached.data.slice(0, limit),
          source: 'cache',
          cachedAt: cached.timestamp
        };
      }

      return {
        query: reviewQuery,
        videos: [],
        source: 'fallback'
      };
    }
  }

  /**
   * Explicitly discovers and filters matchup videos comparing two or more products
   * @param products Array containing product text targets
   * @param limit Output list constraint
   */
  public async discoverComparisonVideos(products: string[], limit: number = 5): Promise<YouTubeServiceResponse> {
    if (!products || products.length < 2) {
      return { query: 'comparison', videos: [], source: 'fallback' };
    }

    // e.g., "Sony WH-1000XM6 vs Bose QuietComfort Ultra comparison"
    const compareQuery = `${products.join(' vs ')} comparison`;
    const normalized = this.normalizeQuery(compareQuery);

    const cached = YouTubeService.cache.get(normalized);
    const now = Date.now();
    if (cached && (now - cached.timestamp < this.cacheTTLMs)) {
      return {
        query: compareQuery,
        videos: cached.data.slice(0, limit),
        source: 'cache',
        cachedAt: cached.timestamp
      };
    }

    if (!this.apiKey) {
      return { query: compareQuery, videos: [], source: 'fallback' };
    }

    try {
      const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&q=${encodeURIComponent(
        compareQuery
      )}&maxResults=${Math.min(limit * 2, 15)}&key=${encodeURIComponent(this.apiKey)}`;

      const searchData = await this.fetchWithRetry(searchUrl);
      const searchItems = searchData.items || [];
      const videoIds = searchItems.map((item: any) => item.id.videoId).filter(Boolean);
      const statsMap = await this.getVideoStatistics(videoIds);

      const comparisonVideos: YouTubeVideoItem[] = searchItems
        .map((item: any) => {
          const videoId = item.id.videoId;
          const snippet = item.snippet || {};
          const title = snippet.title || '';
          
          return {
            id: videoId,
            title,
            description: snippet.description || '',
            channelTitle: snippet.channelTitle || '',
            publishedAt: snippet.publishedAt || '',
            thumbnailUrl: snippet.thumbnails?.high?.url || snippet.thumbnails?.medium?.url || '',
            viewCount: statsMap.get(videoId) || 0,
            isComparisonVideo: true // Guaranteed by comparison query construction
          };
        })
        .filter((vid) => vid.id);

      YouTubeService.cache.set(normalized, {
        data: comparisonVideos,
        timestamp: Date.now()
      });

      return {
        query: compareQuery,
        videos: comparisonVideos.slice(0, limit),
        source: 'api'
      };

    } catch (error: any) {
      console.error(`❌ YouTube comparison video discovery failed:`, error?.message || error);
      if (cached) {
        return {
          query: compareQuery,
          videos: cached.data.slice(0, limit),
          source: 'cache',
          cachedAt: cached.timestamp
        };
      }
      return {
        query: compareQuery,
        videos: [],
        source: 'fallback'
      };
    }
  }

  /**
   * Retrieves specific video performance statistics (views) in a single batched query
   */
  private async getVideoStatistics(videoIds: string[]): Promise<Map<string, number>> {
    const statsMap = new Map<string, number>();
    if (!videoIds || videoIds.length === 0) return statsMap;

    const idsQuery = videoIds.join(',');
    const statsUrl = `https://www.googleapis.com/youtube/v3/videos?part=statistics&id=${encodeURIComponent(
      idsQuery
    )}&key=${encodeURIComponent(this.apiKey)}`;

    try {
      const responseData = await this.fetchWithRetry(statsUrl);
      const items = responseData.items || [];
      
      items.forEach((item: any) => {
        const views = parseInt(item.statistics?.viewCount, 10);
        if (item.id && !isNaN(views)) {
          statsMap.set(item.id, views);
        }
      });
    } catch (error) {
      console.warn('⚠️ Failed to resolve detailed YouTube statistics metrics. Defaulting view metrics to 0.', error);
    }

    return statsMap;
  }

  /**
   * Performs API requests with adaptive backoff retry logic
   */
  private async fetchWithRetry(url: string, attempt: number = 1): Promise<any> {
    try {
      const response = await fetch(url);

      if (!response.ok) {
        // Evaluate transient vs quota limit errors
        const isTransient = response.status >= 500 || response.status === 429;
        
        if (isTransient && attempt <= this.maxRetries) {
          const delay = this.initDelayMs * Math.pow(2, attempt - 1);
          console.warn(`Transient YouTube API error (${response.status}). Retrying ${attempt}/${this.maxRetries} in ${delay}ms...`);
          await this.sleep(delay);
          return this.fetchWithRetry(url, attempt + 1);
        }

        throw new Error(`YouTube API returned HTTP status Code: ${response.status}`);
      }

      return await response.json();

    } catch (err: any) {
      if (attempt <= this.maxRetries) {
        const delay = this.initDelayMs * Math.pow(2, attempt - 1);
        console.warn(`YouTube Network issue/fetch exception. Retrying ${attempt}/${this.maxRetries} in ${delay}ms...`);
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
   * Enables cache registers clean on demand
   */
  public static clearCache(): void {
    YouTubeService.cache.clear();
  }
}
