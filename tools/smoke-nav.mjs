// 统一通路切换器冒烟（PathwaySwitcher）—— 两行分组结构（2026-11 口径）。
// 校验口径：挂图页 / 结构页 / 首页共用同一组件；条目 = 22 条通路 + 首页（23 条）。
// 分两行：主线 PLATE 00–12（首页 + 12 条，字号 ≥12px）；延伸 PLATE 13–22（10 条，字号 ≥11px，可收起）。
// 每行在 1440 下不换行、不裁切、不越出视口；当前项在其所属行内唯一且可见；
// 收起后若当前页在延伸行，必须留一个「当前」锚定入口，保证位置可判断；
// 开关键盘可达（aria-expanded / aria-controls），Tab 顺序 = 主线 → 开关 → 延伸行；
// Alt+←/→ 仍按 PATHWAY_NAV 顺序切换；切换器在文档流内（position:static），
// scroll-padding-top（44px）只对齐 sticky 三停檐（36px + 8），收起/展开不遮挡正文。
// 旧的手写面包屑断言仍在 smoke-gluconeogenesis / smoke-fao / smoke-ppp-poster 中，未删除、未弱化。
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

/** 全站导航清单（与 src/data/pathways.ts 同源；这里只做校验用的期望值） */
const NAV = [
  { id: "home", name: "首页", route: "/" },
  { id: "glycolysis", name: "糖酵解", route: "/pathway/glycolysis" },
  { id: "tca", name: "三羧酸循环", route: "/pathway/tca" },
  { id: "gluconeogenesis", name: "糖异生", route: "/pathway/gluconeogenesis" },
  { id: "ppp", name: "磷酸戊糖途径", route: "/pathway/ppp" },
  { id: "fatty-acid-oxidation", name: "β-氧化", route: "/pathway/fatty-acid-oxidation" },
  { id: "oxphos", name: "氧化磷酸化", route: "/pathway/oxphos" },
  { id: "cori", name: "Cori 循环", route: "/pathway/cori" },
  { id: "fatty-acid-synthesis", name: "脂肪酸从头合成", route: "/pathway/fas" },
  { id: "urea-cycle", name: "尿素循环", route: "/pathway/urea-cycle" },
  { id: "glycogen", name: "糖原代谢", route: "/pathway/glycogen" },
  { id: "amino-acids", name: "氨基酸代谢", route: "/pathway/amino-acids" },
  { id: "cholesterol", name: "胆固醇合成", route: "/pathway/cholesterol" },
  { id: "ketone", name: "酮体代谢", route: "/pathway/ketone" },
  { id: "one-carbon", name: "一碳单位代谢", route: "/pathway/one-carbon" },
  { id: "pyrimidine", name: "嘧啶核苷酸代谢", route: "/pathway/pyrimidine" },
  { id: "purine", name: "嘌呤核苷酸代谢", route: "/pathway/purine" },
  { id: "glycerophospholipid", name: "甘油磷脂与鞘脂代谢", route: "/pathway/glycerophospholipid" },
  { id: "lipoprotein", name: "血浆脂蛋白代谢", route: "/pathway/lipoprotein" },
  { id: "heme", name: "血红素代谢", route: "/pathway/heme" },
  { id: "bile-acid", name: "胆汁酸代谢", route: "/pathway/bile-acid" },
  { id: "glycoconjugate", name: "糖复合物代谢", route: "/pathway/glycoconjugate" },
  { id: "redox", name: "氧化还原与自由基", route: "/pathway/redox" },
];

/** 两行分界：主线 00–12（13 项），延伸 13–22（10 项） */
const MAIN_IDS = NAV.slice(0, 13).map((n) => n.id);
const EXT_IDS = NAV.slice(13).map((n) => n.id);

/** 全页口径：22 张挂图 + 首页 + 22 张结构对照页 */
const PAGES = [
  { route: "/", current: "home" },
  { route: "/pathway/glycolysis", current: "glycolysis" },
  { route: "/pathway/tca", current: "tca" },
  { route: "/pathway/gluconeogenesis", current: "gluconeogenesis" },
  { route: "/pathway/ppp", current: "ppp" },
  { route: "/pathway/fatty-acid-oxidation", current: "fatty-acid-oxidation" },
  { route: "/pathway/oxphos", current: "oxphos" },
  { route: "/pathway/cori", current: "cori" },
  { route: "/pathway/fas", current: "fatty-acid-synthesis" },
  { route: "/pathway/urea-cycle", current: "urea-cycle" },
  { route: "/pathway/glycogen", current: "glycogen" },
  { route: "/pathway/amino-acids", current: "amino-acids" },
  { route: "/pathway/cholesterol", current: "cholesterol" },
  { route: "/pathway/ketone", current: "ketone" },
  { route: "/pathway/one-carbon", current: "one-carbon" },
  { route: "/pathway/pyrimidine", current: "pyrimidine" },
  { route: "/pathway/purine", current: "purine" },
  { route: "/pathway/glycerophospholipid", current: "glycerophospholipid" },
  { route: "/pathway/lipoprotein", current: "lipoprotein" },
  { route: "/pathway/heme", current: "heme" },
  { route: "/pathway/bile-acid", current: "bile-acid" },
  { route: "/pathway/glycoconjugate", current: "glycoconjugate" },
  { route: "/pathway/redox", current: "redox" },
  { route: "/structures/glycolysis", current: "glycolysis" },
  { route: "/structures/tca", current: "tca" },
  { route: "/structures/gluconeogenesis", current: "gluconeogenesis" },
  { route: "/structures/ppp", current: "ppp" },
  { route: "/structures/fatty-acid-oxidation", current: "fatty-acid-oxidation" },
  { route: "/structures/oxphos", current: "oxphos" },
  { route: "/structures/fatty-acid-synthesis", current: "fatty-acid-synthesis" },
  { route: "/structures/urea-cycle", current: "urea-cycle" },
  { route: "/structures/glycogen", current: "glycogen" },
  { route: "/structures/amino-acids", current: "amino-acids" },
  { route: "/structures/cholesterol", current: "cholesterol" },
  { route: "/structures/ketone", current: "ketone" },
  { route: "/structures/cori", current: "cori" },
  { route: "/structures/pyrimidine", current: "pyrimidine" },
  { route: "/structures/purine", current: "purine" },
  { route: "/structures/glycerophospholipid", current: "glycerophospholipid" },
  { route: "/structures/lipoprotein", current: "lipoprotein" },
  { route: "/structures/heme", current: "heme" },
  { route: "/structures/bile-acid", current: "bile-acid" },
  { route: "/structures/glycoconjugate", current: "glycoconjugate" },
  { route: "/structures/redox", current: "redox" },
];

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

/** 读取切换器的两行几何与字号（页面内执行） */
function readNavRows() {
  const nav = document.querySelector('[data-testid="pathway-switcher"]');
  if (!nav) return null;
  const read = (selector) => {
    const row = nav.querySelector(selector);
    if (!row) return null;
    const rr = row.getBoundingClientRect();
    const items = [...row.querySelectorAll("[data-nav-id]")].map((el) => {
      const r = el.getBoundingClientRect();
      return { id: el.getAttribute("data-nav-id"), top: r.top, right: r.right, left: r.left };
    });
    const link = row.querySelector(".ps-link");
    const cur = row.querySelector('a[aria-current="page"]');
    const curRect = cur ? cur.getBoundingClientRect() : null;
    return {
      row: row.getAttribute("data-nav-row"),
      clientWidth: row.clientWidth,
      scrollWidth: row.scrollWidth,
      top: rr.top,
      bottom: rr.bottom,
      right: rr.right,
      left: rr.left,
      items,
      fontSize: link ? parseFloat(getComputedStyle(link).fontSize) : 0,
      current: cur
        ? {
            id: cur.parentElement.getAttribute("data-nav-id"),
            left: curRect.left,
            right: curRect.right,
          }
        : null,
    };
  };
  const mast = document.querySelector(".masthead")?.getBoundingClientRect();
  return {
    main: read('[data-nav-row="main"]'),
    extended: read('[data-nav-row="extended"]'),
    pinned: read('[data-nav-row="extended-current"]'),
    rowsAttr: nav.getAttribute("data-nav-rows"),
    extendedState: nav.getAttribute("data-nav-extended"),
    position: getComputedStyle(nav).position,
    navBottom: nav.getBoundingClientRect().bottom,
    viewport: window.innerWidth,
    mastTop: mast ? mast.top : null,
  };
}

const browser = await launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
page.on("pageerror", (e) => errors.push(String(e)));
page.on("console", (m) => m.type() === "error" && errors.push(m.text()));

mkdirSync(join(ROOT, "preview"), { recursive: true });

/* ===== 1) 每一页：23 项分两行、当前项唯一可见、每行 1440 不换行/不裁切 ===== */
for (const item of PAGES) {
  await page.goto(`${BASE}${item.route}`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector('[data-testid="pathway-switcher"]', { timeout: 10000 });
  const navs = await page.locator('[data-testid="pathway-switcher"]').count();
  check(`${item.route} 渲染唯一通路切换器`, navs === 1, String(navs));

  const ids = await page.locator('[data-testid="pathway-switcher"] [data-nav-id]').evaluateAll((els) =>
    els.map((el) => el.getAttribute("data-nav-id")),
  );
  check(
    `${item.route} 默认展开时 23 项全部在 DOM（${ids.length}）`,
    ids.length === NAV.length && JSON.stringify(ids) === JSON.stringify(NAV.map((n) => n.id)),
    ids.join(","),
  );

  const rows = await page.evaluate(readNavRows);
  check(`${item.route} 标记为两行（data-nav-rows=2）`, rows?.rowsAttr === "2" && rows?.extendedState === "open", `${rows?.rowsAttr}/${rows?.extendedState}`);
  check(
    `${item.route} 主线行 = 首页 + PLATE 01–12（13 项）`,
    JSON.stringify(rows?.main?.items.map((i) => i.id)) === JSON.stringify(MAIN_IDS),
    (rows?.main?.items ?? []).map((i) => i.id).join(","),
  );
  check(
    `${item.route} 延伸行 = PLATE 13–22（10 项）`,
    JSON.stringify(rows?.extended?.items.map((i) => i.id)) === JSON.stringify(EXT_IDS),
    (rows?.extended?.items ?? []).map((i) => i.id).join(","),
  );

  for (const [name, row] of [
    ["主线行", rows?.main],
    ["延伸行", rows?.extended],
  ]) {
    const tops = (row?.items ?? []).map((i) => i.top);
    check(
      `${item.route} ${name} 1440 单行（top 差 ≤4px）`,
      tops.length > 0 && Math.max(...tops) - Math.min(...tops) <= 4,
      JSON.stringify(tops.map((t) => Math.round(t))),
    );
    check(
      `${item.route} ${name} 不裁切（scrollWidth ≤ clientWidth+1）`,
      (row?.scrollWidth ?? 0) <= (row?.clientWidth ?? 0) + 1,
      `${row?.scrollWidth} / ${row?.clientWidth}`,
    );
    check(
      `${item.route} ${name} 不越出视口右缘`,
      Math.max(...(row?.items ?? [{ right: Infinity }]).map((i) => i.right)) <= (rows?.viewport ?? 0),
      String(Math.round(Math.max(...(row?.items ?? [{ right: 0 }]).map((i) => i.right)))),
    );
  }

  check(
    `${item.route} 字号不低于下限（主线 ≥12px / 延伸 ≥11px）`,
    (rows?.main?.fontSize ?? 0) >= 12 && (rows?.extended?.fontSize ?? 0) >= 11,
    `main=${rows?.main?.fontSize}px ext=${rows?.extended?.fontSize}px`,
  );

  const rowOverflow = await page.evaluate(() => {
    const nav = document.querySelector('[data-testid="pathway-switcher"]');
    return [...nav.querySelectorAll("[data-nav-row]")]
      .filter((row) => row.scrollWidth > row.clientWidth + 1)
      .map((row) => `${row.getAttribute("data-nav-row")}:${row.scrollWidth}/${row.clientWidth}`);
  });
  check(`${item.route} 所有导航行无横向溢出`, rowOverflow.length === 0, rowOverflow.join(","));

  const current = await page.locator('[data-testid="pathway-switcher"] [aria-current="page"]').count();
  check(`${item.route} 当前项高亮唯一（${current}）`, current === 1);
  const currentText = await page.locator('[data-testid="pathway-switcher"] [aria-current="page"]').innerText();
  const expected = NAV.find((n) => n.id === item.current)?.name ?? "";
  check(
    `${item.route} 当前项是「${expected}」`,
    currentText.includes(expected),
    currentText.replace(/\s+/g, " "),
  );

  const inMain = MAIN_IDS.includes(item.current);
  const ownRow = inMain ? rows?.main : rows?.extended;
  const curInOwnRow = ownRow?.current?.id === item.current;
  const visible =
    curInOwnRow &&
    ownRow.current.left >= ownRow.left - 1 &&
    ownRow.current.right <= Math.min(ownRow.right, rows.viewport) + 1;
  check(`${item.route} 当前项在所属行内且完整可见`, visible, `${inMain ? "main" : "ext"} ${ownRow?.current?.id ?? "null"}`);

  const links = await page
    .locator('[data-testid="pathway-switcher"] [data-nav-id] a')
    .evaluateAll((els) => els.map((el) => ({ id: el.parentElement.getAttribute("data-nav-id"), href: el.getAttribute("href") })));
  const missing = NAV.filter((n) => !links.some((l) => l.id === n.id && (l.href ?? "").startsWith(n.route)));
  check(
    `${item.route} 23 条都能点到（含本通路自链）`,
    links.length === NAV.length && missing.length === 0,
    missing.map((n) => n.id).join(","),
  );
}

/* ===== 2) 当前项高亮样式：实线下压 + 加粗，不是色块/胶囊 ===== */
{
  await page.goto(`${BASE}/pathway/tca`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector('[data-testid="pathway-switcher"]');
  const style = await page.locator('[data-testid="pathway-switcher"] .ps-cur').evaluate((el) => {
    const s = getComputedStyle(el);
    return {
      weight: s.fontWeight,
      borderBottomWidth: s.borderBottomWidth,
      borderBottomStyle: s.borderBottomStyle,
      borderRadius: s.borderRadius,
      boxShadow: s.boxShadow,
      background: s.backgroundColor,
    };
  });
  check(
    "当前项为加粗 + 2px 实线下划线（无圆角 / 无投影 / 无底色）",
    Number(style.weight) >= 700 &&
      parseFloat(style.borderBottomWidth) >= 2 &&
      style.borderBottomStyle === "solid" &&
      style.borderRadius === "0px" &&
      style.boxShadow === "none" &&
      (style.background === "rgba(0, 0, 0, 0)" || style.background === "transparent"),
    JSON.stringify(style),
  );
}

/* ===== 3) 延伸区开合：键盘可达、位置可判断、不遮挡正文 ===== */
{
  await page.goto(`${BASE}/pathway/heme`, { waitUntil: "networkidle" });
  await page.waitForSelector('[data-testid="pathway-switcher"]');
  const toggle = page.locator('[data-testid="pathway-switcher"] [data-nav-toggle]');
  check("延伸区开关存在且唯一", (await toggle.count()) === 1, String(await toggle.count()));
  check("开关初始 aria-expanded=true", (await toggle.getAttribute("aria-expanded")) === "true");
  const controls = await toggle.getAttribute("aria-controls");
  check(
    "开关 aria-controls 指向真实存在的延伸行",
    !!controls && (await page.locator(`[id="${controls}"]`).count()) === 1,
    controls ?? "null",
  );

  const before = await page.evaluate(readNavRows);
  check("展开时无「当前」锚定行（当前项就在延伸行内）", before?.pinned === null);
  check("切换器在文档流内（position:static，不是浮层）", before?.position === "static", before?.position ?? "null");
  check(
    "展开时正文在切换器之下（不遮挡）",
    before?.mastTop === null || before.mastTop >= before.navBottom - 1,
    `${Math.round(before?.navBottom ?? 0)} ≤ ${before?.mastTop === null ? "n/a" : Math.round(before.mastTop)}`,
  );

  await toggle.click();
  await page.waitForSelector('[data-nav-row="extended-current"]', { timeout: 5000 });
  const after = await page.evaluate(readNavRows);
  check("收起后 aria-expanded=false", (await toggle.getAttribute("aria-expanded")) === "false");
  check("收起后延伸行从 DOM 移除", (await page.locator('[data-nav-row="extended"]').count()) === 0);
  check("收起后主线行仍为 13 项", (after?.main?.items.length ?? 0) === 13, String(after?.main?.items.length));
  check(
    "收起后当前页（血红素）在「当前」锚定行可见且高亮",
    after?.pinned?.current?.id === "heme" &&
      (await page.locator('[data-nav-row="extended-current"] a[aria-current="page"]').count()) === 1,
    after?.pinned?.current?.id ?? "null",
  );
  check(
    "收起后「当前」行有文字标签（位置可判断）",
    ((await page.locator('[data-nav-row="extended-current"] .ps-row-label').innerText()) ?? "").includes("当前"),
  );
  check(
    "收起后总条目 = 13 + 1（不丢当前入口）",
    (await page.locator('[data-testid="pathway-switcher"] [data-nav-id]').count()) === 14,
    String(await page.locator('[data-testid="pathway-switcher"] [data-nav-id]').count()),
  );
  check(
    "收起后「当前」行替代延伸行（高度相当，正文不跳动）",
    after?.pinned !== null &&
      Math.abs(after.pinned.bottom - after.pinned.top - ((before?.extended?.bottom ?? 0) - (before?.extended?.top ?? 0))) <= 6,
    `${Math.round((before?.extended?.bottom ?? 0) - (before?.extended?.top ?? 0))} vs ${Math.round((after?.pinned?.bottom ?? 0) - (after?.pinned?.top ?? 0))}`,
  );
  check(
    "收起后正文仍在切换器之下（不遮挡）",
    after?.mastTop === null || after.mastTop >= after.navBottom - 1,
    `${Math.round(after?.navBottom ?? 0)} ≤ ${after?.mastTop === null ? "n/a" : Math.round(after.mastTop)}`,
  );

  await toggle.click();
  await page.waitForSelector('[data-nav-row="extended"]', { timeout: 5000 });
  check("再次展开：aria-expanded 回到 true", (await toggle.getAttribute("aria-expanded")) === "true");
  check("再次展开：延伸行恢复 10 项", (await page.locator('[data-nav-row="extended"] [data-nav-id]').count()) === 10);
  check("再次展开：「当前」锚定行移除", (await page.locator('[data-nav-row="extended-current"]').count()) === 0);

  // 当前页在主线行时，收起不需要「当前」行，主线当前项仍可见
  await page.goto(`${BASE}/pathway/glycolysis`, { waitUntil: "networkidle" });
  await page.waitForSelector('[data-testid="pathway-switcher"]');
  await page.locator('[data-testid="pathway-switcher"] [data-nav-toggle]').click();
  const mainOnly = await page.evaluate(readNavRows);
  check(
    "主线当前页收起后：无「当前」行、主线当前项仍可见",
    mainOnly?.pinned === null &&
      mainOnly?.main?.current?.id === "glycolysis" &&
      mainOnly.main.current.left >= mainOnly.main.left - 1 &&
      mainOnly.main.current.right <= mainOnly.viewport,
    `${mainOnly?.pinned === null} / ${mainOnly?.main?.current?.id ?? "null"}`,
  );
  await page.locator('[data-testid="pathway-switcher"] [data-nav-toggle]').click();
}

/* ===== 4) Tab 顺序：主线 13 项 → 开关 → 延伸 10 项 ===== */
{
  await page.goto(`${BASE}/pathway/glycolysis`, { waitUntil: "networkidle" });
  await page.waitForSelector('[data-testid="pathway-switcher"]');
  const order = await page.evaluate(() => {
    const nav = document.querySelector('[data-testid="pathway-switcher"]');
    return [...nav.querySelectorAll("a[href], button")].map((el) => ({
      tag: el.tagName,
      row: el.closest("[data-nav-row]")?.getAttribute("data-nav-row") ?? null,
      toggle: el.hasAttribute("data-nav-toggle"),
      id: el.closest("[data-nav-id]")?.getAttribute("data-nav-id") ?? null,
    }));
  });
  check("切换器内可聚焦元素 = 23 项 + 1 个开关", order.length === 24, String(order.length));
  check(
    "Tab 顺序：前 13 个是主线链接",
    JSON.stringify(order.slice(0, 13).map((o) => o.id)) === JSON.stringify(MAIN_IDS) &&
      order.slice(0, 13).every((o) => o.row === "main" && !o.toggle),
    order.slice(0, 13).map((o) => o.id).join(","),
  );
  check("第 14 个是延伸区开关", order[13]?.toggle === true && order[13]?.tag === "BUTTON");
  check(
    "开关之后是延伸行 10 项",
    JSON.stringify(order.slice(14).map((o) => o.id)) === JSON.stringify(EXT_IDS) &&
      order.slice(14).every((o) => o.row === "extended"),
    order.slice(14).map((o) => o.id).join(","),
  );

  // 实测键盘：聚焦主线最后一项，Tab 一次应落在开关上
  await page.locator('[data-testid="pathway-switcher"] [data-nav-id="cholesterol"] a').focus();
  await page.keyboard.press("Tab");
  const focusedToggle = await page.evaluate(() => document.activeElement?.hasAttribute("data-nav-toggle") === true);
  check("键盘 Tab：主线末项之后落到延伸区开关", focusedToggle);
  await page.keyboard.press("Tab");
  const focusedExt = await page.evaluate(() => document.activeElement?.closest('[data-nav-row="extended"]') !== null);
  check("键盘 Tab：开关之后落到延伸行首项", focusedExt);
}

/* ===== 5) Alt+←/→ 仍按 PATHWAY_NAV 顺序切换 ===== */
{
  await page.goto(`${BASE}/pathway/bile-acid`, { waitUntil: "networkidle" });
  await page.waitForSelector('[data-testid="pathway-switcher"]');
  await page.keyboard.press("Alt+ArrowLeft");
  await page.waitForURL("**/pathway/heme", { timeout: 10000 });
  check("Alt+← 从胆汁酸回到血红素", new URL(page.url()).pathname === "/pathway/heme", page.url());
  await page.keyboard.press("Alt+ArrowRight");
  await page.waitForURL("**/pathway/bile-acid", { timeout: 10000 });
  check("Alt+→ 从血红素前进到胆汁酸", new URL(page.url()).pathname === "/pathway/bile-acid", page.url());
}

/* ===== 6) scroll-padding-top 与 sticky 三停檐高度一致（44 = 36 + 8） ===== */
{
  await page.goto(`${BASE}/pathway/glycolysis`, { waitUntil: "networkidle" });
  await page.waitForSelector('[data-testid="pathway-rail"]');
  const geometry = await page.evaluate(() => {
    const rail = document.querySelector('[data-testid="pathway-rail"]');
    return {
      railHeight: rail ? rail.getBoundingClientRect().height : null,
      railPosition: rail ? getComputedStyle(rail).position : null,
      scrollPaddingTop: getComputedStyle(document.documentElement).scrollPaddingTop,
    };
  });
  check("三停檐 sticky 且高 36px", geometry.railPosition === "sticky" && Math.round(geometry.railHeight ?? 0) === 36, `${geometry.railPosition} ${geometry.railHeight}`);
  check(
    "html scroll-padding-top = 44px（36 檐 + 8）",
    parseFloat(geometry.scrollPaddingTop) === 44,
    geometry.scrollPaddingTop,
  );
}

/* ===== 7) 切换落地：TCA 页点 Cori → /pathway/cori（并截图实测路径） ===== */
await page.goto(`${BASE}/pathway/tca`, { waitUntil: "networkidle" });
await page.waitForSelector('[data-testid="pathway-switcher"]');
await page.locator('[data-testid="pathway-switcher"] [data-nav-id="cori"] a').click();
await page.waitForURL("**/pathway/cori", { timeout: 10000 });
check("从 TCA 页点 Cori 落到 /pathway/cori", page.url().endsWith("/pathway/cori"));
await page.waitForSelector('[data-testid="pathway-switcher"] [data-nav-id="cori"] a[aria-current="page"]', { timeout: 5000 });
check("Cori 页切换器高亮切到 Cori 循环", (await page.locator('[data-testid="pathway-switcher"] [data-nav-id="cori"] a[aria-current="page"]').count()) === 1);
await page.screenshot({ path: join(ROOT, "preview", "nav-tca-to-cori.png"), fullPage: false });
console.log("✓ 截图 preview/nav-tca-to-cori.png（1440 实测路径：TCA → Cori）");

/* ===== 7b) Cori 三停檐：结构对照停已是可用链接，结构页可返回挂图 ===== */
{
  const stop = page.locator('[data-rail-stop="structure"]');
  const tag = await stop.evaluate((el) => el.tagName);
  const href = await stop.getAttribute("href");
  const disabled = await stop.getAttribute("data-rail-disabled");
  check(
    "Cori 挂图三停檐「结构对照」为可用链接（不再是灰态）",
    tag === "A" && href === "/structures/cori" && disabled === null,
    `${tag} ${href} disabled=${disabled}`,
  );
  await page.goto(`${BASE}/structures/cori`, { waitUntil: "networkidle" });
  await page.waitForSelector('[data-testid="pathway-rail"]');
  const posterHref = await page.locator('[data-rail-stop="poster"]').getAttribute("href");
  const structureCurrent = await page.locator('[data-rail-stop="structure"][aria-current="page"]').count();
  check("结构页三停檐「Cori 循环」回 /pathway/cori", posterHref === "/pathway/cori", posterHref ?? "null");
  check("结构页三停檐当前停为「结构对照」", structureCurrent === 1, String(structureCurrent));
}

/* ===== 7c) 顶栏「常见物质」入口：可点、落到 /substances、1440/1280 仍单行 ===== */
for (const width of [1440, 1280]) {
  await page.setViewportSize({ width, height: 900 });
  await page.goto(`${BASE}/pathway/glycolysis`, { waitUntil: "networkidle" });
  await page.waitForSelector('[data-testid="pathway-rail"]');
  const entry = page.locator('[data-rail-action="substances"]');
  check(`${width} · 顶栏有「常见物质」入口且唯一`, (await entry.count()) === 1, String(await entry.count()));
  check(`${width} · 顶栏入口 href 指向 /substances`, (await entry.getAttribute("href")) === "/substances");
  const geo = await page.evaluate(() => {
    const rail = document.querySelector('[data-testid="pathway-rail"]');
    const right = rail.querySelector(".rr-right");
    const acts = [...right.children].map((el) => {
      const r = el.getBoundingClientRect();
      return { text: (el.textContent ?? "").trim(), top: r.top, bottom: r.bottom, right: r.right };
    });
    return {
      acts,
      railClient: rail.clientWidth,
      railScroll: rail.scrollWidth,
      viewport: window.innerWidth,
    };
  });
  const tops = geo.acts.map((a) => a.top);
  check(
    `${width} · 顶栏右侧动作单行（top 差 ≤2px）`,
    Math.max(...tops) - Math.min(...tops) <= 2,
    JSON.stringify(tops.map((t) => Math.round(t))),
  );
  check(
    `${width} · 顶栏不裁切（scrollWidth ≤ clientWidth + 1）`,
    geo.railScroll <= geo.railClient + 1,
    `${geo.railScroll} / ${geo.railClient}`,
  );
  check(
    `${width} · 顶栏动作不越出视口右缘`,
    Math.max(...geo.acts.map((a) => a.right)) <= geo.viewport,
    String(Math.round(Math.max(...geo.acts.map((a) => a.right)))),
  );
  await entry.click();
  await page.waitForURL("**/substances", { timeout: 10000 });
  check(`${width} · 点顶栏入口落到 /substances`, new URL(page.url()).pathname === "/substances", page.url());
}

/* ===== 8) 同一通路内切换保留 ?step= / ?organ=（自链 + 结构页回挂图） ===== */
await page.setViewportSize({ width: 1440, height: 900 });
await page.goto(`${BASE}/pathway/glycolysis?organ=rbc&step=gk-3`, { waitUntil: "networkidle" });
await page.waitForSelector('[data-testid="pathway-switcher"]');
{
  const selfHref = await page.locator('[data-testid="pathway-switcher"] [data-nav-id="glycolysis"] a').getAttribute("href");
  const keep = new URL(selfHref ?? "", "http://local").searchParams;
  check(
    "同页自链保留 ?organ= 与 ?step=（不丢参数）",
    keep.get("organ") === "rbc" && keep.get("step") === "gk-3" && (selfHref ?? "").startsWith("/pathway/glycolysis?"),
    selfHref ?? "null",
  );
  const coriHref = await page.locator('[data-testid="pathway-switcher"] [data-nav-id="cori"] a').getAttribute("href");
  check("跨通路切换不携带上一页参数（Cori 为干净路由）", coriHref === "/pathway/cori", coriHref ?? "null");
}

// 结构页：切换器当前项仍指向挂图，film-back 的 ?step= 语义不受影响
await page.goto(`${BASE}/structures/glycolysis`, { waitUntil: "networkidle" });
await page.waitForSelector('[data-testid="pathway-switcher"]');
{
  const back = await page.locator('[data-testid="film-back"] a:not(.film-home)').getAttribute("href");
  check("结构页 film-back 仍回挂图（形态未变）", (back ?? "").startsWith("/pathway/glycolysis"), back ?? "null");
  const selfHref = await page.locator('[data-testid="pathway-switcher"] [data-nav-id="glycolysis"] a').getAttribute("href");
  check("结构页当前项指向本通路挂图", selfHref === "/pathway/glycolysis", selfHref ?? "null");
  check("结构页两行导航并存（film-back + 切换器）", (await page.locator('[data-testid="film-back"]').count()) === 1 && (await page.locator('[data-testid="pathway-switcher"]').count()) === 1);
}

/* ===== 9) 1440 版面复核：两行均完整、在报头之上 ===== */
{
  await page.goto(`${BASE}/pathway/fatty-acid-oxidation`, { waitUntil: "networkidle" });
  await page.waitForSelector('[data-testid="pathway-switcher"]');
  const geo = await page.evaluate(readNavRows);
  check(
    "1440 下 23 条通路全部显示（主线 13 + 延伸 10）",
    (geo?.main?.items.length ?? 0) + (geo?.extended?.items.length ?? 0) === NAV.length,
    `${geo?.main?.items.length} + ${geo?.extended?.items.length}`,
  );
  check(
    "1440 下两行均不裁切",
    (geo?.main?.scrollWidth ?? 0) <= (geo?.main?.clientWidth ?? 0) + 1 &&
      (geo?.extended?.scrollWidth ?? 0) <= (geo?.extended?.clientWidth ?? 0) + 1,
    `main ${geo?.main?.scrollWidth}/${geo?.main?.clientWidth} · ext ${geo?.extended?.scrollWidth}/${geo?.extended?.clientWidth}`,
  );
  check(
    "切换器整体在报头之上（不压报头）",
    geo?.mastTop === null || geo.navBottom <= geo.mastTop + 1,
    `${Math.round(geo?.navBottom ?? 0)} ≤ ${geo?.mastTop === null ? "n/a" : Math.round(geo.mastTop)}`,
  );
}

/* ===== 10) 截图：展开 / 收起（当前在延伸行）/ 结构页 / 首页 ===== */
await page.goto(`${BASE}/pathway/heme`, { waitUntil: "networkidle" });
await page.waitForSelector('[data-testid="pathway-switcher"]');
await page.screenshot({ path: join(ROOT, "preview", "nav-two-rows-open.png") });
console.log("✓ 截图 preview/nav-two-rows-open.png（1440 两行展开）");
await page.locator('[data-testid="pathway-switcher"] [data-nav-toggle]').click();
await page.waitForSelector('[data-nav-row="extended-current"]');
await page.screenshot({ path: join(ROOT, "preview", "nav-two-rows-collapsed.png") });
console.log("✓ 截图 preview/nav-two-rows-collapsed.png（1440 收起且当前在延伸行）");

await page.goto(`${BASE}/pathway/tca?step=tca-3`, { waitUntil: "networkidle" });
await page.waitForSelector('[data-testid="pathway-switcher"]');
await page.screenshot({ path: join(ROOT, "preview", "nav-poster-tca.png") });
console.log("✓ 截图 preview/nav-poster-tca.png（1440 挂图页）");

await page.goto(`${BASE}/structures/tca`, { waitUntil: "networkidle" });
await page.waitForSelector('[data-testid="pathway-switcher"]');
await page.screenshot({ path: join(ROOT, "preview", "nav-structure-tca.png") });
console.log("✓ 截图 preview/nav-structure-tca.png（1440 结构页）");

await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
await page.waitForSelector('[data-testid="pathway-switcher"]');
await page.screenshot({ path: join(ROOT, "preview", "nav-home.png") });
console.log("✓ 截图 preview/nav-home.png（1440 首页）");

if (errors.length) {
  console.error("页面错误：", errors);
  failed = true;
}
await browser.close();
console.log(failed ? "\n✗ smoke-nav 有失败项" : "\n✓ smoke-nav 全部通过");
if (failed) process.exit(1);
