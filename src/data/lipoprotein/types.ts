// PLATE 18「血浆脂蛋白代谢」的数据类型。
// 这张图不是反应链：每个步骤是一段自包含的器官间物流，只描述
// 「谁把什么颗粒从哪搬到哪、颗粒表面发生了什么」。
// 因此这里没有 enzyme / ec / equation / ΔG 字段。

export type LogisticsKind =
  | "assembly"
  | "lipolysis"
  | "receptor"
  | "efflux"
  | "transfer"
  | "uptake";

export interface LipoproteinOrgan {
  id: string;
  name: string;
  role: string;
  note: string;
}

export interface LogisticsStep {
  id: string;
  /** 与 label 同义，供 stepIndex 的 StepLike 兼容读取 */
  name: string;
  kind: LogisticsKind;
  organId: string;
  label: string;
  /** 参与颗粒与蛋白，例如 ["CM", "ApoB-48"] */
  players: string[];
  /** 一句话物流方向 */
  flow: string;
  /** 教材级解释 */
  note: string;
  /** 2–3 句要点 */
  detail: string;
  /** 站内既有步骤接口，只放真实存在且已登记的 id */
  refs: string[];
}

export interface LipoproteinInterface {
  stepId: string;
  label: string;
  note: string;
}

export interface LipoproteinParticle {
  id: string;
  name: string;
  en: string;
  abbr: string;
  note: string;
}

export interface ParticleCompositionRow {
  id: string;
  name: string;
  apolipoprotein: string;
  tg: string;
  cholesterol: string;
  phospholipid: string;
  protein: string;
}

export interface ParticleCompositionLedger {
  title: string;
  basis: string;
  columns: string[];
  rows: ParticleCompositionRow[];
}

export interface LipoproteinData {
  id: string;
  name: string;
  en: string;
  plateNo: string;
  structureNo: string;
  summary: string;
  textbook: string;
  thesis: {
    statement: string;
    stepCount: number;
    reactionCount: number;
  };
  organs: LipoproteinOrgan[];
  steps: LogisticsStep[];
  interfaces: LipoproteinInterface[];
  particles: LipoproteinParticle[];
  compositionLedger: ParticleCompositionLedger;
  threeD: {
    status: string;
    note: string;
  };
}

// ---------------- 骨架 ----------------

export interface SkeletonCompartment {
  id: string;
  name: string;
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  tint: number;
}

export interface SkeletonOrganColumn {
  id: string;
  name: string;
  role: string;
  en: string;
  x: number;
  width: number;
  headerY: number;
}

export interface SkeletonNode {
  id: string;
  x: number;
  y: number;
  abbr: string;
  label: string;
  side: "left" | "right" | "above" | "below";
  stepId: string;
  particle: string;
}

export interface SkeletonChip {
  stepId: string;
  x: number;
  y: number;
  anchor: "start" | "middle" | "end";
  organId: string;
}

export interface SkeletonArm {
  organId: string;
  spine: { x: number; y0: number; y1: number };
  chips: SkeletonChip[];
}

export type FlowDirection = "ltr" | "rtl" | "bidirectional";

export interface SkeletonFlow {
  id: string;
  particle: string;
  from: string;
  to: string;
  direction: FlowDirection;
  path: string;
  label: string;
  labelX: number;
  labelY: number;
  labelAnchor: "start" | "middle" | "end";
  note: string;
}

export interface LipoproteinSkeleton {
  pathwayId: string;
  canvas: { width: number; height: number };
  spatialNote: string;
  compartments: SkeletonCompartment[];
  organColumns: SkeletonOrganColumn[];
  nodes: SkeletonNode[];
  arms: SkeletonArm[];
  blood: { bandId: string };
  flows: SkeletonFlow[];
}
