// 脂肪酸从头合成（FAS）通路私有类型。
// 与 fatty-acid-oxidation/types.ts 同构，差别只有三处：
//   1) 区室是「基质 / 内膜转运带 / 胞质」三条（氧化是四条，多一个膜间腔）；
//   2) 计量账本的币种换成 ATP / NADPH / 丙二酰-CoA（氧化是 FADH₂ / NADH / 乙酰-CoA）；
//   3) 循环每轮 +2C（氧化每轮 −2C），四步环的镜像对照字段 mirrorTable。
//
// 与共享渲染器的适配点（尚未抽取，先在这里登记）：
//   - StepKind 仍是通路私有扩展：prep / transport / cycle。共享渲染器需要支持
//     「同一实体多节点」（accoa 在基质与胞质各有一个节点）以及 cycle-return /
//     cycle-exit 两类低权重弧；这两类弧不是新步骤，不得计入 g[data-step-id] 的步骤数。
//   - perRoundYield 是 FAS 私有字段（carbonDelta / malonylCoA / nadph），用于验证
//     「每轮 +2C、2 NADPH」；共享渲染器若做能量账，需要把这个字段上提为通用
//     stoichiometry 结构，而不是每图一份。
//   - compartment / compartments 用字符串 id；共享渲染器应把它映射到泳道几何，
//     不能靠颜色区分区室。

export type CompartmentId = "mito-matrix" | "mito-inner-membrane" | "cytosol";

export interface Entity {
  id: string;
  name: string;
  abbr?: string;
  formula?: string;
  /** 电离态口径：遵 research/ionization-convention.md */
  ionization?: string;
  note?: string;
}

export interface DeltaG {
  /** 未核实一律 null，禁止编数字 */
  valueKcal: number | null;
  qualitative: string | null;
  source: string;
}

export interface OrganDiff {
  organ: string;
  text: string;
}

export interface StepEnzyme {
  name: string;
  entityId?: string;
  isozyme?: string;
}

export type StepKind = "prep" | "transport" | "cycle";

export interface PerRoundYield {
  /** 本轮净增碳数；四步求和必须 = 2 */
  carbonDelta: number;
  /** 本轮消耗的 NADPH；四步求和必须 = 2 */
  nadph: number;
  malonylCoA: number;
  atp?: number;
  note?: string;
}

export interface FasStep {
  id: string;
  name: string;
  kind: StepKind;
  /** 四步环的序号 1–4；prep / transport 为 null */
  index: number | null;
  compartment: CompartmentId;
  compartments?: CompartmentId[];
  substrates: string[];
  products: string[];
  cofactors: string[];
  enzyme: StepEnzyme;
  equation: string;
  ecNumber?: string;
  irreversible: boolean;
  deltaG: DeltaG | null;
  stereochemistry?: string[];
  significance: string;
  misconceptions?: string[];
  clinical?: string[];
  organDiffs: OrganDiff[];
  perRoundYield?: PerRoundYield;
  threeD?: {
    status: "pending" | "ready";
    note: string;
    pdbCandidates?: PdbCandidate[];
  } | null;
}

export interface PdbCandidate {
  pdbId: string;
  role: "complex-state" | "domain-fragment" | "homolog";
  organism: string;
  method: string;
  /** 未核实一律 null，禁止编数字 */
  resolutionA: number | null;
  ligands: string[];
  note: string;
}

export interface EnergyEntry {
  label: string;
  value: number;
  unit: string;
  sign: "consume" | "produce" | "neutral";
  note: string;
}

export interface EnergyLedger {
  title: string;
  palmitate: {
    carbons: number;
    primerCarbons: number;
    rounds: number;
    acetylCoA: number;
    malonylCoA: number;
    atp: number;
    nadph: number;
    protons: number;
    bicarbonate: number;
    co2Released: number;
  };
  perRound: PerRoundYield & { atp: number; note: string };
  totals: {
    atp: number;
    nadph: number;
    acetylCoA: number;
  };
  entries: EnergyEntry[];
  /** 用户给定口径的净方程，原样保留 */
  netEquation: string;
  /** CO₂ / H₂O 的配平说明，避免把净方程误读成凭空消失 */
  balanceNote: string;
  carbonNote: string;
  deltaGDiscipline: string;
}

export interface MirrorRow {
  item: string;
  synthesis: string;
  oxidation: string;
}

export interface FasData {
  id: string;
  plateNo: string;
  structurePlateNo: string;
  name: string;
  shortName: string;
  summary: string;
  organs: { id: string; name: string }[];
  compartments: { id: CompartmentId; name: string; en: string; range: [number, number] }[];
  entities: Entity[];
  steps: FasStep[];
  /** 合成 vs 氧化镜像对照表（右栏常驻） */
  mirrorTable: MirrorRow[];
  energyLedger: EnergyLedger;
  threeD: {
    status: "pending" | "ready";
    note: string;
    pdbCandidates: PdbCandidate[];
  };
    conflicts?: string[];
}

export interface SkeletonNode {
  id: string;
  entityId: string;
  x: number;
  y: number;
  label: string;
  /** 主链顺序；机器节点与投影节点为 null */
  order: number | null;
  compartment: CompartmentId;
  role: "metabolite" | "machine" | "projection";
}

export interface SkeletonLink {
  from: string;
  to: string;
  stepId: string;
  type: "main" | "feed" | "cycle-return" | "cycle-exit" | "shuttle";
  label?: string;
}

export interface TransportStep {
  id: string;
  name: string;
  from: string;
  via?: string;
  to: string;
  note: string;
}

export interface FasSkeleton {
  canvas: { width: number; height: number };
  compartments: { id: CompartmentId; name: string; en: string; range: [number, number] }[];
  nodes: SkeletonNode[];
  links: SkeletonLink[];
  transportSteps: TransportStep[];
  spatialNote: string;
}
