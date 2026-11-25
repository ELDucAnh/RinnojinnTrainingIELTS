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
import {
  normalizeCambridgeGradeResult,
  normalizeDetailedTemplate,
  normalizeOutlineEvaluation,
  type CambridgeGradeResult,
  type DetailedEssayTemplate,
  type DetailedParagraphTemplate,
  type GuidedTaskType,
  type OutlineEvaluationResult,
  type UserOutlineParagraph,
} from '@/lib/writing-guided-types';

export interface WritingAiFetchOptions {
  timeoutMs?: number;
  signal?: AbortSignal;
  maxRetries?: number;
  onStatus?: (msg: string) => void;
}

class WritingAiHttpError extends Error {
  public readonly status: number;
  public readonly retriable: boolean;
  public readonly retryAfterSeconds?: number;

  constructor(
    message: string,
    status: number,
    retriable: boolean,
    retryAfterSeconds?: number
  ) {
    super(message);
    this.name = 'WritingAiHttpError';
    this.status = status;
    this.retriable = retriable;
    this.retryAfterSeconds = retryAfterSeconds;
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

/**
 * Khi tài khoản Free Tier tạm chạm trần RPM/TPM theo cửa sổ 60 giây của Google,
 * tự động đếm ngược chờ đủ thời gian hồi quota rồi tiếp tục (thay vì retry dồn dập sau 2s gây sập 429 liên hoàn!).
 */
async function sleepWithRateLimitCountdown(
  seconds: number,
  onStatus?: (msg: string) => void,
  signal?: AbortSignal
): Promise<void> {
  const totalSec = Math.max(2, Math.round(seconds));
  for (let remaining = totalSec; remaining > 0; remaining--) {
    onStatus?.(
      `Tài khoản Free Tier đang hồi hạn mức phút — tự động tiếp tục sau ${remaining}s (không mất dữ liệu)...`
    );
    await sleep(1000, signal);
  }
}

/**
 * Rút gọn dữ liệu `vocabPrep` khi đính kèm vào các request lập dàn ý để giảm ~85% dung lượng input token (tránh chạm trần 15.000 TPM Free Tier).
 */
function compactVocabPrepForPrompt(vocabPrep?: WritingVocabPrep | null): WritingVocabPrep | undefined {
  if (!vocabPrep) return undefined;
  return {
    essayType: vocabPrep.essayType,
    promptAnalysis: vocabPrep.promptAnalysis,
    paraphraseTable: (vocabPrep.paraphraseTable || []).map((row) => ({
      originalTerm: row.originalTerm,
      meaningVi: row.meaningVi,
      alternatives: (row.alternatives || []).slice(0, 4),
    })),
    collocationGroups: (vocabPrep.collocationGroups || []).map((g) => ({
      groupTitle: g.groupTitle,
      items: (g.items || []).slice(0, 5).map((it) => ({
        phrase: it.phrase,
        meaningVi: it.meaningVi,
      })),
    })),
  };
}

/**
 * Rút gọn `outline` khi gửi lên API chấm bài lẻ / chấm toàn bài để tiết kiệm hàng nghìn input tokens mỗi pha.
 */
function compactOutlineForGrade(outline?: OutlineBodyItem[]): any[] | undefined {
  if (!Array.isArray(outline) || outline.length === 0) return undefined;
  return outline.map((item) => ({
    bodyIndex: item.bodyIndex,
    role: item.role,
    targetSentenceCount: item.targetSentenceCount,
    sentenceMixSummary: item.sentenceMixSummary,
    viGuide: item.viGuide,
    bandStrategy: item.bandStrategy,
    ideaGuides: (item.ideaGuides || []).map((ig) => ({
      sentenceNumber: ig.sentenceNumber,
      sentenceType: ig.sentenceType,
      ideaLabel: ig.ideaLabel,
      ccLinkPhrases: ig.ccLinkPhrases,
      vocabPhrases: (ig.vocabPhrases || []).map((v) => ({ phrase: v.phrase, meaning: v.meaning })),
    })),
  }));
}

function isRetriableError(err: any): boolean {
  if (err?.name === 'AbortError') return false;
  if (err instanceof WritingAiHttpError) return err.retriable;
  const msg = String(err?.message || err || '');
  if (msg.includes('Chưa cấu hình GEMINI_API_KEY') || msg.includes('không hợp lệ')) return false;
  if (msg.includes('quá ngắn') || msg.includes('tối thiểu') || msg.includes('Thiếu dữ liệu')) return false;
  return true;
}

async function postWritingAiOnce<T = any>(
  url: string,
  payload: unknown,
  options: { timeoutMs?: number; signal?: AbortSignal } = {}
): Promise<T> {
  const { timeoutMs = 56_000, signal: externalSignal } = options;
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
      const retryAfterSec =
        typeof parsed?.retryAfterSeconds === 'number' ? parsed.retryAfterSeconds : undefined;
      if (parsed?.error) {
        throw new WritingAiHttpError(parsed.error, res.status, retriable, retryAfterSec);
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
      throw new WritingAiHttpError(`Lỗi máy chủ (${res.status}).`, res.status, retriable, retryAfterSec);
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
    throw new WritingAiHttpError(err?.message || 'Lỗi kết nối tới server AI.', 503, true);
  } finally {
    clearTimeout(timer);
    if (externalSignal) {
      externalSignal.removeEventListener('abort', onExternalAbort);
    }
  }
}

/**
 * Shared client helper for Writing Task 1 / Task 2 AI endpoints.
 * Tự động chờ hồi cửa sổ 60s Free Tier nếu gặp 429 (14s -> 22s -> 28s = tổng 64s vượt trọn 1 phút của Google!).
 */
export async function postWritingAi<T = any>(
  url: string,
  payload: unknown,
  options: WritingAiFetchOptions = {}
): Promise<T> {
  const { timeoutMs = 54_000, signal, maxRetries = 3, onStatus } = options;
  let lastError: any;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await postWritingAiOnce<T>(url, payload, { timeoutMs, signal });
    } catch (err: any) {
      lastError = err;
      if (!isRetriableError(err) || attempt >= maxRetries) {
        throw err;
      }

      if (err instanceof WritingAiHttpError && err.status === 429) {
        const defaultBackoffs = [14, 22, 28];
        const waitSec = err.retryAfterSeconds
          ? Math.max(err.retryAfterSeconds, defaultBackoffs[attempt] || 20)
          : defaultBackoffs[attempt] || 22;
        await sleepWithRateLimitCountdown(waitSec, onStatus, signal);
      } else {
        const delayMs = 1500 * (attempt + 1);
        onStatus?.(`AI phản hồi chậm — tự động thử lại lần ${attempt + 2}/${maxRetries + 1}...`);
        await sleep(delayMs, signal);
      }
    }
  }

  throw lastError;
}

// ─── Micro-Chunked Paced Orchestrators (Chia nhỏ ngay từ đầu để bảo vệ tuyệt đối TPM/RPM Free Tier!) ───

const INTER_CHUNK_PACE_MS = 1300; // Nghỉ nhẹ 1.3s giữa các mảnh nhỏ để giãn đều TPM/RPM

/**
 * Bảng Từ vựng & Paraphrase (Task 1 & Task 2):
 * Chia sẵn thành 2 bước gọn nhẹ thay vì nhồi 1 request khổng lồ:
 * - Bước 1/2: Phân tích đề & Bảng Paraphrase từ khóa
 * - Bước 2/2: Kho cụm Collocation LR 7.5 sát đề
 */
export async function generateVocabPrepResilient(
  payload:
    | { taskType: 'task1'; chartData: ChartData }
    | { taskType: 'task2'; prompt: string; stanceHint?: string },
  options: { signal?: AbortSignal; onStatus?: (msg: string) => void } = {}
): Promise<WritingVocabPrep> {
  const { signal, onStatus } = options;
  const endpoint = '/api/ai/writing-vocab-prep';

  onStatus?.('Bước 1/2: Đang lập bảng Paraphrase từ khóa tránh lặp từ (model nhẹ Free Tier)...');
  const p1 = await postWritingAi<any>(
    endpoint,
    { ...payload, phase: 'paraphrase' },
    { timeoutMs: 42_000, signal, maxRetries: 3, onStatus }
  );

  await sleep(INTER_CHUNK_PACE_MS, signal);

  onStatus?.('Bước 2/2: Đang tổng hợp kho cụm Collocation chuẩn LR 7.5 sát đề...');
  const compactSummary = Array.isArray(p1?.paraphraseTable)
    ? p1.paraphraseTable.map((r: any) => ({
      originalTerm: r.originalTerm,
      alternatives: (r.alternatives || []).slice(0, 3),
    }))
    : [];

  const p2 = await postWritingAi<any>(
    endpoint,
    { ...payload, phase: 'collocations', paraphraseSummary: compactSummary },
    { timeoutMs: 42_000, signal, maxRetries: 3, onStatus }
  );

  return normalizeVocabPrep({
    ...p1,
    collocationGroups: p2?.collocationGroups || [],
  });
}

/**
 * Dàn ý Task 1 (4 Body):
 * Chia nhỏ trực tiếp thành 2 chặng gọn nhẹ ([Body 1 & 2] -> [Body 3 & 4]) để không bao giờ vượt trần TPM Free Tier!
 * Nếu một chặng 2 Body quá dài, tự động tách xuống từng Body đơn lẻ.
 */
export async function generateTask1OutlineResilient(
  chartData: ChartData,
  options: {
    signal?: AbortSignal;
    onStatus?: (msg: string) => void;
    vocabPrep?: WritingVocabPrep | null;
  } = {}
): Promise<OutlineBodyItem[]> {
  const { signal, onStatus, vocabPrep } = options;
  const slimVocab = compactVocabPrepForPrompt(vocabPrep);
  const collected: any[] = [];
  const chunkGroups: number[][] = [
    [0, 1],
    [2, 3],
  ];

  for (let gIdx = 0; gIdx < chunkGroups.length; gIdx++) {
    if (gIdx > 0) {
      await sleep(INTER_CHUNK_PACE_MS, signal);
    }

    const group = chunkGroups[gIdx];
    onStatus?.(
      `Chặng ${gIdx + 1}/${chunkGroups.length}: Đang thiết kế chi tiết Body ${group.map((i) => i + 1).join(' & ')}/4...`
    );

    try {
      const chunkRes = await postWritingAi<{ outlineChunk: any[] }>(
        '/api/ai/task1-generate',
        {
          mode: 'outline-chunk',
          chartData,
          vocabPrep: slimVocab,
          bodyIndices: group,
          previousOutlineSummary: collected.map((o) => ({
            bodyIndex: o.bodyIndex,
            role: o.role,
            viGuide: o.viGuide,
          })),
        },
        { timeoutMs: 44_000, signal, maxRetries: 2, onStatus }
      );
      if (Array.isArray(chunkRes?.outlineChunk) && chunkRes.outlineChunk.length > 0) {
        collected.push(...chunkRes.outlineChunk);
        continue;
      }
      throw new Error('Chunk dàn ý trả về rỗng');
    } catch (chunkErr: any) {
      if (chunkErr?.name === 'AbortError' || !isRetriableError(chunkErr)) throw chunkErr;
      for (const singleIdx of group) {
        await sleep(INTER_CHUNK_PACE_MS, signal);
        onStatus?.(`Đang chia siêu nhỏ — thiết kế riêng Body ${singleIdx + 1}/4...`);
        const singleRes = await postWritingAi<{ outlineChunk: any[] }>(
          '/api/ai/task1-generate',
          {
            mode: 'outline-chunk',
            chartData,
            vocabPrep: slimVocab,
            bodyIndices: [singleIdx],
            previousOutlineSummary: collected.map((o) => ({
              bodyIndex: o.bodyIndex,
              role: o.role,
              viGuide: o.viGuide,
            })),
          },
          { timeoutMs: 40_000, signal, maxRetries: 3, onStatus }
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
 * Dàn ý Task 2 (5 Body):
 * Chia nhỏ trực tiếp thành 3 chặng gọn nhẹ ([Body 1 & 2] -> [Body 3 & 4] -> [Body 5]) kèm nén gọn bảng từ vựng,
 * giúp mỗi lượt gọi chỉ tốn ~2.000–2.800 tokens (thấp hơn 5 lần so với trần 15.000 TPM Free Tier!).
 */
export async function generateTask2OutlineResilient(
  params: { prompt: string; stanceHint?: string; vocabPrep?: WritingVocabPrep | null },
  options: { signal?: AbortSignal; onStatus?: (msg: string) => void } = {}
): Promise<Task2OutlineResponse> {
  const { signal, onStatus } = options;
  const slimVocab = compactVocabPrepForPrompt(params.vocabPrep);

  let essayType = params.vocabPrep?.essayType || 'IELTS Writing Task 2';
  let promptAnalysis = params.vocabPrep?.promptAnalysis || '';
  const collected: any[] = [];
  const chunkGroups: number[][] = [
    [0, 1],
    [2, 3],
    [4],
  ];

  for (let gIdx = 0; gIdx < chunkGroups.length; gIdx++) {
    if (gIdx > 0) {
      await sleep(INTER_CHUNK_PACE_MS, signal);
    }

    const group = chunkGroups[gIdx];
    onStatus?.(
      `Chặng ${gIdx + 1}/${chunkGroups.length}: Đang lập dàn ý chi tiết Body ${group.map((i) => i + 1).join(' & ')}/5...`
    );

    const requestBodyFor = (indices: number[]) => ({
      mode: 'chunk' as const,
      prompt: params.prompt,
      stanceHint: params.stanceHint || '',
      vocabPrep: slimVocab,
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
        timeoutMs: 44_000,
        signal,
        maxRetries: 2,
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
      for (const singleIdx of group) {
        await sleep(INTER_CHUNK_PACE_MS, signal);
        onStatus?.(`Đang chia siêu nhỏ — thiết kế riêng Body ${singleIdx + 1}/5...`);
        const singleRes = await postWritingAi<{
          essayType?: string;
          promptAnalysis?: string;
          outlineChunk: any[];
        }>('/api/ai/task2-outline', requestBodyFor([singleIdx]), {
          timeoutMs: 40_000,
          signal,
          maxRetries: 3,
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
 * Chấm từng Body (Task 1 & Task 2):
 * Chạy thẳng theo 3 bước nhỏ tuần tự (tránh gửi 1 request 8.192 tokens dễ gãy JSON & nổ TPM trên Free Tier!):
 * - Bước 1/3: Chấm TA/TR (8.0) & 5 quy luật CC (8.5) + ccFlowAudit
 * - Bước 2/3: Chấm GRA (8.0) & LR (7.5) + grammarErrors + vocabularyTips
 * - Bước 3/3: Gia sư tổng hợp lời chốt tiếng Việt + modelUpgrade
 */
export async function gradeBodyResilient(
  endpoint: '/api/ai/task1-grade' | '/api/ai/task2-grade',
  basePayload: Record<string, any> & { previousAttempt?: PreviousAttemptSummary | null },
  options: { signal?: AbortSignal; onStatus?: (msg: string) => void } = {}
): Promise<BodyGradeResult> {
  const { signal, onStatus } = options;
  const slimPayload = {
    ...basePayload,
    outline: compactOutlineForGrade(basePayload.outline),
  };

  // Bước 1/3: Task + CC
  onStatus?.('Bước 1/3: Đang chấm TA/TR (8.0) & kiểm tra 5 quy luật CC cố định (8.5)...');
  const phase1 = await postWritingAi<any>(
    endpoint,
    { ...slimPayload, phase: 'task-cc' },
    { timeoutMs: 44_000, signal, maxRetries: 3, onStatus }
  );

  await sleep(INTER_CHUNK_PACE_MS, signal);

  // Bước 2/3: GRA + LR (đồng bộ với Bước 1)
  onStatus?.('Bước 2/3: Đang chấm GRA (8.0) & LR (7.5) đồng bộ với mạch sửa câu...');
  const phase2 = await postWritingAi<any>(
    endpoint,
    {
      ...slimPayload,
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
    { timeoutMs: 44_000, signal, maxRetries: 3, onStatus }
  );

  await sleep(INTER_CHUNK_PACE_MS, signal);

  // Bước 3/3: Tutor Closing Verdict + generalFeedback + modelUpgrade (bỏ outline nặng vì đã có đủ 4 tiêu chí)
  onStatus?.('Bước 3/3: Gia sư Writing đang tổng hợp nhận xét chi tiết bằng tiếng Việt...');
  const phase3 = await postWritingAi<any>(
    endpoint,
    {
      ...slimPayload,
      outline: undefined,
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
    { timeoutMs: 42_000, signal, maxRetries: 3, onStatus }
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
 * Chấm chữa Toàn bài (Full Essay — Task 1 & Task 2):
 * Chạy thẳng theo 3 bước nhỏ tuần tự để giữ mỗi lượt gọi gọn nhẹ trên tài khoản Free Tier:
 * - Bước 1/3: TA/TR (8.0) + 5 quy luật CC (8.5) + ccFlowAudit + repetitionAlerts
 * - Bước 2/3: GRA (8.0) + LR (7.5) + grammarErrors + vocabularyTips
 * - Bước 3/3: Mổ xẻ từng đoạn + Lời chốt Gia sư + Bài nâng cấp tham khảo
 */
export async function gradeFullEssayResilient(
  basePayload: Record<string, any> & { previousAttempt?: PreviousAttemptSummary | null },
  options: { signal?: AbortSignal; onStatus?: (msg: string) => void } = {}
): Promise<FullEssayGradeResult> {
  const { signal, onStatus } = options;
  const endpoint = '/api/ai/full-essay-grade';
  const slimPayload = {
    ...basePayload,
    outline: compactOutlineForGrade(basePayload.outline),
  };

  onStatus?.('Bước 1/3: Đang chấm TA/TR (8.0) & kiểm tra 5 quy luật CC (8.5) toàn bài...');
  const phase1 = await postWritingAi<any>(
    endpoint,
    { ...slimPayload, phase: 'task-cc' },
    { timeoutMs: 46_000, signal, maxRetries: 3, onStatus }
  );

  await sleep(INTER_CHUNK_PACE_MS, signal);

  onStatus?.('Bước 2/3: Đang soi chi tiết GRA (8.0), LR (7.5), ngữ pháp & collocation toàn bài...');
  const phase2 = await postWritingAi<any>(
    endpoint,
    {
      ...slimPayload,
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
    { timeoutMs: 46_000, signal, maxRetries: 3, onStatus }
  );

  await sleep(INTER_CHUNK_PACE_MS, signal);

  onStatus?.('Bước 3/3: Đang mổ xẻ từng đoạn & viết lời chốt nhận xét của Gia sư Writing...');
  const phase3 = await postWritingAi<any>(
    endpoint,
    {
      ...slimPayload,
      outline: undefined,
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
    { timeoutMs: 46_000, signal, maxRetries: 3, onStatus }
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

// ─── New Aim 6.5+ Guided Writing Orchestrators (User Vietnamese Outline -> Detailed Template -> Cambridge Grade) ───

/**
 * Bước 1 -> 2A: Gia sư AI đánh giá tiêu chí TA/TR của dàn ý tiếng Việt do học viên tự chia đoạn (Gate >= 7.0).
 */
export async function evaluateUserOutlineResilient(
  params: {
    taskType: GuidedTaskType;
    promptText: string;
    imageDataUrl?: string;
    userParagraphs: UserOutlineParagraph[];
  },
  options: { signal?: AbortSignal; onStatus?: (msg: string) => void } = {}
): Promise<OutlineEvaluationResult> {
  const { signal, onStatus } = options;
  onStatus?.(
    params.taskType === 'task1' && params.imageDataUrl
      ? 'Gia sư AI đang đọc ảnh đề Task 1 & kiểm định TA dàn ý tiếng Việt của bạn (chuẩn >= 7.0)...'
      : `Gia sư AI đang kiểm định ${params.taskType === 'task1' ? 'TA' : 'TR'} dàn ý tiếng Việt của bạn (chuẩn >= 7.0)...`
  );

  const raw = await postWritingAi<OutlineEvaluationResult>(
    '/api/ai/writing-template',
    {
      mode: 'evaluate-outline',
      taskType: params.taskType,
      promptText: params.promptText,
      imageDataUrl: params.imageDataUrl,
      userParagraphs: params.userParagraphs,
    },
    { timeoutMs: 48_000, signal, maxRetries: 3, onStatus }
  );

  return normalizeOutlineEvaluation(raw, params.userParagraphs);
}

/**
 * Bước 2B: Sau khi dàn ý đạt TA/TR >= 7.0, dựng Template SIÊU CHI TIẾT cho nguyên bài
 * theo từng chặng 1–2 đoạn có nhịp nghỉ 1.3s để đảm bảo chi tiết tối đa và KHÔNG bao giờ nổ TPM Free Tier!
 */
export async function buildDetailedTemplateResilient(
  params: {
    taskType: GuidedTaskType;
    promptText: string;
    userParagraphs: UserOutlineParagraph[];
    evaluation: OutlineEvaluationResult;
  },
  options: { signal?: AbortSignal; onStatus?: (msg: string) => void } = {}
): Promise<DetailedEssayTemplate> {
  const { signal, onStatus } = options;
  const total = params.userParagraphs.length;

  // Chia chặng 2 đoạn/lượt (nếu tổng lẻ, đoạn cuối đi 1 mình) — nếu 2 đoạn quá dài tự rớt xuống 1 đoạn/lượt
  const chunkGroups: number[][] = [];
  for (let i = 0; i < total; i += 2) {
    if (i + 1 < total) chunkGroups.push([i, i + 1]);
    else chunkGroups.push([i]);
  }

  const collected: DetailedParagraphTemplate[] = [];
  let overallStrategyVi = '';
  let targetWordCount = '';
  let substitutionMatrix: any[] = [];

  for (let gIdx = 0; gIdx < chunkGroups.length; gIdx++) {
    if (gIdx > 0) {
      await sleep(INTER_CHUNK_PACE_MS, signal);
    }

    const group = chunkGroups[gIdx];
    const isLastGroup = gIdx === chunkGroups.length - 1;
    onStatus?.(
      `Đang dựng Template siêu chi tiết (GRA & CC > 7 · Conjunction Band 8) — Đoạn ${group
        .map((i) => i + 1)
        .join(' & ')}/${total}...`
    );

    const buildPreviousSummary = () =>
      collected.map((p) => ({
        paragraphIndex: p.paragraphIndex,
        heading: p.userHeading,
        usedConnectors: p.sentences.map((s) => s.conjunctionBand8.usedConnector).filter(Boolean),
        usedGrammar: p.sentences.map((s) => s.advancedGrammar.structureName).filter(Boolean),
      }));

    try {
      const res = await postWritingAi<{
        overallStrategyVi?: string;
        targetWordCount?: string;
        paragraphs: DetailedParagraphTemplate[];
        substitutionMatrix?: any[];
      }>(
        '/api/ai/writing-template',
        {
          mode: 'build-template-chunk',
          taskType: params.taskType,
          promptText: params.promptText,
          chartOrPromptSummaryEn: params.evaluation.chartOrPromptSummaryEn,
          userParagraphs: params.userParagraphs,
          targetIndices: group,
          paragraphPlans: params.evaluation.paragraphPlans,
          previousTemplatesSummary: buildPreviousSummary(),
          includeMatrix: isLastGroup,
        },
        { timeoutMs: 48_000, signal, maxRetries: 2, onStatus }
      );

      if (res.overallStrategyVi) overallStrategyVi = res.overallStrategyVi;
      if (res.targetWordCount) targetWordCount = res.targetWordCount;
      if (Array.isArray(res.substitutionMatrix) && res.substitutionMatrix.length > 0) {
        substitutionMatrix = res.substitutionMatrix;
      }
      if (Array.isArray(res.paragraphs) && res.paragraphs.length > 0) {
        collected.push(...res.paragraphs);
        continue;
      }
      throw new Error('Chunk template trả về rỗng');
    } catch (chunkErr: any) {
      if (chunkErr?.name === 'AbortError' || !isRetriableError(chunkErr)) throw chunkErr;
      if (group.length === 1) throw chunkErr;

      // Tách siêu nhỏ xuống từng đoạn 1 để luôn đảm bảo đủ độ chi tiết
      for (let sPos = 0; sPos < group.length; sPos++) {
        const singleIdx = group[sPos];
        await sleep(INTER_CHUNK_PACE_MS, signal);
        onStatus?.(`Đang dựng siêu chi tiết riêng Đoạn ${singleIdx + 1}/${total}...`);
        const singleRes = await postWritingAi<{
          overallStrategyVi?: string;
          targetWordCount?: string;
          paragraphs: DetailedParagraphTemplate[];
          substitutionMatrix?: any[];
        }>(
          '/api/ai/writing-template',
          {
            mode: 'build-template-chunk',
            taskType: params.taskType,
            promptText: params.promptText,
            chartOrPromptSummaryEn: params.evaluation.chartOrPromptSummaryEn,
            userParagraphs: params.userParagraphs,
            targetIndices: [singleIdx],
            paragraphPlans: params.evaluation.paragraphPlans,
            previousTemplatesSummary: buildPreviousSummary(),
            includeMatrix: isLastGroup && sPos === group.length - 1,
          },
          { timeoutMs: 46_000, signal, maxRetries: 3, onStatus }
        );

        if (singleRes.overallStrategyVi) overallStrategyVi = singleRes.overallStrategyVi;
        if (singleRes.targetWordCount) targetWordCount = singleRes.targetWordCount;
        if (Array.isArray(singleRes.substitutionMatrix) && singleRes.substitutionMatrix.length > 0) {
          substitutionMatrix = singleRes.substitutionMatrix;
        }
        if (Array.isArray(singleRes.paragraphs)) {
          collected.push(...singleRes.paragraphs);
        }
      }
    }
  }

  return normalizeDetailedTemplate(
    collected,
    { overallStrategyVi, targetWordCount, substitutionMatrix },
    params.taskType
  );
}

/**
 * Bước 4: Gia sư AI chấm bài viết hoàn chỉnh của học viên theo Official Cambridge IELTS Band Descriptors
 * (chạy 3 pha nhỏ tuần tự có nhịp nghỉ 1.3s để bảo vệ Free Tier & giữ độ chi tiết tối đa).
 */
export async function gradeCambridgeEssayResilient(
  params: {
    taskType: GuidedTaskType;
    promptText: string;
    imageDataUrl?: string;
    chartOrPromptSummaryEn?: string;
    userParagraphs: UserOutlineParagraph[];
    template?: DetailedEssayTemplate | null;
    essay: string;
    previousGrade?: CambridgeGradeResult | null;
  },
  options: { signal?: AbortSignal; onStatus?: (msg: string) => void } = {}
): Promise<CambridgeGradeResult> {
  const { signal, onStatus } = options;
  const endpoint = '/api/ai/cambridge-grade';

  const compactTemplateSummary = params.template
    ? params.template.paragraphs
        .map(
          (p) =>
            `Đoạn ${p.paragraphIndex + 1} (${p.userHeading}): ${p.assembledParagraphTemplate}`
        )
        .join('\n')
        .slice(0, 1800)
    : '';

  const previousGradeSummary = params.previousGrade
    ? `Lần trước: Overall ${params.previousGrade.overallBand.toFixed(1)} (TA/TR ${params.previousGrade.criteria.task.band.toFixed(1)}, CC ${params.previousGrade.criteria.cc.band.toFixed(1)}, LR ${params.previousGrade.criteria.lr.band.toFixed(1)}, GRA ${params.previousGrade.criteria.gra.band.toFixed(1)}). Ưu tiên cũ: ${params.previousGrade.top3PrioritiesVi.join(' | ')}`
    : '';

  const basePayload = {
    taskType: params.taskType,
    promptText: params.promptText,
    chartOrPromptSummaryEn: params.chartOrPromptSummaryEn || '',
    userParagraphs: params.userParagraphs,
    templateSummary: compactTemplateSummary,
    previousGradeSummary,
    essay: params.essay,
  };

  // Pha 1/3: TA/TR & CC (gửi kèm ảnh biểu đồ nếu là Task 1 để kiểm số liệu chính xác)
  onStatus?.(
    `Bước 1/3: Gia sư đang chấm ${params.taskType === 'task1' ? 'TA' : 'TR'} & CC chuẩn Cambridge Band Descriptors...`
  );
  const p1 = await postWritingAi<any>(
    endpoint,
    {
      ...basePayload,
      imageDataUrl: params.taskType === 'task1' ? params.imageDataUrl : undefined,
      phase: 'task-cc',
    },
    { timeoutMs: 48_000, signal, maxRetries: 3, onStatus }
  );

  await sleep(INTER_CHUNK_PACE_MS, signal);

  // Pha 2/3: LR & GRA
  onStatus?.('Bước 2/3: Gia sư đang chấm LR & GRA, soi lỗi ngữ pháp & từ vựng chuẩn Cambridge...');
  const p2 = await postWritingAi<any>(
    endpoint,
    {
      ...basePayload,
      phase: 'lr-gra',
      phase1Context: {
        taskBand: p1?.criteria?.task?.band,
        taskReason: p1?.criteria?.task?.reasonVi,
        ccBand: p1?.criteria?.cc?.band,
        ccReason: p1?.criteria?.cc?.reasonVi,
      },
    },
    { timeoutMs: 48_000, signal, maxRetries: 3, onStatus }
  );

  await sleep(INTER_CHUNK_PACE_MS, signal);

  // Pha 3/3: Nhận xét từng đoạn & Gia sư chốt tổng thể
  onStatus?.('Bước 3/3: Gia sư Writing đang tổng hợp nhận xét chung & 3 ưu tiên sửa bài...');
  const p3 = await postWritingAi<any>(
    endpoint,
    {
      ...basePayload,
      phase: 'tutor-verdict',
      phase2Context: {
        task: { band: p1?.criteria?.task?.band, weaknesses: p1?.criteria?.task?.weaknessesVi },
        cc: { band: p1?.criteria?.cc?.band, weaknesses: p1?.criteria?.cc?.weaknessesVi },
        lr: { band: p2?.criteria?.lr?.band, weaknesses: p2?.criteria?.lr?.weaknessesVi },
        gra: { band: p2?.criteria?.gra?.band, weaknesses: p2?.criteria?.gra?.weaknessesVi },
        advancedGrammarUsedWell: p2?.advancedGrammarUsedWell || [],
      },
    },
    { timeoutMs: 46_000, signal, maxRetries: 3, onStatus }
  );

  return normalizeCambridgeGradeResult({
    criteria: {
      task: p1?.criteria?.task,
      cc: p1?.criteria?.cc,
      lr: p2?.criteria?.lr,
      gra: p2?.criteria?.gra,
    },
    advancedGrammarUsedWell: p2?.advancedGrammarUsedWell || [],
    grammarErrors: p2?.grammarErrors || [],
    vocabularyTips: p2?.vocabularyTips || [],
    paragraphReviews: p3?.paragraphReviews || [],
    templateUsageFeedbackVi: p3?.templateUsageFeedbackVi || '',
    tutorOverallFeedbackVi: p3?.tutorOverallFeedbackVi || '',
    top3PrioritiesVi: p3?.top3PrioritiesVi || [],
  });
}
