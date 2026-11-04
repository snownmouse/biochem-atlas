// ============================================================
// gen-reaction-cards.mjs —— Tier B 镜头的「化学卡片」离线资产
//
// 口径（docs/motion-spec.md Tier B）：化学反应用箭头 + 结构式交代，不呈现结合过程。
// 卡片左/右两格直接复用帧带里已投影好的配体 2D 坐标（同一离线资产，不改化学内容），
// 按「键长归一」缩放到卡片槽位——不是重新构图，也不是手画结构。
//
// 输出：
//   public/assets/structures/gk-9/reaction.json   2PG → PEP（脱水，C2=C3 生成）
//   public/assets/structures/gk-1/reaction.json   GLC → G6P（C6 磷酸化）
// ============================================================
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const S = (step, file) => JSON.parse(readFileSync(join(ROOT, "public", "assets", "structures", step, file), "utf8"));

const CARD = { w: 780, h: 200 };
const TARGET_BOND = 26; // 卡片内目标键长（px）
const SLOT = [
  { cx: 160, cy: 96, maxW: 230, maxH: 108 },
  { cx: 620, cy: 96, maxW: 250, maxH: 108 },
];

const med = (arr) => {
  const s = [...arr].sort((a, b) => a - b);
  return s[Math.floor(s.length / 2)];
};

/** 把一组原子/键按「键长中位 → TARGET_BOND」等比缩放并居中到槽位 */
function fit(atoms, bonds, slot) {
  const byId = new Map(atoms.map((a) => [a.id, a]));
  const lens = bonds
    .map((b) => {
      const A = byId.get(b.a);
      const B = byId.get(b.b);
      return A && B ? Math.hypot(A.x - B.x, A.y - B.y) : null;
    })
    .filter(Boolean);
  const medBond = lens.length ? med(lens) : TARGET_BOND;
  let k = TARGET_BOND / medBond;
  const xs = atoms.map((a) => a.x);
  const ys = atoms.map((a) => a.y);
  const w = Math.max(...xs) - Math.min(...xs);
  const h = Math.max(...ys) - Math.min(...ys);
  k = Math.min(k, slot.maxW / Math.max(w, 1), slot.maxH / Math.max(h, 1));
  const cx = (Math.max(...xs) + Math.min(...xs)) / 2;
  const cy = (Math.max(...ys) + Math.min(...ys)) / 2;
  return {
    atoms: atoms.map((a) => ({
      id: a.id,
      el: a.el,
      x: +(slot.cx + (a.x - cx) * k).toFixed(1),
      y: +(slot.cy + (a.y - cy) * k).toFixed(1),
      // 结构式只标碳/磷编号；O/N 由元素字母呈现
      label: a.el === "C" || a.el === "P" ? a.label ?? null : null,
    })),
    bonds: bonds.map((b) => ({ a: b.a, b: b.b, order: b.order === 2 ? 2 : 1 })),
  };
}

function writeCard(step, card) {
  writeFileSync(join(ROOT, "public", "assets", "structures", step, "reaction.json"), JSON.stringify(card));
  console.log(`${step}/reaction.json ${card.left.atoms.length}+${card.right.atoms.length} 原子 · 箭头「${card.arrow.label}」`);
}

// ---------- gk-9：2PG（3UCD f0 实测投影）→ PEP（3UCD f3 的 PEP 子集） ----------
const g9f0 = S("gk-9", "frame-f0.json");
const g9f3 = S("gk-9", "frame-f3.json");
const PG2 = fit(g9f0.atoms, g9f0.bonds, SLOT[0]);
// f3 里 PEP 是 id 14–23（1–11 为暗色 2PG，12/13 为 Mg）；键只取两端都在该区间的
const pepAtoms = g9f3.atoms
  .filter((a) => a.id >= 14)
  .map((a) => ({ ...a, id: a.id - 13 }));
const pepBonds = g9f3.bonds
  .filter((b) => b.a >= 14 && b.b >= 14)
  .map((b) => ({ a: b.a - 13, b: b.b - 13, order: b.order === 2 ? 2 : 1 }));
const labelByIndex = { 1: "C1", 4: "C2", 5: "C3", 7: "P" }; // PEP 子集内 1=C1、4=C2、5=C3、7=P
const PEP = fit(
  pepAtoms.map((a) => ({ ...a, label: labelByIndex[a.id] ?? null })),
  pepBonds,
  SLOT[1]
);
writeCard("gk-9", {
  id: "gk-9-reaction",
  view: CARD,
  left: { title: "2-磷酸甘油酸（2-PG）", ...PG2 },
  right: { title: "磷酸烯醇丙酮酸（PEP）", ...PEP },
  arrow: { x1: 288, y1: 104, x2: 470, y2: 104, label: "烯醇化 · 脱水（− H₂O）" },
  note: "C3–OH 与 C2–H 以 H₂O 脱去，C2=C3 双键生成；磷酸基始终酯化在 C2。箭头/结构式交代化学，不呈现结合过程。",
});

// ---------- gk-1：GLC（1CZA f0）→ G6P（1CZA f3，C6–O6–P） ----------
const g1f0 = S("gk-1", "frame-f0.json");
const g1f3 = S("gk-1", "frame-f3.json");
const GLC = fit(g1f0.atoms, g1f0.bonds, SLOT[0]);
const G6P = fit(g1f3.atoms, g1f3.bonds, SLOT[1]);
writeCard("gk-1", {
  id: "gk-1-reaction",
  view: CARD,
  left: { title: "β-D-葡萄糖（GLC）", ...GLC },
  right: { title: "6-磷酸葡萄糖（G6P）", ...G6P },
  arrow: { x1: 288, y1: 104, x2: 470, y2: 104, label: "己糖激酶 · ATP 的 γ-磷酸转移" },
  note: "只有 C6–OH 被磷酸化（右格右下 P），糖环与其余羟基不变；ATP→ADP 的其余部分不入画。",
});
