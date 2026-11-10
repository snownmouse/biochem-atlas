// 嘧啶核苷酸代谢挂图（PLATE 15 · SF-15）数据层校验。
// 口径：12 步（胞质 11 步 + 线粒体内膜 DHODH 1 步）+ 1 段跨区室运输；2 区室；全部 2D。
// 除正向校验外，脚本自带 10 组负例（改坏数据后必须报错），防止校验器本身失效。
// 用法：node tools/validate-pyrimidine.mjs
import { readFileSync, existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => JSON.parse(readFileSync(join(ROOT, p), "utf8"));
const exists = (p) => existsSync(join(ROOT, p));

const data = read("src/data/pyrimidine/pyrimidine.json");
const skel = read("src/data/pyrimidine/skeleton.json");

const STEP_IDS = ["pyr-1", "pyr-2", "pyr-3", "pyr-4", "pyr-5", "pyr-6", "pyr-7", "pyr-8", "pyr-9", "pyr-10", "pyr-11", "pyr-12"];
const MITO_STEPS = ["pyr-4"];
const CYTO_STEPS = STEP_IDS.filter((id) => id !== "pyr-4");

function validate(d, s) {
  const out = [];
  const push = (m) => out.push(m);

  // 1) 步骤：12 步、id / 序号连续、必填字段齐全
  if (d.steps.length !== 12) push(`步骤数应为 12，实际 ${d.steps.length}`);
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

  // 2) 区室：只有 DHODH（pyr-4）在线粒体，其余在胞质
  if (new Set(d.steps.map((x) => x.compartment)).size !== 2) push("步骤区室应只有 cyto / mito 两种");
  for (const id of MITO_STEPS) {
    const step = d.steps.find((x) => x.id === id);
    if (step && step.compartment !== "mito") push(`${id}（DHODH）应在 mito，实际 ${step.compartment}`);
  }
  for (const id of CYTO_STEPS) {
    const step = d.steps.find((x) => x.id === id);
    if (step && step.compartment !== "cyto") push(`${id} 应在 cyto，实际 ${step.compartment}`);
  }

  // 3) CPS2 / CPS1 纪律：第 1 步必须是 CPS2 + 谷氨酰胺；页脚与注记必须点名 CPS1 / urea-1
  const p1 = d.steps.find((x) => x.id === "pyr-1");
  if (!p1?.enzyme?.isozyme?.includes("CPS2")) push("pyr-1 的同工酶应写 CPS2");
  if (!p1?.enzyme?.name?.includes("II")) push("pyr-1 的酶名应写明 CPS II");
  if (p1?.enzyme?.ec !== "6.3.5.5") push(`pyr-1 的 EC 应为 6.3.5.5，实际 ${p1?.enzyme?.ec}`);
  if (!p1?.substrates?.includes("gln")) push("pyr-1 应以谷氨酰胺为底物（不是游离氨）");
  if (!p1?.cofactors?.some((c) => /Mg/.test(c))) push("pyr-1 应记 Mg²⁺ 为辅因子");
  const foot = d.posterFoot.join("\n");
  if (!/CPS1/.test(foot) || !/urea-1/.test(foot)) push("posterFoot 应点名 CPS1 与 urea-1，与 CPS2 对照");
  if (!/CPS1/.test(JSON.stringify(s.annotations ?? []))) push("骨架注记应写明 CPS1 / CPS2 分工");

  // 4) 关键酶与方向：DHODH 内膜、RNR 二磷酸水平、TS 用 CH₂-THF、CTPS 用 UTP
  const p4 = d.steps.find((x) => x.id === "pyr-4");
  if (!p4?.enzyme?.isozyme?.includes("DHODH")) push("pyr-4 的同工酶应写 DHODH");
  if (!p4?.cofactors?.some((c) => /Q|泛醌/.test(c))) push("pyr-4 应把泛醌（Q）记为电子受体");
  if (!/内膜/.test(p4?.name ?? "")) push("pyr-4 应写明线粒体内膜定位");

  const p10 = d.steps.find((x) => x.id === "pyr-10");
  if (!p10?.substrates?.includes("udp")) push("pyr-10（RNR）底物应为 UDP（二磷酸水平）");
  if (p10?.substrates?.includes("utp")) push("pyr-10 不应以 UTP 为底物（脱氧不在三磷酸水平）");
  if (!/二磷酸/.test(`${p10?.name}${p10?.significance}`)) push("pyr-10 应写明「二磷酸水平」");

  const p9 = d.steps.find((x) => x.id === "pyr-9");
  if (!p9?.substrates?.includes("utp") || !p9?.substrates?.includes("gln")) push("pyr-9（CTPS）应以 UTP + 谷氨酰胺为底物");

  const p12 = d.steps.find((x) => x.id === "pyr-12");
  if (!p12?.substrates?.includes("ch2thf") || !p12?.products?.includes("dhf")) {
    push("pyr-12（TS）应以 5,10-亚甲基THF 为底物、DHF 为产物");
  }
  if (!/PLATE 14/.test(p12?.note ?? "")) push("pyr-12 的 note 应回指 PLATE 14 的 dTMP 接口");

  // 4b) 关键 EC 固定（教材可核）：DHODH / CTPS / RNR / TS
  const EC_FIXED = {
    "pyr-2": "2.1.3.2",
    "pyr-3": "3.5.2.3",
    "pyr-4": "1.3.5.2",
    "pyr-5": "2.4.2.10",
    "pyr-6": "4.1.1.23",
    "pyr-7": "2.7.4.14",
    "pyr-8": "2.7.4.6",
    "pyr-9": "6.3.4.2",
    "pyr-10": "1.17.4.1",
    "pyr-11": "3.6.1.23",
    "pyr-12": "2.1.1.45",
  };
  for (const [id, ec] of Object.entries(EC_FIXED)) {
    const st2 = d.steps.find((x) => x.id === id);
    if (st2?.enzyme?.ec !== ec) push(`${id} 的 EC 应为 ${ec}，实际 ${st2?.enzyme?.ec}`);
  }

  // 5) 末端去向：UTP 供糖原（gly-7），dTMP 之后不展开到 DNA
  if (!/gly-7/.test(foot)) push("posterFoot 应写明 UTP 与糖原 gly-7 的接口");
  if (!/DNA/.test(foot) && !/DNA/.test(JSON.stringify(s.nodes))) push("应说明 dTMP 之后到 DNA 的部分不展开");
  if (d.steps.some((x) => /DNA 聚合|复制|dTTP/.test(`${x.name}${x.equation}`))) push("本图不应展开 DNA 复制步骤");

  // 6) 实体：唯一、齐全、所有底物 / 产物 / 辅因子都有实体
  const eIds = d.entities.map((e) => e.id);
  if (new Set(eIds).size !== eIds.length) push("entities 存在重复 id");
  for (const need of ["gln", "hco3", "cap", "asp", "caasp", "dho", "oro", "prpp", "omp", "ump", "udp", "utp", "ctp", "dudp", "dutp", "dump", "dtmp", "ch2thf", "dhf"]) {
    if (!eIds.includes(need)) push(`entities 缺 ${need}`);
  }
  for (const step of d.steps) {
    for (const m of [...step.substrates, ...step.products]) {
      if (!eIds.includes(m)) push(`${step.id} 引用了不存在的实体 ${m}`);
    }
  }

  // 7) 图例 / 导读 / 页脚
  if (!(d.legend?.length >= 4)) push("legend 不足 4 项");
  if (!(d.readingGuide?.paragraphs?.length >= 3)) push("导读段落不足 3 段");
  if (!(d.posterFoot?.length >= 4)) push("posterFoot 应至少 4 行");
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
  if (/版\s*\d/.test(blob) && !d.posterFoot.some((t) => t.includes("第 9 版"))) push("教材版次应统一写在 posterFoot");

  // 9) 运输段：1 段 pyr-t1，数据与骨架一致，注明不计步数
  const dt = (d.transportSteps ?? []).map((t) => t.id);
  const st = (s.transportSteps ?? []).map((t) => t.id);
  if (dt.length !== 1 || dt[0] !== "pyr-t1") push(`数据层运输段应为 1 段 pyr-t1，实际 ${dt.join(",") || "无"}`);
  if (st.join(",") !== dt.join(",")) push(`骨架运输段应与数据层一致：数据 ${dt.join(",")} / 骨架 ${st.join(",")}`);
  const tr = (s.transportSteps ?? [])[0];
  if (tr) {
    if (!tr.from || !tr.to || !tr.via || !tr.note) push("运输段缺 from/to/via/note");
    if (!tr.note.includes("不计入")) push("运输段应说明不计入步数");
    if (/未核实|未核验|待核实/.test(tr.note)) push("运输段不得出现「未核实」类占位文字");
  }

  // 10) 接口：只指向真实存在的既有步骤（urea-1 / gly-7 / oc-3）
  const known = new Set();
  for (const file of ["src/data/urea-cycle/urea.json", "src/data/glycogen/glycogen.json", "src/data/one-carbon/one-carbon.json"]) {
    const src = read(file);
    for (const st2 of src.steps ?? []) known.add(st2.id);
    for (const st2 of src.sideBranchSteps ?? []) known.add(st2.id);
  }
  if (!(d.interfaces?.length >= 3)) push("interfaces 至少 3 条（urea-1 / gly-7 / oc-3）");
  for (const it of d.interfaces ?? []) {
    if (!known.has(it.stepId)) push(`接口 stepId 不存在：${it.stepId}`);
    if (!it.label || !it.note) push(`接口 ${it.stepId} 缺 label/note`);
  }
  for (const need of ["urea-1", "gly-7", "oc-3"]) {
    if (!(d.interfaces ?? []).some((it) => it.stepId === need)) push(`接口缺 ${need}`);
  }

  // 11) 骨架：2 区室 cyto / mito
  if (s.compartments?.length !== 2) push(`区室应为 2 个，实际 ${s.compartments?.length}`);
  if (s.compartments.map((c) => c.id).join(",") !== "cyto,mito") {
    push(`区室 id 应为 cyto,mito，实际 ${s.compartments.map((c) => c.id).join(",")}`);
  }

  // 12) 节点：唯一、在区室内、实体存在
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
  if (s.nodes.length !== 23) push(`节点数应为 23，实际 ${s.nodes.length}`);

  // 13) 连线：端点存在、stepId 真实；每个步骤至少一个可点主链 + 一个可点节点
  const stepIds = new Set(d.steps.map((x) => x.id));
  const transportIds = new Set(dt);
  for (const l of s.links) {
    if (!nIds.includes(l.from) || !nIds.includes(l.to)) push(`连线端点不存在：${l.from}→${l.to}`);
    if (l.type === "transport") {
      if (!transportIds.has(l.stepId)) push(`运输连线 ${l.from}→${l.to} 指向不存在的运输段 ${l.stepId}`);
    } else if (l.stepId && !stepIds.has(l.stepId) && !transportIds.has(l.stepId)) {
      push(`连线 ${l.from}→${l.to} 的 stepId 不存在：${l.stepId}`);
    }
  }
  for (const id of STEP_IDS) {
    const links = s.links.filter((l) => l.stepId === id && l.type === "main");
    if (!links.length) push(`${id} 缺 main 连线`);
    const nodes = s.nodes.filter((n) => n.stepId === id);
    if (!nodes.length) push(`${id} 缺可点击节点`);
    for (const l of links) {
      const step = d.steps.find((x) => x.id === id);
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

  // 14) 2D 资产：11 个新资产存在，provenance 写明 2D-only / 不建 3D
  const ASSETS = ["caasp", "dho", "oro", "prpp", "omp", "ump", "ctp", "dudp", "dutp", "dump", "dtmp"];
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
negative("把 pyr-1 写成 CPS1", (d) => { d.steps[0].enzyme.isozyme = "CPS1（线粒体）"; });
negative("把 DHODH 挪回胞质", (d) => { d.steps[3].compartment = "cyto"; });
negative("把 RNR 底物改成 UTP", (d) => { d.steps[9].substrates = ["utp"]; });
negative("去掉 TS 的 CH₂-THF", (d) => { d.steps[11].substrates = ["dump"]; });
negative("给 ΔG 填数值", (d) => { d.steps[0].deltaG.standard = -30; });
negative("改错 TS 的 EC", (d) => { d.steps[11].enzyme.ec = "1.1.1.1"; });
negative("删掉 urea-1 接口", (d) => { d.interfaces = d.interfaces.filter((x) => x.stepId !== "urea-1"); });
negative("把节点挪出区室", (d, s) => { s.nodes[0].x = 10; });
negative("写页码", (d) => { d.posterFoot.push("见第 123 页。"); });
negative("登记 PDB", (d) => { d.threeD.pdbId = "1ABC"; });

if (errors.length === 0) {
  console.log("✓ 嘧啶核苷酸挂图数据校验通过");
  console.log(`  步骤 ${data.steps.length} / 区室 ${skel.compartments.length} / 节点 ${skel.nodes.length} / 运输 ${(data.transportSteps ?? []).length} / 接口 ${data.interfaces.length} / 资产 11`);
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
  console.log("✗ 嘧啶核苷酸挂图数据校验失败：");
  for (const e of errors) console.log(`  - ${e}`);
  process.exit(1);
}
