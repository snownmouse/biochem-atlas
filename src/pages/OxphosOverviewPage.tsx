// ============================================================
// PLATE 06 / 12 —— 氧化磷酸化挂图
//
// 构图核心是一条横向内膜带：
//   · 复合体 I / II / III / IV 与 ATP 合酶 F0 嵌在带上
//   · Q 池在带内，cyt c 在膜间腔一侧游走
//   · 电子流（实线墨色）与质子流（青色虚线）是两套线型，图例里锁死
//   · 基质侧 NADH / FADH₂ 进入，ATP 在基质侧产出
//
// 3D 只放在真正可溶、体量可控的 cyt c 与 F1 头部；
// 膜复合体一律明确写「膜蛋白，本页不做 3D」，不给计算构象冒充。
// ============================================================
import { useCallback, useMemo, useRef } from "react";
import type { MouseEvent as ReactMouseEvent } from "react";
import { Link, useSearchParams } from "react-router-dom";
import dataJson from "../data/oxphos/oxphos.json";
import skeletonJson from "../data/oxphos/skeleton.json";
import type { OxphosData, OxphosModule, OxphosSkeleton } from "../data/oxphos/types";
import { GRADE_LABEL, gradeOfPart } from "../data/evidenceGrade";
import SolubleDomain3D from "../components/SolubleDomain3D";

const DATA = dataJson as unknown as OxphosData;
const SKEL = skeletonJson as unknown as OxphosSkeleton;

const W = SKEL.canvas.width;
const H = SKEL.canvas.height;
const INK = "#22282A";
const AMBER = "#B4761F";
const TEAL = "#2E6E6B";
const BRICK = "#9C4A3C";

const MODULE_BY_ID = new Map(DATA.modules.map((module) => [module.id, module]));
const ENTITY_BY_ID = new Map(DATA.entities.map((entity) => [entity.id, entity]));
const NODE_BY_ID = new Map(SKEL.nodes.map((node) => [node.id, node]));

const NODE_MODULE: Record<string, string> = {
  nadh: "complex-i",
  fadh2: "complex-ii",
  q: "q-pool",
  qh2: "q-pool",
  cytc: "cytochrome-c",
  o2: "complex-iv",
  h2o: "complex-iv",
  adp: "atp-synthase",
  pi: "atp-synthase",
  atp: "atp-synthase",
};

const MODULE_SHORT: Record<string, string> = {
  "complex-i": "NADH 脱氢酶",
  "complex-ii": "琥珀酸脱氢酶",
  "q-pool": "Q / QH₂ 池",
  "complex-iii": "细胞色素 bc₁",
  "cytochrome-c": "可溶电子载体",
  "complex-iv": "细胞色素 c 氧化酶",
  "atp-synthase": "F₀F₁ 合酶",
};

const not3d = (module: OxphosModule) => module.threeD.status === "not-built";

function entityName(id: string): string {
  return ENTITY_BY_ID.get(id)?.abbr ?? id;
}

function nodeCenter(id: string): { x: number; y: number } {
  const node = NODE_BY_ID.get(id);
  return node ? { x: node.x, y: node.y } : { x: 0, y: 0 };
}

/** 虚线 / 实线的线型是唯一区分手段，色盲用户靠线型与箭头形状也能读。 */
function FlowLegend() {
  return (
    <g fontFamily="inherit" fontSize={10.5} fill={INK}>
      <g data-legend="electron">
        <line x1={1295} y1={72} x2={1350} y2={72} stroke={INK} strokeWidth={2.2} markerEnd="url(#ox-e-arrow)" />
        <text x={1360} y={76}>电子流 e⁻ · 实线</text>
      </g>
      <g data-legend="proton">
        <line x1={1295} y1={96} x2={1350} y2={96} stroke={TEAL} strokeWidth={1.7} strokeDasharray="7 5" markerEnd="url(#ox-h-arrow)" />
        <text x={1360} y={100}>质子流 H⁺ · 虚线（开放式箭头）</text>
      </g>
      <text x={1295} y={122} fontSize={9.5} opacity={0.6}>
        两套线型不混用；实心箭头 = e⁻，开放式箭头 = H⁺
      </text>
    </g>
  );
}

export default function OxphosOverviewPage() {
  const [params, setParams] = useSearchParams();
  const moduleParam = params.get("module");
  const selected = (moduleParam && MODULE_BY_ID.get(moduleParam)) || DATA.modules[0];
  const quizOn = params.get("quiz") === "1";

  const plateRef = useRef<SVGSVGElement>(null);

  const selectModule = useCallback(
    (id: string | null) => {
      setParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          if (id) next.set("module", id);
          else next.delete("module");
          return next;
        },
        { replace: true },
      );
    },
    [setParams],
  );

  const toggleQuiz = useCallback(() => {
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (prev.get("quiz") === "1") next.delete("quiz");
        else next.set("quiz", "1");
        return next;
      },
      { replace: true },
    );
    plateRef.current?.querySelectorAll(".q-hide.revealed").forEach((el) => el.classList.remove("revealed"));
  }, [setParams]);

  /* 点击语义：先判 .q-hide（自测揭晓），再分别 closest [data-module-id] / [data-node-id]。 */
  const onPlateClick = useCallback(
    (event: ReactMouseEvent<SVGSVGElement>) => {
      const target = event.target as Element;
      if (quizOn) {
        const hidden = target.closest(".q-hide");
        if (hidden) {
          hidden.classList.toggle("revealed");
          return;
        }
      }
      const moduleId = target.closest("[data-module-id]")?.getAttribute("data-module-id");
      if (moduleId) {
        selectModule(moduleId);
        return;
      }
      const nodeId = target.closest("[data-node-id]")?.getAttribute("data-node-id");
      if (nodeId) {
        const mapped = NODE_MODULE[nodeId];
        if (mapped) selectModule(mapped);
      }
    },
    [quizOn, selectModule],
  );

  const grade = useMemo(
    () =>
      gradeOfPart({
        molId: selected.id,
        coordSource: selected.evidence.coordSource,
        pocketRole: selected.evidence.pocketRole,
        species: selected.evidence.species,
      }),
    [selected],
  );

  const selectedPumpText =
    selected.protonsPumpedPer2e === null
      ? "不泵质子（载体 / 池 / 合酶）"
      : selected.protonsPumpedPer2e === 0
        ? "0 H⁺（不泵质子）"
        : `${selected.protonsPumpedPer2e} H⁺ / 2 e⁻`;

  const no3dModules = DATA.modules.filter(not3d);

  // 膜间腔一侧用密集刻度表示质子堆积，基质一侧明显稀疏，梯度方向一眼可读。
  const gradientTop = Array.from({ length: 42 }, (_, index) => 150 + index * 40);
  const gradientBottom = Array.from({ length: 16 }, (_, index) => 300 + index * 100);

  return (
    <div className="poster poster-oxphos">
      <nav className="crumb" style={{ margin: "14px 28px 0" }}>
        <Link to="/">首页</Link>
        {" ／ "}
        <Link to="/pathway/glycolysis">糖酵解</Link>
        {" ／ "}
        <Link to="/pathway/tca">三羧酸循环</Link>
        {" ／ "}
        <Link to="/pathway/gluconeogenesis">糖异生</Link>
        {" ／ "}
        <Link to="/pathway/ppp">磷酸戊糖途径</Link>
        {" ／ "}
        <Link to="/pathway/fatty-acid-oxidation">β-氧化</Link>
        {" ／ "}
        <b>氧化磷酸化</b>
        {selected && (
          <>
            {" ／ "}
            模块 {selected.order} · {MODULE_SHORT[selected.id] ?? selected.name}
          </>
        )}
      </nav>

      <header className="masthead">
        <div className="mast-top">
          <span className="kicker">代谢通路挂图 · METABOLIC WALL CHART</span>
          <span className="plate-no num">{DATA.plateNo} · 第一版 · 2026</span>
        </div>
        <div className="mast-main">
          <h1>
            {DATA.name}
            <small>OXIDATIVE PHOSPHORYLATION — 一条内膜带 · 两套流向 · 10 / 6 H⁺ 换 2.5 / 1.5 ATP</small>
          </h1>
          <p className="mast-summary">{DATA.summary}</p>
        </div>
      </header>

      <div className="legend">
        <span className="lg">
          <svg width="46" height="10" aria-hidden>
            <line x1="0" y1="5" x2="36" y2="5" stroke={INK} strokeWidth="2.2" />
            <path d="M36,1 L46,5 L36,9 Z" fill={INK} />
          </svg>
          电子流 · 实线实心箭头
        </span>
        <span className="lg">
          <svg width="46" height="10" aria-hidden>
            <line x1="0" y1="5" x2="38" y2="5" stroke={TEAL} strokeWidth="1.7" strokeDasharray="7 4" />
            <path d="M38,1 L46,5 L38,9" fill="none" stroke={TEAL} strokeWidth="1.4" />
          </svg>
          质子流 · 青色虚线 + 开放式箭头
        </span>
        <span className="lg">
          <span style={{ color: TEAL, fontWeight: 700 }}>青</span>＝质子 / 梯度
          <span style={{ margin: "0 6px", color: AMBER, fontWeight: 700 }}>琥珀</span>＝ATP
          <span style={{ margin: "0 6px", color: BRICK, fontWeight: 700 }}>砖红</span>＝「膜蛋白不做 3D」标记
        </span>
        {quizOn && <span className="lg quiz-hint">自测中 · 模块名与节点名已隐藏 · 点击揭晓</span>}
        <span className="lg legend-hint">画布宽于视口 · 内膜带横贯全幅 · Shift+滚轮横向漫游</span>
      </div>

      <div className="body-grid">
        <div className="plate-wrap">
          <div className="plate-head">
            <span className="t">图 1 · 呼吸链嵌在内膜带：电子从 NADH / FADH₂ 流向 O₂，质子另走一条回路</span>
            <span className="organ-switch" role="tablist" aria-label="模块视图">
              <button
                type="button"
                aria-pressed={quizOn}
                className={`organ-tab quiz-toggle${quizOn ? " active" : ""}`}
                onClick={toggleQuiz}
                title="隐藏模块名与节点名，点击揭晓"
                data-oxphos-quiz="1"
              >
                自测
              </button>
            </span>
          </div>

          <div className="plate-scroll">
            <div className="plate-canvas">
              <svg
                ref={plateRef}
                className={quizOn ? "quiz-on" : undefined}
                width={W}
                height={H}
                viewBox={`0 0 ${W} ${H}`}
                onClick={onPlateClick}
                data-oxphos-plate="1"
                data-membrane-band="inner-membrane"
                data-module-count={DATA.modules.length}
                data-complex-count={4}
              >
                <defs>
                  <marker id="ox-e-arrow" markerWidth="9" markerHeight="8" refX="8" refY="4" orient="auto">
                    <path d="M0,0.5 L8.5,4 L0,7.5 Z" fill={INK} />
                  </marker>
                  <marker id="ox-e-arrow-soft" markerWidth="9" markerHeight="8" refX="8" refY="4" orient="auto">
                    <path d="M0,0.5 L8.5,4 L0,7.5 Z" fill={INK} opacity={0.55} />
                  </marker>
                  <marker id="ox-h-arrow" markerWidth="9" markerHeight="8" refX="8" refY="4" orient="auto">
                    <path d="M0,0.5 L8.5,4 L0,7.5" fill="none" stroke={TEAL} strokeWidth="1.6" />
                  </marker>
                </defs>

                {/* 角落锚点 */}
                <g stroke={INK} strokeWidth={1} opacity={0.4}>
                  <path d="M20,12 V28 M12,20 H28" />
                  <path d={`M${W - 20},12 V28 M${W - 28},20 H${W - 12}`} />
                  <path d={`M20,${H - 28} V${H - 12} M12,${H - 20} H28`} />
                  <path d={`M${W - 20},${H - 28} V${H - 12} M${W - 28},${H - 20} H${W - 12}`} />
                </g>

                {/* ===== 三层区带 ===== */}
                <g>
                  <rect x={40} y={60} width={W - 80} height={180} fill={INK} opacity={0.018} />
                  <rect x={40} y={240} width={W - 80} height={190} fill={INK} opacity={0.085} />
                  <line x1={40} y1={240} x2={W - 40} y2={240} stroke={INK} strokeWidth={1.6} />
                  <line x1={40} y1={430} x2={W - 40} y2={430} stroke={INK} strokeWidth={1.6} />
                  <line x1={40} y1={335} x2={W - 40} y2={335} stroke={INK} strokeWidth={0.8} strokeDasharray="2 6" opacity={0.35} />
                  <rect x={40} y={430} width={W - 80} height={410} fill={INK} opacity={0.012} />
                  <line x1={40} y1={840} x2={W - 40} y2={840} stroke={INK} strokeWidth={1} opacity={0.5} />
                </g>
                <g fontSize={11} letterSpacing={3.2} fontWeight={700} fill={INK}>
                  <text x={52} y={92}>膜间腔 · INTERMEMBRANE SPACE</text>
                  <text x={52} y={232} fontSize={9.5} letterSpacing={1.8} fontWeight={700}>内膜 · INNER MEMBRANE</text>
                  <text x={52} y={462}>线粒体基质 · MITOCHONDRIAL MATRIX</text>
                </g>

                {/* 质子梯度：膜间腔密集、基质稀疏 */}
                <g data-flow="proton-gradient" stroke={TEAL} opacity={0.4} strokeWidth={1.2} strokeDasharray="2 4">
                  {gradientTop.map((x, index) => (
                    <line key={`top-${x}`} x1={x} y1={index % 2 === 0 ? 164 : 150} x2={x} y2={index % 2 === 0 ? 208 : 204} />
                  ))}
                  {gradientBottom.map((x) => (
                    <line key={`bottom-${x}`} x1={x} y1={486} x2={x} y2={512} opacity={0.5} />
                  ))}
                </g>
                <text x={W - 52} y={146} fontSize={10.5} textAnchor="end" fill={TEAL} letterSpacing={1.4} data-stoich="proton-side">
                  H⁺ 高 · + 侧（质子积累）
                </text>
                <text x={52} y={482} fontSize={9.5} fill={TEAL} letterSpacing={1.4} opacity={0.75}>
                  H⁺ 低 · − 侧（基质）
                </text>

                <FlowLegend />

                {/* ===== 模块：复合体 I ===== */}
                <g data-module-id="complex-i" data-belt="inner-membrane" data-center="250,340">
                  <rect x={155} y={285} width={215} height={120} fill={INK} opacity={0.05} stroke={selected.id === "complex-i" ? BRICK : INK} strokeWidth={selected.id === "complex-i" ? 2 : 1.2} />
                  <rect x={175} y={405} width={85} height={92} fill={INK} opacity={0.05} stroke={INK} strokeWidth={1.2} />
                  <line x1={155} y1={315} x2={370} y2={315} stroke={INK} strokeWidth={0.7} opacity={0.35} />
                  <text x={262} y={330} textAnchor="middle" fontSize={12} fontWeight={700} fill={INK} className="q-hide">复合体 I</text>
                  <text x={262} y={347} textAnchor="middle" fontSize={9} fill={INK} opacity={0.65} className="q-hide">NADH 脱氢酶 · 45 亚基</text>
                  <text x={262} y={472} textAnchor="middle" fontSize={9} fill={INK} opacity={0.6}>FMN · Fe-S · Q 位点</text>
                  <text x={262} y={492} textAnchor="middle" fontSize={9} fill={BRICK} data-no3d="complex-i">膜蛋白 · 本页不做 3D</text>
                </g>

                {/* ===== 模块：复合体 II ===== */}
                <g data-module-id="complex-ii" data-belt="inner-membrane" data-center="600,340">
                  <rect x={545} y={305} width={135} height={105} fill={INK} opacity={0.05} stroke={selected.id === "complex-ii" ? BRICK : INK} strokeWidth={selected.id === "complex-ii" ? 2 : 1.2} />
                  <text x={612} y={333} textAnchor="middle" fontSize={12} fontWeight={700} fill={INK} className="q-hide">复合体 II</text>
                  <text x={612} y={350} textAnchor="middle" fontSize={9} fill={INK} opacity={0.65} className="q-hide">SDH · 4 亚基</text>
                  <text x={612} y={368} textAnchor="middle" fontSize={9} fill={INK} opacity={0.6}>FAD · Fe-S</text>
                  <text x={612} y={438} textAnchor="middle" fontSize={9} fill={BRICK} data-no3d="complex-ii">膜蛋白 · 本页不做 3D</text>
                  <text x={612} y={455} textAnchor="middle" fontSize={9} fill={TEAL} data-shared-tca="1">= TCA 第 6 步（同一酶）</text>
                </g>

                {/* ===== 模块：Q 池 ===== */}
                <g data-module-id="q-pool" data-belt="inner-membrane" data-center="985,360">
                  <path d={`M868,300 V420 M1090,300 V420`} stroke={INK} strokeWidth={1} strokeDasharray="3 4" opacity={0.5} />
                  <text x={979} y={292} textAnchor="middle" fontSize={11} fontWeight={700} fill={INK} className="q-hide">Q 池 · 2 e⁻ 载体</text>
                  {(["q", "qh2"] as const).map((id) => {
                    const node = nodeCenter(id);
                    return (
                      <g key={id} data-node-id={id}>
                        <circle cx={node.x} cy={node.y} r={13} fill={INK} opacity={selected.id === "q-pool" ? 0.16 : 0.08} stroke={INK} strokeWidth={1} />
                        <text x={node.x} y={node.y + 4} textAnchor="middle" fontSize={11} fontWeight={700} fill={INK} className="q-hide">{entityName(id)}</text>
                        <text x={node.x} y={node.y + 28} textAnchor="middle" fontSize={8.5} fill={INK} opacity={0.55}>泛醌池</text>
                      </g>
                    );
                  })}
                </g>

                {/* ===== 模块：复合体 III ===== */}
                <g data-module-id="complex-iii" data-belt="inner-membrane" data-center="1120,340">
                  <rect x={1070} y={285} width={145} height={145} fill={INK} opacity={0.05} stroke={selected.id === "complex-iii" ? BRICK : INK} strokeWidth={selected.id === "complex-iii" ? 2 : 1.2} />
                  <text x={1142} y={333} textAnchor="middle" fontSize={12} fontWeight={700} fill={INK} className="q-hide">复合体 III</text>
                  <text x={1142} y={350} textAnchor="middle" fontSize={9} fill={INK} opacity={0.65} className="q-hide">细胞色素 bc₁ · 11 亚基</text>
                  <text x={1142} y={370} textAnchor="middle" fontSize={9} fill={INK} opacity={0.6}>Q 循环 · cyt b / c₁</text>
                  <text x={1142} y={450} textAnchor="middle" fontSize={9} fill={BRICK} data-no3d="complex-iii">膜蛋白 · 本页不做 3D</text>
                </g>

                {/* ===== 模块：细胞色素 c（可溶，3D） ===== */}
                <g data-module-id="cytochrome-c" data-center="1350,190">
                  <circle cx={1350} cy={190} r={18} fill={INK} opacity={selected.id === "cytochrome-c" ? 0.14 : 0.06} stroke={selected.id === "cytochrome-c" ? BRICK : INK} strokeWidth={selected.id === "cytochrome-c" ? 2 : 1.2} />
                  <text x={1350} y={194} textAnchor="middle" fontSize={11} fontWeight={700} fill={INK} className="q-hide">cyt c</text>
                  <text x={1350} y={228} textAnchor="middle" fontSize={9} fill={INK} opacity={0.65} className="q-hide">1 e⁻ · Fe²⁺ ⇄ Fe³⁺</text>
                  <text x={1350} y={157} textAnchor="middle" fontSize={9} fill={TEAL} data-3d-tag="cytc">可溶 · 3D ↓</text>
                </g>

                {/* ===== 模块：复合体 IV ===== */}
                <g data-module-id="complex-iv" data-belt="inner-membrane" data-center="1500,340">
                  <rect x={1445} y={300} width={140} height={120} fill={INK} opacity={0.05} stroke={selected.id === "complex-iv" ? BRICK : INK} strokeWidth={selected.id === "complex-iv" ? 2 : 1.2} />
                  <text x={1515} y={333} textAnchor="middle" fontSize={12} fontWeight={700} fill={INK} className="q-hide">复合体 IV</text>
                  <text x={1515} y={350} textAnchor="middle" fontSize={9} fill={INK} opacity={0.65} className="q-hide">cyt c 氧化酶 · 13 亚基</text>
                  <text x={1515} y={370} textAnchor="middle" fontSize={9} fill={INK} opacity={0.6}>CuA · heme a / a₃</text>
                  <text x={1515} y={438} textAnchor="middle" fontSize={9} fill={BRICK} data-no3d="complex-iv">膜蛋白 · 本页不做 3D</text>
                </g>

                {/* ===== 模块：ATP 合酶 ===== */}
                <g data-module-id="atp-synthase" data-belt="inner-membrane" data-center="1790,340">
                  <rect x={1745} y={285} width={115} height={145} fill={INK} opacity={0.05} stroke={selected.id === "atp-synthase" ? BRICK : INK} strokeWidth={selected.id === "atp-synthase" ? 2 : 1.2} />
                  <text x={1802} y={330} textAnchor="middle" fontSize={12} fontWeight={700} fill={INK} className="q-hide">ATP 合酶</text>
                  <text x={1802} y={347} textAnchor="middle" fontSize={9} fill={INK} opacity={0.65} className="q-hide">F₀ · c8 环</text>
                  <text x={1802} y={450} textAnchor="middle" fontSize={9} fill={BRICK} data-no3d="atp-synthase">F₀ 膜蛋白 · 不做 3D</text>
                  <rect x={1790} y={430} width={24} height={46} fill={INK} opacity={0.08} />
                  <circle cx={1802} cy={512} r={50} fill={INK} opacity={selected.id === "atp-synthase" ? 0.14 : 0.06} stroke={selected.id === "atp-synthase" ? BRICK : INK} strokeWidth={selected.id === "atp-synthase" ? 2 : 1.2} />
                  <text x={1802} y={506} textAnchor="middle" fontSize={13} fontWeight={700} fill={INK} className="q-hide">F₁</text>
                  <text x={1802} y={524} textAnchor="middle" fontSize={9} fill={INK} opacity={0.65} className="q-hide">3 ATP / 圈</text>
                  <text x={1802} y={584} textAnchor="middle" fontSize={9} fill={TEAL} data-3d-tag="f1">F₁ 头部可溶 · 3D ↓</text>
                </g>

                {/* ===== 电子流：实线主链 ===== */}
                <g data-flow="electron" stroke={INK} fill="none" strokeWidth={2.1} markerEnd="url(#ox-e-arrow)">
                  <path d="M130,688 C140,600 165,560 190,505" />
                  {/* I → Q 从复合体 II 上方绕行，避免让读者误读成「I 穿过 II」 */}
                  <path d="M370,345 C480,290 780,290 900,350" />
                  <path d="M560,778 C600,620 640,500 650,405" />
                  <path d="M680,345 C760,340 840,350 900,355" />
                  <path d="M1052,360 H1064" />
                  <path d="M1215,330 C1265,275 1305,235 1332,210" />
                  <path d="M1368,210 C1405,240 1428,275 1443,300" />
                  <path d="M1585,400 C1640,520 1730,690 1840,778" />
                  <path d="M1650,748 C1615,650 1600,560 1590,418" />
                  <path d="M1755,680 C1765,610 1780,570 1795,550" />
                  <path d="M1858,510 C1885,540 1890,580 1896,608" />
                </g>
                <g fontSize={9.5} fill={INK} fontWeight={700} opacity={0.8}>
                  <text x={196} y={620}>2 e⁻</text>
                  <text x={610} y={330}>2 e⁻</text>
                  <text x={752} y={330}>2 e⁻</text>
                  <text x={1288} y={258}>1 e⁻</text>
                  <text x={1298} y={296} fontSize={8.5} opacity={0.7}>cyt c 往返</text>
                  <text x={1490} y={282} fontSize={9}>4 e⁻ + O₂</text>
                  <text x={1616} y={720}>O₂</text>
                  <text x={1878} y={754} fontSize={9.5}>H₂O</text>
                </g>

                {/* ===== 质子流：青色虚线回路（与电子流严格分开） ===== */}
                <g data-flow="proton" stroke={TEAL} fill="none" strokeWidth={1.7} strokeDasharray="7 5" markerEnd="url(#ox-h-arrow)">
                  <path d="M160,540 V230" />
                  <path d="M1074,540 V230" />
                  <path d="M1449,540 V230" />
                  <path d="M700,480 V424" />
                  <path d="M1875,200 V610" />
                </g>
                <g fontSize={9.5} fill={TEAL} fontWeight={700}>
                  <text x={168} y={218}>4 H⁺</text>
                  <text x={1082} y={218}>4 H⁺</text>
                  <text x={1457} y={218}>2 H⁺</text>
                  <text x={712} y={470} fontSize={9}>0 H⁺ · 不泵质子</text>
                  <text x={1862} y={268} fontSize={9} textAnchor="end">回流 3.67 H⁺ / ATP</text>
                </g>
                <g stroke={BRICK} strokeWidth={1.6} fill="none">
                  <path d="M692,446 L708,462 M708,446 L692,462" />
                </g>

                {/* ===== 化学计量：必须能在图上直接读出 ===== */}
                <g data-stoich="ledger">
                  <text x={700} y={586} fontSize={11} fontWeight={700} letterSpacing={1.4} fill={INK}>化学计量 · STOICHIOMETRY</text>
                  <text x={700} y={610} fontSize={11} fill={INK} data-stoich="nadh">NADH：4（I）+ 4（III）+ 2（IV）= 10 H⁺ → 2.5 ATP</text>
                  <text x={700} y={630} fontSize={11} fill={INK} data-stoich="fadh2">FADH₂：0（II）+ 4（III）+ 2（IV）= 6 H⁺ → 1.5 ATP</text>
                  <text x={700} y={652} fontSize={11} fill={INK} data-stoich="oxygen">4 e⁻ + O₂ + 8 H⁺(基质) → 2 H₂O + 4 H⁺(膜间腔)</text>
                  <text x={700} y={672} fontSize={9.5} fill={INK} opacity={0.65}>2 e⁻ 还原的是半个 O₂（½ O₂ → 1 H₂O），不是整个 O₂。</text>
                  <text x={1190} y={608} fontSize={22} fontWeight={700} fontFamily="Georgia, serif" fill={AMBER} data-stoich="po">P/O 2.5 / 1.5</text>
                  <text x={1190} y={632} fontSize={9.5} fill={INK} opacity={0.7}>10/3.67 ≈ 2.72 → 2.5；6/3.67 ≈ 1.63 → 1.5</text>
                  <text x={1190} y={652} fontSize={9.5} fill={INK} opacity={0.55}>旧口径 3 / 2 仅并列脚注，不参与任何加和。</text>
                </g>

                {/* ===== 代谢物节点（NADH / FADH₂ / O₂ / H₂O / ADP / Pi / ATP） ===== */}
                {(["nadh", "fadh2", "o2", "h2o", "adp", "pi", "atp"] as const).map((id) => {
                  const node = nodeCenter(id);
                  return (
                    <g key={id} data-node-id={id}>
                      <circle cx={node.x} cy={node.y} r={15} fill={INK} opacity={0.06} stroke={INK} strokeWidth={1} />
                      <text x={node.x} y={node.y + 4} textAnchor="middle" fontSize={11} fontWeight={700} fill={INK} className="q-hide">{entityName(id)}</text>
                      <text x={node.x} y={node.y + 31} textAnchor="middle" fontSize={8.5} fill={INK} opacity={0.6} className="q-hide">{id === "nadh" ? "来自 TCA / β-氧化" : id === "fadh2" ? "来自 TCA / β-氧化" : id === "o2" ? "末端受体" : id === "h2o" ? "每 O₂ 产 2 分子" : id === "adp" ? "进入 F₁" : id === "pi" ? "磷酸载体" : "ANT 运出"}</text>
                    </g>
                  );
                })}

                {/* 极度取样点 + 图例锁死说明 */}
                <g fontSize={9} fill={INK} opacity={0.55}>
                  <text x={70} y={822}>每一处泵出质子都标在对应复合体旁；复合体 II 的「0 H⁺ · 不泵质子」是本页与 NADH 路径的唯一化学计量差。</text>
                  <text x={70} y={840}>线型锁死：实线实心箭头只用于电子，青色虚线开放式箭头只用于质子；两套线不共用颜色/箭头。</text>
                </g>
              </svg>
            </div>
          </div>

        </div>

        {/* ===== 右栏 ===== */}
        <aside>
          <div className="panel-block">
            <div className="pb-title">
              <span>模块详情</span>
              <span className="en">DETAIL · 点击带上模块 / 节点</span>
            </div>

            <div className="d-body">
              <div className="d-step">
                <span className="no serif num">{selected.order}</span>
                {selected.name}
                {selected.location === "span" && <span className="d-tag">跨膜</span>}
                {selected.location === "soluble" && <span className="d-tag amber">可溶</span>}
              </div>
              <div className="d-enzyme">{selected.en}</div>
              <div className="d-eq">{selected.equation}</div>
              <div className="d-cof">
                <b>电子</b>　{selected.electronIn} → {selected.electronOut}
                <span style={{ opacity: 0.55 }}>（{selected.electrons} e⁻）</span>
              </div>
              <div className="d-cof" data-testid="oxphos-protons">
                <b>质子</b>　{selectedPumpText}
              </div>
              <div className="d-cof">
                <b>基质消耗</b>　{selected.protonsConsumedPer2e === null ? "—" : `${selected.protonsConsumedPer2e} H⁺ / 2 e⁻`}
              </div>
              <div className="d-cof">
                <b>亚基 / 体量</b>　{selected.subunits ?? "—"}　·　{selected.massKda ? `≈ ${selected.massKda} kDa` : "小分子池"}
              </div>
              <div className="d-cof">
                <b>P/O 贡献</b>　{selected.poContribution}
              </div>
              <div className="d-sig">{selected.significance}</div>
              <p className="d-detail" style={{ fontSize: 11.5, lineHeight: 1.8, opacity: 0.78 }}>{selected.detail}</p>

              <div className="d-cof" data-testid="oxphos-grade" data-grade={grade.grade ?? (grade.coverage === "2d" ? "2d" : "none")}>
                <b>证据等级</b>　
                {grade.grade ? GRADE_LABEL[grade.grade] : grade.coverage === "2d" ? "仅 2D（膜蛋白，本页不做 3D）" : "未分级"}
                <span style={{ display: "block", opacity: 0.62, marginTop: 3 }}>{selected.evidence.basis}</span>
              </div>

              <div className="d-cof" data-testid="oxphos-dg">
                <b>ΔG</b>
                <span style={{ opacity: 0.55 }}> {selected.deltaG.qualitative ?? "—"}（数值未核实）</span>
              </div>

              {selected.sharedWith && (
                <div className="d-mirror" data-testid="oxphos-shared" data-shared-step={selected.sharedWith.stepId}>
                  <span className="lbl">与 TCA 共享同一实体</span>
                  {selected.sharedWith.note}
                  <div style={{ marginTop: 6 }}>
                    <Link to={`/pathway/tca?step=${selected.sharedWith.stepId}`} data-testid="oxphos-shared-link">
                      去 TCA 第 6 步看同一个酶 →
                    </Link>
                  </div>
                </div>
              )}

              {selected.threeD.status === "soluble-panel" ? (
                <div className="d-cof" data-testid="oxphos-soluble-note">
                  <b>3D</b>　{selected.threeD.panelTitle}；见页下「可溶结构域 3D」面板。{selected.threeD.note}
                </div>
              ) : (
                <div className="d-cof" data-testid="oxphos-no3d" data-module={selected.id}>
                  <b>3D</b>　<span style={{ color: BRICK }}>膜蛋白，本页不做 3D。</span> {selected.threeD.reason}
                  <span style={{ display: "block", opacity: 0.62, marginTop: 3 }}>体量：{selected.threeD.atomScale}</span>
                </div>
              )}

              <div className="d-cof" data-testid="oxphos-pdb-candidates">
                <b>PDB 候选</b>　
                {selected.pdbCandidates.length
                  ? selected.pdbCandidates.map((pdb) => `${pdb.pdbId}（${pdb.organism}，${pdb.method}，${pdb.resolution ?? "—"} Å，${pdb.atomCount ?? "—"} 原子）`).join("；")
                  : "无（小分子池，没有可列出的蛋白结构）"}
              </div>

              {selected.misconceptions.length > 0 && (
                <div className="d-mis">
                  <span className="lbl">常见误解</span>
                  <ul>
                    {selected.misconceptions.map((item) => <li key={item}>{item}</li>)}
                  </ul>
                </div>
              )}

              {selected.clinical.length > 0 && (
                <div className="d-mis">
                  <span className="lbl">临床关联</span>
                  <ul>
                    {selected.clinical.map((item) => <li key={item}>{item}</li>)}
                  </ul>
                </div>
              )}

              <Link
                className="frames-entry"
                data-testid="oxphos-structure-cmp-entry"
                data-cmp-module={selected.id}
                to={`/structures/oxphos#module-${selected.id}`}
              >
                看这一块的结构对照 →
              </Link>
            </div>
          </div>

          <div className="panel-block" data-testid="oxphos-po">
            <div className="pb-title">
              <span>P/O 账本</span>
              <span className="en">PROTON BUDGET · {DATA.poBasis.source}</span>
            </div>
            <table className="organs" data-po-table="1">
              <thead>
                <tr>
                  <th>入口</th>
                  <th>泵出 H⁺</th>
                  <th>÷ 3.67</th>
                  <th>工程口径</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>NADH</td>
                  <td className="num">10</td>
                  <td className="num">≈ {DATA.poBasis.nadhRaw}</td>
                  <td className="num"><b>{DATA.poBasis.nadh}</b></td>
                </tr>
                <tr>
                  <td>FADH₂</td>
                  <td className="num">6</td>
                  <td className="num">≈ {DATA.poBasis.fadh2Raw}</td>
                  <td className="num"><b>{DATA.poBasis.fadh2}</b></td>
                </tr>
              </tbody>
            </table>
            <p style={{ fontSize: 10, lineHeight: 1.7, opacity: 0.62, margin: "8px 0 0" }} data-po-note="1">
              {DATA.poBasis.note} 旧口径 NADH {DATA.poBasis.legacy.nadh} / FADH₂ {DATA.poBasis.legacy.fadh2} 仅脚注并列，不参与加和。
            </p>
          </div>

          <div className="panel-block" data-testid="oxphos-proton-flux">
            <div className="pb-title">
              <span>质子回路</span>
              <span className="en">PROTON FLUX · 单独一类，不是分子实体</span>
            </div>
            <div className="d-body">
              {DATA.protonFlux.map((flux) => (
                <div className="d-cof" key={flux.id} data-proton-flux={flux.id}>
                  <b>{flux.label}</b>
                  <span style={{ opacity: 0.6 }}>　{flux.from} → {flux.to}</span>
                  <span style={{ display: "block", fontSize: 10.5, opacity: 0.62, marginTop: 2 }}>
                    {flux.note}
                    {flux.perNadh !== null && `　NADH 分支 ${flux.perNadh}；FADH₂ 分支 ${flux.perFadh2}`}
                  </span>
                </div>
              ))}
              <div className="d-mirror" data-testid="oxphos-chemiosmosis">
                <span className="lbl">{DATA.chemiosmosis.title}</span>
                {DATA.chemiosmosis.text}
                <span style={{ display: "block", marginTop: 6, fontSize: 10.5, opacity: 0.65 }}>
                  {DATA.chemiosmosis.deltaPsi}；{DATA.chemiosmosis.deltaPh}
                </span>
                <span style={{ display: "block", marginTop: 6 }}>
                  解偶联：{DATA.chemiosmosis.uncouplers.map((item) => `${item.name}（${item.note}）`).join("；")}
                </span>
              </div>
            </div>
          </div>

          <div className="panel-block">
            <div className="pb-title">
              <span>与 TCA / β-氧化的接口</span>
              <span className="en">INTERFACES · 按实体 id 只画一次</span>
            </div>
            <div className="d-body" style={{ fontSize: 11, lineHeight: 1.8, opacity: 0.8 }}>
              <p style={{ margin: "0 0 8px" }}>
                <b>NADH</b>：来自 TCA 的 3 个脱氢步（tca-3 / tca-4 / tca-8）与 β-氧化第 3 步（fao-3），在复合体 I 进入 Q 池。
              </p>
              <p style={{ margin: "0 0 8px" }}>
                <b>FADH₂</b>：来自 TCA 第 6 步（tca-6，就是复合体 II 本身）与 β-氧化第 1 步（fao-1），在复合体 II 进入 Q 池，但<b>不泵质子</b>。
              </p>
              <p style={{ margin: 0 }}>
                首页总图把 NADH / FADH₂ 画成共用节点，Q 池是呼吸链唯一显式画出的公共入口；QH₂ / cyt c / O₂ 不重复画节点，只在本挂图内呈现。
              </p>
            </div>
          </div>
        </aside>
      </div>

      {/* ===== 可溶结构域 3D：只做可溶、可核验的两个 ===== */}
      <section className="plate-wrap ox-soluble" data-testid="oxphos-soluble-3d">
        <div className="plate-head">
          <span className="t">图 2 · 可溶结构域 3D：细胞色素 c 与 F₁ 催化头部；膜复合体一律不做 3D</span>
          <span className="lg" style={{ fontSize: 10 }}>首屏零 3D · 滚动到本区才加载资产</span>
        </div>
        <div className="ox-3d-grid">
          <div>
            <div className="fn-head"><span className="t">细胞色素 c · 人源 / 3ZCF A 链</span><span className="num">12.4 kDa · 1.65 Å</span></div>
            <SolubleDomain3D asset="cytc" />
          </div>
          <div>
            <div className="fn-head"><span className="t">F₁ 催化头部 · 牛源 / 1BMF</span><span className="num">≈ 350 kDa · 2.85 Å</span></div>
            <SolubleDomain3D asset="f1" />
          </div>
        </div>
        <p style={{ fontSize: 10.5, lineHeight: 1.8, opacity: 0.65, margin: "10px 0 0" }} data-3d-discipline="1">
          3D 只用于能给出完整、可核验坐标的可溶结构：cyt c 是人源 1.65 Å 实验结构（原始条目为四聚体，取 A 链）；F₁ 是牛源 2.85 Å 实验结构（跨物种，已标注；ANP = AMP-PNP，不可当作 ATP）。复合体 I / II / III / IV 与 F₀ 为膜蛋白，本页不做 3D，只给已核验的 PDB 候选与原子数量级——不用计算构象或片段冒充完整复合体。
        </p>
      </section>

      {/* ===== 膜蛋白结构候选表 ===== */}
      <section className="plate-wrap" data-testid="oxphos-membrane-table">
        <div className="fn-head" style={{ marginTop: 22 }}>
          <span className="t">表 2 · 膜蛋白模块的结构候选（已核验，本页不做 3D）</span>
          <span className="num">原子数用于判断是否超出单页上限</span>
        </div>
        <table className="organs" data-membrane-table="1">
          <thead>
            <tr>
              <th style={{ width: 220 }}>模块</th>
              <th style={{ width: 90 }}>体量</th>
              <th style={{ width: 90 }}>PDB</th>
              <th style={{ width: 90 }}>物种</th>
              <th style={{ width: 90 }}>方法 / 分辨率</th>
              <th style={{ width: 110 }}>原子数</th>
              <th>不做 3D 的原因</th>
            </tr>
          </thead>
          <tbody>
            {no3dModules.map((module) => (
              <tr key={module.id} data-membrane-row={module.id}>
                <td>{module.name}</td>
                <td className="num">{module.massKda ? `${module.massKda} kDa` : "小分子池"}</td>
                <td className="num">{module.pdbCandidates[0]?.pdbId ?? "—"}</td>
                <td>{module.pdbCandidates[0]?.organism ?? "—"}</td>
                <td className="num">{module.pdbCandidates[0] ? `${module.pdbCandidates[0].method} / ${module.pdbCandidates[0].resolution ?? "—"} Å` : "—"}</td>
                <td className="num">{module.pdbCandidates[0]?.atomCount ?? "—"}</td>
                <td style={{ opacity: 0.75 }}>{module.threeD.status === "not-built" ? module.threeD.reason : ""}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <footer className="poster-foot">
        <span>
          编号：{DATA.plateNo} · 结构页 {DATA.structurePlateNo}。数据源：RCSB PDB 3ZCF / 1BMF / 5LDW / 7QSK / 1ZOY / 1BE3 / 5Z62；P/O 口径与 TCA、β-氧化页同版本。
        </span>
        <span>ΔG 全部定性 +「数值未核实」；不把膜蛋白片段或计算构象冒充完整复合体。未 git 提交。</span>
      </footer>
    </div>
  );
}
