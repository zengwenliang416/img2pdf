/**
 * 图片数据管理 Slice
 */

import type { StateCreator } from "zustand";
import type { Corners, FilterType } from "../opencv";
import type { ImageItem, PageOrientation } from "./types";

export interface ImagesState {
  images: ImageItem[];
  currentIndex: number;
  selectedFilter: FilterType;
  selectedIds: string[];
}

export interface ImagesActions {
  addImages: (
    items: Array<{
      objectUrl: string;
      file: File;
      size: { width: number; height: number };
      thumbnail?: string | null;
    }>,
    defaultFilter: FilterType,
    defaultOrientation: PageOrientation,
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
  toggleSelected: (id: string) => void;
  clearSelection: () => void;
  selectAll: () => void;
  updateImageById: (id: string, patch: Omit<Partial<ImageItem>, "id">) => void;
  removeImagesById: (ids: string[]) => void;
  reorderImages: (activeId: string, overId: string) => void;
  resetImages: () => void;
}

export type ImagesSlice = ImagesState & ImagesActions;

const generateId = () => Math.random().toString(36).substring(2, 9);

function arrayMove<T>(array: T[], fromIndex: number, toIndex: number): T[] {
  if (fromIndex === toIndex) return array;
  const next = array.slice();
  const [item] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, item);
  return next;
}

export const initialImagesState: ImagesState = {
  images: [],
  currentIndex: 0,
  selectedFilter: "enhanced",
  selectedIds: [],
};

export const createImagesSlice: StateCreator<
  ImagesSlice,
  [],
  [],
  ImagesSlice
> = (set, get) => ({
  ...initialImagesState,

  addImages: (items, defaultFilter, defaultOrientation) => {
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
      filter: defaultFilter,
      orientation: defaultOrientation,
    }));

    set((state) => ({
      images: [...state.images, ...newImages],
    }));
  },

  removeImage: (index) => {
    const { images, removeImagesById } = get();
    const target = images[index];
    if (!target) return;
    removeImagesById([target.id]);
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

  clearSelection: () => set({ selectedIds: [] }),

  selectAll: () =>
    set((state) => ({
      selectedIds: state.images.map((img) => img.id),
    })),

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

      // 释放被删除图片的所有 Object URLs（original, cropped, filtered, thumbnail）
      state.images
        .filter((img) => idSet.has(img.id))
        .forEach((img) => {
          [img.original, img.cropped, img.filtered, img.thumbnail].forEach(
            (url) => {
              if (url?.startsWith("blob:")) {
                URL.revokeObjectURL(url);
              }
            },
          );
        });

      const images = state.images.filter((img) => !idSet.has(img.id));
      const selectedIds = state.selectedIds.filter((id) => !idSet.has(id));

      if (images.length === 0) {
        return { ...initialImagesState };
      }

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

  resetImages: () => {
    const { images } = get();
    // 释放所有图片的 Object URLs（original, cropped, filtered, thumbnail）
    images.forEach((img) => {
      [img.original, img.cropped, img.filtered, img.thumbnail].forEach(
        (url) => {
          if (url?.startsWith("blob:")) {
            URL.revokeObjectURL(url);
          }
        },
      );
    });
    set(initialImagesState);
  },
});
