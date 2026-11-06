// B 海报 + 内嵌 3D 切片的冒烟验证（新脚本，放在 tools/，不占用 scripts/）。
// 校验口径：URL 还原、器官切换、点步骤/点代谢物语义、gk-6 内嵌 3D 真实渲染出非空白画面、
// 缺资产步骤降级（支路 gk-rap，manifest 无档案）、?degrade=1 降级分支、static 步状态切换器契约、
// 器官变体切换（gk-1-liver）、caveats 旗标可见、证据强度角标（gk-7 零注意事项对照）、单步页四模块。
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

/** 采样 canvas 像素，判断是否渲染出非空白画面（3Dmol v2 经 drawImage 中转采样） */
function canvasFilled(page, hostSelector) {
  return page.evaluate((sel) => {
    const cv = document.querySelector(`${sel} canvas`);
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
    const distinct = new Set();
    for (let i = 0; i < px.length; i += 4) distinct.add(`${px[i]},${px[i + 1]},${px[i + 2]}`);
    return { ok: distinct.size > 5, reason: `distinct colors = ${distinct.size}` };
  }, hostSelector);
}

const browser = await launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 960 } });
const errors = [];
page.on("pageerror", (e) => errors.push(String(e)));
page.on("console", (m) => m.type() === "error" && errors.push(m.text()));

mkdirSync(join(ROOT, "preview"), { recursive: true });

// ===== 1) 概览页：URL 还原 + 器官切换 + 点击语义 =====
await page.goto(`${BASE}/pathway/glycolysis?organ=rbc&step=gk-3`, { waitUntil: "networkidle" });
await page.waitForSelector("svg .stepg", { timeout: 15000 });
check("URL 还原：gk-3 处于选中态", (await page.locator('svg .stepg.sel[data-step-id="gk-3"]').count()) === 1);
check("URL 还原：红细胞视图激活", (await page.locator(".organ-tab.active").innerText()) === "红细胞");

await page.click(".organ-tab:has-text('肝')");
await page.waitForTimeout(400);
check("器官切换后 URL 同步", page.url().includes("organ=liver"));
const stepCount = await page.locator("svg .stepg").count();
check(`器官切换不重排（步骤组 ${stepCount} === 11）`, stepCount === 11);

// 点代谢物节点（PEP）→ 产出语义：选中 gk-9
await page.locator('svg .node[data-node-id="pep"]').click({ force: true });
await page.waitForTimeout(300);
check("点击 PEP 节点选中 gk-9（产出语义不变）", (await page.locator('svg .stepg.sel[data-step-id="gk-9"]').count()) === 1);

// ===== 2) 内嵌 3D：gk-6 右栏真实渲染 =====
await page.goto(`${BASE}/pathway/glycolysis?organ=liver&step=gk-6`, { waitUntil: "networkidle" });
await page.waitForSelector("svg .stepg", { timeout: 15000 });
await page.waitForSelector(".embed3d .embed-host canvas", { timeout: 20000 });
await page.waitForTimeout(1500);
const embedFilled = await canvasFilled(page, ".embed3d .embed-host");
check(`内嵌 3D 渲染非空白（${embedFilled.reason}）`, embedFilled.ok);
const flagCount = await page.locator(".embed3d .d-flag").count();
check(`gk-6 砖红旗标默认可见（${flagCount} 条，应 ≥1：仅辅因子）`, flagCount >= 1);
const eviLine = await page.locator(".embed3d .d-evi-line").innerText();
check("证据角标一行可见（PDB · 分辨率 · 方法 · 物种 · computed）", /1U8F/.test(eviLine) && /computed/.test(eviLine));
// 证据角标展开
await page.locator(".embed3d .d-evi-line").click();
await page.waitForTimeout(200);
check("证据角标点击展开完整信息", (await page.locator(".embed3d .d-evi-full").count()) === 1);
// 残基抽屉展开
await page.locator(".embed3d .d-drawer-head").click();
await page.waitForTimeout(200);
check("残基抽屉展开有条目", (await page.locator(".embed3d .d-drawer-list li").count()) > 0);
await page.screenshot({ path: join(ROOT, "preview", "poster-embed-gk6.png"), fullPage: true });
console.log("✓ 截图 preview/poster-embed-gk6.png（1440 宽，gk-6 内嵌 3D）");

// ===== 3) 缺资产步骤降级：支路 gk-rap 右栏无 3D、有降级文案 =====
await page.goto(`${BASE}/pathway/glycolysis?organ=liver&step=gk-rap`, { waitUntil: "networkidle" });
await page.waitForSelector("svg .stepg", { timeout: 15000 });
await page.waitForTimeout(600);
const noCanvas = (await page.locator(".embed3d canvas").count()) === 0;
const degradeText = await page.locator(".poster .d-body").innerText();
check("缺资产步骤（gk-rap）：右栏无内嵌 3D canvas", noCanvas);
check("缺资产步骤：右栏出现降级文案（资产筹备中）", degradeText.includes("资产筹备中"));
await page.screenshot({ path: join(ROOT, "preview", "poster-degraded.png"), fullPage: true });
console.log("✓ 截图 preview/poster-degraded.png（1440 宽，缺资产降级态）");

// ===== 4) 契约抽查：gk-1 static 步 + 器官变体切换 + caveats 可见 =====
await page.goto(`${BASE}/pathway/glycolysis?organ=liver&step=gk-1`, { waitUntil: "networkidle" });
await page.waitForSelector("svg .stepg", { timeout: 15000 });
await page.waitForSelector(".embed3d .embed-host canvas", { timeout: 25000 });
const gk1Evi = await page.locator(".embed3d .d-evi-line").innerText();
check("gk-1 主档案为 1CZA", /1CZA/.test(gk1Evi));
check("gk-1 caveats 以砖红旗标露出（首屏 ≥3 条）", (await page.locator(".embed3d .d-flag").count()) >= 3);
check("gk-1 证据强度为 warn（有注意事项）", /注意/.test(gk1Evi));
// 器官变体切换 → GCK 档案
await page.locator(".d-variant-tab:has-text('肝变体')").click();
await page.waitForTimeout(1200);
const gckEvi = await page.locator(".embed3d .d-evi-line").innerText();
check("器官变体切换到 gk-1-liver（1V4S）", /1V4S/.test(gckEvi));
// static 单步页：状态切换器无死按钮
await page.goto(`${BASE}/step/gk-1`, { waitUntil: "networkidle" });
await page.waitForSelector(".s-viewer canvas", { timeout: 25000 });
const staticTab = await page.locator(".s-tab.active").innerText();
check("static 步状态切换器显示「仅结合态」+ 原因（无 apo）", staticTab.includes("仅结合态") && staticTab.includes("无可用 apo"));
check("static 步不渲染 apo 死按钮", (await page.locator('button.s-tab:has-text("apo")').count()) === 0);

// ===== 5) gk-7 零瑕疵对照：证据完整角标 =====
await page.goto(`${BASE}/step/gk-7`, { waitUntil: "networkidle" });
await page.waitForSelector(".s-viewer canvas", { timeout: 25000 });
await page.waitForTimeout(800);
check("gk-7 报脚显示「证据完整 · 零注意事项」", (await page.locator(".s-colophon .evi-clean").count()) === 1);
check("gk-7 页首无砖红注意事项旗标", (await page.locator(".s-flags li").count()) === 0);

// ===== 6) 内嵌 3D 降级分支（?degrade=1）：失败面板 + 重试 + 详情页链接 =====
await page.goto(`${BASE}/pathway/glycolysis?organ=liver&step=gk-6&degrade=1`, { waitUntil: "networkidle" });
await page.waitForSelector(".embed3d .embed-degraded", { timeout: 20000 });
check("内嵌 3D 降级面板出现（degrade=1）", true);
check("降级面板有重试按钮", (await page.locator(".embed3d .embed-btn:has-text('重试')").count()) === 1);
check("降级面板有详情页链接", (await page.locator(".embed3d .ed-link").count()) === 1);

// ===== 7) 单步页四模块 + 真实 3D =====
await page.goto(`${BASE}/step/gk-6`, { waitUntil: "networkidle" });
await page.waitForSelector(".s-viewer canvas", { timeout: 20000 });
await page.waitForTimeout(1500);
const stepFilled = await canvasFilled(page, ".s-viewer");
check(`单步页 3D 渲染非空白（${stepFilled.reason}）`, stepFilled.ok);
check("面包屑常驻（含通路概览链接）", (await page.locator(".crumb a:has-text('通路概览')").count()) === 1);
// 面包屑回挂图须带 ?step= 且值等于当前路由步 id（与帧带页返回语义对齐）
{
  const routeStepId = new URL(page.url()).pathname.split("/").pop();
  const crumbHref = await page.locator(".crumb a").nth(1).getAttribute("href");
  check(
    `面包屑回挂图 href 含 ?step= 且等于当前步（${routeStepId}）`,
    crumbHref === `/pathway/glycolysis?step=${routeStepId}`
  );
}
check("状态 tab（apo/holo）存在", (await page.locator("button.s-tab").count()) === 2);
const resRows = await page.locator("table.res-table tbody tr").count();
check(`残基表格有 ${resRows} 行（应 >0）`, resRows > 0);
check("证据报脚存在（EVIDENCE）", (await page.locator(".s-colophon").count()) === 1);
// 表格 → 3D 联动
await page.locator("table.res-table tbody tr").first().click();
await page.waitForTimeout(400);
check("残基表点击出现选中行", (await page.locator("table.res-table tbody tr.selected").count()) === 1);
// 键盘可访问：下一行 focus + Enter
await page.locator("table.res-table tbody tr").nth(1).focus();
await page.keyboard.press("Enter");
await page.waitForTimeout(300);
check("键盘 Enter 可选中残基行", (await page.locator("table.res-table tbody tr.selected td").first().innerText()).length > 0);
await page.screenshot({ path: join(ROOT, "preview", "step-page-gk6.png"), fullPage: true });
console.log("✓ 截图 preview/step-page-gk6.png（1440 宽，单步页 holo）");
// 底部上下步
await page.locator(".s-nav button:has-text('Ⅶ')").click();
await page.waitForURL("**/step/gk-7", { timeout: 10000 });
check("底部切换下一步导航正常", /step\/gk-7$/.test(new URL(page.url()).hash.replace("#", "") || page.url()) || page.url().includes("step/gk-7"));

// ===== 8) 单步页降级分支（?degrade=1）=====
await page.goto(`${BASE}/step/gk-6?degrade=1`, { waitUntil: "networkidle" });
await page.waitForSelector(".s-degraded", { timeout: 20000 });
check("单步页降级面板出现（2D 缩略 + 重试）", (await page.locator(".s-degraded .s-tool:has-text('重试')").count()) === 1);

// ===== 9) 滚轮横向漫游（Shift+滚轮映射 scrollLeft）=====
await page.goto(`${BASE}/pathway/glycolysis?organ=liver`, { waitUntil: "networkidle" });
await page.waitForSelector("svg .stepg", { timeout: 15000 });
const before = await page.evaluate(() => document.querySelector(".plate-scroll").scrollLeft);
await page.keyboard.down("Shift");
await page.mouse.move(700, 400);
await page.mouse.wheel(0, 400);
await page.keyboard.up("Shift");
await page.waitForTimeout(300);
const after = await page.evaluate(() => document.querySelector(".plate-scroll").scrollLeft);
check(`Shift+滚轮横向漫游生效（scrollLeft ${before} → ${after}）`, after > before);

// ===== 10) 数据修复抽查（档案 §10 对齐）：gk-6 改名 / gk-10 PK-M1 / gk-3 红细胞 organDiffs / gk-7 辅因子+EC+ΔG =====
await page.goto(`${BASE}/pathway/glycolysis?organ=liver&step=gk-6`, { waitUntil: "networkidle" });
await page.waitForSelector("svg .stepg", { timeout: 15000 });
{
  const body = await page.locator(".poster .d-body").innerText();
  check("gk-6 步骤名改为「氧化并磷酸化」，不再与线粒体 OxPhos 撞名", body.includes("氧化并磷酸化") && !body.includes("氧化磷酸化"));
  // 红细胞差异句在挂图脚注表 Ⅵ 行读取（右栏只显示当前器官的差异）
  const row6 = await page.locator('table.organs tr:has-text("Ⅵ")').innerText();
  check("gk-6 红细胞 NADH 表述改为 LDH 为主、metHb 为辅", row6.includes("LDH") && row6.includes("高铁血红蛋白") && !row6.includes("NADH 全部用于胞内还原"));
}
await page.goto(`${BASE}/pathway/glycolysis?organ=muscle&step=gk-10`, { waitUntil: "networkidle" });
await page.waitForSelector("svg .stepg", { timeout: 15000 });
{
  const body = await page.locator(".poster .d-body").innerText();
  check("gk-10 isozyme 精确为 PK-M1（无别构归到 M1）", body.includes("PK-M1") && body.includes("PK-M2") && !body.includes("肌 PK-M；"));
  check("gk-10 肌 organDiff 归属 M1", body.includes("肌 PK-M1 无别构激活"));
}
await page.goto(`${BASE}/pathway/glycolysis?organ=rbc&step=gk-3`, { waitUntil: "networkidle" });
await page.waitForSelector("svg .stepg", { timeout: 15000 });
{
  const row = await page.locator('table.organs tr:has-text("Ⅲ")').innerText();
  check("gk-3 红细胞 organDiffs：PFKL/PFKM 杂合（保守措辞）+ Tarui 病伴溶血", row.includes("杂合") && row.includes("待文献复核") && row.includes("Tarui"));
}
await page.goto(`${BASE}/pathway/glycolysis?organ=liver&step=gk-7`, { waitUntil: "networkidle" });
await page.waitForSelector("svg .stepg", { timeout: 15000 });
await page.waitForSelector(".embed3d .embed-host canvas", { timeout: 25000 });
{
  const body = await page.locator(".poster .d-body").innerText();
  check("gk-7 辅因子补 Mg²⁺", body.includes("Mg²⁺"));
  check("右栏显示 EC 编号（2.7.2.3）", body.includes("EC") && body.includes("2.7.2.3"));
  check("右栏不出现具体 ΔG 数值", !/(标准态|生理态)\s*[-−+]?\d/.test(body));
  check("右栏显示立体化学", body.includes("立体化学"));
  check("右栏显示常见误解（≥1 条）", (await page.locator(".poster .d-mis li").count()) >= 1);
  await page.screenshot({ path: join(ROOT, "preview", "poster-evidence-gk7.png"), fullPage: true });
  console.log("✓ 截图 preview/poster-evidence-gk7.png（1440 宽，gk-7 EC/ΔG 证据展示）");
}

// ===== 11) 单步页：新字段 + 氢键按需显示（点残基才显虚线，默认关） =====
await page.goto(`${BASE}/step/gk-7`, { waitUntil: "networkidle" });
await page.waitForSelector(".s-viewer canvas", { timeout: 25000 });
await page.waitForTimeout(800);
{
  const side = await page.locator(".s-side").innerText();
  check("单步页反应块显示 EC / 立体化学，不出现具体 ΔG 数值", side.includes("2.7.2.3") && side.includes("立体化学") && !/(标准态|生理态)\s*[-−+]?\d/.test(side));
  check("单步页有「辨析与临床」模块（误解 + 临床各 ≥1 条）", (await page.locator(".s-mis li").count()) >= 1 && (await page.locator(".s-clin li").count()) >= 1);
  // 氢键默认不画：无选中、开关默认关
  check("初始无残基选中（selnote 不出现）", (await page.locator(".s-selnote").count()) === 0);
  const hbToggle = page.locator('.s-tool[aria-pressed]');
  check("「全部显示氢键」开关存在且默认关", (await hbToggle.count()) === 1 && (await hbToggle.getAttribute("aria-pressed")) === "false");
  check("图例/提示写明「点击残基查看对应氢键」", (await page.locator(".op-hint").innerText()).includes("点击残基查看对应氢键"));
  // 从 pocket.json 取首个有氢键的残基，点击其表格行（按 resi 精确匹配单元格，避免数字误配）
  const hbResi = await page.evaluate(async () => {
    const url = performance.getEntriesByType("resource").map((r) => r.name).find((u) => /pocket\.json/.test(u));
    if (!url) return null;
    const p = await (await fetch(url)).json();
    return p.hbonds?.[0]?.prot?.resi ?? null;
  });
  check("pocket.json 可读且有氢键数据", typeof hbResi === "number");
  const clickResiRow = (resi) =>
    page.evaluate((r) => {
      const row = [...document.querySelectorAll("table.res-table tbody tr")].find((tr) =>
        [...tr.querySelectorAll("td")].some((td) => td.textContent.trim().split(/\s+/).includes(String(r)))
      );
      if (!row) return false;
      row.click();
      return true;
    }, resi);
  check("目标残基行存在", await clickResiRow(hbResi));
  await page.waitForTimeout(400);
  const selnote = await page.locator(".s-selnote").innerText();
  check(`点击残基 ${hbResi} 后 selnote 列出该残基氢键与距离（不依赖 WebGL 可读）`, selnote.includes("氢键") && /Å/.test(selnote));
  await page.screenshot({ path: join(ROOT, "preview", "step-hbond-click.png"), fullPage: true });
  console.log("✓ 截图 preview/step-hbond-click.png（1440 宽，点残基显示对应氢键）");
  // 再点一次取消
  check("目标残基行仍在（可再点取消）", await clickResiRow(hbResi));
  await page.waitForTimeout(300);
  check("再点一次取消选中（selnote 消失）", (await page.locator(".s-selnote").count()) === 0);
  // 全部显示开关切换
  await hbToggle.click();
  await page.waitForTimeout(300);
  check("开关切到「全部显示」后 aria-pressed=true", (await hbToggle.getAttribute("aria-pressed")) === "true");
  await hbToggle.click();
  await page.waitForTimeout(300);
  check("开关可复位为默认关", (await hbToggle.getAttribute("aria-pressed")) === "false");
}

// ===== 12) 自测模式：隐藏酶名/代谢物名，悬停或点击揭晓，退出恢复 =====
await page.goto(`${BASE}/pathway/glycolysis?organ=liver&step=gk-1`, { waitUntil: "networkidle" });
await page.waitForSelector("svg .stepg", { timeout: 15000 });
{
  check("默认不在自测态（svg 无 quiz-on）", (await page.locator("svg.quiz-on").count()) === 0);
  const stNameOpacity = await page.locator("svg .stepg .st-name").first().evaluate((el) => getComputedStyle(el).opacity);
  check(`默认酶名完全可见（opacity=${stNameOpacity}）`, Number(stNameOpacity) === 1);
  await page.locator(".organ-tab.quiz-toggle").click();
  await page.waitForTimeout(200);
  const hiddenCount = await page.locator("svg.quiz-on .q-hide").count();
  check(`自测开启：svg 进入 quiz-on，酶名/代谢物名被遮蔽（${hiddenCount} 处，应 >20）`, hiddenCount > 20);
  const hiddenOpacity = await page.locator("svg.quiz-on .stepg .st-name").first().evaluate((el) => getComputedStyle(el).opacity);
  check(`遮蔽生效（酶名 opacity=${hiddenOpacity}，应 < 0.5）`, Number(hiddenOpacity) < 0.5);
  check("图例提示「悬停或点击揭晓」", (await page.locator(".quiz-hint").innerText()).includes("悬停或点击揭晓"));
  const firstStName = page.locator("svg.quiz-on .stepg .st-name").first();
  await firstStName.click({ force: true });
  await page.waitForTimeout(150);
  check("点击酶名揭晓（revealed 类生效）", await firstStName.evaluate((el) => el.classList.contains("revealed")));
  check("点击揭晓不改选步骤（gk-1 保持选中）", (await page.locator('svg .stepg.sel[data-step-id="gk-1"]').count()) === 1);
  await page.locator(".organ-tab.quiz-toggle").click();
  await page.waitForTimeout(200);
  const exitOpacity = await page.locator("svg .stepg .st-name").first().evaluate((el) => getComputedStyle(el).opacity);
  check(`退出自测恢复（quiz-on 移除、酶名 opacity=${exitOpacity}）`, (await page.locator("svg.quiz-on").count()) === 0 && Number(exitOpacity) === 1);
}

// ===== 13) 点击语义修复 + 结构帧入口（有帧链接 / 无帧灰字 / 帧页返回） =====
// 变更原因（糖酵解帧带收尾）：第 9/10 步帧已接入（gk-1…gk-10 全覆盖，structureFrames.ts 为唯一事实源），
// 原「gk-9 无帧灰字」断言失效。无帧灰字断言改指向 gk-rap（Rapoport–Luebering 循环，仍未接入帧）；
// 并新增断言：gk-9 / gk-10 入口均为链接（带 frame 参数指向各自首帧）。
await page.goto(`${BASE}/pathway/glycolysis?organ=liver&step=gk-rap`, { waitUntil: "networkidle" });
await page.waitForSelector("svg .stepg", { timeout: 15000 });
{
  // 无帧步骤：灰字声明态（span、不可点、点击不跳转、不隐藏）
  const none = page.locator(".poster .frames-entry-none");
  check("无帧步骤（gk-rap）显示灰字「结构帧尚未接入」", (await none.count()) === 1 && (await none.innerText()).includes("结构帧尚未接入"));
  check("无帧入口不是链接（span，非 <a>）", (await none.evaluate((el) => el.tagName === "SPAN")));
  check("无帧入口不可点（cursor=default）", (await none.evaluate((el) => getComputedStyle(el).cursor)) === "default");
  await none.click({ force: true });
  await page.waitForTimeout(300);
  check("点击无帧灰字不发生跳转", page.url().includes("/pathway/glycolysis") && page.url().includes("step=gk-rap"));
}

// 非自测点击语义：点步骤标签（酶名文本）→ 切换选中；点代谢物缩略名 → 产出语义选中
await page.goto(`${BASE}/pathway/glycolysis?organ=liver&step=gk-3`, { waitUntil: "networkidle" });
await page.waitForSelector("svg .stepg", { timeout: 15000 });
{
  // 本节进入时 URL 已带 step=gk-3（选中态），点击为切换语义：第一次点取消、第二次点选中。
  // 用冒泡 click 派发（target=酶名文本）锁定处理器契约；真实像素路径由下方 PEP 缩略名真实点击覆盖。
  const clickGk3Name = () =>
    page.evaluate(() => {
      document
        .querySelector('svg .stepg[data-step-id="gk-3"] .st-name')
        ?.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
    });
  await clickGk3Name();
  await page.waitForTimeout(250);
  check("非自测点击已选步骤的标签 → 取消选中（切换语义）", (await page.locator('svg .stepg.sel[data-step-id="gk-3"]').count()) === 0);
  await clickGk3Name();
  await page.waitForTimeout(250);
  check("非自测点击步骤标签（酶名）选中 gk-3", (await page.locator('svg .stepg.sel[data-step-id="gk-3"]').count()) === 1);
  check("非自测点击标签不产生揭晓标记（无 revealed）", (await page.locator("svg .q-hide.revealed").count()) === 0);

  // 非自测：点代谢物节点缩略名文本 → 产出语义选中 gk-9
  await page.locator('svg .node[data-node-id="pep"] .q-hide').first().click({ force: true });
  await page.waitForTimeout(250);
  check("非自测点击代谢物缩略名（PEP）选中 gk-9", (await page.locator('svg .stepg.sel[data-step-id="gk-9"]').count()) === 1);

  // 自测：当前选中 gk-9，点 gk-3 的酶名 → 只揭晓、不切换选中（与非自测语义相反）
  await page.locator(".organ-tab.quiz-toggle").click();
  await page.waitForTimeout(200);
  const quizHit = await page.evaluate(() => {
    const el = document.querySelector('svg.quiz-on .stepg[data-step-id="gk-3"] .st-name');
    if (!el) return false;
    el.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
    return true;
  });
  await page.waitForTimeout(200);
  check("自测酶名元素存在", quizHit);
  check("自测点击酶名揭晓（revealed 生效）", await page.evaluate(() => document.querySelector('svg .stepg[data-step-id="gk-3"] .st-name')?.classList.contains("revealed") ?? false));
  check("自测点击酶名不切换选中（仍为 gk-9，gk-3 未被选中）", (await page.locator('svg .stepg.sel[data-step-id="gk-9"]').count()) === 1 && (await page.locator('svg .stepg.sel[data-step-id="gk-3"]').count()) === 0);
  await page.locator(".organ-tab.quiz-toggle").click();
  await page.waitForTimeout(200);
}

// 有帧步骤（gk-1 / gk-2）：入口链接 + href 带 frame 参数
await page.goto(`${BASE}/pathway/glycolysis?organ=liver&step=gk-1`, { waitUntil: "networkidle" });
await page.waitForSelector("svg .stepg", { timeout: 15000 });
{
  const entry = page.locator('.poster .d-body a.frames-entry');
  check("有帧步骤（gk-1）出现结构帧入口链接", (await entry.count()) === 1);
  check("gk-1 入口 href 指向帧页首帧（?frame=gk-1-f0）", (await entry.getAttribute("href")) === "/structures/glycolysis?frame=gk-1-f0");
  check("入口文字为「看这一步的结构帧 →」", (await entry.innerText()).includes("看这一步的结构帧"));
  await page.screenshot({ path: join(ROOT, "preview", "poster-entry-link.png"), fullPage: true });
  console.log("✓ 截图 preview/poster-entry-link.png（1440 宽，gk-1 右栏结构帧入口）");

  // 入口 → 结构对照页 → 返回挂图对应步
  // 断言改写（因功能取消）：原校验 URL 携带 frame=gk-1-f0（帧带逐帧切换）；
  // 本轮帧带/播放取消，?frame= 仅做旧链接兼容，重定向到步骤锚点 #gk-1。
  await entry.click();
  await page.waitForURL("**/structures/glycolysis**", { timeout: 10000 });
  check(
    "入口跳转结构对照页，旧 frame 参数重定向到步骤锚点（#gk-1）",
    page.url().includes("/structures/glycolysis") && page.url().endsWith("#gk-1")
  );
  // 断言改写（因新增全站首页）：.film-back 现在有两条文字链接——「← 返回挂图」与「首页」。
  // 原断言按“唯一 .film-back a”取 href；改为按去向分别断言，强度不降反升。
  const backLinks = page.locator(".film-back a");
  check("帧页返回行有两条去向（挂图 + 首页）", (await backLinks.count()) === 2);
  const back = page.locator('.film-back a:not(.film-home)');
  check("帧页有返回行（返回挂图）", (await back.count()) === 1);
  check("帧页返回 href 回到挂图对应步（?step=gk-1）", (await back.getAttribute("href")) === "/pathway/glycolysis?step=gk-1");
  check("帧页另有首页入口（/）", (await page.locator('.film-back a.film-home[href="/"]').count()) === 1);
  await back.click();
  await page.waitForURL("**/pathway/glycolysis**", { timeout: 10000 });
  check("返回后挂图还原到 gk-1 选中态", (await page.locator('svg .stepg.sel[data-step-id="gk-1"]').count()) === 1);
}
await page.goto(`${BASE}/pathway/glycolysis?organ=liver&step=gk-2`, { waitUntil: "networkidle" });
await page.waitForSelector("svg .stepg", { timeout: 15000 });
check("gk-2 入口 href 指向 gk-2 首帧（?frame=gk-2-f0）", (await page.locator(".poster .d-body a.frames-entry").getAttribute("href")) === "/structures/glycolysis?frame=gk-2-f0");

// 帧带收尾新增：gk-9 / gk-10 入口均为链接（原 gk-9 为灰字，第 9/10 步接入后失效——见第 13 节注释）
for (const [sid, first] of [["gk-9", "gk-9-f0"], ["gk-10", "gk-10-f0"]]) {
  await page.goto(`${BASE}/pathway/glycolysis?organ=liver&step=${sid}`, { waitUntil: "networkidle" });
  await page.waitForSelector("svg .stepg", { timeout: 15000 });
  const entry = page.locator(".poster .d-body a.frames-entry");
  check(`${sid} 入口为链接且指向首帧（?frame=${first}）`, (await entry.count()) === 1 && (await entry.getAttribute("href")) === `/structures/glycolysis?frame=${first}`);
}

if (errors.length) {
  console.error("页面错误：", errors);
  failed = true;
}
await browser.close();
if (failed) process.exitCode = 1;
console.log(failed ? "冒烟验证存在失败项" : "✓ 冒烟验证全部通过");
