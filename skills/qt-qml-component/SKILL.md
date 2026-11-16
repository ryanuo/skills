---
name: qt-qml-component
description: >-
  写或改 QML 组件、自定义控件、Qt Quick Controls 定制、主题令牌时使用：三段式定制、
  implicit 尺寸传导、焦点与键盘链、委托复用、渲染性能规则（Qt 6）。
  纯概念问答（如"anchors 怎么工作"）不触发。
metadata:
  category: conceptual
  qt-version: "6.x"
---

# QML 组件开发

写一个组件不只是让它显示出来。这个 skill 收敛的是「组件能活下来」的那些约束：
尺寸由内容决定而不是由外部硬塞、键盘能走通、切主题不炸、列表滚 10 万条不掉帧。

## 如何应用

**写新组件时**：静默遵守下面的规则，不要在回复里罗列「我避免了 X 规则」——代码自己会说话。

**改既有项目时**：如果周边代码有稳定且不同的约定（比如 Layout 里习惯写 `width:`），
优先跟随项目约定，并指出这处偏离及原因。

**评审既有代码时**：只报违反项，引用问题行 + 说明违反了哪条，不逐条复述规则本身。

## 规则

### 文件组织

| 规则 | 说明 |
|---|---|
| 一个组件一个文件 | 文件名用 PascalCase，与根元素类型同名。多于一处复用的对象字面量必须独立成文件。 |
| 150–200 行或 3 层嵌套是拆分信号 | 这是气味阈值不是硬上限，但超了要能说出为什么不拆。 |
| 内部私有子部件放 `components/` 或同目录 `+` 前缀 | 不进模块对外导出，避免 API 表面膨胀。 |

### 导入与样式

| 规则 | 说明 |
|---|---|
| Qt 6 不要写版本号 | `import QtQuick` 而不是 `import QtQuick 2.15`。Qt 5 代码保留版本号。 |
| 定制控件必须导入具体样式 | 用到 `background` / `contentItem` / `indicator` / `handle` 时，写 `import QtQuick.Controls.Basic`（或项目已确立的样式），不要用裸的 `QtQuick.Controls`。 |
| 样式导入只加在真正定制的文件 | 样式导入是**编译期**样式选择，会覆盖 `QT_QUICK_CONTROLS_STYLE` 与 `qtquickcontrols2.conf` 的运行时选择。没有定制的文件保持裸导入，否则整个 App 失去换肤能力。 |
| 需要「深度定制 + 运行时换样式」时建样式目录 | 用 `QtQuick.Templates` 里的类型逐个 extend，配 `qmldir`，作为真正的 style 加载，而不是就地覆写内置样式内部件。 |

### 尺寸与布局

| 规则 | 说明 |
|---|---|
| 自定义控件必须给 `implicitWidth` / `implicitHeight` | 这是 Controls 与 Layout 协商尺寸的唯一依据。只写 `width`/`height` 的组件在 Layout 里要么塌成 0，要么打死布局。 |
| `implicitWidth` 要由内容推导 | 例：`implicitWidth: label.implicitWidth + leftPadding + rightPadding`。不要写死魔数。 |
| 在 Layout 内不要同时用 `width`/`anchors` | Layout 拥有子项的几何。用 `Layout.fillWidth` / `Layout.preferredWidth` / `Layout.minimumWidth`。 |
| 不要在 Layout 里给子项 `anchors.fill: parent` | 与 Layout 几何管理冲突，报 "Cannot specify anchors for items inside Layout"。 |
| `implicitWidth` 与 `width` 不要互相绑定 | 会构成绑定环。组件只负责 implicit，实际尺寸交给使用者或 Layout。 |

### 属性与绑定

| 规则 | 说明 |
|---|---|
| 对外 API 用 `property` + `NOTIFY` 语义清晰 | 别名（`property alias text: label.text`）适合转发内部子项属性；需要副作用（校验、格式化）时用独立属性和 `onXxxChanged`。 |
| 每个可见属性都给默认值 | 组件在「什么都不配」时也应该显示成合理样子，否则使用者第一次运行就是空白。 |
| 声明式优先 | 用绑定而不是在 `Component.onCompleted` 里赋值；`onCompleted` 只在需要运行时才知道的信息上用。 |
| 谨慎用 `=` 破坏绑定 | `x = 10` 会永久摧毁绑定。故意的写在注释里；不小心的改用 `Qt.binding()` 或 `Binding`。 |
| 反向通知要显式 | 内部子项变化要改父级属性时，在 `onXxxChanged` 里写回，别指望别名自动双向。 |

### 焦点与键盘

| 规则 | 说明 |
|---|---|
| 复合控件用 `FocusScope` 包住内部焦点链 | 否则内部子项抢焦点，外部 `Tab` 走位会散。 |
| 可交互控件设 `activeFocusOnTab: true` | 纯 `Item` 不具备，必须显式设；`Control` 子类默认有。 |
| 方向键在控件内部消化 | `Keys.onPressed` / `Keys.onUpPressed` 里处理并设 `event.accepted = true`，否则事件继续冒泡去滚动外层视图。 |
| 弹层关闭后显式还焦点 | `Popup` / `Dialog` 关闭后调用触发控件的 `forceActiveFocus()`，否则焦点丢到窗口根部，键盘用户直接卡死。 |
| 禁用态要真的不可聚焦 | `enabled: false` 同时把 `focusPolicy` / `activeFocusOnTab` 关掉，不要只改颜色。 |

### 无障碍

| 规则 | 说明 |
|---|---|
| 自建控件必须补 `Accessible.role` 与 `Accessible.name` | 内置 Controls 自带，用 `Item`/`Rectangle` 拼的没有。 |
| 装饰性元素设 `Accessible.ignored: true` | 让读屏跳过纯装饰层。 |
| 状态变化要有可读来源 | 开关类控件把 `Accessible.checked` / `Accessible.pressed` 映射到真实状态。 |

### 委托与列表

| 规则 | 说明 |
|---|---|
| 模型 role 用 `required property` 声明 | 类型安全，且比隐式 role 查找快。`required property string name`。内部再用 `model.roleName` 访问以防本地属性遮蔽。 |
| 委托里不要用可变 JS 变量存状态 | JS 变量在 item 复用时不会重置。用 QML 属性，并在 `onPooled` 清、`onReused` 恢复（Qt 6.7+ `reuseItems`）。 |
| 委托内 `parent` 不是 ListView | `parent` 是委托内部容器。要访问列表用 `ListView.view` 或显式 `id`。 |
| 静态少量列表用 `Repeater` + `Column` | 比 `ListView` 轻，且不引入复用语义负担。 |

### 主题令牌

| 规则 | 说明 |
|---|---|
| 组件内禁止颜色字面量 | 不写 `color: "#0f172a"`、不写 `color: "white"`。一律走语义令牌（如 `theme.color.foreground`）。 |
| 令牌分层：原始值 → 语义 → 组件 | 组件只消费语义层（`surface` / `border` / `destructive`），不消费 `gray-500` 这类原始层，否则换主题时组件要逐个改。 |
| 暗色切换靠令牌切换，不靠组件内判断 | 不在组件里写 `theme.isDark ? "#fff" : "#000"`；让 `theme.color.x` 自己变，组件绑定的表达式不用改。 |
| 令牌单例用 `pragma Singleton` + `qmldir` | 两者缺一不可，只写 pragma 不会生效。 |
| 不要把 Item 挂到单例下 | 单例生命周期长于窗口，挂上去的 item 会泄漏或在析构时崩。 |

### 渲染性能

| 规则 | 说明 |
|---|---|
| 不给复杂子树加 `opacity` | 会把整棵子树离屏合成到临时 surface 再混合，代价极高。用叶子节点颜色的 alpha。 |
| 不给复杂子树加 `clip: true` | 强制整棵子树离屏渲染。只在实际溢出且必须裁剪时开。 |
| 用 `Item` 代替无填充的 `Rectangle` | 无可见填充的 Rectangle 依然参与绘制。命中区、容器、锚点用 Item。 |
| 不塞无意义的 `Item` 包装层 | 每多一层多一次遍历与潜在重排。包装层必须提供布局、裁剪或事件处理之一。 |
| 动 `opacity`/`scale`/`rotation`/`x`/`y` 用 `*Animator` | `OpacityAnimator` 等跑在渲染线程，不逐帧回 QML 引擎。`NumberAnimation` 在这些属性上是下策。 |
| 不要用 `Canvas` 做会动的内容 | Canvas 的重绘由 JS 驱动、跑在主线程。仅适合一次性静态复杂绘制。 |
| 动画离开屏幕要停 | 不可见时动画仍在每帧 tick。把 `running`/`paused` 绑到有效可见性。 |
| `Behavior` 少用 | 它会在**每一次**变化上触发，包括程序赋值。需要精确控制时机用 `Transition` / 显式动画。 |

### 国际化

| 规则 | 说明 |
|---|---|
| 用户可见字符串全部 `qsTr()` | 包含 `text`、`title`、`placeholderText`、`toolTipText`。日志与内部标识不用。 |
| 用 `%1` 占位而不是拼接 | `qsTr("共 %1 项").arg(n)`。拼接会破坏译文语序。 |
| 同名不同义要加消歧 | `qsTr("Open", "action: open file")`。 |

## 非显而易见的坑

- **动态作用域很脆**：QML 按作用域链解析裸名字。跨组件访问一律用显式 `id`，不要依赖隐式查找。
- **`Timer` 默认不启动**：`running` 默认 `false`，必须显式设 `true` 或 `.start()`。
- **`Connections` 只针对一个目标**：多个信号源要写多个 `Connections`。
- **z 序即声明序**：后声明的兄弟在上层。`z` 只在声明顺序解决不了时用。
- **`opacity: 0` 仍然响应鼠标**：需要同时 `visible: false` 或 `enabled: false`。
- **`Loader.item` 在 `status !== Loader.Ready` 时是 null**：访问前必须判状态。

## References

- 模型对 QML 的系统性错误认知清单：[anti-bias.md](references/anti-bias.md)
- 组件骨架模板（三段式定制、焦点链、可复用控件）：[component-patterns.md](references/component-patterns.md)
- 交付前自查清单：[checklist.md](references/checklist.md)
