// 脂肪酸 β-氧化本地类型（数据层切片专用）。
// 刻意不改 src/data/types.ts（并行会话正在改它）：FAO 的四泳道体系
// （胞质 / 线粒体外膜 / 线粒体内膜 / 基质）与循环几何（cycle-return / cycle-exit
// 两种链接类型、StepKind 三分法）是通路专用扩展，页面接入时再决定是否上提。
// JSON 为数据源，此处类型供后续消费方使用。

export type CompartmentId =
  | "cytosol"
  | "mito-outer-membrane"
  | "mito-inner-membrane"
  | "mito-matrix";

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
  /** 档案纪律：未核实到唯一数值时只记定性结论，不编数 */
  qualitative?: string;
  source: string;
  note?: string;
}

/** PDB 候选：一律来自 research/fatty-acid-oxidation/outline.md 已核验表，仅登记，不含资产路径 */
export interface PdbCandidate {
  pdbId: string;
  role:
    | "substrate-state"
    | "apo"
    | "capture-state"
    | "channel-state"
    | "control-only"
    | "isoform-control";
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

export type StepKind =
  /** 前置化学步（活化） */
  | "prep"
  /** 跨膜转运步（肉碱穿梭） */
  | "transport"
  /** 四步循环内的步 */
  | "cycle";

export interface FaoStep {
  id: string;
  kind: StepKind;
  /** 循环步 1–4；前置步（活化/穿梭）为 null */
  index: number | null;
  name: string;
  /** 主泳道（渲染高亮锚点） */
  compartment: CompartmentId;
  /** 反应/转运牵涉的全部泳道 */
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
  /** kind==="cycle" 时：每轮净产出（账本口径 1 FADH₂ + 1 NADH + 1 乙酰-CoA；末轮双乙酰由账本 note 承接） */
  perRoundYield?: { fadh2: number; nadh: number; acetylCoA: number };
  threeD: ThreeDPlaceholder | null;
}

// ---------- 能量账本 ----------

/** P/O 口径：必须与 TCA 档案同版本（Lehninger 8e 现代口径 2.5/1.5），不与旧值混用 */
export interface PoBasis {
  /** 每 NADH 兑换 ATP 当量 */
  nadh: number;
  /** 每 FADH₂ 兑换 ATP 当量 */
  fadh2: number;
  /** 每乙酰-CoA 经一轮 TCA 的 ATP 当量 */
  accoaViaTca: number;
  source: string;
  legacy: {
    nadh: number;
    fadh2: number;
    /** 旧口径净 ATP（仅作口径对照展示） */
    netAtp: number;
    note: string;
  };
}

export interface LedgerEntry {
  item: string;
  count: string;
  atp: string;
  trace: string;
}

export interface FaoEnergyLedger {
  title: string;
  poBasis: PoBasis;
  perRound: { fadh2: number; nadh: number; acetylCoA: number; note: string };
  /** 结构化锚（校验器算术验伪的唯一入口） */
  palmitate: {
    carbons: number;
    rounds: number;
    fadh2: number;
    nadh: number;
    acetylCoA: number;
    /** 活化代价：2 个高能磷酸键（ATP→AMP+PPi，PPi 再水解） */
    activationHighEnergyBonds: number;
  };
  totals: { grossAtp: number; activationCost: number; netAtp: number };
  entries: LedgerEntry[];
  netEquation: string;
  storageNote: string;
  deltaGDiscipline: string;
}

// ---------- 数据根 ----------

export interface FaoData {
  id: "fatty-acid-oxidation";
  name: string;
  summary: string;
  organs: { id: string; name: string }[];
  entities: Entity[];
  steps: FaoStep[];
  energyLedger: FaoEnergyLedger;
  threeD: { status: "pending"; note: string; verifiedPdbIds: string[] };
}

// ---------- 骨架（器官无关几何） ----------

export interface Band {
  y0: number;
  y1: number;
  /** 泳道只占横向一段时的范围（本图四泳道均为全宽，不用） */
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
  entityId?: string;
  note?: string;
}

export type LinkType =
  /** 主链 / 活化入口 */
  | "main"
  /** 跨膜穿梭 */
  | "shuttle"
  /** 循环回流：第 5 轮回到第 1 步（低权重，不许读成第 5 步） */
  | "cycle-return"
  /** 循环出口：乙酰-CoA 离环入 TCA（低权重） */
  | "cycle-exit";

export interface SkeletonLink {
  from: string;
  to: string;
  stepId?: string;
  type: LinkType;
  label?: string;
}

export interface TransportStep {
  id: string;
  name: string;
  from: string;
  /** 中途跨膜交接节点（脂酰肉碱） */
  via: string | null;
  to: string;
  note: string;
}

export interface FaoSkeleton {
  pathwayId: "fatty-acid-oxidation";
  canvas: { width: number; height: number };
  spatialNote: string;
  compartments: CompartmentLane[];
  nodes: SkeletonNode[];
  links: SkeletonLink[];
  transportSteps: TransportStep[];
}
