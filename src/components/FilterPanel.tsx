"use client";

/**
 * 滤镜选择面板
 * 预览和选择不同的图像滤镜
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
  const imageRef = useRef<HTMLImageElement | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [filterPreviews, setFilterPreviews] = useState<
    Record<FilterType, string>
  >({} as Record<FilterType, string>);

  const {
    croppedImage,
    selectedFilter,
    setSelectedFilter,
    setFilteredImage,
    setLoading,
    setError,
    goBack,
    isLoading,
    loadingMessage,
  } = useAppStore();

  /**
   * 加载图片并生成滤镜预览
   */
  useEffect(() => {
    if (!croppedImage) return;

    const loadImage = async () => {
      setLoading(true, "正在生成预览...");

      try {
        // 加载图片
        const img = new Image();
        await new Promise<void>((resolve, reject) => {
          img.onload = () => resolve();
          img.onerror = () => reject(new Error("加载图片失败"));
          img.src = croppedImage;
        });
        imageRef.current = img;

        // 创建缩略图 Canvas
        const aspectRatio = img.width / img.height;
        const thumbWidth = Math.min(100, img.width);
        const thumbHeight = thumbWidth / aspectRatio;

        const thumbCanvas = document.createElement("canvas");
        thumbCanvas.width = thumbWidth;
        thumbCanvas.height = thumbHeight;
        const thumbCtx = thumbCanvas.getContext("2d");
        if (!thumbCtx) throw new Error("无法创建 Canvas 上下文");
        thumbCtx.drawImage(img, 0, 0, thumbWidth, thumbHeight);

        // 生成各滤镜预览
        const previews: Record<FilterType, string> = {} as Record<
          FilterType,
          string
        >;

        for (const filter of AVAILABLE_FILTERS) {
          previews[filter] = await applyFilter(thumbCanvas, filter);
        }

        setFilterPreviews(previews);

        // 应用默认滤镜
        await applySelectedFilter(selectedFilter);
      } catch (err) {
        console.error("生成预览失败:", err);
        setError(err instanceof Error ? err.message : "生成预览失败");
      } finally {
        setLoading(false);
      }
    };

    loadImage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [croppedImage]);

  /**
   * 应用选中的滤镜
   */
  const applySelectedFilter = useCallback(
    async (filter: FilterType) => {
      const img = imageRef.current;
      if (!img) return;

      setLoading(true, "正在应用滤镜...");

      try {
        // 创建全尺寸 Canvas
        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext("2d");
        if (!ctx) throw new Error("无法创建 Canvas 上下文");
        ctx.drawImage(img, 0, 0);

        // 应用滤镜
        const filteredUrl = await applyFilter(canvas, filter);
        setPreviewUrl(filteredUrl);
        setFilteredImage(filteredUrl);
      } catch (err) {
        console.error("应用滤镜失败:", err);
        setError(err instanceof Error ? err.message : "应用滤镜失败");
      } finally {
        setLoading(false);
      }
    },
    [setFilteredImage, setLoading, setError],
  );

  /**
   * 选择滤镜
   */
  const handleSelectFilter = useCallback(
    (filter: FilterType) => {
      setSelectedFilter(filter);
      applySelectedFilter(filter);
    },
    [setSelectedFilter, applySelectedFilter],
  );

  /**
   * 导出为 PDF
   */
  const handleExportPdf = useCallback(async () => {
    if (!previewUrl) return;

    setLoading(true, "正在生成 PDF...");

    try {
      const blob = await exportToPdf([previewUrl]);
      const filename = `scan_${new Date().toISOString().slice(0, 10)}.pdf`;
      downloadBlob(blob, filename);
    } catch (err) {
      console.error("导出 PDF 失败:", err);
      setError(err instanceof Error ? err.message : "导出 PDF 失败");
    } finally {
      setLoading(false);
    }
  }, [previewUrl, setLoading, setError]);

  /**
   * 导出为 JPG
   */
  const handleExportJpg = useCallback(async () => {
    if (!previewUrl) return;

    setLoading(true, "正在导出图片...");

    try {
      const blob = await exportToJpg(previewUrl);
      const filename = `scan_${new Date().toISOString().slice(0, 10)}.jpg`;
      downloadBlob(blob, filename);
    } catch (err) {
      console.error("导出 JPG 失败:", err);
      setError(err instanceof Error ? err.message : "导出 JPG 失败");
    } finally {
      setLoading(false);
    }
  }, [previewUrl, setLoading, setError]);

  if (!croppedImage) {
    return null;
  }

  // 计算预览图尺寸
  const img = imageRef.current;
  let previewWidth = PREVIEW_MAX_WIDTH;
  let previewHeight = PREVIEW_MAX_WIDTH;
  if (img) {
    const aspectRatio = img.width / img.height;
    if (aspectRatio > 1) {
      previewHeight = previewWidth / aspectRatio;
    } else {
      previewHeight = previewWidth / aspectRatio;
      if (previewHeight > window.innerHeight * 0.5) {
        previewHeight = window.innerHeight * 0.5;
        previewWidth = previewHeight * aspectRatio;
      }
    }
  }

  return (
    <div className="flex flex-col items-center gap-4 p-4 w-full">
      {/* 标题 */}
      <div className="text-center">
        <h2 className="text-lg font-semibold text-gray-800">选择滤镜</h2>
        <p className="text-sm text-gray-500">选择最适合的效果</p>
      </div>

      {/* 预览图 */}
      <div
        className="relative rounded-lg overflow-hidden shadow-lg bg-gray-100"
        style={{ width: previewWidth, height: previewHeight }}
      >
        {previewUrl ? (
          <img
            src={previewUrl}
            alt="预览"
            className="w-full h-full object-contain"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {/* 加载遮罩 */}
        {isLoading && (
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
            disabled={isLoading}
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
            disabled={isLoading}
            className="flex-1 px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-100 disabled:opacity-50"
          >
            返回
          </button>
        </div>
        <div className="flex gap-3">
          <button
            onClick={handleExportPdf}
            disabled={isLoading || !previewUrl}
            className="flex-1 px-4 py-3 rounded-lg bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-50 font-medium"
          >
            导出 PDF
          </button>
          <button
            onClick={handleExportJpg}
            disabled={isLoading || !previewUrl}
            className="flex-1 px-4 py-3 rounded-lg border-2 border-blue-500 text-blue-500 hover:bg-blue-50 disabled:opacity-50 font-medium"
          >
            导出 JPG
          </button>
        </div>
      </div>
    </div>
  );
}
