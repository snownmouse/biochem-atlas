// 血红素代谢挂图冒烟（PLATE 19 · SF-19）。
// 校验口径：路由可达、10 步、4 区室、14 节点、三态（步骤 / 节点）点击语义、?step= 深链还原、
// 接口面板只指向真实步骤（tca-4 / oc-1）、全图只做 2D（无 3D 开关、无「待结构核验」）、
// 结构与分子档案入口可点、1440 无横向溢出、audit-layout 本页 0 重叠 0 裁切。
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

const STEP_IDS = ["heme-1", "heme-2", "heme-3", "heme-4", "heme-5", "heme-6", "heme-7", "heme-8", "heme-9", "heme-10"];

// ===== 1) 路由 / 画布 / 计数 =====
const resp = await page.goto(`${BASE}/pathway/heme`, { waitUntil: "networkidle" });
check("路由 /pathway/heme 可达（200）", resp?.status() === 200);
const frame = page.locator("svg[data-frame='heme']");
check("挂图 svg 存在且唯一", (await frame.count()) === 1);
check("报头 PLATE 19 · SF-19", (await page.locator(".plate-no").innerText()).includes("PLATE 19"));
check("画布原生 1360×720", (await frame.getAttribute("width")) === "1360" && (await frame.getAttribute("height")) === "720");
check(
  "四区室泳道 cyto / mito-1 / mito-2 / er",
  (await frame.getAttribute("data-lanes")) === "cyto,mito-1,mito-2,er",
  await frame.getAttribute("data-lanes"),
);
check("data-step-count = 10", (await frame.getAttribute("data-step-count")) === "10");
check("data-node-count = 14", (await frame.getAttribute("data-node-count")) === "14");
check("无控制台报错", errors.length === 0, errors.slice(0, 3).join(" | "));

// ===== 2) 10 步标签与 14 节点齐全 =====
const stepIds = await frame.locator("[data-step-id]").evaluateAll((els) =>
  [...new Set(els.map((el) => el.getAttribute("data-step-id")))],
);
check(
  "图上 10 个步骤 id 齐全（去重）",
  stepIds.length === 10 && STEP_IDS.every((id) => stepIds.includes(id)),
  stepIds.join(","),
);
const nodeIds = await frame.locator("[data-node-id]").evaluateAll((els) =>
  [...new Set(els.map((el) => el.getAttribute("data-node-id")))],
);
check("图上 14 个节点 id（去重）", nodeIds.length === 14, String(nodeIds.length));
check("起始底物甘氨酸 / 琥珀酰-CoA 节点存在", nodeIds.includes("gly") && nodeIds.includes("succoa"));
check("降解段胆绿素 / 胆红素节点存在", nodeIds.includes("biliverdin") && nodeIds.includes("bilirubin"));

// ===== 3) 点击步骤 → 详情栏（含酶 / 区室 / 定性 ΔG） =====
await frame.locator(".step-badge[data-step-id='heme-1']").click();
await page.waitForTimeout(120);
check("点击 heme-1 后详情栏出现步骤名", (await page.locator(".d-step").first().innerText()).includes("ALA 合酶"));
check("详情栏酶名含 δ-氨基乙酰丙酸合酶", (await page.locator(".d-enzyme").first().innerText()).includes("δ-氨基乙酰丙酸合酶"));
const stepText = await page.locator(".d-step").first().innerText();
check("详情栏标「不可逆」与线粒体起始", stepText.includes("不可逆") && stepText.includes("线粒体 · 合成起始"), stepText.replace(/\n/g, " "));
const dgText = await page.locator("[data-dg='1']").first().innerText();
check("ΔG 只给定性、不含数值", dgText.includes("定性") && !/[-−]?\d+(\.\d+)?\s*kJ/i.test(dgText), dgText.replace(/\n/g, " "));
check("无「待结构核验」占位", !(await page.locator("body").innerText()).includes("待结构核验"));
check("全图只做 2D：无 3D 切换控件", (await page.locator("[data-3d-toggle], .d-3d-toggle, button:has-text('3D')").count()) === 0);
check("2D-only 说明存在（不登记 PDB）", (await page.locator("[data-2d-only='1']").first().innerText()).includes("PDB"));

// ===== 4) 接口面板只指向真实步骤 =====
const interfaces = page.locator("[data-chain-interfaces='1'] [data-interface-step]");
check("接口面板 2 条", (await interfaces.count()) === 2, String(await interfaces.count()));
const ifaceIds = await interfaces.evaluateAll((els) => els.map((el) => el.getAttribute("data-interface-step")).sort());
check("接口 id 为 oc-1 / tca-4", ifaceIds.join(",") === "oc-1,tca-4", ifaceIds.join(","));
const ifaceHrefs = await interfaces.locator("a").evaluateAll((els) => els.map((a) => a.getAttribute("href")));
check("接口链接均为「既有通路?step=」", ifaceHrefs.every((h) => h && h.includes("?step=")), ifaceHrefs.join(","));

// ===== 5) 节点点击 → 打开该节点所属步骤 =====
await frame.locator("[data-node-id='gly']").first().click();
await page.waitForTimeout(120);
check("点击节点 gly 打开 heme-1 步骤详情", (await page.locator(".d-enzyme").first().innerText()).includes("δ-氨基乙酰丙酸合酶"));
await frame.locator("[data-node-id='bilirubin']").first().click();
await page.waitForTimeout(120);
check("点击节点 bilirubin 打开 heme-10（BVR）", (await page.locator(".d-enzyme").first().innerText()).includes("胆绿素还原酶"));

// ===== 6) ?step= 深链还原 =====
await page.goto(`${BASE}/pathway/heme?step=heme-9`, { waitUntil: "networkidle" });
check("?step=heme-9 直接还原详情", (await page.locator(".d-enzyme").first().innerText()).includes("血红素加氧酶"));
check(
  "深链还原后结构对照入口指向 heme-9",
  (await page.locator("[data-testid='chain-structure-cmp-entry']").getAttribute("data-cmp-step")) === "heme-9",
);

// ===== 7) 结构与分子档案入口 =====
check("步骤详情有「看这一步的结构对照」入口", (await page.locator("[data-testid='chain-structure-cmp-entry']").count()) === 1);
// 新物质均无档案，不硬造入口；heme-1 的甘氨酸 / 琥珀酰-CoA 已有档案，入口应出现
await page.goto(`${BASE}/pathway/heme?step=heme-1`, { waitUntil: "networkidle" });
const profileEntry = page.locator("[data-testid='chain-molecule-archive-entry-profile']");
check(
  "heme-1 有「本步物质简介」入口且指向 /molecule/:id",
  (await profileEntry.count()) === 1 && (await profileEntry.getAttribute("href")).startsWith("/molecule/"),
);
await page.goto(`${BASE}/pathway/heme?step=heme-9`, { waitUntil: "networkidle" });
check(
  "heme-9 的新物质无档案时不硬造「物质简介」入口",
  (await page.locator("[data-testid='chain-molecule-archive-entry-profile']").count()) === 0,
);

// ===== 8) 结构页 SF-19 可达 =====
const sresp = await page.goto(`${BASE}/structures/heme`, { waitUntil: "networkidle" });
check("路由 /structures/heme 可达（200）", sresp?.status() === 200);
check("结构页标 SF-19", (await page.locator(".plate-no").innerText()).includes("SF-19"));
const cmpIds = await page.locator("[data-step-id]").evaluateAll((els) => [...new Set(els.map((el) => el.getAttribute("data-step-id")))]);
check(
  "结构页 10 块对照（heme-1…heme-10）",
  cmpIds.length === 10 && STEP_IDS.every((id) => cmpIds.includes(id)),
  cmpIds.join(","),
);
check("结构页无「待结构核验」占位", !(await page.locator("body").innerText()).includes("待结构核验"));

// ===== 9) 1440 无横向溢出 + 截图 =====
await page.goto(`${BASE}/pathway/heme`, { waitUntil: "networkidle" });
await page.waitForTimeout(200);
const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
check("1440 宽无横向溢出", overflow <= 1, `scrollWidth 超出 ${overflow}px`);
await page.screenshot({ path: join(ROOT, "preview", "poster-heme-1440.png") });
await page.screenshot({ path: join(ROOT, "preview", "poster-heme.png"), fullPage: true });
console.log("✓ 截图 preview/poster-heme-1440.png / poster-heme.png");

// ===== 10) 版式审计交叉核对 =====
let audit = null;
try {
  audit = JSON.parse(readFileSync(join(ROOT, "preview", "layout-audit.json"), "utf8"));
} catch {
  console.log("· 未找到 preview/layout-audit.json，跳过交叉核对（请先跑 audit-layout --tag after）");
}
if (audit) {
  const entry = audit.pages?.find((p) => p.page === "heme");
  if (!entry) {
    console.log("· preview/layout-audit.json 为旧报告（不含 heme 页），跳过交叉核对；收尾跑 audit-layout --tag after 后复跑本脚本");
  } else {
    const clipped = entry.clipped.length + (entry.svgClipped?.length ?? 0);
    check(
      "audit-layout：/pathway/heme 0 重叠 / 0 裁切",
      entry.significantOverlaps.length === 0 && clipped === 0,
      `重叠 ${entry.significantOverlaps.length}｜裁切 ${clipped}`,
    );
  }
}

check("全程无控制台报错", errors.length === 0, errors.slice(0, 3).join(" | "));

await browser.close();
process.exit(failed ? 1 : 0);
