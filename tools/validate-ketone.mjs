// 酮体代谢挂图（PLATE 13 · SF-13）数据层校验。
// 口径：6 步（生酮 5 步 + 肝外利用 1 段合并步）+ 1 段血液运输；3 区室；全部 2D（不登记 PDB）。
// 除正向校验外，脚本自带 8 组负例（改坏数据后必须报错），防止校验器本身失效。
// 用法：node tools/validate-ketone.mjs
import { readFileSync, existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => JSON.parse(readFileSync(join(ROOT, p), "utf8"));
const exists = (p) => existsSync(join(ROOT, p));

const data = read("src/data/ketone/ketone.json");
const skel = read("src/data/ketone/skeleton.json");

const errors = [];
const err = (m) => errors.push(m);

// ---------- 数据层 ----------
function validate(d, s) {
  const out = [];
  const push = (m) => out.push(m);

  // 1) 步骤：6 步、id/序号连续、区室合法
  if (d.steps.length !== 6) push(`步骤数应为 6，实际 ${d.steps.length}`);
  const expectIds = ["kt-1", "kt-2", "kt-3", "kt-4", "kt-5", "kt-6"];
  const ids = d.steps.map((x) => x.id);
  if (ids.join(",") !== expectIds.join(",")) push(`步骤 id 应为 ${expectIds.join(",")}，实际 ${ids.join(",")}`);
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

  // 2) 生酮 5 步在肝线粒体；利用段在肝外线粒体
  for (const id of ["kt-1", "kt-2", "kt-3", "kt-4", "kt-5"]) {
    const step = d.steps.find((x) => x.id === id);
    if (step && step.compartment !== "liver-mito") push(`${id} 应在 liver-mito，实际 ${step.compartment}`);
  }
  const use = d.steps.find((x) => x.id === "kt-6");
  if (use && use.compartment !== "extra-mito") push(`kt-6 应在 extra-mito，实际 ${use.compartment}`);

  // 3) 限速 / 可逆口径：HMGCS2 不可逆限速，BDH1 可逆，硫解酶可逆
  const k2 = d.steps.find((x) => x.id === "kt-2");
  if (!k2?.irreversible) push("kt-2（HMGCS2）应为不可逆限速步");
  if (!k2?.enzyme?.isozyme?.includes("HMGCS2")) push("kt-2 的同工酶应写 HMGCS2");
  const k1 = d.steps.find((x) => x.id === "kt-1");
  if (k1?.irreversible) push("kt-1（硫解酶逆向缩合）应为可逆");
  const k4 = d.steps.find((x) => x.id === "kt-4");
  if (k4?.irreversible) push("kt-4（BDH1）应为可逆");
  if (!k4?.enzyme?.isozyme?.includes("BDH1")) push("kt-4 应写 BDH1");

  // 4) kt-5（丙酮旁路）不许编酶：EC 为空且明写未核实
  const k5 = d.steps.find((x) => x.id === "kt-5");
  if (k5) {
    if (k5.enzyme?.ec) push(`kt-5 的 EC 必须留空（现为 ${k5.enzyme.ec}）`);
    if (!k5.note?.includes("未核实")) push("kt-5 应明写「未核实」");
    if (!k5.deltaG?.source?.includes("未核实")) push("kt-5 的 ΔG 来源应注明酶学细节未核实");
  }

  // 5) 肝外利用段：OXCT1 + 肝不表达
  if (use) {
    if (!use.enzyme?.isozyme?.includes("OXCT1")) push("kt-6 应写 OXCT1");
    if (!use.misconceptions.some((m) => m.includes("肝"))) push("kt-6 应写「肝缺 OXCT1、不利用酮体」");
  }

  // 6) 实体唯一、公式只写在可核物质上
  const eIds = d.entities.map((e) => e.id);
  if (new Set(eIds).size !== eIds.length) push("entities 存在重复 id");
  for (const need of ["acetoacetate", "bhb", "acetone", "hmgcoa", "acacoa", "accoa", "succoa", "coa", "nad", "nadh", "co2"]) {
    if (!eIds.includes(need)) push(`entities 缺 ${need}`);
  }
  for (const e of d.entities) {
    if (e.formula && !/^[A-Za-z0-9]+$/.test(e.formula.replace(/\s+/g, ""))) {
      push(`实体 ${e.id} 的 formula 形态异常：${e.formula}`);
    }
  }

  // 7) 图例 / 导读 / 页脚齐全
  if (!(d.legend?.length >= 4)) push("legend 不足 4 项");
  if (!d.readingGuide?.paragraphs?.length) push("缺导读段落");
  if (!(d.posterFoot?.length >= 2)) push("posterFoot 应至少 2 行");
  if (!d.posterFoot.some((t) => t.includes("HMGCS2") && t.includes("HMGCR"))) {
    push("posterFoot 应写清 HMGCS2 与 HMGCR 的区别");
  }

  // 8) 全部 2D：threeD 固定 not-built，不登记 PDB
  if (d.threeD?.status !== "not-built") push(`threeD.status 应为 not-built，实际 ${d.threeD?.status}`);
  if (!d.threeD?.note?.includes("2D") || !d.threeD?.note?.includes("PDB")) push("threeD.note 应写明只做 2D、不登记 PDB");
  const blob = JSON.stringify(d) + JSON.stringify(s);
  if (/pdbId|pdb_id|candidatePdb|pdbCandidates/i.test(blob)) push("数据里出现 PDB 候选字段");
  if (blob.includes("待结构核验")) push("数据里出现「待结构核验」占位");
  if (/第\s*\d+\s*页|真题\s*\d{4}|20\d{2}\s*年真题/.test(blob)) push("数据里出现页码或真题年份");

  // 9) 运输段：数据与骨架 id 集合一致，端点节点存在
  const dt = (d.transportSteps ?? []).map((t) => t.id);
  const st = (s.transportSteps ?? []).map((t) => t.id);
  if (dt.length !== 1 || dt[0] !== "kt-t1") push(`数据层运输段应为 1 段 kt-t1，实际 ${dt.join(",") || "无"}`);
  if (st.join(",") !== dt.join(",")) push(`骨架运输段应与数据层一致：数据 ${dt.join(",")} / 骨架 ${st.join(",")}`);
  const t = (s.transportSteps ?? [])[0];
  if (t) {
    if (!t.from || !t.to || !t.via || !t.note) push("运输段缺 from/to/via/note");
    if (!t.note.includes("不计入")) push("运输段应说明不计入步数");
  }

  // 10) 接口：只指向真实存在的既有步骤
  const stepFileMap = {
    fao: "src/data/fatty-acid-oxidation/fao.json",
    tca: "src/data/tca.json",
    ch: "src/data/cholesterol/cholesterol.json",
    gly: "src/data/glycogen/glycogen.json",
    gn: "src/data/gluconeogenesis/gluconeogenesis.json",
    ppp: "src/data/ppp/ppp.json",
  };
  const known = new Set();
  for (const [prefix, file] of Object.entries(stepFileMap)) {
    const src = read(file);
    for (const st2 of src.steps ?? []) known.add(st2.id);
    for (const st2 of src.sideBranchSteps ?? []) known.add(st2.id);
  }
  if (!(d.interfaces?.length >= 2)) push("interfaces 至少 2 条");
  for (const it of d.interfaces ?? []) {
    if (!known.has(it.stepId)) push(`接口 stepId 不存在：${it.stepId}`);
    if (!it.label || !it.note) push(`接口 ${it.stepId} 缺 label/note`);
  }

  // 11) 骨架：区室 / 节点 / 连线
  if (!(s.compartments?.length === 3)) push(`区室应为 3 个，实际 ${s.compartments?.length}`);
  const compIds = s.compartments.map((c) => c.id);
  if (compIds.join(",") !== "liver-mito,blood,extra-mito") push(`区室 id 应为 liver-mito,blood,extra-mito，实际 ${compIds.join(",")}`);

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

  const stepIds = new Set(d.steps.map((x) => x.id));
  const transportIds = new Set(dt);
  for (const l of s.links) {
    if (!nIds.includes(l.from) || !nIds.includes(l.to)) push(`连线端点不存在：${l.from}→${l.to}`);
    if (l.stepId && !stepIds.has(l.stepId) && !transportIds.has(l.stepId)) {
      push(`连线 stepId 不存在：${l.stepId}`);
    }
    if (l.type === "transport" && !transportIds.has(l.stepId)) push(`transport 连线应指向 kt-t1：${l.from}→${l.to}`);
    if (!l.stepId && !["feed"].includes(l.type)) push(`连线缺 stepId：${l.from}→${l.to}（${l.type}）`);
  }

  // 12) 每步至少一条可点击链；kt-1…kt-5 的主链端点落在底物/产物实体上
  //     kt-4 可逆，允许主链反向；kt-6 是三段合并利用段，按「首尾落到该步底物/产物」检查
  for (const step of d.steps) {
    const clickable = s.links.filter((l) => l.stepId === step.id && l.type !== "transport");
    if (!clickable.length) {
      push(`${step.id} 没有可点击链`);
      continue;
    }
    const mains = s.links.filter((l) => l.stepId === step.id && l.type === "main");
    if (!mains.length) {
      if (!clickable.some((l) => l.type === "branch")) push(`${step.id} 缺主链（旁路步应有 branch 链）`);
      continue;
    }
    const sub = new Set(step.substrates);
    const prod = new Set(step.products);
    const fromEnt = (l) => s.nodes.find((n) => n.id === l.from)?.entityId;
    const toEnt = (l) => s.nodes.find((n) => n.id === l.to)?.entityId;
    const okForward = (l) => sub.has(fromEnt(l)) && (prod.has(toEnt(l)) || s.nodes.find((n) => n.id === l.to)?.kind === "hub");
    const okReverse = (l) => prod.has(fromEnt(l)) && sub.has(toEnt(l));
    if (step.id === "kt-6") {
      const first = mains[0];
      const last = mains[mains.length - 1];
      if (!sub.has(fromEnt(first))) push(`kt-6 主链起点 ${first.from} 不是该步底物（${fromEnt(first)}）`);
      if (!prod.has(toEnt(last))) push(`kt-6 主链终点 ${last.to} 不是该步产物（${toEnt(last)}）`);
      continue;
    }
    for (const m of mains) {
      if (!okForward(m) && !(step.irreversible === false && okReverse(m))) {
        push(`${step.id} 主链端点与底物/产物不符：${m.from}→${m.to}（${fromEnt(m)}→${toEnt(m)}）`);
      }
    }
  }

  // 13) 生酮 5 步 + 利用段在图上都有可点击节点
  for (const step of d.steps) {
    if (!s.nodes.some((n) => n.stepId === step.id)) push(`${step.id} 没有可点击节点`);
  }
  if (!s.nodes.some((n) => n.stepId === "kt-t1")) push("kt-t1 没有运输节点");

  // 14) 标点纪律：不允许把 β-羟丁酸叫成「酮」
  const bad = JSON.stringify(d).match(/β-羟丁酸[^"]{0,8}是酮/g);
  if (bad) push(`出现「β-羟丁酸是酮」的错误表述 ${bad.length} 处`);

  return out;
}

const found = validate(data, skel);
for (const m of found) err(m);

// ---------- 2D 资产 ----------
const ASSETS = ["acacoa", "hmgcoa", "acetoacetate", "bhb", "acetone"];
for (const id of ASSETS) {
  const json = `public/assets/structures/2d/${id}.json`;
  const svg = `public/assets/structures/2d/${id}.svg`;
  if (!exists(json)) {
    err(`缺 2D 资产 ${json}`);
    continue;
  }
  if (!exists(svg)) err(`缺 2D 图示 ${svg}`);
  const a = read(json);
  if (a.kind !== "2d") err(`${id}.json 的 kind 应为 2d`);
  if (!a.generatedBy || !a.method) err(`${id}.json 缺 generatedBy / method（provenance）`);
  if (a.provenance?.kind !== "computed") err(`${id}.json 的 provenance.kind 应为 computed`);
  if (!a.provenance?.note?.includes("PDB")) err(`${id}.json 的 provenance.note 应写明不登记 PDB`);
  if (!a.atoms?.length || !a.bonds?.length) err(`${id}.json 缺 atoms/bonds`);
  if ((a.annotate ?? a.annotations ?? []).some((t) => /待结构核验/.test(JSON.stringify(t)))) {
    err(`${id}.json 出现「待结构核验」`);
  }
}

// ---------- 负例：改坏后必须报错 ----------
const clone = (x) => JSON.parse(JSON.stringify(x));
const NEGATIVES = [
  ["步骤序号断裂", (d) => { d.steps[2].index = 7; }],
  ["节点越出区室", (d, s) => { s.nodes[0].x = 12; }],
  ["连线指向不存在节点", (d, s) => { s.links[0].to = "nope"; }],
  ["某步缺主链", (d, s) => { s.links = s.links.filter((l) => !(l.stepId === "kt-3" && l.type === "main")); }],
  ["ΔG 出现数值", (d) => { d.steps[0].deltaG.standard = -20; }],
  ["threeD 被写成已建", (d) => { d.threeD.status = "built"; }],
  ["登记 PDB 候选", (d) => { d.entities[0].pdbId = "1ABC"; }],
  ["接口指向不存在的步骤", (d) => { d.interfaces[0].stepId = "tca-99"; }],
  ["运输段 id 不一致", (d, s) => { s.transportSteps[0].id = "kt-t2"; }],
];
for (const [label, mutate] of NEGATIVES) {
  const d = clone(data);
  const s = clone(skel);
  mutate(d, s);
  const out = validate(d, s);
  if (!out.length) err(`负例未被拦下：${label}`);
}

if (errors.length) {
  console.error(`validate-ketone FAIL：${errors.length} 项`);
  for (const m of errors) console.error(`  - ${m}`);
  process.exit(1);
}
console.log(
  `validate-ketone PASS：6 步（生酮 5 + 肝外利用 1）｜3 区室｜16 节点｜运输 1 段｜接口 ${data.interfaces.length} 条｜` +
    `2D 资产 ${ASSETS.length} 个（provenance 齐）｜负例 ${NEGATIVES.length} 组全部拦下｜无 PDB / 无「待结构核验」`,
);
