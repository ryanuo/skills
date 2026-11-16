# Widgets 自绘控件交付前自查清单

## 1. 尺寸协商

- [ ] 重写了 `sizeHint()`，且返回内容理想尺寸（不是 `width()`、不是固定常量）
- [ ] 重写了 `minimumSizeHint()`
- [ ] 没有用 `setFixedSize()` 图省事（真实固定物除外）
- [ ] `QSizePolicy` 与控件语义匹配（可伸展 / 跟随内容 / 固定）
- [ ] 内容变化时调了 `updateGeometry()`（文本、图标变了但布局没重算是最常见的漏项）

## 2. 绘制

- [ ] `paintEvent` 里没有 IO、配置读取、容器遍历
- [ ] 开了 `QPainter::Antialiasing`
- [ ] 1 逻辑像素描边做了半像素对齐（`adjusted(0.5, 0.5, -0.5, -0.5)`）
- [ ] 静态背景缓存在 `QPixmap`，并在 `resizeEvent` 中重建
- [ ] 缓存的 `QPixmap` 调了 `setDevicePixelRatio()`
- [ ] 需要 QSS 生效的地方调了 `style()->drawPrimitive(QStyle::PE_Widget, ...)`
- [ ] 文本用 `QFontMetrics` 度量 / `elidedText` 省略，没有硬算基线
- [ ] 状态变化只 `update(区域)`，没有无脑整控件重绘
- [ ] 派生自 Qt 控件的类重写了 `initStyleOption()`

## 3. 命中与鼠标

- [ ] 圆角 / 异形控件的点击判定不是外接矩形
- [ ] `WA_Hover` + `enterEvent`/`leaveEvent` 正确触发 hover 重绘
- [ ] 鼠标离开时清掉了 pressed 态（否则回来还是按下态）
- [ ] 光标形状已设置
- [ ] 右键 / 其他键有明确处理（忽略或走上下文菜单），不是静默吞掉

## 4. 焦点与键盘

- [ ] `setFocusPolicy(Qt::StrongFocus)`
- [ ] `focusInEvent` / `focusOutEvent` 里调了 `update()`
- [ ] 焦点环有绘制（自绘控件不会自动有）
- [ ] 空格 / 回车能触发点击，且 `isAutoRepeat()` 已处理
- [ ] 未处理的键回传给基类

## 5. 主题与配色

- [ ] 颜色来自 `palette()` 或 `Q_PROPERTY(QColor ...)`，没有写死在绘制里
- [ ] 颜色 setter 里调了 `update()`（必要时 `rebuildCache()`）
- [ ] QSS 与自绘的边界明确，没有指望 QSS 改自绘内容
- [ ] 高对比度 / 系统主题切换后仍可读（`QPalette::WindowText` 而不是纯黑）

## 6. 无障碍

- [ ] `setAccessibleName()` / `setAccessibleDescription()`
- [ ] 状态变化时无障碍名同步更新（如从「未选中」变「已选中」）
- [ ] 纯装饰绘制的子元素不参与无障碍树

## 7. 性能

- [ ] 大量条目走 view + delegate，不是堆 widget
- [ ] 动画用 `QVariantAnimation` / `QPropertyAnimation`，不是 `QTimer` 手摇
- [ ] 动画结束后没有残留 `update()` 循环
- [ ] 全量覆盖背景时考虑过 `WA_OpaquePaintEvent`
- [ ] `paintEvent` 里没有每次新建 `QFont` / `QFontMetrics`

## 8. 构建与集成

- [ ] 类有 `Q_OBJECT`
- [ ] CMake 里链接了实际用到的模块（`Widgets` / `Svg` / `Gui`）
- [ ] 用 `QProxyStyle` 改系统控件外观，而不是逐个继承重写 `paintEvent`
- [ ] 放进 `QScrollArea` 时开了 `setWidgetResizable(true)`
- [ ] 在 100% / 150% / 200% 缩放下各验过一次
