// TCA 通路切片冒烟验证（新脚本，与 smoke-embed.mjs 同款机制）。
// 校验口径：URL 还原、器官切换、环上点击语义、闭环导航回绕（第 Ⅷ 步下一步 → 第 Ⅰ 步）、
// 回流带注释存在、能量账本口径、3D 占位、自测模式、面包屑。不校验 3D 渲染（本轮不做 3D）。
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

// ===== 1) URL 还原 + 闭环导航 =====
await page.goto(`${BASE}/pathway/tca?organ=liver&step=tca-3`, { waitUntil: "networkidle" });
check("URL 还原：tca-3 处于选中态", (await page.locator('svg .stepg.sel[data-step-id="tca-3"]').count()) === 1);
check("面包屑显示当前步骤", (await page.locator(".crumb").innerText()).includes("异柠檬酸"));
check("环上 8 弧齐全", (await page.locator('svg g[data-step-id^="tca-"]:not([data-step-id="tca-pdh"])').count()) === 8);
check("接驳步 PDH 在图", (await page.locator('svg g[data-step-id="tca-pdh"]').count()) === 1);
check("回流带注释存在（非第 9 步声明）", (await page.locator("svg text").filter({ hasText: "非第 9 步" }).count()) >= 1);
check("回流带权重低于主链（虚线 branch）", (await page.locator("svg g.branch path[stroke-dasharray]").count()) >= 3);

// 闭环导航：tca-8 下一步 → tca-1
await page.goto(`${BASE}/pathway/tca?step=tca-8`, { waitUntil: "networkidle" });
const nextBtn = page.locator(".d-variant .d-variant-tab").last();
check("第 Ⅷ 步下一步文案回绕到第 Ⅰ 步", (await nextBtn.innerText()).includes("Ⅰ"));
await nextBtn.click();
check("点击后 URL 为 tca-1", page.url().includes("step=tca-1"));
check("第 Ⅰ 步上一步也回绕到第 Ⅷ 步", (await page.locator(".d-variant .d-variant-tab").first().innerText()).includes("Ⅷ"));

// ===== 2) 器官切换 + 组织差异表 =====
await page.goto(`${BASE}/pathway/tca?organ=liver`, { waitUntil: "networkidle" });
await page.locator('.organ-tab[data-organ="rbc"], .organ-switch .organ-tab').nth(2).click();
check("器官切换后 URL 同步（rbc）", page.url().includes("organ=rbc"));
check("rbc 视图有 Δ 标记（接驳步/第 Ⅰ 步）", (await page.locator('svg [data-delta="1"]').count()) >= 1);
check("表 1 声明红细胞无线粒体", (await page.locator("table.organs").innerText()).includes("无线粒体"));

// 红细胞视图：整环置灰（沿用糖酵解 faded 参数 opacity 0.3），环仍可点
const rbcDimmed = await page.evaluate(() => {
  const gs = [...document.querySelectorAll('svg g[data-step-id^="tca-"]:not([data-step-id="tca-pdh"])')];
  return gs.filter((g) => g.classList.contains("faded") && parseFloat(getComputedStyle(g).opacity) < 0.5).length;
});
check("rbc：环上 8 步整体置灰（faded，opacity<0.5）", rbcDimmed === 8);
check("rbc：接驳步 PDH 不置灰（保留接驳语义）", await page.evaluate(() => {
  const g = document.querySelector('svg g[data-step-id="tca-pdh"]');
  return !!g && !g.classList.contains("faded");
}));
const rbcNodesDimmed = await page.evaluate(() => {
  const side = ["pyr", "accoa", "glu"];
  const ns = [...document.querySelectorAll("svg g.node[data-node-id]")].filter(
    (n) => !side.includes(n.getAttribute("data-node-id"))
  );
  return ns.filter((n) => n.classList.contains("faded")).length + "/" + ns.length;
});
check("rbc：环上 8 个代谢物节点同步置灰", rbcNodesDimmed === "8/8");
check("rbc：环上方有砖红说明", (await page.locator("svg text").filter({ hasText: "红细胞无线粒体，本通路不运行" }).count()) === 1);
await page.screenshot({ path: join(ROOT, "preview", "tca-rbc-muted.png"), fullPage: false });
console.log("✓ 截图 preview/tca-rbc-muted.png（1440 宽）");
// 置灰 ≠ 不可交互：点击置灰的第 Ⅴ 步产物节点（琥珀酸，圆点无 q-hide）仍能选中
const sucNode = page.locator('svg g.node[data-node-id="suc"] circle');
await sucNode.scrollIntoViewIfNeeded();
await sucNode.click({ force: true, position: { x: 24, y: 6 } }); // 圆点上缘：定位在圆点本身，与名字文本的点击语义区分开
check("rbc：环仍可点（点击置灰的第 Ⅴ 步后 URL 选中 tca-5）", page.url().includes("step=tca-5"));
check("rbc：选中步取消置灰（sel 可见）", await page.evaluate(() => {
  const g = document.querySelector('svg g[data-step-id="tca-5"]');
  return !!g && g.classList.contains("sel") && parseFloat(getComputedStyle(g).opacity) > 0.9;
}));
// 切回肝：置灰立即恢复（重新载入避免选中态干扰）
await page.goto(`${BASE}/pathway/tca?organ=liver`, { waitUntil: "networkidle" });
check("切回肝：环上不再置灰", await page.evaluate(() => {
  const gs = [...document.querySelectorAll('svg g[data-step-id^="tca-"]:not([data-step-id="tca-pdh"])')];
  return gs.length === 8 && gs.every((g) => !g.classList.contains("faded"));
}));

// ===== 3) 右栏详情 + 3D 占位 =====
await page.goto(`${BASE}/pathway/tca?step=tca-5`, { waitUntil: "networkidle" });
check("详情栏不再展示 ΔG 数值", (await page.locator('.d-cof.num', { hasText: "标准态" }).count()) === 0);
check("ΔG 生理态口径说明已撤下", (await page.locator(".d-dgnote").count()) === 0);
check("3D 占位说明核验原因", (await page.locator("aside .d-none").last().innerText()).includes("待结构核验"));
check("能量结算 ×2 口径", (await page.locator(".settle-net").innerText()).includes("两轮 ×2"));

// ===== 4) 自测模式 =====
await page.goto(`${BASE}/pathway/tca?organ=liver`, { waitUntil: "networkidle" });
await page.locator(".quiz-toggle").click();
await page.waitForTimeout(400); // 等透明度过渡（0.15s）走完再采样
const hiddenCount = await page.locator("svg .q-hide:not(.revealed)").evaluateAll(
  (els) => els.filter((el) => getComputedStyle(el).opacity < 0.5).length
);
check("自测开启：酶名/代谢物名被遮蔽（>20 处）", hiddenCount > 20);
await page.locator("svg .st-name.q-hide").first().click();
check("点击酶名揭晓", (await page.locator("svg .st-name.revealed").count()) === 1);

// ===== 5) 回补区 =====
check("回补反应表存在（4 条）", (await page.locator(".footnote").innerText()).includes("ANAPLEROSIS"));
check("丙酮酸羧化酶条目在", (await page.locator(".footnote").innerText()).includes("丙酮酸羧化酶"));

// ===== 6) 几何目检（不读 PNG，程序化替代）：标签不压环上节点 / 回流带权重低于主链 =====
const overlap = await page.evaluate(() => {
  const svg = document.querySelector("svg.plate-canvas svg, .plate-canvas svg") ?? document.querySelector("svg");
  const nodes = [...svg.querySelectorAll("g.node circle")];
  const labels = [...svg.querySelectorAll("svg g.stepg text")];
  const hits = [];
  for (const t of labels) {
    const tb = t.getBoundingClientRect();
    for (const c of nodes) {
      const cb = c.getBoundingClientRect();
      const ix = Math.max(0, Math.min(tb.right, cb.right) - Math.max(tb.left, cb.left));
      const iy = Math.max(0, Math.min(tb.bottom, cb.bottom) - Math.max(tb.top, cb.top));
      if (ix > 2 && iy > 2) hits.push(`${t.textContent}×${c.parentNode.getAttribute("data-node-id")}`);
    }
  }
  return hits;
});
check("步骤标签不压环上节点（几何目检）", overlap.length === 0);
if (overlap.length) console.log("  重叠：" + overlap.join(", "));
const bandW = await page.evaluate(() => {
  const p = [...document.querySelectorAll("svg g.branch path")].find((el) => el.getAttribute("d")?.startsWith("M 420,167"));
  return p ? parseFloat(getComputedStyle(p).strokeWidth) : null;
});
const mainW = await page.evaluate(() => {
  const p = document.querySelector('svg g[data-step-id="tca-1"] path.arrow');
  return p ? parseFloat(getComputedStyle(p).strokeWidth) : null;
});
check("回流带线宽低于主链（1 < 1.6）", bandW !== null && mainW !== null && bandW < mainW);

// ===== 8) 点击语义修复（与糖酵解同款）：点标签/点节点名选中；自测下点名字揭晓而非选中 =====
await page.goto(`${BASE}/pathway/tca?organ=liver&step=tca-3`, { waitUntil: "networkidle" });
{
  // 非自测：点环上步骤标签（酶名文本）→ 切换选中（进入时 tca-3 已选中：先取消、再选中）
  const clickTca3Name = () =>
    page.evaluate(() => {
      document
        .querySelector('svg g[data-step-id="tca-3"] .st-name')
        ?.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
    });
  await clickTca3Name();
  await page.waitForTimeout(250);
  check("非自测点击已选步骤的标签 → 取消选中（切换语义）", (await page.locator('svg .stepg.sel[data-step-id="tca-3"], svg g.stepg.sel[data-step-id="tca-3"]').count()) === 0);
  await clickTca3Name();
  await page.waitForTimeout(250);
  check("非自测点击环上步骤标签（酶名）选中 tca-3", (await page.locator('svg g[data-step-id="tca-3"].sel, svg g.sel[data-step-id="tca-3"]').count()) === 1);
  check("非自测点击标签不产生揭晓标记（无 revealed）", (await page.locator("svg .q-hide.revealed").count()) === 0);

  // 非自测：点代谢物节点名文本（琥珀酸缩略名）→ 产出语义选中 tca-5
  await page.locator('svg g.node[data-node-id="suc"] .q-hide').first().click({ force: true });
  await page.waitForTimeout(250);
  check("非自测点击节点名（琥珀酸）选中 tca-5", (await page.locator('svg g[data-step-id="tca-5"].sel, svg g.sel[data-step-id="tca-5"]').count()) === 1);

  // 自测：当前选中 tca-5，点 tca-3 的酶名 → 只揭晓、不切换选中（与非自测语义相反）
  await page.locator(".quiz-toggle").click();
  await page.waitForTimeout(400);
  const quizHit = await page.evaluate(() => {
    const el = document.querySelector('svg.quiz-on g[data-step-id="tca-3"] .st-name');
    if (!el) return false;
    el.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
    return true;
  });
  await page.waitForTimeout(200);
  check("自测酶名元素存在", quizHit);
  check("自测点击酶名揭晓（revealed 生效）", await page.evaluate(() => document.querySelector('svg g[data-step-id="tca-3"] .st-name')?.classList.contains("revealed") ?? false));
  check("自测点击酶名不切换选中（仍为 tca-5，tca-3 未被选中）", (await page.locator('svg g[data-step-id="tca-5"].sel').count()) === 1 && (await page.locator('svg g[data-step-id="tca-3"].sel').count()) === 0);
  await page.locator(".quiz-toggle").click();
  await page.waitForTimeout(200);
}

// ===== 6.5) 右栏结构对照入口：九步全部有分子资产 → 都是真链接（不是灰字、不是空链接） =====
{
  const TCA_STEP_IDS = ["tca-pdh", "tca-1", "tca-2", "tca-3", "tca-4", "tca-5", "tca-6", "tca-7", "tca-8"];
  let allLinks = true;
  const bad = [];
  for (const id of TCA_STEP_IDS) {
    await page.goto(`${BASE}/pathway/tca?organ=liver&step=${id}`, { waitUntil: "domcontentloaded" });
    const entry = page.locator('[data-testid="tca-structure-cmp-entry"]');
    if ((await entry.count()) !== 1) {
      allLinks = false;
      bad.push(`${id}:无入口`);
      continue;
    }
    const href = await entry.getAttribute("href");
    const text = (await entry.innerText()).trim();
    if (!href || !href.endsWith(`/structures/tca#${id}`)) {
      allLinks = false;
      bad.push(`${id}:href=${href}`);
    }
    if (!text.includes("看这一步的结构对照")) {
      allLinks = false;
      bad.push(`${id}:文案=${text}`);
    }
    if ((await page.locator('[data-testid="tca-structure-cmp-none"]').count()) !== 0) {
      allLinks = false;
      bad.push(`${id}:出现灰字`);
    }
  }
  check("九步右栏都有「看这一步的结构对照 →」真链接，指向 /structures/tca#<stepId>", allLinks);
  if (!allLinks) console.log("  入口异常：" + bad.join("、"));
}

// ===== 7) 截图（供人工复核，脚本不读取） =====
await page.goto(`${BASE}/pathway/tca?organ=liver`, { waitUntil: "networkidle" });
await page.screenshot({ path: join(ROOT, "preview", "poster-tca.png"), fullPage: false });
console.log("✓ 截图 preview/poster-tca.png（1440 宽）");

check("无页面错误", errors.length === 0);
if (errors.length) console.log(errors.join("\n"));

await browser.close();
if (failed) {
  console.error("冒烟存在失败项");
  process.exit(1);
}
console.log("冒烟验证全部通过");
