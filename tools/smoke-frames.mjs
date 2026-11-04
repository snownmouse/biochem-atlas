// ============================================================
// 结构对照页冒烟（/structures/glycolysis）
//
// 本轮为什么不成立（不静默删、逐条写原因）：
//   · 旧口径是「2D 结构式为主 + 缺资产 7 步如实写缺」：页面把 2D 当主角，gk-1/gk-6/gk-9
//     两侧齐全，其余 7 步缺一侧，并用 [data-testid="comparison-partial"] / ["missing-2d"] 标出。
//   · 上一轮改为「3D 形状为主、2D 降为折叠块」：comparison-reaction / comparison-pair /
//     comparison-partial 节点已不存在；「缺一侧 7 步」改为「10 步两侧齐全、missing-2d = 0」。
//   · 本轮再改：页头一个开关整页切换 2D/3D，details 折叠层取消，2D 成为一等公民：
//     - [data-testid="cmp-2d"]（details）与「默认折叠/展开后可见」的断言【因交互改版删除】；
//       替代断言：mode-auto / mode-2d / mode-3d 按钮、默认按数据规则逐块呈现、
//       切 2D 后 mol-2d 出现且 mol-3d 归零、?mode=2d 刷新还原、
//       切换前后 .cmp3d-side 的 x/y/w/h 完全不变、2D 圈注命中真实原子。
//     - [data-testid="comparison-3d"] 更名为 comparison-strip：该容器现在两种模式都用，
//       再叫 3d 会误导；对应断言随之改名（语义不变）。
//     - 截图不再"展开 details"，改为分别在 3D / 2D 模式截同一块（同位置两版）。
//   · 最新追加（默认模式配置规则）：
//     - 「默认 3D + 21 个 3D 画布」【因功能替换改写】：默认模式改为逐块读 defaultMode，
//       4 块（gk-2/gk-4/gk-5/gk-8）按数据判据默认 2D、其余 6 块默认 3D，故默认是 12 个
//       mol-3d + 9 个 mol-2d；显式 ?mode=3d 仍强制整页 21 个 3D（保留原 21 的覆盖）。
//     - 「每个分子都有来源标签」的计数改为 mol-3d-source + mol-2d-source = 21：
//       2D 页脚现在也显示与 3D 同一来源行（实验/计算分类与 PDB 字段不因模式丢失）。
//     - 键盘 Tab 从「返回 → 3D → 2D」变为「返回 → 按规则 → 3D → 2D」。
//   · 仍保留的覆盖：3D 球棍数量/来源标签（实验 vs 计算不混标）、变化原子三色、
//     体积与主轴变化、2D/3D 两侧齐全、无 missing-2d。
//
// 需先 `npm run build`，再 `npm run preview`（或 BASE_URL 指向本地服务）。
import { mkdirSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright-core";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const BASE = process.env.BASE_URL ?? "http://localhost:4173";
const ROUTE = `${BASE}/structures/glycolysis`;
let failed = false;
const check = (label, ok) => {
  console.log(`${ok ? "✓" : "✗"} ${label}`);
  if (!ok) failed = true;
};

// 期望覆盖：直接读对照数据源，避免断言与页面漂移。
// 数据已按 pathwayId 搬进 comparisonConfig.ts（stepComparison.ts 只剩类型），
// 这里改读新文件；gk- 正则只取糖酵解，不受 TCA 的 tca-* 影响。
const dataSrc = readFileSync(join(ROOT, "src", "data", "comparisonConfig.ts"), "utf8");
const STEP_IDS = [...dataSrc.matchAll(/stepId: "(gk-\d+)"/g)].map((m) => m[1]);

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
mkdirSync(join(ROOT, "preview"), { recursive: true });

const settle = async () => {
  await page.waitForFunction(() => document.querySelectorAll(".cmp-block").length === 10, null, {
    timeout: 30000,
  });
  await page.waitForFunction(
    () => document.querySelectorAll('[data-testid="mol-3d"][data-mol-id="loading"]').length === 0,
    null,
    { timeout: 30000 }
  );
  // 默认模式已逐块混合：2D 卡片也要等自己的 2D 资产加载完
  await page.waitForFunction(
    () => document.querySelectorAll('[data-testid="mol-2d"] .cmp-load').length === 0,
    null,
    { timeout: 30000 }
  );
};
const scrollToStep = async (id) => {
  await page.locator(`#${id}`).scrollIntoViewIfNeeded();
};
const wait3d = async (id) => {
  const panel = page.locator(`#${id} [data-testid="enzyme-3d"]`);
  await panel.locator('[data-testid="enzyme-3d-host"] canvas').waitFor({ state: "attached", timeout: 30000 });
  await page.waitForFunction(
    (sid) => {
      const el = document.querySelector(`#${sid} [data-testid="ligand-toggle"]`);
      return el && !el.hasAttribute("disabled");
    },
    id,
    { timeout: 30000 }
  );
};
// 2D 不再通过 details 展开：用页头开关整页切换（见下面 mode-2d 按钮断言）

// ===== 1) 页面形态：十步竖向排列 =====
await page.goto(ROUTE, { waitUntil: "networkidle" });
await settle();
check("页面标题为「糖酵解 · 结构对照」", (await page.locator("h1").innerText()).includes("结构对照"));
check(`十步逐一成块（${STEP_IDS.length} 块）`, (await page.locator(".cmp-block").count()) === STEP_IDS.length);
check(
  "步骤顺序 gk-1…gk-10",
  JSON.stringify(await page.locator(".cmp-block").evaluateAll((els) => els.map((e) => e.getAttribute("data-step-id")))) ===
    JSON.stringify(STEP_IDS)
);
check("每块都有 3D 静置面板", (await page.locator('.cmp-block [data-testid="enzyme-3d"]').count()) === STEP_IDS.length);
// 容器改名 comparison-strip：现在 3D/2D 两种模式都用它，不再只属于 3D
check("每块都有结构对照区（3D/2D 共用容器）", (await page.locator('[data-testid="comparison-strip"]').count()) === STEP_IDS.length);
check("每块都有「这一步改了什么」", (await page.locator('[data-testid="change-line"]').count()) === STEP_IDS.length);
check("每块都有一句生理意义", (await page.locator(".cmp-phys").count()) === STEP_IDS.length);

// 诚实口径：页面明说"不播放动画"
const summary = await page.locator(".mast-summary").innerText();
check("页头明说本页不播放动画、不演配体进入", summary.includes("不播放动画") && summary.includes("配体进入口袋"));
check("页头把 3D 形状写成对照主角", summary.includes("3D 球棍") && summary.includes("拖动可旋转"));
check("每个 3D 面板都写明「静态结构」", (await page.locator(".e3d-say").count()) === STEP_IDS.length);
check(
  "3D 面板说明含「不播放构象过渡」",
  (await page.locator('#gk-1 .e3d-say').innerText()).includes("不播放构象过渡")
);

// 运动控件必须彻底消失（功能取消，不是隐藏）
check("无运动时间轴残留", (await page.locator(".motion-timeline").count()) === 0);
check("无播放控件残留（.film-controls）", (await page.locator(".film-controls").count()) === 0);
check("无帧带缩略图残留（.band-thumb）", (await page.locator(".band-thumb").count()) === 0);
check("无运动舞台残留（.motion-stage）", (await page.locator(".motion-stage").count()) === 0);

// ===== 2) 3D 球棍：数量、来源标签、变化原子高亮、体积数字 =====
// 9 步各 2 个分子；gk-4 产物为 DHAP+GAP 两分子（3 个）。
// 默认按规则是"整块"生效：gk-4 被数据判据命中后，底物/产物 3 个卡片一起走 2D。
check("默认按规则：12 个 3D 卡片", (await page.locator('[data-testid="mol-3d"]').count()) === 12);
check("默认按规则：9 个 2D 卡片", (await page.locator('[data-testid="mol-2d"]').count()) === 9);
check(
  "gk-4 整块默认 2D（底物 1 + 产物 2，共 3 个 2D、0 个 3D）",
  (await page.locator('#gk-4 [data-testid="mol-2d"]').count()) === 3 &&
    (await page.locator('#gk-4 [data-testid="mol-3d"]').count()) === 0
);
check(
  "每步都有左右两侧",
  (await page.locator('.cmp3d-side[data-side="substrate"]').count()) === 10 &&
    (await page.locator('.cmp3d-side[data-side="product"]').count()) === 10
);
check(
  "每个分子都有来源标签（3D + 2D 页脚合计 21）",
  (await page.locator('[data-testid="mol-3d-source"]').count()) +
    (await page.locator('[data-testid="mol-2d-source"]').count()) === 21
);
check("每个分子都有体积与主轴数字", (await page.locator('[data-testid="mol-3d-shape"]').count()) === 21);
check("每步箭头都有体积变化 ΔV", (await page.locator('[data-testid="shape-delta"]').count()) === 10);

const provCounts = await page.evaluate(() => ({
  exp: document.querySelectorAll(".mol3d-prov.experimental").length,
  calc: document.querySelectorAll(".mol3d-prov.computed").length,
}));
// 实验坐标：glc/g6p/f6p/fbp/fbp-linear/dhap/3pg/2pg/pep 共 15 处；计算构象：gap×3、bpg13×2、pyr×1 = 6 处。
// 2D 页脚也带同一来源分类，所以默认混合模式下计数与整页 3D 时一致（分类不因模式丢失）。
check(`实验坐标标签 15 处（实际 ${provCounts.exp}）`, provCounts.exp === 15);
check(`计算构象标签 6 处（实际 ${provCounts.calc}）`, provCounts.calc === 6);
check("计算构象标签写明 ETKDG+MMFF94 与最低能量", (await page.locator(".mol3d-prov.computed").first().innerText()).includes("ETKDGv3 + MMFF94"));
check("计算构象标签写明「自由态，不等于结合态」", (await page.locator(".mol3d-prov.computed").first().innerText()).includes("自由态，不等于结合态"));
// 为什么不再取 .experimental nth(1)：DOM 顺序是 glc→g6p→g6p→f6p…，第 2 个实验标签是 g6p（1CZA），
// 与"2CXS"无关；改为按分子 id 精确定位 f6p 的来源行（默认 2D 时该行在 mol-2d-source 上）。
check(
  "实验坐标标签写明 PDB ID 与分辨率（f6p · 2CXS / 1.5 Å）",
  /2CXS/.test(await page.locator('[data-mol-id="f6p"] .mol3d-prov').first().innerText()) &&
    /1\.5/.test(await page.locator('[data-mol-id="f6p"] .mol3d-prov').first().innerText())
);
check(
  "gk-4 同一步同时出现实验坐标与计算构象，两类不混标",
  (await page.locator('#gk-4 .mol3d-prov.experimental').count()) >= 1 &&
    (await page.locator('#gk-4 .mol3d-prov.computed').count()) >= 1
);

// 变化原子：三色标记落在 3D 上，DOM 侧给出原子名与语义（canvas 内的高亮由同一 marks 应用）
check("gk-1 产物标出新增的 γ-磷酸（added）", (await page.locator('#gk-1 [data-side="product"] [data-mark-kind="added"]').count()) === 1);
check("gk-1 产物标出新键（C6/O6）", (await page.locator('#gk-1 [data-side="product"] [data-mark-kind="newbond"]').count()) === 2);
check("gk-7 底物标离去基（酰基磷酸整体）", (await page.locator('#gk-7 [data-side="substrate"] [data-mark-kind="leaving"]').count()) === 3);
check("gk-9 产物标 C2=C3 新双键", (await page.locator('#gk-9 [data-side="product"] [data-mark-kind="newbond"]').count()) === 2);
check("三色图例齐全", /新增基团/.test(await page.locator(".cmp3d-legend").first().innerText()) &&
  /新键/.test(await page.locator(".cmp3d-legend").first().innerText()) &&
  /离去基/.test(await page.locator(".cmp3d-legend").first().innerText()));
// 变化原子的名字必须真的存在于对应 3D 资产（否则"标砖红"只是一行字）
check("所有变化原子名都能在 3D 资产里找到", (await page.locator('[data-mark-found="0"]').count()) === 0);
check("所有变化原子都有语义与图例色", (await page.locator(".mol3d-marks li").count()) === (await page.locator(".mol3d-marks li[data-mark-kind]").count()));

// ===== 3) 页头显示模式：默认按数据规则逐块呈现、显式 ?mode= 覆盖、切换不重排 =====
// 旧断言 [data-testid="cmp-2d"]:not([open]) / .cmp-svg 不可见 / open2d 已删除：
// details 折叠层被页头开关取代（用户要求 2D 成为一等公民），交互从"逐块展开"改成"整页切换"。
// 最新追加：默认不再固定 3D，而是逐块读 defaultMode（gk-2/gk-4/gk-5/gk-8 默认 2D）。
check("开关是三个真实 <button>（含「按规则」）", await page.evaluate(() => {
  const btns = [...document.querySelectorAll('[data-testid="mode-auto"], [data-testid="mode-3d"], [data-testid="mode-2d"]')];
  return btns.length === 3 && btns.every((b) => b.tagName === "BUTTON" && b.getAttribute("type") === "button");
}));
check(
  "默认按规则：URL 不带 mode、按规则按钮 aria-pressed=true",
  !page.url().includes("mode=") &&
    (await page.locator('[data-testid="mode-auto"]').getAttribute("aria-pressed")) === "true" &&
    (await page.locator('[data-testid="mode-3d"]').getAttribute("aria-pressed")) === "false" &&
    (await page.locator('[data-testid="mode-2d"]').getAttribute("aria-pressed")) === "false"
);
check("默认按规则时页头 data-mode=auto", (await page.locator('[data-page="comparison"]').getAttribute("data-mode")) === "auto");
// 数据字段生效：4 块 defaultMode=2d，页面逐块落到该模式；其余 6 块仍 3d
check("配置里 4 块默认 2D（gk-2/gk-4/gk-5/gk-8）", (await page.locator('.cmp-block[data-default-mode="2d"]').count()) === 4);
check(
  "默认 2D 的 4 块实际渲染 2D，其余 6 块渲染 3D",
  (await page.locator('.cmp-block[data-default-mode="2d"][data-mode="2d"]').count()) === 4 &&
    (await page.locator('.cmp-block[data-default-mode="3d"][data-mode="3d"]').count()) === 6
);
check(
  "默认 2D 的块逐块写明数据判据（4 条 rule）",
  (await page.locator('[data-testid="default-mode-rule"]').count()) === 4 &&
    (await page.locator('[data-testid="default-mode-tag"]').count()) === 4
);
const gk2Rule = await page.locator("#gk-2 [data-testid='default-mode-rule']").innerText();
const gk4Rule = await page.locator("#gk-4 [data-testid='default-mode-rule']").innerText();
check(
  "gk-2 判据数字：ΔV +1.00% 且六元环→五元环",
  /\+1\.00%/.test(gk2Rule) && /六元环→五元环/.test(gk2Rule)
);
check(
  "gk-4 判据数字：ΔV +2.27% 且 C3–C4 断裂、1 分子→2 分子",
  /\+2\.27%/.test(gk4Rule) && /C3–C4/.test(gk4Rule) && /1 分子→2 分子/.test(gk4Rule)
);
check(
  "默认模式来源标记：4 块 data-mode-source=data，其余 fallback",
  (await page.locator('.cmp-block[data-mode-source="data"]').count()) === 4 &&
    (await page.locator('.cmp-block[data-mode-source="fallback"]').count()) === 6
);
check(
  "页头规则说明写明本页 4 块默认 2D",
  (await page.locator('[data-testid="default-mode-note"]').innerText()).includes("4 块默认 2D")
);

// 切换前记下每个底物/产物格子的 x/y/w/h（20 个），切到显式 2D 后逐像素比对
const rectsBefore = await page.evaluate(() =>
  [...document.querySelectorAll(".cmp3d-side")].map((e) => {
    const r = e.getBoundingClientRect();
    return [Math.round(r.x), Math.round(r.y), Math.round(r.width), Math.round(r.height)];
  })
);

await page.locator('[data-testid="mode-2d"]').click();
await page.waitForFunction(() => document.querySelectorAll('[data-testid="mol-2d"]').length === 21, null, {
  timeout: 30000,
});
check("点 2D 后 URL 写入 ?mode=2d", page.url().includes("mode=2d"));
check("点 2D 后 2D 按钮 aria-pressed=true", (await page.locator('[data-testid="mode-2d"]').getAttribute("aria-pressed")) === "true");
check("切 2D 后 21 个结构式格子", (await page.locator('[data-testid="mol-2d"]').count()) === 21);
check("切 2D 后 3D 画布实例下降为 0", (await page.locator('[data-testid="mol-3d"]').count()) === 0);
check(
  "?mode=2d 显式覆盖默认字段：10 块 data-mode-source=url，4 块默认 2D 仍为 2D",
  (await page.locator('.cmp-block[data-mode-source="url"]').count()) === 10 &&
    (await page.locator('.cmp-block[data-default-mode="2d"][data-mode="2d"]').count()) === 4
);
check(
  "切 2D 后每步仍有左右两侧",
  (await page.locator('.cmp3d-side[data-side="substrate"]').count()) === 10 &&
    (await page.locator('.cmp3d-side[data-side="product"]').count()) === 10
);
check("切 2D 后每步仍有箭头与体积变化数字", (await page.locator('[data-testid="shape-delta"]').count()) === 10);
check("切 2D 后每个分子都有 2D 页脚与体积/主轴数字",
  (await page.locator('[data-testid="mol-2d-source"]').count()) === 21 &&
    (await page.locator('[data-testid="mol-3d-shape"]').count()) === 21
);
check("切 2D 后所有结构式都画出键线（非空占位）", await page.evaluate(() =>
  [...document.querySelectorAll(".mol2d-svg")].every((s) => s.querySelectorAll("line, polygon").length > 0)
));
// 2D 是"按格子像素重排"：字号固定像素，不随分子缩放；最小的原子编号也 ≥9px
check("2D 字号可读（所有 SVG 文本 computed font-size ≥ 9px）", await page.evaluate(() => {
  const texts = [...document.querySelectorAll(".mol2d-svg text")];
  return texts.length > 0 && texts.every((t) => parseFloat(getComputedStyle(t).fontSize) >= 9);
}));
check("2D 模式没有「缺 2D 结构式」", (await page.locator('[data-testid="missing-2d"]').count()) === 0);
check("2D 模式没有「结构式加载中…」残留", (await page.locator(".mol2d-stage .cmp-load").count()) === 0);
// 变化标注：2D 圈注必须命中真实原子；一个不中就是随手画圈，直接失败
check("2D 变化标注存在且全部命中真实原子", await page.evaluate(() => {
  const lis = [...document.querySelectorAll('[data-testid="mol-2d-marks"] li')];
  // 用 getAttribute 而不是 dataset.markFound2d：按 HTML 规范，连字符后接数字时
  // dataset 键名是 "markFound-2d"（不是合法标识符，取不到），读原始属性最稳。
  return lis.length > 0 && lis.every((li) => li.getAttribute("data-mark-found-2d") === "1");
}));
check(
  "2D 中 gk-1 产物仍标出新增磷酸（added×1）与新键（newbond×2）",
  (await page.locator('#gk-1 [data-side="product"] [data-mark-kind="added"]').count()) === 1 &&
    (await page.locator('#gk-1 [data-side="product"] [data-mark-kind="newbond"]').count()) === 2
);
check("2D 中 gk-10 丙酮酸结构式来自 pyruvate.json 且有键线", await page.evaluate(() => {
  const svgs = [...document.querySelectorAll("#gk-10 .mol2d-svg")];
  return svgs.length === 2 && svgs.every((s) => s.querySelectorAll("line, polygon").length > 0);
}));

// 版式不重排：同一批 .cmp3d-side 的 x/y/w/h 必须逐格一致
const rectsAfter = await page.evaluate(() =>
  [...document.querySelectorAll(".cmp3d-side")].map((e) => {
    const r = e.getBoundingClientRect();
    return [Math.round(r.x), Math.round(r.y), Math.round(r.width), Math.round(r.height)];
  })
);
check(
  "切换前后 20 个底物/产物格子 x/y/w/h 完全不变",
  rectsBefore.length === rectsAfter.length &&
    rectsBefore.every((r, i) => r.every((v, k) => v === rectsAfter[i][k]))
);

// 键盘可达 + 焦点可见放到下面「?mode=2d 刷新」之后：必须从一次全新加载的页面开始
// （鼠标点击过按钮后，浏览器的顺序聚焦起点停在按钮上，再 Tab 会从它后面继续，测不到）。

// URL 记忆：?mode=2d 刷新还原；再点 3D 切回
await page.goto(`${ROUTE}?mode=2d`, { waitUntil: "networkidle" });
await page.waitForFunction(() => document.querySelectorAll(".cmp-block").length === 10, null, { timeout: 30000 });
await page.waitForFunction(() => document.querySelectorAll('[data-testid="mol-2d"][data-mol-id="loading"]').length === 0, null, { timeout: 30000 });
check("?mode=2d 刷新后仍为 2D（21 个结构式、0 个 3D 画布）",
  (await page.locator('[data-testid="mol-2d"]').count()) === 21 &&
    (await page.locator('[data-testid="mol-3d"]').count()) === 0);
check("?mode=2d 刷新后页头标记 data-mode=2d", (await page.locator('[data-page="comparison"]').getAttribute("data-mode")) === "2d");

// 键盘可达 + 焦点可见（此时是刚加载的干净页：Tab 依次经过返回链接 → 按规则 → 3D → 2D）
// 为什么不用 page.evaluate(() => b.focus())：Chromium 的 :focus-visible 启发式只在
// 键盘触发的聚焦上命中，程序化 focus() 不画焦点环；这里用真实 Tab 键走到开关上。
let tabbed = false;
for (let i = 0; i < 8; i += 1) {
  await page.keyboard.press("Tab");
  tabbed = await page.evaluate(() => document.activeElement?.getAttribute("data-testid") === "mode-2d");
  if (tabbed) break;
}
check("2D 开关可被键盘聚焦", tabbed);
check("聚焦后的焦点环样式存在（outline solid ≥2px）", await page.evaluate(() => {
  const b = document.querySelector('[data-testid="mode-2d"]');
  if (!b) return false;
  const cs = getComputedStyle(b);
  return cs.outlineStyle === "solid" && parseFloat(cs.outlineWidth) >= 2;
}));

await page.locator('[data-testid="mode-3d"]').click();
await page.waitForFunction(() => document.querySelectorAll('[data-testid="mol-3d"]').length === 21, null, { timeout: 30000 });
check("点 3D 切回后 URL 写入 ?mode=3d", page.url().includes("mode=3d"));
check("点 3D 切回后 2D 结构式归零", (await page.locator('[data-testid="mol-2d"]').count()) === 0);
check(
  "?mode=3d 显式覆盖默认字段：4 块默认 2D 也被强制 3D，来源标记全部 url",
  (await page.locator('.cmp-block[data-default-mode="2d"][data-mode="3d"]').count()) === 4 &&
    (await page.locator('.cmp-block[data-mode-source="url"]').count()) === 10
);
const forced3dProv = await page.evaluate(() => ({
  exp: document.querySelectorAll(".mol3d-prov.experimental").length,
  calc: document.querySelectorAll(".mol3d-prov.computed").length,
}));
check("显式 3D 时 21 个 3D 来源标签（实验 15 / 计算 6）",
  (await page.locator('[data-testid="mol-3d-source"]').count()) === 21 &&
    forced3dProv.exp === 15 && forced3dProv.calc === 6);

// 辅因子口径：gk-1/gk-7/gk-10 明说 ATP/ADP 不入画（沿用原卡片口径）
check("gk-1 说明 ATP 其余部分不入画", (await page.locator("#gk-1 .cmp-change").innerText()).includes("不入画"));
check("gk-7 产物侧说明 ATP 不入画", (await page.locator('#gk-7 [data-side="product"] .cmp-cofactor').innerText()).includes("ATP"));
check("gk-10 产物侧说明 ATP 不入画", (await page.locator('#gk-10 [data-side="product"] .cmp-cofactor').innerText()).includes("ATP"));

// ===== 4) 3D 静置面板：可旋转画布、配体默认关、残基联动 =====
await scrollToStep("gk-1");
await wait3d("gk-1");
// 分子球棍是懒加载（IntersectionObserver），给两块画布留出创建时间再计数；
// 超时不吞掉，由下面的断言如实判失败。
await page
  .waitForFunction(
    () => document.querySelectorAll('#gk-1 [data-testid="mol-3d-host"] canvas').length >= 2,
    null,
    { timeout: 20000 }
  )
  .catch(() => {});
check("gk-1 3D 画布已创建（可旋转 WebGL）", (await page.locator('#gk-1 [data-testid="enzyme-3d-host"] canvas').count()) === 1);
check("gk-1 分子 3D 球棍画布已创建", (await page.locator('#gk-1 [data-testid="mol-3d-host"] canvas').count()) === 2);
// 高亮是否真的落到画布：Molecule3D 用与 setStyle 相同的 AtomSpec 先查命中，
// data-marks-applied 记录命中数（0/缺失=名字对不上或还没建视图）
await page
  .waitForFunction(
    () => {
      const els = [...document.querySelectorAll('#gk-1 [data-testid="mol-3d"]')].filter(
        (e) => Number(e.dataset.marksTotal) > 0
      );
      return (
        els.length > 0 &&
        els.every((e) => e.dataset.marksApplied !== undefined && Number(e.dataset.marksApplied) === Number(e.dataset.marksTotal))
      );
    },
    null,
    { timeout: 20000 }
  )
  .catch(() => {});
const gk1Marks = await page.evaluate(() =>
  [...document.querySelectorAll('#gk-1 [data-testid="mol-3d"]')].map((e) => ({
    id: e.dataset.molId,
    total: Number(e.dataset.marksTotal ?? 0),
    applied: e.dataset.marksApplied === undefined ? null : Number(e.dataset.marksApplied),
  }))
);
const gk1Prod = gk1Marks.find((m) => m.id === "g6p");
check("gk-1 产物 3 个变化原子全部命中 3D 模型", gk1Prod && gk1Prod.total === 3 && gk1Prod.applied === 3);
check("3D 来源行含 PDB 1CZA", (await page.locator('#gk-1 [data-testid="enzyme-3d-source"]').innerText()).includes("1CZA"));
check("3D 来源行含分辨率 1.9 Å", (await page.locator('#gk-1 [data-testid="enzyme-3d-source"]').innerText()).includes("1.9"));
check("界面残基条有可点残基", (await page.locator('#gk-1 [data-testid="residue-strip"] .e3d-chip').count()) >= 10);
check("配体叠加默认关闭", (await page.locator('#gk-1 [data-testid="ligand-toggle"]').getAttribute("aria-pressed")) === "false");
check("默认状态明说「配体未叠加」", (await page.locator('#gk-1 [data-testid="ligand-count"]').innerText()).includes("未叠加"));
await page.locator('#gk-1 [data-testid="ligand-toggle"]').click();
await page.waitForFunction(() => {
  const el = document.querySelector('#gk-1 [data-testid="ligand-count"]');
  return el && /配体实例 \d+/.test(el.textContent ?? "") && !/(配体实例 0)/.test(el.textContent ?? "");
}, null, { timeout: 20000 });
check("打开开关后叠画出配体实例", /配体实例 \d+/.test(await page.locator('#gk-1 [data-testid="ligand-count"]').innerText()));
await page.locator('#gk-1 [data-testid="ligand-toggle"]').click();
check("再次关闭后回到「配体未叠加」", (await page.locator('#gk-1 [data-testid="ligand-count"]').innerText()).includes("未叠加"));

await page.locator('#gk-1 [data-resi="84"]').click();
check("点残基后该残基高亮", (await page.locator('#gk-1 .e3d-chip.sel').count()) === 1);
const note = await page.locator('#gk-1 [data-testid="residue-note"]').innerText();
check("残基说明含 ASP 84 与距离", note.includes("ASP 84") && note.includes("Å"));
check("该残基的氢键按距离列出", note.includes("氢键"));
await page.locator('#gk-1 [data-resi="84"]').click();
check("再次点击取消高亮", (await page.locator('#gk-1 .e3d-chip.sel').count()) === 0);

await scrollToStep("gk-7");
await wait3d("gk-7");
await page
  .waitForFunction(
    () => {
      const el = [...document.querySelectorAll('#gk-7 [data-testid="mol-3d"]')].find((e) => e.dataset.molId === "bpg13");
      return el && el.dataset.marksApplied !== undefined && Number(el.dataset.marksApplied) === Number(el.dataset.marksTotal);
    },
    null,
    { timeout: 20000 }
  )
  .catch(() => {});
const gk7Applied = await page.evaluate(() => {
  const el = [...document.querySelectorAll('#gk-7 [data-testid="mol-3d"]')].find((e) => e.dataset.molId === "bpg13");
  return el ? { total: Number(el.dataset.marksTotal), applied: el.dataset.marksApplied === undefined ? null : Number(el.dataset.marksApplied) } : null;
});
check("gk-7 底物 3 个离去基原子全部命中 3D 模型", gk7Applied && gk7Applied.total === 3 && gk7Applied.applied === 3);

await scrollToStep("gk-9");
await wait3d("gk-9");
check("gk-9 3D 来源含 3UCD", (await page.locator('#gk-9 [data-testid="enzyme-3d-source"]').innerText()).includes("3UCD"));
check("gk-9 3D 画布已创建", (await page.locator('#gk-9 [data-testid="enzyme-3d-host"] canvas').count()) === 1);
await page
  .waitForFunction(
    () => {
      const el = [...document.querySelectorAll('#gk-9 [data-testid="mol-3d"]')].find((e) => e.dataset.molId === "pep");
      return el && el.dataset.marksApplied !== undefined && Number(el.dataset.marksApplied) === 2;
    },
    null,
    { timeout: 20000 }
  )
  .catch(() => {});
const gk9Applied = await page.evaluate(() => {
  const el = [...document.querySelectorAll('#gk-9 [data-testid="mol-3d"]')].find((e) => e.dataset.molId === "pep");
  return el ? { total: Number(el.dataset.marksTotal), applied: el.dataset.marksApplied === undefined ? null : Number(el.dataset.marksApplied) } : null;
});
check("gk-9 产物 2 个新双键原子全部命中 3D 模型", gk9Applied && gk9Applied.total === 2 && gk9Applied.applied === 2);

// ===== 5) 旧链接兼容：?frame= / ?motion= 重定向到步骤锚点，不 404 =====
await page.goto(`${ROUTE}?frame=gk-9-f0`, { waitUntil: "networkidle" });
await settle();
check("?frame=gk-9-f0 重定向到 #gk-9", page.url().endsWith("#gk-9"));
check("重定向后帧参数被移除（时间轴功能已取消）", !page.url().includes("frame="));
check("重定向目标 gk-9 块存在", (await page.locator("#gk-9").count()) === 1);

await page.goto(`${ROUTE}?frame=gk-1-f3`, { waitUntil: "networkidle" });
await settle();
check("?frame=gk-1-f3 重定向到 #gk-1", page.url().endsWith("#gk-1"));

await page.goto(`${ROUTE}?frame=demo-2d`, { waitUntil: "networkidle" });
await settle();
check("旧 demo-2d 链接落到 #gk-6（GAP 结构式所在步）", page.url().endsWith("#gk-6"));

await page.goto(`${ROUTE}?motion=1`, { waitUntil: "networkidle" });
await settle();
check("?motion=1 不 404 且参数清除", page.url().endsWith("/structures/glycolysis"));

await page.goto(`${ROUTE}#gk-10`, { waitUntil: "networkidle" });
await settle();
check("直接访问 #gk-10 正常", (await page.locator("#gk-10").count()) === 1);

// ===== 6) 截图（1440×1280）：3D 模式 / 2D 模式 / 同一位置两版 =====
// 截图三种状态：显式 3D / 显式 2D / 按规则（auto，含“被规则改成默认 2D”的块）
const shot = async (id, file, mode = "3d") => {
  const query = mode === "auto" ? "" : `?mode=${mode}`;
  await page.goto(`${ROUTE}${query}`, { waitUntil: "networkidle" });
  await page.waitForFunction(() => document.querySelectorAll(".cmp-block").length === 10, null, { timeout: 30000 });
  if (mode !== "3d") {
    await page.waitForFunction(() => document.querySelectorAll('[data-testid="mol-2d"] .cmp-load').length === 0, null, { timeout: 30000 });
  }
  if (mode !== "2d") {
    await page.waitForFunction(() => document.querySelectorAll('[data-testid="mol-3d"][data-mol-id="loading"]').length === 0, null, { timeout: 30000 });
  }
  await scrollToStep(id);
  if (mode !== "2d") await wait3d(id);
  await page.waitForTimeout(900);
  // 视口就是 1440 宽；把目标块顶到视口上缘后整屏截图，既保住 1440 宽，也保证整块不被裁。
  await page.setViewportSize({ width: 1440, height: 1280 });
  const top = await page.evaluate((sid) => {
    const el = document.getElementById(sid);
    return el ? el.getBoundingClientRect().top + window.scrollY : 0;
  }, id);
  await page.evaluate((y) => window.scrollTo(0, Math.max(0, y - 12)), top);
  await page.waitForTimeout(700);
  await page.screenshot({ path: join(ROOT, "preview", file) });
  console.log(`  ↳ 截图 preview/${file}（1440×1280 · ${mode.toUpperCase()}）`);
};
// 同一块 gk-2、同一滚动位置，分别截 3D 与 2D（两版并排即"切换对照"）
await shot("gk-2", "cmp-mode-3d-gk-2.png", "3d");
await shot("gk-2", "cmp-mode-2d-gk-2.png", "2d");
// 按规则默认（不带 ?mode=）：gk-4 被数据判据改成 2D（体积 +2.27%，C3–C4 断裂）
await shot("gk-4", "cmp-default-2d-gk-4.png", "auto");
// 变化原子高亮在 3D 下的样子（与 2D 圈注同一批原子）
await shot("gk-1", "cmp-mode-3d-gk-1-highlight.png", "3d");

check("无页面运行错误", errors.length === 0);
if (errors.length) console.log("页面错误：\n" + errors.join("\n"));

await browser.close();
console.log(`\n${failed ? "冒烟未通过" : "冒烟全部通过"}`);
process.exit(failed ? 1 : 0);
