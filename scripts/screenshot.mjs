// 用 playwright-core 驱动本机 Edge/Chrome 截取概览页截图并做交互冒烟验证。
import { mkdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright-core";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const BASE = process.env.BASE_URL ?? "http://localhost:5173";

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

// 1) URL 还原：直接带参数打开
await page.goto(`${BASE}/pathway/glycolysis?organ=rbc&step=gk-3`, { waitUntil: "networkidle" });
await page.waitForSelector("svg .rx", { timeout: 10000 });
const hlCount = await page.locator("svg [data-step-id].hl").count();
console.log(`URL 还原 (organ=rbc, step=gk-3)：高亮元素数 = ${hlCount}`);

// 2) 器官切换
await page.click("text=红细胞");
await page.waitForTimeout(600);
const organActive = await page.locator(".capsule.active").innerText();
console.log(`切换后激活胶囊：${organActive}`);

// 3) 点击反应节点
await page.locator('svg .rx[data-step-id="gk-10"]').click({ force: true });
await page.waitForTimeout(300);
const detailText = await page.locator(".detail").innerText();
console.log(`点击 gk-10 后详情含丙酮酸激酶：${detailText.includes("丙酮酸激酶")}`);
const url = page.url();
console.log(`点击后 URL：${url}`);

// 截图 1：默认肝视图（未选步骤）——展示器官特异步骤（赭色）与无差异步骤（置灰）的对比
await page.goto(`${BASE}/pathway/glycolysis?organ=liver`, { waitUntil: "networkidle" });
await page.waitForSelector("svg .rx", { timeout: 10000 });
await page.waitForTimeout(700);
mkdirSync(join(ROOT, "preview"), { recursive: true });
await page.screenshot({ path: join(ROOT, "preview", "pathway-overview.png"), fullPage: true });
console.log("✓ 截图已保存 preview/pathway-overview.png（默认视图，含置灰对比）");

// 截图 2：选中第 6 步的详情态
await page.goto(`${BASE}/pathway/glycolysis?organ=liver&step=gk-6`, { waitUntil: "networkidle" });
await page.waitForSelector("svg .rx", { timeout: 10000 });
await page.waitForTimeout(700);
await page.screenshot({ path: join(ROOT, "preview", "pathway-overview-step6.png"), fullPage: true });
console.log("✓ 截图已保存 preview/pathway-overview-step6.png（选中第 6 步）");

if (errors.length) {
  console.error("页面错误：", errors);
  process.exitCode = 1;
}
await browser.close();
