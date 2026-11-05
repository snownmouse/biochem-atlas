// 脂肪酸从头合成（FAS）挂图页冒烟。
// 口径：
//   1) 路由 /pathway/fas 可达，PLATE 08 报头、三泳道、8 步、4 步环
//   2) 环闭合：4 条循环步 + 1 条回流弧 + 1 条出环弧；链长标尺 C2→C16
//   3) 镜像对照表与能量账本（7 ATP / 14 NADPH / 8 乙酰-CoA / 8×C2=C16）
//   4) 点击语义：先 .q-hide → [data-step-id] → [data-node-id]；同实体多节点可点
//   5) 1440 首屏：七条通路标题全部可见（含新增 FAS），最低标题底边 ≤ 900
//   6) 无 emoji / 圆角卡片 / 渐变；截图 poster-fas.png（fullPage）+ poster-fas-1440.png
// 需先 `npm run build`，再 `npm run preview`（或 BASE_URL 指向本地服务）。
import { mkdirSync } from "node:fs";
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

const resp = await page.goto(`${BASE}/pathway/fas`, { waitUntil: "networkidle" });
await page.waitForSelector('svg[data-frame="fas"]', { timeout: 10000 });

// ===== 1) 路由与报头 =====
check("/pathway/fas 返回 200", resp?.status() === 200, String(resp?.status()));
check("报头 PLATE 08 / 12", (await page.locator(".plate-no").innerText()).includes("PLATE 08"));
check("报头写脂肪酸从头合成", (await page.locator(".masthead h1").innerText()).includes("脂肪酸从头合成"));
check("首屏无 3D canvas", (await page.locator("canvas").count()) === 0);
check("无控制台报错", errors.length === 0, errors.join(" | "));

// ===== 2) 三泳道 =====
const svg = page.locator('svg[data-frame="fas"]');
check("三泳道锚点", (await svg.getAttribute("data-lanes")) === "mito-matrix,mito-inner-membrane,cytosol");
const svgText = await svg.evaluate((el) => el.textContent ?? "");
check("区室标签：线粒体基质", svgText.includes("线粒体基质"));
check("区室标签：线粒体内膜 · 转运带", svgText.includes("线粒体内膜 · 转运带"));
check("区室标签：细胞质", svgText.includes("细胞质 · CYTOSOL"));
check("区室不只靠颜色（三条带位都有文字）", svgText.includes("MITOCHONDRIAL MATRIX") && svgText.includes("TRANSPORT BAND"));

// ===== 3) 8 步 / 4 环 / 环闭合 =====
const stepIds = await page.locator("[data-step-id]").evaluateAll((els) =>
  els.map((el) => el.getAttribute("data-step-id"))
);
const uniqStepIds = [...new Set(stepIds)];
check("每步恰好一个 g[data-step-id]（8 步）", stepIds.length === 8 && uniqStepIds.length === 8, stepIds.join(","));
check(
  "步骤 id 顺序覆盖 PDH → 穿梭 → ACC → 四步环 → TE",
  JSON.stringify(stepIds) ===
    JSON.stringify(["fas-pdh", "fas-shuttle", "fas-acc", "fas-ks", "fas-kr", "fas-dh", "fas-er", "fas-te"]),
  stepIds.join(",")
);
const cycleSteps = await page.locator("[data-cycle-step]").evaluateAll((els) =>
  els.map((el) => el.getAttribute("data-step-id"))
);
check("四步环 = 4 个循环步", cycleSteps.length === 4, cycleSteps.join(","));
check(
  "循环步顺序 KS → KR → DH → ER",
  JSON.stringify(cycleSteps) === JSON.stringify(["fas-ks", "fas-kr", "fas-dh", "fas-er"]),
  cycleSteps.join(",")
);
check("回流弧存在且唯一", (await page.locator("[data-return-arc]").count()) === 1);
check("出环弧存在且唯一", (await page.locator("[data-exit-arc]").count()) === 1);
check("图内写明回流弧不是第 5 步", svgText.includes("不是第 5 步") && svgText.includes("回流弧"));
check("右栏环语义块存在", (await page.locator("[data-return-note]").count()) === 1);
check(
  "环语义块写明 4 个 data-cycle-step",
  (await page.locator("[data-return-note]").innerText()).includes("4 个")
);
const returnAttrs = await page.locator("[data-return-arc]").evaluate((el) => ({
  strokeWidth: el.getAttribute("stroke-width"),
  dash: el.getAttribute("stroke-dasharray"),
  opacity: el.getAttribute("opacity"),
}));
check(
  "回流弧是低权重点线（不是主链）",
  parseFloat(returnAttrs.strokeWidth) < 1.2 && Boolean(returnAttrs.dash) && parseFloat(returnAttrs.opacity) < 0.8,
  JSON.stringify(returnAttrs)
);

// 链长标尺：C2, C4, ... C16
const ruler = await page.locator("[data-chain-ruler]").evaluate((el) => el.textContent ?? "");
const carbons = ruler.match(/C\d+/g) ?? [];
const expectedCarbons = ["C2", "C4", "C6", "C8", "C10", "C12", "C14", "C16"];
check("链长标尺 8 个刻度", carbons.length >= 8, carbons.join(","));
check("链长标尺覆盖 C2→C16", expectedCarbons.every((c) => carbons.includes(c)), carbons.join(","));
check("标尺写明每轮 +2C", ruler.includes("每轮 +2C"));

// ===== 4) 镜像对照表 =====
check("镜像对照表存在", (await page.locator('[data-testid="fas-mirror-table"]').count()) === 1);
const mirrorText = await page.locator('[data-testid="fas-mirror-table"]').innerText();
const mirrorRows = await page.locator("[data-mirror-row]").count();
check("镜像表 8 行", mirrorRows === 8, String(mirrorRows));
for (const item of ["区室", "酰基载体", "辅因子", "四步酶名", "断键 / 成键方向", "产物"]) {
  check(`镜像表含「${item}」`, mirrorText.includes(item));
}
check("镜像表合成侧写 ACP", mirrorText.includes("ACP"));
check("镜像表氧化侧写 CoA", mirrorText.includes("CoA-SH"));
check("镜像表写 NADPH vs FAD / NAD⁺", mirrorText.includes("NADPH") && mirrorText.includes("FAD / NAD⁺"));
check("镜像表写成键 +2C / 断键 −2C", mirrorText.includes("+2C") && mirrorText.includes("−2C"));

// ===== 5) 能量账本 =====
const ledgerText = await page.locator("[data-ledger-derivation]").innerText();
check("能量账 ATP = 7", ledgerText.includes("7") && ledgerText.includes("ATP"));
check("能量账 NADPH = 14", ledgerText.includes("14") && ledgerText.includes("NADPH"));
check("能量账 8 乙酰-CoA", ledgerText.includes("8"));
check("能量账净结果 C16", (await page.locator("[data-net-carbon]").getAttribute("data-net-carbon")) === "16");
check("能量账写明 8 × C2 = C16", ledgerText.includes("C16"));
const plateLedger = await page.locator("[data-plate-ledger]").evaluate((el) => el.textContent ?? "");
check("图上大数字账：+2 C × 7 轮", plateLedger.includes("+2 C") && plateLedger.includes("7 轮"));
check("图上大数字账：ATP 7 / NADPH 14", plateLedger.includes("ATP") && plateLedger.includes("NADPH") && plateLedger.includes("14"));
check("碳守恒块存在", (await page.locator("[data-carbon-check]").count()) === 1);
const carbonText = await page.locator("[data-carbon-check]").innerText();
check("碳守恒写 8 × C2 = C16", carbonText.includes("8 × C2 = C16"));
check("缩合位置写 C2–C3，不是 C3–C4", carbonText.includes("C2–C3") && carbonText.includes("不是 C3–C4"));

// ===== 6) 右栏详情与证据等级 =====
await page.locator('[data-step-id="fas-acc"] text.q-hide').first().click();
await page.waitForTimeout(120);
check("点击 ACC 步骤写入 ?step=", page.url().includes("step=fas-acc"));
check("详情显示 ACC 方程", (await page.locator(".d-eq").innerText()).includes("丙二酰-CoA"));
check("详情显示 ΔG 为 null 定性", (await page.locator("[data-dg]").innerText()).includes("数值未核实"));
const grade = await page.locator('[data-testid="fas-grade"]').evaluate((el) => ({
  attr: el.getAttribute("data-grade"),
  text: el.innerText,
}));
check("证据等级由 evidenceGrade 推导为 C（人源非本酶）", grade.attr === "C" && grade.text.includes("C 人源非本酶"), JSON.stringify(grade));
check("结构对照入口存在", (await page.locator('[data-testid="fas-structure-cmp-entry"]').count()) === 1);
const cmpHref = await page.locator('[data-testid="fas-structure-cmp-entry"]').getAttribute("href");
check("结构对照指向 /structures/fatty-acid-synthesis#fas-acc", (cmpHref ?? "").endsWith("/structures/fatty-acid-synthesis#fas-acc"), cmpHref ?? "null");
await page.locator('[data-testid="fas-structure-cmp-entry"]').click();
await page.waitForSelector("[data-step] , .sf-step, body");
check("结构页可达 /structures/fatty-acid-synthesis", page.url().includes("/structures/fatty-acid-synthesis"));
await page.goBack({ waitUntil: "networkidle" });
await page.waitForSelector('svg[data-frame="fas"]');

// ===== 7) 点击语义：机器 / 同实体多节点 =====
// 回退到干净路由：上一节选中过 fas-acc，沿用同一步再点会按「再点取消」语义清空，不能用来验证选中
await page.goto(`${BASE}/pathway/fas`, { waitUntil: "networkidle" });
await page.waitForSelector('svg[data-frame="fas"]');
await page.locator("[data-node-id='acc'] rect").click();
await page.waitForTimeout(120);
check("点 ACC 机器 → fas-acc", page.url().includes("step=fas-acc"));
await page.locator("[data-node-id='accoa-mito'] circle").click();
await page.waitForTimeout(120);
check("点基质乙酰-CoA → 穿梭步（同实体多节点 1）", page.url().includes("step=fas-shuttle"));
await page.locator("[data-node-id='accoa-cyt'] circle").click();
await page.waitForTimeout(120);
check("点胞质乙酰-CoA → ACC（同实体多节点 2）", page.url().includes("step=fas-acc"));
await page.locator("[data-node-id='acylacp-next'] circle").click();
await page.waitForTimeout(120);
check("点 Cₙ₊₂ 节点 → ER 收口", page.url().includes("step=fas-er"));
await page.locator("[data-node-id='palmitate'] circle").click();
await page.waitForTimeout(120);
check("点棕榈酸 → TE", page.url().includes("step=fas-te"));

// ===== 8) 自测模式：q-hide 先判，点揭晓不改 URL =====
await page.goto(`${BASE}/pathway/fas`, { waitUntil: "networkidle" });
await page.locator(".quiz-toggle").click();
const hidden = await page.locator("svg .q-hide").count();
check("自测隐藏酶名 / 代谢物名（≥ 20 处）", hidden >= 20, String(hidden));
const before = page.url();
await page.locator('[data-step-id="fas-kr"] .q-hide').first().click();
await page.waitForTimeout(100);
const revealed = await page.locator('[data-step-id="fas-kr"] .q-hide.revealed').count();
check("自测点击揭晓（q-hide 先判）", revealed >= 1, String(revealed));
check("自测揭晓不改 URL（不会误触步骤）", page.url() === before);
await page.locator('[data-step-id="fas-kr"] text').last().click();
await page.waitForTimeout(120);
check("自测模式下点步骤仍可选中", page.url().includes("step=fas-kr"), page.url());
await page.locator(".quiz-toggle").click();

// ===== 9) 器官视图 =====
await page.locator("[data-organ-tab='mammary']").click();
await page.waitForTimeout(100);
check("器官 tab 切到乳腺并写 URL", page.url().includes("organ=mammary"));
await page.locator('[data-step-id="fas-ks"] text.q-hide').first().click();
await page.waitForTimeout(120);
const organNote = await page.locator("[data-organ-note]").innerText();
check("乳腺下 KS 如实写「本步无差异」", organNote.includes("本步无") && organNote.includes("乳腺（泌乳期）"), organNote);

// ===== 10) 1440 首页展开档：十条通路标题全见 =====
// 政策（2026-11-05）：无参数默认改为「收起辅助栏 + 等比铺满」，首屏完整可见 8/10。
// 本条原判定口径是展开档，用同一套 ?fold=open 还原；断言与阈值未改。
// 默认档 8/10 的新口径在 smoke-home 第 15 节按四视口逐档实测。
await page.setViewportSize({ width: 1440, height: 900 });
await page.goto(`${BASE}/?fold=open`, { waitUntil: "networkidle" });
const homeTitles = await page.locator("[data-pathway-title]").evaluateAll((els) => {
  const map = document.querySelector('svg[data-home-map="1"]')?.getBoundingClientRect();
  return els.map((el) => {
    const r = el.getBoundingClientRect();
    return {
      id: el.getAttribute("data-pathway-title"),
      text: el.textContent ?? "",
      x: r.left,
      y: r.top,
      right: r.right,
      bottom: r.bottom,
      mapTop: map?.top ?? null,
    };
  });
});
check("首页十条通路标题（八区块 + 糖原 + Cori 连接带）", homeTitles.length === 10, String(homeTitles.length));
check("首页出现「脂肪酸从头合成」标题", homeTitles.some((t) => t.id === "fatty-acid-synthesis" && t.text.includes("脂肪酸从头合成")));
check("首页出现「尿素循环」标题", homeTitles.some((t) => t.id === "urea-cycle" && t.text.includes("尿素循环")));
check("首页出现「糖原代谢」标题", homeTitles.some((t) => t.id === "glycogen" && t.text.includes("糖原代谢")));
check("首页十条标题都在 1440×900 首屏内", homeTitles.every((t) => t.x >= 0 && t.right <= 1440 && t.y >= 0 && t.bottom <= 900), JSON.stringify(homeTitles.map((t) => [t.id, t.y, t.bottom])));
const lowest = Math.max(...homeTitles.map((t) => t.bottom));
check("十条标题最低底边 ≤ 900", lowest <= 900, String(Math.round(lowest)));
const fasTitle = homeTitles.find((t) => t.id === "fatty-acid-synthesis");
const faoTitle = homeTitles.find((t) => t.id === "fatty-acid-oxidation");
check("FAS 标题在 β-氧化标题上方（胞质侧镜像）", Boolean(fasTitle && faoTitle) && fasTitle.bottom < faoTitle.y, JSON.stringify([fasTitle?.bottom, faoTitle?.y]));
const homeText = await page.locator('svg[data-home-map="1"]').evaluate((el) => el.textContent ?? "");
check("首页 FAS 标题脚注写镜像 / 胞质", homeText.includes("胞质") && homeText.includes("镜像"));

// ===== 11) 体例红线：无 emoji / 圆角卡片 / 渐变 =====
const emoji = await page.evaluate(() => /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u.test(document.body.innerText));
check("无 emoji", emoji === false);
const radius = await page.evaluate(() => {
  const card = document.querySelector(".panel-block");
  if (!card) return null;
  const s = getComputedStyle(card);
  return { borderRadius: s.borderRadius, boxShadow: s.boxShadow };
});
check("panel-block 无圆角 / 无投影", Boolean(radius) && radius.borderRadius === "0px" && radius.boxShadow === "none", JSON.stringify(radius));
const gradients = await page.evaluate(() =>
  Array.from(document.querySelectorAll("*")).filter((el) => (el.getAttribute("style") ?? "").includes("gradient")).length
);
check("无内联渐变", gradients === 0, String(gradients));

// ===== 12) 截图 =====
await page.goto(`${BASE}/pathway/fas`, { waitUntil: "networkidle" });
await page.screenshot({ path: join(ROOT, "preview", "poster-fas-1440.png") });
console.log("✓ 截图 preview/poster-fas-1440.png（1440×900 首屏）");
await page.screenshot({ path: join(ROOT, "preview", "poster-fas.png"), fullPage: true });
console.log("✓ 截图 preview/poster-fas.png（1440 宽 fullPage）");

await browser.close();
console.log("");
if (failed) {
  console.error("✗ smoke-fas 存在失败项");
  process.exit(1);
} else {
  console.log("✓ smoke-fas 全部通过");
}
