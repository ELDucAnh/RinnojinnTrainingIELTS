export const maxDuration = 60;

import { NextRequest, NextResponse } from 'next/server';
import { formatGeminiError, generateJsonWithFallback } from '@/lib/gemini-helper';
import {
  buildAlignedCriteriaDirectives,
  buildUnifiedGradeJsonSchema,
} from '@/lib/writing-grade-prompt';
import {
  countWords,
  normalizeGradeResult,
  OutlineBodyItem,
  TASK2_BODY_TEMPLATES,
} from '@/lib/writing-practice-types';

interface PreviousBodyInput {
  bodyIndex: number;
  label?: string;
  role?: string;
  content: string;
}

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
    }: {
      prompt: string;
      essayType?: string;
      outline?: OutlineBodyItem[];
      previousBodies?: PreviousBodyInput[];
      bodyIndex: number;
      content: string;
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
        { error: 'Đoạn văn quá ngắn (cần tối thiểu 10 từ tiếng Anh) để AI chấm theo chuẩn Band 7.5.' },
        { status: 400 }
      );
    }

    const currentTemplate = TASK2_BODY_TEMPLATES[bodyIndex];
    const currentOutline = Array.isArray(outline) ? outline[bodyIndex] : undefined;

    const fullOutlineSummary = Array.isArray(outline)
      ? outline
        .map(
          (o, idx) =>
            `- Body ${idx + 1} (${o.role}): ${(o.viGuide || []).join(' | ')}`
        )
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

    const aiPrompt = `
Bạn là một cựu giám khảo IELTS Academic Writing vô cùng khắt khe, công tâm và bám sát Official IELTS Writing Band Descriptors.
Học viên đang luyện viết IELTS Writing Task 2 theo cấu trúc **5 Body**:
- Body 1: Introduction (Mở bài)
- Body 2: Body Paragraph 1 (Thân bài 1)
- Body 3: Body Paragraph 2 (Thân bài 2)
- Body 4: Body Paragraph 3 (Thân bài 3 — mở rộng / phản biện / giải pháp)
- Body 5: Conclusion (Kết bài)

Mục tiêu bắt buộc để qua được Body hiện tại là đạt **Overall >= 7.5** theo đúng chiến lược điểm: **TR >= 8.0, CC >= 8.0, LR >= 7.0, GRA >= 7.0** (KHÔNG yêu cầu LR hay GRA phải đạt 7.5).

=== ĐỀ BÀI TASK 2 CỦA NGƯỜI DÙNG ===
"${task2Prompt.trim()}"
Dạng đề nhận diện: ${essayType || 'IELTS Task 2'}

=== TOÀN BỘ DÀN Ý 5 BODY (TIẾNG VIỆT) ===
${fullOutlineSummary}

=== CÁC BODY HỌC VIÊN ĐÃ VIẾT & ĐẠT TRƯỚC ĐÓ ===
${previousBodiesText}

=== BODY HIỆN TẠI ĐANG CHẤM ===
- Vị trí: ${currentTemplate.label} (${currentOutline?.role || currentTemplate.role})
- Dàn ý tiếng Việt cho Body này: ${currentOutline ? JSON.stringify(currentOutline.viGuide) : 'Theo chuẩn IELTS Task 2'}
- Từ vựng & ngữ pháp đã gợi ý theo từng Ý cho Body này: ${currentOutline ? JSON.stringify({ ideaGuides: currentOutline.ideaGuides || [], vocab: currentOutline.vocabSuggestions || [], grammar: currentOutline.grammarSuggestions || [], legacyPoints: currentOutline.keyPoints || [] }) : 'Theo đề bài'}
- Bài viết tiếng Anh của học viên cho Body ${bodyIndex + 1}:
"""
${cleanContent}
"""

=== TIÊU CHUẨN CHẤM ĐIỂM TASK 2 (SIẾT GẮT TR >= 8.0 & CC >= 8.0 — MỤC TIÊU LR >= 7.0 & GRA >= 7.0) ===
Học viên dùng **TR >= 8.0** và **CC >= 8.0** để gánh điểm, còn **LR và GRA chỉ cần đạt chuẩn Band 7.0**. Hãy đóng vai giám khảo Cambridge KHẮT KHE với **TR** và **CC**, và chấm công tâm **LR & GRA** đúng chuẩn **Band 7.0** (collocation B1–B2 tự nhiên, KHÔNG ép từ C1–C2 hiếm):

1. "task" — Task Response (TR) [CHẤM CỰC GẮT — >= 8.0]:
   - Body 1 (Intro): Paraphrase sắc gọn + Thesis Statement trả lời TRỰC DIỆN mọi vế câu hỏi, nêu rõ lập trường & lộ trình các thân bài. Sáo rỗng (*"Nowadays many people think..."*), chung chung (*"discuss both views"*) hoặc thiếu vế -> TRẦN TR <= 6.5–7.0.
   - Body 2, 3, 4 (Thân bài 1, 2, 3): Đủ Topic Sentence bám Thesis -> Cơ chế nhân-quả SÂU ("tại sao & bằng cách nào thực sự xảy ra") -> Ví dụ/bối cảnh thực tế thuyết phục -> Chốt luận điểm. Thiếu chiều sâu, bịa số liệu thống kê ảo ("80%..."), trùng ý 'previousBodies' hoặc phản biện tự mâu thuẫn Thesis -> TRẦN TR <= 6.5–7.0.
   - Body 5 (Conclusion): Tổng hợp trọn vẹn mạch Body 2–4 & khẳng định Thesis, KHÔNG thêm ý mới -> thiếu sẽ TRẦN TR <= 6.5–7.0.
2. "cc" — Coherence and Cohesion (CC) [CHẤM CỰC GẮT — >= 8.0]:
   - Quy chiếu & chuỗi từ vựng tự nhiên ('such policies, this shift, as a result, while...'), bám sát lộ trình Thesis ở Body 1 và nối tiếp mượt với 'previousBodies'. Lạm dụng từ nối máy móc (Firstly, Secondly, Thirdly, Moreover, Furthermore, In conclusion) hoặc gãy mạch -> TRẦN CC <= 7.0–7.5.
3. "lr" — Lexical Resource (LR) [MỤC TIÊU >= 7.0 — B1–B2 COLLOCATION TỰ NHIÊN]:
   - Ưu tiên collocation tự nhiên mức B1–B2 ('play a crucial role', 'have a serious impact on', 'raise public awareness', 'bridge the gap', 'face financial pressure'). KHÔNG trừ xuống < 7.0 chỉ vì thiếu từ C1–C2 hiếm! Chỉ trừ <= 6.5 khi sai collocation, dịch word-by-word hoặc lặp từ đơn giản.
4. "gra" — Grammatical Range and Accuracy (GRA) [MỤC TIÊU >= 7.0]:
   - Kết hợp tự nhiên câu đơn & câu phức phổ biến (which/who/that, although/while/because, câu điều kiện, cụm V-ing/phân từ tự nhiên) với độ chính xác mạo từ, giới từ, chia thì cao. Không đòi hỏi đảo ngữ/C2 hiếm để đạt 7.0.

KIỂM TRA ĐẶC BIỆT:
- Nếu học viên viết tiếng Việt, sơ sài hoặc lạc đề -> <= 4.0.
- Thang điểm mỗi tiêu chí 0.0–9.0 (bước 0.5).

${buildAlignedCriteriaDirectives({ taskType: 'task2', isFullEssay: false })}

YÊU CẦU ĐẦU RA JSON (BẮT BUỘC CHỈ TRẢ VỀ JSON HỢP LỆ, KHÔNG MARKDOWN):
${buildUnifiedGradeJsonSchema({
      taskShort: 'TR',
      extraFieldsSchema: `"crossBodyFeedback": "Nhận xét bằng tiếng Việt về liên kết của Body này với các Body trước đó (khớp lộ trình Thesis Body 1, nối mạch lập luận chưa — khớp với CC.mappings).",`,
      modelUpgradeInstruction:
        'CHỈ điền phiên bản tham khảo chuẩn TR/CC 8.0+ giữ văn phong B1–B2 tự nhiên (hệ thống chỉ mở cho học viên xem sau khi đã đạt chuẩn).',
    })}
`;

    const { data } = await generateJsonWithFallback(
      aiPrompt,
      `task2-grade:body-${bodyIndex + 1}`,
      (parsed) => {
        if (!parsed || !parsed.criteria) {
          throw new Error('AI trả về thiếu trường criteria');
        }
        return normalizeGradeResult(parsed);
      },
      {
        temperature: 0.35,
        maxOutputTokens: 3800,
        perModelTimeoutMs: 25_000,
        totalBudgetMs: 54_000,
      }
    );

    return NextResponse.json(data, { status: 200 });
  } catch (error: any) {
    console.error('[task2-grade] Error:', error);
    const { message, status } = formatGeminiError(error, 'Lỗi chấm điểm Task 2: ');
    return NextResponse.json({ error: message }, { status });
  }
}
