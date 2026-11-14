export const maxDuration = 60;

import { NextRequest, NextResponse } from 'next/server';
import { formatGeminiError, generateJsonWithFallback } from '@/lib/gemini-helper';
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

Mục tiêu bắt buộc để qua được Body hiện tại là phải ĐẠT CHUẨN BAND 7.5 (Overall Band của Body >= 7.5 và không có tiêu chí nào dưới 7.0).

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
- Ý/ví dụ gợi ý: ${currentOutline ? JSON.stringify(currentOutline.keyPoints) : 'Theo đề bài'}
- Bài viết tiếng Anh của học viên cho Body ${bodyIndex + 1}:
"""
${cleanContent}
"""

=== YÊU CẦU CHẤM ĐIỂM CHUẨN IELTS (ĐÁNH CỰC GẮT VÀO 2 TIÊU CHÍ TR & CC ĐỂ GÁNH ĐIỂM > 8.0) ===
Học viên dùng **TR** và **CC** để gánh điểm > 8.0 trong khi luyện nâng **LR & GRA**. Vì vậy, hãy đóng vai giám khảo Cambridge KHẮT KHE TỘT ĐỘ với riêng **TR** và **CC** (chỉ cho 8.0–9.0 khi lập luận và mạch kết nối thực sự đạt chuẩn Band 8.0–9.0):

1. "task" — Task Response (TR) [CHẤM CỰC GẮT]:
   - Body 1 (Intro): BẮT BUỘC paraphrase sắc gọn (không copy cụm từ đề) + Thesis Statement trả lời TRỰC DIỆN tất cả các vế câu hỏi, nêu rõ lập trường/mức độ và lộ trình các thân bài. Nếu mở bài sáo rỗng (*"Nowadays many people think..."*), Thesis chung chung (*"this essay will discuss both views"*), hoặc thiếu 1 vế câu hỏi -> TRẦN TR <= 6.5.
   - Body 2, 3, 4 (Thân bài 1, 2, 3): BẮT BUỘC hội tụ đủ: Topic Sentence bám sát Thesis Body 1 -> Cơ chế nhân-quả SÂU ("tại sao & bằng cách nào thực sự xảy ra") -> Ví dụ/bối cảnh thực tế thuyết phục -> Chốt luận điểm. Nếu khẳng định chung chung chưa giải thích tới nơi tới chốn, bịa số liệu thống kê ảo ("80% of people..."), trùng ý với 'previousBodies', hoặc Body 4 phản biện nửa vời / tự mâu thuẫn Thesis Body 1 -> TRẦN TR <= 6.5–7.0.
   - Body 5 (Conclusion): BẮT BUỘC tổng hợp trọn vẹn mạch Body 2–4 và khẳng định lại Thesis. Đưa BẤT KỲ ý mới nào hoặc tóm tắt thiếu Body 4 -> TRẦN TR <= 6.5.
2. "cc" — Coherence and Cohesion (CC) [CHẤM CỰC GẮT]:
   - Chuẩn Band 8.0–9.0 đòi hỏi dòng chảy tư duy tự nhiên, liên kết tinh tế qua quy chiếu & chuỗi từ vựng ("such interventions, this dynamic, consequently, granted... nevertheless"), KHÔNG gãy mạch giữa các câu.
   - Lạm dụng từ nối liệt kê máy móc đầu câu (Firstly, Secondly, Thirdly, Moreover, Furthermore, In conclusion) -> TRẦN CC <= 7.0.
   - LIÊN KẾT GIỮA CÁC BODY: Topic Sentence ở Body 2–4 phải phản chiếu đúng lộ trình Thesis của Body 1, chuyển tiếp ý mượt giữa 'previousBodies' và đoạn hiện tại, Body 5 phải tổng hợp liền mạch. Đứt mạch hoặc chuyển đoạn gượng -> TRẦN CC <= 7.0.
3. "lr" — Lexical Resource (LR):
   - Chấm chuẩn xác theo IELTS Band Descriptors: collocations học thuật tự nhiên, ít từ phổ thông lặp lại, không dịch word-by-word từ tiếng Việt hay sai sắc thái từ.
4. "gra" — Grammatical Range and Accuracy (GRA):
   - Chấm chuẩn xác: kết hợp linh hoạt câu phức (mệnh đề quan hệ, câu điều kiện, đảo ngữ, phân từ, nhượng bộ, cụm danh từ học thuật) với độ chính xác ngữ pháp, dấu câu, mạo từ, giới từ cao.

KIỂM TRA ĐẶC BIỆT:
- Nếu học viên viết tiếng Việt, sơ sài, hoặc lạc đề -> <= 4.0.
- Thang điểm mỗi tiêu chí từ 0.0 đến 9.0 (bước 0.5).
- Bắt buộc chỉ rõ từng điểm trừ khiến TR và CC chưa chạm >= 8.0–8.5 kèm trích dẫn câu/cụm cụ thể trong bài để học viên khắc phục triệt để.
- Không chấm nương tay TR & CC, đồng thời giữ chuẩn công bằng mốc >= 7.5 overall (không tiêu chí nào < 7.0) để qua Body.

YÊU CẦU ĐẦU RA JSON (BẮT BUỘC CHỈ TRẢ VỀ JSON HỢP LỆ, KHÔNG MARKDOWN):
{
  "criteria": {
    "task": {
      "band": 7.0,
      "reason": "Nhận xét chi tiết bằng tiếng Việt: điểm mạnh và lý do bị mất điểm ở tiêu chí TR (có khớp đề bài, bám thesis Body 1, đủ sâu hoặc có lặp ý body trước không).",
      "evidence": ["Trích dẫn cụ thể từ bài hoặc thiếu sót rõ ràng"]
    },
    "cc": {
      "band": 7.5,
      "reason": "Nhận xét chi tiết bằng tiếng Việt về mạch lạc nội bộ và liên kết với các body trước; nêu rõ chỗ mất điểm nếu < 7.5 hoặc chưa hoàn hảo.",
      "evidence": ["Trích dẫn cụ thể nếu có"]
    },
    "lr": {
      "band": 6.5,
      "reason": "Nhận xét chi tiết bằng tiếng Việt về vốn từ vựng, collocation, lặp từ với các body trước và lý do mất điểm.",
      "evidence": ["Trích dẫn từ/cụm từ chưa đạt chuẩn 7.5"]
    },
    "gra": {
      "band": 7.0,
      "reason": "Nhận xét chi tiết bằng tiếng Việt về cấu trúc câu và lỗi ngữ pháp khiến mất điểm.",
      "evidence": ["Trích dẫn câu/cấu trúc gây mất điểm"]
    }
  },
  "crossBodyFeedback": "Nhận xét chuyên sâu bằng tiếng Việt về sự liên kết của Body này với các Body trước đó (VD: khớp với Thesis Statement ở Body 1 chưa, nối tiếp logic từ Body trước ổn chưa, có bị lặp luận điểm/từ vựng không).",
  "grammarErrors": [
    {
      "original": "Cụm từ/câu sai",
      "correction": "Cách sửa đúng",
      "explanation": "Giải thích gốc rễ lỗi ngữ pháp bằng tiếng Việt"
    }
  ],
  "vocabularyTips": [
    {
      "studentWord": "Từ/cụm từ còn cơ bản hoặc lặp",
      "betterAlternative": "Từ/cụm từ Band 7.5–8.5 tự nhiên, học thuật hơn",
      "reason": "Giải thích sắc thái và lý do thay thế bằng tiếng Việt"
    }
  ],
  "generalFeedback": "Tổng kết 2–3 câu bằng tiếng Việt: Body này đã đạt chuẩn Band 7.5 chưa và cần tập trung sửa gì để vượt mốc 7.5.",
  "modelUpgrade": "Phiên bản nâng cấp Band 8.0+ hoàn chỉnh cho Body này (để học viên tham khảo sau khi đạt)."
}
Lưu ý: Hãy viết nhận xét súc tích, đúng trọng tâm (1–2 câu mỗi mục) để phản hồi nhanh.
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
        maxOutputTokens: 2500,
        perModelTimeoutMs: 20_000,
        totalBudgetMs: 50_000,
      }
    );

    return NextResponse.json(data, { status: 200 });
  } catch (error: any) {
    console.error('[task2-grade] Error:', error);
    const { message, status } = formatGeminiError(error, 'Lỗi chấm điểm Task 2: ');
    return NextResponse.json({ error: message }, { status });
  }
}
