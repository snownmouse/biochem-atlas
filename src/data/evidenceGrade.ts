// ============================================================
// evidenceGrade —— 证据等级的唯一推导处
//
// 口径（页面与冒烟共用，禁止在配置或组件里手写 A/B/C/D）：
//   A 本酶人源   = coordSource experimental + pocketRole own   + species human
//   B 本酶跨种   = coordSource experimental + pocketRole own   + species nonhuman
//   C 人源非本酶 = coordSource experimental + pocketRole other + species human
//   D 跨种非本酶 = coordSource experimental + pocketRole other + species nonhuman
//   computed（RDKit 自由态）与 none（仅 2D，如 CO₂/HCO₃⁻）不进入 A–D，只作覆盖标签。
//
// 块级等级 = 两侧所有实验坐标分子的最差等级（D > C > B > A），避免“半好半坏”被高等级掩盖；
// 两侧等级各自保留，用于指出底物/产物证据不一致。
// 字段缺失或与 parts 对不上时记入 ungraded，页面显式呈现「未分级」，不猜、不硬塞。
// ============================================================
import type { PartEvidence, StepComparison } from "./stepComparison";

export type EvidenceGrade = "A" | "B" | "C" | "D";
export type CoverageTag = "calc" | "2d";
export type GradeFilterToken = EvidenceGrade | CoverageTag;

export interface PartGrade {
  molId: string;
  grade: EvidenceGrade | null;
  coverage: CoverageTag | null;
  /** 无法判定时的原因（如实列出，不强行归级） */
  ungradedReason?: string;
}

export interface SideGrade {
  grade: EvidenceGrade | null;
  parts: PartGrade[];
  calc: boolean;
  only2d: boolean;
  ungraded: string[];
}

export interface BlockGrade {
  grade: EvidenceGrade | null;
  substrate: SideGrade;
  product: SideGrade;
  calc: boolean;
  only2d: boolean;
  ungraded: string[];
  /** 两侧都有实验等级但不同（“半好半坏”） */
  sidesDiffer: boolean;
}

export const GRADE_RANK: Record<EvidenceGrade, number> = { A: 0, B: 1, C: 2, D: 3 };

export const GRADE_LABEL: Record<EvidenceGrade, string> = {
  A: "A 本酶人源",
  B: "B 本酶跨种",
  C: "C 人源非本酶",
  D: "D 跨种非本酶",
};

/** URL 参数与页头勾选的固定顺序（写回 URL 时也按这个顺序） */
export const GRADE_FILTER_TOKENS: GradeFilterToken[] = ["A", "B", "C", "D", "calc", "2d"];

export const GRADE_FILTER_LABEL: Record<GradeFilterToken, string> = {
  A: "A",
  B: "B",
  C: "C",
  D: "D",
  calc: "计算构象",
  "2d": "仅2D",
};

/** 单分子的等级推导：唯一的 if 分支就在这里，其它地方只读结果 */
export function gradeOfPart(ev: PartEvidence): PartGrade {
  if (ev.coordSource === "computed") {
    return { molId: ev.molId, grade: null, coverage: "calc" };
  }
  if (ev.coordSource === "none") {
    return { molId: ev.molId, grade: null, coverage: "2d" };
  }
  if (!ev.pocketRole || !ev.species) {
    return {
      molId: ev.molId,
      grade: null,
      coverage: null,
      ungradedReason: `${ev.molId}：实验坐标缺 pocketRole / species`,
    };
  }
  if (ev.pocketRole === "own") {
    return { molId: ev.molId, grade: ev.species === "human" ? "A" : "B", coverage: null };
  }
  return { molId: ev.molId, grade: ev.species === "human" ? "C" : "D", coverage: null };
}

function worstOf(parts: PartGrade[]): EvidenceGrade | null {
  let worst: EvidenceGrade | null = null;
  for (const p of parts) {
    if (!p.grade) continue;
    if (!worst || GRADE_RANK[p.grade] > GRADE_RANK[worst]) worst = p.grade;
  }
  return worst;
}

function sideGrade(evidence: PartEvidence[], partIds: string[], sideLabel: string): SideGrade {
  const parts = evidence.map(gradeOfPart);
  const ungraded: string[] = parts
    .map((p) => p.ungradedReason)
    .filter((r): r is string => !!r);
  const known = new Set(partIds);
  for (const ev of evidence) {
    if (!known.has(ev.molId)) {
      ungraded.push(`${sideLabel}：evidence 的 ${ev.molId} 不在 parts 中`);
    }
  }
  const covered = new Set(evidence.map((e) => e.molId));
  for (const id of partIds) {
    if (!covered.has(id)) ungraded.push(`${sideLabel}：${id} 缺 evidence 字段`);
  }
  return {
    grade: worstOf(parts),
    parts,
    calc: parts.some((p) => p.coverage === "calc"),
    only2d: parts.some((p) => p.coverage === "2d"),
    ungraded,
  };
}

/** 一步的块级等级：取两侧最差实验等级；computed / none 只作覆盖标签 */
export function gradesForStep(step: StepComparison): BlockGrade {
  const subIds = step.substrate.parts.map((p) => p.id);
  const prodIds = step.product.parts.map((p) => p.id);
  const empty: SideGrade = { grade: null, parts: [], calc: false, only2d: false, ungraded: [] };
  const substrate = step.evidence
    ? sideGrade(step.evidence.substrate, subIds, "底物")
    : { ...empty, ungraded: ["缺 evidence 字段"] };
  const product = step.evidence
    ? sideGrade(step.evidence.product, prodIds, "产物")
    : { ...empty, ungraded: ["缺 evidence 字段"] };
  const grade = worstOf([...substrate.parts, ...product.parts]);
  return {
    grade,
    substrate,
    product,
    calc: substrate.calc || product.calc,
    only2d: substrate.only2d || product.only2d,
    ungraded: [...substrate.ungraded, ...product.ungraded],
    sidesDiffer: !!substrate.grade && !!product.grade && substrate.grade !== product.grade,
  };
}

/** 解析 ?grade=A,C,calc,2d；未知 token 忽略，空串=不过滤 */
export function parseGradeFilter(raw: string | null): Set<GradeFilterToken> {
  const out = new Set<GradeFilterToken>();
  if (!raw) return out;
  for (const token of raw.split(",")) {
    const t = token.trim().toLowerCase();
    if (t === "a") out.add("A");
    else if (t === "b") out.add("B");
    else if (t === "c") out.add("C");
    else if (t === "d") out.add("D");
    else if (t === "calc") out.add("calc");
    else if (t === "2d") out.add("2d");
  }
  return out;
}

/** 写回 URL 的顺序稳定（A,B,C,D,calc,2d），空集合返回 null（由调用方删除参数） */
export function serializeGradeFilter(selected: Set<GradeFilterToken>): string | null {
  const ordered = GRADE_FILTER_TOKENS.filter((t) => selected.has(t));
  return ordered.length ? ordered.join(",") : null;
}

/**
 * 筛选语义：空勾选=不过滤；否则「块级等级命中」或「覆盖标签命中」即保留。
 * 计算构象 / 仅2D 是覆盖标签，可与 A–D 同时命中（页面会写明这一点）。
 */
export function matchesGradeFilter(g: BlockGrade, selected: Set<GradeFilterToken>): boolean {
  if (selected.size === 0) return true;
  if (g.grade && selected.has(g.grade)) return true;
  if (g.calc && selected.has("calc")) return true;
  if (g.only2d && selected.has("2d")) return true;
  return false;
}
