// lib/gemini-helper.ts
import { GoogleGenerativeAI } from '@google/generative-ai';
import { GEMINI_FALLBACK_MODELS } from '@/lib/ai-models';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export function extractJsonString(rawText: string): string {
  let text = rawText.replace(/```json/gi, '').replace(/```/g, '').trim();
  const firstBrace = text.indexOf('{');
  const lastBrace = text.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    text = text.substring(firstBrace, lastBrace + 1);
  }
  return text;
}

export async function generateJsonWithFallback<T = any>(
  prompt: string,
  tag: string,
  validate?: (parsed: any) => T
): Promise<{ data: T; modelUsed: string }> {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error('Chưa cấu hình GEMINI_API_KEY trên server.');
  }

  let lastError: any;
  const errors: string[] = [];

  for (const modelName of GEMINI_FALLBACK_MODELS) {
    try {
      const model = genAI.getGenerativeModel({ model: modelName });
      const result = await model.generateContent(prompt);
      if (!result) continue;

      const rawText = result.response.text();
      const jsonStr = extractJsonString(rawText);
      const parsed = JSON.parse(jsonStr);
      const validated = validate ? validate(parsed) : (parsed as T);

      console.log(`[${tag}] Thành công với model: ${modelName}`);
      return { data: validated, modelUsed: modelName };
    } catch (e: any) {
      lastError = e;
      const msg = e?.message || String(e);
      errors.push(`[${modelName}]: ${msg}`);
      console.warn(`[${tag}] Model ${modelName} lỗi hoặc quá tải: ${msg}`);
    }
  }

  throw lastError || new Error('Tất cả mô hình đều đang bận: ' + errors.join(' | '));
}

export function formatGeminiError(error: any, fallbackPrefix = 'Lỗi AI: '): { message: string; status: number } {
  const msg = error?.message || String(error);
  if (msg.includes('Chưa cấu hình GEMINI_API_KEY')) {
    return { message: msg, status: 500 };
  }
  const isQuotaError =
    msg.includes('429') ||
    msg.includes('Quota exceeded') ||
    msg.includes('Too Many Requests') ||
    msg.includes('RESOURCE_EXHAUSTED');
  if (isQuotaError) {
    return {
      message: 'Hệ thống AI đang tạm thời đạt giới hạn lượt gọi (Rate Limit / Quota). Vui lòng đợi khoảng 15–30 giây rồi thử lại.',
      status: 429,
    };
  }
  return { message: `${fallbackPrefix}${msg}`, status: 500 };
}

