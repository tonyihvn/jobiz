export function fmt(value: any, decimals = 2) {
  const n = Number(value);
  if (Number.isNaN(n)) return (0).toFixed(decimals);
  return n.toFixed(decimals);
}

export function fmtCurrency(value: any, decimals = 2) {
  const symbol = (typeof window !== 'undefined' && localStorage.getItem('omnisales_currency')) || '$';
  return `${symbol}${fmt(value, decimals)}`;
}

/**
 * Check if a user has permission for a given action
 * Handles both object format { category: true } and array format ['category', 'category:read']
 */
export function checkPermission(permissions: any, action: string): boolean {
  if (!permissions) return false;
  
  // Handle object format: { categories: true, 'categories:read': true }
  if (typeof permissions === 'object' && !Array.isArray(permissions)) {
    return !!permissions[action] || 
           !!permissions[`${action}:read`] || 
           !!permissions[`${action}:create`] || 
           !!permissions[`${action}:update`] || 
           !!permissions[`${action}:delete`];
  }
  
  // Handle array format: ['categories', 'categories:read']
  if (Array.isArray(permissions)) {
    return permissions.includes(action) || 
           permissions.includes(`${action}:read`) || 
           permissions.includes(`${action}:create`) || 
           permissions.includes(`${action}:update`) || 
           permissions.includes(`${action}:delete`);
  }
  
  return false;
}

/**
 * Converts a relative image URL to an absolute URL if needed
 * Ensures uploaded images are properly served from the backend
 * Works in both development (with Vite proxy) and production
 */
export function getImageUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  
  // If already absolute URL, return as-is
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }
  
  // If relative /uploads path
  if (url.startsWith('/uploads')) {
    // Get API URL from environment
    const API_BASE = ((import.meta as any).env?.VITE_API_URL as string) || '';
    
    // In development with Vite proxy, the relative path should work
    // as Vite proxies /uploads to the backend
    if (API_BASE) {
      return `${API_BASE}${url}`;
    }
    
    // In development or when no API_BASE, return the relative path
    // The Vite proxy will handle the routing
    return url;
  }
  
  return url;
}

export default { fmt, fmtCurrency, getImageUrl, checkPermission };
