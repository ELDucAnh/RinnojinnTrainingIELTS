'use client';

import { useEffect, useRef, useState } from 'react';
import {
  Clipboard,
  Image as ImageIcon,
  Maximize2,
  Trash2,
  Upload,
  X,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import {
  processUploadedOrPastedImage,
  type ProcessedTaskImage,
} from '@/lib/image-utils';

interface Task1ImageUploaderProps {
  imageDataUrl: string | null;
  imageMeta?: { width: number; height: number; sizeKB: number } | null;
  onImageChange: (processed: ProcessedTaskImage | null) => void;
  disabled?: boolean;
  /** Cho phép bắt sự kiện Ctrl+V toàn trang khi đang ở bước nhập đề Task 1 */
  enableGlobalPaste?: boolean;
}

export function Task1ImageUploader({
  imageDataUrl,
  imageMeta,
  onImageChange,
  disabled = false,
  enableGlobalPaste = true,
}: Task1ImageUploaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [showZoom, setShowZoom] = useState(false);

  const handleImageBlob = async (blob: Blob) => {
    if (disabled) return;
    setErrorMsg('');
    setIsProcessing(true);
    try {
      const processed = await processUploadedOrPastedImage(blob);
      onImageChange(processed);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Không thể xử lý ảnh. Vui lòng thử ảnh khác.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Bắt Ctrl+V dán ảnh trực tiếp từ clipboard (chụp màn hình Win+Shift+S / Ctrl+C ảnh)
  useEffect(() => {
    if (!enableGlobalPaste || disabled) return;

    const handleGlobalPaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.type.startsWith('image/')) {
          const blob = item.getAsFile();
          if (blob) {
            e.preventDefault();
            void handleImageBlob(blob);
            return;
          }
        }
      }
    };

    window.addEventListener('paste', handleGlobalPaste);
    return () => window.removeEventListener('paste', handleGlobalPaste);
  }, [enableGlobalPaste, disabled]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      void handleImageBlob(file);
    }
    e.target.value = '';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (disabled) return;
    const file = e.dataTransfer.files?.[0];
    if (file) {
      void handleImageBlob(file);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <label className="text-xs font-extrabold uppercase tracking-wider text-orange-700 flex items-center gap-1.5">
          <ImageIcon size={14} />
          Ảnh biểu đồ / Bản đồ / Quy trình Task 1 (Ctrl+V dán hoặc tải ảnh lên)
        </label>
        {imageDataUrl && !disabled && (
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-orange-50 text-orange-700 border border-orange-200 hover:bg-orange-100 transition-colors"
            >
              Đổi ảnh khác
            </button>
            <button
              type="button"
              onClick={() => onImageChange(null)}
              className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-rose-50 text-rose-600 border border-rose-200 hover:bg-rose-100 transition-colors flex items-center gap-1"
            >
              <Trash2 size={11} /> Xóa ảnh
            </button>
          </div>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        onChange={handleFileChange}
        className="hidden"
        disabled={disabled}
      />

      {!imageDataUrl ? (
        <div
          onClick={() => !disabled && fileInputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            if (!disabled) setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          className={`relative rounded-2xl border-2 border-dashed p-6 text-center transition-all cursor-pointer select-none ${
            isDragging
              ? 'border-orange-500 bg-orange-50/90 scale-[1.01]'
              : 'border-orange-200 bg-orange-50/35 hover:border-orange-400 hover:bg-orange-50/70'
          } ${disabled ? 'opacity-60 pointer-events-none' : ''}`}
        >
          {isProcessing ? (
            <div className="flex flex-col items-center gap-2 py-2">
              <Loader2 size={26} className="animate-spin text-orange-500" />
              <p className="text-xs font-bold text-orange-800">Đang nén &amp; chuẩn hóa ảnh biểu đồ...</p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2.5">
              <div className="w-12 h-12 rounded-2xl bg-orange-100 text-orange-600 flex items-center justify-center shadow-sm">
                <Upload size={22} />
              </div>
              <div>
                <p className="text-sm font-extrabold text-gray-800">
                  Bấm để tải ảnh lên, kéo thả ảnh, hoặc nhấn{' '}
                  <kbd className="px-1.5 py-0.5 text-xs font-black bg-white border border-orange-300 text-orange-700 rounded-md shadow-sm">
                    Ctrl + V
                  </kbd>{' '}
                  để dán trực tiếp!
                </p>
                <p className="text-xs text-gray-500 mt-1 flex items-center justify-center gap-1.5 flex-wrap">
                  <Clipboard size={12} className="text-orange-500" />
                  Hỗ trợ chụp màn hình (Win+Shift+S / Cmd+Shift+4 rồi Ctrl+C → Ctrl+V) · PNG, JPG, WEBP
                </p>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="relative rounded-2xl border border-orange-200 bg-white overflow-hidden shadow-sm group">
          <div className="bg-gray-50/70 flex items-center justify-center p-2 max-h-[340px] overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imageDataUrl}
              alt="Ảnh đề IELTS Writing Task 1"
              onClick={() => setShowZoom(true)}
              className="max-h-[320px] w-auto object-contain rounded-lg cursor-zoom-in"
            />
          </div>
          <div className="px-3.5 py-2 bg-orange-50/70 border-t border-orange-100 flex items-center justify-between gap-2 text-[11px] text-orange-900">
            <span className="font-semibold">
              Đã tải ảnh đề Task 1
              {imageMeta ? ` (${imageMeta.width}×${imageMeta.height}px · ~${imageMeta.sizeKB}KB)` : ''}
              {' · '}Bạn có thể Ctrl+V ảnh mới để thay thế ngay
            </span>
            <button
              type="button"
              onClick={() => setShowZoom(true)}
              className="inline-flex items-center gap-1 font-bold text-orange-700 hover:underline flex-shrink-0"
            >
              <Maximize2 size={12} /> Phóng to
            </button>
          </div>
        </div>
      )}

      {errorMsg && (
        <div className="flex items-center gap-2 text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2">
          <AlertCircle size={14} className="flex-shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Lightbox phóng to ảnh */}
      {showZoom && imageDataUrl && (
        <div
          onClick={() => setShowZoom(false)}
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in"
        >
          <button
            type="button"
            onClick={() => setShowZoom(false)}
            className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/15 hover:bg-white/30 text-white flex items-center justify-center transition-colors"
            aria-label="Đóng phóng to"
          >
            <X size={20} />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imageDataUrl}
            alt="Phóng to biểu đồ IELTS Writing Task 1"
            onClick={(e) => e.stopPropagation()}
            className="max-w-[95vw] max-h-[90vh] object-contain rounded-xl bg-white p-2 shadow-2xl"
          />
        </div>
      )}
    </div>
  );
}
