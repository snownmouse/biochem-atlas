// 首页总图冒烟（/）—— 上下两域 · 代谢脊柱构图。
//
// 【因功能取消的旧断言】旧版是 2480 px 横向长卷 + 三段刻度滚动导航 + 顶部十条索引栏，
// 因此此前断言「横向漫游可滚到 TCA / β-氧化」「三段导航可点/键盘换段」「home-index 十条去向」。
// 本版改为上下两域构图：六条通路在 1440 首屏一次全览，不再横向漫游，三段刻度换成了
// 「胞质 / 基质」域标签 + 全图指示，顶部索引栏被移除（十二条去向仍在右栏保留）。
// 这些断言是随功能取消而删除，并非弱化；新构图对应的断言在下面第 2、10 节补足。
//
// 【第六条通路上线后的计数更新】新增氧化磷酸化：节点 35→38（NADH / FADH₂ / Q），
// 共用节点 14→16（NADH 与 FADH₂ 各连 TCA / β-氧化 / 氧化磷酸化三条），
// 边 56→62（新增四条 TCA / β-氧化到 NADH / FADH₂ 的辅因子虚线，以及 NADH / FADH₂ → Q 两条入口线）；
// 通路区块与标题 5→6，右栏去向 10→12。这些是计数同步，不是放宽断言。
//
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
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
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
  ["oxphos", "氧化磷酸化"],
];

const firstScreenTitles = async () =>
  page.locator("[data-pathway-title]").evaluateAll((els) =>
    els.map((el) => {
      const box = el.getBoundingClientRect();
      return {
        id: el.getAttribute("data-pathway-title"),
        text: el.textContent ?? "",
        x: Math.round(box.x),
        y: Math.round(box.y),
        right: Math.round(box.right),
        bottom: Math.round(box.bottom),
      };
    })
  );

// ===== 1) 路由与总图骨架 =====
const resp = await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
check("路由 / 返回 200", resp?.status() === 200);
check("总图 svg 存在且唯一", (await page.locator('svg[data-home-map="1"]').count()) === 1);
check("报头 PLATE 00", (await page.locator(".plate-no").innerText()).includes("PLATE 00"));
check("首屏无 3D canvas", (await page.locator("canvas").count()) === 0);
check("无控制台报错", errors.length === 0, errors.join(" | "));

// ===== 2) 六条通路区块：存在、可点、1440×900 首屏标题全部可见 =====
const blockAttrs = await page.locator("[data-pathway-block]").evaluateAll((els) =>
  els.map((el) => [el.getAttribute("data-pathway-block"), el.getAttribute("href")])
);
check("六个通路区块存在", blockAttrs.length === 6, String(blockAttrs.length));
check(
  "通路区块 href 指向六条挂图",
  blockAttrs.every(([id, href]) => href === `/pathway/${id}`),
  JSON.stringify(blockAttrs)
);

const titles = await firstScreenTitles();
check("六个通路标题存在", titles.length === 6, String(titles.length));
for (const [id, name] of PATHWAYS) {
  const title = titles.find((item) => item.id === id);
  check(`图上出现「${name}」标题`, Boolean(title) && title.text.includes(name), title?.text ?? "missing");
}
const offscreen = titles.filter((t) => t.y < 0 || t.bottom > 900 || t.x < 0 || t.right > 1440);
check(
  "1440×900 首屏内六条通路标题全部可见（无需横向漫游）",
  titles.length === 6 && offscreen.length === 0,
  JSON.stringify(titles.map((t) => [t.id, t.x, t.y, t.right, t.bottom]))
);
const mapBox = await page.locator('svg[data-home-map="1"]').boundingBox();
check(
  "六条通路标题都在同一屏高内（最低标题底边 ≤ 900）",
  Boolean(mapBox) && Math.max(...titles.map((t) => t.bottom)) <= 900,
  JSON.stringify({ mapTop: mapBox?.y, mapHeight: mapBox?.height, lowestTitle: Math.max(...titles.map((t) => t.bottom)) })
);

// ===== 3) 右栏十二条去向 =====
const destLinks = await page.locator("[data-home-link]").evaluateAll((els) =>
  els.map((el) => el.getAttribute("href"))
);
check("右栏十二条去向链接", destLinks.length === 12, String(destLinks.length));
check(
  "十二条去向覆盖六挂图 + 六结构对照",
  PATHWAYS.every(
    ([id]) => destLinks.includes(`/pathway/${id}`) && destLinks.includes(`/structures/${id}`),
  )
);

// ===== 4) 共用节点合并：同一实体只出现一次 =====
const nodeInfo = await page.locator("svg [data-entity-id]").evaluateAll((els) =>
  els.map((el) => ({
    id: el.getAttribute("data-entity-id"),
    junction: el.getAttribute("data-junction"),
    pathways: (el.getAttribute("data-pathway-ids") ?? "").split(",").filter(Boolean),
  }))
);
const nodeIds = nodeInfo.map((node) => node.id);
check("图上节点总数 38", nodeIds.length === 38, String(nodeIds.length));
check("同一实体 id 不重复出现", new Set(nodeIds).size === nodeIds.length, `${nodeIds.length} → ${new Set(nodeIds).size}`);
const junctions = nodeInfo.filter((node) => node.junction === "1");
check("共用节点 16 个", junctions.length === 16, String(junctions.length));
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
const oaa = nodeInfo.filter((node) => node.id === "oaa");
check("草酰乙酸只画一次（TCA + 糖异生）", oaa.length === 1 && oaa[0].pathways.length === 2, JSON.stringify(oaa));
const nadh = nodeInfo.filter((node) => node.id === "nadh");
check(
  "NADH 只画一次且连接 TCA / β-氧化 / 氧化磷酸化三条",
  nadh.length === 1 && nadh[0].pathways.length === 3,
  JSON.stringify(nadh),
);
const fadh2 = nodeInfo.filter((node) => node.id === "fadh2");
check(
  "FADH₂ 只画一次且连接 TCA / β-氧化 / 氧化磷酸化三条",
  fadh2.length === 1 && fadh2[0].pathways.length === 3,
  JSON.stringify(fadh2),
);

// ===== 5) 三条跨域共用标注存在 =====
for (const [id, keyword] of [
  ["pyr", "两域共用"],
  ["accoa", "接驳"],
  ["oaa", "两域共用"],
]) {
  const tags = await page.locator(`[data-shared-tag="${id}"]`).evaluateAll((els) => els.map((el) => el.textContent ?? ""));
  check(`${id} 的跨域共用标注存在`, tags.length === 1 && tags[0].includes(keyword), JSON.stringify(tags));
}

// ===== 6) 每条连线可解析到数据来源 =====
const edgeInfo = await page.locator("svg [data-edge-id]").evaluateAll((els) =>
  els.map((el) => ({
    id: el.getAttribute("data-edge-id"),
    sources: el.getAttribute("data-edge-sources") ?? "",
    pathway: el.getAttribute("data-pathway-id"),
  }))
);
check("图上连线数量 62", edgeInfo.length === 62, String(edgeInfo.length));
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
check(
  "NADH / FADH₂ 各有两条来自 TCA 与 β-氧化的接口线",
  edgeInfo.filter((edge) => edge.id.endsWith("->nadh")).length === 2 &&
    edgeInfo.filter((edge) => edge.id.endsWith("->fadh2")).length === 2,
  JSON.stringify({
    nadh: edgeInfo.filter((edge) => edge.id.endsWith("->nadh")).map((edge) => edge.id),
    fadh2: edgeInfo.filter((edge) => edge.id.endsWith("->fadh2")).map((edge) => edge.id),
  }),
);
check(
  "氧化磷酸化的两条入口线（NADH / FADH₂ → Q）存在",
  edgeInfo.some((edge) => edge.id === "oxphos:nadh->q") &&
    edgeInfo.some((edge) => edge.id === "oxphos:fadh2->q"),
);

// ===== 7) 点共用节点：右栏列出连接通路，不跳转 =====
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

// 点乙酰-CoA：右栏必须列出 TCA + β-氧化（跨域接驳点）
await page.locator('svg [data-node-id="accoa"] circle').first().click({ force: true });
await page.waitForTimeout(250);
const accoaPanel = await page.locator('[data-testid="junction-panel"]').innerText();
check(
  "乙酰-CoA 共用节点列出 TCA 与 β-氧化",
  accoaPanel.includes("三羧酸循环") && accoaPanel.includes("β-氧化"),
  accoaPanel.replace(/\s+/g, " ").slice(0, 140),
);

// ===== 8) 点普通节点进入挂图 =====
await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
await page.locator('svg [data-node-id="6pg"] circle').first().click({ force: true });
await page.waitForURL("**/pathway/ppp", { timeout: 5000 }).catch(() => {});
check("点普通节点进入对应挂图", page.url().includes("/pathway/ppp"), page.url());

// ===== 9) 点步骤连线带 ?step= =====
await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
// 双向走廊两条线相距约 14 px，不能用 <g> 包围盒中心（会被另一侧的线截获）；
// 取该条线自身包围盒中心，命中哪条线由像素决定，正是用户真实点击行为。
const glycoLine = await page.locator('[data-edge-id="glycolysis:g6p->f6p"] line').boundingBox();
await page.mouse.click(glycoLine.x + glycoLine.width / 2, glycoLine.y + glycoLine.height / 2);
await page.waitForURL("**/pathway/glycolysis?step=gk-2", { timeout: 5000 }).catch(() => {});
check("点步骤连线带 ?step=", page.url().includes("/pathway/glycolysis?step=gk-2"), page.url());

// ===== 10) 区室与域标签 =====
await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
const mapText = await page.locator("svg[data-home-map='1']").evaluate((el) => el.textContent ?? "");
for (const label of ["细胞质", "膜间腔", "外膜", "内膜", "线粒体基质", "ER 腔"]) {
  check(`区室/膜带标注「${label}」`, mapText.includes(label));
}

// 域标签只做当前域指示：默认全图，点胞质/基质高亮，再点回全图
const countText = await page.locator('[data-testid="home-domain-count"]').innerText();
check("域指示默认报全图", countText.includes("全图") && countText.includes("02 域"), countText);
check("域标签两个分段", (await page.locator("[data-domain-nav]").count()) === 2);
check("域标签不承载横向漫游", (await page.locator("[data-nav-segment]").count()) === 0);
await page.locator('[data-domain-nav="cytosol"]').click();
await page.waitForTimeout(150);
check(
  "点「胞质」指示当前域为胞质",
  (await page.locator('[data-testid="home-domain-count"]').innerText()).includes("当前域 · 胞质"),
);
check(
  "胞质域块高亮、基质不亮",
  (await page.locator('[data-domain-band="cytosol"]').getAttribute("data-domain-on")) === "1" &&
    (await page.locator('[data-domain-band="matrix"]').getAttribute("data-domain-on")) === "0",
);
await page.locator('[data-domain-nav="matrix"]').click();
await page.waitForTimeout(150);
check(
  "点「线粒体基质」指示当前域为基质",
  (await page.locator('[data-testid="home-domain-count"]').innerText()).includes("当前域 · 基质"),
);
check("点击域标签不跳页", page.url().endsWith("/"), page.url());
await page.locator('[data-domain-nav="matrix"]').click();
await page.waitForTimeout(150);
check("再点同一域恢复全图", (await page.locator('[data-testid="home-domain-count"]').innerText()).includes("全图"));
await page.locator('[data-domain-nav="cytosol"]').focus();
check(
  "域标签可键盘聚焦",
  (await page.evaluate(() => document.activeElement?.getAttribute("data-domain-nav"))) === "cytosol",
);

// ===== 11) 首屏不横向滚动 =====
const scrollFit = await page.locator('[data-testid="home-plate-scroll"]').evaluate((el) => ({
  client: el.clientWidth,
  scroll: el.scrollWidth,
}));
check("图版容器无横向溢出（1440）", scrollFit.scroll <= scrollFit.client + 2, JSON.stringify(scrollFit));
const docFit = await page.evaluate(() => ({
  client: document.documentElement.clientWidth,
  scroll: document.documentElement.scrollWidth,
}));
check("文档无横向溢出（1440）", docFit.scroll <= docFit.client + 2, JSON.stringify(docFit));
check(
  "右栏不与图版重叠（双栏栅格仍在）",
  (await page.locator(".home-aside").boundingBox()).x > (await page.locator(".plate-wrap").boundingBox()).x,
);

// ===== 12) 致敬栏 =====
const tribute = await page.locator(".home-tribute").innerText();
check("致敬栏存在", tribute.length > 0);
check("致敬写 Nicholson 与 1960", tribute.includes("Nicholson") && tribute.includes("1960"));
check("致敬写 KEGG 与 1995 / Kanehisa", tribute.includes("KEGG") && tribute.includes("1995") && tribute.includes("Kanehisa"));
check("明确是体例致敬而非内容引用", tribute.includes("体例致敬") && tribute.includes("不取自"));

// ===== 13) 十二条去向页都有首页入口 =====
for (const [id] of PATHWAYS) {
  for (const route of [`/pathway/${id}`, `/structures/${id}`]) {
    await page.goto(`${BASE}${route}`, { waitUntil: "domcontentloaded" });
    await page.waitForSelector('a[href="/"]', { timeout: 8000 }).catch(() => {});
    const homeLinks = await page.locator('a[href="/"]').count();
    check(`${route} 有首页入口`, homeLinks >= 1, String(homeLinks));
  }
}

// ===== 14) 截图：1440 首屏 / 共用节点状态 / 1280 可用性 =====
await page.setViewportSize({ width: 1440, height: 900 });
await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
await page.waitForTimeout(500);
await page.screenshot({ path: join(ROOT, "preview", "home-overview.png") });
console.log("✓ 截图 preview/home-overview.png（1440×900 首屏 · 六条通路一次全览）");
await page.screenshot({ path: join(ROOT, "preview", "home-full.png"), fullPage: true });
console.log("✓ 截图 preview/home-full.png（1440 宽整页）");

await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
await page.locator('svg [data-node-id="accoa"] circle').first().click({ force: true });
await page.waitForTimeout(400);
await page.screenshot({ path: join(ROOT, "preview", "home-junction.png") });
console.log("✓ 截图 preview/home-junction.png（1440×900 · 点乙酰-CoA 共用节点）");

// 1280 窄屏：只记录可用性结论，不为窄屏改版。
await page.setViewportSize({ width: 1280, height: 900 });
await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
await page.waitForTimeout(400);
const titles1280 = await firstScreenTitles();
const fit1280 = await page.evaluate(() => ({
  client: document.documentElement.clientWidth,
  scroll: document.documentElement.scrollWidth,
}));
check(
  "1280 下六条通路标题仍全部可见",
  titles1280.length === 6 && titles1280.every((t) => t.y >= 0 && t.bottom <= 900 && t.x >= 0 && t.right <= 1280),
  JSON.stringify(titles1280.map((t) => [t.id, t.x, t.y, t.right, t.bottom]))
);
check("1280 下无横向滚动", fit1280.scroll <= fit1280.client + 2, JSON.stringify(fit1280));
const scroll1280 = await page.locator('[data-testid="home-plate-scroll"]').evaluate((el) => ({
  client: el.clientWidth,
  scroll: el.scrollWidth,
}));
check("1280 下图版无横向溢出", scroll1280.scroll <= scroll1280.client + 2, JSON.stringify(scroll1280));
await page.screenshot({ path: join(ROOT, "preview", "home-1280.png") });
console.log("✓ 截图 preview/home-1280.png（1280×900 · 可用性记录）");

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
