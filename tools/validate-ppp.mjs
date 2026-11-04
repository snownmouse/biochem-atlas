// 戊糖磷酸通路（PPP）数据层校验器。
// 用法：
//   node tools/validate-ppp.mjs           # 正例校验 + 7 个负例自检（负例必须全被抓）
// 退出码：0 = 正例 0 错且负例全被抓；1 = 任何失败。
//
// 校验内容：
//   ① id 唯一性与引用完整性（实体/步骤/mode/interface/节点/链接）
//   ② 氧化相碳数递减：C6→C6→C6→C5，脱羧步净 -1 且产出 CO₂
//   ③ 非氧化相碳守恒：3×C5 → 2×C6 + 1×C3（15=15），TK/TA 基团转移碳数逐条验算
//   ④ 糖酵解接口指向真实存在（只读 src/data/glycolysis.json）
//   ⑤ 无伪造 assets/ 路径（本切片纯数据层，不产生任何资产）

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const ROOT = new URL("..", import.meta.url);
const readJson = (rel) => JSON.parse(readFileSync(new URL(rel, ROOT), "utf8"));

const ppp = readJson("src/data/ppp/ppp.json");
const skeleton = readJson("src/data/ppp/skeleton.json");
// glycolysis.json 只读校验，绝不写回
const gly = readJson("src/data/glycolysis.json");

// ---------- 工具 ----------

const carbonOf = (pppData, entityId) => {
  const e = pppData.entities.find((x) => x.id === entityId);
  return e ? e.carbons : undefined;
};

const listCarbons = (pppData, ids) => {
  let sum = 0;
  for (const id of ids) {
    const c = carbonOf(pppData, id);
    if (typeof c !== "number") return null; // 非代谢物或碳数缺失
    sum += c;
  }
  return sum;
};

const recordCarbons = (pppData, record) => {
  let sum = 0;
  for (const [id, n] of Object.entries(record)) {
    const c = carbonOf(pppData, id);
    if (typeof c !== "number") return null;
    sum += c * n;
  }
  return sum;
};

// ---------- 校验 ①：id 唯一性与引用完整性 ----------

function checkIds(p, sk) {
  const errs = [];
  const uniq = (arr, label) => {
    const seen = new Set();
    for (const item of arr) {
      if (seen.has(item.id)) errs.push(`[${label}] id 重复：${item.id}`);
      seen.add(item.id);
    }
  };
  uniq(p.entities, "entities");
  uniq(p.steps, "steps");
  uniq(p.modes, "modes");
  uniq(p.phases, "phases");
  uniq(sk.nodes, "skeleton.nodes");

  const ifaceIds = new Set(
    [...p.glycolysisInterfaces.entryLinks, ...p.glycolysisInterfaces.returnLinks].map((l) => l.id)
  );
  if (ifaceIds.size !== p.glycolysisInterfaces.entryLinks.length + p.glycolysisInterfaces.returnLinks.length)
    errs.push("[glycolysisInterfaces] 接口 link id 重复");

  const stepIds = new Set(p.steps.map((s) => s.id));
  const nodeIds = new Set(sk.nodes.map((n) => n.id));
  for (const l of sk.links) {
    if (!nodeIds.has(l.from)) errs.push(`[skeleton.links] from 指向不存在的节点：${l.from}`);
    if (!nodeIds.has(l.to)) errs.push(`[skeleton.links] to 指向不存在的节点：${l.to}`);
    if (l.stepId && !stepIds.has(l.stepId)) errs.push(`[skeleton.links] stepId 不存在：${l.stepId}`);
    if (l.interfaceId && !ifaceIds.has(l.interfaceId))
      errs.push(`[skeleton.links] interfaceId 不存在：${l.interfaceId}`);
  }
  for (const s of p.steps) {
    for (const id of [...s.substrates, ...s.products]) {
      if (!p.entities.some((e) => e.id === id)) errs.push(`[steps.${s.id}] 引用不存在的实体：${id}`);
    }
    if (!p.entities.some((e) => e.id === s.enzyme.entityId))
      errs.push(`[steps.${s.id}] 引用不存在的酶实体：${s.enzyme.entityId}`);
  }
  // phases 里的 stepIds 必须真实
  for (const ph of p.phases)
    for (const sid of ph.stepIds)
      if (!stepIds.has(sid)) errs.push(`[phases.${ph.id}] stepIds 引用不存在的步骤：${sid}`);
  return errs;
}

// ---------- 校验 ②：氧化相主链碳递减（C6→C6→C6→C5）+ 脱羧步产 CO₂ ----------

/** branch-exit 实体（不进主链碳账）：PPP 中只有 CO₂ */
const BRANCH_EXIT_CARBONS = { co2: 1 };

function checkOxidativeCarbons(p) {
  const errs = [];
  for (const s of p.steps.filter((x) => x.phase === "oxidative")) {
    const subC = listCarbons(p, s.substrates);
    const prodC = listCarbons(p, s.products);
    if (subC === null || prodC === null) {
      errs.push(`[oxidative.${s.id}] 底物/产物含碳数缺失的实体`);
      continue;
    }
    const branchC = s.products.reduce((acc, id) => acc + (BRANCH_EXIT_CARBONS[id] ?? 0), 0);
    const mainChainC = prodC - branchC;
    const computedDelta = prodC - subC; // 质量守恒下恒为 0
    if (computedDelta !== 0) errs.push(`[oxidative.${s.id}] 总碳不守恒：入 ${subC}C ≠ 出 ${prodC}C`);
    if (s.id !== "ppp-o3" && branchC !== 0)
      errs.push(`[oxidative.${s.id}] 非脱羧步不应产出 branch-exit 实体（CO₂）`);
    if (s.id === "ppp-o3") {
      // 主链 C6 → C5，丢的 1 碳必须以 CO₂ 逸出
      if (!s.products.includes("co2")) errs.push(`[oxidative.${s.id}] 脱羧步必须产出 CO₂`);
      else if (subC !== 6 || mainChainC !== 5)
        errs.push(`[oxidative.${s.id}] 主链碳递减应为 C6→C5，实际 C${subC}→C${mainChainC}（CO₂ ${branchC}C）`);
    }
    // 声明的碳账必须与算出的一致
    const decl = s.carbonBookkeeping;
    if (
      !decl ||
      decl.substrateCarbons !== subC ||
      decl.productCarbons !== prodC ||
      decl.mainChainProductCarbons !== mainChainC ||
      decl.netDelta !== computedDelta
    ) {
      errs.push(
        `[oxidative.${s.id}] carbonBookkeeping 声明（${decl?.substrateCarbons}→${decl?.productCarbons}, 主链${decl?.mainChainProductCarbons}, Δ${decl?.netDelta}）与实体碳数计算（${subC}→${prodC}, 主链${mainChainC}, Δ${computedDelta}）不一致`
      );
    }
  }
  // 相级净账：C6 → C5 + C1(CO₂)，6 = 6
  const ox = recordCarbons(p, p.oxidativeBalance.input);
  const oxOut = recordCarbons(p, p.oxidativeBalance.output);
  if (ox !== 6 || oxOut !== 6) errs.push(`[oxidativeBalance] 净账应为 C6 → C5+C1（6=6），实际 ${ox} → ${oxOut}`);
  if (p.oxidativeBalance.output.co2 !== 1) errs.push("[oxidativeBalance] 氧化相出口应含 1 × CO₂");
  return errs;
}

// ---------- 校验 ③：非氧化相碳守恒（3×C5 → 2×C6 + C3）+ 基团转移碳数 ----------

function checkNonOxidative(p) {
  const errs = [];
  const inC = recordCarbons(p, p.nonOxidativeBalance.input);
  const outC = recordCarbons(p, p.nonOxidativeBalance.output);
  if (inC === null || outC === null) {
    errs.push("[nonOxidativeBalance] input/output 含碳数缺失的实体");
  } else if (inC !== outC) {
    errs.push(`[nonOxidativeBalance] 碳不守恒：入 ${inC}C ≠ 出 ${outC}C（应为 3×C5=15 → 2×C6+1×C3=15）`);
  }
  if (p.nonOxidativeBalance.input.ru5p !== 3) errs.push("[nonOxidativeBalance] 非氧化相入口应为 3 × Ru5P");
  if (p.nonOxidativeBalance.output.f6p !== 2 || p.nonOxidativeBalance.output.g3p !== 1)
    errs.push("[nonOxidativeBalance] 非氧化相出口应为 2 × F6P + 1 × GAP(g3p)");

  for (const s of p.steps.filter((x) => x.phase === "non-oxidative")) {
    const subC = listCarbons(p, s.substrates);
    const prodC = listCarbons(p, s.products);
    if (subC !== prodC) errs.push(`[non-oxidative.${s.id}] 单步碳不守恒：入 ${subC}C ≠ 出 ${prodC}C`);
    const decl = s.carbonBookkeeping;
    if (!decl || decl.netDelta !== 0 || decl.substrateCarbons !== subC || decl.productCarbons !== prodC)
      errs.push(`[non-oxidative.${s.id}] carbonBookkeeping 声明与实体碳数计算（${subC}→${prodC}）不一致`);

    // TK/TA 基团转移碳数逐条验算：donor − n = remainder；acceptor + n = product
    // 双底物步（TK/TA）必须声明 groupTransfer；单底物异构步（RPIA/RPE）必须为 null
    const gt = s.groupTransfer;
    if (s.substrates.length >= 2 && !gt) {
      errs.push(`[non-oxidative.${s.id}] 双底物步必须声明 groupTransfer（转移碳数是碳骨架重组的结构化核心）`);
      continue;
    }
    if (s.substrates.length === 1 && gt) {
      errs.push(`[non-oxidative.${s.id}] 单底物异构步不应声明 groupTransfer`);
      continue;
    }
    if (!gt) continue;
    const dC = carbonOf(p, gt.donor);
    const rC = carbonOf(p, gt.donorRemainder);
    const aC = carbonOf(p, gt.acceptor);
    const pC = carbonOf(p, gt.acceptorProduct);
    if (dC - gt.carbonsTransferred !== rC)
      errs.push(
        `[non-oxidative.${s.id}] 转移碳数验算失败：donor ${gt.donor}(${dC}C) − ${gt.carbonsTransferred} ≠ donorRemainder ${gt.donorRemainder}(${rC}C)`
      );
    if (aC + gt.carbonsTransferred !== pC)
      errs.push(
        `[non-oxidative.${s.id}] 转移碳数验算失败：acceptor ${gt.acceptor}(${aC}C) + ${gt.carbonsTransferred} ≠ acceptorProduct ${gt.acceptorProduct}(${pC}C)`
      );
    for (const [role, id] of [["donor", gt.donor], ["acceptor", gt.acceptor]])
      if (!s.substrates.includes(id)) errs.push(`[non-oxidative.${s.id}] groupTransfer.${role}=${id} 不在该步底物中`);
    for (const [role, id] of [["donorRemainder", gt.donorRemainder], ["acceptorProduct", gt.acceptorProduct]])
      if (!s.products.includes(id)) errs.push(`[non-oxidative.${s.id}] groupTransfer.${role}=${id} 不在该步产物中`);
    if (gt.enzyme === "transketolase" && gt.carbonsTransferred !== 2)
      errs.push(`[non-oxidative.${s.id}] 转酮醇酶搬二碳（羟乙酰基），声明 ${gt.carbonsTransferred}C`);
    if (gt.enzyme === "transaldolase" && gt.carbonsTransferred !== 3)
      errs.push(`[non-oxidative.${s.id}] 转醛醇酶搬三碳（二羟丙酮基），声明 ${gt.carbonsTransferred}C`);
  }
  return errs;
}

// ---------- 校验 ④：接口指向的糖酵解实体真实存在（glycolysis.json 只读） ----------

function checkInterfaces(p, glyData) {
  const errs = [];
  const glySteps = new Map(glyData.steps.map((s) => [s.id, s]));
  const glyEntities = new Set(glyData.entities.map((e) => e.id));
  const pppEntities = new Set(p.entities.map((e) => e.id));

  for (const link of [...p.glycolysisInterfaces.entryLinks, ...p.glycolysisInterfaces.returnLinks]) {
    const { pathway, stepId, entity } = link.sharedWith;
    if (pathway !== "glycolysis") errs.push(`[interfaces.${link.id}] sharedWith.pathway 必须是 glycolysis，实际 ${pathway}`);
    const gs = glySteps.get(stepId);
    if (!gs) {
      errs.push(`[interfaces.${link.id}] 糖酵解步骤不存在：${stepId}`);
      continue;
    }
    if (!glyEntities.has(entity))
      errs.push(`[interfaces.${link.id}] 实体 ${entity} 不存在于 glycolysis.json 的 entities（注意 GAP 的平台 id 是 g3p）`);
    if (!pppEntities.has(link.entity))
      errs.push(`[interfaces.${link.id}] PPP 本地实体不存在：${link.entity}`);
    const inStep = gs.substrates.includes(entity) || gs.products.includes(entity);
    if (!inStep)
      errs.push(
        `[interfaces.${link.id}] 实体 ${entity} 不是糖酵解步骤 ${stepId} 的底物/产物（${stepId}: [${gs.substrates}]→[${gs.products}]）`
      );
    // 方向语义：entry 的 sharedWith 实体应是糖酵解侧分流出去的（G6P 是 gk-2 底物）；return 应是回流汇入
    if (link.direction === "entry" && !gs.substrates.includes(entity) && glyEntities.has(entity) && inStep === false)
      errs.push(`[interfaces.${link.id}] entry 接口指向的实体应位于目标步底物位`);
  }
  return errs;
}

// ---------- 校验 ⑤：无伪造 assets/ 路径 ----------

function checkNoAssets(p, sk) {
  const errs = [];
  const scan = (obj, label) => {
    const text = JSON.stringify(obj);
    if (text.includes("assets/")) errs.push(`[${label}] 出现 assets/ 路径（本切片纯数据层，资产一律 threeD.pending 登记 PDB id，不含路径）`);
    if (text.includes(".png") || text.includes(".glb") || text.includes(".mtlb")) errs.push(`[${label}] 出现资产文件扩展名`);
  };
  scan(p, "ppp.json");
  scan(sk, "skeleton.json");
  return errs;
}

// ---------- 汇总 ----------

function runChecks(p, sk, glyData) {
  return [
    ...checkIds(p, sk),
    ...checkOxidativeCarbons(p),
    ...checkNonOxidative(p),
    ...checkInterfaces(p, glyData),
    ...checkNoAssets(p, sk),
  ];
}

// ---------- 正例 ----------

let failed = false;
const posErrs = runChecks(ppp, skeleton, gly);
if (posErrs.length === 0) {
  console.log("✓ 正例：ppp.json + skeleton.json 全部校验通过（id / 氧化相碳递减 / 非氧化相碳守恒 / 接口指向 / 无 assets 路径）");
} else {
  failed = true;
  console.error(`✗ 正例校验失败（${posErrs.length} 条）：`);
  for (const e of posErrs) console.error("  - " + e);
}

// ---------- 负例自检（每个负例必须被抓到 ≥1 条错误） ----------

const NEGATIVES = [
  {
    name: "负例1：步骤 id 重复（两个 ppp-o1）",
    mutate(p) {
      p.steps.push(structuredClone(p.steps[0]));
    },
  },
  {
    name: "负例2：氧化相脱羧步不产 CO₂（主链 C6→C5 递减被破坏）",
    mutate(p) {
      const o3 = p.steps.find((s) => s.id === "ppp-o3");
      o3.products = ["ru5p"];
      o3.carbonBookkeeping = {
        substrateCarbons: 6,
        productCarbons: 5,
        mainChainProductCarbons: 5,
        netDelta: -1,
        note: "伪造：不脱羧",
      };
    },
  },
  {
    name: "负例3：非氧化相碳不守恒（出口改成 3 × F6P，18C≠15C）",
    mutate(p) {
      p.nonOxidativeBalance.output = { f6p: 3 };
    },
  },
  {
    name: "负例3b：转醛醇酶碳数写错（3C 写成 2C，S7P−2≠E4P）",
    mutate(p) {
      const n4 = p.steps.find((s) => s.id === "ppp-n4");
      n4.groupTransfer.carbonsTransferred = 2;
    },
  },
  {
    name: "负例4：接口指向不存在的糖酵解实体（GAP 写成 gap，平台 id 是 g3p）",
    mutate(p) {
      p.glycolysisInterfaces.returnLinks.find((l) => l.id === "if-gap").sharedWith.entity = "gap";
    },
  },
  {
    name: "负例5：接口指向错误步骤（g6p 声称在 gk-6 的底物/产物位）",
    mutate(p) {
      p.glycolysisInterfaces.entryLinks.find((l) => l.id === "if-g6p").sharedWith.stepId = "gk-6";
    },
  },
  {
    name: "负例6：伪造资产路径（threeD 里塞 assets/ 文件）",
    mutate(p) {
      p.steps[0].threeD.assetPath = "assets/structures/ppp/7SNI.json";
    },
  },
  {
    name: "负例7：骨架链接指向不存在的节点",
    mutate(p, sk) {
      sk.links.push({ from: "ru5p", to: "ghost-pentose", type: "main", stepId: "ppp-n1" });
    },
  },
];

for (const neg of NEGATIVES) {
  const pClone = structuredClone(ppp);
  const skClone = structuredClone(skeleton);
  neg.mutate(pClone, skClone);
  const errs = runChecks(pClone, skClone, gly);
  if (errs.length > 0) {
    console.log(`✓ ${neg.name} —— 被正确抓取（${errs.length} 条）：${errs[0]}`);
  } else {
    failed = true;
    console.error(`✗ ${neg.name} —— 未被任何校验抓住（漏检）`);
  }
}

console.log(failed ? "\n结果：FAIL" : `\n结果：PASS（正例 0 错 + ${NEGATIVES.length} 个负例全被抓）`);
process.exit(failed ? 1 : 0);
