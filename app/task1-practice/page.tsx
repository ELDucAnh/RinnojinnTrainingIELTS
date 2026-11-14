'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Loader2,
  Sparkles,
  RefreshCw,
  BarChart2,
  TrendingUp,
  PieChart,
  Table2,
  Workflow,
  Map,
  AlertCircle,
  History,
  Trash2,
  Search,
  X,
  SlidersHorizontal,
  ChevronDown,
  Send,
} from 'lucide-react';
import { LoadingScreen } from '@/components/LoadingScreen';
import { useStore } from '@/lib/store';
import { appConfirm } from '@/lib/dialog';
import {
  countWords,
  normalizeOutline,
  type BodyGradeResult,
  type ChartData,
  type CompletedBody,
  type LegacyTask1Session,
  type OutlineBodyItem,
  type Task1CompletedSession,
} from '@/lib/writing-practice-types';
import { Task1ChartRenderer } from '@/components/writing-practice/Task1ChartRenderer';
import { BodyProgressStepper } from '@/components/writing-practice/BodyProgressStepper';
import { PreviousBodiesPanel } from '@/components/writing-practice/PreviousBodiesPanel';
import { BodyOutlineCard } from '@/components/writing-practice/BodyOutlineCard';
import { BodyFeedbackPanel } from '@/components/writing-practice/BodyFeedbackPanel';
import { CompletedEssayDetails } from '@/components/writing-practice/CompletedEssayDetails';

const TOTAL_BODIES = 4;
const LS_KEY_V3 = 'task1_sessions_v3';
const LS_KEY_LEGACY = 'task1_sessions_v2';

const TYPE_META: Record<string, { label: string; color: string }> = {
  bar: { label: 'Bar Chart', color: '#6366f1' },
  line: { label: 'Line Graph', color: '#3b82f6' },
  pie: { label: 'Pie Chart', color: '#ec4899' },
  table: { label: 'Table', color: '#10b981' },
  process: { label: 'Process Diagram', color: '#f59e0b' },
  map: { label: 'Map', color: '#ef4444' },
};

const CHART_TYPE_OPTIONS = [
  { id: 'random', label: 'Ngẫu nhiên', icon: '🎲' },
  { id: 'bar', label: 'Bar Chart', icon: '📊' },
  { id: 'line', label: 'Line Graph', icon: '📈' },
  { id: 'pie', label: 'Pie Chart', icon: '🥧' },
  { id: 'table', label: 'Table', icon: '📋' },
  { id: 'process', label: 'Process', icon: '🔄' },
  { id: 'map', label: 'Map', icon: '🗺️' },
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
    case 'bar':
      return <BarChart2 size={size} />;
    case 'line':
      return <TrendingUp size={size} />;
    case 'pie':
      return <PieChart size={size} />;
    case 'table':
      return <Table2 size={size} />;
    case 'process':
      return <Workflow size={size} />;
    case 'map':
      return <Map size={size} />;
    default:
      return <BarChart2 size={size} />;
  }
}

function loadCompletedSessions(): Task1CompletedSession[] {
  try {
    const raw = JSON.parse(localStorage.getItem(LS_KEY_V3) || '[]');
    return Array.isArray(raw) ? raw : [];
  } catch {
    return [];
  }
}

function saveCompletedSessions(list: Task1CompletedSession[]) {
  try {
    localStorage.setItem(LS_KEY_V3, JSON.stringify(list.slice(0, 50)));
  } catch {
    // Ignore storage quota errors
  }
}

function loadLegacySessions(): LegacyTask1Session[] {
  try {
    const raw = JSON.parse(localStorage.getItem(LS_KEY_LEGACY) || '[]');
    return Array.isArray(raw) ? raw : [];
  } catch {
    return [];
  }
}

export default function Task1PracticePage() {
  const { createWritingSample } = useStore();
  const [mounted, setMounted] = useState(false);
  const [tab, setTab] = useState<'practice' | 'history'>('practice');

  // Chart & outline generation
  const [chartData, setChartData] = useState<ChartData | null>(null);
  const [outline, setOutline] = useState<OutlineBodyItem[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isRegenOutline, setIsRegenOutline] = useState(false);
  const [genError, setGenError] = useState('');
  const [selectedType, setSelectedType] = useState<string>('random');
  const [customTopic, setCustomTopic] = useState<string>('');
  const [showCustomizer, setShowCustomizer] = useState<boolean>(true);

  // Per-body practice state (4 bodies)
  const [currentBodyIndex, setCurrentBodyIndex] = useState(0);
  const [completedBodies, setCompletedBodies] = useState<CompletedBody[]>([]);
  const [inputText, setInputText] = useState('');
  const [isGrading, setIsGrading] = useState(false);
  const [gradeError, setGradeError] = useState('');
  const [gradeResult, setGradeResult] = useState<BodyGradeResult | null>(null);
  const [attemptCount, setAttemptCount] = useState(0);
  const [lastGradedText, setLastGradedText] = useState('');

  // History (only completed 4-body essays saved in localStorage)
  const [sessions, setSessions] = useState<Task1CompletedSession[]>([]);
  const [legacySessions, setLegacySessions] = useState<LegacyTask1Session[]>([]);
  const [selectedSession, setSelectedSession] = useState<Task1CompletedSession | null>(null);
  const [selectedLegacy, setSelectedLegacy] = useState<LegacyTask1Session | null>(null);
  const [savedToWritingIds, setSavedToWritingIds] = useState<Record<string, boolean>>({});

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const feedbackRef = useRef<HTMLDivElement>(null);
  const sessionSavedRef = useRef(false);

  useEffect(() => {
    setMounted(true);
    const loaded = loadCompletedSessions();
    setSessions(loaded);
    setLegacySessions(loadLegacySessions());
    if (loaded.length > 0) setSelectedSession(loaded[0]);
  }, []);

  const resetPracticeState = () => {
    setCurrentBodyIndex(0);
    setCompletedBodies([]);
    setInputText('');
    setIsGrading(false);
    setGradeError('');
    setGradeResult(null);
    setAttemptCount(0);
    setLastGradedText('');
    sessionSavedRef.current = false;
  };

  const generateChart = useCallback(
    async (overrideType?: string, overrideTopic?: string, skipConfirm = false) => {
      const hasUnsavedWork =
        chartData &&
        !sessionSavedRef.current &&
        (completedBodies.length > 0 || inputText.trim().length > 0);

      if (hasUnsavedWork && !skipConfirm) {
        const ok = await appConfirm(
          'Bài viết Task 1 hiện tại chưa hoàn tất cả 4 body nên sẽ chưa được lưu vào lịch sử. Bạn có chắc muốn tạo đề mới?'
        );
        if (!ok) return;
      }

      setIsGenerating(true);
      setGenError('');
      setChartData(null);
      setOutline([]);
      resetPracticeState();

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
        if (!res.ok) throw new Error(data.error || 'Lỗi server khi tạo đề.');

        setChartData(data);
        setOutline(normalizeOutline(data.outline, 'task1'));
        setShowCustomizer(false);
      } catch (e: any) {
        setGenError(e.message || 'Không thể tạo đề bài. Vui lòng thử lại.');
      } finally {
        setIsGenerating(false);
      }
    },
    [selectedType, customTopic, chartData, completedBodies.length, inputText]
  );

  const regenerateOutlineOnly = async () => {
    if (!chartData || completedBodies.length > 0 || gradeResult?.passed) return;
    setIsRegenOutline(true);
    setGenError('');
    try {
      const res = await fetch('/api/ai/task1-generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'outline-only',
          chartData,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Không thể tạo lại dàn ý.');
      setOutline(normalizeOutline(data.outline, 'task1'));
      setGradeResult(null);
      setGradeError('');
      setAttemptCount(0);
      setLastGradedText('');
    } catch (e: any) {
      setGenError(e.message || 'Không thể tạo lại dàn ý.');
    } finally {
      setIsRegenOutline(false);
    }
  };

  const gradeCurrentBody = async () => {
    if (!chartData || outline.length === 0) return;
    const trimmed = inputText.trim();
    if (!trimmed) return;

    if (countWords(trimmed) < 8) {
      setGradeError('Vui lòng viết ít nhất 8 từ tiếng Anh cho Body này trước khi gửi AI chấm điểm.');
      return;
    }

    if (gradeResult && !gradeResult.passed && trimmed === lastGradedText) {
      setGradeError('Bạn chưa chỉnh sửa nội dung so với lần chấm trước. Hãy sửa theo góp ý của AI rồi thử lại.');
      return;
    }

    setIsGrading(true);
    setGradeError('');
    setGradeResult(null);
    const nextAttempt = attemptCount + 1;
    setAttemptCount(nextAttempt);

    try {
      const previousBodiesPayload = completedBodies
        .filter((b) => b.bodyIndex < currentBodyIndex)
        .map((b) => ({
          bodyIndex: b.bodyIndex,
          label: b.label,
          role: b.role,
          content: b.content,
        }));

      const res = await fetch('/api/ai/task1-grade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chartData,
          outline,
          previousBodies: previousBodiesPayload,
          bodyIndex: currentBodyIndex,
          content: trimmed,
        }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || 'Không thể chấm Body này. Vui lòng thử lại.');
      }

      const result = data as BodyGradeResult;
      setGradeResult(result);
      setLastGradedText(trimmed);

      // Nếu là Body cuối (Body 4) và đã đạt chuẩn Band 7.5 -> hoàn tất và lưu vào localStorage NGAY LÚC NÀY
      const isLastBody = currentBodyIndex + 1 >= TOTAL_BODIES;
      if (result.passed && isLastBody && !sessionSavedRef.current) {
        sessionSavedRef.current = true;
        const currentOutline = outline[currentBodyIndex];
        const finalBody: CompletedBody = {
          bodyIndex: currentBodyIndex,
          label: currentOutline.label,
          role: currentOutline.role,
          outline: currentOutline,
          content: trimmed,
          wordCount: countWords(trimmed),
          attempts: nextAttempt,
          grade: result,
          completedAt: Date.now(),
        };
        const allBodies = [...completedBodies.filter((b) => b.bodyIndex < currentBodyIndex), finalBody];
        const avgBand =
          Math.round(
            (allBodies.reduce((sum, b) => sum + b.grade.overallBand, 0) / allBodies.length) * 2
          ) / 2;

        const completedSession: Task1CompletedSession = {
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          chartData,
          outline,
          bodies: allBodies,
          fullEssay: allBodies.map((b) => b.content).join('\n\n'),
          overallBand: avgBand,
          savedAt: Date.now(),
        };

        setCompletedBodies(allBodies);
        const updatedSessions = [completedSession, ...sessions];
        setSessions(updatedSessions);
        saveCompletedSessions(updatedSessions);
        setSelectedSession(completedSession);
        setSelectedLegacy(null);
      }

      setTimeout(() => {
        feedbackRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }, 100);
    } catch (e: any) {
      setGradeError(e.message || 'Lỗi kết nối khi chấm bài. Vui lòng thử lại.');
    } finally {
      setIsGrading(false);
    }
  };

  const handleNextBody = () => {
    if (!gradeResult?.passed || currentBodyIndex + 1 >= TOTAL_BODIES) return;
    const currentOutline = outline[currentBodyIndex];
    const completedItem: CompletedBody = {
      bodyIndex: currentBodyIndex,
      label: currentOutline.label,
      role: currentOutline.role,
      outline: currentOutline,
      content: inputText.trim(),
      wordCount: countWords(inputText),
      attempts: attemptCount,
      grade: gradeResult,
      completedAt: Date.now(),
    };

    setCompletedBodies((prev) => [...prev.filter((b) => b.bodyIndex !== currentBodyIndex), completedItem]);
    setCurrentBodyIndex((idx) => idx + 1);
    setInputText('');
    setGradeResult(null);
    setGradeError('');
    setAttemptCount(0);
    setLastGradedText('');
    setTimeout(() => textareaRef.current?.focus(), 100);
  };

  const handleDeleteSession = async (id: string) => {
    if (!(await appConfirm('Xóa bài Task 1 đã lưu này khỏi bộ nhớ trình duyệt?'))) return;
    const updated = sessions.filter((s) => s.id !== id);
    setSessions(updated);
    saveCompletedSessions(updated);
    if (selectedSession?.id === id) {
      setSelectedSession(updated[0] || null);
    }
  };

  const handleDeleteLegacy = async (id: string) => {
    if (!(await appConfirm('Xóa bài luyện cũ này?'))) return;
    const updated = legacySessions.filter((s) => s.id !== id);
    setLegacySessions(updated);
    try {
      localStorage.setItem(LS_KEY_LEGACY, JSON.stringify(updated));
    } catch {
      // Ignore
    }
    if (selectedLegacy?.id === id) setSelectedLegacy(null);
  };

  const handleSaveSessionToWriting = (sess: Task1CompletedSession) => {
    createWritingSample({
      task: 'task1',
      title: `[Luyện Task 1 · Band ${sess.overallBand.toFixed(1)}] ${sess.chartData.title || sess.chartData.type}`,
      topic: sess.chartData.context,
      content: sess.fullEssay,
      band: sess.overallBand,
      tags: ['from_practice', 'task1_4bodies'],
    });
    setSavedToWritingIds((prev) => ({ ...prev, [sess.id]: true }));
  };

  if (!mounted) return <LoadingScreen />;

  const currentMeta = chartData ? TYPE_META[chartData.type] : null;
  const currentColor = currentMeta?.color ?? '#6366f1';
  const currentOutline = outline[currentBodyIndex];
  const currentWordCount = countWords(inputText);
  const isCurrentBodyLocked = isGrading || !!gradeResult?.passed;
  const previousBodiesForContext = completedBodies.filter((b) => b.bodyIndex < currentBodyIndex);

  return (
    <div className="flex flex-col gap-5 max-w-5xl mx-auto w-full animate-fade-in pb-16">
      {/* ── Hero ── */}
      <div className="relative flex flex-col items-center text-center gap-3 bg-gradient-to-br from-indigo-50 via-purple-50 to-blue-50 px-6 sm:px-8 pt-7 pb-6 rounded-3xl shadow-lg overflow-hidden border border-indigo-100/60">
        <div
          className="absolute inset-0 rounded-3xl pointer-events-none"
          style={{
            boxShadow: '0 0 0 1.5px rgba(99,102,241,0.22), 0 0 50px 6px rgba(99,102,241,0.09)',
          }}
        />
        <div className="w-12 h-12 bg-white rounded-2xl shadow-md flex items-center justify-center text-indigo-600 z-10 ring-1 ring-indigo-100">
          <BarChart2 size={24} />
        </div>
        <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight z-10">
          Luyện IELTS Writing Task 1
        </h1>
        <p className="text-gray-600 max-w-2xl z-10 text-[13px] leading-relaxed">
          AI tạo đề & gợi ý <b>dàn bài 4 Body bằng tiếng Việt</b>. Bạn tự viết và dịch sang tiếng Anh từng Body — AI chấm chuẩn <b>IELTS Band 7.5</b> (4 tiêu chí TA, CC, LR, GRA) có liên kết giữa các Body. Hoàn thành đủ <b>4/4 Body</b> mới lưu vào bộ nhớ trình duyệt.
        </p>

        <div className="flex gap-2 bg-white/75 backdrop-blur-sm p-1 rounded-xl shadow-sm ring-1 ring-gray-200/60 z-10">
          <button
            type="button"
            onClick={() => setTab('practice')}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg font-bold text-sm transition-all ${
              tab === 'practice'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-gray-500 hover:bg-gray-100'
            }`}
          >
            <BarChart2 size={14} /> Luyện tập
          </button>
          <button
            type="button"
            onClick={() => setTab('history')}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg font-bold text-sm transition-all ${
              tab === 'history'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-gray-500 hover:bg-gray-100'
            }`}
          >
            <History size={14} /> Bài đã hoàn tất
            {sessions.length > 0 && (
              <span className="ml-1 bg-indigo-100 text-indigo-700 text-xs font-black px-1.5 rounded-full">
                {sessions.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* ── PRACTICE TAB ── */}
      {tab === 'practice' && (
        <>
          {/* Customizer & Generator Panel */}
          {!chartData || showCustomizer ? (
            <div className="bg-[var(--card)] rounded-3xl p-5 md:p-6 shadow-sm border border-indigo-100/80 flex flex-col gap-4 transition-all">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <span className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 text-white flex items-center justify-center shadow-sm">
                    <SlidersHorizontal size={16} />
                  </span>
                  <div>
                    <h2 className="text-base font-extrabold text-gray-800">
                      Chọn hoặc gõ dạng bài Task 1 để AI tạo đề
                    </h2>
                    <p className="text-xs text-gray-400">
                      AI sẽ sinh biểu đồ kèm dàn bài 4 Body bằng tiếng Việt phù hợp với số liệu
                    </p>
                  </div>
                </div>
                {chartData && (
                  <button
                    type="button"
                    onClick={() => setShowCustomizer(false)}
                    className="text-xs font-bold text-gray-400 hover:text-gray-600 px-2.5 py-1 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    Thu gọn
                  </button>
                )}
              </div>

              <div className="flex flex-wrap gap-2">
                {CHART_TYPE_OPTIONS.map((opt) => {
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

              <div className="flex flex-col sm:flex-row gap-2">
                <div className="relative flex-1">
                  <input
                    type="text"
                    value={customTopic}
                    onChange={(e) => setCustomTopic(e.target.value)}
                    onKeyDown={(e) => {
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

                <button
                  type="button"
                  onClick={() => generateChart()}
                  disabled={isGenerating}
                  className="flex items-center justify-center gap-2 px-6 py-2.5 bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-700 hover:opacity-95 text-white font-bold rounded-xl shadow-md transition-all hover:scale-[1.02] disabled:opacity-60 disabled:hover:scale-100 text-xs sm:text-sm flex-shrink-0"
                >
                  {isGenerating ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                  {isGenerating ? 'AI đang tạo đề & dàn ý...' : chartData ? 'Tạo đề mới' : 'Tạo đề & Dàn ý AI'}
                </button>
              </div>

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
            <div className="bg-[var(--card)] rounded-2xl px-5 py-3 shadow-sm border border-[var(--border)] flex items-center justify-between flex-wrap gap-2">
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
                  <span
                    className="text-xs text-gray-500 bg-gray-50 border border-gray-100 px-2.5 py-0.5 rounded-md truncate max-w-[200px] sm:max-w-xs"
                    title={customTopic}
                  >
                    {customTopic}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                {completedBodies.length === 0 && !gradeResult?.passed && (
                  <button
                    type="button"
                    onClick={regenerateOutlineOnly}
                    disabled={isRegenOutline}
                    className="flex items-center gap-1.5 text-xs font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 px-3 py-1.5 rounded-xl transition-colors disabled:opacity-50"
                  >
                    {isRegenOutline ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
                    Đổi dàn ý tiếng Việt
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setShowCustomizer(true)}
                  className="flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-3.5 py-1.5 rounded-xl transition-colors"
                >
                  <SlidersHorizontal size={13} />
                  Đổi dạng bài
                  <ChevronDown size={13} />
                </button>
                <button
                  type="button"
                  onClick={() => generateChart()}
                  disabled={isGenerating}
                  className="flex items-center gap-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 px-3.5 py-1.5 rounded-xl shadow-sm transition-all disabled:opacity-60"
                >
                  {isGenerating ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
                  Đề mới
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

          {/* Main Practice Workspace */}
          {chartData && outline.length === TOTAL_BODIES && (
            <div className="flex flex-col gap-5 max-w-4xl mx-auto w-full">
              {/* Chart Card */}
              <div className="bg-[var(--card)] rounded-2xl shadow-sm border border-[var(--border)] overflow-hidden">
                <div
                  className="flex items-center gap-2 px-4 py-2.5 border-b border-gray-100"
                  style={{ background: currentColor + '12' }}
                >
                  <span style={{ color: currentColor }}>
                    <TypeIcon type={chartData.type} size={14} />
                  </span>
                  <span className="font-bold text-sm" style={{ color: currentColor }}>
                    {currentMeta?.label} — {chartData.title}
                  </span>
                  <span
                    className="ml-auto text-xs font-bold px-2.5 py-0.5 rounded-full text-white"
                    style={{ background: currentColor }}
                  >
                    IELTS Task 1
                  </span>
                </div>

                <div className="px-5 pt-4 pb-4">
                  <div className="bg-blue-50/70 border border-blue-100 rounded-xl p-4 mb-4">
                    <p className="text-sm text-gray-800 leading-relaxed">
                      <span className="font-bold text-blue-800">Đề bài: </span>
                      {chartData.context}
                    </p>
                  </div>

                  <div className="w-full flex justify-center">
                    <div className="w-full max-w-xl">
                      <Task1ChartRenderer data={chartData} />
                    </div>
                  </div>

                  <p className="mt-4 text-xs text-gray-500 italic bg-gray-50 p-3 rounded-xl border border-gray-100 leading-relaxed text-center">
                    {chartData.prompt}
                  </p>
                </div>
              </div>

              {/* Stepper */}
              <BodyProgressStepper
                outline={outline}
                completedBodies={completedBodies}
                currentBodyIndex={currentBodyIndex}
                accent="indigo"
              />

              {/* Previous passed bodies */}
              <PreviousBodiesPanel completedBodies={previousBodiesForContext} />

              {/* Current Body Vietnamese Outline */}
              {currentOutline && (
                <BodyOutlineCard
                  currentOutline={currentOutline}
                  fullOutline={outline}
                  currentBodyIndex={currentBodyIndex}
                  totalBodies={TOTAL_BODIES}
                  accent="indigo"
                />
              )}

              {/* Writing Editor */}
              <div className="bg-[var(--card)] rounded-2xl shadow-sm border border-[var(--border)] p-4 sm:p-5 flex flex-col gap-3">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    <span className="w-7 h-7 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs font-black">
                      {currentBodyIndex + 1}
                    </span>
                    <div>
                      <p className="text-xs font-extrabold uppercase tracking-wider text-gray-400">
                        Viết tiếng Anh cho Body {currentBodyIndex + 1}/{TOTAL_BODIES}
                      </p>
                      <p className="text-xs font-bold text-indigo-700">{currentOutline?.role}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-500 font-semibold">
                    <span>{currentWordCount} từ</span>
                    {attemptCount > 0 && (
                      <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-700">
                        Lần chấm: {attemptCount}
                      </span>
                    )}
                  </div>
                </div>

                <textarea
                  ref={textareaRef}
                  rows={6}
                  disabled={isCurrentBodyLocked}
                  placeholder={`Dựa vào dàn ý tiếng Việt phía trên, hãy tự viết và dịch ${currentOutline?.label || 'Body này'} sang tiếng Anh chuẩn học thuật IELTS Band 7.5+...`}
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={(e) => {
                    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter' && !isCurrentBodyLocked && inputText.trim()) {
                      gradeCurrentBody();
                    }
                  }}
                  className="w-full resize-y text-sm p-3.5 rounded-xl border border-gray-200 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/15 outline-none transition-all bg-gray-50/50 focus:bg-white placeholder:text-gray-400 text-gray-800 leading-relaxed disabled:opacity-75 disabled:bg-gray-100/70"
                />

                {!gradeResult?.passed && (
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <p className="text-xs text-gray-400">
                      Nhấn <kbd className="px-1.5 py-0.5 bg-gray-100 border border-gray-200 rounded text-[11px]">Ctrl</kbd> +{' '}
                      <kbd className="px-1.5 py-0.5 bg-gray-100 border border-gray-200 rounded text-[11px]">Enter</kbd> để gửi chấm nhanh
                    </p>
                    <button
                      type="button"
                      onClick={gradeCurrentBody}
                      disabled={!inputText.trim() || isGrading}
                      className="ml-auto px-5 py-2.5 flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-bold rounded-xl shadow-md transition-all disabled:opacity-50 text-sm"
                    >
                      {isGrading ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
                      {gradeResult && !gradeResult.passed
                        ? `Gửi AI chấm lại Body ${currentBodyIndex + 1}`
                        : `Chấm Body ${currentBodyIndex + 1} (Chuẩn Band 7.5)`}
                    </button>
                  </div>
                )}
              </div>

              {/* Feedback Panel */}
              <div ref={feedbackRef}>
                <BodyFeedbackPanel
                  taskType="task1"
                  bodyIndex={currentBodyIndex}
                  totalBodies={TOTAL_BODIES}
                  isGrading={isGrading}
                  gradeError={gradeError}
                  gradeResult={gradeResult}
                  onFocusEditor={() => {
                    textareaRef.current?.focus();
                    textareaRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                  }}
                  onNextBody={handleNextBody}
                  onViewHistory={() => setTab('history')}
                />
              </div>
            </div>
          )}

          {/* Idle instructions */}
          {!chartData && !isGenerating && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                {
                  icon: '🗺️',
                  title: 'AI tạo đề + Dàn ý tiếng Việt',
                  desc: 'Chọn dạng biểu đồ (Bar, Line, Pie, Table, Process, Map) để AI sinh đề chuẩn kèm dàn ý 4 Body bằng tiếng Việt.',
                },
                {
                  icon: '🎯',
                  title: 'Chấm từng Body chuẩn Band 7.5',
                  desc: 'Tự viết & dịch sang tiếng Anh từng Body. AI chấm đủ 4 tiêu chí (TA, CC, LR, GRA), chỉ rõ tiêu chí mất điểm và sự liên kết giữa các Body.',
                },
                {
                  icon: '💾',
                  title: 'Hoàn tất 4/4 Body mới lưu',
                  desc: 'Vượt qua đủ 4 Body ở mốc Band 7.5+ thì bài viết hoàn chỉnh mới được tự động lưu vào bộ nhớ trình duyệt.',
                },
              ].map((c, i) => (
                <div key={i} className="bg-[var(--card)] rounded-2xl p-5 shadow-sm border border-[var(--border)]">
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
        <div className="flex flex-col gap-6">
          <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-5">
            {/* Sidebar list */}
            <div className="bg-[var(--card)] rounded-2xl shadow-sm border border-[var(--border)] overflow-hidden flex flex-col">
              <div className="px-4 py-3 border-b border-gray-100 bg-gray-50/80 flex items-center justify-between">
                <p className="font-bold text-sm text-gray-700">Bài hoàn chỉnh ({sessions.length})</p>
              </div>
              {sessions.length === 0 ? (
                <div className="p-8 text-center">
                  <History size={28} className="text-gray-300 mx-auto mb-2" />
                  <p className="text-sm text-gray-400">
                    Chưa có bài Task 1 nào hoàn thành đủ 4 Body.
                  </p>
                </div>
              ) : (
                <div className="overflow-y-auto max-h-[560px] divide-y divide-gray-100">
                  {sessions.map((sess) => {
                    const meta = TYPE_META[sess.chartData.type];
                    const isSelected = selectedSession?.id === sess.id && !selectedLegacy;
                    return (
                      <div
                        key={sess.id}
                        onClick={() => {
                          setSelectedSession(sess);
                          setSelectedLegacy(null);
                        }}
                        className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors ${
                          isSelected ? 'bg-indigo-50' : 'hover:bg-gray-50'
                        }`}
                      >
                        <div
                          className="w-8 h-8 rounded-lg flex items-center justify-center text-white flex-shrink-0"
                          style={{ background: meta?.color ?? '#6366f1' }}
                        >
                          <TypeIcon type={sess.chartData.type} size={14} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-gray-800 truncate">
                            {sess.chartData.title || meta?.label}
                          </p>
                          <p className="text-[10px] text-gray-400">
                            4 Body · {new Date(sess.savedAt).toLocaleDateString('vi-VN')}
                          </p>
                        </div>
                        <div className="text-xs font-black px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                          {sess.overallBand.toFixed(1)}
                        </div>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteSession(sess.id);
                          }}
                          className="p-1 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors"
                          title="Xóa bài"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Legacy sessions list if user had old v2 records */}
              {legacySessions.length > 0 && (
                <div className="border-t border-gray-200">
                  <div className="px-4 py-2 bg-gray-50 text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                    Lịch sử bản cũ ({legacySessions.length})
                  </div>
                  <div className="max-h-48 overflow-y-auto divide-y divide-gray-100">
                    {legacySessions.map((ls) => (
                      <div
                        key={ls.id}
                        onClick={() => {
                          setSelectedLegacy(ls);
                          setSelectedSession(null);
                        }}
                        className={`flex items-center gap-2 px-4 py-2.5 cursor-pointer text-xs ${
                          selectedLegacy?.id === ls.id ? 'bg-amber-50' : 'hover:bg-gray-50'
                        }`}
                      >
                        <span className="truncate flex-1 font-medium text-gray-700">
                          {ls.chartData.title || ls.chartData.type}
                        </span>
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-gray-100 text-gray-600">
                          {ls.avgScore}/100
                        </span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteLegacy(ls.id);
                          }}
                          className="p-1 text-gray-300 hover:text-red-500"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Detail view */}
            <div className="bg-[var(--card)] rounded-2xl shadow-sm border border-[var(--border)] overflow-hidden">
              {selectedLegacy ? (
                <div className="p-5 flex flex-col gap-4">
                  <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                    <div>
                      <span className="text-[11px] font-bold uppercase text-amber-600">
                        Phiên luyện tập cũ (10 câu)
                      </span>
                      <h2 className="font-bold text-gray-900">{selectedLegacy.chartData.title}</h2>
                    </div>
                    <span className="text-sm font-black px-2.5 py-1 rounded-full bg-amber-100 text-amber-800">
                      TB {selectedLegacy.avgScore}/100
                    </span>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                    <Task1ChartRenderer data={selectedLegacy.chartData} />
                  </div>
                  <div className="space-y-2">
                    {selectedLegacy.sentences.map((s, idx) => (
                      <div key={idx} className="p-3 rounded-xl border border-gray-200 bg-white text-sm">
                        <span className="text-xs font-bold text-indigo-600 mr-2">
                          Câu {idx + 1} ({s.score}/100):
                        </span>
                        <span className="text-gray-800">{s.corrected}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : !selectedSession ? (
                <div className="h-full min-h-[300px] flex flex-col items-center justify-center text-center p-8">
                  <History size={32} className="text-gray-200 mb-3" />
                  <p className="text-gray-400 font-medium">
                    Chọn một bài Task 1 đã hoàn thành để xem lại
                  </p>
                </div>
              ) : (
                <div className="flex flex-col">
                  <div
                    className="px-5 py-4 border-b border-gray-100"
                    style={{
                      background:
                        (TYPE_META[selectedSession.chartData.type]?.color ?? '#6366f1') + '0F',
                    }}
                  >
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span style={{ color: TYPE_META[selectedSession.chartData.type]?.color }}>
                        <TypeIcon type={selectedSession.chartData.type} size={15} />
                      </span>
                      <h2 className="font-bold text-gray-800">{selectedSession.chartData.title}</h2>
                      <span className="ml-auto text-sm font-black px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                        Band {selectedSession.overallBand.toFixed(1)}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500">
                      Hoàn tất lúc {new Date(selectedSession.savedAt).toLocaleString('vi-VN')}
                    </p>
                  </div>

                  <div className="p-5 flex flex-col gap-5 max-h-[700px] overflow-y-auto">
                    <div className="bg-blue-50/60 border border-blue-100 rounded-xl p-3.5 text-sm text-gray-800">
                      <span className="font-bold text-blue-800">Đề bài: </span>
                      {selectedSession.chartData.context}
                    </div>

                    <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                      <Task1ChartRenderer data={selectedSession.chartData} />
                    </div>

                    <CompletedEssayDetails
                      taskType="task1"
                      fullEssay={selectedSession.fullEssay}
                      bodies={selectedSession.bodies}
                      overallBand={selectedSession.overallBand}
                      onSaveToWritingSamples={() => handleSaveSessionToWriting(selectedSession)}
                      savedToWriting={!!savedToWritingIds[selectedSession.id]}
                    />

                    <button
                      type="button"
                      onClick={() => {
                        setTab('practice');
                        generateChart(selectedSession.chartData.type, '', true);
                      }}
                      className="w-full py-3 flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-bold rounded-xl transition-all text-sm"
                    >
                      <RefreshCw size={14} /> Luyện đề mới
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
