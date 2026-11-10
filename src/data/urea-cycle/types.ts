// 尿素循环（Krebs–Henseleit cycle）数据层类型。
// 本切片只做数据 + 挂图：五步、双区室、双氮源、能量双口径、TCA 延胡索酸接口。
// 3D 状态 pending；没有已核验的本酶-底物口袋，页面不出 3D、不建资产路径。

export type CompartmentId = "mito-matrix" | "mito-inner-membrane" | "cytosol";

export type EntityKind = "metabolite" | "enzyme" | "transporter" | "cofactor";

export interface SharedWith {
  pathway: string;
  entityId: string;
  /** TCA 中产生该分子的步骤（只写真实存在的 stepId） */
  producedByStep?: string;
  /** TCA 中消耗该分子的步骤 */
  consumedByStep?: string;
  note?: string;
}

export interface Entity {
  id: string;
  name: string;
  abbr?: string;
  formula?: string;
  /** 生理 pH 7.4 下的净电荷口径（字符串保留出处/例外说明） */
  ionization?: string;
  kind: EntityKind;
  /** EC 号；转运体/辅因子可省略 */
  ecNumber?: string;
  note?: string;
  sharedWith?: SharedWith;
}

export type StepKind = "entry" | "cycle";
export type DeltaGSource = "Lehninger 8e Ch.18";

export interface DeltaG {
  standard: number | null;
  physiological: number | null;
  unit: "kJ/mol";
  qualitative: string;
  source: DeltaGSource;
  note: string;
}

export interface NitrogenRole {
  role: "fix" | "transfer" | "carry" | "release" | "none";
  /** 净氮来源；鸟氨酸 δ-N 只是载体，不写进尿素的两个净氮 */
  sourceIds: ("ammonia" | "aspartate")[];
  atoms: number;
  text: string;
}

export interface CarbonRole {
  /** 本步是否改变净碳账（载体循环步应为 false） */
  netChange: boolean;
  text: string;
}

export interface Step3D {
  status: "pending" | "ready";
  note: string;
  candidates: ThreeDCandidate[];
}

export interface ThreeDCandidate {
  stepId: string;
  enzyme: string;
  /** 只在确实登记候选时写 PDB ID；无法确认的字段用 null */
  pdbId: string;
  organism: "human" | "nonhuman" | "unknown";
  method: "X-ray" | "cryo-EM" | null;
  resolutionA: number | null;
  ligands: string[];
  pocketRole: "own" | "other" | "unknown";
  note: string;
}

export interface UreaStep {
  id: string;
  index: number;
  kind: StepKind;
  name: string;
  shortName: string;
  compartment: CompartmentId;
  substrates: string[];
  products: string[];
  cofactors: string[];
  enzyme: { entityId: string; name: string; isozyme?: string };
  equation: string;
  ecNumber: string;
  irreversible: boolean;
  deltaG: DeltaG;
  nitrogen: NitrogenRole;
  carbon: CarbonRole;
  significance: string;
  misconceptions: string[];
  clinical: string[];
  /** 挂图标签坐标（数据驱动，页面不写死） */
  labelAt: { x: number; y: number; anchor: "start" | "middle" | "end" };
  subAt: { x: number; y: number; anchor: "start" | "middle" | "end" };
  subLabel: string;
  threeD: Step3D;
}

export interface EnergyEntry {
  stepId: string;
  label: string;
  /** 名义 ATP 分子数 */
  atp: number;
  /** 折算高能磷酸键数（ATP→AMP+PPi 记 2） */
  bonds: number;
  detail: string;
}

export interface EnergyLedger {
  title: string;
  nominalAtp: number;
  highEnergyBonds: number;
  nominalLabel: string;
  bondLabel: string;
  entries: EnergyEntry[];
  adp: number;
  amp: number;
  pi: number;
  ppi: number;
  netEquation: string;
  balanceNote: string;
  nitrogenNote: string;
  carbonNote: string;
  deltaGDiscipline: string;
}

export interface NitrogenSource {
  id: "ammonia" | "aspartate";
  label: string;
  donor: string;
  entersAtStep: string;
  entersAs: string;
  entityId: string;
  color: "brick" | "teal";
  assertion: string;
}

export interface DualNitrogen {
  sources: NitrogenSource[];
  urea: { entityId: string; nitrogenAtoms: number };
  /** 两个来源必须不同；校验器按 id 查重 */
  distinctSourceIds: string[];
  diagramNote: string;
}

export interface NitrogenLedger {
  inputs: { id: "ammonia" | "aspartate"; atoms: number; stepId: string; text: string }[];
  urea: { entityId: string; atoms: number };
  carrier: { entityId: string; atoms: number; netChange: number; text: string };
  assertion: string;
}

export interface CarbonLedger {
  inputs: { entityId: string; carbons: number; text: string }[];
  outputs: { entityId: string; carbons: number; text: string }[];
  carrier: { entityId: string; carbons: number; netChange: number; text: string };
  assertion: string;
}

export interface TcaRecycleStep {
  stepId: string;
  from: string;
  to: string;
  enzyme: string;
  /** TCA 数据层是否真实登记了该步；AST 转氨未单独登记 */
  registeredInTca: boolean;
  note?: string;
}

export interface TcaInterface {
  fumarateEntityId: string;
  sharedWith: SharedWith;
  recycleChain: TcaRecycleStep[];
  astNote: string;
  explanation: string;
  whyItMatters: string;
}

export interface UreaData {
  id: "urea-cycle";
  name: string;
  enName: string;
  plateNo: string;
  structureNo: string;
  summary: string;
  compartments: { id: CompartmentId; name: string; en: string }[];
  entities: Entity[];
  steps: UreaStep[];
  dualNitrogen: DualNitrogen;
  energyLedger: EnergyLedger;
  nitrogenLedger: NitrogenLedger;
  carbonLedger: CarbonLedger;
  tcaInterface: TcaInterface;
  cycleClosure: {
    loopStepIds: string[];
    carrierEntityId: string;
    carrierStartsAtStepId: string;
    carrierReturnsFromStepId: string;
    entryStepId: string;
    entryProductEntityId: string;
    note: string;
  };
  clinical: { id: string; name: string; inheritance: string; mechanism: string }[];
  threeD: { status: "pending" | "ready"; note: string };
}

export type LinkType = "main" | "feed" | "shuttle" | "cycle-return" | "cycle-exit" | "branch" | "recycle";

export interface SkeletonNode {
  id: string;
  entityId: string;
  x: number;
  y: number;
  label: string;
  /** 圆心内缩写字（代谢物）或机器短名 */
  abbr?: string;
  compartment: CompartmentId;
  role: "metabolite" | "projection" | "machine";
  labelPos?: { dx: number; dy: number; anchor: "start" | "middle" | "end" };
}

export interface SkeletonLink {
  from: string;
  to: string;
  /** 五步之一；与 transportId 二选一 */
  stepId?: string;
  /** skeleton.transportSteps 之一；转运不是酶促步骤 */
  transportId?: string;
  type: LinkType;
  label?: string;
  refPathway?: string;
}

export interface TransportStep {
  id: string;
  name: string;
  from: string;
  via: string;
  to: string;
  note: string;
}

export interface UreaSkeleton {
  canvas: { width: number; height: number };
  compartments: { id: CompartmentId; name: string; en: string; range: [number, number] }[];
  nodes: SkeletonNode[];
  links: SkeletonLink[];
  transportSteps: TransportStep[];
  spatialNote: string;
}
