'use client';

import type { CriterionFeedback, ActionMappingIssueType } from '@/lib/writing-practice-types';

export interface CriterionGridItem {
  key: 'task' | 'cc' | 'gra' | 'lr';
  short: string;
  title: string;
  target: number;
  data: CriterionFeedback;
}

interface CriteriaBreakdownGridProps {
  criteriaList: CriterionGridItem[];
  targetLabel: string;
  accent?: 'orange' | 'emerald' | 'indigo';
  heading?: string;
}

const ISSUE_TYPE_META: Record<
  ActionMappingIssueType,
  { label: string; badgeClass: string }
> = {
  add: {
    label: 'Cần bổ sung thêm',
    badgeClass: 'bg-sky-100 text-sky-800 border-sky-200',
  },
  replace: {
    label: 'Thay cho tự nhiên',
    badgeClass: 'bg-violet-100 text-violet-800 border-violet-200',
  },
  fix_error: {
    label: 'Sửa lỗi cụ thể',
    badgeClass: 'bg-rose-100 text-rose-800 border-rose-200',
  },
};

export function CriteriaBreakdownGrid({
  criteriaList,
  targetLabel,
  accent = 'emerald',
  heading,
}: CriteriaBreakdownGridProps) {
  const isOrange = accent === 'orange';

  return (
    <div>
      <h4 className="text-xs font-extrabold uppercase tracking-wider text-gray-500 mb-2.5">
        {heading || `Chấm & bóc tách siêu chi tiết 4 tiêu chí (${targetLabel})`}
      </h4>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
        {criteriaList.map((crit) => {
          const b = crit.data.band;
          const isMet = b >= crit.target;
          const gap = Math.max(0, crit.target - b);
          const isNear = !isMet && gap <= 0.5;
          const mappings = crit.data.mappings ?? [];
          const whatToStudy = crit.data.whatToStudy ?? [];

          return (
            <div
              key={crit.key}
              className={`rounded-xl p-3.5 border flex flex-col gap-2.5 ${isMet
                ? 'bg-emerald-50/45 border-emerald-200'
                : isNear
                  ? 'bg-amber-50/55 border-amber-200'
                  : 'bg-red-50/50 border-red-200'
                }`}
            >
              {/* Uniform criterion header */}
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-black text-gray-900">{crit.title}</span>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${isMet
                      ? 'bg-emerald-100 text-emerald-800'
                      : isNear
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-red-100 text-red-700'
                      }`}
                  >
                    {isMet
                      ? `Đạt ≥ ${crit.target.toFixed(1)}`
                      : `Còn thiếu +${gap.toFixed(1)} → ${crit.target.toFixed(1)}`}
                  </span>
                  <span
                    className={`text-sm font-black px-2 py-0.5 rounded-lg text-white ${isMet ? 'bg-emerald-600' : isNear ? 'bg-amber-500' : 'bg-red-500'
                      }`}
                  >
                    {b.toFixed(1)}
                  </span>
                </div>
              </div>

              {/* Diagnosis summary */}
              <p className="text-xs text-gray-800 leading-relaxed">{crit.data.reason}</p>

              {/* Mindset Shift Box (Band 6 -> Band 8/9) */}
              {crit.data.mindsetShift && (
                <div
                  className={`rounded-lg p-2.5 border text-[11.5px] leading-relaxed ${isOrange
                    ? 'bg-amber-50/85 border-amber-200/90 text-amber-950'
                    : 'bg-teal-50/75 border-teal-200/90 text-teal-950'
                    }`}
                >
                  <p
                    className={`text-[10px] font-black uppercase tracking-wider mb-0.5 ${isOrange ? 'text-amber-800' : 'text-teal-800'
                      }`}
                  >
                    Thay đổi tư duy (Band 6 → {crit.target.toFixed(1)})
                  </p>
                  <p>{crit.data.mindsetShift}</p>
                </div>
              )}

              {/* Uniform structured Action Mappings */}
              {mappings.length > 0 ? (
                <div className="flex flex-col gap-2">
                  <p
                    className={`text-[10px] font-extrabold uppercase tracking-wider ${isMet ? 'text-emerald-700' : isOrange ? 'text-orange-700' : 'text-gray-700'
                      }`}
                  >
                    {isMet ? 'Ánh xạ tối ưu thêm' : 'Cần thay đổi chi tiết tại từng vị trí'}
                  </p>
                  {mappings.map((m, idx) => {
                    const meta = ISSUE_TYPE_META[m.issueType] || ISSUE_TYPE_META.replace;
                    return (
                      <div
                        key={idx}
                        className="rounded-lg p-2.5 bg-white/95 border border-black/10 flex flex-col gap-1.5 text-[11.5px]"
                      >
                        <div className="flex items-center justify-between gap-1.5 flex-wrap">
                          <span className="font-extrabold text-gray-800">{m.targetLocation}</span>
                          <span
                            className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${meta.badgeClass}`}
                          >
                            {meta.label}
                          </span>
                        </div>

                        {(m.currentText || m.improvedExample) && (
                          <div className="flex flex-wrap items-center gap-1.5 text-[11px] bg-gray-50/90 rounded-md px-2 py-1.5 border border-gray-100">
                            {m.currentText && (
                              <span className="px-1.5 py-0.5 rounded bg-rose-50 text-rose-800 border border-rose-200/80 line-through">
                                {m.currentText}
                              </span>
                            )}
                            {m.currentText && m.improvedExample && (
                              <span className="text-gray-400 font-bold">→</span>
                            )}
                            {m.improvedExample && (
                              <span className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200/80 font-semibold">
                                {m.improvedExample}
                              </span>
                            )}
                          </div>
                        )}

                        <p className="text-gray-700 leading-relaxed">{m.actionGuide}</p>

                        {m.suggestedPhrases && m.suggestedPhrases.length > 0 && (
                          <div className="flex flex-wrap items-center gap-1 pt-0.5">
                            <span className="text-[10px] font-bold text-gray-500 mr-0.5">
                              Cụm gợi ý:
                            </span>
                            {m.suggestedPhrases.map((phrase, pi) => (
                              <span
                                key={pi}
                                className={`text-[10.5px] font-semibold px-1.5 py-0.5 rounded border ${isOrange
                                  ? 'bg-orange-50 text-orange-800 border-orange-200/80'
                                  : 'bg-emerald-50 text-emerald-800 border-emerald-200/80'
                                  }`}
                              >
                                {phrase}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <>
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
                    <div className="rounded-lg p-2.5 border bg-white/90 border-gray-200/80">
                      <p className="text-[10px] font-extrabold uppercase tracking-wider mb-1 text-gray-700">
                        {isMet ? 'Gợi ý nâng điểm thêm' : 'Cách sửa cụ thể'}
                      </p>
                      <ul className="space-y-1.5">
                        {crit.data.fixes.map((fix, idx) => (
                          <li key={idx} className="text-[11.5px] text-gray-800 leading-relaxed flex items-start gap-1.5">
                            <span className="font-bold flex-shrink-0 text-amber-600">→</span>
                            <span>{fix}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </>
              )}

              {/* What to Study Box */}
              {whatToStudy.length > 0 && (
                <div className="mt-auto rounded-lg p-2.5 bg-slate-50/90 border border-slate-200/90 text-[11.5px] text-slate-800">
                  <p className="text-[10px] font-black uppercase tracking-wider text-slate-600 mb-1">
                    Nên học thêm để vững band ({crit.short})
                  </p>
                  <ul className="space-y-1">
                    {whatToStudy.map((topic, ti) => (
                      <li key={ti} className="flex items-start gap-1.5 leading-relaxed">
                        <span className="text-slate-400 font-bold flex-shrink-0">•</span>
                        <span>{topic}</span>
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
  );
}
