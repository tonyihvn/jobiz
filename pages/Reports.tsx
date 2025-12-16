import React, { useState, useEffect } from 'react';
import DataTable, { Column } from '../components/Shared/DataTable';
import RichTextEditor from '../components/Shared/RichTextEditor';
import db from '../services/apiClient';
import { Report, Task } from '../types';
import { Plus, X, Save, Trash2, FileText, Link } from 'lucide-react';

const Reports = () => {
  const [reports, setReports] = useState<Report[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [showModal, setShowModal] = useState(false);
  
  // Form State
  const [newReport, setNewReport] = useState<Partial<Report>>({});

  useEffect(() => {
    (async () => { await refreshData(); })();
  }, []);

  const refreshData = async () => {
    try {
      const r = db.reports && db.reports.getAll ? await db.reports.getAll() : [];
      const t = db.tasks && db.tasks.getAll ? await db.tasks.getAll() : [];
      setReports(r || []);
      setTasks(t || []);
    } catch (e) {
      console.warn('Failed to refresh reports', e);
      setReports([]);
      setTasks([]);
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
      if (db.reports && db.reports.save) await db.reports.save([report, ...(await (db.reports.getAll ? db.reports.getAll() : []))]);
      else setReports(prev => [report, ...prev]);
    } catch (e) { console.warn('Save report failed', e); setReports(prev => [report, ...prev]); }
    setShowModal(false);
    setNewReport({});
    await refreshData();
  };

  const columns: Column<Report>[] = [
    { header: 'Date', accessor: (r) => new Date(r.createdAt).toLocaleDateString(), key: 'createdAt', sortable: true },
    { header: 'Title', accessor: 'title', key: 'title', sortable: true, filterable: true },
    { header: 'Category', accessor: 'category', key: 'category', sortable: true },
    { 
        header: 'Linked Task', 
        accessor: (r) => {
            if(!r.relatedTaskId) return '-';
            const t = tasks.find(task => task.id === r.relatedTaskId);
            return t ? t.title : 'Deleted Task';
        }, 
        key: 'relatedTaskId' 
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

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Reports</h1>
          <p className="text-slate-500">Generate and file reports.</p>
        </div>
        <button
          onClick={() => { setNewReport({}); setShowModal(true); }}
          className="bg-brand-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-brand-700 shadow-sm transition-all"
        >
          <Plus className="w-4 h-4" />
          New Report
        </button>
      </div>

      <DataTable data={reports} columns={columns} title="Filed Reports" />

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