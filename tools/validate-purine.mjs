// 嘌呤核苷酸代谢挂图（PLATE 16 · SF-16）数据层校验。
// 口径：15 步全部胞质、单区室、全部 2D；接口只登记 ppp-n1 与 oc-3。
// 除正向校验外，脚本自带 10 组负例（改坏数据后必须报错），防止校验器本身失效。
// 用法：node tools/validate-purine.mjs
import { readFileSync, existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => JSON.parse(readFileSync(join(ROOT, p), "utf8"));
const exists = (p) => existsSync(join(ROOT, p));

const data = read("src/data/purine/purine.json");
const skel = read("src/data/purine/skeleton.json");

const STEP_IDS = [
  "pur-1", "pur-2", "pur-3", "pur-4", "pur-5",
  "pur-6", "pur-7", "pur-8", "pur-9", "pur-10",
  "pur-11", "pur-12", "pur-13", "pur-14", "pur-15",
];

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

  // 2) 区室：15 步全部 cyto；骨架只有一个 cyto 区室
  if (new Set(d.steps.map((x) => x.compartment)).size !== 1) push("步骤区室应只有 cyto 一种");
  for (const step of d.steps) {
    if (step.compartment !== "cyto") push(`${step.id} 应在 cyto，实际 ${step.compartment}`);
  }
  if (s.compartments?.length !== 1) push(`区室应为 1 个，实际 ${s.compartments?.length}`);
  if (s.compartments?.map((c) => c.id).join(",") !== "cyto") {
    push(`区室 id 应为 cyto，实际 ${s.compartments?.map((c) => c.id).join(",")}`);
  }
  if (!/嘌呤从头合成/.test(s.compartments?.[0]?.label ?? "")) push("cyto 区室 label 应写明嘌呤从头合成");

  // 3) 起始 / 限速 / 装环关键步
  const p1 = d.steps.find((x) => x.id === "pur-1");
  if (p1?.enzyme?.ec !== "2.7.6.1") push(`pur-1 的 EC 应为 2.7.6.1，实际 ${p1?.enzyme?.ec}`);
  if (!/PRPPS/.test(p1?.enzyme?.isozyme ?? "")) push("pur-1 的同工酶应写 PRPPS");
  if (!p1?.substrates?.includes("r5p")) push("pur-1 应以 R5P 为底物");
  if (!p1?.note?.includes("ppp-n1")) push("pur-1 的 note 应写明接口 ppp-n1");

  const p2 = d.steps.find((x) => x.id === "pur-2");
  if (!p2?.irreversible) push("pur-2 应标为不可逆");
  if (!/限速/.test(`${p2?.name}${p2?.significance}${p2?.shortName}`)) push("pur-2 应写明限速步");
  if (!/反馈抑制/.test(`${p2?.note}${p2?.significance}`)) push("pur-2 应写明 AMP/GMP/IMP 反馈抑制");

  const p4 = d.steps.find((x) => x.id === "pur-4");
  const p10 = d.steps.find((x) => x.id === "pur-10");
  if (!p4?.note?.includes("oc-3")) push("pur-4 的 note 应写明一碳池接口 oc-3");
  if (!p10?.note?.includes("oc-3")) push("pur-10 的 note 应写明一碳池接口 oc-3");
  if (!p4?.substrates?.includes("chothf") || !p10?.substrates?.includes("chothf")) {
    push("pur-4 与 pur-10 应以 10-甲酰THF 为底物");
  }

  const p7 = d.steps.find((x) => x.id === "pur-7");
  if (!p7?.substrates?.includes("co2")) push("pur-7 应以 CO₂ 为底物（C6 来源）");

  // 4) IMP 分叉与 AMP / GMP 两条支路
  const impProduct = d.steps.filter((x) => x.products.includes("imp")).map((x) => x.id);
  if (!impProduct.includes("pur-11")) push("pur-11 应生成 IMP");
  const ampSteps = ["pur-12", "pur-13"];
  const gmpSteps = ["pur-14", "pur-15"];
  for (const id of [...ampSteps, ...gmpSteps]) {
    const step = d.steps.find((x) => x.id === id);
    if (!step) push(`缺少步骤 ${id}`);
  }
  const p12 = d.steps.find((x) => x.id === "pur-12");
  const p13 = d.steps.find((x) => x.id === "pur-13");
  const p14 = d.steps.find((x) => x.id === "pur-14");
  const p15 = d.steps.find((x) => x.id === "pur-15");
  if (!p12?.substrates?.includes("gtp")) push("pur-12（AMP 支路）应消耗 GTP");
  if (!p12?.substrates?.includes("imp")) push("pur-12 应以 IMP 为起点");
  if (!p13?.substrates?.includes("asuc")) push("pur-13 应以腺苷酸琥珀酸为底物");
  if (!p14?.substrates?.includes("imp")) push("pur-14 应以 IMP 为起点（IMP 分叉）");
  if (!p15?.substrates?.includes("xmp")) push("pur-15 应以 XMP 为底物");
  if (!p13?.products?.includes("amp") || !p13?.products?.includes("fum")) push("pur-13 应生成 AMP + 延胡索酸");
  if (!p14?.substrates?.includes("nad") || !p14?.products?.includes("nadh")) push("pur-14 应用 NAD⁺ 生成 NADH");
  if (!p14?.irreversible) push("pur-14（IMPDH）应标为不可逆");
  if (!p15?.substrates?.includes("atp")) push("pur-15（GMP 支路）应消耗 ATP");
  if (!p15?.products?.includes("gmp")) push("pur-15 应生成 GMP");
  if (p9HasFum(d) === false) push("pur-9 应释放延胡索酸");

  // 5) 关键 EC 固定表（pur-1 … pur-15 全部按教材章级核对）
  const EC_FIXED = {
    "pur-1": "2.7.6.1",
    "pur-2": "2.4.2.14",
    "pur-3": "6.3.4.13",
    "pur-4": "2.1.2.2",
    "pur-5": "6.3.5.3",
    "pur-6": "6.3.3.1",
    "pur-7": "4.1.1.21",
    "pur-8": "6.3.2.6",
    "pur-9": "4.3.2.2",
    "pur-10": "2.1.2.3",
    "pur-11": "3.5.4.10",
    "pur-12": "6.3.4.4",
    "pur-13": "4.3.2.2",
    "pur-14": "1.1.1.205",
    "pur-15": "6.3.5.2",
  };
  for (const [id, ec] of Object.entries(EC_FIXED)) {
    const st = d.steps.find((x) => x.id === id);
    if (st?.enzyme?.ec !== ec) push(`${id} 的 EC 应为 ${ec}，实际 ${st?.enzyme?.ec}`);
  }

  // 6) 实体：唯一、齐全、所有底物 / 产物都有实体
  const eIds = d.entities.map((e) => e.id);
  if (new Set(eIds).size !== eIds.length) push("entities 存在重复 id");
  for (const need of [
    "r5p", "prpp", "gln", "glu", "ppi", "pra", "gly", "gar", "fgar", "thf", "chothf",
    "fgam", "adp", "pi", "atp", "air", "co2", "cair", "asp", "saicar", "aicar", "fum",
    "faicar", "imp", "gtp", "gdp", "asuc", "amp", "nad", "nadh", "xmp", "gmp", "h2o",
  ]) {
    if (!eIds.includes(need)) push(`entities 缺 ${need}`);
  }
  for (const step of d.steps) {
    for (const m of [...step.substrates, ...step.products]) {
      if (!eIds.includes(m)) push(`${step.id} 引用了不存在的实体 ${m}`);
    }
  }

  // 7) 图例 / 导读 / 页脚
  if (!(d.legend?.length >= 5)) push("legend 应至少 5 项");
  if (!(d.readingGuide?.paragraphs?.length >= 4)) push("导读段落应至少 4 段");
  if (!(d.posterFoot?.length >= 4)) push("posterFoot 应至少 4 行");
  const foot = d.posterFoot.join("\n");
  if (!/嘌呤环原子来源/.test(foot)) push("posterFoot 应写明嘌呤环原子来源");
  if (!/ppp-n1/.test(foot)) push("posterFoot 应写明 PRPP / PPP 接口 ppp-n1");
  if (!/oc-3|一碳池/.test(foot)) push("posterFoot 应写一碳池接口 oc-3");
  if (!/IMP/.test(foot) || !/AMP/.test(foot) || !/GMP/.test(foot)) push("posterFoot 应写明 IMP 是 AMP / GMP 共同前体");
  if (!/补救/.test(foot) || !/未建/.test(foot)) push("posterFoot 应写明补救途径只作注记、本平台未建");
  if (!d.posterFoot.some((t) => t.includes("教材依据") && t.includes("第 9 版"))) {
    push("posterFoot 应含教材依据（书名 + 版次 + 章节名）");
  }

  // 8) 全部 2D：threeD 固定 not-built，不登记 PDB，不写页码 / 真题
  if (d.threeD?.status !== "not-built") push(`threeD.status 应为 not-built，实际 ${d.threeD?.status}`);
  if (!d.threeD?.note?.includes("2D") || !d.threeD?.note?.includes("PDB")) push("threeD.note 应写明只做 2D、不登记 PDB");
  const blob = JSON.stringify(d) + JSON.stringify(s);
  if (/pdbId|pdb_id|candidatePdb|pdbCandidates/i.test(blob)) push("数据里出现 PDB 候选字段");
  if (blob.includes("待结构核验")) push("数据里出现「待结构核验」占位");
  if (/第\s*\d+\s*页|真题\s*\d{4}|20\d{2}\s*年真题/.test(blob)) push("数据里出现页码或真题年份");
  if (d.transportSteps?.length) push("嘌呤图是单区室，不应有运输段");

  // 9) 接口：只登记 ppp-n1 与 oc-3，且都真实存在
  const known = new Set();
  for (const file of ["src/data/ppp/ppp.json", "src/data/one-carbon/one-carbon.json", "src/data/purine/purine.json"]) {
    const src = read(file);
    for (const st of src.steps ?? []) known.add(st.id);
    for (const st of src.sideBranchSteps ?? []) known.add(st.id);
  }
  const ifaceIds = (d.interfaces ?? []).map((x) => x.stepId).sort();
  if (ifaceIds.join(",") !== "oc-3,ppp-n1") push(`interfaces 应只有 ppp-n1 / oc-3，实际 ${ifaceIds.join(",") || "无"}`);
  for (const it of d.interfaces ?? []) {
    if (!known.has(it.stepId)) push(`接口 stepId 不存在：${it.stepId}`);
    if (!it.label || !it.note) push(`接口 ${it.stepId} 缺 label/note`);
  }
  const idx = readFileSync(join(ROOT, "src/data/stepIndex.ts"), "utf8");
  if (!/id: "purine".*route: "\/pathway\/purine"/.test(idx)) push("stepIndex 未登记 purine 路由");

  // 10) 骨架节点：唯一、都在 cyto 内、实体存在
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
  if (s.nodes.length !== 29) push(`节点数应为 29，实际 ${s.nodes.length}`);

  // 11) 连线：端点存在、stepId 真实；每步至少一条 main 边 + 一个带 stepId 节点
  const stepIds = new Set(d.steps.map((x) => x.id));
  for (const l of s.links) {
    if (!nIds.includes(l.from) || !nIds.includes(l.to)) push(`连线端点不存在：${l.from}→${l.to}`);
    if (l.stepId && !stepIds.has(l.stepId)) push(`连线 ${l.from}→${l.to} 的 stepId 不存在：${l.stepId}`);
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

  // 12) 2D 资产：14 个新资产存在，provenance 写明 2D-only / 不建 3D
  const ASSETS = ["pra", "gar", "fgar", "fgam", "air", "cair", "saicar", "aicar", "faicar", "imp", "amp", "gmp", "xmp", "asuc"];
  for (const id of ASSETS) {
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
  for (const id of ["r5p", "prpp", "gly", "gln", "glu", "fum", "co2"]) {
    if (!exists(`public/assets/structures/2d/${id}.json`)) push(`复用资产缺失：${id}`);
  }
  return out;
}

function p9HasFum(d) {
  return d.steps.find((x) => x.id === "pur-9")?.products?.includes("fum") ?? false;
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
negative("改错 pur-2 的 EC", (d) => { d.steps[1].enzyme.ec = "1.1.1.1"; });
negative("删掉 pur-2 的 main 边", (d, s) => { s.links = s.links.filter((l) => !(l.stepId === "pur-2" && l.type === "main")); });
negative("把 threeD 改成 built", (d) => { d.threeD.status = "built"; });
negative("伪造接口 hgprt-1", (d) => { d.interfaces.push({ stepId: "hgprt-1", label: "伪造", note: "伪造" }); });
negative("删掉 ppp-n1 接口", (d) => { d.interfaces = d.interfaces.filter((x) => x.stepId !== "ppp-n1"); });
negative("把节点挪出区室", (d, s) => { s.nodes[0].x = 10; });
negative("让 IMP 不再分叉（删 pur-14 的 IMP 底物）", (d) => { d.steps[13].substrates = ["nad", "h2o"]; });
negative("把 pur-12 的 GTP 换成 ATP", (d) => { d.steps[11].substrates = ["imp", "asp", "atp"]; });
negative("给 ΔG 填数值", (d) => { d.steps[0].deltaG.standard = -30; });
negative("写页码", (d) => { d.posterFoot.push("见第 123 页。"); });
negative("登记 PDB", (d) => { d.threeD.pdbId = "1ABC"; });

if (errors.length === 0) {
  console.log("✓ 嘌呤核苷酸挂图数据校验通过");
  console.log(`  步骤 ${data.steps.length} / 区室 ${skel.compartments.length} / 节点 ${skel.nodes.length} / 接口 ${data.interfaces.length} / 资产 14+7 复用`);
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
  console.log("✗ 嘌呤核苷酸挂图数据校验失败：");
  for (const e of errors) console.log(`  - ${e}`);
  process.exit(1);
}
