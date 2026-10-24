import React, { useState } from 'react';
import {
  Shield,
  ShieldAlert,
  ShieldCheck,
  Lock,
  Plus,
  Trash2,
  AlertTriangle,
  Zap,
  Clock,
  Globe2,
  Server,
  CheckCircle,
  HelpCircle
} from 'lucide-react';
import { MitigationSettings, BlockedIpEntry, AllowedIpEntry, DefenseMode } from '../types';

interface MitigationControlsProps {
  settings: MitigationSettings;
  blockedIps: BlockedIpEntry[];
  allowedIps: AllowedIpEntry[];
  onUpdateSettings: (settings: Partial<MitigationSettings>) => Promise<void>;
  onBlockIp: (params: { ip: string; reason: string; durationMinutes: number | null }) => Promise<void>;
  onUnblockIp: (ip: string) => Promise<void>;
  onAddAllowedIp: (cidr: string, desc: string) => Promise<void>;
  onRemoveAllowedIp: (cidr: string) => Promise<void>;
  onToggleCircuitBreaker: (trip: boolean) => Promise<void>;
}

export const MitigationControls: React.FC<MitigationControlsProps> = ({
  settings,
  blockedIps,
  allowedIps,
  onUpdateSettings,
  onBlockIp,
  onUnblockIp,
  onAddAllowedIp,
  onRemoveAllowedIp,
  onToggleCircuitBreaker
}) => {
  // Modal states
  const [showBlockModal, setShowBlockModal] = useState(false);
  const [blockIpVal, setBlockIpVal] = useState('');
  const [blockReasonVal, setBlockReasonVal] = useState('');
  const [blockDurationVal, setBlockDurationVal] = useState<number | null>(15);
  const [blockError, setBlockError] = useState<string | null>(null);

  const [showAllowModal, setShowAllowModal] = useState(false);
  const [allowCidrVal, setAllowCidrVal] = useState('');
  const [allowDescVal, setAllowDescVal] = useState('');

  // Threshold edit states
  const [localRps, setLocalRps] = useState(settings.rpsThresholdPerIp);
  const [localBurst, setLocalBurst] = useState(settings.burstCapacity);
  const [settingsSaved, setSettingsSaved] = useState(false);

  const handleModeChange = async (mode: DefenseMode) => {
    await onUpdateSettings({ defenseMode: mode });
  };

  const handleSaveThresholds = async () => {
    await onUpdateSettings({
      rpsThresholdPerIp: Number(localRps),
      burstCapacity: Number(localBurst)
    });
    setSettingsSaved(true);
    setTimeout(() => setSettingsSaved(false), 2000);
  };

  const handleConfirmBlock = async () => {
    setBlockError(null);
    try {
      await onBlockIp({
        ip: blockIpVal.trim(),
        reason: blockReasonVal.trim() || 'Manual administrator block',
        durationMinutes: blockDurationVal
      });
      setShowBlockModal(false);
      setBlockIpVal('');
      setBlockReasonVal('');
    } catch (err: any) {
      setBlockError(err.message || 'Block failed');
    }
  };

  const handleConfirmAllow = async () => {
    if (!allowCidrVal) return;
    await onAddAllowedIp(allowCidrVal.trim(), allowDescVal.trim() || 'Trusted internal service');
    setShowAllowModal(false);
    setAllowCidrVal('');
    setAllowDescVal('');
  };

  return (
    <div className="space-y-6">
      {/* Top Banner: Defense Mode Strategy */}
      <div className="p-5 rounded-xl border border-slate-800 bg-slate-900/60 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
          <div>
            <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
              <Shield className="w-5 h-5 text-cyan-400" /> Automated Defensive Protection Engine
            </h2>
            <p className="text-xs text-slate-400 font-mono mt-0.5">
              Select active enforcement level, configure token bucket limits, and manage quarantine lists.
            </p>
          </div>
          <div className="flex items-center gap-1.5 text-xs font-mono text-cyan-400">
            <Lock className="w-4 h-4" />
            <span>Anti-Lockout Invariant Active</span>
          </div>
        </div>

        {/* Mode Selector */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div
            onClick={() => handleModeChange('DRY_RUN')}
            className={`p-4 rounded-xl border cursor-pointer transition-all ${
              settings.defenseMode === 'DRY_RUN'
                ? 'border-amber-500/60 bg-amber-950/20 ring-1 ring-amber-500/50'
                : 'border-slate-800 bg-slate-950/60 hover:border-slate-700'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="font-bold text-xs text-amber-400 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4" /> DRY-RUN MODE (Recommended)
              </span>
              {settings.defenseMode === 'DRY_RUN' && (
                <span className="text-[10px] font-mono text-amber-400 font-bold uppercase">SELECTED</span>
              )}
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Detects and simulates rate limits, quotas, and quarantines without dropping traffic. Zero risk of service disruption.
            </p>
          </div>

          <div
            onClick={() => handleModeChange('ENFORCING')}
            className={`p-4 rounded-xl border cursor-pointer transition-all ${
              settings.defenseMode === 'ENFORCING'
                ? 'border-emerald-500/60 bg-emerald-950/20 ring-1 ring-emerald-500/50'
                : 'border-slate-800 bg-slate-950/60 hover:border-slate-700'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="font-bold text-xs text-emerald-400 flex items-center gap-1.5">
                <Shield className="w-4 h-4" /> ACTIVE ENFORCING
              </span>
              {settings.defenseMode === 'ENFORCING' && (
                <span className="text-[10px] font-mono text-emerald-400 font-bold uppercase">SELECTED</span>
              )}
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Actively enforces 429 rate limit drops, quarantines hostile abusive IPs, and trips circuit breakers when needed.
            </p>
          </div>

          <div
            onClick={() => handleModeChange('LOCKDOWN')}
            className={`p-4 rounded-xl border cursor-pointer transition-all ${
              settings.defenseMode === 'LOCKDOWN'
                ? 'border-rose-500/60 bg-rose-950/20 ring-1 ring-rose-500/50'
                : 'border-slate-800 bg-slate-950/60 hover:border-slate-700'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="font-bold text-xs text-rose-400 flex items-center gap-1.5">
                <ShieldAlert className="w-4 h-4" /> EMERGENCY LOCKDOWN
              </span>
              {settings.defenseMode === 'LOCKDOWN' && (
                <span className="text-[10px] font-mono text-rose-400 font-bold uppercase">SELECTED</span>
              )}
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Strict perimeter clamp. Only pre-approved trusted allowlist CIDRs can connect. All unauthenticated requests dropped.
            </p>
          </div>
        </div>
      </div>

      {/* Rate Limit Configuration & Circuit Breaker */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Token Bucket Policy */}
        <div className="p-5 rounded-xl border border-slate-800 bg-slate-900/60 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <h3 className="font-bold font-mono text-sm text-slate-200">Token Bucket Velocity Thresholds</h3>
            <span className="text-[11px] font-mono text-slate-500">Per Client Remote IP</span>
          </div>

          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-xs font-mono text-slate-300 mb-1.5">
                <span>RPS Velocity Threshold:</span>
                <span className="text-cyan-400 font-bold">{localRps} req/s</span>
              </div>
              <input
                type="range"
                min="10"
                max="500"
                step="5"
                value={localRps}
                onChange={(e) => setLocalRps(Number(e.target.value))}
                className="w-full accent-cyan-400 cursor-pointer"
              />
              <span className="text-[10px] text-slate-500 font-mono">
                Continuous sustained rate permitted before token exhaustion.
              </span>
            </div>

            <div>
              <div className="flex justify-between text-xs font-mono text-slate-300 mb-1.5">
                <span>Burst Token Capacity:</span>
                <span className="text-cyan-400 font-bold">{localBurst} requests</span>
              </div>
              <input
                type="range"
                min="20"
                max="1000"
                step="10"
                value={localBurst}
                onChange={(e) => setLocalBurst(Number(e.target.value))}
                className="w-full accent-cyan-400 cursor-pointer"
              />
              <span className="text-[10px] text-slate-500 font-mono">
                Short spikes absorbed without triggering rate-limiting errors.
              </span>
            </div>

            <div className="pt-2 flex items-center justify-between">
              <span className="text-[11px] font-mono text-slate-400">
                Auto-Quarantine: 15 Minutes TTL
              </span>
              <button
                onClick={handleSaveThresholds}
                className="px-3.5 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-mono font-bold text-xs transition-colors shadow-sm"
              >
                {settingsSaved ? 'Saved!' : 'Apply Policy'}
              </button>
            </div>
          </div>
        </div>

        {/* Circuit Breaker & Safe-Degradation */}
        <div className="p-5 rounded-xl border border-slate-800 bg-slate-900/60 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <h3 className="font-bold font-mono text-sm text-slate-200 flex items-center gap-2">
              <Zap className="w-4 h-4 text-rose-400" /> Circuit Breaker & Load Shedding
            </h3>
            <span className={`text-[11px] font-mono font-bold ${settings.circuitBreakerTripped ? 'text-rose-400' : 'text-emerald-400'}`}>
              {settings.circuitBreakerTripped ? 'TRIPPED (SHEDDING)' : 'STANDBY (READY)'}
            </span>
          </div>

          <p className="text-xs text-slate-400 leading-relaxed">
            When hardware utilization breaches safety limits (CPU &gt; {settings.circuitBreakerCpuThreshold}% or RAM &gt; {settings.circuitBreakerRamThreshold}%), the circuit breaker sheds non-essential API endpoints, returning 503 Service Degraded with <code className="text-cyan-300">Retry-After: 30</code>.
          </p>

          <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-2 text-xs font-mono">
            <div className="flex justify-between">
              <span className="text-slate-400">CPU Load Shed Trigger:</span>
              <span className="text-slate-200">{settings.circuitBreakerCpuThreshold}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">RAM Load Shed Trigger:</span>
              <span className="text-slate-200">{settings.circuitBreakerRamThreshold}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Health Probe Bypass:</span>
              <span className="text-emerald-400">Enabled (/health, /api/telemetry)</span>
            </div>
          </div>

          <div className="pt-2 flex items-center justify-between">
            <span className="text-[11px] text-slate-500 font-mono">
              Manual Override:
            </span>
            <button
              onClick={() => onToggleCircuitBreaker(!settings.circuitBreakerTripped)}
              className={`px-3 py-1.5 rounded-lg font-mono font-bold text-xs transition-colors ${
                settings.circuitBreakerTripped
                  ? 'bg-emerald-600 hover:bg-emerald-500 text-slate-950'
                  : 'bg-rose-950/80 hover:bg-rose-900 border border-rose-500/40 text-rose-300'
              }`}
            >
              {settings.circuitBreakerTripped ? 'Reset Circuit Breaker' : 'Force Trip Circuit Breaker'}
            </button>
          </div>
        </div>
      </div>

      {/* Quarantined Hostile IP Blocklist */}
      <div className="p-5 rounded-xl border border-slate-800 bg-slate-900/60 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
          <div>
            <h3 className="font-bold font-mono text-sm text-slate-200 flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-rose-400" /> Active Quarantine Blocklist ({blockedIps.length} IPs)
            </h3>
            <p className="text-xs text-slate-400 font-mono mt-0.5">
              Hostile client IP addresses actively quarantined by DDoS Shield AI. Temporary bans expire automatically.
            </p>
          </div>

          <button
            onClick={() => setShowBlockModal(true)}
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-mono text-xs transition-colors flex items-center gap-1.5 self-start sm:self-auto"
          >
            <Plus className="w-3.5 h-3.5 text-cyan-400" />
            <span>Quarantine IP</span>
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead>
              <tr className="border-b border-slate-800 text-slate-500 uppercase text-[10px]">
                <th className="py-2.5 px-3">IP Address</th>
                <th className="py-2.5 px-3">Origin / ASN</th>
                <th className="py-2.5 px-3">Quarantine Reason</th>
                <th className="py-2.5 px-3">Blocked Hits</th>
                <th className="py-2.5 px-3">TTL Remaining</th>
                <th className="py-2.5 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {blockedIps.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-slate-500">
                    No IP addresses currently quarantined.
                  </td>
                </tr>
              ) : (
                blockedIps.map((entry) => {
                  const now = Date.now();
                  const remainingSec = entry.expiresAt ? Math.max(0, Math.round((entry.expiresAt - now) / 1000)) : null;
                  const minutesLeft = remainingSec !== null ? Math.ceil(remainingSec / 60) : null;

                  return (
                    <tr key={entry.ip} className="hover:bg-slate-800/30 transition-colors">
                      <td className="py-2.5 px-3 font-bold text-slate-200">{entry.ip}</td>
                      <td className="py-2.5 px-3 text-slate-400">
                        {entry.countryCode} · {entry.asn}
                      </td>
                      <td className="py-2.5 px-3 text-slate-300 max-w-xs truncate">{entry.reason}</td>
                      <td className="py-2.5 px-3 text-rose-400 font-bold">{entry.hitsBlocked.toLocaleString()}</td>
                      <td className="py-2.5 px-3 text-slate-400">
                        {minutesLeft !== null ? (
                          <span className="flex items-center gap-1 text-amber-400">
                            <Clock className="w-3 h-3" /> {minutesLeft}m left
                          </span>
                        ) : (
                          <span className="text-slate-500">Permanent</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <button
                          onClick={() => onUnblockIp(entry.ip)}
                          className="text-slate-400 hover:text-rose-300 p-1 rounded hover:bg-slate-800 transition-colors"
                          title="Unquarantine IP"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Trusted Allowlist */}
      <div className="p-5 rounded-xl border border-slate-800 bg-slate-900/60 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
          <div>
            <h3 className="font-bold font-mono text-sm text-slate-200 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" /> Trusted Whitelist & Anti-Lockout Registry
            </h3>
            <p className="text-xs text-slate-400 font-mono mt-0.5">
              Whitelisted subnets and internal services that bypass rate limits and can never be quarantined.
            </p>
          </div>

          <button
            onClick={() => setShowAllowModal(true)}
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-mono text-xs transition-colors flex items-center gap-1.5 self-start sm:self-auto"
          >
            <Plus className="w-3.5 h-3.5 text-emerald-400" />
            <span>Add Whitelist CIDR</span>
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead>
              <tr className="border-b border-slate-800 text-slate-500 uppercase text-[10px]">
                <th className="py-2 px-3">CIDR / IP</th>
                <th className="py-2 px-3">Description</th>
                <th className="py-2 px-3">Added By</th>
                <th className="py-2 px-3">Protection Status</th>
                <th className="py-2 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {allowedIps.map((entry) => {
                const isLoopback = entry.cidrOrIp.startsWith('127.0.0.1');
                return (
                  <tr key={entry.cidrOrIp} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-2.5 px-3 font-bold text-slate-200">{entry.cidrOrIp}</td>
                    <td className="py-2.5 px-3 text-slate-300">{entry.description}</td>
                    <td className="py-2.5 px-3 text-slate-500">{entry.addedBy}</td>
                    <td className="py-2.5 px-3">
                      {isLoopback ? (
                        <span className="text-emerald-400 font-bold flex items-center gap-1">
                          <Lock className="w-3 h-3" /> Core Anti-Lockout
                        </span>
                      ) : (
                        <span className="text-slate-400">Whitelisted</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      {!isLoopback && (
                        <button
                          onClick={() => onRemoveAllowedIp(entry.cidrOrIp)}
                          className="text-slate-400 hover:text-rose-300 p-1 rounded hover:bg-slate-800 transition-colors"
                          title="Remove from Whitelist"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Manual Block Modal */}
      {showBlockModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
            <h3 className="font-bold text-sm text-slate-100 font-mono">Quarantine Client IP</h3>
            {blockError && (
              <div className="p-3 rounded bg-rose-950/50 border border-rose-500/40 text-xs text-rose-300 font-mono">
                {blockError}
              </div>
            )}
            <div className="space-y-3 text-xs font-mono">
              <div>
                <label className="text-slate-400 block mb-1">Target IPv4 / IPv6 Address:</label>
                <input
                  type="text"
                  placeholder="e.g. 198.51.100.75"
                  value={blockIpVal}
                  onChange={(e) => setBlockIpVal(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-slate-200 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Reason for Quarantine:</label>
                <input
                  type="text"
                  placeholder="e.g. Suspicious burst on /api/search"
                  value={blockReasonVal}
                  onChange={(e) => setBlockReasonVal(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-slate-200 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Quarantine Duration:</label>
                <select
                  value={blockDurationVal === null ? 'perm' : blockDurationVal.toString()}
                  onChange={(e) => setBlockDurationVal(e.target.value === 'perm' ? null : Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-slate-200 focus:outline-none focus:border-cyan-500"
                >
                  <option value="5">5 Minutes</option>
                  <option value="15">15 Minutes (Default)</option>
                  <option value="60">1 Hour</option>
                  <option value="1440">24 Hours</option>
                  <option value="perm">Permanent Block</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                onClick={() => setShowBlockModal(false)}
                className="px-3 py-1.5 rounded border border-slate-700 text-slate-300 font-mono text-xs hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmBlock}
                className="px-3 py-1.5 rounded bg-rose-600 hover:bg-rose-500 text-slate-100 font-mono font-bold text-xs"
              >
                Confirm Quarantine
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Manual Allow Modal */}
      {showAllowModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
            <h3 className="font-bold text-sm text-slate-100 font-mono">Add Trusted Allowlist CIDR</h3>
            <div className="space-y-3 text-xs font-mono">
              <div>
                <label className="text-slate-400 block mb-1">CIDR / IP Subnet:</label>
                <input
                  type="text"
                  placeholder="e.g. 192.168.1.0/24 or 203.0.113.1"
                  value={allowCidrVal}
                  onChange={(e) => setAllowCidrVal(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-slate-200 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Description:</label>
                <input
                  type="text"
                  placeholder="e.g. Internal Monitoring Agent"
                  value={allowDescVal}
                  onChange={(e) => setAllowDescVal(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-slate-200 focus:outline-none focus:border-cyan-500"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                onClick={() => setShowAllowModal(false)}
                className="px-3 py-1.5 rounded border border-slate-700 text-slate-300 font-mono text-xs hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmAllow}
                className="px-3 py-1.5 rounded bg-emerald-600 hover:bg-emerald-500 text-slate-100 font-mono font-bold text-xs"
              >
                Save to Allowlist
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
