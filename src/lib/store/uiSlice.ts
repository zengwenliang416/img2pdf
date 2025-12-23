/**
 * UI 状态管理 Slice
 */

import type { StateCreator } from "zustand";
import type { LoadingProgress, ScanStep } from "./types";

export interface UiState {
  step: ScanStep;
  isLoading: boolean;
  loadingMessage: string;
  loadingProgress: LoadingProgress | null;
  isPageManagerOpen: boolean;
  isExportSettingsOpen: boolean;
  error: string | null;
}

export interface UiActions {
  setStep: (step: ScanStep) => void;
  setLoading: (isLoading: boolean, message?: string) => void;
  setLoadingProgress: (progress: LoadingProgress | null) => void;
  setError: (error: string | null) => void;
  setPageManagerOpen: (open: boolean) => void;
  setExportSettingsOpen: (open: boolean) => void;
  resetUi: () => void;
}

export type UiSlice = UiState & UiActions;

export const initialUiState: UiState = {
  step: "upload",
  isLoading: false,
  loadingMessage: "",
  loadingProgress: null,
  isPageManagerOpen: false,
  isExportSettingsOpen: false,
  error: null,
};

export const createUiSlice: StateCreator<UiSlice, [], [], UiSlice> = (set) => ({
  ...initialUiState,

  setStep: (step) => set({ step }),

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

      return {
        loadingProgress: {
          ...progress,
          total,
          done,
        },
      };
    }),

  setError: (error) => set({ error, isLoading: false, loadingProgress: null }),

  setPageManagerOpen: (open) => set({ isPageManagerOpen: open }),

  setExportSettingsOpen: (open) => set({ isExportSettingsOpen: open }),

  resetUi: () => set(initialUiState),
});
