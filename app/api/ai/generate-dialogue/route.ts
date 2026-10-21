export const maxDuration = 60;

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

    const prompt = `You are a skilled English dialogue writer. Output valid JSON only. Write long, detailed, natural conversations.

Create a realistic, engaging English conversation between TWO speakers based on the vocabulary words below.
Vocabulary to incorporate: ${words.slice(0, 20).join(', ')}

STRICT REQUIREMENTS:
- The conversation MUST be LONG — at least 600 words total across all turns (this equals roughly 4-5 minutes of natural speech).
- TWO speakers only: "Alex" and "Jamie". They are friends or colleagues having an in-depth discussion.
- The topic should be interesting and relatable: could be about technology, society, travel, science, career, or personal growth.
- Naturally weave in as many vocabulary words as possible without forcing them.
- Each speaker turn must be SUBSTANTIAL (3-6 sentences minimum). No one-liners.
- The conversation must have a clear arc: opening → developing ideas → deeper discussion → conclusion/reflection.
- Make it feel AUTHENTIC — include natural transitions, agreements, disagreements, follow-up questions.
- Write a concise "keyPoints" array (6-8 bullet points) summarizing the main ideas discussed. This will be used to evaluate user summaries.

Output ONLY valid JSON:
{
  "topic": "A short topic title (max 8 words)",
  "dialogue": [
    { "speaker": "Alex", "text": "..." },
    { "speaker": "Jamie", "text": "..." }
  ],
  "keyPoints": [
    "Key point 1 from the conversation",
    "Key point 2 from the conversation"
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

          const firstBrace = responseText.indexOf('{');
          const lastBrace = responseText.lastIndexOf('}');
          if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
            responseText = responseText.substring(firstBrace, lastBrace + 1);
          }

          data = JSON.parse(responseText);
          console.log(`[generate-dialogue] Đã dùng thành công model: ${modelName}`);
          break;
        }
      } catch (e: any) {
        errors.push(`[${modelName}]: ${e.message}`);
        console.warn(`[generate-dialogue] Model ${modelName} failed: ${e.message}`);
      }
    }

    if (!data) {
      throw new Error('All Gemini models failed: ' + errors.join(' | '));
    }

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('[Generate Dialogue Error]', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
