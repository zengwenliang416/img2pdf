# 9. Top 5 风险与应对策略

## 风险概览

| 排名 | 风险项                 | 影响程度 | 发生概率 | 风险等级 |
| ---- | ---------------------- | -------- | -------- | -------- |
| 1    | OpenCV.js 性能与兼容性 | 高       | 中       | 🔴 高    |
| 2    | 移动端浏览器兼容性     | 高       | 中       | 🔴 高    |
| 3    | 大图片内存溢出         | 高       | 中       | 🟡 中高  |
| 4    | IndexedDB 存储限制     | 中       | 低       | 🟡 中    |
| 5    | PDF 导出质量与大小平衡 | 中       | 低       | 🟢 中低  |

---

## 风险 1：OpenCV.js 性能与兼容性

### 风险描述

OpenCV.js 基于 WebAssembly，在不同浏览器和设备上性能差异显著：

- **包体积大**：opencv.js 约 8MB，首次加载慢
- **WASM 兼容性**：部分老旧浏览器不支持
- **内存占用高**：处理大图时可能导致页面卡顿或崩溃
- **计算耗时**：低端设备边缘检测可能超过 5 秒

### 影响分析

| 场景         | 影响                         |
| ------------ | ---------------------------- |
| 首次加载     | 用户等待时间长，可能放弃使用 |
| 低端设备     | 处理速度慢，体验差           |
| 老旧浏览器   | 功能完全不可用               |
| 连续处理多图 | 内存累积，页面崩溃           |

### 应对策略

#### 策略 A：渐进式加载（推荐）

```typescript
// 延迟加载 OpenCV.js
const loadOpenCVLazy = () => {
  return new Promise((resolve, reject) => {
    // 显示加载进度
    const progressCallback = (progress: number) => {
      updateLoadingUI(progress);
    };

    // 使用 dynamic import 或 script 标签
    const script = document.createElement("script");
    script.src = "/opencv.js";
    script.onload = () => {
      cv["onRuntimeInitialized"] = resolve;
    };
    script.onerror = reject;
    document.head.appendChild(script);
  });
};

// 在用户点击"开始扫描"时才加载
const handleStartScan = async () => {
  if (!cvLoaded) {
    showLoadingDialog("正在加载扫描引擎...");
    await loadOpenCVLazy();
    cvLoaded = true;
  }
  // 继续扫描流程
};
```

#### 策略 B：功能降级

```typescript
// 检测设备能力
const checkDeviceCapability = (): "high" | "medium" | "low" => {
  const memory = (navigator as any).deviceMemory || 4; // GB
  const cores = navigator.hardwareConcurrency || 4;

  if (memory >= 4 && cores >= 4) return "high";
  if (memory >= 2 && cores >= 2) return "medium";
  return "low";
};

// 根据能力选择处理策略
const getProcessingStrategy = (capability: string) => {
  switch (capability) {
    case "high":
      return { maxSize: 4000, useWorker: true, algorithm: "full" };
    case "medium":
      return { maxSize: 2000, useWorker: true, algorithm: "simplified" };
    case "low":
      return { maxSize: 1080, useWorker: false, algorithm: "basic" };
  }
};
```

#### 策略 C：备选方案

如果 OpenCV.js 不可用，提供手动裁剪：

```typescript
const processImage = async (blob: Blob) => {
  try {
    // 尝试 OpenCV.js 自动检测
    const edges = await detectWithOpenCV(blob);
    return edges;
  } catch (err) {
    // 降级到手动模式
    console.warn("OpenCV不可用，使用手动模式");
    return {
      corners: getDefaultCorners(), // 返回默认全图边框
      mode: "manual",
      message: "请手动调整文档边缘",
    };
  }
};
```

### 验收指标

- [ ] 首次加载 OpenCV.js < 5s (4G 网络)
- [ ] 边缘检测 < 2s (中高端设备)
- [ ] 边缘检测 < 5s (低端设备)
- [ ] 低端设备有明确的降级方案
- [ ] 不支持 WASM 的浏览器有提示

---

## 风险 2：移动端浏览器兼容性

### 风险描述

移动端浏览器碎片化严重，主要问题：

- **相机 API 差异**：iOS Safari 与 Android Chrome 行为不同
- **触摸事件处理**：多点触控、手势识别复杂
- **Safari 限制**：WebRTC、IndexedDB 有特殊限制
- **PWA 支持度**：iOS PWA 功能受限

### 影响分析

| 平台            | 问题                          |
| --------------- | ----------------------------- |
| iOS Safari      | getUserMedia 需要用户交互触发 |
| iOS Safari      | IndexedDB 在 Private 模式受限 |
| Android WebView | 部分 API 不支持               |
| 微信内置浏览器  | 相机权限、下载行为受限        |

### 应对策略

#### 策略 A：浏览器特性检测

```typescript
// lib/browser-detect.ts
export const browserCapabilities = {
  hasCamera: async (): Promise<boolean> => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      return devices.some((d) => d.kind === "videoinput");
    } catch {
      return false;
    }
  },

  hasIndexedDB: (): boolean => {
    try {
      return !!window.indexedDB;
    } catch {
      return false;
    }
  },

  isPrivateMode: async (): Promise<boolean> => {
    // Safari Private Mode 检测
    try {
      const db = await window.indexedDB.open("test");
      db.close();
      return false;
    } catch {
      return true;
    }
  },

  isMobileDevice: (): boolean => {
    return /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
  },

  isWeChat: (): boolean => {
    return /MicroMessenger/i.test(navigator.userAgent);
  },
};
```

#### 策略 B：平台适配层

```typescript
// lib/platform-adapter.ts
import { browserCapabilities } from "./browser-detect";

export class PlatformAdapter {
  private static isWeChat = browserCapabilities.isWeChat();
  private static isMobile = browserCapabilities.isMobileDevice();

  // 相机启动适配
  static async startCamera(): Promise<MediaStream> {
    const constraints: MediaStreamConstraints = {
      video: this.isMobile
        ? { facingMode: "environment" }
        : { width: { ideal: 1920 } },
    };

    // 微信需要特殊处理
    if (this.isWeChat) {
      // 使用微信 JSSDK 或提示用户使用系统浏览器
      throw new Error("请在系统浏览器中打开以使用相机功能");
    }

    return navigator.mediaDevices.getUserMedia(constraints);
  }

  // 文件下载适配
  static downloadFile(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);

    if (this.isWeChat) {
      // 微信中显示长按保存提示
      showWeChatSaveDialog(url);
    } else if (this.isMobile) {
      // 移动端使用 share API
      if (navigator.share) {
        navigator.share({
          files: [new File([blob], filename)],
        });
      } else {
        // fallback 到普通下载
        triggerDownload(url, filename);
      }
    } else {
      triggerDownload(url, filename);
    }
  }
}
```

#### 策略 C：降级提示

```typescript
// components/BrowserCheck.tsx
export function BrowserCheck({ children }: { children: React.ReactNode }) {
  const [isSupported, setIsSupported] = useState<boolean | null>(null);
  const [issues, setIssues] = useState<string[]>([]);

  useEffect(() => {
    const checkBrowser = async () => {
      const problems: string[] = [];

      if (!(await browserCapabilities.hasCamera())) {
        problems.push("未检测到相机");
      }
      if (!browserCapabilities.hasIndexedDB()) {
        problems.push("浏览器不支持本地存储");
      }
      if (await browserCapabilities.isPrivateMode()) {
        problems.push("无痕模式下部分功能受限");
      }
      if (browserCapabilities.isWeChat()) {
        problems.push("微信浏览器功能受限，建议使用系统浏览器");
      }

      setIssues(problems);
      setIsSupported(problems.length === 0);
    };

    checkBrowser();
  }, []);

  if (isSupported === null) return <Loading />;

  if (!isSupported) {
    return (
      <div className="p-6 text-center">
        <h2 className="text-xl font-bold mb-4">浏览器兼容性提示</h2>
        <ul className="text-left mb-4">
          {issues.map((issue, i) => (
            <li key={i} className="text-amber-600">
              ⚠️ {issue}
            </li>
          ))}
        </ul>
        <p>建议使用最新版 Chrome、Safari 或 Edge 浏览器</p>
      </div>
    );
  }

  return <>{children}</>;
}
```

### 验收指标

- [ ] iOS Safari 14+ 核心功能正常
- [ ] Android Chrome 90+ 核心功能正常
- [ ] 不支持的环境有明确提示
- [ ] 微信内置浏览器有引导提示

---

## 风险 3：大图片内存溢出

### 风险描述

处理高分辨率图片（12MP+）时：

- **内存占用**：单张 12MP RGBA 图片约 48MB 内存
- **Canvas 限制**：部分设备 Canvas 尺寸有上限
- **多图累积**：批量处理时内存持续增长
- **Worker 通信**：ImageData 传输产生额外内存开销

### 影响分析

| 场景                           | 内存占用估算     |
| ------------------------------ | ---------------- |
| 单张 12MP                      | ~50MB            |
| 处理流程（原图+缩略图+处理后） | ~150MB           |
| 10 张批量处理                  | ~500MB+          |
| iOS Safari                     | 超过限制直接崩溃 |

### 应对策略

#### 策略 A：图片尺寸控制

```typescript
// lib/image-resize.ts
const MAX_DIMENSION = 4096; // 最大边长
const THUMBNAIL_SIZE = 1080; // 缩略图用于检测

export async function resizeIfNeeded(
  blob: Blob,
  maxDimension: number = MAX_DIMENSION,
): Promise<Blob> {
  const img = await createImageBitmap(blob);
  const { width, height } = img;

  // 如果不超限，直接返回
  if (width <= maxDimension && height <= maxDimension) {
    return blob;
  }

  // 计算缩放比例
  const scale = maxDimension / Math.max(width, height);
  const newWidth = Math.round(width * scale);
  const newHeight = Math.round(height * scale);

  // 使用 OffscreenCanvas 减少主线程负担
  const canvas = new OffscreenCanvas(newWidth, newHeight);
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(img, 0, 0, newWidth, newHeight);

  return canvas.convertToBlob({ type: "image/jpeg", quality: 0.9 });
}
```

#### 策略 B：及时释放内存

```typescript
// lib/memory-manager.ts
export class MemoryManager {
  private urlCache: Set<string> = new Set();

  // 创建 URL 并追踪
  createObjectURL(blob: Blob): string {
    const url = URL.createObjectURL(blob);
    this.urlCache.add(url);
    return url;
  }

  // 释放单个 URL
  revokeObjectURL(url: string): void {
    URL.revokeObjectURL(url);
    this.urlCache.delete(url);
  }

  // 释放所有追踪的 URL
  revokeAll(): void {
    this.urlCache.forEach((url) => URL.revokeObjectURL(url));
    this.urlCache.clear();
  }

  // OpenCV Mat 释放包装
  withMat<T>(fn: (mats: cv.Mat[]) => T): T {
    const mats: cv.Mat[] = [];
    const originalMat = cv.Mat;

    // 包装 Mat 构造器追踪创建
    cv.Mat = function (...args: any[]) {
      const mat = new originalMat(...args);
      mats.push(mat);
      return mat;
    } as any;

    try {
      return fn(mats);
    } finally {
      // 释放所有创建的 Mat
      mats.forEach((mat) => mat.delete());
      cv.Mat = originalMat;
    }
  }
}

export const memoryManager = new MemoryManager();
```

#### 策略 C：分批处理

```typescript
// lib/batch-processor.ts
export async function processBatch(
  blobs: Blob[],
  processor: (blob: Blob) => Promise<Blob>,
  options: { concurrency?: number; onProgress?: (n: number) => void } = {},
): Promise<Blob[]> {
  const { concurrency = 2, onProgress } = options;
  const results: Blob[] = [];

  for (let i = 0; i < blobs.length; i += concurrency) {
    const batch = blobs.slice(i, i + concurrency);
    const processed = await Promise.all(batch.map(processor));
    results.push(...processed);

    // 强制触发 GC（如果可用）
    if ("gc" in window) {
      (window as any).gc();
    }

    onProgress?.(results.length);

    // 给浏览器喘息时间
    await new Promise((r) => setTimeout(r, 100));
  }

  return results;
}
```

### 验收指标

- [ ] 单张 12MP 图片处理不崩溃
- [ ] 10 张批量处理内存峰值 < 500MB
- [ ] 处理完成后内存正确释放
- [ ] iOS Safari 不触发内存警告

---

## 风险 4：IndexedDB 存储限制

### 风险描述

- **存储配额**：不同浏览器配额差异大（50MB~无限）
- **Safari 限制**：7 天未访问可能被清除
- **写入性能**：大 Blob 写入可能阻塞
- **事务限制**：复杂操作可能超时

### 应对策略

#### 策略 A：存储配额管理

```typescript
// lib/storage-quota.ts
export async function checkStorageQuota(): Promise<{
  used: number;
  available: number;
  percent: number;
}> {
  if ("storage" in navigator && "estimate" in navigator.storage) {
    const { usage, quota } = await navigator.storage.estimate();
    return {
      used: usage || 0,
      available: (quota || 0) - (usage || 0),
      percent: ((usage || 0) / (quota || 1)) * 100,
    };
  }
  return { used: 0, available: Infinity, percent: 0 };
}

export async function requestPersistentStorage(): Promise<boolean> {
  if ("storage" in navigator && "persist" in navigator.storage) {
    return navigator.storage.persist();
  }
  return false;
}
```

#### 策略 B：自动清理策略

```typescript
// lib/auto-cleanup.ts
export async function cleanupOldDocuments(
  keepDays: number = 30,
  keepMinimum: number = 10,
): Promise<number> {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - keepDays);

  const oldDocs = await db.documents
    .where("updatedAt")
    .below(cutoffDate)
    .toArray();

  // 保留最少数量
  const currentCount = await db.documents.count();
  if (currentCount - oldDocs.length < keepMinimum) {
    return 0;
  }

  let deletedCount = 0;
  for (const doc of oldDocs) {
    await db.pages.where("documentId").equals(doc.id).delete();
    await db.documents.delete(doc.id);
    deletedCount++;
  }

  return deletedCount;
}
```

### 验收指标

- [ ] 存储配额显示正确
- [ ] 超出配额时有提示
- [ ] 自动清理功能可用
- [ ] Safari 持久化存储已申请

---

## 风险 5：PDF 导出质量与大小平衡

### 风险描述

- **文件过大**：高质量 PDF 可能达到数十 MB
- **质量损失**：压缩过度导致文字模糊
- **生成速度**：多页高分辨率 PDF 生成慢

### 应对策略

#### 策略：智能压缩

```typescript
// lib/smart-compress.ts
export interface CompressionPreset {
  name: string;
  quality: number;
  maxDimension: number;
  estimatedSizePerPage: number; // KB
}

export const COMPRESSION_PRESETS: CompressionPreset[] = [
  {
    name: "高质量",
    quality: 0.92,
    maxDimension: 2480,
    estimatedSizePerPage: 500,
  },
  {
    name: "标准",
    quality: 0.85,
    maxDimension: 1754,
    estimatedSizePerPage: 200,
  },
  {
    name: "小文件",
    quality: 0.75,
    maxDimension: 1240,
    estimatedSizePerPage: 100,
  },
];

export function recommendPreset(pageCount: number): CompressionPreset {
  // 目标：最终 PDF < 10MB
  const targetSizeKB = 10 * 1024;
  const targetPerPage = targetSizeKB / pageCount;

  return (
    COMPRESSION_PRESETS.find((p) => p.estimatedSizePerPage <= targetPerPage) ||
    COMPRESSION_PRESETS[COMPRESSION_PRESETS.length - 1]
  );
}
```

### 验收指标

- [ ] 10 页 PDF 生成 < 5s
- [ ] 提供多种质量选项
- [ ] 导出前显示预估大小
- [ ] 高质量导出文字清晰可读

---

## 风险监控看板

### 开发阶段监控项

```typescript
// lib/risk-monitor.ts (开发环境使用)
export const riskMonitor = {
  // 性能监控
  measurePerformance: async (name: string, fn: () => Promise<any>) => {
    const start = performance.now();
    const result = await fn();
    const duration = performance.now() - start;
    console.log(`[Perf] ${name}: ${duration.toFixed(2)}ms`);
    return result;
  },

  // 内存监控
  logMemoryUsage: () => {
    if ("memory" in performance) {
      const { usedJSHeapSize, totalJSHeapSize } = (performance as any).memory;
      console.log(
        `[Memory] ${(usedJSHeapSize / 1024 / 1024).toFixed(2)}MB / ${(totalJSHeapSize / 1024 / 1024).toFixed(2)}MB`,
      );
    }
  },

  // 存储监控
  logStorageUsage: async () => {
    const quota = await checkStorageQuota();
    console.log(
      `[Storage] ${(quota.used / 1024 / 1024).toFixed(2)}MB used (${quota.percent.toFixed(1)}%)`,
    );
  },
};
```

### 关键指标阈值

| 指标             | 警告阈值 | 严重阈值 |
| ---------------- | -------- | -------- |
| 边缘检测耗时     | > 3s     | > 5s     |
| 内存占用         | > 300MB  | > 500MB  |
| IndexedDB 使用率 | > 70%    | > 90%    |
| PDF 生成耗时     | > 8s     | > 15s    |
| 首屏加载时间     | > 4s     | > 6s     |
