export const maxDuration = 60;

import { NextRequest, NextResponse } from 'next/server';
import { formatGeminiError, generateJsonWithFallback } from '@/lib/gemini-helper';
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
- Từ vựng & ngữ pháp Band 7.0+ gợi ý cho Body này: ${currentOutline ? JSON.stringify({ vocab: currentOutline.vocabSuggestions || [], grammar: currentOutline.grammarSuggestions || [], legacyPoints: currentOutline.keyPoints || [] }) : 'Theo biểu đồ'}
- Bài viết tiếng Anh của học viên cho Body ${bodyIndex + 1}:
"""
${cleanContent}
"""

=== YÊU CẦU CHẤM ĐIỂM CHUẨN IELTS (SIẾT GẮT TA >= 8.0 & CC >= 8.0 — MỤC TIÊU LR >= 7.0 & GRA >= 7.0) ===
Học viên dùng **TA >= 8.0** và **CC >= 8.0** để gánh điểm, còn **LR và GRA chỉ cần đạt chuẩn Band 7.0**. Vì vậy, hãy đóng vai giám khảo Cambridge KHẮT KHE TỘT ĐỘ với riêng **TA** và **CC**, còn **LR & GRA** chấm thực tế đúng chuẩn **Band 7.0** (tự nhiên, chính xác, KHÔNG ép từ phức tạp C1–C2):

1. "task" — Task Achievement (TA) [CHẤM CỰC GẮT — MỤC TIÊU >= 8.0]:
   - Body 1 (Intro): BẮT BUỘC paraphrase trôi chảy và đủ 100% các chiều thông tin (loại biểu đồ, đối tượng, đơn vị đo, địa điểm/nhóm, mốc thời gian đầy đủ). Thiếu 1 chiều thông tin hoặc copy > 3 từ liên tiếp từ đề -> TRẦN TA <= 6.5–7.0.
   - Body 2 (Overview): BẮT BUỘC nêu đủ 2 tầng tổng quan (xu hướng/thứ bậc chính + điểm tương phản/ngoại lệ/bước ngoặt nổi bật nhất). Thiếu điểm nổi bật thứ 2 hoặc lỡ chèn số liệu cụ thể -> TRẦN TA <= 7.0.
   - Body 3 & Body 4 (Detail 1 & 2): BẮT BUỘC gom nhóm thông minh, đối chiếu định lượng sắc bén (gấp mấy lần, chênh lệch, điểm cắt/đỉnh-đáy) và ĐÚNG TUYỆT ĐỐI 100% số liệu trong 'chartData'. Nếu liệt kê số liệu máy móc không so sánh, sai bất kỳ con số/nhãn nào, hoặc lặp lại thông tin của Body trước -> TRẦN TA <= 6.5–7.0.
2. "cc" — Coherence and Cohesion (CC) [CHẤM CỰC GẮT — MỤC TIÊU >= 8.0]:
   - Chuẩn Band 8.0–9.0 đòi hỏi "liên kết tàng hình" (referencing 'this figure', 'respectively', 'the former/latter', 'mirroring this pattern', 'within the same period') và tiến trình ý hoàn hảo từ câu mở đoạn đến số liệu chứng minh.
   - Lạm dụng từ nối liệt kê máy móc đầu câu (Firstly, Secondly, Moreover, In addition, In conclusion) hoặc chuyển câu gượng ép -> TRẦN CC <= 7.0–7.5.
   - LIÊN KẾT GIỮA CÁC BODY: Kiểm tra gắt sự kết nối với 'previousBodies' (Body 2 phải nối mượt từ Intro; Body 3 phải mở đúng mạch nhóm ý từ Overview; Body 4 phải đối chiếu/chuyển ý mượt với Body 3). Rời rạc hoặc đứt mạch -> TRẦN CC <= 7.0–7.5.
3. "lr" — Lexical Resource (LR) [MỤC TIÊU >= 7.0 — B1–B2 COLLOCATION TỰ NHIÊN]:
   - Học viên CHỈ aim LR **7.0**, ưu tiên **collocations tự nhiên mức B1–B2 mà người bản xứ hay dùng trong văn viết** (VD: "account for", "reach a peak of", "rise steadily", "drop sharply", "remain stable", "in comparison with", "by contrast").
   - TUYỆT ĐỐI KHÔNG trừ điểm hay ép xuống dưới 7.0 chỉ vì học viên không dùng từ hiếm C1–C2! Nếu dùng đúng collocation B1–B2 tự nhiên, ít lặp từ sơ đẳng một cách máy móc và đúng sắc thái mô tả số liệu -> cho >= 7.0 xứng đáng. Chỉ trừ xuống <= 6.5 khi dùng sai collocation, dịch word-by-word từ tiếng Việt, lặp từ đơn giản liên tục hoặc sai chính tả/loại từ đáng kể.
4. "gra" — Grammatical Range and Accuracy (GRA) [MỤC TIÊU >= 7.0]:
   - Chấm đúng chuẩn **Band 7.0**: kết hợp tự nhiên câu đơn và câu phức phổ biến (while/whereas, mệnh đề quan hệ, bị động chuẩn cho process/map, cấu trúc so sánh rõ ràng, "before + V-ing"), chia đúng thì nhất quán với 'previousBodies', phần lớn câu sạch lỗi mạo từ/giới từ/chủ-vị. Không đòi hỏi cấu trúc đảo ngữ/C2 hiếm gặp để đạt 7.0.

KIỂM TRA ĐẶC BIỆT:
- Nếu học viên viết tiếng Việt, viết linh tinh, hoặc lạc đề -> <= 4.0.
- Thang điểm mỗi tiêu chí từ 0.0 đến 9.0 (bước 0.5).
- Bắt buộc chỉ rõ từng lỗi khiến TA và CC mất điểm (nếu < 8.0) kèm trích dẫn cụ thể để học viên sửa đến khi TA >= 8.0 và CC >= 8.0.
- QUAN TRỌNG NHẤT: Với TẤT CẢ 4 tiêu chí, KHÔNG CHỈ nhận xét lỗi mà BẮT BUỘC phải đưa "fixes" (1–3 gợi ý sửa CỤ THỂ, thực dụng để học viên sửa ngay trên bài viết của mình):
  + Ở "task" (TA): chỉ rõ cần thêm/sửa ý nào VÀO ĐÚNG VỊ TRÍ NÀO (VD: "Chèn sau câu đầu tiên...", "Thay câu thứ 2 bằng...") kèm câu/mẫu diễn đạt gợi ý cụ thể có số liệu chính xác từ biểu đồ (dùng từ vựng B1–B2 tự nhiên).
  + Ở "cc": chỉ rõ cần thay từ nối nào ở câu nào thành cụm chuyển/quy chiếu tự nhiên nào (VD: "Đổi 'Moreover' ở câu 3 thành 'In contrast, ...' hoặc 'This figure...'").
  + Ở "lr": chỉ rõ từ/cụm nào bị lặp hoặc sai collocation cần đổi sang **collocation tự nhiên mức B1–B2** (VD: "'go up a lot' -> 'increase significantly / see a sharp rise'"). CHỈ gợi ý từ C1–C2 khi thật sự không có cụm B1–B2 tự nhiên thay thế!
  + Ở "gra": chỉ rõ lỗi ngữ pháp/câu đơn cần sửa hoặc gộp thế nào kèm câu viết lại rõ ràng chuẩn Band 7.0+ (dùng while/whereas/which/passive tự nhiên, không cầu kỳ quá mức).
- Không chấm nương tay TA (>= 8.0) và CC (>= 8.0); còn LR & GRA chấm đúng công bằng ở mức chuẩn Band 7.0 (>= 7.0 là đạt).

YÊU CẦU ĐẦU RA JSON (BẮT BUỘC CHỈ TRẢ VỀ JSON HỢP LỆ, KHÔNG MARKDOWN):
{
  "criteria": {
    "task": {
      "band": 7.5,
      "reason": "Giải thích chi tiết bằng tiếng Việt: TA đạt ở đâu và thiếu gì để chạm >= 8.0 (nếu < 8.0 phải nêu rõ thiếu ý, sai số liệu, hoặc lặp ý với body trước).",
      "evidence": ["Trích dẫn chính xác cụm/câu gây mất điểm hoặc thiếu sót cụ thể"],
      "fixes": ["Chỉ rõ cần thêm/sửa câu nào vào vị trí nào (kèm câu tiếng Anh gợi ý chứa đúng số liệu)"]
    },
    "cc": {
      "band": 7.5,
      "reason": "Giải thích chi tiết bằng tiếng Việt về mạch lạc nội bộ và liên kết với các body trước; nếu < 8.0 phải nêu rõ đứt mạch hay máy móc ở đâu.",
      "evidence": ["Trích dẫn cụ thể nếu có"],
      "fixes": ["Chỉ rõ thay cụm nối/chuyển câu ở vị trí nào bằng phép quy chiếu hoặc từ nối tự nhiên nào"]
    },
    "lr": {
      "band": 7.0,
      "reason": "Giải thích chi tiết bằng tiếng Việt: collocation B1–B2 đã tự nhiên chuẩn văn viết bản xứ (Band 7.0) chưa hay còn lặp từ/dịch word-by-word.",
      "evidence": ["Trích dẫn từ/cụm cần chỉnh (nếu có)"],
      "fixes": ["Liệt kê cụ thể: 'cụm trong bài' -> đổi thành 'collocation B1–B2 tự nhiên chuẩn Band 7.0' (chỉ dùng C1–C2 nếu không có từ B1–B2 thay thế)"]
    },
    "gra": {
      "band": 7.0,
      "reason": "Giải thích chi tiết bằng tiếng Việt: lỗi ngữ pháp hoặc chỗ cần thêm câu phức tự nhiên (while/which/passive) để chắc chắn đạt Band 7.0.",
      "evidence": ["Trích dẫn câu/lỗi gây mất điểm (nếu có)"],
      "fixes": ["Chỉ rõ sửa lỗi/viết lại câu nào theo cấu trúc Band 7.0 rõ ràng, tự nhiên"]
    }
  },
  "crossBodyFeedback": "Nhận xét chuyên sâu bằng tiếng Việt về sự liên kết giữa Body hiện tại với các Body trước đó (và định hướng cho Body sau nếu còn): từ nối chuyển đoạn, sự nhất quán thì/dữ liệu, tránh trùng lặp ý/từ.",
  "grammarErrors": [
    {
      "original": "Cụm từ/câu sai",
      "correction": "Cách sửa chuẩn",
      "explanation": "Giải thích bản chất lỗi ngữ pháp bằng tiếng Việt"
    }
  ],
  "vocabularyTips": [
    {
      "studentWord": "Từ/cụm từ còn chưa tự nhiên hoặc bị lặp",
      "betterAlternative": "Collocation B1–B2 tự nhiên mà người bản xứ hay dùng (chỉ dùng C1–C2 nếu B1–B2 không đủ thay thế)",
      "reason": "Giải thích ngắn gọn bằng tiếng Việt vì sao collocation này tự nhiên và chuẩn Band 7.0 hơn"
    }
  ],
  "generalFeedback": "Tổng kết ngắn gọn (2–3 câu) bằng tiếng Việt: Body này đã đạt mục tiêu (TA >= 8.0, CC >= 8.0, LR >= 7.0, GRA >= 7.0) chưa và cần ưu tiên sửa điểm nào nhất.",
  "modelUpgrade": "CHỈ viết 1 phiên bản tham khảo hoàn chỉnh cho Body này (đạt TA/CC 8.0+ với văn phong B1–B2 tự nhiên, không phô trương từ hiếm)."
}
Lưu ý: Hãy viết nhận xét súc tích, đúng trọng tâm (1–2 câu mỗi mục) để phản hồi nhanh.
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
        maxOutputTokens: 3000,
        perModelTimeoutMs: 22_000,
        totalBudgetMs: 52_000,
      }
    );

    return NextResponse.json(data, { status: 200 });
  } catch (error: any) {
    console.error('[task1-grade] Error:', error);
    const { message, status } = formatGeminiError(error, 'Lỗi chấm điểm Task 1: ');
    return NextResponse.json({ error: message }, { status });
  }
}
