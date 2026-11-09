// 甘油磷脂与鞘脂代谢挂图冒烟（PLATE 17 · SF-17）。
// 校验口径：路由可达、15 步两区室（er 14 + golgi 1）、35 节点、步骤 / 节点点击语义、
// ?step= 深链还原、3 条接口只指向真实步骤、全图只做 2D（无 3D 开关、无「待结构核验」）、
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
const resp = await page.goto(`${BASE}/pathway/glycerophospholipid`, { waitUntil: "networkidle" });
check("路由 /pathway/glycerophospholipid 可达（200）", resp?.status() === 200);
const frame = page.locator("svg[data-frame='glycerophospholipid']");
check("挂图 svg 存在且唯一", (await frame.count()) === 1);
check("报头 PLATE 17 · SF-17", (await page.locator(".plate-no").innerText()).includes("PLATE 17"));
check(
  "画布原生 1360×860",
  (await frame.getAttribute("width")) === "1360" && (await frame.getAttribute("height")) === "860",
  `${await frame.getAttribute("width")}×${await frame.getAttribute("height")}`,
);
check("两区室泳道 er,golgi", (await frame.getAttribute("data-lanes")) === "er,golgi", await frame.getAttribute("data-lanes"));
check("data-step-count = 15", (await frame.getAttribute("data-step-count")) === "15", await frame.getAttribute("data-step-count"));
check("data-node-count = 35", (await frame.getAttribute("data-node-count")) === "35", await frame.getAttribute("data-node-count"));
check("无控制台报错", errors.length === 0, errors.slice(0, 3).join(" | "));

// ===== 2) 15 步与节点标签齐全 =====
const STEP_IDS = ["gpl-1", "gpl-2", "gpl-3", "gpl-4", "gpl-5", "gpl-6", "gpl-7", "gpl-8", "gpl-9", "gpl-10", "gpl-11", "gpl-12", "gpl-13", "gpl-14", "gpl-15"];
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
check("图上 35 个节点 id（去重）", nodeIds.length === 35, String(nodeIds.length));

// ===== 3) 点击 gpl-7（PEMT）→ 详情栏 =====
await frame.locator(".step-badge[data-step-id='gpl-7']").click();
await page.waitForTimeout(120);
const dStep = await page.locator(".d-step").first().innerText();
check("点击 gpl-7 后详情栏出现甲基转移酶步骤", dStep.includes("甲基转移酶"), dStep.replace(/\n/g, " "));
const dEnzyme = await page.locator(".d-enzyme").first().innerText();
check("详情栏酶名含 PEMT", dEnzyme.includes("PEMT"), dEnzyme.replace(/\n/g, " "));
const bodyText = await page.locator("body").innerText();
check("详情栏 EC 2.1.1.17", dEnzyme.includes("2.1.1.17") || bodyText.includes("2.1.1.17"));
check("详情栏标「内质网」", dStep.includes("内质网"), dStep.replace(/\n/g, " "));
const dgText = await page.locator("[data-dg='1']").first().innerText();
check("ΔG 只给定性、不含数值", dgText.includes("定性") && !/[-−]?\d+(\.\d+)?\s*kJ/i.test(dgText), dgText.replace(/\n/g, " "));
check("无「待结构核验」占位", !bodyText.includes("待结构核验"));
check("全图只做 2D：无 3D 切换控件", (await page.locator("[data-3d-toggle], .d-3d-toggle, button:has-text('3D')").count()) === 0);
check("2D-only 说明存在（不登记 PDB）", (await page.locator("[data-2d-only='1']").first().innerText()).includes("PDB"));

// ===== 4) 接口面板 3 条，只指向真实步骤 =====
const interfaces = page.locator("[data-chain-interfaces='1'] [data-interface-step]");
check("接口面板 3 条", (await interfaces.count()) === 3, String(await interfaces.count()));
const ifaceIds = await interfaces.evaluateAll((els) => els.map((el) => el.getAttribute("data-interface-step")));
check("接口 id 为 pyr-9 / aa-7 / oc-6", ["pyr-9", "aa-7", "oc-6"].every((id) => ifaceIds.includes(id)), ifaceIds.join(","));
const ifaceHrefs = await interfaces.locator("a").evaluateAll((els) => els.map((a) => a.getAttribute("href")));
check("接口链接均为「既有通路?step=」", ifaceHrefs.every((h) => h && h.includes("?step=")), ifaceHrefs.join(","));

// ===== 5) 节点点击 → 打开该节点所属步骤 =====
await frame.locator("[data-node-id='dhcer'] circle").first().click();
await page.waitForTimeout(120);
check("点击节点 dhcer 打开 gpl-13 步骤详情", (await page.locator(".d-enzyme").first().innerText()).includes("CERS"));
const cersText = await page.locator(".d-eq").first().innerText();
check("gpl-13 反应式写明产物是二氢神经酰胺", cersText.includes("二氢神经酰胺"), cersText.replace(/\n/g, " "));
await frame.locator("[data-node-id='cer']").first().click();
await page.waitForTimeout(120);
check("点击节点 cer 打开 gpl-14（DES）步骤详情", (await page.locator(".d-enzyme").first().innerText()).includes("去饱和酶"));

// ===== 6) ?step= 深链还原 =====
await page.goto(`${BASE}/pathway/glycerophospholipid?step=gpl-15`, { waitUntil: "networkidle" });
check("?step=gpl-15 直接还原详情", (await page.locator(".d-enzyme").first().innerText()).includes("SMS"));
const deepStep = await page.locator(".d-step").first().innerText();
check("gpl-15 详情标「高尔基体」", deepStep.includes("高尔基体"), deepStep.replace(/\n/g, " "));
check(
  "深链还原后结构对照入口指向 gpl-15",
  (await page.locator("[data-testid='chain-structure-cmp-entry']").getAttribute("data-cmp-step")) === "gpl-15",
);

// ===== 7) 结构对照入口 =====
check("步骤详情有「看这一步的结构对照」入口", (await page.locator("[data-testid='chain-structure-cmp-entry']").count()) === 1);

// ===== 8) 结构页 SF-17 可达 =====
const sresp = await page.goto(`${BASE}/structures/glycerophospholipid`, { waitUntil: "networkidle" });
check("路由 /structures/glycerophospholipid 可达（200）", sresp?.status() === 200);
check("结构页标 SF-17", (await page.locator(".plate-no").innerText()).includes("SF-17"));
const cmpIds = await page.locator("[data-step-id]").evaluateAll((els) => [...new Set(els.map((el) => el.getAttribute("data-step-id")))]);
check(
  "结构页 15 块对照（gpl-1…gpl-15）",
  cmpIds.length === 15 && STEP_IDS.every((id) => cmpIds.includes(id)),
  cmpIds.join(","),
);
check("结构页无「待结构核验」占位", !(await page.locator("body").innerText()).includes("待结构核验"));

// ===== 9) 1440 无横向溢出 + 截图 =====
await page.goto(`${BASE}/pathway/glycerophospholipid`, { waitUntil: "networkidle" });
await page.waitForTimeout(200);
const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
check("1440 宽无横向溢出", overflow <= 1, `scrollWidth 超出 ${overflow}px`);
await page.screenshot({ path: join(ROOT, "preview", "poster-glycerophospholipid-1440.png") });
await page.screenshot({ path: join(ROOT, "preview", "poster-glycerophospholipid.png"), fullPage: true });
console.log("✓ 截图 preview/poster-glycerophospholipid-1440.png / poster-glycerophospholipid.png");

// ===== 10) 版式审计交叉核对（audit-layout 由外部单独运行，结果写在 preview/） =====
let audit = null;
try {
  audit = JSON.parse(readFileSync(join(ROOT, "preview", "layout-audit.json"), "utf8"));
} catch {
  console.log("· 未找到 preview/layout-audit.json，跳过交叉核对（请先跑 audit-layout --tag after）");
}
if (audit) {
  const entry = audit.pages?.find((p) => p.page === "glycerophospholipid");
  if (!entry) {
    console.log("· preview/layout-audit.json 为旧报告（不含 glycerophospholipid 页），跳过交叉核对；收尾跑 audit-layout --tag after 后复跑本脚本");
  } else {
    const clipped = entry.clipped.length + (entry.svgClipped?.length ?? 0);
    check(
      "audit-layout：/pathway/glycerophospholipid 0 重叠 / 0 裁切",
      entry.significantOverlaps.length === 0 && clipped === 0,
      `重叠 ${entry.significantOverlaps.length}｜裁切 ${clipped}`,
    );
  }
}

check("全程无控制台报错", errors.length === 0, errors.slice(0, 3).join(" | "));

await browser.close();
process.exit(failed ? 1 : 0);
