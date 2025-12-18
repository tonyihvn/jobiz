import React, { useState, useEffect } from 'react';
import { Save, Plus, Trash2, AlertCircle, Check, Upload } from 'lucide-react';
import { getToken } from '../services/auth';

interface LandingContent {
  hero?: { title: string; subtitle: string; backgroundImage: string };
  features?: Array<{ title: string; desc: string }>;
  plans?: Array<{ name: string; price: number | string; period: string; features: string[]; recommended?: boolean }>;
  testimonials?: Array<{ name: string; quote: string }>;
  cta?: { heading: string; subtext: string; buttonText: string; buttonUrl: string };
  footer?: { text: string; copyrightYear: number };
  navbar?: { companyName: string; whatsappNumber: string; logo?: string };
}

const DEFAULT_LANDING_CONTENT: LandingContent = {
  hero: {
    title: "Manage your entire business in one tab.",
    subtitle: "The all-in-one platform for Retail, Art Schools, and Community Memberships. POS, Inventory, Finance, and CRM unified.",
    backgroundImage: ""
  },
  features: [
    { title: "Smart POS System", desc: "Thermal & A4 receipts, barcode support, and instant stock updates." },
    { title: "Membership Mgmt", desc: "Handle community subscriptions and recurring payments effortlessly." },
    { title: "Finance & HR", desc: "Track revenue, expenses, and manage employee payroll in one place." },
    { title: "Role-Based Access", desc: "Granular permissions for Admins, Managers, and Cashiers." }
  ],
  plans: [
    { name: "Starter", price: 29, period: "/mo", features: ["1 User Admin", "Basic POS", "Inventory Mgmt", "100 Products", "Email Support"] },
    { name: "Professional", price: 79, period: "/mo", features: ["5 Users", "Advanced POS & Returns", "Finance Module", "Unlimited Products", "Priority Support", "Membership System"], recommended: true },
    { name: "Enterprise", price: "Custom", period: "", features: ["Unlimited Users", "Multi-Branch Support", "Dedicated Manager", "API Access", "White Labeling"] }
  ],
  testimonials: [
    { name: "John Doe", quote: "OmniSales transformed our retail operations completely!" },
    { name: "Jane Smith", quote: "The best investment we made for our business." }
  ],
  cta: {
    heading: "Ready to modernize your business?",
    subtext: "Join hundreds of businesses already using OmniSales.",
    buttonText: "Get Started",
    buttonUrl: "/register"
  },
  footer: {
    text: "The all-in-one platform for managing your entire business.",
    copyrightYear: new Date().getFullYear()
  },
  navbar: {
    companyName: "OmniSales",
    whatsappNumber: "2347076973091",
    logo: ""
  }
};

const SuperAdminLandingConfig = () => {
  const [settings, setSettings] = useState<{ landingContent: LandingContent }>({ landingContent: DEFAULT_LANDING_CONTENT });
  const [activeLandingTab, setActiveLandingTab] = useState<string>('Hero');
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
  const [saveMessage, setSaveMessage] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await fetch('/api/super-admin/settings', {
        headers: { 'Authorization': `Bearer ${getToken()}` }
      });
      if (response.ok) {
        const data = await response.json();
        // Handle both camelCase and snake_case from backend
        const landingContent = data.landingContent || data.landing_content;
        if (landingContent && Object.keys(landingContent).length > 0) {
          setSettings({ landingContent });
        } else {
          setSettings({ landingContent: DEFAULT_LANDING_CONTENT });
        }
      } else {
        setSettings({ landingContent: DEFAULT_LANDING_CONTENT });
      }
    } catch (error) {
      console.error('Failed to fetch settings:', error);
      setSettings({ landingContent: DEFAULT_LANDING_CONTENT });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaveStatus('saving');
      setSaveMessage('');
      const response = await fetch('/api/super-admin/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getToken()}`
        },
        body: JSON.stringify(settings)
      });
      if (response.ok) {
        setSaveStatus('success');
        setSaveMessage('Landing page configuration saved successfully!');
        setTimeout(() => setSaveStatus('idle'), 3000);
      } else {
        throw new Error('Failed to save');
      }
    } catch (e) {
      setSaveStatus('error');
      setSaveMessage('Failed to save settings. Please try again.');
      setTimeout(() => setSaveStatus('idle'), 3000);
    }
  };

  const updateLanding = (patch: any) => {
    setSettings(prev => ({
      ...prev,
      landingContent: { ...(prev.landingContent || {}), ...patch }
    }));
  };

  const uploadLandingImage = async (file?: File | null) => {
    if (!file) return null;
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${getToken()}` },
        body: fd
      });
      const data = await res.json();
      return data && data.url ? data.url : null;
    } catch (e) {
      console.warn('Landing image upload failed', e);
      return null;
    }
  };

  if (loading) {
    return <div className="p-8 text-center">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">Landing Page Configuration</h1>
          <p className="text-slate-600 mt-1">Customize the public landing page that appears to unregistered users</p>
        </div>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <div className="mb-4 flex gap-2 flex-wrap">
          {['Navbar', 'Hero', 'Features', 'Plans', 'Testimonials', 'CTA', 'Footer'].map(t => (
            <button
              key={t}
              onClick={() => setActiveLandingTab(t)}
              className={`px-3 py-1 rounded transition-all text-sm ${
                activeLandingTab === t
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {/* Navbar Section */}
        {activeLandingTab === 'Navbar' && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Company Logo</label>
              <div className="flex gap-4 items-start">
                <div className="flex-1">
                  <input
                    type="file"
                    id="logo-upload"
                    className="hidden"
                    accept="image/*"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const formData = new FormData();
                      formData.append('file', file);
                      try {
                        const response = await fetch('/api/upload', {
                          method: 'POST',
                          headers: { 'Authorization': `Bearer ${getToken()}` },
                          body: formData
                        });
                        if (response.ok) {
                          const data = await response.json();
                          updateLanding({ navbar: { ...(settings.landingContent as any)?.navbar, logo: data.fileUrl } });
                        }
                      } catch (err) {
                        console.error('Logo upload failed:', err);
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => document.getElementById('logo-upload')?.click()}
                    className="w-full bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 flex items-center justify-center gap-2"
                  >
                    <Upload size={16} /> Choose Logo
                  </button>
                </div>
                {(settings.landingContent as any)?.navbar?.logo && (
                  <div className="flex flex-col items-center gap-2">
                    <img src={(settings.landingContent as any)?.navbar?.logo} alt="Logo" className="h-16 object-contain" />
                    <button
                      type="button"
                      onClick={() => updateLanding({ navbar: { ...(settings.landingContent as any)?.navbar, logo: "" } })}
                      className="text-red-500 text-sm hover:text-red-700"
                    >
                      Remove
                    </button>
                  </div>
                )}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Company Name</label>
              <input
                type="text"
                className="w-full border rounded p-2"
                value={(settings.landingContent as any)?.navbar?.companyName || ''}
                onChange={e =>
                  updateLanding({ navbar: { ...(settings.landingContent as any)?.navbar, companyName: e.target.value } })
                }
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">WhatsApp Number (for chat button)</label>
              <input
                type="text"
                className="w-full border rounded p-2"
                placeholder="e.g., 2347076973091"
                value={(settings.landingContent as any)?.navbar?.whatsappNumber || ''}
                onChange={e =>
                  updateLanding({ navbar: { ...(settings.landingContent as any)?.navbar, whatsappNumber: e.target.value } })
                }
              />
            </div>
          </div>
        )}

        {/* Hero Section */}
        {activeLandingTab === 'Hero' && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Hero Title</label>
              <input
                type="text"
                className="w-full border rounded p-2"
                value={(settings.landingContent as any)?.hero?.title || ''}
                onChange={e =>
                  updateLanding({ hero: { ...(settings.landingContent as any)?.hero, title: e.target.value } })
                }
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Hero Subtitle</label>
              <textarea
                className="w-full border rounded p-2"
                rows={3}
                value={(settings.landingContent as any)?.hero?.subtitle || ''}
                onChange={e =>
                  updateLanding({ hero: { ...(settings.landingContent as any)?.hero, subtitle: e.target.value } })
                }
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Hero Background Image</label>
              <div className="border-2 border-dashed border-slate-300 rounded-lg p-4">
                {(settings.landingContent as any)?.hero?.backgroundImage ? (
                  <div className="relative group">
                    <img
                      src={(settings.landingContent as any).hero.backgroundImage}
                      alt="Hero"
                      className="w-full h-40 object-cover rounded"
                    />
                    <label className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer rounded">
                      <span className="text-white text-sm font-bold flex items-center gap-2">
                        <Upload size={16} /> Change
                      </span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={async e => {
                          const url = await uploadLandingImage(e.target.files?.[0]);
                          if (url)
                            updateLanding({
                              hero: { ...(settings.landingContent as any)?.hero, backgroundImage: url }
                            });
                        }}
                      />
                    </label>
                  </div>
                ) : (
                  <label className="w-full h-40 flex flex-col items-center justify-center text-slate-400 cursor-pointer">
                    <Upload size={24} className="mb-2" />
                    <span className="text-xs">Upload Background Image</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={async e => {
                        const url = await uploadLandingImage(e.target.files?.[0]);
                        if (url)
                          updateLanding({
                            hero: { ...(settings.landingContent as any)?.hero, backgroundImage: url }
                          });
                      }}
                    />
                  </label>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Features Section */}
        {activeLandingTab === 'Features' && (
          <div className="space-y-4">
            {(((settings.landingContent as any)?.features) || []).map((feat: any, idx: number) => (
              <div key={idx} className="border rounded p-4 space-y-2">
                <div className="flex justify-between items-start">
                  <h4 className="font-medium">Feature {idx + 1}</h4>
                  <button
                    className="text-red-600 hover:text-red-700"
                    onClick={() => {
                      const arr = [...((settings.landingContent as any)?.features || [])];
                      arr.splice(idx, 1);
                      updateLanding({ features: arr });
                    }}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
                <input
                  placeholder="Title"
                  className="w-full border rounded p-2"
                  value={feat.title || ''}
                  onChange={e => {
                    const arr = [...((settings.landingContent as any)?.features || [])];
                    arr[idx] = { ...arr[idx], title: e.target.value };
                    updateLanding({ features: arr });
                  }}
                />
                <textarea
                  placeholder="Description"
                  className="w-full border rounded p-2"
                  rows={2}
                  value={feat.desc || ''}
                  onChange={e => {
                    const arr = [...((settings.landingContent as any)?.features || [])];
                    arr[idx] = { ...arr[idx], desc: e.target.value };
                    updateLanding({ features: arr });
                  }}
                />
              </div>
            ))}
            <button
              className="px-3 py-2 bg-slate-100 rounded flex items-center gap-2 hover:bg-slate-200"
              onClick={() => {
                const arr = [...((settings.landingContent as any)?.features || [])];
                arr.push({ title: '', desc: '' });
                updateLanding({ features: arr });
              }}
            >
              <Plus size={14} /> Add Feature
            </button>
          </div>
        )}

        {/* Plans/Pricing Section */}
        {activeLandingTab === 'Plans' && (
          <div className="space-y-4">
            {(((settings.landingContent as any)?.plans) || []).map((plan: any, idx: number) => (
              <div key={idx} className="border rounded p-4 space-y-2">
                <div className="flex justify-between items-start mb-2">
                  <h4 className="font-medium">Plan {idx + 1}</h4>
                  <button
                    className="text-red-600 hover:text-red-700"
                    onClick={() => {
                      const arr = [...((settings.landingContent as any)?.plans || [])];
                      arr.splice(idx, 1);
                      updateLanding({ plans: arr });
                    }}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
                <input
                  placeholder="Plan Name"
                  className="w-full border rounded p-2"
                  value={plan.name || ''}
                  onChange={e => {
                    const arr = [...((settings.landingContent as any)?.plans || [])];
                    arr[idx] = { ...arr[idx], name: e.target.value };
                    updateLanding({ plans: arr });
                  }}
                />
                <div className="grid grid-cols-2 gap-2">
                  <input
                    placeholder="Price (number or 'Custom')"
                    className="border rounded p-2"
                    value={plan.price || ''}
                    onChange={e => {
                      const arr = [...((settings.landingContent as any)?.plans || [])];
                      arr[idx] = { ...arr[idx], price: isNaN(Number(e.target.value)) ? e.target.value : Number(e.target.value) };
                      updateLanding({ plans: arr });
                    }}
                  />
                  <input
                    placeholder="Period (e.g., /mo)"
                    className="border rounded p-2"
                    value={plan.period || ''}
                    onChange={e => {
                      const arr = [...((settings.landingContent as any)?.plans || [])];
                      arr[idx] = { ...arr[idx], period: e.target.value };
                      updateLanding({ plans: arr });
                    }}
                  />
                </div>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={plan.recommended || false}
                    onChange={e => {
                      const arr = [...((settings.landingContent as any)?.plans || [])];
                      arr[idx] = { ...arr[idx], recommended: e.target.checked };
                      updateLanding({ plans: arr });
                    }}
                  />
                  <span className="text-sm">Mark as recommended/popular</span>
                </label>
                <div>
                  <label className="text-sm font-medium text-slate-600 mb-1 block">Features (one per line)</label>
                  <textarea
                    className="w-full border rounded p-2"
                    rows={4}
                    value={(plan.features || []).join('\n')}
                    onChange={e => {
                      const arr = [...((settings.landingContent as any)?.plans || [])];
                      arr[idx] = { ...arr[idx], features: e.target.value.split('\n').filter(f => f.trim()) };
                      updateLanding({ plans: arr });
                    }}
                  />
                </div>
              </div>
            ))}
            <button
              className="px-3 py-2 bg-slate-100 rounded flex items-center gap-2 hover:bg-slate-200"
              onClick={() => {
                const arr = [...((settings.landingContent as any)?.plans || [])];
                arr.push({ name: '', price: 0, period: '/mo', features: [] });
                updateLanding({ plans: arr });
              }}
            >
              <Plus size={14} /> Add Plan
            </button>
          </div>
        )}

        {/* Testimonials Section */}
        {activeLandingTab === 'Testimonials' && (
          <div className="space-y-4">
            {(((settings.landingContent as any)?.testimonials) || []).map((tst: any, i: number) => (
              <div key={i} className="border rounded p-4 space-y-2">
                <div className="flex justify-between items-start">
                  <h4 className="font-medium">Testimonial {i + 1}</h4>
                  <button
                    className="text-red-600 hover:text-red-700"
                    onClick={() => {
                      const arr = [...((settings.landingContent as any)?.testimonials || [])];
                      arr.splice(i, 1);
                      updateLanding({ testimonials: arr });
                    }}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
                <input
                  placeholder="Name"
                  className="w-full border rounded p-2 mb-2"
                  value={tst.name || ''}
                  onChange={e => {
                    const arr = [...((settings.landingContent as any)?.testimonials || [])];
                    arr[i] = { ...arr[i], name: e.target.value };
                    updateLanding({ testimonials: arr });
                  }}
                />
                <textarea
                  placeholder="Quote"
                  className="w-full border rounded p-2"
                  rows={3}
                  value={tst.quote || ''}
                  onChange={e => {
                    const arr = [...((settings.landingContent as any)?.testimonials || [])];
                    arr[i] = { ...arr[i], quote: e.target.value };
                    updateLanding({ testimonials: arr });
                  }}
                />
              </div>
            ))}
            <button
              className="px-3 py-2 bg-slate-100 rounded flex items-center gap-2 hover:bg-slate-200"
              onClick={() => {
                const arr = [...((settings.landingContent as any)?.testimonials || [])];
                arr.push({ name: '', quote: '' });
                updateLanding({ testimonials: arr });
              }}
            >
              <Plus size={14} /> Add Testimonial
            </button>
          </div>
        )}

        {/* CTA Section */}
        {activeLandingTab === 'CTA' && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">CTA Heading</label>
              <input
                type="text"
                className="w-full border rounded p-2"
                value={(settings.landingContent as any)?.cta?.heading || ''}
                onChange={e =>
                  updateLanding({ cta: { ...(settings.landingContent as any)?.cta, heading: e.target.value } })
                }
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">CTA Subtext</label>
              <textarea
                className="w-full border rounded p-2"
                rows={2}
                value={(settings.landingContent as any)?.cta?.subtext || ''}
                onChange={e =>
                  updateLanding({ cta: { ...(settings.landingContent as any)?.cta, subtext: e.target.value } })
                }
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Button Text</label>
              <input
                placeholder="Button Text"
                className="border rounded p-2 w-full"
                value={(settings.landingContent as any)?.cta?.buttonText || ''}
                onChange={e =>
                  updateLanding({ cta: { ...(settings.landingContent as any)?.cta, buttonText: e.target.value } })
                }
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Button URL</label>
              <input
                placeholder="Button URL"
                className="border rounded p-2 w-full"
                value={(settings.landingContent as any)?.cta?.buttonUrl || ''}
                onChange={e =>
                  updateLanding({ cta: { ...(settings.landingContent as any)?.cta, buttonUrl: e.target.value } })
                }
              />
            </div>
          </div>
        )}

        {/* Footer Section */}
        {activeLandingTab === 'Footer' && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Footer Text</label>
              <textarea
                className="w-full border rounded p-2"
                rows={4}
                value={(settings.landingContent as any)?.footer?.text || ''}
                onChange={e =>
                  updateLanding({ footer: { ...(settings.landingContent as any)?.footer, text: e.target.value } })
                }
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Copyright Year</label>
              <input
                type="number"
                className="w-full border rounded p-2"
                value={(settings.landingContent as any)?.footer?.copyrightYear || new Date().getFullYear()}
                onChange={e =>
                  updateLanding({
                    footer: { ...(settings.landingContent as any)?.footer, copyrightYear: parseInt(e.target.value) }
                  })
                }
              />
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between gap-4">
        <div>
          {saveStatus === 'success' && (
            <div className="flex items-center gap-2 text-green-600 bg-green-50 px-4 py-2 rounded">
              <Check size={16} /> {saveMessage}
            </div>
          )}
          {saveStatus === 'error' && (
            <div className="flex items-center gap-2 text-red-600 bg-red-50 px-4 py-2 rounded">
              <AlertCircle size={16} /> {saveMessage}
            </div>
          )}
        </div>
        <button
          onClick={handleSave}
          disabled={saveStatus === 'saving'}
          className="px-8 bg-blue-600 text-white py-3 rounded-lg font-bold hover:bg-blue-700 disabled:bg-slate-400 flex items-center gap-2 transition-all"
        >
          <Save size={18} /> {saveStatus === 'saving' ? 'Saving...' : 'Save Configuration'}
        </button>
      </div>
    </div>
  );
};

export default SuperAdminLandingConfig;
