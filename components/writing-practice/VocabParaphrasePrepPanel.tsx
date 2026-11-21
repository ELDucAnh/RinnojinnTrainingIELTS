'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  BookMarked,
  Check,
  ChevronDown,
  ChevronUp,
  Loader2,
  RefreshCw,
  Repeat,
  Table2,
} from 'lucide-react';
import type { WritingVocabPrep } from '@/lib/writing-practice-types';

interface VocabParaphrasePrepPanelProps {
  taskType: 'task1' | 'task2';
  vocabPrep: WritingVocabPrep;
  mode: 'prep' | 'reference';
  accent?: 'orange' | 'emerald';
  isConfirming?: boolean;
  confirmStatus?: string;
  isRegenerating?: boolean;
  onConfirm?: (curated: WritingVocabPrep) => void;
  onRegenerate?: () => void;
}

export function VocabParaphrasePrepPanel({
  taskType,
  vocabPrep,
  mode,
  accent = 'emerald',
  isConfirming = false,
  confirmStatus,
  isRegenerating = false,
  onConfirm,
  onRegenerate,
}: VocabParaphrasePrepPanelProps) {
  const isOrange = accent === 'orange';
  const totalBodies = taskType === 'task1' ? 4 : 5;

  // In prep mode, learners can click to uncheck any phrase they feel is off-topic or unnecessary
  const [excludedAlts, setExcludedAlts] = useState<Set<string>>(new Set());
  const [excludedCollocs, setExcludedCollocs] = useState<Set<string>>(new Set());
  const [expandedRef, setExpandedRef] = useState(false);

  // Reset selections whenever a brand-new vocabPrep object arrives
  useEffect(() => {
    setExcludedAlts(new Set());
    setExcludedCollocs(new Set());
  }, [vocabPrep]);

  const toggleAlt = (rowIdx: number, altIdx: number) => {
    if (mode !== 'prep' || isConfirming || isRegenerating) return;
    const key = `${rowIdx}:${altIdx}`;
    setExcludedAlts((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const toggleColloc = (groupIdx: number, itemIdx: number) => {
    if (mode !== 'prep' || isConfirming || isRegenerating) return;
    const key = `${groupIdx}:${itemIdx}`;
    setExcludedCollocs((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const stats = useMemo(() => {
    let totalAlts = 0;
    let keptAlts = 0;
    vocabPrep.paraphraseTable.forEach((row, rIdx) => {
      row.alternatives.forEach((_, aIdx) => {
        totalAlts += 1;
        if (!excludedAlts.has(`${rIdx}:${aIdx}`)) keptAlts += 1;
      });
    });

    let totalCollocs = 0;
    let keptCollocs = 0;
    vocabPrep.collocationGroups.forEach((g, gIdx) => {
      g.items.forEach((_, iIdx) => {
        totalCollocs += 1;
        if (!excludedCollocs.has(`${gIdx}:${iIdx}`)) keptCollocs += 1;
      });
    });

    return { totalAlts, keptAlts, totalCollocs, keptCollocs };
  }, [vocabPrep, excludedAlts, excludedCollocs]);

  const handleConfirmClick = () => {
    if (!onConfirm) return;
    const curatedTable = vocabPrep.paraphraseTable
      .map((row, rIdx) => ({
        ...row,
        alternatives: row.alternatives.filter((_, aIdx) => !excludedAlts.has(`${rIdx}:${aIdx}`)),
      }))
      .filter((row) => row.alternatives.length > 0);

    const curatedGroups = vocabPrep.collocationGroups
      .map((g, gIdx) => ({
        ...g,
        items: g.items.filter((_, iIdx) => !excludedCollocs.has(`${gIdx}:${iIdx}`)),
      }))
      .filter((g) => g.items.length > 0);

    onConfirm({
      ...vocabPrep,
      paraphraseTable: curatedTable.length > 0 ? curatedTable : vocabPrep.paraphraseTable,
      collocationGroups: curatedGroups.length > 0 ? curatedGroups : vocabPrep.collocationGroups,
    });
  };

  const contentBody = (
    <div className="flex flex-col gap-4">
      {/* Section 1: Paraphrase Table */}
      {vocabPrep.paraphraseTable.length > 0 && (
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wider text-gray-700">
              <Table2 size={14} className={isOrange ? 'text-orange-500' : 'text-emerald-600'} />
              <span>Bảng Paraphrase từ khóa chống lặp từ ({vocabPrep.paraphraseTable.length} mục)</span>
            </div>
            {mode === 'prep' && (
              <span className="text-[11px] text-gray-400">
                Bấm vào cụm bất kỳ để bỏ chọn nếu không muốn dùng
              </span>
            )}
          </div>

          <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr
                  className={`border-b border-gray-200 text-[11px] font-extrabold uppercase tracking-wider ${
                    isOrange ? 'bg-orange-50/80 text-orange-900' : 'bg-emerald-50/80 text-emerald-900'
                  }`}
                >
                  <th className="py-2.5 px-3 w-[22%] min-w-[140px]">Từ / cụm gốc</th>
                  <th className="py-2.5 px-3 w-[18%] min-w-[115px]">Nghĩa</th>
                  <th className="py-2.5 px-3 w-[40%] min-w-[240px]">
                    Paraphrase B1–B2 xoay vòng giữa {totalBodies} Body
                  </th>
                  <th className="py-2.5 px-3 w-[20%] min-w-[140px]">Lưu ý dùng sát đề</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {vocabPrep.paraphraseTable.map((row, rIdx) => (
                  <tr key={rIdx} className="hover:bg-gray-50/60 align-top">
                    <td className="py-2.5 px-3 font-bold text-gray-900">{row.originalTerm}</td>
                    <td className="py-2.5 px-3 text-gray-600">{row.meaningVi}</td>
                    <td className="py-2.5 px-3">
                      <div className="flex flex-wrap gap-1.5">
                        {row.alternatives.map((alt, aIdx) => {
                          const isExcluded = excludedAlts.has(`${rIdx}:${aIdx}`);
                          if (mode === 'prep') {
                            return (
                              <button
                                key={aIdx}
                                type="button"
                                onClick={() => toggleAlt(rIdx, aIdx)}
                                disabled={isConfirming || isRegenerating}
                                title={isExcluded ? 'Bấm để chọn lại' : 'Bấm để bỏ chọn cụm này'}
                                className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg border text-[11.5px] font-semibold transition-all ${
                                  isExcluded
                                    ? 'bg-gray-50 border-gray-200 text-gray-400 line-through opacity-65'
                                    : isOrange
                                      ? 'bg-orange-50/80 border-orange-200 text-orange-900 hover:bg-orange-100/80'
                                      : 'bg-emerald-50/80 border-emerald-200 text-emerald-900 hover:bg-emerald-100/80'
                                }`}
                              >
                                {!isExcluded && (
                                  <Check
                                    size={11}
                                    className={isOrange ? 'text-orange-600' : 'text-emerald-600'}
                                  />
                                )}
                                <span>{alt}</span>
                              </button>
                            );
                          }
                          return (
                            <span
                              key={aIdx}
                              className={`inline-flex items-center px-2 py-0.5 rounded-md border text-[11.5px] font-semibold ${
                                isOrange
                                  ? 'bg-orange-50/75 border-orange-200/80 text-orange-900'
                                  : 'bg-emerald-50/75 border-emerald-200/80 text-emerald-900'
                              }`}
                            >
                              {alt}
                            </span>
                          );
                        })}
                      </div>
                    </td>
                    <td className="py-2.5 px-3 text-[11px] text-gray-500 leading-relaxed">
                      {row.usageNote || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Section 2: Grouped B1-B2 Collocations */}
      {vocabPrep.collocationGroups.length > 0 && (
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wider text-gray-700">
            <BookMarked size={14} className={isOrange ? 'text-orange-500' : 'text-emerald-600'} />
            <span>
              Kho Từ vựng &amp; Cụm Collocation B1–B2 sát đề ({stats.keptCollocs}/{stats.totalCollocs} cụm)
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {vocabPrep.collocationGroups.map((group, gIdx) => (
              <div
                key={gIdx}
                className="rounded-xl border border-gray-200 bg-white p-3.5 flex flex-col gap-2"
              >
                <p
                  className={`text-xs font-extrabold ${
                    isOrange ? 'text-orange-800' : 'text-emerald-800'
                  }`}
                >
                  {group.groupTitle}
                </p>
                <div className="flex flex-col gap-1.5">
                  {group.items.map((item, iIdx) => {
                    const isExcluded = excludedCollocs.has(`${gIdx}:${iIdx}`);
                    const inner = (
                      <>
                        <div className="flex items-start justify-between gap-2">
                          <span
                            className={`font-bold text-xs ${
                              isExcluded
                                ? 'text-gray-400 line-through'
                                : isOrange
                                  ? 'text-orange-900'
                                  : 'text-emerald-900'
                            }`}
                          >
                            {item.phrase}
                          </span>
                          {mode === 'prep' && !isExcluded && (
                            <Check
                              size={12}
                              className={`flex-shrink-0 mt-0.5 ${
                                isOrange ? 'text-orange-500' : 'text-emerald-600'
                              }`}
                            />
                          )}
                        </div>
                        {item.meaningVi && (
                          <p className="text-[11.5px] text-gray-700 mt-0.5">{item.meaningVi}</p>
                        )}
                        {item.exampleUsage && (
                          <p className="text-[11px] text-gray-500 mt-0.5 italic">{item.exampleUsage}</p>
                        )}
                      </>
                    );

                    if (mode === 'prep') {
                      return (
                        <button
                          key={iIdx}
                          type="button"
                          onClick={() => toggleColloc(gIdx, iIdx)}
                          disabled={isConfirming || isRegenerating}
                          className={`text-left rounded-lg px-2.5 py-2 border transition-all ${
                            isExcluded
                              ? 'bg-gray-50 border-gray-200 opacity-60'
                              : isOrange
                                ? 'bg-orange-50/45 border-orange-200/70 hover:bg-orange-50'
                                : 'bg-emerald-50/45 border-emerald-200/70 hover:bg-emerald-50'
                          }`}
                        >
                          {inner}
                        </button>
                      );
                    }

                    return (
                      <div
                        key={iIdx}
                        className={`rounded-lg px-2.5 py-1.5 border ${
                          isOrange
                            ? 'bg-orange-50/40 border-orange-100'
                            : 'bg-emerald-50/40 border-emerald-100'
                        }`}
                      >
                        {inner}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Anti-repetition note */}
      {vocabPrep.antiRepetitionTip && (
        <div
          className={`flex items-start gap-2 rounded-xl px-3.5 py-2.5 border text-xs leading-relaxed ${
            isOrange
              ? 'bg-amber-50/75 border-amber-200/80 text-amber-950'
              : 'bg-teal-50/75 border-teal-200/80 text-teal-950'
          }`}
        >
          <Repeat
            size={14}
            className={`flex-shrink-0 mt-0.5 ${isOrange ? 'text-amber-700' : 'text-teal-700'}`}
          />
          <div>
            <span className="font-extrabold">Mẹo xoay vòng chống lặp từ (LR 7.0 &amp; CC 9.0): </span>
            <span>{vocabPrep.antiRepetitionTip}</span>
          </div>
        </div>
      )}
    </div>
  );

  // ── REFERENCE MODE (Compact collapsible bar during outline & writing) ──
  if (mode === 'reference') {
    return (
      <div
        className={`bg-[var(--card)] rounded-2xl border shadow-sm overflow-hidden ${
          isOrange ? 'border-orange-200/80' : 'border-emerald-200/80'
        }`}
      >
        <button
          type="button"
          onClick={() => setExpandedRef((v) => !v)}
          className={`w-full px-4 py-3 flex items-center justify-between gap-2 text-left transition-colors ${
            isOrange ? 'bg-orange-50/60 hover:bg-orange-50' : 'bg-emerald-50/60 hover:bg-emerald-50'
          }`}
        >
          <div className="flex items-center gap-2 min-w-0 flex-wrap">
            <Table2 size={15} className={isOrange ? 'text-orange-600' : 'text-emerald-600'} />
            <span
              className={`text-xs font-extrabold uppercase tracking-wider ${
                isOrange ? 'text-orange-900' : 'text-emerald-900'
              }`}
            >
              Bảng Paraphrase &amp; Kho Collocation B1–B2 đã xác nhận
            </span>
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-white border border-gray-200 text-gray-600">
              {vocabPrep.paraphraseTable.length} dòng paraphrase · {stats.totalCollocs} collocations
            </span>
          </div>
          <span className="inline-flex items-center gap-1 text-xs font-bold text-gray-600 flex-shrink-0">
            {expandedRef ? 'Thu gọn' : 'Mở tra cứu'}
            {expandedRef ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
          </span>
        </button>

        {expandedRef && (
          <div className="p-4 border-t border-gray-100 bg-gray-50/40 animate-fade-in">
            {contentBody}
          </div>
        )}
      </div>
    );
  }

  // ── PREP MODE (Full confirmation window BEFORE outline) ──
  return (
    <div
      className={`rounded-3xl border-2 p-5 sm:p-6 shadow-sm flex flex-col gap-5 animate-fade-in ${
        isOrange
          ? 'bg-gradient-to-br from-orange-50/75 via-amber-50/35 to-white border-orange-200/90'
          : 'bg-gradient-to-br from-emerald-50/75 via-teal-50/35 to-white border-emerald-200/90'
      }`}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className={`px-2.5 py-0.5 rounded-full text-[11px] font-black text-white ${
                isOrange ? 'bg-orange-500' : 'bg-emerald-600'
              }`}
            >
              Bước 1/2 · Chuẩn bị Từ vựng &amp; Paraphrase
            </span>
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-white border border-gray-200 text-gray-600">
              Chuẩn LR 7.0 (B1–B2 sát đề)
            </span>
          </div>
          <h2 className="text-base sm:text-lg font-extrabold text-gray-900 mt-0.5">
            Chốt Bảng Paraphrase &amp; Kho Collocation trước khi vào dàn ý {totalBodies} Body
          </h2>
          <p className="text-xs text-gray-600 leading-relaxed max-w-2xl">
            Xem qua toàn bộ từ vựng &amp; bảng paraphrase tránh lặp từ dưới đây. Bạn có thể bấm bỏ chọn những cụm không thích — sau khi bấm <b>Xác nhận</b>, AI sẽ bám đúng bộ từ này để lập dàn ý {totalBodies} Body!
          </p>
        </div>

        {onRegenerate && (
          <button
            type="button"
            onClick={onRegenerate}
            disabled={isRegenerating || isConfirming}
            className="inline-flex items-center gap-1.5 text-xs font-bold px-3.5 py-2 rounded-xl bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors flex-shrink-0"
          >
            {isRegenerating ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
            Tạo lại bảng từ vựng
          </button>
        )}
      </div>

      {contentBody}

      {/* Confirmation Footer */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-gray-200/80">
        <div className="text-xs text-gray-600">
          <p className="font-bold text-gray-800">
            Đang giữ: {stats.keptAlts}/{stats.totalAlts} cách paraphrase · {stats.keptCollocs}/{stats.totalCollocs} cụm collocation
          </p>
          {isConfirming && confirmStatus ? (
            <p className={`mt-0.5 font-semibold ${isOrange ? 'text-orange-700' : 'text-emerald-700'}`}>
              {confirmStatus}
            </p>
          ) : (
            <p className="text-[11px] text-gray-500 mt-0.5">
              Sau khi xác nhận, bảng này vẫn được ghim gọn ngay trên ô viết để bạn tra cứu bất cứ lúc nào.
            </p>
          )}
        </div>

        <button
          type="button"
          onClick={handleConfirmClick}
          disabled={isConfirming || isRegenerating}
          className={`inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-sm font-extrabold text-white shadow-md transition-all disabled:opacity-60 flex-shrink-0 ${
            isOrange
              ? 'bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 shadow-orange-200/70'
              : 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 shadow-emerald-200/70'
          }`}
        >
          {isConfirming ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              Đang lập dàn ý {totalBodies} Body...
            </>
          ) : (
            <>
              Xác nhận &amp; Vào dàn ý {totalBodies} Body
              <ArrowRight size={16} />
            </>
          )}
        </button>
      </div>
    </div>
  );
}
