import { NextResponse } from 'next/server';
import { formatGeminiError, generateJsonWithFallback } from '@/lib/gemini-helper';
import { normalizeOutline } from '@/lib/writing-practice-types';

export const maxDuration = 30;

const VALID_TYPES = ['bar', 'line', 'pie', 'table', 'process', 'map'] as const;
type ValidType = typeof VALID_TYPES[number];

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
CRITICAL REQUIREMENT — 4-BODY VIETNAMESE OUTLINE ("outline"):
You MUST also generate an "outline" array with EXACTLY 4 objects (bodyIndex 0, 1, 2, 3) in VIETNAMESE so the student can plan and translate their ideas into English themselves at IELTS Band 7.5+ standard.
- Body 0: Introduction (Mở bài — Paraphrase đề bài: nêu rõ loại biểu đồ, đối tượng đo lường, địa điểm, thời gian, đơn vị).
- Body 1: Overview (Tổng quan — Chỉ ra 2–3 xu hướng hoặc đặc điểm nổi bật nhất của dữ liệu; nhắc rõ KHÔNG chèn số liệu chi tiết).
- Body 2: Detail Paragraph 1 (Thân bài 1 — Nhóm thông tin thứ nhất: chỉ rõ cần mô tả những nhóm/giai đoạn/khu vực/bước nào và trích rõ các số liệu cụ thể từ dữ liệu vừa tạo để học viên không bị sai số).
- Body 3: Detail Paragraph 2 (Thân bài 2 — Nhóm thông tin còn lại: chỉ rõ các số liệu cụ thể còn lại, điểm đối chiếu/so sánh nổi bật và cách liên kết mạch lạc với Body 3).

RULES FOR THE OUTLINE:
1. Write ALL guidance ("role", "viGuide", "keyPoints", "linkingTip") in natural, clear VIETNAMESE (only keep chart proper nouns/labels/units where needed).
2. DO NOT provide complete pre-written English sentences! Give ideas, structure, numbers, and Vietnamese conceptual cues so the learner writes and translates to English themselves.
3. "viGuide" must be an array of 2–4 specific Vietnamese bullet points tailored to THIS exact chart's data.
4. "keyPoints" must be an array of 2–4 concrete data points / comparisons / Vietnamese keywords from THIS chart.
5. "linkingTip" must explain in Vietnamese how this body connects logically with the adjacent bodies.

Outline JSON schema:
"outline": [
  {
    "bodyIndex": 0,
    "role": "Introduction — Mở bài (Paraphrase đề bài)",
    "viGuide": ["...", "..."],
    "keyPoints": ["...", "..."],
    "linkingTip": "..."
  },
  {
    "bodyIndex": 1,
    "role": "Overview — Tổng quan xu hướng chính",
    "viGuide": ["...", "..."],
    "keyPoints": ["...", "..."],
    "linkingTip": "..."
  },
  {
    "bodyIndex": 2,
    "role": "Body 3 — Thân bài 1 (Chi tiết nhóm 1)",
    "viGuide": ["...", "..."],
    "keyPoints": ["...", "..."],
    "linkingTip": "..."
  },
  {
    "bodyIndex": 3,
    "role": "Body 4 — Thân bài 2 (Chi tiết nhóm 2 & đối chiếu)",
    "viGuide": ["...", "..."],
    "keyPoints": ["...", "..."],
    "linkingTip": "..."
  }
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

  // Optional mode: regenerate Vietnamese 4-body outline for an existing chart
  if (mode === 'outline-only' && existingChartData) {
    try {
      const outlinePrompt = `
You are an expert IELTS Academic Writing Task 1 tutor.
Given the following IELTS Task 1 chart data JSON, create a fresh, well-structured 4-body VIETNAMESE outline so the student can write and translate each body into Band 7.5+ English.

Chart Data:
${JSON.stringify(existingChartData, null, 2)}

${OUTLINE_INSTRUCTIONS}

Return ONLY a valid JSON object with the single key "outline":
{
  "outline": [ ... ]
}
`;
      const { data } = await generateJsonWithFallback(outlinePrompt, 'task1-outline-regen', (parsed) => {
        if (!Array.isArray(parsed?.outline) || parsed.outline.length === 0) {
          throw new Error('Missing outline array');
        }
        return normalizeOutline(parsed.outline, 'task1');
      });

      return NextResponse.json({ outline: data }, { status: 200 });
    } catch (error: any) {
      const { message, status } = formatGeminiError(error, 'Lỗi tạo dàn ý Task 1: ');
      return NextResponse.json({ error: message }, { status });
    }
  }

  const targetType = resolveChartType(requestedType, customTopic);
  const cleanTopic = customTopic?.trim();

  const typeNameMap: Record<ValidType, string> = {
    bar: 'Bar Chart (biểu đồ cột)',
    line: 'Line Graph (biểu đồ đường theo thời gian)',
    pie: 'Pie Chart (biểu đồ tròn tỉ lệ %)',
    table: 'Table (bảng số liệu so sánh)',
    process: 'Process Diagram (sơ đồ quy trình từng bước)',
    map: 'Map (bản đồ so sánh 2 thời điểm trước/sau)',
  };

  const prompt = `
You are an IELTS Task 1 question generator and Vietnamese IELTS coach. Your job is to create realistic IELTS Academic Writing Task 1 data AND a 4-body Vietnamese writing outline for that exact data.

CRITICAL INSTRUCTION - CHART TYPE:
The user has requested the chart/diagram type: "${targetType}" (${typeNameMap[targetType]}).
You MUST generate data for type: "${targetType}".
The JSON property "type" MUST BE EXACTLY "${targetType}".
DO NOT generate any other chart type!

${cleanTopic ? `USER REQUESTED TOPIC / REQUIREMENT:
The user explicitly wants a question about: "${cleanTopic}".
Generate the chart data, title, context, and numbers specifically tailored to this topic while maintaining IELTS Academic standard.` : `The topic should be realistic and similar to actual IELTS exam questions (e.g. energy, education, tourism, transport, population, environment, employment, housing, food, health, technology).`}

Return ONLY a valid JSON object (no markdown, no backticks) with this structure:

For "bar" type:
{
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
  "writingTips": "Short summary tip",
  "outline": [ ... ]
}

For "line" type:
{
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
  "writingTips": "Short summary tip",
  "outline": [ ... ]
}

For "pie" type:
{
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
  "writingTips": "Short summary tip",
  "outline": [ ... ]
}

For "table" type:
{
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
  "writingTips": "Short summary tip",
  "outline": [ ... ]
}

For "process" type:
{
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
  "writingTips": "Short summary tip",
  "outline": [ ... ]
}

For "map" type:
{
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
  "writingTips": "Note: position MUST be one of: north, south, east, west, center, northeast, northwest, southeast, southwest.",
  "outline": [ ... ]
}

${OUTLINE_INSTRUCTIONS}

Make sure the data is realistic, internally consistent (e.g., pie segments add up to 100 if %), and the 4-body Vietnamese outline matches the exact numbers/details in the chart.
`;

  try {
    const { data } = await generateJsonWithFallback(prompt, `task1-generate:${targetType}`, (parsed) => {
      if (!parsed || typeof parsed !== 'object' || !parsed.context) {
        throw new Error('Dữ liệu đề bài Task 1 không hợp lệ');
      }
      if (!parsed.type || !VALID_TYPES.includes(parsed.type)) {
        parsed.type = targetType;
      }
      parsed.outline = normalizeOutline(parsed.outline, 'task1');
      return parsed;
    });

    return NextResponse.json(data, { status: 200 });
  } catch (error: any) {
    console.error('Lỗi khi tạo đề Task 1:', error);
    const { message, status } = formatGeminiError(error, 'Lỗi AI: ');
    return NextResponse.json({ error: message }, { status });
  }
}
