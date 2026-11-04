// 糖异生本地类型（数据层切片专用）。
// 刻意不改 src/data/types.ts：糖异生数据层尚未接页面，字段集（compartment、
// contrastWithGlycolysis、mirrorMap 等）是通路专用扩展，等页面接入时再决定是否上提。
// JSON 为数据源（resolveJsonModule 读入后与本类型对齐），此处类型供后续消费方使用。

export type CompartmentId =
  | "mito-matrix"
  | "mito-inner-membrane"
  | "cytosol"
  | "er-lumen";

export interface Entity {
  id: string;
  name: string;
  abbr: string;
  kind: "metabolite" | "enzyme";
}

export interface DeltaG {
  standard: number | null;
  physiological: number | null;
  unit: "kJ/mol";
  /** outline §3 纪律：详表数值未核实到唯一数字时，只记定性结论 */
  qualitative?: string;
  source: string;
  note?: string;
}

/** PDB 候选：一律来自 outline 已核验表，仅登记，不含资产路径 */
export interface PdbCandidate {
  pdbId: string;
  role:
    | "substrate-state"
    | "capture-state"
    | "gtp-analog-bound"
    | "control-only"
    | "allosteric"
    | "inhibitor-bound"
    | "apo";
  organism: string;
  method: "X-ray" | "cryo-EM";
  resolution: number;
  ligands: string[];
  note: string;
}

export interface ThreeDPlaceholder {
  status: "pending";
  note: string;
  pdbCandidates?: PdbCandidate[];
}

export interface ContrastWithGlycolysis {
  swap: boolean;
  versus: string;
  enzyme: string;
  energyCost: string;
  regulation: string;
}

export interface OrganDiff {
  organ: string;
  text: string;
}

export interface GnStep {
  id: string;
  index: number | null;
  name: string;
  /** 主泳道（渲染时的高亮锚点） */
  compartment: CompartmentId;
  /** 反应牵涉的全部泳道（校验节点归属用） */
  compartments: CompartmentId[];
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
  /** 指向糖酵解步骤 id（gn-x → gk-y）；入口支路可为 null */
  mirrorOf: string | null;
  /** 四个关键酶（PC/PEPCK/FBPase-1/G6Pase）与糖酵解对应步的结构化差异 */
  contrastWithGlycolysis?: ContrastWithGlycolysis;
  threeD: ThreeDPlaceholder | null;
}

export interface MirrorPair {
  glycolysisStepId: string;
  gluconeogenesisStepIds: string[];
  relation: "same-enzyme-reversed" | "enzyme-swap" | "double-enzyme-detour";
  relationLabel: string;
  energyCostDiff: string;
  regulationDiff: string;
}

export interface MirrorMap {
  title: string;
  note: string;
  pairs: MirrorPair[];
  totals: {
    glycolysisNetAtp: number;
    gluconeogenesisCost: string;
    nadhRequired: number;
    irreversiblePoints: number;
    bypassReactions: number;
    asymmetryNote: string;
  };
}

export interface LedgerEntry {
  stepId: string;
  item: "ATP" | "GTP" | "NADH";
  count: number;
  trace: string;
}

export interface EnergyLedger {
  title: string;
  currency: string;
  entries: LedgerEntry[];
  totals: string;
  asymmetryNote: string;
  pepDebtNote: string;
  netEquation: string;
  deltaGDiscipline: string;
}

export interface GluconeogenesisData {
  id: "gluconeogenesis";
  name: string;
  summary: string;
  organs: { id: string; name: string }[];
  entities: Entity[];
  steps: GnStep[];
  sideBranchSteps: GnStep[];
  mirrorMap: MirrorMap;
  energyLedger: EnergyLedger;
  threeD: { status: "pending"; note: string; verifiedPdbIds: string[] };
}

// ---------- 骨架（器官无关几何） ----------

export interface Band {
  y0: number;
  y1: number;
  /** 泳道只占右段时的横向范围（如 er-lumen） */
  x0?: number;
  x1?: number;
}

export interface CompartmentLane {
  id: CompartmentId;
  name: string;
  band: Band;
  note: string;
}

export interface SkeletonNode {
  id: string;
  order: number | null;
  x: number;
  y: number;
  compartment: CompartmentId;
  kind: "metabolite" | "enzyme";
  label: string;
  /** 与实体表对齐：oaa/pyr 在两个泳道各有一个节点 */
  entityId?: string;
  note?: string;
}

export type LinkType = "main" | "shuttle" | "branch-join" | "branch-entry";

export interface SkeletonLink {
  from: string;
  to: string;
  /** 反应步 / 转运步 / 入口支路步的 id；底物循环支路引用糖酵解步 */
  stepId?: string;
  type: LinkType;
  label?: string;
}

export interface TransportStep {
  id: string;
  name: string;
  from: string;
  /** 中途跨膜节点（苹果酸）；MPC 无中途节点 */
  via: string | null;
  to: string;
  note: string;
}

export interface SideBranch {
  id: string;
  name: string;
  collapsedByDefault: boolean;
  from: string;
  to: string;
  stepId?: string;
  nodeIds: string[];
  note?: string;
}

export interface GluconeogenesisSkeleton {
  pathwayId: "gluconeogenesis";
  canvas: { width: number; height: number };
  spatialNote: string;
  compartments: CompartmentLane[];
  nodes: SkeletonNode[];
  links: SkeletonLink[];
  transportSteps: TransportStep[];
  sideBranches: SideBranch[];
}
