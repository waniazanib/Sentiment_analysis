
export interface ProductSpecifications {
  manufacturer?: string;
  releaseDate?: string;
  category?: string;
  rawSummarySnippet?: string;
  additionalDetails?: Record<string, string>;
}

export interface WikipediaServiceResponse {
  productName: string;
  specifications: ProductSpecifications;
  source: 'api' | 'cache' | 'fallback';
  cachedAt?: number;
}

interface WikipediaCacheEntry {
  data: ProductSpecifications;
  timestamp: number;
}

export class WikipediaService {
  private static cache = new Map<string, WikipediaCacheEntry>();
  
  private readonly cacheTTLMs: number;
  private readonly maxRetries: number;
  private readonly initDelayMs: number;

  /**
   * Initializes the Wikipedia Factual Context Service
   * @param config Optional parameters to override defaults
   */
  constructor(config?: { cacheTTLMinutes?: number; maxRetries?: number; initDelayMs?: number }) {
    // Cache factual data for 24 hours (1440 minutes) by default as specs change rarely
    this.cacheTTLMs = (config?.cacheTTLMinutes ?? 1440) * 60 * 1000;
    this.maxRetries = config?.maxRetries ?? 2;
    this.initDelayMs = config?.initDelayMs ?? 1000;
  }

  /**
   * Normalizes search search keys
   */
  private normalizeQuery(query: string): string {
    return query.trim().toLowerCase().replace(/\s+/g, ' ');
  }

  /**
   * Resolves key product metrics by searching Wikipedia
   * @param productName Targeted product brand and model (e.g., "iPhone 15", "Sony WH-1000XM5")
   */
  public async getFactualSpecs(productName: string): Promise<WikipediaServiceResponse> {
    if (!productName || productName.trim().length === 0) {
      return { productName, specifications: {}, source: 'fallback' };
    }

    const normalized = this.normalizeQuery(productName);

    // 1. Caching Check
    const cached = WikipediaService.cache.get(normalized);
    const now = Date.now();
    if (cached && (now - cached.timestamp < this.cacheTTLMs)) {
      return {
        productName,
        specifications: cached.data,
        source: 'cache',
        cachedAt: cached.timestamp
      };
    }

    try {
      // Step A: Search Wikipedia to acquire the closest matched page title
      const searchTitle = await this.searchPageTitle(productName);
      if (!searchTitle) {
        console.warn(`No Wikipedia page matches found for product: [${productName}]. Serving empty catalog specs.`);
        return { productName, specifications: {}, source: 'api' };
      }

      // Step B: Fetch page summaries and raw text chunks matching the title
      const pageDetails = await this.fetchPageContent(searchTitle);
      
      // Step C: Execute parsing rules against textual data to isolate key attributes
      const specs = this.parseSpecificationsFromText(pageDetails.extract, pageDetails.fullText);

      // Save to memory cache (bounded to 500 items max to prevent memory leaks)
      if (WikipediaService.cache.size >= 500) {
        const oldestKey = WikipediaService.cache.keys().next().value;
        if (oldestKey !== undefined) {
          WikipediaService.cache.delete(oldestKey);
        }
      }
      WikipediaService.cache.set(normalized, {
        data: specs,
        timestamp: Date.now()
      });

      return {
        productName,
        specifications: specs,
        source: 'api'
      };

    } catch (error: any) {
      // 2. Fault Tolerance: Prevent upstream pipelines from failing. Log internally.
      console.error(`❌ Wikipedia Service error matching details for [${productName}]:`, error?.message || error);
      
      // Serve stale cache representation if available
      if (cached) {
        console.warn(`Serving expired stale Wikipedia specs fallback for product [${productName}]`);
        return {
          productName,
          specifications: cached.data,
          source: 'cache',
          cachedAt: cached.timestamp
        };
      }

      return {
        productName,
        specifications: {},
        source: 'fallback'
      };
    }
  }

  /**
   * Discovers the closest matching page topic name using Search Action rules
   */
  private async searchPageTitle(productName: string): Promise<string | null> {
    const searchUrl = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(
      productName
    )}&format=json&origin=*&srlimit=3`;

    const data = await this.fetchWithRetry(searchUrl);
    const hits = data.query?.search || [];
    
    if (hits.length === 0) {
      return null;
    }
    
    // Analyze product name for numerical identifiers (e.g., "6", "5", "xm6")
    const words = productName.toLowerCase().split(/\s+/);
    const modelNumbers = words.filter(w => /^\d+$/.test(w) || /^[a-z]\d+$/i.test(w) || /^\d+[a-z]$/i.test(w));
    
    if (modelNumbers.length > 0) {
      // Look if any hit in the top results matches all specific model numbers precisely
      for (const hit of hits) {
        const hitTitleLower = (hit.title || "").toLowerCase();
        const hasAllNumbers = modelNumbers.every(num => {
          // Verify that the model number matches as a separate word/boundary or token in the title
          const escapedNum = num.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
          const regexStr = `\\b${escapedNum}\\b|(?:^|\\s)${escapedNum}(?:$|\\s)`;
          return new RegExp(regexStr, 'i').test(hitTitleLower);
        });
        if (hasAllNumbers) {
          console.log(`[Wikipedia] Selected best matching hit based on model identifiers: "${hit.title}" for query "${productName}"`);
          return hit.title;
        }
      }
    }
    
    // Default to the first index if no specific model suffix match was detected
    return hits[0].title || null;
  }

  /**
   * Pulls structural page description payloads and raw markdown-like structures representing the page layout
   */
  private async fetchPageContent(title: string): Promise<{ extract: string; fullText: string }> {
    // 1. Fetch clean introductory summary extract matching structural queries
    const summaryUrl = `https://en.wikipedia.org/w/api.php?action=query&prop=extracts&exintro=&explaintext=&titles=${encodeURIComponent(
      title
    )}&format=json&origin=*`;

    // 2. Fetch full raw content segments to parse comprehensive specs
    const fullTextUrl = `https://en.wikipedia.org/w/api.php?action=query&prop=revisions&rvprop=content&titles=${encodeURIComponent(
      title
    )}&format=json&origin=*`;

    const [summaryRes, fullTextRes] = await Promise.all([
      this.fetchWithRetry(summaryUrl),
      this.fetchWithRetry(fullTextUrl)
    ]);

    // Parse summary extract
    const summaryPages = summaryRes.query?.pages || {};
    const summaryPageId = Object.keys(summaryPages)[0];
    const extract = summaryPageId && summaryPageId !== '-1' ? summaryPages[summaryPageId].extract || '' : '';

    // Parse full markup segments
    const fullPages = fullTextRes.query?.pages || {};
    const fullPageId = Object.keys(fullPages)[0];
    let fullText = '';
    
    if (fullPageId && fullPageId !== '-1') {
      const revisions = fullPages[fullPageId].revisions || [];
      fullText = revisions[0]?.['*'] || '';
    }

    return { extract, fullText };
  }

  /**
   * Scrapes raw page sections using selective regular expressions to capture key metrics
   */
  private parseSpecificationsFromText(extract: string, fullText: string): ProductSpecifications {
    const specs: ProductSpecifications = {
      rawSummarySnippet: extract.slice(0, 400) + (extract.length > 400 ? '...' : '')
    };

    // 1. Parse out main manufacturer
    const rawManufacturer = this.extractInfoboxField(fullText, ['developer', 'manufacturer', 'brand']);
    if (rawManufacturer) {
      specs.manufacturer = this.cleanWikiText(rawManufacturer);
    } else {
      const manufacturerRegex = /(?:developer|manufacturer|brand)\s*=\s*(?:\[\[)?([^|\n\]]+)/i;
      const manufacturerMatch = fullText.match(manufacturerRegex);
      if (manufacturerMatch && manufacturerMatch[1]) {
        specs.manufacturer = this.cleanWikiText(manufacturerMatch[1]);
      }
    }

    // 2. Parse out original release date
    const rawReleaseDate = this.extractInfoboxField(fullText, ['released', 'release_date', 'introduced']);
    if (rawReleaseDate) {
      specs.releaseDate = this.cleanWikiText(rawReleaseDate);
    } else {
      const releaseRegex = /(?:released|release_date|introduced)\s*=\s*([^|\n]+)/i;
      const releaseMatch = fullText.match(releaseRegex);
      if (releaseMatch && releaseMatch[1]) {
        specs.releaseDate = this.cleanWikiText(releaseMatch[1]);
      }
    }

    // 3. Parse out general product category classification
    const rawCategory = this.extractInfoboxField(fullText, ['type', 'category', 'subcategory']);
    if (rawCategory) {
      specs.category = this.cleanWikiText(rawCategory);
    } else {
      const categoryRegex = /(?:type|category|subcategory)\s*=\s*(?:\[\[)?([^|\n\]]+)/i;
      const categoryMatch = fullText.match(categoryRegex);
      if (categoryMatch && categoryMatch[1]) {
        specs.category = this.cleanWikiText(categoryMatch[1]);
      }
    }

    // 4. Populate additional details
    const additional: Record<string, string> = {};
    
    // Parse weight specifications if listed
    const rawWeight = this.extractInfoboxField(fullText, ['weight']);
    if (rawWeight) {
      additional.weight = this.cleanWikiText(rawWeight);
    } else {
      const weightRegex = /weight\s*=\s*([^|\n]+)/i;
      const weightMatch = fullText.match(weightRegex);
      if (weightMatch && weightMatch[1]) {
        additional.weight = this.cleanWikiText(weightMatch[1]);
      }
    }

    // Parse battery power metrics if present
    const rawBattery = this.extractInfoboxField(fullText, ['battery', 'capacity']);
    if (rawBattery) {
      additional.batteryInfo = this.cleanWikiText(rawBattery);
    } else {
      const batterySpecRegex = /(?:battery|capacity)\s*=\s*([^|\n]+)/i;
      const batteryMatch = fullText.match(batterySpecRegex);
      if (batteryMatch && batteryMatch[1]) {
        additional.batteryInfo = this.cleanWikiText(batteryMatch[1]);
      }
    }

    if (Object.keys(additional).length > 0) {
      specs.additionalDetails = additional;
    }

    return specs;
  }

  /**
   * Helper function to extract a field from the infobox.
   * Leverages lookahead to capture standard multi-line values and internal wiki templates (like convert or start date)
   * which often contain pipe characters.
   */
  private extractInfoboxField(fullText: string, fieldNames: string[]): string | null {
    for (const field of fieldNames) {
      const regex = new RegExp(`(?:^|\\s)\\| *${field} *\\s*=\\s*((?:(?![\\r\\n]\\s*\\|)(?![\\r\\n]\\s*\\}\\})[\\s\\S])+)`, 'i');
      const match = fullText.match(regex);
      if (match && match[1]) {
        return match[1].trim();
      }
    }
    return null;
  }

  /**
   * Cleans raw Wikitext content: resolving templates (convert, dates, lists), links, 
   * markup ticks, HTML tags, and trailing spaces.
   */
  private cleanWikiText(text: string): string {
    if (!text) return '';

    let cleaned = text;

    // 1. Remove comments: <!-- comment -->
    cleaned = cleaned.replace(/<!--[\s\S]*?-->/g, '');

    // 2. Remove ref tags completely: <ref...>...</ref> or <ref.../>
    cleaned = cleaned.replace(/<ref[^>]*>[\s\S]*?<\/ref>/gi, '');
    cleaned = cleaned.replace(/<ref[^>]*\/>/gi, '');

    // 3. Clean up common templates recursively (resolves nested groups of templates)
    let previousText;
    do {
      previousText = cleaned;
      cleaned = cleaned.replace(/\{\{([^{}]+)\}\}/g, (match, body) => {
        const parts = body.split('|').map((p: string) => p.trim()).filter((p: string) => p && !p.includes('='));
        if (parts.length === 0) return '';
        
        const templateName = parts[0].toLowerCase();
        
        // 3a. Handle convert template specifically: {{convert|X|unit|...}} -> "X unit"
        if (templateName === 'convert' && parts.length >= 3) {
          const val = parts[1];
          const unit = parts[2];
          return `${val} ${unit}`;
        }
        
        // 3b. Handle date templates specifically: {{Start date|2024|02|15|...}} -> "February 15, 2024"
        if (['start date', 'start date and age', 'release date', 'introduction date', 'introduced', 'released'].includes(templateName) && parts.length >= 2) {
          const year = parseInt(parts[1], 10);
          const months = ["", "January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
          if (!isNaN(year) && year > 1000 && year < 3000) {
            if (parts.length >= 4) {
              const month = parseInt(parts[2], 10);
              const day = parseInt(parts[3], 10);
              if (!isNaN(month) && month >= 1 && month <= 12 && !isNaN(day)) {
                return `${months[month]} ${day}, ${year}`;
              }
            }
            if (parts.length >= 3) {
              const month = parseInt(parts[2], 10);
              if (!isNaN(month) && month >= 1 && month <= 12) {
                return `${months[month]} ${year}`;
              }
            }
            return `${year}`;
          }
        }
        
        // 3c. Handle unbulleted lists, flatlists, bulleted lists: join with comma
        if (['ubl', 'unbulleted list', 'flatlist', 'plainlist', 'bulleted list', 'list'].includes(templateName) && parts.length > 1) {
          return parts.slice(1).join(', ');
        }
        
        // Default template parameter extraction (falls back to listing remainder arguments)
        if (parts.length > 1) {
          // If it started with a word like "not a template name", just skip it or join it
          if (templateName.length > 20 || templateName.includes(' ')) {
            return parts.join(', ');
          }
          return parts.slice(1).join(', ');
        }
        
        return parts[0] || '';
      });
    } while (cleaned !== previousText && cleaned.includes('{{'));

    // 4. Clean Wiki links: [[Category:Products]] -> remove, [[Page Name|Display Text]] -> Display Text, [[Page Name]] -> Page Name
    cleaned = cleaned.replace(/\[\[Category:[^|\]]+\]\]/gi, '');
    cleaned = cleaned.replace(/\[\[File:[^|\]]+\]\]/gi, '');
    cleaned = cleaned.replace(/\[\[[^|\]]+\|([^\]]+)\]\]/g, '$1');
    cleaned = cleaned.replace(/\[\[([^\]]+)\]\]/g, '$1');

    // 5. Strip bold and italic ticks: ''italic'' or '''bold''' or '''''both'''''
    cleaned = cleaned.replace(/'{2,}/g, '');

    // 6. Clean HTML tags if any (e.g., <small>, <span>)
    cleaned = cleaned.replace(/<\/?[^>]+>/g, '');

    // 7. Clean up whitespace and final characters
    cleaned = cleaned.replace(/\s+/g, ' ').trim();

    return cleaned;
  }

  /**
   * Fetches URL payloads with exponential retry strategies on transient interruptions
   */
  private async fetchWithRetry(url: string, attempt: number = 1): Promise<any> {
    try {
      const response = await fetch(url);

      if (!response.ok) {
        const isTransient = response.status >= 500 || response.status === 429;
        
        if (isTransient && attempt <= this.maxRetries) {
          const delay = this.initDelayMs * Math.pow(2, attempt - 1);
          console.warn(`Transient Wikipedia API error (${response.status}). Retrying ${attempt}/${this.maxRetries} in ${delay}ms...`);
          await this.sleep(delay);
          return this.fetchWithRetry(url, attempt + 1);
        }

        throw new Error(`Wikipedia API responded with status: ${response.status}`);
      }

      return await response.json();

    } catch (err: any) {
      if (attempt <= this.maxRetries) {
        const delay = this.initDelayMs * Math.pow(2, attempt - 1);
        console.warn(`Wikipedia connection failure. Retrying ${attempt}/${this.maxRetries} in ${delay}ms...`);
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
   * Enables manual clear on cache records
   */
  public static clearCache(): void {
    WikipediaService.cache.clear();
  }
}
