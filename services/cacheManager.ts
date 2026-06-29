// Simple cache for GET requests
type CacheEntry = {
  data: any;
  timestamp: number;
  ttl?: number; // Custom TTL per entry
};

const DEFAULT_CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Resource-specific cache durations for smarter invalidation
const CACHE_DURATIONS: Record<string, number> = {
  products: 10 * 60 * 1000,      // 10 minutes for products
  customers: 30 * 60 * 1000,     // 30 minutes for customers
  roles: 60 * 60 * 1000,         // 1 hour for roles
  transactions: 2 * 60 * 1000,   // 2 minutes for transactions
  sales: 3 * 60 * 1000,          // 3 minutes for sales
  employees: 15 * 60 * 1000,     // 15 minutes for employees
};

const cache = new Map<string, CacheEntry>();

// Track pending requests to avoid duplicates
const pendingRequests = new Map<string, Promise<any>>();

// Helper to determine cache duration based on resource type
function getCacheDuration(resource: string): number {
  const match = resource.match(/^([a-z]+)_/);
  const resourceType = match ? match[1] : resource;
  return CACHE_DURATIONS[resourceType] || DEFAULT_CACHE_DURATION;
}

export const cacheManager = {
  /**
   * Get cached data if it exists and hasn't expired
   */
  get: (key: string): any | null => {
    const entry = cache.get(key);
    if (!entry) return null;

    const age = Date.now() - entry.timestamp;
    const ttl = entry.ttl || getCacheDuration(key);
    
    if (age > ttl) {
      cache.delete(key);
      return null;
    }

    return entry.data;
  },

  /**
   * Set cache entry with optional custom TTL
   */
  set: (key: string, data: any, customTTL?: number) => {
    cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: customTTL,
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
   * Invalidate all data for a specific business (multi-tenant isolation)
   */
  invalidateBusinessData: (businessId: string) => {
    const pattern = new RegExp(`_b${businessId}_`);
    for (const key of cache.keys()) {
      if (pattern.test(key)) {
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
