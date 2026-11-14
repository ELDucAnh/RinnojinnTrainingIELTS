import { NextResponse } from 'next/server';
import { formatGeminiError, generateJsonWithFallback } from '@/lib/gemini-helper';
import { normalizeOutline } from '@/lib/writing-practice-types';

export const maxDuration = 60;

const VALID_TYPES = ['bar', 'line', 'pie', 'table', 'process', 'map'] as const;
type ValidType = typeof VALID_TYPES[number];

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

const OUTLINE_INSTRUCTIONS = `
4-BODY VIETNAMESE OUTLINE ("outline", EXACTLY 4 objects, bodyIndex 0..3) engineered to guarantee **TA >= 8.5 and CC >= 8.5** so the learner only focuses on developing Vocabulary (LR) & Grammar (GRA):
- bodyIndex 0 — Introduction (Mở bài chuẩn xác 100% TA):
  * Liệt kê đủ mọi chiều thông tin bắt buộc từ biểu đồ để paraphrase KHÔNG sót chi tiết nào: loại biểu đồ, đối tượng đo, đơn vị đo, địa điểm/nhóm, đầy đủ mốc thời gian.
  * Chỉ rõ cách đổi cấu trúc diễn đạt để tuyệt đối KHÔNG chép lại nguyên cụm từ đề bài.
- bodyIndex 1 — Overview (Tổng quan "ăn điểm Band 8.5–9.0 TA"):
  * Tổng hợp đúng 2 tầng nhận định vĩ mô sắc bén: (1) xu hướng/thứ bậc chi phối toàn cục VÀ (2) điểm đối lập nổi bật / bước ngoặt / ngoại lệ đáng chú ý nhất (hoặc cấu trúc giai đoạn đầu-cuối với Process, chuyển biến cốt lõi với Map).
  * Nhấn mạnh TUYỆT ĐỐI KHÔNG chèn số liệu chi tiết vào Overview.
- bodyIndex 2 — Body 3: Detail Paragraph 1 (Nhóm phân tích chiến lược 1):
  * Gom nhóm thông minh theo logic dữ liệu (KHÔNG liệt kê máy móc rời rạc): chỉ rõ tiêu chí gom nhóm (VD: nhóm dẫn đầu / xu hướng tăng / nửa đầu quy trình / khu vực phía Bắc).
  * Trích CHÍNH XÁC từng con số/tỉ lệ/mốc đối chiếu (gấp bao nhiêu lần, chênh lệch bao nhiêu, đạt đỉnh/đáy ở đâu) + câu mở nối tự nhiên từ Overview.
- bodyIndex 3 — Body 4: Detail Paragraph 2 (Nhóm đối chiếu & hoàn tất bức tranh dữ liệu):
  * Xử lý nhóm dữ liệu còn lại theo logic tương phản/bổ sung, chỉ rõ điểm giao cắt, hội tụ, phân kỳ hoặc ngoại lệ đối chiếu NGƯỢC LẠI với Body 3 kèm số liệu chính xác 100%.
  * Chỉ rõ phép quy chiếu/chuyển ý tự nhiên từ Body 3 (tránh "Secondly/Moreover" máy móc).

RULES:
- Write ALL fields ("role", "viGuide", "keyPoints", "linkingTip") in sharp, insightful VIETNAMESE.
- DO NOT provide pre-written English sentences! Only ideas, exact data figures, comparison angles, and structural cues in Vietnamese.
- "viGuide": 3 crisp, high-impact analytical steps tailored to THIS exact chart (engineering TA & CC > 8.0).
- "keyPoints": 3–4 concrete exact numbers/comparisons/structural hooks from THIS chart.
- "linkingTip": 1 specific Vietnamese cohesion cue explaining the exact logical/referential bridge with adjacent bodies.

"outline" shape (EXACTLY 4 items):
[
  { "bodyIndex": 0, "role": "Introduction — Mở bài (Paraphrase chuẩn xác đủ chiều dữ liệu)", "viGuide": ["Bước 1...", "Bước 2...", "Bước 3..."], "keyPoints": ["Dữ kiện 1...", "Dữ kiện 2...", "Dữ kiện 3..."], "linkingTip": "1 câu liên kết mạch bài..." },
  { "bodyIndex": 1, "role": "Overview — Tổng quan chiến lược 2 tầng xu hướng", "viGuide": ["..."], "keyPoints": ["..."], "linkingTip": "..." },
  { "bodyIndex": 2, "role": "Body 3 — Thân bài 1 (Gom nhóm & đối chiếu số liệu nhóm 1)", "viGuide": ["..."], "keyPoints": ["..."], "linkingTip": "..." },
  { "bodyIndex": 3, "role": "Body 4 — Thân bài 2 (Nhóm còn lại & đối chiếu chéo với Body 3)", "viGuide": ["..."], "keyPoints": ["..."], "linkingTip": "..." }
]
`;

export async function POST(req: Request) {
  let requestedType: string | undefined;
  let customTopic: string | undefined;
  let mode: string | undefined;
  let existingChartData: any;

  try {
    const body = await req.json();
    requestedType = body.chartType || body.type;
    customTopic = body.customTopic || body.topic || body.prompt;
    mode = body.mode;
    existingChartData = body.chartData;
  } catch {
    // Proceed with defaults if body is empty
  }

  // Step 2 / regenerate: Vietnamese 4-body outline for an existing chart
  if (mode === 'outline-only' && existingChartData) {
    try {
      const outlinePrompt = `You are an expert IELTS Academic Writing Task 1 tutor.
Create a concise 4-body VIETNAMESE outline for this Task 1 chart data so the learner can write and translate into Band 7.5+ English.

Chart Data:
${JSON.stringify(existingChartData)}

${OUTLINE_INSTRUCTIONS}

Return ONLY valid JSON:
{
  "outline": [ ... ]
}`;

      const { data } = await generateJsonWithFallback(
        outlinePrompt,
        'task1-outline-only',
        (parsed) => {
          if (!Array.isArray(parsed?.outline) || parsed.outline.length === 0) {
            throw new Error('Missing outline array');
          }
          return normalizeOutline(parsed.outline, 'task1');
        },
        {
          temperature: 0.6,
          maxOutputTokens: 2100,
          perModelTimeoutMs: 18_000,
          totalBudgetMs: 50_000,
        }
      );

      return NextResponse.json({ outline: data }, { status: 200 });
    } catch (error: any) {
      const { message, status } = formatGeminiError(error, 'Lỗi tạo dàn ý Task 1: ');
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

  const prompt = chartOnly
    ? `${baseChartPrompt}

Return ONLY valid JSON matching this schema (do NOT include "outline"):
${chartSchema}`
    : `${baseChartPrompt}
Also generate the 4-body Vietnamese "outline" tailored to these exact numbers/details.

Return ONLY valid JSON matching this chart schema PLUS an "outline" array:
${chartSchema}

${OUTLINE_INSTRUCTIONS}`;

  try {
    const { data } = await generateJsonWithFallback(
      prompt,
      `task1-generate:${targetType}:${chartOnly ? 'chart-only' : 'full'}`,
      (parsed) => {
        if (!parsed || typeof parsed !== 'object' || !parsed.context) {
          throw new Error('Dữ liệu đề bài Task 1 không hợp lệ');
        }
        if (!parsed.type || !VALID_TYPES.includes(parsed.type)) {
          parsed.type = targetType;
        }
        if (!chartOnly) {
          parsed.outline = normalizeOutline(parsed.outline, 'task1');
        }
        return parsed;
      },
      {
        temperature: chartOnly ? 0.7 : 0.65,
        maxOutputTokens: chartOnly ? 1400 : 2800,
        perModelTimeoutMs: chartOnly ? 16_000 : 20_000,
        totalBudgetMs: 50_000,
      }
    );

    return NextResponse.json(data, { status: 200 });
  } catch (error: any) {
    console.error('Lỗi khi tạo đề Task 1:', error);
    const { message, status } = formatGeminiError(error, 'Lỗi AI: ');
    return NextResponse.json({ error: message }, { status });
  }
}
