import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { GEMINI_FALLBACK_MODELS } from '@/lib/ai-models';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json({ error: 'Chưa cấu hình GEMINI_API_KEY' }, { status: 500 });
    }

    const { paragraphs } = await req.json();

    const prompt = `You are an expert IELTS Reading examiner. Output valid JSON only.

Based on the following highly academic reading passage:

Passage:
${paragraphs.join('\n\n')}

IMPORTANT RULES:
- Create EXACTLY 5 questions based on the passage provided above.
- ALL 5 questions MUST be of the type "True / False / Not Given".
- ALL 5 questions MUST strictly follow the JSON format below.

CRITICAL JSON RULE: 
- DO NOT output literal newline characters inside any string value! 
- Every string (especially explanations) MUST be a single continuous line. 

Question Types & Format Instructions:
1. True/False/Not Given (TFNG) Questions:
   - "question": "Do the following statement agree with the claims of the writer? Statement: [Insert abstract statement here]"
   - "options": EXACTLY 3 options: ["True", "False", "Not Given"]

- The "correctAnswer" is the 0-indexed integer of the correct option in the "options" array (0 for True, 1 for False, 2 for Not Given).
- Each question MUST include an "explanation" field. IMPORTANT: Write a short, concise explanation (1-2 sentences) on why it is True, False, or Not Given.
- The output MUST be a valid JSON object.

Format:
{
  "questions": [
    {
      "question": "Do the following statement agree with the claims of the writer? Statement: X is Y.",
      "options": ["True", "False", "Not Given"],
      "correctAnswer": 0,
      "explanation": "[Write a short explanation here]"
    }
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

          // Normalize data to ensure questions array exists
          if (Array.isArray(data)) {
            data = { questions: data };
          } else if (data && typeof data === 'object' && !Array.isArray(data.questions)) {
            const arrayKey = Object.keys(data).find(k => Array.isArray(data[k]));
            if (arrayKey) {
              data.questions = data[arrayKey];
            } else {
              throw new Error("AI returned JSON without an array of questions.");
            }
          }

          console.log(`[questions-phase1] Đã dùng thành công model: ${modelName}`);
          break;
        }
      } catch (e: any) {
        errors.push(`[${modelName}]: ${e.message}`);
        console.warn(`[questions-phase1] Model ${modelName} failed: ${e.message}`);
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
