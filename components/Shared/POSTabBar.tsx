import React, { useState } from 'react';
import { Plus, X, Edit2, Copy, ChevronDown } from 'lucide-react';
import { usePOSTab, POSTab } from '../../services/POSTabContext';

interface TabBarProps {
  onTabRendered?: (tabId: string) => void;
}

export const POSTabBar: React.FC<TabBarProps> = ({ onTabRendered }) => {
  const { tabs, activeTabId, addTab, closeTab, switchTab, renameTab, duplicateTab } = usePOSTab();
  const [renamingTabId, setRenamingTabId] = useState<string | null>(null);
  const [renameInput, setRenameInput] = useState('');
  const [openMenuTabId, setOpenMenuTabId] = useState<string | null>(null);

  const handleRenameClick = (tab: POSTab) => {
    setRenamingTabId(tab.id);
    setRenameInput(tab.name);
    setOpenMenuTabId(null);
  };

  const handleRenameSubmit = (tabId: string) => {
    renameTab(tabId, renameInput);
    setRenamingTabId(null);
  };

  const handleAddTab = () => {
    addTab();
  };

  const handleDuplicateTab = (tabId: string) => {
    duplicateTab(tabId);
  };

  return (
    <div className="flex items-center gap-1 bg-slate-100 border-b border-slate-300 px-2 py-2 overflow-x-auto">
      {/* Tab List */}
      <div className="flex gap-1 flex-1 min-w-0">
        {tabs.map((tab) => (
          <div
            key={tab.id}
            className={`flex items-center gap-2 px-3 py-2 rounded-t-lg whitespace-nowrap cursor-pointer transition-colors relative group ${
              activeTabId === tab.id
                ? 'bg-white border-t-2 border-t-blue-600 shadow-md'
                : 'bg-slate-200 hover:bg-slate-300'
            }`}
            onClick={() => switchTab(tab.id)}
          >
            {renamingTabId === tab.id ? (
              <input
                autoFocus
                type="text"
                value={renameInput}
                onChange={(e) => setRenameInput(e.target.value)}
                onBlur={() => handleRenameSubmit(tab.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleRenameSubmit(tab.id);
                  if (e.key === 'Escape') setRenamingTabId(null);
                }}
                className="px-2 py-1 border border-blue-400 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              <>
                <span className="text-sm font-medium text-slate-700">{tab.name}</span>
                {tab.cart.length > 0 && (
                  <span className="ml-1 text-xs bg-blue-500 text-white rounded-full px-2 py-0.5">
                    {tab.cart.length} items
                  </span>
                )}
              </>
            )}

            {/* Tab Menu Dropdown */}
            <div className="relative">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setOpenMenuTabId(openMenuTabId === tab.id ? null : tab.id);
                }}
                className="ml-1 p-1 hover:bg-slate-300 rounded opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <ChevronDown className="w-3 h-3 text-slate-600" />
              </button>

              {openMenuTabId === tab.id && (
                <div className="absolute right-0 top-full mt-0.5 bg-white border border-slate-300 rounded-lg shadow-lg z-10 min-w-[140px]">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRenameClick(tab);
                    }}
                    className="w-full text-left px-3 py-2 hover:bg-slate-100 text-sm flex items-center gap-2 border-b border-slate-200"
                  >
                    <Edit2 className="w-3 h-3" />
                    Rename
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDuplicateTab(tab.id);
                    }}
                    className="w-full text-left px-3 py-2 hover:bg-slate-100 text-sm flex items-center gap-2 border-b border-slate-200"
                  >
                    <Copy className="w-3 h-3" />
                    Duplicate
                  </button>
                  {tabs.length > 1 && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        closeTab(tab.id);
                        setOpenMenuTabId(null);
                      }}
                      className="w-full text-left px-3 py-2 hover:bg-red-50 text-sm flex items-center gap-2 text-red-600"
                    >
                      <X className="w-3 h-3" />
                      Close
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Close Button - visible only on hover and if more than 1 tab */}
            {tabs.length > 1 && !renamingTabId && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  closeTab(tab.id);
                }}
                className="ml-1 p-0.5 hover:bg-red-500 hover:text-white rounded opacity-0 group-hover:opacity-100 transition-opacity"
                title="Close tab"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Add Tab Button */}
      <button
        onClick={handleAddTab}
        className="flex items-center gap-1 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg ml-2 flex-shrink-0 font-medium text-sm"
        title="Add new order"
      >
        <Plus className="w-4 h-4" />
        <span className="hidden sm:inline">New Order</span>
      </button>
    </div>
  );
};
