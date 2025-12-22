import React, { useState, useEffect } from 'react';
import db from '../services/apiClient';
import { CompanySettings, Role } from '../types';
import { Save, Download, Upload, Image as ImageIcon, Plus, Check, AlertCircle } from 'lucide-react';
import { getImageUrl } from '../services/format';

const Settings = () => {
    const emptySettings = { businessId: '', name: '', motto: '', address: '', phone: '', email: '', logoUrl: '', headerImageUrl: '', footerImageUrl: '', vatRate: 0, currency: '$', loginRedirects: {}, landingContent: {}, invoiceNotes: '' } as CompanySettings;
    const [settings, setSettings] = useState<CompanySettings>(emptySettings);
    const [roles, setRoles] = useState<Role[]>([]);
    const [locations, setLocations] = useState<any[]>([]);
    const [activeLandingTab, setActiveLandingTab] = useState<string>('Hero');
    const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
    const [saveMessage, setSaveMessage] = useState('');

    useEffect(() => {
        let mounted = true;
        (async () => {
            try {
                if (db.settings && db.settings.get) {
                    const s = await db.settings.get();
                    if (mounted && s) {
                        // Ensure landingContent exists
                        const merged = { ...emptySettings, ...(s as any) } as any;
                        merged.landingContent = (s as any).landingContent || merged.landingContent || {};
                        setSettings(merged as CompanySettings);
                    }
                }
                if (db.locations && db.locations.getAll) {
                    const locs = await db.locations.getAll();
                    if (mounted) setLocations(locs || []);
                }
                if (db.roles && db.roles.getAll) {
                    const r = await db.roles.getAll();
                    if (mounted) setRoles(r || []);
                }
            } catch (e) {
                console.warn('Failed to load settings', e);
            }
        })();
        return () => { mounted = false; };
    }, []);

    const handleSave = async () => {
        try {
            setSaveStatus('saving');
            setSaveMessage('');
            if (db.settings && db.settings.save) {
                await db.settings.save(settings);
                setSaveStatus('success');
                setSaveMessage('Settings saved successfully!');
                setTimeout(() => setSaveStatus('idle'), 3000);
            }
        } catch (e) {
            console.error('Failed to save settings', e);
            setSaveStatus('error');
            setSaveMessage('Failed to save settings. Please try again.');
            setTimeout(() => setSaveStatus('idle'), 3000);
        }
    };

const handleBackup = async () => {
    try {
        const data = typeof (db as any).backup === 'function' ? await (db as any).backup() : '';
        const blob = new Blob([data], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `omnisales_backup_${new Date().toISOString().split('T')[0]}.json`;
        a.click();
    } catch (e) {
        console.warn('Failed to create backup', e);
    }
};

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, field: 'logoUrl' | 'headerImageUrl' | 'footerImageUrl') => {
      const file = e.target.files?.[0];
      if (!file) return;
      try {
          const fd = new FormData();
          fd.append('file', file);
          const res = await db.upload.file(fd);
          if (res && res.url) {
              setSettings(prev => ({...prev, [field]: res.url}));
          }
      } catch (e) { console.warn('Upload failed', e); }
  };

  const uploadLandingImage = async (file?: File | null) => {
      if (!file) return null;
      try {
          const fd = new FormData();
          fd.append('file', file);
          const res = await db.upload.file(fd);
          return res && res.url ? res.url : null;
      } catch (e) { console.warn('Landing image upload failed', e); return null; }
  };

  // Landing content helpers
  const updateLanding = (patch: any) => {
      setSettings(prev => ({ ...prev, landingContent: { ...(prev.landingContent || {}), ...patch } } as CompanySettings));
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
            <h1 className="text-2xl font-bold text-slate-800">System Settings</h1>
            <p className="text-slate-500">Configure company details, branding, and backup data.</p>
        </div>
        <button 
            onClick={handleBackup}
            className="bg-slate-800 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-slate-900 shadow-sm transition-all"
        >
            <Download className="w-4 h-4" /> 
            Download Backup
        </button>
      </div>

      <div className="bg-white p-8 rounded-xl shadow-sm border border-slate-200">
        <h3 className="text-lg font-bold text-slate-800 mb-6 border-b pb-4">Company Details</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Company Name</label>
                    <input type="text" className="w-full border rounded p-2" value={settings.name} onChange={e => setSettings({...settings, name: e.target.value})} />
                </div>
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Motto / Tagline</label>
                    <input type="text" className="w-full border rounded p-2" value={settings.motto} onChange={e => setSettings({...settings, motto: e.target.value})} />
                </div>
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Address</label>
                    <input type="text" className="w-full border rounded p-2" value={settings.address} onChange={e => setSettings({...settings, address: e.target.value})} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Phone</label>
                        <input type="text" className="w-full border rounded p-2" value={settings.phone} onChange={e => setSettings({...settings, phone: e.target.value})} />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                        <input type="text" className="w-full border rounded p-2" value={settings.email} onChange={e => setSettings({...settings, email: e.target.value})} />
                    </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">VAT Rate (%)</label>
                        <input type="number" className="w-full border rounded p-2" value={settings.vatRate} onChange={e => setSettings({...settings, vatRate: Number(e.target.value)})} />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Currency Symbol</label>
                        <input type="text" className="w-full border rounded p-2" value={settings.currency} onChange={e => setSettings({...settings, currency: e.target.value})} />
                    </div>
                </div>
                <div className="mt-4">
                    <label className="block text-sm font-medium text-slate-700 mb-1">Invoice Notes (will appear on A4 invoices)</label>
                    <textarea className="w-full border rounded p-2" rows={4} value={settings.invoiceNotes || ''} onChange={e => setSettings(prev => ({...prev, invoiceNotes: e.target.value}))} placeholder="e.g. Payment due within 14 days; Thank you for your business" />
                </div>
                <div className="mt-4">
                    <label className="block text-sm font-medium text-slate-700 mb-1">Global Default Location (applies to storefront)</label>
                    <select className="w-full border rounded p-2" value={settings.defaultLocationId || ''} onChange={e => setSettings(prev => ({...prev, defaultLocationId: e.target.value || undefined}))}>
                        <option value="">None (use user default)</option>
                        {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                    </select>
                </div>
            </div>

            <div className="space-y-6">
                 {/* Branding Images */}
                 <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Company Logo (Thermal Receipt)</label>
                    <div className="flex items-center gap-4">
                        <div className="w-16 h-16 border rounded-lg bg-slate-50 flex items-center justify-center overflow-hidden">
                            {settings.logoUrl ? <img src={settings.logoUrl} alt="Logo" className="w-full h-full object-contain" /> : <ImageIcon className="text-slate-300"/>}
                        </div>
                        <label className="cursor-pointer bg-white border border-slate-300 text-slate-700 px-3 py-1.5 rounded text-sm hover:bg-slate-50 flex items-center gap-2">
                            <Upload size={14} /> Upload Logo
                            <input type="file" accept="image/*" className="hidden" onChange={e => handleImageUpload(e, 'logoUrl')} />
                        </label>
                    </div>
                 </div>

                 <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Invoice Header Image (A4)</label>
                    <div className="border-2 border-dashed border-slate-300 rounded-lg p-2 hover:bg-slate-50 transition-colors">
                         {settings.headerImageUrl ? (
                             <div className="relative group">
                                <img src={getImageUrl(settings.headerImageUrl) || settings.headerImageUrl} alt="Header" className="w-full h-24 object-contain bg-white" />
                                <label className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                                    <span className="text-white text-sm font-bold flex items-center gap-2"><Upload size={16}/> Change</span>
                                    <input type="file" accept="image/*" className="hidden" onChange={e => handleImageUpload(e, 'headerImageUrl')} />
                                </label>
                             </div>
                         ) : (
                             <label className="w-full h-24 flex flex-col items-center justify-center text-slate-400 cursor-pointer">
                                <Upload size={24} className="mb-2"/>
                                <span className="text-xs">Upload Header Banner</span>
                                <input type="file" accept="image/*" className="hidden" onChange={e => handleImageUpload(e, 'headerImageUrl')} />
                             </label>
                         )}
                    </div>
                 </div>

                 <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Invoice Footer Image (A4)</label>
                    <div className="border-2 border-dashed border-slate-300 rounded-lg p-2 hover:bg-slate-50 transition-colors">
                         {settings.footerImageUrl ? (
                             <div className="relative group">
                                <img src={getImageUrl(settings.footerImageUrl) || settings.footerImageUrl} alt="Footer" className="w-full h-24 object-contain bg-white" />
                                <label className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                                    <span className="text-white text-sm font-bold flex items-center gap-2"><Upload size={16}/> Change</span>
                                    <input type="file" accept="image/*" className="hidden" onChange={e => handleImageUpload(e, 'footerImageUrl')} />
                                </label>
                             </div>
                         ) : (
                             <label className="w-full h-24 flex flex-col items-center justify-center text-slate-400 cursor-pointer">
                                <Upload size={24} className="mb-2"/>
                                <span className="text-xs">Upload Footer Banner</span>
                                <input type="file" accept="image/*" className="hidden" onChange={e => handleImageUpload(e, 'footerImageUrl')} />
                             </label>
                         )}
                    </div>
                 </div>

            </div>
        </div>
        
        <div className="mt-8 border-t pt-6 flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
                <button onClick={() => { navigator.clipboard?.writeText(JSON.stringify(settings.landingContent || {})); }} className="px-3 py-2 bg-slate-100 rounded">Copy Landing JSON</button>
                {saveStatus === 'success' && (
                    <div className="flex items-center gap-2 text-green-600 bg-green-50 px-3 py-2 rounded">
                        <Check size={16} /> {saveMessage}
                    </div>
                )}
                {saveStatus === 'error' && (
                    <div className="flex items-center gap-2 text-red-600 bg-red-50 px-3 py-2 rounded">
                        <AlertCircle size={16} /> {saveMessage}
                    </div>
                )}
            </div>
            <button 
                onClick={handleSave} 
                disabled={saveStatus === 'saving'}
                className="px-8 bg-brand-600 text-white py-3 rounded-lg font-bold hover:bg-brand-700 disabled:bg-slate-400 flex items-center gap-2 transition-all"
            >
                <Save size={18} /> {saveStatus === 'saving' ? 'Saving...' : 'Save System Settings'}
            </button>
        </div>
        {/* Login Redirects configuration */}
        <div className="mt-6 bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <h3 className="text-lg font-bold text-slate-800 mb-4">Login Redirects</h3>
            <p className="text-sm text-slate-500 mb-4">Set the default landing page for each role after login.</p>
            <div className="space-y-3">
                {(roles || []).map(r => (
                    <div key={r.id} className="flex items-center gap-4">
                        <div className="w-40 text-sm font-medium text-slate-700">{r.name}</div>
                        <select value={settings.loginRedirects?.[r.id] || ''} onChange={e => setSettings(prev => ({...prev, loginRedirects: {...(prev.loginRedirects || {}), [r.id]: e.target.value}}))} className="border rounded p-2">
                            <option value="">Default (Dashboard)</option>
                            <option value="/">Dashboard</option>
                            <option value="/inventory">Inventory</option>
                            <option value="/services">Services</option>
                            <option value="/clients">Clients</option>
                            <option value="/pos">POS</option>
                            <option value="/reports">Reports</option>
                            <option value="/admin">Admin</option>
                        </select>
                    </div>
                ))}
            </div>
        </div>
        {/* Landing Page Configuration - Now Super Admin Only */}
        <div className="mt-6 bg-blue-50 border-l-4 border-blue-600 p-6 rounded">
            <h3 className="text-lg font-bold text-blue-900 mb-2">Landing Page Configuration</h3>
            <p className="text-blue-800 mb-4">Landing page settings have been moved to Super Admin for centralized management.</p>
            <p className="text-sm text-blue-700">Only the Super Admin can modify the public landing page configuration. Contact your Super Admin if you need to make changes.</p>
        </div>
      </div>
    </div>
  );
};

export default Settings;