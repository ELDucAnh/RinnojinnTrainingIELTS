export const maxDuration = 30;

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

    const aiPrompt = `
You are an expert IELTS Academic Writing Task 2 tutor and coach for Vietnamese learners aiming for Band 7.5+.

The user has provided this IELTS Writing Task 2 prompt:
"""
${promptText}
"""
${stanceHint ? `User's preferred stance / focus note: "${stanceHint}"` : ''}

Your job:
1. Identify the exact IELTS Task 2 question type ("essayType"), e.g. "Opinion (Agree or Disagree)", "Discussion (Discuss Both Views)", "Advantages & Disadvantages", "Problem & Solution", "Two-Part Question", or "Mixed".
2. Write a short, sharp "promptAnalysis" in VIETNAMESE (2–3 sentences): explain the core question requirements, key terms that must be addressed, and any common off-topic trap to avoid.
3. Build a logical, non-repetitive **5-BODY VIETNAMESE OUTLINE** ("outline" array with EXACTLY 5 objects, bodyIndex 0..4) tailored specifically to this prompt so the learner can write and translate each body into Band 7.5+ English themselves:
   - bodyIndex 0 (Body 1 — Introduction): Hướng dẫn paraphrase ngữ cảnh đề bài + viết Thesis Statement trả lời trực diện câu hỏi (nêu rõ bố cục các luận điểm sẽ triển khai ở Body 2–4).
   - bodyIndex 1 (Body 2 — Body Paragraph 1): Luận điểm chính 1 (Topic sentence -> Giải thích cơ chế/nguyên nhân -> Ví dụ cụ thể/hệ quả).
   - bodyIndex 2 (Body 3 — Body Paragraph 2): Luận điểm chính 2 (hoặc vế đối lập / mặt lợi-hại / giải pháp tùy dạng đề) — đảm bảo KHÔNG trùng ý với Body 2.
   - bodyIndex 3 (Body 4 — Body Paragraph 3): Luận điểm thứ 3 mang tính chiều sâu (tùy dạng đề: phản biện & bác bỏ counter-argument, hệ quả dài hạn, giải pháp bổ trợ, hoặc góc nhìn thứ ba sắc sảo để bài đạt Band 7.5+ vững chắc).
   - bodyIndex 4 (Body 5 — Conclusion): Tóm tắt súc tích các ý chính đã phân tích ở Body 2–4 và khẳng định lại quan điểm/câu trả lời (TUYỆT ĐỐI không đưa ý tưởng mới).

CRITICAL RULES:
- Write ALL fields ("essayType", "promptAnalysis", "role", "viGuide", "keyPoints", "linkingTip") in natural, detailed **VIETNAMESE**.
- DO NOT give pre-written English sentences or sample English paragraphs! Only provide Vietnamese ideas, reasoning steps, example cues, and conceptual keywords so the learner practices writing and translating to English themselves.
- Each body's "viGuide" must have 2–4 clear, actionable Vietnamese steps.
- Each body's "keyPoints" must have 2–4 specific arguments/example ideas in Vietnamese.
- Each body's "linkingTip" must explain in Vietnamese how it connects to the previous/next bodies so all 5 bodies form one cohesive essay.

Return ONLY valid JSON (no markdown, no backticks):
{
  "essayType": "Tên dạng bài (VD: Opinion — Agree or Disagree)",
  "promptAnalysis": "Phân tích ngắn gọn yêu cầu đề bài và lưu ý tránh lạc đề bằng tiếng Việt...",
  "outline": [
    {
      "bodyIndex": 0,
      "role": "Body 1 — Mở bài (Introduction)",
      "viGuide": ["...", "..."],
      "keyPoints": ["...", "..."],
      "linkingTip": "..."
    },
    {
      "bodyIndex": 1,
      "role": "Body 2 — Thân bài 1 (...)",
      "viGuide": ["...", "..."],
      "keyPoints": ["...", "..."],
      "linkingTip": "..."
    },
    {
      "bodyIndex": 2,
      "role": "Body 3 — Thân bài 2 (...)",
      "viGuide": ["...", "..."],
      "keyPoints": ["...", "..."],
      "linkingTip": "..."
    },
    {
      "bodyIndex": 3,
      "role": "Body 4 — Thân bài 3 (...)",
      "viGuide": ["...", "..."],
      "keyPoints": ["...", "..."],
      "linkingTip": "..."
    },
    {
      "bodyIndex": 4,
      "role": "Body 5 — Kết bài (Conclusion)",
      "viGuide": ["...", "..."],
      "keyPoints": ["...", "..."],
      "linkingTip": "..."
    }
  ]
}
`;

    const { data } = await generateJsonWithFallback(aiPrompt, 'task2-outline', (parsed) => {
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
    });

    return NextResponse.json(data, { status: 200 });
  } catch (error: any) {
    console.error('[task2-outline] Error:', error);
    const { message, status } = formatGeminiError(error, 'Lỗi tạo dàn ý Task 2: ');
    return NextResponse.json({ error: message }, { status });
  }
}

