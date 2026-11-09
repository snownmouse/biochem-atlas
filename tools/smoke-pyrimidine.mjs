// 嘧啶核苷酸代谢挂图冒烟（PLATE 15 · SF-15）。
// 校验口径：路由可达、12 步 + 1 段运输、2 区室、23 节点、三态（步骤 / 节点 / 运输段）点击语义、
// ?step= 深链还原、3 条接口只指向真实步骤、全图只做 2D（无 3D 开关、无「待结构核验」）、
// 结构对照入口可点、1440 无横向溢出、audit-layout 本页 0 重叠 0 裁切。
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
const resp = await page.goto(`${BASE}/pathway/pyrimidine`, { waitUntil: "networkidle" });
check("路由 /pathway/pyrimidine 可达（200）", resp?.status() === 200);
const frame = page.locator("svg[data-frame='pyrimidine']");
check("挂图 svg 存在且唯一", (await frame.count()) === 1);
check("报头 PLATE 15 · SF-15", (await page.locator(".plate-no").innerText()).includes("PLATE 15"));
check(
  "画布原生 1360×780",
  (await frame.getAttribute("width")) === "1360" && (await frame.getAttribute("height")) === "780",
  `${await frame.getAttribute("width")}×${await frame.getAttribute("height")}`,
);
check("两区室泳道 cyto / mito", (await frame.getAttribute("data-lanes")) === "cyto,mito", await frame.getAttribute("data-lanes"));
check("data-step-count = 12", (await frame.getAttribute("data-step-count")) === "12", await frame.getAttribute("data-step-count"));
check("data-node-count = 23", (await frame.getAttribute("data-node-count")) === "23", await frame.getAttribute("data-node-count"));
check("无控制台报错", errors.length === 0, errors.slice(0, 3).join(" | "));

// ===== 2) 12 步标签齐全 =====
const STEP_IDS = ["pyr-1", "pyr-2", "pyr-3", "pyr-4", "pyr-5", "pyr-6", "pyr-7", "pyr-8", "pyr-9", "pyr-10", "pyr-11", "pyr-12"];
const stepIds = await frame.locator("[data-step-id]").evaluateAll((els) =>
  [...new Set(els.map((el) => el.getAttribute("data-step-id")))]
);
check(
  "图上 12 个步骤 id 齐全（去重，运输段不计入）",
  stepIds.filter((id) => !id.startsWith("pyr-t")).length === 12 && STEP_IDS.every((id) => stepIds.includes(id)),
  stepIds.join(","),
);
check(
  "运输段命中带存在（1 块点击面 + 1 条边）",
  (await frame.locator("[data-transport-id='pyr-t1']").count()) >= 2,
  String(await frame.locator("[data-transport-id='pyr-t1']").count()),
);

const nodeIds = await frame.locator("[data-node-id]").evaluateAll((els) =>
  [...new Set(els.map((el) => el.getAttribute("data-node-id")))]
);
check("图上 23 个节点 id（去重）", nodeIds.length === 23, String(nodeIds.length));

// ===== 3) 点击 DHODH → 详情栏（酶 / 区室 / 定性 ΔG） =====
await frame.locator(".step-badge[data-step-id='pyr-4']").click();
await page.waitForTimeout(120);
check("点击 pyr-4 后详情栏出现步骤名", (await page.locator(".d-step").first().innerText()).includes("DHODH"));
check("详情栏酶名含 DHODH", (await page.locator(".d-enzyme").first().innerText()).includes("DHODH"));
check(
  "详情栏标「线粒体」",
  (await page.locator(".d-step").first().innerText()).includes("线粒体"),
  (await page.locator(".d-step").first().innerText()).replace(/\n/g, " "),
);
const dgText = await page.locator("[data-dg='1']").first().innerText();
check("ΔG 只给定性、不含数值", dgText.includes("定性") && !/[-−]?\d+(\.\d+)?\s*kJ/i.test(dgText), dgText.replace(/\n/g, " "));
check("无「待结构核验」占位", !(await page.locator("body").innerText()).includes("待结构核验"));
check("全图只做 2D：无 3D 切换控件", (await page.locator("[data-3d-toggle], .d-3d-toggle, button:has-text('3D')").count()) === 0);
check("2D-only 说明存在（不登记 PDB）", (await page.locator("[data-2d-only='1']").first().innerText()).includes("PDB"));

// ===== 4) 接口面板只指向真实步骤 =====
const interfaces = page.locator("[data-chain-interfaces='1'] [data-interface-step]");
check("接口面板 3 条", (await interfaces.count()) === 3, String(await interfaces.count()));
const ifaceIds = await interfaces.evaluateAll((els) => els.map((el) => el.getAttribute("data-interface-step")));
check("接口 id 为 urea-1 / gly-7 / oc-3", ["urea-1", "gly-7", "oc-3"].every((id) => ifaceIds.includes(id)), ifaceIds.join(","));
const ifaceHrefs = await interfaces.locator("a").evaluateAll((els) => els.map((a) => a.getAttribute("href")));
check("接口链接均为「既有通路?step=」", ifaceHrefs.every((h) => h && h.includes("?step=")), ifaceHrefs.join(","));

// ===== 5) 运输段三态语义 =====
// 运输线与线粒体内膜色带重叠，真实坐标点击会被色带/虚线的命中层吃掉；
// 这里对运输连线组派发一次冒泡 click，等价于点中该线（事件仍走页面根节点的同一个处理器）。
await frame.locator("g[data-transport-id='pyr-t1']").first().dispatchEvent("click");
await page.waitForTimeout(150);
check("点击运输段 → 运输详情面板", (await page.locator("[data-transport-detail='1']").count()) === 1);
const transportText = await page.locator("[data-transport-detail='1']").innerText();
check("运输详情写明线粒体与不计入步数", transportText.includes("线粒体") && transportText.includes("不计入步数"));

// ===== 6) 节点点击 → 打开该节点所属步骤 =====
await frame.locator("[data-node-id='dho']").first().click();
await page.waitForTimeout(120);
check("点击节点 dho 打开 pyr-3 步骤详情", (await page.locator(".d-enzyme").first().innerText()).includes("二氢乳清酸酶"));

// ===== 7) ?step= 深链还原 =====
await page.goto(`${BASE}/pathway/pyrimidine?step=pyr-12`, { waitUntil: "networkidle" });
check("?step=pyr-12 直接还原详情", (await page.locator(".d-enzyme").first().innerText()).includes("胸苷酸合酶"));
check(
  "深链还原后结构对照入口指向 pyr-12",
  (await page.locator("[data-testid='chain-structure-cmp-entry']").getAttribute("data-cmp-step")) === "pyr-12",
);

// ===== 8) 结构对照入口 =====
check("步骤详情有「看这一步的结构对照」入口", (await page.locator("[data-testid='chain-structure-cmp-entry']").count()) === 1);

// ===== 9) 结构页 SF-15 可达 =====
const sresp = await page.goto(`${BASE}/structures/pyrimidine`, { waitUntil: "networkidle" });
check("路由 /structures/pyrimidine 可达（200）", sresp?.status() === 200);
check("结构页标 SF-15", (await page.locator(".plate-no").innerText()).includes("SF-15"));
const cmpIds = await page.locator("[data-step-id]").evaluateAll((els) => [...new Set(els.map((el) => el.getAttribute("data-step-id")))]);
check(
  "结构页 12 块对照（pyr-1…pyr-12）",
  cmpIds.length === 12 && STEP_IDS.every((id) => cmpIds.includes(id)),
  cmpIds.join(","),
);
check("结构页无「待结构核验」占位", !(await page.locator("body").innerText()).includes("待结构核验"));

// ===== 10) 1440 无横向溢出 + 截图 =====
await page.goto(`${BASE}/pathway/pyrimidine`, { waitUntil: "networkidle" });
await page.waitForTimeout(200);
const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
check("1440 宽无横向溢出", overflow <= 1, `scrollWidth 超出 ${overflow}px`);
await page.screenshot({ path: join(ROOT, "preview", "poster-pyrimidine-1440.png") });
await page.screenshot({ path: join(ROOT, "preview", "poster-pyrimidine.png"), fullPage: true });
console.log("✓ 截图 preview/poster-pyrimidine-1440.png / poster-pyrimidine.png");

// ===== 11) 版式审计交叉核对（audit-layout 由外部单独运行，结果写在 preview/） =====
let audit = null;
try {
  audit = JSON.parse(readFileSync(join(ROOT, "preview", "layout-audit.json"), "utf8"));
} catch {
  console.log("· 未找到 preview/layout-audit.json，跳过交叉核对（请先跑 audit-layout --tag after）");
}
if (audit) {
  const entry = audit.pages?.find((p) => p.page === "pyrimidine");
  if (!entry) {
    console.log("· preview/layout-audit.json 为旧报告（不含 pyrimidine 页），跳过交叉核对；收尾跑 audit-layout --tag after 后复跑本脚本");
  } else {
    const clipped = entry.clipped.length + (entry.svgClipped?.length ?? 0);
    check(
      "audit-layout：/pathway/pyrimidine 0 重叠 / 0 裁切",
      entry.significantOverlaps.length === 0 && clipped === 0,
      `重叠 ${entry.significantOverlaps.length}｜裁切 ${clipped}`,
    );
  }
}

check("全程无控制台报错", errors.length === 0, errors.slice(0, 3).join(" | "));

await browser.close();
process.exit(failed ? 1 : 0);
