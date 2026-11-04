// 代谢图谱挂图（B 方案 · poster）：整页一张编号挂图。
// 数据仍以 glycolysis.json / skeleton.json 为唯一事实源，本组件只做版式呈现；
// 器官切换不重排图面，仅让 Δ 差异标签浮现；URL（organ/step）与点击交互沿用旧约定。
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { MouseEvent as ReactMouseEvent, ReactNode } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { entities, pathway, TODO_NOTES } from "../data/glycolysis";
import { loadStepManifest, resolveStepAsset, stepAssets } from "../data/stepAssets";
import { FRAME_SEQUENCES, framesForStep } from "../data/structureFrames";
import type { OrganId, Step } from "../data/types";
import EmbeddedStepViewer from "../components/EmbeddedStepViewer";
import "../styles/frames-entry.css";

/* ---------- 挂图配色（封顶四色 + 砖红） ---------- */
const INK = "#22282A";
const AMBER = "#B4761F";
const TEAL = "#2E6E6B";
const BRICK = "#9C4A3C";
const PAPER = "#F6F3EC";

/* ---------- 版面几何（画布 1760 × 750，主链基线 y=210） ---------- */
const NODE_X: Record<string, number> = {
  glc: 100, g6p: 270, f6p: 440, fbp: 610, g3p: 790,
  "13bpg": 960, "3pg": 1130, "2pg": 1300, pep: 1470, pyr: 1640,
};
const BASE_Y = 210;
const R = 26; // 主链节点半径

/* 主链横箭头：由 skeleton.links 驱动（gk-5 为垂直箭头，单独手绘） */
interface ChainArrow {
  stepId: string;
  x1: number;
  x2: number;
  y: number;
}
const chainArrows: ChainArrow[] = pathway.skeleton.links.map((l) => ({
  stepId: l.stepId,
  x1: NODE_X[l.from] + 30,
  x2: NODE_X[l.to] - 32,
  y: BASE_Y,
}));

const stepById = (id: string): Step | undefined =>
  pathway.steps.find((s) => s.id === id) ?? pathway.sideBranchSteps?.find((s) => s.id === id);

/* 每步的注脚小字（9px 层级） */
const STEP_NOTES: Record<string, string> = {
  "gk-1": "不可逆",
  "gk-3": "限速 · 不可逆",
  "gk-4": "六碳一拆二 · DHAP 走支路",
  "gk-6": "氧化与磷酸化偶联",
  "gk-7": "第一次底物水平磷酸化",
  "gk-9": "Mg²⁺",
  "gk-10": "不可逆 · 第二次底物水平磷酸化",
};

/* 右栏详情标签（琥珀/青加粗层级） */
const STEP_TAGS: Record<string, string> = {
  "gk-1": "ATP −1",
  "gk-3": "ATP −1 · 限速",
  "gk-6": "+NADH ×2",
  "gk-7": "+ATP ×2",
  "gk-10": "+ATP ×2",
};

/* 能量账本列：与主链能量转移垂线逐列对齐 */
const LEDGER = [
  { step: "Ⅰ", x: 184, kind: "out", count: 1, val: "ATP −1", cum: "ATP 累计 −1", color: AMBER },
  { step: "Ⅲ", x: 524, kind: "out", count: 1, val: "ATP −1", cum: "ATP 累计 −2", color: AMBER },
  { step: "Ⅵ", x: 874, kind: "teal", count: 2, val: "NADH +2", cum: "NADH 累计 +2", color: TEAL },
  { step: "Ⅶ", x: 1044, kind: "in", count: 2, val: "ATP +2", cum: "ATP 累计 0", color: AMBER },
  { step: "Ⅹ", x: 1554, kind: "in", count: 2, val: "ATP +2", cum: "ATP 累计 +2", color: AMBER },
] as const;

const hasDiff = (step: Step, organ: OrganId) => step.organDiffs.some((d) => d.organ === organ);

/** 自由能排版：负号用全角减号，固定一位小数 */
const fmtDG = (v: number) => v.toFixed(1).replace("-", "−");

export default function PathwayOverviewPage() {
  const params = useParams();
  const [search, setSearch] = useSearchParams();
  const pathwayId = params.pathwayId ?? "glycolysis";
  if (pathwayId !== pathway.id) {
    return <div className="page">未知通路：{pathwayId}</div>;
  }

  const organParam = search.get("organ");
  const stepParam = search.get("step");
  const organ: OrganId =
    organParam && pathway.organs.some((o) => o.id === organParam) ? (organParam as OrganId) : "liver";
  const organName = pathway.organs.find((o) => o.id === organ)?.name ?? "肝";
  const selectedStepId = stepParam;
  const selectedStep = useMemo(
    () => (selectedStepId ? stepById(selectedStepId) ?? null : null),
    [selectedStepId]
  );

  /* 资产注册表：manifest.json（异步、权威）合并到本地兜底表之上；失败时仅用兜底表 */
  const [assetReg, setAssetReg] = useState(stepAssets);
  useEffect(() => {
    let cancelled = false;
    void loadStepManifest().then((manifest) => {
      if (cancelled || Object.keys(manifest).length === 0) return;
      setAssetReg({ ...stepAssets, ...manifest });
    });
    return () => {
      cancelled = true;
    };
  }, []);
  const selectedCfg = useMemo(
    () => (selectedStepId ? resolveStepAsset(selectedStepId, assetReg)?.cfg ?? null : null),
    [selectedStepId, assetReg]
  );

  /* 器官变体档案（gk-1-liver / gk-10-muscle）：不进主链 10 步，仅在右栏提供切换，图面不重排 */
  const VARIANTS: Record<string, { id: string; main: string; variant: string }> = {
    "gk-1": { id: "gk-1-liver", main: "主档案 · HK1", variant: "肝变体 · 葡糖激酶 GCK" },
    "gk-10": { id: "gk-10-muscle", main: "主档案 · PKL（肝型）", variant: "肌变体 · PKM2" },
  };
  const [variantOn, setVariantOn] = useState(false);
  useEffect(() => {
    setVariantOn(false); // 切步骤时回到主档案
  }, [selectedStepId]);
  const variantMeta = selectedStepId ? VARIANTS[selectedStepId] : undefined;
  const variantAvailable = !!(variantMeta && assetReg[variantMeta.id]);
  const activeCfg = variantOn && variantMeta ? assetReg[variantMeta.id] : selectedCfg;
  const active3dId = variantOn && variantMeta ? variantMeta.id : (selectedStep?.id ?? "");

  /* 结构帧入口：该步首帧（gk-1 / gk-2 已接入；无帧步骤走灰字声明态） */
  const frameSeq = FRAME_SEQUENCES[pathwayId];
  const stepFrames = useMemo(
    () => (selectedStep && frameSeq ? framesForStep(frameSeq, selectedStep.id) : []),
    [selectedStep, frameSeq]
  );

  /* 自测模式：隐藏酶名与代谢物名，悬停/点击揭晓；退出恢复 */
  const [quizOn, setQuizOn] = useState(false);
  const plateSvgRef = useRef<SVGSVGElement>(null);
  const toggleQuiz = useCallback(() => {
    setQuizOn((v) => {
      if (v) {
        // 退出自测：清掉所有"已揭晓"标记
        plateSvgRef.current?.querySelectorAll(".q-hide.revealed").forEach((el) => el.classList.remove("revealed"));
      }
      return !v;
    });
  }, []);

  /* 挂图画布引用：Shift+滚轮 / 横向滚轮 → 横向漫游 */
  const scrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (e.shiftKey && Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
        el.scrollLeft += e.deltaY;
        e.preventDefault();
      }
      // 原生横向滚轮（deltaX）浏览器自行处理，不拦截
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

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
    (id: OrganId) => {
      const next = new URLSearchParams(search);
      next.set("organ", id);
      setSearch(next, { replace: true });
    },
    [search, setSearch]
  );

  /* 挂图点击委托：自测揭晓 / 步骤组 / 代谢物节点
     根因修复：旧写法 closest("[data-step-id], .node, .q-hide") 在选择器列表里
     按"离点击元素最近者"返回——点中 q-hide 文本（酶名 / 代谢物缩略名）时命中的
     是文本自身，其祖先 g[data-step-id] / g[data-node-id] 被跳过，data-* 读到
     null → 静默 no-op。现按意图分开解析：先判定"是否点中隐藏名"（自测语义），
     再沿祖先链找步骤组 / 节点组。 */
  const onPlateClick = useCallback(
    (e: ReactMouseEvent<SVGSVGElement>) => {
      const el = e.target as Element;
      // 自测模式：点中被隐藏的名字 → 揭晓/收起，不改选步骤
      if (quizOn) {
        const qEl = el.closest(".q-hide");
        if (qEl) {
          qEl.classList.toggle("revealed");
          return;
        }
      }
      const stepEl = el.closest("[data-step-id]");
      const stepId = stepEl?.getAttribute("data-step-id");
      if (stepId) {
        selectStep(stepId === selectedStepId ? null : stepId);
        return;
      }
      const nodeId = el.closest("[data-node-id]")?.getAttribute("data-node-id");
      if (nodeId) {
        const step =
          pathway.steps.find((s) => s.products.includes(nodeId) && s.index !== null) ??
          pathway.steps.find((s) => s.substrates.includes(nodeId)) ??
          (pathway.sideBranchSteps ?? []).find((s) => s.products.includes(nodeId));
        if (step) selectStep(step.id === selectedStepId ? null : step.id);
      }
    },
    [selectedStepId, selectStep, quizOn]
  );

  const entityMap = useMemo(() => {
    const map = new Map<string, { name: string; abbr?: string }>();
    for (const e of entities) map.set(e.id, { name: e.name, abbr: e.abbr });
    return map;
  }, []);
  const abbrOf = (id: string) => entityMap.get(id)?.abbr ?? id;
  const nameOf = (id: string) => entityMap.get(id)?.name ?? id;

  /* 选中步骤相关的节点集合（点亮，其余置灰） */
  const relatedNodes = useMemo(() => {
    if (!selectedStep) return null;
    return new Set([...selectedStep.substrates, ...selectedStep.products]);
  }, [selectedStep]);

  /* 表 1 行：有器官差异的主链步骤 + 支路 */
  const diffRows = useMemo(() => {
    const rows: { step: Step; label: string }[] = [];
    for (const s of pathway.steps) {
      if (s.organDiffs.length > 0 && s.index !== null) {
        rows.push({ step: s, label: `${["Ⅰ","Ⅱ","Ⅲ","Ⅳ","Ⅴ","Ⅵ","Ⅶ","Ⅷ","Ⅸ","Ⅹ"][s.index - 1]} ${s.enzyme.name}` });
      }
    }
    for (const s of pathway.sideBranchSteps ?? []) rows.push({ step: s, label: `支路 ${s.enzyme.name}` });
    return rows;
  }, []);

  const nodeClass = (id: string) => {
    const cls = ["node"];
    if (selectedStep) {
      if (relatedNodes?.has(id)) cls.push("hl");
      else cls.push("faded");
    }
    return cls.join(" ");
  };

  const arrowClass = (stepId: string) => {
    const cls = ["stepg"];
    if (selectedStepId === stepId) cls.push("sel");
    else if (selectedStepId) cls.push("faded");
    return cls.join(" ");
  };

  const roman = (idx: number | null) =>
    idx === null ? "支" : ["Ⅰ","Ⅱ","Ⅲ","Ⅳ","Ⅴ","Ⅵ","Ⅶ","Ⅷ","Ⅸ","Ⅹ"][idx - 1];

  /* ---------- 每步的能量转移垂线（箭头类型学的落点） ---------- */
  const energyVerticals = (stepId: string): ReactNode => {
    switch (stepId) {
      case "gk-1":
      case "gk-3": {
        const x = stepId === "gk-1" ? 184 : 524;
        return (
          <g>
            <line x1={x} y1={150} x2={x} y2={198} stroke={AMBER} strokeWidth={1.2} markerEnd="url(#ah-amber)" />
            <text x={x + 8} y={158} fontSize={10.5} fill={AMBER} fontWeight={700} className="num">ATP −1</text>
            <text x={x + 8} y={172} fontSize={9} opacity={0.55}>Mg²⁺</text>
            <line x1={x} y1={220} x2={x} y2={266} stroke={AMBER} strokeWidth={1.2} markerEnd="url(#ah-amber-o)" />
            <text x={x + 8} y={242} fontSize={10.5} fill={AMBER} className="num">ADP + H⁺</text>
          </g>
        );
      }
      case "gk-6":
        return (
          <g>
            <line x1={845} y1={150} x2={845} y2={198} stroke={INK} strokeWidth={1} markerEnd="url(#ah-ink)" />
            <text x={851} y={166} fontSize={10.5} className="num">Pi</text>
            <line x1={903} y1={150} x2={903} y2={198} stroke={TEAL} strokeWidth={1.2} markerEnd="url(#ah-teal)" />
            <text x={909} y={166} fontSize={10.5} fill={TEAL} fontWeight={700}>NAD⁺</text>
            <line x1={874} y1={220} x2={874} y2={300} stroke={TEAL} strokeWidth={1.2} markerEnd="url(#ah-teal)" />
            <text x={866} y={240} fontSize={10.5} textAnchor="end" fill={TEAL} fontWeight={700}>NADH + H⁺ ×2</text>
            <line x1={874} y1={306} x2={874} y2={462} stroke={TEAL} strokeWidth={1} strokeDasharray="2 4" opacity={0.6} />
          </g>
        );
      case "gk-7":
      case "gk-10": {
        const x = stepId === "gk-7" ? 1044 : 1554;
        return (
          <g>
            {/* 回收步骤：琥珀箭头从账本带升入主链 */}
            <line x1={x} y1={466} x2={x} y2={226} stroke={AMBER} strokeWidth={1.4} markerEnd="url(#ah-amber)" />
            <text x={x + 8} y={300} fontSize={11} fill={AMBER} fontWeight={700} className="num">ATP +1 ×2</text>
            <text x={x + 8} y={315} fontSize={9} opacity={0.55}>
              {stepId === "gk-7" ? "收回第 Ⅰ、Ⅲ 步投入" : "净 ATP 至此转正 · Mg²⁺、K⁺"}
            </text>
          </g>
        );
      }
      case "gk-8":
        return (
          <g>
            {/* 基团转移：曲线箭头 */}
            <path d="M1184,224 Q1214,254 1244,224" fill="none" stroke={INK} strokeWidth={1} markerEnd="url(#ah-open)" />
            <text x={1214} y={264} fontSize={9} textAnchor="middle" opacity={0.7}>C3→C2 磷酸转移</text>
          </g>
        );
      case "gk-9":
        return (
          <g>
            <line x1={1384} y1={220} x2={1384} y2={260} stroke={INK} strokeWidth={1} markerEnd="url(#ah-ink)" />
            <text x={1392} y={244} fontSize={10.5} className="num">H₂O −1</text>
          </g>
        );
      default:
        return null;
    }
  };

  /* ---------- 单个主链步骤组 ---------- */
  const renderChainGroup = (a: ChainArrow) => {
    const step = stepById(a.stepId);
    if (!step) return null;
    const irrev = step.irreversible;
    const note = STEP_NOTES[a.stepId];
    const delta = hasDiff(step, organ);
    return (
      <g
        key={a.stepId}
        className={arrowClass(a.stepId)}
        data-step-id={a.stepId}
        style={{ cursor: "pointer" }}
      >
        {irrev ? (
          <line className="arrow" x1={a.x1} y1={a.y} x2={a.x2} y2={a.y} stroke={INK} strokeWidth={1.6} markerEnd="url(#ah-ink-heavy)" />
        ) : (
          <>
            <line className="arrow" x1={a.x1} y1={a.y} x2={a.x2} y2={a.y} stroke={INK} strokeWidth={1} />
            <path d={`M${a.x1 + 8},${a.y - 4} L${a.x1 - 1},${a.y} L${a.x1 + 8},${a.y + 4}`} fill="none" stroke={INK} />
            <path d={`M${a.x2 - 8},${a.y - 4} L${a.x2 + 1},${a.y} L${a.x2 - 8},${a.y + 4}`} fill="none" stroke={INK} />
          </>
        )}
        {delta && (
          <text data-delta="1" x={a.x1 - 16} y={118} fontSize={11.5} fill={BRICK} fontWeight={700}>Δ</text>
        )}
        <text className="st-no serif" x={a.x1} y={118} fontSize={17}>{roman(step.index)}</text>
        <text className="st-name q-hide" x={a.x1 + 26} y={118} fontSize={11.5} letterSpacing={1.5}>{step.enzyme.name}</text>
        {note && <text x={a.x1} y={134} fontSize={9} opacity={0.55}>{note}</text>}
        {energyVerticals(a.stepId)}
      </g>
    );
  };

  /* ---------- 主链代谢物节点 ---------- */
  const mainNodes = pathway.skeleton.nodes
    .filter((n) => n.order !== null)
    .sort((p, q) => (p.order ?? 0) - (q.order ?? 0));

  return (
    <div className="poster">
      {/* ===== 面包屑（兼作通路切换：克制的下划线文字） ===== */}
      <nav className="crumb" style={{ margin: "14px 28px 0" }}>
        <Link to="/">首页</Link>
        {" ／ "}
        <b>糖酵解</b>
        {" ／ "}
        <Link to="/pathway/tca">三羧酸循环</Link>
        {" ／ "}
        <Link to="/pathway/gluconeogenesis">糖异生</Link>
        {" ／ "}
        <Link to="/pathway/cori">Cori 循环</Link>
        {" ／ "}
        <Link to="/pathway/ppp">磷酸戊糖途径</Link>
        {" ／ "}
        <Link to="/pathway/fatty-acid-oxidation">β-氧化</Link>
      </nav>

      {/* ===== 报头 ===== */}
      <header className="masthead">
        <div className="mast-top">
          <span className="kicker">代谢通路挂图 · METABOLIC WALL CHART</span>
          <span className="plate-no num">PLATE 01 / 12 · 第一版 · 2026</span>
        </div>
        <div className="mast-main">
          <h1>
            {pathway.name}
            <small>GLYCOLYSIS — 胞质溶胶中的十步酶促反应</small>
          </h1>
          <p className="mast-summary">
            {pathway.summary} 前五步为投入期（耗 <b className="num">2</b> ATP），后五步为放能期（每葡萄糖回收{" "}
            <b className="num">4</b> ATP）。全图对齐能量账本基线，逐级累加，末端结算。
          </p>
        </div>
      </header>

      {/* ===== 图例：箭头类型学在此锁死 ===== */}
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
          支路 / 次要流向
        </span>
        <span className="lg">
          <svg width="14" height="14" aria-hidden>
            <line x1="7" y1="0" x2="7" y2="14" stroke={AMBER} strokeWidth="1.4" />
          </svg>
          琥珀垂线 = ATP / ADP 能量转移
        </span>
        <span className="lg">
          <svg width="14" height="14" aria-hidden>
            <line x1="7" y1="0" x2="7" y2="14" stroke={TEAL} strokeWidth="1.4" />
          </svg>
          青垂线 = NADH / NAD⁺ 还原当量
        </span>
        <span className="lg">
          <svg width="40" height="12" aria-hidden>
            <path d="M1,9 Q20,-4 39,9" fill="none" stroke={INK} />
          </svg>
          曲线 = 基团转移
        </span>
        <span className="lg">
          <svg width="34" height="12" aria-hidden>
            <line x1="0" y1="6" x2="24" y2="6" stroke={INK} />
            <path d="M24,2 L32,6 L24,10" fill="none" stroke={INK} />
          </svg>
          空心圆头 = 催化
        </span>
        <span className="lg">
          <span style={{ color: BRICK, fontWeight: 700 }}>Δ</span>&nbsp;组织差异标记（详见表 1）
        </span>
        {quizOn && (
          <span className="lg quiz-hint">自测中 · 酶名与代谢物名已隐藏 · 悬停或点击揭晓</span>
        )}
        <span className="lg legend-hint">画布宽于视口 · Shift+滚轮 / 拖动底部滚动条横向漫游 · 缩放下一版启用</span>
      </div>

      {/* ===== 主体 ===== */}
      <div className="body-grid">
        <div className="plate-wrap">
          <div className="plate-head">
            <span className="t">图 1 · 主链与能量转移</span>
            <span className="organ-switch" role="tablist" aria-label="器官视图切换">
              视图
              {pathway.organs.map((o) => (
                <button
                  key={o.id}
                  role="tab"
                  aria-selected={o.id === organ}
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
                width={1760}
                height={750}
                viewBox="0 0 1760 750"
                onClick={onPlateClick}
              >
                <defs>
                  <marker id="ah-ink" markerWidth="9" markerHeight="8" refX="8" refY="4" orient="auto">
                    <path d="M0,0.5 L8.5,4 L0,7.5 Z" fill={INK} />
                  </marker>
                  <marker id="ah-ink-heavy" markerWidth="10" markerHeight="9" refX="9" refY="4.5" orient="auto">
                    <path d="M0,0.5 L9.5,4.5 L0,8.5 Z" fill={INK} />
                  </marker>
                  <marker id="ah-open" markerWidth="9" markerHeight="8" refX="8" refY="4" orient="auto">
                    <path d="M0,0.5 L8.5,4 L0,7.5" fill="none" stroke={INK} />
                  </marker>
                  <marker id="ah-amber" markerWidth="8" markerHeight="7" refX="7" refY="3.5" orient="auto">
                    <path d="M0,0.5 L7.5,3.5 L0,6.5 Z" fill={AMBER} />
                  </marker>
                  <marker id="ah-amber-o" markerWidth="8" markerHeight="7" refX="7" refY="3.5" orient="auto">
                    <path d="M0,0.5 L7.5,3.5 L0,6.5" fill="none" stroke={AMBER} strokeWidth={1.2} />
                  </marker>
                  <marker id="ah-teal" markerWidth="8" markerHeight="7" refX="7" refY="3.5" orient="auto">
                    <path d="M0,0.5 L7.5,3.5 L0,6.5 Z" fill={TEAL} />
                  </marker>
                </defs>

                {/* 角落十字锚点 */}
                <g stroke={INK} strokeWidth={1} opacity={0.5}>
                  <path d="M20,12 V28 M12,20 H28" />
                  <path d="M1740,12 V28 M1732,20 H1748" />
                  <path d="M20,722 V738 M12,730 H28" />
                  <path d="M1740,722 V738 M1732,730 H1748" />
                </g>

                {/* 隔室括线 */}
                <path d="M46,64 V56 H1734 V64" fill="none" stroke={INK} strokeWidth={1} />
                <text x={46} y={44} fontSize={11} letterSpacing={4} fontWeight={700}>细胞质 · CYTOSOL</text>
                <text x={1734} y={44} fontSize={9.5} textAnchor="end" opacity={0.55}>单隔室通路 · 无线粒体参与</text>

                {/* 区带 washing：糖磷酸区 / 三碳区 / 支路区 */}
                <rect x={36} y={88} width={664} height={214} fill="rgba(34,40,42,0.035)" />
                <rect x={700} y={88} width={1040} height={214} fill="rgba(34,40,42,0.035)" />
                <rect x={700} y={316} width={1040} height={136} fill="rgba(34,40,42,0.04)" />
                <text x={48} y={78} fontSize={10.5} letterSpacing={3} fontWeight={700} opacity={0.75}>糖磷酸区 · HEXOSE PHOSPHATE</text>
                <text x={712} y={78} fontSize={10.5} letterSpacing={3} fontWeight={700} opacity={0.75}>三碳区 · TRIOSE PHOSPHATE</text>
                <text x={712} y={444} fontSize={10.5} letterSpacing={3} fontWeight={700} opacity={0.6}>支路区 · SIDE ROUTES</text>

                {/* 边缘延伸感：左右被裁切的相邻挂图 */}
                <g opacity={0.85}>
                  <line x1={14} y1={210} x2={68} y2={210} stroke={INK} strokeWidth={1} markerEnd="url(#ah-ink)" />
                  <text x={14} y={246} fontSize={9.5} opacity={0.65}>← 来自糖原磷酸解 / 摄入糖</text>
                  <line x1={1672} y1={210} x2={1746} y2={210} stroke={INK} strokeWidth={1.2} markerEnd="url(#ah-ink-heavy)" />
                  <text x={1746} y={244} fontSize={9.5} textAnchor="end" opacity={0.65}>丙酮酸 → 线粒体（挂图 02）</text>
                  <text x={1746} y={258} fontSize={9.5} textAnchor="end" opacity={0.65}>NADH → 呼吸链（本版未含）</text>
                </g>

                {/* 主链步骤组（gk-5 为垂直双头细线，手绘于 DHAP 支路上方） */}
                {chainArrows.map(renderChainGroup)}
                <g
                  className={arrowClass("gk-5")}
                  data-step-id="gk-5"
                  style={{ cursor: "pointer" }}
                >
                  {(() => {
                    const s = stepById("gk-5")!;
                    const delta = hasDiff(s, organ);
                    return (
                      <>
                        <line className="arrow" x1={790} y1={310} x2={790} y2={244} stroke={INK} strokeWidth={1} markerEnd="url(#ah-open)" />
                        <path d="M786,310 L790,318 L794,310" fill="none" stroke={INK} />
                        {delta && <text data-delta="1" x={774} y={282} fontSize={11.5} fill={BRICK} fontWeight={700}>Δ</text>}
                        <text className="st-no serif" x={806} y={282} fontSize={17}>Ⅴ</text>
                        <text className="st-name q-hide" x={830} y={282} fontSize={11.5} letterSpacing={1.5}>{s.enzyme.name}</text>
                        <text x={806} y={298} fontSize={9} opacity={0.55}>自此 ×2 计</text>
                      </>
                    );
                  })()}
                </g>

                {/* 主链代谢物节点 */}
                <g fontSize={13} fontWeight={700} textAnchor="middle">
                  {mainNodes.map((n) => {
                    const cx = NODE_X[n.id];
                    const isEnd = n.id === "glc" || n.id === "pyr";
                    return (
                      <g key={n.id} className={nodeClass(n.id)} data-node-id={n.id} style={{ cursor: "pointer" }}>
                        <circle cx={cx} cy={BASE_Y} r={R} fill={PAPER} stroke={INK} strokeWidth={isEnd ? 1.4 : 1.2} />
                        <text className="q-hide" x={cx} y={BASE_Y + 5}>{abbrOf(n.id)}</text>
                        <text className="q-hide" x={cx} y={BASE_Y + 48} fontSize={10.5} fontWeight={400}>{nameOf(n.id)}</text>
                        {n.id === "g3p" && (
                          <text x={cx} y={BASE_Y - 32} fontSize={10} fontWeight={700}>×2</text>
                        )}
                      </g>
                    );
                  })}
                </g>

                {/* 支路 Ⅳ：FBP → DHAP（虚线） */}
                <g className="branch">
                  <path d="M700,224 Q726,296 766,316" fill="none" stroke={INK} strokeWidth={1} strokeDasharray="4 3" />
                  <path d="M757,310 L767,317 L754,320" fill="none" stroke={INK} />
                </g>
                {/* 支路节点：DHAP */}
                <g className={nodeClass("dhap")} data-node-id="dhap" style={{ cursor: "pointer" }} textAnchor="middle">
                  <circle cx={790} cy={335} r={20} fill="none" stroke={INK} strokeDasharray="3 3" />
                  <text className="q-hide" x={790} y={340} fontSize={10} fontWeight={700}>DHAP</text>
                  <text className="q-hide" x={790} y={372} fontSize={9.5} fontWeight={400} opacity={0.65}>磷酸二羟丙酮</text>
                </g>

                {/* Rapoport–Luebering 支路（虚线；红细胞特异） */}
                <g className="branch">
                  <path d="M966,238 Q1000,330 1096,342" fill="none" stroke={INK} strokeWidth={1} strokeDasharray="4 3" />
                  <path d="M1088,336 L1097,343 L1085,346" fill="none" stroke={INK} />
                  <path d="M1138,332 Q1152,284 1131,244" fill="none" stroke={INK} strokeWidth={1} strokeDasharray="4 3" markerEnd="url(#ah-open)" />
                  <g className={nodeClass("23bpg")} data-node-id="23bpg" style={{ cursor: "pointer" }} textAnchor="middle">
                    <circle cx={1120} cy={345} r={20} fill="none" stroke={INK} strokeDasharray="3 3" />
                    <text className="q-hide" x={1120} y={350} fontSize={10} fontWeight={700}>2,3-BPG</text>
                    <text className="q-hide" x={1120} y={382} fontSize={9.5} fontWeight={400} opacity={0.65}>2,3-二磷酸甘油酸</text>
                  </g>
                  <g className={arrowClass("gk-rap")} data-step-id="gk-rap" style={{ cursor: "pointer" }}>
                    <text x={1190} y={342} fontSize={10.5} fontWeight={700}>
                      {organ === "rbc" && (
                        <tspan data-delta="1" fill={BRICK}>Δ </tspan>
                      )}
                      Rapoport–Luebering 支路 · <tspan className="q-hide">BPGM（双功能）</tspan>
                    </text>
                    <text x={1190} y={358} fontSize={9.5} opacity={0.7}>仅红细胞活跃 · 绕过第 Ⅶ 步 · 每葡萄糖放弃 2 ATP</text>
                    {organ === "rbc" ? (
                      <text data-delta="1" x={1190} y={374} fontSize={9.5} fill={BRICK} fontWeight={700}>
                        Δ 红细胞 — 降低 Hb 对 O₂ 的亲和力（高原适应的分子基础）
                      </text>
                    ) : (
                      <text x={1190} y={374} fontSize={9.5} opacity={0.45}>
                        Δ {organName}几乎无 2,3-BPG 堆积（红细胞视图可见完整标注）
                      </text>
                    )}
                  </g>
                </g>

                {/* ===== 能量账本带 ===== */}
                <g>
                  <line x1={40} y1={470} x2={1730} y2={470} stroke={INK} strokeWidth={1.5} />
                  <line x1={40} y1={634} x2={1730} y2={634} stroke={INK} strokeWidth={1} />
                  <text x={48} y={494} fontSize={12} letterSpacing={5} fontWeight={700}>能量账本 · ENERGY LEDGER</text>
                  <text x={1730} y={494} fontSize={14} textAnchor="end" fontWeight={700} className="serif num">
                    结算：<tspan fill={AMBER}>净 +2 ATP</tspan> · <tspan fill={TEAL}>净 +2 NADH</tspan>
                  </text>
                  <text x={690} y={494} fontSize={10} letterSpacing={3} textAnchor="end" opacity={0.55}>投入期 Ⅰ–Ⅴ</text>
                  <text x={712} y={494} fontSize={10} letterSpacing={3} opacity={0.55}>放能期 Ⅵ–Ⅹ（×2）</text>

                  {/* 账本列与主链垂线逐列虚线对齐 */}
                  <g stroke={INK} strokeDasharray="1 4" opacity={0.45}>
                    <line x1={184} y1={272} x2={184} y2={466} />
                    <line x1={524} y1={272} x2={524} y2={466} />
                  </g>

                  {/* 账目区整体下移 30px：给右端"结算"与 Ⅹ 列让出间距 */}
                  {LEDGER.map((c) => (
                    <g key={c.step} textAnchor="middle">
                      <text className="serif" x={c.x} y={544} fontSize={13}>{c.step}</text>
                      {Array.from({ length: c.count }).map((_, i) => {
                        const w = 12;
                        const gap = 4;
                        const total = c.count * w + (c.count - 1) * gap;
                        const sx = c.x - total / 2 + i * (w + gap);
                        return c.kind === "out" ? (
                          <rect key={i} x={sx} y={554} width={w} height={w} fill="none" stroke={AMBER} strokeWidth={1.4} />
                        ) : (
                          <rect key={i} x={sx} y={554} width={w} height={w} fill={c.color} />
                        );
                      })}
                      <text x={c.x} y={596} fontSize={15} fill={c.color} fontWeight={700} className="num">{c.val}</text>
                      <text x={c.x} y={616} fontSize={10} opacity={0.6} className="num">{c.cum}</text>
                    </g>
                  ))}

                  <text x={48} y={656} fontSize={9.5} opacity={0.6}>
                    按每葡萄糖计 · 方块 = 1 分子 · 空心为投入（Ⅰ、Ⅲ），实心为回收（Ⅶ、Ⅹ，各 ×2）
                  </text>
                </g>

                {/* 底部被裁切的下一张挂图延伸 */}
                <g opacity={0.55}>
                  <text x={1730} y={706} fontSize={9.5} textAnchor="end">挂图 02 · 丙酮酸氧化脱羧 → TCA 循环</text>
                  <line x1={1400} y1={724} x2={1730} y2={724} stroke={INK} strokeDasharray="4 3" />
                </g>
              </svg>
            </div>
          </div>

          {/* ===== 表 1 · 组织差异 ===== */}
          <div className="footnote">
            <div className="fn-head">
              <span className="t">表 1 · 同工酶与组织差异</span>
              <span className="view">硫酸纸视图 · {organName}</span>
            </div>
            <table className="organs">
              <thead>
                <tr>
                  <th style={{ width: 120 }}>步骤</th>
                  {pathway.organs.map((o) => (
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
                      {hasDiff(step, organ) && <span className="dm">Δ</span>}
                      {label}
                    </td>
                    {pathway.organs.map((o) => {
                      const d = step.organDiffs.find((x) => x.organ === o.id);
                      return (
                        <td key={o.id} className={o.id === organ ? "cur" : ""}>
                          {d ? d.text : "—（与通用型一致）"}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
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
                  {STEP_TAGS[selectedStep.id] && (
                    <span className="d-tag amber">{STEP_TAGS[selectedStep.id]}</span>
                  )}
                </div>
                <div className="d-enzyme">
                  {selectedStep.enzyme.name}
                  {selectedStep.enzyme.isozyme && (
                    <span className="d-iso"> — {selectedStep.enzyme.isozyme}</span>
                  )}
                </div>
                <div className="d-eq">{selectedStep.equation}</div>
                {/* 结构帧入口：克制的一行文字链接（非按钮/胶囊/卡片）；无帧步骤灰字声明，不隐藏 */}
                {stepFrames.length > 0 ? (
                  <Link
                    className="frames-entry"
                    data-testid="frames-entry"
                    to={`/structures/${frameSeq.pathwayId}?frame=${stepFrames[0].frameId}`}
                  >
                    看这一步的结构帧 →
                  </Link>
                ) : (
                  <span className="frames-entry-none" data-testid="frames-entry-none" aria-disabled="true">
                    结构帧尚未接入
                  </span>
                )}
                <div className="d-cof">
                  <b>底物</b>　{selectedStep.substrates.map(nameOf).join(" + ")}
                  　　<b>产物</b>　{selectedStep.products.map(nameOf).join(" + ")}
                </div>
                <div className="d-cof">
                  <b>辅因子</b>　{selectedStep.cofactors.length ? selectedStep.cofactors.join("、") : "—"}
                </div>
                {/* 新增档案字段：有则显示、无则隐藏（与辅因子同层级，不新开卡片） */}
                {selectedStep.ecNumber && (
                  <div className="d-cof num">
                    <b>EC</b>　{selectedStep.ecNumber}
                  </div>
                )}
                {selectedStep.deltaG && (
                  <div className="d-cof num">
                    <b>ΔG</b>　标准态 {fmtDG(selectedStep.deltaG.standard)} · 生理态{" "}
                    {fmtDG(selectedStep.deltaG.physiological)} {selectedStep.deltaG.unit}
                  </div>
                )}
                {selectedStep.deltaG?.note && <div className="d-dgnote">{selectedStep.deltaG.note}</div>}
                {selectedStep.stereochemistry?.length ? (
                  <div className="d-cof d-stereo">
                    <b>立体化学</b>　{selectedStep.stereochemistry.join("；")}
                  </div>
                ) : null}
                <div className="d-sig">{selectedStep.significance}</div>
                {hasDiff(selectedStep, organ) ? (
                  <div className="d-organ">
                    <span className="lbl">Δ {organName}差异</span>
                    {selectedStep.organDiffs.find((d) => d.organ === organ)?.text}
                  </div>
                ) : selectedStep.organDiffs.length ? (
                  <div className="d-none">
                    本步差异在其它组织（
                    {selectedStep.organDiffs
                      .map((d) => pathway.organs.find((o) => o.id === d.organ)?.name)
                      .filter(Boolean)
                      .join("、")}
                    ）——切换视图可见。
                  </div>
                ) : (
                  <div className="d-none">本步无组织差异（肝 / 肌 / 红细胞一致）。</div>
                )}
                {/* 常见误解：至多 2 条，小字不抢主链注意力 */}
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
                {/* 器官变体切换（仅 gk-1 / gk-10 有独立档案）：下划线文字，切换不重排图面 */}
                {variantAvailable && variantMeta && (
                  <div className="d-variant" role="tablist" aria-label="器官变体档案切换">
                    <button
                      role="tab"
                      aria-selected={!variantOn}
                      className={`d-variant-tab${!variantOn ? " active" : ""}`}
                      onClick={() => setVariantOn(false)}
                    >
                      {variantMeta.main}
                    </button>
                    <button
                      role="tab"
                      aria-selected={variantOn}
                      className={`d-variant-tab${variantOn ? " active" : ""}`}
                      onClick={() => setVariantOn(true)}
                    >
                      {variantMeta.variant}
                    </button>
                  </div>
                )}
                {activeCfg ? (
                  <EmbeddedStepViewer stepId={active3dId} cfg={activeCfg} />
                ) : (
                  <div className="d-none">3D 结合视图：资产筹备中（缺失步骤按降级呈现，详见单步页）。</div>
                )}
              </div>
            ) : (
              <div className="d-body">
                <div className="d-placeholder">
                  点击图中的步骤箭头、酶名或代谢物节点，此处显示该步的反应式、酶与生理意义，并内嵌 3D 结合视图。
                </div>
              </div>
            )}
          </div>

          <div className="panel-block">
            <div className="pb-title">
              <span>能量结算</span>
              <span className="en">SETTLEMENT</span>
            </div>
            <div className="settle">
              <div>
                <div className="s-lbl">ATP</div>
                <div className="s-val a num">−2 → +4</div>
                <div className="sq-row">
                  <span className="sq ha" /><span className="sq ha" />
                  <span className="sq fa" /><span className="sq fa" /><span className="sq fa" /><span className="sq fa" />
                </div>
                <div className="s-sub num">投入 Ⅰ·Ⅲ ／ 回收 Ⅶ·Ⅹ（×2）</div>
              </div>
              <div>
                <div className="s-lbl">NADH</div>
                <div className="s-val t num">0 → +2</div>
                <div className="sq-row">
                  <span className="sq ft" /><span className="sq ft" />
                </div>
                <div className="s-sub num">第 Ⅵ 步（×2）</div>
              </div>
              <div className="settle-rule" />
              <div className="settle-net">
                <span className="n-lbl">每葡萄糖净得</span>
                <span className="n-val num">
                  <span className="a">+2 ATP</span> · <span className="t">+2 NADH</span>
                </span>
              </div>
            </div>
          </div>
        </aside>
      </div>

      <div className="poster-foot">
        {TODO_NOTES.map((n) => (
          <span key={n}>待确认：{n}<br /></span>
        ))}
      </div>
    </div>
  );
}
