// 从 skeleton.json + glycolysis.json 生成肝/肌/红细胞三张糖酵解 SVG。
// 附带两类校验：
//  1) 坐标一致性：同一通路各器官图的主链节点 ID 与坐标必须完全一致，否则报错退出；
//  2) 化学一致性：links 引用的 stepId 必须存在，且 link 两端与该步底物/产物节点对应。
// 仅用 Node 内置能力，无第三方依赖。
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const DATA_DIR = join(ROOT, "src", "data");
const OUT_DIR = join(ROOT, "public", "assets", "pathways", "glycolysis");

const skeleton = JSON.parse(readFileSync(join(DATA_DIR, "skeleton.json"), "utf8"));
const data = JSON.parse(readFileSync(join(DATA_DIR, "glycolysis.json"), "utf8"));

const ORGANS = ["liver", "muscle", "rbc"];
const ORGAN_NAMES = { liver: "肝", muscle: "肌", rbc: "红细胞" };

// ---------- 校验 ----------

/** 主链节点映射：id -> {x, y}（order 非 null 的节点） */
function mainChainMap(nodes) {
  const map = new Map();
  for (const n of nodes) {
    if (n.order !== null) map.set(n.id, { x: n.x, y: n.y, order: n.order });
  }
  return map;
}

function fail(msg) {
  console.error(`[build-pathway-svg] 校验失败：${msg}`);
  process.exit(1);
}

// 化学一致性：link ↔ step 对应
const stepById = new Map(data.steps.map((s) => [s.id, s]));
for (const link of skeleton.links) {
  const step = stepById.get(link.stepId);
  if (!step) fail(`link 引用了不存在的 stepId "${link.stepId}"`);
  const fromNode = skeleton.nodes.find((n) => n.id === link.from);
  const toNode = skeleton.nodes.find((n) => n.id === link.to);
  if (!fromNode || !toNode) fail(`link ${link.from}->${link.to} 引用了不存在的节点`);
  // 该步底物/产物中应包含 link 两端节点对应的代谢物
  const substrates = step.substrates.flatMap((id) => entity_labels(id));
  const products = step.products.flatMap((id) => entity_labels(id));
  if (!substrates.includes(fromNode.label) && !products.includes(fromNode.label))
    fail(`step ${step.id} 与 link 起点 ${fromNode.label} 不对应`);
  if (!substrates.includes(toNode.label) && !products.includes(toNode.label))
    fail(`step ${step.id} 与 link 终点 ${toNode.label} 不对应`);
}
function entity_labels(entityId) {
  const e = data.entities.find((x) => x.id === entityId);
  if (!e) fail(`step 引用了不存在的实体 "${entityId}"`);
  return [e.name, e.abbr].filter(Boolean);
}

// ---------- 图元常量（代谢物圆形 / 酶圆角矩形 / 反应节点小方块 / 实心箭头 / 空心圆头） ----------
const NODE_R = 26; // 代谢物圆半径
const RX_SQ = 9; // 反应节点小方块半边长
const C = {
  ink: "#2b2a26",
  line: "#8a8578",
  nodeFill: "#f4f1ea",
  accent: "#9a5b2e", // 有器官差异步骤的强调色（赭）
  dim: "#c9c4b8",
  lane: "#faf8f3",
  laneEdge: "#e4dfd4",
  font: "'Source Han Serif SC','Noto Serif SC',serif",
};
const W = 1760;
const H = 560;

function esc(s) {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/** 两个坐标间的连线（避开圆形节点本体） */
function edgePath(a, b) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.hypot(dx, dy);
  const ux = dx / len;
  const uy = dy / len;
  return {
    x1: a.x + ux * NODE_R,
    y1: a.y + uy * NODE_R,
    x2: b.x - ux * (NODE_R + 8),
    y2: b.y - uy * (NODE_R + 8),
    mx: (a.x + b.x) / 2,
    my: (a.y + b.y) / 2,
  };
}

/** 生成一张器官 SVG 的内部节点/连线描述（供渲染与坐标校验共用） */
function buildGraph(organ) {
  const nodes = skeleton.nodes.map((n) => ({ ...n }));
  const links = skeleton.links.map((l) => {
    const step = stepById.get(l.stepId);
    return { ...l, step };
  });
  return { nodes, links };
}

function renderSvg(organ) {
  const { nodes, links } = buildGraph(organ);
  const nodeById = new Map(nodes.map((n) => [n.id, n]));
  const parts = [];

  // 区室泳道背景
  const laneTop = 60;
  const laneBottom = H - 30;
  parts.push(
    `<rect x="20" y="${laneTop}" width="${W - 40}" height="${laneBottom - laneTop}" rx="14" fill="${C.lane}" stroke="${C.laneEdge}"/>`
  );
  parts.push(
    `<text x="36" y="${laneTop + 28}" font-family="${C.font}" font-size="15" fill="${C.line}">细胞质（cytosol）</text>`
  );
  parts.push(
    `<text x="${W - 36}" y="${laneTop + 28}" text-anchor="end" font-family="${C.font}" font-size="15" fill="${C.line}">糖酵解 · ${ORGAN_NAMES[organ]}视图</text>`
  );

  // 主链连线 + 反应节点小方块 + 酶圆角矩形
  for (const link of links) {
    const a = nodeById.get(link.from);
    const b = nodeById.get(link.to);
    const { x1, y1, x2, y2, mx, my } = edgePath(a, b);
    const step = link.step;
    const hasDiff = step.organDiffs.some((d) => d.organ === organ);
    const irr = step.irreversible;
    const active = hasDiff;
    const lineColor = irr ? C.ink : C.line;
    const sw = irr ? 2.2 : 1.4;

    parts.push(
      `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${lineColor}" stroke-width="${sw}" ${irr ? `marker-end="url(#arrow-solid)"` : `marker-end="url(#arrow-open)"`}/>`
    );

    // 反应节点小方块（可点击目标）
    parts.push(
      `<rect class="rx" data-step-id="${step.id}" x="${mx - RX_SQ}" y="${my - RX_SQ}" width="${RX_SQ * 2}" height="${RX_SQ * 2}" rx="2.5" fill="${active ? C.accent : C.nodeFill}" stroke="${C.ink}" stroke-width="1.4"/>`
    );

    // 酶圆角矩形（反应方块上方）
    const ename = step.enzyme.name;
    const label = step.index ? `${step.index}. ${ename}` : ename;
    const wpx = 14 + label.length * 15;
    const ey = my - 46;
    parts.push(
      `<g class="enzyme" data-step-id="${step.id}"><rect x="${mx - wpx / 2}" y="${ey - 18}" width="${wpx}" height="26" rx="9" fill="#fff" stroke="${C.ink}" stroke-width="1.1"/><text x="${mx}" y="${ey}" text-anchor="middle" font-family="${C.font}" font-size="13.5" fill="${C.ink}">${esc(label)}</text></g>`
    );

    // 催化弧：空心圆头（酶 → 反应方块）
    parts.push(
      `<path d="M ${mx} ${ey + 8} Q ${mx + 16} ${my - 24} ${mx + RX_SQ + 3} ${my - RX_SQ - 4}" fill="none" stroke="${C.line}" stroke-width="1.3" marker-end="url(#cap-hollow)"/>`
    );

    // 消耗/生成：实心小箭头 + 文本（辅因子）
    const cos = step.cofactors;
    if (cos.length > 0) {
      const below = my + RX_SQ + 10;
      const txt = cos.join(" / ");
      const ttw = 12 + txt.length * 13;
      parts.push(
        `<g class="cofactors" data-step-id="${step.id}"><line x1="${mx}" y1="${my + RX_SQ}" x2="${mx}" y2="${below - 4}" stroke="${C.ink}" stroke-width="1.4" marker-end="url(#arrow-solid-below)"/><text x="${mx}" y="${below + 12}" text-anchor="middle" font-family="${C.font}" font-size="12.5" fill="${C.line}">${esc(txt)}</text></g>`
      );
    }
  }

  // 代谢物圆形节点
  for (const n of nodes) {
    const r = NODE_R;
    if (n.order !== null) {
      parts.push(
        `<g class="node" data-node-id="${n.id}"><circle cx="${n.x}" cy="${n.y}" r="${r}" fill="${C.nodeFill}" stroke="${C.ink}" stroke-width="1.6"/><text x="${n.x}" y="${n.y + 5}" text-anchor="middle" font-family="${C.font}" font-size="13" font-weight="600" fill="${C.ink}">${esc(n.label)}</text></g>`
      );
    } else {
      // 支路节点（DHAP / 2,3-BPG）：虚线圆
      parts.push(
        `<g class="node branch-node" data-node-id="${n.id}"><circle cx="${n.x}" cy="${n.y}" r="${r}" fill="#fff" stroke="${C.line}" stroke-width="1.4" stroke-dasharray="4 3"/><text x="${n.x}" y="${n.y + 5}" text-anchor="middle" font-family="${C.font}" font-size="12.5" fill="${C.line}">${esc(n.label)}</text></g>`
      );
    }
  }

  // 支路连线（虚线，默认折叠由页面控制 class）
  for (const br of skeleton.sideBranches) {
    const isRbcOnly = br.id === "rapoport-luebering";
    const relevant = !isRbcOnly || organ === "rbc";
    const from = nodeById.get(br.from);
    const branchNode = nodeById.get(br.nodeIds[0]);
    const to = br.to ? nodeById.get(br.to) : null;
    const opacity = relevant ? 1 : 0.25;
    parts.push(`<g class="branch" data-branch-id="${br.id}" data-organ-relevant="${relevant}" opacity="${opacity}">`);
    parts.push(
      `<line x1="${from.x + NODE_R * 0.7}" y1="${from.y + NODE_R * 0.7}" x2="${branchNode.x - 10}" y2="${branchNode.y - 10}" stroke="${C.line}" stroke-width="1.3" stroke-dasharray="5 4"/>`
    );
    if (to) {
      parts.push(
        `<line x1="${branchNode.x + 10}" y1="${branchNode.y - 10}" x2="${to.x - NODE_R * 0.7}" y2="${to.y + NODE_R * 0.7}" stroke="${C.line}" stroke-width="1.3" stroke-dasharray="5 4" marker-end="url(#arrow-open)"/>`
      );
    }
    const bx = branchNode.x;
    const by = branchNode.y + NODE_R + 18;
    parts.push(
      `<text x="${bx}" y="${by}" text-anchor="middle" font-family="${C.font}" font-size="12" fill="${C.line}">${esc(br.name)}</text>`
    );
    parts.push(`</g>`);
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" font-family="${C.font}">
<defs>
<marker id="arrow-solid" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="${C.ink}"/></marker>
<marker id="arrow-solid-below" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="${C.ink}"/></marker>
<marker id="arrow-open" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10" fill="none" stroke="${C.line}" stroke-width="1.4"/></marker>
<marker id="cap-hollow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse"><circle cx="5" cy="5" r="3.2" fill="#fff" stroke="${C.line}" stroke-width="1.2"/></marker>
</defs>
${parts.join("\n")}
</svg>`;
}

// ---------- 生成 + 坐标一致性校验 ----------
mkdirSync(OUT_DIR, { recursive: true });

let referenceMap = null;
for (const organ of ORGANS) {
  const { nodes } = buildGraph(organ);
  const map = mainChainMap(nodes);

  // 坐标一致性：与首张器官图逐节点比对 id 与坐标
  if (referenceMap) {
    if (map.size !== referenceMap.size) fail(`${organ} 主链节点数量与基准不一致`);
    for (const [id, ref] of referenceMap) {
      const cur = map.get(id);
      if (!cur) fail(`${organ} 缺少主链节点 "${id}"`);
      if (cur.x !== ref.x || cur.y !== ref.y || cur.order !== ref.order)
        fail(`${organ} 节点 "${id}" 坐标 (${cur.x},${cur.y}) 与基准 (${ref.x},${ref.y}) 不一致`);
    }
  } else {
    // 首个器官作为基准前，先对 skeleton 本身做主链顺序校验：order 应为 0..N-1
    const orders = [...map.values()].map((n) => n.order).sort((a, b) => a - b);
    orders.forEach((o, i) => {
      if (o !== i) fail(`主链 order 不连续：第 ${i} 位是 ${o}`);
    });
  }

  const svg = renderSvg(organ);
  const file = join(OUT_DIR, `glycolysis-${organ}.svg`);
  writeFileSync(file, svg, "utf8");
  console.log(`✓ ${file}`);
  if (!referenceMap) {
    // 记录基准（深拷贝）
    referenceMap = map;
  }
}

// 生成后再次显式对比三张图的主链一致性（把基准与所有图都过一遍）
const baseMap = mainChainMap(buildGraph(ORGANS[0]).nodes);
for (const organ of ORGANS.slice(1)) {
  const m = mainChainMap(buildGraph(organ).nodes);
  for (const [id, ref] of baseMap) {
    const cur = m.get(id);
    if (!cur || cur.x !== ref.x || cur.y !== ref.y)
      fail(`最终校验：${organ} 的节点 "${id}" 与 ${ORGANS[0]} 不一致`);
  }
}
console.log(`✓ 坐标一致性校验通过（主链 ${baseMap.size} 节点 × ${ORGANS.length} 器官）`);
