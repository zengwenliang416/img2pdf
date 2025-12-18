/**
 * 图像滤镜模块
 * 提供原图、灰度、黑白、增强等滤镜效果
 * 使用纯 Canvas API 实现，避免 OpenCV 阻塞主线程
 */

/**
 * 滤镜类型
 */
export type FilterType =
  | "original"
  | "grayscale"
  | "bw"
  | "enhanced"
  | "shadow";

/**
 * 滤镜配置
 */
export interface FilterConfig {
  // 黑白滤镜的阈值（0-255）
  bwThreshold?: number;
  // 增强滤镜的对比度系数（1.0 为原始）
  enhancedContrast?: number;
  // 增强滤镜的亮度偏移（0 为原始）
  enhancedBrightness?: number;
  // 去阴影滤镜的模糊核大小（用于估计背景光照）
  shadowBlurRadius?: number;
  // 去阴影滤镜的对比度增强系数
  shadowContrast?: number;
}

const DEFAULT_CONFIG: Required<FilterConfig> = {
  bwThreshold: 128,
  enhancedContrast: 1.3,
  enhancedBrightness: 20,
  shadowBlurRadius: 50,
  shadowContrast: 1.5,
};

/**
 * 应用滤镜到图像（纯 Canvas 实现）
 * @param imageSource 图像源
 * @param filterType 滤镜类型
 * @param config 滤镜配置
 * @returns 处理后的图像 Data URL
 */
export async function applyFilter(
  imageSource: HTMLCanvasElement | HTMLImageElement,
  filterType: FilterType,
  config: FilterConfig = {},
): Promise<string> {
  console.log("[Filter] 应用滤镜:", filterType);

  // 原图直接返回
  if (filterType === "original") {
    return getImageDataUrl(imageSource);
  }

  const cfg = { ...DEFAULT_CONFIG, ...config };

  // 获取图像尺寸
  const width =
    imageSource instanceof HTMLCanvasElement
      ? imageSource.width
      : imageSource.naturalWidth || imageSource.width;
  const height =
    imageSource instanceof HTMLCanvasElement
      ? imageSource.height
      : imageSource.naturalHeight || imageSource.height;

  // 创建工作 Canvas
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");

  if (!ctx) {
    throw new Error("无法创建 Canvas 上下文");
  }

  // 绘制原图（使用 3 参数形式，以原始尺寸绘制）
  ctx.drawImage(imageSource, 0, 0);

  // 根据滤镜类型处理
  switch (filterType) {
    case "grayscale":
      applyGrayscaleCanvas(ctx, width, height);
      break;
    case "bw":
      applyBlackWhiteCanvas(ctx, width, height, cfg.bwThreshold);
      break;
    case "enhanced":
      applyEnhancedCanvas(
        ctx,
        width,
        height,
        cfg.enhancedContrast,
        cfg.enhancedBrightness,
      );
      break;
    case "shadow":
      applyShadowRemovalCanvas(
        ctx,
        width,
        height,
        cfg.shadowBlurRadius,
        cfg.shadowContrast,
      );
      break;
    default:
      throw new Error(`未知的滤镜类型: ${filterType}`);
  }

  console.log("[Filter] 滤镜处理完成:", filterType);
  return canvas.toDataURL("image/png");
}

/**
 * 获取图像的 Data URL
 */
function getImageDataUrl(
  imageSource: HTMLCanvasElement | HTMLImageElement,
): string {
  if (imageSource instanceof HTMLCanvasElement) {
    return imageSource.toDataURL("image/png");
  }

  const canvas = document.createElement("canvas");
  canvas.width = imageSource.naturalWidth || imageSource.width;
  canvas.height = imageSource.naturalHeight || imageSource.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("无法创建 Canvas 上下文");
  ctx.drawImage(imageSource, 0, 0);
  return canvas.toDataURL("image/png");
}

/**
 * 灰度滤镜（Canvas 实现）
 * 使用标准灰度转换公式：Y = 0.299*R + 0.587*G + 0.114*B
 */
function applyGrayscaleCanvas(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
): void {
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    // 使用标准灰度权重
    const gray = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
    data[i] = gray;
    data[i + 1] = gray;
    data[i + 2] = gray;
    // Alpha 保持不变
  }

  ctx.putImageData(imageData, 0, 0);
}

/**
 * 黑白滤镜（Canvas 实现）
 * 使用简单阈值二值化
 */
function applyBlackWhiteCanvas(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  threshold: number,
): void {
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    // 先转灰度
    const gray = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
    // 二值化
    const bw = gray > threshold ? 255 : 0;
    data[i] = bw;
    data[i + 1] = bw;
    data[i + 2] = bw;
    // Alpha 保持不变
  }

  ctx.putImageData(imageData, 0, 0);
}

/**
 * 增强滤镜（Canvas 实现）
 * 调整对比度和亮度
 */
function applyEnhancedCanvas(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  contrast: number,
  brightness: number,
): void {
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;

  // 对比度调整公式：newValue = (value - 128) * contrast + 128 + brightness
  for (let i = 0; i < data.length; i += 4) {
    for (let j = 0; j < 3; j++) {
      let value = data[i + j];
      // 应用对比度
      value = (value - 128) * contrast + 128;
      // 应用亮度
      value = value + brightness;
      // 限制范围
      data[i + j] = Math.max(0, Math.min(255, Math.round(value)));
    }
    // Alpha 保持不变
  }

  ctx.putImageData(imageData, 0, 0);
}

/**
 * 去阴影滤镜（Canvas 实现）
 * 通过估计背景光照并归一化来去除阴影
 * 算法：
 * 1. 使用大核模糊估计背景光照
 * 2. 用原图除以背景进行光照归一化
 * 3. 增强对比度使文字更清晰
 */
function applyShadowRemovalCanvas(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  blurRadius: number,
  contrast: number,
): void {
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;

  // 转换为灰度亮度数组用于背景估计
  const luminance = new Float32Array(width * height);
  for (let i = 0; i < data.length; i += 4) {
    const idx = i / 4;
    luminance[idx] =
      0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
  }

  // 使用快速盒状模糊估计背景光照
  const background = boxBlur(luminance, width, height, blurRadius);

  // 光照归一化 + 对比度增强
  for (let i = 0; i < data.length; i += 4) {
    const idx = i / 4;
    const bg = Math.max(background[idx], 1); // 避免除以零

    for (let c = 0; c < 3; c++) {
      // 归一化：原始值 / 背景 * 255
      let normalized = (data[i + c] / bg) * 255;

      // 对比度增强：(value - 128) * contrast + 128
      normalized = (normalized - 128) * contrast + 128;

      // 限制范围
      data[i + c] = Math.max(0, Math.min(255, Math.round(normalized)));
    }
    // Alpha 保持不变
  }

  ctx.putImageData(imageData, 0, 0);
}

/**
 * 快速盒状模糊（用于背景光照估计）
 * 使用分离的水平和垂直两次遍历实现 O(n) 复杂度
 */
function boxBlur(
  input: Float32Array,
  width: number,
  height: number,
  radius: number,
): Float32Array {
  const output = new Float32Array(width * height);
  const temp = new Float32Array(width * height);

  // 限制半径，避免过大
  const r = Math.min(radius, Math.min(width, height) / 4);
  const diameter = r * 2 + 1;

  // 水平方向模糊
  for (let y = 0; y < height; y++) {
    let sum = 0;
    const rowOffset = y * width;

    // 初始化窗口
    for (let x = -r; x <= r; x++) {
      const px = Math.max(0, Math.min(width - 1, x));
      sum += input[rowOffset + px];
    }
    temp[rowOffset] = sum / diameter;

    // 滑动窗口
    for (let x = 1; x < width; x++) {
      const leftOut = Math.max(0, x - r - 1);
      const rightIn = Math.min(width - 1, x + r);
      sum = sum - input[rowOffset + leftOut] + input[rowOffset + rightIn];
      temp[rowOffset + x] = sum / diameter;
    }
  }

  // 垂直方向模糊
  for (let x = 0; x < width; x++) {
    let sum = 0;

    // 初始化窗口
    for (let y = -r; y <= r; y++) {
      const py = Math.max(0, Math.min(height - 1, y));
      sum += temp[py * width + x];
    }
    output[x] = sum / diameter;

    // 滑动窗口
    for (let y = 1; y < height; y++) {
      const topOut = Math.max(0, y - r - 1);
      const bottomIn = Math.min(height - 1, y + r);
      sum = sum - temp[topOut * width + x] + temp[bottomIn * width + x];
      output[y * width + x] = sum / diameter;
    }
  }

  return output;
}

/**
 * 获取滤镜的显示名称
 */
export function getFilterName(filterType: FilterType): string {
  const names: Record<FilterType, string> = {
    original: "原图",
    grayscale: "灰度",
    bw: "黑白",
    enhanced: "增强",
    shadow: "去阴影",
  };
  return names[filterType];
}

/**
 * 所有可用滤镜列表
 */
export const AVAILABLE_FILTERS: FilterType[] = [
  "original",
  "grayscale",
  "bw",
  "enhanced",
  "shadow",
];
