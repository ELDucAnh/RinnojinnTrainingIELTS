'use client';

import { useState } from 'react';
import {
  Lightbulb,
  Link2,
  ChevronDown,
  ChevronUp,
  ListChecks,
  Target,
  ArrowRight,
  GitMerge,
} from 'lucide-react';
import type { OutlineBodyItem, SentenceComplexityType } from '@/lib/writing-practice-types';

interface BodyOutlineCardProps {
  currentOutline: OutlineBodyItem;
  fullOutline: OutlineBodyItem[];
  currentBodyIndex: number;
  totalBodies: number;
  accent?: 'indigo' | 'emerald' | 'orange';
  taskType?: 'task1' | 'task2';
}

const SENTENCE_TYPE_STYLES: Record<SentenceComplexityType, { badge: string; short: string }> = {
  simple: {
    badge: 'bg-sky-100 text-sky-800 border-sky-200',
    short: 'Câu đơn',
  },
  compound: {
    badge: 'bg-teal-100 text-teal-800 border-teal-200',
    short: 'Câu ghép',
  },
  complex: {
    badge: 'bg-violet-100 text-violet-800 border-violet-200',
    short: 'Câu phức',
  },
  'compound-complex': {
    badge: 'bg-fuchsia-100 text-fuchsia-800 border-fuchsia-200',
    short: 'Câu phức-ghép',
  },
};

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
      ? 'bg-emerald-600 text-white'
      : accent === 'orange'
        ? 'bg-orange-500 text-white'
        : 'bg-indigo-600 text-white';

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
  const targetSentenceCount = currentOutline.targetSentenceCount || (hasIdeaGuides ? ideaGuides.length : undefined);

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
              Dàn ý từng câu &amp; 5 quy luật CC 8.5 ({taskShort} 8.0 · CC 8.5 · GRA 8.0 · LR 7.5)
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

      {/* Kiến trúc số câu & nhịp Đơn / Phức của Body */}
      {(targetSentenceCount || currentOutline.sentenceMixSummary) && (
        <div className="bg-white/95 rounded-xl border border-gray-200/90 p-3.5 flex flex-col gap-2">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <span className="text-xs font-extrabold text-gray-900">
              Kiến trúc chuẩn Body {currentBodyIndex + 1}: cần viết{' '}
              <span className={accent === 'orange' ? 'text-orange-600' : 'text-emerald-700'}>
                {targetSentenceCount} câu
              </span>{' '}
              đạt đủ 5/5 quy luật CC 8.5
            </span>
            <span className="text-[11px] font-semibold text-gray-500">
              Phối hợp Câu đơn (sắc gọn) + Câu phức (GRA 8.0)
            </span>
          </div>

          {hasIdeaGuides ? (
            <div className="flex flex-wrap items-center gap-1.5">
              {ideaGuides.map((g, idx) => {
                const stStyle = g.sentenceType ? SENTENCE_TYPE_STYLES[g.sentenceType] : null;
                return (
                  <div key={idx} className="inline-flex items-center gap-1.5">
                    <span
                      className={`text-[11px] font-bold px-2.5 py-1 rounded-lg border ${stStyle ? stStyle.badge : 'bg-gray-100 text-gray-700 border-gray-200'
                        }`}
                    >
                      Câu {g.sentenceNumber || idx + 1}: {stStyle ? stStyle.short : 'Linh hoạt'}
                    </span>
                    {idx < ideaGuides.length - 1 && (
                      <ArrowRight size={12} className="text-gray-400 flex-shrink-0" />
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            currentOutline.sentenceMixSummary && (
              <p className="text-xs font-semibold text-gray-700">{currentOutline.sentenceMixSummary}</p>
            )
          )}
        </div>
      )}

      {/* Yêu cầu bắt buộc cho Body này để đạt 8.0 TA/TR · 8.5 CC · 8.0 GRA · 7.5 LR */}
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
                Lưu ý bắt buộc cho Body {currentBodyIndex + 1} để đạt chuẩn 8.0 {taskShort} · 8.5 CC · 8.0 GRA · 7.5 LR
              </span>
            </div>
            <span className="text-[10.5px] font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
              5/5 quy luật CC = 8.5+
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
                    Đạt CC 8.5 (5 quy luật cố định R1–R5)
                  </span>
                  <span
                    className={`text-[10px] font-black px-1.5 py-0.5 rounded text-white ${accent === 'orange' ? 'bg-orange-500' : 'bg-emerald-600'
                      }`}
                  >
                    8.5 CC
                  </span>
                </div>
                <p>{bandStrategy.cc9Note}</p>
              </div>
            )}

            {bandStrategy.lrNote && (
              <div className="rounded-xl p-3 border bg-sky-50/70 border-sky-200/80 text-sky-950 text-xs leading-relaxed">
                <div className="flex items-center justify-between gap-1.5 mb-1">
                  <span className="font-black text-[11px] uppercase tracking-wider text-sky-800">
                    Từ vựng LR 7.5 (B2 + Collocation sát đề)
                  </span>
                  <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-sky-600 text-white">
                    7.5 LR
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

      {/* Lộ trình TỪNG CÂU (Sentence-by-Sentence Blueprint + Interlocking CC 9.0) */}
      {hasIdeaGuides ? (
        <div className="bg-white/95 rounded-xl border border-gray-200/80 p-3.5 sm:p-4 flex flex-col gap-3">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-1.5 text-xs font-bold text-amber-700">
              {!showMinimalIcons && <Lightbulb size={14} className="text-amber-500 flex-shrink-0" />}
              <span>
                Bản thiết kế từng câu cho Body {currentBodyIndex + 1} (Loại câu · Nội dung · Mạch CC 8.5 · Từ vựng LR 7.5 &amp; GRA 8.0):
              </span>
            </div>
            <span className="text-[11px] font-semibold text-gray-400">
              {ideaGuides.length} câu · {vocabSuggestions.length} cụm từ · {grammarSuggestions.length} cấu trúc
            </span>
          </div>

          <div className="flex flex-col gap-3">
            {ideaGuides.map((guide, idx) => {
              const sentNum = guide.sentenceNumber || idx + 1;
              const typeMeta = guide.sentenceType ? SENTENCE_TYPE_STYLES[guide.sentenceType] : null;
              const typeLabel = guide.sentenceTypeLabel || typeMeta?.short;

              return (
                <div
                  key={idx}
                  className="rounded-xl border border-gray-200/90 bg-gray-50/45 p-3.5 flex flex-col gap-2.5"
                >
                  {/* Sentence header: Number + Role + Simple/Complex badge */}
                  <div className="flex items-start gap-2.5">
                    <span
                      className={`px-2 py-0.5 rounded-lg font-black text-[11px] flex items-center justify-center flex-shrink-0 mt-0.5 ${stepNumStyle}`}
                    >
                      Câu {sentNum}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        {guide.ideaLabel && (
                          <p className="text-[11px] font-extrabold uppercase tracking-wider text-gray-600">
                            {guide.ideaLabel}
                          </p>
                        )}
                        {typeLabel && (
                          <span
                            className={`text-[10.5px] font-black px-2 py-0.5 rounded-full border ${typeMeta
                              ? typeMeta.badge
                              : 'bg-gray-100 text-gray-700 border-gray-200'
                              }`}
                          >
                            {typeLabel}
                          </span>
                        )}
                      </div>
                      <p className="text-sm font-medium text-gray-900 leading-relaxed mt-1">
                        {guide.ideaVi}
                      </p>
                    </div>
                  </div>

                  {/* Interlocking CC 9.0 box for THIS exact sentence */}
                  {(guide.ccLinkFromPrev || (guide.ccLinkPhrases && guide.ccLinkPhrases.length > 0) || guide.ccAvoid) && (
                    <div
                      className={`rounded-xl border p-3 text-xs flex flex-col gap-1.5 ${accent === 'orange'
                        ? 'bg-orange-50/70 border-orange-200/80 text-orange-950'
                        : 'bg-teal-50/70 border-teal-200/80 text-teal-950'
                        }`}
                    >
                      <div className="flex items-center gap-1.5 font-extrabold text-[11px] uppercase tracking-wider">
                        <GitMerge
                          size={12}
                          className={accent === 'orange' ? 'text-orange-600' : 'text-teal-700'}
                        />
                        <span className={accent === 'orange' ? 'text-orange-800' : 'text-teal-800'}>
                          Cách nối CC 8.5 cho Câu {sentNum}{' '}
                          {sentNum === 1 ? '(Nối từ Body trước / mở đoạn)' : `(Khớp nối từ Câu ${sentNum - 1} → Câu ${sentNum})`}
                        </span>
                      </div>

                      {guide.ccLinkFromPrev && (
                        <p className="leading-relaxed">{guide.ccLinkFromPrev}</p>
                      )}

                      {guide.ccLinkPhrases && guide.ccLinkPhrases.length > 0 && (
                        <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                          <span className="text-[10.5px] font-bold text-gray-600">
                            Từ nối / quy chiếu nên dùng:
                          </span>
                          {guide.ccLinkPhrases.map((phrase, pi) => (
                            <span
                              key={pi}
                              className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-white border border-black/10 text-gray-900"
                            >
                              {phrase}
                            </span>
                          ))}
                        </div>
                      )}

                      {guide.ccAvoid && (
                        <p className="text-[11px] font-semibold text-rose-700 bg-rose-50/90 border border-rose-200/70 rounded-md px-2 py-1 mt-0.5">
                          ⚠ Tránh: {guide.ccAvoid}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Vocab B1-B2 & Grammar Frame matching Sentence Type */}
                  {(guide.vocabPhrases.length > 0 || guide.grammarPatterns.length > 0) && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-2.5">
                      {guide.vocabPhrases.length > 0 && (
                        <div className="flex flex-col gap-1.5">
                          <span className="text-[11px] font-extrabold text-gray-600">
                            Collocation LR 7.5 cho Câu {sentNum} ({guide.vocabPhrases.length}):
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
                            Khung ngữ pháp khớp {typeMeta ? typeMeta.short : 'câu này'} ({guide.grammarPatterns.length}):
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
              );
            })}
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
          <span className="font-bold">Cầu nối tổng thể Body {currentBodyIndex + 1} (CC 8.5): </span>
          <span>{currentOutline.linkingTip}</span>
        </div>
      </div>

      {/* Fallback dưới cùng khi outline cũ chỉ có danh sách phẳng không kèm ideaGuides */}
      {!hasIdeaGuides &&
        (hasLanguageSuggestions ? (
          <div className="bg-white/95 rounded-xl border border-gray-200/80 p-3.5 sm:p-4 flex flex-col gap-3">
            <p className="text-[11px] font-extrabold uppercase tracking-wider text-gray-500">
              Gợi ý chi tiết — Collocation chuẩn LR 7.5 &amp; Ngữ pháp GRA 8.0 cho Body {currentBodyIndex + 1}
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
                <div className="flex items-center justify-between gap-2 flex-wrap mb-1">
                  <p className="font-bold text-gray-800">
                    Body {o.bodyIndex + 1}: {o.role}
                  </p>
                  {o.targetSentenceCount && (
                    <span className="text-[10.5px] font-bold px-2 py-0.5 rounded-full bg-white border border-gray-200 text-gray-600">
                      {o.targetSentenceCount} câu
                    </span>
                  )}
                </div>
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
