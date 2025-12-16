import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ShoppingBag, Users, TrendingUp, Shield, Smartphone, Globe, CheckCircle, ArrowRight, Menu, X } from 'lucide-react';
import { useCurrency } from '../services/CurrencyContext';

const Landing = () => {
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = React.useState(false);
  const { symbol } = useCurrency();

  const features = [
    { icon: ShoppingBag, title: "Smart POS System", desc: "Thermal & A4 receipts, barcode support, and instant stock updates." },
    { icon: Users, title: "Membership Mgmt", desc: "Handle community subscriptions and recurring payments effortlessly." },
    { icon: TrendingUp, title: "Finance & HR", desc: "Track revenue, expenses, and manage employee payroll in one place." },
    { icon: Shield, title: "Role-Based Access", desc: "Granular permissions for Admins, Managers, and Cashiers." },
  ];

  const plans = [
    { name: "Starter", price: 29, period: "/mo", features: ["1 User Admin", "Basic POS", "Inventory Mgmt", "100 Products", "Email Support"] },
    { name: "Professional", price: 79, period: "/mo", features: ["5 Users", "Advanced POS & Returns", "Finance Module", "Unlimited Products", "Priority Support", "Membership System"], recommended: true },
    { name: "Enterprise", price: 'Custom', period: "", features: ["Unlimited Users", "Multi-Branch Support", "Dedicated Manager", "API Access", "White Labeling"] },
  ];

    const PlanCard: React.FC<{plan: any}> = ({ plan }) => (
    <div className={`rounded-2xl p-8 border ${plan.recommended ? 'border-brand-500 shadow-2xl relative' : 'border-slate-200 bg-slate-50/50'}`}>
      {plan.recommended && <span className="absolute -top-4 left-1/2 -translate-x-1/2 bg-brand-600 text-white px-4 py-1 rounded-full text-xs font-bold uppercase tracking-wide">Most Popular</span>}
      <h3 className="font-bold text-xl text-slate-900">{plan.name}</h3>
      <div className="my-6">
        <span className="text-4xl font-extrabold">{typeof plan.price === 'number' ? `${symbol}${plan.price}` : plan.price}</span>
        <span className="text-slate-500">{plan.period}</span>
      </div>
      <ul className="space-y-4 mb-8">
        {plan.features.map((feat: string, j: number) => (
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
    <div className="min-h-screen bg-white font-sans text-slate-900">
      {/* Navbar */}
      <nav className="fixed w-full bg-white/90 backdrop-blur-md z-50 border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center gap-2">
              <div className="bg-brand-600 text-white p-1.5 rounded-lg">
                <Globe size={24} />
              </div>
              <span className="font-bold text-xl tracking-tight text-slate-900">OmniSales</span>
            </div>
            
            <div className="hidden md:flex items-center gap-8">
              <a href="#features" className="text-sm font-medium text-slate-600 hover:text-brand-600">Features</a>
              <a href="#pricing" className="text-sm font-medium text-slate-600 hover:text-brand-600">Pricing</a>
              <a href="#contact" className="text-sm font-medium text-slate-600 hover:text-brand-600">Contact</a>
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
                <a href="#features" className="text-slate-600 font-medium">Features</a>
                <a href="#pricing" className="text-slate-600 font-medium">Pricing</a>
                <button onClick={() => navigate('/login')} className="text-left font-bold text-brand-600">Sign In</button>
                <button onClick={() => navigate('/register')} className="bg-brand-600 text-white py-2 rounded font-bold">Register Now</button>
             </div>
        )}
      </nav>

      {/* Hero */}
      <section className="pt-32 pb-20 lg:pt-48 lg:pb-32 overflow-hidden relative">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-brand-50 rounded-full blur-3xl opacity-50 -z-10" />
        <div className="max-w-7xl mx-auto px-4 text-center">
          <h1 className="text-5xl lg:text-7xl font-extrabold text-slate-900 tracking-tight mb-6">
            Manage your entire business <br/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-600 to-indigo-600">in one tab.</span>
          </h1>
          <p className="text-lg text-slate-500 mb-10 max-w-2xl mx-auto leading-relaxed">
            The all-in-one platform for Retail, Art Schools, and Community Memberships. 
            POS, Inventory, Finance, and CRM unified.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button onClick={() => navigate('/register')} className="px-8 py-4 bg-brand-600 text-white rounded-full font-bold text-lg hover:bg-brand-700 transition-all shadow-xl shadow-brand-500/20 flex items-center justify-center gap-2">
              Start Free Trial <ArrowRight size={20}/>
            </button>
            <button onClick={() => navigate('/login')} className="px-8 py-4 bg-white text-slate-700 border border-slate-200 rounded-full font-bold text-lg hover:bg-slate-50 transition-all">
              Live Demo
            </button>
          </div>
          
          <div className="mt-16 rounded-2xl border border-slate-200 shadow-2xl overflow-hidden mx-auto max-w-5xl bg-white">
               <div className="h-10 bg-slate-100 border-b border-slate-200 flex items-center gap-2 px-4">
                   <div className="w-3 h-3 rounded-full bg-red-400"></div>
                   <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
                   <div className="w-3 h-3 rounded-full bg-green-400"></div>
               </div>
               {/* Placeholder for App Screenshot */}
               <div className="bg-slate-50 p-8 flex items-center justify-center h-[400px] text-slate-300 font-bold text-2xl">
                   Dashboard Interface Preview
               </div>
          </div>
        </div>
      </section>

      {/* Features Carousel/Grid */}
      <section id="features" className="py-20 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4">
            <div className="text-center mb-16">
                <h2 className="text-3xl font-bold text-slate-900">Everything you need to grow</h2>
                <p className="text-slate-500 mt-2">Replace 5 different tools with OmniSales.</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                {features.map((f, i) => (
                    <div key={i} className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 hover:-translate-y-1 transition-transform">
                        <div className="w-12 h-12 bg-brand-50 text-brand-600 rounded-xl flex items-center justify-center mb-6">
                            <f.icon size={24} />
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
                {plans.map((plan, i) => (
                  <PlanCard key={i} plan={plan} />
                ))}
            </div>
        </div>
      </section>

      {/* Enquiry Form */}
      <section id="contact" className="py-20 bg-slate-900 text-white">
          <div className="max-w-4xl mx-auto px-4 text-center">
              <h2 className="text-3xl font-bold mb-8">Ready to modernize your business?</h2>
              <div className="bg-white/10 backdrop-blur-lg p-8 rounded-2xl border border-white/10 text-left">
                  <form className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="md:col-span-2">
                          <label className="block text-sm font-medium text-slate-300 mb-1">Company Name</label>
                          <input type="text" className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-white focus:ring-2 focus:ring-brand-500 outline-none"/>
                      </div>
                      <div>
                          <label className="block text-sm font-medium text-slate-300 mb-1">Full Name</label>
                          <input type="text" className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-white focus:ring-2 focus:ring-brand-500 outline-none"/>
                      </div>
                      <div>
                          <label className="block text-sm font-medium text-slate-300 mb-1">Email</label>
                          <input type="email" className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-white focus:ring-2 focus:ring-brand-500 outline-none"/>
                      </div>
                      <div className="md:col-span-2">
                           <button type="button" className="w-full bg-brand-500 hover:bg-brand-600 py-4 rounded-lg font-bold text-lg transition-all">
                               Send Enquiry
                           </button>
                      </div>
                  </form>
              </div>
          </div>
      </section>

      {/* Footer */}
      <footer className="py-8 bg-slate-950 text-slate-500 text-sm text-center">
          <p>&copy; {new Date().getFullYear()} OmniSales Manager. All rights reserved.</p>
      </footer>
      {/* WhatsApp Floating Chat Button */}
      <a
        href="https://wa.me/2347076973091?text=Hello%20OmniSales%20team%2C%20I%20need%20help"
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Chat with OmniSales on WhatsApp"
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
  );
};

export default Landing;