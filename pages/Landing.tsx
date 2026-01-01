import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShoppingBag, Users, TrendingUp, Shield, Smartphone, Globe, CheckCircle, ArrowRight, Menu, X, Phone } from 'lucide-react';
import { useCurrency } from '../services/CurrencyContext';

interface LandingSettings {
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

const DEFAULT_SETTINGS: LandingSettings = {
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
    { name: "John Doe", quote: "JOBIZ transformed our retail operations completely!" },
    { name: "Jane Smith", quote: "The best investment we made for our business." }
  ],
  cta: {
    heading: "Ready to modernize your business?",
    subtext: "Join hundreds of businesses already using JOBIZ.",
    buttonText: "Get Started",
    buttonUrl: "/register"
  },
  footer: {
    text: "The all-in-one platform for managing your entire business.",
    copyrightYear: new Date().getFullYear()
  },
  navbar: {
    companyName: "JOBIZ",
    whatsappNumber: "2347076973091",
    logo: ""
  }
};

const Landing = () => {
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = React.useState(false);
  const [settings, setSettings] = React.useState<LandingSettings>(DEFAULT_SETTINGS);
  const [carouselIndex, setCarouselIndex] = React.useState(0);
  const [formData, setFormData] = React.useState({
    companyName: '',
    fullName: '',
    email: '',
    phone: '',
    message: ''
  });
  const [submitting, setSubmitting] = React.useState(false);
  const [submitStatus, setSubmitStatus] = React.useState<'idle' | 'success' | 'error'>('idle');
  const { symbol } = useCurrency();

  useEffect(() => {
    fetchLandingSettings();
  }, []);

  // Autoplay carousel
  useEffect(() => {
    if ((settings.carousel || []).length > 0) {
      const interval = setInterval(() => {
        setCarouselIndex(prev => (prev + 1) % (settings.carousel || []).length);
      }, 5000); // Change slide every 5 seconds
      return () => clearInterval(interval);
    }
  }, [settings.carousel]);

  // Handle smooth scroll to sections
  const handleAnchorClick = (e: React.MouseEvent<HTMLAnchorElement>, sectionId: string) => {
    e.preventDefault();
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const fetchLandingSettings = async () => {
    try {
      const response = await fetch('/api/landing/settings');
      if (response.ok) {
        const data = await response.json();
        const landingContent = data.landing_content || data.landingContent;
        if (landingContent && Object.keys(landingContent).length > 0) {
          setSettings(landingContent);
        }
      }
    } catch (error) {
      console.error('Failed to fetch landing settings:', error);
    }
  };

  const handleFeedbackSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const response = await fetch('/api/feedbacks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.fullName,
          email: formData.email,
          phone: formData.phone,
          companyName: formData.companyName,
          message: formData.message
        })
      });
      if (response.ok) {
        setSubmitStatus('success');
        setFormData({ companyName: '', fullName: '', email: '', phone: '', message: '' });
        setTimeout(() => setSubmitStatus('idle'), 3000);
      } else {
        setSubmitStatus('error');
      }
    } catch (error) {
      console.error('Failed to submit feedback:', error);
      setSubmitStatus('error');
    } finally {
      setSubmitting(false);
    }
  };
// remove the opacity and transparency from the plancards including the most popular badge and section

  const PlanCard: React.FC<{plan: any}> = ({ plan }) => (
    <div className={`rounded-2xl p-8 border ${plan.recommended ? 'border-brand-500 shadow-2xl bg-slate-50 relative' : 'border-slate-200 bg-slate-50'}`}>
      {plan.recommended && <span className="absolute -top-4 left-1/2 -translate-x-1/2 bg-brand-600 text-white px-4 py-1 rounded-full text-xs font-bold uppercase tracking-wide">Most Popular</span>}
      <h3 className="font-bold text-xl text-slate-900">{plan.name}</h3>
      <div className="my-6">
        <span className="text-4xl font-extrabold">{typeof plan.price === 'number' ? `${symbol}${plan.price}` : plan.price}</span>
        <span className="text-slate-500">{plan.period}</span>
      </div>
      <ul className="space-y-4 mb-8">
        {(plan.features || []).map((feat: string, j: number) => (
          <li key={j} className="flex items-center gap-3 text-sm text-slate-600">
            <CheckCircle size={16} className="text-brand-600 shrink-0"/> {feat}
          </li>
        ))}
      </ul>
      <button className={`w-full py-3 rounded-xl font-bold transition-all ${plan.recommended ? 'bg-brand-600 text-white hover:bg-brand-700' : 'bg-white border border-slate-200 hover:bg-slate-50'}`}>
        Choose {plan.name}
      </button>
    </div>
  );

  return (
    <div
      className="min-h-screen bg-white font-sans text-slate-900"
      style={
        settings.background && settings.background.image
          ? {
              backgroundImage: `url(${settings.background.image})`,
              backgroundPosition: settings.background.position || 'center',
              backgroundRepeat: settings.background.repeat || 'no-repeat',
              backgroundSize: settings.background.size || 'cover',
              backgroundAttachment: settings.background.attachment || 'scroll'
            }
          : {}
      }
    >
      {/* Background Overlay */}
      {settings.background?.overlay && settings.background?.image && (
        <div
          className="fixed inset-0 pointer-events-none"
          style={{
            backgroundColor: `rgba(0, 0, 0, ${(settings.background?.overlayOpacity || 30) / 100})`,
            zIndex: 10
          }}
        />
      )}
      
      <div className="relative z-20">
      {/* Navbar */}
      <nav className="fixed w-full bg-white/90 backdrop-blur-md z-50 border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center gap-2">
              {settings.navbar?.logo ? (
                <img src={settings.navbar.logo} alt="Logo" className="h-10 object-contain" />
              ) : (
                <div className="bg-brand-600 text-white p-1.5 rounded-lg">
                  <Globe size={24} />
                </div>
              )}
              <span className="font-bold text-xl tracking-tight text-slate-900">{settings.navbar?.companyName || 'JOBIZ'}</span>
            </div>
            
            <div className="hidden md:flex items-center gap-8">
              <a href="#features" onClick={(e) => handleAnchorClick(e, 'features')} className="text-sm font-medium text-slate-600 hover:text-brand-600">Features</a>
              <a href="#pricing" onClick={(e) => handleAnchorClick(e, 'pricing')} className="text-sm font-medium text-slate-600 hover:text-brand-600">Pricing</a>
              <a href="#contact" onClick={(e) => handleAnchorClick(e, 'contact')} className="text-sm font-medium text-slate-600 hover:text-brand-600">Contact</a>
              <button onClick={() => navigate('/login')} className="text-sm font-bold text-slate-900 hover:text-brand-600">Sign In</button>
              <button onClick={() => navigate('/register')} className="bg-brand-600 text-white px-5 py-2.5 rounded-full font-bold text-sm hover:bg-brand-700 transition-all shadow-lg shadow-brand-500/30">
                Get Started
              </button>
            </div>

            <button className="md:hidden" onClick={() => setIsMenuOpen(!isMenuOpen)}>
                {isMenuOpen ? <X /> : <Menu />}
            </button>
          </div>
        </div>
        
        {/* Mobile Menu */}
        {isMenuOpen && (
             <div className="md:hidden bg-white border-t p-4 flex flex-col gap-4 shadow-xl">
                <a href="#features" onClick={(e) => { handleAnchorClick(e, 'features'); setIsMenuOpen(false); }} className="text-slate-600 font-medium">Features</a>
                <a href="#pricing" onClick={(e) => { handleAnchorClick(e, 'pricing'); setIsMenuOpen(false); }} className="text-slate-600 font-medium">Pricing</a>
                <a href="#contact" onClick={(e) => { handleAnchorClick(e, 'contact'); setIsMenuOpen(false); }} className="text-slate-600 font-medium">Contact</a>
                <button onClick={() => navigate('/login')} className="text-left font-bold text-brand-600">Sign In</button>
                <button onClick={() => navigate('/register')} className="bg-brand-600 text-white py-2 rounded font-bold">Register Now</button>
             </div>
        )}
      </nav>

      {/* Hero */}
      <section
        className="pt-32 pb-20 lg:pt-48 lg:pb-32 overflow-hidden relative"
        style={settings.hero && settings.hero.backgroundImage ? {
          backgroundImage: `url(${settings.hero.backgroundImage})`,
          backgroundSize: settings.hero.backgroundSize || 'cover',
          backgroundPosition: settings.hero.backgroundPosition || 'center',
          opacity: ((settings.hero.backgroundOpacity || 100) / 100) * (1 - ((settings.hero.backgroundTransparency || 0) / 100))
        } : {}}
      >
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-brand-50 rounded-full blur-3xl opacity-50 -z-10" />
        <div className="max-w-7xl mx-auto px-4 text-center">
          <h1
            className="text-5xl lg:text-7xl font-extrabold tracking-tight mb-6"
            style={{
              color: settings.hero?.titleColor || '#0f172a',
              fontSize: settings.hero?.titleFontSize || '56px',
              fontWeight: settings.hero?.titleFontStyle?.includes('bold') ? 'bold' : 'normal',
              fontStyle: settings.hero?.titleFontStyle?.includes('italic') ? 'italic' : 'normal',
              textShadow: settings.hero?.titleShadow === 'none' ? 'none' : settings.hero?.titleShadow || 'none',
              fontFamily: settings.hero?.titleFontFamily || 'Arial'
            }}
          >
            {settings.hero?.title || DEFAULT_SETTINGS.hero?.title}
          </h1>
          <p
            className="mb-10 max-w-2xl mx-auto leading-relaxed"
            style={{
              color: settings.hero?.subtitleColor || '#64748b',
              fontSize: settings.hero?.subtitleFontSize || '18px',
              fontFamily: settings.hero?.subtitleFontFamily || 'Arial'
            }}
          >
            {settings.hero?.subtitle || DEFAULT_SETTINGS.hero?.subtitle}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button onClick={() => navigate('/register')} className="px-8 py-4 bg-brand-600 text-white rounded-full font-bold text-lg hover:bg-brand-700 transition-all shadow-xl shadow-brand-500/20 flex items-center justify-center gap-2">
              Start Free Trial <ArrowRight size={20}/>
            </button>
            {/* <button onClick={() => navigate('/login')} className="px-8 py-4 bg-white text-slate-700 border border-slate-200 rounded-full font-bold text-lg hover:bg-slate-50 transition-all">
              Live Demo
            </button> */}
          </div>
          
          <div className="mt-16 rounded-2xl border border-slate-200 shadow-2xl overflow-hidden mx-auto max-w-5xl bg-white">
               <div className="h-10 bg-slate-100 border-b border-slate-200 flex items-center gap-2 px-4">
                   <div className="w-3 h-3 rounded-full bg-red-400"></div>
                   <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
                   <div className="w-3 h-3 rounded-full bg-green-400"></div>
               </div>
               {/* Dashboard preview carousel or placeholder */}
               <div className="bg-slate-50 p-4 flex items-center justify-center h-[400px] text-slate-300 font-bold text-2xl relative">
                   {Array.isArray(settings.carousel) && (settings.carousel || []).length > 0 ? (
                     <div className="w-full h-full relative">
                       <img src={(settings.carousel || [])[carouselIndex]} alt="slide" className="w-full h-full object-cover" />
                       <button onClick={() => setCarouselIndex(i => (i - 1 + (settings.carousel || []).length) % (settings.carousel || []).length)} className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/80 rounded-full p-2">‹</button>
                       <button onClick={() => setCarouselIndex(i => (i + 1) % (settings.carousel || []).length)} className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/80 rounded-full p-2">›</button>
                     </div>
                   ) : (
                     <div className="bg-slate-50 p-8 flex items-center justify-center h-[400px] text-slate-300 font-bold text-2xl">
                         Dashboard Interface Preview
                     </div>
                   )}
               </div>
          </div>
        </div>
      </section>

      {/* Features Carousel/Grid */}
      <section id="features" className="py-20 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4">
            <div className="text-center mb-16">
                <h2 className="text-3xl font-bold text-slate-900">Everything you need to grow</h2>
                <p className="text-slate-500 mt-2">Replace 5 different tools with {settings.navbar?.companyName || 'JOBIZ'}.</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                {(settings.features || DEFAULT_SETTINGS.features || []).map((f: any, i: number) => (
                    <div key={i} className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 hover:-translate-y-1 transition-transform">
                        <div className="w-12 h-12 bg-brand-50 text-brand-600 rounded-xl flex items-center justify-center mb-6">
                            <ShoppingBag size={24} />
                        </div>
                        <h3 className="font-bold text-xl mb-3">{f.title}</h3>
                        <p className="text-slate-500 leading-relaxed">{f.desc}</p>
                    </div>
                ))}
            </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-20">
        <div className="max-w-7xl mx-auto px-4">
            <div className="text-center mb-16">
                <h2 className="text-3xl font-bold text-slate-900">Simple, transparent pricing</h2>
                <p className="text-slate-500 mt-2">No hidden fees. Cancel anytime.</p>
            </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
                {(settings.plans || DEFAULT_SETTINGS.plans || []).map((plan: any, i: number) => (
                  <PlanCard key={i} plan={plan} />
                ))}
            </div>
        </div>
      </section>

      {/* Testimonials */}
      {(settings.testimonials || []).length > 0 && (
        <section className="py-20 bg-slate-50">
          <div className="max-w-7xl mx-auto px-4">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-bold text-slate-900">What our users say</h2>
              <p className="text-slate-500 mt-2">Trusted by businesses worldwide</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
              {(settings.testimonials || []).map((t: any, i: number) => (
                <div key={i} className="bg-white p-8 rounded-2xl border border-slate-200">
                  <p className="text-slate-600 mb-4">"{t.quote}"</p>
                  <p className="font-bold text-slate-900">{t.name}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Enquiry Form */}
      <section id="contact" className="py-20 bg-slate-900 text-white">
          <div className="max-w-4xl mx-auto px-4 text-center">
              <h2 className="text-3xl font-bold mb-8">{settings.cta?.heading || DEFAULT_SETTINGS.cta?.heading}</h2>
              {settings.navbar?.whatsappNumber && (
                <div className="mb-8 flex items-center justify-center gap-2">
                  <Phone size={20} className="text-brand-400" />
                  <a
                    href={`tel:${settings.navbar.whatsappNumber}`}
                    className="text-lg font-bold text-brand-300 hover:text-brand-200 transition-colors"
                  >
                    {settings.navbar.whatsappNumber}
                  </a>
                </div>
              )}
              <div className="bg-white/10 backdrop-blur-lg p-8 rounded-2xl border border-white/10 text-left">
                  <form onSubmit={handleFeedbackSubmit} className="space-y-6">
                      {submitStatus === 'success' && (
                          <div className="bg-green-500/20 border border-green-500 text-green-200 px-4 py-3 rounded-lg text-sm">
                              Thank you! We'll get back to you soon.
                          </div>
                      )}
                      {submitStatus === 'error' && (
                          <div className="bg-red-500/20 border border-red-500 text-red-200 px-4 py-3 rounded-lg text-sm">
                              Failed to send. Please try again.
                          </div>
                      )}
                      {/* Honeypot field for bot protection */}
                      <input type="hidden" name="website" value={formData.companyName} onChange={e => setFormData({...formData, companyName: e.target.value})} />
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div>
                              <label className="block text-sm font-medium text-slate-300 mb-1">Company Name</label>
                              <input type="text" required value={formData.companyName} onChange={e => setFormData({...formData, companyName: e.target.value})} className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-white focus:ring-2 focus:ring-brand-500 outline-none"/>
                          </div>
                          <div>
                              <label className="block text-sm font-medium text-slate-300 mb-1">Full Name</label>
                              <input type="text" required value={formData.fullName} onChange={e => setFormData({...formData, fullName: e.target.value})} className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-white focus:ring-2 focus:ring-brand-500 outline-none"/>
                          </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div>
                              <label className="block text-sm font-medium text-slate-300 mb-1">Email</label>
                              <input type="email" required value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-white focus:ring-2 focus:ring-brand-500 outline-none"/>
                          </div>
                          <div>
                              <label className="block text-sm font-medium text-slate-300 mb-1">Phone Number</label>
                              <input type="tel" required value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-white focus:ring-2 focus:ring-brand-500 outline-none"/>
                          </div>
                      </div>
                      <div>
                          <label className="block text-sm font-medium text-slate-300 mb-1">Message</label>
                          <textarea required value={formData.message} onChange={e => setFormData({...formData, message: e.target.value})} rows={5} className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-white focus:ring-2 focus:ring-brand-500 outline-none" placeholder="Tell us about your business needs..."/>
                      </div>
                      <button type="submit" disabled={submitting} className="w-full bg-brand-500 hover:bg-brand-600 disabled:bg-brand-400 py-3 rounded-lg font-bold text-lg transition-all">
                          {submitting ? 'Sending...' : 'Send Enquiry'}
                      </button>
                  </form>
              </div>
          </div>
      </section>

      {/* Footer */}
      <footer className="py-8 bg-slate-950 text-slate-500 text-sm text-center">
          <p>&copy; {settings.footer?.copyrightYear || new Date().getFullYear()} {settings.navbar?.companyName || 'JOBIZ'} Manager. All rights reserved.</p>
      </footer>

      {/* WhatsApp Floating Chat Button */}
      <a
        href={`https://wa.me/${settings.navbar?.whatsappNumber || DEFAULT_SETTINGS.navbar?.whatsappNumber}?text=Hello%20${settings.navbar?.companyName || 'JOBIZ'}%20team%2C%20I%20need%20help`}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`Chat with ${settings.navbar?.companyName || 'JOBIZ'} on WhatsApp`}
        className="fixed right-4 bottom-4 z-50 no-print"
      >
        <div className="w-14 h-14 rounded-full bg-[#25D366] shadow-lg flex items-center justify-center text-white hover:scale-105 transition-transform">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-7 h-7">
            <path d="M20.52 3.48A11.91 11.91 0 0 0 12 0C5.373 0 .052 5.32.05 12c0 2.116.553 4.183 1.603 6.01L0 24l6.22-1.615A11.94 11.94 0 0 0 12 24c6.627 0 11.95-5.373 11.95-12 0-1.993-.498-3.86-1.43-5.52zM12 22.1c-1.6 0-3.174-.38-4.56-1.1l-.33-.17-3.69.96.99-3.59-.21-.36A9.2 9.2 0 0 1 2.8 12c0-5.05 4.11-9.15 9.2-9.15 2.46 0 4.77.96 6.5 2.7a9.117 9.117 0 0 1 2.7 6.45c0 5.05-4.1 9.15-9.2 9.15z" />
            <path d="M17.58 14.39c-.26-.13-1.54-.76-1.78-.85-.24-.09-.42-.13-.6.13-.18.26-.7.85-.86 1.02-.16.17-.32.19-.58.06-.26-.13-1.1-.41-2.1-1.3-.78-.7-1.3-1.56-1.45-1.82-.15-.26-.02-.4.12-.53.12-.12.26-.32.39-.48.13-.16.17-.27.26-.45.09-.18.04-.34-.02-.47-.06-.12-.6-1.44-.82-1.98-.22-.52-.45-.45-.62-.46-.16-.01-.35-.01-.54-.01-.18 0-.47.07-.72.34-.24.26-.94.92-.94 2.25 0 1.33.96 2.62 1.09 2.8.13.17 1.88 2.9 4.56 3.95 1.2.47 2.14.75 2.87.96.81.24 1.55.21 2.14.13.65-.09 1.99-.81 2.27-1.59.28-.78.28-1.45.2-1.59-.08-.14-.28-.23-.54-.36z" fill="#fff"/>
          </svg>
        </div>
      </a>
      </div>
    </div>
  );
};

export default Landing;
