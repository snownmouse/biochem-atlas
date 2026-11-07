import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import PathwaySwitcher from "../components/PathwaySwitcher";
import { PathwayRailFoot } from "../components/PathwayRail";
import PlateInteraction from "../components/PlateInteraction";
import ReadingGuide from "../components/ReadingGuide";
import EmbeddedStepViewer from "../components/EmbeddedStepViewer";
import { loadStepManifest, resolveStepAsset, stepAssets } from "../data/stepAssets";
import { comparisonConfigFor } from "../data/comparisonConfig";
import { GRADE_LABEL, gradesForStep } from "../data/evidenceGrade";
import ureaRaw from "../data/urea-cycle/urea.json";
import skeletonRaw from "../data/urea-cycle/skeleton.json";
import type {
  CompartmentId,
  LinkType,
  SkeletonLink,
  SkeletonNode,
  UreaData,
  UreaSkeleton,
} from "../data/urea-cycle/types";

const data = ureaRaw as unknown as UreaData;
const skel = skeletonRaw as unknown as UreaSkeleton;

const PAPER = "#F6F3EC";
const INK = "#22282A";
const AMBER = "#B4761F";
const TEAL = "#2E6E6B";
const BRICK = "#9C4A3C";

const W = skel.canvas.width;
const H = skel.canvas.height;
const R = 26;
const MACHINE_W = 62;
const MACHINE_H = 26;

const CIRCLE_NO = ["①", "②", "③", "④", "⑤"];

const NODE_TARGETS: Record<string, string> = {
  nh3: "urea-1",
  hco3: "urea-1",
  cps1: "urea-1",
  carbamoylP: "urea-1",
  otc: "urea-2",
  "ornithine-mit": "urea-2",
  "citrulline-mit": "urea-2",
  ornt1: "urea-ornt1",
  "citrulline-cyt": "urea-3",
  "asp-entry": "urea-asp-entry",
  asp: "urea-3",
  ass: "urea-3",
  argininosuccinate: "urea-3",
  asl: "urea-4",
  arginine: "urea-4",
  arg1: "urea-5",
  urea: "urea-5",
  fumarate: "urea-4",
  "ornithine-cyt": "urea-5",
};

const COMPARTMENT_TONE: Record<CompartmentId, number> = {
  "mito-matrix": 0.018,
  "mito-inner-membrane": 0.05,
  cytosol: 0.012,
};

const nodeById = (id: string) => skel.nodes.find((n) => n.id === id);

function boundaryPoint(n: SkeletonNode, towardX: number, towardY: number) {
  const dx = towardX - n.x;
  const dy = towardY - n.y;
  if (n.role === "machine") {
    if (Math.abs(dx) >= Math.abs(dy) * 1.6) {
      return { x: n.x + (dx >= 0 ? MACHINE_W / 2 : -MACHINE_W / 2), y: n.y };
    }
    return { x: n.x, y: n.y + (dy >= 0 ? MACHINE_H / 2 : -MACHINE_H / 2) };
  }
  const len = Math.hypot(dx, dy) || 1;
  return { x: n.x + (dx / len) * R, y: n.y + (dy / len) * R };
}

function curveBetween(from: SkeletonNode, to: SkeletonNode, bend = 0.16) {
  const s = boundaryPoint(from, to.x, to.y);
  const e = boundaryPoint(to, from.x, from.y);
  const dx = e.x - s.x;
  const dy = e.y - s.y;
  const len = Math.hypot(dx, dy) || 1;
  const cx = (s.x + e.x) / 2 - (dy / len) * len * bend;
  const cy = (s.y + e.y) / 2 + (dx / len) * len * bend;
  return `M ${s.x.toFixed(1)} ${s.y.toFixed(1)} Q ${cx.toFixed(1)} ${cy.toFixed(1)} ${e.x.toFixed(1)} ${e.y.toFixed(1)}`;
}

const SPECIAL_PATHS: Record<string, string> = {
  // 瓜氨酸出基质 → 过 ORNT1 → 胞质；竖线显式穿越内膜带（250–340）
  "citrulline-mit->citrulline-cyt": "M 584 150 L 640 250 L 640 340 L 640 374",
  // 鸟氨酸从胞质回基质，仍走同一 ORNT1 机器；与上面的出环线错开 50px，表达反向转运
  "ornithine-cyt->ornithine-mit": "M 1424 580 L 690 590 L 690 340 L 690 250 L 481 232",
  // 延胡索酸 → TCA 回流带 → 天冬氨酸（不新增 TCA 中间节点）
  "fumarate->asp": "M 1180 600 C 1100 696 960 706 870 656 C 840 626 820 560 820 422",
  // 天冬氨酸进入胞质：从基质侧向下穿过整条内膜转运带（250–340），落到胞质节点上沿
  "asp-entry->asp": "M 820 236 L 820 366",
};

function pathFor(link: SkeletonLink, index: number) {
  const key = `${link.from}->${link.to}`;
  if (SPECIAL_PATHS[key]) return SPECIAL_PATHS[key];
  const from = nodeById(link.from);
  const to = nodeById(link.to);
  if (!from || !to) return null;
  const bend = index % 2 === 0 ? 0.15 : -0.13;
  return curveBetween(from, to, bend);
}

function linkStyle(type: LinkType) {
  if (type === "main") return { stroke: INK, width: 2.3, dash: undefined, opacity: 1 };
  if (type === "cycle-return") return { stroke: INK, width: 1.5, dash: "5 4", opacity: 0.72 };
  if (type === "shuttle") return { stroke: TEAL, width: 1.4, dash: "4 4", opacity: 0.85 };
  if (type === "feed") return { stroke: INK, width: 0.9, dash: "4 3", opacity: 0.54 };
  if (type === "branch") return { stroke: BRICK, width: 1.2, dash: "5 4", opacity: 0.8 };
  if (type === "cycle-exit") return { stroke: BRICK, width: 1.6, dash: "5 4", opacity: 0.82 };
  if (type === "recycle") return { stroke: TEAL, width: 1.3, dash: "6 4", opacity: 0.78 };
  return { stroke: INK, width: 1, dash: "4 3", opacity: 0.6 };
}

export function UreaCycleOverviewPage() {
  const plateSvgRef = useRef<SVGSVGElement>(null);
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    const step = q.get("step");
    if (!step) return;
    if (data.steps.some((s) => s.id === step) || skel.transportSteps.some((t) => t.id === step)) {
      setSelected(step);
    }
  }, []);

  const select = (id: string) => {
    setSelected(id);
    const url = new URL(window.location.href);
    url.searchParams.set("step", id);
    window.history.replaceState(null, "", url.toString());
  };

  const onPlateClick = (e: React.MouseEvent<SVGSVGElement>) => {
    const el = e.target as Element;
    // 与既有页面一致：先判自测揭晓层，再判步骤，再判节点，最后判转运。
    // 本轮没有自测层，但保留这个分支，禁止把三个选择器合并成一个 closest。
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
      const target = nodeId ? NODE_TARGETS[nodeId] : null;
      if (target) select(target);
      return;
    }
    const transportEl = el.closest("[data-transport-id]");
    if (transportEl) {
      const id = transportEl.getAttribute("data-transport-id");
      if (id) select(id);
    }
  };

  const selectedStep = useMemo(() => data.steps.find((s) => s.id === selected) ?? null, [selected]);
  const selectedTransport = useMemo(
    () => skel.transportSteps.find((t) => t.id === selected) ?? null,
    [selected],
  );

  /* 资产注册表：manifest.json 异步合并，按当前步解析 3D 资产；缺失步骤与转运保持原占位 */
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
    () => (selectedStep ? resolveStepAsset(selectedStep.id, assetReg)?.cfg ?? null : null),
    [selectedStep, assetReg],
  );

  const cmpConfig = comparisonConfigFor("urea-cycle");
  const selectedCmp = useMemo(
    () => (selectedStep && cmpConfig ? cmpConfig.steps.find((s) => s.stepId === selectedStep.id) ?? null : null),
    [selectedStep, cmpConfig],
  );
  const grade = useMemo(() => (selectedCmp ? gradesForStep(selectedCmp) : null), [selectedCmp]);

  const nav = useMemo(() => {
    if (!selectedStep) return { prev: null as string | null, next: data.steps[0]?.id ?? "", prevLabel: "", nextLabel: "从 ① CPS1 开始" };
    const i = data.steps.findIndex((s) => s.id === selectedStep.id);
    const prev = i > 0 ? data.steps[i - 1] : null;
    const next = i < data.steps.length - 1 ? data.steps[i + 1] : null;
    return {
      prev: prev?.id ?? null,
      next: next?.id ?? data.steps[0].id,
      prevLabel: prev ? `${CIRCLE_NO[prev.index - 1]} ${prev.shortName}` : "",
      nextLabel: next ? `${CIRCLE_NO[next.index - 1]} ${next.shortName}` : "回到 ① CPS1",
    };
  }, [selectedStep]);

  const ledger = data.energyLedger;
  const ledgerAdp = ledger.entries.reduce((n, e) => n + e.atp, 0);
  const ledgerBonds = ledger.entries.reduce((n, e) => n + e.bonds, 0);

  return (
    <>
      <PathwaySwitcher
        current="urea-cycle"
        context={
          selectedStep ? (
            <>第 {CIRCLE_NO[selectedStep.index - 1]} 步 · {selectedStep.shortName}</>
          ) : selectedTransport ? (
            <>跨膜 · {selectedTransport.name}</>
          ) : (
            <>五步 · 双氮源 · 延胡索酸回流 TCA</>
          )
        }
      />

      <div className="poster poster-urea">
        <header className="masthead">
          <div className="mast-side">
            <span className="plate-no num">{data.plateNo} · {data.structureNo} · 2026</span>
            <span className="mast-en">{data.enName}</span>
          </div>
          <div className="mast-main">
            <h1>
              {data.name}
              <small>两个氮 · 两个区室 · 一条跨 TCA 的碳骨架回流</small>
            </h1>
            <p className="mast-summary">{data.summary}</p>
          </div>
        </header>

        <div className="legend">
          <span className="lg">
            <svg width="46" height="10" aria-hidden>
              <line x1="0" y1="5" x2="38" y2="5" stroke={INK} strokeWidth="1.8" />
              <path d="M38,1 L46,5 L38,9 Z" fill={INK} />
            </svg>
            主链
          </span>
          <span className="lg">
            <svg width="46" height="10" aria-hidden>
              <line x1="0" y1="5" x2="40" y2="5" stroke={INK} strokeWidth="1.2" strokeDasharray="5 4" opacity={0.7} />
              <path d="M40,1 L46,5 L40,9 Z" fill={INK} opacity={0.6} />
            </svg>
            可逆 / 回流
          </span>
          <span className="lg">
            <svg width="46" height="10" aria-hidden>
              <line x1="0" y1="5" x2="42" y2="5" stroke={TEAL} strokeWidth="1.2" strokeDasharray="4 3" />
            </svg>
            跨膜穿梭（ORNT1 / Asp 进入）
          </span>
          <span className="lg">
            <span style={{ color: BRICK, fontWeight: 700 }}>砖红</span>＝氮源 A / 尿素
            <span style={{ margin: "0 6px", color: TEAL, fontWeight: 700 }}>青</span>＝TCA 回流 / 氮源 B
          </span>
          <span className="lg legend-hint">三泳道 · 五步 · 横向滚动在图框内（无缩放）</span>
        </div>

        <div className="body-grid">
          <div className="plate-wrap" data-urea-plate="1">
            <div className="plate-head">
              <span className="t">图 1 · 双区室闭合环：线粒体两步、胞质三步；双氮源用两支线分别标注，不写「2 NH₃」</span>
              <PlateInteraction svgRef={plateSvgRef} pathwayId="urea-cycle" />
              <span className="legend-hint num">{data.plateNo} · {data.structureNo}</span>
            </div>

            <ReadingGuide
              label="尿素循环导读"
              summary="肝：2 个氮（NH₃ + 天冬氨酸）→ 1 个尿素；线粒体 2 步、胞质 3 步"
              paragraphs={[
                "尿素循环在肝把两个氮装成一个尿素排出，同时把碳骨架退回 TCA；它是血氨的终处置通路，两个氮来源不同。前两步在线粒体基质、后三步在胞质，瓜氨酸与鸟氨酸经 ORNT1 跨内膜往返。",
                "前两步在线粒体：CPS1 用 NH₃、HCO₃⁻ 与 2 ATP 造氨甲酰磷酸，N-乙酰谷氨酸为必需变构激活剂；OTC 把它交给鸟氨酸生成瓜氨酸。瓜氨酸经 ORNT1 出内膜，后三步在胞质：ASS 接入天冬氨酸 α-氨基（ATP→AMP+PPi），ASL 释放延胡索酸与精氨酸，ARG1 水解释放尿素并再生鸟氨酸。氮账为 NH₃ 1 + 天冬氨酸 α-NH₂ 1 = 尿素 2。",
                "调控入口是 CPS1 的 NAG 变构激活。CPS1 是进环供料步，闭环是 2→3→4→5→2，不是回到 CPS1。延胡索酸走 TCA 第 7、8 步成草酰乙酸，再经 AST 转氨变回天冬氨酸，碳骨架回流使循环不必净耗天冬氨酸。能量名义 3 ATP、折算 4 个高能键。交接：延胡索酸 ↔ TCA 的 fum，天冬氨酸来自草酰乙酸转氨，NH₄⁺ 从氨基酸代谢汇入。",
              ]}
            />

            <div className="plate-scroll" data-plate-scroll="1">
              <div className="plate-canvas">
                <svg
                  ref={plateSvgRef}
                  width={W}
                  height={H}
                  viewBox={`0 0 ${W} ${H}`}
                  onClick={onPlateClick}
                  data-frame="urea"
                  data-lanes="mito-matrix,mito-inner-membrane,cytosol"
                  data-step-count={data.steps.length}
                  data-node-count={skel.nodes.length}
                  data-cycle-closure="urea-2→urea-3→urea-4→urea-5→urea-2"
                  data-dual-nitrogen="1"
                  data-tca-shared="tca:fum"
                  aria-label="尿素循环跨线粒体与胞质挂图"
                >
                  <defs>
                    <marker id="urea-ah-ink" markerWidth="9" markerHeight="8" refX="8" refY="4" orient="auto">
                      <path d="M0,0.5 L8.5,4 L0,7.5 Z" fill={INK} />
                    </marker>
                    <marker id="urea-ah-heavy" markerWidth="10" markerHeight="9" refX="9" refY="4.5" orient="auto">
                      <path d="M0,0.5 L9.5,4.5 L0,8.5 Z" fill={INK} />
                    </marker>
                    <marker id="urea-ah-teal" markerWidth="9" markerHeight="8" refX="8" refY="4" orient="auto">
                      <path d="M0,0.5 L8.5,4 L0,7.5 Z" fill={TEAL} opacity={0.8} />
                    </marker>
                    <marker id="urea-ah-brick" markerWidth="9" markerHeight="8" refX="8" refY="4" orient="auto">
                      <path d="M0,0.5 L8.5,4 L0,7.5 Z" fill={BRICK} opacity={0.85} />
                    </marker>
                  </defs>

                  <g stroke={INK} strokeWidth={1} opacity={0.4}>
                    <path d="M20,12 V28 M12,20 H28" />
                    <path d={`M${W - 20},12 V28 M${W - 28},20 H${W - 12}`} />
                    <path d={`M20,${H - 28} V${H - 12} M12,${H - 20} H28`} />
                    <path d={`M${W - 20},${H - 28} V${H - 12} M${W - 28},${H - 20} H${W - 12}`} />
                  </g>

                  {/* ===== 泳道 ===== */}
                  <g>
                    {skel.compartments.map((c) => {
                      const [top, bottom] = c.range;
                      return (
                        <rect
                          key={c.id}
                          x={40}
                          y={top}
                          width={W - 80}
                          height={bottom - top}
                          fill={INK}
                          opacity={COMPARTMENT_TONE[c.id]}
                          data-compartment-band={c.id}
                        />
                      );
                    })}
                    {[250, 340].map((y) => (
                      <line key={y} x1={40} y1={y} x2={W - 40} y2={y} stroke={INK} strokeWidth={y === 250 ? 1.4 : 1.1} />
                    ))}
                    <rect x={40} y={250} width={W - 80} height={4} fill={INK} opacity={0.1} />
                    <rect x={40} y={336} width={W - 80} height={4} fill={INK} opacity={0.1} />
                  </g>
                  <g fontSize={11} letterSpacing={3.2} fontWeight={700} fill={INK} data-compartment-label="text">
                    <text x={48} y={82}>线粒体基质 · MITOCHONDRIAL MATRIX（CPS1 / OTC）</text>
                    <text x={48} y={282} fontSize={9.5} letterSpacing={1.4}>
                      线粒体内膜 · 转运带（ORNT1 / SLC25A15 · 天冬氨酸进入）
                    </text>
                    <text x={48} y={370}>细胞质 · CYTOSOL（ASS / ASL / ARG1）</text>
                  </g>

                  {/* ===== 五步：每步一个 g[data-step-id] ===== */}
                  {data.steps.map((step) => {
                    const links = skel.links.filter((l) => l.stepId === step.id);
                    return (
                      <g
                        key={step.id}
                        data-step-id={step.id}
                        data-step-kind={step.kind}
                        data-compartment={step.compartment}
                        className={selected === step.id ? "stepg sel" : "stepg"}
                        style={{ cursor: "pointer" }}
                      >
                        {links.map((l, i) => {
                          const d = pathFor(l, i);
                          if (!d) return null;
                          const st = linkStyle(l.type);
                          return (
                            <path
                              key={`${l.from}-${l.to}-${i}`}
                              d={d}
                              fill="none"
                              stroke={st.stroke}
                              strokeWidth={st.width}
                              strokeDasharray={st.dash}
                              opacity={st.opacity}
                              markerEnd={
                                l.type === "main"
                                  ? "url(#urea-ah-heavy)"
                                  : l.type === "branch" || l.type === "cycle-exit"
                                    ? "url(#urea-ah-brick)"
                                    : "url(#urea-ah-ink)"
                              }
                            />
                          );
                        })}
                        <text
                          x={step.labelAt.x}
                          y={step.labelAt.y}
                          textAnchor={step.labelAt.anchor}
                          fontSize={12}
                          fontWeight={700}
                          fill={INK}
                        >
                          <tspan className="st-no serif" fontSize={15}>{CIRCLE_NO[step.index - 1]}</tspan>
                          {"  "}{step.shortName} · {step.name}
                        </text>
                        <text
                          x={step.subAt.x}
                          y={step.subAt.y}
                          textAnchor={step.subAt.anchor}
                          fontSize={8.8}
                          fill={INK}
                          opacity={0.62}
                        >
                          {step.subLabel}
                        </text>
                      </g>
                    );
                  })}

                  {/* ===== 跨膜转运：不是五步之一 ===== */}
                  {skel.transportSteps.map((t) => {
                    const links = skel.links.filter((l) => l.transportId === t.id);
                    return (
                      <g key={t.id} data-transport-id={t.id} data-transport-kind="shuttle" className={selected === t.id ? "transport sel" : "transport"} style={{ cursor: "pointer" }}>
                        {links.map((l, i) => {
                          const d = pathFor(l, i);
                          if (!d) return null;
                          const st = linkStyle(l.type);
                          return (
                            <path
                              key={`${l.from}-${l.to}-${i}`}
                              d={d}
                              fill="none"
                              stroke={st.stroke}
                              strokeWidth={st.width}
                              strokeDasharray={st.dash}
                              opacity={st.opacity}
                              markerEnd="url(#urea-ah-teal)"
                            />
                          );
                        })}
                        {t.id === "urea-ornt1" ? (
                          <>
                            <text x={700} y={352} fontSize={8.5} fill={TEAL} fontWeight={700} data-shuttle-label="1">
                              瓜氨酸 ↓ / 鸟氨酸 ↑
                            </text>
                            <text x={700} y={364} fontSize={8} fill={INK} opacity={0.6}>
                              反向转运 · 不耗 ATP
                            </text>
                          </>
                        ) : (
                          <text x={848} y={330} fontSize={8.5} fill={TEAL} fontWeight={700} data-shuttle-label="1">
                            天冬氨酸进入胞质
                          </text>
                        )}
                      </g>
                    );
                  })}

                  {/* ===== 延胡索酸 → TCA 回流带（引用，不新增 TCA 节点） ===== */}
                  {skel.links.filter((l) => l.type === "recycle").map((l, i) => {
                    const d = pathFor(l, i);
                    if (!d) return null;
                    return (
                      <g key={`${l.from}-${l.to}`} data-tca-return-band="1">
                        <path
                          d={d}
                          fill="none"
                          stroke={TEAL}
                          strokeWidth={1.5}
                          strokeDasharray="6 4"
                          opacity={0.82}
                          markerEnd="url(#urea-ah-teal)"
                        />
                        <text x={930} y={742} textAnchor="middle" fontSize={9.2} fill={TEAL} fontWeight={700}>
                          延胡索酸 → 苹果酸 → 草酰乙酸 → 天冬氨酸（TCA 7–8 步 + AST）
                        </text>
                        <text x={930} y={758} textAnchor="middle" fontSize={8.5} fill={INK} opacity={0.62}>
                          碳骨架不是废物，是让循环持续运转的回流载体
                        </text>
                      </g>
                    );
                  })}

                  {/* ===== 节点 ===== */}
                  {skel.nodes.map((n) => {
                    const lp = n.labelPos;
                    return (
                      <g
                        key={n.id}
                        data-node-id={n.id}
                        data-entity-id={n.entityId}
                        data-compartment={n.compartment}
                        data-node-role={n.role}
                        className={selected && NODE_TARGETS[n.id] === selected ? "node sel" : "node"}
                        style={{ cursor: "pointer" }}
                      >
                        {n.role === "machine" ? (
                          <>
                            <rect
                              x={n.x - MACHINE_W / 2}
                              y={n.y - MACHINE_H / 2}
                              width={MACHINE_W}
                              height={MACHINE_H}
                              rx={2}
                              fill="#fff"
                              stroke={n.compartment === "mito-inner-membrane" ? TEAL : INK}
                              strokeWidth={1.1}
                            />
                            <text
                              x={n.x}
                              y={n.y + 4.5}
                              textAnchor="middle"
                              fontSize={n.id === "ornt1" ? 8.6 : 11}
                              fontWeight={700}
                              fill={n.compartment === "mito-inner-membrane" ? TEAL : INK}
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
                              fill={n.role === "projection" ? "#fff" : PAPER}
                              stroke={n.role === "projection" ? TEAL : INK}
                              strokeWidth={n.role === "projection" ? 1.2 : 1.5}
                              strokeDasharray={n.role === "projection" ? "4 3" : undefined}
                            />
                            <text
                              x={n.x}
                              y={n.y + 5}
                              textAnchor="middle"
                              fontSize={n.entityId === "ornithine" ? 9.5 : 11}
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
                                fill={n.entityId === "asp" ? TEAL : n.entityId === "urea" ? BRICK : INK}
                                opacity={0.74}
                              >
                                {n.label}
                              </text>
                            ) : null}
                          </>
                        )}
                      </g>
                    );
                  })}
                </svg>
              </div>
            </div>

            <PathwayRailFoot current="urea-cycle" />
            <div className="poster-foot">
              <span>区室标签是硬约束：线粒体基质 / 内膜转运带 / 胞质三条带位必须可读；跨膜段只放 ORNT1 与 Asp 进入，不画成第六步。</span>
              <span>闭环是 2 → 3 → 4 → 5 → 2：ARG1 再生的鸟氨酸经 ORNT1 回到 OTC，不是回到 CPS1。</span>
            </div>
          </div>

          <aside>
            <div className="panel-block">
              <div className="pb-title">
                <span>详情栏</span>
                <span className="en">DETAIL · 点击图上任一步骤 / 机器 / 节点 / 转运带</span>
              </div>
              {selectedStep ? (
                <div className="d-body">
                  <div className="d-step">
                    <span className="no serif num">{CIRCLE_NO[selectedStep.index - 1]}</span>
                    {selectedStep.name}
                    <span className="d-tag">{selectedStep.irreversible ? "不可逆" : "可逆"}</span>
                    <span className="d-tag amber">{selectedStep.compartment === "mito-matrix" ? "线粒体基质" : "胞质"}</span>
                  </div>
                  <div className="d-enzyme">
                    {selectedStep.enzyme.name}
                    {selectedStep.enzyme.isozyme ? <span className="d-iso"> — {selectedStep.enzyme.isozyme}</span> : null}
                  </div>
                  <div className="d-eq">{selectedStep.equation}</div>
                  <div className="d-cof num"><b>EC</b>　{selectedStep.ecNumber}</div>
                  {selectedStep.cofactors.length ? <div className="d-cof"><b>辅因子</b>　{selectedStep.cofactors.join(" · ")}</div> : null}
                  <div className="d-cof" data-dg="1">
                    <b>ΔG</b>
                    <span style={{ opacity: 0.62 }}> 定性：{selectedStep.deltaG.qualitative}</span>
                    <span className="num" style={{ opacity: 0.5 }}>
                      {" · "}
                      {selectedStep.deltaG.source}
                    </span>
                  </div>
                  <div className="d-cof" data-nitrogen-role={selectedStep.nitrogen.role}>
                    <b>氮</b>　{selectedStep.nitrogen.text}
                  </div>
                  <div className="d-cof" data-carbon-role={selectedStep.carbon.netChange ? "net" : "carrier"}>
                    <b>碳</b>　{selectedStep.carbon.text}
                  </div>
                  <div className="d-sig">{selectedStep.significance}</div>

                  {grade ? (
                    <div className="d-cof" data-testid="urea-grade" data-grade={grade.grade ?? (grade.calc ? "calc" : grade.only2d ? "2d" : "none")}>
                      <b>证据等级</b>　
                      {grade.grade ? GRADE_LABEL[grade.grade] : grade.calc ? "计算构象（无实验坐标）" : grade.only2d ? "仅 2D" : "未分级"}
                      {grade.sidesDiffer ? <span style={{ opacity: 0.6 }}>（两侧实验证据不一致，按最差侧计）</span> : null}
                    </div>
                  ) : null}

                  {selectedCmp ? (
                    <Link
                      className="frames-entry"
                      data-testid="urea-structure-cmp-entry"
                      data-cmp-step={selectedStep.id}
                      to={`/structures/urea-cycle#${selectedStep.id}`}
                    >
                      看这一步的结构对照 →
                    </Link>
                  ) : (
                    <div className="d-none" data-cmp-missing="1">
                      本步未建分子对照——结构页 {data.structureNo} 覆盖 5 块（全部仅 2D 文字占位）。
                    </div>
                  )}

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

                  {selectedCfg ? (
                    <EmbeddedStepViewer stepId={selectedStep.id} cfg={selectedCfg} />
                  ) : (
                    <div className="d-none" data-3d-placeholder="1">
                      3D 结合视图：待结构核验——{selectedStep.threeD.note}
                    </div>
                  )}
                </div>
              ) : selectedTransport ? (
                <div className="d-body" data-transport-detail="1">
                  <div className="d-step">
                    <span className="no serif num">↔</span>
                    {selectedTransport.name}
                    <span className="d-tag amber">转运 · 不计入五步</span>
                  </div>
                  <div className="d-eq">{selectedTransport.note}</div>
                  <div className="d-cof">
                    <b>路线</b>　{selectedTransport.from} → {selectedTransport.via} → {selectedTransport.to}
                  </div>
                  <div className="d-none" data-3d-placeholder="1">
                    3D 结合视图：待结构核验——转运体结构本轮未核验，不建资产。
                  </div>
                </div>
              ) : (
                <div className="d-body">
                  <div className="d-placeholder">
                    点击图上的步骤箭头、酶机器或代谢物节点，此处显示该步的反应式、酶、区室、ΔG（仅保留定性标注，不展示数值）、
                    两个氮的归属与碳账。鸟氨酸在基质与胞质各有一个节点，瓜氨酸跨膜也有两个节点；同实体多节点都可点击。
                    跨内膜的 ORNT1 与 Asp 进入是转运，不计入五步。
                  </div>
                </div>
              )}
            </div>

            {/* ① 双氮源示意 */}
            <div className="panel-block" data-dual-nitrogen="1">
              <div className="pb-title">
                <span>双氮源 · 两个氮不是同一来源</span>
                <span className="en">TWO NITROGEN DONORS</span>
              </div>
              <svg width="100%" viewBox="0 0 340 118" aria-hidden="false" data-dual-nitrogen-svg="1">
                <defs>
                  <marker id="urea-mini-brick" markerWidth="8" markerHeight="7" refX="7" refY="3.5" orient="auto">
                    <path d="M0,0.5 L7.5,3.5 L0,6.5 Z" fill={BRICK} />
                  </marker>
                  <marker id="urea-mini-teal" markerWidth="8" markerHeight="7" refX="7" refY="3.5" orient="auto">
                    <path d="M0,0.5 L7.5,3.5 L0,6.5 Z" fill={TEAL} />
                  </marker>
                  <marker id="urea-mini-ink" markerWidth="8" markerHeight="7" refX="7" refY="3.5" orient="auto">
                    <path d="M0,0.5 L7.5,3.5 L0,6.5 Z" fill={INK} />
                  </marker>
                </defs>
                <text x={4} y={20} fontSize={11} fontWeight={700} fill={BRICK}>氮源 A · 游离 NH₃</text>
                <text x={4} y={35} fontSize={9} fill={INK} opacity={0.65}>CPS1 · 线粒体基质</text>
                <text x={4} y={88} fontSize={11} fontWeight={700} fill={TEAL}>氮源 B · Asp α-氨基</text>
                <text x={4} y={103} fontSize={9} fill={INK} opacity={0.65}>ASS · 胞质</text>
                <path d="M 104 22 C 150 30 196 44 244 54" fill="none" stroke={BRICK} strokeWidth={1.4} markerEnd="url(#urea-mini-brick)" />
                <path d="M 124 88 C 168 84 204 76 244 70" fill="none" stroke={TEAL} strokeWidth={1.4} markerEnd="url(#urea-mini-teal)" />
                <rect x={244} y={42} width={90} height={44} rx={2} fill={PAPER} stroke={BRICK} strokeWidth={1.2} />
                <text x={289} y={60} textAnchor="middle" fontSize={11} fontWeight={700} fill={BRICK}>尿素</text>
                <text x={289} y={76} textAnchor="middle" fontSize={9} fill={INK} opacity={0.7}>2 N</text>
              </svg>
              <div style={{ fontSize: 11, lineHeight: 1.75, marginTop: 4 }} data-dual-nitrogen-note="1">
                {data.dualNitrogen.diagramNote}
              </div>
              <div style={{ fontSize: 10.5, opacity: 0.65, lineHeight: 1.7, marginTop: 6 }}>
                A：{data.dualNitrogen.sources[0].donor}；{data.dualNitrogen.sources[0].entersAs}。
                <br />
                B：{data.dualNitrogen.sources[1].donor}；{data.dualNitrogen.sources[1].entersAs}。
              </div>
            </div>

            {/* ② 能量账 */}
            <div className="panel-block" data-ledger-urea="1" data-nominal-atp={ledger.nominalAtp} data-high-energy-bonds={ledger.highEnergyBonds}>
              <div className="pb-title">
                <span>能量账 · 名义 3 ATP / 折算 4 个高能键</span>
                <span className="en">ENERGY LEDGER · PER UREA</span>
              </div>
              <div className="settle">
                <div>
                  <div className="s-lbl">名义 ATP</div>
                  <div className="s-val a num">{ledger.nominalAtp}</div>
                  <div className="s-sub num">{ledger.nominalLabel}</div>
                </div>
                <div>
                  <div className="s-lbl">折算</div>
                  <div className="s-val t num">{ledger.highEnergyBonds}</div>
                  <div className="s-sub num">{ledger.bondLabel}</div>
                </div>
                <div>
                  <div className="s-lbl">ADP / AMP</div>
                  <div className="s-val num" style={{ fontSize: 22 }}>{ledger.adp} / {ledger.amp}</div>
                  <div className="s-sub num">Pi {ledger.pi} · PPi {ledger.ppi}</div>
                </div>
                <div className="settle-rule" />
                <div className="settle-net" data-net-atp="3">
                  <span className="n-lbl">核对</span>
                  <span className="n-val num">{ledgerAdp} ATP · {ledgerBonds} 键</span>
                </div>
              </div>
              <div style={{ fontSize: 11, lineHeight: 1.9, marginTop: 10 }}>
                {ledger.entries.map((e) => (
                  <div key={e.stepId} style={{ display: "flex", justifyContent: "space-between", borderTop: "1px solid rgba(34,40,42,.2)", paddingTop: 4 }} data-energy-entry={e.stepId}>
                    <span>{e.label} · {e.detail}</span>
                    <span className="num">{e.atp} ATP / {e.bonds} 键</span>
                  </div>
                ))}
                <div style={{ borderTop: `1px solid ${INK}`, marginTop: 5, paddingTop: 5, fontWeight: 700 }}>
                  净方程
                </div>
                <div className="num" style={{ fontSize: 10.5, lineHeight: 1.8 }}>{ledger.netEquation}</div>
              </div>
              <div style={{ fontSize: 10.5, opacity: 0.64, marginTop: 7, lineHeight: 1.7 }} data-balance-note="1">
                {ledger.balanceNote}
              </div>
            </div>

            {/* ③ TCA 回流 */}
            <div className="panel-block" data-tca-return="1" data-tca-shared="tca:fum">
              <div className="pb-title">
                <span>与 TCA 的回流</span>
                <span className="en">FUMARATE ↔ ASPARTATE</span>
              </div>
              <svg width="100%" viewBox="0 0 340 100" data-tca-return-svg="1">
                <defs>
                  <marker id="urea-mini2-ink" markerWidth="8" markerHeight="7" refX="7" refY="3.5" orient="auto">
                    <path d="M0,0.5 L7.5,3.5 L0,6.5 Z" fill={INK} />
                  </marker>
                  <marker id="urea-mini2-teal" markerWidth="8" markerHeight="7" refX="7" refY="3.5" orient="auto">
                    <path d="M0,0.5 L7.5,3.5 L0,6.5 Z" fill={TEAL} />
                  </marker>
                </defs>
                <text x={6} y={22} fontSize={9.5} fontWeight={700} fill={TEAL}>延胡索酸 Fum</text>
                <text x={92} y={22} fontSize={9.5} fontWeight={700} fill={INK}>苹果酸 Mal</text>
                <text x={178} y={22} fontSize={9.5} fontWeight={700} fill={INK}>草酰乙酸 OAA</text>
                <text x={264} y={22} fontSize={9.5} fontWeight={700} fill={TEAL}>天冬氨酸 Asp</text>
                <path d="M 86 17 L 90 17" fill="none" stroke={INK} strokeWidth={0.8} />
                <path d="M 150 17 L 176 17" fill="none" stroke={INK} strokeWidth={0.8} markerEnd="url(#urea-mini2-ink)" />
                <path d="M 258 17 L 270 17" fill="none" stroke={INK} strokeWidth={0.8} markerEnd="url(#urea-mini2-ink)" />
                <path d="M 300 30 C 318 66 260 88 160 90 C 70 88 36 70 40 34" fill="none" stroke={TEAL} strokeWidth={1.1} strokeDasharray="5 4" markerEnd="url(#urea-mini2-teal)" />
                <text x={170} y={58} textAnchor="middle" fontSize={9} fill={INK} opacity={0.7}>TCA 7 → 8 → AST 转氨</text>
                <text x={170} y={74} textAnchor="middle" fontSize={9.5} fill={TEAL} fontWeight={700}>碳骨架不是废物，是回流的载体</text>
              </svg>
              <div style={{ fontSize: 11, lineHeight: 1.75 }} data-tca-return-note="1">
                {data.tcaInterface.explanation}
              </div>
              <div style={{ fontSize: 10.5, opacity: 0.66, lineHeight: 1.7, marginTop: 5 }}>
                {data.tcaInterface.whyItMatters}
              </div>
              <div style={{ fontSize: 10.5, marginTop: 7 }}>
                <Link to="/pathway/tca?step=tca-6" data-tca-link="fum">→ 看 TCA 的延胡索酸（fum）</Link>
              </div>
            </div>

            {/* ④ 五步可逆性 */}
            <div className="panel-block" data-irreversible-table="1">
              <div className="pb-title">
                <span>五步 · 不可逆 / 可逆</span>
                <span className="en">REVERSIBILITY</span>
              </div>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 10.5, lineHeight: 1.65 }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: "left", borderBottom: `1px solid ${INK}`, padding: "4px 2px", width: "34%" }}>步骤</th>
                    <th style={{ textAlign: "left", borderBottom: `1px solid ${INK}`, padding: "4px 2px", width: "20%" }}>方向</th>
                    <th style={{ textAlign: "left", borderBottom: `1px solid ${INK}`, padding: "4px 2px" }}>依据</th>
                  </tr>
                </thead>
                <tbody>
                  {data.steps.map((s) => (
                    <tr key={s.id} data-rev-row={s.id}>
                      <td style={{ borderBottom: "1px solid rgba(34,40,42,.18)", padding: "4px 2px", fontWeight: 700 }}>
                        {CIRCLE_NO[s.index - 1]} {s.shortName}
                      </td>
                      <td style={{ borderBottom: "1px solid rgba(34,40,42,.18)", padding: "4px 2px", color: s.irreversible ? AMBER : TEAL, fontWeight: 700 }}>
                        {s.irreversible ? "不可逆" : "可逆"}
                      </td>
                      <td style={{ borderBottom: "1px solid rgba(34,40,42,.18)", padding: "4px 2px" }}>{s.deltaG.qualitative}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div style={{ fontSize: 10.5, opacity: 0.64, lineHeight: 1.7, marginTop: 7 }}>
                可逆不等于生理上双向：OTC 与 ASL 的反应本身可逆，但通量由 CPS1 供料和下游消耗拉动。
              </div>
            </div>

            {/* 临床条目（克制，只写一句机制） */}
            <div className="panel-block" data-urea-clinical="1">
              <div className="pb-title">
                <span>临床条目 · 只写机制</span>
                <span className="en">CLINICAL · ONE LINE EACH</span>
              </div>
              <ul style={{ margin: 0, paddingLeft: 16, fontSize: 10.5, lineHeight: 1.8 }}>
                {data.clinical.map((c) => (
                  <li key={c.id} data-clinical={c.id}>
                    <b>{c.name}</b>（{c.inheritance}）— {c.mechanism}
                  </li>
                ))}
              </ul>
              <div style={{ fontSize: 10.5, opacity: 0.62, lineHeight: 1.7, marginTop: 7 }} data-3d-note="1">
                {data.threeD.note}
              </div>
            </div>
          </aside>
        </div>
      </div>
    </>
  );
}

export default UreaCycleOverviewPage;
