# wechat-article-workflow · 微信公众号技术文章工作流

基于参考页面/主题写一篇公众号技术文章的全流程：分析 → 计划 → 去 AI 味写作 → RYANUO 占位图 prompt → 发布前审核 → （可选）同步网站 → 交付。

> 来源：2026-08 从 Slidev 文章实例沉淀（cn.sli.dev/guide/work-with-ai → 公众号文章 + ryanuo.cc 同步）

## 什么时候用

- 给了参考页面 URL，想基于它写一篇公众号文章
- 有主题没文章，想写成公众号风格的技术分享

## 使用步骤

1. **给素材**：把参考页面 URL 或主题告诉 AI（如"先分析这个页面 https://… 再写一篇公众号文章"）
2. **AI 出计划**：AI 会先给文章计划（标题候选、结构大纲、字数、占位图清单），你确认标题和结构
   - 这步可以提补充要求：增加完整步骤 / 加插件展示环节 / 加链接 / 调整章节
3. **写正文**：AI 按确认的计划写，自动去 AI 味（第一人称、口语化、无套路话）
4. **占位图 prompt**：AI 用 ryanuo-ip-skill 生成 RYANUO 配图的英文 prompt，直接内嵌在文章对应位置，你复制去生图工具即可，想调整直接改 prompt
   - 封面 2.35:1（900×383），文中解释图 4:3，结尾情绪图 4:3
   - 我自己本地操作
5. **审核**：AI 跑发布前自审（yuwen-publish-precheck），给你结论和修改建议，缺互动引导会补上
6. **交付**：完整版存桌面 `xxx-公众号版.md`，图片生成后替换占位块就能发布
   - 需要同步到 ryanuo.cc 的话跟 AI 说一声，会一并处理

## 手动命令

```bash
# 发布前审核（AI 会自动跑，也可自查）
cd ~/.hermes/skills/yuwen-publish-precheck && python3 scripts/scan.py --file <文章.md>

# 网站同步后验证
cd ~/dev/github/ryanuo.cc && pnpm run build
```

## 规则要点

- 先计划后动笔，标题要你确认
- 不洗稿：用自己的叙事结构，不照抄官方文档顺序
- 文章避免外部链接（尤其 X/Twitter）；要加就只加官方资源链接
- 占位图用 RYANUO IP，prompt 内嵌在文章里方便调整
- 发布前必跑审核，报告留档
- 网站版：frontmatter + `[[toc]]` + 正文无 H1，技术文章只写中文
