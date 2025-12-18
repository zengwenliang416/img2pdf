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
 * 旋转角度（顺时针）
 */
export type Rotation = 0 | 90 | 180 | 270;

/**
 * 批处理/导出进度
 */
export interface LoadingProgress {
  done: number;
  total: number;
  label?: string;
}

/**
 * 纸张尺寸预设（单位：pt，1 inch = 72 pt）
 */
export type PaperSize = "a4" | "a5" | "letter" | "legal" | "b5";

/**
 * 页面方向
 */
export type PageOrientation = "portrait" | "landscape";

/**
 * 导出设置
 */
export interface ExportSettings {
  paperSize: PaperSize;
  orientation: PageOrientation;
  quality: number; // 0.5 - 1.0
  margin: number; // pt
}

/**
 * 纸张尺寸定义（宽 x 高，单位 pt，纵向）
 */
export const PAPER_SIZES: Record<
  PaperSize,
  { width: number; height: number; label: string }
> = {
  a4: { width: 595.28, height: 841.89, label: "A4" },
  a5: { width: 419.53, height: 595.28, label: "A5" },
  letter: { width: 612, height: 792, label: "Letter" },
  legal: { width: 612, height: 1008, label: "Legal" },
  b5: { width: 498.9, height: 708.66, label: "B5" },
};

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

  // 缩略图 Data URL（建议小尺寸 JPEG）
  thumbnail: string | null;

  // 旋转角度（顺时针）
  rotation: Rotation;

  // 当前页滤镜（每页独立）
  filter: FilterType;

  // 当前页导出方向（每页独立）
  orientation: PageOrientation;
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

  // 兼容旧逻辑：全局默认滤镜（用于新建页默认值/批量默认值）
  selectedFilter: FilterType;

  // 是否正在加载
  isLoading: boolean;

  // 加载消息
  loadingMessage: string;

  // 批处理/导出进度（可为 null）
  loadingProgress: LoadingProgress | null;

  // 页面管理模块开关
  isPageManagerOpen: boolean;

  // 页面选择（用于批量操作）
  selectedIds: string[];

  // 导出设置
  exportSettings: ExportSettings;

  // 导出设置弹窗开关
  isExportSettingsOpen: boolean;

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
    items: Array<{
      dataUrl: string;
      size: { width: number; height: number };
      thumbnail?: string | null;
    }>,
  ) => void;

  // 删除图片（旧 API）
  removeImage: (index: number) => void;

  // 设置当前图片索引
  setCurrentIndex: (index: number) => void;

  // 设置角点
  setCorners: (corners: Corners) => void;

  // 设置裁剪后的图片
  setCroppedImage: (dataUrl: string) => void;

  // 设置输出尺寸（拉伸）
  setOutputSize: (size: { width: number; height: number }) => void;

  // 设置全局默认滤镜（兼容旧逻辑）
  setSelectedFilter: (filter: FilterType) => void;

  // 设置滤镜后的图片（旧逻辑：写当前页 filtered）
  setFilteredImage: (dataUrl: string) => void;

  // 设置加载状态
  setLoading: (isLoading: boolean, message?: string) => void;

  // 设置进度
  setLoadingProgress: (progress: LoadingProgress | null) => void;

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

  // 页面管理模块开关
  setPageManagerOpen: (open: boolean) => void;

  // 切换某页选中状态
  toggleSelected: (id: string) => void;

  // 清空选择
  clearSelection: () => void;

  // 全选
  selectAll: () => void;

  // 按 id 更新图片（patch 不允许改 id）
  updateImageById: (id: string, patch: Omit<Partial<ImageItem>, "id">) => void;

  // 按 id 批量删除图片
  removeImagesById: (ids: string[]) => void;

  // 重新排序（把 activeId 移到 overId 位置）
  reorderImages: (activeId: string, overId: string) => void;

  // 导出设置弹窗开关
  setExportSettingsOpen: (open: boolean) => void;

  // 更新导出设置
  updateExportSettings: (patch: Partial<ExportSettings>) => void;
}

/**
 * 默认导出设置
 */
const defaultExportSettings: ExportSettings = {
  paperSize: "a4",
  orientation: "portrait",
  quality: 0.92,
  margin: 0,
};

const initialState: AppState = {
  step: "upload",
  images: [],
  currentIndex: 0,
  selectedFilter: "enhanced",
  isLoading: false,
  loadingMessage: "",
  loadingProgress: null,
  isPageManagerOpen: false,
  selectedIds: [],
  exportSettings: defaultExportSettings,
  isExportSettingsOpen: false,
  error: null,
};

// 生成唯一 ID
const generateId = () => Math.random().toString(36).substring(2, 9);

/**
 * 数组移动：把 fromIndex 的元素移动到 toIndex
 */
function arrayMove<T>(array: T[], fromIndex: number, toIndex: number): T[] {
  if (fromIndex === toIndex) return array;
  const next = array.slice();
  const [item] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, item);
  return next;
}

/**
 * 应用 Store
 */
export const useAppStore = create<AppState & AppActions>((set, get) => ({
  ...initialState,

  setStep: (step) => set({ step }),

  /**
   * 添加图片（支持多张）
   * 补齐 thumbnail/rotation/filter/orientation 默认值
   */
  addImages: (items) => {
    const defaultFilter = get().selectedFilter;
    const defaultOrientation = get().exportSettings.orientation;

    const newImages: ImageItem[] = items.map((item) => ({
      id: generateId(),
      original: item.dataUrl,
      size: item.size,
      corners: null,
      cropped: null,
      outputSize: null,
      filtered: null,
      thumbnail: item.thumbnail ?? null,
      rotation: 0,
      filter: defaultFilter,
      orientation: defaultOrientation,
    }));

    set((state) => ({
      images: [...state.images, ...newImages],
      step: "crop",
      error: null,
    }));
  },

  /**
   * 删除图片（保留旧 API）
   * 转换为按 id 删除，复用 removeImagesById
   */
  removeImage: (index) => {
    const { images } = get();
    const target = images[index];
    if (!target) return;
    get().removeImagesById([target.id]);
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
    set({
      isLoading,
      loadingMessage: message,
      // 结束 loading 时清空进度，避免 UI 显示旧进度
      ...(isLoading ? {} : { loadingProgress: null }),
    }),

  /**
   * 设置进度（可为 null 表示清空）
   * 对 done/total 做基本 clamp，避免异常值导致 UI 崩溃
   */
  setLoadingProgress: (progress) =>
    set(() => {
      if (!progress) return { loadingProgress: null };

      const total = Math.max(0, progress.total);
      const done = Math.max(0, Math.min(progress.done, total));

      return {
        loadingProgress: {
          ...progress,
          total,
          done,
        },
      };
    }),

  setError: (error) => set({ error, isLoading: false, loadingProgress: null }),

  reset: () => set(initialState),

  goBack: () => {
    const { step, images } = get();
    switch (step) {
      case "crop":
        set({ ...initialState });
        break;
      case "filter":
        // 返回裁剪步骤，从最后一张开始
        set({
          step: "crop",
          currentIndex: Math.max(0, images.length - 1),
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
      set({ currentIndex: currentIndex + 1 });
    } else {
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

  /**
   * 控制页面管理模块开关
   */
  setPageManagerOpen: (open) => set({ isPageManagerOpen: open }),

  /**
   * 切换某页的选中状态
   * 若 id 不存在于 images，直接忽略
   */
  toggleSelected: (id) =>
    set((state) => {
      const existsInImages = state.images.some((img) => img.id === id);
      if (!existsInImages) return {};

      const isSelected = state.selectedIds.includes(id);
      const selectedIds = isSelected
        ? state.selectedIds.filter((x) => x !== id)
        : [...state.selectedIds, id];

      return { selectedIds };
    }),

  /**
   * 清空选择
   */
  clearSelection: () => set({ selectedIds: [] }),

  /**
   * 全选
   */
  selectAll: () =>
    set((state) => ({
      selectedIds: state.images.map((img) => img.id),
    })),

  /**
   * 按 id 更新图片
   * 找不到 id 则忽略；patch 不允许修改 id
   */
  updateImageById: (id, patch) =>
    set((state) => {
      const index = state.images.findIndex((img) => img.id === id);
      if (index < 0) return {};

      const images = [...state.images];
      images[index] = { ...images[index], ...patch };

      return { images };
    }),

  /**
   * 按 id 批量删除图片
   * - ids 为空：忽略
   * - 删除后为空：回到 initialState
   * - currentIndex：尽量保持"同一张 id"仍为当前；否则选一个合法 index
   * - selectedIds：同步移除已删除项
   */
  removeImagesById: (ids) =>
    set((state) => {
      if (ids.length === 0) return {};

      const idSet = new Set(ids);
      const currentId = state.images[state.currentIndex]?.id || null;

      const images = state.images.filter((img) => !idSet.has(img.id));
      const selectedIds = state.selectedIds.filter((id) => !idSet.has(id));

      if (images.length === 0) {
        return { ...initialState };
      }

      let currentIndex = 0;
      if (currentId && !idSet.has(currentId)) {
        const idx = images.findIndex((img) => img.id === currentId);
        currentIndex =
          idx >= 0 ? idx : Math.min(state.currentIndex, images.length - 1);
      } else {
        currentIndex = Math.min(state.currentIndex, images.length - 1);
      }

      return {
        images,
        selectedIds,
        currentIndex,
      };
    }),

  /**
   * 重新排序（用于 dnd-kit：把 activeId 移动到 overId 的位置）
   * - 任一 id 不存在：忽略
   * - 排序后 currentIndex：保持原来的"当前 id"不变
   */
  reorderImages: (activeId, overId) =>
    set((state) => {
      if (activeId === overId) return {};

      const fromIndex = state.images.findIndex((img) => img.id === activeId);
      const toIndex = state.images.findIndex((img) => img.id === overId);
      if (fromIndex < 0 || toIndex < 0) return {};

      const currentId = state.images[state.currentIndex]?.id || null;
      const images = arrayMove(state.images, fromIndex, toIndex);

      let currentIndex = 0;
      if (currentId) {
        const idx = images.findIndex((img) => img.id === currentId);
        currentIndex = idx >= 0 ? idx : 0;
      }

      return { images, currentIndex };
    }),

  /**
   * 控制导出设置弹窗开关
   */
  setExportSettingsOpen: (open) => set({ isExportSettingsOpen: open }),

  /**
   * 更新导出设置（patch 合并）
   */
  updateExportSettings: (patch) =>
    set((state) => ({
      exportSettings: { ...state.exportSettings, ...patch },
    })),
}));

// 兼容旧 API 的便捷访问器
export const useCurrentImage = () => {
  const { images, currentIndex } = useAppStore();
  return images[currentIndex] || null;
};
