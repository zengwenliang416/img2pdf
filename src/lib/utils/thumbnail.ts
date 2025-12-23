/**
 * 缩略图生成工具
 * 用于在上传阶段生成小尺寸预览图，减少内存占用
 *
 * 性能优化：
 * - 使用 createImageBitmap 替代 new Image() 更高效
 * - 使用 ObjectURL 替代 DataURL 减少内存
 */

import {
  canvasToObjectUrl,
  loadImage,
  calculateScaledSize,
} from "./imageUtils";

/**
 * 缩略图配置
 */
export interface ThumbnailConfig {
  // 最大边长（默认 160px）
  maxSize?: number;
  // JPEG 质量（0-1，默认 0.7）
  quality?: number;
  // 是否返回 ObjectURL（默认 false，返回 DataURL 兼容旧逻辑）
  useObjectUrl?: boolean;
}

const DEFAULT_CONFIG: Required<ThumbnailConfig> = {
  maxSize: 160,
  quality: 0.7,
  useObjectUrl: false,
};

/**
 * 从 Image 元素生成缩略图（同步版本，兼容旧逻辑）
 * @param img 已加载的 Image 元素
 * @param config 缩略图配置
 * @returns JPEG 格式的 Data URL
 */
export function generateThumbnailFromImage(
  img: HTMLImageElement,
  config: ThumbnailConfig = {},
): string {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  const { naturalWidth: srcW, naturalHeight: srcH } = img;

  const { width: targetW, height: targetH } = calculateScaledSize(
    srcW,
    srcH,
    cfg.maxSize,
    cfg.maxSize,
  );

  // 创建离屏 Canvas
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, targetW);
  canvas.height = Math.max(1, targetH);

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("无法获取 Canvas 2D 上下文");
  }

  // 启用图像平滑
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";

  // 绘制缩放后的图片
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

  // 导出为 JPEG（体积更小）
  return canvas.toDataURL("image/jpeg", cfg.quality);
}

/**
 * 从 Blob/File 高效生成缩略图（使用 createImageBitmap）
 * @param source 图片源（Blob、File 或 URL）
 * @param config 缩略图配置
 * @returns ObjectURL 或 DataURL
 */
export async function generateThumbnailFast(
  source: Blob | File | string,
  config: ThumbnailConfig = {},
): Promise<string> {
  const cfg = { ...DEFAULT_CONFIG, ...config };

  // 使用 createImageBitmap 高效加载并缩放
  const bitmap = await loadImage(source, {
    maxWidth: cfg.maxSize,
    maxHeight: cfg.maxSize,
    resizeQuality: "high",
  });

  // 绘制到 Canvas
  const canvas = document.createElement("canvas");
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    bitmap.close();
    throw new Error("无法获取 Canvas 2D 上下文");
  }

  ctx.drawImage(bitmap, 0, 0);
  bitmap.close(); // 释放 ImageBitmap 资源

  // 返回 ObjectURL 或 DataURL
  if (cfg.useObjectUrl) {
    return canvasToObjectUrl(canvas, "image/jpeg", cfg.quality);
  }
  return canvas.toDataURL("image/jpeg", cfg.quality);
}

/**
 * 从 Data URL 生成缩略图
 * @param dataUrl 原始图片的 Data URL
 * @param config 缩略图配置
 * @returns Promise<JPEG 格式的 Data URL>
 */
export async function generateThumbnail(
  dataUrl: string,
  config: ThumbnailConfig = {},
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();

    img.onload = () => {
      try {
        const thumbnail = generateThumbnailFromImage(img, config);
        resolve(thumbnail);
      } catch (err) {
        reject(err);
      }
    };

    img.onerror = () => {
      reject(new Error("加载图片失败"));
    };

    img.src = dataUrl;
  });
}

/**
 * 批量生成缩略图
 * @param dataUrls 原始图片的 Data URL 数组
 * @param config 缩略图配置
 * @param onProgress 进度回调（可选）
 * @returns Promise<缩略图 Data URL 数组>
 */
export async function generateThumbnails(
  dataUrls: string[],
  config: ThumbnailConfig = {},
  onProgress?: (done: number, total: number) => void,
): Promise<string[]> {
  const results: string[] = [];

  for (let i = 0; i < dataUrls.length; i++) {
    const thumbnail = await generateThumbnail(dataUrls[i], config);
    results.push(thumbnail);

    if (onProgress) {
      onProgress(i + 1, dataUrls.length);
    }
  }

  return results;
}
