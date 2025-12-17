# 2. MVP 范围与验收标准

## 功能范围定义

### 必须实现 (Must Have)

- [x] 图片导入（相机/上传/批量）
- [x] 边缘检测与四点调整
- [x] 透视矫正与裁剪
- [x] 图像增强（3种滤镜+去阴影）
- [x] 多页文档管理
- [x] PDF/JPG导出
- [x] 文档列表与搜索

### 应该实现 (Should Have)

- [ ] OCR文字识别
- [ ] 分享链接生成

### 可以实现 (Could Have)

- [ ] 云端同步
- [ ] 文件夹分类
- [ ] 批量打包ZIP

### 不实现 (Won't Have)

- 用户账号系统
- 付费功能
- 实时协作

---

## 验收标准 (Given/When/Then)

### F1: 图片导入

```gherkin
Scenario: 手机相机拍照导入
  Given 用户在移动端浏览器打开应用
  When 用户点击"拍照"按钮并授权相机权限
  Then 应打开相机取景界面
  And 拍照后图片应自动进入编辑流程

Scenario: 桌面文件上传
  Given 用户在桌面浏览器打开应用
  When 用户点击"上传"并选择1-10张图片
  Then 所有图片应在3秒内加载完成
  And 显示批量处理进度条

Scenario: 批量导入限制
  Given 用户选择超过10张图片
  When 系统检测到超限
  Then 应提示"单次最多导入10张，已选择前10张"
```

### F2: 边缘检测与调整

```gherkin
Scenario: 自动边缘检测
  Given 用户导入一张包含文档的图片
  When 图片加载完成后
  Then 应在2秒内自动检测并标记文档四角
  And 显示四个可拖动的角点控制器

Scenario: 手动四点调整
  Given 自动检测的边缘不准确
  When 用户拖动任一角点
  Then 角点位置应实时更新
  And 预览区域应实时显示透视变换效果

Scenario: 检测失败降级
  Given 图片中无明显文档边缘
  When 自动检测失败
  Then 应显示默认全图边框
  And 提示"未检测到文档边缘，请手动调整"
```

### F3: 透视矫正与裁剪

```gherkin
Scenario: 透视矫正
  Given 用户确认四个角点位置
  When 用户点击"确认裁剪"
  Then 应执行透视变换
  And 输出矩形文档图像

Scenario: 输出比例选择
  Given 用户完成裁剪
  When 用户选择"A4比例"
  Then 输出图像应按A4比例(1:√2)裁剪
  When 用户选择"原比例"
  Then 保持检测到的文档原始比例
```

### F4: 图像增强

```gherkin
Scenario: 滤镜切换
  Given 用户在编辑界面
  When 用户点击"灰度"滤镜
  Then 图片应立即切换为灰度显示
  And 其他滤镜按钮显示未选中状态

Scenario: 去阴影增强
  Given 图片有明显阴影
  When 用户启用"去阴影"开关
  Then 应在1秒内完成阴影去除
  And 文字区域对比度应明显提升

Scenario: 清晰度增强
  Given 图片略模糊
  When 用户调整"清晰度"滑块
  Then 图片锐度应实时变化
  And 滑块值范围0-100
```

### F5: 多页文档管理

```gherkin
Scenario: 添加页面
  Given 用户已有1页文档
  When 用户点击"添加页面"
  Then 应打开导入界面
  And 新页面应添加到末尾

Scenario: 页面排序
  Given 文档有3个页面
  When 用户长按并拖动第3页到第1位
  Then 页面顺序应更新为3,1,2

Scenario: 删除页面
  Given 文档有多个页面
  When 用户点击某页的删除按钮并确认
  Then 该页面应从文档移除
  And 页码应重新编号
```

### F6: 导出

```gherkin
Scenario: 导出多页PDF
  Given 文档有3个页面
  When 用户点击"导出PDF"
  Then 应生成包含3页的PDF文件
  And PDF大小应≤原图总大小
  And 触发浏览器下载

Scenario: 导出单页JPG
  Given 用户选中某一页
  When 用户点击"导出JPG"
  Then 应下载该页的JPG文件
  And 质量应≥85%
```

### F7: 文档管理

```gherkin
Scenario: 文档列表展示
  Given 用户有5份已保存文档
  When 用户进入文档列表页
  Then 应按修改时间倒序显示所有文档
  And 每个文档显示缩略图、标题、日期

Scenario: 搜索文档
  Given 用户在搜索框输入"合同"
  When 输入后500ms
  Then 应过滤显示标题包含"合同"的文档
```

---

## 性能验收标准

| 指标            | 目标值  | 测试环境             |
| --------------- | ------- | -------------------- |
| 边缘检测耗时    | < 2s    | 12MP图片，中高端设备 |
| 滤镜切换响应    | < 100ms | -                    |
| PDF生成（10页） | < 5s    | -                    |
| 首屏加载        | < 3s    | 4G网络               |
| IndexedDB写入   | < 500ms | 单页保存             |

## 兼容性验收标准

| 平台    | 浏览器  | 最低版本 |
| ------- | ------- | -------- |
| Desktop | Chrome  | 90+      |
| Desktop | Safari  | 14+      |
| Desktop | Firefox | 88+      |
| Desktop | Edge    | 90+      |
| iOS     | Safari  | 14+      |
| Android | Chrome  | 90+      |
