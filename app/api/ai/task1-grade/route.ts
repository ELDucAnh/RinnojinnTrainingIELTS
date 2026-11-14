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
Mục tiêu bắt buộc để qua được Body hiện tại là phải ĐẠT CHUẨN BAND 7.5 (Overall Band của Body >= 7.5 và không có tiêu chí nào dưới 7.0).

=== ĐỀ BÀI & DỮ LIỆU BIỂU ĐỒ GỐC ===
${chartDataSummary}

=== TOÀN BỘ DÀN Ý 4 BODY (TIẾNG VIỆT) ===
${fullOutlineSummary}

=== CÁC BODY HỌC VIÊN ĐÃ VIẾT & ĐẠT TRƯỚC ĐÓ ===
${previousBodiesText}

=== BODY HIỆN TẠI ĐANG CHẤM ===
- Vị trí: ${currentTemplate.label} (${currentOutline?.role || currentTemplate.role})
- Dàn ý tiếng Việt cho Body này: ${currentOutline ? JSON.stringify(currentOutline.viGuide) : 'Theo chuẩn IELTS Task 1'}
- Điểm dữ liệu gợi ý: ${currentOutline ? JSON.stringify(currentOutline.keyPoints) : 'Theo biểu đồ'}
- Bài viết tiếng Anh của học viên cho Body ${bodyIndex + 1}:
"""
${cleanContent}
"""

=== YÊU CẦU CHẤM ĐIỂM CHUẨN IELTS BAND 7.5 (4 TIÊU CHÍ) ===
Hãy chấm đoạn văn trên theo ĐÚNG 4 tiêu chí IELTS Academic Writing Task 1:
1. "task" — Task Achievement (TA):
   - Body 1 (Intro): Có paraphrase chính xác ngữ cảnh, đối tượng, địa điểm, thời gian, đơn vị của biểu đồ không? Nếu copy nguyên xi đề bài hoặc sai thông tin -> trừ điểm nặng (<= 6.5).
   - Body 2 (Overview): Có nêu được bức tranh tổng quan và ít nhất 2 xu hướng/đặc điểm nổi bật nhất không? Có lỡ chèn số liệu chi tiết quá mức vào Overview không?
   - Body 3 & Body 4 (Detail 1 & 2): Có báo cáo chính xác 100% số liệu/bước/vị trí trong dữ liệu biểu đồ gốc không? Có chọn lọc, nhóm thông tin và so sánh rõ ràng không, hay chỉ liệt kê máy móc? Có bị lặp lại thông tin đã viết ở Body trước không?
2. "cc" — Coherence and Cohesion (CC):
   - Các câu bên trong Body có liên kết logic, dùng phép quy chiếu (this, these, respectively, the former...) và từ nối tự nhiên không?
   - LIÊN KẾT VỚI CÁC BODY KHÁC: Body hiện tại có nối mạch tự nhiên với các body đã viết trước đó không (VD: Body 2 Overview chuyển từ Intro, Body 3 mở đầu phân tích chi tiết, Body 4 nối/đối chiếu mượt với Body 3 và khớp với Overview)?
3. "lr" — Lexical Resource (LR):
   - Từ vựng mô tả biểu đồ/quy trình/bản đồ có chính xác, mang tính học thuật (Band 7.5+ collocations), tránh lặp từ trong nội bộ Body và so với các Body trước?
   - Từ vựng quá đơn giản/thông thường (vd chỉ dùng "increase, decrease, big, small, good") -> KHÔNG thể đạt 7.5+.
4. "gra" — Grammatical Range and Accuracy (GRA):
   - Có sử dụng đa dạng cấu trúc câu phức (mệnh đề quan hệ, mệnh đề phân từ, cấu trúc so sánh nâng cao, bị động chuẩn cho process/map, cấu trúc "while/whereas/with + V-ing/N") một cách tự nhiên và chính xác không?
   - Có chia đúng thì (quá khứ/hiện tại/tương lai) nhất quán với các Body trước không?
   - Nếu toàn câu đơn giản hoặc còn nhiều lỗi ngữ pháp/giới từ/mạo từ/dấu câu -> dưới 7.5.

KIỂM TRA ĐẶC BIỆT:
- Nếu học viên viết bằng tiếng Việt, viết linh tinh, hoặc lạc đề hoàn toàn -> chấm <= 4.0 cho các tiêu chí liên quan.
- Thang điểm mỗi tiêu chí là 0.0 đến 9.0 (chỉ dùng bước 0.5: ví dụ 5.5, 6.0, 6.5, 7.0, 7.5, 8.0, 8.5, 9.0).
- KHÔNG chấm lỏng tay để cho qua nếu chưa đạt chất lượng Band 7.5 thực sự, nhưng cũng KHÔNG dìm điểm vô lý nếu bài thực sự đạt chuẩn Band 7.5–8.5.

YÊU CẦU ĐẦU RA JSON (BẮT BUỘC CHỈ TRẢ VỀ JSON HỢP LỆ, KHÔNG MARKDOWN):
{
  "criteria": {
    "task": {
      "band": 7.0,
      "reason": "Giải thích chi tiết bằng tiếng Việt: đạt điểm ở đâu và BỊ MẤT ĐIỂM ở đâu, vì sao (đặc biệt nêu rõ thiếu ý, sai số liệu, hoặc lặp ý với body trước nếu có).",
      "evidence": ["Trích dẫn chính xác cụm/câu gây mất điểm hoặc thiếu sót cụ thể"]
    },
    "cc": {
      "band": 7.5,
      "reason": "Giải thích chi tiết bằng tiếng Việt về mạch lạc nội bộ và liên kết với các body trước; nếu < 7.5 hoặc < 9.0 phải nêu rõ mất điểm ở chỗ nào và vì sao.",
      "evidence": ["Trích dẫn cụ thể nếu có"]
    },
    "lr": {
      "band": 6.5,
      "reason": "Giải thích chi tiết bằng tiếng Việt: từ vựng nào còn cơ bản, lặp lại từ các body trước hay dùng sai collocation khiến mất điểm.",
      "evidence": ["Trích dẫn từ/cụm từ bị trừ điểm"]
    },
    "gra": {
      "band": 7.0,
      "reason": "Giải thích chi tiết bằng tiếng Việt: lỗi ngữ pháp hoặc lý do thiếu đa dạng cấu trúc câu phức gây mất điểm.",
      "evidence": ["Trích dẫn câu/lỗi gây mất điểm"]
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
      "studentWord": "Từ/cụm từ còn đơn giản hoặc lặp",
      "betterAlternative": "Từ/cụm từ học thuật Band 7.5–8.5 thay thế",
      "reason": "Giải thích sắc thái và lý do nâng cấp bằng tiếng Việt"
    }
  ],
  "generalFeedback": "Tổng kết ngắn gọn (2–3 câu) bằng tiếng Việt: Body này đã đạt chuẩn Band 7.5 chưa và cần ưu tiên sửa điểm nào nhất.",
  "modelUpgrade": "CHỈ viết 1 phiên bản nâng cấp Band 8.0+ hoàn chỉnh cho Body này (để tham khảo sau khi đạt)."
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
        maxOutputTokens: 2200,
        perModelTimeoutMs: 20_000,
        totalBudgetMs: 50_000,
      }
    );

    return NextResponse.json(data, { status: 200 });
  } catch (error: any) {
    console.error('[task1-grade] Error:', error);
    const { message, status } = formatGeminiError(error, 'Lỗi chấm điểm Task 1: ');
    return NextResponse.json({ error: message }, { status });
  }
}
