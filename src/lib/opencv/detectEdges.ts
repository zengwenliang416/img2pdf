/**
 * 文档边缘检测算法
 * 使用 Canny 边缘检测 + 轮廓检测 + 多边形拟合
 */

import { ensureOpenCV } from "./ensureOpenCV";

/**
 * 表示一个点的坐标
 */
export interface Point {
  x: number;
  y: number;
}

/**
 * 表示四个角点（顺序：左上、右上、右下、左下）
 */
export type Corners = [Point, Point, Point, Point];

/**
 * 边缘检测配置
 */
export interface DetectConfig {
  // Canny 阈值
  cannyLow?: number;
  cannyHigh?: number;
  // 高斯模糊核大小
  blurSize?: number;
  // 多边形拟合精度系数
  approxEpsilon?: number;
  // 最小面积比例（相对于图像面积）
  minAreaRatio?: number;
}

const DEFAULT_CONFIG: Required<DetectConfig> = {
  cannyLow: 50,
  cannyHigh: 150,
  blurSize: 5,
  approxEpsilon: 0.02,
  minAreaRatio: 0.1,
};

/**
 * 对四个角点进行排序，确保顺序为：左上、右上、右下、左下
 * 使用 sum 和 diff 方法
 */
function sortCorners(points: Point[]): Corners {
  // 计算每个点的 sum(x+y) 和 diff(x-y)
  const withMetrics = points.map((p) => ({
    point: p,
    sum: p.x + p.y,
    diff: p.x - p.y,
  }));

  // 左上角：sum 最小
  // 右下角：sum 最大
  // 右上角：diff 最大
  // 左下角：diff 最小
  const sortedBySum = [...withMetrics].sort((a, b) => a.sum - b.sum);
  const sortedByDiff = [...withMetrics].sort((a, b) => a.diff - b.diff);

  const topLeft = sortedBySum[0].point;
  const bottomRight = sortedBySum[sortedBySum.length - 1].point;
  const topRight = sortedByDiff[sortedByDiff.length - 1].point;
  const bottomLeft = sortedByDiff[0].point;

  return [topLeft, topRight, bottomRight, bottomLeft];
}

/**
 * 检测图像中的文档边缘
 * @param imageSource 图像源（Canvas 或 Image 元素）
 * @param config 检测配置
 * @returns 检测到的四个角点，如果未检测到则返回 null
 */
export async function detectDocumentEdges(
  imageSource: HTMLCanvasElement | HTMLImageElement,
  config: DetectConfig = {},
): Promise<Corners | null> {
  console.log("[EdgeDetect] 开始边缘检测...");
  const cv = await ensureOpenCV();
  const cfg = { ...DEFAULT_CONFIG, ...config };

  // 临时变量，用于确保正确释放内存
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mats: any[] = [];

  try {
    // 1. 读取图像
    console.log("[EdgeDetect] 读取图像...");
    const src = cv.imread(imageSource);
    mats.push(src);
    console.log("[EdgeDetect] 图像尺寸:", src.cols, "x", src.rows);

    const imageArea = src.rows * src.cols;
    const minContourArea = imageArea * cfg.minAreaRatio;

    // 2. 转换为灰度图
    console.log("[EdgeDetect] 转换灰度图...");
    const gray = new cv.Mat();
    mats.push(gray);
    cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);

    // 3. 高斯模糊降噪
    console.log("[EdgeDetect] 高斯模糊...");
    const blurred = new cv.Mat();
    mats.push(blurred);
    cv.GaussianBlur(gray, blurred, new cv.Size(cfg.blurSize, cfg.blurSize), 0);

    // 4. Canny 边缘检测
    console.log("[EdgeDetect] Canny 边缘检测...");
    const edges = new cv.Mat();
    mats.push(edges);
    cv.Canny(blurred, edges, cfg.cannyLow, cfg.cannyHigh);

    // 5. 形态学闭操作，连接断开的边缘
    console.log("[EdgeDetect] 形态学操作...");
    const kernel = cv.getStructuringElement(cv.MORPH_RECT, new cv.Size(3, 3));
    mats.push(kernel);
    const closed = new cv.Mat();
    mats.push(closed);
    cv.morphologyEx(edges, closed, cv.MORPH_CLOSE, kernel);

    // 6. 查找轮廓
    console.log("[EdgeDetect] 查找轮廓...");
    const contours = new cv.MatVector();
    const hierarchy = new cv.Mat();
    mats.push(hierarchy);
    cv.findContours(
      closed,
      contours,
      hierarchy,
      cv.RETR_EXTERNAL,
      cv.CHAIN_APPROX_SIMPLE,
    );

    // 7. 按面积排序，找最大的四边形轮廓
    console.log("[EdgeDetect] 找到轮廓数量:", contours.size());
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const contourInfos: { index: number; area: number; contour: any }[] = [];

    for (let i = 0; i < contours.size(); i++) {
      const contour = contours.get(i);
      const area = cv.contourArea(contour);
      if (area >= minContourArea) {
        contourInfos.push({ index: i, area, contour });
      }
    }

    // 按面积降序排序
    contourInfos.sort((a, b) => b.area - a.area);

    // 8. 尝试拟合四边形
    for (const { contour } of contourInfos) {
      const perimeter = cv.arcLength(contour, true);
      const approx = new cv.Mat();
      mats.push(approx);

      cv.approxPolyDP(contour, approx, cfg.approxEpsilon * perimeter, true);

      // 检查是否是四边形
      if (approx.rows === 4) {
        // 提取四个角点
        const points: Point[] = [];
        for (let j = 0; j < 4; j++) {
          const ptr = approx.intPtr(j, 0);
          points.push({ x: ptr[0], y: ptr[1] });
        }

        // 清理 contours
        contours.delete();

        // 排序角点
        return sortCorners(points);
      }
    }

    // 未找到四边形，清理并返回 null
    console.log("[EdgeDetect] 未找到四边形");
    contours.delete();
    return null;
  } finally {
    console.log("[EdgeDetect] 清理资源...");
    // 释放所有 Mat 对象
    for (const mat of mats) {
      mat.delete();
    }
  }
}

/**
 * 根据图像尺寸生成默认的全图角点
 */
export function getDefaultCorners(
  width: number,
  height: number,
  margin: number = 20,
): Corners {
  return [
    { x: margin, y: margin },
    { x: width - margin, y: margin },
    { x: width - margin, y: height - margin },
    { x: margin, y: height - margin },
  ];
}
