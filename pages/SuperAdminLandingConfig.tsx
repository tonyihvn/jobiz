import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Save, Plus, Trash2, AlertCircle, Check, Upload, Lock } from 'lucide-react';
import { getToken } from '../services/auth';
import { useBusinessContext } from '../services/BusinessContext';

interface LandingContent {
  hero?: { 
    title: string; 
    subtitle: string; 
    backgroundImage: string;
    backgroundSize?: string;
    backgroundPosition?: string;
    backgroundOpacity?: number;
    backgroundTransparency?: number;
    titleColor?: string;
    titleShadow?: string;
    titleFontSize?: string;
    titleFontStyle?: string;
    titleFontFamily?: string;
    subtitleColor?: string;
    subtitleFontSize?: string;
    subtitleFontFamily?: string;
  };
  features?: Array<{ title: string; desc: string }>;
  plans?: Array<{ name: string; price: number | string; period: string; features: string[]; recommended?: boolean }>;
  testimonials?: Array<{ name: string; quote: string }>;
  cta?: { heading: string; subtext: string; buttonText: string; buttonUrl: string };
  footer?: { text: string; copyrightYear: number };
  navbar?: { companyName: string; whatsappNumber: string; logo?: string };
  background?: { image: string; position: string; repeat: string; size: string; attachment: string; overlay?: boolean; overlayOpacity?: number };
}

const DEFAULT_LANDING_CONTENT: LandingContent = {
  hero: {
    title: "Manage your entire business in one tab.",
    subtitle: "The all-in-one platform for Retail, Art Schools, and Community Memberships. POS, Inventory, Finance, and CRM unified.",
    backgroundImage: "",
    backgroundSize: "cover",
    backgroundPosition: "center",
    backgroundOpacity: 100,
    backgroundTransparency: 0,
    titleColor: "#0f172a",
    titleShadow: "none",
    titleFontSize: "56px",
    titleFontStyle: "bold",
    titleFontFamily: "Arial",
    subtitleColor: "#64748b",
    subtitleFontSize: "18px",
    subtitleFontFamily: "Arial"
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
  const navigate = useNavigate();
  const { selectedBusiness } = useBusinessContext();
  const [settings, setSettings] = useState<{ landingContent: LandingContent }>({ landingContent: DEFAULT_LANDING_CONTENT });
  const [activeLandingTab, setActiveLandingTab] = useState<string>('Hero');
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
  const [saveMessage, setSaveMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);

  useEffect(() => {
    // Check if user is Super Admin
    if (selectedBusiness && selectedBusiness.id !== 'super_admin_org') {
      setAccessDenied(true);
      setLoading(false);
      return;
    }
    fetchSettings();
  }, [selectedBusiness]);

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

  if (accessDenied) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="bg-white p-8 rounded-xl shadow-lg border border-red-200 max-w-md text-center">
          <Lock className="text-red-500 w-12 h-12 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-slate-800 mb-2">Access Denied</h1>
          <p className="text-slate-600 mb-6">Only Super Admin can modify the Landing Page Configuration. Contact your Super Admin for assistance.</p>
          <button
            onClick={() => navigate('/dashboard')}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    );
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
          {['Navbar', 'Hero', 'Carousel', 'Features', 'Plans', 'Testimonials', 'CTA', 'Footer', 'Background'].map(t => (
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
          <div className="space-y-6">
            {/* Hero Text */}
            <div className="border-b pb-4">
              <h3 className="font-semibold text-slate-800 mb-4">Hero Text Content</h3>
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
              <div className="mt-4">
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
            </div>

            {/* Title Styling */}
            <div className="border-b pb-4">
              <h3 className="font-semibold text-slate-800 mb-4">Title Styling</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Title Color</label>
                  <div className="flex gap-2 items-center">
                    <input
                      type="color"
                      className="h-10 w-16 border rounded cursor-pointer"
                      value={(settings.landingContent as any)?.hero?.titleColor || '#0f172a'}
                      onChange={e =>
                        updateLanding({ hero: { ...(settings.landingContent as any)?.hero, titleColor: e.target.value } })
                      }
                    />
                    <input
                      type="text"
                      className="flex-1 border rounded p-2 text-sm"
                      value={(settings.landingContent as any)?.hero?.titleColor || '#0f172a'}
                      onChange={e =>
                        updateLanding({ hero: { ...(settings.landingContent as any)?.hero, titleColor: e.target.value } })
                      }
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Title Font Size</label>
                  <input
                    type="text"
                    className="w-full border rounded p-2"
                    placeholder="e.g., 56px"
                    value={(settings.landingContent as any)?.hero?.titleFontSize || '56px'}
                    onChange={e =>
                      updateLanding({ hero: { ...(settings.landingContent as any)?.hero, titleFontSize: e.target.value } })
                    }
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 mt-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Title Font Style</label>
                  <select
                    className="w-full border rounded p-2"
                    value={(settings.landingContent as any)?.hero?.titleFontStyle || 'bold'}
                    onChange={e =>
                      updateLanding({ hero: { ...(settings.landingContent as any)?.hero, titleFontStyle: e.target.value } })
                    }
                  >
                    <option value="normal">Normal</option>
                    <option value="bold">Bold</option>
                    <option value="italic">Italic</option>
                    <option value="bold italic">Bold Italic</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Title Shadow</label>
                  <select
                    className="w-full border rounded p-2"
                    value={(settings.landingContent as any)?.hero?.titleShadow || 'none'}
                    onChange={e =>
                      updateLanding({ hero: { ...(settings.landingContent as any)?.hero, titleShadow: e.target.value } })
                    }
                  >
                    <option value="none">None</option>
                    <option value="0 2px 4px rgba(0,0,0,0.1)">Light Shadow</option>
                    <option value="0 4px 6px rgba(0,0,0,0.2)">Medium Shadow</option>
                    <option value="0 10px 15px rgba(0,0,0,0.3)">Strong Shadow</option>
                    <option value="2px 2px 0px rgba(0,0,0,0.5)">Bold Shadow</option>
                  </select>
                </div>
              </div>
              <div className="mt-4">
                <label className="block text-sm font-medium text-slate-700 mb-2">Title Font Family</label>
                <select
                  className="w-full border rounded p-2"
                  value={(settings.landingContent as any)?.hero?.titleFontFamily || 'Arial'}
                  onChange={e =>
                    updateLanding({ hero: { ...(settings.landingContent as any)?.hero, titleFontFamily: e.target.value } })
                  }
                >
                  <option value="Arial">Arial</option>
                  <option value="Times New Roman">Times New Roman</option>
                  <option value="Georgia">Georgia</option>
                  <option value="Verdana">Verdana</option>
                  <option value="Courier New">Courier New</option>
                  <option value="Comic Sans MS">Comic Sans MS</option>
                  <option value="Trebuchet MS">Trebuchet MS</option>
                  <option value="Impact">Impact</option>
                  <option value="Palatino">Palatino</option>
                  <option value="Garamond">Garamond</option>
                  <option value="Helvetica">Helvetica</option>
                  <option value="Tahoma">Tahoma</option>
                  <option value="Lucida Console">Lucida Console</option>
                </select>
              </div>
            </div>

            {/* Subtitle Styling */}
            <div className="border-b pb-4">
              <h3 className="font-semibold text-slate-800 mb-4">Subtitle Styling</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Subtitle Color</label>
                  <div className="flex gap-2 items-center">
                    <input
                      type="color"
                      className="h-10 w-16 border rounded cursor-pointer"
                      value={(settings.landingContent as any)?.hero?.subtitleColor || '#64748b'}
                      onChange={e =>
                        updateLanding({ hero: { ...(settings.landingContent as any)?.hero, subtitleColor: e.target.value } })
                      }
                    />
                    <input
                      type="text"
                      className="flex-1 border rounded p-2 text-sm"
                      value={(settings.landingContent as any)?.hero?.subtitleColor || '#64748b'}
                      onChange={e =>
                        updateLanding({ hero: { ...(settings.landingContent as any)?.hero, subtitleColor: e.target.value } })
                      }
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Subtitle Font Size</label>
                  <input
                    type="text"
                    className="w-full border rounded p-2"
                    placeholder="e.g., 18px"
                    value={(settings.landingContent as any)?.hero?.subtitleFontSize || '18px'}
                    onChange={e =>
                      updateLanding({ hero: { ...(settings.landingContent as any)?.hero, subtitleFontSize: e.target.value } })
                    }
                  />
                </div>
              </div>
              <div className="mt-4">
                <label className="block text-sm font-medium text-slate-700 mb-2">Subtitle Font Family</label>
                <select
                  className="w-full border rounded p-2"
                  value={(settings.landingContent as any)?.hero?.subtitleFontFamily || 'Arial'}
                  onChange={e =>
                    updateLanding({ hero: { ...(settings.landingContent as any)?.hero, subtitleFontFamily: e.target.value } })
                  }
                >
                  <option value="Arial">Arial</option>
                  <option value="Times New Roman">Times New Roman</option>
                  <option value="Georgia">Georgia</option>
                  <option value="Verdana">Verdana</option>
                  <option value="Courier New">Courier New</option>
                  <option value="Comic Sans MS">Comic Sans MS</option>
                  <option value="Trebuchet MS">Trebuchet MS</option>
                  <option value="Impact">Impact</option>
                  <option value="Palatino">Palatino</option>
                  <option value="Garamond">Garamond</option>
                  <option value="Helvetica">Helvetica</option>
                  <option value="Tahoma">Tahoma</option>
                  <option value="Lucida Console">Lucida Console</option>
                </select>
              </div>
            </div>

            {/* Hero Background Image */}
            <div className="border-b pb-4">
              <h3 className="font-semibold text-slate-800 mb-4">Hero Background Image</h3>
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
              {(settings.landingContent as any)?.hero?.backgroundImage && (
                <button
                  onClick={() =>
                    updateLanding({
                      hero: { ...(settings.landingContent as any)?.hero, backgroundImage: "" }
                    })
                  }
                  className="mt-3 px-4 py-2 bg-red-500 hover:bg-red-600 text-white text-sm rounded transition-colors"
                >
                  Remove Background
                </button>
              )}
            </div>

            {/* Hero Background Styling */}
            {(settings.landingContent as any)?.hero?.backgroundImage && (
              <div>
                <h3 className="font-semibold text-slate-800 mb-4">Background Image Styling</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Background Size</label>
                    <select
                      className="w-full border rounded p-2"
                      value={(settings.landingContent as any)?.hero?.backgroundSize || 'cover'}
                      onChange={e =>
                        updateLanding({ hero: { ...(settings.landingContent as any)?.hero, backgroundSize: e.target.value } })
                      }
                    >
                      <option value="cover">Cover (Fill)</option>
                      <option value="contain">Contain (Fit)</option>
                      <option value="auto">Auto</option>
                      <option value="100% 100%">Stretch (100% 100%)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Background Position</label>
                    <select
                      className="w-full border rounded p-2"
                      value={(settings.landingContent as any)?.hero?.backgroundPosition || 'center'}
                      onChange={e =>
                        updateLanding({ hero: { ...(settings.landingContent as any)?.hero, backgroundPosition: e.target.value } })
                      }
                    >
                      <option value="center">Center</option>
                      <option value="top">Top</option>
                      <option value="bottom">Bottom</option>
                      <option value="left">Left</option>
                      <option value="right">Right</option>
                      <option value="top left">Top Left</option>
                      <option value="top right">Top Right</option>
                      <option value="bottom left">Bottom Left</option>
                      <option value="bottom right">Bottom Right</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 mt-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Background Opacity</label>
                    <div className="flex items-center gap-4">
                      <input
                        type="range"
                        min="0"
                        max="100"
                        step="5"
                        value={(settings.landingContent as any)?.hero?.backgroundOpacity || 100}
                        onChange={e =>
                          updateLanding({
                            hero: { ...(settings.landingContent as any)?.hero, backgroundOpacity: parseInt(e.target.value) }
                          })
                        }
                        className="flex-1"
                      />
                      <span className="text-sm font-medium text-slate-700 w-12">{(settings.landingContent as any)?.hero?.backgroundOpacity || 100}%</span>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Background Transparency</label>
                    <div className="flex items-center gap-4">
                      <input
                        type="range"
                        min="0"
                        max="100"
                        step="5"
                        value={(settings.landingContent as any)?.hero?.backgroundTransparency || 0}
                        onChange={e =>
                          updateLanding({
                            hero: { ...(settings.landingContent as any)?.hero, backgroundTransparency: parseInt(e.target.value) }
                          })
                        }
                        className="flex-1"
                      />
                      <span className="text-sm font-medium text-slate-700 w-12">{(settings.landingContent as any)?.hero?.backgroundTransparency || 0}%</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Carousel Section */}
        {activeLandingTab === 'Carousel' && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Carousel Slides (upload multiple)</label>
              <div className="border-2 border-dashed border-slate-300 rounded-lg p-4 space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  {(((settings.landingContent as any)?.carousel) || []).map((img: string, idx: number) => (
                    <div key={idx} className="relative group rounded overflow-hidden border">
                      <img src={img} className="w-full h-28 object-cover" alt={`slide-${idx}`} />
                      <button className="absolute top-2 right-2 bg-red-600 text-white p-1 rounded" onClick={() => {
                        const arr = [...((settings.landingContent as any)?.carousel || [])]; arr.splice(idx, 1); updateLanding({ carousel: arr });
                      }}>Remove</button>
                    </div>
                  ))}
                </div>

                <div>
                  <input type="file" id="carousel-upload" accept="image/*" multiple className="hidden" onChange={async e => {
                    const files = Array.from(e.target.files || []);
                    for (const f of files) {
                      const url = await uploadLandingImage(f as File);
                      if (url) {
                        const arr = [...((settings.landingContent as any)?.carousel || [])]; arr.push(url); updateLanding({ carousel: arr });
                      }
                    }
                  }} />
                  <button onClick={() => document.getElementById('carousel-upload')?.click()} className="px-3 py-2 bg-slate-100 rounded">Upload Slides</button>
                </div>
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

        {/* Background Section */}
        {activeLandingTab === 'Background' && (
          <div className="space-y-6">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-blue-900 text-sm">
                📌 Upload and customize the background image for the entire landing page. Configure how the image repeats, positions, and scales.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Background Image</label>
              <div className="border-2 border-dashed border-slate-300 rounded-lg p-6">
                {(settings.landingContent as any)?.background?.image ? (
                  <div className="space-y-4">
                    <div className="relative group">
                      <img
                        src={(settings.landingContent as any).background.image}
                        alt="Background"
                        className="w-full h-40 object-cover rounded"
                      />
                      <label className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer rounded">
                        <span className="text-white text-sm font-bold flex items-center gap-2">
                          <Upload size={16} /> Change Image
                        </span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={async e => {
                            const url = await uploadLandingImage(e.target.files?.[0]);
                            if (url)
                              updateLanding({
                                background: { ...(settings.landingContent as any)?.background, image: url }
                              });
                          }}
                        />
                      </label>
                    </div>
                    <button
                      type="button"
                      onClick={() => updateLanding({ background: { ...(settings.landingContent as any)?.background, image: "" } })}
                      className="text-red-600 text-sm hover:text-red-700 font-medium"
                    >
                      Remove Image
                    </button>
                  </div>
                ) : (
                  <label className="w-full h-40 flex flex-col items-center justify-center text-slate-400 cursor-pointer">
                    <Upload size={32} className="mb-2" />
                    <span className="text-sm font-medium">Click to upload background image</span>
                    <span className="text-xs text-slate-500 mt-1">PNG, JPG, GIF up to 10MB</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={async e => {
                        const url = await uploadLandingImage(e.target.files?.[0]);
                        if (url)
                          updateLanding({
                            background: { ...(settings.landingContent as any)?.background || {}, image: url }
                          });
                      }}
                    />
                  </label>
                )}
              </div>
            </div>

            {(settings.landingContent as any)?.background?.image && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Background Position</label>
                    <select
                      className="w-full border border-slate-300 rounded p-2"
                      value={(settings.landingContent as any)?.background?.position || 'center'}
                      onChange={e =>
                        updateLanding({
                          background: { ...(settings.landingContent as any)?.background, position: e.target.value }
                        })
                      }
                    >
                      <option value="center">Center</option>
                      <option value="top">Top</option>
                      <option value="bottom">Bottom</option>
                      <option value="left">Left</option>
                      <option value="right">Right</option>
                      <option value="top left">Top Left</option>
                      <option value="top right">Top Right</option>
                      <option value="bottom left">Bottom Left</option>
                      <option value="bottom right">Bottom Right</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Background Repeat</label>
                    <select
                      className="w-full border border-slate-300 rounded p-2"
                      value={(settings.landingContent as any)?.background?.repeat || 'no-repeat'}
                      onChange={e =>
                        updateLanding({
                          background: { ...(settings.landingContent as any)?.background, repeat: e.target.value }
                        })
                      }
                    >
                      <option value="no-repeat">No Repeat</option>
                      <option value="repeat">Repeat (Both)</option>
                      <option value="repeat-x">Repeat Horizontally</option>
                      <option value="repeat-y">Repeat Vertically</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Background Size</label>
                    <select
                      className="w-full border border-slate-300 rounded p-2"
                      value={(settings.landingContent as any)?.background?.size || 'cover'}
                      onChange={e =>
                        updateLanding({
                          background: { ...(settings.landingContent as any)?.background, size: e.target.value }
                        })
                      }
                    >
                      <option value="cover">Cover (Fill)</option>
                      <option value="contain">Contain (Fit)</option>
                      <option value="auto">Auto</option>
                      <option value="100% 100%">Stretch (100% 100%)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Background Attachment</label>
                    <select
                      className="w-full border border-slate-300 rounded p-2"
                      value={(settings.landingContent as any)?.background?.attachment || 'scroll'}
                      onChange={e =>
                        updateLanding({
                          background: { ...(settings.landingContent as any)?.background, attachment: e.target.value }
                        })
                      }
                    >
                      <option value="scroll">Scroll (Normal)</option>
                      <option value="fixed">Fixed (Parallax)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={(settings.landingContent as any)?.background?.overlay || false}
                      onChange={e =>
                        updateLanding({
                          background: { ...(settings.landingContent as any)?.background, overlay: e.target.checked }
                        })
                      }
                      className="w-4 h-4"
                    />
                    <span className="text-sm font-medium text-slate-700">Add Dark Overlay (for better text readability)</span>
                  </label>
                </div>

                {(settings.landingContent as any)?.background?.overlay && (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Overlay Opacity</label>
                    <div className="flex items-center gap-4">
                      <input
                        type="range"
                        min="0"
                        max="100"
                        step="5"
                        value={((settings.landingContent as any)?.background?.overlayOpacity || 30)}
                        onChange={e =>
                          updateLanding({
                            background: { ...(settings.landingContent as any)?.background, overlayOpacity: parseInt(e.target.value) }
                          })
                        }
                        className="flex-1"
                      />
                      <span className="text-sm font-medium text-slate-700 w-12">{((settings.landingContent as any)?.background?.overlayOpacity || 30)}%</span>
                    </div>
                  </div>
                )}

                <div className="bg-slate-50 p-4 rounded-lg">
                  <p className="text-sm text-slate-700 font-medium mb-2">Preview:</p>
                  <div
                    className="w-full h-40 rounded border border-slate-200"
                    style={{
                      backgroundImage: `url(${(settings.landingContent as any).background.image})`,
                      backgroundPosition: (settings.landingContent as any).background.position || 'center',
                      backgroundRepeat: (settings.landingContent as any).background.repeat || 'no-repeat',
                      backgroundSize: (settings.landingContent as any).background.size || 'cover',
                      backgroundAttachment: (settings.landingContent as any).background.attachment || 'scroll',
                      position: 'relative'
                    }}
                  >
                    {(settings.landingContent as any)?.background?.overlay && (
                      <div
                        style={{
                          backgroundColor: `rgba(0, 0, 0, ${((settings.landingContent as any)?.background?.overlayOpacity || 30) / 100})`,
                          width: '100%',
                          height: '100%',
                          borderRadius: '0.5rem'
                        }}
                      />
                    )}
                  </div>
                </div>
              </>
            )}
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
