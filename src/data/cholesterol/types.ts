// 胆固醇合成 / 甲羟戊酸通路（PLATE 12 / 12，结构对照 SF-12）数据层类型。
// 三条阶段：胞质甲羟戊酸上游 → 内质网甾醇环化 → 去甲基化 / 还原修饰簇。
// 热力学一律 null + 定性 + Lehninger 8e；不写任何未核验的 ΔG 数字。

export type CholesterolEntityKind = "metabolite" | "enzyme" | "signal" | "drug";

export interface CholesterolEntity {
  id: string;
  name: string;
  abbr: string;
  kind: CholesterolEntityKind;
  /** 仅代谢物填写；完整 CoA 按项目电离口径写分子式 */
  formula?: string;
  /** pH 7.4 净电荷；仅代谢物填写 */
  charge?: number;
  /** 电离态推导依据（pKa 口径 / 只计哪些基团） */
  chargeBasis?: string;
  /** 可电离基团清单，供校验器核对 */
  ionizableGroups?: string[];
  note?: string;
}

export interface SharedWith {
  pathwayId: string;
  stepId: string;
  entityId: string;
  note?: string;
}

export interface CholesterolReaction {
  substrates: string[];
  products: string[];
  /** 不入画的辅因子 / 辅底物（ATP、NADPH、O₂ 等），只作文字说明 */
  cofactors: string[];
  equation: string;
}

export interface CholesterolDeltaG {
  value: null;
  qualitative: string;
  source: string;
}

/** 下游去甲基化 / 还原修饰簇里的单个酶步（压缩表达但仍写清 EC） */
export interface ClusterEnzyme {
  name: string;
  abbr: string;
  ec: string;
  action: string;
}

export interface CholesterolStep {
  id: string;
  index: number;
  name: string;
  /** 挂图上的短名，避免 SVG 标签压字 */
  short: string;
  phase: "upstream" | "midstream" | "downstream";
  /** 区室：胞质或内质网 */
  compartment: "cytosol" | "er";
  reaction: CholesterolReaction;
  enzyme: {
    entityId: string;
    name: string;
    abbr: string;
    ec: string;
    note?: string;
  };
  /** 体内方向：forward=单向；reversible=可逆 */
  direction: "forward" | "reversible";
  deltaG: CholesterolDeltaG;
  physiology: string;
  /** 临床 / 药物教学点（可选） */
  clinical?: string;
  /** 下游修饰簇：压缩成一步，但逐个写清酶与 EC */
  cluster?: {
    enzymes: ClusterEnzyme[];
    note: string;
  };
  sharedWith: SharedWith[];
  /** 只登记已向 RCSB 实时核验的条目 */
  pdbCandidates?: string[];
}

export interface CholesterolRegulation {
  id: string;
  kind: "drug" | "feedback" | "transcriptional";
  title: string;
  text: string;
  targets: string[];
  source: string;
}

export interface CholesterolInterface {
  id: string;
  entityId: string;
  title: string;
  note: string;
  /** connected=有真实步骤可跳；unbuilt=本平台未建，页面必须显示“未接入 / 数据待建” */
  status: "connected" | "unbuilt";
  sharedWith: SharedWith[];
}

export interface EnergyEntry {
  id: string;
  label: string;
  /** 化学计量值；null=不做单一总数（口径见 note） */
  value: number | null;
  unit: string;
  note: string;
}

export interface CholesterolEnergyLedger {
  title: string;
  basis: string;
  unit: string;
  perMevalonate: {
    /** MVK + PMVK + MVD 三步各 1 ATP */
    atp: number;
    /** HMGCR 每分子 HMG-CoA 消耗 2 NADPH */
    nadphHmgcr: number;
  };
  referenceRun: {
    /** 生成 1 分子胆固醇需要 6 个甲羟戊酸（C6 × 6 = C30 → C27 + 3 CO₂） */
    mevalonateUnits: number;
    atpCost: number;
    nadphBeforeCluster: number;
    note: string;
  };
  entries: EnergyEntry[];
}

export interface CholesterolConservation {
  carbon: {
    acetylCoaUnits: number;
    acetylCoaCarbons: number;
    cholesterolCarbons: number;
    co2Carbons: number;
    note: string;
  };
  phosphate: {
    atpInput: number;
    adpOutput: number;
    piOutput: number;
    note: string;
  };
  isoprene: {
    ippUnits: number;
    squaleneCarbons: number;
    fppUnitsPerSqualene: number;
    note: string;
  };
  redox: {
    nadphBeforeCluster: number;
    note: string;
  };
}

export interface PdbCandidate {
  pdbId: string;
  enzyme: string;
  entityId: string;
  role: "substrate-state" | "product-state" | "inhibitor-complex" | "allosteric" | "apo" | "architecture";
  organism: string;
  expressionSystem?: string;
  mutations?: string;
  method: string;
  resolution: number;
  chains: string;
  ligands: string[];
  ligandCodes: string[];
  entryTitle: string;
  note: string;
  verifiedOn: string;
}

export interface ThreeDRecord {
  status: "pending";
  note: string;
  verifiedOn: string;
  candidates: PdbCandidate[];
  assets: {
    moleculeAssets: string[];
    missingAssets: string[];
    note: string;
  };
}

export interface CholesterolData {
  id: string;
  name: string;
  en: string;
  plateNo: string;
  summary: string;
  compartmentsNote: string;
  entities: CholesterolEntity[];
  steps: CholesterolStep[];
  regulation: CholesterolRegulation[];
  interfaces: CholesterolInterface[];
  energyLedger: CholesterolEnergyLedger;
  conservation: CholesterolConservation;
  threeD: ThreeDRecord;
  notes: string[];
}

export interface SkeletonCompartment {
  id: string;
  name: string;
  en: string;
  x0: number;
  x1: number;
  y0: number;
  y1: number;
  note: string;
}

export interface SkeletonNode {
  id: string;
  entityId: string;
  x: number;
  y: number;
  /** 代谢物圆半径；机器 / 投影 / 药物用矩形 */
  r?: number;
  w?: number;
  h?: number;
  kind: "metabolite" | "enzyme" | "signal" | "projection" | "drug";
  label: string;
  sub?: string;
}

export interface SkeletonLink {
  id: string;
  from: string;
  to: string;
  stepId?: string;
  /** main=主链；side=支路；control=调控线；interface=接口投影；cycle-return=回路 */
  type: "main" | "side" | "control" | "interface" | "cycle-return";
  path: string;
  label?: string;
  labelX?: number;
  labelY?: number;
  labelAnchor?: "start" | "middle" | "end";
}

export interface CholesterolSkeleton {
  canvas: { width: number; height: number };
  compartments: SkeletonCompartment[];
  nodes: SkeletonNode[];
  links: SkeletonLink[];
  annotations: {
    id: string;
    x: number;
    y: number;
    text: string;
    anchor: "start" | "middle" | "end";
    size: number;
    weight?: number;
  }[];
}
