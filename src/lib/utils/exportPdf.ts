/**
 * PDF 导出模块
 * 使用 pdf-lib 生成 PDF 文件
 * 支持图片压缩和体积预估
 */

import { PDFDocument } from "pdf-lib";

/**
 * 导出配置
 */
export interface ExportConfig {
  // PDF 标题
  title?: string;
  // 页面尺寸（默认 A4）
  pageWidth?: number;
  pageHeight?: number;
  // 页边距
  margin?: number;
  // 图片质量（0-1）
  quality?: number;
  // 进度回调
  onProgress?: (done: number, total: number) => void;
}

const DEFAULT_CONFIG: Required<Omit<ExportConfig, "onProgress">> & {
  onProgress?: (done: number, total: number) => void;
} = {
  title: "扫描文档",
  pageWidth: 595.28, // A4 宽度 (pt)
  pageHeight: 841.89, // A4 高度 (pt)
  margin: 0,
  quality: 0.92,
  onProgress: undefined,
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
 * 压缩图片（将 PNG 转为 JPEG 并应用质量压缩）
 * @param dataUrl 原始图片数据 URL
 * @param quality 压缩质量（0-1）
 * @returns 压缩后的 JPEG 数据 URL
 */
async function compressImage(
  dataUrl: string,
  quality: number,
): Promise<string> {
  // 如果已经是 JPEG 且质量接近 1，直接返回
  if (getImageType(dataUrl) === "jpeg" && quality >= 0.95) {
    return dataUrl;
  }

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;

      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("无法创建 Canvas 上下文"));
        return;
      }

      // 白色背景（防止透明）
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);

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

    // 压缩图片
    const compressedDataUrl = await compressImage(imageDataUrl, cfg.quality);

    // 嵌入图片（压缩后都是 JPEG）
    const imageBytes = await dataUrlToBytes(compressedDataUrl);
    const image = await pdfDoc.embedJpg(imageBytes);

    // 计算图片在页面上的尺寸（保持宽高比）
    const pageWidth = cfg.pageWidth - cfg.margin * 2;
    const pageHeight = cfg.pageHeight - cfg.margin * 2;

    const imageAspect = image.width / image.height;
    const pageAspect = pageWidth / pageHeight;

    let drawWidth: number;
    let drawHeight: number;

    if (imageAspect > pageAspect) {
      // 图片更宽，以宽度为基准
      drawWidth = pageWidth;
      drawHeight = pageWidth / imageAspect;
    } else {
      // 图片更高，以高度为基准
      drawHeight = pageHeight;
      drawWidth = pageHeight * imageAspect;
    }

    // 居中偏移
    const xOffset = cfg.margin + (pageWidth - drawWidth) / 2;
    const yOffset = cfg.margin + (pageHeight - drawHeight) / 2;

    // 添加页面
    const page = pdfDoc.addPage([cfg.pageWidth, cfg.pageHeight]);

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
 * @returns JPG 文件的 Blob
 */
export async function exportToJpg(
  imageDataUrl: string,
  quality: number = 0.92,
): Promise<Blob> {
  // 加载图片
  const img = new Image();
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error("图片加载失败"));
    img.src = imageDataUrl;
  });

  // 绘制到 Canvas 并导出为 JPG
  const canvas = document.createElement("canvas");
  canvas.width = img.width;
  canvas.height = img.height;

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("无法创建 Canvas 上下文");

  // 白色背景（防止透明）
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(img, 0, 0);

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
