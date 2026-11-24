import { NextResponse } from 'next/server';
import {
  GEMINI_FREE_TIER_FAST_MODELS,
  GEMINI_FREE_TIER_GRADING_MODELS,
  GEMINI_OPEN_WEIGHTS_FREE_FALLBACKS,
  isBlockedOrPaidOnlyGeminiModel,
} from '@/lib/ai-models';

export async function GET() {
  try {
    const apiKey = (process.env.GEMINI_API_KEY || '').trim();
    if (!apiKey) {
      return NextResponse.json({
        configuredFastChain: GEMINI_FREE_TIER_FAST_MODELS,
        configuredGradingChain: GEMINI_FREE_TIER_GRADING_MODELS,
        openWeightsFallbacks: GEMINI_OPEN_WEIGHTS_FREE_FALLBACKS,
        availableModels: [],
        note: 'Chưa cấu hình GEMINI_API_KEY',
      });
    }

    const response = await fetch(
      'https://generativelanguage.googleapis.com/v1beta/models?pageSize=100',
      {
        headers: {
          'x-goog-api-key': apiKey,
        },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json(
        { error: 'Failed to fetch Gemini models', details: errorText },
        { status: response.status }
      );
    }

    const data = await response.json();
    const allModels: string[] = (data?.models || [])
      .filter((m: any) =>
        Array.isArray(m?.supportedGenerationMethods) &&
        m.supportedGenerationMethods.includes('generateContent')
      )
      .map((m: any) => String(m.name || '').replace(/^models\//, ''));

    const freeTierCandidates = allModels.filter((id) => !isBlockedOrPaidOnlyGeminiModel(id));

    return NextResponse.json({
      configuredFastChain: GEMINI_FREE_TIER_FAST_MODELS,
      configuredGradingChain: GEMINI_FREE_TIER_GRADING_MODELS,
      openWeightsFallbacks: GEMINI_OPEN_WEIGHTS_FREE_FALLBACKS,
      freeTierCandidates,
      allGenerateContentModels: allModels,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
