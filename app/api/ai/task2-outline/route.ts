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
} from '@/lib/writing-practice-types';

const BODY_SPECS_TASK2: Record<number, string> = {
  0: `- bodyIndex 0 — "Body 1 — Mở bài (Introduction & Thesis Roadmap)":
  * Dẫn bối cảnh chạm đúng xung đột cốt lõi của đề (KHÔNG sáo rỗng kiểu "Nowadays this topic is debated").
  * Thiết kế Thesis Statement sắc bén, trả lời TRỰC DIỆN mọi vế câu hỏi và hé lộ lộ trình lập luận 3 tầng của Body 2–4 để đảm bảo TR >= 8.0 & CC = 9.0.`,
  1: `- bodyIndex 1 — "Body 2 — Thân bài 1 (Luận điểm trụ cột 1 — Chiều sâu nhân-quả)":
  * 1 luận điểm sắc bén, không hiển nhiên, đủ 4 mắt xích Band 8.0+: Topic Claim -> Cơ chế vận hành sâu (tại sao xảy ra ở tầng tâm lý/kinh tế/chính sách) -> Bối cảnh minh họa thực tế (KHÔNG bịa số liệu ảo) -> Chốt gắn lại Thesis.`,
  2: `- bodyIndex 2 — "Body 3 — Thân bài 2 (Luận điểm trụ cột 2 — Tầng phân tích tách biệt)":
  * Triển khai góc độ/vế HOÀN TOÀN KHÁC với Body 2 (ZERO trùng ý), đủ 4 mắt xích Claim -> Cơ chế sâu -> Minh họa thực tế -> Chốt luận điểm.`,
  3: `- bodyIndex 3 — "Body 4 — Thân bài 3 (Đòn quyết định Band 8.0+: Nhượng bộ & Phản biện / Điều kiện biên)":
  * Đưa ra phản biện mạnh nhất của phe đối lập rồi chỉ rõ giới hạn/lật ngược bảo vệ Thesis (hoặc giải pháp/tác động tầng vĩ mô cho đề Problem-Solution / Two-Part) để bài đạt độ chín Band 8.0+.`,
  4: `- bodyIndex 4 — "Body 5 — Kết bài (Conclusion — Tổng hợp tam giác lập luận)":
  * Tổng hợp súc tích mạch Body 2–4 + tái khẳng định Thesis sắc gọn + 1 hàm ý định hướng tinh tế (TUYỆT ĐỐI không đưa ý mới).`,
};

function buildTask2OutlinePrompt(params: {
  promptText: string;
  stanceHint: string;
  bodyIndices: number[];
  includeMeta: boolean;
  essayType?: string;
  promptAnalysis?: string;
  previousOutlineSummary?: any[];
}): string {
  const {
    promptText,
    stanceHint,
    bodyIndices,
    includeMeta,
    essayType,
    promptAnalysis,
    previousOutlineSummary,
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

  return `You are an elite IELTS Academic Writing Task 2 strategist & 1-on-1 tutor coaching a Band 6.0 Vietnamese learner to reach **Overall Band 8.0** via the exact score matrix:
**TR >= 8.0 · CC = 9.0 · GRA >= 8.0 · LR >= 7.0 (with clear notes to push lexical precision cleanly toward 8.0)**

Task 2 prompt:
"""
${promptText}
"""
${stanceHint ? `Preferred stance/focus: "${stanceHint}"` : ''}
${metaContext}${prevBlock}
Generate ${isPartial ? `ONLY the requested ${bodyIndices.length} Body item(s) (bodyIndex: ${bodyIndices.join(', ')})` : 'ALL 5 Body items (bodyIndex 0..4)'}:
${targetSpecs}

STRICT COACHING RULES (tailor 100% to THIS exact prompt — NEVER generic rote tokens):
- Write "role", "viGuide", "bandStrategy.*", "ideaGuides[].ideaLabel", "ideaGuides[].ideaVi", and "linkingTip" in sharp VIETNAMESE. Do NOT write full sample English sentences or paragraphs!
- MANDATORY "bandStrategy" OBJECT ON EVERY BODY (crystal-clear rules so the learner knows EXACTLY how to earn 8 TR · 9 CC · 8 GRA · 7->8 LR in THIS body):
  * "task8Note": Yêu cầu bắt buộc ở Body này để đạt **TR >= 8.0** (vế câu hỏi bắt buộc chạm tới, độ sâu cơ chế nhân-quả để thoát bẫy Band 6 chung chung/nhảy cóc).
  * "cc9Note": Lưu ý CỰC KỸ để Body này đạt **CC = 9.0** (cách nối ý "tàng hình" bằng chuỗi thông tin Cũ -> Mới, phép quy chiếu danh từ khái quát như "this shift", "such policies", "this reluctance", cách neo ngược vào Thesis ở Body 1, và CHỈ RÕ từ nối máy móc nào phải loại bỏ).
  * "gra8Note": Yêu cầu bắt buộc để Body này đạt **GRA >= 8.0** (những cấu trúc phức hợp tự nhiên cần phối hợp trong đoạn này như mệnh đề nhượng bộ While/Whereas, mệnh đề quan hệ không xác định ", which + V", cụm phân từ, câu điều kiện/giả định, và các bẫy mạo từ/chia động từ hay gặp).
  * "lrNote": Lưu ý CỰC KỸ cho **LR (vững 7.0 -> hướng 8.0)** ở Body này (chọn collocation B1-B2 bản xứ đúng ngữ cảnh & sắc thái học thuật, cách paraphrase khái niệm cốt lõi để KHÔNG lặp từ giữa các câu, tránh dịch từng chữ từ tiếng Việt và tránh nhồi từ C2 lạc văn phong).
- MANDATORY IDEA-BY-IDEA MAPPING ("ideaGuides"):
  For EACH Body, break it into **2–3 concrete, sequential ideas** (Body 1 & 5: 2 ideas; Body 2, 3, 4: 3 ideas covering Claim -> Deep Mechanism -> Concrete Illustration & Thesis Anchor), matching "viGuide":
  * "vocabPhrases": **3–4 natural B1–B2/8.0 native written collocations** specifically tailored to expressing THAT exact idea, with Vietnamese meaning: [{ "phrase": "...", "meaning": "..." }].
  * "grammarPatterns": **1–2 practical Band 8.0 GRA complex grammar structures** fitted specifically for THAT idea, with concise Vietnamese "usage" explaining how to map THAT idea into the frame: [{ "structure": "...", "usage": "..." }].
- "linkingTip": 1 specific CC 9.0 semantic/referential cohesion cue connecting this Body to adjacent bodies.

Return ONLY valid JSON:
{
  ${
    includeMeta
      ? `"essayType": "Exact IELTS Task 2 question type",
  "promptAnalysis": "2–3 sharp VIETNAMESE sentences pinpointing ALL mandatory parts of the question, limiting keywords/traps, and the Band 8.5+ strategic stance.",
  `
      : ''
  }"${isPartial ? 'outlineChunk' : 'outline'}": [
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
            { "phrase": "spark heated debate", "meaning": "gây ra tranh luận sôi nổi" },
            { "phrase": "play a central role in", "meaning": "đóng vai trò trung tâm trong" },
            { "phrase": "long-term social consequences", "meaning": "hệ quả xã hội lâu dài" }
          ],
          "grammarPatterns": [
            { "structure": "While some contend that + [vế A], + [quan điểm chính], which + [hệ quả]", "usage": "Mở đầu bằng câu nhượng bộ kết hợp mệnh đề quan hệ đạt GRA 8.0" }
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
      temperature: 0.5,
      maxOutputTokens:
        params.bodyIndices.length === 5
          ? 7600
          : params.bodyIndices.length >= 3
            ? 4800
            : params.bodyIndices.length === 2
              ? 3600
              : 2400,
      perModelTimeoutMs: options.perModelTimeoutMs,
      totalBudgetMs: options.totalBudgetMs,
      failFastOnTooLong: params.bodyIndices.length >= 5,
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
          essayType: typeof body.essayType === 'string' ? body.essayType : undefined,
          promptAnalysis: typeof body.promptAnalysis === 'string' ? body.promptAnalysis : undefined,
          previousOutlineSummary: Array.isArray(body.previousOutlineSummary)
            ? body.previousOutlineSummary
            : undefined,
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
