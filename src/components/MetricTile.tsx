import React from 'react';

interface MetricTileProps {
  label: string;
  value: string | number;
  unit?: string;
  delta?: string;
  isPositiveDeltaGood?: boolean;
  subtext?: string;
  status?: 'NORMAL' | 'WARNING' | 'CRITICAL';
  icon?: React.ReactNode;
}

export const MetricTile: React.FC<MetricTileProps> = ({
  label,
  value,
  unit,
  delta,
  isPositiveDeltaGood = false,
  subtext,
  status = 'NORMAL',
  icon
}) => {
  const statusColors = {
    NORMAL: 'border-slate-800 bg-slate-900/60 text-slate-100',
    WARNING: 'border-amber-500/40 bg-amber-950/20 text-amber-200',
    CRITICAL: 'border-rose-500/40 bg-rose-950/20 text-rose-200'
  };

  const statusAccent = {
    NORMAL: 'text-cyan-400',
    WARNING: 'text-amber-400',
    CRITICAL: 'text-rose-400'
  };

  return (
    <div className={`p-4 rounded-xl border ${statusColors[status]} transition-all flex flex-col justify-between`}>
      <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
        <span className="font-medium tracking-wide uppercase text-[11px] text-slate-400 font-mono">{label}</span>
        {icon && <span className={statusAccent[status]}>{icon}</span>}
      </div>

      <div className="flex items-baseline gap-1.5 my-1">
        <span className="text-2xl sm:text-3xl font-bold font-mono tracking-tight text-slate-100">
          {value}
        </span>
        {unit && <span className="text-xs font-mono text-slate-400">{unit}</span>}
      </div>

      <div className="flex items-center justify-between text-[11px] text-slate-500 mt-2 font-mono">
        <span>{subtext || 'Live Edge Telemetry'}</span>
        {delta && (
          <span className={status === 'CRITICAL' ? 'text-rose-400 font-semibold' : status === 'WARNING' ? 'text-amber-400 font-semibold' : 'text-slate-400'}>
            {delta}
          </span>
        )}
      </div>
    </div>
  );
};
