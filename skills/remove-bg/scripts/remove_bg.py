#!/usr/bin/env python3
"""图片去白底(变透明) + 自动裁剪透明边缘。

用法:
    remove_bg.py 输入图片 [输出png] [选项]

模式(默认 = 去背景 + 裁剪):
    --crop-only   只裁剪边缘, 不透明化(适用于已有透明图或只想切白边)
    --no-crop     只去背景, 不裁剪(保留原始画布尺寸)

选项:
    --lo 200      低于此"距白色距离"视为主体(不透明)
    --hi 248      高于此视为背景(透明)
    --clean 10    alpha 低于此值置 0(清 JPEG 压缩残留)
    --pad 0       裁剪时四周额外保留的像素边距

依赖: pillow, numpy
"""
import argparse
import sys
from pathlib import Path

try:
    from PIL import Image
    import numpy as np
except ImportError as e:
    print(f'缺少依赖: {e}\n请先安装: pip install pillow numpy', file=sys.stderr)
    sys.exit(1)


def _expand_bbox(bbox, pad, w, h):
    l, t, r, b = bbox
    return (max(0, l - pad), max(0, t - pad), min(w, r + pad), min(h, b + pad))


def crop_only(img, clean=10, pad=0, verbose=True):
    """只裁剪: 用 alpha(已有透明图) 或 非白像素 找包围盒, 不改 alpha."""
    a = np.array(img)
    al = a[..., 3].astype(int)
    r, g, b = a[..., 0].astype(int), a[..., 1].astype(int), a[..., 2].astype(int)
    is_bg = (al <= clean) | ((r > 240) & (g > 240) & (b > 240))
    rows = np.any(~is_bg, axis=1)
    cols = np.any(~is_bg, axis=0)
    if not rows.any() or not cols.any():
        print('警告: 未找到主体内容, 原样输出', file=sys.stderr)
        return img
    ys = np.where(rows)[0]
    xs = np.where(cols)[0]
    bbox = _expand_bbox((int(xs[0]), int(ys[0]), int(xs[-1]) + 1, int(ys[-1]) + 1), pad, img.width, img.height)
    if verbose:
        print(f'裁剪边界: {bbox}  (原图 {img.size})')
    return img.crop(bbox)


def remove_bg(src, dst, lo=200, hi=248, clean=10, pad=0, crop_only_mode=False, no_crop=False, verbose=True):
    img = Image.open(src).convert('RGBA')

    if crop_only_mode:
        out = crop_only(img, clean=clean, pad=pad, verbose=verbose)
        out.save(dst)
        if verbose:
            print(f'已保存(仅裁剪): {dst}  新尺寸: {out.size}')
        return out

    a = np.array(img).astype(np.float64)
    r, g, b = a[..., 0], a[..., 1], a[..., 2]

    # 距白色距离 = 最接近白色的通道值
    d = np.minimum(np.minimum(r, g), b)
    alpha = np.clip((hi - d) / (hi - lo) * 255, 0, 255)
    alpha[alpha < clean] = 0  # 清微透明残留
    a[..., 3] = alpha

    out = Image.fromarray(a.astype(np.uint8), 'RGBA')
    if no_crop:
        out.save(dst)
        if verbose:
            print(f'已保存(去背景,不裁剪): {dst}  新尺寸: {out.size} (未裁剪)')
        return out

    bbox = out.getbbox()
    if pad:
        bbox = _expand_bbox(bbox, pad, out.width, out.height)
    if verbose:
        print(f'背景透明化后边界: {bbox}  (原图 {img.size})')
    out = out.crop(bbox)
    out.save(dst)
    if verbose:
        print(f'已保存: {dst}  新尺寸: {out.size}')
    return out


def verify(out, verbose=True):
    a = np.array(out)
    al = a[..., 3]
    total = al.size
    full_transparent = (al == 0).sum() / total * 100
    partial = ((al > 0) & (al < 255)).sum() / total * 100
    if verbose:
        print(f'完全透明: {full_transparent:.1f}%  半透明(抗锯齿): {partial:.2f}%')
        for name, sl in [('上', al[0, :]), ('下', al[-1, :]), ('左', al[:, 0]), ('右', al[:, -1])]:
            print(f'{name}边最外圈 alpha>10 像素: {(sl > 10).sum()}')
    return full_transparent, partial


def main():
    ap = argparse.ArgumentParser(description='图片去白底 + 自动裁剪')
    ap.add_argument('src', help='输入图片路径')
    ap.add_argument('dst', nargs='?', help='输出 PNG 路径(默认同目录 *_transparent.png)')
    ap.add_argument('--lo', type=int, default=200, help='主体阈值, 默认 200')
    ap.add_argument('--hi', type=int, default=248, help='背景阈值, 默认 248')
    ap.add_argument('--clean', type=int, default=10, help='微透明清理阈值, 默认 10')
    ap.add_argument('--pad', type=int, default=0, help='裁剪时四周保留边距(px), 默认 0')
    mode = ap.add_mutually_exclusive_group()
    mode.add_argument('--crop-only', action='store_true', help='只裁剪不透明化')
    mode.add_argument('--no-crop', action='store_true', help='只去背景不裁剪')
    args = ap.parse_args()

    src = Path(args.src)
    if not src.exists():
        print(f'文件不存在: {src}', file=sys.stderr)
        sys.exit(1)
    dst = Path(args.dst) if args.dst else src.with_name(src.stem + '_transparent.png')

    out = remove_bg(src, dst, lo=args.lo, hi=args.hi, clean=args.clean, pad=args.pad,
                    crop_only_mode=args.crop_only, no_crop=args.no_crop)
    verify(out)
    print(f'完成: {dst}')


if __name__ == '__main__':
    main()
