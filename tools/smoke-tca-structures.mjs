// ============================================================
// TCA 结构对照页冒烟（/structures/tca）
//
// 覆盖本轮新增（任务二）：
//   · 9 块齐全：接驳步 tca-pdh + 环内 tca-1…tca-8，顺序固定；
//   · 每块左侧只有一行灰字声明（enzymePanel=false，文案来自配置，组件不写死）；
//   · 九个有机酸全部升级为 RCSB 实验配体坐标：来源标签必须出现 PDB ID / 分辨率 /
//     方法 / 物种 / 链 / 配体 resname；接驳步底物丙酮酸不在九分子清单内，
//     保留计算构象并明确标「自由态，不等于结合态」（页面 18 实验 + 1 计算）。
//   · 默认模式改为逐块数据规则：tca-2（体积 +0.07% + 羟基换位）默认 2D，其余 8 块默认 3D；
//     ?mode=2d|3d 显式覆盖默认值，URL 还原不被规则覆盖；
//   · 2D 可读（字号 ≥9px）、变化标注全部命中真实原子、无空块、无缺资产占位；
//   · 未知 pathwayId 给「该通路结构对照尚未接入」页，不 404、不空白。
//   · 本轮（来源可见优先、能换就换）：四个换源分子（cit 8ZVV / icit 5H3E / succoa 8P5V /
//     fum 9BPW）用新 PDB；九个分子在块内首屏各有「配体来源」一句（18 条，按块去重），
//     不折叠即可见；被保留的琥珀酸写明本步 SDH 未获、取自 SUCL。
//
// 本轮旧断言替换（逐条说明）：
//   · 「默认 3D、19 个 mol-3d、0 个 mol-2d」【因功能替换改写】：默认改为逐块规则，
//     默认是 17 个 mol-3d + 2 个 mol-2d；显式 ?mode=3d 仍强制整页 19 个 3D（保留原覆盖）。
//   · 「TCA 没有实验坐标标签 / 计算构象 ETKDGv3」【因任务一替换】：
//     九个分子全部拿到实验配体，改为断言 18 个来源标签为 experimental、1 个 computed，
//     并逐个核对 PDB / 分辨率 / 方法 / 物种 / 链 / resname。
//   · 「tca-2 判据 ΔV −0.60%」【因换源替换】：柠檬酸从 ACLY 3MWD 换到 CS 8ZVV 后体积
//     150.0→150.1 Å³，判据数字变为 +0.07%；规则（|ΔV|≤2.5% + 拓扑改变）不变。
//   · 「tca-2 判据 +0.07%」【因电离态统一改写】：柠檬酸/异柠檬酸按羧酸根补氢后体积
//     150.0→143.0 / 150.1→143.4 Å³，ΔV 变为 +0.28%（仍 ≤2.5%，默认 2D 不变）。
//   · 「页脚含 5TRL/非 TCA 酶/分辨率偏高」【因换源替换】：改为断言页脚列出 K256Q、非人源、
//     OGDH 而非 SUCL、相邻的 SUCL、ME2 变构位点等新的不理想点；旧词已不成立，不保留。
//   · 键盘 Tab 从「返回 → 3D → 2D」变为「返回 → 按规则 → 3D → 2D」（新增按规则按钮）。
//
// 需先 `npm run build`，并保证 preview 服务在 BASE_URL（默认 http://localhost:4173）运行。
import { mkdirSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright-core";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const BASE = process.env.BASE_URL ?? "http://localhost:4173";
const ROUTE = `${BASE}/structures/tca`;
let failed = false;
const check = (label, ok) => {
  console.log(`${ok ? "✓" : "✗"} ${label}`);
  if (!ok) failed = true;
};

// 期望值直接读配置源与资产报告，避免断言与页面漂移
const cfgSrc = readFileSync(join(ROOT, "src", "data", "comparisonConfig.ts"), "utf8");
const tcaPart = cfgSrc.slice(cfgSrc.indexOf("const TCA_COMPARISON"), cfgSrc.indexOf("const GLYCOLYSIS_CONFIG"));
const STEP_IDS = [...tcaPart.matchAll(/stepId: "(tca-[a-z0-9-]+)"/g)].map((m) => m[1]);
const assetReport = JSON.parse(readFileSync(join(ROOT, "preview", "tca-molecule-assets-report.json"), "utf8"));
const MOLS = assetReport.molecules;
// 分子卡片数：pdh 2 + tca-1 3 + 其余 7 步各 2 = 19
const MOL_COUNT = 19;

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
mkdirSync(join(ROOT, "preview"), { recursive: true });

const settle = async (mode = "auto") => {
  await page.waitForFunction((n) => document.querySelectorAll(".cmp-block").length === n, STEP_IDS.length, {
    timeout: 30000,
  });
  if (mode !== "3d") {
    await page.waitForFunction(() => document.querySelectorAll('[data-testid="mol-2d"] .cmp-load').length === 0, {
      timeout: 30000,
    });
  }
  if (mode !== "2d") {
    await page.waitForFunction(
      () => document.querySelectorAll('[data-testid="mol-3d"][data-mol-id="loading"]').length === 0,
      { timeout: 30000 }
    );
  }
};

// ===== 1) 页面形态：9 块、顺序、酶面板声明 =====
await page.goto(ROUTE, { waitUntil: "domcontentloaded" });
await settle("auto");
check("页面标题为「TCA 循环 · 结构对照」", (await page.locator("h1").innerText()).includes("结构对照"));
check(`九块逐一成块（${STEP_IDS.length} 块）`, (await page.locator(".cmp-block").count()) === STEP_IDS.length);
check(
  "步骤顺序 tca-pdh、tca-1…tca-8",
  JSON.stringify(await page.locator(".cmp-block").evaluateAll((els) => els.map((e) => e.getAttribute("data-step-id")))) ===
    JSON.stringify(STEP_IDS)
);
check("接驳步标为「接驳步」而不是第 0 步", (await page.locator("#tca-pdh .cmp-no").innerText()).trim() === "接驳步");
// TCA 没有酶 3D 资产：一个酶面板都不许出现（不伪造）
check("TCA 没有任何酶 3D 面板", (await page.locator('[data-testid="enzyme-3d"]').count()) === 0);
check("九块左侧都有灰字声明", (await page.locator('[data-testid="enzyme-panel-off"]').count()) === STEP_IDS.length);
check(
  "灰字声明文案来自配置（本步酶结构资产未建立 · 待核验后接入）",
  (await page.locator('#tca-1 [data-testid="enzyme-panel-off"]').innerText()).trim() ===
    "本步酶结构资产未建立 · 待核验后接入"
);
check("每块都有「这一步改了什么」", (await page.locator('[data-testid="change-line"]').count()) === STEP_IDS.length);
check("每块都有一句生理意义", (await page.locator(".cmp-phys").count()) === STEP_IDS.length);

// ===== 2) 默认按规则：17 个 3D + 2 个 2D；九个分子全为实验坐标 =====
check("默认按规则：URL 不带 mode", !page.url().includes("mode="));
check("默认按规则时页头 data-mode=auto", (await page.locator('[data-page="comparison"]').getAttribute("data-mode")) === "auto");
check(
  "默认按规则：17 个分子 3D、2 个 2D（tca-2 整块默认 2D）",
  (await page.locator('[data-testid="mol-3d"]').count()) === 17 &&
    (await page.locator('[data-testid="mol-2d"]').count()) === 2
);
check(
  "配置里只有 tca-2 一块默认 2D，且页面上整块生效",
  (await page.locator('.cmp-block[data-default-mode="2d"]').count()) === 1 &&
    (await page.locator('#tca-2[data-mode="2d"]').count()) === 1
);
check(
  "tca-2 默认 2D 写明数据判据（ΔV +0.28%、羟基 C3→C2）",
  (await page.locator("#tca-2 [data-testid='default-mode-rule']").innerText()).includes("0.28%") &&
    (await page.locator("#tca-2 [data-testid='default-mode-rule']").innerText()).includes("C3") &&
    (await page.locator("[data-testid='default-mode-tag']").count()) === 1
);
check("每个分子都有体积与主轴数字", (await page.locator('[data-testid="mol-3d-shape"]').count()) === MOL_COUNT);
check("每块箭头都有体积变化 ΔV", (await page.locator('[data-testid="shape-delta"]').count()) === STEP_IDS.length);
// 任务一：九个有机酸全部换成实验坐标；2D 页脚也显示同一来源行，分类不因模式丢失
check(
  "19 个分子都有来源标签（3D + 2D 页脚合计）",
  (await page.locator('[data-testid="mol-3d-source"]').count()) +
    (await page.locator('[data-testid="mol-2d-source"]').count()) === MOL_COUNT
);
const provCounts = await page.evaluate(() => ({
  exp: document.querySelectorAll(".mol3d-prov.experimental").length,
  calc: document.querySelectorAll(".mol3d-prov.computed").length,
}));
check(`TCA 来源标签：18 个实验坐标 + 1 个计算构象（实际 exp=${provCounts.exp} / calc=${provCounts.calc}）`, provCounts.exp === 18 && provCounts.calc === 1);
check(
  "唯一计算构象是接驳步丙酮酸，且明确标「自由态，不等于结合态」",
  (await page.locator('[data-mol-id="pyr"] .mol3d-prov').first().getAttribute("class")).includes("computed") &&
    (await page.locator('[data-mol-id="pyr"] .mol3d-prov').first().innerText()).includes("自由态，不等于结合态")
);
check("TCA 资产报告 9 项 provenance 全部为 experimental", MOLS.length === 9 && MOLS.every((m) => m.provenance === "experimental"));
// 逐个分子核对 PDB ID / 分辨率 / 方法 / 物种 / 链 / 配体 resname 都出现在页面角标
const provMisses = [];
for (const m of MOLS) {
  const text = await page.locator(`[data-mol-id="${m.id}"] .mol3d-prov`).first().innerText();
  const method = m.method === "ELECTRON MICROSCOPY" ? "cryo-EM" : "X-ray";
  const need = [`PDB ${m.pdb}`, `${m.resolution} Å`, method, m.species, `链 ${m.chain}`, `配体 ${m.resname}`];
  for (const token of need) if (!text.includes(token)) provMisses.push(`${m.id}: 缺「${token}」`);
}
check(`九个分子的来源角标含 PDB/分辨率/方法/物种/链/resname（缺 ${provMisses.length}）`, provMisses.length === 0);
if (provMisses.length) console.log(provMisses.join("\n"));
check(
  "页面文案写明九分子为实验配体坐标、接驳步丙酮酸仍为计算构象",
  (await page.locator(".mast-summary").innerText()).includes("RCSB 实验配体坐标") &&
    (await page.locator(".poster-foot").innerText()).includes("九个有机酸") &&
    (await page.locator(".poster-foot").innerText()).includes("丙酮酸无实验配体坐标")
);

// ===== 2b) 本轮新增：配体来源从角标升级为块内首屏说明 =====
check(
  "每块都有首屏「配体来源」面板（不折叠、不用展开）",
  (await page.locator('[data-testid="ligand-sources"]').count()) === STEP_IDS.length
);
check(
  "18 条分子来源说明直接出现在块内（pyr 无实验坐标，不硬凑）",
  (await page.locator('[data-testid="ligand-source"]').count()) === 18
);
check(
  "来源说明都不在折叠层且实际渲染可见",
  (await page.locator('[data-testid="ligand-source"]').evaluateAll((els) =>
    els.every((e) => !e.closest("details") && e.getBoundingClientRect().height > 0)
  )) === true
);
const srcTexts = await page
  .locator('[data-testid="ligand-source"]')
  .evaluateAll((els) => els.map((e) => ({ id: e.getAttribute("data-mol-id"), text: e.innerText })));
const srcIds = new Set(srcTexts.map((s) => s.id));
check("九个有机酸每个都有来源说明（同一块内按分子去重）", srcIds.size === 9);
const srcMiss = [];
const needSrc = {
  accoa: ["PDB 8ZW1", "2.10", "X-ray", "Homo sapiens", "ACO", "51 重原子"],
  oaa: ["PDB 8ZVW", "1.82", "OAA"],
  cit: ["PDB 8ZVV", "1.59", "CIT", "3MWD"],
  icit: ["PDB 5H3E", "2.21", "Mus musculus", "ICT", "K256Q", "未获"],
  akg: ["PDB 5I95", "1.54", "AKG", "R140Q"],
  succoa: ["PDB 8P5V", "2.07", "cryo-EM", "Corynebacterium glutamicum", "SCA", "OGDH"],
  suc: ["PDB 7MSS", "1.75", "SIN", "未获"],
  fum: ["PDB 9BPW", "2.00", "Staphylococcus aureus", "FUM", "1PJ3"],
  mal: ["PDB 2DFD", "1.90", "LMR"],
};
for (const s of srcTexts) for (const t of needSrc[s.id] ?? []) if (!s.text.includes(t)) srcMiss.push(`${s.id}: 缺「${t}」`);
check(`每条来源说明含 PDB/分辨率/方法/物种/蛋白角色（缺 ${srcMiss.length}）`, srcMiss.length === 0);
if (srcMiss.length) console.log(srcMiss.join("\n"));
check(
  "每条来源说明都写清「取自…蛋白」与 Å 分辨率",
  srcTexts.every((s) => s.text.includes("取自") && s.text.includes("Å"))
);
// 能换就换：四个替换后的分子必须用新 PDB，旧 PDB 不再出现在坐标来源行
const swapMiss = [];
for (const [id, pdb, old] of [
  ["cit", "8ZVV", "3MWD"],
  ["icit", "5H3E", "6PAY"],
  ["succoa", "8P5V", "5TRL"],
  ["fum", "9BPW", "1PJ3"],
]) {
  const texts = await page.locator(`[data-mol-id="${id}"] .mol3d-prov`).allInnerTexts();
  if (!texts.some((t) => t.includes(`PDB ${pdb}`)) || texts.some((t) => t.includes(`PDB ${old}`)))
    swapMiss.push(`${id}: 应 ${pdb}，不应 ${old}`);
}
check(`四个换源分子页面坐标行已换新 PDB、旧 PDB 不冒充（${swapMiss.join("；") || "无"}）`, swapMiss.length === 0);
check(
  "被保留的琥珀酸写明「本步 SDH 口袋内同分子 ≤2.5 Å 未获、取自 SUCL」",
  (await page.locator('[data-testid="ligand-source"][data-mol-id="suc"]').first().innerText()).includes("未获") &&
    (await page.locator('[data-testid="ligand-source"][data-mol-id="suc"]').first().innerText()).includes("SUCL")
);
check(
  "实验坐标不理想的点逐条写在页脚（K256Q / 非人源 / OGDH 而非 SUCL / 相邻 SUCL / ME2 变构位点）",
  (await page.locator(".poster-foot").innerText()).includes("K256Q") &&
    (await page.locator(".poster-foot").innerText()).includes("非人源") &&
    (await page.locator(".poster-foot").innerText()).includes("OGDH 而非 SUCL") &&
    (await page.locator(".poster-foot").innerText()).includes("相邻的 SUCL") &&
    (await page.locator(".poster-foot").innerText()).includes("ME2 变构位点")
);
// 乙酰-CoA / 琥珀酰-CoA 的分块说明必须在块里显形
check(
  "乙酰-CoA 明说分块呈现、不是完整分子",
  (await page.locator('#tca-1 .cmp-caveat').first().innerText()).includes("分块呈现，不是完整分子")
);
check(
  "乙酰-CoA 分块说明写明实验坐标来自 8ZW1、CoA 长链省略",
  (await page.locator('#tca-1 .cmp-caveat').first().innerText()).includes("8ZW1") &&
    (await page.locator('#tca-1 .cmp-caveat').first().innerText()).includes("CoA 长链省略")
);
check(
  "琥珀酰-CoA 明说分块呈现、不是完整分子，并标注本 TCA 酶来源 8P5V（OGDH）",
  (await page.locator('#tca-5 .cmp-caveat').first().innerText()).includes("分块呈现，不是完整分子") &&
    (await page.locator('#tca-5 .cmp-caveat').first().innerText()).includes("8P5V") &&
    (await page.locator('#tca-5 .cmp-caveat').first().innerText()).includes("OGDH")
);

// ===== 3) 切 2D：19 个结构式、版式不重排、标注命中 =====
const rectsBefore = await page.evaluate(() =>
  [...document.querySelectorAll(".cmp3d-side")].map((e) => {
    const r = e.getBoundingClientRect();
    return [Math.round(r.x), Math.round(r.y), Math.round(r.width), Math.round(r.height)];
  })
);
await page.locator('[data-testid="mode-2d"]').click();
await page.waitForFunction((n) => document.querySelectorAll('[data-testid="mol-2d"]').length === n, MOL_COUNT, {
  timeout: 30000,
});
check("点 2D 后 URL 写入 ?mode=2d", page.url().includes("mode=2d"));
check(`切 2D 后 ${MOL_COUNT} 个结构式格子`, (await page.locator('[data-testid="mol-2d"]').count()) === MOL_COUNT);
check("切 2D 后 3D 画布实例下降为 0", (await page.locator('[data-testid="mol-3d"]').count()) === 0);
check(
  "?mode=2d 显式覆盖默认：tca-2 的 data-mode-source 从 data 变 url",
  (await page.locator("#tca-2").getAttribute("data-mode-source")) === "url" &&
    (await page.locator('.cmp-block[data-mode-source="url"]').count()) === STEP_IDS.length
);
check(
  "切 2D 后每块仍有左右两侧（无空块）",
  (await page.locator('.cmp3d-side[data-side="substrate"]').count()) === STEP_IDS.length &&
    (await page.locator('.cmp3d-side[data-side="product"]').count()) === STEP_IDS.length &&
    (await page.locator(".cmp3d-side").evaluateAll((els) => els.every((e) => e.querySelectorAll('[data-testid="mol-2d"]').length > 0))) === true
);
check("切 2D 后每块仍有箭头与体积变化数字", (await page.locator('[data-testid="shape-delta"]').count()) === STEP_IDS.length);
check("2D 模式没有「缺 2D 结构式」", (await page.locator('[data-testid="missing-2d"]').count()) === 0);
check("2D 模式没有「结构式加载中…」残留", (await page.locator(".mol2d-stage .cmp-load").count()) === 0);
check("所有结构式都画出键线（非空占位）", await page.evaluate(() =>
  [...document.querySelectorAll(".mol2d-svg")].every((s) => s.querySelectorAll("line, polygon").length > 0)
));
check("2D 字号可读（所有 SVG 文本 computed font-size ≥ 9px）", await page.evaluate(() => {
  const texts = [...document.querySelectorAll(".mol2d-svg text")];
  return texts.length > 0 && texts.every((t) => parseFloat(getComputedStyle(t).fontSize) >= 9);
}));
check("2D 变化标注全部命中真实原子", await page.evaluate(() => {
  const lis = [...document.querySelectorAll('[data-testid="mol-2d-marks"] li')];
  return lis.length > 0 && lis.every((li) => li.getAttribute("data-mark-found-2d") === "1");
}));

const rectsAfter = await page.evaluate(() =>
  [...document.querySelectorAll(".cmp3d-side")].map((e) => {
    const r = e.getBoundingClientRect();
    return [Math.round(r.x), Math.round(r.y), Math.round(r.width), Math.round(r.height)];
  })
);
check(
  "切换前后底物/产物格子 x/y/w/h 完全不变",
  rectsBefore.length === rectsAfter.length &&
    rectsBefore.every((r, i) => r.every((v, k) => v === rectsAfter[i][k]))
);

// ===== 4) URL 记忆 + 键盘可达 =====
await page.goto(`${ROUTE}?mode=2d`, { waitUntil: "domcontentloaded" });
await settle("2d");
check("?mode=2d 刷新后仍为 2D", (await page.locator('[data-testid="mol-2d"]').count()) === MOL_COUNT);
check("?mode=2d 刷新后页头标记 data-mode=2d", (await page.locator('[data-page="comparison"]').getAttribute("data-mode")) === "2d");
// 2026-11-04 统一导航改造后，film-back 与页头之间多了 8 条通路切换链接，
// 原「8 次 Tab」上限不够；放宽到 24 次，断言本身（mode-2d 可键盘聚焦）不变。
let tabbed = false;
for (let i = 0; i < 24; i += 1) {
  await page.keyboard.press("Tab");
  tabbed = await page.evaluate(() => document.activeElement?.getAttribute("data-testid") === "mode-2d");
  if (tabbed) break;
}
check("2D 开关可被键盘聚焦", tabbed);
await page.locator('[data-testid="mode-3d"]').click();
await page.waitForFunction((n) => document.querySelectorAll('[data-testid="mol-3d"]').length === n, MOL_COUNT, {
  timeout: 30000,
});
check("点 3D 切回后 2D 结构式归零", (await page.locator('[data-testid="mol-2d"]').count()) === 0);
const forced3dProv = await page.evaluate(() => ({
  exp: document.querySelectorAll(".mol3d-prov.experimental").length,
  calc: document.querySelectorAll(".mol3d-prov.computed").length,
}));
check(
  "?mode=3d 优先于默认规则：tca-2 也被强制 3D，10 块来源标记全为 url",
  (await page.locator("#tca-2").getAttribute("data-mode")) === "3d" &&
    (await page.locator("#tca-2").getAttribute("data-mode-source")) === "url" &&
    (await page.locator('.cmp-block[data-mode-source="url"]').count()) === STEP_IDS.length
);
check(
  "显式 3D 时 19 个分子（18 实验 + 1 计算）",
  (await page.locator('[data-testid="mol-3d"]').count()) === MOL_COUNT &&
    forced3dProv.exp === 18 &&
    forced3dProv.calc === 1
);

// ===== 5) 未知 pathwayId：明确说明，不 404、不空白 =====
await page.goto(`${BASE}/structures/not-a-pathway`, { waitUntil: "domcontentloaded" });
check("未知 pathwayId 不空白：显示「尚未接入」页", (await page.locator('[data-testid="comparison-not-wired"]').count()) === 1);
check("未知 pathwayId 页面写明 pathwayId", (await page.locator('[data-testid="comparison-not-wired"]').innerText()).includes("not-a-pathway"));
check("未知 pathwayId 渲染明确的缺失页容器", (await page.locator('[data-page="comparison-missing"]').count()) === 1);

// ===== 6) 截图：TCA 3D / TCA 2D / TCA 按规则默认 2D（tca-2） =====
const shot = async (id, file, mode = "3d") => {
  const query = mode === "auto" ? "" : `?mode=${mode}`;
  await page.goto(`${ROUTE}${query}`, { waitUntil: "domcontentloaded" });
  await settle(mode);
  await page.evaluate((sid) => document.getElementById(sid)?.scrollIntoView({ block: "start" }), id);
  await page.waitForTimeout(900);
  await page.setViewportSize({ width: 1440, height: 1280 });
  const top = await page.evaluate((sid) => {
    const el = document.getElementById(sid);
    return el ? el.getBoundingClientRect().top + window.scrollY : 0;
  }, id);
  await page.evaluate((y) => window.scrollTo(0, Math.max(0, y - 12)), top);
  await page.waitForTimeout(700);
  await page.screenshot({ path: join(ROOT, "preview", file) });
  console.log(`  ↳ 截图 preview/${file}（1440×1280 · ${mode.toUpperCase()}）`);
};
await shot("tca-2", "cmp-tca-3d.png", "3d");
await shot("tca-2", "cmp-tca-2d.png", "2d");
// 不带 ?mode=：tca-2 被数据判据改成默认 2D（体积 +0.07% + 羟基 C3→C2）
await shot("tca-2", "cmp-tca-default-2d.png", "auto");
// 本轮新增：块内首屏「配体来源」说明（tca-1 三条：乙酰-CoA/OAA/柠檬酸）
await shot("tca-1", "cmp-tca-ligsrc.png", "auto");
// 本轮新增：替换前后差异（tca-2 的来源说明写明 3MWD→8ZVV、6PAY→5H3E）
await shot("tca-2", "cmp-tca-source-swap.png", "auto");

check("无页面运行错误", errors.length === 0);
if (errors.length) console.log("页面错误：\n" + errors.join("\n"));

await browser.close();
console.log(`\n${failed ? "冒烟未通过" : "冒烟全部通过"}`);
process.exit(failed ? 1 : 0);
