'use client';

import { useEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  FileEdit,
  ListChecks,
  Loader2,
  RotateCcw,
  Send,
  CheckCircle2,
} from 'lucide-react';
import { Task1ChartRenderer } from '@/components/writing-practice/Task1ChartRenderer';
import { FullEssayFeedbackPanel } from '@/components/writing-practice/FullEssayFeedbackPanel';
import { gradeFullEssayResilient } from '@/lib/writing-ai-client';
import {
  buildPreviousAttemptSummary,
  countWords,
  type FullEssayGradeResult,
  type OutlineBodyItem,
  type PreviousAttemptSummary,
  type Task1CompletedSession,
  type Task2CompletedSession,
} from '@/lib/writing-practice-types';

type BaseProps = {
  selectedSourceId?: string | null;
  onSelectSourceId?: (id: string) => void;
  onViewHistory: () => void;
  onBackToPractice: () => void;
};

type Task1Props = BaseProps & {
  taskType: 'task1';
  completedSessions: Task1CompletedSession[];
  onSavePassedEssay: (
    sourceSession: Task1CompletedSession,
    essay: string,
    grade: FullEssayGradeResult
  ) => void;
};

type Task2Props = BaseProps & {
  taskType: 'task2';
  completedSessions: Task2CompletedSession[];
  onSavePassedEssay: (
    sourceSession: Task2CompletedSession,
    essay: string,
    grade: FullEssayGradeResult
  ) => void;
};

export type FullEssayPracticeViewProps = Task1Props | Task2Props;

function getSessionTitle(
  taskType: 'task1' | 'task2',
  sess: Task1CompletedSession | Task2CompletedSession
): string {
  if (taskType === 'task1') {
    const s = sess as Task1CompletedSession;
    return s.chartData.title || s.chartData.context.slice(0, 60) || 'Task 1 Chart';
  }
  const s = sess as Task2CompletedSession;
  return s.prompt.length > 68 ? `${s.prompt.slice(0, 68)}...` : s.prompt;
}

export function FullEssayPracticeView(props: FullEssayPracticeViewProps) {
  const {
    taskType,
    completedSessions,
    selectedSourceId,
    onSelectSourceId,
    onViewHistory,
    onBackToPractice,
  } = props;

  const isTask1 = taskType === 'task1';
  const taskShort = isTask1 ? 'TA' : 'TR';
  const minWordGoal = isTask1 ? 150 : 250;
  const expectedBodies = isTask1 ? 4 : 5;

  const eligibleSessions = completedSessions.filter(
    (s) => s.sourceType !== 'full-essay' && s.bodies.length > 0
  );

  const [internalSelectedId, setInternalSelectedId] = useState<string>('');
  const activeId =
    selectedSourceId && eligibleSessions.some((s) => s.id === selectedSourceId)
      ? selectedSourceId
      : internalSelectedId && eligibleSessions.some((s) => s.id === internalSelectedId)
        ? internalSelectedId
        : eligibleSessions[0]?.id || '';

  const activeSession = eligibleSessions.find((s) => s.id === activeId) || null;

  const [essayInput, setEssayInput] = useState('');
  const [showOutlineHint, setShowOutlineHint] = useState(false);
  const [isGrading, setIsGrading] = useState(false);
  const [gradingStatus, setGradingStatus] = useState('');
  const [gradeError, setGradeError] = useState('');
  const [gradeResult, setGradeResult] = useState<FullEssayGradeResult | null>(null);
  const [lastGradedText, setLastGradedText] = useState('');
  const [attemptCount, setAttemptCount] = useState(0);
  const [previousAttempt, setPreviousAttempt] = useState<PreviousAttemptSummary | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const feedbackRef = useRef<HTMLDivElement>(null);
  const savedAttemptRef = useRef(false);
  const prevActiveIdRef = useRef<string>('');

  useEffect(() => {
    if (activeId && prevActiveIdRef.current !== activeId) {
      prevActiveIdRef.current = activeId;
      setEssayInput('');
      setGradeError('');
      setGradingStatus('');
      setGradeResult(null);
      setLastGradedText('');
      setAttemptCount(0);
      setPreviousAttempt(null);
      setShowOutlineHint(false);
      savedAttemptRef.current = false;
    }
  }, [activeId]);

  const handleSelectSession = (id: string) => {
    setInternalSelectedId(id);
    onSelectSourceId?.(id);
  };

  const handleResetEditor = () => {
    setEssayInput('');
    setGradeError('');
    setGradingStatus('');
    setGradeResult(null);
    setLastGradedText('');
    setAttemptCount(0);
    setPreviousAttempt(null);
    savedAttemptRef.current = false;
    setTimeout(() => textareaRef.current?.focus(), 80);
  };

  if (eligibleSessions.length === 0 || !activeSession) {
    return (
      <div className="bg-[var(--card)] rounded-3xl p-8 md:p-10 text-center border border-[var(--border)] shadow-sm flex flex-col items-center gap-3">
        <div
          className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
            isTask1 ? 'bg-orange-50 text-orange-500' : 'bg-emerald-50 text-emerald-600'
          }`}
        >
          <FileEdit size={22} />
        </div>
        <h3 className="text-base font-extrabold text-gray-900">
          Chưa có bài hoàn thành đủ {expectedBodies} Body để tự viết toàn bài
        </h3>
        <p className="text-sm text-gray-500 max-w-md leading-relaxed">
          Chỉ những đề bạn đã hoàn tất hết {expectedBodies} Body ở tab <b>Luyện tập</b> mới xuất hiện tại đây để bạn tự ghép ý và viết hoàn chỉnh một bài essay từ đầu.
        </p>
        <button
          type="button"
          onClick={onBackToPractice}
          className={`mt-2 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white shadow-sm transition-colors ${
            isTask1 ? 'bg-orange-500 hover:bg-orange-600' : 'bg-emerald-600 hover:bg-emerald-700'
          }`}
        >
          <ArrowLeft size={15} /> Quay lại Luyện tập
        </button>
      </div>
    );
  }

  const wordCount = countWords(essayInput);
  const meetsRecommendedLength = wordCount >= minWordGoal;

  const handleSubmitFullEssay = async () => {
    const trimmed = essayInput.trim();
    if (!trimmed) return;

    if (countWords(trimmed) < 35) {
      setGradeError(
        `Bài viết toàn bài còn quá ngắn (${countWords(trimmed)} từ). Hãy viết đầy đủ các đoạn (khuyến nghị ≥ ${minWordGoal} từ) trước khi chấm.`
      );
      return;
    }

    if (gradeResult && !gradeResult.passed && trimmed === lastGradedText) {
      setGradeError('Bạn chưa chỉnh sửa nội dung so với lần chấm trước. Hãy sửa theo góp ý của gia sư rồi chấm lại.');
      return;
    }

    const prevSummary =
      gradeResult && !gradeResult.passed && lastGradedText
        ? buildPreviousAttemptSummary(attemptCount, lastGradedText, gradeResult)
        : previousAttempt;

    setIsGrading(true);
    setGradingStatus('');
    setGradeError('');
    setGradeResult(null);
    const nextAttempt = attemptCount + 1;
    setAttemptCount(nextAttempt);

    try {
      const payload =
        props.taskType === 'task1'
          ? {
              taskType: 'task1' as const,
              chartData: (activeSession as Task1CompletedSession).chartData,
              outline: activeSession.outline,
              essay: trimmed,
              previousAttempt: prevSummary,
            }
          : {
              taskType: 'task2' as const,
              prompt: (activeSession as Task2CompletedSession).prompt,
              essayType: (activeSession as Task2CompletedSession).essayType,
              outline: activeSession.outline,
              essay: trimmed,
              previousAttempt: prevSummary,
            };

      const result = await gradeFullEssayResilient(payload, {
        onStatus: (msg) => setGradingStatus(msg),
      });
      setGradeResult(result);
      setLastGradedText(trimmed);
      setPreviousAttempt(buildPreviousAttemptSummary(nextAttempt, trimmed, result));

      if (result.passed && !savedAttemptRef.current) {
        savedAttemptRef.current = true;
        if (props.taskType === 'task1') {
          props.onSavePassedEssay(activeSession as Task1CompletedSession, trimmed, result);
        } else {
          props.onSavePassedEssay(activeSession as Task2CompletedSession, trimmed, result);
        }
      }

      setTimeout(() => {
        feedbackRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }, 120);
    } catch (e: any) {
      setGradeError(e.message || 'Không thể chấm bài hoàn chỉnh lúc này. Vui lòng thử lại.');
    } finally {
      setIsGrading(false);
      setGradingStatus('');
    }
  };

  const primaryBtn = isTask1
    ? 'bg-orange-500 hover:bg-orange-600'
    : 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700';

  return (
    <div className="flex flex-col gap-5">
      {/* Completed topic selector */}
      <div
        className={`bg-[var(--card)] rounded-2xl p-4 sm:p-5 border shadow-sm flex flex-col gap-3 ${
          isTask1 ? 'border-orange-200/80' : 'border-emerald-200/80'
        }`}
      >
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div>
            <p
              className={`text-xs font-extrabold uppercase tracking-wider ${
                isTask1 ? 'text-orange-600' : 'text-emerald-700'
              }`}
            >
              Chọn từ các bài đã hoàn tất đủ {expectedBodies} Body ({eligibleSessions.length} đề)
            </p>
            <p className="text-xs text-gray-500 mt-0.5">
              Tự viết lại toàn bộ bài hoàn chỉnh không có sẵn câu mẫu — Gia sư AI chấm chữa chi tiết từng đoạn &amp; toàn bài ({taskShort} 8.0 · CC 9.0 · GRA 8.0 · LR 7.0 — Overall ≥ 8.0).
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 max-h-56 overflow-y-auto pr-0.5">
          {eligibleSessions.map((sess) => {
            const isSelected = sess.id === activeSession.id;
            const title = getSessionTitle(taskType, sess);
            const fullRewriteCount = completedSessions.filter(
              (c) => c.sourceType === 'full-essay' && c.sourceSessionId === sess.id
            ).length;

            return (
              <button
                key={sess.id}
                type="button"
                onClick={() => handleSelectSession(sess.id)}
                className={`text-left rounded-xl p-3 border transition-all flex flex-col gap-1.5 ${
                  isSelected
                    ? isTask1
                      ? 'bg-orange-50 border-orange-400 ring-1 ring-orange-200'
                      : 'bg-emerald-50 border-emerald-500 ring-1 ring-emerald-200'
                    : 'bg-white border-gray-200 hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center justify-between gap-1.5">
                  <span
                    className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                      isSelected
                        ? isTask1
                          ? 'bg-orange-500 text-white'
                          : 'bg-emerald-600 text-white'
                        : 'bg-gray-100 text-gray-700'
                    }`}
                  >
                    Band {sess.overallBand.toFixed(1)} · {sess.bodies.length} Body
                  </span>
                  {fullRewriteCount > 0 && (
                    <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-emerald-700">
                      <CheckCircle2 size={10} /> Đã viết lại {fullRewriteCount}x
                    </span>
                  )}
                </div>
                <p className="text-xs font-bold text-gray-800 line-clamp-2 leading-snug">{title}</p>
                <p className="text-[11px] text-gray-400">
                  {new Date(sess.savedAt).toLocaleDateString('vi-VN')}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Prompt / Chart Card */}
      {props.taskType === 'task1' ? (
        <div className="bg-[var(--card)] rounded-3xl p-5 sm:p-6 shadow-sm border border-orange-200/80 flex flex-col gap-4">
          <div className="bg-orange-50/50 border border-orange-200/60 rounded-2xl p-4">
            <p className="text-xs font-bold uppercase tracking-wider text-orange-600 mb-1">
              Đề bài Task 1
            </p>
            <p className="font-semibold text-gray-800 text-sm leading-relaxed">
              {(activeSession as Task1CompletedSession).chartData.context}
            </p>
          </div>
          <Task1ChartRenderer data={(activeSession as Task1CompletedSession).chartData} />
        </div>
      ) : (
        <div className="bg-[var(--card)] rounded-3xl p-5 sm:p-6 shadow-sm border border-emerald-100/80 flex flex-col gap-3">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <span className="text-xs font-extrabold uppercase tracking-wider text-emerald-700">
              Đề bài Task 2
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
              {(activeSession as Task2CompletedSession).essayType}
            </span>
          </div>
          <p className="font-bold text-gray-900 text-base leading-relaxed">
            &ldquo;{(activeSession as Task2CompletedSession).prompt}&rdquo;
          </p>
          {(activeSession as Task2CompletedSession).promptAnalysis && (
            <p className="text-xs text-gray-600 leading-relaxed bg-emerald-50/70 border border-emerald-100 rounded-xl px-3.5 py-2.5">
              <b className="text-emerald-800">Phân tích trọng tâm: </b>
              {(activeSession as Task2CompletedSession).promptAnalysis}
            </p>
          )}
        </div>
      )}

      {/* Optional collapsible Vietnamese outline reference */}
      {activeSession.outline.length > 0 && (
        <div className="bg-[var(--card)] rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
          <button
            type="button"
            onClick={() => setShowOutlineHint((v) => !v)}
            className="w-full px-4 py-3 flex items-center justify-between text-xs font-bold text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <span className="flex items-center gap-2">
              <ListChecks size={15} className={isTask1 ? 'text-orange-500' : 'text-emerald-600'} />
              Xem lại dàn ý &amp; lưu ý 8/9/8/7 đã học ({activeSession.outline.length} Body) — tùy chọn
            </span>
            {showOutlineHint ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
          </button>
          {showOutlineHint && (
            <div className="px-4 pb-4 pt-2 border-t border-gray-100 grid grid-cols-1 md:grid-cols-2 gap-3 bg-gray-50/40">
              {activeSession.outline.map((item: OutlineBodyItem, idx: number) => (
                <div key={idx} className="rounded-xl bg-white border border-gray-200 p-3 text-xs flex flex-col gap-1.5">
                  <p className="font-extrabold text-gray-900">
                    Body {idx + 1}: {item.role}
                  </p>
                  <ul className="list-disc pl-4 space-y-1 text-gray-700">
                    {item.viGuide.map((line, li) => (
                      <li key={li}>{line}</li>
                    ))}
                  </ul>
                  {item.bandStrategy?.cc9Note && (
                    <p className="text-[11px] bg-emerald-50/70 border border-emerald-100 rounded-md px-2 py-1 text-emerald-900">
                      <b>CC 9.0: </b>
                      {item.bandStrategy.cc9Note}
                    </p>
                  )}
                  {item.bandStrategy?.lrNote && (
                    <p className="text-[11px] bg-sky-50/70 border border-sky-100 rounded-md px-2 py-1 text-sky-900">
                      <b>LR 7→8: </b>
                      {item.bandStrategy.lrNote}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Full Essay Editor */}
      <div className="bg-[var(--card)] rounded-3xl p-5 sm:p-6 shadow-sm border border-[var(--border)] flex flex-col gap-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div>
            <h3 className="text-sm font-extrabold text-gray-900">
              Tự viết bài hoàn chỉnh bằng tiếng Anh (nhấn Enter 2 lần để xuống đoạn mới)
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Khuyến nghị viết đủ cấu trúc {expectedBodies} đoạn và đạt tối thiểu {minWordGoal} từ. Đạt chuẩn Overall ≥ 8.0 ({taskShort} 8.0 · CC 9.0 · GRA 8.0 · LR 7.0) bài sẽ tự động lưu vào <b>Bài đã hoàn tất</b>.
            </p>
          </div>
          <div className="flex items-center gap-2">
            {attemptCount > 0 && (
              <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-gray-100 text-gray-600">
                Lần chấm #{attemptCount}
              </span>
            )}
            <span
              className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                meetsRecommendedLength
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : 'bg-amber-50 text-amber-700 border border-amber-200'
              }`}
            >
              {wordCount} / {minWordGoal}+ từ
            </span>
          </div>
        </div>

        <textarea
          ref={textareaRef}
          value={essayInput}
          onChange={(e) => {
            setEssayInput(e.target.value);
            if (gradeError) setGradeError('');
          }}
          disabled={isGrading || !!gradeResult?.passed}
          placeholder={
            isTask1
              ? 'Viết toàn bộ bài Task 1 (Đoạn 1: Introduction -> Đoạn 2: Overview -> Đoạn 3: Detail 1 -> Đoạn 4: Detail 2)...'
              : 'Viết toàn bộ bài Task 2 (Đoạn 1: Intro -> Đoạn 2: Body 1 -> Đoạn 3: Body 2 -> Đoạn 4: Body 3 -> Đoạn 5: Conclusion)...'
          }
          rows={12}
          className={`w-full rounded-2xl border p-4 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 transition-all leading-relaxed resize-y disabled:bg-gray-50 disabled:text-gray-600 ${
            isTask1
              ? 'border-orange-200/80 focus:border-orange-400 focus:ring-orange-100'
              : 'border-emerald-200/80 focus:border-emerald-500 focus:ring-emerald-100'
          }`}
        />

        <div className="flex items-center justify-between gap-2 flex-wrap">
          <button
            type="button"
            onClick={handleResetEditor}
            disabled={isGrading || (!essayInput && !gradeResult)}
            className="inline-flex items-center gap-1.5 text-xs font-bold px-3.5 py-2 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40 transition-colors"
          >
            <RotateCcw size={13} /> Viết lại từ đầu
          </button>

          <button
            type="button"
            onClick={handleSubmitFullEssay}
            disabled={isGrading || wordCount < 35 || !!gradeResult?.passed}
            className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white shadow-sm disabled:opacity-50 transition-all ${primaryBtn}`}
          >
            {isGrading ? (
              <>
                <Loader2 size={16} className="animate-spin" /> Đang chấm chữa toàn bài...
              </>
            ) : (
              <>
                <Send size={15} /> Chấm &amp; chữa toàn bài (8/9/8/7)
              </>
            )}
          </button>
        </div>
      </div>

      {/* Detailed Whole-Essay Grading Feedback */}
      <div ref={feedbackRef}>
        <FullEssayFeedbackPanel
          taskType={taskType}
          isGrading={isGrading}
          gradingStatus={gradingStatus}
          gradeError={gradeError}
          gradeResult={gradeResult}
          accent={isTask1 ? 'orange' : 'emerald'}
          onFocusEditor={() => textareaRef.current?.focus()}
          onViewHistory={onViewHistory}
        />
      </div>
    </div>
  );
}
