import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { CartItem, SaleRecord } from '../types';

export interface POSTab {
  id: string;
  name: string;
  createdAt: Date;
  cart: CartItem[];
  selectedCustomer: string;
  customerInput: string;
  orderDate: string;
  isProforma: boolean;
  proformaTitle: string;
  paymentMethod: string;
  particulars: string;
  delivery: { enabled: boolean; fee: number; address: string };
  amountPaid: number;
  amountPaidEdited: boolean;
  editingSale: SaleRecord | null;
  amountEdits: Record<string, string>;
}

interface POSTabContextType {
  tabs: POSTab[];
  activeTabId: string | null;
  addTab: (name?: string) => string;
  closeTab: (tabId: string) => void;
  switchTab: (tabId: string) => void;
  updateTab: (tabId: string, updates: Partial<POSTab>) => void;
  getActiveTab: () => POSTab | null;
  clearAllTabs: () => void;
  renameTab: (tabId: string, newName: string) => void;
  duplicateTab: (tabId: string) => string;
}

const POSTabContext = createContext<POSTabContextType | undefined>(undefined);

export const POSTabProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [tabs, setTabs] = useState<POSTab[]>([]);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);

  // Initialize with one default tab
  useEffect(() => {
    if (tabs.length === 0) {
      const defaultTabId = 'tab_' + Date.now();
      setTabs([createNewTab(defaultTabId, 'Order 1')]);
      setActiveTabId(defaultTabId);
    }
  }, []);

  const createNewTab = (id: string, name: string): POSTab => ({
    id,
    name,
    createdAt: new Date(),
    cart: [],
    selectedCustomer: '',
    customerInput: '',
    orderDate: new Date().toISOString().split('T')[0],
    isProforma: false,
    proformaTitle: 'PROFORMA INVOICE',
    paymentMethod: 'Cash',
    particulars: '',
    delivery: { enabled: false, fee: 0, address: '' },
    amountPaid: 0,
    amountPaidEdited: false,
    editingSale: null,
    amountEdits: {},
  });

  const addTab = useCallback((name?: string) => {
    const newTabId = 'tab_' + Date.now();
    const tabName = name || `Order ${tabs.length + 1}`;
    const newTab = createNewTab(newTabId, tabName);
    setTabs(prev => [...prev, newTab]);
    setActiveTabId(newTabId);
    return newTabId;
  }, [tabs.length]);

  const closeTab = useCallback((tabId: string) => {
    if (tabs.length === 1) {
      alert('You must keep at least one order tab open');
      return;
    }

    setTabs(prev => prev.filter(t => t.id !== tabId));

    if (activeTabId === tabId) {
      // Switch to previous tab, or first remaining tab
      setTabs(prev => {
        const remaining = prev.filter(t => t.id !== tabId);
        if (remaining.length > 0) {
          setActiveTabId(remaining[remaining.length - 1].id);
        }
        return remaining;
      });
    }
  }, [activeTabId, tabs.length]);

  const switchTab = useCallback((tabId: string) => {
    if (tabs.find(t => t.id === tabId)) {
      setActiveTabId(tabId);
    }
  }, [tabs]);

  const updateTab = useCallback((tabId: string, updates: Partial<POSTab>) => {
    setTabs(prev =>
      prev.map(tab =>
        tab.id === tabId ? { ...tab, ...updates } : tab
      )
    );
  }, []);

  const getActiveTab = useCallback((): POSTab | null => {
    return tabs.find(t => t.id === activeTabId) || null;
  }, [tabs, activeTabId]);

  const clearAllTabs = useCallback(() => {
    const newTabId = 'tab_' + Date.now();
    setTabs([createNewTab(newTabId, 'Order 1')]);
    setActiveTabId(newTabId);
  }, []);

  const renameTab = useCallback((tabId: string, newName: string) => {
    if (newName.trim()) {
      updateTab(tabId, { name: newName.trim() });
    }
  }, [updateTab]);

  const duplicateTab = useCallback((tabId: string) => {
    const tabToDuplicate = tabs.find(t => t.id === tabId);
    if (!tabToDuplicate) return '';

    const newTabId = 'tab_' + Date.now();
    const newTab: POSTab = {
      ...tabToDuplicate,
      id: newTabId,
      name: `${tabToDuplicate.name} (Copy)`,
      createdAt: new Date(),
      cart: JSON.parse(JSON.stringify(tabToDuplicate.cart)), // Deep clone
    };

    setTabs(prev => [...prev, newTab]);
    setActiveTabId(newTabId);
    return newTabId;
  }, [tabs]);

  const value: POSTabContextType = {
    tabs,
    activeTabId,
    addTab,
    closeTab,
    switchTab,
    updateTab,
    getActiveTab,
    clearAllTabs,
    renameTab,
    duplicateTab,
  };

  return (
    <POSTabContext.Provider value={value}>
      {children}
    </POSTabContext.Provider>
  );
};

export const usePOSTab = () => {
  const context = useContext(POSTabContext);
  if (!context) {
    throw new Error('usePOSTab must be used within POSTabProvider');
  }
  return context;
};
