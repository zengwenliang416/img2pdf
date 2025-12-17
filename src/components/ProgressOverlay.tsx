"use client";

/**
 * 统一进度遮罩组件
 * 用于显示加载状态、进度条和消息
 */

import { useAppStore } from "@/lib/store";

interface ProgressOverlayProps {
  // 是否显示（默认自动从 store 读取 isLoading）
  show?: boolean;
  // 自定义消息（默认从 store 读取 loadingMessage）
  message?: string;
  // 自定义进度（默认从 store 读取 loadingProgress）
  progress?: { done: number; total: number; label?: string } | null;
}

export function ProgressOverlay({
  show,
  message,
  progress,
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
    <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center z-50">
      {/* 旋转加载器 */}
      <div className="w-10 h-10 border-4 border-white border-t-transparent rounded-full animate-spin" />

      {/* 消息文本 */}
      {displayMessage && (
        <p className="mt-3 text-white text-sm font-medium">{displayMessage}</p>
      )}

      {/* 进度条（仅当有进度数据时显示） */}
      {displayProgress && displayProgress.total > 0 && (
        <div className="mt-3 w-48">
          {/* 进度条背景 */}
          <div className="h-2 bg-white/30 rounded-full overflow-hidden">
            {/* 进度条填充 */}
            <div
              className="h-full bg-white rounded-full transition-all duration-300 ease-out"
              style={{ width: `${percentage}%` }}
            />
          </div>
          {/* 进度数字 */}
          <p className="mt-1 text-white/80 text-xs text-center">
            {displayProgress.label && `${displayProgress.label} `}
            {displayProgress.done} / {displayProgress.total}
            {percentage !== null && ` (${percentage}%)`}
          </p>
        </div>
      )}
    </div>
  );
}
