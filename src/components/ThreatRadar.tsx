import React from 'react';
import { ShieldCheck, ShieldAlert, AlertTriangle } from 'lucide-react';
import { TelemetryPoint } from '../types';

interface ThreatRadarProps {
  latest: TelemetryPoint;
  scenario: string;
}

export const ThreatRadar: React.FC<ThreatRadarProps> = ({ latest, scenario }) => {
  const score = latest.anomalyScore;

  let threatLevel: 'LOW' | 'ELEVATED' | 'CRITICAL' = 'LOW';
  let badgeColor = 'text-emerald-400';
  let icon = <ShieldCheck className="w-5 h-5 text-emerald-400" />;
  let label = 'Nominal / Normal Operations';

  if (score >= 70) {
    threatLevel = 'CRITICAL';
    badgeColor = 'text-rose-400';
    icon = <ShieldAlert className="w-5 h-5 text-rose-400 animate-pulse" />;
    label = 'Active Attack Under Mitigation';
  } else if (score >= 35) {
    threatLevel = 'ELEVATED';
    badgeColor = 'text-amber-400';
    icon = <AlertTriangle className="w-5 h-5 text-amber-400" />;
    label = 'Elevated Anomaly Detected';
  }

  // Calculate simulated vector distributions
  const volumetricPct = scenario === 'VOLUMETRIC_SPIKE' ? 95 : (score > 40 ? 45 : 10);
  const l7FloodPct = scenario === 'HTTP_GET_FLOOD' ? 90 : (score > 40 ? 55 : 12);
  const slowlorisPct = scenario === 'SLOWLORIS' ? 92 : (score > 40 ? 25 : 5);
  const authAbusePct = scenario === 'CREDENTIAL_STUFFING' ? 88 : (score > 40 ? 30 : 8);

  return (
    <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/60 flex flex-col justify-between">
      <div className="flex items-center justify-between text-xs font-mono mb-2">
        <span className="text-slate-400 font-medium uppercase tracking-wide text-[11px]">Threat Threat Index</span>
        <div className="flex items-center gap-1.5 font-bold font-mono text-[11px]">
          {icon}
          <span className={badgeColor}>{label}</span>
        </div>
      </div>

      {/* Main Score Center */}
      <div className="flex items-center justify-center my-3">
        <div className="relative flex items-center justify-center">
          <svg className="w-32 h-32 transform -rotate-90">
            <circle
              cx="64"
              cy="64"
              r="52"
              stroke="#1e293b"
              strokeWidth="10"
              fill="transparent"
            />
            <circle
              cx="64"
              cy="64"
              r="52"
              stroke={score >= 70 ? '#f43f5e' : score >= 35 ? '#f59e0b' : '#10b981'}
              strokeWidth="10"
              strokeDasharray={2 * Math.PI * 52}
              strokeDashoffset={2 * Math.PI * 52 * (1 - score / 100)}
              strokeLinecap="round"
              fill="transparent"
              className="transition-all duration-500 ease-out"
            />
          </svg>
          <div className="absolute flex flex-col items-center">
            <span className="text-3xl font-bold font-mono tracking-tighter text-slate-100">
              {score}
            </span>
            <span className="text-[10px] font-mono text-slate-500 uppercase">Score / 100</span>
          </div>
        </div>
      </div>

      {/* Threat Vector Decomposition */}
      <div className="space-y-2 border-t border-slate-800 pt-3 text-[11px] font-mono">
        <div>
          <div className="flex justify-between text-slate-400 mb-0.5">
            <span>Volumetric (L3/L4)</span>
            <span className={volumetricPct > 50 ? 'text-rose-400 font-bold' : 'text-slate-300'}>{volumetricPct}%</span>
          </div>
          <div className="w-full bg-slate-800 h-1 rounded-full overflow-hidden">
            <div className={`h-full ${volumetricPct > 50 ? 'bg-rose-500' : 'bg-cyan-500'}`} style={{ width: `${volumetricPct}%` }} />
          </div>
        </div>

        <div>
          <div className="flex justify-between text-slate-400 mb-0.5">
            <span>HTTP Flood (L7)</span>
            <span className={l7FloodPct > 50 ? 'text-rose-400 font-bold' : 'text-slate-300'}>{l7FloodPct}%</span>
          </div>
          <div className="w-full bg-slate-800 h-1 rounded-full overflow-hidden">
            <div className={`h-full ${l7FloodPct > 50 ? 'bg-rose-500' : 'bg-cyan-500'}`} style={{ width: `${l7FloodPct}%` }} />
          </div>
        </div>

        <div>
          <div className="flex justify-between text-slate-400 mb-0.5">
            <span>Socket Starvation (Slowloris)</span>
            <span className={slowlorisPct > 50 ? 'text-rose-400 font-bold' : 'text-slate-300'}>{slowlorisPct}%</span>
          </div>
          <div className="w-full bg-slate-800 h-1 rounded-full overflow-hidden">
            <div className={`h-full ${slowlorisPct > 50 ? 'bg-rose-500' : 'bg-cyan-500'}`} style={{ width: `${slowlorisPct}%` }} />
          </div>
        </div>

        <div>
          <div className="flex justify-between text-slate-400 mb-0.5">
            <span>Credential Stuffing / Auth Abuse</span>
            <span className={authAbusePct > 50 ? 'text-rose-400 font-bold' : 'text-slate-300'}>{authAbusePct}%</span>
          </div>
          <div className="w-full bg-slate-800 h-1 rounded-full overflow-hidden">
            <div className={`h-full ${authAbusePct > 50 ? 'bg-rose-500' : 'bg-cyan-500'}`} style={{ width: `${authAbusePct}%` }} />
          </div>
        </div>
      </div>
    </div>
  );
};
