// 物质简介页冒烟（/molecule/:id，全量 182 个物质）
// 校验口径：5 个样板逐项查结构/文案/3D/深链；全量 182 条路由可达且不落未知 id 兜底；
// 18 张挂图的全部可悬停节点都能解析出「→ 物质简介」条目并指向已收录档案；
// 三处入口（气泡底行 / 结构页档案卡 / 挂图步骤面板）实测 href、未知 id 列出全部入口、
// 1440/1280 无页面级横向溢出、无控制台报错、截图落 preview/。
// 需先 `npm run build`，再 `npm run preview`（或 BASE_URL 指向本地服务）。
import { mkdirSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright-core";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const BASE = process.env.BASE_URL ?? "http://localhost:4173";
const PROFILE_SRC = readFileSync(join(ROOT, "src", "data", "moleculeProfiles.ts"), "utf8");
const PROFILE_IDS = [...PROFILE_SRC.matchAll(/^  (?:"([^"\n]+)"|([\w-]+)): \{$/gm)].map((m) => m[1] ?? m[2]);
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

const SAMPLES = [
  {
    id: "g6p",
    name: "6-磷酸葡萄糖",
    claim: "G6P 是糖代谢的分岔点",
    alias: "别名：G6P / 葡萄糖-6-磷酸 / 6-磷酸葡糖",
    classKey: "糖磷酸酯",
    titles: [
      "它卡在糖酵解第一站，同时守着三个出口",
      "它从葡萄糖和糖原来，往糖酵解、磷酸戊糖途径与血糖去",
      "磷酸基把它锁在胞内，肝还能把它放回血液",
      "考点是分岔、酶和第一步不可逆",
    ],
    flowKeys: ["来路：", "去向：", "己糖激酶", "磷酸戊糖途径"],
    bubble: ["糖磷酸酯，葡萄糖的胞内形式", "糖酵解、PPP 与糖原的交汇点"],
    pathways: 4,
    href: "/molecule/g6p",
    asset3d: "g6p",
  },
  {
    id: "pyr",
    name: "丙酮酸",
    claim: "丙酮酸是糖酵解终点与碳流向的岔口",
    alias: "别名：Pyr / pyruvate / 2-氧代丙酸",
    classKey: "α-酮酸",
    titles: [
      "它是糖酵解第 10 步的终点，也是线粒体的入口",
      "它从 PEP 与丙氨酸来，往乙酰-CoA、草酰乙酸和乳酸去",
      "它的去向决定乳酸堆不堆",
      "考点是终点位置、PDH 辅因子和乳酸去向",
    ],
    flowKeys: ["来路：", "去向：", "丙酮酸激酶", "乳酸脱氢酶"],
    bubble: ["α-酮酸，三碳的糖酵解终产物", "决定碳进线粒体还是变乳酸"],
    pathways: 3,
    href: "/molecule/pyr",
    asset3d: "pyr",
  },
  {
    id: "accoa",
    name: "乙酰-CoA",
    claim: "乙酰-CoA 是两碳单元的通用货币",
    alias: "别名：乙酰辅酶 A / AcCoA / acetyl-CoA",
    classKey: "辅酶 A 硫酯",
    titles: [
      "它是 TCA 第 1 步的底物，也是脂肪酸合成的起点",
      "它从丙酮酸、脂肪酸和氨基酸来，往 TCA、脂合成与酮体去",
      "它不能自己过线粒体内膜，主要搭柠檬酸穿梭",
      "考点是硫酯、辅酶 A 与柠檬酸穿梭",
    ],
    flowKeys: ["来路：", "去向：", "PDH", "丙二酰-CoA"],
    bubble: ["泛酸构成的辅酶 A 硫酯，两碳载体", "TCA 第 1 步底物，也是脂合成起点"],
    pathways: 4,
    href: "/molecule/accoa",
    asset3d: "accoa",
  },
  {
    id: "ser",
    name: "L-丝氨酸",
    claim: "丝氨酸是一碳单位与磷脂的原料库",
    alias: "别名：丝氨酸 / Ser / L-serine",
    classKey: "中性极性 α-氨基酸",
    titles: [
      "它由 3-磷酸甘油酸生成，碳骨架可归入丙酮酸",
      "它从糖酵解中间物来，往丙酮酸、甘氨酸与磷脂去",
      "它把碳骨架、一碳单位和磷脂三条线接在一起",
      "考点是脱氨产物、一碳载体和侧链羟基",
    ],
    flowKeys: ["来路：", "去向：", "SHMT", "四氢叶酸"],
    bubble: ["含羟基的中性氨基酸，一碳单位原料", "脱氨进丙酮酸，也能供磷脂"],
    pathways: 1,
    // ser 的去路只按数据层 fate 口径说明，不深链到具体步骤（aa-7 是胱硫醚 β-合酶，不是丝氨酸脱氨）
    pathwayStep: false,
    href: "/molecule/ser",
    asset3d: null,
  },
  {
    id: "urea-ure",
    name: "尿素",
    claim: "尿素是氮的最终出口",
    alias: "别名：urea / 碳酰胺",
    classKey: "含氮小分子",
    titles: [
      "它是尿素循环第 5 步的产物，催化酶是精氨酸酶",
      "它从氨甲酰磷酸和天冬氨酸的两个氮来，到肾排出",
      "它把有毒的氨变成能运输的中性分子",
      "考点是两个氮源、第 5 步和能量账",
    ],
    flowKeys: ["来路：", "去向：", "精氨酸酶", "天冬氨酸"],
    bubble: ["含氮小分子，两个氮的载体", "把氨装成中性分子运到肾"],
    pathways: 1,
    href: "/molecule/urea-ure",
    asset3d: "urea-ure",
  },
];

const browser = await launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
page.on("pageerror", (e) => errors.push(String(e)));
page.on("console", (m) => m.type() === "error" && errors.push(m.text()));

mkdirSync(join(ROOT, "preview"), { recursive: true });

// ===== 1) 5 条简介页：结构、文案、3D/文字、深链、出处 =====
for (const s of SAMPLES) {
  const resp = await page.goto(`${BASE}${s.href}`, { waitUntil: "networkidle" });
  check(`${s.name} 路由 ${s.href} 可达（200）`, resp?.status() === 200);
  check(`[${s.id}] data-testid=molecule-profile 存在`, (await page.locator('[data-testid="molecule-profile"]').count()) === 1);
  check(`[${s.id}] data-mol-key=${s.id}`, (await page.locator('[data-testid="molecule-profile"]').getAttribute("data-mol-key")) === s.id);
  check(`[${s.id}] h1 是判断句：${s.claim}`, (await page.locator(".mp-head h1").innerText()) === s.claim);
  check(`[${s.id}] 分类归属写在头部`, (await page.locator('[data-testid="profile-classification"]').innerText()).startsWith("分类：") && (await page.locator('[data-testid="profile-classification"]').innerText()).includes(s.classKey));
  check(`[${s.id}] 别名行原文`, (await page.locator('[data-testid="molecule-profile-aliases"]').innerText()) === s.alias);

  for (const sel of ["profile-position", "profile-flow", "profile-significance", "profile-exam"]) {
    check(`[${s.id}] 新骨架板块 ${sel} 存在`, (await page.locator(`[data-testid="${sel}"]`).count()) === 1);
  }
  const secTitles = await page.locator(".mp-sec h2").evaluateAll((els) => els.map((el) => el.textContent?.trim()));
  check(`[${s.id}] 四个板块标题按新骨架`, secTitles.join("|") === s.titles.join("|"), secTitles.join("|"));
  check(
    `[${s.id}] 不再出现旧名词短语标题`,
    !secTitles.some((t) => ["这是什么", "什么性质", "基本角色", "在通路里"].includes(t ?? "")),
    secTitles.join("|"),
  );
  const positionText = await page.locator('[data-testid="profile-position"]').innerText();
  check(`[${s.id}] 在链上的位置写到步骤/酶（≥40 字）`, positionText.replace(/\s/g, "").length >= 40);
  const flowText = await page.locator('[data-testid="profile-flow"]').innerText();
  check(`[${s.id}] 生成与去路是动词链（来路/去向齐全）`, s.flowKeys.every((k) => flowText.includes(k)));
  const examCount = await page.locator('[data-testid="profile-exam"] li').count();
  check(`[${s.id}] 考点与易错逐条（≥3 条）`, examCount >= 3, `${examCount} 条`);
  const sourcesCount = await page.locator('[data-testid="profile-sources"] li').count();
  check(`[${s.id}] 出处逐条（≥2 条）`, sourcesCount >= 2, `${sourcesCount} 条`);
  const sourceText = await page.locator('[data-testid="profile-sources"]').innerText();
  check(`[${s.id}] 出处含教材章节`, /Lehninger Principles of Biochemistry, 8e, Ch\.\d+/.test(sourceText));

  const links = await page.locator('[data-testid="profile-pathway-link"]').evaluateAll((els) =>
    els.map((el) => ({ text: el.textContent?.trim() ?? "", href: el.getAttribute("href") ?? "" })),
  );
  check(`[${s.id}] 通路深链 ${s.pathways} 条`, links.length === s.pathways, links.map((l) => l.href).join(","));
  check(
    `[${s.id}] 深链都指回挂图${s.pathwayStep === false ? "" : "（带 step=）"}`,
    links.every((l) => l.href.startsWith("/pathway/") && (s.pathwayStep === false || l.href.includes("?step="))),
    links.map((l) => l.href).join(","),
  );

  if (s.asset3d) {
    await page.waitForTimeout(700);
    const mol = page.locator('[data-testid="profile-structure"] [data-testid="mol-3d"]');
    check(`[${s.id}] 结构卡嵌入 3D 查看器`, (await mol.count()) === 1);
    check(`[${s.id}] 3D 资产 id = ${s.asset3d}`, (await mol.getAttribute("data-mol-id")) === s.asset3d);
    check(`[${s.id}] 3D 未回退文字说明`, (await page.locator('[data-testid="profile-structure-text"]').count()) === 0);
    check(`[${s.id}] 结构卡高度受控（stage 272px 作用域）`, (await page.locator('[data-testid="profile-structure"] .mol3d-stage').evaluate((el) => Math.round(el.getBoundingClientRect().height))) === 272);
  } else {
    check(`[${s.id}] 无 3D → 文字结构说明`, (await page.locator('[data-testid="profile-structure-text"]').count()) === 1);
    check(`[${s.id}] 无 3D → 不渲染 mol-3d`, (await page.locator('[data-testid="profile-structure"] [data-testid="mol-3d"]').count()) === 0);
    const text = await page.locator('[data-testid="profile-structure-text"]').innerText();
    check(`[${s.id}] 文字说明注明「暂无 3D 资产」`, text.includes("暂无 3D 资产"));
  }

  const crumb = await page.locator(".mp-crumb a").evaluateAll((els) => els.map((el) => el.getAttribute("href")));
  check(`[${s.id}] 面包屑可回首页`, crumb.includes("/"));
  check(`[${s.id}] 面包屑当前页名`, (await page.locator('.mp-crumb [aria-current="page"]').innerText()) === s.name);

  check(`[${s.id}] 无控制台报错`, errors.length === 0, errors.slice(0, 3).join(" | "));
}

// ===== 2) 未知 id 不落死胡同 =====
await page.goto(`${BASE}/molecule/not-a-molecule`, { waitUntil: "networkidle" });
check("未知 id：给出「没有这个物质」", (await page.locator(".mp-head h1").innerText()) === "没有这个物质");
check(`未知 id：列出全部 ${PROFILE_IDS.length} 个物质入口`, (await page.locator(".mp-links-wide a").count()) === PROFILE_IDS.length);
check("未知 id：入口可回首页", (await page.locator('.mp-crumb a[href="/"]').count()) >= 1);

// ===== 2b) 全量 182 条简介路由：可达、不落兜底、骨架齐全 =====
check(`档案总数 ${PROFILE_IDS.length} === 182`, PROFILE_IDS.length === 182, PROFILE_IDS.length.toString());
const badRoutes = [];
for (const id of PROFILE_IDS) {
  const resp = await page.goto(`${BASE}/molecule/${id}`, { waitUntil: "domcontentloaded" });
  const profile = page.locator('[data-testid="molecule-profile"]');
  if (!resp || resp.status() !== 200) {
    badRoutes.push(`${id}:HTTP ${resp?.status() ?? "null"}`);
    continue;
  }
  if ((await profile.count()) !== 1) {
    badRoutes.push(`${id}:无简介主体`);
    continue;
  }
  if ((await profile.getAttribute("data-mol-key")) !== id) {
    badRoutes.push(`${id}:落到 ${await profile.getAttribute("data-mol-key")}`);
    continue;
  }
  if ((await page.locator(".mp-head h1").innerText()) === "没有这个物质") {
    badRoutes.push(`${id}:落到未知 id 兜底`);
    continue;
  }
  const sections = await page
    .locator('[data-testid="profile-position"], [data-testid="profile-flow"], [data-testid="profile-significance"], [data-testid="profile-exam"]')
    .count();
  if (sections !== 4) badRoutes.push(`${id}:骨架板块 ${sections}/4`);
}
check(`全量 ${PROFILE_IDS.length} 条简介路由都进到自己的页面（无 404 / 无兜底）`, badRoutes.length === 0, badRoutes.slice(0, 8).join(" | "));

// ===== 2c) 18 张挂图的全部可悬停节点：气泡都能出「→ 物质简介」 =====
const PATHWAY_IDS = [
  "glycolysis",
  "tca",
  "gluconeogenesis",
  "ppp",
  "fatty-acid-oxidation",
  "oxphos",
  "cori",
  "fatty-acid-synthesis",
  "urea-cycle",
  "glycogen",
  "amino-acids",
  "cholesterol",
  "ketone",
  "one-carbon",
  "pyrimidine",
  "purine",
  "glycerophospholipid",
  "lipoprotein",
];
const nodeHrefs = new Map();
const nodeProblems = [];
for (const pid of PATHWAY_IDS) {
  await page.goto(`${BASE}/pathway/${pid}`, { waitUntil: "networkidle" });
  const nodeIds = await page
    .locator("svg g[data-node-id]")
    .evaluateAll((els) =>
      Array.from(
        new Set(
          els
            .filter((el) => el.querySelector("circle") && !el.classList.contains("branch-node"))
            .map((el) => el.getAttribute("data-node-id"))
            .filter(Boolean),
        ),
      ),
    );
  for (const nodeId of nodeIds) {
    if (nodeHrefs.has(nodeId)) continue;
    await page.mouse.move(10, 10);
    await page.keyboard.press("Escape");
    await page.waitForTimeout(120);
    const circle = page.locator(`svg g[data-node-id="${nodeId}"] circle`).first();
    const target = (await circle.count()) === 1 ? circle : page.locator(`svg g[data-node-id="${nodeId}"]`).first();
    await target.hover({ force: true });
    await page.waitForTimeout(500);
    const bubble = page.locator(".content-bubble");
    if ((await bubble.count()) !== 1) {
      nodeProblems.push(`${pid}:${nodeId}:无气泡`);
      continue;
    }
    const entry = bubble.locator(".cb-entry");
    if ((await entry.count()) !== 1) {
      nodeProblems.push(`${pid}:${nodeId}:无简介入口`);
      continue;
    }
    if (!(await entry.innerText()).includes("物质简介")) {
      nodeProblems.push(`${pid}:${nodeId}:入口文案异常`);
      continue;
    }
    await target.click({ force: true, modifiers: ["Shift"] });
    await page.waitForTimeout(100);
    const href = await bubble.locator("a.cb-entry").getAttribute("href");
    if (!href || !href.startsWith("/molecule/")) {
      nodeProblems.push(`${pid}:${nodeId}:href=${href ?? "null"}`);
      continue;
    }
    const hrefId = href.slice("/molecule/".length);
    if (!PROFILE_IDS.includes(hrefId)) {
      nodeProblems.push(`${pid}:${nodeId}:href 指向未收录 ${hrefId}`);
      continue;
    }
    nodeHrefs.set(nodeId, href);
  }
}
check(
  `18 张挂图的 ${nodeHrefs.size} 个可悬停节点都能进到自己的简介页`,
  nodeProblems.length === 0,
  nodeProblems.slice(0, 8).join(" | "),
);

// ===== 3) 入口 A：气泡底行（首页/挂图节点） =====
await page.goto(`${BASE}/pathway/glycolysis`, { waitUntil: "networkidle" });
await page.locator('svg g[data-node-id="g6p"] circle').first().hover({ force: true });
await page.waitForTimeout(500);
const bubble = page.locator(".content-bubble");
check("气泡 [G6P] 弹出", (await bubble.count()) === 1);
const bubbleLines = await bubble.locator(".cb-line").evaluateAll((els) => els.map((el) => el.textContent?.trim()));
check("气泡 [G6P] 第一行 = 它是什么类的东西", bubbleLines[0] === "糖磷酸酯，葡萄糖的胞内形式", bubbleLines.join(" / "));
check("气泡 [G6P] 第二行 = 链上的关键作用", bubbleLines[1] === "糖酵解、PPP 与糖原的交汇点", bubbleLines.join(" / "));
check("气泡 [G6P] 只放两行（长文进简介页）", bubbleLines.length === 2, `${bubbleLines.length} 行`);
check("气泡 [G6P] 不再列相关步骤", !bubbleLines.some((l) => /相关步骤|gk-|第 .* 步/.test(l ?? "")), bubbleLines.join(" / "));
check("气泡 [G6P] 每行 ≤ 21 字", bubbleLines.every((l) => [...(l ?? "")].length <= 21));
check("气泡 [G6P] 底行出现「→ 物质简介」", (await bubble.locator(".cb-entry").innerText()).includes("物质简介"));
const hoverEntry = bubble.locator(".cb-entry");
check("悬停态底行即为链接（无需先 Shift 固定）", (await hoverEntry.evaluate((el) => el.tagName)) === "A");
check("悬停态底行 href = /molecule/g6p", (await hoverEntry.getAttribute("href")) === "/molecule/g6p");
// 不固定气泡，直接单击入口：必须进入简介页
await hoverEntry.click();
await page.waitForTimeout(300);
check("单击悬停气泡入口即进入简介页（未固定）", page.url().endsWith("/molecule/g6p"), page.url());

// Shift 固定仍保留，且固定后入口仍是链接
await page.goto(`${BASE}/pathway/glycolysis`, { waitUntil: "networkidle" });
await page.locator('svg g[data-node-id="g6p"] circle').first().hover({ force: true });
await page.waitForTimeout(500);
await page.locator('svg g[data-node-id="g6p"] circle').first().click({ force: true, modifiers: ["Shift"] });
await page.waitForTimeout(150);
check("Shift 固定后气泡保持固定态", (await page.locator(".content-bubble").getAttribute("data-bubble-pinned")) === "1");
check("固定态底行 href = /molecule/g6p", (await page.locator(".content-bubble a.cb-entry").getAttribute("href")) === "/molecule/g6p");
await page.keyboard.press("Escape");
await page.waitForTimeout(150);
check("Esc 关闭固定气泡", (await page.locator(".content-bubble").count()) === 0);

// 首页总图节点：悬停气泡入口同样单击可进
await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
await page.locator('.home-node[data-node-id="glc"] circle').first().hover({ force: true });
await page.waitForTimeout(600);
check("首页节点 [Glc] 气泡弹出", (await page.locator(".content-bubble").count()) === 1);
const homeEntry = page.locator(".content-bubble .cb-entry");
check("首页节点悬停入口即为链接", (await homeEntry.evaluate((el) => el.tagName)) === "A");
check("首页节点入口 href = /molecule/glc", (await homeEntry.getAttribute("href")) === "/molecule/glc");
await homeEntry.click();
await page.waitForTimeout(300);
check("单击首页节点气泡入口进入简介页", page.url().endsWith("/molecule/glc"), page.url());

// 尿素：node id "urea" → 规范键 urea-ure 的映射实测
await page.goto(`${BASE}/pathway/urea-cycle`, { waitUntil: "networkidle" });
await page.locator('svg g[data-node-id="urea"] circle').first().hover({ force: true });
await page.waitForTimeout(500);
check("气泡 [尿素] 弹出", (await page.locator(".content-bubble").count()) === 1);
const ureaBubbleText = await page.locator(".content-bubble").innerText();
check("气泡 [尿素] 走新骨架文案", ureaBubbleText.includes("含氮小分子，两个氮的载体") && ureaBubbleText.includes("把氨装成中性分子运到肾"), ureaBubbleText.replace(/\n/g, " / "));
check("气泡 [尿素] 只放两行 + 入口", (await page.locator(".content-bubble .cb-line").count()) === 2, `${await page.locator(".content-bubble .cb-line").count()} 行`);
check("气泡 [尿素] 不再列相关步骤", !ureaBubbleText.includes("相关步骤"), ureaBubbleText.replace(/\n/g, " / "));
await page.locator('svg g[data-node-id="urea"] circle').first().click({ force: true, modifiers: ["Shift"] });
await page.waitForTimeout(150);
check("气泡 [尿素] 底行 href = /molecule/urea-ure", (await page.locator(".content-bubble a.cb-entry").getAttribute("href")) === "/molecule/urea-ure");

// ===== 4) 入口 B：结构页档案卡 =====
await page.goto(`${BASE}/structures/glycolysis?step=gk-1`, { waitUntil: "networkidle" });
const cardEntry = page.locator('[data-testid="molecule-profile-entry"][href="/molecule/g6p"]');
check("结构页 [G6P] 档案卡出现「物质简介 →」", (await cardEntry.count()) === 1);
check("结构页 [G6P] 档案卡文案", (await cardEntry.innerText()).includes("物质简介"));

await page.goto(`${BASE}/structures/urea-cycle?step=urea-5`, { waitUntil: "networkidle" });
const ureaCard = page.locator('[data-testid="molecule-profile-entry"][href="/molecule/urea-ure"]');
check("结构页 [尿素] 档案卡出现", (await ureaCard.count()) === 1);

// ===== 5) 入口 C：挂图步骤详情面板 + 来路可回 =====
// gk-1 的底物葡萄糖排在前面，本步面板入口指向 /molecule/glc（全量铺设后的预期行为）
await page.goto(`${BASE}/pathway/glycolysis?step=gk-1`, { waitUntil: "networkidle" });
const panelEntry = page.locator('[data-testid="glycolysis-molecule-archive-entry-profile"]');
check("步骤面板出现「本步物质简介 →」", (await panelEntry.count()) === 1);
check("步骤面板 href = /molecule/glc", (await panelEntry.getAttribute("href")) === "/molecule/glc");
check("原有「本步分子档案 →」仍在", (await page.locator('[data-testid="glycolysis-molecule-archive-entry"]').count()) === 1);

await panelEntry.click();
await page.waitForTimeout(300);
check("点击面板入口进入简介页", page.url().endsWith("/molecule/glc"));
await page.locator('[data-testid="molecule-profile-back"]').click();
await page.waitForTimeout(300);
check("「返回上一页」回到来路挂图步骤", page.url().includes("/pathway/glycolysis") && page.url().includes("step=gk-1"), page.url());

await page.goto(`${BASE}/molecule/g6p`, { waitUntil: "networkidle" });
await page.locator('.mp-crumb a[href="/"]').click();
await page.waitForTimeout(300);
check("面包屑「首页」可回", page.url() === `${BASE}/` || page.url() === `${BASE}`);

// ===== 6) 尺寸：1440 / 1280 无页面级横向溢出 + 截图 =====
for (const width of [1440, 1280]) {
  await page.setViewportSize({ width, height: 900 });
  for (const s of SAMPLES) {
    await page.goto(`${BASE}${s.href}`, { waitUntil: "networkidle" });
    await page.waitForTimeout(400);
    const fit = await page.evaluate(() => ({
      client: document.documentElement.clientWidth,
      scroll: document.documentElement.scrollWidth,
      height: document.documentElement.scrollHeight,
    }));
    check(`${width} [${s.id}] 无页面级横向溢出`, fit.scroll <= fit.client + 2, JSON.stringify(fit));
    if (width === 1440) {
      const box = await page.locator('[data-testid="molecule-profile"]').boundingBox();
      check(`1440 [${s.id}] 页面主栏有宽度`, Boolean(box) && box.width >= 1000, box ? `${Math.round(box.width)}px` : "null");
      await page.screenshot({ path: join(ROOT, "preview", `molecule-${s.id}-1440.png`), fullPage: true });
      const h = await page.evaluate(() => document.documentElement.scrollHeight);
      console.log(`  · screenshot preview/molecule-${s.id}-1440.png（1440×${h} fullPage）`);
    }
  }
}
await page.setViewportSize({ width: 900, height: 900 });
await page.goto(`${BASE}/molecule/g6p`, { waitUntil: "networkidle" });
const cols = await page.locator(".mp-grid").evaluate((el) => getComputedStyle(el).gridTemplateColumns);
check("900 宽响应式：主栏单列", cols.split(" ").length === 1, cols);

// ===== 7) /molecules 全量索引 + 固定入口 =====
await page.setViewportSize({ width: 1440, height: 900 });
const indexResp = await page.goto(`${BASE}/molecules`, { waitUntil: "networkidle" });
check("/molecules 索引页可达（200）", indexResp?.status() === 200);
check('索引页有 data-testid="molecules-index"', (await page.locator('[data-testid="molecules-index"]').count()) === 1);
const indexItems = page.locator('[data-testid="molecules-index-item"]');
check(`索引列出全量 ${PROFILE_IDS.length} 条`, (await indexItems.count()) === PROFILE_IDS.length, (await indexItems.count()).toString());
const indexHrefs = await indexItems.evaluateAll((els) => els.map((el) => el.getAttribute("href") ?? ""));
check("每条索引链接都指向 /molecule/<id>", indexHrefs.every((href) => href.startsWith("/molecule/")) && new Set(indexHrefs).size === PROFILE_IDS.length, `unique=${new Set(indexHrefs).size}`);
const indexGroupCount = await page.locator(".mol-group").count();
check("索引按通路分组", indexGroupCount >= 11, `${indexGroupCount} 组`);

// 固定入口 A：首页报头
await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
const homeIndexEntry = page.locator("[data-home-molecules]");
check("首页固定入口「物质索引」存在", (await homeIndexEntry.count()) === 1);
check("首页固定入口 href = /molecules", (await homeIndexEntry.getAttribute("href")) === "/molecules");
await homeIndexEntry.click();
await page.waitForTimeout(300);
check("首页固定入口可进入索引页", page.url().endsWith("/molecules"), page.url());

// 固定入口 B：非首页顶栏
await page.goto(`${BASE}/pathway/glycolysis`, { waitUntil: "networkidle" });
const railIndexEntry = page.locator('[data-rail-action="molecules"]');
check("挂图顶栏固定入口「物质索引」存在", (await railIndexEntry.count()) === 1);
check("顶栏固定入口 href = /molecules", (await railIndexEntry.getAttribute("href")) === "/molecules");
await railIndexEntry.click();
await page.waitForTimeout(300);
check("顶栏固定入口可进入索引页", page.url().endsWith("/molecules"), page.url());

// 搜索：按名称 / 别名 / id 过滤
await page.goto(`${BASE}/molecules`, { waitUntil: "networkidle" });
const search = page.locator('[data-testid="molecules-search"]');
await search.fill("pyr");
await page.waitForTimeout(150);
const filteredIds = await indexItems.evaluateAll((els) => els.map((el) => el.getAttribute("data-mol-id")));
check("搜索 pyr 命中丙酮酸档案", filteredIds.includes("pyr"), filteredIds.join(","));
check("搜索 pyr 过滤掉不相关档案（g6p）", !filteredIds.includes("g6p"), filteredIds.join(","));
check("搜索后条数同步到计数行", (await page.locator('[data-testid="molecules-count"]').innerText()).includes(`显示 ${filteredIds.length} / ${PROFILE_IDS.length}`));
await search.fill("葡萄糖-6-磷酸");
await page.waitForTimeout(150);
const aliasIds = await indexItems.evaluateAll((els) => els.map((el) => el.getAttribute("data-mol-id")));
check("按别名「葡萄糖-6-磷酸」命中 g6p", aliasIds.includes("g6p"), aliasIds.join(","));
await search.fill("no-such-molecule-xyz");
await page.waitForTimeout(150);
check("无匹配时给出空态", (await page.locator('[data-testid="molecules-empty"]').count()) === 1);
check("无匹配时列表清空", (await indexItems.count()) === 0);
await search.fill("");
await page.waitForTimeout(150);
check("清空搜索恢复全量", (await indexItems.count()) === PROFILE_IDS.length);

// 两个视口：索引页无页面级横向溢出
for (const width of [1440, 1280]) {
  await page.setViewportSize({ width, height: 900 });
  await page.goto(`${BASE}/molecules`, { waitUntil: "networkidle" });
  await page.waitForTimeout(200);
  const fit = await page.evaluate(() => ({
    client: document.documentElement.clientWidth,
    scroll: document.documentElement.scrollWidth,
  }));
  check(`${width} 索引页无页面级横向溢出`, fit.scroll <= fit.client + 2, JSON.stringify(fit));
}

check("全程无控制台报错", errors.length === 0, errors.slice(0, 3).join(" | "));

await browser.close();
process.exit(failed ? 1 : 0);
