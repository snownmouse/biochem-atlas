// 氨基酸代谢（PLATE 11 / SF-11）数据校验器。
//
// 只做机械复核：分类分组、去路 id 是否真实、双氮源是否成对、电离态电荷求和、
// ΔG 是否被编造、PDB 身份字段是否齐全；再用 ≥10 条负例自检，
// 确认校验器不是「只会说 OK」。
//
// 复核项：
//   1) 20 种氨基酸按 14 / 4 / 2 成三簇；三组成员并集 = 20 且两两不重叠
//   2) 分类出处必须是 Lehninger 8e Ch.18；生酮 = Leu / Lys；Thr 分歧并列
//   3) 7 步齐全；转氨闸 ≥2、氧化脱氨闸 ≥2；ALT / AST / GLDH / GLS1 身份
//   4) 每步底物 / 产物实体存在；辅因子（PLP / BH₄ / NAD(P)⁺ / 血红素）写到
//   5) 7 个去路；sharedWith 必须指向真实存在的通路 / 步骤 / 实体，禁止幽灵 id
//   6) 乙酰乙酰-CoA 明确 unbuilt：entityId=null、sharedWith=[]、节点 status=unbuilt
//   7) 双氮源：GLDH（aa-3）与 GLS1（aa-4）都释放 NH₄⁺，两条接口弧都指 if-nh4
//   8) NH₄⁺ 只做接口芯片；骨架里不得重画尿素循环（无尿素循环节点 / 步骤）
//   9) 电离态：20 个氨基酸的分子式与净电荷对表；charge = Σ chargeAt74
//  10) ΔG 一律 null + 定性 + Lehninger 8e 出处，且无重复反应式
//  11) PDB：只允许已实时核验的人源清单；身份字段齐全；禁用错误 ID
//  12) 能量账无净收支；3D pending，不出现 /assets/steps/amino-* 资产路径
//  13) 骨架几何：节点在画布内、氨基酸芯片落在对应分组带内、节点不重叠
//  14) 首页 / 导航接入：PLATE 11、y=650、第 12 槽保留
// 仅用 Node 内置能力，无第三方依赖。
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const DATA_DIR = join(ROOT, "src", "data", "amino-acid");

const baseData = JSON.parse(readFileSync(join(DATA_DIR, "amino.json"), "utf8"));
const baseSkel = JSON.parse(readFileSync(join(DATA_DIR, "skeleton.json"), "utf8"));

const pageSrc = readFileSync(join(ROOT, "src", "pages", "AminoAcidOverviewPage.tsx"), "utf8");
const cmpSrc = readFileSync(join(ROOT, "src", "data", "comparisonConfig.ts"), "utf8");
const homeMapSrc = readFileSync(join(ROOT, "src", "data", "homeMap.ts"), "utf8");
const homeLayoutSrc = readFileSync(join(ROOT, "src", "data", "homeLayout.ts"), "utf8");
const mainSrc = readFileSync(join(ROOT, "src", "main.tsx"), "utf8");

const DEPS = {
  tca: JSON.parse(readFileSync(join(ROOT, "src", "data", "tca.json"), "utf8")),
  glycolysis: JSON.parse(readFileSync(join(ROOT, "src", "data", "glycolysis.json"), "utf8")),
  gluconeogenesis: JSON.parse(readFileSync(join(ROOT, "src", "data", "gluconeogenesis", "gluconeogenesis.json"), "utf8")),
  "urea-cycle": JSON.parse(readFileSync(join(ROOT, "src", "data", "urea-cycle", "urea.json"), "utf8")),
};

/** 已实时向 RCSB 核验的人源条目；不在表内一律报错（防止凭记忆写 ID）。 */
const VERIFIED_PDB = {
  "3IHJ": { title: /alanine aminotransferase 2/i, ligands: /PLP/, resolution: 2.3 },
  "3II0": { title: /aspartate aminotransferase|glutamate oxaloacetate transaminase/i, ligands: /PLP/, resolution: 2.05 },
  "5AX8": { title: /aspartate aminotransferase/i, ligands: /无/, resolution: 2.99 },
  "1L1F": { title: /glutamate dehydrogenase 1/i, ligands: /无/, resolution: 2.7 },
  "3CZD": { title: /glutaminase/i, ligands: /GLU/, resolution: 2.4 },
  "1KT8": { title: /branched-chain amino acid aminotransferase/i, ligands: /ILP/, resolution: 1.9 },
  "1OLS": { title: /2-oxoisovalerate dehydrogenase|branched-chain alpha-ketoacid dehydrogenase/i, ligands: /TPP/, resolution: 1.85 },
  "1J8U": { title: /phenylalanine-4-hydroxylase|phenylalanine hydroxylase/i, ligands: /FE2/, resolution: 1.5 },
  "6HYC": { title: /full-length.*phenylalanine hydroxylase|phenylalanine hydroxylase.*full-length/i, ligands: /H4B/, resolution: 3.18 },
  "4COO": { title: /cystathionine beta-synthase/i, ligands: /PLP/, resolution: 2.0 },
};

/** 盘点中已核验身份不符的条目：不得出现在氨基酸代谢页。 */
const FORBIDDEN_PDB = new Set(["2CG5", "1XKT", "1C9S", "4F2Y"]);

/** 20 种氨基酸的分子式 / 净电荷对表（pH 7.4，中性式计 H，净电荷按官能团求和）。 */
const AMINO_ORACLE = {
  ala: ["C3H7NO2", 0],
  arg: ["C6H15N4O2", 1],
  asn: ["C4H8N2O3", 0],
  asp: ["C4H6NO4", -1],
  cys: ["C3H7NO2S", 0],
  gln: ["C5H10N2O3", 0],
  glu: ["C5H8NO4", -1],
  gly: ["C2H5NO2", 0],
  his: ["C6H9N3O2", 0],
  ile: ["C6H13NO2", 0],
  leu: ["C6H13NO2", 0],
  lys: ["C6H15N2O2", 1],
  met: ["C5H11NO2S", 0],
  phe: ["C9H11NO2", 0],
  pro: ["C5H9NO2", 0],
  ser: ["C3H7NO3", 0],
  thr: ["C4H9NO3", 0],
  trp: ["C11H12N2O2", 0],
  tyr: ["C9H11NO3", 0],
  val: ["C5H11NO2", 0],
};

const SUB_DIGITS = { "₀": "0", "₁": "1", "₂": "2", "₃": "3", "₄": "4", "₅": "5", "₆": "6", "₇": "7", "₈": "8", "₉": "9" };

/** 去下标 / 去电荷上标后返回规范式，便于对表。 */
function canonFormula(formula) {
  if (!formula || typeof formula !== "string") return "";
  return formula
    .replace(/[₀₁₂₃₄₅₆₇₈₉]/g, (m) => SUB_DIGITS[m] ?? m)
    .replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹⁺⁻]/g, "")
    .replace(/\s+/g, "");
}

function dupes(list) {
  const seen = new Set();
  const out = [];
  for (const id of list) {
    if (seen.has(id)) out.push(id);
    seen.add(id);
  }
  return out;
}

function stripNotes(value) {
  if (Array.isArray(value)) return value.map(stripNotes);
  if (!value || typeof value !== "object") return value;
  const out = {};
  for (const [k, v] of Object.entries(value)) {
    if (/^(note|notes|footerNote|sourceNote|no3dReason|description)$/.test(k)) continue;
    out[k] = stripNotes(v);
  }
  return out;
}

function rectOf(node) {
  const w = node.w ?? 100;
  const h = node.h ?? 30;
  return { x0: node.x - w / 2, x1: node.x + w / 2, y0: node.y - h / 2, y1: node.y + h / 2 };
}

function buildPathwayIndex(deps) {
  const out = new Map();
  for (const [pathwayId, data] of Object.entries(deps)) {
    out.set(pathwayId, {
      steps: new Map((data.steps ?? []).map((s) => [s.id, s])),
      entities: new Map((data.entities ?? []).map((e) => [e.id, e])),
    });
  }
  return out;
}

const PATHWAYS = buildPathwayIndex(DEPS);

function check(data, skel, ctx) {
  const errors = [];
  const warn = (msg) => errors.push(msg);

  const entities = data.entities ?? [];
  const steps = data.steps ?? [];
  const fates = data.fates ?? [];
  const nodes = skel.nodes ?? [];
  const links = skel.links ?? [];
  const zones = skel.compartments ?? [];
  const W = skel.canvas?.width;
  const H = skel.canvas?.height;

  const entById = new Map(entities.map((e) => [e.id, e]));
  const stepById = new Map(steps.map((s) => [s.id, s]));
  const fateById = new Map(fates.map((f) => [f.id, f]));
  const nodeById = new Map(nodes.map((n) => [n.id, n]));
  const zoneById = new Map(zones.map((c) => [c.id, c]));

  // ---------- 1) 分类三簇 ----------
  const cls = data.classification ?? {};
  const groups = cls.groups ?? [];
  if (groups.length !== 3) warn(`分类组必须是 3 簇（生糖 / 生糖兼生酮 / 生酮），实际 ${groups.length}`);
  const gid = new Map(groups.map((g) => [g.id, g]));
  for (const id of ["glucogenic", "both", "ketogenic"]) {
    if (!gid.has(id)) warn(`缺少分类组 ${id}`);
  }
  const all = groups.flatMap((g) => g.members ?? []);
  if (dupes(all).length) warn(`分类成员跨组重复：${dupes(all).join("、")}`);
  if (all.length !== 20) warn(`20 种氨基酸的成员并集应为 20，实际 ${all.length}`);
  if (new Set(all).size !== 20) warn(`分类成员去重后应为 20，实际 ${new Set(all).size}`);
  for (const g of groups) {
    if (g.count !== (g.members ?? []).length) warn(`分组 ${g.id} 的 count=${g.count} 与成员数 ${(g.members ?? []).length} 不符`);
  }
  const EXPECT_COUNT = { glucogenic: 14, both: 4, ketogenic: 2 };
  for (const [id, n] of Object.entries(EXPECT_COUNT)) {
    const g = gid.get(id);
    if (g && g.count !== n) warn(`分组 ${id} 的计数应为 ${n}，实际 ${g.count}`);
  }
  const ket = (gid.get("ketogenic")?.members ?? []).slice().sort().join(",");
  if (ket !== "leu,lys") warn(`生酮组必须只有 Leu / Lys，实际 ${ket}`);
  const both = (gid.get("both")?.members ?? []).slice().sort().join(",");
  if (both !== "ile,phe,trp,tyr") warn(`生糖兼生酮组必须是 Ile / Phe / Trp / Tyr，实际 ${both}`);
  const gluco = gid.get("glucogenic")?.members ?? [];
  if (!gluco.includes("thr")) warn("Lehninger 8e 口径下 Thr 必须归入生糖组");
  if (!String(cls.source ?? "").includes("Lehninger")) warn("分类出处必须写明 Lehninger");
  if (!/8e/.test(cls.source ?? "")) warn("分类出处必须写明第 8 版（8e）");
  if (!/Ch\.18|Chapter 18/.test(cls.source ?? "")) warn("分类出处必须写明 Ch.18");
  if (!(cls.disputed ?? []).some((d) => /Thr|苏氨酸/.test(`${d.title}${d.text}`) && /生糖兼生酮/.test(d.text))) {
    warn("Thr 归属分歧必须在 disputed 里并列说明（不得单方面裁定）");
  }
  for (const id of all) {
    const e = entById.get(id);
    if (!e) warn(`分类成员 ${id} 在 entities 里不存在`);
    else if (e.kind !== "amino-acid") warn(`分类成员 ${id} 的 kind 不是 amino-acid`);
  }

  // ---------- 2) 电离态 ----------
  const aminoIds = entities.filter((e) => e.kind === "amino-acid" && AMINO_ORACLE[e.id]).map((e) => e.id);
  if (aminoIds.length !== 20) warn(`应按 20 个氨基酸实体核对电离态，实际 ${aminoIds.length}`);
  for (const [id, [formula, charge]] of Object.entries(AMINO_ORACLE)) {
    const e = entById.get(id);
    if (!e) {
      warn(`缺少氨基酸实体 ${id}`);
      continue;
    }
    const c = canonFormula(e.formula);
    if (c !== formula) warn(`实体 ${id} 的分子式应为 ${formula}，实际 ${e.formula}`);
    if (e.charge !== charge) warn(`实体 ${id} 的净电荷应为 ${charge}，实际 ${e.charge}`);
  }
  for (const e of entities) {
    if (!e.formula || !e.chargeBasis) warn(`实体 ${e.id} 缺少分子式或 chargeBasis`);
    if (!Array.isArray(e.ionizableGroups)) warn(`实体 ${e.id} 缺少 ionizableGroups`);
    const sum = (e.ionizableGroups ?? []).reduce((n, g) => n + (Number.isFinite(g.chargeAt74) ? g.chargeAt74 : 0), 0);
    if (sum !== e.charge) warn(`实体 ${e.id} 的电荷求和 ${sum} ≠ charge ${e.charge}`);
    for (const g of e.ionizableGroups ?? []) {
      if (![1, 0, -1].includes(g.chargeAt74)) warn(`实体 ${e.id} 的基团 ${g.group} chargeAt74 不是 +1 / 0 / −1`);
      if (/羧基/.test(g.group) && g.pKa < 7.4 && g.chargeAt74 !== -1) warn(`实体 ${e.id} 的羧基 pKa<7.4 应为 −1`);
      if (/氨基/.test(g.group) && g.pKa > 7.4 && g.chargeAt74 !== 1) warn(`实体 ${e.id} 的氨基 pKa>7.4 应为 +1`);
    }
    if (e.kind === "amino-acid" && !/pH\s*7\.4|净电荷/.test(e.chargeBasis)) warn(`实体 ${e.id} 的 chargeBasis 未写明 pH 7.4 口径`);
  }

  // ---------- 3) 步骤 / 两道闸 ----------
  if (steps.length !== 7) warn(`步骤数应为 7，实际 ${steps.length}`);
  const stepDup = dupes(steps.map((s) => s.id));
  if (stepDup.length) warn(`步骤 id 重复：${stepDup.join("、")}`);
  if (dupes(steps.map((s) => s.index)).length) warn("步骤 index 重复");
  const indexes = steps.map((s) => s.index).sort((a, b) => a - b);
  if (indexes.join(",") !== "1,2,3,4,5,6,7") warn(`步骤 index 不是 1–7：${indexes.join(",")}`);
  const gates = steps.map((s) => s.gate);
  if (gates.filter((g) => g === "transamination").length < 2) warn("转氨闸至少要有 2 步（ALT / AST）");
  if (gates.filter((g) => g === "oxidative-deamination").length < 2) warn("氧化脱氨闸至少要有 2 步（GLDH / GLS）");

  const IDENTITY = {
    "aa-1": { name: /丙氨酸/, ec: "2.6.1.2" },
    "aa-2": { name: /天冬氨酸/, ec: "2.6.1.1" },
    "aa-3": { name: /谷氨酸脱氢酶/, ec: "1.4.1.2" },
    "aa-4": { name: /谷氨酰胺酶/, ec: "3.5.1.2" },
    "aa-5": { name: /支链氨基转移酶/, ec: "2.6.1.42" },
    "aa-6": { name: /苯丙氨酸羟化酶/, ec: "1.14.16.1" },
    "aa-7": { name: /胱硫醚/, ec: "4.2.1.22" },
  };
  for (const [id, want] of Object.entries(IDENTITY)) {
    const s = stepById.get(id);
    if (!s) {
      warn(`缺少步骤 ${id}`);
      continue;
    }
    if (!want.name.test(s.enzyme?.name ?? "")) warn(`步骤 ${id} 的酶名不符：${s.enzyme?.name}`);
    if (s.enzyme?.ec !== want.ec) warn(`步骤 ${id} 的 EC 应为 ${want.ec}，实际 ${s.enzyme?.ec}`);
  }
  const eqDup = dupes(steps.map((s) => s.equation));
  if (eqDup.length) warn(`反应式重复：${eqDup.join("、")}`);
  for (const s of steps) {
    const pool = [...(s.reaction?.substrates ?? []), ...(s.reaction?.products ?? [])];
    if (!pool.length) warn(`步骤 ${s.id} 缺少底物 / 产物`);
    for (const id of pool) if (!entById.has(id)) warn(`步骤 ${s.id} 引用了不存在的实体 ${id}`);
    if (!/\u2192|\u21cc/.test(s.equation ?? "")) warn(`步骤 ${s.id} 的反应式缺少方向符号`);
    if (s.deltaG?.value !== null) warn(`步骤 ${s.id} 的 ΔG 数值必须为 null（不得编造）`);
    if (!String(s.deltaG?.qualitative ?? "").trim()) warn(`步骤 ${s.id} 缺少 ΔG 定性说明`);
    if (!/Lehninger/.test(s.deltaG?.source ?? "")) warn(`步骤 ${s.id} 的 ΔG 出处必须写 Lehninger`);
    if (!(s.organs ?? []).length) warn(`步骤 ${s.id} 缺少器官标注`);
    const cof = (s.reaction?.cofactors ?? []).join("|");
    if (["aa-1", "aa-2", "aa-5"].includes(s.id) && !/PLP/.test(cof)) warn(`步骤 ${s.id}（转氨酶）必须写明 PLP 辅因子`);
    if (s.id === "aa-7" && !/PLP/.test(cof)) warn("CBS 必须写明 PLP 辅因子");
    if (s.id === "aa-7" && !/血红素/.test(cof)) warn("CBS 必须写明血红素辅因子");
    if (s.id === "aa-6" && (!/BH|生物蝶呤/.test(cof) || !/Fe/.test(cof))) warn("PAH 必须写明 BH₄ 与 Fe(II) 辅因子");
    if (s.id === "aa-3" && !/NAD/.test(cof)) warn("GLDH 必须写明 NAD(P)⁺ 辅因子");
  }

  // ---------- 4) 七个去路 / sharedWith ----------
  if (fates.length !== 7) warn(`去路数应为 7，实际 ${fates.length}`);
  const fateNodeCount = nodes.filter((n) => n.kind === "fate").length;
  if (fateNodeCount !== 7) warn(`骨架里 fate 节点应为 7，实际 ${fateNodeCount}`);
  for (const f of fates) {
    const n = nodeById.get(f.id);
    if (!n) {
      warn(`去路 ${f.id} 在骨架里没有节点`);
      continue;
    }
    if (n.kind !== "fate") warn(`节点 ${n.id} 不是 fate 类型`);
    if (f.status === "unbuilt") {
      if (f.entityId !== null) warn(`未建去路 ${f.id} 的 entityId 必须为 null`);
      if ((f.sharedWith ?? []).length) warn(`未建去路 ${f.id} 不得填 sharedWith`);
      if (n.status !== "unbuilt") warn(`未建去路 ${f.id} 的节点 status 必须为 unbuilt`);
      if (n.entityId) warn(`未建去路 ${f.id} 的节点不得挂 entityId（当前 ${n.entityId}）`);
      continue;
    }
    if (f.status !== "linked") warn(`去路 ${f.id} 的 status 不是 linked / unbuilt`);
    if (!(f.sharedWith ?? []).length) warn(`去路 ${f.id} 没有 sharedWith`);
    const bridged = (f.sharedWith ?? []).some((sh) => sh.entityId === f.entityId);
    if (!entById.has(f.entityId) && !bridged) warn(`去路 ${f.id} 的实体 ${f.entityId} 既不在本页实体表，也没有任何 sharedWith 接上它`);
    if (n.status !== "linked") warn(`去路 ${f.id} 的节点 status 不是 linked`);
    if (n.entityId !== f.entityId) warn(`去路 ${f.id} 的节点 entityId 与数据不一致`);
    for (const s of f.sources ?? []) {
      if (!AMINO_ORACLE[s]) warn(`去路 ${f.id} 的来源 ${s} 不是 20 种氨基酸`);
    }
  }
  const unbuilt = fates.filter((f) => f.status === "unbuilt");
  if (unbuilt.length !== 1 || unbuilt[0].id !== "fate-acacoa") warn("乙酰乙酰-CoA 必须唯一置 unbuilt（本平台未建生酮通路）");

  for (const s of steps) {
    for (const sh of s.sharedWith ?? []) {
      const pw = PATHWAYS.get(sh.pathwayId);
      if (!pw) {
        warn(`步骤 ${s.id} 的 sharedWith 指向不存在的通路 ${sh.pathwayId}`);
        continue;
      }
      if (!pw.steps.has(sh.stepId)) warn(`步骤 ${s.id} 的 sharedWith 指向不存在的步骤 ${sh.pathwayId}:${sh.stepId}`);
      if (!pw.entities.has(sh.entityId)) warn(`步骤 ${s.id} 的 sharedWith 指向不存在的实体 ${sh.pathwayId}:${sh.entityId}`);
    }
  }
  for (const f of fates) {
    for (const sh of f.sharedWith ?? []) {
      const pw = PATHWAYS.get(sh.pathwayId);
      if (!pw) {
        warn(`去路 ${f.id} 的 sharedWith 指向不存在的通路 ${sh.pathwayId}`);
        continue;
      }
      if (!pw.steps.has(sh.stepId)) warn(`去路 ${f.id} 的 sharedWith 指向幽灵步骤 ${sh.pathwayId}:${sh.stepId}`);
      if (!pw.entities.has(sh.entityId)) warn(`去路 ${f.id} 的 sharedWith 指向幽灵实体 ${sh.pathwayId}:${sh.entityId}`);
    }
  }

  // ---------- 5) 双氮源与尿素循环接口 ----------
  const gldh = stepById.get("aa-3");
  const gls = stepById.get("aa-4");
  if (!(gldh?.reaction?.products ?? []).includes("nh4")) warn("GLDH（aa-3）产物缺 NH₄⁺，双氮源断了一条");
  if (!(gls?.reaction?.products ?? []).includes("nh4")) warn("GLS1（aa-4）产物缺 NH₄⁺，双氮源断了一条");
  const ifNode = nodeById.get("if-nh4");
  if (!ifNode) warn("缺少 NH₄⁺ 接口芯片节点 if-nh4");
  else {
    if (ifNode.kind !== "interface") warn("if-nh4 不是 interface 类型");
    if (ifNode.entityId !== "nh4") warn(`if-nh4 的 entityId 应为 nh4，实际 ${ifNode.entityId}`);
  }
  for (const link of links.filter((l) => l.type === "interface")) {
    if (!["aa-3", "aa-4"].includes(link.stepId)) warn(`接口弧 ${link.id} 必须来自 GLDH / GLS1 两步`);
    if (link.to !== "if-nh4") warn(`接口弧 ${link.id} 的终点必须指 if-nh4`);
  }
  const ifUrea = (data.interfaces ?? []).find((x) => x.id === "if-urea");
  if (!ifUrea) warn("缺少 if-urea 接口声明");
  else if (!/urea-cycle\?step=urea-1/.test(ifUrea.link ?? "")) warn("if-urea 必须链到 /pathway/urea-cycle?step=urea-1");
  const UREA_ONLY = new Set(["urea", "ornithine", "citrulline", "arginine", "argininosuccinate", "carbamoylP"]);
  for (const n of nodes) {
    if (UREA_ONLY.has(n.entityId)) warn(`骨架节点 ${n.id} 重画了尿素循环实体 ${n.entityId}（应只做接口）`);
  }
  if (steps.some((s) => /^urea-/.test(s.id))) warn("本页不得把尿素循环步骤当成自己的步骤重画");

  // ---------- 6) PDB 身份 ----------
  const pdbAll = [];
  for (const s of steps) {
    if (!(s.pdbCandidates ?? []).length) warn(`步骤 ${s.id} 没有任何 PDB 候选`);
    for (const p of s.pdbCandidates ?? []) pdbAll.push({ step: s.id, p });
  }
  const seenPdb = new Set();
  for (const { step, p } of pdbAll) {
    seenPdb.add(p.pdbId);
    if (FORBIDDEN_PDB.has(p.pdbId)) warn(`PDB ${p.pdbId} 已核验身份不符，不得登记（步骤 ${step}）`);
    const want = VERIFIED_PDB[p.pdbId];
    if (!want) warn(`PDB ${p.pdbId} 不在已实时核验的人源清单内（步骤 ${step}）`);
    else if (!want.title.test(p.title ?? "")) warn(`PDB ${p.pdbId} 标题与真实条目不符：${p.title}`);
    if (!/Homo sapiens/.test(p.species ?? "")) warn(`PDB ${p.pdbId} 的物种必须写 Homo sapiens，当前「${p.species}」`);
    if (!/X-ray|X-RAY|Xray/i.test(p.method ?? "")) warn(`PDB ${p.pdbId} 的方法必须是 X-ray，当前「${p.method}」`);
    if (!Number.isFinite(p.resolution) || p.resolution <= 0 || p.resolution > 4) warn(`PDB ${p.pdbId} 缺少已核验的分辨率`);
    if (!String(p.chains ?? "").trim()) warn(`PDB ${p.pdbId} 缺少链`);
    if (!String(p.ligands ?? "").trim()) warn(`PDB ${p.pdbId} 缺少配体字段（无配体写「无」）`);
    if (!String(p.mutation ?? "").trim()) warn(`PDB ${p.pdbId} 缺少突变状态`);
    if (!String(p.note ?? "").trim()) warn(`PDB ${p.pdbId} 缺少核验说明`);
    if (p.status !== "verified") warn(`PDB ${p.pdbId} 的 status 必须是 verified`);
    if (want?.ligands && !want.ligands.test(p.ligands ?? "")) warn(`PDB ${p.pdbId} 的配体与真实条目不符：${p.ligands}`);
    if (want?.resolution && Math.abs(p.resolution - want.resolution) > 0.02) warn(`PDB ${p.pdbId} 的分辨率应为 ${want.resolution}，实际 ${p.resolution}`);
  }
  if (seenPdb.size !== 10) warn(`本页应登记 10 个唯一 PDB 条目，实际 ${seenPdb.size}`);
  if (data.threeD?.status !== "pending") warn("threeD.status 必须是 pending");

  // ---------- 7) 能量账 ----------
  if ((data.energyLedger?.entries ?? []).length !== 0) warn("能量账必须为空（本页无 ATP 收支，禁止硬凑）");
  if (!/无净收支/.test(data.energyLedger?.note ?? "")) warn("能量账必须明写「无净收支」");

  // ---------- 8) 临床支路 ----------
  const clinical = data.clinical ?? [];
  if (clinical.length !== 3) warn(`临床支路应为 3 条，实际 ${clinical.length}`);
  const CLIN_EXPECT = { pku: "aa-6", msud: "aa-5", homocystinuria: "aa-7" };
  for (const [id, stepId] of Object.entries(CLIN_EXPECT)) {
    const c = clinical.find((x) => x.id === id);
    if (!c) {
      warn(`缺少临床条目 ${id}`);
      continue;
    }
    if (c.stepId !== stepId) warn(`临床条目 ${id} 应绑定 ${stepId}，实际 ${c.stepId}`);
    if (!/^\d{6}$/.test(c.omim ?? "")) warn(`临床条目 ${id} 的 OMIM 必须是 6 位数字`);
    if (!(c.evidence ?? "").split(/[^0-9A-Z]/).some((x) => VERIFIED_PDB[x])) warn(`临床条目 ${id} 的 evidence 未引用已核验 PDB`);
  }
  const clinNodes = nodes.filter((n) => n.clinical);
  if (clinNodes.length !== 3) warn(`骨架里临床节点应为 3，实际 ${clinNodes.length}`);
  for (const n of clinNodes) {
    const lnk = links.find((l) => l.to === n.id);
    if (!lnk) warn(`临床节点 ${n.id} 没有入口连线`);
    else if (!lnk.clinical || !lnk.stepId) warn(`临床节点 ${n.id} 的入口连线必须 clinical + stepId`);
    if (!/^clin-/.test(n.id)) warn(`临床节点 ${n.id} 命名不含 clin- 前缀`);
  }

  // ---------- 9) 骨架几何 ----------
  if (W !== 1980 || H !== 1240) warn(`画布应为 1980×1240，实际 ${W}×${H}`);
  if (dupes(nodes.map((n) => n.id)).length) warn(`节点 id 重复：${dupes(nodes.map((n) => n.id)).join("、")}`);
  for (const n of nodes) {
    if (!Number.isFinite(n.x) || !Number.isFinite(n.y) || n.x < 0 || n.y < 0 || n.x > W || n.y > H) warn(`节点 ${n.id} 坐标越出画布`);
    const r = rectOf(n);
    if (r.x0 < 0 || r.y0 < 0 || r.x1 > W || r.y1 > H) warn(`节点 ${n.id} 的图框越出画布`);
  }
  const overlaps = [];
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const a = rectOf(nodes[i]);
      const b = rectOf(nodes[j]);
      if (a.x1 > b.x0 && a.x0 < b.x1 && a.y1 > b.y0 && a.y0 < b.y1) overlaps.push(`${nodes[i].id}/${nodes[j].id}`);
    }
  }
  if (overlaps.length) warn(`节点图框重叠：${overlaps.slice(0, 4).join("、")}`);

  const chips = nodes.filter((n) => n.kind === "amino");
  if (chips.length !== 20) warn(`氨基酸芯片应为 20 个，实际 ${chips.length}`);
  for (const id of Object.keys(AMINO_ORACLE)) {
    if (!chips.some((n) => n.entityId === id)) warn(`缺少氨基酸芯片 ${id}`);
  }
  const groupBands = zones.filter((c) => c.id.startsWith("grp-"));
  if (groupBands.length !== 3) warn(`分类分组带应为 3 条，实际 ${groupBands.length}`);
  for (const band of groupBands) {
    const key = band.id.replace("grp-", "");
    const want = new Set(gid.get(key)?.members ?? []);
    if (want.size === 0) warn(`分组带 ${band.id} 找不到对应分类组`);
    for (const chip of chips) {
      const r = rectOf(chip);
      const inside = r.x0 >= band.x && r.x1 <= band.x + band.w && r.y0 >= band.y && r.y1 <= band.y + band.h;
      if (inside && !want.has(chip.entityId)) warn(`芯片 ${chip.entityId} 落在 ${band.id} 内，但分类不属于该组`);
      if (!inside && want.has(chip.entityId)) warn(`分类成员 ${chip.entityId} 的芯片不在 ${band.id} 内`);
    }
  }
  for (const id of ["zone-gates", "zone-fates", "zone-organs", "zone-clinical"]) {
    if (!zoneById.has(id)) warn(`缺少分区 ${id}`);
  }
  for (const id of ["organ-liver", "organ-muscle", "organ-kidney"]) {
    if (!zoneById.has(id)) warn(`缺少器官泳道 ${id}`);
  }
  const organNames = (data.organs ?? []).map((o) => o.id);
  if (organNames.join(",") !== "liver,muscle,kidney") warn(`器官条目必须是 liver / muscle / kidney，实际 ${organNames.join(",")}`);

  const endpointOk = (id) => nodeById.has(id) || zoneById.has(id);
  for (const l of links) {
    if (!endpointOk(l.from) || !endpointOk(l.to)) warn(`连线 ${l.id} 引用了不存在的端点 ${l.from} → ${l.to}`);
    if (l.stepId && !stepById.has(l.stepId)) warn(`连线 ${l.id} 引用了不存在的 stepId ${l.stepId}`);
    if (!String(l.path ?? "").startsWith("M")) warn(`连线 ${l.id} 缺少可用 path`);
    if (l.label && (!Number.isFinite(l.labelX) || !Number.isFinite(l.labelY))) warn(`连线 ${l.id} 有 label 但缺 labelX / labelY`);
  }
  for (const s of steps.slice(0, 5)) {
    if (!links.some((l) => l.stepId === s.id && l.type === "main")) warn(`主链步骤 ${s.id} 没有 main 弧`);
  }
  const labels = skel.stepLabels ?? [];
  for (const l of labels) {
    if (!stepById.has(l.stepId)) warn(`步骤标签引用不存在的步骤 ${l.stepId}`);
    if (!Number.isFinite(l.x) || !Number.isFinite(l.y) || l.x < 0 || l.y < 0 || l.x > W || l.y > H) warn(`步骤标签 ${l.stepId} 越出画布`);
  }
  if (dupes(labels.map((l) => l.stepId)).length) warn(`步骤标签重复：${dupes(labels.map((l) => l.stepId)).join("、")}`);
  const anns = skel.annotations ?? [];
  if (anns.length < 20) warn(`注记过少（${anns.length} 条），分类 / 去路 / 器官 / 临床说明应齐全`);
  for (const a of anns) {
    if (!String(a.text ?? "").trim()) warn("存在空注记");
    if (!Number.isFinite(a.x) || !Number.isFinite(a.y) || a.x < 0 || a.y < 0 || a.x > W || a.y > H) warn(`注记「${a.text}」越出画布`);
  }

  // ---------- 10) 页面 / 结构对照 / 首页接入 ----------
  const pageChecks = [
    ['data-frame="amino"', /data-frame="amino"/],
    ["三分类分组标记", /data-class-groups="3"/],
    ["20 种计数", /data-amino-count=/],
    ["七去路计数", /data-fate-count={DATA\.fates\.length}/],
    ["三临床支路", /data-clinical-branches="3"/],
    ["临床折叠开关", /data-clinical-open=/],
    ["无缩放标记", /data-no-zoom="1"/],
    ["结构对照配置", /comparisonConfigFor\("amino-acids"\)/],
  ];
  for (const [label, re] of pageChecks) if (!re.test(ctx.pageSrc)) warn(`页面缺少 ${label}`);
  if (/onWheel|zoomIn|zoomOut|缩放按钮/i.test(ctx.pageSrc)) warn("页面不得出现缩放控件");
  if (/\/assets\/steps\/amino-/.test(ctx.pageSrc)) warn("页面引用了不存在的酶 3D 资产路径");
  const assetText = JSON.stringify(stripNotes(data)) + JSON.stringify(stripNotes(skel));
  if (/\/assets\/steps\/amino-/.test(assetText)) warn("数据层不得出现 /assets/steps/amino-* 资产路径");

  const cmpBlock = ctx.cmpSrc.slice(ctx.cmpSrc.indexOf("const AMINO_LEU"), ctx.cmpSrc.indexOf("const AMINO_CONFIG"));
  if (!cmpBlock) warn("comparisonConfig 缺少 AMINO_COMPARISON");
  const cmpIds = [...cmpBlock.matchAll(/stepId:\s*"(aa-[0-9]+)"/g)].map((m) => m[1]);
  if (cmpIds.length < 5 || cmpIds.length > 7) warn(`结构对照块应为 5–7 块，实际 ${cmpIds.length}`);
  if (dupes(cmpIds).length) warn(`结构对照块 stepId 重复：${dupes(cmpIds).join("、")}`);
  for (const id of cmpIds) if (!stepById.has(id)) warn(`结构对照块引用了不存在的步骤 ${id}`);
  if (!cmpBlock.includes("asset2d")) warn("结构对照块缺少 2D 资产引用");
  for (const id of ["leu", "kic", "phe", "tyr", "hcy", "ser", "cystathionine", "gln"]) {
    if (!cmpBlock.includes(`D2("${id}")`) && !new RegExp(`id:\\s*"${id}"`).test(cmpBlock)) warn(`结构对照块缺少新分子 ${id}`);
  }
  if (!/pathwayId:\s*"amino-acids"/.test(ctx.cmpSrc)) warn("COMPARISON_CONFIGS 未登记 amino-acids");
  const aminoCfg = ctx.cmpSrc.slice(ctx.cmpSrc.indexOf("const AMINO_CONFIG"));
  if (!/plateNo:\s*"PLATE SF-11/.test(aminoCfg)) warn("结构对照 plateNo 必须用 SF-11");
  if (!/enzymePanel:\s*false/.test(aminoCfg)) warn("amino 结构对照必须 enzymePanel=false");

  if (!/id:\s*"amino-acids"/.test(ctx.homeMapSrc)) warn("homeMap 未登记 amino-acids");
  if (!/plateNo:\s*"PLATE 11"/.test(ctx.homeMapSrc)) warn("homeMap 的 amino-acids 必须是 PLATE 11");
  if (!/pathwayId:\s*"amino-acids"/.test(ctx.homeLayoutSrc)) warn("homeLayout 未登记 amino-acids 标题");
  if (!/pathwayId:\s*"amino-acids".*y:\s*650/.test(ctx.homeLayoutSrc)) warn("amino-acids 标题应落在第 11 槽 y=650");
  if (!/no:\s*12/.test(ctx.homeLayoutSrc)) warn("第 12 空槽必须保留");
  if (!/amino-acids/.test(ctx.mainSrc)) warn("main.tsx 未登记 amino-acids 路由");

  return errors;
}

const ctx = { pageSrc, cmpSrc, homeMapSrc, homeLayoutSrc, mainSrc };
const errors = check(baseData, baseSkel, ctx);
if (errors.length) {
  console.error("氨基酸代谢数据校验失败：");
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}
console.log(
  `validate-amino：正例通过（${baseData.steps.length} 步 / ${baseData.fates.length} 去路 / ${baseSkel.nodes.length} 节点 / ${baseSkel.links.length} 连线 / 20 种氨基酸）`,
);

// ===== 负例自检 =====
function clone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

const negatives = [];
const expectFail = (name, mutate, needle) => {
  const data = clone(baseData);
  const skel = clone(baseSkel);
  mutate(data, skel);
  const errs = check(data, skel, ctx);
  if (!errs.length) negatives.push({ name, ok: false, why: "未抓到" });
  else if (needle && !errs.some((e) => String(e).includes(needle))) negatives.push({ name, ok: false, why: `抓到了但不是预期：${errs[0]}` });
  else negatives.push({ name, ok: true });
};

expectFail("分类错误：把 Leu 移出生酮组", (d) => {
  const g = d.classification.groups.find((x) => x.id === "ketogenic");
  g.members = g.members.filter((m) => m !== "leu");
}, "生酮组必须只有");

expectFail("分类成员重复计数", (d) => {
  d.classification.groups.find((x) => x.id === "glucogenic").members.push("leu");
}, "跨组重复");

expectFail("去路指向幽灵步骤", (d) => {
  d.fates.find((f) => f.id === "fate-pyr").sharedWith[0].stepId = "gk-99";
}, "幽灵步骤");

expectFail("去路指向幽灵实体", (d) => {
  d.fates.find((f) => f.id === "fate-oaa").sharedWith[0].entityId = "oaa-x";
}, "幽灵实体");

expectFail("双氮源缺失：GLS1 不再产 NH₄⁺", (d) => {
  const s = d.steps.find((x) => x.id === "aa-4");
  s.reaction.products = s.reaction.products.filter((p) => p !== "nh4");
}, "双氮源断了一条");

expectFail("电离态错：Arg 净电荷写成 0", (d) => {
  d.entities.find((e) => e.id === "arg").charge = 0;
}, "净电荷应为 1");

expectFail("电离态错：Glu 的 γ-羧基按 0 记", (d) => {
  d.entities.find((e) => e.id === "glu").ionizableGroups.find((g) => /γ/.test(g.group)).chargeAt74 = 0;
}, "电荷求和");

expectFail("编造 ΔG 数值", (d) => {
  d.steps[0].deltaG.value = -7.3;
}, "ΔG 数值必须为 null");

expectFail("PDB 身份缺字段（物种为空）", (d) => {
  d.steps[0].pdbCandidates[0].species = "";
}, "物种必须写 Homo sapiens");

expectFail("PDB 换成已核验身份不符的 2CG5", (d) => {
  const p = d.steps[0].pdbCandidates[0];
  p.pdbId = "2CG5";
  p.title = "Alanine aminotransferase 2";
}, "身份不符");

expectFail("PDB 不在已核验清单", (d) => {
  d.steps[0].pdbCandidates[0].pdbId = "9XYZ";
}, "不在已实时核验");

expectFail("尿素循环被重画进骨架", (d, s) => {
  s.nodes.push({ id: "urea-redraw", entityId: "urea", kind: "metabolite", x: 300, y: 600, label: "尿素" });
}, "重画了尿素循环");

expectFail("20 种氨基酸缺一个芯片", (d, s) => {
  s.nodes = s.nodes.filter((n) => n.entityId !== "trp");
}, "氨基酸芯片应为 20");

expectFail("芯片放错分组带", (d, s) => {
  const chip = s.nodes.find((n) => n.entityId === "leu");
  chip.x = 236;
  chip.y = 154;
}, "落在");

expectFail("乙酰乙酰-CoA 偷偷接上幽灵接口", (d) => {
  d.fates.find((f) => f.id === "fate-acacoa").sharedWith = [{ pathwayId: "ketone", stepId: "ket-1", entityId: "acacoa", note: "自造" }];
}, "不得填 sharedWith");

const failed = negatives.filter((n) => !n.ok);
if (failed.length) {
  console.error("validate-amino：负例自检失败");
  for (const n of failed) console.error(`  - ${n.name}：${n.why}`);
  process.exit(1);
}
console.log(`validate-amino：负例自检 ${negatives.length}/${negatives.length} 全部抓到`);
