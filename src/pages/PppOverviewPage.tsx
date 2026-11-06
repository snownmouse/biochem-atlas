// 磷酸戊糖通路「代谢图谱挂图」（PLATE 04）：延续糖酵解 / TCA / 糖异生同一版式语言。
// 数据以 src/data/ppp/ppp.json 与 skeleton.json 为唯一事实源；本页不改数据。
// 本页特有：氧化相（3 步，逐列能量账）+ 非氧化相（5 步，二碳/三碳转移弧 + 净账），
// 与糖酵解三处接口投影（左缘入、右缘两处出），右栏证据等级直接读 evidenceGrade / comparisonConfig。
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { MouseEvent as ReactMouseEvent } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import pppJson from "../data/ppp/ppp.json";
import skelJson from "../data/ppp/skeleton.json";
import type { PppData, PppSkeleton, PppStep } from "../data/ppp/types";
import { comparisonConfigFor } from "../data/comparisonConfig";
import { GRADE_LABEL, gradesForStep } from "../data/evidenceGrade";
import PathwaySwitcher from "../components/PathwaySwitcher";
import { PathwayRailFoot } from "../components/PathwayRail";
import PlateInteraction from "../components/PlateInteraction";
import "../styles/frames-entry.css";

const data = pppJson as unknown as PppData;
const skel = skelJson as unknown as PppSkeleton;

/* ---------- 挂图配色（与其它挂图同款封顶四色） ---------- */
const INK = "#22282A";
const TEAL = "#2E6E6B";
const BRICK = "#9C4A3C";
const PAPER = "#F6F3EC";

const ROMAN_8 = ["Ⅰ", "Ⅱ", "Ⅲ", "Ⅳ", "Ⅴ", "Ⅵ", "Ⅶ", "Ⅷ"];
const roman = (idx: number | null) => (idx === null ? "—" : ROMAN_8[idx - 1] ?? String(idx));

/* ---------- 器官视图 ----------
   数据层只在 organDiffs 里登记了肝 / 红细胞（ppp-o1、ppp-o3），没有 organs 清单；
   这里从数据反读，再按固定顺序排列，绝不补造数据层没有的器官差异。 */
const ORGAN_NAMES: Record<string, string> = { liver: "肝", rbc: "红细胞" };
const ORGAN_IDS = [...new Set(data.steps.flatMap((s) => s.organDiffs.map((d) => d.organ)))];
const ORGANS = ["liver", "rbc"]
  .filter((id) => ORGAN_IDS.includes(id))
  .map((id) => ({ id, name: ORGAN_NAMES[id] ?? id }));

/* 器官视图默认肝；若数据层连肝都没登记，退到第一个登记器官 */
const DEFAULT_ORGAN = ORGANS.some((o) => o.id === "liver") ? "liver" : ORGANS[0]?.id ?? "";

/* ---------- 结构对照配置：入口是否存在、证据等级都从这里读 ---------- */
const CMP = comparisonConfigFor("ppp");
const CMP_STEP_IDS = new Set((CMP?.steps ?? []).map((s) => s.stepId));

const stepById = (id: string): PppStep | undefined => data.steps.find((s) => s.id === id);
const entityMap = new Map(data.entities.map((e) => [e.id, { name: e.name, abbr: e.abbr }]));
const nameOf = (id: string) => entityMap.get(id)?.name ?? id;
const abbrOf = (id: string) => entityMap.get(id)?.abbr ?? id;

const nodePos = new Map(skel.nodes.map((n) => [n.id, { x: n.x, y: n.y }]));
const posOf = (id: string) => nodePos.get(id) ?? { x: 0, y: 0 };

const MAIN_IDS = data.steps.map((s) => s.id);

/* ---------- 节点 → 步骤：同实体多节点（gap1 / gap2 都是 g3p）按池记号给语义 ---------- */
const NODE_STEP: Record<string, string> = {
  "if-in-g6p": "ppp-o1",
  g6p: "ppp-o1",
  "6pgl": "ppp-o2",
  "6pg": "ppp-o3",
  co2: "ppp-o3",
  ru5p: "ppp-o3",
  xu5p: "ppp-n2",
  r5p: "ppp-n1",
  s7p: "ppp-n3",
  gap1: "ppp-n3",
  e4p: "ppp-n4",
  f6p: "ppp-n4",
  gap2: "ppp-n5",
  "if-out-f6p": "ppp-n4",
  "if-out-g3p": "ppp-n5",
};

/* ---------- 图上短名（全名保留在右栏；避免长名互压） ---------- */
const STEP_SHORT: Record<string, string> = {
  "ppp-o1": "G6PD",
  "ppp-o2": "6PGL 内酯酶",
  "ppp-o3": "6PGD",
  "ppp-n1": "RPIA",
  "ppp-n2": "RPE",
  "ppp-n3": "转酮醇酶（第一接力）",
  "ppp-n4": "转醛醇酶",
  "ppp-n5": "转酮醇酶（第二接力）",
};

/* ---------- 步骤标签位 ---------- */
const STEP_LABEL: Record<
  string,
  { x: number; y: number; anchor: "start" | "middle" | "end"; note?: string; noteColor?: string }
> = {
  "ppp-o1": { x: 294, y: 116, anchor: "middle", note: "限速 · 不可逆 · NADPH 第 1 个" },
  "ppp-o2": { x: 517, y: 116, anchor: "middle", note: "水解开环 · H₂O" },
  "ppp-o3": { x: 746, y: 116, anchor: "middle", note: "氧化脱羧 · 第 2 个 NADPH + CO₂" },
  "ppp-n1": { x: 900, y: 440, anchor: "start", note: "酮糖→醛糖 · R5P 核酸出口" },
  "ppp-n2": { x: 900, y: 250, anchor: "start", note: "C3 差向异构 · TK 供体形态" },
  "ppp-n3": { x: 1012, y: 452, anchor: "start", note: "C2 转移 · 第一接力（与 Ⅷ 同酶）" },
  "ppp-n4": { x: 1236, y: 318, anchor: "start", note: "C3 转移 · 首个 F6P 出炉" },
  "ppp-n5": { x: 1488, y: 250, anchor: "start", note: "C2 转移 · 同一酶第二段（非第 9 步）" },
};

/* ---------- 箭头几何：heavy=不可逆 / rev=可逆双头 / dashed=支路 ---------- */
type SegKind = "heavy" | "rev" | "dashed";
const GEOS: Record<string, { d: string; kind: SegKind }[]> = {
  "ppp-o1": [{ d: "M 207,340 L 381,340", kind: "heavy" }],
  "ppp-o2": [{ d: "M 427,340 L 606,340", kind: "heavy" }],
  "ppp-o3": [
    { d: "M 652,340 L 841,340", kind: "heavy" },
    { d: "M 646,318 L 660,184", kind: "dashed" },
  ],
  "ppp-n1": [{ d: "M 865,362 L 865,491", kind: "rev" }],
  "ppp-n2": [{ d: "M 865,187 L 865,316", kind: "rev" }],
  "ppp-n3": [
    { d: "M 878,184 L 1111,496", kind: "rev" },
    { d: "M 887,498 L 1112,278", kind: "rev" },
  ],
  "ppp-n4": [
    { d: "M 1156,243 L 1377,178", kind: "rev" },
    { d: "M 1156,499 L 1377,361", kind: "rev" },
  ],
  "ppp-n5": [
    { d: "M 880,190 L 1617,495", kind: "rev" },
    { d: "M 1400,187 L 1400,316", kind: "rev" },
  ],
};

/* ---------- 碳单位转移弧：供体 → 受体，弧旁标 C2 / C3 ---------- */
const TRANSFER_ARCS: { stepId: string; d: string; carbons: 2 | 3; label: string; sub: string; x: number; y: number; anchor: "start" | "middle" | "end" }[] = [
  {
    stepId: "ppp-n3",
    d: "M 887,187 Q 950,340 887,492",
    carbons: 2,
    label: "C2",
    sub: "羟乙酰基",
    x: 930,
    y: 332,
    anchor: "start",
  },
  {
    stepId: "ppp-n4",
    d: "M 1158,272 Q 1230,392 1158,496",
    carbons: 3,
    label: "C3",
    sub: "二羟丙酮基",
    x: 1242,
    y: 382,
    anchor: "start",
  },
  {
    stepId: "ppp-n5",
    d: "M 892,146 Q 1130,88 1374,146",
    carbons: 2,
    label: "C2",
    sub: "羟乙酰基（第二次）",
    x: 1130,
    y: 128,
    anchor: "middle",
  },
];

/* ---------- 节点全名外置位 ---------- */
const NODE_LABEL_POS: Record<string, { dx: number; dy: number; anchor: "start" | "end" | "middle" }> = {
  g6p: { dx: 0, dy: 44, anchor: "middle" },
  "6pgl": { dx: 0, dy: 44, anchor: "middle" },
  "6pg": { dx: 0, dy: 44, anchor: "middle" },
  co2: { dx: 26, dy: 44, anchor: "start" },
  ru5p: { dx: 0, dy: 44, anchor: "middle" },
  xu5p: { dx: 0, dy: 42, anchor: "middle" },
  r5p: { dx: 0, dy: 42, anchor: "middle" },
  s7p: { dx: 0, dy: -28, anchor: "middle" },
  gap1: { dx: 0, dy: 44, anchor: "middle" },
  e4p: { dx: 0, dy: 44, anchor: "middle" },
  f6p: { dx: 0, dy: 44, anchor: "middle" },
  gap2: { dx: 0, dy: 44, anchor: "middle" },
};

/* 节点圆内缩写与碳数小注 */
const NODE_CARBONS: Record<string, string> = {
  g6p: "C6",
  "6pgl": "C6",
  "6pg": "C6",
  co2: "C1",
  ru5p: "C5",
  xu5p: "C5",
  r5p: "C5",
  s7p: "C7",
  gap1: "C3",
  e4p: "C4",
  f6p: "C6",
  gap2: "C3",
};

/* ---------- 氧化相账本列（数据来自 ppp.json 的 ox/cofactors/products） ---------- */
const OX_LEDGER = [
  { stepId: "ppp-o1", no: "Ⅰ", x: 185, nadph: 1, co2: false, sum: "累计 1 NADPH" },
  { stepId: "ppp-o2", no: "Ⅱ", x: 405, nadph: 0, co2: false, sum: "水解 · 不产还原力" },
  { stepId: "ppp-o3", no: "Ⅲ", x: 630, nadph: 1, co2: true, sum: "累计 2 NADPH · 1 CO₂" },
] as const;

/* NADPH 总数不手写：从氧化相各步的 NADP⁺ 辅因子反算（o1、o3 各 1） */
const NADPH_TOTAL = data.steps
  .filter((s) => s.phase === "oxidative")
  .reduce((n, s) => n + s.cofactors.filter((c) => c === "NADP⁺").length, 0);

const hasDiff = (step: PppStep, organ: string) =>
  step.organDiffs.some((d) => d.organ === organ);

const splitLines = (text: string, width: number): string[] => {
  const out: string[] = [];
  let line = "";
  for (const ch of text) {
    if (line.length >= width) {
      out.push(line);
      line = ch;
    } else line += ch;
  }
  if (line) out.push(line);
  return out;
};

export default function PppOverviewPage() {
  const params = useParams();
  const [search, setSearch] = useSearchParams();
  const pathwayId = params.pathwayId ?? "ppp";
  if (pathwayId !== "ppp") {
    return <div className="page">未知通路：{pathwayId}</div>;
  }

  const organParam = search.get("organ");
  const stepParam = search.get("step");
  const organ = organParam && ORGANS.some((o) => o.id === organParam) ? organParam : DEFAULT_ORGAN;
  const organName = ORGANS.find((o) => o.id === organ)?.name ?? organ;
  const selectedStepId = stepParam;
  const selectedStep = useMemo(
    () => (selectedStepId ? stepById(selectedStepId) ?? null : null),
    [selectedStepId]
  );

  /* 证据等级：唯一推导处是 evidenceGrade.ts，这里只读配置结果 */
  const cmpStep = useMemo(
    () => (selectedStep ? CMP?.steps.find((s) => s.stepId === selectedStep.id) ?? null : null),
    [selectedStep]
  );
  const blockGrade = useMemo(() => (cmpStep ? gradesForStep(cmpStep) : null), [cmpStep]);

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

  /* 自测模式：与其它挂图同机制 */
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

  /* 画布 1980 宽于 1440 视口 → Shift+滚轮横向漫游 */
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

  /* 点击委托：先用 q-hide 判定自测语义，再分别沿祖先链找步骤组 / 节点组。
     不使用 closest("[data-step-id], [data-node-id]") 联合选择器（历史坑）。 */
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

  /* 选中步相关实体（gap1 / gap2 按 entityId 同步点亮） */
  const relatedEntities = useMemo(() => {
    if (!selectedStep) return null;
    return new Set([...selectedStep.substrates, ...selectedStep.products]);
  }, [selectedStep]);

  const nodeClass = (n: { id: string; entityId?: string }) => {
    const cls = ["node"];
    if (selectedStep && relatedEntities) {
      cls.push(relatedEntities.has(n.entityId ?? n.id) ? "hl" : "faded");
    }
    return cls.join(" ");
  };
  const arrowClass = (stepId: string) => {
    const cls = ["stepg"];
    if (selectedStepId === stepId) cls.push("sel");
    else if (selectedStepId) cls.push("faded");
    return cls.join(" ");
  };

  /* 上一步 / 下一步（沿 8 步） */
  const navOf = (id: string | null) => {
    const i = id ? MAIN_IDS.indexOf(id) : -1;
    if (i === -1) {
      return { prev: null as string | null, next: MAIN_IDS[0], prevLabel: null as string | null, nextLabel: `${roman(1)} ${stepById(MAIN_IDS[0])?.name}` };
    }
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

  /* 器官差异表行：只列数据层真登记了 organDiffs 的步骤 */
  const diffRows = useMemo(
    () => data.steps.filter((s) => s.organDiffs.length > 0).map((s) => ({ step: s, label: `${roman(s.index)} ${s.enzyme.name}` })),
    []
  );

  /* 氧化相器官说明：逐字取自 ppp-o1 的 organDiffs（不编造） */
  const oxOrganNote = useMemo(() => {
    const s = stepById("ppp-o1");
    const d = s?.organDiffs.find((x) => x.organ === organ);
    return d?.text ?? null;
  }, [organ]);

  /* 能量账本：由 ppp.json 两相净账求和（1 G6P 口径） */
  const oxOut = data.oxidativeBalance.output;
  const nonOxOut = data.nonOxidativeBalance.output;

  const renderSeg = (seg: { d: string; kind: SegKind }, i: number) => {
    switch (seg.kind) {
      case "heavy":
        return <path key={i} className="arrow" d={seg.d} fill="none" stroke={INK} strokeWidth={1.6} markerEnd="url(#pp-ah-ink-heavy)" />;
      case "rev":
        return (
          <path
            key={i}
            className="arrow"
            d={seg.d}
            fill="none"
            stroke={INK}
            strokeWidth={1}
            markerStart="url(#pp-ah-open)"
            markerEnd="url(#pp-ah-open)"
          />
        );
      case "dashed":
        return <path key={i} className="arrow" d={seg.d} fill="none" stroke={INK} strokeWidth={1} strokeDasharray="4 3" markerEnd="url(#pp-ah-ink)" />;
    }
  };

  const renderStepLabel = (step: PppStep) => {
    const cfg = STEP_LABEL[step.id];
    if (!cfg) return null;
    return (
      <>
        <text x={cfg.x} y={cfg.y} fontSize={11.5} letterSpacing={1.5} textAnchor={cfg.anchor} className="q-hide st-name">
          <tspan className="st-no serif" fontSize={17} style={{ letterSpacing: 0 }}>{roman(step.index)}</tspan>
          {"  "}
          {STEP_SHORT[step.id] ?? step.enzyme.name}
        </text>
        {cfg.note && (
          <text x={cfg.x} y={cfg.y + 15} fontSize={9} textAnchor={cfg.anchor} opacity={0.55} fill={cfg.noteColor}>
            {cfg.note}
          </text>
        )}
      </>
    );
  };

  return (
    <div className="poster poster-ppp">
      {/* ===== 通路切换器（全站统一，替代原手写面包屑） ===== */}
      <PathwaySwitcher
        current="ppp"
        context={
          selectedStep ? (
            <>
              第 {roman(selectedStep.index)} 步 · {selectedStep.name}
            </>
          ) : undefined
        }
      />

      {/* ===== 报头 ===== */}
      <header className="masthead">
        <div className="mast-top">
          <span className="kicker">代谢通路挂图 · METABOLIC WALL CHART</span>
          <span className="plate-no num">PLATE 04 / 12 · 第一版 · 2026</span>
        </div>
        <div className="mast-main">
          <h1>
            {data.name}
            <small>PENTOSE PHOSPHATE PATHWAY — 与糖酵解并联的 G6P 出路</small>
          </h1>
          <p className="mast-summary">
            {data.summary} 氧化相 <b className="num">3</b> 步不可逆，产 <b className="num">2</b> NADPH +{" "}
            <b className="num">1</b> CO₂；非氧化相 <b className="num">5</b> 步可逆，把 3 个 C5 重排成{" "}
            <b className="num">2</b> F6P + <b className="num">1</b> GAP。
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
          可逆反应
        </span>
        <span className="lg">
          <svg width="46" height="10" aria-hidden>
            <line x1="0" y1="5" x2="46" y2="5" stroke={INK} strokeDasharray="4 3" />
          </svg>
          CO₂ 逸出 / 接口
        </span>
        <span className="lg">
          <svg width="14" height="14" aria-hidden>
            <line x1="7" y1="0" x2="7" y2="14" stroke={TEAL} strokeWidth={1.4} />
          </svg>
          青垂线 = NADPH 还原当量
        </span>
        <span className="lg">
          <svg width="40" height="14" aria-hidden>
            <path d="M2,11 Q20,-2 38,11" fill="none" stroke={INK} />
            <text x="20" y="9" fontSize="8" textAnchor="middle" fontWeight="700" fill={INK}>C2</text>
          </svg>
          弧线 = 碳单位转移（C2 / C3）
        </span>
        <span className="lg">
          <svg width="26" height="14" aria-hidden>
            <circle cx="13" cy="7" r="6" fill="none" stroke={INK} strokeDasharray="2 2" />
          </svg>
          虚线圆 = 糖酵解接口投影（不重复画本体）
        </span>
        <span className="lg">
          <span style={{ color: BRICK, fontWeight: 700 }}>Δ</span>&nbsp;器官差异标记（详见表 1）
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
            <span className="t">图 1 · 氧化相 3 步 + 非氧化相 5 步 · 与糖酵解三处接口</span>
            <PlateInteraction svgRef={plateSvgRef} pathwayId="ppp" />
            <span className="organ-switch" role="tablist" aria-label="器官视图切换">
              视图
              {ORGANS.map((o) => (
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
                width={skel.canvas.width}
                height={skel.canvas.height}
                viewBox={`0 0 ${skel.canvas.width} ${skel.canvas.height}`}
                onClick={onPlateClick}
                data-ppp-plate="1"
              >
                <defs>
                  <marker id="pp-ah-ink" markerWidth="9" markerHeight="8" refX="8" refY="4" orient="auto">
                    <path d="M0,0.5 L8.5,4 L0,7.5 Z" fill={INK} />
                  </marker>
                  <marker id="pp-ah-teal" markerWidth="9" markerHeight="8" refX="8" refY="4" orient="auto">
                    <path d="M0,0.5 L8.5,4 L0,7.5 Z" fill={TEAL} />
                  </marker>
                  <marker id="pp-ah-ink-heavy" markerWidth="10" markerHeight="9" refX="9" refY="4.5" orient="auto">
                    <path d="M0,0.5 L9.5,4.5 L0,8.5 Z" fill={INK} />
                  </marker>
                  <marker id="pp-ah-open" markerWidth="9" markerHeight="8" refX="8" refY="4" orient="auto-start-reverse">
                    <path d="M0,0.5 L8.5,4 L0,7.5" fill="none" stroke={INK} />
                  </marker>
                </defs>

                {/* 角落十字锚点 */}
                <g stroke={INK} strokeWidth={1} opacity={0.5}>
                  <path d="M20,12 V28 M12,20 H28" />
                  <path d="M1960,12 V28 M1952,20 H1968" />
                  <path d="M20,652 V668 M12,660 H28" />
                  <path d="M1960,652 V668 M1952,660 H1968" />
                </g>

                {/* 隔室括线（单泳道） */}
                <path d="M46,64 V56 H1934 V64" fill="none" stroke={INK} strokeWidth={1} />
                <text x={46} y={44} fontSize={11} letterSpacing={4} fontWeight={700}>细胞质 · CYTOSOL</text>
                <text x={1934} y={44} fontSize={9.5} textAnchor="end" opacity={0.55}>单隔室 · 七步酶全部可溶胞质酶，无跨膜环节</text>

                {/* 两相区带 */}
                <g>
                  <rect x={36} y={88} width={744} height={400} fill="rgba(34,40,42,0.035)" data-phase-block="oxidative" />
                  <rect x={800} y={88} width={1140} height={452} fill="rgba(34,40,42,0.04)" data-phase-block="non-oxidative" />
                  <line x1={795} y1={88} x2={795} y2={540} stroke={INK} strokeWidth={1} opacity={0.35} />
                  <text x={48} y={78} fontSize={10.5} letterSpacing={3} fontWeight={700} opacity={0.75}>氧化相 · OXIDATIVE（不可逆 · 产还原力）</text>
                  <text x={812} y={78} fontSize={10.5} letterSpacing={3} fontWeight={700} opacity={0.75}>非氧化相 · NON-OXIDATIVE（可逆 · 碳骨架重排）</text>
                </g>

                {/* ===== 糖酵解接口：左右各半条线 ===== */}
                <g opacity={0.85}>
                  <line x1={0} y1={340} x2={40} y2={340} stroke={INK} strokeWidth={1} strokeDasharray="4 3" markerEnd="url(#pp-ah-ink)" />
                  <text x={6} y={392} fontSize={9} opacity={0.65}>← 来自糖酵解第 2 步</text>
                  <line x1={1900} y1={340} x2={1978} y2={340} stroke={INK} strokeWidth={1} strokeDasharray="4 3" markerEnd="url(#pp-ah-ink)" />
                  <text x={1974} y={366} fontSize={9} textAnchor="end" opacity={0.65}>回流第 3 步 →</text>
                  <line x1={1900} y1={515} x2={1978} y2={515} stroke={INK} strokeWidth={1} strokeDasharray="4 3" markerEnd="url(#pp-ah-ink)" />
                  <text x={1974} y={540} fontSize={9} textAnchor="end" opacity={0.65}>回流第 5 步 →</text>
                </g>

                {/* ===== 步骤组：每个 id 一个 g[data-step-id] ===== */}
                {MAIN_IDS.map((id) => {
                  const step = stepById(id);
                  if (!step) return null;
                  return (
                    <g
                      key={id}
                      className={arrowClass(id)}
                      data-step-id={id}
                      data-phase={step.phase}
                      data-irreversible={step.irreversible ? "1" : "0"}
                      style={{ cursor: "pointer" }}
                    >
                      {(GEOS[id] ?? []).map((seg, i) => renderSeg(seg, i))}
                      {TRANSFER_ARCS.filter((t) => t.stepId === id).map((t) => (
                        <g key={`tr-${t.carbons}`} data-carbon-transfer={t.carbons}>
                          <path d={t.d} fill="none" stroke={INK} strokeWidth={1.2} markerEnd="url(#pp-ah-ink)" opacity={0.9} />
                          <text x={t.x} y={t.y} fontSize={12} fontWeight={700} textAnchor={t.anchor}>
                            <tspan className="serif" fontSize={14}>{t.label}</tspan>
                            <tspan opacity={0.65} fontSize={9}>{"  "}{t.sub}</tspan>
                          </text>
                        </g>
                      ))}
                      {renderStepLabel(step)}
                    </g>
                  );
                })}

                {/* ===== 氧化相 NADPH 垂线（逐列能量账的图上锚点） ===== */}
                <g>
                  {OX_LEDGER.filter((c) => c.nadph > 0).map((c) => (
                    <g key={c.stepId} data-nadph-column={c.no}>
                      <line x1={c.x} y1={300} x2={c.x} y2={252} stroke={TEAL} strokeWidth={1.2} markerEnd="url(#pp-ah-teal)" />
                      <text x={c.x + 8} y={272} fontSize={10.5} fill={TEAL} fontWeight={700} className="num">NADPH +1</text>
                    </g>
                  ))}
                  <line x1={630} y1={300} x2={630} y2={252} stroke={TEAL} strokeWidth={1.2} opacity={0} />
                </g>

                {/* ===== 节点：interface 投影 + 代谢物 ===== */}
                <g fontSize={13} fontWeight={700} textAnchor="middle">
                  {skel.nodes.map((n) => {
                    const p = posOf(n.id);
                    const isInterface = n.kind === "interface";
                    const lb = NODE_LABEL_POS[n.id];
                    const isGapPool = n.id === "gap1";
                    const abbr = n.entityId ? abbrOf(n.entityId) : n.id;
                    return (
                      <g
                        key={n.id}
                        className={nodeClass(n)}
                        data-node-id={n.id}
                        data-interface={isInterface ? "1" : undefined}
                        style={{ cursor: "pointer" }}
                      >
                        {isInterface ? (
                          <circle cx={p.x} cy={p.y} r={13} fill="none" stroke={INK} strokeWidth={1} strokeDasharray="2.5 2.5" />
                        ) : (
                          <circle
                            cx={p.x}
                            cy={p.y}
                            r={22}
                            fill={PAPER}
                            stroke={INK}
                            strokeWidth={1.2}
                            strokeDasharray={isGapPool ? "3 3" : undefined}
                          />
                        )}
                        {isInterface ? (
                          <>
                            <text x={p.x} y={p.y - 20} fontSize={8.5} fontWeight={700} opacity={0.8}>
                              {n.label.split(" · ")[0]}
                            </text>
                            <text x={p.x} y={p.y + 4} fontSize={8.5} fontWeight={700}>{n.label.split(" · ")[1]}</text>
                            <text x={p.x} y={p.y + 26} fontSize={8.5} fontWeight={400} opacity={0.6}>
                              {n.id === "if-in-g6p" ? "分流" : "汇入"}
                            </text>
                          </>
                        ) : (
                          <>
                            <text className="q-hide" x={p.x} y={p.y + 5} fontSize={13}>{abbr}</text>
                            {NODE_CARBONS[n.id] && (
                              <text x={p.x + 26} y={p.y - 20} fontSize={8.5} fontWeight={400} opacity={0.55} textAnchor="start">
                                {NODE_CARBONS[n.id]}
                              </text>
                            )}
                            {lb && (
                              <text className="q-hide" x={p.x + lb.dx} y={p.y + lb.dy} fontSize={10.5} fontWeight={400} textAnchor={lb.anchor}>
                                {n.label}
                              </text>
                            )}
                          </>
                        )}
                      </g>
                    );
                  })}
                </g>

                {/* ===== 氧化相逐列能量账 ===== */}
                <g>
                  <line x1={40} y1={500} x2={782} y2={500} stroke={INK} strokeWidth={1.4} />
                  <text x={48} y={524} fontSize={11.5} letterSpacing={4} fontWeight={700}>氧化相账本 · OXIDATIVE LEDGER</text>
                  <text x={774} y={524} fontSize={14} textAnchor="end" fontWeight={700} className="serif num">
                    结算：<tspan fill={TEAL}>+2 NADPH</tspan> · CO₂ +1 · ATP 0
                  </text>
                  {OX_LEDGER.map((c) => (
                    <g key={c.stepId} textAnchor="middle">
                      <text className="serif" x={c.x} y={552} fontSize={13}>{c.no}</text>
                      {c.nadph > 0 ? (
                        <rect x={c.x - 5.5} y={562} width={11} height={11} fill={TEAL} />
                      ) : (
                        <line x1={c.x - 8} y1={567.5} x2={c.x + 8} y2={567.5} stroke={INK} strokeWidth={1} opacity={0.4} />
                      )}
                      <text x={c.x} y={596} fontSize={15} fontWeight={700} className="num" fill={c.nadph > 0 ? TEAL : INK}>
                        {c.nadph > 0 ? "+1 NADPH" : "—"}
                      </text>
                      {c.co2 && (
                        <text x={c.x} y={614} fontSize={10} opacity={0.75} className="num">C1 → CO₂</text>
                      )}
                      <text x={c.x} y={630} fontSize={9.5} opacity={0.55}>{c.sum}</text>
                    </g>
                  ))}
                  <text x={48} y={654} fontSize={9.5} opacity={0.6}>
                    按每 1 G6P 计 · 方块 = 1 NADPH · NADPH 是还原力，不是 ATP；NADP⁺/NADPH 比值是氧化相节流阀
                  </text>
                </g>

                {/* ===== 非氧化相净账 ===== */}
                <g>
                  <line x1={800} y1={580} x2={1934} y2={580} stroke={INK} strokeWidth={1} />
                  <text x={812} y={604} fontSize={11.5} letterSpacing={3} fontWeight={700}>非氧化相净账 · NET REARRANGEMENT</text>
                  <text x={1934} y={604} fontSize={14} textAnchor="end" fontWeight={700} className="serif num">
                    3 × <tspan fill={INK}>C5</tspan> ＝ 2 × <tspan fill={INK}>C6</tspan> ＋ 1 × <tspan fill={INK}>C3</tspan>
                  </text>
                  <text x={812} y={628} fontSize={10} opacity={0.7} className="num">
                    3 Ru5P（15C）→ 2 F6P + 1 GAP（15C）· 碳守恒，净减 0
                  </text>
                  <text x={1934} y={628} fontSize={9.5} textAnchor="end" opacity={0.55}>
                    Ⅵ / Ⅷ 为同一 TKT 的两段接力，编号连续不重复 · 图内不设第 9 步
                  </text>
                  <text x={812} y={656} fontSize={9.5} opacity={0.55}>
                    数据层口径：N1 / N2 两步异构各跑 3 次（池换手），TK(2C)–TA(3C)–TK(2C) 按 1:1:1 计
                  </text>
                </g>

                {/* ===== 器官差异：只显示数据层真登记的文本 ===== */}
                <g data-organ-note={organ}>
                  {oxOrganNote ? (
                    <>
                      <text x={48} y={446} fontSize={10.5} fill={BRICK} fontWeight={700}>
                        Δ {organName} · 氧化相{organ === "rbc" ? "（G6PD → NADPH）" : ""}
                      </text>
                      {splitLines(oxOrganNote, 44).slice(0, 4).map((ln, i) => (
                        <text key={i} x={48} y={460 + i * 11} fontSize={8.5} opacity={0.72}>{ln}</text>
                      ))}
                    </>
                  ) : (
                    <text x={48} y={462} fontSize={9.5} opacity={0.45}>本器官视图无氧化相差异登记</text>
                  )}
                </g>

                {/* 底部延伸 */}
                <g opacity={0.55}>
                  <text x={1934} y={674} fontSize={9.5} textAnchor="end">下游：R5P → 核苷酸从头合成 ／ E4P → 芳香族氨基酸（动物中去向有限）</text>
                </g>
              </svg>
            </div>
          </div>

          {/* ===== 脚注：空间说明 + 表 1 ===== */}
          <div className="footnote">
            <div className="fn-head">
              <span className="t">空间读法 · SPATIAL NOTE</span>
            </div>
            <p style={{ fontSize: 12, lineHeight: 1.9, margin: "0 0 18px" }}>{skel.spatialNote}</p>

            <div className="fn-head">
              <span className="t">表 1 · 组织差异（仅数据层已登记项）</span>
              <span className="view">硫酸纸视图 · {organName}</span>
            </div>
            <table className="organs" data-organ-table="1">
              <thead>
                <tr>
                  <th style={{ width: 190 }}>步骤</th>
                  {ORGANS.map((o) => (
                    <th key={o.id} className={o.id === organ ? "cur" : ""}>{o.name}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {diffRows.map(({ step, label }) => (
                  <tr
                    key={step.id}
                    data-plate-row={step.id}
                    style={{ cursor: "pointer" }}
                    onClick={() => selectStep(step.id === selectedStepId ? null : step.id)}
                  >
                    <td className="stepcell">
                      {hasDiff(step, organ) && <span className="dm">Δ</span>}
                      {label}
                    </td>
                    {ORGANS.map((o) => {
                      const d = step.organDiffs.find((x) => x.organ === o.id);
                      return (
                        <td key={o.id} className={o.id === organ ? "cur" : ""}>
                          {d ? d.text : "—（本步未登记该器官差异）"}
                        </td>
                      );
                    })}
                  </tr>
                ))}
                <tr>
                  <td className="stepcell">其余各步</td>
                  {ORGANS.map((o) => (
                    <td key={o.id} className={o.id === organ ? "cur" : ""}>
                      本页数据层未登记器官差异（灰字说明，不编造）。
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
            <div style={{ fontSize: 10.5, opacity: 0.6, marginTop: 6 }}>
              数据层 organDiffs 只覆盖肝与红细胞；肌肉等其它器官未登记，故不提供该视图，也不编造差异。
            </div>
          </div>
        </div>

        {/* ===== 右栏 ===== */}
        <aside>
          <div className="panel-block">
            <div className="pb-title">
              <span>详情栏</span>
              <span className="en">DETAIL · 点击图上任一步骤</span>
            </div>
            {selectedStep ? (
              <div className="d-body">
                <div className="d-step">
                  <span className="no serif num">{roman(selectedStep.index)}</span>
                  {selectedStep.name}
                  {selectedStep.irreversible && <span className="d-tag">不可逆</span>}
                  <span className="d-tag amber">{selectedStep.phase === "oxidative" ? "氧化相" : "非氧化相"}</span>
                </div>
                <div className="d-enzyme">
                  {selectedStep.enzyme.name}
                  {selectedStep.enzyme.isozyme && <span className="d-iso"> — {selectedStep.enzyme.isozyme}</span>}
                </div>
                <div className="d-eq">{selectedStep.equation}</div>
                <div className="d-cof">
                  <b>底物</b>　{selectedStep.substrates.map(nameOf).join(" + ")}
                </div>
                <div className="d-cof">
                  <b>产物</b>　{selectedStep.products.map(nameOf).join(" + ")}
                </div>
                <div className="d-cof">
                  <b>辅因子</b>　{selectedStep.cofactors.length ? selectedStep.cofactors.join("、") : "—"}
                </div>
                {selectedStep.ecNumber && (
                  <div className="d-cof num"><b>EC</b>　{selectedStep.ecNumber}</div>
                )}
                {/* ΔG：数值不作页面展示，只保留定性判断 */}
                <div className="d-cof" data-dg="1">
                  <b>ΔG</b>
                  <span style={{ opacity: 0.55 }}>　定性：{selectedStep.deltaG.qualitative ?? "—"}</span>
                </div>
                {selectedStep.carbonBookkeeping && (
                  <div className="d-cof num">
                    <b>碳账</b>　底物 {selectedStep.carbonBookkeeping.substrateCarbons}C → 主链{" "}
                    {selectedStep.carbonBookkeeping.mainChainProductCarbons}C
                    <span style={{ opacity: 0.6 }}>（{selectedStep.carbonBookkeeping.note}）</span>
                  </div>
                )}
                <div className="d-sig">{selectedStep.significance}</div>

                {/* 基团转移：数据层 groupTransfer 驱动 */}
                {selectedStep.groupTransfer && (
                  <div className="d-transfer" data-group-transfer={selectedStep.groupTransfer.carbonsTransferred}>
                    <b>基团转移</b>　
                    <span className="num">C{selectedStep.groupTransfer.carbonsTransferred}</span> ·{" "}
                    {selectedStep.groupTransfer.group}
                    <br />
                    供体 {nameOf(selectedStep.groupTransfer.donor)} −{" "}
                    <span className="num">{selectedStep.groupTransfer.carbonsTransferred}C</span> →{" "}
                    {nameOf(selectedStep.groupTransfer.donorRemainder)}
                    <br />
                    受体 {nameOf(selectedStep.groupTransfer.acceptor)} +{" "}
                    <span className="num">{selectedStep.groupTransfer.carbonsTransferred}C</span> →{" "}
                    {nameOf(selectedStep.groupTransfer.acceptorProduct)}
                  </div>
                )}

                {/* 证据等级：唯一推导处是 evidenceGrade.ts */}
                <div className="d-evidence" data-testid="ppp-evidence-grade">
                  <span className="lbl">证据等级</span>
                  {blockGrade?.grade ? (
                    <span className={`g-label ${blockGrade.grade.toLowerCase()}`}>
                      {GRADE_LABEL[blockGrade.grade]}
                    </span>
                  ) : (
                    <span className="g-label none">未分级（仅计算构象 / 仅 2D）</span>
                  )}
                  <div className="g-note">
                    {blockGrade
                      ? [
                          blockGrade.calc ? "含计算构象" : null,
                          blockGrade.only2d ? "含仅 2D 分子" : null,
                          blockGrade.sidesDiffer ? "底物/产物等级不一致" : null,
                          blockGrade.ungraded.length ? `未分级项 ${blockGrade.ungraded.length}` : null,
                        ]
                          .filter(Boolean)
                          .join(" · ") || "两侧均为实验坐标"
                      : "本步不在结构对照配置内"}
                    <br />
                    分级口径：A 本酶人源 / B 本酶跨种 / C 人源非本酶 / D 跨种非本酶；计算构象与仅 2D 不计入 A–D。
                  </div>
                </div>

                {/* 结构对照入口：全部 8 步由配置反查，不手写名单 */}
                {CMP_STEP_IDS.has(selectedStep.id) ? (
                  <Link
                    className="frames-entry"
                    data-testid="ppp-structure-cmp-entry"
                    data-cmp-step={selectedStep.id}
                    to={`/structures/ppp#${selectedStep.id}`}
                  >
                    看这一步的结构对照 →
                  </Link>
                ) : (
                  <span className="frames-entry-none" data-testid="ppp-structure-cmp-none" aria-disabled="true">
                    结构对照尚未接入
                  </span>
                )}

                {/* 器官差异：有则显示；无则灰字说明「本步无器官差异」 */}
                {hasDiff(selectedStep, organ) ? (
                  <div className="d-organ">
                    <span className="lbl">Δ {organName}差异</span>
                    {selectedStep.organDiffs.find((d) => d.organ === organ)?.text}
                  </div>
                ) : selectedStep.organDiffs.length ? (
                  <div className="d-none">
                    本步差异在其它组织（
                    {selectedStep.organDiffs
                      .map((d) => ORGAN_NAMES[d.organ] ?? d.organ)
                      .join("、")}
                    ）——切换视图可见。
                  </div>
                ) : (
                  <div className="d-none" data-no-organ-diff="1">
                    本步无器官差异（数据层未登记该步的 organDiffs）。
                  </div>
                )}

                {selectedStep.misconceptions?.length ? (
                  <div className="d-mis">
                    <span className="lbl">常见误解</span>
                    <ul>
                      {selectedStep.misconceptions.slice(0, 2).map((m, i) => (
                        <li key={i}>{m}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}
                {selectedStep.clinical?.length ? (
                  <div className="d-mis">
                    <span className="lbl">临床关联</span>
                    <ul>
                      {selectedStep.clinical.map((c, i) => (
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

                {/* 3D 一律占位：数据层 threeD.status === pending，不伪造资产路径 */}
                <div className="d-none" data-3d-placeholder="1">
                  3D 结合视图：待结构核验——
                  {selectedStep.threeD?.note ?? "本步未登记 PDB 候选，资产未制作。"}
                </div>
              </div>
            ) : (
              <div className="d-body">
                <div className="d-placeholder">
                  点击图上的步骤箭头、酶名、碳单位转移弧或代谢物节点，此处显示该步的反应式、酶与 EC、
                  ΔG（仅保留定性标注，不展示数值）、意义、碳账、证据等级与结构对照入口。
                  左右虚线圆是糖酵解接口投影（G6P 入、F6P / GAP 出）。
                </div>
              </div>
            )}
          </div>

          <div className="panel-block">
            <div className="pb-title">
              <span>能量账本</span>
              <span className="en">ENERGY LEDGER · 每生成 1 Ru5P</span>
            </div>
            <div className="settle" data-ledger="1">
              <div>
                <div className="s-lbl">NADPH</div>
                <div className="s-val t num">+{NADPH_TOTAL}</div>
                <div className="s-sub num">氧化相 Ⅰ + Ⅲ（各 1）</div>
              </div>
              <div>
                <div className="s-lbl">CO₂</div>
                <div className="s-val num">+{oxOut.co2 ?? 1}</div>
                <div className="s-sub num">第 Ⅲ 步脱羧 · G6P 的 C1</div>
              </div>
              <div>
                <div className="s-lbl">ATP</div>
                <div className="s-val num">0</div>
                <div className="s-sub num">本通路不产能</div>
              </div>
              <div>
                <div className="s-lbl">非氧化相</div>
                <div className="s-val num">3 → 2 + 1</div>
                <div className="s-sub num">3 C5 → 2 C6 + 1 C3</div>
              </div>
              <div className="settle-rule" />
              <div className="settle-net" data-settlement="1">
                <span className="n-lbl">每 3 G6P · 净得</span>
                <span className="n-val num">
                  <span className="t">+6 NADPH</span> · +3 CO₂ ·{" "}
                  <span>{nonOxOut.f6p ?? 2} F6P + {nonOxOut.g3p ?? 1} GAP</span>
                </span>
              </div>
            </div>
            <div className="d-none" style={{ borderTop: "none", paddingTop: 0 }}>
              {data.oxidativeBalance.note} {data.nonOxidativeBalance.note}
            </div>
          </div>

          <div className="panel-block">
            <div className="pb-title">
              <span>两相净账</span>
              <span className="en">PHASE BALANCE</span>
            </div>
            <div className="d-cof num">
              <b>氧化相</b>　{data.oxidativeBalance.input.g6p} G6P → {data.oxidativeBalance.output.ru5p} Ru5P +{" "}
              {data.oxidativeBalance.output.co2} CO₂ + 2 NADPH
            </div>
            <div className="d-cof num">
              <b>非氧化相</b>　{data.nonOxidativeBalance.input.ru5p} Ru5P → {data.nonOxidativeBalance.output.f6p} F6P +{" "}
              {data.nonOxidativeBalance.output.g3p} GAP
            </div>
            <div className="d-none" style={{ borderTop: "none", paddingTop: 0 }}>
              两相净账由 ppp.json 的 oxidativeBalance / nonOxidativeBalance 直接读取；ΔG 数值不作页面展示，只保留定性标注，3D 按缺口如实标注。
            </div>
          </div>
        </aside>
      </div>

      <PathwayRailFoot current="ppp" />
      <div className="poster-foot">
        <span>待确认：ΔG 数值不作页面展示，仅保留 Lehninger 8e Ch.14 定性结论。<br /></span>
        <span>待确认：3D 结合视图整轮占位——数据层 threeD.status=pending，仅登记 PDB 候选（G6PD 7SNI、RPE 3OVQ/3OVP 等），无资产路径。<br /></span>
        <span>待确认：人源缺口——6PGL 无结构、RPIA 人源未检索到结构（2VVP 为结核 RpiB，跨种且跨家族）；照实标注，不硬凑。<br /></span>
        <span>待确认：organDiffs 仅登记肝与红细胞；肌肉等其它器官未登记，页面不提供该视图。<br /></span>
      </div>
    </div>
  );
}
