// 尿素循环挂图冒烟（与 smoke-tca / smoke-gluconeogenesis 同款机制：playwright-core + 本机 Edge/Chrome）。
// 校验口径：路由可达、五步、三泳道、跨区室闭合环（bbox 真跨越泳道边界）、双氮源区、TCA 回流区、
// 点击选中语义（步骤 / 同实体多节点 / 转运）、?step= 还原、能量账双口径、五步可逆性表、
// 图框 1px + 内边距 ≥24px、无缩放控件、1440 首屏九条标题全见、audit-layout 本页 0 重叠 0 裁切。
// 需先 `npm run build`，再 `npm run preview`（或 BASE_URL 指向本地服务）。
import { mkdirSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright-core";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const BASE = process.env.BASE_URL ?? "http://localhost:4173";
let failed = false;
const check = (label, ok, detail) => {
  console.log(`${ok ? "✓" : "✗"} ${label}${detail ? `  ${detail}` : ""}`);
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

// ===== 1) 路由可达 + 五步 + 三泳道 =====
const resp = await page.goto(`${BASE}/pathway/urea-cycle`, { waitUntil: "networkidle" });
check("路由 /pathway/urea-cycle 可达（200）", resp?.status() === 200);
check("挂图 svg 存在且唯一", (await page.locator("svg[data-frame='urea']").count()) === 1);
check("无控制台报错", errors.length === 0, errors.slice(0, 3).join(" | "));
check("画布 1620×820", (await page.locator("svg[data-frame='urea']").getAttribute("width")) === "1620");

for (let i = 1; i <= 5; i++) {
  const n = await page.locator(`svg g[data-step-id="urea-${i}"]`).count();
  if (n !== 1) check(`步骤 urea-${i} 恰好一组`, false);
}
const stepIds = await page.locator("svg g[data-step-id]").evaluateAll((els) =>
  els.map((el) => el.getAttribute("data-step-id")),
);
check("五步齐全（urea-1…urea-5）", stepIds.length === 5 && new Set(stepIds).size === 5, stepIds.join(","));
check("两条跨膜转运（ORNT1 / Asp 进入）", (await page.locator("svg g[data-transport-id]").count()) === 2);
check("转运不计入五步（data-step-count=5）", (await page.locator("svg[data-frame='urea']").getAttribute("data-step-count")) === "5");

const laneText = await page.evaluate(() => document.querySelector("svg[data-frame='urea']")?.textContent ?? "");
check("泳道标签显式写「线粒体基质」", laneText.includes("线粒体基质"));
check("泳道标签显式写「内膜 · 转运带」", laneText.includes("转运带"));
check("泳道标签显式写「细胞质」", laneText.includes("细胞质"));
check("三条泳道带各一个", (await page.locator("[data-compartment-band]").count()) === 3);
check("ORNT1 / SLC25A15 写在图上", laneText.includes("ORNT1") && laneText.includes("SLC25A15"));

// ===== 2) 跨区室闭合环：路径 bbox 真跨越泳道边界 =====
const laneCheck = await page.evaluate(() => {
  const bb = (sel) => {
    const el = document.querySelector(sel);
    return el ? el.getBBox() : null;
  };
  const centerY = (b) => b.y + b.height / 2;
  const ornt1 = bb('svg g[data-transport-id="urea-ornt1"] path');
  const aspEntry = bb('svg g[data-transport-id="urea-asp-entry"] path');
  const returnArc = bb('svg g[data-step-id="urea-5"] path[stroke-dasharray="5 4"]');
  const recycle = bb('svg g[data-tca-return-band="1"] path');
  const citMit = bb('svg g[data-node-id="citrulline-mit"] circle');
  const citCyt = bb('svg g[data-node-id="citrulline-cyt"] circle');
  const ornMit = bb('svg g[data-node-id="ornithine-mit"] circle');
  const ornCyt = bb('svg g[data-node-id="ornithine-cyt"] circle');
  const crosses = (b, y1, y2) => b && b.y < y1 && b.y + b.height > y2;
  return {
    ornt1: crosses(ornt1, 250, 340) && ornt1.height > 150,
    aspEntry: crosses(aspEntry, 250, 340),
    recycle: recycle && recycle.height > 150,
    citSpan: citMit && citCyt && centerY(citMit) < 250 && centerY(citCyt) > 340,
    ornSpan: ornMit && ornCyt && centerY(ornMit) < 250 && centerY(ornCyt) > 340,
  };
});
check("ORNT1 跨膜路径真跨越 y250–340（不是平线）", laneCheck.ornt1 === true);
check("天冬氨酸进入路径跨越内膜带", laneCheck.aspEntry === true);
check("TCA 回流带纵向跨出循环（bbox 高 > 150）", laneCheck.recycle === true);
check("瓜氨酸两节点分居基质 / 胞质", laneCheck.citSpan === true);
check("鸟氨酸两节点分居基质 / 胞质（同实体多节点）", laneCheck.ornSpan === true);
check(
  "闭环标记 2→3→4→5→2",
  (await page.locator("svg[data-frame='urea']").getAttribute("data-cycle-closure")) === "urea-2→urea-3→urea-4→urea-5→urea-2",
);

// ===== 3) 双氮源 + TCA 回流 =====
check("右栏双氮源区存在", (await page.locator('aside [data-dual-nitrogen="1"]').count()) === 1);
const dnText = await page.locator('aside [data-dual-nitrogen="1"]').innerText();
check("双氮源区写明氮源 A = 游离 NH₃（CPS1）", dnText.includes("氮源 A") && dnText.includes("NH₃") && dnText.includes("CPS1"));
check("双氮源区写明氮源 B = Asp α-氨基（ASS）", dnText.includes("氮源 B") && dnText.includes("Asp") && dnText.includes("ASS"));
check("双氮源区明写「不写 2 NH₃」口径", dnText.includes("不是同一来源"));
check("右栏 TCA 回流区存在", (await page.locator('aside [data-tca-return="1"]').count()) === 1);
const tcaText = await page.locator('aside [data-tca-return="1"]').innerText();
check("回流区写明 延胡索酸 → 苹果酸 → 草酰乙酸 → 天冬氨酸", tcaText.includes("延胡索酸") && tcaText.includes("天冬氨酸"));
check("回流区写明「碳骨架不是废物，是回流的载体」", tcaText.includes("碳骨架不是废物，是回流的载体"));
check("TCA 回流带在挂图上（引用而非新节点）", (await page.locator('svg g[data-tca-return-band="1"]').count()) === 1);
check("回流链接指向 /pathway/tca?step=tca-6", (await page.locator('aside a[data-tca-link="fum"]').getAttribute("href"))?.includes("/pathway/tca?step=tca-6") === true);

// ===== 4) 能量账双口径 =====
const ledger = page.locator('aside [data-ledger-urea="1"]');
check("能量账名义 ATP = 3", (await ledger.getAttribute("data-nominal-atp")) === "3");
check("能量账折算高能键 = 4", (await ledger.getAttribute("data-high-energy-bonds")) === "4");
const ledgerText = await ledger.innerText();
check("页面明写「名义 3 ATP」", ledgerText.includes("名义 3 ATP"));
check("页面明写「4 个高能键」", ledgerText.includes("4 个高能键"));
check("逐项：CPS1 2 ATP / ASS 1 ATP", (await page.locator('aside [data-energy-entry="urea-1"]').innerText()).includes("2 ATP") && (await page.locator('aside [data-energy-entry="urea-3"]').innerText()).includes("1 ATP"));
check("净方程含 2 ADP / AMP / PPi / 2 Pi", ledgerText.includes("2 ADP") && ledgerText.includes("AMP") && ledgerText.includes("PPi") && ledgerText.includes("2 Pi"));
check("五步不可逆 / 可逆表 5 行", (await page.locator("aside [data-rev-row]").count()) === 5);

// ===== 5) 点击语义：步骤 / 同实体多节点 / 转运 =====
await page.locator('svg g[data-node-id="ornithine-cyt"] circle').click({ force: true });
check("点胞质鸟氨酸节点 → step=urea-5", page.url().includes("step=urea-5"));
check("ARG1 详情出现（尿素 + 鸟氨酸回到载体）", (await page.locator("aside .d-enzyme").innerText()).includes("ARG1"));
check("详情标注不可逆", (await page.locator("aside .d-tag").first().innerText()).includes("不可逆"));
check("结构对照入口指向 /structures/urea-cycle#urea-5", (await page.locator('aside [data-testid="urea-structure-cmp-entry"]').getAttribute("href")) === "/structures/urea-cycle#urea-5");

await page.locator('svg g[data-node-id="citrulline-cyt"] circle').click({ force: true });
check("点胞质瓜氨酸节点 → step=urea-3", page.url().includes("step=urea-3"));
check("ASS 详情出现", (await page.locator("aside .d-enzyme").innerText()).includes("ASS"));
check("双氮源在详情里写明第二个氮来自 Asp", (await page.locator("aside [data-nitrogen-role]").innerText()).includes("Asp"));

await page.locator('svg g[data-node-id="ornithine-mit"] circle').click({ force: true });
check("点基质鸟氨酸节点 → step=urea-2", page.url().includes("step=urea-2"));
check("OTC 详情出现", (await page.locator("aside .d-enzyme").innerText()).includes("OTC"));

await page.locator('svg g[data-node-id="ornt1"] rect').click({ force: true });
check("点 ORNT1 机器 → step=urea-ornt1", page.url().includes("step=urea-ornt1"));
check("转运详情注明不计入五步", (await page.locator("aside [data-transport-detail='1']").innerText()).includes("不计入五步"));
check("转运详情写明瓜氨酸出 / 鸟氨酸进", (await page.locator("aside [data-transport-detail='1']").innerText()).includes("瓜氨酸") && (await page.locator("aside [data-transport-detail='1']").innerText()).includes("鸟氨酸"));

// ===== 6) ?step= 还原 + 上一步 / 下一步 =====
await page.goto(`${BASE}/pathway/urea-cycle?step=urea-1`, { waitUntil: "networkidle" });
check("URL 还原：urea-1 唯一选中态", (await page.locator("svg g[data-step-id='urea-1'].sel").count()) === 1);
await page.locator(".d-variant .d-variant-tab").last().click();
check("下一步指向 urea-2", page.url().includes("step=urea-2"));

// ===== 7) 图框 / 横向滚动 / 无缩放 =====
const frame = await page.locator(".plate-scroll").evaluate((el) => {
  const s = getComputedStyle(el);
  return {
    border: [s.borderTopWidth, s.borderRightWidth, s.borderBottomWidth, s.borderLeftWidth],
    padding: [s.paddingTop, s.paddingRight, s.paddingBottom, s.paddingLeft],
    overflowX: s.overflowX,
    scrollW: el.scrollWidth,
    clientW: el.clientWidth,
  };
});
check(
  "图框四边 1px 直角细边",
  frame.border.every((w) => Math.abs(parseFloat(w) - 1) <= 0.1),
  frame.border.join(" "),
);
check(
  "图框四周内边距 ≥24px",
  frame.padding.every((p) => parseFloat(p) >= 24),
  frame.padding.join(" "),
);
const docFit = await page.evaluate(() => ({
  client: document.documentElement.clientWidth,
  scroll: document.documentElement.scrollWidth,
}));
check("页面级无横向溢出（横向只在图容器内滚）", docFit.scroll <= docFit.client + 2, JSON.stringify(docFit));
check("图容器横向可滚（1620 画布 > 可视宽）", frame.scrollW > frame.clientW, `${frame.scrollW} / ${frame.clientW}`);
const zoomCount = await page.locator("button, input, [role=slider], [class*=zoom]").evaluateAll((els) =>
  els.filter((el) => {
    const t = (el.textContent ?? "").trim();
    return /zoom|缩放|放大|缩小/.test(t) || /zoom/i.test(String(el.className));
  }).length,
);
check("无缩放控件", zoomCount === 0, String(zoomCount));

// ===== 8) 结构对照页可达 =====
await page.goto(`${BASE}/structures/urea-cycle`, { waitUntil: "networkidle" });
check("结构对照 /structures/urea-cycle 可达", (await page.locator("h1").first().innerText()).includes("尿素循环"));
const cmpSteps = await page.locator("[data-step-id]").evaluateAll((els) => els.map((el) => el.getAttribute("data-step-id")));
check("结构对照 5 块（urea-1…urea-5）", cmpSteps.length === 5 && ["urea-1", "urea-2", "urea-3", "urea-4", "urea-5"].every((id) => cmpSteps.includes(id)), cmpSteps.join(","));
check("结构对照页无控制台报错", errors.length === 0, errors.slice(0, 3).join(" | "));

// ===== 9) 首页 1440×900 展开档：十条标题全见 =====
// 政策（2026-11-05）：无参数默认改为「收起辅助栏 + 等比铺满」，首屏完整可见 8/10。
// 本条原判定口径是展开档（右栏可见、画布 955），用同一套 ?fold=open 还原；断言与阈值未改。
// 默认档 8/10 的新口径在 smoke-home 第 15 节按四视口逐档实测。
await page.setViewportSize({ width: 1440, height: 900 });
await page.goto(`${BASE}/?fold=open`, { waitUntil: "networkidle" });
await page.waitForTimeout(300);
const titles = await page.locator("[data-pathway-title]").evaluateAll((els) =>
  els.map((el) => {
    const r = el.getBoundingClientRect();
    const text = el.textContent ?? "";
    const size = parseFloat(getComputedStyle(el).fontSize);
    return {
      id: el.getAttribute("data-pathway-title"),
      text,
      x: Math.round(r.x),
      y: Math.round(r.y),
      right: Math.round(r.right),
      bottom: Math.round(r.bottom),
      fontSize: size,
    };
  }),
);
const offscreen = titles.filter((t) => t.y < 0 || t.bottom > 900 || t.x < 0 || t.right > 1440);
check("首页十条通路标题齐全", titles.length === 10, titles.map((t) => t.id).join(","));
check("首页出现「尿素循环」标题", titles.some((t) => t.id === "urea-cycle" && t.text.includes("尿素循环")));
check("首页出现「糖原代谢」标题", titles.some((t) => t.id === "glycogen" && t.text.includes("糖原代谢")));
check("1440×900 首屏十条标题全部可见", titles.length === 10 && offscreen.length === 0, JSON.stringify(titles.map((t) => [t.id, t.x, t.y, t.bottom])));
const lowest = Math.max(...titles.map((t) => t.bottom));
check("十条标题最低底边 ≤ 900", lowest <= 900, `最低底边 ${lowest}px（余量 ${900 - lowest}px）`);
console.log(`  · 首页十条标题实测最低底边 ${lowest}px；距首屏下沿 ${900 - lowest}px`);

// ===== 10) audit-layout 本页 0 重叠 0 裁切 =====
let audit = null;
try {
  audit = JSON.parse(readFileSync(join(ROOT, "preview", "layout-audit-urea.json"), "utf8"));
} catch (e) {
  check("读取 preview/layout-audit-urea.json（需先跑 audit-layout --only urea-cycle --tag urea）", false, String(e).slice(0, 80));
}
if (audit) {
  for (const vp of [1440, 1280]) {
    const p = audit.pages.find((x) => x.page === "urea-cycle" && x.viewport === vp);
    check(`audit ${vp}：挂图页无崩溃`, Boolean(p) && !p.fatal, p?.fatal ? String(p.fatal).slice(0, 80) : "");
    if (!p || p.fatal) continue;
    check(`audit ${vp}：挂图页有效重叠 = 0`, p.significantOverlaps.length === 0, `${p.significantOverlaps.length} 条`);
    check(`audit ${vp}：挂图页裁切 = 0`, p.clipped.length + p.svgClipped.length === 0, `${p.clipped.length + p.svgClipped.length} 条`);
    check(`audit ${vp}：页面级横向溢出 = 0`, p.docOverflow.overflowPx === 0, `${p.docOverflow.overflowPx}px`);
    check(`audit ${vp}：步骤 / 节点数与数据一致`, p.completeness.dataMismatch?.steps.ok === true && p.completeness.dataMismatch?.nodes.ok === true, JSON.stringify(p.completeness.dataMismatch));
    check(`audit ${vp}：无缩放控件`, p.zoomControls.length === 0, p.zoomControls.join(","));
  }
  const sp = audit.pages.find((x) => x.page === "structures-urea-cycle" && x.viewport === 1440);
  check("audit 1440：结构对照页可达", Boolean(sp) && !sp.fatal, sp?.fatal ? String(sp.fatal).slice(0, 80) : "");
  if (sp && !sp.fatal) {
    check("audit 1440：结构对照页有效重叠 = 0", sp.significantOverlaps.length === 0, `${sp.significantOverlaps.length} 条`);
    check("audit 1440：结构对照页裁切 = 0", sp.clipped.length + sp.svgClipped.length === 0, `${sp.clipped.length + sp.svgClipped.length} 条`);
  }
}

// ===== 11) 截图（供人审，断言自检不读图） =====
await page.goto(`${BASE}/pathway/urea-cycle`, { waitUntil: "networkidle" });
await page.waitForTimeout(300);
await page.screenshot({ path: join(ROOT, "preview", "poster-urea-1440.png") });
console.log("✓ 截图 preview/poster-urea-1440.png（1440×900 首屏）");
await page.screenshot({ path: join(ROOT, "preview", "poster-urea.png"), fullPage: true });
console.log("✓ 截图 preview/poster-urea.png（1440 宽 fullPage）");

check("全程无控制台报错", errors.length === 0, errors.slice(0, 3).join(" | "));

await browser.close();
process.exit(failed ? 1 : 0);
