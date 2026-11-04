// ============================================================
// SolubleDomain3D —— 氧化磷酸化页的可溶结构域 3D 面板
//
// 只用于真正可溶、体量可控的结构：
//   · 人细胞色素 c（3ZCF A 链，1.65 Å）
//   · 牛心 F1-ATPase 催化头部（1BMF，2.85 Å）
// 膜复合体（I / II / III / IV 与 F0）不做 3D，见挂图模块说明。
// 与 Enzyme3DPanel 同一套懒加载纪律：进入视口前不请求资产、不起 WebGL；
// 低性能设备默认停在山门，用户手动加载。
// ============================================================
import { useEffect, useRef, useState } from "react";
import { fetchJson, fetchText, hasWebGL, lowPowerDevice } from "../data/step3d";
import { atomColorFunc } from "../data/atomColors";

type Phase = "idle" | "loading" | "gated" | "ready" | "degraded";

interface AssetMeta {
  assetId: string;
  pdbId: string;
  title: string;
  species: string;
  speciesZh: string;
  method: string;
  resolution: number;
  chains: string;
  ligands: string[];
  atoms: string;
  note: string;
  source: string;
}

const CHAIN_COLOR: Record<string, Record<string, string>> = {
  cytc: { A: "#8fae8b" },
  f1: {
    A: "#b9b2a2",
    C: "#b9b2a2",
    E: "#b9b2a2",
    B: "#a9b8a4",
    D: "#a9b8a4",
    F: "#a9b8a4",
    G: "#c99a52",
  },
};

const LIGAND_RES: Record<string, string[]> = {
  cytc: ["HEC"],
  f1: ["ADP", "ANP", "MG"],
};

export default function SolubleDomain3D({ asset }: { asset: "cytc" | "f1" }) {
  const base = `/assets/oxphos/${asset}`;
  const wrapRef = useRef<HTMLDivElement>(null);
  const hostRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<any>(null);
  const modelRef = useRef<any>(null);
  const readyRef = useRef(false);
  const attemptRef = useRef(0);

  const [visible, setVisible] = useState(false);
  const [phase, setPhase] = useState<Phase>("idle");
  const [msg, setMsg] = useState("");
  const [meta, setMeta] = useState<AssetMeta | null>(null);
  const [ligandOn, setLigandOn] = useState(true);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el || visible) return;
    if (typeof IntersectionObserver === "undefined") {
      setVisible(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setVisible(true);
          io.disconnect();
        }
      },
      { rootMargin: "300px 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [visible]);

  useEffect(() => {
    if (!visible) return;
    let alive = true;
    setPhase("loading");
    fetchJson<AssetMeta>(`${base}/meta.json`)
      .then((data) => {
        if (!alive) return;
        setMeta(data);
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

  const start3D = async () => {
    if (!meta) return;
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
      const pdbText = await fetchText(`${base}/model.pdb`);
      if (attempt !== attemptRef.current) return;
      const host = hostRef.current;
      if (!host) return;
      let viewer = viewerRef.current;
      if (!viewer) {
        host.innerHTML = "";
        viewer = $3Dmol.createViewer(host, { backgroundColor: "#f6f3ec", antialias: true });
        viewerRef.current = viewer;
      }
      viewer.clear();
      const model = viewer.addModel(pdbText, "pdb");
      modelRef.current = model;
      const colors = CHAIN_COLOR[asset];
      model.setStyle(
        {},
        {
          cartoon: {
            colorfunc: (atom: any) => colors[atom.chain] ?? "#b9b2a2",
          },
        },
      );
      const resn = LIGAND_RES[asset];
      model.setStyle({ resn, hetflag: true }, { stick: { radius: 0.22, colorfunc: atomColorFunc } });
      viewer.zoomTo({ resn, hetflag: true }, 120);
      viewer.spin("y", 0.6);
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
  };

  useEffect(() => {
    if (!meta) return;
    if (phase !== "loading") return;
    if (viewerRef.current && readyRef.current) return;
    void start3D();
    // start3D 只依赖当前资产与 meta；这里按 phase 触发即可
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [meta, phase]);

  useEffect(() => {
    const viewer = viewerRef.current;
    const model = modelRef.current;
    if (!viewer || !model || phase !== "ready") return;
    const resn = LIGAND_RES[asset];
    model.setStyle({ resn, hetflag: true }, ligandOn ? { stick: { radius: 0.22, colorfunc: atomColorFunc } } : {});
    viewer.render();
  }, [ligandOn, asset, phase]);

  useEffect(() => {
    return () => {
      attemptRef.current++;
      viewerRef.current = null;
      modelRef.current = null;
    };
  }, []);

  const source = meta
    ? `PDB ${meta.pdbId} · ${meta.resolution} Å · ${meta.method} · ${meta.species}`
    : "结构来源加载中";

  return (
    <div className="e3d" ref={wrapRef} data-testid="soluble-3d" data-asset={asset}>
      <div className="e3d-stage">
        {phase === "idle" && <div className="e3d-state">3D 视图待载入（滚动到本区时自动加载）</div>}
        {phase === "loading" && <div className="e3d-state">3D 视图加载中……</div>}
        {phase === "gated" && (
          <div className="e3d-state">
            <p>检测到低性能设备，默认不自动加载 3D。</p>
            <button className="e3d-btn" onClick={() => setPhase("loading")}>加载 3D 视图</button>
          </div>
        )}
        {phase === "degraded" && (
          <div className="e3d-state">
            <p>3D 视图不可用：{msg}。</p>
            <button className="e3d-btn" onClick={() => setPhase("loading")}>重试 3D</button>
          </div>
        )}
        <div ref={hostRef} className={`e3d-host${phase === "ready" ? "" : " hidden"}`} />
        {phase === "ready" && <span className="e3d-hint">拖动旋转 · 滚轮缩放</span>}
      </div>
      <div className="e3d-bar">
        <span className="e3d-src num" data-testid="soluble-3d-source">{source}</span>
        <button
          className="e3d-toggle"
          aria-pressed={ligandOn}
          disabled={phase !== "ready"}
          onClick={() => setLigandOn((value) => !value)}
        >
          {ligandOn ? "隐藏配体" : "显示配体"}
        </button>
      </div>
      {meta && (
        <>
          <p className="e3d-say" data-testid="soluble-3d-meta">
            {meta.chains} · {meta.speciesZh}源 · 配体：{meta.ligands.join("、")} · {meta.atoms}
          </p>
          <p className="e3d-say" data-testid="soluble-3d-note">{meta.note}</p>
        </>
      )}
    </div>
  );
}
