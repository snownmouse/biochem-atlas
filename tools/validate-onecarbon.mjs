// 一碳单位代谢挂图（PLATE 14 · SF-14）数据层校验。
// 口径：9 步（线粒体装载 2 步 + 胞质叶酸池 / 甲硫氨酸循环 7 步，含 BHMT 甜菜碱旁支）+ 1 段跨区室运输；2 区室；全部 2D。
// 除正向校验外，脚本自带 11 组负例（改坏数据后必须报错），防止校验器本身失效。
// 用法：node tools/validate-onecarbon.mjs
import { readFileSync, existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => JSON.parse(readFileSync(join(ROOT, p), "utf8"));
const exists = (p) => existsSync(join(ROOT, p));

const data = read("src/data/one-carbon/one-carbon.json");
const skel = read("src/data/one-carbon/skeleton.json");

const errors = [];
const err = (m) => errors.push(m);

const STEP_IDS = ["oc-1", "oc-2", "oc-3", "oc-4", "oc-5", "oc-6", "oc-7", "oc-8", "oc-9"];
const MITO_STEPS = ["oc-1", "oc-2"];
const CYTO_STEPS = ["oc-3", "oc-4", "oc-5", "oc-6", "oc-7", "oc-8", "oc-9"];

function validate(d, s) {
  const out = [];
  const push = (m) => out.push(m);

  // 1) 步骤：9 步、id / 序号连续、必填字段齐全
  if (d.steps.length !== 9) push(`步骤数应为 9，实际 ${d.steps.length}`);
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

  // 2) 区室口径：oc-1 / oc-2 在线粒体，其余在胞质
  for (const id of MITO_STEPS) {
    const step = d.steps.find((x) => x.id === id);
    if (step && step.compartment !== "mito") push(`${id} 应在 mito，实际 ${step.compartment}`);
  }
  for (const id of CYTO_STEPS) {
    const step = d.steps.find((x) => x.id === id);
    if (step && step.compartment !== "cyto") push(`${id} 应在 cyto，实际 ${step.compartment}`);
  }

  // 3) 方向和不可逆口径：MTHFR 不可逆限速；AHCY 可逆；SHMT 可逆
  const oc4 = d.steps.find((x) => x.id === "oc-4");
  if (!oc4?.irreversible) push("oc-4（MTHFR）应为不可逆");
  if (!oc4?.enzyme?.isozyme?.includes("MTHFR")) push("oc-4 的同工酶应写 MTHFR");
  const oc8 = d.steps.find((x) => x.id === "oc-8");
  if (oc8?.irreversible) push("oc-8（AHCY）应为可逆");
  const oc1 = d.steps.find((x) => x.id === "oc-1");
  if (oc1?.irreversible) push("oc-1（SHMT）应为可逆");
  const oc6 = d.steps.find((x) => x.id === "oc-6");
  if (!oc6?.irreversible) push("oc-6（MAT）应为不可逆");
  const oc9 = d.steps.find((x) => x.id === "oc-9");
  if (oc9?.irreversible) push("oc-9（BHMT）应为可逆（生理方向靠甜菜碱供给与 DMG 清除拉动）");
  if (!/BHMT/.test(oc9?.enzyme?.isozyme ?? "")) push("oc-9 的同工酶应写 BHMT");
  if (oc9?.enzyme?.ec !== "2.1.1.5") push(`oc-9 的 EC 应为 2.1.1.5，实际 ${oc9?.enzyme?.ec}`);
  if (!oc9?.equation?.includes("甜菜碱") || !oc9?.products?.includes("dimethylglycine")) {
    push("oc-9 应写明甜菜碱供甲基并生成二甲基甘氨酸");
  }

  // 4) 氧化态方向必须写明：oc-2 氧化、oc-3 双向、oc-4 还原
  if (!/氧化方向/.test(oc2Text(d, "oc-2"))) push("oc-2 应写明「氧化方向」");
  if (!/双向/.test(oc2Text(d, "oc-3"))) push("oc-3 应写明「双向」互变");
  if (!/还原/.test(oc2Text(d, "oc-4"))) push("oc-4 应写明「还原」方向");
  function oc2Text(dd, id) {
    const st = dd.steps.find((x) => x.id === id);
    return `${st?.name ?? ""}${st?.deltaG?.qualitative ?? ""}${st?.significance ?? ""}`;
  }

  // 5) 甲硫氨酸循环闭环：MTR / MAT / 甲基转移酶 / AHCY 四步都要在，且 B12 不进酶名当辅因子
  const oc5 = d.steps.find((x) => x.id === "oc-5");
  if (!oc5?.cofactors?.some((c) => /B12|钴胺素/.test(c))) push("oc-5 应把钴胺素（B12）记为辅因子");
  if (!oc5?.protein?.toString().includes("MTR") && !oc5?.enzyme?.isozyme?.includes("MTR")) push("oc-5 的同工酶应写 MTR");
  const oc7 = d.steps.find((x) => x.id === "oc-7");
  if (oc7?.enzyme?.ec) push(`oc-7 是甲基转移酶家族，EC 应留空（现为 ${oc7.enzyme.ec}）`);
  if (!/教材章级/.test(oc7?.deltaG?.source ?? "")) push("oc-7 的 ΔG 来源应写教材章级出处");

  // 6) EC 纪律：多活性域按脱氢酶域登记单值 EC（IUBMB / UniProt），家族酶仍留空
  for (const id of ["oc-7"]) {
    const st = d.steps.find((x) => x.id === id);
    if (st?.enzyme?.ec) push(`${id} 的 EC 应留空（现为 ${st.enzyme.ec}）`);
    if (/未核实|未核验|待核实/.test(`${st?.deltaG?.source ?? ""}${st?.note ?? ""}`)) {
      push(`${id} 的 note / ΔG 来源不得出现「未核实」类占位文字`);
    }
  }
  // 6b) MTHFD2 / MTHFD1：EC 与辅酶必须对得上（NAD⁺ vs NADP⁺）
  const oc2 = d.steps.find((x) => x.id === "oc-2");
  if (oc2?.enzyme?.ec !== "1.5.1.15") push(`oc-2（MTHFD2）的 EC 应为 1.5.1.15，实际 ${oc2?.enzyme?.ec}`);
  if (/NADP/.test(`${oc2?.equation ?? ""}${(oc2?.cofactors ?? []).join("")}`)) {
    push("oc-2（MTHFD2）应用 NAD⁺/NADH，不得写 NADP⁺/NADPH");
  }
  const oc3 = d.steps.find((x) => x.id === "oc-3");
  if (oc3?.enzyme?.ec !== "1.5.1.5") push(`oc-3（MTHFD1）的 EC 应为 1.5.1.5，实际 ${oc3?.enzyme?.ec}`);
  if (!/NADPH/.test(`${oc3?.equation ?? ""}${(oc3?.cofactors ?? []).join("")}`)) {
    push("oc-3（MTHFD1）应用 NADPH/NADP⁺");
  }

  // 7) dTMP 只作接口预留：不得展开成步骤，页脚要指向已建成的 PLATE 15（pyr-12）
  if (d.steps.some((x) => /dTMP|胸苷酸/.test(`${x.name}${x.equation}${x.products.join("")}`))) {
    push("dTMP 合成不应在本图展开成步骤");
  }
  if (!d.posterFoot.some((t) => t.includes("dTMP") && t.includes("PLATE 15") && t.includes("pyr-12"))) {
    push("posterFoot 应写明 dTMP 合成在 PLATE 15（pyr-12）展开（接口预留）");
  }
  if (!/dTMP/.test(JSON.stringify(s.annotations ?? []))) push("骨架应以注记预留 dTMP 接口");

  // 8) 实体唯一且齐全
  const eIds = d.entities.map((e) => e.id);
  if (new Set(eIds).size !== eIds.length) push("entities 存在重复 id");
  for (const need of ["ser", "gly", "thf", "ch2thf", "chmethf", "chothf", "ch3thf", "hcy", "met", "betaine", "dimethylglycine", "sam", "sah", "ado"]) {
    if (!eIds.includes(need)) push(`entities 缺 ${need}`);
  }
  for (const e of d.entities) {
    if (e.formula && !/^[A-Za-z0-9]+$/.test(e.formula.replace(/\s+/g, ""))) {
      push(`实体 ${e.id} 的 formula 形态异常：${e.formula}`);
    }
  }

  // 9) 图例 / 导读 / 页脚
  if (!(d.legend?.length >= 4)) push("legend 不足 4 项");
  if (!d.readingGuide?.paragraphs?.length) push("缺导读段落");
  if (!(d.posterFoot?.length >= 2)) push("posterFoot 应至少 2 行");
  if (!d.posterFoot.some((t) => t.includes("甲酰基") && t.includes("甲基"))) {
    push("posterFoot 应写清甲酰基 / 亚甲基 / 甲基的氧化态顺序");
  }

  // 10) 全部 2D：threeD 固定 not-built，不登记 PDB，不写页码 / 真题
  if (d.threeD?.status !== "not-built") push(`threeD.status 应为 not-built，实际 ${d.threeD?.status}`);
  if (!d.threeD?.note?.includes("2D") || !d.threeD?.note?.includes("PDB")) push("threeD.note 应写明只做 2D、不登记 PDB");
  const blob = JSON.stringify(d) + JSON.stringify(s);
  if (/pdbId|pdb_id|candidatePdb|pdbCandidates/i.test(blob)) push("数据里出现 PDB 候选字段");
  if (blob.includes("待结构核验")) push("数据里出现「待结构核验」占位");
  if (/第\s*\d+\s*页|真题\s*\d{4}|20\d{2}\s*年真题/.test(blob)) push("数据里出现页码或真题年份");
  if (/版\s*\d/.test(blob)) {
    // 版次只允许出现在 posterFoot 的教材依据里（书名 + 版次 + 章节名），不允许页码
    if (!d.posterFoot.some((t) => t.includes("第 9 版"))) push("教材版次应统一写在 posterFoot");
  }

  // 11) 运输段：1 段 oc-t1，数据与骨架一致
  const dt = (d.transportSteps ?? []).map((t) => t.id);
  const st = (s.transportSteps ?? []).map((t) => t.id);
  if (dt.length !== 1 || dt[0] !== "oc-t1") push(`数据层运输段应为 1 段 oc-t1，实际 ${dt.join(",") || "无"}`);
  if (st.join(",") !== dt.join(",")) push(`骨架运输段应与数据层一致：数据 ${dt.join(",")} / 骨架 ${st.join(",")}`);
  const tr = (s.transportSteps ?? [])[0];
  if (tr) {
    if (!tr.from || !tr.to || !tr.via || !tr.note) push("运输段缺 from/to/via/note");
    if (!tr.note.includes("不计入")) push("运输段应说明不计入步数");
  }

  // 12) 接口：只指向真实存在的既有步骤（氨基酸挂图 aa-7 = CBS）
  const known = new Set();
  for (const file of ["src/data/amino-acid/amino.json", "src/data/ketone/ketone.json", "src/data/tca.json"]) {
    const src = read(file);
    for (const st2 of src.steps ?? []) known.add(st2.id);
    for (const st2 of src.sideBranchSteps ?? []) known.add(st2.id);
  }
  if (!(d.interfaces?.length >= 1)) push("interfaces 至少 1 条");
  for (const it of d.interfaces ?? []) {
    if (!known.has(it.stepId)) push(`接口 stepId 不存在：${it.stepId}`);
    if (!it.label || !it.note) push(`接口 ${it.stepId} 缺 label/note`);
  }
  if (!(d.interfaces ?? []).some((it) => it.stepId === "aa-7")) push("接口应登记氨基酸挂图的 aa-7（转硫支路）");

  // 13) 骨架：2 区室 mito / cyto
  if (!(s.compartments?.length === 2)) push(`区室应为 2 个，实际 ${s.compartments?.length}`);
  const compIds = s.compartments.map((c) => c.id);
  if (compIds.join(",") !== "mito,cyto") push(`区室 id 应为 mito,cyto，实际 ${compIds.join(",")}`);

  // 14) 节点：唯一、在区室内、实体存在
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
  if (s.nodes.length !== 22) push(`节点数应为 22，实际 ${s.nodes.length}`);

  // 15) 连线：端点存在、stepId 真实、transport 指向 oc-t1
  const stepIds = new Set(d.steps.map((x) => x.id));
  const transportIds = new Set(dt);
  for (const l of s.links) {
    if (!nIds.includes(l.from) || !nIds.includes(l.to)) push(`连线端点不存在：${l.from}→${l.to}`);
    if (l.stepId && !stepIds.has(l.stepId) && !transportIds.has(l.stepId)) {
      push(`连线 stepId 不存在：${l.stepId}`);
    }
    if (l.type === "transport" && !transportIds.has(l.stepId)) push(`transport 连线应指向 oc-t1：${l.from}→${l.to}`);
    if (!l.stepId && !["feed"].includes(l.type)) push(`连线缺 stepId：${l.from}→${l.to}（${l.type}）`);
  }

  // 16) 每步有可点击链；主链端点落在该步底物/产物（可逆步允许反向）
  for (const step of d.steps) {
    const clickable = s.links.filter((l) => l.stepId === step.id && l.type !== "transport");
    if (!clickable.length) {
      push(`${step.id} 没有可点击链`);
      continue;
    }
    const mains = s.links.filter((l) => l.stepId === step.id && l.type === "main");
    if (!mains.length) {
      push(`${step.id} 缺主链`);
      continue;
    }
    const sub = new Set(step.substrates);
    const prod = new Set(step.products);
    const fromEnt = (l) => s.nodes.find((n) => n.id === l.from)?.entityId;
    const toEnt = (l) => s.nodes.find((n) => n.id === l.to)?.entityId;
    const okForward = (l) => sub.has(fromEnt(l)) && (prod.has(toEnt(l)) || s.nodes.find((n) => n.id === l.to)?.kind === "hub");
    const okReverse = (l) => prod.has(fromEnt(l)) && sub.has(toEnt(l));
    const pool = new Set([...step.substrates, ...step.products]);
    const okChain = (l) => pool.has(fromEnt(l)) && pool.has(toEnt(l));
    for (const m of mains) {
      const ok = mains.length > 1 ? okChain(m) : okForward(m) || (step.irreversible === false && okReverse(m));
      if (!ok) {
        push(`${step.id} 主链端点与底物/产物不符：${m.from}→${m.to}（${fromEnt(m)}→${toEnt(m)}）`);
      }
    }
  }

  // 17) 每步在图上都有可点击节点
  for (const step of d.steps) {
    if (!s.nodes.some((n) => n.stepId === step.id)) push(`${step.id} 没有可点击节点`);
  }

  return out;
}

const found = validate(data, skel);
for (const m of found) err(m);

// ---------- 2D 资产 ----------
const ASSETS = ["gly", "met", "sam", "sah", "ado"];
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
  ["某步缺主链", (d, s) => { s.links = s.links.filter((l) => !(l.stepId === "oc-5" && l.type === "main")); }],
  ["ΔG 出现数值", (d) => { d.steps[0].deltaG.standard = -20; }],
  ["threeD 被写成已建", (d) => { d.threeD.status = "built"; }],
  ["登记 PDB 候选", (d) => { d.entities[0].pdbId = "1ABC"; }],
  ["接口指向不存在的步骤", (d) => { d.interfaces[0].stepId = "aa-99"; }],
  ["运输段 id 不一致", (d, s) => { s.transportSteps[0].id = "oc-t2"; }],
  ["MTHFR 被改成可逆", (d) => { const st = d.steps.find((x) => x.id === "oc-4"); st.irreversible = false; }],
  ["BHMT 被改成不可逆", (d) => { const st = d.steps.find((x) => x.id === "oc-9"); st.irreversible = true; }],
  ["MTHFD2 辅酶被写成 NADP⁺", (d) => { d.steps.find((x) => x.id === "oc-2").equation = "5,10-亚甲基THF + NADP⁺ → 5,10-次甲基THF + NADPH + H⁺"; }],
  ["MTHFD1 的 EC 被写成线粒体型的 1.5.1.15", (d) => { d.steps.find((x) => x.id === "oc-3").enzyme.ec = "1.5.1.15"; }],
];
for (const [label, mutate] of NEGATIVES) {
  const d = clone(data);
  const s = clone(skel);
  mutate(d, s);
  const out = validate(d, s);
  if (!out.length) err(`负例未被拦下：${label}`);
}

if (errors.length) {
  console.error(`validate-onecarbon FAIL：${errors.length} 项`);
  for (const m of errors) console.error(`  - ${m}`);
  process.exit(1);
}
console.log(
  `validate-onecarbon PASS：9 步（线粒体 2 + 胞质 7）｜2 区室｜22 节点｜运输 1 段｜接口 ${data.interfaces.length} 条｜` +
    `2D 资产 ${ASSETS.length} 个（provenance 齐）｜负例 ${NEGATIVES.length} 组全部拦下｜无 PDB / 无「待结构核验」`,
);
