// 糖原代谢挂图页（PLATE 10 / 12）。
// 体例与 FAO / 尿素循环挂图一致：纸白底、1px 直角图框、24px 内边距、无圆角/投影/渐变。
// 两条臂：分解在上、合成在下；肝臂与肌臂分开成带，不把两个器官压成一条线。
import { useMemo, useRef, useState, type MouseEvent } from "react";
import { Link, useSearchParams } from "react-router-dom";
import PathwaySwitcher from "../components/PathwaySwitcher";
import { PathwayRailFoot } from "../components/PathwayRail";
import PlateInteraction from "../components/PlateInteraction";
import ReadingGuide from "../components/ReadingGuide";
import glycogenData from "../data/glycogen/glycogen.json";
import glycogenSkeleton from "../data/glycogen/skeleton.json";
import type {
  GlycogenData,
  GlycogenSkeleton,
  GlycogenStep,
} from "../data/glycogen/types";

const DATA = glycogenData as unknown as GlycogenData;
const SKELETON = glycogenSkeleton as unknown as GlycogenSkeleton;

const CANVAS = SKELETON.canvas;

/** 节点 → 主步骤：一个实体可能有多个节点，点击任意节点都应落到一个确定步骤 */
const NODE_TO_STEP: Record<string, string> = {
  "glycogen-bd": "gly-1",
  "g1p-bd": "gly-3",
  g6p: "gly-3",
  "limit-dextrin": "gly-2",
  "free-glc": "gly-2",
  "g1p-syn": "gly-6",
  "udp-glc": "gly-7",
  "glycogen-syn": "gly-8",
  phospho: "gly-1",
  debranch: "gly-2",
  "pgm-bd": "gly-3",
  "pgm-syn": "gly-6",
  ugp2: "gly-7",
  gys: "gly-8",
  gbe1: "gly-9",
  g6pc1: "gly-4",
  "glucose-liver": "gly-4",
  blood: "gly-4",
  pgi: "gly-5",
  f6p: "gly-5",
  "glycolysis-proj": "gly-5",
  insulin: "gly-8",
  pp1: "gly-1",
  glucagon: "gly-1",
  epinephrine: "gly-1",
  camp: "gly-1",
  pka: "gly-1",
  phk: "gly-1",
  amp: "gly-1",
  atp: "gly-1",
};

// 步骤标签（data-step-block）已经占用某条链接标注的坐标时，不再重复画该链接文字，
// 否则两层文字会压在同一基线上（layout-audit 的 significant overlap）。
const STEP_LABEL_LINK_IDS = new Set(
  DATA.steps
    .map((step) =>
      step.id === "gly-9"
        ? "l-gly-9-pool"
        : SKELETON.links.find((l) => l.stepId === step.id && l.label)?.id,
    )
    .filter((id): id is string => Boolean(id)),
);

const PATHWAY_ARG: Record<string, string> = {
  glycolysis: "/pathway/glycolysis",
  gluconeogenesis: "/pathway/gluconeogenesis",
  tca: "/pathway/tca",
  ppp: "/pathway/ppp",
  glycogen: "/pathway/glycogen",
};

function stepHref(pathwayId: string, stepId: string) {
  const base = PATHWAY_ARG[pathwayId] ?? `/pathway/${pathwayId}`;
  return `${base}?step=${encodeURIComponent(stepId)}`;
}

function entityName(id: string) {
  return DATA.entities.find((e) => e.id === id)?.name ?? id;
}

function StepDetail({ step }: { step: GlycogenStep }) {
  const candidates = step.pdbCandidates ?? [];

  return (
    <div className="detail" data-detail-step={step.id}>
      <div className="d-kicker">
        {step.stageLabel ?? `第 ${step.index} 步 / ${DATA.steps.length}`}
        <span className="d-kicker-sep">·</span>
        {step.phase === "breakdown" ? "分解" : "合成"}
        <span className="d-kicker-sep">·</span>
        {step.organ === "liver" ? "肝" : step.organ === "muscle" ? "肌" : "共用"}
      </div>
      <h2 className="d-title">{step.name}</h2>
      <p className="d-enzyme">
        {step.enzyme.name}（{step.enzyme.abbr}）· EC {step.enzyme.ec}
        {step.enzyme.isozyme ? ` · ${step.enzyme.isozyme}` : ""}
      </p>
      {step.enzyme.organNote ? <p className="d-note">{step.enzyme.organNote}</p> : null}

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
        <dd>
          {step.direction === "forward"
            ? "体内单向"
            : step.direction === "reversible"
              ? "可逆 / 近平衡"
              : "转移或分支"}
        </dd>
      </dl>

      <p className="d-sig">{step.physiology}</p>
      {step.organDifference ? (
        <p className="d-organ">
          <span className="d-organ-tag">肝 / 肌</span>
          {step.organDifference}
        </p>
      ) : null}

      <div className="d-dg">
        <span className="d-dg-tag">ΔG</span>
        <span className="d-dg-q">{step.deltaG.qualitative}</span>
        <span className="d-dg-src">{step.deltaG.source}</span>
      </div>

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
              <div className="d-pdb-lig">
                配体：{c.ligands.length ? c.ligands.join("；") : "无"}
              </div>
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

export default function GlycogenOverviewPage() {
  const plateSvgRef = useRef<SVGSVGElement>(null);
  const [params, setParams] = useSearchParams();
  const organ = params.get("organ") === "muscle" ? "muscle" : "liver";
  const stepParam = params.get("step");
  const selected = useMemo<GlycogenStep>(() => {
    return DATA.steps.find((s) => s.id === stepParam) ?? DATA.steps[0];
  }, [stepParam]);

  const [hover, setHover] = useState<string | null>(null);

  function selectStep(stepId: string, nextOrgan = organ) {
    const next = new URLSearchParams(params);
    next.set("step", stepId);
    next.set("organ", nextOrgan);
    setParams(next, { replace: true });
  }

  function handleSvgClick(event: MouseEvent<SVGSVGElement>) {
    const target = event.target as Element;
    // 步骤标签（圆角矩形 + 短名）是独立的一层，必须单独判，否则点标签没反应。
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

  const organData = DATA.organs.find((o) => o.id === organ) ?? DATA.organs[0];

  return (
    <div className="poster poster-glycogen" data-page="glycogen">
      <PathwaySwitcher current="glycogen" variant="poster" />

      <header className="masthead">
        <div className="mast-top">
          <span className="kicker">STRUCTURE ATLAS · CARBOHYDRATE STORAGE</span>
          <span className="plate-no num">{DATA.plateNo}</span>
        </div>
        <div className="mast-main">
          <h1>
            {DATA.name}
            <small>{DATA.en} — 分解 / 合成双臂 · 肝与肌功能相反 · 同一颗粒池</small>
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
            <line x1="0" y1="5" x2="30" y2="5" stroke="#2E6E6B" strokeWidth="1.1" strokeDasharray="5 3" />
          </svg>
          器官臂 / 调控
        </span>
        <span className="lg">
          <svg width="18" height="10" aria-hidden>
            <line x1="0" y1="2" x2="18" y2="2" stroke="#22282A" strokeWidth="1.4" />
            <line x1="0" y1="7" x2="18" y2="7" stroke="#22282A" strokeWidth="0.8" />
          </svg>
          器官差异注记
        </span>
      </div>

      <div className="plp-strip" data-plp-source="1" aria-label="糖原磷酸化酶 PLP 结构口径">
        <span className="plp-strip-title">PLP 结构口径 · 三份均为人源（Homo sapiens）、无工程点突变</span>
        <span className="plp-item" data-plp-entry="1EM6">
          <b>1EM6</b> 肝 PYGL a · X-ray 2.2 Å · S. frugiperda 昆虫细胞表达 · PLP + NBG + CP4
        </span>
        <span className="plp-item" data-plp-entry="1FA9">
          <b>1FA9</b> 肝 PYGL a · X-ray 2.4 Å · E. coli 表达 · PLP + GLC + AMP
        </span>
        <span className="plp-item" data-plp-entry="1Z8D">
          <b>1Z8D</b> 肌 PYGM a · X-ray 2.3 Å · S. frugiperda 表达 · PLP(K680 LLP) + GLC + AMP + ADE
        </span>
        <span className="plp-strip-note">
          PLP 是共价辅因子，不是游离底物；1Z8D 的 S14(SEP) / K680(LLP) 是磷酸化与 PLP-赖氨酸修饰残基，不是致病点突变。
        </span>
      </div>

      <div className="body-grid">
        <section className="plate-wrap" aria-labelledby="plate-title">
          <div className="plate-head">
            <h2 id="plate-title">糖原颗粒 · 分解 / 合成双臂</h2>
            <div className="plate-tools">
              <PlateInteraction svgRef={plateSvgRef} pathwayId="glycogen" />
              <div className="organ-tabs" role="group" aria-label="器官视图">
                {DATA.organs.map((o) => (
                  <button
                    type="button"
                    key={o.id}
                    className={organ === o.id ? "organ-tab active" : "organ-tab"}
                    aria-pressed={organ === o.id}
                    data-organ-tab={o.id}
                    onClick={() => selectStep(organ === o.id ? selected.id : o.id === "liver" ? "gly-4" : "gly-5", o.id)}
                  >
                    {o.name}
                  </button>
                ))}
              </div>
              <Link className="plate-3d-link" to="/structures/glycogen" data-3d-link="glycogen">
                结构对照 SF-10
              </Link>
            </div>
          </div>

          <ReadingGuide
            label="糖原代谢导读"
            summary="肝/肌双器官：肝有 G6PC1 可补血糖，肌无 G6PC1 只能自用"
            paragraphs={[
              "糖原代谢是颗粒池上的分解与合成两臂：分解用磷酸解把残基切成 G1P，合成用 UDP-葡萄糖接回链上；两臂都经 G6P 池与糖酵解相接。肝糖原供全身、作血糖缓冲；肌糖原只供自身收缩。",
              "分解：糖原磷酸化酶以 PLP 为辅因子，用 Pi 裂解 α-1,4 键生成 G1P；脱支酶转移 3 个残基、水解 α-1,6 键，每分支释放 1 个游离葡萄糖，肌内再磷酸化需 1 ATP。肝表达 G6PC1，把 G6P 水解成葡萄糖经 GLUT2 入血；肌不表达 G6PC1，G6P 只经 PGI 进糖酵解自用。合成：G6P ⇌ G1P，UGP2 用 UTP 生成 UDP-葡萄糖并释出 PPi，合酶与分支酶延长并造分支。",
              "主开关是共价修饰：磷酸化酶激酶使磷酸化酶 b→a（开）、合酶 a→b（关）。胰岛素激活 PP1 促合成；胰高血糖素与肾上腺素经 cAMP–PKA 促分解；AMP 只激活肌磷酸化酶 b，ATP/G6P 抑制。糖原磷酸解每残基省 1 ATP；合成每残基耗 2 个酐键，不能相抵成净赚 1。交接：G6P 经 gk-2 进糖酵解，肝 G6PC1 与糖异生 gn-11 同酶。",
            ]}
          />

          <div className="plate-scroll">
            <svg
              ref={plateSvgRef}
              className="plate-canvas"
              width={CANVAS.width}
              height={CANVAS.height}
              viewBox={`0 0 ${CANVAS.width} ${CANVAS.height}`}
              role="img"
              aria-label="糖原分解与合成双臂挂图"
              onClick={handleSvgClick}
              data-plate="glycogen"
            >
              <defs>
                <marker id="gk-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto">
                  <path d="M 0 0 L 10 5 L 0 10 z" fill="#22282A" />
                </marker>
                <marker id="gk-arrow-open" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto">
                  <path d="M 0 0 L 10 5 L 0 10 z" fill="#F6F3EC" stroke="#22282A" strokeWidth="1" />
                </marker>
                <marker id="gk-arrow-teal" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto">
                  <path d="M 0 0 L 10 5 L 0 10 z" fill="#2E6E6B" />
                </marker>
              </defs>

              <rect x="0" y="0" width={CANVAS.width} height={CANVAS.height} fill="#F6F3EC" />

              {SKELETON.compartments.map((zone) => {
                const isLiver = zone.id === "liver-arm";
                const isMuscle = zone.id === "muscle-arm";
                return (
                  <g key={zone.id} data-zone={zone.id}>
                    <rect
                      x={zone.x0}
                      y={zone.y0}
                      width={zone.x1 - zone.x0}
                      height={zone.y1 - zone.y0}
                      fill={isLiver ? "#F4EFE3" : isMuscle ? "#F1F2EC" : "#F2EFE7"}
                      stroke="#22282A"
                      strokeWidth="1"
                    />
                    <text x={zone.x0 + 12} y={zone.y0 + 18} fontSize="9.2" fill="#2E6E6B" letterSpacing="0.08em">
                      {zone.en}
                    </text>
                  </g>
                );
              })}

              {SKELETON.links.map((link) => {
                const isControl = link.type === "control";
                const isDash = link.type === "cycle-return" || link.type === "organ" || isControl;
                const stroke = isControl ? "#B4761F" : link.type === "cycle-return" ? "#2E6E6B" : "#22282A";
                const width = link.type === "main" ? 2.2 : link.type === "side" ? 1.2 : 1.3;
                const marker = link.type === "cycle-return" ? "gk-arrow-teal" : isControl ? "gk-arrow-teal" : "gk-arrow";
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
                      fill="#22282A"
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
                  fill={an.organ ? "#22282A" : "#4A5153"}
                  data-annotation={an.id}
                >
                  {an.text}
                </text>
              ))}

              {DATA.steps.map((step) => {
                const poolLink = SKELETON.links.find((l) => l.id === "l-gly-9-pool");
                const link =
                  step.id === "gly-9"
                    ? poolLink
                    : SKELETON.links.find((l) => l.stepId === step.id && l.label);
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
                      x={typeof link.labelAnchor === "string" && link.labelAnchor === "start" ? lx - 2 : lx - Math.max(24, (link.label?.length ?? 4) * 4.6)}
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
            <span>细 / 虚线：支路、器官臂、调控与颗粒池闭合</span>
            <span>ΔG 数值不作页面展示，只保留定性判断</span>
            <span>器官差异只由是否表达 G6PC1 决定</span>
          </div>
        </section>

        <aside className="aside" aria-label="步骤详情与能量账">
          <div className="panel-block" data-organ-summary={organ}>
            <div className="pb-title">器官 · {organData.name}</div>
            <p className="d-sig">{organData.structural}</p>
            <p className="d-note">{organData.fate}</p>
          </div>

          <StepDetail step={selected} />

          <div className="panel-block" data-energy-ledger="1">
            <div className="pb-title">能量账 · 每个残基</div>
            <div className="settle">
              <div className="settle-main">
                <span className="settle-num">2</span>
                <span className="settle-unit">酐键 / 残基</span>
              </div>
              <div className="settle-sub">合成端消耗；分解端磷酸解省 1 ATP / 残基</div>
            </div>
            {DATA.energyLedger.entries.map((e) => (
              <div className="ledger-row" key={e.id}>
                <span className="ledger-label">{e.label}</span>
                <span className="ledger-num num">{e.perResidue > 0 ? `+${e.perResidue}` : e.perResidue}</span>
              </div>
            ))}
            <p className="d-note">{DATA.energyLedger.referenceRun.note}</p>
            <p className="d-note">{DATA.energyLedger.basis}</p>
          </div>

          <div className="panel-block" data-conservation="1">
            <div className="pb-title">守恒 · 碳与磷酸</div>
            <p className="d-sig">每个残基 6 C，两条臂都不丢失。</p>
            <p className="d-note">
              磷酸（分解）：{DATA.conservation.phosphate.breakdown.input} → {DATA.conservation.phosphate.breakdown.output}；
              {DATA.conservation.phosphate.breakdown.note}
            </p>
            <p className="d-note">
              磷酸（合成）：{DATA.conservation.phosphate.synthesis.input} → {DATA.conservation.phosphate.synthesis.output}；
              {DATA.conservation.phosphate.synthesis.note}
            </p>
            <p className="d-note">{DATA.conservation.highEnergy.note}</p>
          </div>

          <div className="panel-block" data-regulation="1">
            <div className="pb-title">调控 · 外围三条线</div>
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
              已核验 {DATA.threeD.candidates.length} 个 PDB 条目；结构对照页 3D 资产只含
              {DATA.threeD.assets.moleculeAssets.join("、")}，缺失：
              {DATA.threeD.assets.missingAssets.join("、")}。
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

      <PathwayRailFoot current="glycogen" />
      <div className="poster-foot">
        <span>
          待确认：ΔG 数值不作页面展示，仅保留 Lehninger 8e Ch.19 定性结论；能量账见右侧 ATP/UTP 化学计量。<br />
        </span>
        <span>
          已核验：结构对照 SF-10 /structures/glycogen 的 3D 只使用人源实验坐标中的 G6P（6UIQ）与葡萄糖（1CZA），
          其余分子只做 2D；借用来源在首屏明写“非本酶 / 非同一步骤”。<br />
        </span>
        <span>
          口径：糖原按葡萄糖残基计；磷酸单酯在 pH 7.4 取 −2；UDP-葡萄糖的焦磷酸净电荷 −2；合成 2 个酐键 =
          UTP→PPi 1 + PPi 水解 1。
        </span>
      </div>
    </div>
  );
}
