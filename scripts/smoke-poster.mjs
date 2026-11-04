// B 海报版概览页的冒烟验证 + 1440 宽截图。
// 校验口径与旧脚本一致（不弱化）：URL 还原、器官切换、点节点出详情、URL 同步；
// 另加海报特有校验：Δ 标签随器官浮现、挂图不重排（步骤组数量恒定）、3D 入口存在。
import { mkdirSync } from "node:fs";
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

// 1) URL 还原：organ=rbc & step=gk-3
await page.goto(`${BASE}/pathway/glycolysis?organ=rbc&step=gk-3`, { waitUntil: "networkidle" });
await page.waitForSelector("svg .stepg", { timeout: 15000 });
check("URL 还原：gk-3 处于选中态", (await page.locator('svg .stepg.sel[data-step-id="gk-3"]').count()) === 1);
check("URL 还原：红细胞视图激活", (await page.locator(".organ-tab.active").innerText()) === "红细胞");
const rbcDelta = await page.locator('svg [data-delta="1"]').count();
check(`红细胞视图 Δ 标签浮现（${rbcDelta} 个，应 ≥5）`, rbcDelta >= 5);
const stepCountRbc = await page.locator("svg .stepg").count();

// 2) 器官切换到肝：Δ 标签变化、图面步骤组数量不变（不重排）
await page.click(".organ-tab:has-text('肝')");
await page.waitForTimeout(400);
const liverDelta = await page.locator('svg [data-delta="1"]').count();
check(`肝视图 Δ 标签数变化（${liverDelta} ≠ ${rbcDelta}）`, liverDelta !== rbcDelta);
const stepCountLiver = await page.locator("svg .stepg").count();
// 11 = 10 条主链横箭头 + 第 Ⅴ 步 TPI 垂直箭头
check(`器官切换不重排（步骤组 ${stepCountLiver} === ${stepCountRbc} === 11）`, stepCountLiver === stepCountRbc && stepCountLiver === 11);
check("器官切换后 URL 同步", page.url().includes("organ=liver"));

// 3) 点击主链步骤 gk-10：详情 + URL
await page.locator('svg .stepg[data-step-id="gk-10"] line.arrow').click({ force: true });
await page.waitForTimeout(300);
const detailText = await page.locator(".poster .d-body").innerText();
check("点击 gk-10 后详情含丙酮酸激酶", detailText.includes("丙酮酸激酶"));
check("点击后 URL 含 step=gk-10", page.url().includes("step=gk-10"));

// 4) 点击代谢物节点（PEP）→ 沿用旧语义：选中产出它的步骤 gk-9
await page.goto(`${BASE}/pathway/glycolysis?organ=liver`, { waitUntil: "networkidle" });
await page.waitForSelector("svg .stepg", { timeout: 15000 });
await page.locator('svg .node[data-node-id="pep"]').click({ force: true });
await page.waitForTimeout(300);
check("点击 PEP 节点选中 gk-9", (await page.locator('svg .stepg.sel[data-step-id="gk-9"]').count()) === 1);

// 5) 3D 入口：gk-6 详情栏有“打开 3D 结合视图”，且跳转 /step/gk-6 不断裂
await page.goto(`${BASE}/pathway/glycolysis?organ=liver&step=gk-6`, { waitUntil: "networkidle" });
await page.waitForSelector("svg .stepg", { timeout: 15000 });
const link = page.locator(".d-3dlink");
check("gk-6 详情栏存在 3D 入口", (await link.count()) === 1);
await link.click();
await page.waitForURL("**/step/gk-6", { timeout: 10000 });
await page.waitForSelector(".view-wrap", { timeout: 15000 });
check("3D 页打开成功（/step/gk-6）", page.url().includes("/step/gk-6"));
const crumbBack = await page.locator(".crumb a").first().count();
check("3D 页有返回概览的面包屑", crumbBack === 1);

// 6) 截图：默认肝视图（整页）
await page.goto(`${BASE}/pathway/glycolysis?organ=liver`, { waitUntil: "networkidle" });
await page.waitForSelector("svg .stepg", { timeout: 15000 });
await page.waitForTimeout(800);
await page.screenshot({ path: join(ROOT, "preview", "poster-pathway.png"), fullPage: true });
console.log("✓ 截图 preview/poster-pathway.png（默认肝视图，1440 宽）");

// 7) 截图：选中第 6 步 + 红细胞视图
await page.goto(`${BASE}/pathway/glycolysis?organ=rbc&step=gk-6`, { waitUntil: "networkidle" });
await page.waitForSelector("svg .stepg", { timeout: 15000 });
await page.waitForTimeout(800);
await page.screenshot({ path: join(ROOT, "preview", "poster-pathway-step6-rbc.png"), fullPage: true });
console.log("✓ 截图 preview/poster-pathway-step6-rbc.png（红细胞视图 + 选中第 Ⅵ 步）");

// 8) 截图：挂图漫游到右端（第 Ⅵ–Ⅹ 步 + 账本回收列）
await page.goto(`${BASE}/pathway/glycolysis?organ=liver`, { waitUntil: "networkidle" });
await page.waitForSelector("svg .stepg", { timeout: 15000 });
await page.evaluate(() => {
  document.querySelector(".plate-scroll").scrollLeft = 9999;
});
await page.waitForTimeout(300);
await page.screenshot({ path: join(ROOT, "preview", "poster-pathway-right.png"), fullPage: false });
console.log("✓ 截图 preview/poster-pathway-right.png（挂图右半段）");

if (errors.length) {
  console.error("页面错误：", errors);
  failed = true;
}
await browser.close();
if (failed) process.exitCode = 1;
