'use client';

import { ArrowRight, CheckCircle2, GitMerge } from 'lucide-react';
import type { CcSentenceLinkAudit, CcTransitionStatus } from '@/lib/writing-practice-types';

interface CcFlowAuditPanelProps {
  ccFlowAudit?: CcSentenceLinkAudit[];
  ccBand: number;
  accent?: 'orange' | 'emerald' | 'indigo';
}

const STATUS_META: Record<
  CcTransitionStatus,
  { label: string; badgeClass: string; borderClass: string }
> = {
  seamless: {
    label: 'Mượt chuẩn 9.0 (Invisible)',
    badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    borderClass: 'border-emerald-200/90 bg-emerald-50/35',
  },
  mechanical: {
    label: 'Từ nối lộ / máy móc (Attracts attention)',
    badgeClass: 'bg-amber-100 text-amber-800 border-amber-200',
    borderClass: 'border-amber-200/90 bg-amber-50/35',
  },
  abrupt: {
    label: 'Khựng mạch / nhảy ý (Abrupt)',
    badgeClass: 'bg-rose-100 text-rose-800 border-rose-200',
    borderClass: 'border-rose-200/90 bg-rose-50/35',
  },
  unclear_ref: {
    label: 'Quy chiếu mơ hồ (Unclear ref)',
    badgeClass: 'bg-violet-100 text-violet-800 border-violet-200',
    borderClass: 'border-violet-200/90 bg-violet-50/35',
  },
};

export function CcFlowAuditPanel({
  ccFlowAudit,
  ccBand,
  accent = 'emerald',
}: CcFlowAuditPanelProps) {
  if (!ccFlowAudit || ccFlowAudit.length === 0) return null;

  const isOrange = accent === 'orange';
  const metCc9 = ccBand >= 9.0;

  return (
    <div
      className={`rounded-2xl border-2 p-4 sm:p-5 flex flex-col gap-3.5 ${
        metCc9
          ? 'bg-emerald-50/45 border-emerald-200'
          : isOrange
            ? 'bg-orange-50/45 border-orange-200/90'
            : 'bg-teal-50/45 border-teal-200/90'
      }`}
    >
      {/* Header + 4 Official Band 9 CC Pillars */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <span
              className={`w-7 h-7 rounded-xl flex items-center justify-center text-white flex-shrink-0 ${
                metCc9 ? 'bg-emerald-600' : isOrange ? 'bg-orange-500' : 'bg-teal-600'
              }`}
            >
              <GitMerge size={15} />
            </span>
            <div>
              <p
                className={`text-[10.5px] font-black uppercase tracking-wider ${
                  metCc9 ? 'text-emerald-700' : isOrange ? 'text-orange-700' : 'text-teal-700'
                }`}
              >
                Tâm điểm Coherence &amp; Cohesion (Mục tiêu 9.0 CC)
              </p>
              <h4 className="text-sm font-extrabold text-gray-900">
                Soi mạch nối từng chuyển câu &amp; sửa trọn vẹn cả câu ({ccFlowAudit.length} điểm nối)
              </h4>
            </div>
          </div>

          <span
            className={`text-xs font-black px-2.5 py-1 rounded-full ${
              metCc9 ? 'bg-emerald-600 text-white' : 'bg-white border border-gray-200 text-gray-800'
            }`}
          >
            CC hiện tại: {ccBand.toFixed(1)} / 9.0
          </span>
        </div>

        <div className="flex flex-wrap gap-1.5 text-[10.5px] font-semibold">
          {[
            'Followed effortlessly',
            'Cohesion rarely attracts attention',
            'Minimal lapses',
            'Skilful paragraphing',
          ].map((pillar) => (
            <span
              key={pillar}
              className="px-2 py-0.5 rounded-full bg-white/90 border border-gray-200/90 text-gray-600"
            >
              ✓ {pillar}
            </span>
          ))}
        </div>
      </div>

      {/* Transition-by-Transition Cards */}
      <div className="flex flex-col gap-2.5">
        {ccFlowAudit.map((item, idx) => {
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
                    <span className="font-extrabold text-gray-900">Chẩn đoán CC 9.0: </span>
                    {item.diagnosis}
                  </p>
                )}
                {item.howToFix && (
                  <p>
                    <span className="font-extrabold text-gray-900">Cách nối lại cho mượt: </span>
                    {item.howToFix}
                  </p>
                )}
              </div>

              {showRewrite && (
                <div className="rounded-lg bg-emerald-50/85 border border-emerald-200 px-3 py-2 text-xs">
                  <p className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-700 mb-0.5 flex items-center gap-1">
                    <ArrowRight size={11} /> Câu hoàn chỉnh sau khi sửa mạch CC 9.0 (đúng ngữ pháp 100%)
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
    </div>
  );
}
