'use client';

import { useState } from 'react';
import { Lightbulb, Link2, ChevronDown, ChevronUp, ListChecks, Target } from 'lucide-react';
import type { OutlineBodyItem } from '@/lib/writing-practice-types';

interface BodyOutlineCardProps {
  currentOutline: OutlineBodyItem;
  fullOutline: OutlineBodyItem[];
  currentBodyIndex: number;
  totalBodies: number;
  accent?: 'indigo' | 'emerald' | 'orange';
  taskType?: 'task1' | 'task2';
}

export function BodyOutlineCard({
  currentOutline,
  fullOutline,
  currentBodyIndex,
  totalBodies,
  accent = 'indigo',
  taskType,
}: BodyOutlineCardProps) {
  const [showFullPlan, setShowFullPlan] = useState(false);

  const resolvedTaskType = taskType ?? (totalBodies === 4 ? 'task1' : 'task2');
  const taskShort = resolvedTaskType === 'task1' ? 'TA' : 'TR';

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
  const ideaGuides = currentOutline.ideaGuides ?? [];
  const bandStrategy = currentOutline.bandStrategy;
  const hasIdeaGuides = ideaGuides.length > 0;
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
              Dàn ý &amp; Chiến lược Band 8.0 ({taskShort} 8.0 · CC 9.0 · GRA 8.0 · LR 7.0)
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

      {/* Yêu cầu bắt buộc cho Body này để đạt 8 TA/TR · 9 CC · 8 GRA · 7->8 LR */}
      {bandStrategy && (
        <div className="bg-white/95 rounded-xl border border-gray-200/90 p-3.5 sm:p-4 flex flex-col gap-2.5">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-1.5 text-xs font-extrabold text-gray-900">
              {!showMinimalIcons && (
                <Target
                  size={14}
                  className={accent === 'emerald' ? 'text-emerald-600' : 'text-indigo-600'}
                />
              )}
              <span>
                Lưu ý bắt buộc cho Body {currentBodyIndex + 1} để đạt chuẩn 8 {taskShort} · 9 CC · 8 GRA · 7→8 LR
              </span>
            </div>
            <span className="text-[10.5px] font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
              Đọc kỹ trước khi viết
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
            {bandStrategy.cc9Note && (
              <div
                className={`rounded-xl p-3 border text-xs leading-relaxed ${accent === 'orange'
                  ? 'bg-orange-50/75 border-orange-200/90 text-orange-950'
                  : 'bg-emerald-50/75 border-emerald-200/90 text-emerald-950'
                  }`}
              >
                <div className="flex items-center justify-between gap-1.5 mb-1">
                  <span
                    className={`font-black text-[11px] uppercase tracking-wider ${accent === 'orange' ? 'text-orange-800' : 'text-emerald-800'
                      }`}
                  >
                    Đạt CC 9.0 (Liên kết tàng hình)
                  </span>
                  <span
                    className={`text-[10px] font-black px-1.5 py-0.5 rounded text-white ${accent === 'orange' ? 'bg-orange-500' : 'bg-emerald-600'
                      }`}
                  >
                    9.0 CC
                  </span>
                </div>
                <p>{bandStrategy.cc9Note}</p>
              </div>
            )}

            {bandStrategy.lrNote && (
              <div className="rounded-xl p-3 border bg-sky-50/70 border-sky-200/80 text-sky-950 text-xs leading-relaxed">
                <div className="flex items-center justify-between gap-1.5 mb-1">
                  <span className="font-black text-[11px] uppercase tracking-wider text-sky-800">
                    Từ vựng chuẩn LR 7.0 → 8.0
                  </span>
                  <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-sky-600 text-white">
                    7→8 LR
                  </span>
                </div>
                <p>{bandStrategy.lrNote}</p>
              </div>
            )}

            {bandStrategy.task8Note && (
              <div className="rounded-xl p-3 border bg-amber-50/65 border-amber-200/80 text-amber-950 text-xs leading-relaxed">
                <div className="flex items-center justify-between gap-1.5 mb-1">
                  <span className="font-black text-[11px] uppercase tracking-wider text-amber-800">
                    Đạt {taskShort} 8.0 (Độ sâu &amp; Bám đề)
                  </span>
                  <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-amber-600 text-white">
                    8.0 {taskShort}
                  </span>
                </div>
                <p>{bandStrategy.task8Note}</p>
              </div>
            )}

            {bandStrategy.gra8Note && (
              <div className="rounded-xl p-3 border bg-violet-50/65 border-violet-200/80 text-violet-950 text-xs leading-relaxed">
                <div className="flex items-center justify-between gap-1.5 mb-1">
                  <span className="font-black text-[11px] uppercase tracking-wider text-violet-800">
                    Đạt GRA 8.0 (Câu phức &amp; Sạch lỗi)
                  </span>
                  <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-violet-600 text-white">
                    8.0 GRA
                  </span>
                </div>
                <p>{bandStrategy.gra8Note}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Dàn ý & Gợi ý Vocab / Ngữ pháp ánh xạ theo từng Idea */}
      {hasIdeaGuides ? (
        <div className="bg-white/95 rounded-xl border border-gray-200/80 p-3.5 sm:p-4 flex flex-col gap-3">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-1.5 text-xs font-bold text-amber-700">
              {!showMinimalIcons && <Lightbulb size={14} className="text-amber-500 flex-shrink-0" />}
              <span>
                Lộ trình từng Idea + Collocation (LR 7→8) &amp; Ngữ pháp (GRA 8.0) cho Body {currentBodyIndex + 1}:
              </span>
            </div>
            <span className="text-[11px] font-semibold text-gray-400">
              {ideaGuides.length} ý · {vocabSuggestions.length} cụm từ · {grammarSuggestions.length} cấu trúc
            </span>
          </div>

          <div className="flex flex-col gap-3">
            {ideaGuides.map((guide, idx) => (
              <div
                key={idx}
                className="rounded-xl border border-gray-200/90 bg-gray-50/45 p-3.5 flex flex-col gap-2.5"
              >
                <div className="flex items-start gap-2.5">
                  <span
                    className={`w-6 h-6 rounded-full font-black text-[11px] flex items-center justify-center flex-shrink-0 mt-0.5 ${stepNumStyle}`}
                  >
                    {idx + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    {guide.ideaLabel && (
                      <p className="text-[11px] font-extrabold uppercase tracking-wider text-gray-500">
                        {guide.ideaLabel}
                      </p>
                    )}
                    <p className="text-sm font-medium text-gray-900 leading-relaxed mt-0.5">
                      {guide.ideaVi}
                    </p>
                  </div>
                </div>

                {(guide.vocabPhrases.length > 0 || guide.grammarPatterns.length > 0) && (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-2.5 pl-0 sm:pl-8">
                    {guide.vocabPhrases.length > 0 && (
                      <div className="flex flex-col gap-1.5">
                        <span className="text-[11px] font-extrabold text-gray-600">
                          Collocation tự nhiên cho ý này ({guide.vocabPhrases.length}):
                        </span>
                        <div className="flex flex-col gap-1">
                          {guide.vocabPhrases.map((v, vi) => (
                            <div
                              key={vi}
                              className={`text-xs rounded-lg px-2.5 py-1.5 border leading-relaxed ${vocabChipStyle}`}
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

                    {guide.grammarPatterns.length > 0 && (
                      <div className="flex flex-col gap-1.5">
                        <span className="text-[11px] font-extrabold text-gray-600">
                          Cấu trúc GRA 8.0 ghép vào ý này ({guide.grammarPatterns.length}):
                        </span>
                        <div className="flex flex-col gap-1">
                          {guide.grammarPatterns.map((g, gi) => (
                            <div
                              key={gi}
                              className="text-xs rounded-lg px-2.5 py-1.5 bg-white border border-stone-200/90 text-gray-800 leading-relaxed"
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
                )}
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="bg-white/95 rounded-xl border border-gray-200/80 p-3.5 sm:p-4 flex flex-col gap-2.5">
          <div className="flex items-center gap-1.5 text-xs font-bold text-amber-700">
            {!showMinimalIcons && <Lightbulb size={14} className="text-amber-500 flex-shrink-0" />}
            <span>Ý chính chuẩn Band 8.0+ cho Body {currentBodyIndex + 1}:</span>
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
      )}

      {/* Gợi ý liên kết */}
      <div className={`flex items-start gap-2 border rounded-xl px-3.5 py-2.5 text-xs ${linkBoxStyle}`}>
        {!showMinimalIcons && <Link2 size={14} className="text-blue-600 flex-shrink-0 mt-0.5" />}
        <div>
          <span className="font-bold">Cầu nối mạch bài (CC 9.0): </span>
          <span>{currentOutline.linkingTip}</span>
        </div>
      </div>

      {/* Fallback dưới cùng khi outline cũ chỉ có danh sách phẳng không kèm ideaGuides */}
      {!hasIdeaGuides &&
        (hasLanguageSuggestions ? (
          <div className="bg-white/95 rounded-xl border border-gray-200/80 p-3.5 sm:p-4 flex flex-col gap-3">
            <p className="text-[11px] font-extrabold uppercase tracking-wider text-gray-500">
              Gợi ý chi tiết — Collocation (LR 7→8) &amp; Ngữ pháp (GRA 8.0) cho Body {currentBodyIndex + 1}
            </p>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              {vocabSuggestions.length > 0 && (
                <div className="flex flex-col gap-1.5">
                  <span className="text-xs font-bold text-gray-700">
                    Collocation tự nhiên (kèm nghĩa tiếng Việt)
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
                    Cụm / cấu trúc ngữ pháp GRA 8.0 nên sử dụng
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
        ))}

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
