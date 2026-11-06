// 氧化磷酸化本地类型（数据层切片专用）。
// 与既有线性通路不同：本通路以「模块」为单位（复合体 / 载体 / 池 / 合酶），
// 质子不是分子实体，单独走 protonFlux；模块与 TCA 的共享酶通过 sharedWith 显式引用。
// 刻意不改 src/data/types.ts：膜带几何、模块语义、质子账都是本通路私有扩展。

export type ModuleKind = "complex" | "pool" | "carrier" | "synthase";
export type MembraneSide = "matrix" | "intermembrane" | "span" | "soluble";

export interface Entity {
  id: string;
  name: string;
  abbr: string;
  kind: "metabolite" | "enzyme";
}

/** ΔG 未核实到唯一数值时只记定性结论；不编数。 */
export interface DeltaG {
  standard: number | null;
  physiological: number | null;
  unit: "kJ/mol";
  qualitative?: string;
  source: string;
  note?: string;
}

export interface PdbCandidate {
  pdbId: string;
  organism: string;
  method: "X-ray" | "cryo-EM" | "NMR";
  resolution: number | null;
  atomCount: number | null;
  ligands: string[];
  note: string;
}

export type ThreeD =
  | {
      status: "soluble-panel";
      asset: "cytc" | "f1";
      panelTitle: string;
      note: string;
    }
  | {
      status: "not-built";
      reason: string;
      atomScale: string;
      note: string;
    };

export interface SharedWith {
  pathwayId: "tca";
  stepId: string;
  entityId: string;
  note: string;
}

export interface OxphosModule {
  id: string;
  order: number;
  name: string;
  en: string;
  kind: ModuleKind;
  location: MembraneSide;
  /** 亚基数；Q 池 / cyt c 为 null 或 1 */
  subunits: number | null;
  /** 近似分子量（kDa）；未核实的给 null */
  massKda: number | null;
  equation: string;
  substrates: string[];
  products: string[];
  cofactors: string[];
  electronIn: string;
  electronOut: string;
  electrons: number;
  /** 每 2 e⁻（即每个 NADH 分支）泵出的质子数；不泵质子的模块为 0 */
  protonsPumpedPer2e: number | null;
  /** 每 2 e⁻ 在基质侧消耗（进入水）的质子数 */
  protonsConsumedPer2e: number | null;
  protonChemistry: string;
  poContribution: string;
  significance: string;
  detail: string;
  deltaG: DeltaG;
  threeD: ThreeD;
  pdbCandidates: PdbCandidate[];
  sharedWith?: SharedWith;
  /** 证据推导字段（复用 evidenceGrade 的判定口径，不手写等级） */
  evidence: {
    coordSource: "experimental" | "none";
    pocketRole?: "own" | "other";
    species?: "human" | "nonhuman";
    basis: string;
  };
  misconceptions: string[];
  clinical: string[];
}

export interface ProtonFluxEntry {
  id: string;
  /** nadh / fadh2 分支，或公共回流 / 化学消耗 */
  branch: "nadh" | "fadh2" | "common";
  from: "matrix" | "intermembrane";
  to: "matrix" | "intermembrane";
  label: string;
  kind: "pump" | "return" | "consumed";
  perNadh: number | null;
  perFadh2: number | null;
  /** 仅回流项使用：每合成 1 ATP 消耗的质子数 */
  perAtp?: number;
  note: string;
}

export interface PoBasis {
  nadh: number;
  fadh2: number;
  protonsPerAtp: number;
  protonsPerNadh: number;
  protonsPerFadh2: number;
  /** 原始除法结果，只用于说明「工程取整」，不参与加和 */
  nadhRaw: number;
  fadh2Raw: number;
  source: string;
  note: string;
  legacy: {
    nadh: number;
    fadh2: number;
    note: string;
  };
}

export interface Chemiosmosis {
  title: string;
  deltaPsi: string;
  deltaPh: string;
  text: string;
  uncouplers: { name: string; note: string }[];
}

export interface OxphosStep {
  id: string;
  index: number;
  name: string;
  substrates: string[];
  products: string[];
  enzyme: { entityId: string; name: string; isozyme?: string };
  cofactors: string[];
  irreversible: boolean;
  /** 电子入口模块的出处与 ΔG 口径；无核验数值时 standard/physiological 保持 null */
  deltaG?: {
    standard: number | null;
    physiological: number | null;
    unit: string;
    qualitative?: string;
    source?: string;
    note?: string;
  };
  source?: string;
}

export interface OxphosData {
  id: "oxphos";
  name: string;
  summary: string;
  plateNo: string;
  structurePlateNo: string;
  entities: Entity[];
  modules: OxphosModule[];
  /** 仅首页总图使用的最小步骤摘要（不进页面挂图；页面按 modules 渲染） */
  steps: OxphosStep[];
  protonFlux: ProtonFluxEntry[];
  poBasis: PoBasis;
  chemiosmosis: Chemiosmosis;
  threeD: {
    status: "soluble-only";
    note: string;
    solubleAssets: string[];
  };
}

// ---------- 骨架（膜带几何） ----------

export type CompartmentId = "intermembrane" | "inner-membrane" | "matrix";

export interface Band {
  y0: number;
  y1: number;
}

export interface CompartmentLane {
  id: CompartmentId;
  name: string;
  en: string;
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
  entityId?: string;
  note?: string;
}

export type LinkType = "main" | "input" | "carrier";

export interface SkeletonLink {
  from: string;
  to: string;
  stepId?: string;
  type: LinkType;
  label?: string;
}

export interface OxphosSkeleton {
  pathwayId: "oxphos";
  canvas: { width: number; height: number };
  spatialNote: string;
  compartments: CompartmentLane[];
  nodes: SkeletonNode[];
  links: SkeletonLink[];
}
