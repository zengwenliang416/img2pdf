/**
 * 缩略图生成工具
 * 用于在上传阶段生成小尺寸预览图，减少内存占用
 */

/**
 * 缩略图配置
 */
export interface ThumbnailConfig {
  // 最大边长（默认 160px）
  maxSize?: number;
  // JPEG 质量（0-1，默认 0.7）
  quality?: number;
}

const DEFAULT_CONFIG: Required<ThumbnailConfig> = {
  maxSize: 160,
  quality: 0.7,
};

/**
 * 从 Image 元素生成缩略图
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

  // 计算目标尺寸，保持宽高比
  let targetW = srcW;
  let targetH = srcH;

  if (srcW > srcH) {
    // 横向图片
    if (srcW > cfg.maxSize) {
      targetW = cfg.maxSize;
      targetH = Math.round((srcH / srcW) * cfg.maxSize);
    }
  } else {
    // 纵向图片或正方形
    if (srcH > cfg.maxSize) {
      targetH = cfg.maxSize;
      targetW = Math.round((srcW / srcH) * cfg.maxSize);
    }
  }

  // 确保最小尺寸为 1
  targetW = Math.max(1, targetW);
  targetH = Math.max(1, targetH);

  // 创建离屏 Canvas
  const canvas = document.createElement("canvas");
  canvas.width = targetW;
  canvas.height = targetH;

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("无法获取 Canvas 2D 上下文");
  }

  // 启用图像平滑
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";

  // 绘制缩放后的图片
  ctx.drawImage(img, 0, 0, targetW, targetH);

  // 导出为 JPEG（体积更小）
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
