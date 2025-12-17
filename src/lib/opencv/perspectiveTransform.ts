/**
 * 透视变换模块
 * 将四边形区域矫正为矩形
 */

import { ensureOpenCV } from "./ensureOpenCV";
import type { Corners, Point } from "./detectEdges";

/**
 * 计算两点之间的欧几里得距离
 */
function distance(p1: Point, p2: Point): number {
  return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
}

/**
 * 根据角点计算输出尺寸
 * 使用四边形的最大宽度和最大高度
 */
export function calculateOutputSize(corners: Corners): {
  width: number;
  height: number;
} {
  const [topLeft, topRight, bottomRight, bottomLeft] = corners;

  // 计算顶边和底边的宽度，取最大值
  const topWidth = distance(topLeft, topRight);
  const bottomWidth = distance(bottomLeft, bottomRight);
  const maxWidth = Math.round(Math.max(topWidth, bottomWidth));

  // 计算左边和右边的高度，取最大值
  const leftHeight = distance(topLeft, bottomLeft);
  const rightHeight = distance(topRight, bottomRight);
  const maxHeight = Math.round(Math.max(leftHeight, rightHeight));

  return { width: maxWidth, height: maxHeight };
}

/**
 * 执行透视变换（简化版 - 使用 Canvas 裁剪）
 * 暂时跳过 OpenCV 透视变换以避免主线程阻塞
 * TODO: 后续可以使用 Web Worker 实现真正的透视变换
 *
 * @param imageSource 原始图像源
 * @param srcCorners 源图像的四个角点
 * @param outputSize 可选的输出尺寸，默认根据角点自动计算
 * @returns 变换后的图像数据 URL
 */
export async function applyPerspectiveTransform(
  imageSource: HTMLCanvasElement | HTMLImageElement,
  srcCorners: Corners,
  outputSize?: { width: number; height: number },
): Promise<string> {
  console.log("[PerspectiveTransform] 开始处理...");

  // 计算输出尺寸
  const { width, height } = outputSize || calculateOutputSize(srcCorners);
  console.log("[PerspectiveTransform] 输出尺寸:", width, "x", height);

  // 使用简单的 Canvas 裁剪（无透视校正）
  // 计算边界框
  const minX = Math.min(...srcCorners.map((p) => p.x));
  const maxX = Math.max(...srcCorners.map((p) => p.x));
  const minY = Math.min(...srcCorners.map((p) => p.y));
  const maxY = Math.max(...srcCorners.map((p) => p.y));

  const cropWidth = maxX - minX;
  const cropHeight = maxY - minY;

  console.log(
    "[PerspectiveTransform] 裁剪区域:",
    minX,
    minY,
    cropWidth,
    cropHeight,
  );

  // 创建输出 Canvas
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");

  if (!ctx) {
    throw new Error("无法创建 Canvas 上下文");
  }

  // 绘制裁剪后的图像，缩放到输出尺寸
  ctx.drawImage(
    imageSource,
    minX,
    minY,
    cropWidth,
    cropHeight,
    0,
    0,
    width,
    height,
  );

  console.log("[PerspectiveTransform] 处理完成");
  return canvas.toDataURL("image/png");
}

/**
 * 执行真正的透视变换（使用 OpenCV）
 * 注意：这会阻塞主线程，建议在 Web Worker 中使用
 */
export async function applyPerspectiveTransformWithOpenCV(
  imageSource: HTMLCanvasElement | HTMLImageElement,
  srcCorners: Corners,
  outputSize?: { width: number; height: number },
): Promise<string> {
  const cv = await ensureOpenCV();

  // 计算输出尺寸
  const { width, height } = outputSize || calculateOutputSize(srcCorners);

  // 临时变量
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mats: any[] = [];

  try {
    // 1. 读取源图像
    const src = cv.imread(imageSource);
    mats.push(src);

    // 2. 定义目标角点（矩形）
    const dstCorners: Corners = [
      { x: 0, y: 0 },
      { x: width, y: 0 },
      { x: width, y: height },
      { x: 0, y: height },
    ];

    // 3. 创建源点和目标点矩阵
    const srcPointsArray = srcCorners.flatMap((p) => [p.x, p.y]);
    const dstPointsArray = dstCorners.flatMap((p) => [p.x, p.y]);

    const srcMat = cv.matFromArray(4, 1, cv.CV_32FC2, srcPointsArray);
    const dstMat = cv.matFromArray(4, 1, cv.CV_32FC2, dstPointsArray);
    mats.push(srcMat, dstMat);

    // 4. 计算透视变换矩阵
    const transformMatrix = cv.getPerspectiveTransform(srcMat, dstMat);
    mats.push(transformMatrix);

    // 5. 执行透视变换
    const dst = new cv.Mat();
    mats.push(dst);
    cv.warpPerspective(
      src,
      dst,
      transformMatrix,
      new cv.Size(width, height),
      cv.INTER_LINEAR,
      cv.BORDER_CONSTANT,
      new cv.Scalar(255, 255, 255, 255),
    );

    // 6. 输出到 Canvas 并获取 Data URL
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    cv.imshow(canvas, dst);

    return canvas.toDataURL("image/png");
  } finally {
    // 释放内存
    for (const mat of mats) {
      mat.delete();
    }
  }
}

/**
 * 在 Canvas 上预览透视变换效果
 * @param sourceCanvas 源 Canvas
 * @param targetCanvas 目标预览 Canvas
 * @param corners 四个角点
 */
export async function previewPerspectiveTransform(
  sourceCanvas: HTMLCanvasElement,
  targetCanvas: HTMLCanvasElement,
  corners: Corners,
): Promise<void> {
  const dataUrl = await applyPerspectiveTransform(sourceCanvas, corners);
  const img = new Image();

  return new Promise((resolve, reject) => {
    img.onload = () => {
      const ctx = targetCanvas.getContext("2d");
      if (!ctx) {
        reject(new Error("无法获取 Canvas 2D 上下文"));
        return;
      }

      targetCanvas.width = img.width;
      targetCanvas.height = img.height;
      ctx.drawImage(img, 0, 0);
      resolve();
    };

    img.onerror = () => {
      reject(new Error("加载变换后的图像失败"));
    };

    img.src = dataUrl;
  });
}
