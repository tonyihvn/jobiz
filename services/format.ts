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
 * Converts a relative image URL to an absolute URL if needed
 * Ensures uploaded images are properly served from the backend
 */
export function getImageUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  
  // If already absolute URL, return as-is
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }
  
  // If relative /uploads path, ensure it's properly served
  if (url.startsWith('/uploads')) {
    const API_BASE = ((import.meta as any).env?.VITE_API_URL as string) || '';
    return API_BASE ? `${API_BASE}${url}` : url;
  }
  
  return url;
}

export default { fmt, fmtCurrency, getImageUrl };
