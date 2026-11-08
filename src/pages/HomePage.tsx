import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { Link, useNavigate } from "react-router-dom";
import ContentBubble from "../components/ContentBubble";
import { homeBubbleModel } from "../lib/bubbleModel";
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
import {
  HOME_BANDS,
  HOME_CANVAS,
  HOME_CORI_LOOP,
  HOME_DOMAIN_LABELS,
  HOME_EDGE_OFFSETS,
  HOME_ER_NOTE,
  HOME_MEMBRANE_LINES,
  HOME_PATHWAY_LABELS,
  HOME_POS,
  HOME_RESERVED_HEAD,
  HOME_RESERVED_SLOTS,
  HOME_SHARED_TAGS,
} from "../data/homeLayout";
import PathwaySwitcher from "../components/PathwaySwitcher";

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
  oxphos: C.teal,
  "fatty-acid-synthesis": C.ink,
  "urea-cycle": C.brick,
  glycogen: C.amber,
  "amino-acids": C.teal,
  cholesterol: C.brick,
};

const JUNCTION_IDS = new Set(HOME_NODES.filter((node) => node.junction).map((node) => node.id));

/** Cori 回路带的固定文案：SVG <title> 与触屏浮签共用同一句。 */
const CORI_TITLE = "Cori 循环 · PLATE 07：乳酸肌→肝、葡萄糖肝→肌";

/** 双向走廊实体：同一条线正反两向都画时，用上下两条固定车道（糖异生在下）。 */
const CHAIN_IDS = new Set([
  "glc",
  "g6p",
  "f6p",
  "fbp",
  "g3p",
  "dhap",
  "13bpg",
  "3pg",
  "2pg",
  "pep",
  "pyr",
]);

type DomainFocus = "all" | "cytosol" | "matrix";

function nodeRadius(nodeId: string): number {
  return JUNCTION_IDS.has(nodeId) ? 9.5 : 5.5;
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

function pairKey(edge: HomeEdge): string {
  return [edge.from, edge.to].sort().join("|");
}

function edgeGeometry(edge: HomeEdge, siblings: HomeEdge[]): EdgeGeometry | null {
  const a = HOME_POS[edge.from];
  const b = HOME_POS[edge.to];
  if (!a || !b) return null;
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.hypot(dx, dy);
  if (len === 0) return null;
  const ux = dx / len;
  const uy = dy / len;
  const index = siblings.findIndex((item) => item.id === edge.id);
  const isChainPair = CHAIN_IDS.has(edge.from) && CHAIN_IDS.has(edge.to);
  // 其余连线用「字典序起点 → 终点」的规范法线做偏移，反向边因此不会互相压线。
  const [fromId, toId] = [edge.from, edge.to].sort();
  const fromPos = HOME_POS[fromId];
  const toPos = HOME_POS[toId];
  const cdx = toPos.x - fromPos.x;
  const cdy = toPos.y - fromPos.y;
  const clen = Math.hypot(cdx, cdy) || 1;
  const canonX = -cdy / clen;
  const canonY = cdx / clen;
  let offset: number;
  let cnx = canonX;
  let cny = canonY;
  if (HOME_EDGE_OFFSETS[edge.id] !== undefined) {
    // 显式车道优先：例如 PPP 回流要抬高，或差向异构那条要压低。
    offset = HOME_EDGE_OFFSETS[edge.id];
  } else if (isChainPair) {
    // 主链双向走廊：糖酵解固定在链上方，糖异生固定在链下方（世界坐标 y 方向），
    // 不随行进方向翻转法线，否则正反两条线会落在同一侧、标签叠死。
    offset = edge.pathwayId === "gluconeogenesis" ? 8 : -8;
    cnx = 0;
    cny = 1;
  } else if (siblings.length > 1) {
    offset = (index - (siblings.length - 1) / 2) * 14;
  } else {
    offset = 0;
  }
  const startR = nodeRadius(edge.from) + 3;
  const endR = nodeRadius(edge.to) + 4;
  const sx = a.x + ux * startR + cnx * offset;
  const sy = a.y + uy * startR + cny * offset;
  const ex = b.x - ux * endR + cnx * offset;
  const ey = b.y - uy * endR + cny * offset;
  const midX = (sx + ex) / 2;
  const midY = (sy + ey) / 2;
  const push = offset === 0 ? -12 : Math.sign(offset) * 12;
  const labelX = midX + cnx * push;
  const labelY = midY + cny * push;
  return {
    edge,
    x1: sx,
    y1: sy,
    x2: ex,
    y2: ey,
    nx: cnx,
    ny: cny,
    labelX,
    labelY,
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

/** 通路标题/注记占位：跨膜文字必须避开，不能只避节点。 */
const PATHWAY_LABEL_OBSTACLES = HOME_PATHWAY_LABELS.flatMap((l) => {
  const meta = homePathwayMeta(l.pathwayId);
  const title = `${meta.name} · ${meta.en}`;
  const wTitle = textWidth(title, 12);
  const wNote = textWidth(l.note, 9);
  const leftOf = (w: number) => (l.anchor === "start" ? l.x : l.anchor === "end" ? l.x - w : l.x - w / 2);
  const tx = leftOf(wTitle);
  const nx = leftOf(wNote);
  return [
    { x0: tx, x1: tx + wTitle, y: l.y },
    { x0: nx, x1: nx + wNote, y: l.y + 15 },
  ];
});

/** 跨膜文字若压在节点或通路标题上，只把文字推开；红色刻线仍留在膜带原位。
 *  传入的是文字矩形（x0..x1），不能只测锚点：右展文字向左延伸，锚点不落在标题框内时仍会压字。 */
function crossLabelShift(x0: number, x1: number, y: number): number {
  for (const node of HOME_NODES) {
    const pos = HOME_POS[node.id];
    if (!pos) continue;
    if (x1 > pos.x - 30 && x0 < pos.x + 30 && Math.abs(pos.y - y) < 22) return pos.y <= y ? 12 : -12;
  }
  for (const ob of PATHWAY_LABEL_OBSTACLES) {
    if (x1 > ob.x0 - 4 && x0 < ob.x1 + 4 && Math.abs(ob.y - y) < 12) return ob.y <= y ? 12 : -12;
  }
  return 0;
}

/** 跨膜标注锚点：依次取三条膜线；穿梭线段若不相交，退到线段中点。 */
function crossAnchor(x1: number, y1: number, x2: number, y2: number): { x: number; y: number; onBand: boolean } {
  for (const line of [HOME_MEMBRANE_LINES[1], HOME_MEMBRANE_LINES[0], HOME_MEMBRANE_LINES[2]]) {
    const hit = crossingPoint(x1, y1, x2, y2, line.y);
    if (hit) return { ...hit, onBand: true };
  }
  return { x: (x1 + x2) / 2, y: (y1 + y2) / 2, onBand: false };
}

function textWidth(text: string, size: number): number {
  let width = 0;
  for (const ch of text) {
    width += ch.charCodeAt(0) > 127 ? size : size * 0.54;
  }
  return width;
}

interface CrossLabelLayout {
  x: number;
  y: number;
  ax: number;
  ay: number;
  onBand: boolean;
  anchor: "start" | "end";
  dx: number;
}

function nodeLabelPosition(node: HomeNode): { x: number; y: number; anchor: "start" | "middle" | "end" } {
  const pos = HOME_POS[node.id];
  if (!pos) return { x: 0, y: 0, anchor: "middle" };
  if (pos.side === "left") return { x: pos.x - 14, y: pos.y + 4, anchor: "end" };
  if (pos.side === "right") return { x: pos.x + 14, y: pos.y + 4, anchor: "start" };
  if (pos.side === "above") return { x: pos.x, y: pos.y - 16, anchor: "middle" };
  return { x: pos.x, y: pos.y + 24, anchor: "middle" };
}

function svgText(
  text: string,
  x: number,
  y: number,
  size: number,
  anchor: "start" | "middle" | "end" = "middle",
  extra: {
    fill?: string;
    opacity?: number;
    letterSpacing?: string;
    fontWeight?: number | string;
    halo?: boolean;
  } = {},
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
      stroke={extra.halo ? C.paper : undefined}
      strokeWidth={extra.halo ? 3 : undefined}
      paintOrder={extra.halo ? "stroke" : undefined}
    >
      {text}
    </text>
  );
}

export function HomePage() {
  const navigate = useNavigate();
  const [selectedJunction, setSelectedJunction] = useState<string | null>(null);
  const [domainFocus, setDomainFocus] = useState<DomainFocus>("all");
  /**
   * 三档共用同一套 URL 参数：
   *   无参数          → 收起右栏 + 按可视宽等比铺满（fitwidth，受 1400px 上限约束）
   *   ?fold=center    → 收起右栏 + 1020 居中
   *   ?fold=open      → 展开右栏
   */
  const foldParam = useMemo(() => {
    if (typeof window === "undefined") return null;
    return new URLSearchParams(window.location.search).get("fold");
  }, []);
  const [asideOpen, setAsideOpen] = useState(() => foldParam === "open");
  const foldMode: "center" | "fitwidth" = foldParam === "center" ? "center" : "fitwidth";

  /** 横向漫游：容器级拖动（不接管页面纵向滚动），仅在位移超过阈值后才捕获指针。 */
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const panRef = useRef({ active: false, startX: 0, startScroll: 0, moved: false, endAt: 0 });

  /** 触屏浮签：SVG 原生 <title> 在触屏不可读，长按目标时以 HTML 浮签显示同一句文案。 */
  const [tip, setTip] = useState<{ left: number; top: number; text: string } | null>(null);
  const tipTimerRef = useRef<number | null>(null);
  /** 长按已出浮签：紧随其后的 click 只关闭浮签语义、不导航（正常轻点不受影响）。 */
  const longPressedRef = useRef(false);

  function clearTipTimer() {
    if (tipTimerRef.current !== null) {
      window.clearTimeout(tipTimerRef.current);
      tipTimerRef.current = null;
    }
  }

  function showTip(clientX: number, clientY: number, text: string) {
    const width = 268;
    const left = Math.max(8, Math.min(clientX + 14, window.innerWidth - width - 8));
    const top = Math.max(8, Math.min(clientY - 58, window.innerHeight - 64));
    setTip({ left, top, text });
  }

  function beginTip(event: ReactPointerEvent<Element>, text: string) {
    longPressedRef.current = false;
    if (event.pointerType !== "touch") return;
    // 有内容模型的目标由 ContentBubble 接管长按（出完整气泡），不再出旧浮签。
    if (homeBubbleModel(event.currentTarget)) return;
    const { clientX, clientY } = event;
    clearTipTimer();
    tipTimerRef.current = window.setTimeout(() => {
      tipTimerRef.current = null;
      longPressedRef.current = true;
      showTip(clientX, clientY, text);
    }, 450);
  }

  function cancelTipOnMove(event: ReactPointerEvent<Element>) {
    if (event.pointerType === "touch") clearTipTimer();
  }

  useEffect(() => {
    if (!tip) return;
    const timer = window.setTimeout(() => setTip(null), 2400);
    return () => window.clearTimeout(timer);
  }, [tip]);

  function handlePanDown(event: ReactPointerEvent<HTMLDivElement>) {
    if (event.button !== 0) return;
    const el = scrollRef.current;
    if (!el) return;
    panRef.current = { active: true, startX: event.clientX, startScroll: el.scrollLeft, moved: false, endAt: 0 };
  }

  function handlePanMove(event: ReactPointerEvent<HTMLDivElement>) {
    const el = scrollRef.current;
    const pan = panRef.current;
    if (!el || !pan.active) return;
    const dx = event.clientX - pan.startX;
    if (!pan.moved) {
      if (Math.abs(dx) < 5) return;
      pan.moved = true;
      el.setPointerCapture(event.pointerId);
      el.classList.add("is-dragging");
    }
    event.preventDefault();
    el.scrollLeft = pan.startScroll - dx;
  }

  function handlePanEnd(event: ReactPointerEvent<HTMLDivElement>) {
    const el = scrollRef.current;
    const pan = panRef.current;
    pan.active = false;
    if (el?.hasPointerCapture(event.pointerId)) el.releasePointerCapture(event.pointerId);
    el?.classList.remove("is-dragging");
    if (pan.moved) pan.endAt = Date.now();
  }

  /** 拖动结束后紧跟着的那次 click 不应触发节点/连线跳转。 */
  function handlePanClickCapture(event: ReactMouseEvent<HTMLDivElement>) {
    if (Date.now() - panRef.current.endAt < 150) {
      event.preventDefault();
      event.stopPropagation();
      panRef.current.endAt = 0;
    }
  }

  function handlePanKeyDown(event: ReactKeyboardEvent<HTMLDivElement>) {
    if (event.target !== event.currentTarget) return;
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    const el = scrollRef.current;
    if (!el || el.scrollWidth <= el.clientWidth) return;
    event.preventDefault();
    el.scrollLeft += event.key === "ArrowRight" ? 96 : -96;
  }

  const pairGroups = useMemo(() => {
    const groups = new Map<string, HomeEdge[]>();
    for (const edge of HOME_EDGES) {
      const key = pairKey(edge);
      const list = groups.get(key) ?? [];
      list.push(edge);
      groups.set(key, list);
    }
    return groups;
  }, []);

  const geometries = useMemo(
    () =>
      HOME_EDGES.map((edge) => ({
        edge,
        geom: edgeGeometry(edge, pairGroups.get(pairKey(edge)) ?? [edge]),
      })),
    [pairGroups],
  );

  /** 同一步骤若有多条边（FBP 裂解为 DHAP + G3P、糖异生反向缩合），酶名只画一次。 */
  const enzymeLabelEdges = useMemo(() => {
    const seen = new Set<string>();
    const keep = new Set<string>();
    for (const edge of HOME_EDGES) {
      const key = `${edge.pathwayId}:${edge.primaryStepId ?? edge.id}`;
      if (seen.has(key)) continue;
      seen.add(key);
      keep.add(edge.id);
    }
    return keep;
  }, []);

  /** 跨膜注记避让：同一膜带上的多条注记按横向重叠程度上下错层，不压节点。 */
  const crossLayout = useMemo(() => {
    const used: { x0: number; x1: number; y: number }[] = [];
    const map = new Map<string, CrossLabelLayout>();
    for (const { edge, geom } of geometries) {
      if (!edge.crossLabel || !geom) continue;
      const anchor = crossAnchor(geom.x1, geom.y1, geom.x2, geom.y2);
      const toRight = anchor.x > HOME_CANVAS.width * 0.72;
      const dx = toRight ? -8 : 8;
      const width = textWidth(edge.crossLabel, 8.5);
      const x0 = toRight ? anchor.x + dx - width : anchor.x + dx;
      const x1 = x0 + width;
      // 不在膜带上的注记同样要避开通路标题/注记（否则会压住“膜内 · NADH …”）
      const baseY = anchor.onBand
        ? anchor.y + 3 + crossLabelShift(x0, x1, anchor.y)
        : anchor.y - 16 + crossLabelShift(x0, x1, anchor.y - 16);
      let y = baseY;
      const offsets = [0, 12, -12, 24, -24, 36];
      for (const offset of offsets) {
        const candidate = baseY + offset;
        const clash = used.some((item) => Math.abs(item.y - candidate) < 11 && x0 < item.x1 && x1 > item.x0);
        if (!clash) {
          y = candidate;
          break;
        }
      }
      used.push({ x0, x1, y });
      map.set(edge.id, {
        x: anchor.x,
        y,
        ax: anchor.x,
        ay: anchor.y,
        onBand: anchor.onBand,
        anchor: toRight ? "end" : "start",
        dx,
      });
    }
    return map;
  }, [geometries]);

  const selected = selectedJunction ? junctionById(selectedJunction) : undefined;

  function handleNode(node: HomeNode) {
    if (longPressedRef.current) {
      longPressedRef.current = false;
      return;
    }
    if (node.junction) {
      setSelectedJunction(node.id);
      // 首屏反馈：右栏默认收起时自动展开，所选共用的通路清单就在同一屏内
      setAsideOpen(true);
      return;
    }
    const pathwayId = node.pathwayIds[0];
    if (pathwayId) navigate(homePathwayMeta(pathwayId).route);
  }

  function handleEdge(edge: HomeEdge) {
    if (longPressedRef.current) {
      longPressedRef.current = false;
      return;
    }
    const route = homePathwayMeta(edge.pathwayId).route;
    if (edge.primaryStepId) navigate(`${route}?step=${edge.primaryStepId}`);
    else navigate(route);
  }

  function toggleDomain(domain: Exclude<DomainFocus, "all">) {
    setDomainFocus((current) => (current === domain ? "all" : domain));
  }

  const focusedLabel = domainFocus === "all" ? "全图 · 02 域" : domainFocus === "cytosol" ? "当前域 · 胞质" : "当前域 · 基质";

  const nodeTipText = (node: HomeNode) =>
    `${node.fullName} · ${node.pathwayIds.map((id) => homePathwayMeta(id).name).join(" / ")}`;
  const edgeTipText = (edge: HomeEdge) => {
    const name = homePathwayMeta(edge.pathwayId).name;
    const steps = edge.stepIds.length ? edge.stepIds.join(" / ") : edge.kind;
    return `${edge.enzyme !== "—" ? `${edge.enzyme} · ` : ""}${steps} → ${name}`;
  };

  return (
    <div className="poster home-poster" data-page="home">
      <ContentBubble enabled resolve={homeBubbleModel} />
      <PathwaySwitcher current="home" variant="home" context="代谢总图 · MASTER MAP" />

      <header className="masthead">
        <div className="mast-top">
          <span className="kicker">代谢通路挂图 · METABOLIC WALL CHART</span>
          <span className="mast-meta">
            <Link className="mast-molecules" to="/molecules" data-home-molecules="1">
              物质索引 →
            </Link>
            <Link className="mast-molecules" to="/substances" data-home-substances="1">
              常见物质 →
            </Link>
            <span className="plate-no num">PLATE 00 / 12 · 总图 · 2026</span>
          </span>
        </div>
        <div className="mast-main">
          <h1>
            代谢总图
            <small>METABOLIC ATLAS · TWELVE PATHWAYS · 22 DESTINATIONS</small>
          </h1>
          <p className="mast-summary">
            上下两域：上为胞质（糖酵解向右主链、糖异生同链逆向、PPP 自 G6P 分叉回流），中为三层膜带（氧化磷酸化的呼吸链就画在膜内），下为线粒体基质（TCA 与 β-氧化在乙酰-CoA 会合）；<b>同名代谢物只画一次</b>。点通路名或连线进入挂图，点共用节点看它接通了哪几条路。
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
          <svg width="34" height="12" aria-hidden="true">
            <line x1="2" y1="6" x2="24" y2="6" stroke={C.ink} strokeWidth="1" strokeDasharray="5 3" />
            <path d="M24 6 l-7 -3.5 v7 z" fill={C.paper} stroke={C.ink} strokeWidth="1.2" />
          </svg>
          糖异生 / 穿梭（逆向）
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
        <span className="lg" style={{ color: C.teal }}>青 · 磷酸戊糖 / 氧化磷酸化</span>
        <span className="lg" style={{ color: C.amber }}>琥珀 · 线粒体两条</span>
        <span className="legend-hint">上下两域 · 首屏可览八条通路</span>
      </div>

      <div
        className={`body-grid${asideOpen ? "" : " aside-collapsed"}${
          !asideOpen && foldMode === "fitwidth" ? " fold-fitwidth" : ""
        }`}
        data-fold-mode={asideOpen ? "open" : foldMode}
      >
        <div className="plate-wrap">
          <div className="plate-head">
            <span className="t">总图 · MASTER MAP</span>
            <div className="ph-tools">
              <span className="organ-switch">上域：胞质 → 膜带：外膜 / 膜间腔 / 内膜 → 下域：线粒体基质</span>
              <button
                type="button"
                className="aside-toggle"
                aria-expanded={asideOpen}
                aria-controls="home-aside"
                data-aside-toggle="1"
                onClick={() => setAsideOpen((open) => !open)}
              >
                {asideOpen ? "收起辅助栏" : "展开辅助栏"}
              </button>
            </div>
          </div>

          <div className="home-domainnav" data-testid="home-domainnav">
            <span className="dn-k">域</span>
            <div className="dn-group" role="group" aria-label="总图域标签">
              <button
                type="button"
                className={`dn-seg${domainFocus === "cytosol" ? " on" : ""}`}
                data-domain-nav="cytosol"
                aria-pressed={domainFocus === "cytosol"}
                onClick={() => toggleDomain("cytosol")}
              >
                胞质 · CYTOSOL
              </button>
              <button
                type="button"
                className={`dn-seg${domainFocus === "matrix" ? " on" : ""}`}
                data-domain-nav="matrix"
                aria-pressed={domainFocus === "matrix"}
                onClick={() => toggleDomain("matrix")}
              >
                线粒体基质 · MATRIX
              </button>
            </div>
            <span className="dn-count" data-testid="home-domain-count">
              {focusedLabel}
            </span>
          </div>

          <div
            className="plate-scroll"
            data-testid="home-plate-scroll"
            ref={scrollRef}
            tabIndex={0}
            role="region"
            aria-label="总图画布：按住横向拖动，或用左右方向键横向移动"
            onPointerDown={handlePanDown}
            onPointerMove={handlePanMove}
            onPointerUp={handlePanEnd}
            onPointerCancel={handlePanEnd}
            onClickCapture={handlePanClickCapture}
            onKeyDown={handlePanKeyDown}
          >
            <div className="plate-canvas home-canvas">
              <svg
                viewBox={`0 ${HOME_CORI_LOOP.band.minY} ${HOME_CANVAS.width} ${HOME_CANVAS.height + HOME_CORI_LOOP.band.height}`}
                preserveAspectRatio="xMidYMid meet"
                data-home-map="1"
                role="img"
                aria-label="上下两域七通路代谢总图 + Cori 循环跨器官血液回路"
                style={{ display: "block", width: "100%", height: "auto" }}
              >
                <defs>
                  <marker id="home-cori-arrow-ink" markerWidth="9" markerHeight="8" refX="8" refY="4" orient="auto">
                    <path d="M0,0.5 L8.5,4 L0,7.5 Z" fill={C.ink} />
                  </marker>
                  <marker id="home-cori-arrow-brick" markerWidth="10" markerHeight="9" refX="9" refY="4.5" orient="auto">
                    <path d="M0,0.5 L9.5,4.5 L0,8.5 Z" fill={C.brick} />
                  </marker>
                </defs>
                {/* Cori 回路：不新增标题块，只加一条细胞外血液带（负 y 区） */}
                <a
                  href="/pathway/cori"
                  data-cori-loop="1"
                  className="home-cori-link"
                  onPointerDown={(event) => beginTip(event, CORI_TITLE)}
                  onPointerMove={cancelTipOnMove}
                  onPointerUp={clearTipTimer}
                  onPointerLeave={clearTipTimer}
                  onContextMenu={(event) => event.preventDefault()}
                  onClick={(event) => {
                    if (longPressedRef.current) {
                      longPressedRef.current = false;
                      event.preventDefault();
                      event.stopPropagation();
                    }
                  }}
                >
                  <title>{CORI_TITLE}</title>
                  <rect
                    x={0}
                    y={HOME_CORI_LOOP.band.minY}
                    width={HOME_CANVAS.width}
                    height={HOME_CORI_LOOP.band.height}
                    fill={`rgba(34,40,42,${HOME_CORI_LOOP.band.tint})`}
                  />
                  <line x1={0} y1={HOME_CORI_LOOP.band.minY} x2={HOME_CANVAS.width} y2={HOME_CORI_LOOP.band.minY} stroke={C.hairSoft} strokeWidth={1} />
                  <line x1={0} y1={0} x2={HOME_CANVAS.width} y2={0} stroke={C.hairSoft} strokeWidth={1} />
                  <path
                    d={HOME_CORI_LOOP.glucosePath}
                    fill="none"
                    stroke={C.ink}
                    strokeWidth={1.3}
                    markerEnd="url(#home-cori-arrow-ink)"
                    data-cori-flow="glucose"
                  />
                  <path
                    d={HOME_CORI_LOOP.lactatePath}
                    fill="none"
                    stroke={C.brick}
                    strokeWidth={1.5}
                    markerEnd="url(#home-cori-arrow-brick)"
                    data-cori-flow="lactate"
                  />
                  <text
                    x={HOME_CORI_LOOP.bandTitle.x}
                    y={HOME_CORI_LOOP.bandTitle.y}
                    fontSize={8.5}
                    letterSpacing="0.12em"
                    fill={C.ink}
                    opacity={0.55}
                    stroke={C.paper}
                    strokeWidth={3}
                    paintOrder="stroke"
                    data-pathway-title="cori"
                  >
                    {HOME_CORI_LOOP.bandTitle.text}
                  </text>
                  <text
                    x={HOME_CORI_LOOP.glucoseLabel.x}
                    y={HOME_CORI_LOOP.glucoseLabel.y}
                    fontSize={9.5}
                    fontWeight={700}
                    textAnchor={HOME_CORI_LOOP.glucoseLabel.anchor}
                    fill={C.ink}
                    stroke={C.paper}
                    strokeWidth={3}
                    paintOrder="stroke"
                  >
                    {HOME_CORI_LOOP.glucoseLabel.text}
                  </text>
                  <text
                    x={HOME_CORI_LOOP.lactateLabel.x}
                    y={HOME_CORI_LOOP.lactateLabel.y}
                    fontSize={9.5}
                    fontWeight={700}
                    textAnchor={HOME_CORI_LOOP.lactateLabel.anchor}
                    fill={C.brick}
                    stroke={C.paper}
                    strokeWidth={3}
                    paintOrder="stroke"
                  >
                    {HOME_CORI_LOOP.lactateLabel.text}
                  </text>
                </a>

                {/* 域块 */}
                {HOME_BANDS.map((band) => {
                  const focused = domainFocus === band.id;
                  return (
                    <rect
                      key={band.id}
                      x={0}
                      y={band.top}
                      width={HOME_CANVAS.width}
                      height={band.bottom - band.top}
                      fill={`rgba(34,40,42,${band.tint})`}
                      stroke={focused ? C.brick : "none"}
                      strokeWidth={focused ? 1 : 0}
                      data-domain-band={band.id}
                      data-domain-on={focused ? "1" : "0"}
                    />
                  );
                })}
                {/* 膜带三条线：外膜 / 膜间腔 / 内膜 */}
                {HOME_MEMBRANE_LINES.map((line) => (
                  <line
                    key={line.y}
                    x1="0"
                    y1={line.y}
                    x2={HOME_CANVAS.width}
                    y2={line.y}
                    stroke={line.weight > 1 ? C.hair : C.hairSoft}
                    strokeWidth={line.weight}
                  />
                ))}
                <line x1="0" y1="16" x2={HOME_CANVAS.width} y2="16" stroke={C.hairSoft} strokeWidth="1" />
                <line x1="0" y1="548" x2={HOME_CANVAS.width} y2="548" stroke={C.hairSoft} strokeWidth="1" />

                {/* 域标签（点击可高亮该域） */}
                {HOME_DOMAIN_LABELS.map((label) => {
                  const focused = domainFocus === label.band;
                  return (
                    <g
                      key={label.band}
                      className={label.band === "membrane" ? undefined : "home-domain-label"}
                      opacity={domainFocus === "all" || focused ? 1 : 0.45}
                      style={{ cursor: label.band === "membrane" ? "default" : "pointer" }}
                      role={label.band === "membrane" ? undefined : "button"}
                      tabIndex={label.band === "membrane" ? undefined : 0}
                      aria-label={label.band === "membrane" ? undefined : `高亮${label.label}域`}
                      onClick={() => {
                        if (label.band === "cytosol" || label.band === "matrix") toggleDomain(label.band);
                      }}
                      onKeyDown={(event) => {
                        if (label.band === "membrane") return;
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          toggleDomain(label.band as Exclude<DomainFocus, "all">);
                        }
                      }}
                    >
                      {svgText(label.label, label.x, label.y, 10, "start", {
                        opacity: focused ? 0.95 : 0.55,
                        letterSpacing: "0.18em",
                        fill: focused ? C.brick : C.ink,
                        halo: true,
                      })}
                    </g>
                  );
                })}

                {/* ER 腔注记：糖异生末步的膜面接口 */}
                <g data-er-note="1">
                  <rect
                    x={HOME_ER_NOTE.x}
                    y={HOME_ER_NOTE.y}
                    width={HOME_ER_NOTE.width}
                    height={HOME_ER_NOTE.height}
                    fill="rgba(34,40,42,0.05)"
                  />
                  {svgText(HOME_ER_NOTE.title, HOME_ER_NOTE.x + 10, HOME_ER_NOTE.y + 17, 9, "start", {
                    letterSpacing: "0.16em",
                    opacity: 0.6,
                  })}
                  {HOME_ER_NOTE.lines.map((line, index) =>
                    svgText(line, HOME_ER_NOTE.x + 10, HOME_ER_NOTE.y + 33 + index * 15, 9, "start", {
                      opacity: 0.75,
                    }),
                  )}
                </g>

                {/* 通路标签（点即进入挂图） */}
                {HOME_PATHWAY_LABELS.map((label) => {
                  const meta = homePathwayMeta(label.pathwayId);
                  return (
                    <g key={meta.id} className="home-block">
                      <a href={meta.route} data-pathway-block={meta.id} className="home-title-link">
                        <text
                          x={label.x}
                          y={label.y}
                          fontSize={12}
                          textAnchor={label.anchor}
                          letterSpacing="0.1em"
                          fontWeight={700}
                          fill={PATH_COLOR[meta.id]}
                          className="serif"
                          data-pathway-title={meta.id}
                          stroke={C.paper}
                          strokeWidth={3}
                          paintOrder="stroke"
                        >
                          {meta.name} · {meta.en}
                        </text>
                      </a>
                      {svgText(label.note, label.x, label.y + 15, 9.2, label.anchor, {
                        opacity: 0.62,
                        halo: true,
                      })}
                    </g>
                  );
                })}

                {/* 连线 */}
                {geometries.map(({ edge, geom }) => {
                  if (edge.from === edge.to) {
                    const pos = HOME_POS[edge.from];
                    const color = PATH_COLOR[edge.pathwayId];
                    return (
                      <g
                        key={edge.id}
                        className="home-edge home-edge-loop"
                        data-edge-id={edge.id}
                        data-edge-sources={edge.sources.map((s) => `${s.pathwayId}:${s.stepId ?? s.linkType}`).join(" ")}
                        data-pathway-id={edge.pathwayId}
                        onClick={() => handleEdge(edge)}
                        onPointerDown={(event) => beginTip(event, edgeTipText(edge))}
                        onPointerMove={cancelTipOnMove}
                        onPointerUp={clearTipTimer}
                        onPointerLeave={clearTipTimer}
                        onContextMenu={(event) => event.preventDefault()}
                      >
                        <path
                          d={`M${pos.x + 11},${pos.y - 13} a11,11 0 1,1 9,15`}
                          fill="none"
                          stroke={color}
                          strokeWidth={1.3}
                          strokeDasharray="3 2"
                        />
                        {arrowHead(pos.x + 11, pos.y - 13, pos.x + 20, pos.y + 2, color, false)}
                        <text
                          x={pos.x + 15}
                          y={pos.y + 38}
                          fontSize={8.5}
                          fill={color}
                          opacity={0.8}
                          stroke={C.paper}
                          strokeWidth={3}
                          paintOrder="stroke"
                        >
                          下一轮
                        </text>
                        <title>{`${edge.enzyme} · ${edge.stepIds.join(" / ")}`}</title>
                      </g>
                    );
                  }
                  if (!geom) return null;
                  const color = PATH_COLOR[edge.pathwayId];
                  const isGluconeogenesis = edge.pathwayId === "gluconeogenesis";
                  const isCofactor = edge.kind === "cofactor";
                  const dash =
                    edge.kind === "shuttle" || edge.kind === "cycle-exit" || isGluconeogenesis
                      ? "4 3"
                      : isCofactor
                        ? "2 3"
                        : undefined;
                  const width = edge.pathwayId === "glycolysis" ? 2 : isCofactor ? 1.15 : 1.35;
                  const cross = edge.crossLabel ? crossLayout.get(edge.id) : undefined;
                  return (
                    <g
                      key={edge.id}
                      className={`home-edge${isGluconeogenesis ? " gn-edge" : ""}`}
                      data-edge-id={edge.id}
                      data-edge-sources={edge.sources.map((s) => `${s.pathwayId}:${s.stepId ?? s.linkType}`).join(" ")}
                      data-step-id={edge.primaryStepId ?? ""}
                      data-pathway-id={edge.pathwayId}
                      data-edge-kind={edge.kind}
                      onClick={() => handleEdge(edge)}
                      onPointerDown={(event) => beginTip(event, edgeTipText(edge))}
                      onPointerMove={cancelTipOnMove}
                      onPointerUp={clearTipTimer}
                      onPointerLeave={clearTipTimer}
                      onContextMenu={(event) => event.preventDefault()}
                    >
                      <line
                        x1={geom.x1}
                        y1={geom.y1}
                        x2={geom.x2}
                        y2={geom.y2}
                        stroke={color}
                        strokeWidth={width}
                        strokeDasharray={dash}
                        opacity={isCofactor ? 0.7 : isGluconeogenesis ? 0.78 : 1}
                      />
                      {arrowHead(geom.x1, geom.y1, geom.x2, geom.y2, color, edge.irreversible)}
                      {edge.enzyme !== "—" && !edge.crossLabel && enzymeLabelEdges.has(edge.id) && (
                        <text
                          x={geom.labelX}
                          y={geom.labelY}
                          fontSize={9}
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
                      {edge.crossLabel && cross && cross.onBand && (
                        <g>
                          <line
                            x1={cross.ax - geom.nx * 7}
                            y1={cross.ay - geom.ny * 7}
                            x2={cross.ax + geom.nx * 7}
                            y2={cross.ay + geom.ny * 7}
                            stroke={C.brick}
                            strokeWidth="1"
                            opacity={0.7}
                          />
                          <text
                            x={cross.x + cross.dx}
                            y={cross.y}
                            fontSize={8.5}
                            fill={C.brick}
                            textAnchor={cross.anchor}
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

                {/* 跨域共用标注 */}
                {HOME_SHARED_TAGS.map((tag) => (
                  <text
                    key={`tag-${tag.nodeId}`}
                    x={tag.x}
                    y={tag.y}
                    fontSize={8.2}
                    textAnchor={tag.anchor}
                    fill={C.brick}
                    opacity={0.9}
                    letterSpacing="0.02em"
                    stroke={C.paper}
                    strokeWidth={3}
                    paintOrder="stroke"
                    data-shared-tag={tag.nodeId}
                  >
                    {tag.text}
                  </text>
                ))}

                {/* 节点（主链点击进入；共用节点打开右栏） */}
                {HOME_NODES.map((node) => {
                  const pos = HOME_POS[node.id];
                  if (!pos) return null;
                  const label = nodeLabelPosition(node);
                  return (
                    <g
                      key={node.id}
                      className={`home-node${node.junction ? " is-junction" : ""}${
                        selectedJunction === node.id ? " is-selected" : ""
                      }`}
                      data-node-id={node.id}
                      data-entity-id={node.id}
                      data-junction={node.junction ? "1" : "0"}
                      data-pathway-ids={node.pathwayIds.join(",")}
                      aria-label={nodeTipText(node)}
                      onClick={() => handleNode(node)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          handleNode(node);
                        }
                      }}
                      onPointerDown={(event) => beginTip(event, nodeTipText(node))}
                      onPointerMove={cancelTipOnMove}
                      onPointerUp={clearTipTimer}
                      onPointerLeave={clearTipTimer}
                      onContextMenu={(event) => event.preventDefault()}
                    >
                      <circle cx={pos.x} cy={pos.y} r={node.junction ? 14 : 10} fill="transparent" />
                      {node.junction && <circle cx={pos.x} cy={pos.y} r={9.5} fill="none" stroke={C.brick} strokeWidth={1.3} />}
                      <circle
                        cx={pos.x}
                        cy={pos.y}
                        r={node.junction ? 4.6 : 4.4}
                        fill={C.paper}
                        stroke={node.junction ? C.brick : C.ink}
                        strokeWidth={node.junction ? 1.5 : 1.1}
                      />
                      {svgText(node.label, label.x, label.y, node.junction ? 10.5 : 10, label.anchor, {
                        fontWeight: node.junction ? 700 : 500,
                        halo: true,
                      })}
                      {node.junction && node.pathwayIds.length >= 3 && (
                        <text
                          x={pos.x + 13}
                          y={pos.y - 10}
                          fontSize={7.5}
                          fill={C.brick}
                          opacity={0.85}
                          stroke={C.paper}
                          strokeWidth={4}
                          paintOrder="stroke"
                        >
                          ×{node.pathwayIds.length}
                        </text>
                      )}
                      <title>{nodeTipText(node)}</title>
                    </g>
                  );
                })}

                {/* 连线键盘代理：视觉层仍是节点压在连线之上，Tab 顺序排在节点之后 */}
                {geometries.map(({ edge, geom }) => {
                  const keyProps = {
                    role: "button" as const,
                    tabIndex: 0,
                    "aria-label": `连线 · ${edgeTipText(edge)}`,
                    onKeyDown: (event: ReactKeyboardEvent<SVGGElement>) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        handleEdge(edge);
                      }
                    },
                  };
                  if (edge.from === edge.to) {
                    const pos = HOME_POS[edge.from];
                    return (
                      <g key={`kbd-${edge.id}`} className="home-edge-focus" data-edge-key={edge.id} {...keyProps}>
                        <path
                          d={`M${pos.x + 11},${pos.y - 13} a11,11 0 1,1 9,15`}
                          fill="none"
                          stroke="transparent"
                          strokeWidth={3}
                          strokeDasharray="3 2"
                        />
                      </g>
                    );
                  }
                  if (!geom) return null;
                  return (
                    <g key={`kbd-${edge.id}`} className="home-edge-focus" data-edge-key={edge.id} {...keyProps}>
                      <line
                        x1={geom.x1}
                        y1={geom.y1}
                        x2={geom.x2}
                        y2={geom.y2}
                        stroke="transparent"
                        strokeWidth={3}
                      />
                    </g>
                  );
                })}

                {/* 第 11 条已接入；第 12 槽：只保留版面落位区，不绘制任何通路节点/连线。 */}
                <g data-reserved-section="1">
                  {svgText(HOME_RESERVED_HEAD.text, HOME_RESERVED_HEAD.x, HOME_RESERVED_HEAD.y, 9, "start", {
                    opacity: 0.5,
                    letterSpacing: "0.18em",
                  })}
                  {HOME_RESERVED_SLOTS.map((slot) => (
                    <g
                      key={slot.no}
                      data-reserved-slot={slot.no}
                      data-reserved-kind={slot.name ? "placeholder" : "empty"}
                    >
                      <rect
                        x={24}
                        y={slot.y - 14}
                        width={HOME_CANVAS.width - 48}
                        height={44}
                        fill="rgba(34,40,42,0.012)"
                        stroke={C.hairFaint}
                        strokeWidth={1}
                      />
                      <text
                        x={40}
                        y={slot.y + 2}
                        fontSize={12}
                        letterSpacing="0.1em"
                        fontWeight={700}
                        fill={C.ink}
                        opacity={slot.name ? 0.5 : 0.36}
                        className="serif"
                      >
                        {slot.name ? `${slot.name} · ${slot.en}` : `第 ${slot.no} 条 · 预留位`}
                      </text>
                      <text x={40} y={slot.y + 17} fontSize={9.2} fill={C.ink} opacity={0.55}>
                        {slot.note}
                      </text>
                      <text
                        x={HOME_CANVAS.width - 40}
                        y={slot.y + 2}
                        fontSize={8.5}
                        textAnchor="end"
                        letterSpacing="0.2em"
                        fill={C.ink}
                        opacity={0.35}
                      >
                        {`NO. ${slot.no}`}
                      </text>
                    </g>
                  ))}
                </g>
              </svg>
            </div>
          </div>
        </div>

        <aside className="home-aside" id="home-aside" hidden={!asideOpen}>
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

          <div className="panel-block" data-cori-home-panel="1">
            <div className="pb-title">
              跨器官回路 <span className="en">CORI LOOP · PLATE 07</span>
            </div>
            <p className="j-hint">
              Cori 循环不新增第七个标题块：它横跨糖酵解与糖异生两条既有链路，
              在细胞外多出一条“乳酸肌→肝、葡萄糖肝→肌”的血液回路。图上方的浅带可点。
            </p>
            <Link to="/pathway/cori" className="cori-home-link" data-cori-aside-link="1">
              打开 PLATE 07 · Cori 循环 →
            </Link>
          </div>

          <div className="panel-block">
            <div className="pb-title">
              全部去向 <span className="en">TWENTY DESTINATIONS</span>
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

      {tip && (
        <div
          className="home-tip"
          data-testid="home-tip"
          role="tooltip"
          style={{ left: tip.left, top: tip.top }}
        >
          {tip.text}
        </div>
      )}

      <footer className="home-tribute">
        体例致敬：Donald Nicholson 的代谢通路挂图（1960 年首印，后为 IUBMB–Nicholson 系列）与 KEGG（京都大学 Kanehisa 实验室，1995 年首发）的路径图编排。
        仅指版面体例，本图数据与数值不取自上述图谱。
      </footer>
    </div>
  );
}
