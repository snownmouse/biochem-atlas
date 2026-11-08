// smoke-layout：全站版式红线的机器断言（消费 tools/audit-layout.mjs 的机器可读报告）。
// 用法：node tools/audit-layout.mjs --tag after && node tools/smoke-layout.mjs
//
// 断言（任一失败即非零退出）：
//   ① 图框：首页 / 13 张挂图 / 13 张结构页 / 3 张单步页，凡出现图框元素者，四边均为 1px 细边框、
//      四边内边距 ≥ 24px（`.plate-scroll`、`.e3d-stage`、`.mol3d-stage`、`.s-viewer`、`.film-stage .stage-canvas`）。
//   ② 横向：页面级横向溢出必须为 0；挂在 overflow:hidden/clip 内且不可滚的溢出必须为 0；
//      被祖先裁切 ≥1px 的元素必须为 0。允许（且只允许）容器级 `overflow-x:auto` 的可滚横向。
//   ③ 文本重叠：沿用体检同一套排除规则——CJK 文本包围盒含行高外扩，两行相邻时即使字形不相交，
//      包围盒也可能探入 ≤5px；判定为「行内叠放」的（中心距 >4px 且纵向探入 <45% 较小行高）不计，
//      其余有效重叠必须为 0。SVG text 只在同一 svg 内两两比较，HTML 文本用 Range 取真实矩形，
//      两套坐标系不跨系统比较；同组设计性叠放（节点缩写落在圆内）本就无包围盒相交，不进入计数。
//   ④ 完整性：每页节点 / 步骤 / 前处理组 / 模块数与数据源（JSON）逐项相等（映射口径见 EXPECT）。
//   ⑤ 缩放：页面不得出现 zoom/缩放类交互件，也不得出现带 transform: scale 的交互件、zoom-in/out 光标。
//      3D 查看器（3Dmol canvas）自带的拖拽/滚轮是既有交互，不在本轮新增范围，也不计入控件断言。
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => JSON.parse(readFileSync(resolve(ROOT, p), "utf8"));
const report = read("preview/layout-audit.json");

// 0) 审计新鲜度：必须先用本轮 audit 覆盖，避免拿旧报告跑绿（可用 AUDIT_MAX_AGE_MIN 覆盖默认 120 分钟）
const MAX_AGE_MIN = Number(process.env.AUDIT_MAX_AGE_MIN ?? 120);
const generatedMs = Date.parse(report.generatedAt ?? "");
const ageMin = (Date.now() - generatedMs) / 60000;
if (!report.generatedAt || !Number.isFinite(generatedMs) || ageMin > MAX_AGE_MIN || ageMin < -5) {
  console.error(
    `preview/layout-audit.json 不是本轮审计（generatedAt=${report.generatedAt ?? "缺失"}，` +
      `年龄 ${Number.isFinite(ageMin) ? ageMin.toFixed(1) : "?"} 分钟 > ${MAX_AGE_MIN} 分钟）。` +
      "请先运行 node tools/audit-layout.mjs --tag after"
  );
  process.exit(2);
}

// ---------- 数据源期望（与 audit-layout.mjs 的 EXPECT 同口径） ----------
const gly = read("src/data/glycolysis.json");
const glySkel = read("src/data/skeleton.json");
const tca = read("src/data/tca.json");
const tcaSkel = read("src/data/skeleton-tca.json");
const gng = read("src/data/gluconeogenesis/gluconeogenesis.json");
const gngSkel = read("src/data/gluconeogenesis/skeleton.json");
const ppp = read("src/data/ppp/ppp.json");
const pppSkel = read("src/data/ppp/skeleton.json");
const fao = read("src/data/fatty-acid-oxidation/fao.json");
const faoSkel = read("src/data/fatty-acid-oxidation/skeleton.json");
const fas = read("src/data/fatty-acid-synthesis/fas.json");
const fasSkel = read("src/data/fatty-acid-synthesis/skeleton.json");
const ox = read("src/data/oxphos/oxphos.json");
const oxSkel = read("src/data/oxphos/skeleton.json");
const cori = read("src/data/cori/cori.json");
const coriSkel = read("src/data/cori/skeleton.json");
const urea = read("src/data/urea-cycle/urea.json");
const ureaSkel = read("src/data/urea-cycle/skeleton.json");
const glycogen = read("src/data/glycogen/glycogen.json");
const glycogenSkel = read("src/data/glycogen/skeleton.json");
const amino = read("src/data/amino-acid/amino.json");
const aminoSkel = read("src/data/amino-acid/skeleton.json");
const cholesterol = read("src/data/cholesterol/cholesterol.json");
const cholesterolSkel = read("src/data/cholesterol/skeleton.json");
const ketone = read("src/data/ketone/ketone.json");
const ketoneSkel = read("src/data/ketone/skeleton.json");

const COMPLEX_NODE_IDS = ["complex-i", "complex-ii", "complex-iii", "cytc", "complex-iv", "atp-synthase"];
const EXPECT = {
  glycolysis: { steps: gly.steps.length + (gly.sideBranchSteps?.length ?? 0), nodes: glySkel.nodes.length },
  tca: { steps: tca.steps.length + (tca.sideBranchSteps?.length ?? 0), nodes: tcaSkel.nodes.length },
  gluconeogenesis: {
    steps: gng.steps.length + (gng.sideBranchSteps?.length ?? 0) + (gngSkel.transportSteps?.length ?? 0),
    nodes: gngSkel.nodes.length,
  },
  ppp: { steps: ppp.steps.length, nodes: pppSkel.nodes.length },
  "fatty-acid-oxidation": {
    steps: fao.steps.filter((s) => !["fao-act", "fao-shuttle"].includes(s.id)).length,
    prep: 2,
    nodes: faoSkel.nodes.length,
  },
  "fatty-acid-synthesis": { steps: fas.steps.length, nodes: fasSkel.nodes.length },
  oxphos: { steps: 0, modules: ox.modules.length, nodes: oxSkel.nodes.filter((n) => !COMPLEX_NODE_IDS.includes(n.id)).length },
  cori: { steps: cori.arms.reduce((n, a) => n + a.steps.length, 0), nodes: coriSkel.nodes.length },
  "urea-cycle": { steps: urea.steps.length, nodes: ureaSkel.nodes.length },
  glycogen: { steps: glycogen.steps.length, nodes: glycogenSkel.nodes.length },
  "amino-acids": { steps: amino.steps.length, nodes: aminoSkel.nodes.length },
  cholesterol: { steps: cholesterol.steps.length, nodes: cholesterolSkel.nodes.length },
  ketone: { steps: ketone.steps.length, nodes: ketoneSkel.nodes.length },
};

const ROUTE_IDS = [
  "home",
  "molecules",
  "substances",
  "substance-vit-a",
  "substance-vit-c",
  "substance-sucrose",
  "substance-insulin",
  "glycolysis",
  "tca",
  "gluconeogenesis",
  "ppp",
  "fao",
  "oxphos",
  "cori",
  "fas",
  "urea-cycle",
  "glycogen",
  "amino-acids",
  "cholesterol",
  "ketone",
  "structures-glycolysis",
  "structures-tca",
  "structures-gluconeogenesis",
  "structures-ppp",
  "structures-fao",
  "structures-fas",
  "structures-urea-cycle",
  "structures-glycogen",
  "structures-amino-acids",
  "structures-cholesterol",
  "structures-ketone",
  "structures-cori",
  "structures-oxphos",
  "step-gk-1",
  "step-gk-6",
  "step-gk-9",
];
const VIEWPORTS = [1440, 1280];

const failures = [];
const fail = (msg) => failures.push(msg);
const px = (s) => parseFloat(s);
const sides = (v) => v.split(/\s+/).map(px);

if (!report.pages?.length) {
  console.error("preview/layout-audit.json 缺少结果，请先运行 node tools/audit-layout.mjs --tag after");
  process.exit(2);
}

// 0) 覆盖度：每个路由 × 每个视口都跑到了
for (const id of ROUTE_IDS) {
  for (const vp of VIEWPORTS) {
    const p = report.pages.find((x) => x.page === id && x.viewport === vp);
    if (!p || p.fatal) fail(`覆盖缺失/崩溃：${id}@${vp}${p?.fatal ? `（${String(p.fatal).slice(0, 80)}）` : ""}`);
  }
}

for (const p of report.pages) {
  if (p.fatal) continue;
  const at = `${p.page}@${p.viewport}`;

  // ① 图框 + 内边距
  const framePages = p.kind === "home" || p.kind === "poster" || p.kind === "structures" || p.kind === "step";
  if (framePages) {
    if (!p.frames.length) fail(`① 无图框元素：${at}`);
    for (const f of p.frames) {
      const b = sides(f.border);
      const pad = sides(f.padding);
      if (b.some((x) => x !== 1)) fail(`① 图框边框非 1px：${at} ${f.cls} → ${f.border}`);
      if (pad.some((x) => x < 24)) fail(`① 图框内边距 <24px：${at} ${f.cls} → ${f.padding}`);
    }
  }

  // ② 横向溢出
  if (p.clipped?.length) {
    for (const c of p.clipped) fail(`② 被祖先裁切 ${c.overflowPx}px：${at} ${c.selector}（${c.container} ${c.axis}）`);
  }
  if (p.svgClipped?.length) {
    for (const c of p.svgClipped) fail(`② SVG 视口裁切 ${c.overflowPx}px：${at} ${c.selector}`);
  }
  if (p.unreachableOverflow?.length) {
    for (const c of p.unreachableOverflow) fail(`② 不可滚横向溢出 ${c.overflowPx}px：${at} ${c.selector}（${c.container}）`);
  }
  if (p.docOverflow.overflowPx > 0) {
    fail(`② 页面级横向溢出 ${p.docOverflow.overflowPx}px：${at}（body 不应出现整页横向滚动）`);
  }

  // ③ 有效文本重叠
  if ((p.significantOverlaps ?? []).length) {
    for (const o of p.significantOverlaps) {
      fail(`③ 文本重叠 ${o.overlap.w}×${o.overlap.h}px：${at} 「${o.a}」×「${o.b}」（${o.system}，${o.reason}）`);
    }
  }

  // ④ 完整性：节点 / 步骤 / 前处理 / 模块
  if (p.expect) {
    const exp = EXPECT[p.pathwayKey] ?? null;
    const c = p.completeness;
    const dm = c.dataMismatch ?? {};
    if (exp) {
      if (exp.steps !== undefined && c.uniqueStepIds !== exp.steps) {
        fail(`④ 步骤数不符：${at} 数据 ${exp.steps} / 渲染 ${c.uniqueStepIds}`);
      }
      if (exp.nodes !== undefined && c.uniqueNodeIds !== exp.nodes) {
        fail(`④ 节点数不符：${at} 数据 ${exp.nodes} / 渲染 ${c.uniqueNodeIds}`);
      }
      if (exp.prep !== undefined && c.uniquePrepIds !== exp.prep) {
        fail(`④ 前处理组数不符：${at} 数据 ${exp.prep} / 渲染 ${c.uniquePrepIds}`);
      }
      if (exp.modules !== undefined && c.uniqueModuleIds !== exp.modules) {
        fail(`④ 模块数不符：${at} 数据 ${exp.modules} / 渲染 ${c.uniqueModuleIds}`);
      }
      if (dm.moduleSet?.missing?.length) fail(`④ 模块缺失：${at} ${dm.moduleSet.missing.join(", ")}`);
    }
    // 挂图页六件套（单步页 / 结构页不按挂图页体例要求）
    if (p.kind === "poster") {
      if (!c.hasPlateNo) fail(`④ 缺 PLATE 编号：${at}`);
      if (!c.hasTitle) fail(`④ 缺标题：${at}`);
      if (!(c.legendCount >= 4)) fail(`④ 图例不足（${c.legendCount} 项）：${at}`);
      if (!c.hasCrumb) fail(`④ 缺面包屑：${at}`);
      if (!c.hasSwitcher) fail(`④ 缺 PathwaySwitcher：${at}`);
      if (!c.hasFooter) fail(`④ 缺页脚说明：${at}`);
    }
  }

  // ⑤ 缩放控件
  if ((p.zoomControls ?? []).length) fail(`⑤ 出现缩放交互件：${at} ${p.zoomControls.join(", ")}`);
}

// ⑥ 编号三方一致：页面 .plate-no 的 SF 号 === comparisonConfig 的 plateNo === 数据层 structureNo / structurePlateNo（若存在）
const STRUCT_ROUTE_KEY = {
  "structures-glycolysis": "glycolysis",
  "structures-tca": "tca",
  "structures-gluconeogenesis": "gluconeogenesis",
  "structures-ppp": "ppp",
  "structures-fao": "fatty-acid-oxidation",
  "structures-fas": "fatty-acid-synthesis",
  "structures-urea-cycle": "urea-cycle",
  "structures-glycogen": "glycogen",
  "structures-amino-acids": "amino-acids",
  "structures-oxphos": "oxphos",
  "structures-cholesterol": "cholesterol",
  "structures-ketone": "ketone",
  "structures-cori": "cori",
};
const cmpSrc = readFileSync(resolve(ROOT, "src/data/comparisonConfig.ts"), "utf8");
const cfgSf = new Map();
for (const block of cmpSrc.split(/\nconst \w+_CONFIG: ComparisonConfig = \{/).slice(1)) {
  const pid = block.match(/pathwayId: "([^"]+)"/)?.[1];
  const sf = block.match(/plateNo: "PLATE SF-(\d{2})/)?.[1];
  if (pid && sf) cfgSf.set(pid, sf);
}
const dataSf = new Map();
if (fas.structurePlateNo) dataSf.set("fatty-acid-synthesis", fas.structurePlateNo.replace("SF-", ""));
if (urea.structureNo) dataSf.set("urea-cycle", urea.structureNo.replace("SF-", ""));
if (ox.structurePlateNo) dataSf.set("oxphos", ox.structurePlateNo.replace("SF-", ""));
if (amino.structureNo) dataSf.set("amino-acids", amino.structureNo.replace("SF-", ""));
const shownSf = [];
for (const p of report.pages.filter((x) => x.viewport === 1440)) {
  const key = STRUCT_ROUTE_KEY[p.page];
  if (!key) continue;
  const text = p.completeness?.plateNoText ?? "";
  const shown = text.match(/SF-(\d{2})/)?.[1];
  const want = cfgSf.get(key) ?? dataSf.get(key);
  if (!shown) fail(`⑥ 结构页缺编号显示：${p.page}@1440（${text || "无 .plate-no"}）`);
  else if (!want) fail(`⑥ 编号无结构化来源：${p.page}@1440（config / data 均无）`);
  else if (shown !== want) fail(`⑥ 编号不一致：${p.page}@1440 页面 SF-${shown} ≠ 结构化 SF-${want}`);
  if (shown) shownSf.push(Number(shown));
}
shownSf.sort((a, b) => a - b);
if (shownSf.length !== 13 || shownSf.join(",") !== "1,2,3,4,5,6,7,8,9,10,11,12,13") {
  fail(`⑥ 结构页编号集合不符：页面 ${shownSf.join(",")} ≠ {01,02,03,04,05,06,07,08,09,10,11,12,13}`);
}

// 汇总
const totalChecks = report.pages.length * 5;
if (failures.length) {
  console.error(`smoke-layout FAIL：${failures.length} 项\n` + failures.map((f) => `  - ${f}`).join("\n"));
  process.exit(1);
}
console.log(
  `smoke-layout PASS：${report.pages.length} 页（${ROUTE_IDS.length} 路由 × ${VIEWPORTS.length} 视口）｜` +
    `图框 1px/≥24px ✓｜横向溢出 0 ✓｜有效文本重叠 0 ✓｜节点/步骤/模块与数据源一致 ✓｜无缩放控件 ✓｜` +
    `结构页编号三方一致（13 页 = {01–13}）✓（共 ${totalChecks} 组断言 + 编号交叉核对）`
);
