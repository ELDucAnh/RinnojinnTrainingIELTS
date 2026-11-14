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

=== YÊU CẦU CHẤM ĐIỂM CHUẨN IELTS BAND 7.5 (4 TIÊU CHÍ) ===
Hãy chấm đoạn văn trên theo ĐÚNG 4 tiêu chí IELTS Writing Task 2:
1. "task" — Task Response (TR):
   - Body 1 (Intro): Có paraphrase đề bài tự nhiên (không copy nguyên văn), giới thiệu đúng vấn đề và có Thesis Statement rõ ràng trả lời trực diện tất cả các vế câu hỏi không?
   - Body 2, 3, 4 (Thân bài 1, 2, 3): Có Topic Sentence rõ ràng bám sát đề và khớp với Thesis Statement ở Body 1 không? Ý tưởng có được phát triển sâu (giải thích "tại sao/như thế nào" + ví dụ/hệ quả thuyết phục) hay chỉ khẳng định chung chung, chưa tới? Có bị lạc đề hoặc lặp lại ý của Body trước không?
   - Body 5 (Conclusion): Có tóm tắt chính xác các luận điểm đã nêu ở Body 2–4 và khẳng định lại lập trường ở Body 1 không? Có lỡ đưa ý tưởng hoàn toàn mới vào kết bài không (nếu có -> trừ điểm TR)?
2. "cc" — Coherence and Cohesion (CC):
   - Mạch lập luận bên trong Body có rõ ràng (Point -> Explain -> Example/Impact), dùng referencing (this, such, these, thereby...) tự nhiên không lạm dụng máy móc ("Firstly, Secondly, Moreover..." sáo rỗng)?
   - LIÊN KẾT VỚI CÁC BODY KHÁC: Đoạn hiện tại có kết nối mượt mà, logic và nhất quán quan điểm với các Body trước đó (previousBodies) không?
3. "lr" — Lexical Resource (LR):
   - Có dùng từ vựng học thuật chính xác, collocations tự nhiên (less common lexical items) phù hợp chủ đề không? Có lặp từ nhiều trong Body hoặc lặp lại cách diễn đạt từ các Body trước không?
   - Từ vựng đơn giản, dịch word-by-word từ tiếng Việt hoặc sai collocation -> dưới 7.5.
4. "gra" — Grammatical Range and Accuracy (GRA):
   - Có sử dụng linh hoạt nhiều cấu trúc câu phức (mệnh đề quan hệ, câu điều kiện, đảo ngữ, mệnh đề phân từ, câu nhượng bộ although/despite, danh động từ/cụm danh từ học thuật) và phần lớn câu không có lỗi?
   - Còn lỗi chia thì, mạo từ, giới từ, thiếu chủ ngữ/động từ, câu run-on/comma splice hoặc toàn câu đơn giản -> dưới 7.5.

KIỂM TRA ĐẶC BIỆT:
- Nếu học viên viết bằng tiếng Việt, viết quá sơ sài, hoặc lạc đề -> chấm <= 4.0.
- Thang điểm mỗi tiêu chí từ 0.0 đến 9.0 (chỉ dùng bước 0.5).
- Bắt buộc nêu rõ bằng tiếng Việt: **Body hiện tại đang bị mất điểm ở tiêu chí nào và vì sao**, trích dẫn cụ thể đoạn/câu/từ trong bài làm gây mất điểm.
- Không chấm dễ dãi cho qua nếu chưa đạt chất lượng Band 7.5, nhưng công tâm cho 7.5–9.0 nếu thực sự xứng đáng.

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
        maxOutputTokens: 2200,
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
