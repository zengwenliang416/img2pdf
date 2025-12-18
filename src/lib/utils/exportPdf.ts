/**
 * PDF 导出模块
 * 使用 pdf-lib 生成 PDF 文件
 * 支持图片压缩和体积预估
 */

import { PDFDocument } from "pdf-lib";
import JSZip from "jszip";

/**
 * 导出配置
 */
export interface ExportConfig {
  // PDF 标题
  title?: string;
  // 页面尺寸（默认 A4，当 perPageOrientations 为空时使用）
  pageWidth?: number;
  pageHeight?: number;
  // 页边距
  margin?: number;
  // 图片质量（0-1）
  quality?: number;
  // 进度回调
  onProgress?: (done: number, total: number) => void;
  // 每页独立方向配置（如果提供，则 pageWidth/pageHeight 作为基础纵向尺寸）
  perPageOrientations?: Array<"portrait" | "landscape">;
  // 每页独立旋转配置（顺时针度数：0, 90, 180, 270）
  perPageRotations?: Array<number>;
}

const DEFAULT_CONFIG: Required<
  Omit<ExportConfig, "onProgress" | "perPageOrientations" | "perPageRotations">
> & {
  onProgress?: (done: number, total: number) => void;
  perPageOrientations?: Array<"portrait" | "landscape">;
  perPageRotations?: Array<number>;
} = {
  title: "扫描文档",
  pageWidth: 595.28, // A4 宽度 (pt) - 纵向基准
  pageHeight: 841.89, // A4 高度 (pt) - 纵向基准
  margin: 0,
  quality: 0.92,
  onProgress: undefined,
  perPageOrientations: undefined,
  perPageRotations: undefined,
};

/**
 * 将图片数据 URL 转换为 Uint8Array
 */
async function dataUrlToBytes(dataUrl: string): Promise<Uint8Array> {
  const response = await fetch(dataUrl);
  const blob = await response.blob();
  const arrayBuffer = await blob.arrayBuffer();
  return new Uint8Array(arrayBuffer);
}

/**
 * 获取图片类型
 */
function getImageType(dataUrl: string): "png" | "jpeg" {
  if (dataUrl.startsWith("data:image/png")) return "png";
  return "jpeg";
}

/**
 * 压缩图片（将 PNG 转为 JPEG 并应用质量压缩和旋转）
 * @param dataUrl 原始图片数据 URL
 * @param quality 压缩质量（0-1）
 * @param rotation 顺时针旋转角度（0, 90, 180, 270）
 * @returns 压缩后的 JPEG 数据 URL
 */
async function compressImage(
  dataUrl: string,
  quality: number,
  rotation: number = 0,
): Promise<string> {
  // 如果已经是 JPEG 且质量接近 1 且无需旋转，直接返回
  if (getImageType(dataUrl) === "jpeg" && quality >= 0.95 && rotation === 0) {
    return dataUrl;
  }

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      // 使用 naturalWidth/naturalHeight 确保使用原始图片尺寸
      const imgWidth = img.naturalWidth || img.width;
      const imgHeight = img.naturalHeight || img.height;

      // 判断是否需要交换宽高（90° 或 270°）
      const needSwap = rotation === 90 || rotation === 270;
      const canvasWidth = needSwap ? imgHeight : imgWidth;
      const canvasHeight = needSwap ? imgWidth : imgHeight;

      console.log(
        `[ExportPdf] 压缩图片: 原始尺寸 ${imgWidth}x${imgHeight}, 输出尺寸 ${canvasWidth}x${canvasHeight}, 旋转 ${rotation}°`,
      );

      const canvas = document.createElement("canvas");
      canvas.width = canvasWidth;
      canvas.height = canvasHeight;

      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("无法创建 Canvas 上下文"));
        return;
      }

      // 白色背景（防止透明）
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // 应用旋转变换
      ctx.save();
      ctx.translate(canvasWidth / 2, canvasHeight / 2);
      ctx.rotate((rotation * Math.PI) / 180);
      ctx.drawImage(img, -imgWidth / 2, -imgHeight / 2);
      ctx.restore();

      // 导出为 JPEG
      const compressedDataUrl = canvas.toDataURL("image/jpeg", quality);
      resolve(compressedDataUrl);
    };
    img.onerror = () => reject(new Error("图片加载失败"));
    img.src = dataUrl;
  });
}

/**
 * 预估 PDF 文件大小
 * @param images 图片数据 URL 数组
 * @param quality 压缩质量
 * @returns 预估大小（字节）
 */
export async function estimatePdfSize(
  images: string[],
  quality: number = 0.92,
): Promise<number> {
  if (images.length === 0) return 0;

  let totalSize = 0;

  // 计算每张图片压缩后的大小
  for (const imageDataUrl of images) {
    const compressed = await compressImage(imageDataUrl, quality);
    // Data URL 格式: data:image/jpeg;base64,<base64data>
    // Base64 编码大约增加 33% 的体积，所以实际大小 ≈ base64长度 * 3/4
    const base64Part = compressed.split(",")[1] || "";
    const estimatedBytes = Math.ceil((base64Part.length * 3) / 4);
    totalSize += estimatedBytes;
  }

  // PDF 元数据开销（约 2KB 固定 + 每页 200 字节）
  const overhead = 2048 + images.length * 200;

  return totalSize + overhead;
}

/**
 * 格式化文件大小
 * @param bytes 字节数
 * @returns 格式化的字符串（如 "1.5 MB"）
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * 导出图片为 PDF
 * @param images 图片数据 URL 数组
 * @param config 导出配置
 * @returns PDF 文件的 Blob
 */
export async function exportToPdf(
  images: string[],
  config: ExportConfig = {},
): Promise<Blob> {
  if (images.length === 0) {
    throw new Error("至少需要一张图片");
  }

  const cfg = { ...DEFAULT_CONFIG, ...config };
  const pdfDoc = await PDFDocument.create();

  // 设置元数据
  pdfDoc.setTitle(cfg.title);
  pdfDoc.setCreator("扫描全能王 MVP");
  pdfDoc.setCreationDate(new Date());

  const total = images.length;

  for (let i = 0; i < images.length; i++) {
    const imageDataUrl = images[i];

    // 获取当前页旋转角度
    const rotation = cfg.perPageRotations?.[i] ?? 0;

    // 压缩图片（同时应用旋转）
    const compressedDataUrl = await compressImage(
      imageDataUrl,
      cfg.quality,
      rotation,
    );

    // 嵌入图片（压缩后都是 JPEG）
    const imageBytes = await dataUrlToBytes(compressedDataUrl);
    const image = await pdfDoc.embedJpg(imageBytes);

    // 根据每页方向配置确定页面尺寸
    // cfg.pageWidth/pageHeight 是纵向基准尺寸
    const orientation = cfg.perPageOrientations?.[i] ?? "portrait";
    const isLandscape = orientation === "landscape";
    const actualPageWidth = isLandscape ? cfg.pageHeight : cfg.pageWidth;
    const actualPageHeight = isLandscape ? cfg.pageWidth : cfg.pageHeight;

    // 计算图片在页面上的尺寸（保持宽高比）
    const contentWidth = actualPageWidth - cfg.margin * 2;
    const contentHeight = actualPageHeight - cfg.margin * 2;

    const imageAspect = image.width / image.height;
    const pageAspect = contentWidth / contentHeight;

    let drawWidth: number;
    let drawHeight: number;

    if (imageAspect > pageAspect) {
      // 图片更宽，以宽度为基准
      drawWidth = contentWidth;
      drawHeight = contentWidth / imageAspect;
    } else {
      // 图片更高，以高度为基准
      drawHeight = contentHeight;
      drawWidth = contentHeight * imageAspect;
    }

    // 居中偏移
    const xOffset = cfg.margin + (contentWidth - drawWidth) / 2;
    const yOffset = cfg.margin + (contentHeight - drawHeight) / 2;

    // 计算 DPI（每英寸点数）- 用于判断打印质量
    // PDF 中 1pt = 1/72 inch
    const effectiveDpiX = (image.width / drawWidth) * 72;
    const effectiveDpiY = (image.height / drawHeight) * 72;
    const effectiveDpi = Math.min(effectiveDpiX, effectiveDpiY);

    console.log(
      `[ExportPdf] 页面 ${i + 1}: 图片像素 ${image.width}x${image.height}, ` +
        `PDF绘制尺寸 ${drawWidth.toFixed(1)}x${drawHeight.toFixed(1)}pt, ` +
        `有效DPI: ${effectiveDpi.toFixed(0)} (${effectiveDpi >= 150 ? "✓ 高质量" : effectiveDpi >= 72 ? "⚠ 中等" : "✗ 低质量"})`,
    );

    // 添加页面（使用实际方向的页面尺寸）
    const page = pdfDoc.addPage([actualPageWidth, actualPageHeight]);

    // 绘制图片
    page.drawImage(image, {
      x: xOffset,
      y: yOffset,
      width: drawWidth,
      height: drawHeight,
    });

    // 进度回调
    cfg.onProgress?.(i + 1, total);
  }

  // 生成 PDF 字节
  const pdfBytes = await pdfDoc.save();
  // 显式转换为 ArrayBuffer 以解决类型兼容问题
  return new Blob([pdfBytes.buffer as ArrayBuffer], {
    type: "application/pdf",
  });
}

/**
 * 导出单张图片为 JPG
 * @param imageDataUrl 图片数据 URL
 * @param quality 质量（0-1）
 * @param rotation 顺时针旋转角度（0, 90, 180, 270）
 * @returns JPG 文件的 Blob
 */
export async function exportToJpg(
  imageDataUrl: string,
  quality: number = 0.92,
  rotation: number = 0,
): Promise<Blob> {
  // 加载图片
  const img = new Image();
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error("图片加载失败"));
    img.src = imageDataUrl;
  });

  // 使用 naturalWidth/naturalHeight 确保使用原始图片尺寸
  const imgWidth = img.naturalWidth || img.width;
  const imgHeight = img.naturalHeight || img.height;

  // 判断是否需要交换宽高（90° 或 270°）
  const needSwap = rotation === 90 || rotation === 270;
  const canvasWidth = needSwap ? imgHeight : imgWidth;
  const canvasHeight = needSwap ? imgWidth : imgHeight;

  // 绘制到 Canvas 并导出为 JPG
  const canvas = document.createElement("canvas");
  canvas.width = canvasWidth;
  canvas.height = canvasHeight;

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("无法创建 Canvas 上下文");

  // 白色背景（防止透明）
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // 应用旋转变换
  ctx.save();
  ctx.translate(canvasWidth / 2, canvasHeight / 2);
  ctx.rotate((rotation * Math.PI) / 180);
  ctx.drawImage(img, -imgWidth / 2, -imgHeight / 2);
  ctx.restore();

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error("导出 JPG 失败"));
      },
      "image/jpeg",
      quality,
    );
  });
}

/**
 * 触发文件下载
 * @param blob 文件 Blob
 * @param filename 文件名
 */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * ZIP 导出配置
 */
export interface ZipExportConfig {
  // 图片质量（0-1）
  quality?: number;
  // 文件名前缀
  filenamePrefix?: string;
  // 进度回调
  onProgress?: (done: number, total: number) => void;
  // 每页独立旋转配置（顺时针度数：0, 90, 180, 270）
  perPageRotations?: Array<number>;
}

const DEFAULT_ZIP_CONFIG: Required<
  Omit<ZipExportConfig, "onProgress" | "perPageRotations">
> & {
  onProgress?: (done: number, total: number) => void;
  perPageRotations?: Array<number>;
} = {
  quality: 0.92,
  filenamePrefix: "scan",
  onProgress: undefined,
  perPageRotations: undefined,
};

/**
 * 导出多张图片为 ZIP 文件
 * @param images 图片数据 URL 数组
 * @param config 导出配置
 * @returns ZIP 文件的 Blob
 */
export async function exportToZip(
  images: string[],
  config: ZipExportConfig = {},
): Promise<Blob> {
  if (images.length === 0) {
    throw new Error("至少需要一张图片");
  }

  const cfg = { ...DEFAULT_ZIP_CONFIG, ...config };
  const zip = new JSZip();
  const total = images.length;

  // 计算文件名需要的位数（用于补零）
  const digits = String(total).length;

  for (let i = 0; i < images.length; i++) {
    const imageDataUrl = images[i];

    // 获取当前页旋转角度
    const rotation = cfg.perPageRotations?.[i] ?? 0;

    // 导出为 JPG（同时应用旋转）
    const jpgBlob = await exportToJpg(imageDataUrl, cfg.quality, rotation);

    // 生成文件名（带补零序号）
    const index = String(i + 1).padStart(digits, "0");
    const filename = `${cfg.filenamePrefix}_${index}.jpg`;

    // 添加到 ZIP
    zip.file(filename, jpgBlob);

    // 进度回调
    cfg.onProgress?.(i + 1, total);
  }

  // 生成 ZIP 文件
  const zipBlob = await zip.generateAsync({
    type: "blob",
    compression: "DEFLATE",
    compressionOptions: { level: 6 },
  });

  return zipBlob;
}
