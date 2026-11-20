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
  TASK1_BODY_TEMPLATES,
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
      chartData,
      outline,
      previousBodies = [],
      bodyIndex,
      content,
      previousAttempt,
      phase = 'full',
      phase1Context,
      criteriaContext,
    }: {
      chartData: any;
      outline?: OutlineBodyItem[];
      previousBodies?: PreviousBodyInput[];
      bodyIndex: number;
      content: string;
      previousAttempt?: PreviousAttemptSummary | null;
      phase?: GradePhase;
      phase1Context?: any;
      criteriaContext?: any;
    } = body;

    if (!chartData || typeof bodyIndex !== 'number' || bodyIndex < 0 || bodyIndex > 3 || !content?.trim()) {
      return NextResponse.json(
        { error: 'Thiếu dữ liệu biểu đồ, chỉ số body hoặc nội dung bài viết.' },
        { status: 400 }
      );
    }

    const cleanContent = content.trim();
    if (countWords(cleanContent) < 8) {
      return NextResponse.json(
        { error: 'Đoạn văn quá ngắn (cần tối thiểu 8 từ tiếng Anh) để AI chấm theo chuẩn Band 8.0.' },
        { status: 400 }
      );
    }

    const currentTemplate = TASK1_BODY_TEMPLATES[bodyIndex];
    const currentOutline = Array.isArray(outline) ? outline[bodyIndex] : undefined;

    const chartDataSummary = JSON.stringify(chartData);
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
                `[Body ${pb.bodyIndex + 1} — ${pb.role || TASK1_BODY_TEMPLATES[pb.bodyIndex]?.role || ''}]:\n"${pb.content}"`
            )
            .join('\n\n')
        : 'Chưa có body nào trước đó (đây là Body 1 — phần mở đầu bài viết).';

    const previousAttemptBlock = buildPreviousAttemptBlock(previousAttempt);

    const sharedContext = `
Bạn là một cựu giám khảo IELTS Academic Writing & GIA SƯ KÈM 1-1 chuyên nâng học viên từ Band 6.0 lên Band 8.0.
Học viên đang luyện viết IELTS Writing Task 1 theo từng Body (4 Body: Introduction, Overview, Detail 1, Detail 2).
Mục tiêu BẮT BUỘC để vượt qua Body này là **Overall >= 8.0** theo đúng ma trận: **TA >= 8.0 · CC = 9.0 · GRA >= 8.0 · LR >= 7.0**.

=== ĐỀ BÀI & DỮ LIỆU BIỂU ĐỒ GỐC ===
${chartDataSummary}

=== TOÀN BỘ DÀN Ý 4 BODY (TIẾNG VIỆT) ===
${fullOutlineSummary}

=== CÁC BODY HỌC VIÊN ĐÃ VIẾT & ĐẠT TRƯỚC ĐÓ ===
${previousBodiesText}
${previousAttemptBlock}
=== BODY HIỆN TẠI ĐANG CHẤM ===
- Vị trí: ${currentTemplate.label} (${currentOutline?.role || currentTemplate.role})
- Dàn ý tiếng Việt cho Body này: ${currentOutline ? JSON.stringify(currentOutline.viGuide) : 'Theo chuẩn IELTS Task 1'}
- Lưu ý chiến lược 8/9/8/7 của dàn ý: ${currentOutline?.bandStrategy ? JSON.stringify(currentOutline.bandStrategy) : 'TA >= 8.0, CC = 9.0, GRA >= 8.0, LR >= 7.0'}
- Từ vựng & ngữ pháp đã gợi ý: ${currentOutline ? JSON.stringify({ ideaGuides: currentOutline.ideaGuides || [], vocab: currentOutline.vocabSuggestions || [], grammar: currentOutline.grammarSuggestions || [] }) : 'Theo biểu đồ'}
- Bài viết tiếng Anh của học viên cho Body ${bodyIndex + 1}:
"""
${cleanContent}
"""

=== RUBRIC CHẤM KHẮT KHE TASK 1 (TA 8.0 · CC 9.0 · GRA 8.0 · LR 7.0) ===
1. "task" — Task Achievement (TA) [MỤC TIÊU >= 8.0]:
   - Body 1 (Intro): Paraphrase trôi chảy và đủ 100% chiều thông tin (loại biểu đồ, đối tượng, đơn vị đo, địa điểm/nhóm, mốc thời gian). Thiếu 1 chiều hoặc copy > 3 từ liên tiếp -> TRẦN TA <= 6.5–7.0.
   - Body 2 (Overview): Đủ 2 tầng tổng quan (xu hướng/thứ bậc chính + điểm tương phản/bước ngoặt/ngoại lệ nổi bật nhất), TUYỆT ĐỐI không chèn số liệu chi tiết -> thiếu tầng 2 hoặc chèn số liệu -> TRẦN TA <= 7.0.
   - Body 3 & Body 4 (Detail 1 & 2): Gom nhóm thông minh, đối chiếu định lượng sắc bén (gấp mấy lần, chênh lệch, đỉnh/đáy) và ĐÚNG 100% số liệu chartData. Liệt kê rời rạc, sai con số/nhãn hoặc lặp ý Body trước -> TRẦN TA <= 6.5–7.0.
2. "cc" — Coherence and Cohesion (CC) [MỤC TIÊU = 9.0 — SIÊU KHẮT KHE]:
   - Đạt 9.0 CHỈ KHI liên kết hoàn toàn "tàng hình" (attracts no attention): chuỗi thông tin Cũ -> Mới liền mạch tuyệt đối, quy chiếu chuẩn xác ("this figure", "respectively", "the former/latter", "mirroring this trend"), hòa quyện mượt với previousBodies.
   - Còn dùng từ nối máy móc đầu câu ("Firstly, Secondly, Moreover, Furthermore, In addition, In conclusion") hoặc chuyển ý đột ngột -> TRẦN CC <= 7.5–8.0 (chưa đạt 9.0!).
3. "gra" — Grammatical Range and Accuracy (GRA) [MỤC TIÊU >= 8.0]:
   - Đòi hỏi đa số câu hoàn toàn sạch lỗi (error-free) VÀ sử dụng linh hoạt nhiều cấu trúc phức tự nhiên (While/Whereas, mệnh đề quan hệ không xác định ", which + V", cụm phân từ, "with + N + V-ing", bị động, so sánh định lượng nâng cao), chia thì chuẩn xác 100% nhất quán với previousBodies.
   - Chỉ dùng câu đơn/câu ghép cơ bản hoặc còn lỗi mạo từ/giới từ/chủ-vị/thì -> TRẦN GRA <= 6.5–7.5.
4. "lr" — Lexical Resource (LR) [MỤC TIÊU >= 7.0 — B1–B2 COLLOCATION TỰ NHIÊN]:
   - Ưu tiên collocations tự nhiên mức B1–B2 chuẩn văn viết ("account for", "reach a peak of", "rise steadily", "drop sharply", "remain stable", "by contrast"). KHÔNG hạ < 7.0 chỉ vì thiếu từ C1–C2 hiếm! Chỉ trừ <= 6.5 khi sai collocation, dịch word-by-word từ tiếng Việt, hoặc lặp từ sơ đẳng.
- Nếu viết tiếng Việt, sơ sài hoặc lạc đề -> <= 4.0. Thang điểm 0.0–9.0 (bước 0.5).
`;

    // ─── CHUNKED PHASE HANDLERS ───
    if (phase === 'task-cc') {
      const p1Prompt = `${sharedContext}
${buildAlignedCriteriaDirectives({ taskType: 'task1', isFullEssay: false })}
NHIỆM VỤ BƯỚC 1/3: Chấm & bóc tách SIÊU CHI TIẾT chỉ 2 tiêu chí **TA (>= 8.0)** và **CC (= 9.0)** kèm "crossBodyFeedback".
Trả về DUY NHẤT JSON hợp lệ:
${buildTaskCcPhaseSchema({
  taskShort: 'TA',
  extraFieldsSchema: `"crossBodyFeedback": "Nhận xét chi tiết bằng tiếng Việt về liên kết của Body này với các Body trước đó và định hướng nối sang Body sau (khớp với CC.mappings)."`,
})}`;

      const { data } = await generateJsonWithFallback(
        p1Prompt,
        `task1-grade:p1:body-${bodyIndex + 1}`,
        (parsed) => {
          if (!parsed?.criteria?.task || !parsed?.criteria?.cc) {
            throw new Error('Thiếu criteria.task hoặc criteria.cc');
          }
          return parsed;
        },
        { temperature: 0.3, maxOutputTokens: 3200, perModelTimeoutMs: 22_000, totalBudgetMs: 48_000 }
      );
      return NextResponse.json(data, { status: 200 });
    }

    if (phase === 'gra-lr') {
      const p2Prompt = `${sharedContext}
=== KẾ HOẠCH ĐÃ CHẤM Ở BƯỚC 1 (BẮT BUỘC ĐỒNG BỘ 100%, KHÔNG MÂU THUẪN) ===
${JSON.stringify(phase1Context || {})}

${buildAlignedCriteriaDirectives({ taskType: 'task1', isFullEssay: false })}
NHIỆM VỤ BƯỚC 2/3: Chấm & bóc tách SIÊU CHI TIẾT 2 tiêu chí **GRA (>= 8.0)** và **LR (>= 7.0)** kèm "grammarErrors" và "vocabularyTips", ĐỒNG BỘ HOÀN TOÀN với kế hoạch sửa TA & CC ở trên.
Trả về DUY NHẤT JSON hợp lệ:
${buildGraLrPhaseSchema()}`;

      const { data } = await generateJsonWithFallback(
        p2Prompt,
        `task1-grade:p2:body-${bodyIndex + 1}`,
        (parsed) => {
          if (!parsed?.criteria?.gra || !parsed?.criteria?.lr) {
            throw new Error('Thiếu criteria.gra hoặc criteria.lr');
          }
          return parsed;
        },
        { temperature: 0.3, maxOutputTokens: 3400, perModelTimeoutMs: 22_000, totalBudgetMs: 48_000 }
      );
      return NextResponse.json(data, { status: 200 });
    }

    if (phase === 'tutor-closing') {
      const p3Prompt = `${sharedContext}
=== KẾT QUẢ 4 TIÊU CHÍ ĐÃ CHẤM ===
${JSON.stringify(criteriaContext || {})}

NHIỆM VỤ BƯỚC 3/3: Đóng vai GIA SƯ IELTS WRITING THỰC THỤ kèm 1-1, viết "generalFeedback", đoạn chốt bóc tách chuyên sâu bằng tiếng Việt "tutorClosingNote" (160–240 từ, 3–4 đoạn tách bằng \\n\\n: chẩn đoán Band & điểm sáng, bóc tách 1–2 nút thắt tư duy Band 6, lộ trình ưu tiên sửa 1->2->3 ngay lần tới${previousAttempt ? ', ĐỐI CHIẾU RÕ tiến bộ và điểm còn sót so với bản nháp lần trước' : ''}), và "modelUpgrade" chuẩn TA 8.0+ / CC 9.0 / GRA 8.0+ / LR 7.0+ tự nhiên.
Trả về DUY NHẤT JSON hợp lệ:
${buildTutorClosingPhaseSchema({
  taskShort: 'TA',
  modelUpgradeInstruction:
    'Phiên bản tham khảo chuẩn TA 8.0+ · CC 9.0 · GRA 8.0+ giữ văn phong B1–B2 tự nhiên (hệ thống chỉ mở cho học viên xem sau khi đạt chuẩn Overall >= 8.0).',
})}`;

      const { data } = await generateJsonWithFallback(
        p3Prompt,
        `task1-grade:p3:body-${bodyIndex + 1}`,
        (parsed) => {
          if (!parsed || (!parsed.tutorClosingNote && !parsed.generalFeedback)) {
            throw new Error('Thiếu tutorClosingNote/generalFeedback');
          }
          return parsed;
        },
        { temperature: 0.4, maxOutputTokens: 2400, perModelTimeoutMs: 20_000, totalBudgetMs: 46_000 }
      );
      return NextResponse.json(data, { status: 200 });
    }

    // ─── DEFAULT FULL SINGLE-SHOT MODE (with truncation-fast-fail) ───
    const fullPrompt = `${sharedContext}
${buildAlignedCriteriaDirectives({ taskType: 'task1', isFullEssay: false })}

YÊU CẦU ĐẦU RA JSON (BẮT BUỘC CHỈ TRẢ VỀ JSON HỢP LỆ, KHÔNG MARKDOWN):
${buildUnifiedGradeJsonSchema({
  taskShort: 'TA',
  extraFieldsSchema: `"crossBodyFeedback": "Nhận xét chi tiết bằng tiếng Việt về liên kết của Body này với các Body trước đó và định hướng nối sang Body sau (khớp với CC.mappings).",`,
  modelUpgradeInstruction:
    'Phiên bản hoàn chỉnh chuẩn TA 8.0+ · CC 9.0 · GRA 8.0+ giữ văn phong B1–B2 tự nhiên (hệ thống chỉ mở cho học viên xem sau khi đạt chuẩn Overall >= 8.0).',
})}
`;

    try {
      const { data } = await generateJsonWithFallback(
        fullPrompt,
        `task1-grade:body-${bodyIndex + 1}`,
        (parsed) => {
          if (!parsed || !parsed.criteria) {
            throw new Error('AI trả về thiếu trường criteria');
          }
          return normalizeGradeResult(parsed);
        },
        {
          temperature: 0.35,
          maxOutputTokens: 6600,
          perModelTimeoutMs: 25_000,
          totalBudgetMs: 40_000,
          failFastOnTooLong: true,
        }
      );

      return NextResponse.json(data, { status: 200 });
    } catch (err: any) {
      if (isLengthOrTransientError(err)) {
        // Return 502/504 immediately so client orchestrator cleanly runs the 3-phase chunked pipeline
        const { message, status } = formatGeminiError(err, 'Lỗi chấm điểm Task 1: ');
        return NextResponse.json({ error: message }, { status });
      }
      throw err;
    }
  } catch (error: any) {
    console.error('[task1-grade] Error:', error);
    const { message, status } = formatGeminiError(error, 'Lỗi chấm điểm Task 1: ');
    return NextResponse.json({ error: message }, { status });
  }
}
