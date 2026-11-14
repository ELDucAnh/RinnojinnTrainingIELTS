'use client';

import { CheckCircle2, Lock, PenLine } from 'lucide-react';
import type { CompletedBody, OutlineBodyItem } from '@/lib/writing-practice-types';

interface BodyProgressStepperProps {
  outline: OutlineBodyItem[];
  completedBodies: CompletedBody[];
  currentBodyIndex: number;
  accent?: 'indigo' | 'emerald' | 'orange';
}

export function BodyProgressStepper({
  outline,
  completedBodies,
  currentBodyIndex,
  accent = 'indigo',
}: BodyProgressStepperProps) {
  const completedCount = completedBodies.length;
  const totalCount = outline.length;

  const activeStyle =
    accent === 'emerald'
      ? 'bg-emerald-600 text-white border-emerald-600 shadow-md shadow-emerald-200/70'
      : accent === 'orange'
      ? 'bg-orange-500 text-white border-orange-500 shadow-md shadow-orange-200/70'
      : 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-200/70';

  const progressFill =
    accent === 'emerald'
      ? 'from-emerald-500 to-teal-500'
      : accent === 'orange'
      ? 'from-orange-400 to-amber-400'
      : 'from-indigo-500 to-purple-500';

  const pct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  return (
    <div className="bg-[var(--card)] rounded-2xl p-4 shadow-sm border border-[var(--border)] flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-xs font-extrabold uppercase tracking-wider text-[var(--text-muted)]">
            Tiến độ hoàn thành ({completedCount}/{totalCount} Body)
          </p>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">
            Mỗi Body cần đạt chuẩn <span className="font-bold text-emerald-600">Band ≥ 7.5</span> mới mở khóa Body tiếp theo
          </p>
        </div>
        <span className="text-xs font-black px-2.5 py-1 rounded-full bg-gray-100 text-gray-700">
          {pct}%
        </span>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`h-full bg-gradient-to-r ${progressFill} rounded-full transition-all duration-500`}
          style={{ width: `${pct}%` }}
        />
      </div>

      {/* Steps grid */}
      <div className={`grid gap-2 ${totalCount === 5 ? 'grid-cols-2 sm:grid-cols-5' : 'grid-cols-2 sm:grid-cols-4'}`}>
        {outline.map((item, idx) => {
          const done = completedBodies.find((b) => b.bodyIndex === idx);
          const isCurrent = idx === currentBodyIndex && !done;
          const shortRole = item.role.split('—')[0].split('(')[0].trim();

          return (
            <div
              key={idx}
              className={`rounded-xl px-3 py-2.5 border transition-all flex flex-col gap-1 ${
                done
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  : isCurrent
                  ? activeStyle
                  : 'bg-gray-50/80 border-gray-200 text-gray-400'
              }`}
            >
              <div className="flex items-center justify-between gap-1">
                <span className="text-[11px] font-black uppercase tracking-wider">
                  Body {idx + 1}
                </span>
                {done ? (
                  <span className="inline-flex items-center gap-0.5 text-[11px] font-black bg-emerald-600 text-white px-1.5 py-0.5 rounded-full">
                    <CheckCircle2 size={10} /> {done.grade.overallBand.toFixed(1)}
                  </span>
                ) : isCurrent ? (
                  <PenLine size={12} className="opacity-90" />
                ) : (
                  <Lock size={12} className="opacity-60" />
                )}
              </div>
              <p
                className={`text-[11px] font-semibold truncate ${
                  isCurrent ? 'text-white/95' : done ? 'text-emerald-700' : 'text-gray-400'
                }`}
                title={item.role}
              >
                {shortRole}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

