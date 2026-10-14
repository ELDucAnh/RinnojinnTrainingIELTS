'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Loader2, Sparkles, RefreshCw, ChevronRight, BarChart2, TrendingUp,
  PieChart, Table2, Workflow, Map, CheckCircle, AlertCircle, Clock,
  ArrowRight, Info, History, Trash2, Save, Check, RotateCcw, TrendingUp as TVocab,
  Volume2, Search, X, SlidersHorizontal, ChevronDown, ChevronUp
} from 'lucide-react';
import { LoadingScreen } from '@/components/LoadingScreen';
import { useStore } from '@/lib/store';

// ─── Types ───────────────────────────────────────────────────────────────────
type ChartData = {
  type: 'bar' | 'line' | 'pie' | 'table' | 'process' | 'map';
  title: string;
  context: string;
  prompt: string;
  keyFeatures?: string[];
  writingTips?: string;
  xLabel?: string;
  yLabel?: string;
  categories?: string[];
  series?: { name: string; values: number[] }[];
  xValues?: string[];
  year?: string;
  unit?: string;
  segments?: { label: string; value: number }[];
  headers?: string[];
  rows?: string[][];
  steps?: { id: number; label: string; description: string }[];
  location?: string;
  period1?: string;
  period2?: string;
  features1?: { name: string; position: string; icon: string; description: string }[];
  features2?: { name: string; position: string; icon: string; description: string }[];
  changes?: string[];
};

type GradeResult = {
  score: number;
  grammarErrors: { original: string; correction: string; explanation: string }[];
  vocabularyTips: { studentWord: string; betterAlternative: string; reason: string }[];
  structureFeedback: string;
  correctedSentence: string;
};

type CompletedSentence = {
  original: string;
  corrected: string;
  score: number;
};

type PracticeSession = {
  id: string;
  chartData: ChartData;
  sentences: CompletedSentence[];
  avgScore: number;
  savedAt: number;
};

const CHART_COLORS = [
  '#6366f1', '#f59e0b', '#10b981', '#ef4444', '#3b82f6', '#a855f7', '#ec4899', '#14b8a6',
];
const PASS_THRESHOLD = 80;
const TOTAL_SENTENCES = 10;

const TYPE_META: Record<string, { label: string; color: string }> = {
  bar:     { label: 'Bar Chart',       color: '#6366f1' },
  line:    { label: 'Line Graph',      color: '#3b82f6' },
  pie:     { label: 'Pie Chart',       color: '#ec4899' },
  table:   { label: 'Table',           color: '#10b981' },
  process: { label: 'Process Diagram', color: '#f59e0b' },
  map:     { label: 'Map',             color: '#ef4444' },
};

const CHART_TYPE_OPTIONS = [
  { id: 'random', label: 'Ngẫu nhiên', icon: '🎲', desc: 'Đổi đều tất cả các dạng' },
  { id: 'bar',     label: 'Bar Chart', icon: '📊', desc: 'Biểu đồ cột' },
  { id: 'line',    label: 'Line Graph', icon: '📈', desc: 'Biểu đồ đường' },
  { id: 'pie',     label: 'Pie Chart', icon: '🥧', desc: 'Biểu đồ tròn' },
  { id: 'table',   label: 'Table', icon: '📋', desc: 'Bảng số liệu' },
  { id: 'process', label: 'Process', icon: '🔄', desc: 'Sơ đồ quy trình' },
  { id: 'map',     label: 'Map', icon: '🗺️', desc: 'Bản đồ so sánh' },
];

const SUGGESTED_PROMPTS = [
  { label: '🥧 Pie: Cơ cấu năng lượng', type: 'pie', topic: 'Tỉ lệ sử dụng các nguồn năng lượng tái tạo và hóa thạch năm 2022' },
  { label: '🔄 Quy trình: Sản xuất cà phê', type: 'process', topic: 'Quy trình thu hoạch, sơ chế và rang xay cà phê xuất khẩu' },
  { label: '🗺️ Map: Đô thị hóa thị trấn ven biển', type: 'map', topic: 'Sự thay đổi cơ sở hạ tầng của thị trấn ven biển sau 20 năm phát triển' },
  { label: '📊 Bar: Chi tiêu giáo dục & y tế', type: 'bar', topic: 'So sánh mức chi tiêu cho y tế và giáo dục ở các nước phát triển' },
  { label: '📋 Table: Tỉ lệ việc làm theo ngành', type: 'table', topic: 'Bảng số liệu tỉ lệ lao động trong các nhóm ngành kinh tế' },
  { label: '📈 Line: Lượng phát thải CO2 qua các năm', type: 'line', topic: 'Xu hướng lượng phát thải khí CO2 từ 1990 đến 2020 của các khu vực' },
];

function TypeIcon({ type, size = 15 }: { type: string; size?: number }) {
  switch (type) {
    case 'bar':     return <BarChart2 size={size} />;
    case 'line':    return <TrendingUp size={size} />;
    case 'pie':     return <PieChart size={size} />;
    case 'table':   return <Table2 size={size} />;
    case 'process': return <Workflow size={size} />;
    case 'map':     return <Map size={size} />;
    default:        return <BarChart2 size={size} />;
  }
}

// ─── SENTENCE ROLE ────────────────────────────────────────────────────────────
const SENTENCE_ROLES = [
  'Overview: Giới thiệu tổng quan biểu đồ cho thấy gì',
  'Xu hướng nổi bật nhất / điểm đáng chú ý nhất',
  'Số liệu cụ thể 1: cao nhất hoặc thấp nhất',
  'Số liệu cụ thể 2: so sánh hoặc đối chiếu',
  'Chi tiết hỗ trợ thêm: con số / tỉ lệ',
  'Xu hướng thay đổi theo thời gian (nếu có)',
  'Ngoại lệ hoặc điểm đặc biệt',
  'Số liệu bổ sung đáng chú ý',
  'Nhận xét tổng quát cuối phần body',
  'Kết luận hoặc quan sát tổng thể cuối cùng',
];

const HINTS: Record<string, string[]> = {
  bar:     ['Overall, the bar chart illustrates...', 'The most striking feature is that [X] recorded the highest value at...', 'By contrast, [Y] had the lowest figure at...', 'Looking at [Group A], figures ranged from ... to ...', 'A notable difference can be seen between ... and ...', 'Across all categories, [X] consistently outperformed...', 'While [A] stood at approximately ..., [B] was considerably higher/lower at...', 'The gap between [X] and [Y] was most pronounced in...', 'Overall, the data suggests a pattern of...', 'In conclusion, [X] dominated throughout, while [Y] remained the lowest.'],
  line:    ['Overall, the graph shows the trends in ... over the period from ... to ...', 'The most dramatic change was seen in [subject], which rose/fell from ... to ...', '[A] and [B] followed a similar/contrasting trajectory throughout the period.', 'In [year], [subject] stood at ... and subsequently...', 'A steady upward/downward trend was observed in ... throughout...', 'The two lines converged/diverged around [year], when...', 'By the end of the period, [subject] had peaked/troughed at...', '[Subject] fluctuated between ... and ... during...', 'In contrast, [B] remained relatively stable at around...', 'Overall, [subject] ended significantly higher/lower than it began, while [B] showed the opposite trend.'],
  pie:     ['Overall, the pie chart reveals that ... accounted for the largest share at...', 'The most dominant category was [X], constituting roughly ...% of the total.', 'The smallest proportion was represented by [Y], which made up only ...%.', 'Together, [A] and [B] comprised approximately ...% of the total.', '[A] and [B] each accounted for a relatively minor share.', 'It is notable that the top two categories combined for over half the total.', '[Category] represented ...%, making it the second largest segment.', 'The remaining ...% was distributed among several smaller categories.', 'Compared to [A], [B] contributed a considerably smaller proportion.', 'In conclusion, the distribution was dominated by [X], while other segments were significantly smaller.'],
  table:   ['Overall, the table presents comparative data on ... across several categories.', 'The most notable feature is that [X] consistently recorded the highest figures throughout.', 'In contrast, [Y] showed the lowest values across all time points.', 'Between [year1] and [year2], [subject] increased/decreased by approximately...', 'The most significant change was observed in [X], rising from ... to ...', 'By [year], [X] had reached its peak at ..., while [Y] declined to...', '[A] and [B] followed a similar pattern, both experiencing a ... trend.', 'The gap between the highest and lowest figures was most pronounced in [year].', 'Notably, [X] was the only category to show a consistent decline/rise throughout.', 'Overall, the data reveals a general upward/downward trend, with [X] showing the most dramatic change.'],
  process: ['Overall, the diagram illustrates a ...-stage process for producing/manufacturing...', 'The process begins with ..., where [raw material/input] is [action].', 'In the second stage, [material] is [action], resulting in...', 'Subsequently, [material] undergoes ..., which involves...', 'Once [stage X] is complete, the [product/material] moves to [next stage].', '[Stage Y] is a critical phase in which ... takes place.', 'Following [stage], the [product] is then [treated/tested/transformed].', 'The penultimate step involves ..., where [outcome].', 'Finally, the [product] is [last action], completing the entire process.', 'Overall, the process requires [number] distinct stages before the final product is obtained.'],
  map:     ['Overall, the maps indicate that [location] underwent significant changes between [period1] and [period2].', 'In [period1], the area was predominantly characterised by [feature].', 'By [period2], several major changes had taken place, most notably...', 'The [northern/southern] section of the area, which was previously [feature], was replaced by [new feature].', 'One of the most striking developments was the construction of...', 'The [original feature] was demolished/relocated to accommodate...', 'In contrast to [period1], [period2] saw the addition of ... in the [location].', 'The [area] appears to have remained largely unchanged between both periods.', 'A new [road/building/facility] was established in the [area], connecting...', 'Overall, the key transformation was the shift from [old] to [new], suggesting urban/rural development.'],
};

// ─── CHART RENDERERS ─────────────────────────────────────────────────────────
function BarChart({ data }: { data: ChartData }) {
  const { series = [], categories = [], xLabel, yLabel } = data;
  if (!series.length || !categories.length) return null;
  const allValues = series.flatMap(s => s.values);
  const maxVal = Math.max(...allValues, 1);
  const W = 520, H = 245, PL = 50, PR = 16, PT = 14, PB = 80;
  const cW = W - PL - PR, cH = H - PT - PB;
  const gW = cW / categories.length;
  const bW = Math.min((gW / (series.length + 1)) * 0.9, 36);
  const tStep = Math.max(Math.ceil(maxVal / 5 / 10) * 10, 10);
  const yMax = tStep * (Math.ceil(maxVal / tStep) + 1);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" style={{ fontFamily: 'Inter,sans-serif' }}>
      {Array.from({ length: 5 }, (_, i) => {
        const v = (i / 4) * (yMax * 4 / 5);
        const y = PT + cH - (v / yMax) * cH;
        return (
          <g key={i}>
            <line x1={PL} y1={y} x2={PL + cW} y2={y} stroke="#e5e7eb" strokeWidth="1" strokeDasharray="3 3" />
            <text x={PL - 4} y={y + 4} textAnchor="end" fontSize="9" fill="#9ca3af">{Math.round(v)}</text>
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
              const val = s.values[ci] ?? 0;
              const bH = Math.max((val / yMax) * cH, 0);
              const x = gX - totW / 2 + si * (bW + 3);
              const y = PT + cH - bH;
              return (
                <g key={si}>
                  <rect x={x} y={y} width={bW} height={bH} fill={CHART_COLORS[si]} rx={2} opacity={0.88} />
                  {bH > 16 && <text x={x + bW / 2} y={y + 11} textAnchor="middle" fontSize="8" fill="white" fontWeight="bold">{val}</text>}
                </g>
              );
            })}
            <text x={gX} y={PT + cH + 12} textAnchor="middle" fontSize="9" fill="#6b7280">
              {cat.length > 10 ? cat.slice(0, 9) + '…' : cat}
            </text>
          </g>
        );
      })}
      {xLabel && <text x={PL + cW / 2} y={H - 2} textAnchor="middle" fontSize="10" fill="#6b7280" fontWeight="600">{xLabel}</text>}
      {yLabel && <text transform={`translate(10,${PT + cH / 2})rotate(-90)`} textAnchor="middle" fontSize="10" fill="#6b7280" fontWeight="600">{yLabel}</text>}
      {series.length > 1 && series.map((s, si) => (
        <g key={si} transform={`translate(${PL + si * 120},${H - 12})`}>
          <rect width="10" height="10" fill={CHART_COLORS[si]} rx="2" />
          <text x={13} y={9} fontSize="9" fill="#374151">{s.name.length > 14 ? s.name.slice(0, 13) + '…' : s.name}</text>
        </g>
      ))}
    </svg>
  );
}

function LineChart({ data }: { data: ChartData }) {
  const { series = [], xValues = [], xLabel, yLabel } = data;
  if (!series.length || !xValues.length) return null;
  const allV = series.flatMap(s => s.values);
  const maxV = Math.max(...allV, 1), minV = Math.min(...allV, 0);
  const W = 520, H = 255, PL = 50, PR = 16, PT = 14, PB = 83;
  const cW = W - PL - PR, cH = H - PT - PB;
  const range = maxV - minV || 1;
  const tStep = Math.max(Math.ceil(range / 5 / 5) * 5, 5);
  const yMin = Math.floor(minV / tStep) * tStep;
  const yMax = yMin + tStep * (Math.ceil((maxV - yMin) / tStep) + 1);
  const xS = (i: number) => PL + (i / Math.max(xValues.length - 1, 1)) * cW;
  const yS = (v: number) => PT + cH - ((v - yMin) / (yMax - yMin)) * cH;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" style={{ fontFamily: 'Inter,sans-serif' }}>
      {Array.from({ length: 5 }, (_, i) => {
        const v = yMin + i * tStep;
        const y = yS(v);
        if (y < PT - 5 || y > PT + cH + 5) return null;
        return (
          <g key={i}>
            <line x1={PL} y1={y} x2={PL + cW} y2={y} stroke="#e5e7eb" strokeWidth="1" strokeDasharray="3 3" />
            <text x={PL - 4} y={y + 4} textAnchor="end" fontSize="9" fill="#9ca3af">{Math.round(v)}</text>
          </g>
        );
      })}
      <line x1={PL} y1={PT} x2={PL} y2={PT + cH} stroke="#d1d5db" strokeWidth="1.5" />
      <line x1={PL} y1={PT + cH} x2={PL + cW} y2={PT + cH} stroke="#d1d5db" strokeWidth="1.5" />
      {xValues.map((v, i) => (
        <text key={i} x={xS(i)} y={PT + cH + 13} textAnchor="middle" fontSize="9" fill="#6b7280">{v}</text>
      ))}
      {series.map((s, si) => {
        const color = CHART_COLORS[si];
        const pts = s.values.map((v, i) => `${xS(i)},${yS(v)}`).join(' ');
        return (
          <g key={si}>
            <polyline points={pts} fill="none" stroke={color} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
            {s.values.map((v, i) => <circle key={i} cx={xS(i)} cy={yS(v)} r={3.5} fill={color} stroke="white" strokeWidth="1.5" />)}
          </g>
        );
      })}
      {xLabel && <text x={PL + cW / 2} y={H - 2} textAnchor="middle" fontSize="10" fill="#6b7280" fontWeight="600">{xLabel}</text>}
      {yLabel && <text transform={`translate(10,${PT + cH / 2})rotate(-90)`} textAnchor="middle" fontSize="10" fill="#6b7280" fontWeight="600">{yLabel}</text>}
      {series.map((s, si) => (
        <g key={si} transform={`translate(${PL + si * 140},${H - 12})`}>
          <line x1={0} y1={5} x2={13} y2={5} stroke={CHART_COLORS[si]} strokeWidth="2.5" />
          <circle cx={6} cy={5} r={2.5} fill={CHART_COLORS[si]} />
          <text x={17} y={9} fontSize="9" fill="#374151">{s.name.length > 15 ? s.name.slice(0, 14) + '…' : s.name}</text>
        </g>
      ))}
    </svg>
  );
}

function PieChartViz({ data }: { data: ChartData }) {
  const { segments = [], unit } = data;
  if (!segments.length) return null;
  const total = segments.reduce((s, x) => s + x.value, 0) || 1;
  const cx = 110, cy = 110, r = 90;
  if (segments.length === 1) {
    return (
      <div className="flex flex-col sm:flex-row items-center gap-4">
        <svg viewBox="0 0 220 220" className="w-[160px] flex-shrink-0">
          <circle cx={cx} cy={cy} r={r} fill={CHART_COLORS[0]} />
          <text x={cx} y={cy} textAnchor="middle" dominantBaseline="middle" fontSize="14" fill="white" fontWeight="bold">{segments[0].value}{unit || '%'}</text>
        </svg>
        <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-sm" style={{ background: CHART_COLORS[0] }} /><span className="text-sm text-gray-700">{segments[0].label}</span></div>
      </div>
    );
  }
  let ang = -Math.PI / 2;
  const slices = segments.map((seg, i) => {
    const a = (seg.value / total) * 2 * Math.PI;
    const x1 = cx + r * Math.cos(ang), y1 = cy + r * Math.sin(ang);
    const endAng = ang + a - 0.0001;
    const x2 = cx + r * Math.cos(endAng), y2 = cy + r * Math.sin(endAng);
    const mid = ang + a / 2;
    const lx = cx + r * 0.65 * Math.cos(mid), ly = cy + r * 0.65 * Math.sin(mid);
    const large = a > Math.PI ? 1 : 0;
    ang += a;
    return { x1, y1, x2, y2, lx, ly, large, color: CHART_COLORS[i % CHART_COLORS.length], ...seg };
  });
  return (
    <div className="flex flex-col sm:flex-row items-center gap-4">
      <svg viewBox="0 0 220 220" className="w-[160px] flex-shrink-0" style={{ fontFamily: 'Inter,sans-serif' }}>
        {slices.map((s, i) => <path key={i} d={`M ${cx} ${cy} L ${s.x1} ${s.y1} A ${r} ${r} 0 ${s.large} 1 ${s.x2} ${s.y2} Z`} fill={s.color} stroke="white" strokeWidth="2" />)}
        {slices.map((s, i) => s.value / total > 0.07 && <text key={i} x={s.lx} y={s.ly} textAnchor="middle" dominantBaseline="middle" fontSize="10" fill="white" fontWeight="bold">{s.value}{unit || '%'}</text>)}
      </svg>
      <div className="flex flex-col gap-1.5 flex-1">
        {slices.map((s, i) => (
          <div key={i} className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ background: s.color }} />
            <span className="text-sm text-gray-700 flex-1 min-w-0 truncate">{s.label}</span>
            <span className="text-sm font-bold text-gray-900 flex-shrink-0">{s.value}{unit || '%'}</span>
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
            {headers.map((h, i) => <th key={i} className="px-3 py-2 text-left font-bold text-indigo-800 border-b border-indigo-100 whitespace-nowrap text-xs">{h}{i > 0 && unit ? ` (${unit})` : ''}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, ri) => (
            <tr key={ri} className={ri % 2 === 0 ? 'bg-white' : 'bg-gray-50/60'}>
              {row.map((cell, ci) => <td key={ci} className="px-3 py-2 text-gray-700 border-b border-gray-100 text-sm">{cell}</td>)}
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
          <div className="flex flex-col items-center gap-1 w-[80px]">
            <div className="w-8 h-8 rounded-full flex items-center justify-center font-black text-sm text-white shadow-md" style={{ background: CHART_COLORS[i % CHART_COLORS.length] }}>{step.id}</div>
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
  north: { top: '10%', left: '50%' }, south: { top: '80%', left: '50%' },
  east: { top: '50%', left: '78%' }, west: { top: '50%', left: '22%' },
  center: { top: '48%', left: '50%' }, northeast: { top: '18%', left: '74%' },
  northwest: { top: '18%', left: '26%' }, southeast: { top: '78%', left: '74%' },
  southwest: { top: '78%', left: '26%' },
};

type MapFeature = { name: string; position: string; icon: string; description: string };
function MapPanel({ features, period, color }: { features: MapFeature[]; period?: string; color: string }) {
  return (
    <div className="flex-1 min-w-0">
      <div className="inline-flex px-2 py-0.5 rounded-full text-white text-xs font-bold mb-1.5 shadow-sm" style={{ background: color }}>{period}</div>
      <div className="relative w-full" style={{ paddingBottom: '100%' }}>
        <div className="absolute inset-0 rounded-xl border-2 bg-green-50/50 overflow-hidden" style={{ borderColor: color + '55' }}>
          <div className="absolute top-1 right-1 text-[8px] font-black text-gray-400 bg-white/80 rounded px-1">N↑</div>
          <svg className="absolute inset-0 w-full h-full opacity-10">
            {[1, 2, 3, 4].map(i => <line key={`h${i}`} x1="0" y1={`${i * 20}%`} x2="100%" y2={`${i * 20}%`} stroke="#666" strokeWidth="0.5" />)}
            {[1, 2, 3, 4].map(i => <line key={`v${i}`} x1={`${i * 20}%`} y1="0" x2={`${i * 20}%`} y2="100%" stroke="#666" strokeWidth="0.5" />)}
          </svg>
          {features.map((f, i) => {
            const p = POS[f.position?.toLowerCase()] || POS.center;
            return (
              <div key={i} className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center" style={{ top: p.top, left: p.left }} title={`${f.name}: ${f.description}`}>
                <span className="text-lg leading-none drop-shadow-sm">{f.icon}</span>
                <span className="text-[7px] font-bold text-gray-700 bg-white/90 px-0.5 py-0.5 rounded shadow-sm text-center leading-tight max-w-[50px]">{f.name}</span>
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
      <div className="flex gap-2"><MapPanel features={features1} period={period1} color="#6366f1" /><MapPanel features={features2} period={period2} color="#f59e0b" /></div>
      {changes.length > 0 && (
        <div className="bg-amber-50 rounded-lg p-2.5 border border-amber-100">
          <p className="text-[9px] font-bold text-amber-700 uppercase tracking-wider mb-1">Key Changes</p>
          <ul className="space-y-0.5">{changes.map((c, i) => <li key={i} className="text-xs text-amber-900 flex gap-1"><span className="text-amber-500 font-bold">→</span><span>{c}</span></li>)}</ul>
        </div>
      )}
    </div>
  );
}

function ChartRenderer({ data }: { data: ChartData }) {
  switch (data.type) {
    case 'bar': return <BarChart data={data} />;
    case 'line': return <LineChart data={data} />;
    case 'pie': return <PieChartViz data={data} />;
    case 'table': return <TableViz data={data} />;
    case 'process': return <ProcessViz data={data} />;
    case 'map': return <MapViz data={data} />;
    default: return <p className="text-gray-400 text-sm italic">Loại biểu đồ không xác định.</p>;
  }
}

// ─── LOCAL STORAGE ────────────────────────────────────────────────────────────
const LS_KEY = 'task1_sessions_v2';
function loadSessions(): PracticeSession[] { try { return JSON.parse(localStorage.getItem(LS_KEY) || '[]'); } catch { return []; } }
function saveSessions(s: PracticeSession[]) { try { localStorage.setItem(LS_KEY, JSON.stringify(s.slice(0, 20))); } catch { } }

// ─── SCORE HELPERS ────────────────────────────────────────────────────────────
function getScoreColor(score: number) { return score >= 80 ? 'text-emerald-600' : score >= 60 ? 'text-amber-600' : 'text-red-500'; }
function getScoreBg(score: number) { return score >= 80 ? 'from-emerald-500 to-green-400' : score >= 60 ? 'from-amber-500 to-yellow-400' : 'from-red-500 to-rose-400'; }

function speak(text: string) {
  const url = `/api/tts?text=${encodeURIComponent(text)}&v=2`;
  new Audio(url).play().catch(() => { });
}

// ─── MAIN PAGE ───────────────────────────────────────────────────────────────
export default function Task1PracticePage() {
  const { createWritingSample } = useStore();
  const [mounted, setMounted] = useState(false);
  const [tab, setTab] = useState<'practice' | 'history'>('practice');

  // Chart generation
  const [chartData, setChartData] = useState<ChartData | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [genError, setGenError] = useState('');
  const [selectedType, setSelectedType] = useState<string>('random');
  const [customTopic, setCustomTopic] = useState<string>('');
  const [showCustomizer, setShowCustomizer] = useState<boolean>(true);

  // Per-sentence practice state
  const [currentSentenceIdx, setCurrentSentenceIdx] = useState(0);
  const [inputText, setInputText] = useState('');
  const [isGrading, setIsGrading] = useState(false);
  const [gradeResult, setGradeResult] = useState<GradeResult | null>(null);
  const [gradeChecked, setGradeChecked] = useState(false);
  const [attemptCount, setAttemptCount] = useState(0);
  const [savedToWriting, setSavedToWriting] = useState(false);

  // Completed sentences
  const [completedSentences, setCompletedSentences] = useState<CompletedSentence[]>([]);
  const [phase, setPhase] = useState<'idle' | 'practicing' | 'done'>('idle');

  // History
  const [sessions, setSessions] = useState<PracticeSession[]>([]);
  const [selectedSession, setSelectedSession] = useState<PracticeSession | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => { setMounted(true); setSessions(loadSessions()); }, []);

  const generateChart = useCallback(async (overrideType?: string, overrideTopic?: string) => {
    setIsGenerating(true);
    setGenError('');
    setChartData(null);
    setPhase('idle');
    setCurrentSentenceIdx(0);
    setCompletedSentences([]);
    setInputText('');
    setGradeResult(null);
    setGradeChecked(false);
    setAttemptCount(0);
    setSavedToWriting(false);
    try {
      const typeToSend = overrideType ?? selectedType;
      const topicToSend = overrideTopic !== undefined ? overrideTopic : customTopic;

      const res = await fetch('/api/ai/task1-generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chartType: typeToSend,
          customTopic: topicToSend,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Lỗi server');
      setChartData(data);
      setPhase('practicing');
      setShowCustomizer(false);
    } catch (e: any) {
      setGenError(e.message || 'Không thể tạo đề bài. Vui lòng thử lại.');
    } finally {
      setIsGenerating(false);
    }
  }, [selectedType, customTopic]);

  const gradeSentence = async () => {
    if (!chartData || !inputText.trim()) return;
    setIsGrading(true);
    setGradeResult(null);
    setGradeChecked(true);
    setAttemptCount(prev => prev + 1);
    try {
      const res = await fetch('/api/ai/task1-grade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sentence: inputText.trim(),
          sentenceIndex: currentSentenceIdx,
          chartType: chartData.type,
          chartContext: chartData.context,
          chartTitle: chartData.title,
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setGradeResult(data);
    } catch (e: any) {
      setGradeResult({
        score: 0,
        grammarErrors: [],
        vocabularyTips: [],
        structureFeedback: 'Không thể phân tích. Thử lại.',
        correctedSentence: inputText,
      });
    } finally {
      setIsGrading(false);
    }
  };

  const retryGrade = () => {
    setInputText('');
    setGradeChecked(false);
    setGradeResult(null);
    setTimeout(() => textareaRef.current?.focus(), 100);
  };

  const nextSentence = () => {
    if (!gradeResult || !chartData) return;
    const completed: CompletedSentence = {
      original: inputText.trim(),
      corrected: gradeResult.correctedSentence || inputText.trim(),
      score: gradeResult.score,
    };
    const newCompleted = [...completedSentences, completed];
    setCompletedSentences(newCompleted);

    if (currentSentenceIdx + 1 >= TOTAL_SENTENCES) {
      // All done
      setPhase('done');
      const avgScore = Math.round(newCompleted.reduce((sum, s) => sum + s.score, 0) / newCompleted.length);
      const session: PracticeSession = {
        id: Date.now().toString(),
        chartData,
        sentences: newCompleted,
        avgScore,
        savedAt: Date.now(),
      };
      const updated = [session, ...sessions];
      setSessions(updated);
      saveSessions(updated);
      setTimeout(() => { setTab('history'); setSelectedSession(session); }, 0);
    } else {
      setCurrentSentenceIdx(idx => idx + 1);
      setInputText('');
      setGradeChecked(false);
      setGradeResult(null);
      setAttemptCount(0);
      setSavedToWriting(false);
      setTimeout(() => textareaRef.current?.focus(), 100);
    }
  };

  const handleSaveToWriting = useCallback(() => {
    if (!chartData || !gradeResult) return;
    const corrected = gradeResult.correctedSentence || inputText;
    createWritingSample({
      task: 'task1',
      title: `[Luyện Task 1] ${chartData.title || chartData.type} — Câu ${currentSentenceIdx + 1}`,
      topic: chartData.context,
      content: `Chart: ${chartData.title}\n\nYêu cầu: ${chartData.prompt}\n\nCâu ${currentSentenceIdx + 1} (${SENTENCE_ROLES[currentSentenceIdx]}):\n\nCâu của bạn:\n${inputText.trim()}\n\nCâu đã sửa:\n${corrected}\n\nScore: ${gradeResult.score}/100`,
      tags: ['from_practice', 'task1_sentence'],
    });
    setSavedToWriting(true);
  }, [chartData, gradeResult, inputText, currentSentenceIdx, createWritingSample]);

  const deleteSession = (id: string) => {
    const updated = sessions.filter(s => s.id !== id);
    setSessions(updated);
    saveSessions(updated);
    if (selectedSession?.id === id) setSelectedSession(null);
  };

  const handleNewFromHistory = useCallback(() => {
    setTab('practice');
    const typeToUse = selectedSession?.chartData.type || 'random';
    setSelectedType(typeToUse);
    setTimeout(() => generateChart(typeToUse, ''), 0);
  }, [generateChart, selectedSession]);

  if (!mounted) return <LoadingScreen />;

  const currentMeta = chartData ? TYPE_META[chartData.type] : null;
  const currentColor = currentMeta?.color ?? '#6366f1';

  return (
    <div className="flex flex-col gap-5 max-w-5xl mx-auto w-full animate-fade-in pb-16">

      {/* ── Hero ── */}
      <div className="relative flex flex-col items-center text-center gap-3 bg-gradient-to-br from-indigo-50 via-purple-50 to-blue-50 px-8 pt-7 pb-6 rounded-3xl shadow-lg overflow-hidden border border-indigo-100/60">
        <div className="absolute inset-0 rounded-3xl pointer-events-none" style={{ boxShadow: '0 0 0 1.5px rgba(99,102,241,0.22), 0 0 50px 6px rgba(99,102,241,0.09)' }} />
        <div className="w-12 h-12 bg-white rounded-2xl shadow-md flex items-center justify-center text-indigo-600 z-10 ring-1 ring-indigo-100">
          <BarChart2 size={24} />
        </div>
        <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight z-10">Luyện IELTS Task 1</h1>
        <p className="text-gray-500 max-w-lg z-10 text-[13px] leading-relaxed">
          Tùy chọn hoặc gõ dạng bài bạn muốn luyện (Bar, Line, Pie, Table, Process, Map) — AI tạo đề bài chuẩn IELTS. Viết từng câu — AI chấm realtime — đạt <b>≥ {PASS_THRESHOLD}/100</b> mới qua câu tiếp.
        </p>
        <div className="flex gap-2 bg-white/70 backdrop-blur-sm p-1 rounded-xl shadow-sm ring-1 ring-gray-200/60 z-10">
          <button onClick={() => setTab('practice')} className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg font-bold text-sm transition-all ${tab === 'practice' ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-500 hover:bg-gray-100'}`}>
            <BarChart2 size={14} /> Luyện tập
          </button>
          <button onClick={() => setTab('history')} className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg font-bold text-sm transition-all ${tab === 'history' ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-500 hover:bg-gray-100'}`}>
            <History size={14} /> Lịch sử{sessions.length > 0 && <span className="ml-1 bg-indigo-100 text-indigo-700 text-xs font-black px-1.5 rounded-full">{sessions.length}</span>}
          </button>
        </div>
      </div>

      {/* ── PRACTICE TAB ── */}
      {tab === 'practice' && (
        <>
          {/* ── CUSTOMIZER & GENERATOR PANEL ── */}
          {(!chartData || showCustomizer) ? (
            <div className="bg-white rounded-3xl p-5 md:p-6 shadow-sm border border-indigo-100/80 flex flex-col gap-4 transition-all">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 text-white flex items-center justify-center shadow-sm">
                    <SlidersHorizontal size={16} />
                  </span>
                  <div>
                    <h2 className="text-base font-extrabold text-gray-800">Chọn hoặc gõ dạng bài Task 1</h2>
                    <p className="text-xs text-gray-400">Chọn dạng bài bạn muốn luyện hoặc gõ chủ đề chi tiết bên dưới</p>
                  </div>
                </div>
                {chartData && (
                  <button
                    onClick={() => setShowCustomizer(false)}
                    className="text-xs font-bold text-gray-400 hover:text-gray-600 px-2.5 py-1 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    Thu gọn
                  </button>
                )}
              </div>

              {/* Chart type badges */}
              <div className="flex flex-wrap gap-2">
                {CHART_TYPE_OPTIONS.map(opt => {
                  const isSelected = selectedType === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setSelectedType(opt.id)}
                      className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all border ${
                        isSelected
                          ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white border-transparent shadow-md shadow-indigo-200 scale-[1.02]'
                          : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-white hover:border-indigo-300 hover:text-indigo-600'
                      }`}
                    >
                      <span className="text-sm">{opt.icon}</span>
                      <span>{opt.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Custom Topic / Prompt Input */}
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="relative flex-1">
                  <input
                    type="text"
                    value={customTopic}
                    onChange={e => setCustomTopic(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter' && !isGenerating) {
                        generateChart();
                      }
                    }}
                    placeholder="Gõ dạng bài hoặc chủ đề chi tiết (VD: Pie chart năng lượng, Map quy hoạch, Quy trình làm bánh mì...)"
                    className="w-full px-4 py-2.5 pl-10 pr-9 text-xs sm:text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-gray-800 placeholder-gray-400"
                  />
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400">
                    <Search size={15} />
                  </span>
                  {customTopic && (
                    <button
                      type="button"
                      onClick={() => setCustomTopic('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-0.5"
                      title="Xóa nội dung"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>

                {/* Action Button */}
                <button
                  type="button"
                  onClick={() => generateChart()}
                  disabled={isGenerating}
                  className="flex items-center justify-center gap-2 px-6 py-2.5 bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-700 hover:opacity-95 text-white font-bold rounded-xl shadow-md transition-all hover:scale-[1.02] disabled:opacity-60 disabled:hover:scale-100 text-xs sm:text-sm flex-shrink-0"
                >
                  {isGenerating ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                  {isGenerating
                    ? 'AI đang tạo đề...'
                    : chartData
                    ? 'Tạo đề mới'
                    : 'Tạo đề bài AI'}
                </button>
              </div>

              {/* Quick suggested chips */}
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                <span className="text-[11px] font-bold text-gray-400 flex items-center gap-1">
                  💡 Gợi ý nhanh:
                </span>
                {SUGGESTED_PROMPTS.map((s, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setSelectedType(s.type);
                      setCustomTopic(s.topic);
                    }}
                    className="text-[11px] font-medium px-2.5 py-1 bg-indigo-50/70 hover:bg-indigo-100 text-indigo-700 rounded-lg transition-colors border border-indigo-100"
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            /* Collapsed bar when chartData is present */
            <div className="bg-white rounded-2xl px-5 py-3 shadow-sm border border-gray-200 flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-gray-400">Đang luyện:</span>
                <span
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold text-white shadow-sm"
                  style={{ background: currentColor }}
                >
                  <TypeIcon type={chartData.type} size={12} />
                  {currentMeta?.label}
                </span>
                {customTopic && (
                  <span className="text-xs text-gray-500 bg-gray-50 border border-gray-100 px-2.5 py-0.5 rounded-md truncate max-w-[200px] sm:max-w-xs" title={customTopic}>
                    {customTopic}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowCustomizer(true)}
                  className="flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-3.5 py-1.5 rounded-xl transition-colors"
                >
                  <SlidersHorizontal size={13} />
                  Đổi dạng bài / Nhập đề khác
                  <ChevronDown size={13} />
                </button>
                <button
                  type="button"
                  onClick={() => generateChart()}
                  disabled={isGenerating}
                  className="flex items-center gap-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 px-3.5 py-1.5 rounded-xl shadow-sm transition-all disabled:opacity-60"
                >
                  {isGenerating ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
                  Luyện đề khác
                </button>
              </div>
            </div>
          )}

          {genError && (
            <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700">
              <AlertCircle size={16} className="flex-shrink-0" />
              <p className="text-sm font-medium">{genError}</p>
            </div>
          )}

          {/* Main practice layout */}
          {chartData && phase === 'practicing' && (
            <div className="flex flex-col gap-5 max-w-3xl mx-auto w-full">
              {/* TOP: Chart panel — full width, no crop */}
              <div className="flex flex-col gap-3">
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                  {/* Chart header */}
                  <div className="flex items-center gap-2 px-4 py-2.5 border-b border-gray-100" style={{ background: currentColor + '12' }}>
                    <span style={{ color: currentColor }}><TypeIcon type={chartData.type} size={14} /></span>
                    <span className="font-bold text-sm" style={{ color: currentColor }}>{currentMeta?.label}</span>
                    <span className="ml-auto text-xs font-bold px-2 py-0.5 rounded-full text-white" style={{ background: currentColor }}>IELTS Task 1</span>
                  </div>
                  {/* Context */}
                  <div className="px-5 pt-4 pb-3">
                    <div className="bg-blue-50/70 border border-blue-100 rounded-xl p-4 mb-4">
                      <p className="text-sm text-gray-700 leading-relaxed">
                        <span className="font-bold text-blue-800">Đề bài: </span>{chartData.context}
                      </p>
                    </div>
                    {/* Chart — unconstrained height so it doesn't crop */}
                    <div className="w-full flex justify-center">
                      <div className="w-full max-w-xl">
                        <ChartRenderer data={chartData} />
                      </div>
                    </div>
                    <p className="mt-4 text-xs text-gray-400 italic bg-gray-50 p-3 rounded-xl border border-gray-100 leading-relaxed text-center">
                      {chartData.prompt}
                    </p>
                  </div>
                </div>

                {/* Progress dots */}
                <div className="bg-white rounded-xl px-4 py-3 shadow-sm border border-gray-200">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-gray-500">Tiến độ</span>
                  </div>
                  <div className="flex gap-1.5 flex-wrap">
                    {Array.from({ length: TOTAL_SENTENCES }, (_, i) => {
                      const done = completedSentences[i];
                      const isCurrent = i === currentSentenceIdx;
                      return (
                        <div key={i} className={`flex-1 min-w-[28px] h-7 rounded-lg flex items-center justify-center text-[10px] font-black transition-all border ${
                          done
                            ? done.score >= PASS_THRESHOLD ? 'bg-emerald-500 text-white border-emerald-500' : 'bg-amber-400 text-white border-amber-400'
                            : isCurrent ? 'bg-indigo-600 text-white border-indigo-600 shadow-md' : 'bg-gray-100 text-gray-400 border-gray-200'
                        }`}>
                          {done ? (done.score >= PASS_THRESHOLD ? '✓' : done.score) : i + 1}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* BOTTOM: Writing panel */}
              <div className="flex flex-col gap-3">
                {/* Sentence context */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4 flex flex-col gap-3">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs font-black flex-shrink-0">{currentSentenceIdx + 1}</span>
                    <div>
                      <p className="text-xs font-black text-gray-400 uppercase tracking-wider">Câu {currentSentenceIdx + 1}/{TOTAL_SENTENCES}</p>
                      <p className="text-sm font-bold text-indigo-700">{SENTENCE_ROLES[currentSentenceIdx]}</p>
                    </div>
                  </div>

                  <textarea
                    ref={textareaRef}
                    rows={3}
                    disabled={gradeChecked}
                    placeholder={HINTS[chartData.type]?.[currentSentenceIdx] ?? 'Write your sentence here...'}
                    value={inputText}
                    onChange={e => setInputText(e.target.value)}
                    onKeyDown={e => {
                      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter' && !gradeChecked && inputText.trim()) gradeSentence();
                    }}
                    className="w-full resize-none text-sm p-3 rounded-xl border border-gray-200 focus:border-indigo-300 focus:ring-2 focus:ring-indigo-500/10 outline-none transition-all bg-gray-50/50 focus:bg-white placeholder:text-gray-300 text-gray-800 disabled:opacity-60"
                  />
                  {!gradeChecked && <p className="text-xs text-gray-400">Ctrl+Enter để phân tích nhanh{attemptCount > 0 && <span className="ml-2 font-bold text-gray-600">Lần thử: {attemptCount}</span>}</p>}

                  {/* Grade button */}
                  {!gradeChecked && (
                    <button onClick={gradeSentence} disabled={!inputText.trim() || isGrading}
                      className="w-full py-2.5 flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-bold rounded-xl shadow-md transition-all disabled:opacity-50 text-sm">
                      <Sparkles size={15} /> Phân tích câu này
                    </button>
                  )}
                </div>

                {/* Grade result */}
                {gradeChecked && (
                  <div className="flex flex-col gap-3 animate-fade-in">
                    {isGrading && (
                      <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl border border-gray-200">
                        <Loader2 size={18} className="animate-spin text-indigo-600 flex-shrink-0" />
                        <div>
                          <p className="font-semibold text-gray-800 text-sm">AI đang phân tích câu của bạn...</p>
                          <p className="text-xs text-gray-500">Đang kiểm tra ngữ pháp, từ vựng, cấu trúc Task 1</p>
                        </div>
                      </div>
                    )}

                    {gradeResult && !isGrading && (
                      <div className="flex flex-col gap-3 bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                        {/* Score header */}
                        <div className={`flex items-center gap-3 p-4 text-white bg-gradient-to-r ${getScoreBg(gradeResult.score)}`}>
                          <div className="w-14 h-14 rounded-2xl bg-white/20 flex flex-col items-center justify-center flex-shrink-0">
                            <span className="text-2xl font-black leading-none">{gradeResult.score}</span>
                            <span className="text-xs font-semibold opacity-80">/ 100</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-sm">
                              {gradeResult.score >= 80 ? '🎉 Xuất sắc! Qua câu tiếp!' : gradeResult.score >= 60 ? '👍 Khá tốt!' : '❌ Chưa đạt — Viết lại!'}
                            </p>
                            <p className="text-xs opacity-90 leading-relaxed mt-0.5 line-clamp-2">{gradeResult.structureFeedback}</p>
                            {gradeResult.score < PASS_THRESHOLD && (
                              <p className="text-xs opacity-80 mt-0.5 font-semibold">⚠️ Cần ≥ {PASS_THRESHOLD}/100 để qua câu tiếp.</p>
                            )}
                          </div>
                        </div>

                        <div className="px-4 pb-4 flex flex-col gap-3">
                          {/* Corrected sentence */}
                          {gradeResult.correctedSentence && gradeResult.correctedSentence.trim() !== inputText.trim() && (
                            <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200">
                              <div className="flex items-center gap-2 mb-1.5">
                                <Check size={13} className="text-emerald-600 flex-shrink-0" />
                                <span className="text-xs font-bold text-emerald-700">Câu đúng hoàn chỉnh</span>
                                <button onClick={() => speak(gradeResult.correctedSentence)} className="ml-auto w-6 h-6 rounded-lg flex items-center justify-center text-emerald-600 hover:bg-emerald-100 transition-colors">
                                  <Volume2 size={12} />
                                </button>
                              </div>
                              <p className="text-emerald-800 font-medium text-sm leading-relaxed">{gradeResult.correctedSentence}</p>
                            </div>
                          )}

                          {/* Grammar errors */}
                          {gradeResult.grammarErrors?.length > 0 && (
                            <div className="p-3 bg-red-50 rounded-xl border border-red-200">
                              <div className="flex items-center gap-2 mb-2">
                                <AlertCircle size={13} className="text-red-500 flex-shrink-0" />
                                <span className="text-xs font-bold text-red-600">Lỗi ngữ pháp ({gradeResult.grammarErrors.length})</span>
                              </div>
                              <div className="flex flex-col gap-2">
                                {gradeResult.grammarErrors.map((err, i) => (
                                  <div key={i} className="text-xs">
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      <span className="px-1.5 py-0.5 bg-red-100 text-red-700 rounded font-mono line-through">{err.original}</span>
                                      <span className="text-gray-400">→</span>
                                      <span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-700 rounded font-mono font-semibold">{err.correction}</span>
                                    </div>
                                    <p className="text-gray-500 mt-0.5 ml-0.5">{err.explanation}</p>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Vocabulary tips */}
                          {gradeResult.vocabularyTips?.length > 0 && (
                            <div className="p-3 bg-blue-50 rounded-xl border border-blue-200">
                              <div className="flex items-center gap-2 mb-2">
                                <TVocab size={13} className="text-blue-500 flex-shrink-0" />
                                <span className="text-xs font-bold text-blue-600">Cải thiện từ vựng</span>
                              </div>
                              <div className="flex flex-col gap-2">
                                {gradeResult.vocabularyTips.map((tip, i) => (
                                  <div key={i} className="text-xs">
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      <span className="px-1.5 py-0.5 bg-blue-100 text-blue-600 rounded font-medium">{tip.studentWord}</span>
                                      <span className="text-gray-400">→</span>
                                      <span className="px-1.5 py-0.5 bg-indigo-100 text-indigo-700 rounded font-semibold">{tip.betterAlternative}</span>
                                    </div>
                                    <p className="text-gray-500 mt-0.5 ml-0.5">{tip.reason}</p>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Action buttons */}
                          <div className="flex flex-col gap-2">
                            {/* Save to Writing */}
                            <button onClick={handleSaveToWriting} disabled={savedToWriting}
                              className="flex items-center justify-center gap-2 w-full py-2 rounded-xl text-xs font-semibold border transition-all disabled:opacity-60"
                              style={{ background: savedToWriting ? '#d1fae5' : 'transparent', color: savedToWriting ? '#059669' : '#6b7280', borderColor: savedToWriting ? '#059669' : '#e5e7eb' }}>
                              {savedToWriting ? <><Check size={13} /> Đã lưu vào Bài mẫu Writing</> : <><Save size={13} /> Lưu câu này vào Bài mẫu Writing</>}
                            </button>

                            {/* Score < 80: retry */}
                            {gradeResult.score < PASS_THRESHOLD && (
                              <button onClick={retryGrade} className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-sm font-bold border border-gray-200 text-gray-700 hover:bg-gray-50 transition-all">
                                <RotateCcw size={14} /> Viết lại câu này (chưa đạt {PASS_THRESHOLD}/100)
                              </button>
                            )}

                            {/* Score >= 80: next */}
                            {gradeResult.score >= PASS_THRESHOLD && (
                              <button onClick={nextSentence} className="flex items-center justify-center gap-2 w-full py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold rounded-xl shadow-md transition-all text-sm">
                                {currentSentenceIdx + 1 >= TOTAL_SENTENCES ? 'Hoàn thành 🎉' : <>Câu tiếp theo <ArrowRight size={15} /></>}
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Instructions when idle */}
          {!chartData && !isGenerating && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                { icon: '🎯', title: 'Tùy chọn & Gõ dạng bài', desc: 'Chủ động chọn hoặc gõ dạng đề mong muốn (Pie, Bar, Line, Table, Process, Map) để AI sinh đề chuẩn theo yêu cầu, tránh lặp lại biểu đồ đường.' },
                { icon: '✍️', title: 'Chấm từng câu realtime', desc: `Viết 1 câu → AI chấm điểm 0–100. Đạt ≥ ${PASS_THRESHOLD}/100 mới qua câu tiếp. Có feedback ngữ pháp + từ vựng.` },
                { icon: '💾', title: 'Lưu vào Bài mẫu Writing', desc: 'Mỗi câu xuất sắc có thể lưu thẳng vào bộ Writing Samples để ôn lại sau.' },
              ].map((c, i) => (
                <div key={i} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-200">
                  <div className="text-3xl mb-2.5">{c.icon}</div>
                  <h3 className="font-bold text-gray-800 mb-1.5 text-[15px]">{c.title}</h3>
                  <p className="text-sm text-gray-500 leading-relaxed">{c.desc}</p>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* ── HISTORY TAB ── */}
      {tab === 'history' && (
        <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-5">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 bg-gray-50/80">
              <p className="font-bold text-sm text-gray-700">Lịch sử luyện tập</p>
            </div>
            {sessions.length === 0 ? (
              <div className="p-8 text-center"><History size={28} className="text-gray-300 mx-auto mb-2" /><p className="text-sm text-gray-400">Chưa có bài luyện nào.</p></div>
            ) : (
              <div className="overflow-y-auto max-h-[560px] custom-scrollbar divide-y divide-gray-100">
                {sessions.map(sess => {
                  const meta = TYPE_META[sess.chartData.type];
                  const isSelected = selectedSession?.id === sess.id;
                  return (
                    <div key={sess.id} onClick={() => setSelectedSession(sess)}
                      className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors ${isSelected ? 'bg-indigo-50' : 'hover:bg-gray-50'}`}>
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white flex-shrink-0" style={{ background: meta?.color ?? '#6366f1' }}>
                        <TypeIcon type={sess.chartData.type} size={14} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-gray-800 truncate">{sess.chartData.title || meta?.label}</p>
                        <p className="text-[10px] text-gray-400">{sess.sentences.length} câu · TB {sess.avgScore}/100 · {new Date(sess.savedAt).toLocaleDateString('vi-VN')}</p>
                      </div>
                      <div className={`text-xs font-black px-1.5 py-0.5 rounded-full ${sess.avgScore >= 80 ? 'bg-emerald-100 text-emerald-700' : sess.avgScore >= 60 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-600'}`}>{sess.avgScore}</div>
                      <button onClick={e => { e.stopPropagation(); deleteSession(sess.id); }} className="p-1 rounded-lg text-gray-300 hover:text-red-400 hover:bg-red-50 transition-colors">
                        <Trash2 size={12} />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
            {!selectedSession ? (
              <div className="h-full min-h-[280px] flex flex-col items-center justify-center text-center p-8">
                <History size={32} className="text-gray-200 mb-3" />
                <p className="text-gray-400 font-medium">Chọn một phiên luyện để xem lại</p>
              </div>
            ) : (
              <div className="flex flex-col">
                <div className="px-5 py-4 border-b border-gray-100" style={{ background: (TYPE_META[selectedSession.chartData.type]?.color ?? '#6366f1') + '0F' }}>
                  <div className="flex items-center gap-2 mb-1">
                    <span style={{ color: TYPE_META[selectedSession.chartData.type]?.color }}><TypeIcon type={selectedSession.chartData.type} size={14} /></span>
                    <h2 className="font-bold text-gray-800">{selectedSession.chartData.title}</h2>
                    <span className={`ml-auto text-sm font-black px-2 py-0.5 rounded-full ${selectedSession.avgScore >= 80 ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>TB {selectedSession.avgScore}/100</span>
                  </div>
                  <p className="text-xs text-gray-500">{new Date(selectedSession.savedAt).toLocaleString('vi-VN')} · {selectedSession.sentences.length} câu</p>
                </div>

                <div className="p-5 flex flex-col gap-4 overflow-y-auto max-h-[540px] custom-scrollbar">
                  {/* Mini chart */}
                  <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                    <ChartRenderer data={selectedSession.chartData} />
                  </div>

                  {/* Sentences review */}
                  <div>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Bài làm của bạn</p>
                    <div className="flex flex-col gap-2">
                      {selectedSession.sentences.map((s, i) => (
                        <div key={i} className={`rounded-xl p-3 border text-sm ${s.score >= PASS_THRESHOLD ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'}`}>
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-full ${s.score >= PASS_THRESHOLD ? 'bg-emerald-500 text-white' : 'bg-red-400 text-white'}`}>{s.score}/100</span>
                            <span className="text-xs text-gray-500 font-medium">{SENTENCE_ROLES[i]?.split(':')[0]}</span>
                          </div>
                          <p className="text-gray-700 leading-relaxed">{s.corrected}</p>
                          {s.original !== s.corrected && <p className="text-xs text-gray-400 mt-1 italic">Gốc: {s.original}</p>}
                        </div>
                      ))}
                    </div>
                  </div>

                  <button onClick={handleNewFromHistory}
                    className="w-full py-3 flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-bold rounded-xl transition-all text-sm">
                    <RefreshCw size={14} /> Luyện đề mới
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
