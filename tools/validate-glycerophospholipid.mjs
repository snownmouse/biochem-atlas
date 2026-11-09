// 甘油磷脂与鞘脂代谢挂图（PLATE 17 · SF-17）数据层校验。
// 口径：15 步两区室（内质网 er 14 步 + 高尔基体 golgi 1 步），全部 2D；
// 接口只登记 pyr-9 / aa-7 / oc-6。除正向校验外，脚本自带 15 组负例。
// 用法：node tools/validate-glycerophospholipid.mjs
import { readFileSync, existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => JSON.parse(readFileSync(join(ROOT, p), "utf8"));
const exists = (p) => existsSync(join(ROOT, p));

const data = read("src/data/glycerophospholipid/glycerophospholipid.json");
const skel = read("src/data/glycerophospholipid/skeleton.json");

const STEP_IDS = [
  "gpl-1", "gpl-2", "gpl-3", "gpl-4", "gpl-5",
  "gpl-6", "gpl-7", "gpl-8", "gpl-9", "gpl-10",
  "gpl-11", "gpl-12", "gpl-13", "gpl-14", "gpl-15",
];
const ER_STEPS = STEP_IDS.slice(0, 14);
const NODE_COUNT = 35;

function validate(d, s) {
  const out = [];
  const push = (m) => out.push(m);

  // 1) 步骤：15 步、id / 序号连续、必填字段齐全
  if (d.steps.length !== 15) push(`步骤数应为 15，实际 ${d.steps.length}`);
  const ids = d.steps.map((x) => x.id);
  if (ids.join(",") !== STEP_IDS.join(",")) push(`步骤 id 应为 ${STEP_IDS.join(",")}，实际 ${ids.join(",")}`);
  d.steps.forEach((step, i) => {
    if (step.index !== i + 1) push(`${step.id} 的 index 应为 ${i + 1}，实际 ${step.index}`);
    if (!step.name || !step.shortName || !step.equation) push(`${step.id} 缺 name/shortName/equation`);
    if (!step.substrates.length || !step.products.length) push(`${step.id} 底物或产物为空`);
    if (!step.enzyme?.name || !step.enzyme?.ec) push(`${step.id} 缺酶名或 EC`);
    if (step.deltaG?.standard !== null || step.deltaG?.physiological !== null) {
      push(`${step.id} 的 ΔG 数值必须为 null（只保留定性标注）`);
    }
    if (!step.deltaG?.qualitative || !step.deltaG?.source) push(`${step.id} 缺 ΔG 定性或来源`);
    if (!Array.isArray(step.misconceptions) || !step.misconceptions.length) push(`${step.id} 缺易错点`);
  });

  // 2) 区室：er 14 步 + golgi 1 步；骨架恰好两个区室
  const compIds = (s.compartments ?? []).map((c) => c.id);
  if (compIds.join(",") !== "er,golgi") push(`区室应为 er,golgi，实际 ${compIds.join(",")}`);
  if (!/内质网/.test(s.compartments?.[0]?.label ?? "")) push("er 区室 label 应写明内质网");
  if (!/高尔基体/.test(s.compartments?.[1]?.label ?? "")) push("golgi 区室 label 应写明高尔基体");
  for (const step of d.steps) {
    const want = step.id === "gpl-15" ? "golgi" : "er";
    if (step.compartment !== want) push(`${step.id} 应在 ${want}，实际 ${step.compartment}`);
  }
  if (ER_STEPS.some((id) => d.steps.find((x) => x.id === id)?.compartment !== "er")) {
    push("er 区室应包含 gpl-1 … gpl-14");
  }

  // 3) 关键步骤口径
  const p1 = d.steps.find((x) => x.id === "gpl-1");
  if (!p1?.irreversible) push("gpl-1（GPAT）应标为不可逆");
  if (!/限速/.test(`${p1?.shortName}${p1?.significance}`)) push("gpl-1 应写明限速步");
  if (!/承诺/.test(`${p1?.shortName}${p1?.significance}`)) push("gpl-1 应写明承诺步");

  const p3 = d.steps.find((x) => x.id === "gpl-3");
  if (!p3?.substrates?.includes("ctp")) push("gpl-3（CDS）应以 CTP 为底物");
  if (!p3?.note?.includes("pyr-9")) push("gpl-3 的 note 应写明接口 pyr-9");

  const p7 = d.steps.find((x) => x.id === "gpl-7");
  if (!/3\s*SAM/.test(p7?.equation ?? "") || !/3\s*SAH/.test(p7?.equation ?? "")) {
    push("gpl-7 的 equation 应按 3 SAM → 3 SAH 写");
  }
  if (!/三次甲基化/.test(`${p7?.note}${p7?.significance}`)) push("gpl-7 应写明三次甲基化");
  if (!p7?.note?.includes("oc-6")) push("gpl-7 的 note 应写明接口 oc-6");

  const p9 = d.steps.find((x) => x.id === "gpl-9");
  if (!/PSS2/.test(p9?.note ?? "")) push("gpl-9 的 note 应说明 PSS2 支路不单列");
  if (!/aa-7/.test(p9?.note ?? "")) push("gpl-9 的 note 应写明接口 aa-7");

  const p10 = d.steps.find((x) => x.id === "gpl-10");
  if (!/PGPS/.test(p10?.enzyme?.name ?? "") || !/PGP 磷酸酶/.test(p10?.enzyme?.name ?? "")) {
    push("gpl-10 的酶名应并列写清 PGPS 与 PGP 磷酸酶");
  }
  if (!/3\.1\.3\.27/.test(`${p10?.enzyme?.isozyme}${p10?.note}`)) push("gpl-10 应写明第二步 EC 3.1.3.27");
  if (!p10?.products?.includes("pgp") || !p10?.products?.includes("pg")) push("gpl-10 应生成 PGP 与 PG");
  if (!p10?.note?.includes("合并")) push("gpl-10 的 note 应说明合并理由");

  const p11 = d.steps.find((x) => x.id === "gpl-11");
  if (!p11?.substrates?.includes("ser") || !p11?.products?.includes("kds")) push("gpl-11 应以丝氨酸生成 3-酮基二氢鞘氨醇");
  if (!p11?.products?.includes("co2")) push("gpl-11 应释放 CO₂");
  if (!p11?.note?.includes("aa-7")) push("gpl-11 的 note 应写明接口 aa-7");

  const p13 = d.steps.find((x) => x.id === "gpl-13");
  if (!/CERS/.test(p13?.enzyme?.isozyme ?? "")) push("gpl-13 应写 CERS");
  if (!p13?.products?.includes("dihydroceramide")) push("gpl-13 的产物应是二氢神经酰胺");
  if (p13?.products?.includes("cer")) push("gpl-13 不应直接生成带 4,5-双键的神经酰胺");
  if (!/DES/.test(p13?.note ?? "")) push("gpl-13 的 note 应写 DES 的后续去饱和");
  if (!/EC 未核实/.test(p13?.note ?? "")) push("gpl-13 的 note 应写「EC 未核实」");

  const p14 = d.steps.find((x) => x.id === "gpl-14");
  if (!/去饱和酶/.test(`${p14?.enzyme?.name}${p14?.enzyme?.isozyme}`)) push("gpl-14 应是 DES 去饱和酶");
  if (!p14?.substrates?.includes("dihydroceramide") || !p14?.products?.includes("cer")) {
    push("gpl-14 应以二氢神经酰胺为底物、生成神经酰胺");
  }
  if (p14?.enzyme?.ec !== "未核实") push("gpl-14 的 EC 子项本平台未核实，应写「未核实」");
  if (!/EC 未核实/.test(p14?.note ?? "")) push("gpl-14 的 note 应写「EC 未核实」");

  const p15 = d.steps.find((x) => x.id === "gpl-15");
  if (!/SMS/.test(p15?.enzyme?.isozyme ?? "")) push("gpl-15 应写 SMS");
  if (!p15?.substrates?.includes("cer") || !p15?.substrates?.includes("pc")) push("gpl-15 应以神经酰胺 + PC 为底物");
  if (!p15?.products?.includes("sm") || !p15?.products?.includes("dag")) push("gpl-15 应生成 SM + DAG");

  // 4) 关键 EC 固定表（gpl-1 … gpl-15）
  const EC_FIXED = {
    "gpl-1": "2.3.1.15",
    "gpl-2": "2.3.1.51",
    "gpl-3": "2.7.7.41",
    "gpl-4": "3.1.3.4",
    "gpl-5": "2.7.8.2",
    "gpl-6": "2.7.8.1",
    "gpl-7": "2.1.1.17",
    "gpl-8": "2.7.8.11",
    "gpl-9": "2.7.8.8",
    "gpl-10": "2.7.8.5",
    "gpl-11": "2.3.1.50",
    "gpl-12": "1.1.1.102",
    "gpl-13": "2.3.1.24",
    "gpl-14": "未核实",
    "gpl-15": "2.7.8.27",
  };
  for (const [id, ec] of Object.entries(EC_FIXED)) {
    const st = d.steps.find((x) => x.id === id);
    if (st?.enzyme?.ec !== ec) push(`${id} 的 EC 应为 ${ec}，实际 ${st?.enzyme?.ec}`);
  }

  // 5) 实体：唯一、关键实体齐全、所有底物 / 产物都有实体
  const eIds = d.entities.map((e) => e.id);
  if (new Set(eIds).size !== eIds.length) push("entities 存在重复 id");
  for (const need of [
    "g3p", "lpa", "pa", "cdp-dag", "dag", "pc", "pe", "ps", "pi-lipid", "pg", "pgp", "cl",
    "cer", "dihydroceramide", "sm", "dhs", "kds", "choline", "cdp-choline", "ethanolamine", "cdp-ethanolamine",
    "inositol", "ser", "sam", "sah", "acylcoa-c16", "coa", "ctp", "ppi", "cmp", "nadph", "nadp",
    "h2o", "pi", "co2", "o2",
  ]) {
    if (!eIds.includes(need)) push(`entities 缺 ${need}`);
  }
  for (const step of d.steps) {
    for (const m of [...step.substrates, ...step.products]) {
      if (!eIds.includes(m)) push(`${step.id} 引用了不存在的实体 ${m}`);
    }
  }

  // 6) 图例 / 导读 / 页脚
  if (!(d.legend?.length >= 5)) push("legend 应至少 5 项");
  if (!(d.readingGuide?.paragraphs?.length >= 4)) push("导读段落应至少 4 段");
  if (!(d.posterFoot?.length >= 5)) push("posterFoot 应至少 5 行");
  const foot = d.posterFoot.join("\n");
  if (!/Kennedy/.test(foot)) push("posterFoot 应写明 Kennedy 途径");
  if (!/CDP-DAG/.test(foot)) push("posterFoot 应写明 CDP-DAG 分岔");
  if (!/PEMT/.test(foot) || !/PSS1/.test(foot)) push("posterFoot 应写明 PEMT / PSS1 头基交换");
  if (!/心磷脂/.test(foot) || !/未建/.test(foot)) push("posterFoot 应写心磷脂只作 hub 注记、本平台未建 CLS");
  if (!/CERS/.test(foot) || !/DES/.test(foot)) push("posterFoot 应写 CERS / DES 口径");
  if (!/SMS/.test(foot)) push("posterFoot 应写 SMS 与 PC 的交叉");
  if (!d.posterFoot.some((t) => t.includes("教材依据") && t.includes("第 9 版") && t.includes("甘油磷脂与鞘脂的合成"))) {
    push("posterFoot 应含唯一教材依据：《生物化学与分子生物学》第 9 版 · 脂质代谢（甘油磷脂与鞘脂的合成）");
  }

  // 7) 全部 2D：threeD 固定 not-built，不登记 PDB，不写页码 / 真题
  if (d.threeD?.status !== "not-built") push(`threeD.status 应为 not-built，实际 ${d.threeD?.status}`);
  if (!d.threeD?.note?.includes("2D") || !d.threeD?.note?.includes("PDB")) push("threeD.note 应写明只做 2D、不登记 PDB");
  const blob = JSON.stringify(d) + JSON.stringify(s);
  if (/pdbId|pdb_id|candidatePdb|pdbCandidates/i.test(blob)) push("数据里出现 PDB 候选字段");
  if (blob.includes("待结构核验")) push("数据里出现「待结构核验」占位");
  if (/第\s*\d+\s*页|真题\s*\d{4}|20\d{2}\s*年真题/.test(blob)) push("数据里出现页码或真题年份");
  if (d.transportSteps?.length) push("本图不画跨区室运输步骤，transportSteps 应为空");

  // 8) 接口：只登记 pyr-9 / aa-7 / oc-6，且都在对应图中真实存在
  const known = new Set();
  for (const file of [
    "src/data/pyrimidine/pyrimidine.json",
    "src/data/amino-acid/amino.json",
    "src/data/one-carbon/one-carbon.json",
  ]) {
    const src = read(file);
    for (const st of src.steps ?? []) known.add(st.id);
    for (const st of src.sideBranchSteps ?? []) known.add(st.id);
  }
  const ifaceIds = (d.interfaces ?? []).map((x) => x.stepId).sort();
  if (ifaceIds.join(",") !== "aa-7,oc-6,pyr-9") push(`interfaces 应只有 pyr-9 / aa-7 / oc-6，实际 ${ifaceIds.join(",") || "无"}`);
  for (const it of d.interfaces ?? []) {
    if (!known.has(it.stepId)) push(`接口 stepId 不存在：${it.stepId}`);
    if (!it.label || !it.note) push(`接口 ${it.stepId} 缺 label/note`);
  }
  const idx = readFileSync(join(ROOT, "src/data/stepIndex.ts"), "utf8");
  if (!/id: "glycerophospholipid".*route: "\/pathway\/glycerophospholipid"/.test(idx)) {
    push("stepIndex 未登记 glycerophospholipid 路由");
  }
  if (!/structureRoute: "\/structures\/glycerophospholipid"/.test(idx)) {
    push("stepIndex 未登记 glycerophospholipid 结构路由");
  }
  const cfg = readFileSync(join(ROOT, "src/data/comparisonConfig.ts"), "utf8");
  if (!/const GLYCEROPHOSPHOLIPID_CONFIG/.test(cfg)) push("comparisonConfig 缺 GLYCEROPHOSPHOLIPID_CONFIG");
  if (!/glycerophospholipid: GLYCEROPHOSPHOLIPID_CONFIG/.test(cfg)) push("comparisonConfig 未注册 glycerophospholipid");

  // 9) 骨架节点：唯一、都在正确区室、实体存在
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
  if (s.nodes.length !== NODE_COUNT) push(`节点数应为 ${NODE_COUNT}，实际 ${s.nodes.length}`);
  if (s.nodes.filter((n) => n.compartment === "golgi").length !== 4) push("高尔基体应有 4 个节点");
  if (s.nodes.filter((n) => n.compartment === "er").length !== NODE_COUNT - 4) push(`内质网节点数应为 ${NODE_COUNT - 4}`);

  // 10) 连线：端点存在、stepId 真实；每步至少一条 main 边 + 一个带 stepId 节点
  const stepIds = new Set(d.steps.map((x) => x.id));
  for (const l of s.links) {
    if (!nIds.includes(l.from) || !nIds.includes(l.to)) push(`连线端点不存在：${l.from}→${l.to}`);
    if (l.stepId && !stepIds.has(l.stepId)) push(`连线 ${l.from}→${l.to} 的 stepId 不存在：${l.stepId}`);
    if (l.type === "main" && !l.stepId) push(`main 连线 ${l.from}→${l.to} 缺 stepId`);
  }
  for (const id of STEP_IDS) {
    const links = s.links.filter((l) => l.stepId === id && l.type === "main");
    if (!links.length) push(`${id} 缺 main 连线`);
    const nodes = s.nodes.filter((n) => n.stepId === id);
    if (!nodes.length) push(`${id} 缺可点击节点`);
    const step = d.steps.find((x) => x.id === id);
    for (const l of links) {
      if (!step) continue;
      const fromNode = s.nodes.find((n) => n.id === l.from);
      const toNode = s.nodes.find((n) => n.id === l.to);
      const ok =
        (step.substrates.includes(fromNode?.entityId) && step.products.includes(toNode?.entityId)) ||
        (step.substrates.includes(toNode?.entityId) && step.products.includes(fromNode?.entityId)) ||
        links.length > 1;
      if (!ok) push(`${id} 的 main 连线 ${l.from}→${l.to} 与底物/产物不对应`);
    }
  }
  const hubLink = s.links.find((l) => l.to === "cl");
  if (!hubLink || hubLink.stepId) push("心磷脂应只作无 stepId 的 hub 连线");

  // 11) 2D 资产：4 个新资产存在，provenance 写明 2D-only / 不建 3D；复用资产存在
  for (const id of ["g3p", "choline", "ethanolamine", "inositol"]) {
    const p = `public/assets/structures/2d/${id}.json`;
    if (!exists(p)) {
      push(`缺 2D 资产 ${p}`);
      continue;
    }
    const a = read(p);
    const prov = JSON.stringify(a.provenance ?? a);
    if (!/2D/.test(prov)) push(`资产 ${id} 的 provenance 未写明 2D`);
    if (!/no3d|不建 3D|未建 3D/.test(prov)) push(`资产 ${id} 的 provenance 未写明不建 3D`);
    if (/pdbId|pdb_id|candidatePdb|pdbCandidates/i.test(prov)) push(`资产 ${id} 的 provenance 出现 PDB 候选字段`);
  }
  for (const id of ["acylcoa-c16", "ctp", "ser", "sam", "sah", "co2"]) {
    if (!exists(`public/assets/structures/2d/${id}.json`)) push(`复用资产缺失：${id}`);
  }
  for (const id of ["lpa", "pa", "cdp-dag", "dag", "pc", "pe", "ps", "pi-lipid", "pg", "pgp", "cer", "sm"]) {
    if (exists(`public/assets/structures/2d/${id}.json`)) push(`脂质 ${id} 不应编造 2D 资产`);
  }
  return out;
}

const errors = validate(data, skel);

// ===== 负例：把数据改坏后，validate 必须报错 =====
const clone = (o) => JSON.parse(JSON.stringify(o));
const negatives = [];
function negative(name, mutate) {
  const d = clone(data);
  const s = clone(skel);
  mutate(d, s);
  const out = validate(d, s);
  negatives.push({ name, caught: out.length > 0, first: out[0] ?? "" });
}

negative("删掉一步", (d) => { d.steps.pop(); });
negative("改错 gpl-1 的 EC", (d) => { d.steps[0].enzyme.ec = "1.1.1.1"; });
negative("删掉 gpl-2 的 main 边", (d, s) => { s.links = s.links.filter((l) => !(l.stepId === "gpl-2" && l.type === "main")); });
negative("把 threeD 改成 built", (d) => { d.threeD.status = "built"; });
negative("伪造接口 pss2-1", (d) => { d.interfaces.push({ stepId: "pss2-1", label: "伪造", note: "伪造" }); });
negative("删掉 oc-6 接口", (d) => { d.interfaces = d.interfaces.filter((x) => x.stepId !== "oc-6"); });
negative("把节点挪出区室", (d, s) => { s.nodes[0].x = 10; });
negative("把 gpl-15 放回 er", (d) => { d.steps[14].compartment = "er"; });
negative("把 gpl-7 写成 1 SAM → 1 SAH", (d) => { d.steps[6].equation = "PE + SAM → PC + SAH"; });
negative("删掉 DES 的 EC 未核实说明", (d) => { d.steps[13].note = "去饱和。" });
negative("把 CERS 产物直接写成神经酰胺", (d) => { d.steps[12].products = ["cer", "coa"]; });
negative("写页码", (d) => { d.posterFoot.push("见第 123 页。"); });
negative("登记 PDB", (d) => { d.threeD.pdbId = "1ABC"; });
negative("把 gpl-10 的两步合并拆掉（只留 PGPS）", (d) => { d.steps[9].enzyme.name = "磷脂酰甘油磷酸合成酶"; });
negative("把心磷脂 hub 连线改成步骤", (d, s) => { s.links.find((l) => l.to === "cl").stepId = "gpl-10"; });

if (errors.length === 0) {
  console.log("✓ 甘油磷脂与鞘脂代谢挂图数据校验通过");
  console.log(`  步骤 ${data.steps.length} / 区室 ${skel.compartments.length}（er 14 + golgi 1） / 节点 ${skel.nodes.length} / 接口 ${data.interfaces.length} / 资产 4 新建 + 6 复用`);
  let ok = 0;
  for (const n of negatives) {
    if (n.caught) {
      ok += 1;
      console.log(`  ✓ 负例「${n.name}」被捕获：${n.first}`);
    } else {
      console.log(`  ✗ 负例「${n.name}」未被捕获`);
    }
  }
  console.log(`  负例 ${negatives.length} 组，捕获 ${ok} 组`);
  process.exit(ok === negatives.length ? 0 : 1);
} else {
  console.log("✗ 甘油磷脂与鞘脂代谢挂图数据校验失败：");
  for (const e of errors) console.log(`  - ${e}`);
  process.exit(1);
}
