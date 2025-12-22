# Multi-Tenant Frontend Implementation - Registration & Routing

## File: pages/Register.tsx - Enhanced for User Types

```typescript
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, User, Car, AlertCircle, CheckCircle } from 'lucide-react';
import { register, driverSignup } from '../services/auth';

type UserType = 'customer' | 'driver' | 'admin';

const Register = () => {
  const navigate = useNavigate();
  const [userType, setUserType] = useState<UserType | null>(null);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: '',
    licenseNumber: '',
    vehicleType: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const validateForm = () => {
    if (!formData.email || !formData.password || !formData.firstName) {
      setError('Please fill in all required fields');
      return false;
    }
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return false;
    }
    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters');
      return false;
    }
    if (userType === 'driver' && (!formData.licenseNumber || !formData.vehicleType)) {
      setError('License number and vehicle type are required for drivers');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!userType) {
      setError('Please select a user type');
      return;
    }

    if (!validateForm()) return;

    setLoading(true);

    try {
      if (userType === 'driver') {
        await driverSignup(
          formData.email,
          formData.password,
          formData.firstName,
          formData.lastName,
          formData.licenseNumber,
          formData.vehicleType
        );
        navigate('/driver/dashboard');
      } else {
        await register(
          formData.email,
          formData.password,
          formData.firstName,
          formData.lastName,
          userType
        );
        
        if (userType === 'customer') {
          navigate('/orders');
        } else if (userType === 'admin') {
          navigate('/company-setup'); // Or go to first company setup
        }
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  // Step 1: Select user type
  if (!userType) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-brand-600 to-brand-700 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full">
          <h1 className="text-3xl font-bold text-slate-800 mb-2">Join Our Marketplace</h1>
          <p className="text-slate-600 mb-8">What brings you here?</p>

          <div className="space-y-3">
            {/* Customer Option */}
            <button
              onClick={() => setUserType('customer')}
              className="w-full p-4 border-2 border-slate-200 rounded-lg hover:border-brand-600 hover:bg-brand-50 transition-all text-left"
            >
              <div className="flex items-center gap-3">
                <User size={24} className="text-brand-600" />
                <div>
                  <p className="font-semibold text-slate-800">I'm a Customer</p>
                  <p className="text-sm text-slate-500">Browse and order from companies</p>
                </div>
              </div>
            </button>

            {/* Driver Option */}
            <button
              onClick={() => setUserType('driver')}
              className="w-full p-4 border-2 border-slate-200 rounded-lg hover:border-brand-600 hover:bg-brand-50 transition-all text-left"
            >
              <div className="flex items-center gap-3">
                <Car size={24} className="text-brand-600" />
                <div>
                  <p className="font-semibold text-slate-800">I'm a Driver</p>
                  <p className="text-sm text-slate-500">Deliver orders and earn money</p>
                </div>
              </div>
            </button>

            {/* Company Admin Option */}
            <button
              onClick={() => setUserType('admin')}
              className="w-full p-4 border-2 border-slate-200 rounded-lg hover:border-brand-600 hover:bg-brand-50 transition-all text-left"
            >
              <div className="flex items-center gap-3">
                <CheckCircle size={24} className="text-brand-600" />
                <div>
                  <p className="font-semibold text-slate-800">I Own a Business</p>
                  <p className="text-sm text-slate-500">Set up your store and manage orders</p>
                </div>
              </div>
            </button>
          </div>

          <p className="text-center text-slate-600 mt-8 text-sm">
            Already have an account?{' '}
            <a href="/login" className="text-brand-600 font-semibold hover:underline">
              Login
            </a>
          </p>
        </div>
      </div>
    );
  }

  // Step 2: Registration form
  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-600 to-brand-700 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full">
        <button
          onClick={() => setUserType(null)}
          className="text-slate-600 hover:text-slate-800 mb-4 font-semibold"
        >
          ← Back
        </button>

        <h1 className="text-3xl font-bold text-slate-800 mb-2">
          {userType === 'customer' && 'Create Account'}
          {userType === 'driver' && 'Become a Driver'}
          {userType === 'admin' && 'Register Your Business'}
        </h1>
        <p className="text-slate-600 mb-6">
          {userType === 'customer' && 'Start shopping from multiple companies'}
          {userType === 'driver' && 'Start delivering and earn'}
          {userType === 'admin' && 'Set up your company storefront'}
        </p>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex gap-2">
            <AlertCircle size={20} className="text-red-600 flex-shrink-0" />
            <p className="text-red-600 text-sm">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Email *</label>
            <div className="relative">
              <Mail size={18} className="absolute left-3 top-3 text-slate-400" />
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                placeholder="you@example.com"
                className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-brand-600"
                disabled={loading}
              />
            </div>
          </div>

          {/* Name */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">First Name *</label>
              <input
                type="text"
                name="firstName"
                value={formData.firstName}
                onChange={handleInputChange}
                placeholder="John"
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-brand-600"
                disabled={loading}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Last Name</label>
              <input
                type="text"
                name="lastName"
                value={formData.lastName}
                onChange={handleInputChange}
                placeholder="Doe"
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-brand-600"
                disabled={loading}
              />
            </div>
          </div>

          {/* Driver Fields */}
          {userType === 'driver' && (
            <>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  License Number *
                </label>
                <input
                  type="text"
                  name="licenseNumber"
                  value={formData.licenseNumber}
                  onChange={handleInputChange}
                  placeholder="DL123456"
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-brand-600"
                  disabled={loading}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Vehicle Type *
                </label>
                <select
                  name="vehicleType"
                  value={formData.vehicleType}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-brand-600"
                  disabled={loading}
                >
                  <option value="">Select vehicle...</option>
                  <option value="motorcycle">Motorcycle</option>
                  <option value="car">Car</option>
                  <option value="van">Van</option>
                  <option value="truck">Truck</option>
                </select>
              </div>
            </>
          )}

          {/* Password */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Password *</label>
            <div className="relative">
              <Lock size={18} className="absolute left-3 top-3 text-slate-400" />
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleInputChange}
                placeholder="••••••"
                className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-brand-600"
                disabled={loading}
              />
            </div>
            <p className="text-xs text-slate-500 mt-1">At least 6 characters</p>
          </div>

          {/* Confirm Password */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Confirm Password *
            </label>
            <div className="relative">
              <Lock size={18} className="absolute left-3 top-3 text-slate-400" />
              <input
                type="password"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleInputChange}
                placeholder="••••••"
                className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-brand-600"
                disabled={loading}
              />
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-brand-600 hover:bg-brand-700 disabled:bg-slate-400 text-white font-semibold py-2 rounded-lg transition-colors"
          >
            {loading ? 'Creating Account...' : 'Create Account'}
          </button>
        </form>

        <p className="text-center text-slate-600 mt-6 text-sm">
          Already have an account?{' '}
          <a href="/login" className="text-brand-600 font-semibold hover:underline">
            Login
          </a>
        </p>
      </div>
    </div>
  );
};

export default Register;
```

---

## File: App.tsx - Company Slug Routing

```typescript
import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, useParams } from 'react-router-dom';
import Layout from './components/Layout/Layout';

// Pages
import Landing from './pages/Landing';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import POS from './pages/POS';
import Inventory from './pages/Inventory';
import Orders from './pages/Orders';
import CompanyStorefront from './pages/CompanyStorefront';
import DriverDashboard from './pages/DriverDashboard';
import OrderTracking from './pages/OrderTracking';

// Wrapper for company-slug routes
const CompanyRoutes = () => {
  const { slug } = useParams<{ slug: string }>();
  const [company, setCompany] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (slug) {
      // Fetch company details
      fetch(`/api/companies/${slug}`)
        .then(res => res.json())
        .then(data => setCompany(data))
        .catch(err => console.error('Failed to load company:', err))
        .finally(() => setLoading(false));
    }
  }, [slug]);

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  if (!company) {
    return <div className="flex items-center justify-center min-h-screen">Company not found</div>;
  }

  return (
    <Routes>
      <Route path="/" element={<CompanyStorefront company={company} />} />
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/orders" element={<Orders />} />
      <Route path="/inventory" element={<Inventory />} />
      <Route path="/pos" element={<POS />} />
    </Routes>
  );
};

const App = () => {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* Company Storefront Routes - Dynamic slug */}
        <Route path="/:slug/*" element={<CompanyRoutes />} />

        {/* Driver Routes */}
        <Route path="/driver" element={<Layout />}>
          <Route path="dashboard" element={<DriverDashboard />} />
          <Route path="tracking/:orderId" element={<OrderTracking />} />
        </Route>

        {/* Customer Routes */}
        <Route path="/orders" element={<Layout />}>
          <Route path="" element={<Orders />} />
          <Route path=":id/tracking" element={<OrderTracking />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
};

export default App;
```

---

## File: pages/CompanyStorefront.tsx - Public Product Catalog

```typescript
import React, { useState, useEffect } from 'react';
import { ShoppingCart, MapPin, Phone, Mail, Star } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface Company {
  id: string;
  slug: string;
  name: string;
  description: string;
  address: string;
  phone: string;
  email: string;
  logo_url: string;
  header_image_url: string;
  rating?: number;
}

interface Product {
  id: string;
  name: string;
  price: number;
  image_url: string;
  category_name: string;
}

interface CompanyStorefrontProps {
  company: Company;
}

const CompanyStorefront: React.FC<CompanyStorefrontProps> = ({ company }) => {
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [cart, setCart] = useState<any[]>([]);

  useEffect(() => {
    // Load products for this company
    fetch(`/api/companies/${company.slug}/products`)
      .then(res => res.json())
      .then(data => setProducts(data))
      .catch(err => console.error('Failed to load products:', err))
      .finally(() => setLoading(false));
  }, [company.slug]);

  const handleAddToCart = (product: Product) => {
    const existing = cart.find(item => item.id === product.id);
    if (existing) {
      setCart(cart.map(item =>
        item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
      ));
    } else {
      setCart([...cart, { ...product, quantity: 1, companyId: company.id }]);
    }
  };

  const handleCheckout = () => {
    // Save cart and navigate to checkout
    localStorage.setItem('cart', JSON.stringify(cart));
    navigate('/checkout', { state: { company } });
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-6xl mx-auto px-4 py-8">
          <div className="flex items-start gap-6">
            {company.logo_url && (
              <img
                src={company.logo_url}
                alt={company.name}
                className="w-20 h-20 rounded-lg object-cover"
              />
            )}
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-slate-800">{company.name}</h1>
              <p className="text-slate-600 mt-2">{company.description}</p>
              <div className="flex gap-6 mt-4 text-sm text-slate-600">
                {company.rating && (
                  <div className="flex items-center gap-1">
                    <Star size={16} className="fill-yellow-400 text-yellow-400" />
                    <span>{company.rating} rating</span>
                  </div>
                )}
                {company.address && (
                  <div className="flex items-center gap-2">
                    <MapPin size={16} />
                    <span>{company.address}</span>
                  </div>
                )}
                {company.phone && (
                  <div className="flex items-center gap-2">
                    <Phone size={16} />
                    <span>{company.phone}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Products */}
      <div className="max-w-6xl mx-auto px-4 py-8">
        {loading ? (
          <div className="text-center py-12">Loading products...</div>
        ) : products.length === 0 ? (
          <div className="text-center py-12 text-slate-600">No products available</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {products.map(product => (
              <div key={product.id} className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow">
                {product.image_url && (
                  <img
                    src={product.image_url}
                    alt={product.name}
                    className="w-full h-40 object-cover rounded-t-lg"
                  />
                )}
                <div className="p-4">
                  <h3 className="font-semibold text-slate-800 line-clamp-2">{product.name}</h3>
                  <p className="text-xs text-slate-500 mt-1">{product.category_name}</p>
                  <div className="flex items-center justify-between mt-4">
                    <span className="font-bold text-brand-600 text-lg">${product.price.toFixed(2)}</span>
                    <button
                      onClick={() => handleAddToCart(product)}
                      className="bg-brand-600 text-white p-2 rounded hover:bg-brand-700 transition-colors"
                    >
                      <ShoppingCart size={18} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Cart Summary */}
      {cart.length > 0 && (
        <div className="fixed bottom-4 right-4 bg-white rounded-lg shadow-lg p-4 max-w-xs">
          <h3 className="font-bold text-slate-800 mb-2">Cart ({cart.length} items)</h3>
          <div className="border-t pt-2">
            <p className="text-sm text-slate-600 mb-3">
              Total: ${cart.reduce((sum, item) => sum + (item.price * item.quantity), 0).toFixed(2)}
            </p>
            <button
              onClick={handleCheckout}
              className="w-full bg-brand-600 text-white py-2 rounded font-semibold hover:bg-brand-700 transition-colors"
            >
              Checkout
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CompanyStorefront;
```

---

## Next Steps

1. **Update types.ts** ✅ (Already done)
2. **Create these page components:**
   - Register.tsx (user type selection)
   - CompanyStorefront.tsx (public catalog)
   - Login.tsx (updated for multi-tenant)
   - Checkout.tsx (order creation)
   - DriverDashboard.tsx (driver orders)
   - OrderTracking.tsx (map integration)

3. **Update App.tsx** with new routing

4. **Update services/auth.ts** with new endpoints

5. **Test user flows:**
   - Register as customer
   - Register as driver
   - Register as admin
   - Login and navigate to company catalog
   - Browse and add to cart

