/**
 * Store 兼容层 - 重导出模块化 store
 * @deprecated 直接从 '@/lib/store' 导入
 */

export * from "./store/index";
export {
  useAppStore,
  useCurrentImage,
  useFlowState,
  useImages,
  useLoadingState,
  useErrorState,
  usePageManagerState,
  useExportSettings,
  useFilterState,
  useFlowActions,
  useImageActions,
  useUiActions,
  useSelectionActions,
  useSettingsActions,
} from "./store/index";
