#!/usr/bin/env node
// 糖原代谢数据层校验器（PLATE 10 / 结构对照 SF-10）
//
// 正例检查：
//   ① id 唯一（entities + steps + nodes 合并命名空间）与引用完整性；
//   ② 两条臂闭合：分解 gly-1→gly-2→gly-3→gly-5、肝出口 gly-4、
//      合成 gly-6→gly-7→gly-8→gly-9，末步回到同一糖原颗粒池；
//   ③ 肝 vs 肌：肝表达 G6PC1、肌不表达；gly-4 只在肝、gly-5 只在肌；
//      器官节点落在对应臂泳道，胞质节点不越界；
//   ④ 能量账算术：分解每残基省 1 ATP；合成每残基 2 个酐键（UTP→PPi 1 + PPi 水解 1）；
//      100 残基参考轮次 = 200 / 100；
//   ⑤ 碳 / 磷酸守恒：C6 不丢；分解 Pi 1→1；合成 1+3=4=2+2；
//   ⑥ 电离态：pH 7.4 下 G1P/G6P/F6P 磷酸单酯 −2、UDP-葡萄糖磷酸 −2、UTP −4、
//      PPi −3、UDP −2、Pi −2、AMP −2、ATP −4、cAMP −1，分子式逐项一致；
//   ⑦ ΔG 一律 null + 定性 + Lehninger 8e，不出现数字；
//   ⑧ 3D 候选身份字段齐全（PDB ID / 标题 / 物种 / 方法 / 分辨率 / 链 / 配体 / 核验日），
//      PLP 三条必须写明人源、表达系统与突变状态；资产只允许既有 g6p / glc，missingAssets 不得在磁盘上存在；
//   ⑨ 接口 sharedWith 只指向真实存在的跨通路 step / entity id（不指向不存在 id）；
//      空接口 status=unbuilt，页面据此显示“未接入 / 数据待建”；
//   ⑩ 结构对照块数与字段：4–6 块、evidence 与 parts 一一对齐、没有手写等级。
//   附加：泳道带不重叠、节点落在所属泳道与画布内、每步至少一条骨架链接。
//
// 负例纪律：内置 12 个自洽负例，每个都必须被抓到；任一漏报 → exit 1。
import { readFileSync, existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const dataPath = join(ROOT, "src/data/glycogen/glycogen.json");
const skelPath = join(ROOT, "src/data/glycogen/skeleton.json");
const data = JSON.parse(readFileSync(dataPath, "utf8"));
const skel = JSON.parse(readFileSync(skelPath, "utf8"));
const clone = (x) => JSON.parse(JSON.stringify(x));

// 跨通路真实数据（接口 id 必须在这里存在）
const glycolysis = JSON.parse(readFileSync(join(ROOT, "src/data/glycolysis.json"), "utf8"));
const gluconeogenesis = JSON.parse(
  readFileSync(join(ROOT, "src/data/gluconeogenesis/gluconeogenesis.json"), "utf8"),
);
const cross = {
  glycolysis: {
    steps: new Set(glycolysis.steps.map((s) => s.id)),
    entities: new Set(glycolysis.entities.map((e) => e.id)),
  },
  gluconeogenesis: {
    steps: new Set(gluconeogenesis.steps.map((s) => s.id)),
    entities: new Set(gluconeogenesis.entities.map((e) => e.id)),
  },
};

// 结构对照配置（esbuild 内存打包）
const built = await build({
  entryPoints: [join(ROOT, "src", "data", "comparisonConfig.ts")],
  bundle: true,
  write: false,
  format: "esm",
  platform: "node",
});
const cfgMod = await import(
  `data:text/javascript;base64,${Buffer.from(built.outputFiles[0].text).toString("base64")}`
);
const cfg = cfgMod.comparisonConfigFor("glycogen");

const ascii = (s) =>
  Array.from(String(s), (c) => {
    const cp = c.codePointAt(0);
    return cp >= 0x2080 && cp <= 0x2089 ? String(cp - 0x2080) : c;
  }).join("");
const normFormula = (raw) =>
  ascii(raw)
    .replace(/（[^）]*）/g, "")
    .replace(/\([^)]*\)/g, "")
    .replace(/[⁻⁺·\s]/g, "");

const EXPECT_FORMULA = {
  glycogen: [0, "C6H10O5"],
  "glycogen-limit": [0, "C6H10O5"],
  g1p: [-2, "C6H11O9P"],
  g6p: [-2, "C6H11O9P"],
  glucose: [0, "C6H12O6"],
  f6p: [-2, "C6H11O9P"],
  utp: [-4, "C9H11N2O15P3"],
  "udp-glucose": [-2, "C15H22N2O17P2"],
  ppi: [-3, "HP2O7"],
  udp: [-2, "C9H12N2O12P2"],
  pi: [-2, "HPO4"],
  h2o: [0, "H2O"],
  amp: [-2, "C10H12N5O7P"],
  atp: [-4, "C10H12N5O13P3"],
  camp: [-1, "C10H11N5O6P"],
};

const REQUIRED_PHASES = {
  "gly-1": "breakdown",
  "gly-2": "breakdown",
  "gly-3": "breakdown",
  "gly-4": "breakdown",
  "gly-5": "breakdown",
  "gly-6": "synthesis",
  "gly-7": "synthesis",
  "gly-8": "synthesis",
  "gly-9": "synthesis",
};

/**
 * @param {{data: object, skel: object, cfg: object}} d
 * @returns {string[]} 错误列表（空 = 通过）
 */
function check(d) {
  const errors = [];
  const push = (msg) => errors.push(msg);
  const entities = new Map(d.data.entities.map((e) => [e.id, e]));
  const steps = new Map(d.data.steps.map((s) => [s.id, s]));
  const nodes = new Map(d.skel.nodes.map((n) => [n.id, n]));
  const laneOf = (n) => d.skel.compartments.filter((c) => n.y >= c.y0 && n.y <= c.y1);

  // ① id 唯一与数量
  for (const [name, list] of [
    ["entities", d.data.entities],
    ["steps", d.data.steps],
    ["nodes", d.skel.nodes],
    ["links", d.skel.links],
  ]) {
    const seen = new Set();
    for (const item of list) {
      if (seen.has(item.id)) push(`${name} 内 id 重复：${item.id}`);
      seen.add(item.id);
    }
  }
  if (d.data.steps.length !== 9) push(`步骤数应为 9，实际 ${d.data.steps.length}`);
  if (d.data.steps.length !== Object.keys(REQUIRED_PHASES).length) {
    push("步骤集合与 REQUIRED_PHASES 不一致");
  }

  // ② 步骤字段与两臂闭合
  for (const [id, phase] of Object.entries(REQUIRED_PHASES)) {
    const s = steps.get(id);
    if (!s) {
      push(`缺步骤 ${id}`);
      continue;
    }
    if (s.phase !== phase) push(`${id} phase 应为 ${phase}，实际 ${s.phase}`);
    if (s.index !== Number(id.split("-")[1])) push(`${id} index 应为 ${id.split("-")[1]}`);
    if (!s.enzyme?.entityId || !entities.has(s.enzyme.entityId)) {
      push(`${id} 酶引用未知实体 ${s.enzyme?.entityId}`);
    } else if (entities.get(s.enzyme.entityId).kind !== "enzyme") {
      push(`${id} 酶实体 ${s.enzyme.entityId} 的 kind 不是 enzyme`);
    }
    for (const e of [...s.reaction.substrates, ...s.reaction.products]) {
      if (!entities.has(e)) push(`${id} 反应引用未知实体 ${e}`);
    }
    if (!s.deltaG || s.deltaG.value !== null) push(`${id} ΔG 必须为 null（页面不展示数值）`);
    if (!s.deltaG?.qualitative) push(`${id} 缺 ΔG 定性描述`);
    if (!/Lehninger 8e/.test(s.deltaG?.source ?? "")) push(`${id} ΔG 出处须为 Lehninger 8e`);
    if (!s.physiology) push(`${id} 缺 physiology`);
    if (!s.organDifference) push(`${id} 缺 organDifference`);
  }
  const rewiring = (fromId, toId, entityId, label) => {
    const a = steps.get(fromId);
    const b = steps.get(toId);
    if (!a || !b) return;
    if (!a.reaction.products.includes(entityId) || !b.reaction.substrates.includes(entityId)) {
      push(`臂未闭合：${label} ${fromId} 产物 / ${toId} 底物未共享 ${entityId}`);
    }
  };
  rewiring("gly-1", "gly-3", "g1p", "分解臂 G1P");
  rewiring("gly-3", "gly-4", "g6p", "肝出口 G6P");
  rewiring("gly-3", "gly-5", "g6p", "肌分支 G6P");
  rewiring("gly-6", "gly-7", "g1p", "合成臂 G1P");
  rewiring("gly-7", "gly-8", "udp-glucose", "活化糖基");
  rewiring("gly-8", "gly-9", "glycogen", "糖原链");
  const g1 = steps.get("gly-1");
  const g9 = steps.get("gly-9");
  if (g1 && !g1.reaction.substrates.includes("glycogen")) push("gly-1 底物缺糖原");
  if (g9 && !g9.reaction.products.includes("glycogen")) push("gly-9 产物缺糖原（颗粒池未闭合）");

  // ③ 肝 vs 肌
  const liver = d.data.organs.find((o) => o.id === "liver");
  const muscle = d.data.organs.find((o) => o.id === "muscle");
  if (!liver || !muscle) push("缺 organs liver / muscle");
  else {
    if (liver.g6pc1 !== true) push("肝必须表达 G6PC1（g6pc1=true）");
    if (muscle.g6pc1 !== false) push("肌必须不表达 G6PC1（g6pc1=false）");
    if (liver.fate !== "肝糖原供全身：血糖缓冲与空腹释糖") push("肝 fate 口径被改动");
    if (muscle.fate !== "肌糖原只供自己：收缩时局部氧化供能") push("肌 fate 口径被改动");
  }
  if (steps.get("gly-4")?.organ !== "liver") push("gly-4 应只在肝（organ=liver）");
  if (steps.get("gly-5")?.organ !== "muscle") push("gly-5 应只在肌（organ=muscle）");
  const expectOrgan = {
    g6pc1: "liver",
    "glucose-liver": "liver",
    blood: "liver",
    pgi: "muscle",
    f6p: "muscle",
    "glycolysis-proj": "muscle",
  };
  for (const [id, organ] of Object.entries(expectOrgan)) {
    const n = nodes.get(id);
    if (!n) push(`缺器官节点 ${id}`);
    else if (n.organ !== organ) push(`节点 ${id} organ 应为 ${organ}，实际 ${n.organ}`);
  }
  for (const n of d.skel.nodes) {
    const hits = laneOf(n);
    if (hits.length !== 1) {
      push(`节点 ${n.id}(y=${n.y}) 未唯一落在某条泳道（命中 ${hits.map((c) => c.id).join("/") || "无"}）`);
      continue;
    }
    const lane = hits[0];
    if (n.organ === "liver" && lane.id !== "liver-arm") {
      push(`肝节点 ${n.id} 落在 ${lane.id}，应在 liver-arm`);
    }
    if (n.organ === "muscle" && lane.id !== "muscle-arm") {
      push(`肌节点 ${n.id} 落在 ${lane.id}，应在 muscle-arm`);
    }
    if (n.organ === "shared" && lane.id !== "cytosol") {
      push(`共用节点 ${n.id} 落在 ${lane.id}，应在 cytosol`);
    }
  }

  // ④ 能量账算术
  const led = d.data.energyLedger;
  const per = led?.perResidue;
  if (!per) push("缺 energyLedger.perResidue");
  else {
    if (per.breakdownSavedAtp !== 1) push("分解每残基应省 1 ATP");
    if (per.synthesisHighEnergyBonds !== 2) push("合成每残基应耗 2 个酐键");
    if (per.utpToPpiBonds !== 1 || per.ppiHydrolysisBonds !== 1) {
      push("合成 2 个酐键应为 UTP→PPi 1 + PPi 水解 1");
    }
    if (per.utpToPpiBonds + per.ppiHydrolysisBonds !== per.synthesisHighEnergyBonds) {
      push("酐键分项之和 ≠ synthesisHighEnergyBonds");
    }
    if (per.debranchFreeGlucosePerBranch !== 1) push("脱支每分支应释放 1 个游离葡萄糖");
    if (per.muscleHexokinaseCostPerFreeGlucose !== 1) push("肌内游离葡萄糖再磷酸化应耗 1 ATP");
  }
  const ref = led?.referenceRun;
  if (!ref) push("缺 energyLedger.referenceRun");
  else {
    if (ref.residues !== 100) push("参考轮次残基数应为 100");
    if (ref.synthesisCost !== ref.residues * per.synthesisHighEnergyBonds) {
      push(`参考合成代价 ${ref.synthesisCost} ≠ ${ref.residues}×${per.synthesisHighEnergyBonds}`);
    }
    if (ref.breakdownSaving !== ref.residues * per.breakdownSavedAtp) {
      push(`参考分解节省 ${ref.breakdownSaving} ≠ ${ref.residues}×${per.breakdownSavedAtp}`);
    }
  }
  const entries = new Map((led?.entries ?? []).map((e) => [e.id, e]));
  if (entries.get("e-utp")?.perResidue !== 1 || entries.get("e-ppi")?.perResidue !== 1) {
    push("账本条目 e-utp / e-ppi 各应为 +1");
  }
  if (entries.get("e-synthesis")?.perResidue !== 2) push("账本条目 e-synthesis 应为 +2");
  if (entries.get("e-phosphorolysis")?.perResidue !== -1) push("账本条目 e-phosphorolysis 应为 −1");
  if (entries.get("e-debranch")?.perResidue !== 0) push("脱支游离葡萄糖不并入每残基求和（应为 0）");

  // ⑤ 碳 / 磷酸守恒
  const cons = d.data.conservation;
  if (cons?.carbon?.perResidue !== 6) push("碳守恒：每残基应为 C6");
  const pb = cons?.phosphate?.breakdown;
  const ps = cons?.phosphate?.synthesis;
  if (!pb || pb.input !== 1 || pb.output !== 1) push("分解磷酸守恒应为 1→1（Pi → G1P → G6P → Pi）");
  if (ps) {
    if (ps.input !== ps.output || ps.input !== 4) push("合成磷酸守恒应为 4→4");
    if (ps.input !== 1 + 3) push("合成输入应 = G1P 1 + UTP 3");
    if (ps.output !== 2 + 2) push("合成输出应 = UDP-葡萄糖 2 + PPi 2");
  } else push("缺 conservation.phosphate.synthesis");
  if (cons?.highEnergy?.synthesisPerResidue !== 2 || cons?.highEnergy?.breakdownSavedPerResidue !== 1) {
    push("highEnergy 口径与能量账不一致");
  }

  // ⑥ 分子式 / 电离态
  for (const [id, [charge, formula]] of Object.entries(EXPECT_FORMULA)) {
    const e = entities.get(id);
    if (!e) {
      push(`缺实体 ${id}`);
      continue;
    }
    if (e.charge !== charge) push(`${id} 电荷应为 ${charge}，实际 ${e.charge}`);
    if (normFormula(e.formula) !== formula) {
      push(`${id} 分子式应为 ${formula}，实际 ${normFormula(e.formula)}`);
    }
  }
  if (!String(d.data.ionizationConvention ?? "").includes("pKa")) {
    // 该字段可选；有则必须写 pKa 依据，没有则要求实体 note 写明电离依据
    const missingBasis = ["g1p", "g6p", "f6p"].filter((id) => !/pKa/.test(entities.get(id)?.note ?? ""));
    if (missingBasis.length) push(`离子化依据缺 pKa：${missingBasis.join(",")}`);
  }

  // ⑦ 调控覆盖
  const reg = d.data.regulation ?? [];
  const kinds = new Set(reg.map((r) => r.kind));
  for (const k of ["covalent", "hormonal", "allosteric"]) {
    if (!kinds.has(k)) push(`缺 ${k} 类调控`);
  }
  const regTargets = new Set(reg.flatMap((r) => r.targets ?? []));
  for (const id of ["glycogen-phosphorylase", "gys", "phosphorylase-kinase", "pp1", "insulin", "glucagon", "epinephrine", "amp", "camp"]) {
    if (!regTargets.has(id)) push(`调控未覆盖 ${id}`);
  }
  for (const r of reg) {
    for (const t of r.targets ?? []) if (!entities.has(t)) push(`调控 ${r.id} 引用未知实体 ${t}`);
    if (!/Lehninger 8e/.test(r.source ?? "")) push(`调控 ${r.id} 缺 Lehninger 8e 出处`);
  }

  // ⑧ 接口 sharedWith 只指向真实 id
  for (const it of d.data.interfaces ?? []) {
    if (it.entityId && !entities.has(it.entityId)) push(`接口 ${it.id} 引用未知实体 ${it.entityId}`);
    if (!it.status) push(`接口 ${it.id} 缺 status（connected / unbuilt）`);
    if (it.status === "connected" && (it.sharedWith ?? []).length === 0) {
      push(`接口 ${it.id} 标为 connected 但没有任何真实 sharedWith`);
    }
    if (it.status === "unbuilt" && (it.sharedWith ?? []).length > 0) {
      push(`接口 ${it.id} 标为 unbuilt 但仍指向 sharedWith`);
    }
    for (const sw of it.sharedWith ?? []) {
      const target = cross[sw.pathwayId];
      if (!target) {
        push(`接口 ${it.id} 指向未接入通路 ${sw.pathwayId}`);
        continue;
      }
      if (!target.steps.has(sw.stepId)) push(`接口 ${it.id} 指向不存在的步骤 ${sw.pathwayId}:${sw.stepId}`);
      if (!target.entities.has(sw.entityId)) {
        push(`接口 ${it.id} 指向不存在的实体 ${sw.pathwayId}:${sw.entityId}`);
      }
    }
  }
  for (const s of d.data.steps) {
    for (const sw of s.sharedWith ?? []) {
      const target = cross[sw.pathwayId];
      if (!target) push(`${s.id} sharedWith 指向未接入通路 ${sw.pathwayId}`);
      else if (!target.steps.has(sw.stepId)) push(`${s.id} 指向不存在步骤 ${sw.pathwayId}:${sw.stepId}`);
      else if (!target.entities.has(sw.entityId)) {
        push(`${s.id} 指向不存在实体 ${sw.pathwayId}:${sw.entityId}`);
      }
    }
  }
  if (d.data.interfaces?.some((i) => i.id === "int-utp" && i.sharedWith.length > 0)) {
    push("int-utp 未建通路，sharedWith 必须为空，不得伪造接口");
  }
  if (d.data.interfaces?.some((i) => i.id === "int-glycogenin" && i.sharedWith.length > 0)) {
    push("int-glycogenin 未建实体，sharedWith 必须为空");
  }

  // ⑨ 3D 候选身份 + 资产边界
  const td = d.data.threeD;
  const cand = new Map((td?.candidates ?? []).map((c) => [c.pdbId, c]));
  if (!cand.size) push("缺 threeD.candidates");
  for (const c of td?.candidates ?? []) {
    if (!/^[0-9][A-Z0-9]{3}$/.test(c.pdbId)) push(`PDB ID 格式异常：${c.pdbId}`);
    if (!c.entryTitle) push(`${c.pdbId} 缺 RCSB 条目标题`);
    if (!c.organism) push(`${c.pdbId} 缺物种`);
    if (!c.method) push(`${c.pdbId} 缺实验方法`);
    if (!(c.resolution > 0)) push(`${c.pdbId} 缺分辨率`);
    if (!c.chains) push(`${c.pdbId} 缺链`);
    if (!Array.isArray(c.ligands)) push(`${c.pdbId} 缺配体清单`);
    if (!entities.has(c.entityId)) push(`${c.pdbId} 指向未知酶实体 ${c.entityId}`);
    if (!c.verifiedOn || c.verifiedOn !== td.verifiedOn) push(`${c.pdbId} 核验日缺失或与总表不一致`);
  }
  for (const id of ["1EM6", "1FA9", "1Z8D"]) {
    const c = cand.get(id);
    if (!c) {
      push(`缺 PLP 结构 ${id}`);
      continue;
    }
    if (!/Homo sapiens/.test(c.organism ?? "")) push(`PLP ${id} 物种口径未写 Homo sapiens`);
    if (!c.expressionSystem) push(`PLP ${id} 缺表达系统（RCSB host organism）`);
    if (!c.mutations) push(`PLP ${id} 缺突变状态口径`);
  }
  for (const s of d.data.steps) {
    for (const p of s.pdbCandidates ?? []) {
      if (!cand.has(p.pdbId)) push(`${s.id} 引用未登记 PDB ${p.pdbId}`);
      if (p.status !== "verified") push(`${s.id} 的 PDB ${p.pdbId} 缺 status=verified`);
      if (
        !p.organism ||
        !p.method ||
        !(p.resolution > 0) ||
        !Array.isArray(p.ligands) ||
        (!p.ligands.length && p.role !== "apo")
      ) {
        push(`${s.id} 的 PDB ${p.pdbId} 缺物种 / 方法 / 分辨率 / 配体`);
      }
      const ref = cand.get(p.pdbId);
      if (
        ref &&
        (ref.organism !== p.organism ||
          ref.method !== p.method ||
          ref.resolution !== p.resolution ||
          ref.entryTitle !== p.entryTitle ||
          JSON.stringify(ref.ligandCodes) !== JSON.stringify(p.ligandCodes))
      ) {
        push(`${s.id} 的 PDB ${p.pdbId} 与 threeD.candidates 的核验字段不一致`);
      }
    }
  }
  for (const id of td?.assets?.moleculeAssets ?? []) {
    if (!["g6p", "glc"].includes(id)) push(`3D 资产只允许既有 g6p / glc，出现 ${id}`);
    if (!existsSync(join(ROOT, "public", "assets", "ligands3d", `${id}.json`))) {
      push(`声明的 3D 资产 ${id} 在磁盘上不存在`);
    }
  }
  for (const id of td?.assets?.missingAssets ?? []) {
    if (existsSync(join(ROOT, "public", "assets", "ligands3d", `${id}.json`))) {
      push(`missingAssets 声称缺失但磁盘存在 ${id}`);
    }
  }

  // ⑩ 结构对照块（4–6 块，evidence ↔ parts 对齐，无手写等级）
  const cfgSteps = d.cfg?.steps ?? [];
  if (cfgSteps.length < 4 || cfgSteps.length > 6) push(`结构对照应为 4–6 块，实际 ${cfgSteps.length}`);
  for (const c of cfgSteps) {
    const s = steps.get(c.stepId);
    if (!s) push(`结构对照块引用未知步骤 ${c.stepId}`);
    for (const sideKey of ["substrate", "product"]) {
      const side = c[sideKey];
      if (!side) continue;
      const partIds = (side.parts ?? []).map((p) => p.id);
      const evIds = (c.evidence?.[sideKey] ?? []).map((e) => e.molId);
      if (JSON.stringify(partIds) !== JSON.stringify(evIds)) {
        push(`对照块 ${c.stepId} ${sideKey} 的 evidence 与 parts 未对齐（${partIds} vs ${evIds}）`);
      }
      for (const p of side.parts ?? []) {
        if (p.id === "glycogen" || p.id === "glycogen-limit") continue;
        const entityId = p.id === "glc" ? "glucose" : p.id;
        const e = entities.get(entityId);
        if (!e) push(`对照块 ${c.stepId} 引用未知分子 ${p.id}`);
        else if (normFormula(p.formula) !== normFormula(e.formula)) {
          push(`对照块 ${c.stepId} ${p.id} 分子式与数据层不一致（${p.formula} vs ${e.formula}）`);
        }
      }
    }
    if (!c.change || !c.physiology) push(`对照块 ${c.stepId} 缺 change / physiology`);
  }
  if (cfg && /^    grade: "[ABCD]",/m.test(readFileSync(join(ROOT, "src/data/comparisonConfig.ts"), "utf8"))) {
    push("结构对照出现手写 A/B/C/D 等级字段");
  }

  // 附加：骨架链接与几何
  const fromStepLinks = new Set(d.skel.links.filter((l) => l.stepId).map((l) => l.stepId));
  for (const s of d.data.steps) {
    if (!fromStepLinks.has(s.id)) push(`步骤 ${s.id} 没有任何骨架链接`);
  }
  for (const l of d.skel.links) {
    if (!nodes.has(l.from)) push(`link ${l.id} 起点未知节点 ${l.from}`);
    if (!nodes.has(l.to)) push(`link ${l.id} 终点未知节点 ${l.to}`);
    if (l.stepId && !steps.has(l.stepId)) push(`link ${l.id} 引用未知步骤 ${l.stepId}`);
    if (!l.path) push(`link ${l.id} 缺 path`);
  }
  const sorted = [...d.skel.compartments].sort((a, b) => a.y0 - b.y0);
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i].y0 < sorted[i - 1].y1) {
      push(`泳道带重叠：${sorted[i - 1].id}[${sorted[i - 1].y0},${sorted[i - 1].y1}] 与 ${sorted[i].id}[${sorted[i].y0},${sorted[i].y1}]`);
    }
  }
  for (const n of d.skel.nodes) {
    const hits = laneOf(n);
    if (hits.length !== 1) continue;
    const lane = hits[0];
    if (n.x < lane.x0 || n.x > lane.x1) push(`节点 ${n.id}(x=${n.x}) 越出泳道 ${lane.id} 横向范围`);
    if (n.x < 0 || n.x > d.skel.canvas.width || n.y < 0 || n.y > d.skel.canvas.height) {
      push(`节点 ${n.id} 越出画布`);
    }
    if (n.entityId && !entities.has(n.entityId)) push(`节点 ${n.id} 引用未知实体 ${n.entityId}`);
  }
  if (!d.skel.links.some((l) => l.type === "cycle-return" && l.from === "glycogen-syn" && l.to === "glycogen-bd")) {
    push("缺闭合弧 glycogen-syn→glycogen-bd（type=cycle-return）");
  }
  for (const id of ["l-gly-4", "l-gly-4-hydrolysis", "l-gly-4-blood", "l-gly-5", "l-gly-5-isomerase", "l-gly-5-glycolysis"]) {
    if (!d.skel.links.some((l) => l.id === id)) push(`缺器官臂链接 ${id}`);
  }
  return errors;
}

// ---------- 负例自检：每个都必须被抓到 ----------
const negatives = [
  [
    "重复节点 id（两个 g6p）",
    (d) => {
      d.skel.nodes.push({ ...d.skel.nodes.find((n) => n.id === "g6p") });
    },
  ],
  [
    "分解臂断口：gly-3 不再产 G6P",
    (d) => {
      d.data.steps.find((s) => s.id === "gly-3").reaction.products = ["g1p"];
    },
  ],
  [
    "肌被写成表达 G6PC1（器官差异被抹平）",
    (d) => {
      d.data.organs.find((o) => o.id === "muscle").g6pc1 = true;
    },
  ],
  [
    "合成酐键账只记 1 个（PPi 水解漏计）",
    (d) => {
      d.data.energyLedger.perResidue.synthesisHighEnergyBonds = 1;
    },
  ],
  [
    "参考轮次算错：100 残基写成省 200 ATP",
    (d) => {
      d.data.energyLedger.referenceRun.breakdownSaving = 200;
    },
  ],
  [
    "G1P 电离态写成 −1（磷酸单酯口径错误）",
    (d) => {
      d.data.entities.find((e) => e.id === "g1p").charge = -1;
    },
  ],
  [
    "合成磷酸守恒写成 5→5",
    (d) => {
      d.data.conservation.phosphate.synthesis.input = 5;
      d.data.conservation.phosphate.synthesis.output = 5;
    },
  ],
  [
    "接口指向不存在的 gn-12",
    (d) => {
      d.data.interfaces.find((i) => i.id === "int-gluconeogenesis").sharedWith[0].stepId = "gn-12";
    },
  ],
  [
    "ΔG 被写成一个编造的数字",
    (d) => {
      d.data.steps.find((s) => s.id === "gly-1").deltaG.value = -30.5;
    },
  ],
  [
    "PDB 候选缺 RCSB 条目标题（身份字段缺失）",
    (d) => {
      d.data.threeD.candidates.find((c) => c.pdbId === "1EM6").entryTitle = "";
    },
  ],
  [
    "对照块 evidence 与 parts 错位（产物侧少了 UDP）",
    (d) => {
      d.cfg.steps.find((c) => c.stepId === "gly-8").evidence.product.pop();
    },
  ],
  [
    "肝节点被画进胞质泳道",
    (d) => {
      d.skel.nodes.find((n) => n.id === "g6pc1").y = 300;
    },
  ],
  [
    "空接口 int-utp 被标成 connected（页面会漏掉“未接入”文案）",
    (d) => {
      d.data.interfaces.find((i) => i.id === "int-utp").status = "connected";
    },
  ],
  [
    "PLP 条目 1Z8D 漏写表达系统（物种口径不完整）",
    (d) => {
      delete d.data.threeD.candidates.find((c) => c.pdbId === "1Z8D").expressionSystem;
    },
  ],
];

// ---------- 主流程 ----------
const positiveErrors = check(clone({ data, skel, cfg }));
const problems = [];
if (positiveErrors.length > 0) {
  problems.push(`正例数据未通过校验（${positiveErrors.length} 项）：\n  ${positiveErrors.join("\n  ")}`);
}
let caught = 0;
for (const [name, mutate] of negatives) {
  const mutated = clone({ data, skel, cfg });
  mutate(mutated);
  const errs = check(mutated);
  if (errs.length === 0) {
    problems.push(`负例『${name}』未被检出（校验器漏报）——不接受永远绿的校验器`);
  } else {
    caught++;
    console.log(`  负例被抓：${name}`);
    console.log(`    └ ${errs[0]}`);
  }
}
if (problems.length > 0) {
  console.error("\nvalidate-glycogen ✗");
  for (const p of problems) console.error(`  ${p}`);
  process.exit(1);
}
console.log(
  `validate-glycogen ✓ 正例 0 错误；负例 ${caught}/${negatives.length} 全部被抓（exit 1 路径已验证）`,
);
