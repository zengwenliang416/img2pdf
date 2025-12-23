/**
 * 导出功能自定义 Hook
 * 提取 PDF、JPG、ZIP 导出逻辑
 *
 * 注意：导出时使用原分辨率图片重新应用滤镜，
 * 而非使用预览降采样后的 URL
 */

import { useCallback } from "react";
import {
  useAppStore,
  PAPER_SIZES,
  type PageOrientation,
  type Rotation,
} from "@/lib/store";
import {
  exportToPdf,
  exportToJpg,
  exportToZip,
  downloadBlob,
} from "@/lib/utils/exportPdf";
import { applyFilter, type FilterType } from "@/lib/opencv/imageFilters";
import { revokeObjectUrl } from "@/lib/utils/imageUtils";
import { exportLogger as log } from "@/lib/utils/logger";

interface UseExportOptions {
  // 预览 URL Map（图片 ID -> 预览 URL）
  previewUrls: Map<string, string>;
}

/**
 * 以原分辨率应用滤镜
 * @param imageUrl 裁剪后的图片 URL（原分辨率）
 * @param filter 滤镜类型
 * @returns 滤镜处理后的 ObjectURL（调用者负责 revoke）
 */
async function applyFilterAtFullResolution(
  imageUrl: string,
  filter: FilterType,
): Promise<string> {
  // 加载图片
  const img = new Image();
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error("加载图片失败"));
    img.src = imageUrl;
  });

  // 创建原分辨率 Canvas
  const canvas = document.createElement("canvas");
  canvas.width = img.naturalWidth || img.width;
  canvas.height = img.naturalHeight || img.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("无法创建 Canvas 上下文");
  ctx.drawImage(img, 0, 0);

  // 应用滤镜（不使用 forPreview，保持原分辨率）
  return applyFilter(canvas, filter, { forPreview: false });
}

export function useExport({ previewUrls }: UseExportOptions) {
  const {
    images,
    currentIndex,
    exportSettings,
    setLoading,
    setLoadingProgress,
    setError,
  } = useAppStore();

  const currentImage = images[currentIndex];

  /**
   * 执行 PDF 导出
   * 使用原分辨率图片重新应用滤镜，确保导出质量
   */
  const doExportPdf = useCallback(async () => {
    // 过滤出有裁剪图片的图像
    const validImages = images.filter((img) => img.cropped);
    if (validImages.length === 0) return;

    setLoading(true, "正在生成 PDF...");
    setLoadingProgress({
      done: 0,
      total: validImages.length * 2,
      label: "处理中",
    });

    // 存储生成的全分辨率 URL，导出后需要清理
    const fullResUrls: string[] = [];

    try {
      // 第一阶段：以原分辨率应用滤镜
      const orderedData: Array<{
        url: string;
        orientation: PageOrientation;
        rotation: Rotation;
      }> = [];

      for (let i = 0; i < validImages.length; i++) {
        const img = validImages[i];
        log.debug(
          `处理图片 ${i + 1}/${validImages.length}，滤镜: ${img.filter}`,
        );

        const fullResUrl = await applyFilterAtFullResolution(
          img.cropped!,
          img.filter,
        );
        fullResUrls.push(fullResUrl);
        orderedData.push({
          url: fullResUrl,
          orientation: img.orientation,
          rotation: img.rotation,
        });

        setLoadingProgress({
          done: i + 1,
          total: validImages.length * 2,
          label: "处理中",
        });
      }

      // 第二阶段：生成 PDF
      const paperDef = PAPER_SIZES[exportSettings.paperSize];

      const blob = await exportToPdf(
        orderedData.map((d) => d.url),
        {
          pageWidth: paperDef.width,
          pageHeight: paperDef.height,
          margin: exportSettings.margin,
          quality: exportSettings.quality,
          perPageOrientations: orderedData.map((d) => d.orientation),
          perPageRotations: orderedData.map((d) => d.rotation),
          onProgress: (done, total) => {
            setLoadingProgress({
              done: validImages.length + done,
              total: validImages.length + total,
              label: "导出中",
            });
          },
        },
      );
      const filename = `scan_${new Date().toISOString().slice(0, 10)}.pdf`;
      downloadBlob(blob, filename);
    } catch (err) {
      log.error("导出 PDF 失败:", err);
      setError(err instanceof Error ? err.message : "导出 PDF 失败");
    } finally {
      // 清理生成的全分辨率 URL
      fullResUrls.forEach(revokeObjectUrl);
      setLoading(false);
      setLoadingProgress(null);
    }
  }, [images, exportSettings, setLoading, setLoadingProgress, setError]);

  /**
   * 导出为 JPG（当前图片）
   * 使用原分辨率图片重新应用滤镜
   */
  const handleExportJpg = useCallback(async () => {
    if (!currentImage?.cropped) return;

    setLoading(true, "正在导出图片...");

    let fullResUrl: string | null = null;

    try {
      // 以原分辨率应用滤镜
      fullResUrl = await applyFilterAtFullResolution(
        currentImage.cropped,
        currentImage.filter,
      );

      const blob = await exportToJpg(
        fullResUrl,
        exportSettings.quality,
        currentImage.rotation,
      );
      const suffix = images.length > 1 ? `_${currentIndex + 1}` : "";
      const filename = `scan_${new Date().toISOString().slice(0, 10)}${suffix}.jpg`;
      downloadBlob(blob, filename);
    } catch (err) {
      log.error("导出 JPG 失败:", err);
      setError(err instanceof Error ? err.message : "导出 JPG 失败");
    } finally {
      // 清理生成的全分辨率 URL
      if (fullResUrl) revokeObjectUrl(fullResUrl);
      setLoading(false);
    }
  }, [
    currentImage,
    currentIndex,
    images.length,
    exportSettings.quality,
    setLoading,
    setError,
  ]);

  /**
   * 导出所有图片为 ZIP（包含多张 JPG）
   * 使用原分辨率图片重新应用滤镜
   */
  const handleExportZip = useCallback(async () => {
    // 过滤出有裁剪图片的图像
    const validImages = images.filter((img) => img.cropped);
    if (validImages.length === 0) return;

    setLoading(true, "正在打包导出...");
    setLoadingProgress({
      done: 0,
      total: validImages.length * 2,
      label: "处理中",
    });

    // 存储生成的全分辨率 URL，导出后需要清理
    const fullResUrls: string[] = [];

    try {
      // 第一阶段：以原分辨率应用滤镜
      const orderedData: Array<{ url: string; rotation: Rotation }> = [];

      for (let i = 0; i < validImages.length; i++) {
        const img = validImages[i];
        log.debug(
          `处理图片 ${i + 1}/${validImages.length}，滤镜: ${img.filter}`,
        );

        const fullResUrl = await applyFilterAtFullResolution(
          img.cropped!,
          img.filter,
        );
        fullResUrls.push(fullResUrl);
        orderedData.push({
          url: fullResUrl,
          rotation: img.rotation,
        });

        setLoadingProgress({
          done: i + 1,
          total: validImages.length * 2,
          label: "处理中",
        });
      }

      // 第二阶段：打包 ZIP
      const blob = await exportToZip(
        orderedData.map((d) => d.url),
        {
          quality: exportSettings.quality,
          filenamePrefix: "scan",
          perPageRotations: orderedData.map((d) => d.rotation),
          onProgress: (done, total) => {
            setLoadingProgress({
              done: validImages.length + done,
              total: validImages.length + total,
              label: "打包中",
            });
          },
        },
      );
      const filename = `scan_${new Date().toISOString().slice(0, 10)}.zip`;
      downloadBlob(blob, filename);
    } catch (err) {
      log.error("导出 ZIP 失败:", err);
      setError(err instanceof Error ? err.message : "导出 ZIP 失败");
    } finally {
      // 清理生成的全分辨率 URL
      fullResUrls.forEach(revokeObjectUrl);
      setLoading(false);
      setLoadingProgress(null);
    }
  }, [
    images,
    exportSettings.quality,
    setLoading,
    setLoadingProgress,
    setError,
  ]);

  return {
    doExportPdf,
    handleExportJpg,
    handleExportZip,
    // 便捷状态：基于裁剪图片而非预览 URL
    canExportPdf: images.some((img) => img.cropped),
    canExportJpg: !!currentImage?.cropped,
    canExportZip: images.filter((img) => img.cropped).length > 1,
    imageCount: images.length,
  };
}
