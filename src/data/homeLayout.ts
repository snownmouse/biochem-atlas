import type { HomePathwayId } from "./homeMap";

/**
 * 上下两域 · 代谢脊柱（PLATE 00 第二版构图）。
 * 上域胞质（糖酵解主链向右 + 糖异生同链逆向 + PPP 自 G6P 分叉回流），
 * 中间三条膜线（外膜 / 膜间腔 / 内膜），下域线粒体基质（TCA 与 β-氧化在乙酰-CoA 会合）。
 * 画布宽 1020（原生坐标宽），CSS 宽度锁在 955–1020：1440 首屏恰好完整可见，
 * 更窄视口在容器内横向拖动；高度延伸到 744，给第 10–12 条通路留出纵向落位区。
 */
export const HOME_CANVAS = { width: 1020, height: 744 };

/**
 * Cori 循环在首页的表达：不新增第七个标题块，也不新增第七个通路节点。
 * 它在两条既有链路外侧加一条“细胞外血液带”：乳酸从右端 Lac 出肌、经血带向左回肝；
 * 肝在左端把葡萄糖释放回血带、向右送肌。回路是叠加层，点击进入 PLATE 07。
 * 血液带画在 y=-48..0 的负坐标区（在细胞外），因此不挤压六条既有通路的标题。
 */
export const HOME_CORI_LOOP = {
  band: { minY: -48, height: 48, tint: 0.05 },
  /** 葡萄糖：肝端 GLC 左缘 → 左竖管 → 血带上行 → 向右送肌 */
  glucosePath: "M 41 150 L 18 150 L 18 -30 L 1002 -30",
  /** 乳酸：肌端 Lac 右缘 → 右竖管 → 血带上行 → 向左回肝 */
  lactatePath: "M 893 196 L 1008 196 L 1008 -10 L 18 -10",
  glucoseLabel: { x: 510, y: -34, text: "葡萄糖 · 肝 → 肌", anchor: "middle" as const },
  lactateLabel: { x: 510, y: -13, text: "乳酸 · 肌 → 肝", anchor: "middle" as const },
  bandTitle: { x: 24, y: -38, text: "血液 · 细胞外 · CORI 循环 PLATE 07", anchor: "start" as const },
};

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

  // —— 膜带：氧化磷酸化的两条电子入口与 Q 池 ——
  nadh: { x: 176, y: 264, side: "left" },
  fadh2: { x: 300, y: 286, side: "left" },
  q: { x: 444, y: 266, side: "above" },

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

  // —— 下域：尿素循环与 TCA 的天冬氨酸—延胡索酸臂（PLATE 09） ——
  // 两个节点都放在 β-氧化硫解线（ketoacyl 850,512 → accoa 610,340，斜率 +0.717）的左上侧：
  // 该线上任意点 x = (y + 97.2) / 0.717，y=430 时为 738、y=462 时为 790，节点 594 / 686 全在左侧，
  // 因此 asp→AS→fum 的三条边都不会与硫解线相交（原先 676/376 与 756/448 分居两侧，必然交叉）。
  // 纵向夹在苹果酸标签（y≈414）与糖原代谢标题（y≈497）之间的空带，边线不压字。
  asp: { x: 594, y: 430, side: "above" },
  argininosuccinate: { x: 686, y: 462, side: "right" },
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
  { pathwayId: "glycolysis", x: 36, y: 74, anchor: "start", note: "10 步 → 主链向右" },
  { pathwayId: "gluconeogenesis", x: 600, y: 98, anchor: "start", note: "11 步 ← 沿同一链逆向" },
  { pathwayId: "ppp", x: 180, y: 22, anchor: "start", note: "分流 · 回流" },
  { pathwayId: "tca", x: 28, y: 330, anchor: "start", note: "8 步闭环 · 乙酰-CoA 入口" },
  { pathwayId: "fatty-acid-oxidation", x: 700, y: 326, anchor: "start", note: "4 步 ×7 轮 · 在乙酰-CoA 会合" },
  // 氧化磷酸化的语义就是膜本身：标题直接放进膜带，不再另挤一个域标题。
  // 266 是膜带内的安全位：note 落在 281，不压 276 的膜间腔中线。
  { pathwayId: "oxphos", x: 600, y: 266, anchor: "start", note: "膜内 · NADH / FADH₂ → Q" },
  // 脂肪酸从头合成：原镜像位（y=216）与 C16 节点、ALT / 乳酸标签同线相压；
  // 右缘 y=194/170 仍会被糖酵解支路文字碰到，最终放到右上角空白带（y=56），不压任何文字。
  { pathwayId: "fatty-acid-synthesis", x: 1016, y: 56, anchor: "end", note: "胞质 · 7 轮 × +2C · 与 β-氧化镜像" },
  // 尿素循环：下域（线粒体基质）左下空白带，note 明写延胡索酸 ↔ 天冬氨酸，和 TCA 的 fum 位置呼应。
  // 455 是「九条标题首屏」的收口位置：1440 展开时底边约 833，留出约 67px 首屏余量。
  { pathwayId: "urea-cycle", x: 28, y: 455, anchor: "start", note: "5 步 · 线粒体 → 胞质 · 延胡索酸 ↔ 天冬氨酸" },
  // 糖原代谢：第 10 条真实标题块。左侧 y=505 会与 TCA 右缘的 SUCL 标注相压（layout-audit 3.9×7px），
  // 因此放在右下空白带 x=560；y 从 505 上移到 497，把实测标题底边从 885.2 收到约 877，
  // 距 900 的首屏余量 ≥20px。第 11、12 空槽保持 y=650 / 698 不变。
  { pathwayId: "glycogen", x: 560, y: 497, anchor: "start", note: "9 步 · 分解 / 合成双臂 · 肝 vs 肌" },
  // 氨基酸代谢：第 11 条真实标题块，落在原第 11 空槽位置 y=650（用户已接受出屏，不压任何既有标题）。
  { pathwayId: "amino-acids", x: 28, y: 650, anchor: "start", note: "7 步 · 20 种 · 三分类 · 两闸 · 七去路" },
  // 胆固醇合成：第 12 条（全站最后一条），落在原第 12 空槽 y=698；用户已明确接受出屏。
  // 1980 画布宽 / 1020 原生坐标下，1440 视口首屏底边约 819，本条标题在屏外，靠页面纵向滚动可见。
  { pathwayId: "cholesterol", x: 28, y: 698, anchor: "start", note: "13 步 · 胞质 → 内质网 · 他汀靶点" },
];

/**
 * 第 11–12 条通路的纵向落位区（画布 y 552–744）。
 * 第 10 条糖原代谢已接入（标题 y=497，原占位槽移除）；
 * 第 11 条氨基酸代谢已接入（标题 y=650，原第 11 空槽移除）；
 * 第 12 条胆固醇合成已接入（标题 y=698，第 12 空槽移除），本表已清空。
 */
export interface HomeReservedSlot {
  no: number;
  y: number;
  name?: string;
  en?: string;
  note: string;
}

export const HOME_RESERVED_HEAD = {
  x: 28,
  y: 572,
  text: "PLATE 12 已接入 · 12 / 12 · 无预留槽",
};

export const HOME_RESERVED_SLOTS: HomeReservedSlot[] = [];
