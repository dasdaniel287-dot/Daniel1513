import React from 'react';
import { Shield, ShieldAlert, ShieldCheck, Sun, Moon, Bell, Play, Zap, AlertTriangle } from 'lucide-react';
import { DefenseMode } from '../types';

interface HeaderProps {
  darkMode: boolean;
  setDarkMode: (val: boolean) => void;
  defenseMode: DefenseMode;
  circuitBreakerTripped: boolean;
  activeScenario: string;
  onScenarioChange: (scenario: string) => void;
  unreadAlertsCount: number;
  onOpenAlerts: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  darkMode,
  setDarkMode,
  defenseMode,
  circuitBreakerTripped,
  activeScenario,
  onScenarioChange,
  unreadAlertsCount,
  onOpenAlerts
}) => {
  return (
    <header className="h-16 border-b border-slate-800 bg-slate-950/80 backdrop-blur-md px-4 sm:px-6 flex items-center justify-between sticky top-0 z-30">
      {/* Brand & System Status */}
      <div className="flex items-center gap-3 sm:gap-4">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-cyan-950/80 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shadow-sm shadow-cyan-950">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-100 tracking-tight text-base sm:text-lg">DDoS Shield AI</span>
              <span className="text-[10px] font-mono tracking-widest text-cyan-400/90 uppercase font-semibold">v2.0</span>
            </div>
            <div className="flex items-center gap-2 text-[11px] text-slate-400 font-mono">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>SOC Edge Active</span>
              <span aria-hidden="true">·</span>
              <span>Port 3000</span>
            </div>
          </div>
        </div>

        {/* Defense Mode Badge (Clean, zero-pill metadata) */}
        <div className="hidden md:flex items-center gap-2 border-l border-slate-800 pl-4 py-1 text-xs">
          <span className="text-slate-500 font-mono">Defense:</span>
          {defenseMode === 'DRY_RUN' && (
            <span className="text-amber-400 font-medium font-mono flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" /> DRY-RUN (Audit Only)
            </span>
          )}
          {defenseMode === 'ENFORCING' && (
            <span className="text-emerald-400 font-medium font-mono flex items-center gap-1">
              <Shield className="w-3.5 h-3.5" /> ENFORCING (Active Drops)
            </span>
          )}
          {defenseMode === 'LOCKDOWN' && (
            <span className="text-rose-400 font-medium font-mono flex items-center gap-1 animate-pulse">
              <ShieldAlert className="w-3.5 h-3.5" /> STRICT LOCKDOWN
            </span>
          )}

          {circuitBreakerTripped && (
            <span className="text-rose-400 font-mono font-semibold flex items-center gap-1 ml-2 text-[11px]">
              <Zap className="w-3 h-3 text-rose-400" /> Circuit Breaker Active
            </span>
          )}
        </div>
      </div>

      {/* Right Controls: Scenario Injector, Notification, Theme */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Scenario Quick Selector */}
        <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 rounded-md p-1">
          <Play className="w-3.5 h-3.5 text-cyan-400 ml-1.5" />
          <span className="text-[11px] text-slate-400 font-mono hidden lg:inline">Traffic Test:</span>
          <select
            value={activeScenario}
            onChange={(e) => onScenarioChange(e.target.value)}
            className="bg-transparent text-slate-200 text-xs font-mono focus:outline-none cursor-pointer pr-1"
          >
            <option value="NORMAL" className="bg-slate-900 text-slate-200">Normal Baseline Traffic</option>
            <option value="HTTP_GET_FLOOD" className="bg-slate-900 text-slate-200">HTTP GET Flood (L7)</option>
            <option value="SLOWLORIS" className="bg-slate-900 text-slate-200">Slowloris Socket Exhaustion</option>
            <option value="CREDENTIAL_STUFFING" className="bg-slate-900 text-slate-200">Credential Stuffing (Auth)</option>
            <option value="VOLUMETRIC_SPIKE" className="bg-slate-900 text-slate-200">Volumetric Ingress Spike</option>
          </select>
        </div>

        {/* Alerts Bell */}
        <button
          onClick={onOpenAlerts}
          className="relative p-2 text-slate-400 hover:text-slate-100 hover:bg-slate-900 rounded-md transition-colors"
          title="Anomaly Alerts"
          aria-label="View Anomaly Alerts"
        >
          <Bell className="w-4 h-4" />
          {unreadAlertsCount > 0 && (
            <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-slate-950 animate-ping" />
          )}
        </button>

        {/* Theme Toggle */}
        <button
          onClick={() => setDarkMode(!darkMode)}
          className="p-2 text-slate-400 hover:text-slate-100 hover:bg-slate-900 rounded-md transition-colors"
          title={darkMode ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
          aria-label="Toggle Theme"
        >
          {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>
      </div>
    </header>
  );
};
