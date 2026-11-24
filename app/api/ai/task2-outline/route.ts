export const maxDuration = 60;

import { NextRequest, NextResponse } from 'next/server';
import {
  formatGeminiError,
  generateJsonWithFallback,
  isLengthOrTransientError,
} from '@/lib/gemini-helper';
import {
  normalizeOutline,
  normalizeOutlineBodyItem,
  TASK2_BODY_TEMPLATES,
  type WritingVocabPrep,
} from '@/lib/writing-practice-types';

const BODY_SPECS_TASK2: Record<number, string> = {
  0: `- bodyIndex 0 — "Body 1 — Mở bài (Introduction & Thesis Roadmap)" [targetSentenceCount: ĐÚNG 2 câu]:
  * Câu 1 (Câu phức — Complex): Paraphrase bối cảnh tranh luận cốt lõi của đề (KHÔNG sáo rỗng kiểu "Nowadays this topic is debated").
  * Câu 2 (Câu phức — Complex, nối mượt Câu 1 bằng "While/Although" hoặc quy chiếu): Thesis Statement sắc bén trả lời TRỰC DIỆN mọi vế câu hỏi và hé lộ đúng lộ trình 3 thân bài.`,
  1: `- bodyIndex 1 — "Body 2 — Thân bài 1 (Luận điểm trụ cột 1 — Chiều sâu nhân-quả)" [targetSentenceCount: ĐÚNG 4 câu]:
  * Câu 1 (Câu đơn — Simple): Topic Sentence sắc gọn chốt thẳng luận điểm 1 (gắn lộ trình Thesis).
  * Câu 2 (Câu phức — Complex, nối bằng Old->New từ Câu 1): Giải thích cơ chế vận hành sâu ("tại sao & bằng cách nào thực sự xảy ra").
  * Câu 3 (Câu phức — Complex, nối bằng quy chiếu từ Câu 2): Minh họa bối cảnh thực tế & hệ quả cụ thể (KHÔNG bịa số liệu ảo).
  * Câu 4 (Câu đơn hoặc Câu ghép gọn — nối từ Câu 3): Chốt luận điểm quay về bảo vệ Thesis.`,
  2: `- bodyIndex 2 — "Body 3 — Thân bài 2 (Luận điểm trụ cột 2 — Tầng phân tích tách biệt)" [targetSentenceCount: ĐÚNG 4 câu]:
  * Triển khai góc độ HOÀN TOÀN KHÁC với Body 2 (ZERO trùng ý).
  * Câu 1 (Câu đơn — Simple, chuyển mạch mượt từ Body 2 bằng cụm chủ đề như "Beyond [khía cạnh Body 2], ..." — CẤM "Secondly,"): Topic Sentence chốt luận điểm 2.
  * Câu 2 (Câu phức — Complex) -> Câu 3 (Câu phức — Complex) -> Câu 4 (Câu đơn/ghép gọn): Cơ chế sâu -> Minh họa thực tế -> Chốt luận điểm, nối khớp CC 9.0 từng câu.`,
  3: `- bodyIndex 3 — "Body 4 — Thân bài 3 (Nhượng bộ & Phản biện / Điều kiện biên chuẩn 8.0+)" [targetSentenceCount: ĐÚNG 4 câu]:
  * Câu 1 (Câu phức — Complex): Thừa nhận sòng phẳng lập luận mạnh nhất của phe đối lập (hoặc nguyên nhân/vấn đề chính với đề Solution).
  * Câu 2 (Câu phức — Complex, lật mạch mượt không dùng "However," máy móc hoặc đặt "however" giữa câu): Chỉ rõ giới hạn thực tế / phản biện sắc bén bảo vệ Thesis (hoặc đề xuất giải pháp thực tế).
  * Câu 3 (Câu phức — Complex): Minh họa tác động thực tế của lập luận phản biện/giải pháp.
  * Câu 4 (Câu đơn — Simple): Chốt khẳng định góc nhìn toàn diện bảo vệ Thesis.`,
  4: `- bodyIndex 4 — "Body 5 — Kết bài (Conclusion — Tổng hợp tam giác lập luận)" [targetSentenceCount: ĐÚNG 2 câu]:
  * Câu 1 (Câu phức — Complex): Tổng hợp trọn vẹn mạch Body 2–4 & tái khẳng định Thesis sắc gọn (TUYỆT ĐỐI không đưa ý mới).
  * Câu 2 (Câu đơn — Simple hoặc Câu phức gọn): 1 hàm ý định hướng/lời chốt tự nhiên khép bài hoàn chỉnh.`,
};

function buildConfirmedVocabBlock(vocabPrep?: WritingVocabPrep | null): string {
  if (!vocabPrep) return '';
  const hasTable = Array.isArray(vocabPrep.paraphraseTable) && vocabPrep.paraphraseTable.length > 0;
  const hasGroups = Array.isArray(vocabPrep.collocationGroups) && vocabPrep.collocationGroups.length > 0;
  if (!hasTable && !hasGroups) return '';

  return `
=== BẢNG PARAPHRASE & KHO TỪ VỰNG B1–B2 HỌC VIÊN ĐÃ XÁC NHẬN ===
BẮT BUỘC phân bổ và xoay vòng chính các biến thể paraphrase & cụm collocation B1–B2 đã xác nhận bên dưới vào 5 Body (mỗi Body dùng một biến thể paraphrase khác nhau trong bảng để TRÁNH LẶP TỪ, KHÔNG thêm từ C1–C2 cao siêu ngoài bảng này!):
- Bảng Paraphrase: ${JSON.stringify(vocabPrep.paraphraseTable || [])}
- Kho Collocation theo nhóm: ${JSON.stringify(vocabPrep.collocationGroups || [])}
`;
}

function buildTask2OutlinePrompt(params: {
  promptText: string;
  stanceHint: string;
  bodyIndices: number[];
  includeMeta: boolean;
  essayType?: string;
  promptAnalysis?: string;
  previousOutlineSummary?: any[];
  vocabPrep?: WritingVocabPrep | null;
}): string {
  const {
    promptText,
    stanceHint,
    bodyIndices,
    includeMeta,
    essayType,
    promptAnalysis,
    previousOutlineSummary,
    vocabPrep,
  } = params;

  const isPartial = bodyIndices.length < 5;
  const targetSpecs = bodyIndices.map((idx) => BODY_SPECS_TASK2[idx]).filter(Boolean).join('\n');
  const prevBlock =
    Array.isArray(previousOutlineSummary) && previousOutlineSummary.length > 0
      ? `\nALREADY PLANNED BODIES (maintain 100% Thesis consistency, seamless CC 9.0 transitions, ZERO repeated ideas):\n${JSON.stringify(previousOutlineSummary)}\n`
      : '';
  const metaContext =
    !includeMeta && (essayType || promptAnalysis)
      ? `\nIDENTIFIED ESSAY META:\n- Essay Type: ${essayType || 'IELTS Task 2'}\n- Prompt Analysis: ${promptAnalysis || ''}\n`
      : '';
  const vocabBlock = buildConfirmedVocabBlock(vocabPrep);

  return `You are an elite IELTS Academic Writing Task 2 strategist & 1-on-1 tutor coaching a Band 6.0 Vietnamese learner to reach **Overall Band 8.0** via the exact score matrix:
**TR >= 8.0 · CC >= 8.5 · GRA >= 8.0 · LR >= 7.5 (flexible, precise B2 + natural topic-specific academic collocations within task scope — ZERO memorised C2 clichés!)**

Task 2 prompt:
"""
${promptText}
"""
${stanceHint ? `Preferred stance/focus: "${stanceHint}"` : ''}
${metaContext}${vocabBlock}${prevBlock}
Generate ${isPartial ? `ONLY the requested ${bodyIndices.length} Body item(s) (bodyIndex: ${bodyIndices.join(', ')})` : 'ALL 5 Body items (bodyIndex 0..4)'}:
${targetSpecs}

STRICT COACHING RULES (grounded in Official IELTS Writing Band Descriptors May 2023 — tailor 100% to THIS exact prompt):
- Write "role", "viGuide", "bandStrategy.*", "ideaGuides[].ideaLabel", "ideaGuides[].ideaVi", and "linkingTip" in sharp VIETNAMESE. Do NOT write full sample English sentences or paragraphs!
- VOCABULARY CALIBRATION = LR 7.5 (Official Band 7–8 Bridge: flexible, precise, natural topic-specific collocations, 100% on-topic):
  * Suggest **accurate B2 + natural topic-specific academic collocations** anchored 100% to THIS prompt's topic ("ease the financial burden on", "widen access to higher education", "allocate public funding to", "impose stricter regulations", "pose a long-term challenge to", "foster social mobility").
  * Still BANNED: artificial/pompous C2 clichés ("ubiquitous", "exacerbate", "ameliorate", "unyielding", "supremacy", "myriad", "plethora", "paradigm shift", "double-edged sword", "spark heated debate", "stark dichotomy").
- DETERMINISTIC 5-RULE CC >= 8.5 BLUEPRINT (so the learner ALWAYS passes all 5 CC rules):
  * R1: 1 clear central topic & logical sentence sequencing per Body.
  * R2: Linear progression (Old -> New info / Rheme -> Theme) across every sentence transition.
  * R3: At least 1–2 clear referencing/substitution devices ("this policy", "such measures", "this financial strain", "doing so", "those who...") with clear antecedents.
  * R4: 0 mechanical sequence linkers ("Firstly/Secondly/Moreover/Furthermore"), and AT MOST 1 sentence-initial adverbial linker with comma per Body!
  * R5: 100% accurate logical & grammatical connector use (0 comma splices, 0 "Although... but...").
- MANDATORY "bandStrategy" OBJECT ON EVERY BODY:
  * "task8Note": Yêu cầu bắt buộc ở Body này để đạt **TR >= 8.0** theo chuẩn IELTS May 2023 (trả lời thẳng đề, phát triển sâu cơ chế nhân-quả & minh họa thực tế thuyết phục).
  * "cc9Note": Lưu ý CỰC KỸ để Body này đạt **CC >= 8.5 (thỏa trọn 5/5 quy luật R1–R5)**: chỉ rõ mạch Old->New, phép quy chiếu R3 cụ thể nên dùng, và kiểm soát R4 (0 Firstly/Moreover, tối đa 1 trạng từ nối đầu câu).
  * "gra8Note": Yêu cầu bắt buộc để Body này đạt **GRA >= 8.0** (phối hợp Câu đơn sắc gọn + đa dạng Câu phức, >75% câu sạch lỗi ngữ pháp & dấu câu).
  * "lrNote": Lưu ý CỰC KỸ để đạt **LR >= 7.5** ở Body này (dùng collocation B2 + thuật ngữ sát đề chính xác sắc thái, xoay vòng bảng Paraphrase không lặp từ, tránh từ khẩu ngữ và tránh từ C2 học vẹt).
- MANDATORY SENTENCE-BY-SENTENCE INTERLOCKING BLUEPRINT ("targetSentenceCount", "sentenceMixSummary", "ideaGuides" — CẤM GỢI Ý LẺ TẺ):
  For EACH Body, design an EXACT **Sentence-by-Sentence Blueprint** ("ideaGuides.length === targetSentenceCount" — EVERY object in "ideaGuides" maps 1-to-1 to ONE numbered sentence: Câu 1, Câu 2, Câu 3, Câu 4!):
  * "targetSentenceCount": Exact integer count (Body 1: 2, Body 2: 4, Body 3: 4, Body 4: 4, Body 5: 2).
  * "sentenceMixSummary": Crisp Vietnamese summary showing the exact simple/complex rhythm, e.g. "4 câu: Câu 1 (Câu đơn) → Câu 2 (Câu phức) → Câu 3 (Câu phức) → Câu 4 (Câu đơn)".
  * Inside EACH sentence item of "ideaGuides":
    - "sentenceNumber": 1, 2, 3, 4...
    - "sentenceType": EXACTLY one of "simple" | "compound" | "complex" | "compound-complex" (deliberately mix Simple + Complex across the Body for GRA 8.0 & smooth CC 8.5+!).
    - "sentenceTypeLabel": e.g. "Câu đơn (Simple)", "Câu phức (Complex)", "Câu ghép (Compound)".
    - "ideaLabel": Exact role of THIS sentence, e.g. "Câu 1 — Topic Sentence (Chốt luận điểm 1)".
    - "ideaVi": Spell out EXACTLY what goes inside THIS sentence (clause 1 -> clause 2 if complex/compound).
    - "ccLinkFromPrev": **INTERLOCKING CC 8.5+ GUIDE FOR THIS EXACT SENTENCE** (aligned with R2, R3, R4, R5): state EXPLICITLY how Câu N connects straight out of Câu N-1 (or previous Body for Câu 1) — WHICH exact concept at the end of Câu N-1 becomes the Old-Info anchor/referencing subject of Câu N, keeping <=1 initial adverbial linker across the whole Body!
    - "ccLinkPhrases": 2–3 exact natural referencing/cohesion phrases for THIS specific sentence transition (e.g. ["this financial burden", "such policies", "doing so", "in practice, ..."]).
    - "ccAvoid": 1 sharp warning naming the mechanical linker or CC error that would violate R3/R4/R5 at THIS sentence.
    - "vocabPhrases": **3–4 precise B2 / natural topic-specific collocations (LR 7.5)** strictly tied to THIS sentence & prompt topic (prioritized from confirmed vocabPrep if provided; ZERO pompous C2 clichés): [{ "phrase": "...", "meaning": "..." }].
    - "grammarPatterns": **1–2 grammar frames MATCHING "sentenceType"** of THIS sentence (Simple crisp frame for "simple"; Band 8.0 Complex frame for "complex"): [{ "structure": "...", "usage": "..." }].
- "linkingTip": 1 sharp summary of how this Body's full sentence chain bridges from previous Body to next Body.

Return ONLY valid JSON:
{
  ${includeMeta
      ? `"essayType": "Exact IELTS Task 2 question type",
  "promptAnalysis": "2–3 sharp VIETNAMESE sentences pinpointing ALL mandatory parts of the question, limiting keywords/traps, and the Band 8.5+ strategic stance.",
  `
      : ''
    }"${isPartial ? 'outlineChunk' : 'outline'}": [
    {
      "bodyIndex": ${bodyIndices[0]},
      "role": "...",
      "targetSentenceCount": 4,
      "sentenceMixSummary": "4 câu: Câu 1 (Câu đơn) → Câu 2 (Câu phức) → Câu 3 (Câu phức) → Câu 4 (Câu đơn)",
      "bandStrategy": {
        "task8Note": "...",
        "cc9Note": "...",
        "gra8Note": "...",
        "lrNote": "..."
      },
      "viGuide": ["Câu 1: ...", "Câu 2: ...", "Câu 3: ...", "Câu 4: ..."],
      "ideaGuides": [
        {
          "sentenceNumber": 1,
          "sentenceType": "simple",
          "sentenceTypeLabel": "Câu đơn (Simple)",
          "ideaLabel": "Câu 1 — Topic Sentence",
          "ideaVi": "Nêu rõ chính xác vế/ý cần viết trong Câu 1...",
          "ccLinkFromPrev": "Nối trực tiếp từ Thesis/Body trước bằng cụm quy chiếu chủ đề để mạch đọc tự nhiên chuẩn 9.0 CC...",
          "ccLinkPhrases": ["One major reason is ...", "this policy"],
          "ccAvoid": "Tránh 'Firstly,' máy móc đầu đoạn",
          "vocabPhrases": [
            { "phrase": "cause wide disagreement", "meaning": "gây ra nhiều ý kiến trái chiều" },
            { "phrase": "play an important role in", "meaning": "đóng vai trò quan trọng trong" },
            { "phrase": "long-term social effects", "meaning": "những tác động xã hội lâu dài" }
          ],
          "grammarPatterns": [
            { "structure": "[Main noun phrase] + plays a key role in + [V-ing/N]", "usage": "Khung câu đơn sắc gọn chốt thẳng Topic Claim ở Câu 1" }
          ]
        }
      ],
      "linkingTip": "..."
    }
  ]
}`;
}

async function generateTask2Chunk(
  params: {
    promptText: string;
    stanceHint: string;
    bodyIndices: number[];
    includeMeta: boolean;
    essayType?: string;
    promptAnalysis?: string;
    previousOutlineSummary?: any[];
    vocabPrep?: WritingVocabPrep | null;
  },
  options: { perModelTimeoutMs: number; totalBudgetMs: number }
) {
  const aiPrompt = buildTask2OutlinePrompt(params);
  const isPartial = params.bodyIndices.length < 5;
  const key = isPartial ? 'outlineChunk' : 'outline';

  const { data } = await generateJsonWithFallback(
    aiPrompt,
    `task2-outline:${params.bodyIndices.join('-')}`,
    (parsed) => {
      const arr = Array.isArray(parsed?.[key])
        ? parsed[key]
        : Array.isArray(parsed?.outline)
          ? parsed.outline
          : Array.isArray(parsed?.outlineChunk)
            ? parsed.outlineChunk
            : null;
      if (!arr || arr.length === 0) {
        throw new Error('AI trả về thiếu mảng dàn ý Task 2');
      }

      const items = isPartial
        ? params.bodyIndices.map((targetIdx, pos) => {
          const found =
            arr.find((x: any) => Number(x?.bodyIndex) === targetIdx) ??
            arr.find((x: any) => Number(x?.bodyIndex) === targetIdx + 1) ??
            arr[pos] ??
            {};
          return normalizeOutlineBodyItem(found, TASK2_BODY_TEMPLATES[targetIdx], targetIdx);
        })
        : normalizeOutline(arr, 'task2');

      return {
        essayType:
          typeof parsed.essayType === 'string' && parsed.essayType.trim()
            ? parsed.essayType.trim()
            : params.essayType || 'IELTS Writing Task 2',
        promptAnalysis:
          typeof parsed.promptAnalysis === 'string' && parsed.promptAnalysis.trim()
            ? parsed.promptAnalysis.trim()
            : params.promptAnalysis || 'Trả lời đầy đủ mọi vế của câu hỏi, giữ lập trường nhất quán xuyên suốt 5 đoạn.',
        items,
      };
    },
    {
      temperature: 0.45,
      maxOutputTokens:
        params.bodyIndices.length === 5
          ? 8192
          : params.bodyIndices.length >= 3
            ? 5600
            : params.bodyIndices.length === 2
              ? 4400
              : 2800,
      perModelTimeoutMs: options.perModelTimeoutMs,
      totalBudgetMs: options.totalBudgetMs,
      failFastOnTooLong: params.bodyIndices.length >= 4,
    }
  );

  return data;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const promptText: string = typeof body?.prompt === 'string' ? body.prompt.trim() : '';
    const stanceHint: string = typeof body?.stanceHint === 'string' ? body.stanceHint.trim() : '';
    const mode: string | undefined = typeof body?.mode === 'string' ? body.mode : undefined;
    const vocabPrep: WritingVocabPrep | undefined = body?.vocabPrep;

    if (!promptText || promptText.length < 15) {
      return NextResponse.json(
        { error: 'Vui lòng nhập đề bài IELTS Writing Task 2 đầy đủ (tối thiểu 15 ký tự).' },
        { status: 400 }
      );
    }

    // Chunked mode (client automatic fallback when full response is too long)
    if (mode === 'chunk' && Array.isArray(body?.bodyIndices) && body.bodyIndices.length > 0) {
      const bodyIndices: number[] = body.bodyIndices
        .map((n: any) => Number(n))
        .filter((n: number) => Number.isInteger(n) && n >= 0 && n <= 4);

      if (bodyIndices.length === 0) {
        return NextResponse.json({ error: 'bodyIndices không hợp lệ.' }, { status: 400 });
      }

      const chunkData = await generateTask2Chunk(
        {
          promptText,
          stanceHint,
          bodyIndices,
          includeMeta: Boolean(body.includeMeta),
          essayType: typeof body.essayType === 'string' ? body.essayType : vocabPrep?.essayType,
          promptAnalysis:
            typeof body.promptAnalysis === 'string' ? body.promptAnalysis : vocabPrep?.promptAnalysis,
          previousOutlineSummary: Array.isArray(body.previousOutlineSummary)
            ? body.previousOutlineSummary
            : undefined,
          vocabPrep,
        },
        { perModelTimeoutMs: 22_000, totalBudgetMs: 50_000 }
      );

      return NextResponse.json(
        {
          essayType: chunkData.essayType,
          promptAnalysis: chunkData.promptAnalysis,
          outlineChunk: chunkData.items,
        },
        { status: 200 }
      );
    }

    // Default full 5-body mode (with automatic server-side 2-part split if output is too long!)
    const startTs = Date.now();
    try {
      const fullData = await generateTask2Chunk(
        {
          promptText,
          stanceHint,
          bodyIndices: [0, 1, 2, 3, 4],
          includeMeta: true,
          essayType: vocabPrep?.essayType,
          promptAnalysis: vocabPrep?.promptAnalysis,
          vocabPrep,
        },
        { perModelTimeoutMs: 24_000, totalBudgetMs: 30_000 }
      );

      return NextResponse.json(
        {
          essayType: fullData.essayType,
          promptAnalysis: fullData.promptAnalysis,
          outline: fullData.items,
        },
        { status: 200 }
      );
    } catch (firstErr: any) {
      const elapsed = Date.now() - startTs;
      const remaining = 55_000 - elapsed;

      if (isLengthOrTransientError(firstErr) && remaining >= 20_000) {
        console.warn('[task2-outline] Full 5-body outline failed/too long, splitting server-side into [0,1] + [2,3,4]...');
        const part1Budget = Math.floor(remaining * 0.45);
        const part1 = await generateTask2Chunk(
          {
            promptText,
            stanceHint,
            bodyIndices: [0, 1],
            includeMeta: true,
            essayType: vocabPrep?.essayType,
            promptAnalysis: vocabPrep?.promptAnalysis,
            vocabPrep,
          },
          { perModelTimeoutMs: Math.min(18_000, part1Budget), totalBudgetMs: part1Budget }
        );

        const part2Remaining = Math.max(10_000, 55_000 - (Date.now() - startTs));
        const part2 = await generateTask2Chunk(
          {
            promptText,
            stanceHint,
            bodyIndices: [2, 3, 4],
            includeMeta: false,
            essayType: part1.essayType,
            promptAnalysis: part1.promptAnalysis,
            previousOutlineSummary: part1.items.map((o) => ({
              bodyIndex: o.bodyIndex,
              role: o.role,
              viGuide: o.viGuide,
            })),
            vocabPrep,
          },
          { perModelTimeoutMs: Math.min(20_000, part2Remaining), totalBudgetMs: part2Remaining }
        );

        return NextResponse.json(
          {
            essayType: part1.essayType,
            promptAnalysis: part1.promptAnalysis,
            outline: normalizeOutline([...part1.items, ...part2.items], 'task2'),
          },
          { status: 200 }
        );
      }

      throw firstErr;
    }
  } catch (error: any) {
    console.error('[task2-outline] Error:', error);
    const { message, status } = formatGeminiError(error, 'Lỗi tạo dàn ý Task 2: ');
    return NextResponse.json({ error: message }, { status });
  }
}
