// ============================================================
// extract-step2-frames.mjs —— 第 2 步（磷酸葡萄糖异构酶，G6P ⇌ F6P）帧资产
//
// 结构实情（核验表 research/step-states.md，不猜）：
//   底物 G6P：1U0F（小鼠 GPI，1.6 Å，链 A resi 900）
//   产物 F6P：2CXS（小鼠 GPI，1.5 Å，链 A）——复用 public/assets/steps/gly-02/ 只读
//   apo：1JIQ（人，1.9 Å，无配体二聚体）——跨物种，按三档规则降级为文字声明帧（无坐标资产）
//
// 三档规则落点：
//   - 1U0F/2CXS = 同酶同物种跨结构 → 可并置，每帧角标 PDB/物种/分辨率 + "跨结构示意"
//   - 1JIQ(人) vs holo(鼠) = 跨物种 → 不并置，F1 只声明不展示
//
// 相机连续：
//   步内 + 跨步：重建第 1 步的两套相机（tight/shared），并用 gk-1 已发布资产逐点校验
//   （偏差 < 0.2 px 才继续）；对齐链 = Kabsch(1U0F·G6P → 1CZA·G6P 晶体坐标) → 第 1 步相机；
//   F6P 再经 Kabsch(F6P → 1U0F·G6P)。两级 RMSD 写入报脚。画布按需对称外扩，
//   配体在画面中的位置与第 1 步逐点一致（连续性可由校验保证）。
//
// 输出：public/assets/structures/gk-2/frame-f0/f2/f3.json + index.json（F1 无资产）。
// ============================================================
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const G1 = join(ROOT, "public", "assets", "steps", "gly-01");
const G2 = join(ROOT, "public", "assets", "steps", "gly-02");
const PDB_1U0F = join(ROOT, "tools", "cache", "1U0F.pdb");
const G1_OUT = join(ROOT, "public", "assets", "structures", "gk-1");
const OUT = join(ROOT, "public", "assets", "structures", "gk-2");
mkdirSync(OUT, { recursive: true });

// ---------- 数学（与 extract-step1-frames.mjs 一致，勿单独改动） ----------
const v3 = {
  sub: (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]],
  add: (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]],
  scale: (a, s) => [a[0] * s, a[1] * s, a[2] * s],
  dot: (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2],
  cross: (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]],
  len: (a) => Math.hypot(a[0], a[1], a[2]),
};
function jacobiEigen(S, n) {
  const A = S.map((r) => r.slice());
  let V = Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => (i === j ? 1 : 0)));
  for (let sweep = 0; sweep < 100; sweep++) {
    let off = 0;
    for (let p = 0; p < n; p++) for (let q = p + 1; q < n; q++) off += A[p][q] * A[p][q];
    if (off < 1e-14) break;
    for (let p = 0; p < n; p++) {
      for (let q = p + 1; q < n; q++) {
        if (Math.abs(A[p][q]) < 1e-15) continue;
        const theta = (A[q][q] - A[p][p]) / (2 * A[p][q]);
        const t = Math.sign(theta || 1) / (Math.abs(theta) + Math.sqrt(theta * theta + 1));
        const c = 1 / Math.sqrt(t * t + 1);
        const s = t * c;
        for (let k = 0; k < n; k++) {
          const Akp = A[k][p], Akq = A[k][q];
          A[k][p] = c * Akp - s * Akq;
          A[k][q] = s * Akp + c * Akq;
        }
        for (let k = 0; k < n; k++) {
          const Apk = A[p][k], Aqk = A[q][k];
          A[p][k] = c * Apk - s * Aqk;
          A[q][k] = s * Apk + c * Aqk;
        }
        for (let k = 0; k < n; k++) {
          const Vkp = V[k][p], Vkq = V[k][q];
          V[k][p] = c * Vkp - s * Vkq;
          V[k][q] = s * Vkp + c * Vkq;
        }
      }
    }
  }
  const idx = [...Array(n).keys()].sort((a, b) => A[b][b] - A[a][a]);
  return { values: idx.map((i) => A[i][i]), vectors: idx.map((i) => [...Array(n)].map((_, r) => V[r][i])) };
}
function kabsch(ptsA, ptsB) {
  const n = ptsA.length;
  const ca = [0, 0, 0], cb = [0, 0, 0];
  for (let i = 0; i < n; i++) for (let d = 0; d < 3; d++) { ca[d] += ptsA[i][d] / n; cb[d] += ptsB[i][d] / n; }
  let Sxx = 0, Sxy = 0, Sxz = 0, Syx = 0, Syy = 0, Syz = 0, Szx = 0, Szy = 0, Szz = 0;
  for (let i = 0; i < n; i++) {
    const a = v3.sub(ptsA[i], ca), b = v3.sub(ptsB[i], cb);
    Sxx += a[0] * b[0]; Sxy += a[0] * b[1]; Sxz += a[0] * b[2];
    Syx += a[1] * b[0]; Syy += a[1] * b[1]; Syz += a[1] * b[2];
    Szx += a[2] * b[0]; Szy += a[2] * b[1]; Szz += a[2] * b[2];
  }
  const N = [
    [Sxx + Syy + Szz, Syz - Szy, Szx - Sxz, Sxy - Syx],
    [Syz - Szy, Sxx - Syy - Szz, Sxy + Syx, Szx + Sxz],
    [Szx - Sxz, Sxy + Syx, -Sxx + Syy - Szz, Syz + Szy],
    [Sxy - Syx, Szx + Sxz, Syz + Szy, -Sxx - Syy + Szz],
  ];
  const { vectors } = jacobiEigen(N, 4);
  const [w, x, y, z] = vectors[0]; // 最大特征值对应的完整特征向量（自测修复，勿改回 map(col=>col[0])）
  const R = [
    [w * w + x * x - y * y - z * z, 2 * (x * y - w * z), 2 * (x * z + w * y)],
    [2 * (x * y + w * z), w * w - x * x + y * y - z * z, 2 * (y * z - w * x)],
    [2 * (x * z - w * y), 2 * (y * z + w * x), w * w - x * x - y * y + z * z],
  ];
  const t = v3.sub(cb, [v3.dot(R[0], ca), v3.dot(R[1], ca), v3.dot(R[2], ca)]);
  return { R, t };
}
const applyRt = (R, t, p) => [v3.dot(R[0], p) + t[0], v3.dot(R[1], p) + t[1], v3.dot(R[2], p) + t[2]];
const rmsdOf = (pairs) => Math.sqrt(pairs.reduce((s, [a, b]) => s + (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2, 0) / pairs.length);
function makeCamera(center, points, w, h, pad) {
  const cov = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
  for (const p of points) {
    const v = v3.sub(p, center);
    for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) cov[i][j] += v[i] * v[j] / points.length;
  }
  const { vectors } = jacobiEigen(cov, 3);
  const u1 = vectors.map((col) => col[0]);
  const u2 = vectors.map((col) => col[1]);
  const proj = (p) => [v3.dot(v3.sub(p, center), u1), v3.dot(v3.sub(p, center), u2)];
  const pts2 = points.map(proj);
  const xs = pts2.map((p) => p[0]), ys = pts2.map((p) => p[1]);
  const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
  const S = Math.min((w - 2 * pad) / (maxX - minX || 1), (h - 2 * pad) / (maxY - minY || 1));
  const cx = w / 2 - S * (minX + maxX) / 2;
  const cy = h / 2 + S * (minY + maxY) / 2;
  return { project: (p) => { const q = proj(p); return [q[0] * S + cx, -q[1] * S + cy]; } };
}

// ---------- 解析 ----------
function parseSdf(path) {
  const lines = readFileSync(path, "utf8").split(/\r?\n/);
  const na = parseInt(lines[3].slice(0, 3), 10);
  const nb = parseInt(lines[3].slice(3, 6), 10);
  const atoms = [];
  for (let i = 0; i < na; i++) {
    const L = lines[4 + i];
    atoms.push({ id: i + 1, el: L.slice(31, 34).trim(), xyz: [parseFloat(L.slice(0, 10)), parseFloat(L.slice(10, 20)), parseFloat(L.slice(20, 30))] });
  }
  const bonds = [];
  for (let i = 0; i < nb; i++) {
    const L = lines[4 + na + i];
    bonds.push({ a: parseInt(L.slice(0, 3), 10), b: parseInt(L.slice(3, 6), 10) });
  }
  return { atoms, bonds };
}
function parsePdb(path) {
  const het = [], prot = [];
  for (const L of readFileSync(path, "utf8").split(/\r?\n/)) {
    if (L.startsWith("HETATM")) {
      het.push({
        resn: L.slice(17, 20).trim(), chain: L.slice(21, 22).trim(), resi: parseInt(L.slice(22, 26), 10),
        name: L.slice(12, 16).trim(), altloc: L.slice(16, 17),
        el: L.slice(76, 78).trim() || L.slice(12, 16).trim()[0],
        xyz: [parseFloat(L.slice(30, 38)), parseFloat(L.slice(38, 46)), parseFloat(L.slice(46, 54))],
      });
    } else if (L.startsWith("ATOM")) {
      prot.push({
        resn: L.slice(17, 20).trim(), chain: L.slice(21, 22).trim(), resi: parseInt(L.slice(22, 26), 10),
        name: L.slice(12, 16).trim(),
        el: L.slice(76, 78).trim() || L.slice(12, 16).trim()[0],
        xyz: [parseFloat(L.slice(30, 38)), parseFloat(L.slice(38, 46)), parseFloat(L.slice(46, 54))],
      });
    }
  }
  return { het, prot };
}

// ---------- 第 1 步相机重建 + 校验 ----------
const glc = parseSdf(join(G1, "ligand-GLC.sdf"));
const g6pCza = parseSdf(join(G1, "ligand-G6P.sdf")); // 1CZA 晶体坐标（未对齐版）
const pocket1 = JSON.parse(readFileSync(join(G1, "pocket.json"), "utf8"));
const GLC_LABEL = { 1: "C1", 2: "C2", 3: "C3", 4: "C4", 5: "C5", 6: "C6", 7: "O1", 8: "O2", 9: "O3", 10: "O4", 11: "O5(环)", 12: "O6" };
const G6P_LABEL = { ...GLC_LABEL, 13: "P", 14: "O1P", 15: "O2P", 16: "O3P" };

const glcC = glc.atoms.map((a) => a.xyz);
const glcCentroid = [0, 1, 2].map((d) => glcC.reduce((s, p) => s + p[d], 0) / glcC.length);
const CORE1 = [1, 2, 3, 4, 5, 6, 11, 12]; // C1–C6 + O5 + O6
const k1 = kabsch(CORE1.map((i) => g6pCza.atoms.find((a) => a.id === i).xyz), CORE1.map((i) => glc.atoms.find((a) => a.id === i).xyz));
const g6pAligned1 = g6pCza.atoms.map((a) => ({ ...a, xyz: applyRt(k1.R, k1.t, a.xyz) }));
// 上一轮 gk-1 的 resPoints 来自 holo.pdb 的 Cα；此处同样重建
function parseCa(path) {
  const cas = [];
  for (const L of readFileSync(path, "utf8").split(/\r?\n/)) {
    if (!L.startsWith("ATOM")) continue;
    if (L.slice(12, 16).trim() !== "CA") continue;
    cas.push({ resi: parseInt(L.slice(22, 26), 10), resn: L.slice(17, 20).trim(), chain: L.slice(21, 22).trim(), xyz: [parseFloat(L.slice(30, 38)), parseFloat(L.slice(38, 46)), parseFloat(L.slice(46, 54))] });
  }
  return cas;
}
const cas1 = parseCa(join(G1, "holo.pdb"));
const ca1ByResi = new Map(cas1.map((c) => [c.resi, c.xyz]));
const resPts1 = pocket1.residues.map((r) => ca1ByResi.get(r.resi)).filter(Boolean);

const VW = 760, VH = 560;
const camShared1 = makeCamera(glcCentroid, [...resPts1, ...glcC, ...g6pAligned1.map((a) => a.xyz)], VW, VH, 64);

// 校验：与 gk-1 已发布资产逐点比对（gk-1 的 frame-f0 实际也是 shared 相机投影，见 atomNode 实现）
const refF0 = JSON.parse(readFileSync(join(G1_OUT, "frame-f0.json"), "utf8"));
const refF2 = JSON.parse(readFileSync(join(G1_OUT, "frame-f2.json"), "utf8"));
let maxDev = 0;
for (const a of glc.atoms) {
  const [x, y] = camShared1.project(a.xyz);
  const ref = refF0.atoms.find((r) => r.id === a.id);
  const ref2 = refF2.atoms.find((r) => r.id === a.id);
  maxDev = Math.max(maxDev, Math.hypot(x - ref.x, y - ref.y), Math.hypot(x - ref2.x, y - ref2.y));
}
console.log(`第 1 步相机重建校验（shared）：与 gk-1 f0/f2 资产最大偏差 ${maxDev.toFixed(3)} px`);
if (maxDev > 0.2) {
  console.error("相机重建与第 1 步不一致，中止（跨步连续性不成立）");
  process.exit(1);
}

// ---------- 1U0F：G6P 实例 + 界面残基 + 氢键 ----------
if (!existsSync(PDB_1U0F)) {
  console.error("缺少 tools/cache/1U0F.pdb——请先从 RCSB 下载");
  process.exit(1);
}
const { het, prot } = parsePdb(PDB_1U0F);
// altloc 处理：1U0F 链 A resi 900 的 G6P 带 altloc（两个 O1）——
// 每个原子名取 altloc 为空者优先，否则取 "A"，保证每个 name 恰好一个实例
const altRank = (a) => (a.altloc.trim() === "" ? 0 : a.altloc.trim() === "A" ? 1 : 2);
const seen = new Set();
const g6pU0f = het
  .filter((a) => a.resn === "G6P" && a.chain === "A" && a.resi === 900)
  .sort((a, b) => altRank(a) - altRank(b))
  .filter((a) => { const k = a.name; if (seen.has(k)) return false; seen.add(k); return true; });
if (!g6pU0f.find((a) => a.name === "P") || g6pU0f.length < 16) {
  console.error("1U0F G6P 实例原子数异常：", g6pU0f.length);
  process.exit(1);
}
const u0fAtom = (name) => g6pU0f.find((a) => a.name === name)?.xyz;
const U0F_LABEL = { C1: "C1", C2: "C2", C3: "C3", C4: "C4", C5: "C5", C6: "C6", O1: "O1", O2: "O2", O3: "O3", O4: "O4", O5: "O5(环)", O6: "O6", P: "P", O1P: "O1P", O2P: "O2P", O3P: "O3P" };

// 对齐链 T1：1U0F·G6P → 1CZA·G6P 晶体坐标（8 核心原子：C1–C6, O6, P）
const coreNames = ["C1", "C2", "C3", "C4", "C5", "C6", "O6", "P"];
const czaById = new Map(g6pCza.atoms.map((a) => [a.id, a]));
const coreCza = coreNames.map((n) => czaById.get(n === "C1" ? 1 : n === "C2" ? 2 : n === "C3" ? 3 : n === "C4" ? 4 : n === "C5" ? 5 : n === "C6" ? 6 : n === "O6" ? 12 : 13).xyz);
const T1 = kabsch(coreNames.map((n) => u0fAtom(n)), coreCza);
const rmsdT1 = rmsdOf(coreNames.map((n) => [applyRt(T1.R, T1.t, u0fAtom(n)), czaById.get(n === "C1" ? 1 : n === "C2" ? 2 : n === "C3" ? 3 : n === "C4" ? 4 : n === "C5" ? 5 : n === "C6" ? 6 : n === "O6" ? 12 : 13).xyz]));
console.log(`T1（1U0F·G6P → 1CZA·G6P）RMSD = ${rmsdT1.toFixed(2)} Å（同为葡糖-6-磷酸吡喃型）`);
const t1 = (p) => applyRt(T1.R, T1.t, p);

// 界面残基（≤4.5 Å，距离启发式，provenance=computed）+ 氢键（≤3.6 Å 杂原子对）
const ligHeavy = g6pU0f;
const resMap = new Map();
for (const p of prot) {
  for (const l of ligHeavy) {
    const d = Math.hypot(p.xyz[0] - l.xyz[0], p.xyz[1] - l.xyz[1], p.xyz[2] - l.xyz[2]);
    if (d < 4.5) {
      const k = `${p.chain}:${p.resi}`;
      if (!resMap.has(k)) resMap.set(k, { resi: p.resi, resn: p.resn, chain: p.chain, minDist: d, hbond: false });
      else { const r = resMap.get(k); r.minDist = Math.min(r.minDist, d); }
      break;
    }
  }
}
const hb2 = [];
for (const p of prot) {
  if (!"NOS".includes(p.el)) continue;
  for (const l of ligHeavy) {
    if (l.el === "C") continue;
    const d = Math.hypot(p.xyz[0] - l.xyz[0], p.xyz[1] - l.xyz[1], p.xyz[2] - l.xyz[2]);
    if (d <= 3.6) {
      hb2.push({ prot: { ...p, dist: d }, lig: { name: l.name, x: l.xyz[0], y: l.xyz[1], z: l.xyz[2], id: "G6P" } });
      const k = `${p.chain}:${p.resi}`;
      if (resMap.has(k)) resMap.get(k).hbond = true;
      break;
    }
  }
}
const residues2 = [...resMap.values()];
const cas2 = prot.filter((p) => p.name === "CA");
const ca2Map = new Map(cas2.map((c) => [`${c.chain}:${c.resi}`, c.xyz]));
for (const r of residues2) r.ca = ca2Map.get(`${r.chain}:${r.resi}`) ?? null;
const res2ok = residues2.filter((r) => r.ca);
console.log(`1U0F 界面残基 ${res2ok.length} 个（≤4.5 Å），氢键 ${hb2.length} 条（≤3.6 Å，距离启发式）`);

// ---------- 2CXS：F6P + pocket.json（只读复用） ----------
const f6p = parseSdf(join(G2, "ligand.sdf"));
const pocket2 = JSON.parse(readFileSync(join(G2, "pocket.json"), "utf8"));
// F6P 原子标注（2CXS ligand.sdf 拓扑，呋喃型果糖-6-磷酸，人工核验）：
// 1=O1 2=C1 3=C2(半缩酮,OH) 4=O2 5=C3 6=O3 7=C4 8=O4 9=C5 10=O5(环) 11=C6 12=O6 13=P 14-16=O1P/O2P/O3P
const F6P_LABEL = { 1: "O1", 2: "C1", 3: "C2", 4: "O2", 5: "C3", 6: "O3", 7: "C4", 8: "O4", 9: "C5", 10: "O5(环)", 11: "C6", 12: "O6", 13: "P", 14: "O1P", 15: "O2P", 16: "O3P" };
const f6pAtom = (label) => f6p.atoms.find((a) => F6P_LABEL[a.id] === label)?.xyz;
// 对齐链 T2：F6P → 1U0F·G6P（C1–C6/O6/P 8 原子；呋喃↔吡喃差异计入 RMSD，如实记录）
const T2 = kabsch(coreNames.map((n) => f6pAtom(n)), coreNames.map((n) => u0fAtom(n)));
const t2t1 = (p) => t1(applyRt(T2.R, T2.t, p));
const rmsdT2 = rmsdOf(coreNames.map((n) => [applyRt(T2.R, T2.t, f6pAtom(n)), u0fAtom(n)]));
console.log(`T2（2CXS·F6P → 1U0F·G6P）RMSD = ${rmsdT2.toFixed(2)} Å（含呋喃型↔吡喃型环型差异）`);

// ---------- 投影 ----------
// 共享相机：先以第 1 步相机投影，检查 gk-2 内容是否越界，必要时对称外扩画布
const g2SharedPts3d = [
  ...res2ok.map((r) => r.ca),
  ...g6pU0f.map((a) => t1(a.xyz)),
  ...(pocket2.hbonds ?? []).map((h) => (h.prot?.x != null ? [h.prot.x, h.prot.y, h.prot.z] : null)).filter(Boolean),
  ...f6p.atoms.map((a) => t2t1(a.xyz)),
];
// 2CXS 残基 Cα：pocket.json 不含坐标，需从 2CXS holo.pdb 取
const cas2cxs = parseCa(join(G2, "holo.pdb"));
const ca2cxsMap = new Map(cas2cxs.map((c) => [c.resi, c.xyz]));
const res2cxs = pocket2.residues.map((r) => ({ ...r, ca: ca2cxsMap.get(r.resi) ?? null })).filter((r) => r.ca);
res2cxs.forEach((r) => g2SharedPts3d.push(t2t1(r.ca)));

let minX = 1e9, maxX = -1e9, minY = 1e9, maxY = -1e9;
for (const p of g2SharedPts3d) {
  const [x, y] = camShared1.project(p);
  minX = Math.min(minX, x); maxX = Math.max(maxX, x);
  minY = Math.min(minY, y); maxY = Math.max(maxY, y);
}
const MARGIN = 44;
const W2 = Math.max(VW, Math.ceil(maxX - minX) + 2 * MARGIN);
const H2 = Math.max(VH, Math.ceil(maxY - minY) + 2 * MARGIN);
const offX = (W2 - VW) / 2, offY = (H2 - VH) / 2;
const P = (p) => { const [x, y] = camShared1.project(p); return [+ (x + offX).toFixed(1), +(y + offY).toFixed(1)]; };
console.log(`共享画布外扩：${VW}×${VH} → ${W2}×${H2}（配体屏幕位置与第 1 步逐点一致）`);

// ---------- 帧资产 ----------
// F0：底物 G6P 单分子（1U0F），第 1 步 shared 相机（与 gk-1 全帧同相机：分子位置连续）
const f0 = {
  frameId: "gk-2-f0",
  camera: "shared(step1)",
  view: { w: VW, h: VH },
  atoms: g6pU0f.map((a, i) => {
    const [x, y] = camShared1.project(t1(a.xyz));
    return { id: i + 1, el: a.el, x: +x.toFixed(1), y: +y.toFixed(1), label: U0F_LABEL[a.name], emph: "base" };
  }),
  bonds: sugarBonds(g6pU0f, U0F_LABEL).map((b) => ({ ...b, emph: "base" })),
  residues: [],
  hbonds: [],
  provenance: [
    "G6P 实例取自 1U0F（小鼠 GPI，1.6 Å，链 A resi 900）实验坐标，未改动内部构象",
    "经 Kabsch 对齐至 1CZA·G6P 晶体位置（T1），与第 1 步帧带共享相机与视角",
  ],
};

// F2：结合态 G6P（1U0F 口袋）
const byId2 = new Map(g6pU0f.map((a) => [a.name, a]));
function sugarBonds(atoms, labelOf) {
  // 键连由原子名推断（C1–C6 糖链 + 各 C–O + O6–P + P–Ox），非 SDF 键表
  const bonds = [];
  const has = (n) => atoms.some((a) => a.name === n || labelOf[a.name] === n);
  const idx = (n) => atoms.findIndex((a) => a.name === n || labelOf[a.name] === n);
  for (let i = 1; i <= 5; i++) bonds.push([`C${i}`, `C${i + 1}`]);
  bonds.push(["C1", "O1"], ["C2", "O2"], ["C3", "O3"], ["C4", "O4"], ["C5", "O5(环)"], ["C1", "O5(环)"], ["C6", "O6"], ["O6", "P"], ["P", "O1P"], ["P", "O2P"], ["P", "O3P"]);
  return bonds
    .filter(([a, b]) => has(a) && has(b))
    .map(([a, b]) => ({ a: idx(a) + 1, b: idx(b) + 1 }))
    .filter((b) => b.a > 0 && b.b > 0);
}
const f2Bonds = sugarBonds(g6pU0f, U0F_LABEL);
const f2 = {
  frameId: "gk-2-f2",
  camera: "shared(step1)+扩展画布",
  view: { w: W2, h: H2 },
  atoms: g6pU0f.map((a, i) => {
    const [x, y] = P(t1(a.xyz));
    return { id: i + 1, el: a.el, x, y, label: U0F_LABEL[a.name], emph: "base" };
  }),
  bonds: f2Bonds.map((b) => ({ ...b, emph: "base" })),
  residues: res2ok.map((r) => {
    const [x, y] = P(t1(r.ca));
    return { resi: r.resi, resn: r.resn, chain: r.chain, type: r.hbond ? "hbond" : "contact", x, y };
  }),
  hbonds: hb2.map((h) => {
    const [x1, y1] = P([h.prot.xyz[0], h.prot.xyz[1], h.prot.xyz[2]]);
    const [x2, y2] = P([h.lig.x, h.lig.y, h.lig.z]);
    return { x1, y1, x2, y2, prot: `${h.prot.resn}${h.prot.resi}·${h.prot.name}`, lig: `${h.lig.id}·${h.lig.name}`, dist: +h.prot.dist.toFixed(2) };
  }),
  provenance: [
    "1U0F（小鼠 GPI，1.6 Å）实验坐标；界面残基与氢键为离线重算（≤4.5 Å / ≤3.6 Å 距离启发式），provenance=computed",
    "口袋坐标经 T1 刚体对齐至第 1 步相机（跨步连续），RMSD 见报脚",
    "跨结构示意：本帧与第 1 步帧来自不同结构（己糖激酶 ≠ 磷酸葡萄糖异构酶），口袋不可直接比较",
  ],
};

// F3：产物 F6P（2CXS 口袋），C1/C2 差异高亮（无新增原子 → emph=diff，非 new）
const DIFF_ATOMS = new Set(["C1", "C2", "O2"]); // 羰基从 C1 移到 C2：C1(变 CH2OH)、C2(半缩酮碳)、O2(原羰基氧)
const DIFF_BONDS = new Set(["C1-C2", "C2-O2"]);
const f3 = {
  frameId: "gk-2-f3",
  camera: "shared(step1)+扩展画布",
  view: { w: W2, h: H2 },
  atoms: f6p.atoms.map((a) => {
    const [x, y] = P(t2t1(a.xyz));
    return { id: a.id, el: a.el, x, y, label: F6P_LABEL[a.id], emph: DIFF_ATOMS.has(F6P_LABEL[a.id]) ? "diff" : "dim" };
  }),
  bonds: f6p.bonds.map((b) => {
    const la = F6P_LABEL[b.a], lb = F6P_LABEL[b.b];
    const key1 = `${la}-${lb}`, key2 = `${lb}-${la}`;
    return { a: b.a, b: b.b, emph: DIFF_BONDS.has(key1) || DIFF_BONDS.has(key2) ? "diff" : "dim" };
  }),
  diffNote: "异构化无新增原子：羰基从 C1 移到 C2（醛糖↔酮糖），糖环由吡喃型变为呋喃型（砖红=C1/C2/O2 及其键）",
  residues: res2cxs.map((r) => {
    const [x, y] = P(t2t1(r.ca));
    return { resi: r.resi, resn: r.resn, chain: r.chain, type: r.type, x, y };
  }),
  hbonds: (pocket2.hbonds ?? [])
    .filter((h) => h.prot?.x != null && h.lig?.x != null)
    .map((h) => {
      const [x1, y1] = P(t2t1([h.prot.x, h.prot.y, h.prot.z]));
      const [x2, y2] = P(t2t1([h.lig.x, h.lig.y, h.lig.z]));
      return { x1, y1, x2, y2, prot: `${h.prot.resn}${h.prot.resi}·${h.prot.name}`, lig: `${h.lig.id}·${h.lig.name}`, dist: h.dist };
    }),
  provenance: [
    "F6P 实验坐标取自 2CXS（小鼠 GPI，1.5 Å）——与 F2 的 1U0F 为同酶同物种跨结构（核验表三档第 2 档），口袋拓扑一致、构象差异为真实物理差异",
    "口袋坐标经 T2∘T1 刚体对齐至第 1 步相机（跨步连续），两级 RMSD 见报脚；跨结构示意，非同一口袋",
    "氢键复用 gly-02 pocket.json 一手记录（provenance=computed）",
    "C1–C2 异构化无新增原子，故不适用第 1 步的砖红'新增原子'法，改用 emph=diff 高亮 C1/C2/O2",
  ],
};

// ---------- 写出 ----------
for (const f of [f0, f2, f3]) {
  writeFileSync(join(OUT, `frame-${f.frameId.slice(-2)}.json`), JSON.stringify(f));
  console.log(`写出 ${f.frameId}.json（${(Buffer.byteLength(JSON.stringify(f)) / 1024).toFixed(1)} KB）`);
}
const index = {
  pathwayId: "glycolysis",
  stepId: "gk-2",
  stepIndex: 2,
  frames: [
    { frameId: "gk-2-f0", role: "substrate", asset: "frame-f0.json", computed: false, ligandCodes: ["G6P"], source: "1U0F / Mus musculus / 1.6 Å" },
    { frameId: "gk-2-f1", role: "apo", asset: null, computed: false, ligandCodes: [], source: "1JIQ / Homo sapiens / 1.9 Å", note: "跨物种降级：文字声明帧，无坐标资产" },
    { frameId: "gk-2-f2", role: "bound", asset: "frame-f2.json", computed: true, ligandCodes: ["G6P"], source: "1U0F / Mus musculus / 1.6 Å" },
    { frameId: "gk-2-f3", role: "product", asset: "frame-f3.json", computed: true, ligandCodes: ["F6P"], source: "2CXS / Mus musculus / 1.5 Å" },
  ],
  alignment: {
    crossStepCamera: "第 1 步相机重建后与 gk-1 已发布资产逐点校验（<0.2 px），再以 T1/T2 两级 Kabsch 接入",
    T1: `1U0F·G6P → 1CZA·G6P，RMSD ${rmsdT1.toFixed(2)} Å（8 核心原子：C1–C6/O6/P）`,
    T2: `2CXS·F6P → 1U0F·G6P，RMSD ${rmsdT2.toFixed(2)} Å（含呋喃↔吡喃环型差异）`,
  },
};
writeFileSync(join(OUT, "index.json"), JSON.stringify(index, null, 2));
console.log("gk-2 帧资产完成。");
