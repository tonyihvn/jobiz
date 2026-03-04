/**
 * Performance Monitoring Utilities
 * Track API call performance and loading times
 */

type PerformanceMetric = {
  endpoint: string;
  method: string;
  duration: number;
  cached: boolean;
  timestamp: number;
};

const metrics: PerformanceMetric[] = [];

/**
 * Record an API call metric
 */
export const recordMetric = (
  endpoint: string,
  method: string,
  duration: number,
  cached: boolean
) => {
  const metric: PerformanceMetric = {
    endpoint,
    method,
    duration,
    cached,
    timestamp: Date.now(),
  };

  metrics.push(metric);

  // Keep only last 100 metrics
  if (metrics.length > 100) {
    metrics.shift();
  }

  // Log in development
  if (process.env.NODE_ENV === 'development') {
    console.log(
      `[PERF] ${method} ${endpoint} - ${duration}ms ${cached ? '(cached)' : ''}`
    );
  }
};

/**
 * Get average response time for an endpoint
 */
export const getAverageTime = (endpoint: string): number => {
  const relevant = metrics.filter(m => m.endpoint.includes(endpoint));
  if (relevant.length === 0) return 0;
  return relevant.reduce((sum, m) => sum + m.duration, 0) / relevant.length;
};

/**
 * Get cache hit rate
 */
export const getCacheHitRate = (): number => {
  if (metrics.length === 0) return 0;
  const cached = metrics.filter(m => m.cached).length;
  return (cached / metrics.length) * 100;
};

/**
 * Get performance summary
 */
export const getPerformanceSummary = () => {
  if (metrics.length === 0) {
    return {
      totalRequests: 0,
      averageResponseTime: 0,
      cacheHitRate: 0,
      fastestRequest: 0,
      slowestRequest: 0,
      totalCached: 0,
      metrics: [],
    };
  }

  const durations = metrics.map(m => m.duration);
  const cached = metrics.filter(m => m.cached).length;

  return {
    totalRequests: metrics.length,
    averageResponseTime: durations.reduce((a, b) => a + b, 0) / metrics.length,
    cacheHitRate: (cached / metrics.length) * 100,
    fastestRequest: Math.min(...durations),
    slowestRequest: Math.max(...durations),
    totalCached: cached,
    metrics: metrics.slice(-10), // Last 10 metrics
  };
};

/**
 * Clear performance metrics
 */
export const clearMetrics = () => {
  metrics.length = 0;
};

/**
 * Print performance report to console
 */
export const printReport = () => {
  const summary = getPerformanceSummary();

  console.group('📊 Performance Report');
  console.table({
    'Total API Calls': summary.totalRequests,
    'Avg Response Time': `${summary.averageResponseTime.toFixed(2)}ms`,
    'Cache Hit Rate': `${summary.cacheHitRate.toFixed(1)}%`,
    'Fastest Request': `${summary.fastestRequest}ms`,
    'Slowest Request': `${summary.slowestRequest}ms`,
    'Cached Requests': summary.totalCached,
  });

  console.log('Recent Requests:');
  console.table(summary.metrics);
  console.groupEnd();
};

// Export for window access in dev tools
if (typeof window !== 'undefined') {
  (window as any).__PERF_MONITOR__ = {
    getSummary: getPerformanceSummary,
    printReport,
    clearMetrics,
    getAverageTime,
    getCacheHitRate,
  };

  console.log(
    '%c📊 Performance Monitor Ready',
    'color: #4f46e5; font-weight: bold; font-size: 14px;'
  );
  console.log(
    '%cUse window.__PERF_MONITOR__.printReport() to view performance metrics',
    'color: #666; font-size: 12px;'
  );
}
