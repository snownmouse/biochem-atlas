// 尿素循环（Krebs–Henseleit cycle）数据校验器。
//
// 只做化学/计量/几何约束的机械复核，再用 ≥6 条负例自检，确认校验器不是「只会说 OK」。
//
// 复核项：
//   1) 实体 / 节点 / 步骤三个命名空间各自查重；节点 y 必须落在自己的泳道带内
//   2) link 引用的 stepId / transportId / 节点必须存在；main 弧两端实体必须在该步底物或产物里
//   3) 五步齐全（1–5），三条泳道显式命名；鸟氨酸 / 瓜氨酸必须同实体多节点
//   4) 双氮源：两个来源 id 不同，各自绑定到正确的步；N 账 1 + 1 = 2，尿素含 2 N
//   5) 碳账：HCO₃⁻ 1 C + Asp 4 C = 尿素 1 C + 延胡索酸 4 C；鸟氨酸 C5 载体净 0
//   6) 能量双口径：名义 ATP 3 = 2 + 1；高能键 4 = 2 + 2；净方程计量齐全
//   7) 循环闭合：ARG1 的鸟氨酸是 OTC 的底物；cycle-return 连接同一载体实体
//   8) 延胡索酸 sharedWith 指向真实存在的 TCA 实体 fum 与真实步骤 tca-6 / tca-7
//   9) ΔG 数值一律 null + 来源 Lehninger 8e Ch.18；无重复反应式
//  10) 3D 状态 pending；不出现 /assets/steps/urea-* 资产路径
// 仅用 Node 内置能力，无第三方依赖。
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const DATA_DIR = join(ROOT, "src", "data", "urea-cycle");
const TCA_PATH = join(ROOT, "src", "data", "tca.json");

const baseData = JSON.parse(readFileSync(join(DATA_DIR, "urea.json"), "utf8"));
const baseSkel = JSON.parse(readFileSync(join(DATA_DIR, "skeleton.json"), "utf8"));
const tca = JSON.parse(readFileSync(TCA_PATH, "utf8"));

/** 去掉说明性文本字段后返回副本（用于扫描真实资产路径） */
function stripNotes(value) {
  if (Array.isArray(value)) return value.map(stripNotes);
  if (!value || typeof value !== "object") return value;
  const out = {};
  for (const [k, v] of Object.entries(value)) {
    if (/^(note|notes|sourceNote|no3dReason|missing2dReason|description)$/.test(k)) continue;
    out[k] = stripNotes(v);
  }
  return out;
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

const SUB_DIGITS = { "₀": "0", "₁": "1", "₂": "2", "₃": "3", "₄": "4", "₅": "5", "₆": "6", "₇": "7", "₈": "8", "₉": "9" };

/** 解析简单分子式；支持 Unicode 下标、复合式 A + B、末尾电荷。 */
export function countAtoms(formula) {
  const out = { C: 0, H: 0, N: 0, O: 0, P: 0, S: 0 };
  if (!formula || typeof formula !== "string") return out;
  const parts = formula.split("+").map((s) => s.trim());
  for (const raw of parts) {
    if (!raw) continue;
    let text = raw
      .replace(/（[^）]*）/g, "")
      .replace(/\([^)]*\)/g, "")
      .replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹⁺⁻]/g, "")
      .replace(/^[A-Za-z]*\s*$/, "");
    text = text.replace(/[₀₁₂₃₄₅₆₇₈₉]/g, (m) => SUB_DIGITS[m] ?? m);
    const re = /([A-Z][a-z]?)([0-9]*)/g;
    let m;
    while ((m = re.exec(text))) {
      const sym = m[1];
      const n = m[2] ? Number(m[2]) : 1;
      if (sym in out) out[sym] += n;
    }
  }
  return out;
}

function formulaOf(entById, id) {
  const e = entById.get(id);
  return e?.formula ?? "";
}

function check(data, skel, tcaData) {
  const errors = [];
  const warn = (msg) => errors.push(msg);

  const steps = data.steps ?? [];
  const entities = data.entities ?? [];
  const nodes = skel.nodes ?? [];
  const links = skel.links ?? [];
  const transports = skel.transportSteps ?? [];
  const lanes = skel.compartments ?? [];
  const W = skel.canvas?.width;
  const H = skel.canvas?.height;

  const stepById = new Map(steps.map((s) => [s.id, s]));
  const entById = new Map(entities.map((e) => [e.id, e]));
  const nodeById = new Map(nodes.map((n) => [n.id, n]));
  const transportById = new Map(transports.map((t) => [t.id, t]));
  const laneById = new Map(lanes.map((c) => [c.id, c]));
  const tcaEntById = new Map((tcaData.entities ?? []).map((e) => [e.id, e]));
  const tcaStepById = new Map((tcaData.steps ?? []).map((s) => [s.id, s]));

  // 1) 命名空间查重
  if (steps.length !== 5) warn(`步骤数应为 5，实际 ${steps.length}`);
  const stepDup = dupes(steps.map((s) => s.id));
  if (stepDup.length) warn(`步骤 id 重复：${stepDup.join("、")}`);
  const entDup = dupes(entities.map((e) => e.id));
  if (entDup.length) warn(`实体 id 重复：${entDup.join("、")}`);
  const nodeDup = dupes(nodes.map((n) => n.id));
  if (nodeDup.length) warn(`节点 id 重复：${nodeDup.join("、")}`);
  if (dupes(steps.map((s) => s.index)).length) warn("步骤 index 重复");
  const indexes = steps.map((s) => s.index).sort((a, b) => a - b);
  if (indexes.join(",") !== "1,2,3,4,5") warn(`步骤 index 不是 1–5：${indexes.join(",")}`);

  // 2) 泳道
  if (lanes.length < 3) warn("泳道少于三条：基质 / 内膜转运带 / 胞质是硬约束");
  for (const c of lanes) {
    if (!c.name || !String(c.name).trim()) warn(`泳道 ${c.id} 缺少显式区室标签`);
    if (!Array.isArray(c.range) || c.range[0] >= c.range[1]) warn(`泳道 ${c.id} 的 range 无效`);
  }
  const sortedLanes = [...lanes].sort((a, b) => a.range[0] - b.range[0]);
  for (let i = 1; i < sortedLanes.length; i++) {
    if (sortedLanes[i].range[0] < sortedLanes[i - 1].range[1]) warn(`泳道 ${sortedLanes[i - 1].id} 与 ${sortedLanes[i].id} 的 range 重叠`);
  }

  // 3) 节点 → 实体 / 泳道 / 边界
  for (const n of nodes) {
    if (!entById.has(n.entityId)) warn(`节点 ${n.id} 引用了不存在的实体 ${n.entityId}`);
    const lane = laneById.get(n.compartment);
    if (!lane) warn(`节点 ${n.id} 的区室 ${n.compartment} 不在 compartments 表里`);
    else if (n.y < lane.range[0] || n.y > lane.range[1]) warn(`节点 ${n.id} 的 y=${n.y} 落在泳道 ${n.compartment}（${lane.range[0]}–${lane.range[1]}）之外`);
    if (!Number.isFinite(n.x) || !Number.isFinite(n.y) || n.x < 0 || n.y < 0 || n.x > W || n.y > H) warn(`节点 ${n.id} 坐标越出画布`);
  }
  for (const id of ["ornithine", "citrulline"]) {
    const count = nodes.filter((n) => n.entityId === id).length;
    if (count < 2) warn(`同实体多节点约束失败：${id} 只有 ${count} 个节点`);
  }

  // 4) 每步实体存在 + 酶存在
  for (const s of steps) {
    for (const id of [...(s.substrates ?? []), ...(s.products ?? [])]) {
      if (!entById.has(id)) warn(`步骤 ${s.id} 引用了不存在的实体 ${id}`);
    }
    if (!entById.has(s.enzyme?.entityId)) warn(`步骤 ${s.id} 的酶实体 ${s.enzyme?.entityId} 不存在`);
    if (!s.equation || !String(s.equation).includes("→")) warn(`步骤 ${s.id} 缺少带方向的反应式`);
    if (s.deltaG?.standard !== null || s.deltaG?.physiological !== null) warn(`步骤 ${s.id} 的 ΔG 数值应一律为 null`);
    if (s.deltaG?.source !== "Lehninger 8e Ch.18") warn(`步骤 ${s.id} 的 ΔG 来源必须是 Lehninger 8e Ch.18`);
    if (!s.labelAt || !s.subAt) warn(`步骤 ${s.id} 缺少挂图标签坐标`);
    else {
      for (const [name, at] of [["labelAt", s.labelAt], ["subAt", s.subAt]]) {
        if (!Number.isFinite(at.x) || !Number.isFinite(at.y) || at.x < 0 || at.y < 0 || at.x > W || at.y > H) warn(`步骤 ${s.id} 的 ${name} 越出画布`);
      }
    }
  }
  const eqDup = dupes(steps.map((s) => s.equation));
  if (eqDup.length) warn(`反应式重复：${eqDup.join("、")}`);

  // 5) link 完整性 + main 端点
  for (const l of links) {
    if (!nodeById.has(l.from) || !nodeById.has(l.to)) {
      warn(`link ${l.from}→${l.to} 引用了不存在的节点`);
      continue;
    }
    // recycle 弧是跨通路引用（延胡索酸回 TCA），不是本循环的步骤或转运
    if (!l.stepId && !l.transportId && l.type !== "recycle")
      warn(`link ${l.from}→${l.to} 既没有 stepId 也没有 transportId`);
    if (l.type === "recycle" && l.refPathway !== "tca")
      warn(`recycle 弧 ${l.from}→${l.to} 必须显式标注 refPathway=tca`);
    if (l.stepId && l.type === "recycle")
      warn(`recycle 弧 ${l.from}→${l.to} 不应绑定本循环步骤`);
    if (l.stepId && !stepById.has(l.stepId)) warn(`link ${l.from}→${l.to} 引用了不存在的 stepId ${l.stepId}`);
    if (l.transportId && !transportById.has(l.transportId)) warn(`link ${l.from}→${l.to} 引用了不存在的 transportId ${l.transportId}`);
    if (l.stepId && l.transportId) warn(`link ${l.from}→${l.to} 同时给了 stepId 与 transportId`);
    if (l.type === "main") {
      const s = stepById.get(l.stepId);
      if (!s) continue;
      const fromEnt = nodeById.get(l.from).entityId;
      const toEnt = nodeById.get(l.to).entityId;
      const pool = new Set([...(s.substrates ?? []), ...(s.products ?? [])]);
      if (!pool.has(fromEnt)) warn(`main 弧 ${l.from}→${l.to} 的起点实体 ${fromEnt} 不在步骤 ${s.id} 的底物/产物里`);
      if (!pool.has(toEnt)) warn(`main 弧 ${l.from}→${l.to} 的终点实体 ${toEnt} 不在步骤 ${s.id} 的底物/产物里`);
    }
  }
  for (const s of steps) {
    if (!links.some((l) => l.stepId === s.id && l.type === "main")) warn(`步骤 ${s.id} 没有 main 弧`);
  }
  for (const t of transports) {
    if (!nodeById.has(t.from) || !nodeById.has(t.to) || !nodeById.has(t.via)) warn(`转运 ${t.id} 引用了不存在的节点`);
  }

  // 6) 双氮源
  const dn = data.dualNitrogen ?? {};
  const sources = dn.sources ?? [];
  if (sources.length !== 2) warn(`双氮源应有 2 个来源，实际 ${sources.length}`);
  const sourceIds = sources.map((s) => s.id);
  if (dupes(sourceIds).length) warn(`双氮源 id 重复：${dupes(sourceIds).join("、")}`);
  if (sourceIds.join(",") !== "ammonia,aspartate") warn(`双氮源必须是 ammonia + aspartate，实际 ${sourceIds.join(",")}`);
  for (const src of sources) {
    const step = stepById.get(src.entersAtStep);
    if (!step) warn(`氮源 ${src.id} 的 entersAtStep ${src.entersAtStep} 不存在`);
    else if (!(step.nitrogen?.sourceIds ?? []).includes(src.id)) warn(`氮源 ${src.id} 没有绑定到步骤 ${step.id} 的 nitrogen.sourceIds`);
    if (!entById.has(src.entityId)) warn(`氮源 ${src.id} 的 entityId ${src.entityId} 不存在`);
  }
  const nl = data.nitrogenLedger ?? {};
  const nIn = (nl.inputs ?? []).reduce((n, x) => n + x.atoms, 0);
  if (nIn !== 2) warn(`氮账输入应为 2 N，实际 ${nIn}`);
  if ((nl.urea?.atoms ?? 0) !== 2) warn(`尿素氮原子应为 2，实际 ${nl.urea?.atoms}`);
  if ((nl.carrier?.netChange ?? 0) !== 0) warn("鸟氨酸载体氮净变化应为 0");
  if (countAtoms(formulaOf(entById, "urea")).N !== 2) warn("尿素分子式的 N 数不是 2");
  if (countAtoms(formulaOf(entById, "nh3")).N !== 1) warn("NH₃ 分子式的 N 数不是 1");
  if (countAtoms(formulaOf(entById, "asp")).N !== 1) warn("天冬氨酸分子式的 N 数不是 1");
  const step1N = stepById.get("urea-1")?.nitrogen ?? {};
  const step3N = stepById.get("urea-3")?.nitrogen ?? {};
  if ((step1N.sourceIds ?? []).join(",") !== "ammonia") warn("CPS1 步的净氮来源必须是 ammonia");
  if ((step3N.sourceIds ?? []).join(",") !== "aspartate") warn("ASS 步的净氮来源必须是 aspartate");
  const step5N = stepById.get("urea-5")?.nitrogen ?? {};
  if ((step5N.sourceIds ?? []).slice().sort().join(",") !== "ammonia,aspartate") warn("ARG1 释放的尿素必须同时来自 ammonia 与 aspartate");

  // 7) 碳账
  const cl = data.carbonLedger ?? {};
  const cIn = (cl.inputs ?? []).reduce((n, x) => n + x.carbons, 0);
  const cOut = (cl.outputs ?? []).reduce((n, x) => n + x.carbons, 0);
  if (cIn !== 5) warn(`碳账输入应为 5 C，实际 ${cIn}`);
  if (cOut !== 5) warn(`碳账输出应为 5 C，实际 ${cOut}`);
  if (cIn !== cOut) warn(`碳账不平衡：${cIn} C 进 / ${cOut} C 出`);
  if ((cl.carrier?.netChange ?? 0) !== 0) warn("鸟氨酸载体碳净变化应为 0");
  if (countAtoms(formulaOf(entById, "hco3")).C !== 1) warn("HCO₃⁻ 分子式的 C 数不是 1");
  if (countAtoms(formulaOf(entById, "asp")).C !== 5 - 1) warn("天冬氨酸分子式的 C 数不是 4");
  if (countAtoms(formulaOf(entById, "urea")).C !== 1) warn("尿素分子式的 C 数不是 1");
  if (countAtoms(formulaOf(entById, "fumarate")).C !== 4) warn("延胡索酸分子式的 C 数不是 4");
  if (countAtoms(formulaOf(entById, "ornithine")).C !== 5) warn("鸟氨酸分子式的 C 数不是 5");

  // 8) 能量双口径
  const el = data.energyLedger ?? {};
  const entries = el.entries ?? [];
  const sumAtp = entries.reduce((n, e) => n + e.atp, 0);
  const sumBonds = entries.reduce((n, e) => n + e.bonds, 0);
  if (sumAtp !== 3) warn(`能量条目 ATP 求和应为 3，实际 ${sumAtp}`);
  if (sumBonds !== 4) warn(`能量条目高能键求和应为 4，实际 ${sumBonds}`);
  if (el.nominalAtp !== 3) warn(`名义 ATP 应为 3，实际 ${el.nominalAtp}`);
  if (el.highEnergyBonds !== 4) warn(`折算高能键应为 4，实际 ${el.highEnergyBonds}`);
  if (el.adp !== 2) warn(`ADP 应为 2，实际 ${el.adp}`);
  if (el.amp !== 1) warn(`AMP 应为 1，实际 ${el.amp}`);
  if (el.pi !== 2) warn(`Pi 应为 2，实际 ${el.pi}`);
  if (el.ppi !== 1) warn(`PPi 应为 1，实际 ${el.ppi}`);
  const e1 = entries.find((e) => e.stepId === "urea-1");
  const e3 = entries.find((e) => e.stepId === "urea-3");
  if (!e1 || e1.atp !== 2 || e1.bonds !== 2) warn("CPS1 能量条目应为 2 ATP / 2 键");
  if (!e3 || e3.atp !== 1 || e3.bonds !== 2) warn("ASS 能量条目应为 1 ATP / 2 键（ATP→AMP+PPi）");
  const net = String(el.netEquation ?? "");
  for (const token of ["3 ATP", "2 ADP", "AMP", "2 Pi", "PPi"]) {
    if (!net.includes(token)) warn(`净方程缺少计量 ${token}`);
  }
  if (!String(el.nominalLabel ?? "").includes("名义 3 ATP")) warn("能量账缺少「名义 3 ATP」标签");
  if (!String(el.bondLabel ?? "").includes("4 个高能键")) warn("能量账缺少「4 个高能键」标签");
  for (const s of steps) {
    if (s.irreversible === undefined) warn(`步骤 ${s.id} 缺少不可逆/可逆标注`);
  }

  // 9) 循环闭合
  const cc = data.cycleClosure ?? {};
  const loop = cc.loopStepIds ?? [];
  if (loop.join(",") !== "urea-2,urea-3,urea-4,urea-5") warn(`闭环步骤必须是 urea-2→urea-3→urea-4→urea-5，实际 ${loop.join(",")}`);
  const last = stepById.get("urea-5");
  const second = stepById.get("urea-2");
  if (!(last?.products ?? []).includes(cc.carrierEntityId)) warn("ARG1 产物没有鸟氨酸，闭环断裂");
  if (!(second?.substrates ?? []).includes(cc.carrierEntityId)) warn("OTC 底物没有鸟氨酸，闭环断裂");
  const entry = stepById.get(cc.entryStepId);
  if (!(entry?.products ?? []).includes(cc.entryProductEntityId)) warn("进环步产物没有氨甲酰磷酸");
  if (!(second?.substrates ?? []).includes(cc.entryProductEntityId)) warn("OTC 不消耗氨甲酰磷酸，进环断链");
  const returnLink = links.find((l) => l.type === "cycle-return");
  if (!returnLink) warn("缺少 cycle-return 回流弧");
  else {
    const a = nodeById.get(returnLink.from);
    const b = nodeById.get(returnLink.to);
    if (!a || !b || a.entityId !== b.entityId || a.entityId !== cc.carrierEntityId) warn("cycle-return 两端必须是同一鸟氨酸实体");
  }

  // 10) 延胡索酸 → TCA
  const fi = data.tcaInterface ?? {};
  const shared = fi.sharedWith ?? {};
  if (shared.pathway !== "tca") warn(`延胡索酸 sharedWith.pathway 应为 tca，实际 ${shared.pathway}`);
  if (!tcaEntById.has(shared.entityId)) warn(`延胡索酸 sharedWith.entityId ${shared.entityId} 不在 tca.json 实体表里`);
  const producer = tcaStepById.get(shared.producedByStep);
  const consumer = tcaStepById.get(shared.consumedByStep);
  if (!producer) warn(`sharedWith.producedByStep ${shared.producedByStep} 不在 tca.json`);
  else if (!(producer.products ?? []).includes(shared.entityId)) warn(`TCA 步 ${producer.id} 的产物里没有 ${shared.entityId}`);
  if (!consumer) warn(`sharedWith.consumedByStep ${shared.consumedByStep} 不在 tca.json`);
  else if (!(consumer.substrates ?? []).includes(shared.entityId)) warn(`TCA 步 ${consumer.id} 的底物里没有 ${shared.entityId}`);
  const fumarateEnt = entById.get(fi.fumarateEntityId);
  if (!fumarateEnt) warn(`尿素循环实体 ${fi.fumarateEntityId} 不存在`);
  else if (fumarateEnt.sharedWith?.entityId !== shared.entityId) warn("实体 fumarate 上的 sharedWith 与 tcaInterface.sharedWith 不一致");
  for (const r of fi.recycleChain ?? []) {
    if (r.registeredInTca && !tcaStepById.has(r.stepId)) warn(`回流链步骤 ${r.stepId} 在 tca.json 里不存在`);
  }

  // 11) 3D 状态 / 资产路径
  if (data.threeD?.status !== "pending") warn("threeD.status 必须是 pending");
  // 只扫非说明性字段：note 里的「不建 /assets/steps/urea-*」是口径声明，不是资产路径
  const assetText = JSON.stringify(stripNotes(data)) + JSON.stringify(stripNotes(skel));
  if (/\/assets\/steps\/urea-/.test(assetText)) warn("数据层不应出现 /assets/steps/urea-* 资产路径");
  const anyCandidate = steps.flatMap((s) => s.threeD?.candidates ?? []);
  for (const c of anyCandidate) {
    if (!c.pdbId) warn(`候选结构 ${c.enzyme} 缺少 pdbId`);
    if (c.organism === "unknown" && c.method !== null) warn(`候选 ${c.pdbId} 身份未确认却填了 method`);
    if (c.organism === "unknown" && c.resolutionA !== null) warn(`候选 ${c.pdbId} 身份未确认却填了分辨率`);
  }

  // 12) 临床条目克制
  for (const c of data.clinical ?? []) {
    if (/治疗|用药|剂量/.test(c.mechanism)) warn(`临床条目 ${c.id} 出现治疗细节，应只写一句机制`);
    if (!String(c.mechanism ?? "").trim()) warn(`临床条目 ${c.id} 缺少机制`);
  }

  // 13) 候选 PDB 身份：OTC 只登记已核实的人源结构（1EP9 / 1OTH）
  const KNOWN_OTC_PDB = new Set(["1EP9", "1OTH"]);
  const NOT_OTC_PDB = new Set(["1C9S", "4F2Y"]);
  for (const c of anyCandidate) {
    if (c.enzyme !== "OTC") continue;
    if (NOT_OTC_PDB.has(c.pdbId)) warn(`候选 ${c.pdbId} 已核验不是 OTC，不得登记`);
    if (!KNOWN_OTC_PDB.has(c.pdbId)) warn(`候选 ${c.pdbId} 不在已核实的人源 OTC 清单（1EP9 / 1OTH）`);
    if (c.organism !== "human") warn(`候选 ${c.pdbId} 的 organism 应为 human，当前「${c.organism}」`);
    if (!c.method) warn(`候选 ${c.pdbId} 缺少 method`);
    if (!Number.isFinite(c.resolutionA)) warn(`候选 ${c.pdbId} 缺少已核验的分辨率`);
    if (!Array.isArray(c.ligands)) warn(`候选 ${c.pdbId} 的 ligands 必须是数组`);
  }

  return errors;
}

const errors = check(baseData, baseSkel, tca);
if (errors.length) {
  console.error("尿素循环数据校验失败：");
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}
console.log(`validate-urea：正例通过（${baseData.steps.length} 步 / ${baseSkel.nodes.length} 节点 / ${baseSkel.links.length} 连线）`);

// ===== 负例自检 =====
function clone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

const negatives = [];
const expectFail = (name, mutate, needle) => {
  const data = clone(baseData);
  const skel = clone(baseSkel);
  mutate(data, skel);
  const errs = check(data, skel, tca);
  if (!errs.length) negatives.push({ name, ok: false, why: "未抓到" });
  else if (needle && !errs.some((e) => String(e).includes(needle))) negatives.push({ name, ok: false, why: `抓到了但不是预期：${errs[0]}` });
  else negatives.push({ name, ok: true });
};

expectFail("把两个氮都写成来自 NH₃", (d) => {
  d.dualNitrogen.sources[1].id = "ammonia";
  d.dualNitrogen.sources[1].entityId = "nh3";
  d.dualNitrogen.sources[1].entersAtStep = "urea-1";
}, "双氮源 id 重复");

expectFail("把 ASS 步的 ATP 写成 2 个", (d) => {
  const e = d.energyLedger.entries.find((x) => x.stepId === "urea-3");
  e.atp = 2;
  d.energyLedger.nominalAtp = 4;
}, "能量条目 ATP 求和");

expectFail("延胡索酸指向不存在的 tca id", (d) => {
  d.tcaInterface.sharedWith.entityId = "fum-x";
  const f = d.entities.find((e) => e.id === "fumarate");
  f.sharedWith.entityId = "fum-x";
}, "不在 tca.json 实体表里");

expectFail("闭环断裂：ARG1 不再产鸟氨酸", (d) => {
  const s = d.steps.find((x) => x.id === "urea-5");
  s.products = s.products.filter((p) => p !== "ornithine");
}, "闭环断裂");

expectFail("碳账被改成延胡索酸 5 C", (d) => {
  const f = d.entities.find((e) => e.id === "fumarate");
  f.formula = "C₅H₂O₄²⁻";
}, "延胡索酸分子式的 C 数");

expectFail("ΔG 被填了猜测数值", (d) => {
  d.steps[0].deltaG.standard = -50;
}, "ΔG 数值应一律为 null");

expectFail("main 弧端点不在该步底物/产物里", (d, s) => {
  const l = s.links.find((x) => x.type === "main" && x.stepId === "urea-3");
  l.from = "arginine";
}, "起点实体");

expectFail("节点被放到泳道外", (d, s) => {
  const n = s.nodes.find((x) => x.id === "urea");
  n.y = 300;
}, "落在泳道");

expectFail("重复反应式", (d) => {
  d.steps[1].equation = d.steps[0].equation;
}, "反应式重复");

expectFail("OTC 候选退回非 OTC 的 1C9S", (d) => {
  const c = d.steps.find((x) => x.id === "urea-2").threeD.candidates;
  c[0].pdbId = "1C9S";
}, "已核验不是 OTC");

expectFail("OTC 候选物种写成非人源", (d) => {
  const c = d.steps.find((x) => x.id === "urea-2").threeD.candidates;
  c[0].organism = "nonhuman";
}, "organism 应为 human");

const failed = negatives.filter((n) => !n.ok);
if (failed.length) {
  console.error("validate-urea：负例自检失败");
  for (const n of failed) console.error(`  - ${n.name}：${n.why}`);
  process.exit(1);
}
console.log(`validate-urea：负例自检 ${negatives.length}/${negatives.length} 全部抓到`);
