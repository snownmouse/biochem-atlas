// 胆汁酸代谢挂图（PLATE 20 · SF-20）数据层校验。
// 口径：6 步（内质网 3 + 线粒体 1 + 过氧化物酶体 2）+ 1 段肠肝循环运输；4 区室；11 节点；全部 2D。
// 除正向校验外，脚本自带负例（改坏数据后必须报错），防止校验器本身失效。
// 用法：node tools/validate-bile.mjs
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => JSON.parse(readFileSync(join(ROOT, p), "utf8"));

const data = read("src/data/bile-acid/bile-acid.json");
const skel = read("src/data/bile-acid/skeleton.json");

const errors = [];
const err = (m) => errors.push(m);

const STEP_IDS = ["bile-1", "bile-2", "bile-3", "bile-4", "bile-5", "bile-6"];
const COMPARTMENT_OF = {
  "bile-1": "er",
  "bile-2": "er",
  "bile-3": "er",
  "bile-4": "mito",
  "bile-5": "perox",
  "bile-6": "perox",
};
const EC = {
  "bile-1": "1.14.14.23",
  "bile-2": "未核实",
  "bile-3": "未核实",
  "bile-4": "未核实",
  "bile-5": "未核实",
  "bile-6": "2.3.1.65",
};
const IRREVERSIBLE = {
  "bile-1": true,
  "bile-2": false,
  "bile-3": true,
  "bile-4": false,
  "bile-5": true,
  "bile-6": false,
};
const ENTITIES = [
  "chol", "c7ol", "c7one", "c7diol", "ca_pre", "ca_coa", "cdca_coa", "ca", "cdca",
  "gca", "tca_bile", "gly", "tau", "bile", "gut", "portal",
];

function validate(d, s) {
  const out = [];
  const push = (m) => out.push(m);

  // 1) 步骤：6 步、id / 序号连续、必填字段齐全
  if (d.steps.length !== 6) push(`步骤数应为 6，实际 ${d.steps.length}`);
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

  // 2) 区室：内质网 → 线粒体 → 过氧化物酶体
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

  // 4) 起点是胆固醇，CYP7A1 限速，且不与胆固醇合成混图
  const b1 = d.steps.find((x) => x.id === "bile-1");
  if (!b1?.substrates?.includes("chol")) push("bile-1 的底物应为胆固醇");
  if (!/限速/.test(`${b1?.significance ?? ""}${b1?.deltaG?.qualitative ?? ""}`)) push("bile-1 应写明限速步");
  if (!/CYP7A1/.test(b1?.enzyme?.isozyme ?? "")) push("bile-1 的同工酶应写 CYP7A1");
  if (!d.posterFoot.some((t) => t.includes("转化支路") && t.includes("ch-13"))) {
    push("posterFoot 应写明这是胆固醇转化支路、起点接 ch-13");
  }
  if (!d.readingGuide.paragraphs.some((p) => p.includes("转化支路"))) push("导读应写明这是胆固醇的转化支路");
  if (d.steps.some((x) => /HMG-CoA|甲羟戊酸/.test(`${x.name}${x.equation}`))) push("不应把胆固醇合成步骤画进本图");

  // 5) 分支：CYP8B1 决定 CA / CDCA
  const b3 = d.steps.find((x) => x.id === "bile-3");
  if (!/CYP8B1/.test(b3?.enzyme?.isozyme ?? "")) push("bile-3 的同工酶应写 CYP8B1");
  if (!/胆酸|CDCA|鹅脱氧胆酸/.test(`${b3?.significance ?? ""}`)) push("bile-3 应写明胆酸 / 鹅脱氧胆酸分支");

  // 6) 结合与肠肝循环
  const b6 = d.steps.find((x) => x.id === "bile-6");
  if (!/BAAT/.test(b6?.enzyme?.isozyme ?? "")) push("bile-6 的同工酶应写 BAAT");
  if (!b6?.substrates?.includes("gly") || !b6?.substrates?.includes("tau")) push("bile-6 应把甘氨酸与牛磺酸记为底物");
  if (!b6?.products?.includes("gca") || !b6?.products?.includes("tca_bile")) push("bile-6 应生成甘氨胆酸与牛磺胆酸");
  if (!/溶解度/.test(`${b6?.significance ?? ""}`)) push("bile-6 应写明结合提高溶解度");
  if (!d.posterFoot.some((t) => t.includes("FXR") && t.includes("FGF19"))) push("posterFoot 应一句话带过 FXR–FGF19 负反馈");

  // 7) 实体唯一且齐全
  const eIds = d.entities.map((e) => e.id);
  if (new Set(eIds).size !== eIds.length) push("entities 存在重复 id");
  for (const need of ENTITIES) if (!eIds.includes(need)) push(`entities 缺 ${need}`);
  if (d.entities.length !== ENTITIES.length) push(`entities 数应为 ${ENTITIES.length}，实际 ${d.entities.length}`);

  // 8) 图例 / 导读 / 页脚 / 教材依据
  if (!(d.legend?.length >= 4)) push("legend 不足 4 项");
  if (!d.readingGuide?.paragraphs?.length) push("缺导读段落");
  if (!(d.posterFoot?.length >= 2)) push("posterFoot 应至少 2 行");
  if (!d.posterFoot.some((t) => t.includes("教材依据") && t.includes("第 9 版"))) push("posterFoot 应写教材依据（书名 + 版次 + 章节名）");

  // 9) 全部 2D：不登记 PDB、不写页码 / 真题
  if (d.threeD?.status !== "not-built") push(`threeD.status 应为 not-built，实际 ${d.threeD?.status}`);
  if (!d.threeD?.note?.includes("2D") || !d.threeD?.note?.includes("PDB")) push("threeD.note 应写明只做 2D、不登记 PDB");
  const blob = JSON.stringify(d) + JSON.stringify(s);
  if (/pdbId|pdb_id|candidatePdb|pdbCandidates/i.test(blob)) push("数据里出现 PDB 候选字段");
  if (blob.includes("待结构核验")) push("数据里出现「待结构核验」占位");
  if (/第\s*\d+\s*页|真题\s*\d{4}|20\d{2}\s*年真题/.test(blob)) push("数据里出现页码或真题年份");

  // 10) 运输段：1 段 bile-t1，数据与骨架一致
  const dt = (d.transportSteps ?? []).map((t) => t.id);
  const st = (s.transportSteps ?? []).map((t) => t.id);
  if (dt.length !== 1 || dt[0] !== "bile-t1") push(`数据层运输段应为 1 段 bile-t1，实际 ${dt.join(",") || "无"}`);
  if (st.join(",") !== dt.join(",")) push(`骨架运输段应与数据层一致：数据 ${dt.join(",")} / 骨架 ${st.join(",")}`);
  const tr = (s.transportSteps ?? [])[0];
  if (tr) {
    if (!tr.from || !tr.to || !tr.via || !tr.note) push("运输段缺 from/to/via/note");
    if (!tr.note.includes("不计入")) push("运输段应说明不计入步数");
  }

  // 11) 接口：只指向真实存在的既有步骤（ch-13 / oc-1）
  const known = new Set();
  for (const file of ["src/data/cholesterol/cholesterol.json", "src/data/one-carbon/one-carbon.json"]) {
    const src = read(file);
    for (const x of src.steps ?? []) known.add(x.id);
    for (const x of src.sideBranchSteps ?? []) known.add(x.id);
  }
  const ifaceIds = (d.interfaces ?? []).map((it) => it.stepId).sort();
  if (ifaceIds.join(",") !== "ch-13,oc-1") push(`接口应只含 ch-13 与 oc-1，实际 ${ifaceIds.join(",")}`);
  for (const it of d.interfaces ?? []) {
    if (!known.has(it.stepId)) push(`接口 stepId 不存在：${it.stepId}`);
    if (!it.label || !it.note) push(`接口 ${it.stepId} 缺 label/note`);
  }

  // 12) 骨架：4 区室
  if (s.compartments?.length !== 4) push(`区室应为 4 个，实际 ${s.compartments?.length}`);
  const compIds = (s.compartments ?? []).map((c) => c.id);
  if (compIds.join(",") !== "er,mito,perox,entero") push(`区室 id 应为 er,mito,perox,entero，实际 ${compIds.join(",")}`);

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
  if (s.nodes.length !== 11) push(`节点数应为 11，实际 ${s.nodes.length}`);

  // 14) 连线：端点存在、stepId 真实、transport 指向 bile-t1
  const stepSet = new Set(d.steps.map((x) => x.id));
  const transportIds = new Set(dt);
  for (const l of s.links) {
    if (!nIds.includes(l.from) || !nIds.includes(l.to)) push(`连线端点不存在：${l.from}→${l.to}`);
    if (l.stepId && !stepSet.has(l.stepId) && !transportIds.has(l.stepId)) push(`连线 stepId 不存在：${l.stepId}`);
    if (l.type === "transport" && !transportIds.has(l.stepId)) push(`transport 连线应指向 bile-t1：${l.from}→${l.to}`);
    if (!l.stepId && !["feed"].includes(l.type)) push(`连线缺 stepId：${l.from}→${l.to}（${l.type}）`);
  }
  if (s.links.length !== 11) push(`连线数应为 11，实际 ${s.links.length}`);
  if (s.links.filter((l) => l.type === "transport").length !== 4) push("肠肝循环应有 4 条运输连线");

  // 15) 每步有可点击链且主链端点落在底物 / 产物
  for (const step of d.steps) {
    const clickable = s.links.filter((l) => l.stepId === step.id && l.type !== "transport");
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
  ["某步缺主链", (d, s) => { s.links = s.links.filter((l) => !(l.stepId === "bile-5" && l.type === "main")); }],
  ["ΔG 出现数值", (d) => { d.steps[0].deltaG.standard = -20; }],
  ["threeD 被写成已建", (d) => { d.threeD.status = "built"; }],
  ["登记 PDB 候选", (d) => { d.entities[0].pdbId = "1ABC"; }],
  ["接口指向不存在的步骤", (d) => { d.interfaces[0].stepId = "ch-99"; }],
  ["去掉 ch-13 接口", (d) => { d.interfaces = d.interfaces.filter((it) => it.stepId !== "ch-13"); }],
  ["运输段 id 不一致", (d, s) => { s.transportSteps[0].id = "bile-t2"; }],
  ["CYP7A1 被改成可逆", (d) => { const st = d.steps.find((x) => x.id === "bile-1"); st.irreversible = false; }],
  ["EC 编造", (d) => { const st = d.steps.find((x) => x.id === "bile-2"); st.enzyme.ec = "1.1.1.1"; }],
  ["混入胆固醇合成步骤", (d) => { d.steps[0].name = "HMG-CoA 还原酶步骤"; }],
];
for (const [label, mutate] of NEGATIVES) {
  const d = clone(data);
  const s = clone(skel);
  mutate(d, s);
  if (!validate(d, s).length) err(`负例未被拦下：${label}`);
}

if (errors.length) {
  console.error(`validate-bile FAIL：${errors.length} 项`);
  for (const m of errors) console.error(`  - ${m}`);
  process.exit(1);
}
console.log(
  `validate-bile PASS：6 步（内质网 3 + 线粒体 1 + 过氧化物酶体 2）｜4 区室｜${skel.nodes.length} 节点｜${skel.links.length} 连线｜` +
    `运输 1 段｜接口 ${data.interfaces.length} 条（ch-13 / oc-1）｜2D-only｜负例 ${NEGATIVES.length} 组全部拦下｜无 PDB / 无「待结构核验」`,
);
