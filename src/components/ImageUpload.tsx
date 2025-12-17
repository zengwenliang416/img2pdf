"use client";

/**
 * 图片上传组件
 * 支持拖拽上传和点击选择文件
 */

import { useCallback, useRef, useState } from "react";
import { useAppStore } from "@/lib/store";

// 支持的图片类型
const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic"];
const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB

export function ImageUpload() {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { setOriginalImage, setLoading, setError, isLoading } = useAppStore();

  /**
   * 处理文件
   */
  const handleFile = useCallback(
    async (file: File) => {
      // 验证文件类型
      if (!ACCEPTED_TYPES.includes(file.type)) {
        setError("不支持的文件格式，请上传 JPG、PNG 或 WebP 图片");
        return;
      }

      // 验证文件大小
      if (file.size > MAX_FILE_SIZE) {
        setError("文件过大，请上传 20MB 以内的图片");
        return;
      }

      setLoading(true, "正在加载图片...");

      try {
        // 读取文件为 Data URL
        const dataUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = () => reject(new Error("读取文件失败"));
          reader.readAsDataURL(file);
        });

        // 获取图片尺寸
        const size = await new Promise<{ width: number; height: number }>(
          (resolve, reject) => {
            const img = new Image();
            img.onload = () =>
              resolve({ width: img.naturalWidth, height: img.naturalHeight });
            img.onerror = () => reject(new Error("加载图片失败"));
            img.src = dataUrl;
          },
        );

        setOriginalImage(dataUrl, size);
      } catch (err) {
        setError(err instanceof Error ? err.message : "处理图片失败");
      } finally {
        setLoading(false);
      }
    },
    [setOriginalImage, setLoading, setError],
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

      const file = e.dataTransfer.files[0];
      if (file) {
        handleFile(file);
      }
    },
    [handleFile],
  );

  /**
   * 点击上传
   */
  const handleClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        handleFile(file);
      }
      // 重置 input，允许选择同一文件
      e.target.value = "";
    },
    [handleFile],
  );

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-4">
      <div
        onClick={handleClick}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`
          w-full max-w-md aspect-[3/4] rounded-2xl border-2 border-dashed
          flex flex-col items-center justify-center gap-4 cursor-pointer
          transition-all duration-200
          ${
            isDragging
              ? "border-blue-500 bg-blue-50 scale-105"
              : "border-gray-300 bg-gray-50 hover:border-blue-400 hover:bg-blue-50/50"
          }
          ${isLoading ? "pointer-events-none opacity-50" : ""}
        `}
      >
        {isLoading ? (
          <>
            <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-gray-600">正在加载...</p>
          </>
        ) : (
          <>
            <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center">
              <svg
                className="w-8 h-8 text-blue-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
            </div>
            <div className="text-center">
              <p className="text-lg font-medium text-gray-700">
                点击或拖拽上传图片
              </p>
              <p className="text-sm text-gray-500 mt-1">
                支持 JPG、PNG、WebP 格式
              </p>
            </div>
          </>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept={ACCEPTED_TYPES.join(",")}
        onChange={handleFileChange}
        className="hidden"
      />

      <p className="mt-6 text-sm text-gray-500 text-center">
        所有处理均在本地完成，您的图片不会上传到服务器
      </p>
    </div>
  );
}
