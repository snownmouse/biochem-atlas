// 全站唯一的原子配色表。数据只有一份：src/data/atom-colors.json。
// 3Dmol（setStyle / colorfunc）、自绘球棍、2D 结构式（React 与 tools/gen-molecule-assets.py）
// 都必须从这里取值，任何渲染器不得再写内置 CPK / Jmol / defaultCarbon。
//
// 选色依据（纸白底 #f6f3ec，桌面端）：
// - H：浅中性灰绿 #c3c9c6。不用纯白，纸白底上仍能看出球体轮廓；同时是整表最亮的元素色，
//   与 C 拉开一个明度台阶，避免"氢被碳吞掉"。
// - C：中性灰 #818986，取 Jmol(#909090) 与 rasmol(#c8c8c8) 之间，比纸白深、比 H 暗。
// - N：深蓝 #2f4e92，取自 CPK 蓝并压暗，保证纸白底对比度。
// - O：砖红 #b23a2c，取自 CPK 红并压暗；比页面语义砖红 #9c4a3c 更饱和、更亮，靠明度差区分。
// - P：暖橙 #d18a2e，取自 CPK 橙并压暗；是全表第二亮，色盲场景下与 O/N/S 靠明度区分。
// - S：橄榄黄 #9a8f1f，取自 CPK 黄并压暗到可在纸白底上看清；与 P 靠色相 + 明度差区分。
// - 其它：石板灰 #5d6b6e，统一兜底，不引入额外色相。
//
// 氢原子规则：H 永远取 H 色。高亮只作用于重原子与键；若某个标注命中 H，
// 该 H 保持氢色，不做任何高亮接管（见 Molecule3D / Molecule2D 的 el === "H" 分支）。
import palette from "./atom-colors.json";

export const ATOM_PAPER = palette.paper;
export const ATOM_FALLBACK = palette.fallback;
export const ATOM_COLORS: Record<string, string> = palette.elements;

// 供页面 DOM 与冒烟脚本核对：同一串配色必须出现在所有 3D 宿主上。
export const ATOM_PALETTE_JSON = JSON.stringify(ATOM_COLORS);

export function atomColor(element: string | undefined): string {
  if (!element) return ATOM_FALLBACK;
  return ATOM_COLORS[element] ?? ATOM_COLORS[element.toUpperCase()] ?? ATOM_FALLBACK;
}

// 3Dmol 的 colorfunc：stick / sphere 逐原子取色，内置 scheme 一旦被替换就彻底退出。
export function atomColorFunc(atom: { elem?: string }): string {
  return atomColor(atom.elem);
}
