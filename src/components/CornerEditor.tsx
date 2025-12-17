"use client";

/**
 * 四点拖拽编辑器
 * 用于调整文档边界的四个角点
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { useAppStore } from "@/lib/store";
import {
  ensureOpenCV,
  detectDocumentEdges,
  getDefaultCorners,
  applyPerspectiveTransform,
  type Corners,
  type Point,
} from "@/lib/opencv";

// 角点拖拽手柄大小
const HANDLE_SIZE = 24;
// 最小显示尺寸
const MIN_DISPLAY_WIDTH = 300;
const MAX_DISPLAY_WIDTH = 600;

export function CornerEditor() {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const isDetectingRef = useRef(false); // 防止重复执行边缘检测

  const {
    originalImage,
    imageSize,
    corners,
    setCorners,
    setCroppedImage,
    setLoading,
    setError,
    goBack,
    isLoading,
    loadingMessage,
  } = useAppStore();

  // 显示尺寸和缩放比例
  const [displaySize, setDisplaySize] = useState({ width: 0, height: 0 });
  const [scale, setScale] = useState(1);

  // 当前拖拽的角点索引
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);

  /**
   * 计算显示尺寸
   */
  useEffect(() => {
    if (!imageSize || !containerRef.current) return;

    const containerWidth = Math.min(
      containerRef.current.clientWidth - 32,
      MAX_DISPLAY_WIDTH,
    );
    const maxWidth = Math.max(containerWidth, MIN_DISPLAY_WIDTH);

    const aspectRatio = imageSize.width / imageSize.height;
    let width = Math.min(maxWidth, imageSize.width);
    let height = width / aspectRatio;

    // 如果高度太大，按高度限制
    const maxHeight = window.innerHeight * 0.6;
    if (height > maxHeight) {
      height = maxHeight;
      width = height * aspectRatio;
    }

    setDisplaySize({ width, height });
    setScale(width / imageSize.width);
  }, [imageSize]);

  /**
   * 加载图片并检测边缘
   */
  useEffect(() => {
    console.log(
      "[CornerEditor] useEffect 触发, originalImage:",
      !!originalImage,
      "imageSize:",
      !!imageSize,
      "isDetecting:",
      isDetectingRef.current,
    );
    if (!originalImage || !imageSize) return;

    // 防止 React StrictMode 下的重复执行
    if (isDetectingRef.current) {
      console.log("[CornerEditor] 跳过重复执行");
      return;
    }
    isDetectingRef.current = true;

    const loadAndDetect = async () => {
      console.log("[CornerEditor] 开始 loadAndDetect");
      setLoading(true, "正在加载 OpenCV...");

      try {
        // 先加载图片，不需要等 OpenCV
        console.log("[CornerEditor] 开始加载图片...");
        const img = new Image();
        await new Promise<void>((resolve, reject) => {
          img.onload = () => {
            console.log(
              "[CornerEditor] 图片加载成功:",
              img.width,
              "x",
              img.height,
            );
            resolve();
          };
          img.onerror = () => reject(new Error("加载图片失败"));
          img.src = originalImage;
        });
        imageRef.current = img;
        console.log("[CornerEditor] 图片已存储到 imageRef");

        // 暂时跳过边缘检测，直接使用默认角点
        // TODO: 修复 OpenCV 阻塞问题后恢复边缘检测
        console.log("[CornerEditor] 使用默认角点（暂时跳过边缘检测）");
        const defaultCorners = getDefaultCorners(
          imageSize.width,
          imageSize.height,
          Math.min(imageSize.width, imageSize.height) * 0.05,
        );
        setCorners(defaultCorners);
        console.log("[CornerEditor] 角点已设置:", defaultCorners);
      } catch (err) {
        console.error("边缘检测失败:", err);
        setError(err instanceof Error ? err.message : "边缘检测失败");

        // 设置默认角点
        if (imageSize) {
          const defaultCorners = getDefaultCorners(
            imageSize.width,
            imageSize.height,
          );
          setCorners(defaultCorners);
        }
      } finally {
        setLoading(false);
      }
    };

    loadAndDetect();
  }, [originalImage, imageSize, setCorners, setLoading, setError]);

  /**
   * 绘制预览
   */
  const drawPreview = useCallback(() => {
    const canvas = canvasRef.current;
    const img = imageRef.current;
    if (!canvas || !img || !corners || displaySize.width === 0) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // 设置 Canvas 尺寸
    canvas.width = displaySize.width;
    canvas.height = displaySize.height;

    // 绘制图片
    ctx.drawImage(img, 0, 0, displaySize.width, displaySize.height);

    // 绘制半透明遮罩
    ctx.fillStyle = "rgba(0, 0, 0, 0.3)";
    ctx.fillRect(0, 0, displaySize.width, displaySize.height);

    // 绘制选中区域（裁掉遮罩）
    const scaledCorners = corners.map((p) => ({
      x: p.x * scale,
      y: p.y * scale,
    }));

    ctx.save();
    ctx.beginPath();
    ctx.moveTo(scaledCorners[0].x, scaledCorners[0].y);
    for (let i = 1; i < scaledCorners.length; i++) {
      ctx.lineTo(scaledCorners[i].x, scaledCorners[i].y);
    }
    ctx.closePath();
    ctx.clip();

    // 重新绘制图片（选中区域）
    ctx.drawImage(img, 0, 0, displaySize.width, displaySize.height);
    ctx.restore();

    // 绘制边框
    ctx.strokeStyle = "#3B82F6";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(scaledCorners[0].x, scaledCorners[0].y);
    for (let i = 1; i < scaledCorners.length; i++) {
      ctx.lineTo(scaledCorners[i].x, scaledCorners[i].y);
    }
    ctx.closePath();
    ctx.stroke();
  }, [corners, displaySize, scale]);

  useEffect(() => {
    drawPreview();
  }, [drawPreview]);

  /**
   * 获取触摸/鼠标位置（相对于 Canvas）
   */
  const getPosition = useCallback(
    (e: React.MouseEvent | React.TouchEvent): Point => {
      const canvas = canvasRef.current;
      if (!canvas) return { x: 0, y: 0 };

      const rect = canvas.getBoundingClientRect();
      let clientX: number, clientY: number;

      if ("touches" in e) {
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
      } else {
        clientX = e.clientX;
        clientY = e.clientY;
      }

      return {
        x: (clientX - rect.left) / scale,
        y: (clientY - rect.top) / scale,
      };
    },
    [scale],
  );

  /**
   * 开始拖拽
   */
  const handleDragStart = useCallback(
    (index: number) => (e: React.MouseEvent | React.TouchEvent) => {
      e.preventDefault();
      setDraggingIndex(index);
    },
    [],
  );

  /**
   * 拖拽中
   */
  const handleDrag = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      if (draggingIndex === null || !corners || !imageSize) return;

      const pos = getPosition(e);

      // 限制在图像范围内
      const clampedX = Math.max(0, Math.min(imageSize.width, pos.x));
      const clampedY = Math.max(0, Math.min(imageSize.height, pos.y));

      const newCorners = [...corners] as Corners;
      newCorners[draggingIndex] = { x: clampedX, y: clampedY };
      setCorners(newCorners);
    },
    [draggingIndex, corners, imageSize, getPosition, setCorners],
  );

  /**
   * 结束拖拽
   */
  const handleDragEnd = useCallback(() => {
    setDraggingIndex(null);
  }, []);

  /**
   * 确认裁剪
   */
  const handleConfirm = useCallback(async () => {
    if (!corners || !imageRef.current) return;

    setLoading(true, "正在处理图片...");

    try {
      // 创建临时 Canvas
      const tempCanvas = document.createElement("canvas");
      tempCanvas.width = imageRef.current.naturalWidth;
      tempCanvas.height = imageRef.current.naturalHeight;
      const ctx = tempCanvas.getContext("2d");
      if (!ctx) throw new Error("无法创建 Canvas 上下文");
      ctx.drawImage(imageRef.current, 0, 0);

      // 执行透视变换
      const croppedDataUrl = await applyPerspectiveTransform(
        tempCanvas,
        corners,
      );

      setCroppedImage(croppedDataUrl);
    } catch (err) {
      console.error("透视变换失败:", err);
      setError(err instanceof Error ? err.message : "图片处理失败");
    } finally {
      setLoading(false);
    }
  }, [corners, setCroppedImage, setLoading, setError]);

  /**
   * 重置角点
   */
  const handleReset = useCallback(() => {
    if (!imageSize) return;
    const defaultCorners = getDefaultCorners(imageSize.width, imageSize.height);
    setCorners(defaultCorners);
  }, [imageSize, setCorners]);

  if (!originalImage || !imageSize) {
    return null;
  }

  const scaledCorners = corners?.map((p) => ({
    x: p.x * scale,
    y: p.y * scale,
  }));

  return (
    <div
      ref={containerRef}
      className="flex flex-col items-center gap-4 p-4 w-full"
    >
      {/* 标题 */}
      <div className="text-center">
        <h2 className="text-lg font-semibold text-gray-800">调整文档边界</h2>
        <p className="text-sm text-gray-500">拖动四角调整裁剪区域</p>
      </div>

      {/* 编辑区域 */}
      <div
        className="relative touch-none"
        style={{ width: displaySize.width, height: displaySize.height }}
        onMouseMove={handleDrag}
        onMouseUp={handleDragEnd}
        onMouseLeave={handleDragEnd}
        onTouchMove={handleDrag}
        onTouchEnd={handleDragEnd}
      >
        {/* Canvas */}
        <canvas ref={canvasRef} className="rounded-lg shadow-lg" />

        {/* 角点手柄 */}
        {scaledCorners?.map((point, index) => (
          <div
            key={index}
            className={`
              absolute rounded-full bg-white border-2 border-blue-500
              shadow-md cursor-move transition-transform
              ${draggingIndex === index ? "scale-125 bg-blue-100" : "hover:scale-110"}
            `}
            style={{
              width: HANDLE_SIZE,
              height: HANDLE_SIZE,
              left: point.x - HANDLE_SIZE / 2,
              top: point.y - HANDLE_SIZE / 2,
            }}
            onMouseDown={handleDragStart(index)}
            onTouchStart={handleDragStart(index)}
          />
        ))}

        {/* 加载遮罩 */}
        {isLoading && (
          <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center rounded-lg">
            <div className="w-10 h-10 border-4 border-white border-t-transparent rounded-full animate-spin" />
            <p className="mt-2 text-white text-sm">{loadingMessage}</p>
          </div>
        )}
      </div>

      {/* 操作按钮 */}
      <div className="flex gap-3">
        <button
          onClick={goBack}
          disabled={isLoading}
          className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-100 disabled:opacity-50"
        >
          返回
        </button>
        <button
          onClick={handleReset}
          disabled={isLoading}
          className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-100 disabled:opacity-50"
        >
          重置
        </button>
        <button
          onClick={handleConfirm}
          disabled={isLoading || !corners}
          className="px-6 py-2 rounded-lg bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-50"
        >
          确认裁剪
        </button>
      </div>
    </div>
  );
}
