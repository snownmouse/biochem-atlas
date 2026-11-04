// TCA「代谢图谱挂图」（B 方案延续）：与糖酵解挂图同一版式语言（四色封顶 + 挂图体例），
// 但主图是闭环椭圆环 + 回流带。数据以 tca.json / skeleton-tca.json 为唯一事实源。
// 本页不复制糖酵解渲染路径：PathwayOverviewPage 保持原样，main.tsx 按 pathwayId 分发到此页。
// 3D 本轮不做：右栏固定占位说明（PDB 候选未核验 / 复合体尺寸超约束）。
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { MouseEvent as ReactMouseEvent } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { entitiesTca, organNoteTca, pathwayTca, TODO_NOTES_TCA } from "../data/tca";
import type { OrganId, Step } from "../data/types";
import "../styles/frames-entry.css";

/* ---------- 挂图配色（与糖酵解挂图同款封顶） ---------- */
const INK = "#22282A";
const AMBER = "#B4761F";
const TEAL = "#2E6E6B";
const BRICK = "#9C4A3C";
const PAPER = "#F6F3EC";

/* ---------- 环几何：节点坐标取自 skeleton-tca.json（椭圆 rx=600 ry=272 · 中心 880,400） ---------- */
const R = 24; // 环上节点半径
const nodePos = new Map(pathwayTca.skeleton.nodes.map((n) => [n.id, { x: n.x, y: n.y }]));
const posOf = (id: string) => nodePos.get(id) ?? { x: 0, y: 0 };

const ROMAN_8 = ["Ⅰ", "Ⅱ", "Ⅲ", "Ⅳ", "Ⅴ", "Ⅵ", "Ⅶ", "Ⅷ"];
const roman = (idx: number | null) => (idx === null ? "接" : ROMAN_8[idx - 1] ?? String(idx));

const stepById = (id: string): Step | undefined =>
  pathwayTca.steps.find((s) => s.id === id) ?? pathwayTca.sideBranchSteps?.find((s) => s.id === id);

const RING_IDS = pathwayTca.steps.map((s) => s.id);
/* 结构对照页已接入的步骤：环内八步 + 接驳步 PDH（九个有机酸均有 2D/3D 资产） */
const TCA_CMP_STEP_IDS = new Set([...RING_IDS, "tca-pdh"]);
/* 环上代谢物节点（order 非 null）；pyr/accoa/glu 为接驳与回补的侧节点，不随环置灰 */
const RING_NODE_IDS = new Set(
  pathwayTca.skeleton.nodes.filter((n) => n.order !== null).map((n) => n.id)
);

/* ---------- 环弧：由 skeleton.links 驱动（短弧 <90°，sweep=1 即屏幕顺时针） ---------- */
const RING_ARCS = pathwayTca.skeleton.links.map((l) => {
  const a = posOf(l.from);
  const b = posOf(l.to);
  return { stepId: l.stepId, d: `M ${a.x},${a.y} A 600 272 0 0 1 ${b.x},${b.y}` };
});

/* ---------- 节点全名外置位（径向外推） ---------- */
const NODE_LABEL: Record<string, { dx: number; dy: number; anchor: "start" | "end" | "middle" }> = {
  cit: { dx: 0, dy: -38, anchor: "middle" },
  icit: { dx: 34, dy: -26, anchor: "start" },
  akg: { dx: 38, dy: 5, anchor: "start" },
  succoa: { dx: 36, dy: 32, anchor: "start" },
  suc: { dx: 0, dy: 46, anchor: "middle" },
  fum: { dx: -36, dy: 32, anchor: "end" },
  mal: { dx: -38, dy: 5, anchor: "end" },
  oaa: { dx: -34, dy: -26, anchor: "end" },
  accoa: { dx: 0, dy: 46, anchor: "middle" },
  pyr: { dx: 0, dy: 48, anchor: "middle" },
  glu: { dx: 0, dy: 44, anchor: "middle" },
};

/* ---------- 步骤标签位（弧中点外侧）+ 注脚 + 能量行 ---------- */
const STEP_LABELS: Record<string, { x: number; y: number; anchor: "start" | "end" | "middle"; note: string; noteColor?: string }> = {
  "tca-1": { x: 700, y: 74, anchor: "middle", note: "不可逆 · 循环闸门", noteColor: AMBER },
  "tca-2": { x: 1156, y: 92, anchor: "middle", note: "[4Fe-4S] 簇 · 近平衡" },
  "tca-3": { x: 1532, y: 252, anchor: "start", note: "限速 · 不可逆", noteColor: BRICK },
  "tca-4": { x: 1532, y: 542, anchor: "start", note: "不可逆 · 与 PDH 同型", noteColor: BRICK },
  "tca-5": { x: 1156, y: 708, anchor: "middle", note: "底物水平磷酸化" },
  "tca-6": { x: 604, y: 708, anchor: "middle", note: "复合体 II · 嵌内膜 · 不泵质子" },
  "tca-7": { x: 228, y: 542, anchor: "end", note: "反式水合 · 近平衡" },
  "tca-8": { x: 228, y: 252, anchor: "end", note: "标准态 +29.7 · 靠第 Ⅰ 步拉动", noteColor: TEAL },
};
const STEP_ENERGY: Record<string, [string, string][]> = {
  "tca-3": [["NADH +1", TEAL], ["CO₂ +1", INK]],
  "tca-4": [["NADH +1", TEAL], ["CO₂ +1", INK]],
  "tca-5": [["GTP +1", AMBER]],
  "tca-6": [["FADH₂ +1", TEAL]],
  "tca-8": [["NADH +1", TEAL]],
};

/* 右栏详情标签 */
const STEP_TAGS: Record<string, string> = {
  "tca-1": "闸门 · OAA 入口",
  "tca-3": "限速 · +NADH",
  "tca-4": "+NADH",
  "tca-5": "+GTP",
  "tca-6": "+FADH₂",
  "tca-8": "闭环 · +NADH",
};

const fmtDG = (v: number) => v.toFixed(1).replace("-", "−");
const hasDiff = (step: Step, organ: OrganId) => step.organDiffs.some((d) => d.organ === organ);

const entityMap = new Map(entitiesTca.map((e) => [e.id, { name: e.name, abbr: e.abbr ?? e.id }]));
const abbrOf = (id: string) => entityMap.get(id)?.abbr ?? id;
const nameOf = (id: string) => entityMap.get(id)?.name ?? id;

export default function TcaOverviewPage() {
  const params = useParams();
  const [search, setSearch] = useSearchParams();
  const pathwayId = params.pathwayId ?? "tca";
  if (pathwayId !== pathwayTca.id) {
    return <div className="page">未知通路：{pathwayId}</div>;
  }

  const organParam = search.get("organ");
  const stepParam = search.get("step");
  const organ: OrganId =
    organParam && pathwayTca.organs.some((o) => o.id === organParam) ? (organParam as OrganId) : "liver";
  const organName = pathwayTca.organs.find((o) => o.id === organ)?.name ?? "肝";
  /* 红细胞视图：环上 8 步整体置灰（沿用糖酵解 faded 参数 opacity 0.3），环仍可点 */
  const rbcDim = organ === "rbc";
  const selectedStepId = stepParam;
  const selectedStep = useMemo(
    () => (selectedStepId ? stepById(selectedStepId) ?? null : null),
    [selectedStepId]
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
    (id: OrganId) => {
      const next = new URLSearchParams(search);
      next.set("organ", id);
      setSearch(next, { replace: true });
    },
    [search, setSearch]
  );

  /* 自测模式：与糖酵解挂图同机制（q-hide / revealed） */
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

  /* 挂图画布：Shift+滚轮横向漫游 */
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

  /* 挂图点击委托：自测揭晓 / 步骤组 / 代谢物节点
     与 PathwayOverviewPage 同款修复：旧写法 closest("[data-step-id], .node, .q-hide")
     按"离点击元素最近者"返回——点中 q-hide 文本时命中文本自身，祖先
     g[data-step-id] / g[data-node-id] 被跳过，data-* 读到 null → 静默 no-op。
     现按意图分开解析：先判定"是否点中隐藏名"（自测语义），再沿祖先链找步骤组/节点组。 */
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
          pathwayTca.steps.find((s) => s.products.includes(nodeId) && s.index !== null) ??
          pathwayTca.steps.find((s) => s.substrates.includes(nodeId)) ??
          (pathwayTca.sideBranchSteps ?? []).find((s) => s.products.includes(nodeId));
        if (step) selectStep(step.id === selectedStepId ? null : step.id);
      }
    },
    [selectedStepId, selectStep, quizOn]
  );

  const relatedNodes = useMemo(() => {
    if (!selectedStep) return null;
    return new Set([...selectedStep.substrates, ...selectedStep.products]);
  }, [selectedStep]);

  const nodeClass = (id: string) => {
    const cls = ["node"];
    if (selectedStep) {
      if (relatedNodes?.has(id)) cls.push("hl");
      else cls.push("faded");
    } else if (rbcDim && RING_NODE_IDS.has(id)) {
      cls.push("faded");
    }
    return cls.join(" ");
  };
  const arrowClass = (stepId: string) => {
    const cls = ["stepg"];
    if (selectedStepId === stepId) cls.push("sel");
    else if (selectedStepId || (rbcDim && RING_IDS.includes(stepId))) cls.push("faded");
    return cls.join(" ");
  };

  /* 表 1 行：有器官差异的步骤（接驳步也计入） */
  const diffRows = useMemo(() => {
    const rows: { step: Step; label: string }[] = [];
    for (const s of pathwayTca.sideBranchSteps ?? []) rows.push({ step: s, label: `接驳 ${s.enzyme.name}` });
    for (const s of pathwayTca.steps) {
      if (s.organDiffs.length > 0) rows.push({ step: s, label: `${ROMAN_8[s.index! - 1]} ${s.enzyme.name}` });
    }
    return rows;
  }, []);

  /* 环上上一步 / 下一步：第 Ⅷ 步的「下一步」回绕到第 Ⅰ 步（闭环，不出现死路） */
  const navOf = (id: string | null) => {
    const i = id ? RING_IDS.indexOf(id) : -1;
    if (i === -1) return { prev: null, next: RING_IDS[0], prevLabel: null, nextLabel: `第 Ⅰ 步 · ${stepById(RING_IDS[0])?.name}` };
    const p = RING_IDS[(i + RING_IDS.length - 1) % RING_IDS.length];
    const n = RING_IDS[(i + 1) % RING_IDS.length];
    return {
      prev: p,
      next: n,
      prevLabel: `${roman(stepById(p)!.index)} ${stepById(p)!.name}`,
      nextLabel: `${roman(stepById(n)!.index)} ${stepById(n)!.name}`,
    };
  };
  const nav = navOf(selectedStepId);

  const renderStepLabel = (stepId: string) => {
    const step = stepById(stepId);
    const cfg = STEP_LABELS[stepId];
    if (!step || !cfg) return null;
    const energy = STEP_ENERGY[stepId];
    return (
      <g>
        <text x={cfg.x} y={cfg.y} fontSize={11.5} letterSpacing={1.5} textAnchor={cfg.anchor} className="q-hide st-name">
          <tspan className="st-no serif" fontSize={17} style={{ letterSpacing: 0 }}>{roman(step.index)}</tspan>
          {"  "}
          {step.enzyme.name}
        </text>
        {cfg.note && (
          <text x={cfg.x} y={cfg.y + 16} fontSize={9} textAnchor={cfg.anchor} opacity={0.55} fill={cfg.noteColor}>
            {cfg.note}
          </text>
        )}
        {energy && (
          <text x={cfg.x} y={cfg.y + (cfg.note ? 31 : 16)} fontSize={10} textAnchor={cfg.anchor} fontWeight={700}>
            {energy.map(([t, c], i) => (
              <tspan key={i} fill={c} className="num">
                {i > 0 ? "　" : ""}{t}
              </tspan>
            ))}
          </text>
        )}
      </g>
    );
  };

  return (
    <div className="poster">
      {/* ===== 面包屑 ===== */}
      <nav className="crumb" style={{ margin: "14px 28px 0" }}>
        <Link to="/pathway/glycolysis">糖酵解</Link>
        {" ／ "}
        <b>三羧酸循环</b>
        {" ／ "}
        <Link to="/pathway/gluconeogenesis">糖异生</Link>
        {" ／ "}
        <Link to="/pathway/ppp">磷酸戊糖途径</Link>
        {selectedStep && (
          <>
            {" ／ 第 "}
            {roman(selectedStep.index)} 步 · {selectedStep.name}
          </>
        )}
      </nav>

      {/* ===== 报头 ===== */}
      <header className="masthead">
        <div className="mast-top">
          <span className="kicker">代谢通路挂图 · METABOLIC WALL CHART</span>
          <span className="plate-no num">PLATE 02 / 12 · 第一版 · 2026</span>
        </div>
        <div className="mast-main">
          <h1>
            {pathwayTca.name}
            <small>TRICARBOXYLIC ACID CYCLE — 线粒体基质中的八步催化闭环</small>
          </h1>
          <p className="mast-summary">
            {pathwayTca.summary} 环上 8 步首尾相接（第 Ⅷ 步再生 OAA 交回第 Ⅰ 步）；<b className="num">3</b> NADH、
            <b className="num">1</b> FADH₂、<b className="num">1</b> GTP、<b className="num">2</b> CO₂ 为<b>每轮</b>口径，
            每分子葡萄糖两轮 <b className="num">×2</b>。
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
          回流带 / 回补（非主链）
        </span>
        <span className="lg">
          <span style={{ color: AMBER, fontWeight: 700 }}>琥珀</span>＝GTP 能量
          <span style={{ margin: "0 6px", color: TEAL, fontWeight: 700 }}>青</span>＝NADH / FADH₂ 还原当量
        </span>
        <span className="lg">
          <span style={{ color: BRICK, fontWeight: 700 }}>Δ</span>&nbsp;组织差异标记（详见表 1）
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
            <span className="t">图 1 · 三羧酸循环主环（闭环）与能量转移</span>
            <span className="organ-switch" role="tablist" aria-label="器官视图切换">
              视图
              {pathwayTca.organs.map((o) => (
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
                height={980}
                viewBox="0 0 1760 980"
                onClick={onPlateClick}
              >
                <defs>
                  <marker id="t-ah-ink" markerWidth="9" markerHeight="8" refX="8" refY="4" orient="auto">
                    <path d="M0,0.5 L8.5,4 L0,7.5 Z" fill={INK} />
                  </marker>
                  <marker id="t-ah-ink-heavy" markerWidth="10" markerHeight="9" refX="9" refY="4.5" orient="auto">
                    <path d="M0,0.5 L9.5,4.5 L0,8.5 Z" fill={INK} />
                  </marker>
                  <marker id="t-ah-open" markerWidth="9" markerHeight="8" refX="8" refY="4" orient="auto-start-reverse">
                    <path d="M0,0.5 L8.5,4 L0,7.5" fill="none" stroke={INK} />
                  </marker>
                </defs>

                {/* 角落十字锚点 */}
                <g stroke={INK} strokeWidth={1} opacity={0.5}>
                  <path d="M20,12 V28 M12,20 H28" />
                  <path d="M1740,12 V28 M1732,20 H1748" />
                  <path d="M20,952 V968 M12,960 H28" />
                  <path d="M1740,952 V968 M1732,960 H1748" />
                </g>

                {/* 隔室括线 */}
                <path d="M46,64 V56 H1734 V64" fill="none" stroke={INK} strokeWidth={1} />
                <text x={46} y={44} fontSize={11} letterSpacing={4} fontWeight={700}>线粒体基质 · MITOCHONDRIAL MATRIX</text>
                <text x={1734} y={44} fontSize={9.5} textAnchor="end" opacity={0.55}>单隔室为主 · 唯琥珀酸脱氢酶嵌内膜</text>

                {/* 回流带：从第 Ⅷ 步（OAA 再生）回到第 Ⅰ 步——视觉权重低于主链，非第 9 步 */}
                <g className="branch" opacity={rbcDim ? 0.3 : 0.55}>
                  <path d="M 420,167 A 650 330 0 0 1 712,81" fill="none" stroke={INK} strokeWidth={1} strokeDasharray="5 4" markerEnd="url(#t-ah-ink)" />
                  <text x={880} y={56} fontSize={9.5} textAnchor="middle" opacity={0.9}>
                    回流带 · 草酰乙酸再生（第 Ⅷ 步）→ 第 Ⅰ 步缩合 · 闭环 · 非第 9 步
                  </text>
                </g>

                {/* 红细胞视图说明：置灰≠不可交互，环仍可点开看内容 */}
                {rbcDim && (
                  <text x={880} y={40} fontSize={11} textAnchor="middle" fill={BRICK} fontWeight={700}>
                    红细胞无线粒体，本通路不运行；仅保留丙酮酸 → 乳酸去向
                  </text>
                )}

                {/* 环弧（主链） */}
                {RING_ARCS.map((a) => {
                  const step = stepById(a.stepId);
                  if (!step) return null;
                  return (
                    <g key={a.stepId} className={arrowClass(a.stepId)} data-step-id={a.stepId} style={{ cursor: "pointer" }}>
                      {step.irreversible ? (
                        <path className="arrow" d={a.d} fill="none" stroke={INK} strokeWidth={1.6} markerEnd="url(#t-ah-ink-heavy)" />
                      ) : (
                        <path className="arrow" d={a.d} fill="none" stroke={INK} strokeWidth={1} markerStart="url(#t-ah-open)" markerEnd="url(#t-ah-open)" />
                      )}
                      {hasDiff(step, organ) && (
                        <text data-delta="1" x={posOf(step.products[0]).x - 40} y={posOf(step.products[0]).y - 34} fontSize={11.5} fill={BRICK} fontWeight={700}>Δ</text>
                      )}
                      {renderStepLabel(a.stepId)}
                    </g>
                  );
                })}

                {/* 接驳步 PDH：丙酮酸 → 乙酰-CoA（单独条目，不计入环上 8 步） */}
                <g className={arrowClass("tca-pdh")} data-step-id="tca-pdh" style={{ cursor: "pointer" }}>
                  <path d="M 158,296 Q 195,185 282,116" fill="none" stroke={INK} strokeWidth={1.6} markerEnd="url(#t-ah-ink-heavy)" />
                  <text x={230} y={175} fontSize={11.5} letterSpacing={1.5}>
                    <tspan className="st-no serif" fontSize={17} style={{ letterSpacing: 0 }}>接</tspan>
                    <tspan className="q-hide st-name">{"  "}丙酮酸脱氢酶复合体</tspan>
                  </text>
                  <text x={230} y={191} fontSize={9} opacity={0.55}>糖酵解接驳 · 不可逆（TPP / 硫辛酸 / FAD）</text>
                  <text x={230} y={206} fontSize={10} fontWeight={700}>
                    <tspan fill={TEAL} className="num">NADH +1</tspan>
                    <tspan fill={INK} className="num">　CO₂ +1</tspan>
                  </text>
                  {hasDiff(stepById("tca-pdh")!, organ) && (
                    <text data-delta="1" x={214} y={159} fontSize={11.5} fill={BRICK} fontWeight={700}>Δ</text>
                  )}
                </g>

                {/* 乙酰-CoA 入环（缩合原料汇入第 Ⅰ 步弧） */}
                <g opacity={0.85}>
                  <path d="M 322,104 Q 480,74 628,132" fill="none" stroke={INK} strokeWidth={1.2} markerEnd="url(#t-ah-ink)" />
                  <text x={470} y={64} fontSize={9} textAnchor="middle" opacity={0.6}>乙酰基入环（缩合原料）</text>
                </g>

                {/* 回补箭头（虚线，权重低于主链） */}
                <g className="branch">
                  <path d="M 168,318 Q 300,245 428,215" fill="none" stroke={INK} strokeWidth={1} strokeDasharray="4 3" opacity={0.7} markerEnd="url(#t-ah-ink)" />
                  <text x={252} y={272} fontSize={9.5} opacity={0.7}>回补 · 丙酮酸羧化酶（EC 6.4.1.1 · 生物素）</text>
                  <path d="M 1502,424 Q 1600,500 1666,640" fill="none" stroke={INK} strokeWidth={1} strokeDasharray="4 3" opacity={0.7} markerStart="url(#t-ah-open)" markerEnd="url(#t-ah-open)" />
                  <text x={1548} y={528} fontSize={9.5} opacity={0.7}>回补 · 转氨（AST / GDH）</text>
                </g>

                {/* 环上节点 + 入口/回补节点 */}
                <g fontSize={13} fontWeight={700} textAnchor="middle">
                  {pathwayTca.skeleton.nodes.map((n) => {
                    const p = posOf(n.id);
                    const lb = NODE_LABEL[n.id];
                    const isSide = n.order === null;
                    return (
                      <g key={n.id} className={nodeClass(n.id)} data-node-id={n.id} style={{ cursor: "pointer" }}>
                        <circle cx={p.x} cy={p.y} r={isSide ? 20 : R} fill={PAPER} stroke={INK} strokeWidth={n.id === "cit" ? 1.4 : 1.2} strokeDasharray={isSide ? "3 3" : undefined} />
                        <text className="q-hide" x={p.x} y={p.y + 5} fontSize={isSide ? 10.5 : 13}>{abbrOf(n.id)}</text>
                        {lb && (
                          <text className="q-hide" x={p.x + lb.dx} y={p.y + lb.dy} fontSize={10.5} fontWeight={400} textAnchor={lb.anchor}>{nameOf(n.id)}</text>
                        )}
                      </g>
                    );
                  })}
                </g>

                {/* 边缘延伸：相邻挂图 */}
                <g opacity={0.7}>
                  <text x={46} y={440} fontSize={9.5} opacity={0.8}>← 丙酮酸来自糖酵解（挂图 01）· 经 MPC 入基质</text>
                  <text x={1734} y={724} fontSize={9.5} textAnchor="end">琥珀酰-CoA → 血红素合成（支路）</text>
                  <text x={1734} y={742} fontSize={9.5} textAnchor="end">NADH / FADH₂ → 呼吸链（挂图 04）</text>
                </g>

                {/* ===== 能量账本带（每轮口径） ===== */}
                <g>
                  <line x1={40} y1={770} x2={1730} y2={770} stroke={INK} strokeWidth={1.5} />
                  <line x1={40} y1={934} x2={1730} y2={934} stroke={INK} strokeWidth={1} />
                  <text x={48} y={794} fontSize={12} letterSpacing={5} fontWeight={700}>能量账本 · ENERGY LEDGER（每轮）</text>
                  <text x={1730} y={794} fontSize={14} textAnchor="end" fontWeight={700} className="serif num">
                    结算：每轮 <tspan fill={TEAL}>+3 NADH · +1 FADH₂</tspan> · <tspan fill={AMBER}>+1 GTP</tspan> · +2 CO₂ ← 每葡萄糖两轮 ×2
                  </text>
                  {[
                    { step: "Ⅲ", x: 560, color: TEAL, val: "NADH +1 · CO₂ +1", cum: "NADH 累计 +1" },
                    { step: "Ⅳ", x: 760, color: TEAL, val: "NADH +1 · CO₂ +1", cum: "NADH 累计 +2" },
                    { step: "Ⅴ", x: 960, color: AMBER, val: "GTP +1", cum: "GTP 累计 +1" },
                    { step: "Ⅵ", x: 1160, color: TEAL, val: "FADH₂ +1", cum: "FADH₂ 累计 +1" },
                    { step: "Ⅷ", x: 1360, color: TEAL, val: "NADH +1", cum: "NADH 累计 +3" },
                  ].map((c) => (
                    <g key={c.step} textAnchor="middle">
                      <text className="serif" x={c.x} y={846} fontSize={13}>{c.step}</text>
                      <rect x={c.x - 6} y={856} width={12} height={12} fill={c.color} />
                      <text x={c.x} y={896} fontSize={13} fill={c.color} fontWeight={700} className="num">{c.val}</text>
                      <text x={c.x} y={916} fontSize={10} opacity={0.6} className="num">{c.cum}</text>
                    </g>
                  ))}
                  <text x={48} y={958} fontSize={9.5} opacity={0.6}>
                    按每乙酰基计（每轮）· 实心方块 = 1 分子 · 每分子葡萄糖产生 2 乙酰-CoA → 两轮 ×2
                  </text>
                </g>
              </svg>
            </div>
          </div>

          {/* ===== 表 1 · 组织差异 ===== */}
          <div className="footnote">
            <div className="fn-head">
              <span className="t">表 1 · 组织差异（本通路差异有限）</span>
              <span className="view">硫酸纸视图 · {organName}</span>
            </div>
            <table className="organs">
              <thead>
                <tr>
                  <th style={{ width: 140 }}>步骤</th>
                  {pathwayTca.organs.map((o) => (
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
                    {pathwayTca.organs.map((o) => {
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
                  {pathwayTca.organs.map((o) => (
                    <td key={o.id} className={o.id === organ ? "cur" : ""}>
                      {o.id === "rbc" ? "红细胞无线粒体，TCA 不运行（依赖糖酵解）" : "—（各组织共用线粒体基质同一套酶）"}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
            {organNoteTca && <div className="d-none" style={{ marginTop: 10 }}>{organNoteTca}</div>}

            {/* ===== 回补反应说明区 ===== */}
            <div className="fn-head" style={{ marginTop: 22 }}>
              <span className="t">表 2 · 回补反应 ANAPLEROSIS（中间体按催化量使用）</span>
            </div>
            <div style={{ fontSize: 12.5, lineHeight: 1.9 }}>
              {pathwayTca.anaplerosis?.map((a) => (
                <div key={a.id}>
                  <b>{a.name}</b>　<span className="num">{a.equation}</span>
                  　（{a.enzyme}
                  {a.ec && <span className="num"> · EC {a.ec}</span>}
                  {a.organScope && ` · ${a.organScope}`}）——{a.significance}
                </div>
              ))}
              {pathwayTca.anaplerosisNote && <div style={{ opacity: 0.7, marginTop: 6 }}>{pathwayTca.anaplerosisNote}</div>}
            </div>
          </div>
        </div>

        {/* ===== 右栏 ===== */}
        <aside>
          <div className="panel-block">
            <div className="pb-title">
              <span>详情栏</span>
              <span className="en">DETAIL · 点击环上任一步骤</span>
            </div>
            {selectedStep ? (
              <div className="d-body">
                <div className="d-step">
                  <span className="no serif num">{roman(selectedStep.index)}</span>
                  {selectedStep.name}
                  {selectedStep.irreversible && <span className="d-tag">不可逆</span>}
                  {STEP_TAGS[selectedStep.id] && <span className="d-tag amber">{STEP_TAGS[selectedStep.id]}</span>}
                </div>
                <div className="d-enzyme">
                  {selectedStep.enzyme.name}
                  {selectedStep.enzyme.isozyme && <span className="d-iso"> — {selectedStep.enzyme.isozyme}</span>}
                </div>
                <div className="d-eq">{selectedStep.equation}</div>
                <div className="d-cof">
                  <b>底物</b>　{selectedStep.substrates.map(nameOf).join(" + ")}
                  　　<b>产物</b>　{selectedStep.products.map(nameOf).join(" + ")}
                </div>
                <div className="d-cof">
                  <b>辅因子</b>　{selectedStep.cofactors.length ? selectedStep.cofactors.join("、") : "—"}
                </div>
                {selectedStep.ecNumber && (
                  <div className="d-cof num"><b>EC</b>　{selectedStep.ecNumber}</div>
                )}
                {selectedStep.deltaG && (
                  <div className="d-cof num">
                    <b>ΔG</b>　标准态 {fmtDG(selectedStep.deltaG.standard)} · 生理态 {fmtDG(selectedStep.deltaG.physiological)} {selectedStep.deltaG.unit}
                  </div>
                )}
                {selectedStep.deltaG?.note && <div className="d-dgnote">{selectedStep.deltaG.note}</div>}
                {selectedStep.stereochemistry?.length ? (
                  <div className="d-cof d-stereo"><b>立体化学</b>　{selectedStep.stereochemistry.join("；")}</div>
                ) : null}
                <div className="d-sig">{selectedStep.significance}</div>
                {/* 结构对照入口：与糖酵解同款下划线文字链接；无资产的步骤灰字声明，不给空链接 */}
                {TCA_CMP_STEP_IDS.has(selectedStep.id) ? (
                  <Link
                    className="frames-entry"
                    data-testid="tca-structure-cmp-entry"
                    to={`/structures/tca#${selectedStep.id}`}
                  >
                    看这一步的结构对照 →
                  </Link>
                ) : (
                  <span className="frames-entry-none" data-testid="tca-structure-cmp-none" aria-disabled="true">
                    结构对照尚未接入
                  </span>
                )}
                {hasDiff(selectedStep, organ) ? (
                  <div className="d-organ">
                    <span className="lbl">Δ {organName}差异</span>
                    {selectedStep.organDiffs.find((d) => d.organ === organ)?.text}
                  </div>
                ) : selectedStep.organDiffs.length ? (
                  <div className="d-none">
                    本步差异在其它组织（
                    {selectedStep.organDiffs
                      .map((d) => pathwayTca.organs.find((o) => o.id === d.organ)?.name)
                      .filter(Boolean)
                      .join("、")}
                    ）——切换视图可见。
                  </div>
                ) : (
                  <div className="d-none">本步无组织差异（各有氧组织共用线粒体基质酶）。</div>
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
                {/* 环上导航：闭环回绕，不出现死路 */}
                <div className="d-variant" role="tablist" aria-label="上一步 / 下一步">
                  {nav.prev ? (
                    <button role="tab" className="d-variant-tab" onClick={() => selectStep(nav.prev!)}>← {nav.prevLabel}</button>
                  ) : (
                    <button role="tab" className="d-variant-tab" onClick={() => selectStep(RING_IDS[0])}>进入环上第 Ⅰ 步 →</button>
                  )}
                  <button role="tab" className="d-variant-tab" onClick={() => selectStep(nav.next)}>{nav.nextLabel} →</button>
                </div>
                {/* 3D 本轮不做：固定占位 + 原因 */}
                <div className="d-none">
                  3D 结合视图：待结构核验——PDB 候选（柠檬酸合酶 1CTS / 乌头酸酶 7ACN / 复合体 II 1ZOY 等）均为候选条目，
                  尚未按糖酵解同款流程（RCSB 物种 / 配体 / 分辨率）逐条核验；且 PDH、α-KG 脱氢酶复合体与嵌膜的复合体 II
                  尺寸超出「同屏 ≤2 大模型」约束。未验证结构不上图。
                </div>
              </div>
            ) : (
              <div className="d-body">
                <div className="d-placeholder">
                  点击环上的步骤弧、酶名或代谢物节点，此处显示该步的反应式、酶、ΔG 与立体化学。乙酰-CoA 入口（接驳步 PDH）与回补箭头旁的说明亦可点击。
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
                <div className="s-lbl">NADH</div>
                <div className="s-val t num">+3 / 轮</div>
                <div className="s-sub num">第 Ⅲ · Ⅳ · Ⅷ 步</div>
              </div>
              <div>
                <div className="s-lbl">FADH₂</div>
                <div className="s-val t num">+1 / 轮</div>
                <div className="s-sub num">第 Ⅵ 步（复合体 II）</div>
              </div>
              <div>
                <div className="s-lbl">GTP</div>
                <div className="s-val a num">+1 / 轮</div>
                <div className="s-sub num">第 Ⅴ 步 · 底物水平磷酸化</div>
              </div>
              <div>
                <div className="s-lbl">CO₂</div>
                <div className="s-val num">+2 / 轮</div>
                <div className="s-sub num">第 Ⅲ · Ⅳ 步（第一轮 CO₂ 均来自 OAA 碳）</div>
              </div>
              <div className="settle-rule" />
              <div className="settle-net">
                <span className="n-lbl">每葡萄糖两轮 ×2</span>
                <span className="n-val num">
                  <span className="t">+6 NADH</span> · <span className="t">+2 FADH₂</span> · <span className="a">+2 GTP</span> · +4 CO₂
                </span>
              </div>
            </div>
          </div>
        </aside>
      </div>

      <div className="poster-foot">
        {TODO_NOTES_TCA.map((n) => (
          <span key={n}>待确认：{n}<br /></span>
        ))}
      </div>
    </div>
  );
}
