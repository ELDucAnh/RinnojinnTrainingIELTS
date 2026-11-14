'use client';

import { useState } from 'react';
import {
  Check,
  ChevronDown,
  ChevronUp,
  Copy,
  Save,
  Sparkles,
  FileText,
} from 'lucide-react';
import { countWords, type CompletedBody } from '@/lib/writing-practice-types';

interface CompletedEssayDetailsProps {
  taskType: 'task1' | 'task2';
  fullEssay: string;
  bodies: CompletedBody[];
  overallBand: number;
  accent?: 'indigo' | 'emerald' | 'orange';
  onSaveToWritingSamples?: () => void;
  savedToWriting?: boolean;
}

export function CompletedEssayDetails({
  taskType,
  fullEssay,
  bodies,
  overallBand,
  accent = 'indigo',
  onSaveToWritingSamples,
  savedToWriting = false,
}: CompletedEssayDetailsProps) {
  const isOrange = accent === 'orange';
  const [copied, setCopied] = useState(false);
  const [expandedBodyIdx, setExpandedBodyIdx] = useState<number | null>(null);

  const totalWords = countWords(fullEssay);
  const taskCritLabel = taskType === 'task1' ? 'TA' : 'TR';

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(fullEssay);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard fallback ignored
    }
  };

  return (
    <div className="flex flex-col gap-5">
      {/* Full assembled essay */}
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50/40 p-4 sm:p-5">
        <div className="flex items-center justify-between gap-2 flex-wrap mb-3">
          <div className="flex items-center gap-2">
            <FileText size={16} className="text-emerald-600" />
            <h3 className="text-sm font-extrabold text-emerald-900">
              Bài viết hoàn chỉnh ({bodies.length} Body · {totalWords} từ)
            </h3>
            <span className="text-xs font-black px-2 py-0.5 rounded-full bg-emerald-600 text-white">
              Band {overallBand.toFixed(1)}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopy}
              className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-xl bg-white border border-emerald-200 text-emerald-700 hover:bg-emerald-50 transition-colors"
            >
              {copied ? <Check size={13} /> : <Copy size={13} />}
              {copied ? 'Đã copy' : 'Copy toàn bài'}
            </button>
            {onSaveToWritingSamples && (
              <button
                type="button"
                onClick={onSaveToWritingSamples}
                disabled={savedToWriting}
                className={`inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-xl border transition-colors disabled:opacity-60 bg-white ${isOrange
                    ? 'border-orange-200 text-orange-700 hover:bg-orange-50'
                    : accent === 'emerald'
                      ? 'border-emerald-200 text-emerald-700 hover:bg-emerald-50'
                      : 'border-indigo-200 text-indigo-700 hover:bg-indigo-50'
                  }`}
              >
                {savedToWriting ? <Check size={13} /> : <Save size={13} />}
                {savedToWriting ? 'Đã lưu vào Kho Bài mẫu' : 'Lưu vào Bài mẫu Writing'}
              </button>
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-emerald-100 p-4 text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">
          {fullEssay}
        </div>
      </div>

      {/* Breakdown by Body */}
      <div>
        <p className="text-xs font-extrabold uppercase tracking-wider text-gray-400 mb-2.5">
          Chi tiết từng Body & Điểm 4 tiêu chí
        </p>
        <div className="flex flex-col gap-2.5">
          {bodies.map((b) => {
            const isOpen = expandedBodyIdx === b.bodyIndex;
            const c = b.grade.criteria;
            return (
              <div
                key={b.bodyIndex}
                className="rounded-xl border border-gray-200 bg-white overflow-hidden"
              >
                <button
                  type="button"
                  onClick={() => setExpandedBodyIdx(isOpen ? null : b.bodyIndex)}
                  className="w-full px-4 py-3 flex items-center justify-between gap-2 text-left hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-2 min-w-0 flex-wrap">
                    <span className="text-xs font-black px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                      Body {b.bodyIndex + 1} · {b.grade.overallBand.toFixed(1)}
                    </span>
                    <span className="text-xs font-bold text-gray-800 truncate">{b.role}</span>
                    <span className="text-[11px] text-gray-400">
                      ({b.wordCount} từ · {b.attempts} lần chấm)
                    </span>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <div className="hidden sm:flex items-center gap-1 text-[11px] font-bold">
                      <span className="px-1.5 py-0.5 rounded bg-gray-100 text-gray-700">
                        {taskCritLabel} {c.task.band.toFixed(1)}
                      </span>
                      <span className="px-1.5 py-0.5 rounded bg-gray-100 text-gray-700">
                        CC {c.cc.band.toFixed(1)}
                      </span>
                      <span className="px-1.5 py-0.5 rounded bg-gray-100 text-gray-700">
                        LR {c.lr.band.toFixed(1)}
                      </span>
                      <span className="px-1.5 py-0.5 rounded bg-gray-100 text-gray-700">
                        GRA {c.gra.band.toFixed(1)}
                      </span>
                    </div>
                    {isOpen ? (
                      <ChevronUp size={15} className="text-gray-400" />
                    ) : (
                      <ChevronDown size={15} className="text-gray-400" />
                    )}
                  </div>
                </button>

                {isOpen && (
                  <div className="px-4 pb-4 pt-2 border-t border-gray-100 flex flex-col gap-3 bg-gray-50/40">
                    {b.outline?.viGuide?.length > 0 && (
                      <div className="text-xs bg-amber-50/70 border border-amber-100 rounded-lg p-3">
                        <p className="font-bold text-amber-800 mb-1">Dàn ý tiếng Việt:</p>
                        <ul className="list-disc pl-4 space-y-0.5 text-amber-900">
                          {b.outline.viGuide.map((g, gi) => (
                            <li key={gi}>{g}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    <div className="text-sm text-gray-800 leading-relaxed bg-white border border-gray-200 rounded-lg p-3 whitespace-pre-wrap">
                      {b.content}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                      {[
                        { label: taskCritLabel, item: c.task },
                        { label: 'CC', item: c.cc },
                        { label: 'LR', item: c.lr },
                        { label: 'GRA', item: c.gra },
                      ].map((crit) => (
                        <div
                          key={crit.label}
                          className="p-2.5 rounded-lg bg-white border border-gray-200"
                        >
                          <p className="font-bold text-gray-800 mb-0.5">
                            {crit.label}: {crit.item.band.toFixed(1)}
                          </p>
                          <p className="text-gray-600 leading-relaxed">{crit.item.reason}</p>
                        </div>
                      ))}
                    </div>

                    {b.grade.crossBodyFeedback && (
                      <div
                        className={`text-xs border rounded-lg p-2.5 ${isOrange
                            ? 'bg-orange-50/70 border-orange-100 text-orange-950'
                            : 'bg-indigo-50/70 border-indigo-100 text-indigo-900'
                          }`}
                      >
                        <span className="font-bold">Liên kết Body: </span>
                        {b.grade.crossBodyFeedback}
                      </div>
                    )}

                    {b.grade.modelUpgrade && (
                      <div className="text-xs bg-emerald-50/70 border border-emerald-100 rounded-lg p-2.5 text-emerald-900">
                        <p className="font-bold flex items-center gap-1 mb-1">
                          <Sparkles size={12} /> Bản nâng cấp Band 8.0+:
                        </p>
                        <p className="leading-relaxed whitespace-pre-wrap">{b.grade.modelUpgrade}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

