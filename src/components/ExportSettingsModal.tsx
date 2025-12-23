"use client";

/**
 * 导出设置弹窗组件
 * 提供纸张尺寸、页面方向、导出质量等配置
 * 支持预估导出文件大小
 */

import { useCallback, useEffect, useState } from "react";
import { useAppStore, PAPER_SIZES, type PaperSize } from "@/lib/store";
import { estimatePdfSize, formatFileSize } from "@/lib/utils/exportPdf";
import { Button, IconButton } from "./ui";

interface ExportSettingsModalProps {
  // 用于计算预估大小的图片 URL 列表
  imageUrls: string[];
  onConfirm: () => void;
}

export function ExportSettingsModal({
  imageUrls,
  onConfirm,
}: ExportSettingsModalProps) {
  const {
    exportSettings,
    updateExportSettings,
    isExportSettingsOpen,
    setExportSettingsOpen,
  } = useAppStore();

  // 预估文件大小
  const [estimatedSize, setEstimatedSize] = useState<string | null>(null);
  const [isEstimating, setIsEstimating] = useState(false);

  // 计算预估大小
  useEffect(() => {
    if (!isExportSettingsOpen || imageUrls.length === 0) {
      setEstimatedSize(null);
      return;
    }

    let cancelled = false;
    setIsEstimating(true);

    estimatePdfSize(imageUrls, exportSettings.quality)
      .then((size) => {
        if (!cancelled) {
          setEstimatedSize(formatFileSize(size));
          setIsEstimating(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setEstimatedSize(null);
          setIsEstimating(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [isExportSettingsOpen, imageUrls, exportSettings.quality]);

  // 关闭弹窗
  const handleClose = useCallback(() => {
    setExportSettingsOpen(false);
  }, [setExportSettingsOpen]);

  // 确认并导出
  const handleConfirm = useCallback(() => {
    setExportSettingsOpen(false);
    onConfirm();
  }, [setExportSettingsOpen, onConfirm]);

  // 更新纸张尺寸
  const handlePaperSizeChange = useCallback(
    (paperSize: PaperSize) => {
      updateExportSettings({ paperSize });
    },
    [updateExportSettings],
  );

  // 更新质量
  const handleQualityChange = useCallback(
    (quality: number) => {
      updateExportSettings({ quality });
    },
    [updateExportSettings],
  );

  // 不显示时返回 null
  if (!isExportSettingsOpen) {
    return null;
  }

  // 质量等级描述
  const getQualityLabel = (quality: number): string => {
    if (quality >= 0.9) return "高质量";
    if (quality >= 0.7) return "标准";
    return "压缩";
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
        {/* 头部 */}
        <div className="px-6 py-4 bg-[var(--background-secondary)] border-b border-[var(--border-color)] flex items-center justify-between">
          <h2 className="text-lg font-semibold text-[var(--foreground)]">
            导出设置
          </h2>
          <IconButton
            variant="ghost"
            size="sm"
            onClick={handleClose}
            aria-label="关闭"
          >
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
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </IconButton>
        </div>

        {/* 内容区 */}
        <div className="px-6 py-5 space-y-6">
          {/* 纸张尺寸 */}
          <div>
            <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
              纸张尺寸
            </label>
            <div className="grid grid-cols-5 gap-2">
              {(Object.keys(PAPER_SIZES) as PaperSize[]).map((size) => (
                <Button
                  key={size}
                  variant={
                    exportSettings.paperSize === size ? "primary" : "secondary"
                  }
                  size="sm"
                  onClick={() => handlePaperSizeChange(size)}
                  className="!px-2"
                >
                  {PAPER_SIZES[size].label}
                </Button>
              ))}
            </div>
          </div>

          {/* 导出质量 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              导出质量
              <span className="ml-2 text-gray-500 font-normal">
                ({getQualityLabel(exportSettings.quality)} -{" "}
                {Math.round(exportSettings.quality * 100)}%)
              </span>
            </label>
            <input
              type="range"
              min="0.5"
              max="1"
              step="0.05"
              value={exportSettings.quality}
              onChange={(e) => handleQualityChange(parseFloat(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-500"
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>压缩 (小体积)</span>
              <span>高质量 (大体积)</span>
            </div>
          </div>

          {/* 预估大小 */}
          <div className="bg-blue-50 rounded-lg p-3 flex items-center justify-between">
            <div className="text-sm text-gray-700">
              <span className="font-medium">预估文件大小</span>
              <span className="text-gray-500 ml-2">
                ({imageUrls.length} 页)
              </span>
            </div>
            <div className="text-lg font-semibold text-blue-600">
              {isEstimating ? (
                <span className="text-gray-400">计算中...</span>
              ) : estimatedSize ? (
                estimatedSize
              ) : (
                <span className="text-gray-400">--</span>
              )}
            </div>
          </div>

          {/* 提示信息 */}
          <div className="bg-gray-50 rounded-lg p-3 text-sm text-gray-600">
            <p>
              <span className="font-medium">提示：</span>
              图片将按当前顺序嵌入 PDF，每页一张图片，居中显示并保持宽高比。
              每页方向可在滤镜页面单独设置。
            </p>
          </div>
        </div>

        {/* 底部按钮 */}
        <div className="px-6 py-4 bg-[var(--background-secondary)] border-t border-[var(--border-color)] flex gap-3">
          <Button variant="secondary" onClick={handleClose} fullWidth>
            取消
          </Button>
          <Button
            variant="primary"
            onClick={handleConfirm}
            disabled={isEstimating}
            fullWidth
            rightIcon={
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
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                />
              </svg>
            }
          >
            确认导出
          </Button>
        </div>
      </div>
    </div>
  );
}
