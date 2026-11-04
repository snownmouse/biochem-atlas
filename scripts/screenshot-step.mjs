// 单步 3D 结合视图页（/step/gly-06）冒烟验证 + 截图。
// 需先 `npm run build`，再 `npm run preview`（或设置 BASE_URL 指向本地服务）。
// 验证点：3D canvas 真实渲染出非空白画面、状态切换、残基列表联动、降级分支。
import { mkdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright-core";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const BASE = process.env.BASE_URL ?? "http://localhost:4173";

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

/** 采样 canvas 像素，判断是否渲染出非空白画面（3Dmol v2 将控制权转给离屏，需经 drawImage 中转） */
function canvasFilled(page) {
  return page.evaluate(() => {
    const cv = document.querySelector(".viewer-host canvas");
    if (!cv) return { ok: false, reason: "no canvas" };
    const w = Math.min(cv.width, 200);
    const h = Math.min(cv.height, 200);
    const probe = document.createElement("canvas");
    probe.width = w;
    probe.height = h;
    const ctx = probe.getContext("2d");
    if (!ctx) return { ok: false, reason: "no 2d ctx" };
    ctx.drawImage(cv, 0, 0, w, h);
    const px = ctx.getImageData(0, 0, w, h).data;
    let distinct = new Set();
    for (let i = 0; i < px.length; i += 4) distinct.add(`${px[i]},${px[i + 1]},${px[i + 2]}`);
    return { ok: distinct.size > 5, reason: `distinct colors = ${distinct.size}`, canvas: `${cv.width}x${cv.height}` };
  });
}

const browser = await launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } });
const errors = [];
page.on("pageerror", (e) => errors.push(String(e)));
page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
mkdirSync(join(ROOT, "preview"), { recursive: true });

// 1) 结合态 holo：等 3D 就绪并确认 canvas 非空白
await page.goto(`${BASE}/step/gly-06`, { waitUntil: "networkidle" });
await page.waitForSelector(".viewer-host canvas", { timeout: 20000 });
await page.waitForSelector(".op-hint", { timeout: 15000 });
await page.waitForTimeout(1200);
const filled = await canvasFilled(page);
console.log(`holo canvas：${filled.canvas ?? ""} ${filled.ok ? "非空白 ✓" : `空白/失败 ✗（${filled.reason}）`}`);

// 2) 残基列表 → 3D 联动：点列表项出现选中态
await page.locator(".residue-item").first().click();
await page.waitForTimeout(400);
const selCount = await page.locator(".residue-item.selected").count();
const selNote = await page.locator(".residue-section .diff-bar").innerText().catch(() => "");
console.log(`列表→3D 联动：选中项 ${selCount} 个；说明条：${selNote.slice(0, 60)}...`);

await page.screenshot({ path: join(ROOT, "preview", "gly-06-holo.png"), fullPage: true });
console.log("✓ 截图已保存 preview/gly-06-holo.png");

// 3) 状态切换到 apo
await page.click("text=游离态（apo）");
await page.waitForTimeout(1500);
const apoFilled = await canvasFilled(page);
console.log(`apo canvas：${apoFilled.ok ? "非空白 ✓" : `空白/失败 ✗（${apoFilled.reason}）`}`);
await page.screenshot({ path: join(ROOT, "preview", "gly-06-apo.png"), fullPage: true });
console.log("✓ 截图已保存 preview/gly-06-apo.png");

// 4) 降级分支手动触发（?degrade=1）
await page.goto(`${BASE}/step/gly-06?degrade=1`, { waitUntil: "networkidle" });
await page.waitForSelector(".degraded-panel", { timeout: 15000 });
const degradedText = await page.locator(".degraded-panel .diff-bar").innerText();
console.log(`降级分支：${degradedText.slice(0, 50)}... ✓`);
await page.waitForTimeout(600);
await page.screenshot({ path: join(ROOT, "preview", "gly-06-degraded.png"), fullPage: false });

// 5) 概览页入口
await page.goto(`${BASE}/pathway/glycolysis?step=gk-6`, { waitUntil: "networkidle" });
await page.waitForSelector("text=进入 3D 结合视图", { timeout: 10000 });
console.log("概览页 3D 入口链接：存在 ✓");

if (errors.length) {
  console.error("页面错误：", errors);
  process.exitCode = 1;
}
await browser.close();
console.log("✓ 单步页冒烟验证完成");
