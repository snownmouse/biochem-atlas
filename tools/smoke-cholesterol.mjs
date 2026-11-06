#!/usr/bin/env node
// 胆固醇合成 / 甲羟戊酸通路 PLATE 12 冒烟：挂图 /pathway/cholesterol（含别名）+ 结构对照 /structures/cholesterol
//
// 覆盖：
//   · 路由与别名可达；PLATE 12；图框 ≥24px、1px 墨框、无圆角 / 投影 / 渐变 / 缩放控件 / emoji；
//   · 两条区室带（胞质 + 内质网）分区，不压成一条；
//   · 13 个步骤标签（ch-1..ch-13）与每步主链链接；他汀是药物控制线（不是步骤）；
//   · 点击语义：步骤标签 → 链接 → 节点；statin → ch-3、cholesterol → ch-13；
//   · 右栏：酶 / EC / ΔG=null / 18 条 PDB 身份 / 9 酶簇逐条 EC / 真实接口；
//   · 能量账（18 ATP / 14 NADPH / 12 / 「无净收支」）与守恒（36 = 27 + 9、18、6 IPP、C30）；
//   · 结构对照 SF-12：7 块全部默认 2D / 等级 none，9 个分子 2D 无缺失；
//   · 截图 preview/poster-cholesterol-1440.png 与 poster-cholesterol.png。
//
// 需先 `npm run build`，并让 preview 服务跑在 BASE_URL（默认 http://localhost:4173）。
import { mkdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright-core";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const BASE = process.env.BASE_URL ?? "http://localhost:4173";
const ROUTE = `${BASE}/pathway/cholesterol`;
const STRUCT = `${BASE}/structures/cholesterol`;
let failed = false;
const check = (label, ok) => {
  console.log(`${ok ? "✓" : "✗"} ${label}`);
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
const page = await browser.newPage({ viewport: { width: 1440, height: 1024 } });
const errors = [];
page.on("pageerror", (e) => errors.push(String(e)));
page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
mkdirSync(join(ROOT, "preview"), { recursive: true });

// ===== 1) 路由 / 别名 / 报头 =====
console.log("\n===== 1) 路由与报头 =====");
const resp = await page.goto(ROUTE, { waitUntil: "networkidle" });
check("路由 /pathway/cholesterol 200", resp?.status() === 200);
check("页面标记 data-page=cholesterol", (await page.locator('[data-page="cholesterol"]').count()) === 1);
const plateNoText = await page.locator(".plate-no").innerText();
check(`报头 PLATE 12（实测 ${plateNoText}）`, plateNoText.includes("PLATE 12"));
check("结构对照入口 SF-12", (await page.locator('[data-3d-link="cholesterol"]').innerText()).includes("SF-12"));
await page.goto(`${BASE}/pathway/cholesterol-synthesis`, { waitUntil: "networkidle" });
check("别名 /pathway/cholesterol-synthesis 可达", (await page.locator('[data-page="cholesterol"]').count()) === 1);

// ===== 2) 图框规范（无圆角 / 投影 / 渐变 / 缩放 / emoji）=====
console.log("\n===== 2) 图框规范 =====");
await page.goto(ROUTE, { waitUntil: "networkidle" });
const frame = await page.locator(".plate-scroll").evaluate((el) => {
  const s = getComputedStyle(el);
  return {
    pad: [s.paddingTop, s.paddingRight, s.paddingBottom, s.paddingLeft].map((v) => parseFloat(v)),
    border: `${s.borderTopWidth} ${s.borderTopStyle} ${s.borderTopColor}`,
    radius: s.borderRadius,
    shadow: s.boxShadow,
    bgImage: s.backgroundImage,
  };
});
check(`图框内边距四向 ≥24px（实测 ${frame.pad.join("/")}）`, frame.pad.every((v) => v >= 24));
check(`图框墨色 1px 直角（${frame.border}）`, frame.border.startsWith("1px solid"));
check(`图框无圆角（radius=${frame.radius}）`, frame.radius === "0px");
check(`图框无投影（shadow=${frame.shadow}）`, frame.shadow === "none");
check(`图框无渐变（background-image=${frame.bgImage}）`, frame.bgImage === "none");
const chrome = await page.locator(".poster-cholesterol").evaluate((el) => {
  const sel = [".plate-head", ".panel-block", ".detail", ".output-strip", ".plate-3d-link"];
  const rows = [];
  for (const q of sel) {
    const n = el.querySelector(q);
    if (!n) continue;
    const s = getComputedStyle(n);
    rows.push({ q, radius: s.borderRadius, shadow: s.boxShadow, bg: s.backgroundImage });
  }
  return rows;
});
check(
  "右栏 / 页头块无圆角、无投影、无渐变",
  chrome.length >= 4 && chrome.every((r) => r.radius === "0px" && r.shadow === "none" && r.bg === "none"),
);
check(
  "无缩放控件（无 range / data-zoom / 缩放按钮）",
  (await page.locator('.poster-cholesterol input[type="range"], .poster-cholesterol [data-zoom], .poster-cholesterol button:has-text("缩放"), .poster-cholesterol button:has-text("Zoom")').count()) === 0,
);
check("挂图 svg 声明 data-no-zoom=1", (await page.locator("svg[data-plate][data-no-zoom='1']").count()) === 1);
const posterText = (await page.locator(".poster-cholesterol").innerText()).replace(/\s+/g, " ");
const emoji = [...posterText].filter((ch) => {
  const cp = ch.codePointAt(0);
  const arrow = (cp >= 0x2190 && cp <= 0x21ff) || (cp >= 0x2b00 && cp <= 0x2bff);
  return !arrow && /\p{Extended_Pictographic}/u.test(ch);
});
check("无 emoji（Extended_Pictographic，排除箭头）", emoji.length === 0);

// ===== 3) 两条区室带与计数 =====
console.log("\n===== 3) 区室带与计数 =====");
const plate = page.locator("svg[data-plate]");
check("挂图 svg 唯一", (await plate.count()) === 1);
const zones = await page.locator("svg [data-zone]").evaluateAll((els) => els.map((e) => e.getAttribute("data-zone")));
check(`两条区室带：胞质 + 内质网（实测 ${zones.join(",")}）`, zones.join(",") === "cytosol,er");
check("区室带 svg 属性：步骤 13 / 区室 2 / 簇 9 / PDB 18", await plate.evaluate((el) =>
  el.getAttribute("data-step-count") === "13" &&
  el.getAttribute("data-compartment-count") === "2" &&
  el.getAttribute("data-cluster-count") === "9" &&
  el.getAttribute("data-pdb-count") === "18"
));
const zoneBoxes = await page.locator("svg [data-zone] rect").evaluateAll((els) => els.map((e) => e.getBoundingClientRect().toJSON()));
check(
  "两条带互不重叠且上下分离",
  zoneBoxes.length === 2 && zoneBoxes[1].top >= zoneBoxes[0].bottom - 1,
  zoneBoxes.map((b) => `${Math.round(b.top)}–${Math.round(b.bottom)}`).join(" / "),
);
const plateText = (await plate.evaluate((el) => el.textContent ?? "")).replace(/\s+/g, " ");
check("泳道英文标题齐备", ["CYTOSOL", "ENDOPLASMIC RETICULUM"].every((t) => plateText.includes(t)));
check("首屏明写「SREBP-2 反馈」为注记", plateText.includes("SREBP-2") && plateText.includes("注记，非步骤"));
check("首屏明写他汀「不写成反应步骤」", plateText.includes("他汀作用于 HMGCR，不写成反应步骤"));
check("首屏明写 FDPS 在胞质", plateText.includes("FDPS 在胞质"));
check("首屏列出簇内 9 个酶与 EC", plateText.includes("CYP51A1 1.14.14.154") && plateText.includes("DHCR24 1.3.1.72"));
check("首屏写明 DHCR7 缺陷 / SLOS", plateText.includes("SLOS"));

// ===== 4) 13 步与主链闭合 =====
console.log("\n===== 4) 十三步与主链 =====");
const stepBlocks = await page.locator("svg [data-step-block]").evaluateAll((els) => els.map((e) => e.getAttribute("data-step-block")));
check("13 个步骤标签", stepBlocks.length === 13);
check("步骤顺序 ch-1..ch-13", stepBlocks.join(",") === Array.from({ length: 13 }, (_, i) => `ch-${i + 1}`).join(","));
for (let i = 1; i <= 13; i += 1) {
  const s = `ch-${i}`;
  check(`${s} 有骨架链接`, (await page.locator(`svg [data-link-id][data-step-id="${s}"]`).count()) >= 1);
}
const drug = page.locator('svg [data-link-id="l-drug"]');
check("他汀连线存在且为控制线（琥珀虚线）", (await drug.count()) === 1 &&
  (await drug.locator("path").first().getAttribute("stroke")) === "#B4761F" &&
  (await drug.locator("path").first().getAttribute("stroke-dasharray")) === "6 4");
check("他汀连线不挂 data-step-id（不是反应步骤）", (await drug.getAttribute("data-step-id")) === null);
const statinNode = page.locator('svg g[data-node-id="statin"] rect');
check("他汀节点为砖框药物节点", (await statinNode.count()) === 1 && (await statinNode.getAttribute("stroke")) === "#9C4A3C");
check("图上写明 HMGCR 还原步与 NADPH 计量", plateText.includes("HMGCR 还原") && plateText.includes("14 NADPH（簇前）"));

// ===== 5) 点击语义 + URL 还原 =====
console.log("\n===== 5) 点击与 URL =====");
await page.goto(ROUTE, { waitUntil: "networkidle" });
await page.locator('svg [data-step-block="ch-3"] text').click();
check("点步骤标签 ch-3 → step=ch-3", page.url().includes("step=ch-3"));
check("右栏切到 ch-3", (await page.locator("aside [data-detail-step]").getAttribute("data-detail-step")) === "ch-3");
await page.locator('svg g[data-node-id="statin"] rect').click();
check("点他汀节点 → 选中 ch-3（药物作用于 HMGCR）", page.url().includes("step=ch-3") &&
  (await page.locator("aside [data-detail-step]").getAttribute("data-detail-step")) === "ch-3");
await page.locator('svg g[data-node-id="cholesterol"] circle').click();
check("点胆固醇节点 → 选中 ch-13", page.url().includes("step=ch-13") &&
  (await page.locator("aside [data-detail-step]").getAttribute("data-detail-step")) === "ch-13");
check("ch-13 簇内 9 酶逐条", (await page.locator("aside [data-cluster] [data-cluster-enzyme]").count()) === 9);
check("簇内含 CYP51A1 EC 1.14.14.154", (await page.locator("aside [data-cluster]").innerText()).includes("1.14.14.154"));
await page.locator('svg g[data-node-id="fpp"] circle').first().click();
check("点 FPP 节点 → 选中 ch-10", page.url().includes("step=ch-10"));
await page.goto(`${ROUTE}?step=ch-6`, { waitUntil: "networkidle" });
check("URL 还原：ch-6 选中", (await page.locator("aside [data-detail-step]").getAttribute("data-detail-step")) === "ch-6");

// ===== 6) 右栏：酶 / ΔG / PDB =====
console.log("\n===== 6) 右栏证据 =====");
await page.goto(`${ROUTE}?step=ch-3`, { waitUntil: "networkidle" });
const aside = (await page.locator("aside").innerText()).replace(/\s+/g, " ");
check("右栏含酶名 / EC / 底物 / 产物 / 辅因子", ["HMGCR", "EC 1.1.1.34", "底物", "产物", "辅因子"].every((t) => aside.includes(t)));
check("ΔG 不出现具体数值", !/(kJ\/mol|kcal\/mol|eQuilibrator)/.test(aside));
check("ΔG 保留定性 + Lehninger 出处", aside.includes("Lehninger"));
check("ch-3 三条 PDB 齐备", (await page.locator("aside [data-pdb-id]").count()) === 3 &&
  ["1HWK", "1HW9", "1DQA"].every((p) => aside.includes(p)));
check("PDB 身份含 Homo sapiens / 方法 / 分辨率", aside.includes("Homo sapiens") && aside.includes("X-ray") && aside.includes("Å"));
check("1HWK 写明他汀配体与 M485I 构建体", aside.includes("阿托伐他汀") && aside.includes("M485I"));
await page.goto(`${ROUTE}?step=ch-11`, { waitUntil: "networkidle" });
const sqleAside = (await page.locator("aside").innerText()).replace(/\s+/g, " ");
check("SQLE 写明 NB-598 抑制剂复合物（6C6P）", sqleAside.includes("6C6P") && sqleAside.includes("NB-598"));
await page.goto(`${ROUTE}?step=ch-1`, { waitUntil: "networkidle" });
const ch1Aside = (await page.locator("aside").innerText()).replace(/\s+/g, " ");
check("ch-1 接口指向真实 tca-1（不是幽灵 id）", ch1Aside.includes("tca-1") && ch1Aside.includes("accoa") && !ch1Aside.includes("tca-pdh"));

// ===== 7) 能量账 / 守恒 / 调控 / 接口 =====
console.log("\n===== 7) 能量账与调控 =====");
const ledger = (await page.locator("[data-energy-ledger]").innerText()).replace(/\s+/g, " ");
check("能量账 18 ATP / 14 NADPH / 12（HMGCR）", ledger.includes("18") && ledger.includes("14") && ledger.includes("12"));
check("四步标「无净收支」", ledger.includes("无净收支") && ledger.includes("ACAT2") && ledger.includes("FDPS"));
check("簇内还原当量不合并成单一总数", ledger.includes("不合并成单一总数"));
const cons = (await page.locator("[data-conservation]").innerText()).replace(/\s+/g, " ");
check("碳守恒 36 = 27 + 9", cons.includes("36 C") && cons.includes("C27") && cons.includes("9 CO₂") && cons.includes("36 = 27 + 9"));
check("磷酸 18 → 18 ADP + 18 Pi", cons.includes("18 ATP") && cons.includes("18 ADP") && cons.includes("18 Pi"));
check("异戊二烯 6 IPP → 角鲨烯 C30，2 个 FPP", cons.includes("6 IPP") && cons.includes("C30") && cons.includes("2 个 FPP"));
const regKinds = await page.locator("aside [data-reg-kind]").evaluateAll((els) => els.map((e) => e.getAttribute("data-reg-kind")));
check(`两类调控：药物 + 反馈（实测 ${regKinds.join(",")}）`, regKinds.join(",") === "drug,feedback");
const regText = (await page.locator("[data-regulation]").innerText()).replace(/\s+/g, " ");
check("调控写明他汀「不是反应步骤」", regText.includes("不是反应步骤"));
check("反馈写明 SREBP-2 / SCAP / INSIG", ["SREBP-2", "SCAP", "INSIG"].every((t) => regText.includes(t)));
check("调控出处 Lehninger 8e", regText.includes("Lehninger 8e"));
const ifPanel = (await page.locator("[data-interfaces]").innerText()).replace(/\s+/g, " ");
for (const id of ["int-isoprenoid", "int-bile-acid", "int-steroid"]) {
  const el = page.locator(`[data-interface-unbuilt="${id}"]`);
  check(
    `${id} 显式标注「未接入 / 数据待建」`,
    (await el.count()) === 1 && (await el.innerText()).includes("未接入 / 数据待建"),
  );
}
check("有真实 sharedWith 的 int-tca 不挂「未接入」标记", (await page.locator("[data-interface-unbuilt]").count()) === 3 && ifPanel.includes("tca-1"));
check("3D 状态 pending（不伪造资产）", (await page.locator("[data-three-d]").innerText()).includes("pending"));
const molSheet = page.locator("[data-molecule-sheet]");
check("分子式 · 电离态面板 16 个分子", (await molSheet.locator("[data-molecule]").count()) === 16);
const molText = (await molSheet.innerText()).replace(/\s+/g, " ");
check("甲羟戊酸二磷酸写全 ⁴⁻", molText.includes("C₆H₁₀O₁₀P₂⁴⁻"));
check("IPP / DMAPP 写全 ³⁻", molText.includes("C₅H₉O₇P₂³⁻"));
check("胆固醇中性式无上标", molText.includes("C₂₇H₄₆O") && !molText.includes("C₂₇H₄₆O²"));
check("逐分子 chargeBasis 写明二磷酸单酯 −3", molText.includes("二磷酸单酯 −3") && molText.includes("电离基团"));

// 首屏 PDB 口径条（1440×900）
await page.setViewportSize({ width: 1440, height: 900 });
await page.goto(ROUTE, { waitUntil: "networkidle" });
const pdbSrc = page.locator("[data-pdb-source]");
check("首屏 PDB 口径条存在", (await pdbSrc.count()) === 1);
const pdbBox = await pdbSrc.boundingBox();
check(
  `PDB 口径条落在 1440×900 首屏内（top=${Math.round(pdbBox?.y ?? -1)}，bottom=${Math.round((pdbBox?.y ?? 0) + (pdbBox?.height ?? 0))}）`,
  Boolean(pdbBox) && pdbBox.y >= 0 && pdbBox.y + pdbBox.height <= 900,
);
const pdbSrcText = (await pdbSrc.innerText()).replace(/\s+/g, " ");
check("PDB 口径写明 18 条人源 X 射线", pdbSrcText.includes("18") && pdbSrcText.includes("人源") && pdbSrcText.includes("X 射线"));
check("PDB 口径写明 M485I 与 D231A 突变体", pdbSrcText.includes("M485I") && pdbSrcText.includes("D231A"));
check("PDB 口径写明只用于身份核验", pdbSrcText.includes("只用于酶身份核验"));

// ===== 8) 结构对照页 SF-12 =====
console.log("\n===== 8) 结构对照 =====");
const sresp = await page.goto(STRUCT, { waitUntil: "networkidle" });
check("结构对照页 200", sresp?.status() === 200);
const blocks = page.locator(".cmp-block[data-step-id]");
check("7 个对照块", (await blocks.count()) === 7);
const blockIds = await blocks.evaluateAll((els) => els.map((e) => e.getAttribute("data-step-id")));
check("块顺序 ch-4/5/6/7/11/12/13", blockIds.join(",") === "ch-4,ch-5,ch-6,ch-7,ch-11,ch-12,ch-13");
for (const id of ["ch-4", "ch-5", "ch-6", "ch-7", "ch-11", "ch-12", "ch-13"]) {
  const def = await page.locator(`.cmp-block[data-step-id="${id}"]`).getAttribute("data-default-mode");
  const g = await page.locator(`.cmp-block[data-step-id="${id}"] [data-testid=block-grade]`).getAttribute("data-grade");
  check(`${id} 默认 2d（实测 ${def}）/ 等级 none（实测 ${g}）`, def === "2d" && g === "none");
}
check("没有任何「未分级」块", (await page.locator("[data-testid=block-ungraded]").count()) === 0);
const mol2dIds = await page.locator("[data-testid=mol-2d]").evaluateAll((els) => [...new Set(els.map((e) => e.getAttribute("data-mol-id")))]);
check(
  "9 个分子 2D 结构式已接入（0 个缺 2D）",
  (await page.locator("[data-testid=missing-2d]").count()) === 0 &&
    (await page.locator("[data-testid=mol-2d] .mol2d-state").count()) === 0 &&
    ["mevalonate", "mev5p", "mev5pp", "ipp", "dmapp", "squalene", "oxidosqualene", "lanosterol", "cholesterol"].every((id) => mol2dIds.includes(id)),
  mol2dIds.join(","),
);
check("酶 3D 面板关闭声明可见（不伪造酶结构）", (await page.locator("[data-testid=enzyme-panel-off]").first().innerText()).includes("不截取膜蛋白结构"));
check("返回挂图链接指向 /pathway/cholesterol", (await page.locator('a[href="/pathway/cholesterol"]').count()) >= 1);
const structText = (await page.locator("body").innerText()).replace(/\s+/g, " ");
check("页脚列出 1HWK / 2R3V / 6C6P / 1W6K", ["1HWK", "2R3V", "6C6P", "1W6K"].every((p) => structText.includes(p)));

// ===== 9) 截图 =====
console.log("\n===== 9) 截图 =====");
await page.setViewportSize({ width: 1440, height: 1100 });
await page.goto(ROUTE, { waitUntil: "networkidle" });
await page.waitForTimeout(500);
await page.screenshot({ path: join(ROOT, "preview", "poster-cholesterol-1440.png"), fullPage: true });
console.log("  ↳ preview/poster-cholesterol-1440.png（整页 · 1440 宽）");
// 全幅画布截图：临时隐藏右栏并放宽视口，避免 aside 盖住 1980px 画布的右半段。
await page.addStyleTag({
  content:
    ".body-grid{grid-template-columns:1fr !important}.plate-wrap{border-right:0 !important}aside{display:none !important}",
});
await page.setViewportSize({ width: 2060, height: 1100 });
await page.waitForTimeout(300);
await page.locator("svg[data-plate]").screenshot({ path: join(ROOT, "preview", "poster-cholesterol.png") });
console.log("  ↳ preview/poster-cholesterol.png（挂图画布全幅 1980×1000，已隐去右栏遮罩）");

check("无页面运行错误（含截图段）", errors.length === 0);
if (errors.length) console.log("页面错误：\n" + errors.join("\n"));

await browser.close();
console.log(`\n${failed ? "冒烟未通过" : "冒烟全部通过"}`);
process.exit(failed ? 1 : 0);
