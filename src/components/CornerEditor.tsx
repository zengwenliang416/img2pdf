"use client";

/**
 * 四点拖拽编辑器
 * 用于调整文档边界的四个角点
 * 支持多图片导航和输出尺寸调整
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { useAppStore } from "@/lib/store";
import {
  getDefaultCorners,
  applyPerspectiveTransform,
  calculateOutputSize,
  detectDocumentEdges,
  type Corners,
  type Point,
} from "@/lib/opencv";
import { useSizeEditor } from "@/hooks";

// 角点拖拽手柄大小
const HANDLE_SIZE = 24;
// 最小显示尺寸
const MIN_DISPLAY_WIDTH = 300;
const MAX_DISPLAY_WIDTH = 600;

export function CornerEditor() {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const isDetectingRef = useRef(false);

  const {
    images,
    currentIndex,
    setCurrentIndex,
    setCorners,
    setCroppedImage,
    setOutputSize,
    setLoading,
    setError,
    goBack,
    finishCrop,
    removeImage,
    isLoading,
    loadingMessage,
  } = useAppStore();

  // 当前图片
  const currentImage = images[currentIndex];

  // 显示尺寸和缩放比例
  const [displaySize, setDisplaySize] = useState({ width: 0, height: 0 });
  const [scale, setScale] = useState(1);

  // 当前拖拽的角点索引
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);

  // 输出尺寸调整
  const [showSizeEditor, setShowSizeEditor] = useState(false);
  const {
    width: customWidth,
    height: customHeight,
    keepAspectRatio,
    setKeepAspectRatio,
    setWidth: handleWidthChange,
    setHeight: handleHeightChange,
    setSize: setSizeFromCorners,
    applyPreset,
    presets,
  } = useSizeEditor();

  /**
   * 计算显示尺寸
   */
  useEffect(() => {
    if (!currentImage?.size || !containerRef.current) return;

    const containerWidth = Math.min(
      containerRef.current.clientWidth - 32,
      MAX_DISPLAY_WIDTH,
    );
    const maxWidth = Math.max(containerWidth, MIN_DISPLAY_WIDTH);

    const aspectRatio = currentImage.size.width / currentImage.size.height;
    let width = Math.min(maxWidth, currentImage.size.width);
    let height = width / aspectRatio;

    // 如果高度太大，按高度限制
    const maxHeight = window.innerHeight * 0.5;
    if (height > maxHeight) {
      height = maxHeight;
      width = height * aspectRatio;
    }

    setDisplaySize({ width, height });
    setScale(width / currentImage.size.width);
  }, [currentImage?.size]);

  /**
   * 加载图片并自动检测边缘
   */
  useEffect(() => {
    if (!currentImage) return;

    // 防止 React StrictMode 下的重复执行
    const imageId = currentImage.id;
    if (isDetectingRef.current) {
      return;
    }
    isDetectingRef.current = true;

    const loadImage = async () => {
      setLoading(true, "正在加载图片...");

      try {
        const img = new Image();
        await new Promise<void>((resolve, reject) => {
          img.onload = () => resolve();
          img.onerror = () => reject(new Error("加载图片失败"));
          img.src = currentImage.original;
        });
        imageRef.current = img;

        // 如果没有角点，尝试自动检测边缘
        if (!currentImage.corners) {
          setLoading(true, "正在智能识别文档边缘...");

          try {
            // 尝试自动检测文档边缘
            const detectedCorners = await detectDocumentEdges(img, {
              cannyLow: 50,
              cannyHigh: 150,
              minAreaRatio: 0.1,
            });

            if (detectedCorners) {
              // 检测成功，使用检测到的角点
              setCorners(detectedCorners);
            } else {
              // 检测失败，使用默认角点（带边距）
              const defaultCorners = getDefaultCorners(
                currentImage.size.width,
                currentImage.size.height,
                Math.min(currentImage.size.width, currentImage.size.height) *
                  0.05,
              );
              setCorners(defaultCorners);
            }
          } catch (detectError) {
            console.warn("边缘检测失败，使用默认角点:", detectError);
            // 检测出错，使用默认角点
            const defaultCorners = getDefaultCorners(
              currentImage.size.width,
              currentImage.size.height,
              Math.min(currentImage.size.width, currentImage.size.height) *
                0.05,
            );
            setCorners(defaultCorners);
          }
        }

        // 初始化输出尺寸
        if (currentImage.corners) {
          const size = calculateOutputSize(currentImage.corners);
          setSizeFromCorners(size.width, size.height);
        }
      } catch (err) {
        console.error("加载图片失败:", err);
        setError(err instanceof Error ? err.message : "加载图片失败");

        if (currentImage.size) {
          const defaultCorners = getDefaultCorners(
            currentImage.size.width,
            currentImage.size.height,
          );
          setCorners(defaultCorners);
        }
      } finally {
        setLoading(false);
        isDetectingRef.current = false;
      }
    };

    loadImage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentImage?.id]);

  /**
   * 当角点变化时更新输出尺寸
   */
  useEffect(() => {
    if (currentImage?.corners) {
      const size = calculateOutputSize(currentImage.corners);
      setSizeFromCorners(size.width, size.height);
    }
  }, [currentImage?.corners, setSizeFromCorners]);

  /**
   * 绘制预览
   */
  const drawPreview = useCallback(() => {
    const canvas = canvasRef.current;
    const img = imageRef.current;
    const corners = currentImage?.corners;
    if (!canvas || !img || !corners || displaySize.width === 0) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = displaySize.width;
    canvas.height = displaySize.height;

    ctx.drawImage(img, 0, 0, displaySize.width, displaySize.height);

    // 绘制半透明遮罩
    ctx.fillStyle = "rgba(0, 0, 0, 0.3)";
    ctx.fillRect(0, 0, displaySize.width, displaySize.height);

    // 绘制选中区域
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
  }, [currentImage?.corners, displaySize, scale]);

  useEffect(() => {
    drawPreview();
  }, [drawPreview]);

  /**
   * 获取触摸/鼠标位置
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

  const handleDragStart = useCallback(
    (index: number) => (e: React.MouseEvent | React.TouchEvent) => {
      e.preventDefault();
      setDraggingIndex(index);
    },
    [],
  );

  const handleDrag = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      if (
        draggingIndex === null ||
        !currentImage?.corners ||
        !currentImage.size
      )
        return;

      const pos = getPosition(e);
      const clampedX = Math.max(0, Math.min(currentImage.size.width, pos.x));
      const clampedY = Math.max(0, Math.min(currentImage.size.height, pos.y));

      const newCorners = [...currentImage.corners] as Corners;
      newCorners[draggingIndex] = { x: clampedX, y: clampedY };
      setCorners(newCorners);
    },
    [
      draggingIndex,
      currentImage?.corners,
      currentImage?.size,
      getPosition,
      setCorners,
    ],
  );

  const handleDragEnd = useCallback(() => {
    setDraggingIndex(null);
  }, []);

  /**
   * 确认裁剪
   */
  const handleConfirm = useCallback(async () => {
    if (!currentImage?.corners || !imageRef.current) return;

    setLoading(true, "正在处理图片...");

    try {
      const tempCanvas = document.createElement("canvas");
      tempCanvas.width = imageRef.current.naturalWidth;
      tempCanvas.height = imageRef.current.naturalHeight;
      const ctx = tempCanvas.getContext("2d");
      if (!ctx) throw new Error("无法创建 Canvas 上下文");
      ctx.drawImage(imageRef.current, 0, 0);

      // 使用自定义输出尺寸
      const outputSize =
        customWidth > 0 && customHeight > 0
          ? { width: customWidth, height: customHeight }
          : undefined;

      const croppedDataUrl = await applyPerspectiveTransform(
        tempCanvas,
        currentImage.corners,
        outputSize,
      );

      setCroppedImage(croppedDataUrl);
      if (outputSize) {
        setOutputSize(outputSize);
      }

      // 重置检测标志，准备处理下一张
      isDetectingRef.current = false;

      // 进入下一张或滤镜步骤
      finishCrop();
    } catch (err) {
      console.error("透视变换失败:", err);
      setError(err instanceof Error ? err.message : "图片处理失败");
    } finally {
      setLoading(false);
    }
  }, [
    currentImage?.corners,
    customWidth,
    customHeight,
    setCroppedImage,
    setOutputSize,
    setLoading,
    setError,
    finishCrop,
  ]);

  /**
   * 重置角点
   */
  const handleReset = useCallback(() => {
    if (!currentImage?.size) return;
    const defaultCorners = getDefaultCorners(
      currentImage.size.width,
      currentImage.size.height,
    );
    setCorners(defaultCorners);
  }, [currentImage?.size, setCorners]);

  /**
   * 智能识别 - 手动触发边缘检测
   */
  const handleAutoDetect = useCallback(async () => {
    if (!imageRef.current || !currentImage?.size) return;

    setLoading(true, "正在智能识别文档边缘...");

    try {
      const detectedCorners = await detectDocumentEdges(imageRef.current, {
        cannyLow: 50,
        cannyHigh: 150,
        minAreaRatio: 0.1,
      });

      if (detectedCorners) {
        setCorners(detectedCorners);
      } else {
        // 检测失败时提示用户
        setError("未能识别到文档边缘，请手动调整角点");
        // 使用默认角点
        const defaultCorners = getDefaultCorners(
          currentImage.size.width,
          currentImage.size.height,
          Math.min(currentImage.size.width, currentImage.size.height) * 0.05,
        );
        setCorners(defaultCorners);
      }
    } catch (err) {
      console.error("边缘检测失败:", err);
      setError("边缘检测失败，请手动调整角点");
    } finally {
      setLoading(false);
    }
  }, [currentImage?.size, setCorners, setLoading, setError]);

  /**
   * 删除当前图片
   */
  const handleRemove = useCallback(() => {
    removeImage(currentIndex);
  }, [removeImage, currentIndex]);

  if (!currentImage) {
    return null;
  }

  const scaledCorners = currentImage.corners?.map((p) => ({
    x: p.x * scale,
    y: p.y * scale,
  }));

  return (
    <div
      ref={containerRef}
      className="flex flex-col items-center gap-4 p-4 w-full"
    >
      {/* 标题和图片导航 */}
      <div className="text-center">
        <h2 className="text-lg font-semibold text-gray-800">调整文档边界</h2>
        <p className="text-sm text-gray-500">拖动四角调整裁剪区域</p>
        {images.length > 1 && (
          <p className="text-sm text-blue-600 mt-1">
            第 {currentIndex + 1} / {images.length} 张
          </p>
        )}
      </div>

      {/* 多图缩略图导航 */}
      {images.length > 1 && (
        <div className="flex gap-2 overflow-x-auto py-2 px-1 max-w-full">
          {images.map((img, index) => (
            <button
              key={img.id}
              onClick={() => {
                isDetectingRef.current = false;
                setCurrentIndex(index);
              }}
              className={`
                relative flex-shrink-0 w-12 h-12 rounded-lg overflow-hidden border-2
                ${
                  index === currentIndex
                    ? "border-blue-500 ring-2 ring-blue-200"
                    : "border-gray-200 hover:border-gray-400"
                }
                ${img.cropped ? "opacity-50" : ""}
              `}
            >
              <img
                src={img.original}
                alt={`图片 ${index + 1}`}
                className="w-full h-full object-cover"
              />
              {img.cropped && (
                <div className="absolute inset-0 bg-green-500/30 flex items-center justify-center">
                  <svg
                    className="w-6 h-6 text-green-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={3}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </div>
              )}
            </button>
          ))}
        </div>
      )}

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

      {/* 输出尺寸调整 */}
      <div className="w-full max-w-md">
        <button
          onClick={() => setShowSizeEditor(!showSizeEditor)}
          className="flex items-center gap-2 text-sm text-gray-600 hover:text-blue-600"
        >
          <svg
            className={`w-4 h-4 transition-transform ${showSizeEditor ? "rotate-90" : ""}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5l7 7-7 7"
            />
          </svg>
          调整输出尺寸
        </button>

        {showSizeEditor && (
          <div className="mt-3 p-3 bg-gray-50 rounded-lg space-y-3">
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={keepAspectRatio}
                  onChange={(e) => setKeepAspectRatio(e.target.checked)}
                  className="rounded text-blue-500"
                />
                <span className="text-sm text-gray-600">保持比例</span>
              </label>
            </div>

            <div className="flex gap-3">
              <div className="flex-1">
                <label className="block text-xs text-gray-500 mb-1">
                  宽度 (px)
                </label>
                <input
                  type="number"
                  value={customWidth}
                  onChange={(e) =>
                    handleWidthChange(parseInt(e.target.value) || 0)
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  min={1}
                />
              </div>
              <div className="flex-1">
                <label className="block text-xs text-gray-500 mb-1">
                  高度 (px)
                </label>
                <input
                  type="number"
                  value={customHeight}
                  onChange={(e) =>
                    handleHeightChange(parseInt(e.target.value) || 0)
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  min={1}
                />
              </div>
            </div>

            {/* 预设尺寸 */}
            <div className="flex gap-2 flex-wrap">
              {presets.map((preset) => (
                <button
                  key={preset.label}
                  onClick={() => applyPreset(preset)}
                  className="px-2 py-1 text-xs bg-white border border-gray-300 rounded hover:bg-gray-100"
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 操作按钮 */}
      <div className="flex gap-3 flex-wrap justify-center">
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
          onClick={handleAutoDetect}
          disabled={isLoading}
          className="px-4 py-2 rounded-lg border border-green-300 text-green-600 hover:bg-green-50 disabled:opacity-50 flex items-center gap-1"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
            />
          </svg>
          智能识别
        </button>
        {images.length > 1 && (
          <button
            onClick={handleRemove}
            disabled={isLoading}
            className="px-4 py-2 rounded-lg border border-red-300 text-red-600 hover:bg-red-50 disabled:opacity-50"
          >
            删除
          </button>
        )}
        <button
          onClick={handleConfirm}
          disabled={isLoading || !currentImage.corners}
          className="px-6 py-2 rounded-lg bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-50"
        >
          {currentIndex < images.length - 1 ? "下一张" : "确认裁剪"}
        </button>
      </div>
    </div>
  );
}
