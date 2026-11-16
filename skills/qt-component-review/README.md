# qt-component-review：Qt 组件代码评审

两段式评审：先用脚本把机械性错误扫掉，再让 AI 只处理需要跨文件追踪的语义问题，最后按置信度出报告。**只读，不改代码。**

## 什么时候用

- 「帮我 review 一下这个组件」「看看 `src/components` 有没有问题」
- 提交 / 合并前的自查
- 重构前评估现状：哪些是真缺陷，哪些只是风格不同

不适用于从零写组件（用 `qt-qml-component` / `qt-widgets-control`）。

## 使用步骤

1. 说明范围：「这次改动」/「`src/components` 这个目录」/「就这个文件」。
2. 技能先跑确定性检查脚本，拿到候选清单。
3. 再做语义分析（绑定、布局、委托、生命周期、主题令牌、C++/QML 边界、Widgets 绘制）。
4. 按置信度分级输出：≥80 叫缺陷，60–79 叫待验证并说明缺什么信息，<60 直接不提。

## 手动跑检查脚本

脚本只依赖 Python 3 标准库，不需要装 Qt：

```bash
# 摘要模式：按规则分组统计 + 文件命中排行
python3 scripts/qt_component_lint.py --summary src/

# 逐条模式：文件:行号 + 命中代码
python3 scripts/qt_component_lint.py src/

# 只看单文件
python3 scripts/qt_component_lint.py src/components/AppButton.qml

# 打印规则全集
python3 scripts/qt_component_lint.py --rules

# Qt 5 项目：关掉 Qt 6 专属规则（导入版本号）
python3 scripts/qt_component_lint.py --qt=5 src/
```

摘要输出示例：

```
Deterministic findings: 10 across 1 file(s)

R001 [warn] import 带版本号 — 2
      Qt 6 不需要导入版本号；带版本号是 Qt 5 写法，会连带把整份文件写成 Qt 5 风格。
R002 [warn] 定制了控件内部件但未指定样式 — 1
      覆盖 background/contentItem/indicator/handle 时应有具体样式导入（如 QtQuick.Controls.Basic），裸导入拿不到可定制模板。
R003 [info] 颜色字面量 — 2
      主题化项目中颜色应走语义令牌，字面量会让换主题只换一半。
```

退出码恒为 0（发现项不是错误），所以可以直接塞进 CI 只做提示。

## 9 条确定性规则

| 编号 | 级别 | 检查 |
|---|---|---|
| R001 | warn | `import` 带版本号（Qt 6 不需要） |
| R002 | warn | 定制了 `background`/`contentItem`/`indicator`/`handle`，但只导入了裸的 `QtQuick.Controls` |
| R003 | info | 颜色字面量（`#hex`、`"white"`、`Qt.black` 等） |
| R004 | info | 用户可见文案（`text`/`title`/`placeholderText`）没包 `qsTr()` |
| R005 | info | `clip: true` |
| R006 | info | `layer.enabled: true` |
| R007 | warn | 使用 `Canvas` |
| R008 | info | `Image` 有 `source` 但缺 `sourceSize` |
| R009 | info | `Behavior on ...` |

规则刻意压得少而准：**宁漏不误报**。每条都带前置条件，比如 R002 只在文件确实导入了裸 `QtQuick.Controls` 时才触发——否则样式文件里 `background:` 只是个普通属性名，会误报一片。

## 语义规则（脚本查不出来的）

`references/deep-rules.md` 分七域：

| 域 | 覆盖 |
|---|---|
| A1 绑定与属性 | 多环绑定、别名链、缺 `NOTIFY`、role 被遮蔽 |
| A2 尺寸与布局 | `implicitWidth: width` 环、Layout 与 anchors 打架、弹层不出屏幕 |
| A3 委托与模型 | `required property` 缺失、用 `index` 当身份、复用状态污染 |
| A4 生命周期 | `Loader.item` 未判 status、动态对象泄漏、单例挂 item |
| A5 主题令牌 | 组件内主题判断、语义层与原始层混用、缓存不重建 |
| A6 C++/QML 边界 | 模型通知太粗、`Q_INVOKABLE` 做重活、lambda 缺 context |
| W1 Widgets | `paintEvent` 里 IO、全量 `update()`、命中用矩形、无焦点指示 |

## 输出格式

```markdown
## 评审结论
有 2 处阻塞问题，其余可用。

## 缺陷（按影响排序）

### [D-001] 下拉在 Layout 里塌成 0 高
- 文件：`src/components/AppSelect.qml:12`
- 分类：布局
- 置信度：92/100
- 问题：只给了 `width: 200; height: 36`，没有 implicit 尺寸
- 依据：`Control` 在 Layout 中的尺寸来自 `implicitHeight`，硬编码的 `height` 会被布局覆盖
- 修复方向：改为由内容推导的 `implicitWidth/implicitHeight`，保留最小高度兜底

## 待验证
### [I-001] 主题切换后圆角背景可能需要重建缓存
- 置信度：68/100 · 无法确认的原因：`Theme` 的切换路径在 C++ 侧，未见实现 · 怎么验：切暗色后放大看 4 个圆角边缘

## 建议优先处理
1. 修 D-001（阻塞布局）
2. 确认 I-001（影响暗色模式观感）
```

## 边界

- 只读。用户说「顺手修掉」才进修复模式，且先说明会动哪些文件。
- 拿不准的 Qt 行为标「待验证」，不用「通常/一般」包装猜测。
- 项目有稳定且不同的约定时，报「与项目约定不一致」而不是「错误」。
- 默认不给全量重写，只给问题清单 + 修复方向。
