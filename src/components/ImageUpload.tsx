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
   * 读取图片、获取尺寸并生成缩略图
   */
  const processFile = async (
    file: File,
  ): Promise<{
    dataUrl: string;
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

    // 读取文件为 Data URL
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error("读取文件失败"));
      reader.readAsDataURL(file);
    });

    // 获取图片尺寸并生成缩略图（复用同一个 Image 对象）
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
          reject(err);
        }
      };
      img.onerror = () => reject(new Error("加载图片失败"));
      img.src = dataUrl;
    });

    return { dataUrl, size, thumbnail };
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
            dataUrl: string;
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
      {/* 上传卡片 */}
      <div
        onClick={handleClick}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`
          relative w-full max-w-md aspect-[3/4] rounded-2xl
          flex flex-col items-center justify-center gap-5 cursor-pointer
          transition-all duration-300 ease-out
          bg-[var(--card-bg)] border-2 border-dashed
          ${
            isDragging
              ? "border-[var(--primary)] bg-[var(--primary-50)] scale-[1.02] shadow-[var(--shadow-primary)]"
              : "border-[var(--neutral-300)] hover:border-[var(--primary-400)] hover:shadow-[var(--shadow-lg)]"
          }
          ${isLoading ? "pointer-events-none opacity-60" : ""}
        `}
        style={{
          boxShadow: isDragging ? undefined : "var(--shadow-md)",
        }}
      >
        {/* 背景装饰 */}
        <div className="absolute inset-0 rounded-2xl overflow-hidden pointer-events-none">
          <div
            className={`
              absolute -top-20 -right-20 w-40 h-40 rounded-full
              bg-[var(--primary-100)] opacity-50 blur-3xl
              transition-opacity duration-500
              ${isDragging ? "opacity-80" : "opacity-30"}
            `}
          />
          <div
            className={`
              absolute -bottom-20 -left-20 w-40 h-40 rounded-full
              bg-[var(--primary-200)] opacity-50 blur-3xl
              transition-opacity duration-500
              ${isDragging ? "opacity-60" : "opacity-20"}
            `}
          />
        </div>

        {/* 内容区域 */}
        <div className="relative z-10 flex flex-col items-center gap-5">
          {isLoading ? (
            <>
              <div className="relative">
                <div className="w-16 h-16 border-4 border-[var(--primary-200)] rounded-full" />
                <div className="absolute inset-0 w-16 h-16 border-4 border-[var(--primary)] border-t-transparent rounded-full animate-spin" />
              </div>
              <p className="text-[var(--neutral-600)] font-medium">
                正在加载图片...
              </p>
            </>
          ) : (
            <>
              {/* 图标容器 */}
              <div
                className={`
                  relative w-20 h-20 rounded-2xl
                  bg-gradient-to-br from-[var(--primary-100)] to-[var(--primary-200)]
                  flex items-center justify-center
                  transition-transform duration-300
                  ${isDragging ? "scale-110 rotate-3" : ""}
                `}
              >
                <svg
                  className={`
                    w-10 h-10 text-[var(--primary)]
                    transition-transform duration-300
                    ${isDragging ? "scale-110" : ""}
                  `}
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
                {/* 上传箭头指示 */}
                <div
                  className={`
                    absolute -top-2 -right-2 w-8 h-8 rounded-full
                    bg-[var(--primary)] text-white
                    flex items-center justify-center
                    shadow-[var(--shadow-md)]
                    transition-transform duration-300
                    ${isDragging ? "scale-125 -translate-y-1" : ""}
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
                      strokeWidth={2}
                      d="M12 4v16m0-16l-4 4m4-4l4 4"
                    />
                  </svg>
                </div>
              </div>

              {/* 文字说明 */}
              <div className="text-center space-y-2">
                <p className="text-lg font-semibold text-[var(--foreground)]">
                  {isDragging ? "松开以上传图片" : "点击或拖拽上传图片"}
                </p>
                <p className="text-sm text-[var(--neutral-500)]">
                  支持 JPG、PNG、WebP 格式，可多选
                </p>
                <div className="flex items-center justify-center gap-2 text-xs text-[var(--neutral-400)]">
                  <span className="px-2 py-0.5 rounded-full bg-[var(--neutral-100)]">
                    最多 {MAX_FILES} 张
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-[var(--neutral-100)]">
                    每张 ≤ 20MB
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

      {/* 隐私提示 */}
      <div className="mt-8 flex items-center gap-2 text-sm text-[var(--neutral-500)]">
        <svg
          className="w-4 h-4 text-[var(--success)]"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
          />
        </svg>
        <span>所有处理均在本地完成，您的图片不会上传到服务器</span>
      </div>
    </div>
  );
}
