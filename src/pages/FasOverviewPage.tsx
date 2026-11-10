// PLATE 08 / 12 · 脂肪酸从头合成（FAS）。
// 体例与糖酵解 / TCA / 糖异生 / PPP / β-氧化一致：纸白底、墨/琥珀/青/砖红四色、
// 无圆角卡片与投影。几何读 skeleton.json（1980×880 三泳道），
// 化学与能量数字读 fas.json；页面不计算热力学，不伪造 3D 资产。
import { useCallback, useEffect, useMemo, useRef, useState, type MouseEvent as ReactMouseEvent } from "react";
import { Link, useSearchParams } from "react-router-dom";
import fasJson from "../data/fatty-acid-synthesis/fas.json";
import skeletonJson from "../data/fatty-acid-synthesis/skeleton.json";
import type { FasData, FasSkeleton } from "../data/fatty-acid-synthesis/types";
import { comparisonConfigFor } from "../data/comparisonConfig";
import { GRADE_LABEL, gradesForStep } from "../data/evidenceGrade";
import { loadStepManifest, resolveStepAsset, stepAssets } from "../data/stepAssets";
import EmbeddedStepViewer from "../components/EmbeddedStepViewer";
import PathwaySwitcher from "../components/PathwaySwitcher";
import { PathwayRailFoot } from "../components/PathwayRail";
import PlateInteraction from "../components/PlateInteraction";
import ReadingGuide from "../components/ReadingGuide";
import MoleculeArchiveEntry from "../components/MoleculeArchiveEntry";

const data = fasJson as unknown as FasData;
const skel = skeletonJson as unknown as FasSkeleton;

const W = skel.canvas.width;
const H = skel.canvas.height;

const PAPER = "#F6F3EC";
const INK = "#22282A";
const AMBER = "#B4761F";
const TEAL = "#2E6E6B";

const entityMap = new Map(data.entities.map((e) => [e.id, e]));
const nodeMap = new Map(skel.nodes.map((n) => [n.id, n]));
const px = (id: string) => nodeMap.get(id)?.x ?? 0;
const py = (id: string) => nodeMap.get(id)?.y ?? 0;

const nameOf = (id?: string) => (id ? entityMap.get(id)?.name ?? id : "");
const stepById = (id: string | null) => (id ? data.steps.find((s) => s.id === id) ?? null : null);

const ALL_STEP_IDS = [
  "fas-pdh",
  "fas-shuttle",
  "fas-acc",
  "fas-ks",
  "fas-kr",
  "fas-dh",
  "fas-er",
  "fas-te",
];

/** 节点 → 步骤：机器节点与代谢物节点都可点；同一实体多节点全部支持 */
const NODE_STEP: Record<string, string> = {
  pyr: "fas-pdh",
  pdh: "fas-pdh",
  mpc: "fas-pdh",
  "accoa-mito": "fas-shuttle",
  cit: "fas-shuttle",
  cs: "fas-shuttle",
  cic: "fas-shuttle",
  acl: "fas-shuttle",
  "accoa-cyt": "fas-acc",
  acc: "fas-acc",
  malonylcoa: "fas-acc",
  acylacp: "fas-ks",
  ketoacylacp: "fas-ks",
  hydroxyacylacp: "fas-kr",
  enoylacp: "fas-dh",
  "acylacp-next": "fas-er",
  palmitate: "fas-te",
  te: "fas-te",
};

const nodeAbbr: Record<string, string> = {
  pyr: "Pyr",
  "accoa-mito": "AcCoA",
  "oaa-mito": "OAA",
  cit: "Cit",
  "accoa-cyt": "AcCoA",
  malonylcoa: "Mal-CoA",
  acylacp: "Cₙ-ACP",
  ketoacylacp: "3-Keto",
  hydroxyacylacp: "3-OH",
  enoylacp: "Δ²-Enoyl",
  "acylacp-next": "Cₙ₊₂",
  palmitate: "C16",
};

const nodeLabelPos: Record<string, { dx: number; dy: number; anchor: "start" | "middle" | "end" }> = {
  pyr: { dx: 0, dy: 44, anchor: "middle" },
  "accoa-mito": { dx: 0, dy: -36, anchor: "middle" },
  "oaa-mito": { dx: 0, dy: -34, anchor: "middle" },
  cit: { dx: 0, dy: 44, anchor: "middle" },
  "accoa-cyt": { dx: 0, dy: 44, anchor: "middle" },
  malonylcoa: { dx: 0, dy: 44, anchor: "middle" },
  acylacp: { dx: -34, dy: 4, anchor: "end" },
  ketoacylacp: { dx: 0, dy: -34, anchor: "middle" },
  hydroxyacylacp: { dx: 0, dy: -34, anchor: "middle" },
  enoylacp: { dx: 34, dy: 4, anchor: "start" },
  "acylacp-next": { dx: 0, dy: 42, anchor: "middle" },
  palmitate: { dx: -34, dy: 4, anchor: "end" },
};

const STEP_SHORT: Record<string, string> = {
  "fas-pdh": "丙酮酸 → 乙酰-CoA · PDH",
  "fas-shuttle": "柠檬酸穿梭 · CS / CIC / ACLY",
  "fas-acc": "ACC 羧化 · 限速不可逆",
  "fas-ks": "四步环 Ⅰ · KS 缩合",
  "fas-kr": "四步环 Ⅱ · KR 还原",
  "fas-dh": "四步环 Ⅲ · DH 脱水",
  "fas-er": "四步环 Ⅳ · ER 还原",
  "fas-te": "TE 硫酯酶 · 释放 C16",
};

const STEP_LABEL_POS: Record<string, { x: number; y: number; anchor: "start" | "middle" | "end" }> = {
  "fas-pdh": { x: 205, y: 100, anchor: "middle" },
  "fas-shuttle": { x: 700, y: 268, anchor: "start" },
  "fas-acc": { x: 880, y: 300, anchor: "start" },
  "fas-ks": { x: 1205, y: 420, anchor: "middle" },
  "fas-kr": { x: 1450, y: 468, anchor: "middle" },
  "fas-dh": { x: 1600, y: 620, anchor: "start" },
  "fas-er": { x: 1415, y: 748, anchor: "middle" },
  "fas-te": { x: 1145, y: 758, anchor: "end" },
};

function roman(n: number | null) {
  if (n === null) return "";
  return ["Ⅰ", "Ⅱ", "Ⅲ", "Ⅳ", "Ⅴ", "Ⅵ", "Ⅶ", "Ⅷ", "Ⅸ", "Ⅹ"][n - 1] ?? String(n);
}

export default function FasOverviewPage() {
  const [search, setSearch] = useSearchParams();
  const stepParam = search.get("step");
  const organParam = search.get("organ");

  const selected = useMemo(() => stepById(stepParam), [stepParam]);
  const organId = organParam || data.organs[0]?.id || "liver";
  const organName =
    data.organs.find((o) => o.id === organId)?.name ?? organId;
  const activeOrganDiff = selected?.organDiffs?.find((d) => d.organ === organId) ?? null;
  const selectedCmp = useMemo(
    () => comparisonConfigFor("fatty-acid-synthesis")?.steps.find((s) => s.stepId === selected?.id) ?? null,
    [selected]
  );
  const grade = useMemo(() => (selectedCmp ? gradesForStep(selectedCmp) : null), [selectedCmp]);

  /* 资产注册表：manifest.json 异步合并，按当前步解析 3D 资产；未落地步骤保持原占位 */
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
    () => (selected ? resolveStepAsset(selected.id, assetReg)?.cfg ?? null : null),
    [selected, assetReg]
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

  const selectOrgan = useCallback(
    (id: string) => {
      const next = new URLSearchParams(search);
      next.set("organ", id);
      setSearch(next, { replace: true });
    },
    [search, setSearch]
  );

  /* 自测模式：沿用糖酵解 / TCA / β-氧化的 q-hide / revealed 机制 */
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

  /* 点击委托：先判 .q-hide（自测揭晓），再找 [data-step-id]，最后 [data-node-id]。
     不用 closest 的联合选择器（历史 bug：点酶名静默无响应）。 */
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
        selectStep(stepId === selected?.id ? null : stepId);
        return;
      }
      const nodeId = el.closest("[data-node-id]")?.getAttribute("data-node-id");
      if (nodeId) {
        const mapped = NODE_STEP[nodeId];
        if (mapped) selectStep(mapped === selected?.id ? null : mapped);
      }
    },
    [selected, selectStep, quizOn]
  );

  const relatedEntities = useMemo(() => {
    if (!selected) return null;
    return new Set([...selected.substrates, ...selected.products]);
  }, [selected]);

  const nodeClass = (n: { id: string; entityId: string }) => {
    const cls = ["node"];
    if (n.id === "oaa-mito") cls.push("branch-node");
    if (selected && relatedEntities) {
      cls.push(relatedEntities.has(n.entityId) ? "hl" : "faded");
    }
    return cls.join(" ");
  };

  const stepClass = (stepId: string) => {
    const step = stepById(stepId);
    const cls = [step?.kind === "cycle" ? "stepg" : "prepg"];
    if (selected?.id === stepId) cls.push("sel");
    else if (selected) cls.push("faded");
    return cls.join(" ");
  };

  const nav = useMemo(() => {
    const i = selected ? ALL_STEP_IDS.indexOf(selected.id) : -1;
    if (i === -1) {
      return {
        prev: null as string | null,
        next: ALL_STEP_IDS[0],
        prevLabel: null as string | null,
        nextLabel: STEP_SHORT[ALL_STEP_IDS[0]],
      };
    }
    const p = ALL_STEP_IDS[(i + ALL_STEP_IDS.length - 1) % ALL_STEP_IDS.length];
    const n = ALL_STEP_IDS[(i + 1) % ALL_STEP_IDS.length];
    return { prev: p, next: n, prevLabel: STEP_SHORT[p], nextLabel: STEP_SHORT[n] };
  }, [selected]);

  const transportNote = useMemo(
    () => skel.transportSteps?.find((t) => t.id === selected?.id)?.note ?? null,
    [selected]
  );

  const ledger = data.energyLedger;
  const p = ledger.palmitate;

  /* 链长标尺：C2 引物起，7 轮各 +2C → C16 */
  const chainMarks = Array.from({ length: p.rounds + 1 }, (_, i) => ({
    round: i,
    carbons: p.primerCarbons + i * ledger.perRound.carbonDelta,
    x: 1040 + i * 105,
  }));

  return (
    <div className="poster poster-fas">
      <PathwaySwitcher
        current="fatty-acid-synthesis"
        context={
          selected ? (
            selected.kind === "cycle" ? (
              <>第 {roman(selected.index)} 步 · {STEP_SHORT[selected.id]}</>
            ) : (
              <>{selected.kind === "transport" ? "跨膜搬运" : "准备步"} · {STEP_SHORT[selected.id]}</>
            )
          ) : (
            <>三泳道 · 一个四步环：每轮 +2C，7 轮出 C16</>
          )
        }
      />

      <header className="masthead">
        <div className="mast-side">
          <span className="plate-no num">{data.plateNo} · 第一版 · 2026</span>
          <span className="mast-en">DE NOVO FATTY ACID SYNTHESIS</span>
        </div>
        <div className="mast-main">
          <h1>
            {data.name}
            <small>合成在胞质 · 原料在线粒体 · 四步环每轮 +2C：C2 → C16 · 与 β-氧化逐项镜像</small>
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
          主链 / 不可逆
        </span>
        <span className="lg">
          <svg width="46" height="10" aria-hidden>
            <line x1="0" y1="5" x2="40" y2="5" stroke={INK} strokeWidth="0.9" />
            <path d="M40,1 L46,5 L40,9 Z" fill={INK} opacity={0.6} />
          </svg>
          跨膜穿梭（只放机器）
        </span>
        <span className="lg">
          <svg width="46" height="10" aria-hidden>
            <line x1="0" y1="5" x2="44" y2="5" stroke={INK} strokeWidth="0.8" strokeDasharray="4 3" opacity={0.45} />
          </svg>
          回流弧 / 出环弧（不是新的一步）
        </span>
        <span className="lg">
          <span style={{ color: AMBER, fontWeight: 700 }}>琥珀</span>＝ATP
          <span style={{ margin: "0 6px", color: TEAL, fontWeight: 700 }}>青</span>＝NADPH / 还原当量
        </span>
        {quizOn && <span className="lg quiz-hint">自测中 · 酶名与代谢物名已隐藏 · 悬停或点击揭晓</span>}
        <span className="lg legend-hint">三泳道 · 四步环在右侧 · Shift+滚轮横向漫游</span>
      </div>

      <div className="body-grid">
        <div className="plate-wrap">
          <div className="plate-head">
            <span className="t">图 1 · 合成在胞质、原料在线粒体：区室靠标签与带位区分，不靠颜色</span>
            <PlateInteraction svgRef={plateSvgRef} pathwayId="fatty-acid-synthesis" />
            <span className="organ-switch" role="tablist" aria-label="器官视图">
              {data.organs.map((o) => (
                <button
                  key={o.id}
                  type="button"
                  role="tab"
                  aria-selected={organId === o.id}
                  className={`organ-tab${organId === o.id ? " active" : ""}`}
                  onClick={() => selectOrgan(o.id)}
                  data-organ-tab={o.id}
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

          <ReadingGuide
            label="脂肪酸从头合成导读"
            summary="胞质合成：乙酰-CoA 起，丙二酰-CoA 每轮供 2 碳，7 轮后 TE 释放 C16 棕榈酸"
            paragraphs={[
              "脂肪酸从头合成在胞质把乙酰-CoA 的 C2 单元逐个接到延长链上，最后由 TE 释放棕榈酸；与 β-氧化在区室、载体、辅因子和成键方向上逐项镜像。",
              "原料：丙酮酸经 PDH 变乙酰-CoA，经柠檬酸穿梭出内膜，胞质 ACLY 裂解回乙酰-CoA。ACC 用 ATP 与生物素把乙酰-CoA 羧化成丙二酰-CoA，HCO₃⁻ 的碳在缩合时以 CO₂ 放掉。FASN 四步为 KS 缩合（+2C）、KR 还原、DH 脱水、ER 还原；乙酰-CoA 只作引物，丙二酰-CoA 才是每轮的二碳供体。酰基载体是 ACP，氧化侧用 CoA-SH，还原力用 NADPH，KR 与 ER 各消耗 1 个 NADPH。缩合新键在 C2–C3 之间，丙二酰的游离羧基以 CO₂ 离去；7 轮把 C2 推到 C16，整条耗 8 乙酰-CoA、7 ATP、14 NADPH。",
              "ACC 是限速步：肝 ACC1 受胰岛素上调、AMPK 磷酸化失活；丙二酰-CoA 抑制 CPT1，把合成开启与 β-氧化关闭连在一起。链长由 TE 在 C16 时水解释放决定。交接：乙酰-CoA 与 TCA 共用池；柠檬酸穿梭搬碳进胞质；肝、脂肪与泌乳期乳腺同酶。",
            ]}
          />

          <div className="plate-scroll" ref={scrollRef}>
            <div className="plate-canvas">
              <svg
                ref={plateSvgRef}
                className={quizOn ? "quiz-on" : undefined}
                width={W}
                height={H}
                viewBox={`0 0 ${W} ${H}`}
                onClick={onPlateClick}
                data-lanes="mito-matrix,mito-inner-membrane,cytosol"
                data-step-count="8"
                data-cycle-count="4"
                data-frame="fas"
              >
                <defs>
                  <marker id="fas-ah-ink" markerWidth="9" markerHeight="8" refX="8" refY="4" orient="auto">
                    <path d="M0,0.5 L8.5,4 L0,7.5 Z" fill={INK} />
                  </marker>
                  <marker id="fas-ah-heavy" markerWidth="10" markerHeight="9" refX="9" refY="4.5" orient="auto">
                    <path d="M0,0.5 L9.5,4.5 L0,8.5 Z" fill={INK} />
                  </marker>
                  <marker id="fas-ah-soft" markerWidth="9" markerHeight="8" refX="8" refY="4" orient="auto">
                    <path d="M0,0.5 L8.5,4 L0,7.5 Z" fill={INK} opacity={0.5} />
                  </marker>
                  <marker id="fas-ah-amber" markerWidth="9" markerHeight="8" refX="8" refY="4" orient="auto">
                    <path d="M0,0.5 L8.5,4 L0,7.5 Z" fill={AMBER} />
                  </marker>
                </defs>

                {/* 角落锚点 */}
                <g stroke={INK} strokeWidth={1} opacity={0.4}>
                  <path d="M20,12 V28 M12,20 H28" />
                  <path d={`M${W - 20},12 V28 M${W - 28},20 H${W - 12}`} />
                  <path d={`M20,${H - 28} V${H - 12} M12,${H - 20} H28`} />
                  <path d={`M${W - 20},${H - 28} V${H - 12} M${W - 28},${H - 20} H${W - 12}`} />
                </g>

                {/* ===== 三条泳道 ===== */}
                <g>
                  <rect x={40} y={60} width={W - 80} height={160} fill={INK} opacity={0.018} />
                  <line x1={40} y1={220} x2={W - 40} y2={220} stroke={INK} strokeWidth={1.4} />
                  <rect x={40} y={220} width={W - 80} height={14} fill={INK} opacity={0.09} />
                  <rect x={40} y={234} width={W - 80} height={66} fill={INK} opacity={0.025} />
                  <line x1={40} y1={300} x2={W - 40} y2={300} stroke={INK} strokeWidth={1.4} />
                  <rect x={40} y={300} width={W - 80} height={540} fill={INK} opacity={0.012} />
                  <line x1={40} y1={300} x2={W - 40} y2={300} stroke={INK} strokeWidth={1} />
                </g>
                <g fontSize={11} letterSpacing={3.2} fontWeight={700} fill={INK}>
                  <text x={48} y={78}>线粒体基质 · MITOCHONDRIAL MATRIX</text>
                  <text x={48} y={252} fontSize={9.5} letterSpacing={1.4}>
                    线粒体内膜 · 转运带 · TRANSPORT BAND（只放 MPC / CIC，不画成第四步）
                  </text>
                  <text x={48} y={330}>细胞质 · CYTOSOL（ACC + FASN 四步环）</text>
                </g>
                <text x={W - 52} y={84} fontSize={9.5} textAnchor="end" fill={INK} opacity={0.55} letterSpacing={1}>
                  FASN 约 540 kDa · 本版以 2D 分域呈现 · 部分 3D 已建（E1 / BC）
                </text>

                {/* ===== ① PDH ===== */}
                <g className={stepClass("fas-pdh")} data-step-id="fas-pdh" style={{ cursor: "pointer" }}>
                  <path
                    d={`M ${px("pyr") + 27},${py("pyr")} L ${px("accoa-mito") - 32},${py("accoa-mito")}`}
                    fill="none"
                    stroke={INK}
                    strokeWidth={2.4}
                    markerEnd="url(#fas-ah-heavy)"
                  />
                  <path d={`M 205,151 V 182`} fill="none" stroke={TEAL} strokeWidth={1.2} markerEnd="url(#fas-ah-soft)" />
                  <text x={212} y={176} fontSize={9} fill={TEAL} fontWeight={700} className="num">
                    NADH + CO₂
                  </text>
                  <path d={`M ${px("mpc")},${py("mpc") - 14} Q 118,220 88,176`} fill="none" stroke={INK} strokeWidth={0.8} strokeDasharray="3 3" opacity={0.55} />
                  <text x={92} y={238} fontSize={8.5} fill={INK} opacity={0.6}>
                    MPC 进基质
                  </text>
                  <text
                    x={STEP_LABEL_POS["fas-pdh"].x}
                    y={STEP_LABEL_POS["fas-pdh"].y}
                    fontSize={12}
                    textAnchor={STEP_LABEL_POS["fas-pdh"].anchor}
                    fontWeight={700}
                    className="q-hide"
                  >
                    <tspan className="st-no serif" fontSize={16}>①</tspan>
                    {"  "}PDH · 丙酮酸脱羧
                  </text>
                  <text x={212} y={144} fontSize={9} opacity={0.6}>
                    线粒体基质 · 产 NADH
                  </text>
                </g>

                {/* ===== ② 柠檬酸穿梭 + ACLY ===== */}
                <g className={stepClass("fas-shuttle")} data-step-id="fas-shuttle" style={{ cursor: "pointer" }}>
                  <path
                    d={`M ${px("accoa-mito") + 30},${py("accoa-mito")} L ${px("cit") - 30},${py("cit")}`}
                    fill="none"
                    stroke={INK}
                    strokeWidth={1}
                    markerEnd="url(#fas-ah-ink)"
                  />
                  <path
                    d={`M ${px("cit")},${py("cit") + 27} Q ${px("cic") - 40},${py("cic") - 36} ${px("cic")},${py("cic") - 18}`}
                    fill="none"
                    stroke={INK}
                    strokeWidth={0.9}
                    markerEnd="url(#fas-ah-ink)"
                  />
                  <path
                    d={`M ${px("cic")},${py("cic") + 16} Q 610,330 ${px("accoa-cyt") - 34},${py("accoa-cyt") - 8}`}
                    fill="none"
                    stroke={INK}
                    strokeWidth={0.9}
                    markerEnd="url(#fas-ah-ink)"
                  />
                  <path d={`M 646,392 L 646,374`} fill="none" stroke={AMBER} strokeWidth={1.2} markerEnd="url(#fas-ah-amber)" />
                  <text x={654} y={390} fontSize={8.5} fill={AMBER} fontWeight={700} className="num">
                    ATP → ADP + Pi
                  </text>
                  <text
                    x={STEP_LABEL_POS["fas-shuttle"].x}
                    y={STEP_LABEL_POS["fas-shuttle"].y}
                    fontSize={12}
                    fontWeight={700}
                    className="q-hide"
                  >
                    <tspan className="st-no serif" fontSize={16}>②</tspan>
                    {"  "}柠檬酸穿梭 · CS → CIC → ACLY
                  </text>
                  <text x={834} y={286} fontSize={9} textAnchor="end" opacity={0.6}>
                    C2 单元过内膜：OAA 回基质循环，净耗 1 ATP
                  </text>
                </g>

                {/* ===== ③ ACC ===== */}
                <g className={stepClass("fas-acc")} data-step-id="fas-acc" style={{ cursor: "pointer" }}>
                  <path
                    d={`M ${px("accoa-cyt") + 28},${py("accoa-cyt")} L ${px("malonylcoa") - 30},${py("malonylcoa")}`}
                    fill="none"
                    stroke={INK}
                    strokeWidth={2.2}
                    markerEnd="url(#fas-ah-heavy)"
                  />
                  <path d={`M 800,344 L 800,370`} fill="none" stroke={AMBER} strokeWidth={1.2} markerEnd="url(#fas-ah-amber)" />
                  <text x={808} y={384} fontSize={8.5} fill={AMBER} fontWeight={700} className="num">
                    ATP ×1 · HCO₃⁻ · 生物素
                  </text>
                  <text
                    x={STEP_LABEL_POS["fas-acc"].x}
                    y={STEP_LABEL_POS["fas-acc"].y}
                    fontSize={12}
                    fontWeight={700}
                    className="q-hide"
                  >
                    <tspan className="st-no serif" fontSize={16}>③</tspan>
                    {"  "}ACC 羧化 · 承诺步
                  </text>
                  <text x={880} y={318} fontSize={9} opacity={0.6}>
                    不可逆 / 限速 · 丙二酰-CoA 同时抑制 CPT1
                  </text>
                </g>

                {/* ===== 四步环 · 缩合 → 还原 → 脱水 → 还原 ===== */}
                <g className={stepClass("fas-ks")} data-step-id="fas-ks" data-cycle-step="1" style={{ cursor: "pointer" }}>
                  <path d="M 1124,528 Q 1210,468 1300,458" fill="none" stroke={INK} strokeWidth={2.2} markerEnd="url(#fas-ah-heavy)" />
                  <text x={1205} y={408} textAnchor="middle" fontSize={12} fontWeight={700} className="q-hide">
                    <tspan className="st-no serif" fontSize={15}>Ⅰ</tspan> KS 缩合 · +2C
                  </text>
                  <text x={1210} y={498} fontSize={8.5} fill={TEAL} fontWeight={700} textAnchor="middle" className="num">
                    丙二酰 C₂ 接入 · CO₂↑
                  </text>
                  {/* 丙二酰单元进环（低权重，不是循环第 5 步） */}
                  <path d="M 956,368 Q 1100,396 1300,440" fill="none" stroke={INK} strokeWidth={0.8} strokeDasharray="4 3" opacity={0.45} />
                  <text x={1100} y={392} fontSize={8.5} opacity={0.6} textAnchor="middle">
                    丙二酰-ACP（C₂ 单元）
                  </text>
                </g>
                <g className={stepClass("fas-kr")} data-step-id="fas-kr" data-cycle-step="2" style={{ cursor: "pointer" }}>
                  <path d="M 1356,466 Q 1450,470 1532,522" fill="none" stroke={INK} strokeWidth={1.4} markerEnd="url(#fas-ah-ink)" />
                  <text x={1450} y={456} textAnchor="middle" fontSize={12} fontWeight={700} className="q-hide">
                    <tspan className="st-no serif" fontSize={15}>Ⅱ</tspan> KR 还原
                  </text>
                  <text x={1452} y={484} textAnchor="middle" fontSize={8.5} fill={TEAL} fontWeight={700} className="num">
                    NADPH ×1 · D-3-羟基
                  </text>
                </g>
                <g className={stepClass("fas-dh")} data-step-id="fas-dh" data-cycle-step="3" style={{ cursor: "pointer" }}>
                  <path d="M 1566,566 L 1566,672" fill="none" stroke={INK} strokeWidth={1.2} markerEnd="url(#fas-ah-ink)" />
                  <text x={1600} y={606} fontSize={12} fontWeight={700} className="q-hide">
                    <tspan className="st-no serif" fontSize={15}>Ⅲ</tspan> DH 脱水
                  </text>
                  <text x={1600} y={624} fontSize={8.5} fontWeight={700}>
                    −H₂O · 反式-Δ²
                  </text>
                </g>
                <g className={stepClass("fas-er")} data-step-id="fas-er" data-cycle-step="4" style={{ cursor: "pointer" }}>
                  <path d="M 1530,718 Q 1445,764 1360,778" fill="none" stroke={INK} strokeWidth={1.4} markerEnd="url(#fas-ah-ink)" />
                  <text x={1415} y={726} textAnchor="middle" fontSize={12} fontWeight={700} className="q-hide">
                    <tspan className="st-no serif" fontSize={15}>Ⅳ</tspan> ER 还原
                  </text>
                  <text x={1415} y={744} textAnchor="middle" fontSize={8.5} fill={TEAL} fontWeight={700} className="num">
                    NADPH ×1 · 回到饱和链
                  </text>
                  {/* 回流弧：Cₙ₊₂ 回到下一轮 Cₙ（不是第 5 步） */}
                  <path d="M 1300,806 Q 1080,830 1116,566" fill="none" stroke={INK} strokeWidth={0.8} strokeDasharray="5 4" opacity={0.4} data-return-arc="1" />
                  <text x={1120} y={684} fontSize={8.5} opacity={0.6} textAnchor="end">
                    回流弧 · 下一轮 Cₙ₊₂ → Cₙ（Cₙ₊₂ 就是新的 Cₙ，不是第 5 步）
                  </text>
                </g>

                {/* ===== ④ TE 出环 ===== */}
                <g className={stepClass("fas-te")} data-step-id="fas-te" style={{ cursor: "pointer" }}>
                  <path d="M 1300,786 Q 1180,760 1058,712" fill="none" stroke={INK} strokeWidth={1.2} markerEnd="url(#fas-ah-ink)" data-exit-arc="1" />
                  <text x={STEP_LABEL_POS["fas-te"].x} y={STEP_LABEL_POS["fas-te"].y} fontSize={12} textAnchor="end" fontWeight={700} className="q-hide">
                    <tspan className="st-no serif" fontSize={15}>④</tspan> TE · C16 释放
                  </text>
                  <text x={1145} y={776} fontSize={8.5} textAnchor="end" opacity={0.65}>
                    链长选择性：C16 到站才水解
                  </text>
                </g>

                {/* ===== 链长标尺：每轮 +2C ===== */}
                <g data-chain-ruler="1">
                  <line x1={1040} y1={852} x2={1775} y2={852} stroke={INK} strokeWidth={0.8} opacity={0.5} />
                  {chainMarks.map((m) => (
                    <g key={m.round}>
                      <line x1={m.x} y1={846} x2={m.x} y2={858} stroke={INK} strokeWidth={0.8} opacity={0.6} />
                      <text x={m.x} y={870} fontSize={8.5} textAnchor="middle" fill={m.carbons === 16 ? AMBER : INK} fontWeight={m.carbons === 16 ? 700 : 400}>
                        C{m.carbons}
                      </text>
                    </g>
                  ))}
                  <text x={1040} y={840} fontSize={9} opacity={0.6}>
                    链长标尺 · 每轮 +2C × 7 轮 = C16
                  </text>
                </g>

                {/* ===== 能量账：大数字 + 逐列对齐 ===== */}
                <g data-plate-ledger="1">
                  <rect x={1660} y={300} width={280} height={246} fill={PAPER} stroke={INK} strokeWidth={1} />
                  <line x1={1660} y1={338} x2={1940} y2={338} stroke={INK} strokeWidth={1} />
                  <text x={1676} y={324} fontSize={10} letterSpacing={2} fontWeight={700}>
                    能量账 · 1 棕榈酸（C16）
                  </text>
                  <text x={1676} y={368} fontSize={9} opacity={0.65}>每轮</text>
                  <text x={1676} y={398} fontSize={22} fontWeight={700} className="num" fill={AMBER}>+2 C</text>
                  <text x={1786} y={368} fontSize={9} opacity={0.65}>× 7 轮</text>
                  <text x={1786} y={398} fontSize={22} fontWeight={700} className="num">C16</text>
                  <text x={1676} y={436} fontSize={9} opacity={0.65}>ATP（7 次 ACC）</text>
                  <text x={1676} y={466} fontSize={22} fontWeight={700} className="num" fill={AMBER}>7</text>
                  <text x={1786} y={436} fontSize={9} opacity={0.65}>NADPH（KR+ER）</text>
                  <text x={1786} y={466} fontSize={22} fontWeight={700} className="num" fill={TEAL}>14</text>
                  <line x1={1676} y1={482} x2={1924} y2={482} stroke={INK} strokeWidth={0.6} opacity={0.5} />
                  <text x={1676} y={502} fontSize={9} opacity={0.7}>
                    8 乙酰-CoA（1 引物 + 7 羧化）
                  </text>
                  <text x={1676} y={520} fontSize={9} opacity={0.7}>
                    7 HCO₃⁻ → 7 CO₂（碳不进链）
                  </text>
                  <text x={1676} y={538} fontSize={9} opacity={0.7}>
                    碳守恒：8 × C2 = C16
                  </text>
                </g>

                {/* ===== 节点（代谢物 + 机器），同实体多节点全部可点 ===== */}
                {skel.nodes.map((n) => {
                  const isMachine = n.role === "machine";
                  const lp = nodeLabelPos[n.id];
                  return (
                    <g
                      key={n.id}
                      className={nodeClass(n)}
                      data-node-id={n.id}
                      data-entity-id={n.entityId}
                      data-compartment={n.compartment}
                      style={{ cursor: "pointer" }}
                    >
                      {isMachine ? (
                        <>
                          <rect x={n.x - 31} y={n.y - 13} width={62} height={26} rx={2} fill="#fff" stroke={INK} strokeWidth={1.1} />
                          <text x={n.x} y={n.y + 5} textAnchor="middle" fontSize={11} fontWeight={700} fill={INK} style={{ pointerEvents: "none" }}>
                            {n.label}
                          </text>
                        </>
                      ) : (
                        <>
                          <circle
                            cx={n.x}
                            cy={n.y}
                            r={26}
                            fill={n.role === "projection" ? "#fff" : PAPER}
                            stroke={INK}
                            strokeWidth={n.role === "projection" ? 1.2 : 1.5}
                            strokeDasharray={n.role === "projection" ? "4 3" : undefined}
                          />
                          <text x={n.x} y={n.y + 5} textAnchor="middle" fontSize={11.5} fontWeight={700} fill={INK} className="q-hide" style={{ pointerEvents: "none" }}>
                            {nodeAbbr[n.id] ?? n.label}
                          </text>
                          {lp && (
                            <text
                              x={n.x + lp.dx}
                              y={n.y + lp.dy}
                              textAnchor={lp.anchor}
                              fontSize={9}
                              fill={INK}
                              opacity={0.7}
                              className="q-hide"
                            >
                              {n.label}
                            </text>
                          )}
                        </>
                      )}
                    </g>
                  );
                })}
              </svg>
            </div>
          </div>
          <div className="plate-foot">
            <span>区室标签是硬约束：基质 / 内膜转运带 / 胞质三条带位必须可读；跨膜段只放 MPC 与 CIC，不画成第四步。</span>
            <span>四步环闭合：Cₙ → Cₙ₊₂ 的回流弧不是第 5 步；TE 在 C16 到站时出环，链长由酶的选择性决定。</span>
          </div>
        </div>

        <aside>
          <div className="panel-block">
            <div className="pb-title">
              <span>详情栏</span>
              <span className="en">DETAIL · 点击图上任一步骤 / 机器 / 节点</span>
            </div>
            {selected ? (
              <div className="d-body">
                <div className="d-step">
                  <span className="no serif num">
                    {selected.kind === "cycle"
                      ? roman(selected.index)
                      : selected.kind === "transport"
                        ? "运"
                        : selected.id === "fas-te"
                          ? "终"
                          : "前"}
                  </span>
                  {selected.name}
                  {selected.irreversible && <span className="d-tag">不可逆</span>}
                  {selected.kind === "transport" && <span className="d-tag amber">跨膜搬运</span>}
                </div>
                <div className="d-enzyme">
                  {selected.enzyme.name}
                  {selected.enzyme.isozyme && <span className="d-iso"> — {selected.enzyme.isozyme}</span>}
                </div>
                <div className="d-eq">{selected.equation}</div>
                <div className="d-cof">
                  <b>底物</b>　{selected.substrates.map(nameOf).join(" + ")}
                  　　<b>产物</b>　{selected.products.map(nameOf).join(" + ")}
                </div>
                <div className="d-cof">
                  <b>辅因子</b>　{selected.cofactors.length ? selected.cofactors.join("、") : "—"}
                </div>
                {selected.ecNumber && <div className="d-cof num"><b>EC</b>　{selected.ecNumber}</div>}
                {selected.deltaG && (
                  <div className="d-cof" data-dg="1">
                    <b>ΔG</b>
                    <span style={{ opacity: 0.55 }}>　定性：{selected.deltaG.qualitative ?? "—"}</span>
                  </div>
                )}
                {selected.perRoundYield && (
                  <div className="d-cof" data-per-round="1">
                    <b>本轮计量</b>　+{selected.perRoundYield.carbonDelta}C · NADPH {selected.perRoundYield.nadph} ·
                    丙二酰-CoA {selected.perRoundYield.malonylCoA} · ATP {selected.perRoundYield.atp ?? 0}
                    {selected.perRoundYield.note && <span style={{ opacity: 0.6 }}>（{selected.perRoundYield.note}）</span>}
                  </div>
                )}
                {selected.stereochemistry?.length ? (
                  <div className="d-cof d-stereo"><b>立体化学</b>　{selected.stereochemistry.join("；")}</div>
                ) : null}
                <div className="d-sig">{selected.significance}</div>

                {grade && (
                  <div className="d-cof" data-testid="fas-grade" data-grade={grade.grade ?? (grade.calc ? "calc" : grade.only2d ? "2d" : "none")}>
                    <b>证据等级</b>　
                    {grade.grade ? GRADE_LABEL[grade.grade] : grade.calc ? "计算构象（无实验坐标）" : grade.only2d ? "仅 2D" : "未分级"}
                    {grade.sidesDiffer && (
                      <span style={{ opacity: 0.6 }}>（两侧实验证据不一致，按最差侧计）</span>
                    )}
                  </div>
                )}

                {selectedCmp ? (
                  <Link
                    className="frames-entry"
                    data-testid="fas-structure-cmp-entry"
                    data-cmp-step={selected.id}
                    to={`/structures/fatty-acid-synthesis#${selected.id}`}
                  >
                    看这一步的结构对照 →
                  </Link>
                ) : (
                  <div className="d-none" data-cmp-missing="1">
                    本步未建分子对照——结构页 6 块覆盖 ACC 羧化、四步环与 TE 释放。
                  </div>
                )}
                <MoleculeArchiveEntry
                  pathwayId="fatty-acid-synthesis"
                  stepId={selected.id}
                  testId="fas-molecule-archive-entry"
                />

                {transportNote && (
                  <div className="d-mirror" data-transport-note="1">
                    <span className="lbl">跨膜机器</span>
                    {transportNote}
                  </div>
                )}

                <div className="d-none" data-organ-note="1" data-organ={organId}>
                  {activeOrganDiff ? (
                    <>
                      <b>{organName}</b>　{activeOrganDiff.text}
                    </>
                  ) : selected.organDiffs?.length ? (
                    <>本步无 {organName} 差异——数据层对本步只登记了 {selected.organDiffs.map((d) => data.organs.find((o) => o.id === d.organ)?.name ?? d.organ).join("、")}。</>
                  ) : (
                    <>本步无器官差异（数据层 organDiffs 为空）。</>
                  )}
                </div>

                {selected.misconceptions?.length ? (
                  <div className="d-mis">
                    <span className="lbl">常见误解</span>
                    <ul>
                      {selected.misconceptions.slice(0, 2).map((m, i) => <li key={i}>{m}</li>)}
                    </ul>
                  </div>
                ) : null}

                {selected.clinical?.length ? (
                  <div className="d-mis">
                    <span className="lbl">临床关联</span>
                    <ul>
                      {selected.clinical.map((c, i) => <li key={i}>{c}</li>)}
                    </ul>
                  </div>
                ) : null}

                <div className="d-variant" role="tablist" aria-label="上一步 / 下一步">
                  {nav.prev && (
                    <button role="tab" className="d-variant-tab" onClick={() => selectStep(nav.prev!)}>
                      ← {nav.prevLabel}
                    </button>
                  )}
                  <button role="tab" className="d-variant-tab" onClick={() => selectStep(nav.next)}>
                    {nav.nextLabel} →
                  </button>
                </div>

                {/* 3D：manifest 有资产就渲染，否则保持原占位，不伪造路径 */}
                {selectedCfg ? (
                  <EmbeddedStepViewer stepId={selected.id} cfg={selectedCfg} />
                ) : (
                  <div className="d-none" data-3d-placeholder="1">
                    {selected.threeD?.status === "pending"
                      ? `3D 结合视图：待结构核验——${selected.threeD.note}`
                      : selected.threeD?.status === "ready"
                        ? "3D 结合视图：资产已接入，等待帧带加载…"
                        : "3D 结合视图：本步骤无 3D 酶资产。"}
                  </div>
                )}
              </div>
            ) : (
              <div className="d-body">
                <div className="d-placeholder">
                  点击图上的步骤箭头、酶名或代谢物节点，此处显示该步的反应式、酶、ΔG（仅保留定性标注，不展示数值）、
                  辅因子、证据等级与结构对照入口。三泳道里基质与胞质各有乙酰-CoA 节点；四步环的四个结构域、
                  贯通两条泳道的柠檬酸穿梭、以及出环的 TE 都可点击。
                </div>
              </div>
            )}
          </div>

          {/* ===== 合成 vs 氧化镜像对照（右栏常驻） ===== */}
          <div className="panel-block" data-testid="fas-mirror-table" data-mirror-table="1">
            <div className="pb-title">
              <span>合成 vs 氧化 · 镜像对照</span>
              <span className="en">SYNTHESIS ↔ β-OXIDATION</span>
            </div>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 10.5, lineHeight: 1.65 }}>
              <thead>
                <tr>
                  <th style={{ textAlign: "left", borderBottom: `1px solid ${INK}`, padding: "4px 2px", width: "22%" }}>项目</th>
                  <th style={{ textAlign: "left", borderBottom: `1px solid ${INK}`, padding: "4px 2px", color: TEAL }}>从头合成（FAS）</th>
                  <th style={{ textAlign: "left", borderBottom: `1px solid ${INK}`, padding: "4px 2px", color: AMBER }}>β-氧化</th>
                </tr>
              </thead>
              <tbody>
                {data.mirrorTable.map((row) => (
                  <tr key={row.item} data-mirror-row={row.item}>
                    <td style={{ borderBottom: "1px solid rgba(34,40,42,.18)", padding: "4px 2px", fontWeight: 700 }}>{row.item}</td>
                    <td style={{ borderBottom: "1px solid rgba(34,40,42,.18)", padding: "4px 2px" }}>{row.synthesis}</td>
                    <td style={{ borderBottom: "1px solid rgba(34,40,42,.18)", padding: "4px 2px" }}>{row.oxidation}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* ===== 能量账本：大数字 + 逐列对齐 ===== */}
          <div className="panel-block" data-ledger-fas="1" data-ledger-derivation="1">
            <div className="pb-title">
              <span>能量账本 · 推导</span>
              <span className="en">ENERGY LEDGER · 1 棕榈酸（C16）</span>
            </div>
            <div className="settle">
              <div>
                <div className="s-lbl">每轮</div>
                <div className="s-val t num">+2 C</div>
                <div className="s-sub num">KS 缩合；CO₂ 离去</div>
              </div>
              <div>
                <div className="s-lbl">7 轮</div>
                <div className="s-val num">C16</div>
                <div className="s-sub num">{p.primerCarbons} + 7 × 2</div>
              </div>
              <div>
                <div className="s-lbl">ATP</div>
                <div className="s-val a num">{p.atp}</div>
                <div className="s-sub num">7 次 ACC 羧化</div>
              </div>
              <div>
                <div className="s-lbl">NADPH</div>
                <div className="s-val t num">{p.nadph}</div>
                <div className="s-sub num">7 × (KR 1 + ER 1)</div>
              </div>
              <div className="settle-rule" />
              <div className="settle-net" data-net-carbon="16">
                <span className="n-lbl">净结果</span>
                <span className="n-val num">C16</span>
              </div>
            </div>
            <div style={{ fontSize: 11, lineHeight: 1.9, marginTop: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", borderTop: `1px solid ${INK}`, paddingTop: 6 }}>
                <span>乙酰-CoA</span><span className="num">1 引物 + 7 羧化 = {p.acetylCoA}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span>HCO₃⁻ → CO₂（缩合时离去）</span><span className="num">{p.bicarbonate}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", borderTop: `1px solid ${INK}`, marginTop: 4, paddingTop: 4, fontWeight: 700 }}>
                <span>净方程</span>
                <span className="num" style={{ textAlign: "right", maxWidth: 300 }}>{ledger.netEquation}</span>
              </div>
            </div>
            <div style={{ fontSize: 10.5, opacity: 0.62, marginTop: 8, lineHeight: 1.7 }} data-balance-note="1">
              {ledger.balanceNote}
            </div>
          </div>

          {/* ===== 碳守恒与环语义 ===== */}
          <div className="panel-block" data-carbon-check="1">
            <div className="pb-title">
              <span>碳守恒 & 环语义</span>
              <span className="en">CARBON · 8 × C2 = C16</span>
            </div>
            <div style={{ fontSize: 11.5, lineHeight: 1.9 }}>
              <p style={{ margin: "0 0 8px" }}>{ledger.carbonNote}</p>
              <p style={{ margin: "0 0 8px" }} data-return-note="1">
                四步环画成闭合回路：KS 形成 C–C 键（链的 C2–C3 之间），KR 与 ER 各耗 1 个 NADPH，
                DH 只脱水。回流弧把 Cₙ₊₂ 标成下一轮的 Cₙ，它不在 4 个 <code>data-cycle-step</code> 里——回流弧不是第 5 步。
              </p>
              <p style={{ margin: 0, opacity: 0.7 }}>
                出环弧由 TE 完成：C16 到站后水解硫酯，释放棕榈酸 + ACP；四步环本身没有终止信号。
              </p>
            </div>
          </div>
        </aside>
      </div>

      <PathwayRailFoot current="fatty-acid-synthesis" />
      <div className="poster-foot">
        <span>说明：ΔG 数值不作页面展示，仅保留 Lehninger Ch.21 定性结论；能量账见本页 ATP/NADPH 化学计量。<br /></span>
        <span>3D 现状：FASN 约 540 kDa 巨型合酶，本页已为 fas-pdh（PDH E1 人源 α₂β₂）、fas-acc（ACC1 BC 域）、fas-er 与 fas-kr（8VM0 的 ER/KR 域，仅显示目标域）接入 3D；四步环中的 KS/DH/TE 与柠檬酸穿梭仍无可用结构或仅有 apo/跨物种候选，本页不展示其 3D。页面不伪造资产路径。<br /></span>
        <span>分子资产：本轮不做 2D / 3D 分子图；结构对照页以文字 + 计算坐标说明，默认 2D，不伪造口袋。<br /></span>
        <span>{data.threeD.note}</span>
      </div>
    </div>
  );
}
