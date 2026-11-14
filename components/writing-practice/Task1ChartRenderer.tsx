'use client';

import { ChevronRight } from 'lucide-react';
import type { ChartData } from '@/lib/writing-practice-types';

const CHART_COLORS = [
  '#6366f1',
  '#f59e0b',
  '#10b981',
  '#ef4444',
  '#3b82f6',
  '#a855f7',
  '#ec4899',
  '#14b8a6',
];

function BarChart({ data }: { data: ChartData }) {
  const { series = [], categories = [], xLabel, yLabel } = data;
  if (!series.length || !categories.length) return null;

  const allValues = series.flatMap((s) => s.values || []);
  const maxVal = Math.max(...allValues, 1);
  const W = 520;
  const H = 225;
  const PL = 50;
  const PR = 16;
  const PT = 14;
  const PB = 42;
  const cW = W - PL - PR;
  const cH = H - PT - PB;
  const gW = cW / categories.length;
  const bW = Math.min((gW / (series.length + 1)) * 0.9, 36);
  const tStep = Math.max(Math.ceil(maxVal / 5 / 10) * 10, maxVal <= 10 ? 2 : 10);
  const yMax = tStep * (Math.ceil(maxVal / tStep) + 1);

  return (
    <div className="flex flex-col gap-2">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" style={{ fontFamily: 'Inter,sans-serif' }}>
        {Array.from({ length: 5 }, (_, i) => {
          const v = (i / 4) * ((yMax * 4) / 5);
          const y = PT + cH - (v / yMax) * cH;
          return (
            <g key={i}>
              <line x1={PL} y1={y} x2={PL + cW} y2={y} stroke="#e5e7eb" strokeWidth="1" strokeDasharray="3 3" />
              <text x={PL - 4} y={y + 4} textAnchor="end" fontSize="9" fill="#9ca3af">
                {Math.round(v)}
              </text>
            </g>
          );
        })}
        <line x1={PL} y1={PT} x2={PL} y2={PT + cH} stroke="#d1d5db" strokeWidth="1.5" />
        <line x1={PL} y1={PT + cH} x2={PL + cW} y2={PT + cH} stroke="#d1d5db" strokeWidth="1.5" />
        {categories.map((cat, ci) => {
          const gX = PL + ci * gW + gW / 2;
          const totW = series.length * bW + (series.length - 1) * 3;
          return (
            <g key={ci}>
              {series.map((s, si) => {
                const val = s.values?.[ci] ?? 0;
                const bH = Math.max((val / yMax) * cH, 0);
                const x = gX - totW / 2 + si * (bW + 3);
                const y = PT + cH - bH;
                const color = CHART_COLORS[si % CHART_COLORS.length];
                return (
                  <g key={si}>
                    <rect x={x} y={y} width={bW} height={bH} fill={color} rx={2} opacity={0.88} />
                    {bH > 16 && (
                      <text x={x + bW / 2} y={y + 11} textAnchor="middle" fontSize="8" fill="white" fontWeight="bold">
                        {val}
                      </text>
                    )}
                  </g>
                );
              })}
              <text x={gX} y={PT + cH + 13} textAnchor="middle" fontSize="9" fill="#6b7280">
                {cat.length > 11 ? cat.slice(0, 10) + '…' : cat}
              </text>
            </g>
          );
        })}
        {xLabel && (
          <text x={PL + cW / 2} y={H - 6} textAnchor="middle" fontSize="10" fill="#6b7280" fontWeight="600">
            {xLabel}
          </text>
        )}
        {yLabel && (
          <text transform={`translate(11,${PT + cH / 2})rotate(-90)`} textAnchor="middle" fontSize="10" fill="#6b7280" fontWeight="600">
            {yLabel}
          </text>
        )}
      </svg>

      {series.length > 1 && (
        <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5 pt-1">
          {series.map((s, si) => (
            <div key={si} className="flex items-center gap-1.5 text-xs text-gray-700">
              <span className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ background: CHART_COLORS[si % CHART_COLORS.length] }} />
              <span className="font-medium">{s.name}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function LineChart({ data }: { data: ChartData }) {
  const { series = [], xValues = [], xLabel, yLabel } = data;
  if (!series.length || !xValues.length) return null;

  const allV = series.flatMap((s) => s.values || []);
  const maxV = Math.max(...allV, 1);
  const minV = Math.min(...allV, 0);
  const W = 520;
  const H = 225;
  const PL = 50;
  const PR = 16;
  const PT = 14;
  const PB = 42;
  const cW = W - PL - PR;
  const cH = H - PT - PB;
  const range = maxV - minV || 1;
  const tStep = Math.max(Math.ceil(range / 5 / 5) * 5, 5);
  const yMin = Math.floor(minV / tStep) * tStep;
  const yMax = yMin + tStep * (Math.ceil((maxV - yMin) / tStep) + 1);
  const xS = (i: number) => PL + (i / Math.max(xValues.length - 1, 1)) * cW;
  const yS = (v: number) => PT + cH - ((v - yMin) / (yMax - yMin || 1)) * cH;

  return (
    <div className="flex flex-col gap-2">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" style={{ fontFamily: 'Inter,sans-serif' }}>
        {Array.from({ length: 5 }, (_, i) => {
          const v = yMin + i * tStep;
          const y = yS(v);
          if (y < PT - 5 || y > PT + cH + 5) return null;
          return (
            <g key={i}>
              <line x1={PL} y1={y} x2={PL + cW} y2={y} stroke="#e5e7eb" strokeWidth="1" strokeDasharray="3 3" />
              <text x={PL - 4} y={y + 4} textAnchor="end" fontSize="9" fill="#9ca3af">
                {Math.round(v)}
              </text>
            </g>
          );
        })}
        <line x1={PL} y1={PT} x2={PL} y2={PT + cH} stroke="#d1d5db" strokeWidth="1.5" />
        <line x1={PL} y1={PT + cH} x2={PL + cW} y2={PT + cH} stroke="#d1d5db" strokeWidth="1.5" />
        {xValues.map((v, i) => (
          <text key={i} x={xS(i)} y={PT + cH + 14} textAnchor="middle" fontSize="9" fill="#6b7280">
            {v}
          </text>
        ))}
        {series.map((s, si) => {
          const color = CHART_COLORS[si % CHART_COLORS.length];
          const vals = s.values || [];
          const pts = vals.map((v, i) => `${xS(i)},${yS(v)}`).join(' ');
          return (
            <g key={si}>
              <polyline points={pts} fill="none" stroke={color} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
              {vals.map((v, i) => (
                <circle key={i} cx={xS(i)} cy={yS(v)} r={3.5} fill={color} stroke="white" strokeWidth="1.5" />
              ))}
            </g>
          );
        })}
        {xLabel && (
          <text x={PL + cW / 2} y={H - 6} textAnchor="middle" fontSize="10" fill="#6b7280" fontWeight="600">
            {xLabel}
          </text>
        )}
        {yLabel && (
          <text transform={`translate(11,${PT + cH / 2})rotate(-90)`} textAnchor="middle" fontSize="10" fill="#6b7280" fontWeight="600">
            {yLabel}
          </text>
        )}
      </svg>

      <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5 pt-1">
        {series.map((s, si) => {
          const color = CHART_COLORS[si % CHART_COLORS.length];
          return (
            <div key={si} className="flex items-center gap-1.5 text-xs text-gray-700">
              <span className="w-3 h-0.5 rounded-full inline-block" style={{ background: color }} />
              <span className="w-2 h-2 rounded-full -ml-2.5" style={{ background: color }} />
              <span className="font-medium">{s.name}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function PieChartViz({ data }: { data: ChartData }) {
  const { segments = [], unit } = data;
  if (!segments.length) return null;
  const total = segments.reduce((s, x) => s + x.value, 0) || 1;
  const cx = 110;
  const cy = 110;
  const r = 90;

  if (segments.length === 1) {
    return (
      <div className="flex flex-col sm:flex-row items-center gap-4">
        <svg viewBox="0 0 220 220" className="w-[160px] flex-shrink-0">
          <circle cx={cx} cy={cy} r={r} fill={CHART_COLORS[0]} />
          <text x={cx} y={cy} textAnchor="middle" dominantBaseline="middle" fontSize="14" fill="white" fontWeight="bold">
            {segments[0].value}
            {unit || '%'}
          </text>
        </svg>
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-sm" style={{ background: CHART_COLORS[0] }} />
          <span className="text-sm text-gray-700">{segments[0].label}</span>
        </div>
      </div>
    );
  }

  let ang = -Math.PI / 2;
  const slices = segments.map((seg, i) => {
    const a = (seg.value / total) * 2 * Math.PI;
    const x1 = cx + r * Math.cos(ang);
    const y1 = cy + r * Math.sin(ang);
    const endAng = ang + a - 0.0001;
    const x2 = cx + r * Math.cos(endAng);
    const y2 = cy + r * Math.sin(endAng);
    const mid = ang + a / 2;
    const lx = cx + r * 0.65 * Math.cos(mid);
    const ly = cy + r * 0.65 * Math.sin(mid);
    const large = a > Math.PI ? 1 : 0;
    ang += a;
    return { x1, y1, x2, y2, lx, ly, large, color: CHART_COLORS[i % CHART_COLORS.length], ...seg };
  });

  return (
    <div className="flex flex-col sm:flex-row items-center gap-4">
      <svg viewBox="0 0 220 220" className="w-[165px] flex-shrink-0" style={{ fontFamily: 'Inter,sans-serif' }}>
        {slices.map((s, i) => (
          <path
            key={i}
            d={`M ${cx} ${cy} L ${s.x1} ${s.y1} A ${r} ${r} 0 ${s.large} 1 ${s.x2} ${s.y2} Z`}
            fill={s.color}
            stroke="white"
            strokeWidth="2"
          />
        ))}
        {slices.map(
          (s, i) =>
            s.value / total > 0.07 && (
              <text key={i} x={s.lx} y={s.ly} textAnchor="middle" dominantBaseline="middle" fontSize="10" fill="white" fontWeight="bold">
                {s.value}
                {unit || '%'}
              </text>
            )
        )}
      </svg>
      <div className="flex flex-col gap-1.5 flex-1 w-full">
        {slices.map((s, i) => (
          <div key={i} className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ background: s.color }} />
            <span className="text-sm text-gray-700 flex-1 min-w-0 truncate">{s.label}</span>
            <span className="text-sm font-bold text-gray-900 flex-shrink-0">
              {s.value}
              {unit || '%'}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function TableViz({ data }: { data: ChartData }) {
  const { headers = [], rows = [], unit } = data;
  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-gradient-to-r from-indigo-50 to-purple-50">
            {headers.map((h, i) => (
              <th key={i} className="px-3 py-2 text-left font-bold text-indigo-800 border-b border-indigo-100 whitespace-nowrap text-xs">
                {h}
                {i > 0 && unit ? ` (${unit})` : ''}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, ri) => (
            <tr key={ri} className={ri % 2 === 0 ? 'bg-white' : 'bg-gray-50/60'}>
              {row.map((cell, ci) => (
                <td key={ci} className="px-3 py-2 text-gray-700 border-b border-gray-100 text-sm">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ProcessViz({ data }: { data: ChartData }) {
  const { steps = [] } = data;
  return (
    <div className="flex flex-wrap gap-y-3 gap-x-1.5 items-start justify-center py-2">
      {steps.map((step, i) => (
        <div key={i} className="flex items-center gap-1">
          <div className="flex flex-col items-center gap-1 w-[88px]">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center font-black text-sm text-white shadow-md"
              style={{ background: CHART_COLORS[i % CHART_COLORS.length] }}
            >
              {step.id}
            </div>
            <p className="font-bold text-[10px] text-gray-800 text-center leading-tight">{step.label}</p>
            <p className="text-[9px] text-gray-500 text-center leading-tight line-clamp-2">{step.description}</p>
          </div>
          {i < steps.length - 1 && <ChevronRight size={14} className="text-gray-300 flex-shrink-0 mb-5" />}
        </div>
      ))}
    </div>
  );
}

const POS: Record<string, { top: string; left: string }> = {
  north: { top: '12%', left: '50%' },
  south: { top: '82%', left: '50%' },
  east: { top: '50%', left: '78%' },
  west: { top: '50%', left: '22%' },
  center: { top: '48%', left: '50%' },
  northeast: { top: '18%', left: '74%' },
  northwest: { top: '18%', left: '26%' },
  southeast: { top: '78%', left: '74%' },
  southwest: { top: '78%', left: '26%' },
};

type MapFeature = { name: string; position: string; icon: string; description: string };

function MapPanel({ features, period, color }: { features: MapFeature[]; period?: string; color: string }) {
  return (
    <div className="flex-1 min-w-0">
      <div className="inline-flex px-2 py-0.5 rounded-full text-white text-xs font-bold mb-1.5 shadow-sm" style={{ background: color }}>
        {period}
      </div>
      <div className="relative w-full" style={{ paddingBottom: '100%' }}>
        <div className="absolute inset-0 rounded-xl border-2 bg-green-50/50 overflow-hidden" style={{ borderColor: color + '55' }}>
          <div className="absolute top-1 right-1 text-[8px] font-black text-gray-400 bg-white/80 rounded px-1">N↑</div>
          <svg className="absolute inset-0 w-full h-full opacity-10">
            {[1, 2, 3, 4].map((i) => (
              <line key={`h${i}`} x1="0" y1={`${i * 20}%`} x2="100%" y2={`${i * 20}%`} stroke="#666" strokeWidth="0.5" />
            ))}
            {[1, 2, 3, 4].map((i) => (
              <line key={`v${i}`} x1={`${i * 20}%`} y1="0" x2={`${i * 20}%`} y2="100%" stroke="#666" strokeWidth="0.5" />
            ))}
          </svg>
          {features.map((f, i) => {
            const p = POS[f.position?.toLowerCase()] || POS.center;
            return (
              <div
                key={i}
                className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center"
                style={{ top: p.top, left: p.left }}
                title={`${f.name}: ${f.description}`}
              >
                <span className="text-lg leading-none drop-shadow-sm">{f.icon}</span>
                <span className="text-[8px] font-bold text-gray-700 bg-white/90 px-1 py-0.5 rounded shadow-sm text-center leading-tight max-w-[60px]">
                  {f.name}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function MapViz({ data }: { data: ChartData }) {
  const { features1 = [], features2 = [], period1, period2, changes = [] } = data;
  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-2">
        <MapPanel features={features1} period={period1} color="#6366f1" />
        <MapPanel features={features2} period={period2} color="#f59e0b" />
      </div>
      {changes.length > 0 && (
        <div className="bg-amber-50 rounded-lg p-2.5 border border-amber-100">
          <p className="text-[9px] font-bold text-amber-700 uppercase tracking-wider mb-1">Key Changes</p>
          <ul className="space-y-0.5">
            {changes.map((c, i) => (
              <li key={i} className="text-xs text-amber-900 flex gap-1">
                <span className="text-amber-500 font-bold">→</span>
                <span>{c}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export function Task1ChartRenderer({ data }: { data: ChartData }) {
  switch (data.type) {
    case 'bar':
      return <BarChart data={data} />;
    case 'line':
      return <LineChart data={data} />;
    case 'pie':
      return <PieChartViz data={data} />;
    case 'table':
      return <TableViz data={data} />;
    case 'process':
      return <ProcessViz data={data} />;
    case 'map':
      return <MapViz data={data} />;
    default:
      return <p className="text-gray-400 text-sm italic">Loại biểu đồ không xác định.</p>;
  }
}

