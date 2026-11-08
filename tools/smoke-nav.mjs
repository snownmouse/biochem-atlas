// 统一通路切换器冒烟（PathwaySwitcher）—— 新增脚本，不并入既有 smoke-embed。
// 校验口径：挂图页 / 结构页 / 首页共用同一组件；条目数 = 13 条通路 + 首页（14 条）；
// 每页当前项高亮唯一且正确；任意页都能点到其余 13 条；点击落到对应路由；
// 同一通路内切换保留 ?step= / ?organ=；1440 下不换行、不裁切、不压报头。
// 旧的手写面包屑断言仍在 smoke-gluconeogenesis / smoke-fao / smoke-ppp-poster 中，
// 本轮组件替换后它们改为校验同一 nav.crumb 内的同款链接，未删除、未弱化。
// 需先 `npm run build`，再 `npm run preview`（或 BASE_URL 指向本地服务）。
import { mkdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright-core";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const BASE = process.env.BASE_URL ?? "http://localhost:4173";
let failed = false;
const check = (label, ok, detail) => {
  console.log(`${ok ? "✓" : "✗"} ${label}${detail ? `  ${detail}` : ""}`);
  if (!ok) failed = true;
};

/** 全站导航清单（与 src/data/pathways.ts 同源；这里只做校验用的期望值） */
const NAV = [
  { id: "home", name: "首页", route: "/" },
  { id: "glycolysis", name: "糖酵解", route: "/pathway/glycolysis" },
  { id: "tca", name: "三羧酸循环", route: "/pathway/tca" },
  { id: "gluconeogenesis", name: "糖异生", route: "/pathway/gluconeogenesis" },
  { id: "ppp", name: "磷酸戊糖途径", route: "/pathway/ppp" },
  { id: "fatty-acid-oxidation", name: "β-氧化", route: "/pathway/fatty-acid-oxidation" },
  { id: "oxphos", name: "氧化磷酸化", route: "/pathway/oxphos" },
  { id: "cori", name: "Cori 循环", route: "/pathway/cori" },
  { id: "fatty-acid-synthesis", name: "脂肪酸从头合成", route: "/pathway/fas" },
  { id: "urea-cycle", name: "尿素循环", route: "/pathway/urea-cycle" },
  { id: "glycogen", name: "糖原代谢", route: "/pathway/glycogen" },
  { id: "amino-acids", name: "氨基酸代谢", route: "/pathway/amino-acids" },
  { id: "cholesterol", name: "胆固醇合成", route: "/pathway/cholesterol" },
  { id: "ketone", name: "酮体代谢", route: "/pathway/ketone" },
];

/** 全页口径：12 张挂图 + 结构对照页（本脚本额外覆盖全部 13 张结构页与首页） */
const PAGES = [
  { route: "/", current: "home" },
  { route: "/pathway/glycolysis", current: "glycolysis" },
  { route: "/pathway/tca", current: "tca" },
  { route: "/pathway/gluconeogenesis", current: "gluconeogenesis" },
  { route: "/pathway/ppp", current: "ppp" },
  { route: "/pathway/fatty-acid-oxidation", current: "fatty-acid-oxidation" },
  { route: "/pathway/oxphos", current: "oxphos" },
  { route: "/pathway/cori", current: "cori" },
  { route: "/pathway/fas", current: "fatty-acid-synthesis" },
  { route: "/pathway/urea-cycle", current: "urea-cycle" },
  { route: "/pathway/glycogen", current: "glycogen" },
  { route: "/pathway/amino-acids", current: "amino-acids" },
  { route: "/pathway/cholesterol", current: "cholesterol" },
  { route: "/pathway/ketone", current: "ketone" },
  { route: "/structures/glycolysis", current: "glycolysis" },
  { route: "/structures/tca", current: "tca" },
  { route: "/structures/gluconeogenesis", current: "gluconeogenesis" },
  { route: "/structures/ppp", current: "ppp" },
  { route: "/structures/fatty-acid-oxidation", current: "fatty-acid-oxidation" },
  { route: "/structures/oxphos", current: "oxphos" },
  { route: "/structures/fatty-acid-synthesis", current: "fatty-acid-synthesis" },
  { route: "/structures/urea-cycle", current: "urea-cycle" },
  { route: "/structures/glycogen", current: "glycogen" },
  { route: "/structures/amino-acids", current: "amino-acids" },
  { route: "/structures/cholesterol", current: "cholesterol" },
  { route: "/structures/ketone", current: "ketone" },
  { route: "/structures/cori", current: "cori" },
];

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

/* ===== 1) 每一页都渲染同一个切换器，条目 = 8，当前项唯一且正确 ===== */
for (const item of PAGES) {
  await page.goto(`${BASE}${item.route}`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector('[data-testid="pathway-switcher"]', { timeout: 10000 });
  const navs = await page.locator('[data-testid="pathway-switcher"]').count();
  check(`${item.route} 渲染唯一通路切换器`, navs === 1, String(navs));

  const ids = await page.locator('[data-testid="pathway-switcher"] [data-nav-id]').evaluateAll((els) =>
    els.map((el) => el.getAttribute("data-nav-id")),
  );
  check(
    `${item.route} 条目数 = 13 条通路 + 首页（${ids.length}）`,
    ids.length === NAV.length && JSON.stringify(ids) === JSON.stringify(NAV.map((n) => n.id)),
    ids.join(","),
  );

  const current = await page.locator('[data-testid="pathway-switcher"] [aria-current="page"]').count();
  check(`${item.route} 当前项高亮唯一（${current}）`, current === 1);
  const currentText = await page.locator('[data-testid="pathway-switcher"] [aria-current="page"]').innerText();
  const expected = NAV.find((n) => n.id === item.current)?.name ?? "";
  check(
    `${item.route} 当前项是「${expected}」`,
    currentText.includes(expected),
    currentText.replace(/\s+/g, " "),
  );

  const links = await page
    .locator('[data-testid="pathway-switcher"] [data-nav-id] a')
    .evaluateAll((els) => els.map((el) => ({ id: el.parentElement.getAttribute("data-nav-id"), href: el.getAttribute("href") })));
  check(`${item.route} 14 条条目都是可点链接`, links.length === NAV.length, String(links.length));
  const missing = NAV.filter((n) => !links.some((l) => l.id === n.id && (l.href ?? "").startsWith(n.route)));
  check(
    `${item.route} 能点到其余 13 条（含本通路自链）`,
    missing.length === 0,
    missing.map((n) => n.id).join(","),
  );
}

/* ===== 2) 当前项高亮样式：实线下压 + 加粗，不是色块/胶囊 ===== */
{
  await page.goto(`${BASE}/pathway/tca`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector('[data-testid="pathway-switcher"]');
  const style = await page.locator('[data-testid="pathway-switcher"] .ps-cur').evaluate((el) => {
    const s = getComputedStyle(el);
    return {
      weight: s.fontWeight,
      borderBottomWidth: s.borderBottomWidth,
      borderBottomStyle: s.borderBottomStyle,
      borderRadius: s.borderRadius,
      boxShadow: s.boxShadow,
      background: s.backgroundColor,
    };
  });
  check(
    "当前项为加粗 + 2px 实线下划线（无圆角 / 无投影 / 无底色）",
    Number(style.weight) >= 700 &&
      parseFloat(style.borderBottomWidth) >= 2 &&
      style.borderBottomStyle === "solid" &&
      style.borderRadius === "0px" &&
      style.boxShadow === "none" &&
      (style.background === "rgba(0, 0, 0, 0)" || style.background === "transparent"),
    JSON.stringify(style),
  );
}

/* ===== 3) 切换落地：TCA 页点 Cori → /pathway/cori（并截图实测路径） ===== */
await page.goto(`${BASE}/pathway/tca`, { waitUntil: "networkidle" });
await page.waitForSelector('[data-testid="pathway-switcher"]');
await page.locator('[data-testid="pathway-switcher"] [data-nav-id="cori"] a').click();
await page.waitForURL("**/pathway/cori", { timeout: 10000 });
check("从 TCA 页点 Cori 落到 /pathway/cori", page.url().endsWith("/pathway/cori"));
check("Cori 页切换器高亮切到 Cori 循环", (await page.locator('[data-testid="pathway-switcher"] [data-nav-id="cori"] a[aria-current="page"]').count()) === 1);
await page.screenshot({ path: join(ROOT, "preview", "nav-tca-to-cori.png"), fullPage: false });
console.log("✓ 截图 preview/nav-tca-to-cori.png（1440 实测路径：TCA → Cori）");

/* ===== 3b) Cori 三停檐：结构对照停已是可用链接，结构页可返回挂图 ===== */
{
  const stop = page.locator('[data-rail-stop="structure"]');
  const tag = await stop.evaluate((el) => el.tagName);
  const href = await stop.getAttribute("href");
  const disabled = await stop.getAttribute("data-rail-disabled");
  check(
    "Cori 挂图三停檐「结构对照」为可用链接（不再是灰态）",
    tag === "A" && href === "/structures/cori" && disabled === null,
    `${tag} ${href} disabled=${disabled}`,
  );
  await page.goto(`${BASE}/structures/cori`, { waitUntil: "networkidle" });
  await page.waitForSelector('[data-testid="pathway-rail"]');
  const posterHref = await page.locator('[data-rail-stop="poster"]').getAttribute("href");
  const structureCurrent = await page.locator('[data-rail-stop="structure"][aria-current="page"]').count();
  check("结构页三停檐「Cori 循环」回 /pathway/cori", posterHref === "/pathway/cori", posterHref ?? "null");
  check("结构页三停檐当前停为「结构对照」", structureCurrent === 1, String(structureCurrent));
}

/* ===== 3c) 顶栏「常见物质」入口：可点、落到 /substances、1440/1280 仍单行 ===== */
for (const width of [1440, 1280]) {
  await page.setViewportSize({ width, height: 900 });
  await page.goto(`${BASE}/pathway/glycolysis`, { waitUntil: "networkidle" });
  await page.waitForSelector('[data-testid="pathway-rail"]');
  const entry = page.locator('[data-rail-action="substances"]');
  check(`${width} · 顶栏有「常见物质」入口且唯一`, (await entry.count()) === 1, String(await entry.count()));
  check(`${width} · 顶栏入口 href 指向 /substances`, (await entry.getAttribute("href")) === "/substances");
  const geo = await page.evaluate(() => {
    const rail = document.querySelector('[data-testid="pathway-rail"]');
    const right = rail.querySelector(".rr-right");
    const acts = [...right.children].map((el) => {
      const r = el.getBoundingClientRect();
      return { text: (el.textContent ?? "").trim(), top: r.top, bottom: r.bottom, right: r.right };
    });
    return {
      acts,
      railClient: rail.clientWidth,
      railScroll: rail.scrollWidth,
      viewport: window.innerWidth,
    };
  });
  const tops = geo.acts.map((a) => a.top);
  check(
    `${width} · 顶栏右侧动作单行（top 差 ≤2px）`,
    Math.max(...tops) - Math.min(...tops) <= 2,
    JSON.stringify(tops.map((t) => Math.round(t))),
  );
  check(
    `${width} · 顶栏不裁切（scrollWidth ≤ clientWidth + 1）`,
    geo.railScroll <= geo.railClient + 1,
    `${geo.railScroll} / ${geo.railClient}`,
  );
  check(
    `${width} · 顶栏动作不越出视口右缘`,
    Math.max(...geo.acts.map((a) => a.right)) <= geo.viewport,
    String(Math.round(Math.max(...geo.acts.map((a) => a.right)))),
  );
  await entry.click();
  await page.waitForURL("**/substances", { timeout: 10000 });
  check(`${width} · 点顶栏入口落到 /substances`, new URL(page.url()).pathname === "/substances", page.url());
}

/* ===== 4) 同一通路内切换保留 ?step= / ?organ=（自链 + 结构页回挂图） ===== */
await page.setViewportSize({ width: 1440, height: 900 });
await page.goto(`${BASE}/pathway/glycolysis?organ=rbc&step=gk-3`, { waitUntil: "networkidle" });
await page.waitForSelector('[data-testid="pathway-switcher"]');
{
  const selfHref = await page.locator('[data-testid="pathway-switcher"] [data-nav-id="glycolysis"] a').getAttribute("href");
  const keep = new URL(selfHref ?? "", "http://local").searchParams;
  check(
    "同页自链保留 ?organ= 与 ?step=（不丢参数）",
    keep.get("organ") === "rbc" && keep.get("step") === "gk-3" && (selfHref ?? "").startsWith("/pathway/glycolysis?"),
    selfHref ?? "null",
  );
  const coriHref = await page.locator('[data-testid="pathway-switcher"] [data-nav-id="cori"] a').getAttribute("href");
  check("跨通路切换不携带上一页参数（Cori 为干净路由）", coriHref === "/pathway/cori", coriHref ?? "null");
}

// 结构页：切换器当前项仍指向挂图，film-back 的 ?step= 语义不受影响
await page.goto(`${BASE}/structures/glycolysis`, { waitUntil: "networkidle" });
await page.waitForSelector('[data-testid="pathway-switcher"]');
{
  const back = await page.locator('[data-testid="film-back"] a:not(.film-home)').getAttribute("href");
  check("结构页 film-back 仍回挂图（形态未变）", (back ?? "").startsWith("/pathway/glycolysis"), back ?? "null");
  const selfHref = await page.locator('[data-testid="pathway-switcher"] [data-nav-id="glycolysis"] a').getAttribute("href");
  check("结构页当前项指向本通路挂图", selfHref === "/pathway/glycolysis", selfHref ?? "null");
  check("结构页两行导航并存（film-back + 切换器）", (await page.locator('[data-testid="film-back"]').count()) === 1 && (await page.locator('[data-testid="pathway-switcher"]').count()) === 1);
}

/* ===== 5) 1440 版面：单行不换行、不裁切、不压报头 ===== */
{
  await page.goto(`${BASE}/pathway/fatty-acid-oxidation`, { waitUntil: "networkidle" });
  await page.waitForSelector('[data-testid="pathway-switcher"]');
  const geo = await page.evaluate(() => {
    const nav = document.querySelector('[data-testid="pathway-switcher"]');
    const items = [...nav.querySelectorAll("[data-nav-id]")].map((el) => {
      const r = el.getBoundingClientRect();
      return { id: el.getAttribute("data-nav-id"), top: r.top, bottom: r.bottom, left: r.left, right: r.right };
    });
    const mast = document.querySelector(".masthead")?.getBoundingClientRect();
    return {
      nav: { clientWidth: nav.clientWidth, scrollWidth: nav.scrollWidth, top: nav.getBoundingClientRect().top },
      items,
      mastTop: mast ? mast.top : null,
      viewport: window.innerWidth,
    };
  });
  const tops = geo.items.map((i) => i.top);
  check(
    "14 条目在 1440 下单行排列（基线差 ≤ 4px）",
    Math.max(...tops) - Math.min(...tops) <= 4,
    JSON.stringify(tops.map((t) => Math.round(t))),
  );
  check(
    "切换器不裁切（scrollWidth ≤ clientWidth + 1）",
    geo.nav.scrollWidth <= geo.nav.clientWidth + 1,
    `${geo.nav.scrollWidth} / ${geo.nav.clientWidth}`,
  );
  check(
    "切换器不越出视口右缘",
    Math.max(...geo.items.map((i) => i.right)) <= geo.viewport,
    String(Math.round(Math.max(...geo.items.map((i) => i.right)))),
  );
  check(
    "切换器在报头之上（不压报头）",
    geo.mastTop === null || geo.nav.top < geo.mastTop,
    `${Math.round(geo.nav.top)} < ${geo.mastTop === null ? "n/a" : Math.round(geo.mastTop)}`,
  );
}

/* ===== 6) 截图：挂图 / 结构页 / 首页 ===== */
await page.goto(`${BASE}/pathway/tca?step=tca-3`, { waitUntil: "networkidle" });
await page.waitForSelector('[data-testid="pathway-switcher"]');
await page.screenshot({ path: join(ROOT, "preview", "nav-poster-tca.png") });
console.log("✓ 截图 preview/nav-poster-tca.png（1440 挂图页）");

await page.goto(`${BASE}/structures/tca`, { waitUntil: "networkidle" });
await page.waitForSelector('[data-testid="pathway-switcher"]');
await page.screenshot({ path: join(ROOT, "preview", "nav-structure-tca.png") });
console.log("✓ 截图 preview/nav-structure-tca.png（1440 结构页）");

await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
await page.waitForSelector('[data-testid="pathway-switcher"]');
await page.screenshot({ path: join(ROOT, "preview", "nav-home.png") });
console.log("✓ 截图 preview/nav-home.png（1440 首页）");

if (errors.length) {
  console.error("页面错误：", errors);
  failed = true;
}
await browser.close();
console.log(failed ? "\n✗ smoke-nav 有失败项" : "\n✓ smoke-nav 全部通过");
if (failed) process.exit(1);
