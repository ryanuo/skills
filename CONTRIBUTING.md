# 贡献指南

欢迎向本仓库贡献新的 skill 或改进现有 skill。本仓库的维护规约如下,请先阅读再动手。

## 仓库结构

```
skills/
└── <skill-name>/          # 每个 skill 一个目录,命名小写连字符
    ├── SKILL.md           # 技能定义:frontmatter + 工作流 + 规则(AI 执行时加载)
    ├── README.md          # 用户使用文档:什么时候用/使用步骤/手动命令/规则要点
    ├── scripts/           # 可选:可执行脚本
    └── reference(s)/      # 可选:素材/参考文件(锚点图、示例等)
```

## 新增 skill 流程

1. `skills/<name>/` 建目录,命名小写连字符(如 `organize-bookmarks`)
2. 写 `SKILL.md`:
   - frontmatter 必填 `name` + `description`,触发词放进 description 前 57 字符内
   - 正文只放工作流 + 规则,不放面向用户的"什么时候用/使用步骤"
   - 不写来源标注/沉淀出处(来源信息会误导 AI 当成时效或示例约束)
   - 从具体案例沉淀的 skill 要泛化到类别层面;输入方向不明确时,工作流第一步先询问用户方向,不默认
3. 写 `README.md`:用户视角完整使用文档(什么时候用/使用步骤/手动命令/规则要点)
4. 根 `README.md` 目录表加一行(Skill | 用途 | 使用文档)
5. 若新 skill 依赖其他 skill 的脚本:直接移植进本 skill `scripts/`,配置路径用独立命名(`~/.config/<skill-name>/`),保证删掉被依赖 skill 后仍独立可用

## 文档职责划分(历史纠正沉淀,勿再犯)

| 文件 | 职责 | 读者 |
|---|---|---|
| `SKILL.md` | 技能定义:frontmatter(name/description 含触发词) + 工作流 + 规则/铁律 | AI 执行时加载 |
| `README.md`(skill 内) | 用户使用文档:什么时候用 / 使用步骤 / 手动命令 / 规则要点 | 人类用户 |
| 根 `README.md` | 只做目录索引表,不放详细使用步骤 | 浏览仓库的人 |

历史纠正路径:使用步骤先误放进 SKILL.md → 被纠正;再误放进根 README.md → 被纠正;最终方案 = 每 skill 自带 README.md。

## 验证

- 文档改动:`grep -n "^## "` 确认章节结构符合约定
- 脚本改动:`python3 -m py_compile scripts/*.py` + 函数级 ad-hoc 验证(不碰真实 API)
