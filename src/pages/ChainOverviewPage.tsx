// ============================================================
// ChainOverviewPage —— 本轮新增 6 张挂图（PLATE 13–18）共用的挂图页
//
// 不新造视觉语言：版式、类名、三态交互、导读、气泡、物质档案入口全部沿用
// 既有挂图页（以 UreaCycleOverviewPage 为模板）；本文件只把“单张图专用”的
// 绘制代码收成一份数据驱动的渲染器，避免六份近千行页面互抄。
//
// 与既有页面的差别只有一处：六张图一律 2D，详情栏不出现 3D 视图与
// “待结构核验”占位，只写一句本平台口径。
// ============================================================
import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import PathwaySwitcher from "../components/PathwaySwitcher";
import { PathwayRailFoot } from "../components/PathwayRail";
import PlateInteraction from "../components/PlateInteraction";
import ReadingGuide from "../components/ReadingGuide";
import MoleculeArchiveEntry from "../components/MoleculeArchiveEntry";
import { comparisonConfigFor } from "../data/comparisonConfig";
import { gradesForStep, GRADE_LABEL } from "../data/evidenceGrade";
import { stepEntryById } from "../data/stepIndex";
import type { NavItemId } from "../data/pathways";
import type {
  ChainAnnotation,
  ChainData,
  ChainLink,
  ChainNode,
  ChainSkeleton,
  ChainStep,
} from "../data/chain/types";

const PAPER = "#F6F3EC";
const INK = "#22282A";
const TEAL = "#2E6E6B";
const BRICK = "#9C4A3C";
const AMBER = "#B4761F";
const R = 26;
const MACHINE_W = 64;
const MACHINE_H = 26;
const CIRCLE_NO = ["①", "②", "③", "④", "⑤", "⑥", "⑦"];

const toneColor = (tone?: string) =>
  tone === "teal" ? TEAL : tone === "brick" ? BRICK : tone === "amber" ? AMBER : INK;

function boundaryPoint(n: ChainNode, towardX: number, towardY: number) {
  const dx = towardX - n.x;
  const dy = towardY - n.y;
  if (n.kind === "machine") {
    if (Math.abs(dx) >= Math.abs(dy) * 1.6) {
      return { x: n.x + (dx >= 0 ? MACHINE_W / 2 : -MACHINE_W / 2), y: n.y };
    }
    return { x: n.x, y: n.y + (dy >= 0 ? MACHINE_H / 2 : -MACHINE_H / 2) };
  }
  const len = Math.hypot(dx, dy) || 1;
  return { x: n.x + (dx / len) * R, y: n.y + (dy / len) * R };
}

interface CurveGeom {
  d: string;
  mid: { x: number; y: number };
  normal: { x: number; y: number };
}

function curveGeometry(from: ChainNode, to: ChainNode, bend: number): CurveGeom {
  const s = boundaryPoint(from, to.x, to.y);
  const e = boundaryPoint(to, from.x, from.y);
  const dx = e.x - s.x;
  const dy = e.y - s.y;
  const len = Math.hypot(dx, dy) || 1;
  const cx = (s.x + e.x) / 2 - (dy / len) * len * bend;
  const cy = (s.y + e.y) / 2 + (dx / len) * len * bend;
  const mid = { x: (s.x + 2 * cx + e.x) / 4, y: (s.y + 2 * cy + e.y) / 4 };
  return {
    d: `M ${s.x.toFixed(1)} ${s.y.toFixed(1)} Q ${cx.toFixed(1)} ${cy.toFixed(1)} ${e.x.toFixed(1)} ${e.y.toFixed(1)}`,
    mid,
    normal: { x: (-dy / len).toFixed(0) === "0" ? 0 : -dy / len, y: dx / len },
  };
}

function linkStyle(type: ChainLink["type"]) {
  if (type === "main") return { stroke: INK, width: 2.3, dash: undefined, opacity: 1 };
  if (type === "side") return { stroke: BRICK, width: 1.5, dash: "5 4", opacity: 0.8 };
  if (type === "branch") return { stroke: BRICK, width: 1.3, dash: "4 3", opacity: 0.75 };
  if (type === "feed") return { stroke: INK, width: 0.9, dash: "4 3", opacity: 0.52 };
  if (type === "transport") return { stroke: TEAL, width: 1.4, dash: "6 4", opacity: 0.85 };
  return { stroke: TEAL, width: 1.3, dash: "6 4", opacity: 0.78 };
}

interface Props {
  data: ChainData;
  skel: ChainSkeleton;
  pathwayId: NavItemId;
  /** 页头右栏的上下文短句（未选中步骤时显示） */
  idleContext: string;
}

export default function ChainOverviewPage({ data, skel, pathwayId, idleContext }: Props) {
  const plateSvgRef = useRef<SVGSVGElement>(null);
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    const step = q.get("step");
    if (!step) return;
    const isStep = data.steps.some((s) => s.id === step);
    const isTransport = (skel.transportSteps ?? []).some((t) => t.id === step);
    if (isStep || isTransport) setSelected(step);
  }, [data.steps, skel.transportSteps]);

  const select = (id: string) => {
    setSelected(id);
    const url = new URL(window.location.href);
    url.searchParams.set("step", id);
    window.history.replaceState(null, "", url.toString());
  };

  const nodeById = (id: string) => skel.nodes.find((n) => n.id === id) ?? null;

  const stepTargetForNode = (n: ChainNode): string | null => {
    if (n.stepId) return n.stepId;
    const hit = skel.links.find((l) => l.stepId && (l.from === n.id || l.to === n.id));
    return hit?.stepId ?? null;
  };

  const onPlateClick = (e: React.MouseEvent<SVGSVGElement>) => {
    const el = e.target as Element;
    if (el.closest(".q-hide")) return;
    const stepEl = el.closest("[data-step-id]");
    if (stepEl) {
      const id = stepEl.getAttribute("data-step-id");
      if (id) select(id);
      return;
    }
    const nodeEl = el.closest("[data-node-id]");
    if (nodeEl) {
      const nodeId = nodeEl.getAttribute("data-node-id");
      const node = nodeId ? nodeById(nodeId) : null;
      const target = node ? stepTargetForNode(node) : null;
      if (target) select(target);
      return;
    }
    const transportEl = el.closest("[data-transport-id]");
    if (transportEl) {
      const id = transportEl.getAttribute("data-transport-id");
      if (id) select(id);
    }
  };

  const selectedStep = useMemo(
    () => data.steps.find((s) => s.id === selected) ?? null,
    [data.steps, selected],
  );
  const selectedTransport = useMemo(
    () => (skel.transportSteps ?? []).find((t) => t.id === selected) ?? null,
    [skel.transportSteps, selected],
  );

  const cmpConfig = comparisonConfigFor(pathwayId);
  const selectedCmp = useMemo(
    () => (selectedStep && cmpConfig ? cmpConfig.steps.find((s) => s.stepId === selectedStep.id) ?? null : null),
    [cmpConfig, selectedStep],
  );
  const grade = useMemo(() => (selectedCmp ? gradesForStep(selectedCmp) : null), [selectedCmp]);

  const nav = useMemo(() => {
    if (!selectedStep) {
      return { prev: null as string | null, next: data.steps[0]?.id ?? "", prevLabel: "", nextLabel: "从 ① 开始" };
    }
    const i = data.steps.findIndex((s) => s.id === selectedStep.id);
    const prev = i > 0 ? data.steps[i - 1] : null;
    const next = i < data.steps.length - 1 ? data.steps[i + 1] : null;
    return {
      prev: prev?.id ?? null,
      next: next?.id ?? data.steps[0].id,
      prevLabel: prev ? `${CIRCLE_NO[prev.index - 1]} ${prev.shortName}` : "",
      nextLabel: next ? `${CIRCLE_NO[next.index - 1]} ${next.shortName}` : "回到 ①",
    };
  }, [data.steps, selectedStep]);

  const compartmentLabel = (id: string) =>
    skel.compartments.find((c) => c.id === id)?.label ?? id;

  const stepBadges = useMemo(() => {
    const out: { step: ChainStep; x: number; y: number; color: string }[] = [];
    for (const step of data.steps) {
      const link =
        skel.links.find((l) => l.stepId === step.id && l.type === "main") ??
        skel.links.find((l) => l.stepId === step.id);
      if (!link) continue;
      const from = nodeById(link.from);
      const to = nodeById(link.to);
      if (!from || !to) continue;
      const geom = curveGeometry(from, to, link.bend ?? 0.12);
      out.push({
        step,
        x: geom.mid.x - geom.normal.x * 16,
        y: geom.mid.y - geom.normal.y * 16,
        color: step.irreversible ? INK : TEAL,
      });
    }
    return out;
  }, [data.steps, skel.links, skel.nodes]);

  const renderAnnotation = (a: ChainAnnotation) => (
    <text
      key={`${a.x}-${a.y}-${a.text}`}
      x={a.x}
      y={a.y}
      textAnchor={a.anchor ?? "start"}
      fontSize={a.size ?? 9}
      fill={toneColor(a.tone)}
      opacity={0.8}
    >
      {a.text}
    </text>
  );

  return (
    <>
      <PathwaySwitcher
        current={pathwayId}
        context={
          selectedStep ? (
            <>第 {CIRCLE_NO[selectedStep.index - 1]} 步 · {selectedStep.shortName}</>
          ) : selectedTransport ? (
            <>运输 · {selectedTransport.name}</>
          ) : (
            <>{idleContext}</>
          )
        }
      />

      <div className="poster poster-chain" data-chain-poster={data.id}>
        <header className="masthead">
          <div className="mast-side">
            <span className="plate-no num">{data.plateNo} · {data.structureNo} · 2026</span>
            <span className="mast-en">{data.enName}</span>
          </div>
          <div className="mast-main">
            <h1>
              {data.name}
              <small>{data.heroNote}</small>
            </h1>
            <p className="mast-summary">{data.summary}</p>
          </div>
        </header>

        <div className="legend">
          {data.legend.map((item) => (
            <span className="lg" key={item.text}>
              {item.kind === "badge" ? (
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: 15,
                    height: 15,
                    marginRight: 4,
                    borderRadius: "50%",
                    background: INK,
                    color: PAPER,
                    fontSize: 9,
                    fontWeight: 700,
                  }}
                >
                  1
                </span>
              ) : item.kind === "color" ? (
                <span
                  style={{
                    display: "inline-block",
                    width: 8,
                    height: 8,
                    marginRight: 5,
                    borderRadius: "50%",
                    background: toneColor(item.tone),
                  }}
                />
              ) : (
                <svg width="46" height="10" aria-hidden>
                  <line
                    x1="0"
                    y1="5"
                    x2={item.kind === "main" ? 38 : 42}
                    y2="5"
                    stroke={toneColor(item.tone)}
                    strokeWidth={item.kind === "main" ? 1.9 : 1.3}
                    strokeDasharray={item.kind === "main" ? undefined : item.kind === "dashed" ? "5 4" : "3 3"}
                    opacity={0.85}
                  />
                  <path d={`M${item.kind === "main" ? 38 : 42},1 L46,5 L${item.kind === "main" ? 38 : 42},9 Z`} fill={toneColor(item.tone)} opacity={0.7} />
                </svg>
              )}
              {item.text}
            </span>
          ))}
          <span className="lg legend-hint">横向滚动在图框内（无缩放）</span>
        </div>

        <div className="body-grid">
          <div className="plate-wrap" data-chain-plate="1">
            <div className="plate-head">
              <span className="t">图 1 · {data.name}：{data.steps.length} 步 + {skel.transportSteps?.length ? `${skel.transportSteps.length} 段运输` : "单区室"}</span>
              <PlateInteraction svgRef={plateSvgRef} pathwayId={pathwayId} />
              <span className="legend-hint num">{data.plateNo} · {data.structureNo}</span>
            </div>

            <ReadingGuide
              label={data.readingGuide.label}
              summary={data.readingGuide.summary}
              paragraphs={data.readingGuide.paragraphs}
            />

            <div className="plate-scroll" data-plate-scroll="1">
              <div className="plate-canvas">
                <svg
                  ref={plateSvgRef}
                  width={skel.canvas.width}
                  height={skel.canvas.height}
                  viewBox={`0 0 ${skel.canvas.width} ${skel.canvas.height}`}
                  onClick={onPlateClick}
                  data-frame={data.id}
                  data-lanes={skel.compartments.map((c) => c.id).join(",")}
                  data-step-count={data.steps.length}
                  data-node-count={skel.nodes.length}
                >
                  <defs>
                    {[INK, TEAL, BRICK, AMBER].map((color) => (
                      <marker
                        key={color}
                        id={`chain-ah-${color.replace("#", "")}`}
                        markerWidth="9"
                        markerHeight="8"
                        refX="8"
                        refY="4"
                        orient="auto"
                      >
                        <path d="M0,0.5 L8,4 L0,7.5 Z" fill={color} />
                      </marker>
                    ))}
                  </defs>

                  {/* 区室底板 */}
                  {skel.compartments.map((c) => (
                    <g key={c.id}>
                      <rect
                        x={c.x}
                        y={c.y}
                        width={c.width}
                        height={c.height}
                        fill={INK}
                        opacity={c.tint}
                      />
                      <text x={c.x + 12} y={c.y + 18} fontSize={11} fontWeight={700} fill={INK} opacity={0.8}>
                        {c.label}
                      </text>
                      <text x={c.x + 12} y={c.y + 32} fontSize={8.2} fill={INK} opacity={0.5} letterSpacing="0.12em">
                        {c.en}
                      </text>
                    </g>
                  ))}

                  {/* 运输段点击面：按该运输步骤连线的包围盒生成，不写死坐标 */}
                  {(skel.transportSteps ?? []).map((t) => {
                    const pts = skel.links
                      .filter((l) => l.type === "transport" && l.stepId === t.id)
                      .flatMap((l) => [nodeById(l.from), nodeById(l.to)])
                      .filter((n): n is ChainNode => !!n);
                    if (pts.length === 0) return null;
                    const xs = pts.map((n) => n.x);
                    const ys = pts.map((n) => n.y);
                    const pad = 40;
                    return (
                      <g key={t.id} data-transport-id={t.id} style={{ cursor: "pointer" }}>
                        <rect
                          x={Math.min(...xs) - pad}
                          y={Math.min(...ys) - pad}
                          width={Math.max(...xs) - Math.min(...xs) + pad * 2}
                          height={Math.max(...ys) - Math.min(...ys) + pad * 2}
                          fill="transparent"
                        />
                      </g>
                    );
                  })}

                  {/* 连线 */}
                  {skel.links.map((link, index) => {
                    const from = nodeById(link.from);
                    const to = nodeById(link.to);
                    if (!from || !to) return null;
                    const style = linkStyle(link.type);
                    const bend = link.bend ?? (index % 2 === 0 ? 0.12 : -0.1);
                    const geom = curveGeometry(from, to, bend);
                    const markerId = `chain-ah-${style.stroke.replace("#", "")}`;
                    const isSelected = !!link.stepId && link.stepId === selected;
                    return (
                      <g
                        key={`${link.from}-${link.to}-${index}`}
                        data-step-id={link.type === "transport" ? undefined : link.stepId}
                        data-transport-id={link.type === "transport" ? link.stepId : undefined}
                        className={isSelected ? "edge sel" : "edge"}
                        style={link.stepId ? { cursor: "pointer" } : undefined}
                      >
                        {/* 透明加宽命中带：曲线中点不在描边上时也能点中 */}
                        <path d={geom.d} fill="none" stroke="transparent" strokeWidth={16} />
                        <path
                          d={geom.d}
                          fill="none"
                          stroke={isSelected ? AMBER : style.stroke}
                          strokeWidth={style.width + (isSelected ? 1 : 0)}
                          strokeDasharray={style.dash}
                          opacity={style.opacity}
                          markerEnd={`url(#${markerId})`}
                        />
                        {link.label ? (
                          <text
                            x={geom.mid.x + geom.normal.x * 20}
                            y={geom.mid.y + geom.normal.y * 20}
                            textAnchor="middle"
                            fontSize={9}
                            fill={style.stroke}
                            opacity={0.78}
                            stroke={PAPER}
                            strokeWidth={2.4}
                            paintOrder="stroke"
                          >
                            {link.label}
                          </text>
                        ) : null}
                      </g>
                    );
                  })}

                  {/* 步骤序号 */}
                  {stepBadges.map(({ step, x, y, color }) => (
                    <g
                      key={step.id}
                      data-step-id={step.id}
                      className={selected === step.id ? "step-badge sel" : "step-badge"}
                      style={{ cursor: "pointer" }}
                    >
                      <circle cx={x} cy={y} r={9.2} fill={color} opacity={selected === step.id ? 1 : 0.9} />
                      <text
                        x={x}
                        y={y + 3.6}
                        textAnchor="middle"
                        fontSize={9.5}
                        fontWeight={700}
                        fill={PAPER}
                          style={{ pointerEvents: "none" }}
                      >
                        {CIRCLE_NO[step.index - 1] ?? step.index}
                      </text>
                    </g>
                  ))}

                  {/* 节点 */}
                  {skel.nodes.map((n) => {
                    const targetId = stepTargetForNode(n);
                    const isSel = targetId === selected;
                    const lp = n.labelPos;
                    const stroke = n.kind === "hub" ? TEAL : n.kind === "projection" ? TEAL : INK;
                    return (
                      <g
                        key={n.id}
                        data-node-id={n.id}
                        data-entity-id={n.entityId}
                        data-compartment={n.compartment}
                        data-node-role={n.kind}
                        className={isSel ? "node sel" : "node"}
                        style={{ cursor: "pointer" }}
                      >
                        {n.kind === "machine" ? (
                          <>
                            <rect
                              x={n.x - MACHINE_W / 2}
                              y={n.y - MACHINE_H / 2}
                              width={MACHINE_W}
                              height={MACHINE_H}
                              rx={2}
                              fill="#fff"
                              stroke={stroke}
                              strokeWidth={1.1}
                            />
                            <text
                              x={n.x}
                              y={n.y + 4.5}
                              textAnchor="middle"
                              fontSize={9}
                              fontWeight={700}
                              fill={INK}
                              style={{ pointerEvents: "none" }}
                            >
                              {n.label}
                            </text>
                          </>
                        ) : (
                          <>
                            <circle
                              cx={n.x}
                              cy={n.y}
                              r={R}
                              fill={n.kind === "hub" ? "#fff" : PAPER}
                              stroke={isSel ? AMBER : stroke}
                              strokeWidth={isSel ? 2.4 : n.kind === "hub" ? 1.2 : 1.5}
                              strokeDasharray={n.kind === "hub" ? "4 3" : undefined}
                            />
                            <text
                              x={n.x}
                              y={n.y + 5}
                              textAnchor="middle"
                              fontSize={n.abbr && n.abbr.length > 6 ? 8.6 : 10.5}
                              fontWeight={700}
                              fill={INK}
                              style={{ pointerEvents: "none" }}
                            >
                              {n.abbr ?? n.label}
                            </text>
                            {lp ? (
                              <text
                                x={n.x + lp.dx}
                                y={n.y + lp.dy}
                                textAnchor={lp.anchor}
                                fontSize={9}
                                fill={INK}
                                opacity={0.72}
                              >
                                {n.label}
                              </text>
                            ) : null}
                          </>
                        )}
                      </g>
                    );
                  })}

                  {(skel.annotations ?? []).map(renderAnnotation)}
                </svg>
              </div>
            </div>

            <PathwayRailFoot current={pathwayId} />
            <div className="poster-foot">
              {data.posterFoot.map((line) => (
                <span key={line}>{line}</span>
              ))}
            </div>
          </div>

          <aside>
            <div className="panel-block">
              <div className="pb-title">
                <span>详情栏</span>
                <span className="en">DETAIL · 点击图上步骤 / 节点 / 运输段</span>
              </div>
              {selectedStep ? (
                <div className="d-body">
                  <div className="d-step">
                    <span className="no serif num">{CIRCLE_NO[selectedStep.index - 1]}</span>
                    {selectedStep.name}
                    <span className="d-tag">{selectedStep.irreversible ? "不可逆" : "可逆"}</span>
                    <span className="d-tag amber">{compartmentLabel(selectedStep.compartment)}</span>
                  </div>
                  <div className="d-enzyme">
                    {selectedStep.enzyme.name}
                    {selectedStep.enzyme.isozyme ? <span className="d-iso"> — {selectedStep.enzyme.isozyme}</span> : null}
                  </div>
                  <div className="d-eq">{selectedStep.equation}</div>
                  {selectedStep.enzyme.ec ? <div className="d-cof num"><b>EC</b>　{selectedStep.enzyme.ec}</div> : null}
                  {selectedStep.cofactors.length ? (
                    <div className="d-cof"><b>辅因子</b>　{selectedStep.cofactors.join(" · ")}</div>
                  ) : null}
                  <div className="d-cof" data-dg="1">
                    <b>ΔG</b>
                    <span style={{ opacity: 0.62 }}> 定性：{selectedStep.deltaG.qualitative}</span>
                    <span className="num" style={{ opacity: 0.5 }}> · {selectedStep.deltaG.source}</span>
                  </div>
                  <div className="d-sig">{selectedStep.significance}</div>

                  {grade ? (
                    <div
                      className="d-cof"
                      data-testid="chain-grade"
                      data-grade={grade.grade ?? (grade.calc ? "calc" : grade.only2d ? "2d" : "none")}
                    >
                      <b>证据等级</b>　
                      {grade.grade ? GRADE_LABEL[grade.grade] : grade.calc ? "计算构象（无实验坐标）" : grade.only2d ? "仅 2D" : "未分级"}
                      {grade.sidesDiffer ? <span style={{ opacity: 0.6 }}>（两侧实验证据不一致，按最差侧计）</span> : null}
                    </div>
                  ) : null}

                  {selectedCmp ? (
                    <Link
                      className="frames-entry"
                      data-testid="chain-structure-cmp-entry"
                      data-cmp-step={selectedStep.id}
                      to={`/structures/${pathwayId}#${selectedStep.id}`}
                    >
                      看这一步的结构对照 →
                    </Link>
                  ) : (
                    <div className="d-none" data-cmp-missing="1">
                      本步未建分子对照——结构页 {data.structureNo} 覆盖 {cmpConfig?.steps.length ?? 0} 块。
                    </div>
                  )}

                  <MoleculeArchiveEntry
                    pathwayId={pathwayId}
                    stepId={selectedStep.id}
                    testId="chain-molecule-archive-entry"
                  />

                  {selectedStep.misconceptions.length ? (
                    <div className="d-mis">
                      <span className="lbl">常见误解</span>
                      <ul>
                        {selectedStep.misconceptions.slice(0, 2).map((m, i) => (
                          <li key={i}>{m}</li>
                        ))}
                      </ul>
                    </div>
                  ) : null}

                  {selectedStep.clinical.length ? (
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
                    {nav.prev ? (
                      <button role="tab" className="d-variant-tab" onClick={() => select(nav.prev!)}>
                        ← {nav.prevLabel}
                      </button>
                    ) : null}
                    <button role="tab" className="d-variant-tab" onClick={() => select(nav.next)}>
                      {nav.nextLabel} →
                    </button>
                  </div>

                  <div className="d-none" data-2d-only="1">
                    3D 结合视图：{data.threeD.note}
                  </div>
                </div>
              ) : selectedTransport ? (
                <div className="d-body" data-transport-detail="1">
                  <div className="d-step">
                    <span className="no serif num">↔</span>
                    {selectedTransport.name}
                    <span className="d-tag amber">运输 · 不计入步数</span>
                  </div>
                  <div className="d-eq">{selectedTransport.note}</div>
                  <div className="d-cof">
                    <b>路线</b>　{selectedTransport.from} → {selectedTransport.via} → {selectedTransport.to}
                  </div>
                  <div className="d-none" data-2d-only="1">
                    3D 结合视图：{data.threeD.note}
                  </div>
                </div>
              ) : (
                <div className="d-body">
                  <div className="d-placeholder">
                    点击图上的步骤箭头、代谢物节点或运输段，此处显示该步的反应式、酶、区室、ΔG（只保留定性标注，不展示数值）与易错点。
                    本图全部只做 2D：不建 3D、不登记 PDB 候选。
                  </div>
                </div>
              )}
            </div>

            {data.interfaces?.length ? (
              <div className="panel-block" data-chain-interfaces="1">
                <div className="pb-title">
                  <span>与既有通路的接口</span>
                  <span className="en">INTERFACES · 只指向真实存在的步骤</span>
                </div>
                <div className="d-body">
                  {data.interfaces.map((it) => {
                    const entry = stepEntryById(it.stepId);
                    return (
                      <div className="d-cof" key={it.stepId} data-interface-step={it.stepId}>
                        <b>{it.label}</b>　
                        {entry ? (
                          <Link to={`${entry.route}?step=${it.stepId}`} className="frames-entry" style={{ display: "inline" }}>
                            {entry.pathwayName} · {it.stepId}
                          </Link>
                        ) : (
                          <span style={{ opacity: 0.6 }}>{it.stepId}</span>
                        )}
                        <div style={{ opacity: 0.66, marginTop: 4 }}>{it.note}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : null}
          </aside>
        </div>
      </div>
    </>
  );
}
