#!/usr/bin/env node
const fs = require("fs");
const path = require("path");

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

function attrs(source) {
  const result = {};
  source.replace(/([A-Z_]+)="([^"]*)"/g, (_, key, value) => {
    result[key] = value;
    return "";
  });
  return result;
}

function stripTags(source) {
  return source
    .replace(/<[^>]*>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .trim();
}

function escapeHtml(source) {
  return String(source || "")
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function parseBookmarks(source) {
  const tokenRe = /<DT><H3\b([^>]*)>([\s\S]*?)<\/H3>|<DT><A\b([^>]*)>([\s\S]*?)<\/A>|<\/DL>/gi;
  const stack = [];
  const items = [];
  const folders = [];
  let match;

  while ((match = tokenRe.exec(source))) {
    if (match[1] !== undefined) {
      stack.push(stripTags(match[2]));
      folders.push(stack.join(" / "));
    } else if (match[3] !== undefined) {
      const a = attrs(match[3]);
      let host = "";
      try {
        host = new URL(a.HREF).hostname.replace(/^www\./, "").toLowerCase();
      } catch {}
      items.push({
        title: stripTags(match[4]),
        url: a.HREF || "",
        add: a.ADD_DATE || String(Math.floor(Date.now() / 1000)),
        path: stack.join(" / "),
        host,
      });
    } else if (stack.length) {
      stack.pop();
    }
  }
  return { items, folders };
}

const brandByHost = [
  ["mail.qq.com", "QQ邮箱"],
  ["mail.google.com", "Gmail"],
  ["mail.163.com", "网易邮箱"],
  ["mail.aliyun.com", "阿里邮箱"],
  ["mail.proton.me", "Proton"],
  ["github.com", "GitHub"],
  ["gitee.com", "Gitee"],
  ["juejin.cn", "掘金"],
  ["blog.csdn.net", "CSDN"],
  ["cnblogs.com", "博客园"],
  ["segmentfault.com", "思否"],
  ["zhuanlan.zhihu.com", "知乎"],
  ["yuque.com", "语雀"],
  ["leetcode.cn", "LeetCode"],
  ["bilibili.com", "B站"],
  ["doubao.com", "豆包"],
  ["tongyi.com", "通义"],
  ["chatgpt.com", "ChatGPT"],
  ["openai.com", "OpenAI"],
  ["deepseek.com", "DeepSeek"],
  ["console.cloud.tencent.com", "腾讯云"],
  ["swas.console.aliyun.com", "阿里云"],
  ["vercel.com", "Vercel"],
  ["cloudflare.com", "Cloudflare"],
  ["uiverse.io", "UIverse"],
  ["jq22.com", "JQ22"],
];

function domainBrand(host) {
  const hit = brandByHost.find(([candidate]) => host === candidate || host.endsWith(`.${candidate}`));
  return hit ? hit[1] : "";
}

function shortTitle(title, url, host) {
  let text = title || domainBrand(host) || host || url;

  text = text
    .replace(/^\(\d+条消息\)/, "")
    .replace(/[\\-_]?CSDN博客.*$/i, "")
    .replace(/_csdn.*$/i, "")
    .replace(/\s*[-–—|丨]\s*(掘金|知乎|简书|博客园|CSDN|SegmentFault 思否|思否|GitHub|Gitee|语雀|Bilibili|哔哩哔哩|腾讯云|阿里云|Vercel).*$/i, "")
    .replace(/\s*--《.*?》.*$/, "")
    .replace(/\s*官方网站.*$/, "")
    .replace(/官方版下载.*$/, "下载")
    .replace(/最新版下载.*$/, "下载")
    .replace(/绿色版下载.*$/, "下载")
    .replace(/APP下载.*$/, "下载")
    .replace(/\s+/g, " ")
    .trim();

  const aliases = [
    [/^前端常见面试题总结.*/, "前端面试题"],
    [/^JavaScript Guidebook.*/, "JavaScript指南"],
    [/^Vant 3.*/, "Vant"],
    [/^Vue \|.*/, "Vue笔记"],
    [/.*YOLOv5 与 YOLOv4.*/, "YOLOv5 vs YOLOv4"],
    [/.*虫草智能化分拣.*/, "虫草分拣论文"],
    [/.*果园害虫智能识别.*/, "果园害虫识别论文"],
    [/^网易云音乐 NodeJS.*/, "网易云API"],
    [/^轻量应用服务器.*/, "阿里云轻量"],
    [/^我的域名.*/, "腾讯云域名"],
    [/^应用列表-LeanCloud.*/, "LeanCloud"],
    [/^仪表板.*/, "仪表板"],
    [/^登录 - 魔戒.*/, "魔戒"],
    [/^前端技术文章.*/, "前端RSS"],
    [/^源码之家.*/, "源码之家"],
    [/^jquery下载所有版本.*/, "jQuery版本"],
    [/^Javascript在线美化.*/, "JS美化"],
    [/^YAML、YML在线编辑器.*/, "YAML编辑器"],
    [/^美国地址生成.*/, "美国地址生成"],
    [/^随机图片壁纸API.*/, "随机壁纸API"],
  ];

  for (const [pattern, value] of aliases) {
    if (pattern.test(text)) {
      text = value;
      break;
    }
  }

  if (text.length > 28) {
    text = text.replace(/(一个|一站式|专业|最新|最全|免费|高清|热门|好看的|专注|提供|分享).*/g, "").trim();
  }
  if (text.length > 24) {
    const cut = text.match(/^(.{6,24}?)(?:[，,。；;：:（(\s]|$)/);
    if (cut && cut[1].length >= 4) text = cut[1];
  }
  if (text.length > 24) text = text.slice(0, 24).trim();

  return text || domainBrand(host) || title || host || url;
}

function targetFolder(item) {
  const p = item.path;
  const s = `${item.title} ${item.url} ${p} ${item.host}`.toLowerCase();

  if (deadSet.has(item.url)) return ["归档待清理", "失效候选"];
  if (item.url.startsWith("file:")) return ["归档待清理", "本地旧路径"];
  if (/sid=|token=|session_|access_key=|cgi-bin/i.test(item.url)) return ["归档待清理", "登录态链接"];
  if (p.includes("email") || /mail\.|proton|forwardemail/.test(s)) return ["常用", "邮箱"];
  if (p.includes("授权") || /console|account|login|signin|dashboard|cloud|oracle|tencent|aliyun|vercel/.test(s)) return ["常用", "账号后台"];

  if (p.includes("AI")) {
    if (/api|newapi|siliconflow|openrouter|key|token|中转/.test(s)) return ["AI", "API"];
    if (/image|图片|midjourney|stable|draw|design/.test(s)) return ["AI", "图片"];
    if (/vpn|机场|proxy|docker|外网/.test(s)) return ["AI", "网络"];
    return ["AI", "模型"];
  }

  if (p.includes("论文") || p.includes("知网") || /cnki|yolo|论文|dissertation|paper/.test(s)) return ["学习", "论文"];
  if (p.includes("事业编") || p.includes("黄金")) return ["学习", "考试"];
  if (/java|python|小程序|auto\.js|正则/.test(p.toLowerCase())) return ["学习", "编程"];
  if (p.includes("前端面试") || p.includes("算法") || p.includes("leetcode") || /interview|leetcode|面试|算法/.test(s)) return ["开发", "面试算法"];
  if (p.includes("ubuntu") || /linux|ubuntu|liunx/.test(s)) return ["开发", "Linux"];
  if (p.includes("stm32")) return ["开发", "STM32"];
  if (/github|gitee|git/.test(s)) return ["开发", "代码托管"];
  if (p.includes("HTML源码") || p.includes("jquery文件") || p.includes("编程学习") || /vue|react|js|javascript|css|html|webpack|vite|npm|前端|jquery/.test(s)) return ["开发", "前端"];
  if (p.includes("博客") || p.includes("微信公众号") || p.includes("QQ管理") || p.includes("wp") || /hexo|butterfly|wordpress|waline|crisp|公众号|blog/.test(s)) {
    if (/hexo|butterfly/.test(s)) return ["博客", "Hexo"];
    if (/公众号|weixin|qq|crisp|waline/.test(s)) return ["博客", "运营"];
    return ["博客", "素材"];
  }
  if (p.includes("电视") || p.includes("影视") || /动漫|漫画|电影|tv|movie|bilibili|wallpaper|壁纸/.test(s)) {
    return /动漫|漫画|comic|anime/.test(s) ? ["娱乐", "动漫漫画"] : ["娱乐", "影视"];
  }
  if (p.includes("工具") || p.includes("短链接") || p.includes("插件") || p.includes("机器人") || p.includes("软件库") || p.includes("下载器") || /tool|json|bejson|icon|cdn|图床|导航|design|uiverse/.test(s)) {
    if (/设计|icon|uiverse/.test(s)) return ["工具", "设计"];
    if (/cdn|图床|部署|vercel|cloudflare/.test(s)) return ["工具", "部署图床"];
    if (/导航/.test(s)) return ["工具", "导航"];
    return ["工具", "在线"];
  }
  if (p.includes("备用库")) return ["归档待清理", "旧资料"];
  return ["其他"];
}

function insert(tree, folderPath, item) {
  let node = tree;
  for (const part of folderPath) {
    node[part] ||= {};
    node = node[part];
  }
  node.__items ||= [];
  node.__items.push(item);
}

function renderTree(node, indent = 4) {
  const preferred = ["常用", "AI", "开发", "学习", "工具", "博客", "娱乐", "其他", "归档待清理"];
  const keys = Object.keys(node)
    .filter((key) => key !== "__items")
    .sort((a, b) => {
      const ia = preferred.indexOf(a);
      const ib = preferred.indexOf(b);
      return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib) || a.localeCompare(b, "zh-Hans-CN");
    });

  let output = "";
  for (const key of keys) {
    output += `${" ".repeat(indent)}<DT><H3>${escapeHtml(key)}</H3>\n`;
    output += `${" ".repeat(indent)}<DL><p>\n`;
    output += renderTree(node[key], indent + 4);
    output += `${" ".repeat(indent)}</DL><p>\n`;
  }

  const items = (node.__items || []).sort((a, b) => a.title.localeCompare(b.title, "zh-Hans-CN"));
  for (const item of items) {
    output += `${" ".repeat(indent)}<DT><A HREF="${escapeHtml(item.url)}" ADD_DATE="${escapeHtml(item.add)}">${escapeHtml(item.title)}</A>\n`;
  }
  return output;
}

const { items, folders } = parseBookmarks(html);
const tree = {};
const seen = new Set();
const duplicates = [];
const inventory = [];

for (const raw of items) {
  if (seen.has(raw.url)) {
    duplicates.push(raw);
    continue;
  }
  seen.add(raw.url);
  const item = { ...raw, title: shortTitle(raw.title, raw.url, raw.host), originalTitle: raw.title };
  const folder = targetFolder(item);
  insert(tree, folder, item);
  inventory.push({ folder: folder.join(" / "), title: item.title, originalTitle: item.originalTitle, url: item.url });
}

const bookmarkHtml = [
  "<!DOCTYPE NETSCAPE-Bookmark-file-1>",
  '<META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=UTF-8">',
  "<TITLE>Bookmarks Clean Names</TITLE>",
  "<H1>Bookmarks Clean Names</H1>",
  "<DL><p>",
  renderTree(tree, 4),
  "</DL><p>",
  "",
].join("\n");

const htmlOut = path.join(outDir, "bookmarks_clean_names.html");
const csvOut = path.join(outDir, "bookmark_inventory.csv");
const mdOut = path.join(outDir, "bookmark_summary.md");
fs.writeFileSync(htmlOut, bookmarkHtml);
fs.writeFileSync(
  csvOut,
  [["folder", "title", "originalTitle", "url"], ...inventory.map((r) => [r.folder, r.title, r.originalTitle, r.url])]
    .map((row) => row.map((cell) => `"${String(cell || "").replace(/"/g, '""')}"`).join(","))
    .join("\n")
);
fs.writeFileSync(
  mdOut,
  [
    "# 书签整理摘要",
    "",
    `- 原始书签：${items.length}`,
    `- 原始文件夹：${folders.length}`,
    `- 生成书签：${inventory.length}`,
    `- 精确重复 URL：${duplicates.length}`,
    `- 输出 HTML：${path.basename(htmlOut)}`,
    `- 输出 CSV：${path.basename(csvOut)}`,
    "",
    "顶层标签：常用、AI、开发、学习、工具、博客、娱乐、其他、归档待清理。",
    "浏览器导入请使用 HTML 文件；CSV 仅用于审阅。",
    "",
  ].join("\n")
);

console.log(JSON.stringify({ htmlOut, csvOut, mdOut, original: items.length, generated: inventory.length, duplicates: duplicates.length }, null, 2));
