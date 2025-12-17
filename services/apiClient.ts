import { authFetch, login as authLogin, logout as authLogout, getToken, register as authRegister } from './auth';

async function safeJson(res: Response) {
  if (!res.ok) {
    let msg = `HTTP ${res.status}`;
    try { const j = await res.json(); if (j && j.error) msg = j.error; } catch {}
    throw new Error(msg);
  }
  return res.json();
}

function toSnake(obj: any, mapping: Record<string,string> = {}) {
  const out: any = {};
  for (const k of Object.keys(obj || {})) {
    const v = (obj as any)[k];
    const key = mapping[k] || k.replace(/([A-Z])/g, '_$1').toLowerCase();
    out[key] = v;
  }
  return out;
}

export const api = {
  auth: {
    login: (email: string, password: string) => authLogin(email, password),
    register: (companyName: string, adminName: string, email: string, password: string) => authRegister(companyName, adminName, email, password),
    logout: () => authLogout(),
    getCurrentUser: () => authFetch('/api/me').then(r => r.ok ? r.json() : null)
  },

  products: {
    getAll: () => authFetch('/api/products').then(safeJson),
    add: (p: any) => {
      const body = toSnake(p, { categoryName: 'category_name', categoryGroup: 'category_group', isService: 'is_service', imageUrl: 'image_url' });
      return authFetch('/api/products', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).then(safeJson);
    },
    update: (id: string, p: any) => {
      const body = toSnake(p, { categoryName: 'category_name', categoryGroup: 'category_group', isService: 'is_service', imageUrl: 'image_url' });
      return authFetch(`/api/products/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).then(safeJson).catch(() => null);
    },
    delete: (id: string) => authFetch(`/api/products/${id}`, { method: 'DELETE' }).then(safeJson).catch(() => null),
  },

  locations: {
    getAll: () => authFetch('/api/locations').then(safeJson),
    add: (d: any) => authFetch('/api/locations', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(d) }).then(safeJson),
    update: (id: string, d: any) => authFetch(`/api/locations/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(d) }).then(safeJson),
    delete: (id: string) => authFetch(`/api/locations/${id}`, { method: 'DELETE' }).then(safeJson)
  },

  stock: {
    getForProduct: (productId: string) => authFetch(`/api/stock/${productId}`).then(safeJson),
    history: (productId: string) => authFetch(`/api/stock/history/${productId}`).then(safeJson),
    increase: (productId: string, locationId: string, qty: number, supplierId?: string, batchNumber?: string, referenceId?: string) => authFetch('/api/stock/increase', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ productId, locationId, qty, supplierId, batchNumber, referenceId }) }).then(safeJson),
    decrease: (productId: string, locationId: string, qty: number, supplierId?: string, batchNumber?: string, referenceId?: string) => authFetch('/api/stock/decrease', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ productId, locationId, qty, supplierId, batchNumber, referenceId }) }).then(safeJson),
    move: (productId: string, fromLocationId: string, toLocationId: string, qty: number, supplierId?: string, batchNumber?: string, referenceId?: string) => authFetch('/api/stock/move', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ productId, fromLocationId, toLocationId, qty, supplierId, batchNumber, referenceId }) }).then(safeJson),
    historyAll: () => authFetch('/api/stock/history').then(safeJson)
  },

  sales: {
    getAll: () => authFetch('/api/sales').then(safeJson).catch(() => []),
    add: (sale: any) => authFetch('/api/sales', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(sale) }).then(safeJson)
  },

  // Upload helper (multipart form upload)
  upload: {
    file: (formData: FormData) => {
      return authFetch('/api/upload', { method: 'POST', body: formData }).then(safeJson).catch(() => null);
    }
  },

  services: {
    getAll: () => authFetch('/api/services').then(safeJson).catch(() => []),
    add: (s: any) => {
      const body = toSnake(s, { categoryName: 'category_name', categoryGroup: 'category_group', imageUrl: 'image_url' });
      return authFetch('/api/services', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).then(safeJson).catch(() => null);
    },
    update: (id: string, s: any) => {
      const body = toSnake(s, { categoryName: 'category_name', categoryGroup: 'category_group', imageUrl: 'image_url' });
      return authFetch(`/api/services/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).then(safeJson).catch(() => null);
    },
    delete: (id: string) => authFetch(`/api/services/${id}`, { method: 'DELETE' }).then(safeJson).catch(() => null)
  },

  // Generic placeholders; serverside endpoints may need to be implemented
  customers: {
    getAll: () => authFetch('/api/customers').then(safeJson).catch(() => []),
    add: (c: any) => {
      const body = toSnake(c);
      return authFetch('/api/customers', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).then(safeJson);
    }
  },

  suppliers: {
    getAll: () => authFetch('/api/suppliers').then(safeJson).catch(() => []),
    add: (s: any) => {
      const body = toSnake(s, { contactPerson: 'contact_person' });
      return authFetch('/api/suppliers', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).then(safeJson);
    }
  },

  employees: {
    getAll: () => authFetch('/api/employees').then(safeJson).catch(() => []),
    add: (e: any) => authFetch('/api/employees', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(e) }).then(safeJson),
    update: (id: string, e: any) => authFetch(`/api/employees/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(e) }).then(safeJson).catch(() => null),
    delete: (id: string) => authFetch(`/api/employees/${id}`, { method: 'DELETE' }).then(safeJson).catch(() => null)
  }
};

// Compatibility wrapper to provide the legacy `db` shape expected by pages.
const db = {
  ...api,
  products: {
    ...api.products,
    // legacy `save` used in many places: accept array and create each item
    save: async (items: any[]) => {
      if (!Array.isArray(items)) return null;
      const results = [];
      for (const it of items) {
        try { results.push(await api.products.add(it)); } catch (e) { results.push(null); }
      }
      return results;
    },
    // accept either (id, payload) or single object with `.id`
    update: async (idOrObj: any, p?: any) => {
      try {
        if (typeof idOrObj === 'string') {
          return await api.products.update(idOrObj, p);
        }
        if (idOrObj && idOrObj.id) {
          return await api.products.update(idOrObj.id, idOrObj);
        }
        return null;
      } catch (e) { return null; }
    }
  },
  // Transactions (server implements /api/transactions)
  transactions: {
    getAll: () => authFetch('/api/transactions').then(safeJson).catch(() => []),
    add: (t: any) => authFetch('/api/transactions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(t) }).then(safeJson).catch(() => null)
  },
  // Suppliers compatibility on db (adds delete/update/save helpers)
  suppliers: {
    ...api.suppliers,
    delete: (id: string) => authFetch(`/api/suppliers/${id}`, { method: 'DELETE' }).then(safeJson).catch(() => null),
    update: (id: string, s: any) => authFetch(`/api/suppliers/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(s) }).then(safeJson).catch(() => null),
    save: async (items: any[]) => {
      if (!Array.isArray(items)) return null;
      const results: any[] = [];
      for (const it of items) {
        try { results.push(await api.suppliers.add(it)); } catch (e) { results.push(null); }
      }
      return results;
    }
  },
  // Sales helpers (compat)
  sales: {
    ...api.sales,
    processReturn: async (saleId: string, reason: string, products?: any[]) => {
      try {
        return await authFetch(`/api/sales/${saleId}/return`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ reason, products }) }).then(safeJson).catch(() => null);
      } catch (e) { return null; }
    }
  },
  // Account heads, roles, categories, reports, tasks, audit: provide safe defaults or minimal implementations
  accountHeads: {
    getAll: () => authFetch('/api/account-heads').then(safeJson).catch(() => []),
    add: (a: any) => authFetch('/api/account-heads', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(a) }).then(safeJson).catch(() => null),
    update: (id: string, a: any) => authFetch(`/api/account-heads/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(a) }).then(safeJson).catch(() => null),
    delete: (id: string) => authFetch(`/api/account-heads/${id}`, { method: 'DELETE' }).then(safeJson).catch(() => null)
    ,
    save: async (items: any[]) => {
      if (!Array.isArray(items)) return null;
      const res: any[] = [];
      for (const it of items) {
        try {
          if (it && it.id) {
            res.push(await authFetch(`/api/account-heads/${it.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(it) }).then(safeJson).catch(() => null));
          } else {
            res.push(await authFetch('/api/account-heads', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(it) }).then(safeJson).catch(() => null));
          }
        } catch (e) { res.push(null); }
      }
      return res;
    }
  },
  roles: {
    getAll: () => authFetch('/api/roles').then(safeJson).catch(() => []),
    add: (r: any) => authFetch('/api/roles', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(r) }).then(safeJson).catch(() => null),
    update: (id: string, r: any) => authFetch(`/api/roles/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(r) }).then(safeJson).catch(() => null),
    delete: (id: string) => authFetch(`/api/roles/${id}`, { method: 'DELETE' }).then(safeJson).catch(() => null)
    ,
    save: async (items: any[]) => {
      if (!Array.isArray(items)) return null;
      const res: any[] = [];
      for (const it of items) {
        try {
          if (it && it.id) {
            res.push(await authFetch(`/api/roles/${it.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(it) }).then(safeJson).catch(() => null));
          } else {
            res.push(await authFetch('/api/roles', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(it) }).then(safeJson).catch(() => null));
          }
        } catch (e) { res.push(null); }
      }
      return res;
    }
  },
  categories: {
    getAll: () => authFetch('/api/categories').then(safeJson).catch(() => []),
    add: (c: any) => {
      const body = toSnake(c, { categoryGroup: 'group', isProduct: 'is_product' });
      return authFetch('/api/categories', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).then(safeJson).catch(() => null);
    },
    update: (id: string, c: any) => {
      const body = toSnake(c, { categoryGroup: 'group', isProduct: 'is_product' });
      return authFetch(`/api/categories/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).then(safeJson).catch(() => null);
    },
    delete: (id: string) => authFetch(`/api/categories/${id}`, { method: 'DELETE' }).then(safeJson).catch(() => null),
    save: async (items: any[]) => {
      if (!Array.isArray(items)) return null;
      const res: any[] = [];
      for (const it of items) {
        try {
          if (it && it.id) {
            res.push(await db.categories.update(it.id, it));
          } else {
            res.push(await db.categories.add(it));
          }
        } catch (e) { res.push(null); }
      }
      return res;
    }
  },
  reports: {
    getAll: () => authFetch('/api/reports').then(safeJson).catch(() => []),
    add: (r: any) => authFetch('/api/reports', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(r) }).then(safeJson).catch(() => null),
    delete: (id: string) => authFetch(`/api/reports/${id}`, { method: 'DELETE' }).then(safeJson).catch(() => null)
  },
  tasks: {
    getAll: () => authFetch('/api/tasks').then(safeJson).catch(() => []),
    add: (t: any) => authFetch('/api/tasks', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(t) }).then(safeJson).catch(() => null),
    update: (id: string, t: any) => authFetch(`/api/tasks/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(t) }).then(safeJson).catch(() => null),
    delete: (id: string) => authFetch(`/api/tasks/${id}`, { method: 'DELETE' }).then(safeJson).catch(() => null),
    save: async (items: any[]) => {
      if (!Array.isArray(items)) return null;
      const res: any[] = [];
      for (const it of items) {
        try {
          res.push(await authFetch('/api/tasks', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(it) }).then(safeJson).catch(() => null));
        } catch (e) { res.push(null); }
      }
      return res;
    }
  },
  audit: {
      getAll: async () => {
        try {
          const res = await authFetch('/api/audit-logs');
          if (!res.ok) return [];
          const data = await res.json();
          return data;
        } catch (err) {
          console.warn('Failed to fetch audit logs', err);
          return [];
        }
      },
    log: (_: any) => Promise.resolve()
  },
  // Super admin helpers
  superAdmin: {
    getBusinesses: () => authFetch('/api/businesses').then(safeJson).catch(() => []),
    getPlans: () => authFetch('/api/plans').then(safeJson).catch(() => []),
    submitPaymentReceipt: (url: string) => authFetch('/api/superadmin/verify-payment', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ receiptUrl: url }) }).then(safeJson).catch(() => null),
    updateBusinessStatus: (id: string, status: string) => authFetch(`/api/businesses/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) }).then(safeJson).catch(() => null),
    verifyPayment: (id: string) => authFetch(`/api/superadmin/verify-payment/${id}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) }).then(safeJson).catch(() => null),
    savePlan: (plan: any) => {
      if (plan.id && !plan.id.startsWith('plan_')) {
        return authFetch(`/api/plans/${plan.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(plan) }).then(safeJson).catch(() => null);
      }
      return authFetch('/api/plans', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(plan) }).then(safeJson).catch(() => null);
    }
  },
  // Settings compatibility: try to fetch /api/settings if exists, otherwise return empty
  settings: {
    get: async () => {
      try {
        const s = await authFetch('/api/settings').then(safeJson).catch(() => ({}));
        try {
          if (s && s.currency) {
            if (typeof window !== 'undefined') localStorage.setItem('omnisales_currency', s.currency);
          }
        } catch (e) { /* ignore */ }
        return s;
      } catch (e) { return {}; }
    },
    save: async (_: any) => {
      try {
        const res = await authFetch('/api/settings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(_) }).then(safeJson).catch(() => null);
        try {
          if (res && res.currency && typeof window !== 'undefined') {
            localStorage.setItem('omnisales_currency', res.currency || _.currency || '$');
          } else if (_ && _.currency && typeof window !== 'undefined') {
            localStorage.setItem('omnisales_currency', _.currency);
          }
        } catch (e) { /* ignore */ }
        return res;
      } catch (e) { /* ignore */ return null; }
    }
  },
  // Feedbacks from landing page
  feedbacks: {
    getAll: () => authFetch('/api/feedbacks').then(safeJson).catch(() => []),
    add: (f: any) => authFetch('/api/feedbacks', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(f) }).then(safeJson).catch(() => null),
    update: (id: string, f: any) => authFetch(`/api/feedbacks/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(f) }).then(safeJson).catch(() => null),
    delete: (id: string) => authFetch(`/api/feedbacks/${id}`, { method: 'DELETE' }).then(safeJson).catch(() => null)
  }
};

export default db;
