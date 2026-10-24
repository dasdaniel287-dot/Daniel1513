import React, { useState } from 'react';
import {
  AlertOctagon,
  Brain,
  CheckCircle2,
  Clock,
  Download,
  FileSpreadsheet,
  FileText,
  Filter,
  MessageSquare,
  Shield,
  ShieldAlert,
  ArrowRight
} from 'lucide-react';
import { SecurityIncident, IncidentSeverity, IncidentStatus } from '../types';

interface IncidentResponseCenterProps {
  incidents: SecurityIncident[];
  onUpdateStatus: (id: string, status: IncidentStatus) => Promise<void>;
  onAddNote: (id: string, text: string) => Promise<void>;
  onTriggerAi: (incident: SecurityIncident) => void;
  onOpenReport: (incident: SecurityIncident) => void;
}

export const IncidentResponseCenter: React.FC<IncidentResponseCenterProps> = ({
  incidents,
  onUpdateStatus,
  onAddNote,
  onTriggerAi,
  onOpenReport
}) => {
  const [selectedIncidentId, setSelectedIncidentId] = useState<string | null>(
    incidents[0]?.id || null
  );
  const [filterSeverity, setFilterSeverity] = useState<string>('ALL');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [newNoteText, setNewNoteText] = useState('');
  const [isSubmittingNote, setIsSubmittingNote] = useState(false);

  const selectedIncident = incidents.find((i) => i.id === selectedIncidentId) || incidents[0];

  const filteredIncidents = incidents.filter((inc) => {
    if (filterSeverity !== 'ALL' && inc.severity !== filterSeverity) return false;
    if (filterStatus !== 'ALL' && inc.status !== filterStatus) return false;
    return true;
  });

  const handleCreateNote = async () => {
    if (!newNoteText.trim() || !selectedIncident) return;
    setIsSubmittingNote(true);
    try {
      await onAddNote(selectedIncident.id, newNoteText.trim());
      setNewNoteText('');
    } finally {
      setIsSubmittingNote(false);
    }
  };

  const handleExportCsv = () => {
    const headers = ['ID', 'Title', 'Severity', 'Status', 'Detected At', 'Peak RPS', 'Peak Bandwidth (Mbps)', 'Affected Services'];
    const rows = incidents.map((i) => [
      i.id,
      `"${i.title.replace(/"/g, '""')}"`,
      i.severity,
      i.status,
      new Date(i.detectedAt).toISOString(),
      i.peakRps,
      i.peakBandwidthMbps,
      `"${i.affectedServices.join('; ')}"`
    ]);
    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `ddos_shield_incidents_${Date.now()}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const getSeverityBadge = (sev: IncidentSeverity) => {
    switch (sev) {
      case 'CRITICAL':
        return 'text-rose-400 font-bold';
      case 'HIGH':
        return 'text-orange-400 font-bold';
      case 'MEDIUM':
        return 'text-amber-400 font-bold';
      case 'LOW':
        return 'text-blue-400 font-bold';
      case 'INFORMATIONAL':
      default:
        return 'text-slate-400';
    }
  };

  const getStatusBadge = (stat: IncidentStatus) => {
    switch (stat) {
      case 'OPEN':
        return 'text-rose-400 font-semibold';
      case 'INVESTIGATING':
        return 'text-amber-400 font-semibold';
      case 'MITIGATING':
        return 'text-cyan-400 font-semibold';
      case 'RESOLVED':
        return 'text-emerald-400 font-semibold';
      case 'FALSE_POSITIVE':
        return 'text-slate-500 font-semibold';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
        <div>
          <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
            <AlertOctagon className="w-5 h-5 text-rose-400" /> Security Incident Response Center
          </h2>
          <p className="text-xs text-slate-400 font-mono mt-0.5">
            Triage, investigate, mitigate, and conduct post-incident reviews with forensic evidence.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCsv}
            className="px-3 py-1.5 rounded-lg border border-slate-800 bg-slate-900 hover:bg-slate-800 text-slate-300 font-mono text-xs flex items-center gap-1.5 transition-colors"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-cyan-400" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Filter Row */}
      <div className="flex flex-wrap items-center gap-3 text-xs font-mono">
        <span className="text-slate-500">Filter by:</span>

        {/* Severity */}
        <select
          value={filterSeverity}
          onChange={(e) => setFilterSeverity(e.target.value)}
          className="bg-slate-900 border border-slate-800 rounded px-2.5 py-1 text-slate-300 focus:outline-none"
        >
          <option value="ALL">All Severities</option>
          <option value="CRITICAL">Critical</option>
          <option value="HIGH">High</option>
          <option value="MEDIUM">Medium</option>
          <option value="LOW">Low</option>
        </select>

        {/* Status */}
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="bg-slate-900 border border-slate-800 rounded px-2.5 py-1 text-slate-300 focus:outline-none"
        >
          <option value="ALL">All Statuses</option>
          <option value="OPEN">Open</option>
          <option value="INVESTIGATING">Investigating</option>
          <option value="MITIGATING">Mitigating</option>
          <option value="RESOLVED">Resolved</option>
          <option value="FALSE_POSITIVE">False Positive</option>
        </select>

        <span className="text-slate-500 ml-auto">
          Showing {filteredIncidents.length} of {incidents.length} incidents
        </span>
      </div>

      {/* Main Split: Left Incident List, Right Inspector */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Incidents List */}
        <div className="lg:col-span-5 space-y-2">
          {filteredIncidents.map((inc) => {
            const isSelected = selectedIncident?.id === inc.id;
            return (
              <div
                key={inc.id}
                onClick={() => setSelectedIncidentId(inc.id)}
                className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                  isSelected
                    ? 'border-cyan-500/60 bg-cyan-950/20 shadow-md ring-1 ring-cyan-500/40'
                    : 'border-slate-800 bg-slate-900/50 hover:border-slate-700 hover:bg-slate-900'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] font-mono uppercase ${getSeverityBadge(inc.severity)}`}>
                      [{inc.severity}]
                    </span>
                    <span className="font-bold text-xs text-slate-200">{inc.id}</span>
                  </div>
                  <span className={`text-[11px] font-mono ${getStatusBadge(inc.status)}`}>
                    {inc.status}
                  </span>
                </div>

                <div className="font-semibold text-xs text-slate-100 mb-1 line-clamp-1">
                  {inc.title}
                </div>

                <div className="flex items-center gap-3 text-[10px] font-mono text-slate-400">
                  <span>{new Date(inc.detectedAt).toLocaleTimeString()}</span>
                  <span aria-hidden="true">·</span>
                  <span>Peak: {inc.peakRps} RPS</span>
                  <span aria-hidden="true">·</span>
                  <span className="text-cyan-400">{inc.confidenceScore}% Conf</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Right Column: Detailed Incident Inspector */}
        {selectedIncident ? (
          <div className="lg:col-span-7 p-5 rounded-xl border border-slate-800 bg-slate-900/60 space-y-5">
            {/* Incident Header */}
            <div className="border-b border-slate-800 pb-4 space-y-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2 font-mono text-xs">
                  <span className={getSeverityBadge(selectedIncident.severity)}>
                    [{selectedIncident.severity}]
                  </span>
                  <span className="font-bold text-slate-200">{selectedIncident.id}</span>
                  <span aria-hidden="true">·</span>
                  <span className={getStatusBadge(selectedIncident.status)}>
                    {selectedIncident.status}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onTriggerAi(selectedIncident)}
                    className="px-2.5 py-1 text-xs font-mono font-medium rounded bg-cyan-950 border border-cyan-500/40 text-cyan-300 hover:bg-cyan-900 transition-colors flex items-center gap-1.5"
                  >
                    <Brain className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Gemini AI Reason</span>
                  </button>

                  <button
                    onClick={() => onOpenReport(selectedIncident)}
                    className="px-2.5 py-1 text-xs font-mono font-medium rounded border border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700 transition-colors flex items-center gap-1.5"
                  >
                    <FileText className="w-3.5 h-3.5 text-slate-400" />
                    <span>Formal Report</span>
                  </button>
                </div>
              </div>

              <h3 className="text-base font-bold text-slate-100">{selectedIncident.title}</h3>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs font-mono text-slate-400 pt-1">
                <div>
                  <span className="text-slate-500">Detected: </span>
                  <span className="text-slate-300">{new Date(selectedIncident.detectedAt).toLocaleString()}</span>
                </div>
                {selectedIncident.resolvedAt && (
                  <div>
                    <span className="text-slate-500">Resolved: </span>
                    <span className="text-emerald-400">{new Date(selectedIncident.resolvedAt).toLocaleString()}</span>
                  </div>
                )}
                <div>
                  <span className="text-slate-500">Peak RPS: </span>
                  <span className="text-cyan-400 font-bold">{selectedIncident.peakRps} req/s</span>
                </div>
              </div>
            </div>

            {/* Status Workflow Action Buttons */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-mono text-slate-400 mr-1">Lifecycle Action:</span>
              <button
                onClick={() => onUpdateStatus(selectedIncident.id, 'INVESTIGATING')}
                className={`px-3 py-1 rounded text-xs font-mono border transition-colors ${
                  selectedIncident.status === 'INVESTIGATING'
                    ? 'border-amber-500 bg-amber-950 text-amber-300'
                    : 'border-slate-800 bg-slate-950 text-slate-300 hover:bg-slate-900'
                }`}
              >
                Investigate
              </button>
              <button
                onClick={() => onUpdateStatus(selectedIncident.id, 'MITIGATING')}
                className={`px-3 py-1 rounded text-xs font-mono border transition-colors ${
                  selectedIncident.status === 'MITIGATING'
                    ? 'border-cyan-500 bg-cyan-950 text-cyan-300'
                    : 'border-slate-800 bg-slate-950 text-slate-300 hover:bg-slate-900'
                }`}
              >
                Mitigate
              </button>
              <button
                onClick={() => onUpdateStatus(selectedIncident.id, 'RESOLVED')}
                className={`px-3 py-1 rounded text-xs font-mono border transition-colors ${
                  selectedIncident.status === 'RESOLVED'
                    ? 'border-emerald-500 bg-emerald-950 text-emerald-300'
                    : 'border-slate-800 bg-slate-950 text-slate-300 hover:bg-slate-900'
                }`}
              >
                Mark Resolved
              </button>
              <button
                onClick={() => onUpdateStatus(selectedIncident.id, 'FALSE_POSITIVE')}
                className={`px-3 py-1 rounded text-xs font-mono border transition-colors ${
                  selectedIncident.status === 'FALSE_POSITIVE'
                    ? 'border-slate-500 bg-slate-800 text-slate-300'
                    : 'border-slate-800 bg-slate-950 text-slate-400 hover:bg-slate-900'
                }`}
              >
                False Positive
              </button>
            </div>

            {/* Evidence Collection */}
            <div className="space-y-2">
              <span className="font-bold font-mono text-xs text-slate-300 uppercase">
                Forensic Evidence Collected
              </span>
              <div className="space-y-1.5">
                {selectedIncident.evidence.map((ev, i) => (
                  <div
                    key={i}
                    className="p-2.5 rounded bg-slate-950/70 border border-slate-800 font-mono text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-1"
                  >
                    <span className="text-cyan-400 font-bold">{ev.key}:</span>
                    <span className="text-slate-300">{ev.detail}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Mitigation History Log */}
            <div className="space-y-2">
              <span className="font-bold font-mono text-xs text-slate-300 uppercase">
                Defensive Mitigation History
              </span>
              <div className="space-y-1 text-xs font-mono">
                {selectedIncident.mitigationHistory.length === 0 ? (
                  <span className="text-slate-500">No automated actions taken yet.</span>
                ) : (
                  selectedIncident.mitigationHistory.map((m, i) => (
                    <div
                      key={i}
                      className="p-2 rounded bg-slate-950 border border-slate-900 flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-emerald-400">✓</span>
                        <span className="text-slate-300">{m.action}</span>
                      </div>
                      <span className="text-[10px] text-slate-500">
                        {new Date(m.timestamp).toLocaleTimeString()} ({m.operator})
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Operator Notes */}
            <div className="space-y-2 border-t border-slate-800 pt-3">
              <span className="font-bold font-mono text-xs text-slate-300 uppercase flex items-center gap-1.5">
                <MessageSquare className="w-3.5 h-3.5 text-cyan-400" /> Operator Collaboration Notes
              </span>

              <div className="space-y-2 max-h-40 overflow-y-auto">
                {selectedIncident.notes.map((n) => (
                  <div key={n.id} className="p-2.5 rounded bg-slate-950 border border-slate-900 text-xs font-mono">
                    <div className="flex justify-between text-[10px] text-slate-500 mb-1">
                      <span className="text-cyan-400 font-bold">{n.author}</span>
                      <span>{new Date(n.timestamp).toLocaleTimeString()}</span>
                    </div>
                    <p className="text-slate-300 leading-relaxed">{n.text}</p>
                  </div>
                ))}
              </div>

              <div className="flex gap-2 pt-2">
                <input
                  type="text"
                  placeholder="Add investigator note or post-mortem comment..."
                  value={newNoteText}
                  onChange={(e) => setNewNoteText(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleCreateNote()}
                  className="flex-1 bg-slate-950 border border-slate-800 rounded px-3 py-1.5 text-xs font-mono text-slate-200 focus:outline-none focus:border-cyan-500"
                />
                <button
                  onClick={handleCreateNote}
                  disabled={isSubmittingNote || !newNoteText.trim()}
                  className="px-3 py-1.5 rounded bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-slate-950 font-mono font-bold text-xs"
                >
                  Post Note
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="lg:col-span-7 p-12 text-center text-slate-500 font-mono text-xs">
            Select an incident to view details.
          </div>
        )}
      </div>
    </div>
  );
};
