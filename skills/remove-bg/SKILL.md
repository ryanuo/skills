---
name: remove-bg
description: 图片去白底/去纯色背景+自动裁剪透明边缘。Use when 用户要"去白底/去背景/透明背景/抠图/切掉多余空白"。
---

# 图片去背景 + 自动裁剪

## 触发场景
用户要求给图片"去白底 / 去背景 / 透明背景 / 抠图 / 去掉四周空白"，输入一张图片路径。

## 工作流
1. **先看原图**：用 PIL 读尺寸/模式；统计四角颜色 + 近白像素占比，判断背景是否纯白/接近白
   - 若背景不是白色（彩底/黑底/复杂背景），本 skill 的阈值法不适用，改用 rembg 或说明限制
2. **去背景**：基于「像素距白色的距离」`d = min(r,g,b)` 计算 alpha：
   - `d >= HI` → alpha=0（纯白背景）
   - `d <= LO` → alpha=255（主体）
   - 中间线性过渡（保留抗锯齿边缘，避免白圈）
   - 默认 `LO=200, HI=248`
3. **清微透明残留**：alpha < 10 置 0（JPEG 压缩会产生大量 alpha≈0-6 的伪像素，不清会污染裁剪边界）
4. **裁剪**：`Image.getbbox()` 按 alpha>0 的包围盒裁掉上下左右空白
5. **保存**：PNG（透明通道必需，不能存 JPEG）
6. **验证（必须）**：
   - 打印：完全透明占比、半透明占比、四边最外圈 alpha>10 像素数（应 ≈0，若有残留说明阈值或裁剪问题）
   - 主体内部镂空也应透明（去背景后镂空处 alpha=0）
   - 边缘少量半透明像素是抗锯齿，属正常；若上边缘某段是浅灰渐变，那是主体本身不是残留

## 脚本
`scripts/remove_bg.py` — 用法见脚本 `--help`：
```bash
python3 scripts/remove_bg.py 输入图片 [输出png] [--lo 200] [--hi 248] [--clean 10] [--pad 0]
```
三种模式：默认(去背景+裁剪) / `--crop-only`(只裁剪不透明化，按 alpha 或非白像素找边界) / `--no-crop`(只去背景不裁剪)；`--pad` 控制裁剪边距。

## 铁律
- 输出必须 PNG（透明通道），用户给 JPEG 也先转 RGBA 再处理
- 去背景 ≠ 填色：用户说"去背景"指透明；若用户实际要换底色（如填纯黑），先确认目标色再处理，不能擅自改 alpha 逻辑
- macOS「预览」App 默认把透明区域显示成白色，用户说"还是白底"时先验证 alpha 通道（84%+ 全透明即成功），再引导用户用浏览器/设计软件查看，不要重复处理
- 处理脚本放独立 venv 跑（Hermes 自带 venv 的 PIL 可能损坏，报 `cannot import name '_imaging'`）；本机可用 `/tmp/imgvenv`（uv 创建，已装 pillow+numpy），记得 `env -u PYTHONPATH` 避免系统 site-packages 污染

## Pitfalls
- `uv run --with pillow` 可能继承坏 venv 的 PYTHONPATH，导致装好也用不了；先 `uv venv /tmp/imgvenv` + `uv pip install --python /tmp/imgvenv/bin/python pillow numpy`，再用 `env -u PYTHONPATH /tmp/imgvenv/bin/python` 跑
- getbbox 前必须清 alpha<10 的残留，否则 JPEG 压缩的微白像素会把裁剪边界撑大一圈
- 主体内部白色像素 ≠ 背景：先量化主体颜色分布判断（深色主体+白色背景 → 白色全透明；白色主体 → 阈值法会挖空主体，需换方案）
- `python -c "...&..."` 或 heredoc 里带裸 `&` 会被 Hermes 判定为后台命令拒绝 → 改用 `write_file` 写脚本再执行
- RGBA numpy 数组是 4 通道，`a[0,0]` 解包要 4 个值；只取 RGB 用 `a[..., :3]`
- vision API 不可用时不阻塞：用 numpy 像素统计（颜色量化聚类、边缘采样）做等价验证
