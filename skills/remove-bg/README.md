# remove-bg：图片去白底 + 自动裁剪

给图片去掉白色背景（变透明），并自动裁掉上下左右多余空白。

## 什么时候用
- 图片是白底/近白底，想把背景变透明（做 logo、贴图、头像）
- 图片四周有大片空白，想一键裁掉

## 使用步骤
```bash
# 基本用法：输入图片 → 输出同名 _transparent.png（去背景 + 自动裁剪）
python3 scripts/remove_bg.py 你的图片.png

# 指定输出路径
python3 scripts/remove_bg.py 你的图片.png 输出/logo.png

# 只裁剪不透明化（已有透明图想切边，或只想裁掉四周白边）
python3 scripts/remove_bg.py 你的图片.png --crop-only

# 只去背景不裁剪（保留原始画布尺寸）
python3 scripts/remove_bg.py 你的图片.png --no-crop

# 裁剪时四周保留边距（px）
python3 scripts/remove_bg.py 你的图片.png --pad 10

# 调阈值（一般不用动）
python3 scripts/remove_bg.py 你的图片.png --lo 200 --hi 248
```

输出必须是 PNG（透明背景），不支持存成 JPG。

## 效果
- 白色背景 → 完全透明
- 主体边缘 → 平滑过渡（抗锯齿，无白圈）
- 主体内部镂空 → 也变透明
- 上下左右空白 → 自动裁掉

## 注意事项
1. 只适用于**白底/近白底**图片；彩色背景、复杂背景不支持，需要另用 AI 抠图工具（rembg 等）
2. macOS「预览」打开透明 PNG 会显示成白底，属正常现象——用**浏览器**或**设计软件**（Figma/PS/微信）看才是透明效果
3. 阈值参数 `--lo/--hi`：背景带轻微阴影时把 `--hi` 调低（如 240）；主体含浅色部分时把 `--lo` 调低
4. 依赖：Python 3 + pillow + numpy（首次运行按脚本提示安装即可）

## 脚本位置
`scripts/remove_bg.py`（本 skill 目录下）
