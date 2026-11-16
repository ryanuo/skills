# qt-widgets-control：QWidget 自绘控件规则

Widgets 自绘的难点不是画线，是像素在 150% 缩放下糊不糊、点击区跟视觉是否一致、焦点环出不出来、QSS 和自绘抢同一块背景时谁赢。

## 什么时候用

- 要写一个自绘控件（继承 `QWidget` / `QAbstractButton`，重写 `paintEvent`）
- 自定义控件在高分屏（125% / 150% / 200%）下模糊、错位、边缘发灰
- 圆角或异形控件的点击区不对（角落空白也能点，或者视觉区域内点不动）
- 要给 `QListView` / `QTableView` 写自定义单元格（`QStyledItemDelegate`）
- QSS 改了没反应，或者加了自绘之后 QSS 背景消失

## 使用步骤

1. 说明控件要做什么、目标 Qt 版本、是否要键盘操作与无障碍。
2. 技能会先定尺寸协商（`sizeHint` / `minimumSizeHint` / `QSizePolicy`），再给绘制实现。
3. 实现是完整可编译的 `.h` / `.cpp`，带 `CMakeLists.txt` 需要的模块。
4. 交付前按 `references/checklist.md` 自查，重点在「高 DPI 各缩放比各验一次」。

## 文件构成

```
qt-widgets-control/
├── SKILL.md                        # 规则表：基类选择/尺寸/绘制/高DPI/命中/焦点/动画/无障碍/性能
└── references/
    ├── paint-and-style.md          # 可直接编译的 ChipWidget 完整实现 + QSS 边界 + QProxyStyle + 委托
    └── checklist.md                # 交付前自查清单
```

## 规则要点

**尺寸**：重写 `sizeHint()` 返回内容理想尺寸，不要 `setFixedSize()` 偷懒。内容变化（文本、图标）要调 `updateGeometry()`，否则布局不重算、文字被截断。

**绘制**：`paintEvent` 里只画，不读配置、不查数据、不 new 对象。开 `Antialiasing`，圆角用 `QPainterPath`。静态背景缓存成 `QPixmap`，在 `resizeEvent` 里重建。

**高 DPI**：Qt 6 默认 DPI 感知，不要手动乘缩放系数。`QPixmap` 必须 `setDevicePixelRatio(devicePixelRatioF())`。1 逻辑像素描边要半像素对齐（`adjusted(0.5, 0.5, -0.5, -0.5)`），否则边缘是一条灰线。

**命中**：圆角/异形控件重写命中判定（`hitButton()` 或自绘 `QPainterPath::contains`），不能拿外接矩形当点击区。

**QSS 边界**：QSS 只管盒模型（背景、边框、内边距、字体），管不了 `paintEvent` 里的内容。要 QSS 背景生效必须先 `style()->drawPrimitive(QStyle::PE_Widget, &opt, &p, this)`。改系统控件外观优先用 `QProxyStyle`，不要逐个继承重写。

**焦点**：`setFocusPolicy(Qt::StrongFocus)`；`focusInEvent` / `focusOutEvent` 里调 `update()`；自绘控件必须自己画焦点环；未处理的键回传基类。

## 核心代码：半像素对齐 + 缓存

```cpp
void ChipWidget::rebuildCache()
{
    const qreal dpr = devicePixelRatioF();
    m_cache = QPixmap(size() * dpr);
    m_cache.setDevicePixelRatio(dpr);          // 不设这行，高 DPI 下整张图被拉伸
    m_cache.fill(Qt::transparent);

    QPainter p(&m_cache);
    p.setRenderHint(QPainter::Antialiasing, true);

    // 半像素内缩：1 逻辑像素描边在高分屏上才不会糊成两像素灰线
    const QRectF box = QRectF(QPointF(0, 0), QSizeF(size())).adjusted(0.5, 0.5, -0.5, -0.5);

    QPainterPath path;
    path.addRoundedRect(box.adjusted(0.5, 0.5, -0.5, -0.5), kRadius, kRadius);

    QColor fill = m_accent;
    fill.setAlpha(m_hovered ? 36 : 24);
    p.fillPath(path, fill);
    p.setPen(QPen(m_accent, kBorder));
    p.drawPath(path);
}
```

完整控件（含命中检测、键盘触发、焦点环、hover 处理）见 `references/paint-and-style.md`。

## 常见坑

| 现象 | 原因 |
|---|---|
| QSS 背景消失 | 重写 `paintEvent` 但没调基类 / 没画 `PE_Widget` |
| 高分屏上模糊 | `QPixmap` 没设 `devicePixelRatio` |
| 边缘一条灰线 | 1px 线没做半像素对齐 |
| 键盘到不了控件 | 没设 `Qt::StrongFocus`（默认 `NoFocus`） |
| 焦点看不见 | 自绘控件不会自动画焦点环 |
| 单元格永远显示未选中 | 委托 `paint()` 里漏了 `initStyleOption()` |
| 滚动区里控件缩成一小坨 | `QScrollArea` 没开 `setWidgetResizable(true)` 或没 `sizeHint` |
