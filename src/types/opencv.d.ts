/**
 * OpenCV.js 类型声明
 * 仅包含本项目使用的核心类型
 */

declare global {
  interface Window {
    cv: typeof cv;
    Module: {
      onRuntimeInitialized: () => void;
    };
  }
}

declare namespace cv {
  // 核心矩阵类型
  class Mat {
    constructor();
    constructor(rows: number, cols: number, type: number);
    constructor(rows: number, cols: number, type: number, scalar: Scalar);
    rows: number;
    cols: number;
    data: Uint8Array;
    data32F: Float32Array;
    delete(): void;
    clone(): Mat;
    copyTo(dst: Mat): void;
    setTo(value: Scalar): Mat;
    size(): Size;
    type(): number;
    channels(): number;
    empty(): boolean;
    roi(rect: Rect): Mat;
    ucharPtr(row: number, col: number): Uint8Array;
    floatPtr(row: number, col: number): Float32Array;
  }

  class MatVector {
    constructor();
    size(): number;
    get(index: number): Mat;
    push_back(mat: Mat): void;
    delete(): void;
  }

  class Scalar {
    constructor(v0: number, v1?: number, v2?: number, v3?: number);
  }

  class Point {
    constructor(x: number, y: number);
    x: number;
    y: number;
  }

  class Size {
    constructor(width: number, height: number);
    width: number;
    height: number;
  }

  class Rect {
    constructor(x: number, y: number, width: number, height: number);
    x: number;
    y: number;
    width: number;
    height: number;
  }

  // 图像读写
  function imread(canvas: HTMLCanvasElement | HTMLImageElement): Mat;
  function imshow(canvas: HTMLCanvasElement | string, mat: Mat): void;

  // 颜色转换
  function cvtColor(src: Mat, dst: Mat, code: number): void;
  const COLOR_RGBA2GRAY: number;
  const COLOR_GRAY2RGBA: number;
  const COLOR_RGBA2RGB: number;
  const COLOR_RGB2RGBA: number;
  const COLOR_BGR2GRAY: number;
  const COLOR_GRAY2BGR: number;
  const COLOR_BGR2RGB: number;
  const COLOR_RGB2BGR: number;

  // 图像滤波
  function GaussianBlur(
    src: Mat,
    dst: Mat,
    ksize: Size,
    sigmaX: number,
    sigmaY?: number,
  ): void;
  function bilateralFilter(
    src: Mat,
    dst: Mat,
    d: number,
    sigmaColor: number,
    sigmaSpace: number,
  ): void;
  function medianBlur(src: Mat, dst: Mat, ksize: number): void;

  // 边缘检测
  function Canny(
    src: Mat,
    dst: Mat,
    threshold1: number,
    threshold2: number,
    apertureSize?: number,
  ): void;

  // 形态学操作
  function dilate(
    src: Mat,
    dst: Mat,
    kernel: Mat,
    anchor?: Point,
    iterations?: number,
  ): void;
  function erode(
    src: Mat,
    dst: Mat,
    kernel: Mat,
    anchor?: Point,
    iterations?: number,
  ): void;
  function morphologyEx(src: Mat, dst: Mat, op: number, kernel: Mat): void;
  function getStructuringElement(shape: number, ksize: Size): Mat;
  const MORPH_RECT: number;
  const MORPH_ELLIPSE: number;
  const MORPH_CROSS: number;
  const MORPH_CLOSE: number;
  const MORPH_OPEN: number;
  const MORPH_GRADIENT: number;

  // 轮廓检测
  function findContours(
    image: Mat,
    contours: MatVector,
    hierarchy: Mat,
    mode: number,
    method: number,
  ): void;
  function contourArea(contour: Mat): number;
  function arcLength(curve: Mat, closed: boolean): number;
  function approxPolyDP(
    curve: Mat,
    approxCurve: Mat,
    epsilon: number,
    closed: boolean,
  ): void;
  function drawContours(
    image: Mat,
    contours: MatVector,
    contourIdx: number,
    color: Scalar,
    thickness?: number,
  ): void;

  const RETR_EXTERNAL: number;
  const RETR_LIST: number;
  const RETR_CCOMP: number;
  const RETR_TREE: number;
  const CHAIN_APPROX_SIMPLE: number;
  const CHAIN_APPROX_NONE: number;

  // 透视变换
  function getPerspectiveTransform(src: Mat, dst: Mat): Mat;
  function warpPerspective(
    src: Mat,
    dst: Mat,
    M: Mat,
    dsize: Size,
    flags?: number,
    borderMode?: number,
    borderValue?: Scalar,
  ): void;

  const INTER_LINEAR: number;
  const INTER_CUBIC: number;
  const INTER_NEAREST: number;
  const BORDER_CONSTANT: number;
  const BORDER_REPLICATE: number;

  // 阈值处理
  function threshold(
    src: Mat,
    dst: Mat,
    thresh: number,
    maxval: number,
    type: number,
  ): number;
  function adaptiveThreshold(
    src: Mat,
    dst: Mat,
    maxValue: number,
    adaptiveMethod: number,
    thresholdType: number,
    blockSize: number,
    C: number,
  ): void;

  const THRESH_BINARY: number;
  const THRESH_BINARY_INV: number;
  const THRESH_OTSU: number;
  const ADAPTIVE_THRESH_MEAN_C: number;
  const ADAPTIVE_THRESH_GAUSSIAN_C: number;

  // 矩阵类型
  const CV_8U: number;
  const CV_8UC1: number;
  const CV_8UC3: number;
  const CV_8UC4: number;
  const CV_32F: number;
  const CV_32FC1: number;
  const CV_32FC2: number;

  // 矩阵操作
  function matFromArray(
    rows: number,
    cols: number,
    type: number,
    array: number[],
  ): Mat;
  function matFromImageData(imageData: ImageData): Mat;

  // 图像增强
  function convertScaleAbs(
    src: Mat,
    dst: Mat,
    alpha?: number,
    beta?: number,
  ): void;
  function normalize(
    src: Mat,
    dst: Mat,
    alpha: number,
    beta: number,
    normType: number,
  ): void;
  const NORM_MINMAX: number;

  // 直方图
  function equalizeHist(src: Mat, dst: Mat): void;
  function calcHist(
    images: MatVector,
    channels: number[],
    mask: Mat,
    hist: Mat,
    histSize: number[],
    ranges: number[],
  ): void;

  // 图像混合
  function addWeighted(
    src1: Mat,
    alpha: number,
    src2: Mat,
    beta: number,
    gamma: number,
    dst: Mat,
  ): void;
  function add(src1: Mat, src2: Mat, dst: Mat): void;
  function subtract(src1: Mat, src2: Mat, dst: Mat): void;
  function multiply(src1: Mat, src2: Mat, dst: Mat): void;

  // 图像缩放
  function resize(
    src: Mat,
    dst: Mat,
    dsize: Size,
    fx?: number,
    fy?: number,
    interpolation?: number,
  ): void;

  // 图像翻转/旋转
  function flip(src: Mat, dst: Mat, flipCode: number): void;
  function rotate(src: Mat, dst: Mat, rotateCode: number): void;
  const ROTATE_90_CLOCKWISE: number;
  const ROTATE_180: number;
  const ROTATE_90_COUNTERCLOCKWISE: number;

  // 通道操作
  function split(src: Mat, mv: MatVector): void;
  function merge(mv: MatVector, dst: Mat): void;
  function mixChannels(src: MatVector, dst: MatVector, fromTo: number[]): void;

  // Mat.intPtr 方法（用于读取整数数据）
  interface Mat {
    intPtr(row: number, col: number): Int32Array;
  }
}

// 导出 OpenCV 模块类型
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type OpenCV = typeof cv;

export {};
