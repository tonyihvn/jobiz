/**
 * Cross-Window Token Helper
 * Helps pass authentication tokens between windows in iframe contexts
 */

export const getAuthToken = (): string | null => {
  // Check localStorage first
  const token = localStorage.getItem('omnisales_token');
  if (token) return token;

  // Check URL parameters
  try {
    const params = new URLSearchParams(window.location.search);
    return params.get('token');
  } catch (e) {
    return null;
  }
};

/**
 * Build URL with token for iframe contexts
 * When opening a new window from an iframe, pass token in URL so child window can auth
 */
export const buildUrlWithToken = (url: string): string => {
  const token = getAuthToken();
  if (!token) return url;

  // Check if URL already has token
  if (url.includes('token=')) return url;

  // Add token to URL
  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}token=${encodeURIComponent(token)}`;
};

/**
 * Open window with token support for iframe contexts
 */
export const openWindowWithToken = (
  url: string,
  target: string = '_blank',
  features: string = ''
): Window | null => {
  const urlWithToken = buildUrlWithToken(url);
  return window.open(urlWithToken, target, features);
};

/**
 * Handle incoming token from parent window (iframe scenario)
 */
export const setupTokenReceiver = (): void => {
  if (typeof window === 'undefined') return;

  window.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'TOKEN_RESPONSE' && event.data.token) {
      console.log('[TokenHelper] Received token from parent window');
      localStorage.setItem('omnisales_token', event.data.token);
    }
  });
};

/**
 * Request token from parent window (iframe scenario)
 */
export const requestTokenFromParent = (): void => {
  if (typeof window === 'undefined' || window.parent === window) {
    return; // Not in iframe
  }

  try {
    console.log('[TokenHelper] Requesting token from parent window...');
    window.parent.postMessage({ type: 'REQUEST_TOKEN' }, '*');
  } catch (e) {
    console.warn('[TokenHelper] Failed to request token from parent:', e);
  }
};
