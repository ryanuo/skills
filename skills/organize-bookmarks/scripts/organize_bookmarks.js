#!/usr/bin/env node
const fs = require("fs");
const path = require("path");

// ==========================================
// 1. 动态加载 AI 生成的配置
// ==========================================
const configPath = path.join(__dirname, "config.js");
if (!fs.existsSync(configPath)) {
  console.error("Error: config.js not found. Please run 'node analyze_bookmarks.js' and let AI generate config.js first.");
  process.exit(1);
}
const CONFIG = require(configPath);

// ==========================================
// 2. 命令行参数与初始化
// ==========================================
function usage() {
  console.error("Usage: node organize_bookmarks.js <bookmarks.html> <output-dir> [link-check.json]");
  process.exit(2);
}

const input = process.argv[2];
const outDir = process.argv[3];
const checkPath = process.argv[4];
if (!input || !outDir) usage();

const html = fs.readFileSync(input, "utf8");
fs.mkdirSync(outDir, { recursive: true });

let deadSet = new Set();
if (checkPath && fs.existsSync(checkPath)) {
  const check = JSON.parse(fs.readFileSync(checkPath, "utf8"));
  deadSet = new Set((check.results || []).filter((r) => r.status === "dead").map((r) => r.url));
}

// ==========================================
// 3. 核心解析与处理逻辑
// ==========================================
function attrs(source) {
  const result = {};
  source.replace(/([A-Z_]+)="([^"]*)"/g, (_, key, value) => { result[key] = value; return ""; });
  return result;
}

function stripTags(source) {
  return source.replace(/<[^>]*>/g, "").replace(/&amp;/g, "&").replace(/&quot;/g, "\"").replace(/&#39;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&nbsp;/g, " ").trim();
}

function escapeHtml(source) {
  return String(source || "").replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function anyMatch(item, keywords) {
  const textBlob = `${item.title} ${item.url} ${item.path} ${item.host}`.toLowerCase();
  return keywords.some(k => {
    if (k instanceof RegExp) return k.test(textBlob);
    return textBlob.includes(String(k).toLowerCase());
  });
}

function parseBookmarks(source) {
  const tokenRe = /<DT><H3\b([^>]*)>([\s\S]*?)<\/H3>|<DT><A\b([^>]*)>([\s\S]*?)<\/A>|<\/DL>/gi;
  const stack = []; const items = []; const folders = []; let match;
  while ((match = tokenRe.exec(source))) {
    if (match[1] !== undefined) { stack.push(stripTags(match[2])); folders.push(stack.join(" / ")); }
    else if (match[3] !== undefined) {
      const a = attrs(match[3]); let host = "";
      try { host = new URL(a.HREF).hostname.replace(/^www\./, "").toLowerCase(); } catch { }
      items.push({ title: stripTags(match[4]), url: a.HREF || "", add: a.ADD_DATE || String(Math.floor(Date.now() / 1000)), path: stack.join(" / "), host });
    } else if (stack.length) { stack.pop(); }
  }
  return { items, folders };
}

function domainBrand(host) {
  const hit = CONFIG.domainBrands.find(([candidate]) => host === candidate || host.endsWith(`.${candidate}`));
  return hit ? hit[1] : "";
}

function shortTitle(title, url, host) {
  let text = title || domainBrand(host) || host || url;
  text = text.replace(/^\(\d+条消息\)/, "").replace(/\s*--《.*?》.*$/, "").replace(/\s*官方网站.*$/, "").replace(/官方版下载.*$/, "下载").replace(/最新版下载.*$/, "下载").replace(/绿色版下载.*$/, "下载").replace(/APP下载.*$/, "下载").replace(/\s+/g, " ").trim();

  for (const [pattern, value] of CONFIG.titleAliases) {
    if (pattern.test(text)) { text = value; break; }
  }

  if (text.length > 28) text = text.replace(/(一个|一站式|专业|最新|最全|免费|高清|热门|好看的|专注|提供|分享).*/g, "").trim();
  if (text.length > 24) { const cut = text.match(/^(.{6,24}?)(?:[，,。；;：:（(\s]|$)/); if (cut && cut[1].length >= 4) text = cut[1]; }
  if (text.length > 24) text = text.slice(0, 24).trim();
  return text || domainBrand(host) || title || host || url;
}

function targetFolder(item) {
  for (const rule of CONFIG.categorizationRules) {
    if (rule.condition(item, deadSet)) return rule.result;
  }
  return ["其他"];
}

function insert(tree, folderPath, item) {
  let node = tree;
  for (const part of folderPath) { node[part] ||= {}; node = node[part]; }
  node.__items ||= []; node.__items.push(item);
}

function renderTree(node, indent = 4) {
  const keys = Object.keys(node).filter((key) => key !== "__items").sort((a, b) => {
    const ia = CONFIG.folderSortOrder.indexOf(a); const ib = CONFIG.folderSortOrder.indexOf(b);
    return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib) || a.localeCompare(b, "zh-Hans-CN");
  });

  let output = "";
  for (const key of keys) {
    output += `${" ".repeat(indent)}<DT><H3>${escapeHtml(key)}</H3>\n${" ".repeat(indent)}<DL><p>\n`;
    output += renderTree(node[key], indent + 4);
    output += `${" ".repeat(indent)}</DL><p>\n`;
  }

  const items = (node.__items || []).sort((a, b) => a.title.localeCompare(b.title, "zh-Hans-CN"));
  for (const item of items) {
    output += `${" ".repeat(indent)}<DT><A HREF="${escapeHtml(item.url)}" ADD_DATE="${escapeHtml(item.add)}">${escapeHtml(item.title)}</A>\n`;
  }
  return output;
}

// ==========================================
// 4. 执行与输出
// ==========================================
const { items, folders } = parseBookmarks(html);
const tree = {}; const seen = new Set(); const duplicates = []; const inventory = [];

for (const raw of items) {
  if (seen.has(raw.url)) { duplicates.push(raw); continue; }
  seen.add(raw.url);
  const item = { ...raw, title: shortTitle(raw.title, raw.url, raw.host), originalTitle: raw.title };
  const folder = targetFolder(item);
  insert(tree, folder, item);
  inventory.push({ folder: folder.join(" / "), title: item.title, originalTitle: item.originalTitle, url: item.url });
}

const bookmarkHtml = ["<!DOCTYPE NETSCAPE-Bookmark-file-1>", '<META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=UTF-8">', "<TITLE>Bookmarks Clean Names</TITLE>", "<H1>Bookmarks Clean Names</H1>", "<DL><p>", renderTree(tree, 4), "</DL><p>", ""].join("\n");

const htmlOut = path.join(outDir, "bookmarks_clean_names.html");
const csvOut = path.join(outDir, "bookmark_inventory.csv");
const mdOut = path.join(outDir, "bookmark_summary.md");

fs.writeFileSync(htmlOut, bookmarkHtml);
fs.writeFileSync(csvOut, [["folder", "title", "originalTitle", "url"], ...inventory.map((r) => [r.folder, r.title, r.originalTitle, r.url])].map((row) => row.map((cell) => `"${String(cell || "").replace(/"/g, '""')}"`).join(",")).join("\n"));
fs.writeFileSync(mdOut, ["# 书签整理摘要", "", `- 原始书签：${items.length}`, `- 原始文件夹：${folders.length}`, `- 生成书签：${inventory.length}`, `- 精确重复 URL：${duplicates.length}`, `- 输出 HTML：${path.basename(htmlOut)}`, `- 输出 CSV：${path.basename(csvOut)}`, "", `顶层标签：${CONFIG.folderSortOrder.join("、")}。`, "浏览器导入请使用 HTML 文件；CSV 仅用于审阅。", ""].join("\n"));

console.log(JSON.stringify({ htmlOut, csvOut, mdOut, original: items.length, generated: inventory.length, duplicates: duplicates.length }, null, 2));