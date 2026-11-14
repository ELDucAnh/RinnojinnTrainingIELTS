'use client';

import { useState } from 'react';
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Link2,
  Loader2,
  RotateCcw,
  Sparkles,
  TrendingUp,
  Award,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { BAND_PASS_THRESHOLD, type BodyGradeResult } from '@/lib/writing-practice-types';

interface BodyFeedbackPanelProps {
  taskType: 'task1' | 'task2';
  bodyIndex: number;
  totalBodies: number;
  isGrading: boolean;
  gradeError: string;
  gradeResult: BodyGradeResult | null;
  onFocusEditor: () => void;
  onNextBody: () => void;
  onViewHistory: () => void;
}

export function BodyFeedbackPanel({
  taskType,
  bodyIndex,
  totalBodies,
  isGrading,
  gradeError,
  gradeResult,
  onFocusEditor,
  onNextBody,
  onViewHistory,
}: BodyFeedbackPanelProps) {
  const [showUpgrade, setShowUpgrade] = useState(false);

  if (isGrading) {
    return (
      <div className="flex items-center gap-3 p-5 bg-[var(--card)] rounded-2xl border border-indigo-100 shadow-sm animate-fade-in">
        <Loader2 size={20} className="animate-spin text-indigo-600 flex-shrink-0" />
        <div>
          <p className="font-bold text-gray-800 text-sm">
            AI đang chấm Body {bodyIndex + 1}/{totalBodies} theo chuẩn IELTS Band 7.5...
          </p>
          <p className="text-xs text-gray-500 mt-0.5">
            Đang đánh giá 4 tiêu chí ({taskType === 'task1' ? 'TA' : 'TR'}, CC, LR, GRA) và sự liên kết với các body trước đó
          </p>
        </div>
      </div>
    );
  }

  if (gradeError) {
    return (
      <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-2xl text-red-700 animate-fade-in">
        <AlertCircle size={18} className="flex-shrink-0 mt-0.5" />
        <div className="text-sm">
          <p className="font-bold">Không thể chấm bài</p>
          <p className="mt-0.5">{gradeError}</p>
        </div>
      </div>
    );
  }

  if (!gradeResult) return null;

  const isLastBody = bodyIndex + 1 >= totalBodies;
  const passed = gradeResult.passed;
  const taskLabel = taskType === 'task1' ? 'Task Achievement (TA)' : 'Task Response (TR)';

  const criteriaList = [
    { key: 'task', short: taskType === 'task1' ? 'TA' : 'TR', title: taskLabel, data: gradeResult.criteria.task },
    { key: 'cc', short: 'CC', title: 'Coherence & Cohesion', data: gradeResult.criteria.cc },
    { key: 'lr', short: 'LR', title: 'Lexical Resource', data: gradeResult.criteria.lr },
    { key: 'gra', short: 'GRA', title: 'Grammatical Range & Accuracy', data: gradeResult.criteria.gra },
  ];

  const lostCriteriaNames = criteriaList
    .filter((c) => c.data.band < BAND_PASS_THRESHOLD)
    .map((c) => `${c.short} (${c.data.band.toFixed(1)})`);

  return (
    <div className="flex flex-col gap-4 bg-[var(--card)] rounded-2xl shadow-sm border border-[var(--border)] overflow-hidden animate-fade-in">
      {/* Header score banner */}
      <div
        className={`flex flex-col sm:flex-row sm:items-center gap-4 p-5 text-white bg-gradient-to-r ${
          passed
            ? 'from-emerald-600 via-emerald-500 to-teal-500'
            : 'from-rose-600 via-red-500 to-amber-500'
        }`}
      >
        <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-sm flex flex-col items-center justify-center flex-shrink-0 border border-white/25">
          <span className="text-2xl font-black leading-none">{gradeResult.overallBand.toFixed(1)}</span>
          <span className="text-[10px] font-bold opacity-90 mt-0.5">BAND</span>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-extrabold text-base">
              {passed
                ? isLastBody
                  ? '🎉 Xuất sắc! Hoàn thành toàn bộ bài viết chuẩn Band 7.5!'
                  : '🎉 Đạt chuẩn Band 7.5! Mở khóa Body tiếp theo'
                : `⚠️ Chưa đạt chuẩn Band 7.5 (Cần ≥ 7.5 & không tiêu chí nào < 7.0)`}
            </span>
          </div>
          <p className="text-xs sm:text-sm text-white/95 leading-relaxed mt-1">
            {gradeResult.generalFeedback}
          </p>
          {!passed && lostCriteriaNames.length > 0 && (
            <p className="text-xs font-bold mt-1.5 bg-black/15 inline-block px-2.5 py-1 rounded-lg">
              Tiêu chí mất điểm chưa đạt 7.5: {lostCriteriaNames.join(', ')}
            </p>
          )}
        </div>
      </div>

      <div className="px-4 sm:px-5 pb-5 flex flex-col gap-4">
        {/* 4 Criteria Breakdown */}
        <div>
          <h4 className="text-xs font-extrabold uppercase tracking-wider text-gray-500 mb-2.5">
            Chi tiết chấm điểm 4 tiêu chí (Chuẩn qua: ≥ 7.5)
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {criteriaList.map((crit) => {
              const b = crit.data.band;
              const is75Plus = b >= BAND_PASS_THRESHOLD;
              const is70 = b >= 7.0 && b < BAND_PASS_THRESHOLD;

              return (
                <div
                  key={crit.key}
                  className={`rounded-xl p-3.5 border flex flex-col gap-2 ${
                    is75Plus
                      ? 'bg-emerald-50/50 border-emerald-200'
                      : is70
                      ? 'bg-amber-50/60 border-amber-200'
                      : 'bg-red-50/60 border-red-200'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <span className="text-xs font-black text-gray-900">{crit.title}</span>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          is75Plus
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-red-100 text-red-700'
                        }`}
                      >
                        {is75Plus ? 'Đạt ≥ 7.5' : 'Mất điểm (< 7.5)'}
                      </span>
                      <span
                        className={`text-sm font-black px-2 py-0.5 rounded-lg text-white ${
                          is75Plus ? 'bg-emerald-600' : is70 ? 'bg-amber-500' : 'bg-red-500'
                        }`}
                      >
                        {b.toFixed(1)}
                      </span>
                    </div>
                  </div>

                  <p className="text-xs text-gray-700 leading-relaxed">{crit.data.reason}</p>

                  {crit.data.evidence.length > 0 && (
                    <ul className="space-y-1 pt-1 border-t border-black/5">
                      {crit.data.evidence.map((ev, idx) => (
                        <li key={idx} className="text-[11px] text-gray-600 flex items-start gap-1.5">
                          <span className="font-bold text-gray-400">•</span>
                          <span className="italic">{ev}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Cross-body Coherence */}
        <div className="p-3.5 rounded-xl bg-indigo-50/70 border border-indigo-200 flex items-start gap-2.5">
          <Link2 size={16} className="text-indigo-600 flex-shrink-0 mt-0.5" />
          <div className="text-xs text-indigo-950 leading-relaxed">
            <p className="font-extrabold text-indigo-800 mb-0.5">
              Liên kết với các Body khác trong bài
            </p>
            <p>{gradeResult.crossBodyFeedback}</p>
          </div>
        </div>

        {/* Grammar errors */}
        {gradeResult.grammarErrors.length > 0 && (
          <div className="p-3.5 bg-red-50/80 rounded-xl border border-red-200">
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle size={14} className="text-red-500 flex-shrink-0" />
              <span className="text-xs font-extrabold text-red-700">
                Lỗi ngữ pháp cần sửa ({gradeResult.grammarErrors.length})
              </span>
            </div>
            <div className="flex flex-col gap-2">
              {gradeResult.grammarErrors.map((err, i) => (
                <div key={i} className="text-xs bg-white/80 rounded-lg p-2.5 border border-red-100">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="px-1.5 py-0.5 bg-red-100 text-red-700 rounded font-mono line-through">
                      {err.original}
                    </span>
                    <span className="text-gray-400">→</span>
                    <span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-700 rounded font-mono font-semibold">
                      {err.correction}
                    </span>
                  </div>
                  {err.explanation && (
                    <p className="text-gray-600 mt-1 leading-relaxed">{err.explanation}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Vocabulary tips */}
        {gradeResult.vocabularyTips.length > 0 && (
          <div className="p-3.5 bg-blue-50/80 rounded-xl border border-blue-200">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp size={14} className="text-blue-600 flex-shrink-0" />
              <span className="text-xs font-extrabold text-blue-700">
                Gợi ý nâng cấp từ vựng Band 7.5+ ({gradeResult.vocabularyTips.length})
              </span>
            </div>
            <div className="flex flex-col gap-2">
              {gradeResult.vocabularyTips.map((tip, i) => (
                <div key={i} className="text-xs bg-white/80 rounded-lg p-2.5 border border-blue-100">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded font-medium">
                      {tip.studentWord}
                    </span>
                    <span className="text-gray-400">→</span>
                    <span className="px-1.5 py-0.5 bg-indigo-100 text-indigo-800 rounded font-bold">
                      {tip.betterAlternative}
                    </span>
                  </div>
                  {tip.reason && (
                    <p className="text-gray-600 mt-1 leading-relaxed">{tip.reason}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Model upgrade (only shown when passed) */}
        {passed && gradeResult.modelUpgrade && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 overflow-hidden">
            <button
              type="button"
              onClick={() => setShowUpgrade((v) => !v)}
              className="w-full px-3.5 py-2.5 flex items-center justify-between text-xs font-bold text-emerald-800 hover:bg-emerald-50 transition-colors"
            >
              <span className="flex items-center gap-1.5">
                <Award size={14} className="text-emerald-600" />
                Tham khảo phiên bản nâng cấp Band 8.0+ cho Body này
              </span>
              {showUpgrade ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
            {showUpgrade && (
              <div className="px-3.5 pb-3.5 text-sm text-emerald-950 leading-relaxed whitespace-pre-wrap border-t border-emerald-100 pt-2.5 bg-white/70">
                {gradeResult.modelUpgrade}
              </div>
            )}
          </div>
        )}

        {/* Action footer */}
        {!passed ? (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl bg-amber-50 border border-amber-200">
            <p className="text-xs text-amber-900 font-medium">
              Nội dung của bạn vẫn được giữ nguyên trong ô viết phía trên. Hãy chỉnh sửa theo góp ý các tiêu chí mất điểm rồi bấm chấm lại.
            </p>
            <button
              type="button"
              onClick={onFocusEditor}
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white shadow-sm transition-colors flex-shrink-0"
            >
              <RotateCcw size={13} /> Chỉnh sửa Body này
            </button>
          </div>
        ) : isLastBody ? (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl bg-emerald-50 border border-emerald-200">
            <div className="flex items-start gap-2.5 text-emerald-900">
              <CheckCircle2 size={18} className="text-emerald-600 flex-shrink-0 mt-0.5" />
              <div className="text-xs sm:text-sm">
                <p className="font-extrabold">Bài viết hoàn chỉnh đã được lưu vào bộ nhớ trình duyệt!</p>
                <p className="text-xs text-emerald-700 mt-0.5">
                  Bạn đã vượt qua toàn bộ {totalBodies} Body đạt chuẩn Band 7.5+.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onViewHistory}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-md transition-all flex-shrink-0"
            >
              <Sparkles size={15} /> Xem bài hoàn chỉnh
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={onNextBody}
            className="w-full py-3 flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold rounded-xl shadow-md transition-all text-sm"
          >
            Qua Body tiếp theo (Body {bodyIndex + 2}/{totalBodies}) <ArrowRight size={16} />
          </button>
        )}
      </div>
    </div>
  );
}

