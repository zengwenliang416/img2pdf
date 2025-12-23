/**
 * 导出功能自定义 Hook
 * 提取 PDF、JPG、ZIP 导出逻辑
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
import { exportLogger as log } from "@/lib/utils/logger";

interface UseExportOptions {
  // 预览 URL Map（图片 ID -> 预览 URL）
  previewUrls: Map<string, string>;
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
   */
  const doExportPdf = useCallback(async () => {
    // 按照 images 数组顺序获取 URL、方向和旋转（保证顺序一致）
    const orderedData = images
      .map((img) => ({
        url: previewUrls.get(img.id),
        orientation: img.orientation,
        rotation: img.rotation,
      }))
      .filter(
        (
          item,
        ): item is {
          url: string;
          orientation: PageOrientation;
          rotation: Rotation;
        } => item.url !== undefined,
      );

    if (orderedData.length === 0) return;

    setLoading(true, "正在生成 PDF...");
    setLoadingProgress({ done: 0, total: orderedData.length, label: "导出中" });

    try {
      // 根据导出设置获取纸张基准尺寸（纵向）
      const paperDef = PAPER_SIZES[exportSettings.paperSize];

      const blob = await exportToPdf(
        orderedData.map((d) => d.url),
        {
          // 纵向基准尺寸
          pageWidth: paperDef.width,
          pageHeight: paperDef.height,
          margin: exportSettings.margin,
          quality: exportSettings.quality,
          // 每页独立方向配置
          perPageOrientations: orderedData.map((d) => d.orientation),
          // 每页独立旋转配置
          perPageRotations: orderedData.map((d) => d.rotation),
          onProgress: (done, total) => {
            setLoadingProgress({ done, total, label: "导出中" });
          },
        },
      );
      const filename = `scan_${new Date().toISOString().slice(0, 10)}.pdf`;
      downloadBlob(blob, filename);
    } catch (err) {
      log.error("导出 PDF 失败:", err);
      setError(err instanceof Error ? err.message : "导出 PDF 失败");
    } finally {
      setLoading(false);
      setLoadingProgress(null);
    }
  }, [
    images,
    previewUrls,
    exportSettings,
    setLoading,
    setLoadingProgress,
    setError,
  ]);

  /**
   * 导出为 JPG（当前图片）
   */
  const handleExportJpg = useCallback(async () => {
    const currentUrl = previewUrls.get(currentImage?.id || "");
    if (!currentUrl || !currentImage) return;

    setLoading(true, "正在导出图片...");

    try {
      const blob = await exportToJpg(
        currentUrl,
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
      setLoading(false);
    }
  }, [
    previewUrls,
    currentImage,
    currentIndex,
    images.length,
    exportSettings.quality,
    setLoading,
    setError,
  ]);

  /**
   * 导出所有图片为 ZIP（包含多张 JPG）
   */
  const handleExportZip = useCallback(async () => {
    // 按照 images 数组顺序获取 URL 和旋转（保证顺序一致）
    const orderedData = images
      .map((img) => ({
        url: previewUrls.get(img.id),
        rotation: img.rotation,
      }))
      .filter(
        (item): item is { url: string; rotation: Rotation } =>
          item.url !== undefined,
      );

    if (orderedData.length === 0) return;

    setLoading(true, "正在打包导出...");
    setLoadingProgress({ done: 0, total: orderedData.length, label: "打包中" });

    try {
      const blob = await exportToZip(
        orderedData.map((d) => d.url),
        {
          quality: exportSettings.quality,
          filenamePrefix: "scan",
          perPageRotations: orderedData.map((d) => d.rotation),
          onProgress: (done, total) => {
            setLoadingProgress({ done, total, label: "打包中" });
          },
        },
      );
      const filename = `scan_${new Date().toISOString().slice(0, 10)}.zip`;
      downloadBlob(blob, filename);
    } catch (err) {
      log.error("导出 ZIP 失败:", err);
      setError(err instanceof Error ? err.message : "导出 ZIP 失败");
    } finally {
      setLoading(false);
      setLoadingProgress(null);
    }
  }, [
    images,
    previewUrls,
    exportSettings.quality,
    setLoading,
    setLoadingProgress,
    setError,
  ]);

  return {
    doExportPdf,
    handleExportJpg,
    handleExportZip,
    // 便捷状态
    canExportPdf: previewUrls.size > 0,
    canExportJpg: !!previewUrls.get(currentImage?.id || ""),
    canExportZip: previewUrls.size > 0 && images.length > 1,
    imageCount: images.length,
  };
}
