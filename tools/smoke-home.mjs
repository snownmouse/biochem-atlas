// 首页总图冒烟（/）—— 上下两域 · 代谢脊柱构图。
//
// 【因功能取消的旧断言】旧版是 2480 px 横向长卷 + 三段刻度滚动导航 + 顶部十条索引栏，
// 因此此前断言「横向漫游可滚到 TCA / β-氧化」「三段导航可点/键盘换段」「home-index 十条去向」。
// 本版改为上下两域构图：七条通路在 1440 首屏一次全览，不再横向漫游，三段刻度换成了
// 「胞质 / 基质」域标签 + 全图指示，顶部索引栏被移除（十四条去向仍在右栏保留）。
// 这些断言是随功能取消而删除，并非弱化；新构图对应的断言在下面第 2、10 节补足。
//
// 【第六条通路上线后的计数更新】新增氧化磷酸化：节点 35→38（NADH / FADH₂ / Q），
// 共用节点 14→16（NADH 与 FADH₂ 各连 TCA / β-氧化 / 氧化磷酸化三条），
// 边 56→62（新增四条 TCA / β-氧化到 NADH / FADH₂ 的辅因子虚线，以及 NADH / FADH₂ → Q 两条入口线）；
// 通路区块与标题 5→6，右栏去向 10→12。这些是计数同步，不是放宽断言。
//
// 【第八条通路上线后的计数更新】新增脂肪酸从头合成（FAS，PLATE 08）：只登记标题块与导航，
// 不并入 SOURCES，因此节点 38 / 共用节点 16 / 边 62 的口径保持不变；
// 通路区块与标题 6→7，右栏去向 12→14。同样是计数同步，不是放宽断言。
//
// 【PLATE 08 柠檬酸穿梭接入后的计数更新】FAS 的 fas-shuttle（cit → accoa，ACLY 裂解）作为显式跨通路接口接入，
// 不新增节点（cit / accoa 原本已在图上）；cit 由 TCA 单通路变成 TCA / FAS 共用，共用节点 16→17，
// 边 62→63。节点仍为 38。这些仍是计数同步，不是放宽断言。
//
// 【PLATE 09 尿素循环接入后的计数更新】尿素循环的天冬氨酸—延胡索酸臂（urea-3 / urea-4 + recycle）
// 作为显式跨通路接口接入，新增 asp / argininosuccinate 两个节点（38→40）；fum 由 TCA 单通路
// 变成 TCA / 尿素循环共用（17→18），边 63→66。原先「尿素循环不硬拉线」的断言随功能实现
// 改为「三条尿素接口边存在且来源可反查」，并非放宽。其余尿素分子（nh3 / carbamoylP /
// citrulline / arginine / urea / ornithine）没有可对上的既有节点，仍只在 PLATE 09 标题块中。
//
// 【版式政策更新 2026-11-05】横向滚动口径由「图版单屏零溢出」改为
// 「页面级零横向滚动 + 图版容器按档位可拖」：1440 展开 0、1280 展开 ≤ 200px、收起 0。
// 这是按新政策替换过期断言，不是放宽阈值；页面级溢出仍要求严格为 0。
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
  ["fatty-acid-synthesis", "脂肪酸从头合成"],
  ["urea-cycle", "尿素循环"],
  ["glycogen", "糖原代谢"],
  ["amino-acids", "氨基酸代谢"],
  ["cholesterol", "胆固醇合成"],
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

// ===== 1b) 默认态 = 收起辅助栏 + 等比铺满（受 1400px 上限约束） =====
// 政策（2026-11-05）：无参数默认不再是展开态。默认档 = 收起 + fitwidth；
// 旧的「展开」口径保留为 ?fold=open，旧的「收起 1020 居中」保留为 ?fold=center。
check(
  "默认态 · 右栏收起（aria-expanded=false）",
  (await page.locator('[data-aside-toggle="1"]').getAttribute("aria-expanded")) === "false",
);
check(
  "默认态 · 按钮文案「展开辅助栏」",
  (await page.locator('[data-aside-toggle="1"]').innerText()).trim() === "展开辅助栏",
);
check("默认态 · 右栏不可见", await page.locator("#home-aside").isHidden());
check(
  "默认态 · 档位为 fitwidth",
  (await page.locator(".home-poster .body-grid").getAttribute("data-fold-mode")) === "fitwidth",
);

// ===== 1c) 报头「常见物质」入口：唯一、指向 /substances、点击落点正确 =====
{
  const entry = page.locator('[data-home-substances="1"]');
  check("报头有「常见物质」入口且唯一", (await entry.count()) === 1, String(await entry.count()));
  check("报头入口 href 指向 /substances", (await entry.getAttribute("href")) === "/substances");
  await entry.click();
  await page.waitForURL("**/substances", { timeout: 10000 });
  check("点报头入口落到 /substances", new URL(page.url()).pathname === "/substances", page.url());
  await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
}

// ===== 2) 十条通路区块：存在、可点、1440×900 展开档十条可见（第 11 条允许出屏） =====
// 第 11 条（氨基酸代谢，PLATE 11）落在 y=650，用户已明确接受「往下拉」；
// 默认档首屏完整可见仍为 8/11（尿素 / 糖原 / 氨基酸落到首屏下方，逐档实测见第 15 节）。
// 原「十条全见」断言的判定口径是「展开档」；用同一套 ?fold=open 参数还原展开档，断言与阈值原样保留。
/** 路由别名：FAS 的挂图路由按需求为 /pathway/fas，结构页沿用 /structures/<数据目录名> */
const ROUTE_ALIAS = {
  "fatty-acid-synthesis": { poster: "/pathway/fas", structures: "/structures/fatty-acid-synthesis" },
};
const posterRoute = (id) => ROUTE_ALIAS[id]?.poster ?? `/pathway/${id}`;
const structureRoute = (id) => ROUTE_ALIAS[id]?.structures ?? `/structures/${id}`;

await page.goto(`${BASE}/?fold=open`, { waitUntil: "networkidle" });

const blockAttrs = await page.locator("[data-pathway-block]").evaluateAll((els) =>
  els.map((el) => [el.getAttribute("data-pathway-block"), el.getAttribute("href")])
);
check("十一个通路区块存在", blockAttrs.length === 11, String(blockAttrs.length));
check(
  "通路区块 href 指向十一条挂图",
  blockAttrs.every(([id, href]) => href === posterRoute(id)),
  JSON.stringify(blockAttrs)
);

const titles = await firstScreenTitles();
check("十二个通路标题存在（十一区块 + Cori 连接带）", titles.length === 12, String(titles.length));
for (const [id, name] of PATHWAYS) {
  const title = titles.find((item) => item.id === id);
  check(`图上出现「${name}」标题`, Boolean(title) && title.text.includes(name), title?.text ?? "missing");
}
check(
  "图上出现「Cori 循环」连接带标题",
  titles.some((t) => t.id === "cori" && t.text.toLowerCase().includes("cori 循环")),
  titles.find((t) => t.id === "cori")?.text ?? "missing",
);
// 第 11 条（氨基酸代谢，y=650）与第 12 条（胆固醇合成，y=698）按用户口径允许落到首屏之外；
// 其余十条仍必须在 1440×900 内。
const offscreen = titles.filter((t) => t.y < 0 || t.bottom > 900 || t.x < 0 || t.right > 1440);
check(
  "1440×900 展开档：仅氨基酸代谢与胆固醇合成出屏（用户已接受往下拉）",
  offscreen.length === 2 && ["amino-acids", "cholesterol"].every((id) => offscreen.some((t) => t.id === id)),
  JSON.stringify(offscreen.map((t) => [t.id, t.x, t.y, t.right, t.bottom]))
);
const mapBox = await page.locator('svg[data-home-map="1"]').boundingBox();
const lowestNonAmino = Math.max(
  ...titles.filter((t) => t.id !== "amino-acids" && t.id !== "cholesterol").map((t) => t.bottom),
);
check(
  "除氨基酸代谢 / 胆固醇合成外，十条标题最低底边 ≤ 900（不压既有标题坐标）",
  Boolean(mapBox) && lowestNonAmino <= 900,
  JSON.stringify({
    mapTop: mapBox?.y,
    mapHeight: mapBox?.height,
    lowestNonAmino,
    aminoBottom: titles.find((t) => t.id === "amino-acids")?.bottom,
    cholesterolBottom: titles.find((t) => t.id === "cholesterol")?.bottom,
  })
);

// ===== 3) 右栏二十二条去向 =====
const destLinks = await page.locator("[data-home-link]").evaluateAll((els) =>
  els.map((el) => el.getAttribute("href"))
);
check("右栏二十二条去向链接", destLinks.length === 22, String(destLinks.length));
check(
  "二十二条去向覆盖十一挂图 + 十一结构对照",
  PATHWAYS.every(
    ([id]) => destLinks.includes(posterRoute(id)) && destLinks.includes(structureRoute(id)),
  ),
  JSON.stringify(destLinks)
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
check("图上节点总数 40", nodeIds.length === 40, String(nodeIds.length));
check("同一实体 id 不重复出现", new Set(nodeIds).size === nodeIds.length, `${nodeIds.length} → ${new Set(nodeIds).size}`);
const junctions = nodeInfo.filter((node) => node.junction === "1");
check("共用节点 18 个", junctions.length === 18, String(junctions.length));
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
check(
  "乙酰-CoA 只画一次（TCA + β-氧化 + FAS）",
  accoa.length === 1 && accoa[0].pathways.length === 3,
  JSON.stringify(accoa),
);
check(
  "柠檬酸只画一次且为 TCA / FAS 共用",
  nodeInfo.filter((node) => node.id === "cit").length === 1 &&
    nodeInfo.find((node) => node.id === "cit")?.pathways.length === 2,
  JSON.stringify(nodeInfo.filter((node) => node.id === "cit")),
);
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
const fum = nodeInfo.filter((node) => node.id === "fum");
check(
  "延胡索酸只画一次且连接 TCA / 尿素循环",
  fum.length === 1 && fum[0].junction === "1" && fum[0].pathways.includes("tca") && fum[0].pathways.includes("urea-cycle"),
  JSON.stringify(fum),
);
const ureaNodes = nodeInfo.filter((node) => ["asp", "argininosuccinate"].includes(node.id));
check(
  "尿素循环新增 asp / argininosuccinate 两个节点",
  ureaNodes.length === 2 && ureaNodes.every((node) => node.pathways.length === 1 && node.pathways[0] === "urea-cycle"),
  JSON.stringify(ureaNodes),
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
check("图上连线数量 66", edgeInfo.length === 66, String(edgeInfo.length));
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
// 糖原 / 氨基酸 / 胆固醇只登记标题块与导航，没有可连的跨通路边；
// FAS 通过 fas-shuttle、尿素循环通过 urea-3 / urea-4 / recycle 接入，加入来源核对。
for (const [id] of PATHWAYS.filter(
  ([pid]) => pid !== "glycogen" && pid !== "amino-acids" && pid !== "cholesterol",
))
  check(`连线来源含 ${id} 步骤`, edgeSourcesText.includes(`${id}:`));
check(
  "FAS 柠檬酸穿梭接口线（cit → accoa，来源 fas-shuttle）",
  edgeInfo.some(
    (edge) => edge.id === "fatty-acid-synthesis:cit->accoa" && edge.sources.includes("fatty-acid-synthesis:fas-shuttle"),
  ),
  JSON.stringify(edgeInfo.filter((edge) => edge.pathway === "fatty-acid-synthesis")),
);
check(
  "尿素循环三条接口线存在（urea-3 / urea-4 / recycle）",
  ["urea-cycle:asp->argininosuccinate", "urea-cycle:argininosuccinate->fum", "urea-cycle:fum->asp"].every((id) =>
    edgeInfo.some((edge) => edge.id === id),
  ),
  JSON.stringify(edgeInfo.filter((edge) => edge.pathway === "urea-cycle")),
);
check(
  "尿素接口线来源可反查（urea-3 / urea-4 / urea-cycle:recycle）",
  ["urea-cycle:asp->argininosuccinate", "urea-cycle:argininosuccinate->fum"].every((id) => {
    const edge = edgeInfo.find((item) => item.id === id);
    return Boolean(edge) && ["urea-cycle:urea-3", "urea-cycle:urea-4"].some((source) => edge.sources.includes(source));
  }),
  JSON.stringify(edgeInfo.filter((edge) => edge.pathway === "urea-cycle").map((edge) => edge.sources)),
);
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
check(
  "点共用节点不跳转",
  new URL(page.url()).pathname === "/",
  page.url(),
);
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

// 点延胡索酸：右栏必须列出 TCA + 尿素循环（PLATE 09 的天冬氨酸—延胡索酸臂）
await page.locator('svg [data-node-id="fum"] circle').first().click({ force: true });
await page.waitForTimeout(250);
const fumPanel = await page.locator('[data-testid="junction-panel"]').innerText();
check(
  "延胡索酸共用节点列出 TCA 与尿素循环",
  fumPanel.includes("三羧酸循环") && fumPanel.includes("尿素循环"),
  fumPanel.replace(/\s+/g, " ").slice(0, 160),
);
const fumLinks = await page.locator('[data-testid="junction-panel"] a').evaluateAll((els) =>
  els.map((el) => el.getAttribute("href")),
);
check(
  "尿素循环共用节点提供步骤级链接（urea-4）",
  fumLinks.some((href) => href?.includes("/pathway/urea-cycle?step=urea-4")),
  JSON.stringify(fumLinks),
);

// ===== 8) 点普通节点进入挂图 =====
await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
await page.locator('svg [data-node-id="6pg"] circle').first().click({ force: true });
await page.waitForURL("**/pathway/ppp", { timeout: 5000 }).catch(() => {});
check("点普通节点进入对应挂图", page.url().includes("/pathway/ppp"), page.url());

// 尿素循环独有节点：点 asp 进入 PLATE 09
await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
await page.locator('svg [data-node-id="asp"] circle').first().click({ force: true });
await page.waitForURL("**/pathway/urea-cycle", { timeout: 5000 }).catch(() => {});
check("点尿素循环节点 asp 进入 PLATE 09", page.url().includes("/pathway/urea-cycle"), page.url());

// ===== 9) 点步骤连线带 ?step= =====
await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
// 双向走廊两条线相距约 14 px，不能用 <g> 包围盒中心（会被另一侧的线截获）；
// 取该条线自身包围盒中心，命中哪条线由像素决定，正是用户真实点击行为。
const glycoLine = await page.locator('[data-edge-id="glycolysis:g6p->f6p"] line').boundingBox();
await page.mouse.click(glycoLine.x + glycoLine.width / 2, glycoLine.y + glycoLine.height / 2);
await page.waitForURL("**/pathway/glycolysis?step=gk-2", { timeout: 5000 }).catch(() => {});
check("点步骤连线带 ?step=", page.url().includes("/pathway/glycolysis?step=gk-2"), page.url());

// 尿素循环接口线：ASL 裂解精氨酸琥珀酸、延胡索酸回到 TCA（urea-4）
// 这条线在下域基质带，1440×900 首屏之外；先把页面滚到线所在位置，再取线自身包围盒中心点击。
await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
const ureaEdgeLocator = page.locator('[data-edge-id="urea-cycle:argininosuccinate->fum"] line');
await ureaEdgeLocator.scrollIntoViewIfNeeded();
const ureaLine = await ureaEdgeLocator.boundingBox();
await page.mouse.click(ureaLine.x + ureaLine.width / 2, ureaLine.y + ureaLine.height / 2);
await page.waitForURL("**/pathway/urea-cycle?step=urea-4", { timeout: 5000 }).catch(() => {});
check("点尿素接口线带 ?step=urea-4", page.url().includes("/pathway/urea-cycle?step=urea-4"), page.url());

// ===== 10) 区室与域标签 =====
// 后续第 11 节按「1440 展开」测容器横向政策，这里起就固定在展开档（默认档已改为收起）。
await page.goto(`${BASE}/?fold=open`, { waitUntil: "networkidle" });
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
check(
  "点击域标签不跳页",
  new URL(page.url()).pathname === "/",
  page.url(),
);
await page.locator('[data-domain-nav="matrix"]').click();
await page.waitForTimeout(150);
check("再点同一域恢复全图", (await page.locator('[data-testid="home-domain-count"]').innerText()).includes("全图"));
await page.locator('[data-domain-nav="cytosol"]').focus();
check(
  "域标签可键盘聚焦",
  (await page.evaluate(() => document.activeElement?.getAttribute("data-domain-nav"))) === "cytosol",
);

// ===== 11) 图版横向政策 =====
// 政策（2026-11-05 起）：「页面级」不得出现横向滚动条；图版容器在「展开」态可横向拖动。
// 阈值按档位固定：1440 展开 = 0 溢出，1280 展开 ≤ 200px（实测 160px），收起（1020 居中）= 0。
const plateMetrics = () =>
  page.locator('[data-testid="home-plate-scroll"]').evaluate((el) => ({
    client: el.clientWidth,
    scroll: el.scrollWidth,
    left: el.scrollLeft,
  }));
const docMetrics = () =>
  page.evaluate(() => ({
    client: document.documentElement.clientWidth,
    scroll: document.documentElement.scrollWidth,
    scrollX: window.scrollX,
  }));
async function setAsideOpen(open) {
  const btn = page.locator('[data-aside-toggle="1"]');
  const expanded = (await btn.getAttribute("aria-expanded")) === "true";
  if (expanded !== open) {
    await btn.click();
    await page.waitForTimeout(250);
  }
}
async function assertFold(label, maxOverflow) {
  const doc = await docMetrics();
  check(`${label} · 页面级横向溢出为 0`, doc.scroll - doc.client === 0, JSON.stringify(doc));
  const plate = await plateMetrics();
  const delta = plate.scroll - plate.client;
  check(`${label} · 图版容器溢出 ${delta}px ≤ ${maxOverflow}px`, delta <= maxOverflow, JSON.stringify(plate));
  return delta;
}

await assertFold("1440 展开", 0);
check(
  "右栏不与图版重叠（双栏栅格仍在）",
  (await page.locator(".home-aside").boundingBox()).x > (await page.locator(".plate-wrap").boundingBox()).x,
);

await setAsideOpen(false);
await assertFold("1440 收起", 0);
await setAsideOpen(true);

// ===== 12) 致敬栏 =====
const tribute = await page.locator(".home-tribute").innerText();
check("致敬栏存在", tribute.length > 0);
check("致敬写 Nicholson 与 1960", tribute.includes("Nicholson") && tribute.includes("1960"));
check("致敬写 KEGG 与 1995 / Kanehisa", tribute.includes("KEGG") && tribute.includes("1995") && tribute.includes("Kanehisa"));
check("明确是体例致敬而非内容引用", tribute.includes("体例致敬") && tribute.includes("不取自"));

// ===== 13) 十八条去向页都有首页入口 =====
for (const [id] of PATHWAYS) {
  for (const route of [`/pathway/${id}`, `/structures/${id}`]) {
    await page.goto(`${BASE}${route}`, { waitUntil: "domcontentloaded" });
    await page.waitForSelector('a[href="/"]', { timeout: 8000 }).catch(() => {});
    const homeLinks = await page.locator('a[href="/"]').count();
    check(`${route} 有首页入口`, homeLinks >= 1, String(homeLinks));
  }
}

// ===== 14) 截图：1440 展开首屏 / 共用节点状态 / 1280 可用性 =====
// 本节的「十条标题全见」「容器可拖动量」判定口径都是展开档，统一用 ?fold=open 还原。
await page.setViewportSize({ width: 1440, height: 900 });
await page.goto(`${BASE}/?fold=open`, { waitUntil: "networkidle" });
await page.waitForTimeout(500);
await page.screenshot({ path: join(ROOT, "preview", "home-overview.png") });
console.log("✓ 截图 preview/home-overview.png（1440×900 展开档首屏 · 十条通路一次全览）");
await page.screenshot({ path: join(ROOT, "preview", "home-full.png"), fullPage: true });
console.log("✓ 截图 preview/home-full.png（1440 宽整页）");

await page.goto(`${BASE}/?fold=open`, { waitUntil: "networkidle" });
await page.locator('svg [data-node-id="accoa"] circle').first().click({ force: true });
await page.waitForTimeout(400);
await page.screenshot({ path: join(ROOT, "preview", "home-junction.png") });
console.log("✓ 截图 preview/home-junction.png（1440×900 · 点乙酰-CoA 共用节点）");

// 1280 窄屏：展开态允许容器横向拖动（≤200px），页面级仍必须零溢出；收起态回到 0。
await page.setViewportSize({ width: 1280, height: 900 });
await page.goto(`${BASE}/?fold=open`, { waitUntil: "networkidle" });
await page.waitForTimeout(400);
const titles1280 = await firstScreenTitles();
const visible1280 = titles1280.filter((t) => t.y >= 0 && t.bottom <= 900 && t.x >= 0 && t.right <= 1280);
check(
  "1280 下除氨基酸代谢 / 胆固醇合成外十条通路标题仍全部可见（两条允许出屏）",
  titles1280.length === 12 &&
    visible1280.length === 10 &&
    titles1280
      .filter((t) => !visible1280.includes(t))
      .every((t) => t.id === "amino-acids" || t.id === "cholesterol"),
  JSON.stringify(titles1280.map((t) => [t.id, t.x, t.y, t.right, t.bottom]))
);

const delta1280Open = await assertFold("1280 展开", 200);
check("1280 展开 · 容器确实存在可拖动量（溢出 > 0）", delta1280Open > 0, `${delta1280Open}px`);

// 拖动只作用于图版容器：scrollLeft 增大，页面 scrollX 与 location.href 都不变。
const beforeDrag = await page.evaluate(() => ({
  url: location.href,
  scrollX: window.scrollX,
  left: document.querySelector('[data-testid="home-plate-scroll"]').scrollLeft,
}));
const plateBox = await page.locator('[data-testid="home-plate-scroll"]').boundingBox();
await page.mouse.move(plateBox.x + plateBox.width - 60, plateBox.y + 60);
await page.mouse.down();
await page.mouse.move(plateBox.x + 60, plateBox.y + 60, { steps: 12 });
await page.mouse.up();
await page.waitForTimeout(200);
const afterDrag = await page.evaluate(() => ({
  url: location.href,
  scrollX: window.scrollX,
  left: document.querySelector('[data-testid="home-plate-scroll"]').scrollLeft,
}));
const dragDoc = await docMetrics();
check("拖动后 location.href / 路由不变", afterDrag.url === beforeDrag.url, `${beforeDrag.url} → ${afterDrag.url}`);
check(
  "拖动只作用于图版容器（scrollLeft 增大、页面 scrollX 仍为 0）",
  afterDrag.left > beforeDrag.left && dragDoc.scrollX === 0,
  JSON.stringify({ beforeDrag, afterDrag, dragDoc }),
);

await setAsideOpen(false);
await assertFold("1280 收起", 0);
await page.screenshot({ path: join(ROOT, "preview", "home-1280.png") });
console.log("✓ 截图 preview/home-1280.png（1280×900 · 收起态）");

// ===== 15) 默认档 + 三档还原 × 四视口：版面 / 字号 / 首屏条数 / 按钮态 =====
// 默认（无参数）= 收起 + 等比铺满（1400px 上限）；?fold=center = 收起 + 1020 居中；
// ?fold=open = 展开。四视口逐档实测，默认档首屏完整可见 8/10（尿素 / 糖原落到首屏下方）。
const FOLD_MODES = [
  { id: "default", url: "/", fold: "fitwidth", aside: false, btn: "展开辅助栏", aria: "false" },
  { id: "center", url: "/?fold=center", fold: "center", aside: false, btn: "展开辅助栏", aria: "false" },
  { id: "open", url: "/?fold=open", fold: "open", aside: true, btn: "收起辅助栏", aria: "true" },
];
const MATRIX_VPS = [1440, 1280, 1920, 2560];
const matrixRows = [];

for (const vp of MATRIX_VPS) {
  for (const mode of FOLD_MODES) {
    await page.setViewportSize({ width: vp, height: 900 });
    await page.goto(`${BASE}${mode.url}`, { waitUntil: "networkidle" });
    await page.waitForTimeout(350);
    const row = await page.evaluate(() => {
      const grid = document.querySelector(".home-poster .body-grid");
      const scroll = document.querySelector('[data-testid="home-plate-scroll"]');
      const canvas = document.querySelector(".home-poster .plate-canvas");
      const aside = document.querySelector("#home-aside");
      const btn = document.querySelector('[data-aside-toggle="1"]');
      const sc = scroll.getBoundingClientRect();
      const css = getComputedStyle(scroll);
      const contentLeft = sc.left + parseFloat(css.borderLeftWidth) + parseFloat(css.paddingLeft);
      const contentRight = sc.right - parseFloat(css.borderRightWidth) - parseFloat(css.paddingRight);
      const cr = canvas.getBoundingClientRect();
      const scale = cr.width / 1020;
      const glyph = document.querySelector('[data-pathway-title="glycolysis"]');
      const noteEl = glyph?.closest("a")?.nextElementSibling ?? null;
      const titles = [...document.querySelectorAll("[data-pathway-title]")].map((el) => {
        const r = el.getBoundingClientRect();
        return {
          id: el.getAttribute("data-pathway-title"),
          x: r.x,
          y: r.y,
          right: r.right,
          bottom: r.bottom,
        };
      });
      const notVisible = titles
        .filter((t) => t.x < 0 || t.y < 0 || t.right > innerWidth || t.bottom > innerHeight)
        .map((t) => t.id);
      return {
        fold: grid?.getAttribute("data-fold-mode"),
        asideVisible: aside ? !aside.hasAttribute("hidden") && aside.getBoundingClientRect().height > 0 : false,
        btnText: (btn?.textContent ?? "").trim(),
        aria: btn?.getAttribute("aria-expanded"),
        docDelta: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        containerDelta: scroll.scrollWidth - scroll.clientWidth,
        contentWidth: Math.round((contentRight - contentLeft) * 10) / 10,
        canvasWidth: Math.round(cr.width * 10) / 10,
        leftGap: Math.round((cr.left - contentLeft) * 10) / 10,
        rightGap: Math.round((contentRight - cr.right) * 10) / 10,
        titlePx: glyph ? Math.round(parseFloat(getComputedStyle(glyph).fontSize) * scale * 100) / 100 : null,
        notePx: noteEl ? Math.round(parseFloat(getComputedStyle(noteEl).fontSize) * scale * 100) / 100 : null,
        visibleCount: titles.length - notVisible.length,
        notVisible,
      };
    });
    const label = `${vp} · ${mode.id}`;
    check(`${label} · data-fold-mode=${mode.fold}`, row.fold === mode.fold, String(row.fold));
    check(`${label} · document 横向差精确 0`, row.docDelta === 0, `${row.docDelta}px`);
    if (mode.id === "open" && vp === 1280) {
      check(
        `${label} · 容器横向差 ${row.containerDelta}px（>0 且 ≤200，可拖动）`,
        row.containerDelta > 0 && row.containerDelta <= 200,
        `${row.containerDelta}px`,
      );
    } else {
      check(`${label} · 容器横向差 0`, row.containerDelta === 0, `${row.containerDelta}px`);
    }
    const expectedCanvas =
      mode.id === "open"
        ? Math.min(Math.max(955, row.contentWidth), 1020)
        : Math.min(row.contentWidth, mode.id === "center" ? 1020 : 1400);
    check(
      `${label} · 画布渲染宽 ${row.canvasWidth}px（期望 ${Math.round(expectedCanvas * 10) / 10}）`,
      Math.abs(row.canvasWidth - expectedCanvas) <= 1,
      `${row.canvasWidth} vs ${expectedCanvas}`,
    );
    const scale = row.canvasWidth / 1020;
    check(
      `${label} · 标题屏幕字号 ${row.titlePx}px`,
      Math.abs(row.titlePx - 12 * scale) <= 0.2,
      `期望 ${(12 * scale).toFixed(2)}px`,
    );
    check(
      `${label} · 注记屏幕字号 ${row.notePx}px`,
      Math.abs(row.notePx - 9.2 * scale) <= 0.2,
      `期望 ${(9.2 * scale).toFixed(2)}px`,
    );
    check(`${label} · 按钮文案「${mode.btn}」`, row.btnText === mode.btn, row.btnText);
    check(`${label} · aria-expanded=${mode.aria}`, row.aria === mode.aria, String(row.aria));
    check(`${label} · 右栏${mode.aside ? "可见" : "隐藏"}`, row.asideVisible === mode.aside, String(row.asideVisible));

    // 展开档 1440 / 1280 画布 955（纵向压缩），10/12（氨基酸 / 胆固醇出屏）；
    // 1920 / 2560 画布 1020，糖原 / 氨基酸 / 胆固醇一起落到首屏下方。
    const expectedVisible =
      mode.id === "default" ? 8 : mode.id === "center" ? 9 : vp === 1920 || vp === 2560 ? 9 : 10;
    const expectedHidden =
      mode.id === "default"
        ? "urea-cycle,glycogen,amino-acids,cholesterol"
        : mode.id === "center"
          ? "glycogen,amino-acids,cholesterol"
          : vp === 1920 || vp === 2560
            ? "glycogen,amino-acids,cholesterol"
            : "amino-acids,cholesterol";
    check(
      `${label} · 首屏完整可见 ${row.visibleCount}/12（预期 ${expectedVisible}）`,
      row.visibleCount === expectedVisible,
      `未完整可见：${row.notVisible.join(",") || "无"}`,
    );
    check(
      `${label} · 首屏未完整可见 = ${expectedHidden || "无"}`,
      row.notVisible.join(",") === expectedHidden,
      row.notVisible.join(",") || "无",
    );
    if (mode.id === "default" && vp >= 1920) {
      check(`${label} · 1400 上限生效（画布 1400）`, Math.abs(row.canvasWidth - 1400) <= 1, `${row.canvasWidth}px`);
      check(
        `${label} · 超宽屏左右留白对称（${row.leftGap} / ${row.rightGap}）`,
        Math.abs(row.leftGap - row.rightGap) <= 1 && row.leftGap > 0,
        `${row.leftGap}/${row.rightGap}`,
      );
    }
    matrixRows.push({ vp, mode: mode.id, ...row });
  }
}

console.log("\n四视口 × 三档实测（默认 = 收起 + 等比铺满；center = 收起 + 1020；open = 展开）");
console.log("| 视口 | 档 | document Δ | 容器 Δ | 画布宽 | 标题 px | 注记 px | 首屏完整可见 | 未完整可见 |");
console.log("| --- | --- | --- | --- | --- | --- | --- | --- | --- |");
for (const r of matrixRows) {
  console.log(
    `| ${r.vp} | ${r.mode} | ${r.docDelta} | ${r.containerDelta} | ${r.canvasWidth} | ${r.titlePx} | ${r.notePx} | ${r.visibleCount}/12 | ${r.notVisible.join(", ") || "无"} |`,
  );
}

// ===== 16) 折叠按钮两态 + 键盘 + 无缩放控件 =====
await page.setViewportSize({ width: 1440, height: 900 });
await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
const toggle = page.locator('[data-aside-toggle="1"]');
const toggleState = async () => ({
  text: (await toggle.innerText()).trim(),
  aria: await toggle.getAttribute("aria-expanded"),
  asideVisible: !(await page.locator("#home-aside").isHidden()),
});
check(
  "默认态按钮位于页眉工具区且可见",
  (await toggle.isVisible()) && (await toggle.evaluate((el) => Boolean(el.closest(".plate-head"))))
);
check(
  "默认态按钮两态文案 =「展开辅助栏」",
  (await toggleState()).text === "展开辅助栏",
);
await toggle.click();
await page.waitForTimeout(200);
{
  const st = await toggleState();
  check("点按钮展开 · 文案「收起辅助栏」/ aria=true / 右栏可见", st.text === "收起辅助栏" && st.aria === "true" && st.asideVisible, JSON.stringify(st));
}
await toggle.click();
await page.waitForTimeout(200);
{
  const st = await toggleState();
  check("再点收起 · 文案「展开辅助栏」/ aria=false / 右栏隐藏", st.text === "展开辅助栏" && st.aria === "false" && st.asideVisible === false, JSON.stringify(st));
  check(
    "收起后按钮仍在页眉原位可见",
    (await toggle.isVisible()) && (await toggle.evaluate((el) => Boolean(el.closest(".plate-head"))))
  );
}
await toggle.focus();
check(
  "折叠按钮可键盘聚焦",
  (await page.evaluate(() => document.activeElement?.getAttribute("data-aside-toggle"))) === "1",
);
await page.keyboard.press("Space");
await page.waitForTimeout(150);
check("Space 展开", (await toggleState()).aria === "true");
await page.keyboard.press("Space");
await page.waitForTimeout(150);
check("Space 收起", (await toggleState()).aria === "false");
await page.keyboard.press("Enter");
await page.waitForTimeout(150);
check("Enter 展开", (await toggleState()).aria === "true");
await page.keyboard.press("Enter");
await page.waitForTimeout(150);
check("Enter 收起", (await toggleState()).aria === "false");

// 无缩放控件：只认真正的缩放交互件，浏览器默认缩放不算
const zoomCount = await page.locator("button, input, [role=slider], [class*=zoom]").evaluateAll(
  (els) =>
    els.filter((el) => {
      const t = (el.textContent ?? "").trim();
      return /zoom|缩放|放大|缩小/.test(t) || /zoom/i.test(String(el.className));
    }).length,
);
check("首页无缩放控件", zoomCount === 0, String(zoomCount));

// 默认态截图：1440 / 1280，另加 1920 验证 1400 上限留白
for (const vp of [1440, 1280, 1920]) {
  await page.setViewportSize({ width: vp, height: 900 });
  await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
  await page.waitForTimeout(400);
  await page.screenshot({ path: join(ROOT, "preview", `home-default-${vp}.png`) });
  console.log(`✓ 截图 preview/home-default-${vp}.png（默认收起 + 等比铺满）`);
}

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
