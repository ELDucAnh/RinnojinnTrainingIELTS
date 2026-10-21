export const maxDuration = 60;

import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

import { GEMINI_FALLBACK_MODELS } from '@/lib/ai-models';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export async function POST(req: NextRequest) {
  try {
    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json({ error: 'Chưa cấu hình GEMINI_API_KEY trong hệ thống' }, { status: 500 });
    }

    const { words } = await req.json();

    if (!words || !Array.isArray(words) || words.length === 0) {
      return NextResponse.json({ error: 'Bộ từ vựng cần có ít nhất 1 từ để tạo bài luyện tập' }, { status: 400 });
    }

    // Lấy tối đa 8 từ ngẫu nhiên để prompt gọn, AI sinh nhanh tránh bị timeout 504
    const selectedWords = words.length > 8
      ? [...words].sort(() => 0.5 - Math.random()).slice(0, 8)
      : words;

    const prompt = `You are an expert IELTS Writing Task 2 coach. Output valid JSON only.

Generate exactly 6 translation exercises based on these vocabulary words: ${selectedWords.join(', ')}

STRICT RULES:
- Pick exactly 2 different IELTS Task 2 essay topics (3 sentences per topic, total 6 sentences).
- For Topic 1 (indices 0-2):
  1. Introduction / Paraphrase
  2. Body 1 (main supporting argument)
  3. Conclusion / Concession
- For Topic 2 (indices 3-5):
  1. Introduction / Context
  2. Body Paragraph (complex argument)
  3. Concession or Counter-argument
- The Vietnamese sentence must be a natural, complex academic sentence related to that argument.
- The English translation must be genuinely IELTS Writing Task 2 quality (band 7+): complex grammar, good collocations, cohesion.
- Incorporate the target vocabulary words naturally.

Output ONLY this JSON structure:
{
  "conversation": [
    {
      "type": "translate_typing",
      "task2Prompt": "Full IELTS Task 2 question (2-3 sentences, as it would appear in the exam)",
      "argument": "Brief label, e.g. 'Mở bài: Đặt vấn đề' or 'Thân bài 1: Luận điểm chính' or 'Phản biện & Kết luận'",
      "vietnamese": "Câu tiếng Việt học thuật phức tạp cần dịch ra tiếng Anh.",
      "expectedEnglish": "The expected band 7+ English translation using the vocabulary."
    }
  ]
}`;

    const fallbackModels = GEMINI_FALLBACK_MODELS;
    let parsedData: any;
    let errors: string[] = [];

    for (const modelName of fallbackModels) {
      try {
        const model = genAI.getGenerativeModel({
          model: modelName,
          generationConfig: {
            responseMimeType: 'application/json',
            temperature: 0.7,
          }
        });
        const result = await model.generateContent(prompt);
        if (result) {
          let responseText = result.response.text();
          responseText = responseText.replace(/```json/gi, '').replace(/```/g, '').trim();

          const firstBrace = responseText.indexOf('{');
          const lastBrace = responseText.lastIndexOf('}');
          if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
            responseText = responseText.substring(firstBrace, lastBrace + 1);
          }

          parsedData = JSON.parse(responseText);
          console.log(`[generate-conversation] Đã dùng thành công model: ${modelName}`);
          break;
        }
      } catch (e: any) {
        errors.push(`[${modelName}]: ${e.message}`);
        console.warn(`[generate-conversation] Model ${modelName} failed: ${e.message}`);
      }
    }

    if (!parsedData) {
      throw new Error('Các mô hình AI đang tạm thời bận hoặc vượt giới hạn: ' + errors.join(' | '));
    }

    const conversation = Array.isArray(parsedData)
      ? parsedData
      : (parsedData.conversation || parsedData.items || Object.values(parsedData)[0]);

    if (!Array.isArray(conversation) || conversation.length === 0) {
      throw new Error('AI phản hồi dữ liệu rỗng. Vui lòng thử lại.');
    }

    return NextResponse.json({ conversation });

  } catch (error: any) {
    console.error('Error generating writing practice:', error);
    const msg = error?.message || String(error);
    const isQuotaError = msg.includes('429') || msg.includes('Quota exceeded') || msg.includes('Too Many Requests');
    const friendlyMsg = isQuotaError
      ? 'Hệ thống AI đang tạm thời đạt giới hạn lượt gọi (Rate Limit). Vui lòng đợi khoảng 15-30 giây rồi bấm thử lại.'
      : msg;
    return NextResponse.json({ error: friendlyMsg }, { status: 500 });
  }
}
