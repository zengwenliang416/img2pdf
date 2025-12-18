# 📄 Img2PDF - 智能文档扫描工具

> 一款基于浏览器的智能文档扫描工具，支持边缘检测、透视矫正、图像增强和 PDF 导出。

[![Next.js](https://img.shields.io/badge/Next.js-16.0-black?logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19.2-blue?logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?logo=typescript)](https://www.typescriptlang.org/)
[![License](https://img.shields.io/badge/License-MIT-green)](LICENSE)

## ✨ 功能特性

### 核心功能

- 🖼️ **智能图片导入** - 支持相机拍照、文件上传、批量导入（最多 10 张）
- 🔍 **自动边缘检测** - 基于 OpenCV.js 的智能文档边缘识别
- ✏️ **四点手动调整** - 精确拖拽调整文档四角位置
- 📐 **透视矫正** - 自动矫正倾斜文档，输出标准矩形图像
- 🎨 **多种图像滤镜** - 原图、灰度、黑白、增强、去阴影 5 种模式
- 📑 **多页文档管理** - 拖拽排序、批量选择、一键删除
- 🔄 **每页独立设置** - 支持每页单独设置滤镜、旋转角度、导出方向
- 📤 **灵活导出选项** - PDF（多页合并）、JPG（单张/批量打包 ZIP）

### 导出能力

| 导出格式 | 纸张尺寸                      | 质量设置      | 方向设置                  |
| -------- | ----------------------------- | ------------- | ------------------------- |
| PDF      | A4 / A5 / Letter / Legal / B5 | 50%-100% 可调 | 每页独立纵向/横向         |
| JPG      | -                             | 50%-100% 可调 | 支持旋转 0°/90°/180°/270° |
| ZIP      | -                             | 同 JPG        | 批量导出所有页            |

## 🚀 快速开始

### 环境要求

- Node.js 18.0+
- pnpm 8.0+（推荐）

### 安装步骤

```bash
# 克隆项目
git clone https://github.com/your-username/img2pdf.git
cd img2pdf

# 安装依赖
pnpm install

# 启动开发服务器
pnpm dev
```

打开浏览器访问 [http://localhost:3000](http://localhost:3000)

### 构建部署

```bash
# 构建生产版本
pnpm build

# 启动生产服务器
pnpm start
```

## 📖 使用指南

### 基本工作流程

```
上传图片 → 边缘检测 → 四点调整 → 确认裁剪 → 选择滤镜 → 导出 PDF/JPG
```

### 步骤详解

#### 1. 上传图片

- **拍照**: 点击「拍照」按钮，授权相机权限后拍摄文档
- **上传**: 点击「上传图片」，支持选择多张图片（最多 10 张）
- **拖放**: 直接将图片拖放到上传区域

#### 2. 边缘检测与调整

- 系统自动检测文档边缘并标记四个角点
- 如检测不准确，可拖动角点手动调整
- 点击「确认裁剪」进入下一步

#### 3. 滤镜与增强

- **原图**: 保持原始色彩
- **灰度**: 转为灰度图像
- **黑白**: 高对比度黑白效果
- **增强**: 自动调整对比度和亮度
- **去阴影**: 去除文档阴影，适合有光照不均的照片

#### 4. 页面管理

- 点击底部页面条切换不同页面
- 长按拖拽调整页面顺序
- 点击「页面管理」进行批量操作
- 每页可单独设置旋转角度（左转/右转 90°）和导出方向（纵向/横向）

#### 5. 导出文档

- **导出 PDF**: 所有页面合并为一个 PDF 文件
- **导出 JPG**: 导出当前页为 JPG 图片
- **导出全部 JPG**: 所有页面打包为 ZIP 下载

## 🛠️ 技术架构

### 技术栈

| 技术                                                                  | 版本 | 用途           |
| --------------------------------------------------------------------- | ---- | -------------- |
| [Next.js](https://nextjs.org/)                                        | 16.0 | React 全栈框架 |
| [React](https://react.dev/)                                           | 19.2 | UI 组件库      |
| [TypeScript](https://www.typescriptlang.org/)                         | 5.0  | 类型安全       |
| [Tailwind CSS](https://tailwindcss.com/)                              | 4.0  | 样式框架       |
| [Zustand](https://zustand-demo.pmnd.rs/)                              | 5.0  | 状态管理       |
| [OpenCV.js](https://docs.opencv.org/4.x/d5/d10/tutorial_js_root.html) | 4.x  | 图像处理       |
| [pdf-lib](https://pdf-lib.js.org/)                                    | 1.17 | PDF 生成       |
| [dnd-kit](https://dndkit.com/)                                        | 6.x  | 拖拽排序       |
| [JSZip](https://stuk.github.io/jszip/)                                | 3.10 | ZIP 打包       |

### 项目结构

```
img2pdf/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── layout.tsx          # 根布局
│   │   └── page.tsx            # 主页面
│   ├── components/             # React 组件
│   │   ├── ImageUpload.tsx     # 图片上传组件
│   │   ├── CornerEditor.tsx    # 四点编辑器
│   │   ├── FilterPanel.tsx     # 滤镜面板
│   │   ├── PageManager.tsx     # 页面管理器
│   │   ├── PageStrip.tsx       # 页面条
│   │   ├── ExportSettingsModal.tsx  # 导出设置弹窗
│   │   └── ProgressOverlay.tsx # 进度遮罩
│   ├── lib/
│   │   ├── opencv/             # OpenCV 相关
│   │   │   ├── detectEdges.ts      # 边缘检测
│   │   │   ├── perspectiveTransform.ts  # 透视变换
│   │   │   ├── imageFilters.ts     # 图像滤镜
│   │   │   └── ensureOpenCV.ts     # OpenCV 加载
│   │   ├── utils/
│   │   │   ├── exportPdf.ts    # PDF/JPG 导出
│   │   │   └── thumbnail.ts    # 缩略图生成
│   │   └── store.ts            # Zustand 状态管理
│   └── types/
│       └── opencv.d.ts         # OpenCV 类型定义
├── public/
│   └── opencv/                 # OpenCV.js 静态文件
├── docs/                       # 项目文档
└── package.json
```

### 核心模块说明

#### 状态管理 (`store.ts`)

使用 Zustand 管理全局状态，主要包括：

- `ScanStep`: 扫描步骤（upload → crop → filter → export）
- `ImageItem`: 图片项（原图、裁剪图、滤镜图、缩略图、旋转、方向等）
- `ExportSettings`: 导出设置（纸张尺寸、质量、边距）

#### 图像处理 (`lib/opencv/`)

- **边缘检测**: 使用 Canny 边缘检测 + 轮廓查找 + 四边形拟合
- **透视变换**: 四点透视矫正，将倾斜文档转为正视图
- **滤镜处理**: 灰度转换、二值化、对比度增强、阴影去除

#### 导出模块 (`lib/utils/exportPdf.ts`)

- 支持 JPEG 压缩和质量控制
- 支持每页独立旋转和方向
- 使用 pdf-lib 生成标准 PDF 文件
- 预估导出文件大小

## 📱 浏览器兼容性

| 平台    | 浏览器  | 最低版本 |
| ------- | ------- | -------- |
| Desktop | Chrome  | 90+      |
| Desktop | Safari  | 14+      |
| Desktop | Firefox | 88+      |
| Desktop | Edge    | 90+      |
| iOS     | Safari  | 14+      |
| Android | Chrome  | 90+      |

## ⚡ 性能指标

| 指标             | 目标值  | 测试条件              |
| ---------------- | ------- | --------------------- |
| 边缘检测耗时     | < 2s    | 12MP 图片，中高端设备 |
| 滤镜切换响应     | < 100ms | -                     |
| PDF 生成（10页） | < 5s    | -                     |
| 首屏加载         | < 3s    | 4G 网络               |

## 🔧 开发指南

### 常用命令

```bash
# 开发模式
pnpm dev

# 类型检查
pnpm lint

# 构建
pnpm build

# 生产模式
pnpm start
```

### 添加新滤镜

1. 在 `src/lib/opencv/imageFilters.ts` 中添加滤镜实现
2. 在 `src/lib/opencv/index.ts` 中导出 `FilterType`
3. 在 `src/components/FilterPanel.tsx` 中添加 UI 按钮

### 自定义纸张尺寸

在 `src/lib/store.ts` 中修改 `PAPER_SIZES` 常量：

```typescript
export const PAPER_SIZES: Record<
  PaperSize,
  { width: number; height: number; label: string }
> = {
  a4: { width: 595.28, height: 841.89, label: "A4" },
  // 添加新尺寸...
};
```

## 📄 许可证

本项目基于 [MIT 许可证](LICENSE) 开源。

## 🤝 贡献指南

欢迎提交 Issue 和 Pull Request！

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/amazing-feature`)
3. 提交更改 (`git commit -m 'feat: add amazing feature'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 创建 Pull Request

## 📮 联系方式

如有问题或建议，请通过以下方式联系：

- 提交 [Issue](https://github.com/your-username/img2pdf/issues)
- 发送邮件至 your-email@example.com

---

<p align="center">
  Made with ❤️ by <a href="https://github.com/your-username">Your Name</a>
</p>
