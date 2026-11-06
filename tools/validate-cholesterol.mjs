// 胆固醇合成 / 甲羟戊酸通路（PLATE 12 / SF-12）数据校验器。
//
// 只做机械复核：13 步的酶身份与 EC、簇内 9 酶、电离态电荷求和、
// ΔG 是否被编造、PDB 身份字段与已核验清单、他汀是不是被写成反应步骤、
// 能量账算术、区室带与骨架几何、首页 / 结构对照接入。
// 再用 17 条负例自检，确认校验器不是「只会说 OK」。
//
// 复核项：
//   1) 16 个代谢物分子式 / 净电荷对表；charge = Σ ionizableGroups；pKa 口径
//   2) 13 步酶名 + EC；index 1–13；反应式方向；底物 / 产物实体存在
//   3) 去甲基化簇：9 个酶，每个都有 EC
//   4) 他汀只作药物节点 / 调控条目：不得出现在任何 steps 的酶或底物 / 产物
//   5) 能量账：1 MVA = 3 ATP + 2 NADPH；6 MVA = 18 ATP、14 NADPH（簇前）
//   6) 碳 / 磷酸 / 异戊二烯守恒算术
//   7) sharedWith 只指向真实存在的通路 / 步骤 / 实体，禁止幽灵 id
//   8) ΔG 一律 null + 定性 + Lehninger 8e
//   9) PDB 18 条，全部在已实时核验的清单内，身份字段齐全（物种 / 方法 / 分辨率 / 链 / 配体 / 突变）
//  10) 骨架：区室带、节点在画布内、不重叠、连线端点存在、每步有 main 弧
//  11) 页面：data-frame / 计数 / 无缩放 / 结构对照入口
//  12) 首页：PLATE 12、第 12 槽 y=698、预留槽清空
// 仅用 Node 内置能力，无第三方依赖。
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const DATA_DIR = join(ROOT, "src", "data", "cholesterol");

const baseData = JSON.parse(readFileSync(join(DATA_DIR, "cholesterol.json"), "utf8"));
const baseSkel = JSON.parse(readFileSync(join(DATA_DIR, "skeleton.json"), "utf8"));

const pageSrc = readFileSync(join(ROOT, "src", "pages", "CholesterolOverviewPage.tsx"), "utf8");
const cmpSrc = readFileSync(join(ROOT, "src", "data", "comparisonConfig.ts"), "utf8");
const homeMapSrc = readFileSync(join(ROOT, "src", "data", "homeMap.ts"), "utf8");
const homeLayoutSrc = readFileSync(join(ROOT, "src", "data", "homeLayout.ts"), "utf8");
const mainSrc = readFileSync(join(ROOT, "src", "main.tsx"), "utf8");

const DEPS = {
  tca: JSON.parse(readFileSync(join(ROOT, "src", "data", "tca.json"), "utf8")),
  glycolysis: JSON.parse(readFileSync(join(ROOT, "src", "data", "glycolysis.json"), "utf8")),
  gluconeogenesis: JSON.parse(readFileSync(join(ROOT, "src", "data", "gluconeogenesis", "gluconeogenesis.json"), "utf8")),
  "urea-cycle": JSON.parse(readFileSync(join(ROOT, "src", "data", "urea-cycle", "urea.json"), "utf8")),
  glycogen: JSON.parse(readFileSync(join(ROOT, "src", "data", "glycogen", "glycogen.json"), "utf8")),
};

/**
 * 已 2026-11-05 实时向 RCSB GraphQL 核验的 18 条人源条目。
 * 不在表内一律报错（防止凭记忆写 ID）。
 */
const VERIFIED_PDB = {
  "1HWK": { title: /HMG-COA REDUCTASE.*ATORVASTATIN/i, resolution: 2.22, ligand: /117/ },
  "1HW9": { title: /HMG-COA REDUCTASE.*SIMVASTATIN/i, resolution: 2.33, ligand: /SIM/ },
  "1DQA": { title: /HMG.*COA.*NADP/i, resolution: 2.0, ligand: /MAH/ },
  "2R3V": { title: /MEVALONATE KINASE/i, resolution: 2.5, ligand: null },
  "3CH4": { title: /PHOSPHOM.*KINASE/i, resolution: 1.76, ligand: /SO4/ },
  "3D4J": { title: /MEVALONATE DIPHOSPHATE DECARBOXYLASE/i, resolution: 2.4, ligand: /SO4/ },
  "2ICK": { title: /ISOPENTENYL DIPH.*ISOMERASE/i, resolution: 1.93, ligand: /DMA/ },
  "5CG6": { title: /FARNESYL PYROPHOSPHATE SYNTHASE/i, resolution: 1.7, ligand: /RIS/ },
  "5JA0": { title: /FPPS|FARNESYL PYROPHOSPHATE SYNTHASE/i, resolution: 1.9, ligand: /FPP/ },
  "3WEG": { title: /SQUALENE SYNTHASE/i, resolution: 1.75, ligand: /FPS/ },
  "3VJC": { title: /SQUALENE SYNTHASE/i, resolution: 1.89, ligand: /ZGA/ },
  "6C6P": { title: /SQUALENE EPOXIDASE|SQUALENE MONOOXYGENASE/i, resolution: 2.5, ligand: /EMV/ },
  "1W6K": { title: /OSC.*LANOSTEROL|LANOSTEROL/i, resolution: 2.1, ligand: /LAN/ },
  "1W6J": { title: /OSC.*RO 48-8071|RO 48-8071/i, resolution: 2.2, ligand: /R71/ },
  "4UHI": { title: /14-ALPHA DEMETHYLASE|CYP51/i, resolution: 2.04, ligand: /VFV/ },
  "6UEZ": { title: /14A-DEMETHYLASE|CYP51/i, resolution: 1.98, ligand: /LAN/ },
  "6JKH": { title: /NSDHL/i, resolution: 3.0, ligand: /NAD/ },
  "6OHT": { title: /EBP/i, resolution: 3.2, ligand: /MKM/ },
};

/** 盘点时已确认身份不符的条目：不得出现在本通路。 */
const FORBIDDEN_PDB = new Set(["2CG5", "1XKT", "1C9S", "4F2Y"]);

/** pH 7.4 分子式 / 净电荷对表（中性式计 H；电荷按 chargeBasis 的基团求和）。 */
const MOL_ORACLE = {
  accoa: ["C23H36N7O17P3S", -2],
  acacoa: ["C25H38N7O18P3S", -2],
  hmgcoa: ["C27H41N7O20P3S", -3],
  mevalonate: ["C6H11O4", -1],
  mev5p: ["C6H10O7P", -3],
  mev5pp: ["C6H10O10P2", -4],
  ipp: ["C5H9O7P2", -3],
  dmapp: ["C5H9O7P2", -3],
  gpp: ["C10H17O7P2", -3],
  fpp: ["C15H25O7P2", -3],
  squalene: ["C30H50", 0],
  oxidosqualene: ["C30H50O", 0],
  lanosterol: ["C30H50O", 0],
  "7dhc": ["C27H44O", 0],
  desmosterol: ["C27H44O", 0],
  cholesterol: ["C27H46O", 0],
};

const STEP_ENZYME = {
  "ch-1": { name: /乙酰-CoA 乙酰转移酶|硫解酶|ACAT/i, ec: "2.3.1.9" },
  "ch-2": { name: /HMG-CoA 合酶|HMGCS/i, ec: "2.3.3.10" },
  "ch-3": { name: /HMG-CoA 还原酶/i, ec: "1.1.1.34" },
  "ch-4": { name: /甲羟戊酸激酶|MVK/i, ec: "2.7.1.36" },
  "ch-5": { name: /磷酸甲羟戊酸激酶|PMVK/i, ec: "2.7.4.2" },
  "ch-6": { name: /脱羧酶|MVD/i, ec: "4.1.1.33" },
  "ch-7": { name: /异构酶|IDI1/i, ec: "5.3.3.2" },
  "ch-8": { name: /法尼基二磷酸合酶|FDPS/i, ec: "2.5.1.10" },
  "ch-9": { name: /法尼基二磷酸合酶|FDPS/i, ec: "2.5.1.10" },
  "ch-10": { name: /角鲨烯合酶|FDFT1/i, ec: "2.5.1.21" },
  "ch-11": { name: /角鲨烯.*(环氧|单加氧)|SQLE/i, ec: "1.14.14.17" },
  "ch-12": { name: /羊毛甾醇合酶|LSS/i, ec: "5.4.99.7" },
  "ch-13": { name: /去甲基酶|CYP51/i, ec: "1.14.14.154" },
};

const CLUSTER_EC = {
  CYP51A1: "1.14.14.154",
  TM7SF2: "1.3.1.70",
  MSMO1: "1.14.13.72",
  NSDHL: "1.1.1.170",
  HSD17B7: "1.1.1.62",
  EBP: "5.3.3.5",
  SC5D: "1.3.1.21",
  DHCR7: "1.3.1.71",
  DHCR24: "1.3.1.72",
};

const TWO_D_ASSETS = ["mevalonate", "mev5p", "mev5pp", "ipp", "dmapp", "squalene", "oxidosqualene", "lanosterol", "cholesterol"];

const SUB_DIGITS = { "₀": "0", "₁": "1", "₂": "2", "₃": "3", "₄": "4", "₅": "5", "₆": "6", "₇": "7", "₈": "8", "₉": "9" };

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

function rectOf(node) {
  const w = node.w ?? (node.r ? node.r * 2 : 100);
  const h = node.h ?? (node.r ? node.r * 2 : 30);
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
  const nodes = skel.nodes ?? [];
  const links = skel.links ?? [];
  const zones = skel.compartments ?? [];
  const W = skel.canvas?.width;
  const H = skel.canvas?.height;

  const entById = new Map(entities.map((e) => [e.id, e]));
  const stepById = new Map(steps.map((s) => [s.id, s]));
  const nodeById = new Map(nodes.map((n) => [n.id, n]));
  const zoneById = new Map(zones.map((c) => [c.id, c]));

  // ---------- 1) 实体 / 电离态 ----------
  if (entities.length !== 38) warn(`实体数应为 38（16 代谢物 + 20 酶 + 1 信号 + 1 药物），实际 ${entities.length}`);
  const metIds = entities.filter((e) => e.kind === "metabolite").map((e) => e.id);
  if (metIds.length !== 16) warn(`代谢物应为 16 个，实际 ${metIds.length}`);
  for (const [id, [formula, charge]] of Object.entries(MOL_ORACLE)) {
    const e = entById.get(id);
    if (!e) {
      warn(`缺少代谢物实体 ${id}`);
      continue;
    }
    const c = canonFormula(e.formula);
    if (c !== formula) warn(`实体 ${id} 的分子式应为 ${formula}，实际 ${c}`);
    if (e.charge !== charge) warn(`实体 ${id} 的净电荷应为 ${charge}，实际 ${e.charge}`);
  }
  for (const e of entities) {
    if (e.kind !== "metabolite") continue;
    if (!e.formula || !e.chargeBasis || !Array.isArray(e.ionizableGroups)) {
      warn(`实体 ${e.id} 缺少 formula / chargeBasis / ionizableGroups`);
      continue;
    }
    const signed = e.ionizableGroups
      .map((g) => {
        const m = String(g).match(/[−-]([0-9])$/);
        return m ? -Number(m[1]) : 0;
      })
      .reduce((a, b) => a + b, 0);
    if (signed !== e.charge) warn(`实体 ${e.id} 的电荷求和 ${signed} ≠ charge ${e.charge}`);
    for (const g of e.ionizableGroups) {
      const s = String(g);
      if (/羧基/.test(s) && !/[−-]1$/.test(s)) warn(`实体 ${e.id} 的羧基应按 pKa≈4.8 记 −1：${s}`);
      if (/二磷酸单酯/.test(s)) {
        if (!/[−-]3$/.test(s)) warn(`实体 ${e.id} 的二磷酸单酯应按 −3 记：${s}`);
      } else if (/磷酸单酯/.test(s)) {
        if (!/[−-]2$/.test(s)) warn(`实体 ${e.id} 的磷酸单酯应按 −2 记：${s}`);
      }
    }
    if (/羟基/.test(e.chargeBasis) && !/不解离|不电离|pKa\s*≈\s*1[45]/.test(e.chargeBasis)) {
      warn(`实体 ${e.id} 的 hydroxyl 必须写明 pH 7.4 不解离`);
    }
  }

  // ---------- 2) 步骤 / 酶身份 ----------
  if (steps.length !== 13) warn(`步骤数应为 13，实际 ${steps.length}`);
  if (dupes(steps.map((s) => s.id)).length) warn(`步骤 id 重复：${dupes(steps.map((s) => s.id)).join("、")}`);
  if (dupes(steps.map((s) => s.index)).length) warn("步骤 index 重复");
  const indexes = steps.map((s) => s.index).sort((a, b) => a - b);
  if (indexes.join(",") !== "1,2,3,4,5,6,7,8,9,10,11,12,13") warn(`步骤 index 不是 1–13：${indexes.join(",")}`);

  for (const [id, want] of Object.entries(STEP_ENZYME)) {
    const s = stepById.get(id);
    if (!s) {
      warn(`缺少步骤 ${id}`);
      continue;
    }
    if (!want.name.test(s.enzyme?.name ?? "")) warn(`步骤 ${id} 的酶名不符：${s.enzyme?.name}`);
    if (s.enzyme?.ec !== want.ec) warn(`步骤 ${id} 的 EC 应为 ${want.ec}，实际 ${s.enzyme?.ec}`);
    if (!entById.has(s.enzyme?.entityId)) warn(`步骤 ${id} 的酶实体 ${s.enzyme?.entityId} 不存在`);
  }
  for (const s of steps) {
    if (!["upstream", "midstream", "downstream"].includes(s.phase)) warn(`步骤 ${s.id} 的 phase 非法：${s.phase}`);
    if (!["cytosol", "er"].includes(s.compartment)) warn(`步骤 ${s.id} 的 compartment 非法：${s.compartment}`);
    const pool = [...(s.reaction?.substrates ?? []), ...(s.reaction?.products ?? [])];
    if (!pool.length) warn(`步骤 ${s.id} 缺少底物 / 产物`);
    for (const id of pool) if (!entById.has(id)) warn(`步骤 ${s.id} 引用了不存在的实体 ${id}`);
    if (!/→|⇌/.test(String(s.reaction?.equation ?? ""))) warn(`步骤 ${s.id} 的反应式缺少方向箭头`);
    if (s.deltaG?.value !== null) warn(`步骤 ${s.id} 的 ΔG 数值必须为 null（页面不展示数值）`);
    if (!String(s.deltaG?.qualitative ?? "").trim()) warn(`步骤 ${s.id} 缺少 ΔG 定性说明`);
    if (!/Lehninger/.test(s.deltaG?.source ?? "")) warn(`步骤 ${s.id} 的 ΔG 出处必须写 Lehninger`);
    if (!/8e/.test(s.deltaG?.source ?? "")) warn(`步骤 ${s.id} 的 ΔG 出处必须写 8e`);
    if (!String(s.physiology ?? "").trim()) warn(`步骤 ${s.id} 缺少生理意义`);
    // 他汀不得写成反应步骤（步骤名可以标「他汀靶点」，但酶名 / 反应式 / 底物 / 产物不行）
    if (/他汀|statin|simvastatin|atorvastatin/i.test(`${s.enzyme?.name} ${s.reaction?.equation}`)) {
      warn(`步骤 ${s.id} 把他汀写成了反应步骤（只能作为药物节点 / 调控条目）`);
    }
    if ((s.reaction?.substrates ?? []).includes("statin") || (s.reaction?.products ?? []).includes("statin")) {
      warn(`步骤 ${s.id} 把他汀当成底物 / 产物（只能作为药物节点）`);
    }
  }

  // ---------- 3) 去甲基化簇 ----------
  const cluster = stepById.get("ch-13")?.cluster;
  if (!cluster) warn("ch-13 缺少 cluster（下游 9 酶压缩表达）");
  else {
    const enz = cluster.enzymes ?? [];
    if (enz.length !== 9) warn(`簇内酶必须为 9，实际 ${enz.length}`);
    for (const [abbr, ec] of Object.entries(CLUSTER_EC)) {
      const e = enz.find((x) => x.abbr === abbr);
      if (!e) {
        warn(`簇内缺少 ${abbr}`);
        continue;
      }
      if (!e.ec) warn(`簇内 ${abbr} 缺少 EC`);
      else if (e.ec !== ec) warn(`簇内 ${abbr} 的 EC 应为 ${ec}，实际 ${e.ec}`);
      if (!String(e.action ?? "").trim()) warn(`簇内 ${abbr} 缺少动作说明`);
    }
  }

  // ---------- 4) 他汀只作药物 / 调控 ----------
  const statinEnt = entById.get("statin");
  if (!statinEnt) warn("缺少 statin 药物实体");
  else if (statinEnt.kind !== "drug") warn("statin 实体的 kind 必须是 drug");
  const regStat = (data.regulation ?? []).find((r) => r.id === "reg-statin");
  if (!regStat) warn("缺少 reg-statin 调控条目");
  else {
    if (regStat.kind !== "drug") warn("reg-statin 的 kind 必须是 drug");
    if (!/不是反应步骤/.test(`${regStat.title ?? ""} ${regStat.text ?? ""}`)) warn("reg-statin 必须明写「药物作用于节点，不是反应步骤」");
  }
  if (!steps.some((s) => s.id === "ch-3" && /限速/.test(s.name ?? ""))) warn("ch-3 必须写明限速步");

  // ---------- 5) 能量账 ----------
  const ledger = data.energyLedger ?? {};
  if (!/无净收支/.test(JSON.stringify(ledger))) warn("能量账必须至少有「无净收支」的表述（零收支不得硬凑）");
  for (const e of ledger.entries ?? []) {
    if (typeof e.value === "number" && e.value < 0) warn(`能量账条目 ${e.id} 不得写负数`);
    if (e.value === 0 && !/无净收支/.test(e.note ?? "")) warn(`零收支条目 ${e.id} 必须写「无净收支」`);
  }
  const pm = ledger.perMevalonate ?? {};
  if (pm.atp !== 3) warn(`每甲羟戊酸应耗 3 ATP，实际 ${pm.atp}`);
  if (pm.nadphHmgcr !== 2) warn(`每甲羟戊酸 HMGCR 应耗 2 NADPH，实际 ${pm.nadphHmgcr}`);
  const rr = ledger.referenceRun ?? {};
  if (rr.mevalonateUnits !== 6) warn(`参考轮次应为 6 个甲羟戊酸，实际 ${rr.mevalonateUnits}`);
  if (rr.atpCost !== (rr.mevalonateUnits ?? 0) * (pm.atp ?? 0)) {
    warn(`能量账算术不符：atpCost ${rr.atpCost} ≠ ${rr.mevalonateUnits} × ${pm.atp}`);
  }
  if (rr.nadphBeforeCluster !== (rr.mevalonateUnits ?? 0) * (pm.nadphHmgcr ?? 0) + 2) {
    warn(`能量账算术不符：nadphBeforeCluster ${rr.nadphBeforeCluster} ≠ 6 × 2 + FDFT1 1 + SQLE 1`);
  }
  const eHmgcr = (ledger.entries ?? []).find((e) => e.id === "e-hmgcr");
  if (eHmgcr?.value !== 2) warn("能量账 e-hmgcr 必须是 2 NADPH");
  for (const id of ["e-mvk", "e-pmvk", "e-mvd"]) {
    const e = (ledger.entries ?? []).find((x) => x.id === id);
    if (e?.value !== 1) warn(`能量账 ${id} 必须是 1 ATP`);
  }
  for (const id of ["e-fdft1", "e-sqle"]) {
    const e = (ledger.entries ?? []).find((x) => x.id === id);
    if (e?.value !== 1) warn(`能量账 ${id} 必须是 1 NADPH`);
  }
  const eCluster = (ledger.entries ?? []).find((e) => e.id === "e-cluster");
  if (!eCluster) warn("能量账缺少簇条目");
  else if (eCluster.value !== null) warn("簇内还原当量必须 value=null（不得合并成单一数字）");

  // ---------- 6) 守恒 ----------
  const cons = data.conservation ?? {};
  const c = cons.carbon ?? {};
  if ((c.acetylCoaUnits ?? 0) * 2 !== c.acetylCoaCarbons) warn("碳守恒：18 乙酰-CoA 的碳数不符");
  if (c.acetylCoaCarbons !== c.cholesterolCarbons + c.co2Carbons) warn("碳守恒：36 ≠ 27 + 9");
  const ph = cons.phosphate ?? {};
  if (!(ph.atpInput === ph.adpOutput && ph.adpOutput === ph.piOutput)) warn("磷酸守恒：ATP / ADP / Pi 不配平");
  const iso = cons.isoprene ?? {};
  if ((iso.ippUnits ?? 0) * 5 !== iso.squaleneCarbons) warn("异戊二烯守恒：6 × C5 ≠ C30");
  if (iso.fppUnitsPerSqualene !== 2) warn("角鲨烯必须由 2 个 FPP 缩合");
  if ((cons.redox ?? {}).nadphBeforeCluster !== rr.nadphBeforeCluster) warn("redox 与能量账的簇前 NADPH 不一致");

  // ---------- 7) 接口 / sharedWith ----------
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
  for (const i of data.interfaces ?? []) {
    for (const sh of i.sharedWith ?? []) {
      const pw = PATHWAYS.get(sh.pathwayId);
      if (!pw) {
        warn(`接口 ${i.id} 指向不存在的通路 ${sh.pathwayId}`);
        continue;
      }
      if (!pw.steps.has(sh.stepId)) warn(`接口 ${i.id} 指向幽灵步骤 ${sh.pathwayId}:${sh.stepId}`);
      if (!pw.entities.has(sh.entityId)) warn(`接口 ${i.id} 指向幽灵实体 ${sh.pathwayId}:${sh.entityId}`);
    }
  }

  // ---------- 8) PDB 身份 ----------
  const cands = data.threeD?.candidates ?? [];
  if (cands.length !== 18) warn(`应登记 18 个唯一 PDB 条目，实际 ${cands.length}`);
  const seen = new Set();
  for (const p of cands) {
    if (seen.has(p.pdbId)) warn(`PDB ${p.pdbId} 重复登记`);
    seen.add(p.pdbId);
    if (FORBIDDEN_PDB.has(p.pdbId)) warn(`PDB ${p.pdbId} 已核验身份不符，不得登记`);
    const want = VERIFIED_PDB[p.pdbId];
    if (!want) warn(`PDB ${p.pdbId} 不在已实时核验的人源清单内`);
    else {
      if (!want.title.test(p.entryTitle ?? "")) warn(`PDB ${p.pdbId} 标题与真实条目不符：${p.entryTitle}`);
      if (Math.abs((p.resolution ?? 0) - want.resolution) > 0.02) warn(`PDB ${p.pdbId} 分辨率应为 ${want.resolution}，实际 ${p.resolution}`);
      if (want.ligand && !want.ligand.test((p.ligandCodes ?? []).join(","))) warn(`PDB ${p.pdbId} 配体代码与真实条目不符：${(p.ligandCodes ?? []).join(",")}`);
    }
    if (!/Homo sapiens/i.test(p.organism ?? "")) warn(`PDB ${p.pdbId} 的物种必须写 Homo sapiens，当前「${p.organism}」`);
    if (!/X-ray|X-RAY|Xray|neutron/i.test(p.method ?? "")) warn(`PDB ${p.pdbId} 的方法缺失或非法：${p.method}`);
    if (!Number.isFinite(p.resolution) || p.resolution <= 0 || p.resolution > 4) warn(`PDB ${p.pdbId} 缺少已核验的分辨率`);
    if (!String(p.chains ?? "").trim()) warn(`PDB ${p.pdbId} 缺少链`);
    if (!Array.isArray(p.ligands) || !p.ligands.length) warn(`PDB ${p.pdbId} 缺少配体字段（无配体写「无」）`);
    if (!String(p.expressionSystem ?? "").trim()) warn(`PDB ${p.pdbId} 缺少表达系统`);
    if (!String(p.mutations ?? "").trim()) warn(`PDB ${p.pdbId} 缺少突变状态`);
    if (!String(p.note ?? "").trim()) warn(`PDB ${p.pdbId} 缺少核验说明`);
    if (p.verifiedOn !== data.threeD?.verifiedOn) warn(`PDB ${p.pdbId} 的 verifiedOn 与 threeD.verifiedOn 不一致`);
  }
  const byPdb = new Map(cands.map((p) => [p.pdbId, p]));
  for (const s of steps) {
    for (const p of s.pdbCandidates ?? []) {
      if (!seen.has(p.pdbId)) warn(`步骤 ${s.id} 的 pdbCandidate ${p.pdbId} 不在 threeD.candidates 里`);
      if (p.status !== "verified") warn(`步骤 ${s.id} 的 pdbCandidate ${p.pdbId} 缺少 status=verified`);
      if (!String(p.organism ?? "").trim() || !String(p.method ?? "").trim()) {
        warn(`步骤 ${s.id} 的 pdbCandidate ${p.pdbId} 缺物种 / 方法`);
      }
      if (!Number.isFinite(p.resolution) || p.resolution <= 0) warn(`步骤 ${s.id} 的 pdbCandidate ${p.pdbId} 缺分辨率`);
      if (!Array.isArray(p.ligands) || (!p.ligands.length && p.role !== "apo")) {
        warn(`步骤 ${s.id} 的 pdbCandidate ${p.pdbId} 缺配体`);
      }
      const ref = byPdb.get(p.pdbId);
      if (
        ref &&
        (ref.organism !== p.organism ||
          ref.method !== p.method ||
          ref.resolution !== p.resolution ||
          JSON.stringify(ref.ligandCodes) !== JSON.stringify(p.ligandCodes))
      ) {
        warn(`步骤 ${s.id} 的 pdbCandidate ${p.pdbId} 与 threeD.candidates 的核验字段不一致`);
      }
    }
  }
  if (data.threeD?.status !== "pending") warn("threeD.status 必须是 pending");
  if (!/未核验|NONE|无人源结构/.test(data.threeD?.note ?? "")) warn("threeD.note 必须写明未核验 / 无人源结构的酶");

  // ---------- 9) 骨架几何 / 区室 ----------
  if (W !== 1980 || H !== 1000) warn(`画布应为 1980×1000，实际 ${W}×${H}`);
  if (zones.length !== 2) warn(`区室带应为 2 条（胞质 / 内质网），实际 ${zones.length}`);
  for (const id of ["cytosol", "er"]) if (!zoneById.has(id)) warn(`缺少区室 ${id}`);
  const cz = zoneById.get("cytosol");
  const ez = zoneById.get("er");
  if (cz && ez) {
    if (!(cz.y1 < ez.y0)) warn("胞质带必须整体位于内质网带上方（不得压成一条）");
    if (cz.x0 !== ez.x0 || cz.x1 !== ez.x1) warn("两条区室带的横向范围应一致");
  }
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

  const endpointOk = (id) => nodeById.has(id) || zoneById.has(id);
  for (const l of links) {
    if (!endpointOk(l.from) || !endpointOk(l.to)) warn(`连线 ${l.id} 引用了不存在的端点 ${l.from} → ${l.to}`);
    if (l.stepId && !stepById.has(l.stepId)) warn(`连线 ${l.id} 引用了不存在的 stepId ${l.stepId}`);
    if (!String(l.path ?? "").startsWith("M")) warn(`连线 ${l.id} 缺少可用 path`);
    if (l.label && (!Number.isFinite(l.labelX) || !Number.isFinite(l.labelY))) warn(`连线 ${l.id} 有 label 但缺 labelX / labelY`);
  }
  for (const s of steps) {
    if (!links.some((l) => l.stepId === s.id && l.type === "main")) warn(`步骤 ${s.id} 没有 main 弧`);
    // 步骤落位必须与声明的区室一致（看 main 弧终点）
    const main = links.filter((l) => l.stepId === s.id && l.type === "main");
    for (const l of main) {
      const target = nodeById.get(l.to);
      if (!target) continue;
      const band = s.compartment === "cytosol" ? cz : ez;
      if (band) {
        const r = rectOf(target);
        if (!(r.y0 >= band.y0 && r.y1 <= band.y1)) warn(`步骤 ${s.id} 声明 ${s.compartment}，但终点节点 ${target.id} 不在对应区室带`);
      }
    }
  }

  const statinNode = nodeById.get("statin");
  if (!statinNode) warn("骨架缺少 statin 药物节点");
  else if (statinNode.kind !== "drug") warn("statin 节点 kind 必须是 drug");
  const drugLink = links.find((l) => l.id === "l-drug");
  if (!drugLink) warn("缺少 statin → HMGCR 的控制连线");
  else {
    if (drugLink.type !== "control") warn("statin 连线必须是 control（药物作用于节点）");
    if (drugLink.stepId) warn("statin 连线不得挂 stepId（它不是反应步骤）");
    if (drugLink.to !== "hmgcr") warn("statin 连线必须指向 HMGCR 节点");
  }
  const side = links.find((l) => l.id === "l-side-fpp");
  if (!side) warn("缺少 FPP 旁路连线");
  else if (side.type !== "side") warn("FPP 旁路必须是 side（降权表达）");
  if (!nodeById.has("mod-cluster")) warn("骨架缺少下游修饰簇节点");
  const anns = skel.annotations ?? [];
  if (anns.length < 12) warn(`注记过少（${anns.length} 条），区室 / SREBP-2 / 能量 / 他汀 / SLOS 说明应齐全`);
  for (const a of anns) {
    if (!String(a.text ?? "").trim()) warn("存在空注记");
    if (!Number.isFinite(a.x) || !Number.isFinite(a.y) || a.x < 0 || a.y < 0 || a.x > W || a.y > H) warn(`注记「${a.text}」越出画布`);
  }
  const annText = anns.map((a) => a.text).join(" ");
  if (!/SREBP-2/.test(annText)) warn("缺少 SREBP-2 反馈注记");
  if (!/他汀作用于 HMGCR/.test(annText)) warn("缺少「他汀作用于 HMGCR，不写成反应步骤」注记");
  if (!/FDPS 在胞质/.test(annText)) warn("缺少 FDPS 胞质定位修正注记");
  if (!/CYP51A1 1\.14\.14\.154/.test(annText)) warn("缺少簇内逐酶 EC 注记");

  // ---------- 10) 页面 / 结构对照 / 首页 ----------
  const pageChecks = [
    ['data-frame="cholesterol"', /data-frame="cholesterol"/],
    ["步骤计数", /data-step-count={DATA\.steps\.length}/],
    ["区室计数", /data-compartment-count={SKELETON\.compartments\.length}/],
    ["簇计数", /data-cluster-count=/],
    ["PDB 计数", /data-pdb-count={DATA\.threeD\.candidates\.length}/],
    ["无缩放标记", /data-no-zoom="1"/],
    ["区室渲染", /data-zone=/],
    ["结构对照入口", /\/structures\/cholesterol/],
    ["簇内逐酶渲染", /data-cluster-enzyme/],
    ["PDB 身份渲染", /data-pdb-id=/],
  ];
  for (const [label, re] of pageChecks) if (!re.test(ctx.pageSrc)) warn(`页面缺少 ${label}`);
  if (/onWheel|zoomIn|zoomOut|缩放按钮/i.test(ctx.pageSrc)) warn("页面不得出现缩放控件");
  if (/\/assets\/steps\/cholesterol-/.test(ctx.pageSrc)) warn("页面引用了不存在的酶 3D 资产路径");

  const cmpBlock = ctx.cmpSrc.slice(ctx.cmpSrc.indexOf("const CHOL_MEV"), ctx.cmpSrc.indexOf("const CHOLESTEROL_CONFIG"));
  if (!cmpBlock) warn("comparisonConfig 缺少 CHOLESTEROL_COMPARISON");
  const cmpIds = [...cmpBlock.matchAll(/stepId:\s*"(ch-[0-9]+)"/g)].map((m) => m[1]);
  if (cmpIds.length < 5 || cmpIds.length > 7) warn(`结构对照块应为 5–7 块，实际 ${cmpIds.length}`);
  if (dupes(cmpIds).length) warn(`结构对照块 stepId 重复：${dupes(cmpIds).join("、")}`);
  for (const id of cmpIds) if (!stepById.has(id)) warn(`结构对照块引用了不存在的步骤 ${id}`);
  for (const id of TWO_D_ASSETS) {
    if (!cmpBlock.includes(`D2("${id}")`)) warn(`结构对照块缺少分子 ${id} 的 2D 资产`);
    if (!existsSync(join(ROOT, "public", "assets", "structures", "2d", `${id}.json`))) warn(`缺少 2D 资产 public/assets/structures/2d/${id}.json`);
    if (!existsSync(join(ROOT, "public", "assets", "structures", "2d", `${id}.svg`))) warn(`缺少 2D 资产 public/assets/structures/2d/${id}.svg`);
  }
  if (!/pathwayId:\s*"cholesterol"/.test(ctx.cmpSrc)) warn("COMPARISON_CONFIGS 未登记 cholesterol");
  const cholCfg = ctx.cmpSrc.slice(ctx.cmpSrc.indexOf("const CHOLESTEROL_CONFIG"));
  if (!/plateNo:\s*"PLATE SF-12/.test(cholCfg)) warn("结构对照 plateNo 必须用 SF-12");
  if (!/enzymePanel:\s*false/.test(cholCfg)) warn("cholesterol 结构对照必须 enzymePanel=false");
  if (!/back:\s*{\s*to:\s*"\/pathway\/cholesterol"/.test(cholCfg)) warn("结构对照返回链接必须指向 /pathway/cholesterol");

  if (!/id:\s*"cholesterol"/.test(ctx.homeMapSrc)) warn("homeMap 未登记 cholesterol");
  if (!/plateNo:\s*"PLATE 12"/.test(ctx.homeMapSrc)) warn("homeMap 的 cholesterol 必须是 PLATE 12");
  if (!/stepCount:\s*13/.test(ctx.homeMapSrc)) warn("homeMap 的 cholesterol stepCount 必须是 13");
  if (!/pathwayId:\s*"cholesterol"/.test(ctx.homeLayoutSrc)) warn("homeLayout 未登记 cholesterol 标题");
  if (!/pathwayId:\s*"cholesterol".*y:\s*698/.test(ctx.homeLayoutSrc)) warn("cholesterol 标题应落在第 12 槽 y=698");
  if (!/HOME_RESERVED_SLOTS[^=]*=\s*\[\]/s.test(ctx.homeLayoutSrc)) warn("HOME_RESERVED_SLOTS 必须清空（第 12 槽已接入）");
  if (!/cholesterol/.test(ctx.mainSrc)) warn("main.tsx 未登记 cholesterol 路由");
  if (!/pathway\/cholesterol-synthesis|cholesterol-synthesis/.test(ctx.mainSrc)) warn("main.tsx 缺少 /pathway/cholesterol-synthesis 别名");

  return errors;
}

const ctx = { pageSrc, cmpSrc, homeMapSrc, homeLayoutSrc, mainSrc };
const errors = check(baseData, baseSkel, ctx);
if (errors.length) {
  console.error("胆固醇合成数据校验失败：");
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}
console.log(
  `validate-cholesterol：正例通过（${baseData.steps.length} 步 / ${baseData.entities.length} 实体 / ${baseSkel.nodes.length} 节点 / ${baseSkel.links.length} 连线 / 18 条已核验 PDB）`,
);

// ===== 负例自检 =====
function clone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

const negatives = [];
const expectFail = (name, mutate, needle) => {
  const data = clone(baseData);
  const skel = clone(baseSkel);
  const c = { ...ctx };
  mutate(data, skel, c);
  const errs = check(data, skel, c);
  if (!errs.length) negatives.push({ name, ok: false, why: "未抓到" });
  else if (needle && !errs.some((e) => String(e).includes(needle))) negatives.push({ name, ok: false, why: `抓到了但不是预期：${errs[0]}` });
  else negatives.push({ name, ok: true });
};

expectFail("幽灵步骤 id：ch-3 指向 glycolysis:gk-99", (d) => {
  d.steps.find((s) => s.id === "ch-3").sharedWith = [{ pathwayId: "glycolysis", stepId: "gk-99", entityId: "accoa" }];
}, "不存在的步骤");

expectFail("幽灵实体 id：ch-1 底物写 ghost", (d) => {
  d.steps.find((s) => s.id === "ch-1").reaction.substrates[0] = "ghost";
}, "不存在的实体");

expectFail("编造 ΔG 数值", (d) => {
  d.steps[0].deltaG.value = -22.4;
}, "ΔG 数值必须为 null");

expectFail("PDB 身份缺物种", (d) => {
  d.threeD.candidates[0].organism = "";
}, "物种必须写 Homo sapiens");

expectFail("PDB 不在已核验清单", (d) => {
  d.threeD.candidates[0].pdbId = "9XYZ";
}, "不在已实时核验");

expectFail("他汀被写成反应步骤", (d) => {
  const s = d.steps.find((x) => x.id === "ch-3");
  s.enzyme.name = "他汀抑制的 HMGCR";
  s.reaction.equation = "HMG-CoA + 他汀 → 抑制";
}, "他汀写成了反应步骤");

expectFail("能量账算术错（atpCost 17）", (d) => {
  d.energyLedger.referenceRun.atpCost = 17;
}, "能量账算术不符");

expectFail("电离态错：mev5p 净电荷 −2", (d) => {
  d.entities.find((e) => e.id === "mev5p").charge = -2;
}, "净电荷应为 -3");

expectFail("电离态错：IPP 二磷酸按 −2 记", (d) => {
  d.entities.find((e) => e.id === "ipp").ionizableGroups = ["末端二磷酸单酯 −2"];
}, "二磷酸单酯应按 −3");

expectFail("簇内少一个酶", (d) => {
  d.steps.find((s) => s.id === "ch-13").cluster.enzymes.pop();
}, "簇内酶必须为 9");

expectFail("簇内缺 EC", (d) => {
  const c = d.steps.find((s) => s.id === "ch-13").cluster;
  delete c.enzymes.find((e) => e.abbr === "SC5D").ec;
}, "缺少 EC");

expectFail("节点越出画布", (d, s) => {
  s.nodes.find((n) => n.id === "ggpp").x = 2000;
}, "越出画布");

expectFail("节点重叠", (d, s) => {
  s.nodes.find((n) => n.id === "7dhc").y = 770;
}, "重叠");

expectFail("他汀连线变成反应主链", (d, s) => {
  s.links.find((l) => l.id === "l-drug").type = "main";
}, "必须是 control");

expectFail("区室带被压成一条", (d, s) => {
  s.compartments.find((z) => z.id === "er").y0 = 400;
}, "整体位于内质网带上方");

expectFail("结构对照块只剩 3 块", (d, s, c) => {
  c.cmpSrc = c.cmpSrc.replace('stepId: "ch-12"', 'stepId: "ch-12x"').replace('stepId: "ch-11"', 'stepId: "ch-12y"').replace('stepId: "ch-13"', 'stepId: "ch-12z"').replace('stepId: "ch-7"', 'stepId: "ch-12w"');
}, "结构对照块应为 5–7");

expectFail("首页标题挪回 y=650", (d, s, c) => {
  c.homeLayoutSrc = c.homeLayoutSrc.replace(/pathwayId: "cholesterol".*y: 698/g, 'pathwayId: "cholesterol", x: 28, y: 650');
}, "第 12 槽 y=698");

expectFail("预留槽没有清空", (d, s, c) => {
  c.homeLayoutSrc = c.homeLayoutSrc.replace("HOME_RESERVED_SLOTS: HomeReservedSlot[] = []", 'HOME_RESERVED_SLOTS: HomeReservedSlot[] = [{ no: 12, y: 698, note: "x" }]');
}, "HOME_RESERVED_SLOTS 必须清空");

const failed = negatives.filter((n) => !n.ok);
if (failed.length) {
  console.error("validate-cholesterol：负例自检失败");
  for (const n of failed) console.error(`  - ${n.name}：${n.why}`);
  process.exit(1);
}
console.log(`validate-cholesterol：负例自检 ${negatives.length}/${negatives.length} 全部抓到`);
