import React, { useState, useEffect } from 'react';
import { HashRouter as Router, Routes, Route, Outlet, Navigate, useLocation, useNavigate } from 'react-router-dom';
import Sidebar from './components/Layout/Sidebar';
import Dashboard from './pages/Dashboard';
import POS from './pages/POS';
import PrintReceipt from './pages/PrintReceipt';
import Inventory from './pages/Inventory';
import Stock from './pages/Stock';
import Suppliers from './pages/Suppliers';
import Customers from './pages/Customers';
import Services from './pages/Services';
import Courses from './pages/Courses';
import SalesHistory from './pages/SalesHistory';
import ServiceHistory from './pages/ServiceHistory';
import Finance from './pages/Finance';
import Admin from './pages/Admin';
import CategoriesPage from './pages/Categories';
import Communications from './pages/Communications';
import Settings from './pages/Settings';
import Tasks from './pages/Tasks';
import Reports from './pages/Reports';
import AuditTrails from './pages/AuditTrails';
import Login from './pages/Login';
import Landing from './pages/Landing';
import Register from './pages/Register';
import Payment from './pages/Payment';
import VerifyEmail from './pages/VerifyEmail';
import PaymentRegistration from './pages/PaymentRegistration';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import SuperAdminDashboard from './pages/SuperAdminDashboard';
import SuperAdminApprovals from './pages/SuperAdminApprovals';
import SuperAdminPayments from './pages/SuperAdminPayments';
import SuperAdminActivation from './pages/SuperAdminActivation';
import SuperAdminFeedbacks from './pages/SuperAdminFeedbacks';
import SuperAdminData from './pages/SuperAdminData';
import SuperAdminLandingConfig from './pages/SuperAdminLandingConfig';
import UserProfile from './pages/UserProfile';
import db from './services/apiClient';
import { CurrencyProvider } from './services/CurrencyContext';
import { BusinessProvider } from './services/BusinessContext';
import { Business } from './types';
import { getCurrentUser, logout as apiLogout } from './services/auth';

// Component to track location changes
const LocationTracker = () => {
  const location = useLocation();
  
  useEffect(() => {
    // Save current location to localStorage (except for login/landing/public pages)
    // Use the hash-based path from HashRouter
    const hash = window.location.hash;
    const path = hash.replace('#', '') || '/';
    const publicPaths = ['/landing', '/login', '/register', '/forgot-password', '/reset-password', '/verify-email', '/payment-registration', '/payment', '/print-receipt', '/logout'];
    const isPublicPath = publicPaths.includes(path);
    
    // Valid routes that can be saved as lastLocation
    const validRoutes = ['/', '/dashboard', '/inventory', '/services', '/clients', '/pos', '/reports', '/admin', '/sales-history', '/service-history', '/stock', '/suppliers', '/courses', '/finance', '/audit-trails', '/communications', '/settings', '/categories', '/tasks', '/user-profile', '/super-admin'];
    const isValidRoute = validRoutes.some(valid => path === valid || path.startsWith(valid + '/'));
    
    // Only save if: 1) not a public path, 2) is a valid route, 3) not root, 4) has actual content
    if (!isPublicPath && isValidRoute && path !== '/' && path.length > 1) {
      localStorage.setItem('lastLocation', path);
    }
  }, [location]);
  
  return null;
};

const Layout = ({ onLogout, lastLocation }: { onLogout: () => void; lastLocation: string | null }) => {
  const [collapsed, setCollapsed] = React.useState<boolean>(() => (typeof window !== 'undefined' && window.innerWidth < 768));

  React.useEffect(() => {
    const onResize = () => setCollapsed(window.innerWidth < 768);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  return (
    <>
      <div className="flex bg-slate-50 min-h-screen font-sans">
        <Sidebar collapsed={collapsed} onToggle={() => setCollapsed(c => !c)} onLogout={onLogout} />
        <main className={`flex-1 transition-all ${collapsed ? 'ml-16' : 'ml-64'} p-8 overflow-y-auto max-h-screen`}>
          <Outlet />
        </main>
      </div>
    </>
  );
};

const App = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [isActiveBusiness, setIsActiveBusiness] = useState(false);
  const [lastLocation, setLastLocation] = useState<string | null>(null);
  const [isAuthChecking, setIsAuthChecking] = useState(true);

  const checkAuth = () => {
    (async () => {
      try {
        const user = await getCurrentUser();
        if (user) {
          setIsAuthenticated(true);
          setIsSuperAdmin(!!user.is_super_admin);
          setIsActiveBusiness(true);
        } else {
          setIsAuthenticated(false);
        }
      } catch (e) {
        console.error('Auth check failed:', e);
        setIsAuthenticated(false);
      } finally {
        setIsAuthChecking(false);
      }
    })();
  };

  useEffect(() => {
    checkAuth();
    // Load last location from localStorage
    const saved = localStorage.getItem('lastLocation');
    if (saved) {
      setLastLocation(saved);
    }
  }, []);

  const handleLogin = (user: any) => {
      checkAuth();
  }

  const handleLogout = () => {
      apiLogout();
      setIsAuthenticated(false);
      setIsSuperAdmin(false);
      setIsActiveBusiness(false);
      setLastLocation(null);
      localStorage.removeItem('lastLocation');
  };

  return (
    <CurrencyProvider>
      <BusinessProvider>
        <Router>
          <LocationTracker />
          <Routes>
            <Route path="/landing" element={<Landing />} />
            <Route path="/register" element={<Register />} />
            <Route path="/login" element={isAuthenticated ? <Navigate to="/" /> : <Login onLogin={checkAuth} />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/verify-email" element={<VerifyEmail />} />
            <Route path="/payment-registration" element={<PaymentRegistration />} />
            <Route path="/print-receipt" element={<PrintReceipt />} />
            
            {/* Payment Route - Accessible if authenticated but not active */}
            <Route path="/payment" element={isAuthenticated ? <Payment /> : <Navigate to="/login" />} />

            {/* Root Redirect Logic - wait for auth check to complete before redirecting */}
            <Route path="/" element={
                isAuthChecking ? <div className="flex items-center justify-center min-h-screen"><div className="text-xl text-slate-600">Loading...</div></div> :
                !isAuthenticated ? <Navigate to="/landing" /> : 
                !isSuperAdmin && !isActiveBusiness ? <Navigate to="/payment" /> :
                <Layout onLogout={handleLogout} lastLocation={lastLocation} />
            }>
                   {/* Index Route - Redirect super admin to dashboard */}
                   <Route index element={isSuperAdmin ? <SuperAdminDashboard onLogout={handleLogout} /> : <Dashboard />} />
                   <Route path="pos" element={<POS />} />
                   <Route path="inventory/:group" element={<Inventory />} />
                   <Route path="stock" element={<Stock />} />
                   <Route path="suppliers" element={<Suppliers />} />
                   <Route path="clients" element={<Customers />} />
                   <Route path="services/:group" element={<Services />} />
                   <Route path="courses" element={<Courses />} />
                   <Route path="sales-history" element={<SalesHistory />} />
                 <Route path="service-history" element={<ServiceHistory />} />
                 <Route path="finance" element={<Finance />} />
                 <Route path="user-profile/:id" element={<UserProfile />} />
                 <Route path="tasks" element={<Tasks />} />
                 <Route path="reports" element={<Reports />} />
                 <Route path="audit-trails" element={<AuditTrails />} />
                 <Route path="admin" element={<Admin />} />
                 <Route path="communications" element={<Communications />} />
                 <Route path="settings" element={<Settings />} />
                 <Route path="categories" element={<CategoriesPage />} />

                   {/* Super Admin Routes - Only accessible to super admins */}
                 <Route path="super-admin" element={isSuperAdmin ? <SuperAdminDashboard onLogout={handleLogout} /> : <Navigate to="/" />} />
                 <Route path="super-admin/approvals" element={isSuperAdmin ? <SuperAdminApprovals /> : <Navigate to="/" />} />
                 <Route path="super-admin/payments" element={isSuperAdmin ? <SuperAdminPayments /> : <Navigate to="/" />} />
                 <Route path="super-admin/activation" element={isSuperAdmin ? <SuperAdminActivation /> : <Navigate to="/" />} />
                 <Route path="super-admin/feedbacks" element={isSuperAdmin ? <SuperAdminFeedbacks /> : <Navigate to="/" />} />
                 <Route path="super-admin/data" element={isSuperAdmin ? <SuperAdminData /> : <Navigate to="/" />} />
                 <Route path="super-admin/landing-config" element={isSuperAdmin ? <SuperAdminLandingConfig /> : <Navigate to="/" />} />
            </Route>
            {/* Catch-all for unknown routes - redirect based on auth state */}
            <Route path="*" element={isAuthChecking ? <div className="flex items-center justify-center min-h-screen"><div className="text-xl text-slate-600">Loading...</div></div> : isAuthenticated ? <Navigate to={lastLocation || "/"} /> : <Navigate to="/landing" />} />
          </Routes>
        </Router>
      </BusinessProvider>
    </CurrencyProvider>
  );
};

export default App;