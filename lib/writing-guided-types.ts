// lib/writing-guided-types.ts
// Hệ thống kiểu dữ liệu & chuẩn hóa cho luồng luyện IELTS Writing Aim 6.5+:
// 1. User nhập đề (Task 1 cho phép Ctrl+V dán ảnh hoặc tải ảnh lên; Task 2 dán đề) + tự viết dàn ý tiếng Việt & tự chia đoạn.
// 2. Gia sư AI kiểm định TA/TR (cần >= 7.0; nếu < 7.0 -> feedback để user bổ sung).
// 3. Gia sư AI dựng Template siêu chi tiết nguyên bài (GRA > 7.0, CC > 7.0, Conjunction Band 8.0, gợi ý ngữ pháp khó & chỗ thay thế, không lạm dụng từ cao siêu).
// 4. User confirm -> tự tra từ vựng & tự viết nguyên bài -> Gia sư AI chấm điểm chính xác theo Cambridge Band Descriptors (mục tiêu >= 6.5).

export type GuidedTaskType = 'task1' | 'task2';

export const CAMBRIDGE_TARGET_BAND = 6.5;
export const OUTLINE_TASK_GATE_BAND = 7.0;

export interface UserOutlineParagraph {
  id: string;
  heading: string; // VD: "Đoạn 1 — Mở bài (Introduction)"
  ideasVi: string; // Dàn ý tiếng Việt của học viên cho đoạn này
}

export interface OutlineParagraphFeedback {
  paragraphIndex: number;
  heading: string;
  status: 'strong' | 'needs_addition' | 'off_track';
  commentVi: string;
  whatToAddVi?: string;
}

export interface OutlineParagraphPlan {
  paragraphIndex: number;
  heading: string;
  roleVi: string;
  targetSentences: number;
  targetWordRange: string;
  ccStrategyVi: string;
  graStrategyVi: string;
}

export interface OutlineEvaluationResult {
  estimatedTaskBand: number; // 0.0 - 9.0 (bước 0.5)
  passedTask7: boolean;      // estimatedTaskBand >= 7.0
  detectedType: string;      // VD: "Line Graph (Dynamic)" / "Opinion — Agree or Disagree"
  chartOrPromptSummaryEn: string; // Tóm tắt chính xác đề/số liệu ảnh (dùng lại cho bước dựng template để tiết kiệm token)
  verdictVi: string;         // Nhận xét tổng quan TA/TR của dàn ý
  strengthsVi: string[];
  missingElementsVi: string[]; // Các yêu cầu đề bài còn thiếu hoặc hời hợt (nếu < 7.0)
  paragraphFeedback: OutlineParagraphFeedback[];
  paragraphPlans: OutlineParagraphPlan[];
}

export interface TemplateSlotGuide {
  slotLabel: string;        // Khớp tên trong templateSkeleton, VD: "[SLOT 1: xu hướng chính]"
  whatToPutVi: string;      // Ráp ý nào của user vào ô này
  grammaticalForm: string;  // VD: "Noun Phrase / V-ing" | "Clause (S + V thì quá khứ)"
  plainKeywordsHint: string[]; // Gợi ý 2-3 hướng từ đơn giản B1-B2 để user tự tra từ (không khoe chữ C2)
  replaceableWith: string;  // Có thể thay bằng cấu trúc / cụm gì khác nếu muốn đổi nhịp
}

export interface ConjunctionBand8Guide {
  usedConnector: string;    // VD: "While ... , ...", ", thereby + V-ing", "This upward trend ..."
  whyBand8Vi: string;       // Vì sao đạt CC > 7.0 / Band 8.0 & nối với câu trước ra sao
  alternatives: string[];   // 2-3 conjunction Band 8 khác thay thế được
}

export interface AdvancedGrammarGuide {
  structureName: string;    // VD: "Mệnh đề quan hệ không xác định (, which + V)"
  formula: string;          // Công thức khung rõ ràng
  accuracyWatchoutVi: string; // Nhắc bẫy sai ngữ pháp khi ráp vào
}

export interface TemplateSentenceGuide {
  sentenceNumber: number;
  purposeVi: string;        // Câu này phục vụ ý nào trong dàn ý tiếng Việt của học viên
  templateSkeleton: string; // Khung tiếng Anh siêu chi tiết có [SLOT 1: ...], KHÔNG lạm dụng từ C2
  slots: TemplateSlotGuide[];
  conjunctionBand8: ConjunctionBand8Guide;
  advancedGrammar: AdvancedGrammarGuide;
}

export interface DetailedParagraphTemplate {
  paragraphIndex: number;
  userHeading: string;
  userOutlineVi: string;
  paragraphRoleVi: string;
  targetWordRange: string;
  targetSentenceCount: number;
  ccParagraphBridgeVi: string; // Cách chuyển mạch sang đoạn này (Band 8.0)
  sentences: TemplateSentenceGuide[];
  assembledParagraphTemplate: string; // Ghép liền các câu template thành nguyên đoạn hoàn chỉnh có [SLOT]
}

export interface TemplateSubstitutionItem {
  locationVi: string;       // Vị trí dễ bị lặp trong bài
  originalPattern: string;  // Cụm / conjunction / khung câu dùng lần 1
  alternatives: string[];   // Gợi ý thay thế ở các đoạn sau
  whyReplaceVi: string;     // Lý do thay để giữ CC & GRA > 7.0
}

export interface DetailedEssayTemplate {
  overallStrategyVi: string;
  targetWordCount: string;
  paragraphs: DetailedParagraphTemplate[];
  substitutionMatrix: TemplateSubstitutionItem[];
}

// ─── Cambridge Official Band Descriptor Grading Result (Target >= 6.5) ───

export interface CambridgeSentenceFix {
  location: string;         // VD: "Đoạn 2 — Câu 3"
  issueType: 'add' | 'replace' | 'fix_error';
  originalSentence: string; // Nguyên câu gốc của học viên
  fixedSentence: string;    // Nguyên câu hoàn chỉnh sau khi sửa (đúng 100% ngữ pháp)
  explanationVi: string;    // Giải thích rõ vì sao sửa theo chuẩn Cambridge
  suggestedPhrases?: string[];
}

export interface CambridgeCriterionScore {
  band: number;
  cambridgeDescriptorMatchVi: string; // Bài đang khớp đúng mô tả nào của Cambridge Band Descriptors ở mức điểm này
  reasonVi: string;                   // Phân tích cụ thể vì sao đạt band này (và vì sao chưa lên +0.5)
  strengthsVi: string[];
  weaknessesVi: string[];
  fixes: CambridgeSentenceFix[];
}

export interface CambridgeGrammarError {
  originalSentence: string;
  fixedSentence: string;
  errorType: string;
  explanationVi: string;
}

export interface CambridgeVocabTip {
  usedPhrase: string;
  betterAlternative: string;
  reasonVi: string;
}

export interface CambridgeParagraphReview {
  paragraphLabel: string;
  strengthsVi: string;
  weaknessesVi: string;
  howToImproveVi: string;
}

export interface CambridgeGradeResult {
  overallBand: number; // Làm tròn chuẩn Cambridge (.25 -> .5, .75 -> .0)
  passedTarget65: boolean;
  criteria: {
    task: CambridgeCriterionScore;
    cc: CambridgeCriterionScore;
    lr: CambridgeCriterionScore;
    gra: CambridgeCriterionScore;
  };
  advancedGrammarUsedWell: string[];
  grammarErrors: CambridgeGrammarError[];
  vocabularyTips: CambridgeVocabTip[];
  paragraphReviews: CambridgeParagraphReview[];
  templateUsageFeedbackVi: string; // Nhận xét cách học viên ráp ý tưởng & từ vựng vào template
  tutorOverallFeedbackVi: string;  // Nhận xét chung sâu sắc của Gia sư AI (ưu tiên sửa gì ngay)
  top3PrioritiesVi: string[];      // 3 đầu việc ưu tiên sửa nhất để kéo vững >= 6.5 / 7.0
  gradedAt?: string;
}

export interface GuidedWritingSession {
  id: string;
  taskType: GuidedTaskType;
  promptText: string;
  imageThumbUrl?: string;
  detectedType?: string;
  userParagraphs: UserOutlineParagraph[];
  evaluation: OutlineEvaluationResult;
  template: DetailedEssayTemplate;
  essayText: string;
  wordCount: number;
  latestGrade: CambridgeGradeResult;
  attemptCount: number;
  createdAt: string;
  updatedAt: string;
}

// ─── Helper & Normalizer Functions ───

export function clampBandHalf(val: unknown, fallback = 6.0): number {
  const num = Number(val);
  if (!Number.isFinite(num)) return fallback;
  const clamped = Math.max(0, Math.min(9, num));
  return Math.round(clamped * 2) / 2;
}

/**
 * Công thức làm tròn Overall chuẩn chính thức của Cambridge IELTS:
 * Trung bình cộng 4 tiêu chí, .25 làm tròn lên .5, .75 làm tròn lên .0.
 */
export function roundCambridgeOverall(
  task: number,
  cc: number,
  lr: number,
  gra: number
): number {
  const avg = (task + cc + lr + gra) / 4;
  return Math.round(avg * 2) / 2;
}

export function createDefaultParagraphs(taskType: GuidedTaskType): UserOutlineParagraph[] {
  if (taskType === 'task1') {
    return [
      { id: 'p-1', heading: 'Đoạn 1 — Mở bài (Introduction)', ideasVi: '' },
      { id: 'p-2', heading: 'Đoạn 2 — Tổng quan (Overview)', ideasVi: '' },
      { id: 'p-3', heading: 'Đoạn 3 — Thân bài 1 (Detail 1)', ideasVi: '' },
      { id: 'p-4', heading: 'Đoạn 4 — Thân bài 2 (Detail 2)', ideasVi: '' },
    ];
  }
  return [
    { id: 'p-1', heading: 'Đoạn 1 — Mở bài (Introduction)', ideasVi: '' },
    { id: 'p-2', heading: 'Đoạn 2 — Thân bài 1 (Body 1)', ideasVi: '' },
    { id: 'p-3', heading: 'Đoạn 3 — Thân bài 2 (Body 2)', ideasVi: '' },
    { id: 'p-4', heading: 'Đoạn 4 — Kết bài (Conclusion)', ideasVi: '' },
  ];
}

function asStringArray(val: unknown): string[] {
  if (!Array.isArray(val)) return [];
  return val.map((x) => String(x || '').trim()).filter(Boolean);
}

export function normalizeOutlineEvaluation(
  raw: any,
  userParagraphs: UserOutlineParagraph[]
): OutlineEvaluationResult {
  const band = clampBandHalf(raw?.estimatedTaskBand, 6.0);
  const passedTask7 = band >= OUTLINE_TASK_GATE_BAND;

  const rawFeedback = Array.isArray(raw?.paragraphFeedback) ? raw.paragraphFeedback : [];
  const paragraphFeedback: OutlineParagraphFeedback[] = userParagraphs.map((up, idx) => {
    const found =
      rawFeedback.find((f: any) => Number(f?.paragraphIndex) === idx) ??
      rawFeedback[idx] ??
      {};
    const st = String(found?.status || '');
    const status: OutlineParagraphFeedback['status'] =
      st === 'strong' || st === 'needs_addition' || st === 'off_track'
        ? st
        : passedTask7
          ? 'strong'
          : 'needs_addition';
    return {
      paragraphIndex: idx,
      heading: String(found?.heading || up.heading),
      status,
      commentVi: String(found?.commentVi || '').trim() || 'Đã tiếp nhận ý tưởng của đoạn này.',
      whatToAddVi: found?.whatToAddVi ? String(found.whatToAddVi).trim() : undefined,
    };
  });

  const rawPlans = Array.isArray(raw?.paragraphPlans) ? raw.paragraphPlans : [];
  const paragraphPlans: OutlineParagraphPlan[] = userParagraphs.map((up, idx) => {
    const found =
      rawPlans.find((p: any) => Number(p?.paragraphIndex) === idx) ??
      rawPlans[idx] ??
      {};
    const targetSentences = Math.max(
      1,
      Math.min(6, Math.round(Number(found?.targetSentences) || (idx === 0 ? 2 : 3)))
    );
    return {
      paragraphIndex: idx,
      heading: String(found?.heading || up.heading),
      roleVi: String(found?.roleVi || up.heading).trim(),
      targetSentences,
      targetWordRange: String(found?.targetWordRange || '50–80 từ').trim(),
      ccStrategyVi: String(found?.ccStrategyVi || '').trim(),
      graStrategyVi: String(found?.graStrategyVi || '').trim(),
    };
  });

  return {
    estimatedTaskBand: band,
    passedTask7,
    detectedType: String(raw?.detectedType || 'IELTS Academic Writing').trim(),
    chartOrPromptSummaryEn: String(raw?.chartOrPromptSummaryEn || '').trim(),
    verdictVi:
      String(raw?.verdictVi || '').trim() ||
      (passedTask7
        ? 'Dàn ý của bạn đã đủ chiều sâu và bám sát yêu cầu đề ở mức TA/TR >= 7.0.'
        : 'Dàn ý hiện chưa chạm mức TA/TR 7.0. Hãy bổ sung thêm các điểm gợi ý bên dưới rồi gửi kiểm tra lại.'),
    strengthsVi: asStringArray(raw?.strengthsVi),
    missingElementsVi: asStringArray(raw?.missingElementsVi),
    paragraphFeedback,
    paragraphPlans,
  };
}

export function normalizeDetailedParagraphTemplate(
  raw: any,
  userParagraph: UserOutlineParagraph,
  paragraphIndex: number
): DetailedParagraphTemplate {
  const rawSentences = Array.isArray(raw?.sentences) ? raw.sentences : [];
  const sentences: TemplateSentenceGuide[] = rawSentences
    .map((s: any, sIdx: number): TemplateSentenceGuide => {
      const rawSlots = Array.isArray(s?.slots) ? s.slots : [];
      const slots: TemplateSlotGuide[] = rawSlots
        .map((sl: any) => ({
          slotLabel: String(sl?.slotLabel || '').trim(),
          whatToPutVi: String(sl?.whatToPutVi || '').trim(),
          grammaticalForm: String(sl?.grammaticalForm || 'Cụm từ / Mệnh đề phù hợp').trim(),
          plainKeywordsHint: asStringArray(sl?.plainKeywordsHint),
          replaceableWith: String(sl?.replaceableWith || '').trim(),
        }))
        .filter((sl: TemplateSlotGuide) => sl.slotLabel || sl.whatToPutVi);

      const conj = s?.conjunctionBand8 || {};
      const gram = s?.advancedGrammar || {};

      return {
        sentenceNumber: Number(s?.sentenceNumber) || sIdx + 1,
        purposeVi: String(s?.purposeVi || `Triển khai ý câu ${sIdx + 1}`).trim(),
        templateSkeleton: String(s?.templateSkeleton || '').trim(),
        slots,
        conjunctionBand8: {
          usedConnector: String(conj?.usedConnector || 'Liên kết mạch ý tự nhiên').trim(),
          whyBand8Vi: String(conj?.whyBand8Vi || '').trim(),
          alternatives: asStringArray(conj?.alternatives),
        },
        advancedGrammar: {
          structureName: String(gram?.structureName || 'Câu phức chuẩn GRA > 7.0').trim(),
          formula: String(gram?.formula || '').trim(),
          accuracyWatchoutVi: String(gram?.accuracyWatchoutVi || '').trim(),
        },
      };
    })
    .filter((s: TemplateSentenceGuide) => Boolean(s.templateSkeleton));

  const assembled =
    String(raw?.assembledParagraphTemplate || '').trim() ||
    sentences.map((s) => s.templateSkeleton).join(' ');

  return {
    paragraphIndex,
    userHeading: String(raw?.userHeading || userParagraph.heading).trim(),
    userOutlineVi: userParagraph.ideasVi,
    paragraphRoleVi: String(raw?.paragraphRoleVi || userParagraph.heading).trim(),
    targetWordRange: String(raw?.targetWordRange || '50–80 từ').trim(),
    targetSentenceCount: sentences.length || Math.max(1, Number(raw?.targetSentenceCount) || 2),
    ccParagraphBridgeVi: String(raw?.ccParagraphBridgeVi || '').trim(),
    sentences,
    assembledParagraphTemplate: assembled,
  };
}

export function normalizeDetailedTemplate(
  paragraphs: DetailedParagraphTemplate[],
  meta: {
    overallStrategyVi?: string;
    targetWordCount?: string;
    substitutionMatrix?: any[];
  },
  taskType: GuidedTaskType
): DetailedEssayTemplate {
  const sorted = [...paragraphs].sort((a, b) => a.paragraphIndex - b.paragraphIndex);
  const rawSubs = Array.isArray(meta.substitutionMatrix) ? meta.substitutionMatrix : [];
  const substitutionMatrix: TemplateSubstitutionItem[] = rawSubs
    .map((item: any) => ({
      locationVi: String(item?.locationVi || '').trim(),
      originalPattern: String(item?.originalPattern || '').trim(),
      alternatives: asStringArray(item?.alternatives),
      whyReplaceVi: String(item?.whyReplaceVi || '').trim(),
    }))
    .filter((item) => item.originalPattern && item.alternatives.length > 0);

  return {
    overallStrategyVi:
      String(meta.overallStrategyVi || '').trim() ||
      'Template đã được thiết kế chuẩn GRA > 7.0, CC > 7.0 với hệ thống conjunction Band 8.0 và từ ngữ trong sáng để bạn tự ráp ý tưởng & từ vựng của mình.',
    targetWordCount:
      String(meta.targetWordCount || '').trim() ||
      (taskType === 'task1' ? '160–190 từ' : '265–310 từ'),
    paragraphs: sorted,
    substitutionMatrix,
  };
}

function normalizeCambridgeCriterion(raw: any): CambridgeCriterionScore {
  const band = clampBandHalf(raw?.band, 6.0);
  const rawFixes = Array.isArray(raw?.fixes) ? raw.fixes : [];
  const fixes: CambridgeSentenceFix[] = rawFixes
    .map((f: any): CambridgeSentenceFix => {
      const t = String(f?.issueType || '');
      const issueType: CambridgeSentenceFix['issueType'] =
        t === 'add' || t === 'replace' || t === 'fix_error' ? t : 'replace';
      return {
        location: String(f?.location || 'Trong bài viết').trim(),
        issueType,
        originalSentence: String(f?.originalSentence || '').trim(),
        fixedSentence: String(f?.fixedSentence || '').trim(),
        explanationVi: String(f?.explanationVi || '').trim(),
        suggestedPhrases: asStringArray(f?.suggestedPhrases),
      };
    })
    .filter((f: CambridgeSentenceFix) => f.explanationVi || f.fixedSentence);

  return {
    band,
    cambridgeDescriptorMatchVi: String(raw?.cambridgeDescriptorMatchVi || '').trim(),
    reasonVi: String(raw?.reasonVi || '').trim(),
    strengthsVi: asStringArray(raw?.strengthsVi),
    weaknessesVi: asStringArray(raw?.weaknessesVi),
    fixes,
  };
}

export function normalizeCambridgeGradeResult(raw: any): CambridgeGradeResult {
  const task = normalizeCambridgeCriterion(raw?.criteria?.task);
  const cc = normalizeCambridgeCriterion(raw?.criteria?.cc);
  const lr = normalizeCambridgeCriterion(raw?.criteria?.lr);
  const gra = normalizeCambridgeCriterion(raw?.criteria?.gra);

  const overallBand = roundCambridgeOverall(task.band, cc.band, lr.band, gra.band);

  const grammarErrors: CambridgeGrammarError[] = Array.isArray(raw?.grammarErrors)
    ? raw.grammarErrors
        .map((g: any) => ({
          originalSentence: String(g?.originalSentence || g?.original || '').trim(),
          fixedSentence: String(g?.fixedSentence || g?.corrected || '').trim(),
          errorType: String(g?.errorType || 'Lỗi ngữ pháp').trim(),
          explanationVi: String(g?.explanationVi || g?.explanation || '').trim(),
        }))
        .filter((g: CambridgeGrammarError) => g.originalSentence || g.fixedSentence)
    : [];

  const vocabularyTips: CambridgeVocabTip[] = Array.isArray(raw?.vocabularyTips)
    ? raw.vocabularyTips
        .map((v: any) => ({
          usedPhrase: String(v?.usedPhrase || v?.used || '').trim(),
          betterAlternative: String(v?.betterAlternative || v?.better || '').trim(),
          reasonVi: String(v?.reasonVi || v?.reason || '').trim(),
        }))
        .filter((v: CambridgeVocabTip) => v.usedPhrase || v.betterAlternative)
    : [];

  const paragraphReviews: CambridgeParagraphReview[] = Array.isArray(raw?.paragraphReviews)
    ? raw.paragraphReviews
        .map((p: any) => ({
          paragraphLabel: String(p?.paragraphLabel || p?.label || '').trim(),
          strengthsVi: String(p?.strengthsVi || p?.strengths || '').trim(),
          weaknessesVi: String(p?.weaknessesVi || p?.weaknesses || '').trim(),
          howToImproveVi: String(p?.howToImproveVi || p?.suggestedEdit || '').trim(),
        }))
        .filter((p: CambridgeParagraphReview) => p.paragraphLabel)
    : [];

  return {
    overallBand,
    passedTarget65: overallBand >= CAMBRIDGE_TARGET_BAND,
    criteria: { task, cc, lr, gra },
    advancedGrammarUsedWell: asStringArray(raw?.advancedGrammarUsedWell),
    grammarErrors,
    vocabularyTips,
    paragraphReviews,
    templateUsageFeedbackVi: String(raw?.templateUsageFeedbackVi || '').trim(),
    tutorOverallFeedbackVi: String(raw?.tutorOverallFeedbackVi || '').trim(),
    top3PrioritiesVi: asStringArray(raw?.top3PrioritiesVi).slice(0, 4),
    gradedAt: new Date().toISOString(),
  };
}
