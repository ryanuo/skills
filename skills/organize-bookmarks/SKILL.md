---
name: organize-bookmarks
description: Organize exported browser bookmarks into categorized folders, shorten bookmark titles, remove exact duplicates, and generate an importable bookmark HTML.
---

# Organize Bookmarks

## Workflow

1. **AI 配置生成阶段** (首次使用或规则变更时):
   - 运行采样命令: `node scripts/analyze_bookmarks.js <input.html>`
   - 将终端输出的 JSON 数据提供给 AI，并附带以下 Prompt：
     > "请根据我提供的书签样本，生成一个完整的 `config.js` 文件。要求：自动推断 5-12 个顶层分类；生成域名品牌映射 (domainBrands)、标题清洗正则 (titleAliases) 和分类规则引擎 (categorizationRules)；确保分类规则按优先级排序，并将默认兜底规则放在最后。"
   - 将 AI 生成的代码保存为 `scripts/config.js`。

2. **执行整理阶段**:
   - 运行整理命令: `node scripts/organize_bookmarks.js <input.html> <output-dir> [link-check.json]`
   - 脚本将读取 `config.js` 并执行整理。

3. **输出与说明**:
   - 保留原始文件。
   - 生成 `bookmarks_clean_names.html`、`bookmark_summary.md`、`bookmark_inventory.csv`。
   - 明确告知用户：浏览器仅支持导入 HTML 格式的书签文件，CSV 仅供人工审阅。

4. **失效链接处理**:
   - 若提供 link-check 数据，自动将死链归入 `归档待清理/失效候选`。

## Classification Guidelines

- 自动推断分类，保持 5–12 个顶层文件夹。
- 常见分类：常用、工作、学习、开发、AI、工具、云服务、设计、娱乐、社交、购物、新闻资讯、归档待清理。
- 仅创建实际需要的分类，合并高度相似的文件夹，避免过度嵌套和单书签文件夹。

## Naming Rules

- 保守缩短标题。
- 移除：网站后缀 (`- GitHub`, `- Medium`)、SEO 填充词 (`官网`, `最新`, `最全`, `免费下载`)、重复的品牌名。
- 保留：产品名、项目名、仓库名、核心关键词。
- 示例：`GitHub - owner/repo` → `owner/repo`；`Vue3 Tutorial - Medium` → `Vue3 Tutorial`。

## Duplicate & Archive Rules

- 仅移除完全相同的 URL，不合并不同文章或文档。
- 将可疑书签移入归档：`localhost`、`file://`、过期链接、临时登录 URL。
- **永远不要永久删除任何书签。**

## Commands

- 提取样本供 AI 分析: `node scripts/analyze_bookmarks.js <input.html>`
- 执行书签整理: `node scripts/organize_bookmarks.js <input.html> <output-dir>