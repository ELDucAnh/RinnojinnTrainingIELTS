import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { GEMINI_FALLBACK_MODELS } from '@/lib/ai-models';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export const maxDuration = 60; // Allow max 60s for Vercel Hobby

export async function POST(req: Request) {
  try {
    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json({ error: 'Chưa cấu hình GEMINI_API_KEY' }, { status: 500 });
    }

    const { words } = await req.json();

    const systemInstruction = "You are an expert IELTS Reading examiner. Output valid JSON only.";

    const prompt = `${systemInstruction}

Write an engaging, logical, and highly coherent academic IELTS reading passage (C1 Advanced proficiency level, approximately 400 words).
The passage MUST have a clear central theme (e.g., Psychology, Sociology, Biology, Technology, or History) and flow naturally from introduction to conclusion.

Vocabulary words to integrate seamlessly and contextually: ${words.join(', ')}
(IMPORTANT: Do not just randomly insert the vocabulary words. They MUST make perfect sense within the logical context of the sentences).

IMPORTANT RULES:
- Generate a captivating academic title.
- Generate a highly coherent academic passage divided into 3-4 paragraphs.
- Output MUST be a valid JSON object.
CRITICAL JSON RULE: DO NOT use literal newlines inside strings. Keep each paragraph as a single continuous string.

Format:
{
  "title": "[Insert an academic title here]",
  "paragraphs": [
    "[Write the full first paragraph here]",
    "[Write the full second paragraph here]",
    "[Write the full third paragraph here]"
  ]
}`;

    const fallbackModels = GEMINI_FALLBACK_MODELS;

    let data: any;
    let errors: string[] = [];

    for (const modelName of fallbackModels) {
      try {
        const model = genAI.getGenerativeModel({ model: modelName });
        const result = await model.generateContent(prompt);
        if (result) {
          let responseText = result.response.text();
          responseText = responseText.replace(/```json/gi, '').replace(/```/g, '').trim();

          const firstCurly = responseText.indexOf('{');
          const firstSquare = responseText.indexOf('[');
          let firstBrace = -1;
          if (firstCurly !== -1 && firstSquare !== -1) firstBrace = Math.min(firstCurly, firstSquare);
          else if (firstCurly !== -1) firstBrace = firstCurly;
          else firstBrace = firstSquare;

          const lastBrace = Math.max(responseText.lastIndexOf('}'), responseText.lastIndexOf(']'));

          if (firstBrace !== -1 && lastBrace !== -1 && lastBrace >= firstBrace) {
            responseText = responseText.substring(firstBrace, lastBrace + 1);
          }

          data = JSON.parse(responseText);

          if (Array.isArray(data)) {
            throw new Error("Returned array instead of full object with title/paragraphs");
          }

          if (data && data.title && data.paragraphs) {
            console.log(`[reading-pipeline/passage] Đã dùng thành công model: ${modelName}`);
            break;
          } else {
            throw new Error("Missing required fields in JSON.");
          }
        }
      } catch (e: any) {
        errors.push(`[${modelName}]: ${e.message}`);
        console.warn(`[reading-pipeline/passage] Model ${modelName} failed: ${e.message}`);
      }
    }

    if (!data) {
      throw new Error('All Gemini models failed. Details: ' + errors.join(' | '));
    }

    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
