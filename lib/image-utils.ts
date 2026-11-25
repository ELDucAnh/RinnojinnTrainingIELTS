// lib/image-utils.ts
// Nén & chuẩn hóa ảnh IELTS Writing Task 1 (từ Ctrl+V clipboard hoặc upload file)
// để gửi lên Gemini multimodal nhanh, nhẹ (< 300KB) và tạo ảnh thu nhỏ lưu lịch sử localStorage.

export interface ProcessedTaskImage {
  dataUrl: string;      // data:image/jpeg;base64,... (max 1280px, gửi lên AI)
  base64: string;       // raw base64 không kèm prefix
  mimeType: string;     // 'image/jpeg'
  thumbDataUrl: string; // ảnh thu nhỏ ~420px để lưu vào localStorage history không bị đầy bộ nhớ
  width: number;
  height: number;
  sizeKB: number;
}

function loadImageFromBlob(blob: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Không thể đọc tệp ảnh. Vui lòng thử ảnh PNG, JPG hoặc WEBP khác.'));
    };
    img.src = url;
  });
}

function renderResizedDataUrl(
  img: HTMLImageElement,
  maxDimension: number,
  quality: number
): { dataUrl: string; width: number; height: number } {
  let targetW = img.naturalWidth || img.width;
  let targetH = img.naturalHeight || img.height;

  if (targetW > maxDimension || targetH > maxDimension) {
    const ratio = Math.min(maxDimension / targetW, maxDimension / targetH);
    targetW = Math.max(1, Math.round(targetW * ratio));
    targetH = Math.max(1, Math.round(targetH * ratio));
  }

  const canvas = document.createElement('canvas');
  canvas.width = targetW;
  canvas.height = targetH;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Trình duyệt không hỗ trợ xử lý ảnh Canvas.');
  }

  // Nền trắng để biểu đồ PNG trong suốt không bị nền đen khi chuyển sang JPEG
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, targetW, targetH);
  ctx.drawImage(img, 0, 0, targetW, targetH);

  const dataUrl = canvas.toDataURL('image/jpeg', quality);
  return { dataUrl, width: targetW, height: targetH };
}

export async function processUploadedOrPastedImage(fileOrBlob: Blob): Promise<ProcessedTaskImage> {
  if (!fileOrBlob.type.startsWith('image/')) {
    throw new Error('Vui lòng chọn hoặc dán đúng định dạng ảnh (PNG, JPG, WEBP).');
  }

  const img = await loadImageFromBlob(fileOrBlob);
  const full = renderResizedDataUrl(img, 1280, 0.84);
  const thumb = renderResizedDataUrl(img, 420, 0.65);

  const commaIdx = full.dataUrl.indexOf(',');
  const base64 = commaIdx >= 0 ? full.dataUrl.slice(commaIdx + 1) : full.dataUrl;
  const sizeKB = Math.round((base64.length * 3) / 4 / 1024);

  return {
    dataUrl: full.dataUrl,
    base64,
    mimeType: 'image/jpeg',
    thumbDataUrl: thumb.dataUrl,
    width: full.width,
    height: full.height,
    sizeKB,
  };
}

export function extractInlineImagePayload(
  dataUrl?: string | null
): { mimeType: string; data: string } | undefined {
  if (!dataUrl || typeof dataUrl !== 'string') return undefined;
  const match = dataUrl.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
  if (!match) return undefined;
  return { mimeType: match[1], data: match[2] };
}
