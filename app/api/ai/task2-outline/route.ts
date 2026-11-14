export const maxDuration = 60;

import { NextRequest, NextResponse } from 'next/server';
import { formatGeminiError, generateJsonWithFallback } from '@/lib/gemini-helper';
import { normalizeOutline } from '@/lib/writing-practice-types';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const promptText: string = typeof body?.prompt === 'string' ? body.prompt.trim() : '';
    const stanceHint: string = typeof body?.stanceHint === 'string' ? body.stanceHint.trim() : '';

    if (!promptText || promptText.length < 15) {
      return NextResponse.json(
        { error: 'Vui lòng nhập đề bài IELTS Writing Task 2 đầy đủ (tối thiểu 15 ký tự).' },
        { status: 400 }
      );
    }

    const aiPrompt = `You are an expert IELTS Academic Writing Task 2 tutor for Vietnamese learners aiming for Band 7.5+.

Task 2 prompt:
"""
${promptText}
"""
${stanceHint ? `Preferred stance/focus: "${stanceHint}"` : ''}

Return ONLY valid JSON with:
1. "essayType": exact IELTS Task 2 question type in Vietnamese/English (e.g. "Opinion — Agree or Disagree").
2. "promptAnalysis": 1–2 concise VIETNAMESE sentences explaining core task requirements & key trap to avoid.
3. "outline": EXACTLY 5 objects (bodyIndex 0..4) in concise, actionable VIETNAMESE:
   - bodyIndex 0: "Body 1 — Mở bài (Introduction)" (paraphrase đề + Thesis Statement trả lời trực diện câu hỏi).
   - bodyIndex 1: "Body 2 — Thân bài 1" (luận điểm chính 1: Topic sentence -> cơ chế -> ví dụ/hệ quả).
   - bodyIndex 2: "Body 3 — Thân bài 2" (luận điểm chính 2 hoặc vế đối lập/lợi-hại/giải pháp, KHÔNG trùng ý Body 2).
   - bodyIndex 3: "Body 4 — Thân bài 3" (góc nhìn chiều sâu: phản biện counter-argument / hệ quả dài hạn / giải pháp bổ trợ để đạt Band 7.5+).
   - bodyIndex 4: "Body 5 — Kết bài (Conclusion)" (tóm tắt Body 2–4 & khẳng định lại quan điểm, KHÔNG thêm ý mới).

STRICT RULES (keep responses concise & fast):
- Write ALL guidance in VIETNAMESE. Do NOT write sample English sentences/paragraphs!
- Keep each "viGuide" (2–3 short bullet steps) and "keyPoints" (2–3 concise argument/example cues) sharp and to-the-point.
- Keep each "linkingTip" to 1 concise Vietnamese sentence linking with adjacent bodies.

JSON shape ("outline" MUST contain ALL 5 items bodyIndex 0..4):
{
  "essayType": "...",
  "promptAnalysis": "...",
  "outline": [
    { "bodyIndex": 0, "role": "Body 1 — Mở bài (Introduction)", "viGuide": ["Bước 1...", "Bước 2..."], "keyPoints": ["Ý 1...", "Ý 2..."], "linkingTip": "1 câu liên kết..." },
    { "bodyIndex": 1, "role": "Body 2 — Thân bài 1", "viGuide": ["..."], "keyPoints": ["..."], "linkingTip": "..." },
    { "bodyIndex": 2, "role": "Body 3 — Thân bài 2", "viGuide": ["..."], "keyPoints": ["..."], "linkingTip": "..." },
    { "bodyIndex": 3, "role": "Body 4 — Thân bài 3", "viGuide": ["..."], "keyPoints": ["..."], "linkingTip": "..." },
    { "bodyIndex": 4, "role": "Body 5 — Kết bài (Conclusion)", "viGuide": ["..."], "keyPoints": ["..."], "linkingTip": "..." }
  ]
}`;

    const { data } = await generateJsonWithFallback(
      aiPrompt,
      'task2-outline',
      (parsed) => {
        if (!parsed || typeof parsed !== 'object' || !Array.isArray(parsed.outline)) {
          throw new Error('AI trả về định dạng dàn ý Task 2 không hợp lệ');
        }
        return {
          essayType:
            typeof parsed.essayType === 'string' && parsed.essayType.trim()
              ? parsed.essayType.trim()
              : 'IELTS Writing Task 2',
          promptAnalysis:
            typeof parsed.promptAnalysis === 'string' && parsed.promptAnalysis.trim()
              ? parsed.promptAnalysis.trim()
              : 'Trả lời đầy đủ mọi vế của câu hỏi, giữ lập trường nhất quán xuyên suốt 5 đoạn.',
          outline: normalizeOutline(parsed.outline, 'task2'),
        };
      },
      {
        temperature: 0.6,
        maxOutputTokens: 2000,
        perModelTimeoutMs: 18_000,
        totalBudgetMs: 50_000,
      }
    );

    return NextResponse.json(data, { status: 200 });
  } catch (error: any) {
    console.error('[task2-outline] Error:', error);
    const { message, status } = formatGeminiError(error, 'Lỗi tạo dàn ý Task 2: ');
    return NextResponse.json({ error: message }, { status });
  }
}

