import type { HomePathwayId } from "./homeMap";

export const HOME_CANVAS = { width: 2480, height: 1120 };

export interface HomeBand {
  id: string;
  label: string;
  en: string;
  top: number;
  bottom: number;
  tint: number;
}

/** 区室带：从上到下，线粒体基质 → 内膜 → 膜间腔/外膜 → 胞质 → ER 腔。 */
export const HOME_BANDS: HomeBand[] = [
  { id: "matrix", label: "线粒体基质", en: "MITOCHONDRIAL MATRIX", top: 60, bottom: 400, tint: 0.03 },
  { id: "inner-membrane", label: "线粒体内膜", en: "INNER MEMBRANE", top: 400, bottom: 440, tint: 0.07 },
  { id: "intermembrane", label: "膜间腔 / 外膜", en: "INTERMEMBRANE SPACE / OUTER MEMBRANE", top: 440, bottom: 520, tint: 0.025 },
  { id: "cytosol", label: "细胞质", en: "CYTOSOL", top: 520, bottom: 990, tint: 0 },
  { id: "er-lumen", label: "内质网腔", en: "ER LUMEN", top: 990, bottom: 1100, tint: 0.045 },
];

export type LabelSide = "above" | "below" | "left" | "right";

export interface HomePos {
  x: number;
  y: number;
  side?: LabelSide;
}

export const HOME_POS: Record<string, HomePos> = {
  glc: { x: 150, y: 1005, side: "below" },
  g6p: { x: 330, y: 830, side: "below" },
  f6p: { x: 560, y: 830, side: "below" },
  fbp: { x: 790, y: 830, side: "below" },
  dhap: { x: 1040, y: 960, side: "below" },
  g3p: { x: 1060, y: 830, side: "below" },
  "13bpg": { x: 1250, y: 830, side: "below" },
  "3pg": { x: 1430, y: 830, side: "below" },
  "2pg": { x: 1610, y: 830, side: "below" },
  pep: { x: 1790, y: 830, side: "below" },
  pyr: { x: 1980, y: 830, side: "below" },
  lac: { x: 1770, y: 950, side: "right" },
  ala: { x: 1880, y: 978, side: "right" },

  accoa: { x: 1900, y: 300, side: "right" },
  oaa: { x: 1640, y: 250, side: "left" },
  cit: { x: 1810, y: 120, side: "above" },
  icit: { x: 1610, y: 80, side: "right" },
  akg: { x: 1430, y: 140, side: "above" },
  succoa: { x: 1340, y: 260, side: "left" },
  suc: { x: 1450, y: 360, side: "below" },
  fum: { x: 1630, y: 380, side: "above" },
  mal: { x: 1790, y: 340, side: "right" },

  "6pgl": { x: 400, y: 700, side: "left" },
  "6pg": { x: 510, y: 660, side: "left" },
  ru5p: { x: 640, y: 690, side: "right" },
  r5p: { x: 620, y: 590, side: "left" },
  xu5p: { x: 720, y: 750, side: "right" },
  s7p: { x: 830, y: 650, side: "above" },
  e4p: { x: 930, y: 720, side: "right" },

  fa: { x: 2280, y: 900, side: "right" },
  acylcoa: { x: 2180, y: 340, side: "left" },
  acylcarn: { x: 2230, y: 470, side: "right" },
  enoyl: { x: 2370, y: 300, side: "left" },
  hydroxyacyl: { x: 2430, y: 180, side: "left" },
  ketoacyl: { x: 2290, y: 90, side: "above" },
};

export interface HomePathwayLabel {
  pathwayId: HomePathwayId;
  x: number;
  y: number;
  anchor: "start" | "middle" | "end";
  note: string;
}
/* 坐标仅供版面定位；所有连线与共用关系来自 homeMap.ts 的数据推导。 */
export const HOME_PATHWAY_LABELS: HomePathwayLabel[] = [
  { pathwayId: "glycolysis", x: 250, y: 782, anchor: "start", note: "10 步 →" },
  { pathwayId: "gluconeogenesis", x: 1950, y: 762, anchor: "end", note: "← 11 步" },
  { pathwayId: "ppp", x: 372, y: 566, anchor: "start", note: "氧化相 → 非氧化相" },
  { pathwayId: "tca", x: 1228, y: 58, anchor: "start", note: "8 步闭环" },
  { pathwayId: "fatty-acid-oxidation", x: 2058, y: 50, anchor: "start", note: "4 步 ×7 轮" },
];
