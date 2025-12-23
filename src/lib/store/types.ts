/**
 * Store 类型定义
 */

import type { Corners, FilterType } from "../opencv";

export type ScanStep = "upload" | "crop" | "filter" | "export";
export type Rotation = 0 | 90 | 180 | 270;
export type PaperSize = "a4" | "a5" | "letter" | "legal" | "b5";
export type PageOrientation = "portrait" | "landscape";

export interface LoadingProgress {
  done: number;
  total: number;
  label?: string;
}

export interface ExportSettings {
  paperSize: PaperSize;
  orientation: PageOrientation;
  quality: number;
  margin: number;
}

export interface ImageItem {
  id: string;
  original: string;
  file: File | null;
  size: { width: number; height: number };
  corners: Corners | null;
  cropped: string | null;
  outputSize: { width: number; height: number } | null;
  filtered: string | null;
  thumbnail: string | null;
  rotation: Rotation;
  filter: FilterType;
  orientation: PageOrientation;
}

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
