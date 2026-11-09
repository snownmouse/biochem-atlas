// 全站版式体检（layout audit）：裁切 / 横向溢出 / 文本重叠 / 完整性 / 图框。
// 输出 preview/layout-audit.json（机器可读，供 smoke-layout 与后续脚本复用）。
// 用法：npm run build && npx vite preview --port 4173，然后 node tools/audit-layout.mjs [--tag before|after]
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright-core";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const BASE = process.env.BASE_URL ?? "http://localhost:4173";
const TAG = process.argv.includes("--tag") ? process.argv[process.argv.indexOf("--tag") + 1] : "run";
// --only <子串>：只体检匹配的路由（供单页冒烟复跑，例如 --only urea-cycle --tag urea）
const ONLY = process.argv.includes("--only") ? process.argv[process.argv.indexOf("--only") + 1] : null;
const read = (p) => JSON.parse(readFileSync(resolve(ROOT, p), "utf8"));

// ---------- 数据源期望值（完整性核对用） ----------
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
const oneCarbon = read("src/data/one-carbon/one-carbon.json");
const oneCarbonSkel = read("src/data/one-carbon/skeleton.json");
const pyrimidine = read("src/data/pyrimidine/pyrimidine.json");
const pyrimidineSkel = read("src/data/pyrimidine/skeleton.json");
const purine = read("src/data/purine/purine.json");
const purineSkel = read("src/data/purine/skeleton.json");
const glycerophospholipid = read("src/data/glycerophospholipid/glycerophospholipid.json");
const glycerophospholipidSkel = read("src/data/glycerophospholipid/skeleton.json");
const lipoprotein = read("src/data/lipoprotein/lipoprotein.json");
const lipoproteinSkel = read("src/data/lipoprotein/skeleton.json");

const EXPECT = {
  glycolysis: {
    steps: gly.steps.length + (gly.sideBranchSteps?.length ?? 0),
    nodes: glySkel.nodes.length,
    sources: ["glycolysis.json", "skeleton.json"],
    plate: null,
  },
  tca: {
    steps: tca.steps.length + (tca.sideBranchSteps?.length ?? 0),
    nodes: tcaSkel.nodes.length,
    sources: ["tca.json", "skeleton-tca.json"],
    plate: null,
  },
  gluconeogenesis: {
    steps: gng.steps.length + (gng.sideBranchSteps?.length ?? 0) + (gngSkel.transportSteps?.length ?? 0),
    nodes: gngSkel.nodes.length,
    sources: ["gluconeogenesis/gluconeogenesis.json", "gluconeogenesis/skeleton.json"],
    plate: null,
  },
  ppp: { steps: ppp.steps.length, nodes: pppSkel.nodes.length, sources: ["ppp/ppp.json", "ppp/skeleton.json"], plate: null },
  "fatty-acid-oxidation": {
    // 数据 6 步：前处理 2（fao-act / fao-shuttle，页面以 [data-prep-id] 呈现）+ 四步环 4（[data-step-id]）
    steps: fao.steps.filter((s) => !["fao-act", "fao-shuttle"].includes(s.id)).length,
    prep: 2,
    nodes: faoSkel.nodes.length,
    sources: ["fatty-acid-oxidation/fao.json", "fatty-acid-oxidation/skeleton.json"],
    plate: null,
  },
  "fatty-acid-synthesis": {
    // 数据 8 步；skeleton 的 transportSteps 与 fas-shuttle/fas-pdh 同 id，页面只渲染一次
    steps: fas.steps.length,
    nodes: fasSkel.nodes.length,
    sources: ["fatty-acid-synthesis/fas.json", "fatty-acid-synthesis/skeleton.json"],
    plate: fas.plateNo,
  },
  oxphos: {
    // 复合体以 [data-module-id] 呈现（7 个模块）；skeleton 15 节点 = 9 个代谢物节点 + 6 个复合体单元
    steps: 0,
    modules: ox.modules.length,
    nodes: oxSkel.nodes.filter((n) => !["complex-i", "complex-ii", "complex-iii", "cytc", "complex-iv", "atp-synthase"].includes(n.id)).length,
    sources: ["oxphos/oxphos.json", "oxphos/skeleton.json"],
    plate: ox.plateNo,
  },
  cori: {
    // 连接器 2 条只作引用标注（不设 [data-step-id]，既有设计）；可点步骤为两器官臂 13 步
    steps: cori.arms.reduce((n, a) => n + a.steps.length, 0),
    nodes: coriSkel.nodes.length,
    sources: ["cori/cori.json", "cori/skeleton.json"],
    plate: cori.plateNo,
  },
  "urea-cycle": {
    // 五步 + 两条跨膜转运都带 [data-step-id]/[data-transport-id]；本页转运不计入步骤数
    steps: urea.steps.length,
    transport: ureaSkel.transportSteps.length,
    nodes: ureaSkel.nodes.length,
    sources: ["urea-cycle/urea.json", "urea-cycle/skeleton.json"],
    plate: urea.plateNo,
  },
  glycogen: {
    steps: glycogen.steps.length,
    nodes: glycogenSkel.nodes.length,
    sources: ["glycogen/glycogen.json", "glycogen/skeleton.json"],
    plate: glycogen.plateNo,
  },
  "amino-acids": {
    // 七个步骤：aa-1…aa-5 以主链步骤标签呈现；aa-6 / aa-7 只走临床支路节点（仍带 data-step-id）
    steps: amino.steps.length,
    nodes: aminoSkel.nodes.length,
    sources: ["amino-acid/amino.json", "amino-acid/skeleton.json"],
    plate: amino.plateNo,
  },
  cholesterol: {
    // 13 步：ch-1…ch-13，下游 9 酶压缩在 ch-13 的簇节点 / 簇内清单，不另起节点
    steps: cholesterol.steps.length,
    nodes: cholesterolSkel.nodes.length,
    sources: ["cholesterol/cholesterol.json", "cholesterol/skeleton.json"],
    plate: cholesterol.plateNo,
  },
  ketone: {
    // 6 步（生酮 5 + 肝外利用 1 段合并步）+ 1 段血液运输；运输不计入步数
    steps: ketone.steps.length,
    transport: ketoneSkel.transportSteps?.length ?? 0,
    nodes: ketoneSkel.nodes.length,
    sources: ["ketone/ketone.json", "ketone/skeleton.json"],
    plate: ketone.plateNo,
  },
  "one-carbon": {
    // 8 步（线粒体装载 2 + 胞质 6）+ 1 段线粒体→胞质运输；运输不计入步数
    steps: oneCarbon.steps.length,
    transport: oneCarbonSkel.transportSteps?.length ?? 0,
    nodes: oneCarbonSkel.nodes.length,
    sources: ["one-carbon/one-carbon.json", "one-carbon/skeleton.json"],
    plate: oneCarbon.plateNo,
  },
  pyrimidine: {
    // 12 步（胞质 11 + 线粒体内膜 DHODH 1）+ 1 段乳清酸出线粒体运输；运输不计入步数
    steps: pyrimidine.steps.length,
    transport: pyrimidineSkel.transportSteps?.length ?? 0,
    nodes: pyrimidineSkel.nodes.length,
    sources: ["pyrimidine/pyrimidine.json", "pyrimidine/skeleton.json"],
    plate: pyrimidine.plateNo,
  },
  purine: {
    // 15 步全部胞质，无运输段；单区室 cyto
    steps: purine.steps.length,
    nodes: purineSkel.nodes.length,
    sources: ["purine/purine.json", "purine/skeleton.json"],
    plate: purine.plateNo,
  },
  glycerophospholipid: {
    // 14 步：内质网 13 + 高尔基体 1；无运输段
    steps: glycerophospholipid.steps.length,
    nodes: glycerophospholipidSkel.nodes.length,
    sources: ["glycerophospholipid/glycerophospholipid.json", "glycerophospholipid/skeleton.json"],
    plate: glycerophospholipid.plateNo,
  },
  lipoprotein: {
    // 11 段器官间物流（lp-1…lp-11）+ 4 个器官列 + 9 条血浆带颗粒流；颗粒账本独立成表
    steps: lipoprotein.steps.length,
    nodes: lipoproteinSkel.nodes.length,
    sources: ["lipoprotein/lipoprotein.json", "lipoprotein/skeleton.json"],
    plate: lipoprotein.plateNo,
  },
};

const ROUTES = [
  { id: "home", path: "/", kind: "home" },
  { id: "molecules", path: "/molecules", kind: "molecules" },
  { id: "substances", path: "/substances", kind: "substances" },
  { id: "substance-vit-a", path: "/substance/vit-a", kind: "substance" },
  { id: "substance-vit-c", path: "/substance/vit-c", kind: "substance" },
  { id: "substance-sucrose", path: "/substance/sucrose", kind: "substance" },
  { id: "substance-insulin", path: "/substance/insulin", kind: "substance" },
  { id: "glycolysis", path: "/pathway/glycolysis", kind: "poster", pathway: "glycolysis" },
  { id: "tca", path: "/pathway/tca", kind: "poster", pathway: "tca" },
  { id: "gluconeogenesis", path: "/pathway/gluconeogenesis", kind: "poster", pathway: "gluconeogenesis" },
  { id: "ppp", path: "/pathway/ppp", kind: "poster", pathway: "ppp" },
  { id: "fao", path: "/pathway/fatty-acid-oxidation", kind: "poster", pathway: "fatty-acid-oxidation" },
  { id: "oxphos", path: "/pathway/oxphos", kind: "poster", pathway: "oxphos" },
  { id: "cori", path: "/pathway/cori", kind: "poster", pathway: "cori" },
  { id: "fas", path: "/pathway/fas", kind: "poster", pathway: "fatty-acid-synthesis" },
  { id: "urea-cycle", path: "/pathway/urea-cycle", kind: "poster", pathway: "urea-cycle" },
  { id: "glycogen", path: "/pathway/glycogen", kind: "poster", pathway: "glycogen" },
  { id: "amino-acids", path: "/pathway/amino-acids", kind: "poster", pathway: "amino-acids" },
  { id: "cholesterol", path: "/pathway/cholesterol", kind: "poster", pathway: "cholesterol" },
  { id: "ketone", path: "/pathway/ketone", kind: "poster", pathway: "ketone" },
  { id: "one-carbon", path: "/pathway/one-carbon", kind: "poster", pathway: "one-carbon" },
  { id: "pyrimidine", path: "/pathway/pyrimidine", kind: "poster", pathway: "pyrimidine" },
  { id: "purine", path: "/pathway/purine", kind: "poster", pathway: "purine" },
  { id: "glycerophospholipid", path: "/pathway/glycerophospholipid", kind: "poster", pathway: "glycerophospholipid" },
  { id: "lipoprotein", path: "/pathway/lipoprotein", kind: "poster", pathway: "lipoprotein" },
  { id: "structures-glycolysis", path: "/structures/glycolysis", kind: "structures" },
  { id: "structures-tca", path: "/structures/tca", kind: "structures" },
  { id: "structures-gluconeogenesis", path: "/structures/gluconeogenesis", kind: "structures" },
  { id: "structures-ppp", path: "/structures/ppp", kind: "structures" },
  { id: "structures-fao", path: "/structures/fatty-acid-oxidation", kind: "structures" },
  { id: "structures-fas", path: "/structures/fatty-acid-synthesis", kind: "structures" },
  { id: "structures-urea-cycle", path: "/structures/urea-cycle", kind: "structures" },
  { id: "structures-glycogen", path: "/structures/glycogen", kind: "structures" },
  { id: "structures-amino-acids", path: "/structures/amino-acids", kind: "structures" },
  { id: "structures-cholesterol", path: "/structures/cholesterol", kind: "structures" },
  { id: "structures-ketone", path: "/structures/ketone", kind: "structures" },
  { id: "structures-one-carbon", path: "/structures/one-carbon", kind: "structures" },
  { id: "structures-pyrimidine", path: "/structures/pyrimidine", kind: "structures" },
  { id: "structures-purine", path: "/structures/purine", kind: "structures" },
  { id: "structures-glycerophospholipid", path: "/structures/glycerophospholipid", kind: "structures" },
  { id: "structures-lipoprotein", path: "/structures/lipoprotein", kind: "structures" },
  { id: "structures-cori", path: "/structures/cori", kind: "structures" },
  { id: "structures-oxphos", path: "/structures/oxphos", kind: "structures" },
  { id: "step-gk-1", path: "/step/gk-1", kind: "step" },
  { id: "step-gk-6", path: "/step/gk-6", kind: "step" },
  { id: "step-gk-9", path: "/step/gk-9", kind: "step" },
];

const VIEWPORTS = [
  { id: "1440", width: 1440, height: 900 },
  { id: "1280", width: 1280, height: 900 },
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

// ---------- 页面内体检函数（注入浏览器执行） ----------
function auditInPage(arg) {
  const { id, viewportW } = arg;
  const IGNORE_CLIP = [
    // 设计上被裁切的装饰/纹理容器：网格背景层本身不承载文字
    ".plate-canvas",
    ".e3d-host",
    ".mol3d-host",
    ".film-svg",
    ".mol2d-svg",
  ];
  const isVisible = (el) => {
    const st = getComputedStyle(el);
    if (st.display === "none" || st.visibility === "hidden" || Number(st.opacity) === 0) return false;
    const r = el.getBoundingClientRect();
    return r.width > 0.01 && r.height > 0.01;
  };
  const rectObj = (r) => ({
    x: Math.round(r.x * 10) / 10,
    y: Math.round(r.y * 10) / 10,
    w: Math.round(r.width * 10) / 10,
    h: Math.round(r.height * 10) / 10,
  });
  const labelOf = (el, max = 42) => {
    const t = (el.textContent ?? "").replace(/\s+/g, " ").trim();
    const tag = el.tagName.toLowerCase();
    const cls = (typeof el.className === "string" ? el.className : "").trim().split(/\s+/).slice(0, 2).join(".");
    return `${tag}${cls ? "." + cls : ""}${el.id ? "#" + el.id : ""}｜${t.slice(0, max)}`;
  };

  // ===== 1) 裁切 =====
  const clipped = [];
  const seen = new Set();
  const candidateEls = document.querySelectorAll("body *");
  for (const el of candidateEls) {
    if (!isVisible(el)) continue;
    if (IGNORE_CLIP.some((s) => el.matches(s) || el.closest(s))) continue;
    const r = el.getBoundingClientRect();
    let p = el.parentElement;
    while (p && p !== document.documentElement) {
      const ps = getComputedStyle(p);
      if (ps.display === "none") break;
      const ox = ps.overflowX;
      const oy = ps.overflowY;
      for (const axis of ["x", "y"]) {
        const ov = axis === "x" ? ox : oy;
        if (ov !== "hidden" && ov !== "clip" && ov !== "auto" && ov !== "scroll") continue;
        const scrollable =
          axis === "x" ? p.scrollWidth > p.clientWidth + 1 : p.scrollHeight > p.clientHeight + 1;
        if (scrollable) continue; // 可滚 = 可达，不算裁切
        const pr = p.getBoundingClientRect();
        const bl = parseFloat(ps.borderLeftWidth) || 0;
        const br = parseFloat(ps.borderRightWidth) || 0;
        const bt = parseFloat(ps.borderTopWidth) || 0;
        const bb = parseFloat(ps.borderBottomWidth) || 0;
        const left = pr.left + bl;
        const right = pr.right - br;
        const top = pr.top + bt;
        const bottom = pr.bottom - bb;
        let over = 0;
        if (axis === "x") over = Math.max(left - r.left, r.right - right, 0);
        else over = Math.max(top - r.top, r.bottom - bottom, 0);
        if (over >= 1) {
          const key = `${labelOf(el)}|${p.tagName}.${String(p.className).slice(0, 20)}|${axis}`;
          if (!seen.has(key)) {
            seen.add(key);
            clipped.push({
              page: id,
              viewport: viewportW,
              selector: labelOf(el),
              container: p.tagName.toLowerCase() + (p.className && typeof p.className === "string" ? "." + p.className.trim().split(/\s+/).slice(0, 2).join(".") : ""),
              axis,
              overflowPx: Math.round(over * 10) / 10,
              containerOverflow: axis === "x" ? ox : oy,
              rect: rectObj(r),
            });
          }
        }
      }
      p = p.parentElement;
    }
  }

  // SVG 视口裁切（SVG 根默认裁剪超出 viewBox 的内容）
  const svgClipped = [];
  for (const svg of document.querySelectorAll("svg")) {
    if (!isVisible(svg)) continue;
    const sr = svg.getBoundingClientRect();
    const vb = svg.viewBox?.baseVal;
    if (!vb || vb.width === 0) continue;
    const scale = sr.width / vb.width;
    for (const child of svg.querySelectorAll("text")) {
      if (!isVisible(child)) continue;
      const cr = child.getBoundingClientRect();
      const overL = sr.left - cr.left;
      const overR = cr.right - sr.right;
      const overT = sr.top - cr.top;
      const overB = cr.bottom - sr.bottom;
      const worst = Math.max(overL, overR, overT, overB, 0);
      if (worst >= 1) {
        svgClipped.push({
          page: id,
          viewport: viewportW,
          selector: labelOf(child),
          axis: overL > 0 || overR > 0 ? "x" : "y",
          overflowPx: Math.round(worst * 10) / 10,
          rect: rectObj(cr),
        });
      }
    }
  }

  // ===== 2) 横向溢出 =====
  const de = document.documentElement;
  const docOverflow = {
    page: id,
    viewport: viewportW,
    scrollWidth: de.scrollWidth,
    clientWidth: de.clientWidth,
    overflowPx: Math.max(0, de.scrollWidth - de.clientWidth),
    bodyOverflowX: getComputedStyle(document.body).overflowX,
    htmlOverflowX: getComputedStyle(de).overflowX,
    canScrollPage:
      de.scrollWidth > de.clientWidth && ["auto", "scroll", "visible"].includes(getComputedStyle(de).overflowX),
  };
  const unreachableOverflow = [];
  for (const el of document.querySelectorAll("body *")) {
    if (!isVisible(el)) continue;
    const p = el.parentElement;
    if (!p) continue;
    const ps = getComputedStyle(p);
    if (!["hidden", "clip"].includes(ps.overflowX)) continue;
    const pr = p.getBoundingClientRect();
    const bl = parseFloat(ps.borderLeftWidth) || 0;
    const br = parseFloat(ps.borderRightWidth) || 0;
    const over = Math.max(pr.left + bl - el.getBoundingClientRect().left, el.getBoundingClientRect().right - (pr.right - br), 0);
    if (over > 0.5) {
      unreachableOverflow.push({
        page: id,
        viewport: viewportW,
        selector: labelOf(el),
        container: p.tagName.toLowerCase() + "." + String(p.className).trim().split(/\s+/).slice(0, 2).join("."),
        overflowPx: Math.round(over * 10) / 10,
      });
    }
  }

  // ===== 3) 文本重叠 =====
  const MIN = 2;
  const intersects = (a, b) => {
    const w = Math.min(a.right, b.right) - Math.max(a.left, b.left);
    const h = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
    return w > MIN && h > MIN ? { w, h } : null;
  };
  const textOverlaps = [];
  // 3a) SVG text：只在同一 svg 内比较（不与 HTML 混算）
  const svgRoots = [...document.querySelectorAll("svg")].filter(isVisible);
  for (const svg of svgRoots) {
    const texts = [...svg.querySelectorAll("text")].filter((t) => {
      if (!isVisible(t)) return false;
      if (t.closest(".hidden-branch")) return false;
      const txt = (t.textContent ?? "").trim();
      return txt.length > 0;
    });
    for (let i = 0; i < texts.length; i++) {
      for (let j = i + 1; j < texts.length; j++) {
        const a = texts[i];
        const b = texts[j];
        if (a.contains(b) || b.contains(a)) continue;
        const hit = intersects(a.getBoundingClientRect(), b.getBoundingClientRect());
        if (!hit) continue;
        textOverlaps.push({
          page: id,
          viewport: viewportW,
          system: "svg",
          a: (a.textContent ?? "").trim(),
          b: (b.textContent ?? "").trim(),
          rectA: rectObj(a.getBoundingClientRect()),
          rectB: rectObj(b.getBoundingClientRect()),
          overlap: { w: Math.round(hit.w * 10) / 10, h: Math.round(hit.h * 10) / 10 },
          groupA: a.closest("[data-step-id],[data-node-id]")?.getAttribute("data-step-id") ?? a.closest("[data-node-id]")?.getAttribute("data-node-id") ?? "-",
          groupB: b.closest("[data-step-id],[data-node-id]")?.getAttribute("data-step-id") ?? b.closest("[data-node-id]")?.getAttribute("data-node-id") ?? "-",
          excluded: false,
          reason: "",
        });
      }
    }
  }
  // 3b) HTML 文本节点（Range 取真实文本矩形；跳过 svg 内）
  const htmlRects = [];
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  while (walker.nextNode()) {
    const node = walker.currentNode;
    if (!node.nodeValue || !node.nodeValue.trim()) continue;
    const el = node.parentElement;
    if (!el || el.closest("svg") || !isVisible(el)) continue;
    const range = document.createRange();
    range.selectNodeContents(node);
    for (const r of range.getClientRects()) {
      if (r.width < 2 || r.height < 2) continue;
      htmlRects.push({ text: node.nodeValue.replace(/\s+/g, " ").trim().slice(0, 48), el, rect: r });
    }
  }
  for (let i = 0; i < htmlRects.length; i++) {
    for (let j = i + 1; j < htmlRects.length; j++) {
      const a = htmlRects[i];
      const b = htmlRects[j];
      if (a.el.contains(b.el) || b.el.contains(a.el)) continue;
      const hit = intersects(a.rect, b.rect);
      if (!hit) continue;
      textOverlaps.push({
        page: id,
        viewport: viewportW,
        system: "html",
        a: a.text,
        b: b.text,
        rectA: rectObj(a.rect),
        rectB: rectObj(b.rect),
        overlap: { w: Math.round(hit.w * 10) / 10, h: Math.round(hit.h * 10) / 10 },
        groupA: a.el.tagName.toLowerCase() + "." + String(a.el.className).slice(0, 30),
        groupB: b.el.tagName.toLowerCase() + "." + String(b.el.className).slice(0, 30),
        excluded: false,
        reason: "",
      });
    }
  }

  // ===== 4) 完整性 =====
  const q = (s) => document.querySelector(s);
  const n = (s) => document.querySelectorAll(s).length;
  const stepIds = [...document.querySelectorAll("[data-step-id]")].map((e) => e.getAttribute("data-step-id"));
  const nodeIds = [...document.querySelectorAll("[data-node-id]")].map((e) => e.getAttribute("data-node-id"));
  const prepIds = [...document.querySelectorAll("[data-prep-id]")].map((e) => e.getAttribute("data-prep-id"));
  const moduleIds = [...document.querySelectorAll("[data-module-id]")].map((e) => e.getAttribute("data-module-id"));
  const completeness = {
    page: id,
    viewport: viewportW,
    hasPlateNo: Boolean(q(".plate-no")) && /PLATE\s*\d+/.test(q(".plate-no")?.textContent ?? ""),
    plateNoText: (q(".plate-no")?.textContent ?? "").replace(/\s+/g, " ").trim(),
    hasTitle: Boolean(q(".mast-main h1, .s-title")),
    titleText: (q(".mast-main h1, .s-title")?.textContent ?? "").replace(/\s+/g, " ").trim().slice(0, 60),
    legendCount: n(".legend .lg"),
    hasCrumb: Boolean(q("nav.crumb")),
    hasSwitcher: Boolean(q('[data-testid="pathway-switcher"]')),
    hasFooter: Boolean(q(".poster-foot")),
    stepEls: stepIds.length,
    uniqueStepIds: new Set(stepIds).size,
    stepIds,
    nodeEls: nodeIds.length,
    uniqueNodeIds: new Set(nodeIds).size,
    nodeIdsUnique: [...new Set(nodeIds)],
    uniquePrepIds: new Set(prepIds).size,
    prepIds: [...new Set(prepIds)],
    uniqueModuleIds: new Set(moduleIds).size,
    moduleIds: [...new Set(moduleIds)],
  };

  // ===== 5) 图框测量 =====
  const frames = [...document.querySelectorAll(".plate-scroll, .e3d-stage, .mol3d-stage, .poster.step-poster .s-figure, .film-stage .stage-canvas")].map((el) => {
    const st = getComputedStyle(el);
    const r = el.getBoundingClientRect();
    return {
      cls: String(el.className),
      border: [st.borderTopWidth, st.borderRightWidth, st.borderBottomWidth, st.borderLeftWidth].join(" "),
      padding: [st.paddingTop, st.paddingRight, st.paddingBottom, st.paddingLeft].join(" "),
      rect: rectObj(r),
      scrollW: el.scrollWidth,
      clientW: el.clientWidth,
    };
  });

  // ===== 6) 缩放控件 =====
  // 只查「交互件」：按钮 / 输入 / 滑块 / zoom 命名；要求页面上没有任何放大缩小入口，
  // 也不允许交互件自带 transform: scale（本轮不实现缩放）。
  const zoomControls = [...document.querySelectorAll("button, input, [role=slider], [class*=zoom], [id*=zoom]")].filter((el) => {
    const t = (el.textContent ?? "").trim().toLowerCase();
    const c = String(el.className).toLowerCase();
    const tf = getComputedStyle(el).transform;
    const scaled = tf && tf !== "none" && /matrix\(([^)]+)\)/.test(tf) && !/matrix\(1, 0, 0, 1,/.test(tf);
    const cursor = getComputedStyle(el).cursor;
    return /zoom|缩放|放大|缩小/.test(t) || /zoom/.test(c) || Boolean(scaled) || cursor === "zoom-in" || cursor === "zoom-out";
  }).map((el) => `${el.tagName.toLowerCase()}.${String(el.className).slice(0, 24)}`);

  // ===== 7) 字号与列宽（Cori 决策用） =====
  const fontSizes = [...document.querySelectorAll("svg text")].filter(isVisible).map((t) => parseFloat(getComputedStyle(t).fontSize));
  const minFontSize = fontSizes.length ? Math.min(...fontSizes) : null;
  const organCols = [...document.querySelectorAll("[data-organ-column]")].map((el) => {
    const r = el.getBoundingClientRect();
    return { id: el.getAttribute("data-organ-column"), width: Math.round(r.width), left: Math.round(r.left), right: Math.round(r.right) };
  });
  const plateScrollRects = [...document.querySelectorAll(".plate-scroll")].map((el) => {
    const r = el.getBoundingClientRect();
    return { left: Math.round(r.left), right: Math.round(r.right), clientW: el.clientWidth, scrollW: el.scrollWidth, scrollableX: el.scrollWidth > el.clientWidth + 1 };
  });

  // 排除规则（写进报告与 smoke）：CJK 文字包围盒含行高外扩，相邻两行即使字形不相交，
  // 包围盒仍会互相探入 ≤5px；这类「行内叠放」不算重叠。其余（同基线 dy≤4 或
  // 纵向探入 ≥45% 行高）一律算真实重叠。
  for (const o of textOverlaps) {
    const dy = Math.abs(o.rectA.y + o.rectA.h / 2 - (o.rectB.y + o.rectB.h / 2));
    const minh = Math.min(o.rectA.h, o.rectB.h);
    o.significant = dy <= 4 || o.overlap.h >= 0.45 * minh;
    o.excluded = !o.significant;
    o.reason = o.excluded ? `相邻行叠放：中心距 ${Math.round(dy)}px、纵向探入 ${o.overlap.h}px（<45% 行高）` : "同基线或深度相交";
  }

  return {
    page: id,
    viewport: viewportW,
    clipped,
    svgClipped,
    unreachableOverflow,
    docOverflow,
    textOverlaps,
    significantOverlaps: textOverlaps.filter((o) => o.significant),
    completeness,
    frames,
    zoomControls,
    minFontSize,
    organCols,
    plateScrollRects,
  };
}

const browser = await launch();
mkdirSync(join(ROOT, "preview"), { recursive: true });
const report = { generatedAt: new Date().toISOString(), tag: TAG, base: BASE, viewports: [], pages: [] };

for (const vp of VIEWPORTS) {
  const context = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
  for (const route of (ONLY ? ROUTES.filter((r) => r.id.includes(ONLY)) : ROUTES)) {
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", (e) => errors.push(String(e)));
    page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
    try {
      await page.goto(`${BASE}${route.path}`, { waitUntil: "networkidle", timeout: 30000 });
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.waitForTimeout(350);
      const res = await page.evaluate(auditInPage, { id: route.id, viewportW: vp.width });
      res.path = route.path;
      res.kind = route.kind;
      res.pathwayKey = route.pathway ?? null;
      res.errors = errors;
      if (route.pathway) {
        const exp = EXPECT[route.pathway];
        res.expect = exp;
        const c = res.completeness;
        res.completeness.dataMismatch = {
          steps: { expected: exp.steps, rendered: c.uniqueStepIds, ok: c.uniqueStepIds === exp.steps },
          nodes: { expected: exp.nodes, rendered: c.uniqueNodeIds, ok: c.uniqueNodeIds === exp.nodes },
          ...(exp.prep !== undefined
            ? { prep: { expected: exp.prep, rendered: c.uniquePrepIds, ok: c.uniquePrepIds === exp.prep } }
            : {}),
          ...(exp.modules !== undefined
            ? { modules: { expected: exp.modules, rendered: c.uniqueModuleIds, ok: c.uniqueModuleIds === exp.modules } }
            : {}),
          ...(route.pathway === "oxphos"
            ? {
                moduleSet: {
                  missing: exp.modules && c.moduleIds.length
                    ? ox.modules.map((m) => m.id).filter((id) => !c.moduleIds.includes(id))
                    : [],
                },
              }
            : {}),
        };
      }
      report.pages.push(res);
      console.log(
        `[${vp.id}] ${route.id}: 裁切 ${res.clipped.length + res.svgClipped.length}｜重叠(有效) ${res.significantOverlaps.length}/${res.textOverlaps.length}｜溢出 ${res.docOverflow.overflowPx}px｜步骤 ${res.completeness.uniqueStepIds}/帧 ${res.completeness.stepEls}｜节点 ${res.completeness.uniqueNodeIds}${res.expect ? "/应" + res.expect.steps + "步" + res.expect.nodes + "点" : ""}`
      );
      await page.screenshot({ path: join(ROOT, "preview", `layout-${TAG}-${vp.id}-${route.id}.png`), fullPage: true });
    } catch (e) {
      report.pages.push({ page: route.id, path: route.path, viewport: vp.width, fatal: String(e) });
      console.log(`[${vp.id}] ${route.id}: 失败 ${String(e).slice(0, 120)}`);
    }
    await page.close();
  }
  report.viewports.push({ id: vp.id, width: vp.width, height: vp.height });
  await context.close();
}

writeFileSync(join(ROOT, "preview", `layout-audit-${TAG}.json`), JSON.stringify(report, null, 2));
if (TAG === "before" || TAG === "after") writeFileSync(join(ROOT, "preview", "layout-audit.json"), JSON.stringify(report, null, 2));
await browser.close();

// 控制台摘要
let clipped = 0, overlaps = 0, sigOverlaps = 0, mismatch = 0, overflows = 0;
for (const p of report.pages) {
  if (p.fatal) continue;
  clipped += p.clipped.length + p.svgClipped.length;
  overlaps += p.textOverlaps.length;
  sigOverlaps += (p.significantOverlaps ?? []).length;
  overflows += p.docOverflow.overflowPx > 0 ? 1 : 0;
  if (p.completeness.dataMismatch) {
    const dm = p.completeness.dataMismatch;
    if (![dm.steps, dm.nodes, dm.prep, dm.modules].filter(Boolean).every((x) => x.ok)) mismatch++;
    if (dm.moduleSet && dm.moduleSet.missing?.length) mismatch++;
  }
}
console.log(`\n汇总 [${TAG}]：页面 ${report.pages.length}｜裁切 ${clipped}｜重叠 ${sigOverlaps}（原始 ${overlaps}，其余为行内叠放）｜页面级横向溢出 ${overflows}｜数据不一致 ${mismatch}`);
