// Cori 循环本地类型（数据层切片专用）。
// 刻意不改共享 src/data/types.ts：本通路是“器官级引用 + 账本”，没有自己的酶与反应式，
// 字段集（arms / connectors / blood / energyLedger / redoxLedger）是通路私有扩展。

export type ArmSide = "muscle" | "liver";
export type LedgerItem = "ATP" | "GTP" | "NADH";

/** 被引用步骤的来源：既有两条通路；转运步允许指向 skeleton.transportSteps。 */
export interface StepSource {
  pathway: "glycolysis" | "gluconeogenesis";
  stepId: string;
  /** reverse = 本循环方向与源数据记录方向相反（仅 LDH 肌肉侧） */
  direction: "forward" | "reverse";
}

export type ArmStepKind =
  | "enzyme-ref"
  | "enzyme-ref-reverse"
  | "transport-ref"
  | "transport";

export interface EnergyTag {
  item: "ATP" | "GTP" | "NADH";
  sign: 1 | -1;
  count: number;
}

export interface ArmStep {
  id: string;
  kind: ArmStepKind;
  /** 转运步（MCT）没有既有通路来源，source 为 null */
  source: StepSource | null;
  role: "investment" | "commit" | "redox" | "payback" | "transport" | "release" | "bypass";
  /** 本页自己的角色短语，不复制源步骤的 enzyme / equation / significance */
  label: string;
  energy?: EnergyTag;
  note: string;
}

export interface Arm {
  organId: ArmSide;
  title: string;
  en: string;
  flow: string;
  steps: ArmStep[];
}

export interface LedgerEntry {
  id: string;
  arm: ArmSide;
  source: StepSource | { pathway: "cori"; stepId: string };
  item: LedgerItem;
  sign: 1 | -1;
  count: number;
  basis: string;
  note: string;
}

export interface LedgerTotal {
  arm: ArmSide | "whole";
  item: "ATP" | "highEnergyPhosphate";
  net: number;
}

export interface EnergyLedger {
  title: string;
  basis: string;
  entries: LedgerEntry[];
  totals: LedgerTotal[];
  derivation: string[];
  noLoop: string;
}

export interface RedoxSide {
  source: StepSource | { pathway: "cori"; stepId: string };
  count: number;
}

export interface RedoxEntry {
  arm: ArmSide;
  item: "NADH";
  produced: RedoxSide;
  consumed: RedoxSide;
  net: number;
  note: string;
}

export interface RedoxLedger {
  title: string;
  entries: RedoxEntry[];
  statement: string;
}

export interface CoriData {
  id: "cori";
  name: string;
  en: string;
  plateNo: string;
  summary: string;
  thesis: {
    statement: string;
    referenceCount: number;
    equationCount: number;
  };
  organs: { id: string; name: string; role: string; note: string }[];
  arms: Arm[];
  connectors: { id: string; name: string; note: string }[];
  blood: {
    title: string;
    lactate: { from: string; to: string; direction: "rtl"; carrier: string; note: string };
    glucose: { from: string; to: string; direction: "ltr"; carrier: string; note: string };
    rbc: { name: string; note: string; caveat: string };
  };
  energyLedger: EnergyLedger;
  redoxLedger: RedoxLedger;
  misreads: { title: string; text: string; grade: "确定" | "未核实" }[];
  threeD: { status: "pending"; note: string };
}

// ---------- 骨架（只负责版面几何） ----------

export interface Band {
  x0: number;
  x1: number;
  y0: number;
  y1: number;
}

export interface CoriCompartment {
  id: string;
  name: string;
  band: Band;
  tint: number;
  note?: string;
  muted?: boolean;
}

export interface CoriOrganColumn {
  id: ArmSide;
  name: string;
  en: string;
  role: string;
  x: number;
  width: number;
}

export interface CoriNode {
  id: string;
  x: number;
  y: number;
  abbr: string;
  label: string;
  side?: "left" | "right" | "above" | "below";
  /** 点击节点时选中的引用步 */
  stepId: string;
}

export interface CoriChip {
  stepId: string;
  x: number;
  y: number;
  anchor: "start" | "end" | "middle";
}

export interface CoriArmGeometry {
  organId: ArmSide;
  /** 引用序列的细虚线脊线（只表示阅读顺序，不表示反应方向） */
  spine: string;
  chips: CoriChip[];
}

export interface CoriSkeleton {
  pathwayId: "cori";
  canvas: { width: number; height: number };
  spatialNote: string;
  compartments: CoriCompartment[];
  organColumns: CoriOrganColumn[];
  nodes: CoriNode[];
  arms: CoriArmGeometry[];
  blood: {
    bandId: string;
    lactate: { path: string; labelX: number; labelY: number; labelAnchor: "start" | "end" | "middle" };
    glucose: { path: string; labelX: number; labelY: number; labelAnchor: "start" | "end" | "middle" };
    rbc: { x: number; y: number; width: number; height: number; arrow: string };
  };
}
