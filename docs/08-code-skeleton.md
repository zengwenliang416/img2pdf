# 8. 代码骨架与目录结构

## 项目目录结构

```
img2pdf/
├── app/                          # Next.js App Router
│   ├── layout.tsx                # 根布局
│   ├── page.tsx                  # 首页（文档列表）
│   ├── globals.css               # 全局样式
│   ├── scan/
│   │   └── page.tsx              # 扫描/采集页
│   ├── edit/
│   │   └── [id]/
│   │       ├── layout.tsx        # 编辑页共享布局
│   │       ├── crop/
│   │       │   └── page.tsx      # 边缘裁剪页
│   │       ├── enhance/
│   │       │   └── page.tsx      # 图像增强页
│   │       ├── pages/
│   │       │   └── page.tsx      # 多页管理页
│   │       └── export/
│   │           └── page.tsx      # 导出预览页
│   ├── doc/
│   │   └── [id]/
│   │       └── page.tsx          # 文档详情页
│   ├── settings/
│   │   └── page.tsx              # 设置页
│   └── api/                      # API Routes (可选后端)
│       ├── ocr/
│       │   └── route.ts          # OCR识别接口
│       └── share/
│           ├── route.ts          # 创建分享
│           └── [id]/
│               └── route.ts      # 获取分享
│
├── components/                   # React组件
│   ├── ui/                       # shadcn/ui 基础组件
│   │   ├── button.tsx
│   │   ├── dialog.tsx
│   │   ├── toast.tsx
│   │   └── ...
│   ├── layout/                   # 布局组件
│   │   ├── Header.tsx
│   │   ├── Footer.tsx
│   │   ├── MobileNav.tsx
│   │   └── PageContainer.tsx
│   ├── capture/                  # 采集相关组件
│   │   ├── CameraView.tsx        # 相机取景
│   │   ├── FileUploader.tsx      # 文件上传
│   │   └── ImagePreview.tsx      # 图片预览
│   ├── editor/                   # 编辑器组件
│   │   ├── ImageCanvas.tsx       # Canvas画布
│   │   ├── CornerHandles.tsx     # 四角拖拽点
│   │   ├── FilterSelector.tsx    # 滤镜选择器
│   │   ├── EnhanceControls.tsx   # 增强控制器
│   │   └── ConfirmBar.tsx        # 确认操作栏
│   ├── document/                 # 文档管理组件
│   │   ├── DocumentCard.tsx      # 文档卡片
│   │   ├── DocumentGrid.tsx      # 文档网格
│   │   ├── PageThumbnail.tsx     # 页面缩略图
│   │   ├── SortablePageList.tsx  # 可排序页面列表
│   │   └── SearchBar.tsx         # 搜索栏
│   ├── export/                   # 导出相关组件
│   │   ├── ExportPreview.tsx     # 导出预览
│   │   ├── FormatSelector.tsx    # 格式选择
│   │   └── QualitySlider.tsx     # 质量选择
│   └── shared/                   # 共享组件
│       ├── Loading.tsx           # 加载状态
│       ├── EmptyState.tsx        # 空状态
│       ├── ErrorBoundary.tsx     # 错误边界
│       └── ConfirmDialog.tsx     # 确认弹窗
│
├── lib/                          # 核心库
│   ├── db/                       # 数据库
│   │   ├── index.ts              # Dexie实例
│   │   ├── schema.ts             # 数据模型定义
│   │   └── operations.ts         # CRUD操作
│   ├── cv/                       # 计算机视觉
│   │   ├── opencv-loader.ts      # OpenCV.js加载器
│   │   ├── edge-detection.ts     # 边缘检测
│   │   ├── perspective.ts        # 透视变换
│   │   └── filters.ts            # 图像滤镜
│   ├── export/                   # 导出功能
│   │   ├── pdf-generator.ts      # PDF生成
│   │   └── image-export.ts       # 图片导出
│   ├── utils/                    # 工具函数
│   │   ├── image-utils.ts        # 图片处理工具
│   │   ├── file-utils.ts         # 文件处理工具
│   │   └── format.ts             # 格式化工具
│   └── api/                      # API客户端
│       └── client.ts             # 安全API调用
│
├── hooks/                        # React Hooks
│   ├── useCamera.ts              # 相机控制
│   ├── useOpenCV.ts              # OpenCV操作
│   ├── useDocument.ts            # 文档操作
│   ├── useStorage.ts             # 存储操作
│   └── useExport.ts              # 导出操作
│
├── store/                        # Zustand状态管理
│   ├── index.ts                  # Store入口
│   ├── documentStore.ts          # 文档状态
│   ├── editorStore.ts            # 编辑器状态
│   └── appStore.ts               # 应用全局状态
│
├── workers/                      # Web Workers
│   └── opencv.worker.ts          # OpenCV处理Worker
│
├── types/                        # TypeScript类型
│   ├── document.ts               # 文档类型
│   ├── editor.ts                 # 编辑器类型
│   └── api.ts                    # API类型
│
├── public/                       # 静态资源
│   ├── opencv.js                 # OpenCV.js库
│   └── icons/                    # 图标资源
│
├── styles/                       # 样式文件
│   └── components/               # 组件样式
│
└── 配置文件
    ├── package.json
    ├── tsconfig.json
    ├── tailwind.config.ts
    ├── next.config.ts
    └── components.json           # shadcn/ui配置
```

## 核心代码骨架

### 1. 数据库 Schema

```typescript
// lib/db/schema.ts
import Dexie, { Table } from "dexie";

// 点坐标
export interface Point {
  x: number;
  y: number;
}

// 页面数据
export interface Page {
  id: string;
  documentId: string;
  originalBlob: Blob;
  processedBlob?: Blob;
  thumbnailBlob?: Blob;
  corners: [Point, Point, Point, Point] | null;
  filter: "original" | "grayscale" | "bw" | "enhanced";
  rotation: 0 | 90 | 180 | 270;
  order: number;
  createdAt: Date;
  updatedAt: Date;
}

// 文档数据
export interface Document {
  id: string;
  title: string;
  pageIds: string[];
  coverThumbnail?: Blob;
  pageCount: number;
  createdAt: Date;
  updatedAt: Date;
}

// 数据库类
export class ScannerDB extends Dexie {
  documents!: Table<Document>;
  pages!: Table<Page>;

  constructor() {
    super("ScannerDB");
    this.version(1).stores({
      documents: "id, title, updatedAt, createdAt",
      pages: "id, documentId, order",
    });
  }
}

export const db = new ScannerDB();
```

### 2. 状态管理 Store

```typescript
// store/documentStore.ts
import { create } from "zustand";
import { Document, Page } from "@/lib/db/schema";

interface DocumentState {
  // 状态
  documents: Document[];
  currentDocument: Document | null;
  currentPage: Page | null;
  isLoading: boolean;
  error: string | null;

  // 操作
  loadDocuments: () => Promise<void>;
  createDocument: (title: string) => Promise<Document>;
  deleteDocument: (id: string) => Promise<void>;
  setCurrentDocument: (doc: Document | null) => void;
  setCurrentPage: (page: Page | null) => void;
}

export const useDocumentStore = create<DocumentState>((set, get) => ({
  documents: [],
  currentDocument: null,
  currentPage: null,
  isLoading: false,
  error: null,

  loadDocuments: async () => {
    set({ isLoading: true, error: null });
    try {
      const docs = await db.documents.orderBy("updatedAt").reverse().toArray();
      set({ documents: docs, isLoading: false });
    } catch (err) {
      set({ error: "加载文档失败", isLoading: false });
    }
  },

  createDocument: async (title: string) => {
    const doc: Document = {
      id: nanoid(),
      title,
      pageIds: [],
      pageCount: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    await db.documents.add(doc);
    set((state) => ({ documents: [doc, ...state.documents] }));
    return doc;
  },

  deleteDocument: async (id: string) => {
    await db.documents.delete(id);
    await db.pages.where("documentId").equals(id).delete();
    set((state) => ({
      documents: state.documents.filter((d) => d.id !== id),
    }));
  },

  setCurrentDocument: (doc) => set({ currentDocument: doc }),
  setCurrentPage: (page) => set({ currentPage: page }),
}));
```

```typescript
// store/editorStore.ts
import { create } from "zustand";
import { Point } from "@/lib/db/schema";

type FilterType = "original" | "grayscale" | "bw" | "enhanced";

interface EditorState {
  // 图片状态
  originalImage: Blob | null;
  processedImage: Blob | null;

  // 边缘检测状态
  corners: [Point, Point, Point, Point] | null;
  isDetecting: boolean;
  detectionConfidence: number;

  // 滤镜状态
  filter: FilterType;
  brightness: number;
  contrast: number;
  sharpness: number;
  shadowRemoval: boolean;

  // 处理状态
  isProcessing: boolean;
  processingProgress: number;

  // 操作
  setOriginalImage: (blob: Blob) => void;
  setCorners: (corners: [Point, Point, Point, Point] | null) => void;
  setFilter: (filter: FilterType) => void;
  setBrightness: (value: number) => void;
  setContrast: (value: number) => void;
  setSharpness: (value: number) => void;
  setShadowRemoval: (enabled: boolean) => void;
  reset: () => void;
}

const initialState = {
  originalImage: null,
  processedImage: null,
  corners: null,
  isDetecting: false,
  detectionConfidence: 0,
  filter: "original" as FilterType,
  brightness: 0,
  contrast: 0,
  sharpness: 0,
  shadowRemoval: false,
  isProcessing: false,
  processingProgress: 0,
};

export const useEditorStore = create<EditorState>((set) => ({
  ...initialState,

  setOriginalImage: (blob) => set({ originalImage: blob }),
  setCorners: (corners) => set({ corners }),
  setFilter: (filter) => set({ filter }),
  setBrightness: (brightness) => set({ brightness }),
  setContrast: (contrast) => set({ contrast }),
  setSharpness: (sharpness) => set({ sharpness }),
  setShadowRemoval: (shadowRemoval) => set({ shadowRemoval }),
  reset: () => set(initialState),
}));
```

### 3. 核心 Hooks

```typescript
// hooks/useCamera.ts
import { useState, useCallback, useRef } from "react";

interface UseCameraReturn {
  stream: MediaStream | null;
  error: string | null;
  isLoading: boolean;
  startCamera: () => Promise<void>;
  stopCamera: () => void;
  captureImage: () => Promise<Blob | null>;
}

export function useCamera(): UseCameraReturn {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const startCamera = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "environment",
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
      });
      setStream(mediaStream);
    } catch (err) {
      setError(err instanceof Error ? err.message : "相机访问失败");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
  }, [stream]);

  const captureImage = useCallback(async (): Promise<Blob | null> => {
    if (!videoRef.current) return null;

    const canvas = document.createElement("canvas");
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;

    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    ctx.drawImage(videoRef.current, 0, 0);

    return new Promise((resolve) => {
      canvas.toBlob((blob) => resolve(blob), "image/jpeg", 0.9);
    });
  }, []);

  return { stream, error, isLoading, startCamera, stopCamera, captureImage };
}
```

```typescript
// hooks/useOpenCV.ts
import { useState, useCallback, useEffect, useRef } from "react";
import { loadOpenCV } from "@/lib/cv/opencv-loader";
import { detectDocumentEdges } from "@/lib/cv/edge-detection";
import { perspectiveTransform } from "@/lib/cv/perspective";
import { Point } from "@/lib/db/schema";

interface UseOpenCVReturn {
  isReady: boolean;
  isProcessing: boolean;
  error: string | null;
  detectEdges: (imageData: ImageData) => Promise<{
    corners: [Point, Point, Point, Point] | null;
    confidence: number;
  }>;
  transform: (
    imageData: ImageData,
    corners: [Point, Point, Point, Point],
  ) => Promise<ImageData>;
}

export function useOpenCV(): UseOpenCVReturn {
  const [isReady, setIsReady] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const workerRef = useRef<Worker | null>(null);

  useEffect(() => {
    loadOpenCV()
      .then(() => setIsReady(true))
      .catch((err) => setError(err.message));

    // 初始化Worker
    workerRef.current = new Worker(
      new URL("../workers/opencv.worker.ts", import.meta.url),
    );

    return () => {
      workerRef.current?.terminate();
    };
  }, []);

  const detectEdges = useCallback(
    async (imageData: ImageData) => {
      if (!isReady) throw new Error("OpenCV未就绪");
      setIsProcessing(true);
      try {
        return await detectDocumentEdges(imageData);
      } finally {
        setIsProcessing(false);
      }
    },
    [isReady],
  );

  const transform = useCallback(
    async (imageData: ImageData, corners: [Point, Point, Point, Point]) => {
      if (!isReady) throw new Error("OpenCV未就绪");
      setIsProcessing(true);
      try {
        return await perspectiveTransform(imageData, corners);
      } finally {
        setIsProcessing(false);
      }
    },
    [isReady],
  );

  return { isReady, isProcessing, error, detectEdges, transform };
}
```

### 4. 页面组件骨架

```typescript
// app/page.tsx (首页)
"use client";

import { useEffect } from "react";
import { useDocumentStore } from "@/store/documentStore";
import { DocumentGrid } from "@/components/document/DocumentGrid";
import { SearchBar } from "@/components/document/SearchBar";
import { EmptyState } from "@/components/shared/EmptyState";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import Link from "next/link";

export default function HomePage() {
  const { documents, isLoading, loadDocuments } = useDocumentStore();

  useEffect(() => {
    loadDocuments();
  }, [loadDocuments]);

  return (
    <div className="container mx-auto px-4 py-6">
      <header className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">我的文档</h1>
        <Link href="/scan">
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            新建扫描
          </Button>
        </Link>
      </header>

      <SearchBar className="mb-6" />

      {isLoading ? (
        <div>加载中...</div>
      ) : documents.length === 0 ? (
        <EmptyState
          title="暂无文档"
          description="点击右上角开始扫描第一份文档"
        />
      ) : (
        <DocumentGrid documents={documents} />
      )}
    </div>
  );
}
```

```typescript
// app/scan/page.tsx (扫描页)
"use client";

import { useState } from "react";
import { CameraView } from "@/components/capture/CameraView";
import { FileUploader } from "@/components/capture/FileUploader";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Camera, Upload } from "lucide-react";

export default function ScanPage() {
  const [activeTab, setActiveTab] = useState<"camera" | "upload">("camera");

  const handleImageCapture = async (blob: Blob) => {
    // 处理捕获的图片，跳转到编辑页
  };

  return (
    <div className="h-screen flex flex-col">
      <Tabs
        value={activeTab}
        onValueChange={(v) => setActiveTab(v as "camera" | "upload")}
        className="flex-1 flex flex-col"
      >
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="camera">
            <Camera className="w-4 h-4 mr-2" />
            拍照
          </TabsTrigger>
          <TabsTrigger value="upload">
            <Upload className="w-4 h-4 mr-2" />
            上传
          </TabsTrigger>
        </TabsList>

        <TabsContent value="camera" className="flex-1">
          <CameraView onCapture={handleImageCapture} />
        </TabsContent>

        <TabsContent value="upload" className="flex-1">
          <FileUploader onUpload={handleImageCapture} multiple />
        </TabsContent>
      </Tabs>
    </div>
  );
}
```

```typescript
// app/edit/[id]/crop/page.tsx (裁剪页)
"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useEditorStore } from "@/store/editorStore";
import { useOpenCV } from "@/hooks/useOpenCV";
import { ImageCanvas } from "@/components/editor/ImageCanvas";
import { CornerHandles } from "@/components/editor/CornerHandles";
import { ConfirmBar } from "@/components/editor/ConfirmBar";
import { blobToImageData } from "@/lib/utils/image-utils";

export default function CropPage() {
  const params = useParams();
  const router = useRouter();
  const { originalImage, corners, setCorners } = useEditorStore();
  const { isReady, detectEdges, transform } = useOpenCV();
  const [isDetecting, setIsDetecting] = useState(false);

  // 自动边缘检测
  useEffect(() => {
    if (!originalImage || !isReady) return;

    const detect = async () => {
      setIsDetecting(true);
      try {
        const imageData = await blobToImageData(originalImage);
        const result = await detectEdges(imageData);
        if (result.corners) {
          setCorners(result.corners);
        }
      } finally {
        setIsDetecting(false);
      }
    };

    detect();
  }, [originalImage, isReady, detectEdges, setCorners]);

  const handleConfirm = async () => {
    if (!originalImage || !corners) return;

    const imageData = await blobToImageData(originalImage);
    const transformed = await transform(imageData, corners);
    // 保存处理结果，跳转到增强页
    router.push(`/edit/${params.id}/enhance`);
  };

  return (
    <div className="h-screen flex flex-col">
      <div className="flex-1 relative">
        <ImageCanvas image={originalImage} />
        {corners && (
          <CornerHandles corners={corners} onChange={setCorners} />
        )}
        {isDetecting && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50">
            <span className="text-white">检测边缘中...</span>
          </div>
        )}
      </div>

      <ConfirmBar
        onCancel={() => router.back()}
        onConfirm={handleConfirm}
        confirmText="确认裁剪"
        disabled={!corners}
      />
    </div>
  );
}
```

### 5. 组件骨架

```typescript
// components/editor/CornerHandles.tsx
"use client";

import { useState, useCallback } from "react";
import { Point } from "@/lib/db/schema";

interface CornerHandlesProps {
  corners: [Point, Point, Point, Point];
  onChange: (corners: [Point, Point, Point, Point]) => void;
}

export function CornerHandles({ corners, onChange }: CornerHandlesProps) {
  const [dragging, setDragging] = useState<number | null>(null);

  const handleDragStart = useCallback((index: number) => {
    setDragging(index);
  }, []);

  const handleDragMove = useCallback(
    (e: React.PointerEvent) => {
      if (dragging === null) return;

      const rect = e.currentTarget.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width;
      const y = (e.clientY - rect.top) / rect.height;

      const newCorners = [...corners] as [Point, Point, Point, Point];
      newCorners[dragging] = {
        x: Math.max(0, Math.min(1, x)),
        y: Math.max(0, Math.min(1, y)),
      };
      onChange(newCorners);
    },
    [dragging, corners, onChange]
  );

  const handleDragEnd = useCallback(() => {
    setDragging(null);
  }, []);

  return (
    <div
      className="absolute inset-0"
      onPointerMove={handleDragMove}
      onPointerUp={handleDragEnd}
      onPointerLeave={handleDragEnd}
    >
      {/* 连接线 */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none">
        <polygon
          points={corners
            .map((c) => `${c.x * 100}%,${c.y * 100}%`)
            .join(" ")}
          fill="rgba(59, 130, 246, 0.2)"
          stroke="rgb(59, 130, 246)"
          strokeWidth="2"
        />
      </svg>

      {/* 角点 */}
      {corners.map((corner, index) => (
        <div
          key={index}
          className="absolute w-8 h-8 -translate-x-1/2 -translate-y-1/2
                     bg-blue-500 rounded-full border-2 border-white
                     cursor-grab active:cursor-grabbing touch-none"
          style={{
            left: `${corner.x * 100}%`,
            top: `${corner.y * 100}%`,
          }}
          onPointerDown={() => handleDragStart(index)}
        />
      ))}
    </div>
  );
}
```

```typescript
// components/document/DocumentCard.tsx
"use client";

import { Document } from "@/lib/db/schema";
import { Card, CardContent } from "@/components/ui/card";
import { formatDistanceToNow } from "date-fns";
import { zhCN } from "date-fns/locale";
import Link from "next/link";

interface DocumentCardProps {
  document: Document;
}

export function DocumentCard({ document }: DocumentCardProps) {
  return (
    <Link href={`/doc/${document.id}`}>
      <Card className="overflow-hidden hover:shadow-lg transition-shadow">
        <div className="aspect-[3/4] bg-gray-100 relative">
          {document.coverThumbnail ? (
            <img
              src={URL.createObjectURL(document.coverThumbnail)}
              alt={document.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-400">
              无预览
            </div>
          )}
          <div className="absolute bottom-2 right-2 bg-black/60 text-white
                          text-xs px-2 py-1 rounded">
            {document.pageCount} 页
          </div>
        </div>
        <CardContent className="p-3">
          <h3 className="font-medium truncate">{document.title}</h3>
          <p className="text-sm text-gray-500">
            {formatDistanceToNow(document.updatedAt, {
              addSuffix: true,
              locale: zhCN,
            })}
          </p>
        </CardContent>
      </Card>
    </Link>
  );
}
```

## 依赖清单

```json
{
  "dependencies": {
    "next": "^15.0.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "zustand": "^5.0.0",
    "dexie": "^4.0.0",
    "pdf-lib": "^1.17.1",
    "nanoid": "^5.0.0",
    "date-fns": "^3.0.0",
    "lucide-react": "^0.400.0",
    "clsx": "^2.1.0",
    "tailwind-merge": "^2.2.0",
    "@radix-ui/react-dialog": "^1.0.0",
    "@radix-ui/react-tabs": "^1.0.0",
    "@radix-ui/react-slider": "^1.0.0",
    "@radix-ui/react-toast": "^1.0.0"
  },
  "devDependencies": {
    "typescript": "^5.0.0",
    "tailwindcss": "^3.4.0",
    "autoprefixer": "^10.4.0",
    "postcss": "^8.4.0",
    "@types/react": "^19.0.0",
    "@types/node": "^22.0.0",
    "eslint": "^9.0.0",
    "eslint-config-next": "^15.0.0"
  }
}
```
