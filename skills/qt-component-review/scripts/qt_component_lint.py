#!/usr/bin/env python3
"""Qt QML component linter -- deterministic, high-precision checks only.

Purpose: catch the mechanical mistakes that a language model repeats on every
run, so the deep-analysis pass can spend its attention on semantic issues.

Design rules:
  * Every check must be near-zero false positive. If a check needs intent or
    cross-file reasoning, it does not belong here -- it belongs in deep-rules.md.
  * Output is a candidate list, not a verdict. Reviewers confirm each hit.
  * Stdlib only. No Qt installation required. Regex-based, line oriented.

Usage:
    python3 qt_component_lint.py <file-or-dir> [more...]
    python3 qt_component_lint.py --summary src/
    python3 qt_component_lint.py --rules
    python3 qt_component_lint.py --qt=5 src/      # skip Qt6-only rules

Exit code is 0 unless the arguments are unusable; findings are not errors.
"""

from __future__ import annotations

import os
import re
import sys
from dataclasses import dataclass
from typing import Iterable, Iterator, List, Sequence, Tuple

SKIP_DIRS = {
    ".git", ".svn", "node_modules", "build", "build-*", "debug", "release",
    "__pycache__", ".cache",
}

# ---------------------------------------------------------------- rule table

@dataclass(frozen=True)
class Rule:
    rid: str
    severity: str
    title: str
    why: str
    qt6_only: bool = False


RULES: Tuple[Rule, ...] = (
    Rule("R001", "warn", "import 带版本号",
         "Qt 6 不需要导入版本号；带版本号是 Qt 5 写法，会连带把整份文件写成 Qt 5 风格。",
         qt6_only=True),
    Rule("R002", "warn", "定制了控件内部件但未指定样式",
         "覆盖 background/contentItem/indicator/handle 时应有具体样式导入"
         "（如 QtQuick.Controls.Basic），裸导入拿不到可定制模板。"),
    Rule("R003", "info", "颜色字面量",
         "主题化项目中颜色应走语义令牌，字面量会让换主题只换一半。"),
    Rule("R004", "info", "用户可见文案未包 qsTr()",
         "未包 qsTr() 的字符串无法被 lupdate 提取，后续无法翻译。"),
    Rule("R005", "info", "clip: true",
         "裁剪会强制整棵子树离屏渲染，只在确实需要遮罩时开。"),
    Rule("R006", "info", "layer.enabled: true",
         "整棵子树光栅化进 FBO，内存翻倍且失去增量渲染，确认真的需要。"),
    Rule("R007", "warn", "使用 Canvas",
         "Canvas 重绘由 JS 驱动、跑在主线程，不适合会动或频繁重绘的内容。"),
    Rule("R008", "info", "Image 缺少 sourceSize",
         "不设 sourceSize 会按原图全分辨率解码，大图直接吃掉内存。"),
    Rule("R009", "info", "Behavior on",
         "Behavior 会在每一次变化上触发，包括程序赋值；确认这是想要的时机。"),
)

RULE_BY_ID = {r.rid: r for r in RULES}

# ---------------------------------------------------------------- patterns

RE_IMPORT_VERSIONED = re.compile(r"^\s*import\s+([A-Za-z][\w.]*)\s+(\d+\.\d+)\s*$")
RE_IMPORT_ANY = re.compile(r"^\s*import\s+([A-Za-z][\w.]+)")
RE_IMPORT_STYLE = re.compile(
    r"^\s*import\s+QtQuick\.Controls\.(Basic|Fusion|Material|Universal|Imagine|macOS|Windows|iOS)\b"
)
RE_IMPORT_PLAIN_CONTROLS = re.compile(r"^\s*import\s+QtQuick\.Controls(\s+\d+\.\d+)?\s*$")
RE_CONTROL_PART = re.compile(r"^\s*(background|contentItem|indicator|handle|contentItem\s*)\s*:")
RE_COLOR_PROP = re.compile(
    r"\b(color|borderColor|border\.color|textColor|fillColor|backgroundColor|strokeColor)\s*:\s*"
    r"(?:#[0-9a-fA-F]{3,8}\b"
    r"|\"(?:#[0-9a-fA-F]{3,8}|white|black|red|green|blue|gray|grey|yellow|orange)\""
    r"|Qt\.(?:white|black|red|green|blue|gray))"
)
RE_TEXT_PROP = re.compile(
    r"^\s*(text|title|placeholderText|toolTipText|displayText|label|description)\s*:\s*"
    r"(\"([^\"\\]|\\.)*\"|'([^'\\]|\\.)*')\s*$"
)
RE_CLIP = re.compile(r"^\s*clip\s*:\s*true\b")
RE_LAYER = re.compile(r"^\s*layer\.enabled\s*:\s*true\b")
RE_CANVAS = re.compile(r"^\s*Canvas\s*\{")
RE_BEHAVIOR = re.compile(r"^\s*Behavior\s+on\s+\w+")
RE_IMAGE = re.compile(r"^\s*Image\s*\{")
RE_BLOCK_OPEN = re.compile(r"\{\s*$")

# ---------------------------------------------------------------- helpers


def strip_line_comment(line: str) -> str:
    """Remove // comments that are not inside a string literal."""
    out: List[str] = []
    in_str = False
    quote = ""
    i = 0
    while i < len(line):
        ch = line[i]
        if in_str:
            out.append(ch)
            if ch == "\\" and i + 1 < len(line):
                out.append(line[i + 1])
                i += 2
                continue
            if ch == quote:
                in_str = False
            i += 1
            continue
        if ch in "\"'":
            in_str = True
            quote = ch
            out.append(ch)
            i += 1
            continue
        if ch == "/" and i + 1 < len(line) and line[i + 1] == "/":
            break
        out.append(ch)
        i += 1
    return "".join(out)


def iter_qml_files(paths: Sequence[str]) -> Iterator[str]:
    for path in paths:
        if os.path.isfile(path) and path.endswith(".qml"):
            yield path
            continue
        if not os.path.isdir(path):
            continue
        for root, dirs, files in os.walk(path):
            dirs[:] = [
                d for d in dirs
                if d not in SKIP_DIRS and not d.startswith(".")
            ]
            for name in sorted(files):
                if name.endswith(".qml"):
                    yield os.path.join(root, name)


@dataclass
class Finding:
    rid: str
    path: str
    line: int
    snippet: str


def check_file(path: str, qt_major: int) -> List[Finding]:
    try:
        with open(path, "r", encoding="utf-8", errors="replace") as fh:
            raw_lines = fh.read().splitlines()
    except OSError:
        return []

    lines = [strip_line_comment(l) for l in raw_lines]
    findings: List[Finding] = []

    def add(rid: str, idx: int) -> None:
        rule = RULE_BY_ID[rid]
        if rule.qt6_only and qt_major < 6:
            return
        findings.append(Finding(rid, path, idx + 1, raw_lines[idx].strip()[:160]))

    has_specific_style = any(RE_IMPORT_STYLE.match(l) for l in lines)
    imports_plain_controls = any(RE_IMPORT_PLAIN_CONTROLS.match(l) for l in lines)

    for idx, line in enumerate(lines):
        if not line.strip():
            continue

        if RE_IMPORT_VERSIONED.match(line):
            add("R001", idx)

        if RE_COLOR_PROP.search(line):
            add("R003", idx)

        m = RE_TEXT_PROP.match(line)
        if m:
            value = m.group(2)
            if value not in ('""', "''") and "qsTr(" not in line:
                add("R004", idx)

        if RE_CLIP.match(line):
            add("R005", idx)
        if RE_LAYER.match(line):
            add("R006", idx)
        if RE_CANVAS.match(line):
            add("R007", idx)
        if RE_BEHAVIOR.match(line):
            add("R009", idx)

        if RE_IMAGE.match(line):
            block_end = find_block_end(lines, idx)
            body = "\n".join(lines[idx:block_end])
            if "sourceSize" not in body and "source:" in body:
                add("R008", idx)

    # R002 only makes sense when the file actually imports the plain Controls
    # module -- otherwise `background:` is just an ordinary property name.
    if imports_plain_controls and not has_specific_style:
        for idx, line in enumerate(lines):
            if RE_CONTROL_PART.match(line):
                add("R002", idx)
                break

    # de-duplicate identical hits
    seen = set()
    unique: List[Finding] = []
    for f in findings:
        key = (f.rid, f.path, f.line)
        if key in seen:
            continue
        seen.add(key)
        unique.append(f)
    return unique


def find_block_end(lines: Sequence[str], start: int) -> int:
    """Return the index just past the block that opens at `start`."""
    depth = 0
    for i in range(start, len(lines)):
        depth += lines[i].count("{") - lines[i].count("}")
        if depth <= 0 and "{" in "".join(lines[start:i + 1]):
            return i + 1
    return len(lines)


def severity_rank(sev: str) -> int:
    return {"warn": 0, "info": 1}.get(sev, 2)


# ---------------------------------------------------------------- reporting


def report(findings: Iterable[Finding], summary: bool, root_hint: str) -> None:
    findings = list(findings)
    if not findings:
        print("No findings. (Deterministic checks are a floor, not a full review.)")
        return

    counts: dict = {}
    for f in findings:
        counts[f.rid] = counts.get(f.rid, 0) + 1

    if summary:
        print(f"Deterministic findings: {len(findings)} across "
              f"{len({f.path for f in findings})} file(s)\n")
        for rid in sorted(counts):
            rule = RULE_BY_ID[rid]
            print(f"{rid} [{rule.severity}] {rule.title} — {counts[rid]}")
            print(f"      {rule.why}")
        print("\nFiles by hit count:")
        per_file: dict = {}
        for f in findings:
            per_file[f.path] = per_file.get(f.path, 0) + 1
        for path, n in sorted(per_file.items(), key=lambda kv: -kv[1]):
            print(f"  {n:4d}  {os.path.relpath(path, root_hint)}")
        return

    for rid in sorted(counts, key=lambda r: (severity_rank(RULE_BY_ID[r].severity), r)):
        rule = RULE_BY_ID[rid]
        print(f"\n{rid} [{rule.severity}] {rule.title}")
        print(f"  why: {rule.why}")
        for f in findings:
            if f.rid != rid:
                continue
            print(f"  {os.path.relpath(f.path, root_hint)}:{f.line}: {f.snippet}")


def main(argv: Sequence[str]) -> int:
    args = [a for a in argv[1:]]
    summary = False
    qt_major = 6
    paths: List[str] = []

    for arg in args:
        if arg == "--summary":
            summary = True
        elif arg == "--rules":
            for r in RULES:
                print(f"{r.rid} [{r.severity}] {r.title}")
                print(f"    {r.why}")
            return 0
        elif arg.startswith("--qt="):
            try:
                qt_major = int(arg.split("=", 1)[1])
            except ValueError:
                print(f"bad --qt value: {arg}", file=sys.stderr)
                return 2
        elif arg in ("-h", "--help"):
            print(__doc__)
            return 0
        else:
            paths.append(arg)

    if not paths:
        print(__doc__)
        return 2

    findings: List[Finding] = []
    for path in paths:
        for qml in iter_qml_files([path]):
            findings.extend(check_file(qml, qt_major))

    root_hint = paths[0] if os.path.isdir(paths[0]) else os.path.dirname(paths[0]) or "."
    report(findings, summary, root_hint)
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
