# 语义分析规则

这些是脚本查不出来的——需要追踪符号、跨文件推理，或者依赖 Qt 的文档化运行期行为。
按域分组，评审时只加载相关章节。

**不要重复报告 lint 脚本已经列出的行。** 脚本管机械性写法，这里管「这么写会不会坏」。

---

## A1. 绑定与属性

- **多环绑定**：运行期只报单环（`QML: Binding loop detected`）。当 A 的 `onXxxChanged`
  写 B、而 B 的绑定读 A 时，环是静默的，表现为「界面卡但日志干净」。常见源头：
  在 Layout 里互相依赖 `implicitWidth`。
- **别名链**：`property alias a: b.x` 再被 `property alias c: a` 转发，链一长就难追踪，
  且中间层改名会连锁断裂。超过两跳要质疑。
- **缺 `NOTIFY` 的 `Q_PROPERTY`**：C++ 侧改了值但 QML 绑定不刷新。这是 C++/QML 集成里
  最典型的「改了一次有效，后面都不动」。
- **`readonly property` 被命令式赋值**：运行期报错但常被日志淹没；或被 `Qt.binding()` 覆盖后
  又当成普通属性用。
- **role 被本地同名属性遮蔽**：委托里 `property string name` 同时访问 `model.name`，
  未加 `model.` 前缀时读到的是本地值。
- **`property var` 承载结构体**：改内部字段不触发通知，界面不更新；也没有类型检查。

## A2. 尺寸与布局

- **`implicitWidth: width` 反向绑定**：绑定环，控件在 Layout 里尺寸抖或直接为 0。
- **Layout 与 anchors 并存**：父级是 `*Layout` 时子项再写 `anchors` 或 `width/height`，
  与布局管理器抢所有权。运行期警告有时不出现，但布局结果不稳定。
- **宽度靠减兄弟节点算**：`width: parent.width - sibling.width - 20`。兄弟可见性一变就溢出。
  应改为 Layout 权重或 `anchors` 相连。
- **弹层未做边界翻转**：下拉/浮层固定 `y: parent.height`，在屏幕底部会出屏。应按
  可用屏幕区域判断上下翻转。
- **固定像素尺寸表达控件尺寸**：高 DPI、系统字体放大、长文本场景下必然破。
- **内容变化未 `updateGeometry()`**：文本或图标变了，`sizeHint` 变了但布局没重算，
  表现是「字被截断但控件不长大」。

## A3. 委托与模型

- **`required property` 缺失**：role 名拼错时得到 `undefined` 而不报错，界面上是空白行。
- **用 `index` 当对象身份**：排序/过滤后 index 变化，选中态与动画跟着错位。身份应来自模型数据。
- **`reuseItems` 开了但没写 `onPooled`/`onReused`**：状态污染（上一条的 hover/选中带过来）。
- **委托里起定时器或动画不随复用停止**：滚动时累积运行中的动画，掉帧且内存增长。
- **委托内用 `parent` 指代列表**：`parent` 是委托内部容器，不是 `ListView`。
- **`beginResetModel()` 兜一切**：数据小改也整表 reset，等于放弃增量刷新，列表必闪。

## A4. 生命周期与加载

- **`Loader.item` 未判 `status`**：`null` 属性访问，Qt 6 的严格模式会直接抛错。
- **`Component.createObject()` 未传 parent 也未保存引用**：对象泄漏或提前被 GC。
- **动态创建的对象没有 `destroy()` 路径**：切换页面后旧对象还在，绑定仍在跑。
- **`Connections` 目标已销毁仍保持连接**：Qt 6 里 `Connections { function onXxx() }`
  用 `parent` 作隐式目标；父级被销毁而信号源仍存活时可能触发空引用。
- **单例被当作 item 容器**：单例生命周期长于窗口，挂在它下面的 item 会泄漏或析构崩溃。
- **`Qt.createComponent(url)` 用字符串路径**：运行期才失败，无法被 qmllint 检查；优先内联 `Component {}`。

## A5. 主题令牌

- **组件内主题判断**：`isDark ? "#fff" : "#000"`，切换主题要改每个组件。
- **语义层与原始层混用**：组件直接消费 `gray-500`，换皮时组件要逐个改，令牌层形同虚设。
- **切换主题后缓存的位图未重建**：圆角背景、阴影缓存还是旧色。
- **令牌属性非 `readonly`**：组件可能被意外改写，主题污染全局。
- **同一语义两套命名**：`muted` / `subtle` / `secondary` 混用，语义漂移后无法批量替换。

## A6. C++ / QML 边界

- **模型通知粒度太粗**：`dataChanged` 索引范围给错，或干脆 `beginResetModel`，界面全刷。
- **`Q_INVOKABLE` 里做重活**：跑在 GUI 线程，千级数据就卡。应放到 `QtConcurrent` 或 worker。
- **QML 可写属性缺 `WRITE` 或 `NOTIFY`**：交互控件改值后 C++ 不知道，或 C++ 改值后界面不动。
- **`QML_SINGLETON` 依赖 `create()` 做初始化**：`create()` 可能不被调用，初始化静默跳过。
- **`qmlRegisterType` 老式注册**：仍可运行，但不参与 QML 模块工具链（qmllint、qmlcachegen）。
- **lambda 连接未带 context**：接收者销毁后回调仍触发，是 Qt 6 里最常见的悬空调用来源。

## W1. Widgets 绘制与约定

- **`paintEvent` 里有 IO / 构造 / 布局计算**：每次重绘都执行，滚动即掉帧。
- **无脑全量 `update()`**：状态小改也重绘整控件，复杂控件上很明显。
- **未调用基类 `paintEvent` 却期望 QSS 生效**：样式背景直接消失。
- **`hitTest` 用外接矩形**：圆角/异形控件视觉与行为不一致，边角空白可点。
- **`sizeHint()` 返回当前 `width()`**：布局与内容互相追，窗口缩放时抖动。
- **`QPainter` 跨出 `paintEvent`**：崩溃或绘制错乱。
- **焦点可到达但无焦点指示**：键盘用户无法判断当前焦点在哪。
- **大量条目堆 widget**：应走 view + delegate。

---

## 判定口径

- 一条问题如果**只在特定输入下出现**，但该输入是正常使用路径 → 仍算缺陷，不要因「示例代码」降级。
- 「以后可能会加 X」不是缺陷理由。只报当前代码路径上的问题。
- Qt 版本不确定时，按 Qt 6 判定，并在报告里注明「若为 Qt 5 需重新核对」。
