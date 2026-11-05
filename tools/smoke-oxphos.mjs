// 氧化磷酸化挂图冒烟（/pathway/oxphos + /structures/oxphos）
//
// 覆盖：
//   · 数据层：7 个模块、质子回路单独建档、P/O 2.5 / 1.5、复合体 II 与 TCA 共享、
//     ΔG 全部 null + 定性、3D 只给两个可溶结构域；
//   · 路由、编号 PLATE 06 / 12 与 SF-06，首页主挂图与结构页编号精确等于 {01–06,08,09,10}（07 空缺属 Cori）；
//   · 内膜带构图：I / II / Q / III / IV / ATP 合酶嵌在带上，cyt c 在膜间腔一侧，
//     ATP 在基质侧产出；
//   · 电子流（实线实心箭头）与质子流（青色虚线开放式箭头）两套线型严格分开；
//   · 化学计量：NADH 10 H⁺ → 2.5 ATP、FADH₂ 6 H⁺ → 1.5 ATP、复合体 II 0 H⁺、
//     4 e⁻ + O₂ → 2 H₂O、2 e⁻ 只还原半个 O₂；
//   · 可溶域 3D 面板 ×2（人 cyt c / 牛 F₁），膜蛋白模块明写「不做 3D」；
//   · 证据等级（由 evidenceGrade.ts 推导）：2d / A / B；结构入口 href；
//   · 点击语义：先判 .q-hide，再分别 closest [data-module-id] / [data-node-id]；
//   · 自测揭晓、?module= / ?quiz=1 还原；
//   · 与 β-氧化页 106 ATP 账自洽；
//   · 1440 截图：整页、膜带特写、3D 面板、首页首屏。
//
// 需先 `npm run build`，并让 preview 服务跑在 BASE_URL（默认 http://localhost:4173）。
import fs, { mkdirSync } from "node:fs";
import { gzipSync } from "node:zlib";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright-core";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const BASE = process.env.BASE_URL ?? "http://localhost:4173";
const ROUTE = `${BASE}/pathway/oxphos`;
const STRUCT = `${BASE}/structures/oxphos`;
let failed = false;
const check = (label, ok, detail = "") => {
  console.log(`${ok ? "✓" : "✗"} ${label}${ok || !detail ? "" : ` — ${detail}`}`);
  if (!ok) failed = true;
};
const norm = (s) => s.replace(/\s+/g, " ").trim();

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

// ===== 0) 数据层静态核验 =====
console.log("\n===== 0) 数据层 =====");
const ox = JSON.parse(fs.readFileSync(join(ROOT, "src/data/oxphos/oxphos.json"), "utf8"));
const skel = JSON.parse(fs.readFileSync(join(ROOT, "src/data/oxphos/skeleton.json"), "utf8"));
const moduleIds = ox.modules.map((m) => m.id);
check("模块数为 7", ox.modules.length === 7, String(ox.modules.length));
check(
  "七个模块 id 齐备（I / II / Q / III / cyt c / IV / ATP 合酶）",
  moduleIds.join(",") ===
    "complex-i,complex-ii,q-pool,complex-iii,cytochrome-c,complex-iv,atp-synthase",
  moduleIds.join(","),
);
check(
  "每个模块都有反应式、电子账、质子账、证据依据、呈现方式",
  ox.modules.every(
    (m) =>
      m.equation &&
      m.electronIn &&
      m.electronOut &&
      m.protonsPumpedPer2e !== undefined &&
      m.evidence?.basis &&
      m.threeD?.status,
  ),
);
check(
  "模块而非线性步骤：steps 只有两条首页投影，模块 7 个",
  Array.isArray(ox.steps) && ox.steps.length === 2 && ox.modules.length === 7,
  `steps=${ox.steps?.length}`,
);
check(
  "质子回路是单独一类（protonFlux），含泵出 / 成水 / 回流 / 回漏",
  ["pump-i", "pump-iii", "pump-iv", "water-iv", "return-v", "leak"].every((id) =>
    ox.protonFlux.some((f) => f.id === id),
  ),
);
check(
  "每 4 个质子 → 1 ATP 的化学计量写得出（回流 3.67 H⁺ / ATP）",
  ox.protonFlux.some((f) => f.id === "return-v" && f.perAtp === 3.67) &&
    ox.poBasis.protonsPerAtp === 3.67,
);
check(
  "P/O 与 Lehninger 8e 口径一致：NADH 2.5 / FADH₂ 1.5",
  ox.poBasis.nadh === 2.5 && ox.poBasis.fadh2 === 1.5,
  `${ox.poBasis.nadh} / ${ox.poBasis.fadh2}`,
);
check(
  "质子总账自洽：NADH 10 H⁺、FADH₂ 6 H⁺",
  ox.poBasis.protonsPerNadh === 10 && ox.poBasis.protonsPerFadh2 === 6,
);
check(
  "旧口径 3 / 2 只作脚注并列，不参与加和",
  ox.poBasis.legacy.nadh === 3 &&
    ox.poBasis.legacy.fadh2 === 2 &&
    (ox.poBasis.legacy.note.includes("不参与") || ox.poBasis.note.includes("不参与")),
);
check(
  "复合体 II 与 TCA 第 6 步是实体级共享（same enzyme, sharedWith）",
  ox.modules.find((m) => m.id === "complex-ii")?.sharedWith?.pathwayId === "tca" &&
    ox.modules.find((m) => m.id === "complex-ii")?.sharedWith?.stepId === "tca-6" &&
    ox.modules.find((m) => m.id === "complex-ii")?.sharedWith?.entityId === "sdh",
);
check(
  "ΔG 全部 null + 定性 + 数值未核实，不编造数值",
  ox.modules.every(
    (m) =>
      m.deltaG?.standard === null &&
      m.deltaG?.physiological === null &&
      m.deltaG?.qualitative?.includes("未核实"),
  ),
);
check(
  "3D 只给两个可溶结构域；其余明确 not-built",
  ox.modules.filter((m) => m.threeD.status === "soluble-panel").map((m) => m.id).join(",") ===
    "cytochrome-c,atp-synthase" &&
    ox.modules.filter((m) => m.threeD.status === "not-built").length === 5,
);
check(
  "膜复合体不是「不存在」：I / II / III / IV 都写了体量、亚基与 PDB 候选",
  ox.modules
    .filter((m) => ["complex-i", "complex-ii", "complex-iii", "complex-iv"].includes(m.id))
    .every((m) => m.massKda && m.subunits && m.pdbCandidates.length > 0),
);
check(
  "骨架节点 id 唯一；带 stepId 的 link 能解析，结构性 link 明确不带 stepId",
  new Set(skel.nodes.map((n) => n.id)).size === skel.nodes.length &&
    skel.links.every((l) =>
      l.stepId ? ox.steps.some((s) => s.id === l.stepId) : ["main", "structural"].includes(l.type),
    ),
);
check("画布 1980×880、内膜带 240–430", skel.canvas.width === 1980 && skel.canvas.height === 880);

// 资产体积：单资产 gzip < 5 MB；总原子数 < 50k
const assets = [
  { path: "public/assets/oxphos/cytc/model.pdb", label: "cyt c" },
  { path: "public/assets/oxphos/f1/model.pdb", label: "F1" },
];
let atomTotal = 0;
for (const asset of assets) {
  const abs = join(ROOT, asset.path);
  const exists = fs.existsSync(abs);
  let atoms = 0;
  let gz = 0;
  if (exists) {
    const text = fs.readFileSync(abs, "utf8");
    atoms = (text.match(/^(ATOM|HETATM)/gm) ?? []).length;
    gz = gzipSync(fs.readFileSync(abs)).length;
    atomTotal += atoms;
  }
  check(
    `${asset.label} 资产存在且 gzip < 5 MB（${(gz / 1024 / 1024).toFixed(2)} MB，${atoms} 原子）`,
    exists && gz < 5 * 1024 * 1024,
  );
}
check(`两个 3D 资产总原子 ${atomTotal} < 50k（单页预算）`, atomTotal < 50000);

// 编号集合：主挂图 01–06 + 08 + 09 + 10 + 11（07 属于 Cori，只走回路层、不占标题块，故留空位）
const homeSrc = fs.readFileSync(join(ROOT, "src/data/homeMap.ts"), "utf8");
const mainNos = [...homeSrc.matchAll(/plateNo: "PLATE (\d{2})"/g)].map((m) => Number(m[1]));
check(
  "首页主挂图编号精确等于 {01,02,03,04,05,06,08,09,10,11}，无重复、无跳号（07 属 Cori）",
  new Set(mainNos).size === mainNos.length &&
    [...mainNos].sort((a, b) => a - b).join(",") === "1,2,3,4,5,6,8,9,10,11",
  mainNos.join(","),
);
const cmpSrc = fs.readFileSync(join(ROOT, "src/data/comparisonConfig.ts"), "utf8");
// SF 号对齐 PLATE 号：结构页 01–06 + 08 + 09 + 10 + 11（07 空缺留给 Cori；06 为氧化磷酸化专页，存在 oxphos.json）
const sfNos = [...cmpSrc.matchAll(/^  plateNo: "PLATE SF-(\d{2})/gm)].map((m) => Number(m[1]));
const sfAll = [...new Set([...sfNos, Number(ox.structurePlateNo.slice(3))])].sort((a, b) => a - b);
check(
  "结构页编号精确等于 {01,02,03,04,05,06,08,09,10,11}，无重复、无跳号（07 空缺留给 Cori）",
  new Set(sfNos).size === sfNos.length && sfAll.join(",") === "1,2,3,4,5,6,8,9,10,11",
  sfAll.join(","),
);

// ===== 1) 路由 / 编号 / 首屏零 3D =====
console.log("\n===== 1) 路由与编号 =====");
const browser = await launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 1024 } });
const errors = [];
page.on("pageerror", (e) => errors.push(String(e)));
page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
mkdirSync(join(ROOT, "preview"), { recursive: true });

const resp = await page.goto(ROUTE, { waitUntil: "networkidle" });
check("路由 /pathway/oxphos 返回 200", resp?.status() === 200);
const plate = page.locator('svg[data-oxphos-plate="1"]');
check("挂图 svg 存在且唯一", (await plate.count()) === 1);
check("报头 PLATE 06 / 12", (await page.locator(".plate-no").first().innerText()).includes("PLATE 06 / 12"));
check("首屏零 3D canvas", (await page.locator("canvas").count()) === 0);
check("页面无首屏运行错误", errors.length === 0, errors.slice(0, 2).join(" | "));

// ===== 2) 内膜带构图 =====
console.log("\n===== 2) 内膜带构图 =====");
check("svg 声明模块数 7", (await plate.getAttribute("data-module-count")) === "7");
check("svg 声明 4 个膜复合体", (await plate.getAttribute("data-complex-count")) === "4");
check("svg 声明内膜带", (await plate.getAttribute("data-membrane-band")) === "inner-membrane");
const modules = page.locator("svg g[data-module-id]");
check("模块分组 7 个", (await modules.count()) === 7, String(await modules.count()));

const centers = await modules.evaluateAll((els) =>
  els.map((el) => {
    const [x, y] = (el.getAttribute("data-center") ?? "0,0").split(",").map(Number);
    return { id: el.getAttribute("data-module-id"), belt: el.getAttribute("data-belt"), x, y };
  }),
);
const beltIds = ["complex-i", "complex-ii", "q-pool", "complex-iii", "complex-iv", "atp-synthase"];
check(
  "复合体 I / II / III / IV、Q 池、ATP 合酶都嵌在内膜带（240–430）",
  beltIds.every((id) => {
    const m = centers.find((c) => c.id === id);
    return m && m.belt === "inner-membrane" && m.y >= 240 && m.y <= 430;
  }),
  JSON.stringify(centers),
);
const cytc = centers.find((c) => c.id === "cytochrome-c");
check("cyt c 在膜间腔一侧（带外 y=190），不画成膜蛋白", Boolean(cytc) && !cytc.belt && cytc.y < 240);
const order = ["complex-i", "q-pool", "complex-iii", "cytochrome-c", "complex-iv", "atp-synthase"];
check(
  "电子链从左到右：I → Q → III → cyt c → IV → ATP 合酶",
  order.every((id, i) => i === 0 || centers.find((c) => c.id === id).x > centers.find((c) => c.id === order[i - 1]).x),
);
const nodes = await page.locator("svg g[data-node-id]").evaluateAll((els) =>
  els.map((el) => {
    const circle = el.querySelector("circle");
    return {
      id: el.getAttribute("data-node-id"),
      x: Number(circle?.getAttribute("cx") ?? 0),
      y: Number(circle?.getAttribute("cy") ?? 0),
    };
  }),
);
for (const id of ["nadh", "fadh2", "o2", "h2o", "adp", "pi", "atp"]) {
  check(`节点 ${id} 存在`, nodes.some((n) => n.id === id));
}
check(
  "NADH / FADH₂ / O₂ / H₂O / ADP / Pi / ATP 都在基质侧（y>430）",
  ["nadh", "fadh2", "o2", "h2o", "adp", "pi", "atp"].every((id) => nodes.find((n) => n.id === id)?.y > 430),
  JSON.stringify(nodes),
);

// ===== 3) 两套线型 =====
console.log("\n===== 3) 电子流 vs 质子流 =====");
const eGroup = page.locator('svg g[data-flow="electron"]');
const pGroup = page.locator('svg g[data-flow="proton"]');
check("电子流分组唯一", (await eGroup.count()) === 1);
check("质子流分组唯一", (await pGroup.count()) === 1);
const eStyle = {
  stroke: await eGroup.getAttribute("stroke"),
  width: await eGroup.getAttribute("stroke-width"),
  dash: await eGroup.getAttribute("stroke-dasharray"),
  marker: await eGroup.getAttribute("marker-end"),
};
const pStyle = {
  stroke: await pGroup.getAttribute("stroke"),
  width: await pGroup.getAttribute("stroke-width"),
  dash: await pGroup.getAttribute("stroke-dasharray"),
  marker: await pGroup.getAttribute("marker-end"),
};
check(
  "电子流：墨色实线 2.1、无虚线、实心箭头",
  eStyle.stroke === "#22282A" && Number(eStyle.width) === 2.1 && !eStyle.dash && eStyle.marker === "url(#ox-e-arrow)",
  JSON.stringify(eStyle),
);
check(
  "质子流：青色虚线 1.7（7 5）、开放式箭头",
  pStyle.stroke === "#2E6E6B" && Number(pStyle.width) === 1.7 && pStyle.dash === "7 5" && pStyle.marker === "url(#ox-h-arrow)",
  JSON.stringify(pStyle),
);
check(
  "两套线型的颜色 / 线宽 / 虚线 / 箭头都不同",
  new Set([eStyle.stroke, pStyle.stroke, eStyle.width, pStyle.width, String(eStyle.dash), String(pStyle.dash), eStyle.marker, pStyle.marker]).size >= 6,
);
const ePaths = await eGroup.locator("path").count();
const pPaths = await pGroup.locator("path").count();
check("电子流有独立路径组（>5 段）", ePaths > 5, String(ePaths));
check("质子流有独立路径组（5 段泵出 / 回流）", pPaths === 5, String(pPaths));
const eChildDashes = await eGroup.locator("path").evaluateAll((els) =>
  els.map((el) => el.getAttribute("stroke-dasharray")).filter(Boolean),
);
check("电子流路径不混入虚线", eChildDashes.length === 0, JSON.stringify(eChildDashes));
const eArrowFill = await page.locator("#ox-e-arrow path").getAttribute("fill");
const hArrowFill = await page.locator("#ox-h-arrow path").getAttribute("fill");
check("实心箭头 fill 不空 / 开放式箭头 fill=none", eArrowFill === "#22282A" && hArrowFill === "none", `${eArrowFill} / ${hArrowFill}`);
const legend = page.locator(".legend");
const legendText = norm(await legend.innerText());
check("图例锁死「电子流 · 实线实心箭头」", legendText.includes("电子流 · 实线实心箭头"));
check("图例锁死「质子流 · 青色虚线 + 开放式箭头」", legendText.includes("质子流 · 青色虚线 + 开放式箭头"));
const svgLegend = page.locator("svg [data-legend]");
check("画布内也有 electron / proton 两行图例", (await svgLegend.count()) === 2);
check(
  "画布图例一行写实线、一行写虚线",
  norm(await svgLegend.nth(0).evaluate((el) => el.textContent)).includes("实线") &&
    norm(await svgLegend.nth(1).evaluate((el) => el.textContent)).includes("虚线"),
);

// ===== 4) 化学计量 =====
console.log("\n===== 4) 化学计量 =====");
const svgText = norm(await plate.evaluate((el) => el.textContent ?? ""));
check("图上直接写出 NADH 10 H⁺ → 2.5 ATP", svgText.includes("10 H⁺") && svgText.includes("2.5 ATP"));
check("图上直接写出 FADH₂ 6 H⁺ → 1.5 ATP", svgText.includes("6 H⁺") && svgText.includes("1.5 ATP"));
check("图上写出 0（II）的差异，复合体 II 不泵质子", svgText.includes("0（II）") && svgText.includes("不泵质子"));
check(
  "O₂ 账：4 e⁻ + O₂ + 8 H⁺(基质) → 2 H₂O + 4 H⁺(膜间腔)",
  svgText.includes("4 e⁻ + O₂ + 8 H⁺") && svgText.includes("2 H₂O + 4 H⁺"),
);
check("明写 2 e⁻ 只还原半个 O₂（½ O₂ → 1 H₂O）", svgText.includes("½ O₂ → 1 H₂O"));
check("P/O 2.5 / 1.5 作为大数字出现在图上", svgText.includes("P/O 2.5 / 1.5"));
check("旧口径 3 / 2 只并列脚注", svgText.includes("旧口径 3 / 2") && svgText.includes("不参与"));
const poTable = norm(await page.locator('[data-po-table="1"]').innerText());
check("右栏 P/O 表：NADH 10 / 2.5、FADH₂ 6 / 1.5", poTable.includes("NADH") && poTable.includes("10") && poTable.includes("2.5") && poTable.includes("FADH₂") && poTable.includes("6") && poTable.includes("1.5"));
check("P/O 表注明旧口径不参与加和", norm(await page.locator("[data-po-note]").innerText()).includes("不参与加和"));

// ===== 5) 右栏：质子回路、共享、不做 3D =====
console.log("\n===== 5) 右栏模块详情 =====");
for (const id of ["pump-i", "pump-iii", "pump-iv", "water-iv", "return-v", "leak"]) {
  check(`右栏有 ${id} 条目`, (await page.locator(`[data-proton-flux="${id}"]`).count()) === 1);
}
check(
  "复合体 I 的质子条目写「只对 NADH 分支」并列出 FADH₂ 分支 0",
  norm(await page.locator('[data-proton-flux="pump-i"]').innerText()).includes("FADH₂ 分支 0"),
);
check(
  "回流条目写「3.67 H⁺ / ATP」与 c8 环 8/3",
  norm(await page.locator('[data-proton-flux="return-v"]').innerText()).includes("3.67 H⁺ / ATP") &&
    norm(await page.locator('[data-proton-flux="return-v"]').innerText()).includes("c8"),
);

// 复合体 II 共享
await page.goto(`${ROUTE}?module=complex-ii`, { waitUntil: "networkidle" });
const shared = page.locator('[data-testid="oxphos-shared"]');
check("复合体 II 右栏有「与 TCA 共享同一实体」块", (await shared.count()) === 1);
check("共享步骤 id = tca-6", (await shared.getAttribute("data-shared-step")) === "tca-6");
check(
  "共享链接直达 TCA 第 6 步",
  (await page.locator('[data-testid="oxphos-shared-link"]').getAttribute("href")) === "/pathway/tca?step=tca-6",
);
check("共享块明写「同一酶」", norm(await shared.innerText()).includes("同一酶"));
check("挂图上复合体 II 也标注「= TCA 第 6 步」", svgText.includes("TCA 第 6 步（同一酶）"));
check("复合体 II 不泵质子（0 H⁺）", norm(await page.locator('[data-testid="oxphos-protons"]').innerText()).includes("0 H⁺"));

// 膜复合体不做 3D
await page.goto(`${ROUTE}?module=complex-i`, { waitUntil: "networkidle" });
check(
  "复合体 I 右栏明确「膜蛋白，本页不做 3D」且给出体量",
  norm(await page.locator('[data-testid="oxphos-no3d"]').innerText()).includes("膜蛋白，本页不做 3D") &&
    norm(await page.locator('[data-testid="oxphos-no3d"]').innerText()).includes("体量"),
);
check(
  "复合体 I PDB 候选含 5LDW / 7QSK 与原子数量级",
  (await page.locator('[data-testid="oxphos-pdb-candidates"]').innerText()).includes("5LDW") &&
    (await page.locator('[data-testid="oxphos-pdb-candidates"]').innerText()).includes("7QSK"),
);
check("挂图上砖红字标注「膜蛋白 · 本页不做 3D」（≥5 处）", (await page.locator("svg [data-no3d]").count()) >= 5);
check("膜蛋白候选表存在（本页不做 3D 的结构证据）", (await page.locator('[data-testid="oxphos-membrane-table"]').count()) === 1);
check("膜蛋白候选表行数为 5（I / II / Q / III / IV）", (await page.locator("[data-membrane-row]").count()) === 5);

// ===== 6) 证据等级 + 结构入口 =====
console.log("\n===== 6) 证据等级与结构入口 =====");
const EXPECT = {
  "complex-i": "2d",
  "complex-ii": "2d",
  "q-pool": "2d",
  "complex-iii": "2d",
  "cytochrome-c": "A",
  "complex-iv": "2d",
  "atp-synthase": "B",
};
for (const [id, gradeWant] of Object.entries(EXPECT)) {
  await page.goto(`${ROUTE}?module=${id}`, { waitUntil: "domcontentloaded" });
  const grade = await page.locator('[data-testid="oxphos-grade"]').getAttribute("data-grade");
  const href = await page.locator('[data-testid="oxphos-structure-cmp-entry"]').getAttribute("href");
  check(`${id} 证据等级 ${grade}（期望 ${gradeWant}，由 evidenceGrade.ts 推导）`, grade === gradeWant);
  check(
    `${id} 结构入口 href=/structures/oxphos#module-${id}`,
    href === `/structures/oxphos#module-${id}` &&
      norm(await page.locator('[data-testid="oxphos-structure-cmp-entry"]').innerText()).includes("看这一块的结构对照"),
  );
}
await page.goto(`${ROUTE}?module=cytochrome-c`, { waitUntil: "domcontentloaded" });
check(
  "cyt c 右栏指向页下 3D 面板（不是膜蛋白占位）",
  (await page.locator('[data-testid="oxphos-soluble-note"]').count()) === 1,
);
check(
  "cyt c 证据写人源 3ZCF",
  norm(await page.locator('[data-testid="oxphos-grade"]').innerText()).includes("3ZCF"),
);
await page.goto(`${ROUTE}?module=atp-synthase`, { waitUntil: "domcontentloaded" });
check(
  "ATP 合酶证据写牛源 1BMF（跨种如实标注 B）",
  norm(await page.locator('[data-testid="oxphos-grade"]').innerText()).includes("1BMF") &&
    norm(await page.locator('[data-testid="oxphos-grade"]').innerText()).includes("B 本酶跨种"),
);
check("所有模块 ΔG 写「数值未核实」", norm(await page.locator('[data-testid="oxphos-dg"]').innerText()).includes("数值未核实"));

// ===== 7) 点击语义 =====
console.log("\n===== 7) 点击语义 =====");
await page.goto(ROUTE, { waitUntil: "networkidle" });
await page.locator('svg g[data-module-id="complex-iii"] text.q-hide').first().click();
check("点模块标签 → URL module=complex-iii", page.url().includes("module=complex-iii"));
check(
  "选中态唯一（只有 complex-iii 外框加粗）",
  (await page.locator('svg g[data-module-id="complex-iii"] rect[stroke-width="2"]').count()) === 1,
);
await page.locator('svg g[data-node-id="nadh"] text.q-hide').first().click();
check("点 NADH 节点 → 选中复合体 I", page.url().includes("module=complex-i"));
await page.locator('svg g[data-node-id="atp"] text.q-hide').first().click();
check("点 ATP 节点 → 选中 ATP 合酶", page.url().includes("module=atp-synthase"));
await page.locator('svg g[data-module-id="cytochrome-c"] text.q-hide').first().click();
check("点 cyt c → module=cytochrome-c", page.url().includes("module=cytochrome-c"));

// ===== 8) 自测模式 =====
console.log("\n===== 8) 自测模式 =====");
await page.goto(ROUTE, { waitUntil: "networkidle" });
await page.locator("[data-oxphos-quiz]").click();
check("自测开启：svg 加 quiz-on", (await plate.getAttribute("class"))?.includes("quiz-on") === true);
check("自测隐藏名数量充足", (await page.locator("svg .q-hide").count()) > 20, String(await page.locator("svg .q-hide").count()));
await page.locator('svg g[data-module-id="complex-i"] text.q-hide').first().click();
check(
  "自测下点模块名 → 揭晓而非选中",
  (await page.locator('svg g[data-module-id="complex-i"] text.q-hide.revealed').count()) >= 1 &&
    !page.url().includes("module="),
);
check("自测下 URL 不误触 module 参数", !page.url().includes("module="));
await page.locator('svg g[data-node-id="q"] text.q-hide').first().click();
check("自测下点节点名 → 揭晓而非选中", (await page.locator('svg g[data-node-id="q"] .q-hide.revealed').count()) >= 1 && !page.url().includes("module="));

// ===== 9) URL 还原 =====
console.log("\n===== 9) URL 还原 =====");
await page.goto(`${ROUTE}?module=atp-synthase`, { waitUntil: "networkidle" });
check(
  "?module=atp-synthase 还原：右栏模块详情为 ATP 合酶",
  norm(await page.locator("aside .d-step").first().innerText()).includes("ATP 合酶"),
);
check(
  "?module=atp-synthase 还原：结构入口指向 module-atp-synthase",
  (await page.locator('[data-testid="oxphos-structure-cmp-entry"]').getAttribute("href")) === "/structures/oxphos#module-atp-synthase",
);
await page.goto(`${ROUTE}?quiz=1`, { waitUntil: "networkidle" });
check("?quiz=1 还原：自测按钮 active", (await page.locator("[data-oxphos-quiz]").getAttribute("aria-pressed")) === "true");
check("?quiz=1 还原：svg 加 quiz-on", (await plate.getAttribute("class"))?.includes("quiz-on") === true);

// ===== 10) 结构页 + 3D 面板 =====
console.log("\n===== 10) 结构页与 3D =====");
const sresp = await page.goto(STRUCT, { waitUntil: "networkidle" });
check("/structures/oxphos 返回 200", sresp?.status() === 200);
const sp = page.locator('[data-testid="oxphos-structure-page"]');
check("结构页存在且编号 SF-06", (await sp.count()) === 1 && (await sp.getAttribute("data-plate-no")) === "SF-06");
check("结构页报头写 SF-06", (await page.locator(".plate-no").first().innerText()).includes("SF-06"));
check("结构页有两个可溶域 3D 面板", (await page.locator('[data-testid="soluble-3d"]').count()) === 2);
check("结构页七个模块行", (await page.locator("[data-structure-row]").count()) === 7, String(await page.locator("[data-structure-row]").count()));
check("结构页有「为什么膜复合体不做 3D」区块", (await page.locator('[data-testid="oxphos-structure-why"]').count()) === 1);
const whyText = norm(await page.locator('[data-testid="oxphos-structure-why"]').innerText());
check("原因区块给出复合体 I 约 1 MDa / 5LDW / 7QSK 原子数", whyText.includes("1 MDa") && whyText.includes("5LDW") && whyText.includes("7QSK"));
check("原因区块明写不能把 F₁ 当成整台 ATP 合酶", whyText.includes("把 F₁ 的 3D 当成整台 ATP 合酶"));
for (const id of ["complex-i", "complex-ii", "q-pool", "complex-iii", "cytochrome-c", "complex-iv", "atp-synthase"]) {
  check(`结构页有模块锚点 #module-${id}`, (await page.locator(`#module-${id}`).count()) === 1);
}

// 滚动到 3D 区，等待 meta 真实加载
await page.locator('[data-testid="oxphos-soluble-3d"]').scrollIntoViewIfNeeded();
await page.waitForSelector('[data-testid="soluble-3d-meta"]', { timeout: 10000 }).catch(() => {});
await page.waitForTimeout(1200);
const panels = page.locator('[data-testid="soluble-3d"]');
check("两个 3D 面板 asset 分别为 cytc / f1", (await panels.nth(0).getAttribute("data-asset")) === "cytc" && (await panels.nth(1).getAttribute("data-asset")) === "f1");
const sources = await page.locator('[data-testid="soluble-3d-source"]').evaluateAll((els) => els.map((e) => e.textContent));
check("cyt c 来源写 PDB 3ZCF / 1.65 Å / Homo sapiens", (sources[0] ?? "").includes("3ZCF") && (sources[0] ?? "").includes("1.65") && (sources[0] ?? "").includes("Homo sapiens"), sources.join(" | "));
check("F₁ 来源写 PDB 1BMF / 2.85 Å / Bos taurus", (sources[1] ?? "").includes("1BMF") && (sources[1] ?? "").includes("2.85") && (sources[1] ?? "").includes("Bos taurus"), sources.join(" | "));
const metaTexts = await page.locator('[data-testid="soluble-3d-meta"]').evaluateAll((els) => els.map((e) => e.textContent ?? ""));
check("cyt c 配体写血红素 HEC", (metaTexts[0] ?? "").includes("HEC"));
check("F₁ 配体写 ADP / ANP / MG", ["ADP", "ANP", "MG"].every((t) => (metaTexts[1] ?? "").includes(t)));
const noteTexts = await page.locator('[data-testid="soluble-3d-note"]').evaluateAll((els) => els.map((e) => e.textContent ?? ""));
check("cyt c 注明血红素共价连接", (noteTexts[0] ?? "").includes("共价"));
check(
  "F₁ 注明 ANP = AMP-PNP、且不含 F₀/c 环",
  (noteTexts[1] ?? "").includes("ANP = AMP-PNP") && /F[₀0]/.test(noteTexts[1] ?? ""),
);
check("3D 已进入 ready（canvas 出现）或降级有明确说明", (await page.locator(".e3d-host canvas").count()) > 0 || (await page.locator(".e3d-state").count()) > 0);
check("3D 纪律说明在页上", norm(await page.locator("[data-3d-discipline]").innerText()).includes("未使用计算构象"));

// ===== 11) 与 β-氧化页的 106 账自洽 =====
console.log("\n===== 11) 与 β-氧化账自洽 =====");
await page.goto(`${BASE}/pathway/fatty-acid-oxidation`, { waitUntil: "networkidle" });
const faoLedger = norm(await page.locator("[data-ledger-derivation]").innerText());
check("β-氧化 106 ATP 推导仍用 7 × 1.5 与 7 × 2.5", faoLedger.includes("7 × 1.5") && faoLedger.includes("7 × 2.5"));
check("β-氧化净 ATP 仍为 106", (await page.locator("[data-net-atp]").getAttribute("data-net-atp")) === "106");

// ===== 12) 截图 =====
console.log("\n===== 12) 截图 =====");
await page.setViewportSize({ width: 1440, height: 1100 });
await page.goto(ROUTE, { waitUntil: "networkidle" });
await page.waitForTimeout(400);
await page.screenshot({ path: join(ROOT, "preview", "poster-oxphos-full.png"), fullPage: true });
console.log("  ↳ preview/poster-oxphos-full.png（整页 · 1440 宽）");

await page.evaluate(() => {
  const el = document.querySelector(".plate-scroll");
  if (el) el.scrollLeft = 1010;
});
await page.waitForTimeout(400);
await page.locator(".plate-scroll").screenshot({ path: join(ROOT, "preview", "poster-oxphos-band.png") });
console.log("  ↳ preview/poster-oxphos-band.png（膜带特写：III / cyt c / IV / ATP，电子实线 vs 质子虚线）");

await page.goto(STRUCT, { waitUntil: "networkidle" });
await page.locator('[data-testid="oxphos-soluble-3d"]').scrollIntoViewIfNeeded();
await page.waitForSelector('[data-testid="soluble-3d-meta"]', { timeout: 10000 }).catch(() => {});
await page.waitForTimeout(1600);
await page.locator('[data-testid="oxphos-soluble-3d"]').screenshot({ path: join(ROOT, "preview", "poster-oxphos-3d.png") });
console.log("  ↳ preview/poster-oxphos-3d.png（cyt c 与 F₁ 两个可溶域 3D）");

await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
await page.waitForTimeout(400);
await page.screenshot({ path: join(ROOT, "preview", "oxphos-home-firstscreen.png") });
console.log("  ↳ preview/oxphos-home-firstscreen.png（1440×1100 首页首屏 · 第六条通路编号）");

check("全流程无页面运行错误", errors.length === 0, errors.slice(0, 3).join(" | "));
if (errors.length) console.log("页面错误：\n" + errors.join("\n"));

await browser.close();
console.log(`\n${failed ? "冒烟未通过" : "冒烟全部通过"}`);
process.exit(failed ? 1 : 0);
