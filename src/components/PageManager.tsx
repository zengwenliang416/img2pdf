"use client";

/**
 * 页面管理器组件 v3
 * 显示所有页面的网格视图，支持点击切换页面
 * 支持选择模式：批量选择、全选、删除选中页面
 * 支持拖拽排序：使用 @dnd-kit 实现页面顺序调整
 */

import { useState } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useAppStore, type ImageItem } from "@/lib/store";

interface PageManagerProps {
  // 缩略图 URL 映射（id -> url），用于显示处理后的预览
  previewUrls?: Map<string, string>;
}

/**
 * 可排序的页面项组件
 */
interface SortablePageItemProps {
  img: ImageItem;
  index: number;
  isActive: boolean;
  isSelected: boolean;
  isSelectionMode: boolean;
  previewUrl?: string;
  onPageClick: (img: ImageItem, index: number) => void;
}

function SortablePageItem({
  img,
  index,
  isActive,
  isSelected,
  isSelectionMode,
  previewUrl,
  onPageClick,
}: SortablePageItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: img.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : 1,
    opacity: isDragging ? 0.8 : 1,
  };

  // 优先使用 previewUrl，其次 thumbnail，再次 cropped，最后 original
  const thumbUrl = previewUrl || img.thumbnail || img.cropped || img.original;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={() => onPageClick(img, index)}
      className={`
        relative aspect-[3/4] rounded-lg overflow-hidden cursor-grab active:cursor-grabbing
        border-2 transition-all duration-200
        ${isDragging ? "ring-4 ring-[var(--primary-400)] shadow-2xl scale-105" : ""}
        ${
          isSelectionMode
            ? isSelected
              ? "border-[var(--primary-500)] ring-2 ring-[var(--primary-400)]"
              : "border-[var(--glass-border)] hover:border-[var(--neutral-400)]"
            : isActive
              ? "border-[var(--primary-500)] ring-2 ring-[var(--primary-400)]"
              : "border-[var(--glass-border)] hover:border-[var(--neutral-400)]"
        }
      `}
    >
      <img
        src={thumbUrl}
        alt={`页面 ${index + 1}`}
        className="w-full h-full object-cover pointer-events-none"
        draggable={false}
      />

      {/* 选择模式下的复选框 */}
      {isSelectionMode && (
        <div className="absolute top-1 left-1 pointer-events-none">
          <div
            className={`
              w-6 h-6 rounded-full border-2 flex items-center justify-center
              transition-all duration-200
              ${
                isSelected
                  ? "bg-[var(--primary-500)] border-[var(--primary-500)]"
                  : "bg-black/40 border-white/60"
              }
            `}
          >
            {isSelected && (
              <svg
                className="w-4 h-4 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={3}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            )}
          </div>
        </div>
      )}

      {/* 页码标签 */}
      <span
        className={`
          absolute bottom-1 right-1 px-2 py-0.5 rounded-md text-sm font-medium pointer-events-none
          transition-all duration-200
          ${
            isSelectionMode
              ? isSelected
                ? "bg-[var(--primary-500)] text-white"
                : "bg-black/60 text-white"
              : isActive
                ? "bg-[var(--primary-500)] text-white"
                : "bg-black/60 text-white"
          }
        `}
      >
        {index + 1}
      </span>

      {/* 非选择模式下的当前页标识 */}
      {!isSelectionMode && isActive && (
        <div className="absolute top-1 left-1 pointer-events-none">
          <svg
            className="w-5 h-5 text-[var(--primary-500)]"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
              clipRule="evenodd"
            />
          </svg>
        </div>
      )}

      {/* 拖拽指示器 */}
      {isDragging && (
        <div className="absolute inset-0 bg-[var(--primary-500)]/20 pointer-events-none" />
      )}
    </div>
  );
}

export function PageManager({ previewUrls }: PageManagerProps) {
  const {
    images,
    currentIndex,
    setCurrentIndex,
    isPageManagerOpen,
    setPageManagerOpen,
    selectedIds,
    toggleSelected,
    clearSelection,
    selectAll,
    removeImagesById,
    reorderImages,
  } = useAppStore();

  // 选择模式状态
  const [isSelectionMode, setIsSelectionMode] = useState(false);

  // dnd-kit 传感器配置
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // 拖动 8px 后才激活，避免误触
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  // 拖拽结束处理
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      reorderImages(active.id as string, over.id as string);
    }
  };

  // 未打开时不渲染
  if (!isPageManagerOpen) {
    return null;
  }

  // 退出选择模式并清除选择
  const exitSelectionMode = () => {
    setIsSelectionMode(false);
    clearSelection();
  };

  // 进入选择模式
  const enterSelectionMode = () => {
    setIsSelectionMode(true);
  };

  // 删除选中的页面
  const handleDeleteSelected = () => {
    if (selectedIds.length === 0) return;

    // 确认删除
    const confirmed = window.confirm(
      `确定要删除选中的 ${selectedIds.length} 个页面吗？此操作不可撤销。`,
    );
    if (!confirmed) return;

    removeImagesById(selectedIds);
    exitSelectionMode();

    // 如果删除后没有图片了，关闭页面管理器
    if (images.length - selectedIds.length === 0) {
      setPageManagerOpen(false);
    }
  };

  // 处理页面点击
  const handlePageClick = (img: (typeof images)[0], index: number) => {
    if (isSelectionMode) {
      toggleSelected(img.id);
    } else {
      setCurrentIndex(index);
      setPageManagerOpen(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-[var(--overlay-bg)] backdrop-blur-sm flex flex-col animate-fade-in">
      {/* 头部 - 玻璃态设计 */}
      <div className="flex items-center justify-between px-4 py-3 glass-panel-strong border-b border-[var(--glass-border)]">
        <div className="flex items-center gap-3">
          {isSelectionMode ? (
            <>
              <button
                onClick={exitSelectionMode}
                className="p-1.5 text-[var(--neutral-400)] hover:text-[var(--foreground)] transition-colors"
                aria-label="取消选择"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
              <span className="text-[var(--foreground)] font-medium">
                已选择 {selectedIds.length} 项
              </span>
            </>
          ) : (
            <h2 className="text-lg font-semibold text-[var(--foreground)]">
              页面管理 ({images.length} 页)
            </h2>
          )}
        </div>

        <div className="flex items-center gap-2">
          {isSelectionMode ? (
            <>
              {/* 全选/取消全选 */}
              <button
                onClick={
                  selectedIds.length === images.length
                    ? clearSelection
                    : selectAll
                }
                className="px-3 py-1.5 text-sm text-[var(--neutral-600)] hover:text-[var(--foreground)] hover:bg-[var(--neutral-100)] rounded-lg transition-all duration-200"
              >
                {selectedIds.length === images.length ? "取消全选" : "全选"}
              </button>
              {/* 删除按钮 */}
              <button
                onClick={handleDeleteSelected}
                disabled={selectedIds.length === 0}
                className="px-3 py-1.5 text-sm bg-[var(--error)] text-white rounded-lg hover:bg-[#dc2626] hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
              >
                删除 ({selectedIds.length})
              </button>
            </>
          ) : (
            <>
              {/* 进入选择模式按钮 */}
              {images.length > 1 && (
                <button
                  onClick={enterSelectionMode}
                  className="px-3 py-1.5 text-sm text-[var(--neutral-400)] hover:text-[var(--foreground)] hover:bg-[var(--neutral-100)] rounded-lg transition-all duration-200"
                >
                  选择
                </button>
              )}
              {/* 关闭按钮 */}
              <button
                onClick={() => setPageManagerOpen(false)}
                className="p-2 text-[var(--neutral-400)] hover:text-[var(--foreground)] hover:bg-[var(--neutral-100)] rounded-lg transition-all duration-200"
                aria-label="关闭"
              >
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </>
          )}
        </div>
      </div>

      {/* 网格区域 */}
      <div className="flex-1 overflow-auto p-4">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={images.map((img) => img.id)}
            strategy={rectSortingStrategy}
          >
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {images.map((img, index) => (
                <SortablePageItem
                  key={img.id}
                  img={img}
                  index={index}
                  isActive={index === currentIndex}
                  isSelected={selectedIds.includes(img.id)}
                  isSelectionMode={isSelectionMode}
                  previewUrl={previewUrls?.get(img.id)}
                  onPageClick={handlePageClick}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      </div>

      {/* 底部提示 */}
      <div className="px-4 py-3 glass-panel-strong border-t border-[var(--glass-border)] text-center">
        <p className="text-sm text-[var(--neutral-400)]">
          {isSelectionMode
            ? "点击页面进行选择，可批量删除"
            : "拖拽调整顺序，点击跳转编辑"}
        </p>
      </div>
    </div>
  );
}
