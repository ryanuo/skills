#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""ryanuo-ip-skill CLI:init(填 key) / doctor(自检)。纯标准库。"""
from __future__ import annotations
import getpass, os, pathlib, sys

CONFIG_DIR = pathlib.Path(os.environ.get("XDG_CONFIG_HOME", str(pathlib.Path.home() / ".config"))) / "ryanuo-ip-skill"
CONFIG_PATH = CONFIG_DIR / "config.yaml"
SKILL_DIR = pathlib.Path(__file__).resolve().parent.parent


def cmd_init():
    print("=== ryanuo-ip-skill 配置生图 ===")
    print(f"配置将写到: {CONFIG_PATH}\n支持任何 OpenAI 兼容图像端点;key 只存本地、永不上传。\n")
    base = input("图像 API base_url [https://api.openai.com/v1]: ").strip() or "https://api.openai.com/v1"
    model = input("图像模型 model [gpt-image-2]: ").strip() or "gpt-image-2"
    key = getpass.getpass("API key (可不填,直接回车;不填则默认走生成提示词模式): ").strip()
    CONFIG_DIR.mkdir(parents=True, exist_ok=True)
    CONFIG_PATH.write_text(
        f'base_url: "{base}"\nmodel: "{model}"\napi_key: "{key}"\nimage_size: "1024"\n',
        encoding="utf-8",
    )
    os.chmod(CONFIG_PATH, 0o600)
    if key:
        print(f"\n✅ 已写入 {CONFIG_PATH} (mode 600)\n  自检: python3 scripts/illo.py doctor")
    else:
        print(f"\n✅ 已写入 {CONFIG_PATH} (mode 600)\n[提示] 未填 API key:默认走【生成提示词】模式;需要生图时重跑 `python3 scripts/illo.py init` 补 key")


def cmd_doctor():
    ok = True
    print("=== doctor 自检 ===")
    print(f"[*] python: {sys.version.split()[0]}")
    if CONFIG_PATH.exists():
        txt = CONFIG_PATH.read_text(encoding="utf-8")
        has_key = ("api_key" in txt) and ('api_key: "<' not in txt) and ('api_key: ""' not in txt)
        if has_key:
            print(f"[OK] config: {CONFIG_PATH} (key 已填,生图模式就绪)")
        else:
            print(f"[--] config: {CONFIG_PATH} (未填 key,默认【生成提示词】模式)")
    else:
        print(f"[--] config 不存在: {CONFIG_PATH} (默认【生成提示词】模式;需要生图时跑 init)")
    if CONFIG_PATH.exists():
        be = None
        for line in CONFIG_PATH.read_text(encoding="utf-8").splitlines():
            ls = line.strip()
            if ls.startswith("backend:"):
                be = ls.split(":", 1)[1].split("#")[0].strip()
            elif ls.startswith("base_url:") and not be:
                bu = ls.split(":", 1)[1].split("#")[0].strip()
                be = "apimart-task" if "apimart" in bu else "openai-sync"
        if be:
            print(f"[*] resolved backend: {be}")
    # 锚点素材库检查
    refs = SKILL_DIR / "reference" / "assets" / "ip"
    pngs = sorted(refs.glob("*.png")) if refs.exists() else []
    print(f"[{'OK' if pngs else '!!'}] 素材库: {len(pngs)} 张锚点图(reference/assets/ip/)")
    ok = ok and len(pngs) > 0
    gen = SKILL_DIR / "scripts" / "generate.py"
    print(f"[{'OK' if gen.exists() else '!!'}] 生图脚本: {'在' if gen.exists() else '缺'}")
    ok = ok and gen.exists()
    print("=== " + ("✅ 就绪(提示词模式可用;配 key 后生图模式也可用)" if ok else "❌ 有问题,见上") + " ===")
    sys.exit(0 if ok else 1)


def main():
    cmd = sys.argv[1] if len(sys.argv) > 1 else "doctor"
    if cmd == "init":
        cmd_init()
    elif cmd == "doctor":
        cmd_doctor()
    else:
        print("用法: python3 scripts/illo.py [init|doctor]")
        sys.exit(2)


if __name__ == "__main__":
    main()
