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
  GraduationCap,
} from 'lucide-react';
import {
  MIN_CC_BAND,
  MIN_GRA_BAND,
  MIN_LR_BAND,
  MIN_TASK_BAND,
  type BodyGradeResult,
} from '@/lib/writing-practice-types';
import {
  CriteriaBreakdownGrid,
  type CriterionGridItem,
} from '@/components/writing-practice/CriteriaBreakdownGrid';

interface BodyFeedbackPanelProps {
  taskType: 'task1' | 'task2';
  bodyIndex: number;
  totalBodies: number;
  isGrading: boolean;
  gradingStatus?: string;
  gradeError: string;
  gradeResult: BodyGradeResult | null;
  accent?: 'indigo' | 'emerald' | 'orange';
  onFocusEditor: () => void;
  onNextBody: () => void;
  onViewHistory: () => void;
}

export function BodyFeedbackPanel({
  taskType,
  bodyIndex,
  totalBodies,
  isGrading,
  gradingStatus,
  gradeError,
  gradeResult,
  accent = 'indigo',
  onFocusEditor,
  onNextBody,
  onViewHistory,
}: BodyFeedbackPanelProps) {
  const [showUpgrade, setShowUpgrade] = useState(false);

  const isOrange = accent === 'orange';
  const taskShort = taskType === 'task1' ? 'TA' : 'TR';
  const taskLabel = taskType === 'task1' ? 'Task Achievement (TA)' : 'Task Response (TR)';
  const targetLabel = `${taskShort} 8.0 • CC 9.0 • GRA 8.0 • LR 7.0`;

  if (isGrading) {
    return (
      <div
        className={`flex items-center gap-3 p-5 bg-[var(--card)] rounded-2xl border shadow-sm animate-fade-in ${isOrange ? 'border-orange-200/80' : accent === 'emerald' ? 'border-emerald-100' : 'border-indigo-100'
          }`}
      >
        <Loader2
          size={20}
          className={`animate-spin flex-shrink-0 ${isOrange ? 'text-orange-500' : accent === 'emerald' ? 'text-emerald-600' : 'text-indigo-600'
            }`}
        />
        <div>
          <p className="font-bold text-gray-800 text-sm">
            {gradingStatus ||
              `Gia sư AI đang chấm & bóc tách Body ${bodyIndex + 1}/${totalBodies} (${targetLabel})...`}
          </p>
          <p className="text-xs text-gray-500 mt-0.5">
            Phản hồi chi tiết nhiều lớp — nếu quá dài hệ thống sẽ tự chia nhỏ &amp; thử lại tự động cho bạn
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
          <p className="font-bold">Không thể chấm bài sau nhiều lần tự động thử lại</p>
          <p className="mt-0.5">{gradeError}</p>
        </div>
      </div>
    );
  }

  if (!gradeResult) return null;

  const isLastBody = bodyIndex + 1 >= totalBodies;
  const passed = gradeResult.passed;

  const criteriaList: CriterionGridItem[] = [
    { key: 'task', short: taskShort, title: taskLabel, target: MIN_TASK_BAND, data: gradeResult.criteria.task },
    { key: 'cc', short: 'CC', title: 'Coherence & Cohesion', target: MIN_CC_BAND, data: gradeResult.criteria.cc },
    { key: 'gra', short: 'GRA', title: 'Grammatical Range & Accuracy', target: MIN_GRA_BAND, data: gradeResult.criteria.gra },
    { key: 'lr', short: 'LR', title: 'Lexical Resource', target: MIN_LR_BAND, data: gradeResult.criteria.lr },
  ];

  const lostCriteriaNames = criteriaList
    .filter((c) => c.data.band < c.target)
    .map((c) => `${c.short} (${c.data.band.toFixed(1)}/${c.target.toFixed(1)})`);

  return (
    <div className="flex flex-col gap-4 bg-[var(--card)] rounded-2xl shadow-sm border border-[var(--border)] overflow-hidden animate-fade-in">
      {/* Header score banner */}
      <div
        className={`flex flex-col sm:flex-row sm:items-center gap-4 p-5 text-white bg-gradient-to-r ${passed
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
                  ? 'Xuất sắc! Hoàn thành toàn bộ bài viết đạt chuẩn Overall ≥ 8.0!'
                  : 'Đạt chuẩn Band 8.0! Mở khóa Body tiếp theo'
                : `Chưa đạt chuẩn mục tiêu (${targetLabel})`}
            </span>
          </div>
          <p className="text-xs sm:text-sm text-white/95 leading-relaxed mt-1">
            {gradeResult.generalFeedback}
          </p>
          {!passed && lostCriteriaNames.length > 0 && (
            <p className="text-xs font-bold mt-1.5 bg-black/15 inline-block px-2.5 py-1 rounded-lg">
              Cần kéo lên mục tiêu: {lostCriteriaNames.join(' · ')}
            </p>
          )}
        </div>
      </div>

      <div className="px-4 sm:px-5 pb-5 flex flex-col gap-4">
        {/* Unified 4 Criteria Breakdown */}
        <CriteriaBreakdownGrid
          criteriaList={criteriaList}
          targetLabel={targetLabel}
          accent={accent}
        />

        {/* Cross-body Coherence */}
        <div
          className={`p-3.5 rounded-xl border flex items-start gap-2.5 ${isOrange
            ? 'bg-orange-50/70 border-orange-200/80'
            : 'bg-indigo-50/70 border-indigo-200'
            }`}
        >
          {!isOrange && <Link2 size={16} className="text-indigo-600 flex-shrink-0 mt-0.5" />}
          <div className={`text-xs leading-relaxed ${isOrange ? 'text-orange-950' : 'text-indigo-950'}`}>
            <p className={`font-extrabold mb-0.5 ${isOrange ? 'text-orange-800' : 'text-indigo-800'}`}>
              Liên kết với các Body khác trong bài (CC 9.0)
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
                Lỗi ngữ pháp cần sửa sạch để đạt GRA 8.0 ({gradeResult.grammarErrors.length})
              </span>
            </div>
            <div className="flex flex-col gap-2">
              {gradeResult.grammarErrors.map((err, i) => (
                <div key={i} className="text-xs bg-white/85 rounded-lg p-2.5 border border-red-100">
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
                Collocation B1–B2 tự nhiên chuẩn LR 7.0+ ({gradeResult.vocabularyTips.length})
              </span>
            </div>
            <div className="flex flex-col gap-2">
              {gradeResult.vocabularyTips.map((tip, i) => (
                <div key={i} className="text-xs bg-white/85 rounded-lg p-2.5 border border-blue-100">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded font-medium">
                      {tip.studentWord}
                    </span>
                    <span className="text-gray-400">→</span>
                    <span
                      className={`px-1.5 py-0.5 rounded font-bold ${isOrange ? 'bg-orange-100 text-orange-800' : 'bg-indigo-100 text-indigo-800'
                        }`}
                    >
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
                Tham khảo phiên bản chuẩn 8 {taskShort} · 9 CC · 8 GRA cho Body này
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

        {/* SIGNATURE: Vietnamese Tutor Deep-Dive Closing Verdict at the bottom */}
        {gradeResult.tutorClosingNote && (
          <div
            className={`rounded-2xl border-2 p-4 sm:p-5 shadow-xs flex flex-col gap-2.5 ${isOrange
              ? 'bg-gradient-to-br from-orange-50/90 via-amber-50/50 to-white border-orange-200/90'
              : 'bg-gradient-to-br from-emerald-50/90 via-teal-50/50 to-white border-emerald-200/90'
              }`}
          >
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2">
                <span
                  className={`w-7 h-7 rounded-xl flex items-center justify-center text-white shadow-xs flex-shrink-0 ${isOrange ? 'bg-orange-500' : 'bg-emerald-600'
                    }`}
                >
                  <GraduationCap size={15} />
                </span>
                <div>
                  <p
                    className={`text-[10.5px] font-black uppercase tracking-wider ${isOrange ? 'text-orange-700' : 'text-emerald-700'
                      }`}
                  >
                    Gia sư Writing 1-1 • Lộ trình Band 6.0 → 8.0
                  </p>
                  <h4 className="text-sm font-extrabold text-gray-900">
                    Đoạn chốt nhận xét &amp; bóc tách bài viết của bạn
                  </h4>
                </div>
              </div>
              <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-white border border-gray-200 text-gray-600">
                Body {bodyIndex + 1}/{totalBodies}
              </span>
            </div>

            <div className="bg-white/95 rounded-xl border border-gray-200/80 p-3.5 sm:p-4 text-[13px] text-gray-800 leading-relaxed whitespace-pre-line">
              {gradeResult.tutorClosingNote}
            </div>
          </div>
        )}

        {/* Action footer */}
        {!passed ? (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl bg-amber-50 border border-amber-200">
            <p className="text-xs text-amber-900 font-medium">
              Nội dung của bạn vẫn được giữ nguyên trong ô viết phía trên. Hãy sửa theo phân tích &amp; lời chốt gia sư rồi gửi chấm lại — AI sẽ nhớ bản cũ và đối chiếu tiến bộ cho bạn!
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
                  Bạn đã vượt qua toàn bộ {totalBodies} Body đạt chuẩn ({targetLabel} — Overall ≥ 8.0).
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
