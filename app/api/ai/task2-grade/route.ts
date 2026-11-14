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
- Từ vựng & ngữ pháp Band 7.0+ gợi ý cho Body này: ${currentOutline ? JSON.stringify({ vocab: currentOutline.vocabSuggestions || [], grammar: currentOutline.grammarSuggestions || [], legacyPoints: currentOutline.keyPoints || [] }) : 'Theo đề bài'}
- Bài viết tiếng Anh của học viên cho Body ${bodyIndex + 1}:
"""
${cleanContent}
"""

=== YÊU CẦU CHẤM ĐIỂM CHUẨN IELTS (SIẾT GẮT TR >= 8.0 & CC >= 8.0 — MỤC TIÊU LR >= 7.0 & GRA >= 7.0) ===
Học viên dùng **TR >= 8.0** và **CC >= 8.0** để gánh điểm, còn **LR và GRA chỉ cần đạt chuẩn Band 7.0**. Vì vậy, hãy đóng vai giám khảo Cambridge KHẮT KHE TỘT ĐỘ với riêng **TR** và **CC**, còn **LR & GRA** chấm thực tế đúng chuẩn **Band 7.0** (tự nhiên, đúng collocation B1–B2 bản xứ, KHÔNG ép từ C1–C2 cầu kỳ):

1. "task" — Task Response (TR) [CHẤM CỰC GẮT — MỤC TIÊU >= 8.0]:
   - Body 1 (Intro): BẮT BUỘC paraphrase sắc gọn (không copy cụm từ đề) + Thesis Statement trả lời TRỰC DIỆN tất cả các vế câu hỏi, nêu rõ lập trường/mức độ và lộ trình các thân bài. Nếu mở bài sáo rỗng (*"Nowadays many people think..."*), Thesis chung chung (*"this essay will discuss both views"*), hoặc thiếu 1 vế câu hỏi -> TRẦN TR <= 6.5–7.0.
   - Body 2, 3, 4 (Thân bài 1, 2, 3): BẮT BUỘC hội tụ đủ: Topic Sentence bám sát Thesis Body 1 -> Cơ chế nhân-quả SÂU ("tại sao & bằng cách nào thực sự xảy ra") -> Ví dụ/bối cảnh thực tế thuyết phục -> Chốt luận điểm. Nếu khẳng định chung chung chưa giải thích tới nơi tới chốn, bịa số liệu thống kê ảo ("80% of people..."), trùng ý với 'previousBodies', hoặc Body 4 phản biện nửa vời / tự mâu thuẫn Thesis Body 1 -> TRẦN TR <= 6.5–7.0.
   - Body 5 (Conclusion): BẮT BUỘC tổng hợp trọn vẹn mạch Body 2–4 và khẳng định lại Thesis. Đưa BẤT KỲ ý mới nào hoặc tóm tắt thiếu Body 4 -> TRẦN TR <= 6.5–7.0.
2. "cc" — Coherence and Cohesion (CC) [CHẤM CỰC GẮT — MỤC TIÊU >= 8.0]:
   - Chuẩn Band 8.0–9.0 đòi hỏi dòng chảy tư duy tự nhiên, liên kết tinh tế qua quy chiếu & chuỗi từ vựng ("such policies, this shift, as a result, while..."), KHÔNG gãy mạch giữa các câu.
   - Lạm dụng từ nối liệt kê máy móc đầu câu (Firstly, Secondly, Thirdly, Moreover, Furthermore, In conclusion) -> TRẦN CC <= 7.0–7.5.
   - LIÊN KẾT GIỮA CÁC BODY: Topic Sentence ở Body 2–4 phải phản chiếu đúng lộ trình Thesis của Body 1, chuyển tiếp ý mượt giữa 'previousBodies' và đoạn hiện tại, Body 5 phải tổng hợp liền mạch. Đứt mạch hoặc chuyển đoạn gượng -> TRẦN CC <= 7.0–7.5.
3. "lr" — Lexical Resource (LR) [MỤC TIÊU >= 7.0 — B1–B2 COLLOCATION TỰ NHIÊN]:
   - Học viên CHỈ aim LR **7.0**, ưu tiên **collocation tự nhiên mức B1–B2 mà người bản xứ hay dùng trong văn viết** (VD: "play a crucial role", "have a serious impact on", "raise public awareness", "bridge the gap", "face financial pressure", "in-person attendance").
   - TUYỆT ĐỐI KHÔNG trừ điểm hay ép xuống dưới 7.0 chỉ vì học viên không dùng từ phức tạp/hiếm gặp C1–C2! Chỉ cần dùng từ B1–B2 chuẩn collocation bản xứ, diễn đạt rõ ràng, không dịch word-by-word từ tiếng Việt và không lặp từ đơn giản thô sơ -> xứng đáng **LR >= 7.0**.
4. "gra" — Grammatical Range and Accuracy (GRA) [MỤC TIÊU >= 7.0]:
   - Chấm đúng chuẩn **Band 7.0**: kết hợp tự nhiên câu đơn và câu phức phổ biến (mệnh đề quan hệ which/who/that, although/while/because, câu điều kiện, cụm V-ing/phân từ tự nhiên) với độ chính xác mạo từ, giới từ, chia thì cao. Không đòi hỏi đảo ngữ/C2 hiếm gặp mới cho 7.0.

KIỂM TRA ĐẶC BIỆT:
- Nếu học viên viết tiếng Việt, sơ sài, hoặc lạc đề -> <= 4.0.
- Thang điểm mỗi tiêu chí từ 0.0 đến 9.0 (bước 0.5).
- Bắt buộc chỉ rõ từng điểm trừ khiến TR và CC chưa chạm >= 8.0 kèm trích dẫn câu/cụm cụ thể trong bài để học viên khắc phục triệt để.
- QUAN TRỌNG NHẤT: Với TẤT CẢ 4 tiêu chí, KHÔNG CHỈ nhận xét lỗi mà BẮT BUỘC phải đưa "fixes" (1–3 hướng dẫn sửa CỤ THỂ, thực dụng để học viên áp dụng ngay):
  + Ở "task" (TR): chỉ rõ cần thêm câu gì vào đúng chỗ nào, hoặc thay câu nào bằng câu gì (viết mẫu câu gợi ý rõ lập trường/lộ trình/cơ chế nhân-quả, dùng từ vựng B1–B2 tự nhiên).
  + Ở "cc": chỉ rõ cần sửa liên kết ở câu nào, đổi cụm nối máy móc sang cụm quy chiếu/chuyển ý tự nhiên nào.
  + Ở "lr": chỉ rõ từng từ/cụm còn thiếu tự nhiên hoặc sai collocation cần đổi sang **collocation B1–B2 bản xứ hay dùng** (kèm cặp "'cũ' -> 'mới'"). CHỈ dùng từ C1–C2 nếu không có cụm B1–B2 tương đương thay thế!
  + Ở "gra": chỉ rõ sửa mạo từ/thì/cấu trúc nào ở đúng câu đó, kèm mẫu viết lại câu phức rõ ràng chuẩn Band 7.0+ (dùng although/while/which/because tự nhiên, không cầu kỳ quá mức).
- Không chấm nương tay TR (>= 8.0) và CC (>= 8.0); còn LR & GRA chấm công bằng đúng chuẩn Band 7.0 (>= 7.0 là đạt).

YÊU CẦU ĐẦU RA JSON (BẮT BUỘC CHỈ TRẢ VỀ JSON HỢP LỆ, KHÔNG MARKDOWN):
{
  "criteria": {
    "task": {
      "band": 7.5,
      "reason": "Nhận xét chi tiết bằng tiếng Việt: điểm mạnh và lý do TR đạt hay chưa đạt mốc 8.0 (có khớp đề bài, bám thesis Body 1, đủ sâu hoặc có lặp ý body trước không).",
      "evidence": ["Trích dẫn cụ thể từ bài hoặc thiếu sót rõ ràng"],
      "fixes": ["Chỉ rõ thêm/thay câu nào vào vị trí nào kèm câu tiếng Anh gợi ý cụ thể"]
    },
    "cc": {
      "band": 7.5,
      "reason": "Nhận xét chi tiết bằng tiếng Việt về mạch lạc nội bộ và liên kết với các body trước; nếu < 8.0 nêu rõ mất điểm ở câu nào.",
      "evidence": ["Trích dẫn cụ thể nếu có"],
      "fixes": ["Chỉ rõ cách sửa liên kết hoặc thay thế từ nối máy móc ở câu cụ thể"]
    },
    "lr": {
      "band": 7.0,
      "reason": "Nhận xét chi tiết bằng tiếng Việt: collocation B1–B2 đã tự nhiên chuẩn văn viết bản xứ (Band 7.0) chưa hay còn dịch word-by-word/lặp từ.",
      "evidence": ["Trích dẫn từ/cụm chưa tự nhiên (nếu có)"],
      "fixes": ["Gợi ý cụ thể: 'từ/cụm cũ' -> đổi sang 'collocation B1–B2 tự nhiên' (chỉ dùng C1–C2 nếu B1–B2 không đủ thay thế)"]
    },
    "gra": {
      "band": 7.0,
      "reason": "Nhận xét chi tiết bằng tiếng Việt về lỗi ngữ pháp hoặc chỗ cần thêm câu phức tự nhiên để chắc chắn đạt Band 7.0.",
      "evidence": ["Trích dẫn câu/cấu trúc gây mất điểm (nếu có)"],
      "fixes": ["Chỉ rõ lỗi cần sửa và viết mẫu câu phức Band 7.0 rõ ràng, tự nhiên thay thế cho câu đó"]
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
      "studentWord": "Từ/cụm từ còn chưa tự nhiên hoặc bị lặp",
      "betterAlternative": "Collocation B1–B2 tự nhiên mà người bản xứ hay dùng (chỉ dùng C1–C2 khi B1–B2 không đủ thay thế)",
      "reason": "Giải thích ngắn gọn bằng tiếng Việt vì sao cụm này tự nhiên và chuẩn Band 7.0 hơn"
    }
  ],
  "generalFeedback": "Tổng kết 2–3 câu bằng tiếng Việt: Body này đã đạt mục tiêu (TR >= 8.0, CC >= 8.0, LR >= 7.0, GRA >= 7.0) chưa và cần tập trung sửa gì nhất.",
  "modelUpgrade": "Phiên bản tham khảo hoàn chỉnh cho Body này (đạt TR/CC 8.0+ với văn phong B1–B2 tự nhiên, dễ học hỏi, không phô trương từ hiếm)."
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
        maxOutputTokens: 3000,
        perModelTimeoutMs: 22_000,
        totalBudgetMs: 52_000,
      }
    );

    return NextResponse.json(data, { status: 200 });
  } catch (error: any) {
    console.error('[task2-grade] Error:', error);
    const { message, status } = formatGeminiError(error, 'Lỗi chấm điểm Task 2: ');
    return NextResponse.json({ error: message }, { status });
  }
}
