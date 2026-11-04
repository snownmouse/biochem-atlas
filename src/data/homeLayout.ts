import type { HomePathwayId } from "./homeMap";

/**
 * 上下两域 · 代谢脊柱（PLATE 00 第二版构图）。
 * 上域胞质（糖酵解主链向右 + 糖异生同链逆向 + PPP 自 G6P 分叉回流），
 * 中间三条膜线（外膜 / 膜间腔 / 内膜），下域线粒体基质（TCA 与 β-氧化在乙酰-CoA 会合）。
 * 画布按 1440 视口的图版栏宽度设计，SVG 以 100% 宽度自适应缩放，不做横向漫游。
 */
export const HOME_CANVAS = { width: 1020, height: 552 };

export interface HomeBand {
  id: string;
  label: string;
  en: string;
  top: number;
  bottom: number;
  tint: number;
  x0?: number;
  x1?: number;
}

/** 上域胞质 / 膜带 / 下域基质。 */
export const HOME_BANDS: HomeBand[] = [
  { id: "cytosol", label: "细胞质", en: "CYTOSOL", top: 16, bottom: 252, tint: 0.015 },
  { id: "membrane", label: "膜间腔 / 外膜", en: "INTERMEMBRANE / OUTER MEMBRANE", top: 252, bottom: 300, tint: 0.07 },
  { id: "matrix", label: "线粒体基质", en: "MITOCHONDRIAL MATRIX", top: 300, bottom: 548, tint: 0.028 },
];

/** 膜带三条线：外膜 / 膜间腔中线 / 内膜。 */
export const HOME_MEMBRANE_LINES = [
  { y: 252, weight: 1.2 },
  { y: 276, weight: 0.9 },
  { y: 300, weight: 1.2 },
];

/** 域标签：轻量指示「当前在哪一域」时随域高亮。 */
export const HOME_DOMAIN_LABELS: { band: string; x: number; y: number; label: string }[] = [
  { band: "cytosol", x: 28, y: 26, label: "细胞质 · CYTOSOL" },
  { band: "membrane", x: 28, y: 280, label: "外膜 · 膜间腔 · 内膜" },
  { band: "matrix", x: 28, y: 312, label: "线粒体基质 · MITOCHONDRIAL MATRIX" },
];

/** ER 腔注记：糖异生末步 G6PC1 的膜面位置，只作接口说明，不另画节点。 */
export const HOME_ER_NOTE = {
  x: 24,
  y: 176,
  width: 210,
  height: 62,
  title: "ER 腔",
  lines: ["G6PC1 / SLC37A4", "G6P → 葡萄糖出腔"],
};

/** 跨域共用节点在膜带上的「两域共用」标注；不新增第二个节点。 */
export const HOME_SHARED_TAGS: { nodeId: string; x: number; y: number; text: string; anchor: "start" | "middle" | "end" }[] = [
  { nodeId: "pyr", x: 850, y: 270, text: "两域共用 · 糖酵解 → 基质", anchor: "middle" },
  { nodeId: "accoa", x: 610, y: 380, text: "接驳 · PDH → TCA / FAO", anchor: "middle" },
  { nodeId: "oaa", x: 510, y: 292, text: "两域共用 · TCA ⇄ 糖异生", anchor: "middle" },
];

export type LabelSide = "above" | "below" | "left" | "right";

export interface HomePos {
  x: number;
  y: number;
  side?: LabelSide;
}

/**
 * 坐标只负责版面；所有连线与共用关系仍由 homeMap.ts 的数据推导。
 * 关键位置：pyr 压在膜带上沿线、accoa 压在内膜下沿、oaa 上沿出膜，
 * 三个跨域分子各只画一次。
 */
export const HOME_POS: Record<string, HomePos> = {
  // —— 上域：糖酵解主链（同一链上叠糖异生逆向） ——
  glc: { x: 50, y: 150, side: "above" },
  g6p: { x: 136, y: 150, side: "above" },
  f6p: { x: 228, y: 150, side: "above" },
  fbp: { x: 320, y: 150, side: "above" },
  g3p: { x: 412, y: 150, side: "above" },
  "13bpg": { x: 500, y: 150, side: "above" },
  "3pg": { x: 588, y: 150, side: "above" },
  "2pg": { x: 676, y: 150, side: "above" },
  pep: { x: 766, y: 150, side: "above" },
  pyr: { x: 850, y: 252, side: "left" },
  dhap: { x: 368, y: 214, side: "right" },
  lac: { x: 884, y: 196, side: "right" },
  ala: { x: 916, y: 112, side: "right" },

  // —— 上域：PPP 自 G6P 分叉、回流 F6P / G3P ——
  "6pgl": { x: 162, y: 92, side: "left" },
  "6pg": { x: 216, y: 66, side: "left" },
  ru5p: { x: 282, y: 50, side: "right" },
  xu5p: { x: 368, y: 36, side: "right" },
  r5p: { x: 300, y: 100, side: "left" },
  s7p: { x: 438, y: 66, side: "above" },
  e4p: { x: 506, y: 104, side: "above" },

  // —— 上域右缘 / 膜带：β-氧化前置段 ——
  fa: { x: 992, y: 210, side: "left" },
  acylcarn: { x: 950, y: 270, side: "right" },

  // —— 下域：TCA 环（左侧）与 β-氧化环（右侧），乙酰-CoA 会合 ——
  acylcoa: { x: 950, y: 332, side: "right" },
  enoyl: { x: 850, y: 392, side: "left" },
  hydroxyacyl: { x: 950, y: 452, side: "left" },
  ketoacyl: { x: 850, y: 512, side: "right" },
  accoa: { x: 610, y: 340, side: "below" },
  oaa: { x: 510, y: 312, side: "right" },
  cit: { x: 370, y: 322, side: "left" },
  icit: { x: 250, y: 348, side: "left" },
  akg: { x: 180, y: 404, side: "left" },
  succoa: { x: 230, y: 470, side: "below" },
  suc: { x: 340, y: 500, side: "below" },
  fum: { x: 440, y: 470, side: "above" },
  mal: { x: 512, y: 410, side: "right" },
};

/** 少数连线的固定偏移：FBP 分流/回流的四条边、PPP 分叉与回流各给一条专属车道。 */
export const HOME_EDGE_OFFSETS: Record<string, number> = {
  "ppp:g3p->f6p": -30,
  // Ru5P→Xu5P 与 Ru5P→R5P 同源分叉：把差向异构那条压到线下方，避开通路标题。
  "ppp:ru5p->xu5p": 12,
  // 糖异生的 G3P→FBP 与糖酵解的 FBP→G3P 双向并行，再往下错一格避让酶名。
  "gluconeogenesis:g3p->fbp": 18,
  // TK 回流线压到主链下方，避让 FBP 分流的 Aldolase 标签。
  "ppp:e4p->f6p": 14,
};

export interface HomePathwayLabel {
  pathwayId: HomePathwayId;
  x: number;
  y: number;
  anchor: "start" | "middle" | "end";
  note: string;
}

export const HOME_PATHWAY_LABELS: HomePathwayLabel[] = [
  { pathwayId: "glycolysis", x: 36, y: 78, anchor: "start", note: "10 步 → 主链向右" },
  { pathwayId: "gluconeogenesis", x: 600, y: 102, anchor: "start", note: "11 步 ← 沿同一链逆向" },
  { pathwayId: "ppp", x: 180, y: 24, anchor: "start", note: "分流 · 回流" },
  { pathwayId: "tca", x: 28, y: 332, anchor: "start", note: "8 步闭环 · 乙酰-CoA 入口" },
  { pathwayId: "fatty-acid-oxidation", x: 700, y: 336, anchor: "start", note: "4 步 ×7 轮 · 在乙酰-CoA 会合" },
];
