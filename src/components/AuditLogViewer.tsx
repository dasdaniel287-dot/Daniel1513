import React, { useState } from 'react';
import { FileText, ShieldCheck, Search, Filter, Hash, Check } from 'lucide-react';
import { AuditLogEntry } from '../types';

interface AuditLogViewerProps {
  logs: AuditLogEntry[];
}

export const AuditLogViewer: React.FC<AuditLogViewerProps> = ({ logs }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [resultFilter, setResultFilter] = useState<string>('ALL');

  const filteredLogs = logs.filter((log) => {
    if (resultFilter !== 'ALL' && log.result !== resultFilter) return false;
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      const match =
        log.action.toLowerCase().includes(q) ||
        log.operator.toLowerCase().includes(q) ||
        (log.target && log.target.toLowerCase().includes(q)) ||
        log.details.toLowerCase().includes(q);
      if (!match) return false;
    }
    return true;
  });

  const getResultStyle = (res: AuditLogEntry['result']) => {
    switch (res) {
      case 'SUCCESS':
        return 'text-emerald-400 font-bold';
      case 'WARNING':
        return 'text-amber-400 font-bold';
      case 'DENIED':
        return 'text-rose-400 font-bold';
      case 'DRY_RUN':
        return 'text-cyan-400 font-bold';
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
        <div>
          <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
            <FileText className="w-5 h-5 text-cyan-400" /> Immutable Audit & Compliance Trail
          </h2>
          <p className="text-xs text-slate-400 font-mono mt-0.5">
            Tamper-evident log of all mitigation policies, configuration changes, and operator actions with SHA-256 chaining.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono text-emerald-400 bg-emerald-950/40 border border-emerald-500/30 px-3 py-1.5 rounded-lg">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>SHA-256 Chained Integrity Verified</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs font-mono">
        <div className="relative w-full sm:w-72">
          <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search action, IP, or operator..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-9 pr-3 py-1.5 text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-cyan-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <span className="text-slate-500">Result:</span>
          <select
            value={resultFilter}
            onChange={(e) => setResultFilter(e.target.value)}
            className="bg-slate-900 border border-slate-800 rounded px-2.5 py-1 text-slate-300 focus:outline-none"
          >
            <option value="ALL">All Results</option>
            <option value="SUCCESS">Success</option>
            <option value="DRY_RUN">Dry-Run</option>
            <option value="WARNING">Warning</option>
            <option value="DENIED">Denied</option>
          </select>
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/60 overflow-x-auto">
        <table className="w-full text-left text-xs font-mono">
          <thead>
            <tr className="border-b border-slate-800 text-slate-500 uppercase text-[10px]">
              <th className="py-2.5 px-3">Timestamp</th>
              <th className="py-2.5 px-3">Action</th>
              <th className="py-2.5 px-3">Operator</th>
              <th className="py-2.5 px-3">Target</th>
              <th className="py-2.5 px-3">Result</th>
              <th className="py-2.5 px-3">Details</th>
              <th className="py-2.5 px-3">SHA-256 Hash</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {filteredLogs.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-8 text-center text-slate-500">
                  No audit log entries matching filter.
                </td>
              </tr>
            ) : (
              filteredLogs.map((log) => {
                return (
                  <tr key={log.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-2.5 px-3 text-slate-400 whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </td>
                    <td className="py-2.5 px-3 font-bold text-slate-200 whitespace-nowrap">
                      {log.action}
                    </td>
                    <td className="py-2.5 px-3 text-cyan-400 font-semibold whitespace-nowrap">
                      {log.operator}
                    </td>
                    <td className="py-2.5 px-3 text-slate-300 whitespace-nowrap">
                      {log.target || '—'}
                    </td>
                    <td className={`py-2.5 px-3 whitespace-nowrap ${getResultStyle(log.result)}`}>
                      {log.result}
                    </td>
                    <td className="py-2.5 px-3 text-slate-300 max-w-sm truncate" title={log.details}>
                      {log.details}
                    </td>
                    <td className="py-2.5 px-3 text-[10px] text-slate-600 font-mono whitespace-nowrap" title={log.hash}>
                      {log.hash.substring(0, 12)}...
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
