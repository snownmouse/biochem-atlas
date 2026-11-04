// 戊糖磷酸通路（PPP）本地类型（数据层切片专用）。
// 刻意不改 src/data/types.ts（并行会话正在改它）：PPP 引入的三块通路专用扩展
// —— ①共实体接口（sharedWith，全平台首次两条通路共享同一代谢实体）、
// ②基团转移的结构化碳数（groupTransfer.carbonsTransferred）、
// ③分支情境（modes）——页面接入时再决定是否上提。
// JSON 为数据源，此处类型供后续消费方使用。

export type PhaseId = "oxidative" | "non-oxidative";

export interface Entity {
  id: string;
  name: string;
  abbr: string;
  kind: "metabolite" | "enzyme";
  /** 代谢物碳骨架碳数（CO₂=1，辅因子不标）；校验器算术验伪的唯一入口 */
  carbons?: number;
  /** 跨通路实体注记：与 glycolysis 同 id 的实体必须在此声明对齐关系 */
  crossPathwayNote?: string;
}

export interface DeltaG {
  standard: number | null;
  physiological: number | null;
  unit: "kJ/mol";
  /** 档案纪律：Lehninger Ch.14 未列 PPP 逐步 ΔG°′ 表，未核实到唯一数值只记定性结论，不编数 */
  qualitative?: string;
  source: string;
  note?: string;
}

/** PDB 候选：一律来自 research/ppp/outline.md 已核验表（RCSB API 2026-11-03），仅登记，不含资产路径 */
export interface PdbCandidate {
  pdbId: string;
  organism: string;
  method: "X-ray" | "cryo-EM" | "NMR";
  resolution: number | null;
  ligands: string[];
  note: string;
}

export interface ThreeDPlaceholder {
  status: "pending";
  note: string;
  pdbCandidates?: PdbCandidate[];
}

export interface OrganDiff {
  organ: string;
  text: string;
}

/**
 * 基团转移的结构化碳数：转酮醇酶搬二碳（羟乙酰基）、转醛醇酶搬三碳（二羟丙酮基）。
 * donor − carbonsTransferred = donorRemainder（ donor 的残链产物）
 * acceptor + carbonsTransferred = acceptorProduct
 * 校验器按实体碳数逐条验算，写错碳数直接报错。
 */
export interface GroupTransfer {
  enzyme: "transketolase" | "transaldolase";
  /** 被搬运基团的碳数：TK=2、TA=3 */
  carbonsTransferred: 2 | 3;
  /** 基团化学名：羟乙酰基（二碳）/ 二羟丙酮基（三碳） */
  group: string;
  /** 供体代谢物实体 id（丢基团的一方） */
  donor: string;
  /** 受体代谢物实体 id（得基团的一方） */
  acceptor: string;
  /** 供体残链产物实体 id（donor − nC） */
  donorRemainder: string;
  /** 受体加成产物实体 id（acceptor + nC） */
  acceptorProduct: string;
  mechanism: string;
}

/**
 * 每步碳账：声明值必须与实体碳数算出的值一致（校验器比对）。
 * netDelta = productCarbons − substrateCarbons，质量守恒下恒为 0；
 * 『丢碳』只发生在主链口径：mainChainProductCarbons（productCarbons 扣除 branch-exit 实体如 CO₂）。
 * 氧化相递减 = 主链 C6→C6→C6→C5，脱羧步差额以 CO₂（1C）逸出。
 */
export interface CarbonBookkeeping {
  substrateCarbons: number;
  productCarbons: number;
  mainChainProductCarbons: number;
  netDelta: number;
  note?: string;
}

export interface PppStep {
  id: string;
  phase: PhaseId;
  /** 相内序号；用于排序与上下步导航 */
  index: number;
  name: string;
  substrates: string[];
  products: string[];
  enzyme: { entityId: string; name: string; isozyme?: string };
  cofactors: string[];
  irreversible: boolean;
  significance: string;
  equation: string;
  organDiffs: OrganDiff[];
  bindingProfile: null;
  ecNumber?: string;
  deltaG: DeltaG;
  stereochemistry: string[];
  misconceptions: string[];
  clinical: string[];
  carbonBookkeeping: CarbonBookkeeping;
  /** TK/TA 两步必填；其余步为 null */
  groupTransfer: GroupTransfer | null;
  threeD: ThreeDPlaceholder | null;
}

// ---------- 非氧化相碳守恒（相级声明） ----------

/**
 * 非氧化相净账（TK/TA 接力的总账）：
 * 3 × Ru5P（C5）→ 2 × F6P（C6）+ 1 × GAP（C3），15C = 15C。
 * 氧化相净账：1 × G6P（C6）→ 1 × Ru5P（C5）+ 1 × CO₂（C1）。
 * 两相串起来即"每 3 个 G6P → 2 个 F6P + 1 个 GAP + 3 CO₂ + 6 NADPH"。
 */
export interface PhaseBalance {
  input: Record<string, number>;
  output: Record<string, number>;
  note: string;
}

// ---------- 分支情境（modes） ----------

export interface ModeFlowSegment {
  /** 涉及的段：oxidative / 非氧化相各步 id / 糖酵解接口 */
  segment: string;
  direction: "forward" | "reverse" | "pull-from-glycolysis" | "push-to-glycolysis" | "idle";
  /** 该段在此情境下跑几轮（净账口径） */
  multiplicity: number;
  note: string;
}

export interface PppMode {
  id: string;
  name: string;
  /** 什么生理条件触发此情境（定性） */
  trigger: string;
  flowSegments: ModeFlowSegment[];
  netEquation: string;
  yield: Record<string, number | string>;
  keyPoint: string;
}

// ---------- 与糖酵解的共实体接口（全平台首次） ----------

/** 指向另一条通路某个步骤里某个实体的引用；渲染器据此合并节点、避免双线 */
export interface SharedEntityRef {
  pathway: "glycolysis";
  /** 目标通路步骤 id（gk-2 / gk-3 / gk-5） */
  stepId: string;
  /** 目标通路实体 id（g6p / f6p / g3p；注意 GAP 在糖酵解的 id 是 g3p） */
  entity: string;
}

export interface GlycolysisInterfaceLink {
  id: string;
  /** 接口涉及的 PPP 本地实体 id（与 sharedWith.entity 同一化学物种，跨通路 id 刻意取齐） */
  entity: string;
  /** 糖酵解侧：哪一步的哪个实体（校验器读 glycolysis.json 验真） */
  sharedWith: SharedEntityRef;
  /** 方向：PPP 消费糖酵解中间体（entry）或回流糖酵解（return） */
  direction: "entry" | "return";
  label: string;
  /** 骨架几何位置提示：入口在左、回流在右 */
  geometry: "left" | "right";
  note: string;
}

export interface GlycolysisInterfaces {
  note: string;
  /** 给共享渲染器的契约：同实体怎么画、防重叠规则写在这里 */
  rendererContract: string;
  entryLinks: GlycolysisInterfaceLink[];
  returnLinks: GlycolysisInterfaceLink[];
}

// ---------- 数据根 ----------

export interface PppData {
  id: "pentose-phosphate";
  pathwayId: "pentose-phosphate";
  name: string;
  summary: string;
  phases: { id: PhaseId; name: string; reversible: boolean; stepIds: string[]; note: string }[];
  entities: Entity[];
  steps: PppStep[];
  oxidativeBalance: PhaseBalance;
  nonOxidativeBalance: PhaseBalance;
  modes: PppMode[];
  glycolysisInterfaces: GlycolysisInterfaces;
  threeD: { status: "pending"; note: string; verifiedPdbIds: string[] };
}

// ---------- 骨架（单泳道几何） ----------

export interface Band {
  y0: number;
  y1: number;
  x0?: number;
  x1?: number;
}

export interface CompartmentLane {
  id: "cytosol";
  name: string;
  band: Band;
  note: string;
}

export interface SkeletonNode {
  id: string;
  order: number | null;
  x: number;
  y: number;
  compartment: "cytosol";
  kind: "metabolite" | "enzyme" | "interface";
  label: string;
  entityId?: string;
  note?: string;
}

export type LinkType =
  /** 主链（氧化相线性链 + 非氧化相重组接力） */
  | "main"
  /** CO₂ 逸出（低权重） */
  | "branch-exit"
  /** 从糖酵解分流进来（接口箭头，几何在左） */
  | "entry-from-glycolysis"
  /** 回流糖酵解（接口箭头，几何在右） */
  | "return-to-glycolysis";

export interface SkeletonLink {
  from: string;
  to: string;
  stepId?: string;
  type: LinkType;
  label?: string;
  /** 接口箭头必填，指向 glycolysisInterfaces 里的 link id */
  interfaceId?: string;
}

export interface PppSkeleton {
  pathwayId: "pentose-phosphate";
  canvas: { width: number; height: number };
  spatialNote: string;
  compartments: CompartmentLane[];
  nodes: SkeletonNode[];
  links: SkeletonLink[];
}
