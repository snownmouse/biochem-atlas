#!/usr/bin/env node
// 脂肪酸 β-氧化数据层校验器（本切片自检用，不接页面）。
//
// 正例五组检查：
//   ① id 唯一（entities + steps + nodes 合并命名空间）
//   ② 循环四步首尾相接：第 4 步产物 ⊇ 第 1 步底物；骨架上从 acylcoa 走 4 段主弧
//      到 acylcoa-short，并由 cycle-return 弧闭合、cycle-exit 弧出乙酰-CoA
//   ③ 肉碱穿梭节点泳道归属：胞质 → 外膜（CPT1/脂酰肉碱）→ 内膜（CACT/CPT2）→ 基质
//   ④ 碳数守恒 + 账本算术：Cₙ → (n/2)×C₂，轮数 = n/2 − 1；每轮 1 FADH₂ + 1 NADH；
//      毛 ATP = 8×10 + 7×1.5 + 7×2.5；净 = 毛 − 活化 2 键；P/O 必须为现代 2.5/1.5
//   ⑤ 无伪造资产路径（本切片未接页面、未做资产，出现 assets/ 即报错）
//   附加：引用完整性（实体/节点/步骤）、泳道带不重叠、节点落在所属泳道与画布内
//
// 负例纪律：内置 9 个负例自检，每个都必须被抓到（check 报 ≥1 错），
// 任一负例漏报 → 本脚本 exit 1。不接受永远返回绿的校验器。
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const faoPath = join(root, "src/data/fatty-acid-oxidation/fao.json");
const skelPath = join(root, "src/data/fatty-acid-oxidation/skeleton.json");
const fao = JSON.parse(readFileSync(faoPath, "utf8"));
const skel = JSON.parse(readFileSync(skelPath, "utf8"));

const clone = (x) => JSON.parse(JSON.stringify(x));

/**
 * @param {{fao: object, skel: object}} d
 * @returns {string[]} 错误列表（空 = 通过）
 */
function check(d) {
  const errors = [];
  const push = (msg) => errors.push(msg);
  const steps = Object.fromEntries(d.fao.steps.map((s) => [s.id, s]));
  const nodeById = new Map(d.skel.nodes.map((n) => [n.id, n]));
  const entityIds = new Set(d.fao.entities.map((e) => e.id));
  const laneById = new Map(d.skel.compartments.map((c) => [c.id, c]));

  // ① id 唯一（三张表各自命名空间内唯一）
  for (const [listName, list] of [["entities", d.fao.entities], ["steps", d.fao.steps], ["nodes", d.skel.nodes]]) {
    const s = new Set();
    for (const item of list) {
      if (s.has(item.id)) push(`${listName} 内 id 重复：${item.id}`);
      s.add(item.id);
    }
  }

  // ② 循环四步首尾相接（碳载体 acylcoa 闭合；FAD/NAD⁺ 等辅因子不属于链闭合语义）
  const ringStepIds = ["fao-1", "fao-2", "fao-3", "fao-4"];
  const s1 = steps["fao-1"];
  const s4 = steps["fao-4"];
  if (!s1 || !s4) {
    push("缺循环步 fao-1 / fao-4");
  } else {
    if (!s1.substrates.includes("acylcoa")) {
      push("第 1 步底物缺碳载体 acylcoa");
    }
    if (!s4.products.includes("acylcoa")) {
      push("循环断口：第 4 步产物缺 acylcoa（链未交回下一轮第 1 步）");
    }
    for (const p of s4.products) {
      if (p !== "accoa" && !s1.substrates.includes(p)) {
        push(`循环断口：第 4 步产物 ${p}（乙酰-CoA 以外）不回到第 1 步底物`);
      }
    }
    if (s4.kind !== "cycle" || !s4.products.includes("accoa")) {
      push("第 4 步应为循环步且产物含乙酰-CoA（accoa）");
    }
  }
  for (const id of ringStepIds) {
    const s = steps[id];
    if (!s) {
      push(`缺循环步 ${id}`);
      continue;
    }
    if (s.kind !== "cycle") push(`${id} 的 kind 应为 cycle，实际 ${s.kind}`);
  }
  // 每轮净产出 = 四步分摊之和，合计必须为 1 FADH₂ + 1 NADH + 1 乙酰-CoA
  const yieldSum = { fadh2: 0, nadh: 0, acetylCoA: 0 };
  for (const id of ringStepIds) {
    const y = steps[id]?.perRoundYield;
    if (!y) {
      push(`${id} 缺 perRoundYield`);
      continue;
    }
    yieldSum.fadh2 += y.fadh2;
    yieldSum.nadh += y.nadh;
    yieldSum.acetylCoA += y.acetylCoA;
  }
  if (yieldSum.fadh2 !== 1 || yieldSum.nadh !== 1 || yieldSum.acetylCoA !== 1) {
    push(
      `每轮净产出应为 1 FADH₂ + 1 NADH + 1 乙酰-CoA，四步求和实际 FADH₂=${yieldSum.fadh2} / NADH=${yieldSum.nadh} / 乙酰-CoA=${yieldSum.acetylCoA}`
    );
  }
  const ringLinks = d.skel.links.filter((l) => ringStepIds.includes(l.stepId));
  if (ringLinks.length !== 4) {
    push(`环主弧应为 4 段（fao-1…fao-4），实际 ${ringLinks.length} 段`);
  }
  let cur = "acylcoa";
  for (let i = 0; i < 4; i++) {
    const l = d.skel.links.find(
      (l) => ringStepIds.includes(l.stepId) && l.from === cur
    );
    if (!l) {
      push(`环走查在第 ${i + 1} 段断链：找不到从 ${cur} 出发的主弧`);
      cur = null;
      break;
    }
    cur = l.to;
  }
  if (cur === "acylcoa-short") {
    const ret = d.skel.links.find(
      (l) =>
        l.from === "acylcoa-short" && l.to === "acylcoa" && l.type === "cycle-return"
    );
    if (!ret) push("缺回流弧 acylcoa-short→acylcoa（type=cycle-return），环未闭合");
    else if (!/第 5 轮/.test(ret.label || "")) {
      push("回流弧 label 未标『第 5 轮』语义（须防误读为第 5 步）");
    }
  } else if (cur !== null) {
    push(`环走查 4 段后终点应为 acylcoa-short，实际 ${cur}`);
  }
  if (!d.skel.links.some((l) => l.from === "keto" && l.to === "accoa" && l.type === "cycle-exit")) {
    push("缺乙酰-CoA 出口弧 keto→accoa（type=cycle-exit）");
  }

  // ③ 肉碱穿梭节点泳道归属
  const expectLane = {
    "acylcoa-cyt": "cytosol",
    acs: "mito-outer-membrane",
    cpt1: "mito-outer-membrane",
    acylcarn: "mito-outer-membrane",
    cact: "mito-inner-membrane",
    cpt2: "mito-inner-membrane",
    acylcoa: "mito-matrix",
  };
  for (const [id, lane] of Object.entries(expectLane)) {
    const n = nodeById.get(id);
    if (!n) push(`缺穿梭/活化节点 ${id}`);
    else if (n.compartment !== lane) {
      push(`节点 ${id} 泳道应为 ${lane}，实际 ${n.compartment}`);
    }
  }
  const ts = d.skel.transportSteps.find((t) => t.id === "fao-shuttle");
  if (!ts) push("缺 transportSteps: fao-shuttle");
  else {
    const want = ["cytosol", "mito-outer-membrane", "mito-matrix"];
    for (const [key, lane] of [["from", want[0]], ["via", want[1]], ["to", want[2]]]) {
      const n = nodeById.get(ts[key]);
      if (!n) push(`fao-shuttle.${key} 引用未知节点 ${ts[key]}`);
      else if (n.compartment !== lane) {
        push(`fao-shuttle ${key} 节点 ${ts[key]} 应在 ${lane}，实际 ${n.compartment}`);
      }
    }
  }

  // ④ 碳数守恒 + 账本算术（唯一能算术验伪的地方）
  const led = d.fao.energyLedger;
  const C = led?.palmitate?.carbons;
  if (!Number.isInteger(C) || C < 4 || C % 2 !== 0) {
    push(`底物碳数 ${C} 非法（须为 ≥4 的偶数）`);
  } else {
    const rounds = C / 2 - 1;
    const accoa = C / 2;
    const P = led.palmitate;
    if (P.rounds !== rounds) push(`账本轮数 ${P.rounds} ≠ C${C} 应跑 ${rounds} 轮`);
    if (P.acetylCoA !== accoa)
      push(`碳守恒失败：C${C} 应产 ${accoa}×C2，账面乙酰-CoA = ${P.acetylCoA}`);
    if (P.acetylCoA * 2 !== C)
      push(`碳原子数对不上：${P.acetylCoA}×2 ≠ 底物 ${C}C`);
    if (P.fadh2 !== rounds || P.nadh !== rounds)
      push(`还原当量与轮数不符：应为各 ${rounds}，账面 FADH₂=${P.fadh2} / NADH=${P.nadh}`);
    const po = led.poBasis;
    if (po.nadh !== 2.5 || po.fadh2 !== 1.5)
      push(`P/O 口径必须为现代 2.5/1.5（与 TCA 档案同版本），实际 ${po.nadh}/${po.fadh2}`);
    if (po.accoaViaTca !== 10) push("乙酰-CoA→TCA 应为 10 ATP（同口径）");
    const gross = accoa * po.accoaViaTca + rounds * po.fadh2 + rounds * po.nadh;
    const t = led.totals;
    if (Math.abs(t.grossAtp - gross) > 1e-9)
      push(`毛账 ${t.grossAtp} ≠ 复算 ${gross}（${accoa}×10 + ${rounds}×1.5 + ${rounds}×2.5）`);
    if (t.activationCost !== P.activationHighEnergyBonds)
      push("活化代价字段与高能键数不一致");
    if (Math.abs(t.netAtp - (t.grossAtp - P.activationHighEnergyBonds)) > 1e-9)
      push(`净账不成立：${t.netAtp} ≠ 毛 ${t.grossAtp} − 活化 ${P.activationHighEnergyBonds}`);
    for (const [pat, what] of [
      [`${accoa} 乙酰-CoA`, "乙酰-CoA 计数"],
      [`${rounds} FADH₂`, "FADH₂ 计数"],
      [`${rounds} NADH`, "NADH 计数"],
      [`${rounds} FAD`, "FAD 消耗计数"],
    ]) {
      if (!String(led.netEquation || "").includes(pat)) {
        push(`netEquation 缺 ${what}（应含「${pat}」）`);
      }
    }
  }

  // ⑤ 无伪造资产路径（含 threeD 候选登记，本切片不产任何资产）
  const blob = JSON.stringify(d.fao) + JSON.stringify(d.skel);
  const m = blob.match(/[\w./-]*assets\/[\w./-]*/i);
  if (m) push(`出现伪造资产路径：${m[0]}（本切片未接页面、未做资产，一律禁止）`);

  // 附加：引用完整性 + 泳道几何 + 节点落带
  for (const s of d.fao.steps) {
    if (!entityIds.has(s.enzyme?.entityId)) {
      push(`步骤 ${s.id} 酶引用未知实体 ${s.enzyme?.entityId}`);
    }
    for (const id of [...(s.substrates || []), ...(s.products || [])]) {
      if (!entityIds.has(id)) push(`步骤 ${s.id} 引用未知实体 ${id}`);
    }
  }
  for (const n of d.skel.nodes) {
    if (n.entityId && !entityIds.has(n.entityId)) {
      push(`节点 ${n.id} 引用未知实体 ${n.entityId}`);
    }
  }
  for (const l of d.skel.links) {
    if (!nodeById.has(l.from)) push(`link 起点未知节点 ${l.from}`);
    if (!nodeById.has(l.to)) push(`link 终点未知节点 ${l.to}`);
    if (l.stepId && !steps[l.stepId]) push(`link 引用未知步骤 ${l.stepId}`);
  }
  const lanes = [...d.skel.compartments].sort((a, b) => a.band.y0 - b.band.y0);
  for (let i = 1; i < lanes.length; i++) {
    if (lanes[i].band.y0 < lanes[i - 1].band.y1) {
      push(`泳道带重叠：${lanes[i - 1].id}[${lanes[i - 1].band.y0},${lanes[i - 1].band.y1}] 与 ${lanes[i].id}[${lanes[i].band.y0},${lanes[i].band.y1}]`);
    }
  }
  for (const n of d.skel.nodes) {
    const lane = laneById.get(n.compartment);
    if (!lane) {
      push(`节点 ${n.id} 泳道 ${n.compartment} 未在 compartments 定义`);
      continue;
    }
    const b = lane.band;
    if (n.y < b.y0 || n.y > b.y1) {
      push(`节点 ${n.id}(y=${n.y}) 越出泳道 ${lane.id} [${b.y0},${b.y1}]`);
    }
    if (b.x0 != null && (n.x < b.x0 || n.x > b.x1)) {
      push(`节点 ${n.id}(x=${n.x}) 越出泳道 ${lane.id} 横向范围 [${b.x0},${b.x1}]`);
    }
    if (n.x < 0 || n.x > d.skel.canvas.width || n.y < 0 || n.y > d.skel.canvas.height) {
      push(`节点 ${n.id} 越出画布 ${d.skel.canvas.width}×${d.skel.canvas.height}`);
    }
  }
  return errors;
}

// ---------- 负例自检：每个都必须被抓到 ----------

/** @type {[string, (d: {fao: object, skel: object}) => void][]} */
const negatives = [
  [
    "重复节点 id",
    (d) => {
      d.skel.nodes.push({ ...d.skel.nodes[0] });
    },
  ],
  [
    "循环断口：第 4 步产物丢掉 acylcoa（首尾不相接）",
    (d) => {
      d.fao.steps.find((s) => s.id === "fao-4").products = ["accoa"];
    },
  ],
  [
    "CPT2 节点被画进基质泳道（跨膜机器泳道错误）",
    (d) => {
      d.skel.nodes.find((n) => n.id === "cpt2").compartment = "mito-matrix";
    },
  ],
  [
    "脂酰肉碱节点被画进基质泳道（穿梭中转站泳道错误）",
    (d) => {
      d.skel.nodes.find((n) => n.id === "acylcarn").compartment = "mito-matrix";
    },
  ],
  [
    "碳守恒：账本轮数 7 改 8（乙酰-CoA/还原当量随之对不上）",
    (d) => {
      d.fao.energyLedger.palmitate.rounds = 8;
    },
  ],
  [
    "碳守恒：乙酰-CoA 计数 8 改 7（碳原子数对不上）",
    (d) => {
      d.fao.energyLedger.palmitate.acetylCoA = 7;
    },
  ],
  [
    "伪造资产路径混入 threeD 登记",
    (d) => {
      d.fao.steps.find((s) => s.id === "fao-1").threeD.note +=
        "（资产已就绪：public/assets/steps/fao-1.json）";
    },
  ],
  [
    "link 指向不存在的节点",
    (d) => {
      d.skel.links.push({ from: "ghost-node", to: "acylcoa", type: "main" });
    },
  ],
  [
    "泳道带重叠（内膜 y0 压进外膜带）",
    (d) => {
      d.skel.compartments.find((c) => c.id === "mito-inner-membrane").band.y0 = 200;
    },
  ],
];

// ---------- 主流程 ----------

const positiveErrors = check(clone({ fao, skel }));
const problems = [];
if (positiveErrors.length > 0) {
  problems.push(`正例数据未通过校验（${positiveErrors.length} 项）：\n  ${positiveErrors.join("\n  ")}`);
}
let caught = 0;
for (const [name, mutate] of negatives) {
  const mutated = clone({ fao, skel });
  mutate(mutated);
  const errs = check(mutated);
  if (errs.length === 0) {
    problems.push(`负例『${name}』未被检出（校验器漏报）——不接受永远绿的校验器`);
  } else {
    caught++;
    console.log(`  负例被抓：${name}`);
    console.log(`    └ ${errs[0]}`);
  }
}
if (problems.length > 0) {
  console.error(`\nvalidate-fao ✗`);
  for (const p of problems) console.error(`  ${p}`);
  process.exit(1);
}
console.log(
  `validate-fao ✓ 正例 0 错误；负例 ${caught}/${negatives.length} 全部被抓（exit 1 路径已验证）`
);
