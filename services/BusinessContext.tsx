import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Business } from '../types';

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

  // Load last selected business from localStorage on mount
  useEffect(() => {
    const lastBusinessId = localStorage.getItem('omnisales_last_business_id');
    if (lastBusinessId) {
      setSelectedBusinessId(lastBusinessId);
    }
  }, []);

  const setSelectedBusiness = (business: Business | null) => {
    setSelectedBusinessState(business);
    if (business) {
      setSelectedBusinessId(business.id);
      localStorage.setItem('omnisales_last_business_id', business.id);
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
