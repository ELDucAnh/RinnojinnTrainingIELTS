export const maxDuration = 60;

import { NextRequest, NextResponse } from 'next/server';
import {
  formatGeminiError,
  generateJsonWithFallback,
  isLengthOrTransientError,
} from '@/lib/gemini-helper';
import { normalizeVocabPrep, type ChartData } from '@/lib/writing-practice-types';

type PrepPhase = 'full' | 'paraphrase' | 'collocations';

const STRICT_B1_B2_VOCAB_RULES = `
STRICT VOCABULARY CEILING = B1–B2 ONLY (MỤC TIÊU LR 7.0 — CHỐNG TỪ CAO SIÊU & CHỐNG LỆCH ĐỀ 100%):
- Learner ONLY needs **LR 7.0** (because strategy is 8 TA/TR · 9 CC · 8 GRA · 7 LR = Overall 8.0).
- Band 7.0 LR does NOT require fancy C1–C2 words! Every single word, paraphrase, and collocation MUST be:
  1. Plain, clear, natural **B1–B2** English that native speakers actually use in straightforward academic writing.
  2. 100% ON-TOPIC and faithful to the exact meaning/scope of the prompt or chart (ZERO exaggerated, vague, or off-topic metaphors).
  3. Easy for a Band 6.0 learner to plug directly into their own sentences without risking wrong collocation or wrong register.
- STRICTLY BANNED OVERKILL / POMPOUS WORDS (NEVER output any of these):
  "ubiquitous", "exacerbate", "ameliorate", "mitigate", "proliferate", "paramount", "deleterious", "detrimental",
  "unprecedented", "multifaceted", "paradigm shift", "galvanize", "bolster", "perpetuate", "unyielding", "supremacy",
  "indispensable", "myriad", "plethora", "ramifications", "repercussions", "ostensibly", "inherently", "stark contrast",
  "stark dichotomy", "double-edged sword", "spark heated debate", "trajectory", "skyrocket", "plummet", "preponderance",
  "predominance", "eclipse", "dwarf", "metamorphose", "burgeoning", "outstrip", "socio-economic stratification".
- Self-check EVERY item before outputting: "Is this plain B1–B2 English? Does it preserve the exact meaning of the prompt/chart without sounding overly dramatic or off-topic?" If not -> replace with a simpler, clearer B1–B2 phrase!
`;

function buildTask1Context(chartData: ChartData): string {
  return `IELTS Academic Writing Task 1 Chart Data:
${JSON.stringify(chartData)}`;
}

function buildTask2Context(promptText: string, stanceHint: string): string {
  return `IELTS Academic Writing Task 2 Prompt:
"""
${promptText}
"""
${stanceHint ? `Learner's preferred stance/focus: "${stanceHint}"` : ''}`;
}

function buildFullPrompt(params: {
  taskType: 'task1' | 'task2';
  chartData?: ChartData;
  promptText?: string;
  stanceHint?: string;
}): string {
  const { taskType, chartData, promptText = '', stanceHint = '' } = params;

  if (taskType === 'task1') {
    return `You are an IELTS Academic Writing Task 1 coach preparing a **Pre-Writing Vocabulary & Paraphrase Table** for a Vietnamese Band 6 -> Band 8 learner BEFORE they view the 4-body outline.

${buildTask1Context(chartData!)}

${STRICT_B1_B2_VOCAB_RULES}

TASK:
1. Build "paraphraseTable" (**5–6 rows**) covering ALL core words/phrases from THIS chart so the learner NEVER repeats the same words across Intro, Overview, Detail 1, and Detail 2:
   - Row 1: Chart verb & subject (e.g. "shows / gives information about" + exact topic)
   - Row 2–3: Main categories / objects / units from THIS exact chart (exact nouns/metrics!)
   - Row 4: Time period / comparison phrases tailored to THIS chart
   - Row 5–6: Key movement / change / stage verbs suited to THIS exact chart type ("${chartData?.type}") — e.g. rise/fall/stay steady (bar/line/table), account for/share (pie), be turned into/pass through (process), be replaced by/be built (map).
   - Each row MUST have **3–4 plain B1–B2 alternatives** + concise Vietnamese "meaningVi" + short Vietnamese "usageNote" (when to use which variant to avoid off-topic errors).
2. Build "collocationGroups" (**3 focused groups**, **4–5 plain B1–B2 collocations per group**):
   - Group 1: "Mở bài & Tổng quan (Intro & Overview)"
   - Group 2: "Mô tả số liệu & Biến động sát biểu đồ (Detail 1 & 2)" — directly using this chart's topic/unit!
   - Group 3: "So sánh đối chiếu & Quy chiếu tránh lặp từ (CC 9.0 + LR 7.0)"
3. Write "antiRepetitionTip": 1–2 concise Vietnamese sentences explaining how to rotate these rows across the 4 Bodies.

Return ONLY valid JSON:
{
  "paraphraseTable": [
    {
      "originalTerm": "Cụm gốc trong đề / biểu đồ",
      "meaningVi": "Nghĩa tiếng Việt ngắn gọn",
      "alternatives": ["cách paraphrase B1-B2 #1", "cách #2", "cách #3"],
      "usageNote": "Lưu ý ngữ cảnh dùng đúng đơn vị/sắc thái"
    }
  ],
  "collocationGroups": [
    {
      "groupTitle": "Tên nhóm bằng tiếng Việt",
      "items": [
        {
          "phrase": "plain B1-B2 collocation",
          "meaningVi": "nghĩa tiếng Việt",
          "exampleUsage": "ngữ cảnh lắp vào ý nào (ngắn gọn bằng tiếng Việt)"
        }
      ]
    }
  ],
  "antiRepetitionTip": "..."
}`;
  }

  return `You are an IELTS Academic Writing Task 2 coach preparing a **Pre-Writing Vocabulary & Paraphrase Table** for a Vietnamese Band 6 -> Band 8 learner BEFORE they view the 5-body outline.

${buildTask2Context(promptText, stanceHint)}

${STRICT_B1_B2_VOCAB_RULES}

TASK:
1. Identify "essayType" (exact IELTS Task 2 type) and "promptAnalysis" (2–3 sharp VIETNAMESE sentences pinpointing ALL mandatory parts of the question, traps/limiting words like "only/completely/both views", and the best Band 8.0+ stance).
2. Build "paraphraseTable" (**5–7 rows**) covering ALL key concepts/terms in THIS exact Task 2 prompt so the learner NEVER repeats the same words across the 5 Bodies (Intro, Body 1, Body 2, Body 3, Conclusion):
   - Extract the actual key nouns, people groups, actions, and core concepts from the prompt (do NOT invent unrelated concepts!).
   - For EACH row, give **3–4 plain, natural B1–B2 alternatives** that keep the EXACT meaning (ZERO distortion / off-topic drift!), plus concise Vietnamese "meaningVi" and short "usageNote" explaining where/how to rotate them across the 5 bodies.
3. Build "collocationGroups" (**3–4 focused groups**, **4–5 plain B1–B2 collocations per group** = ~14–18 practical phrases total):
   - Group 1: "Mở bài, Nêu quan điểm & Kết bài (Body 1 & Body 5)"
   - Group 2: "Triển khai luận điểm chính sát đề (Body 2 & Body 3)"
   - Group 3: "Phản biện, Giới hạn & Giải pháp thực tế (Body 4)"
   - Group 4: "Động từ & Cụm diễn đạt nguyên nhân – kết quả B1–B2 (tránh lặp cause / lead to / good / bad)"
4. Write "antiRepetitionTip": 1–2 crisp Vietnamese sentences explaining how to rotate the paraphrase table across Bodies 1–5 to keep LR 7.0 clean and CC 9.0 natural.

Return ONLY valid JSON:
{
  "essayType": "Opinion — Agree or Disagree / Discussion + Opinion / ...",
  "promptAnalysis": "2–3 câu phân tích yêu cầu đề bài bằng tiếng Việt...",
  "paraphraseTable": [
    {
      "originalTerm": "Từ / cụm khóa gốc trong đề bài",
      "meaningVi": "Nghĩa tiếng Việt ngắn gọn",
      "alternatives": ["cách paraphrase B1-B2 #1", "cách #2", "cách #3"],
      "usageNote": "Lưu ý giữ đúng nghĩa đề bài, gợi ý dùng ở Body nào"
    }
  ],
  "collocationGroups": [
    {
      "groupTitle": "Tên nhóm bằng tiếng Việt",
      "items": [
        {
          "phrase": "plain B1-B2 collocation",
          "meaningVi": "nghĩa tiếng Việt",
          "exampleUsage": "dùng để diễn đạt ý nào trong bài (ngắn gọn bằng tiếng Việt)"
        }
      ]
    }
  ],
  "antiRepetitionTip": "..."
}`;
}

function buildPhasePrompt(params: {
  phase: 'paraphrase' | 'collocations';
  taskType: 'task1' | 'task2';
  chartData?: ChartData;
  promptText?: string;
  stanceHint?: string;
  paraphraseSummary?: any[];
}): string {
  const { phase, taskType, chartData, promptText = '', stanceHint = '', paraphraseSummary } = params;
  const ctx = taskType === 'task1' ? buildTask1Context(chartData!) : buildTask2Context(promptText, stanceHint);

  if (phase === 'paraphrase') {
    return `You are an IELTS Academic Writing ${taskType === 'task1' ? 'Task 1' : 'Task 2'} coach.
${ctx}
${STRICT_B1_B2_VOCAB_RULES}
Generate ONLY ${taskType === 'task2' ? '"essayType", "promptAnalysis", and ' : ''}"paraphraseTable" (5–6 rows, 3–4 plain B1–B2 alternatives per row, 100% on-topic) and "antiRepetitionTip".
Return ONLY valid JSON:
{
  ${taskType === 'task2' ? '"essayType": "...",\n  "promptAnalysis": "...",\n  ' : ''}"paraphraseTable": [
    { "originalTerm": "...", "meaningVi": "...", "alternatives": ["...", "...", "..."], "usageNote": "..." }
  ],
  "antiRepetitionTip": "..."
}`;
  }

  return `You are an IELTS Academic Writing ${taskType === 'task1' ? 'Task 1' : 'Task 2'} coach.
${ctx}
Already generated paraphrase table (stay 100% consistent): ${JSON.stringify(paraphraseSummary || [])}
${STRICT_B1_B2_VOCAB_RULES}
Generate ONLY "collocationGroups" (3 focused groups, 4–5 plain B1–B2 on-topic collocations per group).
Return ONLY valid JSON:
{
  "collocationGroups": [
    {
      "groupTitle": "...",
      "items": [
        { "phrase": "...", "meaningVi": "...", "exampleUsage": "..." }
      ]
    }
  ]
}`;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const taskType: 'task1' | 'task2' = body?.taskType;
    const chartData: ChartData | undefined = body?.chartData;
    const promptText: string = typeof body?.prompt === 'string' ? body.prompt.trim() : '';
    const stanceHint: string = typeof body?.stanceHint === 'string' ? body.stanceHint.trim() : '';
    const phase: PrepPhase = body?.phase || 'full';

    if (taskType !== 'task1' && taskType !== 'task2') {
      return NextResponse.json({ error: 'taskType không hợp lệ.' }, { status: 400 });
    }
    if (taskType === 'task1' && !chartData?.context) {
      return NextResponse.json({ error: 'Thiếu dữ liệu biểu đồ Task 1.' }, { status: 400 });
    }
    if (taskType === 'task2' && promptText.length < 15) {
      return NextResponse.json(
        { error: 'Vui lòng nhập đầy đủ đề bài Task 2 (tối thiểu 15 ký tự).' },
        { status: 400 }
      );
    }

    // Chunked phase handlers
    if (phase === 'paraphrase' || phase === 'collocations') {
      const pPrompt = buildPhasePrompt({
        phase,
        taskType,
        chartData,
        promptText,
        stanceHint,
        paraphraseSummary: body?.paraphraseSummary,
      });

      const { data } = await generateJsonWithFallback(
        pPrompt,
        `writing-vocab-prep:${taskType}:${phase}`,
        (parsed) => {
          if (phase === 'paraphrase' && (!Array.isArray(parsed?.paraphraseTable) || parsed.paraphraseTable.length === 0)) {
            throw new Error('Thiếu bảng paraphrase');
          }
          if (phase === 'collocations' && (!Array.isArray(parsed?.collocationGroups) || parsed.collocationGroups.length === 0)) {
            throw new Error('Thiếu nhóm collocation');
          }
          return parsed;
        },
        { temperature: 0.45, maxOutputTokens: 2600, perModelTimeoutMs: 20_000, totalBudgetMs: 46_000 }
      );

      return NextResponse.json(data, { status: 200 });
    }

    // Full single-shot mode (with server-side split fallback if too long)
    const startTs = Date.now();
    const fullPrompt = buildFullPrompt({ taskType, chartData, promptText, stanceHint });

    try {
      const { data } = await generateJsonWithFallback(
        fullPrompt,
        `writing-vocab-prep:${taskType}:full`,
        (parsed) => {
          const normalized = normalizeVocabPrep(parsed);
          if (normalized.paraphraseTable.length === 0 && normalized.collocationGroups.length === 0) {
            throw new Error('AI trả về bảng từ vựng rỗng');
          }
          return normalized;
        },
        {
          temperature: 0.45,
          maxOutputTokens: 4200,
          perModelTimeoutMs: 22_000,
          totalBudgetMs: 32_000,
          failFastOnTooLong: true,
        }
      );

      return NextResponse.json(data, { status: 200 });
    } catch (firstErr: any) {
      const remaining = 55_000 - (Date.now() - startTs);
      if (isLengthOrTransientError(firstErr) && remaining >= 18_000) {
        const half = Math.floor(remaining / 2) - 500;
        const p1 = await generateJsonWithFallback(
          buildPhasePrompt({ phase: 'paraphrase', taskType, chartData, promptText, stanceHint }),
          `writing-vocab-prep:${taskType}:split-p1`,
          (p) => p,
          { temperature: 0.45, maxOutputTokens: 2400, perModelTimeoutMs: Math.min(18_000, half), totalBudgetMs: half }
        );
        const rem2 = Math.max(8_000, 55_000 - (Date.now() - startTs));
        const p2 = await generateJsonWithFallback(
          buildPhasePrompt({
            phase: 'collocations',
            taskType,
            chartData,
            promptText,
            stanceHint,
            paraphraseSummary: p1.data?.paraphraseTable,
          }),
          `writing-vocab-prep:${taskType}:split-p2`,
          (p) => p,
          { temperature: 0.45, maxOutputTokens: 2400, perModelTimeoutMs: Math.min(18_000, rem2), totalBudgetMs: rem2 }
        );

        return NextResponse.json(
          normalizeVocabPrep({
            ...p1.data,
            collocationGroups: p2.data?.collocationGroups || [],
          }),
          { status: 200 }
        );
      }

      throw firstErr;
    }
  } catch (error: any) {
    console.error('[writing-vocab-prep] Error:', error);
    const { message, status } = formatGeminiError(error, 'Lỗi tạo bảng từ vựng & paraphrase: ');
    return NextResponse.json({ error: message }, { status });
  }
}
