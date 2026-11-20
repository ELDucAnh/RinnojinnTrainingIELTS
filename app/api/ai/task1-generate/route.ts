import { NextResponse } from 'next/server';
import {
  formatGeminiError,
  generateJsonWithFallback,
  isLengthOrTransientError,
} from '@/lib/gemini-helper';
import {
  normalizeOutline,
  normalizeOutlineBodyItem,
  TASK1_BODY_TEMPLATES,
} from '@/lib/writing-practice-types';

export const maxDuration = 60;

const VALID_TYPES = ['bar', 'line', 'pie', 'table', 'process', 'map'] as const;
type ValidType = (typeof VALID_TYPES)[number];

const TYPE_NAME_MAP: Record<ValidType, string> = {
  bar: 'Bar Chart (biểu đồ cột)',
  line: 'Line Graph (biểu đồ đường theo thời gian)',
  pie: 'Pie Chart (biểu đồ tròn tỉ lệ %)',
  table: 'Table (bảng số liệu so sánh)',
  process: 'Process Diagram (sơ đồ quy trình từng bước)',
  map: 'Map (bản đồ so sánh 2 thời điểm trước/sau)',
};

const CHART_SCHEMAS_BY_TYPE: Record<ValidType, string> = {
  bar: `{
  "type": "bar",
  "title": "Short descriptive title of the chart",
  "context": "The chart below shows ...",
  "prompt": "Summarise the information by selecting and reporting the main features, and make comparisons where relevant. Write at least 150 words.",
  "xLabel": "label for x-axis (e.g. Year, Country)",
  "yLabel": "label for y-axis (e.g. Percentage, Million tonnes)",
  "categories": ["Cat A", "Cat B", "Cat C"],
  "series": [
    { "name": "Series 1", "values": [30, 45, 60] },
    { "name": "Series 2", "values": [20, 35, 55] }
  ],
  "keyFeatures": ["Key trend 1", "Key trend 2", "Key trend 3"],
  "writingTips": "Short summary tip"
}`,
  line: `{
  "type": "line",
  "title": "Short descriptive title",
  "context": "The line graph below shows ...",
  "prompt": "Summarise the information by selecting and reporting the main features, and make comparisons where relevant. Write at least 150 words.",
  "xLabel": "Year",
  "yLabel": "Unit label",
  "xValues": ["2000", "2005", "2010", "2015", "2020"],
  "series": [
    { "name": "Country/Category A", "values": [20, 35, 50, 45, 60] },
    { "name": "Country/Category B", "values": [40, 38, 42, 55, 70] }
  ],
  "keyFeatures": ["Feature 1", "Feature 2", "Feature 3"],
  "writingTips": "Short summary tip"
}`,
  pie: `{
  "type": "pie",
  "title": "Short descriptive title",
  "context": "The pie chart below shows ...",
  "prompt": "Summarise the information by selecting and reporting the main features. Write at least 150 words.",
  "year": "2023",
  "unit": "%",
  "segments": [
    { "label": "Category A", "value": 35 },
    { "label": "Category B", "value": 25 },
    { "label": "Category C", "value": 20 },
    { "label": "Category D", "value": 12 },
    { "label": "Other", "value": 8 }
  ],
  "keyFeatures": ["Feature 1", "Feature 2"],
  "writingTips": "Short summary tip"
}`,
  table: `{
  "type": "table",
  "title": "Short descriptive title",
  "context": "The table below shows ...",
  "prompt": "Summarise the information by selecting and reporting the main features, and make comparisons where relevant. Write at least 150 words.",
  "headers": ["Country", "2000", "2010", "2020"],
  "rows": [
    ["USA", "280", "310", "330"],
    ["China", "1270", "1340", "1400"],
    ["India", "1000", "1180", "1380"]
  ],
  "unit": "millions",
  "keyFeatures": ["Feature 1", "Feature 2"],
  "writingTips": "Short summary tip"
}`,
  process: `{
  "type": "process",
  "title": "Short descriptive title",
  "context": "The diagram below shows the process of ...",
  "prompt": "Summarise the information by selecting and reporting the main features. Write at least 150 words.",
  "steps": [
    { "id": 1, "label": "Step 1 name", "description": "Brief description of what happens" },
    { "id": 2, "label": "Step 2 name", "description": "Brief description" },
    { "id": 3, "label": "Step 3 name", "description": "Brief description" },
    { "id": 4, "label": "Step 4 name", "description": "Brief description" },
    { "id": 5, "label": "Step 5 name", "description": "Brief description" },
    { "id": 6, "label": "Step 6 name", "description": "Brief description" }
  ],
  "keyFeatures": ["Feature 1", "Feature 2"],
  "writingTips": "Short summary tip"
}`,
  map: `{
  "type": "map",
  "title": "Short descriptive title",
  "context": "The maps below show ...",
  "prompt": "Summarise the information by selecting and reporting the main features, and make comparisons where relevant. Write at least 150 words.",
  "location": "Name of the town/area",
  "period1": "1990",
  "period2": "2020",
  "features1": [
    { "name": "Feature name", "position": "north", "icon": "🌿", "description": "what existed before" }
  ],
  "features2": [
    { "name": "Feature name", "position": "north", "icon": "🏗️", "description": "what exists now" }
  ],
  "changes": ["Change 1", "Change 2", "Change 3"],
  "keyFeatures": ["Feature 1", "Feature 2"],
  "writingTips": "Note: position MUST be one of: north, south, east, west, center, northeast, northwest, southeast, southwest."
}`,
};

function resolveChartType(reqType?: string, topic?: string): ValidType {
  const normReq = (reqType || '').toLowerCase().trim();
  if (VALID_TYPES.includes(normReq as ValidType)) {
    return normReq as ValidType;
  }

  const textToSearch = `${normReq} ${topic || ''}`.toLowerCase();
  if (/\b(pie|tròn|bánh)\b/i.test(textToSearch) || textToSearch.includes('biểu đồ tròn') || textToSearch.includes('pie chart')) {
    return 'pie';
  }
  if (/\b(map|bản đồ|quy hoạch)\b/i.test(textToSearch) || textToSearch.includes('sơ đồ vị trí') || textToSearch.includes('mặt bằng')) {
    return 'map';
  }
  if (/\b(process|quy trình|chu trình|vòng đời|sản xuất|chế tạo|các bước|tiến trình)\b/i.test(textToSearch) || textToSearch.includes('sơ đồ quy trình') || textToSearch.includes('process diagram')) {
    return 'process';
  }
  if (/\b(table|bảng)\b/i.test(textToSearch) || textToSearch.includes('bảng số liệu') || textToSearch.includes('bảng dữ liệu') || textToSearch.includes('data table')) {
    return 'table';
  }
  if (/\b(bar|cột)\b/i.test(textToSearch) || textToSearch.includes('biểu đồ cột') || textToSearch.includes('cột chồng') || textToSearch.includes('bar chart')) {
    return 'bar';
  }
  if (/\b(line|đường)\b/i.test(textToSearch) || textToSearch.includes('biểu đồ đường') || textToSearch.includes('đường biểu diễn') || textToSearch.includes('line graph')) {
    return 'line';
  }

  const randomIndex = Math.floor(Math.random() * VALID_TYPES.length);
  return VALID_TYPES[randomIndex];
}

const BODY_SPECS_TASK1: Record<number, string> = {
  0: `- bodyIndex 0 — Body 1 (Introduction — Mở bài chuẩn xác TA 8.0+):
  * Liệt kê đủ mọi chiều thông tin bắt buộc từ biểu đồ để paraphrase KHÔNG sót chi tiết nào: loại biểu đồ, đối tượng đo, đơn vị đo, địa điểm/nhóm, đầy đủ mốc thời gian.
  * Chỉ rõ cách đổi cấu trúc diễn đạt để tuyệt đối KHÔNG chép lại nguyên cụm đề bài.`,
  1: `- bodyIndex 1 — Body 2 (Overview — Tổng quan ăn điểm TA 8.5 & CC 9.0):
  * Tổng hợp đúng 2 tầng nhận định vĩ mô sắc bén: (1) xu hướng/thứ bậc chi phối toàn cục VÀ (2) điểm đối lập nổi bật / bước ngoặt / ngoại lệ đáng chú ý nhất (hoặc cấu trúc giai đoạn đầu-cuối với Process, chuyển biến cốt lõi với Map).
  * Nhấn mạnh TUYỆT ĐỐI KHÔNG chèn số liệu chi tiết vào Overview.`,
  2: `- bodyIndex 2 — Body 3 (Detail Paragraph 1 — Nhóm phân tích chiến lược 1):
  * Gom nhóm thông minh theo logic dữ liệu (KHÔNG liệt kê máy móc rời rạc): chỉ rõ tiêu chí gom nhóm (VD: nhóm dẫn đầu / xu hướng tăng / nửa đầu quy trình / khu vực phía Bắc).
  * Trích CHÍNH XÁC từng con số/tỉ lệ/mốc đối chiếu (gấp bao nhiêu lần, chênh lệch bao nhiêu, đạt đỉnh/đáy ở đâu) + câu mở nối tự nhiên từ Overview.`,
  3: `- bodyIndex 3 — Body 4 (Detail Paragraph 2 — Nhóm đối chiếu & hoàn tất bức tranh dữ liệu):
  * Xử lý nhóm dữ liệu còn lại theo logic tương phản/bổ sung, chỉ rõ điểm giao cắt, hội tụ, phân kỳ hoặc ngoại lệ đối chiếu NGƯỢC LẠI với Body 3 kèm số liệu chính xác 100%.
  * Chỉ rõ phép quy chiếu/chuyển ý "tàng hình" từ Body 3 đạt CC 9.0 (tránh "Secondly/Moreover" máy móc).`,
};

function buildTask1OutlinePrompt(
  chartData: any,
  bodyIndices: number[],
  previousOutlineSummary?: any[]
): string {
  const isPartial = bodyIndices.length < 4;
  const targetSpecs = bodyIndices.map((idx) => BODY_SPECS_TASK1[idx]).filter(Boolean).join('\n');
  const prevBlock =
    Array.isArray(previousOutlineSummary) && previousOutlineSummary.length > 0
      ? `\nALREADY PLANNED BODIES (keep 100% continuity & ZERO repetition with these):\n${JSON.stringify(previousOutlineSummary)}\n`
      : '';

  return `You are an elite IELTS Academic Writing Task 1 tutor coaching a Band 6.0 learner to reach **Overall Band 8.0** with the exact score blueprint:
**TA >= 8.0 · CC = 9.0 · GRA >= 8.0 · LR >= 7.0 (pushing natural precision toward 8.0)**

Chart Data:
${JSON.stringify(chartData)}
${prevBlock}
Generate ${isPartial ? `ONLY the requested ${bodyIndices.length} Body item(s) (bodyIndex: ${bodyIndices.join(', ')})` : 'ALL 4 Body items (bodyIndex 0..3)'}:
${targetSpecs}

STRICT COACHING RULES (NO generic boilerplate — tailor 100% to THIS chart's exact labels, units, and numbers):
- Write "role", "viGuide", "bandStrategy.*", "ideaGuides[].ideaLabel", "ideaGuides[].ideaVi", and "linkingTip" in sharp, insightful VIETNAMESE. Embed exact chart numbers, units, and labels inside Body 3 & 4.
- DO NOT write full sample English sentences or paragraphs!
- MANDATORY "bandStrategy" OBJECT ON EVERY BODY (ultra-specific notes on how THIS exact Body achieves the target):
  * "task8Note": Lưu ý bắt buộc ở Body này để đạt **TA >= 8.0** (chỉ rõ chi tiết/đối chiếu nào thiếu là rớt Band 6-7, bẫy sai số liệu/sai phạm vi).
  * "cc9Note": Lưu ý CỰC KỸ để Body này đạt **CC = 9.0** (cách triển khai dòng thông tin Cũ -> Mới, phép quy chiếu/thay thế cụ thể nên dùng như "this figure", "the former", "mirroring this trend", "respectively", và CHỈ RÕ từ nối máy móc nào tuyệt đối tránh).
  * "gra8Note": Lưu ý bắt buộc để Body này đạt **GRA >= 8.0** (kết hợp ít nhất 2-3 cấu trúc phức hợp tự nhiên không lỗi như "While/Whereas...", ", which + V", "with + N + V-ing", phân từ rút gọn, bị động/so sánh nâng cao; nhắc bẫy thì/mạo từ/chủ-vị).
  * "lrNote": Lưu ý CỰC KỸ cho **LR (vững 7.0 -> hướng 8.0)** ở Body này (chọn collocation B1-B2 bản xứ chính xác sắc thái dữ liệu, cách paraphrase danh từ/động từ để KHÔNG lặp từ giữa các câu, tránh dịch từng chữ tiếng Việt và không nhồi từ C2 gượng ép).
- MANDATORY IDEA-BY-IDEA MAPPING ("ideaGuides"):
  For EACH Body, break it into **2–3 sequential ideas** (Body 1-2: 2 ideas; Body 3-4: 3 ideas), matching "viGuide":
  * "vocabPhrases": **3–4 natural B1–B2/8.0 collocations per idea** tailored to THAT exact idea, with Vietnamese meaning: [{ "phrase": "...", "meaning": "..." }].
  * "grammarPatterns": **1–2 Band 8.0 GRA complex grammar frames** tailored specifically to THAT idea, with concise Vietnamese "usage" explaining how to map THAT idea into the structure: [{ "structure": "...", "usage": "..." }].
- "linkingTip": 1 sharp Vietnamese cohesion cue explaining the invisible CC 9.0 bridge to adjacent bodies.

Return ONLY valid JSON:
{
  "${isPartial ? 'outlineChunk' : 'outline'}": [
    {
      "bodyIndex": ${bodyIndices[0]},
      "role": "...",
      "bandStrategy": {
        "task8Note": "...",
        "cc9Note": "...",
        "gra8Note": "...",
        "lrNote": "..."
      },
      "viGuide": ["Ý 1...", "Ý 2..."],
      "ideaGuides": [
        {
          "ideaLabel": "Ý 1 — ...",
          "ideaVi": "...",
          "vocabPhrases": [
            { "phrase": "account for the largest share of", "meaning": "chiếm tỷ trọng lớn nhất trong" },
            { "phrase": "illustrate the proportion of", "meaning": "minh họa tỷ lệ của" },
            { "phrase": "compare ... across categories", "meaning": "so sánh ... giữa các nhóm" }
          ],
          "grammarPatterns": [
            { "structure": "While [S1] + V1, [S2] + V2, with + N + V-ing", "usage": "Gộp 2 vế đối lập và bổ sung số liệu mượt đạt GRA 8.0" }
          ]
        }
      ],
      "linkingTip": "..."
    }
  ]
}`;
}

async function generateTask1OutlineChunk(
  chartData: any,
  bodyIndices: number[],
  previousOutlineSummary: any[] | undefined,
  options: { perModelTimeoutMs: number; totalBudgetMs: number }
) {
  const prompt = buildTask1OutlinePrompt(chartData, bodyIndices, previousOutlineSummary);
  const key = bodyIndices.length < 4 ? 'outlineChunk' : 'outline';
  const { data } = await generateJsonWithFallback(
    prompt,
    `task1-outline:${bodyIndices.join('-')}`,
    (parsed) => {
      const arr = Array.isArray(parsed?.[key])
        ? parsed[key]
        : Array.isArray(parsed?.outline)
          ? parsed.outline
          : Array.isArray(parsed?.outlineChunk)
            ? parsed.outlineChunk
            : null;
      if (!arr || arr.length === 0) {
        throw new Error('Missing outline array');
      }
      if (bodyIndices.length === 4) {
        return normalizeOutline(arr, 'task1');
      }
      return bodyIndices.map((targetIdx, pos) => {
        const found =
          arr.find((x: any) => Number(x?.bodyIndex) === targetIdx) ??
          arr.find((x: any) => Number(x?.bodyIndex) === targetIdx + 1) ??
          arr[pos] ??
          {};
        return normalizeOutlineBodyItem(found, TASK1_BODY_TEMPLATES[targetIdx], targetIdx);
      });
    },
    {
      temperature: 0.5,
      maxOutputTokens: bodyIndices.length === 4 ? 6800 : bodyIndices.length === 2 ? 3600 : 2200,
      perModelTimeoutMs: options.perModelTimeoutMs,
      totalBudgetMs: options.totalBudgetMs,
      failFastOnTooLong: bodyIndices.length >= 4,
    }
  );
  return data;
}

export async function POST(req: Request) {
  let requestedType: string | undefined;
  let customTopic: string | undefined;
  let mode: string | undefined;
  let existingChartData: any;
  let bodyIndices: number[] | undefined;
  let previousOutlineSummary: any[] | undefined;

  try {
    const body = await req.json();
    requestedType = body.chartType || body.type;
    customTopic = body.customTopic || body.topic || body.prompt;
    mode = body.mode;
    existingChartData = body.chartData;
    bodyIndices = Array.isArray(body.bodyIndices)
      ? body.bodyIndices.map((n: any) => Number(n)).filter((n: number) => Number.isInteger(n) && n >= 0 && n <= 3)
      : undefined;
    previousOutlineSummary = Array.isArray(body.previousOutlineSummary)
      ? body.previousOutlineSummary
      : undefined;
  } catch {
    // Proceed with defaults if body is empty
  }

  // Chunked outline request (client fallback when response is long)
  if (mode === 'outline-chunk' && existingChartData && bodyIndices && bodyIndices.length > 0) {
    try {
      const chunk = await generateTask1OutlineChunk(
        existingChartData,
        bodyIndices,
        previousOutlineSummary,
        { perModelTimeoutMs: 22_000, totalBudgetMs: 50_000 }
      );
      return NextResponse.json({ outlineChunk: chunk }, { status: 200 });
    } catch (error: any) {
      const { message, status } = formatGeminiError(error, 'Lỗi tạo phần dàn ý Task 1: ');
      return NextResponse.json({ error: message }, { status });
    }
  }

  // Step 2 / regenerate: Vietnamese 4-body outline for an existing chart (with internal chunked fallback!)
  if (mode === 'outline-only' && existingChartData) {
    const startTs = Date.now();
    try {
      const data = await generateTask1OutlineChunk(existingChartData, [0, 1, 2, 3], undefined, {
        perModelTimeoutMs: 24_000,
        totalBudgetMs: 32_000,
      });
      return NextResponse.json({ outline: data }, { status: 200 });
    } catch (firstErr: any) {
      const elapsed = Date.now() - startTs;
      const remaining = 55_000 - elapsed;

      if (isLengthOrTransientError(firstErr) && remaining >= 18_000) {
        try {
          console.warn('[task1-outline-only] Full outline failed/too long, splitting into 2 server-side chunks...');
          const halfBudget = Math.floor(remaining / 2) - 500;
          const part1 = await generateTask1OutlineChunk(existingChartData, [0, 1], undefined, {
            perModelTimeoutMs: Math.min(18_000, halfBudget),
            totalBudgetMs: halfBudget,
          });
          const part2 = await generateTask1OutlineChunk(
            existingChartData,
            [2, 3],
            part1.map((o) => ({ bodyIndex: o.bodyIndex, role: o.role, viGuide: o.viGuide })),
            {
              perModelTimeoutMs: Math.min(18_000, remaining - (Date.now() - startTs)),
              totalBudgetMs: Math.max(8_000, 55_000 - (Date.now() - startTs)),
            }
          );
          return NextResponse.json({ outline: normalizeOutline([...part1, ...part2], 'task1') }, { status: 200 });
        } catch (splitErr: any) {
          const { message, status } = formatGeminiError(splitErr, 'Lỗi tạo dàn ý Task 1: ');
          return NextResponse.json({ error: message }, { status });
        }
      }

      const { message, status } = formatGeminiError(firstErr, 'Lỗi tạo dàn ý Task 1: ');
      return NextResponse.json({ error: message }, { status });
    }
  }

  const targetType = resolveChartType(requestedType, customTopic);
  const cleanTopic = customTopic?.trim();
  const chartOnly = mode === 'chart-only';
  const chartSchema = CHART_SCHEMAS_BY_TYPE[targetType];

  const baseChartPrompt = `You are an IELTS Academic Writing Task 1 question generator.
Generate realistic IELTS Task 1 data for EXACT type "${targetType}" (${TYPE_NAME_MAP[targetType]}).
The JSON property "type" MUST BE "${targetType}".
${
  cleanTopic
    ? `User topic requirement: "${cleanTopic}". Tailor chart data, title, context, and numbers to this topic at IELTS Academic standard.`
    : 'Pick a realistic IELTS topic (energy, education, tourism, transport, population, environment, employment, technology).'
}
Ensure realistic, internally consistent data (e.g. pie segments sum to 100 if %).`;

  const prompt = `${baseChartPrompt}

Return ONLY valid JSON matching this schema (do NOT include "outline"):
${chartSchema}`;

  try {
    const { data } = await generateJsonWithFallback(
      prompt,
      `task1-generate:${targetType}:chart`,
      (parsed) => {
        if (!parsed || typeof parsed !== 'object' || !parsed.context) {
          throw new Error('Dữ liệu đề bài Task 1 không hợp lệ');
        }
        if (!parsed.type || !VALID_TYPES.includes(parsed.type)) {
          parsed.type = targetType;
        }
        return parsed;
      },
      {
        temperature: 0.7,
        maxOutputTokens: 1600,
        perModelTimeoutMs: 16_000,
        totalBudgetMs: 45_000,
      }
    );

    if (!chartOnly) {
      try {
        data.outline = await generateTask1OutlineChunk(data, [0, 1, 2, 3], undefined, {
          perModelTimeoutMs: 22_000,
          totalBudgetMs: 32_000,
        });
      } catch {
        // Fallback: return chart data without outline so client can fetch outline resiliently
      }
    }

    return NextResponse.json(data, { status: 200 });
  } catch (error: any) {
    console.error('Lỗi khi tạo đề Task 1:', error);
    const { message, status } = formatGeminiError(error, 'Lỗi AI: ');
    return NextResponse.json({ error: message }, { status });
  }
}
