export interface SearchResultItem {
  title: string;
  link: string;
  snippet: string;
  formattedUrl: string;
}

// Service response interface enclosing actual values and source attributes
export interface SearchServiceResponse {
  query: string;
  items: SearchResultItem[];
  source: 'api' | 'cache' | 'fallback';
  cachedAt?: number;
}

// In-memory caching record model
interface CacheEntry {
  data: SearchResultItem[];
  timestamp: number;
}

export class GoogleSearchService {
  private apiKey: string;
  private searchEngineId: string;
  
  // High-speed static Map for caching searches to maintain performance & shield quotas
  private static cache = new Map<string, CacheEntry>();
  
  // Default values for cache configurations
  private readonly cacheTTLMs: number;
  private readonly maxRetries: number;
  private readonly initDelayMs: number;

  /**
   * Initializes the Google Custom Search Service
   * @param config Optional parameters to override environment variables
   */
  constructor(config?: { cacheTTLMinutes?: number; maxRetries?: number; initDelayMs?: number }) {
    // Collect credentials safely from system environment variables
    this.apiKey = process.env.GOOGLE_CUSTOM_SEARCH_KEY || '';
    this.searchEngineId = process.env.GOOGLE_CUSTOM_SEARCH_CX || '';
    
    // Default Cache TTL to 12 hours (720 minutes) if not specified
    this.cacheTTLMs = (config?.cacheTTLMinutes ?? 720) * 60 * 1000;
    this.maxRetries = config?.maxRetries ?? 3;
    this.initDelayMs = config?.initDelayMs ?? 1000;
  }

  /**
   * Normalizes search queries to prevent whitespace duplicates in caching keys
   */
  private normalizeQuery(query: string): string {
    return query.trim().toLowerCase().replace(/\s+/g, ' ');
  }

  /**
   * Performs dynamic search for a product name or query criteria
   * @param query Raw string content to fetch (e.g., "iPhone 15 reviews")
   */
  public async search(query: string): Promise<SearchServiceResponse> {
    if (!query || query.trim().length === 0) {
      return { query, items: [], source: 'fallback' };
    }

    const normalized = this.normalizeQuery(query);

    // 1. Caching Check: Check if we have dynamic, fresh values matching the normalized query
    const cached = GoogleSearchService.cache.get(normalized);
    const now = Date.now();
    if (cached && now - cached.timestamp < this.cacheTTLMs) {
      return {
        query,
        items: cached.data,
        source: 'cache',
        cachedAt: cached.timestamp
      };
    }

    // 2. Client Parameter Validation Shield
    if (!this.apiKey || !this.searchEngineId) {
      console.warn('⚠️ Google Search API keys/CX not properly defined in environment. Fallback empty array returned.');
      return { query, items: [], source: 'fallback' };
    }

    // Construct valid search endpoint URL
    const url = `https://customsearch.googleapis.com/customsearch/v1?key=${encodeURIComponent(
      this.apiKey
    )}&cx=${encodeURIComponent(this.searchEngineId)}&q=${encodeURIComponent(query)}`;

    try {
      // 3. Trigger robust retry fetch operation
      const rawItems = await this.fetchWithRetry(url);
      
      // Clean and map dynamic JSON output into our typed layout
      const results: SearchResultItem[] = rawItems.map((item: any) => ({
        title: item.title || '',
        link: item.link || '',
        snippet: item.snippet || '',
        formattedUrl: item.formattedUrl || ''
      }));

      // Update static Cache Map (bounded to 500 items max to prevent memory leaks)
      if (GoogleSearchService.cache.size >= 500) {
        const oldestKey = GoogleSearchService.cache.keys().next().value;
        if (oldestKey !== undefined) {
          GoogleSearchService.cache.delete(oldestKey);
        }
      }
      GoogleSearchService.cache.set(normalized, {
        data: results,
        timestamp: Date.now()
      });

      return {
        query,
        items: results,
        source: 'api'
      };

    } catch (error: any) {
      // 4. Fault Tolerance: Protect pipeline execution from complete failure. Log internally, silent to users.
      console.error(`❌ Google Search Service failed for query [${query}]:`, error?.message || error);
      
      // Fallback: If a stale cache exists, serve it rather than an empty screen, even if expired
      if (cached) {
        console.warn(`Serving stale search cache fallback for query [${query}] due to upstream error.`);
        return {
          query,
          items: cached.data,
          source: 'cache',
          cachedAt: cached.timestamp
        };
      }

      // Final elegant fallback
      return {
        query,
        items: [],
        source: 'fallback'
      };
    }
  }

  /**
   * Performs API requests with exponential backoff on transient errors
   */
  private async fetchWithRetry(url: string, attempt: number = 1): Promise<any[]> {
    try {
      const response = await fetch(url);

      if (!response.ok) {
        // Evaluate transient vs terminal errors
        const isTransient = response.status >= 500 || response.status === 429;
        
        if (isTransient && attempt <= this.maxRetries) {
          const delay = this.initDelayMs * Math.pow(2, attempt - 1);
          console.warn(`Transient Google API failure (${response.status}). Retrying attempt ${attempt}/${this.maxRetries} in ${delay}ms...`);
          await this.sleep(delay);
          return this.fetchWithRetry(url, attempt + 1);
        }

        // Terminal or max limit reached
        throw new Error(`Google Search API responded with status Code: ${response.status}`);
      }

      const data = await response.json();
      return data.items || [];

    } catch (err: any) {
      // Catch network-level failures and apply same retry logic
      if (attempt <= this.maxRetries) {
        const delay = this.initDelayMs * Math.pow(2, attempt - 1);
        console.warn(`Network-level search failure. Retrying attempt ${attempt}/${this.maxRetries} in ${delay}ms...`);
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
   * Enables manual clearing of cache registers if dynamic update signals are triggered
   */
  public static clearCache(): void {
    GoogleSearchService.cache.clear();
  }
}
