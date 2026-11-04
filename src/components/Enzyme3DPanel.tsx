// ============================================================
// Enzyme3DPanel —— 结构对照页左侧的"酶 3D 静置卡通"
//
// 口径：只回答「这一步是哪个酶、口袋在哪、哪些残基在界面」。
//   · 静态：不播放、不做构象过渡、不做门控残基动态点亮；
//   · 可旋转（3dmol 默认拖动/滚轮）；
//   · 点残基 → 高亮 + 按距离显示该残基的氢键（静态虚线，非动画）；
//   · 配体棒状模型默认关闭，由「显示配体位置」开关叠加（避免小分子抢注意力）。
// 懒加载：区块进入视口（提前 300px）才拉 PDB / 起 WebGL；低性能设备需手动点击。
// ============================================================
import { useCallback, useEffect, useRef, useState } from "react";
import {
  fetchJson,
  fetchText,
  hasWebGL,
  hbondLigandAtom,
  lowPowerDevice,
  methodLabel,
  normalizeMeta,
  organismLabel,
  TYPE_COLOR,
  TYPE_LABEL,
  type NormMeta,
  type Pocket,
} from "../data/step3d";
import { ATOM_PALETTE_JSON, atomColorFunc } from "../data/atomColors";

type Phase = "idle" | "loading" | "gated" | "ready" | "degraded";

export default function Enzyme3DPanel({ stepId, assetDir }: { stepId: string; assetDir: string }) {
  const base = `/assets/steps/${assetDir}`;
  const wrapRef = useRef<HTMLDivElement>(null);
  const hostRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<any>(null);
  const modelRef = useRef<any>(null);
  const ligandModelsRef = useRef<any[]>([]);
  const readyRef = useRef(false);
  const attemptRef = useRef(0);

  const [visible, setVisible] = useState(false);
  const [phase, setPhase] = useState<Phase>("idle");
  const [msg, setMsg] = useState("");
  const [meta, setMeta] = useState<NormMeta | null>(null);
  const [pocket, setPocket] = useState<Pocket | null>(null);
  const [selResi, setSelResi] = useState<number | null>(null);
  const [ligandOn, setLigandOn] = useState(false);
  const [ligandCount, setLigandCount] = useState(0);

  /* ---------- 视口懒加载：到了附近才起 3D ---------- */
  useEffect(() => {
    const el = wrapRef.current;
    if (!el || visible) return;
    if (typeof IntersectionObserver === "undefined") {
      setVisible(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setVisible(true);
          io.disconnect();
        }
      },
      { rootMargin: "300px 0px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [visible]);

  /* ---------- 拉 meta + pocket ---------- */
  useEffect(() => {
    if (!visible) return;
    let alive = true;
    setPhase("loading");
    Promise.all([fetchJson<any>(`${base}/meta.json`), fetchJson<Pocket>(`${base}/pocket.json`)])
      .then(([m, p]) => {
        if (!alive) return;
        setMeta(normalizeMeta(m));
        setPocket(p);
        setPhase(lowPowerDevice() ? "gated" : "loading");
      })
      .catch(() => {
        if (!alive) return;
        setPhase("degraded");
        setMsg("3D 资产缺失或加载失败");
      });
    return () => {
      alive = false;
    };
  }, [visible, base]);

  const pickResidue = useCallback(
    (resi: number) => {
      if (!pocket) return;
      const next = selResi === resi ? null : resi;
      setSelResi(next);
      const viewer = viewerRef.current;
      const model = modelRef.current;
      if (!viewer || !model) return;
      const pocketResis = pocket.residues.map((r) => r.resi);
      model.setStyle({ resi: pocketResis }, { cartoon: { color: "#c17a4a" } });
      if (next !== null) {
        model.setStyle(
          { resi: next },
          { cartoon: { color: "#7a2e0e" }, stick: { radius: 0.24, colorfunc: atomColorFunc } }
        );
      }
      // 氢键虚线：只画选中残基的，按离线算好的距离（静态，不随时间变化）
      try {
        viewer.removeAllShapes?.();
      } catch {
        /* viewer 已销毁时忽略 */
      }
      if (next !== null) {
        for (const hb of pocket.hbonds.filter((h) => h.prot.resi === next)) {
          const partner = hbondLigandAtom(hb);
          if (!partner) continue;
          try {
            viewer.addLine({
              dashed: true,
              color: "#2e6e6b",
              start: { x: hb.prot.x, y: hb.prot.y, z: hb.prot.z },
              end: { x: partner.x, y: partner.y, z: partner.z },
            });
          } catch {
            /* 单条失败不影响其余 */
          }
        }
      }
      viewer.render();
    },
    [pocket, selResi]
  );

  /* ---------- 起 3D（静态卡通 + 口袋残基） ---------- */
  const start3D = useCallback(async () => {
    if (!meta || !pocket) return;
    const attempt = ++attemptRef.current;
    readyRef.current = false;
    setPhase("loading");
    const timer = window.setTimeout(() => {
      if (!readyRef.current && attempt === attemptRef.current) {
        setPhase("degraded");
        setMsg("3D 初始化超时（8 秒）");
      }
    }, 8000);
    try {
      if (!hasWebGL()) throw new Error("WebGL 不可用");
      const $3Dmol: any = await import("3dmol");
      if (attempt !== attemptRef.current) return;
      const pdbText = await fetchText(`${base}/holo.pdb`);
      if (attempt !== attemptRef.current) return;
      const host = hostRef.current;
      if (!host) return;
      let viewer = viewerRef.current;
      if (!viewer) {
        host.innerHTML = "";
        viewer = $3Dmol.createViewer(host, { backgroundColor: "white", antialias: true });
        viewerRef.current = viewer;
      }
      viewer.clear();
      const model = viewer.addModel(pdbText, "pdb");
      modelRef.current = model;
      model.setStyle(
        {},
        {
          cartoon: {
            colorfunc: (atom: any) =>
              atom.ss === "h" ? "#8fae8b" : atom.ss === "s" ? "#93a6c4" : "#d9d4c7",
          },
        }
      );
      const pocketResis = pocket.residues.map((r) => r.resi);
      model.setStyle({ resi: pocketResis }, { cartoon: { color: "#c17a4a" } });
      viewer.setClickable({ resi: pocketResis }, true, (atom: any) => {
        if (atom?.resi) pickResidue(atom.resi as number);
      });
      viewer.zoomTo({ resi: pocketResis }, 0);
      viewer.render();
      readyRef.current = true;
      window.clearTimeout(timer);
      setPhase("ready");
    } catch (e) {
      window.clearTimeout(timer);
      if (attempt !== attemptRef.current) return;
      setPhase("degraded");
      setMsg(e instanceof Error ? e.message : String(e));
    }
  }, [base, meta, pocket, pickResidue]);

  useEffect(() => {
    if (!meta || !pocket) return;
    if (phase === "gated" || phase === "degraded" || phase === "idle") return;
    if (viewerRef.current && readyRef.current) return;
    void start3D();
  }, [meta, pocket, phase, start3D]);

  /* ---------- 配体叠加开关（默认关） ---------- */
  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer || !meta || phase !== "ready") return;
    let alive = true;
    const apply = async () => {
      if (ligandOn) {
        for (const lg of meta.ligands) {
          if (!lg.sdf || !lg.pocketRelevant) continue;
          try {
            const text = await fetchText(`${base}/${lg.sdf}`);
            if (!alive) return;
            const lig = viewer.addModel(text, "sdf");
            // 与结构对照页同一张原子配色表：同一分子在两页颜色一致
            lig.setStyle({}, { stick: { radius: 0.2, colorfunc: atomColorFunc } });
            ligandModelsRef.current.push(lig);
          } catch {
            /* 单个配体 SDF 缺失时跳过，不影响其余 */
          }
        }
      } else {
        for (const m of ligandModelsRef.current) {
          try {
            viewer.removeModel(m);
          } catch {
            /* viewer 已重建时忽略 */
          }
        }
        ligandModelsRef.current = [];
      }
      if (alive) setLigandCount(ligandOn ? ligandModelsRef.current.length : 0);
      viewer.render();
    };
    void apply();
    return () => {
      alive = false;
    };
  }, [ligandOn, base, meta, phase]);

  useEffect(() => {
    return () => {
      attemptRef.current++;
      viewerRef.current = null;
      modelRef.current = null;
      ligandModelsRef.current = [];
    };
  }, []);

  const source = meta
    ? `PDB ${meta.holo.pdbId} · ${meta.holo.resolution ?? "—"} Å · ${methodLabel(meta.holo.method)} · ${organismLabel(
        meta.holo.organismRaw
      )}`
    : "结构来源加载中";
  const selRow = pocket?.residues.find((r) => r.resi === selResi) ?? null;

  return (
    <div className="e3d" ref={wrapRef} data-testid="enzyme-3d" data-step-id={stepId}>
      <div className="e3d-stage">
        {phase === "idle" && <div className="e3d-state">3D 视图待载入（滚动到本步时自动加载）</div>}
        {phase === "loading" && <div className="e3d-state">3D 视图加载中……</div>}
        {phase === "gated" && (
          <div className="e3d-state">
            <p>检测到低性能设备，默认不自动加载 3D。</p>
            <button className="e3d-btn" onClick={() => setPhase("loading")}>加载 3D 视图</button>
          </div>
        )}
        {phase === "degraded" && (
          <div className="e3d-state" data-testid="enzyme-3d-degraded">
            <p>3D 视图不可用：{msg}。</p>
            <button className="e3d-btn" onClick={() => setPhase("loading")}>重试 3D</button>
          </div>
        )}
        <div
          ref={hostRef}
          className={`e3d-host${phase === "ready" ? "" : " hidden"}`}
          data-testid="enzyme-3d-host"
          data-atom-colors={ATOM_PALETTE_JSON}
        />
        {phase === "ready" && <span className="e3d-hint">拖动旋转 · 滚轮缩放 · 点残基高亮</span>}
      </div>

      <div className="e3d-bar">
        <span className="e3d-src num" data-testid="enzyme-3d-source">{source}</span>
        <button
          className="e3d-toggle"
          data-testid="ligand-toggle"
          aria-pressed={ligandOn}
          disabled={phase !== "ready"}
          onClick={() => setLigandOn((v) => !v)}
        >
          {ligandOn ? "隐藏配体位置" : "显示配体位置"}
        </button>
        <span className="e3d-ligcount num" data-testid="ligand-count">
          {ligandOn ? `配体实例 ${ligandCount}` : "配体未叠加"}
        </span>
      </div>
      <p className="e3d-say">静态结构：本页不播放构象过渡，也不演示配体进入口袋；3D 只交代折叠与口袋位置。</p>

      {pocket && (
        <div className="e3d-strip" data-testid="residue-strip">
          {pocket.residues.map((r) => (
            <button
              key={r.resi}
              className={`e3d-chip${selResi === r.resi ? " sel" : ""}`}
              data-resi={r.resi}
              onClick={() => pickResidue(r.resi)}
            >
              <span className="dot" style={{ background: TYPE_COLOR[r.type] }} />
              <span className="num">{r.resn} {r.resi}</span>
              <span className="dist num">{r.minDist.toFixed(2)} Å</span>
            </button>
          ))}
        </div>
      )}
      {selRow && (
        <p className="e3d-selnote num" data-testid="residue-note">
          {selRow.resn} {selRow.resi}（{selRow.chain} 链）· 最近 {selRow.minDist.toFixed(2)} Å · {TYPE_LABEL[selRow.type]}
          {(() => {
            const rows = (pocket?.hbonds ?? []).filter((h) => h.prot.resi === selRow.resi);
            return rows.length
              ? ` · 氢键 ${rows.length} 条 ${rows.map((h) => `${h.dist.toFixed(2)} Å`).join("、")}`
              : " · 该残基无氢键记录";
          })()}
        </p>
      )}
    </div>
  );
}
