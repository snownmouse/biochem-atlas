import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  HOME_EDGES,
  HOME_JUNCTIONS,
  HOME_NODES,
  HOME_PATHWAYS,
  homePathwayMeta,
  junctionById,
  type HomeEdge,
  type HomeNode,
  type HomePathwayId,
} from "../data/homeMap";
import { HOME_BANDS, HOME_CANVAS, HOME_PATHWAY_LABELS, HOME_POS } from "../data/homeLayout";

const C = {
  paper: "#f6f3ec",
  ink: "#22282a",
  amber: "#b4761f",
  teal: "#2e6e6b",
  brick: "#9c4a3c",
  hair: "rgba(34,40,42,0.55)",
  hairSoft: "rgba(34,40,42,0.22)",
  hairFaint: "rgba(34,40,42,0.1)",
};

const PATH_COLOR: Record<HomePathwayId, string> = {
  glycolysis: C.ink,
  tca: C.amber,
  gluconeogenesis: C.ink,
  ppp: C.teal,
  "fatty-acid-oxidation": C.amber,
};

const JUNCTION_IDS = new Set(HOME_NODES.filter((node) => node.junction).map((node) => node.id));

/** 首屏总览的区段刻度：只切横轴，不改构图。 */
const HOME_SEGMENTS = [
  { id: "cytosol", label: "胞质主链 · 糖酵解 / 糖异生 / PPP", start: 0, end: 1080 },
  { id: "matrix", label: "线粒体基质 · TCA", start: 1080, end: 2000 },
  { id: "membrane", label: "膜 · β-氧化", start: 2000, end: HOME_CANVAS.width },
];

function nodeRadius(nodeId: string): number {
  return JUNCTION_IDS.has(nodeId) ? 10 : 5.5;
}

interface EdgeGeometry {
  edge: HomeEdge;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  nx: number;
  ny: number;
  labelX: number;
  labelY: number;
}

function edgeGeometry(edge: HomeEdge, siblings: HomeEdge[]): EdgeGeometry | null {
  const a = HOME_POS[edge.from];
  const b = HOME_POS[edge.to];
  if (!a || !b) return null;
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.hypot(dx, dy);
  if (len === 0) return null;
  const nx = -dy / len;
  const ny = dx / len;
  const index = siblings.findIndex((item) => item.id === edge.id);
  const offset = siblings.length > 1 ? (index - (siblings.length - 1) / 2) * 20 : 0;
  const startR = nodeRadius(edge.from) + 3;
  const endR = nodeRadius(edge.to) + 4;
  const ux = dx / len;
  const uy = dy / len;
  const sx = a.x + ux * startR + nx * offset;
  const sy = a.y + uy * startR + ny * offset;
  const ex = b.x - ux * endR + nx * offset;
  const ey = b.y - uy * endR + ny * offset;
  const midX = (sx + ex) / 2;
  const midY = (sy + ey) / 2;
  return {
    edge,
    x1: sx,
    y1: sy,
    x2: ex,
    y2: ey,
    nx,
    ny,
    labelX: midX - nx * 10,
    labelY: midY - ny * 10,
  };
}

function arrowHead(x1: number, y1: number, x2: number, y2: number, color: string, solid: boolean) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len;
  const uy = dy / len;
  const nx = -uy;
  const ny = ux;
  const baseX = x2 - ux * 9;
  const baseY = y2 - uy * 9;
  const p1 = `${x2},${y2}`;
  const p2 = `${baseX + nx * 3.8},${baseY + ny * 3.8}`;
  const p3 = `${baseX - nx * 3.8},${baseY - ny * 3.8}`;
  return (
    <path
      d={`M${p1} L${p2} L${p3} Z`}
      fill={solid ? color : C.paper}
      stroke={color}
      strokeWidth={solid ? 0.8 : 1.2}
    />
  );
}

function crossingPoint(x1: number, y1: number, x2: number, y2: number, targetY: number): { x: number; y: number } | null {
  if ((y1 < targetY && y2 <= targetY) || (y1 > targetY && y2 >= targetY)) return null;
  if (y1 === y2) return null;
  const t = (targetY - y1) / (y2 - y1);
  if (t < 0 || t > 1) return null;
  return { x: x1 + (x2 - x1) * t, y: targetY };
}

/** 跨膜文字若压在节点上，只把文字推开；红色刻线仍留在膜带原位。 */
function crossLabelShift(x: number, y: number): number {
  for (const node of HOME_NODES) {
    const pos = HOME_POS[node.id];
    if (!pos) continue;
    if (Math.abs(pos.x - x) < 34 && Math.abs(pos.y - y) < 22) return pos.y <= y ? 26 : -26;
  }
  return 0;
}

/** 跨膜标注的锚点：先取膜带中线；穿梭类线段若不穿过中线，退到内膜/外膜线，最后退到线段中点。 */
function crossAnchor(x1: number, y1: number, x2: number, y2: number): { x: number; y: number; onBand: boolean } {
  for (const targetY of [470, 440, 520]) {
    const hit = crossingPoint(x1, y1, x2, y2, targetY);
    if (hit) return { ...hit, onBand: targetY === 470 };
  }
  return { x: (x1 + x2) / 2, y: (y1 + y2) / 2, onBand: false };
}

function nodeLabelPosition(node: HomeNode): { x: number; y: number; anchor: "start" | "middle" | "end" } {
  const pos = HOME_POS[node.id];
  if (!pos) return { x: 0, y: 0, anchor: "middle" };
  if (pos.side === "left") return { x: pos.x - 16, y: pos.y + 4, anchor: "end" };
  if (pos.side === "right") return { x: pos.x + 16, y: pos.y + 4, anchor: "start" };
  if (pos.side === "above") return { x: pos.x, y: pos.y - 17, anchor: "middle" };
  return { x: pos.x, y: pos.y + 29, anchor: "middle" };
}

function svgText(
  text: string,
  x: number,
  y: number,
  size: number,
  anchor: "start" | "middle" | "end" = "middle",
  extra: { fill?: string; opacity?: number; letterSpacing?: string; fontWeight?: number | string } = {},
) {
  return (
    <text
      x={x}
      y={y}
      fontSize={size}
      textAnchor={anchor}
      fill={extra.fill}
      opacity={extra.opacity}
      letterSpacing={extra.letterSpacing}
      fontWeight={extra.fontWeight}
    >
      {text}
    </text>
  );
}

export function HomePage() {
  const navigate = useNavigate();
  const [selectedJunction, setSelectedJunction] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const navRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const [activeSegment, setActiveSegment] = useState(0);

  function handleMapScroll() {
    const el = scrollRef.current;
    if (!el) return;
    // 视口足够宽时不再有“当前段”，改报“全图”。
    if (el.scrollWidth - el.clientWidth <= 4) {
      setActiveSegment(-1);
      return;
    }
    const probe = el.scrollLeft + el.clientWidth * 0.65;
    const index = HOME_SEGMENTS.findIndex((seg) => probe >= seg.start && probe < seg.end);
    if (index >= 0) setActiveSegment(index);
  }

  function goSegment(index: number) {
    setActiveSegment(index);
    const el = scrollRef.current;
    if (!el) return;
    const max = Math.max(0, el.scrollWidth - el.clientWidth);
    const left = Math.min(max, (HOME_SEGMENTS[index].start / HOME_CANVAS.width) * el.scrollWidth);
    el.scrollTo({ left, behavior: "auto" });
  }

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    handleMapScroll();
    const observer = new ResizeObserver(() => handleMapScroll());
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const pairGroups = useMemo(() => {
    const groups = new Map<string, HomeEdge[]>();
    for (const edge of HOME_EDGES) {
      const key = [edge.from, edge.to].sort().join("|");
      const list = groups.get(key) ?? [];
      list.push(edge);
      groups.set(key, list);
    }
    return groups;
  }, []);

  const selected = selectedJunction ? junctionById(selectedJunction) : undefined;

  function handleNode(node: HomeNode) {
    if (node.junction) {
      setSelectedJunction(node.id);
      return;
    }
    const pathwayId = node.pathwayIds[0];
    if (pathwayId) navigate(homePathwayMeta(pathwayId).route);
  }

  function handleEdge(edge: HomeEdge) {
    const route = homePathwayMeta(edge.pathwayId).route;
    if (edge.primaryStepId) navigate(`${route}?step=${edge.primaryStepId}`);
    else navigate(route);
  }

  return (
    <div className="poster home-poster" data-page="home">
      <nav className="crumb home-crumb">
        <b>首页</b>
        <span className="sep">／</span>
        <span>代谢总图 · MASTER MAP</span>
      </nav>

      <header className="masthead">
        <div className="mast-top">
          <span className="kicker">代谢通路挂图 · METABOLIC WALL CHART</span>
          <span className="plate-no num">PLATE 00 / 12 · 总图 · 2026</span>
        </div>
        <div className="mast-main">
          <h1>
            代谢总图
            <small>METABOLIC ATLAS · FIVE PATHWAYS</small>
          </h1>
          <p className="mast-summary">
            五条通路同框；<b>同名代谢物只画一次</b>，跨区室处按转运步骤连接。点通路名或主链节点进入挂图，点共用节点看它接通了哪几条路。
          </p>
        </div>
      </header>

      <div className="legend">
        <span className="lg">
          <svg width="34" height="12" aria-hidden="true">
            <line x1="2" y1="6" x2="24" y2="6" stroke={C.ink} strokeWidth="2" />
            <path d="M24 6 l-7 -3.5 v7 z" fill={C.ink} />
          </svg>
          不可逆
        </span>
        <span className="lg">
          <svg width="34" height="12" aria-hidden="true">
            <line x1="2" y1="6" x2="24" y2="6" stroke={C.ink} strokeWidth="1.2" />
            <path d="M24 6 l-7 -3.5 v7 z" fill={C.paper} stroke={C.ink} strokeWidth="1.2" />
          </svg>
          可逆
        </span>
        <span className="lg">
          <svg width="24" height="16" aria-hidden="true">
            <circle cx="12" cy="8" r="7" fill="none" stroke={C.brick} strokeWidth="1.4" />
            <circle cx="12" cy="8" r="3.5" fill={C.paper} stroke={C.ink} strokeWidth="1.2" />
          </svg>
          共用节点
        </span>
        <span className="lg">
          <svg width="20" height="16" aria-hidden="true">
            <line x1="10" y1="1" x2="10" y2="15" stroke={C.brick} strokeWidth="1.2" />
          </svg>
          跨膜转运（红色刻线）
        </span>
        <span className="lg" style={{ color: C.teal }}>青 · 磷酸戊糖</span>
        <span className="lg" style={{ color: C.amber }}>琥珀 · 线粒体两条</span>
        <span className="legend-hint">点段名跳转 · 横向漫游 2480 px</span>
      </div>

      <div className="home-index" data-testid="home-index">
        <span className="idx-k">挂图</span>
        {HOME_PATHWAYS.map((pathway) => (
          <Link key={pathway.id} to={pathway.route} data-home-link={pathway.id}>
            {pathway.name}
          </Link>
        ))}
        <span className="idx-sep">｜</span>
        <span className="idx-k">结构对照</span>
        {HOME_PATHWAYS.map((pathway) => (
          <Link key={`${pathway.id}-structure`} to={pathway.structureRoute} data-home-link={`${pathway.id}-structure`}>
            {pathway.name}
          </Link>
        ))}
      </div>

      <div className="body-grid">
        <div className="plate-wrap">
          <div className="plate-head">
            <span className="t">总图 · MASTER MAP</span>
            <span className="organ-switch">区室：基质 → 内膜 → 膜间腔 → 胞质 → ER 腔</span>
          </div>

          <div className="home-mapnav" data-testid="home-mapnav">
            <span className="mn-k">总览</span>
            <div className="mn-track" role="group" aria-label="总图区段导航">
              {HOME_SEGMENTS.map((seg, index) => (
                <button
                  key={seg.id}
                  type="button"
                  ref={(el) => {
                    navRefs.current[index] = el;
                  }}
                  className={`mn-seg${activeSegment === index ? " on" : ""}`}
                  style={{
                    left: `${(seg.start / HOME_CANVAS.width) * 100}%`,
                    width: `${((seg.end - seg.start) / HOME_CANVAS.width) * 100}%`,
                  }}
                  data-nav-segment={seg.id}
                  aria-current={activeSegment === index ? "true" : undefined}
                  onClick={() => goSegment(index)}
                  onKeyDown={(event) => {
                    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
                    event.preventDefault();
                    const step = event.key === "ArrowRight" ? 1 : HOME_SEGMENTS.length - 1;
                    navRefs.current[(index + step) % HOME_SEGMENTS.length]?.focus();
                  }}
                >
                  <span className="mn-tick" aria-hidden="true" />
                  <span className="mn-label">{seg.label}</span>
                </button>
              ))}
            </div>
            <span className="mn-count" data-testid="home-nav-count">
              {activeSegment < 0 ? "全图 · 03 段" : `03 段 · 当前 ${String(activeSegment + 1).padStart(2, "0")}`}
            </span>
          </div>

          <div className="plate-scroll" ref={scrollRef} onScroll={handleMapScroll} data-testid="home-plate-scroll">
            <div className="plate-canvas home-canvas">
              <svg
                width={HOME_CANVAS.width}
                height={HOME_CANVAS.height}
                viewBox={`0 0 ${HOME_CANVAS.width} ${HOME_CANVAS.height}`}
                data-home-map="1"
                role="img"
                aria-label="五条代谢通路共用节点总图"
              >
                {/* 区室带 */}
                {HOME_BANDS.map((band) => (
                  <rect
                    key={band.id}
                    x={0}
                    y={band.top}
                    width={band.id === "er-lumen" ? 520 : HOME_CANVAS.width}
                    height={band.bottom - band.top}
                    fill={`rgba(34,40,42,${band.tint})`}
                  />
                ))}
                <line x1="0" y1="60" x2={HOME_CANVAS.width} y2="60" stroke={C.hairSoft} strokeWidth="1" />
                <line x1="0" y1="400" x2={HOME_CANVAS.width} y2="400" stroke={C.hair} strokeWidth="1.2" />
                <line x1="0" y1="440" x2={HOME_CANVAS.width} y2="440" stroke={C.hairSoft} strokeWidth="1" />
                <line x1="0" y1="520" x2={HOME_CANVAS.width} y2="520" stroke={C.hair} strokeWidth="1.2" />
                <line x1="0" y1="990" x2="520" y2="990" stroke={C.hair} strokeWidth="1.2" />

                {HOME_BANDS.map((band) => (
                  <g key={`${band.id}-label`} opacity={0.55}>
                    {svgText(band.label, 22, band.top + 19, 10.5, "start", { letterSpacing: "0.18em" })}
                    {svgText(band.en, 22 + band.label.length * 11 + 14, band.top + 19, 8, "start", { letterSpacing: "0.12em" })}
                  </g>
                ))}

                {/* 通路标签（点即进入挂图） */}
                {HOME_PATHWAY_LABELS.map((label) => {
                  const meta = homePathwayMeta(label.pathwayId);
                  return (
                    <g key={meta.id} className="home-block">
                      <a href={meta.route} data-pathway-block={meta.id}>
                        {svgText(`${meta.name} · ${meta.en}`, label.x, label.y, 12, label.anchor, {
                          letterSpacing: "0.12em",
                          fontWeight: 700,
                          fill: PATH_COLOR[meta.id],
                        })}
                        {svgText(label.note, label.x, label.y + 15, 9.5, label.anchor, { opacity: 0.62 })}
                      </a>
                      <a href={meta.structureRoute} data-structure-block={meta.id}>
                        <text
                          x={label.x}
                          y={label.y + 29}
                          fontSize={9}
                          textAnchor={label.anchor}
                          fill={C.teal}
                          textDecoration="underline"
                        >
                          结构对照 →
                        </text>
                      </a>
                    </g>
                  );
                })}

                {/* 连线 */}
                {HOME_EDGES.map((edge) => {
                  const siblings = pairGroups.get([edge.from, edge.to].sort().join("|")) ?? [edge];
                  if (edge.from === edge.to) {
                    const pos = HOME_POS[edge.from];
                    if (!pos) return null;
                    const color = PATH_COLOR[edge.pathwayId];
                    return (
                      <g
                        key={edge.id}
                        className="home-edge home-edge-loop"
                        data-edge-id={edge.id}
                        data-edge-sources={edge.sources.map((s) => `${s.pathwayId}:${s.stepId ?? s.linkType}`).join(" ")}
                        data-pathway-id={edge.pathwayId}
                        onClick={() => handleEdge(edge)}
                      >
                        <path
                          d={`M${pos.x + 12},${pos.y - 14} a12,12 0 1,1 10,16`}
                          fill="none"
                          stroke={color}
                          strokeWidth={1.4}
                          strokeDasharray="3 2"
                        />
                        {arrowHead(pos.x + 12, pos.y - 14, pos.x + 22, pos.y + 2, color, false)}
                        <text x={pos.x + 26} y={pos.y - 8} fontSize={8.5} fill={color} opacity={0.8}>
                          下一轮
                        </text>
                        <title>{`${edge.enzyme} · ${edge.stepIds.join(" / ")}`}</title>
                      </g>
                    );
                  }
                  const geometry = edgeGeometry(edge, siblings);
                  if (!geometry) return null;
                  const color = PATH_COLOR[edge.pathwayId];
                  const isGluconeogenesis = edge.pathwayId === "gluconeogenesis";
                  const dash = edge.kind === "shuttle" ? "4 3" : undefined;
                  const width = edge.pathwayId === "glycolysis" ? 2.1 : 1.35;
                  const cross = edge.crossLabel
                    ? crossAnchor(geometry.x1, geometry.y1, geometry.x2, geometry.y2)
                    : null;
                  const crossShift = cross ? crossLabelShift(cross.x, cross.y) : 0;
                  // 穿梭的双向线不穿过膜带中线时，锚点会重合；按行进方向上下错开一行，避免两条注压字。
                  const crossTilt = cross && !cross.onBand
                    ? HOME_POS[edge.from].y < HOME_POS[edge.to].y ? -12 : 12
                    : 0;
                  return (
                    <g
                      key={edge.id}
                      className={`home-edge${isGluconeogenesis ? " gn-edge" : ""}`}
                      data-edge-id={edge.id}
                      data-edge-sources={edge.sources.map((s) => `${s.pathwayId}:${s.stepId ?? s.linkType}`).join(" ")}
                      data-step-id={edge.primaryStepId ?? ""}
                      data-pathway-id={edge.pathwayId}
                      onClick={() => handleEdge(edge)}
                    >
                      <line
                        x1={geometry.x1}
                        y1={geometry.y1}
                        x2={geometry.x2}
                        y2={geometry.y2}
                        stroke={color}
                        strokeWidth={width}
                        strokeDasharray={dash}
                      />
                      {arrowHead(geometry.x1, geometry.y1, geometry.x2, geometry.y2, color, edge.irreversible)}
                      {edge.enzyme !== "—" && !edge.crossLabel && (
                        <text
                          x={geometry.labelX}
                          y={geometry.labelY}
                          fontSize={9.5}
                          fontStyle="italic"
                          textAnchor="middle"
                          fill={color}
                          opacity={0.9}
                          stroke={C.paper}
                          strokeWidth={3}
                          paintOrder="stroke"
                        >
                          {edge.enzyme}
                        </text>
                      )}
                      {edge.chem && (
                        <text
                          x={geometry.labelX}
                          y={geometry.labelY + 11}
                          fontSize={8.5}
                          textAnchor="middle"
                          fill={C.amber}
                          opacity={0.85}
                          stroke={C.paper}
                          strokeWidth={3}
                          paintOrder="stroke"
                        >
                          {edge.chem}
                        </text>
                      )}
                      {cross && (
                        <g>
                          <line x1={cross.x} y1={cross.y - 7} x2={cross.x} y2={cross.y + 7} stroke={C.brick} strokeWidth="1" />
                          <text
                            x={cross.x + 7}
                            y={cross.y + 3 + crossShift + crossTilt}
                            fontSize={8.5}
                            fill={C.brick}
                            textAnchor="start"
                            stroke={C.paper}
                            strokeWidth={3}
                            paintOrder="stroke"
                          >
                            {edge.crossLabel}
                          </text>
                        </g>
                      )}
                      <title>{`${edge.enzyme}${edge.stepIds.length ? ` · ${edge.stepIds.join(" / ")}` : ""}`}</title>
                    </g>
                  );
                })}

                {/* 节点（主链点击进入；共用节点打开右栏） */}
                {HOME_NODES.map((node) => {
                  const pos = HOME_POS[node.id];
                  if (!pos) return null;
                  const label = nodeLabelPosition(node);
                  return (
                    <g
                      key={node.id}
                      className={`home-node${node.junction ? " is-junction" : ""}`}
                      data-node-id={node.id}
                      data-entity-id={node.id}
                      data-junction={node.junction ? "1" : "0"}
                      data-pathway-ids={node.pathwayIds.join(",")}
                      onClick={() => handleNode(node)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") handleNode(node);
                      }}
                    >
                      <circle cx={pos.x} cy={pos.y} r={node.junction ? 16 : 11} fill="transparent" />
                      {node.junction && <circle cx={pos.x} cy={pos.y} r={11} fill="none" stroke={C.brick} strokeWidth={1.4} />}
                      <circle
                        cx={pos.x}
                        cy={pos.y}
                        r={node.junction ? 5.2 : 4.6}
                        fill={C.paper}
                        stroke={node.junction ? C.brick : C.ink}
                        strokeWidth={node.junction ? 1.6 : 1.1}
                      />
                      {svgText(node.label, label.x, label.y, node.junction ? 11.5 : 11, label.anchor, {
                        fontWeight: node.junction ? 700 : 500,
                      })}
                      {node.junction && node.pathwayIds.length >= 3 && (
                        <text x={pos.x + 14} y={pos.y - 12} fontSize={8} fill={C.brick} opacity={0.85}>
                          ×{node.pathwayIds.length}
                        </text>
                      )}
                      <title>{`${node.fullName} · ${node.pathwayIds.map((id) => homePathwayMeta(id).name).join(" / ")}`}</title>
                    </g>
                  );
                })}
              </svg>
            </div>
          </div>
        </div>

        <aside className="home-aside">
          <div className="panel-block">
            <div className="pb-title">
              共用节点 <span className="en">JUNCTIONS ×{HOME_JUNCTIONS.length}</span>
            </div>
            <ol className="j-list">
              {HOME_JUNCTIONS.map((junction) => (
                <li key={junction.entityId}>
                  <button
                    type="button"
                    className={`j-item${selectedJunction === junction.entityId ? " on" : ""}`}
                    data-junction-id={junction.entityId}
                    onClick={() => setSelectedJunction(junction.entityId)}
                  >
                    <span className="j-name">{junction.label}</span>
                    <span className="j-count">×{junction.pathwayIds.length}</span>
                  </button>
                </li>
              ))}
            </ol>
          </div>

          <div className="panel-block" data-testid="junction-panel" data-junction-detail={selected?.entityId ?? ""}>
            <div className="pb-title">
              节点接通 <span className="en">CONNECTIONS</span>
            </div>
            {!selected && <p className="j-hint">点图上的共用节点，或点上面列表。</p>}
            {selected && (
              <div className="j-detail">
                <div className="j-title">
                  {selected.label}
                  <span>{selected.fullName}</span>
                </div>
                <div className="j-sub">同图按数据层实体 id 合并为一个节点；连接 {selected.pathwayIds.length} 条通路。</div>
                {selected.pathwayIds.map((pathwayId) => {
                  const meta = homePathwayMeta(pathwayId);
                  const occurrences = selected.occurrences.filter((item) => item.pathwayId === pathwayId);
                  return (
                    <div key={pathwayId} className="j-path">
                      <div className="j-path-name">{meta.name}</div>
                      <div className="j-links">
                        {occurrences.map((item) => (
                          <Link key={`${item.stepId}`} to={`${meta.route}?step=${item.stepId}`}>
                            {item.stepName}
                            {item.via === "transport" ? "（转运）" : ""}
                          </Link>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="panel-block">
            <div className="pb-title">
              全部去向 <span className="en">TEN DESTINATIONS</span>
            </div>
            <div className="j-dest">
              {HOME_PATHWAYS.map((pathway) => (
                <Link key={pathway.id} to={pathway.route} data-home-link={`aside-${pathway.id}`}>
                  {pathway.name} 挂图
                </Link>
              ))}
              {HOME_PATHWAYS.map((pathway) => (
                <Link key={`${pathway.id}-s`} to={pathway.structureRoute} data-home-link={`aside-${pathway.id}-structure`}>
                  {pathway.name} 结构对照
                </Link>
              ))}
            </div>
          </div>
        </aside>
      </div>

      <footer className="home-tribute">
        体例致敬：Donald Nicholson 的代谢通路挂图（1960 年首印，后为 IUBMB–Nicholson 系列）与 KEGG（京都大学 Kanehisa 实验室，1995 年首发）的路径图编排。
        仅指版面体例，本图数据与数值不取自上述图谱。
      </footer>
    </div>
  );
}
