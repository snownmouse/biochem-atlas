// Cori 循环挂图（PLATE 07 / 12）。
// 本页的硬约束：循环没有自己的酶，13 条引用步全部指向既有通路数据，0 条反应式被复制。
// 页面主体 = 器官两列 + 血流带 + 能量/氧化还原账本；点击引用步只显示“本循环里的角色”，
// 真正的反应式留在既有糖酵解 / 糖异生页面（右栏给下划线跳转，不复制详情）。
import { useCallback, useEffect, useRef, useState } from "react";
import type { MouseEvent as ReactMouseEvent } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import coriJson from "../data/cori/cori.json";
import skelJson from "../data/cori/skeleton.json";
import type { ArmStep, CoriData, CoriSkeleton } from "../data/cori/types";
import PathwaySwitcher from "../components/PathwaySwitcher";
import { PathwayRailFoot } from "../components/PathwayRail";
import PlateInteraction from "../components/PlateInteraction";
import glyJson from "../data/glycolysis.json";
import gluJson from "../data/gluconeogenesis/gluconeogenesis.json";
import gluSkelJson from "../data/gluconeogenesis/skeleton.json";

const data = coriJson as unknown as CoriData;
const skel = skelJson as unknown as CoriSkeleton;

const gly = glyJson as unknown as { steps: any[]; sideBranchSteps: any[] };
const glu = gluJson as unknown as { steps: any[]; sideBranchSteps: any[] };
const gluSkel = gluSkelJson as unknown as { transportSteps: any[] };

/* 四色封顶（与既有挂图同款） */
const INK = "#22282A";
const AMBER = "#B4761F";
const TEAL = "#2E6E6B";
const BRICK = "#9C4A3C";
const PAPER = "#F6F3EC";

const ROMAN = ["Ⅰ", "Ⅱ", "Ⅲ", "Ⅳ", "Ⅴ", "Ⅵ", "Ⅶ", "Ⅷ", "Ⅸ", "Ⅹ", "Ⅺ"];
const roman = (n: number | null | undefined) => (n ? ROMAN[n - 1] ?? String(n) : "接");

const W = skel.canvas.width;
const H = skel.canvas.height;

/* ---------- 引用步 → 既有数据（唯一事实源，本页不存酶名 / 反应式） ---------- */

type Resolved = {
  pathway: "glycolysis" | "gluconeogenesis";
  stepId: string;
  direction: "forward" | "reverse";
  index: number | null;
  name: string;
  enzyme: string;
  isTransport: boolean;
};

const glyMap = new Map<string, any>([...gly.steps, ...gly.sideBranchSteps].map((s) => [s.id, s]));
const gluMap = new Map<string, any>([...glu.steps, ...glu.sideBranchSteps].map((s) => [s.id, s]));
const gluTransportMap = new Map<string, any>(gluSkel.transportSteps.map((s) => [s.id, s]));

const resolveRef = (step: ArmStep): Resolved | null => {
  if (!step.source) return null;
  const { pathway, stepId, direction } = step.source;
  const src =
    pathway === "glycolysis" ? glyMap.get(stepId) : gluTransportMap.get(stepId) ?? gluMap.get(stepId);
  if (!src) return null;
  const isTransport = !src.enzyme;
  return {
    pathway,
    stepId,
    direction,
    index: src.index ?? null,
    name: src.name,
    enzyme: src.enzyme?.name ?? "",
    isTransport,
  };
};

const refOf = (id: string): { step: ArmStep; resolved: Resolved | null } | null => {
  for (const arm of data.arms) {
    const step = arm.steps.find((s) => s.id === id);
    if (step) return { step, resolved: resolveRef(step) };
  }
  return null;
};

const sourceLabel = (step: ArmStep) => {
  if (step.kind === "transport") return `本循环连接件 · ${step.id.includes("mct") ? "MCT" : "转运"}`;
  const r = resolveRef(step);
  if (!r) return "来源缺失";
  const base = r.pathway === "glycolysis" ? "糖酵解" : "糖异生";
  const no = r.isTransport ? "转运" : r.index ? roman(r.index) : "接口";
  const tail = r.direction === "reverse" ? "（逆向）" : "";
  return `${base} ${no} · ${r.stepId}${tail}`;
};

const jumpHref = (resolved: Resolved | null) => {
  if (!resolved) return null;
  return `/pathway/${resolved.pathway}?step=${resolved.stepId}`;
};

const energyText = (e: NonNullable<ArmStep["energy"]>) =>
  `${e.item} ${e.sign > 0 ? "+" : "−"}${e.count}`;

/* ---------- 账本求和（页面显示值全部由 entries 计算，不手写第二份数字） ---------- */

const ledgerSums = (() => {
  const m: Record<string, number> = { muscle: 0, liver: 0 };
  for (const e of data.energyLedger.entries) {
    m[e.arm] += e.sign * e.count * (e.item === "NADH" ? 0 : 1);
  }
  return { muscle: m.muscle, liver: m.liver, whole: m.muscle + m.liver };
})();

/* ---------- 节点标签位 ---------- */

const NODE_LABEL_DX: Record<string, { dx: number; dy: number; anchor: "start" | "end" | "middle" }> = {
  left: { dx: -26, dy: 4, anchor: "end" },
  right: { dx: 26, dy: 4, anchor: "start" },
  above: { dx: 0, dy: -26, anchor: "middle" },
  below: { dx: 0, dy: 30, anchor: "middle" },
};

export default function CoriOverviewPage() {
  const params = useParams();
  const [search, setSearch] = useSearchParams();
  const pathwayId = params.pathwayId ?? "cori";
  if (pathwayId !== data.id) {
    return <div className="page">未知通路：{pathwayId}</div>;
  }

  const stepParam = search.get("step");
  const selected = stepParam ? refOf(stepParam) : null;
  const selectedId = selected ? selected.step.id : null;

  const selectStep = useCallback(
    (id: string | null) => {
      const next = new URLSearchParams(search);
      if (id) next.set("step", id);
      else next.delete("step");
      setSearch(next, { replace: true });
    },
    [search, setSearch]
  );

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

  /* 画布横向漫游：与糖异生 / TCA 同款 Shift+滚轮 */
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

  /* 点击语义：先判 .q-hide（自测揭晓，不选中），再分别 closest 步骤组 / 节点组 */
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
        selectStep(stepId === selectedId ? null : stepId);
        return;
      }
      const nodeId = el.closest("[data-node-id]")?.getAttribute("data-node-id");
      if (nodeId) {
        const mapped = skel.nodes.find((n) => n.id === nodeId)?.stepId;
        if (mapped) selectStep(mapped === selectedId ? null : mapped);
      }
    },
    [selectedId, selectStep, quizOn]
  );

  const chipClass = (id: string) => {
    const cls = ["cori-chip"];
    if (selectedId === id) cls.push("sel");
    else if (selectedId) cls.push("faded");
    return cls.join(" ");
  };
  const nodeClass = (stepId: string) => {
    const cls = ["cori-node"];
    if (selectedId === stepId) cls.push("hl");
    else if (selectedId) cls.push("faded");
    return cls.join(" ");
  };

  const selectedResolved = selected?.resolved ?? null;
  const selectedNote = selected?.step.note ?? "";
  const selectedEnergy = selected?.step.energy;

  return (
    <div className="poster cori-poster">
      {/* ===== 通路切换器（全站统一，替代原手写面包屑） ===== */}
      <PathwaySwitcher current="cori" context={selected ? selected.step.label : undefined} />

      {/* ===== 报头 ===== */}
      <header className="masthead">
        <div className="mast-top">
          <span className="kicker">代谢通路挂图 · METABOLIC WALL CHART</span>
          <span className="plate-no num">{data.plateNo} · 第一版 · 2026</span>
        </div>
        <div className="mast-main">
          <h1>
            {data.name}
            <small>CORI CYCLE — 两个器官、一个方向相反的回路：肌肉把碳丢成乳酸，肝花 6 个高能键把它捡回来</small>
          </h1>
          <p className="mast-summary">
            本循环<b>没有自己的酶</b>：肌肉侧是糖酵解的末端 + LDH 还原，肝侧是糖异生的入口 + 绕道。
            页面只画<b className="num">{data.thesis.referenceCount}</b> 条引用步、<b className="num">0</b> 条重绘反应式，
            其余全是物流与账本——每 1 葡萄糖循环一轮，净耗 <b className="num">4</b> 个高能磷酸键。
          </p>
        </div>
      </header>

      {/* ===== 图例 ===== */}
      <div className="legend">
        <span className="lg">
          <svg width="46" height="10" aria-hidden>
            <line x1="0" y1="5" x2="46" y2="5" stroke={BRICK} strokeWidth="1.4" />
            <path d="M0,1 L6,5 L0,9 Z" fill={BRICK} />
          </svg>
          血流方向（乳酸 / 葡萄糖，方向相反）
        </span>
        <span className="lg">
          <svg width="46" height="10" aria-hidden>
            <line x1="0" y1="5" x2="46" y2="5" stroke={INK} strokeDasharray="4 3" />
          </svg>
          引用序列（只表示阅读顺序，不画反应）
        </span>
        <span className="lg">
          <svg width="46" height="10" aria-hidden>
            <rect x="2" y="1" width="42" height="8" fill="none" stroke={INK} strokeWidth="1" />
          </svg>
          转运连接件（不属既有两条通路）
        </span>
        <span className="lg">
          <span style={{ color: AMBER, fontWeight: 700 }}>琥珀</span>＝ATP / GTP
          <span style={{ margin: "0 6px", color: TEAL, fontWeight: 700 }}>青</span>＝NADH
        </span>
        {quizOn && <span className="lg quiz-hint">自测中 · 引用步名与代谢物名已隐藏 · 悬停或点击揭晓</span>}
        <span className="lg legend-hint">1440 视口两器官基本同屏（约 45px 需横向拖动）· 更窄视口可拖动或 Shift+滚轮漫游</span>
      </div>

      {/* ===== 主体 ===== */}
      <div className="body-grid">
        <div className="plate-wrap">
          <div className="plate-head">
            <span className="t">图 1 · 器官两列 + 血流带：引用步只给“本循环里的角色”，不重绘反应</span>
            <PlateInteraction svgRef={plateSvgRef} />
            <span className="organ-switch">
              <button
                type="button"
                aria-pressed={quizOn}
                className={`organ-tab quiz-toggle${quizOn ? " active" : ""}`}
                onClick={toggleQuiz}
                title="隐藏引用步名与代谢物名，悬停或点击揭晓"
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
                data-lanes="blood,liver-cytosol,liver-matrix,liver-er,muscle-cytosol,muscle-matrix"
                data-cori-plate="1"
              >
                <defs>
                  <marker id="cori-ah-ink" markerWidth="9" markerHeight="8" refX="8" refY="4" orient="auto">
                    <path d="M0,0.5 L8.5,4 L0,7.5 Z" fill={INK} />
                  </marker>
                  <marker id="cori-ah-brick" markerWidth="10" markerHeight="9" refX="9" refY="4.5" orient="auto">
                    <path d="M0,0.5 L9.5,4.5 L0,8.5 Z" fill={BRICK} />
                  </marker>
                </defs>

                {/* 角落锚点 */}
                <g stroke={INK} strokeWidth={1} opacity={0.45}>
                  <path d="M20,12 V28 M12,20 H28" />
                  <path d={`M${W - 20},12 V28 M${W - 28},20 H${W - 12}`} />
                  <path d={`M20,${H - 28} V${H - 12} M12,${H - 20} H28`} />
                  <path d={`M${W - 20},${H - 28} V${H - 12} M${W - 28},${H - 20} H${W - 12}`} />
                </g>

                {/* ===== 区室带 ===== */}
                {skel.compartments.map((c) => {
                  const w = c.band.x1 - c.band.x0;
                  const h = c.band.y1 - c.band.y0;
                  const onRight = c.id.startsWith("muscle-");
                  return (
                    <g key={c.id} data-compartment={c.id}>
                      <rect
                        x={c.band.x0}
                        y={c.band.y0}
                        width={w}
                        height={h}
                        fill={INK}
                        opacity={c.tint}
                      />
                      <rect
                        x={c.band.x0}
                        y={c.band.y0}
                        width={w}
                        height={h}
                        fill="none"
                        stroke={INK}
                        strokeWidth={c.id === "blood" ? 1 : 0.6}
                        strokeDasharray={c.muted ? "3 3" : undefined}
                        opacity={c.id === "blood" ? 0.55 : 0.35}
                      />
                      <text
                        x={onRight ? c.band.x1 - 8 : c.band.x0 + 8}
                        y={c.band.y0 + 20}
                        textAnchor={onRight ? "end" : "start"}
                        fontSize={c.id === "blood" ? 10.5 : 9.5}
                        letterSpacing={c.id === "blood" ? 2.2 : 1.4}
                        fontWeight={700}
                        opacity={c.muted ? 0.45 : 0.72}
                      >
                        {c.name}
                      </text>
                    </g>
                  );
                })}

                {/* ===== 器官列标题 ===== */}
                <g data-organ-column="liver">
                  <text x={20} y={110} fontSize={22} fontWeight={700} className="serif" fill={INK}>
                    肝 · 回收端
                  </text>
                  <text x={20} y={128} fontSize={9} letterSpacing={2.4} opacity={0.55}>
                    LIVER · CORI END
                  </text>
                  <text x={282} y={110} fontSize={10.5} textAnchor="end" opacity={0.7} className="num">
                    2 Lac → 1 Glc
                  </text>
                  <text x={282} y={126} fontSize={9.2} textAnchor="end" opacity={0.5}>
                    花 6 个高能键
                  </text>
                </g>
                <g data-organ-column="muscle">
                  <text x={684} y={110} fontSize={22} fontWeight={700} className="serif" fill={INK}>
                    骨骼肌 · 产出端
                  </text>
                  <text x={684} y={128} fontSize={9} letterSpacing={2.4} opacity={0.55}>
                    MUSCLE · LACTATE PRODUCER
                  </text>
                  <text x={982} y={110} fontSize={10.5} textAnchor="end" opacity={0.7} className="num">
                    1 Glc → 2 Lac
                  </text>
                  <text x={982} y={126} fontSize={9.2} textAnchor="end" opacity={0.5}>
                    净得 2 ATP
                  </text>
                </g>

                {/* ===== 血流带：两条方向相反的物流 ===== */}
                <g data-blood-band="1">
                  <text x={296} y={140} fontSize={9.2} opacity={0.55} letterSpacing={1.6}>
                    跨器官 · 不穿细胞膜
                  </text>
                  <path
                    d={skel.blood.glucose.path}
                    fill="none"
                    stroke={INK}
                    strokeWidth={1.5}
                    markerEnd="url(#cori-ah-ink)"
                    data-blood-flow="glucose"
                    data-flow-dir="ltr"
                  />
                  <path
                    d={skel.blood.lactate.path}
                    fill="none"
                    stroke={BRICK}
                    strokeWidth={1.7}
                    markerEnd="url(#cori-ah-brick)"
                    data-blood-flow="lactate"
                    data-flow-dir="rtl"
                  />
                  <text
                    x={skel.blood.glucose.labelX}
                    y={skel.blood.glucose.labelY}
                    fontSize={10}
                    textAnchor={skel.blood.glucose.labelAnchor}
                    fontWeight={700}
                    className="q-hide st-name"
                    data-flow-label="glucose"
                  >
                    葡萄糖 · 肝 → 肌
                  </text>
                  <text
                    x={skel.blood.glucose.labelX}
                    y={skel.blood.glucose.labelY + 13}
                    fontSize={9.2}
                    textAnchor={skel.blood.glucose.labelAnchor}
                    opacity={0.55}
                  >
                    GLUT2 出肝 → GLUT 入肌
                  </text>
                  <text
                    x={skel.blood.lactate.labelX}
                    y={skel.blood.lactate.labelY}
                    fontSize={10}
                    textAnchor={skel.blood.lactate.labelAnchor}
                    fontWeight={700}
                    fill={BRICK}
                    className="q-hide st-name"
                    data-flow-label="lactate"
                  >
                    乳酸 · 肌 → 肝
                  </text>
                  <text
                    x={skel.blood.lactate.labelX}
                    y={skel.blood.lactate.labelY + 13}
                    fontSize={9.2}
                    textAnchor={skel.blood.lactate.labelAnchor}
                    opacity={0.55}
                  >
                    MCT4 出肌 → MCT1 入肝
                  </text>
                </g>

                {/* 红细胞：第三来源单列在血液带内 */}
                <g data-rbc-source="1">
                  <rect
                    x={skel.blood.rbc.x}
                    y={skel.blood.rbc.y}
                    width={skel.blood.rbc.width}
                    height={skel.blood.rbc.height}
                    fill={PAPER}
                    stroke={INK}
                    strokeWidth={1}
                    strokeDasharray="4 3"
                  />
                  <text x={skel.blood.rbc.x + 14} y={skel.blood.rbc.y + 24} fontSize={11} fontWeight={700} className="q-hide st-name">
                    红细胞（无线粒体）
                  </text>
                  <text x={skel.blood.rbc.x + 14} y={skel.blood.rbc.y + 42} fontSize={9} opacity={0.65}>
                    糖酵解终点恒为乳酸
                  </text>
                  <text x={skel.blood.rbc.x + 14} y={skel.blood.rbc.y + 58} fontSize={9.2} opacity={0.5}>
                    第三来源 · 不画完整臂
                  </text>
                  <text x={skel.blood.rbc.x + 14} y={skel.blood.rbc.y + 78} fontSize={9.2} opacity={0.5}>
                    静息血乳酸贡献比例未核实
                  </text>
                  <path
                    d={skel.blood.rbc.arrow}
                    fill="none"
                    stroke={INK}
                    strokeWidth={1}
                    strokeDasharray="4 3"
                    markerEnd="url(#cori-ah-ink)"
                  />
                  <text x={skel.blood.rbc.x + 14} y={skel.blood.rbc.y + 128} fontSize={9.2} opacity={0.6}>
                    红细胞 → 血乳酸
                  </text>
                </g>

                {/* ===== 引用序列脊线（虚线，只表示阅读顺序） ===== */}
                {skel.arms.map((arm) => (
                  <path
                    key={arm.organId}
                    d={arm.spine}
                    fill="none"
                    stroke={INK}
                    strokeWidth={0.9}
                    strokeDasharray="4 3"
                    opacity={0.45}
                    data-ref-spine={arm.organId}
                  />
                ))}

                {/* ===== 代谢物节点 ===== */}
                <g fontSize={12} fontWeight={700} textAnchor="middle">
                  {skel.nodes.map((n) => {
                    const lp = NODE_LABEL_DX[n.side ?? "right"];
                    return (
                      <g
                        key={n.id}
                        className={nodeClass(n.stepId)}
                        data-node-id={n.id}
                        data-node-step={n.stepId}
                        style={{ cursor: "pointer" }}
                      >
                        <circle cx={n.x} cy={n.y} r={16} fill={PAPER} stroke={INK} strokeWidth={1.1} />
                        <text className="q-hide" x={n.x} y={n.y + 4} fontSize={9.5}>
                          {n.abbr}
                        </text>
                        <text
                          className="q-hide"
                          x={n.x + lp.dx}
                          y={n.y + lp.dy}
                          fontSize={9.5}
                          fontWeight={400}
                          textAnchor={lp.anchor}
                          opacity={0.72}
                        >
                          {n.label}
                        </text>
                      </g>
                    );
                  })}
                </g>

                {/* ===== 引用步 ===== */}
                {skel.arms.map((arm) =>
                  arm.chips.map((chip) => {
                    const item = refOf(chip.stepId);
                    if (!item) return null;
                    const { step, resolved } = item;
                    const isTransport = step.kind === "transport";
                    const anchor = chip.anchor;
                    const href = jumpHref(resolved);
                    const ruleX1 = anchor === "end" ? chip.x - 100 : chip.x;
                    const ruleX2 = anchor === "end" ? chip.x : anchor === "start" ? chip.x + 100 : chip.x + 50;
                    return (
                      <g
                        key={step.id}
                        className={chipClass(step.id)}
                        data-step-id={step.id}
                        data-cori-chip="1"
                        data-ref-pathway={step.source?.pathway ?? ""}
                        data-ref-step-id={step.source?.stepId ?? ""}
                        data-ref-direction={step.source?.direction ?? ""}
                        data-ref-href={href ?? ""}
                        data-chip-organ={arm.organId}
                        style={{ cursor: "pointer" }}
                      >
                        <line
                          x1={anchor === "end" ? ruleX1 : anchor === "middle" ? chip.x - 50 : chip.x}
                          y1={chip.y + 24}
                          x2={ruleX2}
                          y2={chip.y + 24}
                          stroke={INK}
                          strokeWidth={0.8}
                          opacity={0.35}
                        />
                        <circle cx={chip.x} cy={chip.y - 9} r={2.4} fill={isTransport ? PAPER : INK} stroke={INK} strokeWidth={0.8} />
                        <text
                          x={chip.x}
                          y={chip.y}
                          fontSize={9}
                          letterSpacing={0.4}
                          textAnchor={anchor}
                          opacity={0.55}
                          className="q-hide cori-ref-src num"
                          data-ref-label={step.source ? `${step.source.pathway}:${step.source.stepId}` : "connector"}
                        >
                          {sourceLabel(step)}
                        </text>
                        <text
                          x={chip.x}
                          y={chip.y + 15}
                          fontSize={12}
                          fontWeight={700}
                          textAnchor={anchor}
                          className="q-hide st-name"
                        >
                          {step.label}
                        </text>
                        {step.energy && (
                          <text
                            x={chip.x}
                            y={chip.y + 30}
                            fontSize={9.5}
                            fontWeight={700}
                            textAnchor={anchor}
                            fill={step.energy.item === "NADH" ? TEAL : AMBER}
                            className="num"
                          >
                            {energyText(step.energy)}
                          </text>
                        )}
                      </g>
                    );
                  })
                )}

                {/* 肌肉线粒体留白注明 */}
                <text x={982} y={558} fontSize={9} textAnchor="end" opacity={0.55}>
                  有氧时 Pyr → PDH → TCA
                </text>
                <text x={982} y={574} fontSize={9.2} textAnchor="end" opacity={0.45}>
                  本带刻意留空
                </text>
              </svg>
            </div>
          </div>

          {/* ===== 单独一块：能量 / 氧化还原账本 ===== */}
          <div className="cori-ledger" data-cori-ledger="1">
            <div className="fn-head">
              <span className="t">账本 · ENERGY &amp; REDOX LEDGER（每 1 葡萄糖循环一轮）</span>
              <span className="view">加法可验 · 不写成一句文案</span>
            </div>
            <div className="cori-ledger-sum">
              <div className="ls-cell">
                <span className="ls-lbl">肌肉臂</span>
                <b className="ls-val num">+{ledgerSums.muscle}</b>
                <span className="ls-unit">ATP</span>
                <span className="ls-sub">糖酵解净得</span>
              </div>
              <div className="ls-op num">−</div>
              <div className="ls-cell">
                <span className="ls-lbl">肝臂</span>
                <b className="ls-val num">{Math.abs(ledgerSums.liver)}</b>
                <span className="ls-unit">高能键</span>
                <span className="ls-sub">4 ATP + 2 GTP</span>
              </div>
              <div className="ls-op num">=</div>
              <div className="ls-cell net" data-ledger-net={String(ledgerSums.whole)}>
                <span className="ls-lbl">全身净额</span>
                <b className="ls-val num">−{Math.abs(ledgerSums.whole)}</b>
                <span className="ls-unit">高能键</span>
                <span className="ls-sub">由肝替肌肉还债</span>
              </div>
            </div>
            <div className="cori-ledger-eq num" data-ledger-eq="1">
              +{ledgerSums.muscle} − {Math.abs(ledgerSums.liver)} = −{Math.abs(ledgerSums.whole)}
            </div>
            <div className="cori-ledger-derivation">
              {data.energyLedger.derivation.map((line, i) => (
                <div key={i} className="num">{line}</div>
              ))}
            </div>

            <div className="cori-subhead">
              <span className="t">逐项账目 · 指向既有步骤（点击跳转）</span>
            </div>
            <table className="organs cori-ledger-table" data-ledger-table="1">
              <thead>
                <tr>
                  <th style={{ width: 82 }}>臂</th>
                  <th style={{ width: 210 }}>来源步</th>
                  <th style={{ width: 70 }}>币种</th>
                  <th style={{ width: 70 }}>数量</th>
                  <th>说明</th>
                </tr>
              </thead>
              <tbody>
                {data.energyLedger.entries.map((e) => {
                  const r = e.source.pathway === "cori" ? null : { pathway: e.source.pathway, stepId: e.source.stepId };
                  const href = r ? `/pathway/${r.pathway}?step=${r.stepId}` : null;
                  return (
                    <tr key={e.id} data-ledger-entry={e.id}>
                      <td className="num">{e.arm === "muscle" ? "肌" : "肝"}</td>
                      <td className="num">
                        {href ? (
                          <Link to={href} className="cori-inline-link">
                            {e.source.pathway === "glycolysis" ? "糖酵解" : "糖异生"} · {e.source.stepId}
                          </Link>
                        ) : (
                          e.source.stepId
                        )}
                      </td>
                      <td className="num">{e.item}</td>
                      <td className="num" style={{ color: AMBER, fontWeight: 700 }}>
                        {e.sign > 0 ? "+" : "−"}
                        {e.count}
                      </td>
                      <td>{e.note}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            <div className="cori-subhead" style={{ marginTop: 18 }}>
              <span className="t">氧化还原账 · NADH 的归属（净 0，不跨器官搬运）</span>
            </div>
            <table className="organs" data-redox-table="1">
              <thead>
                <tr>
                  <th style={{ width: 82 }}>臂</th>
                  <th style={{ width: 200 }}>产 NADH</th>
                  <th style={{ width: 200 }}>耗 NADH</th>
                  <th style={{ width: 70 }}>净额</th>
                  <th>出处</th>
                </tr>
              </thead>
              <tbody>
                {data.redoxLedger.entries.map((r) => (
                  <tr key={r.arm} data-redox-row={r.arm} data-redox-net={r.net}>
                    <td className="num">{r.arm === "muscle" ? "肌" : "肝"}</td>
                    <td className="num">
                      {r.produced.source.pathway === "cori"
                        ? r.produced.source.stepId
                        : `${r.produced.source.pathway === "glycolysis" ? "糖酵解" : "糖异生"} · ${r.produced.source.stepId}`}
                      {"　+"}
                      {r.produced.count}
                    </td>
                    <td className="num">
                      {r.consumed.source.pathway === "cori"
                        ? r.consumed.source.stepId
                        : `${r.consumed.source.pathway === "glycolysis" ? "糖酵解" : "糖异生"} · ${r.consumed.source.stepId}`}
                      {"　−"}
                      {r.consumed.count}
                    </td>
                    <td className="num" data-redox-net-cell={r.net} style={{ color: TEAL, fontWeight: 700 }}>
                      {r.net}
                    </td>
                    <td>{r.note}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="cori-noloop" data-no-loop="1">
              <span className="lbl">如果不循环会怎样</span>
              <p>{data.energyLedger.noLoop}</p>
            </div>
          </div>

          {/* ===== 脚注：空间说明 + 引用清单 + 误读 ===== */}
          <div className="footnote">
            <div className="fn-head">
              <span className="t">空间读法 · SPATIAL NOTE</span>
            </div>
            <p style={{ fontSize: 12, lineHeight: 1.9, margin: "0 0 18px" }}>{skel.spatialNote}</p>

            <div className="fn-head">
              <span className="t">表 1 · 两条臂的引用清单（共 {data.thesis.referenceCount} 条 · 0 条重绘反应式）</span>
              <span className="view">点击行 = 右侧详情</span>
            </div>
            <table className="organs" data-ref-table="1">
              <thead>
                <tr>
                  <th style={{ width: 92 }}>臂</th>
                  <th style={{ width: 230 }}>引用来源</th>
                  <th style={{ width: 150 }}>本页角色</th>
                  <th style={{ width: 100 }}>能量</th>
                  <th>本循环里的意义（非源页面详情）</th>
                </tr>
              </thead>
              <tbody>
                {data.arms.flatMap((arm) =>
                  arm.steps.map((s) => (
                    <tr
                      key={s.id}
                      data-ref-row={s.id}
                      data-plate-row={s.id}
                      style={{ cursor: "pointer" }}
                      onClick={() => selectStep(s.id === selectedId ? null : s.id)}
                    >
                      <td className="num">{arm.organId === "muscle" ? "肌" : "肝"}</td>
                      <td className="num">{sourceLabel(s)}</td>
                      <td>{s.label}</td>
                      <td className="num" style={{ color: s.energy?.item === "NADH" ? TEAL : s.energy ? AMBER : undefined, fontWeight: 700 }}>
                        {s.energy ? energyText(s.energy) : "—"}
                      </td>
                      <td>{s.note}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
            <div className="cori-footnote-note">
              引用步只出现在表 1 与图上标签里：本页没有为任何一步写第二份 enzyme / equation / significance。
              被引用的反应式仍在原通路页面，右栏“跳到原页面”是唯一下钻入口。
            </div>

            <div className="fn-head" style={{ marginTop: 22 }}>
              <span className="t">表 2 · 常见误读（分级标注）</span>
            </div>
            <table className="organs" data-misread-table="1">
              <thead>
                <tr>
                  <th style={{ width: 230 }}>说法</th>
                  <th>本页口径</th>
                  <th style={{ width: 70 }}>等级</th>
                </tr>
              </thead>
              <tbody>
                {data.misreads.map((m) => (
                  <tr key={m.title}>
                    <td>{m.title}</td>
                    <td>{m.text}</td>
                    <td style={{ color: m.grade === "未核实" ? BRICK : INK, fontWeight: 700 }}>{m.grade}</td>
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
              <span className="en">DETAIL · 点击图上任一引用步</span>
            </div>
            {selected ? (
              <div className="d-body" data-ref-detail={selected.step.id}>
                <div className="d-step">
                  <span className="no serif num">
                    {!selectedResolved
                      ? "运"
                      : selectedResolved.isTransport
                        ? "运"
                        : selectedResolved.index
                          ? roman(selectedResolved.index)
                          : "接"}
                  </span>
                  {selected.step.label}
                  <span className="d-tag">
                    {selectedResolved?.direction === "reverse" ? "引用 · 逆向" : "引用步"}
                  </span>
                  {selected.step.kind === "transport" && <span className="d-tag">连接件 · 非酶促</span>}
                </div>
                <div className="d-enzyme">
                  {selectedResolved?.enzyme || "膜转运 / 载体"}
                  <span className="d-iso"> — {selectedResolved?.name ?? "MCT 乳酸转运体"}</span>
                </div>
                {selectedResolved ? (
                  <div className="d-cof">
                    <b>来源</b>　{selectedResolved.pathway === "glycolysis" ? "糖酵解" : "糖异生"} ·{" "}
                    <span className="num">{selectedResolved.stepId}</span>
                    {"　"}
                    <b>方向</b>　{selectedResolved.direction === "reverse" ? "逆向（本循环方向）" : "正向"}
                  </div>
                ) : (
                  <div className="d-cof">
                    <b>来源</b>　本循环连接件 · 不属糖酵解 / 糖异生
                  </div>
                )}
                {selectedEnergy && (
                  <div className="d-cof">
                    <b>能量标签</b>　
                    <span style={{ color: selectedEnergy.item === "NADH" ? TEAL : AMBER, fontWeight: 700 }} className="num">
                      {energyText(selectedEnergy)}
                    </span>
                    <span style={{ opacity: 0.55 }}>（每 1 葡萄糖一轮）</span>
                  </div>
                )}
                <div className="d-sig">{selectedNote}</div>
                {selectedResolved?.direction === "reverse" && (
                  <div className="d-none" data-reverse-note="1">
                    糖异生数据把 gn-cori 记录为 lac → pyr；本循环肌肉侧是它的逆向（pyr → lac）。两者不是矛盾，而是同一个酶在两个器官里的两种方向。
                  </div>
                )}
                {selected.step.kind === "transport" ? (
                  <span className="frames-entry-none" data-testid="cori-transport-none" aria-disabled="true">
                    转运连接件不是酶促反应 · 无既有步骤可跳
                  </span>
                ) : (
                  (() => {
                    const href = jumpHref(selectedResolved);
                    return href ? (
                      <Link className="frames-entry" data-ref-link={selected.step.id} data-ref-step={selectedResolved?.stepId} to={href}>
                        跳到原页面查看反应详情 →
                      </Link>
                    ) : null;
                  })()
                )}
                <div className="d-none" data-cori-no-equation="1">
                  本页不复制反应式、酶学参数或 ΔG：以上只描述该步在 Cori 循环中的角色。原页面才是反应详情的事实源。
                </div>
              </div>
            ) : (
              <div className="d-body">
                <div className="d-placeholder">
                  点击图上任一引用步或代谢物节点，这里只显示<b>它在 Cori 循环里的角色</b>、能量标签与跳转入口；
                  反应式、酶学参数与 ΔG 留在糖酵解 / 糖异生原页面。
                </div>
                <div className="cori-three-mis" data-three-misalignments="1">
                  <div>
                    <span className="lbl">① 器官错位</span>
                    肌肉产、肝收。同一个 Lac 在图上出现两次：右端是“出肌”，左端是“入肝”，中间隔着血液带。
                  </div>
                  <div>
                    <span className="lbl">② 区室错位</span>
                    乳酸不穿线粒体膜；进入肝后必须先在胞质被 LDH 氧化，丙酮酸再过 MPC 入基质被 PC 羧化。
                  </div>
                  <div>
                    <span className="lbl">③ 氧化还原错位（最难看出来）</span>
                    肌肉的 NADH 被 LDH 就地消耗，肝的 NADH 又被 GAPDH 逆向消耗；整轮 NADH 净 0。
                    图上用青色标签把“产”和“耗”钉在同一对步骤上，并在账本里单列。
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="panel-block">
            <div className="pb-title">
              <span>账本速览</span>
              <span className="en">LEDGER · 每 1 葡萄糖</span>
            </div>
            <div className="settle cori-settle" data-ledger-summary="1">
              <div>
                <div className="s-lbl">肌肉</div>
                <div className="s-val a num">+{ledgerSums.muscle} ATP</div>
                <div className="s-sub num">gk-1 / gk-3 / gk-7 / gk-10</div>
              </div>
              <div>
                <div className="s-lbl">肝</div>
                <div className="s-val a num">−{Math.abs(ledgerSums.liver)} 高能键</div>
                <div className="s-sub num">gn-1 / gn-2 / gn-5</div>
              </div>
              <div>
                <div className="s-lbl">全身净额</div>
                <div className="s-val t num">−{Math.abs(ledgerSums.whole)} 高能键</div>
                <div className="s-sub num">{ledgerSums.muscle} − {Math.abs(ledgerSums.liver)} = −{Math.abs(ledgerSums.whole)}</div>
              </div>
              <div className="settle-rule" />
              <div className="settle-net" data-ledger-net={String(ledgerSums.whole)}>
                <span className="n-lbl">净耗</span>
                <span className="n-val num">{Math.abs(ledgerSums.whole)} 个高能磷酸键</span>
              </div>
            </div>
            <div className="d-none" style={{ borderTop: "none", paddingTop: 0 }}>
              {data.energyLedger.basis}
            </div>
          </div>

          <div className="panel-block">
            <div className="pb-title">
              <span>两条臂的分工</span>
              <span className="en">ARMS · REFERENCE ONLY</span>
            </div>
            {data.arms.map((arm) => (
              <div key={arm.organId} className="cori-arm-card" data-arm-summary={arm.organId}>
                <div className="cori-arm-title">
                  {arm.title}
                  <span className="cori-arm-count num">{arm.steps.length} 条引用</span>
                </div>
                <div className="cori-arm-flow num">{arm.flow}</div>
                <div className="cori-arm-steps">
                  {arm.steps.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      className="cori-arm-step"
                      data-arm-step={s.id}
                      onClick={() => selectStep(s.id === selectedId ? null : s.id)}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>
            ))}
            <div className="cori-count-note" data-ref-count-note="1">
              两条臂共 <b className="num">{data.arms.reduce((n, a) => n + a.steps.length, 0)}</b> 条引用；
              糖酵解 10 步、糖异生 11 步中未被引用的步骤没有在本页复述。
            </div>
          </div>

          <div className="panel-block">
            <div className="pb-title">
              <span>3D 口径</span>
              <span className="en">3D · PENDING</span>
            </div>
            <div className="d-none" data-3d-placeholder="1" style={{ borderTop: "none" }}>
              {data.threeD.note}
            </div>
          </div>
        </aside>
      </div>

      <PathwayRailFoot current="cori" />
      <div className="poster-foot">
        <span>
          口径：本页 13 条引用步全部来自 glycolysis.json / gluconeogenesis.json / 其 skeleton.json；
          页面不存储第二份酶名、反应式或意义文本，validate-cori 会拒绝任何复制字段。<br />
        </span>
        <span>
          待确认：红细胞对静息血乳酸贡献的比例未核实到唯一一手数字，页面只写“稳定来源”；肾皮质糖异生份额同样未定。<br />
        </span>
        <span>
          3D：整循环是器官物流与能量转移，没有结合姿态可展示；本页不做 3D，不给资产路径。
        </span>
      </div>
    </div>
  );
}
