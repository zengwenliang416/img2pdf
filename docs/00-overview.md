# 扫描全能王 Web MVP 完整方案

## 项目概述

类似"扫描全能王"的网页应用 MVP，支持文档扫描、边缘检测、透视矫正、图像增强、PDF导出等核心功能。

## 技术栈决策

| 技术领域 | 选择                         | 替代方案        | 选择理由                               |
| -------- | ---------------------------- | --------------- | -------------------------------------- |
| 前端框架 | **Next.js 15 (App Router)**  | Nuxt.js         | 图像处理生态更成熟，TypeScript支持优秀 |
| 边缘检测 | **OpenCV.js (WASM)**         | TensorFlow.js   | 算法成熟，文档丰富，性能好             |
| PDF导出  | **pdf-lib**                  | jsPDF           | 专业级PDF操作，支持压缩                |
| 本地存储 | **Dexie.js (IndexedDB)**     | localForage     | 类型安全，API简洁                      |
| 状态管理 | **Zustand**                  | Jotai, Redux    | 轻量，无样板代码                       |
| UI组件   | **Tailwind CSS + shadcn/ui** | MUI, Ant Design | 高度可定制，体积小                     |

## 文档索引

| 章节 | 文件                                                               | 内容描述              | 状态 |
| ---- | ------------------------------------------------------------------ | --------------------- | ---- |
| 1    | [01-competitor-analysis.md](./01-competitor-analysis.md)           | 竞品工作流拆解        | ✅   |
| 2    | [02-mvp-scope.md](./02-mvp-scope.md)                               | MVP范围与验收标准     | ✅   |
| 3    | [03-information-architecture.md](./03-information-architecture.md) | 信息架构与用户流程    | ✅   |
| 4    | [04-technical-architecture.md](./04-technical-architecture.md)     | 技术架构（前后端）    | ✅   |
| 5    | [05-image-algorithms.md](./05-image-algorithms.md)                 | 图像算法落地方案      | ✅   |
| 6    | [06-security-compliance.md](./06-security-compliance.md)           | 安全与合规            | ✅   |
| 7    | [07-milestones.md](./07-milestones.md)                             | 里程碑计划            | ✅   |
| 8    | [08-code-skeleton.md](./08-code-skeleton.md)                       | 代码骨架与目录结构    | ✅   |
| 9    | [09-risk-analysis.md](./09-risk-analysis.md)                       | Top 5 风险与应对策略  | ✅   |
| 10   | [10-demo-version.md](./10-demo-version.md)                         | 1天可跑通的演示版方案 | ✅   |

## 核心功能清单

### MVP 必须功能

1. **导入**：手机相机拍照 + 桌面上传，多张批量
2. **扫描编辑**：自动检测文档边缘（可手动四点调整）
3. **透视矫正与裁剪**：输出规整文档视图（A4/原比例可选）
4. **图像增强**：3种滤镜（原色/灰度/黑白），含去阴影/增清晰度
5. **多页文档**：排序、删除、重命名、合并为一份文档
6. **导出**：多页 PDF + 单页 JPG
7. **文档管理**：列表页、搜索标题、查看详情

### 后端增强功能（可选）

- OCR：中英识别，返回结构化结果
- 分享：生成分享链接（可设置过期/权限）
- 存储：上传到对象存储

## 硬性约束

- **隐私**：默认不上传，任何上传必须显式提示
- **性能**：12MP 单页处理目标 < 2 秒
- **兼容**：Chrome/Safari 最新版；iOS/Android 浏览器
