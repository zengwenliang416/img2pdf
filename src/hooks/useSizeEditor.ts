/**
 * 输出尺寸编辑 Hook
 * 提供宽高调整、锁定比例、预设尺寸等功能
 */

import { useCallback, useRef, useState } from "react";

/**
 * 预设尺寸定义
 */
export const SIZE_PRESETS = [
  { label: "A4", w: 2480, h: 3508 },
  { label: "A5", w: 1748, h: 2480 },
  { label: "1080p", w: 1920, h: 1080 },
  { label: "4K", w: 3840, h: 2160 },
] as const;

export type SizePreset = (typeof SIZE_PRESETS)[number];

interface UseSizeEditorOptions {
  /** 初始宽度 */
  initialWidth?: number;
  /** 初始高度 */
  initialHeight?: number;
  /** 是否默认保持比例 */
  initialKeepRatio?: boolean;
}

interface UseSizeEditorReturn {
  /** 当前宽度 */
  width: number;
  /** 当前高度 */
  height: number;
  /** 是否保持比例 */
  keepAspectRatio: boolean;
  /** 设置保持比例 */
  setKeepAspectRatio: (value: boolean) => void;
  /** 修改宽度（会联动高度，如果 keepAspectRatio 为 true） */
  setWidth: (value: number) => void;
  /** 修改高度（会联动宽度，如果 keepAspectRatio 为 true） */
  setHeight: (value: number) => void;
  /** 直接设置宽高（同时更新比例基准） */
  setSize: (width: number, height: number) => void;
  /** 应用预设尺寸 */
  applyPreset: (preset: SizePreset) => void;
  /** 预设尺寸列表 */
  presets: readonly SizePreset[];
}

/**
 * 输出尺寸编辑 Hook
 */
export function useSizeEditor(
  options: UseSizeEditorOptions = {},
): UseSizeEditorReturn {
  const {
    initialWidth = 0,
    initialHeight = 0,
    initialKeepRatio = true,
  } = options;

  const [width, setWidthState] = useState(initialWidth);
  const [height, setHeightState] = useState(initialHeight);
  const [keepAspectRatio, setKeepAspectRatio] = useState(initialKeepRatio);

  // 保存原始宽高比
  const aspectRatioRef = useRef<number>(
    initialHeight > 0 ? initialWidth / initialHeight : 1,
  );

  /**
   * 修改宽度（联动高度）
   */
  const setWidth = useCallback(
    (value: number) => {
      setWidthState(value);
      if (keepAspectRatio && aspectRatioRef.current > 0) {
        setHeightState(Math.round(value / aspectRatioRef.current));
      }
    },
    [keepAspectRatio],
  );

  /**
   * 修改高度（联动宽度）
   */
  const setHeight = useCallback(
    (value: number) => {
      setHeightState(value);
      if (keepAspectRatio && aspectRatioRef.current > 0) {
        setWidthState(Math.round(value * aspectRatioRef.current));
      }
    },
    [keepAspectRatio],
  );

  /**
   * 直接设置宽高（更新比例基准）
   */
  const setSize = useCallback((newWidth: number, newHeight: number) => {
    setWidthState(newWidth);
    setHeightState(newHeight);
    if (newHeight > 0) {
      aspectRatioRef.current = newWidth / newHeight;
    }
  }, []);

  /**
   * 应用预设尺寸
   */
  const applyPreset = useCallback((preset: SizePreset) => {
    setWidthState(preset.w);
    setHeightState(preset.h);
    aspectRatioRef.current = preset.w / preset.h;
  }, []);

  return {
    width,
    height,
    keepAspectRatio,
    setKeepAspectRatio,
    setWidth,
    setHeight,
    setSize,
    applyPreset,
    presets: SIZE_PRESETS,
  };
}
