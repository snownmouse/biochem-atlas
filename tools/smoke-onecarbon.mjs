// 一碳单位代谢挂图冒烟（PLATE 14 · SF-14）。
// 校验口径：路由可达、9 步 + 1 段运输、2 区室、22 节点、三态（步骤 / 节点 / 运输段）点击语义、
// ?step= 深链还原、接口面板只指向真实步骤、全图只做 2D（无 3D 开关、无「待结构核验」）、
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

// ===== 1) 路由 / 画布 / 计数 =====
const resp = await page.goto(`${BASE}/pathway/one-carbon`, { waitUntil: "networkidle" });
check("路由 /pathway/one-carbon 可达（200）", resp?.status() === 200);
const frame = page.locator("svg[data-frame='one-carbon']");
check("挂图 svg 存在且唯一", (await frame.count()) === 1);
check("报头 PLATE 14 · SF-14", (await page.locator(".plate-no").innerText()).includes("PLATE 14"));
check("画布原生 1360×640", (await frame.getAttribute("width")) === "1360" && (await frame.getAttribute("height")) === "640");
check("两区室泳道 mito / cyto", (await frame.getAttribute("data-lanes")) === "mito,cyto");
check("data-step-count = 9", (await frame.getAttribute("data-step-count")) === "9");
check("data-node-count = 22", (await frame.getAttribute("data-node-count")) === "22");
check("无控制台报错", errors.length === 0, errors.slice(0, 3).join(" | "));

// ===== 2) 9 步标签齐全 =====
const STEP_IDS = ["oc-1", "oc-2", "oc-3", "oc-4", "oc-5", "oc-6", "oc-7", "oc-8", "oc-9"];
const stepIds = await frame.locator("[data-step-id]").evaluateAll((els) =>
  [...new Set(els.map((el) => el.getAttribute("data-step-id")))]
);
check(
  "图上 9 个步骤 id 齐全（去重，运输段不计入）",
  stepIds.filter((id) => !id.startsWith("oc-t")).length === 9 && STEP_IDS.every((id) => stepIds.includes(id)),
  stepIds.join(","),
);
check("运输段命中带存在（1 块点击面 + 2 条边）", (await frame.locator("[data-transport-id='oc-t1']").count()) >= 3, String(await frame.locator("[data-transport-id='oc-t1']").count()));

const nodeIds = await frame.locator("[data-node-id]").evaluateAll((els) =>
  [...new Set(els.map((el) => el.getAttribute("data-node-id")))]
);
check("图上 22 个节点 id（去重）", nodeIds.length === 22, String(nodeIds.length));
check("跨膜物质是甲酸（formate 节点存在）", nodeIds.includes("formate"));
check("甜菜碱 / 二甲基甘氨酸节点存在", nodeIds.includes("betaine") && nodeIds.includes("dimethylglycine"));

// ===== 3) 点击步骤 → 详情栏（含酶 / 区室 / 定性 ΔG） =====
await frame.locator(".step-badge[data-step-id='oc-4']").click();
await page.waitForTimeout(120);
check("点击 oc-4 后详情栏出现步骤名", (await page.locator(".d-step").first().innerText()).includes("MTHFR"));
check("详情栏酶名含 MTHFR", (await page.locator(".d-enzyme").first().innerText()).includes("MTHFR"));
check(
  "详情栏标「不可逆」与「细胞质」",
  (await page.locator(".d-step").first().innerText()).includes("不可逆") &&
    (await page.locator(".d-step").first().innerText()).includes("细胞质"),
);
const dgText = await page.locator("[data-dg='1']").first().innerText();
check("ΔG 只给定性、不含数值", dgText.includes("定性") && !/[-−]?\d+(\.\d+)?\s*kJ/i.test(dgText), dgText.replace(/\n/g, " "));
check("无「待结构核验」占位", !(await page.locator("body").innerText()).includes("待结构核验"));
check("全图只做 2D：无 3D 切换控件", (await page.locator("[data-3d-toggle], .d-3d-toggle, button:has-text('3D')").count()) === 0);
check("2D-only 说明存在（不登记 PDB）", (await page.locator("[data-2d-only='1']").first().innerText()).includes("PDB"));

// ===== 4) 接口面板只指向真实步骤 =====
const interfaces = page.locator("[data-chain-interfaces='1'] [data-interface-step]");
check("接口面板 1 条", (await interfaces.count()) === 1, String(await interfaces.count()));
const ifaceIds = await interfaces.evaluateAll((els) => els.map((el) => el.getAttribute("data-interface-step")));
check("接口 id 为 aa-7（转硫支路）", ifaceIds.includes("aa-7"), ifaceIds.join(","));
const ifaceHrefs = await interfaces.locator("a").evaluateAll((els) => els.map((a) => a.getAttribute("href")));
check("接口链接均为「既有通路?step=」", ifaceHrefs.every((h) => h && h.includes("?step=")), ifaceHrefs.join(","));

// ===== 5) 运输段三态语义 =====
// 运输点击面覆盖 3 个节点，曲线包围盒中心落空；这里点带内左下空白（避开 10-甲酰THF/甲酸节点与其标签）
const transportBand = frame.locator("g[data-transport-id='oc-t1'] rect");
const bandBox = await transportBand.boundingBox();
if (!bandBox) throw new Error("运输段点击面没有布局盒");
await transportBand.click({
  position: { x: Math.round(bandBox.width * 0.08), y: Math.round(bandBox.height * 0.75) },
});
await page.waitForTimeout(120);
check("点击运输段 → 运输详情面板", (await page.locator("[data-transport-detail='1']").count()) === 1);
const transportText = await page.locator("[data-transport-detail='1']").innerText();
check("运输详情写明线粒体、甲酸与不计入步数", transportText.includes("线粒体") && transportText.includes("甲酸") && transportText.includes("不计入步数"));

// ===== 6) 节点点击 → 打开该节点所属步骤 =====
await frame.locator("[data-node-id='sam']").first().click();
await page.waitForTimeout(120);
check("点击节点 sam 打开 oc-6 步骤详情", (await page.locator(".d-enzyme").first().innerText()).includes("甲硫氨酸腺苷转移酶"));
await frame.locator("[data-node-id='betaine']").first().click();
await page.waitForTimeout(120);
check("点击节点 betaine 打开 oc-9（BHMT）", (await page.locator(".d-enzyme").first().innerText()).includes("甜菜碱-同型半胱氨酸甲基转移酶"));

// ===== 7) ?step= 深链还原 =====
await page.goto(`${BASE}/pathway/one-carbon?step=oc-5`, { waitUntil: "networkidle" });
check("?step=oc-5 直接还原详情", (await page.locator(".d-enzyme").first().innerText()).includes("MTR"));
check(
  "深链还原后结构对照入口指向 oc-5",
  (await page.locator("[data-testid='chain-structure-cmp-entry']").getAttribute("data-cmp-step")) === "oc-5",
);

// ===== 8) 结构与分子档案入口 =====
check("步骤详情有「看这一步的结构对照」入口", (await page.locator("[data-testid='chain-structure-cmp-entry']").count()) === 1);
check("步骤详情有「本步物质简介」入口", (await page.locator("[data-testid='chain-molecule-archive-entry-profile']").count()) === 1);

// ===== 9) 结构页 SF-14 可达 =====
const sresp = await page.goto(`${BASE}/structures/one-carbon`, { waitUntil: "networkidle" });
check("路由 /structures/one-carbon 可达（200）", sresp?.status() === 200);
check("结构页标 SF-14", (await page.locator(".plate-no").innerText()).includes("SF-14"));
const cmpIds = await page.locator("[data-step-id]").evaluateAll((els) => [...new Set(els.map((el) => el.getAttribute("data-step-id")))]);
check(
  "结构页 9 块对照（oc-1…oc-9）",
  cmpIds.length === 9 && STEP_IDS.every((id) => cmpIds.includes(id)),
  cmpIds.join(","),
);
check("结构页无「待结构核验」占位", !(await page.locator("body").innerText()).includes("待结构核验"));

// ===== 10) 1440 无横向溢出 + 截图 =====
await page.goto(`${BASE}/pathway/one-carbon`, { waitUntil: "networkidle" });
await page.waitForTimeout(200);
const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
check("1440 宽无横向溢出", overflow <= 1, `scrollWidth 超出 ${overflow}px`);
await page.screenshot({ path: join(ROOT, "preview", "poster-one-carbon-1440.png") });
await page.screenshot({ path: join(ROOT, "preview", "poster-one-carbon.png"), fullPage: true });
console.log("✓ 截图 preview/poster-one-carbon-1440.png / poster-one-carbon.png");

// ===== 11) 版式审计交叉核对（audit-layout 由外部单独运行，结果写在 preview/） =====
let audit = null;
try {
  audit = JSON.parse(readFileSync(join(ROOT, "preview", "layout-audit.json"), "utf8"));
} catch {
  console.log("· 未找到 preview/layout-audit.json，跳过交叉核对（请先跑 audit-layout --tag after）");
}
if (audit) {
  const entry = audit.pages?.find((p) => p.page === "one-carbon");
  if (!entry) {
    // 单张施工期不重跑 audit-layout：旧报告里没有本页属正常，收尾统一跑 after 时本断言必须真正执行。
    console.log("· preview/layout-audit.json 为旧报告（不含 one-carbon 页），跳过交叉核对；收尾跑 audit-layout --tag after 后复跑本脚本");
  } else {
    const clipped = entry.clipped.length + (entry.svgClipped?.length ?? 0);
    check(
      "audit-layout：/pathway/one-carbon 0 重叠 / 0 裁切",
      entry.significantOverlaps.length === 0 && clipped === 0,
      `重叠 ${entry.significantOverlaps.length}｜裁切 ${clipped}`,
    );
  }
}

check("全程无控制台报错", errors.length === 0, errors.slice(0, 3).join(" | "));

await browser.close();
process.exit(failed ? 1 : 0);
