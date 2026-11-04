// ============================================================
// PPP / 糖异生 结构对照页冒烟（/structures/ppp、/structures/gluconeogenesis）
//
// 覆盖：
//   · 两页块数 8 / 13，步骤顺序与配置一致；两页都没有酶 3D 面板，每块只有配置给出的灰字声明；
//   · 默认模式按数据判据：ppp-n1 / ppp-n3 / ppp-n4 / ppp-n5 与 gn-4 / gn-7 / gn-10 / gn-ala
//     共 8 块默认 2D，其余默认 3D；?mode=2d|3d 显式覆盖优先级更高；
//     【因电离态统一改写】磷酸单酯按二价阴离子补氢后体积变化，触发两处默认模式翻转：
//       ppp-o1 2D→3D（−1.90%→−3.13%，越过 2.5% 阈值，配置显式 defaultMode:"3d"）；
//       ppp-n5 3D→2D（−2.81%→−1.35%，回到阈值内，配置显式 defaultMode:"2d"）。
//     因此 PPP 的 data-mode-source=data 计数为「默认 2D 块数 + 1」（ppp-o1 也显式写在配置里）。
//   · 每块首屏都有「配体来源」说明（不折叠、实际可见）：PPP 23 条 / 糖异生 30 条；
//   · CO₂ / HCO₃⁻ 只做 2D：3D 模式显示「3D 未建」原因，不塞假球、不请求 3D 画布；
//   · 2D 切换后两页全部卡片都有结构式、字号可读、版式不重排；显式 3D 后卡片数与资产一致；
//   · 无空块、无 404 / 请求失败；未知 pathwayId 仍走说明页并列出已接入通路；
//   · 糖异生挂图右栏入口：13 块指向 /structures/gluconeogenesis#<stepId>，两个转运步给灰字；
//   · PPP 暂无挂图入口，只验证 /structures/ppp 可直达且页脚如实写明缺口。
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

// 期望值直接从配置源解析，避免断言与页面漂移
const cfgSrc = readFileSync(join(ROOT, "src", "data", "comparisonConfig.ts"), "utf8");
const pppPart = cfgSrc.slice(cfgSrc.indexOf("const PPP_COMPARISON"), cfgSrc.indexOf("const GLUCONEOGENESIS_COMPARISON"));
const gnPart = cfgSrc.slice(cfgSrc.indexOf("const GLUCONEOGENESIS_COMPARISON"), cfgSrc.indexOf("const PPP_CONFIG"));
const PPP_IDS = [...pppPart.matchAll(/stepId: "(ppp-[a-z0-9-]+)"/g)].map((m) => m[1]);
const GN_IDS = [...gnPart.matchAll(/stepId: "(gn-[a-z0-9-]+)"/g)].map((m) => m[1]);

const PPP = {
  route: `${BASE}/structures/ppp`,
  ids: PPP_IDS,
  blocks: 8,
  cards: 23, // 2+2+3+2+2+4+4+4（CO₂ 也是卡片）
  default2d: ["ppp-n1", "ppp-n3", "ppp-n4", "ppp-n5"],
  rules: { "ppp-n1": "+0.00%", "ppp-n3": "-1.86%", "ppp-n4": "+0.15%", "ppp-n5": "-1.35%" },
  // ppp-o1 显式 defaultMode:"3d"（翻转记录），故 data 来源块 = 4 个默认 2D + 1
  dataCount: 5,
  sources: 23,
  auto3d: 8,
  autoNone: 1,
  auto2d: 14,
  forced3d: 22,
  noneId: "co2",
  noneText: "3 个原子",
};
const GN = {
  route: `${BASE}/structures/gluconeogenesis`,
  ids: GN_IDS,
  blocks: 13,
  cards: 30, // 3+2+2+2+2+2+2+3+2+2+2+2+4
  default2d: ["gn-4", "gn-7", "gn-10", "gn-ala"],
  // 【因电离态统一改写】补氢后体积：gn-4 +0.16%、gn-7 +0.00%、gn-ala +0.25%（均仍 ≤2.5%）
  rules: { "gn-4": "+0.16%", "gn-7": "+0.00%", "gn-10": "-0.99%", "gn-ala": "+0.25%" },
  dataCount: 4,
  sources: 30,
  auto3d: 19,
  autoNone: 1,
  auto2d: 10,
  forced3d: 29,
  noneId: "hco3",
  noneText: "4 个原子",
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
const badResponses = [];
page.on("pageerror", (e) => errors.push(String(e)));
page.on("response", (r) => {
  if (r.url().startsWith(BASE) && r.status() >= 400) badResponses.push(`${r.status()} ${r.url()}`);
});
page.on("requestfailed", (r) => {
  if (r.url().startsWith(BASE)) badResponses.push(`FAILED ${r.url()}`);
});
mkdirSync(join(ROOT, "preview"), { recursive: true });

const settle = async (spec, mode = "auto") => {
  await page.waitForFunction((n) => document.querySelectorAll(".cmp-block").length === n, spec.blocks, { timeout: 30000 });
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

const cardCount = async () => ({
  d3: await page.locator('[data-testid="mol-3d"]').count(),
  none: await page.locator('[data-testid="mol-3d-none"]').count(),
  d2: await page.locator('[data-testid="mol-2d"]').count(),
});

for (const spec of [PPP, GN]) {
  console.log(`\n===== ${spec.route} =====`);
  // ===== 1) 页面形态：块数、顺序、酶面板灰字 =====
  await page.goto(spec.route, { waitUntil: "domcontentloaded" });
  await settle(spec);
  check(
    `页面标题为「${spec === PPP ? "磷酸戊糖途径" : "糖异生"} · 结构对照」`,
    (await page.locator("h1").innerText()).includes("结构对照")
  );
  check(`块数 ${spec.blocks}，顺序与配置一致`, (await page.locator(".cmp-block").count()) === spec.blocks &&
    JSON.stringify(await page.locator(".cmp-block").evaluateAll((els) => els.map((e) => e.getAttribute("data-step-id")))) ===
      JSON.stringify(spec.ids));
  check("没有任何酶 3D 面板（不伪造酶结构）", (await page.locator('[data-testid="enzyme-3d"]').count()) === 0);
  const offTexts = await page.locator('[data-testid="enzyme-panel-off"]').allInnerTexts();
  check(
    "每块都有配置给出的酶位灰字声明（文案来自配置）",
    offTexts.length === spec.blocks &&
      offTexts.every((t) => t.trim() === "本通路酶 3D 结构资产未建立 · 本轮只做分子对照")
  );
  check("每块都有「这一步改了什么」与生理意义", (await page.locator('[data-testid="change-line"]').count()) === spec.blocks &&
    (await page.locator(".cmp-phys").count()) === spec.blocks);

  // ===== 2) 默认模式按规则 =====
  const counts = await cardCount();
  check("默认按规则：URL 不带 mode、页头 data-mode=auto", !page.url().includes("mode=") &&
    (await page.locator('[data-page="comparison"]').getAttribute("data-mode")) === "auto");
  check(
    `默认按规则：${spec.auto3d} 个 3D + ${spec.autoNone} 个「3D 未建」+ ${spec.auto2d} 个 2D`,
    counts.d3 === spec.auto3d && counts.none === spec.autoNone && counts.d2 === spec.auto2d
  );
  const defaultIds = await page.locator('.cmp-block[data-default-mode="2d"]').evaluateAll((els) =>
    els.map((e) => e.getAttribute("data-step-id"))
  );
  check(
    `只有 ${spec.default2d.join(" / ")} 默认 2D，且块内 data-mode=2d`,
    JSON.stringify(defaultIds) === JSON.stringify(spec.default2d) &&
      (await page.locator('.cmp-block[data-mode="2d"]').evaluateAll((els) => els.map((e) => e.getAttribute("data-step-id"))))
        .join(",") === spec.default2d.join(",")
  );
  check("默认 2D 块逐块写明数据判据", (await page.locator('[data-testid="default-mode-rule"]').count()) === spec.default2d.length);
  let ruleMiss = [];
  for (const [id, delta] of Object.entries(spec.rules)) {
    const text = (await page.locator(`#${id} [data-testid="default-mode-rule"]`).innerText()).replace(/−/g, "-");
    if (!text.includes(delta) || !text.includes("拓扑改变")) ruleMiss.push(`${id}: 缺 ${delta}`);
  }
  check(`默认 2D 判据数字与规则逐块命中（缺 ${ruleMiss.length}）`, ruleMiss.length === 0);
  const srcModes = await page.locator(".cmp-block").evaluateAll((els) =>
    els.map((e) => [e.getAttribute("data-step-id"), e.getAttribute("data-mode-source")])
  );
  check(
    `data-mode-source：${spec.dataCount} 块 data、${spec.blocks - spec.dataCount} 块 fallback`,
    srcModes.filter(([, s]) => s === "data").length === spec.dataCount &&
      srcModes.filter(([, s]) => s === "fallback").length === spec.blocks - spec.dataCount
  );

  // ===== 3) 首屏配体来源 =====
  check("每块都有首屏「配体来源」面板（不折叠）", (await page.locator('[data-testid="ligand-sources"]').count()) === spec.blocks);
  check(
    `来源说明 ${spec.sources} 条，全部不在 details 内且实际可见`,
    (await page.locator('[data-testid="ligand-source"]').count()) === spec.sources &&
      (await page.locator('[data-testid="ligand-source"]').evaluateAll((els) =>
        els.every((e) => !e.closest("details") && e.getBoundingClientRect().height > 0)
      )) === true
  );
  const srcTexts = await page.locator('[data-testid="ligand-source"]').allInnerTexts();
  check(
    "每条来源说明都写清「取自/无实验」与分辨率口径",
    srcTexts.every((t) => (t.includes("取自") && t.includes("Å")) || t.includes("无实验配体坐标"))
  );

  // ===== 4) 3D 显式：分子卡数与 CO₂/HCO₃⁻ 的「不建 3D」 =====
  await page.locator('[data-testid="mode-3d"]').click();
  await page.waitForFunction((n) => document.querySelectorAll('[data-testid="mol-3d"]').length === n, spec.forced3d, {
    timeout: 30000,
  });
  const c3 = await cardCount();
  check(
    `?mode=3d 显式覆盖：${spec.forced3d} 个 3D + ${spec.autoNone} 个「3D 未建」`,
    c3.d3 === spec.forced3d && c3.none === spec.autoNone && c3.d2 === 0
  );
  check(
    "显式 3D 时所有默认 2D 块也被强制 3D（data-mode-source=url）",
    (await page.locator('.cmp-block[data-mode-source="url"]').count()) === spec.blocks
  );
  const noneCard = page.locator(`[data-testid="mol-3d-none"][data-mol-id="${spec.noneId}"]`);
  check(
    `${spec.noneId} 只在 3D 卡里显示原因（${spec.noneText}），没有假球/画布`,
    (await noneCard.count()) === 1 &&
      (await noneCard.innerText()).includes(spec.noneText) &&
      (await noneCard.locator("canvas").count()) === 0
  );
  const prov = await page.evaluate(() => ({
    exp: document.querySelectorAll(".mol3d-prov.experimental").length,
    calc: document.querySelectorAll(".mol3d-prov.computed").length,
  }));
  check("来源标签同时存在实验坐标与计算构象，两类不混标", prov.exp > 0 && prov.calc > 0);
  check(
    "计算构象写明「自由态，不等于结合态」，实验坐标写明 PDB 与 Å",
    (await page.locator(".mol3d-prov.computed").first().innerText()).includes("自由态，不等于结合态") &&
      (await page.locator(".mol3d-prov.experimental").first().innerText()).includes("PDB") &&
      (await page.locator(".mol3d-prov.experimental").first().innerText()).includes("Å")
  );

  // ===== 5) 2D 显式：全部卡片都有结构式、字号可读、版式不重排 =====
  const rects3d = await page.evaluate(() =>
    [...document.querySelectorAll(".cmp3d-side")].map((e) => {
      const r = e.getBoundingClientRect();
      return [Math.round(r.x), Math.round(r.y), Math.round(r.width), Math.round(r.height)];
    })
  );
  await page.locator('[data-testid="mode-2d"]').click();
  await page.waitForFunction((n) => document.querySelectorAll('[data-testid="mol-2d"]').length === n, spec.cards, {
    timeout: 30000,
  });
  const c2 = await cardCount();
  check(`?mode=2d：${spec.cards} 个结构式，3D 归零`, c2.d2 === spec.cards && c2.d3 === 0 && c2.none === 0);
  check("2D 模式没有「缺 2D 结构式」/加载中残留", (await page.locator('[data-testid="missing-2d"]').count()) === 0 &&
    (await page.locator(".mol2d-stage .cmp-load").count()) === 0);
  check("所有结构式都画出键线（非空占位）", await page.evaluate(() =>
    [...document.querySelectorAll(".mol2d-svg")].every((s) => s.querySelectorAll("line, polygon").length > 0)
  ));
  check("2D 字号可读（所有 SVG 文本 computed font-size ≥ 9px）", await page.evaluate(() => {
    const texts = [...document.querySelectorAll(".mol2d-svg text")];
    return texts.length > 0 && texts.every((t) => parseFloat(getComputedStyle(t).fontSize) >= 9);
  }));
  const rects2d = await page.evaluate(() =>
    [...document.querySelectorAll(".cmp3d-side")].map((e) => {
      const r = e.getBoundingClientRect();
      return [Math.round(r.x), Math.round(r.y), Math.round(r.width), Math.round(r.height)];
    })
  );
  const rectDiff = rects3d
    .map((r, i) => (r.every((v, k) => v === rects2d[i]?.[k]) ? null : `${i}:${r.join(",")}→${rects2d[i]?.join(",") ?? "missing"}`))
    .filter(Boolean);
  check("切换前后底物/产物格子 x/y/w/h 完全不变", rects3d.length === rects2d.length && rectDiff.length === 0,
    rectDiff.slice(0, 6).join(" | "));
  check("每块/每侧都有分子卡片（无空块）", await page.evaluate((ids) =>
    ids.every((id) => {
      const block = document.getElementById(id);
      const sides = block?.querySelectorAll(".cmp3d-side") ?? [];
      return sides.length === 2 &&
        [...sides].every((s) => s.querySelectorAll('[data-testid="mol-2d"], [data-testid="mol-3d"], [data-testid="mol-3d-none"]').length > 0);
    }), spec.ids));

  // ===== 6) 直达 URL + 返回行 =====
  check("返回行存在", (await page.locator('[data-testid="film-back"]').count()) === 1);
  if (spec === PPP) {
    // 断言随功能变更（2026-11-04）：PPP 挂图页 /pathway/ppp 已接入，返回行进挂图、页脚缺口说明相应改写。
    // 另：新增全站首页后返回行多一条「首页」文字链接，故按 .film-home 排除后取返回挂图目标。
    check("PPP 返回挂图且页脚写明「挂图页已接入」",
      (await page.locator('[data-testid="film-back"] a:not(.film-home)').getAttribute("href")) === "/pathway/ppp" &&
        (await page.locator(".poster-foot").innerText()).includes("挂图页已接入"));
    check("PPP 结构对照页另有首页入口（/）",
      (await page.locator('[data-testid="film-back"] a.film-home[href="/"]').count()) === 1);
  } else {
    check("糖异生返回挂图", (await page.locator('[data-testid="film-back"] a:not(.film-home)').getAttribute("href")) === "/pathway/gluconeogenesis");
  }
}

// ===== 7) 糖异生挂图右栏入口 =====
console.log("\n===== 糖异生挂图入口 =====");
for (const id of ["gn-1", "gn-4", "gn-8", "gn-9", "gn-11", "gn-cori", "gn-ala"]) {
  await page.goto(`${BASE}/pathway/gluconeogenesis?step=${id}`, { waitUntil: "domcontentloaded" });
  const link = page.locator('[data-testid="gn-structure-cmp-entry"]');
  check(
    `${id} 入口指向 /structures/gluconeogenesis#${id}`,
    (await link.count()) === 1 &&
      (await link.getAttribute("href")) === `/structures/gluconeogenesis#${id}` &&
      (await link.innerText()).includes("看这一步的结构对照")
  );
}
for (const id of ["gn-shuttle-mpc", "gn-shuttle-mal"]) {
  await page.goto(`${BASE}/pathway/gluconeogenesis?step=${id}`, { waitUntil: "domcontentloaded" });
  check(
    `${id} 无资产步骤给灰字，不给空链接`,
    (await page.locator('[data-testid="gn-structure-cmp-entry"]').count()) === 0 &&
      (await page.locator('[data-testid="gn-structure-cmp-none"]').count()) === 1 &&
      (await page.locator('[data-testid="gn-structure-cmp-none"]').innerText()).includes("转运步")
  );
}
await page.goto(`${BASE}/pathway/gluconeogenesis?step=gn-10`, { waitUntil: "domcontentloaded" });
await page.locator('[data-testid="gn-structure-cmp-entry"]').click();
await page.waitForFunction(() => document.querySelectorAll(".cmp-block").length === 13, { timeout: 30000 });
check("点击入口落到结构对照页并定位 #gn-10", new URL(page.url()).pathname === "/structures/gluconeogenesis" &&
  new URL(page.url()).hash === "#gn-10" && (await page.locator("#gn-10").count()) === 1);

// ===== 8) 未知 pathwayId 说明页 =====
await page.goto(`${BASE}/structures/not-a-pathway`, { waitUntil: "domcontentloaded" });
check("未知 pathwayId 仍走说明页，不 404", (await page.locator('[data-testid="comparison-not-wired"]').count()) === 1 &&
  (await page.locator('[data-testid="comparison-not-wired"]').innerText()).includes("ppp") &&
  (await page.locator('[data-testid="comparison-not-wired"]').innerText()).includes("gluconeogenesis"));

// ===== 9) 截图 =====
const shot = async (route, id, file, mode) => {
  await page.goto(`${route}?mode=${mode}`, { waitUntil: "domcontentloaded" });
  await settle({ blocks: route.includes("/ppp") ? PPP.blocks : GN.blocks }, mode);
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
await shot(PPP.route, "ppp-o3", "cmp-ppp-3d.png", "3d");
await shot(PPP.route, "ppp-n3", "cmp-ppp-2d.png", "2d");
await shot(GN.route, "gn-8", "cmp-gn-sources.png", "3d");

check("无页面运行错误", errors.length === 0);
if (errors.length) console.log("页面错误：\n" + errors.join("\n"));
check("无 404 / 请求失败", badResponses.length === 0);
if (badResponses.length) console.log("坏请求：\n" + badResponses.join("\n"));

await browser.close();
console.log(`\n${failed ? "冒烟未通过" : "冒烟全部通过"}`);
process.exit(failed ? 1 : 0);
