import React, { useState } from 'react';
import { BarChart3, Globe2, ShieldCheck, Eye, EyeOff, Clock, Server, ArrowDownRight } from 'lucide-react';
import { TopTargetUri, GeoDistribution } from '../types';

interface TrafficAnalyticsProps {
  topUris: TopTargetUri[];
  geoDistribution: GeoDistribution[];
  privacyMask: boolean;
  onTogglePrivacy: (val: boolean) => void;
}

export const TrafficAnalytics: React.FC<TrafficAnalyticsProps> = ({
  topUris,
  geoDistribution,
  privacyMask,
  onTogglePrivacy
}) => {
  const [timeWindow, setTimeWindow] = useState<'5m' | '15m' | '1h' | '24h'>('15m');

  const methodsData = [
    { method: 'GET', percentage: 74, count: '148,200', color: 'bg-cyan-500' },
    { method: 'POST', percentage: 19, count: '38,100', color: 'bg-emerald-500' },
    { method: 'HEAD', percentage: 4, count: '8,020', color: 'bg-purple-500' },
    { method: 'PUT', percentage: 2, count: '4,010', color: 'bg-amber-500' },
    { method: 'DELETE', percentage: 1, count: '2,005', color: 'bg-rose-500' }
  ];

  return (
    <div className="space-y-6">
      {/* Controls Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
        <div>
          <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-cyan-400" /> Deep Traffic Telemetry & Geolocation
          </h2>
          <p className="text-xs text-slate-400 font-mono mt-0.5">
            Path velocity analysis, HTTP verb distribution, and geographic threat correlation.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Time Window Selector (Interactive segmented control) */}
          <div className="flex items-center gap-1 p-1 bg-slate-900 border border-slate-800 rounded-lg text-xs font-mono">
            {(['5m', '15m', '1h', '24h'] as const).map((w) => (
              <button
                key={w}
                onClick={() => setTimeWindow(w)}
                className={`px-2.5 py-1 rounded transition-colors ${
                  timeWindow === w
                    ? 'bg-cyan-950 text-cyan-300 font-bold border border-cyan-500/40'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {w}
              </button>
            ))}
          </div>

          {/* Privacy Redaction Toggle */}
          <button
            onClick={() => onTogglePrivacy(!privacyMask)}
            className={`px-3 py-1.5 rounded-lg border font-mono text-xs flex items-center gap-1.5 transition-colors ${
              privacyMask
                ? 'border-emerald-500/50 bg-emerald-950/30 text-emerald-300'
                : 'border-slate-800 bg-slate-900 text-slate-400 hover:text-slate-200'
            }`}
            title="Masks IP octets to protect user privacy (GDPR / CCPA mode)"
          >
            {privacyMask ? <EyeOff className="w-3.5 h-3.5 text-emerald-400" /> : <Eye className="w-3.5 h-3.5" />}
            <span>{privacyMask ? 'PII Masking Active' : 'Mask IPs'}</span>
          </button>
        </div>
      </div>

      {/* HTTP Methods & Protocol Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="p-5 rounded-xl border border-slate-800 bg-slate-900/60 lg:col-span-1 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <h3 className="font-bold font-mono text-sm text-slate-200">HTTP Methods</h3>
            <span className="text-[11px] font-mono text-slate-500">Window: {timeWindow}</span>
          </div>

          <div className="space-y-3">
            {methodsData.map((m) => (
              <div key={m.method} className="space-y-1 font-mono text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-300 font-bold">{m.method}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-500">{m.count} reqs</span>
                    <span className="text-slate-200 font-semibold">{m.percentage}%</span>
                  </div>
                </div>
                <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                  <div className={`h-full ${m.color}`} style={{ width: `${m.percentage}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top Targeted URIs & Endpoints */}
        <div className="p-5 rounded-xl border border-slate-800 bg-slate-900/60 lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <h3 className="font-bold font-mono text-sm text-slate-200">Top Targeted Endpoints & Paths</h3>
            <span className="text-[11px] font-mono text-slate-500">Sorted by Velocity</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead>
                <tr className="border-b border-slate-800 text-slate-500 uppercase text-[10px]">
                  <th className="py-2 px-3">Target Endpoint</th>
                  <th className="py-2 px-3">Total Requests</th>
                  <th className="py-2 px-3">Bandwidth (MB)</th>
                  <th className="py-2 px-3">Error Rate</th>
                  <th className="py-2 px-3 text-right">Threat Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {topUris.map((u) => {
                  let badge = 'text-slate-400';
                  if (u.threatLevel === 'TARGETED') badge = 'text-rose-400 font-bold';
                  if (u.threatLevel === 'ELEVATED') badge = 'text-amber-400 font-bold';

                  return (
                    <tr key={u.uri} className="hover:bg-slate-800/30 transition-colors">
                      <td className="py-2.5 px-3 font-semibold text-slate-200">{u.uri}</td>
                      <td className="py-2.5 px-3 text-slate-300">{u.requestsCount.toLocaleString()}</td>
                      <td className="py-2.5 px-3 text-slate-400">{u.bandwidthMb} MB</td>
                      <td className="py-2.5 px-3">
                        <span className={u.errorRate > 10 ? 'text-rose-400 font-bold' : 'text-slate-400'}>
                          {u.errorRate}%
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <span className={badge}>{u.threatLevel}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Geolocation & Origin Summary */}
      <div className="p-5 rounded-xl border border-slate-800 bg-slate-900/60 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
          <div>
            <h3 className="font-bold font-mono text-sm text-slate-200 flex items-center gap-2">
              <Globe2 className="w-4 h-4 text-cyan-400" /> Geographic Origin & ASN Threat Distribution
            </h3>
            <p className="text-xs text-slate-400 font-mono mt-0.5">
              Aggregated traffic origin breakdown derived from non-sensitive IP routing telemetry.
            </p>
          </div>
          <span className="text-[11px] font-mono text-slate-500">
            Compliant with Zero-PII Collection Standards
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {geoDistribution.map((geo) => {
            return (
              <div
                key={geo.countryCode}
                className="p-3 rounded-lg border border-slate-800 bg-slate-950/60 space-y-2 font-mono text-xs"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-200">{geo.countryCode}</span>
                    <span className="text-slate-400 text-[11px]">{geo.countryName}</span>
                  </div>
                  <span className="text-cyan-400 font-bold">{geo.percentage}%</span>
                </div>

                <div className="text-[11px] text-slate-400">
                  {geo.requestCount.toLocaleString()} total reqs
                </div>

                <div>
                  <div className="flex justify-between text-[10px] text-slate-500 mb-0.5">
                    <span>Threat Ratio</span>
                    <span className={geo.threatPercentage > 50 ? 'text-rose-400 font-bold' : 'text-slate-400'}>
                      {geo.threatPercentage}%
                    </span>
                  </div>
                  <div className="w-full bg-slate-800 h-1 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${geo.threatPercentage > 50 ? 'bg-rose-500' : 'bg-emerald-500'}`}
                      style={{ width: `${geo.threatPercentage}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
