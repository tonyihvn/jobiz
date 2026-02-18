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
  const [hasPendingLogout, setHasPendingLogout] = useState(!!localStorage.getItem('pendingLogoutUrl'));

  // Monitor localStorage for pending logout URL changes
  useEffect(() => {
    const checkPendingLogout = () => {
      const pending = !!localStorage.getItem('pendingLogoutUrl');
      console.log('[LOGOUT] Checking pending logout status:', pending);
      setHasPendingLogout(pending);
    };

    // Check on mount
    checkPendingLogout();

    // Also listen for storage events (from other tabs/windows)
    window.addEventListener('storage', checkPendingLogout);
    return () => window.removeEventListener('storage', checkPendingLogout);
  }, []);

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

  // Handle pending logout redirect after auth check completes
  useEffect(() => {
    console.log('[LOGOUT] useEffect running: isAuthChecking=', isAuthChecking, 'isAuthenticated=', isAuthenticated, 'hasPendingLogout=', hasPendingLogout);
    
    if (hasPendingLogout && !isAuthChecking && !isAuthenticated) {
      const pendingLogoutUrl = localStorage.getItem('pendingLogoutUrl');
      console.log('[LOGOUT] Pending logout URL from localStorage:', pendingLogoutUrl);
      
      if (pendingLogoutUrl) {
        console.log('[LOGOUT] Handling pending logout redirect:', pendingLogoutUrl);
        
        // Add delay to ensure routes are fully initialized before redirecting
        const redirectTimeout = setTimeout(() => {
          console.log('[LOGOUT] Executing redirect to:', pendingLogoutUrl);
          
          try {
            let targetHash = pendingLogoutUrl;
            if (pendingLogoutUrl.startsWith('http://') || pendingLogoutUrl.startsWith('https://')) {
              // External URL - navigate directly
              console.log('[LOGOUT] External URL redirect:', pendingLogoutUrl);
              window.location.href = pendingLogoutUrl;
              return; // Don't set the hash/cleanup since we're leaving the domain
            } else if (!pendingLogoutUrl.startsWith('#')) {
              // Add hash prefix if not already there
              targetHash = '#' + pendingLogoutUrl;
            }
            
            console.log('[LOGOUT] Setting hash route:', targetHash);
            window.location.hash = targetHash;
            
            // Check after a longer delay if we actually navigated to the target
            // Only then clear the pending logout
            const verifyTimeout = setTimeout(() => {
              console.log('[LOGOUT] Current hash:', window.location.hash, 'Target hash:', targetHash);
              if (window.location.hash === targetHash) {
                console.log('[LOGOUT] Navigation confirmed, clearing pending logout');
                localStorage.removeItem('pendingLogoutUrl');
                setHasPendingLogout(false);
              } else {
                console.log('[LOGOUT] Navigation not confirmed yet, trying again');
                window.location.hash = targetHash;
              }
            }, 300); // Longer delay to ensure router processes the hash change
            
            return () => clearTimeout(verifyTimeout);
          } catch (err) {
            console.error('[LOGOUT] Error during redirect:', err);
            localStorage.removeItem('pendingLogoutUrl');
            setHasPendingLogout(false);
          }
        }, 150);
        
        return () => clearTimeout(redirectTimeout);
      }
    }
  }, [isAuthChecking, isAuthenticated, hasPendingLogout]);

  const handleLogin = (user: any) => {
      checkAuth();
  }

  const handleLogout = () => {
      (async () => {
          try {
              // Get current user to find their business
              const user = await getCurrentUser();
              let logoutUrl: string | null = null; // Don't default to landing yet
              let fetchSuccessful = false;
              
              console.log('[LOGOUT] Starting logout process');
              console.log('[LOGOUT] User:', user);
              
              if (user && user.businessId) {
                  try {
                      console.log('[LOGOUT] Fetching logout URL for business:', user.businessId);
                      
                      // Fetch the user's business logout redirect URL using regular auth endpoint
                      const controller = new AbortController();
                      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
                      
                      const response = await fetch(
                          `${(import.meta as any).env.VITE_API_URL || ''}/api/me/business-logout-url`,
                          { 
                              headers: { 'Authorization': `Bearer ${localStorage.getItem('omnisales_token') || ''}` },
                              signal: controller.signal
                          }
                      );
                      clearTimeout(timeoutId);
                      
                      console.log('[LOGOUT] Fetch response status:', response.status);
                      
                      if (response.ok) {
                          const data = await response.json();
                          console.log('[LOGOUT] Response data:', data);
                          
                          // Check if logout_redirect_url is explicitly set
                          if (data.logout_redirect_url && data.logout_redirect_url.trim() !== '') {
                              logoutUrl = data.logout_redirect_url;
                              console.log('[LOGOUT] Using custom logout URL from database:', logoutUrl);
                          } else {
                              console.log('[LOGOUT] No custom logout URL set in database, will use landing page');
                          }
                          fetchSuccessful = true;
                      } else {
                          console.warn('[LOGOUT] Failed to fetch logout URL, status:', response.status, response.statusText);
                      }
                  } catch (e: any) {
                      console.error('[LOGOUT] Failed to fetch logout URL:', e.message);
                  }
              } else {
                  console.log('[LOGOUT] No user or business ID found');
              }
              
              // Use landing page if no custom URL was set
              if (!logoutUrl) {
                  logoutUrl = '/landing';
                  console.log('[LOGOUT] No custom URL available, using default: /landing');
              }
              
              console.log('[LOGOUT] Final logout URL:', logoutUrl);
              
              // IMPORTANT: Set navigation target BEFORE clearing auth state to avoid race condition
              let navigationTarget = '#/landing'; // default
              
              if (logoutUrl.startsWith('http://') || logoutUrl.startsWith('https://')) {
                  // External URL
                  console.log('[LOGOUT] Redirecting to external URL:', logoutUrl);
                  navigationTarget = logoutUrl;
              } else if (logoutUrl.startsWith('/#/')) {
                  // Hash-based route with leading slash - extract path
                  const path = logoutUrl.substring(2); // Remove the /# prefix
                  console.log('[LOGOUT] Redirecting to hash route (format /#/):', path);
                  navigationTarget = '#' + path;
              } else if (logoutUrl.startsWith('#/')) {
                  // Hash-based route - remove the # and add it back
                  const path = logoutUrl.substring(1); // Remove the # prefix
                  console.log('[LOGOUT] Redirecting to hash route (format #/):', path);
                  navigationTarget = '#' + path;
              } else if (logoutUrl.startsWith('/')) {
                  // Internal route
                  console.log('[LOGOUT] Redirecting to internal route:', logoutUrl);
                  navigationTarget = '#' + logoutUrl;
              } else {
                  // Fallback
                  console.log('[LOGOUT] Unrecognized URL format, using landing page');
                  navigationTarget = '#/landing';
              }
              
              console.log('[LOGOUT] Navigation target:', navigationTarget);
              console.log('[LOGOUT] Stored pending logout URL in localStorage:', navigationTarget);
              
              // Store the logout URL in localStorage before reload so it persists
              localStorage.setItem('pendingLogoutUrl', navigationTarget);
              console.log('[LOGOUT] localStorage.pendingLogoutUrl =', localStorage.getItem('pendingLogoutUrl'));
              
              // Clear token 
              apiLogout();
              localStorage.removeItem('lastLocation');
              
              console.log('[LOGOUT] Token cleared, performing page reload...');
              console.log('[LOGOUT] About to reload at:', new Date().toISOString());
              
              // Force a full page reload - this will trigger auth check and the useEffect will handle the redirect
              window.location.reload();
              
              // Update state (won't execute due to reload, but just in case)
              setIsAuthenticated(false);
              setIsSuperAdmin(false);
              setIsActiveBusiness(false);
              setLastLocation(null);
              
          } catch (err) {
              console.error('[LOGOUT] Unexpected logout error:', err);
              // Fallback to basic logout
              apiLogout();
              setIsAuthenticated(false);
              setIsSuperAdmin(false);
              setIsActiveBusiness(false);
              setLastLocation(null);
              localStorage.removeItem('lastLocation');
              window.location.hash = '/landing';
          }
      })();
  };

  return (
    <CurrencyProvider>
      <BusinessProvider>
        <Router>
          <LocationTracker />
          
          {/* Show loading screen if pending logout redirect is in progress */}
          {hasPendingLogout ? (
            <div className="flex items-center justify-center min-h-screen bg-slate-100">
              <div className="text-center">
                <div className="text-xl text-slate-600 mb-4">Logging out...</div>
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
              </div>
            </div>
          ) : (
            <Routes>
              <Route path="/landing" element={<Landing />} />
              <Route path="/register" element={<Register />} />
              <Route path="/login" element={isAuthenticated ? <Navigate to="/" /> : <Login onLogin={checkAuth} />} />
              <Route path="/login/:businessid" element={isAuthenticated ? <Navigate to="/" /> : <Login onLogin={checkAuth} />} />
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
          )}
        </Router>
      </BusinessProvider>
    </CurrencyProvider>
  );
};

export default App;