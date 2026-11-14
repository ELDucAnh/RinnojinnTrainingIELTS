'use client';

import { useState } from 'react';
import { Lightbulb, Link2, ChevronDown, ChevronUp, ListChecks } from 'lucide-react';
import type { OutlineBodyItem } from '@/lib/writing-practice-types';

interface BodyOutlineCardProps {
  currentOutline: OutlineBodyItem;
  fullOutline: OutlineBodyItem[];
  currentBodyIndex: number;
  totalBodies: number;
  accent?: 'indigo' | 'emerald' | 'orange';
}

export function BodyOutlineCard({
  currentOutline,
  fullOutline,
  currentBodyIndex,
  totalBodies,
  accent = 'indigo',
}: BodyOutlineCardProps) {
  const [showFullPlan, setShowFullPlan] = useState(false);

  const badgeBg =
    accent === 'emerald'
      ? 'bg-emerald-600 text-white'
      : accent === 'orange'
        ? 'bg-orange-500 text-white'
        : 'bg-indigo-600 text-white';

  const cardAccent =
    accent === 'emerald'
      ? 'border-emerald-200 bg-gradient-to-br from-emerald-50/80 via-teal-50/50 to-white'
      : accent === 'orange'
        ? 'border-orange-200/80 bg-gradient-to-br from-orange-50/75 via-amber-50/35 to-white'
        : 'border-indigo-200 bg-gradient-to-br from-indigo-50/80 via-purple-50/40 to-white';

  const stepNumStyle =
    accent === 'emerald'
      ? 'bg-emerald-50 text-emerald-700'
      : accent === 'orange'
        ? 'bg-orange-50 text-orange-700 border border-orange-100'
        : 'bg-indigo-50 text-indigo-700';

  const linkBoxStyle =
    accent === 'orange'
      ? 'bg-amber-50/60 border-amber-200/70 text-amber-950'
      : 'bg-blue-50/70 border-blue-100 text-blue-900';

  const activeOverviewRowStyle =
    accent === 'emerald'
      ? 'bg-emerald-50/70 border-emerald-200'
      : accent === 'orange'
        ? 'bg-orange-50/80 border-orange-200'
        : 'bg-indigo-50/70 border-indigo-200';

  const vocabChipStyle =
    accent === 'emerald'
      ? 'bg-emerald-50/70 border-emerald-200/80 text-emerald-950'
      : accent === 'orange'
        ? 'bg-orange-50/75 border-orange-200/80 text-orange-950'
        : 'bg-indigo-50/70 border-indigo-200/80 text-indigo-950';

  const vocabPhraseStyle =
    accent === 'emerald'
      ? 'text-emerald-800'
      : accent === 'orange'
        ? 'text-orange-800'
        : 'text-indigo-800';

  const vocabSuggestions = currentOutline.vocabSuggestions ?? [];
  const grammarSuggestions = currentOutline.grammarSuggestions ?? [];
  const hasLanguageSuggestions = vocabSuggestions.length > 0 || grammarSuggestions.length > 0;

  const showMinimalIcons = accent === 'orange';

  return (
    <div className={`rounded-2xl border p-4 sm:p-5 shadow-sm flex flex-col gap-3.5 ${cardAccent}`}>
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-start gap-2.5">
          <span className={`px-2.5 py-1 rounded-xl text-xs font-black flex-shrink-0 shadow-sm ${badgeBg}`}>
            Body {currentBodyIndex + 1}/{totalBodies}
          </span>
          <div>
            <p className="text-xs font-extrabold uppercase tracking-wider text-gray-400">
              Dàn ý gợi ý bằng tiếng Việt (tự viết & dịch sang tiếng Anh)
            </p>
            <h3 className="text-sm sm:text-base font-extrabold text-gray-900 mt-0.5">
              {currentOutline.role}
            </h3>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setShowFullPlan((v) => !v)}
          className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-xl bg-white border border-gray-200 text-gray-600 hover:text-gray-900 hover:border-gray-300 transition-colors"
        >
          {!showMinimalIcons && <ListChecks size={13} />}
          {showFullPlan ? 'Ẩn dàn ý cả bài' : `Xem dàn ý ${totalBodies} body`}
          {showFullPlan ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
        </button>
      </div>

      {/* Hướng dẫn triển khai bằng tiếng Việt */}
      <div className="bg-white/95 rounded-xl border border-gray-200/80 p-3.5 sm:p-4 flex flex-col gap-2.5">
        <div className="flex items-center gap-1.5 text-xs font-bold text-amber-700">
          {!showMinimalIcons && <Lightbulb size={14} className="text-amber-500 flex-shrink-0" />}
          <span>Ý chính chuẩn Band 8.5+ cho Body {currentBodyIndex + 1}:</span>
        </div>
        <ul className="space-y-1.5">
          {currentOutline.viGuide.map((item, idx) => (
            <li key={idx} className="flex items-start gap-2.5 text-sm text-gray-800 leading-relaxed">
              <span className={`w-5 h-5 rounded-full font-bold text-[11px] flex items-center justify-center flex-shrink-0 mt-0.5 ${stepNumStyle}`}>
                {idx + 1}
              </span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Gợi ý liên kết */}
      <div className={`flex items-start gap-2 border rounded-xl px-3.5 py-2.5 text-xs ${linkBoxStyle}`}>
        {!showMinimalIcons && <Link2 size={14} className="text-blue-600 flex-shrink-0 mt-0.5" />}
        <div>
          <span className="font-bold">Liên kết mạch bài (CC): </span>
          <span>{currentOutline.linkingTip}</span>
        </div>
      </div>

      {/* Gợi ý chi tiết ở dưới cùng: Cụm Vocab Band 7.0+ (kèm nghĩa tiếng Việt) & Cụm ngữ pháp nên dùng */}
      {hasLanguageSuggestions ? (
        <div className="bg-white/95 rounded-xl border border-gray-200/80 p-3.5 sm:p-4 flex flex-col gap-3">
          <p className="text-[11px] font-extrabold uppercase tracking-wider text-gray-500">
            Gợi ý chi tiết — Collocation B1–B2 (Band 7.0) &amp; Ngữ pháp cho Body {currentBodyIndex + 1}
          </p>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {vocabSuggestions.length > 0 && (
              <div className="flex flex-col gap-1.5">
                <span className="text-xs font-bold text-gray-700">
                  Collocation B1–B2 Band 7.0 (kèm nghĩa tiếng Việt)
                </span>
                <div className="flex flex-col gap-1.5">
                  {vocabSuggestions.map((v, i) => (
                    <div
                      key={i}
                      className={`text-xs rounded-lg px-2.5 py-2 border leading-relaxed ${vocabChipStyle}`}
                    >
                      <span className={`font-bold ${vocabPhraseStyle}`}>{v.phrase}</span>
                      {v.meaning && (
                        <span className="text-gray-600 font-normal"> — {v.meaning}</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {grammarSuggestions.length > 0 && (
              <div className="flex flex-col gap-1.5">
                <span className="text-xs font-bold text-gray-700">
                  Cụm / cấu trúc ngữ pháp nên sử dụng
                </span>
                <div className="flex flex-col gap-1.5">
                  {grammarSuggestions.map((g, i) => (
                    <div
                      key={i}
                      className="text-xs rounded-lg px-2.5 py-2 bg-stone-50/90 border border-stone-200/90 text-gray-800 leading-relaxed"
                    >
                      <p className="font-semibold text-gray-900">{g.structure}</p>
                      {g.usage && (
                        <p className="text-[11px] text-gray-600 mt-0.5">{g.usage}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        currentOutline.keyPoints.length > 0 && (
          <div className="flex flex-wrap gap-1.5 items-center">
            <span className="text-[11px] font-bold text-gray-500 mr-1">Gợi ý chi tiết:</span>
            {currentOutline.keyPoints.map((kp, i) => (
              <span
                key={i}
                className="text-xs font-medium bg-white border border-gray-200/90 text-gray-700 px-2.5 py-1 rounded-lg shadow-xs"
              >
                {kp}
              </span>
            ))}
          </div>
        )
      )}

      {/* Toàn bộ dàn ý tham khảo */}
      {showFullPlan && (
        <div className="bg-white rounded-xl border border-gray-200 p-3.5 flex flex-col gap-2.5 animate-fade-in">
          <p className="text-xs font-extrabold uppercase tracking-wider text-gray-500">
            Tổng quan dàn bài {totalBodies} Body
          </p>
          <div className="space-y-2">
            {fullOutline.map((o) => (
              <div
                key={o.bodyIndex}
                className={`p-2.5 rounded-lg border text-xs ${o.bodyIndex === currentBodyIndex
                  ? activeOverviewRowStyle
                  : 'bg-gray-50/70 border-gray-100'
                  }`}
              >
                <p className="font-bold text-gray-800 mb-1">
                  Body {o.bodyIndex + 1}: {o.role}
                </p>
                <ul className="list-disc pl-4 space-y-0.5 text-gray-600">
                  {o.viGuide.map((g, gi) => (
                    <li key={gi}>{g}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

