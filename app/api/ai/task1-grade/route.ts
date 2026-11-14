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
  TASK1_BODY_TEMPLATES,
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
      chartData,
      outline,
      previousBodies = [],
      bodyIndex,
      content,
    }: {
      chartData: any;
      outline?: OutlineBodyItem[];
      previousBodies?: PreviousBodyInput[];
      bodyIndex: number;
      content: string;
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
        { error: 'Đoạn văn quá ngắn (cần tối thiểu 8 từ tiếng Anh) để AI chấm theo chuẩn Band 7.5.' },
        { status: 400 }
      );
    }

    const currentTemplate = TASK1_BODY_TEMPLATES[bodyIndex];
    const currentOutline = Array.isArray(outline) ? outline[bodyIndex] : undefined;

    const chartDataSummary = JSON.stringify(chartData);
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
              `[Body ${pb.bodyIndex + 1} — ${pb.role || TASK1_BODY_TEMPLATES[pb.bodyIndex]?.role || ''}]:\n"${pb.content}"`
          )
          .join('\n\n')
        : 'Chưa có body nào trước đó (đây là Body 1 — phần mở đầu bài viết).';

    const prompt = `
Bạn là một cựu giám khảo IELTS Academic Writing vô cùng khắt khe, chuẩn xác và công tâm.
Học viên đang luyện viết IELTS Writing Task 1 theo từng Body (tổng cộng 4 Body: Body 1 Introduction, Body 2 Overview, Body 3 Detail 1, Body 4 Detail 2).
Mục tiêu bắt buộc để qua được Body hiện tại là đạt **Overall >= 7.5** theo đúng chiến lược điểm: **TA >= 8.0, CC >= 8.0, LR >= 7.0, GRA >= 7.0** (KHÔNG yêu cầu LR hay GRA phải đạt 7.5).

=== ĐỀ BÀI & DỮ LIỆU BIỂU ĐỒ GỐC ===
${chartDataSummary}

=== TOÀN BỘ DÀN Ý 4 BODY (TIẾNG VIỆT) ===
${fullOutlineSummary}

=== CÁC BODY HỌC VIÊN ĐÃ VIẾT & ĐẠT TRƯỚC ĐÓ ===
${previousBodiesText}

=== BODY HIỆN TẠI ĐANG CHẤM ===
- Vị trí: ${currentTemplate.label} (${currentOutline?.role || currentTemplate.role})
- Dàn ý tiếng Việt cho Body này: ${currentOutline ? JSON.stringify(currentOutline.viGuide) : 'Theo chuẩn IELTS Task 1'}
- Từ vựng & ngữ pháp đã gợi ý cho từng Ý trong Body này: ${currentOutline ? JSON.stringify({ ideaGuides: currentOutline.ideaGuides || [], vocab: currentOutline.vocabSuggestions || [], grammar: currentOutline.grammarSuggestions || [], legacyPoints: currentOutline.keyPoints || [] }) : 'Theo biểu đồ'}
- Bài viết tiếng Anh của học viên cho Body ${bodyIndex + 1}:
"""
${cleanContent}
"""

=== TIÊU CHUẨN CHẤM ĐIỂM TASK 1 (SIẾT GẮT TA >= 8.0 & CC >= 8.0 — MỤC TIÊU LR >= 7.0 & GRA >= 7.0) ===
Học viên dùng **TA >= 8.0** và **CC >= 8.0** để gánh điểm, còn **LR và GRA chỉ cần đạt chuẩn Band 7.0**. Hãy đóng vai giám khảo Cambridge KHẮT KHE với **TA** và **CC**, và chấm công tâm **LR & GRA** đúng chuẩn **Band 7.0** (collocation B1–B2 tự nhiên, KHÔNG ép từ C1–C2 hiếm):

1. "task" — Task Achievement (TA) [CHẤM CỰC GẮT — >= 8.0]:
   - Body 1 (Intro): Paraphrase trôi chảy và đủ 100% chiều thông tin (loại biểu đồ, đối tượng, đơn vị đo, địa điểm/nhóm, mốc thời gian). Thiếu 1 chiều hoặc copy > 3 từ liên tiếp -> TRẦN TA <= 6.5–7.0.
   - Body 2 (Overview): Đủ 2 tầng tổng quan (xu hướng/thứ bậc chính + điểm tương phản/bước ngoặt/ngoại lệ nổi bật nhất). Thiếu tầng 2 hoặc chèn số liệu cụ thể -> TRẦN TA <= 7.0.
   - Body 3 & Body 4 (Detail 1 & 2): Gom nhóm thông minh, đối chiếu định lượng sắc bén (gấp mấy lần, chênh lệch, đỉnh/đáy) và ĐÚNG 100% số liệu 'chartData'. Liệt kê rời rạc, sai con số/nhãn hoặc lặp ý Body trước -> TRẦN TA <= 6.5–7.0.
2. "cc" — Coherence and Cohesion (CC) [CHẤM CỰC GẮT — >= 8.0]:
   - Chuẩn Band 8.0–9.0 đòi hỏi quy chiếu tự nhiên ('this figure', 'respectively', 'the former/latter', 'mirroring this trend'). Lạm dụng từ nối liệt kê máy móc ('Firstly, Secondly, Moreover, In conclusion') hoặc đứt mạch với 'previousBodies' -> TRẦN CC <= 7.0–7.5.
3. "lr" — Lexical Resource (LR) [MỤC TIÊU >= 7.0 — B1–B2 COLLOCATION TỰ NHIÊN]:
   - Ưu tiên collocations tự nhiên mức B1–B2 ('account for', 'reach a peak of', 'rise steadily', 'drop sharply', 'remain stable', 'by contrast'). KHÔNG hạ < 7.0 chỉ vì thiếu từ C1–C2! Chỉ trừ <= 6.5 khi sai collocation, dịch word-by-word, hoặc lặp từ đơn giản.
4. "gra" — Grammatical Range and Accuracy (GRA) [MỤC TIÊU >= 7.0]:
   - Kết hợp tự nhiên câu đơn và câu phức phổ biến (while/whereas, mệnh đề quan hệ, bị động, so sánh), chia đúng thì nhất quán với 'previousBodies', kiểm soát tốt mạo từ/giới từ/chủ-vị. Không đòi hỏi đảo ngữ hiếm để đạt 7.0.

KIỂM TRA ĐẶC BIỆT:
- Nếu học viên viết tiếng Việt, viết linh tinh hoặc lạc đề -> <= 4.0.
- Thang điểm mỗi tiêu chí 0.0–9.0 (bước 0.5).

${buildAlignedCriteriaDirectives({ taskType: 'task1', isFullEssay: false })}

YÊU CẦU ĐẦU RA JSON (BẮT BUỘC CHỈ TRẢ VỀ JSON HỢP LỆ, KHÔNG MARKDOWN):
${buildUnifiedGradeJsonSchema({
  taskShort: 'TA',
  extraFieldsSchema: `"crossBodyFeedback": "Nhận xét bằng tiếng Việt về liên kết của Body này với các Body trước đó và định hướng nối sang Body sau (khớp với CC.mappings).",`,
  modelUpgradeInstruction:
    'CHỈ điền khi thực sự hữu ích để tham khảo sau khi ĐẠT: 1 bản hoàn chỉnh chuẩn TA/CC 8.0+ giữ văn phong B1–B2 tự nhiên (hệ thống chỉ mở cho học viên xem sau khi đạt chuẩn).',
})}
`;

    const { data } = await generateJsonWithFallback(
      prompt,
      `task1-grade:body-${bodyIndex + 1}`,
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
    console.error('[task1-grade] Error:', error);
    const { message, status } = formatGeminiError(error, 'Lỗi chấm điểm Task 1: ');
    return NextResponse.json({ error: message }, { status });
  }
}
