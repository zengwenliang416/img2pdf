/**
 * OpenCV.js 懒加载器
 * 确保 OpenCV 只加载一次，并提供超时和错误处理
 */

// OpenCV 模块类型（动态加载，使用 any 避免编译时类型检查）
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type OpenCVModule = any;

// 加载状态
let cvPromise: Promise<OpenCVModule> | null = null;
let isLoading = false;

// 加载超时时间（毫秒）
const LOAD_TIMEOUT = 30000;

/**
 * 检查 OpenCV 是否已加载
 */
export function isOpenCVReady(): boolean {
  return typeof window !== "undefined" && window.cv?.Mat !== undefined;
}

/**
 * 确保 OpenCV 已加载
 * 如果已加载则直接返回，否则异步加载
 */
export function ensureOpenCV(): Promise<OpenCVModule> {
  // 服务端渲染时直接拒绝
  if (typeof window === "undefined") {
    return Promise.reject(new Error("OpenCV 仅支持浏览器环境"));
  }

  // 如果已经加载完成，直接返回
  if (isOpenCVReady()) {
    return Promise.resolve(window.cv);
  }

  // 如果正在加载，返回现有 Promise
  if (cvPromise) {
    return cvPromise;
  }

  // 开始加载
  isLoading = true;
  cvPromise = new Promise((resolve, reject) => {
    // 设置超时
    const timeout = setTimeout(() => {
      isLoading = false;
      cvPromise = null;
      reject(new Error(`OpenCV 加载超时（${LOAD_TIMEOUT / 1000}秒）`));
    }, LOAD_TIMEOUT);

    // 设置初始化回调
    window.Module = {
      onRuntimeInitialized: () => {
        clearTimeout(timeout);
        isLoading = false;
        console.log("[OpenCV] 初始化完成");
        // 使用 setTimeout 让事件循环有机会处理，避免阻塞
        setTimeout(() => {
          console.log("[OpenCV] 延迟 resolve");
          resolve(window.cv);
        }, 100);
      },
    };

    // 动态创建 script 标签
    const script = document.createElement("script");
    script.src = "/opencv/opencv.js";
    script.async = true;

    script.onerror = () => {
      clearTimeout(timeout);
      isLoading = false;
      cvPromise = null;
      reject(new Error("OpenCV.js 加载失败，请检查文件是否存在"));
    };

    document.head.appendChild(script);
    console.log("[OpenCV] 开始加载...");
  });

  return cvPromise;
}

/**
 * 获取加载状态
 */
export function getOpenCVStatus(): {
  ready: boolean;
  loading: boolean;
} {
  return {
    ready: isOpenCVReady(),
    loading: isLoading,
  };
}
