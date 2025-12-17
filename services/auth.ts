export const TOKEN_KEY = 'omnisales_token';

const API_BASE = ((import.meta as any).env?.VITE_API_URL as string) || '';

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
        if (txt) errMsg = txt;
      } catch {
        // ignore
      }
    }
    throw new Error(errMsg);
  }
  const data = await res.json();
  if (data.token) localStorage.setItem(TOKEN_KEY, data.token);
  return data;
}

export async function register(companyName: string, adminName: string, email: string, password: string) {
  const res = await fetch(withBase('/api/register'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ companyName, adminName, email, password })
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
        if (txt) errMsg = txt;
      } catch {
        // ignore
      }
    }
    throw new Error(errMsg);
  }
  return res.json();
}

export function logout() {
  localStorage.removeItem(TOKEN_KEY);
}

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export async function getCurrentUser() {
  const token = getToken();
  if (!token) return null;
  const res = await fetch(withBase('/api/me'), {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!res.ok) {
    logout();
    return null;
  }
  return res.json();
}

export function authFetch(input: RequestInfo, init: RequestInit = {}) {
  const token = getToken();
  const headers = init.headers ? new Headers(init.headers as any) : new Headers();
  if (token) headers.set('Authorization', `Bearer ${token}`);
  const target = withBase(input);
  return fetch(target, { ...init, headers });
}
