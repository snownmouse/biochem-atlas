// ============================================================
// 证据分级冒烟（四条通路：糖酵解 / TCA / PPP / 糖异生）
//
// 覆盖：
//   · 40 块全部有结构化 evidence 字段；页面每块有等级标记与两侧等级行，无「未分级」；
//   · 等级只由 pocketRole + species + coordSource 推导：块级 = 两侧最差实验等级；
//   · 页头统计（总块数 + A/B/C/D + 计算构象 + 仅2D，含 0）与页面逐块计数一致；
//   · ?grade=A,C,calc,2d 可还原、勾选变化写回 URL、空勾选=不过滤；
//   · 筛选后「N 块被筛除（本页共 M 块）」与实际隐藏块数一致；
//   · 计算构象 / 仅2D 不被误标为 A–D（全计算块等级为 none，仅2D 只在覆盖标签）；
//   · 四通路 D 级块清单、底物/产物等级不一致（半好半坏）块清单逐条命中；
//   · 截图：糖酵解 A 级块、糖异生 D 级块、筛选生效状态。
//
// 需先 `npm run build`，并保证 preview 服务在 BASE_URL（默认 http://localhost:4173）运行。
import { mkdirSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright-core";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const BASE = process.env.BASE_URL ?? "http://localhost:4173";
let failed = false;
const check = (label, ok) => {
  console.log(`${ok ? "✓" : "✗"} ${label}`);
  if (!ok) failed = true;
};

// ---- 期望值（由结构化证据推导，硬编码在此作为回归基线）----
const RANK = { A: 0, B: 1, C: 2, D: 3 };
const SCENARIOS = [
  {
    id: "glycolysis",
    route: `${BASE}/structures/glycolysis`,
    blocks: 10,
    counts: { A: 3, B: 1, C: 3, D: 2 },
    calc: 5,
    twoD: 0,
    noneGrade: 1,
    dBlocks: ["gk-3", "gk-4"],
    mismatch: ["gk-2", "gk-3", "gk-4"],
    allCalcBlocks: ["gk-6"],
    twoDBlocks: [],
  },
  {
    id: "tca",
    route: `${BASE}/structures/tca`,
    blocks: 9,
    counts: { A: 1, B: 1, C: 4, D: 3 },
    calc: 1,
    twoD: 0,
    noneGrade: 0,
    dBlocks: ["tca-2", "tca-5", "tca-6"],
    mismatch: ["tca-2", "tca-3", "tca-4", "tca-5", "tca-6", "tca-7", "tca-8"],
    allCalcBlocks: [],
    twoDBlocks: [],
  },
  {
    id: "ppp",
    route: `${BASE}/structures/ppp`,
    blocks: 8,
    counts: { A: 2, B: 1, C: 1, D: 4 },
    calc: 6,
    twoD: 1,
    noneGrade: 0,
    dBlocks: ["ppp-n1", "ppp-n3", "ppp-n4", "ppp-n5"],
    mismatch: ["ppp-o3", "ppp-n5"],
    allCalcBlocks: [],
    twoDBlocks: ["ppp-o3"],
  },
  {
    id: "gluconeogenesis",
    route: `${BASE}/structures/gluconeogenesis`,
    blocks: 13,
    counts: { A: 2, B: 2, C: 7, D: 1 },
    calc: 5,
    twoD: 1,
    noneGrade: 1,
    dBlocks: ["gn-8"],
    mismatch: ["gn-8", "gn-9", "gn-10"],
    allCalcBlocks: ["gn-6"],
    twoDBlocks: ["gn-1"],
  },
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
const page = await browser.newPage({ viewport: { width: 1440, height: 960 } });
const errors = [];
const badResponses = [];
page.on("pageerror", (e) => errors.push(String(e)));
page.on("response", (r) => {
  if (r.url().startsWith(BASE) && r.status() >= 400) badResponses.push(`${r.status()} ${r.url()}`);
});
page.on("requestfailed", (r) => {
  if (r.url().startsWith(BASE)) badResponses.push(`FAILED ${r.url()}`);
});
mkdirSync(join(ROOT, "preview"), { recursive: true });

const settle = async (n) => {
  await page.waitForFunction((count) => document.querySelectorAll(".cmp-block").length === count, n, {
    timeout: 30000,
  });
  await page.waitForFunction(
    () =>
      document.querySelectorAll('[data-testid="mol-3d"][data-mol-id="loading"]').length === 0 &&
      document.querySelectorAll('[data-testid="mol-2d"] .cmp-load').length === 0,
    { timeout: 30000 }
  );
};

/** 读取当前页所有块的证据状态（含被筛除块，hidden 单独标记） */
const readBlocks = () =>
  page.locator(".cmp-block").evaluateAll((els) =>
    els.map((e) => {
      const sidesEl = e.querySelector('[data-testid="block-grade-sides"]');
      return {
        id: e.getAttribute("data-step-id"),
        grade: e.getAttribute("data-grade"),
        calc: e.getAttribute("data-grade-calc") === "1",
        twoD: e.getAttribute("data-grade-2d") === "1",
        sub: sidesEl?.getAttribute("data-sub") ?? null,
        prod: sidesEl?.getAttribute("data-prod") ?? null,
        differ: sidesEl?.getAttribute("data-differ") === "1",
        hidden: e.hasAttribute("hidden"),
        badge: e.querySelector('[data-testid="block-grade"]')?.textContent?.trim() ?? "",
        coverageCalc: e.querySelectorAll('[data-testid="block-coverage-calc"]').length,
        coverage2d: e.querySelectorAll('[data-testid="block-coverage-2d"]').length,
        ungraded: e.querySelectorAll('[data-testid="block-ungraded"]').length,
        mismatchMark: e.querySelectorAll('[data-testid="block-grade-mismatch"]').length,
        sides: e.querySelectorAll('[data-testid="block-grade-sides"]').length,
        sidesText: sidesEl?.textContent?.replace(/\s+/g, " ").trim() ?? "",
      };
    })
  );

const statsOf = () =>
  page.locator('[data-testid="grade-stats"]').evaluate((e) => ({
    total: Number(e.getAttribute("data-total")),
    A: Number(e.getAttribute("data-a")),
    B: Number(e.getAttribute("data-b")),
    C: Number(e.getAttribute("data-c")),
    D: Number(e.getAttribute("data-d")),
    calc: Number(e.getAttribute("data-calc")),
    twoD: Number(e.getAttribute("data-2d")),
    noneGrade: Number(e.getAttribute("data-none-grade")),
    text: e.textContent ?? "",
  }));

const filterState = () =>
  page.evaluate(() =>
    ["A", "B", "C", "D", "calc", "2d"].map((t) => ({
      t,
      checked: document.querySelector(`[data-testid="grade-filter-${t}"]`)?.checked ?? false,
    }))
  );

// 数据面：源文件全部块都写了 evidence
// 2026-11 改动：β-氧化接入后配置从 40 块增至 46 块（glycolysis 10 + tca 9 + ppp 8 +
// gluconeogenesis 13 + fatty-acid-oxidation 6）；脂肪酸从头合成接入后再增至 52 块（+ FAS 6 块）；
// 尿素循环接入后再增至 57 块（+ 尿素 5 块）；糖原代谢接入后再增至 63 块（+ 糖原 6 块），
// 断言随之调整；语义不变——仍是「每块都有结构化 evidence」。
const cfgSrc = readFileSync(join(ROOT, "src", "data", "comparisonConfig.ts"), "utf8");
const stepCount = [...cfgSrc.matchAll(/^    stepId: "/gm)].length;
const evidenceCount = [...cfgSrc.matchAll(/^    evidence: {/gm)].length;
check(`配置源共 ${stepCount} 块，${evidenceCount} 块有结构化 evidence 字段`, stepCount === 63 && evidenceCount === 63);
check(
  "配置里没有手写 A/B/C/D 等级字段（等级只由 evidenceGrade.ts 推导）",
  !/^    grade: "[ABCD]",/m.test(cfgSrc)
);

for (const spec of SCENARIOS) {
  console.log(`\n===== ${spec.id} =====`);
  await page.goto(spec.route, { waitUntil: "domcontentloaded" });
  await settle(spec.blocks);
  const blocks = await readBlocks();

  // ===== 1) 每块都有等级标记与两侧等级行；字段完整 =====
  check(
    `${spec.blocks} 块每块都有等级标记与两侧等级行`,
    blocks.length === spec.blocks && blocks.every((b) => b.badge && b.sides === 1)
  );
  check(
    "没有任何「未分级」块（字段完整可判定）",
    blocks.every((b) => b.ungraded === 0)
  );
  check(
    "等级标记只在 A/B/C/D/none 取值",
    blocks.every((b) => ["A", "B", "C", "D", "none"].includes(b.grade))
  );

  // ===== 2) 块级等级 = 两侧最差实验等级 =====
  const worstMismatch = blocks.filter((b) => {
    const ranks = [b.sub, b.prod].filter((g) => g !== "none").map((g) => RANK[g]);
    const expected = ranks.length ? Object.keys(RANK).find((k) => RANK[k] === Math.max(...ranks)) : "none";
    return b.grade !== expected;
  });
  check(
    `块级等级全部等于两侧最差实验等级（异常 ${worstMismatch.length} 块）`,
    worstMismatch.length === 0
  );
  if (worstMismatch.length) console.log("  异常：", worstMismatch.map((b) => `${b.id} ${b.sub}/${b.prod}→${b.grade}`).join("；"));

  // ===== 3) 页头统计与逐块计数一致 =====
  const stats = await statsOf();
  const c = { A: 0, B: 0, C: 0, D: 0, calc: 0, twoD: 0, noneGrade: 0 };
  for (const b of blocks) {
    if (b.grade === "none") c.noneGrade++;
    else c[b.grade]++;
    if (b.calc) c.calc++;
    if (b.twoD) c.twoD++;
  }
  check(
    `页头统计与页面逐块计数一致（${stats.total} 块 · A${stats.A} B${stats.B} C${stats.C} D${stats.D} · 计算${stats.calc} · 仅2D${stats.twoD}）`,
    stats.total === spec.blocks &&
      stats.A === c.A && stats.B === c.B && stats.C === c.C && stats.D === c.D &&
      stats.calc === c.calc && stats.twoD === c.twoD && stats.noneGrade === c.noneGrade
  );
  check(
    "统计与回归基线一致",
    stats.A === spec.counts.A && stats.B === spec.counts.B && stats.C === spec.counts.C &&
      stats.D === spec.counts.D && stats.calc === spec.calc && stats.twoD === spec.twoD &&
      stats.noneGrade === spec.noneGrade
  );
  check(
    "A/B/C/D 与「仅2D」即使为 0 也显示在页头文案里",
    stats.text.includes("A") && stats.text.includes("B") && stats.text.includes("C") &&
      stats.text.includes("D") && stats.text.includes(`仅2D ${spec.twoD}`)
  );

  // ===== 4) D 级块清单 =====
  const dIds = blocks.filter((b) => b.grade === "D").map((b) => b.id);
  check(
    `D 级块逐条命中（${spec.dBlocks.join(" / ")}）`,
    JSON.stringify(dIds) === JSON.stringify(spec.dBlocks) &&
      blocks.filter((b) => b.grade === "D").every((b) => b.badge === "等级 D")
  );

  // ===== 5) 半好半坏：两侧实验等级不同 =====
  const differIds = blocks.filter((b) => b.differ).map((b) => b.id);
  check(
    `底物/产物等级不一致块逐条命中（${spec.mismatch.join(" / ")}）`,
    JSON.stringify(differIds) === JSON.stringify(spec.mismatch) &&
      blocks.filter((b) => b.differ).every((b) => b.mismatchMark === 1)
  );
  check(
    "两侧等级行各自写明底物/产物等级，不只给块级一个数",
    blocks.every((b) => b.sidesText.includes("底物") && b.sidesText.includes("产物"))
  );

  // ===== 6) 计算构象 / 仅2D 不混入 A–D =====
  check(
    "全计算块等级为 none，且带「计算构象」覆盖标签（不冒充 A–D）",
    spec.allCalcBlocks.every((id) => {
      const b = blocks.find((x) => x.id === id);
      return b && b.grade === "none" && b.calc && b.coverageCalc === 1;
    })
  );
  check(
    "仅2D 块只作覆盖标签，不被标成 A–D",
    spec.twoDBlocks.every((id) => {
      const b = blocks.find((x) => x.id === id);
      return b && b.twoD && b.coverage2d === 1;
    })
  );
  check(
    "两侧都没有实验坐标的块，等级必须是 none",
    blocks.filter((b) => b.sub === "none" && b.prod === "none").every((b) => b.grade === "none")
  );
  check(
    "计算构象覆盖计数 = 含计算构象的块数；仅2D 同理",
    blocks.filter((b) => b.calc).length === stats.calc && blocks.filter((b) => b.twoD).length === stats.twoD
  );

  // ===== 7) 无筛选时全部可见，且无筛除提示 =====
  check(
    "默认无筛选：全部块可见、无筛除提示、勾选全空",
    blocks.every((b) => !b.hidden) &&
      (await page.locator('[data-testid="grade-filtered"]').count()) === 0 &&
      (await filterState()).every((s) => !s.checked)
  );
}

// ===== 8) 筛选：URL 还原、块数、提示 =====
console.log("\n===== 筛选 =====");
const filterCase = async (route, gradeParam, expectedVisible, expectedHidden, blocks) => {
  await page.goto(`${route}?grade=${gradeParam}`, { waitUntil: "domcontentloaded" });
  await settle(blocks);
  const rows = await readBlocks();
  const visible = rows.filter((r) => !r.hidden);
  const notice = page.locator('[data-testid="grade-filtered"]');
  const noticeText = (await notice.count()) ? (await notice.innerText()).trim() : "";
  const url = new URL(page.url());
  check(
    `?grade=${gradeParam} 还原：可见 ${expectedVisible} 块、筛除 ${expectedHidden} 块`,
    url.searchParams.get("grade") === gradeParam &&
      visible.length === expectedVisible && rows.length - visible.length === expectedHidden
  );
  check(
    `筛除提示「${expectedHidden} 块被筛除（本页共 ${rows.length} 块）」与实际一致`,
    expectedHidden > 0
      ? (await notice.count()) === 1 &&
          noticeText === `${expectedHidden} 块被筛除（本页共 ${rows.length} 块）` &&
          Number(await notice.getAttribute("data-hidden")) === expectedHidden &&
          Number(await notice.getAttribute("data-total")) === rows.length
      : (await notice.count()) === 0
  );
  const expectedChecked = gradeParam.split(",");
  const fs = await filterState();
  check(
    `勾选状态与 URL 一致（${expectedChecked.join(",")}）`,
    fs.every((s) => s.checked === expectedChecked.includes(s.t))
  );
  return visible.map((v) => v.id);
};

const gnD = await filterCase(`${BASE}/structures/gluconeogenesis`, "D", 1, 12, 13);
check("糖异生 ?grade=D 只留 gn-8", JSON.stringify(gnD) === JSON.stringify(["gn-8"]));
const pppAC = await filterCase(`${BASE}/structures/ppp`, "A,C", 3, 5, 8);
check("PPP ?grade=A,C 只留 A 与 C 级块（3 块）", pppAC.length === 3 && pppAC.includes("ppp-o3"));
const gkCalc = await filterCase(`${BASE}/structures/glycolysis`, "calc", 5, 5, 10);
check("糖酵解 ?grade=calc 含全计算块 gk-6", gkCalc.includes("gk-6") && gkCalc.length === 5);
const gkAcalc = await filterCase(`${BASE}/structures/glycolysis`, "A,calc", 7, 3, 10);
check("覆盖标签与等级是「或」：?grade=A,calc = A 级 3 ∪ 计算 5 = 7 块", gkAcalc.length === 7);
const tca2d = await filterCase(`${BASE}/structures/tca`, "2d", 0, 9, 9);
check("TCA ?grade=2d 无可显示块（0 可见、9 筛除），提示仍显式", tca2d.length === 0);

// ===== 9) 勾选写回 URL + 刷新还原 =====
await page.goto(`${BASE}/structures/glycolysis`, { waitUntil: "domcontentloaded" });
await settle(10);
check("初始 URL 无 grade 参数", !new URL(page.url()).searchParams.has("grade"));
await page.locator('[data-testid="grade-filter-A"]').click();
await page.waitForFunction(() => new URL(location.href).searchParams.get("grade") === "A", { timeout: 5000 });
const afterA = (await readBlocks()).filter((b) => !b.hidden);
check("勾选 A 写回 URL ?grade=A，可见 3 块", afterA.length === 3);

await page.locator('[data-testid="grade-filter-C"]').click();
await page.waitForFunction(() => new URL(location.href).searchParams.get("grade") === "A,C", { timeout: 5000 });
check("再勾 C：URL 顺序稳定为 ?grade=A,C，可见 6 块", (await readBlocks()).filter((b) => !b.hidden).length === 6);

await page.reload({ waitUntil: "domcontentloaded" });
await settle(10);
const reloaded = (await readBlocks()).filter((b) => !b.hidden);
const reloadedState = await filterState();
check(
  "刷新后 URL 与勾选、可见块全部还原",
  new URL(page.url()).searchParams.get("grade") === "A,C" &&
    reloaded.length === 6 &&
    reloadedState.filter((s) => s.checked).map((s) => s.t).join(",") === "A,C"
);

await page.locator('[data-testid="grade-filter-A"]').click();
await page.locator('[data-testid="grade-filter-C"]').click();
await page.waitForFunction(() => new URL(location.href).searchParams.get("grade") === null, { timeout: 5000 });
check("取消全部勾选：URL 清空参数、10 块全部恢复", (await readBlocks()).every((b) => !b.hidden));

// ===== 10) 截图 =====
const shot = async (url, id, file, blockCount) => {
  await page.goto(url, { waitUntil: "domcontentloaded" });
  await settle(blockCount);
  await page.waitForTimeout(900);
  await page.setViewportSize({ width: 1440, height: 1280 });
  if (id) {
    const top = await page.evaluate((sid) => {
      const el = document.getElementById(sid);
      return el ? el.getBoundingClientRect().top + window.scrollY : 0;
    }, id);
    await page.evaluate((y) => window.scrollTo(0, Math.max(0, y - 12)), top);
  } else {
    await page.evaluate(() => window.scrollTo(0, 0));
  }
  await page.waitForTimeout(700);
  await page.screenshot({ path: join(ROOT, "preview", file) });
  console.log(`  ↳ 截图 preview/${file}`);
};

await page.setViewportSize({ width: 1440, height: 960 });
await shot(`${BASE}/structures/glycolysis?mode=3d`, "gk-1", "cmp-grade-a.png", 10);
await shot(`${BASE}/structures/gluconeogenesis?mode=3d`, "gn-8", "cmp-grade-d.png", 13);
await shot(`${BASE}/structures/gluconeogenesis?grade=D`, null, "cmp-grade-filter.png", 13);

check("无页面运行错误", errors.length === 0);
if (errors.length) console.log("页面错误：\n" + errors.join("\n"));
check("无 404 / 请求失败", badResponses.length === 0);
if (badResponses.length) console.log("坏请求：\n" + badResponses.join("\n"));

await browser.close();
console.log(`\n${failed ? "冒烟未通过" : "冒烟全部通过"}`);
process.exit(failed ? 1 : 0);
