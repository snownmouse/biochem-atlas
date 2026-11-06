// ============================================================
// Molecule3D —— 结构对照页的分子 3D 球棍（可旋转）
//
// 口径：
//   · 资产是离线生成的 JSON（原子坐标 + 键级 + 元素 + 来源 + 体积），运行时零几何计算；
//   · 来源分两类，标签必须一眼可分：实验坐标（PDB ID/分辨率/物种）青标；计算构象（ETKDG+MMFF94）琥珀标；
//   · 变化原子按 stepComparison 的 marks 高亮：砖红=新增基团、青=新键/换位、琥珀=离去基；
//   · 懒加载：进入视口 ±800px 才起 WebGL；离开该范围立即销毁画布并主动丢弃 WebGL 上下文，
//     避免十步 × 两侧二十多个上下文把浏览器配额打爆。
// ============================================================
import { useEffect, useRef, useState } from "react";
import { ATOM_PALETTE_JSON, atomColor, atomColorFunc } from "../data/atomColors";

export interface Mol3DAtom { id: number; el: string; name?: string; x: number; y: number; z: number; charge?: number }
export interface Mol3DProvenance {
  kind: "experimental" | "computed";
  pdbId?: string;
  resolution?: number;
  method?: string;
  species?: string;
  /** 实验配体所在链（如 "A"） */
  chain?: string;
  /** 实验配体 resname（如 "OAA"） */
  resname?: string;
  /** 实验来源蛋白（写入 meta，不挤占页面角标） */
  protein?: string;
  sdf?: string;
  note?: string;
  conformerCount?: number;
  energyKcalMol?: number;
  randomSeed?: number;
}
export interface Mol3DAsset {
  id: string;
  name: string;
  formula: string;
  smiles: string;
  form: string;
  molecularWeight: number;
  provenance: Mol3DProvenance;
  shape: { vdwVolumeA3: number; axesA: number[]; maxExtentA: number };
  atoms: Mol3DAtom[];
  bonds: { a: number; b: number; order: number }[];
  caveats: string[];
  /** 分块呈现：只画反应端，省略部分在数据里写明（不冒充完整分子） */
  fragment?: { kind: "block"; shown: string; omitted: string; note: string };
  /** 图上叠的一个短标签（分块资产用来标「CoA 略」） */
  label?: { text: string; atomId: number };
}
export interface MolMark { name: string; kind: "added" | "newbond" | "leaving"; note?: string }

export const MARK_COLOR: Record<string, string> = {
  added: "#9c4a3c",
  newbond: "#2e6e6b",
  leaving: "#b4761f",
};
export const MARK_LABEL: Record<string, string> = {
  added: "新增基团",
  newbond: "新键 / 换位",
  leaving: "离去基",
};

/** 3D JSON → SDF V2000 文本（3dmol 直接解析；运行时只拼字符串，不做化学计算） */
function toSdf(asset: Mol3DAsset) {
  const L: string[] = [asset.name, "  generated-by gen-molecule-assets.py", ""];
  // 计数行必须是 39 字符、且 "V2000" 落在第 34–38 位：3dmol 的 SDF 解析器用
  // lines[3].substring(34, 39) 判格式，多一个空格或字段就会被判成未知格式并返回空模型。
  L.push(
    `${asset.atoms.length.toString().padStart(3)}${asset.bonds.length.toString().padStart(3)}` +
      "  0  0  0  0  0  0  0  0999 V2000"
  );
  for (const a of asset.atoms) {
    L.push(
      `${a.x.toFixed(4).padStart(10)}${a.y.toFixed(4).padStart(10)}${a.z.toFixed(4).padStart(10)} ` +
        `${a.el.padEnd(3)} 0  0  0  0  0  0  0  0  0  0  0  0`
    );
  }
  for (const b of asset.bonds) {
    L.push(`${b.a.toString().padStart(3)}${b.b.toString().padStart(3)}${b.order.toString().padStart(3)}  0  0  0  0`);
  }
  const charged = asset.atoms.filter((a) => a.charge);
  if (charged.length) {
    L.push(`M  CHG${charged.length.toString().padStart(3)}` + charged.map((a) => `${a.id.toString().padStart(4)}${a.charge!.toString().padStart(4)}`).join(""));
  }
  L.push("M  END");
  return L.join("\n");
}

export function mol3dSourceText(p: Mol3DProvenance) {
  if (p.kind === "experimental") {
    const method = p.method
      ? p.method === "ELECTRON MICROSCOPY"
        ? "cryo-EM"
        : p.method === "X-RAY DIFFRACTION"
          ? "X-ray"
          : p.method
      : null;
    const parts = [`实验坐标`, `PDB ${p.pdbId ?? "—"}`, `${p.resolution ?? "—"} Å`];
    if (method) parts.push(method);
    if (p.species) parts.push(p.species);
    if (p.chain) parts.push(`链 ${p.chain}`);
    if (p.resname) parts.push(`配体 ${p.resname}`);
    return parts.join(" · ");
  }
  return `计算构象 · 自由态，不等于结合态 · ETKDGv3 + MMFF94 · ${p.conformerCount ?? "—"} 构象 · 最低 ${p.energyKcalMol ?? "—"} kcal/mol`;
}

export default function Molecule3D({ asset, marks }: { asset: Mol3DAsset | null; marks?: MolMark[] }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const hostRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<any>(null);
  /** 初始化完成时的完整相机 view，供「重置视角」原样还原 */
  const initViewRef = useRef<any>(null);
  const [visible, setVisible] = useState(false);
  /** 实际落到 3D 上的高亮原子数（selector 命中才算；0 表示模型里找不到该原子名） */
  const [applied, setApplied] = useState(0);
  /** 相机已就绪：ref 变化不触发渲染，重置按钮需要 state 才可靠出现 */
  const [ready, setReady] = useState(false);

  const kill = () => {
    setReady(false);
    const host = hostRef.current;
    const viewer = viewerRef.current;
    if (viewer) {
      try {
        viewer.clear();
      } catch {
        /* 已失效的 viewer 忽略 */
      }
      try {
        const canvas: HTMLCanvasElement | null = host?.querySelector("canvas") ?? null;
        const gl: WebGLRenderingContext | null =
          canvas ? (canvas.getContext("webgl") as WebGLRenderingContext | null) : null;
        gl?.getExtension("WEBGL_lose_context")?.loseContext();
      } catch {
        /* 上下文已丢失时忽略 */
      }
    }
    viewerRef.current = null;
    initViewRef.current = null;
    if (host) host.innerHTML = "";
  };

  // 视口 ±800px 内才保留 WebGL；离开即销毁
  useEffect(() => {
    const el = wrapRef.current;
    if (!el || typeof IntersectionObserver === "undefined") {
      setVisible(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        const on = entries.some((e) => e.isIntersecting);
        setVisible(on);
        if (!on) kill();
      },
      { rootMargin: "800px 0px" }
    );
    io.observe(el);
    return () => {
      io.disconnect();
      kill();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 起 3D / 高亮
  useEffect(() => {
    if (!visible || !asset) return;
    let cancelled = false;
    let viewer: any = null;
    let hostEl: HTMLDivElement | null = null;
    let capture: (() => void) | null = null;
    (async () => {
      try {
        const $3Dmol: any = await import("3dmol");
        if (cancelled) return;
        const host = hostRef.current;
        if (!host) return;
        hostEl = host;
        kill();
        host.innerHTML = "";
        viewer = $3Dmol.createViewer(host, { backgroundColor: "#f6f3ec", antialias: true });
        viewerRef.current = viewer;
        const model = viewer.addModel(toSdf(asset), "sdf");
        model.setStyle(
          {},
          {
            // 统一原子配色：逐原子取色，不使用 3dmol 内置 Jmol / defaultCarbon
            stick: { radius: 0.11, colorfunc: atomColorFunc },
            sphere: { scale: 0.2, colorfunc: atomColorFunc },
          }
        );
        // 分块资产：在省略点旁边叠一个短标签（如「CoA 略」），不添加任何虚构原子
        if (asset.label) {
          const at = asset.atoms.find((a) => a.id === asset.label!.atomId);
          if (at) {
            viewer.addLabel(asset.label.text, {
              position: { x: at.x, y: at.y, z: at.z },
              fontSize: 11,
              fontColor: "#22282a",
              backgroundColor: "#f6f3ec",
              backgroundOpacity: 0.9,
              showBackground: true,
            });
          }
        }
        const byName = new Map<string, Mol3DAtom>();
        for (const a of asset.atoms) if (a.name) byName.set(a.name, a);
        let appliedN = 0;
        for (const m of marks ?? []) {
          const at = byName.get(m.name);
          if (!at) continue;
          // 用与 setStyle 相同的 AtomSpec 先验证命中：命中 1 个才说明高亮真的落到了原子，
          // 而不是名字写错时静默跳过。
          if (model.selectedAtoms({ index: at.id - 1 }).length !== 1) continue;
          appliedN += 1;
          // 氢永远用氢色：即使标注命中 H，也不让高亮色接管（高亮只作用于重原子与键）
          const color = at.el?.toUpperCase() === "H" ? atomColor(at.el) : MARK_COLOR[m.kind] ?? "#9c4a3c";
          model.setStyle(
            { index: at.id - 1 },
            {
              stick: { color, radius: 0.17 },
              sphere: { color, scale: 0.4 },
            }
          );
        }
        setApplied(appliedN);
        viewer.resize();
        viewer.zoomTo();
        viewer.zoom(0.92);
        viewer.render();
        // 初始相机写入 data-view-init；拖动后与重置后的当前相机写入 data-view，
        // 供无头浏览器直接比对（不改业务、不挂 window 全局）。
        if (wrapRef.current) {
          initViewRef.current = viewer.getView();
          wrapRef.current.dataset.viewInit = JSON.stringify(initViewRef.current);
          wrapRef.current.dataset.view = wrapRef.current.dataset.viewInit;
        }
        const captureFn = () => {
          try {
            if (wrapRef.current) wrapRef.current.dataset.view = JSON.stringify(viewer.getView());
          } catch {
            /* viewer 已失效 */
          }
        };
        host.addEventListener("pointerup", captureFn);
        host.addEventListener("mouseup", captureFn);
        host.addEventListener("mousemove", captureFn);
        host.addEventListener("wheel", captureFn, { passive: true });
        capture = captureFn;
        setReady(true);
      } catch {
        /* 3D 不可用：保留来源行与体积数字，不阻塞页面 */
      }
    })();
    return () => {
      cancelled = true;
      if (hostEl && capture) {
        hostEl.removeEventListener("pointerup", capture);
        hostEl.removeEventListener("mouseup", capture);
        hostEl.removeEventListener("mousemove", capture);
        hostEl.removeEventListener("wheel", capture);
      }
      if (viewer) {
        try {
          viewer.clear();
        } catch {
          /* ignore */
        }
      }
    };
  }, [visible, asset, marks]);

  /** 回到初始相机：还原初始化时记录的完整 view（旋转 + 平移 + 缩放），不刷新页面 */
  const resetView = () => {
    const v = viewerRef.current;
    if (!v) return;
    try {
      if (initViewRef.current) v.setView(initViewRef.current);
      else {
        v.zoomTo();
        v.zoom(0.92);
      }
      v.render();
      if (wrapRef.current) wrapRef.current.dataset.view = JSON.stringify(v.getView());
    } catch {
      /* viewer 已失效 */
    }
  };

  const prov = asset?.provenance;
  const nameSet = new Set((asset?.atoms ?? []).map((a) => a.name).filter(Boolean) as string[]);
  const atomByName = new Map((asset?.atoms ?? []).filter((a) => a.name).map((a) => [a.name as string, a]));
  const markColorFor = (m: MolMark) => {
    const el = atomByName.get(m.name)?.el;
    return el?.toUpperCase() === "H" ? atomColor(el) : MARK_COLOR[m.kind] ?? "#9c4a3c";
  };
  return (
    <div
      className="mol3d"
      ref={wrapRef}
      data-testid="mol-3d"
      data-mol-id={asset?.id ?? "loading"}
      data-atom-palette={ATOM_PALETTE_JSON}
      data-marks-total={marks?.length ?? 0}
      data-marks-applied={marks && marks.length ? applied : undefined}
    >
      <div className="mol3d-stage">
        {!asset && <div className="mol3d-state">3D 资产加载中…</div>}
        {asset && !visible && <div className="mol3d-state">3D 待载入（滚动到此处自动加载）</div>}
        <div ref={hostRef} className="mol3d-host" data-testid="mol-3d-host" />
        {asset && visible && <span className="mol3d-hint mol3d-hint-left">拖动旋转</span>}
        {asset && visible && ready && (
          <button
            type="button"
            className="mol3d-reset"
            data-testid="mol3d-reset"
            onClick={resetView}
            title="回到初始相机位置与缩放"
          >
            重置视角
          </button>
        )}
      </div>
      {asset && prov && (
        <div className="mol3d-foot">
          <span className={`mol3d-prov ${prov.kind}`} data-testid="mol-3d-source">
            {mol3dSourceText(prov)}
          </span>
          <span className="mol3d-shape num" data-testid="mol-3d-shape">
            范德华体积 {asset.shape.vdwVolumeA3} Å³ · 主轴 {asset.shape.maxExtentA} Å
          </span>
        </div>
      )}
      {asset && marks && marks.length > 0 && (
        <ul className="mol3d-marks" data-testid="mol-3d-marks">
          {marks.map((m, i) => (
            <li
              key={`${m.name}-${i}`}
              data-mark-kind={m.kind}
              data-mark-name={m.name}
              data-mark-color={markColorFor(m)}
              data-mark-found={nameSet.has(m.name) ? "1" : "0"}
            >
              <i style={{ background: markColorFor(m) }} />
              <span className="num">{m.name}</span>
              <span>{MARK_LABEL[m.kind]}</span>
              {m.note && <em>{m.note}</em>}
              {!nameSet.has(m.name) && <em className="mol3d-miss">3D 资产中无此原子</em>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
