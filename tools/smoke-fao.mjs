// β-氧化挂图冒烟（/pathway/fatty-acid-oxidation）
//
// 覆盖：
//   · 路由可达，画布 data-lanes 为四泳道（胞质 / 外膜 / 内模 / 基质），膜间腔文字在图上；
//   · 跨膜段只放机器（ACSL / CPT1 / CACT / CPT2），四个循环步全部落在基质（y>380）；
//   · 四步环：g[data-step-id] 恰好 4 个（fao-1..4），每段弧带步号；
//   · 回流弧不是第 5 步：独立 data-return-arc、线宽 0.9 / 透明度 0.55 / 虚线，文字明确；
//     并断言不存在 data-step-id="fao-5"；
//   · 出环箭头：data-exit-arc + TCA 接口投影节点（不重复画 TCA 本体）；
//   · 能量账推导：每轮 14.0、7×1.5=10.5、7×2.5=17.5、8×10=80、108−2=106，旧 129 只并列；
//   · 右栏证据等级（由 evidenceGrade.ts 推导）与「看这一步的结构对照 →」href；
//   · 点击语义：先判 .q-hide，再分别 closest([data-step-id]) / [data-prep-id] / [data-node-id]；
//   · 自测揭晓、?step= 还原、?organ= 器官差异（无差异的步如实写「本步无 X 差异」）；
//   · crumb 四向互通；1440 宽截图。
//
// 需先 `npm run build`，并让 preview 服务跑在 BASE_URL（默认 http://localhost:4173）。
import { mkdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright-core";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const BASE = process.env.BASE_URL ?? "http://localhost:4173";
const ROUTE = `${BASE}/pathway/fatty-acid-oxidation`;
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

// ===== 1) 路由 + 四泳道 =====
console.log("\n===== 1) 路由与四泳道 =====");
const resp = await page.goto(ROUTE, { waitUntil: "networkidle" });
check("路由 200", resp?.status() === 200);
const plate = page.locator("svg[data-lanes]");
check("挂图 svg 存在", (await plate.count()) === 1);
const lanes = (await plate.getAttribute("data-lanes")).split(",");
check(
  "data-lanes 为四泳道：胞质 → 外膜 → 内膜 → 基质",
  lanes.length === 4 &&
    lanes.join(",") === "cytosol,mito-outer-membrane,mito-inner-membrane,mito-matrix"
);
const plateText = await plate.evaluate((el) => el.textContent ?? "");
check("四条泳道标题都在图上（含膜间腔）", ["细胞质", "线粒体外膜", "线粒体内膜", "线粒体基质", "膜间腔"].every((t) => plateText.includes(t)));
// 2026-11-04 改写：FAO 主挂图由 PLATE 04 改为 PLATE 05（04 归 PPP，消除与结构页 SF-05 的自相矛盾）。
check("报头 PLATE 05", (await page.locator(".plate-no").innerText()).includes("PLATE 05"));

// ===== 2) 跨膜段只放机器；代谢反应全在基质 =====
console.log("\n===== 2) 跨膜机器与空间归属 =====");
const machines = await page
  .locator("svg g[data-node-id]")
  .evaluateAll((els) => els.map((e) => e.getAttribute("data-node-id")));
check("四台跨膜机器齐备（ACSL / CPT1 / CACT / CPT2）", ["acs", "cpt1", "cact", "cpt2"].every((m) => machines.includes(m)));
const machineY = await page
  .locator("svg g[data-node-id]")
  .evaluateAll((els) =>
    els
      .filter((e) => ["acs", "cpt1", "cact", "cpt2"].includes(e.getAttribute("data-node-id")))
      .map((e) => e.getBoundingClientRect().top)
  );
check("机器都画在膜带 / 转运带（y 在 220–380 之间）", await page.evaluate(() => {
  const svg = document.querySelector("svg[data-lanes]").getBoundingClientRect();
  const box = [...document.querySelectorAll("svg g[data-node-id]")].filter((e) =>
    ["acs", "cpt1", "cact", "cpt2"].includes(e.getAttribute("data-node-id"))
  );
  return box.every((b) => {
    const r = b.getBoundingClientRect();
    // 880 画布高度下，膜带 220–380 对应相对 25%–43.2%
    const rel = ((r.top - svg.top) / svg.height) * 880;
    return rel >= 220 && rel <= 380;
  });
}));
check("四步循环全部落在基质（y>380）", await page.evaluate(() => {
  const svg = document.querySelector("svg[data-lanes]").getBoundingClientRect();
  return [...document.querySelectorAll("svg g[data-step-id]")].every((g) => {
    const r = g.getBoundingClientRect();
    const rel = ((r.top - svg.top) / svg.height) * 880;
    return rel > 380;
  });
}));

// ===== 3) 四步环 =====
console.log("\n===== 3) 四步环 =====");
const cycleIds = await page
  .locator("svg g[data-step-id]")
  .evaluateAll((els) => els.map((e) => e.getAttribute("data-step-id")));
check("环内恰好 4 个 g[data-step-id]（1→4 步）", cycleIds.length === 4);
check("四个步骤 id 与数据层一致（fao-1..fao-4）", cycleIds.join(",") === "fao-1,fao-2,fao-3,fao-4");
check("不存在 fao-5（回流弧不得被当成第 5 步）", (await page.locator('svg [data-step-id="fao-5"]').count()) === 0);
check(
  "四段弧各带步号（1 / 2 / 3 / 4）",
  (await page.locator("svg g[data-step-id]").evaluateAll((els) =>
    els.every((e) => {
      const nums = [...e.querySelectorAll("text")].map((t) => (t.textContent ?? "").trim());
      return nums.includes(e.getAttribute("data-step-id").replace("fao-", ""));
    })
  )) === true
);
check("前置两段单独计数（data-prep-id ×2，不进四步环）", (await page.locator("svg g[data-prep-id]").count()) === 2);

// ===== 4) 回流弧不是第 5 步 =====
console.log("\n===== 4) 回流弧语义 =====");
const returnArc = page.locator("svg [data-return-arc]");
check("回流弧独立存在（data-return-arc ×1）", (await returnArc.count()) === 1);
const retPath = returnArc.locator("path").first();
const retStroke = await retPath.getAttribute("stroke-width");
const retDash = await retPath.getAttribute("stroke-dasharray");
const retGroupOpacity = await returnArc.getAttribute("opacity");
const mainStroke = await page.locator('svg g[data-step-id="fao-1"] path').first().getAttribute("stroke-width");
check(
  `回流弧线宽 ${retStroke} < 主链 ${mainStroke}、虚线、组透明度 ${retGroupOpacity}（主链为 1）`,
  Number(retStroke) < Number(mainStroke) && !!retDash && Number(retGroupOpacity) < 0.8
);
const retText = (await returnArc.evaluate((el) => el.textContent ?? "")).replace(/\s+/g, "");
check("弧上明写「第 5 轮 · 回到第 1 步（链已 −2C）」", retText.includes("第5轮") && retText.includes("回到第1步") && retText.includes("−2C"));
check("弧上再补一句「回流弧 ≠ 第 5 步」", retText.includes("回流弧≠第5步"));
check("图例锁死「回流弧 / 出环弧（低权重，不是新的一步）」", (await page.locator(".legend").innerText()).includes("不是新的一步"));
check("表 2 单独说明回流弧不是第 5 步", (await page.locator("[data-return-note]").innerText()).includes("回流弧"));
check(
  "表 2 明写四步环只有 4 个 g[data-step-id]",
  (await page.locator("[data-return-note]").innerText()).replace(/\s+/g, "").includes("只有4个")
);

// ===== 5) 出环箭头 + TCA 接口投影 =====
console.log("\n===== 5) 出环箭头 =====");
const exitArc = page.locator("svg [data-exit-arc]");
check("出环弧独立存在（data-exit-arc ×1）", (await exitArc.count()) === 1);
const exitText = (await exitArc.evaluate((el) => el.textContent ?? "")).replace(/\s+/g, "");
check("弧上写「乙酰-CoA 离环 → TCA」", exitText.includes("乙酰-CoA离环") && exitText.includes("TCA"));
check("出口指向乙酰-CoA 节点（弧终点落在 accoa 旁）", await page.evaluate(() => {
  const circle = document.querySelector('svg g[data-node-id="accoa"] circle');
  const d = document.querySelector("svg [data-exit-arc] path")?.getAttribute("d") ?? "";
  const pairs = [...d.matchAll(/(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/g)].map((m) => [Number(m[1]), Number(m[2])]);
  if (!circle || pairs.length === 0) return false;
  const [ex, ey] = pairs[pairs.length - 1];
  const cx = Number(circle.getAttribute("cx"));
  const cy = Number(circle.getAttribute("cy"));
  return Math.hypot(ex - cx, ey - cy) < 45;
}));
check("TCA 接口只画投影节点（data-tca-projection ×1）", (await page.locator("svg [data-tca-projection]").count()) === 1);
check("投影节点标「TCA 接口」且不重复画 TCA 本体", plateText.includes("TCA 接口") && !plateText.includes("柠檬酸合酶"));

// ===== 6) 能量账推导 =====
console.log("\n===== 6) 能量账 =====");
const ledger = page.locator("[data-ledger-derivation]");
const ledgerText = (await ledger.innerText()).replace(/\s+/g, " ");
check("净 ATP 大数字锚定 106", (await page.locator("[data-net-atp]").getAttribute("data-net-atp")) === "106");
check("每轮 14.0（1×1.5 + 1×2.5 + 1×10）", ledgerText.includes("14.0 ATP") && ledgerText.includes("1 FADH₂ ×1.5 + 1 NADH ×2.5 + 1 乙酰-CoA ×10"));
check("7 轮 FADH₂ → 10.5（7 × 1.5）", ledgerText.includes("10.5") && ledgerText.includes("7 × 1.5"));
check("7 轮 NADH → 17.5（7 × 2.5）", ledgerText.includes("17.5") && ledgerText.includes("7 × 2.5"));
check("8 乙酰-CoA → 80（8 × 10）", ledgerText.includes("80") && ledgerText.includes("8 × 10"));
check("毛收入 108、扣活化 2、净 106 三步都写出来", ledgerText.includes("108 ATP") && ledgerText.includes("−2") && ledgerText.includes("108 − 2 = 106"));
check("旧口径 129 只在脚注并列", (await page.locator("[data-legacy-note]").innerText()).replace(/\s+/g, "").includes("129"));
check("脚注明写旧值不参与加和", (await page.locator("[data-legacy-note]").innerText()).includes("不混用") || (await page.locator("[data-legacy-note]").innerText()).includes("不参与"));
check("七轮账本表在图上（C16 → C4，末轮 2 个乙酰-CoA）", (await page.locator("[data-round-table]").innerText()).includes("C16") && (await page.locator("[data-round-table]").innerText()).includes("末轮硫解 ×2"));
check("链长标尺存在", (await page.locator("svg [data-chain-ruler]").count()) === 1);
const plateLedger = (await page.locator("svg [data-plate-ledger]").evaluate((el) => el.textContent ?? "")).replace(/\s+/g, " ");
check("图上有独立能量账块，逐项列 8×10 / 7×1.5 / 7×2.5 → 106，不只给结果数", plateLedger.includes("8 乙酰-CoA × 10") && plateLedger.includes("7 FADH₂ × 1.5") && plateLedger.includes("7 NADH × 2.5") && plateLedger.includes("106 ATP") && plateLedger.includes("129"));

// ===== 7) 右栏：等级与结构入口 =====
console.log("\n===== 7) 右栏等级与结构入口 =====");
// data-grade 取值：A/B/C/D 为有实验坐标的最差侧；calc＝两侧全是计算构象（fao-3 唯一一块）
const EXPECT = { "fao-act": "D", "fao-shuttle": "D", "fao-1": "D", "fao-2": "A", "fao-3": "calc", "fao-4": "C" };
for (const [id, g] of Object.entries(EXPECT)) {
  await page.goto(`${ROUTE}?step=${id}`, { waitUntil: "domcontentloaded" });
  const gradeEl = page.locator('[data-testid="fao-grade"]');
  const grade = await gradeEl.getAttribute("data-grade");
  const href = await page.locator('[data-testid="fao-structure-cmp-entry"]').getAttribute("href");
  const aside = await page.locator("aside").innerText();
  check(
    `${id} 证据等级实测 ${grade}（期望 ${g}，由 evidenceGrade.ts 推导）`,
    grade === g
  );
  check(
    `${id} 右栏结构对照入口 href=/structures/fatty-acid-oxidation#${id}`,
    href === `/structures/fatty-acid-oxidation#${id}` && (await page.locator('[data-testid="fao-structure-cmp-entry"]').innerText()).includes("看这一步的结构对照")
  );
  check(`${id} 右栏含反应式 / 酶 / 辅因子 / 意义`, aside.includes("辅因子") && (aside.includes("EC") || aside.includes("EC ")) && aside.includes("底物"));
}
await page.goto(`${ROUTE}?step=fao-3`, { waitUntil: "domcontentloaded" });
check("fao-3（两侧都无实验坐标）显式标「计算构象（无实验坐标）」", (await page.locator('[data-testid="fao-grade"]').innerText()).includes("计算构象"));
check("右栏 3D 结合视图为灰字占位，不伪造酶结构", (await page.locator("aside [data-3d-placeholder]").count()) === 1);
check("穿梭步右栏带跨膜机器说明", await (async () => {
  await page.goto(`${ROUTE}?step=fao-shuttle`, { waitUntil: "domcontentloaded" });
  return (await page.locator("aside [data-transport-note]").count()) === 1;
})());

// ===== 8) 点击语义 =====
console.log("\n===== 8) 点击语义 =====");
await page.goto(ROUTE, { waitUntil: "domcontentloaded" });
await page.locator('svg g[data-step-id="fao-2"] text.q-hide').first().click();
check("点步骤标签 → URL step=fao-2", page.url().includes("step=fao-2"));
check("fao-2 唯一选中态", (await page.locator('svg .stepg.sel[data-step-id="fao-2"]').count()) === 1);
await page.locator('svg g[data-prep-id="fao-act"] text.q-hide').first().click();
check("点前置段标签 → 选中 fao-act（prep 组独立分支）", page.url().includes("step=fao-act") &&
  (await page.locator('svg .prepg.sel[data-prep-id="fao-act"]').count()) === 1);
check("前置段选中后右栏仍给结构入口", (await page.locator('[data-testid="fao-structure-cmp-entry"]').getAttribute("href")) === "/structures/fatty-acid-oxidation#fao-act");
await page.locator('svg g[data-node-id="enoyl"] text.q-hide').first().click();
check("点代谢物 enoyl → 选中其产出步 fao-1", page.url().includes("step=fao-1"));
await page.locator('svg g[data-node-id="cact"] text').first().click();
check("点跨膜机器 CACT → 选中穿梭步", page.url().includes("step=fao-shuttle"));
await page.locator('svg g[data-node-id="accoa"] text.q-hide').first().click();
check("点乙酰-CoA → 选中硫解步 fao-4", page.url().includes("step=fao-4"));

// ===== 9) 自测模式：揭晓而非选中 =====
console.log("\n===== 9) 自测模式 =====");
await page.goto(ROUTE, { waitUntil: "networkidle" });
await page.locator(".organ-switch .quiz-toggle").click();
check("自测开启：隐藏名数量充足", (await page.locator("svg .q-hide").count()) > 20);
await page.locator('svg g[data-step-id="fao-3"] text.q-hide').first().click();
check("点步骤名 → 揭晓而非选中", (await page.locator('svg g[data-step-id="fao-3"] text.q-hide.revealed').count()) === 1 &&
  (await page.locator("svg .stepg.sel").count()) === 0);
check("自测下 URL 不变（没有误触 step 参数）", !page.url().includes("step="));
await page.locator('svg g[data-node-id="keto"] text.q-hide').first().click();
check("点代谢物名 → 揭晓而非选中", (await page.locator('svg g[data-node-id="keto"] .q-hide.revealed').count()) > 0 &&
  (await page.locator("svg .stepg.sel").count()) === 0);

// ===== 10) ?step= / ?organ= 还原 =====
console.log("\n===== 10) URL 还原 =====");
await page.goto(`${ROUTE}?organ=red-blood-cell&step=fao-act`, { waitUntil: "networkidle" });
check("URL 还原：红细胞 tab 高亮", (await page.locator('[data-organ-tab="red-blood-cell"]').getAttribute("aria-selected")) === "true");
check("URL 还原：fao-act 选中", (await page.locator('svg .prepg.sel[data-prep-id="fao-act"]').count()) === 1);
check("红细胞视图给出该步差异（无线粒体）", (await page.locator("aside [data-organ-note]").innerText()).includes("红细胞") &&
  (await page.locator("aside [data-organ-note]").innerText()).includes("无线粒体"));
await page.goto(`${ROUTE}?organ=heart&step=fao-2`, { waitUntil: "networkidle" });
check("无该器官差异的步如实写「本步无 心肌 差异」，不编造", (await page.locator("aside [data-organ-note]").innerText()).includes("本步无") &&
  (await page.locator("aside [data-organ-note]").innerText()).includes("心肌"));
check("心肌 tab 高亮但该步无数据（器官视图不伪造）", (await page.locator('[data-organ-tab="heart"]').getAttribute("aria-selected")) === "true");

// ===== 11) crumb 四向互通 =====
console.log("\n===== 11) crumb 互通 =====");
await page.goto(ROUTE, { waitUntil: "domcontentloaded" });
const crumbHrefs = await page.locator("nav.crumb a").evaluateAll((els) => els.map((e) => e.getAttribute("href")));
check(
  "β-氧化 crumb 能回到糖酵解 / TCA / 糖异生 / PPP",
  ["/pathway/glycolysis", "/pathway/tca", "/pathway/gluconeogenesis", "/pathway/ppp"].every((h) => crumbHrefs.includes(h))
);
for (const p of ["/pathway/glycolysis", "/pathway/tca", "/pathway/gluconeogenesis", "/pathway/ppp"]) {
  await page.goto(`${BASE}${p}`, { waitUntil: "domcontentloaded" });
  check(`${p} crumb 含 β-氧化入口`, (await page.locator('nav.crumb a[href="/pathway/fatty-acid-oxidation"]').count()) === 1);
}

// ===== 12) 截图（1440 宽） =====
console.log("\n===== 12) 截图 =====");
await page.setViewportSize({ width: 1440, height: 1100 });
await page.goto(ROUTE, { waitUntil: "networkidle" });
await page.waitForTimeout(500);
await page.screenshot({ path: join(ROOT, "preview", "poster-fao-full.png"), fullPage: true });
console.log("  ↳ 截图 preview/poster-fao-full.png（整页 · 1440 宽，画布可横向漫游）");
// 循环区特写：横向滚到环与回流弧
await page.evaluate(() => {
  const el = document.querySelector(".plate-scroll");
  if (el) el.scrollLeft = 780;
});
await page.waitForTimeout(500);
await page.locator(".plate-scroll").screenshot({ path: join(ROOT, "preview", "poster-fao-cycle.png") });
console.log("  ↳ 截图 preview/poster-fao-cycle.png（循环区 + 回流弧 · 1440 宽）");
await page.evaluate(() => {
  const el = document.querySelector(".plate-scroll");
  if (el) el.scrollLeft = 0;
});
await page.waitForTimeout(300);
await page.locator("[data-ledger-derivation]").screenshot({ path: join(ROOT, "preview", "poster-fao-ledger.png") });
console.log("  ↳ 截图 preview/poster-fao-ledger.png（能量账推导）");

check("无页面运行错误（含截图段）", errors.length === 0);
if (errors.length) console.log("页面错误：\n" + errors.join("\n"));

await browser.close();
console.log(`\n${failed ? "冒烟未通过" : "冒烟全部通过"}`);
process.exit(failed ? 1 : 0);
