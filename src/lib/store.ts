/**
 * 应用全局状态管理
 * 使用 Zustand 管理扫描流程状态
 * 支持多图片处理
 */

import { create } from "zustand";
import type { Corners, FilterType } from "./opencv";

/**
 * 扫描步骤
 */
export type ScanStep = "upload" | "crop" | "filter" | "export";

/**
 * 单张图片的状态
 */
export interface ImageItem {
  // 唯一标识
  id: string;
  // 原始图片 Data URL
  original: string;
  // 原始图片尺寸
  size: { width: number; height: number };
  // 检测到的角点
  corners: Corners | null;
  // 裁剪后的图片 Data URL
  cropped: string | null;
  // 输出尺寸（用于拉伸）
  outputSize: { width: number; height: number } | null;
  // 应用滤镜后的图片 Data URL
  filtered: string | null;
}

/**
 * 应用状态
 */
interface AppState {
  // 当前步骤
  step: ScanStep;

  // 所有图片列表
  images: ImageItem[];

  // 当前编辑的图片索引
  currentIndex: number;

  // 当前选中的滤镜（全局应用）
  selectedFilter: FilterType;

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

  // 添加图片（支持多张）
  addImages: (
    items: Array<{ dataUrl: string; size: { width: number; height: number } }>,
  ) => void;

  // 删除图片
  removeImage: (index: number) => void;

  // 设置当前图片索引
  setCurrentIndex: (index: number) => void;

  // 设置角点
  setCorners: (corners: Corners) => void;

  // 设置裁剪后的图片
  setCroppedImage: (dataUrl: string) => void;

  // 设置输出尺寸（拉伸）
  setOutputSize: (size: { width: number; height: number }) => void;

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

  // 完成当前图片裁剪，进入下一张或滤镜步骤
  finishCrop: () => void;

  // 获取当前图片
  getCurrentImage: () => ImageItem | null;

  // 获取所有已处理的图片
  getProcessedImages: () => string[];
}

const initialState: AppState = {
  step: "upload",
  images: [],
  currentIndex: 0,
  selectedFilter: "enhanced",
  isLoading: false,
  loadingMessage: "",
  error: null,
};

// 生成唯一 ID
const generateId = () => Math.random().toString(36).substring(2, 9);

/**
 * 应用 Store
 */
export const useAppStore = create<AppState & AppActions>((set, get) => ({
  ...initialState,

  setStep: (step) => set({ step }),

  addImages: (items) => {
    const newImages: ImageItem[] = items.map((item) => ({
      id: generateId(),
      original: item.dataUrl,
      size: item.size,
      corners: null,
      cropped: null,
      outputSize: null,
      filtered: null,
    }));

    set((state) => ({
      images: [...state.images, ...newImages],
      step: "crop",
      error: null,
    }));
  },

  removeImage: (index) => {
    set((state) => {
      const newImages = state.images.filter((_, i) => i !== index);
      let newIndex = state.currentIndex;

      // 调整当前索引
      if (newImages.length === 0) {
        return { ...initialState };
      }
      if (newIndex >= newImages.length) {
        newIndex = newImages.length - 1;
      }

      return { images: newImages, currentIndex: newIndex };
    });
  },

  setCurrentIndex: (index) => {
    const { images } = get();
    if (index >= 0 && index < images.length) {
      set({ currentIndex: index });
    }
  },

  setCorners: (corners) => {
    set((state) => {
      const images = [...state.images];
      if (images[state.currentIndex]) {
        images[state.currentIndex] = {
          ...images[state.currentIndex],
          corners,
        };
      }
      return { images };
    });
  },

  setCroppedImage: (dataUrl) => {
    set((state) => {
      const images = [...state.images];
      if (images[state.currentIndex]) {
        images[state.currentIndex] = {
          ...images[state.currentIndex],
          cropped: dataUrl,
        };
      }
      return { images };
    });
  },

  setOutputSize: (size) => {
    set((state) => {
      const images = [...state.images];
      if (images[state.currentIndex]) {
        images[state.currentIndex] = {
          ...images[state.currentIndex],
          outputSize: size,
        };
      }
      return { images };
    });
  },

  setSelectedFilter: (filter) => set({ selectedFilter: filter }),

  setFilteredImage: (dataUrl) => {
    set((state) => {
      const images = [...state.images];
      if (images[state.currentIndex]) {
        images[state.currentIndex] = {
          ...images[state.currentIndex],
          filtered: dataUrl,
        };
      }
      return { images };
    });
  },

  setLoading: (isLoading, message = "") =>
    set({ isLoading, loadingMessage: message }),

  setError: (error) => set({ error, isLoading: false }),

  reset: () => set(initialState),

  goBack: () => {
    const { step, currentIndex, images } = get();
    switch (step) {
      case "crop":
        set({ ...initialState });
        break;
      case "filter":
        // 返回裁剪步骤，从最后一张开始
        set({
          step: "crop",
          currentIndex: images.length - 1,
        });
        break;
      case "export":
        set({ step: "filter" });
        break;
    }
  },

  finishCrop: () => {
    const { currentIndex, images } = get();
    if (currentIndex < images.length - 1) {
      // 还有下一张图片，继续裁剪
      set({ currentIndex: currentIndex + 1 });
    } else {
      // 所有图片裁剪完成，进入滤镜步骤
      set({ step: "filter", currentIndex: 0 });
    }
  },

  getCurrentImage: () => {
    const { images, currentIndex } = get();
    return images[currentIndex] || null;
  },

  getProcessedImages: () => {
    const { images } = get();
    return images
      .map((img) => img.filtered || img.cropped)
      .filter((url): url is string => url !== null);
  },
}));

// 兼容旧 API 的便捷访问器
export const useCurrentImage = () => {
  const { images, currentIndex } = useAppStore();
  return images[currentIndex] || null;
};
