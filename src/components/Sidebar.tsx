import React from 'react';
import {
  Activity,
  Brain,
  Shield,
  BarChart3,
  AlertOctagon,
  FileText,
  Code2,
  Lock,
  Radio
} from 'lucide-react';
import { ActiveTab } from '../types';

interface SidebarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  openIncidentsCount: number;
  activeAlertsCount: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  openIncidentsCount,
  activeAlertsCount
}) => {
  const navItems: { id: ActiveTab; label: string; icon: React.ReactNode; badge?: number; badgeColor?: string }[] = [
    {
      id: 'overview',
      label: 'Command Center',
      icon: <Activity className="w-4 h-4" />
    },
    {
      id: 'detection',
      label: 'AI Anomaly Engine',
      icon: <Brain className="w-4 h-4" />,
      badge: activeAlertsCount,
      badgeColor: 'text-amber-400'
    },
    {
      id: 'mitigation',
      label: 'Defensive Policies',
      icon: <Shield className="w-4 h-4" />
    },
    {
      id: 'traffic',
      label: 'Traffic & Geolocation',
      icon: <BarChart3 className="w-4 h-4" />
    },
    {
      id: 'incidents',
      label: 'Incident Center',
      icon: <AlertOctagon className="w-4 h-4" />,
      badge: openIncidentsCount,
      badgeColor: 'text-rose-400'
    },
    {
      id: 'audit',
      label: 'Audit & Compliance',
      icon: <FileText className="w-4 h-4" />
    },
    {
      id: 'waf',
      label: 'WAF & Proxy Rules',
      icon: <Code2 className="w-4 h-4" />
    }
  ];

  return (
    <aside className="w-64 border-r border-slate-800 bg-slate-950 flex flex-col justify-between shrink-0 select-none">
      <div className="p-3 space-y-1">
        <div className="px-3 py-2 text-[10px] uppercase font-mono font-bold tracking-wider text-slate-500">
          Security Operations
        </div>
        {navItems.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium transition-all ${
                isActive
                  ? 'bg-cyan-950/60 text-cyan-300 border border-cyan-500/30 shadow-sm shadow-cyan-950'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60 border border-transparent'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <span className={isActive ? 'text-cyan-400' : 'text-slate-400'}>{item.icon}</span>
                <span>{item.label}</span>
              </div>
              {item.badge !== undefined && item.badge > 0 && (
                <span className={`text-[11px] font-mono font-bold ${item.badgeColor || 'text-cyan-400'}`}>
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Operator Safety Notice */}
      <div className="p-4 border-t border-slate-900 bg-slate-950/40 text-[11px] text-slate-400">
        <div className="flex items-center gap-2 text-slate-300 font-medium mb-1">
          <Lock className="w-3.5 h-3.5 text-cyan-400" />
          <span>Anti-Lockout Enforced</span>
        </div>
        <p className="text-[10px] text-slate-500 leading-relaxed">
          Administrative subnets and loopback addresses are protected against accidental quarantine.
        </p>
      </div>
    </aside>
  );
};
