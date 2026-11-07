// 糖异生挂图冒烟验证（与 smoke-tca.mjs 同款机制，playwright-core + 本机 Edge/Chrome）。
// 校验口径：页面可达、11 步主链、四泳道标签、三次跨膜路径（bbox 真跨越泳道边界，不平线）、
// 点击选中语义、右栏镜像对照与跳糖酵解链接、?step= 还原、自测模式（揭晓而非选中）、
// 3D 占位、能量账本、面包屑通路切换。不校验 3D 渲染（本页 3D 一律占位）。
// 需先 `npm run build`，再 `npm run preview`（或 BASE_URL 指向本地服务）。
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

// ===== 1) 页面可达 + 11 步主链 + 四泳道标签 =====
await page.goto(`${BASE}/pathway/gluconeogenesis`, { waitUntil: "networkidle" });
check("页面可达：挂图 svg 存在", (await page.locator("svg[data-lanes]").count()) === 1);
check("无控制台报错", errors.length === 0);

for (let i = 1; i <= 11; i++) {
  const n = await page.locator(`svg g[data-step-id="gn-${i}"]`).count();
  if (n !== 1) check(`主链 gn-${i} 恰好一组`, false);
}
const mainCount = await page.evaluate(() =>
  [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].filter(
    (i) => document.querySelectorAll(`svg g[data-step-id="gn-${i}"]`).length === 1
  ).length
);
check("11 步主链齐全（各恰好一组）", mainCount === 11);
check("入口支路 2 条（gn-cori / gn-ala）", (await page.locator('svg g[data-step-id="gn-cori"], svg g[data-step-id="gn-ala"]').count()) === 2);

const laneText = await page.evaluate(() => document.querySelector("svg[data-lanes]")?.textContent ?? "");
check("泳道标签：线粒体基质", laneText.includes("线粒体基质"));
check("泳道标签：内膜转运带", laneText.includes("转运带"));
check("泳道标签：细胞质", laneText.includes("细胞质"));
check("泳道标签：内质网腔", laneText.includes("内质网腔"));

// ===== 2) 三次跨膜：节点 y 坐标真跨越泳道边界（不是一条平线） =====
const laneCheck = await page.evaluate(() => {
  const bb = (sel) => {
    const el = document.querySelector(sel);
    return el ? el.getBBox() : null;
  };
  const centerY = (b) => b.y + b.height / 2;
  const pyrMit = bb('svg g[data-node-id="pyr-mit"] circle');
  const pyrCyt = bb('svg g[data-node-id="pyr-cyt"] circle');
  const mal = bb('svg g[data-node-id="mal"] circle');
  const g6p = bb('svg g[data-node-id="g6p"] circle');
  const glc = bb('svg g[data-node-id="glc"] circle');
  const mpc = bb('svg g[data-step-id="gn-shuttle-mpc"] path');
  const malPath = bb('svg g[data-step-id="gn-shuttle-mal"] path');
  const g6pase = bb('svg g[data-step-id="gn-11"] path');
  const crosses = (b, y1, y2) => b && b.y < y1 && b.y + b.height > y2;
  return {
    mpc: crosses(mpc, 200, 250) && mpc.width < 10 && mpc.height > 100,
    mal: crosses(malPath, 200, 250) && malPath.height > 80,
    g6pase: crosses(g6pase, 470, 500) && g6pase.width < 10 && g6pase.height > 100,
    nodeSpan: pyrMit && pyrCyt && centerY(pyrMit) < 200 && centerY(pyrCyt) > 250,
    malInBand: mal && centerY(mal) > 200 && centerY(mal) < 250,
    glcBelowEr: glc && g6p && centerY(glc) > 500 && centerY(g6p) < 470,
  };
});
check("跨膜① MPC：垂直路径跨越内膜带 y200-250", laneCheck.mpc === true);
check("跨膜② 苹果酸穿梭：斜向路径跨越内膜带", laneCheck.mal === true);
check("跨膜③ G6P 下潜：垂直路径跨越 ER 膜 y470-500", laneCheck.g6pase === true);
check("丙酮酸节点分居基质/胞质两泳道（y 真跨越）", laneCheck.nodeSpan === true);
check("苹果酸节点位于内膜带内", laneCheck.malInBand === true);
check("葡萄糖节点在 ER 腔、G6P 在胞质", laneCheck.glcBelowEr === true);
check("膜带只放转运机器（MPC/SLC37A4 标记在图）", laneText.includes("MPC") && laneText.includes("SLC37A4"));

// ===== 3) 点击步骤选中 + 右栏镜像对照 + 跳糖酵解链接 =====
await page.locator('svg g[data-step-id="gn-9"] text.st-name').click();
check("点击 gn-9 后 URL 带 step=gn-9", page.url().includes("step=gn-9"));
check("gn-9 处于唯一选中态", (await page.locator('svg .stepg.sel[data-step-id="gn-9"]').count()) === 1);
check("右栏出现镜像对照块", (await page.locator("aside .d-mirror[data-mirror='1']").count()) === 1);
const mirrorText = await page.locator("aside .d-mirror").innerText();
check("镜像对照显示关系类型（换酶 PFK-1 ↔ FBPase-1）", mirrorText.includes("换酶"));
check("镜像对照显示能量代价差", mirrorText.includes("能量代价差"));
check("镜像对照显示调控差异", mirrorText.includes("调控差异"));
const gkLink = page.locator("aside a[data-gk-link='gk-3']");
check("跳转链接指向 /pathway/glycolysis?step=gk-3", (await gkLink.getAttribute("href"))?.includes("/pathway/glycolysis?step=gk-3") === true);
check("右栏 ΔG 不出现具体数值", !/(kJ\/mol|eQuilibrator)/.test(await page.locator("aside [data-dg]").innerText()));

// 表 2 镜像对照总表：10 对齐全
check("表 2 镜像对照 10 对齐全", (await page.locator("table[data-mirror-table] tbody tr").count()) === 11); // 10 对 + 合计行
check("表 2 合计含不对称锚点", (await page.locator("table[data-mirror-table]").innerText()).includes("不对称"));

// ===== 4) ?step= 还原 + 上一步/下一步 =====
await page.goto(`${BASE}/pathway/gluconeogenesis?step=gn-2`, { waitUntil: "networkidle" });
check("URL 还原：gn-2 处于选中态", (await page.locator('svg .stepg.sel[data-step-id="gn-2"]').count()) === 1);
const nextBtn = page.locator('aside .d-variant[aria-label="上一步 / 下一步"] .d-variant-tab').last();
check("gn-2 下一步指向第 Ⅲ 步", (await nextBtn.innerText()).includes("Ⅲ"));
await nextBtn.click();
check("点击下一步后 URL 为 gn-3", page.url().includes("step=gn-3"));

// 转运步可点：右栏出转运详情（膜带不放代谢反应）
await page.locator('svg g[data-step-id="gn-shuttle-mpc"] text.st-name').click();
check("点击 MPC 转运出转运详情", page.url().includes("step=gn-shuttle-mpc"));
check("转运详情注明非酶促反应", (await page.locator("aside").innerText()).includes("转运步不是酶促反应"));

// ===== 5) 能量账本（数值来自 energyLedger） =====
const ledger = await page.locator("aside [data-ledger]").innerText();
check("能量账本 ATP −4", ledger.includes("−4"));
check("能量账本 GTP −2", ledger.includes("−2"));
check("能量账本 NADH −2", ledger.includes("−2"));
check("能量账本并列糖酵解 +2 ATP", ledger.includes("+2 ATP"));
check("不对称锚点存在", (await page.locator("aside [data-asymmetry]").innerText()).includes("6"));

// ===== 6) 自测模式：点名字是揭晓而非选中 =====
await page.goto(`${BASE}/pathway/gluconeogenesis`, { waitUntil: "networkidle" });
await page.locator(".organ-switch .quiz-toggle").click();
const qHideCount = await page.locator("svg .q-hide").count();
check(`自测开启：隐藏名数量充足（${qHideCount}）`, qHideCount > 20);
await page.locator('svg g[data-step-id="gn-3"] text.st-name').click();
check("点击酶名 → 揭晓（revealed）而非选中", (await page.locator('svg g[data-step-id="gn-3"] text.st-name.revealed').count()) === 1);
check("揭晓同时不改变选中态（无 .sel）", (await page.locator("svg .stepg.sel").count()) === 0);
// 节点点击仍是选中语义：先关自测，再点节点缩写字（圆心被缩写字覆盖是常态）
await page.locator(".organ-switch .quiz-toggle").click();
await page.locator('svg g[data-node-id="f6p"] text').first().click();
check("非自测下点节点是选中语义（f6p→gn-9）", page.url().includes("step=gn-9"));

// ===== 7) 3D：有资产则视口就绪；共用糖酵解步骤显示共用说明 =====
const gnReady = await page.waitForSelector("aside .embed-host:not(.hidden)", { timeout: 12000 }).then(() => true).catch(() => false);
check("gn-9 有 3D 资产 → 视口就绪", gnReady);
check("gn-9 有资产时不显示占位", (await page.locator("aside [data-3d-placeholder]").count()) === 0);
await page.goto(`${BASE}/pathway/gluconeogenesis?step=gn-3`, { waitUntil: "networkidle" });
check("gn-3 共用糖酵解 → 显示共用说明", (await page.locator("aside [data-3d-placeholder]").innerText()).includes("共用同一酶"));
check("gn-3 无独立资产 → 无 3D 视口", (await page.locator("aside .embed3d").count()) === 0);

// ===== 8) 器官切换 + 组织差异表 =====
await page.locator('.organ-tab[data-organ="kidney"]').click();
check("器官切换后 URL 同步（kidney）", page.url().includes("organ=kidney"));
check("表 1 含肾皮质列", (await page.locator("table.organs").first().innerText()).includes("肾皮质"));

// ===== 9) 三张挂图之间的通路切换（克制的下划线文字） =====
await page.goto(`${BASE}/pathway/glycolysis`, { waitUntil: "networkidle" });
check("糖酵解挂图可切糖异生", (await page.locator('.crumb a[href="/pathway/gluconeogenesis"]').count()) === 1);
check("糖酵解挂图可切 TCA", (await page.locator('.crumb a[href="/pathway/tca"]').count()) === 1);
await page.goto(`${BASE}/pathway/tca`, { waitUntil: "networkidle" });
check("TCA 挂图可切糖异生", (await page.locator('.crumb a[href="/pathway/gluconeogenesis"]').count()) === 1);
await page.goto(`${BASE}/pathway/gluconeogenesis`, { waitUntil: "networkidle" });
check("糖异生挂图可切回糖酵解", (await page.locator('.crumb a[href="/pathway/glycolysis"]').count()) === 1);

// ===== 10) 截图（供人审，断言自检不读图） =====
await page.screenshot({ path: join(ROOT, "preview", "poster-gluconeogenesis.png"), fullPage: true });
console.log("已产出 preview/poster-gluconeogenesis.png（fullPage）");

check("全程无控制台报错", errors.length === 0);
if (errors.length) console.log(errors.slice(0, 5).join("\n"));

await browser.close();
process.exit(failed ? 1 : 0);
