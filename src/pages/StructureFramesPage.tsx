// ============================================================
// StructureFramesPage —— 结构对照页 /structures/:pathwayId
//
// 本轮口径（页头一个开关，整页在 3D 球棍 / 2D 结构式之间切换）：
//   · 每步：左=酶的 3D 静置卡通（静态、可旋转、点残基高亮）；右=底物 → 箭头 → 产物；
//   · 切换时版式不重排：两种模式共用同一套 .cmp3d-side / .cmp-mol-head / .mol3d-stage /
//     .mol3d-foot / .mol3d-marks 盒子，只换 stage 里的渲染方式；
//   · 2D 在格子内按像素重排（坐标等比映射 + 固定像素字号），不是把缩略图拉大；
//   · 变化标注两模式都保留：3D 高亮原子，2D 圈注同名原子（不随手画圈，找不到就显形）；
//   · 来源逐条标注：实验坐标（PDB/分辨率/物种）青标，计算构象（ETKDG+MMFF94）琥珀标，绝不混标；
//   · 不播任何动画：酶构象过渡、配体进入口袋、播放时间轴一律不做。
//
// 数据：src/data/comparisonConfig.ts（按 pathwayId 取配置；糖酵解原样搬入，TCA 新增）
//       酶结构：/assets/steps/manifest.json 按 stepId 解析（TCA 无酶资产，enzymePanel=false）
//       分子 3D：/assets/ligands3d/<id>.json（tools/gen-molecule-assets.py）
//       分子 2D：/assets/structures/2d/<id>.json（RDKit 生成 + 既有手绘资产）
// ============================================================
import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom";
import Enzyme3DPanel from "../components/Enzyme3DPanel";
import Molecule3D, { MARK_COLOR, MARK_LABEL, mol3dSourceText, type Mol3DAsset, type MolMark } from "../components/Molecule3D";
import { atomColor } from "../data/atomColors";
import {
  comparisonConfigFor,
  hasBothSides,
  hasBothSides3D,
  type ComparisonConfig,
} from "../data/comparisonConfig";
import type { ChemSide, MolPart, StepComparison } from "../data/stepComparison";
import {
  GRADE_FILTER_LABEL,
  GRADE_FILTER_TOKENS,
  GRADE_LABEL,
  gradesForStep,
  matchesGradeFilter,
  parseGradeFilter,
  serializeGradeFilter,
  type BlockGrade,
  type EvidenceGrade,
  type GradeFilterToken,
  type SideGrade,
} from "../data/evidenceGrade";
import { loadStepManifest, resolveStepAsset, stepAssets, type StepAssetCfg } from "../data/stepAssets";
import PathwaySwitcher from "../components/PathwaySwitcher";
import ContentBubble from "../components/ContentBubble";
import { structureBubbleModel } from "../lib/bubbleModel";
import type { NavItemId } from "../data/pathways";
import "../styles/frames-entry.css";

type Mode = "2d" | "3d";
/** auto = 不改 URL、逐块按配置的 defaultMode 呈现；2d/3d = URL 显式覆盖整页 */
type ModeChoice = Mode | "auto";

/** 2D 结构式资产（tools/gen-molecule-assets.py 生成）：纸白底 + 线描结构式，碳为隐式顶点 */
interface Frame2DAtom { id: number; el: string; x: number; y: number; label?: string; charge?: string }
interface Frame2DBond { a: number; b: number; order?: 1 | 2 }
interface Frame2DAsset {
  frameId: string;
  kind: "2d";
  view: { w: number; h: number };
  atoms: Frame2DAtom[];
  bonds: Frame2DBond[];
  wedge?: { a: number; b: number }[];
  annotations?: { x: number; y: number; text: string }[];
}

const HET = new Set(["O", "N", "S", "P"]);
/** 2D 格子内重排的固定像素画布宽（实际宽度与之接近，等比缩放误差 <1px） */
const M2D_W = 246;
const M2D_PAD = 16;
const M2D_H_SINGLE = 250;
const M2D_H_DUO = 168;

/** 2D 资产没有逐原子 name 字段，这里按同一套命名规则从拓扑反推：
 *  C 用 label（C1..C6）；P 用 label（P6）或 P–O–C{n} 推断 P{n}；
 *  O 仅在该 O 同时连 C{n} 与 P 时命名 O{n}；S 恒为 S。
 *  推不出来就不命名 —— 页面显形「2D 图中无此原子」，绝不随手画圈。 */
function names2dOf(asset: Frame2DAsset): Map<number, string> {
  const byId = new Map(asset.atoms.map((a) => [a.id, a]));
  const nbrs = new Map<number, number[]>();
  for (const b of asset.bonds) {
    if (!nbrs.has(b.a)) nbrs.set(b.a, []);
    if (!nbrs.has(b.b)) nbrs.set(b.b, []);
    nbrs.get(b.a)!.push(b.b);
    nbrs.get(b.b)!.push(b.a);
  }
  const out = new Map<number, string>();
  for (const a of asset.atoms) {
    if (a.el === "C") {
      const m = /^C(\d+)/.exec(a.label ?? "");
      if (m) out.set(a.id, `C${m[1]}`);
    } else if (a.el === "P") {
      const m = /^P(\d+)/.exec(a.label ?? "");
      if (m) {
        out.set(a.id, `P${m[1]}`);
        continue;
      }
      for (const nid of nbrs.get(a.id) ?? []) {
        const n = byId.get(nid);
        if (!n || n.el !== "O") continue;
        for (const n2id of nbrs.get(nid) ?? []) {
          const c = byId.get(n2id);
          if (!c || c.el !== "C") continue;
          const cm = /^C(\d+)/.exec(c.label ?? "");
          if (cm) {
            out.set(a.id, `P${cm[1]}`);
            break;
          }
        }
        if (out.has(a.id)) break;
      }
    } else if (a.el === "O") {
      let hasP = false;
      let name: string | null = null;
      for (const nid of nbrs.get(a.id) ?? []) {
        const n = byId.get(nid);
        if (!n) continue;
        if (n.el === "P") hasP = true;
        if (n.el === "C") {
          const m = /^C(\d+)/.exec(n.label ?? "");
          if (m) name = `O${m[1]}`;
        }
      }
      if (hasP && name) out.set(a.id, name);
    } else if (a.el === "S") {
      out.set(a.id, "S");
    } else if (a.el === "N") {
      out.set(a.id, "N");
    }
  }
  return out;
}

/** 注释按可用宽度折行；CJK 记 9px、拉丁与数字约 5px，避免长句溢出画布被裁 */
function wrapCaption(text: string, maxWidth: number, fontSize: number): string[] {
  const wOf = (ch: string) => (/[\u2e80-\u9fff\uff00-\uffef]/.test(ch) ? fontSize : /[A-Z]/.test(ch) ? fontSize * 0.68 : fontSize * 0.56);
  const lines: string[] = [];
  let cur = "";
  let curW = 0;
  for (const ch of text) {
    const w = ch === " " ? fontSize * 0.42 : wOf(ch);
    if (curW + w > maxWidth && cur) {
      const cut = cur.search(/[，。、·\s][^，。、·\s]*$/);
      if (cut > 0 && curW - (cur.length - cut) * fontSize * 0.5 > maxWidth * 0.55) {
        lines.push(cur.slice(0, cut).trim());
        cur = cur.slice(cut).trimStart();
        curW = [...cur].reduce((n, c) => n + (c === " " ? fontSize * 0.42 : wOf(c)), 0);
      } else {
        lines.push(cur.trim());
        cur = "";
        curW = 0;
      }
    }
    cur += ch;
    curW += w;
  }
  if (cur.trim()) lines.push(cur.trim());
  return lines;
}

/** 2D 结构式：在格子像素空间里重排（坐标等比映射、字号固定像素），矢量放大不模糊 */
function Molecule2D({ asset, marks, height }: { asset: Frame2DAsset; marks?: MolMark[]; height: number }) {
  const byId = useMemo(() => new Map(asset.atoms.map((a) => [a.id, a])), [asset]);
  const names = useMemo(() => names2dOf(asset), [asset]);
  const box = useMemo(() => {
    const xs = asset.atoms.map((a) => a.x);
    const ys = asset.atoms.map((a) => a.y);
    return {
      x: Math.min(...xs),
      y: Math.min(...ys),
      w: Math.max(...xs) - Math.min(...xs) || 1,
      h: Math.max(...ys) - Math.min(...ys) || 1,
    };
  }, [asset]);
  // 注释原来是 860×540 画布坐标，映射到格子后会落到画布外被裁；改为画布底部折行注脚
  const captionLines = wrapCaption(
    (asset.annotations ?? []).map((a: { text: string }) => a.text).join(" · "),
    M2D_W - M2D_PAD * 2,
    9
  );
  const captionH = captionLines.length ? captionLines.length * 11 + 6 : 0;
  const drawH = height - captionH;
  // 等比映射到格子上部（给注脚留固定高度）：留 16px 边，居中；键线/字号是像素常量
  const scale = Math.min((M2D_W - M2D_PAD * 2) / box.w, (drawH - M2D_PAD * 2) / box.h);
  const ox = (M2D_W - box.w * scale) / 2 - box.x * scale;
  const oy = (drawH - box.h * scale) / 2 - box.y * scale;
  const px = (a: Frame2DAtom) => ({ x: a.x * scale + ox, y: a.y * scale + oy });
  // 原子标签按顺序落位：先避开杂原子圆，再避开已放好的标签（相邻碳编号不再互相压字）
  const labelLayout = new Map<number, { x: number; y: number; anchor: "start" | "end" | "middle"; w: number }>();
  {
    const placed: { x0: number; x1: number; y0: number; y1: number }[] = [];
    for (const a of asset.atoms) {
      if (!a.label) continue;
      const A = px(a);
      const w = a.label.length * 5.6;
      const spots = [
        { x: A.x + 8, y: A.y - 5, anchor: "start" as const },
        { x: A.x - 8, y: A.y - 5, anchor: "end" as const },
        { x: A.x, y: A.y - 14, anchor: "middle" as const },
        { x: A.x + 8, y: A.y + 14, anchor: "start" as const },
        { x: A.x - 8, y: A.y + 14, anchor: "end" as const },
        { x: A.x, y: A.y + 20, anchor: "middle" as const },
        // 长链分子（画布 1300–1500 单位压进 246px）原子间距小于字高，近位全被占时退到更外一圈
        { x: A.x + 14, y: A.y - 18, anchor: "start" as const },
        { x: A.x - 14, y: A.y - 18, anchor: "end" as const },
        { x: A.x, y: A.y - 25, anchor: "middle" as const },
        { x: A.x + 14, y: A.y + 26, anchor: "start" as const },
        { x: A.x - 14, y: A.y + 26, anchor: "end" as const },
        { x: A.x, y: A.y + 32, anchor: "middle" as const },
      ];
      // 候选方位逐个打分：优先不压杂原子圆/既有标签/不容越界；全被占时取冲突最少的一处（不能默认压第一处）
      let chosen = spots[0];
      let bestScore = Infinity;
      for (const s of spots) {
        const left = s.anchor === "start" ? s.x : s.anchor === "end" ? s.x - w : s.x - w / 2;
        const box = { x0: left, x1: left + w, y0: s.y - 9, y1: s.y + 2 };
        const hitHet = asset.atoms.some((o) => {
          if (o.id === a.id || !HET.has(o.el)) return false;
          const O = px(o);
          return O.x + 7.6 > box.x0 - 1 && O.x - 7.6 < box.x1 + 1 && O.y + 7.6 > box.y0 && O.y - 7.6 < box.y1;
        });
        const hitLabel = placed.some((p) => p.x0 < box.x1 + 1 && p.x1 > box.x0 - 1 && p.y0 < box.y1 + 1 && p.y1 > box.y0 - 1);
        const outOfCanvas = box.x0 < 2 || box.x1 > M2D_W - 2 || box.y0 < 1 || box.y1 > height - 1;
        const score = (hitHet ? 2 : 0) + (hitLabel ? 2 : 0) + (outOfCanvas ? 8 : 0);
        if (score < bestScore) {
          bestScore = score;
          chosen = s;
        }
      }
      let left = chosen.anchor === "start" ? chosen.x : chosen.anchor === "end" ? chosen.x - w : chosen.x - w / 2;
      left = Math.max(2, Math.min(left, M2D_W - 2 - w));
      const ly = Math.max(10, Math.min(chosen.y, height - 3));
      placed.push({ x0: left, x1: left + w, y0: ly - 9, y1: ly + 2 });
      labelLayout.set(a.id, { x: left, y: ly, anchor: "start", w });
    }
  }
  // 电荷符号落位：默认右下 (+8,+9)；若与相邻杂原子标签、碳编号或其它电荷压叠，依次退让。
  // 只挪电荷符号的位置偏移，不改字号、键线与原子标签。
  const chargeLayout = new Map<number, { x: number; y: number }>();
  {
    const boxes = [...asset.atoms].filter((a) => HET.has(a.el)).map((a) => {
      const A = px(a);
      // 按 11.5px 元素字的实际行盒（x −4.45..+5.2、y −10.65..+5.9）留位，
      // 与体检脚本量到的文字包围盒同口径，避免电荷只差亚像素就贴上元素字。
      return { x0: A.x - 4.45, x1: A.x + 5.2, y0: A.y - 10.65, y1: A.y + 5.9 };
    });
    // 9.5px 标签的行盒：锚点左侧 −1.4、右侧 +1.3，纵向 −11..+2.9（含字符侧承）
    for (const l of labelLayout.values()) boxes.push({ x0: l.x - 1.4, x1: l.x + l.w + 1.3, y0: l.y - 11, y1: l.y + 2.9 });
    const placed: { x0: number; x1: number; y0: number; y1: number }[] = [];
    const spots = [
      [8, 9],
      [8, -8],
      [14, 9],
      [8, 17],
      [14, 17],
      [8, 24],
      [16, -5],
      [4, -17],
    ];
    for (const a of asset.atoms) {
      if (!a.charge) continue;
      const A = px(a);
      let best = spots[0];
      let bestScore = Infinity;
      for (const [dx, dy] of spots) {
        const b = { x0: A.x + dx - 1.4, x1: A.x + dx + 5.5, y0: A.y + dy - 11, y1: A.y + dy + 2.8 };
        let score = b.x0 < 1 || b.x1 > M2D_W - 1 || b.y0 < 1 || b.y1 > height - 1 ? 400 : 0;
        for (const o of [...boxes, ...placed]) {
          const ix = Math.min(b.x1, o.x1) - Math.max(b.x0, o.x0);
          const iy = Math.min(b.y1, o.y1) - Math.max(b.y0, o.y0);
          if (ix > 0 && iy > 0) score += ix * iy + 1;
        }
        if (score < bestScore) {
          bestScore = score;
          best = [dx, dy];
          if (score === 0) break;
        }
      }
      placed.push({ x0: A.x + best[0] - 1.4, x1: A.x + best[0] + 5.5, y0: A.y + best[1] - 11, y1: A.y + best[1] + 2.8 });
      chargeLayout.set(a.id, { x: A.x + best[0], y: A.y + best[1] });
    }
  }

  const markedIds = useMemo(() => {
    const ids = new Set<number>();
    for (const m of marks ?? []) {
      for (const [id, nm] of names) if (nm === m.name) ids.add(id);
    }
    return ids;
  }, [marks, names]);

  return (
    <div className="mol3d-stage mol2d-stage" data-testid="mol-2d-stage">
      <svg
        viewBox={`0 0 ${M2D_W} ${height}`}
        className="mol2d-svg"
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-label={`${asset.frameId} 平面结构式`}
      >
        <rect x={0} y={0} width={M2D_W} height={height} fill="var(--paper)" />
        {asset.bonds.map((b, i) => {
          const a = byId.get(b.a);
          const c = byId.get(b.b);
          if (!a || !c) return null;
          const A = px(a);
          const C = px(c);
          const dx = C.x - A.x;
          const dy = C.y - A.y;
          const L = Math.hypot(dx, dy) || 1;
          const ox2 = (-dy / L) * 2.4;
          const oy2 = (dx / L) * 2.4;
          return (
            <g key={`b${i}`}>
              <line x1={A.x} y1={A.y} x2={C.x} y2={C.y} stroke="var(--ink)" strokeWidth={1.6} />
              {b.order === 2 && (
                <line
                  x1={A.x * 0.85 + C.x * 0.15 + ox2}
                  y1={A.y * 0.85 + C.y * 0.15 + oy2}
                  x2={C.x * 0.85 + A.x * 0.15 + ox2}
                  y2={C.y * 0.85 + A.y * 0.15 + oy2}
                  stroke="var(--ink)"
                  strokeWidth={1.6}
                />
              )}
            </g>
          );
        })}
        {/* 变化键：与变化原子相连的键加粗同色（基团/键高亮，位置来自真实键表） */}
        {marks?.map((m, mi) =>
          asset.bonds.map((b, bi) => {
            const a = byId.get(b.a);
            const c = byId.get(b.b);
            if (!a || !c) return null;
            if (!markedIds.has(a.id) && !markedIds.has(c.id)) return null;
            const A = px(a);
            const C = px(c);
            return (
              <line
                key={`mb-${mi}-${bi}`}
                x1={A.x}
                y1={A.y}
                x2={C.x}
                y2={C.y}
                stroke={MARK_COLOR[m.kind]}
                strokeWidth={2.4}
                opacity={0.9}
              />
            );
          })
        )}
        {asset.wedge?.map((wd, i) => {
          const a = byId.get(wd.a);
          const c = byId.get(wd.b);
          if (!a || !c) return null;
          const A = px(a);
          const C = px(c);
          const dx = C.x - A.x;
          const dy = C.y - A.y;
          const L = Math.hypot(dx, dy) || 1;
          const px2 = (-dy / L) * 3.6;
          const py2 = (dx / L) * 3.6;
          return (
            <polygon
              key={`w${i}`}
              points={`${A.x},${A.y} ${C.x + px2},${C.y + py2} ${C.x - px2},${C.y - py2}`}
              fill="var(--ink)"
            />
          );
        })}
        {asset.atoms.map((a) => {
          const A = px(a);
          return (
            <g key={`a${a.id}`}>
              {HET.has(a.el) ? (
                <>
                  <circle cx={A.x} cy={A.y} r={7.6} fill="var(--paper)" />
                  {/* 2D 杂原子色与 3D 原子色同一张表；碳不上色，只留黑键与顶点 */}
                  <text
                    x={A.x}
                    y={A.y + 3.1}
                    textAnchor="middle"
                    fontSize={11.5}
                    fontWeight={700}
                    style={{ fill: atomColor(a.el) }}
                    data-atom-el={a.el}
                    data-atom-color={atomColor(a.el)}
                  >
                    {a.el}
                  </text>
                </>
              ) : (
                <circle cx={A.x} cy={A.y} r={1.8} fill="var(--hair)" />
              )}
              {a.label &&
                (() => {
                  const l = labelLayout.get(a.id) ?? { x: 0, y: 0, anchor: "start" as const };
                  return (
                    <text x={l.x} y={l.y} textAnchor={l.anchor} fontSize={9.5} fill="var(--hair)">
                      {a.label}
                    </text>
                  );
                })()}
              {a.charge &&
                (() => {
                  const c = chargeLayout.get(a.id) ?? { x: A.x + 8, y: A.y + 9 };
                  return (
                    <text x={c.x} y={c.y} fontSize={9.5} fill="var(--brick)">
                      {a.charge}
                    </text>
                  );
                })()}
            </g>
          );
        })}
        {/* 变化原子圈注：在真实原子上画圈，颜色沿用 3D 三色语义 */}
        {marks?.map((m, i) =>
          [...markedIds].map((id) => {
            const a = byId.get(id);
            if (!a) return null;
            // 氢不高亮：标注即使命中 H，也不套语义色（高亮只作用于重原子与键）
            if (a.el.toUpperCase() === "H") return null;
            const A = px(a);
            return (
              <circle
                key={`m${i}-${id}`}
                cx={A.x}
                cy={A.y}
                r={HET.has(a.el) ? 10.2 : 6.4}
                fill={MARK_COLOR[m.kind]}
                fillOpacity={0.1}
                stroke={MARK_COLOR[m.kind]}
                strokeWidth={2}
                data-mark-name={m.name}
              />
            );
          })
        )}
        {captionLines.map((line, i) => (
          <text
            key={`t${i}`}
            x={M2D_PAD}
            y={drawH + 13 + i * 11}
            fontSize={9}
            fill="var(--hair)"
            data-2d-caption="1"
          >
            {line}
          </text>
        ))}
      </svg>
    </div>
  );
}

/** 一次取多份 JSON（键为 URL），页面级缓存避免每个分子重复请求 */
function useJsonMany(urls: string[]) {
  const key = urls.join("|");
  const [data, setData] = useState<Record<string, unknown | null>>({});
  useEffect(() => {
    let alive = true;
    Promise.all(
      urls.map((u) =>
        fetch(u)
          .then((r) => (r.ok ? r.json() : null))
          .catch(() => null)
      )
    ).then((list) => {
      if (!alive) return;
      const next: Record<string, unknown | null> = {};
      urls.forEach((u, i) => (next[u] = list[i]));
      setData(next);
    });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return data;
}

const mol3dUrl = (id: string) => `/assets/ligands3d/${id}.json`;

/** 一个分子卡片：3D 用 Molecule3D，2D 用 Molecule2D；两模式共享同一套 foot/marks 盒子 */
function MolCard({
  part,
  assets3d,
  assets2d,
  mode,
  duo,
}: {
  part: MolPart;
  assets3d: Record<string, unknown | null>;
  assets2d: Record<string, unknown | null>;
  mode: Mode;
  duo: boolean;
}) {
  const a3 = (assets3d[mol3dUrl(part.id)] as Mol3DAsset) ?? null;
  const twoKey = part.asset2d ?? "";
  const has2 = !!part.asset2d && Object.prototype.hasOwnProperty.call(assets2d, twoKey);
  const a2 = (part.asset2d ? assets2d[twoKey] : null) as Frame2DAsset | null;
  const found2 = useMemo(() => (a2 ? names2dOf(a2) : new Map<number, string>()), [a2]);
  const names2d = useMemo(() => new Set(found2.values()), [found2]);
  const marks = part.marks ?? [];
  const applied2d = useMemo(() => marks.filter((m) => names2d.has(m.name)).length, [marks, names2d]);
  const height = duo ? M2D_H_DUO : M2D_H_SINGLE;

  if (mode === "3d") {
    return (
      <div className="cmp3d-mol">
        <div className="cmp-mol-head">
          <span className="cmp-mol-name">{part.name}</span>
          <span className="cmp-mol-formula num">{part.formula}</span>
        </div>
        {part.no3dReason ? (
          // 原子数过少（CO₂ / HCO₃⁻）：3D 不建，页面只给原因，不塞假球
          <div className="mol3d" data-testid="mol-3d-none" data-mol-id={part.id}>
            <div className="mol3d-stage mol2d-stage">
              <p className="mol2d-state" data-testid="missing-3d">
                <span className="cmp-miss-mark">3D 未建</span>
                {part.no3dReason}
              </p>
            </div>
          </div>
        ) : (
          <Molecule3D asset={a3} marks={part.marks} />
        )}
        {part.caveat && <p className="cmp-caveat">{part.caveat}</p>}
      </div>
    );
  }

  return (
    <div className="cmp3d-mol">
      <div className="cmp-mol-head">
        <span className="cmp-mol-name">{part.name}</span>
        <span className="cmp-mol-formula num">{part.formula}</span>
      </div>
      {/* 与 3D 分支同一套 .mol3d 包裹（stage + foot + marks）：切换模式时只换 stage 内容，
          side 格子高度不变（.mol3d-prov 的 min-height 也保证了页脚同高）。 */}
      <div
        className="mol3d"
        data-testid="mol-2d"
        data-mol-id={part.id}
        data-marks-total={marks.length}
        data-marks-applied={marks.length ? applied2d : undefined}
      >
        {!part.asset2d ? (
          <div className="mol3d-stage mol2d-stage" data-testid="mol-2d-stage">
            <p className="mol2d-state" data-testid="missing-2d">
              <span className="cmp-miss-mark">缺 2D 结构式</span>
              {part.missing2dReason ?? "资产未建立"}
            </p>
          </div>
        ) : !has2 ? (
          <div className="mol3d-stage mol2d-stage" data-testid="mol-2d-stage">
            <div className="mol2d-state cmp-load">结构式加载中…</div>
          </div>
        ) : !a2 ? (
          <div className="mol3d-stage mol2d-stage" data-testid="mol-2d-stage">
            <p className="mol2d-state" data-testid="missing-2d">
              <span className="cmp-miss-mark">缺 2D 结构式</span>
              {`资产读取失败：${part.asset2d}`}
            </p>
          </div>
        ) : (
          <Molecule2D asset={a2} marks={marks} height={height} />
        )}
        {a3 && (
          <div className="mol3d-foot">
            <span
              className={`mol3d-prov ${a3.provenance.kind}`}
              data-testid="mol-2d-source"
              title={a3.provenance.protein ?? undefined}
            >
              平面结构式 · {mol3dSourceText(a3.provenance)}
            </span>
            <span className="mol3d-shape num" data-testid="mol-3d-shape">
              范德华体积 {a3.shape.vdwVolumeA3} Å³ · 主轴 {a3.shape.maxExtentA} Å
            </span>
          </div>
        )}
        {marks.length > 0 && (
          <ul className="mol3d-marks" data-testid="mol-2d-marks">
            {marks.map((m, i) => (
              <li
                key={`${m.name}-${i}`}
                data-mark-kind={m.kind}
                data-mark-name={m.name}
                data-mark-found={names2d.has(m.name) ? "1" : "0"}
                data-mark-found-2d={names2d.has(m.name) ? "1" : "0"}
              >
                <i style={{ background: MARK_COLOR[m.kind] }} />
                <span className="num">{m.name}</span>
                <span>{MARK_LABEL[m.kind]}</span>
                {m.note && <em>{m.note}</em>}
                {!names2d.has(m.name) && <em className="mol3d-miss">2D 图中无此原子</em>}
              </li>
            ))}
          </ul>
        )}
      </div>
      {part.caveat && <p className="cmp-caveat">{part.caveat}</p>}
    </div>
  );
}

/** 一侧（可能 1–2 个分子，如 gk-4 产物、tca-1 底物） */
function ChemSideView({
  side,
  sideKey,
  assets3d,
  assets2d,
  mode,
}: {
  side: ChemSide;
  sideKey: "substrate" | "product";
  assets3d: Record<string, unknown | null>;
  assets2d: Record<string, unknown | null>;
  mode: Mode;
}) {
  return (
    <div className="cmp3d-side" data-side={sideKey}>
      <div className="cmp3d-sidehead">
        <span className="cmp3d-side-name">{side.name}</span>
        <span className="cmp3d-side-formula num">{side.formula}</span>
      </div>
      <div className={`cmp3d-mols${side.parts.length > 1 ? " duo" : ""}`}>
        {side.parts.map((part) => (
          <MolCard
            key={part.id}
            part={part}
            assets3d={assets3d}
            assets2d={assets2d}
            mode={mode}
            duo={side.parts.length > 1}
          />
        ))}
      </div>
      {side.cofactorNote && <p className="cmp-cofactor">{side.cofactorNote}</p>}
    </div>
  );
}

/** 底物 → 产物：模式只换渲染方式，箭头/体积/主轴数字始终保留 */
function ReactionStrip({ item, mode }: { item: StepComparison; mode: Mode }) {
  const urls3d = useMemo(
    () =>
      [...item.substrate.parts, ...item.product.parts]
        .filter((p) => !p.no3dReason)
        .map((p) => mol3dUrl(p.id)),
    [item]
  );
  const urls2d = useMemo(
    () =>
      [...item.substrate.parts, ...item.product.parts]
        .map((p) => p.asset2d)
        .filter((u): u is string => !!u),
    [item]
  );
  const assets3d = useJsonMany(urls3d);
  const assets2d = useJsonMany(urls2d);

  // 体积 / 主轴：把两侧分子加总（gk-4 产物两分子按合计比较），给出“形状变了多少”的数字
  const shape = useMemo(() => {
    const sum = (side: ChemSide) => {
      let v = 0;
      let ext = 0;
      let ready = true;
      for (const p of side.parts) {
        // 不建 3D 的小分子（CO₂ / HCO₃⁻）不参与体积加总，也不阻塞 ΔV 显示
        if (p.no3dReason) continue;
        const a = assets3d[mol3dUrl(p.id)] as Mol3DAsset | null;
        if (!a) {
          ready = false;
          continue;
        }
        v += a.shape.vdwVolumeA3;
        ext = Math.max(ext, a.shape.maxExtentA);
      }
      return { v, ext, ready };
    };
    return { sub: sum(item.substrate), prod: sum(item.product) };
  }, [assets3d, item]);
  const dv = shape.sub.ready && shape.prod.ready ? Math.round(shape.prod.v - shape.sub.v) : null;
  const dext =
    shape.sub.ready && shape.prod.ready ? Math.round((shape.prod.ext - shape.sub.ext) * 10) / 10 : null;
  // 配体来源：同一块内按分子去重，直接放在分子对照下方（首屏可见，不折叠）
  const sources = useMemo(() => {
    const seen = new Map<string, MolPart>();
    for (const p of [...item.substrate.parts, ...item.product.parts]) {
      if (p.sourceNote && !seen.has(p.id)) seen.set(p.id, p);
    }
    return [...seen.values()];
  }, [item]);

  return (
    <div className="cmp3d-wrap">
      <div className="cmp3d-strip" data-testid="comparison-strip" data-mode={mode}>
        <ChemSideView
          side={item.substrate}
          sideKey="substrate"
          assets3d={assets3d}
          assets2d={assets2d}
          mode={mode}
        />
        <div className="cmp3d-arrow" data-testid="comparison-arrow">
          <span className="cmp3d-arrow-glyph" aria-hidden>
            →
          </span>
          <span className="cmp3d-arrow-label">{item.arrowLabel}</span>
          {dv !== null && (
            <span className="cmp3d-delta num" data-testid="shape-delta">
              ΔV {dv >= 0 ? "+" : ""}
              {dv} Å³ · 最大主轴 {dext! >= 0 ? "+" : ""}
              {dext} Å
            </span>
          )}
        </div>
        <ChemSideView
          side={item.product}
          sideKey="product"
          assets3d={assets3d}
          assets2d={assets2d}
          mode={mode}
        />
      </div>

      {sources.length > 0 && (
        <div className="cmp-ligsrc" data-testid="ligand-sources">
          <span className="cmp-ligsrc-label">配体来源</span>
          <ul className="cmp-ligsrc-list">
            {sources.map((p) => (
              <li key={p.id} data-testid="ligand-source" data-mol-id={p.id}>
                <b className="cmp-ligsrc-mol">{p.name}</b>
                <span className="cmp-ligsrc-note">{p.sourceNote}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <p className="cmp3d-legend" aria-label="变化原子图例">
        <span>
          <i style={{ background: MARK_COLOR.added }} />
          新增基团
        </span>
        <span>
          <i style={{ background: MARK_COLOR.newbond }} />
          新键 / 换位
        </span>
        <span>
          <i style={{ background: MARK_COLOR.leaving }} />
          离去基
        </span>
        <span className="cmp3d-legend-note">
          {mode === "3d"
            ? "高亮标在 3D 原子上；切到 2D 用同色圈注同一批原子"
            : "2D 圈注与加粗键都落在真实原子上；同名原子与 3D 标记一一对应"}
        </span>
      </p>
    </div>
  );
}

/** 一侧等级的文字：有实验等级时给等级，并注明该侧是否还含覆盖标签 */
function sideGradeText(side: SideGrade): string {
  const tags = [side.calc ? "含计算构象" : "", side.only2d ? "含仅2D" : ""].filter(Boolean);
  if (side.grade) return tags.length ? `${side.grade}（${tags.join("、")}）` : side.grade;
  if (tags.length) return tags.join("、");
  return "未分级";
}

function gradeClass(grade: EvidenceGrade | null): string {
  return grade ? `cmp-grade-${grade}` : "cmp-grade-none";
}

function ComparisonBlock({
  item,
  cfg,
  config,
  mode,
  modeSource,
  grade,
  hidden,
}: {
  item: StepComparison;
  cfg: StepAssetCfg | null;
  config: ComparisonConfig;
  mode: Mode;
  modeSource: "url" | "data" | "fallback";
  grade: BlockGrade;
  hidden: boolean;
}) {
  const showDefault = item.defaultMode === "2d";
  return (
    <section
      className="cmp-block"
      id={item.stepId}
      data-step-id={item.stepId}
      data-mode={mode}
      data-default-mode={item.defaultMode ?? "3d"}
      data-mode-source={modeSource}
      data-grade={grade.grade ?? "none"}
      data-grade-calc={grade.calc ? "1" : "0"}
      data-grade-2d={grade.only2d ? "1" : "0"}
      data-graded-hidden={hidden ? "1" : "0"}
      hidden={hidden}
    >
      <header className="cmp-head">
        <span className="cmp-no num">{item.stageLabel ?? `第 ${item.index} 步`}</span>
        <h2 className="cmp-enzyme">
          {item.enzyme}
          {item.isozyme && <small> · {item.isozyme}</small>}
        </h2>
        <span className="cmp-eq serif">{item.equation}</span>
        <span
          className={`cmp-grade ${gradeClass(grade.grade)}`}
          data-testid="block-grade"
          data-grade={grade.grade ?? "none"}
          data-coverage={[grade.calc ? "calc" : "", grade.only2d ? "2d" : ""].filter(Boolean).join(",")}
          title={grade.grade ? GRADE_LABEL[grade.grade] : "无实验坐标，只有覆盖标签"}
        >
          {grade.grade ? `等级 ${grade.grade}` : "无实验等级"}
        </span>
        {grade.calc && (
          <span className="cmp-grade-tag" data-testid="block-coverage-calc">
            计算构象
          </span>
        )}
        {grade.only2d && (
          <span className="cmp-grade-tag" data-testid="block-coverage-2d">
            仅2D
          </span>
        )}
        {showDefault && (
          <span className="cmp-default-tag" data-testid="default-mode-tag">
            默认 2D · 按数据规则
          </span>
        )}
      </header>
      <div
        className="cmp-grade-sides"
        data-testid="block-grade-sides"
        data-sub={grade.substrate.grade ?? "none"}
        data-prod={grade.product.grade ?? "none"}
        data-differ={grade.sidesDiffer ? "1" : "0"}
      >
        <span className={gradeClass(grade.substrate.grade)}>底物 {sideGradeText(grade.substrate)}</span>
        <span className={gradeClass(grade.product.grade)}>产物 {sideGradeText(grade.product)}</span>
        {grade.sidesDiffer && (
          <span className="cmp-grade-mismatch" data-testid="block-grade-mismatch">
            两侧等级不一致 · 块级取较低级
          </span>
        )}
        {grade.ungraded.length > 0 && (
          <span className="cmp-grade-ungraded" data-testid="block-ungraded">
            未分级：{grade.ungraded.join("；")}
          </span>
        )}
      </div>
      {showDefault && item.defaultModeRule && (
        <p className="cmp-default-rule" data-testid="default-mode-rule">
          {item.defaultModeRule}
        </p>
      )}

      <div className="cmp-body">
        <div className="cmp-col cmp-col-3d">
          <h3 className="cmp-label">酶的 3D 静置结构</h3>
          {config.enzymePanel ? (
            cfg ? (
              <Enzyme3DPanel stepId={item.stepId} assetDir={cfg.assetDir} />
            ) : (
              <p className="cmp-missing">本步 3D 资产未接入（/assets/steps/manifest.json 无此条目）。</p>
            )
          ) : (
            <p className="cmp-enzyme-off" data-testid="enzyme-panel-off">
              {config.enzymePanelOffNote}
            </p>
          )}
        </div>

        <div className="cmp-col cmp-col-chem">
          <h3 className="cmp-label">
            {mode === "3d" ? "底物 → 产物（3D 形状对照）" : "底物 → 产物（2D 结构式对照）"}
          </h3>
          <ReactionStrip item={item} mode={mode} />
          <p className="cmp-change" data-testid="change-line">
            <span className="lbl">这一步改了什么</span>
            {item.change}
          </p>
          <p className="cmp-phys">
            <span className="lbl">生理意义</span>
            {item.physiology}
          </p>
        </div>
      </div>
    </section>
  );
}

/** 页头显示模式开关：auto=逐块按数据规则，2d/3d=URL 显式覆盖整页；真实 button、键盘可达 */
function ModeSwitch({ mode, onChange }: { mode: ModeChoice; onChange: (m: ModeChoice) => void }) {
  return (
    <div className="cmp-mode" role="group" aria-label="结构显示模式">
      <span className="cmp-mode-lbl">显示模式</span>
      <button
        type="button"
        className={`organ-tab structures-mode-btn${mode === "auto" ? " active" : ""}`}
        aria-pressed={mode === "auto"}
        data-testid="mode-auto"
        onClick={() => onChange("auto")}
        title="逐块按数据判据：形状几乎不变但拓扑改变时默认 2D"
      >
        按规则
      </button>
      <button
        type="button"
        className={`organ-tab structures-mode-btn${mode === "3d" ? " active" : ""}`}
        aria-pressed={mode === "3d"}
        data-testid="mode-3d"
        onClick={() => onChange("3d")}
      >
        3D 球棍
      </button>
      <button
        type="button"
        className={`organ-tab structures-mode-btn${mode === "2d" ? " active" : ""}`}
        aria-pressed={mode === "2d"}
        data-testid="mode-2d"
        onClick={() => onChange("2d")}
      >
        2D 结构式
      </button>
    </div>
  );
}

interface GradeCounts {
  A: number;
  B: number;
  C: number;
  D: number;
  calc: number;
  only2d: number;
  /** 没有任何实验坐标分子（只有计算构象 / 仅2D）的块数 */
  noneGrade: number;
}

/** 页头证据区：等级统计 + 筛选勾选 + 筛除提示；纯文字，不做胶囊/卡片/图标 */
function GradePanel({
  total,
  counts,
  selected,
  hiddenCount,
  onToggle,
}: {
  total: number;
  counts: GradeCounts;
  selected: Set<GradeFilterToken>;
  hiddenCount: number;
  onToggle: (t: GradeFilterToken) => void;
}) {
  return (
    <div className="cmp-evidence" data-testid="grade-panel">
      <div className="cmp-grade-filter" role="group" aria-label="证据等级筛选">
        <span className="cmp-mode-lbl">证据等级</span>
        {GRADE_FILTER_TOKENS.map((t) => {
          const isGrade = t === "A" || t === "B" || t === "C" || t === "D";
          const title = isGrade
            ? GRADE_LABEL[t as EvidenceGrade]
            : t === "calc"
              ? "含计算构象（自由态、无实验坐标）的块"
              : "含仅 2D 分子（CO₂ / HCO₃⁻）的块";
          return (
            <label className="cmp-grade-check" key={t} title={title}>
              <input
                type="checkbox"
                data-testid={`grade-filter-${t}`}
                checked={selected.has(t)}
                onChange={() => onToggle(t)}
              />
              <span className={isGrade ? `cmp-grade-${t}` : "cmp-grade-cover"}>{GRADE_FILTER_LABEL[t]}</span>
            </label>
          );
        })}
      </div>
      <p
        className="cmp-grade-stats"
        data-testid="grade-stats"
        data-total={total}
        data-a={counts.A}
        data-b={counts.B}
        data-c={counts.C}
        data-d={counts.D}
        data-calc={counts.calc}
        data-2d={counts.only2d}
        data-none-grade={counts.noneGrade}
      >
        本页 <b>{total}</b> 块 · A <b>{counts.A}</b> · B <b>{counts.B}</b> · C <b>{counts.C}</b> · D{" "}
        <b>{counts.D}</b> · 计算构象 <b>{counts.calc}</b> · 仅2D <b>{counts.only2d}</b>
        {counts.noneGrade > 0 ? ` · 无实验等级 ${counts.noneGrade}` : ""}
      </p>
      <p className="cmp-grade-policy">
        块级等级取两侧最差实验等级；计算构象 / 仅2D 是覆盖标签，可与 A–D 同时命中。空勾选 = 不过滤。
      </p>
      {hiddenCount > 0 && (
        <p className="cmp-grade-filtered" data-testid="grade-filtered" data-hidden={hiddenCount} data-total={total}>
          {hiddenCount} 块被筛除（本页共 {total} 块）
        </p>
      )}
    </div>
  );
}

export default function StructureFramesPage() {
  const { pathwayId = "glycolysis" } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  const [reg, setReg] = useState(stepAssets);
  const redirected = useRef(false);

  const config = comparisonConfigFor(pathwayId);
  const modeParam = searchParams.get("mode");
  const explicitMode: Mode | null = modeParam === "2d" ? "2d" : modeParam === "3d" ? "3d" : null;
  const modeChoice: ModeChoice = explicitMode ?? "auto";

  const setMode = (next: ModeChoice) => {
    const params = new URLSearchParams(searchParams);
    if (next === "auto") params.delete("mode");
    else params.set("mode", next);
    setSearchParams(params, { replace: true });
  };

  useEffect(() => {
    let cancelled = false;
    void loadStepManifest().then((manifest) => {
      if (cancelled || Object.keys(manifest).length === 0) return;
      setReg({ ...stepAssets, ...manifest });
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // 旧链接兼容：?frame=gk-9-f0 / ?motion=1 / ?frame=demo-2d → 重定向到对应步骤锚点。
  useEffect(() => {
    if (redirected.current) return;
    redirected.current = true;
    const frame = searchParams.get("frame");
    const motion = searchParams.get("motion");
    if (!frame && !motion) return;
    let target: string | null = null;
    if (frame) {
      const m = /^(gk-\d+)-f\d+$/.exec(frame);
      target = m ? m[1] : frame === "demo-2d" ? "gk-6" : null;
    }
    const keepMode = searchParams.get("mode");
    navigate(`/structures/${pathwayId}${target ? `#${target}` : ""}${keepMode ? `?mode=${keepMode}` : ""}`, {
      replace: true,
    });
    if (target) {
      const id = target;
      requestAnimationFrame(() => document.getElementById(id)?.scrollIntoView({ block: "start" }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const steps = config?.steps ?? [];
  const complete2dCount = useMemo(() => steps.filter(hasBothSides).length, [steps]);
  const complete3dCount = useMemo(() => steps.filter(hasBothSides3D).length, [steps]);
  const default2dCount = useMemo(() => steps.filter((s) => s.defaultMode === "2d").length, [steps]);

  // 返回栏：顶部时留在原位，滚过阈值后吸底（始终可见且不遮首屏正文）
  const [barFixed, setBarFixed] = useState(false);
  useEffect(() => {
    const onScroll = () => setBarFixed(window.scrollY > 120);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // 当前步：优先 ?step=，其次 URL 锚点（#gk-7，既有挂图入口形态）。只认本页真实存在的 stepId。
  const stepParam = searchParams.get("step");
  const hashStep = location.hash.replace(/^#/, "");
  const currentStepId = useMemo(() => {
    const candidate = stepParam ?? hashStep;
    return candidate && steps.some((s) => s.stepId === candidate) ? candidate : null;
  }, [stepParam, hashStep, steps]);
  // 返回挂图的目标由当前步反推：带步就指向该步，否则回挂图页根（保持既有行为）。
  const backTo =
    currentStepId && config
      ? `${config.back.to.split("?")[0]}?step=${currentStepId}`
      : (config?.back.to.split("?")[0] ?? "/");

  // 深链 ?step=gk-7：进入后直接落到对应结构块（挂图页本身支持 ?step= 选中该步）
  useEffect(() => {
    if (!stepParam || !steps.some((s) => s.stepId === stepParam)) return;
    const id = stepParam;
    requestAnimationFrame(() => document.getElementById(id)?.scrollIntoView({ block: "start" }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stepParam]);

  // 证据等级：一律由 gradesForStep 从结构化字段推导；页面只读结果
  const grades = useMemo(() => steps.map(gradesForStep), [steps]);
  const counts = useMemo<GradeCounts>(() => {
    const c: GradeCounts = { A: 0, B: 0, C: 0, D: 0, calc: 0, only2d: 0, noneGrade: 0 };
    for (const g of grades) {
      if (g.grade) c[g.grade] += 1;
      else c.noneGrade += 1;
      if (g.calc) c.calc += 1;
      if (g.only2d) c.only2d += 1;
    }
    return c;
  }, [grades]);
  const selectedGrades = useMemo(() => parseGradeFilter(searchParams.get("grade")), [searchParams]);
  const hiddenCount = useMemo(
    () => grades.filter((g) => !matchesGradeFilter(g, selectedGrades)).length,
    [grades, selectedGrades]
  );

  const toggleGrade = (t: GradeFilterToken) => {
    const next = new Set(selectedGrades);
    if (next.has(t)) next.delete(t);
    else next.add(t);
    const params = new URLSearchParams(searchParams);
    const encoded = serializeGradeFilter(next);
    if (encoded) params.set("grade", encoded);
    else params.delete("grade");
    setSearchParams(params, { replace: true });
  };

  // 未接入的 pathwayId：明确说明，不给 404、不留白屏
  if (!config) {
    return (
      <div className="poster film-poster cmp-poster" data-page="comparison-missing">
        <nav className="film-back">
          <Link to="/">← 返回首页</Link>
        </nav>
        <div className="film-missing" data-testid="comparison-not-wired">
          <strong>该通路结构对照尚未接入</strong>
          <span className="num">pathwayId = {pathwayId}</span>
          <span>已接入：glycolysis（糖酵解十块）、tca（TCA 九块）、ppp（磷酸戊糖途径八块）、gluconeogenesis（糖异生十三块）。</span>
        </div>
      </div>
    );
  }

  return (
    <div className="poster film-poster cmp-poster structures-page" data-page="comparison" data-mode={modeChoice}>
      <ContentBubble enabled resolve={structureBubbleModel} />
      <div className="structures-backbar-slot">
        <nav className={`film-back structures-backbar${barFixed ? " is-fixed" : ""}`} data-testid="film-back">
          <Link to={backTo} className="structures-back-btn" data-testid="structures-back">
            {config.back.label}
          </Link>
          <Link to="/" className="film-home">首页</Link>
          <span className="film-back-step">{config.backCaption}</span>
        </nav>
      </div>
      <PathwaySwitcher current={pathwayId as NavItemId} variant="structure" />

      <header className="masthead">
        <div className="mast-top">
          <span className="plate-no num">{config.plateNo}</span>
          <div className="cmp-mode-wrap">
            <ModeSwitch mode={modeChoice} onChange={setMode} />
            <span className="cmp-mode-note" data-testid="default-mode-note" title={config.defaultModePolicy}>
              {explicitMode
                ? `URL 显式覆盖：整页 ${explicitMode === "2d" ? "2D 结构式" : "3D 球棍"}`
                : `按规则：本页 ${default2dCount} 块默认 2D，其余默认 3D`}
            </span>
          </div>
        </div>
        <div className="mast-main">
          <h1>{config.title}</h1>
          <p className="mast-summary">{config.summary}</p>
        </div>
        <GradePanel
          total={steps.length}
          counts={counts}
          selected={selectedGrades}
          hiddenCount={hiddenCount}
          onToggle={toggleGrade}
        />
      </header>

      <div className="cmp-list">
        {steps.map((item, i) => {
          const resolved = config.enzymePanel ? resolveStepAsset(item.stepId, reg) : null;
          const blockMode: Mode = explicitMode ?? item.defaultMode ?? "3d";
          const modeSource = explicitMode ? "url" : item.defaultMode ? "data" : "fallback";
          return (
            <ComparisonBlock
              key={item.stepId}
              item={item}
              cfg={resolved?.cfg ?? null}
              config={config}
              mode={blockMode}
              modeSource={modeSource}
              grade={grades[i]}
              hidden={!matchesGradeFilter(grades[i], selectedGrades)}
            />
          );
        })}
      </div>

      <footer className="poster-foot">
        {config.footerNote}
        {steps.length} 步中 {complete3dCount} 步两侧 3D 齐全、{complete2dCount} 步两侧 2D 结构式齐全。
      </footer>
    </div>
  );
}
