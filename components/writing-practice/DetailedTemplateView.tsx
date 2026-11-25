'use client';

import { useState, type ReactNode } from 'react';
import {
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Copy,
  Check,
  Edit3,
  GitBranch,
  Layers,
  Link2,
  Repeat,
  Sparkles,
  Wrench,
} from 'lucide-react';
import type {
  DetailedEssayTemplate,
  GuidedTaskType,
  OutlineEvaluationResult,
} from '@/lib/writing-guided-types';

interface DetailedTemplateViewProps {
  taskType: GuidedTaskType;
  evaluation: OutlineEvaluationResult;
  template: DetailedEssayTemplate;
  onConfirmTemplate?: () => void;
  onEditOutline?: () => void;
  /** Khi đang ở màn hình viết bài (cột trái tham chiếu gọn hơn, ẩn nút Confirm) */
  compactReferenceMode?: boolean;
}

/**
 * Highlight tất cả các ô trống `[SLOT ...]` trong khung câu template thành chip nổi bật để học viên dễ nhìn & ráp từ vựng.
 */
function renderHighlightedSkeleton(text: string, isTask1: boolean): ReactNode {
  const parts = text.split(/(\[[^\]]+\])/g);
  return parts.map((part, idx) => {
    if (part.startsWith('[') && part.endsWith(']')) {
      return (
        <span
          key={idx}
          className={`inline-block mx-0.5 my-0.5 px-1.5 py-0.5 rounded-md font-bold text-[12px] border ${
            isTask1
              ? 'bg-orange-100/90 text-orange-950 border-orange-300'
              : 'bg-emerald-100/90 text-emerald-950 border-emerald-300'
          }`}
        >
          {part}
        </span>
      );
    }
    return <span key={idx}>{part}</span>;
  });
}

export function DetailedTemplateView({
  taskType,
  evaluation,
  template,
  onConfirmTemplate,
  onEditOutline,
  compactReferenceMode = false,
}: DetailedTemplateViewProps) {
  const isTask1 = taskType === 'task1';
  const [viewMode, setViewMode] = useState<'detailed' | 'assembled'>(
    compactReferenceMode ? 'assembled' : 'detailed'
  );
  const [openParagraphs, setOpenParagraphs] = useState<Record<number, boolean>>(() => {
    const map: Record<number, boolean> = {};
    template.paragraphs.forEach((p) => {
      map[p.paragraphIndex] = true;
    });
    return map;
  });
  const [copiedAll, setCopiedAll] = useState(false);

  const toggleParagraph = (idx: number) => {
    setOpenParagraphs((prev) => ({ ...prev, [idx]: !prev[idx] }));
  };

  const handleCopyAssembled = async () => {
    const text = template.paragraphs
      .map((p) => `### ${p.userHeading}\n${p.assembledParagraphTemplate}`)
      .join('\n\n');
    try {
      await navigator.clipboard.writeText(text);
      setCopiedAll(true);
      setTimeout(() => setCopiedAll(false), 1800);
    } catch {
      // ignore clipboard errors
    }
  };

  return (
    <div className="flex flex-col gap-4 animate-fade-in">
      {/* Header Banner */}
      <div
        className={`rounded-2xl p-4 sm:p-5 text-white shadow-sm bg-gradient-to-r ${
          isTask1
            ? 'from-orange-500 via-amber-500 to-orange-600'
            : 'from-emerald-600 via-teal-600 to-emerald-700'
        }`}
      >
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/20 text-[11px] font-black uppercase tracking-wider mb-1.5">
              <Sparkles size={12} />
              Dàn ý đạt {isTask1 ? 'TA' : 'TR'} {evaluation.estimatedTaskBand.toFixed(1)} (≥ 7.0) · Template GRA &amp; CC &gt; 7.0
            </div>
            <h2 className="text-base sm:text-lg font-black leading-snug">
              Template Siêu Chi Tiết Nguyên Bài ({template.paragraphs.length} đoạn · {template.targetWordCount})
            </h2>
            <p className="text-xs sm:text-sm text-white/95 mt-1 leading-relaxed">
              {template.overallStrategyVi}
            </p>
          </div>
          <div className="flex flex-col items-end gap-1 text-[11px] font-bold bg-black/15 rounded-xl px-3 py-2 flex-shrink-0">
            <span>✓ Conjunction chuẩn Band 8.0</span>
            <span>✓ Ngữ pháp nâng cao GRA &gt; 7.0</span>
            <span>✓ Khung B1–B2, không lạm dụng C2</span>
          </div>
        </div>
      </div>

      {/* Mode switcher & quick actions */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="inline-flex rounded-xl p-1 bg-[var(--card)] border border-[var(--border)] shadow-sm">
          <button
            type="button"
            onClick={() => setViewMode('detailed')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              viewMode === 'detailed'
                ? isTask1
                  ? 'bg-orange-500 text-white shadow-sm'
                  : 'bg-emerald-600 text-white shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Chi tiết từng câu (Đầy đủ)
          </button>
          <button
            type="button"
            onClick={() => setViewMode('assembled')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              viewMode === 'assembled'
                ? isTask1
                  ? 'bg-orange-500 text-white shadow-sm'
                  : 'bg-emerald-600 text-white shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Khung ghép nguyên bài (Gọn để ráp viết)
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleCopyAssembled}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-[var(--card)] border border-[var(--border)] text-gray-700 hover:bg-gray-50 transition-colors"
          >
            {copiedAll ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
            {copiedAll ? 'Đã copy khung bài' : 'Copy khung ghép'}
          </button>
          {onEditOutline && !compactReferenceMode && (
            <button
              type="button"
              onClick={onEditOutline}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-[var(--card)] border border-[var(--border)] text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <Edit3 size={13} /> Sửa lại dàn ý
            </button>
          )}
        </div>
      </div>

      {/* ASSEMBLED COMPACT VIEW (khung ghép nguyên bài để dễ tra từ & viết) */}
      {viewMode === 'assembled' ? (
        <div className="flex flex-col gap-3">
          {template.paragraphs.map((p) => (
            <div
              key={p.paragraphIndex}
              className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 flex flex-col gap-2.5 shadow-sm"
            >
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2">
                  <span
                    className={`w-6 h-6 rounded-lg text-xs font-black text-white flex items-center justify-center ${
                      isTask1 ? 'bg-orange-500' : 'bg-emerald-600'
                    }`}
                  >
                    {p.paragraphIndex + 1}
                  </span>
                  <h3 className="text-sm font-black text-gray-900">{p.userHeading}</h3>
                </div>
                <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-gray-100 text-gray-700">
                  {p.targetSentenceCount} câu · {p.targetWordRange}
                </span>
              </div>

              <div className="rounded-xl bg-gray-50 border border-gray-200/80 px-3 py-2 text-xs text-gray-600">
                <span className="font-extrabold text-gray-800">Ý tiếng Việt của bạn: </span>
                {p.userOutlineVi}
              </div>

              <div className="rounded-xl bg-white border border-gray-200 p-3.5 text-sm leading-relaxed text-gray-900 font-medium">
                {renderHighlightedSkeleton(p.assembledParagraphTemplate, isTask1)}
              </div>

              {p.sentences.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-0.5">
                  {p.sentences.map((s) => (
                    <span
                      key={s.sentenceNumber}
                      className="text-[10.5px] font-bold px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-800 border border-indigo-200"
                    >
                      C{s.sentenceNumber}: {s.conjunctionBand8.usedConnector} · {s.advancedGrammar.structureName}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        /* ULTRA-DETAILED SENTENCE-BY-SENTENCE VIEW */
        <div className="flex flex-col gap-4">
          {template.paragraphs.map((p) => {
            const isOpen = openParagraphs[p.paragraphIndex] ?? true;
            return (
              <div
                key={p.paragraphIndex}
                className="rounded-2xl border border-[var(--border)] bg-[var(--card)] shadow-sm overflow-hidden"
              >
                {/* Paragraph Accordion Header */}
                <button
                  type="button"
                  onClick={() => toggleParagraph(p.paragraphIndex)}
                  className="w-full px-4 py-3.5 bg-gray-50/90 hover:bg-gray-100/70 transition-colors flex items-center justify-between gap-3 text-left border-b border-[var(--border)]"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span
                      className={`w-7 h-7 rounded-xl text-xs font-black text-white flex items-center justify-center flex-shrink-0 ${
                        isTask1 ? 'bg-orange-500' : 'bg-emerald-600'
                      }`}
                    >
                      Đ{p.paragraphIndex + 1}
                    </span>
                    <div className="min-w-0">
                      <h3 className="text-sm font-black text-gray-900 truncate">{p.userHeading}</h3>
                      <p className="text-xs text-gray-500 truncate">{p.paragraphRoleVi}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="hidden sm:inline-block text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-white border border-gray-200 text-gray-700">
                      {p.targetSentenceCount} câu · {p.targetWordRange}
                    </span>
                    {isOpen ? (
                      <ChevronUp size={16} className="text-gray-500" />
                    ) : (
                      <ChevronDown size={16} className="text-gray-500" />
                    )}
                  </div>
                </button>

                {isOpen && (
                  <div className="p-4 flex flex-col gap-4">
                    {/* User outline & CC paragraph bridge */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                      <div className="rounded-xl bg-gray-50 border border-gray-200/80 p-3 text-xs leading-relaxed">
                        <p className="text-[10px] font-black uppercase tracking-wider text-gray-500 mb-1">
                          Ý tiếng Việt bạn đã viết
                        </p>
                        <p className="text-gray-800 whitespace-pre-line">{p.userOutlineVi}</p>
                      </div>
                      {p.ccParagraphBridgeVi && (
                        <div className="rounded-xl bg-indigo-50/75 border border-indigo-200 p-3 text-xs leading-relaxed">
                          <p className="text-[10px] font-black uppercase tracking-wider text-indigo-700 mb-1 flex items-center gap-1">
                            <Link2 size={11} /> Mạch chuyển đoạn chuẩn Band 8.0 (CC &gt; 7.0)
                          </p>
                          <p className="text-indigo-950">{p.ccParagraphBridgeVi}</p>
                        </div>
                      )}
                    </div>

                    {/* Sentence-by-sentence breakdown */}
                    <div className="flex flex-col gap-3">
                      {p.sentences.map((s) => (
                        <div
                          key={s.sentenceNumber}
                          className="rounded-2xl border border-gray-200 bg-white p-3.5 sm:p-4 flex flex-col gap-3 shadow-xs"
                        >
                          {/* Sentence Title */}
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <span
                              className={`text-xs font-black px-2.5 py-0.5 rounded-lg text-white ${
                                isTask1 ? 'bg-orange-500' : 'bg-emerald-600'
                              }`}
                            >
                              Câu {s.sentenceNumber}
                            </span>
                            <span className="text-xs font-bold text-gray-700 flex-1 min-w-[200px]">
                              {s.purposeVi}
                            </span>
                          </div>

                          {/* Highlighted Template Skeleton */}
                          <div
                            className={`rounded-xl p-3 border text-sm leading-relaxed text-gray-900 font-medium ${
                              isTask1
                                ? 'bg-orange-50/40 border-orange-200/90'
                                : 'bg-emerald-50/40 border-emerald-200/90'
                            }`}
                          >
                            <p className="text-[10px] font-black uppercase tracking-wider text-gray-500 mb-1">
                              Khung Template để ráp ý &amp; từ vựng của bạn:
                            </p>
                            <div>{renderHighlightedSkeleton(s.templateSkeleton, isTask1)}</div>
                          </div>

                          {/* Slots breakdown */}
                          {s.slots.length > 0 && (
                            <div className="flex flex-col gap-2">
                              <p className="text-[10.5px] font-black uppercase tracking-wider text-gray-500 flex items-center gap-1">
                                <Wrench size={11} /> Hướng dẫn chi tiết ráp từng ô [SLOT] &amp; gợi ý thay thế:
                              </p>
                              <div className="grid grid-cols-1 gap-2">
                                {s.slots.map((slot, sIdx) => (
                                  <div
                                    key={sIdx}
                                    className="rounded-xl border border-gray-200/90 bg-gray-50/70 p-2.5 text-xs flex flex-col gap-1.5"
                                  >
                                    <div className="flex items-center justify-between gap-2 flex-wrap">
                                      <span
                                        className={`font-black px-2 py-0.5 rounded-md border ${
                                          isTask1
                                            ? 'bg-orange-100 text-orange-950 border-orange-300'
                                            : 'bg-emerald-100 text-emerald-950 border-emerald-300'
                                        }`}
                                      >
                                        {slot.slotLabel}
                                      </span>
                                      <span className="text-[10.5px] font-bold px-2 py-0.5 rounded-md bg-sky-100 text-sky-900 border border-sky-200">
                                        Từ loại / Dạng: {slot.grammaticalForm}
                                      </span>
                                    </div>
                                    <p className="text-gray-800 leading-relaxed">
                                      <strong className="text-gray-900">Ráp ý gì:</strong> {slot.whatToPutVi}
                                    </p>
                                    {slot.plainKeywordsHint.length > 0 && (
                                      <div className="flex items-center gap-1.5 flex-wrap">
                                        <span className="text-[11px] font-bold text-gray-500">
                                          Hướng từ khóa B1–B2 tự tra:
                                        </span>
                                        {slot.plainKeywordsHint.map((kw, kIdx) => (
                                          <span
                                            key={kIdx}
                                            className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-white border border-gray-200 text-gray-800"
                                          >
                                            {kw}
                                          </span>
                                        ))}
                                      </div>
                                    )}
                                    {slot.replaceableWith && (
                                      <p className="text-[11.5px] text-violet-900 bg-violet-50/80 border border-violet-200/80 rounded-lg px-2.5 py-1.5">
                                        <strong className="text-violet-800">Có thể thay thế bằng:</strong>{' '}
                                        {slot.replaceableWith}
                                      </p>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Band 8 Conjunction + Advanced Grammar Cards */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                            {/* Conjunction Band 8 */}
                            <div className="rounded-xl border border-indigo-200 bg-indigo-50/60 p-3 text-xs flex flex-col gap-1.5">
                              <p className="text-[10px] font-black uppercase tracking-wider text-indigo-700 flex items-center gap-1">
                                <GitBranch size={11} /> Conjunction / Liên kết Band 8.0 (CC &gt; 7)
                              </p>
                              <p className="font-black text-indigo-950">
                                {s.conjunctionBand8.usedConnector}
                              </p>
                              {s.conjunctionBand8.whyBand8Vi && (
                                <p className="text-indigo-900 leading-relaxed">
                                  {s.conjunctionBand8.whyBand8Vi}
                                </p>
                              )}
                              {s.conjunctionBand8.alternatives.length > 0 && (
                                <div className="flex flex-wrap items-center gap-1 pt-0.5">
                                  <span className="text-[10.5px] font-bold text-indigo-700">Thay bằng:</span>
                                  {s.conjunctionBand8.alternatives.map((alt, aIdx) => (
                                    <span
                                      key={aIdx}
                                      className="text-[10.5px] font-semibold px-1.5 py-0.5 rounded bg-white border border-indigo-200 text-indigo-900"
                                    >
                                      {alt}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>

                            {/* Advanced Grammar GRA > 7 */}
                            <div className="rounded-xl border border-purple-200 bg-purple-50/60 p-3 text-xs flex flex-col gap-1.5">
                              <p className="text-[10px] font-black uppercase tracking-wider text-purple-700 flex items-center gap-1">
                                <Layers size={11} /> Ngữ pháp nâng cao (GRA &gt; 7.0)
                              </p>
                              <p className="font-black text-purple-950">
                                {s.advancedGrammar.structureName}
                              </p>
                              {s.advancedGrammar.formula && (
                                <p className="font-mono text-[11px] bg-white/90 border border-purple-200 rounded-lg px-2 py-1 text-purple-950">
                                  {s.advancedGrammar.formula}
                                </p>
                              )}
                              {s.advancedGrammar.accuracyWatchoutVi && (
                                <p className="text-rose-800 leading-relaxed">
                                  <strong>⚠ Tránh sai:</strong> {s.advancedGrammar.accuracyWatchoutVi}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Assembled paragraph preview */}
                    <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50/80 p-3 text-xs leading-relaxed">
                      <p className="text-[10px] font-black uppercase tracking-wider text-gray-500 mb-1">
                        Khung ghép liền mạch nguyên {p.userHeading}:
                      </p>
                      <div className="text-gray-900 text-[13px] font-medium">
                        {renderHighlightedSkeleton(p.assembledParagraphTemplate, isTask1)}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Substitution Matrix across paragraphs */}
      {template.substitutionMatrix.length > 0 && (
        <div className="rounded-2xl border border-violet-200 bg-violet-50/55 p-4 flex flex-col gap-2.5">
          <h3 className="text-xs font-black uppercase tracking-wider text-violet-800 flex items-center gap-1.5">
            <Repeat size={14} /> Bảng gợi ý thay thế Conjunction &amp; Khung câu giữa các đoạn (Tránh lặp)
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
            {template.substitutionMatrix.map((sub, idx) => (
              <div
                key={idx}
                className="rounded-xl bg-white border border-violet-200/80 p-3 text-xs flex flex-col gap-1.5"
              >
                <span className="font-extrabold text-violet-900">{sub.locationVi}</span>
                <p className="text-gray-700">
                  <span className="font-bold text-gray-500">Đã dùng: </span>
                  <code className="px-1.5 py-0.5 rounded bg-gray-100 text-gray-900 font-semibold">
                    {sub.originalPattern}
                  </code>
                </p>
                <div className="flex flex-wrap items-center gap-1">
                  <span className="font-bold text-violet-700">Đổi sang:</span>
                  {sub.alternatives.map((alt, aIdx) => (
                    <span
                      key={aIdx}
                      className="px-2 py-0.5 rounded-md bg-violet-50 border border-violet-200 text-violet-950 font-semibold"
                    >
                      {alt}
                    </span>
                  ))}
                </div>
                {sub.whyReplaceVi && <p className="text-[11px] text-gray-600">{sub.whyReplaceVi}</p>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Confirm CTA (only in Step 2 review screen) */}
      {onConfirmTemplate && !compactReferenceMode && (
        <div className="sticky bottom-3 z-20 rounded-2xl border border-[var(--border)] bg-[var(--card)]/95 backdrop-blur-md p-3.5 shadow-lg flex items-center justify-between gap-3 flex-wrap">
          <div className="text-xs text-gray-600">
            <p className="font-extrabold text-gray-900 text-sm">
              Đã nắm rõ khung Template chi tiết?
            </p>
            <p>
              Bấm xác nhận để sang khung tự tìm từ vựng &amp; viết bài hoàn chỉnh song song với Template này.
            </p>
          </div>
          <button
            type="button"
            onClick={onConfirmTemplate}
            className={`inline-flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-black text-white shadow-md transition-all hover:opacity-95 active:scale-[0.99] ${
              isTask1
                ? 'bg-gradient-to-r from-orange-500 to-amber-500'
                : 'bg-gradient-to-r from-emerald-600 to-teal-600'
            }`}
          >
            <CheckCircle2 size={17} />
            Xác nhận Template &amp; Bắt đầu viết bài
          </button>
        </div>
      )}
    </div>
  );
}
