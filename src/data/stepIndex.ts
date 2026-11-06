// ============================================================
// stepIndex —— 气泡详情的只读步骤索引
//
// 目的：把 12 份通路 json 里的 Step 归一成同一个只读结构，供内容气泡按
// 「pathwayId + stepId」取字段。这里不做任何计算、不补缺省值：
//   - EC 只在 step.ecNumber 或 step.enzyme.ec 存在时返回；
//   - ΔG 只按 json 已有的定性字段读出文本；数值一律 null，不显示数字；
//   - 器官差异只取当前 organ 的原文。
// 字段缺失一律返回 null，由气泡决定整行不显示。
// ============================================================
import glycolysis from "./glycolysis.json";
import tca from "./tca.json";
import gluconeogenesis from "./gluconeogenesis/gluconeogenesis.json";
import ppp from "./ppp/ppp.json";
import fao from "./fatty-acid-oxidation/fao.json";
import urea from "./urea-cycle/urea.json";
import glycogen from "./glycogen/glycogen.json";
import amino from "./amino-acid/amino.json";
import cholesterol from "./cholesterol/cholesterol.json";
import fas from "./fatty-acid-synthesis/fas.json";
import oxphos from "./oxphos/oxphos.json";
import cori from "./cori/cori.json";
import { HOME_PATHWAYS } from "./homeMap";

export interface DeltaGLike {
  standard?: number | null;
  physiological?: number | null;
  unit?: string;
  source?: string;
  note?: string;
  value?: number | null;
  qualitative?: string;
}

export interface StepLike {
  id: string;
  index?: number | null;
  name: string;
  equation?: string;
  reaction?: {
    substrates?: string[];
    products?: string[];
    equation?: string;
    cofactors?: string[];
  };
  substrates?: string[];
  products?: string[];
  enzyme?: { entityId?: string; name?: string; abbr?: string; isozyme?: string; ec?: string };
  ecNumber?: string;
  irreversible?: boolean;
  direction?: string;
  deltaG?: DeltaGLike;
  organDiffs?: { organ: string; text: string }[];
  organDifference?: string;
}

interface PathwayFile {
  id?: string;
  name?: string;
  entities?: { id: string; name: string }[];
  steps?: StepLike[];
  sideBranchSteps?: StepLike[];
}

export interface StepEntry {
  pathwayId: string;
  pathwayName: string;
  route: string;
  structureRoute: string | null;
  step: StepLike;
  entityNames: Map<string, string>;
}

const FILES: { id: string; name: string; route: string; structureRoute: string | null; data: unknown }[] = [
  { id: "glycolysis", name: "糖酵解", route: "/pathway/glycolysis", structureRoute: "/structures/glycolysis", data: glycolysis },
  { id: "tca", name: "三羧酸循环", route: "/pathway/tca", structureRoute: "/structures/tca", data: tca },
  { id: "gluconeogenesis", name: "糖异生", route: "/pathway/gluconeogenesis", structureRoute: "/structures/gluconeogenesis", data: gluconeogenesis },
  { id: "ppp", name: "磷酸戊糖途径", route: "/pathway/ppp", structureRoute: "/structures/ppp", data: ppp },
  { id: "fatty-acid-oxidation", name: "β-氧化", route: "/pathway/fao", structureRoute: "/structures/fatty-acid-oxidation", data: fao },
  { id: "urea-cycle", name: "尿素循环", route: "/pathway/urea", structureRoute: "/structures/urea-cycle", data: urea },
  { id: "glycogen", name: "糖原代谢", route: "/pathway/glycogen", structureRoute: "/structures/glycogen", data: glycogen },
  { id: "amino-acids", name: "氨基酸代谢", route: "/pathway/amino-acids", structureRoute: "/structures/amino-acids", data: amino },
  { id: "cholesterol", name: "胆固醇合成", route: "/pathway/cholesterol", structureRoute: "/structures/cholesterol", data: cholesterol },
  { id: "fatty-acid-synthesis", name: "脂肪酸从头合成", route: "/pathway/fas", structureRoute: "/structures/fatty-acid-synthesis", data: fas },
  { id: "oxphos", name: "氧化磷酸化", route: "/pathway/oxphos", structureRoute: "/structures/oxphos", data: oxphos },
  // Cori 页引用既有步骤，自身没有结构对照页。
  { id: "cori", name: "Cori 循环", route: "/pathway/cori", structureRoute: null, data: cori },
];

// 路线以 homeMap 的元数据为准（它是导航檐的唯一口径），未收录的通路用上表兜底。
const META_BY_ID = new Map<string, (typeof HOME_PATHWAYS)[number]>(
  HOME_PATHWAYS.map((meta): [string, (typeof HOME_PATHWAYS)[number]] => [meta.id, meta]),
);

function entityNameMap(data: PathwayFile): Map<string, string> {
  const map = new Map<string, string>();
  for (const entity of data.entities ?? []) map.set(entity.id, entity.name);
  return map;
}

const entriesById = new Map<string, StepEntry>();

for (const file of FILES) {
  const data = file.data as PathwayFile;
  const meta = META_BY_ID.get(file.id);
  const entryBase = {
    pathwayId: file.id,
    pathwayName: meta?.name ?? data.name ?? file.name,
    route: meta?.route ?? file.route,
    structureRoute: meta?.structureRoute ?? file.structureRoute,
    entityNames: entityNameMap(data),
  };
  const steps = [...(data.steps ?? []), ...(data.sideBranchSteps ?? [])];
  for (const step of steps) {
    if (!step?.id) continue;
    entriesById.set(step.id, { ...entryBase, step });
  }
}

export function stepEntryById(stepId: string | null | undefined): StepEntry | null {
  if (!stepId) return null;
  return entriesById.get(stepId) ?? null;
}

/** 全部已索引步骤（气泡建节点索引用；只读，不改变任何字段）。 */
export function allStepEntries(): StepEntry[] {
  return [...entriesById.values()];
}

/** EC 只认已有字段：旧口径在 step.ecNumber，新口径在 step.enzyme.ec。 */
export function stepEC(step: StepLike): string | null {
  return step.ecNumber ?? step.enzyme?.ec ?? null;
}

/** ΔG 只按数据层形态读出，null 不补 0、不估算。 */
export function stepDeltaGText(step: StepLike): string | null {
  const dg = step.deltaG;
  if (!dg) return null;
  const unit = dg.unit ?? "kJ/mol";
  if (typeof dg.value === "number") {
    return `数值 ${dg.value} ${unit}${dg.qualitative ? ` · ${dg.qualitative}` : ""}`;
  }
  if (typeof dg.standard === "number" || typeof dg.physiological === "number") {
    const parts: string[] = [];
    if (typeof dg.standard === "number") parts.push(`标准 ${dg.standard}`);
    if (typeof dg.physiological === "number") parts.push(`生理 ${dg.physiological}`);
    return `${parts.join(" / ")} ${unit}${dg.note ? `（${dg.note}）` : ""}`;
  }
  if (dg.qualitative) return dg.qualitative;
  return null;
}

export function stepEquationText(step: StepLike, entityNames: Map<string, string>): string | null {
  if (step.equation) return step.equation;
  if (step.reaction?.equation) return step.reaction.equation;
  const substrates = step.substrates ?? step.reaction?.substrates ?? [];
  const products = step.products ?? step.reaction?.products ?? [];
  if (!substrates.length || !products.length) return null;
  const name = (id: string) => entityNames.get(id) ?? id;
  return `${substrates.map(name).join(" + ")} → ${products.map(name).join(" + ")}`;
}

export function stepOrganDiff(step: StepLike, organ: string | null): string | null {
  if (organ) {
    const hit = step.organDiffs?.find((item) => item.organ === organ);
    if (hit?.text) return hit.text;
  }
  return null;
}

export function stepDirectionText(step: StepLike): string | null {
  if (typeof step.irreversible === "boolean") return step.irreversible ? "不可逆" : "可逆";
  if (step.direction === "forward") return "体内单向";
  if (step.direction === "reversible") return "可逆 / 近平衡";
  return null;
}
