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
  normalizeFullEssayGradeResult,
  type ChartData,
  type OutlineBodyItem,
  type PreviousAttemptSummary,
} from '@/lib/writing-practice-types';

type FullEssayPhase = 'full' | 'task-cc' | 'gra-lr' | 'paragraphs-tutor';

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
    chartData.period1
      ? `Giai đoạn 1 (${chartData.period1}): ${(chartData.features1 || []).map((f) => `${f.name} (${f.position}): ${f.description}`).join('; ')}`
      : '',
    chartData.period2
      ? `Giai đoạn 2 (${chartData.period2}): ${(chartData.features2 || []).map((f) => `${f.name} (${f.position}): ${f.description}`).join('; ')}`
      : '',
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
      previousAttempt,
      phase = 'full',
      phase1Context,
      criteriaContext,
    }: {
      taskType: 'task1' | 'task2';
      chartData?: ChartData;
      prompt?: string;
      essayType?: string;
      outline?: OutlineBodyItem[];
      essay: string;
      previousAttempt?: PreviousAttemptSummary | null;
      phase?: FullEssayPhase;
      phase1Context?: any;
      criteriaContext?: any;
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
    const taskShort: 'TA' | 'TR' = taskType === 'task1' ? 'TA' : 'TR';

    const outlineSummary =
      Array.isArray(outline) && outline.length > 0
        ? outline
            .map((o, idx) => `- Body ${idx + 1} (${o.role}): ${(o.viGuide || []).join(' | ')}`)
            .join('\n')
        : 'Không có dàn ý đính kèm.';

    const promptContext =
      taskType === 'task1'
        ? `=== ĐỀ BÀI TASK 1 & DỮ LIỆU GỐC ===\n${summarizeChartData(chartData!)}`
        : `=== ĐỀ BÀI TASK 2 ===\n"${task2Prompt!.trim()}"\nDạng bài: ${essayType || 'IELTS Task 2'}`;

    const previousAttemptBlock = buildPreviousAttemptBlock(previousAttempt);

    const taskSpecificRules =
      taskType === 'task1'
        ? `
- "task" — Task Achievement (TA) [CHẤM CỰC GẮT — MỤC TIÊU >= 8.0]:
  + Độ dài: ${wordCount} từ (IELTS Task 1 yêu cầu >= 150 từ; nếu < 150 từ -> TRẦN TA <= 6.5).
  + Đoạn 1 (Intro): Paraphrase sắc gọn, đủ 100% chiều thông tin (đối tượng, đơn vị, địa điểm, mốc thời gian). Copy > 3 từ liên tiếp -> hạ TA.
  + Đoạn 2 (Overview): Bao quát đủ 2 tầng nổi bật (xu hướng/thứ bậc chính + điểm tương phản/bước ngoặt), KHÔNG đưa số liệu chi tiết.
  + Các đoạn Detail: Gom nhóm thông minh, có đối chiếu định lượng (gấp mấy lần/chênh lệch/đỉnh-đáy) và ĐÚNG 100% số liệu trong chartData.
- "cc" — Coherence & Cohesion (CC) [MỤC TIÊU >= 8.5 — CHẤM CỐ ĐỊNH THEO 5 QUY LUẬT R1..R5]:
  + Phân đoạn chuẩn 4 đoạn (Intro -> Overview -> Detail 1 -> Detail 2) và kiểm tra cố định 5 quy luật R1..R5 trong "ccChecklist" (**5/5 = 8.5–9.0**, **4/5 = 7.5–8.0**, **3/5 = 7.0–7.5**, **<=2/5 = 5.5–6.5**).
  + Tối đa 4 câu toàn bài mở đầu bằng trạng từ nối có dấu phẩy, 0 "Firstly/Secondly/Moreover/Furthermore" máy móc, và soi chi tiết các điểm chuyển câu/đoạn trong "ccFlowAudit" kèm NGUYÊN VĂN CẢ CÂU sửa đúng ngữ pháp 100%.`
        : `
- "task" — Task Response (TR) [CHẤM CỰC GẮT — MỤC TIÊU >= 8.0]:
  + Độ dài: ${wordCount} từ (IELTS Task 2 yêu cầu >= 250 từ; nếu < 250 từ -> TRẦN TR <= 6.5).
  + Mở bài: Paraphrase tự nhiên + Thesis trả lời TRỰC DIỆN mọi vế câu hỏi và lộ trình lập luận rõ.
  + Các thân bài (chuẩn cấu trúc 5 đoạn): Topic sentence bám Thesis -> Cơ chế nhân-quả SÂU ("tại sao & bằng cách nào") -> Ví dụ/bối cảnh thực tế hợp lý -> Chốt luận điểm. Hời hợt, bịa thống kê ảo hoặc tự mâu thuẫn Thesis -> TRẦN TR <= 6.5–7.0.
  + Kết bài: Tổng hợp đủ các mạch ý chính và khẳng định lại Thesis, không đưa ý mới.
- "cc" — Coherence & Cohesion (CC) [MỤC TIÊU >= 8.5 — CHẤM CỐ ĐỊNH THEO 5 QUY LUẬT R1..R5]:
  + Bố cục chuẩn 5 đoạn mạch lạc và kiểm tra cố định 5 quy luật R1..R5 trong "ccChecklist" (**5/5 = 8.5–9.0**, **4/5 = 7.5–8.0**, **3/5 = 7.0–7.5**, **<=2/5 = 5.5–6.5**).
  + Tối đa 4 câu toàn bài mở đầu bằng trạng từ nối có dấu phẩy, 0 "Firstly/Secondly/Moreover/Furthermore" máy móc, và soi chi tiết các điểm chuyển câu/đoạn trong "ccFlowAudit" kèm NGUYÊN VĂN CẢ CÂU sửa đúng ngữ pháp 100%.`;

    const sharedContext = `
Bạn là cựu giám khảo IELTS Academic Writing & GIA SƯ KÈM 1-1 chuyên nâng học viên từ Band 6.0 lên Band 8.0, chấm điểm BÁM SÁT 100% **Official IELTS Writing Band Descriptors (May 2023)**.
Học viên đang ở chế độ **TỰ VIẾT & CHẤM CHỮA TOÀN BÀI CHUYÊN SÂU** (${taskType === 'task1' ? 'Task 1' : 'Task 2'} — mục tiêu chuẩn ${expectedBodyCount} đoạn, độ dài >= ${minWordTarget} từ, bài hiện tại ${wordCount} từ).
Mục tiêu đạt chuẩn: **${taskShort} >= 8.0 · CC >= 8.5 · GRA >= 8.0 · LR >= 7.5 (Overall >= 8.0)**.

${promptContext}

=== DÀN Ý GỐC HỌC VIÊN ĐÃ HỌC (ĐỐI CHIẾU CẤU TRÚC) ===
${outlineSummary}
${previousAttemptBlock}
=== BÀI ESSAY HOÀN CHỈNH DO HỌC VIÊN TỰ VIẾT (${wordCount} từ) ===
"""
${cleanEssay}
"""

=== RUBRIC CHẤM TOÀN BÀI (${taskShort} 8.0 · CC 8.5 · GRA 8.0 · LR 7.5) ===
${taskSpecificRules}
- "gra" — Grammatical Range & Accuracy (GRA) [MỤC TIÊU >= 8.0 — Official Band 8]:
  + Đa số câu xuyên suốt toàn bài sạch lỗi (>75% error-free) VÀ sử dụng đa dạng cấu trúc câu đơn + câu phức tự nhiên, kiểm soát tốt mạo từ/giới từ/chia thì/dấu câu.
- "lr" — Lexical Resource (LR) [MỤC TIÊU >= 7.5 — Official Band 7–8 Bridge]:
  + Vốn từ **B2 vững + các collocation học thuật tự nhiên bám sát 100% chủ đề bài viết**${taskType === 'task1' ? ' (VD: account for the largest proportion, experience a steady rise, narrow the gap, remain broadly unchanged)' : ' (VD: ease the financial burden on, widen access to, allocate public funds, pose a long-term challenge)'}, xoay vòng paraphrase không lặp từ xuyên suốt các đoạn, rất ít lỗi word choice / word formation. Không ép từ C2 hoa mỹ học vẹt!
`;

    // ─── CHUNKED PHASE HANDLERS ───
    if (phase === 'task-cc') {
      const p1Prompt = `${sharedContext}
${buildAlignedCriteriaDirectives({ taskType, isFullEssay: true })}
NHIỆM VỤ BƯỚC 1/3: Chấm & bóc tách SIÊU CHI TIẾT **${taskShort} (>= 8.0)** và **CC (>= 8.5)** kèm "ccChecklist" (5 quy luật R1..R5), "ccFlowAudit", "wholeEssayStructureFeedback" và "repetitionAlerts".
Trả về DUY NHẤT JSON hợp lệ:
${buildTaskCcPhaseSchema({
  taskShort,
  extraFieldsSchema: `"wholeEssayStructureFeedback": "Nhận xét tổng thể cấu trúc toàn bài, cân đối dung lượng, mạch chuyển giữa các đoạn và độ dài ${wordCount} từ.",
  "repetitionAlerts": [
    "Lặp từ/cụm X ở Đoạn 1 & Đoạn 3 -> Đoạn 1 giữ ..., Đoạn 3 đổi sang collocation tự nhiên ..."
  ]`,
})}`;

      const { data } = await generateJsonWithFallback(
        p1Prompt,
        `full-essay-grade:${taskType}:p1`,
        (parsed) => {
          if (!parsed?.criteria?.task || !parsed?.criteria?.cc) {
            throw new Error('Thiếu criteria.task hoặc criteria.cc');
          }
          return parsed;
        },
        { temperature: 0.1, maxOutputTokens: 5200, perModelTimeoutMs: 24_000, totalBudgetMs: 50_000 }
      );
      return NextResponse.json(data, { status: 200 });
    }

    if (phase === 'gra-lr') {
      const p2Prompt = `${sharedContext}
=== KẾ HOẠCH ĐÃ CHẤM Ở BƯỚC 1 (ĐỒNG BỘ 100%, KHÔNG MÂU THUẪN) ===
${JSON.stringify(phase1Context || {})}

${buildAlignedCriteriaDirectives({ taskType, isFullEssay: true })}
NHIỆM VỤ BƯỚC 2/3: Chấm & bóc tách SIÊU CHI TIẾT **GRA (>= 8.0)** và **LR (>= 7.5)** kèm "grammarErrors" và "vocabularyTips" toàn bài, khớp 100% với kế hoạch Bước 1.
Trả về DUY NHẤT JSON hợp lệ:
${buildGraLrPhaseSchema()}`;

      const { data } = await generateJsonWithFallback(
        p2Prompt,
        `full-essay-grade:${taskType}:p2`,
        (parsed) => {
          if (!parsed?.criteria?.gra || !parsed?.criteria?.lr) {
            throw new Error('Thiếu criteria.gra hoặc criteria.lr');
          }
          return parsed;
        },
        { temperature: 0.1, maxOutputTokens: 4000, perModelTimeoutMs: 24_000, totalBudgetMs: 50_000 }
      );
      return NextResponse.json(data, { status: 200 });
    }

    if (phase === 'paragraphs-tutor') {
      const p3Prompt = `${sharedContext}
=== KẾT QUẢ 4 TIÊU CHÍ & 5 QUY LUẬT CC ĐÃ CHẤM ===
${JSON.stringify(criteriaContext || {})}

NHIỆM VỤ BƯỚC 3/3:
1. "paragraphBreakdown": Mổ xẻ TỪNG ĐOẠN thực tế trong bài học viên (strengths, weaknesses, suggestedEdit = hướng tự sửa & bổ sung cụ thể ngay trên câu cũ, KHÔNG dán nguyên đoạn mới).
2. "generalFeedback": Tóm tắt 2 câu tiếng Việt.
3. "tutorClosingNote": Đoạn chốt nhận xét sâu sắc 180–260 từ của GIA SƯ IELTS WRITING bằng tiếng Việt (tách 3–4 đoạn bằng \\n\\n): bóc tách điểm mạnh/nút thắt (nêu rõ kết quả X/5 quy luật CC & độ chính xác LR 7.5), đối chiếu tiến bộ nếu có bản nháp cũ, lộ trình sửa 1->2->3 toàn bài để chạm mốc ${taskShort} 8.0 · CC 8.5 · GRA 8.0 · LR 7.5.
4. "modelUpgrade": Toàn bài essay tham khảo chuẩn Band 8.0+ (chỉ mở sau khi đạt chuẩn).

Trả về DUY NHẤT JSON hợp lệ:
${buildTutorClosingPhaseSchema({
  taskShort,
  includeParagraphBreakdown: true,
  modelUpgradeInstruction:
    'Toàn bộ bài essay tham khảo chuẩn TA/TR 8.0+ · CC 8.5+ · GRA 8.0+ · LR 7.5+ (ngắt đoạn bằng \\n\\n — hệ thống chỉ mở SAU KHI ĐẠT CHUẨN Overall >= 8.0).',
})}`;

      const { data } = await generateJsonWithFallback(
        p3Prompt,
        `full-essay-grade:${taskType}:p3`,
        (parsed) => {
          if (!parsed || (!parsed.tutorClosingNote && !parsed.paragraphBreakdown)) {
            throw new Error('Thiếu paragraphBreakdown/tutorClosingNote');
          }
          return parsed;
        },
        { temperature: 0.15, maxOutputTokens: 4200, perModelTimeoutMs: 24_000, totalBudgetMs: 50_000 }
      );
      return NextResponse.json(data, { status: 200 });
    }

    // ─── DEFAULT FULL SINGLE-SHOT MODE (temperature 0.1 for deterministic grading!) ───
    const fullPrompt = `${sharedContext}
${buildAlignedCriteriaDirectives({ taskType, isFullEssay: true })}

=== YÊU CẦU CHỮA CHI TIẾT TOÀN BÀI ===
1. Cả 4 tiêu chí trong "criteria" ĐỒNG BỘ HOÀN TOÀN qua "mappings" (gọi rõ từng Đoạn & từng Câu trong bài).
2. "ccChecklist": Đánh giá đầy đủ 5 quy luật R1..R5 toàn bài và quy đổi đúng điểm CC!
3. "paragraphBreakdown": Mổ xẻ TỪNG ĐOẠN thực tế trong bài học viên: nêu "strengths", "weaknesses", và "suggestedEdit" = HƯỚNG TỰ SỬA / BỔ SUNG CỤ THỂ ngay trên câu cũ (KHÔNG dán nguyên đoạn mới thay thế!).
4. "repetitionAlerts": Liệt kê tất cả từ/cụm từ/từ nối bị lặp xuyên suốt các đoạn kèm gợi ý thay thế tự nhiên.
5. "wholeEssayStructureFeedback": Đánh giá mạch liên kết tổng thể, phân bổ dung lượng giữa các đoạn và độ dài ${wordCount} từ.
6. "tutorClosingNote": Đoạn chốt nhận xét sâu sắc 180–260 từ của GIA SƯ IELTS WRITING bằng tiếng Việt ở cuối cùng.

TRẢ VỀ DUY NHẤT JSON HỢP LỆ (KHÔNG MARKDOWN):
${buildUnifiedGradeJsonSchema({
  taskShort,
  extraFieldsSchema: `"wholeEssayStructureFeedback": "Nhận xét tổng thể cấu trúc toàn bài, cân đối dung lượng, mạch chuyển giữa các đoạn và độ dài ${wordCount} từ.",
  "paragraphBreakdown": [
    {
      "label": "Đoạn 1 (Mở bài / Intro)",
      "role": "Chức năng đoạn này trong cấu trúc chuẩn",
      "strengths": "Điểm làm tốt của đoạn",
      "weaknesses": "Điểm còn yếu / mất điểm của đoạn",
      "suggestedEdit": "Hướng dẫn tự sửa & bổ sung cụ thể ngay trên câu cũ của đoạn này (KHÔNG dán nguyên đoạn viết mới)."
    }
  ],
  "repetitionAlerts": [
    "Lặp từ/cụm X ở Đoạn 1 & Đoạn 3 -> Đoạn 1 giữ ..., Đoạn 3 đổi sang collocation tự nhiên ..."
  ],`,
  modelUpgradeInstruction:
    'Toàn bộ bài essay tham khảo chuẩn TA/TR 8.0+ · CC 8.5+ · GRA 8.0+ · LR 7.5+ (ngắt đoạn bằng \\n\\n — hệ thống chỉ mở SAU KHI ĐẠT CHUẨN Overall >= 8.0).',
})}`.trim();

    try {
      const { data } = await generateJsonWithFallback(
        fullPrompt,
        `full-essay-grade:${taskType}`,
        (parsed) => {
          if (!parsed || !parsed.criteria) {
            throw new Error('AI trả về thiếu trường criteria');
          }
          return normalizeFullEssayGradeResult(parsed);
        },
        {
          temperature: 0.1,
          maxOutputTokens: 8192,
          perModelTimeoutMs: 26_000,
          totalBudgetMs: 42_000,
          failFastOnTooLong: true,
        }
      );

      return NextResponse.json(data, { status: 200 });
    } catch (err: any) {
      if (isLengthOrTransientError(err)) {
        const { message, status } = formatGeminiError(err, 'Lỗi chấm chữa toàn bài: ');
        return NextResponse.json({ error: message }, { status });
      }
      throw err;
    }
  } catch (error: any) {
    console.error('[full-essay-grade] Error:', error);
    const { message, status } = formatGeminiError(error, 'Lỗi chấm chữa toàn bài: ');
    return NextResponse.json({ error: message }, { status });
  }
}
