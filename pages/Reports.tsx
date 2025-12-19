import React, { useState, useEffect } from 'react';
import DataTable, { Column } from '../components/Shared/DataTable';
import RichTextEditor from '../components/Shared/RichTextEditor';
import db from '../services/apiClient';
import { authFetch } from '../services/auth';
import { Report, Task } from '../types';
import { Plus, X, Save, Trash2, FileText, Link, Download, BarChart3 } from 'lucide-react';
import { fmt } from '../services/format';
import { useCurrency } from '../services/CurrencyContext';

type ReportType = 'sales' | 'services' | 'account_heads' | 'all';

interface GeneratedReport {
  type: ReportType;
  dateFrom: string;
  dateTo: string;
  data: any[];
  summary?: any;
}

const Reports = () => {
  const { symbol } = useCurrency();
  const [reports, setReports] = useState<Report[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [generatedReport, setGeneratedReport] = useState<GeneratedReport | null>(null);
  
  // Form State
  const [newReport, setNewReport] = useState<Partial<Report>>({});
  const [reportType, setReportType] = useState<ReportType>('sales');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [accountHeadFilter, setAccountHeadFilter] = useState<'all' | 'individual'>('all');
  const [selectedAccountHead, setSelectedAccountHead] = useState('');
  const [accountHeads, setAccountHeads] = useState<any[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    (async () => { await refreshData(); })();
  }, []);

  const refreshData = async () => {
    try {
      const r = db.reports && db.reports.getAll ? await db.reports.getAll() : [];
      const t = db.tasks && db.tasks.getAll ? await db.tasks.getAll() : [];
      const heads = db.accountHeads && db.accountHeads.getAll ? await db.accountHeads.getAll() : [];
      setReports(r || []);
      setTasks(t || []);
      setAccountHeads(heads || []);
    } catch (e) {
      console.warn('Failed to refresh reports', e);
      setReports([]);
      setTasks([]);
      setAccountHeads([]);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Delete this report?')) {
      try { if (db.reports && db.reports.delete) await db.reports.delete(id); } catch (e) { console.warn('Delete failed', e); }
      await refreshData();
    }
  };

  const handleSave = async () => {
    if (!newReport.title || !newReport.content) return;

    const currentUser = await (db.auth && db.auth.getCurrentUser ? db.auth.getCurrentUser() : Promise.resolve(null));

    const report: Report = {
      id: Date.now().toString(),
      businessId: (currentUser && currentUser.businessId) || '',
      title: newReport.title!,
      content: newReport.content!,
      relatedTaskId: newReport.relatedTaskId,
      createdBy: (currentUser && (currentUser.name || currentUser.email)) || 'Admin',
      createdAt: new Date().toISOString(),
      category: newReport.category || 'General'
    };

    try {
      if (db.reports && db.reports.add) await db.reports.add(report);
      else setReports(prev => [report, ...prev]);
    } catch (e) { console.warn('Save report failed', e); setReports(prev => [report, ...prev]); }
    setShowModal(false);
    setNewReport({});
    await refreshData();
  };

  const generateReport = async () => {
    if (!dateFrom || !dateTo) {
      alert('Please select both from and to dates');
      return;
    }

    setIsGenerating(true);
    try {
      const payload = {
        dateFrom,
        dateTo,
        ...(reportType === 'account_heads' && { filter: accountHeadFilter, accountHead: selectedAccountHead })
      };

      const response = await authFetch(`/api/reports/generate/${reportType}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to generate report');
      }
      const data = await response.json();
      
      setGeneratedReport({
        type: reportType,
        dateFrom,
        dateTo,
        data: data.data || [],
        summary: data.summary
      });
      setShowGenerateModal(false);
    } catch (e) {
      console.error('Failed to generate report', e);
      alert(`Failed to generate report: ${e instanceof Error ? e.message : 'Unknown error'}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const downloadExcel = () => {
    if (!generatedReport) return;

    try {
      // Create CSV content
      let csv = `Report Type: ${generatedReport.type}\nDate Range: ${generatedReport.dateFrom} to ${generatedReport.dateTo}\n\n`;
      
      if (generatedReport.data.length === 0) {
        csv += 'No data available';
      } else {
        const keys = Object.keys(generatedReport.data[0]);
        csv += keys.join(',') + '\n';
        generatedReport.data.forEach(row => {
          csv += keys.map(k => {
            const val = row[k];
            return typeof val === 'string' && val.includes(',') ? `"${val}"` : val;
          }).join(',') + '\n';
        });
      }

      // Download
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Report_${generatedReport.type}_${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (e) {
      console.warn('Download failed', e);
      alert('Failed to download report');
    }
  };

  const columns: Column<Report>[] = [
    { header: 'Date', accessor: (r) => new Date(r.createdAt).toLocaleDateString(), key: 'createdAt', sortable: true, filterable: true },
    { header: 'Title', accessor: 'title', key: 'title', sortable: true, filterable: true },
    { header: 'Category', accessor: 'category', key: 'category', sortable: true, filterable: true },
    { 
        header: 'Linked Task', 
        accessor: (r) => {
            if(!r.relatedTaskId) return '-';
            const t = tasks.find(task => task.id === r.relatedTaskId);
            return t ? t.title : 'Deleted Task';
        }, 
        key: 'relatedTaskId',
        filterable: true
    },
    {
      header: 'Actions',
      accessor: (item: Report) => (
        <button onClick={() => handleDelete(item.id)} className="text-red-600 hover:bg-red-50 p-1 rounded">
            <Trash2 size={16} />
        </button>
      ),
      key: 'actions'
    }
  ];

  if (generatedReport) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Generated Report: {generatedReport.type}</h1>
            <p className="text-slate-500">Period: {generatedReport.dateFrom} to {generatedReport.dateTo}</p>
          </div>
          <div className="flex gap-2">
            <button onClick={downloadExcel} className="bg-green-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-green-700">
              <Download size={18} /> Download Excel
            </button>
            <button onClick={() => setGeneratedReport(null)} className="bg-slate-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-slate-700">
              <X size={18} /> Close
            </button>
          </div>
        </div>

        {generatedReport.summary && (
          <div className="grid grid-cols-3 gap-4">
            {Object.entries(generatedReport.summary).map(([key, val]: [string, any]) => (
              <div key={key} className="bg-gradient-to-br from-brand-50 to-brand-100 p-4 rounded-lg border border-brand-200">
                <p className="text-sm text-slate-600 mb-1">{key}</p>
                <p className="text-2xl font-bold text-brand-900">{typeof val === 'number' ? fmt(val) : val}</p>
              </div>
            ))}
          </div>
        )}

        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-100 text-slate-700 font-medium border-b border-slate-200">
                <tr>
                  {generatedReport.data.length > 0 && Object.keys(generatedReport.data[0]).map(key => (
                    <th key={key} className="p-3 text-left">{key}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {generatedReport.data.map((row, idx) => (
                  <tr key={idx} className="border-b border-slate-100 hover:bg-slate-50">
                    {Object.values(row).map((val, i) => (
                      <td key={i} className="p-3 text-slate-700">{typeof val === 'number' ? fmt(val) : String(val)}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Reports</h1>
          <p className="text-slate-500">Generate and file reports.</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowGenerateModal(true)}
            className="bg-green-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-green-700 shadow-sm transition-all"
          >
            <BarChart3 className="w-4 h-4" />
            Generate Report
          </button>
          <button
            onClick={() => { setNewReport({}); setShowModal(true); }}
            className="bg-brand-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-brand-700 shadow-sm transition-all"
          >
            <Plus className="w-4 h-4" />
            New Report
          </button>
        </div>
      </div>

      <DataTable data={reports} columns={columns} title="Filed Reports" />

      {/* Generate Report Modal */}
      {showGenerateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm">
          <div className="bg-white p-6 rounded-xl w-full max-w-md shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-slate-800">Generate Report</h3>
              <button onClick={() => setShowGenerateModal(false)} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Report Type</label>
                <select
                  className="w-full border rounded-lg p-2.5"
                  value={reportType}
                  onChange={e => setReportType(e.target.value as ReportType)}
                >
                  <option value="sales">Sales</option>
                  <option value="services">Services</option>
                  <option value="account_heads">Account Heads</option>
                  <option value="all">All Transactions</option>
                </select>
              </div>

              {reportType === 'account_heads' && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Filter</label>
                  <select
                    className="w-full border rounded-lg p-2.5"
                    value={accountHeadFilter}
                    onChange={e => setAccountHeadFilter(e.target.value as 'all' | 'individual')}
                  >
                    <option value="all">All Account Heads</option>
                    <option value="individual">Specific Account Head</option>
                  </select>
                  {accountHeadFilter === 'individual' && (
                    <select
                      className="w-full border rounded-lg p-2.5 mt-2"
                      value={selectedAccountHead}
                      onChange={e => setSelectedAccountHead(e.target.value)}
                    >
                      <option value="">Select Account Head...</option>
                      {accountHeads.map(h => <option key={h.id} value={h.title}>{h.title}</option>)}
                    </select>
                  )}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">From Date</label>
                  <input
                    type="date"
                    className="w-full border rounded-lg p-2.5"
                    value={dateFrom}
                    onChange={e => setDateFrom(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">To Date</label>
                  <input
                    type="date"
                    className="w-full border rounded-lg p-2.5"
                    value={dateTo}
                    onChange={e => setDateTo(e.target.value)}
                  />
                </div>
              </div>

              <button
                onClick={generateReport}
                disabled={isGenerating}
                className="w-full bg-green-600 text-white py-3 rounded-lg font-bold hover:bg-green-700 disabled:bg-slate-400"
              >
                {isGenerating ? 'Generating...' : 'Generate Report'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* File Report Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm">
          <div className="bg-white p-6 rounded-xl w-full max-w-lg shadow-2xl h-[90vh] flex flex-col">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-slate-800">Create Report</h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
            </div>

            <div className="space-y-4 overflow-y-auto flex-1 pr-2">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Report Title</label>
                <input
                  type="text"
                  className="w-full border rounded-lg p-2.5 outline-none"
                  value={newReport.title}
                  onChange={e => setNewReport({ ...newReport, title: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Category</label>
                    <input
                      type="text"
                      className="w-full border rounded-lg p-2.5 outline-none"
                      value={newReport.category}
                      onChange={e => setNewReport({ ...newReport, category: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Link Task (Optional)</label>
                    <select
                        className="w-full border rounded-lg p-2.5 outline-none"
                        value={newReport.relatedTaskId || ''}
                        onChange={e => setNewReport({ ...newReport, relatedTaskId: e.target.value })}
                    >
                        <option value="">No Linked Task</option>
                        {tasks.map(t => <option key={t.id} value={t.id}>{t.title}</option>)}
                    </select>
                  </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Content</label>
                <RichTextEditor
                  className="h-96"
                  value={newReport.content || ''}
                  onChange={(val) => setNewReport({ ...newReport, content: val })}
                  placeholder="Report details..."
                />
              </div>
            </div>

            <button onClick={handleSave} className="w-full bg-brand-600 text-white py-3 rounded-lg font-bold hover:bg-brand-700 flex justify-center items-center gap-2 mt-4">
                <Save size={18} /> File Report
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Reports;