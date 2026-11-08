// ============================================================
// chain/types.ts —— 本轮新增 6 张挂图（PLATE 13–18）共用的数据结构
//
// 口径：
//   · 只描述“一步一底物/产物 + 酶 + 区室”，不引入新的渲染语义；
//   · 六张图全部 2D：threeD.status 固定为 "not-built"，只在详情栏写一句口径说明，
//     不登记 PDB 候选、不出现“待结构核验”占位；
//   · 字段缺失用空数组/空字符串表示，不写推测值。
// ============================================================

export interface ChainEntity {
  id: string;
  name: string;
  abbr?: string;
  formula?: string;
  /** metabolite=小分子代谢物；cofactor=辅因子/离去基团；enzyme=酶实体；hub=与既有通路的接口节点 */
  kind: "metabolite" | "cofactor" | "enzyme" | "hub";
  note?: string;
}

export interface ChainStepEnzyme {
  entityId?: string;
  name: string;
  isozyme?: string;
  /** 教材可核的 EC 号；查不到就留空，不写推测值 */
  ec?: string;
}

export interface ChainStepDeltaG {
  standard: null;
  physiological: null;
  unit: string;
  qualitative: string;
  source: string;
  note?: string;
}

export interface ChainStep {
  id: string;
  index: number;
  name: string;
  shortName: string;
  compartment: string;
  equation: string;
  substrates: string[];
  products: string[];
  cofactors: string[];
  enzyme: ChainStepEnzyme;
  irreversible: boolean;
  deltaG: ChainStepDeltaG;
  significance: string;
  note?: string;
  misconceptions: string[];
  clinical: string[];
}

export interface ChainTransport {
  id: string;
  name: string;
  from: string;
  to: string;
  via: string;
  note: string;
}

export interface ChainLabelPos {
  dx: number;
  dy: number;
  anchor: "start" | "middle" | "end";
}

export interface ChainNode {
  id: string;
  entityId: string;
  label: string;
  abbr?: string;
  x: number;
  y: number;
  kind: "metabolite" | "machine" | "hub" | "projection";
  compartment: string;
  /** 节点点击映射到的步骤 id；缺省时由 renderer 从 incident link 推导 */
  stepId?: string;
  labelPos?: ChainLabelPos;
}

export type ChainLinkType = "main" | "side" | "feed" | "recycle" | "transport" | "branch";

export interface ChainLink {
  from: string;
  to: string;
  stepId?: string;
  type: ChainLinkType;
  label?: string;
  /** 二次曲线弯曲方向（0 = 直线） */
  bend?: number;
}

export interface ChainCompartment {
  id: string;
  label: string;
  en: string;
  x: number;
  y: number;
  width: number;
  height: number;
  /** 底色浓度（0–0.08） */
  tint: number;
}

export interface ChainAnnotation {
  x: number;
  y: number;
  text: string;
  anchor?: "start" | "middle" | "end";
  size?: number;
  tone?: "ink" | "teal" | "brick" | "amber";
}

export interface ChainSkeleton {
  canvas: { width: number; height: number };
  compartments: ChainCompartment[];
  nodes: ChainNode[];
  links: ChainLink[];
  /** 显式路径（跨膜/跨带的竖线或回流带），键为 "from->to" */
  specialPaths?: Record<string, string>;
  transportSteps?: ChainTransport[];
  annotations?: ChainAnnotation[];
}

export interface ChainLegendItem {
  text: string;
  /** 线型示意：main / dashed / dotted / badge / color */
  kind: "main" | "dashed" | "dotted" | "badge" | "color";
  tone?: "ink" | "teal" | "brick" | "amber";
}

export interface ChainReadingGuide {
  label: string;
  summary: string;
  paragraphs: string[];
}

export interface ChainInterfaceRef {
  /** 指向既有通路的真实 step id；未建接口不要写 */
  stepId: string;
  label: string;
  note: string;
}

export interface ChainData {
  id: string;
  name: string;
  enName: string;
  plateNo: string;
  structureNo: string;
  summary: string;
  /** 主标题下方的一行副题 */
  heroNote: string;
  legend: ChainLegendItem[];
  readingGuide: ChainReadingGuide;
  posterFoot: string[];
  entities: ChainEntity[];
  steps: ChainStep[];
  transportSteps?: ChainTransport[];
  interfaces?: ChainInterfaceRef[];
  threeD: { status: "not-built"; note: string };
}
