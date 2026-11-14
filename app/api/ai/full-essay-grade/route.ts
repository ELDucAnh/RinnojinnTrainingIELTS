export const maxDuration = 60;

import { NextRequest, NextResponse } from 'next/server';
import { formatGeminiError, generateJsonWithFallback } from '@/lib/gemini-helper';
import {
  countWords,
  normalizeFullEssayGradeResult,
  type ChartData,
  type OutlineBodyItem,
} from '@/lib/writing-practice-types';

function summarizeChartData(chartData: ChartData): string {
  const axisValues = chartData.xValues || chartData.categories || [];
  const seriesText = (chartData.series || [])
    .map((s) => `  - ${s.name}: [${(s.values || []).join(', ')}]`)
    .join('\n');
  const segmentsText = (chartData.segments || [])
    .map((seg) => `  - ${seg.label}: ${seg.value}`)
    .join('\n');
  const tableText =
    chartData.headers?.length || chartData.rows?.length
      ? [
          chartData.headers?.length ? `  Cột: ${chartData.headers.join(' | ')}` : '',
          ...(chartData.rows || []).map((r) => `  Hàng: ${r.join(' | ')}`),
        ]
          .filter(Boolean)
          .join('\n')
      : '';
  const processText = (chartData.steps || [])
    .map((st) => `  - Bước ${st.id}: ${st.label} — ${st.description}`)
    .join('\n');
  const mapText = [
    chartData.location ? `Địa điểm: ${chartData.location}` : '',
    chartData.period1 ? `Giai đoạn 1 (${chartData.period1}): ${(chartData.features1 || []).map((f) => `${f.name} (${f.position}): ${f.description}`).join('; ')}` : '',
    chartData.period2 ? `Giai đoạn 2 (${chartData.period2}): ${(chartData.features2 || []).map((f) => `${f.name} (${f.position}): ${f.description}`).join('; ')}` : '',
    chartData.changes?.length ? `Thay đổi chính: ${chartData.changes.join(' | ')}` : '',
  ]
    .filter(Boolean)
    .join('\n');

  return [
    `Loại biểu đồ: ${chartData.type}`,
    `Tiêu đề: ${chartData.title}`,
    `Ngữ cảnh: ${chartData.context}`,
    `Đề bài (Task 1 Prompt): ${chartData.prompt}`,
    chartData.unit ? `Đơn vị: ${chartData.unit}` : '',
    chartData.year ? `Thời gian: ${chartData.year}` : '',
    axisValues.length ? `Trục / Nhãn: ${axisValues.join(', ')}` : '',
    seriesText ? `Dữ liệu chuỗi:\n${seriesText}` : '',
    segmentsText ? `Tỷ trọng:\n${segmentsText}` : '',
    tableText ? `Bảng số liệu:\n${tableText}` : '',
    processText ? `Quy trình:\n${processText}` : '',
    mapText || '',
  ]
    .filter(Boolean)
    .join('\n');
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      taskType,
      chartData,
      prompt: task2Prompt,
      essayType,
      outline,
      essay,
    }: {
      taskType: 'task1' | 'task2';
      chartData?: ChartData;
      prompt?: string;
      essayType?: string;
      outline?: OutlineBodyItem[];
      essay: string;
    } = body;

    if (taskType !== 'task1' && taskType !== 'task2') {
      return NextResponse.json({ error: 'taskType không hợp lệ.' }, { status: 400 });
    }

    const cleanEssay = typeof essay === 'string' ? essay.trim() : '';
    const wordCount = countWords(cleanEssay);
    if (wordCount < 35) {
      return NextResponse.json(
        {
          error: `Bài viết toàn bài còn quá ngắn (${wordCount} từ). Hãy viết đầy đủ các đoạn (tối thiểu ${taskType === 'task1' ? 150 : 250} từ) trước khi gửi AI chấm chữa toàn bài.`,
        },
        { status: 400 }
      );
    }

    if (taskType === 'task1' && !chartData?.context) {
      return NextResponse.json({ error: 'Thiếu dữ liệu đề bài Task 1.' }, { status: 400 });
    }
    if (taskType === 'task2' && !task2Prompt?.trim()) {
      return NextResponse.json({ error: 'Thiếu đề bài Task 2.' }, { status: 400 });
    }

    const expectedBodyCount = taskType === 'task1' ? 4 : 5;
    const minWordTarget = taskType === 'task1' ? 150 : 250;
    const taskCritName = taskType === 'task1' ? 'Task Achievement (TA)' : 'Task Response (TR)';
    const taskShort = taskType === 'task1' ? 'TA' : 'TR';

    const outlineSummary =
      Array.isArray(outline) && outline.length > 0
        ? outline
            .map(
              (o, idx) =>
                `- Body ${idx + 1} (${o.role}): ${(o.viGuide || []).join(' | ')}`
            )
            .join('\n')
        : 'Không có dàn ý đính kèm.';

    const promptContext =
      taskType === 'task1'
        ? `=== ĐỀ BÀI TASK 1 & DỮ LIỆU GỐC ===\n${summarizeChartData(chartData!)}`
        : `=== ĐỀ BÀI TASK 2 ===\n"${task2Prompt!.trim()}"\nDạng bài: ${essayType || 'IELTS Task 2'}`;

    const taskSpecificRules =
      taskType === 'task1'
        ? `
- "task" — Task Achievement (TA) [CHẤM CỰC GẮT — MỤC TIÊU >= 8.0]:
  + Độ dài: ${wordCount} từ (IELTS Task 1 yêu cầu >= 150 từ; nếu < 150 từ -> TRẦN TA <= 6.5).
  + Đoạn 1 (Intro): Phải paraphrase sắc gọn, đầy đủ 100% các chiều thông tin (đối tượng, đơn vị, địa điểm, mốc thời gian). Copy > 3 từ liên tiếp -> hạ TA.
  + Đoạn 2 (Overview): Phải bao quát đủ 2 tầng nổi bật (xu hướng/thứ bậc chính + điểm tương phản/bước ngoặt), KHÔNG đưa số liệu chi tiết. Thiếu Overview hoặc lỡ đưa số liệu -> TRẦN TA <= 6.5–7.0.
  + Các đoạn Detail: Gom nhóm thông minh, có đối chiếu định lượng (tỷ lệ/chênh lệch/đỉnh-đáy) và ĐÚNG TUYỆT ĐỐI 100% số liệu trong chartData. Sai bất kỳ con số nào -> hạ nặng TA <= 6.5.
- "cc" — Coherence & Cohesion (CC) [CHẤM CỰC GẮT — MỤC TIÊU >= 8.0]:
  + Phân đoạn rõ ràng chuẩn 4 đoạn (Intro -> Overview -> Detail 1 -> Detail 2).
  + Dòng chảy mạch lạc giữa các đoạn và trong từng đoạn nhờ phép quy chiếu tự nhiên ('this figure', 'respectively', 'the former/latter', 'mirroring this trend'). Lạm dụng từ nối liệt kê máy móc ('Firstly, Secondly, Moreover, In conclusion') -> TRẦN CC <= 7.0–7.5.`
        : `
- "task" — Task Response (TR) [CHẤM CỰC GẮT — MỤC TIÊU >= 8.0]:
  + Độ dài: ${wordCount} từ (IELTS Task 2 yêu cầu >= 250 từ; nếu < 250 từ -> TRẦN TR <= 6.5).
  + Mở bài: Paraphrase đề tự nhiên + Thesis trả lời TRỰC DIỆN mọi vế câu hỏi và lộ trình lập luận rõ.
  + Các thân bài (chuẩn cấu trúc 5 đoạn: Mở bài - Thân bài 1 - Thân bài 2 - Thân bài 3 mở rộng/phản biện - Kết bài): Topic sentence bám Thesis -> Cơ chế nhân-quả SÂU ("tại sao & bằng cách nào") -> Ví dụ/bối cảnh thực tế hợp lý -> Chốt luận điểm. Nếu hời hợt, bịa số liệu thống kê ảo, hoặc thân bài mâu thuẫn Thesis -> TRẦN TR <= 6.5–7.0.
  + Kết bài: Tổng hợp đủ các mạch ý chính và khẳng định lại Thesis, không đưa ý mới.
- "cc" — Coherence & Cohesion (CC) [CHẤM CỰC GẮT — MỤC TIÊU >= 8.0]:
  + Bố cục rõ 5 đoạn hoặc các đoạn mạch lạc tuyệt đối, nối tiếp ý mượt mà từ Intro -> Body 1 -> Body 2 -> Body 3 -> Conclusion.
  + Dùng phép quy chiếu & chuỗi từ vựng tự nhiên ('such measures', 'this shift', 'while...'). Lạm dụng 'Firstly, Secondly, Thirdly, Moreover, In conclusion' -> TRẦN CC <= 7.0–7.5.`;

    const aiPrompt = `
Bạn là cựu giám khảo IELTS Academic Writing CỰC KỲ KHẮT KHE & TỈ MỈ.
Học viên đã luyện xong dàn ý từng phần và bây giờ TỰ VIẾT TOÀN BỘ BÀI ESSAY HOÀN CHỈNH (${taskType === 'task1' ? 'Task 1' : 'Task 2'} — mục tiêu chuẩn ${expectedBodyCount} đoạn, độ dài >= ${minWordTarget} từ, bài hiện tại ${wordCount} từ).
Đây là chế độ **CHẤM & CHỮA TOÀN BÀI CHUYÊN SÂU** (chi tiết hơn cả chấm lẻ từng body): ngoài chấm 4 tiêu chí theo đúng chiến lược **${taskShort} >= 8.0, CC >= 8.0, LR >= 7.0, GRA >= 7.0 (Overall >= 7.5)**, bạn phải soi TỪNG ĐOẠN trong bài, phát hiện lỗi lặp từ/ý XUYÊN SUỐT CÁC ĐOẠN, kiểm tra mạch chuyển đoạn toàn cục và gợi ý sửa CỤ THỂ từng chỗ.

${promptContext}

=== DÀN Ý GỐC HỌC VIÊN ĐÃ HỌC (THAM KHẢO ĐỐI CHIẾU CẤU TRÚC) ===
${outlineSummary}

=== BÀI ESSAY HOÀN CHỈNH DO HỌC VIÊN TỰ VIẾT (${wordCount} từ) ===
"""
${cleanEssay}
"""

=== CHIẾN LƯỢC CHẤM ĐIỂM TOÀN BÀI (${taskShort} 8.0 · CC 8.0 · LR 7.0 · GRA 7.0) ===
${taskSpecificRules}
- "lr" — Lexical Resource (LR) [MỤC TIÊU >= 7.0 — B1–B2 COLLOCATION TỰ NHIÊN]:
  + Học viên CHỈ aim LR **7.0**, ưu tiên **collocation tự nhiên mức B1–B2 mà người bản xứ hay dùng trong văn viết học thuật vừa phải**${taskType === 'task1' ? ' (VD: account for, reach a peak of, rise steadily, drop sharply, by contrast, in comparison with)' : ' (VD: play a crucial role, raise public awareness, face financial pressure, have a serious impact on)'}.
  + TUYỆT ĐỐI KHÔNG trừ điểm hay ép xuống dưới 7.0 chỉ vì học viên không dùng từ hiếm C1–C2! Chỉ trừ xuống <= 6.5 nếu lặp từ sơ đẳng xuyên suốt nhiều đoạn, dịch word-by-word từ tiếng Việt hoặc sai collocation.
- "gra" — Grammatical Range & Accuracy (GRA) [MỤC TIÊU >= 7.0]:
  + Kết hợp tự nhiên câu đơn và câu phức phổ biến (while/whereas, mệnh đề quan hệ, câu điều kiện, bị động, phân từ), chia thì nhất quán xuyên suốt toàn bài và kiểm soát tốt mạo từ/giới từ/chủ-vị. Không đòi hỏi đảo ngữ/C2 hiếm mới cho 7.0.

=== YÊU CẦU CHỮA CHI TIẾT TOÀN BÀI ===
1. Với TẤT CẢ 4 tiêu chí trong "criteria", bắt buộc có "fixes" cụ thể (thêm câu gì vào đoạn nào, đổi "'cụm cũ' -> 'collocation B1–B2 mới'", sửa ngữ pháp câu nào thành câu gì). CHỈ dùng C1–C2 nếu B1–B2 không đủ thay thế.
2. "paragraphBreakdown": Mổ xẻ TỪNG ĐOẠN thực tế trong bài viết của học viên (tối thiểu các đoạn hiện có trong bài): nêu điểm làm tốt ("strengths"), chỗ yếu/mất điểm ("weaknesses"), và "suggestedEdit" (gợi ý câu sửa/viết lại cụ thể cho đoạn đó theo văn phong B1–B2 tự nhiên + cấu trúc 8.0).
3. "repetitionAlerts": Liệt kê tất cả từ/cụm từ/cấu trúc hoặc ý bị lặp qua lại giữa các đoạn trong toàn bài (kèm gợi ý đổi sang B1–B2 collocation khác nhau ở mỗi đoạn).
4. "wholeEssayStructureFeedback": Đánh giá tổng thể mạch liên kết giữa tất cả các đoạn từ mở bài tới kết bài, tỷ lệ phân bổ dung lượng giữa các đoạn và số từ (${wordCount} từ).
5. "grammarErrors" & "vocabularyTips": Rà soát kỹ TOÀN BỘ bài viết (không bỏ sót lỗi nào đáng kể ở bất kỳ đoạn nào).
6. "modelUpgrade": Viết lại HOÀN CHỈNH toàn bộ bài essay này thành bản mẫu chuẩn **${taskShort}/CC 8.5 · LR/GRA 7.5+ (Overall 8.0+)** bám sát đúng dữ liệu/lập trường của học viên, dùng collocation B1–B2 tự nhiên mượt mà để học viên đối chiếu học trực tiếp.

TRẢ VỀ DUY NHẤT JSON HỢP LỆ (KHÔNG MARKDOWN, KHÔNG \`\`\`):
{
  "criteria": {
    "task": {
      "band": 7.5,
      "reason": "Đánh giá chi tiết ${taskCritName} trên toàn bài bằng tiếng Việt (nêu rõ đạt ở đâu, mất điểm ở đoạn nào để chạm >= 8.0).",
      "evidence": ["Trích dẫn cụ thể từ bài hoặc thiếu sót rõ ràng"],
      "fixes": ["Chỉ rõ cần thêm/sửa câu nào ở đoạn nào kèm câu tiếng Anh gợi ý"]
    },
    "cc": {
      "band": 7.5,
      "reason": "Đánh giá chi tiết mạch lạc, chia đoạn, phép quy chiếu & dòng chảy toàn bài; nếu < 8.0 chỉ rõ đoạn/câu nào bị khựng.",
      "evidence": ["Trích dẫn cụ thể nếu có"],
      "fixes": ["Chỉ rõ sửa liên kết đoạn/câu nào bằng quy chiếu tự nhiên gì"]
    },
    "lr": {
      "band": 7.0,
      "reason": "Đánh giá chi tiết độ tự nhiên của collocation B1–B2 xuyên suốt toàn bài.",
      "evidence": ["Trích dẫn cụm từ chưa tự nhiên hoặc bị lặp xuyên suốt các đoạn"],
      "fixes": ["Gợi ý cụ thể: 'từ/cụm cũ' -> 'collocation B1–B2 bản xứ'"]
    },
    "gra": {
      "band": 7.0,
      "reason": "Đánh giá chi tiết độ đa dạng cấu trúc & độ chính xác ngữ pháp toàn bài.",
      "evidence": ["Trích dẫn câu lỗi hoặc câu quá đơn điệu"],
      "fixes": ["Chỉ rõ cách sửa lỗi & mẫu câu phức Band 7.0+ thay thế"]
    }
  },
  "wholeEssayStructureFeedback": "Nhận xét tổng thể cấu trúc toàn bài, cân đối dung lượng, mạch chuyển giữa các đoạn và độ dài ${wordCount} từ.",
  "paragraphBreakdown": [
    {
      "label": "Đoạn 1 (Mở bài / Intro)",
      "role": "Chức năng đoạn này trong cấu trúc chuẩn",
      "strengths": "Điểm làm tốt của đoạn",
      "weaknesses": "Điểm còn yếu / mất điểm của đoạn",
      "suggestedEdit": "Hướng sửa cụ thể + câu/đoạn mẫu nâng cấp cho đoạn này"
    }
  ],
  "repetitionAlerts": [
    "Lặp từ/cụm X ở đoạn 1 & đoạn 3 -> nên đa dạng bằng B1–B2 collocation Y/Z"
  ],
  "grammarErrors": [
    {
      "original": "Cụm/câu sai",
      "correction": "Cách sửa chuẩn",
      "explanation": "Giải thích bằng tiếng Việt"
    }
  ],
  "vocabularyTips": [
    {
      "studentWord": "Từ/cụm còn thô hoặc bị lặp",
      "betterAlternative": "Collocation B1–B2 tự nhiên (chỉ dùng C1–C2 nếu không có cụm B1–B2 tương đương)",
      "reason": "Giải thích vì sao tự nhiên và đúng chuẩn Band 7.0 hơn"
    }
  ],
  "generalFeedback": "Tổng kết 2–3 câu bằng tiếng Việt về bài essay hoàn chỉnh (${taskShort} >= 8.0, CC >= 8.0, LR >= 7.0, GRA >= 7.0) và việc cần ưu tiên sửa ngay.",
  "modelUpgrade": "Toàn bộ bài essay nâng cấp hoàn chỉnh chuẩn 8.0+ (ngắt đoạn bằng \\n\\n, giữ văn phong B1–B2 tự nhiên mạch lạc)."
}
`.trim();

    const { data } = await generateJsonWithFallback(
      aiPrompt,
      `full-essay-grade:${taskType}`,
      (parsed) => {
        if (!parsed || !parsed.criteria) {
          throw new Error('AI trả về thiếu trường criteria');
        }
        return normalizeFullEssayGradeResult(parsed);
      },
      {
        temperature: 0.35,
        maxOutputTokens: 4500,
        perModelTimeoutMs: 26_000,
        totalBudgetMs: 55_000,
      }
    );

    return NextResponse.json(data, { status: 200 });
  } catch (error: any) {
    console.error('[full-essay-grade] Error:', error);
    const { message, status } = formatGeminiError(error, 'Lỗi chấm chữa toàn bài: ');
    return NextResponse.json({ error: message }, { status });
  }
}
