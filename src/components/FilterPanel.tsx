"use client";

/**
 * 滤镜选择面板
 * 预览和选择不同的图像滤镜
 * 支持多图片处理和导出
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { useAppStore } from "@/lib/store";
import {
  applyFilter,
  AVAILABLE_FILTERS,
  getFilterName,
  type FilterType,
} from "@/lib/opencv";
import { exportToPdf, exportToJpg, downloadBlob } from "@/lib/utils/exportPdf";

// 预览图最大宽度
const PREVIEW_MAX_WIDTH = 400;

export function FilterPanel() {
  const imagesRef = useRef<Map<string, HTMLImageElement>>(new Map());
  const [previewUrls, setPreviewUrls] = useState<Map<string, string>>(
    new Map(),
  );
  const [filterPreviews, setFilterPreviews] = useState<
    Record<FilterType, string>
  >({} as Record<FilterType, string>);
  const [isProcessing, setIsProcessing] = useState(false);

  const {
    images,
    currentIndex,
    setCurrentIndex,
    selectedFilter,
    setSelectedFilter,
    setFilteredImage,
    setLoading,
    setError,
    goBack,
    isLoading,
    loadingMessage,
    getProcessedImages,
  } = useAppStore();

  // 当前图片
  const currentImage = images[currentIndex];

  /**
   * 加载所有图片并生成滤镜预览
   */
  useEffect(() => {
    if (images.length === 0) return;

    const loadImages = async () => {
      setLoading(true, "正在生成预览...");

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

        // 用第一张图生成滤镜预览缩略图
        const firstImage = imagesRef.current.get(images[0]?.id);
        if (firstImage) {
          const aspectRatio = firstImage.width / firstImage.height;
          const thumbWidth = Math.min(100, firstImage.width);
          const thumbHeight = thumbWidth / aspectRatio;

          const thumbCanvas = document.createElement("canvas");
          thumbCanvas.width = thumbWidth;
          thumbCanvas.height = thumbHeight;
          const thumbCtx = thumbCanvas.getContext("2d");
          if (!thumbCtx) throw new Error("无法创建 Canvas 上下文");
          thumbCtx.drawImage(firstImage, 0, 0, thumbWidth, thumbHeight);

          const previews: Record<FilterType, string> = {} as Record<
            FilterType,
            string
          >;

          for (const filter of AVAILABLE_FILTERS) {
            previews[filter] = await applyFilter(thumbCanvas, filter);
          }

          setFilterPreviews(previews);
        }

        // 应用默认滤镜到所有图片
        await applyFilterToAll(selectedFilter);
      } catch (err) {
        console.error("生成预览失败:", err);
        setError(err instanceof Error ? err.message : "生成预览失败");
      } finally {
        setLoading(false);
      }
    };

    loadImages();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [images.length]);

  /**
   * 应用滤镜到所有图片
   */
  const applyFilterToAll = useCallback(
    async (filter: FilterType) => {
      setIsProcessing(true);
      setLoading(true, "正在应用滤镜...");

      try {
        const newPreviewUrls = new Map<string, string>();

        for (const img of images) {
          const loadedImg = imagesRef.current.get(img.id);
          if (!loadedImg) continue;

          const canvas = document.createElement("canvas");
          canvas.width = loadedImg.width;
          canvas.height = loadedImg.height;
          const ctx = canvas.getContext("2d");
          if (!ctx) continue;
          ctx.drawImage(loadedImg, 0, 0);

          const filteredUrl = await applyFilter(canvas, filter);
          newPreviewUrls.set(img.id, filteredUrl);
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
        setIsProcessing(false);
      }
    },
    [images, currentImage?.id, setFilteredImage, setLoading, setError],
  );

  /**
   * 选择滤镜
   */
  const handleSelectFilter = useCallback(
    (filter: FilterType) => {
      setSelectedFilter(filter);
      applyFilterToAll(filter);
    },
    [setSelectedFilter, applyFilterToAll],
  );

  /**
   * 导出为 PDF（所有图片）
   */
  const handleExportPdf = useCallback(async () => {
    const allUrls = Array.from(previewUrls.values());
    if (allUrls.length === 0) return;

    setLoading(true, "正在生成 PDF...");

    try {
      const blob = await exportToPdf(allUrls);
      const filename = `scan_${new Date().toISOString().slice(0, 10)}.pdf`;
      downloadBlob(blob, filename);
    } catch (err) {
      console.error("导出 PDF 失败:", err);
      setError(err instanceof Error ? err.message : "导出 PDF 失败");
    } finally {
      setLoading(false);
    }
  }, [previewUrls, setLoading, setError]);

  /**
   * 导出为 JPG（当前图片或打包所有）
   */
  const handleExportJpg = useCallback(async () => {
    const currentUrl = previewUrls.get(currentImage?.id || "");
    if (!currentUrl) return;

    setLoading(true, "正在导出图片...");

    try {
      // 如果只有一张图，直接导出
      // 如果有多张图，导出当前选中的
      const blob = await exportToJpg(currentUrl);
      const suffix = images.length > 1 ? `_${currentIndex + 1}` : "";
      const filename = `scan_${new Date().toISOString().slice(0, 10)}${suffix}.jpg`;
      downloadBlob(blob, filename);
    } catch (err) {
      console.error("导出 JPG 失败:", err);
      setError(err instanceof Error ? err.message : "导出 JPG 失败");
    } finally {
      setLoading(false);
    }
  }, [
    previewUrls,
    currentImage?.id,
    currentIndex,
    images.length,
    setLoading,
    setError,
  ]);

  /**
   * 导出所有图片为 JPG
   */
  const handleExportAllJpg = useCallback(async () => {
    const allUrls = Array.from(previewUrls.entries());
    if (allUrls.length === 0) return;

    setLoading(true, "正在导出所有图片...");

    try {
      for (let i = 0; i < allUrls.length; i++) {
        const [, url] = allUrls[i];
        const blob = await exportToJpg(url);
        const filename = `scan_${new Date().toISOString().slice(0, 10)}_${i + 1}.jpg`;
        downloadBlob(blob, filename);
        // 短暂延迟避免浏览器阻止多次下载
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    } catch (err) {
      console.error("导出 JPG 失败:", err);
      setError(err instanceof Error ? err.message : "导出 JPG 失败");
    } finally {
      setLoading(false);
    }
  }, [previewUrls, setLoading, setError]);

  if (images.length === 0 || !currentImage?.cropped) {
    return null;
  }

  // 计算预览图尺寸
  const loadedImg = imagesRef.current.get(currentImage.id);
  let previewWidth = PREVIEW_MAX_WIDTH;
  let previewHeight = PREVIEW_MAX_WIDTH;
  if (loadedImg) {
    const aspectRatio = loadedImg.width / loadedImg.height;
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

  return (
    <div className="flex flex-col items-center gap-4 p-4 w-full">
      {/* 标题 */}
      <div className="text-center">
        <h2 className="text-lg font-semibold text-gray-800">选择滤镜</h2>
        <p className="text-sm text-gray-500">
          {images.length > 1
            ? `选择滤镜将应用到所有 ${images.length} 张图片`
            : "选择最适合的效果"}
        </p>
      </div>

      {/* 多图缩略图导航 */}
      {images.length > 1 && (
        <div className="flex gap-2 overflow-x-auto py-2 px-1 max-w-full">
          {images.map((img, index) => (
            <button
              key={img.id}
              onClick={() => setCurrentIndex(index)}
              className={`
                relative flex-shrink-0 w-12 h-12 rounded-lg overflow-hidden border-2
                ${
                  index === currentIndex
                    ? "border-blue-500 ring-2 ring-blue-200"
                    : "border-gray-200 hover:border-gray-400"
                }
              `}
            >
              <img
                src={previewUrls.get(img.id) || img.cropped || img.original}
                alt={`图片 ${index + 1}`}
                className="w-full h-full object-cover"
              />
              <span className="absolute bottom-0 right-0 bg-black/60 text-white text-xs px-1">
                {index + 1}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* 预览图 */}
      <div
        className="relative rounded-lg overflow-hidden shadow-lg bg-gray-100"
        style={{ width: previewWidth, height: previewHeight }}
      >
        {currentPreviewUrl ? (
          <img
            src={currentPreviewUrl}
            alt="预览"
            className="w-full h-full object-contain"
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
        {(isLoading || isProcessing) && (
          <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center">
            <div className="w-8 h-8 border-4 border-white border-t-transparent rounded-full animate-spin" />
            <p className="mt-2 text-white text-sm">{loadingMessage}</p>
          </div>
        )}
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
                selectedFilter === filter
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
            disabled={isLoading || isProcessing || previewUrls.size === 0}
            className="flex-1 px-4 py-3 rounded-lg bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-50 font-medium"
          >
            导出 PDF {images.length > 1 && `(${images.length}页)`}
          </button>
          <button
            onClick={handleExportJpg}
            disabled={isLoading || isProcessing || !currentPreviewUrl}
            className="flex-1 px-4 py-3 rounded-lg border-2 border-blue-500 text-blue-500 hover:bg-blue-50 disabled:opacity-50 font-medium"
          >
            导出 JPG
          </button>
        </div>
        {images.length > 1 && (
          <button
            onClick={handleExportAllJpg}
            disabled={isLoading || isProcessing || previewUrls.size === 0}
            className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-100 disabled:opacity-50 text-sm"
          >
            导出所有 JPG ({images.length}张)
          </button>
        )}
      </div>
    </div>
  );
}
