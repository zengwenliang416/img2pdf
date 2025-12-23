"use client";

/**
 * 扫描全能王 MVP - 主页面
 * 单页应用，根据当前步骤显示不同组件
 */

import { useAppStore } from "@/lib/store";
import {
  ImageUpload,
  CornerEditor,
  FilterPanel,
  PageManager,
  OpenCVErrorBoundary,
} from "@/components";

export default function Home() {
  const { step, error, reset, images, setPageManagerOpen } = useAppStore();

  return (
    <div className="min-h-screen bg-[var(--background)]">
      {/* 顶部导航栏 */}
      <header
        className="sticky top-0 z-50 bg-[var(--card-bg)]/95 backdrop-blur-md border-b border-[var(--border-color)]"
        style={{ boxShadow: "var(--shadow-sm)" }}
      >
        <div className="max-w-2xl mx-auto px-4 h-16 flex items-center justify-between">
          {/* Logo */}
          <button
            onClick={reset}
            className="flex items-center gap-2.5 group transition-transform duration-200 hover:scale-105"
          >
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[var(--primary)] to-[var(--primary-600)] flex items-center justify-center shadow-[var(--shadow-sm)] group-hover:shadow-[var(--shadow-primary)] transition-shadow duration-200">
              <svg
                className="w-5 h-5 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
            </div>
            <span className="font-semibold text-[var(--foreground)] hidden sm:inline">
              扫描全能王
            </span>
          </button>

          {/* 步骤指示器 */}
          <div className="flex items-center gap-1.5">
            <StepIndicator
              step={1}
              label="上传"
              active={step === "upload"}
              completed={step !== "upload"}
            />
            <StepConnector active={step !== "upload"} />
            <StepIndicator
              step={2}
              label="裁剪"
              active={step === "crop"}
              completed={step === "filter" || step === "export"}
            />
            <StepConnector active={step === "filter" || step === "export"} />
            <StepIndicator
              step={3}
              label="滤镜"
              active={step === "filter" || step === "export"}
              completed={false}
            />
          </div>

          {/* 页面管理按钮（多张图片时显示） */}
          {images.length > 1 && step !== "upload" ? (
            <button
              onClick={() => setPageManagerOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-[var(--neutral-600)] hover:text-[var(--primary)] bg-[var(--neutral-100)] hover:bg-[var(--primary-50)] rounded-lg transition-all duration-200"
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
                  d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"
                />
              </svg>
              <span className="font-medium">{images.length}</span>
              <span className="hidden sm:inline">页</span>
            </button>
          ) : (
            <div className="w-16" /> // 占位符保持布局平衡
          )}
        </div>
      </header>

      {/* 错误提示 */}
      {error && (
        <div className="max-w-2xl mx-auto px-4 mt-4 animate-slide-up">
          <div
            className="bg-[var(--error-light)] border border-[var(--error)]/20 rounded-xl p-4 flex items-start gap-3"
            style={{ boxShadow: "var(--shadow-sm)" }}
          >
            <div className="w-8 h-8 rounded-full bg-[var(--error)]/10 flex items-center justify-center flex-shrink-0">
              <svg
                className="w-4 h-4 text-[var(--error)]"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <div className="flex-1 pt-1">
              <p className="text-[var(--error)] text-sm font-medium">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* 主内容区 */}
      <main className="max-w-2xl mx-auto pb-16">
        {step === "upload" && <ImageUpload />}
        {step === "crop" && (
          <OpenCVErrorBoundary onReset={reset}>
            <CornerEditor />
          </OpenCVErrorBoundary>
        )}
        {(step === "filter" || step === "export") && (
          <OpenCVErrorBoundary onReset={reset}>
            <FilterPanel />
          </OpenCVErrorBoundary>
        )}
      </main>

      {/* 底部版权信息 */}
      <footer className="fixed bottom-0 left-0 right-0 bg-[var(--card-bg)]/90 backdrop-blur-md border-t border-[var(--border-color)]">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-center gap-2">
          <svg
            className="w-3.5 h-3.5 text-[var(--success)]"
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
          <p className="text-xs text-[var(--neutral-500)]">
            所有处理均在本地完成，您的文档不会上传到任何服务器
          </p>
        </div>
      </footer>

      {/* 页面管理器（全屏覆盖） */}
      <PageManager />
    </div>
  );
}

/**
 * 步骤指示器
 */
function StepIndicator({
  step,
  label,
  active,
  completed,
}: {
  step: number;
  label: string;
  active: boolean;
  completed: boolean;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <div
        className={`
          relative w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold
          transition-all duration-300
          ${
            active
              ? "bg-[var(--primary)] text-white shadow-[var(--shadow-primary)] scale-110"
              : completed
                ? "bg-[var(--primary-100)] text-[var(--primary)]"
                : "bg-[var(--neutral-200)] text-[var(--neutral-500)]"
          }
        `}
      >
        {completed && !active ? (
          <svg
            className="w-3.5 h-3.5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2.5}
              d="M5 13l4 4L19 7"
            />
          </svg>
        ) : (
          step
        )}
        {/* 活跃状态的脉冲动画 */}
        {active && (
          <span className="absolute inset-0 rounded-full bg-[var(--primary)] animate-ping opacity-30" />
        )}
      </div>
      <span
        className={`
          text-xs hidden sm:inline font-medium transition-colors duration-200
          ${
            active
              ? "text-[var(--primary)]"
              : completed
                ? "text-[var(--neutral-600)]"
                : "text-[var(--neutral-400)]"
          }
        `}
      >
        {label}
      </span>
    </div>
  );
}

/**
 * 步骤连接线
 */
function StepConnector({ active }: { active: boolean }) {
  return (
    <div className="relative w-6 h-0.5 mx-0.5">
      {/* 背景线 */}
      <div className="absolute inset-0 bg-[var(--neutral-200)] rounded-full" />
      {/* 激活线（带动画） */}
      <div
        className={`
          absolute inset-y-0 left-0 bg-[var(--primary)] rounded-full
          transition-all duration-500 ease-out
          ${active ? "w-full" : "w-0"}
        `}
      />
    </div>
  );
}
