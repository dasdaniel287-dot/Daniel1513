import React from 'react';
import { TelemetryPoint } from '../types';

interface LatencyHistogramProps {
  latest: TelemetryPoint;
}

export const LatencyHistogram: React.FC<LatencyHistogramProps> = ({ latest }) => {
  const totalCodes = 
    latest.statusCodes['2xx'] + 
    latest.statusCodes['3xx'] + 
    latest.statusCodes['4xx'] + 
    latest.statusCodes['5xx'] || 1;

  const pct2xx = Math.round((latest.statusCodes['2xx'] / totalCodes) * 100);
  const pct3xx = Math.round((latest.statusCodes['3xx'] / totalCodes) * 100);
  const pct4xx = Math.round((latest.statusCodes['4xx'] / totalCodes) * 100);
  const pct5xx = Math.max(0, 100 - pct2xx - pct3xx - pct4xx);

  return (
    <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/60 space-y-4">
      <div>
        <div className="flex items-center justify-between text-xs font-mono mb-2">
          <span className="text-slate-400 font-medium uppercase tracking-wide text-[11px]">Latency Distribution</span>
          <span className="text-cyan-400 font-bold">p99: {latest.p99LatencyMs}ms</span>
        </div>

        <div className="space-y-2">
          <div>
            <div className="flex justify-between text-[11px] font-mono text-slate-400 mb-1">
              <span>p50 (Median)</span>
              <span className="text-slate-200">{latest.avgLatencyMs} ms</span>
            </div>
            <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
              <div 
                className="bg-emerald-400 h-full transition-all duration-300"
                style={{ width: `${Math.min(100, (latest.avgLatencyMs / 200) * 100)}%` }}
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between text-[11px] font-mono text-slate-400 mb-1">
              <span>p95 (Degradation)</span>
              <span className="text-slate-200">{latest.p95LatencyMs} ms</span>
            </div>
            <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
              <div 
                className="bg-amber-400 h-full transition-all duration-300"
                style={{ width: `${Math.min(100, (latest.p95LatencyMs / 400) * 100)}%` }}
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between text-[11px] font-mono text-slate-400 mb-1">
              <span>p99 (Tail Latency)</span>
              <span className="text-slate-200">{latest.p99LatencyMs} ms</span>
            </div>
            <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
              <div 
                className="bg-rose-400 h-full transition-all duration-300"
                style={{ width: `${Math.min(100, (latest.p99LatencyMs / 800) * 100)}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="border-t border-slate-800 pt-3">
        <div className="flex items-center justify-between text-xs font-mono mb-2">
          <span className="text-slate-400 font-medium uppercase tracking-wide text-[11px]">HTTP Status Codes</span>
          <span className="text-slate-400 text-[11px]">{totalCodes} req/s total</span>
        </div>

        {/* Stacked bar */}
        <div className="w-full h-2 rounded-full overflow-hidden flex bg-slate-800 mb-2">
          <div style={{ width: `${pct2xx}%` }} className="bg-emerald-500 transition-all duration-300" title={`2xx: ${pct2xx}%`} />
          <div style={{ width: `${pct3xx}%` }} className="bg-cyan-500 transition-all duration-300" title={`3xx: ${pct3xx}%`} />
          <div style={{ width: `${pct4xx}%` }} className="bg-amber-500 transition-all duration-300" title={`4xx: ${pct4xx}%`} />
          <div style={{ width: `${pct5xx}%` }} className="bg-rose-500 transition-all duration-300" title={`5xx: ${pct5xx}%`} />
        </div>

        <div className="grid grid-cols-4 gap-1 text-[10px] font-mono">
          <div className="text-emerald-400 flex flex-col">
            <span className="text-slate-500">2xx OK</span>
            <span className="font-bold">{pct2xx}%</span>
          </div>
          <div className="text-cyan-400 flex flex-col">
            <span className="text-slate-500">3xx REDIR</span>
            <span className="font-bold">{pct3xx}%</span>
          </div>
          <div className="text-amber-400 flex flex-col">
            <span className="text-slate-500">4xx CLIENT</span>
            <span className="font-bold">{pct4xx}%</span>
          </div>
          <div className="text-rose-400 flex flex-col">
            <span className="text-slate-500">5xx SERVER</span>
            <span className="font-bold">{pct5xx}%</span>
          </div>
        </div>
      </div>
    </div>
  );
};
