/**
 * 首页总图数据校验（数据驱动，不依赖页面渲染）
 *
 * 校验点：
 *  1. 节点唯一（同一实体 id 不能出现两次）且每个节点至少被一条通路引用；
 *  2. junction 至少被两条通路引用；
 *  3. 任意一条边都能解析到某条通路的 step / transport / skeleton link；
 *  4. 五条通路的每一个主步骤都至少产生一条可见边；
 *  5. 资产别名全部指向真实存在的数据实体；
 *  6. 版面坐标覆盖全部节点且落在画布内；自环只允许出现在 cycle-return。
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
};

const skeletonPathways = {
  glycolysis: JSON.parse(fs.readFileSync("src/data/skeleton.json", "utf8")),
  tca: JSON.parse(fs.readFileSync("src/data/skeleton-tca.json", "utf8")),
  gluconeogenesis: JSON.parse(fs.readFileSync("src/data/gluconeogenesis/skeleton.json", "utf8")),
  ppp: JSON.parse(fs.readFileSync("src/data/ppp/skeleton.json", "utf8")),
  "fatty-acid-oxidation": JSON.parse(fs.readFileSync("src/data/fatty-acid-oxidation/skeleton.json", "utf8")),
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

// 1) 节点唯一
const nodeIds = home.HOME_NODES.map((node) => node.id);
check("节点 id 唯一（同一实体不画两次）", new Set(nodeIds).size === nodeIds.length);
const strayNodes = home.HOME_NODES.filter((node) => node.pathwayIds.length < 1);
check("每个节点至少被一条通路引用", strayNodes.length === 0, strayNodes.map((node) => node.id).join(","));

// 2) junction
const junctions = home.HOME_JUNCTIONS;
const weakJunctions = junctions.filter((junction) => junction.pathwayIds.length < 2);
check("每个共用节点至少连接两条通路", weakJunctions.length === 0, weakJunctions.map((item) => item.entityId).join(","));
check(
  "共用节点都是图上的真实节点",
  junctions.every((junction) => nodeIds.includes(junction.entityId)),
);

// 3) 边可解析
const nodeSet = new Set(nodeIds);
const edgeIds = new Set();
for (const edge of home.HOME_EDGES) {
  if (edgeIds.has(edge.id)) failures.push(`重复边 id: ${edge.id}`);
  edgeIds.add(edge.id);
  if (!nodeSet.has(edge.from) || !nodeSet.has(edge.to)) {
    failures.push(`边端点不在节点表: ${edge.id}`);
  }
  if (edge.from === edge.to && edge.kind !== "cycle-return") {
    failures.push(`非 cycle-return 自环: ${edge.id}`);
  }
  if (!edge.sources.length) {
    failures.push(`边没有数据来源: ${edge.id}`);
  }
  for (const source of edge.sources) {
    if (source.stepId) {
      const isTransport = transportIdsByPathway.get(source.pathwayId)?.has(source.stepId);
      const isStep = stepIdsByPathway.get(source.pathwayId)?.has(source.stepId);
      if (!isStep && !isTransport) {
        failures.push(`边来源无法解析: ${edge.id} ← ${source.pathwayId}:${source.stepId}`);
      }
    } else if (source.linkType !== "cycle-return" && source.linkType !== "cycle-exit") {
      failures.push(`边来源缺少 stepId 且不是结构性环路/出环边: ${edge.id} (${source.linkType})`);
    }
  }
}
check("每条边都能解析到数据来源", failures.length === 0, failures.slice(0, 3).join(" | "));

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
check("五条通路的每个主步骤都有对应连线", missingSteps.length === 0, missingSteps.join(","));

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
