import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Business } from '../types';
import db from './apiClient';

interface BusinessContextType {
  selectedBusinessId: string | null;
  selectedBusiness: Business | null;
  setSelectedBusiness: (business: Business | null) => void;
  businesses: Business[];
  setBusinesses: (businesses: Business[]) => void;
  isLoading: boolean;
}

const BusinessContext = createContext<BusinessContextType | undefined>(undefined);

export const BusinessProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [selectedBusinessId, setSelectedBusinessId] = useState<string | null>(null);
  const [selectedBusiness, setSelectedBusinessState] = useState<Business | null>(null);
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Load business ID: from localStorage for super admins, or from employee record for regular users
  useEffect(() => {
    const isSuperAdmin = localStorage.getItem('omnisales_is_super_admin') === 'true';
    if (isSuperAdmin) {
      // Super admin: use localStorage to remember last selected business
      const lastBusinessId = localStorage.getItem('omnisales_last_business_id');
      if (lastBusinessId) {
        console.log('[BusinessContext] Loading from localStorage for super admin:', lastBusinessId);
        setSelectedBusinessId(lastBusinessId);
      }
    } else {
      // Regular user: get business_id directly from their employee record
      (async () => {
        try {
          const currentUser = db.auth && db.auth.getCurrentUser ? await db.auth.getCurrentUser() : null;
          if (currentUser && currentUser.businessId) {
            console.log('[BusinessContext] Regular user detected - setting businessId from employee record:', currentUser.businessId);
            setSelectedBusinessId(currentUser.businessId);
          } else {
            console.warn('[BusinessContext] Regular user found but no businessId in employee record');
          }
        } catch (e) {
          console.warn('[BusinessContext] Failed to get current user business_id:', e);
        }
      })();
    }
  }, []);

  const setSelectedBusiness = (business: Business | null) => {
    setSelectedBusinessState(business);
    if (business) {
      setSelectedBusinessId(business.id);
      const isSuperAdmin = localStorage.getItem('omnisales_is_super_admin') === 'true';
      // Store in localStorage only for super admins
      if (isSuperAdmin) {
        localStorage.setItem('omnisales_last_business_id', business.id);
      }
      console.log('[BusinessContext] Selected business:', { businessId: business.id, isSuperAdmin });
    } else {
      setSelectedBusinessId(null);
      localStorage.removeItem('omnisales_last_business_id');
    }
  };

  return (
    <BusinessContext.Provider
      value={{
        selectedBusinessId,
        selectedBusiness,
        setSelectedBusiness,
        businesses,
        setBusinesses,
        isLoading
      }}
    >
      {children}
    </BusinessContext.Provider>
  );
};

export const useBusinessContext = () => {
  const context = useContext(BusinessContext);
  if (!context) {
    throw new Error('useBusinessContext must be used within BusinessProvider');
  }
  return context;
};
