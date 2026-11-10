// 脂肪酸 β-氧化挂图页（PLATE 05）。
// 体例与糖酵解 / TCA / 糖异生 / PPP 四张挂图一致：纸白底、墨/琥珀/青/砖红四色、
// 无圆角卡片与投影。几何全部读 skeleton.json（1980×880 四泳道），
// 反应与能量数字全部读 fao.json；页面不计算热力学，不伪造 3D 资产。
import { useCallback, useEffect, useMemo, useRef, useState, type MouseEvent as ReactMouseEvent } from "react";
import { Link, useSearchParams } from "react-router-dom";
import faoJson from "../data/fatty-acid-oxidation/fao.json";
import skeletonJson from "../data/fatty-acid-oxidation/skeleton.json";
import type { FaoData, FaoSkeleton } from "../data/fatty-acid-oxidation/types";
import { comparisonConfigFor } from "../data/comparisonConfig";
import { GRADE_LABEL, gradesForStep } from "../data/evidenceGrade";
import PathwaySwitcher from "../components/PathwaySwitcher";
import { PathwayRailFoot } from "../components/PathwayRail";
import PlateInteraction from "../components/PlateInteraction";
import ReadingGuide from "../components/ReadingGuide";
import EmbeddedStepViewer from "../components/EmbeddedStepViewer";
import MoleculeArchiveEntry from "../components/MoleculeArchiveEntry";
import { loadStepManifest, resolveStepAsset, stepAssets } from "../data/stepAssets";

const data = faoJson as unknown as FaoData;
const skel = skeletonJson as unknown as FaoSkeleton;

const W = skel.canvas.width;
const H = skel.canvas.height;

const PAPER = "#F6F3EC";
const INK = "#22282A";
const AMBER = "#B4761F";
const TEAL = "#2E6E6B";
const BRICK = "#9C4A3C";

const entityMap = new Map(data.entities.map((e) => [e.id, e]));
const nodeMap = new Map(skel.nodes.map((n) => [n.id, n]));

const abbrOf = (id?: string) => (id ? entityMap.get(id)?.abbr ?? id : "");
const nameOf = (id?: string) => (id ? entityMap.get(id)?.name ?? id : "");

const stepById = (id: string | null) =>
  id ? data.steps.find((s) => s.id === id) ?? null : null;

const ALL_STEP_IDS = ["fao-act", "fao-shuttle", "fao-1", "fao-2", "fao-3", "fao-4"];

/** 节点 → 步骤：同一实体多泳道节点全部可点 */
const NODE_STEP: Record<string, string> = {
  fa: "fao-act",
  "acylcoa-cyt": "fao-act",
  acs: "fao-act",
  cpt1: "fao-shuttle",
  acylcarn: "fao-shuttle",
  cact: "fao-shuttle",
  cpt2: "fao-shuttle",
  acylcoa: "fao-1",
  enoyl: "fao-1",
  hydroxy: "fao-2",
  keto: "fao-3",
  "acylcoa-short": "fao-4",
  accoa: "fao-4",
};

const posOf = (id: string) => {
  const n = nodeMap.get(id);
  return n ? { x: n.x, y: n.y } : { x: 0, y: 0 };
};

const nodeLabelPos: Record<string, { dx: number; dy: number; anchor: "start" | "middle" | "end" }> = {
  fa: { dx: 0, dy: 42, anchor: "middle" },
  "acylcoa-cyt": { dx: 0, dy: 42, anchor: "middle" },
  acylcarn: { dx: 0, dy: -46, anchor: "middle" },
  acylcoa: { dx: -6, dy: -34, anchor: "middle" },
  enoyl: { dx: 0, dy: -34, anchor: "middle" },
  hydroxy: { dx: 0, dy: -34, anchor: "middle" },
  keto: { dx: 0, dy: 40, anchor: "middle" },
  "acylcoa-short": { dx: -36, dy: 4, anchor: "end" },
  accoa: { dx: 0, dy: 38, anchor: "middle" },
};

const nodeAbbr: Record<string, string> = {
  fa: "C16",
  "acylcoa-cyt": "C16-CoA",
  acylcarn: "Carn",
  acylcoa: "Cₙ-CoA",
  enoyl: "Enoyl",
  hydroxy: "3-OH",
  keto: "3-Keto",
  "acylcoa-short": "Cₙ₋₂",
  accoa: "AcCoA",
};

const STEP_SHORT: Record<string, string> = {
  "fao-act": "活化 · ACSL",
  "fao-shuttle": "肉碱穿梭 · CPT1/CACT/CPT2",
  "fao-1": "第 1 步 · 脱氢",
  "fao-2": "第 2 步 · 水化",
  "fao-3": "第 3 步 · 再脱氢",
  "fao-4": "第 4 步 · 硫解",
};

const STEP_LABEL_POS: Record<string, { x: number; y: number; anchor: "start" | "middle" | "end" }> = {
  "fao-act": { x: 205, y: 122, anchor: "middle" },
  "fao-shuttle": { x: 700, y: 150, anchor: "middle" },
  "fao-1": { x: 1295, y: 458, anchor: "middle" },
  "fao-2": { x: 1625, y: 458, anchor: "middle" },
  "fao-3": { x: 1615, y: 782, anchor: "middle" },
  "fao-4": { x: 1248, y: 754, anchor: "middle" },
};

const STEP_ENERGY: Record<string, { text: string; color: string }> = {
  "fao-1": { text: "FADH₂ ×1 → 1.5 ATP 当量", color: TEAL },
  "fao-2": { text: "H₂O 加入 · 不改碳数", color: INK },
  "fao-3": { text: "NADH ×1 → 2.5 ATP 当量", color: TEAL },
  "fao-4": { text: "乙酰-CoA ×1 → TCA ×10 ATP", color: AMBER },
};

function roman(n: number | null) {
  if (n === null) return "";
  return ["Ⅰ", "Ⅱ", "Ⅲ", "Ⅳ", "Ⅴ", "Ⅵ", "Ⅶ", "Ⅷ", "Ⅸ", "Ⅹ"][n - 1] ?? String(n);
}

export default function FaoOverviewPage() {
  const [search, setSearch] = useSearchParams();
  const stepParam = search.get("step");
  const organParam = search.get("organ");

  const selected = useMemo(() => stepById(stepParam), [stepParam]);

  /* 资产注册表：manifest.json 异步合并，按当前步解析 3D 资产；缺失步骤保持原占位 */
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

  const organId = organParam || data.organs[0]?.id || "liver";
  const organName =
    data.organs.find((o) => o.id === organId)?.name ??
    (organId === "red-blood-cell" ? "红细胞" : organId);
  const activeOrganDiff = selected?.organDiffs?.find((d) => d.organ === organId) ?? null;
  const extraOrgans = selected
    ? selected.organDiffs.filter((d) => !data.organs.some((o) => o.id === d.organ))
    : [];
  const organTabs = [
    ...data.organs,
    ...extraOrgans.map((d) => ({ id: d.organ, name: d.organ === "red-blood-cell" ? "红细胞" : d.organ })),
  ];
  const selectedCmp = useMemo(
    () => comparisonConfigFor("fatty-acid-oxidation")?.steps.find((s) => s.stepId === selected?.id) ?? null,
    [selected]
  );
  const grade = useMemo(() => (selectedCmp ? gradesForStep(selectedCmp) : null), [selectedCmp]);

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

  /* 自测模式：沿用糖酵解 / TCA 的 q-hide / revealed 机制 */
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

  /* 点击委托：先判 .q-hide（自测揭晓），再分别找 [data-step-id] /
     [data-prep-id] / [data-node-id]；不用 closest 联合选择器。 */
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
      const cycleId = el.closest("[data-step-id]")?.getAttribute("data-step-id");
      if (cycleId) {
        selectStep(cycleId === selected?.id ? null : cycleId);
        return;
      }
      const prepId = el.closest("[data-prep-id]")?.getAttribute("data-prep-id");
      if (prepId) {
        selectStep(prepId === selected?.id ? null : prepId);
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

  const nodeClass = (n: { id: string; entityId?: string }) => {
    const cls = ["node"];
    if (selected && relatedEntities) {
      const eid = n.entityId ?? n.id;
      cls.push(relatedEntities.has(eid) ? "hl" : "faded");
    }
    return cls.join(" ");
  };
  const stepClass = (stepId: string) => {
    const cls = ["stepg"];
    if (selected?.id === stepId) cls.push("sel");
    else if (selected) cls.push("faded");
    return cls.join(" ");
  };
  const prepClass = (stepId: string) => {
    const cls = ["prepg"];
    if (selected?.id === stepId) cls.push("sel");
    else if (selected) cls.push("faded");
    return cls.join(" ");
  };

  const nav = useMemo(() => {
    const i = selected ? ALL_STEP_IDS.indexOf(selected.id) : -1;
    if (i === -1) {
      return { prev: null as string | null, next: ALL_STEP_IDS[0], prevLabel: null as string | null, nextLabel: STEP_SHORT[ALL_STEP_IDS[0]] };
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
  const perRoundAtp =
    ledger.perRound.fadh2 * ledger.poBasis.fadh2 +
    ledger.perRound.nadh * ledger.poBasis.nadh +
    ledger.perRound.acetylCoA * ledger.poBasis.accoaViaTca;

  const derived = {
    fadh2Atp: p.fadh2 * ledger.poBasis.fadh2,
    nadhAtp: p.nadh * ledger.poBasis.nadh,
    accoaAtp: p.acetylCoA * ledger.poBasis.accoaViaTca,
    gross: p.fadh2 * ledger.poBasis.fadh2 + p.nadh * ledger.poBasis.nadh + p.acetylCoA * ledger.poBasis.accoaViaTca,
    net: ledger.totals.netAtp,
  };

  /* 七轮链长表：C16 起，每轮 −2C，第 7 轮底物 C4 硫解释放 2 个乙酰-CoA */
  const rounds = Array.from({ length: p.rounds }, (_, i) => {
    const before = p.carbons - i * 2;
    const after = before - 2;
    return {
      round: i + 1,
      before,
      after,
      accoa: i === p.rounds - 1 ? 2 : 1,
    };
  });

  return (
    <div className="poster poster-fao">
      {/* ===== 通路切换器（全站统一，替代原手写面包屑） ===== */}
      <PathwaySwitcher
        current="fatty-acid-oxidation"
        context={
          selected ? (
            selected.kind === "cycle" ? (
              <>第 {roman(selected.index)} 步 · {STEP_SHORT[selected.id]}</>
            ) : (
              STEP_SHORT[selected.id]
            )
          ) : undefined
        }
      />

      <header className="masthead">
        <div className="mast-top">
          <span className="kicker">代谢通路挂图 · METABOLIC WALL CHART</span>
          <span className="plate-no num">PLATE 05 / 12 · 第一版 · 2026</span>
        </div>
        <div className="mast-main">
          <h1>
            {data.name}
            <small>β-OXIDATION — 四泳道 · 肉碱穿梭 · 一个四步环：每轮 −2C，出 1 个乙酰-CoA</small>
          </h1>
          <p className="mast-summary">
            {data.summary}
          </p>
        </div>
      </header>

      <div className="legend">
        <span className="lg">
          <svg width="46" height="10" aria-hidden>
            <line x1="0" y1="5" x2="38" y2="5" stroke={INK} strokeWidth="1.6" />
            <path d="M38,1 L46,5 L38,9 Z" fill={INK} />
          </svg>
          不可逆 / 主链
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
          回流弧 / 出环弧（低权重，不是新的一步）
        </span>
        <span className="lg">
          <span style={{ color: AMBER, fontWeight: 700 }}>琥珀</span>＝ATP / 乙酰-CoA 入 TCA
          <span style={{ margin: "0 6px", color: TEAL, fontWeight: 700 }}>青</span>＝NADH / FADH₂ 还原当量
        </span>
        {quizOn && <span className="lg quiz-hint">自测中 · 酶名与代谢物名已隐藏 · 悬停或点击揭晓</span>}
        <span className="lg legend-hint">画布宽于视口 · 四步环在右侧 · Shift+滚轮横向漫游</span>
      </div>

      <div className="body-grid">
        <div className="plate-wrap">
          <div className="plate-head">
            <span className="t">图 1 · β-氧化主链：胞质 → 外膜 → 膜间腔 → 内膜 → 基质；跨膜段只放机器</span>
            <PlateInteraction svgRef={plateSvgRef} pathwayId="fatty-acid-oxidation" />
            <span className="organ-switch" role="tablist" aria-label="器官视图">
              {organTabs.map((o) => (
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
            label="β-氧化导读"
            summary="线粒体基质：碳链每轮减 2 个碳，产 1 FADH₂ + 1 NADH + 1 乙酰-CoA"
            paragraphs={[
              "β-氧化在线粒体基质把脂酰-CoA 从羧基端逐轮切下二碳单位，产物是乙酰-CoA、FADH₂ 与 NADH；循环本身不产 ATP，能量交给呼吸链兑现。肝、心肌与骨骼肌都走这条流水线；红细胞无线粒体，只能糖酵解。",
              "起点在胞质：脂酰-CoA 合成酶用 ATP→AMP+PPi 活化脂肪酸，代价 2 个高能键；焦磷酸副产物把反应推向脂酰-CoA 一侧，使活化不可逆；长链脂酰-CoA 经 CPT1→CACT→CPT2 肉碱穿梭进基质。四步为脱氢（FAD→FADH₂）、水化、脱氢（NAD⁺→NADH）、硫解，每轮减 2 个碳、释出 1 个乙酰-CoA；FADH₂ 与 NADH 分别记 1.5 与 2.5 ATP 当量。C16 棕榈酸跑 7 轮，得 8 乙酰-CoA、7 FADH₂、7 NADH。",
              "闸门是 CPT1，被丙二酰-CoA 抑制，合成开启即关闭分解；四步环近平衡，无单一限速步。肝 CPT1A 空腹开闸供酮体原料，肌 CPT1B/CPT2 支撑运动耐力。交接：乙酰-CoA 进 TCA；FADH₂ 经 ETF→ETF-QO 绕过复合体 I 进 Q 池，NADH 经复合体 I；红细胞无线粒体不能运行；肝乙酰-CoA 过载转酮体，酮体经血供脑与心。",
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
                data-lanes="cytosol,mito-outer-membrane,mito-inner-membrane,mito-matrix"
                data-prep-count="2"
                data-cycle-count="4"
              >
                <defs>
                  <marker id="fao-ah-ink" markerWidth="9" markerHeight="8" refX="8" refY="4" orient="auto">
                    <path d="M0,0.5 L8.5,4 L0,7.5 Z" fill={INK} />
                  </marker>
                  <marker id="fao-ah-ink-heavy" markerWidth="10" markerHeight="9" refX="9" refY="4.5" orient="auto">
                    <path d="M0,0.5 L9.5,4.5 L0,8.5 Z" fill={INK} />
                  </marker>
                  <marker id="fao-ah-soft" markerWidth="9" markerHeight="8" refX="8" refY="4" orient="auto">
                    <path d="M0,0.5 L8.5,4 L0,7.5 Z" fill={INK} opacity={0.55} />
                  </marker>
                  <marker id="fao-ah-open" markerWidth="9" markerHeight="8" refX="8" refY="4" orient="auto-start-reverse">
                    <path d="M0,0.5 L8.5,4 L0,7.5" fill="none" stroke={INK} />
                  </marker>
                </defs>

                {/* 角落锚点 */}
                <g stroke={INK} strokeWidth={1} opacity={0.4}>
                  <path d="M20,12 V28 M12,20 H28" />
                  <path d={`M${W - 20},12 V28 M${W - 28},20 H${W - 12}`} />
                  <path d={`M20,${H - 28} V${H - 12} M12,${H - 20} H28`} />
                  <path d={`M${W - 20},${H - 28} V${H - 12} M${W - 28},${H - 20} H${W - 12}`} />
                </g>

                {/* ===== 泳道与膜带 ===== */}
                <g>
                  {/* 胞质底界 */}
                  <line x1={40} y1={220} x2={W - 40} y2={220} stroke={INK} strokeWidth={1} />
                  {/* 外膜（双线薄带） + 膜间腔 */}
                  <rect x={40} y={220} width={W - 80} height={13} fill={INK} opacity={0.09} />
                  <line x1={40} y1={220} x2={W - 40} y2={220} stroke={INK} strokeWidth={1.4} />
                  <line x1={40} y1={233} x2={W - 40} y2={233} stroke={INK} strokeWidth={1.4} />
                  <rect x={40} y={233} width={W - 80} height={67} fill={INK} opacity={0.025} />
                  <text x={W - 52} y={270} fontSize={10.5} textAnchor="end" fill={INK} opacity={0.65} letterSpacing={1.2}>
                    膜间腔 · INTERMEMBRANE SPACE
                  </text>
                  {/* 内膜（双线薄带） + 转运带 */}
                  <rect x={40} y={300} width={W - 80} height={13} fill={INK} opacity={0.09} />
                  <line x1={40} y1={300} x2={W - 40} y2={300} stroke={INK} strokeWidth={1.4} />
                  <line x1={40} y1={313} x2={W - 40} y2={313} stroke={INK} strokeWidth={1.4} />
                  <rect x={40} y={313} width={W - 80} height={67} fill={INK} opacity={0.025} />
                  <line x1={40} y1={380} x2={W - 40} y2={380} stroke={INK} strokeWidth={1} />
                  {/* 基质 */}
                  <rect x={40} y={380} width={W - 80} height={460} fill={INK} opacity={0.018} />
                </g>
                <g fontSize={11} letterSpacing={3.4} fontWeight={700} fill={INK}>
                  <text x={48} y={95}>细胞质 · CYTOSOL</text>
                  <text x={48} y={212} fontSize={9.5} letterSpacing={1.6} fontWeight={700}>线粒体外膜 · OUTER MEMBRANE</text>
                  <text x={48} y={294} fontSize={9.5} letterSpacing={1.6} fontWeight={700}>线粒体内膜 · 转运带（只放跨膜机器）</text>
                  <text x={48} y={404}>线粒体基质 · MITOCHONDRIAL MATRIX</text>
                </g>

                {/* ===== 前置·活化（fao-act） ===== */}
                <g className={prepClass("fao-act")} data-prep-id="fao-act" style={{ cursor: "pointer" }}>
                  <path d="M 106,140 L 298,140" fill="none" stroke={INK} strokeWidth={2.4} markerEnd="url(#fao-ah-ink-heavy)" />
                  <path d="M 205,146 V 174" fill="none" stroke={AMBER} strokeWidth={2} />
                  <text x={210} y={166} fontSize={9} fill={AMBER} fontWeight={700} className="num">ATP → AMP + PPi</text>
                  <path d="M 205,180 V 246" fill="none" stroke={INK} strokeWidth={0.9} strokeDasharray="3 3" opacity={0.55} />
                  <text
                    x={STEP_LABEL_POS["fao-act"].x}
                    y={STEP_LABEL_POS["fao-act"].y}
                    fontSize={12}
                    textAnchor={STEP_LABEL_POS["fao-act"].anchor}
                    fontWeight={700}
                    className="q-hide"
                  >
                    <tspan className="st-no serif" fontSize={17}>①</tspan>
                    {"  "}活化 · ACSL
                  </text>
                  <text x={205} y={190} fontSize={9.5} textAnchor="middle" opacity={0.6}>
                    羧基 → 硫酯 · 消耗 2 个高能键
                  </text>
                </g>

                {/* ===== 前置·跨膜（fao-shuttle）：只画脂酰基与机器 ===== */}
                <g className={prepClass("fao-shuttle")} data-prep-id="fao-shuttle" style={{ cursor: "pointer" }}>
                  {/* 胞质侧脂酰-CoA → CPT1 */}
                  <path d="M 356,152 Q 404,204 430,246" fill="none" stroke={INK} strokeWidth={1.2} markerEnd="url(#fao-ah-ink)" />
                  {/* CPT1 → 脂酰肉碱 */}
                  <path d="M 468,260 L 570,260" fill="none" stroke={INK} strokeWidth={1.2} markerEnd="url(#fao-ah-ink)" />
                  {/* 脂酰肉碱 → CACT */}
                  <path d="M 624,272 Q 682,304 700,330" fill="none" stroke={INK} strokeWidth={1.2} markerEnd="url(#fao-ah-ink)" />
                  {/* CACT → CPT2 */}
                  <path d="M 744,340 L 828,340" fill="none" stroke={INK} strokeWidth={1} markerEnd="url(#fao-ah-ink)" />
                  {/* CPT2 → 基质脂酰-CoA */}
                  <path d="M 882,354 Q 1010,482 1114,590" fill="none" stroke={INK} strokeWidth={1.2} markerEnd="url(#fao-ah-ink)" />
                  <text
                    x={STEP_LABEL_POS["fao-shuttle"].x}
                    y={STEP_LABEL_POS["fao-shuttle"].y}
                    fontSize={12}
                    textAnchor={STEP_LABEL_POS["fao-shuttle"].anchor}
                    fontWeight={700}
                    className="q-hide"
                  >
                    <tspan className="st-no serif" fontSize={17}>②</tspan>
                    {"  "}跨膜 · 肉碱穿梭
                  </text>
                  <text x={700} y={164} fontSize={9.5} textAnchor="middle" opacity={0.6}>
                    脂酰基整体转移 · 无碳骨架改变 · 不耗 ATP
                  </text>
                  <text x={930} y={330} fontSize={9} opacity={0.55} textAnchor="middle">
                    电中性交换
                  </text>
                </g>

                {/* ===== 四步环（cycle）：g[data-step-id] 恰好 4 个 ===== */}
                <g className={stepClass("fao-1")} data-step-id="fao-1" style={{ cursor: "pointer" }}>
                  <path d="M 1170,596 Q 1282,506 1418,500" fill="none" stroke={INK} strokeWidth={2} markerEnd="url(#fao-ah-ink)" />
                  <circle cx={1178} cy={588} r={12} fill={PAPER} stroke={INK} strokeWidth={1} />
                  <text x={1178} y={592} fontSize={11} textAnchor="middle" fontWeight={700}>1</text>
                  <text
                    x={STEP_LABEL_POS["fao-1"].x}
                    y={STEP_LABEL_POS["fao-1"].y}
                    fontSize={12}
                    textAnchor={STEP_LABEL_POS["fao-1"].anchor}
                    fontWeight={700}
                    className="q-hide"
                  >
                    第 1 步 · 脱氢
                  </text>
                  {STEP_ENERGY["fao-1"] && (
                    <text x={STEP_LABEL_POS["fao-1"].x} y={STEP_LABEL_POS["fao-1"].y + 15} fontSize={9.5} textAnchor="middle" fill={STEP_ENERGY["fao-1"].color} fontWeight={700} className="num">
                      {STEP_ENERGY["fao-1"].text}
                    </text>
                  )}
                </g>

                <g className={stepClass("fao-2")} data-step-id="fao-2" style={{ cursor: "pointer" }}>
                  <path d="M 1482,500 Q 1628,500 1720,584" fill="none" stroke={INK} strokeWidth={2} markerEnd="url(#fao-ah-ink)" />
                  <circle cx={1610} cy={508} r={12} fill={PAPER} stroke={INK} strokeWidth={1} />
                  <text x={1610} y={512} fontSize={11} textAnchor="middle" fontWeight={700}>2</text>
                  <text
                    x={STEP_LABEL_POS["fao-2"].x}
                    y={STEP_LABEL_POS["fao-2"].y}
                    fontSize={12}
                    textAnchor={STEP_LABEL_POS["fao-2"].anchor}
                    fontWeight={700}
                    className="q-hide"
                  >
                    第 2 步 · 水化
                  </text>
                  {STEP_ENERGY["fao-2"] && (
                    <text x={STEP_LABEL_POS["fao-2"].x} y={STEP_LABEL_POS["fao-2"].y + 15} fontSize={9.5} textAnchor="middle" fill={STEP_ENERGY["fao-2"].color} opacity={0.65} className="num">
                      {STEP_ENERGY["fao-2"].text}
                    </text>
                  )}
                </g>

                <g className={stepClass("fao-3")} data-step-id="fao-3" style={{ cursor: "pointer" }}>
                  <path d="M 1738,632 Q 1628,722 1492,724" fill="none" stroke={INK} strokeWidth={2} markerEnd="url(#fao-ah-ink)" />
                  <circle cx={1698} cy={662} r={12} fill={PAPER} stroke={INK} strokeWidth={1} />
                  <text x={1698} y={666} fontSize={11} textAnchor="middle" fontWeight={700}>3</text>
                  <text
                    x={STEP_LABEL_POS["fao-3"].x}
                    y={STEP_LABEL_POS["fao-3"].y}
                    fontSize={12}
                    textAnchor={STEP_LABEL_POS["fao-3"].anchor}
                    fontWeight={700}
                    className="q-hide"
                  >
                    第 3 步 · 再脱氢
                  </text>
                  {STEP_ENERGY["fao-3"] && (
                    <text x={STEP_LABEL_POS["fao-3"].x} y={STEP_LABEL_POS["fao-3"].y + 15} fontSize={9.5} textAnchor="middle" fill={STEP_ENERGY["fao-3"].color} fontWeight={700} className="num">
                      {STEP_ENERGY["fao-3"].text}
                    </text>
                  )}
                </g>

                <g className={stepClass("fao-4")} data-step-id="fao-4" style={{ cursor: "pointer" }}>
                  <path d="M 1424,746 Q 1250,806 1108,792" fill="none" stroke={INK} strokeWidth={2} markerEnd="url(#fao-ah-ink)" />
                  <circle cx={1166} cy={795} r={12} fill={PAPER} stroke={INK} strokeWidth={1} />
                  <text x={1166} y={799} fontSize={11} textAnchor="middle" fontWeight={700}>4</text>
                  <text
                    x={STEP_LABEL_POS["fao-4"].x}
                    y={STEP_LABEL_POS["fao-4"].y}
                    fontSize={12}
                    textAnchor={STEP_LABEL_POS["fao-4"].anchor}
                    fontWeight={700}
                    className="q-hide"
                  >
                    第 4 步 · 硫解 · 链 −2C
                  </text>
                  {STEP_ENERGY["fao-4"] && (
                    <text x={STEP_LABEL_POS["fao-4"].x} y={STEP_LABEL_POS["fao-4"].y + 15} fontSize={9.5} textAnchor="middle" fill={STEP_ENERGY["fao-4"].color} fontWeight={700} className="num">
                      {STEP_ENERGY["fao-4"].text}
                    </text>
                  )}
                </g>

                {/* ===== 回流弧：不是第 5 步（低线宽 + 低透明度 + 明确文字） ===== */}
                <g className="branch" opacity={0.7} data-return-arc="1">
                  <path d="M 1060,774 Q 1004,688 1110,636" fill="none" stroke={INK} strokeWidth={0.9} strokeDasharray="5 4" markerEnd="url(#fao-ah-soft)" />
                  <text x={1120} y={676} fontSize={10} textAnchor="start" fontWeight={700} fill={INK}>
                    第 5 轮 · 回到第 1 步（链已 −2C）
                  </text>
                  <text x={1120} y={690} fontSize={8.5} textAnchor="start" opacity={0.85}>
                    回流弧 ≠ 第 5 步：这是下一轮从 Cₙ₋₂ 重新进入
                  </text>
                </g>

                {/* ===== 出环弧 + TCA 投影节点 ===== */}
                <g className="branch" opacity={0.55} data-exit-arc="1">
                  <path d="M 1436,752 Q 1210,868 868,800" fill="none" stroke={INK} strokeWidth={0.9} strokeDasharray="5 4" markerEnd="url(#fao-ah-soft)" />
                  <text x={1245} y={832} fontSize={9} textAnchor="middle" opacity={0.8}>
                    乙酰-CoA 离环 → TCA
                  </text>
                </g>
                <g data-tca-projection="1">
                  <line x1={790} y1={790} x2={812} y2={790} stroke={INK} strokeWidth={1} strokeDasharray="3 3" opacity={0.7} />
                  <rect x={690} y={772} width={98} height={36} fill={PAPER} stroke={INK} strokeWidth={1.1} strokeDasharray="3 3" />
                  <text x={739} y={788} fontSize={9.5} textAnchor="middle" fontWeight={700} fill={INK}>TCA 接口</text>
                  <text x={739} y={800} fontSize={8.5} textAnchor="middle" opacity={0.65} className="num">投影节点 · ×10 ATP</text>
                </g>

                {/* ===== 机器：跨膜段只放机器 ===== */}
                <g fontSize={10.5} fontWeight={700} textAnchor="middle">
                  {[
                    { id: "acs", x: 200, y: 260, w: 104, h: 32, label: "ACSL", sub: "外膜胞质面" },
                    { id: "cpt1", x: 450, y: 260, w: 104, h: 32, label: "CPT1", sub: "限速闸" },
                    { id: "cact", x: 720, y: 340, w: 96, h: 32, label: "CACT", sub: "电中性交换" },
                    { id: "cpt2", x: 860, y: 340, w: 96, h: 32, label: "CPT2", sub: "基质侧换回 CoA" },
                  ].map((m) => {
                    const n = nodeMap.get(m.id);
                    return (
                      <g key={m.id} className={nodeClass({ id: m.id, entityId: n?.entityId })} data-node-id={m.id} style={{ cursor: "pointer" }}>
                        <rect x={m.x - m.w / 2} y={m.y - m.h / 2} width={m.w} height={m.h} fill={PAPER} stroke={INK} strokeWidth={1.1} />
                        <text x={m.x} y={m.y - 1} fontSize={11.5} className="num">{m.label}</text>
                        <text x={m.x} y={m.y + 11} fontSize={8.5} fontWeight={400} opacity={0.6}>{m.sub}</text>
                      </g>
                    );
                  })}
                </g>

                {/* ===== 代谢物节点 ===== */}
                <g fontSize={12} fontWeight={700} textAnchor="middle">
                  {skel.nodes.filter((n) => n.kind === "metabolite").map((n) => {
                    const p = posOf(n.id);
                    const lb = nodeLabelPos[n.id];
                    const r = n.id === "accoa" || n.id === "acylcarn" ? 22 : 26;
                    return (
                      <g key={n.id} className={nodeClass(n)} data-node-id={n.id} style={{ cursor: "pointer" }}>
                        <circle cx={p.x} cy={p.y} r={r} fill={PAPER} stroke={INK} strokeWidth={1.2} />
                        <text className="q-hide" x={p.x} y={p.y + 4} fontSize={n.id === "acylcoa-short" || n.id === "hydroxy" ? 10 : 10.5}>
                          {nodeAbbr[n.id] ?? abbrOf(n.entityId ?? n.id)}
                        </text>
                        {lb && (
                          <text className="q-hide" x={p.x + lb.dx} y={p.y + lb.dy} fontSize={10} fontWeight={400} textAnchor={lb.anchor}>
                            {n.label}
                          </text>
                        )}
                      </g>
                    );
                  })}
                </g>

                {/* ===== 能量账：板上锚定 106 的推导（不只给结果数） ===== */}
                <g data-plate-ledger="1">
                  <rect x={62} y={438} width={470} height={166} fill="rgba(246,243,236,0.72)" stroke="rgba(34,40,42,0.5)" strokeWidth={0.8} />
                  <text x={78} y={458} fontSize={9.5} letterSpacing={1.4} fontWeight={700}>能量账 · ENERGY LEDGER（现代 P/O 口径）</text>
                  <line x1={78} y1={466} x2={516} y2={466} stroke="rgba(34,40,42,0.2)" strokeWidth={0.8} />
                  <text x={78} y={482} fontSize={8.5} opacity={0.65}>软脂酸 C16 · 7 轮 · 每轮 1 FADH₂ + 1 NADH + 1 乙酰-CoA</text>
                  <text x={78} y={504} fontSize={10}>8 乙酰-CoA × 10</text>
                  <text x={516} y={504} fontSize={10} textAnchor="end" className="num">80</text>
                  <text x={78} y={524} fontSize={10}>7 FADH₂ × 1.5</text>
                  <text x={516} y={524} fontSize={10} textAnchor="end" className="num">10.5</text>
                  <text x={78} y={544} fontSize={10}>7 NADH × 2.5</text>
                  <text x={516} y={544} fontSize={10} textAnchor="end" className="num">17.5</text>
                  <line x1={78} y1={554} x2={516} y2={554} stroke="rgba(34,40,42,0.2)" strokeWidth={0.8} />
                  <text x={78} y={576} fontSize={10}>毛收入 108 − 活化 2（ATP→AMP+PPi 两个高能键）</text>
                  <text x={516} y={578} fontSize={16} fontWeight={700} textAnchor="end" fill={AMBER} className="num">106 ATP</text>
                  <text x={78} y={594} fontSize={7.8} opacity={0.6}>旧口径 3 / 2 → 129 ATP：只并列，不参与加和。</text>
                </g>

                {/* ===== 链长标尺：C16 → C14 → … → C4 → 2×C2 ===== */}
                <g opacity={0.85} data-chain-ruler="1">
                  <text x={402} y={676} fontSize={9.5} letterSpacing={1.4} fontWeight={700} fill={INK}>链长标尺 · 每轮 −2C</text>
                  {rounds.map((r, i) => {
                    const x = 402 + i * 62;
                    return (
                      <g key={r.round}>
                        <circle cx={x} cy={696} r={10} fill={PAPER} stroke={INK} strokeWidth={1} />
                        <text x={x} y={700} fontSize={9.5} textAnchor="middle" className="num">{r.before}</text>
                        {i < rounds.length - 1 && (
                          <text x={x + 31} y={700} fontSize={9} textAnchor="middle" opacity={0.55}>−2</text>
                        )}
                      </g>
                    );
                  })}
                  <text x={402 + rounds.length * 62} y={700} fontSize={9.5} opacity={0.7}>→ 2×C₂（乙酰-CoA）</text>
                  <text x={402} y={722} fontSize={8.5} opacity={0.55}>
                    酰基链非示意线：C16 块 16 个碳、C14 块 14 个；第 4 步产物少 2 个碳。
                  </text>
                </g>

                {/* 边缘延伸 */}
                <g opacity={0.7}>
                  <text x={46} y={620} fontSize={9.5}>← 脂肪酸经血液 / 白蛋白入胞</text>
                  <text x={W - 46} y={620} fontSize={9.5} textAnchor="end">乙酰-CoA → TCA；还原当量 → 呼吸链</text>
                </g>
              </svg>
            </div>
          </div>

          {/* 脚注：空间说明 + 每轮账 + 回流弧语义 */}
          <div className="footnote">
            <div className="fn-head"><span className="t">空间读法 · SPATIAL NOTE</span></div>
            <p style={{ fontSize: 12, lineHeight: 1.9, margin: "0 0 18px" }}>{skel.spatialNote}</p>

            <div className="fn-head" style={{ display: "flex", justifyContent: "space-between" }}>
              <span className="t">表 1 · 七轮账本（链长 / 每轮产出）</span>
              <span className="view">每轮 1 FADH₂ + 1 NADH + 1 乙酰-CoA（末轮 2 个）</span>
            </div>
            <table className="organs" data-round-table="1">
              <thead>
                <tr>
                  <th style={{ width: 70 }}>轮次</th>
                  <th style={{ width: 130 }}>底物链长</th>
                  <th style={{ width: 130 }}>产物链长</th>
                  <th style={{ width: 90 }}>FADH₂</th>
                  <th style={{ width: 90 }}>NADH</th>
                  <th>乙酰-CoA</th>
                </tr>
              </thead>
              <tbody>
                {rounds.map((r) => (
                  <tr key={r.round}>
                    <td className="stepcell num">第 {r.round} 轮</td>
                    <td className="num">C{r.before}</td>
                    <td className="num">{r.round === p.rounds ? "2×C₂" : `C${r.after}`}</td>
                    <td className="num">1</td>
                    <td className="num">1</td>
                    <td className="num">{r.accoa}{r.round === p.rounds ? "（末轮硫解 ×2）" : ""}</td>
                  </tr>
                ))}
                <tr>
                  <td className="stepcell"><b>合计</b></td>
                  <td colSpan={2}>7 轮 · C16 → C4</td>
                  <td className="num"><b>{p.fadh2}</b></td>
                  <td className="num"><b>{p.nadh}</b></td>
                  <td className="num"><b>{p.acetylCoA}</b>（7 轮 + 末轮多 1 个）</td>
                </tr>
              </tbody>
            </table>

            <div className="fn-head" style={{ marginTop: 22 }}>
              <span className="t">表 2 · 回流弧不是第 5 步</span>
            </div>
            <div style={{ fontSize: 11.5, lineHeight: 1.85, borderLeft: `3px solid ${INK}`, paddingLeft: 12, opacity: 0.8 }} data-return-note="1">
              四步环只有 4 个 <code>g[data-step-id]</code>。从「缩短后的酰基-CoA」回到第 1 步的那条弧是<b>回流弧</b>：线宽 0.9、透明度 0.55、虚线，并标「第 5 轮 · 回到第 1 步（链已 −2C）」。
              它是<b>下一轮</b>的入口，不是第 5 步反应；TCA 与 PPP 都踩过「回流带被读成多一步」的坑，这里在图上和图例中都锁死。
            </div>
          </div>
        </div>

        {/* ===== 右栏 ===== */}
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
                    {selected.kind === "cycle" ? roman(selected.index) : selected.kind === "prep" ? "前" : "运"}
                  </span>
                  {selected.name}
                  {selected.irreversible && <span className="d-tag">不可逆</span>}
                  {selected.kind === "transport" && <span className="d-tag amber">跨膜转运</span>}
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
                {selected.stereochemistry?.length ? (
                  <div className="d-cof d-stereo"><b>立体化学</b>　{selected.stereochemistry.join("；")}</div>
                ) : null}
                <div className="d-sig">{selected.significance}</div>

                {grade && (
                  <div className="d-cof" data-testid="fao-grade" data-grade={grade.grade ?? (grade.calc ? "calc" : "none")}>
                    <b>证据等级</b>　
                    {grade.grade ? GRADE_LABEL[grade.grade] : grade.calc ? "计算构象（无实验坐标）" : grade.only2d ? "仅 2D" : "未分级"}
                    {grade.sidesDiffer && (
                      <span style={{ opacity: 0.6 }}>（两侧实验证据不一致，按最差侧计）</span>
                    )}
                  </div>
                )}

                <Link
                  className="frames-entry"
                  data-testid="fao-structure-cmp-entry"
                  data-cmp-step={selected.id}
                  to={`/structures/fatty-acid-oxidation#${selected.id}`}
                >
                  看这一步的结构对照 →
                </Link>
                <MoleculeArchiveEntry
                  pathwayId="fatty-acid-oxidation"
                  stepId={selected.id}
                  testId="fao-molecule-archive-entry"
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
                    <>本步无 {organName} 差异——数据层对本步只登记了 {selected.organDiffs.map((d) => d.organ === "red-blood-cell" ? "红细胞" : (data.organs.find((o) => o.id === d.organ)?.name ?? d.organ)).join("、")}。</>
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
                  辅因子、证据等级与结构对照入口。四步环之外，活化（ACSL）与肉碱穿梭（CPT1/CACT/CPT2）也可点击。
                  右侧「能量账本」把 106 的推导拆到每轮与每币种，避免只看到一个结果数。
                </div>
              </div>
            )}
          </div>

          {/* ===== 能量账本：推导，不只是结果 ===== */}
          <div className="panel-block" data-ledger-derivation="1">
            <div className="pb-title">
              <span>能量账本 · 推导</span>
              <span className="en">ENERGY LEDGER · 1 棕榈酸（C16）</span>
            </div>
            <div className="settle">
              <div>
                <div className="s-lbl">每轮</div>
                <div className="s-val t num">{perRoundAtp.toFixed(1)} ATP</div>
                <div className="s-sub num">1 FADH₂ ×1.5 + 1 NADH ×2.5 + 1 乙酰-CoA ×10</div>
              </div>
              <div>
                <div className="s-lbl">7 轮 FADH₂</div>
                <div className="s-val t num">{derived.fadh2Atp.toFixed(1)}</div>
                <div className="s-sub num">7 × 1.5</div>
              </div>
              <div>
                <div className="s-lbl">7 轮 NADH</div>
                <div className="s-val t num">{derived.nadhAtp.toFixed(1)}</div>
                <div className="s-sub num">7 × 2.5</div>
              </div>
              <div>
                <div className="s-lbl">8 乙酰-CoA → TCA</div>
                <div className="s-val a num">{derived.accoaAtp}</div>
                <div className="s-sub num">8 × 10</div>
              </div>
              <div className="settle-rule" />
              <div className="settle-net" data-net-atp="106">
                <span className="n-lbl">净 ATP</span>
                <span className="n-val num">{derived.net}</span>
              </div>
            </div>
            <div style={{ fontSize: 11, lineHeight: 1.9, marginTop: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", borderTop: `1px solid ${INK}`, paddingTop: 6 }}>
                <span>毛收入</span><span className="num">{derived.gross} ATP</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span>活化代价（ATP→AMP+PPi，2 个高能键）</span><span className="num" style={{ color: BRICK }}>−{ledger.totals.activationCost}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", borderTop: `1px solid ${INK}`, marginTop: 4, paddingTop: 4, fontWeight: 700 }}>
                <span>净产出</span><span className="num">{derived.gross} − {ledger.totals.activationCost} = {derived.net} ATP</span>
              </div>
            </div>
            <div className="d-none" style={{ borderTop: "none", paddingTop: 6 }}>
              口径：{ledger.poBasis.source}。旧口径（{ledger.poBasis.legacy.nadh}/{ledger.poBasis.legacy.fadh2}，净 {ledger.poBasis.legacy.netAtp}）仅作对照并列，不参与任何加和。{ledger.perRound.note}
            </div>
            <div style={{ fontSize: 10.5, opacity: 0.6, marginTop: 8, lineHeight: 1.7 }} data-legacy-note="1">
              旧教材 3/2 口径：7×2 + 7×3 + 8×12 − 2 = <span className="num">{ledger.poBasis.legacy.netAtp}</span> ATP。
              与 106 并列展示，但两套数字不混用、不加和。
            </div>
          </div>

          {/* ===== 链长与回流语义 ===== */}
          <div className="panel-block">
            <div className="pb-title">
              <span>链长 & 回流弧</span>
              <span className="en">CHAIN LENGTH · NOT A 5TH STEP</span>
            </div>
            <div style={{ fontSize: 11.5, lineHeight: 1.9 }}>
              <p style={{ margin: "0 0 8px" }}>
                分块后链长不是靠「一个 S 原子」猜：每块保留酰基链 C1–C<sub>n</sub>，C16 块 16 个酰基碳、C14 块 14 个；
                图下方链长标尺与表 1 同步给出 C16 → C14 → … → C4 → 2×C2。
              </p>
              <p style={{ margin: "0 0 8px" }}>
                回流弧从「缩短后的酰基-CoA」回到第 1 步：线宽 0.9 / 透明度 0.55 / 虚线，且标「第 5 轮」。
                它不在 <code>g[data-step-id]</code> 的 4 个循环步里；图上只有 4 个循环步。
              </p>
              <p style={{ margin: 0, opacity: 0.7 }}>
                出环弧从 3-酮脂酰-CoA 指向乙酰-CoA，再以虚线接到「TCA 接口」投影节点——不重复画 TCA 本体，只用 ×10 ATP 的口径做接口。
              </p>
            </div>
          </div>
        </aside>
      </div>

      <PathwayRailFoot current="fatty-acid-oxidation" />
      <div className="poster-foot">
        <span>说明：ΔG 数值不作页面展示，仅保留 Lehninger Ch.17 定性结论；能量账见右侧 ATP/NADPH 化学计量。<br /></span>
        <span>已接入：分子 2D / 3D 资产已建（8 个新建 + 乙酰-CoA 共享），逐块对照见 <code>/structures/fatty-acid-oxidation</code>；酶 3D 已建 5 步（fao-act + fao-1–fao-4），fao-shuttle 因人源 CPT1/CPT2 无实验结构，本页不提供其 3D，不伪造结构。<br /></span>
        <span>说明：HADH/SCHAD 缺乏表型、ACSL 缺陷、LCHAD-HELLP 细节、硫解酶缺乏 OMIM、心肌脂肪酸供能占比按教材口径定性描述，页面不写具体数值。<br /></span>
        <span>数据冲突（已修正）：数据层 skeleton.json 与 fao.json 原先把硫解断键写成「C3–C4」，化学正确的是 C2–C3（乙酰-CoA 带走 C1–C2）；本轮已在数据层改正，并在报告中列明。</span>
      </div>
    </div>
  );
}
