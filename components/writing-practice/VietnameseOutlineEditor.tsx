'use client';

import {
  AlertTriangle,
  CheckCircle2,
  ListChecks,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  Sparkles,
} from 'lucide-react';
import type {
  GuidedTaskType,
  OutlineEvaluationResult,
  UserOutlineParagraph,
} from '@/lib/writing-guided-types';

interface VietnameseOutlineEditorProps {
  taskType: GuidedTaskType;
  paragraphs: UserOutlineParagraph[];
  onChange: (next: UserOutlineParagraph[]) => void;
  evaluation: OutlineEvaluationResult | null;
  disabled?: boolean;
}

export function VietnameseOutlineEditor({
  taskType,
  paragraphs,
  onChange,
  evaluation,
  disabled = false,
}: VietnameseOutlineEditorProps) {
  const isTask1 = taskType === 'task1';

  const updateParagraph = (idx: number, patch: Partial<UserOutlineParagraph>) => {
    const next = paragraphs.map((p, i) => (i === idx ? { ...p, ...patch } : p));
    onChange(next);
  };

  const addParagraph = () => {
    if (paragraphs.length >= 6) return;
    const num = paragraphs.length + 1;
    onChange([
      ...paragraphs,
      {
        id: `p-${Date.now()}-${num}`,
        heading: `Đoạn ${num} — ${isTask1 ? 'Thân bài bổ sung' : 'Thân bài / Kết bài'}`,
        ideasVi: '',
      },
    ]);
  };

  const removeParagraph = (idx: number) => {
    if (paragraphs.length <= 2) return;
    onChange(paragraphs.filter((_, i) => i !== idx));
  };

  const moveParagraph = (idx: number, dir: -1 | 1) => {
    const target = idx + dir;
    if (target < 0 || target >= paragraphs.length) return;
    const copy = [...paragraphs];
    const tmp = copy[idx];
    copy[idx] = copy[target];
    copy[target] = tmp;
    onChange(copy);
  };

  return (
    <div className="flex flex-col gap-3.5">
      {/* Section Header */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div>
          <h3 className="text-sm font-black text-gray-900 flex items-center gap-2">
            <ListChecks size={16} className={isTask1 ? 'text-orange-600' : 'text-emerald-600'} />
            Tự chia đoạn &amp; viết dàn ý bằng tiếng Việt ({paragraphs.length} đoạn)
          </h3>
          <p className="text-xs text-gray-500 mt-0.5">
            Bạn tự chia đoạn theo ý mình rồi gạch đầu dòng ý tiếng Việt cho từng đoạn. Gia sư AI sẽ chấm{' '}
            <strong className="text-gray-800">{isTask1 ? 'TA >= 7.0' : 'TR >= 7.0'}</strong> trước khi dựng Template siêu chi tiết!
          </p>
        </div>

        <button
          type="button"
          onClick={addParagraph}
          disabled={disabled || paragraphs.length >= 6}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-colors disabled:opacity-50 ${
            isTask1
              ? 'bg-orange-50 text-orange-700 border-orange-200 hover:bg-orange-100'
              : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
          }`}
        >
          <Plus size={14} /> Thêm đoạn ({paragraphs.length}/6)
        </button>
      </div>

      {/* Feedback Banner if AI evaluated outline and TA/TR < 7.0 */}
      {evaluation && !evaluation.passedTask7 && (
        <div className="rounded-2xl border-2 border-amber-300 bg-amber-50/90 p-4 flex flex-col gap-2.5 animate-fade-in">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div className="flex items-start gap-2.5">
              <AlertTriangle size={20} className="text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-black text-amber-950">
                  Dàn ý hiện đạt {isTask1 ? 'TA' : 'TR'} ≈ {evaluation.estimatedTaskBand.toFixed(1)} (chưa đạt mốc ≥ 7.0) — Cần bổ sung trước khi dựng Template!
                </p>
                <p className="text-xs text-amber-900 mt-1 leading-relaxed">{evaluation.verdictVi}</p>
              </div>
            </div>
            <span className="px-3 py-1 rounded-xl bg-amber-600 text-white text-xs font-black flex-shrink-0">
              {isTask1 ? 'TA' : 'TR'} {evaluation.estimatedTaskBand.toFixed(1)} / 7.0
            </span>
          </div>

          {evaluation.missingElementsVi.length > 0 && (
            <div className="rounded-xl bg-white/90 border border-amber-200 p-3">
              <p className="text-[11px] font-extrabold uppercase tracking-wider text-rose-700 mb-1.5">
                Điểm còn thiếu bắt buộc cần bổ sung vào dàn ý:
              </p>
              <ul className="space-y-1 text-xs text-gray-800">
                {evaluation.missingElementsVi.map((m, i) => (
                  <li key={i} className="flex items-start gap-1.5">
                    <span className="font-black text-rose-500">•</span>
                    <span>{m}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {evaluation.strengthsVi.length > 0 && (
            <div className="text-xs text-emerald-900 bg-emerald-50/80 border border-emerald-200 rounded-xl px-3 py-2">
              <span className="font-extrabold">Điểm dàn ý đã làm tốt: </span>
              {evaluation.strengthsVi.join(' · ')}
            </div>
          )}
        </div>
      )}

      {/* Passed Banner if TA/TR >= 7.0 */}
      {evaluation && evaluation.passedTask7 && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/75 px-4 py-3 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-start gap-2.5">
            <CheckCircle2 size={18} className="text-emerald-600 flex-shrink-0 mt-0.5" />
            <div className="text-xs text-emerald-950">
              <p className="font-black text-sm">
                Dàn ý đạt chuẩn {isTask1 ? 'TA' : 'TR'} {evaluation.estimatedTaskBand.toFixed(1)} (≥ 7.0)! ({evaluation.detectedType})
              </p>
              <p className="mt-0.5 leading-relaxed">{evaluation.verdictVi}</p>
            </div>
          </div>
          <span className="px-2.5 py-1 rounded-lg bg-emerald-600 text-white text-xs font-black flex-shrink-0 flex items-center gap-1">
            <Sparkles size={12} /> Đạt chuẩn dựng Template
          </span>
        </div>
      )}

      {/* Editable Paragraph Cards */}
      <div className="flex flex-col gap-3">
        {paragraphs.map((p, idx) => {
          const pFeedback = evaluation?.paragraphFeedback.find((f) => f.paragraphIndex === idx);
          const needsFix = pFeedback && pFeedback.status !== 'strong';

          return (
            <div
              key={p.id}
              className={`rounded-2xl border bg-[var(--card)] p-3.5 transition-all ${
                needsFix
                  ? 'border-amber-300 ring-1 ring-amber-200/80'
                  : 'border-[var(--border)] hover:border-gray-300'
              }`}
            >
              <div className="flex items-center gap-2 mb-2">
                <span
                  className={`w-6 h-6 rounded-lg text-xs font-black flex items-center justify-center flex-shrink-0 text-white ${
                    isTask1 ? 'bg-orange-500' : 'bg-emerald-600'
                  }`}
                >
                  {idx + 1}
                </span>

                <input
                  type="text"
                  value={p.heading}
                  onChange={(e) => updateParagraph(idx, { heading: e.target.value })}
                  disabled={disabled}
                  placeholder={`Tên đoạn ${idx + 1} (VD: Mở bài, Thân bài 1...)`}
                  className="flex-1 min-w-0 text-xs sm:text-sm font-extrabold text-gray-900 bg-transparent border-b border-transparent focus:border-gray-300 focus:outline-none py-0.5"
                />

                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    type="button"
                    onClick={() => moveParagraph(idx, -1)}
                    disabled={disabled || idx === 0}
                    title="Đưa lên trên"
                    className="p-1 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 disabled:opacity-30"
                  >
                    <ArrowUp size={13} />
                  </button>
                  <button
                    type="button"
                    onClick={() => moveParagraph(idx, 1)}
                    disabled={disabled || idx === paragraphs.length - 1}
                    title="Đưa xuống dưới"
                    className="p-1 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 disabled:opacity-30"
                  >
                    <ArrowDown size={13} />
                  </button>
                  {paragraphs.length > 2 && (
                    <button
                      type="button"
                      onClick={() => removeParagraph(idx)}
                      disabled={disabled}
                      title="Xóa đoạn này"
                      className="p-1 rounded-lg text-rose-400 hover:text-rose-600 hover:bg-rose-50 disabled:opacity-30"
                    >
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
              </div>

              <textarea
                value={p.ideasVi}
                onChange={(e) => updateParagraph(idx, { ideasVi: e.target.value })}
                disabled={disabled}
                rows={3}
                placeholder={
                  isTask1
                    ? idx === 0
                      ? 'VD: Giới thiệu lại đề biểu đồ cho thấy gì, ở đâu, giai đoạn năm nào...'
                      : idx === 1
                        ? 'VD: Tổng quan 2 xu hướng nổi bật nhất (nhóm nào tăng mạnh nhất, nhóm nào cao nhất/thấp nhất — không nêu số cụ thể)...'
                        : 'VD: Gom nhóm số liệu nổi bật + so sánh chênh lệch / mốc năm chính xác từ biểu đồ...'
                    : idx === 0
                      ? 'VD: Paraphrase vấn đề đề bài + nêu rõ quan điểm của bạn (đồng ý/không đồng ý/cân bằng)...'
                      : idx === paragraphs.length - 1
                        ? 'VD: Tóm tắt lại các luận điểm chính và khẳng định lại quan điểm ban đầu...'
                        : 'VD: Luận điểm chính -> giải thích tại sao (cơ chế nguyên nhân - kết quả) -> ví dụ thực tế cụ thể...'
                }
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg)]/60 px-3 py-2.5 text-xs sm:text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-400/40 resize-y leading-relaxed"
              />

              {/* Per-paragraph inline TA/TR feedback */}
              {pFeedback && (
                <div
                  className={`mt-2 rounded-xl px-3 py-2 text-xs border ${
                    pFeedback.status === 'strong'
                      ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
                      : pFeedback.status === 'off_track'
                        ? 'bg-rose-50/80 border-rose-200 text-rose-900'
                        : 'bg-amber-50/80 border-amber-200 text-amber-950'
                  }`}
                >
                  <p className="font-bold">
                    {pFeedback.status === 'strong'
                      ? '✓ Đoạn này đạt chuẩn ý:'
                      : pFeedback.status === 'off_track'
                        ? '✕ Đoạn này đang lệch/thiếu trọng tâm:'
                        : '⚠ Gợi ý bổ sung cho đoạn này:'}{' '}
                    <span className="font-normal">{pFeedback.commentVi}</span>
                  </p>
                  {pFeedback.whatToAddVi && (
                    <p className="mt-1 font-semibold text-amber-950">
                      → Cần bổ sung: {pFeedback.whatToAddVi}
                    </p>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
