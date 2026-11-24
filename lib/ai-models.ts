// lib/ai-models.ts
// Cấu hình model Google AI Studio tối ưu riêng cho TÀI KHOẢN MIỄN PHÍ (Free Tier — cuối 2026).
//
// Nguyên tắc sống còn trên Free Tier (đã kiểm chứng từ tài liệu & telemetry Google AI Studio):
// 1. Dòng Flash nặng / Frontier (`gemini-3.8-flash`, `gemini-4-hydrogen`) bị siết rất gắt trên Free Tier
//    (thường chỉ ~5 RPM và ~20 RPD/ngày) -> nếu đặt ở đầu chuỗi sẽ cạn sạch quota chỉ sau 2–3 bài!
// 2. Dòng nhẹ `Flash-Lite` (`gemini-3.5-flash-lite`, `gemini-3.1-flash-lite`) và họ Open-Weights
//    `Gemma 4 / Gemma 3` (`gemma-4-26b-a4b-it`, `gemma-3-27b-it`, `gemma-3-12b-it`, `gemma-4-31b-it`)
//    có hạn mức Free Tier cực kỳ rộng rãi (~15–30 RPM, 500 -> 14.400 RPD/ngày!), miễn là mỗi request
//    được CHIA NHỎ GỌN để không vượt trần 15.000 TPM (Tokens Per Minute).
// 3. Không dùng các alias trùng lặp (`gemini-flash-lite-latest`, `gemini-flash-latest`) vì dùng chung
//    bucket quota với model gốc gây lãng phí lượt thử khi gặp 429.

export type GeminiModelProfile = 'fast' | 'grading';

/**
 * Chuỗi model NHẸ - QUOTA CAO cho Tạo bảng từ vựng, Tạo đề & Dàn ý Task 1 / Task 2, Nhận xét Gia sư:
 * - Tầng 1 (Native JSON, nhanh, ~15 RPM / ~500 RPD mỗi model): `gemini-3.5-flash-lite` -> `gemini-3.1-flash-lite`
 * - Tầng 2 (Open-weights Free Tier siêu rộng: 30 RPM / 14.400 RPD!):
 *   `gemma-4-26b-a4b-it` (MoE 4B active siêu nhẹ) -> `gemma-3-27b-it` -> `gemma-3-12b-it` -> `gemma-4-31b-it`
 * - Tầng 3 (Dự phòng cuối cùng nếu cả 2 tầng trên bận): `gemini-3.6-flash`
 */
export const GEMINI_FREE_TIER_FAST_MODELS: readonly string[] = [
  'gemini-3.5-flash-lite',
  'gemini-3.1-flash-lite',
  'gemma-4-26b-a4b-it',
  'gemma-3-27b-it',
  'gemma-3-12b-it',
  'gemma-4-31b-it',
  'gemini-3.6-flash',
];

/**
 * Chuỗi model NHẸ - CHẤM BÀI CHUẨN cho Task 1, Task 2 & Toàn bài:
 * (Do hệ thống đã khóa cứng 5 quy luật CC đếm được R1–R5 + công thức quy đổi điểm trong TypeScript ở temperature 0.1,
 * các model nhẹ `flash-lite` & `gemma-4-31b/26b` chấm hoàn toàn chính xác mà KHÔNG làm cháy quota 20 RPD/ngày của dòng nặng!)
 */
export const GEMINI_FREE_TIER_GRADING_MODELS: readonly string[] = [
  'gemini-3.5-flash-lite',
  'gemini-3.1-flash-lite',
  'gemma-4-31b-it',
  'gemma-4-26b-a4b-it',
  'gemma-3-27b-it',
  'gemma-3-12b-it',
  'gemini-3.6-flash',
];

/**
 * Danh sách model mở rộng dự phòng dùng để hiển thị trong `/api/models`.
 */
export const GEMINI_OPEN_WEIGHTS_FREE_FALLBACKS: readonly string[] = [
  'gemma-4-26b-a4b-it',
  'gemma-3-27b-it',
  'gemma-3-12b-it',
  'gemma-4-31b-it',
];

/**
 * Danh sách mặc định tương thích ngược cho các route AI khác trong ứng dụng
 * (Reading, Listening, Translation, Dialogue, Conversation... — chỉ chứa model hỗ trợ native `responseMimeType: "application/json"`).
 */
export const GEMINI_FALLBACK_MODELS: string[] = [
  'gemini-3.5-flash-lite',
  'gemini-3.1-flash-lite',
  'gemini-3.6-flash',
];

/**
 * Kiểm tra xem một mã model có thuộc diện:
 * 1) Đã bị Google ngừng hỗ trợ / khóa 404 với tài khoản Free mới (`gemini-1.x`, `gemini-2.0`, `gemini-2.5`, `gemini-3.5-flash` bản cũ),
 * 2) Chỉ dành cho tài khoản trả phí Billing (`-pro`, `gemini-4-carbon`, `gemini-4-argon`, `gemini-4-neon`), hoặc
 * 3) Không phải model sinh văn bản (`embedding`, `imagen`, `veo`, `tts`, `audio`, `live`, `robotics`, `computer-use`, `aqa`).
 */
export function isBlockedOrPaidOnlyGeminiModel(rawModelId: string): boolean {
  const id = rawModelId.trim().toLowerCase().replace(/^models\//, '');
  if (!id) return true;

  if (
    id.startsWith('gemini-1.') ||
    id.startsWith('gemini-1-') ||
    id.startsWith('gemini-2.0') ||
    id.startsWith('gemini-2.5') ||
    id === 'gemini-pro' ||
    id === 'gemini-3-flash-preview' ||
    id === 'gemini-3.1-flash-lite-preview' ||
    /^gemini-3\.5-flash($|-0)/.test(id)
  ) {
    return true;
  }

  if (
    id.includes('-pro') ||
    id.includes('carbon') ||
    id.includes('argon') ||
    id.includes('neon') ||
    id.includes('ultra')
  ) {
    return true;
  }

  if (
    id.includes('embedding') ||
    id.includes('imagen') ||
    id.includes('veo') ||
    id.includes('tts') ||
    id.includes('audio') ||
    id.includes('live') ||
    id.includes('robotics') ||
    id.includes('computer-use') ||
    id.includes('aqa') ||
    id.includes('image-generation') ||
    id.includes('-image')
  ) {
    return true;
  }

  return false;
}

/**
 * Trả về danh sách ứng viên model nhẹ Free Tier theo profile (hỗ trợ `GEMINI_MODELS_OVERRIDE` nếu cấu hình).
 */
export function getGeminiCandidateModels(profile: GeminiModelProfile = 'fast'): string[] {
  const envOverride = (process.env.GEMINI_MODELS_OVERRIDE || '')
    .split(',')
    .map((m) => m.trim().replace(/^models\//, ''))
    .filter((m) => m.length > 0 && !isBlockedOrPaidOnlyGeminiModel(m));

  const base =
    profile === 'grading' ? GEMINI_FREE_TIER_GRADING_MODELS : GEMINI_FREE_TIER_FAST_MODELS;

  return Array.from(new Set([...envOverride, ...base]));
}
