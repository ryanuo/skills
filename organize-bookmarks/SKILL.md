---
name: organize-bookmarks
description: Organize exported browser bookmarks into concise Chinese tagged folders and shortened bookmark names. Use when the user provides Chrome/Edge/Netscape bookmark HTML files, asks to整理书签, classify bookmark tags, shorten bookmark titles, remove exact duplicates, isolate dead/local/session links, or generate an importable reorganized bookmarks HTML.
---

# Organize Bookmarks

## Workflow

1. Read the user's exported bookmark HTML. Chrome and Edge exports usually use the Netscape bookmark format.
2. Preserve the original file; generate new artifacts instead of overwriting the source.
3. Run `scripts/organize_bookmarks.js` to create:
   - a cleaned, importable bookmark HTML
   - a Markdown summary
   - a CSV inventory
4. Tell the user that browsers import HTML bookmark files, not CSV.
5. If the user wants live link checking, run a separate network check only after approval when network access requires it. Treat command-line failures as review candidates, not automatic delete decisions.

## Default Tags

Use these top-level folders unless the user gives a different taxonomy:

- `常用`
- `AI`
- `开发`
- `学习`
- `工具`
- `博客`
- `娱乐`
- `其他`
- `归档待清理`

Use these common subfolders:

- `常用`: `邮箱`, `账号后台`
- `AI`: `模型`, `API`, `图片`, `网络`
- `开发`: `前端`, `面试算法`, `代码托管`, `Linux`, `STM32`
- `学习`: `论文`, `编程`, `考试`
- `工具`: `在线`, `设计`, `部署图床`, `导航`
- `博客`: `Hexo`, `运营`, `素材`
- `娱乐`: `影视`, `动漫漫画`
- `归档待清理`: `失效候选`, `本地旧路径`, `登录态链接`, `旧资料`

## Naming Rules

Shorten bookmark titles conservatively:

- Keep recognizable product names and purpose words.
- Remove source suffixes such as `- 掘金`, `- CSDN博客`, `| 知乎`, `- GitHub`.
- Remove SEO filler such as `专业`, `最新`, `最全`, `免费下载`, `官网`, `一站式`.
- Prefer clear short names like `Gmail`, `腾讯云域名`, `前端面试题`, `网易云API`.
- Do not shorten so aggressively that unrelated bookmarks collapse into the same ambiguous name.

## Script

Run:

```bash
node /path/to/organize-bookmarks/scripts/organize_bookmarks.js input.html output-dir
```

Optional third argument:

```bash
node scripts/organize_bookmarks.js input.html output-dir path/to/bookmark_link_check.json
```

When a link-check JSON is provided, URLs marked `dead` are routed to `归档待清理/失效候选`.

## Safety

- Do not edit the user's live browser bookmarks directly.
- Do not delete original exports.
- Put risky links in `归档待清理` instead of silently dropping them.
- Exact duplicate URLs may be de-duplicated in the generated draft; mention this in the summary.
