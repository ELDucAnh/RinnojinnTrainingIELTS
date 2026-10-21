export const maxDuration = 60; // Allow max 60s for Vercel Hobby

import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { GEMINI_FALLBACK_MODELS } from '@/lib/ai-models';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export async function POST(req: NextRequest) {
  try {
    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json({ error: 'Chưa cấu hình GEMINI_API_KEY' }, { status: 500 });
    }

    const { words } = await req.json();

    if (!words || words.length === 0) {
      return NextResponse.json({ error: 'Missing words' }, { status: 400 });
    }

    const prompt = `You are an expert IELTS Reading examiner. Output valid JSON only.

Create an EXTREMELY complex, high-difficulty IELTS Reading Passage 3 practice exercise based on the following vocabulary words:
${words.join(', ')}

IMPORTANT RULES:
- The reading passage MUST be at a C2 proficiency level, highly academic, abstract, and extremely complex.
- The passage MUST be short but dense (around 300-400 words) and contain exactly 3 or 4 paragraphs.
- The passage MUST naturally incorporate as many of the provided vocabulary words as possible.
- Create EXACTLY 5 questions, divided into 2 types (3 MC, 2 Matching Heading).
- ALL 5 questions MUST strictly follow a generic multiple-choice JSON format.

CRITICAL JSON RULE: 
- DO NOT output literal newline characters inside any string value! 
- Every string (especially paragraph text and explanations) MUST be a single continuous line. 
- If a paragraph is long, keep it as ONE unbroken string. Do NOT press Enter/Return inside the string.

Question Types & Format Instructions:
1. 3 Multiple Choice (MC) Questions: Standard 4 options (A, B, C, D) testing deep inference.
2. 2 Matching Heading Questions:
   - "question": "Which heading best fits Paragraph [X]?"
   - "options": Provide 4 different tricky academic headings.

- Each question must have EXACTLY the options specified above.
- The "correctAnswer" is the 0-indexed integer of the correct option in the "options" array.
- Each question MUST include an "explanation" field. IMPORTANT: Keep the explanation EXTREMELY short and concise (max 1 sentence) to save tokens.
- The output MUST be a valid JSON object.

Format:
{
  "title": "A highly academic title",
  "paragraphs": [
    "Paragraph 1 text...",
    "Paragraph 2 text..."
  ],
  "questions": [
    {
      "question": "Which heading best fits Paragraph 2?",
      "options": ["The evolution of X", "The sudden decline of Y", "A misunderstanding of Z", "The future of W"],
      "correctAnswer": 2,
      "explanation": "..."
    }
    // EXACTLY 5 QUESTIONS TOTAL
  ]
}`;

    const fallbackModels = GEMINI_FALLBACK_MODELS;
    let readingPractice: any;
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

          readingPractice = JSON.parse(responseText);
          console.log(`[generate-reading] Đã dùng thành công model: ${modelName}`);
          break;
        }
      } catch (e: any) {
        errors.push(`[${modelName}]: ${e.message}`);
        console.warn(`[generate-reading] Model ${modelName} failed: ${e.message}`);
      }
    }

    if (!readingPractice) {
      throw new Error('All Gemini models failed. Details: ' + errors.join(' | '));
    }

    return NextResponse.json(readingPractice);

  } catch (error: any) {
    console.error('Error generating reading:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
