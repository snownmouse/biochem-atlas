// 糖复合物代谢挂图（PLATE 21 · SF-21）数据层校验。
// 口径：只做「糖核苷酸供体 → 糖链」窄切口；13 步（胞质 9 + 内质网 1 + 高尔基体 3）；
// 3 区室；16 节点；22 连线；四类去向（N-糖基化 / O-GlcNAc / 糖胺聚糖 / 糖脂）；全部 2D。
// 除正向校验外，脚本自带负例（改坏数据后必须报错），防止校验器本身失效。
// 用法：node tools/validate-glycoconjugate.mjs
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => JSON.parse(readFileSync(join(ROOT, p), "utf8"));

const data = read("src/data/glycoconjugate/glycoconjugate.json");
const skel = read("src/data/glycoconjugate/skeleton.json");

const errors = [];
const err = (m) => errors.push(m);

const STEP_IDS = [
  "gcon-1", "gcon-2", "gcon-3", "gcon-4", "gcon-5", "gcon-6", "gcon-7",
  "gcon-8", "gcon-9", "gcon-10", "gcon-11", "gcon-12", "gcon-13",
];
const COMPARTMENT_OF = {
  "gcon-1": "cyto",
  "gcon-2": "cyto",
  "gcon-3": "cyto",
  "gcon-4": "cyto",
  "gcon-5": "cyto",
  "gcon-6": "cyto",
  "gcon-7": "cyto",
  "gcon-8": "cyto",
  "gcon-9": "er",
  "gcon-10": "golgi",
  "gcon-11": "cyto",
  "gcon-12": "golgi",
  "gcon-13": "golgi",
};
const EC = {
  "gcon-1": "2.7.7.9",
  "gcon-2": "5.1.3.2",
  "gcon-3": "1.1.1.22",
  "gcon-4": "2.6.1.16",
  "gcon-5": "2.7.7.22",
  "gcon-6": "4.2.1.47",
  "gcon-7": "未核实",
  "gcon-8": "2.7.7.43",
  "gcon-9": "2.4.1.119",
  "gcon-10": "未核实",
  "gcon-11": "2.4.1.255",
  "gcon-12": "2.4.1.212",
  "gcon-13": "2.4.1.80",
};
const IRREVERSIBLE = {
  "gcon-1": true,
  "gcon-2": false,
  "gcon-3": true,
  "gcon-4": true,
  "gcon-5": false,
  "gcon-6": true,
  "gcon-7": true,
  "gcon-8": true,
  "gcon-9": true,
  "gcon-10": true,
  "gcon-11": false,
  "gcon-12": true,
  "gcon-13": true,
};
const ENTITIES = [
  "g6p", "udp-glc", "udp-gal", "udp-glca", "f6p", "udp-glcnac", "gdp-man",
  "gdp-fuc", "neu5ac", "cmp-neu5ac", "nglycan_core", "nglycan_complex",
  "oglycan", "gag_ha", "ceramide", "glycolipid",
];
// 七种糖核苷酸供体及其生成步
const DONOR_STEP = {
  "udp-glc": "gcon-1",
  "udp-gal": "gcon-2",
  "udp-glca": "gcon-3",
  "udp-glcnac": "gcon-4",
  "gdp-man": "gcon-5",
  "gdp-fuc": "gcon-6",
  "cmp-neu5ac": "gcon-8",
};

function validate(d, s) {
  const out = [];
  const push = (m) => out.push(m);

  // 1) 步骤：13 步、id / 序号连续、必填字段齐全
  if (d.steps.length !== 13) push(`步骤数应为 13，实际 ${d.steps.length}`);
  const ids = d.steps.map((x) => x.id);
  if (ids.join(",") !== STEP_IDS.join(",")) push(`步骤 id 应为 ${STEP_IDS.join(",")}，实际 ${ids.join(",")}`);
  d.steps.forEach((step, i) => {
    if (step.index !== i + 1) push(`${step.id} 的 index 应为 ${i + 1}，实际 ${step.index}`);
    if (!step.name || !step.shortName || !step.equation) push(`${step.id} 缺 name/shortName/equation`);
    if (!step.substrates.length || !step.products.length) push(`${step.id} 底物或产物为空`);
    if (!step.enzyme?.name) push(`${step.id} 缺酶名`);
    if (step.deltaG?.standard !== null || step.deltaG?.physiological !== null) {
      push(`${step.id} 的 ΔG 数值必须为 null（只保留定性标注）`);
    }
    if (!step.deltaG?.qualitative || !step.deltaG?.source) push(`${step.id} 缺 ΔG 定性或来源`);
    if (!Array.isArray(step.misconceptions) || !step.misconceptions.length) push(`${step.id} 缺易错点`);
  });

  // 2) 区室：胞质供体生成 → 内质网起始 → 高尔基体加工
  for (const step of d.steps) {
    const want = COMPARTMENT_OF[step.id];
    if (want && step.compartment !== want) push(`${step.id} 应在 ${want}，实际 ${step.compartment}`);
  }

  // 3) 方向与 EC（查不准的一律写「未核实」，不编子项）
  for (const step of d.steps) {
    if (typeof IRREVERSIBLE[step.id] === "boolean" && step.irreversible !== IRREVERSIBLE[step.id]) {
      push(`${step.id} 的 irreversible 应为 ${IRREVERSIBLE[step.id]}，实际 ${step.irreversible}`);
    }
    if (EC[step.id] && step.enzyme?.ec !== EC[step.id]) {
      push(`${step.id} 的 EC 应为 ${EC[step.id]}，实际 ${step.enzyme?.ec}`);
    }
  }
  if (d.steps.some((x) => /^\d+\.\d+\.\d+\.\d+$/.test(x.enzyme?.ec ?? "") && !EC[x.id])) {
    push("出现了未登记在预期表中的 EC 编号");
  }

  // 4) 六种 + 唾液酸供体都必须有生成步
  for (const [donor, stepId] of Object.entries(DONOR_STEP)) {
    const st = d.steps.find((x) => x.id === stepId);
    if (!st) push(`供体 ${donor} 的生成步 ${stepId} 不存在`);
    else if (!st.products.includes(donor)) push(`${stepId} 的产物应含 ${donor}`);
  }

  // 5) 四条去向：N-糖基化（ER 起始 + Golgi 加工）、O-GlcNAc、糖胺聚糖、糖脂
  const g9 = d.steps.find((x) => x.id === "gcon-9");
  if (g9?.compartment !== "er") push("gcon-9（N-糖基化起始）应在内质网");
  if (!/OST/.test(g9?.enzyme?.isozyme ?? "")) push("gcon-9 的同工酶应写 OST");
  if (!g9?.significance?.includes("N-糖基化")) push("gcon-9 应写明 N-糖基化起点");
  const g10 = d.steps.find((x) => x.id === "gcon-10");
  for (const donor of ["udp-glcnac", "udp-gal", "gdp-fuc", "cmp-neu5ac"]) {
    if (!g10?.substrates?.includes(donor)) push(`gcon-10 的底物应含末端供体 ${donor}`);
  }
  if (g10?.enzyme?.ec !== "未核实") push("gcon-10 是多酶体系，EC 应写「未核实」");
  const g11 = d.steps.find((x) => x.id === "gcon-11");
  if (!/OGT/.test(g11?.enzyme?.isozyme ?? "")) push("gcon-11 的同工酶应写 OGT");
  if (!/可逆/.test(`${g11?.significance ?? ""}${g11?.deltaG?.qualitative ?? ""}`)) push("gcon-11 应写明 O-GlcNAc 可逆");
  const g12 = d.steps.find((x) => x.id === "gcon-12");
  if (!g12?.substrates?.includes("udp-glca") || !g12?.substrates?.includes("udp-glcnac")) {
    push("gcon-12 应同时用 UDP-GlcA 与 UDP-GlcNAc");
  }
  if (!/透明质酸/.test(`${g12?.significance ?? ""}`)) push("gcon-12 应写明透明质酸");
  const g13 = d.steps.find((x) => x.id === "gcon-13");
  if (!g13?.substrates?.includes("ceramide")) push("gcon-13 应以神经酰胺为受体");
  if (!g13?.products?.includes("glycolipid")) push("gcon-13 应生成糖脂");

  // 6) 边界：不做糖链装配全图，不搬糖酵解 / PPP / FAS 步骤
  const blobFoot = d.posterFoot.join(" ");
  if (!blobFoot.includes("窄切口") || !blobFoot.includes("供体—转移酶—受体")) {
    push("posterFoot 应写明窄切口与「供体—转移酶—受体」口径");
  }
  if (!d.readingGuide.paragraphs.some((p) => p.includes("不画") && p.includes("装配"))) {
    push("导读应写明不画糖链装配全图");
  }
  if (d.steps.some((x) => /己糖激酶|PFK|丙酮酸激酶|HMG-CoA/.test(`${x.name}${x.enzyme?.name ?? ""}`))) {
    push("不应把糖酵解 / 胆固醇合成步骤画进本图");
  }

  // 7) 实体唯一且齐全
  const eIds = d.entities.map((e) => e.id);
  if (new Set(eIds).size !== eIds.length) push("entities 存在重复 id");
  for (const need of ENTITIES) if (!eIds.includes(need)) push(`entities 缺 ${need}`);
  if (d.entities.length !== ENTITIES.length) push(`entities 数应为 ${ENTITIES.length}，实际 ${d.entities.length}`);

  // 8) 图例 / 导读 / 页脚 / 教材依据
  if (!(d.legend?.length >= 4)) push("legend 不足 4 项");
  if (!d.readingGuide?.paragraphs?.length) push("缺导读段落");
  if (!(d.posterFoot?.length >= 2)) push("posterFoot 应至少 2 行");
  if (!d.posterFoot.some((t) => t.includes("教材依据") && t.includes("第 9 版"))) {
    push("posterFoot 应写教材依据（书名 + 版次 + 章节名）");
  }

  // 9) 全部 2D：不登记 PDB、不写页码 / 真题
  if (d.threeD?.status !== "not-built") push(`threeD.status 应为 not-built，实际 ${d.threeD?.status}`);
  if (!d.threeD?.note?.includes("2D") || !d.threeD?.note?.includes("PDB")) push("threeD.note 应写明只做 2D、不登记 PDB");
  const blob = JSON.stringify(d) + JSON.stringify(s);
  if (/pdbId|pdb_id|candidatePdb|pdbCandidates/i.test(blob)) push("数据里出现 PDB 候选字段");
  if (blob.includes("待结构核验")) push("数据里出现「待结构核验」占位");
  if (/第\s*\d+\s*页|真题\s*\d{4}|20\d{2}\s*年真题/.test(blob)) push("数据里出现页码或真题年份");

  // 10) 无运输段（本图不画跨区室运输）
  const dt = (d.transportSteps ?? []).map((t) => t.id);
  const st = (s.transportSteps ?? []).map((t) => t.id);
  if (dt.length !== 0) push(`本图不设运输段，实际 ${dt.join(",")}`);
  if (st.length !== 0) push(`骨架不应有运输段，实际 ${st.join(",")}`);

  // 11) 接口：只指向两端都真实存在的既有步骤
  const files = [
    "src/data/glycolysis.json",
    "src/data/ppp/ppp.json",
    "src/data/fatty-acid-synthesis/fas.json",
    "src/data/pyrimidine/pyrimidine.json",
  ];
  const known = new Set();
  for (const file of files) {
    const src = read(file);
    for (const x of src.steps ?? []) known.add(x.id);
    for (const x of src.sideBranchSteps ?? []) known.add(x.id);
  }
  const ifaceIds = (d.interfaces ?? []).map((it) => it.stepId).sort();
  if (ifaceIds.join(",") !== "fas-te,gk-1,ppp-n1,pyr-9") {
    push(`接口应只含 gk-1 / ppp-n1 / fas-te / pyr-9，实际 ${ifaceIds.join(",")}`);
  }
  for (const it of d.interfaces ?? []) {
    if (!known.has(it.stepId)) push(`接口 stepId 不存在：${it.stepId}`);
    if (!it.label || !it.note) push(`接口 ${it.stepId} 缺 label/note`);
  }
  if ((d.interfaces ?? []).some((it) => /ser|丝氨酸/.test(it.stepId))) {
    push("丝氨酸在氨基酸图中没有独立生成步，不应登记 step 接口");
  }

  // 12) 骨架：3 区室
  if (s.compartments?.length !== 3) push(`区室应为 3 个，实际 ${s.compartments?.length}`);
  const compIds = (s.compartments ?? []).map((c) => c.id);
  if (compIds.join(",") !== "cyto,er,golgi") push(`区室 id 应为 cyto,er,golgi，实际 ${compIds.join(",")}`);

  // 13) 节点：唯一、在区室内、实体存在
  const nIds = s.nodes.map((n) => n.id);
  if (new Set(nIds).size !== nIds.length) push("skeleton 节点 id 重复");
  for (const n of s.nodes) {
    const c = s.compartments.find((x) => x.id === n.compartment);
    if (!c) {
      push(`节点 ${n.id} 的区室不存在：${n.compartment}`);
      continue;
    }
    if (n.x < c.x + 14 || n.x > c.x + c.width - 14 || n.y < c.y + 44 || n.y > c.y + c.height - 14) {
      push(`节点 ${n.id} 越出区室 ${c.id}（${n.x},${n.y}）`);
    }
    if (!eIds.includes(n.entityId)) push(`节点 ${n.id} 的 entityId 不在 entities：${n.entityId}`);
    if (!n.label || !n.abbr) push(`节点 ${n.id} 缺 label/abbr`);
  }
  if (s.nodes.length !== 16) push(`节点数应为 16，实际 ${s.nodes.length}`);

  // 14) 连线：端点存在、stepId 真实
  const stepSet = new Set(d.steps.map((x) => x.id));
  for (const l of s.links) {
    if (!nIds.includes(l.from) || !nIds.includes(l.to)) push(`连线端点不存在：${l.from}→${l.to}`);
    if (l.stepId && !stepSet.has(l.stepId)) push(`连线 stepId 不存在：${l.stepId}`);
    if (!l.stepId) push(`连线缺 stepId：${l.from}→${l.to}（${l.type}）`);
    if (l.type === "transport") push("本图不设运输连线");
  }
  if (s.links.length !== 22) push(`连线数应为 22，实际 ${s.links.length}`);

  // 15) 每步有可点击链且主链端点落在底物 / 产物
  for (const step of d.steps) {
    const clickable = s.links.filter((l) => l.stepId === step.id);
    if (!clickable.length) {
      push(`${step.id} 没有可点击链`);
      continue;
    }
    const mains = clickable.filter((l) => l.type === "main");
    if (!mains.length) {
      push(`${step.id} 缺主链`);
      continue;
    }
    const sub = new Set(step.substrates);
    const prod = new Set(step.products);
    const ent = (id) => s.nodes.find((n) => n.id === id)?.entityId;
    for (const m of mains) {
      const ok = sub.has(ent(m.from)) && prod.has(ent(m.to));
      if (!ok) push(`${step.id} 主链端点与底物/产物不符：${m.from}→${m.to}（${ent(m.from)}→${ent(m.to)}）`);
    }
  }

  // 16) 每步在图上都有节点
  for (const step of d.steps) {
    if (!s.nodes.some((n) => n.stepId === step.id)) push(`${step.id} 没有可点击节点`);
  }

  // 17) 结构对照：13 块与步骤一一对应
  const src = readFileSync(join(ROOT, "src/data/comparisonConfig.ts"), "utf8");
  for (const id of STEP_IDS) {
    if (!src.includes(`stepId: "${id}"`)) push(`comparisonConfig.ts 缺结构块 ${id}`);
  }

  return out;
}

for (const m of validate(data, skel)) err(m);

// ---------- 负例：改坏后必须报错 ----------
const clone = (x) => JSON.parse(JSON.stringify(x));
const NEGATIVES = [
  ["步骤序号断裂", (d) => { d.steps[2].index = 7; }],
  ["节点越出区室", (d, s) => { s.nodes[0].x = 12; }],
  ["连线指向不存在节点", (d, s) => { s.links[0].to = "nope"; }],
  ["某步缺主链", (d, s) => { s.links = s.links.filter((l) => !(l.stepId === "gcon-12" && l.type === "main")); }],
  ["ΔG 出现数值", (d) => { d.steps[0].deltaG.standard = -20; }],
  ["threeD 被写成已建", (d) => { d.threeD.status = "built"; }],
  ["登记 PDB 候选", (d) => { d.entities[0].pdbId = "1ABC"; }],
  ["接口指向不存在的步骤", (d) => { d.interfaces[0].stepId = "gk-99"; }],
  ["去掉 CTP 接口", (d) => { d.interfaces = d.interfaces.filter((it) => it.stepId !== "pyr-9"); }],
  ["把丝氨酸登记成接口", (d) => { d.interfaces.push({ stepId: "aa-ser", label: "丝氨酸", note: "x" }); }],
  ["CMAS 被改成可逆", (d) => { const st = d.steps.find((x) => x.id === "gcon-8"); st.irreversible = false; }],
  ["EC 编造", (d) => { const st = d.steps.find((x) => x.id === "gcon-7"); st.enzyme.ec = "5.3.1.99"; }],
  ["混入糖酵解步骤", (d) => { d.steps[0].name = "己糖激酶磷酸化葡萄糖"; }],
  ["多画一段运输", (d, s) => { s.transportSteps = [{ id: "gcon-t1", name: "x", from: "a", via: "b", to: "c", note: "d" }]; }],
  ["UDP-Glc 生成步丢失产物", (d) => { const st = d.steps.find((x) => x.id === "gcon-1"); st.products = ["udp-gal"]; }],
];
for (const [label, mutate] of NEGATIVES) {
  const d = clone(data);
  const s = clone(skel);
  mutate(d, s);
  if (!validate(d, s).length) err(`负例未被拦下：${label}`);
}

if (errors.length) {
  console.error(`validate-glycoconjugate FAIL：${errors.length} 项`);
  for (const m of errors) console.error(`  - ${m}`);
  process.exit(1);
}
console.log(
  `validate-glycoconjugate PASS：13 步（胞质 9 + 内质网 1 + 高尔基体 3）｜3 区室｜${skel.nodes.length} 节点｜${skel.links.length} 连线｜` +
    `供体 7 种｜接口 ${data.interfaces.length} 条（gk-1 / ppp-n1 / fas-te / pyr-9）｜2D-only｜负例 ${NEGATIVES.length} 组全部拦下｜无 PDB / 无「待结构核验」`,
);
