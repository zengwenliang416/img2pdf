"use client";

/**
 * 统一进度遮罩组件
 * 用于显示加载状态、进度条和消息
 * 支持不同的加载类型展示不同的视觉效果
 */

import { useAppStore } from "@/lib/store";

// 加载类型
type LoadingType = "default" | "opencv" | "export" | "filter";

interface ProgressOverlayProps {
  // 是否显示（默认自动从 store 读取 isLoading）
  show?: boolean;
  // 自定义消息（默认从 store 读取 loadingMessage）
  message?: string;
  // 自定义进度（默认从 store 读取 loadingProgress）
  progress?: { done: number; total: number; label?: string } | null;
  // 加载类型（影响图标样式）
  type?: LoadingType;
  // 是否使用圆角（适配不同容器）
  rounded?: boolean;
}

/**
 * 根据加载类型渲染不同的图标
 */
function LoadingIcon({ type }: { type: LoadingType }) {
  if (type === "opencv") {
    // OpenCV 图像处理风格 - 像素网格动画
    return (
      <div className="relative w-12 h-12">
        <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 gap-0.5">
          {[...Array(9)].map((_, i) => (
            <div
              key={i}
              className="bg-blue-400 rounded-sm animate-pulse"
              style={{
                animationDelay: `${i * 100}ms`,
                animationDuration: "1s",
              }}
            />
          ))}
        </div>
        <div className="absolute inset-0 flex items-center justify-center">
          <svg
            className="w-6 h-6 text-white drop-shadow"
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
      </div>
    );
  }

  if (type === "export") {
    // 导出风格 - 文档下载动画
    return (
      <svg
        className="w-12 h-12 text-white animate-bounce"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
        />
      </svg>
    );
  }

  if (type === "filter") {
    // 滤镜风格 - 调色板旋转
    return (
      <svg
        className="w-12 h-12 text-white animate-spin"
        style={{ animationDuration: "2s" }}
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01"
        />
      </svg>
    );
  }

  // 默认旋转圆圈
  return (
    <div className="w-10 h-10 border-4 border-white border-t-transparent rounded-full animate-spin" />
  );
}

export function ProgressOverlay({
  show,
  message,
  progress,
  type = "default",
  rounded = true,
}: ProgressOverlayProps) {
  const { isLoading, loadingMessage, loadingProgress } = useAppStore();

  // 确定是否显示
  const shouldShow = show ?? isLoading;
  if (!shouldShow) return null;

  // 确定显示内容
  const displayMessage = message ?? loadingMessage;
  const displayProgress = progress ?? loadingProgress;

  // 计算进度百分比
  const percentage =
    displayProgress && displayProgress.total > 0
      ? Math.round((displayProgress.done / displayProgress.total) * 100)
      : null;

  return (
    <div
      className={`
        absolute inset-0 bg-black/60 backdrop-blur-sm
        flex flex-col items-center justify-center z-50
        ${rounded ? "rounded-lg" : ""}
      `}
    >
      {/* 加载图标 */}
      <LoadingIcon type={type} />

      {/* 消息文本 */}
      {displayMessage && (
        <p className="mt-3 text-white text-sm font-medium drop-shadow">
          {displayMessage}
        </p>
      )}

      {/* 进度条（仅当有进度数据时显示） */}
      {displayProgress && displayProgress.total > 0 && (
        <div className="mt-3 w-48">
          {/* 标签和进度数字 */}
          <div className="flex justify-between text-xs text-white/80 mb-1">
            <span>{displayProgress.label || "处理中"}</span>
            <span>
              {displayProgress.done}/{displayProgress.total}
            </span>
          </div>
          {/* 进度条背景 */}
          <div className="h-2 bg-white/20 rounded-full overflow-hidden">
            {/* 进度条填充 */}
            <div
              className="h-full bg-white rounded-full transition-all duration-300 ease-out"
              style={{ width: `${percentage}%` }}
            />
          </div>
          {/* 百分比 */}
          {percentage !== null && (
            <p className="mt-1 text-white text-sm text-center font-medium">
              {percentage}%
            </p>
          )}
        </div>
      )}
    </div>
  );
}
