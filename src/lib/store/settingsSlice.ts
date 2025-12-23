/**
 * 导出设置 Slice
 */

import type { StateCreator } from "zustand";
import type { ExportSettings } from "./types";

export interface SettingsState {
  exportSettings: ExportSettings;
}

export interface SettingsActions {
  updateExportSettings: (patch: Partial<ExportSettings>) => void;
  resetSettings: () => void;
}

export type SettingsSlice = SettingsState & SettingsActions;

export const defaultExportSettings: ExportSettings = {
  paperSize: "a4",
  orientation: "portrait",
  quality: 0.92,
  margin: 0,
};

export const initialSettingsState: SettingsState = {
  exportSettings: defaultExportSettings,
};

export const createSettingsSlice: StateCreator<
  SettingsSlice,
  [],
  [],
  SettingsSlice
> = (set) => ({
  ...initialSettingsState,

  updateExportSettings: (patch) =>
    set((state) => ({
      exportSettings: { ...state.exportSettings, ...patch },
    })),

  resetSettings: () => set(initialSettingsState),
});
