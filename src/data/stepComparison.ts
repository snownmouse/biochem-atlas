// ============================================================
// stepComparison —— "结构对照页"的数据类型（无数据）
//
// 每步数据已按 pathwayId 搬进 comparisonConfig.ts：
//   · 糖酵解十步原样搬入，块数/顺序/标注未改；
//   · TCA 九块（接驳步 PDH + 环内八步）为新增。
// 这里只保留类型，组件与配置共用同一套字段口径。
// ============================================================

/** 3D / 2D 变化原子的三种语义（对应三色） */
export type ChangeKind = "added" | "newbond" | "leaving";

export interface AtomMark {
  /** 对应资产 atoms[].name，如 C6 / O6 / P6 / S */
  name: string;
  kind: ChangeKind;
  /** 图上短注（不写长句） */
  note?: string;
}

/** 一个分子（一侧可由多个分子组成，如 gk-4 产物的 GAP + DHAP） */
export interface MolPart {
  /** ligands3d/<id>.json 的 id */
  id: string;
  name: string;
  formula: string;
  /** 2D 结构式 URL；null=缺（保留兜底语义） */
  asset2d: string | null;
  /** null 时的说明（页面原样呈现） */
  missing2dReason?: string;
  /** 图上要高亮的原子；空=不作标注 */
  marks?: AtomMark[];
  /** 该分子自身的构象提醒（如线形 vs 呋喃型、分块呈现） */
  caveat?: string;
  /**
   * 3D 不建时的原因（如 CO₂ / HCO₃⁻ 原子数过少、球棍无形状信息量）。
   * 有值时页面在 3D 模式显示说明块、不请求 3D 资产，绝不用假球填充。
   */
  no3dReason?: string;
  /**
   * 首屏可见的配体来源说明（比角标更显眼，随块内分子对照一起呈现，不折叠）。
   * 口径：写清 PDB/分辨率/方法/物种/来源蛋白全名与它在通路中的角色；
   * 来源蛋白不是该步酶时用中性事实句点明；本酶口袋未命中时写明“未获本酶口袋结构、取自 <蛋白>”。
   */
  sourceNote?: string;
}

/**
 * 3D 坐标来源：experimental=实验坐标；computed=RDKit 计算构象（自由态）；
 * none=无 3D 坐标、只做 2D（如 CO₂ / HCO₃⁻）。
 */
export type CoordSource = "experimental" | "computed" | "none";

/**
 * 单个分子的证据字段。A/B/C/D 不在这里手写，等级一律由 evidenceGrade.ts 从字段推导：
 *   A = pocketRole "own"  + species "human"
 *   B = pocketRole "own"  + species "nonhuman"
 *   C = pocketRole "other"+ species "human"
 *   D = pocketRole "other"+ species "nonhuman"
 * coordSource 为 computed / none 时不进入 A–D，只作覆盖标签。
 */
export interface PartEvidence {
  /** 与同侧 parts[].id 一一对应，防止数组顺序漂移 */
  molId: string;
  coordSource: CoordSource;
  /** 口袋是否来自本步酶；coordSource=experimental 时必填 */
  pocketRole?: "own" | "other";
  /** 口袋物种；coordSource=experimental 时必填 */
  species?: "human" | "nonhuman";
}

/** 一步两侧的证据数组（顺序与 parts 对齐，molId 做显式校验） */
export interface StepEvidence {
  substrate: PartEvidence[];
  product: PartEvidence[];
}

/** 结构式一侧：name/formula 为合并后的文字事实，parts 是实际分子 */
export interface ChemSide {
  name: string;
  formula: string;
  parts: MolPart[];
  /** 辅因子（ATP/ADP/NAD⁺）不入画的口径说明 */
  cofactorNote?: string;
}

export interface StepComparison {
  stepId: string;
  /** 环内步次（1 起）；接驳步为 0，用 stageLabel 覆盖显示 */
  index: number;
  /** 覆盖默认的「第 N 步」显示（如 TCA 的接驳步） */
  stageLabel?: string;
  enzyme: string;
  isozyme?: string;
  equation: string;
  substrate: ChemSide;
  product: ChemSide;
  /** 箭头旁的短标注：这一步的化学变化（不是"发生反应"这类空话） */
  arrowLabel: string;
  /** 变化详述（页面上"这一步改了什么"一行） */
  change: string;
  /** 一句生理意义 */
  physiology: string;
  /**
   * 结构化证据字段：等级由 evidenceGrade.ts 自动推导，禁止在页面上手写 A/B/C/D。
   * 缺字段时页面按「未分级」显式呈现（不猜、不硬塞）。
   */
  evidence?: StepEvidence;
  /**
   * 默认显示模式（逐块、可缺省；缺省=3d）。
   * 只由数据判据决定：重原子数不变 + 拓扑改变（原子命名下的连接/键级变化）+ |ΔV| ≤ 2.5%。
   * 不按 stepId 写 if 分支——判据数字写进 defaultModeRule，页面原样展示。
   */
  defaultMode?: "2d" | "3d";
  /** 触发 defaultMode 的数据判据（含实测数字，页面与报告共用） */
  defaultModeRule?: string;
}
