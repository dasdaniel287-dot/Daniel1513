import React, { useEffect } from 'react';
import { AlertOctagon, X, ShieldAlert } from 'lucide-react';
import { AnomalyAlert } from '../types';

interface NotificationToastProps {
  alert: AnomalyAlert | null;
  onClose: () => void;
  onView: () => void;
}

export const NotificationToast: React.FC<NotificationToastProps> = ({ alert, onClose, onView }) => {
  useEffect(() => {
    if (!alert) return;
    const timer = setTimeout(() => {
      onClose();
    }, 7000);
    return () => clearTimeout(timer);
  }, [alert, onClose]);

  if (!alert) return null;

  return (
    <div className="fixed bottom-5 right-5 z-50 max-w-sm w-full bg-slate-900 border border-rose-500/50 shadow-2xl rounded-xl p-4 flex items-start gap-3 text-xs font-mono animate-slide-in select-none">
      <div className="p-2 rounded-lg bg-rose-950/80 text-rose-400 shrink-0">
        <ShieldAlert className="w-5 h-5 animate-pulse" />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <span className="font-bold text-rose-400 uppercase tracking-wider text-[11px]">
            [{alert.severity}] ANOMALY DETECTED
          </span>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-300">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        <p className="text-slate-200 font-semibold truncate mb-1">{alert.title}</p>
        <p className="text-slate-400 text-[11px] line-clamp-2 leading-relaxed mb-2">
          {alert.explanation}
        </p>

        <div className="flex items-center gap-2">
          <button
            onClick={onView}
            className="text-[11px] text-cyan-400 hover:text-cyan-300 font-bold underline"
          >
            Investigate Anomaly →
          </button>
        </div>
      </div>
    </div>
  );
};
