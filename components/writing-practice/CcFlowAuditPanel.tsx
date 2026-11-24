'use client';

import { ArrowRight, CheckCircle2, GitMerge, XCircle } from 'lucide-react';
import type {
  CcChecklistItem,
  CcSentenceLinkAudit,
  CcTransitionStatus,
} from '@/lib/writing-practice-types';

interface CcFlowAuditPanelProps {
  ccChecklist?: CcChecklistItem[];
  ccFlowAudit?: CcSentenceLinkAudit[];
  ccBand: number;
  accent?: 'orange' | 'emerald' | 'indigo';
}

const STATUS_META: Record<
  CcTransitionStatus,
  { label: string; badgeClass: string; borderClass: string }
> = {
  seamless: {
    label: 'Mượt chuẩn 8.5+ (Well-managed / Effortless)',
    badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    borderClass: 'border-emerald-200/90 bg-emerald-50/35',
  },
  mechanical: {
    label: 'Lạm dụng từ nối máy móc (Vi phạm R4)',
    badgeClass: 'bg-amber-100 text-amber-800 border-amber-200',
    borderClass: 'border-amber-200/90 bg-amber-50/35',
  },
  abrupt: {
    label: 'Nhảy ý / khựng mạch Cũ → Mới (Vi phạm R2)',
    badgeClass: 'bg-rose-100 text-rose-800 border-rose-200',
    borderClass: 'border-rose-200/90 bg-rose-50/35',
  },
  unclear_ref: {
    label: 'Quy chiếu mơ hồ / lặp từ (Vi phạm R3)',
    badgeClass: 'bg-violet-100 text-violet-800 border-violet-200',
    borderClass: 'border-violet-200/90 bg-violet-50/35',
  },
};

export function CcFlowAuditPanel({
  ccChecklist,
  ccFlowAudit,
  ccBand,
  accent = 'emerald',
}: CcFlowAuditPanelProps) {
  const hasChecklist = Boolean(ccChecklist && ccChecklist.length > 0);
  const hasFlow = Boolean(ccFlowAudit && ccFlowAudit.length > 0);

  if (!hasChecklist && !hasFlow) return null;

  const isOrange = accent === 'orange';
  const metCcTarget = ccBand >= 8.5;
  const passedCount = hasChecklist ? ccChecklist!.filter((r) => r.passed).length : 0;

  return (
    <div
      className={`rounded-2xl border-2 p-4 sm:p-5 flex flex-col gap-4 ${
        metCcTarget
          ? 'bg-emerald-50/45 border-emerald-200'
          : isOrange
            ? 'bg-orange-50/45 border-orange-200/90'
            : 'bg-teal-50/45 border-teal-200/90'
      }`}
    >
      {/* Header + Deterministic Rule Formula */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <span
              className={`w-7 h-7 rounded-xl flex items-center justify-center text-white flex-shrink-0 ${
                metCcTarget ? 'bg-emerald-600' : isOrange ? 'bg-orange-500' : 'bg-teal-600'
              }`}
            >
              <GitMerge size={15} />
            </span>
            <div>
              <p
                className={`text-[10.5px] font-black uppercase tracking-wider ${
                  metCcTarget ? 'text-emerald-700' : isOrange ? 'text-orange-700' : 'text-teal-700'
                }`}
              >
                Quy luật cố định chấm Coherence &amp; Cohesion (Mục tiêu ≥ 8.5 CC)
              </p>
              <h4 className="text-sm font-extrabold text-gray-900">
                Bảng kiểm 5 quy luật IELTS Band Descriptors (May 2023) &amp; Soi từng chuyển câu
              </h4>
            </div>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            {hasChecklist && (
              <span
                className={`text-xs font-black px-2.5 py-1 rounded-full border ${
                  passedCount === 5
                    ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                    : 'bg-amber-100 text-amber-900 border-amber-200'
                }`}
              >
                Đạt {passedCount}/{ccChecklist!.length} quy luật
              </span>
            )}
            <span
              className={`text-xs font-black px-2.5 py-1 rounded-full ${
                metCcTarget ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'
              }`}
            >
              CC: {ccBand.toFixed(1)} / 8.5
            </span>
          </div>
        </div>

        <div className="rounded-xl bg-white/90 border border-gray-200/90 px-3 py-2 text-[11px] text-gray-600 flex flex-wrap items-center gap-x-3 gap-y-1">
          <span className="font-extrabold text-gray-800">Công thức chấm cố định:</span>
          <span className="font-semibold text-emerald-700">5/5 quy luật = Band 8.5 – 9.0 (Đạt)</span>
          <span>•</span>
          <span>4/5 quy luật = Band 7.5 – 8.0</span>
          <span>•</span>
          <span>3/5 quy luật = Band 7.0 – 7.5</span>
          <span>•</span>
          <span>≤ 2/5 quy luật = ≤ 6.5</span>
        </div>
      </div>

      {/* Deterministic 5-Rule Checklist */}
      {hasChecklist && (
        <div className="flex flex-col gap-2">
          {ccChecklist!.map((rule) => (
            <div
              key={rule.ruleId}
              className={`rounded-xl border p-3 flex flex-col gap-1.5 text-xs ${
                rule.passed
                  ? 'bg-white/95 border-emerald-200/90'
                  : 'bg-rose-50/70 border-rose-200'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-2 min-w-0">
                  {rule.passed ? (
                    <CheckCircle2 size={15} className="text-emerald-600 flex-shrink-0 mt-0.5" />
                  ) : (
                    <XCircle size={15} className="text-rose-600 flex-shrink-0 mt-0.5" />
                  )}
                  <span className="font-extrabold text-gray-900 leading-snug">
                    {rule.ruleTitle}
                  </span>
                </div>
                <span
                  className={`text-[10px] font-black px-2 py-0.5 rounded-full flex-shrink-0 ${
                    rule.passed
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-rose-600 text-white'
                  }`}
                >
                  {rule.passed ? 'ĐẠT' : 'VI PHẠM'}
                </span>
              </div>

              <p className="text-gray-700 leading-relaxed pl-5 sm:pl-6">{rule.evidence}</p>

              {!rule.passed && rule.fixAction && (
                <div className="ml-5 sm:ml-6 rounded-lg bg-white border border-rose-200/90 px-2.5 py-2 text-rose-950 leading-relaxed">
                  <span className="font-extrabold text-rose-700">Cách sửa để ĐẠT {rule.ruleId}: </span>
                  {rule.fixAction}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Transition-by-Transition Cards */}
      {hasFlow && (
        <div className="flex flex-col gap-2.5 pt-1">
          <p className="text-[11px] font-extrabold uppercase tracking-wider text-gray-600">
            Chi tiết từng điểm nối câu &amp; câu sửa hoàn chỉnh ({ccFlowAudit!.length} điểm nối)
          </p>
          {ccFlowAudit!.map((item, idx) => {
            const meta = STATUS_META[item.status] || STATUS_META.mechanical;
            const isSeamless = item.status === 'seamless';
            const showRewrite =
              Boolean(item.fixedFullSentence) &&
              (!isSeamless ||
                item.fixedFullSentence.trim().toLowerCase() !== item.currentSentence.trim().toLowerCase());

            return (
              <div
                key={idx}
                className={`rounded-xl border p-3.5 flex flex-col gap-2 bg-white/95 ${meta.borderClass}`}
              >
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <span className="inline-flex items-center gap-1.5 text-xs font-black text-gray-900">
                    {isSeamless && <CheckCircle2 size={13} className="text-emerald-600 flex-shrink-0" />}
                    <span>{item.transition}</span>
                  </span>
                  <span className={`text-[10.5px] font-bold px-2 py-0.5 rounded-full border ${meta.badgeClass}`}>
                    {meta.label}
                  </span>
                </div>

                {item.currentSentence && (
                  <div className="rounded-lg bg-gray-50 border border-gray-200/80 px-3 py-2 text-xs">
                    <p className="text-[10px] font-extrabold uppercase tracking-wider text-gray-500 mb-0.5">
                      Câu gốc của bạn
                    </p>
                    <p className="text-gray-800 leading-relaxed">{item.currentSentence}</p>
                  </div>
                )}

                <div className="text-xs text-gray-700 leading-relaxed flex flex-col gap-1">
                  {item.diagnosis && (
                    <p>
                      <span className="font-extrabold text-gray-900">Chẩn đoán CC: </span>
                      {item.diagnosis}
                    </p>
                  )}
                  {item.howToFix && (
                    <p>
                      <span className="font-extrabold text-gray-900">Cách nối lại: </span>
                      {item.howToFix}
                    </p>
                  )}
                </div>

                {showRewrite && (
                  <div className="rounded-lg bg-emerald-50/85 border border-emerald-200 px-3 py-2 text-xs">
                    <p className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-700 mb-0.5 flex items-center gap-1">
                      <ArrowRight size={11} /> Câu hoàn chỉnh sau khi sửa mạch CC 8.5+ (đúng ngữ pháp 100%)
                    </p>
                    <p className="text-emerald-950 font-semibold leading-relaxed">
                      {item.fixedFullSentence}
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
