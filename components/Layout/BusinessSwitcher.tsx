import React, { useState, useEffect } from 'react';
import { ChevronDown, Building2 } from 'lucide-react';
import { useBusinessContext } from '../../services/BusinessContext';
import db from '../../services/apiClient';
import { Business } from '../../types';

interface BusinessSwitcherProps {
  collapsed?: boolean;
}

const BusinessSwitcher: React.FC<BusinessSwitcherProps> = ({ collapsed = false }) => {
  const { selectedBusiness, setSelectedBusiness, businesses, setBusinesses } = useBusinessContext();
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    // Load businesses based on user role (super admin vs regular)
    const loadBusinesses = async () => {
      try {
        // Get current user to determine if super admin
        const currentUser = db.auth && db.auth.getCurrentUser ? await db.auth.getCurrentUser() : null;
        const isSuperAdmin = currentUser && (currentUser.is_super_admin || currentUser.isSuperAdmin);
        
        let businessesToSet: Business[] = [];
        let businessToSelect: Business | null = null;
        
        if (isSuperAdmin) {
          // Super admin: load all businesses
          businessesToSet = await db.superAdmin.getBusinesses() || [];
          
          // Auto-select first business or last selected
          if (businessesToSet && businessesToSet.length > 0) {
            const lastBusinessId = localStorage.getItem('omnisales_last_business_id');
            businessToSelect = businessesToSet.find(b => b.id === lastBusinessId) || businessesToSet[0];
          }
        } else {
          // Regular user: load ONLY their own business from database
          if (currentUser && currentUser.businessId) {
            try {
              // Fetch the user's business details using the business_id from employee record
              const response = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/businesses/${currentUser.businessId}`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('omnisales_token') || ''}` }
              });
              
              if (response.ok) {
                const business = await response.json();
                businessesToSet = [business];
                businessToSelect = business;
                console.log('[BusinessSwitcher] Regular user business loaded:', { 
                  userId: currentUser.id, 
                  userBusinessId: currentUser.businessId,
                  loadedBusinessId: business.id,
                  match: currentUser.businessId === business.id
                });
              } else {
                console.warn('Failed to fetch business details for user');
              }
            } catch (e) {
              console.error('Failed to fetch user business details:', e);
            }
          }
        }
        
        setBusinesses(businessesToSet);
        if (businessToSelect) {
          console.log('[BusinessSwitcher] Setting selected business:', businessToSelect.id);
          setSelectedBusiness(businessToSelect);
        }
      } catch (e) {
        console.error('Failed to load businesses:', e);
        setBusinesses([]);
      }
    };
    
    loadBusinesses();
  }, []);

  return (
    <div className={`${collapsed ? 'px-2' : 'px-4'} py-3 border-b border-slate-700`}>
      <div className="relative">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-100 transition-colors text-sm font-medium ${
            collapsed ? 'justify-center' : ''
          }`}
        >
          <div className={`flex items-center gap-2 ${collapsed ? 'hidden' : ''}`}>
            <Building2 size={16} />
            <span className="truncate">{selectedBusiness?.name || 'Select Business'}</span>
          </div>
          <Building2 size={16} className={collapsed ? 'block' : 'hidden'} />
          <ChevronDown size={14} className={`transition-transform ${isOpen ? 'rotate-180' : ''} ${collapsed ? 'hidden' : ''}`} />
        </button>

        {/* Dropdown Menu */}
        {isOpen && !collapsed && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-slate-800 border border-slate-700 rounded-lg shadow-lg z-50">
            <div className="max-h-64 overflow-y-auto">
              {businesses.length === 0 ? (
                <div className="px-4 py-3 text-slate-400 text-sm">No businesses available</div>
              ) : (
                businesses.map(business => (
                  <button
                    key={business.id}
                    onClick={() => {
                      setSelectedBusiness(business);
                      setIsOpen(false);
                    }}
                    className={`w-full text-left px-4 py-2 text-sm transition-colors ${
                      selectedBusiness?.id === business.id
                        ? 'bg-indigo-600 text-white'
                        : 'text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    <div className="font-medium">{business.name}</div>
                    <div className="text-xs opacity-75">{business.email}</div>
                  </button>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BusinessSwitcher;
