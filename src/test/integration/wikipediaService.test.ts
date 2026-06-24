/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";
import { WikipediaService } from "../../services/wikipediaService.ts";

describe("WikipediaService Integration & Parser Suite", () => {
  let service: WikipediaService;
  
  beforeEach(() => {
    // Reset service cache records between runs to isolate tests
    WikipediaService.clearCache();
    // Instantiate fresh service with short delays/retries for fast testing
    service = new WikipediaService({
      cacheTTLMinutes: 10,
      maxRetries: 0,
      initDelayMs: 1
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  test("returns empty specifications elegantly when queried with empty strings", async () => {
    const res = await service.getFactualSpecs("");
    expect(res.specifications).toEqual({});
    expect(res.source).toBe("fallback");
  });

  test("normalizes query casing and whitespace silently behind the scenes", async () => {
    const mockSearchResponse = {
      query: {
        search: [{ title: "Apple AirPods Max" }]
      }
    };

    const mockContentResponse = {
      query: {
        pages: {
          "12345": {
            extract: "A premium over-ear headphones design by Apple.",
            revisions: [
              {
                "*": "{{Infobox Headphone\n| developer = Apple Inc.\n| introduced = December 15, 2020\n| weight = 384.8 grams\n| battery = Up to 20 hours\n}}"
              }
            ]
          }
        }
      }
    };

    // Deep stub fetch responses matching consecutive search and content fetches
    let callCount = 0;
    const fetchStub = vi.spyOn(global, "fetch").mockImplementation(() => {
      const respData = callCount === 0 ? mockSearchResponse : mockContentResponse;
      callCount++;
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(respData)
      } as Response);
    });

    const res1 = await service.getFactualSpecs("  Apple   airpods   MAX  ");
    expect(res1.specifications.manufacturer).toBe("Apple Inc.");
    expect(res1.specifications.releaseDate).toBe("December 15, 2020");
    expect(res1.specifications.additionalDetails?.weight).toBe("384.8 grams");
    expect(res1.specifications.additionalDetails?.batteryInfo).toBe("Up to 20 hours");
    expect(res1.source).toBe("api");

    // Fetch again. Service should trigger Cache and bypass redundant network requests!
    const res2 = await service.getFactualSpecs("  apple airpods max  ");
    expect(res2.source).toBe("cache");
    expect(fetchStub).toHaveBeenCalledTimes(3); // 1 search + 2 parallel page contents fetches
  });

  test("tolerates Wiki search page misses and serves empty specifications gracefully", async () => {
    // Return zero search hits
    vi.spyOn(global, "fetch").mockImplementation(() => {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ query: { search: [] } })
      } as Response);
    });

    const res = await service.getFactualSpecs("NonExistentProductUnlikelyToExistOnWikipediaXYZ");
    expect(res.specifications).toEqual({});
    expect(res.source).toBe("api");
  });

  test("recovers using stale caches when transient server connection loops reject", async () => {
    const mockSearchResponse = { query: { search: [{ title: "Sony Walkman" }] } };
    const mockContentResponse = {
      query: {
        pages: {
          "111": {
            extract: "Legendary pocket player",
            revisions: [{ "*": "developer=Sony" }]
          }
        }
      }
    };

    // First load succeeds
    let callCount = 0;
    const fetchSpy = vi.spyOn(global, "fetch").mockImplementation(() => {
      const respData = callCount === 0 ? mockSearchResponse : mockContentResponse;
      callCount++;
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(respData)
      } as Response);
    });

    await service.getFactualSpecs("Sony Walkman");

    // Substantially expire the cache to simulate expired/stale state
    WikipediaService.clearCache();
    // Cache stub a stale entry directly
    const normalized = "sony walkman";
    // @ts-ignore Set item to simulate expired cache read
    WikipediaService.cache.set(normalized, {
      data: { manufacturer: "Sony (Stale Profile)" },
      timestamp: Date.now() - 99999999 // expired TTL
    });

    // Make fetch reject to trigger fallback staleness recovery logic
    fetchSpy.mockRejectedValue(new Error("Network connection pool rejected"));

    const resExpiredFallback = await service.getFactualSpecs("Sony Walkman");
    expect(resExpiredFallback.source).toBe("cache");
    expect(resExpiredFallback.specifications.manufacturer).toBe("Sony (Stale Profile)");
  });
});
