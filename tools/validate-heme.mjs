// 血红素代谢挂图（PLATE 19 · SF-19）数据层校验。
// 口径：10 步（合成 8 + 降解 2）、4 区室（线粒体起始 / 胞质 / 线粒体末端 / 内质网）、14 节点；全部 2D。
// 除正向校验外，脚本自带负例（改坏数据后必须报错），防止校验器本身失效。
// 用法：node tools/validate-heme.mjs
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => JSON.parse(readFileSync(join(ROOT, p), "utf8"));

const data = read("src/data/heme/heme.json");
const skel = read("src/data/heme/skeleton.json");

const errors = [];
const err = (m) => errors.push(m);

const STEP_IDS = ["heme-1", "heme-2", "heme-3", "heme-4", "heme-5", "heme-6", "heme-7", "heme-8", "heme-9", "heme-10"];
const COMPARTMENT_OF = {
  "heme-1": "mito-1",
  "heme-2": "cyto",
  "heme-3": "cyto",
  "heme-4": "cyto",
  "heme-5": "cyto",
  "heme-6": "mito-2",
  "heme-7": "mito-2",
  "heme-8": "mito-2",
  "heme-9": "er",
  "heme-10": "cyto",
};
const EC = {
  "heme-1": "2.3.1.37",
  "heme-2": "4.2.1.24",
  "heme-3": "2.5.1.61",
  "heme-4": "4.2.1.75",
  "heme-5": "4.1.1.37",
  "heme-6": "1.3.3.3",
  "heme-7": "1.3.3.4",
  "heme-8": "4.99.1.1",
  "heme-9": "1.14.99.3",
  "heme-10": "1.3.1.24",
};
const IRREVERSIBLE = {
  "heme-1": true,
  "heme-2": false,
  "heme-3": false,
  "heme-4": false,
  "heme-5": false,
  "heme-6": true,
  "heme-7": true,
  "heme-8": true,
  "heme-9": true,
  "heme-10": false,
};
const ENTITIES = ["gly", "succoa", "ala5", "pbg", "hmb", "uro3", "copro3", "ppg9", "proto9", "heme", "fe2", "biliverdin", "bilirubin"];

function validate(d, s) {
  const out = [];
  const push = (m) => out.push(m);

  // 1) 步骤：10 步、id / 序号连续、必填字段齐全
  if (d.steps.length !== 10) push(`步骤数应为 10，实际 ${d.steps.length}`);
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

  // 2) 区室：线粒体起始 → 胞质中段 → 线粒体末端 → 内质网降解
  for (const step of d.steps) {
    const want = COMPARTMENT_OF[step.id];
    if (want && step.compartment !== want) push(`${step.id} 应在 ${want}，实际 ${step.compartment}`);
  }

  // 3) 方向与 EC
  for (const step of d.steps) {
    if (typeof IRREVERSIBLE[step.id] === "boolean" && step.irreversible !== IRREVERSIBLE[step.id]) {
      push(`${step.id} 的 irreversible 应为 ${IRREVERSIBLE[step.id]}，实际 ${step.irreversible}`);
    }
    if (EC[step.id] && step.enzyme?.ec !== EC[step.id]) {
      push(`${step.id} 的 EC 应为 ${EC[step.id]}，实际 ${step.enzyme?.ec}`);
    }
  }

  // 4) 限速与反馈抑制必须写明
  const h1 = d.steps.find((x) => x.id === "heme-1");
  if (!/限速/.test(`${h1?.significance ?? ""}${h1?.deltaG?.qualitative ?? ""}`)) push("heme-1 应写明限速步");
  if (!/反馈抑制/.test(`${h1?.significance ?? ""}`)) push("heme-1 应写明受血红素反馈抑制");
  if (!h1?.cofactors?.some((c) => /PLP|磷酸吡哆醛/.test(c))) push("heme-1 应把 PLP 记为辅因子");
  if (!h1?.substrates?.includes("gly") || !h1?.substrates?.includes("succoa")) {
    push("heme-1 的底物应为甘氨酸 + 琥珀酰-CoA");
  }

  // 5) 降解段：HO → 胆绿素 → BVR → 胆红素；葡萄糖醛酸结合只作说明
  const h9 = d.steps.find((x) => x.id === "heme-9");
  const h10 = d.steps.find((x) => x.id === "heme-10");
  if (!h9?.products?.includes("biliverdin")) push("heme-9 应生成胆绿素");
  if (!h10?.products?.includes("bilirubin")) push("heme-10 应生成胆红素");
  if (d.steps.some((x) => /葡萄糖醛酸/.test(x.equation))) push("葡萄糖醛酸结合不应展开成步骤");
  if (!d.posterFoot.some((t) => t.includes("葡萄糖醛酸") && t.includes("不计步"))) {
    push("posterFoot 应写明葡萄糖醛酸结合与排胆汁不计步");
  }

  // 6) 卟啉症点到为止：写酶缺陷归类，不写病例细节
  if (!d.posterFoot.some((t) => t.includes("卟啉症") && t.includes("酶缺陷"))) push("posterFoot 应写卟啉症按酶缺陷归类");
  const blob0 = JSON.stringify(d);
  if (/治疗方案[:：]|病例报告[:：]|发病率[:：]?\d/.test(blob0)) push("数据里出现具体病例细节");

  // 7) 实体唯一且齐全
  const eIds = d.entities.map((e) => e.id);
  if (new Set(eIds).size !== eIds.length) push("entities 存在重复 id");
  for (const need of ENTITIES) if (!eIds.includes(need)) push(`entities 缺 ${need}`);
  if (d.entities.length !== ENTITIES.length) push(`entities 数应为 ${ENTITIES.length}，实际 ${d.entities.length}`);

  // 8) 图例 / 导读 / 页脚 / 教材依据
  if (!(d.legend?.length >= 4)) push("legend 不足 4 项");
  if (!d.readingGuide?.paragraphs?.length) push("缺导读段落");
  if (!(d.posterFoot?.length >= 2)) push("posterFoot 应至少 2 行");
  if (!d.posterFoot.some((t) => t.includes("线粒体") && t.includes("胞质") && t.includes("内质网"))) {
    push("posterFoot 应写清合成与降解的区室顺序");
  }

  // 9) 全部 2D：不登记 PDB、不写页码 / 真题
  if (d.threeD?.status !== "not-built") push(`threeD.status 应为 not-built，实际 ${d.threeD?.status}`);
  if (!d.threeD?.note?.includes("2D") || !d.threeD?.note?.includes("PDB")) push("threeD.note 应写明只做 2D、不登记 PDB");
  const blob = blob0 + JSON.stringify(s);
  if (/pdbId|pdb_id|candidatePdb|pdbCandidates/i.test(blob)) push("数据里出现 PDB 候选字段");
  if (blob.includes("待结构核验")) push("数据里出现「待结构核验」占位");
  if (/第\s*\d+\s*页|真题\s*\d{4}|20\d{2}\s*年真题/.test(blob)) push("数据里出现页码或真题年份");
  if (/版\s*\d/.test(blob) && !d.posterFoot.some((t) => t.includes("第 9 版"))) push("教材版次应统一写在 posterFoot");

  // 10) 无运输段
  if ((d.transportSteps ?? []).length !== 0) push("血红素图不应登记运输段（跨膜只画区室）");
  if ((s.transportSteps ?? []).length !== 0) push("骨架不应有运输段");

  // 11) 接口：只登记两端都真实存在的节点；只挂 tca-4 与 oc-1
  const known = new Set();
  for (const file of ["src/data/tca.json", "src/data/one-carbon/one-carbon.json"]) {
    const src = read(file);
    for (const st of src.steps ?? []) known.add(st.id);
    for (const st of src.sideBranchSteps ?? []) known.add(st.id);
  }
  const ifaceIds = (d.interfaces ?? []).map((it) => it.stepId).sort();
  if (ifaceIds.join(",") !== "oc-1,tca-4") push(`接口应只含 tca-4 与 oc-1，实际 ${ifaceIds.join(",")}`);
  for (const it of d.interfaces ?? []) {
    if (!known.has(it.stepId)) push(`接口 stepId 不存在：${it.stepId}`);
    if (!it.label || !it.note) push(`接口 ${it.stepId} 缺 label/note`);
  }
  if (ifaceIds.includes("ch-13")) push("血红素图不应挂 ch-13");

  // 12) 骨架：4 区室
  if (s.compartments?.length !== 4) push(`区室应为 4 个，实际 ${s.compartments?.length}`);
  const compIds = (s.compartments ?? []).map((c) => c.id);
  if (compIds.join(",") !== "cyto,mito-1,mito-2,er") push(`区室 id 应为 cyto,mito-1,mito-2,er，实际 ${compIds.join(",")}`);

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
  if (s.nodes.length !== 14) push(`节点数应为 14，实际 ${s.nodes.length}`);

  // 14) 连线：端点存在、stepId 真实、无 transport
  const stepSet = new Set(d.steps.map((x) => x.id));
  for (const l of s.links) {
    if (!nIds.includes(l.from) || !nIds.includes(l.to)) push(`连线端点不存在：${l.from}→${l.to}`);
    if (l.stepId && !stepSet.has(l.stepId)) push(`连线 stepId 不存在：${l.stepId}`);
    if (l.type === "transport") push(`血红素图不应有 transport 连线：${l.from}→${l.to}`);
    if (!l.stepId && !["feed"].includes(l.type)) push(`连线缺 stepId：${l.from}→${l.to}（${l.type}）`);
  }
  if (s.links.length !== 13) push(`连线数应为 13，实际 ${s.links.length}`);

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

  return out;
}

for (const m of validate(data, skel)) err(m);

// ---------- 负例：改坏后必须报错 ----------
const clone = (x) => JSON.parse(JSON.stringify(x));
const NEGATIVES = [
  ["步骤序号断裂", (d) => { d.steps[2].index = 7; }],
  ["节点越出区室", (d, s) => { s.nodes[0].x = 12; }],
  ["连线指向不存在节点", (d, s) => { s.links[0].to = "nope"; }],
  ["某步缺主链", (d, s) => { s.links = s.links.filter((l) => !(l.stepId === "heme-6" && l.type === "main")); }],
  ["ΔG 出现数值", (d) => { d.steps[0].deltaG.standard = -20; }],
  ["threeD 被写成已建", (d) => { d.threeD.status = "built"; }],
  ["登记 PDB 候选", (d) => { d.entities[0].pdbId = "1ABC"; }],
  ["接口指向不存在的步骤", (d) => { d.interfaces[0].stepId = "tca-99"; }],
  ["接口挂了 ch-13", (d) => { d.interfaces.push({ stepId: "ch-13", label: "x", note: "y" }); }],
  ["限速步被改成可逆", (d) => { const st = d.steps.find((x) => x.id === "heme-1"); st.irreversible = false; }],
  ["EC 写错", (d) => { const st = d.steps.find((x) => x.id === "heme-8"); st.enzyme.ec = "4.99.1.9"; }],
  ["区室写错（ALA 合酶被放进胞质）", (d) => { const st = d.steps.find((x) => x.id === "heme-1"); st.compartment = "cyto"; }],
  ["新增运输段", (d, s) => { s.transportSteps = [{ id: "heme-t1", name: "x", from: "a", via: "b", to: "c", note: "不计入步数" }]; }],
];
for (const [label, mutate] of NEGATIVES) {
  const d = clone(data);
  const s = clone(skel);
  mutate(d, s);
  if (!validate(d, s).length) err(`负例未被拦下：${label}`);
}

if (errors.length) {
  console.error(`validate-heme FAIL：${errors.length} 项`);
  for (const m of errors) console.error(`  - ${m}`);
  process.exit(1);
}
console.log(
  `validate-heme PASS：10 步（合成 8 + 降解 2）｜4 区室｜${skel.nodes.length} 节点｜${skel.links.length} 连线｜` +
    `接口 ${data.interfaces.length} 条（tca-4 / oc-1）｜2D-only｜负例 ${NEGATIVES.length} 组全部拦下｜无 PDB / 无「待结构核验」`,
);
