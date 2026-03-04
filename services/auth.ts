export const TOKEN_KEY = 'omnisales_token';

const API_BASE = ((import.meta as any).env?.VITE_API_URL as string) || '';

// Import global loading manager for automatic loading state
import { globalLoadingManager } from './globalLoadingManager';

// Initialize iframe token receiver (one-time setup)
if (typeof window !== 'undefined') {
  window.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'TOKEN_RESPONSE' && event.data.token) {
      console.log('[Auth] Received token from parent window');
      localStorage.setItem(TOKEN_KEY, event.data.token);
    }
  });
}

function withBase(input: RequestInfo) {
  if (typeof input === 'string') {
    if (input.startsWith('/api')) return `${API_BASE}${input}`;
    return input;
  }
  return input;
}

export async function login(email: string, password: string) {
  const res = await fetch(withBase('/api/login'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  if (!res.ok) {
    let errMsg = 'Login failed';
    try {
      const payload = await res.json();
      if (payload && payload.error) errMsg = payload.error;
      else if (typeof payload === 'string') errMsg = payload;
    } catch {
      try {
        const txt = await res.text();
        if (txt && !txt.toLowerCase().includes('<!doctype') && !txt.toLowerCase().includes('<html')) {
          errMsg = txt;
        } else {
          errMsg = `Server error (${res.status}): ${res.statusText || 'Unknown error'}`;
        }
      } catch {
        errMsg = `Server error (${res.status}): Unable to parse response`;
      }
    }
    throw new Error(errMsg);
  }
  let data;
  try {
    const txt = await res.text();
    // If response is HTML, return empty success object (something went wrong but we got a response)
    if (!txt || txt.toLowerCase().includes('<!doctype') || txt.toLowerCase().includes('<html')) {
      throw new Error('Server returned invalid response');
    }
    data = JSON.parse(txt);
  } catch (e) {
    throw new Error('Invalid server response format');
  }
  if (data && data.token) {
    localStorage.setItem(TOKEN_KEY, data.token);
    // Store whether user is super admin
    const isSuperAdmin = data.is_super_admin || data.isSuperAdmin;
    localStorage.setItem('omnisales_is_super_admin', String(isSuperAdmin));
    console.log('[Auth] User logged in, is_super_admin:', isSuperAdmin);
  }
  return data;
}

export async function register(companyName: string, adminName: string, email: string, password: string, phone?: string) {
  const res = await fetch(withBase('/api/register'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ companyName, adminName, email, password, phone: phone || null })
  });
  if (!res.ok) {
    let errMsg = 'Registration failed';
    try {
      const payload = await res.json();
      if (payload && payload.error) errMsg = payload.error;
      else if (typeof payload === 'string') errMsg = payload;
    } catch {
      try {
        const txt = await res.text();
        if (txt && !txt.toLowerCase().includes('<!doctype') && !txt.toLowerCase().includes('<html')) {
          errMsg = txt;
        } else {
          errMsg = `Server error (${res.status}): ${res.statusText || 'Unknown error'}`;
        }
      } catch {
        errMsg = `Server error (${res.status}): Unable to parse response`;
      }
    }
    throw new Error(errMsg);
  }
  try {
    const txt = await res.text();
    // If response is HTML or empty, return success (registration succeeded even if response is malformed)
    if (!txt || txt.toLowerCase().includes('<!doctype') || txt.toLowerCase().includes('<html') || txt.toLowerCase().includes('<body')) {
      console.log('Registration: Detected HTML response, returning success');
      return { success: true };
    }
    // Try to parse as JSON
    try {
      return JSON.parse(txt);
    } catch (parseErr) {
      console.warn('Registration: Failed to parse response as JSON, returning success anyway', txt.substring(0, 100));
      return { success: true };
    }
  } catch (e) {
    console.warn('Registration: Failed to read response', e);
    // If we can't parse, assume success since status was 200
    return { success: true };
  }
}

export function logout() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem('omnisales_is_super_admin');
  localStorage.removeItem('omnisales_last_business_id');
}

export function getToken() {
  // First check localStorage
  let token = localStorage.getItem(TOKEN_KEY);
  
  // For iframe context, also check URL parameters
  if (!token && typeof window !== 'undefined') {
    try {
      const params = new URLSearchParams(window.location.search);
      token = params.get('token');
      if (token) {
        // Store it for future use
        localStorage.setItem(TOKEN_KEY, token);
        console.log('[Auth] Token found in URL params, stored in localStorage');
      }
    } catch (e) {
      // URL parsing might fail
    }
  }
  
  return token;
}

export async function getCurrentUser() {
  const token = getToken();
  if (!token) {
    console.warn('[Auth] No token available for getCurrentUser');
    return null;
  }
  
  try {
    const res = await fetch(withBase('/api/me'), {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    if (!res.ok) {
      console.warn('[Auth] getCurrentUser failed with status:', res.status);
      if (res.status === 401) {
        // Unauthorized - clear token
        logout();
        
        // Try asking parent window for token (iframe context)
        if (typeof window !== 'undefined' && window.parent !== window) {
          try {
            console.log('[Auth] Requesting token from parent window...');
            window.parent.postMessage({ type: 'REQUEST_TOKEN' }, '*');
          } catch (e) {
            console.warn('[Auth] Failed to post message to parent:', e);
          }
        }
      }
      return null;
    }
    
    return res.json();
  } catch (error) {
    console.error('[Auth] getCurrentUser error:', error);
    return null;
  }
}

export function authFetch(input: RequestInfo, init: RequestInit = {}) {
  const token = getToken();
  const headers = init.headers ? new Headers(init.headers as any) : new Headers();
  if (token) headers.set('Authorization', `Bearer ${token}`);
  const target = withBase(input);
  
  // Create unique request ID to ensure start/stop match
  const requestId = Math.random().toString(36).substring(7) + '_' + Date.now();
  
  // Start loading
  globalLoadingManager.start('Loading data...', requestId);
  
  // Execute fetch and handle loading state
  return fetch(target, { ...init, headers })
    .then(response => {
      globalLoadingManager.stop(requestId);
      return response;
    })
    .catch(error => {
      globalLoadingManager.stop(requestId);
      throw error;
    });
}
