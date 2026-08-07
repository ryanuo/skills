# ryanuo-ip-skill · RYANUO 个人 IP 配图

为技术文章 / PPT / 公众号配图，生成由个人 IP 角色 RYANUO 出演的英文 prompt 或图片。自带 11 张形象锚点图（基础立绘/线稿/比耶/读书/饮品/猫/电脑书包等）。

## 什么时候用

- 写技术文章、公众号、PPT 时需要配图，想让固定卡通角色 RYANUO 出演
- 需要"流程图/对比图/机制示意图 + 角色"的组合
- 说"结合 IP 生成配图""RYANUO 配图""生成带角色的示意图"即可触发

## 使用步骤

1. **给主题**：告诉 AI 配图要表达的内容（如"shared_ptr 循环引用三个 Node 互相指向"）
2. **选输出形态**：AI 会先问你这次要**图片**还是**提示词**
   - **图片** → 需要先配置 API key（见下），AI 直接出图
   - **提示词** → 只交付可直接复制的英文 prompt，自己拿去 GPT-image-2 / Midjourney / 即梦 生图
3. **AI 判定图类型**：
   - 解释图（流程/对比/机制）→ 角色小（~15%）嵌入结构当行动者
   - 情绪图（封面/结尾/态度）→ 角色可以大（40-60%）
4. **交付**：prompt 或图片，附带角色动作说明

### 生图配置（可选）

```bash
cd skills/ryanuo-ip-skill

# 初始化（key 可不填！直接回车跳过，默认走生成提示词模式）
python3 scripts/illo.py init

# 自检：当前模式（提示词/生图）/ 素材库 / 脚本是否就绪
python3 scripts/illo.py doctor
```

- **key 不填也 OK**：默认【生成提示词】模式，只交付 prompt，自己拿去生图
- 需要 AI 直接出图时：重跑 `init` 填 key（支持任何 OpenAI 兼容端点，key 只存本地）

## 手动命令

```bash
# 需要图片时（在 ryanuo-ip-skill 目录下）
python3 scripts/generate.py \
  --prompt-file <p.md> \
  --reference reference/assets/ip/RYANUO人物.png \
  --out <输出路径>
```

- prompt 文件 = YAML 头 `aspect_ratio`（如 `"4:3"`）+ 正文 prompt
- 支持任何 OpenAI 兼容图像端点，默认 `gpt-image-2`

## 规则要点

- 形象描述是唯一真源，**原样复制不改写**（防止角色漂移）
- 胸前手绘 "Ryanuo" 字样是唯一品牌元素，必须保留
- 解释图角色必须小、同墨同线、配色压低饱和
- 比例：对比/流程横排 `4:3`（移动端封顶），竖内容 `3:4`，单概念 `1:1`
- 中文标注 2-8 字；不添加素材库没有的新道具
- 新素材图按 `RYANUO人物<场景>.png` 命名放进 `reference/assets/ip/`，已有图不删不改名

## 素材库

11 张锚点图位于 `reference/assets/ip/`，默认用 `RYANUO人物.png` 做 reference，场景匹配优先（读书类→读书图）。
