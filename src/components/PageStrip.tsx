"use client";

/**
 * 页面缩略条组件
 * 显示所有页面的缩略图，支持点击切换当前页
 */

import { useAppStore } from "@/lib/store";

interface PageStripProps {
  // 缩略图 URL 映射（id -> url），用于显示处理后的预览
  // 如果未提供，则使用 ImageItem 的 thumbnail/cropped/original
  previewUrls?: Map<string, string>;
  // 是否禁用交互
  disabled?: boolean;
  // 缩略图尺寸（默认 48px）
  thumbSize?: number;
}

export function PageStrip({
  previewUrls,
  disabled = false,
  thumbSize = 48,
}: PageStripProps) {
  const { images, currentIndex, setCurrentIndex } = useAppStore();

  // 单张图片时不显示
  if (images.length <= 1) {
    return null;
  }

  return (
    <div className="flex gap-2 overflow-x-auto py-2 px-1 max-w-full">
      {images.map((img, index) => {
        // 优先使用 previewUrls，其次 thumbnail，再次 cropped，最后 original
        const thumbUrl =
          previewUrls?.get(img.id) ||
          img.thumbnail ||
          img.cropped ||
          img.original;

        const isActive = index === currentIndex;

        return (
          <button
            key={img.id}
            onClick={() => !disabled && setCurrentIndex(index)}
            disabled={disabled}
            className={`
              relative flex-shrink-0 rounded-lg overflow-hidden border-2
              transition-all duration-150
              ${
                isActive
                  ? "border-blue-500 ring-2 ring-blue-200"
                  : "border-gray-200 hover:border-gray-400"
              }
              ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
            `}
            style={{ width: thumbSize, height: thumbSize }}
          >
            <img
              src={thumbUrl}
              alt={`页面 ${index + 1}`}
              className="w-full h-full object-cover"
            />
            {/* 页码标签 */}
            <span className="absolute bottom-0 right-0 bg-black/60 text-white text-xs px-1 leading-tight">
              {index + 1}
            </span>
          </button>
        );
      })}
    </div>
  );
}
