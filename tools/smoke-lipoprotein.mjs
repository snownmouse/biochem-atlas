// PLATE 18 血浆脂蛋白挂图冒烟验证（playwright-core + 本机 Edge/Chrome）。
// 校验口径：路由可达、4 个器官列、血浆带、11 条物流 chip、颗粒账本 4 行、
// 点击 lp-2 出 LPL 详情、?step= 还原、接口只 fao-act / ch-13 且 href 正确、
// 结构对照 SF-18 11 块、1440 无横向溢出、chips 不压字不出画布。
// 不校验 3D：本页一律 2D，threeD.status=not-built。
// 运行前：npm run build && npm run preview。
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

const read = (p) => JSON.parse(readFileSync(resolve(ROOT, p), "utf8"));
const readText = (p) => readFileSync(resolve(ROOT, p), "utf8");
const data = read("src/data/lipoprotein/lipoprotein.json");
const skel = read("src/data/lipoprotein/skeleton.json");
const fao = read("src/data/fatty-acid-oxidation/fao.json");
const cholesterol = read("src/data/cholesterol/cholesterol.json");
const stepIndexSrc = readText("src/data/stepIndex.ts");

const EXPECTED_IDS = data.steps.map((s) => s.id);
const EXPECTED_HREF = {
  "fao-act": "/pathway/fatty-acid-oxidation?step=fao-act",
  "ch-13": "/pathway/cholesterol?step=ch-13",
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
page.on("pageerror", (e) => errors.push(String(e)));
page.on("console", (m) => m.type() === "error" && errors.push(m.text()));

mkdirSync(join(ROOT, "preview"), { recursive: true });

/* ===== 1) 路由 + 器官列 + 血浆带 ===== */
const resp = await page.goto(`${BASE}/pathway/lipoprotein`, { waitUntil: "networkidle" });
check("路由 200：/pathway/lipoprotein", resp?.status() === 200, String(resp?.status()));
check("血浆脂蛋白挂图 SVG 存在", (await page.locator("svg[data-lipoprotein-plate]").count()) === 1);
check("无控制台报错", errors.length === 0, errors.join(" | "));
check("4 个器官列", (await page.locator("[data-organ-column]").count()) === 4);
const organText = await page.evaluate(() =>
  [...document.querySelectorAll("[data-organ-column]")].map((el) => el.textContent).join(" | ")
);
for (const s of ["小肠", "肝", "外周组织", "肾上腺 / 性腺"]) {
  check(`器官列标题含 ${s}`, organText.includes(s));
}
check("血浆带存在", (await page.locator("[data-blood-band='1']").count()) === 1);
check("血浆带颗粒流 9 条", (await page.locator("[data-blood-flow]").count()) === 9);
check("颗粒节点 8 个", (await page.locator("[data-node-id]").count()) === 8);

/* ===== 2) 11 条物流 chip ===== */
const chips = await page.locator("[data-lipoprotein-chip]").evaluateAll((els) =>
  els.map((el) => ({
    id: el.getAttribute("data-step-id"),
    organ: el.getAttribute("data-chip-organ"),
    kind: el.getAttribute("data-chip-kind"),
  }))
);
check("物流 chip 总数 11", chips.length === 11, String(chips.length));
check("chip id 精确覆盖 lp-1…lp-11", chips.map((c) => c.id).sort().join(",") === [...EXPECTED_IDS].sort().join(","));
check("小肠 1 条 / 肝 6 条 / 外周 3 条 / 类固醇 1 条", JSON.stringify(
  ["intestine", "liver", "peripheral", "steroid"].map((id) => chips.filter((c) => c.organ === id).length)
) === JSON.stringify([1, 6, 3, 1]));
check("物流清单表 11 行", (await page.locator("table[data-logistics-table] tbody tr").count()) === 11);
check("页面没有反应式 / 方程块", (await page.locator("[data-equation], [data-reaction]").count()) === 0);

/* ===== 3) 颗粒组成账本 ===== */
check("颗粒组成账本存在", (await page.locator("[data-particle-ledger]").count()) === 1);
check("账本 4 行（CM / VLDL / LDL / HDL）", (await page.locator("[data-particle-row]").count()) === 4);
const ledgerRows = await page.locator("[data-particle-row]").evaluateAll((els) => els.map((el) => el.getAttribute("data-particle-row")));
check("账本行 id 正确", ledgerRows.join(",") === "cm,vldl,ldl,hdl", ledgerRows.join(","));
const ledgerText = await page.locator("[data-particle-ledger]").innerText();
check("账本写明定性、不写精确百分比", ledgerText.includes("定性") && ledgerText.includes("不写精确百分比"));
check("账本含载脂蛋白列", ledgerText.includes("ApoB-48") && ledgerText.includes("ApoB-100") && ledgerText.includes("ApoA-I"));

/* ===== 4) 点击 lp-2 → LPL 详情 ===== */
await page.locator('svg g[data-step-id="lp-2"] text.st-name').click();
check("点击 lp-2 后 URL 带 step=lp-2", page.url().includes("step=lp-2"));
check("lp-2 唯一选中", (await page.locator('svg .lp-chip.sel[data-step-id="lp-2"]').count()) === 1);
check("右栏出现 lp-2 详情", (await page.locator('aside [data-lipoprotein-detail="lp-2"]').count()) === 1);
const detailText = await page.locator('aside [data-lipoprotein-detail="lp-2"]').innerText();
check("详情写明 LPL", detailText.includes("LPL"));
check("详情写明 ApoC-II 激活", detailText.includes("ApoC-II"));
check("详情写明 FFA 进入脂肪 / 肌肉", detailText.includes("FFA"));

/* ===== 5) ?step= 还原 ===== */
await page.goto(`${BASE}/pathway/lipoprotein?step=lp-9`, { waitUntil: "networkidle" });
check("?step=lp-9 还原选中", (await page.locator('svg .lp-chip.sel[data-step-id="lp-9"]').count()) === 1);
const detail9 = await page.locator('aside [data-lipoprotein-detail="lp-9"]').innerText();
check("lp-9 详情写明 LCAT / SR-B1", detail9.includes("LCAT") && detail9.includes("SR-B1"));

/* ===== 6) 接口 2 条 ===== */
check("接口卡片 2 条", (await page.locator("[data-lipoprotein-interface]").count()) === 2);
const ifaceRows = await page.locator("[data-interface-row]").evaluateAll((els) =>
  els.map((el) => ({
    id: el.getAttribute("data-interface-row"),
    href: el.querySelector("a")?.getAttribute("href") ?? "",
  }))
);
check("接口只 fao-act / ch-13", ifaceRows.map((r) => r.id).join(",") === "fao-act,ch-13", JSON.stringify(ifaceRows));
const badIface = ifaceRows.filter((r) => EXPECTED_HREF[r.id] !== r.href);
check("接口 href 正确", badIface.length === 0, JSON.stringify(badIface));
const faoIds = new Set([...(fao.steps || []).map((s) => s.id), ...(fao.sideBranchSteps || []).map((s) => s.id)]);
check("fao-act 在 β-氧化数据中真实存在", faoIds.has("fao-act"));
check("ch-13 在胆固醇数据中真实存在", (cholesterol.steps || []).some((s) => s.id === "ch-13"));
check("stepIndex 已登记 lipoprotein", stepIndexSrc.includes('id: "lipoprotein"'));

/* ===== 7) 结构入口 ===== */
const entry = page.locator('[data-testid="lipoprotein-structure-entry"]');
check("详情栏有结构对照入口", (await entry.count()) === 1);
check("结构入口 href 带 step=lp-9", (await entry.getAttribute("href")) === "/structures/lipoprotein?step=lp-9", String(await entry.getAttribute("href")));

/* ===== 8) 版面几何：chips 不压字 / 不出画布 ===== */
const geo = await page.evaluate(() => {
  const svg = document.querySelector("svg[data-lipoprotein-plate]");
  const box = (el) => {
    const r = el.getBoundingClientRect();
    return { x: r.x, y: r.y, right: r.right, bottom: r.bottom, w: r.width, h: r.height };
  };
  const chips = [...svg.querySelectorAll("[data-lipoprotein-chip]")].map((g) => {
    const rs = [...g.querySelectorAll("text")].map(box);
    return {
      id: g.getAttribute("data-step-id"),
      x: Math.min(...rs.map((r) => r.x)),
      y: Math.min(...rs.map((r) => r.y)),
      right: Math.max(...rs.map((r) => r.right)),
      bottom: Math.max(...rs.map((r) => r.bottom)),
    };
  });
  const nodes = [...svg.querySelectorAll("[data-node-id] circle")].map((c) => ({
    id: c.parentElement.getAttribute("data-node-id"),
    ...box(c),
  }));
  return { svg: box(svg), chips, nodes };
});
const overlap = (a, b) =>
  Math.min(a.right, b.right) - Math.max(a.x, b.x) > 3 && Math.min(a.bottom, b.bottom) - Math.max(a.y, b.y) > 3;
const outOfCanvas = geo.chips.filter(
  (c) => c.x < geo.svg.x - 1 || c.right > geo.svg.right + 1 || c.y < geo.svg.y - 1 || c.bottom > geo.svg.bottom + 1
);
check("11 条物流 chip 均在画布内", outOfCanvas.length === 0, JSON.stringify(outOfCanvas));
const chipChip = [];
for (let i = 0; i < geo.chips.length; i += 1) {
  for (let j = i + 1; j < geo.chips.length; j += 1) {
    if (overlap(geo.chips[i], geo.chips[j])) chipChip.push([geo.chips[i].id, geo.chips[j].id]);
  }
}
check("物流 chip 互不压字", chipChip.length === 0, JSON.stringify(chipChip));
const chipNode = [];
for (const c of geo.chips) {
  for (const n of geo.nodes) if (overlap(c, n)) chipNode.push([c.id, n.id]);
}
check("物流 chip 不压颗粒节点", chipNode.length === 0, JSON.stringify(chipNode));
const minFont = await page.evaluate(() =>
  Math.min(...[...document.querySelectorAll("[data-lipoprotein-chip] text")].map((t) => parseFloat(getComputedStyle(t).fontSize)))
);
check("chip 最小字号 ≥ 8.5 px（未靠缩字换空间）", minFont >= 8.5, `${minFont} px`);

/* ===== 9) 1440 无横向溢出 ===== */
const overflow = await page.evaluate(() => ({
  doc: document.documentElement.scrollWidth,
  viewport: window.innerWidth,
  svg: (() => {
    const r = document.querySelector("svg[data-lipoprotein-plate]").getBoundingClientRect();
    return { left: r.left, right: r.right, width: r.width };
  })(),
}));
check("1440 文档无横向溢出", overflow.doc <= overflow.viewport, `${overflow.doc} / ${overflow.viewport}`);
check("画布 1:1 未缩放（1200px）", Math.abs(overflow.svg.width - 1200) <= 2, `${Math.round(overflow.svg.width)} px`);

/* ===== 10) 截图 ===== */
await page.setViewportSize({ width: 1440, height: 900 });
await page.goto(`${BASE}/pathway/lipoprotein`, { waitUntil: "networkidle" });
await page.screenshot({ path: join(ROOT, "preview", "lipoprotein-full.png"), fullPage: true });
await page.locator("svg[data-lipoprotein-plate]").screenshot({ path: join(ROOT, "preview", "lipoprotein-plate.png") });
await page.locator("[data-blood-band='1']").screenshot({ path: join(ROOT, "preview", "lipoprotein-blood-band.png") });
await page.locator("[data-particle-ledger]").screenshot({ path: join(ROOT, "preview", "lipoprotein-ledger.png") });
console.log("✓ 截图 preview/lipoprotein-full.png / lipoprotein-plate.png / lipoprotein-blood-band.png / lipoprotein-ledger.png");

/* ===== 11) 结构对照 SF-18 ===== */
await page.goto(`${BASE}/structures/lipoprotein`, { waitUntil: "networkidle" });
const sf = await page.evaluate(() => {
  const blocks = Array.from(document.querySelectorAll("[data-step-id]"));
  return {
    plate: document.querySelector(".plate-no")?.textContent ?? "",
    blocks: blocks.length,
    ids: blocks.map((el) => el.getAttribute("data-step-id")),
    back: document.querySelector('[data-testid="structures-back"]')?.getAttribute("href") ?? null,
  };
});
check("结构对照页 /structures/lipoprotein 可达", page.url().endsWith("/structures/lipoprotein"));
check("结构页报头 PLATE SF-18", /PLATE SF-18/.test(sf.plate), sf.plate);
check("结构页 11 块且 id 为 lp-1…lp-11", sf.blocks === 11 && sf.ids.join(",") === EXPECTED_IDS.join(","), `${sf.blocks}：${sf.ids.join(",")}`);
check("结构页底部返回 /pathway/lipoprotein", sf.back === "/pathway/lipoprotein", String(sf.back));
await page.screenshot({ path: join(ROOT, "preview", "lipoprotein-structures.png"), fullPage: true });

/* ===== 12) 无页面错误 ===== */
check("全流程无页面错误", errors.length === 0, errors.slice(0, 3).join(" | "));

await browser.close();
console.log(failed ? "\n✗ smoke-lipoprotein 有失败项" : "\n✓ smoke-lipoprotein 全部通过");
if (failed) process.exit(1);
