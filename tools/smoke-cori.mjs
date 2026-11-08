// Cori 循环挂图冒烟验证（playwright-core + 本机 Edge/Chrome）。
// 校验口径：路由可达、两列器官、血流带真方向、13 条引用与 href、能量账加法 2−6=−4、
// NADH 归属净 0、点击选中 / 跳既有页面、自测揭晓不选中、?step= 还原、首页回路不改六标题。
// 不校验 3D：本页一律 2D，threeD.status=pending。
// 运行前：npm run build && npm run preview。
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

const read = (p) => JSON.parse(readFileSync(resolve(ROOT, p), "utf8"));
const gly = read("src/data/glycolysis.json");
const glu = read("src/data/gluconeogenesis/gluconeogenesis.json");
const gluSkel = read("src/data/gluconeogenesis/skeleton.json");

const sourceSteps = new Map();
for (const s of [...gly.steps, ...(gly.sideBranchSteps || [])]) sourceSteps.set(`glycolysis:${s.id}`, s);
for (const s of [...glu.steps, ...(glu.sideBranchSteps || [])]) sourceSteps.set(`gluconeogenesis:${s.id}`, s);
for (const s of gluSkel.transportSteps) sourceSteps.set(`gluconeogenesis:${s.id}`, s);

const EXPECTED_HREF = {
  "cori-m-gk1": "/pathway/glycolysis?step=gk-1",
  "cori-m-gk3": "/pathway/glycolysis?step=gk-3",
  "cori-m-gk6": "/pathway/glycolysis?step=gk-6",
  "cori-m-gk10": "/pathway/glycolysis?step=gk-10",
  "cori-m-ldh": "/pathway/gluconeogenesis?step=gn-cori",
  "cori-m-mct": "",
  "cori-l-mct": "",
  "cori-l-ldh": "/pathway/gluconeogenesis?step=gn-cori",
  "cori-l-mpc": "/pathway/gluconeogenesis?step=gn-shuttle-mpc",
  "cori-l-pc": "/pathway/gluconeogenesis?step=gn-1",
  "cori-l-pepck": "/pathway/gluconeogenesis?step=gn-2",
  "cori-l-fbpase": "/pathway/gluconeogenesis?step=gn-9",
  "cori-l-g6pase": "/pathway/gluconeogenesis?step=gn-11",
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

/* ===== 1) 路由 + 两列器官 + 区室带 ===== */
await page.goto(`${BASE}/pathway/cori`, { waitUntil: "networkidle" });
check("页面可达：Cori 挂图 SVG 存在", (await page.locator("svg[data-cori-plate]").count()) === 1);
check("无控制台报错", errors.length === 0, errors.join(" | "));
check("两列器官（肝 / 肌）", (await page.locator("[data-organ-column]").count()) === 2);
const organText = await page.evaluate(() => [...document.querySelectorAll("[data-organ-column]")].map((el) => el.textContent).join(" | "));
check("器官标题：肝 · 回收端", organText.includes("肝 · 回收端"));
check("器官标题：骨骼肌 · 产出端", organText.includes("骨骼肌 · 产出端"));
for (const id of ["blood", "liver-cytosol", "liver-matrix", "liver-er", "muscle-cytosol", "muscle-matrix"]) {
  check(`区室带 ${id}`, (await page.locator(`[data-compartment="${id}"]`).count()) === 1);
}
const compartmentText = await page.evaluate(() => [...document.querySelectorAll("[data-compartment]")].map((el) => el.textContent).join(" | "));
check("区室标签含线粒体基质", compartmentText.includes("线粒体基质"));
check("区室标签含内质网腔", compartmentText.includes("内质网腔"));
check("区室标签含细胞质", compartmentText.includes("细胞质"));

/* ===== 2) 血流带方向 ===== */
check("血流带两条流", (await page.locator("[data-blood-flow]").count()) === 2);
const flowDir = await page.evaluate(() =>
  [...document.querySelectorAll("[data-blood-flow]")].map((el) => [el.getAttribute("data-blood-flow"), el.getAttribute("data-flow-dir"), el.getAttribute("d")])
);
const parseX = (d) => {
  const first = Number(d.match(/M\s*(-?\d+(\.\d+)?)/)?.[1]);
  const all = [...d.matchAll(/L\s*(-?\d+(\.\d+)?)\s+(-?\d+(\.\d+)?)/g)].map((m) => Number(m[1]));
  return { first, last: all[all.length - 1] };
};
const lac = flowDir.find((x) => x[0] === "lactate");
const glc = flowDir.find((x) => x[0] === "glucose");
const lacX = lac ? parseX(lac[2]) : null;
const glcX = glc ? parseX(glc[2]) : null;
check("乳酸流向 = 右→左（rtl）", Boolean(lac) && lac[1] === "rtl" && lacX.first > lacX.last, JSON.stringify(lacX));
check("葡萄糖流向 = 左→右（ltr）", Boolean(glc) && glc[1] === "ltr" && glcX.first < glcX.last, JSON.stringify(glcX));
const bloodText = await page.evaluate(() => document.querySelector("[data-blood-band='1']")?.textContent ?? "");
check("血流带写明乳酸肌→肝", bloodText.includes("乳酸 · 肌 → 肝"));
check("血流带写明葡萄糖肝→肌", bloodText.includes("葡萄糖 · 肝 → 肌"));
check("红细胞第三来源单列", (await page.locator("[data-rbc-source]").count()) === 1);
const rbcText = await page.evaluate(() => document.querySelector("[data-rbc-source]")?.textContent ?? "");
check("红细胞注明无线粒体", rbcText.includes("无线粒体"));

/* ===== 3) 13 条引用 + href 正确 + 0 条反应式 ===== */
const chips = await page.locator("[data-cori-chip]").evaluateAll((els) =>
  els.map((el) => ({
    id: el.getAttribute("data-step-id"),
    organ: el.getAttribute("data-chip-organ"),
    href: el.getAttribute("data-ref-href"),
    stepId: el.getAttribute("data-ref-step-id"),
  }))
);
check("引用步总数 13", chips.length === 13, String(chips.length));
check("肌肉臂 6 条引用", chips.filter((c) => c.organ === "muscle").length === 6);
check("肝臂 7 条引用", chips.filter((c) => c.organ === "liver").length === 7);
check("引用清单表 13 行", (await page.locator("table[data-ref-table] tbody tr").count()) === 13);
const hrefBad = chips.filter((c) => (EXPECTED_HREF[c.id] ?? "?") !== c.href);
check("每条引用的跳转 href 正确", hrefBad.length === 0, JSON.stringify(hrefBad));
check("引用步 id 均在预期集合内", chips.every((c) => c.id in EXPECTED_HREF));
check("页面上没有方程块", (await page.locator("[data-equation], [data-reaction]").count()) === 0);
const bodyText = await page.evaluate(() => document.body.innerText);
const eqCopied = [...sourceSteps.entries()].filter(([, s]) => typeof s.equation === "string" && s.equation.trim() && bodyText.includes(s.equation));
check("未复制糖酵解 / 糖异生反应式", eqCopied.length === 0, eqCopied.map(([k]) => k).join(","));

/* ===== 3b) 版面几何：引用标签不压节点、不互相压字、不出画布 ===== */
const geo = await page.evaluate(() => {
  const svg = document.querySelector("svg[data-cori-plate]");
  const box = (el) => {
    const r = el.getBoundingClientRect();
    return { x: r.x, y: r.y, right: r.right, bottom: r.bottom, w: r.width, h: r.height };
  };
  const chips = [...svg.querySelectorAll("[data-cori-chip]")].map((g) => {
    const rs = [...g.querySelectorAll("text")].map(box);
    return {
      id: g.getAttribute("data-step-id"),
      x: Math.min(...rs.map((r) => r.x)),
      y: Math.min(...rs.map((r) => r.y)),
      right: Math.max(...rs.map((r) => r.right)),
      bottom: Math.max(...rs.map((r) => r.bottom)),
    };
  });
  const nodes = [...svg.querySelectorAll("[data-node-id] circle")].map((c) => ({
    id: c.parentElement.getAttribute("data-node-id"),
    ...box(c),
  }));
  return { svg: box(svg), chips, nodes };
});
const overlap = (a, b) =>
  Math.min(a.right, b.right) - Math.max(a.x, b.x) > 3 && Math.min(a.bottom, b.bottom) - Math.max(a.y, b.y) > 3;
const outOfCanvas = geo.chips.filter(
  (c) => c.x < geo.svg.x - 1 || c.right > geo.svg.right + 1 || c.y < geo.svg.y - 1 || c.bottom > geo.svg.bottom + 1
);
check("13 条引用标签均在画布内", outOfCanvas.length === 0, JSON.stringify(outOfCanvas));
const chipChip = [];
for (let i = 0; i < geo.chips.length; i += 1) {
  for (let j = i + 1; j < geo.chips.length; j += 1) {
    if (overlap(geo.chips[i], geo.chips[j])) chipChip.push([geo.chips[i].id, geo.chips[j].id]);
  }
}
check("引用标签互不压字", chipChip.length === 0, JSON.stringify(chipChip));
const chipNode = [];
for (const c of geo.chips) {
  for (const n of geo.nodes) if (overlap(c, n)) chipNode.push([c.id, n.id]);
}
check("引用标签不压代谢物节点", chipNode.length === 0, JSON.stringify(chipNode));

/* ===== 4) 能量账加法 ===== */
check("账本独立块存在", (await page.locator("[data-cori-ledger]").count()) === 1);
const nets = await page.locator("[data-ledger-net]").evaluateAll((els) => els.map((el) => el.getAttribute("data-ledger-net")));
check("账本净额全部 = −4（主块 + 速览）", nets.length === 2 && nets.every((v) => v === "-4"), JSON.stringify(nets));
const ledgerText = await page.locator("[data-cori-ledger]").innerText();
check("账本加法式 +2 − 6 = −4", ledgerText.includes("+2 − 6 = −4"));
check("账本逐项 7 行", (await page.locator("table[data-ledger-table] tbody tr").count()) === 7);
const ledgerLinks = await page.locator("table[data-ledger-table] a").evaluateAll((els) => els.map((el) => el.getAttribute("href")));
const expectedLedgerLinks = [
  "/pathway/glycolysis?step=gk-1",
  "/pathway/glycolysis?step=gk-3",
  "/pathway/glycolysis?step=gk-7",
  "/pathway/glycolysis?step=gk-10",
  "/pathway/gluconeogenesis?step=gn-1",
  "/pathway/gluconeogenesis?step=gn-2",
  "/pathway/gluconeogenesis?step=gn-5",
];
check("账本 7 条来源链接正确", JSON.stringify(ledgerLinks) === JSON.stringify(expectedLedgerLinks), JSON.stringify(ledgerLinks));
check("推导三步齐全", ["肌肉：", "肝：", "全身："].every((s) => ledgerText.includes(s)));

/* ===== 5) 氧化还原账 ===== */
check("NADH 归属表 2 条臂", (await page.locator("table[data-redox-table] tbody tr").count()) === 2);
const redoxNets = await page.locator("[data-redox-row]").evaluateAll((els) => els.map((el) => el.getAttribute("data-redox-net")));
check("两条臂 NADH 净额均为 0", redoxNets.length === 2 && redoxNets.every((v) => v === "0"), JSON.stringify(redoxNets));
const redoxText = await page.locator("table[data-redox-table]").innerText();
check("氧化还原表含 NADH 产 / 耗", redoxText.includes("NADH") && redoxText.includes("gk-6") && redoxText.includes("gn-6"));
const misText = await page.locator("[data-three-misalignments]").innerText();
check("右栏写明整轮 NADH 净 0", misText.includes("NADH 净 0"));

/* ===== 6) 点击引用步 → 右栏 → 跳原页面 ===== */
await page.locator('svg g[data-step-id="cori-m-gk6"] text.st-name').click();
check("点击 gk-6 引用后 URL 带 step", page.url().includes("step=cori-m-gk6"));
check("gk-6 处于唯一选中态", (await page.locator('svg .cori-chip.sel[data-step-id="cori-m-gk6"]').count()) === 1);
check("右栏出现引用详情", (await page.locator("aside [data-ref-detail='cori-m-gk6']").count()) === 1);
const detailText = await page.locator("aside [data-ref-detail]").innerText();
check("详情写明来源糖酵解 gk-6", detailText.includes("糖酵解") && detailText.includes("gk-6"));
check("详情写明 gk-6 产 NADH +2", detailText.includes("NADH") && detailText.includes("+2"));
const jump = page.locator("aside a[data-ref-link='cori-m-gk6']");
check("详情跳转 href 指向 /pathway/glycolysis?step=gk-6", (await jump.getAttribute("href")) === "/pathway/glycolysis?step=gk-6");

await jump.click();
await page.waitForURL(/\/pathway\/glycolysis\?step=gk-6/);
check("点击跳转进入既有糖酵解页面（带 step）", page.url().includes("/pathway/glycolysis?step=gk-6"));
check("既有页面确实有 gk-6 步骤", (await page.locator('svg g[data-step-id="gk-6"]').count()) === 1);
await page.screenshot({ path: join(ROOT, "preview", "cori-jump-glycolysis.png"), fullPage: true });

/* ===== 7) 逆向 LDH 与转运连接件 ===== */
await page.goto(`${BASE}/pathway/cori?step=cori-m-ldh`, { waitUntil: "networkidle" });
check("?step= 还原：肌肉 LDH 选中", (await page.locator('svg .cori-chip.sel[data-step-id="cori-m-ldh"]').count()) === 1);
check("逆向说明存在", (await page.locator("aside [data-reverse-note='1']").count()) === 1);
check("逆向说明点明 gn-cori 记录方向", (await page.locator("aside [data-reverse-note]").innerText()).includes("lac → pyr"));
const reverseLink = page.locator("aside a[data-ref-link='cori-m-ldh']");
check("逆向 LDH 仍跳糖异生 gn-cori", (await reverseLink.getAttribute("href")) === "/pathway/gluconeogenesis?step=gn-cori");

await page.goto(`${BASE}/pathway/cori?step=cori-m-mct`, { waitUntil: "networkidle" });
check("?step= 还原：MCT4 转运选中", (await page.locator('svg .cori-chip.sel[data-step-id="cori-m-mct"]').count()) === 1);
check("转运步右栏出“非酶促”说明", (await page.locator("[data-testid='cori-transport-none']").count()) === 1);
check("转运步没有原页面跳转", (await page.locator("aside a[data-ref-link]").count()) === 0);

/* ===== 8) 自测：揭晓不选中 ===== */
await page.goto(`${BASE}/pathway/cori`, { waitUntil: "networkidle" });
await page.locator("button.quiz-toggle").click();
check("自测开启后 SVG 带 quiz-on", (await page.locator("svg[data-cori-plate].quiz-on").count()) === 1);
const preUrl = page.url();
await page.locator('svg g[data-step-id="cori-m-gk1"] text.st-name').click();
const revealed = await page.evaluate(() => document.querySelector('svg g[data-step-id="cori-m-gk1"] text.st-name')?.classList.contains("revealed") ?? false);
check("自测点击 q-hide 只揭晓", revealed === true);
check("自测揭晓不改变 URL / 不选中", page.url() === preUrl && !page.url().includes("step="));
check("自测时未选中任何引用步", (await page.locator("svg .cori-chip.sel").count()) === 0);
await page.locator("button.quiz-toggle").click();
check("自测关闭后 quiz-on 移除", (await page.locator("svg[data-cori-plate].quiz-on").count()) === 0);

/* ===== 9) ?step= 还原 + 节点点击 ===== */
await page.goto(`${BASE}/pathway/cori?step=cori-l-fbpase`, { waitUntil: "networkidle" });
check("URL 还原：肝 FBPase 选中", (await page.locator('svg .cori-chip.sel[data-step-id="cori-l-fbpase"]').count()) === 1);
await page.goto(`${BASE}/pathway/cori`, { waitUntil: "networkidle" });
await page.locator('svg g[data-node-id="oaa"] text').first().click();
check("点击 OAA 节点映射到 PC 引用", page.url().includes("step=cori-l-pc"));

/* ===== 10) 首页：十一条标题；FAS 上线后标题块 6→7，尿素循环再加一块，糖原再加一块，氨基酸再加一块；Cori 仍只走回路层 ===== */
// 政策（2026-11-05）：无参数默认改为「收起辅助栏 + 等比铺满」，首屏完整可见 8/11。
// 本条原判定口径是展开档，用同一套 ?fold=open 还原；断言与阈值未改，仅按用户口径
// 把第 11 条（氨基酸代谢，y=650）排除在「必须可见」之外（不许压其它标题坐标）。
await page.goto(`${BASE}/?fold=open`, { waitUntil: "networkidle" });
check("首页 Cori 回路层存在", (await page.locator("[data-cori-loop]").count()) === 1);
check("首页回路 href 指向 /pathway/cori", (await page.locator("[data-cori-loop]").getAttribute("href")) === "/pathway/cori");
check("首页回路两条血流", (await page.locator("[data-cori-flow]").count()) === 2);
check("首页 12 个通路区块（Cori 不占标题块）", (await page.locator("[data-pathway-block]").count()) === 12);
check("首页 13 个通路标题（12 区块 + Cori 连接带）", (await page.locator("[data-pathway-title]").count()) === 13);
check("首页有 24 条去向链接", (await page.locator("[data-home-link]").count()) === 24);
check("首页侧栏有 Cori 入口", (await page.locator("[data-cori-aside-link]").count()) === 1);
const titles = await page.locator("[data-pathway-title]").evaluateAll((els) =>
  els.map((el) => {
    const r = el.getBoundingClientRect();
    return { id: el.getAttribute("data-pathway-title"), x: r.x, y: r.y, right: r.right, bottom: r.bottom };
  })
);
const ALLOW_OFFSCREEN = ["amino-acids", "cholesterol", "ketone"];
const offscreen = titles.filter((t) => t.y < 0 || t.bottom > 900 || t.x < 0 || t.right > 1440);
check(
  "1440×900 展开档：仅氨基酸 / 胆固醇 / 酮体出屏，其余十条全见",
  titles.length === 13 && offscreen.length === 3 && ALLOW_OFFSCREEN.every((id) => offscreen.some((t) => t.id === id)),
  JSON.stringify(titles.map((t) => [t.id, Math.round(t.y), Math.round(t.bottom)]))
);
const lowest = Math.max(...titles.filter((t) => !ALLOW_OFFSCREEN.includes(t.id)).map((t) => t.bottom));
check("除出屏三条外，十条标题最低底边 ≤ 900", lowest <= 900, `最低底边 ${Math.round(lowest)}px（余量 ${900 - Math.round(lowest)}px）`);
await page.screenshot({ path: join(ROOT, "preview", "home-cori-loop.png") });
await page.locator("[data-cori-loop] rect").first().click();
await page.waitForURL(/\/pathway\/cori/);
check("点击首页回路进入 Cori 页", page.url().includes("/pathway/cori"));

/* ===== 11) 截图：整页 / 血流带 / 账本（1440×900） ===== */
await page.setViewportSize({ width: 1440, height: 900 });
await page.goto(`${BASE}/pathway/cori`, { waitUntil: "networkidle" });
await page.screenshot({ path: join(ROOT, "preview", "cori-full.png"), fullPage: true });
await page.locator("[data-blood-band='1']").screenshot({ path: join(ROOT, "preview", "cori-blood-band.png") });
await page.locator("[data-cori-ledger]").screenshot({ path: join(ROOT, "preview", "cori-ledger.png") });
console.log("✓ 截图 preview/cori-full.png / cori-blood-band.png / cori-ledger.png / cori-jump-glycolysis.png / home-cori-loop.png");

/* ===== 11b) 1440 视口：两器官 + 血液带同屏，且无横向滚动 ===== */
const measure = async () =>
  page.evaluate(() => {
    const rect = (el) => {
      const r = el.getBoundingClientRect();
      return { left: r.left, right: r.right };
    };
    const scroll = document.querySelector(".cori-poster .plate-scroll");
    const svg = document.querySelector("svg[data-cori-plate]");
    const chips = [...svg.querySelectorAll("[data-cori-chip]")];
    const bands = [...svg.querySelectorAll("[data-compartment]")];
    const organ = (prefix) => {
      const parts = [
        ...chips.filter((c) => c.getAttribute("data-chip-organ") === prefix).map(rect),
        ...bands.filter((b) => b.getAttribute("data-compartment").startsWith(prefix)).map(rect),
      ];
      return {
        left: Math.min(...parts.map((r) => r.left)),
        right: Math.max(...parts.map((r) => r.right)),
      };
    };
    const ledger = document.querySelector("[data-cori-ledger]");
    return {
      viewport: window.innerWidth,
      scrollBox: rect(scroll),
      visible: scroll ? scroll.clientWidth : 0,
      scrollWidth: scroll ? scroll.scrollWidth : 0,
      scrollLeft: scroll ? scroll.scrollLeft : 0,
      svg: rect(svg),
      liver: organ("liver"),
      muscle: organ("muscle"),
      flows: [...svg.querySelectorAll("[data-blood-flow]")].map((p) => ({ id: p.getAttribute("data-blood-flow"), ...rect(p) })),
      labels: [...svg.querySelectorAll("[data-flow-label]")].map((t) => ({ id: t.getAttribute("data-flow-label"), text: t.textContent, ...rect(t) })),
      ledger: ledger ? { ...rect(ledger), scrollWidth: ledger.scrollWidth, clientWidth: ledger.clientWidth } : null,
    };
  });

const m1440 = await measure();
/* 2026-11-04 版式规范：图框四周各留 24px 后，1440 下画布可见宽 = 1003 − 48；
   1:1 画布（1000px，字号不缩）必然差 45px。按“不挤压、允许左右滚动”的新口径，
   改判为：画布必须仍是 1:1 未缩放（不许靠缩字/缩放换零滚动），横向漫游 ≤ 60px。 */
check(
  "1440：画布 1:1 未缩放（1000px，不靠缩字换空间）",
  Math.abs(m1440.svg.right - m1440.svg.left - 1000) <= 2,
  `画布 ${Math.round(m1440.svg.right - m1440.svg.left)} px`
);
check(
  "1440：横向可滚且漫游量 ≤ 60px（短拖一段即可看全肌列）",
  m1440.scrollWidth >= m1440.visible && m1440.scrollWidth - m1440.visible <= 60,
  `可见 ${m1440.visible} · 内容 ${m1440.scrollWidth} · 差 ${m1440.scrollWidth - m1440.visible} px`
);
check(
  "1440：肝列包围盒整体在视口内（left ≥ 0 且 right ≤ 视口宽）",
  m1440.liver.left >= 0 && m1440.liver.right <= m1440.viewport,
  `[${Math.round(m1440.liver.left)}, ${Math.round(m1440.liver.right)}] / ${m1440.viewport}`
);
check(
  "1440：肌列包围盒整体在视口内（left ≥ 0 且 right ≤ 视口宽）",
  m1440.muscle.left >= 0 && m1440.muscle.right <= m1440.viewport,
  `[${Math.round(m1440.muscle.left)}, ${Math.round(m1440.muscle.right)}] / ${m1440.viewport}`
);
check("1440：画布右边界不越出视口", m1440.svg.right <= m1440.viewport, `${Math.round(m1440.svg.right)} / ${m1440.viewport}`);
check(
  "1440：两条血流路径（含箭头）均在视口内",
  m1440.flows.length === 2 && m1440.flows.every((f) => f.left >= 0 && f.right <= m1440.viewport),
  JSON.stringify(m1440.flows.map((f) => [f.id, Math.round(f.left), Math.round(f.right)]))
);
check(
  "1440：两条血流标签可见（葡萄糖 / 乳酸）",
  m1440.labels.length === 2 &&
    m1440.labels.every((l) => l.left >= 0 && l.right <= m1440.viewport && l.text.trim().length > 0),
  JSON.stringify(m1440.labels.map((l) => [l.id, Math.round(l.left), Math.round(l.right)]))
);
check(
  "1440：账本块完整可见、无截断",
  !!m1440.ledger && m1440.ledger.right <= m1440.viewport && m1440.ledger.scrollWidth <= m1440.ledger.clientWidth + 1,
  JSON.stringify(m1440.ledger)
);
console.log(
  `  · 1440 实测：画布 ${Math.round(m1440.svg.right - m1440.svg.left)} px / 可见 ${m1440.visible} · 肝列 [${Math.round(m1440.liver.left)}, ${Math.round(m1440.liver.right)}] · 肌列 [${Math.round(m1440.muscle.left)}, ${Math.round(m1440.muscle.right)}]`
);

/* 芯片字号：压宽没有靠缩字换空间（来源行 9 px，主标签 12 px） */
const minFont = await page.evaluate(() =>
  Math.min(...[...document.querySelectorAll("[data-cori-chip] text")].map((t) => parseFloat(getComputedStyle(t).fontSize)))
);
check("芯片最小字号 ≥ 9 px（未靠缩字换空间）", minFont >= 9, `${minFont} px`);
console.log(`  · 芯片最小字号 ${minFont} px（主标签 12 px / 来源行 9 px）`);

await page.locator("svg[data-cori-plate]").screenshot({ path: join(ROOT, "preview", "cori-plate-full.png") });

/* ===== 11c) 1280 视口：能不能用（不要求完美） ===== */
await page.setViewportSize({ width: 1280, height: 900 });
await page.goto(`${BASE}/pathway/cori`, { waitUntil: "networkidle" });
const m1280 = await measure();
const scrollAmt1280 = m1280.scrollWidth - m1280.visible;
const muscleVisibleRatio =
  m1280.muscle.left >= 0
    ? Math.min(1, Math.max(0, (m1280.scrollBox.right - m1280.muscle.left) / (m1280.muscle.right - m1280.muscle.left)))
    : 0;
check(
  "1280：肝列完整可见（left ≥ 0 且 right ≤ 视口宽）",
  m1280.liver.left >= 0 && m1280.liver.right <= m1280.viewport,
  `[${Math.round(m1280.liver.left)}, ${Math.round(m1280.liver.right)}] / ${m1280.viewport}`
);
check(
  "1280：横向漫游量 ≤ 220 px（一次拖动即可看全肌列）",
  scrollAmt1280 <= 220,
  `内容 ${m1280.scrollWidth} − 可见 ${m1280.visible} = ${scrollAmt1280} px`
);
check(
  "1280：肌肉列 ≥ 40% 宽度已在视口内（其余靠横向拖动，不缩字）",
  muscleVisibleRatio >= 0.4,
  `${Math.round(muscleVisibleRatio * 100)}%（[${Math.round(m1280.muscle.left)}, ${Math.round(m1280.muscle.right)}] / ${m1280.viewport}）`
);
check(
  "1280：账本块不越出视口",
  !!m1280.ledger && m1280.ledger.right <= m1280.viewport,
  JSON.stringify(m1280.ledger)
);
console.log(
  `  · 1280 实测：画布 ${Math.round(m1280.svg.right - m1280.svg.left)} px / 可见 ${m1280.visible} · 横向漫游 ${scrollAmt1280} px · 肌列可见 ${Math.round(muscleVisibleRatio * 100)}%`
);
await page.screenshot({ path: join(ROOT, "preview", "cori-1280.png"), fullPage: true });
await page.setViewportSize({ width: 1440, height: 900 });
console.log("✓ 截图 preview/cori-plate-full.png（1440 整张画布）/ cori-1280.png（1280 全页）");

/* ===== 12) Cori 结构对照页 SF-07 ===== */
await page.goto(`${BASE}/structures/cori`, { waitUntil: "networkidle" });
const sf = await page.evaluate(() => {
  const blocks = Array.from(document.querySelectorAll("[data-step-id]"));
  return {
    plate: document.querySelector(".plate-no")?.textContent ?? "",
    blocks: blocks.length,
    ids: blocks.map((el) => el.getAttribute("data-step-id")),
    back: document.querySelector('[data-testid="structures-back"]')?.getAttribute("href") ?? null,
  };
});
check("结构对照页 /structures/cori 可达", page.url().endsWith("/structures/cori"));
check("结构页报头 PLATE SF-07", /PLATE SF-07/.test(sf.plate), sf.plate);
check(
  "结构页对照块精确 = 9（gk-1/3/6/10 · gn-cori · gn-1/2/9/11）",
  sf.blocks === 9 && sf.ids.join(",") === "gk-1,gk-3,gk-6,gk-10,gn-cori,gn-1,gn-2,gn-9,gn-11",
  `${sf.blocks}：${sf.ids.join(",")}`
);
check("结构页底部返回 /pathway/cori", sf.back === "/pathway/cori", String(sf.back));
console.log("✓ 截图 preview/cori-structures.png");

/* ===== 13) 无页面错误（全流程结束后再确认一次） ===== */
check("全流程无页面错误", errors.length === 0, errors.slice(0, 3).join(" | "));

await browser.close();
console.log(failed ? "\n✗ smoke-cori 有失败项" : "\n✓ smoke-cori 全部通过");
if (failed) process.exit(1);
