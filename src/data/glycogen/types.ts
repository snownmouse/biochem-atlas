// 糖原代谢（PLATE 10 / 12）数据层类型。
// 只描述书本基本反应：糖原分解臂 + 糖原合成臂，重点是肝与肌的功能相反。
// 热力学一律 null + 定性描述 + 出处；不写任何未核验的 ΔG 数字。

export type GlycogenEntityKind = "metabolite" | "enzyme" | "signal";

export interface GlycogenEntity {
  id: string;
  name: string;
  abbr: string;
  kind: GlycogenEntityKind;
  /** 仅代谢物填写；聚合物写“每残基”口径 */
  formula?: string;
  /** pH 7.4 净电荷；仅代谢物填写 */
  charge?: number;
  /** 分子式的口径提醒（如聚合度、电离态、片段化） */
  note?: string;
}

export interface GlycogenOrgan {
  id: "liver" | "muscle";
  name: string;
  en: string;
  /** 该器官在糖原代谢中的结构性差异（一句话，不写机制长文） */
  structural: string;
  /** 是否表达葡萄糖-6-磷酸酶 */
  g6pc1: boolean;
  /** 糖原去向 */
  fate: string;
}

export interface SharedWith {
  pathwayId: string;
  stepId: string;
  entityId: string;
  note?: string;
}

export interface GlycogenReaction {
  substrates: string[];
  products: string[];
  /** 不入画的辅因子/辅底物（ATP/UTP/PPi 等），只作文字说明 */
  cofactors: string[];
  /** 页面与校验共用的反应式字符串 */
  equation: string;
}

export interface GlycogenDeltaG {
  value: null;
  qualitative: string;
  source: string;
}

export interface GlycogenStep {
  id: string;
  /** 全书顺序；器官臂步骤仍占一个序号，页面用 stage 标签覆盖显示 */
  index: number;
  /** 覆盖默认“第 N 步”的显示（如肝臂 / 肌臂） */
  stageLabel?: string;
  name: string;
  /** 挂图上的短名（避免 SVG 标签互相压字） */
  short: string;
  phase: "breakdown" | "synthesis";
  organ: "shared" | "liver" | "muscle";
  reaction: GlycogenReaction;
  enzyme: {
    entityId: string;
    name: string;
    abbr: string;
    ec: string;
    isozyme?: string;
    organNote?: string;
  };
  /** 生理方向：forward=体内单向；reversible=可逆；branch=分支/转移 */
  direction: "forward" | "reversible" | "branch";
  deltaG: GlycogenDeltaG;
  /** 一句生理意义 */
  physiology: string;
  /** 肝/肌差异（有则填，无则省略） */
  organDifference?: string;
  /** 跨通路接口：必须指向真实存在的步骤与实体 id */
  sharedWith: SharedWith[];
  /** 结构候选的 PDB id 列表；只登记已核验条目 */
  pdbCandidates?: string[];
}

export interface GlycogenRegulation {
  id: string;
  kind: "covalent" | "allosteric" | "hormonal";
  title: string;
  /** 结构化事实：谁作用于谁、结果是什么 */
  text: string;
  targets: string[];
  source: string;
}

export interface GlycogenInterface {
  id: string;
  entityId: string;
  title: string;
  note: string;
  /** connected=已有真实步骤可跳；unbuilt=本平台未建，页面上必须显示“未接入 / 数据待建” */
  status: "connected" | "unbuilt";
  sharedWith: SharedWith[];
}

export interface EnergyEntry {
  id: string;
  label: string;
  /** 每个葡萄糖残基的高能磷酸键数（正=消耗，负=节省） */
  perResidue: number;
  note: string;
}

export interface EnergyLedger {
  title: string;
  basis: string;
  unit: string;
  perResidue: {
    /** 磷酸解每释放 1 个 G1P 省下的 ATP（相比己糖激酶磷酸化） */
    breakdownSavedAtp: number;
    /** 合成每加 1 个残基消耗的高能磷酸键 */
    synthesisHighEnergyBonds: number;
    /** UTP → PPi 的那一个酐键 */
    utpToPpiBonds: number;
    /** PPi 水解的那一个酐键 */
    ppiHydrolysisBonds: number;
    /** 每个分支水解释放的游离葡萄糖数 */
    debranchFreeGlucosePerBranch: number;
    /** 肌内把脱支游离葡萄糖重新磷酸化所需 ATP */
    muscleHexokinaseCostPerFreeGlucose: number;
  };
  /** 供校验器做算术核对：100 个残基的参考轮次 */
  referenceRun: {
    residues: number;
    synthesisCost: number;
    breakdownSaving: number;
    note: string;
  };
  entries: EnergyEntry[];
}

export interface Conservation {
  carbon: {
    perResidue: number;
    note: string;
  };
  phosphate: {
    breakdown: { input: number; output: number; note: string };
    synthesis: { input: number; output: number; note: string };
  };
  highEnergy: {
    synthesisPerResidue: number;
    breakdownSavedPerResidue: number;
    note: string;
  };
}

export interface PdbCandidate {
  pdbId: string;
  enzyme: string;
  entityId: string;
  role: "substrate-state" | "product-state" | "inhibitor-complex" | "allosteric" | "apo" | "architecture";
  organism: string;
  /** RCSB 表达系统（宿主）；首屏物种口径必须写明，不能只写“人源” */
  expressionSystem?: string;
  /** PDB mutation 字段与修饰残基的实况；无工程点突变也必须写明 */
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
  /** 本轮真正向 RCSB 核验过的条目（不是凭记忆登记） */
  verifiedOn: string;
  candidates: PdbCandidate[];
  assets: {
    /** 结构对照页用到的 3D 分子资产 id */
    moleculeAssets: string[];
    /** 尚未生成原子资产的分子 */
    missingAssets: string[];
    note: string;
  };
}

export interface GlycogenData {
  id: string;
  name: string;
  en: string;
  plateNo: string;
  summary: string;
  organs: GlycogenOrgan[];
  entities: GlycogenEntity[];
  steps: GlycogenStep[];
  regulation: GlycogenRegulation[];
  interfaces: GlycogenInterface[];
  energyLedger: EnergyLedger;
  conservation: Conservation;
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
  /** 代谢物圆半径；机器/投影用矩形 */
  r?: number;
  w?: number;
  h?: number;
  kind: "metabolite" | "enzyme" | "signal" | "projection";
  label: string;
  sub?: string;
  organ?: "shared" | "liver" | "muscle";
}

export interface SkeletonLink {
  id: string;
  from: string;
  to: string;
  /** 主链/支路/器官/闭合/接口链接必须指向真实步骤；调控线不绑步骤 */
  stepId?: string;
  /** main=主链；side=支路；organ=器官臂；cycle-return=闭合弧；control=调控线；interface=接口投影 */
  type: "main" | "side" | "organ" | "cycle-return" | "control" | "interface";
  /** 页面直接消费的 SVG path；数据驱动，不在组件里写路线 */
  path: string;
  label?: string;
  labelX?: number;
  labelY?: number;
  /** 标签锚点 */
  labelAnchor?: "start" | "middle" | "end";
}

export interface GlycogenSkeleton {
  canvas: { width: number; height: number };
  compartments: SkeletonCompartment[];
  nodes: SkeletonNode[];
  links: SkeletonLink[];
  /** 页面上的固定注记（器官差异、同一颗粒池等） */
  annotations: {
    id: string;
    x: number;
    y: number;
    text: string;
    anchor: "start" | "middle" | "end";
    size: number;
    weight?: number;
    organ?: "liver" | "muscle";
  }[];
}
