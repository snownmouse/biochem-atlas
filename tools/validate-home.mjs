/**
 * 首页总图数据校验（数据驱动，不依赖页面渲染）
 *
 * 校验点：
 *  1. 节点唯一（同一实体 id 不能出现两次）且每个节点至少被一条通路引用；
 *  2. junction 至少被两条通路引用；
 *  3. 任意一条边都能解析到某条通路的 step / transport / skeleton link；
 *  4. 六条通路的每一个主步骤都至少产生一条可见边；
 *  5. 资产别名全部指向真实存在的数据实体；
 *  6. 版面坐标覆盖全部节点且落在画布内；自环只允许出现在 cycle-return；
 *  7. 上下两域构图：三条域带连续覆盖画布、三条膜线都在膜带内、跨域共用节点
 *     （丙酮酸 / 乙酰-CoA / 草酰乙酸）贴着膜带（±40 px）、节点之间不重叠、
 *     十一个通路标签都在画布内；共用分子仍只出现一次（第 1 节）。
 *
 * 若 homeMap.ts 改动，本脚本用 esbuild 重新打包后读取，避免维护第二份推导逻辑。
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { build } from "esbuild";

const root = process.cwd();
const failures = [];
const checks = [];

function check(label, ok, detail = "") {
  checks.push({ label, ok, detail });
  if (!ok) failures.push(`${label}${detail ? ` — ${detail}` : ""}`);
}

const token = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
const tempMap = path.join(os.tmpdir(), `home-map-${token}.mjs`);
const tempLayout = path.join(os.tmpdir(), `home-layout-${token}.mjs`);
await Promise.all([
  build({
    entryPoints: [path.join(root, "src/data/homeMap.ts")],
    bundle: true,
    format: "esm",
    platform: "node",
    outfile: tempMap,
    logLevel: "silent",
  }),
  build({
    entryPoints: [path.join(root, "src/data/homeLayout.ts")],
    bundle: true,
    format: "esm",
    platform: "node",
    outfile: tempLayout,
    logLevel: "silent",
  }),
]);
const home = await import(pathToFileURL(tempMap).href);
const layout = await import(pathToFileURL(tempLayout).href);
fs.rmSync(tempMap, { force: true });
fs.rmSync(tempLayout, { force: true });

const rawPathways = {
  glycolysis: JSON.parse(fs.readFileSync("src/data/glycolysis.json", "utf8")),
  tca: JSON.parse(fs.readFileSync("src/data/tca.json", "utf8")),
  gluconeogenesis: JSON.parse(fs.readFileSync("src/data/gluconeogenesis/gluconeogenesis.json", "utf8")),
  ppp: JSON.parse(fs.readFileSync("src/data/ppp/ppp.json", "utf8")),
  "fatty-acid-oxidation": JSON.parse(fs.readFileSync("src/data/fatty-acid-oxidation/fao.json", "utf8")),
  oxphos: JSON.parse(fs.readFileSync("src/data/oxphos/oxphos.json", "utf8")),
};

// 跨通路接口：FAS（PLATE 08）的柠檬酸穿梭、尿素循环（PLATE 09）的天冬氨酸臂
// 只用于边来源解析；它们不并入 SOURCES，因此不参与「六条通路的每个主步骤都有连线」口径。
const interfacePathways = {
  "fatty-acid-synthesis": JSON.parse(fs.readFileSync("src/data/fatty-acid-synthesis/fas.json", "utf8")),
  "urea-cycle": JSON.parse(fs.readFileSync("src/data/urea-cycle/urea.json", "utf8")),
};

const skeletonPathways = {
  glycolysis: JSON.parse(fs.readFileSync("src/data/skeleton.json", "utf8")),
  tca: JSON.parse(fs.readFileSync("src/data/skeleton-tca.json", "utf8")),
  gluconeogenesis: JSON.parse(fs.readFileSync("src/data/gluconeogenesis/skeleton.json", "utf8")),
  ppp: JSON.parse(fs.readFileSync("src/data/ppp/skeleton.json", "utf8")),
  "fatty-acid-oxidation": JSON.parse(fs.readFileSync("src/data/fatty-acid-oxidation/skeleton.json", "utf8")),
  oxphos: JSON.parse(fs.readFileSync("src/data/oxphos/skeleton.json", "utf8")),
};

const entityIds = new Set();
const stepIdsByPathway = new Map();
const transportIdsByPathway = new Map();

for (const [pathwayId, data] of Object.entries(rawPathways)) {
  const stepIds = new Set();
  for (const step of [...data.steps, ...(data.sideBranchSteps ?? [])]) {
    stepIds.add(step.id);
    for (const id of [...step.substrates, ...step.products]) entityIds.add(id);
  }
  stepIdsByPathway.set(pathwayId, stepIds);
  const transports = new Set((skeletonPathways[pathwayId].transportSteps ?? []).map((item) => item.id));
  transportIdsByPathway.set(pathwayId, transports);
  for (const entity of data.entities) entityIds.add(entity.id);
}

for (const [pathwayId, data] of Object.entries(interfacePathways)) {
  stepIdsByPathway.set(
    pathwayId,
    new Set([...data.steps, ...(data.sideBranchSteps ?? [])].map((step) => step.id)),
  );
}

// 1) 节点唯一
const nodeIds = home.HOME_NODES.map((node) => node.id);
check("节点 id 唯一（同一实体不画两次）", new Set(nodeIds).size === nodeIds.length);
const strayNodes = home.HOME_NODES.filter((node) => node.pathwayIds.length < 1);
check("每个节点至少被一条通路引用", strayNodes.length === 0, strayNodes.map((node) => node.id).join(","));

// 1b) 挂图编号：01–06、08–12（07 属 Cori，只走首页回路层、不占标题块），无重复
const plateNos = home.HOME_PATHWAYS.map((pathway) => pathway.plateNo);
check(
  "十一条挂图编号 PLATE 01–06 + 08–12 无重复",
  new Set(plateNos).size === plateNos.length &&
    ["PLATE 01", "PLATE 02", "PLATE 03", "PLATE 04", "PLATE 05", "PLATE 06", "PLATE 08", "PLATE 09", "PLATE 10", "PLATE 11", "PLATE 12"].every((no) =>
      plateNos.includes(no),
    ) &&
    plateNos.length === 11,
  plateNos.join(","),
);

// 2) junction
const junctions = home.HOME_JUNCTIONS;
const weakJunctions = junctions.filter((junction) => junction.pathwayIds.length < 2);
check("每个共用节点至少连接两条通路", weakJunctions.length === 0, weakJunctions.map((item) => item.entityId).join(","));
check(
  "共用节点都是图上的真实节点",
  junctions.every((junction) => nodeIds.includes(junction.entityId)),
);

// 3) 边可解析（用独立的 edgeFailures：不能拿全局 failures 判断，否则前面的编号/节点失败会串到这条）
const nodeSet = new Set(nodeIds);
const edgeIds = new Set();
const edgeFailures = [];
for (const edge of home.HOME_EDGES) {
  if (edgeIds.has(edge.id)) edgeFailures.push(`重复边 id: ${edge.id}`);
  edgeIds.add(edge.id);
  if (!nodeSet.has(edge.from) || !nodeSet.has(edge.to)) {
    edgeFailures.push(`边端点不在节点表: ${edge.id}`);
  }
  if (edge.from === edge.to && edge.kind !== "cycle-return") {
    edgeFailures.push(`非 cycle-return 自环: ${edge.id}`);
  }
  if (!edge.sources.length) {
    edgeFailures.push(`边没有数据来源: ${edge.id}`);
  }
  for (const source of edge.sources) {
    if (source.stepId) {
      const isTransport = transportIdsByPathway.get(source.pathwayId)?.has(source.stepId);
      const isStep = stepIdsByPathway.get(source.pathwayId)?.has(source.stepId);
      if (!isStep && !isTransport) {
        edgeFailures.push(`边来源无法解析: ${edge.id} ← ${source.pathwayId}:${source.stepId}`);
      }
    } else if (
      source.linkType !== "cycle-return" &&
      source.linkType !== "cycle-exit" &&
      // urea skeleton 的 recycle 链接（fum → asp）没有 step id，按结构接口放行。
      source.linkType !== "recycle"
    ) {
      edgeFailures.push(`边来源缺少 stepId 且不是结构性环路/出环边: ${edge.id} (${source.linkType})`);
    }
  }
}
check("每条边都能解析到数据来源", edgeFailures.length === 0, edgeFailures.slice(0, 3).join(" | "));

// 4) 每个主步骤都有可见边
const sourcedSteps = new Set();
for (const edge of home.HOME_EDGES) {
  for (const source of edge.sources) {
    if (source.stepId) sourcedSteps.add(`${source.pathwayId}:${source.stepId}`);
  }
}
const missingSteps = [];
for (const [pathwayId, data] of Object.entries(rawPathways)) {
  for (const step of data.steps) {
    if (!sourcedSteps.has(`${pathwayId}:${step.id}`)) missingSteps.push(`${pathwayId}:${step.id}`);
  }
}
check("六条通路的每个主步骤都有对应连线", missingSteps.length === 0, missingSteps.join(","));

// 5) 资产别名
const aliases = home.ASSET_ID_ALIASES;
const badAliases = aliases.filter((alias) => !entityIds.has(alias.entityId));
check("资产别名全部指向真实数据实体", badAliases.length === 0, badAliases.map((item) => item.assetId).join(","));

// 6) 版面
const positions = layout.HOME_POS ?? {};
const missingPositions = nodeIds.filter((id) => !positions[id]);
check("每个节点都有版面坐标", missingPositions.length === 0, missingPositions.join(","));
const canvas = layout.HOME_CANVAS;
const outOfBounds = nodeIds.filter((id) => {
  const pos = positions[id];
  return pos && (pos.x < 0 || pos.y < 0 || pos.x > canvas.width || pos.y > canvas.height);
});
check("节点坐标落在画布内", outOfBounds.length === 0, outOfBounds.join(","));

// 7) 连通性（从葡萄糖出发，无向）
const adjacency = new Map(nodeIds.map((id) => [id, new Set()]));
for (const edge of home.HOME_EDGES) {
  if (edge.from === edge.to) continue;
  adjacency.get(edge.from)?.add(edge.to);
  adjacency.get(edge.to)?.add(edge.from);
}
const reachable = new Set();
if (adjacency.has("glc")) {
  const queue = ["glc"];
  while (queue.length) {
    const current = queue.shift();
    if (reachable.has(current)) continue;
    reachable.add(current);
    for (const next of adjacency.get(current) ?? []) if (!reachable.has(next)) queue.push(next);
  }
}
const unreachable = nodeIds.filter((id) => !reachable.has(id));
check("整张图从葡萄糖出发可达（无孤立区块）", unreachable.length === 0, unreachable.join(","));

// 7) 上下两域构图
const bands = layout.HOME_BANDS ?? [];
const cytosolBand = bands.find((band) => band.id === "cytosol");
const membraneBand = bands.find((band) => band.id === "membrane");
const matrixBand = bands.find((band) => band.id === "matrix");
check(
  "三条域带存在：胞质 / 膜带 / 线粒体基质",
  Boolean(cytosolBand && membraneBand && matrixBand),
);
check(
  "三条域带自上而下连续、无缝隙地覆盖画布",
  Boolean(
    cytosolBand &&
      membraneBand &&
      matrixBand &&
      cytosolBand.top >= 0 &&
      cytosolBand.bottom === membraneBand.top &&
      membraneBand.bottom === matrixBand.top &&
      matrixBand.bottom <= canvas.height
  ),
  JSON.stringify(bands.map((band) => [band.id, band.top, band.bottom])),
);
const membraneLines = layout.HOME_MEMBRANE_LINES ?? [];
check(
  "膜带三条线（外膜 / 膜间腔 / 内膜）都在膜带内",
  membraneLines.length === 3 &&
    Boolean(membraneBand) &&
    membraneLines.every((line) => line.y >= membraneBand.top && line.y <= membraneBand.bottom),
  JSON.stringify(membraneLines),
);
const bandDistance = (y) => {
  if (!membraneBand) return Infinity;
  if (y < membraneBand.top) return membraneBand.top - y;
  if (y > membraneBand.bottom) return y - membraneBand.bottom;
  return 0;
};
const sharedBoundary = ["pyr", "accoa", "oaa"];
const boundaryDists = sharedBoundary.map((id) => [id, Math.round(bandDistance(positions[id].y))]);
check(
  "跨域共用节点（丙酮酸 / 乙酰-CoA / 草酰乙酸）都贴着膜带（≤40 px）",
  boundaryDists.every(([, distance]) => distance <= 40),
  JSON.stringify(boundaryDists),
);
let closest = { pair: "", distance: Infinity };
for (let i = 0; i < nodeIds.length; i += 1) {
  for (let j = i + 1; j < nodeIds.length; j += 1) {
    const a = positions[nodeIds[i]];
    const b = positions[nodeIds[j]];
    const distance = Math.hypot(a.x - b.x, a.y - b.y);
    if (distance < closest.distance) closest = { pair: `${nodeIds[i]}/${nodeIds[j]}`, distance };
  }
}
check(
  "节点之间互不重叠（最小间距 ≥ 40 px）",
  closest.distance >= 40,
  `${closest.pair} = ${closest.distance.toFixed(1)} px`,
);
const pathwayLabels = layout.HOME_PATHWAY_LABELS ?? [];
check(
  "十一个通路标签都在画布内（第 11 / 12 条允许出屏）",
  pathwayLabels.length === 11 &&
    pathwayLabels.every((label) => label.x > 0 && label.y > 0 && label.x < canvas.width && label.y < canvas.height),
  JSON.stringify(pathwayLabels.map((label) => [label.pathwayId, label.x, label.y])),
);
check(
  "版面坐标表没有多余键（不会出现第二份同名节点）",
  Object.keys(positions).length === nodeIds.length,
  `${Object.keys(positions).length} vs ${nodeIds.length}`,
);

// 8) 计数口径：必须与实测精确相等（不是「至少」）。
// PLATE 08 柠檬酸穿梭接入后：节点不变 38（cit / accoa 原本就在图上），
// cit 由 TCA 单通路变为 TCA / FAS 共用，共用节点 16→17，边 62→63。
// PLATE 09 尿素循环接入天冬氨酸—延胡索酸臂后：新增 asp / argininosuccinate
// 两个节点（38→40），fum 由 TCA 单通路变为 TCA / 尿素循环共用（17→18），
// 新增 urea-3、urea-4 与 recycle 三条边（63→66）。
check("节点数精确为 40", nodeIds.length === 40, String(nodeIds.length));
check("共用节点数精确为 18", junctions.length === 18, String(junctions.length));
check("边数精确为 66", home.HOME_EDGES.length === 66, String(home.HOME_EDGES.length));
check("资产别名数精确为 14", aliases.length === 14, String(aliases.length));
check(
  "FAS 接口边存在（cit → accoa，来源 fas-shuttle）",
  home.HOME_EDGES.some(
    (edge) =>
      edge.id === "fatty-acid-synthesis:cit->accoa" &&
      edge.sources.some((source) => source.pathwayId === "fatty-acid-synthesis" && source.stepId === "fas-shuttle"),
  ),
);
check(
  "尿素循环天冬氨酸臂三条边存在（urea-3 / urea-4 / recycle）",
  ["urea-cycle:asp->argininosuccinate", "urea-cycle:argininosuccinate->fum", "urea-cycle:fum->asp"].every((id) =>
    home.HOME_EDGES.some((edge) => edge.id === id),
  ),
  home.HOME_EDGES.filter((edge) => edge.pathwayId === "urea-cycle").map((edge) => edge.id).join(","),
);
check(
  "fum 为 TCA / 尿素循环共用节点",
  home.HOME_JUNCTIONS.some(
    (junction) =>
      junction.entityId === "fum" &&
      junction.pathwayIds.includes("tca") &&
      junction.pathwayIds.includes("urea-cycle"),
  ),
);
check(
  "asp / argininosuccinate 只挂在尿素循环（不误并入其他通路）",
  ["asp", "argininosuccinate"].every((id) => {
    const node = home.HOME_NODES.find((item) => item.id === id);
    return Boolean(node) && node.pathwayIds.length === 1 && node.pathwayIds[0] === "urea-cycle";
  }),
);

for (const item of checks) {
  console.log(`${item.ok ? "✓" : "✗"} ${item.label}${item.detail ? ` — ${item.detail}` : ""}`);
}

console.log("\n—— 摘要 ——");
console.log(`节点 ${nodeIds.length} 个；共用节点 ${junctions.length} 个；边 ${home.HOME_EDGES.length} 条；别名 ${aliases.length} 条`);
console.log("共用节点：");
for (const junction of junctions) {
  console.log(`  ${junction.label}（${junction.fullName}） ×${junction.pathwayIds.length} · ${junction.pathwayIds.join(" / ")}`);
}

if (failures.length) {
  console.error(`\n校验失败 ${failures.length} 项`);
  process.exit(1);
}
console.log("\n首页总图数据校验全部通过");
