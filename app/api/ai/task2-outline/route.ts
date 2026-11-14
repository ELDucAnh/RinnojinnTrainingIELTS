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

    const aiPrompt = `You are an elite IELTS Academic Writing Task 2 strategist coaching a Vietnamese learner whose goal is **TR >= 8.5 and CC >= 8.5** purely from your outline (so they only focus on upgrading Vocabulary LR & Grammar GRA when translating to English).

Task 2 prompt:
"""
${promptText}
"""
${stanceHint ? `Preferred stance/focus: "${stanceHint}"` : ''}

Return ONLY valid JSON with:
1. "essayType": exact IELTS Task 2 question type (e.g. "Opinion — Agree or Disagree", "Discussion + Opinion", etc.).
2. "promptAnalysis": 2–3 sharp VIETNAMESE sentences pinpointing: (a) TẤT CẢ các vế câu hỏi bắt buộc phải trả lời để TR không mất điểm, (b) từ khóa giới hạn / bẫy lạc đề ("completely", "only", "both views"), và (c) lập trường chiến lược Band 8.5+.
3. "outline": EXACTLY 5 objects (bodyIndex 0..4) in sharp, high-band VIETNAMESE engineered for **TR > 8.0 & CC > 8.0**:
   - bodyIndex 0 — "Body 1 — Mở bài (Introduction & Thesis Roadmap)":
     * Dẫn bối cảnh chạm đúng xung đột cốt lõi của đề (KHÔNG sáo rỗng kiểu "Nowadays this topic is debated").
     * Thiết kế Thesis Statement sắc bén, trả lời TRỰC DIỆN mọi vế câu hỏi và hé lộ đúng lộ trình lập luận 3 tầng của Body 2–4.
   - bodyIndex 1 — "Body 2 — Thân bài 1 (Luận điểm trụ cột 1 — Chiều sâu nhân-quả)":
     * 1 luận điểm sắc bén, không hiển nhiên, đủ 4 mắt xích Band 8.5+: Topic Claim -> Cơ chế vận hành sâu (tại sao xảy ra ở tầng tâm lý/kinh tế/chính sách) -> Bối cảnh minh họa thực tế (KHÔNG bịa thống kê ảo) -> Chốt gắn lại Thesis.
   - bodyIndex 2 — "Body 3 — Thân bài 2 (Luận điểm trụ cột 2 — Tầng phân tích tách biệt)":
     * Triển khai góc độ/vế HOÀN TOÀN KHÁC với Body 2 (ZERO trùng ý), đủ 4 mắt xích Claim -> Cơ chế sâu -> Minh họa thực tế -> Chốt luận điểm.
   - bodyIndex 3 — "Body 4 — Thân bài 3 (Đòn quyết định Band 8.5+: Nhượng bộ & Phản biện / Điều kiện biên)":
     * Đưa ra phản biện mạnh nhất của phe đối lập rồi chỉ rõ giới hạn/lật ngược bảo vệ Thesis (hoặc giải pháp/tác động tầng vĩ mô cho đề Problem-Solution / Two-Part) để bài đạt độ chín Band 8.5+.
   - bodyIndex 4 — "Body 5 — Kết bài (Conclusion — Tổng hợp tam giác lập luận)":
     * Tổng hợp súc tích mạch Body 2–4 + tái khẳng định Thesis sắc gọn + 1 hàm ý định hướng tinh tế (TUYỆT ĐỐI không đưa ý mới).

STRICT RULES (concise yet Band 8.5+ insightful):
- Write ALL guidance in VIETNAMESE. Do NOT write sample English sentences/paragraphs!
- "viGuide": 3 razor-sharp steps showing exact logical progression (Topic Claim -> Deep Mechanism -> Concrete Illustration -> Thesis Anchor).
- "keyPoints": 3 concrete, non-cliché Vietnamese mechanism/example/nuance hooks.
- "linkingTip": 1 specific semantic cohesion cue explaining how this body hooks naturally into adjacent bodies (referencing Thesis/preceding concept instead of mechanical "Firstly/Moreover").

JSON shape ("outline" MUST contain ALL 5 items bodyIndex 0..4):
{
  "essayType": "...",
  "promptAnalysis": "...",
  "outline": [
    { "bodyIndex": 0, "role": "Body 1 — Mở bài (Introduction & Thesis Roadmap)", "viGuide": ["Bước 1...", "Bước 2...", "Bước 3..."], "keyPoints": ["Ý 1...", "Ý 2...", "Ý 3..."], "linkingTip": "1 câu liên kết mạch bài..." },
    { "bodyIndex": 1, "role": "Body 2 — Thân bài 1 (Luận điểm trụ cột 1)", "viGuide": ["..."], "keyPoints": ["..."], "linkingTip": "..." },
    { "bodyIndex": 2, "role": "Body 3 — Thân bài 2 (Luận điểm trụ cột 2)", "viGuide": ["..."], "keyPoints": ["..."], "linkingTip": "..." },
    { "bodyIndex": 3, "role": "Body 4 — Thân bài 3 (Nhượng bộ & Phản biện / Chiều sâu 8.5+)", "viGuide": ["..."], "keyPoints": ["..."], "linkingTip": "..." },
    { "bodyIndex": 4, "role": "Body 5 — Kết bài (Tổng hợp & Khẳng định Thesis)", "viGuide": ["..."], "keyPoints": ["..."], "linkingTip": "..." }
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
        maxOutputTokens: 2400,
        perModelTimeoutMs: 20_000,
        totalBudgetMs: 52_000,
      }
    );

    return NextResponse.json(data, { status: 200 });
  } catch (error: any) {
    console.error('[task2-outline] Error:', error);
    const { message, status } = formatGeminiError(error, 'Lỗi tạo dàn ý Task 2: ');
    return NextResponse.json({ error: message }, { status });
  }
}

