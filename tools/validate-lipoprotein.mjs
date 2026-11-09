// PLATE 18 血浆脂蛋白数据校验（SF-18）：
// 这是器官间物流图，不是反应链。校验 11 段物流 / 4 个器官 / 1 条血浆带 /
// 颗粒组成账本 / 只允许 fao-act 与 ch-13 两个真实接口 / 2D-only / 无反应式与 ΔG。
// 运行：node tools/validate-lipoprotein.mjs
//
// 校验逻辑集中在 check()，随后用 16 条负例自检，确认校验器不是「只会说 OK」。

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "..");
const read = (p) => JSON.parse(readFileSync(resolve(root, p), "utf8"));
const readText = (p) => readFileSync(resolve(root, p), "utf8");

const baseData = read("src/data/lipoprotein/lipoprotein.json");
const baseSkel = read("src/data/lipoprotein/skeleton.json");
const fao = read("src/data/fatty-acid-oxidation/fao.json");
const cholesterol = read("src/data/cholesterol/cholesterol.json");
const stepIndexSrc = readText("src/data/stepIndex.ts");

const STEP_IDS = ["lp-1", "lp-2", "lp-3", "lp-4", "lp-5", "lp-6", "lp-7", "lp-8", "lp-9", "lp-10", "lp-11"];
const ORGAN_IDS = ["intestine", "liver", "peripheral", "steroid"];
const KINDS = new Set(["assembly", "lipolysis", "receptor", "efflux", "transfer", "uptake"]);
const LEDGER_LEVELS = new Set(["高", "中", "低"]);
const INTERFACE_IDS = ["fao-act", "ch-13"];

/** 估算一行文字的宽度：CJK 全角按字号，ASCII 按 0.55 字号。 */
function textWidth(text, size) {
  let w = 0;
  for (const ch of String(text)) {
    w += /[^\x00-\xff]/.test(ch) ? size : size * 0.55;
  }
  return w;
}

function chipBox(chip, step) {
  const lines = [
    [step ? `${step.kind} · ${(step.kind || "").toUpperCase()}` : "", 8.8],
    [step?.label ?? "", 12.5],
    [(step?.players ?? []).slice(0, 3).join(" · "), 9.1],
  ];
  const width = Math.max(...lines.map(([t, s]) => textWidth(t, s)), 40);
  const left = chip.anchor === "end" ? chip.x - width : chip.anchor === "middle" ? chip.x - width / 2 : chip.x;
  return { left, right: left + width, top: chip.y - 10, bottom: chip.y + 36, width };
}

function check(data, skel, faoSrc, cholSrc, idxSrc) {
  const errors = [];
  const notes = [];
  const fail = (msg) => errors.push(msg);
  const ok = (msg) => notes.push(msg);

  // ---------- 1. 身份与计数 ----------
  if (data.id !== "lipoprotein") fail(`id 应为 lipoprotein，实际 ${data.id}`);
  if (data.name !== "血浆脂蛋白代谢") fail(`name 不符：${data.name}`);
  if (data.en !== "PLASMA LIPOPROTEIN METABOLISM") fail(`en 不符：${data.en}`);
  if (data.plateNo !== "PLATE 18") fail(`plateNo 应为 PLATE 18，实际 ${data.plateNo}`);
  if (data.structureNo !== "SF-18") fail(`structureNo 应为 SF-18，实际 ${data.structureNo}`);

  if (!Array.isArray(data.steps) || data.steps.length !== 11) {
    fail(`物流步骤应为 11 段，实际 ${data.steps?.length}`);
  }
  const stepIds = data.steps.map((s) => s.id);
  if (new Set(stepIds).size !== stepIds.length) fail("step id 有重复");
  for (const id of STEP_IDS) if (!stepIds.includes(id)) fail(`缺少物流步骤 ${id}`);
  for (const id of stepIds) if (!STEP_IDS.includes(id)) fail(`多出非法物流步骤 ${id}`);
  if (data.thesis?.stepCount !== 11) fail(`thesis.stepCount 应为 11，实际 ${data.thesis?.stepCount}`);
  if (data.thesis?.reactionCount !== 0) fail("thesis.reactionCount 必须为 0（本图不是反应链）");

  // ---------- 2. 器官 ----------
  if (!Array.isArray(data.organs) || data.organs.length !== 4) {
    fail(`器官应为 4 个，实际 ${data.organs?.length}`);
  }
  const organIds = new Set(data.organs.map((o) => o.id));
  for (const id of ORGAN_IDS) if (!organIds.has(id)) fail(`缺少器官 ${id}`);
  for (const id of organIds) if (!ORGAN_IDS.includes(id)) fail(`多出非法器官 ${id}`);

  // ---------- 3. 每段物流字段 ----------
  for (const s of data.steps) {
    if (!KINDS.has(s.kind)) fail(`${s.id}: kind 非法 ${s.kind}`);
    if (!organIds.has(s.organId)) fail(`${s.id}: organId 不存在 ${s.organId}`);
    if (!s.label || !s.label.trim()) fail(`${s.id}: 缺少 label`);
    if (!Array.isArray(s.players) || s.players.length < 2) fail(`${s.id}: players 至少 2 个颗粒 / 蛋白`);
    if (!s.flow || !s.flow.trim()) fail(`${s.id}: 缺少 flow 物流方向`);
    if (!s.note || !s.note.trim()) fail(`${s.id}: 缺少 note`);
    if (!s.detail || !s.detail.trim()) fail(`${s.id}: 缺少 detail`);
    if (!Array.isArray(s.refs)) fail(`${s.id}: refs 必须是数组`);
    if (s.refs.length) fail(`${s.id}: 物流步骤不应直接挂既有通路 refs（接口单独登记）`);
  }

  // ---------- 4. 禁用反应链字段 / 反应式 / ΔG ----------
  const forbiddenKeys = ["equation", "reaction", "reactionEquation", "deltaG", "deltag", "dg", "ec", "ecNumber"];
  const walk = (v, path = "") => {
    if (Array.isArray(v)) return v.forEach((x, i) => walk(x, `${path}[${i}]`));
    if (v && typeof v === "object") {
      for (const [k, x] of Object.entries(v)) {
        if (forbiddenKeys.includes(k)) fail(`lipoprotein.json 出现禁用字段 ${path}.${k}`);
        walk(x, `${path}.${k}`);
      }
    }
  };
  walk(data);

  const dataText = JSON.stringify(data);
  if (/ΔG\s*[=≈：:]?\s*[-−]?\d/.test(dataText)) fail("数据出现 ΔG 数值（本图不写能量数值）");
  if (/EC\s*\d+\.\d+/.test(dataText)) fail("数据出现 EC 编号（本图以物流为主，不编 EC）");
  if (
    /[A-Za-z0-9)]\s*\+\s*[A-Za-z0-9(][^\n]*→/.test(dataText) ||
    /[A-Za-z0-9)]\s*→\s*[A-Za-z0-9(][^\n]*\+/.test(dataText) ||
    /[A-Za-z0-9)]\s*=\s*[A-Za-z0-9(]/.test(dataText)
  ) {
    fail("step 文本疑似写了“底物 → 产物”反应式；物流方向应写在 flow，颗粒搬运用文字描述");
  }
  ok("0 个反应式 / ΔG / EC 字段");

  // ---------- 5. 接口只允许 fao-act / ch-13 ----------
  if (!Array.isArray(data.interfaces) || data.interfaces.length !== 2) {
    fail(`接口应为 2 条，实际 ${data.interfaces?.length}`);
  }
  const ifaceIds = data.interfaces.map((i) => i.stepId);
  if (new Set(ifaceIds).size !== ifaceIds.length) fail("接口 stepId 有重复");
  if (ifaceIds.join(",") !== INTERFACE_IDS.join(",")) {
    fail(`接口只允许 ${INTERFACE_IDS.join(" / ")}，实际 ${ifaceIds.join(" / ")}`);
  }
  for (const it of data.interfaces) {
    if (!it.label || !it.label.trim()) fail(`接口 ${it.stepId}: 缺少 label`);
    if (!it.note || !it.note.trim()) fail(`接口 ${it.stepId}: 缺少 note`);
  }

  const faoStepIds = new Set([
    ...(faoSrc.steps || []).map((s) => s.id),
    ...(faoSrc.sideBranchSteps || []).map((s) => s.id),
  ]);
  const cholStepIds = new Set((cholSrc.steps || []).map((s) => s.id));
  if (!faoStepIds.has("fao-act")) fail("接口 fao-act 在 β-氧化数据中不存在");
  if (!cholStepIds.has("ch-13")) fail("接口 ch-13 在胆固醇数据中不存在");
  for (const id of ["fatty-acid-oxidation", "cholesterol", "lipoprotein"]) {
    if (!idxSrc.includes(`id: "${id}"`)) fail(`stepIndex 未登记 ${id}`);
  }
  ok("接口 2 条：fao-act（β-氧化）/ ch-13（胆固醇），两端真实存在且 stepIndex 已登记");

  // ---------- 6. 颗粒与组成账本 ----------
  const particles = data.particles || [];
  if (particles.length !== 8) fail(`颗粒应为 8 个，实际 ${particles.length}`);
  const particleNames = new Set(particles.map((p) => p.name));
  const particleIds = new Set(particles.map((p) => p.id));
  for (const [id, name] of [
    ["cm", "乳糜微粒"],
    ["cm-remnant", "CM 残粒"],
    ["vldl", "极低密度脂蛋白"],
    ["idl", "中密度脂蛋白"],
    ["ldl", "低密度脂蛋白"],
    ["hdl-nascent", "新生 HDL（盘状）"],
    ["hdl-mature", "成熟 HDL"],
    ["ffa", "游离脂肪酸"],
  ]) {
    if (!particleIds.has(id)) fail(`缺少颗粒 id ${id}`);
    if (!particleNames.has(name)) fail(`缺少颗粒名 ${name}`);
  }
  for (const p of particles) {
    if (!p.note || !p.note.trim()) fail(`颗粒 ${p.id}: 缺少 note`);
    if (/分子式|C\d+H\d+/.test(JSON.stringify(p))) fail(`颗粒 ${p.id} 被写成单一分子`);
  }

  const ledger = data.compositionLedger || {};
  if (!Array.isArray(ledger.rows) || ledger.rows.length !== 4) {
    fail(`颗粒组成账本应为 4 行，实际 ${ledger.rows?.length}`);
  }
  const ledgerIds = (ledger.rows || []).map((r) => r.id).join(",");
  if (ledgerIds !== "cm,vldl,ldl,hdl") fail(`账本行应为 CM / VLDL / LDL / HDL，实际 ${ledgerIds}`);
  if (!Array.isArray(ledger.columns) || ledger.columns.length !== 6) {
    fail(`账本应有 6 列，实际 ${ledger.columns?.length}`);
  }
  for (const row of ledger.rows || []) {
    for (const key of ["tg", "cholesterol", "phospholipid", "protein"]) {
      if (!LEDGER_LEVELS.has(row[key])) fail(`账本 ${row.id}.${key} 只能是 高 / 中 / 低，实际 ${row[key]}`);
    }
    if (!row.apolipoprotein || !row.apolipoprotein.trim()) fail(`账本 ${row.id}: 缺少载脂蛋白`);
  }
  if (!ledger.basis || !ledger.basis.includes("不写精确百分比")) {
    fail("账本 basis 必须明确“不写精确百分比”");
  }
  if (/%/.test(JSON.stringify(ledger.rows))) fail("账本不应出现精确百分比");
  ok("颗粒 8 个；组成账本 4 行 × 6 列，全部为定性高 / 中 / 低");

  // ---------- 7. 骨架：器官列 / 血浆带 / 节点 / chips / 越界 ----------
  const W = skel.canvas?.width;
  const H = skel.canvas?.height;
  if (W !== 1200 || H !== 820) fail(`画布应为 1200×820，实际 ${W}×${H}`);

  if (!Array.isArray(skel.organColumns) || skel.organColumns.length !== 4) {
    fail(`器官列应为 4 个，实际 ${skel.organColumns?.length}`);
  }
  const colIds = skel.organColumns.map((c) => c.id);
  for (const id of ORGAN_IDS) if (!colIds.includes(id)) fail(`缺少器官列 ${id}`);

  const compartments = skel.compartments || [];
  const compIds = new Set(compartments.map((c) => c.id));
  if (!compIds.has(skel.blood?.bandId)) fail("血浆带指向不存在的 compartment");
  if (!compIds.has("blood")) fail("缺少 blood 血浆带");
  if (compartments.filter((c) => c.id === "blood").length !== 1) fail("血浆带必须且只能有 1 条");
  if (compartments.length !== 5) fail(`compartment 应为 5 个（4 器官 + 血浆），实际 ${compartments.length}`);
  for (const c of compartments) {
    if (!(c.x0 >= 0 && c.y0 >= 0 && c.x1 <= W && c.y1 <= H && c.x1 > c.x0 && c.y1 > c.y0)) {
      fail(`compartment ${c.id} 越出画布`);
    }
  }

  if (!Array.isArray(skel.arms) || skel.arms.length !== 4) {
    fail(`器官臂应为 4 条，实际 ${skel.arms?.length}`);
  }
  const chipIds = [];
  for (const arm of skel.arms) {
    if (!ORGAN_IDS.includes(arm.organId)) fail(`器官臂 ${arm.organId} 非法`);
    for (const chip of arm.chips) chipIds.push(chip.stepId);
  }
  if (chipIds.length !== 11) fail(`chip 应为 11 个，实际 ${chipIds.length}`);
  if (new Set(chipIds).size !== chipIds.length) fail("chip stepId 有重复");
  for (const id of STEP_IDS) if (!chipIds.includes(id)) fail(`步骤 ${id} 没有 chip`);

  const stepById = new Map(data.steps.map((s) => [s.id, s]));
  const boxes = [];
  for (const arm of skel.arms) {
    for (const chip of arm.chips) {
      if (!ORGAN_IDS.includes(chip.organId) || chip.organId !== arm.organId) {
        fail(`chip ${chip.stepId} 的 organId 与所在臂不符`);
      }
      const step = stepById.get(chip.stepId);
      if (!step) continue;
      const b = chipBox(chip, step);
      if (b.left < 0 || b.right > W || b.top < 0 || b.bottom > H) {
        fail(`chip ${chip.stepId} 越出画布（${b.left.toFixed(0)}–${b.right.toFixed(0)}）`);
      }
      boxes.push({ id: chip.stepId, ...b });
    }
  }
  for (let i = 0; i < boxes.length; i += 1) {
    for (let j = i + 1; j < boxes.length; j += 1) {
      const a = boxes[i];
      const b = boxes[j];
      const overlapW = Math.min(a.right, b.right) - Math.max(a.left, b.left);
      const overlapH = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
      if (overlapW > 1 && overlapH > 1) fail(`chip ${a.id} 与 ${b.id} 压字`);
    }
  }

  if (!Array.isArray(skel.nodes) || skel.nodes.length !== 8) {
    fail(`颗粒节点应为 8 个，实际 ${skel.nodes?.length}`);
  }
  for (const n of skel.nodes) {
    if (!particleIds.has(n.particle)) fail(`节点 ${n.id}: 颗粒 ${n.particle} 不存在`);
    if (!STEP_IDS.includes(n.stepId)) fail(`节点 ${n.id}: stepId ${n.stepId} 不存在`);
    if (!(n.x - 16 >= 0 && n.x + 16 <= W && n.y - 16 >= 0 && n.y + 16 <= H)) {
      fail(`颗粒节点 ${n.id} 越出画布`);
    }
  }
  if (!new Set(skel.nodes.map((n) => n.particle)).has("cm-remnant")) fail("血浆带缺少 CM 残粒节点");
  if (!new Set(skel.nodes.map((n) => n.particle)).has("ffa")) fail("外周缺少 FFA 节点");
  ok(`骨架通过：4 器官列 / 1 血浆带 / 8 颗粒节点 / 11 chips，无越界、无压字`);

  // ---------- 8. 血流路径与方向 ----------
  const flows = skel.flows || [];
  if (flows.length !== 9) fail(`血浆带颗粒流应为 9 条，实际 ${flows.length}`);
  const xOfFirst = (d) => Number(d.match(/M\s*(-?\d+(\.\d+)?)/)?.[1]);
  const xOfLast = (d) => {
    const nums = [...d.matchAll(/L\s*(-?\d+(\.\d+)?)\s+(-?\d+(\.\d+)?)/g)];
    return nums.length ? Number(nums[nums.length - 1][1]) : NaN;
  };
  const endpoints = new Set([...ORGAN_IDS, ...particleIds, "blood"]);
  for (const f of flows) {
    if (!endpoints.has(f.from)) fail(`flow ${f.id}: from 非法 ${f.from}`);
    if (!endpoints.has(f.to)) fail(`flow ${f.id}: to 非法 ${f.to}`);
    if (!(f.particle && f.particle.trim())) fail(`flow ${f.id}: 缺少 particle`);
    if (!(f.label && f.label.trim())) fail(`flow ${f.id}: 缺少 label`);
    if (!["ltr", "rtl", "bidirectional"].includes(f.direction)) fail(`flow ${f.id}: direction 非法`);
    const x0 = xOfFirst(f.path);
    const x1 = xOfLast(f.path);
    if (!Number.isFinite(x0) || !Number.isFinite(x1)) fail(`flow ${f.id}: path 不合法`);
    if (f.direction === "ltr" && !(x0 < x1)) fail(`flow ${f.id}: 标 ltr 但路径 ${x0}→${x1}`);
    if (f.direction === "rtl" && !(x0 > x1)) fail(`flow ${f.id}: 标 rtl 但路径 ${x0}→${x1}`);
    if (f.labelX < 0 || f.labelX > W || f.labelY < 0 || f.labelY > H) fail(`flow ${f.id}: 标签越界`);
  }
  ok(`血浆带 9 条颗粒流，方向与路径一致`);

  // ---------- 9. 2D-only / 教材依据 ----------
  if (data.threeD?.status !== "not-built") fail(`threeD.status 必须是 not-built，实际 ${data.threeD?.status}`);
  if (!/3D/.test(data.threeD?.note || "")) fail("threeD.note 需说明 2D-only 口径");
  if (/PDB/i.test(JSON.stringify(data)) && !/不登记 PDB/.test(data.threeD?.note || "")) {
    fail("数据提到 PDB 但未明确“不登记 PDB”");
  }
  if (/\/assets\/steps\//.test(JSON.stringify(data) + JSON.stringify(skel))) {
    fail("物流图不应出现 /assets/steps/ 分子资产路径");
  }
  if (data.textbook !== "《生物化学与分子生物学》第 9 版 · 脂质代谢（血浆脂蛋白代谢）") {
    fail(`教材依据不符：${data.textbook}`);
  }
  ok("2D-only：threeD.status=not-built，不登记 PDB，无分子资产路径");

  return { errors, notes };
}

// ---------- 正例 ----------
const positive = check(baseData, baseSkel, fao, cholesterol, stepIndexSrc);
if (positive.errors.length) {
  console.error("validate-lipoprotein 失败：");
  for (const e of positive.errors) console.error("  ✗ " + e);
  process.exit(1);
}
console.log("validate-lipoprotein ✓");
for (const n of positive.notes) console.log("  · " + n);

// ---------- 负例自检 ----------
const clone = (x) => JSON.parse(JSON.stringify(x));
const run = (data, skel) => check(data, skel, fao, cholesterol, stepIndexSrc);
const cases = [
  {
    name: "负例 1：删掉 lp-9 一步",
    run: () => {
      const d = clone(baseData);
      d.steps = d.steps.filter((s) => s.id !== "lp-9");
      return run(d, clone(baseSkel));
    },
  },
  {
    name: "负例 2：接口改成伪造的 lpl 步骤 id",
    run: () => {
      const d = clone(baseData);
      d.interfaces[0].stepId = "lpl";
      return run(d, clone(baseSkel));
    },
  },
  {
    name: "负例 3：接口改成站内不存在的 lp-2",
    run: () => {
      const d = clone(baseData);
      d.interfaces[1].stepId = "lp-2";
      return run(d, clone(baseSkel));
    },
  },
  {
    name: "负例 4：把颗粒当单一分子写 formula",
    run: () => {
      const d = clone(baseData);
      d.particles[0].formula = "C55H100O6";
      return run(d, clone(baseSkel));
    },
  },
  {
    name: "负例 5：threeD.status 改成 pending（偷偷加 3D）",
    run: () => {
      const d = clone(baseData);
      d.threeD.status = "pending";
      return run(d, clone(baseSkel));
    },
  },
  {
    name: "负例 6：chip 越出画布",
    run: () => {
      const s = clone(baseSkel);
      s.arms[0].chips[0].x = 1300;
      return run(clone(baseData), s);
    },
  },
  {
    name: "负例 7：颗粒节点越出画布",
    run: () => {
      const s = clone(baseSkel);
      s.nodes[0].x = 1300;
      return run(clone(baseData), s);
    },
  },
  {
    name: "负例 8：chip 重复、漏掉 lp-11",
    run: () => {
      const s = clone(baseSkel);
      s.arms[3].chips[0].stepId = "lp-1";
      return run(clone(baseData), s);
    },
  },
  {
    name: "负例 9：组成账本只剩 3 行",
    run: () => {
      const d = clone(baseData);
      d.compositionLedger.rows.pop();
      return run(d, clone(baseSkel));
    },
  },
  {
    name: "负例 10：某步 detail 被清空",
    run: () => {
      const d = clone(baseData);
      d.steps[4].detail = "";
      return run(d, clone(baseSkel));
    },
  },
  {
    name: "负例 11：某步偷偷写反应式 equation",
    run: () => {
      const d = clone(baseData);
      d.steps[1].equation = "TG → FFA + 甘油";
      return run(d, clone(baseSkel));
    },
  },
  {
    name: "负例 12：note 里写 ΔG 数值",
    run: () => {
      const d = clone(baseData);
      d.steps[3].note += "（ΔG = -30.5 kJ/mol）";
      return run(d, clone(baseSkel));
    },
  },
  {
    name: "负例 13：教材依据被清空",
    run: () => {
      const d = clone(baseData);
      d.textbook = "";
      return run(d, clone(baseSkel));
    },
  },
  {
    name: "负例 14：血流方向与路径相反",
    run: () => {
      const s = clone(baseSkel);
      const f = s.flows.find((x) => x.id === "cm-to-blood");
      f.direction = "rtl";
      return run(clone(baseData), s);
    },
  },
  {
    name: "负例 15：两个 chip 压在一起",
    run: () => {
      const s = clone(baseSkel);
      s.arms[1].chips[1].y = s.arms[1].chips[0].y;
      return run(clone(baseData), s);
    },
  },
  {
    name: "负例 16：chips 数量不足（删一个 chip）",
    run: () => {
      const s = clone(baseSkel);
      s.arms[2].chips.pop();
      return run(clone(baseData), s);
    },
  },
];

let missed = 0;
for (const c of cases) {
  const r = c.run();
  if (r.errors.length) console.log(`✓ ${c.name} 被抓（${r.errors.length} 条错误）`);
  else {
    missed += 1;
    console.error(`✗ ${c.name} 没有被抓——校验器有漏洞`);
  }
}
if (missed) process.exit(1);
console.log(`✓ 负例自检 ${cases.length}/${cases.length} 全部被抓`);
