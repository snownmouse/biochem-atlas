// 脂肪酸从头合成（FAS）数据校验器。
// 只做两件事：把 fas.json + skeleton.json 的化学/几何约束机械复核一遍，
// 再用 11 条负例自检，确认校验器本身不是「只会说 OK」。
//
// 复核项：
//   1) 实体 / 节点 / 步骤三个命名空间各自查重（实体 id 与节点 id 刻意允许同名）
//   2) link 引用的 stepId / 节点必须存在；main 弧两端的实体必须在该步底物或产物里
//   3) 四步环闭合：KS → KR → DH → ER 四条 main 弧连成链，ER 产物（除离去基团）回到 KS 底物
//   4) 每轮 +2C、2 NADPH、1 丙二酰-CoA；四步求和必须精确
//   5) 整账：8 乙酰-CoA × C2 = C16；ATP = 7；NADPH = 14；HCO₃⁻ = 7；CO₂ = 7
//   6) 净方程字符串包含关键计量；无重复反应式
//   7) 循环步不得用 NADH 冒充 NADPH；ΔG 数值一律 null，来源必须写明
//   8) 三条泳道必须显式命名（区室不能只靠颜色）
//   9) 实体分子式的电荷后缀必须与 ionization 的「净 −N」一致
//  10) 烯脂酰-ACP 还原（ER）必须是 NADPH 特异的 EC 1.3.1.39，不能写成 NADH 特的 1.3.1.9
//  11) 登记了 PDB 候选就必须写明人源 + 分辨率 + 方法 + 配体，且不得出现已核验为「非 FAS」的 ID
// 仅用 Node 内置能力，无第三方依赖。
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const DATA_DIR = join(ROOT, "src", "data", "fatty-acid-synthesis");

const baseData = JSON.parse(readFileSync(join(DATA_DIR, "fas.json"), "utf8"));
const baseSkel = JSON.parse(readFileSync(join(DATA_DIR, "skeleton.json"), "utf8"));

const LEAVE = new Set(["nadp", "nad", "nadh", "nadph", "co2", "h2o", "acp", "coa", "atp", "adp", "pi", "palmitate"]);

/** 已核验：2CG5 是人 AASDHPPT/ACP/CoA 复合体（2.70 Å），不是 FAS，不得再登记为 FAS 候选 */
const NOT_FAS_PDB = new Set(["2CG5"]);

const SUP = { "⁰": "0", "¹": "1", "²": "2", "³": "3", "⁴": "4", "⁵": "5", "⁶": "6", "⁷": "7", "⁸": "8", "⁹": "9" };

/** 分子式尾部的电荷后缀 → 整数电荷；无后缀返回 null（中性或未写）。
 *  兼容两种写法：Unicode「³⁻」与 ASCII「-」（历史数据里两种都存在）。 */
function formulaCharge(formula) {
  if (typeof formula !== "string") return null;
  if (formula.endsWith("-") && !formula.endsWith("⁻")) return -1;
  if (!formula.endsWith("⁻")) return null;
  const body = formula.slice(0, -1);
  const m = body.match(/[⁰¹²³⁴⁵⁶⁷⁸⁹]+$/);
  if (!m) return -1;
  return -Number([...m[0]].map((c) => SUP[c]).join(""));
}

/** ionization 文本里的「净 −N」→ 整数电荷；没有该片段返回 null */
function ionizationNetCharge(text) {
  if (typeof text !== "string") return null;
  const m = text.match(/净\s*(?:−|－|-)\s*(\d)/);
  return m ? -Number(m[1]) : null;
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

function check(data, skel) {
  const errors = [];
  const warn = (msg) => errors.push(msg);

  const steps = data.steps ?? [];
  const entities = data.entities ?? [];
  const nodes = skel.nodes ?? [];
  const links = skel.links ?? [];

  // 1) 三个命名空间各自查重
  const stepDup = dupes(steps.map((s) => s.id));
  if (stepDup.length) warn(`步骤 id 重复：${stepDup.join("、")}`);
  const entDup = dupes(entities.map((e) => e.id));
  if (entDup.length) warn(`实体 id 重复：${entDup.join("、")}`);
  const nodeDup = dupes(nodes.map((n) => n.id));
  if (nodeDup.length) warn(`节点 id 重复：${nodeDup.join("、")}`);

  const stepById = new Map(steps.map((s) => [s.id, s]));
  const entById = new Map(entities.map((e) => [e.id, e]));
  const nodeById = new Map(nodes.map((n) => [n.id, n]));

  // 节点 → 实体必须存在；节点坐标必须落在自己的泳道带内
  const laneById = new Map((skel.compartments ?? []).map((c) => [c.id, c]));
  for (const n of nodes) {
    if (!entById.has(n.entityId)) warn(`节点 ${n.id} 引用了不存在的实体 ${n.entityId}`);
    const lane = laneById.get(n.compartment);
    if (!lane) warn(`节点 ${n.id} 的区室 ${n.compartment} 不在 compartments 表里`);
    else if (n.y < lane.range[0] || n.y > lane.range[1]) {
      warn(`节点 ${n.id} 的 y=${n.y} 落在泳道 ${n.compartment}（${lane.range[0]}–${lane.range[1]}）之外`);
    }
  }

  // 三条泳道必须显式命名
  if ((skel.compartments ?? []).length < 3) warn("泳道少于三条：基质 / 内膜转运带 / 胞质是硬约束");
  for (const c of skel.compartments ?? []) {
    if (!c.name || !String(c.name).trim()) warn(`泳道 ${c.id} 缺少显式区室标签`);
  }

  // 实体 vs 节点：同一实体允许多节点（accoa / acylacp）；辅因子与瞬态中间物
  // （NADPH、CO₂、丙二酰-ACP 等）只登记在实体表，不强制落成节点。

  // 2) link 完整性 + main 弧端点实体核对
  for (const l of links) {
    if (!stepById.has(l.stepId)) warn(`link ${l.from}→${l.to} 引用了不存在的 stepId ${l.stepId}`);
    if (!nodeById.has(l.from)) warn(`link 起点 ${l.from} 不存在`);
    if (!nodeById.has(l.to)) warn(`link 终点 ${l.to} 不存在`);
    if (l.type === "main" && nodeById.has(l.from) && nodeById.has(l.to) && stepById.has(l.stepId)) {
      const st = stepById.get(l.stepId);
      const fromEnt = nodeById.get(l.from).entityId;
      const toEnt = nodeById.get(l.to).entityId;
      const pool = new Set([...st.substrates, ...st.products]);
      if (!pool.has(fromEnt)) warn(`main 弧 ${l.from}→${l.to} 的起点实体 ${fromEnt} 不在 ${st.id} 的底物/产物里`);
      if (!pool.has(toEnt)) warn(`main 弧 ${l.from}→${l.to} 的终点实体 ${toEnt} 不在 ${st.id} 的底物/产物里`);
    }
  }

  // 3) 四步环闭合
  const cycle = steps.filter((s) => s.kind === "cycle");
  if (cycle.length !== 4) warn(`循环步必须恰好 4 个，当前 ${cycle.length}`);
  const idx = cycle.map((s) => s.index).sort((a, b) => a - b);
  if (idx.join(",") !== "1,2,3,4") warn(`循环步序号必须是 1–4，当前 ${idx.join(",")}`);
  const cycleById = new Map(cycle.map((s) => [s.id, s]));
  const mainCycleLinks = links.filter((l) => l.type === "main" && cycleById.has(l.stepId));
  if (mainCycleLinks.length !== 4) warn(`四步环 main 弧必须 4 条，当前 ${mainCycleLinks.length}`);
  const startNode = mainCycleLinks.find((l) => l.stepId === cycle.find((s) => s.index === 1)?.id)?.from;
  if (startNode) {
    const succ = new Map(mainCycleLinks.map((l) => [l.from, l.to]));
    const chain = [startNode];
    let cur = startNode;
    for (let i = 0; i < 4; i += 1) {
      cur = succ.get(cur);
      if (!cur) break;
      chain.push(cur);
    }
    if (chain.length !== 5 || chain[4] === startNode) {
      warn(`四步环 main 弧没有连成一条 4 段链：${chain.join(" → ")}`);
    }
    const lastNode = chain[chain.length - 1];
    const ret = links.find((l) => l.type === "cycle-return" && l.from === lastNode && l.to === startNode);
    if (!ret) warn(`缺少 cycle-return 弧：${lastNode ?? "?"} → ${startNode}`);
  }

  const first = cycle.find((s) => s.index === 1);
  const last = cycle.find((s) => s.index === 4);
  if (first && last) {
    const returning = last.products.filter((p) => !LEAVE.has(p));
    if (!returning.length) warn(`${last.id} 的产物（除离去基团）为空，环无法闭合`);
    const back = returning.filter((p) => first.substrates.includes(p));
    if (!back.length) warn(`环不闭合：${last.id} 的碳载体 ${returning.join("、")} 没有回到 ${first.id} 的底物`);
    const retLink = links.find((l) => l.type === "cycle-return");
    if (retLink && nodeById.has(retLink.from) && nodeById.has(retLink.to)) {
      const fromEnt = nodeById.get(retLink.from).entityId;
      const toEnt = nodeById.get(retLink.to).entityId;
      if (fromEnt !== toEnt) warn(`cycle-return 弧两端实体不一致：${fromEnt} → ${toEnt}（返回弧应回到同一碳载体）`);
    }
  }

  // 4) 每轮计量
  const cycleSum = cycle.reduce(
    (acc, s) => {
      const y = s.perRoundYield;
      if (!y) {
        warn(`${s.id} 缺少 perRoundYield`);
        return acc;
      }
      acc.carbonDelta += y.carbonDelta ?? 0;
      acc.nadph += y.nadph ?? 0;
      acc.malonylCoA += y.malonylCoA ?? 0;
      acc.atp += y.atp ?? 0;
      return acc;
    },
    { carbonDelta: 0, nadph: 0, malonylCoA: 0, atp: 0 }
  );
  if (cycleSum.carbonDelta !== 2) warn(`四步环每轮净增碳必须 = 2，当前 ${cycleSum.carbonDelta}`);
  if (cycleSum.nadph !== 2) warn(`四步环每轮 NADPH 必须 = 2，当前 ${cycleSum.nadph}`);
  if (cycleSum.malonylCoA !== 1) warn(`四步环每轮丙二酰-CoA 必须 = 1，当前 ${cycleSum.malonylCoA}`);
  if (cycleSum.atp !== 0) warn(`四步环本身不该耗 ATP，当前 ${cycleSum.atp}`);

  // 5) 整账
  const p = data.energyLedger?.palmitate;
  if (!p) warn("energyLedger.palmitate 缺失");
  else {
    const rounds = (p.carbons - p.primerCarbons) / 2;
    if (p.rounds !== rounds) warn(`轮数 ${p.rounds} ≠ (${p.carbons} − ${p.primerCarbons}) / 2 = ${rounds}`);
    if (p.acetylCoA !== rounds + 1) warn(`乙酰-CoA ${p.acetylCoA} ≠ 引物 1 + 轮数 ${rounds}`);
    if (p.malonylCoA !== rounds) warn(`丙二酰-CoA ${p.malonylCoA} ≠ 轮数 ${rounds}`);
    if (p.atp !== rounds) warn(`ATP ${p.atp} ≠ 轮数 ${rounds}`);
    if (p.nadph !== rounds * 2) warn(`NADPH ${p.nadph} ≠ 轮数 × 2 = ${rounds * 2}`);
    if (p.protons !== p.nadph) warn(`H⁺ ${p.protons} ≠ NADPH ${p.nadph}`);
    if (p.bicarbonate !== rounds) warn(`HCO₃⁻ ${p.bicarbonate} ≠ 轮数 ${rounds}`);
    if (p.co2Released !== rounds) warn(`CO₂ ${p.co2Released} ≠ 轮数 ${rounds}`);
    const carbon = p.primerCarbons + p.rounds * cycleSum.carbonDelta;
    if (carbon !== p.carbons) warn(`碳守恒失败：引物 ${p.primerCarbons} + ${p.rounds} × ${cycleSum.carbonDelta} = ${carbon} ≠ ${p.carbons}`);
    if (p.acetylCoA * 2 !== p.carbons) warn(`8 乙酰-CoA 的 2C 加总 ${p.acetylCoA * 2} ≠ C${p.carbons}`);
  }
  const t = data.energyLedger?.totals;
  if (t && p) {
    if (t.atp !== p.atp) warn(`totals.atp ${t.atp} ≠ palmitate.atp ${p.atp}`);
    if (t.nadph !== p.nadph) warn(`totals.nadph ${t.nadph} ≠ palmitate.nadph ${p.nadph}`);
    if (t.acetylCoA !== p.acetylCoA) warn(`totals.acetylCoA ${t.acetylCoA} ≠ palmitate.acetylCoA ${p.acetylCoA}`);
  }
  const perRound = data.energyLedger?.perRound;
  if (perRound && p) {
    if (perRound.carbonDelta !== cycleSum.carbonDelta) warn(`perRound.carbonDelta ${perRound.carbonDelta} ≠ 四步求和 ${cycleSum.carbonDelta}`);
    if (perRound.nadph !== cycleSum.nadph) warn(`perRound.nadph ${perRound.nadph} ≠ 四步求和 ${cycleSum.nadph}`);
    if (perRound.malonylCoA !== cycleSum.malonylCoA) warn(`perRound.malonylCoA ${perRound.malonylCoA} ≠ 四步求和 ${cycleSum.malonylCoA}`);
    if (perRound.atp * (p?.rounds ?? 0) !== (p?.atp ?? 0)) warn(`perRound.atp × 轮数 ≠ 总 ATP`);
  }

  const net = data.energyLedger?.netEquation ?? "";
  for (const token of ["8 乙酰-CoA", "7 ATP", "14 NADPH", "14 H⁺", "C16", "8 CoA", "7 ADP", "7 Pi", "14 NADP⁺"]) {
    if (!net.includes(token)) warn(`净方程缺少计量片段「${token}」`);
  }

  // 6) 反应式唯一 + 内容非空
  const eqDup = dupes(steps.map((s) => String(s.equation ?? "").replace(/\s+/g, "")));
  if (eqDup.length) warn(`反应式重复：${eqDup.join(" | ")}`);

  // 7) 循环步不得用 NADH；ΔG 纪律
  for (const s of cycle) {
    if (s.substrates.includes("nadh") || s.products.includes("nadh"))
      warn(`${s.id} 是合成循环步，却把 NADH 当还原当量；FAS 必须用 NADPH`);
    if (!s.substrates.includes("nadph") && !s.products.includes("nadph") && s.index !== 1 && s.index !== 3)
      warn(`${s.id} 既不用 NADPH 也不是缩合/脱水步，还原当量记录可疑`);
  }
  for (const s of steps) {
    if (!s.deltaG) warn(`${s.id} 缺少 deltaG（未核实也要写 null + 定性 + 来源）`);
    else {
      if (s.deltaG.valueKcal !== null) warn(`${s.id} 的 ΔG 数值必须为 null（本轮不做定量）`);
      if (!s.deltaG.source) warn(`${s.id} 的 ΔG 缺少来源`);
    }
    if (!s.enzyme?.entityId || !entById.has(s.enzyme.entityId)) warn(`${s.id} 的 enzyme.entityId 不存在`);
    for (const e of [...s.substrates, ...s.products]) {
      if (!entById.has(e)) warn(`${s.id} 引用了不存在的实体 ${e}`);
    }
  }

  // 产物碳数：只有 TE 能释放棕榈酸
  const te = steps.filter((s) => s.products.includes("palmitate"));
  if (te.length !== 1) warn(`棕榈酸只能由 1 步释放，当前 ${te.length} 步`);
  if (te[0] && te[0].id !== "fas-te") warn(`棕榈酸释放步应为 fas-te，当前 ${te[0].id}`);

  // 镜像表必须齐全
  const mirrorItems = (data.mirrorTable ?? []).map((r) => r.item);
  for (const key of ["区室", "酰基载体", "辅因子", "四步酶名", "断键 / 成键方向", "产物"]) {
    if (!mirrorItems.includes(key)) warn(`镜像对照表缺少「${key}」行`);
  }

  // 9) 实体分子式电荷 vs ionization 净电荷
  for (const e of entities) {
    const fc = formulaCharge(e.formula);
    const nc = ionizationNetCharge(e.ionization);
    if (fc !== null && nc !== null && fc !== nc)
      warn(`实体 ${e.id} 分子式 ${e.formula} 的电荷 ${fc} 与 ionization「${e.ionization}」的净电荷 ${nc} 矛盾`);
  }

  // 10) ER 的 EC 号：NADPH 特异 1.3.1.39，不是 NADH 特异 1.3.1.9
  for (const s of steps) {
    const isEnoylReduction = (s.substrates ?? []).includes("enoylacp") && (s.products ?? []).includes("acylacp");
    if (isEnoylReduction && !/^1\.3\.1\.39/.test(String(s.ecNumber ?? "")))
      warn(`${s.id} 是烯脂酰-ACP 还原，EC 应为 1.3.1.39（NADPH, Re 特异），当前「${s.ecNumber ?? ""}」`);
  }

  // 11) PDB 候选元数据：人源 + 方法 + 分辨率 + 配体字段齐全；黑名单 ID 不得出现
  const candidates = [
    ...(data.threeD?.pdbCandidates ?? []),
    ...steps.flatMap((s) => s.threeD?.pdbCandidates ?? []),
  ];
  for (const c of candidates) {
    const tag = c.pdbId ?? "?";
    if (NOT_FAS_PDB.has(c.pdbId)) warn(`PDB ${tag} 已核验不是 FAS，不得登记为 FAS 候选`);
    if (c.organism !== "Homo sapiens") warn(`PDB ${tag} 的 organism 应为 Homo sapiens（人 FASN），当前「${c.organism}」`);
    if (!c.method) warn(`PDB ${tag} 缺少 method`);
    if (c.resolutionA === null || c.resolutionA === undefined || !Number.isFinite(c.resolutionA))
      warn(`PDB ${tag} 缺少已核验的分辨率`);
    if (!Array.isArray(c.ligands)) warn(`PDB ${tag} 的 ligands 必须是数组（无配体写空数组，不能缺字段）`);
  }

  return errors;
}

// ---------- 正例 ----------
const errors = check(baseData, baseSkel);
if (errors.length) {
  console.error("✗ fas 数据校验失败：");
  errors.forEach((e) => console.error(`  - ${e}`));
  process.exit(1);
}
console.log("✓ fas 数据校验通过：环闭合、每轮 +2C / 2 NADPH、8×C2=C16、ATP 7 / NADPH 14 全部成立");

// ---------- 负例自检 ----------
const clone = (x) => JSON.parse(JSON.stringify(x));
const cases = [
  {
    name: "负例 1：账本碳数改 15",
    run: () => {
      const d = clone(baseData);
      d.energyLedger.palmitate.carbons = 15;
      return check(d, clone(baseSkel));
    },
  },
  {
    name: "负例 2：NADPH 总数改 12",
    run: () => {
      const d = clone(baseData);
      d.energyLedger.palmitate.nadph = 12;
      return check(d, clone(baseSkel));
    },
  },
  {
    name: "负例 3：ER 产物删掉碳载体（环不闭合）",
    run: () => {
      const d = clone(baseData);
      d.steps.find((s) => s.id === "fas-er").products = ["nadp"];
      return check(d, clone(baseSkel));
    },
  },
  {
    name: "负例 4：复制反应式（fas-dh 抄 fas-kr）",
    run: () => {
      const d = clone(baseData);
      const kr = d.steps.find((s) => s.id === "fas-kr");
      d.steps.find((s) => s.id === "fas-dh").equation = kr.equation;
      return check(d, clone(baseSkel));
    },
  },
  {
    name: "负例 5：KS 每轮增碳改 3",
    run: () => {
      const d = clone(baseData);
      d.steps.find((s) => s.id === "fas-ks").perRoundYield.carbonDelta = 3;
      return check(d, clone(baseSkel));
    },
  },
  {
    name: "负例 6：节点 id 重复",
    run: () => {
      const s = clone(baseSkel);
      s.nodes.push({ ...s.nodes[0] });
      return check(clone(baseData), s);
    },
  },
  {
    name: "负例 7：link 引用不存在的步骤",
    run: () => {
      const s = clone(baseSkel);
      s.links[0].stepId = "fas-missing";
      return check(clone(baseData), s);
    },
  },
  {
    name: "负例 8：KR 用 NADH 冒充 NADPH",
    run: () => {
      const d = clone(baseData);
      const kr = d.steps.find((s) => s.id === "fas-kr");
      kr.substrates = ["ketoacylacp", "nadh"];
      kr.products = ["hydroxyacylacp", "nad"];
      return check(d, clone(baseSkel));
    },
  },
  {
    name: "负例 9：柠檬酸分子式退回 C6H5O7-（与净 −3 矛盾）",
    run: () => {
      const d = clone(baseData);
      d.entities.find((e) => e.id === "cit").formula = "C6H5O7-";
      return check(d, clone(baseSkel));
    },
  },
  {
    name: "负例 10：ER 的 EC 退回 NADH 特异的 1.3.1.9",
    run: () => {
      const d = clone(baseData);
      d.steps.find((s) => s.id === "fas-er").ecNumber = "1.3.1.9（烯脂酰-ACP 还原酶，NADPH）";
      return check(d, clone(baseSkel));
    },
  },
  {
    name: "负例 11：PDB 候选退回酵母 2CG5 且分辨率留空",
    run: () => {
      const d = clone(baseData);
      d.threeD.pdbCandidates[0] = {
        pdbId: "2CG5",
        role: "homolog",
        organism: "Saccharomyces cerevisiae",
        method: "X-ray",
        resolutionA: null,
        ligands: [],
        note: "酵母 FAS 候选",
      };
      return check(d, clone(baseSkel));
    },
  },
];

let missed = 0;
for (const c of cases) {
  const e = c.run();
  if (e.length) console.log(`✓ ${c.name} 被抓（${e.length} 条错误）`);
  else {
    missed += 1;
    console.error(`✗ ${c.name} 没有被抓——校验器有漏洞`);
  }
}
if (missed) process.exit(1);
console.log(`✓ 负例自检 ${cases.length}/${cases.length} 全部被抓`);
