// Cori 循环数据校验：引用必须真实存在、账本必须按加法可验、不得出现复制的反应式。
// 运行：node tools/validate-cori.mjs

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "..");
const read = (p) => JSON.parse(readFileSync(resolve(root, p), "utf8"));

const cori = read("src/data/cori/cori.json");
const skel = read("src/data/cori/skeleton.json");
const gly = read("src/data/glycolysis.json");
const glu = read("src/data/gluconeogenesis/gluconeogenesis.json");
const gluSkel = read("src/data/gluconeogenesis/skeleton.json");

const errors = [];
const notes = [];
const fail = (msg) => errors.push(msg);
const ok = (msg) => notes.push(msg);

const sourceStepIds = {
  glycolysis: new Set([
    ...gly.steps.map((s) => s.id),
    ...(gly.sideBranchSteps || []).map((s) => s.id),
  ]),
  gluconeogenesis: new Set([
    ...glu.steps.map((s) => s.id),
    ...(glu.sideBranchSteps || []).map((s) => s.id),
    ...gluSkel.transportSteps.map((s) => s.id),
  ]),
};

const sourceStepById = {
  glycolysis: new Map([
    ...gly.steps.map((s) => [s.id, s]),
    ...(gly.sideBranchSteps || []).map((s) => [s.id, s]),
  ]),
  gluconeogenesis: new Map([
    ...glu.steps.map((s) => [s.id, s]),
    ...(glu.sideBranchSteps || []).map((s) => [s.id, s]),
    ...gluSkel.transportSteps.map((s) => [s.id, s]),
  ]),
};

// ---------- 1. 引用存在性 ----------

const armStepIds = new Set();
let referenceCount = 0;
for (const arm of cori.arms) {
  if (arm.steps.length > 8) {
    fail(`臂 ${arm.organId} 引用步 ${arm.steps.length} 条，超过“骨架步”上限 8`);
  }
  for (const step of arm.steps) {
    if (armStepIds.has(step.id)) fail(`引用步 id 重复：${step.id}`);
    armStepIds.add(step.id);
    referenceCount += 1;

    if (step.kind === "transport") {
      if (step.source) fail(`转运步 ${step.id} 不应有 source（它不属于既有两条通路）`);
      continue;
    }
    if (!step.source) {
      fail(`引用步 ${step.id} 缺少 source`);
      continue;
    }
    const { pathway, stepId, direction } = step.source;
    if (pathway !== "glycolysis" && pathway !== "gluconeogenesis") {
      fail(`${step.id}: 非法来源通路 ${pathway}`);
      continue;
    }
    if (!sourceStepIds[pathway].has(stepId)) {
      fail(`${step.id}: 引用了不存在的步 ${pathway}:${stepId}`);
      continue;
    }
    if (!["forward", "reverse"].includes(direction)) {
      fail(`${step.id}: direction 必须是 forward / reverse`);
    }
    if (direction === "reverse" && stepId !== "gn-cori") {
      fail(`${step.id}: 当前只允许 gn-cori 反向引用（肌肉侧 LDH）`);
    }
  }
}

if (referenceCount !== cori.thesis.referenceCount) {
  fail(`thesis.referenceCount=${cori.thesis.referenceCount}，实际引用 ${referenceCount}`);
}
if (cori.thesis.equationCount !== 0) fail("thesis.equationCount 必须是 0");
if (cori.plateNo !== "PLATE 07 / 12") fail(`主挂图编号应为 PLATE 07 / 12，实际 ${cori.plateNo}`);
ok(`引用步 ${referenceCount} 条，全部命中既有通路数据；编号 ${cori.plateNo}`);

// ---------- 2. 不得复制反应式 / 酶字段 ----------

const forbiddenKeys = ["equation", "reaction", "formula", "enzyme", "substrates", "products", "significance"];
const walk = (v, path = "") => {
  if (Array.isArray(v)) return v.forEach((x, i) => walk(x, `${path}[${i}]`));
  if (v && typeof v === "object") {
    for (const [k, x] of Object.entries(v)) {
      if (forbiddenKeys.includes(k)) fail(`cori.json 出现禁用的复制字段 ${path}.${k}`);
      walk(x, `${path}.${k}`);
    }
  }
};
walk(cori);

const coriText = JSON.stringify(cori);
for (const [pathway, map] of Object.entries(sourceStepById)) {
  for (const [id, step] of map) {
    for (const key of ["equation", "reaction"]) {
      const eq = step[key];
      if (typeof eq === "string" && eq.trim() && coriText.includes(eq)) {
        fail(`cori.json 直接复制了 ${pathway}:${id} 的 ${key}`);
      }
    }
  }
}
ok("0 条复制自糖酵解 / 糖异生的反应式或酶字段");

// ---------- 3. 能量账本加法 ----------

const localStepIds = new Set([...armStepIds, ...cori.connectors.map((c) => c.id)]);
const resolveLedgerSource = (src, id) => {
  if (!src) return fail(`${id}: 账本条目缺少 source`);
  if (src.pathway === "cori") {
    if (!localStepIds.has(src.stepId)) fail(`${id}: 指向不存在的本地引用步 ${src.stepId}`);
    return;
  }
  if (!sourceStepIds[src.pathway]?.has(src.stepId)) {
    fail(`${id}: 账本条目指向不存在的步 ${src.pathway}:${src.stepId}`);
  }
};

const sums = { muscle: { ATP: 0, GTP: 0, NADH: 0 }, liver: { ATP: 0, GTP: 0, NADH: 0 } };
for (const e of cori.energyLedger.entries) {
  if (!["muscle", "liver"].includes(e.arm)) fail(`${e.id}: arm 非法 ${e.arm}`);
  if (!["ATP", "GTP", "NADH"].includes(e.item)) fail(`${e.id}: item 非法 ${e.item}`);
  if (![1, -1].includes(e.sign)) fail(`${e.id}: sign 必须是 ±1`);
  if (!Number.isInteger(e.count) || e.count <= 0) fail(`${e.id}: count 必须是正整数`);
  resolveLedgerSource(e.source, e.id);
  sums[e.arm][e.item] += e.sign * e.count;
}

const muscleATP = sums.muscle.ATP;
const liverHighEnergy = sums.liver.ATP + sums.liver.GTP;
const wholeHighEnergy = muscleATP + liverHighEnergy;
const totals = Object.fromEntries(
  cori.energyLedger.totals.map((t) => [`${t.arm}:${t.item}`, t.net]),
);
const expect = {
  "muscle:ATP": muscleATP,
  "liver:highEnergyPhosphate": liverHighEnergy,
  "whole:highEnergyPhosphate": wholeHighEnergy,
};
for (const [k, v] of Object.entries(expect)) {
  if (totals[k] !== v) fail(`账本汇总 ${k} 声明 ${totals[k]}，实际算出 ${v}`);
}
if (muscleATP !== 2) fail(`肌肉净 ATP 应为 +2，实际 ${muscleATP}`);
if (liverHighEnergy !== -6) fail(`肝应消耗 6 个高能键，实际 ${liverHighEnergy}`);
if (wholeHighEnergy !== -4) fail(`整轮应净耗 4 个高能键，实际 ${wholeHighEnergy}`);
if (Math.abs(wholeHighEnergy) !== 4) fail("整轮净耗不等于 4");
if (cori.energyLedger.entries.some((e) => e.item === "NADH")) {
  fail("NADH 不应混入高能磷酸键账本（另见 redoxLedger）");
}
ok(`账本加法通过：肌肉 +${muscleATP}，肝 ${liverHighEnergy}，全身 ${wholeHighEnergy}`);

// ---------- 4. 氧化还原账 ----------

for (const r of cori.redoxLedger.entries) {
  resolveLedgerSource(r.produced.source, `${r.arm}-produced`);
  resolveLedgerSource(r.consumed.source, `${r.arm}-consumed`);
  const net = r.produced.count - r.consumed.count;
  if (net !== r.net) fail(`${r.arm} NADH 净额声明 ${r.net}，实际 ${net}`);
  if (r.net !== 0) fail(`${r.arm} NADH 净额应为 0`);
}
if (!cori.redoxLedger.statement.includes("净变化为 0")) {
  fail("redoxLedger.statement 未明确写出 NADH 净变化为 0");
}
ok("氧化还原账通过：两条臂 NADH 均为 +2 / −2，净 0");

// ---------- 5. 血流方向 ----------

if (cori.blood.lactate.direction !== "rtl") fail("乳酸方向必须是 right-to-left");
if (cori.blood.glucose.direction !== "ltr") fail("葡萄糖方向必须是 left-to-right");

const xOfFirst = (d) => Number(d.match(/M\s*(-?\d+(\.\d+)?)/)?.[1]);
const xOfLast = (d) => {
  const nums = [...d.matchAll(/L\s*(-?\d+(\.\d+)?)\s+(-?\d+(\.\d+)?)/g)];
  return nums.length ? Number(nums[nums.length - 1][1]) : NaN;
};
const lacX0 = xOfFirst(skel.blood.lactate.path);
const lacX1 = xOfLast(skel.blood.lactate.path);
const glcX0 = xOfFirst(skel.blood.glucose.path);
const glcX1 = xOfLast(skel.blood.glucose.path);
if (!(lacX0 > lacX1)) fail(`乳酸路径不是右→左（${lacX0} → ${lacX1}）`);
if (!(glcX0 < glcX1)) fail(`葡萄糖路径不是左→右（${glcX0} → ${glcX1}）`);
ok(`血流方向通过：乳酸 ${lacX0}→${lacX1}，葡萄糖 ${glcX0}→${glcX1}`);

// ---------- 6. 骨架与引用一一对应 ----------

const skeletonChipIds = new Set();
for (const arm of skel.arms) {
  if (!cori.arms.some((a) => a.organId === arm.organId)) {
    fail(`骨架臂 ${arm.organId} 在 cori.json 中没有对应臂`);
  }
  for (const chip of arm.chips) {
    if (!armStepIds.has(chip.stepId)) fail(`骨架 chip 指向不存在的引用步 ${chip.stepId}`);
    if (skeletonChipIds.has(chip.stepId)) fail(`骨架 chip 重复 ${chip.stepId}`);
    skeletonChipIds.add(chip.stepId);
  }
}
for (const id of armStepIds) {
  if (!skeletonChipIds.has(id)) fail(`引用步 ${id} 没有骨架位置`);
}

for (const node of skel.nodes) {
  if (!armStepIds.has(node.stepId)) fail(`节点 ${node.id} 指向不存在的引用步 ${node.stepId}`);
}
for (const col of skel.organColumns) {
  if (!cori.arms.some((a) => a.organId === col.id)) fail(`器官列 ${col.id} 无对应臂`);
}

const bandIds = new Set(skel.compartments.map((c) => c.id));
if (!bandIds.has(skel.blood.bandId)) fail("血液带指向不存在的 compartment");
if (!bandIds.has("liver-cytosol") || !bandIds.has("liver-matrix")) fail("缺少肝的胞质 / 线粒体带");
if (!bandIds.has("muscle-cytosol")) fail("缺少肌胞质带");
ok(`骨架一一对应：${skeletonChipIds.size} 个引用步全部有位置`);

// ---------- 7. 3D 纪律与器官 ----------

if (cori.threeD.status !== "pending") fail("整循环 3D 必须是 pending");
const allText = JSON.stringify(cori) + JSON.stringify(skel);
if (/\/assets\/steps\//.test(allText)) fail("Cori 数据不应出现任何 /assets/steps/ 资产路径");
if (!/3D/.test(cori.threeD.note)) fail("threeD.note 需说明为何不做 3D");

const organIds = new Set(cori.organs.map((o) => o.id));
if (!organIds.has("muscle") || !organIds.has("liver")) fail("必须包含 muscle 与 liver 两个器官");
if (!organIds.has("rbc")) fail("红细胞应作为第三来源单列");
ok("3D 纪律与器官集合通过");

// ---------- 输出 ----------

if (errors.length) {
  console.error("validate-cori 失败：");
  for (const e of errors) console.error("  ✗ " + e);
  process.exit(1);
}
console.log("validate-cori ✓");
for (const n of notes) console.log("  · " + n);
