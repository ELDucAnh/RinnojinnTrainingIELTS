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

export interface ParaphraseTableRow {
  originalTerm: string;
  meaningVi: string;
  alternatives: string[];
  usageNote?: string;
}

export interface TopicCollocationItem {
  phrase: string;
  meaningVi: string;
  exampleUsage?: string;
}

export interface TopicCollocationGroup {
  groupTitle: string;
  items: TopicCollocationItem[];
}

export interface WritingVocabPrep {
  essayType?: string;
  promptAnalysis?: string;
  paraphraseTable: ParaphraseTableRow[];
  collocationGroups: TopicCollocationGroup[];
  antiRepetitionTip?: string;
}

export type SentenceComplexityType = 'simple' | 'compound' | 'complex' | 'compound-complex';

export interface IdeaLanguageGuide {
  sentenceNumber?: number;
  sentenceType?: SentenceComplexityType;
  sentenceTypeLabel?: string; // VD: "Câu đơn (Simple)", "Câu phức (Complex)"
  ideaLabel: string;
  ideaVi: string;
  ccLinkFromPrev?: string;    // Cách nối khớp từ câu trước (hoặc Body trước) để đạt CC 9.0
  ccLinkPhrases?: string[];   // Từ nối / phép quy chiếu B1-B2 cụ thể nên dùng ở câu này
  ccAvoid?: string;           // Từ nối máy móc / lỗi CC tuyệt đối tránh ở câu này
  vocabPhrases: SuggestedVocabItem[];
  grammarPatterns: SuggestedGrammarItem[];
}

export interface BodyBandStrategyNotes {
  task8Note: string; // Yêu cầu bắt buộc để đạt TA/TR >= 8.0
  cc9Note: string;   // Yêu cầu bắt buộc để đạt CC = 9.0 (liên kết vô hình, thematic progression, referencing)
  gra8Note: string;  // Yêu cầu bắt buộc để đạt GRA >= 8.0 (đa dạng cấu trúc phức hợp, độ chính xác cao)
  lrNote: string;    // Lưu ý từ vựng LR 7.0 (chỉ dùng B1–B2 phổ thông, sát đề, đúng collocation, tránh từ C1–C2 cao siêu)
}

export interface OutlineBodyItem {
  bodyIndex: number;
  label: string;
  role: string;
  targetSentenceCount?: number; // Số câu chuẩn cần viết cho Body này (VD: 2, 3, 4)
  sentenceMixSummary?: string;  // Tóm tắt nhịp câu: VD "4 câu: Câu 1 (Đơn) → Câu 2 (Phức) → Câu 3 (Phức) → Câu 4 (Đơn)"
  viGuide: string[];
  keyPoints: string[];
  bandStrategy?: BodyBandStrategyNotes;
  ideaGuides?: IdeaLanguageGuide[];
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

export type ActionMappingIssueType = 'add' | 'replace' | 'fix_error';

export interface CriterionActionMapping {
  targetLocation: string;
  issueType: ActionMappingIssueType;
  currentText?: string;
  actionGuide: string;
  suggestedPhrases?: string[];
  improvedExample?: string;
}

export interface CriterionFeedback {
  band: number;
  passed75: boolean; // Kept for backward compatibility; equals band >= criterion target
  reason: string;
  mindsetShift?: string;  // Thay đổi tư duy từ Band 6 -> Band 8/9 ở tiêu chí này
  whatToStudy?: string[]; // Chủ điểm cần học thêm (nếu cần) để bứt band
  evidence: string[];
  fixes?: string[];
  mappings?: CriterionActionMapping[];
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

export interface PreviousAttemptSummary {
  attemptNumber: number;
  content: string;
  overallBand: number;
  bands: {
    task: number;
    cc: number;
    gra: number;
    lr: number;
  };
  keyIssues: string[];
}

export type CcRuleId = 'R1' | 'R2' | 'R3' | 'R4' | 'R5';

export interface CcChecklistItem {
  ruleId: CcRuleId;
  ruleTitle: string;
  passed: boolean;
  evidence: string;
  fixAction?: string;
}

export type CcTransitionStatus = 'seamless' | 'mechanical' | 'abrupt' | 'unclear_ref';

export interface CcSentenceLinkAudit {
  transition: string;        // VD: "Body trước → Câu 1", "Câu 1 → Câu 2"
  status: CcTransitionStatus;
  currentSentence: string;   // Nguyên văn CẢ CÂU hiện tại của học viên
  diagnosis: string;         // Chẩn đoán chi tiết theo Official IELTS Band Descriptors (May 2023)
  howToFix: string;          // Cách sửa phép nối / quy chiếu / mạch Cũ -> Mới cụ thể
  fixedFullSentence: string; // Nguyên văn CẢ CÂU HOÀN CHỈNH sau khi sửa nối (đảm bảo 100% đúng ngữ pháp)
}

export interface BodyGradeResult {
  overallBand: number;
  passed: boolean;
  criteria: {
    task: CriterionFeedback; // TA (Task 1) >= 8.0 or TR (Task 2) >= 8.0
    cc: CriterionFeedback;   // Coherence & Cohesion >= 8.5
    gra: CriterionFeedback;  // Grammatical Range & Accuracy >= 8.0
    lr: CriterionFeedback;   // Lexical Resource >= 7.5
  };
  ccChecklist?: CcChecklistItem[];     // Bộ 5 quy luật chấm CC cố định (5/5 = đạt >= 8.5)
  ccFlowAudit?: CcSentenceLinkAudit[]; // Mổ xẻ chi tiết từng chuyển câu
  crossBodyFeedback: string;
  grammarErrors: BodyGrammarError[];
  vocabularyTips: BodyVocabularyTip[];
  generalFeedback: string;
  tutorClosingNote?: string; // Đoạn chốt bóc tách & nhận xét của gia sư Writing bằng tiếng Việt ở cuối cùng
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

export interface FullEssayParagraphFeedback {
  label: string;
  role: string;
  strengths: string;
  weaknesses: string;
  suggestedEdit: string;
}

export interface FullEssayGradeResult {
  overallBand: number;
  passed: boolean;
  criteria: {
    task: CriterionFeedback; // TA (Task 1) >= 8.0 or TR (Task 2) >= 8.0
    cc: CriterionFeedback;   // Coherence & Cohesion >= 8.5
    gra: CriterionFeedback;  // Grammatical Range & Accuracy >= 8.0
    lr: CriterionFeedback;   // Lexical Resource >= 7.5
  };
  ccChecklist?: CcChecklistItem[];     // Bộ 5 quy luật chấm CC cố định toàn bài
  ccFlowAudit?: CcSentenceLinkAudit[]; // Mổ xẻ chi tiết từng chuyển đoạn & chuyển câu
  wholeEssayStructureFeedback: string;
  paragraphBreakdown: FullEssayParagraphFeedback[];
  repetitionAlerts: string[];
  grammarErrors: BodyGrammarError[];
  vocabularyTips: BodyVocabularyTip[];
  generalFeedback: string;
  tutorClosingNote?: string; // Đoạn chốt bóc tách & nhận xét của gia sư Writing bằng tiếng Việt ở cuối cùng
  modelUpgrade?: string;
}

export interface Task1CompletedSession {
  id: string;
  sourceType?: 'body-by-body' | 'full-essay';
  sourceSessionId?: string;
  chartData: ChartData;
  vocabPrep?: WritingVocabPrep;
  outline: OutlineBodyItem[];
  bodies: CompletedBody[];
  fullEssayGrade?: FullEssayGradeResult;
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
  sourceType?: 'body-by-body' | 'full-essay';
  sourceSessionId?: string;
  prompt: string;
  essayType: string;
  promptAnalysis: string;
  vocabPrep?: WritingVocabPrep;
  outline: OutlineBodyItem[];
  bodies: CompletedBody[];
  fullEssayGrade?: FullEssayGradeResult;
  fullEssay: string;
  overallBand: number;
  savedAt: number;
}

// ─── Constants & Helpers ──────────────────────────────────────────────────────
// Chiến lược Band 8.0 Overall: (8.0 TA/TR + 8.5 CC + 8.0 GRA + 7.5 LR) / 4 = 8.0

export const BAND_PASS_THRESHOLD = 8.0;
export const MIN_TASK_BAND = 8.0;
export const MIN_CC_BAND = 8.5;
export const MIN_GRA_BAND = 8.0;
export const MIN_LR_BAND = 7.5;
export const MIN_CRITERION_BAND = 7.5;

export const CC_RULE_ORDER: CcRuleId[] = ['R1', 'R2', 'R3', 'R4', 'R5'];

export const CC_RULE_TITLES: Record<CcRuleId, string> = {
  R1: 'Quy luật 1 — Một trọng tâm duy nhất & Trật tự câu logic (Paragraphing & Logical Sequencing)',
  R2: 'Quy luật 2 — Mạch tiến triển Cũ → Mới liền mạch, không nhảy ý (Linear Thematic Progression)',
  R3: 'Quy luật 3 — Có phép quy chiếu/thay thế rõ gốc, không lặp danh từ thô (Clear Referencing & Substitution)',
  R4: 'Quy luật 4 — Kiểm soát từ nối: 0 từ liệt kê máy móc (Firstly/Moreover) & tối đa 1 trạng từ nối đầu câu/đoạn',
  R5: 'Quy luật 5 — Đúng 100% quan hệ logic & ngữ pháp từ nối (0 sai nghĩa từ nối, 0 comma splice)',
};

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

export function isBodyPassedTarget(bands: { task: number; cc: number; gra: number; lr: number }): {
  overallBand: number;
  passed: boolean;
} {
  const overallBand = computeOverallBand([bands.task, bands.cc, bands.gra, bands.lr]);
  const passed =
    overallBand >= BAND_PASS_THRESHOLD &&
    bands.task >= MIN_TASK_BAND &&
    bands.cc >= MIN_CC_BAND &&
    bands.gra >= MIN_GRA_BAND &&
    bands.lr >= MIN_LR_BAND;

  return {
    overallBand,
    passed,
  };
}

// Backward-compatible alias
export const isBodyPassedBand75 = isBodyPassedTarget;

export function countWords(text: string): number {
  const trimmed = text.trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).filter(Boolean).length;
}

export function buildPreviousAttemptSummary(
  attemptNumber: number,
  content: string,
  grade: BodyGradeResult | FullEssayGradeResult
): PreviousAttemptSummary {
  const keyIssues: string[] = [];
  const entries: Array<[string, CriterionFeedback, number]> = [
    ['TA/TR', grade.criteria.task, MIN_TASK_BAND],
    ['CC', grade.criteria.cc, MIN_CC_BAND],
    ['GRA', grade.criteria.gra, MIN_GRA_BAND],
    ['LR', grade.criteria.lr, MIN_LR_BAND],
  ];

  for (const [name, crit, target] of entries) {
    if (crit.band < target) {
      const firstAction =
        crit.mappings?.[0]?.actionGuide || crit.fixes?.[0] || crit.reason;
      keyIssues.push(`${name} (${crit.band.toFixed(1)}/${target.toFixed(1)}): ${firstAction}`);
    }
  }

  return {
    attemptNumber,
    content: content.slice(0, 2200),
    overallBand: grade.overallBand,
    bands: {
      task: grade.criteria.task.band,
      cc: grade.criteria.cc.band,
      gra: grade.criteria.gra.band,
      lr: grade.criteria.lr.band,
    },
    keyIssues: keyIssues.slice(0, 6),
  };
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

function normalizeSentenceType(raw: unknown): {
  sentenceType?: SentenceComplexityType;
  sentenceTypeLabel?: string;
} {
  const s = String(raw ?? '').toLowerCase().trim();
  if (!s) return {};
  if (s.includes('compound-complex') || s.includes('compound complex') || s.includes('phức-ghép') || s.includes('phức ghép')) {
    return { sentenceType: 'compound-complex', sentenceTypeLabel: 'Câu phức-ghép (Compound-Complex)' };
  }
  if (s.includes('complex') || s.includes('phức')) {
    return { sentenceType: 'complex', sentenceTypeLabel: 'Câu phức (Complex)' };
  }
  if (s.includes('compound') || s.includes('ghép')) {
    return { sentenceType: 'compound', sentenceTypeLabel: 'Câu ghép (Compound)' };
  }
  if (s.includes('simple') || s.includes('đơn')) {
    return { sentenceType: 'simple', sentenceTypeLabel: 'Câu đơn (Simple)' };
  }
  return {};
}

function normalizeIdeaGuides(raw: unknown): IdeaLanguageGuide[] {
  if (!Array.isArray(raw)) return [];
  const results: IdeaLanguageGuide[] = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const obj = item as any;
    const ideaLabel = String(obj.ideaLabel ?? obj.label ?? obj.title ?? '').trim();
    const ideaVi = String(obj.ideaVi ?? obj.whatToWrite ?? obj.idea ?? obj.description ?? '').trim();
    const vocabPhrases = normalizeVocabSuggestions(obj.vocabPhrases ?? obj.vocab ?? obj.vocabs);
    const grammarPatterns = normalizeGrammarSuggestions(obj.grammarPatterns ?? obj.grammar ?? obj.grammars);

    const parsedType = normalizeSentenceType(obj.sentenceType ?? obj.sentenceTypeLabel);
    const rawTypeLabel = String(obj.sentenceTypeLabel ?? '').trim();
    const sentenceNumber =
      Number.isFinite(Number(obj.sentenceNumber)) && Number(obj.sentenceNumber) > 0
        ? Math.round(Number(obj.sentenceNumber))
        : results.length + 1;

    const ccLinkFromPrev = String(
      obj.ccLinkFromPrev ?? obj.ccTip ?? obj.ccGuide ?? obj.cohesionGuide ?? ''
    ).trim();
    const ccLinkPhrases = Array.isArray(obj.ccLinkPhrases)
      ? obj.ccLinkPhrases.map((p: any) => String(p).trim()).filter(Boolean)
      : [];
    const ccAvoid = String(obj.ccAvoid ?? '').trim();

    if (ideaVi || ideaLabel || vocabPhrases.length > 0 || grammarPatterns.length > 0) {
      results.push({
        sentenceNumber,
        sentenceType: parsedType.sentenceType,
        sentenceTypeLabel: rawTypeLabel || parsedType.sentenceTypeLabel,
        ideaLabel: ideaLabel || `Câu ${sentenceNumber}`,
        ideaVi: ideaVi || ideaLabel,
        ccLinkFromPrev: ccLinkFromPrev || undefined,
        ccLinkPhrases: ccLinkPhrases.length > 0 ? ccLinkPhrases : undefined,
        ccAvoid: ccAvoid || undefined,
        vocabPhrases,
        grammarPatterns,
      });
    }
  }
  return results;
}

function normalizeBandStrategy(raw: unknown): BodyBandStrategyNotes | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const obj = raw as any;
  const task8Note = String(obj.task8Note ?? obj.ta8Note ?? obj.tr8Note ?? obj.task ?? '').trim();
  const cc9Note = String(obj.cc9Note ?? obj.ccNote ?? obj.cc ?? '').trim();
  const gra8Note = String(obj.gra8Note ?? obj.graNote ?? obj.gra ?? '').trim();
  const lrNote = String(obj.lrNote ?? obj.lr8Note ?? obj.lr7Note ?? obj.lr ?? '').trim();

  if (!task8Note && !cc9Note && !gra8Note && !lrNote) return undefined;
  return {
    task8Note,
    cc9Note,
    gra8Note,
    lrNote,
  };
}

export function normalizeVocabPrep(raw: any): WritingVocabPrep {
  const rawTable = Array.isArray(raw?.paraphraseTable) ? raw.paraphraseTable : [];
  const paraphraseTable: ParaphraseTableRow[] = [];

  for (const row of rawTable) {
    if (!row || typeof row !== 'object') continue;
    const originalTerm = String(row.originalTerm ?? row.original ?? row.term ?? '').trim();
    const meaningVi = String(row.meaningVi ?? row.meaning ?? row.viMeaning ?? '').trim();
    const rawAlts = Array.isArray(row.alternatives)
      ? row.alternatives
      : Array.isArray(row.paraphrases)
        ? row.paraphrases
        : [];
    const altSet = new Set<string>();
    const alternatives: string[] = [];
    for (const a of rawAlts) {
      const cleaned = String(a ?? '').trim();
      if (cleaned && !altSet.has(cleaned.toLowerCase())) {
        altSet.add(cleaned.toLowerCase());
        alternatives.push(cleaned);
      }
    }
    const usageNote = String(row.usageNote ?? row.note ?? '').trim();
    if (originalTerm && alternatives.length > 0) {
      paraphraseTable.push({
        originalTerm,
        meaningVi,
        alternatives,
        usageNote: usageNote || undefined,
      });
    }
  }

  const rawGroups = Array.isArray(raw?.collocationGroups) ? raw.collocationGroups : [];
  const collocationGroups: TopicCollocationGroup[] = [];

  for (const g of rawGroups) {
    if (!g || typeof g !== 'object') continue;
    const groupTitle = String(g.groupTitle ?? g.title ?? g.name ?? '').trim();
    const rawItems = Array.isArray(g.items) ? g.items : Array.isArray(g.phrases) ? g.phrases : [];
    const items: TopicCollocationItem[] = [];
    const seen = new Set<string>();
    for (const it of rawItems) {
      if (!it || typeof it !== 'object') continue;
      const phrase = String(it.phrase ?? it.word ?? it.term ?? '').trim();
      const meaningVi = String(it.meaningVi ?? it.meaning ?? it.viMeaning ?? '').trim();
      const exampleUsage = String(it.exampleUsage ?? it.usage ?? it.context ?? '').trim();
      if (phrase && !seen.has(phrase.toLowerCase())) {
        seen.add(phrase.toLowerCase());
        items.push({
          phrase,
          meaningVi,
          exampleUsage: exampleUsage || undefined,
        });
      }
    }
    if (items.length > 0) {
      collocationGroups.push({
        groupTitle: groupTitle || `Nhóm từ vựng ${collocationGroups.length + 1}`,
        items,
      });
    }
  }

  return {
    essayType: typeof raw?.essayType === 'string' && raw.essayType.trim() ? raw.essayType.trim() : undefined,
    promptAnalysis:
      typeof raw?.promptAnalysis === 'string' && raw.promptAnalysis.trim()
        ? raw.promptAnalysis.trim()
        : undefined,
    paraphraseTable,
    collocationGroups,
    antiRepetitionTip:
      typeof raw?.antiRepetitionTip === 'string' && raw.antiRepetitionTip.trim()
        ? raw.antiRepetitionTip.trim()
        : 'Xoay vòng lần lượt các cách paraphrase ở cột bên phải giữa Mở bài, các Thân bài và Kết bài để đạt chuẩn LR 7.5 linh hoạt mà không bị lặp từ.',
  };
}

export function normalizeOutlineBodyItem(
  found: any,
  tpl: { bodyIndex: number; label: string; role: string },
  idx: number
): OutlineBodyItem {
  const safeFound = found && typeof found === 'object' ? found : {};
  const ideaGuides = normalizeIdeaGuides(safeFound.ideaGuides);

  let viGuide = Array.isArray(safeFound.viGuide)
    ? safeFound.viGuide.map((s: any) => String(s).trim()).filter(Boolean)
    : typeof safeFound.viGuide === 'string' && safeFound.viGuide.trim()
      ? [safeFound.viGuide.trim()]
      : [];

  if (viGuide.length === 0 && ideaGuides.length > 0) {
    viGuide = ideaGuides.map((g) => (g.ideaLabel ? `${g.ideaLabel}: ${g.ideaVi}` : g.ideaVi));
  }
  if (viGuide.length === 0) {
    viGuide = [`Triển khai nội dung phần ${tpl.role} bằng tiếng Anh mạch lạc, chuẩn học thuật Band 8.0+.`];
  }

  const keyPoints = Array.isArray(safeFound.keyPoints)
    ? safeFound.keyPoints.map((s: any) => String(s).trim()).filter(Boolean)
    : [];

  const bandStrategy = normalizeBandStrategy(safeFound.bandStrategy);

  // Aggregate vocab & grammar across top-level + ideaGuides (deduped)
  const vocabMap = new Map<string, SuggestedVocabItem>();
  for (const v of [
    ...normalizeVocabSuggestions(safeFound.vocabSuggestions),
    ...ideaGuides.flatMap((g) => g.vocabPhrases),
  ]) {
    const k = v.phrase.toLowerCase();
    if (!vocabMap.has(k)) vocabMap.set(k, v);
  }

  const grammarMap = new Map<string, SuggestedGrammarItem>();
  for (const g of [
    ...normalizeGrammarSuggestions(safeFound.grammarSuggestions),
    ...ideaGuides.flatMap((ig) => ig.grammarPatterns),
  ]) {
    const k = g.structure.toLowerCase();
    if (!grammarMap.has(k)) grammarMap.set(k, g);
  }

  const linkingTip =
    typeof safeFound.linkingTip === 'string' && safeFound.linkingTip.trim()
      ? safeFound.linkingTip.trim()
      : idx === 0
        ? 'Mở đầu tự nhiên, xác lập khung thông tin rõ ràng để tạo điểm neo quy chiếu (CC 8.5+) cho các body sau.'
        : 'Liên kết "tàng hình" với body trước bằng phép quy chiếu danh từ (this shift / such measures / the former) thay cho từ nối máy móc.';

  const rawSentenceCount = Number(safeFound.targetSentenceCount ?? safeFound.sentenceCount);
  const targetSentenceCount =
    Number.isFinite(rawSentenceCount) && rawSentenceCount > 0
      ? Math.round(rawSentenceCount)
      : ideaGuides.length > 0
        ? ideaGuides.length
        : undefined;

  const sentenceMixSummary =
    typeof safeFound.sentenceMixSummary === 'string' && safeFound.sentenceMixSummary.trim()
      ? safeFound.sentenceMixSummary.trim()
      : ideaGuides.some((g) => g.sentenceTypeLabel)
        ? `${ideaGuides.length} câu: ${ideaGuides
            .map((g, i) => `Câu ${g.sentenceNumber || i + 1} (${(g.sentenceTypeLabel || 'Linh hoạt').split('(')[0].trim()})`)
            .join(' → ')}`
        : undefined;

  return {
    bodyIndex: idx,
    label: tpl.label,
    role: typeof safeFound.role === 'string' && safeFound.role.trim() ? safeFound.role.trim() : tpl.role,
    targetSentenceCount,
    sentenceMixSummary,
    viGuide,
    keyPoints,
    bandStrategy,
    ideaGuides,
    vocabSuggestions: Array.from(vocabMap.values()),
    grammarSuggestions: Array.from(grammarMap.values()),
    linkingTip,
  };
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

    return normalizeOutlineBodyItem(found, tpl, idx);
  });
}

function normalizeActionMappings(raw: unknown): CriterionActionMapping[] {
  if (!Array.isArray(raw)) return [];
  const results: CriterionActionMapping[] = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const rawType = String((item as any).issueType ?? '').toLowerCase().trim();
    const issueType: ActionMappingIssueType =
      rawType === 'add' || rawType === 'replace' || rawType === 'fix_error'
        ? (rawType as ActionMappingIssueType)
        : rawType.includes('add') || rawType.includes('missing') || rawType.includes('thêm')
          ? 'add'
          : rawType.includes('error') || rawType.includes('fix') || rawType.includes('lỗi')
            ? 'fix_error'
            : 'replace';

    const targetLocation = String(
      (item as any).targetLocation ?? (item as any).location ?? (item as any).position ?? ''
    ).trim();
    const currentText = String((item as any).currentText ?? (item as any).original ?? '').trim();
    const actionGuide = String(
      (item as any).actionGuide ?? (item as any).guide ?? (item as any).reason ?? ''
    ).trim();
    const improvedExample = String(
      (item as any).improvedExample ?? (item as any).replacement ?? (item as any).suggestion ?? ''
    ).trim();
    const suggestedPhrases = Array.isArray((item as any).suggestedPhrases)
      ? (item as any).suggestedPhrases.map((p: any) => String(p).trim()).filter(Boolean)
      : [];

    if (targetLocation || actionGuide || currentText || improvedExample || suggestedPhrases.length > 0) {
      results.push({
        targetLocation: targetLocation || 'Trong bài viết',
        issueType,
        currentText: currentText || undefined,
        actionGuide: actionGuide || 'Điều chỉnh theo gợi ý ánh xạ bên dưới.',
        suggestedPhrases: suggestedPhrases.length > 0 ? suggestedPhrases : undefined,
        improvedExample: improvedExample || undefined,
      });
    }
  }
  return results;
}

export function normalizeSingleCriterion(
  c: any,
  defaultLabel: string,
  targetBand: number
): CriterionFeedback {
  const band = roundToHalfBand(c?.band ?? 0);
  const mappings = normalizeActionMappings(c?.mappings);
  const mindsetShift =
    typeof c?.mindsetShift === 'string' && c.mindsetShift.trim()
      ? c.mindsetShift.trim()
      : undefined;
  const whatToStudy = Array.isArray(c?.whatToStudy)
    ? c.whatToStudy.map((s: any) => String(s).trim()).filter(Boolean)
    : typeof c?.whatToStudy === 'string' && c.whatToStudy.trim()
      ? [c.whatToStudy.trim()]
      : [];

  return {
    band,
    passed75: band >= targetBand,
    reason:
      typeof c?.reason === 'string' && c.reason.trim()
        ? c.reason.trim()
        : band >= targetBand
          ? `${defaultLabel} đạt mục tiêu Band ${targetBand.toFixed(1)}+.`
          : `${defaultLabel} hiện ở Band ${band.toFixed(1)} (chưa đạt mục tiêu ${targetBand.toFixed(1)}), cần điều chỉnh theo phân tích bên dưới.`,
    mindsetShift,
    whatToStudy: whatToStudy.length > 0 ? whatToStudy : undefined,
    evidence: Array.isArray(c?.evidence)
      ? c.evidence.map((e: any) => String(e).trim()).filter(Boolean)
      : [],
    fixes: Array.isArray(c?.fixes)
      ? c.fixes.map((f: any) => String(f).trim()).filter(Boolean)
      : typeof c?.fix === 'string' && c.fix.trim()
        ? [c.fix.trim()]
        : [],
    mappings: mappings.length > 0 ? mappings : undefined,
  };
}

function normalizeCcFlowAudit(raw: unknown): CcSentenceLinkAudit[] {
  if (!Array.isArray(raw)) return [];
  const results: CcSentenceLinkAudit[] = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const obj = item as any;
    const rawStatus = String(obj.status ?? '').toLowerCase().trim();
    const status: CcTransitionStatus =
      rawStatus === 'seamless' ||
      rawStatus === 'mechanical' ||
      rawStatus === 'abrupt' ||
      rawStatus === 'unclear_ref'
        ? (rawStatus as CcTransitionStatus)
        : rawStatus.includes('seam') || rawStatus.includes('good') || rawStatus.includes('mượt')
          ? 'seamless'
          : rawStatus.includes('ref') || rawStatus.includes('quy chiếu')
            ? 'unclear_ref'
            : rawStatus.includes('abrupt') || rawStatus.includes('khựng') || rawStatus.includes('nhảy')
              ? 'abrupt'
              : 'mechanical';

    const transition = String(obj.transition ?? obj.location ?? '').trim();
    const currentSentence = String(obj.currentSentence ?? obj.originalSentence ?? '').trim();
    const diagnosis = String(obj.diagnosis ?? obj.issue ?? '').trim();
    const howToFix = String(obj.howToFix ?? obj.fixGuide ?? '').trim();
    const fixedFullSentence = String(obj.fixedFullSentence ?? obj.improvedSentence ?? '').trim();

    if (transition || diagnosis || howToFix || fixedFullSentence) {
      results.push({
        transition: transition || `Chuyển câu #${results.length + 1}`,
        status,
        currentSentence,
        diagnosis,
        howToFix,
        fixedFullSentence,
      });
    }
  }
  return results;
}

function normalizeCcChecklist(raw: unknown): CcChecklistItem[] {
  if (!Array.isArray(raw) || raw.length === 0) return [];
  const results: CcChecklistItem[] = [];

  for (let idx = 0; idx < CC_RULE_ORDER.length; idx++) {
    const expectedId = CC_RULE_ORDER[idx];
    const found =
      raw.find((it: any) => String(it?.ruleId ?? '').toUpperCase().trim() === expectedId) ??
      raw[idx];
    if (!found || typeof found !== 'object') continue;

    const obj = found as any;
    const passed =
      typeof obj.passed === 'boolean'
        ? obj.passed
        : String(obj.passed ?? obj.status ?? '')
            .toLowerCase()
            .match(/^(true|pass|passed|yes|ok|đạt)$/) !== null;

    const evidence = String(obj.evidence ?? obj.quote ?? obj.detail ?? '').trim();
    const fixAction = String(obj.fixAction ?? obj.howToFix ?? obj.fix ?? '').trim();
    const customTitle = String(obj.ruleTitle ?? '').trim();

    results.push({
      ruleId: expectedId,
      ruleTitle: customTitle || CC_RULE_TITLES[expectedId],
      passed,
      evidence: evidence || (passed ? 'Đạt yêu cầu ở đoạn này.' : 'Chưa đạt quy luật này.'),
      fixAction: !passed && fixAction ? fixAction : undefined,
    });
  }

  return results;
}

function calibrateCcBandFromChecklist(
  rawCcBand: number,
  checklist: CcChecklistItem[],
  taskBand: number
): number {
  // Nếu bài lạc đề / tiếng Việt / quá sơ sài (TA/TR <= 4.5) thì không nâng điểm CC theo công thức
  if (checklist.length < 5 || taskBand <= 4.5 || rawCcBand <= 4.5) {
    return rawCcBand;
  }

  const passedCount = checklist.filter((r) => r.passed).length;
  if (passedCount === 5) {
    return rawCcBand >= 9.0 ? 9.0 : 8.5;
  }
  if (passedCount === 4) {
    return Math.min(8.0, Math.max(7.5, rawCcBand));
  }
  if (passedCount === 3) {
    return Math.min(7.5, Math.max(7.0, rawCcBand));
  }
  if (passedCount === 2) {
    return Math.min(6.5, Math.max(6.0, rawCcBand));
  }
  return Math.min(6.0, rawCcBand);
}

export function normalizeGradeResult(raw: any): BodyGradeResult {
  const rawCriteria = raw?.criteria || {};
  const ccChecklist = normalizeCcChecklist(raw?.ccChecklist);

  const taskCrit = normalizeSingleCriterion(
    rawCriteria.task ?? rawCriteria.ta ?? rawCriteria.tr ?? rawCriteria.TA ?? rawCriteria.TR ?? rawCriteria.TASK,
    'Tiêu chí nội dung',
    MIN_TASK_BAND
  );
  const rawCcCrit = normalizeSingleCriterion(
    rawCriteria.cc ?? rawCriteria.CC,
    'Coherence & Cohesion',
    MIN_CC_BAND
  );
  const calibratedCcBand = calibrateCcBandFromChecklist(rawCcCrit.band, ccChecklist, taskCrit.band);
  const ccCrit: CriterionFeedback = {
    ...rawCcCrit,
    band: calibratedCcBand,
    passed75: calibratedCcBand >= MIN_CC_BAND,
  };

  const graCrit = normalizeSingleCriterion(
    rawCriteria.gra ?? rawCriteria.GRA,
    'Grammatical Range & Accuracy',
    MIN_GRA_BAND
  );
  const lrCrit = normalizeSingleCriterion(
    rawCriteria.lr ?? rawCriteria.LR,
    'Lexical Resource',
    MIN_LR_BAND
  );

  const { overallBand, passed } = isBodyPassedTarget({
    task: taskCrit.band,
    cc: ccCrit.band,
    gra: graCrit.band,
    lr: lrCrit.band,
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

  const ccFlowAudit = normalizeCcFlowAudit(raw?.ccFlowAudit);

  const tutorClosingNote =
    typeof raw?.tutorClosingNote === 'string' && raw.tutorClosingNote.trim()
      ? raw.tutorClosingNote.trim()
      : undefined;

  // Chỉ mở khóa modelUpgrade khi đã đạt chuẩn Band 8.0 (8.0 / 8.5 / 8.0 / 7.5)
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
      gra: graCrit,
      lr: lrCrit,
    },
    ccChecklist: ccChecklist.length > 0 ? ccChecklist : undefined,
    ccFlowAudit: ccFlowAudit.length > 0 ? ccFlowAudit : undefined,
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
          ? 'Đoạn văn đã đạt chuẩn mục tiêu (TA/TR ≥ 8.0, CC ≥ 8.5, GRA ≥ 8.0, LR ≥ 7.5 — Overall ≥ 8.0).'
          : 'Đoạn văn chưa đạt mục tiêu (TA/TR ≥ 8.0, CC ≥ 8.5, GRA ≥ 8.0, LR ≥ 7.5). Hãy đối chiếu bảng 5 quy luật CC & từng tiêu chí bên dưới để sửa lại.',
    tutorClosingNote,
    modelUpgrade,
  };
}

export function normalizeFullEssayGradeResult(raw: any): FullEssayGradeResult {
  const base = normalizeGradeResult(raw);

  const paragraphBreakdown: FullEssayParagraphFeedback[] = Array.isArray(raw?.paragraphBreakdown)
    ? raw.paragraphBreakdown
      .filter((p: any) => p && (p.label || p.strengths || p.weaknesses || p.suggestedEdit))
      .map((p: any, idx: number) => ({
        label: String(p.label || `Đoạn ${idx + 1}`).trim(),
        role: String(p.role || '').trim(),
        strengths: String(p.strengths || '').trim(),
        weaknesses: String(p.weaknesses || '').trim(),
        suggestedEdit: String(p.suggestedEdit || '').trim(),
      }))
    : [];

  const repetitionAlerts: string[] = Array.isArray(raw?.repetitionAlerts)
    ? raw.repetitionAlerts.map((r: any) => String(r).trim()).filter(Boolean)
    : [];

  const modelUpgrade = base.modelUpgrade;

  return {
    overallBand: base.overallBand,
    passed: base.passed,
    criteria: base.criteria,
    ccChecklist: base.ccChecklist,
    ccFlowAudit: base.ccFlowAudit,
    wholeEssayStructureFeedback:
      typeof raw?.wholeEssayStructureFeedback === 'string' && raw.wholeEssayStructureFeedback.trim()
        ? raw.wholeEssayStructureFeedback.trim()
        : base.crossBodyFeedback,
    paragraphBreakdown,
    repetitionAlerts,
    grammarErrors: base.grammarErrors,
    vocabularyTips: base.vocabularyTips,
    generalFeedback:
      typeof raw?.generalFeedback === 'string' && raw.generalFeedback.trim()
        ? raw.generalFeedback.trim()
        : base.passed
          ? 'Bài viết toàn bài đã đạt chuẩn (TA/TR ≥ 8.0, CC ≥ 8.5, GRA ≥ 8.0, LR ≥ 7.5 — Overall ≥ 8.0) và được lưu vào Bài đã hoàn tất!'
          : 'Bài viết toàn bài chưa đạt ngưỡng (TA/TR ≥ 8.0, CC ≥ 8.5, GRA ≥ 8.0, LR ≥ 7.5). Hãy sửa theo bảng 5 quy luật CC, phân tích từng đoạn & lời chốt gia sư bên dưới rồi chấm lại.',
    tutorClosingNote: base.tutorClosingNote,
    modelUpgrade,
  };
}
