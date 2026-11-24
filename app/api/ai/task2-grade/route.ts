export const maxDuration = 60;

import { NextRequest, NextResponse } from 'next/server';
import {
  formatGeminiError,
  generateJsonWithFallback,
  isLengthOrTransientError,
} from '@/lib/gemini-helper';
import {
  buildAlignedCriteriaDirectives,
  buildGraLrPhaseSchema,
  buildPreviousAttemptBlock,
  buildTaskCcPhaseSchema,
  buildTutorClosingPhaseSchema,
  buildUnifiedGradeJsonSchema,
} from '@/lib/writing-grade-prompt';
import {
  countWords,
  normalizeGradeResult,
  type OutlineBodyItem,
  type PreviousAttemptSummary,
  TASK2_BODY_TEMPLATES,
} from '@/lib/writing-practice-types';

interface PreviousBodyInput {
  bodyIndex: number;
  label?: string;
  role?: string;
  content: string;
}

type GradePhase = 'full' | 'task-cc' | 'gra-lr' | 'tutor-closing';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      prompt: task2Prompt,
      essayType,
      outline,
      previousBodies = [],
      bodyIndex,
      content,
      previousAttempt,
      phase = 'full',
      phase1Context,
      criteriaContext,
    }: {
      prompt: string;
      essayType?: string;
      outline?: OutlineBodyItem[];
      previousBodies?: PreviousBodyInput[];
      bodyIndex: number;
      content: string;
      previousAttempt?: PreviousAttemptSummary | null;
      phase?: GradePhase;
      phase1Context?: any;
      criteriaContext?: any;
    } = body;

    if (
      !task2Prompt?.trim() ||
      typeof bodyIndex !== 'number' ||
      bodyIndex < 0 ||
      bodyIndex > 4 ||
      !content?.trim()
    ) {
      return NextResponse.json(
        { error: 'Thiếu đề bài Task 2, chỉ số body hoặc nội dung bài viết.' },
        { status: 400 }
      );
    }

    const cleanContent = content.trim();
    if (countWords(cleanContent) < 10) {
      return NextResponse.json(
        { error: 'Đoạn văn quá ngắn (cần tối thiểu 10 từ tiếng Anh) để AI chấm theo chuẩn Band 8.0.' },
        { status: 400 }
      );
    }

    const currentTemplate = TASK2_BODY_TEMPLATES[bodyIndex];
    const currentOutline = Array.isArray(outline) ? outline[bodyIndex] : undefined;

    const fullOutlineSummary = Array.isArray(outline)
      ? outline
        .map((o, idx) => `- Body ${idx + 1} (${o.role}): ${(o.viGuide || []).join(' | ')}`)
        .join('\n')
      : 'Không có dàn ý đính kèm.';

    const previousBodiesText =
      Array.isArray(previousBodies) && previousBodies.length > 0
        ? previousBodies
          .map(
            (pb) =>
              `[Body ${pb.bodyIndex + 1} — ${pb.role || TASK2_BODY_TEMPLATES[pb.bodyIndex]?.role || ''}]:\n"${pb.content}"`
          )
          .join('\n\n')
        : 'Chưa có body nào trước đó (đây là Body 1 — phần mở bài).';

    const previousAttemptBlock = buildPreviousAttemptBlock(previousAttempt);

    const sharedContext = `
Bạn là một cựu giám khảo IELTS Academic Writing & GIA SƯ KÈM 1-1 chuyên nâng học viên từ Band 6.0 lên Band 8.0, chấm điểm BÁM SÁT 100% **Official IELTS Writing Band Descriptors (May 2023)**.
Học viên đang luyện viết IELTS Writing Task 2 theo cấu trúc **5 Body** (Body 1 Intro, Body 2-4 Thân bài 1-3, Body 5 Conclusion).
Mục tiêu BẮT BUỘC để vượt qua Body này là **Overall >= 8.0** theo đúng ma trận: **TR >= 8.0 · CC >= 8.5 · GRA >= 8.0 · LR >= 7.5**.

=== ĐỀ BÀI TASK 2 CỦA NGƯỜI DÙNG ===
"${task2Prompt.trim()}"
Dạng đề nhận diện: ${essayType || 'IELTS Task 2'}

=== TOÀN BỘ DÀN Ý 5 BODY (TIẾNG VIỆT) ===
${fullOutlineSummary}

=== CÁC BODY HỌC VIÊN ĐÃ VIẾT & ĐẠT TRƯỚC ĐÓ ===
${previousBodiesText}
${previousAttemptBlock}
=== BODY HIỆN TẠI ĐANG CHẤM ===
- Vị trí: ${currentTemplate.label} (${currentOutline?.role || currentTemplate.role})
- Dàn ý tiếng Việt cho Body này: ${currentOutline ? JSON.stringify(currentOutline.viGuide) : 'Theo chuẩn IELTS Task 2'}
- Lưu ý chiến lược của dàn ý: ${currentOutline?.bandStrategy ? JSON.stringify(currentOutline.bandStrategy) : 'TR >= 8.0, CC >= 8.5, GRA >= 8.0, LR >= 7.5'}
- Từ vựng & ngữ pháp đã gợi ý: ${currentOutline ? JSON.stringify({ ideaGuides: currentOutline.ideaGuides || [], vocab: currentOutline.vocabSuggestions || [], grammar: currentOutline.grammarSuggestions || [] }) : 'Theo đề bài'}
- Bài viết tiếng Anh của học viên cho Body ${bodyIndex + 1}:
"""
${cleanContent}
"""

=== RUBRIC CHẤM BÁM SÁT OFFICIAL IELTS BAND DESCRIPTORS MAY 2023 (TR 8.0 · CC 8.5 · GRA 8.0 · LR 7.5) ===
1. "task" — Task Response (TR) [MỤC TIÊU >= 8.0 — Official Band 8]:
   - "The prompt is appropriately and sufficiently addressed. A clear and well-developed position is presented. Ideas are relevant, well extended and supported."
   - Body 1 (Intro): Paraphrase sắc gọn + Thesis Statement trả lời TRỰC DIỆN mọi vế câu hỏi, nêu rõ lập trường & lộ trình các thân bài.
   - Body 2, 3, 4 (Thân bài 1, 2, 3): Đủ Topic Sentence bám Thesis -> Cơ chế nhân-quả SÂU ("tại sao & bằng cách nào thực sự xảy ra") -> Ví dụ/bối cảnh thực tế thuyết phục -> Chốt luận điểm. Thiếu chiều sâu, bịa thống kê ảo ("80%..."), trùng ý previousBodies hoặc tự mâu thuẫn Thesis -> TRẦN TR <= 6.5–7.0.
   - Body 5 (Conclusion): Tổng hợp trọn vẹn mạch Body 2–4 & khẳng định Thesis, KHÔNG thêm ý mới.
2. "cc" — Coherence and Cohesion (CC) [MỤC TIÊU >= 8.5 — CHẤM CỐ ĐỊNH THEO 5 QUY LUẬT R1..R5]:
   - BẮT BUỘC kiểm tra minh bạch 5 quy luật R1..R5 trong "ccChecklist" và quy đổi điểm cố định: **5/5 = 8.5–9.0** | **4/5 = 7.5–8.0** | **3/5 = 7.0–7.5** | **<=2/5 = 5.5–6.5**.
   - Dùng 0 hoặc 1 từ nối tự nhiên hợp ngữ cảnh ("For instance,", "As a result,") + phép quy chiếu rõ ("such policies", "this financial strain", "doing so") + không dùng "Firstly/Secondly/Moreover/Furthermore" đầu câu = ĐẠT R4 100%!
3. "gra" — Grammatical Range and Accuracy (GRA) [MỤC TIÊU >= 8.0 — Official Band 8]:
   - "A wide range of structures is flexibly and accurately used; the majority of sentences are error-free (>75%)". Phối hợp tự nhiên câu đơn sắc gọn + đa dạng câu phức (While/Although/Whereas, ", which + V", phân từ, câu điều kiện), kiểm soát chuẩn mạo từ, giới từ, chia động từ, dấu câu.
4. "lr" — Lexical Resource (LR) [MỤC TIÊU >= 7.5 — Official Band 7–8 Bridge]:
   - Vốn từ B2 vững + 2–3 cụm collocation học thuật tự nhiên bám sát chủ đề đề bài ("ease the financial burden on", "widen access to", "allocate public funds", "pose a serious challenge to"), xoay vòng paraphrase tránh lặp từ, văn phong trang trọng chuẩn mực, rất ít lỗi word choice / word formation. Không ép từ C2 hoa mỹ học vẹt!
- Nếu viết tiếng Việt, sơ sài hoặc lạc đề -> <= 4.0. Thang điểm 0.0–9.0 (bước 0.5).
`;

    // ─── CHUNKED PHASE HANDLERS ───
    if (phase === 'task-cc') {
      const p1Prompt = `${sharedContext}
${buildAlignedCriteriaDirectives({ taskType: 'task2', isFullEssay: false })}
NHIỆM VỤ BƯỚC 1/3: Chấm & bóc tách SIÊU CHI TIẾT 2 tiêu chí **TR (>= 8.0)** và **CC (>= 8.5)** kèm "ccChecklist" (5 quy luật R1..R5), "ccFlowAudit" và "crossBodyFeedback".
Trả về DUY NHẤT JSON hợp lệ:
${buildTaskCcPhaseSchema({
        taskShort: 'TR',
        extraFieldsSchema: `"crossBodyFeedback": "Nhận xét chi tiết bằng tiếng Việt về liên kết của Body này với các Body trước đó (khớp lộ trình Thesis Body 1, nối mạch lập luận chưa)."`,
      })}`;

      const { data } = await generateJsonWithFallback(
        p1Prompt,
        `task2-grade:p1:body-${bodyIndex + 1}`,
        (parsed) => {
          if (!parsed?.criteria?.task || !parsed?.criteria?.cc) {
            throw new Error('Thiếu criteria.task hoặc criteria.cc');
          }
          return parsed;
        },
        {
          temperature: 0.1,
          maxOutputTokens: 4600,
          perModelTimeoutMs: 22_000,
          totalBudgetMs: 48_000,
          modelProfile: 'grading',
        }
      );
      return NextResponse.json(data, { status: 200 });
    }

    if (phase === 'gra-lr') {
      const p2Prompt = `${sharedContext}
=== KẾ HOẠCH ĐÃ CHẤM Ở BƯỚC 1 (BẮT BUỘC ĐỒNG BỘ 100%, KHÔNG MÂU THUẪN) ===
${JSON.stringify(phase1Context || {})}

${buildAlignedCriteriaDirectives({ taskType: 'task2', isFullEssay: false })}
NHIỆM VỤ BƯỚC 2/3: Chấm & bóc tách SIÊU CHI TIẾT 2 tiêu chí **GRA (>= 8.0)** và **LR (>= 7.5)** kèm "grammarErrors" và "vocabularyTips", ĐỒNG BỘ HOÀN TOÀN với kế hoạch sửa TR & CC ở trên.
Trả về DUY NHẤT JSON hợp lệ:
${buildGraLrPhaseSchema()}`;

      const { data } = await generateJsonWithFallback(
        p2Prompt,
        `task2-grade:p2:body-${bodyIndex + 1}`,
        (parsed) => {
          if (!parsed?.criteria?.gra || !parsed?.criteria?.lr) {
            throw new Error('Thiếu criteria.gra hoặc criteria.lr');
          }
          return parsed;
        },
        {
          temperature: 0.1,
          maxOutputTokens: 3600,
          perModelTimeoutMs: 22_000,
          totalBudgetMs: 48_000,
          modelProfile: 'grading',
        }
      );
      return NextResponse.json(data, { status: 200 });
    }

    if (phase === 'tutor-closing') {
      const p3Prompt = `${sharedContext}
=== KẾT QUẢ 4 TIÊU CHÍ & 5 QUY LUẬT CC ĐÃ CHẤM ===
${JSON.stringify(criteriaContext || {})}

NHIỆM VỤ BƯỚC 3/3: Đóng vai GIA SƯ IELTS WRITING THỰC THỤ kèm 1-1, viết "generalFeedback", đoạn chốt bóc tách chuyên sâu bằng tiếng Việt "tutorClosingNote" (160–240 từ, 3–4 đoạn tách bằng \\n\\n: chẩn đoán Band & điểm sáng, nêu rõ kết quả X/5 quy luật CC & độ chính xác LR 7.5, lộ trình ưu tiên sửa 1->2->3 ngay lần tới${previousAttempt ? ', ĐỐI CHIẾU RÕ tiến bộ và điểm còn sót so với bản nháp lần trước' : ''}), và "modelUpgrade" chuẩn TR 8.0+ / CC 8.5+ / GRA 8.0+ / LR 7.5+ tự nhiên.
Trả về DUY NHẤT JSON hợp lệ:
${buildTutorClosingPhaseSchema({
        taskShort: 'TR',
        modelUpgradeInstruction:
          'Phiên bản tham khảo chuẩn TR 8.0+ · CC 8.5+ · GRA 8.0+ · LR 7.5+ tự nhiên (hệ thống chỉ mở cho học viên xem sau khi đạt chuẩn Overall >= 8.0).',
      })}`;

      const { data } = await generateJsonWithFallback(
        p3Prompt,
        `task2-grade:p3:body-${bodyIndex + 1}`,
        (parsed) => {
          if (!parsed || (!parsed.tutorClosingNote && !parsed.generalFeedback)) {
            throw new Error('Thiếu tutorClosingNote/generalFeedback');
          }
          return parsed;
        },
        {
          temperature: 0.15,
          maxOutputTokens: 2400,
          perModelTimeoutMs: 20_000,
          totalBudgetMs: 46_000,
          modelProfile: 'fast',
        }
      );
      return NextResponse.json(data, { status: 200 });
    }

    // ─── DEFAULT FULL SINGLE-SHOT MODE (temperature 0.1 for deterministic grading!) ───
    const fullPrompt = `${sharedContext}
${buildAlignedCriteriaDirectives({ taskType: 'task2', isFullEssay: false })}

YÊU CẦU ĐẦU RA JSON (BẮT BUỘC CHỈ TRẢ VỀ JSON HỢP LỆ, KHÔNG MARKDOWN):
${buildUnifiedGradeJsonSchema({
      taskShort: 'TR',
      extraFieldsSchema: `"crossBodyFeedback": "Nhận xét chi tiết bằng tiếng Việt về liên kết của Body này với các Body trước đó (khớp lộ trình Thesis Body 1, nối mạch lập luận chưa).",`,
      modelUpgradeInstruction:
        'Phiên bản tham khảo chuẩn TR 8.0+ · CC 8.5+ · GRA 8.0+ · LR 7.5+ tự nhiên (hệ thống chỉ mở cho học viên xem sau khi đạt chuẩn Overall >= 8.0).',
    })}
`;

    try {
      const { data } = await generateJsonWithFallback(
        fullPrompt,
        `task2-grade:body-${bodyIndex + 1}`,
        (parsed) => {
          if (!parsed || !parsed.criteria) {
            throw new Error('AI trả về thiếu trường criteria');
          }
          return normalizeGradeResult(parsed);
        },
        {
          temperature: 0.1,
          maxOutputTokens: 8192,
          perModelTimeoutMs: 25_000,
          totalBudgetMs: 40_000,
          modelProfile: 'grading',
          failFastOnTooLong: true,
        }
      );

      return NextResponse.json(data, { status: 200 });
    } catch (err: any) {
      if (isLengthOrTransientError(err)) {
        const { message, status, retryAfterSeconds } = formatGeminiError(
          err,
          'Lỗi chấm điểm Task 2: '
        );
        return NextResponse.json({ error: message, retryAfterSeconds }, { status });
      }
      throw err;
    }
  } catch (error: any) {
    console.error('[task2-grade] Error:', error);
    const { message, status, retryAfterSeconds } = formatGeminiError(
      error,
      'Lỗi chấm điểm Task 2: '
    );
    return NextResponse.json({ error: message, retryAfterSeconds }, { status });
  }
}
