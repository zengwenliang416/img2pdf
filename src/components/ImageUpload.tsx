"use client";

/**
 * 图片上传组件
 * 支持拖拽上传和点击选择文件
 * 支持多张图片同时上传
 */

import { useCallback, useRef, useState } from "react";
import { useAppStore } from "@/lib/store";
import { generateThumbnailFromImage } from "@/lib/utils/thumbnail";
import { uploadLogger as log } from "@/lib/utils/logger";

// 支持的图片类型
const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic"];
const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB
const MAX_FILES = 10; // 最多同时上传 10 张

export function ImageUpload() {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { addImages, setLoading, setError, isLoading, images } = useAppStore();

  /**
   * 处理单个文件
   * 使用 Object URL 替代 Base64 Data URL 优化内存
   */
  const processFile = async (
    file: File,
  ): Promise<{
    objectUrl: string;
    file: File;
    size: { width: number; height: number };
    thumbnail: string;
  } | null> => {
    // 验证文件类型
    if (!ACCEPTED_TYPES.includes(file.type)) {
      return null;
    }

    // 验证文件大小
    if (file.size > MAX_FILE_SIZE) {
      return null;
    }

    // 创建 Object URL（轻量级，不占用额外内存）
    const objectUrl = URL.createObjectURL(file);

    // 获取图片尺寸并生成缩略图
    const { size, thumbnail } = await new Promise<{
      size: { width: number; height: number };
      thumbnail: string;
    }>((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        try {
          const size = { width: img.naturalWidth, height: img.naturalHeight };
          const thumbnail = generateThumbnailFromImage(img);
          resolve({ size, thumbnail });
        } catch (err) {
          // 出错时释放 Object URL
          URL.revokeObjectURL(objectUrl);
          reject(err);
        }
      };
      img.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        reject(new Error("加载图片失败"));
      };
      img.src = objectUrl;
    });

    return { objectUrl, file, size, thumbnail };
  };

  /**
   * 处理多个文件
   */
  const handleFiles = useCallback(
    async (files: FileList) => {
      const fileArray = Array.from(files).slice(0, MAX_FILES - images.length);

      if (fileArray.length === 0) {
        setError(`已达到最大图片数量限制（${MAX_FILES}张）`);
        return;
      }

      // 过滤有效文件
      const validFiles = fileArray.filter(
        (file) =>
          ACCEPTED_TYPES.includes(file.type) && file.size <= MAX_FILE_SIZE,
      );

      if (validFiles.length === 0) {
        setError(
          "没有有效的图片文件，请上传 JPG、PNG 或 WebP 格式（20MB以内）",
        );
        return;
      }

      if (validFiles.length < fileArray.length) {
        const skipped = fileArray.length - validFiles.length;
        log.warn(`跳过了 ${skipped} 个无效文件`);
      }

      setLoading(true, `正在加载 ${validFiles.length} 张图片...`);

      try {
        const results = await Promise.all(
          validFiles.map((file) => processFile(file).catch(() => null)),
        );

        const successfulResults = results.filter(
          (
            r,
          ): r is {
            objectUrl: string;
            file: File;
            size: { width: number; height: number };
            thumbnail: string;
          } => r !== null,
        );

        if (successfulResults.length === 0) {
          setError("处理图片失败，请重试");
          return;
        }

        addImages(successfulResults);
      } catch (err) {
        setError(err instanceof Error ? err.message : "处理图片失败");
      } finally {
        setLoading(false);
      }
    },
    [addImages, setLoading, setError, images.length],
  );

  /**
   * 拖拽事件处理
   */
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);

      const files = e.dataTransfer.files;
      if (files.length > 0) {
        handleFiles(files);
      }
    },
    [handleFiles],
  );

  /**
   * 点击上传
   */
  const handleClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (files && files.length > 0) {
        handleFiles(files);
      }
      // 重置 input，允许选择同一文件
      e.target.value = "";
    },
    [handleFiles],
  );

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-6 animate-fade-in">
      {/* 上传卡片 - 高级"着陆台"设计 */}
      <div
        onClick={handleClick}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`
          group relative w-full max-w-md aspect-[3/4] rounded-3xl
          flex flex-col items-center justify-center cursor-pointer
          transition-all duration-500 ease-out overflow-hidden
          ${
            isDragging
              ? "scale-[1.02] ring-4 ring-[var(--primary-300)]"
              : "hover:scale-[1.01] hover:-translate-y-2"
          }
          ${isLoading ? "pointer-events-none" : ""}
        `}
        style={{
          background: isDragging
            ? "linear-gradient(180deg, var(--primary-50) 0%, white 100%)"
            : "linear-gradient(180deg, rgba(248,250,252,0.8) 0%, white 100%)",
          boxShadow: isDragging
            ? "var(--shadow-paper-hover), 0 0 60px rgba(59,130,246,0.15)"
            : "var(--shadow-float)",
        }}
      >
        {/* 动态边框 SVG */}
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none"
          preserveAspectRatio="none"
        >
          <rect
            x="8"
            y="8"
            width="calc(100% - 16px)"
            height="calc(100% - 16px)"
            rx="20"
            fill="none"
            stroke={isDragging ? "var(--primary-400)" : "var(--neutral-300)"}
            strokeWidth="2"
            strokeDasharray="12 8"
            className={`transition-all duration-500 ${
              isDragging
                ? "opacity-100"
                : "opacity-60 group-hover:opacity-100 group-hover:stroke-[var(--primary-400)]"
            }`}
            style={{
              strokeDashoffset: isDragging ? 0 : undefined,
            }}
          />
        </svg>

        {/* 背景装饰光晕 */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-3xl">
          <div
            className={`
              absolute -top-32 -right-32 w-64 h-64 rounded-full
              bg-gradient-to-br from-[var(--primary-200)] to-[var(--primary-100)]
              transition-all duration-700 ease-out blur-3xl
              ${isDragging ? "opacity-60 scale-110" : "opacity-20 group-hover:opacity-40"}
            `}
          />
          <div
            className={`
              absolute -bottom-32 -left-32 w-64 h-64 rounded-full
              bg-gradient-to-tr from-[var(--accent-cyan)] to-[var(--primary-200)]
              transition-all duration-700 ease-out blur-3xl
              ${isDragging ? "opacity-40 scale-110" : "opacity-10 group-hover:opacity-25"}
            `}
          />
          {/* 扫描光效果 - 仅在加载时显示 */}
          {isLoading && (
            <div className="absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-[var(--primary)] to-transparent animate-scanner-light" />
          )}
        </div>

        {/* 内容区域 */}
        <div className="relative z-10 flex flex-col items-center gap-6 px-8">
          {isLoading ? (
            <>
              {/* 加载动画 */}
              <div className="relative w-24 h-24">
                <div className="absolute inset-0 rounded-full border-4 border-[var(--primary-100)]" />
                <div className="absolute inset-0 rounded-full border-4 border-[var(--primary)] border-t-transparent animate-spin" />
                <div className="absolute inset-3 rounded-full bg-white/80 backdrop-blur flex items-center justify-center">
                  <svg
                    className="w-8 h-8 text-[var(--primary)]"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                </div>
              </div>
              <div className="text-center space-y-1">
                <p className="text-lg font-semibold text-[var(--foreground)]">
                  正在处理图片
                </p>
                <p className="text-sm text-[var(--neutral-500)]">请稍候...</p>
              </div>
            </>
          ) : (
            <>
              {/* 图标容器 - 悬浮效果 */}
              <div
                className={`
                  relative p-6 rounded-2xl
                  bg-white shadow-lg
                  transition-all duration-500 ease-out
                  group-hover:shadow-xl group-hover:-translate-y-1
                  ${isDragging ? "scale-110 -translate-y-2 shadow-2xl bg-[var(--primary-50)]" : ""}
                `}
              >
                {/* 相机/扫描图标 */}
                <svg
                  className={`
                    w-12 h-12 text-[var(--primary)]
                    transition-all duration-500
                    ${isDragging ? "scale-110 text-[var(--primary-600)]" : "group-hover:scale-105"}
                  `}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>

                {/* 上传指示徽章 */}
                <div
                  className={`
                    absolute -top-2 -right-2 w-8 h-8 rounded-full
                    bg-gradient-to-br from-[var(--primary)] to-[var(--primary-600)]
                    text-white flex items-center justify-center
                    shadow-lg shadow-[var(--primary)]/30
                    transition-all duration-300
                    ${isDragging ? "scale-125 -translate-y-1 animate-bounce-subtle" : "group-hover:scale-110"}
                  `}
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
                      strokeWidth={2.5}
                      d="M12 4v16m0-16l-4 4m4-4l4 4"
                    />
                  </svg>
                </div>
              </div>

              {/* 文字说明 */}
              <div className="text-center space-y-3">
                <h3
                  className={`
                    text-xl font-semibold transition-colors duration-300
                    ${isDragging ? "text-[var(--primary-600)]" : "text-[var(--neutral-800)] group-hover:text-[var(--primary-600)]"}
                  `}
                >
                  {isDragging ? "松开以上传" : "扫描文档"}
                </h3>
                <p className="text-sm text-[var(--neutral-500)]">
                  拖放图片或{" "}
                  <span className="text-[var(--primary)] font-medium underline decoration-[var(--primary-200)] underline-offset-2 decoration-2">
                    点击浏览
                  </span>
                </p>
                <div className="flex items-center justify-center gap-3 text-xs">
                  <span className="px-3 py-1 rounded-full bg-[var(--neutral-100)] text-[var(--neutral-600)] font-medium">
                    JPG / PNG / WebP
                  </span>
                  <span className="px-3 py-1 rounded-full bg-[var(--neutral-100)] text-[var(--neutral-600)] font-medium">
                    最多 {MAX_FILES} 张
                  </span>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept={ACCEPTED_TYPES.join(",")}
        multiple
        onChange={handleFileChange}
        className="hidden"
      />

      {/* 隐私提示 - 更精致 */}
      <div className="mt-10 flex items-center gap-2.5 px-4 py-2.5 rounded-full bg-[var(--success-light)]/50 border border-[var(--success)]/20">
        <div className="w-5 h-5 rounded-full bg-[var(--success)] flex items-center justify-center">
          <svg
            className="w-3 h-3 text-white"
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
        <span className="text-sm text-[var(--neutral-700)] font-medium">
          本地处理 · 隐私安全
        </span>
      </div>
    </div>
  );
}
