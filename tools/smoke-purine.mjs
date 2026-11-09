// 嘌呤核苷酸代谢挂图冒烟（PLATE 16 · SF-16）。
// 校验口径：路由可达、15 步全部胞质、1 区室、29 节点、步骤 / 节点点击语义、
// ?step= 深链还原、2 条接口只指向真实步骤、全图只做 2D（无 3D 开关、无「待结构核验」）、
// 结构对照入口可点、1440 无横向溢出。
// 需先 `npm run build` 与 `npm run preview`（或 BASE_URL 指向本地服务）。
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

// ===== 1) 路由 / 画布 / 计数 =====
const resp = await page.goto(`${BASE}/pathway/purine`, { waitUntil: "networkidle" });
check("路由 /pathway/purine 可达（200）", resp?.status() === 200);
const frame = page.locator("svg[data-frame='purine']");
check("挂图 svg 存在且唯一", (await frame.count()) === 1);
check("报头 PLATE 16 · SF-16", (await page.locator(".plate-no").innerText()).includes("PLATE 16"));
check(
  "画布原生 1360×800",
  (await frame.getAttribute("width")) === "1360" && (await frame.getAttribute("height")) === "800",
  `${await frame.getAttribute("width")}×${await frame.getAttribute("height")}`,
);
check("单区室泳道 cyto", (await frame.getAttribute("data-lanes")) === "cyto", await frame.getAttribute("data-lanes"));
check("data-step-count = 15", (await frame.getAttribute("data-step-count")) === "15", await frame.getAttribute("data-step-count"));
check("data-node-count = 29", (await frame.getAttribute("data-node-count")) === "29", await frame.getAttribute("data-node-count"));
check("无控制台报错", errors.length === 0, errors.slice(0, 3).join(" | "));

// ===== 2) 15 步与节点标签齐全 =====
const STEP_IDS = ["pur-1", "pur-2", "pur-3", "pur-4", "pur-5", "pur-6", "pur-7", "pur-8", "pur-9", "pur-10", "pur-11", "pur-12", "pur-13", "pur-14", "pur-15"];
const stepIds = await frame.locator("[data-step-id]").evaluateAll((els) =>
  [...new Set(els.map((el) => el.getAttribute("data-step-id")))]
);
check(
  "图上 15 个步骤 id 齐全（去重）",
  stepIds.length === 15 && STEP_IDS.every((id) => stepIds.includes(id)),
  stepIds.join(","),
);
const nodeIds = await frame.locator("[data-node-id]").evaluateAll((els) =>
  [...new Set(els.map((el) => el.getAttribute("data-node-id")))]
);
check("图上 29 个节点 id（去重）", nodeIds.length === 29, String(nodeIds.length));

// ===== 3) 点击 pur-2（GPAT）→ 详情栏 =====
await frame.locator(".step-badge[data-step-id='pur-2']").click();
await page.waitForTimeout(120);
const dStep = await page.locator(".d-step").first().innerText();
check("点击 pur-2 后详情栏出现酰胺转移酶步骤", dStep.includes("酰胺转移酶"), dStep.replace(/\n/g, " "));
const dEnzyme = await page.locator(".d-enzyme").first().innerText();
check("详情栏酶名只写 PPAT（不与 gpl-1 的 GPAT 撞名）", dEnzyme.includes("PPAT") && !dEnzyme.includes("GPAT"), dEnzyme.replace(/\n/g, " "));
check("详情栏 EC 2.4.2.14", dEnzyme.includes("2.4.2.14") || (await page.locator("body").innerText()).includes("2.4.2.14"));
check("详情栏标「细胞质」", dStep.includes("细胞质"), dStep.replace(/\n/g, " "));
const dgText = await page.locator("[data-dg='1']").first().innerText();
check("ΔG 只给定性、不含数值", dgText.includes("定性") && !/[-−]?\d+(\.\d+)?\s*kJ/i.test(dgText), dgText.replace(/\n/g, " "));
check("无「待结构核验」占位", !(await page.locator("body").innerText()).includes("待结构核验"));
check("全图只做 2D：无 3D 切换控件", (await page.locator("[data-3d-toggle], .d-3d-toggle, button:has-text('3D')").count()) === 0);
check("2D-only 说明存在（不登记 PDB）", (await page.locator("[data-2d-only='1']").first().innerText()).includes("PDB"));

// ===== 4) 接口面板只指向真实步骤 =====
const interfaces = page.locator("[data-chain-interfaces='1'] [data-interface-step]");
check("接口面板 2 条", (await interfaces.count()) === 2, String(await interfaces.count()));
const ifaceIds = await interfaces.evaluateAll((els) => els.map((el) => el.getAttribute("data-interface-step")));
check("接口 id 为 ppp-n1 / oc-3", ["ppp-n1", "oc-3"].every((id) => ifaceIds.includes(id)), ifaceIds.join(","));
const ifaceHrefs = await interfaces.locator("a").evaluateAll((els) => els.map((a) => a.getAttribute("href")));
check("接口链接均为「既有通路?step=」", ifaceHrefs.every((h) => h && h.includes("?step=")), ifaceHrefs.join(","));

// ===== 5) 节点点击 → 打开该节点所属步骤 =====
await frame.locator("[data-node-id='imp']").first().click();
await page.waitForTimeout(120);
check("点击节点 imp 打开 pur-11 步骤详情", (await page.locator(".d-enzyme").first().innerText()).includes("ATIC"));

// ===== 6) ?step= 深链还原 =====
await page.goto(`${BASE}/pathway/purine?step=pur-11`, { waitUntil: "networkidle" });
check("?step=pur-11 直接还原详情", (await page.locator(".d-enzyme").first().innerText()).includes("ATIC"));
check(
  "深链还原后结构对照入口指向 pur-11",
  (await page.locator("[data-testid='chain-structure-cmp-entry']").getAttribute("data-cmp-step")) === "pur-11",
);

// ===== 7) 结构对照入口 =====
check("步骤详情有「看这一步的结构对照」入口", (await page.locator("[data-testid='chain-structure-cmp-entry']").count()) === 1);

// ===== 8) 结构页 SF-16 可达 =====
const sresp = await page.goto(`${BASE}/structures/purine`, { waitUntil: "networkidle" });
check("路由 /structures/purine 可达（200）", sresp?.status() === 200);
check("结构页标 SF-16", (await page.locator(".plate-no").innerText()).includes("SF-16"));
const cmpIds = await page.locator("[data-step-id]").evaluateAll((els) => [...new Set(els.map((el) => el.getAttribute("data-step-id")))]);
check(
  "结构页 15 块对照（pur-1…pur-15）",
  cmpIds.length === 15 && STEP_IDS.every((id) => cmpIds.includes(id)),
  cmpIds.join(","),
);
check("结构页无「待结构核验」占位", !(await page.locator("body").innerText()).includes("待结构核验"));

// ===== 9) 1440 无横向溢出 + 截图 =====
await page.goto(`${BASE}/pathway/purine`, { waitUntil: "networkidle" });
await page.waitForTimeout(200);
const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
check("1440 宽无横向溢出", overflow <= 1, `scrollWidth 超出 ${overflow}px`);
await page.screenshot({ path: join(ROOT, "preview", "poster-purine-1440.png") });
await page.screenshot({ path: join(ROOT, "preview", "poster-purine.png"), fullPage: true });
console.log("✓ 截图 preview/poster-purine-1440.png / poster-purine.png");

// ===== 10) 版式审计交叉核对（audit-layout 由外部单独运行，结果写在 preview/） =====
let audit = null;
try {
  audit = JSON.parse(readFileSync(join(ROOT, "preview", "layout-audit.json"), "utf8"));
} catch {
  console.log("· 未找到 preview/layout-audit.json，跳过交叉核对（请先跑 audit-layout --tag after）");
}
if (audit) {
  const entry = audit.pages?.find((p) => p.page === "purine");
  if (!entry) {
    console.log("· preview/layout-audit.json 为旧报告（不含 purine 页），跳过交叉核对；收尾跑 audit-layout --tag after 后复跑本脚本");
  } else {
    const clipped = entry.clipped.length + (entry.svgClipped?.length ?? 0);
    check(
      "audit-layout：/pathway/purine 0 重叠 / 0 裁切",
      entry.significantOverlaps.length === 0 && clipped === 0,
      `重叠 ${entry.significantOverlaps.length}｜裁切 ${clipped}`,
    );
  }
}

check("全程无控制台报错", errors.length === 0, errors.slice(0, 3).join(" | "));

await browser.close();
process.exit(failed ? 1 : 0);
