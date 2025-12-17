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
    // Load businesses from super admin
    const loadBusinesses = async () => {
      try {
        const bizs = await db.superAdmin.getBusinesses();
        console.log('Loaded businesses:', bizs);
        setBusinesses(bizs || []);
        
        // Auto-select first business or last selected
        if (bizs && bizs.length > 0) {
          const lastBusinessId = localStorage.getItem('omnisales_last_business_id');
          const businessToSelect = bizs.find(b => b.id === lastBusinessId) || bizs[0];
          setSelectedBusiness(businessToSelect);
        }
      } catch (e) {
        console.error('Failed to load businesses:', e);
        setBusinesses([]);
      }
    };
    
    loadBusinesses();
  }, [setBusinesses, setSelectedBusiness]);

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
