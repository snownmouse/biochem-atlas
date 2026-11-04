// 单步 3D 结合视图页 —— B 方案挂图视觉（与概览页同一套纸墨语言，四模块不再卡片堆叠）：
// ① 状态切换器 = 挂图式下划线文字 tab（static 步隐藏切换并显示原因）；② 3D 视图占主位；
// ③ 界面残基 = 等宽数字表格；④ 证据来源 = 报脚（colophon）样式。面包屑常驻，底部直接切上下步。
// 运行时零计算：几何/距离/氢键由资产管线离线算好，这里只读 JSON 与渲染。
// 原有降级与可访问性逻辑全部保留：静态模式（低核数/触屏）、键盘操作、操作提示、重置视角、8 秒超时、?degrade=1。
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { entities, pathway } from "../data/glycolysis";
import { loadStepManifest, resolveStepAsset, stepAssets, type StepAssetCfg } from "../data/stepAssets";
import {
  evidenceStrength,
  fetchJson,
  fetchText,
  flagsFromMeta,
  hasWebGL,
  hbondLigandAtom,
  lowPowerDevice,
  manualDegrade,
  methodLabel,
  MUTANT_FLAGS,
  normalizeMeta,
  organismLabel,
  TYPE_COLOR,
  TYPE_LABEL,
  type NormMeta,
  type Pocket,
  type StepFlag,
} from "../data/step3d";

type ViewState = "apo" | "holo";
type Phase = "loading" | "ready" | "degraded" | "static";

const ROMANS = ["Ⅰ","Ⅱ","Ⅲ","Ⅳ","Ⅴ","Ⅵ","Ⅶ","Ⅷ","Ⅸ","Ⅹ"];
const roman = (idx: number | null) => (idx === null ? "支" : ROMANS[idx - 1]);

/** 自由能排版：负号用全角减号，固定一位小数 */
const fmtDG = (v: number) => v.toFixed(1).replace("-", "−");

function safeGetView(viewer: any): number[] | null {
  try {
    return typeof viewer?.getView === "function" ? viewer.getView() : null;
  } catch {
    return null;
  }
}

export default function StepViewPage() {
  const params = useParams();
  const navigate = useNavigate();
  const stepIdRaw = params.stepId ?? "";

  // URL → 步骤；注册表 = 本地兜底 + manifest（异步权威）。路由与内部索引一律以 stepId 为准，urlAlias 仅兼容旧链接。
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

  const resolved = useMemo(() => resolveStepAsset(stepIdRaw, assetReg), [stepIdRaw, assetReg]);
  const step = useMemo(
    () => pathway.steps.find((s) => s.id === (resolved?.stepKey ?? stepIdRaw)) ?? null,
    [resolved, stepIdRaw]
  );
  const cfg = resolved?.cfg ?? null;

  const prevStep = useMemo(
    () => (step && step.index && step.index > 1 ? pathway.steps[step.index - 2] : null),
    [step]
  );
  const nextStep = useMemo(
    () => (step && step.index && step.index < pathway.steps.length ? pathway.steps[step.index] : null),
    [step]
  );

  if (!step) {
    return (
      <div className="poster step-poster">
        <nav className="crumb">
          <Link to="/">通路概览</Link> / 未知步骤
        </nav>
        <div className="s-placeholder">未知步骤：{stepIdRaw}</div>
      </div>
    );
  }

  const entityMap = new Map(entities.map((e) => [e.id, e]));

  return (
    <div className="poster step-poster">
      <header className="s-mast">
        <div className="mast-top">
          <span className="kicker">单步结构视图 · STEP STRUCTURE PLATE</span>
          <span className="plate-no num">
            PLATE S-{String(step.index ?? 0).padStart(2, "0")} / 10 · 糖酵解 · 第一版 · 2026
          </span>
        </div>
        <nav className="crumb">
          <Link to="/">通路概览</Link>
          <span className="sep">/</span>
          <Link to={`/pathway/${pathway.id}?step=${step.id}`}>{pathway.name}</Link>
          <span className="sep">/</span>
          <span className="cur">第 {step.index} 步 · {step.enzyme.name}</span>
        </nav>
        <h1 className="s-title">
          <span className="no serif num">{roman(step.index)}</span>
          {step.name}
          <small>
            {step.enzyme.name}
            {step.enzyme.isozyme ? ` · ${step.enzyme.isozyme}` : ""}
            {step.irreversible ? " · 不可逆" : ""}
          </small>
        </h1>
        <div className="s-eq serif">{step.equation}</div>
      </header>

      {cfg ? (
        <StepView
          stepId={step.id}
          cfg={cfg}
          entityMap={entityMap}
          flagsBase={[...(MUTANT_FLAGS[step.id] ? [MUTANT_FLAGS[step.id]] : [])]}
          onNav={(id) => navigate(`/step/${id}`)}
          prevId={prevStep?.id ?? null}
          prevLabel={prevStep ? `${roman(prevStep.index)} ${prevStep.name}` : null}
          nextId={nextStep?.id ?? null}
          nextLabel={nextStep ? `${roman(nextStep.index)} ${nextStep.name}` : null}
        />
      ) : (
        <>
          <div className="s-placeholder">
            本步的 3D 资产尚未生成（以 /assets/steps/manifest.json 为准）。可返回
            <Link to={`/pathway/${pathway.id}?step=${step.id}`}> 挂图概览 </Link>
            查看反应式与组织差异。
          </div>
          <StepNavFooter
            prevId={prevStep?.id ?? null}
            prevLabel={prevStep ? `${roman(prevStep.index)} · ${prevStep.name}` : null}
            nextId={nextStep?.id ?? null}
            nextLabel={nextStep ? `${roman(nextStep.index)} · ${nextStep.name}` : null}
            onNav={(id) => navigate(`/step/${id}`)}
          />
        </>
      )}
    </div>
  );
}

/* ---------- 完整四模块视图 ---------- */
function StepView({
  stepId,
  cfg,
  entityMap,
  flagsBase,
  onNav,
  prevId,
  prevLabel,
  nextId,
  nextLabel,
}: {
  stepId: string;
  cfg: StepAssetCfg;
  entityMap: Map<string, { name: string; abbr?: string; kind: string }>;
  flagsBase: StepFlag[];
  onNav: (id: string) => void;
  prevId: string | null;
  prevLabel: string | null;
  nextId: string | null;
  nextLabel: string | null;
}) {
  const step = pathway.steps.find((s) => s.id === stepId)!;
  const base = `/assets/steps/${cfg.assetDir}`;

  const [view, setView] = useState<ViewState>("holo");
  const [meta, setMeta] = useState<NormMeta | null>(null);
  const [pocket, setPocket] = useState<Pocket | null>(null);
  const [progress, setProgress] = useState(5);
  const [phase, setPhase] = useState<Phase>("loading");
  const [degradedMsg, setDegradedMsg] = useState("");
  const [selResi, setSelResi] = useState<number | null>(null);
  const [showAllHb, setShowAllHb] = useState(false); // 氢键默认不画，点残基才显对应虚线；此开关强制全显
  const [hintVisible, setHintVisible] = useState(true);

  const viewerHostRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<any>(null);
  const modelRef = useRef<any>(null);
  const readyRef = useRef(false);
  const attemptRef = useRef(0);
  const rowRefs = useRef<Map<number, HTMLTableRowElement>>(new Map());
  const pdbCache = useRef<Map<string, string>>(new Map());
  const hbLineRefs = useRef<any[]>([]);
  const hbLabelRefs = useRef<any[]>([]);

  const staticDefault = useMemo(() => lowPowerDevice(), []);

  const flags: StepFlag[] = meta
    ? [...flagsBase, ...flagsFromMeta(meta)]
    : flagsBase;
  const twoState = cfg.mode === "two-state" && meta?.apo != null;

  // 加载 JSON 元数据
  useEffect(() => {
    let cancelled = false;
    setPhase("loading");
    setProgress(8);
    Promise.all([
      fetchJson<any>(`${base}/meta.json`),
      fetchJson<Pocket>(`${base}/pocket.json`),
    ]).then(([m, p]) => {
      if (cancelled) return;
      setMeta(normalizeMeta(m));
      setPocket(p);
      setProgress(30);
      if (staticDefault) setPhase("static");
    });
    return () => {
      cancelled = true;
    };
  }, [base, staticDefault]);

  // 3D 初始化 / 状态重建（含 8 秒超时降级；apo/holo 切换尽量保留相机姿态）
  const buildViewer = useCallback(
    async (state: ViewState) => {
      if (!pocket || !meta) return;
      const attempt = ++attemptRef.current;
      readyRef.current = false;
      setPhase("loading");
      setProgress((v) => Math.max(v, 35));

      const timer = window.setTimeout(() => {
        if (!readyRef.current && attempt === attemptRef.current) {
          setDegradedMsg("3D 初始化超时");
          setPhase("degraded");
        }
      }, 8000);
      const cancelledFor = (a: number) => a !== attemptRef.current;

      try {
        if (manualDegrade()) throw new Error("手动触发降级（degrade=1）");
        if (!hasWebGL()) throw new Error("WebGL 不可用");
        const $3Dmol: any = await import("3dmol");
        if (cancelledFor(attempt)) return;

        let pdbText = pdbCache.current.get(state);
        if (!pdbText) {
          pdbText = await fetchText(`${base}/${state}.pdb`);
          pdbCache.current.set(state, pdbText);
        }
        if (cancelledFor(attempt)) return;
        setProgress((v) => Math.max(v, 65));

        const host = viewerHostRef.current;
        if (!host) return;
        const existing = viewerRef.current;
        const savedView = existing && readyRef.current === false ? safeGetView(existing) : null;
        const keepCamera = savedView !== null;
        host.innerHTML = "";
        const viewer = $3Dmol.createViewer(host, { backgroundColor: "white", antialias: true });
        viewerRef.current = viewer;
        // 旧 viewer 连同其 shape/label 一起销毁，引用列表同步清空
        hbLineRefs.current = [];
        hbLabelRefs.current = [];
        const model = viewer.addModel(pdbText, "pdb");
        modelRef.current = model;

        model.setStyle({}, {
          cartoon: {
            colorfunc: (atom: any) =>
              atom.ss === "h" ? "#8fae8b" : atom.ss === "s" ? "#93a6c4" : "#d9d4c7",
          },
        });
        const pocketResis = pocket.residues.map((r) => r.resi);
        model.setStyle(
          { resi: pocketResis },
          { cartoon: { color: "#c17a4a" }, stick: { radius: 0.14, colorscheme: "defaultCarbon" } }
        );
        const waters = pocket.waters ?? [];
        if (waters.length) {
          model.setStyle({ resn: "HOH", resi: waters }, { sphere: { radius: 0.28, color: "#8fb8d8" } });
        }
        if (state === "holo") {
          // 只绘制 pocketRelevant 的配体实例（第二位点拷贝与远处配体不画，避免误导）
          for (const lg of meta.ligands) {
            if (!lg.sdf || !lg.pocketRelevant) continue;
            const lig = viewer.addModel(await fetchText(`${base}/${lg.sdf}`), "sdf");
            lig.setStyle({}, { stick: { radius: 0.25, colorscheme: "defaultCarbon" } });
          }
          // 氢键虚线不在此处画：由 syncHbonds 按"点残基才显"的规则统一管理
          viewer.setClickable({ resi: pocketResis }, true, (atom: any) => {
            if (atom?.resi) pickResidue(atom.resi as number, "from3d");
          });
          if (keepCamera) viewer.setView(savedView);
          else viewer.zoomTo({ resi: pocketResis }, 0);
        } else {
          if (keepCamera) viewer.setView(savedView);
          else viewer.zoomTo({}, 0);
        }
        if (cancelledFor(attempt)) return;
        viewer.render();
        readyRef.current = true;
        window.clearTimeout(timer);
        setProgress(100);
        setPhase("ready");
      } catch (e) {
        window.clearTimeout(timer);
        if (cancelledFor(attempt)) return;
        setDegradedMsg(e instanceof Error ? e.message : String(e));
        setPhase("degraded");
      }
    },
    [base, meta, pocket] // eslint-disable-line react-hooks/exhaustive-deps
  );

  // state / pocket 变化时重建 3D
  useEffect(() => {
    if (phase === "static" || phase === "degraded") return;
    if (pocket && meta) void buildViewer(view);
  }, [view, pocket, meta]); // eslint-disable-line react-hooks/exhaustive-deps

  // 卸载清理
  useEffect(() => {
    return () => {
      attemptRef.current++;
      viewerRef.current = null;
      modelRef.current = null;
    };
  }, []);

  // 残基双向联动（3D → 表格滚动；表格 → 3D 高亮）；再点一次取消选中。
  // 当前选中值走 ref：3D 点击回调经 buildViewer 闭包捕获，须避免读到过期 state。
  const selResiRef = useRef<number | null>(null);
  const pickResidue = useCallback(
    (resi: number, from: "list" | "from3d") => {
      const deselect = selResiRef.current === resi;
      selResiRef.current = deselect ? null : resi;
      setSelResi(deselect ? null : resi);
      if (from === "from3d" && !deselect) {
        rowRefs.current.get(resi)?.scrollIntoView({ block: "nearest", behavior: "smooth" });
      }
      const model = modelRef.current;
      const viewer = viewerRef.current;
      if (!model || !viewer || !pocket) return;
      const pocketResis = pocket.residues.map((r) => r.resi);
      model.setStyle(
        { resi: pocketResis },
        { cartoon: { color: "#c17a4a" }, stick: { radius: 0.14, colorscheme: "defaultCarbon" } }
      );
      if (!deselect) {
        model.setStyle(
          { resi },
          { cartoon: { color: "#7a2e0e" }, stick: { radius: 0.24, colorscheme: "defaultCarbon" } }
        );
      }
      viewer.render();
    },
    [pocket]
  );

  // 氢键虚线统一管理：默认不画；选中残基 → 只画该残基的；"全部显示"开关 → 全画。
  // 每次先 removeShape/removeLabel 旧图形再重画，幂等。
  const syncHbonds = useCallback(() => {
    const viewer = viewerRef.current;
    if (!viewer || !pocket) return;
    for (const s of hbLineRefs.current) {
      try { viewer.removeShape(s); } catch { /* 旧 viewer 已销毁时忽略 */ }
    }
    for (const l of hbLabelRefs.current) {
      try { viewer.removeLabel(l); } catch { /* 同上 */ }
    }
    hbLineRefs.current = [];
    hbLabelRefs.current = [];
    if (view === "holo") {
      const hbs = pocket.hbonds.filter((hb) => showAllHb || hb.prot.resi === selResi);
      for (const hb of hbs) {
        const partner = hbondLigandAtom(hb);
        if (!partner) continue;
        try {
          const shape = viewer.addLine({
            dashed: true,
            color: "#9C4A3C",
            start: { x: hb.prot.x, y: hb.prot.y, z: hb.prot.z },
            end: { x: partner.x, y: partner.y, z: partner.z },
          });
          if (shape) hbLineRefs.current.push(shape);
          const label = viewer.addLabel(`${hb.dist.toFixed(1)} Å`, {
            position: { x: (hb.prot.x + partner.x) / 2, y: (hb.prot.y + partner.y) / 2, z: (hb.prot.z + partner.z) / 2 },
            fontSize: 10,
            fontColor: "#5a564d",
            backgroundColor: "#ffffff",
            backgroundOpacity: 0.72,
            showBackground: true,
            borderThickness: 0.4,
          });
          if (label) hbLabelRefs.current.push(label);
        } catch { /* 单条失败不影响其余 */ }
      }
    }
    viewer.render();
  }, [pocket, view, selResi, showAllHb]);

  // phase ready 后与交互态变化时重画氢键
  useEffect(() => {
    if (phase === "ready") syncHbonds();
  }, [phase, syncHbonds]);

  const selResidue = pocket?.residues.find((r) => r.resi === selResi) ?? null;
  const dismissHint = useCallback(() => setHintVisible(false), []);
  const nameOf = useCallback((id: string) => entityMap.get(id)?.name ?? id, [entityMap]);
  const strength = meta ? evidenceStrength(meta) : null;

  return (
    <>
      {/* 砖红旗标 + caveats 逐条：默认可见，不藏折叠 */}
      {(flags.length > 0 || meta?.caveats.length) && (
        <ul className="s-flags">
          {flags.map((f, i) => (
            <li key={i} className={`flag-${f.kind}`}>
              <span className="fm">
                ▲ {f.kind === "species" ? "物种" : f.kind === "mutant" ? "突变体" : f.kind === "method" ? "方法" : "仅辅因子"}
              </span>
              {f.text}
            </li>
          ))}
          {meta?.caveats.map((c, i) => (
            <li key={`c${i}`} className="flag-caveat">
              <span className="fm">▲ 注</span>
              {c}
            </li>
          ))}
        </ul>
      )}

      <div className="s-grid">
        {/* ===== 左：3D 主位 + 残基表 ===== */}
        <div className="s-main">
          {/* ① 状态切换器：挂图式下划线文字 tab；static 步不渲染死按钮，改显示原因 */}
          <div className="s-viewhead">
            <div className="s-tabs" role="tablist" aria-label="结构状态切换">
              <span className="s-tabs-lbl">状态</span>
              {twoState ? (
                <>
                  <button role="tab" aria-selected={view === "apo"} className={`s-tab${view === "apo" ? " active" : ""}`} onClick={() => setView("apo")}>
                    游离态 apo{meta?.apo ? ` · ${meta.apo.pdbId}` : ""}
                  </button>
                  <button role="tab" aria-selected={view === "holo"} className={`s-tab${view === "holo" ? " active" : ""}`} onClick={() => setView("holo")}>
                    结合态 holo{meta?.holo ? ` · ${meta.holo.pdbId}` : ""}
                  </button>
                </>
              ) : (
                <span className="s-tab active" aria-current="true">
                  仅结合态 holo{meta?.holo ? ` · ${meta.holo.pdbId}` : ""}（无可用 apo 结构，不提供切换）
                </span>
              )}
            </div>
            {phase === "ready" && (
              <div className="s-tools">
                {pocket && pocket.hbonds.length > 0 && (
                  <button
                    className="s-tool"
                    aria-pressed={showAllHb}
                    onClick={() => setShowAllHb((v) => !v)}
                  >
                    {showAllHb ? "收起全部氢键" : "全部显示氢键"}
                  </button>
                )}
                <button
                  className="s-tool"
                  onClick={() => {
                    const viewer = viewerRef.current;
                    if (!viewer || !pocket) return;
                    if (view === "holo") viewer.zoomTo({ resi: pocket.residues.map((r) => r.resi) }, 400);
                    else viewer.zoomTo({}, 400);
                    viewer.render();
                  }}
                >
                  重置视角
                </button>
              </div>
            )}
          </div>

          {/* ② 3D 视图（主位） */}
          <div className="s-figure">
            {(phase === "loading" || phase === "degraded") && progress < 100 && (
              <div className="progress-track"><div className="progress-fill" style={{ width: `${progress}%` }} /></div>
            )}
            {phase === "loading" && (
              <div className="s-loading" aria-label="加载中">结构加载中……</div>
            )}
            {phase === "degraded" && (
              <div className="s-degraded">
                <p>3D 视图不可用（{degradedMsg}）。以下为 2D 缩略，可重试。</p>
                <img className="s-thumb" src="/assets/pathways/glycolysis/glycolysis-liver.svg" alt="糖酵解通路 2D 缩略图" />
                <button className="s-tool" onClick={() => void buildViewer(view)}>重试 3D 视图</button>
              </div>
            )}
            {phase === "static" && (
              <div className="s-degraded">
                <p>检测到低性能设备或移动端，已默认静态模式：全部标注见下方残基表，不自动加载 3D。</p>
                <img className="s-thumb" src="/assets/pathways/glycolysis/glycolysis-liver.svg" alt="糖酵解通路 2D 缩略图" />
                <button className="s-tool" onClick={() => { setPhase("loading"); void buildViewer(view); }}>尝试加载 3D 视图</button>
              </div>
            )}
            <div
              ref={viewerHostRef}
              className={`s-viewer${phase === "ready" ? "" : " hidden"}`}
              onPointerDown={dismissHint}
              onWheel={dismissHint}
            />
            {phase === "ready" && hintVisible && (
              <div className="op-hint">拖动旋转 · 滚轮缩放 · 点击残基查看对应氢键</div>
            )}
            {phase === "ready" && view === "apo" && (
              <div className="s-apo-note">apo 无配体坐标；口袋残基于结合态（holo）标注。</div>
            )}
          </div>

          {/* ③ 界面残基（等宽数字表格；不依赖 WebGL 也可读） */}
          <section className="s-residues">
            <h2 className="s-h2">
              界面残基
              <span className="s-h2-en">
                口袋判据：任一重原子距配体 ≤ {meta?.criteria.dist ?? 4.5} Å · 共 {pocket?.residues.length ?? 0} 个 ·
                点击残基查看对应氢键
              </span>
            </h2>
            {pocket && (
              <table className="res-table">
                <thead>
                  <tr>
                    <th>残基</th>
                    <th>链</th>
                    <th className="num-col">最近距离</th>
                    <th>类型推断</th>
                  </tr>
                </thead>
                <tbody>
                  {pocket.residues.map((r) => (
                    <tr
                      key={r.resi}
                      ref={(el) => {
                        if (el) rowRefs.current.set(r.resi, el);
                        else rowRefs.current.delete(r.resi);
                      }}
                      className={selResi === r.resi ? "selected" : ""}
                      onClick={() => pickResidue(r.resi, "list")}
                      onKeyDown={(e) => e.key === "Enter" && pickResidue(r.resi, "list")}
                      tabIndex={0}
                      aria-label={`${r.resn} ${r.resi}，${r.chain} 链，最近 ${r.minDist.toFixed(2)} 埃，${TYPE_LABEL[r.type]}`}
                    >
                      <td className="num"><b>{r.resn} {r.resi}</b></td>
                      <td className="num">{r.chain}</td>
                      <td className="num num-col">{r.minDist.toFixed(2)} Å</td>
                      <td>
                        <span className="dot" style={{ background: TYPE_COLOR[r.type] }} />
                        {TYPE_LABEL[r.type]}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            {selResidue && (
              <div className="s-selnote">
                {selResidue.resn} {selResidue.resi}（{selResidue.chain} 链）：距配体最近 {selResidue.minDist.toFixed(2)} Å，
                推断相互作用「{TYPE_LABEL[selResidue.type]}」。
                {(() => {
                  // 不依赖 WebGL 的可读氢键条目：距离与配体侧残基名
                  const hbRows = (pocket?.hbonds ?? []).filter((hb) => hb.prot.resi === selResidue.resi);
                  if (!hbRows.length) return null;
                  return (
                    <span className="hb-note">
                      氢键 {hbRows.length} 条：
                      {hbRows.map((hb, i) => {
                        const partner = hbondLigandAtom(hb);
                        return (
                          <span key={i} className="num">
                            {partner ? `${partner.resn} ${partner.resi} · ` : ""}
                            {hb.dist.toFixed(2)} Å{hbRows.length > 1 && i < hbRows.length - 1 ? "；" : ""}
                          </span>
                        );
                      })}
                    </span>
                  );
                })()}
                <span className="muted"> 来源：computed（离线几何计算，未经文献核对）。</span>
              </div>
            )}
          </section>
        </div>

        {/* ===== 右：反应与证据侧栏 ===== */}
        <aside className="s-side">
          <div className="s-block">
            <h2 className="s-h2">反应<span className="s-h2-en">底物 → 产物 · 计量见挂图</span></h2>
            <p className="s-kv"><b>底物</b>{step.substrates.map(nameOf).join(" + ")}</p>
            <p className="s-kv"><b>产物</b>{step.products.map(nameOf).join(" + ")}</p>
            <p className="s-kv"><b>辅因子</b>{step.cofactors.length ? step.cofactors.join("、") : "—"}</p>
            {step.ecNumber && <p className="s-kv num"><b>EC</b>{step.ecNumber}</p>}
            {step.deltaG && (
              <p className="s-kv num">
                <b>ΔG</b>标准态 {fmtDG(step.deltaG.standard)} · 生理态 {fmtDG(step.deltaG.physiological)} {step.deltaG.unit}
              </p>
            )}
            {step.deltaG?.note && <p className="s-dgnote">{step.deltaG.note}</p>}
            {step.stereochemistry?.length ? (
              <p className="s-kv s-stereo"><b>立体化学</b>{step.stereochemistry.join("；")}</p>
            ) : null}
            <p className="s-sig">{step.significance}</p>
          </div>

          {step.misconceptions?.length || step.clinical?.length ? (
            <div className="s-block">
              <h2 className="s-h2">辨析与临床<span className="s-h2-en">误解 — 纠正 · 证据确定度见档案</span></h2>
              {step.misconceptions?.length ? (
                <ul className="s-mis">
                  {step.misconceptions.map((m, i) => (
                    <li key={i}>{m}</li>
                  ))}
                </ul>
              ) : null}
              {step.clinical?.length ? (
                <ul className="s-clin">
                  {step.clinical.map((c, i) => (
                    <li key={i}>{c}</li>
                  ))}
                </ul>
              ) : null}
            </div>
          ) : null}

          <div className="s-block">
            <h2 className="s-h2">组织差异<span className="s-h2-en">Δ · 详见表 1</span></h2>
            {step.organDiffs.length ? (
              <ul className="s-diffs">
                {step.organDiffs.map((d) => (
                  <li key={d.organ}>
                    <b>{pathway.organs.find((o) => o.id === d.organ)?.name ?? d.organ}</b>
                    {d.text}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="s-sig">本步无组织差异（肝 / 肌 / 红细胞一致）。</p>
            )}
          </div>
        </aside>
      </div>

      {/* ④ 证据来源：报脚样式（含强度标识与 caveats 逐条） */}
      {meta && (
        <footer className="s-colophon">
          <div className="sc-head">
            <span>证据来源 · EVIDENCE</span>
            <span className={`num ${strength?.clean ? "evi-clean" : "evi-warn"}`}>{strength?.note}</span>
          </div>
          <p className="num">
            <b>HOLO</b>　{meta.holo.pdbId}（{methodLabel(meta.holo.method)} {meta.holo.resolution ?? "—"} Å ·{" "}
            {organismLabel(meta.holo.organismRaw)}
            {meta.holo.atomCount ? ` · ${meta.holo.atomCount} 原子` : ""}
            {meta.holo.chains.length ? ` · ${meta.holo.chains.join("/")} 链` : ""}）
            {meta.ligands.filter((l) => l.pocketRelevant).length > 0 && (
              <>；绘制配体 {meta.ligands.filter((l) => l.pocketRelevant).map((l) => l.id).join(" + ")}</>
            )}
          </p>
          {meta.apo && (
            <p className="num">
              <b>APO</b>　{meta.apo.pdbId}（{methodLabel(meta.apo.method)} {meta.apo.resolution ?? "—"} Å ·{" "}
              {organismLabel(meta.apo.organismRaw)}
              {meta.apo.atomCount ? ` · ${meta.apo.atomCount} 原子` : ""}）
            </p>
          )}
          <p className="muted num">
            资产版本 {meta.assetVersion}；口袋 ≤{meta.criteria.dist} Å、氢键 ≤{meta.criteria.hbond} Å、
            结晶水 ≤{meta.criteria.water} Å，全部离线计算（{meta.provenance}）。
            注意事项已在页首旗标逐条列出（{meta.caveats.length} 条）。
          </p>
        </footer>
      )}

      <StepNavFooter
        prevId={prevId}
        prevLabel={prevLabel}
        nextId={nextId}
        nextLabel={nextLabel}
        onNav={onNav}
      />
    </>
  );
}

/* ---------- 底部：上一步 / 下一步（挂图式下划线文字） ---------- */
function StepNavFooter({
  prevId,
  prevLabel,
  nextId,
  nextLabel,
  onNav,
}: {
  prevId: string | null;
  prevLabel: string | null;
  nextId: string | null;
  nextLabel: string | null;
  onNav: (id: string) => void;
}) {
  return (
    <div className="s-nav">
      {prevId && prevLabel ? (
        <button className="s-nav-link" onClick={() => onNav(prevId)}>← {prevLabel}</button>
      ) : (
        <span className="s-nav-none">已是第一步</span>
      )}
      <Link className="s-nav-link" to={`/pathway/${pathway.id}`}>↩ 返回挂图</Link>
      {nextId && nextLabel ? (
        <button className="s-nav-link" onClick={() => onNav(nextId)}>{nextLabel} →</button>
      ) : (
        <span className="s-nav-none">已是最后一步</span>
      )}
    </div>
  );
}
