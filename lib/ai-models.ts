// lib/ai-models.ts
// Danh sách & phân tầng model Google Gemini API (AI Studio Free Tier — cập nhật cuối 2026).
// Tài liệu tham chiếu:
// - https://ai.google.dev/gemini-api/docs/models
// - https://ai.google.dev/gemini-api/docs/pricing (chỉ chọn các model có mục "Free of charge")
// - https://ai.google.dev/gemini-api/docs/deprecations (đã loại bỏ hoàn toàn dòng gemini-2.5-* bị khóa 404 với tài khoản mới/free)

export type GeminiModelProfile = 'fast' | 'grading';

/**
 * Nhóm "fast" (Mặc định cho Tạo bảng từ vựng & Paraphrase, Tạo đề/Dàn ý Task 1 & Task 2, Reading, Listening...):
 * - Ưu tiên số 1: `gemini-3.5-flash-lite` (model được Google khuyến nghị trực tiếp thay thế `gemini-2.5-flash-lite`,
 *   GA từ 07/2026, tốc độ phản hồi cực nhanh và hạn mức RPM/RPD Free Tier rộng rãi nhất).
 * - Tiếp theo xoay vòng qua các bucket Free Tier độc lập: `gemini-3.8-flash` -> `gemini-3.6-flash` ->
 *   `gemini-3.1-flash-lite` -> `gemini-4-hydrogen` (model Gemini 4 duy nhất miễn phí trên Free Tier) ->
 *   alias động chính thức của Google (`gemini-flash-lite-latest`, `gemini-flash-latest`).
 */
export const GEMINI_FREE_TIER_FAST_MODELS: readonly string[] = [
  'gemini-3.5-flash-lite',
  'gemini-3.8-flash',
  'gemini-3.6-flash',
  'gemini-3.1-flash-lite',
  'gemini-4-hydrogen',
  'gemini-flash-lite-latest',
  'gemini-flash-latest',
];

/**
 * Nhóm "grading" (Dành riêng cho Chấm điểm chi tiết Task 1, Task 2 & Toàn bài theo chuẩn IELTS May 2023):
 * - Ưu tiên `gemini-3.8-flash` (model Flash thông minh nhất trên Free Tier) để chấm chuẩn xác 5 quy luật CC cố định,
 *   nhưng lập tức chuyển sang `gemini-3.5-flash-lite` và `gemini-4-hydrogen` ngay khi chạm trần RPM mỗi phút.
 */
export const GEMINI_FREE_TIER_GRADING_MODELS: readonly string[] = [
  'gemini-3.8-flash',
  'gemini-3.5-flash-lite',
  'gemini-4-hydrogen',
  'gemini-3.6-flash',
  'gemini-3.1-flash-lite',
  'gemini-flash-latest',
  'gemini-flash-lite-latest',
];

/**
 * Nhóm cứu hộ cuối cùng (Open-weights Free Tier trên Google AI Studio `v1beta/models`, ~15 RPM riêng biệt).
 * Lưu ý: Gemma chạy ở chế độ text thường (không bật `responseMimeType: "application/json"`).
 */
export const GEMINI_OPEN_WEIGHTS_FREE_FALLBACKS: readonly string[] = [
  'gemma-4-31b-it',
  'gemma-3-27b-it',
];

/**
 * Danh sách mặc định tương thích ngược cho toàn bộ các route AI khác trong ứng dụng
 * (Reading, Listening, Translation, Dialogue, Conversation...).
 * Chỉ chứa các model Gemini Free Tier hỗ trợ native JSON (`responseMimeType: "application/json"`).
 */
export const GEMINI_FALLBACK_MODELS: string[] = [...GEMINI_FREE_TIER_FAST_MODELS];

/**
 * Kiểm tra xem một mã model có thuộc diện:
 * 1) Đã bị Google ngừng hỗ trợ / khóa 404 với tài khoản Free mới (`gemini-1.x`, `gemini-2.0`, `gemini-2.5`, `gemini-3.5-flash` bản cũ, preview đã đóng),
 * 2) Chỉ dành cho tài khoản trả phí Billing (`-pro`, `gemini-4-carbon`, `gemini-4-argon`, `gemini-4-neon`), hoặc
 * 3) Không phải model sinh văn bản (`embedding`, `imagen`, `veo`, `tts`, `audio`, `live`, `robotics`, `computer-use`, `aqa`).
 */
export function isBlockedOrPaidOnlyGeminiModel(rawModelId: string): boolean {
  const id = rawModelId.trim().toLowerCase().replace(/^models\//, '');
  if (!id) return true;

  // Các dòng cũ đã ngừng hoặc bị khóa 404 với user mới
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

  // Các dòng yêu cầu tài khoản trả phí (Paid Tier only — không có Free Tier)
  if (
    id.includes('-pro') ||
    id.includes('carbon') ||
    id.includes('argon') ||
    id.includes('neon') ||
    id.includes('ultra')
  ) {
    return true;
  }

  // Các model chuyên biệt không dùng cho sinh JSON văn bản thông thường
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
 * Trả về danh sách ứng viên model hoàn chỉnh theo profile (kèm hỗ trợ biến môi trường `GEMINI_MODELS_OVERRIDE` nếu có).
 */
export function getGeminiCandidateModels(
  profile: GeminiModelProfile = 'fast',
  includeOpenWeightsBackup = true
): string[] {
  const envOverride = (process.env.GEMINI_MODELS_OVERRIDE || '')
    .split(',')
    .map((m) => m.trim().replace(/^models\//, ''))
    .filter((m) => m.length > 0 && !isBlockedOrPaidOnlyGeminiModel(m));

  const base =
    profile === 'grading' ? GEMINI_FREE_TIER_GRADING_MODELS : GEMINI_FREE_TIER_FAST_MODELS;

  const combined = [
    ...envOverride,
    ...base,
    ...(includeOpenWeightsBackup ? GEMINI_OPEN_WEIGHTS_FREE_FALLBACKS : []),
  ];

  return Array.from(new Set(combined));
}
