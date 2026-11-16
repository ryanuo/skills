# qt-qml-component：QML 组件开发规则

写 QML 组件时压住那些「能跑但不对」的写法：尺寸靠外部硬塞、焦点链断、换主题只换一半、列表滚起来掉帧。

## 什么时候用

- 要新写一个 QML 自定义控件（按钮、输入框、下拉、卡片、开关……）
- 改已有组件的结构、加/改主题令牌、接明暗主题切换
- 组件在 `Layout` 里塌了、键盘 `Tab` 走不通、滚动时状态串行
- 想确认「这样写在你这个 Qt 版本上对不对」

纯概念问答（比如"anchors 是怎么算的"）不需要它。

## 使用步骤

1. 说清三件事：Qt 版本（5.15 / 6.x）、技术栈（Quick / Widgets）、组件要解决什么交互。
2. 技能会先确认组件的对外契约（属性 / 信号 / 默认值 / 焦点与键盘行为），再给实现。
3. 实现是完整可编译文件，带 `CMakeLists.txt` 片段和行内注释说明取舍。
4. 交付前按 `references/checklist.md` 自查一遍。

## 文件构成

```
qt-qml-component/
├── SKILL.md                          # 规则表：文件组织/导入/尺寸/绑定/焦点/无障碍/委托/令牌/性能/i18n
└── references/
    ├── anti-bias.md                  # 模型对 QML 的系统性错误认知（21 条，按域分组）
    ├── component-patterns.md         # 4 个可复制骨架 + 内容尺寸协议速查
    └── checklist.md                  # 交付前自查清单（带判定方法）
```

## 规则要点

**尺寸**：自定义控件必须给 `implicitWidth/implicitHeight` 并由内容推导。只写 `width/height` 的组件放进 `RowLayout` 会塌成 0。反过来写 `implicitWidth: width` 是绑定环。

**导入**：Qt 6 不写版本号。定制了 `background/contentItem/indicator` 的文件要导入具体样式（`QtQuick.Controls.Basic` 等），且只在该文件导入——样式导入是编译期选择，会覆盖运行时换肤。

**焦点**：复合控件用 `FocusScope` 收口；`activeFocusOnTab: true`；方向键 / Esc 处理完必须 `event.accepted = true`；弹层关闭后 `forceActiveFocus()` 把焦点还回去。

**委托**：模型 role 用 `required property` 声明；不用可变 JS 变量存状态；开了 `reuseItems` 必须写 `onPooled` / `onReused`；委托里的 `parent` 不是 `ListView`。

**令牌**：组件内不写颜色字面量，只消费语义令牌；暗色切换靠令牌层换值，不在组件里做 `isDark ? a : b` 判断。

**性能**：不给复杂子树加 `opacity` / `clip: true`；动 `opacity/scale/rotation/x/y` 用 `*Animator`；不用 `Canvas` 做会动的内容；不可见时停掉动画。

## 反偏见清单

`references/anti-bias.md` 是这个技能最值钱的部分。它收录的是「AI 因训练数据里的 Qt 5 旧范式而稳定写错」的写法，共 21 条，分六类：

| 域 | 典型错误 |
|---|---|
| 版本与导入 | `import QtQuick 2.15`、`QtGraphicalEffects`（Qt 6 已移除）、全局加样式导入 |
| 组件形态 | 只给 `width/height`、透明容器用 `Rectangle`、`onCompleted` 成片赋值 |
| 布局 | `width: parent.width - 40`、Layout 里写 `anchors.fill` |
| 状态动画 | `Timer` 驱动逐帧动画、`PropertyChanges { target: ... }` 旧语法 |
| C++ 边界 | `qmlRegisterType` 老式注册、依赖 `QML_SINGLETON::create()` 做初始化 |
| Qt 5 遗留 | `AA_EnableHighDpiScaling`、`QRegExp`、`qmake`、`QT += quick` |

每条都给了「模型会怎么错 / 应该怎么写 / 为什么会错」，重点是第三列——知道原因才能推广到没写到的场景。

## 最小示例

```qml
import QtQuick
import QtQuick.Controls.Basic
import App.Theme

Button {
    id: control
    implicitWidth: Math.max(Theme.size.controlMin, label.implicitWidth + Theme.space.lg * 2)
    implicitHeight: Math.max(Theme.size.controlMin, label.implicitHeight + Theme.space.sm * 2)

    contentItem: Text {
        id: label
        text: control.text
        font.pixelSize: Theme.font.body
        color: Theme.color.primaryForeground
        horizontalAlignment: Text.AlignHCenter
        verticalAlignment: Text.AlignVCenter
        elide: Text.ElideRight
    }

    background: Rectangle {
        radius: Theme.radius.md
        color: control.down ? Theme.color.primaryPressed
             : control.hovered ? Theme.color.primaryHover
             : Theme.color.primary
        border.width: control.visualFocus ? 2 : 0
        border.color: Theme.color.ring
    }

    Accessible.role: Accessible.Button
    Accessible.name: control.text
}
```

完整的下拉选择、`FocusScope` 复合控件、主题令牌单例（含 `qmldir` 与 CMake 接线）见 `references/component-patterns.md`。
