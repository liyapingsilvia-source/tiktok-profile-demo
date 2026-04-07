# 个人页背景上传引导 — 方案2 头像吸色渐变 技术规格

## 概述

用户首次进入个人页时，页面顶部背景区域显示基于用户头像主色调的流动渐变效果，配合 Tooltip 提示"Tap to upload background"，引导用户上传个人页背景图。

## 效果预览

解压 `profile-onboarding-demo.zip`，直接在浏览器打开 `profile-onboarding.html`，左下角控制面板选择：
- 方案2：渐变背景引导
- 勾选「头像吸色渐变」
- 取消勾选「Toast」以查看 Tooltip 样式

---

## 1. 头像取色算法

### 输入
用户头像图片（任意尺寸）

### 处理流程

```
1. 将头像绘制到离屏 Canvas
2. 获取全部像素数据 (RGBA)
3. 每隔 4 个像素采样一次（性能优化）
4. 跳过透明像素 (alpha < 128)
5. 筛选蓝色倾向像素：blue > red AND blue > green
6. 取 blue 分量最大的像素 → 基准色 (R, G, B)
7. 增强蓝色调：
   - R = max(0, R - 30)
   - G = max(0, G - 20)
   - B = min(255, B + 30)
8. 输出最终颜色 (R, G, B)
```

### 兜底策略
- 头像加载失败 → 使用默认蓝色 `rgb(60, 100, 220)`
- 头像无蓝色倾向像素 → 使用初始值 `rgb(100, 140, 200)` 经增强后为 `rgb(70, 120, 230)`

### 移动端实现建议
| 平台 | 推荐 API |
|------|----------|
| iOS | `UIImage` → `CGContext` 像素采样，或 `CIFilter` 色彩分析 |
| Android | `Palette` 库（`Palette.from(bitmap).generate()`），取 `getDominantColor()` 或 `getVibrantColor()` |
| Web/H5 | Canvas `getImageData()` 像素遍历（Demo 中的实现方式） |

> **注意**：Android Palette 库可直接使用，无需手动遍历像素；iOS 也有类似的 `ColorThief` 等开源库。核心目标是提取头像中最突出的蓝色调。

---

## 2. 渐变构建

### 渐变结构（两层叠加）

```
背景 = 上层 + 下层

上层（纵向白色过渡，融入 bio 区域）:
  linear-gradient(180deg, transparent 0%, transparent 40%, #FFFFFF 100%)

下层（对角线吸色渐变）:
  linear-gradient(135deg,
    rgba(R, G, B, 0.15)       0%,
    rgba(R+20, G+30, B-10, 0.10)  30%,
    rgba(R-10, G+10, B, 0.13)     60%,
    rgba(R, G, B, 0.12)       100%
  )
```

### 渐变区域
- 位置：个人页顶部，从顶部到 bio 卡片上方
- 高度：320px
- 宽度：100%（页面宽度）
- z-index：位于背景层之上、头像/导航之下

---

## 3. 漂移动画（Blob）

渐变区域内叠加 3 个模糊圆形元素，独立做随机漂移动画：

| Blob | 尺寸 | 初始位置 | 动画周期 | 颜色（非吸色模式） |
|------|------|----------|----------|---------------------|
| #1 | 120×120 | top:30, left:40 | 5s | rgba(0,0,0,0.035) |
| #2 | 100×100 | top:80, left:200 | 6s | rgba(0,0,0,0.028) |
| #3 | 140×90 | top:20, left:110 | 7s | rgba(0,0,0,0.032) |

### Blob 样式
- `border-radius: 50%`
- `filter: blur(40px)`
- `animation-timing-function: ease-in-out`
- `animation-iteration-count: infinite`

### 漂移轨迹（示例：Blob #1）
```
0%   → translate(0, 0)
25%  → translate(60px, 30px)
50%  → translate(20px, 60px)
75%  → translate(-30px, 20px)
100% → translate(0, 0)
```
各 Blob 轨迹不同，避免同步感。

### 吸色模式下
Blob 不使用灰色，改由渐变背景本身承载吸色效果。Blob 保持漂移动画以增加灵动感。

---

## 4. Tooltip 样式

```
位置：nav bar 正下方居中，top: 95px
背景色：#3A3A3A
圆角：12px
内边距：12px
最小高度：48px
文案：Tap to upload background
文字颜色：#FFFFFF
字号：14px
字重：600 (SemiBold)
行高：1.3
不折行：white-space: nowrap
阴影：0 2px 10px rgba(0,0,0,0.14)

箭头：
  位置：Tooltip 顶部居中
  形状：三角形朝上
  尺寸：21×8px
  颜色：#3A3A3A（与 Tooltip 背景一致）
```

---

## 5. 动效时序

```
时间轴（单位：ms）

t=0        开始
t=100      渐变层开始淡入
             opacity: 0 → 1
             transition: opacity 0.6s ease
t=400      Tooltip 开始淡入
             opacity: 0 → 1
             transition: opacity 0.6s ease-out
t=4400     Tooltip 开始淡出
             opacity: 1 → 0
             transition: opacity 0.6s ease-out
t=5000     渐变层开始淡出
             opacity: 1 → 0
             transition: opacity 0.6s ease-out
t=5600     动画全部结束
```

### 总时长
约 **5.6 秒**（其中用户可见渐变持续约 **4.9 秒**，Tooltip 可见约 **4 秒**）

---

## 6. 关键参数速查表

| 参数 | 值 |
|------|-----|
| 渐变区域高度 | 320px |
| 渐变透明度范围 | 0.10 ~ 0.15 |
| 底部白色过渡起点 | 40% 处 |
| Blob 数量 | 3 个 |
| Blob 模糊半径 | 40px |
| Blob 动画周期 | 5s / 6s / 7s |
| 整体展示时长 | ~5.6s |
| 渐变淡入/淡出 | 0.6s ease |
| Tooltip 淡入/淡出 | 0.6s ease-out |
| Tooltip 背景色 | #3A3A3A |
| Tooltip 圆角 | 12px |
| Tooltip 字号/字重 | 14px / 600 |
| 默认兜底色 | rgb(60, 100, 220) |
| 取色采样间隔 | 每 4 像素 |
| 取色筛选条件 | B > R && B > G |

---

## 7. 交付清单

| 交付物 | 文件 | 说明 |
|--------|------|------|
| 可交互 Demo | `profile-onboarding-demo.zip` | 解压后浏览器直接打开，左下角面板切换方案 |
| 技术规格文档 | `profile-onboarding-spec.md`（本文件） | 算法、参数、时序的完整说明 |
| 源码参考 | `profile-onboarding.html` 第 1674~1709 行 | 取色和渐变构建的 JS 实现 |
