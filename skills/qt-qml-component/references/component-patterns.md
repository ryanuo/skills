# QML 组件骨架

可复制的最小范式。四个骨架覆盖日常 90% 的自定义控件：叶子控件、Controls 定制、
复合交互控件、主题令牌接线。代码按 Qt 6 + `QtQuick.Controls.Basic` 写。

## 1. 先决：主题令牌单例

组件里不出现颜色字面量，前提是有可消费的令牌层。最小可用形态：

```qml
// Theme.qml
pragma Singleton
import QtQuick

QtObject {
    readonly property QtObject color: QtObject {
        readonly property color background: "#ffffff"
        readonly property color surface: "#f8fafc"
        readonly property color border: "#e2e8f0"
        readonly property color foreground: "#0f172a"
        readonly property color mutedForeground: "#64748b"
        readonly property color primary: "#0f172a"
        readonly property color primaryForeground: "#f8fafc"
        readonly property color destructive: "#ef4444"
        readonly property color ring: "#94a3b8"
    }

    readonly property QtObject radius: QtObject {
        readonly property real sm: 4
        readonly property real md: 6
        readonly property real lg: 10
    }

    readonly property QtObject space: QtObject {
        readonly property real xs: 4
        readonly property real sm: 8
        readonly property real md: 12
        readonly property real lg: 16
    }

    readonly property QtObject font: QtObject {
        readonly property int body: 14
        readonly property int caption: 12
        readonly property int title: 18
    }

    readonly property QtObject size: QtObject {
        readonly property real controlMin: 36
        readonly property real controlSm: 28
    }
}
```

接线有两个必踩的点：

```qml
# qmldir —— pragma Singleton 只写一半没用，必须配齐
module App.Theme
singleton Theme Theme.qml
```

```cmake
# 用 CMake 托管 QML 模块时，还要给单例文件打标记，否则它被当普通类型加载
set_source_files_properties(Theme.qml PROPERTIES QT_QML_SINGLETON_TYPE TRUE)

qt_add_qml_module(app
    URI App.Theme
    VERSION 1.0
    QML_FILES Theme.qml
)
```

暗色主题不要做成「组件里 if 判断」，而是在令牌层换一批值：`Theme` 内部读一个
`darkMode` 开关，`color.background` 等属性绑定到它，组件侧一行不改。

## 2. 叶子控件：自定义按钮

展示三段式定制 + implicit 尺寸 + 状态色 + 无障碍 + 焦点。

```qml
// components/AppButton.qml
import QtQuick
import QtQuick.Controls.Basic
import App.Theme

Button {
    id: control

    // 尺寸由内容推导，而不是被外部硬塞
    implicitWidth: Math.max(Theme.size.controlMin, label.implicitWidth + Theme.space.lg * 2)
    implicitHeight: Math.max(Theme.size.controlMin, label.implicitHeight + Theme.space.sm * 2)

    contentItem: Text {
        id: label
        text: control.text
        font.pixelSize: Theme.font.body
        color: control.enabled ? (control.isPrimary ? Theme.color.primaryForeground
                                                   : Theme.color.foreground)
                               : Theme.color.mutedForeground
        horizontalAlignment: Text.AlignHCenter
        verticalAlignment: Text.AlignVCenter
        elide: Text.ElideRight
    }

    background: Rectangle {
        radius: Theme.radius.md
        color: {
            if (!control.enabled) return Theme.color.surface
            if (control.down)     return Theme.color.primary
            if (control.hovered)  return Qt.lighter(Theme.color.primary, 1.15)
            return control.isPrimary ? Theme.color.primary : Theme.color.surface
        }
        border.width: control.visualFocus ? 2 : (control.isPrimary ? 0 : 1)
        border.color: control.visualFocus ? Theme.color.ring : Theme.color.border
        Behavior on color { ColorAnimation { duration: 120 } }
    }

    // 自建外观需要自己补无障碍信息
    Accessible.role: Accessible.Button
    Accessible.name: control.text
}
```

要点：

- `visualFocus`（而非 `activeFocus`）才代表「键盘用户看得见的焦点」，鼠标点击时不该出现焦点环。
- 内部 `contentItem` 的尺寸决定 `implicitWidth`，不要反向写 `implicitWidth: width`。
- `Accessible.role` 必须给，否则读屏把它当一团图形。

## 3. 复合控件：FocusScope + 键盘链

当控件内部有可聚焦子项（输入框、列表）时，必须有 `FocusScope` 收口，
否则 Tab 会在内部子项之间乱跳。

```qml
// components/SearchField.qml
import QtQuick
import QtQuick.Controls.Basic
import App.Theme

FocusScope {
    id: root

    property alias text: input.text
    property string placeholder: qsTr("搜索")
    signal accepted()

    implicitWidth: 240
    implicitHeight: Theme.size.controlMin
    activeFocusOnTab: true

    onActiveFocusChanged: if (activeFocus) input.forceActiveFocus()

    Rectangle {
        anchors.fill: parent
        radius: Theme.radius.md
        color: Theme.color.surface
        border.width: root.activeFocus ? 2 : 1
        border.color: root.activeFocus ? Theme.color.ring : Theme.color.border
    }

    TextField {
        id: input
        anchors.fill: parent
        anchors.margins: 1
        leftPadding: Theme.space.md
        rightPadding: Theme.space.md
        placeholderText: root.placeholder
        font.pixelSize: Theme.font.body
        color: Theme.color.foreground
        background: null          // 外框已由上面的 Rectangle 负责
        focus: true

        Keys.onReturnPressed: {
            root.accepted()
            event.accepted = true
        }
        Keys.onEscapePressed: {
            input.clear()
            event.accepted = true          // 消化事件，别让弹层顺手关掉
        }
    }
}
```

要点：

- `event.accepted = true` 不是可选项。Esc / 方向键不消化，会继续冒泡去关弹层、滚外层视图。
- `FocusScope` + `onActiveFocusChanged` 是「外壳拿到焦点 → 转交给内部真正输入者」的标准写法。
- `background: null` 关掉内置背景，避免双层描边。

## 4. 弹层控件：可用键盘操作的下拉选择

`ComboBox` 已经内置这些能力，只有在视觉或数据形态真的不匹配时才自建。
自建就要把三件事补齐：弹层定位、键盘导航、关闭后焦点归还。

```qml
// components/AppSelect.qml
import QtQuick
import QtQuick.Controls.Basic
import App.Theme

FocusScope {
    id: root

    property int currentIndex: -1
    property string placeholder: qsTr("请选择")
    property var options: []          // 简单场景；大数据量换 QAbstractListModel
    readonly property string currentText:
        currentIndex >= 0 && currentIndex < options.length ? options[currentIndex] : ""

    signal activated(int index)

    implicitWidth: 200
    implicitHeight: Theme.size.controlMin
    activeFocusOnTab: true

    function open() {
        popup.open()
        list.forceActiveFocus()
    }

    function close(restoreFocus) {
        popup.close()
        if (restoreFocus) root.forceActiveFocus()
    }

    Rectangle {
        anchors.fill: parent
        radius: Theme.radius.md
        color: Theme.color.surface
        border.width: root.activeFocus ? 2 : 1
        border.color: root.activeFocus ? Theme.color.ring : Theme.color.border
    }

    Text {
        anchors.left: parent.left
        anchors.right: chevron.left
        anchors.leftMargin: Theme.space.md
        anchors.rightMargin: Theme.space.sm
        anchors.verticalCenter: parent.verticalCenter
        text: root.currentText.length ? root.currentText : root.placeholder
        color: root.currentText.length ? Theme.color.foreground : Theme.color.mutedForeground
        font.pixelSize: Theme.font.body
        elide: Text.ElideRight
    }

    Text {
        id: chevron
        anchors.right: parent.right
        anchors.rightMargin: Theme.space.md
        anchors.verticalCenter: parent.verticalCenter
        text: "▾"
        color: Theme.color.mutedForeground
    }

    MouseArea {
        anchors.fill: parent
        cursorShape: Qt.PointingHandCursor
        onClicked: root.open()
    }

    Keys.onDownPressed: root.open()
    Keys.onSpacePressed: root.open()

    Accessible.role: Accessible.ComboBox
    Accessible.name: root.currentText.length ? root.currentText : root.placeholder

    Popup {
        id: popup
        y: root.height + Theme.space.xs
        width: root.width
        padding: Theme.space.xs
        closePolicy: Popup.CloseOnEscape | Popup.CloseOnPressOutside
        onClosed: root.forceActiveFocus()      // 焦点必须还回来

        background: Rectangle {
            radius: Theme.radius.md
            color: Theme.color.background
            border.width: 1
            border.color: Theme.color.border
        }

        contentItem: ListView {
            id: list
            implicitHeight: Math.min(contentHeight, 240)
            clip: true
            model: root.options
            currentIndex: root.currentIndex
            keyNavigationEnabled: true
            focus: true

            delegate: ItemDelegate {
                required property int index
                required property var modelData

                width: ListView.view.width
                text: modelData
                highlighted: index === root.currentIndex
                font.pixelSize: Theme.font.body

                onClicked: {
                    root.currentIndex = index
                    root.activated(index)
                    root.close(true)
                }
            }

            Keys.onReturnPressed: {
                if (currentIndex >= 0) {
                    root.currentIndex = currentIndex
                    root.activated(currentIndex)
                }
                root.close(true)
                event.accepted = true
            }
            Keys.onEscapePressed: {
                root.close(true)
                event.accepted = true
            }
        }
    }
}
```

要点：

- `onClosed: root.forceActiveFocus()` 是这类控件最容易漏的一行。漏了，键盘用户关掉下拉后焦点掉到窗口根节点，Tab 要从头走一遍。
- `delegate` 里 `required property int index` / `required property var modelData` 是 Qt 6 推荐写法，比隐式角色查找快且能查出拼写错误。
- 内容高度用 `Math.min(contentHeight, 240)` 限高，别让长列表把弹层顶出屏幕；真正的定位还应该按 `root.mapToItem` 判断上下翻转。
- 数据超过几百条时换成 `QAbstractListModel` + `QSortFilterProxyModel`，`options` 只适合小静态集合。

## 5. 委托复用（Qt 6.7+）

开了 `reuseItems` 就必须处理状态残留，否则滚动时会出现「上一条的选中态跑到新条目上」。

```qml
ListView {
    reuseItems: true
    delegate: ItemDelegate {
        required property int index
        required property string name

        text: name
        highlighted: false

        onPooled: { /* 清掉动画、定时器、临时高亮 */ }
        onReused: { /* 按 index/name 恢复本该有的状态 */ }
    }
}
```

不用 `reuseItems` 时，重复创建/销毁委托是滚动卡顿的常见来源；用了不写 `onPooled`/`onReused`
则引入状态污染。两者选一个都要付代价，别两头都不管。

## 6. 内容尺寸协议速查

| 场景 | 写什么 |
|---|---|
| 叶子控件（按钮、标签） | `implicitWidth = 内容 implicit + 左右 padding` |
| 需要撑满父级的容器 | 交给使用者写 `Layout.fillWidth: true` 或 `anchors.fill: parent` |
| 文本换行块 | `implicitHeight: contentHeight`，并给 `width` 一个上界 |
| 有最大/最小约束 | `Layout.minimumWidth` / `Layout.maximumWidth`，不要写 `width: Math.max(...)` |
| 图片 | `sourceSize` + `fillMode: Image.PreserveAspectFit`，尺寸由 layout 决定 |
