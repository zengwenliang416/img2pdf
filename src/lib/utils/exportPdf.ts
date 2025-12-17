/**
 * PDF 导出模块
 * 使用 pdf-lib 生成 PDF 文件
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
}

const DEFAULT_CONFIG: Required<ExportConfig> = {
  title: "扫描文档",
  pageWidth: 595.28, // A4 宽度 (pt)
  pageHeight: 841.89, // A4 高度 (pt)
  margin: 0,
  quality: 0.92,
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

  for (const imageDataUrl of images) {
    // 嵌入图片
    const imageBytes = await dataUrlToBytes(imageDataUrl);
    const imageType = getImageType(imageDataUrl);

    const image =
      imageType === "png"
        ? await pdfDoc.embedPng(imageBytes)
        : await pdfDoc.embedJpg(imageBytes);

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
