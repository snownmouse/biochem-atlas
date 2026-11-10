#!/usr/bin/env node
// 糖原代谢 PLATE 10 冒烟：挂图 /pathway/glycogen（含别名）+ 结构对照 /structures/glycogen
//
// 覆盖：
//   · 路由与别名可达；PLATE 10；图框 ≥24px、1px 墨框、无圆角 / 投影 / 渐变 / 缩放控件 / emoji；
//   · 三泳道（胞质 + 肝臂 + 肌臂）分区，肝/肌各自成带，不压成一条；
//   · 9 个步骤标签（gly-1..9）、两臂闭合、cycle-return 同一颗粒池；
//   · 肝 vs 肌：肝 G6PC1 出口、肌无出口，首屏注解与右栏器官摘要都可读；
//   · 点击语义：先步骤、再节点、再器官 tab；URL step / organ 还原；
//   · 能量账（+2 / +1 / −1 / 0 与 100 残基 200/100）与守恒（1→1、4→4）；
//   · 调控三类（共价 / 激素 / 变构）与接口只指向真实 gk-1 / gk-2 / gn-11；
//   · 结构对照 6 块：默认 2D/3D、等级 C / none、借用来源首屏可见、无「未分级」；
//   · 1440 截图 preview/poster-glycogen-1440.png 与 poster-glycogen.png。
//
// 需先 `npm run build`，并让 preview 服务跑在 BASE_URL（默认 http://localhost:4173）。
import { mkdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright-core";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const BASE = process.env.BASE_URL ?? "http://localhost:4173";
const ROUTE = `${BASE}/pathway/glycogen`;
const STRUCT = `${BASE}/structures/glycogen`;
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
check("路由 /pathway/glycogen 200", resp?.status() === 200);
check("页面标记 data-page=glycogen", (await page.locator('[data-page="glycogen"]').count()) === 1);
check("报头 PLATE 10", (await page.locator(".plate-no").innerText()).includes("PLATE 10"));
check("结构对照入口 SF-10", (await page.locator('[data-3d-link="glycogen"]').innerText()).includes("SF-10"));
await page.goto(`${BASE}/pathway/glycogen-metabolism`, { waitUntil: "networkidle" });
check("别名 /pathway/glycogen-metabolism 可达", (await page.locator('[data-page="glycogen"]').count()) === 1);

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
const chrome = await page.locator(".poster-glycogen").evaluate((el) => {
  const sel = [".plate-head", ".panel-block", ".detail", ".organ-tab", ".plate-3d-link"];
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
  chrome.length >= 4 && chrome.every((r) => r.radius === "0px" && r.shadow === "none" && r.bg === "none")
);
check("无缩放控件（无 range / data-zoom / 缩放按钮）", (await page.locator('.poster-glycogen input[type="range"], .poster-glycogen [data-zoom], .poster-glycogen button:has-text("缩放"), .poster-glycogen button:has-text("Zoom")').count()) === 0);
const posterText = (await page.locator(".poster-glycogen").innerText()).replace(/\s+/g, " ");
const emoji = [...posterText].filter((ch) => {
  const cp = ch.codePointAt(0);
  const arrow = (cp >= 0x2190 && cp <= 0x21ff) || (cp >= 0x2b00 && cp <= 0x2bff);
  return !arrow && /\p{Extended_Pictographic}/u.test(ch);
});
check("无 emoji（Extended_Pictographic，排除箭头）", emoji.length === 0);

// ===== 3) 三泳道与首屏器官差异 =====
console.log("\n===== 3) 泳道与器官差异 =====");
const plate = page.locator("svg[data-plate]");
check("挂图 svg 唯一", (await plate.count()) === 1);
const zones = await page.locator("svg [data-zone]").evaluateAll((els) => els.map((e) => e.getAttribute("data-zone")));
check("三泳道：胞质 + 肝臂 + 肌臂", zones.join(",") === "cytosol,liver-arm,muscle-arm");
const plateText = (await plate.evaluate((el) => el.textContent ?? "")).replace(/\s+/g, " ");
check("泳道英文标题齐备", ["CYTOSOL", "LIVER ARM", "MUSCLE ARM"].every((t) => plateText.includes(t)));
check("首屏明写「肝糖原供全身」", plateText.includes("肝糖原供全身"));
check("首屏明写「肌糖原只供自己」", plateText.includes("肌糖原只供自己"));
check("首屏明写「肌无 G6PC1」", plateText.includes("肌无 G6PC1"));
check("肝臂注明 G6PC1 / SLC37A4 出口", plateText.includes("G6PC1") && plateText.includes("SLC37A4"));

// PLP 三个结构的物种口径必须在首屏（不是只写进右栏 PDB 面板）
const plp = page.locator("[data-plp-source]");
check("首屏 PLP 口径条存在", (await plp.count()) === 1);
const plpBox = await plp.boundingBox();
check(
  `PLP 口径条落在 1440×900 首屏内（top=${Math.round(plpBox?.y ?? -1)}，bottom=${Math.round((plpBox?.y ?? 0) + (plpBox?.height ?? 0))}）`,
  Boolean(plpBox) && plpBox.y >= 0 && plpBox.y + plpBox.height <= 900,
);
const plpText = (await plp.innerText()).replace(/\s+/g, " ");
check("PLP 三份结构逐个列出 1EM6 / 1FA9 / 1Z8D", ["1EM6", "1FA9", "1Z8D"].every((p) => plpText.includes(p)));
check("PLP 物种口径写明 Homo sapiens 且男女肌肝同工酶分开", plpText.includes("Homo sapiens") && plpText.includes("PYGL") && plpText.includes("PYGM"));
check("PLP 表达系统写明 S. frugiperda 与 E. coli", plpText.includes("S. frugiperda") && plpText.includes("E. coli"));
check("PLP 突变口径写明无工程点突变 + 1Z8D 修饰残基", plpText.includes("无工程点突变") && plpText.includes("S14(SEP)") && plpText.includes("K680(LLP)"));
check("PLP 写明共价辅因子而非游离底物", plpText.includes("共价辅因子") && plpText.includes("不是游离底物"));

// ===== 4) 9 步与两臂闭合 =====
console.log("\n===== 4) 九步与闭合 =====");
const stepBlocks = await page.locator("svg [data-step-block]").evaluateAll((els) => els.map((e) => e.getAttribute("data-step-block")));
check("9 个步骤标签", stepBlocks.length === 9);
check("步骤顺序 gly-1..gly-9", stepBlocks.join(",") === Array.from({ length: 9 }, (_, i) => `gly-${i + 1}`).join(","));
for (const s of ["gly-1", "gly-2", "gly-3", "gly-4", "gly-5", "gly-6", "gly-7", "gly-8", "gly-9"]) {
  check(`${s} 有骨架链接`, (await page.locator(`svg [data-link-id][data-step-id="${s}"]`).count()) >= 1);
}
const pool = page.locator('svg [data-link-id="l-gly-9-pool"]');
check("颗粒池闭合弧存在且为虚线", (await pool.count()) === 1 && (await pool.locator("path").first().getAttribute("stroke-dasharray")) === "6 4");
check("闭合弧用青色（同一颗粒池）", (await pool.locator("path").first().getAttribute("stroke")) === "#2E6E6B");
check("闭合弧标注「同一颗粒池」", plateText.includes("同一颗粒池"));
const stepText = (await page.locator("svg[data-plate]").evaluate((el) => el.textContent ?? "")).replace(/\s+/g, " ");
check("图上写明磷酸解与 α-1,6", stepText.includes("磷酸解") && stepText.includes("α-1,6"));
check("图上写明 UTP → PPi", stepText.includes("UTP → PPi"));

// ===== 5) 点击语义 + URL 还原 =====
console.log("\n===== 5) 点击与 URL =====");
await page.goto(ROUTE, { waitUntil: "networkidle" });
await page.locator('svg [data-step-block="gly-4"] text').click();
check("点步骤标签 gly-4 → step=gly-4", page.url().includes("step=gly-4"));
check("右栏切到肝 G6PC1", (await page.locator("aside [data-detail-step]").getAttribute("data-detail-step")) === "gly-4");
await page.locator('svg g[data-node-id="g6p"] circle').click();
check("点节点 G6P → 选中 gly-3", page.url().includes("step=gly-3"));
await page.locator('svg g[data-node-id="g6pc1"] text').first().click();
check("点肝出口节点 G6PC1 → 选中 gly-4", page.url().includes("step=gly-4"));
await page.locator('[data-organ-tab="muscle"]').click();
check("点肌 tab → organ=muscle 且落到 gly-5", page.url().includes("organ=muscle") && page.url().includes("step=gly-5"));
check("肌 tab 高亮", (await page.locator('[data-organ-tab="muscle"]').getAttribute("aria-pressed")) === "true");
check("肌右栏摘要写明「只供自己」", (await page.locator("[data-organ-summary]").innerText()).includes("只供自己"));
await page.locator('[data-organ-tab="liver"]').click();
check("点肝 tab → organ=liver 且落到 gly-4", page.url().includes("organ=liver") && page.url().includes("step=gly-4"));
check("肝右栏摘要写明「供全身」", (await page.locator("[data-organ-summary]").innerText()).includes("供全身"));
await page.goto(`${ROUTE}?step=gly-2&organ=muscle`, { waitUntil: "networkidle" });
check("URL 还原：gly-2 选中 + 肌 tab", (await page.locator("aside [data-detail-step]").getAttribute("data-detail-step")) === "gly-2" &&
  (await page.locator('[data-organ-tab="muscle"]').getAttribute("aria-pressed")) === "true");

// ===== 6) 右栏：反应 / ΔG / 器官差异 / PDB =====
console.log("\n===== 6) 右栏证据 =====");
await page.goto(`${ROUTE}?step=gly-1`, { waitUntil: "networkidle" });
const aside = (await page.locator("aside").innerText()).replace(/\s+/g, " ");
check("右栏含酶名 / EC / 底物 / 产物 / 辅因子", ["糖原磷酸化酶", "EC", "底物", "产物", "辅因子"].every((t) => aside.includes(t)));
check("ΔG 不出现具体数值", !/(kJ\/mol|kcal\/mol|eQuilibrator)/.test(aside));
check("ΔG 只给定性 + Lehninger 8e", aside.includes("Lehninger 8e") && !/ΔG\s*[-−]\s*\d/.test(aside));
check("gly-1 肝/肌差异句可见", aside.includes("肝") && aside.includes("肌"));
check("PDB 1EM6 身份齐备（人 PYGL / 2.2 Å / PLP + NBG）", aside.includes("1EM6") && aside.includes("2.2") && aside.includes("PLP") && aside.includes("NBG"));
check("PDB 1FA9 / 1Z8D 也列出", aside.includes("1FA9") && aside.includes("1Z8D"));
check("未建资产不伪造：3D 状态 pending", (await page.locator("[data-three-d]").innerText()).includes("pending"));
const shared = await page.locator("aside [data-shared-with]").evaluateAll((els) => els.map((e) => e.getAttribute("data-shared-with")));
check("gly-1 无跨通路接口时如实写「本步没有跨通路接口」", shared.length === 0 && aside.includes("本步没有跨通路接口"));
await page.goto(`${ROUTE}?step=gly-3`, { waitUntil: "networkidle" });
const links = await page.locator("aside [data-shared-with]").evaluateAll((els) => els.map((e) => [e.getAttribute("data-shared-with"), e.getAttribute("href")]));
check("gly-3 接口只指向真实 gk-1 / gk-2 / gn-11", links.length === 3 &&
  links.some(([k]) => k === "glycolysis:gk-1:g6p") && links.some(([k]) => k === "glycolysis:gk-2:g6p") && links.some(([k]) => k === "gluconeogenesis:gn-11:g6p"));
check("接口 href 落到真实步骤参数", links.some(([, h]) => h === "/pathway/glycolysis?step=gk-2") && links.some(([, h]) => h === "/pathway/gluconeogenesis?step=gn-11"));

// ===== 7) 能量账 / 守恒 / 调控 =====
console.log("\n===== 7) 能量账与调控 =====");
const ledger = (await page.locator("[data-energy-ledger]").innerText()).replace(/\s+/g, " ");
check("能量账主数字 2 酐键 / 残基", ledger.includes("2") && ledger.includes("酐键"));
check("账本逐条：磷酸解 -1、UTP +1、PPi +1、合成 +2、脱支 0", ["-1", "+1", "+2", "0"].every((t) => ledger.includes(t)));
check("参考轮次 100 × 2 = 200 与 100 × 1 = 100 写出", ledger.includes("200") && ledger.includes("100") && ledger.includes("100 × 2"));
const cons = (await page.locator("[data-conservation]").innerText()).replace(/\s+/g, " ");
check("碳守恒 6 C / 残基", cons.includes("6 C"));
check("分解磷酸 1 → 1", cons.includes("1 → 1"));
check("合成磷酸 4 → 4", cons.includes("4 → 4"));
const regKinds = await page.locator("aside [data-reg-kind]").evaluateAll((els) => els.map((e) => e.getAttribute("data-reg-kind")));
check("三类调控齐全：共价 / 激素 / 变构", regKinds.join(",") === "covalent,hormonal,allosteric");
const regText = (await page.locator("[data-regulation]").innerText()).replace(/\s+/g, " ");
check("调控含磷酸化酶激酶 / PP1 / AMP / cAMP", ["磷酸化酶激酶", "PP1", "AMP", "cAMP"].every((t) => regText.includes(t)));
check("激素含胰岛素 / 胰高血糖素 / 肾上腺素", ["胰岛素", "胰高血糖素", "肾上腺素"].every((t) => regText.includes(t)));
check("调控出处 Lehninger 8e", regText.includes("Lehninger 8e"));

// int-glycogenin 仍未建实体，必须在页面上显式写“未接入 / 数据待建”；int-utp 已接 PLATE 15，必须给出真实链接
const ifPanel = (await page.locator("[data-interfaces]").innerText()).replace(/\s+/g, " ");
for (const id of ["int-glycogenin"]) {
  const el = page.locator(`[data-interface-unbuilt="${id}"]`);
  check(
    `${id} 在页面上显式标注「未接入 / 数据待建」`,
    (await el.count()) === 1 && (await el.innerText()).includes("未接入 / 数据待建"),
  );
}
check("有真实 sharedWith 的接口不挂「未接入」标记", (await page.locator("[data-interface-unbuilt]").count()) === 1 && ifPanel.includes("UTP 来源") && ifPanel.includes("glycogenin"));
check("int-utp 指向 PLATE 15 的 pyr-8", (await page.locator("[data-interface-link='int-utp:pyrimidine:pyr-8']").count()) === 1);

// ===== 8) 结构对照页 SF-10 =====
console.log("\n===== 8) 结构对照 =====");
const sresp = await page.goto(STRUCT, { waitUntil: "networkidle" });
check("结构对照页 200", sresp?.status() === 200);
const blocks = page.locator(".cmp-block[data-step-id]");
check("6 个对照块", (await blocks.count()) === 6);
const blockIds = await blocks.evaluateAll((els) => els.map((e) => e.getAttribute("data-step-id")));
check("块顺序 gly-1/2/3/4/7/8", blockIds.join(",") === "gly-1,gly-2,gly-3,gly-4,gly-7,gly-8");
const expect = { "gly-1": ["2d", "none"], "gly-2": ["2d", "C"], "gly-3": ["2d", "C"], "gly-4": ["3d", "C"], "gly-7": ["2d", "none"], "gly-8": ["2d", "none"] };
for (const [id, [mode, grade]] of Object.entries(expect)) {
  const def = await page.locator(`.cmp-block[data-step-id="${id}"]`).getAttribute("data-default-mode");
  const g = await page.locator(`.cmp-block[data-step-id="${id}"] [data-testid=block-grade]`).getAttribute("data-grade");
  check(`${id} 默认 ${mode}（实测 ${def}）/ 等级 ${grade}（实测 ${g}）`, def === mode && g === grade);
}
check("没有任何「未分级」块", (await page.locator("[data-testid=block-ungraded]").count()) === 0);
check("等级不由页面手写：每块等级 = evidenceGrade 推导值", await page.evaluate(() => {
  const blocks = [...document.querySelectorAll(".cmp-block[data-step-id]")];
  return blocks.every((b) => {
    const g = b.getAttribute("data-grade");
    return ["A", "B", "C", "D", "none"].includes(g);
  });
}));
const src = (await page.locator("[data-testid=ligand-sources]").evaluateAll((els) => els.map((e) => e.textContent ?? ""))).join(" ").replace(/\s+/g, " ");
check("借用来源首屏可见：HK1 1CZA 不是本步酶", src.includes("1CZA") && src.includes("不是本步酶"));
const mol2dIds = await page.locator("[data-testid=mol-2d]").evaluateAll((els) => [...new Set(els.map((e) => e.getAttribute("data-mol-id")))]);
check(
  "糖原 7 个分子 2D 结构式已接入（0 个缺 2D）",
  (await page.locator("[data-testid=missing-2d]").count()) === 0 &&
    (await page.locator("[data-testid=mol-2d] .mol2d-state").count()) === 0 &&
    ["glycogen", "glycogen-limit", "g1p", "utp", "udp-glucose", "ppi", "udp"].every((id) => mol2dIds.includes(id)),
  mol2dIds.join(",")
);
check("酶 3D 面板关闭声明可见（不伪造酶结构）", (await page.locator("[data-testid=enzyme-panel-off]").first().innerText()).includes("只做小分子结构对照"));
const structText = (await page.locator("body").innerText()).replace(/\s+/g, " ");
check("页脚 PDB 清单实际含 1EM6 / 9JTM / 7Q13 / 4R7P / 6UIQ / 8ZEQ", ["1EM6", "9JTM", "7Q13", "4R7P", "6UIQ", "8ZEQ"].every((p) => structText.includes(p)));

// ===== 9) 截图 =====
console.log("\n===== 9) 截图 =====");
await page.setViewportSize({ width: 1440, height: 1100 });
await page.goto(ROUTE, { waitUntil: "networkidle" });
await page.waitForTimeout(500);
await page.screenshot({ path: join(ROOT, "preview", "poster-glycogen-1440.png"), fullPage: true });
console.log("  ↳ preview/poster-glycogen-1440.png（整页 · 1440 宽）");
// 全幅画布截图：临时隐藏右栏并放宽视口，避免 aside 盖住 1980px 画布的右半段。
await page.addStyleTag({
  content:
    ".body-grid{grid-template-columns:1fr !important}.plate-wrap{border-right:0 !important}aside{display:none !important}",
});
await page.setViewportSize({ width: 2060, height: 1100 });
await page.waitForTimeout(300);
await page.locator("svg[data-plate]").screenshot({ path: join(ROOT, "preview", "poster-glycogen.png") });
console.log("  ↳ preview/poster-glycogen.png（挂图画布全幅 1980×980，已隐去右栏遮罩）");

check("无页面运行错误（含截图段）", errors.length === 0);
if (errors.length) console.log("页面错误：\n" + errors.join("\n"));

await browser.close();
console.log(`\n${failed ? "冒烟未通过" : "冒烟全部通过"}`);
process.exit(failed ? 1 : 0);
