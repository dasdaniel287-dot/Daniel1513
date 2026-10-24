import React from 'react';
import { AlertOctagon, Brain, ArrowUpRight, CheckCircle2, ShieldAlert, AlertTriangle, ShieldCheck } from 'lucide-react';
import { AnomalyAlert, IncidentSeverity } from '../types';

interface AnomalyAlertsPanelProps {
  alerts: AnomalyAlert[];
  onAnalyzeAi: (alert: AnomalyAlert) => void;
}

export const AnomalyAlertsPanel: React.FC<AnomalyAlertsPanelProps> = ({ alerts, onAnalyzeAi }) => {
  const getSeverityStyle = (severity: IncidentSeverity) => {
    switch (severity) {
      case 'CRITICAL':
        return 'text-rose-400 border-rose-500/40 bg-rose-950/20';
      case 'HIGH':
        return 'text-orange-400 border-orange-500/40 bg-orange-950/20';
      case 'MEDIUM':
        return 'text-amber-400 border-amber-500/40 bg-amber-950/20';
      case 'LOW':
        return 'text-blue-400 border-blue-500/40 bg-blue-950/20';
      case 'INFORMATIONAL':
      default:
        return 'text-slate-400 border-slate-700 bg-slate-900/40';
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
            <AlertOctagon className="w-5 h-5 text-amber-400" /> AI Anomaly Detection Engine
          </h2>
          <p className="text-xs text-slate-400 font-mono mt-0.5">
            Statistical 3σ Z-score deviation, socket saturation analysis, and false-positive evaluation.
          </p>
        </div>
        <div className="text-xs font-mono text-slate-400">
          <span>Active Alerts:</span> <span className="font-bold text-slate-200">{alerts.length}</span>
        </div>
      </div>

      {alerts.length === 0 ? (
        <div className="p-8 rounded-xl border border-slate-800 bg-slate-900/40 text-center">
          <ShieldCheck className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
          <h3 className="text-sm font-semibold text-slate-200">No Active Anomalies Detected</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
            All telemetry metrics (RPS, ingress bandwidth, connection pools, and status codes) are within normal baseline statistical distributions.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {alerts.map((alert) => {
            return (
              <div
                key={alert.id}
                className={`p-4 rounded-xl border ${getSeverityStyle(alert.severity)} transition-all`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-mono font-bold uppercase tracking-wider">
                      [{alert.severity}]
                    </span>
                    <span className="font-semibold text-sm text-slate-100">{alert.title}</span>
                    <span className="text-[11px] font-mono text-slate-400">
                      Confidence: {alert.confidenceScore}%
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-mono text-slate-400">
                      {new Date(alert.timestamp).toLocaleTimeString()}
                    </span>
                    <button
                      onClick={() => onAnalyzeAi(alert)}
                      className="px-2.5 py-1 text-xs font-mono font-medium rounded-md bg-cyan-950/80 border border-cyan-500/40 text-cyan-300 hover:bg-cyan-900/60 transition-colors flex items-center gap-1.5 shadow-sm"
                    >
                      <Brain className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Deep AI Analysis</span>
                    </button>
                  </div>
                </div>

                {/* Explanation */}
                <p className="text-xs text-slate-300 mb-3 leading-relaxed">
                  {alert.explanation}
                </p>

                {/* Indicators grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 mb-3 bg-slate-950/40 p-2.5 rounded-lg border border-slate-900 text-xs font-mono">
                  {alert.indicators.map((ind, i) => (
                    <div key={i} className="flex flex-col">
                      <span className="text-[10px] text-slate-500 uppercase">{ind.name}</span>
                      <span className="text-slate-200 font-bold">{ind.observedValue}</span>
                      <span className="text-[10px] text-slate-400">
                        Baseline: {ind.baselineValue} ({ind.deviation})
                      </span>
                    </div>
                  ))}
                </div>

                {/* Action summary */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs font-mono pt-2 border-t border-slate-800/80 gap-2">
                  <div className="flex items-center gap-2 text-slate-300">
                    <span className="text-cyan-400 font-semibold">Recommended Action:</span>
                    <span>{alert.recommendedAction}</span>
                  </div>
                  {alert.dryRunAction && (
                    <span className="text-[11px] text-amber-400/90 font-medium">
                      {alert.dryRunAction}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
