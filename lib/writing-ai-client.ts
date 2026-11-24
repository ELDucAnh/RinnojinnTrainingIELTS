// lib/writing-ai-client.ts
import {
  normalizeFullEssayGradeResult,
  normalizeGradeResult,
  normalizeOutline,
  normalizeVocabPrep,
  type BodyGradeResult,
  type ChartData,
  type FullEssayGradeResult,
  type OutlineBodyItem,
  type PreviousAttemptSummary,
  type Task2OutlineResponse,
  type WritingVocabPrep,
} from '@/lib/writing-practice-types';

export interface WritingAiFetchOptions {
  timeoutMs?: number;
  signal?: AbortSignal;
  maxRetries?: number;
  onStatus?: (msg: string) => void;
}

class WritingAiHttpError extends Error {
  public readonly status: number;
  public readonly retriable: boolean;

  constructor(message: string, status: number, retriable: boolean) {
    super(message);
    this.name = 'WritingAiHttpError';
    this.status = status;
    this.retriable = retriable;
  }
}

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException('Aborted', 'AbortError'));
      return;
    }
    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort);
      resolve();
    }, ms);
    const onAbort = () => {
      clearTimeout(timer);
      reject(new DOMException('Aborted', 'AbortError'));
    };
    signal?.addEventListener('abort', onAbort, { once: true });
  });
}

function isRetriableError(err: any): boolean {
  if (err?.name === 'AbortError') return false;
  if (err instanceof WritingAiHttpError) return err.retriable;
  const msg = String(err?.message || err || '');
  // Never retry 400 validation or missing API key
  if (msg.includes('Chưa cấu hình GEMINI_API_KEY')) return false;
  if (msg.includes('quá ngắn') || msg.includes('tối thiểu') || msg.includes('Thiếu dữ liệu')) return false;
  return true;
}

async function postWritingAiOnce<T = any>(
  url: string,
  payload: unknown,
  options: { timeoutMs?: number; signal?: AbortSignal } = {}
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
      const retriable = res.status >= 500 || res.status === 429 || res.status === 408;
      if (parsed?.error) {
        throw new WritingAiHttpError(parsed.error, res.status, retriable);
      }
      if (res.status === 504) {
        throw new WritingAiHttpError(
          'Server phản hồi quá thời gian (504 Gateway Timeout).',
          504,
          true
        );
      }
      if (res.status === 502 || res.status === 503) {
        throw new WritingAiHttpError(
          `Hệ thống tạm thời quá tải (${res.status}).`,
          res.status,
          true
        );
      }
      throw new WritingAiHttpError(`Lỗi máy chủ (${res.status}).`, res.status, retriable);
    }

    if (!parsed) {
      throw new WritingAiHttpError('Server trả về dữ liệu không phải JSON hợp lệ.', 502, true);
    }
    if (parsed.error) {
      throw new WritingAiHttpError(parsed.error, 500, true);
    }

    return parsed as T;
  } catch (err: any) {
    if (timedOut) {
      throw new WritingAiHttpError('Yêu cầu AI vượt quá thời gian chờ.', 504, true);
    }
    if (err?.name === 'AbortError' || externalSignal?.aborted) {
      throw err;
    }
    if (err instanceof WritingAiHttpError) {
      throw err;
    }
    throw new WritingAiHttpError(
      err?.message || 'Lỗi kết nối tới server AI.',
      503,
      true
    );
  } finally {
    clearTimeout(timer);
    if (externalSignal) {
      externalSignal.removeEventListener('abort', onExternalAbort);
    }
  }
}

/**
 * Shared client helper for Writing Task 1 / Task 2 AI endpoints.
 * Automatically retries transient / timeout / rate-limit errors before failing.
 */
export async function postWritingAi<T = any>(
  url: string,
  payload: unknown,
  options: WritingAiFetchOptions = {}
): Promise<T> {
  const { timeoutMs = 62_000, signal, maxRetries = 2, onStatus } = options;
  let lastError: any;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await postWritingAiOnce<T>(url, payload, { timeoutMs, signal });
    } catch (err: any) {
      lastError = err;
      if (!isRetriableError(err) || attempt >= maxRetries) {
        throw err;
      }
      const delayMs = err instanceof WritingAiHttpError && err.status === 429
        ? 2500 * (attempt + 1)
        : 900 * (attempt + 1);
      onStatus?.(`AI phản hồi chậm hoặc đang bận — tự động thử lại lần ${attempt + 2}/${maxRetries + 1}...`);
      await sleep(delayMs, signal);
    }
  }

  throw lastError;
}

// ─── Resilient Chunked Orchestrators (Auto-split when response is too long / times out) ───

/**
 * Pre-outline Vocabulary & Paraphrase Table generator (Task 1 & Task 2):
 * 1) Try full single-shot call.
 * 2) If response is too long / fails -> split into 2 small calls: 'paraphrase' then 'collocations'.
 */
export async function generateVocabPrepResilient(
  payload:
    | { taskType: 'task1'; chartData: ChartData }
    | { taskType: 'task2'; prompt: string; stanceHint?: string },
  options: { signal?: AbortSignal; onStatus?: (msg: string) => void } = {}
): Promise<WritingVocabPrep> {
  const { signal, onStatus } = options;
  const endpoint = '/api/ai/writing-vocab-prep';

  try {
    onStatus?.('Đang tổng hợp bảng Paraphrase & kho Collocation B1–B2 sát đề...');
    const full = await postWritingAiOnce<WritingVocabPrep>(endpoint, payload, {
      timeoutMs: 52_000,
      signal,
    });
    const normalized = normalizeVocabPrep(full);
    if (normalized.paraphraseTable.length > 0 || normalized.collocationGroups.length > 0) {
      return normalized;
    }
  } catch (err: any) {
    if (err?.name === 'AbortError' || !isRetriableError(err)) throw err;
    console.warn('[writing-vocab-prep] Full request failed, switching to 2-part fallback:', err?.message);
  }

  onStatus?.('Đang tự chia nhỏ bước 1/2: Lập bảng Paraphrase từ khóa tránh lặp từ...');
  const p1 = await postWritingAi<any>(
    endpoint,
    { ...payload, phase: 'paraphrase' },
    { timeoutMs: 40_000, signal, maxRetries: 2, onStatus }
  );

  onStatus?.('Đang tự chia nhỏ bước 2/2: Tổng hợp kho cụm Collocation B1–B2 sát đề...');
  const p2 = await postWritingAi<any>(
    endpoint,
    { ...payload, phase: 'collocations', paraphraseSummary: p1?.paraphraseTable || [] },
    { timeoutMs: 40_000, signal, maxRetries: 2, onStatus }
  );

  return normalizeVocabPrep({
    ...p1,
    collocationGroups: p2?.collocationGroups || [],
  });
}

/**
 * Task 1 Outline:
 * 1) Try full 4-body outline in 1 call.
 * 2) If response is too long / fails -> auto-split into 2 chunks ([0,1] then [2,3]).
 * 3) If a 2-body chunk fails -> auto-split down to single body ([0], [1], [2], [3]) with retries!
 */
export async function generateTask1OutlineResilient(
  chartData: ChartData,
  options: { signal?: AbortSignal; onStatus?: (msg: string) => void; vocabPrep?: WritingVocabPrep | null } = {}
): Promise<OutlineBodyItem[]> {
  const { signal, onStatus, vocabPrep } = options;

  try {
    onStatus?.('Đang thiết kế dàn ý 4 Body chuẩn 8.0 TA · 8.5 CC · 8.0 GRA · 7.5 LR...');
    const full = await postWritingAiOnce<{ outline: OutlineBodyItem[] }>(
      '/api/ai/task1-generate',
      { mode: 'outline-only', chartData, vocabPrep: vocabPrep || undefined },
      { timeoutMs: 58_000, signal }
    );
    if (Array.isArray(full?.outline) && full.outline.length >= 4) {
      return normalizeOutline(full.outline, 'task1');
    }
  } catch (err: any) {
    if (err?.name === 'AbortError' || !isRetriableError(err)) throw err;
    console.warn('[task1-outline] Full request failed, switching to chunked fallback:', err?.message);
  }

  const collected: any[] = [];
  const chunkGroups: number[][] = [
    [0, 1],
    [2, 3],
  ];

  for (let gIdx = 0; gIdx < chunkGroups.length; gIdx++) {
    const group = chunkGroups[gIdx];
    onStatus?.(
      `Dàn ý chi tiết khá dài — hệ thống đang tự chia nhỏ tải Body ${group.map((i) => i + 1).join(' & ')}/4...`
    );

    try {
      const chunkRes = await postWritingAi<{ outlineChunk: any[] }>(
        '/api/ai/task1-generate',
        {
          mode: 'outline-chunk',
          chartData,
          vocabPrep: vocabPrep || undefined,
          bodyIndices: group,
          previousOutlineSummary: collected.map((o) => ({
            bodyIndex: o.bodyIndex,
            role: o.role,
            viGuide: o.viGuide,
          })),
        },
        { timeoutMs: 45_000, signal, maxRetries: 1, onStatus }
      );
      if (Array.isArray(chunkRes?.outlineChunk) && chunkRes.outlineChunk.length > 0) {
        collected.push(...chunkRes.outlineChunk);
        continue;
      }
      throw new Error('Chunk dàn ý trả về rỗng');
    } catch (chunkErr: any) {
      if (chunkErr?.name === 'AbortError' || !isRetriableError(chunkErr)) throw chunkErr;
      // Drop down to 1 body at a time!
      for (const singleIdx of group) {
        onStatus?.(`Đang tự động chia siêu nhỏ — tải riêng Body ${singleIdx + 1}/4...`);
        const singleRes = await postWritingAi<{ outlineChunk: any[] }>(
          '/api/ai/task1-generate',
          {
            mode: 'outline-chunk',
            chartData,
            vocabPrep: vocabPrep || undefined,
            bodyIndices: [singleIdx],
            previousOutlineSummary: collected.map((o) => ({
              bodyIndex: o.bodyIndex,
              role: o.role,
              viGuide: o.viGuide,
            })),
          },
          { timeoutMs: 40_000, signal, maxRetries: 2, onStatus }
        );
        if (Array.isArray(singleRes?.outlineChunk)) {
          collected.push(...singleRes.outlineChunk);
        }
      }
    }
  }

  if (collected.length === 0) {
    throw new Error('Không thể tạo dàn ý Task 1 sau nhiều lần thử chia nhỏ. Vui lòng thử lại sau vài giây.');
  }

  return normalizeOutline(collected, 'task1');
}

/**
 * Task 2 Outline:
 * 1) Try full 5-body outline in 1 call.
 * 2) If response is too long / fails -> auto-split into [0,1] (+ meta), [2,3], [4].
 * 3) If any 2-body chunk fails -> auto-split down to 1 body at a time with retries!
 */
export async function generateTask2OutlineResilient(
  params: { prompt: string; stanceHint?: string; vocabPrep?: WritingVocabPrep | null },
  options: { signal?: AbortSignal; onStatus?: (msg: string) => void } = {}
): Promise<Task2OutlineResponse> {
  const { signal, onStatus } = options;

  try {
    onStatus?.('Đang lập dàn ý 5 Body bám sát bảng Paraphrase & Từ vựng bạn đã xác nhận...');
    const full = await postWritingAiOnce<Task2OutlineResponse>(
      '/api/ai/task2-outline',
      {
        prompt: params.prompt,
        stanceHint: params.stanceHint || '',
        vocabPrep: params.vocabPrep || undefined,
      },
      { timeoutMs: 58_000, signal }
    );
    if (Array.isArray(full?.outline) && full.outline.length >= 5) {
      return {
        essayType: full.essayType || params.vocabPrep?.essayType || 'IELTS Writing Task 2',
        promptAnalysis: full.promptAnalysis || params.vocabPrep?.promptAnalysis || '',
        outline: normalizeOutline(full.outline, 'task2'),
      };
    }
  } catch (err: any) {
    if (err?.name === 'AbortError' || !isRetriableError(err)) throw err;
    console.warn('[task2-outline] Full request failed, switching to chunked fallback:', err?.message);
  }

  let essayType = params.vocabPrep?.essayType || 'IELTS Writing Task 2';
  let promptAnalysis = params.vocabPrep?.promptAnalysis || '';
  const collected: any[] = [];
  const chunkGroups: number[][] = [
    [0, 1],
    [2, 3],
    [4],
  ];

  for (let gIdx = 0; gIdx < chunkGroups.length; gIdx++) {
    const group = chunkGroups[gIdx];
    onStatus?.(
      `Dàn ý 5 Body khá dài — hệ thống đang tự chia nhỏ tải Body ${group.map((i) => i + 1).join(' & ')}/5...`
    );

    const requestBodyFor = (indices: number[]) => ({
      mode: 'chunk' as const,
      prompt: params.prompt,
      stanceHint: params.stanceHint || '',
      vocabPrep: params.vocabPrep || undefined,
      bodyIndices: indices,
      includeMeta: gIdx === 0 && !promptAnalysis,
      essayType: essayType !== 'IELTS Writing Task 2' ? essayType : undefined,
      promptAnalysis: promptAnalysis || undefined,
      previousOutlineSummary: collected.map((o) => ({
        bodyIndex: o.bodyIndex,
        role: o.role,
        viGuide: o.viGuide,
      })),
    });

    try {
      const chunkRes = await postWritingAi<{
        essayType?: string;
        promptAnalysis?: string;
        outlineChunk: any[];
      }>('/api/ai/task2-outline', requestBodyFor(group), {
        timeoutMs: 45_000,
        signal,
        maxRetries: 1,
        onStatus,
      });

      if (chunkRes.essayType) essayType = chunkRes.essayType;
      if (chunkRes.promptAnalysis) promptAnalysis = chunkRes.promptAnalysis;
      if (Array.isArray(chunkRes.outlineChunk) && chunkRes.outlineChunk.length > 0) {
        collected.push(...chunkRes.outlineChunk);
        continue;
      }
      throw new Error('Chunk dàn ý Task 2 rỗng');
    } catch (chunkErr: any) {
      if (chunkErr?.name === 'AbortError' || !isRetriableError(chunkErr)) throw chunkErr;
      // Drop down to 1 body at a time
      for (const singleIdx of group) {
        onStatus?.(`Đang tự động chia siêu nhỏ — tải riêng Body ${singleIdx + 1}/5...`);
        const singleRes = await postWritingAi<{
          essayType?: string;
          promptAnalysis?: string;
          outlineChunk: any[];
        }>('/api/ai/task2-outline', requestBodyFor([singleIdx]), {
          timeoutMs: 40_000,
          signal,
          maxRetries: 2,
          onStatus,
        });
        if (singleRes.essayType) essayType = singleRes.essayType;
        if (singleRes.promptAnalysis) promptAnalysis = singleRes.promptAnalysis;
        if (Array.isArray(singleRes.outlineChunk)) {
          collected.push(...singleRes.outlineChunk);
        }
      }
    }
  }

  if (collected.length === 0) {
    throw new Error('Không thể tạo dàn ý Task 2 sau nhiều lần thử chia nhỏ. Vui lòng thử lại sau vài giây.');
  }

  return {
    essayType,
    promptAnalysis,
    outline: normalizeOutline(collected, 'task2'),
  };
}

/**
 * Per-body Grading (Task 1 & Task 2):
 * 1) Try full single-shot grading.
 * 2) If response is too long / fails -> automatically run 3 small coherent phases:
 *    - Phase 1: TA/TR (8.0) + CC (9.0) + crossBodyFeedback
 *    - Phase 2: GRA (8.0) + LR (7.0) + grammarErrors + vocabularyTips (synced with Phase 1)
 *    - Phase 3: tutorClosingNote + generalFeedback + modelUpgrade (synced with all 4 criteria)
 */
export async function gradeBodyResilient(
  endpoint: '/api/ai/task1-grade' | '/api/ai/task2-grade',
  basePayload: Record<string, any> & { previousAttempt?: PreviousAttemptSummary | null },
  options: { signal?: AbortSignal; onStatus?: (msg: string) => void } = {}
): Promise<BodyGradeResult> {
  const { signal, onStatus } = options;

  try {
    onStatus?.('Gia sư AI đang chấm & kiểm tra 5 quy luật CC (8.0 TA/TR · 8.5 CC · 8.0 GRA · 7.5 LR)...');
    const full = await postWritingAiOnce<BodyGradeResult>(endpoint, basePayload, {
      timeoutMs: 58_000,
      signal,
    });
    if (full?.criteria?.task && full?.criteria?.cc && full?.criteria?.gra && full?.criteria?.lr) {
      return normalizeGradeResult(full);
    }
  } catch (err: any) {
    if (err?.name === 'AbortError' || !isRetriableError(err)) throw err;
    console.warn(`[${endpoint}] Full grade failed, switching to 3-phase chunked fallback:`, err?.message);
  }

  // Phase 1: Task + CC
  onStatus?.('Phản hồi siêu chi tiết khá dài — tự động chia nhỏ bước 1/3: Chấm TA/TR (8.0) & 5 quy luật CC (8.5)...');
  const phase1 = await postWritingAi<any>(
    endpoint,
    { ...basePayload, phase: 'task-cc' },
    { timeoutMs: 42_000, signal, maxRetries: 2, onStatus }
  );

  // Phase 2: GRA + LR (aligned with Phase 1)
  onStatus?.('Đang xử lý bước 2/3: Chấm GRA (8.0) & LR (7.5) đồng bộ với TA/TR & CC...');
  const phase2 = await postWritingAi<any>(
    endpoint,
    {
      ...basePayload,
      phase: 'gra-lr',
      phase1Context: {
        taskBand: phase1?.criteria?.task?.band,
        taskReason: phase1?.criteria?.task?.reason,
        taskMappings: phase1?.criteria?.task?.mappings,
        ccBand: phase1?.criteria?.cc?.band,
        ccReason: phase1?.criteria?.cc?.reason,
        ccChecklist: phase1?.ccChecklist,
        ccMappings: phase1?.criteria?.cc?.mappings,
      },
    },
    { timeoutMs: 42_000, signal, maxRetries: 2, onStatus }
  );

  // Phase 3: Tutor Closing Verdict + generalFeedback + modelUpgrade
  onStatus?.('Đang xử lý bước 3/3: Gia sư tổng hợp lời chốt nhận xét chi tiết bằng tiếng Việt...');
  const phase3 = await postWritingAi<any>(
    endpoint,
    {
      ...basePayload,
      phase: 'tutor-closing',
      criteriaContext: {
        task: phase1?.criteria?.task,
        cc: phase1?.criteria?.cc,
        ccChecklist: phase1?.ccChecklist,
        gra: phase2?.criteria?.gra,
        lr: phase2?.criteria?.lr,
        crossBodyFeedback: phase1?.crossBodyFeedback,
      },
    },
    { timeoutMs: 42_000, signal, maxRetries: 2, onStatus }
  );

  return normalizeGradeResult({
    criteria: {
      task: phase1?.criteria?.task,
      cc: phase1?.criteria?.cc,
      gra: phase2?.criteria?.gra,
      lr: phase2?.criteria?.lr,
    },
    ccChecklist: phase1?.ccChecklist || [],
    ccFlowAudit: phase1?.ccFlowAudit || [],
    crossBodyFeedback: phase1?.crossBodyFeedback,
    grammarErrors: phase2?.grammarErrors || [],
    vocabularyTips: phase2?.vocabularyTips || [],
    generalFeedback: phase3?.generalFeedback,
    tutorClosingNote: phase3?.tutorClosingNote,
    modelUpgrade: phase3?.modelUpgrade,
  });
}

/**
 * Full-Essay Grading (Task 1 & Task 2):
 * 1) Try full single-shot whole-essay grading.
 * 2) If response is too long / times out -> automatically split into 3 focused phases:
 *    - Phase 1: TA/TR (8.0) + CC (8.5) + ccChecklist + wholeEssayStructureFeedback + repetitionAlerts
 *    - Phase 2: GRA (8.0) + LR (7.5) + grammarErrors + vocabularyTips
 *    - Phase 3: paragraphBreakdown + tutorClosingNote + generalFeedback + modelUpgrade
 */
export async function gradeFullEssayResilient(
  basePayload: Record<string, any> & { previousAttempt?: PreviousAttemptSummary | null },
  options: { signal?: AbortSignal; onStatus?: (msg: string) => void } = {}
): Promise<FullEssayGradeResult> {
  const { signal, onStatus } = options;
  const endpoint = '/api/ai/full-essay-grade';

  try {
    onStatus?.('Gia sư AI đang chấm chữa chuyên sâu toàn bài (8.0 TA/TR · 8.5 CC · 8.0 GRA · 7.5 LR)...');
    const full = await postWritingAiOnce<FullEssayGradeResult>(endpoint, basePayload, {
      timeoutMs: 58_000,
      signal,
    });
    if (full?.criteria?.task && full?.criteria?.cc && full?.criteria?.gra && full?.criteria?.lr) {
      return normalizeFullEssayGradeResult(full);
    }
  } catch (err: any) {
    if (err?.name === 'AbortError' || !isRetriableError(err)) throw err;
    console.warn('[full-essay-grade] Full grade failed, switching to 3-phase chunked fallback:', err?.message);
  }

  onStatus?.('Bài viết & nhận xét toàn bài dài — tự động chia nhỏ bước 1/3: Chấm TA/TR (8.0) & 5 quy luật CC (8.5)...');
  const phase1 = await postWritingAi<any>(
    endpoint,
    { ...basePayload, phase: 'task-cc' },
    { timeoutMs: 45_000, signal, maxRetries: 2, onStatus }
  );

  onStatus?.('Đang xử lý bước 2/3: Soi GRA (8.0), LR (7.5), lỗi ngữ pháp & collocation toàn bài...');
  const phase2 = await postWritingAi<any>(
    endpoint,
    {
      ...basePayload,
      phase: 'gra-lr',
      phase1Context: {
        taskBand: phase1?.criteria?.task?.band,
        taskReason: phase1?.criteria?.task?.reason,
        taskMappings: phase1?.criteria?.task?.mappings,
        ccBand: phase1?.criteria?.cc?.band,
        ccReason: phase1?.criteria?.cc?.reason,
        ccChecklist: phase1?.ccChecklist,
        ccMappings: phase1?.criteria?.cc?.mappings,
        repetitionAlerts: phase1?.repetitionAlerts,
      },
    },
    { timeoutMs: 45_000, signal, maxRetries: 2, onStatus }
  );

  onStatus?.('Đang xử lý bước 3/3: Mổ xẻ từng đoạn & viết lời chốt nhận xét của Gia sư Writing...');
  const phase3 = await postWritingAi<any>(
    endpoint,
    {
      ...basePayload,
      phase: 'paragraphs-tutor',
      criteriaContext: {
        task: phase1?.criteria?.task,
        cc: phase1?.criteria?.cc,
        ccChecklist: phase1?.ccChecklist,
        gra: phase2?.criteria?.gra,
        lr: phase2?.criteria?.lr,
        wholeEssayStructureFeedback: phase1?.wholeEssayStructureFeedback,
        repetitionAlerts: phase1?.repetitionAlerts,
      },
    },
    { timeoutMs: 45_000, signal, maxRetries: 2, onStatus }
  );

  return normalizeFullEssayGradeResult({
    criteria: {
      task: phase1?.criteria?.task,
      cc: phase1?.criteria?.cc,
      gra: phase2?.criteria?.gra,
      lr: phase2?.criteria?.lr,
    },
    ccChecklist: phase1?.ccChecklist || [],
    ccFlowAudit: phase1?.ccFlowAudit || [],
    wholeEssayStructureFeedback: phase1?.wholeEssayStructureFeedback,
    repetitionAlerts: phase1?.repetitionAlerts || [],
    grammarErrors: phase2?.grammarErrors || [],
    vocabularyTips: phase2?.vocabularyTips || [],
    paragraphBreakdown: phase3?.paragraphBreakdown || [],
    generalFeedback: phase3?.generalFeedback,
    tutorClosingNote: phase3?.tutorClosingNote,
    modelUpgrade: phase3?.modelUpgrade,
  });
}
