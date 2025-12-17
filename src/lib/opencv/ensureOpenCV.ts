/**
 * OpenCV.js 懒加载器
 * 确保 OpenCV 只加载一次，并提供超时和错误处理
 *
 * 关键修复：
 * 1. 返回包装对象 { cv } 而非直接返回 cv，避免 thenable 同化
 * 2. 将 promise 存储在 window 上，避免 HMR 重置
 * 3. 给 script 加 id 防止重复插入
 */

// OpenCV 模块类型（动态加载，使用 any 避免编译时类型检查）
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type OpenCVModule = any;

// 包装类型，避免 thenable 同化问题
export type OpenCVReady = { cv: OpenCVModule };

// 加载超时时间（毫秒）
const LOAD_TIMEOUT = 30000;

// 扩展 Window 类型
declare global {
  interface Window {
    cv: OpenCVModule;
    Module: {
      onRuntimeInitialized?: () => void;
      [key: string]: unknown;
    };
    __opencvReadyPromise?: Promise<OpenCVReady>;
  }
}

/**
 * 检查 OpenCV 是否已加载
 */
export function isOpenCVReady(): boolean {
  return typeof window !== "undefined" && window.cv?.Mat !== undefined;
}

/**
 * 确保 OpenCV 已加载
 * 返回包装对象 { cv } 而非直接返回 cv，避免 Promise thenable 同化问题
 */
export function ensureOpenCV(): Promise<OpenCVReady> {
  // 服务端渲染时直接拒绝
  if (typeof window === "undefined") {
    return Promise.reject(new Error("OpenCV 仅支持浏览器环境"));
  }

  // 如果已经加载完成，直接返回包装对象
  if (isOpenCVReady()) {
    console.log("[OpenCV] 已就绪，直接返回");
    return Promise.resolve({ cv: window.cv });
  }

  // 如果正在加载，返回存储在 window 上的 Promise（避免 HMR 重置）
  if (window.__opencvReadyPromise) {
    console.log("[OpenCV] 复用已有加载 Promise");
    return window.__opencvReadyPromise;
  }

  console.log("[OpenCV] 开始新加载流程...");

  // 创建新的加载 Promise
  window.__opencvReadyPromise = new Promise<OpenCVReady>((resolve, reject) => {
    // 设置超时
    const timeout = setTimeout(() => {
      console.error("[OpenCV] 加载超时");
      window.__opencvReadyPromise = undefined;
      reject(new Error(`OpenCV 加载超时（${LOAD_TIMEOUT / 1000}秒）`));
    }, LOAD_TIMEOUT);

    // 轮询检查 cv 是否就绪
    const poll = () => {
      if (window.cv?.Mat) {
        clearTimeout(timeout);
        console.log("[OpenCV] cv 对象已就绪");
        // 检查是否有 then 方法（可能导致 thenable 同化）
        if (typeof (window.cv as { then?: unknown }).then === "function") {
          console.warn("[OpenCV] 检测到 cv.then，使用包装对象避免同化");
        }
        // 返回包装对象，避免 thenable 同化！
        resolve({ cv: window.cv });
      } else {
        setTimeout(poll, 50);
      }
    };

    // 检查是否已经有 script 标签（避免 HMR 重复加载）
    if (!document.getElementById("opencv-js-script")) {
      // 设置 Module 回调
      window.Module = {
        ...window.Module,
        onRuntimeInitialized: () => {
          console.log("[OpenCV] onRuntimeInitialized 触发");
          // 立即开始轮询
          setTimeout(poll, 0);
        },
      };

      // 创建 script 标签
      const script = document.createElement("script");
      script.id = "opencv-js-script";
      script.src = "/opencv/opencv.js";
      script.async = true;

      script.onerror = () => {
        clearTimeout(timeout);
        window.__opencvReadyPromise = undefined;
        console.error("[OpenCV] 脚本加载失败");
        reject(new Error("OpenCV.js 加载失败，请检查文件是否存在"));
      };

      document.head.appendChild(script);
      console.log("[OpenCV] script 标签已添加");
    } else {
      console.log("[OpenCV] script 标签已存在，开始轮询");
      // script 已存在，直接开始轮询
      poll();
    }

    // 同时启动轮询（防止 onRuntimeInitialized 未触发的情况）
    poll();
  });

  return window.__opencvReadyPromise;
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
    loading: !!window.__opencvReadyPromise && !isOpenCVReady(),
  };
}
