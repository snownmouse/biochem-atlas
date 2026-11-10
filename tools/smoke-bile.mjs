// 胆汁酸代谢挂图冒烟（PLATE 20 · SF-20）。
// 校验口径：路由可达、6 步 + 1 段肠肝循环、4 区室、11 节点、三态（步骤 / 节点 / 运输段）点击语义、
// ?step= 深链还原、接口面板只指向真实步骤（ch-13 / oc-1）、全图只做 2D（无 3D 开关、无「待结构核验」）、
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

const STEP_IDS = ["bile-1", "bile-2", "bile-3", "bile-4", "bile-5", "bile-6"];

// ===== 1) 路由 / 画布 / 计数 =====
const resp = await page.goto(`${BASE}/pathway/bile-acid`, { waitUntil: "networkidle" });
check("路由 /pathway/bile-acid 可达（200）", resp?.status() === 200);
const frame = page.locator("svg[data-frame='bile-acid']");
check("挂图 svg 存在且唯一", (await frame.count()) === 1);
check("报头 PLATE 20 · SF-20", (await page.locator(".plate-no").innerText()).includes("PLATE 20"));
check("画布原生 1360×720", (await frame.getAttribute("width")) === "1360" && (await frame.getAttribute("height")) === "720");
check(
  "四区室泳道 er / mito / perox / entero",
  (await frame.getAttribute("data-lanes")) === "er,mito,perox,entero",
  await frame.getAttribute("data-lanes"),
);
check("data-step-count = 6", (await frame.getAttribute("data-step-count")) === "6");
check("data-node-count = 11", (await frame.getAttribute("data-node-count")) === "11");
check("无控制台报错", errors.length === 0, errors.slice(0, 3).join(" | "));

// ===== 2) 6 步标签、11 节点、运输段 =====
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
check("图上 11 个节点 id（去重）", nodeIds.length === 11, String(nodeIds.length));
check("起点胆固醇 / 结合产物节点存在", nodeIds.includes("chol") && nodeIds.includes("conj"));
check(
  "运输段命中带存在（1 块点击面 + 4 条边）",
  (await frame.locator("[data-transport-id='bile-t1']").count()) >= 5,
  String(await frame.locator("[data-transport-id='bile-t1']").count()),
);

// ===== 3) 点击步骤 → 详情栏（含酶 / 区室 / 定性 ΔG） =====
await frame.locator(".step-badge[data-step-id='bile-1']").click();
await page.waitForTimeout(120);
check("点击 bile-1 后详情栏出现步骤名", (await page.locator(".d-step").first().innerText()).includes("CYP7A1"));
check("详情栏酶名含胆固醇 7α-羟化酶", (await page.locator(".d-enzyme").first().innerText()).includes("胆固醇 7α-羟化酶"));
const stepText = await page.locator(".d-step").first().innerText();
check("详情栏标「不可逆」与内质网", stepText.includes("不可逆") && stepText.includes("内质网"), stepText.replace(/\n/g, " "));
const dgText = await page.locator("[data-dg='1']").first().innerText();
check("ΔG 只给定性、不含数值", dgText.includes("定性") && !/[-−]?\d+(\.\d+)?\s*kJ/i.test(dgText), dgText.replace(/\n/g, " "));
check("无「待结构核验」占位", !(await page.locator("body").innerText()).includes("待结构核验"));
check("全图只做 2D：无 3D 切换控件", (await page.locator("[data-3d-toggle], .d-3d-toggle, button:has-text('3D')").count()) === 0);
check("2D-only 说明存在（不登记 PDB）", (await page.locator("[data-2d-only='1']").first().innerText()).includes("PDB"));

// ===== 4) 接口面板只指向真实步骤 =====
const interfaces = page.locator("[data-chain-interfaces='1'] [data-interface-step]");
check("接口面板 2 条", (await interfaces.count()) === 2, String(await interfaces.count()));
const ifaceIds = await interfaces.evaluateAll((els) => els.map((el) => el.getAttribute("data-interface-step")).sort());
check("接口 id 为 ch-13 / oc-1", ifaceIds.join(",") === "ch-13,oc-1", ifaceIds.join(","));
const ifaceHrefs = await interfaces.locator("a").evaluateAll((els) => els.map((a) => a.getAttribute("href")));
check("接口链接均为「既有通路?step=」", ifaceHrefs.every((h) => h && h.includes("?step=")), ifaceHrefs.join(","));

// ===== 5) 运输段三态语义 =====
// 运输点击面覆盖 3 个节点，取带内右下空白处（避开 bile / gut / portal 与其标签）
const transportBand = frame.locator("g[data-transport-id='bile-t1'] rect").first();
const bandBox = await transportBand.boundingBox();
if (!bandBox) throw new Error("运输段点击面没有布局盒");
await transportBand.click({
  position: { x: Math.round(bandBox.width * 0.35), y: Math.round(bandBox.height * 0.9) },
});
await page.waitForTimeout(120);
check("点击运输段 → 运输详情面板", (await page.locator("[data-transport-detail='1']").count()) === 1);
const transportText = await page.locator("[data-transport-detail='1']").innerText();
check("运输详情写明肠肝循环与不计入步数", transportText.includes("肠肝循环") && transportText.includes("不计入步数"));

// ===== 6) 节点点击 → 打开该节点所属步骤 =====
await frame.locator("[data-node-id='chol']").first().click();
await page.waitForTimeout(120);
check("点击节点 chol 打开 bile-1 步骤详情", (await page.locator(".d-enzyme").first().innerText()).includes("胆固醇 7α-羟化酶"));
await frame.locator("[data-node-id='conj']").first().click();
await page.waitForTimeout(120);
check("点击节点 conj 打开 bile-6（BAAT）", (await page.locator(".d-enzyme").first().innerText()).includes("胆汁酸-CoA"));

// ===== 7) ?step= 深链还原 =====
await page.goto(`${BASE}/pathway/bile-acid?step=bile-6`, { waitUntil: "networkidle" });
check("?step=bile-6 直接还原详情", (await page.locator(".d-enzyme").first().innerText()).includes("胆汁酸-CoA"));
check(
  "深链还原后结构对照入口指向 bile-6",
  (await page.locator("[data-testid='chain-structure-cmp-entry']").getAttribute("data-cmp-step")) === "bile-6",
);

// ===== 8) 结构与分子档案入口 =====
check("步骤详情有「看这一步的结构对照」入口", (await page.locator("[data-testid='chain-structure-cmp-entry']").count()) === 1);
// 新物质均无档案，不硬造入口；bile-1 的胆固醇已有档案，入口应出现
await page.goto(`${BASE}/pathway/bile-acid?step=bile-1`, { waitUntil: "networkidle" });
const profileEntry = page.locator("[data-testid='chain-molecule-archive-entry-profile']");
check(
  "bile-1 有「本步物质简介」入口且指向 /molecule/:id",
  (await profileEntry.count()) === 1 && (await profileEntry.getAttribute("href")).startsWith("/molecule/"),
);
await page.goto(`${BASE}/pathway/bile-acid?step=bile-2`, { waitUntil: "networkidle" });
check(
  "bile-2 的新物质无档案时不硬造「物质简介」入口",
  (await page.locator("[data-testid='chain-molecule-archive-entry-profile']").count()) === 0,
);

// ===== 9) 结构页 SF-20 可达 =====
const sresp = await page.goto(`${BASE}/structures/bile-acid`, { waitUntil: "networkidle" });
check("路由 /structures/bile-acid 可达（200）", sresp?.status() === 200);
check("结构页标 SF-20", (await page.locator(".plate-no").innerText()).includes("SF-20"));
const cmpIds = await page.locator("[data-step-id]").evaluateAll((els) => [...new Set(els.map((el) => el.getAttribute("data-step-id")))]);
check(
  "结构页 6 块对照（bile-1…bile-6）",
  cmpIds.length === 6 && STEP_IDS.every((id) => cmpIds.includes(id)),
  cmpIds.join(","),
);
check("结构页无「待结构核验」占位", !(await page.locator("body").innerText()).includes("待结构核验"));

// ===== 10) 1440 无横向溢出 + 截图 =====
await page.goto(`${BASE}/pathway/bile-acid`, { waitUntil: "networkidle" });
await page.waitForTimeout(200);
const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
check("1440 宽无横向溢出", overflow <= 1, `scrollWidth 超出 ${overflow}px`);
await page.screenshot({ path: join(ROOT, "preview", "poster-bile-acid-1440.png") });
await page.screenshot({ path: join(ROOT, "preview", "poster-bile-acid.png"), fullPage: true });
console.log("✓ 截图 preview/poster-bile-acid-1440.png / poster-bile-acid.png");

// ===== 11) 版式审计交叉核对 =====
let audit = null;
try {
  audit = JSON.parse(readFileSync(join(ROOT, "preview", "layout-audit.json"), "utf8"));
} catch {
  console.log("· 未找到 preview/layout-audit.json，跳过交叉核对（请先跑 audit-layout --tag after）");
}
if (audit) {
  const entry = audit.pages?.find((p) => p.page === "bile-acid");
  if (!entry) {
    console.log("· preview/layout-audit.json 为旧报告（不含 bile-acid 页），跳过交叉核对；收尾跑 audit-layout --tag after 后复跑本脚本");
  } else {
    const clipped = entry.clipped.length + (entry.svgClipped?.length ?? 0);
    check(
      "audit-layout：/pathway/bile-acid 0 重叠 / 0 裁切",
      entry.significantOverlaps.length === 0 && clipped === 0,
      `重叠 ${entry.significantOverlaps.length}｜裁切 ${clipped}`,
    );
  }
}

check("全程无控制台报错", errors.length === 0, errors.slice(0, 3).join(" | "));

await browser.close();
process.exit(failed ? 1 : 0);
