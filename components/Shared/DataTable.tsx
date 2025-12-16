import React, { useState, useMemo } from 'react';
import { ArrowUpDown, Search } from 'lucide-react';

export interface Column<T> {
  header: string;
  accessor: keyof T | ((item: T) => React.ReactNode);
  key: string;
  sortable?: boolean;
  filterable?: boolean;
}

interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  onRowClick?: (item: T) => void;
  title?: string;
  actions?: React.ReactNode;
}

const DataTable = <T extends Record<string, any>>({ data, columns, onRowClick, title, actions }: DataTableProps<T>) => {
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);
  const [filters, setFilters] = useState<Record<string, string>>({});

  const handleSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const processedData = useMemo(() => {
    let processed = [...data];

    // Filtering
    processed = processed.filter(item => {
      return Object.entries(filters).every(([key, value]) => {
        if (!value) return true;
        const rawValue = (item as any)[key];
        const itemValue = (rawValue !== null && rawValue !== undefined ? String(rawValue) : '').toLowerCase();
        return itemValue.includes(String(value).toLowerCase());
      });
    });

    // Sorting
    if (sortConfig) {
      processed.sort((a, b) => {
        const aValue = a[sortConfig.key];
        const bValue = b[sortConfig.key];
        
        if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return processed;
  }, [data, filters, sortConfig]);

  return (
    <div className="bg-white shadow-sm rounded-lg border border-slate-200 overflow-hidden">
      <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
        <h2 className="text-lg font-semibold text-slate-800">{title || 'Data List'}</h2>
        <div className="flex gap-2">
          {actions}
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm text-slate-600">
          <thead className="bg-slate-100 text-slate-700 font-medium">
            <tr>
              {columns.map(col => (
                <th key={col.key} className="p-3 border-b border-slate-200 min-w-[150px]">
                  <div className="flex flex-col gap-2">
                    <div 
                      className={`flex items-center gap-1 ${col.sortable ? 'cursor-pointer hover:text-brand-600' : ''}`}
                      onClick={() => col.sortable && handleSort(col.key)}
                    >
                      {col.header}
                      {col.sortable && <ArrowUpDown className="w-3 h-3" />}
                    </div>
                    {col.filterable && (
                      <div className="relative">
                        <Search className="w-3 h-3 absolute left-2 top-2.5 text-slate-400" />
                        <input
                          type="text"
                          placeholder={`Filter...`}
                          className="w-full pl-7 p-1 text-xs border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-brand-500"
                          onChange={(e) => handleFilterChange(col.key, e.target.value)}
                        />
                      </div>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {processedData.length > 0 ? (
              processedData.map((item, idx) => (
                <tr 
                  key={idx} 
                  className={`border-b border-slate-100 hover:bg-slate-50 transition-colors ${onRowClick ? 'cursor-pointer' : ''}`}
                  onClick={() => onRowClick && onRowClick(item)}
                >
                  {columns.map(col => (
                    <td key={col.key} className="p-3">
                      {typeof col.accessor === 'function' ? col.accessor(item) : item[col.accessor as string]}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={columns.length} className="p-8 text-center text-slate-400">
                  No records found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default DataTable;