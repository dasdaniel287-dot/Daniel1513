import React from 'react';
import { Play, Shield, RefreshCw, Zap, Server, KeyRound, Globe2 } from 'lucide-react';

interface ScenarioSimulatorProps {
  activeScenario: string;
  onSelectScenario: (scenario: string) => void;
  defenseMode: string;
}

export const ScenarioSimulator: React.FC<ScenarioSimulatorProps> = ({
  activeScenario,
  onSelectScenario,
  defenseMode
}) => {
  const scenarios = [
    {
      id: 'NORMAL',
      title: 'Normal Baseline Traffic',
      icon: <Server className="w-4 h-4 text-emerald-400" />,
      description: 'Healthy user requests (~28 req/s, 14 Mbps, 22ms latency, 0.1% error rate).',
      mechanics: 'Standard GET/POST traffic distributed organically across static assets and API routes.',
      tests: 'Baseline statistical stability without false-positive alerts.'
    },
    {
      id: 'HTTP_GET_FLOOD',
      title: 'Layer 7 HTTP GET Flood',
      icon: <Zap className="w-4 h-4 text-amber-400" />,
      description: 'Distributed L7 application flood hitting compute-heavy /api/search with query string randomization.',
      mechanics: '650+ req/s flood, 85% CPU saturation, elevated p95/p99 tail latency.',
      tests: 'Z-score 3σ threshold detection and token bucket rate-limiting enforcement.'
    },
    {
      id: 'SLOWLORIS',
      title: 'Slowloris Connection Starvation',
      icon: <RefreshCw className="w-4 h-4 text-rose-400" />,
      description: 'Stealthy low-and-slow socket pool exhaustion keeping 2,400+ connections open with partial headers.',
      mechanics: 'Extremely low bandwidth (1.2 Mbps) with 90%+ thread pool exhaustion.',
      tests: 'Socket duration ratio detection and client header timeout defense.'
    },
    {
      id: 'CREDENTIAL_STUFFING',
      title: 'Credential Stuffing (Auth Brute Force)',
      icon: <KeyRound className="w-4 h-4 text-cyan-400" />,
      description: 'Automated brute-force password spraying targeting /api/v1/auth/login.',
      mechanics: 'Surge in 401/403 HTTP error codes (>45% error ratio) across rotating IP subnets.',
      tests: 'Abnormal status code distribution alerts and IP velocity blocks.'
    },
    {
      id: 'VOLUMETRIC_SPIKE',
      title: 'Volumetric Ingress Spike',
      icon: <Globe2 className="w-4 h-4 text-purple-400" />,
      description: 'High-bandwidth ingress saturation exceeding 380 Mbps with packet queue pressure.',
      mechanics: 'Saturates network pipe; triggers automated circuit breaker load shedding.',
      tests: 'Bandwidth threshold alerts and circuit breaker graceful degradation.'
    }
  ];

  return (
    <div className="p-5 rounded-xl border border-slate-800 bg-slate-900/60 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
        <div>
          <h2 className="text-sm font-bold font-mono uppercase tracking-wider text-slate-100 flex items-center gap-2">
            <Play className="w-4 h-4 text-cyan-400" /> Controlled Attack & Scenario Simulator
          </h2>
          <p className="text-xs text-slate-400 font-mono mt-0.5">
            Safely inject bounded synthetic attack telemetry to validate detection algorithms and defensive policies.
          </p>
        </div>
        <div className="text-xs font-mono text-slate-400 flex items-center gap-2">
          <span>Shield Mode:</span>
          <span className={`font-bold ${defenseMode === 'ENFORCING' ? 'text-emerald-400' : 'text-amber-400'}`}>
            {defenseMode}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {scenarios.map((sc) => {
          const isSelected = activeScenario === sc.id;
          return (
            <div
              key={sc.id}
              onClick={() => onSelectScenario(sc.id)}
              className={`p-3.5 rounded-lg border cursor-pointer transition-all flex flex-col justify-between ${
                isSelected
                  ? 'border-cyan-500/60 bg-cyan-950/30 shadow-md shadow-cyan-950/40 ring-1 ring-cyan-500/40'
                  : 'border-slate-800 bg-slate-950/60 hover:border-slate-700 hover:bg-slate-900/50'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {sc.icon}
                    <span className="font-semibold text-xs text-slate-200">{sc.title}</span>
                  </div>
                  {isSelected && (
                    <span className="text-[10px] font-mono font-bold text-cyan-400 uppercase tracking-widest">
                      ACTIVE
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed mb-2">
                  {sc.description}
                </p>
              </div>

              <div className="border-t border-slate-900 pt-2 mt-2 space-y-1 text-[10px] font-mono text-slate-500">
                <div><span className="text-slate-400">Mechanics:</span> {sc.mechanics}</div>
                <div><span className="text-cyan-400">Validates:</span> {sc.tests}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
