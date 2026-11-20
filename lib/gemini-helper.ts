// lib/gemini-helper.ts
import { GoogleGenerativeAI } from '@google/generative-ai';
import { GEMINI_FALLBACK_MODELS } from '@/lib/ai-models';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export interface GeminiGenerateOptions {
  temperature?: number;
  maxOutputTokens?: number;
  perModelTimeoutMs?: number;
  totalBudgetMs?: number;
  /**
   * When true, if the primary model truncates output (MAX_TOKENS / incomplete JSON),
   * throw GeminiResponseTooLongError immediately so the caller can split into smaller chunks
   * instead of burning the entire Vercel budget retrying other models with the same oversized prompt.
   */
  failFastOnTooLong?: boolean;
}

export class GeminiResponseTooLongError extends Error {
  public readonly code = 'RESPONSE_TOO_LONG';
  constructor(message: string) {
    super(message);
    this.name = 'GeminiResponseTooLongError';
  }
}

export function extractJsonString(rawText: string): string {
  let text = rawText.trim();
  if (!text.startsWith('{') && !text.startsWith('[')) {
    text = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
  }
  const firstBrace = text.indexOf('{');
  const lastBrace = text.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    return text.substring(firstBrace, lastBrace + 1);
  }
  return text;
}

/**
 * Escapes raw unescaped newlines/tabs inside JSON string literals and strips trailing commas.
 */
function sanitizeRelaxedJson(jsonStr: string): string {
  let result = '';
  let inString = false;
  let escaped = false;

  for (let i = 0; i < jsonStr.length; i++) {
    const ch = jsonStr[i];
    if (inString) {
      if (escaped) {
        result += ch;
        escaped = false;
        continue;
      }
      if (ch === '\\') {
        result += ch;
        escaped = true;
        continue;
      }
      if (ch === '"') {
        inString = false;
        result += ch;
        continue;
      }
      if (ch === '\n') {
        result += '\\n';
        continue;
      }
      if (ch === '\r') {
        continue;
      }
      if (ch === '\t') {
        result += '\\t';
        continue;
      }
      result += ch;
    } else {
      if (ch === '"') {
        inString = true;
      }
      result += ch;
    }
  }

  // Strip trailing commas before } or ]
  return result.replace(/,\s*([}\]])/g, '$1');
}

export function tryParseJsonRelaxed(rawText: string, finishReason?: string): any {
  const extracted = extractJsonString(rawText);

  try {
    return JSON.parse(extracted);
  } catch (firstErr: any) {
    try {
      const sanitized = sanitizeRelaxedJson(extracted);
      return JSON.parse(sanitized);
    } catch (secondErr: any) {
      const errMsg = String(secondErr?.message || firstErr?.message || '');
      const looksTruncated =
        finishReason === 'MAX_TOKENS' ||
        /unexpected end|unterminated|end of json|expected .* after|position \d+/i.test(errMsg) ||
        !rawText.trim().endsWith('}');

      if (looksTruncated) {
        throw new GeminiResponseTooLongError(
          `RESPONSE_TOO_LONG: Phản hồi JSON bị cắt giữa chừng (finishReason=${finishReason || 'unknown'}): ${errMsg}`
        );
      }
      throw secondErr;
    }
  }
}

export function isLengthOrTransientError(error: unknown): boolean {
  const err = error as any;
  if (err instanceof GeminiResponseTooLongError || err?.code === 'RESPONSE_TOO_LONG') {
    return true;
  }
  const msg = String(err?.message || err || '');
  return (
    msg.includes('RESPONSE_TOO_LONG') ||
    msg.includes('MAX_TOKENS') ||
    msg.includes('GEMINI_TIMEOUT') ||
    msg.includes('GEMINI_MODEL_TIMEOUT') ||
    msg.includes('SyntaxError') ||
    msg.includes('Unexpected end') ||
    msg.includes('Unterminated') ||
    msg.includes('504') ||
    msg.includes('503') ||
    msg.includes('502') ||
    msg.includes('429') ||
    msg.includes('overloaded') ||
    msg.includes('RESOURCE_EXHAUSTED')
  );
}

async function generateWithTimeout(
  model: ReturnType<GoogleGenerativeAI['getGenerativeModel']>,
  prompt: string,
  timeoutMs: number
) {
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;

  const timeoutPromise = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      const err = new Error(`GEMINI_MODEL_TIMEOUT: Quá ${Math.round(timeoutMs / 1000)}s`);
      controller.abort(err);
      reject(err);
    }, timeoutMs);
  });

  const apiPromise = model.generateContent(prompt, { signal: controller.signal });
  apiPromise.catch(() => {});

  try {
    return await Promise.race([apiPromise, timeoutPromise]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export async function generateJsonWithFallback<T = any>(
  prompt: string,
  tag: string,
  validate?: (parsed: any) => T,
  options: GeminiGenerateOptions = {}
): Promise<{ data: T; modelUsed: string }> {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error('Chưa cấu hình GEMINI_API_KEY trên server.');
  }

  const {
    temperature = 0.65,
    maxOutputTokens = 3600,
    perModelTimeoutMs = 20_000,
    totalBudgetMs = 50_000,
    failFastOnTooLong = false,
  } = options;

  const deadline = Date.now() + totalBudgetMs;
  let lastError: any;
  const errors: string[] = [];
  let tooLongHits = 0;

  for (const modelName of GEMINI_FALLBACK_MODELS) {
    const remainingMs = deadline - Date.now();
    if (remainingMs < 3500) {
      errors.push(`[budget]: Đã chạm ngưỡng thời gian ${Math.round(totalBudgetMs / 1000)}s`);
      lastError = new Error(`GEMINI_TIMEOUT: Hệ thống AI phản hồi quá thời gian (${errors.join(' | ')})`);
      break;
    }

    const attemptTimeoutMs = Math.min(perModelTimeoutMs, remainingMs - 800);

    try {
      const model = genAI.getGenerativeModel({
        model: modelName,
        generationConfig: {
          responseMimeType: 'application/json',
          temperature,
          maxOutputTokens,
        },
      });

      const result = await generateWithTimeout(model, prompt, attemptTimeoutMs);
      if (!result) continue;

      const finishReason = result.response.candidates?.[0]?.finishReason;
      const rawText = result.response.text();
      if (!rawText || !rawText.trim()) {
        throw new Error('Model trả về phản hồi rỗng');
      }

      const parsed = tryParseJsonRelaxed(rawText, finishReason);
      const validated = validate ? validate(parsed) : (parsed as T);

      console.log(`[${tag}] Thành công với model: ${modelName}`);
      return { data: validated, modelUsed: modelName };
    } catch (e: any) {
      lastError = e;
      const msg = e?.message || String(e);
      errors.push(`[${modelName}]: ${msg}`);
      console.warn(`[${tag}] Model ${modelName} lỗi hoặc quá tải: ${msg}`);

      if (msg.includes('API_KEY_INVALID') || msg.includes('API key not valid')) {
        break;
      }

      if (e instanceof GeminiResponseTooLongError || e?.code === 'RESPONSE_TOO_LONG') {
        tooLongHits += 1;
        if (failFastOnTooLong || tooLongHits >= 2) {
          throw e;
        }
      }
    }
  }

  throw lastError || new Error('Tất cả mô hình Gemini đều đang bận: ' + errors.join(' | '));
}

export function formatGeminiError(error: any, fallbackPrefix = 'Lỗi AI: '): { message: string; status: number } {
  const msg = error?.message || String(error);
  if (msg.includes('Chưa cấu hình GEMINI_API_KEY')) {
    return { message: msg, status: 500 };
  }
  if (error instanceof GeminiResponseTooLongError || msg.includes('RESPONSE_TOO_LONG')) {
    return {
      message: 'Phản hồi phân tích quá dài nên hệ thống đang tự chuyển sang chế độ chia nhỏ.',
      status: 502,
    };
  }
  const isTimeoutError =
    msg.includes('GEMINI_TIMEOUT') ||
    msg.includes('GEMINI_MODEL_TIMEOUT') ||
    msg.includes('AbortError') ||
    msg.includes('ETIMEDOUT') ||
    msg.includes('DEADLINE_EXCEEDED');
  if (isTimeoutError) {
    return {
      message: 'AI đang phản hồi chậm hơn bình thường (vượt giới hạn thời gian xử lý). Vui lòng bấm Thử lại.',
      status: 504,
    };
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
  const isOverloaded =
    msg.includes('503') ||
    msg.includes('UNAVAILABLE') ||
    msg.includes('overloaded');
  if (isOverloaded) {
    return {
      message: 'Hệ thống Gemini đang quá tải tạm thời. Vui lòng thử lại sau vài giây.',
      status: 503,
    };
  }
  return { message: `${fallbackPrefix}${msg}`, status: 500 };
}
