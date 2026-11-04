// 单步 3D 资产的共享类型与工具：概览页内嵌视图与单步页共用。
// 运行时零计算——所有几何/距离/氢键都由资产管线离线算好，这里只做格式归一、展示标签与旗标推导。
// 资产存在两代 meta 格式，normalizeMeta 统一归一：
//   v1（gk-06 首个模板）：holo.organism（大写）/ holo.chain / holo.ligand{} / holo.cofactorOnly / holo.note
//   v2（管线批量产物）：  species（Title Case）/ chainSelection.chains[] / ligands[]（sdfFile）/ caveats[] / apo 可为 null

export interface PocketResidue {
  resi: number;
  resn: string;
  chain: string;
  minDist: number;
  type: "hbond" | "hydrophobic" | "contact";
  provenance: string;
}
export interface HbondAtom {
  name: string;
  resi: number;
  resn: string;
  chain: string;
  x: number;
  y: number;
  z: number;
}
export interface Hbond {
  dist: number;
  prot: HbondAtom;
  /** v2 通用字段（任意配体） */
  lig?: HbondAtom & { id?: string };
  /** v1 旧字段（NAD 专用） */
  nad?: HbondAtom;
  provenance: string;
}
export interface Pocket {
  residues: PocketResidue[];
  hbonds: Hbond[];
  waters: number[];
}
/** 氢键的配体侧原子（兼容 v1 nad / v2 lig） */
export function hbondLigandAtom(hb: Hbond): (HbondAtom & { id?: string }) | undefined {
  return hb.lig ?? hb.nad;
}

/* ---------- 归一化 meta ---------- */
export interface NormLigand {
  id: string;
  name: string;
  role: string;
  sdf: string;
  /** 是否参与口袋（v2 holo.ligands 提供；v1 单配体视为 true）。非口袋相关配体实例不绘制（如第二位点的拷贝、远处 ADP）。 */
  pocketRelevant: boolean;
}
export interface NormStateInfo {
  pdbId: string;
  organismRaw: string;
  method: string;
  resolution: number | null;
  chains: string[];
  atomCount: number | null;
}
export interface NormMeta {
  stepId: string;
  stepName: string;
  assetVersion: string;
  provenance: string;
  holo: NormStateInfo;
  apo: NormStateInfo | null;
  ligands: NormLigand[];
  cofactorOnly: boolean;
  caveats: string[];
  criteria: { dist: number; hbond: number; water: number };
}

function normState(raw: any, fallbackPdbId: string): NormStateInfo {
  const s = raw ?? {};
  return {
    pdbId: s.pdbId ?? fallbackPdbId ?? "—",
    organismRaw: s.organism ?? s.species ?? "",
    method: s.method ?? "",
    resolution: typeof s.resolution === "number" ? s.resolution : null,
    chains: s.chain ? [s.chain] : (s.chainSelection?.chains ?? []),
    atomCount: typeof s.atomCount === "number" ? s.atomCount : null,
  };
}

export function normalizeMeta(raw: any): NormMeta {
  const holoRaw = raw.holo ?? {};
  const ligands: NormLigand[] = (holoRaw.ligands ?? raw.ligands ?? []).map((l: any) => ({
    id: l.id,
    name: l.name ?? l.id,
    role: l.role ?? "ligand",
    sdf: l.sdf ?? l.sdfFile ?? "",
    pocketRelevant: l.pocketRelevant !== undefined ? l.pocketRelevant === true : true,
  }));
  // v1 单配体对象
  if (ligands.length === 0 && holoRaw.ligand) {
    ligands.push({
      id: holoRaw.ligand.id,
      name: holoRaw.ligand.name ?? holoRaw.ligand.id,
      role: "cofactor",
      sdf: "ligand.sdf",
      pocketRelevant: true,
    });
  }
  const roles = new Set(ligands.map((l) => l.role));
  const cofactorOnly =
    holoRaw.cofactorOnly === true ||
    (ligands.length > 0 && !roles.has("substrate") && !roles.has("product"));
  const caveats: string[] = (raw.caveats ?? [holoRaw.note, raw.apo?.note]).filter(Boolean);
  return {
    stepId: raw.stepId ?? "",
    stepName: raw.stepName ?? "",
    assetVersion: raw.assetVersion ?? "—",
    provenance: raw.provenance ?? "computed",
    holo: normState(holoRaw, raw.pdbId),
    apo: raw.apo ? normState(raw.apo, raw.apo.pdbId) : null,
    ligands,
    cofactorOnly,
    caveats,
    criteria: {
      dist: raw.pocketCriteria?.distanceCutoffA ?? 4.5,
      hbond: raw.pocketCriteria?.hbondCutoffA ?? 3.5,
      water: raw.pocketCriteria?.waterCutoffA ?? 8,
    },
  };
}

/* ---------- 展示标签 ---------- */
export const METHOD_LABEL: Record<string, string> = {
  "X-RAY DIFFRACTION": "X-ray",
  "ELECTRON MICROSCOPY": "cryo-EM",
};
export const methodLabel = (m: string | undefined) => METHOD_LABEL[m ?? ""] ?? m ?? "—";

export const ORGANISM_LABEL: Record<string, string> = {
  "HOMO SAPIENS": "人",
  "MUS MUSCULUS": "小鼠",
  "RATTUS NORVEGICUS": "大鼠",
  "SACCHAROMYCES CEREVISIAE": "酿酒酵母",
  "ORYCTOLAGUS CUNICULUS": "兔",
  "GALLUS GALLUS": "鸡",
  "ESCHERICHIA COLI": "大肠杆菌",
};
export const organismLabel = (o: string | undefined) =>
  (o && ORGANISM_LABEL[o.toUpperCase()]) ?? o ?? "—";

export const TYPE_LABEL: Record<PocketResidue["type"], string> = {
  hbond: "氢键",
  hydrophobic: "疏水",
  contact: "接触",
};
export const TYPE_COLOR: Record<PocketResidue["type"], string> = {
  hbond: "#9C4A3C", // 砖红
  hydrophobic: "#B4761F", // 琥珀
  contact: "#2E6E6B", // 青
};

/* ---------- 砖红旗标（物种/方法/仅辅因子由 meta 派生；突变体为人工核对条目） ---------- */
export interface StepFlag {
  kind: "species" | "mutant" | "method" | "cofactor";
  text: string;
}

export function flagsFromMeta(meta: NormMeta): StepFlag[] {
  const flags: StepFlag[] = [];
  if (meta.holo.organismRaw && !/homo sapiens/i.test(meta.holo.organismRaw)) {
    flags.push({
      kind: "species",
      text: `物种不匹配：结合态结构来自${organismLabel(meta.holo.organismRaw)}（${meta.holo.organismRaw}），非人源蛋白，口袋残基编号不可直接对应人源序列。`,
    });
  }
  if (/electron/i.test(meta.holo.method)) {
    flags.push({
      kind: "method",
      text: "冷冻电镜（cryo-EM）结构：局部分辨率不均，侧链姿态置信度低于同分辨率 X-ray 晶体。",
    });
  }
  if (meta.cofactorOnly) {
    flags.push({
      kind: "cofactor",
      text: "仅辅因子/激活剂结合：不含底物坐标，3D 姿态不暗示底物结合方式。",
    });
  }
  return flags;
}

/** 人工核对的突变体旗标（literature-curated；结构本身为突变体复合物时提示） */
export const MUTANT_FLAGS: Record<string, StepFlag> = {
  "gk-1": {
    kind: "mutant",
    text: "结构来自突变体复合物：口袋几何与野生型可能存在个别残基差异，相互作用推断以晶体实测为准。",
  },
  "gk-10": {
    kind: "mutant",
    text: "结构来自突变体复合物：口袋几何与野生型可能存在个别残基差异，相互作用推断以晶体实测为准。",
  },
};

/** 证据强度：caveats 为空的步骤（如 gk-7）记为"证据完整"，作为对照样例 */
export function evidenceStrength(meta: NormMeta): { clean: boolean; note: string } {
  const n = meta.caveats.length;
  return n === 0
    ? { clean: true, note: "证据完整 · 零注意事项" }
    : { clean: false, note: `注意 ${n} 条` };
}

/* ---------- 环境/加载工具 ---------- */
export function hasWebGL(): boolean {
  try {
    const c = document.createElement("canvas");
    return !!(c.getContext("webgl2") ?? c.getContext("webgl"));
  } catch {
    return false;
  }
}

/** 低性能/触屏设备不自动加载 3D，需要用户显式点击 */
export function lowPowerDevice(): boolean {
  const cores = navigator.hardwareConcurrency ?? 8;
  const coarse = typeof matchMedia !== "undefined" && matchMedia("(pointer: coarse)").matches;
  return cores <= 4 || coarse;
}

export async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url} 加载失败（${res.status}）`);
  return (await res.json()) as T;
}

export async function fetchText(url: string): Promise<string> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url} 加载失败（${res.status}）`);
  return await res.text();
}

/** 手动触发降级分支（测试与演示用）：URL 带 ?degrade=1 */
export function manualDegrade(): boolean {
  return new URLSearchParams(window.location.search).has("degrade");
}
