'use client';

import { useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  BarChart2,
  BookOpen,
  CheckCircle2,
  Clock,
  FileText,
  History,
  Loader2,
  Maximize2,
  PenTool,
  PlusCircle,
  Send,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react';
import { LoadingScreen } from '@/components/LoadingScreen';
import { appConfirm } from '@/lib/dialog';
import { countWords } from '@/lib/writing-practice-types';
import {
  CAMBRIDGE_TARGET_BAND,
  createDefaultParagraphs,
  type CambridgeGradeResult,
  type DetailedEssayTemplate,
  type GuidedTaskType,
  type GuidedWritingSession,
  type OutlineEvaluationResult,
  type UserOutlineParagraph,
} from '@/lib/writing-guided-types';
import {
  buildDetailedTemplateResilient,
  evaluateUserOutlineResilient,
  gradeCambridgeEssayResilient,
} from '@/lib/writing-ai-client';
import type { ProcessedTaskImage } from '@/lib/image-utils';
import { Task1ImageUploader } from '@/components/writing-practice/Task1ImageUploader';
import { VietnameseOutlineEditor } from '@/components/writing-practice/VietnameseOutlineEditor';
import { DetailedTemplateView } from '@/components/writing-practice/DetailedTemplateView';
import { CambridgeGradeReport } from '@/components/writing-practice/CambridgeGradeReport';

type WorkspaceTab = 'practice' | 'history';
type PracticeStep = 1 | 2 | 3;

interface GuidedWritingWorkspaceProps {
  taskType: GuidedTaskType;
}

const SAMPLE_TASK2_PROMPTS = [
  {
    label: '🎓 Giáo dục đại học miễn phí',
    prompt:
      'Some people believe that university education should be free for everyone, regardless of their financial background. To what extent do you agree or disagree?',
  },
  {
    label: '🤖 AI & Thị trường việc làm',
    prompt:
      'Artificial intelligence and automation are replacing many traditional jobs. Discuss the advantages and disadvantages of this trend.',
  },
  {
    label: '🏙️ Ô nhiễm & Ùn tắc đô thị',
    prompt:
      'In many major cities, air pollution and traffic congestion are worsening rapidly. What are the main causes of these problems, and what measures can governments and individuals take to solve them?',
  },
  {
    label: '📱 Mạng xã hội & Giao tiếp',
    prompt:
      'Some people think social media has brought people closer together, while others argue it has made real-life communication weaker. Discuss both views and give your own opinion.',
  },
];

function getHistoryKey(taskType: GuidedTaskType) {
  return `guided_writing_history_${taskType}_v1`;
}

function getDraftKey(taskType: GuidedTaskType) {
  return `guided_writing_draft_${taskType}_v1`;
}

function loadHistory(taskType: GuidedTaskType): GuidedWritingSession[] {
  try {
    const raw = JSON.parse(localStorage.getItem(getHistoryKey(taskType)) || '[]');
    return Array.isArray(raw) ? raw : [];
  } catch {
    return [];
  }
}

function saveHistory(taskType: GuidedTaskType, list: GuidedWritingSession[]) {
  try {
    localStorage.setItem(getHistoryKey(taskType), JSON.stringify(list.slice(0, 40)));
  } catch {
    // Nếu bộ nhớ đầy, lưu lại không kèm thumbnail ảnh
    try {
      const stripped = list.slice(0, 25).map((item) => ({ ...item, imageThumbUrl: undefined }));
      localStorage.setItem(getHistoryKey(taskType), JSON.stringify(stripped));
    } catch {
      // ignore
    }
  }
}

export function GuidedWritingWorkspace({ taskType }: GuidedWritingWorkspaceProps) {
  const isTask1 = taskType === 'task1';
  const taskShort = isTask1 ? 'TA' : 'TR';
  const minWordGoal = isTask1 ? 150 : 250;

  const [mounted, setMounted] = useState(false);
  const [tab, setTab] = useState<WorkspaceTab>('practice');
  const [step, setStep] = useState<PracticeStep>(1);

  // Active session state
  const [sessionId, setSessionId] = useState<string>(() => `gw-${Date.now()}`);
  const [promptText, setPromptText] = useState('');
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);
  const [imageThumbUrl, setImageThumbUrl] = useState<string | undefined>(undefined);
  const [imageMeta, setImageMeta] = useState<{ width: number; height: number; sizeKB: number } | null>(null);
  const [userParagraphs, setUserParagraphs] = useState<UserOutlineParagraph[]>(() =>
    createDefaultParagraphs(taskType)
  );

  // Step 1 -> 2 AI states
  const [evaluation, setEvaluation] = useState<OutlineEvaluationResult | null>(null);
  const [template, setTemplate] = useState<DetailedEssayTemplate | null>(null);
  const [isAnalyzingOutline, setIsAnalyzingOutline] = useState(false);
  const [analysisStatus, setAnalysisStatus] = useState('');
  const [analysisError, setAnalysisError] = useState('');

  // Step 3 Writing & Step 4 Cambridge Grading states
  const [refTab, setRefTab] = useState<'template' | 'prompt'>('template');
  const [essayText, setEssayText] = useState('');
  const [isGrading, setIsGrading] = useState(false);
  const [gradingStatus, setGradingStatus] = useState('');
  const [gradeError, setGradeError] = useState('');
  const [gradeResult, setGradeResult] = useState<CambridgeGradeResult | null>(null);
  const [attemptCount, setAttemptCount] = useState(0);
  const [showImageZoom, setShowImageZoom] = useState(false);

  // Timer (optional helper while writing)
  const [timerRunning, setTimerRunning] = useState(false);
  const [elapsedSec, setElapsedSec] = useState(0);

  // Saved history
  const [history, setHistory] = useState<GuidedWritingSession[]>([]);

  const essayInputRef = useRef<HTMLTextAreaElement>(null);
  const gradeSectionRef = useRef<HTMLDivElement>(null);
  const activeAbortRef = useRef<AbortController | null>(null);

  // Hydrate history & autosaved draft
  useEffect(() => {
    setMounted(true);
    setHistory(loadHistory(taskType));
    try {
      const rawDraft = localStorage.getItem(getDraftKey(taskType));
      if (rawDraft) {
        const d = JSON.parse(rawDraft);
        if (d.sessionId) setSessionId(d.sessionId);
        if (typeof d.promptText === 'string') setPromptText(d.promptText);
        if (typeof d.imageDataUrl === 'string') setImageDataUrl(d.imageDataUrl);
        if (typeof d.imageThumbUrl === 'string') setImageThumbUrl(d.imageThumbUrl);
        if (Array.isArray(d.userParagraphs) && d.userParagraphs.length >= 2) {
          setUserParagraphs(d.userParagraphs);
        }
        if (d.evaluation) setEvaluation(d.evaluation);
        if (d.template) setTemplate(d.template);
        if (typeof d.essayText === 'string') setEssayText(d.essayText);
        if (d.gradeResult) setGradeResult(d.gradeResult);
        if (typeof d.attemptCount === 'number') setAttemptCount(d.attemptCount);
        if (d.step === 2 && d.template) setStep(2);
        else if (d.step === 3 && d.template) setStep(3);
      }
    } catch {
      // ignore corrupted draft
    }

    return () => {
      activeAbortRef.current?.abort();
    };
  }, [taskType]);

  // Auto-save draft
  useEffect(() => {
    if (!mounted) return;
    try {
      const payload = {
        sessionId,
        step,
        promptText,
        imageDataUrl: imageDataUrl && imageDataUrl.length < 450_000 ? imageDataUrl : imageThumbUrl || null,
        imageThumbUrl,
        userParagraphs,
        evaluation,
        template,
        essayText,
        gradeResult,
        attemptCount,
      };
      localStorage.setItem(getDraftKey(taskType), JSON.stringify(payload));
    } catch {
      // ignore quota
    }
  }, [
    mounted,
    taskType,
    sessionId,
    step,
    promptText,
    imageDataUrl,
    imageThumbUrl,
    userParagraphs,
    evaluation,
    template,
    essayText,
    gradeResult,
    attemptCount,
  ]);

  // Optional stopwatch
  useEffect(() => {
    if (!timerRunning) return;
    const id = setInterval(() => setElapsedSec((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [timerRunning]);

  if (!mounted) return <LoadingScreen />;

  const wordCount = countWords(essayText);
  const paragraphCount = essayText
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean).length;

  const filledOutlineCount = userParagraphs.filter((p) => p.ideasVi.trim().length > 0).length;

  const formatTimer = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const handleImageChange = (processed: ProcessedTaskImage | null) => {
    if (!processed) {
      setImageDataUrl(null);
      setImageThumbUrl(undefined);
      setImageMeta(null);
      return;
    }
    setImageDataUrl(processed.dataUrl);
    setImageThumbUrl(processed.thumbDataUrl);
    setImageMeta({
      width: processed.width,
      height: processed.height,
      sizeKB: processed.sizeKB,
    });
  };

  const handleResetNewTopic = async () => {
    const hasWork =
      promptText.trim() ||
      imageDataUrl ||
      essayText.trim() ||
      userParagraphs.some((p) => p.ideasVi.trim());

    if (hasWork) {
      const ok = await appConfirm(
        'Bạn có chắc muốn tạo đề mới? Nội dung nháp hiện tại sẽ được làm mới (các bài đã chấm vẫn nằm trong tab Bài đã lưu).'
      );
      if (!ok) return;
    }

    activeAbortRef.current?.abort();
    setSessionId(`gw-${Date.now()}`);
    setPromptText('');
    setImageDataUrl(null);
    setImageThumbUrl(undefined);
    setImageMeta(null);
    setUserParagraphs(createDefaultParagraphs(taskType));
    setEvaluation(null);
    setTemplate(null);
    setAnalysisError('');
    setAnalysisStatus('');
    setEssayText('');
    setGradeResult(null);
    setGradeError('');
    setGradingStatus('');
    setAttemptCount(0);
    setTimerRunning(false);
    setElapsedSec(0);
    setStep(1);
    setTab('practice');
    try {
      localStorage.removeItem(getDraftKey(taskType));
    } catch {
      // ignore
    }
  };

  // Step 1 -> Evaluate TA/TR (>= 7.0) -> If pass, immediately build ultra-detailed template!
  const handleSubmitOutline = async () => {
    setAnalysisError('');
    const nonEmptyParagraphs = userParagraphs.filter((p) => p.ideasVi.trim().length > 0);

    if (isTask1 && !imageDataUrl && !promptText.trim()) {
      setAnalysisError('Vui lòng dán (Ctrl+V) hoặc tải ảnh biểu đồ Task 1 (hoặc nhập đề bài) trước khi gửi.');
      return;
    }
    if (!isTask1 && promptText.trim().length < 15) {
      setAnalysisError('Vui lòng nhập đầy đủ đề bài IELTS Writing Task 2 (tối thiểu 15 ký tự).');
      return;
    }
    if (nonEmptyParagraphs.length < 2) {
      setAnalysisError('Vui lòng viết dàn ý tiếng Việt cho ít nhất 2 đoạn trước khi gửi Gia sư AI kiểm tra.');
      return;
    }

    activeAbortRef.current?.abort();
    const controller = new AbortController();
    activeAbortRef.current = controller;

    setIsAnalyzingOutline(true);
    setAnalysisStatus('Đang gửi dàn ý tiếng Việt cho Gia sư AI kiểm định TA/TR...');

    try {
      const evalRes = await evaluateUserOutlineResilient(
        {
          taskType,
          promptText: promptText.trim(),
          imageDataUrl: imageDataUrl || undefined,
          userParagraphs: nonEmptyParagraphs,
        },
        {
          signal: controller.signal,
          onStatus: (msg) => setAnalysisStatus(msg),
        }
      );

      setEvaluation(evalRes);

      if (!evalRes.passedTask7) {
        // TA/TR < 7.0 -> giữ nguyên ở Bước 1 để user xem feedback và bổ sung dàn ý tiếng Việt
        setTemplate(null);
        setAnalysisStatus('');
        return;
      }

      // Đạt TA/TR >= 7.0 -> Tự động dựng Template siêu chi tiết cho nguyên bài!
      const builtTemplate = await buildDetailedTemplateResilient(
        {
          taskType,
          promptText: promptText.trim(),
          userParagraphs: nonEmptyParagraphs,
          evaluation: evalRes,
        },
        {
          signal: controller.signal,
          onStatus: (msg) => setAnalysisStatus(msg),
        }
      );

      setTemplate(builtTemplate);
      setStep(2);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err: any) {
      if (err?.name === 'AbortError') return;
      setAnalysisError(err?.message || 'Có lỗi xảy ra khi kiểm tra dàn ý & dựng template.');
    } finally {
      setIsAnalyzingOutline(false);
      setAnalysisStatus('');
    }
  };

  const handleConfirmTemplate = () => {
    setStep(3);
    setRefTab('template');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Step 3 -> Step 4: Cambridge Grading
  const handleGradeEssay = async () => {
    setGradeError('');
    if (wordCount < 35) {
      setGradeError(
        `Bài viết của bạn mới có ${wordCount} từ. Hãy viết hoàn chỉnh bài (khuyến nghị >= ${minWordGoal} từ) rồi gửi Gia sư AI chấm chuẩn Cambridge.`
      );
      return;
    }

    activeAbortRef.current?.abort();
    const controller = new AbortController();
    activeAbortRef.current = controller;

    setIsGrading(true);
    setTimerRunning(false);
    setGradingStatus('Đang khởi động phiên chấm điểm chuẩn Cambridge IELTS...');

    try {
      const graded = await gradeCambridgeEssayResilient(
        {
          taskType,
          promptText: promptText.trim(),
          imageDataUrl: imageDataUrl || undefined,
          chartOrPromptSummaryEn: evaluation?.chartOrPromptSummaryEn,
          userParagraphs: userParagraphs.filter((p) => p.ideasVi.trim().length > 0),
          template,
          essay: essayText.trim(),
          previousGrade: gradeResult,
        },
        {
          signal: controller.signal,
          onStatus: (msg) => setGradingStatus(msg),
        }
      );

      const nextAttempts = attemptCount + 1;
      setGradeResult(graded);
      setAttemptCount(nextAttempts);

      // Lưu vào lịch sử
      if (evaluation && template) {
        const nowIso = new Date().toISOString();
        const existingIdx = history.findIndex((h) => h.id === sessionId);
        const record: GuidedWritingSession = {
          id: sessionId,
          taskType,
          promptText: promptText.trim() || evaluation.chartOrPromptSummaryEn || 'Bài luyện Task 1 (từ ảnh)',
          imageThumbUrl,
          detectedType: evaluation.detectedType,
          userParagraphs: userParagraphs.filter((p) => p.ideasVi.trim().length > 0),
          evaluation,
          template,
          essayText: essayText.trim(),
          wordCount,
          latestGrade: graded,
          attemptCount: nextAttempts,
          createdAt: existingIdx >= 0 ? history[existingIdx].createdAt : nowIso,
          updatedAt: nowIso,
        };

        const updatedHistory = [
          record,
          ...history.filter((h) => h.id !== sessionId),
        ];
        setHistory(updatedHistory);
        saveHistory(taskType, updatedHistory);
      }

      setTimeout(() => {
        gradeSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 120);
    } catch (err: any) {
      if (err?.name === 'AbortError') return;
      setGradeError(err?.message || 'Không thể chấm bài lúc này. Vui lòng thử lại.');
    } finally {
      setIsGrading(false);
      setGradingStatus('');
    }
  };

  const handleLoadFromHistory = (item: GuidedWritingSession) => {
    setSessionId(item.id);
    setPromptText(item.promptText);
    setImageDataUrl(item.imageThumbUrl || null);
    setImageThumbUrl(item.imageThumbUrl);
    setImageMeta(null);
    setUserParagraphs(item.userParagraphs);
    setEvaluation(item.evaluation);
    setTemplate(item.template);
    setEssayText(item.essayText);
    setGradeResult(item.latestGrade);
    setAttemptCount(item.attemptCount || 1);
    setGradeError('');
    setAnalysisError('');
    setStep(3);
    setTab('practice');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDeleteHistory = async (id: string) => {
    const ok = await appConfirm('Xóa bài viết này khỏi lịch sử đã lưu?');
    if (!ok) return;
    const next = history.filter((h) => h.id !== id);
    setHistory(next);
    saveHistory(taskType, next);
  };

  const stepItems: Array<{ num: PracticeStep; label: string; enabled: boolean }> = [
    { num: 1, label: '1. Đề bài & Dàn ý Việt', enabled: true },
    { num: 2, label: '2. Template siêu chi tiết', enabled: Boolean(template) },
    { num: 3, label: '3. Tự viết & Chấm Cambridge', enabled: Boolean(template) },
  ];

  return (
    <div className="flex flex-col gap-5 max-w-6xl mx-auto pb-12 animate-fade-in">
      {/* ─── TOP HEADER ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-start gap-3">
          <div
            className={`w-11 h-11 rounded-2xl flex items-center justify-center text-white shadow-sm flex-shrink-0 ${
              isTask1
                ? 'bg-gradient-to-br from-orange-500 to-amber-500'
                : 'bg-gradient-to-br from-emerald-600 to-teal-600'
            }`}
          >
            {isTask1 ? <BarChart2 size={22} /> : <PenTool size={22} />}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-black text-[var(--text)] tracking-tight">
                {isTask1 ? 'IELTS Writing Task 1' : 'IELTS Writing Task 2'}
              </h1>
              <span
                className={`text-[11px] font-black px-2.5 py-0.5 rounded-full border ${
                  isTask1
                    ? 'bg-orange-50 text-orange-700 border-orange-200'
                    : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                }`}
              >
                Aim Overall ≥ {CAMBRIDGE_TARGET_BAND.toFixed(1)} · Chuẩn Cambridge
              </span>
            </div>
            <p className="text-xs sm:text-sm text-[var(--text-muted)] mt-0.5">
              Tự chia đoạn &amp; viết dàn ý Việt → Gia sư duyệt {taskShort} ≥ 7.0 &amp; dựng Template GRA/CC &gt; 7 (Conjunction Band 8) → Tự ráp từ vựng &amp; chấm Cambridge
            </p>
          </div>
        </div>

        {/* Mode Tabs & Reset */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="inline-flex rounded-xl p-1 bg-[var(--card)] border border-[var(--border)] shadow-xs">
            <button
              type="button"
              onClick={() => setTab('practice')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-extrabold transition-all flex items-center gap-1.5 ${
                tab === 'practice'
                  ? isTask1
                    ? 'bg-orange-500 text-white shadow-sm'
                    : 'bg-emerald-600 text-white shadow-sm'
                  : 'text-[var(--text-muted)] hover:text-[var(--text)]'
              }`}
            >
              <PenTool size={13} /> Luyện viết
            </button>
            <button
              type="button"
              onClick={() => setTab('history')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-extrabold transition-all flex items-center gap-1.5 ${
                tab === 'history'
                  ? isTask1
                    ? 'bg-orange-500 text-white shadow-sm'
                    : 'bg-emerald-600 text-white shadow-sm'
                  : 'text-[var(--text-muted)] hover:text-[var(--text)]'
              }`}
            >
              <History size={13} /> Bài đã lưu ({history.length})
            </button>
          </div>

          <button
            type="button"
            onClick={handleResetNewTopic}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-[var(--card)] border border-[var(--border)] text-[var(--text)] hover:bg-[var(--bg-subtle)] transition-colors"
          >
            <PlusCircle size={14} /> Đề mới
          </button>
        </div>
      </div>

      {/* ─── HISTORY TAB ─── */}
      {tab === 'history' ? (
        <div className="flex flex-col gap-3">
          {history.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[var(--border)] bg-[var(--card)] p-10 text-center flex flex-col items-center gap-2">
              <BookOpen size={28} className="text-gray-400" />
              <p className="text-sm font-bold text-gray-800">Chưa có bài viết nào được chấm &amp; lưu</p>
              <p className="text-xs text-gray-500 max-w-md">
                Hãy nhập đề bài, tự viết dàn ý tiếng Việt, xác nhận Template rồi nộp bài viết hoàn chỉnh để Gia sư AI chấm chuẩn Cambridge và lưu lại tại đây.
              </p>
              <button
                type="button"
                onClick={() => setTab('practice')}
                className={`mt-2 px-4 py-2 rounded-xl text-xs font-black text-white ${
                  isTask1 ? 'bg-orange-500' : 'bg-emerald-600'
                }`}
              >
                Bắt đầu luyện ngay
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {history.map((item) => {
                const g = item.latestGrade;
                return (
                  <div
                    key={item.id}
                    className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 shadow-xs flex flex-col gap-3 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 min-w-0">
                        {item.imageThumbUrl && (
                          /* eslint-disable-next-line @next/next/no-img-element */
                          <img
                            src={item.imageThumbUrl}
                            alt="Thumbnail đề Task 1"
                            className="w-16 h-16 rounded-xl object-cover border border-gray-200 flex-shrink-0 bg-white"
                          />
                        )}
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap mb-1">
                            {item.detectedType && (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-700">
                                {item.detectedType}
                              </span>
                            )}
                            <span className="text-[10px] text-gray-500 font-semibold">
                              {item.wordCount} từ · {item.attemptCount} lần chấm
                            </span>
                          </div>
                          <p className="text-xs sm:text-sm font-extrabold text-gray-900 line-clamp-2 leading-snug">
                            {item.promptText}
                          </p>
                        </div>
                      </div>

                      <div
                        className={`w-12 h-12 rounded-xl flex flex-col items-center justify-center text-white flex-shrink-0 ${
                          g.passedTarget65 ? 'bg-emerald-600' : 'bg-amber-500'
                        }`}
                      >
                        <span className="text-base font-black leading-none">
                          {g.overallBand.toFixed(1)}
                        </span>
                        <span className="text-[8.5px] font-bold opacity-90 mt-0.5">BAND</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-4 gap-1.5 text-center">
                      {[
                        { k: taskShort, v: g.criteria.task.band },
                        { k: 'CC', v: g.criteria.cc.band },
                        { k: 'LR', v: g.criteria.lr.band },
                        { k: 'GRA', v: g.criteria.gra.band },
                      ].map((s) => (
                        <div
                          key={s.k}
                          className="rounded-lg bg-gray-50 border border-gray-200/80 py-1 text-[11px]"
                        >
                          <span className="text-gray-500 font-bold">{s.k}: </span>
                          <span className="font-black text-gray-900">{s.v.toFixed(1)}</span>
                        </div>
                      ))}
                    </div>

                    <div className="flex items-center justify-between gap-2 pt-1 border-t border-[var(--border)]">
                      <span className="text-[11px] text-gray-400">
                        {new Date(item.updatedAt).toLocaleString('vi-VN')}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleLoadFromHistory(item)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-extrabold text-white ${
                            isTask1 ? 'bg-orange-500 hover:bg-orange-600' : 'bg-emerald-600 hover:bg-emerald-700'
                          }`}
                        >
                          Mở lại &amp; Sửa tiếp
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteHistory(item.id)}
                          className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 transition-colors"
                          title="Xóa bài"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        /* ─── PRACTICE FLOW (3 CLEAR STAGES) ─── */
        <div className="flex flex-col gap-5">
          {/* Interactive Stepper */}
          <div className="grid grid-cols-3 gap-2">
            {stepItems.map((st) => {
              const isActive = step === st.num;
              const isDone =
                (st.num === 1 && Boolean(evaluation?.passedTask7)) ||
                (st.num === 2 && step === 3 && Boolean(template)) ||
                (st.num === 3 && Boolean(gradeResult));

              return (
                <button
                  key={st.num}
                  type="button"
                  disabled={!st.enabled}
                  onClick={() => st.enabled && setStep(st.num)}
                  className={`rounded-xl px-3 py-2.5 text-left border transition-all flex items-center justify-between gap-2 ${
                    isActive
                      ? isTask1
                        ? 'bg-orange-500 text-white border-orange-500 shadow-sm'
                        : 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                      : st.enabled
                        ? 'bg-[var(--card)] text-[var(--text)] border-[var(--border)] hover:border-gray-300'
                        : 'bg-[var(--card)]/60 text-gray-400 border-[var(--border)] cursor-not-allowed opacity-70'
                  }`}
                >
                  <span className="text-xs font-extrabold truncate">{st.label}</span>
                  {isDone && (
                    <CheckCircle2
                      size={15}
                      className={`flex-shrink-0 ${isActive ? 'text-white' : 'text-emerald-600'}`}
                    />
                  )}
                </button>
              );
            })}
          </div>

          {/* ═══ STEP 1: NHẬP ĐỀ BÀI & TỰ VIẾT DÀN Ý TIẾNG VIỆT ═══ */}
          {step === 1 && (
            <div className="flex flex-col gap-5">
              {/* Prompt Card */}
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 sm:p-5 shadow-xs flex flex-col gap-4">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <h2 className="text-sm font-black text-gray-900 flex items-center gap-2">
                    <FileText size={16} className={isTask1 ? 'text-orange-600' : 'text-emerald-600'} />
                    {isTask1 ? 'Bước 1A: Dán / Tải đề IELTS Writing Task 1' : 'Bước 1A: Nhập đề bài IELTS Writing Task 2'}
                  </h2>
                  {!isTask1 && (
                    <span className="text-[11px] text-gray-500 font-semibold">
                      Dán đề của bạn hoặc chọn nhanh đề mẫu bên dưới
                    </span>
                  )}
                </div>

                {isTask1 && (
                  <Task1ImageUploader
                    imageDataUrl={imageDataUrl}
                    imageMeta={imageMeta}
                    onImageChange={handleImageChange}
                    disabled={isAnalyzingOutline}
                    enableGlobalPaste={step === 1 && tab === 'practice'}
                  />
                )}

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-gray-700">
                    {isTask1
                      ? 'Đề bài bằng chữ (tùy chọn — nếu ảnh đã có sẵn câu đề phía trên thì bạn có thể để trống hoặc gõ ngắn lại)'
                      : 'Nội dung đề bài IELTS Writing Task 2'}
                  </label>
                  <textarea
                    value={promptText}
                    onChange={(e) => setPromptText(e.target.value)}
                    disabled={isAnalyzingOutline}
                    rows={isTask1 ? 2 : 3}
                    placeholder={
                      isTask1
                        ? 'VD: The chart below shows the percentage of households in owned and rented accommodation in England and Wales between 1918 and 2011...'
                        : 'Dán nguyên văn đề bài Task 2 vào đây (VD: Some people believe that... To what extent do you agree or disagree?)'
                    }
                    className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg)]/60 px-3.5 py-2.5 text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/35 resize-y"
                  />
                </div>

                {!isTask1 && (
                  <div className="flex flex-wrap gap-1.5">
                    {SAMPLE_TASK2_PROMPTS.map((sp) => (
                      <button
                        key={sp.label}
                        type="button"
                        disabled={isAnalyzingOutline}
                        onClick={() => setPromptText(sp.prompt)}
                        className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100 transition-colors"
                      >
                        {sp.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Vietnamese Outline Builder Card */}
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 sm:p-5 shadow-xs flex flex-col gap-4">
                <VietnameseOutlineEditor
                  taskType={taskType}
                  paragraphs={userParagraphs}
                  onChange={setUserParagraphs}
                  evaluation={evaluation}
                  disabled={isAnalyzingOutline}
                />

                {analysisError && (
                  <div className="rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs text-rose-800 flex items-start gap-2">
                    <AlertCircle size={15} className="flex-shrink-0 mt-0.5" />
                    <span>{analysisError}</span>
                  </div>
                )}

                {isAnalyzingOutline && (
                  <div className="rounded-xl border border-indigo-200 bg-indigo-50/75 px-4 py-3 flex items-center gap-3">
                    <Loader2 size={18} className="animate-spin text-indigo-600 flex-shrink-0" />
                    <div className="text-xs text-indigo-950">
                      <p className="font-extrabold">{analysisStatus || 'Gia sư AI đang xử lý...'}</p>
                      <p className="text-indigo-700 mt-0.5">
                        Hệ thống dùng model nhẹ Free Tier &amp; chia nhỏ từng chặng để Template cực kỳ chi tiết và không nghẽn giới hạn
                      </p>
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between gap-3 pt-2 border-t border-[var(--border)] flex-wrap">
                  <span className="text-xs text-gray-500">
                    Đã nhập ý cho <strong className="text-gray-900">{filledOutlineCount}/{userParagraphs.length}</strong> đoạn
                    {' · '}Cần đạt <strong className="text-gray-900">{taskShort} ≥ 7.0</strong> để dựng Template
                  </span>

                  <div className="flex items-center gap-2">
                    {template && evaluation?.passedTask7 && !isAnalyzingOutline && (
                      <button
                        type="button"
                        onClick={() => setStep(2)}
                        className="px-4 py-2.5 rounded-xl text-xs font-extrabold border border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 transition-colors"
                      >
                        Xem Template đã dựng →
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={handleSubmitOutline}
                      disabled={isAnalyzingOutline}
                      className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-black text-white shadow-sm transition-all disabled:opacity-60 ${
                        isTask1
                          ? 'bg-gradient-to-r from-orange-500 to-amber-500 hover:opacity-95'
                          : 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:opacity-95'
                      }`}
                    >
                      {isAnalyzingOutline ? (
                        <Loader2 size={16} className="animate-spin" />
                      ) : (
                        <Sparkles size={16} />
                      )}
                      {evaluation && !evaluation.passedTask7
                        ? 'Gửi lại dàn ý đã bổ sung để AI kiểm tra'
                        : 'Gửi Gia sư AI kiểm tra & dựng Template chi tiết'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ═══ STEP 2: XEM & XÁC NHẬN TEMPLATE SIÊU CHI TIẾT ═══ */}
          {step === 2 && evaluation && template && (
            <div className="flex flex-col gap-4">
              {/* Compact Prompt Preview */}
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-3.5 flex items-center gap-3.5">
                {imageDataUrl && (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={imageDataUrl}
                    alt="Đề Task 1"
                    onClick={() => setShowImageZoom(true)}
                    className="w-20 h-16 rounded-xl object-cover border border-orange-200 cursor-zoom-in flex-shrink-0 bg-white"
                  />
                )}
                <div className="min-w-0 flex-1">
                  <span className="text-[10px] font-black uppercase tracking-wider text-gray-500">
                    Đề bài đang làm ({evaluation.detectedType})
                  </span>
                  <p className="text-xs sm:text-sm font-bold text-gray-900 line-clamp-2 mt-0.5">
                    {promptText || evaluation.chartOrPromptSummaryEn}
                  </p>
                </div>
                {imageDataUrl && (
                  <button
                    type="button"
                    onClick={() => setShowImageZoom(true)}
                    className="inline-flex items-center gap-1 text-xs font-bold text-orange-700 hover:underline flex-shrink-0"
                  >
                    <Maximize2 size={13} /> Xem ảnh
                  </button>
                )}
              </div>

              <DetailedTemplateView
                taskType={taskType}
                evaluation={evaluation}
                template={template}
                onConfirmTemplate={handleConfirmTemplate}
                onEditOutline={() => setStep(1)}
              />
            </div>
          )}

          {/* ═══ STEP 3: TỰ TÌM TỪ VỰNG, VIẾT NGUYÊN BÀI & CHẤM CHUẨN CAMBRIDGE ═══ */}
          {step === 3 && evaluation && template && (
            <div className="flex flex-col gap-5">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
                {/* LEFT COLUMN: Sticky Reference (Template + Prompt/Image/Vietnamese Outline) */}
                <div className="lg:col-span-5 flex flex-col gap-3 lg:sticky lg:top-4 lg:max-h-[calc(100vh-2rem)] lg:overflow-y-auto lg:pr-1">
                  <div className="inline-flex rounded-xl p-1 bg-[var(--card)] border border-[var(--border)] shadow-xs">
                    <button
                      type="button"
                      onClick={() => setRefTab('template')}
                      className={`flex-1 py-1.5 px-2.5 rounded-lg text-xs font-extrabold transition-all ${
                        refTab === 'template'
                          ? isTask1
                            ? 'bg-orange-500 text-white'
                            : 'bg-emerald-600 text-white'
                          : 'text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      Template đã xác nhận
                    </button>
                    <button
                      type="button"
                      onClick={() => setRefTab('prompt')}
                      className={`flex-1 py-1.5 px-2.5 rounded-lg text-xs font-extrabold transition-all ${
                        refTab === 'prompt'
                          ? isTask1
                            ? 'bg-orange-500 text-white'
                            : 'bg-emerald-600 text-white'
                          : 'text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      Đề bài &amp; Dàn ý Việt
                    </button>
                  </div>

                  {refTab === 'template' ? (
                    <DetailedTemplateView
                      taskType={taskType}
                      evaluation={evaluation}
                      template={template}
                      compactReferenceMode
                    />
                  ) : (
                    <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 flex flex-col gap-3 shadow-xs">
                      {imageDataUrl && (
                        <div className="flex flex-col gap-1.5">
                          <div className="rounded-xl border border-orange-200 bg-gray-50 p-2 flex justify-center">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={imageDataUrl}
                              alt="Ảnh biểu đồ Task 1"
                              onClick={() => setShowImageZoom(true)}
                              className="max-h-64 w-auto object-contain rounded-lg cursor-zoom-in"
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() => setShowImageZoom(true)}
                            className="text-xs font-bold text-orange-700 hover:underline self-end inline-flex items-center gap-1"
                          >
                            <Maximize2 size={12} /> Phóng to biểu đồ
                          </button>
                        </div>
                      )}

                      {promptText && (
                        <div className="text-xs leading-relaxed">
                          <p className="text-[10px] font-black uppercase tracking-wider text-gray-500 mb-1">
                            Đề bài
                          </p>
                          <p className="text-gray-900 font-semibold">{promptText}</p>
                        </div>
                      )}

                      <div className="flex flex-col gap-2 pt-2 border-t border-[var(--border)]">
                        <p className="text-[10px] font-black uppercase tracking-wider text-gray-500">
                          Dàn ý tiếng Việt của bạn
                        </p>
                        {userParagraphs
                          .filter((p) => p.ideasVi.trim())
                          .map((p, idx) => (
                            <div
                              key={p.id}
                              className="rounded-xl bg-gray-50 border border-gray-200/80 p-2.5 text-xs"
                            >
                              <p className="font-extrabold text-gray-900 mb-0.5">
                                {idx + 1}. {p.heading}
                              </p>
                              <p className="text-gray-700 whitespace-pre-line leading-relaxed">
                                {p.ideasVi}
                              </p>
                            </div>
                          ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* RIGHT COLUMN: Essay Writing Editor + Cambridge Grade Report */}
                <div className="lg:col-span-7 flex flex-col gap-4">
                  <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 sm:p-5 shadow-sm flex flex-col gap-3">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div>
                        <h2 className="text-sm sm:text-base font-black text-gray-900">
                          Tự tìm từ vựng &amp; Viết hoàn chỉnh bài của bạn
                        </h2>
                        <p className="text-xs text-gray-500 mt-0.5">
                          Ráp ý tưởng &amp; từ vựng bạn tự tra vào khung Template bên trái (tách đoạn bằng dòng trống).
                        </p>
                      </div>

                      {/* Optional Timer */}
                      <button
                        type="button"
                        onClick={() => setTimerRunning((r) => !r)}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-colors ${
                          timerRunning
                            ? 'bg-amber-50 border-amber-300 text-amber-800'
                            : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100'
                        }`}
                      >
                        <Clock size={13} />
                        {formatTimer(elapsedSec)} · {timerRunning ? 'Tạm dừng' : 'Bấm giờ'}
                      </button>
                    </div>

                    {/* Stats bar */}
                    <div className="flex items-center justify-between gap-2 text-xs flex-wrap bg-gray-50 border border-gray-200/80 rounded-xl px-3 py-2">
                      <div className="flex items-center gap-3 flex-wrap">
                        <span
                          className={`font-black ${
                            wordCount >= minWordGoal ? 'text-emerald-700' : 'text-amber-700'
                          }`}
                        >
                          {wordCount} / {minWordGoal}+ từ
                        </span>
                        <span className="text-gray-500 font-semibold">
                          {paragraphCount} đoạn văn
                        </span>
                      </div>
                      <span className="text-[11px] text-gray-500">
                        Tự lưu nháp · Aim Overall ≥ {CAMBRIDGE_TARGET_BAND.toFixed(1)}
                      </span>
                    </div>

                    <textarea
                      ref={essayInputRef}
                      value={essayText}
                      onChange={(e) => setEssayText(e.target.value)}
                      disabled={isGrading}
                      rows={16}
                      placeholder={`Viết nguyên bài tiếng Anh của bạn tại đây (tách các đoạn bằng 1 dòng trống)...\n\nKhuyến nghị độ dài tối thiểu ${minWordGoal} từ để không bị trừ điểm ${taskShort} theo chuẩn Cambridge.`}
                      className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg)]/50 px-4 py-3 text-sm sm:text-[15px] text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/35 resize-y leading-relaxed font-sans"
                    />

                    <div className="flex items-center justify-between gap-3 flex-wrap pt-1">
                      <button
                        type="button"
                        onClick={() => setStep(2)}
                        disabled={isGrading}
                        className="text-xs font-bold text-gray-600 hover:text-gray-900 underline"
                      >
                        ← Xem lại toàn bộ Template chi tiết
                      </button>

                      <button
                        type="button"
                        onClick={handleGradeEssay}
                        disabled={isGrading || wordCount < 10}
                        className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-black text-white shadow-md transition-all disabled:opacity-50 ${
                          isTask1
                            ? 'bg-gradient-to-r from-orange-500 to-amber-500 hover:opacity-95'
                            : 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:opacity-95'
                        }`}
                      >
                        {isGrading ? (
                          <Loader2 size={16} className="animate-spin" />
                        ) : (
                          <Send size={15} />
                        )}
                        {attemptCount > 0
                          ? `Gửi chấm lại bản đã sửa (Lần ${attemptCount + 1})`
                          : 'Gửi Gia sư AI chấm điểm chuẩn Cambridge'}
                      </button>
                    </div>
                  </div>

                  {/* Cambridge Grade Result */}
                  <div ref={gradeSectionRef}>
                    <CambridgeGradeReport
                      taskType={taskType}
                      isGrading={isGrading}
                      gradingStatus={gradingStatus}
                      gradeError={gradeError}
                      result={gradeResult}
                      onEditAndResubmit={() => {
                        essayInputRef.current?.focus();
                        essayInputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Zoom Modal for Task 1 Image in Steps 2 & 3 */}
      {showImageZoom && imageDataUrl && (
        <div
          onClick={() => setShowImageZoom(false)}
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in"
        >
          <button
            type="button"
            onClick={() => setShowImageZoom(false)}
            className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/15 hover:bg-white/30 text-white flex items-center justify-center"
            aria-label="Đóng"
          >
            <X size={20} />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imageDataUrl}
            alt="Phóng to đề Task 1"
            onClick={(e) => e.stopPropagation()}
            className="max-w-[95vw] max-h-[90vh] object-contain rounded-xl bg-white p-2 shadow-2xl"
          />
        </div>
      )}
    </div>
  );
}
