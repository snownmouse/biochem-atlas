// 糖异生数据层校验（纯 Node，无依赖，build 链路之外的独立闸门）。
// 用法：
//   node tools/validate-gluconeogenesis.mjs             # 校验真实数据 + 自动跑人为埋错的负例自检
//   node tools/validate-gluconeogenesis.mjs --self-test # 只跑负例自检
// 校验范围：
//   ① id 唯一（entities / steps / sideBranchSteps / skeleton nodes / links 语义 / transportSteps / sideBranches）
//   ② mirrorOf 与 mirrorMap 指向的糖酵解步骤必须存在（glycolysis.json 为准），且 gk-1..gk-10 全覆盖、
//      每个 gn 步都被映射、入口支路 mirrorOf=null
//   ③ 主链：11 步 index 连续；主链有序节点 = 12；节点坐标无重复；每步至少一条 link 且
//      link.from 的实体 ∈ substrates、link.to 的实体 ∈ products
//   ④ 泳道归属与反应式一致：节点 compartment ∈ 已声明泳道；每步 substrate/product 节点的
//      compartment ⊆ 该步 compartments；硬断言——gn-1 在线粒体基质、gn-2 在胞质、
//      gn-11 牵涉 er-lumen；苹果酸穿梭必须 膜节点=mito-inner-membrane / 起点=mito-matrix / 终点=cytosol；
//      MPC 穿梭必须 胞质→线粒体基质
//   ⑤ 能量账本：ATP=4、GTP=2、NADH=2；entry.stepId 必须存在
//   ⑥ 3D 纪律：步骤级 threeD.status 必须与资产事实一致（gn-1/2/9/11 = ready，其余非 null = pending）；
//      顶层 status = ready（4 个自有步骤均已接入）；全文件禁止出现 "assets/" 资产路径；
//      PDB id ⊆ outline 已核验白名单
// 任何一条失败 → exit 1。
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const GN_PATH = resolve(ROOT, "src/data/gluconeogenesis/gluconeogenesis.json");
const SKEL_PATH = resolve(ROOT, "src/data/gluconeogenesis/skeleton.json");
const GYK_PATH = resolve(ROOT, "src/data/glycolysis.json");

// outline §8 已核验 PDB 白名单（2026-11-03 RCSB API）——出现白名单之外的一律报错
const VERIFIED_PDB = new Set([
  "3BG3", "3TW6", "1KHB", "1KHE", "1M51", "1FTA", "1EYI", "2Y5K", "9J7U", "9J7V", "9JTM",
]);

/** 纯函数校验：返回错误列表（空 = 通过）。独立出来便于负例自检复用。 */
export function validateGluconeogenesis({ gn, skel, glyk }) {
  const errors = [];
  const err = (rule, msg) => errors.push(`[${rule}] ${msg}`);

  // ---------- ① id 唯一 ----------
  const stepIds = new Set();
  const allSteps = [...gn.steps, ...gn.sideBranchSteps];
  for (const s of allSteps) {
    if (stepIds.has(s.id)) err("R1-id-unique", `步骤 id 重复：${s.id}`);
    stepIds.add(s.id);
  }
  const entityIds = new Set();
  for (const e of gn.entities) {
    if (entityIds.has(e.id)) err("R1-id-unique", `实体 id 重复：${e.id}`);
    entityIds.add(e.id);
  }
  const nodeIds = new Set();
  for (const n of skel.nodes) {
    if (nodeIds.has(n.id)) err("R1-id-unique", `骨架节点 id 重复：${n.id}`);
    nodeIds.add(n.id);
  }
  const transportIds = new Set();
  for (const t of skel.transportSteps) {
    if (transportIds.has(t.id)) err("R1-id-unique", `转运步 id 重复：${t.id}`);
    transportIds.add(t.id);
  }
  const branchIds = new Set();
  for (const b of skel.sideBranches) {
    if (branchIds.has(b.id)) err("R1-id-unique", `支路 id 重复：${b.id}`);
    branchIds.add(b.id);
  }
  // 实体引用完整性
  for (const s of allSteps) {
    for (const ref of [...s.substrates, ...s.products]) {
      if (!entityIds.has(ref)) err("R1-id-unique", `${s.id} 引用不存在的实体：${ref}`);
    }
    if (!entityIds.has(s.enzyme.entityId)) err("R1-id-unique", `${s.id} 引用不存在的酶实体：${s.enzyme.entityId}`);
  }

  // ---------- ② mirrorOf / mirrorMap 指向 ----------
  const glykIds = new Set(glyk.steps.map((s) => s.id));
  const mainGnIds = new Set(gn.steps.map((s) => s.id));
  for (const s of allSteps) {
    if (s.mirrorOf === undefined) err("R2-mirror", `${s.id} 缺 mirrorOf 字段`);
    else if (s.mirrorOf === null) {
      if (mainGnIds.has(s.id)) err("R2-mirror", `主链步 ${s.id} 的 mirrorOf 不得为 null（入口支路才允许）`);
    } else if (!glykIds.has(s.mirrorOf)) {
      err("R2-mirror", `${s.id}.mirrorOf 指向不存在的糖酵解步骤：${s.mirrorOf}`);
    } else if (s.mirrorOf === "gk-rap") {
      err("R2-mirror", `${s.id}.mirrorOf 指向支路步 ${s.mirrorOf}（对照表只覆盖主链 10 步）`);
    }
  }
  // mirrorMap：gk-1..gk-10 每步恰好一行；每个 gn 主链步都被映射
  const gkMain = [...glykIds].filter((id) => /^gk-\d+$/.test(id));
  const seenGk = new Set();
  const seenGn = new Set();
  for (const p of gn.mirrorMap.pairs) {
    if (!glykIds.has(p.glycolysisStepId)) err("R2-mirror", `mirrorMap 引用不存在的糖酵解步骤：${p.glycolysisStepId}`);
    if (seenGk.has(p.glycolysisStepId)) err("R2-mirror", `mirrorMap 中糖酵解步骤重复：${p.glycolysisStepId}`);
    seenGk.add(p.glycolysisStepId);
    for (const gid of p.gluconeogenesisStepIds) {
      if (!mainGnIds.has(gid)) err("R2-mirror", `mirrorMap 引用非主链/不存在的糖异生步骤：${gid}`);
      if (seenGn.has(gid)) err("R2-mirror", `mirrorMap 中糖异生步骤重复映射：${gid}`);
      seenGn.add(gid);
      const step = gn.steps.find((s) => s.id === gid);
      if (step && step.mirrorOf !== p.glycolysisStepId) {
        err("R2-mirror", `mirrorMap 说 ${gid}↔${p.glycolysisStepId}，但 ${gid}.mirrorOf=${step.mirrorOf}，两处矛盾`);
      }
    }
  }
  for (const id of gkMain) if (!seenGk.has(id)) err("R2-mirror", `糖酵解主链步骤未被对照表覆盖：${id}`);
  for (const id of mainGnIds) if (!seenGn.has(id)) err("R2-mirror", `糖异生主链步骤未进对照表：${id}`);

  // ---------- ③ 主链结构 ----------
  const mains = gn.steps.slice().sort((a, b) => a.index - b.index);
  mains.forEach((s, i) => {
    if (s.index !== i + 1) err("R3-main-chain", `步骤 index 不连续：期望 ${i + 1}，实际 ${s.index}（${s.id}）`);
  });
  const ordered = skel.nodes.filter((n) => n.order !== null).sort((a, b) => a.order - b.order);
  const orderedIds = ordered.map((n) => n.id);
  ordered.forEach((n, i) => {
    if (n.order !== i) err("R3-main-chain", `主链节点 order 不连续：期望 ${i}，实际 ${n.order}（${n.id}）`);
  });
  if (ordered.length !== mains.length + 1) {
    err("R3-main-chain", `主链节点数（${ordered.length}）应比主链步数（${mains.length}）多 1`);
  }
  // 坐标唯一
  const coord = new Map();
  for (const n of skel.nodes) {
    const key = `${n.x},${n.y}`;
    if (coord.has(key)) err("R3-coords", `节点坐标重复 (${key})：${coord.get(key)} 与 ${n.id}`);
    else coord.set(key, n.id);
  }
  // link ↔ step 对应
  const nodeById = new Map(skel.nodes.map((n) => [n.id, n]));
  const entityOf = (n) => n.entityId ?? n.id;
  const linksByStep = new Map();
  for (const l of skel.links) {
    const from = nodeById.get(l.from);
    const to = nodeById.get(l.to);
    if (!from || !to) {
      err("R3-links", `link 端点不存在：${l.from} → ${l.to}`);
      continue;
    }
    if (!l.stepId) {
      err("R3-links", `link 缺 stepId：${l.from} → ${l.to}`);
      continue;
    }
    if (!linksByStep.has(l.stepId)) linksByStep.set(l.stepId, []);
    linksByStep.get(l.stepId).push(l);
  }
  for (const s of mains) {
    const ls = linksByStep.get(s.id);
    if (!ls || ls.length === 0) {
      err("R3-links", `主链步 ${s.id} 没有任何骨架 link`);
      continue;
    }
    for (const l of ls) {
      const f = entityOf(nodeById.get(l.from));
      const t = entityOf(nodeById.get(l.to));
      if (!s.substrates.includes(f)) err("R3-links", `${s.id} 的 link 起点 ${l.from}（实体 ${f}）不在 substrates ${JSON.stringify(s.substrates)} 中`);
      if (!s.products.includes(t)) err("R3-links", `${s.id} 的 link 终点 ${l.to}（实体 ${t}）不在 products ${JSON.stringify(s.products)} 中`);
    }
    if (ls.filter((l) => l.type === "main").length !== 1) {
      err("R3-links", `主链步 ${s.id} 应恰有 1 条 type=main 的 link（实际 ${ls.filter((l) => l.type === "main").length}）`);
    }
  }
  // 已声明的 stepId 必须存在（步骤/转运/糖酵解）
  const glykSet = new Set(glyk.steps.map((s) => s.id));
  for (const [sid] of linksByStep) {
    if (!stepIds.has(sid) && !transportIds.has(sid) && !glykSet.has(sid)) {
      err("R3-links", `link.stepId 指向不存在的步骤/转运步：${sid}`);
    }
  }
  for (const b of skel.sideBranches) {
    if (b.stepId && !stepIds.has(b.stepId) && !glykSet.has(b.stepId)) {
      err("R3-links", `sideBranch ${b.id}.stepId 指向不存在的步骤：${b.stepId}`);
    }
    for (const nid of b.nodeIds) {
      if (!nodeIds.has(nid)) err("R3-links", `sideBranch ${b.id} 引用不存在节点：${nid}`);
    }
  }

  // ---------- ④ 泳道归属 ----------
  const laneIds = new Set(skel.compartments.map((c) => c.id));
  for (const n of skel.nodes) {
    if (!laneIds.has(n.compartment)) err("R4-lanes", `节点 ${n.id} 泳道未声明：${n.compartment}`);
  }
  // 泳道归属按"该步 link 两端的实际节点"判：同一实体（pyr/oaa）在两个泳道各有一个节点是设计使然，
  // 不能拿实体的全部节点去卡单步 compartments。
  for (const s of allSteps) {
    const comps = new Set(s.compartments);
    if (!comps.has(s.compartment)) err("R4-lanes", `${s.id}.compartment（${s.compartment}）未包含在 compartments 中`);
    for (const l of linksByStep.get(s.id) ?? []) {
      for (const nid of [l.from, l.to]) {
        const n = nodeById.get(nid);
        if (n && !comps.has(n.compartment)) {
          err("R4-lanes", `${s.id} 的 link 端点 ${nid} 在泳道 ${n.compartment}，不在该步 compartments ${JSON.stringify(s.compartments)} 中`);
        }
      }
    }
  }
  // 硬断言：羧化酶必须在线粒体；PEPCK 在胞质；G6Pase 牵涉 ER
  const assertComp = (stepId, expected, what) => {
    const s = allSteps.find((x) => x.id === stepId);
    if (!s) return err("R4-lanes", `硬断言找不到步骤 ${stepId}`);
    if (!s.compartments.includes(expected)) err("R4-lanes", `硬断言失败：${what}（${stepId} 必须在泳道 ${expected}，实际 ${JSON.stringify(s.compartments)}）`);
  };
  assertComp("gn-1", "mito-matrix", "丙酮酸羧化酶必须在线粒体基质");
  assertComp("gn-2", "cytosol", "PEPCK（肝 PCK1 主图）必须在胞质");
  assertComp("gn-9", "cytosol", "FBPase-1 必须在胞质");
  const gn11 = allSteps.find((x) => x.id === "gn-11");
  if (gn11 && !gn11.compartments.includes("er-lumen")) err("R4-lanes", "硬断言失败：G6Pase 必须牵涉 er-lumen（活性位点朝腔）");
  // 跨膜几何：苹果酸穿梭 = 基质 → 内膜带 → 胞质
  const comp = (id) => nodeById.get(id)?.compartment;
  for (const t of skel.transportSteps) {
    if (t.via) {
      if (comp(t.from) === comp(t.to)) err("R4-lanes", `转运步 ${t.id} 声称跨膜但两端同泳道（${comp(t.from)}）`);
      const viaNode = nodeById.get(t.via);
      if (!viaNode) err("R4-lanes", `转运步 ${t.id} 的 via 节点不存在：${t.via}`);
    }
  }
  const malS = skel.transportSteps.find((t) => t.id === "gn-shuttle-mal");
  if (malS) {
    if (comp(malS.from) !== "mito-matrix") err("R4-lanes", `苹果酸穿梭起点必须在线粒体基质（实际 ${comp(malS.from)}）`);
    if (comp(malS.via) !== "mito-inner-membrane") err("R4-lanes", `苹果酸穿梭跨膜节点必须落在内膜转运带（实际 ${comp(malS.via)}）`);
    if (comp(malS.to) !== "cytosol") err("R4-lanes", `苹果酸穿梭终点必须在胞质（实际 ${comp(malS.to)}）`);
  } else {
    err("R4-lanes", "缺少苹果酸穿梭 gn-shuttle-mal：OAA 出线粒体是本通路最大空间差异，必须在几何上表达");
  }
  const mpc = skel.transportSteps.find((t) => t.id === "gn-shuttle-mpc");
  if (mpc) {
    if (comp(mpc.from) !== "cytosol" || comp(mpc.to) !== "mito-matrix") {
      err("R4-lanes", `MPC 穿梭必须是 胞质→线粒体基质（实际 ${comp(mpc.from)}→${comp(mpc.to)}）`);
    }
  } else {
    err("R4-lanes", "缺少 MPC 穿梭 gn-shuttle-mpc：胞质丙酮酸入场券未表达");
  }
  // 主链原则上不得跨泳道；唯一豁免：该步 compartments 显式声明了跨泳道（gn-11 胞质→ER 腔，
  // 几何上下潜进 ER 泳道带，不是平线）。跨泳道若未声明 compartments，必须改用 shuttle 表达。
  for (const l of skel.links) {
    if (l.type === "main" && comp(l.from) !== comp(l.to)) {
      const s = allSteps.find((x) => x.id === l.stepId);
      const declared = s && s.compartments.includes(comp(l.from)) && s.compartments.includes(comp(l.to));
      if (!declared) {
        err("R4-lanes", `main link ${l.from}→${l.to} 跨泳道（${comp(l.from)}→${comp(l.to)}）但 ${l.stepId}.compartments 未显式声明两端泳道：跨泳道必须用 shuttle 或显式 compartments 表达`);
      }
    }
    if (l.type === "shuttle" && !transportIds.has(l.stepId)) {
      err("R4-lanes", `shuttle link ${l.from}→${l.to} 的 stepId ${l.stepId} 不在 transportSteps`);
    }
  }

  // ---------- ⑤ 能量账本 ----------
  const sum = (item) => gn.energyLedger.entries.filter((e) => e.item === item).reduce((a, e) => a + e.count, 0);
  for (const e of gn.energyLedger.entries) {
    if (!stepIds.has(e.stepId)) err("R5-ledger", `账本条目指向不存在步骤：${e.stepId}`);
  }
  if (sum("ATP") !== 4) err("R5-ledger", `ATP 总数应为 4，实际 ${sum("ATP")}`);
  if (sum("GTP") !== 2) err("R5-ledger", `GTP 总数应为 2，实际 ${sum("GTP")}`);
  if (sum("NADH") !== 2) err("R5-ledger", `NADH 总数应为 2，实际 ${sum("NADH")}`);
  if (sum("ATP") + sum("GTP") !== 6) err("R5-ledger", "高能磷酸键总数应为 6（4 ATP + 2 GTP）");
  if (!gn.energyLedger.netEquation.includes("Lehninger")) err("R5-ledger", "净反应式必须注明可追溯口径（Lehninger）");
  if (!gn.mirrorMap.totals.asymmetryNote || !gn.mirrorMap.totals.asymmetryNote.includes("2 ATP")) {
    err("R5-ledger", "对照表 totals 缺少与糖酵解净产 2 ATP 的不对称性注记");
  }

  // ---------- ⑥ 3D 纪律 ----------
  const READY_3D = new Set(["gn-1", "gn-2", "gn-9", "gn-11"]);
  for (const s of allSteps) {
    if (s.threeD === null) continue;
    const expected = READY_3D.has(s.id) ? "ready" : "pending";
    if (!s.threeD || s.threeD.status !== expected) err("R6-3d", `${s.id}.threeD.status 必须是 "${expected}"（与已接资产事实一致）`);
    for (const c of s.threeD?.pdbCandidates ?? []) {
      if (!VERIFIED_PDB.has(c.pdbId)) err("R6-3d", `${s.id} 出现 outline 白名单之外的 PDB：${c.pdbId}`);
    }
  }
  const raw = JSON.stringify(gn) + JSON.stringify(skel);
  if (raw.includes("assets/")) err("R6-3d", "数据中出现 assets/ 资产路径——资产路径只登记在 manifest，禁止写进通路数据");
  if (gn.threeD.status !== "ready") err("R6-3d", "顶层 threeD.status 必须是 ready（4 个自有步骤均已接入资产）");
  for (const id of gn.threeD.verifiedPdbIds) {
    if (!VERIFIED_PDB.has(id)) err("R6-3d", `verifiedPdbIds 含白名单之外条目：${id}`);
  }

  return errors;
}

// ---------- 负例自检：人为埋错，校验器必须报出 ----------
function runSelfTest(gn, skel, glyk) {
  const clone = (o) => JSON.parse(JSON.stringify(o));
  const cases = [
    {
      name: "R1：步骤 id 重复",
      mutate: (d) => { d.gn.steps[1].id = d.gn.steps[0].id; },
    },
    {
      name: "R2：mirrorOf 指向不存在的糖酵解步骤",
      mutate: (d) => { d.gn.steps[2].mirrorOf = "gk-99"; },
    },
    {
      name: "R2：对照表漏掉一条糖酵解步",
      mutate: (d) => { d.gn.mirrorMap.pairs.pop(); },
    },
    {
      name: "R3：主链节点坐标撞车",
      mutate: (d) => { d.skel.nodes.find((n) => n.id === "pep").x = d.skel.nodes.find((n) => n.id === "2pg").x;
                       d.skel.nodes.find((n) => n.id === "pep").y = d.skel.nodes.find((n) => n.id === "2pg").y; },
    },
    {
      name: "R3：删除一条主链 link",
      mutate: (d) => { d.skel.links = d.skel.links.filter((l) => l.stepId !== "gn-9"); },
    },
    {
      name: "R4：把丙酮酸节点挪进胞质泳道（羧化酶断言必须抓到）",
      mutate: (d) => {
        const n = d.skel.nodes.find((x) => x.id === "pyr-mit");
        n.compartment = "cytosol";
        // 同步改数据侧 compartments，确保只有泳道几何断言被触发
        d.gn.steps.find((s) => s.id === "gn-1").compartments = ["cytosol"];
        d.gn.steps.find((s) => s.id === "gn-1").compartment = "cytosol";
      },
    },
    {
      name: "R4：主链 link 直接跨泳道（不画平线纪律）",
      mutate: (d) => {
        d.skel.links.push({ from: "pyr-cyt", to: "oaa-mit", stepId: "gn-1", type: "main" });
      },
    },
    {
      name: "R5：ATP 账本多记 1 个",
      mutate: (d) => { d.gn.energyLedger.entries[0].count = 3; },
    },
    {
      name: "R6：出现伪造的资产路径",
      mutate: (d) => { d.gn.steps[0].threeD.assetPath = "public/assets/steps/gn-1.json"; },
    },
    {
      name: "R6：出现 outline 白名单之外的 PDB",
      mutate: (d) => { d.gn.steps[0].threeD.pdbCandidates.push({ pdbId: "1XYZ" }); },
    },
  ];
  let bad = 0;
  for (const c of cases) {
    const d = { gn: clone(gn), skel: clone(skel) };
    c.mutate(d);
    const errs = validateGluconeogenesis({ ...d, glyk });
    const ok = errs.length > 0;
    console.log(`${ok ? "✓" : "✗"} 负例自检：${c.name}${ok ? `（抓到 ${errs.length} 个错误，如 ${errs[0]}）` : "——校验器没抓到！"}`);
    if (!ok) bad++;
  }
  return bad;
}

// ---------- CLI ----------
const argv = process.argv.slice(2);
const onlySelfTest = argv.includes("--self-test");
const gn = JSON.parse(readFileSync(GN_PATH, "utf8"));
const skel = JSON.parse(readFileSync(SKEL_PATH, "utf8"));
const glyk = JSON.parse(readFileSync(GYK_PATH, "utf8"));

let failed = false;

if (!onlySelfTest) {
  const errors = validateGluconeogenesis({ gn, skel, glyk });
  if (errors.length === 0) {
    console.log("✓ 糖异生数据层校验通过（R1 id唯一 / R2 mirror指向 / R3 主链与坐标 / R4 泳道归属 / R5 能量账本 / R6 3D纪律）");
  } else {
    failed = true;
    console.error(`✗ 糖异生数据层校验失败，共 ${errors.length} 个错误：`);
    for (const e of errors) console.error(`  - ${e}`);
  }
}

const badSelfTest = runSelfTest(gn, skel, glyk);
if (badSelfTest > 0) {
  failed = true;
  console.error(`✗ ${badSelfTest} 个负例未被校验器抓到——校验器本身有洞`);
} else if (!onlySelfTest) {
  console.log("✓ 负例自检 10/10：每个埋进去的错都被校验器抓到（exit 1 通道有效）");
}

process.exit(failed ? 1 : 0);
