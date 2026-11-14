// lib/writing-practice-types.ts

export type ChartType = 'bar' | 'line' | 'pie' | 'table' | 'process' | 'map';

export interface SuggestedVocabItem {
  phrase: string;
  meaning: string;
}

export interface SuggestedGrammarItem {
  structure: string;
  usage: string;
}

export interface OutlineBodyItem {
  bodyIndex: number;
  label: string;
  role: string;
  viGuide: string[];
  keyPoints: string[];
  vocabSuggestions?: SuggestedVocabItem[];
  grammarSuggestions?: SuggestedGrammarItem[];
  linkingTip: string;
}

export interface ChartData {
  type: ChartType;
  title: string;
  context: string;
  prompt: string;
  keyFeatures?: string[];
  writingTips?: string;
  xLabel?: string;
  yLabel?: string;
  categories?: string[];
  series?: { name: string; values: number[] }[];
  xValues?: string[];
  year?: string;
  unit?: string;
  segments?: { label: string; value: number }[];
  headers?: string[];
  rows?: string[][];
  steps?: { id: number; label: string; description: string }[];
  location?: string;
  period1?: string;
  period2?: string;
  features1?: { name: string; position: string; icon: string; description: string }[];
  features2?: { name: string; position: string; icon: string; description: string }[];
  changes?: string[];
  outline?: OutlineBodyItem[];
}

export interface CriterionFeedback {
  band: number;
  passed75: boolean;
  reason: string;
  evidence: string[];
}

export interface BodyGrammarError {
  original: string;
  correction: string;
  explanation: string;
}

export interface BodyVocabularyTip {
  studentWord: string;
  betterAlternative: string;
  reason: string;
}

export interface BodyGradeResult {
  overallBand: number;
  passed: boolean;
  criteria: {
    task: CriterionFeedback; // TA (Task 1) or TR (Task 2)
    cc: CriterionFeedback;   // Coherence & Cohesion
    lr: CriterionFeedback;   // Lexical Resource
    gra: CriterionFeedback;  // Grammatical Range & Accuracy
  };
  crossBodyFeedback: string;
  grammarErrors: BodyGrammarError[];
  vocabularyTips: BodyVocabularyTip[];
  generalFeedback: string;
  modelUpgrade?: string;
}

export interface CompletedBody {
  bodyIndex: number;
  label: string;
  role: string;
  outline: OutlineBodyItem;
  content: string;
  wordCount: number;
  attempts: number;
  grade: BodyGradeResult;
  completedAt: number;
}

export interface Task1CompletedSession {
  id: string;
  chartData: ChartData;
  outline: OutlineBodyItem[];
  bodies: CompletedBody[];
  fullEssay: string;
  overallBand: number;
  savedAt: number;
}

export interface LegacyTask1Session {
  id: string;
  chartData: ChartData;
  sentences: { original: string; corrected: string; score: number }[];
  avgScore: number;
  savedAt: number;
}

export interface Task2OutlineResponse {
  essayType: string;
  promptAnalysis: string;
  outline: OutlineBodyItem[];
}

export interface Task2CompletedSession {
  id: string;
  prompt: string;
  essayType: string;
  promptAnalysis: string;
  outline: OutlineBodyItem[];
  bodies: CompletedBody[];
  fullEssay: string;
  overallBand: number;
  savedAt: number;
}

// ─── Constants & Helpers ──────────────────────────────────────────────────────

export const BAND_PASS_THRESHOLD = 7.5;
export const MIN_CRITERION_BAND = 7.0;

export const TASK1_BODY_TEMPLATES: Array<{ bodyIndex: number; label: string; role: string }> = [
  { bodyIndex: 0, label: 'Body 1', role: 'Introduction (Mở bài — Paraphrase đề bài)' },
  { bodyIndex: 1, label: 'Body 2', role: 'Overview (Tổng quan xu hướng / điểm nổi bật)' },
  { bodyIndex: 2, label: 'Body 3', role: 'Detail Paragraph 1 (Thân bài 1 — Nhóm dữ liệu/giai đoạn 1)' },
  { bodyIndex: 3, label: 'Body 4', role: 'Detail Paragraph 2 (Thân bài 2 — Nhóm dữ liệu/giai đoạn 2)' },
];

export const TASK2_BODY_TEMPLATES: Array<{ bodyIndex: number; label: string; role: string }> = [
  { bodyIndex: 0, label: 'Body 1', role: 'Introduction (Mở bài — Paraphrase & Thesis Statement)' },
  { bodyIndex: 1, label: 'Body 2', role: 'Body Paragraph 1 (Thân bài 1 — Luận điểm chính 1)' },
  { bodyIndex: 2, label: 'Body 3', role: 'Body Paragraph 2 (Thân bài 2 — Luận điểm chính 2)' },
  { bodyIndex: 3, label: 'Body 4', role: 'Body Paragraph 3 (Thân bài 3 — Mở rộng / Phản biện / Giải pháp)' },
  { bodyIndex: 4, label: 'Body 5', role: 'Conclusion (Kết bài — Tóm tắt & Khẳng định quan điểm)' },
];

export function roundToHalfBand(score: unknown): number {
  const num = typeof score === 'number' ? score : parseFloat(String(score));
  if (!Number.isFinite(num)) return 0;
  const clamped = Math.min(9, Math.max(0, num));
  return Math.round(clamped * 2) / 2;
}

export function computeOverallBand(bands: [number, number, number, number]): number {
  const avg = (bands[0] + bands[1] + bands[2] + bands[3]) / 4;
  return Math.round(avg * 2) / 2;
}

export function isBodyPassedBand75(bands: { task: number; cc: number; lr: number; gra: number }): {
  overallBand: number;
  passed: boolean;
} {
  const overallBand = computeOverallBand([bands.task, bands.cc, bands.lr, bands.gra]);
  const minBand = Math.min(bands.task, bands.cc, bands.lr, bands.gra);
  return {
    overallBand,
    passed: overallBand >= BAND_PASS_THRESHOLD && minBand >= MIN_CRITERION_BAND,
  };
}

export function countWords(text: string): number {
  const trimmed = text.trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).filter(Boolean).length;
}

function normalizeVocabSuggestions(raw: unknown): SuggestedVocabItem[] {
  if (!Array.isArray(raw)) return [];
  const results: SuggestedVocabItem[] = [];
  for (const item of raw) {
    if (typeof item === 'string') {
      const cleaned = item.trim();
      if (!cleaned) continue;
      const parenMatch = cleaned.match(/^(.+?)\s*\((.+)\)\s*$/);
      if (parenMatch) {
        results.push({ phrase: parenMatch[1].trim(), meaning: parenMatch[2].trim() });
      } else {
        results.push({ phrase: cleaned, meaning: '' });
      }
      continue;
    }
    if (item && typeof item === 'object') {
      const phrase = String((item as any).phrase ?? (item as any).word ?? (item as any).term ?? '').trim();
      const meaning = String((item as any).meaning ?? (item as any).viMeaning ?? (item as any).meaningVi ?? '').trim();
      if (phrase) {
        results.push({ phrase, meaning });
      }
    }
  }
  return results;
}

function normalizeGrammarSuggestions(raw: unknown): SuggestedGrammarItem[] {
  if (!Array.isArray(raw)) return [];
  const results: SuggestedGrammarItem[] = [];
  for (const item of raw) {
    if (typeof item === 'string') {
      const cleaned = item.trim();
      if (!cleaned) continue;
      results.push({ structure: cleaned, usage: '' });
      continue;
    }
    if (item && typeof item === 'object') {
      const structure = String((item as any).structure ?? (item as any).pattern ?? (item as any).grammar ?? '').trim();
      const usage = String((item as any).usage ?? (item as any).note ?? (item as any).explanation ?? '').trim();
      if (structure) {
        results.push({ structure, usage });
      }
    }
  }
  return results;
}

export function normalizeOutline(
  rawOutline: unknown,
  task: 'task1' | 'task2'
): OutlineBodyItem[] {
  const templates = task === 'task1' ? TASK1_BODY_TEMPLATES : TASK2_BODY_TEMPLATES;
  const arr = Array.isArray(rawOutline) ? rawOutline : [];
  const isOneBased =
    arr.length > 0 &&
    !arr.some((item: any) => item && Number(item.bodyIndex) === 0) &&
    arr.some((item: any) => item && Number(item.bodyIndex) === 1);

  return templates.map((tpl, idx) => {
    const targetBodyIdx = isOneBased ? idx + 1 : idx;
    const found =
      arr.find((item: any) => item && Number(item.bodyIndex) === targetBodyIdx) ??
      arr[idx] ??
      {};

    const viGuide = Array.isArray(found.viGuide)
      ? found.viGuide.map((s: any) => String(s).trim()).filter(Boolean)
      : typeof found.viGuide === 'string' && found.viGuide.trim()
      ? [found.viGuide.trim()]
      : [`Triển khai nội dung phần ${tpl.role} bằng tiếng Anh mạch lạc, chuẩn học thuật.`];

    const keyPoints = Array.isArray(found.keyPoints)
      ? found.keyPoints.map((s: any) => String(s).trim()).filter(Boolean)
      : [];

    const vocabSuggestions = normalizeVocabSuggestions(found.vocabSuggestions);
    const grammarSuggestions = normalizeGrammarSuggestions(found.grammarSuggestions);

    const linkingTip =
      typeof found.linkingTip === 'string' && found.linkingTip.trim()
        ? found.linkingTip.trim()
        : idx === 0
        ? 'Mở đầu tự nhiên và tạo nền tảng rõ ràng cho các body tiếp theo.'
        : 'Liên kết mượt mà với ý ở body trước bằng từ nối và phép quy chiếu phù hợp.';

    return {
      bodyIndex: idx,
      label: tpl.label,
      role: typeof found.role === 'string' && found.role.trim() ? found.role.trim() : tpl.role,
      viGuide,
      keyPoints,
      vocabSuggestions,
      grammarSuggestions,
      linkingTip,
    };
  });
}

export function normalizeGradeResult(raw: any): BodyGradeResult {
  const rawCriteria = raw?.criteria || {};

  const normalizeCriterion = (c: any, defaultLabel: string): CriterionFeedback => {
    const band = roundToHalfBand(c?.band ?? 0);
    return {
      band,
      passed75: band >= BAND_PASS_THRESHOLD,
      reason:
        typeof c?.reason === 'string' && c.reason.trim()
          ? c.reason.trim()
          : band >= BAND_PASS_THRESHOLD
          ? `${defaultLabel} đạt chuẩn Band 7.5+.`
          : `${defaultLabel} chưa đạt chuẩn 7.5, cần bổ sung độ chính xác và tính học thuật.`,
      evidence: Array.isArray(c?.evidence)
        ? c.evidence.map((e: any) => String(e).trim()).filter(Boolean)
        : [],
    };
  };

  const taskCrit = normalizeCriterion(
    rawCriteria.task ?? rawCriteria.ta ?? rawCriteria.tr ?? rawCriteria.TA ?? rawCriteria.TR ?? rawCriteria.TASK,
    'Tiêu chí nội dung'
  );
  const ccCrit = normalizeCriterion(rawCriteria.cc ?? rawCriteria.CC, 'Coherence & Cohesion');
  const lrCrit = normalizeCriterion(rawCriteria.lr ?? rawCriteria.LR, 'Lexical Resource');
  const graCrit = normalizeCriterion(rawCriteria.gra ?? rawCriteria.GRA, 'Grammatical Range & Accuracy');

  const { overallBand, passed } = isBodyPassedBand75({
    task: taskCrit.band,
    cc: ccCrit.band,
    lr: lrCrit.band,
    gra: graCrit.band,
  });

  const grammarErrors: BodyGrammarError[] = Array.isArray(raw?.grammarErrors)
    ? raw.grammarErrors
        .filter((e: any) => e && (e.original || e.correction))
        .map((e: any) => ({
          original: String(e.original || ''),
          correction: String(e.correction || ''),
          explanation: String(e.explanation || ''),
        }))
    : [];

  const vocabularyTips: BodyVocabularyTip[] = Array.isArray(raw?.vocabularyTips)
    ? raw.vocabularyTips
        .filter((v: any) => v && (v.studentWord || v.betterAlternative))
        .map((v: any) => ({
          studentWord: String(v.studentWord || ''),
          betterAlternative: String(v.betterAlternative || ''),
          reason: String(v.reason || ''),
        }))
    : [];

  // Chỉ trả modelUpgrade khi đã đạt chuẩn Band 7.5 để người học tự sửa trước
  const modelUpgrade =
    passed && typeof raw?.modelUpgrade === 'string' && raw.modelUpgrade.trim()
      ? raw.modelUpgrade.trim()
      : undefined;

  return {
    overallBand,
    passed,
    criteria: {
      task: taskCrit,
      cc: ccCrit,
      lr: lrCrit,
      gra: graCrit,
    },
    crossBodyFeedback:
      typeof raw?.crossBodyFeedback === 'string' && raw.crossBodyFeedback.trim()
        ? raw.crossBodyFeedback.trim()
        : 'Đoạn viết có tính liên kết phù hợp với mạch chung của bài.',
    grammarErrors,
    vocabularyTips,
    generalFeedback:
      typeof raw?.generalFeedback === 'string' && raw.generalFeedback.trim()
        ? raw.generalFeedback.trim()
        : passed
        ? 'Đoạn văn đã đáp ứng tiêu chuẩn Band 7.5.'
        : 'Đoạn văn chưa đạt Band 7.5. Vui lòng xem chi tiết các tiêu chí bị mất điểm và chỉnh sửa lại.',
    modelUpgrade,
  };
}
