# 个人页渐变动态背景 — 研发交付规格

## 1. 整体效果

页面顶部显示一个 **双色动态渐变背景**，颜色从用户头像中提取，底部平滑过渡到白色。渐变内有多个模糊色块缓慢漂移，形成流动的视觉效果。

---

## 2. 头像双色取色算法

### 输入
用户头像图片（任意尺寸）

### 处理流程

```
1. 将头像绘制到离屏 Canvas
2. 获取全部像素数据 (RGBA)
3. 每隔 4 个像素采样一次（性能优化）
4. 跳过透明像素 (alpha < 128)

提取主色（蓝色倾向）：
5. 筛选 blue > red AND blue > green 的像素
6. 取 blue 分量最大的像素 → 主色 (R1, G1, B1)

提取副色（暖色倾向）：
7. 筛选 red > blue 的像素
8. 计算 warmth = red + green - blue
9. 取 warmth 最大且 (red > 80 OR green > 80) 的像素 → 副色 (R2, G2, B2)

饱和度增强（HSL 空间）：
10. 主色饱和度 +50%
11. 副色饱和度 +45%

提亮：
12. 主色: R += 30, G += 40, B += 50 (clamp to 255)
13. 副色: R += 40, G += 35, B += 30 (clamp to 255)
```

### 降级方案
头像加载失败时使用默认色：
- 主色: `rgb(40, 90, 230)`
- 副色: `rgb(180, 120, 60)`

---

## 3. 渐变容器

| 属性 | 值 |
|------|-----|
| 位置 | 页面顶部 `top: 0` |
| 宽度 | 100%（390px） |
| 高度 | 220px |
| z-index | 2 |
| overflow | hidden |

### 底部过渡（mask）

使用 CSS mask 实现底部平滑消融到白色：

```css
mask-image: linear-gradient(to bottom, black 0%, black 50%, transparent 100%);
-webkit-mask-image: linear-gradient(to bottom, black 0%, black 50%, transparent 100%);
```

### 底层渐变（静态）

```css
background:
  linear-gradient(180deg, transparent 0%, transparent 40%, #fff 100%),
  linear-gradient(135deg,
    rgba(R1, G1, B1, 0.15) 0%,
    rgba(R1+20, G1+30, B1-10, 0.10) 30%,
    rgba(R1-10, G1+10, B1, 0.13) 60%,
    rgba(R1, G1, B1, 0.12) 100%
  );
```

---

## 4. 动态色块（Blobs）

共 4 个色块，主色 2 个（大面积）+ 副色 2 个（小面积点缀）。

### 色块通用样式

```css
position: absolute;
border-radius: 50%;
filter: blur(80px);    /* 关键：高模糊消除球体感 */
opacity: 0;            /* 初始不可见 */
transition: opacity 0.6s ease;
```

显示时 `opacity: 1`。

### 各色块参数

| 色块 | 尺寸 | 位置 | 颜色 | 透明度 | 动画周期 |
|------|------|------|------|--------|---------|
| blob-1（主色） | 280×250 | top:-50, left:-30 | 主色 | 0.32 | 2.8s |
| blob-2（副色） | 140×130 | top:-10, left:240 | 副色 | 0.18 | 3.2s |
| blob-3（主色） | 250×220 | top:-30, left:50 | 主色偏蓝 | 0.26 | 3.0s |
| blob-4（副色） | 120×120 | top:0, left:260 | 副色偏绿 | 0.14 | 2.6s |

### 色块颜色计算

```
blob-1: rgba(主色R, 主色G, 主色B, 0.32)
blob-2: rgba(副色R, 副色G, 副色B, 0.18)
blob-3: rgba(主色R, 主色G, min(255, 主色B+20), 0.26)
blob-4: rgba(副色R, min(255, 副色G+15), 副色B, 0.14)
```

---

## 5. 动画路径（关键帧）

使用 `linear` 缓动（匀速），多关键帧实现不规则折线路径。

### blob-1（主色，2.8s）
```css
@keyframes drift1 {
  0%   { transform: translate(0, 0); }
  15%  { transform: translate(130px, 10px); }
  30%  { transform: translate(80px, 70px); }
  45%  { transform: translate(-40px, 50px); }
  60%  { transform: translate(-80px, -10px); }
  75%  { transform: translate(30px, -30px); }
  90%  { transform: translate(120px, 40px); }
  100% { transform: translate(0, 0); }
}
```

### blob-2（副色，3.2s）
```css
@keyframes drift2 {
  0%   { transform: translate(0, 0); }
  20%  { transform: translate(-100px, 30px); }
  40%  { transform: translate(-30px, -40px); }
  60%  { transform: translate(70px, 50px); }
  80%  { transform: translate(-60px, 70px); }
  100% { transform: translate(0, 0); }
}
```

### blob-3（主色，3.0s）
```css
@keyframes drift3 {
  0%   { transform: translate(0, 0); }
  12%  { transform: translate(100px, -20px); }
  28%  { transform: translate(40px, 60px); }
  42%  { transform: translate(-70px, 30px); }
  58%  { transform: translate(-100px, -20px); }
  72%  { transform: translate(20px, -40px); }
  88%  { transform: translate(80px, 50px); }
  100% { transform: translate(0, 0); }
}
```

### blob-4（副色，2.6s）
```css
@keyframes drift4 {
  0%   { transform: translate(0, 0); }
  18%  { transform: translate(-80px, 50px); }
  36%  { transform: translate(60px, -30px); }
  54%  { transform: translate(-40px, -50px); }
  72%  { transform: translate(90px, 40px); }
  100% { transform: translate(0, 0); }
}
```

### 路径设计原则
- 7~8 个关键帧，方向频繁急转弯
- `linear` 匀速缓动，避免"果冻感"
- 位移范围 80~130px（配合 80px blur 刚好可感知流动但看不到球体）
- 各 blob 周期不同（2.6~3.2s），避免同步

---

## 6. 动效时序

```
时间轴（单位：ms）

t=0          开始
t=100        渐变容器淡入 (opacity 0→1, 0.6s)
t=400        Toast/Tooltip 淡入
t=6400       Toast/Tooltip 淡出
t=7000       渐变容器淡出 (opacity 1→0, 0.6s)
t=7600       动画结束
```

---

## 7. 饱和度增强算法（HSL 空间）

```
输入: RGB 颜色 + 增强量 amount

1. 转换 RGB → HSL
2. S = min(1, S + amount)
3. 转换 HSL → RGB
4. 返回增强后的 RGB
```

---

## 8. 关键设计决策

| 决策 | 原因 |
|------|------|
| blur 80px | 消除球体边缘，用户只感知颜色流动 |
| 主色大 + 副色小 | 主色占主导，副色点缀，避免颜色平分太杂 |
| 左右分区 | 主色偏左、副色偏右，减少重叠混色发脏 |
| mask 底部渐隐 | 和 bio 区域自然过渡，无硬截断 |
| linear 缓动 | 匀速移动更有生命力，ease 会"粘滞" |
| 多关键帧 | 避免简单往返的机械感 |

---

## 9. 移动端适配建议

- 渐变高度按屏幕比例：`height = screenWidth * 0.56`
- blob 尺寸按比例缩放
- 低端机可减少 blob 数量（2个即可）或降低 blur 值
- `will-change: transform` 开启 GPU 加速
- 考虑 `prefers-reduced-motion` 关闭动画
