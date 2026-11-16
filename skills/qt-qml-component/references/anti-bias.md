# 模型对 QML 的系统性错误认知

这份清单只收录一件事：**训练数据里的旧范式与新语法，导致模型稳定写错的写法**。
每条都是「模型很可能这么写 / 实际应该这么写 / 为什么会错」。
泛泛的最佳实践不在这里——那种东西模型大多已经知道。

## 一、版本与导入

| 模型很可能这么写 | 应该这样 | 为什么 |
|---|---|---|
| `import QtQuick 2.15` | `import QtQuick` | Qt 6 取消了导入版本号要求。带版本号的写法会让模型顺手把整个文件写成 Qt 5 风格，后续 `PropertyChanges { target: ... }`、`QtQuick.Controls 2.15` 一并跑偏。 |
| `import QtQuick.Controls 2.15` 然后直接改 `background` | `import QtQuick.Controls.Basic` + 改 `background` | 裸导入拿不到可定制的样式模板。而且裸导入 + 运行时换肤两个诉求会打架。 |
| `import QtGraphicalEffects 1.15` | Qt 6：`MultiEffect`（6.5+）；确实需要旧效果时 `import Qt5Compat.GraphicalEffects` | `QtGraphicalEffects` 在 Qt 6 已从主线移除。模型凭 Qt 5 记忆直接写，编译即失败。 |
| `import QtQuick.Window 2.15` | `import QtQuick`（`Window` 在 Qt 6 已并入 `QtQuick`） | Qt 6 里 `QtQuick.Window` 仍存在但多数场景不再需要。 |
| `import QtQuick.Controls.Material 2.15` 顺手加在 main.qml | 只在需要 Material 的文件里导入，且明确这是编译期选择 | 全局加样式导入 = 放弃运行时换样式。 |

## 二、组件形态

| 模型很可能这么写 | 应该这样 | 为什么 |
|---|---|---|
| 自定义控件只写 `width: 200; height: 40` | 写 `implicitWidth` / `implicitHeight`，让使用者决定实际尺寸 | 没有 implicit 尺寸的组件放进 `RowLayout` 直接塌成 0。这是模型最常犯的组件错误。 |
| `implicitWidth: width` | `implicitWidth: contentItem.implicitWidth + paddings` | 反向绑定构成绑定环，运行时报 "Binding loop"。 |
| 用 `Rectangle` 当透明容器 | `Item` | 无填充的 Rectangle 仍然参与绘制批次。 |
| 在 `Component.onCompleted` 里给所有属性赋值 | 声明式绑定；`onCompleted` 只用于运行时才知道的信息 | 命令式赋值会摧毁绑定，后续数据变化不再刷新。 |
| 直接覆写 `contentItem: Item { ... }` 而不保留原控制语义 | 覆写后自行补齐焦点、按下态、hover 态与无障碍信息 | 覆写 contentItem 等于接管该控件的全部交互表现，内置行为不再兜底。 |
| 弹层用 `Item` + `visible` 手搓 | `Popup` / `Dialog`（自带模态、关闭策略、焦点管理） | 手搓弹层几乎必然漏掉焦点陷阱与 Esc 关闭。 |

## 三、布局

| 模型很可能这么写 | 应该这样 | 为什么 |
|---|---|---|
| `width: parent.width - 40` | `Layout.fillWidth: true` + `Layout.leftMargin/rightMargin` | 手算宽度不参与布局协商，窗口缩放时容易溢出或留白。 |
| Layout 里写 `anchors.fill: parent` | `Layout.fillWidth: true; Layout.fillHeight: true` | 直接触发 Qt 警告，且行为未定义。 |
| `anchors.centerIn: parent` 与 `Layout.*` 混用 | 二选一 | Layout 拥有几何，anchors 会被覆盖或报错。 |
| 用固定 `height: 48` 表达控件高度 | `implicitHeight: Math.max(theme.size.control, fontMetrics.height + 2 * padding)` | 固定值在高 DPI、大字号、不同语言下必然错位。 |

## 四、状态、动画、脚本

| 模型很可能这么写 | 应该这样 | 为什么 |
|---|---|---|
| `Timer { interval: 16; running: true; onTriggered: rect.x += 1 }` | `NumberAnimation` / `XAnimator` | JS 驱动的逐帧动画跑在主线程，掉帧且吃 CPU。 |
| `NumberAnimation` 动 `opacity` / `scale` | `OpacityAnimator` / `ScaleAnimator` | Animator 系列在渲染线程执行，不逐帧回引擎。 |
| `PropertyChanges { target: foo; width: 100 }` | `PropertyChanges { foo.width: 100 }` | Qt 6 新语法；旧写法在 Qt 6 已废弃。 |
| `states` 表达连续动画 | `states` 只表达离散配置，连续变化用动画 | 状态机不是动效引擎。 |
| 用 `Canvas` 画波形、仪表盘 | 用 `Shape` / 自定义 `QQuickItem` / Qt Canvas Painter（6.12+） | Canvas 由 JS 驱动，动画场景下是性能灾难。 |

## 五、C++ 边界

| 模型很可能这么写 | 应该这样 | 为什么 |
|---|---|---|
| `qmlRegisterType<MyType>("My", 1, 0, "MyType")` | `QML_ELEMENT` + `qt_add_qml_module` | Qt 6 的注册方式；老写法仍可编译但无法参与 QML 模块与工具链（qmllint、qmlcachegen）。 |
| 认为 `QML_SINGLETON` 的 `create()` 一定被调用 | `create()` 可能不被调用，状态初始化放构造函数或 `setup()`，或改用 `QML_SINGLETON` + `QML_FOREIGN` 显式工厂 | 懒加载/纯 C++ 访问路径下 `create()` 会被跳过，依赖它的初始化会静默不执行。 |
| 在 QML 里遍历大数组算聚合 | 放到 C++（模型/代理模型）或预计算 | QML 里的 JS 循环在 GUI 线程上，千级数据就掉帧。 |
| `property var data: ({})` 存结构化数据并逐字段赋值 | 独立具名属性，或注册 C++ value type | `var` 属性不会触发细粒度通知，改字段不更新界面，且无类型检查。 |
| 引擎加载失败只看到空白窗口 | 看 `QQmlApplicationEngine::warnings()` / 控制台输出 | QML 加载错误默认只打日志，不抛出异常。 |

## 六、Qt 5 遗留配置

| 模型很可能这么写 | 应该这样 | 为什么 |
|---|---|---|
| `QCoreApplication::setAttribute(Qt::AA_EnableHighDpiScaling)` | 删掉 | Qt 6 默认开启，属性已废弃。 |
| `QRegExp` / `qAsConst` / `QString::SkipEmptyParts` / `QTextCodec` | `QRegularExpression` / `std::as_const` / `Qt::SkipEmptyParts` / `QStringConverter` | Qt 6 已移除或迁移，凭 Qt 5 记忆写会编译失败。 |
| `qmake` + `.pro` | CMake + `qt_add_executable` / `qt_add_qml_module` | Qt 6 的官方构建方式，`.pro` 是遗留路径。 |
| `QT += quick` 风格描述依赖 | `find_package(Qt6 REQUIRED COMPONENTS Quick QuickControls2)` + `target_link_libraries` | 同上，模型常把 qmake 依赖写法混进 CMake。 |

## 使用方式

写代码前扫一眼对应分区，命中就换写法；**不要在回复里复述这份清单**。
如果用户明确要求 Qt 5 兼容，上表中「Qt 6 应该这样」一列的条目全部反向适用。
