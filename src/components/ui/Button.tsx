"use client";

/**
 * 统一按钮组件
 * 提供一致的按钮样式和交互效果
 */

import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";

// 按钮变体
type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "success";

// 按钮尺寸
type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** 是否占满宽度 */
  fullWidth?: boolean;
  /** 左侧图标 */
  leftIcon?: ReactNode;
  /** 右侧图标 */
  rightIcon?: ReactNode;
  /** 加载状态 */
  loading?: boolean;
}

/**
 * 合并 class 名称，过滤空值并规范化空格
 */
function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(" ").replace(/\s+/g, " ").trim();
}

/**
 * 获取变体样式
 */
function getVariantStyles(variant: ButtonVariant, disabled: boolean): string {
  if (disabled) {
    return "bg-[var(--neutral-200)] text-[var(--neutral-400)] cursor-not-allowed";
  }

  switch (variant) {
    case "primary":
      return "bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)] hover:shadow-[var(--shadow-primary)] active:bg-[var(--primary-active)]";
    case "secondary":
      return "bg-[var(--card-bg)] text-[var(--foreground)] border border-[var(--border-color)] hover:bg-[var(--background-secondary)] hover:border-[var(--border-color-hover)] active:bg-[var(--background-tertiary)]";
    case "ghost":
      return "bg-transparent text-[var(--neutral-600)] hover:bg-[var(--neutral-100)] hover:text-[var(--foreground)] active:bg-[var(--neutral-200)]";
    case "danger":
      return "bg-[var(--error)] text-white hover:bg-[#dc2626] hover:shadow-[0_4px_14px_0_rgb(239_68_68/0.25)] active:bg-[#b91c1c]";
    case "success":
      return "bg-[var(--success)] text-white hover:bg-[#16a34a] hover:shadow-[0_4px_14px_0_rgb(34_197_94/0.25)] active:bg-[#15803d]";
    default:
      return "";
  }
}

/**
 * 获取尺寸样式
 */
function getSizeStyles(size: ButtonSize): string {
  switch (size) {
    case "sm":
      return "h-8 px-3 text-sm gap-1.5";
    case "md":
      return "h-10 px-4 text-sm gap-2";
    case "lg":
      return "h-12 px-6 text-base gap-2.5";
    default:
      return "";
  }
}

/**
 * 加载动画组件
 */
function LoadingSpinner({ size }: { size: ButtonSize }) {
  const spinnerSize =
    size === "sm" ? "w-3.5 h-3.5" : size === "lg" ? "w-5 h-5" : "w-4 h-4";
  return (
    <svg
      className={cn(spinnerSize, "animate-spin")}
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
}

// 基础样式常量
const BASE_STYLES =
  "inline-flex items-center justify-center font-medium rounded-lg transition-all duration-200 ease-out focus:outline-none focus:ring-2 focus:ring-[var(--primary-400)] focus:ring-offset-2 transform hover:-translate-y-0.5 active:translate-y-0";

const ICON_BUTTON_BASE_STYLES =
  "inline-flex items-center justify-center rounded-lg transition-all duration-200 ease-out focus:outline-none focus:ring-2 focus:ring-[var(--primary-400)] focus:ring-offset-2";

/**
 * 按钮组件
 */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = "primary",
      size = "md",
      fullWidth = false,
      leftIcon,
      rightIcon,
      loading = false,
      disabled,
      className = "",
      children,
      ...props
    },
    ref,
  ) => {
    const isDisabled = disabled || loading;

    const variantStyles = getVariantStyles(variant, isDisabled);
    const sizeStyles = getSizeStyles(size);
    const widthStyles = fullWidth ? "w-full" : "";

    return (
      <button
        ref={ref}
        disabled={isDisabled}
        className={cn(
          BASE_STYLES,
          variantStyles,
          sizeStyles,
          widthStyles,
          className,
        )}
        {...props}
      >
        {loading ? (
          <LoadingSpinner size={size} />
        ) : leftIcon ? (
          <span className="flex-shrink-0">{leftIcon}</span>
        ) : null}
        {children}
        {!loading && rightIcon && (
          <span className="flex-shrink-0">{rightIcon}</span>
        )}
      </button>
    );
  },
);

Button.displayName = "Button";

/**
 * 图标按钮（方形）
 */
interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** 加载状态 */
  loading?: boolean;
  /** 无障碍标签 */
  "aria-label": string;
}

// 图标按钮尺寸映射
const ICON_SIZE_MAP: Record<ButtonSize, string> = {
  sm: "w-8 h-8",
  md: "w-10 h-10",
  lg: "w-12 h-12",
};

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  (
    {
      variant = "ghost",
      size = "md",
      loading = false,
      disabled,
      className = "",
      children,
      ...props
    },
    ref,
  ) => {
    const isDisabled = disabled || loading;
    const variantStyles = getVariantStyles(variant, isDisabled);

    return (
      <button
        ref={ref}
        disabled={isDisabled}
        className={cn(
          ICON_BUTTON_BASE_STYLES,
          variantStyles,
          ICON_SIZE_MAP[size],
          className,
        )}
        {...props}
      >
        {loading ? <LoadingSpinner size={size} /> : children}
      </button>
    );
  },
);

IconButton.displayName = "IconButton";
