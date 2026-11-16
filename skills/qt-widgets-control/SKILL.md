---
name: qt-widgets-control
description: >-
  写或改 QWidget 自绘控件、paintEvent、QStyledItemDelegate 时使用：
  高 DPI 像素对齐、异形命中检测、焦点环绘制、QSS 与自绘的边界、
  尺寸协商（sizeHint/QSizePolicy）、动画与绘制性能规则（Qt 6）。
metadata:
  category: conceptual
  qt-version: "6.x"
---

# Qt Widgets 自绘控件

Widgets 自绘的难点从来不是「怎么画一条线」，而是：像素在 150% 缩放下糊不糊、
尺寸协商有没有被 `setFixedSize` 偷懒绕过、焦点环在键盘操作时出不出来、
QSS 和自绘抢同一块背景时谁赢。

## 如何应用

**写控件时**：静默遵守，不在回复里罗列规则。
**改既有控件时**：项目已有稳定约定（比如统一用 `QStyle` 绘制而不是自绘）优先跟随，
并说明偏离点。
**评审时**：只报违规行 + 违反的规则，不整体复述清单。

## 规则

### 继承与职责边界

| 规则 | 说明 |
|---|---|
| 先选对基类 | 会按下的用 `QAbstractButton`，带范围值的用 `QAbstractSlider`，列表项用 `QStyledItemDelegate`，纯展示才用 `QWidget`。基类选错要手写的状态机翻倍。 |
| QSS 和自绘分开用，不要混着调试 | QSS 只管盒模型（背景、边框、内边距、字体），管不了 `paintEvent` 里画的东西；反过来自绘内容也不吃 QSS。混用时「改了 QSS 没反应」是必然。 |
| 自绘控件不要依赖 palette 变主题 | 主题切换走自己的 `Q_PROPERTY(QColor ...)` + setter 里 `update()`，比依赖 `QPalette` 更可控；但仍应从 `palette()` 取默认值以尊重系统主题。 |
| 类必须有 `Q_OBJECT` | 缺了就没有信号槽、没有属性系统、`qobject_cast` 失效。 |

### 尺寸协商

| 规则 | 说明 |
|---|---|
| 重写 `sizeHint()`，不要 `setFixedSize()` | 固定尺寸让控件无法放进可变布局。真实固定物（图标、分隔线）除外。 |
| `sizeHint()` 返回内容理想尺寸 | 不是当前尺寸，也不要用 `width()` 反推。 |
| `minimumSizeHint()` 单独给 | 内容可压缩到的下限，否则布局压到 0 宽时绘制会出负值。 |
| 设对 `QSizePolicy` | 可伸展用 `Expanding`，跟随内容用 `Preferred`，容器类才用 `Minimum`/`Maximum`。 |
| 尺寸变化触发重算缓存 | `resizeEvent()` 里重建背景缓存，别在 `paintEvent` 里判断「尺寸变了吗」。 |
| 放进 `QScrollArea` 要 `setWidgetResizable(true)` + 有 `sizeHint` | 缺任一，滚动区里的控件会缩成一小坨。 |

### 绘制

| 规则 | 说明 |
|---|---|
| `paintEvent` 里只画，不查不建 | 不读配置、不查数据库、不 new 一堆临时对象。这个函数每帧/每次重绘都会跑。 |
| 开抗锯齿 | `QPainter p(this); p.setRenderHint(QPainter::Antialiasing);` 圆角矩形用 `QPainterPath::addRoundedRect`。 |
| 用 `initStyleOption()` 同步状态 | 派生自 Qt 控件的自定义类，重写 `initStyleOption(QStyleOptionButton*)` 并调用基类，样式与自绘的状态（hover/pressed/checked）才一致。 |
| 需要样式一致时交给 QStyle 画 | `style()->drawControl(QStyle::CE_PushButton, &opt, &p, this)` 而不是自己画一套。要改外观优先 `QProxyStyle`。 |
| 文本用 `QFontMetrics` 度量，不手算 | 用 `fontMetrics().elidedText(...)` 处理省略，用 `Qt::AlignVCenter` 而不是自己算基线偏移。 |
| 局部刷新 | 状态变化只 `update(变化区域)`，不要整控件 `update()`。 |
| 静态背景缓存成 `QPixmap` | 在 `resizeEvent` 里按 `size() * devicePixelRatioF()` 生成并 `setDevicePixelRatio`，`paintEvent` 里只 `drawPixmap`。 |
| 全量覆盖时可声明不透明 | `setAttribute(Qt::WA_OpaquePaintEvent)` 省一次背景填充，前提是真的每个像素都画满。 |

### 高 DPI

| 规则 | 说明 |
|---|---|
| 不要手动乘缩放系数 | Qt 6 默认开启高 DPI 缩放，`QPainter` 逻辑坐标已换算。手动乘会双重放大。 |
| 位图必须设 `devicePixelRatio` | `QPixmap pm(size() * dpr); pm.setDevicePixelRatio(dpr);` 否则在高分屏上被拉伸糊掉。 |
| 1px 线要半像素对齐 | 抗锯齿下画 1 逻辑像素线，`QPainter` 传 `0.5` 偏移或改用 cosmetic pen，否则边缘发灰。 |
| 图标用矢量 | `QIcon` + SVG（`QtSvg`），或 `QPainterPath` 绘制，避免多套位图。 |

### 命中与鼠标

| 规则 | 说明 |
|---|---|
| 异形控件重写 `hitButton()` / `shape()` | 圆角、圆形控件的点击区不能用外接矩形，否则角落空白处也能点。 |
| hover 态要显式触发重绘 | `setAttribute(Qt::WA_Hover)` + `enterEvent/leaveEvent` 里 `update()`；`paintEvent` 里用 `underMouse()` 判断。 |
| 光标形状用 `setCursor` | 可点击处 `Qt::PointingHandCursor`，不要靠用户猜。 |
| 拖拽用 `QDrag` + MIME | 手搓 `mouseMoveEvent` 攒阈值的实现基本都会漏掉 Esc 取消和跨应用拖放。 |

### 焦点与键盘

| 规则 | 说明 |
|---|---|
| `setFocusPolicy(Qt::StrongFocus)` | 默认 `NoFocus`，键盘用户永远到不了这个控件。 |
| `focusInEvent` / `focusOutEvent` 里 `update()` | 否则焦点环不会出现/消失。 |
| 焦点环要画 | 自绘控件不会自动获得焦点环：`style()->drawPrimitive(QStyle::PE_FrameFocusRect, ...)`，或自绘 2px ring。 |
| `keyPressEvent` 处理完调基类 | 未处理的键必须 `QWidget::keyPressEvent(e)`，否则 Tab 导航、快捷键链断掉。 |
| 空格/回车触发按下态 | 与 `QAbstractButton` 行为一致：`keyPressEvent` 置 pressed，`keyReleaseEvent` 触发 `clicked`。 |

### 动画

| 规则 | 说明 |
|---|---|
| 用 `QVariantAnimation` / `QPropertyAnimation` | `valueChanged` 里 `update()`。不要 `QTimer` 手动累加，掉帧且难暂停。 |
| 停止时不再重绘 | 动画 `state` 回到 `Stopped` 后确认没有残留的定时器继续 `update()`。 |
| 只对视觉属性做动画 | 动 `geometry` 会触发布局重算整棵树，动 `opacity` / 自定义进度值更便宜。 |

### 无障碍

| 规则 | 说明 |
|---|---|
| `setAccessibleName()` / `setAccessibleDescription()` | 自绘控件对读屏是一团像素，不给名字就无法使用。 |
| 状态要可读 | 开关类控件的选中态通过 `QAccessible::State` 暴露；简单场景至少保证 `setAccessibleName` 随状态更新。 |
| 保留 `setToolTip` | 不是无障碍替代品，但对看不清图标的用户是兜底。 |

### 性能

| 规则 | 说明 |
|---|---|
| 大量条目用 view + delegate | 几百个 widget 堆进 `QScrollArea` 是内存与布局灾难。用 `QListView`/`QTableView` + `QStyledItemDelegate`。 |
| `paintEvent` 里避免重复构造 `QFontMetrics` | 缓存成成员，或直接 `fontMetrics()`（无需构造）。 |
| 频繁全量重绘的控件考虑 `QOpenGLWidget` / `QQuickWidget` | 但先量：绝大多数控件不需要。 |

## 非显而易见的坑

- **重写 `paintEvent` 不调基类，QSS 背景会消失**：需要 QSS 生效时先
  `QStyleOption opt; opt.initFrom(this); style()->drawPrimitive(QStyle::PE_Widget, &opt, &p, this);`
- **`QWidget` 子类可以被 QSS 命中，但 `QQuickItem` 不行**：混用 Quick 与 Widgets 时，
  不要期待 QSS 影响 QML 内部。
- **`update()` 是异步的，`repaint()` 是同步的**：循环里调 `repaint()` 会拖死 UI。
- **`sizeHint()` 被调用非常频繁**：里面不要做 IO，也不要递归依赖子控件几何。
- **`QStyleOption` 不初始化就传进 style**：字段是未定义值，绘制结果随机。用 `initStyleOption()` 或 `opt.initFrom(w)`。
- **`QPainter` 生命周期必须严格包在 `paintEvent` 内**：跨越事件边界持有 `QPainter` 会崩。

## References

- `paintEvent` 完整范式、高 DPI 与命中检测代码：[paint-and-style.md](references/paint-and-style.md)
- 交付前自查清单：[checklist.md](references/checklist.md)
