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
- Từ vựng & ngữ pháp Band 7.0+ gợi ý cho Body này: ${currentOutline ? JSON.stringify({ vocab: currentOutline.vocabSuggestions || [], grammar: currentOutline.grammarSuggestions || [], legacyPoints: currentOutline.keyPoints || [] }) : 'Theo biểu đồ'}
- Bài viết tiếng Anh của học viên cho Body ${bodyIndex + 1}:
"""
${cleanContent}
"""

=== YÊU CẦU CHẤM ĐIỂM CHUẨN IELTS (ĐÁNH CỰC GẮT VÀO 2 TIÊU CHÍ TA & CC ĐỂ GÁNH ĐIỂM > 8.0) ===
Học viên dùng **TA** và **CC** để gánh điểm > 8.0 trong khi luyện nâng **LR & GRA**. Vì vậy, hãy đóng vai giám khảo Cambridge KHẮT KHE TỘT ĐỘ với riêng **TA** và **CC** (chỉ cho 8.0–9.0 khi thực sự xuất sắc, soi mọi lỗ hổng nhỏ):

1. "task" — Task Achievement (TA) [CHẤM CỰC GẮT]:
   - Body 1 (Intro): BẮT BUỘC paraphrase trôi chảy và đủ 100% các chiều thông tin (loại biểu đồ, đối tượng, đơn vị đo, địa điểm/nhóm, mốc thời gian đầy đủ). Thiếu 1 chiều thông tin hoặc copy > 3 từ liên tiếp từ đề -> TRẦN TA <= 6.5–7.0.
   - Body 2 (Overview): BẮT BUỘC nêu đủ 2 tầng tổng quan (xu hướng/thứ bậc chính + điểm tương phản/ngoại lệ/bước ngoặt nổi bật nhất). Thiếu điểm nổi bật thứ 2 hoặc lỡ chèn số liệu cụ thể -> TRẦN TA <= 7.0.
   - Body 3 & Body 4 (Detail 1 & 2): BẮT BUỘC gom nhóm thông minh, đối chiếu định lượng sắc bén (gấp mấy lần, chênh lệch, điểm cắt/đỉnh-đáy) và ĐÚNG TUYỆT ĐỐI 100% số liệu trong 'chartData'. Nếu liệt kê số liệu máy móc không so sánh, sai bất kỳ con số/nhãn nào, hoặc lặp lại thông tin của Body trước -> TRẦN TA <= 6.5–7.0.
2. "cc" — Coherence and Cohesion (CC) [CHẤM CỰC GẮT]:
   - Chuẩn Band 8.0–9.0 đòi hỏi "liên kết tàng hình" (referencing 'this figure', 'respectively', 'the former/latter', 'mirroring this pattern', 'within the same timeframe') và tiến trình ý hoàn hảo từ câu mở đoạn đến số liệu chứng minh.
   - Lạm dụng từ nối liệt kê máy móc đầu câu (Firstly, Secondly, Moreover, In addition, In conclusion) hoặc chuyển câu gượng ép -> TRẦN CC <= 7.0.
   - LIÊN KẾT GIỮA CÁC BODY: Kiểm tra gắt sự kết nối với 'previousBodies' (Body 2 phải nối mượt từ Intro; Body 3 phải mở đúng mạch nhóm ý từ Overview; Body 4 phải đối chiếu/chuyển ý mượt với Body 3). Rời rạc hoặc đứt mạch -> TRẦN CC <= 7.0.
3. "lr" — Lexical Resource (LR):
   - Chấm chuẩn xác thực tế theo IELTS Band Descriptors (từ 7.0–9.0 nếu collocations & từ vựng mô tả xu hướng/so sánh/tỷ lệ học thuật chính xác, tránh lặp; dưới 7.0 nếu còn từ vựng sơ đẳng như "increase/decrease, big/small, good" lặp đi lặp lại).
4. "gra" — Grammatical Range and Accuracy (GRA):
   - Chấm chuẩn xác thực tế: đa dạng câu phức (mệnh đề quan hệ, phân từ, cấu trúc so sánh nâng cao, bị động chuẩn cho process/map, "while/whereas/with + V-ing/N"), chia đúng thì nhất quán với 'previousBodies', sạch lỗi mạo từ/giới từ/chủ-vị.

KIỂM TRA ĐẶC BIỆT:
- Nếu học viên viết tiếng Việt, viết linh tinh, hoặc lạc đề -> <= 4.0.
- Thang điểm mỗi tiêu chí từ 0.0 đến 9.0 (bước 0.5).
- Bắt buộc chỉ rõ từng lỗi khiến TA và CC mất điểm (nếu < 8.5) kèm trích dẫn cụ thể để học viên sửa đến khi TA/CC thực sự xứng đáng > 8.0.
- QUAN TRỌNG NHẤT: Với TẤT CẢ 4 tiêu chí, KHÔNG CHỈ nhận xét lỗi mà BẮT BUỘC phải đưa "fixes" (1–3 gợi ý sửa CỤ THỂ, thực dụng để học viên sửa ngay trên bài viết của mình):
  + Ở "task" (TA): chỉ rõ cần thêm/sửa ý nào VÀO ĐÚNG VỊ TRÍ NÀO (VD: "Chèn sau câu đầu tiên...", "Thay câu thứ 2 bằng...") kèm câu/mẫu diễn đạt gợi ý cụ thể có số liệu chính xác từ biểu đồ.
  + Ở "cc": chỉ rõ cần thay từ nối nào ở câu nào thành cụm chuyển/quy chiếu tinh tế nào (VD: "Đổi 'Moreover' ở câu 3 thành 'Mirroring this pattern, ...'").
  + Ở "lr": chỉ rõ từ/cụm nào trong bài cần đổi sang từ/collocation Band 7.5–8.5 nào (VD: "'rose rapidly' -> 'experienced a steep upward trajectory'").
  + Ở "gra": chỉ rõ lỗi ngữ pháp/câu đơn cần sửa hoặc gộp thế nào kèm câu viết lại chuẩn Band 7.5–8.5.
- Không chấm nương tay TA & CC, đồng thời giữ chuẩn công bằng mốc >= 7.5 overall (không tiêu chí nào < 7.0) để qua Body.

YÊU CẦU ĐẦU RA JSON (BẮT BUỘC CHỈ TRẢ VỀ JSON HỢP LỆ, KHÔNG MARKDOWN):
{
  "criteria": {
    "task": {
      "band": 7.0,
      "reason": "Giải thích chi tiết bằng tiếng Việt: đạt điểm ở đâu và BỊ MẤT ĐIỂM ở đâu, vì sao (đặc biệt nêu rõ thiếu ý, sai số liệu, hoặc lặp ý với body trước nếu có).",
      "evidence": ["Trích dẫn chính xác cụm/câu gây mất điểm hoặc thiếu sót cụ thể"],
      "fixes": ["Chỉ rõ cần thêm/sửa câu nào vào vị trí nào (kèm câu tiếng Anh gợi ý chứa đúng số liệu nếu thiếu ý)"]
    },
    "cc": {
      "band": 7.5,
      "reason": "Giải thích chi tiết bằng tiếng Việt về mạch lạc nội bộ và liên kết với các body trước; nếu < 7.5 hoặc < 9.0 phải nêu rõ mất điểm ở chỗ nào và vì sao.",
      "evidence": ["Trích dẫn cụ thể nếu có"],
      "fixes": ["Chỉ rõ thay cụm nối/chuyển câu ở vị trí nào bằng phép quy chiếu hoặc từ nối tinh tế nào"]
    },
    "lr": {
      "band": 6.5,
      "reason": "Giải thích chi tiết bằng tiếng Việt: từ vựng nào còn cơ bản, lặp lại từ các body trước hay dùng sai collocation khiến mất điểm.",
      "evidence": ["Trích dẫn từ/cụm từ bị trừ điểm"],
      "fixes": ["Liệt kê cụ thể: 'cụm trong bài' -> đổi thành 'cụm Band 7.5–8.5'"]
    },
    "gra": {
      "band": 7.0,
      "reason": "Giải thích chi tiết bằng tiếng Việt: lỗi ngữ pháp hoặc lý do thiếu đa dạng cấu trúc câu phức gây mất điểm.",
      "evidence": ["Trích dẫn câu/lỗi gây mất điểm"],
      "fixes": ["Chỉ rõ sửa lỗi/viết lại câu nào sang cấu trúc phức Band 7.5–8.5 cụ thể"]
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
