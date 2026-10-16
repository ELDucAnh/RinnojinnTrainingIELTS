import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json({ error: 'Chưa cấu hình GEMINI_API_KEY' }, { status: 500 });
    }

    const { text } = await req.json();
    if (!text || text.trim().length < 10) {
      return NextResponse.json({ error: 'Văn bản quá ngắn' }, { status: 400 });
    }

    const prompt = `You are an expert English teacher. Output valid JSON only.

Bạn là một chuyên gia ngôn ngữ tiếng Anh. Hãy rà soát toàn bộ đoạn văn bản tiếng Anh dưới đây và trích xuất TOÀN BỘ những từ vựng khó, học thuật, idioms, collocations, phrasal verbs (trình độ B2, C1, C2). 
KHÔNG GIỚI HẠN số lượng từ, hãy quét thật kỹ và tìm ra nhiều từ khó nhất có thể.
Đối với mỗi từ, hãy tạo định dạng thẻ ghi nhớ (flashcard) vô cùng ngắn gọn:
- "term": từ vựng tiếng Anh nguyên bản.
- "definition": CHỈ trả về nghĩa tiếng Việt ngắn gọn, súc tích (1-2 từ). TUYỆT ĐỐI KHÔNG giải thích dài dòng, KHÔNG ghi chú từ loại, KHÔNG phiên âm, KHÔNG ví dụ. Ví dụ: "hoàn thành", "cung cấp", "chấp nhận".

Output MUST be a valid JSON object with a single key "cards" containing the array of word objects.

Format:
{
  "cards": [
    { "term": "word1", "definition": "nghĩa 1" },
    { "term": "word2", "definition": "nghĩa 2" }
  ]
}

Văn bản:
"""
${text}
"""`;

    const fallbackModels = [
      'gemini-flash-latest',
      'gemini-3.6-flash',
      'gemini-3.5-flash',
      'gemini-pro-latest'
    ];
    let parsedData: any;
    let errors: string[] = [];

    for (const modelName of fallbackModels) {
      try {
        const model = genAI.getGenerativeModel({ model: modelName });
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
          console.log(`[generate-deck] Đã dùng thành công model: ${modelName}`);
          break;
        }
      } catch (e: any) {
        errors.push(`[${modelName}]: ${e.message}`);
        console.warn(`[generate-deck] Model ${modelName} failed: ${e.message}`);
      }
    }

    if (!parsedData) {
      throw new Error('All Gemini models failed. Details: ' + errors.join(' | '));
    }

    const cards = Array.isArray(parsedData) ? parsedData : (parsedData.cards || parsedData.items || Object.values(parsedData)[0]);

    return NextResponse.json(cards);
  } catch (error: any) {
    console.error('[AI Generate Deck Error]', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
