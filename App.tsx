import React, { useState, useEffect } from 'react';
import { HashRouter as Router, Routes, Route, Outlet, Navigate } from 'react-router-dom';
import Sidebar from './components/Layout/Sidebar';
import Dashboard from './pages/Dashboard';
import POS from './pages/POS';
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
import db from './services/apiClient';
import { CurrencyProvider } from './services/CurrencyContext';
import { BusinessProvider } from './services/BusinessContext';
import { Business } from './types';
import { getCurrentUser, logout as apiLogout } from './services/auth';

const Layout = ({ onLogout }: { onLogout: () => void }) => {
  const [collapsed, setCollapsed] = React.useState<boolean>(() => (typeof window !== 'undefined' && window.innerWidth < 768));

  React.useEffect(() => {
    const onResize = () => setCollapsed(window.innerWidth < 768);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  return (
    <div className="flex bg-slate-50 min-h-screen font-sans">
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed(c => !c)} onLogout={onLogout} />
      <main className={`flex-1 transition-all ${collapsed ? 'ml-16' : 'ml-64'} p-8 overflow-y-auto max-h-screen`}>
        <Outlet />
      </main>
    </div>
  );
};

const App = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [isActiveBusiness, setIsActiveBusiness] = useState(false);

  const checkAuth = () => {
    (async () => {
      const user = await getCurrentUser();
      if (user) {
        setIsAuthenticated(true);
        setIsSuperAdmin(!!user.isSuperAdmin);
        if (!user.isSuperAdmin) {
          setIsActiveBusiness(true);
        } else {
          setIsActiveBusiness(true);
        }
      } else {
        setIsAuthenticated(false);
      }
    })();
  };

  useEffect(() => {
    checkAuth();
  }, []);

  const handleLogin = (user: any) => {
      checkAuth();
  }

  const handleLogout = () => {
      apiLogout();
      setIsAuthenticated(false);
      setIsSuperAdmin(false);
      setIsActiveBusiness(false);
  };

  return (
    <CurrencyProvider>
      <BusinessProvider>
        <Router>
          <Routes>
            <Route path="/landing" element={<Landing />} />
            <Route path="/register" element={<Register />} />
            <Route path="/login" element={isAuthenticated ? <Navigate to="/" /> : <Login onLogin={handleLogin} />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/verify-email" element={<VerifyEmail />} />
            <Route path="/payment-registration" element={<PaymentRegistration />} />
            
            {/* Payment Route - Accessible if authenticated but not active */}
            <Route path="/payment" element={isAuthenticated ? <Payment /> : <Navigate to="/login" />} />

            {/* Root Redirect Logic */}
            <Route path="/" element={
                !isAuthenticated ? <Navigate to="/landing" /> : 
                !isSuperAdmin && !isActiveBusiness ? <Navigate to="/payment" /> :
                <Layout onLogout={handleLogout} />
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
                 <Route path="tasks" element={<Tasks />} />
                 <Route path="reports" element={<Reports />} />
                 <Route path="audit-trails" element={<AuditTrails />} />
                 <Route path="admin" element={<Admin />} />
                 <Route path="communications" element={<Communications />} />
                 <Route path="settings" element={<Settings />} />
                 <Route path="categories" element={<CategoriesPage />} />

                 {/* Super Admin Routes - Always defined, permission checked in components */}
                 <Route path="super-admin" element={<SuperAdminDashboard onLogout={handleLogout} />} />
                 <Route path="super-admin/approvals" element={<SuperAdminApprovals />} />
                 <Route path="super-admin/payments" element={<SuperAdminPayments />} />
                 <Route path="super-admin/activation" element={<SuperAdminActivation />} />
                 <Route path="super-admin/feedbacks" element={<SuperAdminFeedbacks />} />
                 <Route path="super-admin/data" element={<SuperAdminData />} />
                 <Route path="super-admin/landing-config" element={<SuperAdminLandingConfig />} />
            </Route>
          </Routes>
        </Router>
      </BusinessProvider>
    </CurrencyProvider>
  );
};

export default App;