import glycolysisJson from "./glycolysis.json";
import tcaJson from "./tca.json";
import pppJson from "./ppp/ppp.json";
import gluconeogenesisJson from "./gluconeogenesis/gluconeogenesis.json";
import faoJson from "./fatty-acid-oxidation/fao.json";
import oxphosJson from "./oxphos/oxphos.json";
import glycolysisSkeleton from "./skeleton.json";
import tcaSkeleton from "./skeleton-tca.json";
import pppSkeleton from "./ppp/skeleton.json";
import gluconeogenesisSkeleton from "./gluconeogenesis/skeleton.json";
import faoSkeleton from "./fatty-acid-oxidation/skeleton.json";
import oxphosSkeleton from "./oxphos/skeleton.json";

export type HomePathwayId =
  | "glycolysis"
  | "tca"
  | "gluconeogenesis"
  | "ppp"
  | "fatty-acid-oxidation"
  | "oxphos";

export interface HomePathwayMeta {
  id: HomePathwayId;
  sourceId: string;
  name: string;
  en: string;
  route: string;
  structureRoute: string;
  plateNo: string;
  stepCount: number;
  accent: "ink" | "teal" | "amber" | "brick";
}

export const HOME_PATHWAYS: HomePathwayMeta[] = [
  {
    id: "glycolysis",
    sourceId: "glycolysis",
    name: "糖酵解",
    en: "GLYCOLYSIS",
    route: "/pathway/glycolysis",
    structureRoute: "/structures/glycolysis",
    plateNo: "PLATE 01",
    stepCount: 10,
    accent: "ink",
  },
  {
    id: "tca",
    sourceId: "tca",
    name: "三羧酸循环",
    en: "TCA CYCLE",
    route: "/pathway/tca",
    structureRoute: "/structures/tca",
    plateNo: "PLATE 02",
    stepCount: 8,
    accent: "amber",
  },
  {
    id: "gluconeogenesis",
    sourceId: "gluconeogenesis",
    name: "糖异生",
    en: "GLUCONEOGENESIS",
    route: "/pathway/gluconeogenesis",
    structureRoute: "/structures/gluconeogenesis",
    plateNo: "PLATE 03",
    stepCount: 11,
    accent: "ink",
  },
  {
    id: "ppp",
    sourceId: "pentose-phosphate",
    name: "磷酸戊糖途径",
    en: "PENTOSE PHOSPHATE PATHWAY",
    route: "/pathway/ppp",
    structureRoute: "/structures/ppp",
    plateNo: "PLATE 04",
    stepCount: 8,
    accent: "teal",
  },
  {
    id: "fatty-acid-oxidation",
    sourceId: "fatty-acid-oxidation",
    name: "β-氧化",
    en: "β-OXIDATION",
    route: "/pathway/fatty-acid-oxidation",
    structureRoute: "/structures/fatty-acid-oxidation",
    plateNo: "PLATE 05",
    stepCount: 6,
    accent: "amber",
  },
  {
    id: "oxphos",
    sourceId: "oxphos",
    name: "氧化磷酸化",
    en: "OXPHOS",
    route: "/pathway/oxphos",
    structureRoute: "/structures/oxphos",
    plateNo: "PLATE 06",
    stepCount: 7,
    accent: "teal",
  },
];

/**
 * 结构对照页的分子资产 id 与数据层实体 id 的显式映射。
 * 这些不是“另一个分子”，只是资产文件命名沿用旧口径；
 * 首页合并以数据层实体 id 为准，资产 id 仅用于对照页跳转与来源核对。
 */
export const ASSET_ID_ALIASES: { assetId: string; entityId: string; basis: string }[] = [
  { assetId: "gap", entityId: "g3p", basis: "PPP/糖异生对照页资产把 GAP 写作 gap；数据层实体为 g3p" },
  { assetId: "bpg13", entityId: "13bpg", basis: "结构资产把 1,3-BPG 写作 bpg13；数据层实体为 13bpg" },
  { assetId: "pyr-gn", entityId: "pyr", basis: "糖异生对照页的丙酮酸资产别名" },
  { assetId: "fbp-gn", entityId: "fbp", basis: "糖异生对照页的 FBP 资产别名" },
  { assetId: "fbp-linear", entityId: "fbp", basis: "FBP 线形构象资产是同一分子的另一构象" },
  { assetId: "f6p-gn", entityId: "f6p", basis: "糖异生对照页的 F6P 资产别名" },
  { assetId: "g6p-g6pd", entityId: "g6p", basis: "PPP 对照页的 G6P 资产别名" },
  { assetId: "6pg-l", entityId: "6pg", basis: "6-磷酸葡糖酸内酯/酸资产命名差异" },
  { assetId: "ru5p-i", entityId: "ru5p", basis: "核酮糖-5-磷酸异构体资产别名" },
  { assetId: "acylcoa-c16", entityId: "acylcoa", basis: "C16 脂酰-CoA 资产，碳链长度是同一实体的参数" },
  { assetId: "acylcoa-c14", entityId: "acylcoa", basis: "C14 脂酰-CoA 资产，碳链长度是同一实体的参数" },
  { assetId: "enoyl-c16", entityId: "enoyl", basis: "C16 烯酰-CoA 资产别名" },
  { assetId: "hydroxy-c16", entityId: "hydroxyacyl", basis: "C16 羟脂酰-CoA 资产别名" },
  { assetId: "keto-c16", entityId: "ketoacyl", basis: "C16 酮脂酰-CoA 资产别名" },
];

const ASSET_ALIAS_LOOKUP = new Map(ASSET_ID_ALIASES.map((a) => [a.assetId, a.entityId]));

export function resolveAssetId(assetId: string): string {
  return ASSET_ALIAS_LOOKUP.get(assetId) ?? assetId;
}

interface RawEntity {
  id: string;
  name: string;
  abbr?: string;
  kind: string;
}

interface RawStep {
  id: string;
  index: number | null;
  name: string;
  kind?: string;
  substrates: string[];
  products: string[];
  enzyme: { entityId: string; name: string; isozyme?: string };
  cofactors: string[];
  irreversible: boolean;
}

interface RawTransport {
  id: string;
  name: string;
  from: string;
  via?: string | null;
  to: string;
}

interface RawNode {
  id: string;
  entityId?: string;
  kind?: string;
  label?: string;
  compartment?: string;
}

interface RawLink {
  from: string;
  to: string;
  stepId?: string;
  type?: string;
  interfaceId?: string;
  label?: string;
}

interface RawSkeleton {
  nodes: RawNode[];
  links: RawLink[];
  transportSteps?: RawTransport[];
}

interface RawPathway {
  id: string;
  name: string;
  entities: RawEntity[];
  steps: RawStep[];
  sideBranchSteps?: RawStep[];
}

interface SourcePathway {
  meta: HomePathwayMeta;
  pathway: RawPathway;
  skeleton: RawSkeleton;
}

const SOURCES: SourcePathway[] = [
  { meta: HOME_PATHWAYS[0], pathway: glycolysisJson as unknown as RawPathway, skeleton: glycolysisSkeleton as unknown as RawSkeleton },
  { meta: HOME_PATHWAYS[1], pathway: tcaJson as unknown as RawPathway, skeleton: tcaSkeleton as unknown as RawSkeleton },
  {
    meta: HOME_PATHWAYS[2],
    pathway: gluconeogenesisJson as unknown as RawPathway,
    skeleton: gluconeogenesisSkeleton as unknown as RawSkeleton,
  },
  { meta: HOME_PATHWAYS[3], pathway: pppJson as unknown as RawPathway, skeleton: pppSkeleton as unknown as RawSkeleton },
  {
    meta: HOME_PATHWAYS[4],
    pathway: faoJson as unknown as RawPathway,
    skeleton: faoSkeleton as unknown as RawSkeleton,
  },
  {
    meta: HOME_PATHWAYS[5],
    pathway: oxphosJson as unknown as RawPathway,
    skeleton: oxphosSkeleton as unknown as RawSkeleton,
  },
];

/** 不在总图上建节点：辅因子、离去小分子与旁支产物，以文字注记代替。 */
const SKIP_ENTITIES = new Set([
  "co2",
  "h2o",
  "hco3",
  "carn",
  "coa",
  "atp",
  "amp",
  "ppi",
  "fad",
  "nad",
  "nadp",
  "nadph",
  "glu",
  "23bpg",
  // 呼吸链的中间载体不在总图上重复画节点：Q 池是唯一显式的公共入口，
  // QH₂ / cyt c / O₂ 以氧化磷酸化挂图内的模块与箭头呈现。
  "qh2",
  "cytc",
  "o2",
  "pi",
]);

const SHORT_LABELS: Record<string, string> = {
  glc: "葡萄糖",
  g6p: "G6P",
  f6p: "F6P",
  fbp: "FBP",
  dhap: "DHAP",
  g3p: "G3P",
  "13bpg": "1,3-BPG",
  "3pg": "3PG",
  "2pg": "2PG",
  pep: "PEP",
  pyr: "丙酮酸",
  oaa: "草酰乙酸",
  cit: "柠檬酸",
  icit: "异柠檬酸",
  akg: "α-KG",
  succoa: "琥珀酰-CoA",
  suc: "琥珀酸",
  fum: "延胡索酸",
  mal: "苹果酸",
  accoa: "乙酰-CoA",
  "6pgl": "6PGL",
  "6pg": "6PG",
  ru5p: "Ru5P",
  r5p: "R5P",
  xu5p: "Xu5P",
  s7p: "S7P",
  e4p: "E4P",
  lac: "乳酸",
  ala: "丙氨酸",
  fa: "脂肪酸 C16",
  acylcoa: "脂酰-CoA",
  acylcarn: "脂酰肉碱",
  enoyl: "烯酰-CoA",
  hydroxyacyl: "3-羟脂酰-CoA",
  ketoacyl: "3-酮脂酰-CoA",
  nadh: "NADH",
  fadh2: "FADH₂",
  q: "Q",
};

export interface HomeNode {
  id: string;
  label: string;
  fullName: string;
  abbr: string;
  pathwayIds: HomePathwayId[];
  junction: boolean;
}

export interface HomeEdgeSource {
  pathwayId: HomePathwayId;
  stepId: string | null;
  linkType: string;
}

export interface HomeEdge {
  id: string;
  from: string;
  to: string;
  pathwayId: HomePathwayId;
  sources: HomeEdgeSource[];
  stepIds: string[];
  primaryStepId: string | null;
  enzyme: string;
  chem?: string;
  irreversible: boolean;
  kind: string;
  crossLabel?: string;
}

export interface JunctionOccurrence {
  pathwayId: HomePathwayId;
  stepId: string;
  stepName: string;
  enzyme: string;
  via: "main" | "side" | "transport";
}

export interface HomeJunction {
  entityId: string;
  label: string;
  fullName: string;
  pathwayIds: HomePathwayId[];
  occurrences: JunctionOccurrence[];
}

const globalEntities = new Map<string, RawEntity>();
const pathwayEntities = new Map<HomePathwayId, Map<string, RawEntity>>();

for (const source of SOURCES) {
  const map = new Map<string, RawEntity>();
  for (const entity of source.pathway.entities) {
    map.set(entity.id, entity);
    if (!globalEntities.has(entity.id)) globalEntities.set(entity.id, entity);
  }
  pathwayEntities.set(source.meta.id, map);
}

const nodeEntityLookup = new Map<HomePathwayId, Map<string, string>>();

for (const source of SOURCES) {
  const map = new Map<string, string>();
  for (const node of source.skeleton.nodes) {
    if (node.kind === "interface") continue;
    const entityId = node.entityId ?? node.id;
    map.set(node.id, entityId);
  }
  nodeEntityLookup.set(source.meta.id, map);
}

function entityOf(pathwayId: HomePathwayId, nodeId: string): string | undefined {
  return nodeEntityLookup.get(pathwayId)?.get(nodeId);
}

/** 图上酶名与代谢物缩写撞名时的显示口径（仅改文字，不改数据）。 */
const ENZYME_LABEL_OVERRIDES: Record<string, string> = {
  // 内酯酶的标准缩写 6PGL 与代谢物 6-磷酸葡糖酸内酯的缩写 6PGL 完全相同，
  // 同一张图上会读成两个 6PGL；此处按酶的中文名显示。
  "ppp-o2": "内酯酶",
};

function enzymeShort(pathwayId: HomePathwayId, step?: RawStep): string {
  if (!step) return "—";
  const override = ENZYME_LABEL_OVERRIDES[step.id];
  if (override) return override;
  const entity = pathwayEntities.get(pathwayId)?.get(step.enzyme.entityId) ?? globalEntities.get(step.enzyme.entityId);
  return entity?.abbr ?? step.enzyme.name;
}

function chemTag(step: RawStep): string | undefined {
  // 转运步的“辅因子”是自由文本说明（例如「不耗 ATP」），不能按分子式推断收支。
  if (step.kind === "transport") return undefined;
  const cof = step.cofactors.join(" ");
  if (step.id === "fao-act") return "ATP→AMP+PPi";
  if (step.id === "ppp-o3") return "+NADPH · −CO₂";
  if (cof.includes("NAD⁺") && cof.includes("FAD")) return "+NADH +FADH₂";
  if (cof.includes("NADP⁺")) return "+NADPH";
  if (cof.includes("NADH")) return "NADH −1";
  if (cof.includes("NAD⁺")) return "+NADH";
  if (cof.includes("FAD")) return "+FADH₂";
  if (cof.includes("ADP")) return "ATP +1";
  if (cof.includes("ATP")) return "ATP −1";
  if (cof.includes("GDP")) return "GTP +1";
  return undefined;
}

interface EdgeDraft {
  from: string;
  to: string;
  pathwayId: HomePathwayId;
  source: HomeEdgeSource;
  step?: RawStep;
  kind: string;
}

const drafts: EdgeDraft[] = [];

function pushDraft(
  pathwayId: HomePathwayId,
  fromNodeId: string,
  toNodeId: string,
  source: HomeEdgeSource,
  step: RawStep | undefined,
  kind: string,
): void {
  const from = entityOf(pathwayId, fromNodeId) ?? fromNodeId;
  const to = entityOf(pathwayId, toNodeId) ?? toNodeId;
  if (SKIP_ENTITIES.has(from) || SKIP_ENTITIES.has(to)) return;
  if (!globalEntities.has(from) || !globalEntities.has(to)) return;
  if (from === to && kind !== "cycle-return") return;
  drafts.push({ from, to, pathwayId, source, step, kind });
}

function stepById(pathway: RawPathway, stepId: string): RawStep | undefined {
  return [...pathway.steps, ...(pathway.sideBranchSteps ?? [])].find((step) => step.id === stepId);
}

for (const source of SOURCES) {
  const { meta, pathway, skeleton } = source;
  const allSteps = [...pathway.steps, ...(pathway.sideBranchSteps ?? [])];

  for (const link of skeleton.links) {
    const fromEntity = entityOf(meta.id, link.from);
    const toEntity = entityOf(meta.id, link.to);
    if (!fromEntity || !toEntity) continue;
    if (fromEntity === toEntity) {
      if (link.type === "cycle-return") {
        pushDraft(
          meta.id,
          link.from,
          link.to,
          { pathwayId: meta.id, stepId: link.stepId ?? null, linkType: link.type },
          link.stepId ? stepById(pathway, link.stepId) : undefined,
          "cycle-return",
        );
      }
      continue;
    }
    pushDraft(
      meta.id,
      link.from,
      link.to,
      { pathwayId: meta.id, stepId: link.stepId ?? null, linkType: link.type ?? "main" },
      link.stepId ? stepById(pathway, link.stepId) : undefined,
      link.type ?? "main",
    );
  }

  for (const step of allSteps) {
    const stepLinks = skeleton.links.filter((link) => link.stepId === step.id);
    if (stepLinks.length > 1) continue;
    if (stepLinks.length === 0) {
      for (const substrate of step.substrates) {
        for (const product of step.products) {
          if (entityOf(meta.id, substrate) && entityOf(meta.id, product)) {
            pushDraft(
              meta.id,
              substrate,
              product,
              { pathwayId: meta.id, stepId: step.id, linkType: "step" },
              step,
              "main",
            );
          }
        }
      }
      continue;
    }
    const link = stepLinks[0];
    const linkFromEntity = entityOf(meta.id, link.from);
    const linkToEntity = entityOf(meta.id, link.to);
    if (!linkFromEntity || !linkToEntity) continue;

    for (const substrate of step.substrates) {
      if (substrate === linkFromEntity) continue;
      if (!entityOf(meta.id, substrate)) continue;
      pushDraft(
        meta.id,
        substrate,
        link.to,
        { pathwayId: meta.id, stepId: step.id, linkType: "confluence" },
        step,
        "main",
      );
    }
    for (const product of step.products) {
      if (product === linkToEntity) continue;
      if (!entityOf(meta.id, product)) continue;
      pushDraft(
        meta.id,
        link.from,
        product,
        { pathwayId: meta.id, stepId: step.id, linkType: "branch-product" },
        step,
        "main",
      );
    }
  }
}

/**
 * 辅因子级接口：TCA / β-氧化的 NADH、FADH₂ 只写在 cofactors，
 * 不在 substrate / product 数组里，因此不会自动产生连线；
 * 但它们是氧化磷酸化的真实入口。这里只登记已核验的步骤 id，
 * 不按字符串模糊匹配，也不为它们另造分子。
 */
const COFACTOR_INTERFACES: {
  entityId: string;
  refs: { pathwayId: HomePathwayId; stepId: string; fromNodeId?: string }[];
}[] = [
  {
    entityId: "nadh",
    refs: [
      // 各条通路只取一个代表性产 NADH 的步骤连线，避免同一节点被画成多条长线；
      // 其余产 NADH 的步骤仍写进 occurrence，右栏能看到完整清单。
      { pathwayId: "tca", stepId: "tca-3", fromNodeId: "icit" },
      { pathwayId: "tca", stepId: "tca-4" },
      { pathwayId: "tca", stepId: "tca-8" },
      { pathwayId: "fatty-acid-oxidation", stepId: "fao-3", fromNodeId: "hydroxy" },
    ],
  },
  {
    entityId: "fadh2",
    refs: [
      { pathwayId: "tca", stepId: "tca-6", fromNodeId: "suc" },
      { pathwayId: "fatty-acid-oxidation", stepId: "fao-1", fromNodeId: "acylcoa" },
    ],
  },
];

for (const item of COFACTOR_INTERFACES) {
  for (const ref of item.refs) {
    if (!ref.fromNodeId) continue;
    const source = SOURCES.find((entry) => entry.meta.id === ref.pathwayId);
    if (!source) continue;
    const step = stepById(source.pathway, ref.stepId);
    if (!step) continue;
    if (!entityOf(ref.pathwayId, ref.fromNodeId)) continue;
    pushDraft(
      ref.pathwayId,
      ref.fromNodeId,
      item.entityId,
      { pathwayId: ref.pathwayId, stepId: step.id, linkType: "cofactor" },
      step,
      "cofactor",
    );
  }
}

const merged = new Map<string, HomeEdge>();

for (const draft of drafts) {
  const key = `${draft.pathwayId}|${draft.from}|${draft.to}`;
  const step = draft.step;
  const enzyme = enzymeShort(draft.pathwayId, step);
  const chem = step ? chemTag(step) : undefined;
  const existing = merged.get(key);
  if (existing) {
    if (!existing.sources.some((s) => s.stepId === draft.source.stepId && s.linkType === draft.source.linkType)) {
      existing.sources.push(draft.source);
    }
    if (draft.source.stepId && !existing.stepIds.includes(draft.source.stepId)) {
      existing.stepIds.push(draft.source.stepId);
    }
    if (enzyme !== "—" && !existing.enzyme.split(" / ").some((part) => part.startsWith(enzyme))) {
      existing.enzyme = existing.enzyme === "—" ? enzyme : `${existing.enzyme} / ${enzyme}`;
    }
    if (chem && !existing.chem) existing.chem = chem;
    if (!existing.primaryStepId && draft.source.stepId) existing.primaryStepId = draft.source.stepId;
    existing.irreversible = existing.irreversible && (step?.irreversible ?? false);
    if (draft.kind === "cycle-return") existing.kind = "cycle-return";
    continue;
  }
  merged.set(key, {
    id: `${draft.pathwayId}:${draft.from}->${draft.to}`,
    from: draft.from,
    to: draft.to,
    pathwayId: draft.pathwayId,
    sources: [draft.source],
    stepIds: draft.source.stepId ? [draft.source.stepId] : [],
    primaryStepId: draft.source.stepId,
    enzyme,
    chem,
    irreversible: step?.irreversible ?? false,
    kind: draft.kind,
  });
}

const CROSS_LABELS: Record<string, string> = {
  "tca:tca-pdh:pyr->accoa": "PDH 复合体",
  "gluconeogenesis:gn-1:pyr->oaa": "MPC（丙酮酸入基质）",
  "gluconeogenesis:gn-2:oaa->pep": "PEPCK（OAA 经苹果酸出膜）",
  "gluconeogenesis:gn-11:g6p->glc": "G6PC1 / SLC37A4",
  "fatty-acid-oxidation:fao-act:fa->acylcoa": "ACSL 活化（外膜胞质面）",
  "fatty-acid-oxidation:fao-shuttle:acylcoa->acylcarn": "CPT1（外膜）",
  "fatty-acid-oxidation:fao-shuttle:acylcarn->acylcoa": "CACT / CPT2（内膜→基质）",
  "oxphos:oxphos-e:nadh->q": "复合体 I",
  "oxphos:oxphos-f:fadh2->q": "SDH（= TCA）",
};

export const HOME_EDGES: HomeEdge[] = [...merged.values()]
  .map((edge) => {
    const crossKey = `${edge.pathwayId}:${edge.primaryStepId ?? edge.kind}:${edge.from}->${edge.to}`;
    return { ...edge, crossLabel: CROSS_LABELS[crossKey] };
  })
  .sort((a, b) => {
    const ai = HOME_PATHWAYS.findIndex((p) => p.id === a.pathwayId);
    const bi = HOME_PATHWAYS.findIndex((p) => p.id === b.pathwayId);
    if (ai !== bi) return ai - bi;
    if (a.from !== b.from) return a.from.localeCompare(b.from);
    return a.to.localeCompare(b.to);
  });

const drawnEntityIds = new Set<string>();
for (const edge of HOME_EDGES) {
  drawnEntityIds.add(edge.from);
  drawnEntityIds.add(edge.to);
}

const pathwayUsage = new Map<string, Set<HomePathwayId>>();
const occurrenceMap = new Map<string, JunctionOccurrence[]>();

function noteUsage(entityId: string, pathwayId: HomePathwayId): void {
  const set = pathwayUsage.get(entityId) ?? new Set<HomePathwayId>();
  set.add(pathwayId);
  pathwayUsage.set(entityId, set);
}

function noteOccurrence(entityId: string, occurrence: JunctionOccurrence): void {
  const list = occurrenceMap.get(entityId) ?? [];
  const exists = list.some(
    (item) => item.pathwayId === occurrence.pathwayId && item.stepId === occurrence.stepId,
  );
  if (!exists) list.push(occurrence);
  occurrenceMap.set(entityId, list);
}

for (const source of SOURCES) {
  const { meta, pathway, skeleton } = source;
  for (const step of [...pathway.steps, ...(pathway.sideBranchSteps ?? [])]) {
    const isSide = (pathway.sideBranchSteps ?? []).includes(step);
    for (const entityId of [...step.substrates, ...step.products]) {
      if (!drawnEntityIds.has(entityId)) continue;
      noteUsage(entityId, meta.id);
      noteOccurrence(entityId, {
        pathwayId: meta.id,
        stepId: step.id,
        stepName: step.name,
        enzyme: enzymeShort(meta.id, step),
        via: isSide ? "side" : "main",
      });
    }
  }

  for (const transport of skeleton.transportSteps ?? []) {
    const entities = [transport.from, transport.via, transport.to]
      .filter((nodeId): nodeId is string => Boolean(nodeId))
      .map((nodeId) => entityOf(meta.id, nodeId))
      .filter((entityId): entityId is string => Boolean(entityId) && drawnEntityIds.has(entityId as string));
    for (const entityId of new Set(entities)) {
      noteUsage(entityId, meta.id);
      noteOccurrence(entityId, {
        pathwayId: meta.id,
        stepId: transport.id,
        stepName: transport.name,
        enzyme: "转运",
        via: "transport",
      });
    }
  }

  for (const link of skeleton.links) {
    for (const nodeId of [link.from, link.to]) {
      const entityId = entityOf(meta.id, nodeId);
      if (entityId && drawnEntityIds.has(entityId)) noteUsage(entityId, meta.id);
    }
  }
}

/** 辅因子接口的右栏清单：包括没有单独画线、但仍真实产 NADH / FADH₂ 的步骤。 */
for (const item of COFACTOR_INTERFACES) {
  if (!drawnEntityIds.has(item.entityId)) continue;
  for (const ref of item.refs) {
    const source = SOURCES.find((entry) => entry.meta.id === ref.pathwayId);
    if (!source) continue;
    const step = stepById(source.pathway, ref.stepId);
    if (!step) continue;
    noteUsage(item.entityId, ref.pathwayId);
    noteOccurrence(item.entityId, {
      pathwayId: ref.pathwayId,
      stepId: step.id,
      stepName: step.name,
      enzyme: enzymeShort(ref.pathwayId, step),
      via: "main",
    });
  }
}

export const HOME_NODES: HomeNode[] = [...drawnEntityIds]
  .map((entityId) => {
    const entity = globalEntities.get(entityId);
    const usage = [...(pathwayUsage.get(entityId) ?? new Set<HomePathwayId>())].sort(
      (a, b) => HOME_PATHWAYS.findIndex((p) => p.id === a) - HOME_PATHWAYS.findIndex((p) => p.id === b),
    );
    return {
      id: entityId,
      label: SHORT_LABELS[entityId] ?? entity?.abbr ?? entityId,
      fullName: entity?.name ?? entityId,
      abbr: entity?.abbr ?? entityId,
      pathwayIds: usage,
      junction: usage.length >= 2,
    };
  })
  .sort((a, b) => {
    if (a.pathwayIds.length !== b.pathwayIds.length) return b.pathwayIds.length - a.pathwayIds.length;
    return a.id.localeCompare(b.id);
  });

export const HOME_JUNCTIONS: HomeJunction[] = HOME_NODES.filter((node) => node.junction)
  .map((node) => ({
    entityId: node.id,
    label: node.label,
    fullName: node.fullName,
    pathwayIds: node.pathwayIds,
    occurrences: (occurrenceMap.get(node.id) ?? []).sort(
      (a, b) =>
        HOME_PATHWAYS.findIndex((p) => p.id === a.pathwayId) -
        HOME_PATHWAYS.findIndex((p) => p.id === b.pathwayId),
    ),
  }))
  .sort((a, b) => {
    if (b.pathwayIds.length !== a.pathwayIds.length) return b.pathwayIds.length - a.pathwayIds.length;
    return HOME_PATHWAYS.findIndex((p) => p.id === a.pathwayIds[0]) - HOME_PATHWAYS.findIndex((p) => p.id === b.pathwayIds[0]);
  });

export function homePathwayMeta(id: HomePathwayId): HomePathwayMeta {
  const meta = HOME_PATHWAYS.find((item) => item.id === id);
  if (!meta) throw new Error(`unknown home pathway: ${id}`);
  return meta;
}

export function junctionById(entityId: string): HomeJunction | undefined {
  return HOME_JUNCTIONS.find((junction) => junction.entityId === entityId);
}

export interface HomeStepRef {
  pathwayId: HomePathwayId;
  stepId: string;
  stepName: string;
  enzyme: string;
  kind: "main" | "side";
}

export const HOME_ALL_STEPS: HomeStepRef[] = SOURCES.flatMap(({ meta, pathway }) =>
  [...pathway.steps.map((step) => ({ step, kind: "main" as const })), ...(pathway.sideBranchSteps ?? []).map((step) => ({ step, kind: "side" as const }))].map(
    ({ step, kind }) => ({
      pathwayId: meta.id,
      stepId: step.id,
      stepName: step.name,
      enzyme: enzymeShort(meta.id, step),
      kind,
    }),
  ),
);

export const HOME_TRANSPORT_REFS = SOURCES.flatMap(({ meta, skeleton }) =>
  (skeleton.transportSteps ?? []).map((transport) => ({
    pathwayId: meta.id,
    stepId: transport.id,
    stepName: transport.name,
  })),
);
