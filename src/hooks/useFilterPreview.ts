/**
 * 滤镜预览逻辑 Hook
 * 处理图片加载、滤镜应用和预览生成
 * 包含滤镜结果缓存机制，避免重复计算
 *
 * 性能优化：
 * - 使用 forPreview 模式降采样大图（减少处理时间）
 * - 使用 ObjectURL 替代 DataURL（减少内存）
 * - 缓存机制避免重复计算
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { useAppStore } from "@/lib/store";
import { applyFilter, AVAILABLE_FILTERS, type FilterType } from "@/lib/opencv";
import { filterPanelLogger as log } from "@/lib/utils/logger";
import { revokeObjectUrl } from "@/lib/utils/imageUtils";

// 滤镜缓存：key 格式为 `${imgId}_${filterType}`
const filterCache = new Map<string, string>();

// 缓存统计
let cacheHits = 0;
let cacheMisses = 0;

/**
 * 生成缓存 key
 */
function getCacheKey(imgId: string, filter: FilterType): string {
  return `${imgId}_${filter}`;
}

/**
 * 清理指定图片的缓存（同时释放 ObjectURL）
 */
function clearImageCache(imgId: string): void {
  const keysToDelete: string[] = [];
  for (const key of filterCache.keys()) {
    if (key.startsWith(`${imgId}_`)) {
      keysToDelete.push(key);
    }
  }
  keysToDelete.forEach((key) => {
    // 释放 ObjectURL 资源
    const url = filterCache.get(key);
    revokeObjectUrl(url);
    filterCache.delete(key);
  });
  if (keysToDelete.length > 0) {
    log.debug(`清理图片 ${imgId} 的 ${keysToDelete.length} 条缓存`);
  }
}

interface UseFilterPreviewOptions {
  // 是否自动加载图片
  autoLoad?: boolean;
  // 是否启用缓存
  enableCache?: boolean;
}

interface UseFilterPreviewReturn {
  // 预览 URL Map（图片 ID -> 滤镜处理后的 URL）
  previewUrls: Map<string, string>;
  // 滤镜效果缩略图（用于滤镜选择器）
  filterPreviews: Record<FilterType, string>;
  // 是否正在处理
  isProcessing: boolean;
  // 加载的图片元素引用
  imagesRef: React.MutableRefObject<Map<string, HTMLImageElement>>;
  // 应用滤镜到单张图片
  applyFilterToImage: (
    imgId: string,
    filter: FilterType,
  ) => Promise<string | null>;
  // 应用滤镜到所有图片
  applyAllFilters: () => Promise<void>;
  // 更新单张图片的预览
  updatePreview: (imgId: string, filteredUrl: string) => void;
  // 设置处理状态
  setIsProcessing: (processing: boolean) => void;
  // 缓存统计（调试用）
  cacheStats: { hits: number; misses: number; size: number };
  // 清理缓存
  clearCache: (imgId?: string) => void;
}

export function useFilterPreview(
  options: UseFilterPreviewOptions = {},
): UseFilterPreviewReturn {
  const { autoLoad = true, enableCache = true } = options;

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
  // 处理状态
  const [isProcessing, setIsProcessing] = useState(false);

  const {
    images,
    currentIndex,
    setFilteredImage,
    setLoading,
    setLoadingProgress,
    setError,
  } = useAppStore();

  const currentImage = images[currentIndex];

  /**
   * 清理缓存
   * @param imgId 指定图片 ID 清理其缓存，不传则清理全部
   */
  const clearCache = useCallback((imgId?: string) => {
    if (imgId) {
      clearImageCache(imgId);
    } else {
      const size = filterCache.size;
      // 释放所有 ObjectURL
      filterCache.forEach((url) => revokeObjectUrl(url));
      filterCache.clear();
      cacheHits = 0;
      cacheMisses = 0;
      log.debug(`清理全部缓存，共 ${size} 条`);
    }
  }, []);

  /**
   * 应用滤镜到单张图片并返回预览 URL
   * 支持缓存机制，避免重复计算
   */
  const applyFilterToImage = useCallback(
    async (imgId: string, filter: FilterType): Promise<string | null> => {
      // 检查缓存
      if (enableCache) {
        const cacheKey = getCacheKey(imgId, filter);
        const cached = filterCache.get(cacheKey);
        if (cached) {
          cacheHits++;
          log.debug(
            `缓存命中: ${filter} (命中率: ${Math.round((cacheHits / (cacheHits + cacheMisses)) * 100)}%)`,
          );
          return cached;
        }
        cacheMisses++;
      }

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

      log.debug(`应用滤镜 ${filter}，图片尺寸: ${imgWidth}x${imgHeight}`);

      // 使用 forPreview 模式对大图进行降采样，提高处理速度
      const result = await applyFilter(canvas, filter, { forPreview: true });

      // 存入缓存
      if (enableCache && result) {
        const cacheKey = getCacheKey(imgId, filter);
        filterCache.set(cacheKey, result);
        log.debug(`缓存新增: ${filter}，当前缓存大小: ${filterCache.size}`);
      }

      return result;
    },
    [enableCache],
  );

  /**
   * 为所有图片应用各自的滤镜
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
      log.error("应用滤镜失败:", err);
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
   * 更新单张图片的预览 URL
   */
  const updatePreview = useCallback((imgId: string, filteredUrl: string) => {
    setPreviewUrls((prev) => {
      const next = new Map(prev);
      next.set(imgId, filteredUrl);
      return next;
    });
  }, []);

  /**
   * 加载所有图片
   */
  useEffect(() => {
    if (!autoLoad || images.length === 0) return;

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
        log.error("加载图片失败:", err);
        setError(err instanceof Error ? err.message : "加载图片失败");
      } finally {
        setLoading(false);
      }
    };

    loadImages();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [images.length, autoLoad]);

  /**
   * 当前图片变化时，重新生成滤镜预览缩略图
   * 注意：会释放旧的 ObjectURLs 避免内存泄漏
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

      // 释放旧的滤镜预览 ObjectURLs 避免内存泄漏
      setFilterPreviews((prev) => {
        Object.values(prev).forEach(revokeObjectUrl);
        return previews;
      });
    };

    generateFilterPreviews();

    // Cleanup：组件卸载时释放所有滤镜预览
    return () => {
      setFilterPreviews((prev) => {
        Object.values(prev).forEach(revokeObjectUrl);
        return {} as Record<FilterType, string>;
      });
    };
  }, [currentImage?.id, currentImage?.cropped]);

  return {
    previewUrls,
    filterPreviews,
    isProcessing,
    imagesRef,
    applyFilterToImage,
    applyAllFilters,
    updatePreview,
    setIsProcessing,
    cacheStats: {
      hits: cacheHits,
      misses: cacheMisses,
      size: filterCache.size,
    },
    clearCache,
  };
}
