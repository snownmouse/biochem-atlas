// 氧化还原与自由基挂图冒烟（PLATE 22 · SF-22）。
// 校验口径：路由可达、6 步、2 区室（线粒体 / 胞质）、10 节点、8 连线、
// 节点 / 步骤点击语义、?step= 深链还原、接口面板只指向真实步骤（gk-1 / ppp-o1）、
// 页面上有「防御网络 / 不属于经典代谢通路」声明、全图只做 2D（无 3D 开关、无「待结构核验」）、
// 结构页 SF-22 6 块、1440 无横向溢出、audit-layout 本页 0 重叠 0 裁切。
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

const STEP_IDS = ["rd-1", "rd-2", "rd-3", "rd-4", "rd-5", "rd-6"];

// ===== 1) 路由 / 画布 / 计数 =====
const resp = await page.goto(`${BASE}/pathway/redox`, { waitUntil: "networkidle" });
check("路由 /pathway/redox 可达（200）", resp?.status() === 200);
const frame = page.locator("svg[data-frame='redox']");
check("挂图 svg 存在且唯一", (await frame.count()) === 1);
check("报头 PLATE 22 · SF-22", (await page.locator(".plate-no").innerText()).includes("PLATE 22"));
check("画布原生 1360×720", (await frame.getAttribute("width")) === "1360" && (await frame.getAttribute("height")) === "720");
check(
  "两区室泳道 mito / cyto",
  (await frame.getAttribute("data-lanes")) === "mito,cyto",
  await frame.getAttribute("data-lanes"),
);
check("data-step-count = 6", (await frame.getAttribute("data-step-count")) === "6");
check("data-node-count = 10", (await frame.getAttribute("data-node-count")) === "10");
check("无控制台报错", errors.length === 0, errors.slice(0, 3).join(" | "));

// ===== 2) 定位声明：防御网络 / 不属于经典代谢通路 =====
const bodyText = await page.locator("body").innerText();
check("页面写明「防御网络」", bodyText.includes("防御网络"));
check("页面写明「不属于经典代谢通路」", bodyText.includes("不属于经典代谢通路"));
check("页面写明不展开信号转导", bodyText.includes("信号转导"));

// ===== 3) 6 步、10 节点、无运输段 =====
const stepIds = await frame.locator("[data-step-id]").evaluateAll((els) =>
  [...new Set(els.map((el) => el.getAttribute("data-step-id")))],
);
check(
  "图上 6 个步骤 id 齐全（去重）",
  stepIds.length === 6 && STEP_IDS.every((id) => stepIds.includes(id)),
  stepIds.join(","),
);
const nodeIds = await frame.locator("[data-node-id]").evaluateAll((els) =>
  [...new Set(els.map((el) => el.getAttribute("data-node-id")))],
);
check("图上 10 个节点 id（去重）", nodeIds.length === 10, String(nodeIds.length));
check(
  "ROS 主干节点齐全",
  ["o2", "o2m", "h2o2", "h2o", "gsh", "gssg", "nadph", "nadp"].every((id) => nodeIds.includes(id)),
);
check("本图不设运输段", (await frame.locator("[data-transport-id]").count()) === 0);

// ===== 4) 点击步骤 → 详情栏（含酶 / 区室 / 定性 ΔG） =====
await frame.locator(".step-badge[data-step-id='rd-2']").click();
await page.waitForTimeout(120);
check("点击 rd-2 后详情栏出现酶名", (await page.locator(".d-enzyme").first().innerText()).includes("超氧化物歧化酶"));
const stepText = await page.locator(".d-step").first().innerText();
check("详情栏标「不可逆」与线粒体", stepText.includes("不可逆") && stepText.includes("线粒体"), stepText.replace(/\n/g, " "));
const dgText = await page.locator("[data-dg='1']").first().innerText();
check("ΔG 只给定性、不含数值", dgText.includes("定性") && !/[-−]?\d+(\.\d+)?\s*kJ/i.test(dgText), dgText.replace(/\n/g, " "));
check("无「待结构核验」占位", !bodyText.includes("待结构核验"));
check("全图只做 2D：无 3D 切换控件", (await page.locator("[data-3d-toggle], .d-3d-toggle, button:has-text('3D')").count()) === 0);
check("2D-only 说明存在（不登记 PDB）", (await page.locator("[data-2d-only='1']").first().innerText()).includes("PDB"));

// ===== 5) 接口面板只指向真实步骤 =====
const interfaces = page.locator("[data-chain-interfaces='1'] [data-interface-step]");
check("接口面板 2 条", (await interfaces.count()) === 2, String(await interfaces.count()));
const ifaceIds = await interfaces.evaluateAll((els) => els.map((el) => el.getAttribute("data-interface-step")).sort());
check("接口 id 为 gk-1 / ppp-o1", ifaceIds.join(",") === "gk-1,ppp-o1", ifaceIds.join(","));
const ifaceHrefs = await interfaces.locator("a").evaluateAll((els) => els.map((a) => a.getAttribute("href")));
check("接口链接均为「既有通路?step=」", ifaceHrefs.every((h) => h && h.includes("?step=")), ifaceHrefs.join(","));

// ===== 6) 节点点击 → 打开该节点所属步骤 =====
await frame.locator("[data-node-id='gsh']").first().click();
await page.waitForTimeout(120);
check("点击节点 gsh 打开 rd-4（谷胱甘肽还原酶）", (await page.locator(".d-enzyme").first().innerText()).includes("谷胱甘肽还原酶"));
await frame.locator("[data-node-id='h2o2']").first().click();
await page.waitForTimeout(120);
check("点击节点 h2o2 打开 rd-2（SOD）", (await page.locator(".d-enzyme").first().innerText()).includes("超氧化物歧化酶"));

// ===== 7) ?step= 深链还原 =====
await page.goto(`${BASE}/pathway/redox?step=rd-6`, { waitUntil: "networkidle" });
check("?step=rd-6 直接还原详情", (await page.locator(".d-enzyme").first().innerText()).includes("葡萄糖-6-磷酸脱氢酶"));
check(
  "深链还原后结构对照入口指向 rd-6",
  (await page.locator("[data-testid='chain-structure-cmp-entry']").getAttribute("data-cmp-step")) === "rd-6",
);

// ===== 8) 结构页 SF-22 可达 =====
const sresp = await page.goto(`${BASE}/structures/redox`, { waitUntil: "networkidle" });
check("路由 /structures/redox 可达（200）", sresp?.status() === 200);
check("结构页标 SF-22", (await page.locator(".plate-no").innerText()).includes("SF-22"));
const cmpIds = await page.locator("[data-step-id]").evaluateAll((els) => [...new Set(els.map((el) => el.getAttribute("data-step-id")))]);
check(
  "结构页 6 块对照（rd-1…rd-6）",
  cmpIds.length === 6 && STEP_IDS.every((id) => cmpIds.includes(id)),
  cmpIds.join(","),
);
check("结构页无「待结构核验」占位", !(await page.locator("body").innerText()).includes("待结构核验"));

// ===== 9) 1440 无横向溢出 + 截图 =====
await page.goto(`${BASE}/pathway/redox`, { waitUntil: "networkidle" });
await page.waitForTimeout(200);
const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
check("1440 宽无横向溢出", overflow <= 1, `scrollWidth 超出 ${overflow}px`);
await page.screenshot({ path: join(ROOT, "preview", "poster-redox-1440.png") });
await page.screenshot({ path: join(ROOT, "preview", "poster-redox.png"), fullPage: true });
console.log("✓ 截图 preview/poster-redox-1440.png / poster-redox.png");

// ===== 10) 版式审计交叉核对 =====
let audit = null;
try {
  audit = JSON.parse(readFileSync(join(ROOT, "preview", "layout-audit.json"), "utf8"));
} catch {
  console.log("· 未找到 preview/layout-audit.json，跳过交叉核对（请先跑 audit-layout --tag after）");
}
if (audit) {
  const entry = audit.pages?.find((p) => p.page === "redox");
  if (!entry) {
    console.log("· preview/layout-audit.json 为旧报告（不含 redox 页），跳过交叉核对；收尾跑 audit-layout --tag after 后复跑本脚本");
  } else {
    const clipped = entry.clipped.length + (entry.svgClipped?.length ?? 0);
    check(
      "audit-layout：/pathway/redox 0 重叠 / 0 裁切",
      entry.significantOverlaps.length === 0 && clipped === 0,
      `重叠 ${entry.significantOverlaps.length}｜裁切 ${clipped}`,
    );
  }
}

check("全程无控制台报错", errors.length === 0, errors.slice(0, 3).join(" | "));

await browser.close();
process.exit(failed ? 1 : 0);
