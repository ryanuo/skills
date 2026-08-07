---
name: ryanuo-ip-skill
description: 个人 IP 角色 RYANUO 形象资产库 + 配图 prompt 生成器。为技术文章/PPT 配图生成由 RYANUO 出演的提示词，锁定角色一致性。自带 11 张形象锚点图（基础立绘/线稿/比耶/读书/饮品/猫/电脑书包等）。当用户说"结合 IP 生成配图""RYANUO 配图""IP 人物配图""生成带角色的示意图/流程图/对比图"时使用。
version: 0.1.0
---

# RYANUO IP Skill · 个人 IP 配图资产

> 把 RYANUO（个人 IP 形象）的**形象锁定描述** + **锚点素材库** + **用法规范**打包成一个 skill。核心资产是形象锁定英文 prompt 段（可直接注入任何生图模型），素材图用于锁形（reference）。

## 角色定位

RYANUO = 用户个人 IP 的 Q 版卡通化身，出演技术文章 / PPT 配图中的固定角色。风格：扁平矢量、Notion 风、白底细线。**角色是"嵌入结构的行动者"，不是站旁边的讲解员。**

## 形象锁定（唯一真源，生图 prompt 的 IP 段直接抄这段）

```text
IP: RYANUO — a cute chibi Q-version cartoon character, round baby face with light pink-peach cheek blush, small round black dot eyes, thin straight eyebrows, fluffy black short hair with side-swept bangs and a few upward spikes on top. Wearing off-white short-sleeve round-neck T-shirt with hand-drawn black "Ryanuo" text across the center front, light sky-blue relaxed straight-leg jeans, black-and-white low-top sneakers, and a black-strap square smartwatch on left wrist.
```

要点速记（防形象漂移）：
- **脸**：圆脸、浅粉桃腮红、黑色圆点小眼睛、细直眉
- **头发**：蓬松黑色短发、侧分刘海、头顶几撮向上尖发
- **上衣**：米白圆领短袖，胸前**手绘黑色 "Ryanuo" 字样**（唯一品牌元素，必须保留）
- **下装/鞋**：浅天蓝宽松直筒牛仔裤 + 黑白低帮运动鞋
- **配饰**：左手腕黑色方形智能手表

## 素材库索引（reference/assets/ip/）

| 文件 | 用途 |
|---|---|
| `RYANUO人物.png` | **主锚点**：基础立绘，默认 reference 图 |
| `RYANUO人物线稿.png` | 线稿锁定（结构/比例参考） |
| `RYANUO人物比耶.png` | 情绪图：开心/成功/搞定 |
| `RYANUO人物读书.png` | 学习/阅读类场景 |
| `RYANUO人物饮品.png` | 咖啡/饮品/工作间隙场景 |
| `RYANUO人物电脑书包.png` | 程序员/开发/出差场景 |
| `RYANUO人物书包猫键盘.png` | 技术+宠物混搭场景 |
| `RYANUO人物猫.png` | 猫互动（主场景） |
| `RYANUO人物猫在左侧.png` | 猫在左的构图变体 |
| `RYANUO人物猫零食.png` | 猫+零食的轻松场景 |
| `RYANUO人物线打招呼.png` | 封面/开头打招呼场景 |

**选图规则**：默认传 `RYANUO人物.png` 作 reference；场景匹配优先（读书类→读书图）；一张图一张图地生，不拼图。

## 工作流

**用户给主题 → 先问输出形态（硬停顿）→ 判图类型 → 拼 prompt（形象段 + 场景段 + 风格段）→ 交付。**

### 0. ⛔ 先问输出形态（必须，不能跳）

拿到主题后**先停下来问用户**：这次要**图片**还是**提示词**？

- **图片** → 需要 API key 已配置（`scripts/illo.py doctor` 显示 key 已填），走生图流程
- **提示词** → 只交付可直接复制的英文 prompt，用户自己拿去生图

**未配置 key 时**：默认走提示词模式（这是 skill 的默认行为）。用户要图片但没 key，提示先跑 `init` 补 key，或改走提示词模式。

用户没说"你定"前不许默认，每次都要问。

### 1. 判图类型（按内容形状，不是按心情）

- **解释图**（流程/对比/关系/结构/机制）→ 角色**小（~15%）嵌入结构中当行动者**，比如推箭头、剪链条、修节点
- **情绪图**（态度共鸣/封面/结尾）→ 角色可以**大（40-60%）**，演表情、比耶、打招呼
- 技术文章 80% 是解释图，角色默认小，别把功能图画成角色戏

### 2. 拼 prompt（四段式）

```text
Generate one standalone {比例} horizontal Chinese article {图类型}: clean {图类型} diagram, NOT a character scene.

Theme: {技术主题一句话，回原文锁死关键部件/数字/步骤}

{形象锁定段，原样复制}
RYANUO is a SMALL WORKING PART of the structure — {这个主题里角色做什么动作}。Draw RYANUO in the SAME flat line-art / Notion-style flat vector as the boxes — same line weight, NO pencil shading / realism / 3D. Keep his signature colors MUTED. The diagram structure stays the main subject (~85%); RYANUO is embedded SMALL at ~15%, neutral focused expression, NOT a presenter standing aside.

STYLE: Flat minimalist vector / simple Notion-style illustration, clean black outlines, light solid white background, generous white space, evenly spaced, NOT cluttered.

Layout: {版式：左右对比/左到右流程/网格…}
{逐块写内容：节点、箭头、标签、配色，中文标注 2-8 字}
LABELS / COLORS / ASPECT 收尾
```

### 3. 比例与方向

- 对比图/流程横排 → `4:3`（移动端封顶，**不写 16:9**）
- 竖内容（阶梯/漏斗/单角色立姿）→ `3:4`
- 方/单概念 → `1:1`
- **公众号封面 → `2.35:1`（900×383）**：用户提到"公众号封面/微信封面"时用这个比例，prompt 第一句写 HORIZONTAL，并提示模型把关键内容放中心区域（上下会被裁）
- prompt 第一句的方向词必须和比例联动（HORIZONTAL↔4:3 / VERTICAL↔3:4），改漏会变形

### 4. 生图（自带脚本，纯标准库零依赖）

```bash
# 首次使用先配置 API key（可选！key 不填也能完成初始化，默认走生成提示词模式）
python3 scripts/illo.py init

# 自检：模式（提示词/生图）/ 素材库 / 脚本是否就绪
python3 scripts/illo.py doctor

# 生图（--reference 传锚点图锁角色；不传则文生图）—— 需 key 已填
python3 scripts/generate.py --prompt-file <p.md> --reference reference/assets/ip/RYANUO人物.png --out <输出路径>
```

**配置**：支持任何 OpenAI 兼容图像端点（base_url / model / api_key），默认 `gpt-image-2`（中文渲染最稳）。**key 可不填**——初始化时直接回车跳过，默认走【生成提示词】模式（只交付 prompt）；需要生图时重跑 `init` 补 key 即可。

**prompt 文件格式**（YAML 头 `aspect_ratio` 必填 + 正文）：

```markdown
---
aspect_ratio: "4:3"
---
Generate one standalone 4:3 horizontal Chinese article infographic: ...
```

- 文生图走 `/images/generations`，图生图走 `/images/edits`（gpt-image 系列）
- `aspect_ratio` 自动映射合法尺寸档：横 `1536x1024` / 竖 `1024x1536` / 方 `1024x1024`
- **`2.35:1`（公众号封面）**：生成横版后脚本自动用 sips 居中裁剪+缩放为 **900×383**，原图保留为 `*.full.*`
- 失败自动重试（sync 2 次 / task 3 次），不在挂掉的 API 上死磕
- 没有配置/不想用脚本时，交付 prompt 即可，用户自行拿去生图（GPT-image-2 / Midjourney / 即梦等均可，形象段是通用英文描述）

## 铁律（踩过的坑）

1. **形象段原样复制，不许改写**——每次重写都会漂移（头发/衣服/颜色细节变一点，角色就不像了）
2. **胸前 "Ryanuo" 手写字必须保留**——唯一品牌识别元素
3. **解释图角色必须小**——"角色演一个功能"长得像角色戏，但活是讲清功能，归解释轨，画大就抢戏
4. **同墨同线**——角色和框图同一线宽、同一扁平风格，不写实、不 3D、不铅笔阴影
5. **配色 MUTED**——角色签名色压低饱和，和框图融合，别让角色比内容扎眼
6. **不添加角色库没有的新道具**——素材图里没有的（如帽子/眼镜），不擅自给角色加
7. **中文标注 2-8 字**，颜色值是渲染指导，不显示为图中文字

## 扩展素材

新形象图生成后丢进 `reference/assets/ip/`，命名 `RYANUO人物<场景>.png`，并在素材库索引表补一行。已有图片不删除、不改名。

## 自修复

生图后角色不像 → 检查形象段是否被改写、reference 图是否传对；结构错了 → 回原文 grep 锁真实部件再重拼 prompt。
