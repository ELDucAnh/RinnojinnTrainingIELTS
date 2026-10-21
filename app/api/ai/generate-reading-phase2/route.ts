import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { GEMINI_FALLBACK_MODELS } from '@/lib/ai-models';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export const maxDuration = 60; // Allows up to 60s for Vercel Hobby

export async function POST(req: Request) {
  try {
    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json({ error: 'Chưa cấu hình GEMINI_API_KEY' }, { status: 500 });
    }

    const { words, paragraphs } = await req.json();
    if (!words || !Array.isArray(words) || !paragraphs || !Array.isArray(paragraphs)) {
      return NextResponse.json({ error: 'Missing words or paragraphs' }, { status: 400 });
    }

    const prompt = `You are an expert IELTS Reading examiner. Output valid JSON only.

Based on the following highly academic reading passage and vocabulary words:
Vocabulary: ${words.join(', ')}

Passage:
${paragraphs.join('\n\n')}

IMPORTANT RULES:
- Create EXACTLY 5 questions based on the passage provided above.
- The questions MUST be divided into 2 types (3 TFNG, 2 Matching Information).
- ALL 5 questions MUST strictly follow a generic multiple-choice JSON format.

CRITICAL JSON RULE: 
- DO NOT output literal newline characters inside any string value! 
- Every string (especially explanations) MUST be a single continuous line. 
- Do NOT press Enter/Return inside any string.

Question Types & Format Instructions:
1. 3 True/False/Not Given (TFNG) Questions:
   - "question": "Do the following statement agree with the claims of the writer? Statement: [Insert abstract statement]"
   - "options": EXACTLY 3 options: ["True", "False", "Not Given"]
2. 2 Matching Information Questions:
   - "question": "Which paragraph contains the following information: [Insert specific abstract information]?"
   - "options": Provide 4 different paragraph references, e.g., ["Paragraph 1", "Paragraph 2", "Paragraph 4", "Paragraph 6"].

- Each question must have EXACTLY the options specified above.
- The "correctAnswer" is the 0-indexed integer of the correct option in the "options" array.
- Each question MUST include an "explanation" field. IMPORTANT: Keep the explanation EXTREMELY short and concise (max 1 sentence) to save tokens.
- The output MUST be a valid JSON object.

Format:
{
  "questions": [
    {
      "question": "Do the following statement agree with the claims of the writer? Statement: The evolution of X is fast.",
      "options": ["True", "False", "Not Given"],
      "correctAnswer": 0,
      "explanation": "..."
    }
    // EXACTLY 5 QUESTIONS TOTAL
  ]
}`;

    const fallbackModels = GEMINI_FALLBACK_MODELS;
    let phase2Data: any;
    let errors: string[] = [];

    for (const modelName of fallbackModels) {
      try {
        const model = genAI.getGenerativeModel({ model: modelName });
        const result = await model.generateContent(prompt);
        if (result) {
          let responseText = result.response.text();
          responseText = responseText.replace(/```json/gi, '').replace(/```/g, '').trim();

          // Extract JSON block to handle any extra text Gemini may output
          const firstBrace = responseText.indexOf('{');
          const lastBrace = responseText.lastIndexOf('}');
          if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
            responseText = responseText.substring(firstBrace, lastBrace + 1);
          }

          phase2Data = JSON.parse(responseText);
          console.log(`[generate-reading-phase2] Đã dùng thành công model: ${modelName}`);
          break;
        }
      } catch (e: any) {
        errors.push(`[${modelName}]: ${e.message}`);
        console.warn(`[generate-reading-phase2] Model ${modelName} failed: ${e.message}`);
      }
    }

    if (!phase2Data) {
      throw new Error('All Gemini models failed. Details: ' + errors.join(' | '));
    }

    return NextResponse.json(phase2Data);

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
