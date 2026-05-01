import React, { useEffect, useMemo, useRef, useState } from 'react';
import { X, Save, Upload, Package, Wrench } from 'lucide-react';
import db from '../../services/apiClient';
import { useBusinessContext } from '../../services/BusinessContext';
import { CategoryGroup } from '../../types';
import { authFetch } from '../../services/auth';

type Mode = 'product' | 'service';

interface QuickCreateItemModalProps {
  open: boolean;
  mode: Mode;
  onClose: () => void;
  /** Called after a successful save with the created item payload sent to the API. */
  onCreated?: (item: any) => void;
}

interface CategoryRecord {
  id: string;
  name: string;
  group: string;
  isProduct: boolean;
}

/**
 * Quick-create modal launched from the sidebar. Lets the user create a Product
 * or a Service with a category Group + Name autocomplete that suggests
 * existing categories (filtered by isProduct) and creates new ones on-the-fly
 * if the user types a value not yet in the list.
 */
const QuickCreateItemModal: React.FC<QuickCreateItemModalProps> = ({ open, mode, onClose, onCreated }) => {
  const { selectedBusinessId } = useBusinessContext();
  const [categories, setCategories] = useState<CategoryRecord[]>([]);
  const [loadingCats, setLoadingCats] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isProduct = mode === 'product';
  const builtInGroups = useMemo(() => Object.values(CategoryGroup) as string[], []);

  const [form, setForm] = useState({
    name: '',
    categoryGroup: '',
    categoryName: '',
    price: '' as number | '',
    stock: '' as number | '',
    unit: isProduct ? 'pcs' : 'hr',
    description: '',
    imageUrl: '',
  });

  // Reset on open / mode change
  useEffect(() => {
    if (open) {
      setForm({
        name: '',
        categoryGroup: '',
        categoryName: '',
        price: '',
        stock: '',
        unit: isProduct ? 'pcs' : 'hr',
        description: '',
        imageUrl: '',
      });
      setError(null);
    }
  }, [open, mode, isProduct]);

  // Load categories for autocomplete
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    (async () => {
      setLoadingCats(true);
      try {
        const raw: any[] = (db.categories && db.categories.getAll)
          ? await db.categories.getAll(selectedBusinessId)
          : [];
        const normalized: CategoryRecord[] = (raw || []).map((c: any) => ({
          id: c.id,
          name: c.name || c.label || '',
          group: c.group || c.category_group || '',
          isProduct: typeof c.isProduct !== 'undefined' ? !!c.isProduct : !!c.is_product,
        }));
        if (!cancelled) setCategories(normalized);
      } catch (e) {
        console.warn('QuickCreate: failed to load categories', e);
      } finally {
        if (!cancelled) setLoadingCats(false);
      }
    })();
    return () => { cancelled = true; };
  }, [open, selectedBusinessId]);

  // Filter categories by the type we're creating
  const relevantCats = useMemo(
    () => categories.filter(c => c.isProduct === isProduct),
    [categories, isProduct],
  );

  // Distinct groups for autocomplete suggestions (existing groups for this type
  // + built-in CategoryGroup values so brand-new accounts always have options).
  const groupSuggestions = useMemo(() => {
    const set = new Set<string>();
    relevantCats.forEach(c => { if (c.group) set.add(c.group); });
    builtInGroups.forEach(g => set.add(g));
    return Array.from(set).sort();
  }, [relevantCats, builtInGroups]);

  // Names suggestions filtered by chosen group
  const nameSuggestions = useMemo(() => {
    const target = (form.categoryGroup || '').trim().toLowerCase();
    const set = new Set<string>();
    relevantCats.forEach(c => {
      if (!target || (c.group || '').toLowerCase() === target) {
        if (c.name) set.add(c.name);
      }
    });
    return Array.from(set).sort();
  }, [relevantCats, form.categoryGroup]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const fd = new FormData();
    fd.append('file', file);
    try {
      const res = await authFetch('/api/upload', { method: 'POST', body: fd });
      const data = await res.json().catch(() => null);
      if (data && data.url) setForm(f => ({ ...f, imageUrl: data.url }));
    } catch (err) {
      console.warn('QuickCreate image upload failed', err);
    }
  };

  // Ensure a category record exists for (group, name). If not, create it.
  const ensureCategoryRecord = async (group: string, name: string) => {
    const g = (group || '').trim();
    const n = (name || '').trim();
    if (!g && !n) return;
    const exists = categories.some(c =>
      c.isProduct === isProduct &&
      (c.group || '').toLowerCase() === g.toLowerCase() &&
      (c.name || '').toLowerCase() === n.toLowerCase(),
    );
    if (exists) return;
    try {
      if (db.categories && db.categories.add) {
        await db.categories.add({
          id: Date.now().toString(),
          name: n || g,
          group: g || n,
          isProduct,
          description: '',
        });
        // Notify the rest of the app (Sidebar uses this to refresh dynamic groups)
        try { window.dispatchEvent(new CustomEvent('categories:changed')); } catch {}
      }
    } catch (e) {
      console.warn('QuickCreate: failed to create category', e);
    }
  };

  const handleSave = async () => {
    setError(null);
    if (!form.name.trim()) { setError('Name is required.'); return; }
    if (!form.price || Number(form.price) <= 0) { setError('Price must be greater than 0.'); return; }

    const groupValue = (form.categoryGroup || '').trim() || (isProduct ? CategoryGroup.OTHER : (groupSuggestions[0] || CategoryGroup.OTHER));
    const nameValue = (form.categoryName || '').trim() || 'General';

    setSaving(true);
    try {
      // Create the category if it does not exist yet (best-effort).
      await ensureCategoryRecord(groupValue, nameValue);

      if (isProduct) {
        const currentUser = await db.auth.getCurrentUser().catch(() => null);
        const businessIdToUse = selectedBusinessId || (currentUser && (currentUser.businessId || currentUser.business_id)) || '';
        const payload = {
          id: Date.now().toString(),
          businessId: businessIdToUse,
          name: form.name.trim(),
          categoryName: nameValue,
          categoryGroup: groupValue,
          price: Number(form.price),
          stock: Number(form.stock || 0),
          unit: form.unit || 'pcs',
          isService: false,
          imageUrl: form.imageUrl || '',
        };
        if (!(db.products && db.products.add)) throw new Error('Products API not available');
        await db.products.add(payload);
        try { window.dispatchEvent(new CustomEvent('product:created', { detail: payload })); } catch {}
        if (onCreated) onCreated(payload);
      } else {
        const payload = {
          id: Date.now().toString(),
          businessId: selectedBusinessId || '',
          name: form.name.trim(),
          categoryName: nameValue,
          categoryGroup: groupValue,
          description: form.description || '',
          price: Number(form.price),
          stock: 9999,
          unit: form.unit || 'hr',
          isService: true,
          imageUrl: form.imageUrl || '',
        };
        if (!(db.services && db.services.add)) throw new Error('Services API not available');
        const res = await db.services.add(payload);
        if (!res) throw new Error('Failed to create service');
        try { window.dispatchEvent(new CustomEvent('service:created', { detail: payload })); } catch {}
        if (onCreated) onCreated(payload);
      }
      onClose();
    } catch (e: any) {
      const msg = (e && e.message) ? String(e.message) : 'Failed to save';
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  const Icon = isProduct ? Package : Wrench;
  const title = isProduct ? 'Create New Product' : 'Create New Service';

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="quick-create-title">
      <div className="bg-white w-full max-w-xl rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        <div className="bg-gradient-to-r from-indigo-600 to-blue-500 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Icon size={20} />
            <h2 id="quick-create-title" className="font-bold">{title}</h2>
          </div>
          <button onClick={onClose} className="text-white/80 hover:text-white" aria-label="Close">
            <X size={20} />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4 max-h-[75vh] overflow-y-auto">
          {error && (
            <div className="text-sm bg-rose-50 border border-rose-200 text-rose-700 rounded p-2">{error}</div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">{isProduct ? 'Product' : 'Service'} Name</label>
            <input
              type="text"
              className="w-full border rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-brand-500 outline-none"
              value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
              placeholder={isProduct ? 'e.g., 500ml Bottled Water' : 'e.g., Conference Room Booking'}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Category Name</label>
              <input
                list="quick-create-name-list"
                type="text"
                className="w-full border rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-brand-500 outline-none"
                value={form.categoryName}
                onChange={e => {
                  const newName = e.target.value;
                  // Auto-fill group when the user picks an existing category name
                  const match = relevantCats.find(c => c.name.toLowerCase() === newName.trim().toLowerCase());
                  setForm(f => ({
                    ...f,
                    categoryName: newName,
                    categoryGroup: match ? match.group : f.categoryGroup,
                  }));
                }}
                placeholder={isProduct ? 'e.g., Toyota Hilux' : 'e.g., Tax Filing'}
              />
              <datalist id="quick-create-name-list">
                {nameSuggestions.map(n => <option key={n} value={n} />)}
              </datalist>
              <p className="text-[11px] text-slate-500 mt-1">
                The specific {isProduct ? 'product' : 'service'} type. Example: <span className="font-semibold">Toyota Hilux</span> is a Category Name; its Group is <span className="font-semibold">Pickup Trucks</span>.
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Category Group</label>
              <input
                list="quick-create-group-list"
                type="text"
                className="w-full border rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-brand-500 outline-none"
                value={form.categoryGroup}
                onChange={e => setForm({ ...form, categoryGroup: e.target.value })}
                placeholder={loadingCats ? 'Loading…' : (isProduct ? 'e.g., Pickup Trucks' : 'e.g., Accounting Services')}
              />
              <datalist id="quick-create-group-list">
                {groupSuggestions.map(g => <option key={g} value={g} />)}
              </datalist>
              <p className="text-[11px] text-slate-500 mt-1">
                The broader family this {isProduct ? 'product' : 'service'} belongs to. Pick from the list or type a new one — it will be saved as a category.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Price</label>
              <input
                type="number"
                min={0}
                className="w-full border rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-brand-500 outline-none"
                value={form.price}
                onChange={e => setForm({ ...form, price: e.target.value === '' ? '' : Number(e.target.value) })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Unit</label>
              <input
                type="text"
                className="w-full border rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-brand-500 outline-none"
                value={form.unit}
                onChange={e => setForm({ ...form, unit: e.target.value })}
                placeholder={isProduct ? 'pcs, kg…' : 'hr, session…'}
              />
            </div>
            {isProduct ? (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Initial Stock</label>
                <input
                  type="number"
                  min={0}
                  className="w-full border rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-brand-500 outline-none"
                  value={form.stock}
                  onChange={e => setForm({ ...form, stock: e.target.value === '' ? '' : Number(e.target.value) })}
                />
              </div>
            ) : (
              <div className="col-span-1" />
            )}
          </div>

          {!isProduct && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Description (optional)</label>
              <textarea
                className="w-full border rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-brand-500 outline-none"
                rows={2}
                value={form.description}
                onChange={e => setForm({ ...form, description: e.target.value })}
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">{isProduct ? 'Product' : 'Service'} Image (optional)</label>
            <div className="flex gap-3 items-center">
              {form.imageUrl && (
                <img src={form.imageUrl} alt="Preview" className="w-14 h-14 rounded object-cover border" />
              )}
              <label className="flex-1 border-2 border-dashed border-slate-300 rounded-lg p-3 flex flex-col items-center justify-center text-slate-500 cursor-pointer hover:bg-slate-50">
                <Upload size={18} className="mb-1" />
                <span className="text-xs">Click to upload image</span>
                <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
              </label>
            </div>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-slate-200 flex items-center justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm font-bold text-slate-600 hover:bg-slate-100">Cancel</button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 rounded-lg text-sm font-bold bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-60 flex items-center gap-2"
          >
            <Save size={16} /> {saving ? 'Saving…' : `Save ${isProduct ? 'Product' : 'Service'}`}
          </button>
        </div>
      </div>
    </div>
  );
};

export default QuickCreateItemModal;
