# Skills 仓库

个人 AI skills 集合 —— 为 AI 代理沉淀可复用的工作流与规则,每个 skill 一个目录,含 `SKILL.md`(技能定义,给 AI)+ `README.md`(使用文档,给人)+ 可选脚本/素材。

## 目录

| Skill | 用途 | 使用文档 |
|---|---|---|
| [organize-bookmarks](./skills/organize-bookmarks) | 浏览器书签整理 | [README.md](./skills/organize-bookmarks/README.md) |
| [ryanuo-ip-skill](./skills/ryanuo-ip-skill) | RYANUO 个人 IP 配图 | [README.md](./skills/ryanuo-ip-skill/README.md) |
| [wechat-article-workflow](./skills/wechat-article-workflow) | 微信公众号文章全流程（方向先询问） | [README.md](./skills/wechat-article-workflow/README.md) |
| [remove-bg](./skills/remove-bg) | 图片去白底/去背景 + 自动裁剪 | [README.md](./skills/remove-bg/README.md) |

## 目录结构

```
skills/
└── <skill-name>/
    ├── SKILL.md       # 技能定义(frontmatter + 工作流 + 规则),AI 执行时加载
    ├── README.md      # 用户使用文档
    ├── scripts/       # 可选:可执行脚本
    └── reference(s)/  # 可选:素材/参考文件
```

## 贡献

新增或改进 skill 请先阅读 [CONTRIBUTING.md](./CONTRIBUTING.md)。

## License

[MIT](./LICENSE)
