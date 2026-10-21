export const maxDuration = 30;

import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { GEMINI_FALLBACK_MODELS } from '@/lib/ai-models';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export async function POST(req: NextRequest) {
  try {
    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json({ error: 'Chưa cấu hình GEMINI_API_KEY' }, { status: 500 });
    }

    const { userTranslation, expectedEnglish, vietnameseSentence } = await req.json();

    if (!userTranslation || !expectedEnglish) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const prompt = `You are an expert English teacher. Output valid JSON only.

You are an expert English teacher analyzing a student's Vietnamese-to-English translation.

Vietnamese sentence: "${vietnameseSentence}"
Expected English: "${expectedEnglish}"
Student's translation: "${userTranslation}"

Analyze the student's translation and return a JSON object with:
1. "score": integer 0–100 rating the translation quality
2. "grammarErrors": array of objects — list ALL grammar errors found, do NOT limit the count. Each object has:
   - "original": the incorrect phrase/word from student's text
   - "correction": the corrected version
   - "explanation": brief explanation in Vietnamese (1 sentence)
3. "vocabularyTips": array of objects — list ALL words/phrases that can be improved with a more natural or academic alternative, do NOT limit the count. Each object has:
   - "studentWord": word/phrase student used
   - "betterAlternative": a more natural/academic alternative
   - "reason": why it's better (in Vietnamese, 1 sentence)
4. "structureFeedback": string — overall feedback on sentence structure in Vietnamese (2-3 sentences)
5. "correctedSentence": the fully corrected version of the student's translation

IMPORTANT:
- Keep all feedback in Vietnamese for easy understanding.
- Be encouraging but precise.
- If the translation is good, say so in structureFeedback.
- Only flag real grammar errors, not stylistic choices.
- For vocabularyTips: cover every word/phrase in the student's sentence that has a meaningfully better academic/natural alternative used in the correctedSentence.
- Output ONLY valid JSON, no markdown.

Format:
{
  "score": 75,
  "grammarErrors": [
    { "original": "...", "correction": "...", "explanation": "..." }
  ],
  "vocabularyTips": [
    { "studentWord": "...", "betterAlternative": "...", "reason": "..." }
  ],
  "structureFeedback": "...",
  "correctedSentence": "..."
}`;

    const fallbackModels = GEMINI_FALLBACK_MODELS;
    let analysis: any;
    let errors: string[] = [];

    for (const modelName of fallbackModels) {
      try {
        const model = genAI.getGenerativeModel({
          model: modelName,
          generationConfig: {
            responseMimeType: 'application/json',
            temperature: 0.3,
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

          analysis = JSON.parse(responseText);
          console.log(`[analyze-translation] Đã dùng thành công model: ${modelName}`);
          break;
        }
      } catch (e: any) {
        errors.push(`[${modelName}]: ${e.message}`);
        console.warn(`[analyze-translation] Model ${modelName} failed: ${e.message}`);
      }
    }

    if (!analysis) {
      throw new Error('All Gemini models failed: ' + errors.join(' | '));
    }

    return NextResponse.json(analysis);
  } catch (error: any) {
    console.error('[Analyze Translation Error]', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
