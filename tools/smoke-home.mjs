// 首页总图冒烟（/）：五通路区块可点、十条去向、junction 合并无重复、
// 每条边带数据来源、点共用节点开右栏、点普通节点/步骤进入挂图、致敬栏、首屏无 3D。
// 需先 `npm run build`，并让 preview 服务跑在 BASE_URL（默认 http://localhost:4173）。
import { mkdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright-core";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const BASE = process.env.BASE_URL ?? "http://localhost:4173";
let failed = false;
const check = (label, ok, detail = "") => {
  console.log(`${ok ? "✓" : "✗"} ${label}${detail ? ` — ${detail}` : ""}`);
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
const page = await browser.newPage({ viewport: { width: 1440, height: 960 } });
const errors = [];
page.on("pageerror", (e) => errors.push(String(e)));
page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
mkdirSync(join(ROOT, "preview"), { recursive: true });

const PATHWAYS = [
  ["glycolysis", "糖酵解"],
  ["tca", "三羧酸循环"],
  ["gluconeogenesis", "糖异生"],
  ["ppp", "磷酸戊糖途径"],
  ["fatty-acid-oxidation", "β-氧化"],
];

// ===== 1) 路由与总图骨架 =====
const resp = await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
check("路由 / 返回 200", resp?.status() === 200);
check("总图 svg 存在且唯一", (await page.locator('svg[data-home-map="1"]').count()) === 1);
check("报头 PLATE 00", (await page.locator(".plate-no").innerText()).includes("PLATE 00"));
check("首屏无 3D canvas", (await page.locator("canvas").count()) === 0);
check("无控制台报错", errors.length === 0, errors.join(" | "));

// ===== 2) 五条通路区块存在、文字与去向 =====
const blockAttrs = await page.locator("[data-pathway-block]").evaluateAll((els) =>
  els.map((el) => [el.getAttribute("data-pathway-block"), el.getAttribute("href")])
);
check("五个通路区块存在", blockAttrs.length === 5);
check(
  "通路区块 href 指向五条挂图",
  blockAttrs.every(([id, href]) => href === `/pathway/${id}`),
  JSON.stringify(blockAttrs)
);
const blockText = await page.locator("svg[data-home-map='1']").evaluate((el) => el.textContent ?? "");
for (const [, name] of PATHWAYS) check(`图上出现「${name}」`, blockText.includes(name));

const indexLinks = await page.locator(".home-index a[data-home-link]").evaluateAll((els) =>
  els.map((el) => el.getAttribute("href"))
);
check("首页十条去向链接", indexLinks.length === 10, String(indexLinks.length));
check(
  "十条去向覆盖五挂图 + 五结构对照",
  ["glycolysis", "tca", "gluconeogenesis", "ppp", "fatty-acid-oxidation"].every(
    (id) => indexLinks.includes(`/pathway/${id}`) && indexLinks.includes(`/structures/${id}`),
  )
);

// ===== 3) 共用节点合并：同一实体只出现一次 =====
const nodeInfo = await page.locator("svg [data-entity-id]").evaluateAll((els) =>
  els.map((el) => ({
    id: el.getAttribute("data-entity-id"),
    junction: el.getAttribute("data-junction"),
    pathways: (el.getAttribute("data-pathway-ids") ?? "").split(",").filter(Boolean),
  }))
);
const nodeIds = nodeInfo.map((node) => node.id);
check("图上节点总数 35", nodeIds.length === 35, String(nodeIds.length));
check("同一实体 id 不重复出现", new Set(nodeIds).size === nodeIds.length, `${nodeIds.length} → ${new Set(nodeIds).size}`);
const junctions = nodeInfo.filter((node) => node.junction === "1");
check("共用节点 14 个", junctions.length === 14, String(junctions.length));
check(
  "每个共用节点至少连接两条通路",
  junctions.every((node) => node.pathways.length >= 2),
  junctions.filter((node) => node.pathways.length < 2).map((node) => node.id).join(","),
);
const g6p = nodeInfo.filter((node) => node.id === "g6p");
check("G6P 只画一次且为三通路共用", g6p.length === 1 && g6p[0].pathways.length === 3, JSON.stringify(g6p));
const pyr = nodeInfo.filter((node) => node.id === "pyr");
check("丙酮酸只画一次且为三通路共用", pyr.length === 1 && pyr[0].pathways.length === 3, JSON.stringify(pyr));
const accoa = nodeInfo.filter((node) => node.id === "accoa");
check("乙酰-CoA 只画一次（TCA + β-氧化）", accoa.length === 1 && accoa[0].pathways.length === 2, JSON.stringify(accoa));

// ===== 4) 每条连线可解析到数据来源 =====
const edgeInfo = await page.locator("svg [data-edge-id]").evaluateAll((els) =>
  els.map((el) => ({
    id: el.getAttribute("data-edge-id"),
    sources: el.getAttribute("data-edge-sources") ?? "",
    pathway: el.getAttribute("data-pathway-id"),
  }))
);
check("图上连线数量 56", edgeInfo.length === 56, String(edgeInfo.length));
check(
  "每条连线都带非空数据来源",
  edgeInfo.every((edge) => edge.sources.trim().length > 0),
  edgeInfo.filter((edge) => !edge.sources.trim()).map((edge) => edge.id).join(","),
);
check(
  "连线来源均带通路前缀（可反查数据文件）",
  edgeInfo.every(
    (edge) => Boolean(edge.pathway) && edge.sources.split(" ").every((source) => source.includes(":")),
  ),
);
const edgeSourcesText = edgeInfo.map((edge) => edge.sources).join(" ");
for (const [id] of PATHWAYS) check(`连线来源含 ${id} 步骤`, edgeSourcesText.includes(`${id}:`));

// ===== 5) 点共用节点：右栏列出连接通路，不跳转 =====
await page.locator('svg [data-node-id="g6p"] circle').first().click({ force: true });
await page.waitForTimeout(250);
check("点共用节点不跳转", page.url().endsWith("/"), page.url());
const panelText = await page.locator('[data-testid="junction-panel"]').innerText();
check("右栏显示 G6P", panelText.includes("G6P"));
check(
  "右栏列出三条连接通路",
  panelText.includes("糖酵解") && panelText.includes("磷酸戊糖途径") && panelText.includes("糖异生"),
  panelText.replace(/\s+/g, " ").slice(0, 120),
);
const panelLinks = await page.locator('[data-testid="junction-panel"] a').evaluateAll((els) =>
  els.map((el) => el.getAttribute("href"))
);
check("共用节点提供步骤级链接", panelLinks.length >= 3 && panelLinks.every((href) => href?.includes("?step=")), JSON.stringify(panelLinks));

// ===== 6) 点普通节点进入挂图 =====
await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
await page.locator('svg [data-node-id="6pg"] circle').first().click({ force: true });
await page.waitForURL("**/pathway/ppp", { timeout: 5000 }).catch(() => {});
check("点普通节点进入对应挂图", page.url().includes("/pathway/ppp"), page.url());

// ===== 7) 点步骤连线带 ?step= =====
await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
await page.locator('[data-edge-id="glycolysis:g6p->f6p"]').click({ force: true });
await page.waitForURL("**/pathway/glycolysis?step=gk-2", { timeout: 5000 }).catch(() => {});
check("点步骤连线带 ?step=", page.url().includes("/pathway/glycolysis?step=gk-2"), page.url());

// ===== 8) 区室表达 =====
await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
const mapText = await page.locator("svg[data-home-map='1']").evaluate((el) => el.textContent ?? "");
for (const label of ["线粒体基质", "线粒体内膜", "膜间腔", "细胞质", "内质网腔"]) {
  check(`区室带标注「${label}」`, mapText.includes(label));
}

// ===== 9) 致敬栏 =====
const tribute = await page.locator(".home-tribute").innerText();
check("致敬栏存在", tribute.length > 0);
check("致敬写 Nicholson 与 1960", tribute.includes("Nicholson") && tribute.includes("1960"));
check("致敬写 KEGG 与 1995 / Kanehisa", tribute.includes("KEGG") && tribute.includes("1995") && tribute.includes("Kanehisa"));
check("明确是体例致敬而非内容引用", tribute.includes("体例致敬") && tribute.includes("不取自"));

// ===== 10) 首屏总览导航：可见、可点、点击入视口、键盘可达 =====
await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
const navBox = await page.locator('[data-testid="home-mapnav"]').boundingBox();
const countText = await page.locator('[data-testid="home-nav-count"]').innerText();
const segLabels = await page.locator(".mn-seg .mn-label").evaluateAll((els) =>
  els.map((el) => ({ text: el.textContent ?? "", box: el.getBoundingClientRect().toJSON() }))
);
check("总览导航存在且在首屏内", Boolean(navBox) && navBox.y >= 0 && navBox.y < 960 && navBox.width > 500, JSON.stringify(navBox));
check("总览导航分三段", (await page.locator("[data-nav-segment]").count()) === 3);
check("首屏能看到右端两段（TCA / β-氧化）", segLabels.length === 3 &&
  segLabels[1].text.includes("TCA") && segLabels[2].text.includes("β-氧化") &&
  segLabels.every((seg) => seg.box.x >= 0 && seg.box.x + seg.box.width <= 1440 && seg.box.y < 960),
  JSON.stringify(segLabels.map((seg) => [seg.text, Math.round(seg.box.x), Math.round(seg.box.width)])));
check("导航报出总段数与当前段（初始 01）", countText.includes("03 段") && countText.includes("01"), countText);
const plateBox = await page.locator('[data-testid="home-plate-scroll"]').boundingBox();
check("导航不压图（位于画布上方）", Boolean(plateBox) && navBox.y + navBox.height <= plateBox.y + 1, `${navBox.y + navBox.height} / ${plateBox.y}`);

const scrollMetrics = () =>
  page.locator('[data-testid="home-plate-scroll"]').evaluate((el) => ({
    left: el.scrollLeft,
    max: el.scrollWidth - el.clientWidth,
  }));
const blockX = async (id) => {
  const box = await page.locator(`[data-pathway-block="${id}"]`).boundingBox();
  return box ? box.x : -9999;
};

await page.locator('[data-nav-segment="matrix"]').click();
await page.waitForTimeout(200);
const afterMatrix = await scrollMetrics();
check("点「线粒体基质」段直接滚到 TCA", afterMatrix.left >= 900, JSON.stringify(afterMatrix));
check("TCA 段进入视口", (await blockX("tca")) > 0 && (await blockX("tca")) < 1440, String(await blockX("tca")));
check("当前段更新为 02", (await page.locator('[data-testid="home-nav-count"]').innerText()).includes("02"));
check("点导航不跳页", page.url().endsWith("/"), page.url());

await page.locator('[data-nav-segment="membrane"]').click();
await page.waitForTimeout(200);
const afterMembrane = await scrollMetrics();
check("点「膜 · β-氧化」段滚到画布右端", afterMembrane.left >= afterMembrane.max - 4, JSON.stringify(afterMembrane));
check("β-氧化段进入视口", (await blockX("fatty-acid-oxidation")) > 0 && (await blockX("fatty-acid-oxidation")) < 1440, String(await blockX("fatty-acid-oxidation")));
check("当前段更新为 03", (await page.locator('[data-testid="home-nav-count"]').innerText()).includes("03"));

// 键盘：Tab/聚焦 → 方向键换段 → Enter 跳转
await page.locator('[data-nav-segment="cytosol"]').click();
await page.locator('[data-nav-segment="cytosol"]').focus();
const focusedSeg = await page.evaluate(() => document.activeElement?.getAttribute("data-nav-segment"));
check("导航按钮可键盘聚焦", focusedSeg === "cytosol", String(focusedSeg));
await page.keyboard.press("ArrowRight");
const afterArrow = await page.evaluate(() => document.activeElement?.getAttribute("data-nav-segment"));
check("方向键移到下一段", afterArrow === "matrix", String(afterArrow));
await page.keyboard.press("Enter");
await page.waitForTimeout(200);
check("键盘 Enter 跳到基质段", (await scrollMetrics()).left >= 900, JSON.stringify(await scrollMetrics()));
await page.keyboard.press("ArrowRight");
await page.keyboard.press("Enter");
await page.waitForTimeout(200);
check("键盘连按可到 β-氧化段", (await page.locator('[data-testid="home-nav-count"]').innerText()).includes("03"));
await page.locator('[data-nav-segment="cytosol"]').click();
await page.waitForTimeout(200);
check("点回胞质段归零", (await scrollMetrics()).left <= 2, JSON.stringify(await scrollMetrics()));

// ===== 11) 十条去向页都有首页入口 =====
await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
for (const [id] of PATHWAYS) {
  for (const route of [`/pathway/${id}`, `/structures/${id}`]) {
    await page.goto(`${BASE}${route}`, { waitUntil: "domcontentloaded" });
    await page.waitForSelector('a[href="/"]', { timeout: 8000 }).catch(() => {});
    const homeLinks = await page.locator('a[href="/"]').count();
    check(`${route} 有首页入口`, homeLinks >= 1, String(homeLinks));
  }
}

// ===== 12) 截图 =====
await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
await page.waitForTimeout(500);
await page.screenshot({ path: join(ROOT, "preview", "home-overview.png"), fullPage: true });
console.log("✓ 截图 preview/home-overview.png（1440 宽首屏，含三段总览导航）");
await page.locator('[data-nav-segment="membrane"]').click();
await page.waitForTimeout(300);
await page.screenshot({ path: join(ROOT, "preview", "home-nav-jump.png"), fullPage: true });
console.log("✓ 截图 preview/home-nav-jump.png（1440 宽 · 点「膜 · β-氧化」段之后）");
await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
await page.locator('svg [data-node-id="g6p"] circle').first().click({ force: true });
await page.waitForTimeout(400);
await page.screenshot({ path: join(ROOT, "preview", "home-junction.png"), fullPage: true });
console.log("✓ 截图 preview/home-junction.png（1440 宽 · 点共用节点 G6P）");

// 整图全景：2480 px 画布在 1440 视口下需横向漫游，故用加宽视口取一张完整总图（仅用于交付核对，不改页面机制）。
await page.setViewportSize({ width: 2920, height: 1500 });
await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
await page.waitForTimeout(600);
check("宽视口下导航改报全图", (await page.locator('[data-testid="home-nav-count"]').innerText()).includes("全图"));
await page.screenshot({ path: join(ROOT, "preview", "home-panorama.png"), fullPage: true });
console.log("✓ 截图 preview/home-panorama.png（2920 宽 · 整图全景，含全部 2480 px 画布）");

// 1280 窄屏：只记录可用性结论，不为窄屏改版。
await page.setViewportSize({ width: 1280, height: 900 });
await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
await page.waitForTimeout(400);
const nav1280 = await page.locator('[data-testid="home-mapnav"]').boundingBox();
const seg1280 = await page.locator(".mn-seg").evaluateAll((els) =>
  els.map((el) => ({ text: el.textContent ?? "", w: el.getBoundingClientRect().width }))
);
check("1280 下导航仍在首屏且三段可见", Boolean(nav1280) && nav1280.y < 900 && seg1280.length === 3 && seg1280.every((seg) => seg.w > 120),
  JSON.stringify(seg1280.map((seg) => [seg.text, Math.round(seg.w)])));
await page.locator('[data-nav-segment="membrane"]').click();
await page.waitForTimeout(200);
const scroll1280 = await page.locator('[data-testid="home-plate-scroll"]').evaluate((el) => ({
  left: el.scrollLeft,
  max: el.scrollWidth - el.clientWidth,
}));
check("1280 下点 β-氧化段仍可滚到右端", scroll1280.left >= scroll1280.max - 4, JSON.stringify(scroll1280));
await page.screenshot({ path: join(ROOT, "preview", "home-1280.png"), fullPage: true });
console.log("✓ 截图 preview/home-1280.png（1280 宽 · 导航与跳转可用）");

if (errors.length) {
  console.error("页面错误：", errors);
  failed = true;
}
await browser.close();

if (failed) {
  console.error("\n首页冒烟存在失败项");
  process.exit(1);
}
console.log("\n首页冒烟全部通过");
