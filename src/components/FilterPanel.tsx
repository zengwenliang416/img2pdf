"use client";

/**
 * 滤镜选择面板 v2
 * 支持每页独立滤镜选择
 * 支持批量应用滤镜到所有页面
 */

import { useCallback } from "react";
import { useAppStore, type Rotation, type PageOrientation } from "@/lib/store";
import {
  AVAILABLE_FILTERS,
  getFilterName,
  type FilterType,
} from "@/lib/opencv";
import { useExport, useFilterPreview } from "@/hooks";
import { ProgressOverlay } from "./ProgressOverlay";
import { PageStrip } from "./PageStrip";
import { ExportSettingsModal } from "./ExportSettingsModal";
import { Button } from "./ui";
import { filterPanelLogger as log } from "@/lib/utils/logger";

// 预览图最大宽度
const PREVIEW_MAX_WIDTH = 400;

export function FilterPanel() {
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
    setExportSettingsOpen,
  } = useAppStore();

  // 当前图片
  const currentImage = images[currentIndex];

  // 滤镜预览 hook
  const {
    previewUrls,
    filterPreviews,
    isProcessing,
    imagesRef,
    applyFilterToImage,
    updatePreview,
    setIsProcessing,
  } = useFilterPreview();

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
          updatePreview(currentImage.id, filteredUrl);
          setFilteredImage(filteredUrl);
        }
      } catch (err) {
        log.error("应用滤镜失败:", err);
        setError(err instanceof Error ? err.message : "应用滤镜失败");
      } finally {
        setIsProcessing(false);
      }
    },
    [
      currentImage,
      updateImageById,
      applyFilterToImage,
      updatePreview,
      setFilteredImage,
      setError,
      setIsProcessing,
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
      let currentFiltered: string | null = null;

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
          updatePreview(img.id, filteredUrl);
          // 记录当前图片的滤镜结果
          if (img.id === currentImage.id) {
            currentFiltered = filteredUrl;
          }
        }

        setLoadingProgress({
          done: i + 1,
          total: images.length,
          label: "批量应用",
        });
      }

      // 更新 store 中当前图片的滤镜结果
      if (currentFiltered) {
        setFilteredImage(currentFiltered);
      }
    } catch (err) {
      log.error("批量应用滤镜失败:", err);
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
    updatePreview,
    setFilteredImage,
    setLoading,
    setLoadingProgress,
    setError,
    setIsProcessing,
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
    <div className="flex flex-col items-center gap-6 p-6 w-full max-w-2xl mx-auto">
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
        <ProgressOverlay show={isLoading || isProcessing} type="filter" />
      </div>

      {/* 旋转控制 */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => handleRotate("ccw")}
          disabled={isLoading || isProcessing}
          className="flex items-center gap-2 px-5 py-3 rounded-xl border-2 border-gray-200 text-gray-700 hover:bg-gray-50 hover:border-gray-300 disabled:opacity-50 transition-all"
          title="逆时针旋转 90°"
        >
          <svg
            className="w-6 h-6"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M2.5 2v6h6M2.66 15.57a10 10 0 1 0 .57-8.38" />
          </svg>
          <span className="text-base font-medium">左转</span>
        </button>
        <span className="text-base font-semibold text-gray-600 min-w-[3rem] text-center">
          {currentImage?.rotation || 0}°
        </span>
        <button
          onClick={() => handleRotate("cw")}
          disabled={isLoading || isProcessing}
          className="flex items-center gap-2 px-5 py-3 rounded-xl border-2 border-gray-200 text-gray-700 hover:bg-gray-50 hover:border-gray-300 disabled:opacity-50 transition-all"
          title="顺时针旋转 90°"
        >
          <svg
            className="w-6 h-6"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38" />
          </svg>
          <span className="text-base font-medium">右转</span>
        </button>
      </div>

      {/* 滤镜选择 */}
      <div className="flex gap-4 overflow-x-auto py-3 px-2">
        {AVAILABLE_FILTERS.map((filter) => (
          <button
            key={filter}
            onClick={() => handleSelectFilter(filter)}
            disabled={isLoading || isProcessing}
            className={`
              flex flex-col items-center gap-2 p-3 rounded-xl transition-all
              ${
                currentFilter === filter
                  ? "ring-3 ring-blue-500 bg-blue-50 shadow-md"
                  : "hover:bg-gray-50 hover:shadow-sm"
              }
              disabled:opacity-50
            `}
          >
            <div className="w-20 h-20 rounded-lg overflow-hidden bg-gray-200 shadow-inner">
              {filterPreviews[filter] ? (
                <img
                  src={filterPreviews[filter]}
                  alt={getFilterName(filter)}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <div className="w-5 h-5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                </div>
              )}
            </div>
            <span className="text-sm font-medium text-gray-700">
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
          className="px-5 py-2.5 text-base font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-xl transition-colors disabled:opacity-50"
        >
          将「{getFilterName(currentFilter)}」应用到所有页面
        </button>
      )}

      {/* 页面方向选择 */}
      <div className="w-full max-w-md">
        <label className="block text-base font-medium text-gray-700 mb-3 text-center">
          当前页导出方向
        </label>
        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={() => handleSelectOrientation("portrait")}
            disabled={isLoading || isProcessing}
            className={`
              flex items-center justify-center gap-3 px-5 py-4 rounded-xl border-2 transition-all
              ${
                currentImage?.orientation === "portrait"
                  ? "border-blue-500 bg-blue-50 text-blue-700 shadow-md"
                  : "border-gray-200 text-gray-700 hover:border-gray-300 hover:shadow-sm"
              }
              disabled:opacity-50
            `}
          >
            <svg className="w-5 h-8" viewBox="0 0 16 24" fill="currentColor">
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
            <span className="text-base font-medium">纵向</span>
          </button>
          <button
            onClick={() => handleSelectOrientation("landscape")}
            disabled={isLoading || isProcessing}
            className={`
              flex items-center justify-center gap-3 px-5 py-4 rounded-xl border-2 transition-all
              ${
                currentImage?.orientation === "landscape"
                  ? "border-blue-500 bg-blue-50 text-blue-700 shadow-md"
                  : "border-gray-200 text-gray-700 hover:border-gray-300 hover:shadow-sm"
              }
              disabled:opacity-50
            `}
          >
            <svg className="w-8 h-5" viewBox="0 0 24 16" fill="currentColor">
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
            <span className="text-base font-medium">横向</span>
          </button>
        </div>
        {/* 应用方向到全部按钮（多图时显示） */}
        {images.length > 1 && (
          <button
            onClick={handleApplyOrientationToAll}
            disabled={isLoading || isProcessing}
            className="w-full mt-3 px-5 py-2 text-sm font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-xl transition-colors disabled:opacity-50"
          >
            将「{currentImage?.orientation === "portrait" ? "纵向" : "横向"}
            」应用到所有页面
          </button>
        )}
      </div>

      {/* 操作按钮 */}
      <div className="flex flex-col gap-4 w-full max-w-md mt-6">
        {/* 返回按钮 */}
        <Button
          variant="secondary"
          onClick={goBack}
          disabled={isLoading || isProcessing}
          fullWidth
          leftIcon={
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
                d="M15 19l-7-7 7-7"
              />
            </svg>
          }
        >
          返回裁剪
        </Button>

        {/* 主要导出按钮 */}
        <div className="flex gap-3">
          <Button
            variant="primary"
            size="lg"
            onClick={handleExportPdf}
            disabled={isLoading || isProcessing || !canExportPdf}
            fullWidth
            leftIcon={
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
            }
          >
            导出 PDF {imageCount > 1 && `(${imageCount}页)`}
          </Button>
        </div>

        {/* 其他导出选项 */}
        <div className="flex gap-3">
          <Button
            variant="secondary"
            onClick={handleExportJpg}
            disabled={isLoading || isProcessing || !canExportJpg}
            fullWidth
          >
            导出 JPG
          </Button>
          {canExportZip && (
            <Button
              variant="ghost"
              onClick={handleExportZip}
              disabled={isLoading || isProcessing}
              fullWidth
            >
              导出 ZIP ({imageCount}张)
            </Button>
          )}
        </div>
      </div>

      {/* 导出设置弹窗 */}
      <ExportSettingsModal
        imageUrls={Array.from(previewUrls.values())}
        onConfirm={doExportPdf}
      />
    </div>
  );
}
