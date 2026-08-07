# organize-bookmarks · 书签整理

把导出的浏览器书签 HTML 自动分类、清洗标题、去重，生成可重新导入的 HTML。

## 什么时候用

导出了浏览器书签（Chrome/Edge/Firefox 的 `bookmarks.html`），想整理分类、缩短标题、去掉重复项。

## 使用步骤

1. **导出书签**：浏览器书签管理器 → 导出为 HTML 文件（如 `bookmarks.html`）
2. **让 AI 跑 skill**：把书签文件路径告诉 AI，说"用 organize-bookmarks 整理我的书签"，AI 会：
   - 运行 `node scripts/analyze_bookmarks.js <input.html>` 采样分析
   - 生成分类配置 `scripts/config.js`（5-12 个顶层分类，按优先级排序）
   - 运行 `node scripts/organize_bookmarks.js <input.html> <output-dir>` 执行整理
3. **拿结果**：输出目录里得到
   - `bookmarks_clean_names.html` —— 可重新导入浏览器
   - `bookmark_summary.md` —— 整理摘要
   - `bookmark_inventory.csv` —— 全量清单（仅供人工审阅，浏览器只认 HTML）

## 手动命令

```bash
cd skills/organize-bookmarks

# 采样分析（AI 配置阶段）
node scripts/analyze_bookmarks.js <input.html>

# 执行整理
node scripts/organize_bookmarks.js <input.html> <output-dir> [link-check.json]
```

## 规则要点

- 自动推断 5-12 个顶层分类，合并高度相似的文件夹
- 保守缩短标题：去掉网站后缀（`- GitHub`）、SEO 填充词（`官网`/`最新`），保留产品名/仓库名
- 只删完全相同的 URL；`localhost`、`file://`、过期链接移入"归档待清理"
- **永远不永久删除任何书签**
