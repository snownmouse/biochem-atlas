// 氨基酸代谢（PLATE 11 / SF-11）私有类型。
// 刻意不并入共享 types.ts：本图上层是“分类簇”、中层是“两道闸”、下层是“七条去路”，
// 与既有线性/环状挂图节点语义不同；共享渲染器抽取前，先在本切片内自洽。

export type AminoEntityKind = "amino-acid" | "keto-acid" | "intermediate" | "gas";

export interface IonizableGroup {
  group: string;
  pKa: number;
  chargeAt74: number;
  note?: string;
}

export interface AminoEntity {
  id: string;
  name: string;
  abbr: string;
  kind: AminoEntityKind;
  formula: string;
  charge: number;
  chargeBasis: string;
  ionizableGroups: IonizableGroup[];
  note?: string;
}

export interface AminoClassGroup {
  id: string;
  name: string;
  en: string;
  count: number;
  members: string[];
  note?: string;
}

export interface AminoClassification {
  source: string;
  groups: AminoClassGroup[];
  disputed: { title: string; text: string }[];
}

export interface AminoEnzyme {
  name: string;
  gene: string;
  ec: string;
  isozyme: string;
  organelle: string;
  note?: string;
}

export interface AminoDeltaG {
  value: number | null;
  qualitative: string;
  source: string;
}

export interface AminoSharedWith {
  pathwayId: string;
  stepId: string;
  entityId: string;
  note: string;
}

export interface AminoPdbCandidate {
  pdbId: string;
  title: string;
  species: string;
  method: string;
  resolution: number;
  chains: string;
  ligands: string;
  mutation: string;
  status: "verified";
  note: string;
}

export interface AminoStep {
  id: string;
  index: number;
  name: string;
  short: string;
  gate: "transamination" | "oxidative-deamination" | "secondary";
  compartment: "cytosol" | "mitochondria" | "both";
  organs: string[];
  equation: string;
  reaction: {
    substrates: string[];
    products: string[];
    cofactors: string[];
  };
  enzyme: AminoEnzyme;
  direction: "reversible" | "forward";
  deltaG: AminoDeltaG;
  physiology: string;
  organDifference: string;
  sharedWith: AminoSharedWith[];
  pdbCandidates: AminoPdbCandidate[];
  clinicalLink?: string;
}

export interface AminoFate {
  id: string;
  name: string;
  en: string;
  entityId: string | null;
  status: "linked" | "unbuilt";
  sharedWith: AminoSharedWith[];
  sources: string[];
  note: string;
}

export interface AminoClinical {
  id: string;
  name: string;
  disease: string;
  omim: string;
  enzyme: string;
  gene: string;
  defect: string;
  note: string;
  stepId: string;
  evidence: string;
}

export interface AminoOrgan {
  id: string;
  name: string;
  en: string;
  role: string;
  detail: string;
}

export interface AminoRegulation {
  id: string;
  target: string;
  signal: string;
  effect: string;
  source: string;
}

export interface AminoInterface {
  id: string;
  target: string;
  route: string;
  note: string;
  link?: string;
}

export interface AminoEnergyLedger {
  title: string;
  basis: string;
  unit: string;
  entries: { id: string; label: string; amount: number; note: string }[];
  note: string;
}

export interface AminoNote {
  id: string;
  level: "verified" | "pending" | "disputed" | "unbuilt";
  text: string;
}

export interface AminoThreeD {
  status: "pending";
  note: string;
}

export interface AminoReference {
  id: string;
  text: string;
}

export interface AminoPathwayData {
  id: string;
  name: string;
  en: string;
  plateNo: string;
  structureNo: string;
  structurePlateNo: string;
  summary: string;
  classification: AminoClassification;
  entities: AminoEntity[];
  steps: AminoStep[];
  fates: AminoFate[];
  organs: AminoOrgan[];
  clinical: AminoClinical[];
  regulation: AminoRegulation[];
  interfaces: AminoInterface[];
  energyLedger: AminoEnergyLedger;
  threeD: AminoThreeD;
  notes: AminoNote[];
  references: AminoReference[];
}

/* ---------------- skeleton ---------------- */

export type AminoNodeKind = "amino" | "metabolite" | "enzyme" | "fate" | "interface" | "signal";

export interface AminoNode {
  id: string;
  entityId?: string;
  kind: AminoNodeKind;
  x: number;
  y: number;
  w?: number;
  h?: number;
  label: string;
  sub?: string;
  status?: "linked" | "unbuilt";
  clinical?: boolean;
  organ?: string;
}

export type AminoLinkType = "main" | "side" | "dashed" | "interface" | "regulatory";

export interface AminoLink {
  id: string;
  from: string;
  to: string;
  path: string;
  type: AminoLinkType;
  stepId?: string;
  label?: string;
  labelX?: number;
  labelY?: number;
  clinical?: boolean;
}

export interface AminoCompartment {
  id: string;
  name: string;
  en: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface AminoAnnotation {
  x: number;
  y: number;
  text: string;
  size?: number;
  weight?: number;
  color?: string;
  anchor?: "start" | "middle" | "end";
}

export interface AminoStepLabel {
  stepId: string;
  x: number;
  y: number;
}

export interface AminoSkeleton {
  canvas: { width: number; height: number };
  nodes: AminoNode[];
  links: AminoLink[];
  compartments: AminoCompartment[];
  annotations: AminoAnnotation[];
  stepLabels: AminoStepLabel[];
}
