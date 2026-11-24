// lib/gemini-helper.ts
import { GoogleGenerativeAI } from '@google/generative-ai';
import {
  getGeminiCandidateModels,
  isBlockedOrPaidOnlyGeminiModel,
  type GeminiModelProfile,
} from '@/lib/ai-models';

const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta';

// Bộ nhớ đệm trạng thái sức khỏe từng model trong vòng đời tiến trình server:
// - Model trả về 404 / "no longer available" / deprecated -> khóa tạm 6 tiếng để không tốn thời gian thử lại vô ích.
// - Model trả về 429 (chạm trần RPM/TPM/RPD của Free Tier) -> hạ độ ưu tiên trong 25–60s để lượt gọi kế tiếp nhảy thẳng sang bucket model khác.
const deadModelsUntil = new Map<string, number>();
const rateLimitedUntil = new Map<string, number>();

const DEAD_MODEL_TTL_MS = 6 * 60 * 60 * 1000; // 6 giờ
const RPM_COOLDOWN_MS = 25 * 1000; // 25 giây cho giới hạn theo phút (RPM/TPM)
const RPD_COOLDOWN_MS = 10 * 60 * 1000; // 10 phút nếu chạm giới hạn ngày (RPD)
const DISCOVERED_MODELS_TTL_MS = 30 * 60 * 1000; // Cache ListModels 30 phút

let cachedDiscoveredModels: { models: string[]; expiresAt: number } | null = null;
let cachedSdkKey = '';
let cachedGenAI: GoogleGenerativeAI | null = null;

function getGenAIClient(apiKey: string): GoogleGenerativeAI {
  if (!cachedGenAI || cachedSdkKey !== apiKey) {
    cachedGenAI = new GoogleGenerativeAI(apiKey);
    cachedSdkKey = apiKey;
  }
  return cachedGenAI;
}

export interface GeminiGenerateOptions {
  temperature?: number;
  maxOutputTokens?: number;
  perModelTimeoutMs?: number;
  totalBudgetMs?: number;
  /**
   * Chọn chuỗi model tối ưu cho tài khoản Free Tier:
   * - 'fast' (mặc định): ưu tiên `gemini-3.5-flash-lite` (nhanh, quota Free Tier dồi dào nhất) -> `gemini-3.8-flash` -> `gemini-3.6-flash`...
   * - 'grading': ưu tiên `gemini-3.8-flash` (suy luận chấm bài sâu nhất) -> `gemini-3.5-flash-lite` -> `gemini-4-hydrogen`...
   */
  modelProfile?: GeminiModelProfile;
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

export function isModelRetiredOrNotFoundError(error: unknown): boolean {
  const msg = String((error as any)?.message || error || '');
  return (
    msg.includes('404 Not Found') ||
    msg.includes('[404 ') ||
    /no longer available/i.test(msg) ||
    /is not found for api version/i.test(msg) ||
    /model .* not found/i.test(msg) ||
    /has been deprecated/i.test(msg) ||
    /was deprecated/i.test(msg)
  );
}

function isRateLimitError(error: unknown): boolean {
  const msg = String((error as any)?.message || error || '');
  return (
    msg.includes('429') ||
    /quota exceeded/i.test(msg) ||
    /too many requests/i.test(msg) ||
    msg.includes('RESOURCE_EXHAUSTED') ||
    /rate limit/i.test(msg)
  );
}

function isOverloadedError(error: unknown): boolean {
  const msg = String((error as any)?.message || error || '');
  return msg.includes('503') || msg.includes('UNAVAILABLE') || /overloaded/i.test(msg);
}

function isTimeoutErrorMessage(error: unknown): boolean {
  const msg = String((error as any)?.message || error || '');
  return (
    msg.includes('GEMINI_TIMEOUT') ||
    msg.includes('GEMINI_MODEL_TIMEOUT') ||
    msg.includes('AbortError') ||
    msg.includes('ETIMEDOUT') ||
    msg.includes('DEADLINE_EXCEEDED')
  );
}

function isJsonMimeUnsupportedError(error: unknown): boolean {
  const msg = String((error as any)?.message || error || '');
  return (
    (msg.includes('400') || msg.includes('INVALID_ARGUMENT')) &&
    (/json mode is not enabled/i.test(msg) ||
      /responsemimetype/i.test(msg) ||
      /response_mime_type/i.test(msg) ||
      /mime type/i.test(msg))
  );
}

function shouldTryInteractionsEndpoint(error: unknown): boolean {
  const msg = String((error as any)?.message || error || '');
  if (/no longer available/i.test(msg)) return false;
  return (
    /interactions api/i.test(msg) ||
    /not supported for generatecontent/i.test(msg) ||
    /only supported in.*interactions/i.test(msg)
  );
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

function isModelMarkedDead(modelName: string, now = Date.now()): boolean {
  const exp = deadModelsUntil.get(modelName);
  if (!exp) return false;
  if (exp <= now) {
    deadModelsUntil.delete(modelName);
    return false;
  }
  return true;
}

function getModelCooldownRemainingMs(modelName: string, now = Date.now()): number {
  const exp = rateLimitedUntil.get(modelName);
  if (!exp) return 0;
  if (exp <= now) {
    rateLimitedUntil.delete(modelName);
    return 0;
  }
  return exp - now;
}

function orderHealthyCandidates(candidates: string[]): string[] {
  const now = Date.now();
  const ready: string[] = [];
  const coolingDown: Array<{ name: string; remaining: number }> = [];

  for (const name of candidates) {
    if (isModelMarkedDead(name, now)) continue;
    const rem = getModelCooldownRemainingMs(name, now);
    if (rem > 0) {
      coolingDown.push({ name, remaining: rem });
    } else {
      ready.push(name);
    }
  }

  coolingDown.sort((a, b) => a.remaining - b.remaining);
  return [...ready, ...coolingDown.map((c) => c.name)];
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

/**
 * Hỗ trợ gọi trực tiếp Google Interactions API (`POST /v1beta/interactions`) —
 * giao thức mới được Google khuyến nghị trên AI Studio (https://aistudio.google.com/docs/get-started)
 * khi một model thế hệ mới chỉ mở qua `/v1beta/interactions`.
 */
export async function generateViaInteractionsApi(params: {
  apiKey: string;
  modelName: string;
  prompt: string;
  temperature: number;
  maxOutputTokens: number;
  timeoutMs: number;
  jsonMode?: boolean;
}): Promise<{ text: string; finishReason?: string }> {
  const { apiKey, modelName, prompt, temperature, maxOutputTokens, timeoutMs, jsonMode = true } =
    params;

  const controller = new AbortController();
  const timer = setTimeout(() => {
    controller.abort(new Error(`GEMINI_MODEL_TIMEOUT: Quá ${Math.round(timeoutMs / 1000)}s`));
  }, timeoutMs);

  try {
    const payload: Record<string, any> = {
      model: modelName.replace(/^models\//, ''),
      input: prompt,
      generation_config: {
        temperature,
        max_output_tokens: maxOutputTokens,
      },
    };

    if (jsonMode && !modelName.startsWith('gemma-')) {
      payload.response_format = {
        type: 'text',
        mime_type: 'application/json',
      };
    }

    const res = await fetch(`${GEMINI_API_BASE}/interactions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey,
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    const rawBody = await res.text();
    if (!res.ok) {
      throw new Error(
        `[Interactions API ${res.status}] ${modelName}: ${rawBody.slice(0, 500)}`
      );
    }

    const parsed = JSON.parse(rawBody);
    const chunks: string[] = [];

    if (typeof parsed?.output_text === 'string' && parsed.output_text.trim()) {
      chunks.push(parsed.output_text);
    } else if (Array.isArray(parsed?.steps)) {
      for (const step of parsed.steps) {
        if (step?.type === 'model_output' && Array.isArray(step?.content)) {
          for (const part of step.content) {
            if (typeof part?.text === 'string') {
              chunks.push(part.text);
            }
          }
        }
      }
    } else if (Array.isArray(parsed?.outputs)) {
      for (const out of parsed.outputs) {
        if (typeof out?.text === 'string') {
          chunks.push(out.text);
        }
      }
    }

    const combinedText = chunks.join('').trim();
    if (!combinedText) {
      throw new Error(`Interactions API (${modelName}) trả về phản hồi rỗng`);
    }

    const finishReason =
      parsed?.status === 'incomplete' || parsed?.finish_reason === 'MAX_TOKENS'
        ? 'MAX_TOKENS'
        : undefined;

    return { text: combinedText, finishReason };
  } catch (err: any) {
    if (controller.signal.aborted) {
      throw new Error(`GEMINI_MODEL_TIMEOUT: Quá ${Math.round(timeoutMs / 1000)}s`);
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Tự động khám phá danh sách model khả dụng thực tế trên tài khoản Google AI Studio của người dùng
 * thông qua `GET /v1beta/models` khi Google đổi tên hoặc ngừng các model cố định.
 */
async function discoverLiveFreeTierModels(
  apiKey: string,
  profile: GeminiModelProfile,
  timeoutMs = 4000
): Promise<string[]> {
  const now = Date.now();
  if (cachedDiscoveredModels && cachedDiscoveredModels.expiresAt > now) {
    return cachedDiscoveredModels.models;
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(`${GEMINI_API_BASE}/models?pageSize=100`, {
      method: 'GET',
      headers: { 'x-goog-api-key': apiKey },
      signal: controller.signal,
    });
    if (!res.ok) return [];

    const data = await res.json();
    const rawModels: any[] = Array.isArray(data?.models) ? data.models : [];

    const validIds = rawModels
      .filter((m) => {
        const methods: string[] = Array.isArray(m?.supportedGenerationMethods)
          ? m.supportedGenerationMethods
          : [];
        if (!methods.includes('generateContent')) return false;
        const name = String(m?.name || '').replace(/^models\//, '');
        if (!name || isBlockedOrPaidOnlyGeminiModel(name) || isModelMarkedDead(name, now)) {
          return false;
        }
        return name.startsWith('gemini-') || name.startsWith('gemma-');
      })
      .map((m) => String(m.name).replace(/^models\//, ''));

    const scoreModel = (id: string): number => {
      let score = 0;
      const verMatch = id.match(/gemini-(\d+(?:\.\d+)?)/);
      if (verMatch) {
        score += parseFloat(verMatch[1]) * 100;
      }
      if (profile === 'fast') {
        if (id.includes('flash-lite')) score += 45;
        else if (id.includes('flash')) score += 30;
        else if (id.includes('hydrogen')) score += 20;
      } else {
        if (id.includes('flash') && !id.includes('lite')) score += 45;
        else if (id.includes('hydrogen')) score += 35;
        else if (id.includes('flash-lite')) score += 30;
      }
      if (!id.includes('preview') && !id.includes('exp')) score += 10;
      if (id.startsWith('gemma-')) score -= 150;
      return score;
    };

    validIds.sort((a, b) => scoreModel(b) - scoreModel(a));
    const unique = Array.from(new Set(validIds));

    if (unique.length > 0) {
      cachedDiscoveredModels = {
        models: unique,
        expiresAt: now + DISCOVERED_MODELS_TTL_MS,
      };
    }

    return unique;
  } catch {
    return [];
  } finally {
    clearTimeout(timer);
  }
}

async function runModelAttempt(params: {
  genAI: GoogleGenerativeAI;
  apiKey: string;
  modelName: string;
  prompt: string;
  temperature: number;
  maxOutputTokens: number;
  attemptTimeoutMs: number;
}): Promise<{ rawText: string; finishReason?: string }> {
  const {
    genAI,
    apiKey,
    modelName,
    prompt,
    temperature,
    maxOutputTokens,
    attemptTimeoutMs,
  } = params;

  const preferPlainText = modelName.startsWith('gemma-');

  try {
    const model = genAI.getGenerativeModel({
      model: modelName,
      generationConfig: {
        ...(preferPlainText ? {} : { responseMimeType: 'application/json' }),
        temperature,
        maxOutputTokens,
      },
    });

    const result = await generateWithTimeout(model, prompt, attemptTimeoutMs);
    const finishReason = result.response.candidates?.[0]?.finishReason;
    const rawText = result.response.text();
    return { rawText, finishReason };
  } catch (err: any) {
    // Nếu model không hỗ trợ JSON MIME mode (VD: một số bản Gemma/Preview), tự động gọi lại ở chế độ text thường
    if (!preferPlainText && isJsonMimeUnsupportedError(err)) {
      const plainModel = genAI.getGenerativeModel({
        model: modelName,
        generationConfig: {
          temperature,
          maxOutputTokens,
        },
      });
      const retryRes = await generateWithTimeout(plainModel, prompt, attemptTimeoutMs);
      return {
        rawText: retryRes.response.text(),
        finishReason: retryRes.response.candidates?.[0]?.finishReason,
      };
    }

    // Nếu model mới yêu cầu gọi qua Interactions API (`/v1beta/interactions`), tự động chuyển giao thức
    if (shouldTryInteractionsEndpoint(err)) {
      const inter = await generateViaInteractionsApi({
        apiKey,
        modelName,
        prompt,
        temperature,
        maxOutputTokens,
        timeoutMs: attemptTimeoutMs,
        jsonMode: !preferPlainText,
      });
      return { rawText: inter.text, finishReason: inter.finishReason };
    }

    throw err;
  }
}

/**
 * Chọn lỗi phản ánh đúng bản chất nhất để trả về cho tầng gọi:
 * Tránh lỗi 404 của model dự phòng cuối danh sách che khuất lỗi 429 (Rate Limit), 503 (Quá tải),
 * hoặc RESPONSE_TOO_LONG của các model chính ở đầu danh sách!
 */
function pickMostActionableError(
  capturedErrors: Array<{ model: string; error: any }>,
  summaryText: string
): Error {
  if (capturedErrors.length === 0) {
    return new Error(`Tất cả mô hình Gemini đều đang bận (${summaryText})`);
  }

  const invalidKey = capturedErrors.find(({ error }) => {
    const m = String(error?.message || error || '');
    return m.includes('API_KEY_INVALID') || m.includes('API key not valid');
  });
  if (invalidKey) return invalidKey.error;

  const tooLong = capturedErrors.find(
    ({ error }) =>
      error instanceof GeminiResponseTooLongError || error?.code === 'RESPONSE_TOO_LONG'
  );
  if (tooLong) return tooLong.error;

  const quotaErr = capturedErrors.find(({ error }) => isRateLimitError(error));
  if (quotaErr) return quotaErr.error;

  const overloadedErr = capturedErrors.find(({ error }) => isOverloadedError(error));
  if (overloadedErr) return overloadedErr.error;

  const timeoutErr = capturedErrors.find(({ error }) => isTimeoutErrorMessage(error));
  if (timeoutErr) return timeoutErr.error;

  const non404Err = capturedErrors.find(({ error }) => !isModelRetiredOrNotFoundError(error));
  if (non404Err) return non404Err.error;

  return capturedErrors[capturedErrors.length - 1].error;
}

export async function generateJsonWithFallback<T = any>(
  prompt: string,
  tag: string,
  validate?: (parsed: any) => T,
  options: GeminiGenerateOptions = {}
): Promise<{ data: T; modelUsed: string }> {
  const apiKey = (process.env.GEMINI_API_KEY || '').trim();
  if (!apiKey) {
    throw new Error('Chưa cấu hình GEMINI_API_KEY trên server.');
  }

  const {
    temperature = 0.65,
    maxOutputTokens = 3600,
    perModelTimeoutMs = 20_000,
    totalBudgetMs = 50_000,
    modelProfile = 'fast',
    failFastOnTooLong = false,
  } = options;

  const genAI = getGenAIClient(apiKey);
  const deadline = Date.now() + totalBudgetMs;
  const capturedErrors: Array<{ model: string; error: any }> = [];
  const errorSummaries: string[] = [];
  const triedModels = new Set<string>();
  let tooLongHits = 0;
  let sawModelNotFound = false;

  const tryCandidateList = async (
    candidates: string[]
  ): Promise<{ data: T; modelUsed: string } | null> => {
    for (const modelName of candidates) {
      if (triedModels.has(modelName)) continue;

      const remainingMs = deadline - Date.now();
      if (remainingMs < 3500) {
        const timeoutErr = new Error(
          `GEMINI_TIMEOUT: Hệ thống AI phản hồi quá thời gian ${Math.round(totalBudgetMs / 1000)}s (${errorSummaries.join(' | ')})`
        );
        capturedErrors.push({ model: 'budget', error: timeoutErr });
        errorSummaries.push(`[budget]: Chạm ngưỡng ${Math.round(totalBudgetMs / 1000)}s`);
        return null;
      }

      triedModels.add(modelName);
      const attemptTimeoutMs = Math.min(perModelTimeoutMs, remainingMs - 600);

      try {
        const { rawText, finishReason } = await runModelAttempt({
          genAI,
          apiKey,
          modelName,
          prompt,
          temperature,
          maxOutputTokens,
          attemptTimeoutMs,
        });

        if (!rawText || !rawText.trim()) {
          throw new Error('Model trả về phản hồi rỗng');
        }

        const parsed = tryParseJsonRelaxed(rawText, finishReason);
        const validated = validate ? validate(parsed) : (parsed as T);

        // Xóa trạng thái cooldown nếu model vừa gọi thành công
        rateLimitedUntil.delete(modelName);
        console.log(`[${tag}] Thành công với model: ${modelName}`);
        return { data: validated, modelUsed: modelName };
      } catch (e: any) {
        const msg = e?.message || String(e);
        capturedErrors.push({ model: modelName, error: e });
        errorSummaries.push(`[${modelName}]: ${msg.slice(0, 180)}`);
        console.warn(`[${tag}] Model ${modelName} lỗi hoặc quá tải: ${msg}`);

        if (msg.includes('API_KEY_INVALID') || msg.includes('API key not valid')) {
          return null;
        }

        if (isModelRetiredOrNotFoundError(e)) {
          sawModelNotFound = true;
          deadModelsUntil.set(modelName, Date.now() + DEAD_MODEL_TTL_MS);
          console.warn(
            `[${tag}] Đánh dấu bỏ qua model ${modelName} trong 6h do đã ngừng hỗ trợ / 404.`
          );
          continue;
        }

        if (isRateLimitError(e)) {
          const isDailyQuota = /perday|per_day|daily/i.test(msg);
          rateLimitedUntil.set(
            modelName,
            Date.now() + (isDailyQuota ? RPD_COOLDOWN_MS : RPM_COOLDOWN_MS)
          );
          continue;
        }

        if (e instanceof GeminiResponseTooLongError || e?.code === 'RESPONSE_TOO_LONG') {
          tooLongHits += 1;
          if (failFastOnTooLong || tooLongHits >= 2) {
            throw e;
          }
        }
      }
    }

    return null;
  };

  // Tầng 1: Chạy danh sách Free Tier chuẩn (đã lọc bỏ model chết & đẩy model đang dính 429 xuống cuối)
  const staticCandidates = orderHealthyCandidates(getGeminiCandidateModels(modelProfile, true));
  const primarySuccess = await tryCandidateList(staticCandidates);
  if (primarySuccess) {
    return primarySuccess;
  }

  // Tầng 2 (Tự phục hồi — Self-Healing): Nếu gặp 404 do Google vừa đổi mã model mới,
  // tự động gọi `GET /v1beta/models` để lấy các model Free Tier đang mở thực tế trên tài khoản và thử tiếp!
  const remainingAfterStatic = deadline - Date.now();
  if (sawModelNotFound && remainingAfterStatic >= 5500) {
    const discovered = await discoverLiveFreeTierModels(
      apiKey,
      modelProfile,
      Math.min(3500, remainingAfterStatic - 2000)
    );
    const freshDiscovered = orderHealthyCandidates(
      discovered.filter((m) => !triedModels.has(m))
    );
    if (freshDiscovered.length > 0) {
      console.log(
        `[${tag}] Tự động khám phá thêm ${freshDiscovered.length} model từ ListModels: ${freshDiscovered.join(', ')}`
      );
      const rescued = await tryCandidateList(freshDiscovered);
      if (rescued) {
        return rescued;
      }
    }
  }

  throw pickMostActionableError(capturedErrors, errorSummaries.join(' | '));
}

export function formatGeminiError(
  error: any,
  fallbackPrefix = 'Lỗi AI: '
): { message: string; status: number } {
  const msg = error?.message || String(error);
  if (msg.includes('Chưa cấu hình GEMINI_API_KEY')) {
    return { message: msg, status: 500 };
  }
  if (msg.includes('API_KEY_INVALID') || msg.includes('API key not valid')) {
    return {
      message: 'GEMINI_API_KEY không hợp lệ hoặc đã bị thu hồi. Vui lòng kiểm tra lại cấu hình API Key.',
      status: 401,
    };
  }
  if (error instanceof GeminiResponseTooLongError || msg.includes('RESPONSE_TOO_LONG')) {
    return {
      message: 'Phản hồi phân tích quá dài nên hệ thống đang tự chuyển sang chế độ chia nhỏ.',
      status: 502,
    };
  }
  if (isTimeoutErrorMessage(error)) {
    return {
      message:
        'AI đang phản hồi chậm hơn bình thường (vượt giới hạn thời gian xử lý). Vui lòng bấm Thử lại.',
      status: 504,
    };
  }
  if (isRateLimitError(error)) {
    return {
      message:
        'Tài khoản Google AI Studio (Free Tier) đang tạm chạm giới hạn lượt gọi mỗi phút/ngày trên tất cả model dự phòng. Vui lòng đợi khoảng 20–30 giây rồi thử lại.',
      status: 429,
    };
  }
  if (isOverloadedError(error)) {
    return {
      message: 'Hệ thống Gemini đang quá tải tạm thời. Vui lòng thử lại sau vài giây.',
      status: 503,
    };
  }
  if (isModelRetiredOrNotFoundError(error)) {
    return {
      message:
        'Không tìm thấy model Gemini khả dụng cho tài khoản hiện tại trên Google AI Studio (404 Model Not Found). Vui lòng kiểm tra quyền truy cập API Key tại aistudio.google.com.',
      status: 502,
    };
  }
  return { message: `${fallbackPrefix}${msg}`, status: 500 };
}
