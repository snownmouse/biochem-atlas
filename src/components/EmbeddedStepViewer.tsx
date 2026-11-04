// 右栏内嵌 3D 结合视图（概览页详情栏用）。
// 要求：3dmol 懒加载（不进首屏 chunk）；切步保相机只换模型；无资产/加载失败降级为
// "2D 缩略 + 文字 + 打开详情页"；8 秒超时降级可重试；低核数设备不自动加载（需点击）。
// 空间压缩：界面残基 → 可展开抽屉；证据来源 → 一行角标（点击展开完整信息与 caveats）。
import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import type { StepAssetCfg } from "../data/stepAssets";
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
import { ATOM_PALETTE_JSON, atomColor, atomColorFunc } from "../data/atomColors";

type Phase = "loading" | "gated" | "ready" | "degraded";

function safeGetView(viewer: any): number[] | null {
  try {
    return typeof viewer?.getView === "function" ? viewer.getView() : null;
  } catch {
    return null;
  }
}

export default function EmbeddedStepViewer({ stepId, cfg }: { stepId: string; cfg: StepAssetCfg }) {
  const base = `/assets/steps/${cfg.assetDir}`;
  const [meta, setMeta] = useState<NormMeta | null>(null);
  const [pocket, setPocket] = useState<Pocket | null>(null);
  const [phase, setPhase] = useState<Phase>("loading");
  const [msg, setMsg] = useState("");
  const [selResi, setSelResi] = useState<number | null>(null);
  const [showAllHb, setShowAllHb] = useState(false); // 氢键默认不画，点残基才显对应虚线；此开关强制全显
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [eviOpen, setEviOpen] = useState(false);

  const hostRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<any>(null);
  const modelRef = useRef<any>(null);
  const readyRef = useRef(false);
  const attemptRef = useRef(0);
  const zoomedRef = useRef(false); // 已做过初始取景；其后切步一律保相机
  const gatedRef = useRef(lowPowerDevice());
  const pdbCache = useRef<Map<string, string>>(new Map());
  const hbLineRefs = useRef<any[]>([]);
  const selResiRef = useRef<number | null>(null); // 3D 点击回调经 start3D 闭包捕获，须避免读到过期 state

  const flags: StepFlag[] = meta
    ? [...flagsFromMeta(meta), ...(MUTANT_FLAGS[stepId] ? [MUTANT_FLAGS[stepId]] : [])]
    : [];

  const pickResidue = useCallback((resi: number) => {
    const deselect = selResiRef.current === resi;
    selResiRef.current = deselect ? null : resi;
    setSelResi(deselect ? null : resi);
    const model = modelRef.current;
    const viewer = viewerRef.current;
    const p = pocket;
    if (!model || !viewer || !p) return;
    const pocketResis = p.residues.map((r) => r.resi);
    model.setStyle(
      { resi: pocketResis },
      { cartoon: { color: "#c17a4a" }, stick: { radius: 0.14, colorfunc: atomColorFunc } }
    );
    if (!deselect) {
      model.setStyle(
        { resi },
        { cartoon: { color: "#7a2e0e" }, stick: { radius: 0.24, colorfunc: atomColorFunc } }
      );
    }
    viewer.render();
  }, [pocket]);

  /* ---------- 氢键虚线统一管理：默认不画；选中残基 → 只画该残基的；开关 → 全画 ---------- */
  const syncHbonds = useCallback(() => {
    const viewer = viewerRef.current;
    if (!viewer || !pocket) return;
    for (const s of hbLineRefs.current) {
      try { viewer.removeShape(s); } catch { /* 旧 viewer 已销毁时忽略 */ }
    }
    hbLineRefs.current = [];
    if (phase === "ready") {
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
        } catch { /* 单条失败不影响其余 */ }
      }
    }
    viewer.render();
  }, [pocket, phase, selResi, showAllHb]);

  // ready 后与交互态变化时重画氢键
  useEffect(() => {
    syncHbonds();
  }, [syncHbonds]);

  /* ---------- 3D 初始化 / 换模型（保相机） ---------- */
  const start3D = useCallback(async () => {
    if (!meta || !pocket) return;
    const attempt = ++attemptRef.current;
    readyRef.current = false;
    setPhase("loading");

    const timer = window.setTimeout(() => {
      if (!readyRef.current && attempt === attemptRef.current) {
        setMsg("3D 初始化超时（8 秒）");
        setPhase("degraded");
      }
    }, 8000);
    const cancelledFor = (a: number) => a !== attemptRef.current;

    try {
      if (manualDegrade()) throw new Error("手动触发降级（degrade=1）");
      if (!hasWebGL()) throw new Error("WebGL 不可用");
      const $3Dmol: any = await import("3dmol");
      if (cancelledFor(attempt)) return;

      let pdbText = pdbCache.current.get(base);
      if (!pdbText) {
        pdbText = await fetchText(`${base}/holo.pdb`);
        pdbCache.current.set(base, pdbText);
      }
      if (cancelledFor(attempt)) return;

      const host = hostRef.current;
      if (!host) return;
      let viewer = viewerRef.current;
      if (!viewer) {
        host.innerHTML = "";
        viewer = $3Dmol.createViewer(host, { backgroundColor: "white", antialias: true });
        // 旧 viewer 连同其 shape 一起销毁，引用列表同步清空
        hbLineRefs.current = [];
        viewerRef.current = viewer;
        zoomedRef.current = false;
      }
      // 切步保相机：先取当前视角，clear 后恢复
      const savedView = zoomedRef.current ? safeGetView(viewer) : null;
      viewer.clear();
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
        { cartoon: { color: "#c17a4a" }, stick: { radius: 0.14, colorfunc: atomColorFunc } }
      );
      const waters = pocket.waters ?? [];
      if (waters.length) {
        // 水分子也是氧原子：取统一 O 色；靠小球半径与位置区分，不再另立蓝色
        model.setStyle({ resn: "HOH", resi: waters }, { sphere: { radius: 0.28, color: atomColor("O") } });
      }
      // 配体：v2 多配体（各带 sdf）；v1 单 ligand.sdf。只绘制 pocketRelevant 的配体实例，
      // 第二位点的非口袋拷贝（2CXS、3UCD 等）与远处配体（如 1CZA 的 ADP）不画，避免误导。
      for (const lg of meta.ligands) {
        if (!lg.sdf || !lg.pocketRelevant) continue;
        const lig = viewer.addModel(await fetchText(`${base}/${lg.sdf}`), "sdf");
        // 与结构对照页 / 单步页同一张原子配色表
        lig.setStyle({}, { stick: { radius: 0.25, colorfunc: atomColorFunc } });
      }
      // 氢键虚线不在此处画：由 syncHbonds 按"点残基才显"的规则统一管理
      viewer.setClickable({ resi: pocketResis }, true, (atom: any) => {
        if (atom?.resi) pickResidue(atom.resi as number);
      });

      if (savedView && typeof viewer.setView === "function") {
        viewer.setView(savedView);
      } else if (!zoomedRef.current) {
        viewer.zoomTo({ resi: pocketResis }, 0);
        zoomedRef.current = true;
      }
      if (cancelledFor(attempt)) return;
      viewer.render();
      readyRef.current = true;
      window.clearTimeout(timer);
      setPhase("ready");
    } catch (e) {
      window.clearTimeout(timer);
      if (cancelledFor(attempt)) return;
      setMsg(e instanceof Error ? e.message : String(e));
      setPhase("degraded");
    }
  }, [base, meta, pocket, pickResidue]);

  /* ---------- 步骤切换：拉 meta + pocket，随后按需起 3D ---------- */
  useEffect(() => {
    let cancelled = false;
    setMeta(null);
    setPocket(null);
    setSelResi(null);
    setMsg("");
    setPhase(gatedRef.current ? "gated" : "loading");
    Promise.all([
      fetchJson<any>(`${base}/meta.json`),
      fetchJson<Pocket>(`${base}/pocket.json`),
    ])
      .then(([m, p]) => {
        if (cancelled) return;
        setMeta(normalizeMeta(m));
        setPocket(p);
      })
      .catch(() => {
        if (cancelled) return;
        setMsg("3D 资产缺失或加载失败");
        setPhase("degraded");
      });
    return () => {
      cancelled = true;
      attemptRef.current++;
    };
  }, [base, stepId]);

  useEffect(() => {
    if (!meta || !pocket) return;
    if (phase === "gated" || phase === "degraded") return;
    void start3D();
  }, [meta, pocket]); // eslint-disable-line react-hooks/exhaustive-deps

  // 卸载清理
  useEffect(() => {
    return () => {
      attemptRef.current++;
      viewerRef.current = null;
      modelRef.current = null;
    };
  }, []);

  const selResidue = pocket?.residues.find((r) => r.resi === selResi) ?? null;
  const strength = meta ? evidenceStrength(meta) : null;

  return (
    <div className="embed3d">
      {/* 砖红旗标：物种 / 突变体 / cryo-EM / 仅辅因子 + caveats 逐条 —— 一句一条，默认可见不折叠 */}
      {(flags.length > 0 || meta?.caveats.length) && (
        <ul className="d-flags">
          {flags.map((f, i) => (
            <li key={i} className={`d-flag flag-${f.kind}`}>
              <span className="fm">▲ {f.kind === "species" ? "物种" : f.kind === "mutant" ? "突变体" : f.kind === "method" ? "方法" : "仅辅因子"}</span>
              {f.text}
            </li>
          ))}
          {meta?.caveats.map((c, i) => (
            <li key={`c${i}`} className="d-flag flag-caveat">
              <span className="fm">▲ 注</span>
              {c}
            </li>
          ))}
        </ul>
      )}

      {/* 3D 舞台 / 降级面板 */}
      <div className="embed-stage">
        {phase === "loading" && (
          <div className="embed-loading" aria-label="3D 加载中">3D 视图加载中……</div>
        )}
        {phase === "gated" && (
          <div className="embed-gate">
            <p>检测到低性能设备，默认不自动加载 3D。</p>
            <button className="embed-btn" onClick={() => { gatedRef.current = false; setPhase("loading"); }}>
              加载 3D 视图
            </button>
          </div>
        )}
        {phase === "degraded" && (
          <div className="embed-degraded">
            <p className="ed-msg">3D 视图不可用：{msg}。</p>
            <img className="ed-thumb" src="/assets/pathways/glycolysis/glycolysis-liver.svg" alt="糖酵解通路 2D 缩略图" />
            <div className="ed-actions">
              <button className="embed-btn" onClick={() => { setPhase("loading"); void start3D(); }}>
                重试 3D
              </button>
              <Link className="ed-link" to={`/step/${stepId}`}>打开详情页 →</Link>
            </div>
          </div>
        )}
        <div
          ref={hostRef}
          className={`embed-host${phase === "ready" ? "" : " hidden"}`}
          data-atom-colors={ATOM_PALETTE_JSON}
          title="拖动旋转 · 滚轮缩放 · 点击残基查看对应氢键"
        />
        {phase === "ready" && selResidue && (
          <div className="embed-selnote num">
            {selResidue.resn} {selResidue.resi}（{selResidue.chain} 链）· 最近 {selResidue.minDist.toFixed(2)} Å ·{" "}
            {TYPE_LABEL[selResidue.type]}
            {(() => {
              // 不依赖 WebGL 的可读氢键条目
              const hbRows = (pocket?.hbonds ?? []).filter((hb) => hb.prot.resi === selResidue.resi);
              return hbRows.length ? (
                <>
                  {" "}· 氢键 {hbRows.length} 条{" "}
                  {hbRows.map((hb, i) => (
                    <span key={i} className="num">{hb.dist.toFixed(2)} Å{hbRows.length > 1 && i < hbRows.length - 1 ? "、" : ""}</span>
                  ))}
                </>
              ) : null;
            })()}{" "}· <span className="prov">computed</span>
          </div>
        )}
      </div>

      {/* 界面残基：可展开抽屉 */}
      {pocket && (
        <div className="d-drawer">
          <button
            className="d-drawer-head"
            aria-expanded={drawerOpen}
            onClick={() => setDrawerOpen((v) => !v)}
          >
            界面残基 {pocket.residues.length} 个 · 氢键 {(pocket.hbonds ?? []).length} 条
            <span className="arr">{drawerOpen ? "▴" : "▾"}</span>
          </button>
          {pocket.hbonds.length > 0 && (
            <div className="d-hb-row">
              <span className="d-hb-hint">点击残基查看对应氢键</span>
              <button
                className="d-hb-toggle"
                aria-pressed={showAllHb}
                onClick={() => setShowAllHb((v) => !v)}
              >
                {showAllHb ? "收起全部" : "全部显示"}
              </button>
            </div>
          )}
          {drawerOpen && (
            <ul className="d-drawer-list">
              {pocket.residues.map((r) => (
                <li
                  key={r.resi}
                  className={selResi === r.resi ? "selected" : ""}
                  onClick={() => pickResidue(r.resi)}
                  onKeyDown={(e) => e.key === "Enter" && pickResidue(r.resi)}
                  tabIndex={0}
                >
                  <span className="dot" style={{ background: TYPE_COLOR[r.type] }} />
                  <b className="num">{r.resn} {r.resi}</b>
                  <span className="dist num">{r.minDist.toFixed(2)} Å</span>
                  <span className="tp">{TYPE_LABEL[r.type]}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* 证据来源：一行角标（含强度标识），点击展开完整信息 */}
      {meta && (
        <div className="d-evi">
          <button className="d-evi-line" aria-expanded={eviOpen} onClick={() => setEviOpen((v) => !v)}>
            <span className="num">
              PDB {meta.holo.pdbId} · {meta.holo.resolution ?? "—"} Å · {methodLabel(meta.holo.method)} ·{" "}
              {organismLabel(meta.holo.organismRaw)} · {meta.provenance} ·{" "}
              <span className={strength?.clean ? "evi-clean" : "evi-warn"}>{strength?.note}</span>
            </span>
            <span className="arr">{eviOpen ? "▴" : "▾"}</span>
          </button>
          {eviOpen && (
            <div className="d-evi-full">
              <p>
                <b>HOLO</b>　{meta.holo.pdbId}（{methodLabel(meta.holo.method)} {meta.holo.resolution ?? "—"} Å ·{" "}
                {organismLabel(meta.holo.organismRaw)}
                {meta.holo.atomCount ? ` · ${meta.holo.atomCount} 原子` : ""}
                {meta.holo.chains.length ? ` · ${meta.holo.chains.join("/")} 链` : ""}）
                {meta.ligands.length > 0 && (
                  <>；配体 {meta.ligands.filter((l) => l.pocketRelevant).map((l) => l.id).join(" + ") || "—"}</>
                )}
              </p>
              {meta.apo && (
                <p>
                  <b>APO</b>　{meta.apo.pdbId}（{methodLabel(meta.apo.method)} {meta.apo.resolution ?? "—"} Å ·{" "}
                  {organismLabel(meta.apo.organismRaw)}
                  {meta.apo.atomCount ? ` · ${meta.apo.atomCount} 原子` : ""}）
                </p>
              )}
              <p className="muted">
                资产版本 {meta.assetVersion}；口袋 ≤{meta.criteria.dist} Å、氢键 ≤{meta.criteria.hbond} Å，
                全部离线计算（{meta.provenance}）。 caveats 已在上方旗标逐条列出。
              </p>
            </div>
          )}
        </div>
      )}

      {phase === "ready" && (
        <Link className="d-3dlink" to={`/step/${stepId}`}>
          在详情页中查看（apo/holo 切换 · 残基表） →
        </Link>
      )}
    </div>
  );
}
