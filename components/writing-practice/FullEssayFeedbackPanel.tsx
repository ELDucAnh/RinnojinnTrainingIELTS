'use client';

import { useState } from 'react';
import {
  AlertCircle,
  Award,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Layers,
  Loader2,
  Repeat,
  RotateCcw,
  Sparkles,
  TrendingUp,
} from 'lucide-react';
import {
  MIN_LR_GRA_BAND,
  MIN_TASK_CC_BAND,
  type FullEssayGradeResult,
} from '@/lib/writing-practice-types';

interface FullEssayFeedbackPanelProps {
  taskType: 'task1' | 'task2';
  isGrading: boolean;
  gradeError: string;
  gradeResult: FullEssayGradeResult | null;
  accent?: 'orange' | 'emerald' | 'indigo';
  onFocusEditor?: () => void;
  onViewHistory?: () => void;
  readOnly?: boolean;
}

export function FullEssayFeedbackPanel({
  taskType,
  isGrading,
  gradeError,
  gradeResult,
  accent = 'emerald',
  onFocusEditor,
  onViewHistory,
  readOnly = false,
}: FullEssayFeedbackPanelProps) {
  const [showUpgrade, setShowUpgrade] = useState(false);

  const isOrange = accent === 'orange';
  const taskShort = taskType === 'task1' ? 'TA' : 'TR';
  const taskLabel = taskType === 'task1' ? 'Task Achievement (TA)' : 'Task Response (TR)';
  const targetLabel = `${taskShort} 8.0 • CC 8.0 • LR 7.0 • GRA 7.0`;

  if (isGrading) {
    return (
      <div
        className={`flex items-center gap-3 p-5 bg-[var(--card)] rounded-2xl border shadow-sm animate-fade-in ${
          isOrange ? 'border-orange-200/80' : 'border-emerald-200'
        }`}
      >
        <Loader2
          size={20}
          className={`animate-spin flex-shrink-0 ${isOrange ? 'text-orange-500' : 'text-emerald-600'}`}
        />
        <div>
          <p className="font-bold text-gray-800 text-sm">
            AI đang chấm chữa chuyên sâu toàn bài ({targetLabel})...
          </p>
          <p className="text-xs text-gray-500 mt-0.5">
            Đang kiểm tra từng đoạn, phát hiện lặp từ xuyên suốt bài viết và gợi ý sửa cụ thể
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
          <p className="font-bold">Không thể chấm toàn bài</p>
          <p className="mt-0.5">{gradeError}</p>
        </div>
      </div>
    );
  }

  if (!gradeResult) return null;

  const passed = gradeResult.passed;
  const criteriaList = [
    { key: 'task', short: taskShort, title: taskLabel, target: MIN_TASK_CC_BAND, data: gradeResult.criteria.task },
    { key: 'cc', short: 'CC', title: 'Coherence & Cohesion', target: MIN_TASK_CC_BAND, data: gradeResult.criteria.cc },
    { key: 'lr', short: 'LR', title: 'Lexical Resource', target: MIN_LR_GRA_BAND, data: gradeResult.criteria.lr },
    { key: 'gra', short: 'GRA', title: 'Grammatical Range & Accuracy', target: MIN_LR_GRA_BAND, data: gradeResult.criteria.gra },
  ];

  const lostCriteriaNames = criteriaList
    .filter((c) => c.data.band < c.target)
    .map((c) => `${c.short} (${c.data.band.toFixed(1)}/${c.target.toFixed(1)})`);

  return (
    <div className="flex flex-col gap-4 bg-[var(--card)] rounded-2xl shadow-sm border border-[var(--border)] overflow-hidden animate-fade-in">
      {/* Header score banner */}
      <div
        className={`flex flex-col sm:flex-row sm:items-center gap-4 p-5 text-white bg-gradient-to-r ${
          passed ? 'from-emerald-600 via-emerald-500 to-teal-500' : 'from-rose-600 via-red-500 to-amber-500'
        }`}
      >
        <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-sm flex flex-col items-center justify-center flex-shrink-0 border border-white/25">
          <span className="text-2xl font-black leading-none">{gradeResult.overallBand.toFixed(1)}</span>
          <span className="text-[10px] font-bold opacity-90 mt-0.5">BAND</span>
        </div>

        <div className="flex-1 min-w-0">
          <span className="font-extrabold text-base block">
            {passed
              ? 'Tuyệt vời! Bài tự viết hoàn chỉnh đạt chuẩn Overall ≥ 7.5!'
              : `Bài toàn bài chưa đạt mục tiêu (${targetLabel})`}
          </span>
          <p className="text-xs sm:text-sm text-white/95 leading-relaxed mt-1">
            {gradeResult.generalFeedback}
          </p>
          {!passed && lostCriteriaNames.length > 0 && (
            <p className="text-xs font-bold mt-1.5 bg-black/15 inline-block px-2.5 py-1 rounded-lg">
              Chưa đạt mục tiêu: {lostCriteriaNames.join(', ')}
            </p>
          )}
        </div>
      </div>

      <div className="px-4 sm:px-5 pb-5 flex flex-col gap-4">
        {/* 4 Criteria Breakdown */}
        <div>
          <h4 className="text-xs font-extrabold uppercase tracking-wider text-gray-500 mb-2.5">
            Chấm điểm 4 tiêu chí toàn bài ({targetLabel})
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {criteriaList.map((crit) => {
              const b = crit.data.band;
              const isMet = b >= crit.target;
              const isNear = b >= crit.target - 0.5 && b < crit.target;

              return (
                <div
                  key={crit.key}
                  className={`rounded-xl p-3.5 border flex flex-col gap-2 ${
                    isMet
                      ? 'bg-emerald-50/50 border-emerald-200'
                      : isNear
                      ? 'bg-amber-50/60 border-amber-200'
                      : 'bg-red-50/60 border-red-200'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-black text-gray-900">{crit.title}</span>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          isMet ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-700'
                        }`}
                      >
                        {isMet ? `Đạt ≥ ${crit.target.toFixed(1)}` : `Chưa đạt (< ${crit.target.toFixed(1)})`}
                      </span>
                      <span
                        className={`text-sm font-black px-2 py-0.5 rounded-lg text-white ${
                          isMet ? 'bg-emerald-600' : isNear ? 'bg-amber-500' : 'bg-red-500'
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

                  {crit.data.fixes && crit.data.fixes.length > 0 && (
                    <div
                      className={`mt-auto rounded-lg p-2.5 border ${
                        isMet
                          ? 'bg-emerald-50/70 border-emerald-200/70'
                          : isOrange
                          ? 'bg-white/90 border-orange-200/80'
                          : 'bg-white/90 border-gray-200/80'
                      }`}
                    >
                      <p
                        className={`text-[10px] font-extrabold uppercase tracking-wider mb-1 ${
                          isMet ? 'text-emerald-700' : isOrange ? 'text-orange-700' : 'text-gray-700'
                        }`}
                      >
                        {isMet ? 'Gợi ý nâng điểm thêm' : 'Cách sửa cụ thể'}
                      </p>
                      <ul className="space-y-1.5">
                        {crit.data.fixes.map((fix, idx) => (
                          <li key={idx} className="text-[11.5px] text-gray-800 leading-relaxed flex items-start gap-1.5">
                            <span
                              className={`font-bold flex-shrink-0 ${
                                isMet ? 'text-emerald-600' : isOrange ? 'text-orange-500' : 'text-amber-600'
                              }`}
                            >
                              →
                            </span>
                            <span>{fix}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Whole essay flow & paragraph structure */}
        <div
          className={`p-3.5 rounded-xl border flex items-start gap-2.5 ${
            isOrange ? 'bg-orange-50/70 border-orange-200/80' : 'bg-indigo-50/70 border-indigo-200'
          }`}
        >
          <Layers
            size={16}
            className={`flex-shrink-0 mt-0.5 ${isOrange ? 'text-orange-600' : 'text-indigo-600'}`}
          />
          <div className={`text-xs leading-relaxed ${isOrange ? 'text-orange-950' : 'text-indigo-950'}`}>
            <p className={`font-extrabold mb-0.5 ${isOrange ? 'text-orange-800' : 'text-indigo-800'}`}>
              Cấu trúc tổng thể &amp; Mạch chuyển giữa các đoạn
            </p>
            <p>{gradeResult.wholeEssayStructureFeedback}</p>
          </div>
        </div>

        {/* Paragraph-by-paragraph breakdown */}
        {gradeResult.paragraphBreakdown.length > 0 && (
          <div className="flex flex-col gap-2.5">
            <h4 className="text-xs font-extrabold uppercase tracking-wider text-gray-500">
              Chữa chi tiết từng đoạn văn ({gradeResult.paragraphBreakdown.length} đoạn)
            </h4>
            <div className="grid grid-cols-1 gap-2.5">
              {gradeResult.paragraphBreakdown.map((p, idx) => (
                <div
                  key={idx}
                  className="rounded-xl border border-gray-200 bg-gray-50/60 p-3.5 flex flex-col gap-2 text-xs"
                >
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <span className="font-black text-gray-900">{p.label}</span>
                    {p.role && (
                      <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-white border border-gray-200 text-gray-600">
                        {p.role}
                      </span>
                    )}
                  </div>
                  {p.strengths && (
                    <p className="text-emerald-800 leading-relaxed">
                      <span className="font-bold">Điểm tốt: </span>
                      {p.strengths}
                    </p>
                  )}
                  {p.weaknesses && (
                    <p className="text-rose-800 leading-relaxed">
                      <span className="font-bold">Điểm yếu / Mất điểm: </span>
                      {p.weaknesses}
                    </p>
                  )}
                  {p.suggestedEdit && (
                    <div className="bg-white border border-gray-200 rounded-lg p-2.5 text-gray-800 leading-relaxed">
                      <span className="font-extrabold text-gray-900">Gợi ý sửa đoạn này: </span>
                      <span className="whitespace-pre-wrap">{p.suggestedEdit}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Repetition alerts across paragraphs */}
        {gradeResult.repetitionAlerts.length > 0 && (
          <div className="p-3.5 rounded-xl bg-amber-50/80 border border-amber-200">
            <div className="flex items-center gap-2 mb-1.5">
              <Repeat size={14} className="text-amber-700 flex-shrink-0" />
              <span className="text-xs font-extrabold text-amber-800">
                Cảnh báo lặp từ / lặp cấu trúc xuyên suốt bài ({gradeResult.repetitionAlerts.length})
              </span>
            </div>
            <ul className="space-y-1 text-xs text-amber-950 list-disc pl-4">
              {gradeResult.repetitionAlerts.map((alert, i) => (
                <li key={i} className="leading-relaxed">{alert}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Grammar errors */}
        {gradeResult.grammarErrors.length > 0 && (
          <div className="p-3.5 bg-red-50/80 rounded-xl border border-red-200">
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle size={14} className="text-red-500 flex-shrink-0" />
              <span className="text-xs font-extrabold text-red-700">
                Lỗi ngữ pháp cần sửa toàn bài ({gradeResult.grammarErrors.length})
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

        {/* Vocabulary tips (B1-B2 collocations) */}
        {gradeResult.vocabularyTips.length > 0 && (
          <div className="p-3.5 bg-blue-50/80 rounded-xl border border-blue-200">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp size={14} className="text-blue-600 flex-shrink-0" />
              <span className="text-xs font-extrabold text-blue-700">
                Collocation B1–B2 tự nhiên chuẩn Band 7.0 ({gradeResult.vocabularyTips.length})
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
                    <span
                      className={`px-1.5 py-0.5 rounded font-bold ${
                        isOrange ? 'bg-orange-100 text-orange-800' : 'bg-emerald-100 text-emerald-800'
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

        {/* Full essay model upgrade */}
        {gradeResult.modelUpgrade && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 overflow-hidden">
            <button
              type="button"
              onClick={() => setShowUpgrade((v) => !v)}
              className="w-full px-3.5 py-2.5 flex items-center justify-between text-xs font-bold text-emerald-800 hover:bg-emerald-50 transition-colors"
            >
              <span className="flex items-center gap-1.5">
                <Award size={14} className="text-emerald-600" />
                Xem bài viết hoàn chỉnh tham khảo chuẩn Band 8.0+ (Collocation B1–B2 tự nhiên)
              </span>
              {showUpgrade ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
            {showUpgrade && (
              <div className="px-3.5 pb-3.5 text-sm text-emerald-950 leading-relaxed whitespace-pre-wrap border-t border-emerald-100 pt-2.5 bg-white/80">
                {gradeResult.modelUpgrade}
              </div>
            )}
          </div>
        )}

        {/* Footer actions */}
        {!readOnly && (
          !passed ? (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl bg-amber-50 border border-amber-200">
              <p className="text-xs text-amber-900 font-medium">
                Bài viết của bạn vẫn được giữ nguyên trong khung soạn thảo. Hãy chỉnh sửa theo góp ý từng đoạn &amp; từng tiêu chí rồi gửi chấm lại.
              </p>
              {onFocusEditor && (
                <button
                  type="button"
                  onClick={onFocusEditor}
                  className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white shadow-sm transition-colors flex-shrink-0"
                >
                  <RotateCcw size={13} /> Chỉnh sửa bài
                </button>
              )}
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl bg-emerald-50 border border-emerald-200">
              <div className="flex items-start gap-2.5 text-emerald-900">
                <CheckCircle2 size={18} className="text-emerald-600 flex-shrink-0 mt-0.5" />
                <div className="text-xs sm:text-sm">
                  <p className="font-extrabold">Bài tự viết hoàn chỉnh đã được lưu vào Bài đã hoàn tất!</p>
                  <p className="text-xs text-emerald-700 mt-0.5">
                    Đạt trọn bộ tiêu chuẩn {targetLabel} (Overall ≥ 7.5).
                  </p>
                </div>
              </div>
              {onViewHistory && (
                <button
                  type="button"
                  onClick={onViewHistory}
                  className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-md transition-all flex-shrink-0"
                >
                  <Sparkles size={15} /> Xem trong Bài đã hoàn tất
                </button>
              )}
            </div>
          )
        )}
      </div>
    </div>
  );
}
