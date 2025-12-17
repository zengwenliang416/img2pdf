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
} from "@/components";

export default function Home() {
  const { step, error, reset, images, setPageManagerOpen } = useAppStore();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 顶部导航栏 */}
      <header className="sticky top-0 z-50 bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
          <button onClick={reset} className="flex items-center gap-2">
            <svg
              className="w-6 h-6 text-blue-500"
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
            <span className="font-semibold text-gray-800">扫描全能王</span>
          </button>

          {/* 步骤指示器 */}
          <div className="flex items-center gap-1">
            <StepIndicator step={1} label="上传" active={step === "upload"} />
            <StepConnector active={step !== "upload"} />
            <StepIndicator step={2} label="裁剪" active={step === "crop"} />
            <StepConnector active={step === "filter" || step === "export"} />
            <StepIndicator
              step={3}
              label="滤镜"
              active={step === "filter" || step === "export"}
            />
          </div>

          {/* 页面管理按钮（多张图片时显示） */}
          {images.length > 1 && step !== "upload" && (
            <button
              onClick={() => setPageManagerOpen(true)}
              className="flex items-center gap-1 px-2 py-1 text-sm text-gray-600 hover:text-blue-500 hover:bg-blue-50 rounded transition-colors"
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
              <span className="hidden sm:inline">{images.length} 页</span>
            </button>
          )}
        </div>
      </header>

      {/* 错误提示 */}
      {error && (
        <div className="max-w-2xl mx-auto px-4 mt-4">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
            <svg
              className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5"
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
            <div className="flex-1">
              <p className="text-red-800 text-sm">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* 主内容区 */}
      <main className="max-w-2xl mx-auto">
        {step === "upload" && <ImageUpload />}
        {step === "crop" && <CornerEditor />}
        {(step === "filter" || step === "export") && <FilterPanel />}
      </main>

      {/* 底部版权信息 */}
      <footer className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur border-t border-gray-100">
        <div className="max-w-2xl mx-auto px-4 py-2 text-center">
          <p className="text-xs text-gray-500">
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
}: {
  step: number;
  label: string;
  active: boolean;
}) {
  return (
    <div className="flex items-center gap-1">
      <div
        className={`
          w-5 h-5 rounded-full flex items-center justify-center text-xs font-medium
          ${active ? "bg-blue-500 text-white" : "bg-gray-200 text-gray-500"}
        `}
      >
        {step}
      </div>
      <span
        className={`text-xs hidden sm:inline ${active ? "text-blue-500 font-medium" : "text-gray-400"}`}
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
    <div className={`w-4 h-0.5 ${active ? "bg-blue-500" : "bg-gray-200"}`} />
  );
}
