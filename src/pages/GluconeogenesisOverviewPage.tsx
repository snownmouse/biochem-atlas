// 糖异生「代谢图谱挂图」（PLATE 03）：延续糖酵解 / TCA 挂图同一版式语言（四色封顶 + 挂图体例）。
// 与 TCA 页同款机制：数据以 gluconeogenesis.json / skeleton.json 为唯一事实源，
// main.tsx 按 pathwayId 分发到此页，不复制糖酵解渲染路径。
// 本页特有：四泳道（基质 → 内膜转运带 → 胞质 → ER 腔）、三次跨膜画成泳道切换（不平线）、
// 右栏镜像对照（mirrorMap 驱动，跳转糖酵解 gk-x）、能量账本不对称锚点、3D 一律占位。
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { MouseEvent as ReactMouseEvent, ReactNode } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import gnJson from "../data/gluconeogenesis/gluconeogenesis.json";
import gnSkelJson from "../data/gluconeogenesis/skeleton.json";
import type {
  GluconeogenesisData,
  GluconeogenesisSkeleton,
  GnStep,
  TransportStep,
} from "../data/gluconeogenesis/types";
import { comparisonConfigFor } from "../data/comparisonConfig";
import "../styles/frames-entry.css";

const data = gnJson as unknown as GluconeogenesisData;
const skel = gnSkelJson as unknown as GluconeogenesisSkeleton;

/* 结构对照页已接入的步骤：由配置反查（不在这里手写第二份名单）；
   转运步不是酶促反应、不建分子对照，入口给灰字声明 */
const GN_CMP_STEP_IDS = new Set(
  (comparisonConfigFor("gluconeogenesis")?.steps ?? []).map((s) => s.stepId)
);

/* ---------- 挂图配色（与糖酵解 / TCA 同款封顶） ---------- */
const INK = "#22282A";
const AMBER = "#B4761F";
const TEAL = "#2E6E6B";
const BRICK = "#9C4A3C";
const PAPER = "#F6F3EC";

const ROMAN_11 = ["Ⅰ", "Ⅱ", "Ⅲ", "Ⅳ", "Ⅴ", "Ⅵ", "Ⅶ", "Ⅷ", "Ⅸ", "Ⅹ", "Ⅺ"];
const roman = (idx: number | null) => (idx === null ? "接" : ROMAN_11[idx - 1] ?? String(idx));

/* ---------- 主链顺序（上一步 / 下一步沿 11 步主链） ---------- */
const MAIN_IDS = data.steps.map((s) => s.id);
/* 全部可点步骤组：主链 11 + 入口 2 + 转运 2（每个 id 只有一个 g[data-step-id]，点击语义与 TCA 同构） */
const ALL_STEP_IDS = [...MAIN_IDS, "gn-ala", "gn-cori", "gn-shuttle-mpc", "gn-shuttle-mal"];

const stepById = (id: string): GnStep | undefined =>
  data.steps.find((s) => s.id === id) ?? data.sideBranchSteps.find((s) => s.id === id);
const transportById = (id: string): TransportStep | undefined =>
  skel.transportSteps.find((t) => t.id === id);

const entityMap = new Map(data.entities.map((e) => [e.id, { name: e.name, abbr: e.abbr }]));
const nameOf = (id: string) => entityMap.get(id)?.name ?? id;

const nodePos = new Map(skel.nodes.map((n) => [n.id, { x: n.x, y: n.y }]));
const posOf = (id: string) => nodePos.get(id) ?? { x: 0, y: 0 };

/* ---------- 节点 → 步骤：糖异生同实体在多泳道各有节点（pyr/oaa），按节点给语义 ---------- */
const NODE_STEP: Record<string, string> = {
  lac: "gn-cori",
  ala: "gn-ala",
  "pyr-cyt": "gn-shuttle-mpc",
  "pyr-mit": "gn-1",
  "oaa-mit": "gn-1",
  mal: "gn-shuttle-mal",
  "oaa-cyt": "gn-2",
  pep: "gn-2",
  "2pg": "gn-3",
  "3pg": "gn-4",
  "13bpg": "gn-5",
  g3p: "gn-6",
  dhap: "gn-7",
  fbp: "gn-8",
  f6p: "gn-9",
  g6p: "gn-10",
  glc: "gn-11",
};

/* ---------- 节点全名外置位（画布布线手工锚定，避免压线压箭头） ---------- */
const NODE_NAME_POS: Record<string, { dx: number; dy: number; anchor: "start" | "end" | "middle" }> = {
  lac: { dx: 0, dy: -28, anchor: "middle" },
  ala: { dx: 28, dy: -2, anchor: "start" },
  "pyr-cyt": { dx: 0, dy: 40, anchor: "middle" },
  "pyr-mit": { dx: 0, dy: -30, anchor: "middle" },
  "oaa-mit": { dx: 0, dy: -30, anchor: "middle" },
  mal: { dx: 0, dy: 34, anchor: "middle" },
  "oaa-cyt": { dx: 0, dy: 40, anchor: "middle" },
  pep: { dx: 0, dy: 40, anchor: "middle" },
  "2pg": { dx: 0, dy: 40, anchor: "middle" },
  "3pg": { dx: 0, dy: 40, anchor: "middle" },
  "13bpg": { dx: 0, dy: 40, anchor: "middle" },
  g3p: { dx: -34, dy: 28, anchor: "end" },
  dhap: { dx: 28, dy: -2, anchor: "start" },
  fbp: { dx: 0, dy: 40, anchor: "middle" },
  f6p: { dx: 0, dy: 40, anchor: "middle" },
  g6p: { dx: -34, dy: 28, anchor: "end" },
  glc: { dx: -30, dy: -24, anchor: "end" },
};

/* ---------- 步骤标签位 + 注脚 + 能量行 ---------- */
const STEP_LABELS: Record<
  string,
  { x: number; y: number; anchor: "start" | "end" | "middle"; note?: string; noteColor?: string }
> = {
  "gn-1": { x: 280, y: 88, anchor: "middle", note: "绕道 B1 · 不可逆 · 生物素摆臂", noteColor: BRICK },
  "gn-2": { x: 735, y: 272, anchor: "middle", note: "绕道 B2 · 不可逆 · 脱羧放能", noteColor: BRICK },
  "gn-3": { x: 880, y: 272, anchor: "middle", note: "同酶反向 · 近平衡" },
  "gn-4": { x: 1020, y: 272, anchor: "middle", note: "同酶反向 · 2,3-BPG 引物" },
  "gn-5": { x: 1160, y: 272, anchor: "middle", note: "同酶反向 · 底物水平磷酸化倒放" },
  "gn-6": { x: 1300, y: 272, anchor: "middle", note: "同酶反向 · NADH 账反向" },
  "gn-7": { x: 1390, y: 372, anchor: "start", note: "同酶反向" },
  "gn-8": { x: 1460, y: 272, anchor: "middle", note: "同酶反向 · 缩合不需 ATP" },
  "gn-9": { x: 1625, y: 272, anchor: "middle", note: "绕道 B3 · 不可逆 · 水解不产 ATP", noteColor: BRICK },
  "gn-10": { x: 1775, y: 272, anchor: "middle", note: "同酶反向" },
  "gn-11": { x: 1836, y: 444, anchor: "end", note: "绕道 B4 · 不可逆 · 活性位点朝腔", noteColor: BRICK },
};
const STEP_ENERGY: Record<string, [string, string][]> = {
  "gn-1": [["ATP −1", AMBER]],
  "gn-2": [["GTP −1", AMBER]],
  "gn-5": [["ATP −1", AMBER]],
  "gn-6": [["NADH −1", TEAL]],
};

/* 挂图标签用短名（同酶反向步的全名「（与糖酵解同酶，逆向运行）」在图上会互相压字，
   全名保留在右栏详情；短名与节点缩写同风格） */
const STEP_SHORT: Record<string, string> = {
  "gn-1": "丙酮酸羧化酶",
  "gn-2": "PEP 羧激酶",
  "gn-3": "Enolase（逆）",
  "gn-4": "PGAM（逆）",
  "gn-5": "PGK（逆）",
  "gn-6": "GAPDH（逆）",
  "gn-7": "TPI（逆）",
  "gn-8": "Aldolase（逆）",
  "gn-9": "FBPase-1",
  "gn-10": "PGI（逆）",
  "gn-11": "G6PC1",
};

/* ---------- 箭头几何（节点边缘裁剪）：heavy=不可逆主链 / rev=可逆双头 / dashed=入口 / thin=汇入 ---------- */
type SegKind = "heavy" | "rev" | "dashed" | "thin";
const GEOS: Record<string, { d: string; kind: SegKind }[]> = {
  "gn-ala": [{ d: "M 74,268 L 182,312", kind: "dashed" }],
  "gn-cori": [{ d: "M 74,399 L 183,331", kind: "dashed" }],
  "gn-shuttle-mpc": [{ d: "M 200,298 L 200,152", kind: "heavy" }],
  "gn-1": [{ d: "M 222,130 L 338,130", kind: "heavy" }],
  "gn-shuttle-mal": [{ d: "M 380,141 L 510,225 L 649,311", kind: "heavy" }],
  "gn-2": [{ d: "M 682,320 L 788,320", kind: "heavy" }],
  "gn-3": [{ d: "M 832,320 L 928,320", kind: "rev" }],
  "gn-4": [{ d: "M 972,320 L 1068,320", kind: "rev" }],
  "gn-5": [{ d: "M 1112,320 L 1208,320", kind: "rev" }],
  "gn-6": [{ d: "M 1252,320 L 1348,320", kind: "rev" }],
  "gn-7": [{ d: "M 1370,342 L 1370,422", kind: "rev" }],
  "gn-8": [
    { d: "M 1392,320 L 1528,320", kind: "rev" },
    { d: "M 1384,430 L 1536,332", kind: "thin" },
  ],
  "gn-9": [{ d: "M 1572,320 L 1678,320", kind: "heavy" }],
  "gn-10": [{ d: "M 1722,320 L 1828,320", kind: "rev" }],
  "gn-11": [{ d: "M 1850,342 L 1850,517", kind: "heavy" }],
};

/* 转运机器标记（膜带内只放机器，不放代谢反应） */
const TRANSPORT_MARKERS: { stepId: string; x: number; y: number; w: number; label: string }[] = [
  { stepId: "gn-shuttle-mpc", x: 200, y: 225, w: 52, label: "MPC" },
  { stepId: "gn-11", x: 1850, y: 485, w: 74, label: "SLC37A4" },
];

/* 转运 / 入口的图上文字（随步骤组可点，q-hide 参与自测） */
const TRANSPORT_TEXTS: Record<string, ReactNode> = {
  "gn-shuttle-mpc": (
    <text x={216} y={229} fontSize={9.5} className="q-hide st-name">MPC 转运 · 丙酮酸入基质</text>
  ),
  "gn-shuttle-mal": (
    <>
      <text x={438} y={162} fontSize={9.5} className="q-hide st-name">苹果酸穿梭（OAA 出膜）</text>
      <text x={438} y={176} fontSize={9} opacity={0.55}>NADH 搭车入胞质 · 供 gn-6</text>
    </>
  ),
  "gn-ala": (
    <text x={92} y={282} fontSize={9.5} opacity={0.75} className="q-hide st-name">ALT 转氨（丙氨酸入口）</text>
  ),
  "gn-cori": (
    <text x={92} y={384} fontSize={9.5} opacity={0.75} className="q-hide st-name">LDH 氧化（Cori 循环入口）</text>
  ),
};

/* 右栏详情标签 */
const STEP_TAGS: Record<string, string> = {
  "gn-1": "绕道 B1 · 线粒体基质",
  "gn-2": "绕道 B2 · GTP 买键",
  "gn-9": "绕道 B3 · 水解",
  "gn-11": "绕道 B4 · ER 腔",
};

const W = skel.canvas.width; // 1980
const H = skel.canvas.height; // 620

export default function GluconeogenesisOverviewPage() {
  const params = useParams();
  const [search, setSearch] = useSearchParams();
  const pathwayId = params.pathwayId ?? "gluconeogenesis";
  if (pathwayId !== data.id) {
    return <div className="page">未知通路：{pathwayId}</div>;
  }

  const organParam = search.get("organ");
  const stepParam = search.get("step");
  const organ = organParam && data.organs.some((o) => o.id === organParam) ? organParam : "liver";
  const organName = data.organs.find((o) => o.id === organ)?.name ?? "肝";
  const selectedStepId = stepParam;
  const selectedGn = useMemo(
    () => (selectedStepId ? stepById(selectedStepId) ?? null : null),
    [selectedStepId]
  );
  const selectedTransport = useMemo(
    () => (selectedStepId && !selectedGn ? transportById(selectedStepId) ?? null : null),
    [selectedStepId, selectedGn]
  );

  const selectStep = useCallback(
    (id: string | null) => {
      const next = new URLSearchParams(search);
      if (id) next.set("step", id);
      else next.delete("step");
      setSearch(next, { replace: true });
    },
    [search, setSearch]
  );
  const switchOrgan = useCallback(
    (id: string) => {
      const next = new URLSearchParams(search);
      next.set("organ", id);
      setSearch(next, { replace: true });
    },
    [search, setSearch]
  );

  /* 自测模式：与糖酵解 / TCA 挂图同机制（q-hide / revealed） */
  const [quizOn, setQuizOn] = useState(false);
  const plateSvgRef = useRef<SVGSVGElement>(null);
  const toggleQuiz = useCallback(() => {
    setQuizOn((v) => {
      if (v) {
        plateSvgRef.current?.querySelectorAll(".q-hide.revealed").forEach((el) => el.classList.remove("revealed"));
      }
      return !v;
    });
  }, []);

  /* 挂图画布：1980 宽于 1440 视口 → Shift+滚轮横向漫游 */
  const scrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (e.shiftKey && Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
        el.scrollLeft += e.deltaY;
        e.preventDefault();
      }
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  /* 挂图点击委托：与 PathwayOverviewPage / TcaOverviewPage 同款修复——
     先判定"是否点中隐藏名"（自测语义：揭晓而非选中），再沿祖先链分别找
     步骤组 [data-step-id] / 节点组 [data-node-id]。不使用 closest 联合选择器。 */
  const onPlateClick = useCallback(
    (e: ReactMouseEvent<SVGSVGElement>) => {
      const el = e.target as Element;
      if (quizOn) {
        const qEl = el.closest(".q-hide");
        if (qEl) {
          qEl.classList.toggle("revealed");
          return;
        }
      }
      const stepId = el.closest("[data-step-id]")?.getAttribute("data-step-id");
      if (stepId) {
        selectStep(stepId === selectedStepId ? null : stepId);
        return;
      }
      const nodeId = el.closest("[data-node-id]")?.getAttribute("data-node-id");
      if (nodeId) {
        const mapped = NODE_STEP[nodeId];
        if (mapped) selectStep(mapped === selectedStepId ? null : mapped);
      }
    },
    [selectedStepId, selectStep, quizOn]
  );

  /* 选中步相关的实体集合（节点按 entityId 点亮，多泳道同名实体同步亮） */
  const relatedEntities = useMemo(() => {
    if (!selectedGn) return null;
    return new Set([...selectedGn.substrates, ...selectedGn.products]);
  }, [selectedGn]);

  const nodeClass = (n: { id: string; entityId?: string }) => {
    const cls = ["node"];
    if (selectedGn && relatedEntities) {
      const eid = n.entityId ?? n.id;
      cls.push(relatedEntities.has(eid) ? "hl" : "faded");
    }
    return cls.join(" ");
  };
  const arrowClass = (stepId: string) => {
    const cls = ["stepg"];
    if (selectedStepId === stepId) cls.push("sel");
    else if (selectedStepId) cls.push("faded");
    return cls.join(" ");
  };

  /* 上一步 / 下一步：沿 11 步主链；主链外的选中态提供「进入主链第 Ⅰ 步」 */
  const navOf = (id: string | null) => {
    const i = id ? MAIN_IDS.indexOf(id) : -1;
    if (i === -1)
      return {
        prev: null as string | null,
        next: MAIN_IDS[0],
        prevLabel: null as string | null,
        nextLabel: `第 Ⅰ 步 · ${stepById(MAIN_IDS[0])?.name}`,
      };
    const p = MAIN_IDS[(i + MAIN_IDS.length - 1) % MAIN_IDS.length];
    const n = MAIN_IDS[(i + 1) % MAIN_IDS.length];
    return {
      prev: p,
      next: n,
      prevLabel: `${roman(stepById(p)!.index)} ${stepById(p)!.name}`,
      nextLabel: `${roman(stepById(n)!.index)} ${stepById(n)!.name}`,
    };
  };
  const nav = navOf(selectedStepId);

  /* 镜像对照：mirrorMap 驱动，不硬编码 */
  const mirrorPairOf = useCallback(
    (gnId: string) => data.mirrorMap.pairs.find((p) => p.gluconeogenesisStepIds.includes(gnId)) ?? null,
    []
  );

  /* 能量账本：entries 按币种求和（ATP 4 / GTP 2 / NADH 2），数值全部来自 energyLedger */
  const ledgerSums = useMemo(() => {
    const m: Record<string, number> = {};
    for (const e of data.energyLedger.entries) m[e.item] = (m[e.item] ?? 0) + e.count;
    return m;
  }, []);
  const ledgerStepIds = useMemo(() => {
    const m: Record<string, string[]> = {};
    for (const e of data.energyLedger.entries) (m[e.item] ??= []).push(e.stepId);
    return m;
  }, []);

  /* 表 1 行：有器官差异的步骤（入口支路也计入） */
  const diffRows = useMemo(() => {
    const rows: { step: GnStep; label: string }[] = [];
    for (const s of data.steps) {
      if (s.organDiffs.length > 0 && s.index !== null)
        rows.push({ step: s, label: `${roman(s.index)} ${s.enzyme.name}` });
    }
    for (const s of data.sideBranchSteps) rows.push({ step: s, label: `入口 ${s.enzyme.name}` });
    return rows;
  }, []);

  const hasDiff = (s: GnStep) => s.organDiffs.some((d) => d.organ === organ);

  const renderSeg = (seg: { d: string; kind: SegKind }, i: number) => {
    switch (seg.kind) {
      case "heavy":
        return <path key={i} className="arrow" d={seg.d} fill="none" stroke={INK} strokeWidth={1.6} markerEnd="url(#gn-ah-ink-heavy)" />;
      case "rev":
        return <path key={i} className="arrow" d={seg.d} fill="none" stroke={INK} strokeWidth={1} markerStart="url(#gn-ah-open)" markerEnd="url(#gn-ah-open)" />;
      case "dashed":
        return <path key={i} className="arrow" d={seg.d} fill="none" stroke={INK} strokeWidth={1} strokeDasharray="4 3" markerEnd="url(#gn-ah-ink)" />;
      case "thin":
        return <path key={i} className="arrow" d={seg.d} fill="none" stroke={INK} strokeWidth={1} markerEnd="url(#gn-ah-ink)" opacity={0.75} />;
    }
  };

  const renderStepLabel = (stepId: string) => {
    const step = stepById(stepId);
    const cfg = STEP_LABELS[stepId];
    if (!step || !cfg) return null;
    const energy = STEP_ENERGY[stepId];
    return (
      <>
        <text x={cfg.x} y={cfg.y} fontSize={11.5} letterSpacing={1.5} textAnchor={cfg.anchor} className="q-hide st-name">
          <tspan className="st-no serif" fontSize={17} style={{ letterSpacing: 0 }}>{roman(step.index)}</tspan>
          {"  "}
          {STEP_SHORT[stepId] ?? step.enzyme.name}
        </text>
        {cfg.note && (
          <text x={cfg.x} y={cfg.y + 15} fontSize={9} textAnchor={cfg.anchor} opacity={0.55} fill={cfg.noteColor}>
            {cfg.note}
          </text>
        )}
        {energy && (
          <text x={cfg.x} y={cfg.y + (cfg.note ? 30 : 15)} fontSize={10} textAnchor={cfg.anchor} fontWeight={700}>
            {energy.map(([t, c], i) => (
              <tspan key={i} fill={c} className="num">{i > 0 ? "　" : ""}{t}</tspan>
            ))}
          </text>
        )}
      </>
    );
  };

  const renderMirrorBlock = (gn: GnStep) => {
    const pair = gn.mirrorOf ? mirrorPairOf(gn.id) : null;
    if (!pair) {
      return (
        <div className="d-mirror">
          <span className="lbl">与糖酵解的对应关系</span>
          原料入口步：无糖酵解镜像——LDH / ALT 是 Cori 循环与葡萄糖-丙氨酸循环的接口酶，糖酵解十步中不含这两个反应。
        </div>
      );
    }
    const gkNo = pair.glycolysisStepId.replace("gk-", "");
    return (
      <div className="d-mirror" data-mirror="1">
        <span className="lbl">与糖酵解的对应关系</span>
        <div className="m-row">
          镜像糖酵解第 <b className="num">{gkNo}</b> 步 · {pair.relationLabel}
        </div>
        {gn.contrastWithGlycolysis && (
          <div className="m-row"><b>酶</b>　{gn.contrastWithGlycolysis.enzyme}</div>
        )}
        <div className="m-row"><b>能量代价差</b>　{pair.energyCostDiff}</div>
        <div className="m-row"><b>调控差异</b>　{pair.regulationDiff}</div>
        <Link className="d-gklink" data-gk-link={pair.glycolysisStepId} to={`/pathway/glycolysis?step=${pair.glycolysisStepId}`}>
          跳到糖酵解第 {gkNo} 步 →
        </Link>
      </div>
    );
  };

  const nodeNameOf = (nodeId: string) => {
    const n = skel.nodes.find((x) => x.id === nodeId);
    return nameOf(n?.entityId ?? nodeId);
  };

  return (
    <div className="poster">
      {/* ===== 面包屑（兼作通路切换：克制的下划线文字） ===== */}
      <nav className="crumb" style={{ margin: "14px 28px 0" }}>
        <Link to="/pathway/glycolysis">糖酵解</Link>
        {" ／ "}
        <Link to="/pathway/tca">三羧酸循环</Link>
        {" ／ "}
        <b>糖异生</b>
        {" ／ "}
        <Link to="/pathway/ppp">磷酸戊糖途径</Link>
        {selectedGn && (
          <>
            {" ／ 第 "}
            {roman(selectedGn.index)} 步 · {selectedGn.name}
          </>
        )}
      </nav>

      {/* ===== 报头 ===== */}
      <header className="masthead">
        <div className="mast-top">
          <span className="kicker">代谢通路挂图 · METABOLIC WALL CHART</span>
          <span className="plate-no num">PLATE 03 / 12 · 第一版 · 2026</span>
        </div>
        <div className="mast-main">
          <h1>
            {data.name}
            <small>GLUCONEOGENESIS — 从丙酮酸回溯葡萄糖：四泳道 · 三次跨膜 · 与糖酵解共用七酶</small>
          </h1>
          <p className="mast-summary">
            {data.summary} 与糖酵解净产 <b className="num">2</b> ATP <b>不对称</b>：逆向跑通路要补{" "}
            <b className="num">3</b> 倍电力（<b className="num">4</b> ATP + <b className="num">2</b> GTP +{" "}
            <b className="num">2</b> NADH）。
          </p>
        </div>
      </header>

      {/* ===== 图例 ===== */}
      <div className="legend">
        <span className="lg">
          <svg width="46" height="10" aria-hidden>
            <line x1="0" y1="5" x2="38" y2="5" stroke={INK} strokeWidth="1.6" />
            <path d="M38,1 L46,5 L38,9 Z" fill={INK} />
          </svg>
          不可逆反应
        </span>
        <span className="lg">
          <svg width="46" height="10" aria-hidden>
            <line x1="6" y1="5" x2="40" y2="5" stroke={INK} />
            <path d="M6,1 L0,5 L6,9 Z" fill="none" stroke={INK} />
            <path d="M40,1 L46,5 L40,9 Z" fill="none" stroke={INK} />
          </svg>
          可逆反应（同酶反向）
        </span>
        <span className="lg">
          <svg width="46" height="10" aria-hidden>
            <line x1="0" y1="5" x2="46" y2="5" stroke={INK} strokeDasharray="4 3" />
          </svg>
          入口支路 / 底物循环
        </span>
        <span className="lg">
          <svg width="40" height="14" aria-hidden>
            <line x1="4" y1="12" x2="30" y2="2" stroke={INK} strokeWidth="1.6" />
            <path d="M31,0 L37,1 L32,5 Z" fill={INK} />
          </svg>
          跨膜转运 = 泳道切换（垂直 / 斜向，不平线）
        </span>
        <span className="lg">
          <span style={{ color: AMBER, fontWeight: 700 }}>琥珀</span>＝ATP / GTP
          <span style={{ margin: "0 6px", color: TEAL, fontWeight: 700 }}>青</span>＝NADH 还原当量
        </span>
        {quizOn && (
          <span className="lg quiz-hint">自测中 · 酶名与代谢物名已隐藏 · 悬停或点击揭晓</span>
        )}
        <span className="lg legend-hint">画布宽于视口 · Shift+滚轮横向漫游</span>
      </div>

      {/* ===== 主体 ===== */}
      <div className="body-grid">
        <div className="plate-wrap">
          <div className="plate-head">
            <span className="t">图 1 · 糖异生主链：四泳道 · 三次跨膜（基质 → 内膜转运带 → 胞质 → ER 腔）</span>
            <span className="organ-switch" role="tablist" aria-label="器官视图切换">
              视图
              {data.organs.map((o) => (
                <button
                  key={o.id}
                  role="tab"
                  aria-selected={o.id === organ}
                  data-organ={o.id}
                  className={`organ-tab${o.id === organ ? " active" : ""}`}
                  onClick={() => switchOrgan(o.id)}
                >
                  {o.name}
                </button>
              ))}
              <button
                type="button"
                aria-pressed={quizOn}
                className={`organ-tab quiz-toggle${quizOn ? " active" : ""}`}
                onClick={toggleQuiz}
                title="隐藏酶名与代谢物名，悬停或点击揭晓"
              >
                自测
              </button>
            </span>
          </div>

          <div className="plate-scroll" ref={scrollRef}>
            <div className="plate-canvas">
              <svg
                ref={plateSvgRef}
                className={quizOn ? "quiz-on" : undefined}
                width={W}
                height={H}
                viewBox={`0 0 ${W} ${H}`}
                onClick={onPlateClick}
                data-lanes="mito-matrix,mito-inner-membrane,cytosol,er-lumen"
              >
                <defs>
                  <marker id="gn-ah-ink" markerWidth="9" markerHeight="8" refX="8" refY="4" orient="auto">
                    <path d="M0,0.5 L8.5,4 L0,7.5 Z" fill={INK} />
                  </marker>
                  <marker id="gn-ah-ink-heavy" markerWidth="10" markerHeight="9" refX="9" refY="4.5" orient="auto">
                    <path d="M0,0.5 L9.5,4.5 L0,8.5 Z" fill={INK} />
                  </marker>
                  <marker id="gn-ah-open" markerWidth="9" markerHeight="8" refX="8" refY="4" orient="auto-start-reverse">
                    <path d="M0,0.5 L8.5,4 L0,7.5" fill="none" stroke={INK} />
                  </marker>
                </defs>

                {/* 角落十字锚点 */}
                <g stroke={INK} strokeWidth={1} opacity={0.5}>
                  <path d="M20,12 V28 M12,20 H28" />
                  <path d={`M${W - 20},12 V28 M${W - 28},20 H${W - 12}`} />
                  <path d={`M20,${H - 28} V${H - 12} M12,${H - 20} H28`} />
                  <path d={`M${W - 20},${H - 28} V${H - 12} M${W - 28},${H - 20} H${W - 12}`} />
                </g>

                {/* ===== 四泳道分隔（膜带只放分区与转运机器，代谢反应不入带） ===== */}
                <g>
                  {/* 线粒体内膜转运带 y 200-250 */}
                  <rect x={40} y={200} width={W - 80} height={50} fill={INK} opacity={0.045} />
                  <line x1={40} y1={200} x2={W - 40} y2={200} stroke={INK} strokeWidth={1} />
                  <line x1={40} y1={250} x2={W - 40} y2={250} stroke={INK} strokeWidth={1} />
                  {/* 胞质底界 y 470 */}
                  <line x1={40} y1={470} x2={W - 40} y2={470} stroke={INK} strokeWidth={1} />
                  {/* ER 膜 y 470-500（仅右段）+ ER 腔 */}
                  <rect x={1690} y={470} width={W - 1730} height={30} fill={INK} opacity={0.045} />
                  <line x1={1690} y1={500} x2={W - 40} y2={500} stroke={INK} strokeWidth={1} />
                  <rect x={1700} y={500} width={W - 1740} height={70} fill={INK} opacity={0.03} />
                  <line x1={1690} y1={570} x2={W - 40} y2={570} stroke={INK} strokeWidth={1} />
                </g>
                {/* 泳道标签 */}
                <g fontSize={11} letterSpacing={4} fontWeight={700} fill={INK}>
                  <text x={48} y={95}>线粒体基质 · MITOCHONDRIAL MATRIX</text>
                  <text x={48} y={232} fontSize={10}>线粒体内膜 · 转运带（只放转运机器）</text>
                  <text x={48} y={440}>细胞质 · CYTOSOL</text>
                  <text x={1712} y={548} fontSize={10}>内质网腔 · ER LUMEN</text>
                </g>

                {/* ===== 底物循环（与糖酵解对打，虚线注记，引用糖酵解步 gk-3 / gk-1） ===== */}
                <g className="branch" opacity={0.7}>
                  <path d="M 1690,296 Q 1625,218 1560,296" fill="none" stroke={INK} strokeWidth={1} strokeDasharray="4 3" markerEnd="url(#gn-ah-ink)" />
                  <text x={1625} y={232} fontSize={9} textAnchor="middle">底物循环 · PFK-1 对打（gk-3）</text>
                  <text x={1625} y={246} fontSize={8.5} textAnchor="middle" opacity={0.65}>F2,6BP 单一信使双向裁决</text>
                  <path d="M 1872,520 Q 1962,428 1872,336" fill="none" stroke={INK} strokeWidth={1} strokeDasharray="4 3" markerEnd="url(#gn-ah-ink)" />
                  <text x={1968} y={410} fontSize={9} textAnchor="end">底物循环</text>
                  <text x={1968} y={424} fontSize={9} textAnchor="end">HK/GCK 对打（gk-1）</text>
                </g>

                {/* ===== 步骤组：每个 id 一个 g[data-step-id]（箭头 + 机器 + 图上文字 + 标签） ===== */}
                {ALL_STEP_IDS.map((id) => {
                  const gn = stepById(id);
                  return (
                    <g key={id} className={arrowClass(id)} data-step-id={id} style={{ cursor: "pointer" }}>
                      {(GEOS[id] ?? []).map((seg, i) => renderSeg(seg, i))}
                      {TRANSPORT_MARKERS.filter((m) => m.stepId === id).map((m) => (
                        <g key={m.label}>
                          <rect x={m.x - m.w / 2} y={m.y - 9} width={m.w} height={18} fill={PAPER} stroke={INK} strokeWidth={1.1} />
                          <text x={m.x} y={m.y + 3.5} fontSize={8.5} textAnchor="middle" fontWeight={700} className="num">{m.label}</text>
                        </g>
                      ))}
                      {TRANSPORT_TEXTS[id]}
                      {gn && renderStepLabel(id)}
                    </g>
                  );
                })}

                {/* ===== 节点 ===== */}
                <g fontSize={13} fontWeight={700} textAnchor="middle">
                  {skel.nodes.map((n) => {
                    const p = posOf(n.id);
                    const lb = NODE_NAME_POS[n.id];
                    const isSide = n.id === "lac" || n.id === "ala" || n.id === "mal";
                    const r = isSide ? 16 : 20;
                    return (
                      <g key={n.id} className={nodeClass(n)} data-node-id={n.id} style={{ cursor: "pointer" }}>
                        <circle cx={p.x} cy={p.y} r={r} fill={PAPER} stroke={INK} strokeWidth={1.2} strokeDasharray={isSide ? "3 3" : undefined} />
                        <text className="q-hide" x={p.x} y={p.y + 5} fontSize={isSide ? 10.5 : 13}>{n.entityId ? abbrOf2(n.entityId) : abbrOf2(n.id)}</text>
                        {lb && (
                          <text className="q-hide" x={p.x + lb.dx} y={p.y + lb.dy} fontSize={10.5} fontWeight={400} textAnchor={lb.anchor}>
                            {n.label}
                          </text>
                        )}
                        {n.id === "glc" && n.note && (
                          <text x={p.x - 30} y={p.y - 24} fontSize={8.5} textAnchor="end" opacity={0.6}>{n.note}</text>
                        )}
                      </g>
                    );
                  })}
                </g>

                {/* 边缘延伸 */}
                <g opacity={0.7}>
                  <text x={46} y={602} fontSize={9.5} opacity={0.8}>← 乳酸 / 丙氨酸来自肌与红细胞（Cori 循环 · 葡萄糖-丙氨酸循环）</text>
                  <text x={W - 46} y={602} fontSize={9.5} textAnchor="end">葡萄糖经 GLUT2 出肝入血 →</text>
                </g>
              </svg>
            </div>
          </div>

          {/* ===== 脚注区：空间说明 + 表 1 组织差异 + 表 2 镜像对照 ===== */}
          <div className="footnote">
            <div className="fn-head">
              <span className="t">空间读法 · SPATIAL NOTE</span>
            </div>
            <p style={{ fontSize: 12, lineHeight: 1.9, margin: "0 0 18px" }}>{skel.spatialNote}</p>

            <div className="fn-head">
              <span className="t">表 1 · 组织差异（肝 ／ 肾皮质）</span>
              <span className="view">硫酸纸视图 · {organName}</span>
            </div>
            <table className="organs">
              <thead>
                <tr>
                  <th style={{ width: 190 }}>步骤</th>
                  {data.organs.map((o) => (
                    <th key={o.id} className={o.id === organ ? "cur" : ""}>{o.name}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {diffRows.map(({ step, label }) => (
                  <tr
                    key={step.id}
                    style={{ cursor: "pointer" }}
                    onClick={() => selectStep(step.id === selectedStepId ? null : step.id)}
                  >
                    <td className="stepcell">
                      {hasDiff(step) && <span className="dm">Δ</span>}
                      {label}
                    </td>
                    {data.organs.map((o) => {
                      const d = step.organDiffs.find((x) => x.organ === o.id);
                      return (
                        <td key={o.id} className={o.id === organ ? "cur" : ""}>
                          {d ? d.text : "—（与通用型一致）"}
                        </td>
                      );
                    })}
                  </tr>
                ))}
                <tr>
                  <td className="stepcell">其余各步</td>
                  {data.organs.map((o) => (
                    <td key={o.id} className={o.id === organ ? "cur" : ""}>
                      同酶反向七步（gn-3…gn-8、gn-10）各组织共用同一套胞质酶，无组织差异。
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>

            {/* ===== 表 2 · 镜像对照（本页最大教学价值，mirrorMap 驱动） ===== */}
            <div className="fn-head" style={{ marginTop: 22 }}>
              <span className="t">表 2 · {data.mirrorMap.title}</span>
            </div>
            <table className="organs" data-mirror-table="1">
              <thead>
                <tr>
                  <th style={{ width: 130 }}>糖酵解步</th>
                  <th style={{ width: 130 }}>糖异生侧</th>
                  <th style={{ width: 210 }}>关系</th>
                  <th>能量代价差</th>
                  <th>调控差异</th>
                </tr>
              </thead>
              <tbody>
                {data.mirrorMap.pairs.map((p) => {
                  const gkNo = p.glycolysisStepId.replace("gk-", "");
                  return (
                    <tr
                      key={p.glycolysisStepId}
                      style={{ cursor: "pointer" }}
                      onClick={() => selectStep(p.gluconeogenesisStepIds[0] ?? null)}
                    >
                      <td className="stepcell num">第 {gkNo} 步</td>
                      <td className="num">{p.gluconeogenesisStepIds.map((s) => s.replace("gn-", "")).join(" + ")}</td>
                      <td>{p.relationLabel}</td>
                      <td>{p.energyCostDiff}</td>
                      <td>{p.regulationDiff}</td>
                    </tr>
                  );
                })}
                <tr>
                  <td className="stepcell" colSpan={2}><b>合计</b></td>
                  <td colSpan={3}>
                    {data.mirrorMap.totals.irreversiblePoints} 个不可逆点 · {data.mirrorMap.totals.bypassReactions} 个绕道反应 ·
                    糖酵解净产 <b className="num">{data.mirrorMap.totals.glycolysisNetAtp}</b> ATP，糖异生{" "}
                    <b className="num">{data.mirrorMap.totals.gluconeogenesisCost}</b>，另需{" "}
                    <b className="num">{data.mirrorMap.totals.nadhRequired}</b> NADH——{data.mirrorMap.totals.asymmetryNote}
                  </td>
                </tr>
              </tbody>
            </table>
            <div style={{ fontSize: 11, opacity: 0.65, marginTop: 6 }}>{data.mirrorMap.note}</div>
          </div>
        </div>

        {/* ===== 右栏 ===== */}
        <aside>
          <div className="panel-block">
            <div className="pb-title">
              <span>详情栏</span>
              <span className="en">DETAIL · 点击图上任一步骤</span>
            </div>
            {selectedGn ? (
              <div className="d-body">
                <div className="d-step">
                  <span className="no serif num">{roman(selectedGn.index)}</span>
                  {selectedGn.name}
                  {selectedGn.irreversible && <span className="d-tag">不可逆</span>}
                  {STEP_TAGS[selectedGn.id] && <span className="d-tag amber">{STEP_TAGS[selectedGn.id]}</span>}
                </div>
                <div className="d-enzyme">
                  {selectedGn.enzyme.name}
                  {selectedGn.enzyme.isozyme && <span className="d-iso"> — {selectedGn.enzyme.isozyme}</span>}
                </div>
                <div className="d-eq">{selectedGn.equation}</div>
                <div className="d-cof">
                  <b>底物</b>　{selectedGn.substrates.map(nameOf).join(" + ")}
                  　　<b>产物</b>　{selectedGn.products.map(nameOf).join(" + ")}
                </div>
                <div className="d-cof">
                  <b>辅因子</b>　{selectedGn.cofactors.length ? selectedGn.cofactors.join("、") : "—"}
                </div>
                {selectedGn.ecNumber && (
                  <div className="d-cof num"><b>EC</b>　{selectedGn.ecNumber}</div>
                )}
                {/* ΔG：数值未核实 → 灰字定性，不留空、不编数 */}
                {selectedGn.deltaG && (
                  <>
                    <div className="d-cof" data-dg="1">
                      <b>ΔG</b>
                      <span style={{ opacity: 0.55 }}>
                        {" "}定性：{selectedGn.deltaG.qualitative ?? "—"}（数值未核实，仅定性结论）
                      </span>
                    </div>
                    {selectedGn.deltaG.note && <div className="d-dgnote">{selectedGn.deltaG.note}</div>}
                  </>
                )}
                {selectedGn.stereochemistry?.length ? (
                  <div className="d-cof d-stereo"><b>立体化学</b>　{selectedGn.stereochemistry.join("；")}</div>
                ) : null}
                <div className="d-sig">{selectedGn.significance}</div>
                {/* 结构对照入口：与糖酵解 / TCA 同款下划线文字链接；未接入的步骤灰字声明，不给空链接 */}
                {GN_CMP_STEP_IDS.has(selectedGn.id) ? (
                  <Link
                    className="frames-entry"
                    data-testid="gn-structure-cmp-entry"
                    data-cmp-step={selectedGn.id}
                    to={`/structures/gluconeogenesis#${selectedGn.id}`}
                  >
                    看这一步的结构对照 →
                  </Link>
                ) : (
                  <span className="frames-entry-none" data-testid="gn-structure-cmp-none" aria-disabled="true">
                    结构对照尚未接入
                  </span>
                )}
                {hasDiff(selectedGn) ? (
                  <div className="d-organ">
                    <span className="lbl">Δ {organName}差异</span>
                    {selectedGn.organDiffs.find((d) => d.organ === organ)?.text}
                  </div>
                ) : selectedGn.organDiffs.length ? (
                  <div className="d-none">
                    本步差异在其它组织（
                    {selectedGn.organDiffs
                      .map((d) => data.organs.find((o) => o.id === d.organ)?.name)
                      .filter(Boolean)
                      .join("、")}
                    ）——切换视图可见。
                  </div>
                ) : (
                  <div className="d-none">本步无组织差异（各组织共用同一套胞质酶）。</div>
                )}
                {/* 镜像对照：mirrorMap 驱动 + 跳糖酵解链接 */}
                {renderMirrorBlock(selectedGn)}
                {selectedGn.misconceptions?.length ? (
                  <div className="d-mis">
                    <span className="lbl">常见误解</span>
                    <ul>
                      {selectedGn.misconceptions.slice(0, 2).map((m, i) => (
                        <li key={i}>{m}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}
                {selectedGn.clinical?.length ? (
                  <div className="d-mis">
                    <span className="lbl">临床关联</span>
                    <ul>
                      {selectedGn.clinical.map((c, i) => (
                        <li key={i}>{c}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}
                <div className="d-variant" role="tablist" aria-label="上一步 / 下一步">
                  {nav.prev && (
                    <button role="tab" className="d-variant-tab" onClick={() => selectStep(nav.prev!)}>← {nav.prevLabel}</button>
                  )}
                  <button role="tab" className="d-variant-tab" onClick={() => selectStep(nav.next)}>{nav.nextLabel} →</button>
                </div>
                {/* 3D 占位：数据里 threeD.status === "pending"，不伪造资产路径 */}
                <div className="d-none" data-3d-placeholder="1">
                  3D 结合视图：待结构核验——
                  {selectedGn.threeD?.status === "pending"
                    ? selectedGn.threeD.note
                    : "本步与糖酵解共用同一酶，结构证据见糖酵解挂图帧带；本通路 3D 资产未制作，无资产路径。"}
                </div>
              </div>
            ) : selectedTransport ? (
              <div className="d-body">
                <div className="d-step">
                  <span className="no serif">运</span>
                  {selectedTransport.name}
                  <span className="d-tag">跨膜转运</span>
                </div>
                <div className="d-eq">
                  {nodeNameOf(selectedTransport.from)}
                  {selectedTransport.via ? `（经 ${nodeNameOf(selectedTransport.via)}）` : ""}
                  {" → "}
                  {nodeNameOf(selectedTransport.to)}
                </div>
                <div className="d-sig">{selectedTransport.note}</div>
                <span className="frames-entry-none" data-testid="gn-structure-cmp-none" aria-disabled="true">
                  转运步不是酶促反应 · 无分子结构对照
                </span>
                <div className="d-none">
                  转运步不是酶促反应：膜带只放转运机器（MPC / 苹酸载体 / SLC37A4），代谢反应全部在基质、胞质或 ER 腔内完成。
                </div>
                <div className="d-variant" role="tablist" aria-label="上一步 / 下一步">
                  <button role="tab" className="d-variant-tab" onClick={() => selectStep(MAIN_IDS[0])}>
                    进入主链第 Ⅰ 步 →
                  </button>
                </div>
                <div className="d-none" data-3d-placeholder="1">
                  3D 结合视图：待结构核验——转运体结构未列入本通路资产计划（膜蛋白展示口径与 FAO 切片一致：降 2D / 图上注记）。
                </div>
              </div>
            ) : (
              <div className="d-body">
                <div className="d-placeholder">
                  点击图上的步骤箭头、酶名或代谢物节点，此处显示该步的反应式、酶与 EC、ΔG（未核实时灰字定性）、
                  意义、误解、临床与<b>与糖酵解的对应关系</b>（含跳转糖酵解链接）。
                  三次跨膜（MPC 入基质 / 苹果酸穿梭出膜 / G6P 下潜 ER 腔）亦可点击。
                </div>
              </div>
            )}
          </div>

          <div className="panel-block">
            <div className="pb-title">
              <span>能量账本</span>
              <span className="en">ENERGY LEDGER · 每生成 1 葡萄糖</span>
            </div>
            <div className="settle" data-ledger="1">
              <div>
                <div className="s-lbl">ATP</div>
                <div className="s-val a num">−{ledgerSums.ATP ?? 0}</div>
                <div className="s-sub num">{(ledgerStepIds.ATP ?? []).join(" + ")}</div>
              </div>
              <div>
                <div className="s-lbl">GTP</div>
                <div className="s-val a num">−{ledgerSums.GTP ?? 0}</div>
                <div className="s-sub num">{(ledgerStepIds.GTP ?? []).join(" + ")}</div>
              </div>
              <div>
                <div className="s-lbl">NADH</div>
                <div className="s-val t num">−{ledgerSums.NADH ?? 0}</div>
                <div className="s-sub num">{(ledgerStepIds.NADH ?? []).join(" + ")}</div>
              </div>
              <div>
                <div className="s-lbl">糖酵解对照</div>
                <div className="s-val t num">+{data.mirrorMap.totals.glycolysisNetAtp} ATP</div>
                <div className="s-sub num">糖酵解同走一趟的净产出</div>
              </div>
              <div className="settle-rule" />
              <div className="settle-net" data-asymmetry="1">
                <span className="n-lbl">不对称</span>
                <span className="n-val num">{data.energyLedger.totals}</span>
              </div>
            </div>
            <div className="d-none" style={{ borderTop: "none", paddingTop: 0 }}>
              {data.energyLedger.asymmetryNote}
              {data.energyLedger.deltaGDiscipline ? ` 口径：${data.energyLedger.deltaGDiscipline}` : ""}
            </div>
          </div>
        </aside>
      </div>

      <div className="poster-foot">
        <span>待确认：逐步 ΔG 的 Lehninger Ch.20 详表数值未核实，页面仅显示定性结论，不可作定量判读。<br /></span>
        <span>待确认：3D 结合视图整轮占位——PDB 候选（3BG3 / 1KHB / 1FTA / 9J7U 等）来自 outline 已核验表，资产未制作，无路径。<br /></span>
        <span>待确认：PCK1 缺乏表型、肾糖异生占比、FBPase 抑制剂临床转化状态未核实，页面如实标注。<br /></span>
      </div>
    </div>
  );
}

function abbrOf2(id: string) {
  return entityMap.get(id)?.abbr ?? id;
}
