# QML 组件交付前自查清单

按顺序过一遍，能在本地 30 秒内验证的放前面。每条后面给了判定方法，
不用启动应用就能查掉大半。

## 1. 尺寸协议（最容易错，先查）

- [ ] 组件有 `implicitWidth` / `implicitHeight`，且由内容推导，不是硬编码常量
  → 搜 `implicitWidth` 是否存在于文件；把组件塞进 `RowLayout` 是否还站得住
- [ ] 没有 `implicitWidth: width` 这类反向绑定
  → 搜 `implicit.*:\s*width` / `implicit.*:\s*height`
- [ ] Layout 内没有同时出现 `width:` / `height:` / `anchors`
  → 搜文件里是否有 `Layout` 类型（`RowLayout|ColumnLayout|GridLayout|Layout`）
- [ ] 固定像素高度只用于图标、分隔线等真实固定物，控件高度走令牌或字体度量

## 2. 焦点与键盘（第二容易错）

- [ ] 控件可 Tab 到达：`Control` 子类确认未被 `activeFocusOnTab: false` 掐掉；纯 `Item` 自建确认显式设了 `true`
- [ ] 有内部可聚焦子项的复合控件外层是 `FocusScope`
- [ ] 方向键 / Esc / Enter 处理器里都有 `event.accepted = true`
- [ ] 弹层关闭后焦点回到触发控件（`onClosed: xxx.forceActiveFocus()`）
- [ ] 禁用态不可聚焦，不只是变色
- [ ] 鼠标点击不显示键盘焦点环（用 `visualFocus` 而非 `activeFocus` 驱动样式）

## 3. 绑定与状态

- [ ] 没有 `Component.onCompleted` 里成片赋值本可用绑定的属性
- [ ] 没有意外的命令式 `=` 覆盖绑定（搜 `\.\w+ = ` 与 `onXxxChanged` 混用处）
- [ ] 状态变化都走 `states` / 属性，没有在信号处理里手动改一堆 `color` / `width`
- [ ] 没有绑定环：改 `implicitWidth` 不会间接改回自身（用 QML Profiler 或运行时警告确认）

## 4. 主题令牌

- [ ] 文件里没有颜色字面量：搜 `#[0-9a-fA-F]{3,8}`、`"white"`、`"black"`、`"red"`
- [ ] 颜色引用的是语义令牌（`surface` / `border` / `foreground` / `destructive`），不是 `gray-500` 这种原始层
- [ ] 没有 `isDark ? "#fff" : "#000"` 这类组件内主题判断
- [ ] 圆角、间距、字号也都走令牌（否则换皮只换了一半）

## 5. 委托与列表

- [ ] 委托里模型字段用 `required property` 声明
- [ ] 委托里没有可变 JS 变量存状态（`var x = ...` 出现在 delegate 内）
- [ ] 开了 `reuseItems` 就一定写了 `onPooled` / `onReused`
- [ ] 委托内访问列表本身用的是 `ListView.view` 或显式 id，不是 `parent`
- [ ] 委托尽量薄：复杂逻辑移到模型层或独立组件

## 6. 性能

- [ ] 没有对复杂子树设 `opacity` 或 `clip: true`（确有需要时能说出代价）
- [ ] 没有用无填充 `Rectangle` 当容器（应为 `Item`）
- [ ] 动 `opacity/scale/rotation/x/y` 用的是 `*Animator`
- [ ] 没有 `Canvas` 承担会重绘的内容
- [ ] 不可见时的动画 / 粒子 / 定时器已停
- [ ] `Image` 有 `sourceSize`；网络图有 `asynchronous: true` 与失败态处理

## 7. 无障碍与 i18n

- [ ] 自建控件有 `Accessible.role` 与 `Accessible.name`
- [ ] 纯装饰元素 `Accessible.ignored: true`
- [ ] 所有用户可见文案 `qsTr()`，动态值用 `%1` 占位
- [ ] 同名不同义字符串有消歧注释

## 8. 构建与模块

- [ ] Qt 6 代码没有 import 版本号
- [ ] 定制了 `background`/`contentItem`/`indicator` 的文件导入了具体样式（`QtQuick.Controls.Basic` 等），其余文件保持裸导入
- [ ] 新增 QML 文件已加入 `qt_add_qml_module` 的 `QML_FILES`（否则打包后运行期才炸）
- [ ] 单例有 `pragma Singleton` + `qmldir` 条目 +（CMake 托管时）`QT_QML_SINGLETON_TYPE` 属性

## 9. 交付说明

- [ ] 说明了组件对外 API（属性 / 信号 / 默认值）与最短用法示例
- [ ] 说明了已知限制（数据规模、平台差异、Qt 版本要求）
- [ ] 没有「伪代码 / 省略若干行」的片段冒充可编译实现
