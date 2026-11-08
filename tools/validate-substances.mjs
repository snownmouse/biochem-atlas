// ============================================================
// validate-substances —— 「常见物质」模块校验
//
// 校验口径：
//   1) /substances 六类分区齐全，条目数分别为 13/20/20/11/25/9（共 98）；
//   2) 已有档案条目只链到 /molecule/:id，未收录条目只链到 /substance/:id；
//   3) 凡已挂 dossier 的完整条目：四段正文各 80–130 字、考点 3–4 条、
//      出处 ≥2 条、结构特征非空、别名非空；相关链接必须可达；
//   4) 未挂 dossier 的占位条目页必须出现「内容整理中」，四个骨架板块非空，
//      不得落 404/空白页；
//   5) 1440 与 1280 宽度下目录页与条目页均无页面级横向溢出；
//   6) 全流程无控制台报错。
// 完整/待整理条目数随补写进度变化，脚本按 61 条非档案条目总量恒等校验。
// 需先 npm run build，再 npm run preview（或 BASE_URL 指向本地服务）。
// ============================================================
import { mkdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright-core";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const BASE = process.env.BASE_URL ?? "http://localhost:4173";
const EXPECTED = [
  ["sugars", 13],
  ["lipids", 20],
  ["amino", 20],
  ["nucleotides", 11],
  ["vitamins", 25],
  ["hormones", 9],
];
const NON_ARCHIVE_TOTAL = 61;

let failed = false;
const check = (label, ok, detail) => {
  console.log(`${ok ? "✓" : "✗"} ${label}${detail ? `  ${detail}` : ""}`);
  if (!ok) failed = true;
};

async function launch() {
  for (const channel of ["msedge", "chrome"]) {
    try {
      return await chromium.launch({ channel, headless: true });
    } catch (e) {
      console.warn(`channel ${channel} 不可用：${e.message}`);
    }
  }
  throw new Error("未找到可用的 Edge/Chrome 浏览器");
}

const browser = await launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
page.on("pageerror", (e) => errors.push(String(e)));
page.on("console", (m) => m.type() === "error" && errors.push(m.text()));

mkdirSync(join(ROOT, "preview"), { recursive: true });

// ===== 1) 目录页 =====
const resp = await page.goto(`${BASE}/substances`, { waitUntil: "networkidle" });
check("/substances 可达（200）", resp?.status() === 200);
check("目录页主体存在", (await page.locator('[data-testid="substances-index"]').count()) === 1);
const cats = await page.locator("[data-sub-category]").evaluateAll((els) =>
  els.map((el) => ({ id: el.getAttribute("data-sub-category"), n: el.querySelectorAll("[data-substance-item]").length })),
);
check("六类分区齐全", cats.length === 6, cats.map((c) => c.id).join(","));
for (const [id, n] of EXPECTED) {
  const got = cats.find((c) => c.id === id)?.n;
  check(`分区 ${id} 条目数 ${n}`, got === n, String(got));
}
const totals = cats.reduce((s, c) => s + c.n, 0);
check("目录条目总数 98", totals === 98, String(totals));

const items = await page.locator("[data-substance-item]").evaluateAll((els) =>
  els.map((el) => ({
    id: el.getAttribute("data-substance-item"),
    status: el.getAttribute("data-substance-status"),
    href: el.getAttribute("href"),
  })),
);
const badExisting = items.filter((i) => i.status === "existing" && !i.href?.startsWith("/molecule/"));
const badPending = items.filter((i) => i.status !== "existing" && !i.href?.startsWith("/substance/"));
check("已有档案条目都链到 /molecule/", badExisting.length === 0, badExisting.slice(0, 5).map((i) => `${i.id}:${i.href}`).join(" | "));
check("未收录条目都链到 /substance/", badPending.length === 0, badPending.slice(0, 5).map((i) => `${i.id}:${i.href}`).join(" | "));
const completeItems = items.filter((i) => i.status === "complete");
const pendingItems = items.filter((i) => i.status === "pending");
check(
  `完整条目 ${completeItems.length} 条 + 待整理 ${pendingItems.length} 条 = ${NON_ARCHIVE_TOTAL}`,
  completeItems.length + pendingItems.length === NON_ARCHIVE_TOTAL,
  `${completeItems.length} + ${pendingItems.length}`,
);

// ===== 1b) 目录里全部 98 条链接都能落到实体页，不 404、不落兜底 =====
const uniqueHrefs = [...new Set(items.map((i) => i.href))];
const deadLinks = [];
for (const href of uniqueHrefs) {
  const r = await page.goto(`${BASE}${href}`, { waitUntil: "domcontentloaded" });
  if (!r || r.status() !== 200) {
    deadLinks.push(`${href}:HTTP ${r?.status() ?? "null"}`);
    continue;
  }
  const isMolecule = (await page.locator('[data-testid="molecule-profile"]').count()) === 1;
  const isSubstance = (await page.locator('[data-testid="substance-profile"]').count()) === 1;
  if (!isMolecule && !isSubstance) {
    deadLinks.push(`${href}:无实体页主体`);
    continue;
  }
  if ((await page.locator(".mp-head h1").innerText()) === "没有这个物质") {
    deadLinks.push(`${href}:落到未收录兜底`);
  }
}
check(`目录 ${uniqueHrefs.length} 个唯一链接都可落到实体页`, deadLinks.length === 0, deadLinks.slice(0, 8).join(" | "));

// ===== 2) 全部完整条目：四段 80–130 字、考点 3–4、别名与出处齐全 =====
const relatedHrefs = new Set();
for (const { id } of completeItems) {
  const r = await page.goto(`${BASE}/substance/${id}`, { waitUntil: "networkidle" });
  check(`完整条目 ${id} 可达`, r?.status() === 200);
  const main = page.locator('[data-testid="substance-profile"]');
  check(`[${id}] 不是兜底页`, (await main.getAttribute("data-substance-complete")) === "1");
  check(`[${id}] 没有「内容整理中」状态条`, (await page.locator('[data-testid="substance-status"]').count()) === 0);
  check(`[${id}] h1 是判断句（≥10 字）`, (await page.locator(".mp-head h1").innerText()).trim().length >= 10);
  const aliases = (await page.locator('[data-testid="substance-aliases"]').innerText()).trim().replace(/^别名：/, "");
  check(`[${id}] 别名非空`, aliases.length >= 2, aliases);
  for (const key of ["position", "origin", "significance"]) {
    const text = (await page.locator(`[data-substance-section="${key}"] p`).innerText()).trim();
    check(`[${id}] ${key} 正文 80–130 字`, text.length >= 80 && text.length <= 130, String(text.length));
  }
  const exam = await page.locator('[data-substance-section="exam"] li').count();
  check(`[${id}] 考点 3–4 条`, exam >= 3 && exam <= 4, String(exam));
  const sources = await page.locator('[data-testid="substance-sources"] li').count();
  check(`[${id}] 出处 ≥2 条`, sources >= 2, String(sources));
  const structure = (await page.locator('[data-testid="substance-structure"]').innerText()).trim();
  check(`[${id}] 结构特征非空`, structure.length >= 20, String(structure.length));
  for (const href of await page.locator('[data-testid="substance-related-link"]').evaluateAll((els) => els.map((el) => el.getAttribute("href"))) ) {
    if (href) relatedHrefs.add(href);
  }
}

// ===== 2b) 相关档案 / 通路链接都能打开（不指向幽灵路由） =====
const deadRelated = [];
for (const href of relatedHrefs) {
  const rr = await page.goto(`${BASE}${href}`, { waitUntil: "domcontentloaded" });
  if (!rr || rr.status() !== 200) deadRelated.push(`${href}:HTTP ${rr?.status() ?? "null"}`);
}
check(`相关链接 ${relatedHrefs.size} 个全部可达`, deadRelated.length === 0, deadRelated.slice(0, 5).join(" | "));

// ===== 3) 其余条目页：骨架 + 内容整理中 =====
const pending = pendingItems.map((i) => i.id);
const bad = [];
for (const id of pending) {
  const r = await page.goto(`${BASE}/substance/${id}`, { waitUntil: "domcontentloaded" });
  const main = page.locator('[data-testid="substance-profile"]');
  if (!r || r.status() !== 200) {
    bad.push(`${id}:HTTP ${r?.status() ?? "null"}`);
    continue;
  }
  if ((await main.count()) !== 1) {
    bad.push(`${id}:无主体`);
    continue;
  }
  if ((await main.getAttribute("data-substance-complete")) !== "0") {
    bad.push(`${id}:complete 标记错误`);
    continue;
  }
  const status = await page.locator('[data-testid="substance-status"]').innerText();
  if (!status.includes("内容整理中")) {
    bad.push(`${id}:缺内容整理中标记`);
    continue;
  }
  const h1 = (await page.locator(".mp-head h1").innerText()).trim();
  if (!h1 || h1 === "没有这个物质") {
    bad.push(`${id}:标题为空或落兜底`);
    continue;
  }
  for (const key of ["position", "origin", "significance", "exam"]) {
    const text = (await page.locator(`[data-substance-section="${key}"]`).innerText()).trim();
    if (text.length < 8) bad.push(`${id}:${key} 空白`);
  }
  const structure = (await page.locator('[data-testid="substance-structure"]').innerText()).trim();
  if (structure.length < 8) bad.push(`${id}:结构区空白`);
  const sources = await page.locator('[data-testid="substance-sources"] li').count();
  if (sources < 1) bad.push(`${id}:出处区空白`);
}
check(`待整理 ${pending.length} 条骨架页都可达且标注「内容整理中」`, bad.length === 0, bad.slice(0, 8).join(" | "));

// ===== 4) 横向溢出（1440 / 1280） =====
async function overflowAt(width, url) {
  await page.setViewportSize({ width, height: 900 });
  await page.goto(`${BASE}${url}`, { waitUntil: "networkidle" });
  return page.evaluate(() => ({
    scroll: document.documentElement.scrollWidth,
    inner: window.innerWidth,
  }));
}
for (const width of [1440, 1280]) {
  for (const url of ["/substances", "/substance/vit-a", "/substance/vit-c", "/substance/sucrose", "/substance/fructose", "/substance/vit-b2", "/substance/insulin", "/substance/gtp"]) {
    const { scroll, inner } = await overflowAt(width, url);
    check(`${width}px ${url} 无横向溢出`, scroll <= inner, `${scroll}/${inner}`);
  }
}

// ===== 5) 未知 id 不落死胡同 =====
await page.setViewportSize({ width: 1440, height: 900 });
await page.goto(`${BASE}/substance/not-a-substance`, { waitUntil: "networkidle" });
check("未知条目给出「没有这个物质」", (await page.locator(".mp-head h1").innerText()) === "没有这个物质");
check("未知条目可回目录", (await page.locator('.mp-links-wide a[href="/substances"]').count()) >= 1);

check("全流程无控制台报错", errors.length === 0, errors.slice(0, 3).join(" | "));

await browser.close();
console.log(failed ? "\n结果：FAIL" : "\n结果：PASS");
process.exit(failed ? 1 : 0);
