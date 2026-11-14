'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp, CheckCircle2, FileText } from 'lucide-react';
import type { CompletedBody } from '@/lib/writing-practice-types';

interface PreviousBodiesPanelProps {
  completedBodies: CompletedBody[];
}

export function PreviousBodiesPanel({ completedBodies }: PreviousBodiesPanelProps) {
  const [expanded, setExpanded] = useState(true);

  if (completedBodies.length === 0) return null;

  return (
    <div className="bg-[var(--card)] rounded-2xl border border-emerald-200/80 shadow-sm overflow-hidden">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="w-full px-4 py-3 bg-emerald-50/70 flex items-center justify-between gap-2 text-left hover:bg-emerald-50 transition-colors"
      >
        <div className="flex items-center gap-2 min-w-0">
          <FileText size={15} className="text-emerald-600 flex-shrink-0" />
          <span className="text-xs font-extrabold uppercase tracking-wider text-emerald-800 truncate">
            Các Body đã hoàn thành ({completedBodies.length}) — Xem để giữ mạch liên kết
          </span>
        </div>
        <span className="text-emerald-700 flex-shrink-0">
          {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </span>
      </button>

      {expanded && (
        <div className="p-4 flex flex-col gap-3 max-h-80 overflow-y-auto bg-white">
          {completedBodies.map((b) => (
            <div
              key={b.bodyIndex}
              className="rounded-xl border border-gray-200 bg-gray-50/70 p-3.5 flex flex-col gap-1.5"
            >
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1 text-xs font-black text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                    <CheckCircle2 size={11} /> Body {b.bodyIndex + 1}
                  </span>
                  <span className="text-xs font-semibold text-gray-600">{b.role}</span>
                </div>
                <span className="text-xs font-black text-emerald-700">
                  Band {b.grade.overallBand.toFixed(1)} · {b.wordCount} từ
                </span>
              </div>
              <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">
                {b.content}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

