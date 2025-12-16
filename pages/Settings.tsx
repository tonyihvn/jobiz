import React, { useState, useEffect } from 'react';
import db from '../services/apiClient';
import { CompanySettings, Role } from '../types';
import { Save, Download, Upload, Image as ImageIcon, Plus } from 'lucide-react';

const Settings = () => {
    const emptySettings = { businessId: '', name: '', motto: '', address: '', phone: '', email: '', logoUrl: '', headerImageUrl: '', footerImageUrl: '', vatRate: 0, currency: '$', loginRedirects: {}, landingContent: {} } as CompanySettings;
    const [settings, setSettings] = useState<CompanySettings>(emptySettings);
    const [roles, setRoles] = useState<Role[]>([]);
    const [locations, setLocations] = useState<any[]>([]);
    const [activeLandingTab, setActiveLandingTab] = useState<string>('Hero');

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
            if (db.settings && db.settings.save) await db.settings.save(settings);
            // Force reload to update Sidebar or use Context in real app
            window.location.reload();
        } catch (e) {
            console.warn('Failed to save settings', e);
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
                                <img src={settings.headerImageUrl} alt="Header" className="w-full h-24 object-contain bg-white" />
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
                                <img src={settings.footerImageUrl} alt="Footer" className="w-full h-24 object-contain bg-white" />
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
        
        <div className="mt-8 border-t pt-6 flex items-center justify-between">
            <div>
                <button onClick={() => { navigator.clipboard?.writeText(JSON.stringify(settings.landingContent || {})); }} className="px-3 py-2 bg-slate-100 rounded mr-2">Copy Landing JSON</button>
            </div>
            <div>
                <button onClick={handleSave} className="w-full md:w-auto px-8 bg-brand-600 text-white py-3 rounded-lg font-bold hover:bg-brand-700 flex justify-center items-center gap-2 ml-auto">
                    <Save size={18} /> Save System Settings
                </button>
            </div>
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
                            <option value="/customers">Customers</option>
                            <option value="/pos">POS</option>
                            <option value="/reports">Reports</option>
                            <option value="/admin">Admin</option>
                        </select>
                    </div>
                ))}
            </div>
        </div>
        {/* Landing Page Content Editor */}
        <div className="mt-6 bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <h3 className="text-lg font-bold text-slate-800 mb-4">Landing Page Content</h3>
            <p className="text-sm text-slate-500 mb-4">Edit the landing page sections. Each tab represents a portion of the landing page.</p>

            <div className="mb-4 flex gap-2">
                {['Hero','Features','Testimonials','CTA','Footer'].map(t => (
                    <button key={t} onClick={() => setActiveLandingTab(t)} className={`px-3 py-1 rounded ${activeLandingTab===t ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-700'}`}>
                        {t}
                    </button>
                ))}
            </div>

            <div>
                {activeLandingTab === 'Hero' && (
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Hero Title</label>
                            <input type="text" className="w-full border rounded p-2" value={(settings.landingContent as any)?.hero?.title || ''} onChange={e => updateLanding({ hero: { ...(settings.landingContent as any)?.hero, title: e.target.value } })} />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Hero Subtitle</label>
                            <input type="text" className="w-full border rounded p-2" value={(settings.landingContent as any)?.hero?.subtitle || ''} onChange={e => updateLanding({ hero: { ...(settings.landingContent as any)?.hero, subtitle: e.target.value } })} />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Background Image</label>
                            <div className="flex items-center gap-4">
                                <div className="w-48 h-24 border rounded overflow-hidden bg-slate-50">
                                    {(settings.landingContent as any)?.hero?.backgroundImage ? <img src={(settings.landingContent as any).hero.backgroundImage} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-slate-300">No image</div>}
                                </div>
                                <input type="file" accept="image/*" onChange={async (e) => {
                                    const f = e.target.files?.[0];
                                    const url = f ? await uploadLandingImage(f) : null;
                                    if (url) updateLanding({ hero: { ...(settings.landingContent as any)?.hero, backgroundImage: url } });
                                }} />
                            </div>
                        </div>
                    </div>
                )}

                {activeLandingTab === 'Features' && (
                    <div className="space-y-4">
                        {(((settings.landingContent as any)?.features) || []).map((feat: any, idx: number) => (
                            <div key={idx} className="p-4 border rounded">
                                <div className="flex justify-between items-center mb-2">
                                    <strong>Feature #{idx+1}</strong>
                                    <button className="text-red-600" onClick={() => {
                                        const arr = [...((settings.landingContent as any)?.features || [])]; arr.splice(idx,1); updateLanding({ features: arr });
                                    }}>Remove</button>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    <input placeholder="Title" className="border rounded p-2" value={feat.title || ''} onChange={e => {
                                        const arr = [...((settings.landingContent as any)?.features || [])]; arr[idx] = { ...arr[idx], title: e.target.value }; updateLanding({ features: arr });
                                    }} />
                                    <input placeholder="Description" className="border rounded p-2" value={feat.text || ''} onChange={e => {
                                        const arr = [...((settings.landingContent as any)?.features || [])]; arr[idx] = { ...arr[idx], text: e.target.value }; updateLanding({ features: arr });
                                    }} />
                                </div>
                            </div>
                        ))}
                        <button className="px-3 py-2 bg-slate-100 rounded flex items-center gap-2" onClick={() => {
                            const arr = [...((settings.landingContent as any)?.features || [])]; arr.push({ title: '', text: '' }); updateLanding({ features: arr });
                        }}><Plus size={14}/> Add Feature</button>
                    </div>
                )}

                {activeLandingTab === 'Testimonials' && (
                    <div className="space-y-4">
                        {(((settings.landingContent as any)?.testimonials) || []).map((tst: any, i: number) => (
                            <div key={i} className="p-3 border rounded">
                                <div className="flex justify-between items-center mb-2">
                                    <strong>Testimonial #{i+1}</strong>
                                    <button className="text-red-600" onClick={() => { const arr = [...((settings.landingContent as any)?.testimonials || [])]; arr.splice(i,1); updateLanding({ testimonials: arr }); }}>Remove</button>
                                </div>
                                <input placeholder="Name" className="w-full border rounded p-2 mb-2" value={tst.name || ''} onChange={e => { const arr = [...((settings.landingContent as any)?.testimonials || [])]; arr[i] = { ...arr[i], name: e.target.value }; updateLanding({ testimonials: arr }); }} />
                                <textarea placeholder="Quote" className="w-full border rounded p-2" value={tst.quote || ''} onChange={e => { const arr = [...((settings.landingContent as any)?.testimonials || [])]; arr[i] = { ...arr[i], quote: e.target.value }; updateLanding({ testimonials: arr }); }} />
                            </div>
                        ))}
                        <button className="px-3 py-2 bg-slate-100 rounded flex items-center gap-2" onClick={() => { const arr = [...((settings.landingContent as any)?.testimonials || [])]; arr.push({ name: '', quote: '' }); updateLanding({ testimonials: arr }); }}><Plus size={14}/> Add Testimonial</button>
                    </div>
                )}

                {activeLandingTab === 'CTA' && (
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">CTA Heading</label>
                            <input type="text" className="w-full border rounded p-2" value={(settings.landingContent as any)?.cta?.heading || ''} onChange={e => updateLanding({ cta: { ...(settings.landingContent as any)?.cta, heading: e.target.value } })} />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">CTA Subtext</label>
                            <input type="text" className="w-full border rounded p-2" value={(settings.landingContent as any)?.cta?.subtext || ''} onChange={e => updateLanding({ cta: { ...(settings.landingContent as any)?.cta, subtext: e.target.value } })} />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <input placeholder="Button Text" className="border rounded p-2" value={(settings.landingContent as any)?.cta?.buttonText || ''} onChange={e => updateLanding({ cta: { ...(settings.landingContent as any)?.cta, buttonText: e.target.value } })} />
                            <input placeholder="Button URL" className="border rounded p-2" value={(settings.landingContent as any)?.cta?.buttonUrl || ''} onChange={e => updateLanding({ cta: { ...(settings.landingContent as any)?.cta, buttonUrl: e.target.value } })} />
                        </div>
                    </div>
                )}

                {activeLandingTab === 'Footer' && (
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Footer Text</label>
                            <textarea className="w-full border rounded p-2" value={(settings.landingContent as any)?.footer?.text || ''} onChange={e => updateLanding({ footer: { ...(settings.landingContent as any)?.footer, text: e.target.value } })} />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Footer Image</label>
                            <div className="flex items-center gap-4">
                                <div className="w-48 h-24 border rounded overflow-hidden bg-slate-50">
                                    {(settings.landingContent as any)?.footer?.image ? <img src={(settings.landingContent as any).footer.image} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-slate-300">No image</div>}
                                </div>
                                <input type="file" accept="image/*" onChange={async (e) => {
                                    const f = e.target.files?.[0];
                                    const url = f ? await uploadLandingImage(f) : null;
                                    if (url) updateLanding({ footer: { ...(settings.landingContent as any)?.footer, image: url } });
                                }} />
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;