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
 * 执行透视变换
 * 使用 OpenCV 将四边形区域矫正为矩形
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
  // 获取原始图片尺寸
  const srcWidth =
    imageSource instanceof HTMLCanvasElement
      ? imageSource.width
      : imageSource.naturalWidth || imageSource.width;
  const srcHeight =
    imageSource instanceof HTMLCanvasElement
      ? imageSource.height
      : imageSource.naturalHeight || imageSource.height;

  console.log(`[PerspectiveTransform] 原始图片尺寸: ${srcWidth}x${srcHeight}`);
  console.log("[PerspectiveTransform] srcCorners:", JSON.stringify(srcCorners));

  const { cv } = await ensureOpenCV();

  // 计算输出尺寸
  let width: number, height: number;
  try {
    const size = outputSize || calculateOutputSize(srcCorners);
    width = size.width;
    height = size.height;
  } catch (err) {
    console.error("[PerspectiveTransform] 计算尺寸失败:", err);
    throw err;
  }

  const sizeRatio = (((width * height) / (srcWidth * srcHeight)) * 100).toFixed(
    1,
  );
  console.log(
    `[PerspectiveTransform] 输出尺寸: ${width}x${height} (${sizeRatio}% 原图面积)`,
  );

  // 临时变量，用于最后释放内存
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mats: any[] = [];

  try {
    // 1. 读取源图像
    const src = cv.imread(imageSource);
    mats.push(src);

    // 2. 定义目标角点（输出矩形的四个角）
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

    console.log("[PerspectiveTransform] 处理完成");
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
