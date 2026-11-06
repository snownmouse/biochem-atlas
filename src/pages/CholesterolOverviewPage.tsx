// 胆固醇合成 / 甲羟戊酸通路挂图页（PLATE 12 / 12）。
// 体例与前十一张一致：纸白底、1px 直角图框、24px 内边距、无圆角/投影/渐变/emoji。
// 分区带：胞质（甲羟戊酸上游）与内质网（甾醇环化 / 去甲基化修饰）分开表达。
// 下游 9 个酶的修饰链压缩成一个“簇”，但每个酶的 EC 都在详情栏写清。
import { useMemo, useRef, useState, type MouseEvent } from "react";
import { Link, useSearchParams } from "react-router-dom";
import PathwaySwitcher from "../components/PathwaySwitcher";
import { PathwayRailFoot } from "../components/PathwayRail";
import PlateInteraction from "../components/PlateInteraction";
import cholesterolData from "../data/cholesterol/cholesterol.json";
import cholesterolSkeleton from "../data/cholesterol/skeleton.json";
import type {
  CholesterolData,
  CholesterolSkeleton,
  CholesterolStep,
} from "../data/cholesterol/types";

const DATA = cholesterolData as unknown as CholesterolData;
const SKELETON = cholesterolSkeleton as unknown as CholesterolSkeleton;

const CANVAS = SKELETON.canvas;

const PHASE_LABEL: Record<string, string> = {
  upstream: "上游 · 甲羟戊酸",
  midstream: "中游 · 甾醇环化",
  downstream: "下游 · 去甲基化 / 还原修饰",
};

const MOLECULES = DATA.entities.filter((e) => e.kind === "metabolite");

/** 电荷上标：-1 → ⁻，-2 → ²⁻，-3 → ³⁻，-4 → ⁴⁻；0 不写上标。 */
function chargeSup(charge: number): string {
  if (!charge) return "";
  const magnitude = Math.abs(charge);
  const prefix = magnitude === 1 ? "" : magnitude === 2 ? "²" : magnitude === 3 ? "³" : magnitude === 4 ? "⁴" : String(magnitude);
  return `${prefix}${charge > 0 ? "⁺" : "⁻"}`;
}

const COMPARTMENT_LABEL: Record<string, string> = {
  cytosol: "胞质",
  er: "内质网",
};

/** 节点 → 主步骤：同一实体可能有多个节点（如 IPP / DMAPP），点击任意节点都落到确定步骤 */
const NODE_TO_STEP: Record<string, string> = {
  accoa: "ch-1",
  acat2: "ch-1",
  acacoa: "ch-1",
  hmgcs1: "ch-2",
  hmgcoa: "ch-2",
  hmgcr: "ch-3",
  statin: "ch-3",
  mevalonate: "ch-3",
  mvk: "ch-4",
  mev5p: "ch-4",
  pmvk: "ch-5",
  mev5pp: "ch-5",
  mvd: "ch-6",
  ipp: "ch-7",
  "ipp-2": "ch-8",
  idi1: "ch-7",
  dmapp: "ch-7",
  "dmapp-2": "ch-8",
  fdps: "ch-9",
  gpp: "ch-9",
  fpp: "ch-10",
  ggpp: "ch-10",
  fdft1: "ch-10",
  squalene: "ch-10",
  sqle: "ch-11",
  oxy: "ch-11",
  lss: "ch-12",
  lanosterol: "ch-12",
  "mod-cluster": "ch-13",
  "7dhc": "ch-13",
  cholesterol: "ch-13",
};

// 步骤短名标签已经占用某条链接标注坐标时，不再重复画链接文字，避免两层文字压同一基线。
const STEP_LABEL_LINK_IDS = new Set(
  DATA.steps
    .map((step) => SKELETON.links.find((l) => l.stepId === step.id && l.label)?.id)
    .filter((id): id is string => Boolean(id)),
);

const PATHWAY_ARG: Record<string, string> = {
  glycolysis: "/pathway/glycolysis",
  gluconeogenesis: "/pathway/gluconeogenesis",
  tca: "/pathway/tca",
  ppp: "/pathway/ppp",
  glycogen: "/pathway/glycogen",
  fao: "/pathway/fao",
  urea: "/pathway/urea",
  "amino-acids": "/pathway/amino-acids",
};

function stepHref(pathwayId: string, stepId: string) {
  const base = PATHWAY_ARG[pathwayId] ?? `/pathway/${pathwayId}`;
  return `${base}?step=${encodeURIComponent(stepId)}`;
}

function entityName(id: string) {
  return DATA.entities.find((e) => e.id === id)?.name ?? id;
}

function StepDetail({ step }: { step: CholesterolStep }) {
  const candidates = step.pdbCandidates ?? [];

  return (
    <div className="detail" data-detail-step={step.id}>
      <div className="d-kicker">
        第 {step.index} 步 / {DATA.steps.length}
        <span className="d-kicker-sep">·</span>
        {PHASE_LABEL[step.phase]}
        <span className="d-kicker-sep">·</span>
        {COMPARTMENT_LABEL[step.compartment]}
      </div>
      <h2 className="d-title">{step.name}</h2>
      <p className="d-enzyme">
        {step.enzyme.name}（{step.enzyme.abbr}）· EC {step.enzyme.ec}
      </p>
      {step.enzyme.note ? <p className="d-note">{step.enzyme.note}</p> : null}

      <div className="d-eq" aria-label="反应式">
        {step.reaction.equation}
      </div>

      <dl className="d-kv">
        <dt>底物</dt>
        <dd>{step.reaction.substrates.map(entityName).join(" + ")}</dd>
        <dt>产物</dt>
        <dd>{step.reaction.products.map(entityName).join(" + ")}</dd>
        <dt>辅因子</dt>
        <dd>{step.reaction.cofactors.length ? step.reaction.cofactors.join("；") : "无"}</dd>
        <dt>方向</dt>
        <dd>{step.direction === "forward" ? "体内单向" : "可逆 / 近平衡"}</dd>
      </dl>

      <p className="d-sig">{step.physiology}</p>

      {step.clinical ? (
        <p className="d-organ">
          <span className="d-organ-tag">药物 / 临床</span>
          {step.clinical}
        </p>
      ) : null}

      <div className="d-dg">
        <span className="d-dg-tag">ΔG</span>
        <span className="d-dg-q">{step.deltaG.qualitative}</span>
        <span className="d-dg-src">{step.deltaG.source}</span>
      </div>

      {step.cluster ? (
        <div data-cluster="1">
          <div className="d-links-title">下游修饰簇 · 逐酶与 EC</div>
          {step.cluster.enzymes.map((ce, i) => (
            <p className="d-note" key={ce.abbr} data-cluster-enzyme={ce.abbr}>
              {String(i + 1).padStart(2, "0")} · <b>{ce.abbr}</b> · EC {ce.ec} — {ce.action}
            </p>
          ))}
          <p className="d-note">{step.cluster.note}</p>
        </div>
      ) : null}

      {step.sharedWith.length ? (
        <div className="d-links">
          <div className="d-links-title">接口（真实步骤 id）</div>
          {step.sharedWith.map((s) => (
            <Link
              key={`${s.pathwayId}-${s.stepId}-${s.entityId}`}
              className="d-link"
              to={stepHref(s.pathwayId, s.stepId)}
              data-shared-with={`${s.pathwayId}:${s.stepId}:${s.entityId}`}
            >
              {s.pathwayId} · {s.stepId} · {s.entityId}
              {s.note ? ` — ${s.note}` : ""}
            </Link>
          ))}
        </div>
      ) : (
        <p className="d-note">本步没有跨通路接口。</p>
      )}

      <div className="d-pdb">
        <div className="d-links-title">已核验的 PDB 候选（实时向 RCSB 核对）</div>
        {candidates.length ? (
          candidates.map((c) => (
            <div className="d-pdb-row" key={c.pdbId} data-pdb-id={c.pdbId}>
              <div className="d-pdb-head">
                <a
                  className="d-pdb-id"
                  href={`https://www.rcsb.org/structure/${c.pdbId}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  {c.pdbId}
                </a>
                <span>
                  {c.organism} · {c.method} · {c.resolution} Å · 链 {c.chains}
                </span>
              </div>
              <div className="d-pdb-lig">配体：{c.ligands.length ? c.ligands.join("；") : "无"}</div>
              <div className="d-pdb-org">
                表达：{c.expressionSystem ?? "未核验"} · 突变：{c.mutations ?? "未核验"}
              </div>
              <div className="d-pdb-note">{c.note}</div>
            </div>
          ))
        ) : (
          <p className="d-none">本步未登记已核验的 PDB 候选，只做 2D 挂图。</p>
        )}
      </div>
    </div>
  );
}

export default function CholesterolOverviewPage() {
  const plateSvgRef = useRef<SVGSVGElement>(null);
  const [params, setParams] = useSearchParams();
  const stepParam = params.get("step");
  const selected = useMemo<CholesterolStep>(() => {
    return DATA.steps.find((s) => s.id === stepParam) ?? DATA.steps[0];
  }, [stepParam]);

  const [hover, setHover] = useState<string | null>(null);

  function selectStep(stepId: string) {
    const next = new URLSearchParams(params);
    next.set("step", stepId);
    setParams(next, { replace: true });
  }

  function handleSvgClick(event: MouseEvent<SVGSVGElement>) {
    const target = event.target as Element;
    const labelEl = target.closest("[data-step-block]");
    if (labelEl) {
      const stepId = labelEl.getAttribute("data-step-block");
      if (stepId) selectStep(stepId);
      return;
    }
    const stepEl = target.closest("[data-step-id]");
    if (stepEl) {
      const stepId = stepEl.getAttribute("data-step-id");
      if (stepId) selectStep(stepId);
      return;
    }
    const nodeEl = target.closest("[data-node-id]");
    if (nodeEl) {
      const nodeId = nodeEl.getAttribute("data-node-id");
      const stepId = nodeId ? NODE_TO_STEP[nodeId] : undefined;
      if (stepId) selectStep(stepId);
    }
  }

  return (
    <div className="poster poster-cholesterol" data-page="cholesterol">
      <PathwaySwitcher current="cholesterol" variant="poster" />

      <header className="masthead">
        <div className="mast-top">
          <span className="kicker">STRUCTURE ATLAS · STEROL BIOSYNTHESIS</span>
          <span className="plate-no num">{DATA.plateNo}</span>
        </div>
        <div className="mast-main">
          <h1>
            {DATA.name}
            <small>{DATA.en} — 胞质甲羟戊酸上游 · 内质网环化 · 9 酶修饰簇 · 他汀作用节点</small>
          </h1>
          <p className="mast-summary">{DATA.summary}</p>
        </div>
      </header>

      <div className="legend" aria-label="图例">
        <span className="lg">
          <svg width="12" height="12" aria-hidden>
            <circle cx="6" cy="6" r="5" fill="none" stroke="#22282A" strokeWidth="1.2" />
          </svg>
          代谢物
        </span>
        <span className="lg">
          <svg width="22" height="12" aria-hidden>
            <rect x="1" y="1" width="20" height="10" fill="none" stroke="#22282A" strokeWidth="1.1" />
          </svg>
          酶 / 机器
        </span>
        <span className="lg">
          <svg width="30" height="10" aria-hidden>
            <line x1="0" y1="5" x2="22" y2="5" stroke="#22282A" strokeWidth="1.6" />
            <path d="M22,1 L30,5 L22,9 Z" fill="#22282A" />
          </svg>
          不可逆 / 主链
        </span>
        <span className="lg">
          <svg width="30" height="10" aria-hidden>
            <line x1="0" y1="5" x2="22" y2="5" stroke="#22282A" strokeWidth="1.1" />
            <path d="M22,1 L30,5 L22,9 Z" fill="#F6F3EC" stroke="#22282A" strokeWidth="1.1" />
          </svg>
          可逆 / 支路
        </span>
        <span className="lg">
          <svg width="30" height="10" aria-hidden>
            <line x1="0" y1="5" x2="30" y2="5" stroke="#B4761F" strokeWidth="1.1" strokeDasharray="5 3" />
          </svg>
          药物 / 抑制
        </span>
        <span className="lg">
          <svg width="18" height="10" aria-hidden>
            <line x1="0" y1="2" x2="18" y2="2" stroke="#22282A" strokeWidth="1.4" />
            <line x1="0" y1="7" x2="18" y2="7" stroke="#22282A" strokeWidth="0.8" />
          </svg>
          区室 / 旁路注记
        </span>
      </div>

      <div className="output-strip" data-compartment-summary="1" aria-label="区室与能量口径">
        <span className="output-strip-title">区室口径 · 胞质 vs 内质网</span>
        <span className="output-item" data-compartment="cytosol">
          <b>胞质</b> ch-1 至 ch-9 · FDPS 两次缩合 · 不消耗内质网腔
        </span>
        <span className="output-item" data-compartment="er">
          <b>内质网</b> ch-10 至 ch-13 · FDFT1 / SQLE / LSS / 9 酶修饰簇
        </span>
        <span className="output-item">
          <b>能量</b> 每分子胆固醇 18 ATP + 14 NADPH（簇前）；簇内还原当量不合并
        </span>
        <span className="output-item" data-pdb-source="1">
          <b>PDB 口径</b> 18 条均为人源、X 射线；1HWK / 1HW9 / 1DQA 为 M485I 构建体，6UEZ 为 D231A / H314A；
          只用于酶身份核验，不作配体坐标资产
        </span>
      </div>

      <div className="body-grid">
        <section className="plate-wrap" aria-labelledby="plate-title">
          <div className="plate-head">
            <h2 id="plate-title">胆固醇合成 · 三段分区带</h2>
            <div className="plate-tools">
              <Link className="plate-3d-link" to="/structures/cholesterol" data-3d-link="cholesterol">
                结构对照 SF-12
              </Link>
              <PlateInteraction svgRef={plateSvgRef} pathwayId="cholesterol" />
            </div>
          </div>

          <div className="plate-scroll">
            <svg
              ref={plateSvgRef}
              className="plate-canvas"
              width={CANVAS.width}
              height={CANVAS.height}
              viewBox={`0 0 ${CANVAS.width} ${CANVAS.height}`}
              role="img"
              aria-label="胆固醇合成 / 甲羟戊酸通路挂图"
              onClick={handleSvgClick}
              data-plate="cholesterol"
              data-frame="cholesterol"
              data-step-count={DATA.steps.length}
              data-compartment-count={SKELETON.compartments.length}
              data-cluster-count={DATA.steps.find((s) => s.cluster)?.cluster?.enzymes.length ?? 0}
              data-pdb-count={DATA.threeD.candidates.length}
              data-no-zoom="1"
            >
              <defs>
                <marker id="gk-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto">
                  <path d="M 0 0 L 10 5 L 0 10 z" fill="#22282A" />
                </marker>
                <marker id="gk-arrow-open" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto">
                  <path d="M 0 0 L 10 5 L 0 10 z" fill="#F6F3EC" stroke="#22282A" strokeWidth="1" />
                </marker>
                <marker id="gk-arrow-amber" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto">
                  <path d="M 0 0 L 10 5 L 0 10 z" fill="#B4761F" />
                </marker>
                <marker id="gk-arrow-brick" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto">
                  <path d="M 0 0 L 10 5 L 0 10 z" fill="#9C4A3C" />
                </marker>
              </defs>

              <rect x="0" y="0" width={CANVAS.width} height={CANVAS.height} fill="#F6F3EC" />

              {SKELETON.compartments.map((zone) => (
                <g key={zone.id} data-zone={zone.id}>
                  <rect
                    x={zone.x0}
                    y={zone.y0}
                    width={zone.x1 - zone.x0}
                    height={zone.y1 - zone.y0}
                    fill={zone.id === "er" ? "#EFF1E9" : "#F2EFE7"}
                    stroke="#22282A"
                    strokeWidth="1"
                  />
                  <text x={zone.x0 + 12} y={zone.y0 + 18} fontSize="9.2" fill="#2E6E6B" letterSpacing="0.08em">
                    {zone.en}
                  </text>
                </g>
              ))}

              {SKELETON.links.map((link) => {
                const isControl = link.type === "control";
                const isSide = link.type === "side";
                const isDash = isControl || isSide;
                const stroke = isControl ? "#B4761F" : "#22282A";
                const width = link.type === "main" ? 2.2 : 1.2;
                const marker = isControl ? "gk-arrow-amber" : "gk-arrow";
                return (
                  <g
                    key={link.id}
                    data-link-id={link.id}
                    data-step-id={link.stepId}
                    className={hover === link.id ? "is-hover" : undefined}
                    onMouseEnter={isControl ? () => setHover(link.id) : undefined}
                    onMouseLeave={isControl ? () => setHover(null) : undefined}
                  >
                    <path
                      d={link.path}
                      fill="none"
                      stroke={stroke}
                      strokeWidth={width}
                      strokeDasharray={isDash ? "6 4" : undefined}
                      markerEnd={marker}
                    />
                    {link.label && !STEP_LABEL_LINK_IDS.has(link.id) ? (
                      <text
                        x={link.labelX}
                        y={link.labelY}
                        fontSize="9.2"
                        fill={isControl ? "#B4761F" : "#4A5153"}
                        textAnchor={link.labelAnchor ?? "middle"}
                      >
                        {link.label}
                      </text>
                    ) : null}
                  </g>
                );
              })}

              {SKELETON.nodes.map((node) => {
                const isMetabolite = node.kind === "metabolite";
                const isProjection = node.kind === "projection";
                const isDrug = node.kind === "drug";
                const isEnzyme = node.kind === "enzyme";
                const isSignal = node.kind === "signal";
                const w = node.w ?? 110;
                const h = node.h ?? 28;
                return (
                  <g
                    key={node.id}
                    data-node-id={node.id}
                    data-node-step={NODE_TO_STEP[node.id]}
                    className="graph-node"
                    tabIndex={0}
                    role="button"
                    aria-label={node.label}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        const stepId = NODE_TO_STEP[node.id];
                        if (stepId) selectStep(stepId);
                      }
                    }}
                  >
                    {isMetabolite ? (
                      <circle cx={node.x} cy={node.y} r={node.r ?? 18} fill="#F6F3EC" stroke="#22282A" strokeWidth="1.2" />
                    ) : isSignal ? (
                      <rect x={node.x - w / 2} y={node.y - h / 2} width={w} height={h} fill="#F6F3EC" stroke="#2E6E6B" strokeWidth="1.2" />
                    ) : isDrug ? (
                      <rect x={node.x - w / 2} y={node.y - h / 2} width={w} height={h} fill="#F6F3EC" stroke="#9C4A3C" strokeWidth="1.3" />
                    ) : (
                      <rect
                        x={node.x - w / 2}
                        y={node.y - h / 2}
                        width={w}
                        height={h}
                        fill={isProjection ? "#EDEEE6" : "#F6F3EC"}
                        stroke={isEnzyme ? "#22282A" : "#2E6E6B"}
                        strokeWidth={isEnzyme ? "1.1" : "0.9"}
                      />
                    )}
                    <text
                      x={node.x}
                      y={node.y - (node.sub ? 2 : -4)}
                      fontSize={isMetabolite ? 11.4 : 10.2}
                      fontWeight={isMetabolite ? 600 : 500}
                      textAnchor="middle"
                      fill={isDrug ? "#9C4A3C" : "#22282A"}
                    >
                      {node.label}
                    </text>
                    {node.sub ? (
                      <text x={node.x} y={node.y + 12} fontSize="8.6" textAnchor="middle" fill="#6A7072">
                        {node.sub}
                      </text>
                    ) : null}
                  </g>
                );
              })}

              {SKELETON.annotations.map((an) => (
                <text
                  key={an.id}
                  x={an.x}
                  y={an.y}
                  fontSize={an.size}
                  fontWeight={an.weight ?? 400}
                  textAnchor={an.anchor}
                  fill="#4A5153"
                  data-annotation={an.id}
                >
                  {an.text}
                </text>
              ))}

              {DATA.steps.map((step) => {
                const link = SKELETON.links.find((l) => l.stepId === step.id && l.label);
                if (!link) return null;
                const lx = link.labelX ?? 0;
                const ly = link.labelY ?? 0;
                return (
                  <g
                    key={`label-${step.id}`}
                    data-step-block={step.id}
                    className={selected.id === step.id ? "step-label is-on" : "step-label"}
                    tabIndex={0}
                    role="button"
                    aria-label={`选中第 ${step.index} 步 ${step.name}`}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        selectStep(step.id);
                      }
                    }}
                  >
                    <rect
                      x={link.labelAnchor === "start" ? lx - 2 : lx - Math.max(24, (link.label?.length ?? 4) * 4.6)}
                      y={ly - 11}
                      width={Math.max(48, (link.label?.length ?? 4) * 9.2)}
                      height={16}
                      fill={selected.id === step.id ? "#22282A" : "transparent"}
                      stroke={selected.id === step.id ? "#22282A" : "none"}
                      strokeWidth="0.8"
                    />
                    <text
                      x={lx + (link.labelAnchor === "start" ? 4 : 0)}
                      y={ly}
                      fontSize="8.6"
                      textAnchor={link.labelAnchor ?? "middle"}
                      fill={selected.id === step.id ? "#F6F3EC" : "#22282A"}
                    >
                      {step.short}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>

          <div className="plate-foot">
            <span>实心粗箭头：生理主方向</span>
            <span>虚线：FPP 旁路、DHCR7 临床支路与药物抑制</span>
            <span>ΔG 数值不作页面展示，只保留定性判断</span>
            <span>他汀为药物节点，不是反应步骤；SREBP-2 只作注记</span>
          </div>
        </section>

        <aside className="aside" aria-label="步骤详情与能量账">
          <div className="panel-block" data-compartment-summary="1">
            <div className="pb-title">区室 · 两条分区带</div>
            <p className="d-sig">{DATA.compartmentsNote}</p>
            <p className="d-note">
              胞质带：ch-1 至 ch-9；内质网带：ch-10 至 ch-13。HMGCR 是内质网膜蛋白，催化域朝胞质，
              因此画在胞质带并注明膜定位。
            </p>
          </div>

          <StepDetail step={selected} />

          <div className="panel-block" data-energy-ledger="1">
            <div className="pb-title">能量账 · 每分子胆固醇（簇前）</div>
            <div className="settle">
              <div className="settle-main">
                <span className="settle-num">18</span>
                <span className="settle-unit">ATP</span>
              </div>
              <div className="settle-sub">
                6 个甲羟戊酸 × 3 ATP（MVK / PMVK / MVD）；另有 14 NADPH（HMGCR 12 + FDFT1 1 + SQLE 1）
              </div>
            </div>
            {DATA.energyLedger.entries.map((e) => (
              <div className="ledger-row" key={e.id} data-ledger-entry={e.id}>
                <span className="ledger-label">{e.label}</span>
                <span className="ledger-num num">
                  {e.value === null ? "—" : e.value}
                  <small> {e.unit}</small>
                </span>
              </div>
            ))}
            <p className="d-note">{DATA.energyLedger.referenceRun.note}</p>
            <p className="d-note">
              ACAT2 / HMGCS1 / IDI1 / FDPS 四步标「无净收支」，不硬凑 ATP / NADPH 数字；簇内 9 酶只写还原当量与 O₂，不合并成单一总数。
            </p>
            <p className="d-note">{DATA.energyLedger.basis}</p>
          </div>

          <div className="panel-block" data-conservation="1">
            <div className="pb-title">守恒 · 碳 / 磷酸 / 异戊二烯单位</div>
            <p className="d-sig">
              18 乙酰-CoA（{DATA.conservation.carbon.acetylCoaCarbons} C）→ 胆固醇 C
              {DATA.conservation.carbon.cholesterolCarbons} + {DATA.conservation.carbon.co2Carbons} CO₂
            </p>
            <p className="d-note">
              磷酸：{DATA.conservation.phosphate.atpInput} ATP → {DATA.conservation.phosphate.adpOutput} ADP +{" "}
              {DATA.conservation.phosphate.piOutput} Pi；{DATA.conservation.phosphate.note}
            </p>
            <p className="d-note">
              异戊二烯：{DATA.conservation.isoprene.ippUnits} IPP（C5）→ 角鲨烯 C
              {DATA.conservation.isoprene.squaleneCarbons}；每分子角鲨烯由
              {DATA.conservation.isoprene.fppUnitsPerSqualene} 个 FPP 缩合。
            </p>
            <p className="d-note">{DATA.conservation.carbon.note}</p>
            <p className="d-note">{DATA.conservation.redox.note}</p>
          </div>

          <div className="panel-block" data-molecule-sheet="1">
            <div className="pb-title">分子式 · 电离态（pH 7.4，净电荷按 chargeBasis 求和）</div>
            {MOLECULES.map((m) => (
              <div key={m.id} data-molecule={m.id}>
                <div className="ledger-row">
                  <span className="ledger-label">{m.name}</span>
                  <span className="ledger-num num">
                    {m.formula ?? ""}
                    {chargeSup(m.charge ?? 0)}
                  </span>
                </div>
                <p className="d-note">
                  {m.chargeBasis}
                  {(m.ionizableGroups ?? []).length ? ` 电离基团：${(m.ionizableGroups ?? []).join("；")}。` : ""}
                </p>
              </div>
            ))}
          </div>

          <div className="panel-block" data-regulation="1">
            <div className="pb-title">调控 · 药物与反馈</div>
            {DATA.regulation.map((r) => (
              <div className="reg-row" key={r.id} data-reg-kind={r.kind}>
                <div className="reg-title">{r.title}</div>
                <p className="d-sig">{r.text}</p>
                <p className="d-note">{r.source}</p>
              </div>
            ))}
          </div>

          <div className="panel-block" data-interfaces="1">
            <div className="pb-title">接口 · 只登记真实 id</div>
            {DATA.interfaces.map((it) => (
              <div className="if-row" key={it.id} data-interface-id={it.id}>
                <div className="if-title">{it.title}</div>
                {it.status === "unbuilt" ? (
                  <div className="if-unbuilt" data-interface-unbuilt={it.id}>
                    未接入 / 数据待建
                  </div>
                ) : null}
                <p className="d-note">{it.note}</p>
                {it.sharedWith.map((s) => (
                  <Link
                    key={`${it.id}-${s.pathwayId}-${s.stepId}-${s.entityId}`}
                    className="d-link"
                    to={stepHref(s.pathwayId, s.stepId)}
                    data-interface-link={`${it.id}:${s.pathwayId}:${s.stepId}`}
                  >
                    {s.pathwayId} · {s.stepId} · {s.entityId}
                  </Link>
                ))}
              </div>
            ))}
          </div>

          <div className="panel-block" data-three-d="1">
            <div className="pb-title">3D 状态 · {DATA.threeD.status}</div>
            <p className="d-sig">{DATA.threeD.note}</p>
            <p className="d-note">
              已核验 {DATA.threeD.candidates.length} 个 PDB 条目；结构对照页的 3D 资产为空，
              缺失：{DATA.threeD.assets.missingAssets.join("、")}。
            </p>
            <p className="d-note">{DATA.threeD.assets.note}</p>
          </div>

          <div className="panel-block" data-notes="1">
            <div className="pb-title">口径与未做项</div>
            {DATA.notes.map((n) => (
              <p className="d-note" key={n}>
                {n}
              </p>
            ))}
          </div>
        </aside>
      </div>

      <PathwayRailFoot current="cholesterol" />
      <div className="poster-foot">
        <span>
          待确认：ΔG 数值不作页面展示，仅保留 Lehninger 8e Ch.21 定性结论；能量账见右侧 ATP/NADPH 化学计量。<br />
        </span>
        <span>
          结构对照 SF-12：7 个块只做小分子 2D；HMGCR / SQLE / DHCR7 / CYP51A1 的 PDB 条目只用于右栏身份核对，
          不冒充配体坐标资产。<br />
        </span>
        <span>
          口径：甲羟戊酸的羧基 −1、单磷酸/二磷酸按 pKa 取 −2 / −3；完整 CoA 只计 3′-磷酸（见 research/ionization-convention.md）；
          他汀与 SREBP-2 只作药物 / 反馈注记。
        </span>
      </div>
    </div>
  );
}
