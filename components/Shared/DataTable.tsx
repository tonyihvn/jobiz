import React, { useState, useMemo, useEffect } from 'react';
import { ArrowUpDown, Search, Download, ChevronLeft, ChevronRight } from 'lucide-react';

export interface Column<T> {
  header: string;
  accessor: keyof T | ((item: T) => React.ReactNode);
  key: string;
  sortable?: boolean;
  filterable?: boolean;
  /** Plain value used for CSV export (avoids exporting React elements as "[object Object]"). */
  exportValue?: (item: T) => string | number;
  /** When true, the sum of this column (over the filtered rows) is shown in the table footer. */
  summable?: boolean;
  /** Numeric extractor used when summing. Falls back to exportValue, then the raw field value. */
  sumValue?: (item: T) => number;
  /** Formats the computed sum for display (e.g. adds a currency symbol). */
  sumFormatter?: (sum: number) => React.ReactNode;
}

interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  onRowClick?: (item: T) => void;
  title?: string;
  actions?: React.ReactNode;
}

const exportToExcel = <T extends Record<string, any>>(data: T[], columns: Column<T>[], filename: string) => {
  try {
    // Get visible headers
    const headers = columns.filter(col => col.key !== 'actions').map(col => col.header);
    const keys = columns.filter(col => col.key !== 'actions').map(col => col.key);

    let csv = headers.join(',') + '\n';
    
    data.forEach(row => {
      const values = keys.map(key => {
        const col = columns.find(c => c.key === key);
        let val: any;

        if (col && typeof col.exportValue === 'function') {
          // Prefer an explicit plain-text/number export value.
          val = col.exportValue(row);
        } else if (col && typeof col.accessor === 'function') {
          val = col.accessor(row);
          if (typeof val === 'string') {
            // Remove HTML if present
            val = val.replace(/<[^>]*>/g, '');
          } else if (val !== null && typeof val === 'object') {
            // React element / object cannot be exported as text — skip it.
            val = '';
          }
        } else {
          val = row[key];
        }

        val = (val === null || typeof val === 'undefined') ? '' : String(val);
        // Escape quotes and wrap if it contains a comma, quote or newline
        return (val.includes(',') || val.includes('"') || val.includes('\n')) ? `"${val.replace(/"/g, '""')}"` : val;
      });
      csv += values.join(',') + '\n';
    });

    // Download
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } catch (e) {
    console.warn('Export failed', e);
    alert('Failed to export data');
  }
};

const PAGE_SIZE_OPTIONS = [25, 50, 100, 200];

const DataTable = <T extends Record<string, any>>({ data, columns, onRowClick, title, actions }: DataTableProps<T>) => {
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

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
        const col = columns.find(c => c.key === key);
        let rawValue = (item as any)[key];
        
        if (col && typeof col.accessor === 'function') {
          rawValue = col.accessor(item);
          if (typeof rawValue === 'string') {
            rawValue = rawValue.replace(/<[^>]*>/g, '');
          }
        }
        
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

  // Paginate the processed rows so we never render thousands of DOM nodes at once.
  const totalRows = processedData.length;
  const totalPages = Math.max(1, Math.ceil(totalRows / pageSize));
  const currentPage = Math.min(page, totalPages);

  // Reset to the first page whenever the underlying data, filters, sort or page size change.
  useEffect(() => { setPage(1); }, [data, filters, sortConfig, pageSize]);

  const pagedData = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return processedData.slice(start, start + pageSize);
  }, [processedData, currentPage, pageSize]);

  const firstRow = totalRows === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const lastRow = Math.min(currentPage * pageSize, totalRows);

  // Sum of "summable" columns computed over the currently filtered rows.
  const summableColumns = columns.filter(c => c.summable);
  const columnSums = useMemo(() => {
    const sums: Record<string, number> = {};
    for (const col of summableColumns) {
      let s = 0;
      for (const item of processedData) {
        let n: number;
        if (col.sumValue) n = Number(col.sumValue(item));
        else if (col.exportValue) n = Number(col.exportValue(item));
        else n = Number((item as any)[col.key]);
        if (Number.isFinite(n)) s += n;
      }
      sums[col.key] = s;
    }
    return sums;
  }, [processedData, columns]);

  return (
    <div className="bg-white shadow-sm rounded-lg border border-slate-200 overflow-hidden">
      <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
        <h2 className="text-lg font-semibold text-slate-800">{title || 'Data List'}</h2>
        <div className="flex gap-2">
          <button
            onClick={() => exportToExcel(processedData, columns, `${title || 'data'}_${new Date().toISOString().split('T')[0]}.csv`)}
            className="bg-green-600 text-white px-3 py-1.5 rounded-lg flex items-center gap-2 hover:bg-green-700 text-sm transition-colors"
          >
            <Download size={16} /> Export
          </button>
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
                    {(col.filterable !== false && col.key !== 'actions') && (
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
            {pagedData.length > 0 ? (
              pagedData.map((item, idx) => (
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
          {summableColumns.length > 0 && totalRows > 0 && (
            <tfoot className="bg-slate-100 border-t-2 border-slate-300 font-bold text-slate-800">
              <tr>
                {columns.map((col, i) => {
                  if (col.summable) {
                    const s = columnSums[col.key] || 0;
                    return <td key={col.key} className="p-3 font-mono">{col.sumFormatter ? col.sumFormatter(s) : s}</td>;
                  }
                  // Show a label in the first non-summable column.
                  if (i === 0) return <td key={col.key} className="p-3">Total ({totalRows})</td>;
                  return <td key={col.key} className="p-3"></td>;
                })}
              </tr>
            </tfoot>
          )}
        </table>
      </div>
      {totalRows > 0 && (
        <div className="p-3 border-t border-slate-200 flex flex-col sm:flex-row justify-between items-center gap-3 bg-slate-50 text-sm text-slate-600">
          <div className="flex items-center gap-2">
            <span>Rows per page:</span>
            <select
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value))}
              className="border border-slate-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-brand-500"
            >
              {PAGE_SIZE_OPTIONS.map(size => (
                <option key={size} value={size}>{size}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-3">
            <span>{firstRow}–{lastRow} of {totalRows}</span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={currentPage <= 1}
                className="p-1.5 rounded border border-slate-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-white"
                title="Previous page"
              >
                <ChevronLeft size={16} />
              </button>
              <span className="px-2">Page {currentPage} of {totalPages}</span>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage >= totalPages}
                className="p-1.5 rounded border border-slate-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-white"
                title="Next page"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DataTable;