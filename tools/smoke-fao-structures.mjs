// β-氧化结构对照页冒烟（/structures/fatty-acid-oxidation）
//
// 覆盖：
//   · 六块齐全且顺序与数据层步骤一致（fao-act / fao-shuttle / fao-1..4）；
//   · 每块页脚「配体来源」首屏可见、不折叠，且覆盖该块每个入画分子；
//   · 证据分级字段齐全（PDB / 分辨率 / 方法 / 物种 / 链 / resname 或 RDKit 口径），
//     块级等级与页头计数一致（A1 B0 C1 D3 + 无实验等级 1，全部由 evidenceGrade.ts 推导）；
//   · 默认模式按规则：fao-3 默认 2D（ΔV −1.8% 但拓扑改变），其余默认 3D；?mode= 显式覆盖优先；
//   · 2D / 3D 切换后舞台内容真的换了（mol-3d / mol-2d 计数）；
//   · 分块 caveat 在每块首屏可见（「CoA 略」+ 完整分子式）；
//   · 深链 #fao-4 能滚到该块；返回挂图的 crumb 指向 /pathway/fatty-acid-oxidation；
//   · 1440 宽截图：某块（A 级）与 D 级块示例。
//
// 需先 `npm run build`，并让 preview 服务跑在 BASE_URL（默认 http://localhost:4173）。
import { mkdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright-core";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const BASE = process.env.BASE_URL ?? "http://localhost:4173";
const ROUTE = `${BASE}/structures/fatty-acid-oxidation`;
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
const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } });
const errors = [];
page.on("pageerror", (e) => errors.push(String(e)));
page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
mkdirSync(join(ROOT, "preview"), { recursive: true });

const resp = await page.goto(ROUTE, { waitUntil: "domcontentloaded" });
check("路由 200", resp?.status() === 200);
await page.waitForSelector(".cmp-block", { timeout: 30000 });
await page.waitForFunction(() => document.querySelectorAll(".cmp-block").length === 6, { timeout: 30000 });
await page.waitForFunction(
  () => [...document.querySelectorAll('[data-testid="ligand-source"]')].length >= 14,
  { timeout: 30000 }
);
await page.waitForTimeout(1200);

// ===== 1) 页头与六块 =====
console.log("\n===== 1) 页头与六块 =====");
check("标题为 β-氧化 · 结构对照", (await page.locator("h1").innerText()).includes("β-氧化") && (await page.locator("h1").innerText()).includes("结构对照"));
check("PLATE SF-05", (await page.locator(".plate-no").innerText()).includes("SF-05"));
const blockIds = await page.locator(".cmp-block").evaluateAll((els) => els.map((e) => e.id));
check(
  "六块齐全且顺序 = 数据层步骤",
  blockIds.join(",") === "fao-act,fao-shuttle,fao-1,fao-2,fao-3,fao-4"
);
check("返回挂图 crumb 指向 /pathway/fatty-acid-oxidation", (await page.locator('[data-testid="film-back"] a:not(.film-home)').getAttribute("href")) === "/pathway/fatty-acid-oxidation");
check("酶 3D 面板按配置关闭（酶资产未建，不伪造）", (await page.locator('[data-testid="enzyme-panel-off"]').count()) === 6);

// ===== 2) 证据分级：块级等级与页头计数一致 =====
console.log("\n===== 2) 证据分级 =====");
const stats = await page.locator('[data-testid="grade-stats"]').evaluate((el) => ({
  total: Number(el.getAttribute("data-total")),
  a: Number(el.getAttribute("data-a")),
  b: Number(el.getAttribute("data-b")),
  c: Number(el.getAttribute("data-c")),
  d: Number(el.getAttribute("data-d")),
  calc: Number(el.getAttribute("data-calc")),
  only2d: Number(el.getAttribute("data-2d")),
  none: Number(el.getAttribute("data-none-grade")),
  text: el.textContent ?? "",
}));
check("页头计数：6 块 / A1 B0 C1 D3 / 计算构象 5 块 / 仅2D 0 / 无实验等级 1", stats.total === 6 && stats.a === 1 && stats.b === 0 && stats.c === 1 && stats.d === 3 && stats.calc === 5 && stats.only2d === 0 && stats.none === 1);
check("页头文字与计数一致", stats.text.includes("A 1") && stats.text.includes("C 1") && stats.text.includes("D 3") && stats.text.includes("计算构象 5") && stats.text.includes("无实验等级 1"));
const EXPECT = { "fao-act": "D", "fao-shuttle": "D", "fao-1": "D", "fao-2": "A", "fao-3": "none", "fao-4": "C" };
const visibleGrades = await page.locator(".cmp-block").evaluateAll((els) =>
  els.map((e) => [e.id, e.getAttribute("data-grade"), e.querySelector('[data-testid="block-grade"]')?.textContent ?? ""])
);
for (const [id, grade, text] of visibleGrades) {
  const labelOk = grade === "none" ? text.includes("无实验等级") : text.includes(`等级 ${grade}`);
  check(`${id} 块级等级 ${grade}（期望 ${EXPECT[id]}）+ 标签文本「${text.trim()}」`, grade === EXPECT[id] && labelOk);
}
// 每一侧都有等级明细（A–D 或 计算构象 / 未分级），且字段由推导产生
const sideCount = await page.locator('[data-testid="block-grade-sides"]').count();
check("每块给两侧明细（底物 / 产物各自等级）", sideCount === 6);
// 两侧实验等级不一致时必须显式标注（fao-1 底物 D / 产物 A 是真实的不一致）
const mismatch = await page.locator('[data-testid="block-grade-mismatch"]').evaluateAll((els) =>
  els.map((e) => ({ parent: e.closest(".cmp-block")?.id, text: e.textContent ?? "" }))
);
check("两侧等级不一致的块恰好 1 个（fao-1：底物 D vs 产物 A）", mismatch.length === 1 && mismatch[0].parent === "fao-1");
check("不一致块显式标注「两侧等级不一致 · 块级取较低级」", mismatch[0]?.text.includes("两侧等级不一致") && mismatch[0]?.text.includes("取较低级"));
const ungraded = await page.locator('[data-testid="block-ungraded"]').count();
check("无「缺 evidence 字段」的未分级条目（每块每个分子都写了分级字段）", ungraded === 0);

// ===== 3) 证据字段齐全（每块每个分子的来源说明）=====
console.log("\n===== 3) 来源说明字段 =====");
const sources = await page.locator('[data-testid="ligand-source"]').evaluateAll((els) =>
  els.map((e) => ({ id: e.getAttribute("data-mol-id"), text: e.textContent ?? "", h: e.getBoundingClientRect().height }))
);
check("配体来源条目 14 条（每块每个入画分子各一条，含共享乙酰-CoA）", sources.length === 14);
check("每条来源首屏可见（高度 > 0，不在折叠里）", sources.every((s) => s.h > 0));
const experimental = sources.filter((s) => s.text.includes("PDB"));
check("实验坐标条目 6 条（酰基-CoA ×3 出现 + 烯酰 ×2 + 乙酰-CoA ×1）", experimental.length === 6 && experimental.every((s) =>
  /\bPDB\b/.test(s.text) && /Å/.test(s.text) && /(X-ray|冷冻电镜|NMR)/.test(s.text) && /链/.test(s.text) && /配体/.test(s.text)
));
check("实验条目写明物种（人 / 非人）", experimental.every((s) => /Homo sapiens|人源|人（|人 \w|大鼠|弧菌|Vibrio/.test(s.text)));
const computed = sources.filter((s) => s.text.includes("RDKit") || s.text.includes("ETKDG"));
check("计算构象条目 8 条（含共享的羟基 / 酮基各出现两次）", computed.length === 8 && computed.every((s) => /ETKDGv3/.test(s.text) && /MMFF94/.test(s.text)));
check("计算构象都标「自由态 · 不等于结合态」", computed.every((s) => s.text.includes("自由态") && s.text.includes("不等于") && s.text.includes("结合态")));
check("每条来源都写来源蛋白角色（不是裸 PDB 号）", sources.every((s) => /（|\(/.test(s.text) && s.text.length > 40));

// ===== 4) 分块 caveat =====
console.log("\n===== 4) 脂酰-CoA 分块口径 =====");
const caveats = await page.locator(".cmp-caveat").evaluateAll((els) => els.map((e) => e.textContent ?? ""));
check(".cmp-caveat 至少 6 条（酰基-CoA 系每块都写）", caveats.length >= 6);
check("每条 caveat 都写「分块呈现，不是完整分子」", caveats.filter((c) => c.includes("分块呈现")).length >= 6);
const c16 = caveats.find((c) => c.includes("棕榈酰-CoA")) ?? "";
check("棕榈酰-CoA 块写明 CoA 长链省略 + 完整分子式 C₃₇H₆₆N₇O₁₇P₃S", c16.includes("CoA 长链省略") && c16.includes("C₃₇H₆₆N₇O₁₇P₃S"));
check("棕榈酰-CoA 块标「CoA 略」而非留白", c16.includes("CoA 略"));
const c14 = caveats.find((c) => c.includes("肉豆蔻酰")) ?? "";
check("C14 块同样分块 + 完整分子式 C₃₅H₆₂N₇O₁₇P₃S", c14.includes("C₃₅H₆₂N₇O₁₇P₃S"));
const c2uxw = caveats.find((c) => c.includes("TH3")) ?? "";
check("烯酰-CoA 块注明 TH3 是截短的酰基-N-乙酰半胱胺硫酯（不是完整 CoA）", c2uxw.includes("截短") && c2uxw.includes("酰基-N-乙酰半胱胺硫酯"));

// ===== 5) 默认模式规则 =====
console.log("\n===== 5) 默认模式 =====");
const modes = await page.locator(".cmp-block").evaluateAll((els) =>
  els.map((e) => ({ id: e.id, mode: e.getAttribute("data-mode"), def: e.getAttribute("data-default-mode"), src: e.getAttribute("data-mode-source"), rule: e.querySelector('[data-testid="default-mode-rule"]')?.textContent ?? "" }))
);
for (const m of modes) {
  const expect = m.id === "fao-3" ? "2d" : "3d";
  check(`${m.id} 默认 ${m.mode}（数据规则 ${m.def}）`, m.mode === expect && m.def === expect);
}
check("默认由数据规则决定（data-mode-source=data，非 URL 覆盖）", modes.every((m) => m.src === "data"));
check("默认 2D 的块给出判据文字（含重原子与 ΔV）", (modes.find((m) => m.id === "fao-3")?.rule ?? "").includes("ΔV") && (modes.find((m) => m.id === "fao-3")?.rule ?? "").includes("重原子"));
check("fao-3 判据写明「拓扑改变 + ΔV ≤2.5% → 默认 2D」", (modes.find((m) => m.id === "fao-3")?.rule ?? "").includes("拓扑改变") && (modes.find((m) => m.id === "fao-3")?.rule ?? "").includes("≤2.5%"));
check("默认 2D 块带「默认 2D」标签", (await page.locator('#fao-3 [data-testid="default-mode-tag"]').innerText()).includes("默认 2D"));
check("默认 3D 的块不挂 2D 标签（判据只在该出现的地方出现）", (await page.locator(".cmp-block:not(#fao-3) [data-testid=\"default-mode-tag\"]").count()) === 0);

// ===== 6) 2D / 3D 切换 =====
console.log("\n===== 6) 2D / 3D 切换 =====");
const stages = async () =>
  page.evaluate(() => ({
    d3: document.querySelectorAll('[data-testid="mol-3d"]').length,
    d2: document.querySelectorAll('[data-testid="mol-2d"]').length,
    none: document.querySelectorAll('[data-testid="mol-3d-none"]').length,
  }));
const auto = await stages();
check("按规则模式：14 个分子舞台，3D×12 + 2D×2（fao-3 两侧都走 2D）", auto.d3 + auto.d2 === 14 && auto.d3 === 12 && auto.d2 === 2);
check("无「3D 未建」的空场（本通路 8 个分子全部有 3D）", auto.none === 0);
await page.locator('[data-testid="mode-3d"]').click();
await page.waitForTimeout(600);
const all3d = await stages();
check("切 3D：14 个分子全部 3D 球棍", all3d.d3 === 14 && all3d.d2 === 0);
check("切 3D 时 URL 带 mode=3d", page.url().includes("mode=3d"));
check("切 3D 后页头提示为「URL 显式覆盖」", (await page.locator('[data-testid="default-mode-note"]').innerText()).includes("URL 显式覆盖"));
await page.locator('[data-testid="mode-2d"]').click();
await page.waitForTimeout(600);
const all2d = await stages();
check("切 2D：14 个分子全部 2D 结构式", all2d.d2 === 14 && all2d.d3 === 0);
check("切 2D 后块级 data-mode 全部 2d", (await page.locator(".cmp-block").evaluateAll((els) => els.every((e) => e.getAttribute("data-mode") === "2d"))));
await page.locator('[data-testid="mode-auto"]').click();
await page.waitForTimeout(600);
check("回「按规则」：fao-3 恢复 2D、其余 3D", (await page.locator('#fao-3').getAttribute("data-mode")) === "2d" && (await page.locator("#fao-2").getAttribute("data-mode")) === "3d");

// ===== 7) 深链与返回 =====
console.log("\n===== 7) 深链 =====");
await page.goto(`${ROUTE}#fao-4`, { waitUntil: "networkidle" });
await page.waitForTimeout(900);
const deepTop = await page.locator("#fao-4").evaluate((el) => el.getBoundingClientRect().top);
check("#fao-4 深链滚到该块（块顶在视口内）", deepTop >= 0 && deepTop < 1200);
check("深链块 fao-4 等级仍为 C", (await page.locator("#fao-4").getAttribute("data-grade")) === "C");

// ===== 8) 截图 =====
console.log("\n===== 8) 截图 =====");
await page.goto(`${ROUTE}#fao-2`, { waitUntil: "networkidle" });
await page.waitForTimeout(1200);
await page.locator("#fao-2").screenshot({ path: join(ROOT, "preview", "cmp-fao-block-a.png") });
console.log("  ↳ 截图 preview/cmp-fao-block-a.png（A 级块 fao-2 · 1440 宽）");
await page.goto(`${ROUTE}#fao-act`, { waitUntil: "networkidle" });
await page.waitForTimeout(1200);
await page.locator("#fao-act").screenshot({ path: join(ROOT, "preview", "cmp-fao-block-d.png") });
console.log("  ↳ 截图 preview/cmp-fao-block-d.png（D 级块 fao-act · 1440 宽）");

check("无页面运行错误（含截图段）", errors.length === 0);
if (errors.length) console.log("页面错误：\n" + errors.join("\n"));

await browser.close();
console.log(`\n${failed ? "冒烟未通过" : "冒烟全部通过"}`);
process.exit(failed ? 1 : 0);
