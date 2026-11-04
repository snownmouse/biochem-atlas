// 通路数据模型 —— 目标可持续扩展到 TCA、氧化磷酸化等后续通路。

/** 器官维度。每条通路的三张器官图共用同一套骨架坐标。 */
export type OrganId = "liver" | "muscle" | "rbc";

/** 代谢物 / 酶等实体 */
export interface Entity {
  id: string;
  /** 显示名（中文） */
  name: string;
  /** 缩写或英文名，用于副标签 */
  abbr?: string;
  kind: "metabolite" | "enzyme";
}

/** 一步催化反应中的酶（可含同工酶的器官差异） */
export interface EnzymeSpec {
  /** 酶实体 id */
  entityId: string;
  /** 显示名 */
  name: string;
  /** 同工酶信息，如 "己糖激酶 I–III" / "葡萄糖激酶（HK-IV）" */
  isozyme?: string;
}

/** 器官差异条目：每条是一句可展示的差异描述 */
export interface OrganDiff {
  organ: OrganId;
  text: string;
}

/** 自由能数据：标准态与生理态并列，单位统一 kJ/mol；数值有教材年代差异时用 note 说明 */
export interface DeltaG {
  /** 标准态 ΔG°′（kJ/mol） */
  standard: number;
  /** 生理态 ΔG（kJ/mol，典型取红细胞胞内估算） */
  physiological: number;
  unit: string;
  /** 数据出处，如 "Lehninger 8e Table 15-1" */
  source?: string;
  /** 口径说明：教材旧值/现代值差异、生理态的取值语境等 */
  note?: string;
}

/**
 * 结合谱：后续切片用于分子对接/结合位点展示的数据占位。
 * 本切片只定义接口，不填充任何数据。
 */
export interface BindingProfile {
  /** 受体/酶的 PDB 或内部编号 */
  targetId: string;
  /** 配体（底物/抑制剂）列表 */
  ligands: { id: string; name: string; affinityKdM?: number }[];
  /** 结合位点残基注释 */
  siteNotes?: string[];
}

/** 通路中的单一步骤 */
export interface Step {
  /** 如 "gk-1"，全局唯一 */
  id: string;
  /** 主链中的序号 1–10；支路步骤为 null */
  index: number | null;
  name: string;
  /** 底物实体 id 列表（按化学计量顺序） */
  substrates: string[];
  /** 产物实体 id 列表 */
  products: string[];
  /** 酶（主酶 + 可选同工酶注释） */
  enzyme: EnzymeSpec;
  /** 辅因子/参与的小分子，如 ATP、NAD+、Pi */
  cofactors: string[];
  /** 是否生理不可逆 */
  irreversible: boolean;
  /** 一句生理/临床意义 */
  significance: string;
  /** 完整反应式（文本，用于展示与校对） */
  equation: string;
  /** 器官差异；空数组表示本步无器官差异 */
  organDiffs: OrganDiff[];
  /** 结合谱占位：本切片始终为 null，待后续切片填充 */
  bindingProfile: BindingProfile | null;
  /* ---- 以下字段全部 optional：缺省即"档案未载"，页面按"有则显示、无则隐藏"处理 ---- */
  /** IUBMB 酶学委员会编号，如 "2.7.1.1" */
  ecNumber?: string;
  /** 自由能（标准态 + 生理态） */
  deltaG?: DeltaG;
  /** 立体化学要点，如 α/β 构型、D/L、双键位置；每条一句 */
  stereochemistry?: string[];
  /** 常见教学误解（每条为"误解 — 纠正"式一句话） */
  misconceptions?: string[];
  /** 临床关联要点（确定性措辞已在档案中核定） */
  clinical?: string[];
}

/** 通路内区室（本切片只有细胞质一条泳道） */
export interface Compartment {
  id: string;
  name: string;
}

/** 骨架节点：与器官无关，坐标一次定好 */
export interface SkeletonNode {
  id: string;
  /** 主链节点按 order 排列；支路节点 order 为 null */
  order: number | null;
  x: number;
  y: number;
  /** 所属泳道 */
  compartment: string;
  /** 节点种类，决定渲染图元 */
  kind: "metabolite" | "enzyme" | "reaction";
  label: string;
}

/** 可选支路 */
export interface SideBranch {
  id: string;
  name: string;
  /** 默认折叠展示 */
  collapsedByDefault: boolean;
  /** 分支起点/终点的主链节点 id */
  from: string;
  to?: string;
  nodeIds: string[];
}

/** 通路骨架（器官无关） */
export interface PathwaySkeleton {
  pathwayId: string;
  compartments: Compartment[];
  nodes: SkeletonNode[];
  sideBranches: SideBranch[];
  /** 主链相邻节点的连接，引用节点 id */
  links: { from: string; to: string; stepId: string }[];
}

/** 回补反应条目（TCA 起开始使用的说明区，不参与主链渲染） */
export interface AnaplerosisEntry {
  id: string;
  name: string;
  equation: string;
  enzyme: string;
  ec?: string;
  cofactors?: string;
  /** 适用组织范围，如 "肝 / 肾为主" */
  organScope?: string;
  significance: string;
}

/** 组织一个器官的通路视图差异 */
export interface OrganProfile {
  id: OrganId;
  name: string;
  /** 顶部摘要用：该器官涉及的差异数（由 steps 数据推导，不必手填） */
  note?: string;
}

export interface Pathway {
  id: string;
  name: string;
  summary: string;
  organs: OrganProfile[];
  steps: Step[];
  /** 可选支路对应的步骤（如红细胞 Rapoport–Luebering 支路） */
  sideBranchSteps?: Step[];
  /** 回补反应（TCA 等后续通路）；无则缺省 */
  anaplerosis?: AnaplerosisEntry[];
  /** 回补说明（『中间体按催化量使用』概念句） */
  anaplerosisNote?: string;
  /** 通路级说明（如 TCA 的器官差异有限声明） */
  organNote?: string;
  skeleton: PathwaySkeleton;
}
