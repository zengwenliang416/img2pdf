"use client";

/**
 * 滤镜选择面板 v2
 * 支持每页独立滤镜选择
 * 支持批量应用滤镜到所有页面
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { useAppStore, type Rotation, type PageOrientation } from "@/lib/store";
import {
  applyFilter,
  AVAILABLE_FILTERS,
  getFilterName,
  type FilterType,
} from "@/lib/opencv";
import { useExport } from "@/hooks";
import { ProgressOverlay } from "./ProgressOverlay";
import { PageStrip } from "./PageStrip";
import { ExportSettingsModal } from "./ExportSettingsModal";

// 预览图最大宽度
const PREVIEW_MAX_WIDTH = 400;

export function FilterPanel() {
  // 存储加载的图片元素
  const imagesRef = useRef<Map<string, HTMLImageElement>>(new Map());
  // 每张图片应用滤镜后的预览 URL
  const [previewUrls, setPreviewUrls] = useState<Map<string, string>>(
    new Map(),
  );
  // 滤镜效果缩略图（用当前图生成）
  const [filterPreviews, setFilterPreviews] = useState<
    Record<FilterType, string>
  >({} as Record<FilterType, string>);
  const [isProcessing, setIsProcessing] = useState(false);

  const {
    images,
    currentIndex,
    updateImageById,
    setFilteredImage,
    setLoading,
    setLoadingProgress,
    setError,
    goBack,
    isLoading,
    exportSettings,
    setExportSettingsOpen,
  } = useAppStore();

  // 当前图片
  const currentImage = images[currentIndex];

  // 导出功能 hook
  const {
    doExportPdf,
    handleExportJpg,
    handleExportZip,
    canExportPdf,
    canExportJpg,
    canExportZip,
    imageCount,
  } = useExport({ previewUrls });

  /**
   * 加载所有图片
   */
  useEffect(() => {
    if (images.length === 0) return;

    const loadImages = async () => {
      setLoading(true, "正在加载图片...");

      try {
        // 加载所有裁剪后的图片
        for (const img of images) {
          if (img.cropped && !imagesRef.current.has(img.id)) {
            const image = new Image();
            await new Promise<void>((resolve, reject) => {
              image.onload = () => resolve();
              image.onerror = () => reject(new Error("加载图片失败"));
              image.src = img.cropped!;
            });
            imagesRef.current.set(img.id, image);
          }
        }

        // 初始化：为每张图片应用其各自的滤镜
        await applyAllFilters();
      } catch (err) {
        console.error("加载图片失败:", err);
        setError(err instanceof Error ? err.message : "加载图片失败");
      } finally {
        setLoading(false);
      }
    };

    loadImages();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [images.length]);

  /**
   * 当前图片变化时，重新生成滤镜预览缩略图
   */
  useEffect(() => {
    if (!currentImage?.cropped) return;

    const generateFilterPreviews = async () => {
      const loadedImg = imagesRef.current.get(currentImage.id);
      if (!loadedImg) return;

      const aspectRatio = loadedImg.width / loadedImg.height;
      const thumbWidth = Math.min(100, loadedImg.width);
      const thumbHeight = thumbWidth / aspectRatio;

      const thumbCanvas = document.createElement("canvas");
      thumbCanvas.width = thumbWidth;
      thumbCanvas.height = thumbHeight;
      const thumbCtx = thumbCanvas.getContext("2d");
      if (!thumbCtx) return;
      thumbCtx.drawImage(loadedImg, 0, 0, thumbWidth, thumbHeight);

      const previews: Record<FilterType, string> = {} as Record<
        FilterType,
        string
      >;

      for (const filter of AVAILABLE_FILTERS) {
        previews[filter] = await applyFilter(thumbCanvas, filter);
      }

      setFilterPreviews(previews);
    };

    generateFilterPreviews();
  }, [currentImage?.id, currentImage?.cropped]);

  /**
   * 应用单张图片的滤镜并返回预览 URL
   */
  const applyFilterToImage = useCallback(
    async (imgId: string, filter: FilterType): Promise<string | null> => {
      const loadedImg = imagesRef.current.get(imgId);
      if (!loadedImg) return null;

      // 使用 naturalWidth/naturalHeight 确保使用原始图片尺寸
      const imgWidth = loadedImg.naturalWidth || loadedImg.width;
      const imgHeight = loadedImg.naturalHeight || loadedImg.height;

      const canvas = document.createElement("canvas");
      canvas.width = imgWidth;
      canvas.height = imgHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) return null;
      // 使用 3 参数形式，让浏览器以图片原始尺寸绘制，避免缩放导致的栅栏效果
      ctx.drawImage(loadedImg, 0, 0);

      console.log(
        `[FilterPanel] 应用滤镜 ${filter}，图片尺寸: ${imgWidth}x${imgHeight}`,
      );

      return applyFilter(canvas, filter);
    },
    [],
  );

  /**
   * 为所有图片应用各自的滤镜（初始化或刷新时使用）
   */
  const applyAllFilters = useCallback(async () => {
    setIsProcessing(true);
    setLoading(true, "正在应用滤镜...");
    setLoadingProgress({ done: 0, total: images.length, label: "处理中" });

    try {
      const newPreviewUrls = new Map<string, string>();

      for (let i = 0; i < images.length; i++) {
        const img = images[i];
        const filteredUrl = await applyFilterToImage(img.id, img.filter);
        if (filteredUrl) {
          newPreviewUrls.set(img.id, filteredUrl);
        }
        setLoadingProgress({
          done: i + 1,
          total: images.length,
          label: "处理中",
        });
      }

      setPreviewUrls(newPreviewUrls);

      // 更新 store 中当前图片的滤镜结果
      const currentFiltered = newPreviewUrls.get(currentImage?.id || "");
      if (currentFiltered) {
        setFilteredImage(currentFiltered);
      }
    } catch (err) {
      console.error("应用滤镜失败:", err);
      setError(err instanceof Error ? err.message : "应用滤镜失败");
    } finally {
      setLoading(false);
      setLoadingProgress(null);
      setIsProcessing(false);
    }
  }, [
    images,
    currentImage?.id,
    applyFilterToImage,
    setFilteredImage,
    setLoading,
    setLoadingProgress,
    setError,
  ]);

  /**
   * 选择滤镜（仅应用到当前页）
   */
  const handleSelectFilter = useCallback(
    async (filter: FilterType) => {
      if (!currentImage) return;

      setIsProcessing(true);

      try {
        // 更新当前图片的滤镜设置
        updateImageById(currentImage.id, { filter });

        // 应用滤镜并更新预览
        const filteredUrl = await applyFilterToImage(currentImage.id, filter);
        if (filteredUrl) {
          setPreviewUrls((prev) => {
            const next = new Map(prev);
            next.set(currentImage.id, filteredUrl);
            return next;
          });
          setFilteredImage(filteredUrl);
        }
      } catch (err) {
        console.error("应用滤镜失败:", err);
        setError(err instanceof Error ? err.message : "应用滤镜失败");
      } finally {
        setIsProcessing(false);
      }
    },
    [
      currentImage,
      updateImageById,
      applyFilterToImage,
      setFilteredImage,
      setError,
    ],
  );

  /**
   * 将当前滤镜应用到所有图片
   */
  const handleApplyToAll = useCallback(async () => {
    if (!currentImage) return;

    const currentFilterValue = currentImage.filter;

    setIsProcessing(true);
    setLoading(true, "正在应用滤镜到所有页面...");
    setLoadingProgress({ done: 0, total: images.length, label: "批量应用" });

    try {
      const newPreviewUrls = new Map<string, string>();

      for (let i = 0; i < images.length; i++) {
        const img = images[i];

        // 更新每张图片的滤镜设置
        if (img.filter !== currentFilterValue) {
          updateImageById(img.id, { filter: currentFilterValue });
        }

        // 应用滤镜
        const filteredUrl = await applyFilterToImage(
          img.id,
          currentFilterValue,
        );
        if (filteredUrl) {
          newPreviewUrls.set(img.id, filteredUrl);
        }

        setLoadingProgress({
          done: i + 1,
          total: images.length,
          label: "批量应用",
        });
      }

      setPreviewUrls(newPreviewUrls);

      // 更新 store 中当前图片的滤镜结果
      const currentFiltered = newPreviewUrls.get(currentImage.id);
      if (currentFiltered) {
        setFilteredImage(currentFiltered);
      }
    } catch (err) {
      console.error("批量应用滤镜失败:", err);
      setError(err instanceof Error ? err.message : "批量应用滤镜失败");
    } finally {
      setLoading(false);
      setLoadingProgress(null);
      setIsProcessing(false);
    }
  }, [
    images,
    currentImage,
    updateImageById,
    applyFilterToImage,
    setFilteredImage,
    setLoading,
    setLoadingProgress,
    setError,
  ]);

  /**
   * 选择页面方向（仅应用到当前页）
   */
  const handleSelectOrientation = useCallback(
    (orientation: PageOrientation) => {
      if (!currentImage) return;
      updateImageById(currentImage.id, { orientation });
    },
    [currentImage, updateImageById],
  );

  /**
   * 将当前方向应用到所有页面
   */
  const handleApplyOrientationToAll = useCallback(() => {
    if (!currentImage) return;

    const currentOrientation = currentImage.orientation;

    for (const img of images) {
      if (img.orientation !== currentOrientation) {
        updateImageById(img.id, { orientation: currentOrientation });
      }
    }
  }, [images, currentImage, updateImageById]);

  /**
   * 旋转当前图片（顺时针或逆时针 90 度）
   */
  const handleRotate = useCallback(
    (direction: "cw" | "ccw") => {
      if (!currentImage) return;

      const currentRotation = currentImage.rotation;
      const rotations: Rotation[] = [0, 90, 180, 270];
      const currentIdx = rotations.indexOf(currentRotation);

      let newIdx: number;
      if (direction === "cw") {
        // 顺时针：0 -> 90 -> 180 -> 270 -> 0
        newIdx = (currentIdx + 1) % 4;
      } else {
        // 逆时针：0 -> 270 -> 180 -> 90 -> 0
        newIdx = (currentIdx - 1 + 4) % 4;
      }

      updateImageById(currentImage.id, { rotation: rotations[newIdx] });
    },
    [currentImage, updateImageById],
  );

  /**
   * 打开导出设置弹窗
   */
  const handleExportPdf = useCallback(() => {
    if (previewUrls.size === 0) return;
    setExportSettingsOpen(true);
  }, [previewUrls.size, setExportSettingsOpen]);

  if (images.length === 0 || !currentImage?.cropped) {
    return null;
  }

  // 计算预览图尺寸（考虑旋转）
  const loadedImg = imagesRef.current.get(currentImage.id);
  const rotation = currentImage?.rotation || 0;
  const needSwapDimensions = rotation === 90 || rotation === 270;

  let previewWidth = PREVIEW_MAX_WIDTH;
  let previewHeight = PREVIEW_MAX_WIDTH;
  if (loadedImg) {
    // 根据旋转决定是否交换原始图片的宽高来计算宽高比
    const imgWidth = needSwapDimensions ? loadedImg.height : loadedImg.width;
    const imgHeight = needSwapDimensions ? loadedImg.width : loadedImg.height;
    const aspectRatio = imgWidth / imgHeight;

    if (aspectRatio > 1) {
      previewHeight = previewWidth / aspectRatio;
    } else {
      previewHeight = previewWidth / aspectRatio;
      if (previewHeight > window.innerHeight * 0.4) {
        previewHeight = window.innerHeight * 0.4;
        previewWidth = previewHeight * aspectRatio;
      }
    }
  }

  const currentPreviewUrl = previewUrls.get(currentImage.id);

  // 当前图片的滤镜
  const currentFilter = currentImage?.filter || "original";

  return (
    <div className="flex flex-col items-center gap-4 p-4 w-full">
      {/* 标题 */}
      <div className="text-center">
        <h2 className="text-lg font-semibold text-gray-800">选择滤镜</h2>
        <p className="text-sm text-gray-500">
          {images.length > 1
            ? `当前编辑第 ${currentIndex + 1} 页，共 ${images.length} 页`
            : "选择最适合的效果"}
        </p>
      </div>

      {/* 多图缩略图导航 */}
      <PageStrip
        previewUrls={previewUrls}
        disabled={isLoading || isProcessing}
      />

      {/* 预览图 */}
      <div
        className="relative rounded-lg overflow-hidden shadow-lg bg-gray-100 flex items-center justify-center"
        style={{ width: previewWidth, height: previewHeight }}
      >
        {currentPreviewUrl ? (
          <img
            src={currentPreviewUrl}
            alt="预览"
            className="object-contain transition-transform duration-200"
            style={{
              // 90°/270° 旋转时，图片尺寸需要交换以适应旋转后的显示
              maxWidth: needSwapDimensions ? previewHeight : previewWidth,
              maxHeight: needSwapDimensions ? previewWidth : previewHeight,
              transform: `rotate(${rotation}deg)`,
            }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {/* 图片计数 */}
        {images.length > 1 && (
          <div className="absolute top-2 right-2 bg-black/60 text-white text-sm px-2 py-1 rounded">
            {currentIndex + 1} / {images.length}
          </div>
        )}

        {/* 加载遮罩 */}
        <ProgressOverlay show={isLoading || isProcessing} />
      </div>

      {/* 旋转控制 */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => handleRotate("ccw")}
          disabled={isLoading || isProcessing}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-100 disabled:opacity-50 transition-colors"
          title="逆时针旋转 90°"
        >
          <svg
            className="w-5 h-5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M2.5 2v6h6M2.66 15.57a10 10 0 1 0 .57-8.38" />
          </svg>
          <span className="text-sm">左转</span>
        </button>
        <span className="text-sm text-gray-500">
          {currentImage?.rotation || 0}°
        </span>
        <button
          onClick={() => handleRotate("cw")}
          disabled={isLoading || isProcessing}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-100 disabled:opacity-50 transition-colors"
          title="顺时针旋转 90°"
        >
          <svg
            className="w-5 h-5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38" />
          </svg>
          <span className="text-sm">右转</span>
        </button>
      </div>

      {/* 滤镜选择 */}
      <div className="flex gap-3 overflow-x-auto py-2 px-1">
        {AVAILABLE_FILTERS.map((filter) => (
          <button
            key={filter}
            onClick={() => handleSelectFilter(filter)}
            disabled={isLoading || isProcessing}
            className={`
              flex flex-col items-center gap-1 p-2 rounded-lg transition-all
              ${
                currentFilter === filter
                  ? "ring-2 ring-blue-500 bg-blue-50"
                  : "hover:bg-gray-100"
              }
              disabled:opacity-50
            `}
          >
            <div className="w-16 h-16 rounded-md overflow-hidden bg-gray-200">
              {filterPreviews[filter] ? (
                <img
                  src={filterPreviews[filter]}
                  alt={getFilterName(filter)}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                </div>
              )}
            </div>
            <span className="text-xs text-gray-700">
              {getFilterName(filter)}
            </span>
          </button>
        ))}
      </div>

      {/* 应用滤镜到全部按钮（多图时显示） */}
      {images.length > 1 && (
        <button
          onClick={handleApplyToAll}
          disabled={isLoading || isProcessing}
          className="px-4 py-2 text-sm text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-50"
        >
          将「{getFilterName(currentFilter)}」应用到所有页面
        </button>
      )}

      {/* 页面方向选择 */}
      <div className="w-full max-w-xs">
        <label className="block text-sm font-medium text-gray-700 mb-2 text-center">
          当前页导出方向
        </label>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => handleSelectOrientation("portrait")}
            disabled={isLoading || isProcessing}
            className={`
              flex items-center justify-center gap-2 px-3 py-2 rounded-lg border-2 transition-colors
              ${
                currentImage?.orientation === "portrait"
                  ? "border-blue-500 bg-blue-50 text-blue-700"
                  : "border-gray-200 text-gray-700 hover:border-gray-300"
              }
              disabled:opacity-50
            `}
          >
            <svg className="w-4 h-6" viewBox="0 0 16 24" fill="currentColor">
              <rect
                x="1"
                y="1"
                width="14"
                height="22"
                rx="1"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              />
            </svg>
            <span className="text-sm font-medium">纵向</span>
          </button>
          <button
            onClick={() => handleSelectOrientation("landscape")}
            disabled={isLoading || isProcessing}
            className={`
              flex items-center justify-center gap-2 px-3 py-2 rounded-lg border-2 transition-colors
              ${
                currentImage?.orientation === "landscape"
                  ? "border-blue-500 bg-blue-50 text-blue-700"
                  : "border-gray-200 text-gray-700 hover:border-gray-300"
              }
              disabled:opacity-50
            `}
          >
            <svg className="w-6 h-4" viewBox="0 0 24 16" fill="currentColor">
              <rect
                x="1"
                y="1"
                width="22"
                height="14"
                rx="1"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              />
            </svg>
            <span className="text-sm font-medium">横向</span>
          </button>
        </div>
        {/* 应用方向到全部按钮（多图时显示） */}
        {images.length > 1 && (
          <button
            onClick={handleApplyOrientationToAll}
            disabled={isLoading || isProcessing}
            className="w-full mt-2 px-4 py-1.5 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-50"
          >
            将「{currentImage?.orientation === "portrait" ? "纵向" : "横向"}
            」应用到所有页面
          </button>
        )}
      </div>

      {/* 操作按钮 */}
      <div className="flex flex-col gap-3 w-full max-w-xs mt-2">
        <div className="flex gap-3">
          <button
            onClick={goBack}
            disabled={isLoading || isProcessing}
            className="flex-1 px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-100 disabled:opacity-50"
          >
            返回
          </button>
        </div>
        <div className="flex gap-3">
          <button
            onClick={handleExportPdf}
            disabled={isLoading || isProcessing || !canExportPdf}
            className="flex-1 px-4 py-3 rounded-lg bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-50 font-medium"
          >
            导出 PDF {imageCount > 1 && `(${imageCount}页)`}
          </button>
          <button
            onClick={handleExportJpg}
            disabled={isLoading || isProcessing || !canExportJpg}
            className="flex-1 px-4 py-3 rounded-lg border-2 border-blue-500 text-blue-500 hover:bg-blue-50 disabled:opacity-50 font-medium"
          >
            导出 JPG
          </button>
        </div>
        {canExportZip && (
          <button
            onClick={handleExportZip}
            disabled={isLoading || isProcessing}
            className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-100 disabled:opacity-50 text-sm"
          >
            导出 ZIP ({imageCount}张)
          </button>
        )}
      </div>

      {/* 导出设置弹窗 */}
      <ExportSettingsModal
        imageUrls={Array.from(previewUrls.values())}
        onConfirm={doExportPdf}
      />
    </div>
  );
}
