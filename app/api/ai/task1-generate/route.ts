import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { GEMINI_FALLBACK_MODELS } from '@/lib/ai-models';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

const VALID_TYPES = ['bar', 'line', 'pie', 'table', 'process', 'map'] as const;
type ValidType = typeof VALID_TYPES[number];

function resolveChartType(reqType?: string, topic?: string): ValidType {
  const normReq = (reqType || '').toLowerCase().trim();
  if (VALID_TYPES.includes(normReq as ValidType)) {
    return normReq as ValidType;
  }

  // Detect type from user prompt/topic string
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

  // If random or not specified, pick one evenly across all types in JS to prevent Gemini from always picking "line"
  const randomIndex = Math.floor(Math.random() * VALID_TYPES.length);
  return VALID_TYPES[randomIndex];
}

export async function POST(req: Request) {
  if (!process.env.GEMINI_API_KEY) {
    return NextResponse.json({ error: 'Chưa cấu hình GEMINI_API_KEY.' }, { status: 500 });
  }

  let requestedType: string | undefined;
  let customTopic: string | undefined;

  try {
    const body = await req.json();
    requestedType = body.chartType || body.type;
    customTopic = body.customTopic || body.topic || body.prompt;
  } catch {
    // If request has no json body or invalid json, proceed with undefined
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
You are an IELTS Task 1 question generator. Your job is to create realistic IELTS Academic Writing Task 1 data.

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
  "keyFeatures": ["Key trend 1 that a good writer should mention", "Key trend 2", "Key trend 3"],
  "writingTips": "Focus on: overall trend, highest/lowest points, significant differences between groups."
}

For "line" type:
{
  "type": "line",
  "title": "Short descriptive title",
  "context": "The line graph below shows ...",
  "prompt": "Summarise the information by selecting and reporting the main features, and make comparisons where relevant.",
  "xLabel": "Year",
  "yLabel": "Unit label",
  "xValues": ["2000", "2005", "2010", "2015", "2020"],
  "series": [
    { "name": "Country/Category A", "values": [20, 35, 50, 45, 60] },
    { "name": "Country/Category B", "values": [40, 38, 42, 55, 70] }
  ],
  "keyFeatures": ["Feature 1", "Feature 2", "Feature 3"],
  "writingTips": "Note the starting points, ending points, crossover points, and overall trend for each line."
}

For "pie" type:
{
  "type": "pie",
  "title": "Short descriptive title",
  "context": "The pie chart below shows ...",
  "prompt": "Summarise the information by selecting and reporting the main features.",
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
  "writingTips": "Describe the largest and smallest segments, then group similar-sized segments."
}

For "table" type:
{
  "type": "table",
  "title": "Short descriptive title",
  "context": "The table below shows ...",
  "prompt": "Summarise the information by selecting and reporting the main features, and make comparisons where relevant.",
  "headers": ["Country", "2000", "2010", "2020"],
  "rows": [
    ["USA", "280", "310", "330"],
    ["China", "1270", "1340", "1400"],
    ["India", "1000", "1180", "1380"]
  ],
  "unit": "millions",
  "keyFeatures": ["Feature 1", "Feature 2"],
  "writingTips": "Compare rows and columns systematically, note the overall pattern."
}

For "process" type:
{
  "type": "process",
  "title": "Short descriptive title",
  "context": "The diagram below shows the process of ...",
  "prompt": "Summarise the information by selecting and reporting the main features.",
  "steps": [
    { "id": 1, "label": "Step 1 name", "description": "Brief description of what happens" },
    { "id": 2, "label": "Step 2 name", "description": "Brief description" },
    { "id": 3, "label": "Step 3 name", "description": "Brief description" },
    { "id": 4, "label": "Step 4 name", "description": "Brief description" },
    { "id": 5, "label": "Step 5 name", "description": "Brief description" },
    { "id": 6, "label": "Step 6 name", "description": "Brief description" }
  ],
  "keyFeatures": ["Feature 1", "Feature 2"],
  "writingTips": "Use passive voice and sequencing words (first, then, subsequently, finally). Describe ALL steps."
}

For "map" type:
{
  "type": "map",
  "title": "Short descriptive title",
  "context": "The maps below show ...",
  "prompt": "Summarise the information by selecting and reporting the main features, and make comparisons where relevant.",
  "location": "Name of the town/area",
  "period1": "1990",
  "period2": "2020",
  "features1": [
    { "name": "Feature name", "position": "north", "icon": "🌿", "description": "what existed before" }
  ],
  "features2": [
    { "name": "Feature name", "position": "north", "icon": "🏗️", "description": "what exists now" }
  ],
  "changes": ["Change 1 that a writer should mention", "Change 2", "Change 3"],
  "keyFeatures": ["Feature 1", "Feature 2"],
  "writingTips": "Use past tense for the old map, present perfect or present tense for changes. Group changes by area. Note: position MUST be one of: north, south, east, west, center, northeast, northwest, southeast, southwest."
}

Make sure the data is realistic and similar to actual IELTS exam questions.
`;

  const fallbackModels = GEMINI_FALLBACK_MODELS;

  let result: any;
  let lastError: any;
  const errors: string[] = [];

  try {
    for (const modelName of fallbackModels) {
      try {
        const model = genAI.getGenerativeModel({ model: modelName });
        result = await model.generateContent(prompt);
        if (result) {
          console.log(`[task1-generate] Đã dùng thành công model: ${modelName} cho dạng bài: ${targetType}`);
          break; // Thoát vòng lặp ngay nếu thành công
        }
      } catch (e: any) {
        lastError = e;
        errors.push(`[${modelName}]: ${e.message}`);
        console.warn(`[task1-generate] Model ${modelName} bị lỗi hoặc quá tải: ${e.message}`);
      }
    }

    if (!result) throw lastError || new Error('Tất cả mô hình đều đang bận: ' + errors.join(' | '));

    const response = await result.response;
    let text = response.text().replace(/```json/gi, '').replace(/```/g, '').trim();

    const firstBrace = text.indexOf('{');
    const lastBrace = text.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      text = text.substring(firstBrace, lastBrace + 1);
    }

    try {
      const data = JSON.parse(text);
      if (!data.type) {
        data.type = targetType;
      }
      return NextResponse.json(data, { status: 200 });
    } catch (parseErr: any) {
      console.error('Lỗi Parse JSON từ Gemini:', text.slice(0, 200));
      return NextResponse.json({ error: 'AI trả về định dạng lỗi: ' + text.slice(0, 100) + '...' }, { status: 500 });
    }
  } catch (error: any) {
    console.error('Lỗi khi tạo đề Task 1:', error);
    const msg = error?.message || String(error);
    const isQuotaError = msg.includes('429') || msg.includes('Quota exceeded') || msg.includes('Too Many Requests');
    const friendlyMsg = isQuotaError
      ? 'Hệ thống AI đang tạm thời đạt giới hạn lượt gọi (Rate Limit / Quota). Vui lòng đợi khoảng 15-30 giây rồi bấm thử lại.'
      : 'Lỗi AI: ' + msg;
    return NextResponse.json(
      { error: friendlyMsg },
      { status: 500 }
    );
  }
}

