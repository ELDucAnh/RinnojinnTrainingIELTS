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

STRICT RULES (deeply structured, Idea-by-Idea mapping — NEVER generic rote tokens):
- Write "role", "viGuide", "ideaGuides[].ideaLabel", "ideaGuides[].ideaVi", and "linkingTip" in VIETNAMESE. Do NOT write full sample English sentences or paragraphs!
- IMPORTANT — IDEA-BY-IDEA MAPPING ("ideaGuides"):
  For EVERY Body (0..4), break the Body down into **2–4 concrete, sequential ideas** ("ideaGuides", matching "viGuide"):
  * Body 1 (Intro) & Body 5 (Conclusion): 2–3 ideas each; Body 2, 3, 4 (Thân bài): 3–4 ideas each (Topic Claim -> Deep Mechanism -> Concrete Illustration -> Thesis Anchor).
  * For EACH individual idea inside "ideaGuides":
    - "vocabPhrases": list **3–4 natural B1–B2 native written collocations** tailored specifically to expressing THAT idea (total ~9–14 useful collocations per Body, NEVER only 1–2 token phrases!). Prioritize natural written collocations over rare C1–C2 words unless B1–B2 lacks an accurate substitute: [{ "phrase": "...", "meaning": "..." }].
    - "grammarPatterns": list **1–2 practical Band 7.0 grammar structures** fitted specifically for connecting/expressing THAT idea (e.g. "While/Although S + V, S + V", ", which + leads to / means that...", "Instead of + V-ing, S + should...", conditional), with a crisp Vietnamese "usage" note explaining HOW THAT idea uses that grammar pattern: [{ "structure": "...", "usage": "..." }].
- "viGuide": concise array mirroring the sequential "ideaGuides" steps.
- "linkingTip": 1 specific semantic cohesion cue explaining how this body hooks naturally into adjacent bodies (referencing Thesis/preceding concept instead of mechanical "Firstly/Moreover").

JSON shape ("outline" MUST contain ALL 5 items bodyIndex 0..4):
{
  "essayType": "...",
  "promptAnalysis": "...",
  "outline": [
    {
      "bodyIndex": 0,
      "role": "Body 1 — Mở bài (Introduction & Thesis Roadmap)",
      "viGuide": ["Ý 1...", "Ý 2..."],
      "ideaGuides": [
        {
          "ideaLabel": "Ý 1 — Dẫn bối cảnh xung đột của đề",
          "ideaVi": "Paraphrase ngắn gọn bối cảnh hai luồng quan điểm đang tranh luận...",
          "vocabPhrases": [
            { "phrase": "spark heated debate", "meaning": "gây ra tranh luận sôi nổi" },
            { "phrase": "growing concern over", "meaning": "mối lo ngại ngày càng tăng về" },
            { "phrase": "play a central role in", "meaning": "đóng vai trò trung tâm trong" }
          ],
          "grammarPatterns": [
            { "structure": "While some contend that + [quan điểm A], others argue that + [quan điểm B]", "usage": "Mở bài nhượng bộ nêu cả 2 vế đề bài trong 1 câu mượt" }
          ]
        }
      ],
      "linkingTip": "1 câu liên kết mạch bài..."
    },
    { "bodyIndex": 1, "role": "Body 2 — Thân bài 1 (Luận điểm trụ cột 1)", "viGuide": ["..."], "ideaGuides": [{ "ideaLabel": "...", "ideaVi": "...", "vocabPhrases": [...], "grammarPatterns": [...] }], "linkingTip": "..." },
    { "bodyIndex": 2, "role": "Body 3 — Thân bài 2 (Luận điểm trụ cột 2)", "viGuide": ["..."], "ideaGuides": [{ "ideaLabel": "...", "ideaVi": "...", "vocabPhrases": [...], "grammarPatterns": [...] }], "linkingTip": "..." },
    { "bodyIndex": 3, "role": "Body 4 — Thân bài 3 (Nhượng bộ & Phản biện / Chiều sâu 8.5+)", "viGuide": ["..."], "ideaGuides": [{ "ideaLabel": "...", "ideaVi": "...", "vocabPhrases": [...], "grammarPatterns": [...] }], "linkingTip": "..." },
    { "bodyIndex": 4, "role": "Body 5 — Kết bài (Tổng hợp & Khẳng định Thesis)", "viGuide": ["..."], "ideaGuides": [{ "ideaLabel": "...", "ideaVi": "...", "vocabPhrases": [...], "grammarPatterns": [...] }], "linkingTip": "..." }
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
        temperature: 0.55,
        maxOutputTokens: 4800,
        perModelTimeoutMs: 25_000,
        totalBudgetMs: 54_000,
      }
    );

    return NextResponse.json(data, { status: 200 });
  } catch (error: any) {
    console.error('[task2-outline] Error:', error);
    const { message, status } = formatGeminiError(error, 'Lỗi tạo dàn ý Task 2: ');
    return NextResponse.json({ error: message }, { status });
  }
}

