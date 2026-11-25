'use client';

import {
  AlertCircle,
  Award,
  BookOpen,
  CheckCircle2,
  GraduationCap,
  Layers,
  Loader2,
  RotateCcw,
  Sparkles,
  Target,
  Wrench,
} from 'lucide-react';
import {
  CAMBRIDGE_TARGET_BAND,
  type CambridgeCriterionScore,
  type CambridgeGradeResult,
  type GuidedTaskType,
} from '@/lib/writing-guided-types';

interface CambridgeGradeReportProps {
  taskType: GuidedTaskType;
  isGrading: boolean;
  gradingStatus?: string;
  gradeError: string;
  result: CambridgeGradeResult | null;
  onEditAndResubmit?: () => void;
}

const ISSUE_BADGES = {
  add: { label: 'Bổ sung ý/cụm', cls: 'bg-sky-100 text-sky-800 border-sky-200' },
  replace: { label: 'Nâng cấp tự nhiên', cls: 'bg-violet-100 text-violet-800 border-violet-200' },
  fix_error: { label: 'Sửa lỗi trực tiếp', cls: 'bg-rose-100 text-rose-800 border-rose-200' },
} as const;

export function CambridgeGradeReport({
  taskType,
  isGrading,
  gradingStatus,
  gradeError,
  result,
  onEditAndResubmit,
}: CambridgeGradeReportProps) {
  const isTask1 = taskType === 'task1';
  const taskShort = isTask1 ? 'TA' : 'TR';
  const taskFull = isTask1 ? 'Task Achievement (TA)' : 'Task Response (TR)';

  if (isGrading) {
    return (
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5 shadow-sm flex items-center gap-3.5 animate-fade-in">
        <Loader2
          size={22}
          className={`animate-spin flex-shrink-0 ${isTask1 ? 'text-orange-500' : 'text-emerald-600'}`}
        />
        <div>
          <p className="text-sm font-black text-gray-900">
            {gradingStatus || 'Gia sư AI đang chấm điểm bài viết chuẩn Cambridge IELTS Band Descriptors...'}
          </p>
          <p className="text-xs text-gray-500 mt-0.5">
            Chấm tuần tự 3 pha gọn nhẹ (TA/TR &amp; CC → LR &amp; GRA → Gia sư chốt nhận xét) để ổn định tuyệt đối trên Free Tier
          </p>
        </div>
      </div>
    );
  }

  if (gradeError) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 flex items-start gap-3 text-rose-800 animate-fade-in">
        <AlertCircle size={18} className="flex-shrink-0 mt-0.5" />
        <div className="text-xs sm:text-sm">
          <p className="font-black">Chưa thể hoàn tất chấm điểm</p>
          <p className="mt-0.5">{gradeError}</p>
        </div>
      </div>
    );
  }

  if (!result) return null;

  const passed = result.passedTarget65;
  const criteriaCards: Array<{
    key: string;
    short: string;
    title: string;
    data: CambridgeCriterionScore;
  }> = [
    { key: 'task', short: taskShort, title: taskFull, data: result.criteria.task },
    { key: 'cc', short: 'CC', title: 'Coherence & Cohesion (CC)', data: result.criteria.cc },
    { key: 'lr', short: 'LR', title: 'Lexical Resource (LR)', data: result.criteria.lr },
    { key: 'gra', short: 'GRA', title: 'Grammatical Range & Accuracy (GRA)', data: result.criteria.gra },
  ];

  const bandColor = (band: number) =>
    band >= CAMBRIDGE_TARGET_BAND
      ? 'bg-emerald-600'
      : band >= 6.0
        ? 'bg-amber-500'
        : 'bg-rose-500';

  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] shadow-sm overflow-hidden flex flex-col gap-5 animate-fade-in">
      {/* Overall Cambridge Score Header */}
      <div
        className={`p-5 text-white bg-gradient-to-r ${
          passed
            ? 'from-emerald-600 via-teal-600 to-emerald-500'
            : 'from-amber-600 via-orange-600 to-rose-500'
        }`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="w-20 h-20 rounded-2xl bg-white/20 backdrop-blur-sm border border-white/30 flex flex-col items-center justify-center flex-shrink-0">
            <span className="text-3xl font-black leading-none">{result.overallBand.toFixed(1)}</span>
            <span className="text-[10px] font-extrabold uppercase tracking-wider mt-1 opacity-90">
              OVERALL
            </span>
          </div>

          <div className="flex-1 min-w-0">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-black/15 text-[11px] font-black mb-1.5">
              {passed ? <Award size={12} /> : <Target size={12} />}
              {passed
                ? `ĐẠT MỤC TIÊU AIM ≥ ${CAMBRIDGE_TARGET_BAND.toFixed(1)} (CHUẨN CAMBRIDGE)`
                : `CHƯA ĐẠT MỤC TIÊU ${CAMBRIDGE_TARGET_BAND.toFixed(1)} — XEM 3 ƯU TIÊN SỬA NGAY`}
            </div>
            <h3 className="text-base sm:text-lg font-black">
              Kết quả chấm chuẩn Cambridge IELTS Band Descriptors
            </h3>
            <div className="grid grid-cols-4 gap-2 mt-2.5 max-w-md">
              {criteriaCards.map((c) => (
                <div
                  key={c.key}
                  className="rounded-xl bg-white/15 border border-white/20 px-2 py-1.5 text-center"
                >
                  <div className="text-[10px] font-bold opacity-85">{c.short}</div>
                  <div className="text-base font-black leading-tight">{c.data.band.toFixed(1)}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 sm:px-5 pb-5 flex flex-col gap-5">
        {/* Top 3 Priorities + Tutor Overall Feedback */}
        <div className="rounded-2xl border-2 border-indigo-200 bg-gradient-to-br from-indigo-50/80 via-white to-sky-50/70 p-4 flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center">
              <GraduationCap size={17} />
            </div>
            <div>
              <h4 className="text-sm font-black text-indigo-950">
                Nhận xét chung từ Gia sư IELTS Writing
              </h4>
              <p className="text-[11px] text-indigo-700 font-semibold">
                Chẩn đoán tổng thể bài viết &amp; lộ trình kéo điểm vững chắc lên ≥ 6.5 / 7.0
              </p>
            </div>
          </div>

          {result.tutorOverallFeedbackVi && (
            <div className="text-xs sm:text-[13px] text-gray-800 leading-relaxed whitespace-pre-line">
              {result.tutorOverallFeedbackVi}
            </div>
          )}

          {result.templateUsageFeedbackVi && (
            <div className="rounded-xl bg-white/90 border border-indigo-200/80 p-3 text-xs text-indigo-950 leading-relaxed">
              <span className="font-black text-indigo-800">Đánh giá cách bạn ráp ý &amp; từ vựng vào Template: </span>
              {result.templateUsageFeedbackVi}
            </div>
          )}

          {result.top3PrioritiesVi.length > 0 && (
            <div className="rounded-xl bg-amber-50/90 border border-amber-200 p-3 flex flex-col gap-1.5">
              <p className="text-[11px] font-black uppercase tracking-wider text-amber-800">
                3 ưu tiên quan trọng nhất cần sửa ngay:
              </p>
              <ol className="space-y-1 text-xs text-amber-950 list-decimal list-inside font-semibold">
                {result.top3PrioritiesVi.map((item, idx) => (
                  <li key={idx} className="leading-relaxed">
                    {item}
                  </li>
                ))}
              </ol>
            </div>
          )}
        </div>

        {/* 4 Criteria Breakdown (Cambridge Band Descriptors) */}
        <div className="flex flex-col gap-3">
          <h4 className="text-xs font-black uppercase tracking-wider text-gray-500">
            Phân tích chi tiết 4 tiêu chí theo Cambridge Band Descriptors
          </h4>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5">
            {criteriaCards.map((c) => {
              const isMet = c.data.band >= CAMBRIDGE_TARGET_BAND;
              return (
                <div
                  key={c.key}
                  className={`rounded-2xl border p-4 flex flex-col gap-2.5 ${
                    isMet
                      ? 'bg-emerald-50/35 border-emerald-200'
                      : 'bg-amber-50/40 border-amber-200'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs sm:text-sm font-black text-gray-900">{c.title}</span>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          isMet ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {isMet ? 'Đạt ≥ 6.5' : `Thiếu +${(CAMBRIDGE_TARGET_BAND - c.data.band).toFixed(1)}`}
                      </span>
                      <span
                        className={`text-sm font-black px-2.5 py-0.5 rounded-lg text-white ${bandColor(
                          c.data.band
                        )}`}
                      >
                        {c.data.band.toFixed(1)}
                      </span>
                    </div>
                  </div>

                  {c.data.cambridgeDescriptorMatchVi && (
                    <div className="rounded-lg bg-white/90 border border-gray-200/80 px-2.5 py-1.5 text-[11.5px] text-gray-700 leading-relaxed">
                      <span className="font-black text-indigo-800">Chuẩn Cambridge: </span>
                      {c.data.cambridgeDescriptorMatchVi}
                    </div>
                  )}

                  {c.data.reasonVi && (
                    <p className="text-xs text-gray-800 leading-relaxed">{c.data.reasonVi}</p>
                  )}

                  {c.data.strengthsVi.length > 0 && (
                    <div className="text-[11.5px] text-emerald-900">
                      <span className="font-extrabold">✓ Làm tốt: </span>
                      {c.data.strengthsVi.join(' · ')}
                    </div>
                  )}

                  {c.data.weaknessesVi.length > 0 && (
                    <div className="text-[11.5px] text-rose-800">
                      <span className="font-extrabold">✕ Cần khắc phục: </span>
                      {c.data.weaknessesVi.join(' · ')}
                    </div>
                  )}

                  {c.data.fixes.length > 0 && (
                    <div className="flex flex-col gap-2 pt-1">
                      <p className="text-[10px] font-black uppercase tracking-wider text-gray-500">
                        Sửa chi tiết nguyên câu:
                      </p>
                      {c.data.fixes.map((fix, fIdx) => {
                        const badge = ISSUE_BADGES[fix.issueType] || ISSUE_BADGES.replace;
                        return (
                          <div
                            key={fIdx}
                            className="rounded-xl bg-white border border-gray-200 p-2.5 text-[11.5px] flex flex-col gap-1.5"
                          >
                            <div className="flex items-center justify-between gap-1.5 flex-wrap">
                              <span className="font-extrabold text-gray-800">{fix.location}</span>
                              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${badge.cls}`}>
                                {badge.label}
                              </span>
                            </div>
                            {fix.originalSentence && (
                              <div className="rounded-lg bg-rose-50/90 border border-rose-200/80 px-2.5 py-1.5 text-rose-950">
                                <span className="block text-[9.5px] font-black uppercase text-rose-600 mb-0.5">
                                  Câu gốc của bạn
                                </span>
                                {fix.originalSentence}
                              </div>
                            )}
                            {fix.fixedSentence && (
                              <div className="rounded-lg bg-emerald-50/90 border border-emerald-200/80 px-2.5 py-1.5 text-emerald-950 font-semibold">
                                <span className="block text-[9.5px] font-black uppercase text-emerald-700 mb-0.5">
                                  Câu hoàn chỉnh sau khi sửa
                                </span>
                                {fix.fixedSentence}
                              </div>
                            )}
                            <p className="text-gray-700 leading-relaxed">{fix.explanationVi}</p>
                            {fix.suggestedPhrases && fix.suggestedPhrases.length > 0 && (
                              <div className="flex flex-wrap items-center gap-1">
                                <span className="text-[10px] font-bold text-gray-500">Cụm gợi ý:</span>
                                {fix.suggestedPhrases.map((sp, spIdx) => (
                                  <span
                                    key={spIdx}
                                    className="text-[10.5px] font-semibold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200"
                                  >
                                    {sp}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Advanced Grammar Used Well */}
        {result.advancedGrammarUsedWell.length > 0 && (
          <div className="rounded-xl border border-purple-200 bg-purple-50/60 p-3.5 text-xs">
            <p className="font-black text-purple-900 mb-1.5 flex items-center gap-1.5">
              <Sparkles size={13} /> Cấu trúc ngữ pháp nâng cao bạn đã áp dụng tốt trong bài:
            </p>
            <div className="flex flex-wrap gap-1.5">
              {result.advancedGrammarUsedWell.map((g, idx) => (
                <span
                  key={idx}
                  className="px-2.5 py-1 rounded-lg bg-white border border-purple-200 text-purple-950 font-semibold"
                >
                  ✓ {g}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Grammar Errors & Vocab Tips */}
        {(result.grammarErrors.length > 0 || result.vocabularyTips.length > 0) && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5">
            {result.grammarErrors.length > 0 && (
              <div className="rounded-2xl border border-rose-200/80 bg-rose-50/35 p-4 flex flex-col gap-2.5">
                <h4 className="text-xs font-black uppercase tracking-wider text-rose-800 flex items-center gap-1.5">
                  <Wrench size={13} /> Lỗi ngữ pháp cần sửa ({result.grammarErrors.length})
                </h4>
                {result.grammarErrors.map((err, idx) => (
                  <div
                    key={idx}
                    className="rounded-xl bg-white border border-rose-200/70 p-2.5 text-xs flex flex-col gap-1"
                  >
                    <span className="text-[10px] font-black uppercase text-rose-600">{err.errorType}</span>
                    <p className="text-rose-900 line-through decoration-rose-400">{err.originalSentence}</p>
                    <p className="text-emerald-900 font-bold">→ {err.fixedSentence}</p>
                    <p className="text-gray-600 text-[11px]">{err.explanationVi}</p>
                  </div>
                ))}
              </div>
            )}

            {result.vocabularyTips.length > 0 && (
              <div className="rounded-2xl border border-sky-200/80 bg-sky-50/35 p-4 flex flex-col gap-2.5">
                <h4 className="text-xs font-black uppercase tracking-wider text-sky-800 flex items-center gap-1.5">
                  <BookOpen size={13} /> Gợi ý nâng cấp từ vựng tự nhiên ({result.vocabularyTips.length})
                </h4>
                {result.vocabularyTips.map((tip, idx) => (
                  <div
                    key={idx}
                    className="rounded-xl bg-white border border-sky-200/70 p-2.5 text-xs flex flex-col gap-1"
                  >
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="px-2 py-0.5 rounded bg-gray-100 text-gray-700 font-semibold">
                        {tip.usedPhrase}
                      </span>
                      <span className="text-gray-400 font-bold">→</span>
                      <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-900 font-extrabold">
                        {tip.betterAlternative}
                      </span>
                    </div>
                    <p className="text-gray-600 text-[11px]">{tip.reasonVi}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Paragraph-by-paragraph review */}
        {result.paragraphReviews.length > 0 && (
          <div className="flex flex-col gap-2.5">
            <h4 className="text-xs font-black uppercase tracking-wider text-gray-500 flex items-center gap-1.5">
              <Layers size={13} /> Đánh giá từng đoạn văn
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
              {result.paragraphReviews.map((pr, idx) => (
                <div
                  key={idx}
                  className="rounded-xl border border-gray-200 bg-gray-50/70 p-3 text-xs flex flex-col gap-1.5"
                >
                  <p className="font-black text-gray-900">{pr.paragraphLabel}</p>
                  {pr.strengthsVi && (
                    <p className="text-emerald-800">
                      <strong>Điểm tốt:</strong> {pr.strengthsVi}
                    </p>
                  )}
                  {pr.weaknessesVi && (
                    <p className="text-rose-800">
                      <strong>Điểm yếu:</strong> {pr.weaknessesVi}
                    </p>
                  )}
                  {pr.howToImproveVi && (
                    <p className="text-indigo-900 bg-white border border-indigo-100 rounded-lg px-2.5 py-1.5">
                      <strong>Cách sửa:</strong> {pr.howToImproveVi}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Action footer */}
        {onEditAndResubmit && (
          <div className="flex items-center justify-between gap-3 pt-2 border-t border-[var(--border)] flex-wrap">
            <div className="text-xs text-gray-600 flex items-center gap-1.5">
              <CheckCircle2 size={14} className="text-emerald-600" />
              Bài chấm đã được tự động lưu vào tab <strong>Bài đã lưu</strong>.
            </div>
            <button
              type="button"
              onClick={onEditAndResubmit}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-extrabold bg-gray-900 text-white hover:bg-gray-800 transition-colors"
            >
              <RotateCcw size={13} /> Sửa lại bài &amp; Chấm lại để nâng Band
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
