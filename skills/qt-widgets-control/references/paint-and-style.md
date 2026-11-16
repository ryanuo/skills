# paintEvent 范式与高 DPI

一个能直接编译的圆角 Chip 控件，把尺寸协商、缓存、命中检测、焦点环、高 DPI
全部串起来。基于 Qt 6（`QEnterEvent`、`QMouseEvent::position()` 均为 Qt 6 API）。

## 头文件

```cpp
// chipwidget.h
#pragma once

#include <QWidget>
#include <QPixmap>

class ChipWidget : public QWidget
{
    Q_OBJECT
    Q_PROPERTY(QColor accent READ accent WRITE setAccent NOTIFY accentChanged)

public:
    explicit ChipWidget(QString text, QWidget *parent = nullptr);

    QSize sizeHint() const override;
    QSize minimumSizeHint() const override;

    QColor accent() const { return m_accent; }
    void setAccent(const QColor &c);

    void setText(const QString &t);

signals:
    void accentChanged();
    void clicked();

protected:
    void paintEvent(QPaintEvent *event) override;
    void resizeEvent(QResizeEvent *event) override;
    void mousePressEvent(QMouseEvent *event) override;
    void mouseReleaseEvent(QMouseEvent *event) override;
    void keyPressEvent(QKeyEvent *event) override;
    void keyReleaseEvent(QKeyEvent *event) override;
    void focusInEvent(QFocusEvent *event) override;
    void focusOutEvent(QFocusEvent *event) override;
    void enterEvent(QEnterEvent *event) override;
    void leaveEvent(QEvent *event) override;

private:
    bool hitTest(const QPointF &pos) const;
    void rebuildCache();

    QColor m_accent{0x0F, 0x17, 0x2A};
    QString m_text;
    QPixmap m_cache;          // 静态圆角底，随 size / accent 变化重建
    bool m_pressed = false;
    bool m_hovered = false;
};
```

## 实现

```cpp
// chipwidget.cpp
#include "chipwidget.h"

#include <QPainter>
#include <QPainterPath>
#include <QStyle>
#include <QStyleOptionFocusRect>
#include <QKeyEvent>
#include <QMouseEvent>

namespace {
constexpr int kRadius   = 12;
constexpr int kPadH     = 12;
constexpr int kPadV     = 6;
constexpr int kBorder   = 1;
}

ChipWidget::ChipWidget(QString text, QWidget *parent)
    : QWidget(parent), m_text(std::move(text))
{
    // 没有这一行，键盘用户永远到不了这个控件
    setFocusPolicy(Qt::StrongFocus);
    setAttribute(Qt::WA_Hover);           // 让 hover 状态可用
    setCursor(Qt::PointingHandCursor);
    setAccessibleName(m_text);
}

QSize ChipWidget::sizeHint() const
{
    // 由内容推导，不是固定值，也不是当前 width()
    const QFontMetrics fm = fontMetrics();
    return QSize(fm.horizontalAdvance(m_text) + 2 * kPadH + 2 * kBorder,
                 fm.height() + 2 * kPadV + 2 * kBorder);
}

QSize ChipWidget::minimumSizeHint() const
{
    // 允许被压缩到下限，但不至于变成 0 宽导致负绘制区
    return QSize(2 * kPadH + 2 * kBorder, fontMetrics().height() + 2 * kPadV);
}

void ChipWidget::setAccent(const QColor &c)
{
    if (m_accent == c)
        return;
    m_accent = c;
    rebuildCache();
    update();
    emit accentChanged();
}

void ChipWidget::setText(const QString &t)
{
    if (m_text == t)
        return;
    m_text = t;
    setAccessibleName(t);
    updateGeometry();      // sizeHint 依赖文本，必须通知布局重算
    update();
}

void ChipWidget::rebuildCache()
{
    // 按设备像素比生成位图，否则高 DPI 下被拉伸糊掉
    const qreal dpr = devicePixelRatioF();
    m_cache = QPixmap(size() * dpr);
    m_cache.setDevicePixelRatio(dpr);
    m_cache.fill(Qt::transparent);

    QPainter p(&m_cache);
    p.setRenderHint(QPainter::Antialiasing, true);

    // 半像素内缩：1 逻辑像素描边在高 DPI 下才不会糊成两像素灰线
    const QRectF box = QRectF(QPointF(0, 0), QSizeF(size()))
                           .adjusted(0.5, 0.5, -0.5, -0.5);

    QPainterPath path;
    path.addRoundedRect(box.adjusted(kBorder / 2.0, kBorder / 2.0,
                                     -kBorder / 2.0, -kBorder / 2.0),
                        kRadius, kRadius);

    QColor fill = m_accent;
    fill.setAlpha(m_hovered ? 36 : 24);
    p.fillPath(path, fill);
    p.setPen(QPen(m_accent, kBorder));
    p.drawPath(path);
}

void ChipWidget::resizeEvent(QResizeEvent *event)
{
    QWidget::resizeEvent(event);
    rebuildCache();        // 尺寸变了缓存必须重建，不能在 paintEvent 里判断
}

void ChipWidget::paintEvent(QPaintEvent *)
{
    QPainter p(this);
    p.setRenderHint(QPainter::Antialiasing, true);

    if (!m_cache.isNull())
        p.drawPixmap(0, 0, m_cache);

    // 按下态用一层淡色覆盖，避免为每种状态各存一张缓存
    if (m_pressed) {
        QPainterPath path;
        path.addRoundedRect(QRectF(rect()).adjusted(0.5, 0.5, -0.5, -0.5),
                            kRadius, kRadius);
        QColor c = m_accent;
        c.setAlpha(48);
        p.fillPath(path, c);
    }

    p.setPen(palette().color(QPalette::WindowText));
    p.drawText(rect(), Qt::AlignCenter, m_text);

    // 自绘控件不会自动获得焦点环，必须自己画
    if (hasFocus()) {
        QStyleOptionFocusRect opt;
        opt.initFrom(this);
        opt.rect = rect().adjusted(-2, -2, 2, 2);
        style()->drawPrimitive(QStyle::PE_FrameFocusRect, &opt, &p, this);
    }
}

bool ChipWidget::hitTest(const QPointF &pos) const
{
    // 圆角控件的点击区不等于外接矩形：角落空白处不该响应
    QPainterPath path;
    path.addRoundedRect(QRectF(rect()).adjusted(0.5, 0.5, -0.5, -0.5),
                        kRadius, kRadius);
    return path.contains(pos);
}

void ChipWidget::mousePressEvent(QMouseEvent *event)
{
    if (event->button() != Qt::LeftButton || !hitTest(event->position())) {
        event->ignore();
        return;
    }
    m_pressed = true;
    update();
}

void ChipWidget::mouseReleaseEvent(QMouseEvent *event)
{
    if (!m_pressed)
        return;
    m_pressed = false;
    update();
    if (hitTest(event->position()))
        emit clicked();
}

void ChipWidget::keyPressEvent(QKeyEvent *event)
{
    switch (event->key()) {
    case Qt::Key_Space:
    case Qt::Key_Return:
    case Qt::Key_Enter:
        if (!event->isAutoRepeat()) {
            m_pressed = true;
            update();
        }
        return;
    default:
        break;
    }
    QWidget::keyPressEvent(event);     // 未处理必须回传，否则 Tab 导航断链
}

void ChipWidget::keyReleaseEvent(QKeyEvent *event)
{
    if ((event->key() == Qt::Key_Space || event->key() == Qt::Key_Return
         || event->key() == Qt::Key_Enter) && !event->isAutoRepeat()) {
        if (m_pressed) {
            m_pressed = false;
            update();
            emit clicked();
        }
        return;
    }
    QWidget::keyReleaseEvent(event);
}

void ChipWidget::focusInEvent(QFocusEvent *event)
{
    QWidget::focusInEvent(event);
    update();      // 不重绘，焦点环不会出现
}

void ChipWidget::focusOutEvent(QFocusEvent *event)
{
    QWidget::focusOutEvent(event);
    update();
}

void ChipWidget::enterEvent(QEnterEvent *event)
{
    QWidget::enterEvent(event);
    m_hovered = true;
    rebuildCache();
    update();
}

void ChipWidget::leaveEvent(QEvent *event)
{
    QWidget::leaveEvent(event);
    m_hovered = false;
    m_pressed = false;
    rebuildCache();
    update();
}
```

## 三个关键取舍的解释

**为什么背景缓存，文字不缓存。** 圆角填充 + 描边涉及 `QPainterPath` 光栅化，
是最贵的一段；文本随字体、字号、语言、DPI 变化，缓存收益低而失效条件多。
两者混在一起缓存，等于每次文本变化都要重建整张位图。

**为什么按下态单独叠加。** 缓存乘以状态数会爆炸（hover × pressed × disabled）。
只有静态部分进缓存，动态态用一层 alpha 叠加，代码量和内存都降下来。

**为什么 `hitTest` 用 `QPainterPath` 而不是 `QAbstractButton::hitButton`。**
`hitButton` 只在 `QAbstractButton` 子类里被调用。纯 `QWidget` 自绘控件必须自己
在 `mousePressEvent` 里挡掉圆角外的点击，否则视觉上是圆角、行为上是矩形。

## 与 QSS 共存

自绘控件要吃到 QSS 的背景 / 边框 / 内边距，必须先让 style 画 widget 本体：

```cpp
void MyWidget::paintEvent(QPaintEvent *)
{
    QPainter p(this);

    // 让 QSS 的 background / border 生效（不画的话 QSS 完全无效）
    QStyleOption opt;
    opt.initFrom(this);
    style()->drawPrimitive(QStyle::PE_Widget, &opt, &p, this);

    // 之后在内容区里自绘
    // ...
}
```

反过来的坑同样常见：在 QSS 里给自绘控件写 `background-color`，却期望它改变
`paintEvent` 里的填充色——不会生效。**边界要提前讲清楚：盒子模型给 QSS，
内容绘制给自己。**

## 需要改「系统控件外观」时用 `QProxyStyle`

不要为了统一按钮外观去继承 `QPushButton` 重写 `paintEvent`——那样每种控件都要写一遍，
而且丢掉样式自带的动画与状态。用 `QProxyStyle` 覆盖 `drawControl` / `drawPrimitive`：

```cpp
class AppStyle : public QProxyStyle
{
public:
    using QProxyStyle::QProxyStyle;

    void drawControl(ControlElement element, const QStyleOption *opt,
                     QPainter *p, const QWidget *w) const override
    {
        if (element == CE_PushButton) {
            // 自定义绘制，或先交给基类再补细节
        }
        QProxyStyle::drawControl(element, opt, p, w);
    }
};

// main.cpp
QApplication::setStyle(new AppStyle(QStringLiteral("Fusion")));
```

## 委托绘制（`QStyledItemDelegate`）

列表里的自定义单元格属于同一套规则，只是入口是 `paint()`：

```cpp
void StatusDelegate::paint(QPainter *p, const QStyleOptionViewItem &option,
                           const QModelIndex &index) const
{
    QStyleOptionViewItem opt = option;
    initStyleOption(&opt, index);        // 必须，否则选中态/hover 态不生效

    p->save();
    p->setRenderHint(QPainter::Antialiasing, true);

    // 背景交给样式，别自己画选中矩形，否则与系统风格不一致
    const QWidget *w = opt.widget;
    QStyle *style = w ? w->style() : QApplication::style();
    style->drawPrimitive(QStyle::PE_PanelItemViewItem, &opt, p, w);

    // 自定义内容
    p->setPen(opt.palette.color(QPalette::Text));
    p->drawText(opt.rect.adjusted(8, 0, -8, 0),
                Qt::AlignVCenter | Qt::AlignLeft,
                index.data(Qt::DisplayRole).toString());
    p->restore();
}

QSize StatusDelegate::sizeHint(const QStyleOptionViewItem &option,
                               const QModelIndex &index) const
{
    QSize s = QStyledItemDelegate::sizeHint(option, index);
    s.setHeight(qMax(s.height(), fontMetrics(option).height() + 12));
    return s;
}
```

`initStyleOption` 漏了是最常见的委托 bug：单元格永远显示成「未选中、无 hover」。
