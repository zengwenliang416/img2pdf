/**
 * 应用全局状态管理
 * 使用 Zustand 管理扫描流程状态
 */

import { create } from "zustand";
import type { Corners, FilterType } from "./opencv";

/**
 * 扫描步骤
 */
export type ScanStep = "upload" | "crop" | "filter" | "export";

/**
 * 应用状态
 */
interface AppState {
  // 当前步骤
  step: ScanStep;

  // 原始图片 Data URL
  originalImage: string | null;

  // 原始图片尺寸
  imageSize: { width: number; height: number } | null;

  // 检测到的角点
  corners: Corners | null;

  // 裁剪后的图片 Data URL
  croppedImage: string | null;

  // 当前选中的滤镜
  selectedFilter: FilterType;

  // 应用滤镜后的图片 Data URL
  filteredImage: string | null;

  // 是否正在加载
  isLoading: boolean;

  // 加载消息
  loadingMessage: string;

  // 错误消息
  error: string | null;
}

/**
 * 应用操作
 */
interface AppActions {
  // 设置步骤
  setStep: (step: ScanStep) => void;

  // 设置原始图片
  setOriginalImage: (
    dataUrl: string,
    size: { width: number; height: number },
  ) => void;

  // 设置角点
  setCorners: (corners: Corners) => void;

  // 设置裁剪后的图片
  setCroppedImage: (dataUrl: string) => void;

  // 设置滤镜
  setSelectedFilter: (filter: FilterType) => void;

  // 设置滤镜后的图片
  setFilteredImage: (dataUrl: string) => void;

  // 设置加载状态
  setLoading: (isLoading: boolean, message?: string) => void;

  // 设置错误
  setError: (error: string | null) => void;

  // 重置状态
  reset: () => void;

  // 返回上一步
  goBack: () => void;
}

const initialState: AppState = {
  step: "upload",
  originalImage: null,
  imageSize: null,
  corners: null,
  croppedImage: null,
  selectedFilter: "enhanced",
  filteredImage: null,
  isLoading: false,
  loadingMessage: "",
  error: null,
};

/**
 * 应用 Store
 */
export const useAppStore = create<AppState & AppActions>((set, get) => ({
  ...initialState,

  setStep: (step) => set({ step }),

  setOriginalImage: (dataUrl, size) =>
    set({
      originalImage: dataUrl,
      imageSize: size,
      step: "crop",
      error: null,
    }),

  setCorners: (corners) => set({ corners }),

  setCroppedImage: (dataUrl) =>
    set({
      croppedImage: dataUrl,
      step: "filter",
      error: null,
    }),

  setSelectedFilter: (filter) => set({ selectedFilter: filter }),

  setFilteredImage: (dataUrl) => set({ filteredImage: dataUrl }),

  setLoading: (isLoading, message = "") =>
    set({ isLoading, loadingMessage: message }),

  setError: (error) => set({ error, isLoading: false }),

  reset: () => set(initialState),

  goBack: () => {
    const { step } = get();
    switch (step) {
      case "crop":
        set({ ...initialState });
        break;
      case "filter":
        set({ step: "crop", croppedImage: null, filteredImage: null });
        break;
      case "export":
        set({ step: "filter" });
        break;
    }
  },
}));
