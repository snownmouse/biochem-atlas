// PLATE 18「血浆脂蛋白代谢」（SF-18）。
// 版式沿用 Cori 循环的“器官列 + 血流带 + 物流步骤”，但内容换成了器官间脂蛋白颗粒搬运：
// 每个步骤是一段自包含的物流（谁把什么颗粒从哪搬到哪、表面发生了什么），不是反应链。
// 页面不写酶学参数、反应式或 ΔG；需要反应细节时走接口 / 结构对照。
import { useCallback, useEffect, useRef } from "react";
import type { MouseEvent as ReactMouseEvent } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import lipoproteinJson from "../data/lipoprotein/lipoprotein.json";
import skelJson from "../data/lipoprotein/skeleton.json";
import type {
  LipoproteinData,
  LipoproteinSkeleton,
  LogisticsKind,
  LogisticsStep,
} from "../data/lipoprotein/types";
import PathwaySwitcher from "../components/PathwaySwitcher";
import { PathwayRailFoot } from "../components/PathwayRail";
import PlateInteraction from "../components/PlateInteraction";
import ReadingGuide from "../components/ReadingGuide";

const data = lipoproteinJson as unknown as LipoproteinData;
const skel = skelJson as unknown as LipoproteinSkeleton;

const INK = "#22282A";
const AMBER = "#B4761F";
const TEAL = "#2E6E6B";
const BRICK = "#9C4A3C";
const ROSE = "#A2475E";
const PAPER = "#F6F3EC";

const W = skel.canvas.width;
const H = skel.canvas.height;

const KIND: Record<LogisticsKind, { zh: string; en: string; color: string }> = {
  assembly: { zh: "组装", en: "ASSEMBLY", color: TEAL },
  lipolysis: { zh: "脂解", en: "LIPOLYSIS", color: AMBER },
  receptor: { zh: "受体摄取", en: "RECEPTOR", color: BRICK },
  efflux: { zh: "外流", en: "EFFLUX", color: ROSE },
  transfer: { zh: "转运", en: "TRANSFER", color: TEAL },
  uptake: { zh: "摄取", en: "UPTAKE", color: BRICK },
};

const ORGAN = new Map(data.organs.map((o) => [o.id, o]));
const STEP = new Map(data.steps.map((s) => [s.id, s]));

// 接口只登记两端都真实存在的站内步骤；href 与 stepIndex 的路由保持一致。
const INTERFACE_HREF: Record<string, string> = {
  "fao-act": "/pathway/fatty-acid-oxidation?step=fao-act",
  "ch-13": "/pathway/cholesterol?step=ch-13",
};

const NODE_LABEL_DX: Record<
  "left" | "right" | "above" | "below",
  { dx: number; dy: number; anchor: "start" | "end" | "middle" }
> = {
  left: { dx: -26, dy: 4, anchor: "end" },
  right: { dx: 26, dy: 4, anchor: "start" },
  above: { dx: 0, dy: -26, anchor: "middle" },
  below: { dx: 0, dy: 30, anchor: "middle" },
};

const flowStroke = (particle: string) => {
  if (particle.includes("HDL")) return TEAL;
  if (particle === "CETP") return ROSE;
  if (particle === "LDL" || particle === "IDL") return BRICK;
  return INK;
};

export default function LipoproteinOverviewPage() {
  const params = useParams();
  const [search, setSearch] = useSearchParams();
  const pathwayId = params.pathwayId ?? "lipoprotein";
  if (pathwayId !== data.id) {
    return <div className="page">未知通路：{pathwayId}</div>;
  }

  const stepParam = search.get("step");
  const selected: LogisticsStep | null = stepParam ? STEP.get(stepParam) ?? null : null;
  const selectedId = selected?.id ?? null;

  const selectStep = useCallback(
    (id: string | null) => {
      const next = new URLSearchParams(search);
      if (id) next.set("step", id);
      else next.delete("step");
      setSearch(next, { replace: true });
    },
    [search, setSearch]
  );

  const plateSvgRef = useRef<SVGSVGElement>(null);
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

  const onPlateClick = useCallback(
    (e: ReactMouseEvent<SVGSVGElement>) => {
      const el = e.target as Element;
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
    [selectedId, selectStep]
  );

  const chipClass = (id: string) => {
    const cls = ["lp-chip"];
    if (selectedId === id) cls.push("sel");
    else if (selectedId) cls.push("faded");
    return cls.join(" ");
  };
  const nodeClass = (stepId: string) => {
    const cls = ["lp-node"];
    if (selectedId === stepId) cls.push("hl");
    else if (selectedId) cls.push("faded");
    return cls.join(" ");
  };

  const selectedOrgan = selected ? ORGAN.get(selected.organId) : null;
  const stepCount = data.steps.length;
  const organCount = data.organs.length;
  const particleCount = data.particles.length;

  return (
    <div className="poster lp-poster">
      <PathwaySwitcher current="lipoprotein" context={selected ? selected.label : undefined} />

      <header className="masthead">
        <div className="mast-top">
          <span className="kicker">代谢通路挂图 · METABOLIC WALL CHART</span>
          <span className="plate-no num">{data.plateNo} · 第一版 · 2026</span>
        </div>
        <div className="mast-main">
          <h1>
            {data.name}
            <small>PLASMA LIPOPROTEIN METABOLISM — 五个器官之间搬运颗粒，不是一条反应链</small>
          </h1>
          <p className="mast-summary">
            本图把 <b className="num">{stepCount}</b> 段器官间物流摊在 <b className="num">{organCount}</b>{" "}
            个器官列上：小肠出 CM、肝出 VLDL 并回收残粒 / LDL / HDL 胆固醇、外周接受 FFA 并外流胆固醇、
            肾上腺 / 性腺取 LDL 做类固醇。每一步只回答<b>谁把什么颗粒从哪搬到哪、颗粒表面发生了什么</b>；
            不写反应式，不写 ΔG。
          </p>
        </div>
      </header>

      <div className="legend">
        <span className="lg">
          <svg width="46" height="10" aria-hidden>
            <line x1="0" y1="5" x2="46" y2="5" stroke={INK} strokeWidth="1.4" />
            <path d="M0,1 L6,5 L0,9 Z" fill={INK} />
          </svg>
          颗粒流向（血浆带内，方向由箭头读出）
        </span>
        <span className="lg">
          <svg width="46" height="10" aria-hidden>
            <circle cx="23" cy="5" r="4" fill={PAPER} stroke={INK} strokeWidth="1" />
          </svg>
          颗粒节点（落在血浆带；点击 = 对应物流步骤）
        </span>
        <span className="lg">
          <svg width="46" height="10" aria-hidden>
            <rect x="2" y="1" width="42" height="8" fill="none" stroke={INK} strokeWidth="1" />
          </svg>
          器官列（小肠 / 肝 / 外周 / 类固醇生成小分区）
        </span>
        <span className="lg">
          <span style={{ color: ROSE, fontWeight: 700 }}>玫红</span>＝外流 / CETP 交换
          <span style={{ margin: "0 6px", color: TEAL, fontWeight: 700 }}>青</span>＝HDL 方向
        </span>
        <span className="lg legend-hint">
          1440 视口可横向拖动或 Shift+滚轮漫游 · 颗粒组成只做定性
        </span>
      </div>

      <div className="body-grid">
        <div className="plate-wrap">
          <div className="plate-head">
            <span className="t">图 1 · 器官列 + 血浆带：每步是一段物流，不画成反应链</span>
            <PlateInteraction svgRef={plateSvgRef} pathwayId="lipoprotein" />
          </div>

          <ReadingGuide
            label="血浆脂蛋白导读"
            summary="小肠 → 血 → 肝 / 外周：CM、VLDL、LDL、HDL 四种颗粒在不同器官之间换手"
            paragraphs={[
              "这不是反应链：图上没有“底物 → 产物”的一步一酶。每条 chip 只描述一段物流——谁把哪种脂蛋白颗粒从哪个器官搬到哪个器官，颗粒表面带着哪些载脂蛋白。",
              "外源途径：小肠把膳食 TG 与胆固醇酯装进 CM（ApoB-48）→ 血中 LPL 被 ApoC-II 激活，水解 TG 释放 FFA → CM 缩成残粒，经 ApoE 被肝摄取。内源途径：肝把内源 TG、胆固醇与 ApoB-100 装成 VLDL → LPL 再水解，经 IDL 分流为 LDL → LDL 经 LDLR 进入肝与外周。",
              "逆向转运：外周 ABCA1 把胆固醇与磷脂交给 ApoA-I 形成新生 HDL → LCAT 被 ApoA-I 激活，把游离胆固醇酯化，HDL 成熟 → 成熟 HDL 经 SR-B1 把胆固醇酯送回肝；CETP 还能在 HDL 与 VLDL / LDL 之间交换胆固醇酯与 TG，让胆固醇间接回肝。",
            ]}
          />

          <div className="plate-scroll" ref={scrollRef}>
            <div className="plate-canvas">
              <svg
                ref={plateSvgRef}
                width={W}
                height={H}
                viewBox={`0 0 ${W} ${H}`}
                onClick={onPlateClick}
                data-lipoprotein-plate="1"
              >
                <defs>
                  <marker id="lp-ah-ink" markerWidth="9" markerHeight="8" refX="8" refY="4" orient="auto">
                    <path d="M0,0.5 L8.5,4 L0,7.5 Z" fill={INK} />
                  </marker>
                  <marker id="lp-ah-teal" markerWidth="9" markerHeight="8" refX="8" refY="4" orient="auto">
                    <path d="M0,0.5 L8.5,4 L0,7.5 Z" fill={TEAL} />
                  </marker>
                  <marker id="lp-ah-rose" markerWidth="9" markerHeight="8" refX="8" refY="4" orient="auto">
                    <path d="M0,0.5 L8.5,4 L0,7.5 Z" fill={ROSE} />
                  </marker>
                  <marker id="lp-ah-brick" markerWidth="9" markerHeight="8" refX="8" refY="4" orient="auto">
                    <path d="M0,0.5 L8.5,4 L0,7.5 Z" fill={BRICK} />
                  </marker>
                </defs>

                <g stroke={INK} strokeWidth={1} opacity={0.45}>
                  <path d="M20,12 V28 M12,20 H28" />
                  <path d={`M${W - 20},12 V28 M${W - 28},20 H${W - 12}`} />
                  <path d={`M20,${H - 28} V${H - 12} M12,${H - 20} H28`} />
                  <path d={`M${W - 20},${H - 28} V${H - 12} M${W - 28},${H - 20} H${W - 12}`} />
                </g>

                {skel.compartments.map((c) => (
                  <g key={c.id} data-compartment={c.id}>
                    <rect
                      x={c.x0}
                      y={c.y0}
                      width={c.x1 - c.x0}
                      height={c.y1 - c.y0}
                      fill={c.id === "steroid" ? ROSE : INK}
                      opacity={c.tint}
                    />
                    <rect
                      x={c.x0}
                      y={c.y0}
                      width={c.x1 - c.x0}
                      height={c.y1 - c.y0}
                      fill="none"
                      stroke={INK}
                      strokeWidth={c.id === "blood" ? 1 : 0.6}
                      strokeDasharray={c.id === "steroid" ? "3 3" : undefined}
                      opacity={c.id === "blood" ? 0.55 : 0.35}
                    />
                    {c.name && (
                      <text
                        x={c.x0 + 8}
                        y={c.y0 + 20}
                        fontSize={c.id === "blood" ? 10.5 : 9.5}
                        letterSpacing={c.id === "blood" ? 2.2 : 1.4}
                        fontWeight={700}
                        opacity={0.72}
                      >
                        {c.name}
                      </text>
                    )}
                  </g>
                ))}

                {skel.organColumns.map((col) => (
                  <g key={col.id} data-organ-column={col.id}>
                    <text
                      x={col.x}
                      y={col.headerY}
                      fontSize={col.id === "steroid" ? 14 : 22}
                      fontWeight={700}
                      className="serif"
                      fill={col.id === "steroid" ? ROSE : INK}
                    >
                      {col.name}
                    </text>
                    <text
                      x={col.x}
                      y={col.headerY + 17}
                      fontSize={col.id === "steroid" ? 9.5 : 10.5}
                      opacity={0.7}
                    >
                      {col.role}
                    </text>
                    <text
                      x={col.x}
                      y={col.headerY + 30}
                      fontSize={8}
                      letterSpacing={1.6}
                      opacity={0.5}
                    >
                      {col.en}
                    </text>
                  </g>
                ))}

                <g data-blood-band="1">
                  <text x={580} y={190} fontSize={9.2} opacity={0.55} letterSpacing={1.6}>
                    跨器官 · 颗粒在血浆中换手
                  </text>
                  {skel.flows.map((f) => {
                    const color = flowStroke(f.particle);
                    const marker =
                      color === TEAL
                        ? "url(#lp-ah-teal)"
                        : color === ROSE
                          ? "url(#lp-ah-rose)"
                          : color === BRICK
                            ? "url(#lp-ah-brick)"
                            : "url(#lp-ah-ink)";
                    return (
                      <g key={f.id}>
                        <path
                          d={f.path}
                          fill="none"
                          stroke={color}
                          strokeWidth={f.direction === "bidirectional" ? 1.3 : 1.5}
                          strokeDasharray={f.direction === "bidirectional" ? "5 3" : undefined}
                          markerEnd={marker}
                          markerStart={f.direction === "bidirectional" ? marker : undefined}
                          data-blood-flow={f.id}
                          data-flow-dir={f.direction}
                          data-flow-from={f.from}
                          data-flow-to={f.to}
                          data-flow-particle={f.particle}
                        />
                        <text
                          x={f.labelX}
                          y={f.labelY}
                          fontSize={9.4}
                          textAnchor={f.labelAnchor}
                          fontWeight={700}
                          fill={color}
                          opacity={0.9}
                        >
                          {f.label}
                        </text>
                      </g>
                    );
                  })}
                </g>

                {skel.arms.map((arm) => (
                  <path
                    key={arm.organId}
                    d={`M${arm.spine.x},${arm.spine.y0} L${arm.spine.x},${arm.spine.y1}`}
                    fill="none"
                    stroke={INK}
                    strokeWidth={0.9}
                    strokeDasharray="4 3"
                    opacity={0.4}
                    data-logistics-spine={arm.organId}
                  />
                ))}

                <g fontSize={9.5} fontWeight={700} textAnchor="middle">
                  {skel.nodes.map((n) => {
                    const lp = NODE_LABEL_DX[n.side];
                    return (
                      <g
                        key={n.id}
                        className={nodeClass(n.stepId)}
                        data-node-id={n.id}
                        data-node-step={n.stepId}
                        data-node-particle={n.particle}
                        style={{ cursor: "pointer" }}
                      >
                        <circle cx={n.x} cy={n.y} r={16} fill={PAPER} stroke={INK} strokeWidth={1.1} />
                        <text x={n.x} y={n.y + 4} fontSize={n.abbr.length > 3 ? 8.4 : 9.5}>
                          {n.abbr}
                        </text>
                        <text
                          x={n.x + lp.dx}
                          y={n.y + lp.dy}
                          fontSize={9.3}
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

                {skel.arms.map((arm) =>
                  arm.chips.map((chip) => {
                    const step = STEP.get(chip.stepId);
                    if (!step) return null;
                    const kind = KIND[step.kind];
                    return (
                      <g
                        key={step.id}
                        className={chipClass(step.id)}
                        data-step-id={step.id}
                        data-lipoprotein-chip="1"
                        data-chip-organ={chip.organId}
                        data-chip-kind={step.kind}
                        style={{ cursor: "pointer" }}
                      >
                        <line
                          x1={chip.anchor === "end" ? chip.x - 100 : chip.x}
                          y1={chip.y + 22}
                          x2={chip.anchor === "end" ? chip.x : chip.x + 100}
                          y2={chip.y + 22}
                          stroke={INK}
                          strokeWidth={0.8}
                          opacity={0.3}
                        />
                        <circle cx={chip.x} cy={chip.y - 9} r={2.4} fill={kind.color} stroke={INK} strokeWidth={0.7} />
                        <text
                          x={chip.x}
                          y={chip.y}
                          fontSize={8.8}
                          letterSpacing={0.6}
                          textAnchor={chip.anchor}
                          fontWeight={700}
                          fill={kind.color}
                          opacity={0.9}
                        >
                          {kind.zh} · {kind.en}
                        </text>
                        <text
                          x={chip.x}
                          y={chip.y + 16}
                          fontSize={12.5}
                          fontWeight={700}
                          textAnchor={chip.anchor}
                          className="st-name"
                        >
                          {step.label}
                        </text>
                        <text
                          x={chip.x}
                          y={chip.y + 31}
                          fontSize={9.1}
                          textAnchor={chip.anchor}
                          opacity={0.66}
                        >
                          {step.players.slice(0, 3).join(" · ")}
                        </text>
                      </g>
                    );
                  })
                )}

                <text x={36} y={748} fontSize={8.8} opacity={0.5}>
                  只读物流：不写酶学参数 / 反应式 / ΔG
                </text>
                <text x={W - 28} y={748} fontSize={8.8} textAnchor="end" opacity={0.5}>
                  SF-18 · 2D ONLY · 颗粒组成见下方账本
                </text>
              </svg>
            </div>
          </div>

          <div className="lp-ledger" data-particle-ledger="1">
            <div className="fn-head">
              <span className="t">{data.compositionLedger.title} · PARTICLE COMPOSITION LEDGER</span>
              <span className="view">定性 · 不写精确百分比</span>
            </div>
            <table className="organs lp-ledger-table">
              <thead>
                <tr>
                  {data.compositionLedger.columns.map((c) => (
                    <th key={c}>{c}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.compositionLedger.rows.map((row) => (
                  <tr key={row.id} data-particle-row={row.id}>
                    <td className="num" style={{ fontWeight: 700 }}>{row.name}</td>
                    <td className="num">{row.apolipoprotein}</td>
                    <td className="num">{row.tg}</td>
                    <td className="num">{row.cholesterol}</td>
                    <td className="num">{row.phospholipid}</td>
                    <td className="num">{row.protein}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="lp-footnote-note">{data.compositionLedger.basis}</div>
          </div>

          <div className="footnote">
            <div className="fn-head">
              <span className="t">空间读法 · SPATIAL NOTE</span>
            </div>
            <p style={{ fontSize: 12, lineHeight: 1.9, margin: "0 0 18px" }}>{skel.spatialNote}</p>

            <div className="fn-head">
              <span className="t">
                表 1 · 物流清单（共 {stepCount} 段 · 0 条反应式 · 颗粒不是单一分子）
              </span>
              <span className="view">点击行 = 右侧详情</span>
            </div>
            <table className="organs" data-logistics-table="1">
              <thead>
                <tr>
                  <th style={{ width: 58 }}>段</th>
                  <th style={{ width: 138 }}>器官</th>
                  <th style={{ width: 170 }}>物流步骤</th>
                  <th style={{ width: 210 }}>颗粒与蛋白</th>
                  <th style={{ width: 190 }}>物流方向</th>
                  <th>说明</th>
                </tr>
              </thead>
              <tbody>
                {data.steps.map((s, i) => (
                  <tr
                    key={s.id}
                    data-logistics-row={s.id}
                    style={{ cursor: "pointer" }}
                    onClick={() => selectStep(s.id === selectedId ? null : s.id)}
                  >
                    <td className="num">{String(i + 1).padStart(2, "0")}</td>
                    <td>{ORGAN.get(s.organId)?.name ?? s.organId}</td>
                    <td>{s.label}</td>
                    <td>{s.players.join(" · ")}</td>
                    <td>{s.flow}</td>
                    <td>{s.note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="lp-footnote-note" data-lipoprotein-no-equation="1">
              本图不写反应式、酶学参数或 ΔG；所有步骤都是自包含物流段，不走既有通路的 enzyme-ref。
              需要反应细节时，只通过 lp-4 → ch-13、lp-5 → fao-act 两个接口去原图。
            </div>

            <div className="fn-head" style={{ marginTop: 22 }}>
              <span className="t">表 2 · 接口（只登记两端都真实存在的步骤）</span>
            </div>
            <table className="organs" data-interface-table="1">
              <thead>
                <tr>
                  <th style={{ width: 150 }}>接口步骤</th>
                  <th style={{ width: 150 }}>名称</th>
                  <th>说明</th>
                </tr>
              </thead>
              <tbody>
                {data.interfaces.map((it) => (
                  <tr key={it.stepId} data-interface-row={it.stepId}>
                    <td className="num">
                      <Link className="lp-inline-link" to={INTERFACE_HREF[it.stepId] ?? "#"}>
                        {it.stepId}
                      </Link>
                    </td>
                    <td>{it.label}</td>
                    <td>{it.note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <aside>
          <div className="panel-block">
            <div className="pb-title">
              <span>详情栏</span>
              <span className="en">DETAIL · 点击图上任一物流步骤</span>
            </div>
            {selected ? (
              <div className="d-body" data-lipoprotein-detail={selected.id}>
                <div className="d-step">
                  <span className="no serif num">{selected.id.replace("lp-", "")}</span>
                  {selected.label}
                  <span className="d-tag">{KIND[selected.kind].zh}</span>
                </div>
                <div className="d-enzyme">
                  {selectedOrgan?.name ?? selected.organId}
                  <span className="d-iso"> — {selectedOrgan?.role ?? ""}</span>
                </div>
                <div className="d-cof">
                  <b>颗粒与蛋白</b>　{selected.players.join(" · ")}
                </div>
                <div className="d-cof">
                  <b>物流方向</b>　{selected.flow}
                </div>
                <div className="d-sig">{selected.note}</div>
                <div className="d-sig" style={{ opacity: 0.75 }}>{selected.detail}</div>
                <Link
                  className="frames-entry"
                  data-testid="lipoprotein-structure-entry"
                  to={`/structures/lipoprotein?step=${selected.id}`}
                >
                  看这一步的结构对照 →
                </Link>
                <div className="d-none" data-lipoprotein-detail-note="1">
                  详情只描述颗粒搬运与表面变化；本步没有 reaction / enzyme / EC / ΔG 字段。
                </div>
              </div>
            ) : (
              <div className="d-body">
                <div className="d-placeholder">
                  点击图上任一 chip 或颗粒节点，这里显示<b>谁把什么颗粒从哪搬到哪</b>、颗粒表面发生了什么。
                  本图不是反应链，不给底物 / 产物反应式。
                </div>
                <div className="lp-three-mis" data-logistics-reading="1">
                  <div>
                    <span className="lbl">① 器官错位</span>
                    同一个颗粒会在两个器官之间换手：CM 在小肠组装、在血浆被 LPL 改小、在肝被摄取；图上分开画，避免读成一步反应。
                  </div>
                  <div>
                    <span className="lbl">② 颗粒错位</span>
                    LDL 不是“胆固醇分子”，HDL 也不是“一种酶”；它们是带载脂蛋白的颗粒，组成账本只做定性比较。
                  </div>
                  <div>
                    <span className="lbl">③ 途径错位</span>
                    外源（CM）与内源（VLDL → IDL → LDL）在肝汇合；逆向转运（HDL / CETP）把胆固醇送回肝，不是把 HDL 整个吞进去。
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="panel-block">
            <div className="pb-title">
              <span>接口</span>
              <span className="en">INTERFACES · {data.interfaces.length} 条</span>
            </div>
            {data.interfaces.map((it) => (
              <div key={it.stepId} className="lp-interface-card" data-lipoprotein-interface={it.stepId}>
                <div className="lp-interface-title">
                  {it.label}
                  <span className="num">{it.stepId}</span>
                </div>
                <Link className="lp-inline-link" to={INTERFACE_HREF[it.stepId] ?? "#"}>
                  跳到原图查看 {it.stepId} →
                </Link>
                <p>{it.note}</p>
              </div>
            ))}
          </div>

          <div className="panel-block">
            <div className="pb-title">
              <span>颗粒清单</span>
              <span className="en">PARTICLES · {particleCount}</span>
            </div>
            {data.particles.map((p) => (
              <div key={p.id} className="lp-particle-card" data-particle-id={p.id}>
                <div className="lp-particle-name">
                  {p.name}
                  <span className="num">{p.abbr}</span>
                </div>
                <p>{p.note}</p>
              </div>
            ))}
          </div>

          <div className="panel-block">
            <div className="pb-title">
              <span>3D 口径</span>
              <span className="en">3D · NOT BUILT</span>
            </div>
            <div className="d-none" data-3d-placeholder="1" style={{ borderTop: "none" }}>
              {data.threeD.note}
            </div>
          </div>
        </aside>
      </div>

      <PathwayRailFoot current="lipoprotein" />
      <div className="poster-foot">
        <span>
          教材依据：{data.textbook}。全图 {stepCount} 段物流、{organCount} 个器官、{particleCount} 种颗粒；
          不写反应式、酶学参数或 ΔG。<br />
        </span>
        <span>
          接口只有 {data.interfaces.map((i) => i.stepId).join(" / ")} 两处，均指向站内真实存在的步骤；
          LPL / LCAT / LDLR 等没有对应的既有步骤 id，本图不为它们伪造接口。<br />
        </span>
        <span>
          3D：{data.threeD.status} —— 脂蛋白是颗粒，不是单一分子；不登记 PDB，不新建分子结构资产。
        </span>
      </div>
    </div>
  );
}
