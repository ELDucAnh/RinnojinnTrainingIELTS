'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Loader2,
  Sparkles,
  RefreshCw,
  FileText,
  AlertCircle,
  History,
  Trash2,
  Send,
  PenTool,
  SlidersHorizontal,
  ChevronDown,
  BookOpenCheck,
} from 'lucide-react';
import { LoadingScreen } from '@/components/LoadingScreen';
import { useStore } from '@/lib/store';
import { appConfirm } from '@/lib/dialog';
import { postWritingAi } from '@/lib/writing-ai-client';
import {
  countWords,
  normalizeOutline,
  type BodyGradeResult,
  type CompletedBody,
  type OutlineBodyItem,
  type Task2CompletedSession,
} from '@/lib/writing-practice-types';
import { BodyProgressStepper } from '@/components/writing-practice/BodyProgressStepper';
import { PreviousBodiesPanel } from '@/components/writing-practice/PreviousBodiesPanel';
import { BodyOutlineCard } from '@/components/writing-practice/BodyOutlineCard';
import { BodyFeedbackPanel } from '@/components/writing-practice/BodyFeedbackPanel';
import { CompletedEssayDetails } from '@/components/writing-practice/CompletedEssayDetails';

const TOTAL_BODIES = 5;
const LS_KEY = 'task2_sessions_v1';

const SAMPLE_TASK2_PROMPTS = [
  {
    label: '🎓 Giáo dục miễn phí',
    prompt:
      'Some people believe that university education should be free for everyone, regardless of their financial background. To what extent do you agree or disagree?',
  },
  {
    label: '🤖 Công nghệ & Việc làm',
    prompt:
      'Artificial intelligence and automation are replacing many traditional jobs. Discuss the advantages and disadvantages of this trend.',
  },
  {
    label: '🏙️ Đô thị hóa & Môi trường',
    prompt:
      'In many major cities, air pollution and traffic congestion are worsening rapidly. What are the main causes of these problems, and what measures can governments and individuals take to solve them?',
  },
  {
    label: '📱 Mạng xã hội & Giao tiếp',
    prompt:
      'Some people think social media has brought people closer together, while others argue it has made real-life communication weaker. Discuss both views and give your own opinion.',
  },
];

function loadCompletedSessions(): Task2CompletedSession[] {
  try {
    const raw = JSON.parse(localStorage.getItem(LS_KEY) || '[]');
    return Array.isArray(raw) ? raw : [];
  } catch {
    return [];
  }
}

function saveCompletedSessions(list: Task2CompletedSession[]) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(list.slice(0, 50)));
  } catch {
    // Ignore storage quota errors
  }
}

export default function Task2PracticePage() {
  const { createWritingSample } = useStore();
  const [mounted, setMounted] = useState(false);
  const [tab, setTab] = useState<'practice' | 'history'>('practice');

  // Prompt & outline setup
  const [promptInput, setPromptInput] = useState('');
  const [stanceHint, setStanceHint] = useState('');
  const [activePrompt, setActivePrompt] = useState('');
  const [essayType, setEssayType] = useState('');
  const [promptAnalysis, setPromptAnalysis] = useState('');
  const [outline, setOutline] = useState<OutlineBodyItem[]>([]);
  const [isGeneratingOutline, setIsGeneratingOutline] = useState(false);
  const [genError, setGenError] = useState('');
  const [showPromptPanel, setShowPromptPanel] = useState(true);

  // Per-body practice state (5 bodies)
  const [currentBodyIndex, setCurrentBodyIndex] = useState(0);
  const [completedBodies, setCompletedBodies] = useState<CompletedBody[]>([]);
  const [inputText, setInputText] = useState('');
  const [isGrading, setIsGrading] = useState(false);
  const [gradeError, setGradeError] = useState('');
  const [gradeResult, setGradeResult] = useState<BodyGradeResult | null>(null);
  const [attemptCount, setAttemptCount] = useState(0);
  const [lastGradedText, setLastGradedText] = useState('');

  // History (only completed 5-body essays stored in localStorage)
  const [sessions, setSessions] = useState<Task2CompletedSession[]>([]);
  const [selectedSession, setSelectedSession] = useState<Task2CompletedSession | null>(null);
  const [savedToWritingIds, setSavedToWritingIds] = useState<Record<string, boolean>>({});

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const feedbackRef = useRef<HTMLDivElement>(null);
  const sessionSavedRef = useRef(false);
  const genAbortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    setMounted(true);
    const loaded = loadCompletedSessions();
    setSessions(loaded);
    if (loaded.length > 0) setSelectedSession(loaded[0]);
    return () => {
      genAbortRef.current?.abort();
    };
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

  const generateOutline = useCallback(
    async (skipConfirm = false, regenerateExisting = false) => {
      const targetPrompt = (regenerateExisting ? activePrompt : promptInput).trim();
      if (targetPrompt.length < 15) {
        setGenError('Vui lòng nhập đầy đủ đề bài Task 2 (tối thiểu 15 ký tự).');
        return;
      }

      const hasUnsavedWork =
        activePrompt &&
        !sessionSavedRef.current &&
        (completedBodies.length > 0 || inputText.trim().length > 0);

      if (hasUnsavedWork && !skipConfirm) {
        const ok = await appConfirm(
          'Bài viết Task 2 hiện tại chưa hoàn tất cả 5 body nên sẽ chưa được lưu vào lịch sử. Bạn có chắc muốn tạo đề/dàn ý mới?'
        );
        if (!ok) return;
      }

      genAbortRef.current?.abort();
      const controller = new AbortController();
      genAbortRef.current = controller;

      setIsGeneratingOutline(true);
      setGenError('');
      if (!regenerateExisting) {
        setActivePrompt('');
        setOutline([]);
        resetPracticeState();
      }

      try {
        const data = await postWritingAi<{
          essayType?: string;
          promptAnalysis?: string;
          outline: OutlineBodyItem[];
        }>(
          '/api/ai/task2-outline',
          {
            prompt: targetPrompt,
            stanceHint: stanceHint.trim(),
          },
          { signal: controller.signal }
        );
        if (controller.signal.aborted) return;

        if (regenerateExisting) {
          resetPracticeState();
        }
        setActivePrompt(targetPrompt);
        setEssayType(data.essayType || 'IELTS Writing Task 2');
        setPromptAnalysis(data.promptAnalysis || '');
        setOutline(normalizeOutline(data.outline, 'task2'));
        setShowPromptPanel(false);
      } catch (e: any) {
        if (controller.signal.aborted || e?.name === 'AbortError') return;
        setGenError(e.message || 'Không thể phân tích đề bài. Vui lòng thử lại.');
      } finally {
        if (genAbortRef.current === controller) {
          setIsGeneratingOutline(false);
        }
      }
    },
    [activePrompt, promptInput, stanceHint, completedBodies.length, inputText]
  );

  const gradeCurrentBody = async () => {
    if (!activePrompt || outline.length === 0) return;
    const trimmed = inputText.trim();
    if (!trimmed) return;

    if (countWords(trimmed) < 10) {
      setGradeError('Vui lòng viết ít nhất 10 từ tiếng Anh cho Body này trước khi gửi AI chấm điểm.');
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

      const result = await postWritingAi<BodyGradeResult>('/api/ai/task2-grade', {
        prompt: activePrompt,
        essayType,
        outline,
        previousBodies: previousBodiesPayload,
        bodyIndex: currentBodyIndex,
        content: trimmed,
      });
      setGradeResult(result);
      setLastGradedText(trimmed);

      // Chỉ khi hoàn thành đủ 5/5 Body (Body 5 đạt >= 7.5) mới lưu bài vào localStorage
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

        const completedSession: Task2CompletedSession = {
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          prompt: activePrompt,
          essayType,
          promptAnalysis,
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
    if (!(await appConfirm('Xóa bài Task 2 đã lưu này khỏi bộ nhớ trình duyệt?'))) return;
    const updated = sessions.filter((s) => s.id !== id);
    setSessions(updated);
    saveCompletedSessions(updated);
    if (selectedSession?.id === id) {
      setSelectedSession(updated[0] || null);
    }
  };

  const handleSaveSessionToWriting = (sess: Task2CompletedSession) => {
    createWritingSample({
      task: 'task2',
      title: `[Luyện Task 2 · Band ${sess.overallBand.toFixed(1)}] ${sess.prompt.slice(0, 65)}${sess.prompt.length > 65 ? '...' : ''}`,
      topic: sess.prompt,
      content: sess.fullEssay,
      band: sess.overallBand,
      tags: ['from_practice', 'task2_5bodies'],
    });
    setSavedToWritingIds((prev) => ({ ...prev, [sess.id]: true }));
  };

  if (!mounted) return <LoadingScreen />;

  const currentOutline = outline[currentBodyIndex];
  const currentWordCount = countWords(inputText);
  const isCurrentBodyLocked = isGrading || !!gradeResult?.passed;
  const previousBodiesForContext = completedBodies.filter((b) => b.bodyIndex < currentBodyIndex);

  return (
    <div className="flex flex-col gap-5 max-w-5xl mx-auto w-full animate-fade-in pb-16">
      {/* ── Hero ── */}
      <div className="relative flex flex-col items-center text-center gap-3 bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 px-6 sm:px-8 pt-7 pb-6 rounded-3xl shadow-lg overflow-hidden border border-emerald-100/70">
        <div
          className="absolute inset-0 rounded-3xl pointer-events-none"
          style={{
            boxShadow: '0 0 0 1.5px rgba(16,185,129,0.22), 0 0 50px 6px rgba(16,185,129,0.09)',
          }}
        />
        <div className="w-12 h-12 bg-white rounded-2xl shadow-md flex items-center justify-center text-emerald-600 z-10 ring-1 ring-emerald-100">
          <PenTool size={24} />
        </div>
        <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight z-10">
          Luyện IELTS Writing Task 2
        </h1>
        <p className="text-gray-600 max-w-2xl z-10 text-[13px] leading-relaxed">
          Nhập đề bài Task 2 của bạn — AI phân tích đề & gợi ý <b>dàn bài 5 Body chuẩn Band 8.0+</b> (tối ưu <b>TR & CC</b> để gánh điểm — bạn tập trung phát triển <b>LR & GRA</b>). Chấm gắt từng Body mốc <b>Band 7.5+</b> trước khi lưu vào trình duyệt.
        </p>

        <div className="flex gap-2 bg-white/75 backdrop-blur-sm p-1 rounded-xl shadow-sm ring-1 ring-gray-200/60 z-10">
          <button
            type="button"
            onClick={() => setTab('practice')}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg font-bold text-sm transition-all ${tab === 'practice'
              ? 'bg-emerald-600 text-white shadow-md'
              : 'text-gray-500 hover:bg-gray-100'
              }`}
          >
            <PenTool size={14} /> Luyện tập
          </button>
          <button
            type="button"
            onClick={() => setTab('history')}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg font-bold text-sm transition-all ${tab === 'history'
              ? 'bg-emerald-600 text-white shadow-md'
              : 'text-gray-500 hover:bg-gray-100'
              }`}
          >
            <History size={14} /> Bài đã hoàn tất
            {sessions.length > 0 && (
              <span className="ml-1 bg-emerald-100 text-emerald-700 text-xs font-black px-1.5 rounded-full">
                {sessions.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* ── PRACTICE TAB ── */}
      {tab === 'practice' && (
        <>
          {/* Custom Prompt Input Panel */}
          {!activePrompt || showPromptPanel ? (
            <div className="bg-[var(--card)] rounded-3xl p-5 md:p-6 shadow-sm border border-emerald-100/80 flex flex-col gap-4 transition-all">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <span className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center shadow-sm">
                    <FileText size={16} />
                  </span>
                  <div>
                    <h2 className="text-base font-extrabold text-gray-800">
                      Nhập đề bài IELTS Task 2 của bạn
                    </h2>
                    <p className="text-xs text-gray-400">
                      AI sẽ phân tích dạng đề và tạo dàn ý tiếng Việt chi tiết cho 5 Body (Intro, 3 Thân bài, Kết bài)
                    </p>
                  </div>
                </div>
                {activePrompt && (
                  <button
                    type="button"
                    onClick={() => setShowPromptPanel(false)}
                    className="text-xs font-bold text-gray-400 hover:text-gray-600 px-2.5 py-1 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    Thu gọn
                  </button>
                )}
              </div>

              <div className="flex flex-col gap-3">
                <div>
                  <label className="text-xs font-bold text-gray-600 block mb-1.5">
                    Đề bài Task 2 <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    rows={3}
                    value={promptInput}
                    onChange={(e) => setPromptInput(e.target.value)}
                    placeholder="Dán hoặc nhập nguyên văn đề bài IELTS Writing Task 2 tại đây (tiếng Anh hoặc tiếng Việt)..."
                    className="w-full px-4 py-3 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-gray-800 placeholder-gray-400 leading-relaxed resize-y"
                  />
                </div>

                <div className="flex flex-col sm:flex-row gap-2.5">
                  <input
                    type="text"
                    value={stanceHint}
                    onChange={(e) => setStanceHint(e.target.value)}
                    placeholder="Ghi chú hướng lập luận mong muốn (tùy chọn, VD: Đồng ý hoàn toàn / Tập trung khía cạnh giáo dục...)"
                    className="flex-1 px-4 py-2.5 text-xs sm:text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-gray-800 placeholder-gray-400"
                  />
                  <button
                    type="button"
                    onClick={() => generateOutline(false, false)}
                    disabled={isGeneratingOutline || promptInput.trim().length < 15}
                    className="flex items-center justify-center gap-2 px-6 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:opacity-95 text-white font-bold rounded-xl shadow-md transition-all hover:scale-[1.01] disabled:opacity-50 disabled:hover:scale-100 text-xs sm:text-sm flex-shrink-0"
                  >
                    {isGeneratingOutline ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <Sparkles size={16} />
                    )}
                    {isGeneratingOutline ? 'AI đang lập dàn ý 5 Body...' : 'Tạo dàn ý 5 Body AI'}
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                <span className="text-[11px] font-bold text-gray-400 flex items-center gap-1">
                  💡 Đề mẫu thử nhanh:
                </span>
                {SAMPLE_TASK2_PROMPTS.map((item, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setPromptInput(item.prompt)}
                    className="text-[11px] font-medium px-2.5 py-1 bg-emerald-50/80 hover:bg-emerald-100 text-emerald-800 rounded-lg transition-colors border border-emerald-100"
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="bg-[var(--card)] rounded-2xl px-5 py-3 shadow-sm border border-[var(--border)] flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold text-white bg-emerald-600 shadow-sm flex-shrink-0">
                  <PenTool size={12} /> {essayType}
                </span>
                <span className="text-xs text-gray-500 truncate max-w-[260px] sm:max-w-md" title={activePrompt}>
                  {activePrompt}
                </span>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                {completedBodies.length === 0 && !gradeResult?.passed && (
                  <button
                    type="button"
                    onClick={() => generateOutline(true, true)}
                    disabled={isGeneratingOutline}
                    className="flex items-center gap-1.5 text-xs font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 px-3 py-1.5 rounded-xl transition-colors disabled:opacity-50"
                  >
                    {isGeneratingOutline ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
                    Đổi dàn ý tiếng Việt
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setShowPromptPanel(true)}
                  className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-3.5 py-1.5 rounded-xl transition-colors"
                >
                  <SlidersHorizontal size={13} />
                  Nhập đề bài khác
                  <ChevronDown size={13} />
                </button>
              </div>
            </div>
          )}

          {genError && (
            <div className="flex items-center justify-between gap-3 flex-wrap p-4 bg-red-50 border border-red-200 rounded-xl text-red-700">
              <div className="flex items-center gap-3 min-w-0">
                <AlertCircle size={16} className="flex-shrink-0" />
                <p className="text-sm font-medium">{genError}</p>
              </div>
              <button
                type="button"
                onClick={() => generateOutline(true, !!activePrompt)}
                disabled={isGeneratingOutline}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-red-200 hover:bg-red-100 text-xs font-bold text-red-700 transition-colors disabled:opacity-50 flex-shrink-0"
              >
                <RefreshCw size={12} />
                Thử lại
              </button>
            </div>
          )}

          {/* Main Practice Workspace */}
          {activePrompt && outline.length === TOTAL_BODIES && (
            <div className="flex flex-col gap-5 max-w-4xl mx-auto w-full">
              {/* Pinned Prompt & Analysis */}
              <div className="bg-[var(--card)] rounded-2xl shadow-sm border border-[var(--border)] overflow-hidden">
                <div className="flex items-center gap-2 px-4 py-2.5 border-b border-emerald-100 bg-emerald-50/70">
                  <BookOpenCheck size={15} className="text-emerald-600" />
                  <span className="font-bold text-sm text-emerald-800">{essayType}</span>
                  <span className="ml-auto text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-600 text-white">
                    IELTS Task 2 · 5 Body
                  </span>
                </div>
                <div className="p-4 sm:p-5 flex flex-col gap-3">
                  <div className="bg-blue-50/70 border border-blue-100 rounded-xl p-4">
                    <p className="text-sm text-gray-800 leading-relaxed font-medium">
                      <span className="font-bold text-blue-800">Đề bài: </span>
                      {activePrompt}
                    </p>
                  </div>
                  {promptAnalysis && (
                    <div className="text-xs text-gray-600 bg-gray-50 border border-gray-100 rounded-xl p-3 leading-relaxed">
                      <span className="font-bold text-gray-800">Phân tích yêu cầu đề: </span>
                      {promptAnalysis}
                    </div>
                  )}
                </div>
              </div>

              {/* 5-Body Stepper */}
              <BodyProgressStepper
                outline={outline}
                completedBodies={completedBodies}
                currentBodyIndex={currentBodyIndex}
                accent="emerald"
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
                  accent="emerald"
                />
              )}

              {/* Writing Editor */}
              <div className="bg-[var(--card)] rounded-2xl shadow-sm border border-[var(--border)] p-4 sm:p-5 flex flex-col gap-3">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    <span className="w-7 h-7 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs font-black">
                      {currentBodyIndex + 1}
                    </span>
                    <div>
                      <p className="text-xs font-extrabold uppercase tracking-wider text-gray-400">
                        Viết tiếng Anh cho Body {currentBodyIndex + 1}/{TOTAL_BODIES}
                      </p>
                      <p className="text-xs font-bold text-emerald-700">{currentOutline?.role}</p>
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
                  rows={7}
                  disabled={isCurrentBodyLocked}
                  placeholder={`Dựa vào dàn ý tiếng Việt của ${currentOutline?.label || 'Body này'}, hãy tự viết và dịch sang tiếng Anh chuẩn học thuật Band 7.5+...`}
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={(e) => {
                    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter' && !isCurrentBodyLocked && inputText.trim()) {
                      gradeCurrentBody();
                    }
                  }}
                  className="w-full resize-y text-sm p-3.5 rounded-xl border border-gray-200 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/15 outline-none transition-all bg-gray-50/50 focus:bg-white placeholder:text-gray-400 text-gray-800 leading-relaxed disabled:opacity-75 disabled:bg-gray-100/70"
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
                      className="ml-auto px-5 py-2.5 flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold rounded-xl shadow-md transition-all disabled:opacity-50 text-sm"
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
                  taskType="task2"
                  bodyIndex={currentBodyIndex}
                  totalBodies={TOTAL_BODIES}
                  isGrading={isGrading}
                  gradeError={gradeError}
                  gradeResult={gradeResult}
                  accent="emerald"
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

          {/* Idle cards */}
          {!activePrompt && !isGeneratingOutline && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                {
                  icon: '📝',
                  title: 'Tự nhập đề Task 2 bất kỳ',
                  desc: 'Dán bất kỳ đề bài IELTS Task 2 nào của bạn — AI nhận diện dạng bài và lập dàn ý 5 Body bằng tiếng Việt (Mở bài, 3 Thân bài, Kết bài).',
                },
                {
                  icon: '⚖️',
                  title: 'Feedback ngay sau từng Body',
                  desc: 'Mỗi Body được AI chấm chuẩn Band 7.5 theo 4 tiêu chí (TR, CC, LR, GRA), nêu rõ tiêu chí mất điểm và sự liên kết mạch lạc với các Body trước.',
                },
                {
                  icon: '💾',
                  title: 'Hoàn tất 5/5 Body mới lưu',
                  desc: 'Bài viết hoàn chỉnh 5 đoạn chỉ được lưu vào bộ nhớ trình duyệt sau khi bạn vượt qua tất cả 5 Body ở mốc Band 7.5+.',
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
        <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-5">
          {/* Session List */}
          <div className="bg-[var(--card)] rounded-2xl shadow-sm border border-[var(--border)] overflow-hidden flex flex-col">
            <div className="px-4 py-3 border-b border-gray-100 bg-gray-50/80">
              <p className="font-bold text-sm text-gray-700">Bài hoàn chỉnh ({sessions.length})</p>
            </div>
            {sessions.length === 0 ? (
              <div className="p-8 text-center">
                <History size={28} className="text-gray-300 mx-auto mb-2" />
                <p className="text-sm text-gray-400">
                  Chưa có bài Task 2 nào hoàn thành đủ 5 Body.
                </p>
              </div>
            ) : (
              <div className="overflow-y-auto max-h-[560px] divide-y divide-gray-100">
                {sessions.map((sess) => {
                  const isSelected = selectedSession?.id === sess.id;
                  return (
                    <div
                      key={sess.id}
                      onClick={() => setSelectedSession(sess)}
                      className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors ${isSelected ? 'bg-emerald-50' : 'hover:bg-gray-50'
                        }`}
                    >
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white bg-emerald-600 flex-shrink-0">
                        <PenTool size={14} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-gray-800 truncate">{sess.prompt}</p>
                        <p className="text-[10px] text-gray-400">
                          {sess.essayType} · {new Date(sess.savedAt).toLocaleDateString('vi-VN')}
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
          </div>

          {/* Detail view */}
          <div className="bg-[var(--card)] rounded-2xl shadow-sm border border-[var(--border)] overflow-hidden">
            {!selectedSession ? (
              <div className="h-full min-h-[300px] flex flex-col items-center justify-center text-center p-8">
                <History size={32} className="text-gray-200 mb-3" />
                <p className="text-gray-400 font-medium">
                  Chọn một bài Task 2 đã hoàn thành để xem lại
                </p>
              </div>
            ) : (
              <div className="flex flex-col">
                <div className="px-5 py-4 border-b border-emerald-100 bg-emerald-50/50">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <PenTool size={15} className="text-emerald-600" />
                    <span className="text-xs font-extrabold uppercase tracking-wider text-emerald-700">
                      {selectedSession.essayType}
                    </span>
                    <span className="ml-auto text-sm font-black px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                      Band {selectedSession.overallBand.toFixed(1)}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500">
                    Hoàn tất lúc {new Date(selectedSession.savedAt).toLocaleString('vi-VN')}
                  </p>
                </div>

                <div className="p-5 flex flex-col gap-5 max-h-[700px] overflow-y-auto">
                  <div className="bg-blue-50/60 border border-blue-100 rounded-xl p-3.5 text-sm text-gray-800 leading-relaxed">
                    <span className="font-bold text-blue-800">Đề bài: </span>
                    {selectedSession.prompt}
                  </div>

                  <CompletedEssayDetails
                    taskType="task2"
                    fullEssay={selectedSession.fullEssay}
                    bodies={selectedSession.bodies}
                    overallBand={selectedSession.overallBand}
                    accent="emerald"
                    onSaveToWritingSamples={() => handleSaveSessionToWriting(selectedSession)}
                    savedToWriting={!!savedToWritingIds[selectedSession.id]}
                  />

                  <button
                    type="button"
                    onClick={() => {
                      if (!activePrompt || sessionSavedRef.current) {
                        setPromptInput('');
                        setStanceHint('');
                      }
                      setTab('practice');
                      setShowPromptPanel(true);
                    }}
                    className="w-full py-3 flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold rounded-xl transition-all text-sm"
                  >
                    <RefreshCw size={14} /> Luyện đề Task 2 mới
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
