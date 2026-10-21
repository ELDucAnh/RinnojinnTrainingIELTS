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

    const prompt = `You are an expert IELTS Listening examiner. Output valid JSON only.

Create a challenging IELTS Listening Section 4 practice exercise based on the following vocabulary words:
${words.join(', ')}

IMPORTANT RULES:
- Create exactly ONE academic lecture/presentation and EXACTLY 10 multiple-choice questions.
- The lecture MUST be a complex academic monologue given by a SINGLE speaker (e.g., a university professor or expert).
- The lecture MUST be long (around 200-300 words).
- The lecture MUST naturally incorporate as many of the provided vocabulary words as possible.
- The 10 questions MUST test synthesis of information, inference, and identifying main ideas (like IELTS Listening Section 4). They must NOT be simple word-matching questions.
- Each question must have exactly 4 options.
- The output MUST be a valid JSON object.

Format:
{
  "dialogue": [
    { "speaker": "Professor", "text": "The entire academic lecture text here..." }
  ],
  "questions": [
    {
      "question": "What is the speakers' main conclusion about X?",
      "options": ["A", "B", "C", "D"],
      "correctAnswer": 0
    }
  ]
}`;

    const fallbackModels = GEMINI_FALLBACK_MODELS;
    let listeningPractice: any;
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

          listeningPractice = JSON.parse(responseText);
          console.log(`[generate-listening] Đã dùng thành công model: ${modelName}`);
          break;
        }
      } catch (e: any) {
        errors.push(`[${modelName}]: ${e.message}`);
        console.warn(`[generate-listening] Model ${modelName} failed: ${e.message}`);
      }
    }

    if (!listeningPractice) {
      throw new Error('All Gemini models failed. Details: ' + errors.join(' | '));
    }

    return NextResponse.json(listeningPractice);

  } catch (error: any) {
    console.error('Error generating listening:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
