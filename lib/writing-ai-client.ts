// lib/writing-ai-client.ts

export interface WritingAiFetchOptions {
  timeoutMs?: number;
  signal?: AbortSignal;
}

/**
 * Shared client helper for Writing Task 1 / Task 2 AI endpoints.
 * Enforces a client-side timeout and safely handles non-JSON gateway responses (e.g. 504/502).
 */
export async function postWritingAi<T = any>(
  url: string,
  payload: unknown,
  options: WritingAiFetchOptions = {}
): Promise<T> {
  const { timeoutMs = 62_000, signal: externalSignal } = options;
  const controller = new AbortController();
  let timedOut = false;

  const onExternalAbort = () => controller.abort();
  if (externalSignal) {
    if (externalSignal.aborted) {
      throw new DOMException('Aborted', 'AbortError');
    }
    externalSignal.addEventListener('abort', onExternalAbort, { once: true });
  }

  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    const rawText = await res.text();
    let parsed: any = null;
    if (rawText) {
      try {
        parsed = JSON.parse(rawText);
      } catch {
        parsed = null;
      }
    }

    if (!res.ok) {
      if (parsed?.error) {
        throw new Error(parsed.error);
      }
      if (res.status === 504) {
        throw new Error('Server phản hồi quá thời gian (504 Gateway Timeout). Vui lòng bấm Thử lại.');
      }
      if (res.status === 502 || res.status === 503) {
        throw new Error(`Hệ thống tạm thời quá tải (${res.status}). Vui lòng thử lại sau vài giây.`);
      }
      throw new Error(`Lỗi máy chủ (${res.status}). Vui lòng thử lại.`);
    }

    if (!parsed) {
      throw new Error('Server trả về dữ liệu không phải JSON hợp lệ.');
    }
    if (parsed.error) {
      throw new Error(parsed.error);
    }

    return parsed as T;
  } catch (err: any) {
    if (timedOut) {
      throw new Error('Yêu cầu AI vượt quá thời gian chờ. Vui lòng bấm Thử lại.');
    }
    if (err?.name === 'AbortError' || externalSignal?.aborted) {
      throw err;
    }
    throw new Error(err?.message || 'Lỗi kết nối tới server AI. Vui lòng thử lại.');
  } finally {
    clearTimeout(timer);
    if (externalSignal) {
      externalSignal.removeEventListener('abort', onExternalAbort);
    }
  }
}
