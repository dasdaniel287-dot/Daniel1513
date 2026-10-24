import React from 'react';
import { X, Printer, Shield, CheckCircle2, AlertOctagon } from 'lucide-react';
import { SecurityIncident } from '../types';

interface IncidentReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  incident: SecurityIncident | null;
}

export const IncidentReportModal: React.FC<IncidentReportModalProps> = ({
  isOpen,
  onClose,
  incident
}) => {
  if (!isOpen || !incident) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm select-none">
      <div className="w-full max-w-4xl max-h-[90vh] bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        {/* Modal Controls Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60 print:hidden">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-200 text-sm font-mono">Formal Security Incident Report</span>
            <span className="text-slate-500 font-mono text-xs">({incident.id})</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-mono font-bold text-xs flex items-center gap-1.5 transition-colors"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print / Save as PDF</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-100 rounded-lg hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Document Content */}
        <div className="p-8 overflow-y-auto space-y-6 text-slate-200 bg-slate-900 font-sans print:p-0 print:bg-white print:text-black">
          {/* Header */}
          <div className="border-b border-slate-800 pb-5 flex justify-between items-start">
            <div>
              <div className="flex items-center gap-2 text-cyan-400 font-mono font-bold text-lg mb-1">
                <Shield className="w-6 h-6" />
                <span>DDoS Shield AI 2.0 — Post-Incident Forensic Report</span>
              </div>
              <h1 className="text-xl font-bold text-slate-100">{incident.title}</h1>
              <div className="text-xs text-slate-400 font-mono mt-1 flex gap-4">
                <span>Reference ID: <strong>{incident.id}</strong></span>
                <span>Severity: <strong className="text-rose-400">{incident.severity}</strong></span>
                <span>Status: <strong className="text-emerald-400">{incident.status}</strong></span>
              </div>
            </div>

            <div className="text-right text-xs font-mono text-slate-500">
              <div>Generated: {new Date().toLocaleDateString()}</div>
              <div>SOC EDGE DEFENSE SYSTEM</div>
            </div>
          </div>

          {/* Key Metrics Overview */}
          <div className="grid grid-cols-4 gap-4 p-4 rounded-xl bg-slate-950/60 border border-slate-800 font-mono text-xs">
            <div>
              <span className="text-slate-500 uppercase text-[10px] block">Detected At</span>
              <span className="font-bold text-slate-200">{new Date(incident.detectedAt).toLocaleTimeString()}</span>
            </div>
            <div>
              <span className="text-slate-500 uppercase text-[10px] block">Peak Velocity</span>
              <span className="font-bold text-cyan-400">{incident.peakRps} req/s</span>
            </div>
            <div>
              <span className="text-slate-500 uppercase text-[10px] block">Peak Bandwidth</span>
              <span className="font-bold text-purple-400">{incident.peakBandwidthMbps} Mbps</span>
            </div>
            <div>
              <span className="text-slate-500 uppercase text-[10px] block">Threat Confidence</span>
              <span className="font-bold text-emerald-400">{incident.confidenceScore}%</span>
            </div>
          </div>

          {/* AI Forensic Diagnosis */}
          {incident.aiAnalysis && (
            <div className="space-y-2">
              <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-cyan-400">
                AI Forensic Analysis & Root Cause
              </h3>
              <div className="p-4 rounded-xl border border-cyan-500/20 bg-cyan-950/10 space-y-2 text-xs leading-relaxed font-mono">
                <div>
                  <span className="text-slate-400 font-bold">Attack Classification: </span>
                  <span className="text-slate-100">{incident.aiAnalysis.attackClassification}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-bold">Root Cause Hypothesis: </span>
                  <span className="text-slate-300">{incident.aiAnalysis.rootCauseHypothesis}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-bold">False-Positive Assessment: </span>
                  <span className="text-emerald-400">{incident.aiAnalysis.falsePositiveLikelihood} likelihood</span>
                  <span className="text-slate-400"> — {incident.aiAnalysis.falsePositiveReasoning}</span>
                </div>
              </div>
            </div>
          )}

          {/* Evidence Gathered */}
          <div className="space-y-2">
            <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-400">
              Corroborating Telemetry & Evidence
            </h3>
            <div className="space-y-1.5 font-mono text-xs">
              {incident.evidence.map((ev, i) => (
                <div key={i} className="p-2.5 rounded bg-slate-950/60 border border-slate-800/80 flex justify-between">
                  <span className="text-cyan-400 font-bold">{ev.key}:</span>
                  <span className="text-slate-300">{ev.detail}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Mitigation Actions Executed */}
          <div className="space-y-2">
            <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-400">
              Mitigation Actions Enforced
            </h3>
            <div className="space-y-1.5 font-mono text-xs">
              {incident.mitigationHistory.map((m, i) => (
                <div key={i} className="p-2.5 rounded bg-slate-950/60 border border-slate-800/80 flex justify-between">
                  <span className="text-emerald-400">✓ {m.action}</span>
                  <span className="text-slate-500">
                    {new Date(m.timestamp).toLocaleTimeString()} ({m.operator})
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Operator Sign-off */}
          <div className="border-t border-slate-800 pt-6 mt-6 flex justify-between items-end font-mono text-xs text-slate-500">
            <div>
              <div>DDoS Shield AI Defense Platform v2.0</div>
              <div>Autonomous Anomaly Classifier & Rate Limiter</div>
            </div>
            <div className="text-right">
              <div className="border-b border-slate-700 w-48 mb-1" />
              <div>Incident Commander Sign-Off</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
