import React, { useState, useEffect } from 'react';
import DataTable, { Column } from '../components/Shared/DataTable';
import db from '../services/apiClient';
import { AuditLog } from '../types';
import { Activity, X } from 'lucide-react';

const AuditTrails = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const l = db.audit && db.audit.getAll ? await db.audit.getAll() : [];
        setLogs(l || []);
      } catch (e) { console.warn('Failed to load audit logs', e); setLogs([]); }
    })();
  }, []);

  const handleViewDetails = (log: AuditLog) => {
    setSelectedLog(log);
    setShowModal(true);
  };

  const columns: Column<AuditLog>[] = [
    { header: 'Time', accessor: (l) => new Date(l.timestamp).toLocaleString(), key: 'timestamp', sortable: true },
    { header: 'User', accessor: 'userName', key: 'userName', filterable: true },
    { header: 'Action', accessor: 'action', key: 'action', filterable: true },
    { header: 'Resource', accessor: 'resource', key: 'resource', filterable: true },
    { header: 'Details', accessor: (l) => <span className="truncate max-w-xs block text-slate-600">{String(l.details || '').substring(0, 50)}{String(l.details || '').length > 50 ? '...' : ''}</span>, key: 'details' },
    { header: 'Action', accessor: (l) => <button onClick={() => handleViewDetails(l)} className="px-3 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 text-sm font-medium">View</button>, key: 'view' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Audit Trails</h1>
          <p className="text-slate-500">System logs and user activity history.</p>
        </div>
      </div>

      <div className="bg-white p-4 rounded-lg shadow-sm border border-slate-200 mb-4 flex items-center gap-2 text-sm text-slate-600">
         <Activity size={18} />
         <span>Showing {logs.length} logged activities. Logs are stored in the database.</span>
      </div>

      <DataTable data={logs} columns={columns} title="Activity Logs" />

      {/* Details Modal */}
      {showModal && selectedLog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm">
          <div className="bg-white p-6 rounded-xl w-full max-w-2xl shadow-2xl max-h-96 overflow-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-slate-800">Activity Details</h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600">
                <X size={24} />
              </button>
            </div>
            
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="font-semibold text-slate-600">Time</p>
                  <p className="text-slate-800">{new Date(selectedLog.timestamp).toLocaleString()}</p>
                </div>
                <div>
                  <p className="font-semibold text-slate-600">User</p>
                  <p className="text-slate-800">{selectedLog.userName}</p>
                </div>
                <div>
                  <p className="font-semibold text-slate-600">Action</p>
                  <p className="text-slate-800 capitalize">{selectedLog.action}</p>
                </div>
                <div>
                  <p className="font-semibold text-slate-600">Resource</p>
                  <p className="text-slate-800 capitalize">{selectedLog.resource}</p>
                </div>
              </div>

              <div>
                <p className="font-semibold text-slate-600 mb-2">Details</p>
                <div className="bg-slate-50 p-3 rounded border border-slate-200 max-h-48 overflow-auto">
                  <pre className="text-xs text-slate-700 whitespace-pre-wrap break-words">
                    {selectedLog.details ? JSON.stringify(JSON.parse(String(selectedLog.details)), null, 2) : 'No details'}
                  </pre>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-slate-200">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 bg-slate-200 text-slate-800 rounded hover:bg-slate-300 font-medium">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AuditTrails;
