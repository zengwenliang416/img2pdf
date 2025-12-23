"use client";

/**
 * 错误边界组件
 * 捕获子组件树中的 JavaScript 错误，防止整个应用崩溃
 * 提供友好的错误提示和重试功能
 */

import React, { Component, ErrorInfo, ReactNode } from "react";
import { createLogger } from "@/lib/utils/logger";
import { Button } from "./ui";

const log = createLogger("[ErrorBoundary]");

interface Props {
  children: ReactNode;
  // 可选的回退 UI
  fallback?: ReactNode;
  // 错误发生时的回调
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  // 重置时的回调
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    // 更新 state 使下一次渲染能够显示降级后的 UI
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // 记录错误日志
    log.error("捕获到渲染错误:", error);
    log.error("错误组件栈:", errorInfo.componentStack);

    this.setState({ errorInfo });

    // 调用外部错误处理回调
    this.props.onError?.(error, errorInfo);
  }

  handleReset = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
    this.props.onReset?.();
  };

  render(): ReactNode {
    if (this.state.hasError) {
      // 如果提供了自定义 fallback，使用它
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // 默认的错误 UI
      return (
        <div className="min-h-[50vh] flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
            {/* 错误图标 */}
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-100 flex items-center justify-center">
              <svg
                className="w-8 h-8 text-red-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>

            {/* 错误标题 */}
            <h2 className="text-xl font-semibold text-gray-800 text-center mb-2">
              出错了
            </h2>

            {/* 错误描述 */}
            <p className="text-gray-600 text-center mb-4">
              抱歉，应用遇到了一个问题。这可能是临时性的错误。
            </p>

            {/* 错误详情（开发环境显示） */}
            {process.env.NODE_ENV === "development" && this.state.error && (
              <div className="mb-4 p-3 bg-gray-50 rounded-lg overflow-auto max-h-32">
                <p className="text-xs font-mono text-red-600 break-all">
                  {this.state.error.message}
                </p>
              </div>
            )}

            {/* 操作按钮 */}
            <div className="flex gap-3">
              <Button
                variant="primary"
                onClick={this.handleReset}
                fullWidth
                leftIcon={
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
                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                    />
                  </svg>
                }
              >
                重试
              </Button>
              <Button
                variant="secondary"
                onClick={() => window.location.reload()}
                fullWidth
                leftIcon={
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
                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                    />
                  </svg>
                }
              >
                刷新页面
              </Button>
            </div>

            {/* 提示信息 */}
            <p className="mt-4 text-xs text-gray-400 text-center">
              如果问题持续存在，请尝试清除浏览器缓存后重新访问
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * 专门用于 OpenCV 相关错误的边界组件
 * 提供更具针对性的错误提示
 */
export class OpenCVErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    log.error("OpenCV 组件错误:", error);
    this.setState({ errorInfo });
    this.props.onError?.(error, errorInfo);
  }

  handleReset = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
    this.props.onReset?.();
  };

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-[50vh] flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-yellow-100 flex items-center justify-center">
              <svg
                className="w-8 h-8 text-yellow-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>

            <h2 className="text-xl font-semibold text-gray-800 text-center mb-2">
              图像处理功能暂不可用
            </h2>

            <p className="text-gray-600 text-center mb-4">
              OpenCV
              图像处理引擎加载失败。这可能是由于浏览器兼容性或网络问题导致的。
            </p>

            <div className="space-y-2 mb-4 text-sm text-gray-500">
              <p>您可以尝试以下方法：</p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>刷新页面重新加载</li>
                <li>检查网络连接</li>
                <li>使用 Chrome 或 Edge 浏览器</li>
              </ul>
            </div>

            <div className="flex gap-3">
              <Button
                variant="primary"
                onClick={this.handleReset}
                fullWidth
                leftIcon={
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
                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                    />
                  </svg>
                }
              >
                重试
              </Button>
              <Button
                variant="secondary"
                onClick={() => window.location.reload()}
                fullWidth
                leftIcon={
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
                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                    />
                  </svg>
                }
              >
                刷新页面
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
