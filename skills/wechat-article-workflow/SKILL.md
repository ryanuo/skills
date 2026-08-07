---
name: wechat-article-workflow
description: 微信公众号文章全流程：确认方向 → 分析参考页面 → 出计划确认 → 去 AI 味写作 → 配图方案（RYANUO prompt 内嵌/截图占位）→ yuwen-publish-precheck 审核 → 可选同步 ryanuo.cc → 交付公众号版 md。Use when 用户说"写一篇微信公众号文章/公众号文章/微信文章"，尤其基于某个参考页面 URL 或主题；用户没说方向时先询问。
version: 0.1.0
---

# 微信公众号文章工作流

把"基于参考页面/主题写一篇公众号文章"从分析到交付的全流程。文章方向不预设：用户没说清时先询问，技术教程只是方向之一。

## 触发条件

用户要求写微信公众号文章，特别是：
- 给了参考 URL（"先分析这个页面"）
- 有主题但没文章（"帮我写一篇关于 X 的文章"）
- 要发布到公众号「今日在学」

## 工作流（按顺序，不能跳）

### 0. 确认文章方向（用户没说清时必问）

**不要默认技术教程。** 用户没给明确方向时，用 `clarify` 单选询问，选项参考：

- 技术教程/实战（完整步骤、代码、踩坑）
- 工具/产品测评（上手体验、优缺点、适用人群）
- 行业观点/思考（现象、分析、个人立场）
- 经验心得/随笔（个人故事、方法论、感悟）

用户已明确方向（哪怕是"写个技术文"）就跳过此步。方向决定后续的结构、配图方式、审核重点。

### 1. 抓取并分析参考页面

```bash
# VitePress/SSR 页面直接抓 HTML 再提取正文（.dev TLD 偶发握手失败，加 --tlsv1.2）
curl -sL --tlsv1.2 --connect-timeout 15 '<url>' -H 'User-Agent: Mozilla/5.0' -o /tmp/page.html
python3 -c "
import re, html
raw = open('/tmp/page.html', encoding='utf-8', errors='ignore').read()
raw = re.sub(r'<(script|style)[^>]*>.*?</\1>', ' ', raw, flags=re.S)
m = re.search(r'<main[^>]*>(.*?)</main>', raw, flags=re.S)
body = m.group(1) if m else raw
body = re.sub(r'<[^>]+>', '\n', body)
print(html.unescape(body))
"
```

**页面很薄时补材料**：官方文档页通常只有几百字，正文之外的干货在别处——官方 skill 仓库（`https://raw.githubusercontent.com/<org>/<repo>/main/skills/<name>/SKILL.md` 及其 `references/`）、GitHub API 列目录（`https://api.github.com/repos/<org>/<repo>/contents/<path>`）。客户端渲染页面（正文抓不到）去 raw 源或 assets 里的 `*.lean.js` 找。

**洗稿红线**：不照抄参考材料的结构顺序。用自己的叙事结构，叙事方式按方向定（技术类：痛点→完整实操→工具展示→进阶→观点；测评类：背景→上手体验→优缺点→适用人群→结论；观点类：现象→分析→立场→讨论；随笔类：故事→方法→感悟），内容是原创场景化改写。

### 2. 出计划（硬停顿，先确认再写）

用户偏好先计划后实施。计划包含：

- **定位**：读者是谁、要解决什么
- **标题候选 2-3 个**（clarify 多选让用户挑）
- **结构大纲**：按方向定（见上），技术教程要含完整步骤（含易漏的"第 0 步"）和工具/插件展示
- **目标字数**（一般 2800-3500）
- **配图方案**：位置/类型/比例/角色动作（按方向，见第 4 节）
- 说明哪些内容来自关联材料（防洗稿的原创化策略）

用 `clarify` 确认标题 + 结构后再动笔。用户可能在这个节点提补充要求（如"增加选择主题的部分""增加链接"），记进内容检查清单。

### 3. 写作（去 AI 味）

加载 `humanizer` 技能，按它的 34 条模式自查。核心纪律：

- 无"首先/其次/总的来说/值得注意的是"，无 emoji 标题，无排比三连
- 第一人称 + 具体场景 + 真实感受（"我让 AI 出过候选…"）
- 句子长短交错，保留口语词（倒腾、好使、稳得多）
- 技术类：代码块前 2-3 句口语化"为什么这样做"，代码块后补踩坑经验
- 文末互动引导（如"你平时用什么工具…评论区聊聊"）

**内容检查清单（用户常见期望，写时逐项核对）**：
- [ ] 按方向结构完整（技术教程要有 step by step，含第 0 步"先定主题"这类被忽略的环节）
- [ ] 工具/教程类：工具/插件展示和使用环节（如 VS Code 插件：安装→界面→功能→配置）
- [ ] 用户要求"增加链接"时：文末放官方资源链接列表（官网/文档/仓库/插件市场），只放官方链接
- [ ] 配图位置预留
- [ ] 清单/对比/工具类内容用表格呈现

### 4. 配图方案（按方向）

- **技术教程 / 带个人 IP 的文章** → 加载 `personal-ip-skill` 获取形象锁定段唯一真源，读 `/Users/ryanuo/dev/skills/skills/ryanuo-ip-skill/SKILL.md`，用 RYANUO 插画：
  - **公众号封面 → 2.35:1（900×383）**，prompt 第一句 HORIZONTAL，关键内容放中心安全区
  - 解释图（流程/对比）→ 4:3，角色小（~15%）嵌入结构当行动者
  - 情绪图（封面/结尾）→ 4:3，角色大（40-60%）
  - 形象锁定段**原样复制不改写**；胸前 "Ryanuo" 手写字保留；同墨同线、配色 MUTED；中文标注 2-8 字
- **真实 UI/软件截图类** → 不用 AI 生图（AI 画真实界面必失真），留"截图占位"说明让用户本地截
- **其他方向** → 与用户确认配图方式（截图 / 无图 / 插画 / 照片）

**交付格式（用户 2026-08 明确要求）**：prompt 直接内嵌在文章占位处，方便用户复制生图和随手调整：

````markdown
> 📍 图片占位 1 · 封面图（2.35:1 公众号封面，生成后替换本块）

```text
Generate one standalone 2.35:1 horizontal Chinese article cover banner...
```

````

### 5. 审核（发布前必跑）

加载 `yuwen-publish-precheck`：

```bash
cd ~/.hermes/skills/yuwen-publish-precheck && python3 scripts/scan.py --file <文章.md>
```

- 词面预检 + 语义判定（G01-G14 逐条核对）
- **重点查 MY-01（防 AIGC 误判）**：标题痛点/利益点、开头个人化引入、内容里有人味信号（个人经历/观点/口语化解释）、文末互动引导——缺哪项补哪项
- 报告存档 `data/history/YYYY-MM-DD-标题.md`
- 公众号偏好：避免外部链接（尤其 X/Twitter）；用户明确要求保留链接时只放官方链接

### 6. 同步 ryanuo.cc（用户要求时）

加载 `personal-site-i18n`。文章放 `pages/zh/posts/<slug>.md`：

- frontmatter：`title` / `date: "YYYY-MM-DD HH:MM"`（带引号）/ `cate`（技术或笔记，按内容定）/ `description` / `plum: true`
- 正文 `[[toc]]` 开头；**正文无 H1**（H1 来自 title，站点工具会报 "Unexpected additional H1"）
- 技术笔记类 zh-only，不配 en pair
- 图片占位用 HTML 注释 `<!-- 图片占位 N：… -->`（网站版不放 prompt，prompt 只在公众号版）

### 7. 交付

- 展示全文 + 字数确认（用户偏好：生成后展示全文+字数）

## 坑

- `.dev` TLD 页面 curl 偶发 exit 35 握手失败 → 加 `--tlsv1.2 --connect-timeout 15` 重试
- 客户端渲染文档页（VitePress 新版）正文在 JS 里，直接抓 HTML 只有骨架 → 找 raw.githubusercontent 源或 GitHub API
- 参考页极薄（几百字）不代表没内容可写 → 去官方 skill 仓库/配套文档补，但补的材料要消化成自己的话，不照抄
- 用户仓库 skill 只能用 `write_file`/`patch` 改（`skill_manage` 会被拒）
- 配图方案按文章方向定：技术/IP 文用 RYANUO 插画（封面 1 + 结构图 1-2 + 对比图 + 结尾情绪图，别贪多）；真实界面用截图；其他方向先问用户
- 用户说"用上面生成的提示词来替换占位图" → prompt 内嵌交付，不是单独文件
- 用户没说文章方向时**不要默认技术教程**，先 clarify 问方向（这是用户 2026-08 的明确要求）
