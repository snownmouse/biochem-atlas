// ============================================================
// 氨基酸代谢挂图（/pathway/amino-acids · PLATE 11 / SF-11）
//
// 结构：上层三分类簇（生糖 14 / 生糖兼生酮 4 / 生酮 2）→ 中层两道闸
// （转氨 ALT / AST / BCAT2；氧化脱氨 GLDH / GLS）→ 下层七个碳骨架去路。
// NH₄⁺ 不重复画尿素循环，只做接口芯片指向 PLATE 09；三条临床支路虚线降权、可收起。
// 本页只做 2D：threeD.status=pending，不引用任何酶 3D 资产。
// ============================================================
import { useEffect, useMemo, useRef, useState, type MouseEvent } from "react";
import { Link, useSearchParams } from "react-router-dom";
import PathwaySwitcher from "../components/PathwaySwitcher";
import { PathwayRailFoot } from "../components/PathwayRail";
import PlateInteraction from "../components/PlateInteraction";
import { comparisonConfigFor } from "../data/comparisonConfig";
import { GRADE_LABEL, gradesForStep } from "../data/evidenceGrade";
import raw from "../data/amino-acid/amino.json";
import skelRaw from "../data/amino-acid/skeleton.json";
import type {
  AminoEntity,
  AminoFate,
  AminoPathwayData,
  AminoSkeleton,
  AminoStep,
} from "../data/amino-acid/types";

const PAPER = "#F6F3EC";
const INK = "#22282A";
const DIM = "#6B7173";
const AMBER = "#A5792D";
const TEAL = "#2C7C74";
const BRICK = "#9B3B2E";

const DATA = raw as unknown as AminoPathwayData;
const SKEL = skelRaw as unknown as AminoSkeleton;

const CIRCLE_NO = ["Ⅰ", "Ⅱ", "Ⅲ", "Ⅳ", "Ⅴ", "Ⅵ", "Ⅶ", "Ⅷ", "Ⅸ", "Ⅹ"];

const NODE_TO_STEP: Record<string, string> = {
  "enz-alt": "aa-1",
  "enz-ast": "aa-2",
  "enz-gldh": "aa-3",
  "enz-gls": "aa-4",
  "enz-bcat2": "aa-5",
  "clin-pku": "aa-6",
  "clin-msud": "aa-5",
  "clin-cbs": "aa-7",
};

const PATH_LABEL: Record<string, string> = {
  "urea-cycle": "尿素循环",
  glycolysis: "糖酵解",
  gluconeogenesis: "糖异生",
  tca: "TCA 循环",
};

const PATH_ROUTE: Record<string, string> = {
  "urea-cycle": "/pathway/urea-cycle",
  glycolysis: "/pathway/glycolysis",
  gluconeogenesis: "/pathway/gluconeogenesis",
  tca: "/pathway/tca",
  "amino-acids": "/pathway/amino-acids",
};

const ZONE_FILL: Record<string, string> = {
  "zone-classify": "#F3F0E7",
  "zone-gates": "#F1F0E8",
  "zone-fates": "#F5F0E4",
  "zone-organs": "#F3F1E8",
  "zone-clinical": "#F7F2EE",
};

function chargeSup(charge: number): string {
  if (!charge) return "";
  const magnitude = Math.abs(charge);
  const prefix = magnitude === 1 ? "" : magnitude === 2 ? "²" : magnitude === 3 ? "³" : String(magnitude);
  return `${prefix}${charge > 0 ? "⁺" : "⁻"}`;
}

function formulaOf(e: AminoEntity): string {
  return `${e.formula}${chargeSup(e.charge)}`;
}

function sharedLabel(f: AminoFate): string {
  if (!f.sharedWith.length) return "未建 · 无接口";
  return f.sharedWith.map((s) => `${s.pathwayId}:${s.stepId}`).join(" · ");
}

function classifyOf(entityId: string): { name: string; count: number; key: string } | null {
  for (const g of DATA.classification.groups) {
    if (g.members.includes(entityId)) return { name: g.name, count: g.count, key: g.id };
  }
  return null;
}

export default function AminoAcidOverviewPage() {
  const plateSvgRef = useRef<SVGSVGElement>(null);
  const [params, setParams] = useSearchParams();
  const [selected, setSelected] = useState<string>("");
  const [clinicalOpen, setClinicalOpen] = useState(true);

  useEffect(() => {
    const step = params.get("step");
    if (step && DATA.steps.some((s) => s.id === step)) setSelected(step);
  }, [params]);

  const stepById = useMemo(() => new Map(DATA.steps.map((s) => [s.id, s])), []);
  const entityById = useMemo(() => new Map(DATA.entities.map((e) => [e.id, e])), []);
  const fateById = useMemo(() => new Map(DATA.fates.map((f) => [f.id, f])), []);

  const selectedStep = stepById.get(selected) ?? null;
  const selectedEntity = entityById.get(selected) ?? null;
  const selectedFate = fateById.get(selected) ?? null;
  const selectedInterface = selected === "if-urea";
  const cmpConfig = comparisonConfigFor("amino-acids");
  const cmpStep = cmpConfig?.steps.find((s) => s.stepId === selected) ?? null;
  const cmpGrade = cmpStep ? gradesForStep(cmpStep).grade : null;

  const pdbAll = useMemo(() => {
    const map = new Map<string, AminoStep["pdbCandidates"][number]>();
    for (const step of DATA.steps) for (const p of step.pdbCandidates) if (!map.has(p.pdbId)) map.set(p.pdbId, p);
    return [...map.values()];
  }, []);

  const choose = (id: string) => {
    setSelected(id);
    const next = new URLSearchParams(params);
    if (DATA.steps.some((s) => s.id === id)) next.set("step", id);
    else next.delete("step");
    setParams(next, { replace: true });
  };

  const onPlateClick = (event: MouseEvent<SVGSVGElement>) => {
    const stepEl = (event.target as Element).closest("[data-step-id]");
    if (stepEl) {
      choose(stepEl.getAttribute("data-step-id") || "");
      return;
    }
    const linkEl = (event.target as Element).closest("[data-link-step]");
    if (linkEl) {
      choose(linkEl.getAttribute("data-link-step") || "");
      return;
    }
    const nodeEl = (event.target as Element).closest("[data-node-id]");
    if (!nodeEl) return;
    const nodeId = nodeEl.getAttribute("data-node-id") || "";
    if (nodeId === "if-nh4") {
      choose("if-urea");
      return;
    }
    if (NODE_TO_STEP[nodeId]) {
      choose(NODE_TO_STEP[nodeId]);
      return;
    }
    if (fateById.has(nodeId)) {
      choose(nodeId);
      return;
    }
    const entityId = nodeEl.getAttribute("data-entity-id");
    if (entityId) choose(entityId);
  };

  const isNodeSelected = (nodeId: string, entityId?: string) => {
    if (selected === nodeId) return true;
    if (NODE_TO_STEP[nodeId] && NODE_TO_STEP[nodeId] === selected) return true;
    if (entityId && entityId === selected) return true;
    if (nodeId === "if-nh4" && selectedInterface) return true;
    return false;
  };

  const ledgerEmpty = DATA.energyLedger.entries.length === 0;

  return (
    <>
      <PathwaySwitcher
        current="amino-acids"
        context={
          selectedStep ? (
            <>第 {CIRCLE_NO[selectedStep.index - 1]} 步 · {selectedStep.short}</>
          ) : selectedEntity ? (
            <>分子 · {selectedEntity.name}</>
          ) : selectedFate ? (
            <>去路 · {selectedFate.name}</>
          ) : (
            <>七步 · 三分类 · 两条闸 · 七个去路</>
          )
        }
      />

      <div className="poster poster-amino" data-pathway-title={DATA.name}>
        <header className="masthead">
          <div className="mast-side">
            <span className="plate-no num">{DATA.plateNo} · {DATA.structureNo} · 2026</span>
            <span className="mast-en">{DATA.en}</span>
          </div>
          <div className="mast-main">
            <h1>
              {DATA.name}
              <small>20 种氨基酸 · 一类枢纽 · 七个碳骨架去路</small>
            </h1>
            <p className="mast-summary">{DATA.summary}</p>
          </div>
        </header>

        <div className="legend">
          <span className="lg">
            <svg width="46" height="10" aria-hidden>
              <line x1="0" y1="5" x2="38" y2="5" stroke={INK} strokeWidth="1.8" />
              <path d="M38,1 L46,5 L38,9 Z" fill={INK} />
            </svg>
            转氨主链
          </span>
          <span className="lg">
            <svg width="46" height="10" aria-hidden>
              <line x1="0" y1="5" x2="40" y2="5" stroke={INK} strokeWidth="1.1" strokeDasharray="5 4" opacity={0.7} />
              <path d="M40,1 L46,5 L40,9 Z" fill={INK} opacity={0.6} />
            </svg>
            可逆 / 穿梭
          </span>
          <span className="lg">
            <svg width="46" height="10" aria-hidden>
              <line x1="0" y1="5" x2="40" y2="5" stroke={TEAL} strokeWidth="1.3" strokeDasharray="6 4" />
            </svg>
            NH₄⁺ 接口 → 尿素循环 PLATE 09
          </span>
          <span className="lg">
            <svg width="46" height="10" aria-hidden>
              <line x1="0" y1="5" x2="40" y2="5" stroke={BRICK} strokeWidth="1.1" strokeDasharray="5 4" />
            </svg>
            临床支路（降权、可收起）
          </span>
          <span className="lg">
            <span style={{ color: AMBER, fontWeight: 700 }}>琥珀</span>＝调控 / 分组注记
            <span style={{ margin: "0 6px", color: DIM }}>·</span>
            横向滚动在图框内（无缩放）
          </span>
        </div>

        <div className="body-grid">
          <div className="plate-wrap" data-amino-plate="1">
            <div className="plate-head">
              <span className="t">
                图 1 · 三分类簇 → 两闸 → 七去路；NH₄⁺ 只做接口芯片，不重复画尿素循环
              </span>
              <span className="plate-head-tools">
                <PlateInteraction svgRef={plateSvgRef} />
                <button
                  type="button"
                  className="plate-tool-link"
                  data-clinical-toggle="1"
                  data-clinical-open={clinicalOpen ? "1" : "0"}
                  onClick={() => setClinicalOpen((v) => !v)}
                >
                  {clinicalOpen ? "收起临床支路" : "展开临床支路"}
                </button>
                <Link className="frames-entry" to="/structures/amino-acids">
                  结构对照 {DATA.structureNo} →
                </Link>
              </span>
            </div>

            <div className="plate-scroll" data-plate-scroll="1">
              <div className="plate-canvas">
                <svg
                  ref={plateSvgRef}
                  width={SKEL.canvas.width}
                  height={SKEL.canvas.height}
                  viewBox={`0 0 ${SKEL.canvas.width} ${SKEL.canvas.height}`}
                  onClick={onPlateClick}
                  data-frame="amino"
                  data-class-groups="3"
                  data-amino-count={DATA.classification.groups.reduce((n, g) => n + g.count, 0)}
                  data-gate-count="2"
                  data-fate-count={DATA.fates.length}
                  data-clinical-branches="3"
                  data-clinical-open={clinicalOpen ? "1" : "0"}
                  data-step-count={DATA.steps.length}
                  data-node-count={SKEL.nodes.length}
                  data-no-zoom="1"
                  aria-label="氨基酸代谢：三分类簇、两道闸、七个碳骨架去路"
                >
                  <defs>
                    <marker id="amino-ah-ink" markerWidth="9" markerHeight="8" refX="8" refY="4" orient="auto">
                      <path d="M0,0.5 L8.5,4 L0,7.5 Z" fill={INK} />
                    </marker>
                    <marker id="amino-ah-heavy" markerWidth="10" markerHeight="9" refX="9" refY="4.5" orient="auto">
                      <path d="M0,0.5 L9.5,4.5 L0,8.5 Z" fill={INK} />
                    </marker>
                    <marker id="amino-ah-teal" markerWidth="9" markerHeight="8" refX="8" refY="4" orient="auto">
                      <path d="M0,0.5 L8.5,4 L0,7.5 Z" fill={TEAL} opacity={0.85} />
                    </marker>
                    <marker id="amino-ah-brick" markerWidth="9" markerHeight="8" refX="8" refY="4" orient="auto">
                      <path d="M0,0.5 L8.5,4 L0,7.5 Z" fill={BRICK} opacity={0.85} />
                    </marker>
                  </defs>

                  <g stroke={INK} strokeWidth={1} opacity={0.38}>
                    <path d="M20,12 V28 M12,20 H28" />
                    <path d={`M${SKEL.canvas.width - 20},12 V28 M${SKEL.canvas.width - 28},20 H${SKEL.canvas.width - 12}`} />
                    <path d={`M20,${SKEL.canvas.height - 28} V${SKEL.canvas.height - 12} M12,${SKEL.canvas.height - 20} H28`} />
                    <path d={`M${SKEL.canvas.width - 20},${SKEL.canvas.height - 28} V${SKEL.canvas.height - 12} M${SKEL.canvas.width - 28},${SKEL.canvas.height - 20} H${SKEL.canvas.width - 12}`} />
                  </g>

                  {/* ===== 分区 / 分组带 / 器官泳道 ===== */}
                  <g data-layer="compartments">
                    {SKEL.compartments
                      .filter((c) => clinicalOpen || c.id !== "zone-clinical")
                      .map((c) => {
                        const isGroup = c.id.startsWith("grp-");
                        const isOrgan = c.id.startsWith("organ-");
                        const isClinical = c.id === "zone-clinical";
                        return (
                          <g
                            key={c.id}
                            data-zone-id={c.id}
                            data-group-id={isGroup ? c.id : undefined}
                            data-organ-lane={isOrgan ? c.id : undefined}
                          >
                            <rect
                              x={c.x}
                              y={c.y}
                              width={c.w}
                              height={c.h}
                              fill={isGroup ? "#FBF8F1" : isOrgan ? "#FBF8F1" : ZONE_FILL[c.id] ?? PAPER}
                              stroke={isClinical ? BRICK : INK}
                              strokeWidth={isGroup || isOrgan ? 0.8 : 1}
                              strokeDasharray={isClinical ? "5 4" : undefined}
                              opacity={isGroup || isOrgan ? 0.62 : isClinical ? 0.55 : 0.42}
                            />
                            <text
                              x={c.x + (isGroup || isOrgan ? 12 : 16)}
                              y={c.y + (isOrgan ? 22 : isGroup ? 21 : 20)}
                              fontSize={isOrgan ? 11 : isGroup ? 9.6 : 10.5}
                              fill={isClinical ? BRICK : INK}
                              fontWeight={700}
                              letterSpacing={0.04}
                            >
                              {c.name}
                            </text>
                            <text
                              x={c.x + c.w - 14}
                              y={c.y + (isOrgan ? 22 : 20)}
                              textAnchor="end"
                              fontSize={8.2}
                              fill={INK}
                              opacity={0.48}
                              letterSpacing={0.16}
                            >
                              {c.en}
                            </text>
                          </g>
                        );
                      })}
                  </g>

                  {/* ===== 连线 ===== */}
                  <g data-layer="links">
                    {SKEL.links
                      .filter((l) => clinicalOpen || !l.clinical)
                      .map((l) => {
                        const clinical = Boolean(l.clinical);
                        const stroke = clinical ? BRICK : l.type === "interface" || l.type === "dashed" ? TEAL : INK;
                        const width = clinical ? 1.1 : l.type === "main" ? 1.8 : l.type === "interface" ? 1.3 : 1.05;
                        const dash = clinical ? "5 4" : l.type === "main" ? undefined : l.type === "interface" ? "6 4" : "5 4";
                        const marker = clinical ? "amino-ah-brick" : l.type === "interface" || l.type === "dashed" ? "amino-ah-teal" : l.type === "main" ? "amino-ah-heavy" : "amino-ah-ink";
                        return (
                          <g
                            key={l.id}
                            data-link-id={l.id}
                            data-link-type={l.type}
                            data-link-step={l.stepId}
                            data-clinical={clinical ? "1" : undefined}
                            opacity={l.type === "side" ? 0.66 : 1}
                            style={{ cursor: l.stepId ? "pointer" : "default" }}
                          >
                            <path
                              d={l.path}
                              fill="none"
                              stroke={stroke}
                              strokeWidth={width}
                              strokeDasharray={dash}
                              markerEnd={`url(#${marker})`}
                            />
                            {l.label ? (
                              <text
                                x={l.labelX}
                                y={l.labelY}
                                fontSize={8.6}
                                fill={stroke}
                                fontWeight={l.type === "main" ? 700 : 400}
                                opacity={l.type === "side" ? 0.75 : 0.95}
                              >
                                {l.label}
                              </text>
                            ) : null}
                          </g>
                        );
                      })}
                  </g>

                  {/* ===== 节点 ===== */}
                  <g data-layer="nodes">
                    {SKEL.nodes
                      .filter((n) => clinicalOpen || !n.clinical)
                      .map((n) => {
                        const w = n.w ?? 100;
                        const h = n.h ?? 30;
                        const isAmino = n.kind === "amino";
                        const isFate = n.kind === "fate";
                        const isInterface = n.kind === "interface";
                        const isEnzyme = n.kind === "enzyme";
                        const isClinical = Boolean(n.clinical);
                        const unbuilt = n.status === "unbuilt";
                        const hl = isNodeSelected(n.id, n.entityId);
                        const fate = fateById.get(n.id);
                        const entity = n.entityId ? entityById.get(n.entityId) : undefined;
                        return (
                          <g
                            key={n.id}
                            data-node-id={n.id}
                            data-entity-id={n.entityId}
                            data-node-kind={n.kind}
                            data-step-id={isClinical ? NODE_TO_STEP[n.id] : undefined}
                            data-clinical={isClinical ? "1" : undefined}
                            data-fate-status={n.status}
                            style={{ cursor: "pointer" }}
                          >
                            <rect
                              x={n.x - w / 2}
                              y={n.y - h / 2}
                              width={w}
                              height={h}
                              fill={isFate || isInterface ? "#FFFFFF" : isEnzyme ? "#FAF7EF" : isAmino ? "#FBF8F1" : PAPER}
                              stroke={isClinical ? BRICK : isInterface ? TEAL : INK}
                              strokeWidth={hl ? 2.2 : isClinical ? 0.9 : isInterface ? 1.4 : 1}
                              strokeDasharray={isClinical ? "5 4" : undefined}
                              opacity={isClinical ? 0.88 : 1}
                            />
                            {isFate ? (
                              <>
                                <text x={n.x} y={n.y - 16} textAnchor="middle" fontSize={12} fill={INK} fontWeight={700} letterSpacing={0.04}>
                                  {n.label}
                                </text>
                                <text x={n.x} y={n.y + 2} textAnchor="middle" fontSize={9.2} fill={INK} opacity={0.66}>
                                  {n.sub}
                                </text>
                                <text
                                  x={n.x}
                                  y={n.y + 22}
                                  textAnchor="middle"
                                  fontSize={8.4}
                                  fill={unbuilt ? BRICK : TEAL}
                                  fontWeight={unbuilt ? 700 : 400}
                                >
                                  {fate ? sharedLabel(fate) : ""}
                                </text>
                                {unbuilt ? (
                                  <text x={n.x} y={n.y + 36} textAnchor="middle" fontSize={8.2} fill={BRICK} opacity={0.8}>
                                    无实体可指 · 不编造接口
                                  </text>
                                ) : null}
                              </>
                            ) : isInterface ? (
                              <>
                                <text x={n.x} y={n.y - 6} textAnchor="middle" fontSize={11.5} fill={INK} fontWeight={700}>
                                  {n.label}
                                </text>
                                <text x={n.x} y={n.y + 10} textAnchor="middle" fontSize={9} fill={TEAL} fontWeight={700}>
                                  {n.sub}
                                </text>
                                <text x={n.x} y={n.y + 23} textAnchor="middle" fontSize={8.2} fill={INK} opacity={0.6}>
                                  接口芯片 · 不重复画循环
                                </text>
                              </>
                            ) : isAmino ? (
                              <>
                                <text x={n.x} y={n.y - 2} textAnchor="middle" fontSize={10.5} fill={INK} fontWeight={700} letterSpacing={0.03}>
                                  {n.label}
                                </text>
                                <text x={n.x} y={n.y + 10} textAnchor="middle" fontSize={8.2} fill={INK} opacity={0.64}>
                                  {n.sub}
                                </text>
                              </>
                            ) : isEnzyme ? (
                              <>
                                <text x={n.x} y={n.y - 4} textAnchor="middle" fontSize={9.8} fill={isClinical ? BRICK : INK} fontWeight={700}>
                                  {n.label}
                                </text>
                                <text x={n.x} y={n.y + 9} textAnchor="middle" fontSize={8.1} fill={INK} opacity={0.62}>
                                  {n.sub}
                                </text>
                                {isClinical && entity ? (
                                  <text x={n.x} y={n.y + 22} textAnchor="middle" fontSize={7.8} fill={BRICK} opacity={0.7}>
                                    {entity.name}
                                  </text>
                                ) : null}
                              </>
                            ) : (
                              <>
                                <text x={n.x} y={n.y - 3} textAnchor="middle" fontSize={10.5} fill={INK} fontWeight={700}>
                                  {n.label}
                                </text>
                                <text x={n.x} y={n.y + 10} textAnchor="middle" fontSize={8.4} fill={INK} opacity={0.64}>
                                  {n.sub}
                                </text>
                              </>
                            )}
                          </g>
                        );
                      })}
                  </g>

                  {/* ===== 步骤标签（可点击，同步右栏） ===== */}
                  <g data-layer="step-labels">
                    {SKEL.stepLabels.map((l) => {
                      const step = stepById.get(l.stepId);
                      if (!step) return null;
                      const sel = selected === l.stepId;
                      return (
                        <g key={l.stepId} data-step-id={l.stepId} data-step-label="1" className={sel ? "sel" : undefined} style={{ cursor: "pointer" }}>
                          <rect
                            x={l.x - 11}
                            y={l.y - 9}
                            width={22}
                            height={12}
                            fill={sel ? INK : PAPER}
                            stroke={INK}
                            strokeWidth={0.8}
                          />
                          <text
                            x={l.x}
                            y={l.y}
                            textAnchor="middle"
                            fontSize={8.2}
                            fill={sel ? PAPER : INK}
                            fontWeight={700}
                          >
                            {CIRCLE_NO[step.index - 1]}
                          </text>
                        </g>
                      );
                    })}
                  </g>

                  {/* ===== 注记 ===== */}
                  <g data-layer="annotations">
                    {SKEL.annotations
                      .filter((a) => clinicalOpen || a.y < 1030)
                      .map((a, i) => (
                        <text
                          key={`${a.x}-${a.y}-${i}`}
                          x={a.x}
                          y={a.y}
                          fontSize={a.size ?? 9.2}
                          fill={a.y >= 1030 ? BRICK : INK}
                          opacity={a.y >= 1030 ? 0.82 : 0.74}
                          fontWeight={a.weight ?? 400}
                          textAnchor={a.anchor}
                        >
                          {a.text}
                        </text>
                      ))}
                  </g>
                </svg>
              </div>
            </div>

            <PathwayRailFoot current="amino-acids" />
            <div className="poster-foot">
              <span>
                分类出处：Lehninger 8e Ch.18 碳骨架去路表（生糖 14 / 生糖兼生酮 4 / 生酮 2）；Thr 归属分歧已在分类带注记并列，不单方面裁定。
              </span>
              <span>
                七去路只接真实 id（糖酵解 / TCA / 尿素循环）；乙酰乙酰-CoA 未建生酮通路，明确留空不编接口；NH₄⁺ 只做接口芯片，血氨处置见尿素循环 PLATE 09。
              </span>
            </div>
          </div>

          <aside>
            <div className="panel-block" data-amino-detail="1">
              <div className="pb-title">
                选中项<span className="en">DETAIL</span>
              </div>
              {selectedStep ? (
                <StepDetail
                  step={selectedStep}
                  cmpGrade={cmpGrade}
                  gradeLabel={cmpGrade ? GRADE_LABEL[cmpGrade] : ""}
                />
              ) : selectedEntity ? (
                <EntityDetail entity={selectedEntity} />
              ) : selectedFate ? (
                <FateDetail fate={selectedFate} />
              ) : selectedInterface ? (
                <InterfaceDetail />
              ) : (
                <p className="d-none">
                  点选上层氨基酸、中层酶 / 枢纽或下层去路查看释义。所有 3D 面板 pending，本页只做 2D。
                </p>
              )}
            </div>

            <div className="panel-block" data-amino-classification="1">
              <div className="pb-title">
                分类口径<span className="en">20 AMINO ACIDS</span>
              </div>
              {DATA.classification.groups.map((g) => (
                <div className="ao-class-row" key={g.id} data-class-group={g.id}>
                  <span className="ao-class-name">{g.name}</span>
                  <span className="ao-class-count num">{g.count}</span>
                  <span className="ao-class-members">{g.members.join(" · ")}</span>
                </div>
              ))}
              <p className="ao-note">
                出处：{DATA.classification.source}
              </p>
              <p className="ao-note">
                生酮通常只有 Leu、Lys；Ile、Phe、Trp、Tyr 为生糖兼生酮（Lehninger 8e）。
              </p>
              {DATA.classification.disputed.map((d, i) => (
                <p className="ao-note ao-dispute" key={i} data-disputed={d.title}>
                  {d.title}：{d.text}
                </p>
              ))}
            </div>

            <div className="panel-block" data-amino-fates="1">
              <div className="pb-title">
                七个去路<span className="en">SEVEN FATES</span>
              </div>
              {DATA.fates.map((f) => (
                <div className="ao-fate-row" key={f.id} data-fate-row={f.id}>
                  <span className="ao-fate-name">{f.name}</span>
                  <span className={f.status === "unbuilt" ? "ao-fate-id is-unbuilt" : "ao-fate-id"}>{sharedLabel(f)}</span>
                </div>
              ))}
              <p className="ao-note">
                去路指向已存在步骤 id；乙酰乙酰-CoA 的生酮通路未建，明确置 unbuilt，不以幽灵 id 占位。
              </p>
            </div>

            <div className="panel-block" data-amino-organs="1">
              <div className="pb-title">
                器官差异<span className="en">ORGAN CONTEXT</span>
              </div>
              {DATA.organs.map((o) => (
                <div className="ao-organ-row" key={o.id} data-organ-row={o.id}>
                  <span className="ao-organ-name">{o.name}</span>
                  <span className="ao-organ-text">{o.detail}</span>
                </div>
              ))}
            </div>

            <div className="panel-block" data-amino-energy="1">
              <div className="pb-title">
                能量账<span className="en">ENERGY</span>
              </div>
              {ledgerEmpty ? (
                <p className="ao-note">{DATA.energyLedger.note}</p>
              ) : (
                DATA.energyLedger.entries.map((e) => (
                  <div className="ao-energy-row" key={e.id}>
                    <span>{e.label}</span>
                    <span className="num">{e.amount >= 0 ? `+${e.amount}` : e.amount} {DATA.energyLedger.unit}</span>
                    <span>{e.note}</span>
                  </div>
                ))
              )}
            </div>

            <div className="panel-block" data-amino-pdb="1">
              <div className="pb-title">
                PDB 核验<span className="en">RCSB · LIVE</span>
              </div>
              {pdbAll.map((p) => (
                <div className="ao-pdb-row" key={p.pdbId} data-pdb-id={p.pdbId} data-pdb-status={p.status}>
                  <div className="ao-pdb-head">
                    <span className="ao-pdb-id num">{p.pdbId}</span>
                    <span className="ao-pdb-species">{p.species}</span>
                    <span className="ao-pdb-res num">{p.resolution} Å</span>
                  </div>
                  <div className="ao-pdb-meta">
                    {p.method} · 链 {p.chains} · {p.ligands ?? "无配体"} · 突变：{p.mutation ?? "未核验"}
                  </div>
                  <div className="ao-pdb-note">{p.note}</div>
                </div>
              ))}
              <p className="ao-note">
                以上条目均于 2026-11-05 向 RCSB Data API 实时核验（物种 / 方法 / 分辨率 / 链 / 配体 / 突变）。本页不渲染酶 3D。
              </p>
            </div>

            <div className="panel-block" data-amino-open="1">
              <div className="pb-title">
                未核验 / 只做 2D / 分歧<span className="en">CAVEATS</span>
              </div>
              {DATA.notes.map((n) => (
                <div className="ao-note-row" key={n.id} data-note-id={n.id}>
                  <span className={`ao-note-tag is-${n.level}`}>{n.level}</span>
                  <span>{n.text}</span>
                </div>
              ))}
            </div>
          </aside>
        </div>
      </div>
    </>
  );
}

function StepDetail({ step, cmpGrade, gradeLabel }: { step: AminoStep; cmpGrade: string | null; gradeLabel: string }) {
  return (
    <div data-detail-kind="step">
      <div className="d-step">
        {CIRCLE_NO[step.index - 1]} · {step.name}
      </div>
      <div className="d-enzyme">
        {step.enzyme.name} <span className="d-iso">{step.enzyme.gene}</span>
        {step.enzyme.ec ? <span className="d-iso">EC {step.enzyme.ec}</span> : null}
      </div>
      <div className="d-eq">{step.equation}</div>
      <div className="d-cof">
        {step.gate} · {step.compartment} · {step.direction}
      </div>
      <div className="d-cof">
        器官：{step.organs.join(" / ")}
      </div>
      {step.reaction.cofactors.length ? <div className="d-cof">辅因子：{step.reaction.cofactors.join(" / ")}</div> : null}
      {step.deltaG.qualitative ? (
        <div className="d-cof">
          ΔG：{step.deltaG.value === null ? "未给数值" : step.deltaG.value} · {step.deltaG.qualitative}（{step.deltaG.source}）
        </div>
      ) : null}
      <div className="d-sig">{step.physiology}</div>
      <div className="d-mis">{step.organDifference}</div>
      {step.sharedWith.length ? (
        <div className="ao-shared">
          <span className="ao-shared-label">接口</span>
          {step.sharedWith.map((s) => (
            <Link key={`${s.pathwayId}-${s.stepId}`} to={`${PATH_ROUTE[s.pathwayId] ?? "/"}?step=${s.stepId}`} className="ao-shared-link">
              {PATH_LABEL[s.pathwayId] ?? s.pathwayId} · {s.stepId}
            </Link>
          ))}
        </div>
      ) : null}
      {step.pdbCandidates.length ? (
        <div className="ao-pdb-inline">
          {step.pdbCandidates.map((p) => (
            <div key={p.pdbId}>
              <a href={`https://www.rcsb.org/structure/${p.pdbId}`} target="_blank" rel="noreferrer" className="ao-pdb-link num">
                {p.pdbId}
              </a>{" "}
              · {p.species} · {p.resolution} Å · {p.chains}
              {p.ligands ? ` · ${p.ligands}` : ""}
              {p.mutation ? ` · 突变：${p.mutation}` : ""}
            </div>
          ))}
        </div>
      ) : null}
      {cmpGrade ? (
        <div className="d-evidence" data-amino-grade={cmpGrade}>
          结构对照 {DATA.structureNo} · 证据等级 {cmpGrade}（{gradeLabel}）
          <Link to={`/structures/amino-acids#${step.id}`} className="ao-shared-link">
            查看对照块 →
          </Link>
        </div>
      ) : null}
      <div className="d-none">酶 3D 面板 pending：本页只用 2D 结构式与核验过的 PDB 条目说明，不引用未核验资产。</div>
    </div>
  );
}

function EntityDetail({ entity }: { entity: AminoEntity }) {
  const group = classifyOf(entity.id);
  return (
    <div data-detail-kind="entity">
      <div className="d-step">{entity.name}</div>
      <div className="d-enzyme">
        <span className="num">{entity.abbr}</span>
        <span className="d-iso">{formulaOf(entity)}</span>
      </div>
      <div className="d-eq">净电荷 {entity.charge > 0 ? `+${entity.charge}` : entity.charge}（pH 7.4）</div>
      <div className="d-cof">{entity.chargeBasis}</div>
      {group ? (
        <div className="d-cof">
          分类：{group.name}（该组共 {group.count} 种，Lehninger 8e）
        </div>
      ) : null}
      {entity.ionizableGroups.length ? (
        <div className="ao-ion" data-ionizable="1">
          {entity.ionizableGroups.map((g) => (
            <div className="ao-ion-row" key={g.group}>
              <span>{g.group}</span>
              <span className="num">pKa {g.pKa}</span>
              <span className="num">pH 7.4 → {g.chargeAt74 > 0 ? "+1" : g.chargeAt74 < 0 ? "−1" : "0"}</span>
            </div>
          ))}
        </div>
      ) : (
        <p className="ao-note">无电离基团（或按中性形式呈现）。</p>
      )}
      {entity.note ? <div className="d-sig">{entity.note}</div> : null}
    </div>
  );
}

function FateDetail({ fate }: { fate: AminoFate }) {
  return (
    <div data-detail-kind="fate">
      <div className="d-step">{fate.name}</div>
      <div className="d-enzyme">
        <span className="d-iso">{fate.status === "unbuilt" ? "未建（unbuilt）" : "已接入"}</span>
      </div>
      {fate.sharedWith.length ? (
        <div className="ao-shared">
          <span className="ao-shared-label">sharedWith</span>
          {fate.sharedWith.map((s) => (
            <Link key={`${s.pathwayId}-${s.stepId}`} to={`${PATH_ROUTE[s.pathwayId] ?? "/"}?step=${s.stepId}`} className="ao-shared-link">
              {PATH_LABEL[s.pathwayId] ?? s.pathwayId} · {s.stepId} · {s.entityId}
            </Link>
          ))}
        </div>
      ) : (
        <p className="ao-note">未建：本平台尚无生酮通路数据，故无任何 sharedWith 目标，避免幽灵 id。</p>
      )}
      <div className="d-sig">{fate.note}</div>
      <div className="d-cof">来源氨基酸：{fate.sources.join(" · ")}</div>
    </div>
  );
}

function InterfaceDetail() {
  return (
    <div data-detail-kind="interface">
      <div className="d-step">NH₄⁺ → 尿素循环（接口芯片）</div>
      <div className="d-enzyme">血氨处置见尿素循环 PLATE 09</div>
      <div className="d-eq">GLDH（aa-3）与 GLS1（aa-4）释放的 NH₄⁺ 不在本页重复画成循环</div>
      <div className="d-sig">
        本页只声明“氨离开氨基酸代谢”的去向；尿素循环的五步、双氮源与延胡索酸回流由 PLATE 09 承担。
      </div>
      <div className="ao-shared">
        <span className="ao-shared-label">接口</span>
        <Link className="ao-shared-link" to="/pathway/urea-cycle?step=urea-1">
          尿素循环 · urea-1
        </Link>
      </div>
    </div>
  );
}
