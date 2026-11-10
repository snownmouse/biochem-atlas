// 氧化还原与自由基挂图（PLATE 22 · SF-22）数据层校验。
// 口径：不是经典代谢通路，是「ROS 产生 → 清除 → NADPH–GSH 再生」的防御网络；6 步；
// 2 区室（线粒体 / 胞质）；10 节点；8 连线；不展开信号转导；全部 2D。
// 除正向校验外，脚本自带负例（改坏数据后必须报错），防止校验器本身失效。
// 用法：node tools/validate-redox.mjs
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => JSON.parse(readFileSync(join(ROOT, p), "utf8"));

const data = read("src/data/redox/redox.json");
const skel = read("src/data/redox/skeleton.json");

const errors = [];
const STEP_IDS = ["rd-1", "rd-2", "rd-3", "rd-4", "rd-5", "rd-6"];
const COMPARTMENT_OF = {
  "rd-1": "mito",
  "rd-2": "mito",
  "rd-3": "mito",
  "rd-4": "cyto",
  "rd-5": "cyto",
  "rd-6": "cyto",
};
const EC = { "rd-1": "未核实", "rd-2": "1.15.1.1", "rd-3": "未核实", "rd-4": "1.8.1.7", "rd-5": "未核实", "rd-6": "未核实" };
const IRREVERSIBLE = { "rd-1": true, "rd-2": true, "rd-3": true, "rd-4": false, "rd-5": true, "rd-6": true };
const ENTITIES = ["o2", "o2m", "h2o2", "h2o", "gsh", "gssg", "nadph", "nadp", "prec", "g6p"];

function validate(d, s) {
  const out = [];
  const push = (m) => out.push(m);

  // 1) 步数上限 6：小图，不许扩张
  if (d.steps.length !== 6) push(`步骤数应为 6（上限 6），实际 ${d.steps.length}`);
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

  // 2) 区室：线粒体 ROS → 胞质 GSH / NADPH
  for (const step of d.steps) {
    if (COMPARTMENT_OF[step.id] && step.compartment !== COMPARTMENT_OF[step.id]) {
      push(`${step.id} 应在 ${COMPARTMENT_OF[step.id]}，实际 ${step.compartment}`);
    }
  }

  // 3) 方向与 EC
  for (const step of d.steps) {
    if (typeof IRREVERSIBLE[step.id] === "boolean" && step.irreversible !== IRREVERSIBLE[step.id]) {
      push(`${step.id} 的 irreversible 应为 ${IRREVERSIBLE[step.id]}，实际 ${step.irreversible}`);
    }
    if (step.enzyme?.ec !== EC[step.id]) push(`${step.id} 的 EC 应为 ${EC[step.id]}，实际 ${step.enzyme?.ec}`);
  }

  // 4) 主干顺序：产生 → 歧化 → 清除 → GSH 再生 → GSH 合成 → NADPH 再生
  const order = [
    ["rd-1", "o2", "o2m"],
    ["rd-2", "o2m", "h2o2"],
    ["rd-3", "h2o2", "h2o"],
    ["rd-4", "gssg", "gsh"],
    ["rd-5", "prec", "gsh"],
    ["rd-6", "g6p", "nadph"],
  ];
  for (const [id, sub, prod] of order) {
    const st = d.steps.find((x) => x.id === id);
    if (!st?.substrates.includes(sub)) push(`${id} 的底物应含 ${sub}`);
    if (!st?.products.includes(prod)) push(`${id} 的产物应含 ${prod}`);
  }
  if (!d.steps.find((x) => x.id === "rd-3")?.substrates.includes("gsh")) push("rd-3 的 GPX 路线应把 GSH 列为底物");
  if (!d.steps.find((x) => x.id === "rd-4")?.substrates.includes("nadph")) push("rd-4 应用 NADPH 作供氢体");

  // 5) 身份：必须写明不属于经典代谢通路、是防御网络，且不扩成信号转导
  const identity = `${d.summary} ${d.heroNote} ${d.posterFoot.join(" ")} ${d.readingGuide.paragraphs.join(" ")}`;
  if (!identity.includes("防御网络")) push("缺少「防御网络」的定位声明");
  if (!identity.includes("不属于经典代谢通路")) push("必须写明「不属于经典代谢通路」");
  if (!identity.includes("信号转导")) push("必须写明不展开信号转导");
  if (d.steps.some((x) => /Nrf2|信号转导|磷酸化级联|受体/.test(`${x.name}${x.significance}`))) {
    push("步骤里不应展开 Nrf2 / 信号转导内容");
  }
  if (!d.legend?.length || !d.readingGuide?.paragraphs?.length || !(d.posterFoot?.length >= 2)) {
    push("legend / 导读 / posterFoot 不完整");
  }
  if (!d.posterFoot.some((t) => t.includes("教材依据") && t.includes("第 9 版"))) {
    push("posterFoot 应写教材依据（书名 + 版次 + 章节名）");
  }
  if (!s.annotations?.some((a) => a.text.includes("防御网络") && a.text.includes("不属于经典代谢通路"))) {
    push("图上应有一条注释写明「防御网络 / 不属于经典代谢通路」");
  }

  // 6) 全部 2D
  if (d.threeD?.status !== "not-built") push(`threeD.status 应为 not-built，实际 ${d.threeD?.status}`);
  if (!d.threeD?.note?.includes("2D") || !d.threeD?.note?.includes("PDB")) push("threeD.note 应写明只做 2D、不登记 PDB");
  const blob = JSON.stringify(d) + JSON.stringify(s);
  if (/pdbId|pdb_id|candidatePdb|pdbCandidates/i.test(blob)) push("数据里出现 PDB 候选字段");
  if (blob.includes("待结构核验")) push("数据里出现「待结构核验」占位");
  if (/第\s*\d+\s*页|真题\s*\d{4}|20\d{2}\s*年真题/.test(blob)) push("数据里出现页码或真题年份");

  // 7) 无运输段
  if ((d.transportSteps ?? []).length) push("本图不设运输段");
  if ((s.transportSteps ?? []).length) push("骨架不应有运输段");

  // 8) 接口：只指向两端都真实存在的既有步骤
  const sources = ["src/data/glycolysis.json", "src/data/ppp/ppp.json"];
  const known = new Set();
  for (const file of sources) {
    const src = read(file);
    for (const x of src.steps ?? []) known.add(x.id);
    for (const x of src.sideBranchSteps ?? []) known.add(x.id);
  }
  const ifaceIds = (d.interfaces ?? []).map((it) => it.stepId).sort();
  if (ifaceIds.join(",") !== "gk-1,ppp-o1") push(`接口应只含 gk-1 / ppp-o1，实际 ${ifaceIds.join(",")}`);
  for (const it of d.interfaces ?? []) {
    if (!known.has(it.stepId)) push(`接口 stepId 不存在：${it.stepId}`);
    if (!it.label || !it.note) push(`接口 ${it.stepId} 缺 label/note`);
  }
  // 呼吸链只作文字说明，不登记 oxphos 的 step 接口
  if ((d.interfaces ?? []).some((it) => /^oxphos/.test(it.stepId))) {
    push("线粒体呼吸链只作 ROS 来源说明，不应登记 oxphos 的 step 接口");
  }

  // 9) 实体
  const eIds = d.entities.map((e) => e.id);
  if (new Set(eIds).size !== eIds.length) push("entities 存在重复 id");
  for (const need of ENTITIES) if (!eIds.includes(need)) push(`entities 缺 ${need}`);
  if (d.entities.length !== ENTITIES.length) push(`entities 数应为 ${ENTITIES.length}，实际 ${d.entities.length}`);

  // 10) 骨架：2 区室、10 节点、8 连线
  if (s.compartments?.length !== 2) push(`区室应为 2 个，实际 ${s.compartments?.length}`);
  const compIds = (s.compartments ?? []).map((c) => c.id);
  if (compIds.join(",") !== "mito,cyto") push(`区室 id 应为 mito,cyto，实际 ${compIds.join(",")}`);

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
  if (s.nodes.length !== 10) push(`节点数应为 10，实际 ${s.nodes.length}`);

  const stepSet = new Set(d.steps.map((x) => x.id));
  for (const l of s.links) {
    if (!nIds.includes(l.from) || !nIds.includes(l.to)) push(`连线端点不存在：${l.from}→${l.to}`);
    if (!l.stepId) push(`连线缺 stepId：${l.from}→${l.to}`);
    else if (!stepSet.has(l.stepId)) push(`连线 stepId 不存在：${l.stepId}`);
    if (l.type === "transport") push("本图不设运输连线");
  }
  if (s.links.length !== 8) push(`连线数应为 8，实际 ${s.links.length}`);

  // 11) 每步有主链且端点落在底物 / 产物
  const ent = (id) => s.nodes.find((n) => n.id === id)?.entityId;
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
    for (const m of mains) {
      const ok = step.substrates.includes(ent(m.from)) && step.products.includes(ent(m.to));
      if (!ok) push(`${step.id} 主链端点与底物/产物不符：${m.from}→${m.to}（${ent(m.from)}→${ent(m.to)}）`);
    }
  }
  for (const step of d.steps) {
    if (!s.nodes.some((n) => n.stepId === step.id)) push(`${step.id} 没有可点击节点`);
  }

  // 12) 结构对照：6 块与步骤一一对应
  const src = readFileSync(join(ROOT, "src/data/comparisonConfig.ts"), "utf8");
  for (const id of STEP_IDS) if (!src.includes(`stepId: "${id}"`)) push(`comparisonConfig.ts 缺结构块 ${id}`);

  return out;
}

for (const m of validate(data, skel)) errors.push(m);

// ---------- 负例 ----------
const clone = (x) => JSON.parse(JSON.stringify(x));
const NEGATIVES = [
  ["步骤加到 7 步", (d) => { d.steps.push({ ...d.steps[5], id: "rd-7", index: 7 }); }],
  ["去掉「防御网络」声明", (d) => { d.summary = d.summary.replace(/防御网络/g, "代谢通路"); d.heroNote = d.heroNote.replace(/防御网络/g, "代谢通路"); d.posterFoot = d.posterFoot.map((t) => t.replace(/防御网络/g, "代谢通路")); d.readingGuide.paragraphs = d.readingGuide.paragraphs.map((t) => t.replace(/防御网络/g, "代谢通路")); }],
  ["扩成信号转导", (d) => { d.steps[2].name = "Nrf2 信号转导与抗氧化基因转录"; }],
  ["ΔG 出现数值", (d) => { d.steps[1].deltaG.standard = -30; }],
  ["threeD 被写成已建", (d) => { d.threeD.status = "built"; }],
  ["登记 PDB 候选", (d) => { d.entities[0].pdbId = "1ABC"; }],
  ["节点越出区室", (d, s) => { s.nodes[0].y = 60; }],
  ["连线指向不存在节点", (d, s) => { s.links[0].to = "nope"; }],
  ["某步缺主链", (d, s) => { s.links = s.links.filter((l) => !(l.stepId === "rd-5" && l.type === "main")); }],
  ["接口指向不存在的步骤", (d) => { d.interfaces[0].stepId = "ppp-99"; }],
  ["登记 oxphos 接口", (d) => { d.interfaces.push({ stepId: "oxphos-1", label: "呼吸链", note: "x" }); }],
  ["GR 被改成不可逆", (d) => { const st = d.steps.find((x) => x.id === "rd-4"); st.irreversible = true; }],
  ["EC 编造", (d) => { const st = d.steps.find((x) => x.id === "rd-2"); st.enzyme.ec = "1.15.1.99"; }],
  ["删掉 GSH 消耗支路", (d, s) => { s.links = s.links.filter((l) => !(l.stepId === "rd-3" && l.type === "branch")); }],
  ["多画一段运输", (d, s) => { s.transportSteps = [{ id: "rd-t1", name: "x", from: "a", via: "b", to: "c", note: "d" }]; }],
];
for (const [label, mutate] of NEGATIVES) {
  const d = clone(data);
  const s = clone(skel);
  mutate(d, s);
  if (!validate(d, s).length) errors.push(`负例未被拦下：${label}`);
}

if (errors.length) {
  console.error(`validate-redox FAIL：${errors.length} 项`);
  for (const m of errors) console.error(`  - ${m}`);
  process.exit(1);
}
console.log(
  `validate-redox PASS：6 步（线粒体 3 + 胞质 3）｜2 区室｜${skel.nodes.length} 节点｜${skel.links.length} 连线｜` +
    `接口 ${data.interfaces.length} 条（gk-1 / ppp-o1）｜防御网络声明｜2D-only｜负例 ${NEGATIVES.length} 组全部拦下｜无 PDB / 无「待结构核验」`,
);
