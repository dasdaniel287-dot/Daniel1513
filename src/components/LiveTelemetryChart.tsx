import React, { useState, useMemo } from 'react';
import { TelemetryPoint } from '../types';

interface LiveTelemetryChartProps {
  data: TelemetryPoint[];
  rpsThreshold?: number;
}

export const LiveTelemetryChart: React.FC<LiveTelemetryChartProps> = ({
  data,
  rpsThreshold = 80
}) => {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  // Layout dimensions
  const width = 800;
  const height = 240;
  const padding = { top: 20, right: 30, bottom: 30, left: 45 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  const { maxRps, points, thresholdY } = useMemo(() => {
    if (!data || data.length === 0) {
      return { maxRps: 100, points: [], thresholdY: chartHeight * 0.5 };
    }

    const calculatedMax = Math.max(...data.map(d => d.requestsPerSecond), rpsThreshold * 1.25, 60);
    const stepX = chartWidth / Math.max(1, data.length - 1);

    const calculatedPoints = data.map((d, index) => {
      const x = padding.left + index * stepX;
      const y = padding.top + chartHeight - (d.requestsPerSecond / calculatedMax) * chartHeight;
      return { x, y, data: d };
    });

    const calculatedThresholdY = padding.top + chartHeight - (rpsThreshold / calculatedMax) * chartHeight;

    return { maxRps: calculatedMax, points: calculatedPoints, thresholdY: calculatedThresholdY };
  }, [data, rpsThreshold, chartWidth, chartHeight, padding.left, padding.top]);

  if (points.length < 2) {
    return (
      <div className="h-64 flex items-center justify-center text-xs font-mono text-slate-500">
        Streaming telemetry samples...
      </div>
    );
  }

  // Construct SVG paths
  const linePath = points.reduce((acc, curr, idx) => {
    return idx === 0 ? `M ${curr.x} ${curr.y}` : `${acc} L ${curr.x} ${curr.y}`;
  }, '');

  const areaPath = `${linePath} L ${points[points.length - 1].x} ${padding.top + chartHeight} L ${points[0].x} ${padding.top + chartHeight} Z`;

  const hoveredPoint = hoverIndex !== null && points[hoverIndex] ? points[hoverIndex] : null;

  return (
    <div className="relative w-full overflow-hidden select-none">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-3 text-xs font-mono">
          <div className="flex items-center gap-1.5 text-cyan-400">
            <span className="w-2.5 h-0.5 bg-cyan-400 inline-block" />
            <span>Requests / Sec</span>
          </div>
          <div className="flex items-center gap-1.5 text-rose-400/80">
            <span className="w-2.5 h-0.5 bg-rose-400 border-b border-dashed inline-block" />
            <span>Threshold ({rpsThreshold} RPS)</span>
          </div>
        </div>

        {hoveredPoint && (
          <div className="text-[11px] font-mono text-slate-300">
            <span>{new Date(hoveredPoint.data.timestamp).toLocaleTimeString()}</span>
            <span className="mx-1.5 text-slate-600">|</span>
            <span className="text-cyan-400 font-bold">{hoveredPoint.data.requestsPerSecond} req/s</span>
            <span className="mx-1.5 text-slate-600">|</span>
            <span className="text-purple-400">{hoveredPoint.data.bandwidthMbps} Mbps</span>
            <span className="mx-1.5 text-slate-600">|</span>
            <span className="text-amber-400">{hoveredPoint.data.avgLatencyMs} ms</span>
          </div>
        )}
      </div>

      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-56 sm:h-64 overflow-visible"
        onMouseLeave={() => setHoverIndex(null)}
      >
        <defs>
          <linearGradient id="rpsAreaGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.0" />
          </linearGradient>
        </defs>

        {/* Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
          const y = padding.top + chartHeight * ratio;
          const val = Math.round(maxRps * (1 - ratio));
          return (
            <g key={ratio}>
              <line
                x1={padding.left}
                y1={y}
                x2={width - padding.right}
                y2={y}
                stroke="#1e293b"
                strokeDasharray="3 3"
              />
              <text
                x={padding.left - 8}
                y={y + 3}
                fill="#64748b"
                fontSize="10"
                fontFamily="monospace"
                textAnchor="end"
              >
                {val}
              </text>
            </g>
          );
        })}

        {/* Threshold Line */}
        <line
          x1={padding.left}
          y1={thresholdY}
          x2={width - padding.right}
          y2={thresholdY}
          stroke="#f43f5e"
          strokeWidth="1.5"
          strokeDasharray="4 4"
        />

        {/* Area fill */}
        <path d={areaPath} fill="url(#rpsAreaGradient)" />

        {/* Primary Line */}
        <path
          d={linePath}
          fill="none"
          stroke="#06b6d4"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Hover Crosshair */}
        {hoveredPoint && (
          <g>
            <line
              x1={hoveredPoint.x}
              y1={padding.top}
              x2={hoveredPoint.x}
              y2={padding.top + chartHeight}
              stroke="#94a3b8"
              strokeWidth="1"
              strokeDasharray="2 2"
            />
            <circle
              cx={hoveredPoint.x}
              cy={hoveredPoint.y}
              r="4.5"
              fill="#06b6d4"
              stroke="#0f172a"
              strokeWidth="2"
            />
          </g>
        )}

        {/* Transparent overlay for mouse interaction */}
        {points.map((pt, idx) => (
          <rect
            key={idx}
            x={pt.x - chartWidth / (data.length * 2)}
            y={padding.top}
            width={chartWidth / data.length}
            height={chartHeight}
            fill="transparent"
            className="cursor-crosshair"
            onMouseEnter={() => setHoverIndex(idx)}
          />
        ))}
      </svg>
    </div>
  );
};
