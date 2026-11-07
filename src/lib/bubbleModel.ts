// ============================================================
// bubbleModel —— 内容气泡的唯一取数处
//
// 四类目标各自只读本层已有字段：
//   首页节点 / 首页步骤边  → homeMap + stepIndex 联表取 EC / ΔG（联表失败则不显示这两行）
//   挂图步骤 / 节点 / 表行 → 对应通路 json（ΔG / EC 有则显示）
//   结构页 2D 分子         → stepComparison + evidenceGrade + stepIndex 的 EC（无则省略）
// 任何字段缺失都返回 null，由 ContentBubble 整行不渲染；这里不补值、不估算。
// ============================================================
import {
  HOME_ALL_STEPS,
  HOME_EDGES,
  HOME_JUNCTIONS,
  HOME_NODES,
  HOME_PATHWAYS,
} from "../data/homeMap";
import { COMPARISON_CONFIGS } from "../data/comparisonConfig";
import { moleculeName, noteForMolecule } from "../data/moleculeNotes";
import { GRADE_LABEL, gradeOfPart } from "../data/evidenceGrade";
import {
  allStepEntries,
  stepDeltaGText,
  stepDirectionText,
  stepEC,
  stepEntryById,
  stepEquationText,
  stepOrganDiff,
  type StepEntry,
} from "../data/stepIndex";
import { gradesForStep } from "../data/evidenceGrade";
import type { MolPart, PartEvidence, StepComparison } from "../data/stepComparison";

export interface BubbleModel {
  /** 目标唯一键，用于同目标去重与缓存 */
  key: string;
  title: string;
  lines: string[];
  entry?: { label: string; href: string };
  /** 读屏只念这一句，不逐行朗读 */
  summary: string;
}

const PATHWAY_NAME = new Map<string, string>(
  HOME_PATHWAYS.map((meta): [string, string] => [meta.id, meta.name])
);
const PATHWAY_META = new Map<string, (typeof HOME_PATHWAYS)[number]>(
  HOME_PATHWAYS.map((meta): [string, (typeof HOME_PATHWAYS)[number]] => [meta.id, meta])
);
const NODE_BY_ID = new Map(HOME_NODES.map((node) => [node.id, node]));
const JUNCTION_BY_ENTITY = new Map(HOME_JUNCTIONS.map((junction) => [junction.entityId, junction]));
const EDGE_BY_ID = new Map(HOME_EDGES.map((edge) => [edge.id, edge]));
const HOME_STEP_BY_ID = new Map(HOME_ALL_STEPS.map((ref) => [`${ref.pathwayId}:${ref.stepId}`, ref]));

const COMPARISON_BY_STEP = new Map<string, StepComparison>();
for (const config of Object.values(COMPARISON_CONFIGS)) {
  for (const step of config.steps) COMPARISON_BY_STEP.set(step.stepId, step);
}

// ---------- 挂图节点索引（只用于「节点 → 相关步骤」，不用于补字段） ----------
const NODE_STEPS = new Map<string, StepEntry[]>();
for (const entry of allStepEntries()) {
  const entities = [
    ...(entry.step.substrates ?? entry.step.reaction?.substrates ?? []),
    ...(entry.step.products ?? entry.step.reaction?.products ?? []),
  ];
  for (const entityId of new Set(entities)) {
    const key = `${entry.pathwayId}:${entityId}`;
    const list = NODE_STEPS.get(key) ?? [];
    list.push(entry);
    NODE_STEPS.set(key, list);
  }
}

function stepKey(kind: string, id: string): string {
  return `${kind}:${id}`;
}

function stripUndefined(values: (string | null | undefined)[]): string[] {
  return values.filter((value): value is string => Boolean(value));
}

/** 气泡内容行按 21 个字符显式收口，避免依赖 CSS 的 nowrap + ellipsis */
const LINE_MAX = 21;
function fitLine(text: string, max: number): string {
  const chars = [...text];
  return chars.length <= max ? text : `${chars.slice(0, max - 1).join("")}…`;
}

/** 步骤行：按信息量优先级挑一个能完整放进 21 字的写法，尽量不出现省略号 */
function stepLine(item: StepEntry): string {
  const id = item.step.id;
  const name = item.step.name;
  const enzyme = item.step.enzyme?.name ?? null;
  const candidates = [
    `${id} · ${name}`,
    enzyme ? `${id} · ${enzyme}` : null,
    name,
    enzyme,
    id,
  ].filter((value): value is string => Boolean(value));
  for (const candidate of candidates) {
    if ([...candidate].length <= LINE_MAX) return candidate;
  }
  return fitLine(candidates[0], LINE_MAX);
}

/** 多候选行：取第一个能完整放下的，全都超长才收口 */
function pickLine(candidates: string[]): string {
  for (const candidate of candidates) {
    if ([...candidate].length <= LINE_MAX) return candidate;
  }
  return fitLine(candidates[0], LINE_MAX);
}

function gradeLine(stepId: string): string {
  const comparison = COMPARISON_BY_STEP.get(stepId);
  if (!comparison) return "证据 未分级（本步骤无结构对照块）";
  const block = gradesForStep(comparison);
  if (block.grade) {
    const differ = block.sidesDiffer
      ? `（两侧不一致：底物 ${block.substrate.grade ?? "未分级"} / 产物 ${block.product.grade ?? "未分级"}）`
      : "";
    return `证据 ${GRADE_LABEL[block.grade]}${differ}`;
  }
  if (block.calc || block.only2d) {
    return `覆盖 ${block.calc ? "计算构象" : ""}${block.calc && block.only2d ? " / " : ""}${block.only2d ? "仅2D" : ""}（不进 A–D）`;
  }
  return "证据 未分级（对照块内无实验坐标）";
}

// ---------- 挂图：步骤 / 表行 / 节点 ----------

export function posterBubbleModel(target: Element, pathwayId: string): BubbleModel | null {
  const stepEl = target.closest("[data-step-id], [data-plate-row]");
  const stepId = stepEl?.getAttribute("data-step-id") ?? stepEl?.getAttribute("data-plate-row");
  if (stepId) return stepModel(stepId, stepEl);

  const nodeId = target.closest("[data-node-id]")?.getAttribute("data-node-id");
  if (nodeId) return nodeModel(nodeId, pathwayId);

  return null;
}

function stepModel(stepId: string, stepEl: Element | null): BubbleModel | null {
  const entry = stepEntryById(stepId);
  if (!entry) return null;
  const { step } = entry;
  const meta = PATHWAY_META.get(entry.pathwayId);
  const title = step.index
    ? `${entry.pathwayName} · 第 ${step.index} 步 · ${step.name}`
    : `${entry.pathwayName} · 支路 · ${step.name}`;

  const enzymeName = step.enzyme?.name ?? null;
  const ec = stepEC(step);
  const equation = stepEquationText(step, entry.entityNames);
  const organ = isTableRow(stepEl) ? currentOrgan() : null;
  const organDiff = stepOrganDiff(step, organ);
  const deltaG = stepDeltaGText(step);
  const grade = gradeLine(stepId);

  const lines = stripUndefined([
    enzymeName ? `酶 ${enzymeName}${step.enzyme?.isozyme ? `（${step.enzyme.isozyme}）` : ""}` : null,
    ec ? `EC ${ec}` : null,
    stepDirectionText(step),
    equation ? `反应 ${equation}` : null,
    deltaG ? `ΔG ${deltaG}` : null,
    organDiff ? `本器官差异 ${organDiff}` : null,
    grade,
  ]).slice(0, 6);

  const entryLink =
    COMPARISON_BY_STEP.has(stepId) && meta?.structureRoute
      ? { label: "→ 结构对照", href: `${meta.structureRoute}?step=${encodeURIComponent(stepId)}` }
      : undefined;

  return {
    key: stepKey("step", stepId),
    title,
    lines,
    entry: entryLink,
    summary: `${title}。${enzymeName ?? ""}${ec ? `，EC ${ec}` : ""}。`,
  };
}

/** 挂图节点 id → 数据层 entity id（仅登记的差异项；未登记的原样返回） */
const PAGE_NODE_ENTITY: Record<string, string> = {
  hydroxy: "hydroxyacyl",
  keto: "ketoacyl",
  "acylcoa-short": "acylcoa",
  oxy: "oxidosqualene",
  "ipp-2": "ipp",
  "dmapp-2": "dmapp",
  ggpp: "fpp",
  "accoa-mito": "accoa",
  "accoa-cyt": "accoa",
  "acylacp-next": "acylacp",
};

function pageNodeEntity(nodeId: string): string {
  if (nodeId.startsWith("aa-chip-")) return nodeId.slice("aa-chip-".length);
  return PAGE_NODE_ENTITY[nodeId] ?? nodeId;
}

function nodeModel(nodeId: string, pathwayId: string): BubbleModel | null {
  // 挂图上的显示节点 id 与数据层 entity id 不总是一致（如 FAO 的 hydroxy→hydroxyacyl、
  // 氨基酸页的 aa-chip-glu→glu）；先归一到 entity id 再查步骤，档案则先按显示 id 查、再退回 entity id。
  const entityId = pageNodeEntity(nodeId);
  const related = NODE_STEPS.get(`${pathwayId}:${entityId}`) ?? [];
  const note = noteForMolecule(nodeId) ?? noteForMolecule(entityId);
  // 节点没登记进该通路步骤时（如 FAO 的脂酰肉碱、Cori 的 OAA），退回规范分子名，
  // 仍可给出角色/brief 两行；没有档案又没名字才整块不弹。
  const nodeName = related[0]?.entityNames.get(entityId) ?? (note ? moleculeName(nodeId) ?? moleculeName(entityId) : null);
  if (!nodeName) return null;

  const lines: string[] = [];
  if (note) lines.push(note.role, note.brief);
  if (related.length) lines.push(`相关步骤 ${related.length} 处`);

  // 有档案时步骤清单压到 2 条以内，每行挑能完整放下的写法（不靠 CSS 溢出截断）
  if (note) {
    for (const item of related.slice(0, 2)) lines.push(stepLine(item));
  } else {
    for (const item of related.slice(0, 3)) {
      lines.push(
        `${item.step.id} · ${item.step.name}${item.step.enzyme?.name ? ` · ${item.step.enzyme.name}` : ""}`
      );
    }
    if (related.length > 3) lines.push(`另 ${related.length - 3} 处`);
  }

  return {
    key: stepKey("node", `${pathwayId}:${nodeId}`),
    title: nodeName,
    lines: lines.slice(0, note ? 5 : 6),
    summary: note
      ? `${nodeName}。${note.role}。${related.length ? `相关步骤 ${related.length} 处。` : ""}`
      : `${nodeName}，相关步骤 ${related.length} 处。`,
  };
}

function isTableRow(stepEl: Element | null): boolean {
  return !!stepEl?.closest("[data-plate-row]");
}

function currentOrgan(): string | null {
  if (typeof window === "undefined") return null;
  return new URLSearchParams(window.location.search).get("organ");
}

// ---------- 首页：节点 / 步骤边 ----------

export function homeBubbleModel(target: Element): BubbleModel | null {
  const nodeId = target.closest("[data-node-id]")?.getAttribute("data-node-id");
  if (nodeId) return homeNodeModel(nodeId);

  const stepEl = target.closest("[data-step-id], [data-link-step]");
  if (!stepEl) return null;
  const edgeId = stepEl.getAttribute("data-edge-id") ?? stepEl.closest("[data-edge-id]")?.getAttribute("data-edge-id");
  if (edgeId) return homeEdgeModel(edgeId);

  const pathwayId = stepEl.getAttribute("data-pathway-id") ?? stepEl.getAttribute("data-link-pathway");
  const stepId = stepEl.getAttribute("data-step-id") ?? stepEl.getAttribute("data-link-step");
  return pathwayId && stepId ? homeStepModel(pathwayId, stepId) : null;
}

function homeNodeModel(nodeId: string): BubbleModel | null {
  const node = NODE_BY_ID.get(nodeId);
  if (!node) return null;
  const junction = JUNCTION_BY_ENTITY.get(nodeId) ?? null;
  const names = node.pathwayIds.map((id) => PATHWAY_NAME.get(id) ?? id);
  const note = noteForMolecule(nodeId);

  const lines: string[] = [];
  if (note) lines.push(note.role, note.brief);
  const firstPathway = names[0] ?? "";
  lines.push(
    note
      ? `涉及通路：${firstPathway}${names.length > 1 ? ` 等 ${names.length} 条` : ""}`
      : `涉及通路 ${names.join(" · ")}`
  );

  const repStepId = representativeStepId(node);
  const repEntry = repStepId ? stepEntryById(repStepId) : null;
  const ec = repEntry ? stepEC(repEntry.step) : null;
  const deltaG = repEntry ? stepDeltaGText(repEntry.step) : null;
  const repEnzyme = repEntry?.step.enzyme?.name ?? null;
  if (repStepId && ec) {
    const withEnzyme = `EC ${ec}${repEnzyme ? ` · ${repEnzyme}` : ""}`;
    const shortEc = ec.replace(/（[^）]*）/g, "").split(/[；;/]/)[0].trim();
    lines.push(
      note ? pickLine([withEnzyme, `EC ${ec}`, `EC ${shortEc}`]) : `${withEnzyme}（${repStepId}）`
    );
  }
  if (repStepId && deltaG) {
    const shortDelta = deltaG.replace(/（[^）]*）/g, "").split(/[，；]/)[0].trim();
    lines.push(
      note ? pickLine([`ΔG ${deltaG}`, `ΔG ${shortDelta}`]) : `ΔG ${deltaG}（${repStepId}）`
    );
  }

  // 有档案时角色/brief 优先，「共用节点」条数退到末行；总行数封顶 5 行
  if (junction) lines.push(`共用节点 ${junction.occurrences.length} 处`);
  else lines.push("本通路专用节点");

  // 无档案时保留原有「共用节点」清单；有档案时让位给角色/brief，总行数封顶 5 行
  if (!note && junction) {
    for (const occurrence of junction.occurrences.slice(0, 3)) {
      lines.push(
        `${occurrence.stepId} · ${occurrence.stepName} · ${occurrence.enzyme} · ${PATHWAY_NAME.get(occurrence.pathwayId) ?? occurrence.pathwayId} · ${occurrence.via}`
      );
    }
    if (junction.occurrences.length > 3) lines.push(`另 ${junction.occurrences.length - 3} 处`);
  }

  const keep = note ? 5 : 6;
  return {
    key: stepKey("home-node", nodeId),
    title: node.abbr ? `${node.fullName}（${node.abbr}）` : node.fullName,
    lines: (note ? lines.map((line) => fitLine(line, LINE_MAX)) : lines).slice(0, keep),
    summary: note
      ? `${node.fullName}。${note.role}。涉及 ${names.length} 条通路。`
      : `${node.fullName}，涉及 ${names.length} 条通路。`,
  };
}

/**
 * 首页节点的代表步骤：按 node.pathwayIds 顺序，优先取该通路里生成此节点的边（to=node）；
 * 源头节点没有入边时取消耗它的边（from=node）。只作 EC / ΔG 的联表入口，
 * 联表失败（无 primaryStepId 或步骤不存在）由调用方整行不渲染。
 */
function representativeStepId(node: (typeof HOME_NODES)[number]): string | null {
  for (const pathwayId of node.pathwayIds) {
    const incoming = HOME_EDGES.find(
      (edge) => edge.pathwayId === pathwayId && edge.to === node.id && edge.primaryStepId
    );
    if (incoming?.primaryStepId) return incoming.primaryStepId;
    const outgoing = HOME_EDGES.find(
      (edge) => edge.pathwayId === pathwayId && edge.from === node.id && edge.primaryStepId
    );
    if (outgoing?.primaryStepId) return outgoing.primaryStepId;
  }
  return null;
}

function homeEdgeModel(edgeId: string): BubbleModel | null {
  const edge = EDGE_BY_ID.get(edgeId);
  if (!edge) return null;
  const pathwayName = PATHWAY_NAME.get(edge.pathwayId) ?? edge.pathwayId;
  const stepRef = edge.primaryStepId
    ? HOME_STEP_BY_ID.get(`${edge.pathwayId}:${edge.primaryStepId}`) ?? null
    : null;

  const entry = edge.primaryStepId ? stepEntryById(edge.primaryStepId) : null;
  const ec = entry ? stepEC(entry.step) : null;
  const deltaG = entry ? stepDeltaGText(entry.step) : null;

  const lines: string[] = stripUndefined([
    stepRef ? `${stepRef.stepId} · ${stepRef.stepName}` : null,
    edge.enzyme ? `酶 ${edge.enzyme}` : null,
    ec ? `EC ${ec}` : null,
    deltaG ? `ΔG ${deltaG}` : null,
    `${edge.irreversible ? "不可逆" : "可逆"} · ${edge.kind === "main" ? "主链" : edge.kind}`,
    `来源 ${edge.sources.length} 处${edge.sources.length ? ` · ${edge.sources.map((source) => source.linkType).join(" / ")}` : ""}`,
  ]);

  return {
    key: stepKey("home-edge", edgeId),
    title: `${pathwayName} · ${edge.crossLabel ?? edgeId}`,
    lines: lines.slice(0, 6),
    summary: `${pathwayName}，${stepRef?.stepName ?? edge.enzyme}，${edge.irreversible ? "不可逆" : "可逆"}。`,
  };
}

function homeStepModel(pathwayId: string, stepId: string): BubbleModel | null {
  const ref = HOME_STEP_BY_ID.get(`${pathwayId}:${stepId}`);
  if (!ref) return null;
  return {
    key: stepKey("home-step", `${pathwayId}:${stepId}`),
    title: `${PATHWAY_NAME.get(pathwayId) ?? pathwayId} · ${stepId}`,
    lines: stripUndefined([`步骤 ${ref.stepName}`, `酶 ${ref.enzyme}`, ref.kind === "main" ? "主链" : "支路"]).slice(0, 6),
    summary: `${pathwayId} ${stepId}，${ref.stepName}。`,
  };
}

// ---------- 结构页：2D 分子 ----------

export function structureBubbleModel(target: Element): BubbleModel | null {
  const molId = target.getAttribute("data-mol-id");
  if (!molId) return null;
  const stepId = target.closest("[data-step-id]")?.getAttribute("data-step-id") ?? null;
  if (!stepId) return null;
  const comparison = COMPARISON_BY_STEP.get(stepId);
  if (!comparison) return null;

  const side = comparison.substrate.parts.some((part) => part.id === molId)
    ? { label: "底物", parts: comparison.substrate.parts, evidence: comparison.evidence?.substrate ?? [] }
    : comparison.product.parts.some((part) => part.id === molId)
      ? { label: "产物", parts: comparison.product.parts, evidence: comparison.evidence?.product ?? [] }
      : null;
  if (!side) return null;
  const part = side.parts.find((item) => item.id === molId);
  if (!part) return null;

  const evidence = side.evidence.find((item) => item.molId === molId) ?? null;
  const gradeText = partGradeText(evidence);
  const entry = stepEntryById(stepId);
  const ec = entry ? stepEC(entry.step) : null;

  const lines: string[] = stripUndefined([
    `本步 ${comparison.enzyme}${comparison.isozyme ? `（${comparison.isozyme}）` : ""}${ec ? ` · EC ${ec}` : ""} 的${side.label}`,
    comparison.equation ? `反应 ${comparison.equation}` : comparison.change ? `变化 ${comparison.change}` : null,
    part.marks?.length ? `标注 ${part.marks.map((mark) => mark.name).join(" · ")}` : null,
    part.caveat ? `提醒 ${part.caveat}` : null,
    part.sourceNote ? `来源 ${part.sourceNote}` : null,
    part.no3dReason ? `3D 无资产 ${part.no3dReason}` : null,
    gradeText,
  ]).slice(0, 6);

  return {
    key: stepKey("mol", `${stepId}:${molId}`),
    title: `${part.name} · ${part.formula}`,
    lines,
    summary: `${part.name}，${comparison.enzyme} 的${side.label}，${gradeText}。`,
  };
}

function partGradeText(evidence: PartEvidence | null): string {
  if (!evidence) return "证据 未分级（缺 evidence 字段）";
  const grade = gradeOfPart(evidence);
  if (grade.grade) return `证据 ${GRADE_LABEL[grade.grade]}`;
  if (grade.coverage === "calc") return "覆盖 计算构象（不进 A–D）";
  if (grade.coverage === "2d") return "覆盖 仅2D（不进 A–D）";
  return `证据 未分级（${grade.ungradedReason ?? "缺 pocketRole / species"}）`;
}

// 类型仅用于外部接线时的标注，避免未使用告警。
export type BubbleMolPart = MolPart;
