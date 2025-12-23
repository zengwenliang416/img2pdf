/**
 * 图片处理工具函数
 * 提供高效的 Blob/ObjectURL 操作，减少内存占用
 */

/**
 * Canvas 转 Blob（替代 toDataURL，内存效率更高）
 */
export function canvasToBlob(
  canvas: HTMLCanvasElement,
  type: "image/png" | "image/jpeg" = "image/png",
  quality?: number,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error("Canvas 转 Blob 失败"));
      },
      type,
      quality,
    );
  });
}

/**
 * Canvas 转 ObjectURL（用于预览，需手动 revoke）
 */
export async function canvasToObjectUrl(
  canvas: HTMLCanvasElement,
  type: "image/png" | "image/jpeg" = "image/png",
  quality?: number,
): Promise<string> {
  const blob = await canvasToBlob(canvas, type, quality);
  return URL.createObjectURL(blob);
}

/**
 * Blob 转 DataURL（仅在必要时使用）
 */
export function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("Blob 转 DataURL 失败"));
    reader.readAsDataURL(blob);
  });
}

/**
 * DataURL 转 Blob
 */
export async function dataUrlToBlob(dataUrl: string): Promise<Blob> {
  const response = await fetch(dataUrl);
  return response.blob();
}

/**
 * 加载图片（使用 createImageBitmap 优化性能）
 * @param source 图片源（URL/Blob/File）
 * @param options 可选缩放参数
 */
export async function loadImage(
  source: string | Blob | File,
  options?: {
    maxWidth?: number;
    maxHeight?: number;
    resizeQuality?: "pixelated" | "low" | "medium" | "high";
  },
): Promise<ImageBitmap> {
  let blob: Blob;

  if (typeof source === "string") {
    // URL 或 DataURL
    if (source.startsWith("data:")) {
      blob = await dataUrlToBlob(source);
    } else {
      const response = await fetch(source);
      blob = await response.blob();
    }
  } else {
    blob = source;
  }

  // 计算缩放参数
  if (options?.maxWidth || options?.maxHeight) {
    return createImageBitmap(blob, {
      resizeWidth: options.maxWidth,
      resizeHeight: options.maxHeight,
      resizeQuality: options.resizeQuality ?? "high",
    });
  }

  return createImageBitmap(blob);
}

/**
 * 计算保持宽高比的缩放尺寸
 */
export function calculateScaledSize(
  srcWidth: number,
  srcHeight: number,
  maxWidth: number,
  maxHeight: number,
): { width: number; height: number; scale: number } {
  const scaleX = maxWidth / srcWidth;
  const scaleY = maxHeight / srcHeight;
  const scale = Math.min(scaleX, scaleY, 1); // 不放大

  return {
    width: Math.round(srcWidth * scale),
    height: Math.round(srcHeight * scale),
    scale,
  };
}

/**
 * 预览分辨率配置
 * 预览时使用较低分辨率减少内存和计算量
 */
export const PREVIEW_CONFIG = {
  // 预览最大边长（用于裁剪/滤镜预览）
  maxPreviewSize: 1920,
  // 缩略图最大边长
  maxThumbnailSize: 160,
  // 导出时使用原始分辨率
  useOriginalForExport: true,
} as const;

/**
 * 判断是否需要降采样预览
 */
export function needsDownscaleForPreview(
  width: number,
  height: number,
  maxSize: number = PREVIEW_CONFIG.maxPreviewSize,
): boolean {
  return width > maxSize || height > maxSize;
}

/**
 * 创建降采样后的 Canvas
 * @param source 原始图片源
 * @param maxSize 最大边长
 */
export async function createDownscaledCanvas(
  source: HTMLImageElement | HTMLCanvasElement | ImageBitmap,
  maxSize: number,
): Promise<{ canvas: HTMLCanvasElement; scale: number }> {
  const srcWidth =
    source instanceof HTMLImageElement
      ? source.naturalWidth || source.width
      : source.width;
  const srcHeight =
    source instanceof HTMLImageElement
      ? source.naturalHeight || source.height
      : source.height;

  const { width, height, scale } = calculateScaledSize(
    srcWidth,
    srcHeight,
    maxSize,
    maxSize,
  );

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("无法创建 Canvas 上下文");

  // 启用高质量缩放
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(source, 0, 0, width, height);

  return { canvas, scale };
}

/**
 * 释放 ObjectURL 资源
 */
export function revokeObjectUrl(url: string | null | undefined): void {
  if (url?.startsWith("blob:")) {
    URL.revokeObjectURL(url);
  }
}

/**
 * 批量释放 ObjectURL
 */
export function revokeObjectUrls(urls: (string | null | undefined)[]): void {
  urls.forEach(revokeObjectUrl);
}
