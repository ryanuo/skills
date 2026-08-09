# 公众号封面提示词模板（视觉总监风 + RYANUO IP）

> 来源：用户提供的"高级商业科技媒体视觉总监"封面模板 × RYANUO 个人 IP 融合。
> ⚠️ **形象锁定段与 `ryanuo-ip-skill/SKILL.md` 唯一真源保持同步**——若 ryanuo-ip-skill 的形象描述更新，此处必须同步改，禁止两处漂移。
> 用途：写公众号文章配图方案时，封面图直接复制本模板，填 `{{标题}}` 即可。

```text
你是一位高级商业科技媒体的视觉总监。请根据下面的主题，生成一张高级、极简、可读的编辑视觉封面，由个人 IP 角色 RYANUO 出演。

【输入】
主题 / 标题：{{填写完整标题}}
画幅比例：2.35:1（900 × 383 像素，微信公众号封面；关键内容居中，上下安全区会被裁切）

【核心创作任务】
先理解标题背后真正要表达的关系、变化、动作或结果。
然后，把这个主题转译成右侧一个"可读但不直白"的抽象实体意象：
- 它必须由一个清晰的核心动作构成，例如连接、汇聚、对齐、推进、拆解、穿透、折叠、平衡、转化、生长或跨越。
- 画面中的物体需要有明确的隐喻关系，让观众即使不看标题，也能感到它在表达"某件事正在发生"。
- 右侧只讲一个视觉故事，使用少量精确的物体，不堆砌概念。
- 不要把主题直接画成图标、插画说明书或字面场景；要把它做成一个有材质、有结构、有动作的抽象小型装置。

【IP 角色 RYANUO】（唯一允许出现的人物）
IP: RYANUO — a cute chibi Q-version cartoon character, round baby face with light pink-peach cheek blush, small round black dot eyes, thin straight eyebrows, fluffy black short hair with side-swept bangs and a few upward spikes on top. Wearing off-white short-sleeve round-neck T-shirt with hand-drawn black "Ryanuo" text across the center front, light sky-blue relaxed straight-leg jeans, black-and-white low-top sneakers, and a black-strap square smartwatch on left wrist.
- RYANUO 以小比例（约 15–25%）出现在装置旁，与装置发生关键动作，例如调整、连接、推进、观察或完成最后一步。只作为尺度和行动感，不抢走主题。
- RYANUO 以扁平矢量线条呈现，与装置的哑光石墨材质同墨同线（same line weight, flat, no 3D / no realism）；胸前手绘 "Ryanuo" 字样必须保留。
- RYANUO 的签名色（米白 T 恤、浅蓝牛仔、浅粉腮红）压低饱和，融入石墨黑 / 炭灰 / 低饱和墨绿体系，MUTED。
- 如果 RYANUO 会让主题变得多余或俗套，可以只保留其存在痕迹（如推过的手柄、刚连好的模块），不画完整角色。

【固定视觉语言】
- 整体气质：高级商业编辑视觉、现代瑞士平面设计、克制的科技杂志感。
- 背景：暖白、米白、略带细微纸张纹理。
- 配色仅限：暖白、石墨黑、炭灰、低饱和半透明墨绿色。
- 材质：哑光石墨金属、精密黑色模块、磨砂半透明绿色玻璃、柔和自然阴影。
- 构图必须安静、精确、有大量留白，像一件被摆进画廊的编辑雕塑。
- 禁止赛博朋克、霓虹、蓝紫渐变、机器人、AI大脑、芯片、科幻城市、复杂仪表盘、满屏 UI、家居风、廉价 3D、夸张光效。
- 禁止除 RYANUO 之外的任何卡通、写实人物、吉祥物或动物角色。

【排版】
- 标题必须逐字准确使用：{{再次粘贴完整标题}}
- 标题使用高级中文无衬线字体，深石墨色；可自动挑选标题中最关键的一个词或数字，使用低饱和墨绿色强调。
- 横向比例（2.35:1）：标题在左，抽象意象 + RYANUO 在右；标题约占 50%–55%，意象约占 40%–45%。
- 根据标题长度自动断行，确保中文清晰、无错别字。
- 除标题外，不要生成任何可读文字、Logo、水印、副标题、边框或装饰性小字（RYANUO 胸前手绘 "Ryanuo" 除外）。
```

## 使用注意

- 画幅已写死 2.35:1（900×383），删掉了模板原版的 5:2 / 16:9 / 1:1 / 4:5 自由选项——公众号封面固定用这个
- 若用户要求非封面配图（正文解释图/情绪图），回到 ryanuo-ip-skill 的四段式 prompt，不用本模板
- 用 `scripts/generate.py` 生图时，prompt 文件 YAML 头写 `aspect_ratio: "2.35:1"`，脚本会自动 sips 裁剪缩放为 900×383
