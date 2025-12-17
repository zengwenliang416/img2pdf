/**
 * OpenCV 模块统一导出
 */

export { ensureOpenCV, isOpenCVReady, getOpenCVStatus } from "./ensureOpenCV";
export type { OpenCVReady } from "./ensureOpenCV";
export { detectDocumentEdges, getDefaultCorners } from "./detectEdges";
export type { Point, Corners, DetectConfig } from "./detectEdges";
export {
  applyPerspectiveTransform,
  previewPerspectiveTransform,
  calculateOutputSize,
} from "./perspectiveTransform";
export { applyFilter, getFilterName, AVAILABLE_FILTERS } from "./imageFilters";
export type { FilterType, FilterConfig } from "./imageFilters";
