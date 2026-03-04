// Simple cache for GET requests
type CacheEntry = {
  data: any;
  timestamp: number;
};

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
const cache = new Map<string, CacheEntry>();

// Track pending requests to avoid duplicates
const pendingRequests = new Map<string, Promise<any>>();

export const cacheManager = {
  /**
   * Get cached data if it exists and hasn't expired
   */
  get: (key: string): any | null => {
    const entry = cache.get(key);
    if (!entry) return null;

    const age = Date.now() - entry.timestamp;
    if (age > CACHE_DURATION) {
      cache.delete(key);
      return null;
    }

    return entry.data;
  },

  /**
   * Set cache entry
   */
  set: (key: string, data: any) => {
    cache.set(key, {
      data,
      timestamp: Date.now(),
    });
  },

  /**
   * Clear cache for a specific key
   */
  clear: (key: string) => {
    cache.delete(key);
  },

  /**
   * Clear all cache entries matching a pattern
   */
  clearPattern: (pattern: string | RegExp) => {
    const regex = typeof pattern === 'string' ? new RegExp(pattern) : pattern;
    for (const key of cache.keys()) {
      if (regex.test(key)) {
        cache.delete(key);
      }
    }
  },

  /**
   * Clear entire cache
   */
  clearAll: () => {
    cache.clear();
  },
};

export const requestDeduplicator = {
  /**
   * Execute a request, reusing pending requests if available
   */
  async deduplicate<T>(
    key: string,
    requestFn: () => Promise<T>
  ): Promise<T> {
    // Check if there's already a pending request for this key
    if (pendingRequests.has(key)) {
      return pendingRequests.get(key)!;
    }

    // Create and track the new request
    const request = requestFn()
      .then((data) => {
        pendingRequests.delete(key);
        return data;
      })
      .catch((error) => {
        pendingRequests.delete(key);
        throw error;
      });

    pendingRequests.set(key, request);
    return request;
  },

  /**
   * Clear pending request tracker
   */
  clear: (key: string) => {
    pendingRequests.delete(key);
  },

  /**
   * Get count of pending requests
   */
  getPendingCount: () => pendingRequests.size,
};
