'use client';

import { useState } from 'react';
import {
  Check,
  ChevronDown,
  ChevronUp,
  Copy,
  FileEdit,
  Sparkles,
  FileText,
  GraduationCap,
} from 'lucide-react';
import {
  countWords,
  type CompletedBody,
  type FullEssayGradeResult,
} from '@/lib/writing-practice-types';
import { FullEssayFeedbackPanel } from '@/components/writing-practice/FullEssayFeedbackPanel';

interface CompletedEssayDetailsProps {
  taskType: 'task1' | 'task2';
  fullEssay: string;
  bodies: CompletedBody[];
  overallBand: number;
  accent?: 'indigo' | 'emerald' | 'orange';
  fullEssayGrade?: FullEssayGradeResult;
  onPracticeFullEssay?: () => void;
}

export function CompletedEssayDetails({
  taskType,
  fullEssay,
  bodies,
  overallBand,
  accent = 'indigo',
  fullEssayGrade,
  onPracticeFullEssay,
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
              {fullEssayGrade
                ? `Bài tự viết hoàn chỉnh (${totalWords} từ)`
                : `Bài viết hoàn chỉnh (${bodies.length} Body · ${totalWords} từ)`}
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
            {onPracticeFullEssay && (
              <button
                type="button"
                onClick={onPracticeFullEssay}
                className={`inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-xl border transition-colors bg-white ${isOrange
                    ? 'border-orange-200 text-orange-700 hover:bg-orange-50'
                    : accent === 'emerald'
                      ? 'border-emerald-200 text-emerald-700 hover:bg-emerald-50'
                      : 'border-indigo-200 text-indigo-700 hover:bg-indigo-50'
                  }`}
              >
                <FileEdit size={13} /> Tự viết lại toàn bài
              </button>
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-emerald-100 p-4 text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">
          {fullEssay}
        </div>
      </div>

      {fullEssayGrade && (
        <FullEssayFeedbackPanel
          taskType={taskType}
          isGrading={false}
          gradeError=""
          gradeResult={fullEssayGrade}
          accent={accent}
          readOnly
        />
      )}

      {/* Breakdown by Body */}
      {bodies.length > 0 && (
        <div>
          <p className="text-xs font-extrabold uppercase tracking-wider text-gray-400 mb-2.5">
            Chi tiết từng Body &amp; Điểm 4 tiêu chí ({taskCritLabel} · CC · GRA · LR)
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
                          GRA {c.gra.band.toFixed(1)}
                        </span>
                        <span className="px-1.5 py-0.5 rounded bg-gray-100 text-gray-700">
                          LR {c.lr.band.toFixed(1)}
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
                          { label: 'GRA', item: c.gra },
                          { label: 'LR', item: c.lr },
                        ].map((crit) => (
                          <div
                            key={crit.label}
                            className="p-2.5 rounded-lg bg-white border border-gray-200 flex flex-col gap-1"
                          >
                            <p className="font-bold text-gray-800">
                              {crit.label}: {crit.item.band.toFixed(1)}
                            </p>
                            <p className="text-gray-600 leading-relaxed">{crit.item.reason}</p>
                            {crit.item.mindsetShift && (
                              <p className="text-[11px] text-amber-800 bg-amber-50/70 rounded px-2 py-1 mt-0.5">
                                <b>Tư duy: </b>
                                {crit.item.mindsetShift}
                              </p>
                            )}
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

                      {b.grade.tutorClosingNote && (
                        <div
                          className={`text-xs border rounded-lg p-3 whitespace-pre-line leading-relaxed ${isOrange
                              ? 'bg-orange-50/60 border-orange-200/80 text-orange-950'
                              : 'bg-emerald-50/60 border-emerald-200/80 text-emerald-950'
                            }`}
                        >
                          <p className="font-bold flex items-center gap-1.5 mb-1">
                            <GraduationCap size={13} /> Lời chốt của Gia sư Writing:
                          </p>
                          {b.grade.tutorClosingNote}
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
      )}
    </div>
  );
}
