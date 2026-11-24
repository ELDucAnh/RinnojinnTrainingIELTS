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
  type WritingVocabPrep,
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
  0: `- bodyIndex 0 — Body 1 (Introduction — Mở bài chuẩn xác TA 8.0+, targetSentenceCount: 1 hoặc 2 câu):
  * Paraphrase đủ 100% chiều thông tin (loại biểu đồ, đối tượng, đơn vị đo, địa điểm/nhóm, đầy đủ mốc thời gian) mà KHÔNG chép nguyên cụm đề bài.
  * Nêu rõ dùng 1 câu phức gọn hay 2 câu (Câu 1 nêu đối tượng/mốc thời gian + Câu 2 nêu đơn vị đo/phạm vi).`,
  1: `- bodyIndex 1 — Body 2 (Overview — Tổng quan ăn điểm TA 8.5 & CC 9.0, targetSentenceCount: ĐÚNG 2 câu):
  * Câu 1 (Câu phức — Complex): Xu hướng/thứ bậc chi phối toàn cục nhất (tầng 1).
  * Câu 2 (Câu phức hoặc Câu đơn sắc gọn — nối trực tiếp Câu 1): Điểm đối lập nổi bật / bước ngoặt / ngoại lệ đáng chú ý nhất (tầng 2). TUYỆT ĐỐI KHÔNG chèn số liệu chi tiết.`,
  2: `- bodyIndex 2 — Body 3 (Detail Paragraph 1 — Nhóm phân tích chiến lược 1, targetSentenceCount: 3–4 câu):
  * Gom nhóm thông minh theo logic dữ liệu (KHÔNG liệt kê rời rạc từng mục). Phối hợp rõ Câu đơn (mở nhóm / chốt chênh lệch) + Câu phức (so sánh & miêu tả biến động kèm số liệu chính xác 100% từ chartData).
  * Thiết kế chuỗi CC 9.0 nối khớp từng câu: Overview → Câu 1 → Câu 2 → Câu 3 (→ Câu 4).`,
  3: `- bodyIndex 3 — Body 4 (Detail Paragraph 2 — Nhóm đối chiếu & hoàn tất bức tranh dữ liệu, targetSentenceCount: 3–4 câu):
  * Xử lý nhóm dữ liệu còn lại theo logic tương phản/bổ sung, đối chiếu NGƯỢC LẠI với Body 3 kèm số liệu 100% chính xác.
  * Thiết kế chuỗi CC 9.0 nối "tàng hình" từ Body 3 → Câu 1 → Câu 2 → Câu 3 (→ Câu 4), tuyệt đối không dùng "Secondly/Moreover".`,
};

function buildConfirmedVocabBlock(vocabPrep?: WritingVocabPrep | null): string {
  if (!vocabPrep) return '';
  const hasTable = Array.isArray(vocabPrep.paraphraseTable) && vocabPrep.paraphraseTable.length > 0;
  const hasGroups = Array.isArray(vocabPrep.collocationGroups) && vocabPrep.collocationGroups.length > 0;
  if (!hasTable && !hasGroups) return '';

  return `
=== BẢNG PARAPHRASE & KHO TỪ VỰNG B1–B2 HỌC VIÊN ĐÃ XÁC NHẬN ===
BẮT BUỘC ưu tiên sử dụng & phân bổ chính các biến thể paraphrase và cụm collocation bên dưới vào từng Body (mỗi Body xoay vòng một cách paraphrase khác nhau trong bảng để TRÁNH LẶP TỪ, và KHÔNG bịa thêm từ C1–C2 ngoài bộ này!):
- Bảng Paraphrase: ${JSON.stringify(vocabPrep.paraphraseTable || [])}
- Kho Collocation theo nhóm: ${JSON.stringify(vocabPrep.collocationGroups || [])}
`;
}

function buildTask1OutlinePrompt(
  chartData: any,
  bodyIndices: number[],
  previousOutlineSummary?: any[],
  vocabPrep?: WritingVocabPrep | null
): string {
  const isPartial = bodyIndices.length < 4;
  const targetSpecs = bodyIndices.map((idx) => BODY_SPECS_TASK1[idx]).filter(Boolean).join('\n');
  const prevBlock =
    Array.isArray(previousOutlineSummary) && previousOutlineSummary.length > 0
      ? `\nALREADY PLANNED BODIES (keep 100% continuity & ZERO repetition with these):\n${JSON.stringify(previousOutlineSummary)}\n`
      : '';
  const vocabBlock = buildConfirmedVocabBlock(vocabPrep);

  return `You are an elite IELTS Academic Writing Task 1 tutor coaching a Band 6.0 learner to reach **Overall Band 8.0** with the exact score blueprint:
**TA >= 8.0 · CC >= 8.5 · GRA >= 8.0 · LR >= 7.5 (precise B2 + natural topic-specific collocations within task scope, ZERO memorised C2 clichés)**

Chart Data:
${JSON.stringify(chartData)}
${vocabBlock}${prevBlock}
Generate ${isPartial ? `ONLY the requested ${bodyIndices.length} Body item(s) (bodyIndex: ${bodyIndices.join(', ')})` : 'ALL 4 Body items (bodyIndex 0..3)'}:
${targetSpecs}

STRICT COACHING RULES (grounded in Official IELTS Writing Band Descriptors May 2023 — tailor 100% to THIS chart):
- Write "role", "viGuide", "bandStrategy.*", "ideaGuides[].ideaLabel", "ideaGuides[].ideaVi", and "linkingTip" in sharp, insightful VIETNAMESE. Embed exact chart numbers, units, and labels inside Body 3 & 4.
- DO NOT write full sample English sentences or paragraphs!
- VOCABULARY CALIBRATION = LR 7.5 (Official Band 7–8 Bridge: flexible, precise, natural topic-specific collocations, 100% on-topic):
  * Suggest **accurate B2 + natural topic-specific academic collocations** tailored directly to THIS chart's topic, categories, and unit ("account for the largest proportion", "experience a steady rise", "narrow/widen the gap", "remain broadly stable", "by contrast", "compared with").
  * Still BANNED: artificial/overkill C2 clichés ("skyrocket", "plummet", "preponderance", "eclipse", "dwarf", "metamorphose", "ubiquitous", "stark dichotomy").
- DETERMINISTIC 5-RULE CC >= 8.5 BLUEPRINT (so the learner ALWAYS passes all 5 CC rules):
  * R1: 1 clear focus & logical sequencing per Body.
  * R2: Linear progression (Old -> New info) across every sentence transition.
  * R3: At least 1–2 clear referencing/substitution devices ("this figure", "these categories", "the former/latter", "respectively") with clear antecedents.
  * R4: 0 mechanical sequence linkers ("Firstly/Secondly/Moreover/Furthermore"), and AT MOST 1 sentence-initial adverbial linker with comma per Body!
  * R5: 100% accurate logical & grammatical connector use (0 comma splices).
- MANDATORY "bandStrategy" OBJECT ON EVERY BODY:
  * "task8Note": Lưu ý bắt buộc ở Body này để đạt **TA >= 8.0** theo chuẩn IELTS May 2023 (đủ yêu cầu đề, chọn lọc & đối chiếu số liệu nổi bật, không sai con số/đơn vị).
  * "cc9Note": Lưu ý CỰC KỸ để Body này đạt **CC >= 8.5 (thỏa trọn 5/5 quy luật R1–R5)**: chỉ rõ mạch Old->New, phép quy chiếu R3 cụ thể nên dùng, và kiểm soát R4 (0 Firstly/Moreover, tối đa 1 trạng từ nối đầu câu).
  * "gra8Note": Lưu ý bắt buộc để Body này đạt **GRA >= 8.0** (đa dạng cấu trúc Câu đơn + Câu phức, >75% câu hoàn toàn sạch lỗi ngữ pháp & dấu câu).
  * "lrNote": Lưu ý CỰC KỸ để đạt **LR >= 7.5** ở Body này (dùng collocation B2 + thuật ngữ chủ đề chính xác sắc thái, xoay vòng bảng Paraphrase tránh lặp từ, không dùng từ khẩu ngữ và không nhồi từ C2 sáo rỗng).
- MANDATORY SENTENCE-BY-SENTENCE INTERLOCKING BLUEPRINT ("targetSentenceCount", "sentenceMixSummary", "ideaGuides" — CẤM GỢI Ý LẺ TẺ):
  For EACH Body, design an EXACT **Sentence-by-Sentence Blueprint** (so "ideaGuides.length === targetSentenceCount" — EVERY object in "ideaGuides" is ONE specific sentence in exact order: Câu 1, Câu 2, Câu 3, Câu 4!):
  * "targetSentenceCount": Exact integer count of sentences to write in this Body (Body 1: 1–2, Body 2: 2, Body 3: 3–4, Body 4: 3–4).
  * "sentenceMixSummary": Crisp Vietnamese summary showing the exact simple/complex rhythm, e.g. "3 câu: Câu 1 (Câu đơn) → Câu 2 (Câu phức) → Câu 3 (Câu phức)".
  * Inside EACH sentence item of "ideaGuides":
    - "sentenceNumber": 1, 2, 3, ...
    - "sentenceType": EXACTLY one of "simple" | "compound" | "complex" | "compound-complex" (deliberately mix Simple + Complex across the Body for natural Band 8.0 GRA rhythm & smooth Band 8.5+ CC readability!).
    - "sentenceTypeLabel": Vietnamese + English label, e.g. "Câu đơn (Simple)", "Câu phức (Complex)", "Câu ghép (Compound)".
    - "ideaLabel": Exact role of this sentence, e.g. "Câu 1 — Câu mở nhóm dữ liệu dẫn đầu".
    - "ideaVi": Spell out EXACTLY what goes inside THIS sentence (clause by clause if complex/compound, with exact chart numbers & units for Body 3 & 4!).
    - "ccLinkFromPrev": **INTERLOCKING CC 8.5+ GUIDE FOR THIS EXACT SENTENCE** (aligned with R2, R3, R4, R5): explain concretely HOW Câu N hooks directly into Câu N-1 (or previous Body for Câu 1) — WHICH exact concept/figure from Câu N-1 is picked up via referencing/thematic progression, ensuring <=1 initial adverbial linker in the whole Body!
    - "ccLinkPhrases": 2–3 specific natural referencing/linking phrases tailored to THIS exact sentence transition (e.g. ["Looking first at ...", "this figure", "by contrast", "followed closely by", "respectively"]).
    - "ccAvoid": 1 concise note naming mechanical linkers or cohesion mistakes that would violate R3/R4/R5 in this sentence.
    - "vocabPhrases": **3–4 precise B2 / natural topic-specific collocations (LR 7.5)** strictly tied to THIS sentence (prioritized from confirmed vocabPrep if provided): [{ "phrase": "...", "meaning": "..." }].
    - "grammarPatterns": **1–2 grammar frames MATCHING "sentenceType"** of THIS sentence (Simple frame for "simple"; Complex GRA 8.0 frame for "complex"): [{ "structure": "...", "usage": "..." }].
- "linkingTip": 1 concise summary of how this Body's sentence chain connects smoothly from previous Body to next Body.

Return ONLY valid JSON:
{
  "${isPartial ? 'outlineChunk' : 'outline'}": [
    {
      "bodyIndex": ${bodyIndices[0]},
      "role": "...",
      "targetSentenceCount": 3,
      "sentenceMixSummary": "3 câu: Câu 1 (Câu đơn) → Câu 2 (Câu phức) → Câu 3 (Câu phức)",
      "bandStrategy": {
        "task8Note": "...",
        "cc9Note": "...",
        "gra8Note": "...",
        "lrNote": "..."
      },
      "viGuide": ["Câu 1: ...", "Câu 2: ...", "Câu 3: ..."],
      "ideaGuides": [
        {
          "sentenceNumber": 1,
          "sentenceType": "simple",
          "sentenceTypeLabel": "Câu đơn (Simple)",
          "ideaLabel": "Câu 1 — ...",
          "ideaVi": "Viết chính xác nội dung từng vế của Câu 1 (kèm số liệu chính xác nếu là Detail)...",
          "ccLinkFromPrev": "Cách nối trực tiếp từ Body trước / Câu trước để mạch đọc tàng hình chuẩn 9.0 CC...",
          "ccLinkPhrases": ["Looking first at ...", "this figure"],
          "ccAvoid": "Tránh 'Firstly,' hoặc mở câu máy móc",
          "vocabPhrases": [
            { "phrase": "account for the largest share of", "meaning": "chiếm tỷ trọng lớn nhất trong" },
            { "phrase": "illustrate the proportion of", "meaning": "minh họa tỷ lệ của" },
            { "phrase": "compare ... across categories", "meaning": "so sánh ... giữa các nhóm" }
          ],
          "grammarPatterns": [
            { "structure": "[Subject chính] + accounted for + [số liệu], making it the largest category", "usage": "Khung câu rõ gọn khớp đúng Câu 1" }
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
  options: { perModelTimeoutMs: number; totalBudgetMs: number },
  vocabPrep?: WritingVocabPrep | null
) {
  const prompt = buildTask1OutlinePrompt(chartData, bodyIndices, previousOutlineSummary, vocabPrep);
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
      temperature: 0.45,
      maxOutputTokens: bodyIndices.length === 4 ? 8192 : bodyIndices.length === 2 ? 4600 : 2800,
      perModelTimeoutMs: options.perModelTimeoutMs,
      totalBudgetMs: options.totalBudgetMs,
      modelProfile: 'fast',
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
  let vocabPrep: WritingVocabPrep | undefined;

  try {
    const body = await req.json();
    requestedType = body.chartType || body.type;
    customTopic = body.customTopic || body.topic || body.prompt;
    mode = body.mode;
    existingChartData = body.chartData;
    vocabPrep = body.vocabPrep;
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
        { perModelTimeoutMs: 22_000, totalBudgetMs: 50_000 },
        vocabPrep
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
      const data = await generateTask1OutlineChunk(
        existingChartData,
        [0, 1, 2, 3],
        undefined,
        {
          perModelTimeoutMs: 24_000,
          totalBudgetMs: 32_000,
        },
        vocabPrep
      );
      return NextResponse.json({ outline: data }, { status: 200 });
    } catch (firstErr: any) {
      const elapsed = Date.now() - startTs;
      const remaining = 55_000 - elapsed;

      if (isLengthOrTransientError(firstErr) && remaining >= 18_000) {
        try {
          console.warn('[task1-outline-only] Full outline failed/too long, splitting into 2 server-side chunks...');
          const halfBudget = Math.floor(remaining / 2) - 500;
          const part1 = await generateTask1OutlineChunk(
            existingChartData,
            [0, 1],
            undefined,
            {
              perModelTimeoutMs: Math.min(18_000, halfBudget),
              totalBudgetMs: halfBudget,
            },
            vocabPrep
          );
          const part2 = await generateTask1OutlineChunk(
            existingChartData,
            [2, 3],
            part1.map((o) => ({ bodyIndex: o.bodyIndex, role: o.role, viGuide: o.viGuide })),
            {
              perModelTimeoutMs: Math.min(18_000, remaining - (Date.now() - startTs)),
              totalBudgetMs: Math.max(8_000, 55_000 - (Date.now() - startTs)),
            },
            vocabPrep
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
        modelProfile: 'fast',
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
