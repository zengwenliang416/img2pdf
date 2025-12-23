/**
 * 应用全局状态管理
 * 使用 Zustand 管理扫描流程状态
 * 模块化组织 + Selector Hooks（优化重渲染）
 */

import { create } from "zustand";
import { useShallow } from "zustand/react/shallow";
import type { Corners, FilterType } from "../opencv";

// Re-export types
export * from "./types";
export type {
  ImageItem,
  ScanStep,
  Rotation,
  PaperSize,
  PageOrientation,
  LoadingProgress,
  ExportSettings,
} from "./types";

import type {
  ImageItem,
  ScanStep,
  PageOrientation,
  LoadingProgress,
  ExportSettings,
} from "./types";

// ============================================
// State & Actions Interface
// ============================================

interface AppState {
  // Flow
  step: ScanStep;
  currentIndex: number;

  // Images
  images: ImageItem[];
  selectedFilter: FilterType;
  selectedIds: string[];

  // UI
  isLoading: boolean;
  loadingMessage: string;
  loadingProgress: LoadingProgress | null;
  isPageManagerOpen: boolean;
  isExportSettingsOpen: boolean;
  error: string | null;

  // Settings
  exportSettings: ExportSettings;
}

interface AppActions {
  // Flow
  setStep: (step: ScanStep) => void;
  goBack: () => void;
  finishCrop: () => void;
  reset: () => void;

  // Images
  addImages: (
    items: Array<{
      objectUrl: string;
      file: File;
      size: { width: number; height: number };
      thumbnail?: string | null;
    }>,
  ) => void;
  removeImage: (index: number) => void;
  setCurrentIndex: (index: number) => void;
  setCorners: (corners: Corners) => void;
  setCroppedImage: (dataUrl: string) => void;
  setOutputSize: (size: { width: number; height: number }) => void;
  setSelectedFilter: (filter: FilterType) => void;
  setFilteredImage: (dataUrl: string) => void;
  getCurrentImage: () => ImageItem | null;
  getProcessedImages: () => string[];
  updateImageById: (id: string, patch: Omit<Partial<ImageItem>, "id">) => void;
  removeImagesById: (ids: string[]) => void;
  reorderImages: (activeId: string, overId: string) => void;

  // Selection
  toggleSelected: (id: string) => void;
  clearSelection: () => void;
  selectAll: () => void;

  // UI
  setLoading: (isLoading: boolean, message?: string) => void;
  setLoadingProgress: (progress: LoadingProgress | null) => void;
  setError: (error: string | null) => void;
  setPageManagerOpen: (open: boolean) => void;
  setExportSettingsOpen: (open: boolean) => void;

  // Settings
  updateExportSettings: (patch: Partial<ExportSettings>) => void;
}

// ============================================
// Initial State
// ============================================

const defaultExportSettings: ExportSettings = {
  paperSize: "a4",
  orientation: "portrait",
  quality: 0.92,
  margin: 0,
};

const initialState: AppState = {
  step: "upload",
  currentIndex: 0,
  images: [],
  selectedFilter: "enhanced",
  selectedIds: [],
  isLoading: false,
  loadingMessage: "",
  loadingProgress: null,
  isPageManagerOpen: false,
  isExportSettingsOpen: false,
  error: null,
  exportSettings: defaultExportSettings,
};

// ============================================
// Utilities
// ============================================

const generateId = () => Math.random().toString(36).substring(2, 9);

function arrayMove<T>(array: T[], fromIndex: number, toIndex: number): T[] {
  if (fromIndex === toIndex) return array;
  const next = array.slice();
  const [item] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, item);
  return next;
}

// ============================================
// Store
// ============================================

export const useAppStore = create<AppState & AppActions>((set, get) => ({
  ...initialState,

  // === Flow Actions ===
  setStep: (step) => set({ step }),

  goBack: () => {
    const { step, images } = get();
    switch (step) {
      case "crop":
        images.forEach((img) => {
          if (img.original.startsWith("blob:")) {
            URL.revokeObjectURL(img.original);
          }
        });
        set(initialState);
        break;
      case "filter":
        set({ step: "crop", currentIndex: Math.max(0, images.length - 1) });
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

  reset: () => {
    const { images } = get();
    images.forEach((img) => {
      if (img.original.startsWith("blob:")) {
        URL.revokeObjectURL(img.original);
      }
    });
    set(initialState);
  },

  // === Image Actions ===
  addImages: (items) => {
    const { selectedFilter, exportSettings } = get();
    const newImages: ImageItem[] = items.map((item) => ({
      id: generateId(),
      original: item.objectUrl,
      file: item.file,
      size: item.size,
      corners: null,
      cropped: null,
      outputSize: null,
      filtered: null,
      thumbnail: item.thumbnail ?? null,
      rotation: 0,
      filter: selectedFilter,
      orientation: exportSettings.orientation,
    }));

    set((state) => ({
      images: [...state.images, ...newImages],
      step: "crop",
      error: null,
    }));
  },

  removeImage: (index) => {
    const { images, removeImagesById } = get();
    const target = images[index];
    if (target) removeImagesById([target.id]);
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
        images[state.currentIndex] = { ...images[state.currentIndex], corners };
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

  updateImageById: (id, patch) =>
    set((state) => {
      const index = state.images.findIndex((img) => img.id === id);
      if (index < 0) return {};
      const images = [...state.images];
      images[index] = { ...images[index], ...patch };
      return { images };
    }),

  removeImagesById: (ids) =>
    set((state) => {
      if (ids.length === 0) return {};

      const idSet = new Set(ids);
      const currentId = state.images[state.currentIndex]?.id || null;

      state.images
        .filter((img) => idSet.has(img.id))
        .forEach((img) => {
          if (img.original.startsWith("blob:")) {
            URL.revokeObjectURL(img.original);
          }
        });

      const images = state.images.filter((img) => !idSet.has(img.id));
      const selectedIds = state.selectedIds.filter((id) => !idSet.has(id));

      if (images.length === 0) return { ...initialState };

      let currentIndex = 0;
      if (currentId && !idSet.has(currentId)) {
        const idx = images.findIndex((img) => img.id === currentId);
        currentIndex =
          idx >= 0 ? idx : Math.min(state.currentIndex, images.length - 1);
      } else {
        currentIndex = Math.min(state.currentIndex, images.length - 1);
      }

      return { images, selectedIds, currentIndex };
    }),

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

  // === Selection Actions ===
  toggleSelected: (id) =>
    set((state) => {
      if (!state.images.some((img) => img.id === id)) return {};
      const isSelected = state.selectedIds.includes(id);
      return {
        selectedIds: isSelected
          ? state.selectedIds.filter((x) => x !== id)
          : [...state.selectedIds, id],
      };
    }),

  clearSelection: () => set({ selectedIds: [] }),

  selectAll: () =>
    set((state) => ({ selectedIds: state.images.map((img) => img.id) })),

  // === UI Actions ===
  setLoading: (isLoading, message = "") =>
    set({
      isLoading,
      loadingMessage: message,
      ...(isLoading ? {} : { loadingProgress: null }),
    }),

  setLoadingProgress: (progress) =>
    set(() => {
      if (!progress) return { loadingProgress: null };
      const total = Math.max(0, progress.total);
      const done = Math.max(0, Math.min(progress.done, total));
      return { loadingProgress: { ...progress, total, done } };
    }),

  setError: (error) => set({ error, isLoading: false, loadingProgress: null }),

  setPageManagerOpen: (open) => set({ isPageManagerOpen: open }),

  setExportSettingsOpen: (open) => set({ isExportSettingsOpen: open }),

  // === Settings Actions ===
  updateExportSettings: (patch) =>
    set((state) => ({
      exportSettings: { ...state.exportSettings, ...patch },
    })),
}));

// ============================================
// Selector Hooks（优化重渲染）
// ============================================

/** 流程状态 */
export const useFlowState = () =>
  useAppStore(
    useShallow((s) => ({
      step: s.step,
      currentIndex: s.currentIndex,
      imagesCount: s.images.length,
    })),
  );

/** 当前图片 */
export const useCurrentImage = () => {
  const { images, currentIndex } = useAppStore(
    useShallow((s) => ({ images: s.images, currentIndex: s.currentIndex })),
  );
  return images[currentIndex] || null;
};

/** 图片列表 */
export const useImages = () => useAppStore((s) => s.images);

/** 加载状态 */
export const useLoadingState = () =>
  useAppStore(
    useShallow((s) => ({
      isLoading: s.isLoading,
      loadingMessage: s.loadingMessage,
      loadingProgress: s.loadingProgress,
    })),
  );

/** 错误状态 */
export const useErrorState = () => useAppStore((s) => s.error);

/** 页面管理器状态 */
export const usePageManagerState = () =>
  useAppStore(
    useShallow((s) => ({
      isOpen: s.isPageManagerOpen,
      selectedIds: s.selectedIds,
    })),
  );

/** 导出设置 */
export const useExportSettings = () =>
  useAppStore(
    useShallow((s) => ({
      settings: s.exportSettings,
      isOpen: s.isExportSettingsOpen,
    })),
  );

/** 滤镜状态 */
export const useFilterState = () =>
  useAppStore(useShallow((s) => ({ selectedFilter: s.selectedFilter })));

// ============================================
// Action Hooks（按功能分组）
// ============================================

/** 流程操作 */
export const useFlowActions = () =>
  useAppStore(
    useShallow((s) => ({
      setStep: s.setStep,
      goBack: s.goBack,
      finishCrop: s.finishCrop,
      reset: s.reset,
    })),
  );

/** 图片操作 */
export const useImageActions = () =>
  useAppStore(
    useShallow((s) => ({
      addImages: s.addImages,
      removeImage: s.removeImage,
      setCurrentIndex: s.setCurrentIndex,
      setCorners: s.setCorners,
      setCroppedImage: s.setCroppedImage,
      setOutputSize: s.setOutputSize,
      setFilteredImage: s.setFilteredImage,
      updateImageById: s.updateImageById,
      removeImagesById: s.removeImagesById,
      reorderImages: s.reorderImages,
    })),
  );

/** UI 操作 */
export const useUiActions = () =>
  useAppStore(
    useShallow((s) => ({
      setLoading: s.setLoading,
      setLoadingProgress: s.setLoadingProgress,
      setError: s.setError,
      setPageManagerOpen: s.setPageManagerOpen,
      setExportSettingsOpen: s.setExportSettingsOpen,
    })),
  );

/** 选择操作 */
export const useSelectionActions = () =>
  useAppStore(
    useShallow((s) => ({
      toggleSelected: s.toggleSelected,
      clearSelection: s.clearSelection,
      selectAll: s.selectAll,
    })),
  );

/** 设置操作 */
export const useSettingsActions = () =>
  useAppStore(
    useShallow((s) => ({
      setSelectedFilter: s.setSelectedFilter,
      updateExportSettings: s.updateExportSettings,
    })),
  );
