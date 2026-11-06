// ============================================================
// SF-06 —— 氧化磷酸化结构页
//
// 不套用 /structures/:pathwayId 的逐步分子对照器：
// 本通路的对象是模块（膜复合体 / 池 / 载体 / 合酶），不是「底物 → 产物」小分子对。
// 本页只做两件事：
//   1) 给出两个可溶结构域的真实 3D（cyt c、F1）；
//   2) 把膜复合体的已核验 PDB 候选、原子数与「不做 3D」原因摊开。
// ============================================================
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { GRADE_LABEL, gradeOfPart } from "../data/evidenceGrade";
import dataJson from "../data/oxphos/oxphos.json";
import type { OxphosData, OxphosModule } from "../data/oxphos/types";
import SolubleDomain3D from "../components/SolubleDomain3D";
import PathwaySwitcher from "../components/PathwaySwitcher";

const DATA = dataJson as unknown as OxphosData;
const BRICK = "#9C4A3C";

function moduleGrade(module: OxphosModule) {
  return gradeOfPart({
    molId: module.id,
    coordSource: module.evidence.coordSource,
    pocketRole: module.evidence.pocketRole,
    species: module.evidence.species,
  });
}

function ModuleRow({ module }: { module: OxphosModule }) {
  const grade = moduleGrade(module);
  const first = module.pdbCandidates[0];
  return (
    <tr id={`module-${module.id}`} data-structure-row={module.id}>
      <td>
        <b className="num">{module.order}</b>　{module.name}
        <span style={{ display: "block", opacity: 0.6, fontSize: 10.5, marginTop: 2 }}>{module.en}</span>
      </td>
      <td className="num">
        {module.massKda ? `${module.massKda} kDa` : "小分子池"}
        <span style={{ display: "block", opacity: 0.6, fontSize: 10 }}>
          {module.subunits ? `${module.subunits} 亚基` : "—"}
        </span>
      </td>
      <td>
        {module.threeD.status === "soluble-panel" ? (
          <span style={{ color: "#2E6E6B" }}>可溶 · 已做 3D</span>
        ) : (
          <span style={{ color: BRICK }}>不做 3D</span>
        )}
        <span style={{ display: "block", opacity: 0.62, fontSize: 10 }}>
          {module.threeD.status === "soluble-panel" ? module.threeD.asset === "cytc" ? "3ZCF A 链" : "1BMF F₁" : module.threeD.reason}
        </span>
      </td>
      <td data-grade={grade.grade ?? (grade.coverage === "2d" ? "2d" : "none")}>
        {grade.grade ? GRADE_LABEL[grade.grade] : grade.coverage === "2d" ? "仅 2D" : "未分级"}
        <span style={{ display: "block", opacity: 0.62, fontSize: 10, marginTop: 2 }}>{module.evidence.basis}</span>
      </td>
      <td className="num">
        {first ? `${first.pdbId}` : "—"}
        <span style={{ display: "block", opacity: 0.62, fontSize: 10 }}>
          {first ? `${first.organism}` : ""}
        </span>
      </td>
      <td className="num">
        {first ? `${first.method} / ${first.resolution ?? "—"} Å` : "—"}
        <span style={{ display: "block", opacity: 0.62, fontSize: 10 }}>
          {first?.atomCount ? `${first.atomCount.toLocaleString()} 原子` : ""}
        </span>
      </td>
      <td>
        <Link to={`/pathway/oxphos?module=${module.id}`} data-structure-back={module.id}>
          回到挂图 →
        </Link>
      </td>
    </tr>
  );
}

export default function OxphosStructurePage() {
  // 返回栏：顶部时留在原位，滚过阈值后吸底
  const [barFixed, setBarFixed] = useState(false);
  useEffect(() => {
    const onScroll = () => setBarFixed(window.scrollY > 120);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className="poster poster-oxphos structures-page" data-testid="oxphos-structure-page" data-plate-no={DATA.structurePlateNo}>
      <div className="structures-backbar-slot">
        <nav className={`film-back structures-backbar${barFixed ? " is-fixed" : ""}`} data-testid="film-back">
          <Link to="/pathway/oxphos" className="structures-back-btn" data-testid="structures-back">
            ← 返回挂图
          </Link>
          <Link to="/" className="film-home">首页</Link>
          <span className="film-back-step">{DATA.structurePlateNo} · 氧化磷酸化结构页</span>
        </nav>
      </div>
      <PathwaySwitcher current="oxphos" variant="structure" context={`结构对照 ${DATA.structurePlateNo}`} />
      <header className="masthead">
        <div className="mast-top">
          <span className="kicker">结构对照 · STRUCTURE PLATE · {DATA.structurePlateNo}</span>
          <span className="plate-no num">{DATA.structurePlateNo} · 第一版 · 2026</span>
        </div>
        <div className="mast-main">
          <h1>
            氧化磷酸化的可溶结构域
            <small>SOLUBLE DOMAINS — cyt c 与 F₁ 头部做 3D；膜复合体只列已核验候选，不做 3D</small>
          </h1>
          <p className="mast-summary">
            这条通路的对象是模块而不是「底物 → 产物」小分子对，所以本页不套用逐步分子对照器。
            两个可溶结构域给出真实实验坐标的 3D；复合体 I / II / III / IV 与 F₀ 明确标注膜蛋白、原子数量级与 PDB 候选，不把片段或计算构象冒充完整复合体。
          </p>
        </div>
      </header>

      <div className="legend">
        <span className="lg">
          <span style={{ color: "#2E6E6B", fontWeight: 700 }}>青</span>＝可溶 · 已做 3D
          <span style={{ margin: "0 6px", color: BRICK, fontWeight: 700 }}>砖红</span>＝膜蛋白 · 不做 3D
        </span>
        <span className="lg">首屏零 3D · 滚动到面板才加载资产</span>
        <span className="lg legend-hint">证据等级沿用 A/B/C/D 口径；仅 2D 不进 A–D</span>
      </div>

      <div className="plate-wrap ox-soluble" data-testid="oxphos-soluble-3d">
        <div className="plate-head">
          <span className="t">图 1 · 两个可溶结构域：细胞色素 c（人源）与 F₁ 催化头部（牛源）</span>
          <span className="lg" style={{ fontSize: 10 }}>两者均为实验坐标</span>
        </div>
        <div className="ox-3d-grid">
          <div>
            <div className="fn-head"><span className="t">细胞色素 c · 3ZCF A 链</span><span className="num">1.65 Å · 人源 · 12.4 kDa</span></div>
            <SolubleDomain3D asset="cytc" />
          </div>
          <div>
            <div className="fn-head"><span className="t">F₁ 催化头部 · 1BMF</span><span className="num">2.85 Å · 牛源 · ≈ 350 kDa</span></div>
            <SolubleDomain3D asset="f1" />
          </div>
        </div>
        <p style={{ fontSize: 10.5, lineHeight: 1.8, opacity: 0.68, margin: "10px 0 0" }}>
          cyt c：原始条目为 A–D 四聚体，本页取 A 链；血红素 c 共价连接，保留为棒状模型。
          F₁：A–G 链的催化头部，不含 F₀/c 环；原始配体含 ADP ×1、ANP ×4、MG ×5，其中 <b>ANP = AMP-PNP</b>，不可当作 ATP。
        </p>
      </div>

      <section className="plate-wrap" data-testid="oxphos-structure-table">
        <div className="fn-head" style={{ marginTop: 24 }}>
          <span className="t">表 1 · 七个模块的呈现方式、证据等级与结构候选</span>
          <span className="num">膜复合体：本页不做 3D</span>
        </div>
        <table className="organs" data-module-table="1">
          <thead>
            <tr>
              <th style={{ width: 210 }}>模块</th>
              <th style={{ width: 110 }}>体量</th>
              <th style={{ width: 160 }}>本页呈现</th>
              <th style={{ width: 200 }}>证据等级 / 依据</th>
              <th style={{ width: 100 }}>PDB</th>
              <th style={{ width: 130 }}>方法 / 分辨率 / 原子</th>
              <th style={{ width: 100 }}>链接</th>
            </tr>
          </thead>
          <tbody>
            {DATA.modules.map((module) => <ModuleRow key={module.id} module={module} />)}
          </tbody>
        </table>
      </section>

      <section className="plate-wrap" data-testid="oxphos-structure-why">
        <div className="fn-head" style={{ marginTop: 22 }}>
          <span className="t">表 2 · 为什么膜复合体不做 3D（给读者看的判断依据，不是省略说明）</span>
        </div>
        <div style={{ fontSize: 11.5, lineHeight: 1.85, borderLeft: `3px solid ${BRICK}`, paddingLeft: 12, opacity: 0.82 }}>
          <p style={{ margin: "0 0 8px" }}>
            <b>复合体 I</b>：约 45 个亚基、约 1 MDa；5LDW（牛，cryo-EM 4.27 Å）约 5.1 万原子，7QSK（牛，2.84 Å）约 7.0 万原子。单页同屏大模型 ≤2、蛋白原子 ≤5 万，直接超限；即使强行裁链，剩下的片段也不能代表完整复合体。
          </p>
          <p style={{ margin: "0 0 8px" }}>
            <b>复合体 II / III / IV</b>：虽可载入（1ZOY 约 9,024 原子；1BE3 约 16,222 原子；5Z62 约 15,037 原子），但本轮规则是「膜复合体一律 2D」，避免出现「有的膜蛋白有 3D、有的没有」的任意选择；静态结构也无法表达 Q 循环与 4 e⁻ 一次性还原 O₂。
          </p>
          <p style={{ margin: 0 }}>
            <b>F₀ / c 环</b>：F₀ 是膜内质子通道，1BMF 只含 F₁ 头部；把 F₁ 的 3D 当成整台 ATP 合酶是常见误读，本页在面板标题与配体说明里都锁死「仅 F₁」。
          </p>
        </div>
      </section>

      <footer className="poster-foot">
        <span data-3d-discipline="1">{DATA.structurePlateNo} · 结构候选均经 RCSB 元数据核验；未使用计算构象、未用类似物冒充真实配体。</span>
        <span>3D 资产：public/assets/oxphos/cytc/model.pdb、public/assets/oxphos/f1/model.pdb；单资产 gzip 均小于 5 MB。</span>
      </footer>
    </div>
  );
}
