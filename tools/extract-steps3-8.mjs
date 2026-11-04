// ============================================================
// extract-steps3-8.mjs —— 第 3–8 步帧资产（PFK-1 / 醛缩酶 / TPI / GAPDH / PGK / PGAM）
//
// 结构实情（research/step-states.md 核验表，不猜）：
//   gk-3  8W2G 人 PFKL cryo-EM 3.0 Å（F6P A801 + ADP + FBP 别构位点）；无 apo → f1/f3 声明帧
//   gk-4  4ALD 人 2.8 Å（2FP=线形 F1,6BP A364，天然人骨骼肌 ALDOA，RCSB 已核实）；
//         1ADO 兔 1.9 Å（DHAP=13P A1104，与 4ALD 同酶不同物种）；5KY6 人野生型 apo 1.94 Å（Cα 并入，跨结构同物种）
//   gk-5  1NEY 酵母 1.2 Å（DHAP=13P A5001，含 FTR168 修饰残基）；GAP 无 PDB 组分 → 2D 帧
//   gk-6  1U8F 人 1.75 Å（NAD 链 P resi 336）；apo 8G15 人 2.07 Å（同物种可并置）；GAP/1,3-BPG 无组分 → 2D 帧
//   gk-7  9FDN 人 1.58 Å（3PG A503 + ATP A502）；apo 8YHP 人 1.95 Å；2WZB 人 1.47 Å（ADP+3PG+MGF 过渡态模拟）
//   gk-8  1QHF 酵母 1.7 Å（3PG A252）；4GPZ 人半 apo → 声明帧；2PG 兜底 1EQJ 细菌（分子级）
//
// 相机链：
//   步 3：Kabsch(8W2G·F6P → 2CXS·F6P 第 2 步链末端) 接第 1 步相机（跨物种配体级，全原子）
//   步 4：Kabsch(2FP 骨架 → F6P 链末端)；DHAP 再对齐 2FP 的 C1–C3 端
//   步 5：Kabsch(1NEY·13P → 1ADO·13P 链末端)
//   步 6：相机重建（GAP 无 3D 坐标，链在此断开，帧带已声明）；8G15 经 Cα Kabsch 并入
//   步 7：相机重建（与 GAPDH 无公共配体，断开重建）；2WZB 经 3PG Kabsch、8YHP 经 Cα Kabsch 并入
//   步 8：Kabsch(1QHF·3PG → 9FDN·3PG) 接第 7 步相机；2PG 对齐 3PG 羧基端
//
// 输出：public/assets/structures/gk-{3..8}/frame-*.json + index.json
// ============================================================
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const G1 = join(ROOT, "public", "assets", "steps", "gly-01");
const G2 = join(ROOT, "public", "assets", "steps", "gly-02");
const G1_OUT = join(ROOT, "public", "assets", "structures", "gk-1");
const G2_OUT = join(ROOT, "public", "assets", "structures", "gk-2");
const CACHE = join(ROOT, "tools", "cache");
const S3 = join(ROOT, "public", "assets", "structures", "gk-3");
const S4 = join(ROOT, "public", "assets", "structures", "gk-4");
const S5 = join(ROOT, "public", "assets", "structures", "gk-5");
const S6 = join(ROOT, "public", "assets", "structures", "gk-6");
const S7 = join(ROOT, "public", "assets", "structures", "gk-7");
const S8 = join(ROOT, "public", "assets", "structures", "gk-8");
for (const d of [S3, S4, S5, S6, S7, S8]) mkdirSync(d, { recursive: true });

// ---------- 数学（与 extract-step1/2 脚本一致，勿单独改动） ----------
const v3 = {
  sub: (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]],
  dot: (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2],
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
function parsePdb(path) {
  const het = [], prot = [];
  for (const L of readFileSync(path, "utf8").split(/\r?\n/)) {
    if (L.startsWith("HETATM")) {
      het.push({
        resn: L.slice(17, 20).trim(), chain: L.slice(21, 22).trim(), resi: parseInt(L.slice(22, 26), 10),
        name: L.slice(12, 16).trim(), altloc: L.slice(16, 17),
        el: (L.slice(76, 78).trim() || L.slice(12, 16).trim()[0]).toUpperCase(),
        xyz: [parseFloat(L.slice(30, 38)), parseFloat(L.slice(38, 46)), parseFloat(L.slice(46, 54))],
      });
    } else if (L.startsWith("ATOM")) {
      prot.push({
        resn: L.slice(17, 20).trim(), chain: L.slice(21, 22).trim(), resi: parseInt(L.slice(22, 26), 10),
        name: L.slice(12, 16).trim(),
        el: (L.slice(76, 78).trim() || L.slice(12, 16).trim()[0]).toUpperCase(),
        xyz: [parseFloat(L.slice(30, 38)), parseFloat(L.slice(38, 46)), parseFloat(L.slice(46, 54))],
      });
    }
  }
  return { het, prot };
}

/** 取配体实例：resn/chain/resi 过滤，排除 H；altloc 空优先、否则 "A"，每原子名取一个 */
function ligandAtoms(het, resn, chain, resi) {
  const altRank = (a) => (a.altloc.trim() === "" ? 0 : a.altloc.trim() === "A" ? 1 : 2);
  const seen = new Set();
  return het
    .filter((a) => a.resn === resn && a.chain === chain && a.resi === resi && a.el !== "H" && a.el !== "D")
    .sort((a, b) => altRank(a) - altRank(b))
    .filter((a) => { const k = a.name; if (seen.has(k)) return false; seen.add(k); return true; });
}

/** 距离成键（重原子，截止 1.75 Å；Mg–X 放宽到 2.2 Å） */
function distBonds(atoms) {
  const bonds = [];
  for (let i = 0; i < atoms.length; i++) {
    for (let j = i + 1; j < atoms.length; j++) {
      const a = atoms[i], b = atoms[j];
      const cut = a.el === "MG" || b.el === "MG" ? 2.2 : 1.75;
      const d = Math.hypot(a.xyz[0] - b.xyz[0], a.xyz[1] - b.xyz[1], a.xyz[2] - b.xyz[2]);
      if (d < cut && d > 0.4) bonds.push({ a: i + 1, b: j + 1 });
    }
  }
  return bonds;
}

/** 界面残基（≤4.5 Å）+ 氢键（≤3.6 Å 杂原子对），蛋白侧=protAtoms（可含修饰残基） */
function pocketAndHbonds(protAtoms, ligAtoms) {
  const resMap = new Map();
  for (const p of protAtoms) {
    for (const l of ligAtoms) {
      const d = Math.hypot(p.xyz[0] - l.xyz[0], p.xyz[1] - l.xyz[1], p.xyz[2] - l.xyz[2]);
      if (d < 4.5) {
        const k = `${p.chain}:${p.resi}`;
        if (!resMap.has(k)) resMap.set(k, { resi: p.resi, resn: p.resn, chain: p.chain, minDist: d, hbond: false });
        else { const r = resMap.get(k); r.minDist = Math.min(r.minDist, d); }
        break;
      }
    }
  }
  const hb = [];
  for (const p of protAtoms) {
    if (!"NOS".includes(p.el)) continue;
    for (const l of ligAtoms) {
      if (l.el === "C") continue;
      const d = Math.hypot(p.xyz[0] - l.xyz[0], p.xyz[1] - l.xyz[1], p.xyz[2] - l.xyz[2]);
      if (d <= 3.6) {
        hb.push({ p, l, d });
        const k = `${p.chain}:${p.resi}`;
        if (resMap.has(k)) resMap.get(k).hbond = true;
        break;
      }
    }
  }
  return { residues: [...resMap.values()], hbonds: hb };
}

function parseCa(prot) {
  return prot.filter((p) => p.name === "CA");
}

/** 序列游走配对：resn 相同则前进；不同则 ±lookahead 前瞻跳过插入/缺失（编号插入免疫） */
function walkPairs(listA, listB, lookahead = 6) {
  const pairs = [];
  let i = 0, j = 0;
  while (i < listA.length && j < listB.length) {
    if (listA[i].resn === listB[j].resn) { pairs.push([listA[i], listB[j]]); i++; j++; continue; }
    let found = false;
    for (let d = 1; d <= lookahead && !found; d++) {
      if (i + d < listA.length && listA[i + d].resn === listB[j].resn) { i += d; found = true; }
      else if (j + d < listB.length && listA[i].resn === listB[j + d].resn) { j += d; found = true; }
    }
    if (!found) { i++; j++; }
  }
  return pairs;
}

/** 两结构 Cα Kabsch：遍历链组合，序列游走配对（resn 一致才计入），取 RMSD 最小者 */
function kabschCa(protA, protB) {
  const chainsA = [...new Set(protA.map((p) => p.chain))];
  const chainsB = [...new Set(protB.map((p) => p.chain))];
  let best = null;
  for (const ca of chainsA) {
    const listA = parseCa(protA.filter((p) => p.chain === ca)).sort((a, b) => a.resi - b.resi);
    if (listA.length < 50) continue;
    for (const cb of chainsB) {
      const listB = parseCa(protB.filter((p) => p.chain === cb)).sort((a, b) => a.resi - b.resi);
      if (listB.length < 50) continue;
      const pairs = walkPairs(listA, listB);
      if (pairs.length < 100) continue;
      const T = kabsch(pairs.map(([a]) => a.xyz), pairs.map(([, b]) => b.xyz));
      const rmsd = rmsdOf(pairs.map(([a, b]) => [applyRt(T.R, T.t, a.xyz), b.xyz]));
      if (!best || rmsd < best.rmsd) best = { T, rmsd, nPairs: pairs.length, chainA: ca, chainB: cb };
    }
  }
  if (!best) throw new Error("Cα 对齐失败：无足够公共残基（≥100）");
  return best;
}

// ---------- 画布外扩 ----------
const VW = 760, VH = 560, MARGIN = 44;
function makeProjector(cam, pts3d) {
  // pts3d 元素可为 xyz 数组或带 .xyz 的原子对象（调用方两种都有），统一归一
  const pts = pts3d.map((p) => (Array.isArray(p) ? p : p.xyz));
  let minX = 1e9, maxX = -1e9, minY = 1e9, maxY = -1e9;
  for (const p of pts) {
    if (!Number.isFinite(p[0]) || !Number.isFinite(p[1]) || !Number.isFinite(p[2])) {
      console.error(`[NaN 防线] makeProjector 收到非法 3D 点:`, JSON.stringify(p));
      throw new Error("NaN 输入");
    }
    const [x, y] = cam.project(p);
    minX = Math.min(minX, x); maxX = Math.max(maxX, x);
    minY = Math.min(minY, y); maxY = Math.max(maxY, y);
  }
  const W = Math.max(VW, Math.ceil(maxX - minX) + 2 * MARGIN);
  const H = Math.max(VH, Math.ceil(maxY - minY) + 2 * MARGIN);
  const offX = (W - VW) / 2, offY = (H - VH) / 2;
  return { W, H, P: (p) => { const [x, y] = cam.project(p); return [+(x + offX).toFixed(1), +(y + offY).toFixed(1)]; } };
}
const r1 = (x) => +x.toFixed(1);

/** 配体帧资产（分子 + 可选口袋/氢键） */
function ligandFrame(frameId, camera, atoms3d, opts = {}) {
  const { residues = [], hbonds = [], extraAtoms = [], extraBonds = [], emphOf = () => "base", labelOf = () => null, provenance = [], diffNote } = opts;
  const all3d = [...atoms3d, ...extraAtoms];
  const { W, H, P } = makeProjector(camera, all3d);
  const atoms = atoms3d.map((a, i) => {
    const [x, y] = P(a.xyz);
    return { id: i + 1, el: a.el, x, y, label: labelOf(a), emph: emphOf(a) };
  });
  const extra = extraAtoms.map((a, i) => {
    const [x, y] = P(a.xyz);
    return { id: atoms3d.length + i + 1, el: a.el, x, y, label: labelOf(a, true), emph: emphOf(a) };
  });
  const bonds = distBonds(atoms3d).map((b) => ({ ...b, emph: emphOf(atoms3d[b.a - 1]) }));
  const eBonds = extraBonds.map((b) => ({ ...b, a: b.a + atoms3d.length, b: b.b + atoms3d.length, emph: emphOf(extraAtoms[b.a - 1]) }));
  return {
    frameId,
    camera: opts.cameraLabel ?? "shared(step1)+扩展画布",
    view: { w: W, h: H },
    atoms: [...atoms, ...extra],
    bonds: [...bonds, ...eBonds],
    residues: residues.map((r) => { const [x, y] = P(r.ca); return { resi: r.resi, resn: r.resn, chain: r.chain, type: r.hbond ? "hbond" : "contact", x, y }; }),
    hbonds: hbonds.map(({ p, l, d }) => { const [x1, y1] = P(p.xyz); const [x2, y2] = P(l.xyz); return { x1, y1, x2, y2, prot: `${p.resn}${p.resi}·${p.name}`, lig: `${l.resn ?? "LIG"}·${l.name}`, dist: r1(d) }; }),
    diffNote,
    provenance,
  };
}

// ---------- 第 1 步相机重建 + 校验（同 extract-step2-frames.mjs） ----------
function parseSdf(path) {
  const lines = readFileSync(path, "utf8").split(/\r?\n/);
  const na = parseInt(lines[3].slice(0, 3), 10);
  const nb = parseInt(lines[3].slice(3, 6), 10);
  const atoms = [];
  for (let i = 0; i < na; i++) {
    const L = lines[4 + i];
    atoms.push({ id: i + 1, el: L.slice(31, 34).trim(), xyz: [parseFloat(L.slice(0, 10)), parseFloat(L.slice(10, 20)), parseFloat(L.slice(20, 30))] });
  }
  return { atoms };
}
const glc = parseSdf(join(G1, "ligand-GLC.sdf"));
const g6pCza = parseSdf(join(G1, "ligand-G6P.sdf"));
const pocket1 = JSON.parse(readFileSync(join(G1, "pocket.json"), "utf8"));
function parseCaFile(path) {
  const cas = [];
  for (const L of readFileSync(path, "utf8").split(/\r?\n/)) {
    if (!L.startsWith("ATOM")) continue;
    if (L.slice(12, 16).trim() !== "CA") continue;
    cas.push({ resi: parseInt(L.slice(22, 26), 10), xyz: [parseFloat(L.slice(30, 38)), parseFloat(L.slice(38, 46)), parseFloat(L.slice(46, 54))] });
  }
  return cas;
}
const glcC = glc.atoms.map((a) => a.xyz);
const glcCentroid = [0, 1, 2].map((d) => glcC.reduce((s, p) => s + p[d], 0) / glcC.length);
const CORE1 = [1, 2, 3, 4, 5, 6, 11, 12];
const k1 = kabsch(CORE1.map((i) => g6pCza.atoms.find((a) => a.id === i).xyz), CORE1.map((i) => glc.atoms.find((a) => a.id === i).xyz));
const g6pAligned1 = g6pCza.atoms.map((a) => ({ ...a, xyz: applyRt(k1.R, k1.t, a.xyz) }));
const cas1 = parseCaFile(join(G1, "holo.pdb"));
const ca1ByResi = new Map(cas1.map((c) => [c.resi, c.xyz]));
const resPts1 = pocket1.residues.map((r) => ca1ByResi.get(r.resi)).filter(Boolean);
const camShared1 = makeCamera(glcCentroid, [...resPts1, ...glcC, ...g6pAligned1.map((a) => a.xyz)], VW, VH, 64);
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
if (maxDev > 0.2) { console.error("相机重建与第 1 步不一致，中止"); process.exit(1); }

// ---------- 第 2 步链末端：2CXS·F6P 的最终位置（t2∘t1） ----------
const f6p2cxs = parseSdf(join(G2, "ligand.sdf"));
const F6P_LABEL = { 1: "O1", 2: "C1", 3: "C2", 4: "O2", 5: "C3", 6: "O3", 7: "C4", 8: "O4", 9: "C5", 10: "O5(环)", 11: "C6", 12: "O6", 13: "P", 14: "O1P", 15: "O2P", 16: "O3P" };
const u0f = parsePdb(join(CACHE, "1U0F.pdb"));
const g6pU0f = ligandAtoms(u0f.het, "G6P", "A", 900);
const u0fAtom = (n) => g6pU0f.find((a) => a.name === n).xyz;
const coreNames = ["C1", "C2", "C3", "C4", "C5", "C6", "O6", "P"];
const czaById = new Map(g6pCza.atoms.map((a) => [a.id, a]));
const czaCore = (n) => czaById.get({ C1: 1, C2: 2, C3: 3, C4: 4, C5: 5, C6: 6, O6: 12, P: 13 }[n]).xyz;
const T1 = kabsch(coreNames.map((n) => u0fAtom(n)), coreNames.map((n) => czaCore(n)));
const t1 = (p) => applyRt(T1.R, T1.t, p);
const T2 = kabsch(coreNames.map((n) => f6p2cxs.atoms.find((a) => F6P_LABEL[a.id] === n).xyz), coreNames.map((n) => u0fAtom(n)));
const t2t1 = (p) => t1(applyRt(T2.R, T2.t, p));
// 2CXS·F6P 各标签的链末端参考坐标
const f6pChainRef = {};
for (const a of f6p2cxs.atoms) f6pChainRef[F6P_LABEL[a.id]] = t2t1(a.xyz);

// ============================================================
// 第 3 步：PFK-1（8W2G）
// ============================================================
const w2g = parsePdb(join(CACHE, "8W2G.pdb"));
const f6p8w = ligandAtoms(w2g.het, "F6P", "A", 801);
const f6p8wByName = new Map(f6p8w.map((a) => [a.name, a]));
const f6pRefName = (n) => (n === "O5" ? "O5(环)" : n); // 8W2G 命名 O5 ↔ 2CXS 标签 O5(环)
const T3 = kabsch(f6p8w.map((a) => a.xyz), f6p8w.map((a) => f6pChainRef[f6pRefName(a.name)]));
const t3 = (p) => applyRt(T3.R, T3.t, p);
const rmsdT3 = rmsdOf(f6p8w.map((a) => [t3(a.xyz), f6pChainRef[f6pRefName(a.name)]]));
console.log(`T3（8W2G·F6P → 2CXS·F6P 链末端）RMSD = ${rmsdT3.toFixed(2)} Å（16 原子全匹配，跨物种=配体级）`);

// 催化位点 ADP 选择：三实例中离 F6P 最近者（数据驱动，不指定）
const adpInstances = [802, 803, 804].map((resi) => ligandAtoms(w2g.het, "ADP", "A", resi));
let adpCat = null, adpDist = 1e9;
for (const inst of adpInstances) {
  let dmin = 1e9;
  for (const a of inst) for (const b of f6p8w) dmin = Math.min(dmin, Math.hypot(a.xyz[0] - b.xyz[0], a.xyz[1] - b.xyz[1], a.xyz[2] - b.xyz[2]));
  if (dmin < adpDist) { adpDist = dmin; adpCat = inst; }
}
console.log(`催化位点 ADP 选择：离 F6P 最近距离 ${adpDist.toFixed(1)} Å（数据驱动）`);
// 8W2G 链 A 蛋白原子（四聚体取单亚基）
const protA = w2g.prot.filter((p) => p.chain === "A");
const pk3 = pocketAndHbonds(protA, [...f6p8w, ...adpCat]);
const res3 = pk3.residues.map((r) => ({ ...r, ca: w2g.prot.find((p) => p.chain === r.chain && p.resi === r.resi && p.name === "CA")?.xyz ?? null })).filter((r) => r.ca);
console.log(`8W2G 界面残基 ${res3.length} 个，氢键 ${pk3.hbonds.length} 条`);

// f0：F6P 单分子
const f3f0 = ligandFrame("gk-3-f0", camShared1, f6p8w.map((a) => ({ ...a, xyz: t3(a.xyz) })), {
  cameraLabel: "shared(step1)+扩展画布",
  labelOf: (a) => a.name,
  provenance: [
    "F6P 实例取自 8W2G（人 PFKL，cryo-EM 3.0 Å，链 A resi 801）实验坐标，未改动内部构象",
    "经 T3 Kabsch（16 原子全匹配）对齐至第 2 步链末端位置，与第 1/2 步帧带共享相机与视角",
    `跨物种=配体级对齐（2CXS 鼠 → 8W2G 人），RMSD ${rmsdT3.toFixed(2)} Å`,
  ],
});
// f2：F6P + 催化 ADP + 口袋
const adpExtra = adpCat.map((a) => ({ ...a, xyz: t3(a.xyz) }));
const f3f2 = ligandFrame("gk-3-f2", camShared1, f6p8w.map((a) => ({ ...a, xyz: t3(a.xyz) })), {
  cameraLabel: "shared(step1)+扩展画布",
  residues: res3.map((r) => ({ ...r, ca: t3(r.ca) })),
  hbonds: pk3.hbonds.map(({ p, l, d }) => ({ p: { ...p, xyz: t3(p.xyz) }, l: { ...l, resn: "F6P", xyz: t3(l.xyz) }, d })),
  extraAtoms: adpExtra,
  extraBonds: distBonds(adpCat),
  labelOf: (a, isExtra) => (isExtra ? (a.name.startsWith("P") ? a.name : null) : a.name),
  provenance: [
    "F6P 与催化位点 ADP 同为 8W2G 实测（同一结构，无跨结构问题）；ADP 实例选择=离 F6P 最近者（数据驱动）",
    "四聚体取单亚基口袋（链 A）：活性位点位于亚基内部，帧带尺度下整四聚体不可读；别构 FBP 位点在 f3 单独声明",
    "界面残基与氢键为离线重算（≤4.5 Å / ≤3.6 Å 距离启发式），provenance=computed；cryo-EM 3.0 Å，侧链细节按分辨率看待",
  ],
});
writeFileSync(join(S3, "frame-f0.json"), JSON.stringify(f3f0));
writeFileSync(join(S3, "frame-f2.json"), JSON.stringify(f3f2));
writeFileSync(join(S3, "index.json"), JSON.stringify({
  stepId: "gk-3", stepIndex: 3,
  frames: [
    { frameId: "gk-3-f0", asset: "frame-f0.json", source: "8W2G / Homo sapiens / 3.0 Å cryo-EM" },
    { frameId: "gk-3-f1", asset: null, note: "无 apo（P17858 全部 cryo-EM 带配体）→ 声明帧" },
    { frameId: "gk-3-f2", asset: "frame-f2.json", source: "8W2G / Homo sapiens / 3.0 Å cryo-EM（F6P+催化ADP，四聚体取单亚基）" },
    { frameId: "gk-3-f3", asset: null, note: "FBP 实测于远端别构位点（42.1 Å）非产物位 → 声明帧" },
  ],
  alignment: { T3: `8W2G·F6P → 2CXS·F6P 链末端，RMSD ${rmsdT3.toFixed(2)} Å（16 原子，跨物种配体级）` },
}, null, 2));
console.log("gk-3 完成。");

// ============================================================
// 第 4 步：醛缩酶（4ALD / 1ADO）
// ============================================================
const ald = parsePdb(join(CACHE, "4ALD.pdb"));
const fp2 = ligandAtoms(ald.het, "2FP", "A", 364);
// T4a：2FP 骨架（C3–C6/O6/P6）→ F6P 链末端对应位置（线形 vs 呋喃差异计入 RMSD）
const fp2ByName = new Map(fp2.map((a) => [a.name, a]));
const T4A_MAP = { C3: "C3", C4: "C4", C5: "C5", C6: "C6", O6: "O6", P6: "P" };
const T4a = kabsch([...Object.keys(T4A_MAP)].map((n) => fp2ByName.get(n).xyz), [...Object.keys(T4A_MAP)].map((n) => f6pChainRef[T4A_MAP[n]]));
const t4a = (p) => applyRt(T4a.R, T4a.t, p);
const rmsdT4a = rmsdOf(Object.keys(T4A_MAP).map((n) => [t4a(fp2ByName.get(n).xyz), f6pChainRef[T4A_MAP[n]]]));
console.log(`T4a（4ALD·2FP 骨架 → F6P 链末端）RMSD = ${rmsdT4a.toFixed(2)} Å（6 原子；线形 vs 呋喃差异计入）`);
const protAld = ald.prot.filter((p) => p.chain === "A");
const pk4 = pocketAndHbonds(protAld, fp2);
const res4 = pk4.residues.map((r) => ({ ...r, ca: protAld.find((p) => p.resi === r.resi && p.name === "CA")?.xyz ?? null })).filter((r) => r.ca);

// T4b：1ADO·13P（DHAP）→ 2FP 的 C1–C3 端
const ado = parsePdb(join(CACHE, "1ADO.pdb"));
const dha = ligandAtoms(ado.het, "13P", "A", 1104);
const fp2Final = fp2.map((a) => ({ ...a, xyz: t4a(a.xyz) }));
const fp2FinalByName = new Map(fp2Final.map((a) => [a.name, a]));
const T4B_MAP = ["C1", "C2", "C3", "O1"];
const T4b = kabsch(T4B_MAP.map((n) => dha.find((a) => a.name === n).xyz), T4B_MAP.map((n) => fp2FinalByName.get(n).xyz));
const t4b = (p) => applyRt(T4b.R, T4b.t, p);
const rmsdT4b = rmsdOf(T4B_MAP.map((n) => [t4b(dha.find((a) => a.name === n).xyz), fp2FinalByName.get(n).xyz]));
console.log(`T4b（1ADO·13P → 2FP C1–C3 端）RMSD = ${rmsdT4b.toFixed(2)} Å（4 原子）`);
const protAdo = ado.prot.filter((p) => p.chain === "A");
const pk4b = pocketAndHbonds(protAdo, dha);
const res4b = pk4b.residues.map((r) => ({ ...r, ca: protAdo.find((p) => p.resi === r.resi && p.name === "CA")?.xyz ?? null })).filter((r) => r.ca);
console.log(`4ALD 界面残基 ${res4.length} / 1ADO 界面残基 ${res4b.length}`);

const f4f0 = ligandFrame("gk-4-f0", camShared1, fp2Final, {
  labelOf: (a) => a.name,
  provenance: [
    "2FP（线形 F1,6BP）实例取自 4ALD（人 ALDOA，天然人骨骼肌，2.8 Å，链 A resi 364）实验坐标——RCSB 一手字段核实为 Homo sapiens/P04075，非兔源",
    "经 T4a 骨架对齐（C3–C6/O6/P6 6 原子）至第 2/3 步链末端位置；线形 vs 呋喃型差异计入 RMSD（如实记录）",
    "线形构象为 4ALD 实测，非生产性构象声明见帧 caption",
  ],
});
const f4f2 = ligandFrame("gk-4-f2", camShared1, fp2Final, {
  residues: res4.map((r) => ({ ...r, ca: t4a(r.ca) })),
  hbonds: pk4.hbonds.map(({ p, l, d }) => ({ p: { ...p, xyz: t4a(p.xyz) }, l: { ...l, resn: "2FP", xyz: t4a(l.xyz) }, d })),
  labelOf: (a) => a.name,
  provenance: [
    "4ALD（人 ALDOA，天然人骨骼肌，2.8 Å）实测结合态；界面残基与氢键为离线重算（≤4.5 Å / ≤3.6 Å），provenance=computed",
    "线形非生产性构象如实呈现，不声称切割几何；共价席夫碱中间体无实验结构",
  ],
});
const f4f3 = ligandFrame("gk-4-f3", camShared1, dha.map((a) => ({ ...a, xyz: t4b(a.xyz) })), {
  residues: res4b.map((r) => ({ ...r, ca: t4b(r.ca) })),
  hbonds: pk4b.hbonds.map(({ p, l, d }) => ({ p: { ...p, xyz: t4b(p.xyz) }, l: { ...l, resn: "13P", xyz: t4b(l.xyz) }, d })),
  labelOf: (a) => a.name,
  provenance: [
    "13P（DHAP）实例取自 1ADO（兔 ALDOA，Oryctolagus cuniculus，1.9 Å，链 A resi 1104）实验坐标——与 4ALD 同酶不同物种，跨物种配体级叠合示意",
    "经 T4b 对齐至 2FP 的 C1–C3 端（醛缩酶切断 C3–C4 后的 C1–C3 片段位置），RMSD 见报脚",
  ],
});
// T4c：5KY6（人野生型 apo，1.94 Å）Cα → 4ALD 链A——同物种同酶跨结构并置（三档规则第②档，允许+角标）
const k6 = parsePdb(join(CACHE, "5KY6.pdb"));
const k6c = kabschCa(k6.prot, ald.prot);
const t4c = (p) => applyRt(k6c.T.R, k6c.T.t, p);
console.log(`T4c（5KY6 链${k6c.chainA} Cα → 4ALD 链${k6c.chainB}）RMSD = ${k6c.rmsd.toFixed(2)} Å（${k6c.nPairs} 对；同物种同酶跨结构）`);
// 口袋残基映射：复刻 walkPairs 配对（4ALD resi → 5KY6 同名残基），映射失败者跳过并打印
const caAldChain = parseCa(ald.prot.filter((p) => p.chain === k6c.chainB)).sort((a, b) => a.resi - b.resi);
const caK6Chain = parseCa(k6.prot.filter((p) => p.chain === k6c.chainA)).sort((a, b) => a.resi - b.resi);
const resiMap = new Map(walkPairs(caAldChain, caK6Chain).map(([a, b]) => [a.resi, b]));
const apoRes = [];
for (const r of res4) {
  const m = resiMap.get(r.resi);
  if (!m) { console.warn(`  界面残基 ${r.resn}${r.resi} 在 5KY6 无映射，跳过`); continue; }
  if (m.resn !== r.resn) console.warn(`  映射残基名不一致：4ALD ${r.resn}${r.resi} → 5KY6 ${m.resn}${m.resi}（如实记录）`);
  apoRes.push({ resi: m.resi, resn: m.resn, chain: m.chain, hbond: false, ca: t4c(m.xyz) });
}
console.log(`5KY6 apo 口袋锚点 ${apoRes.length}/${res4.length}`);
// apo 帧：无配体可绘，只有口袋残基锚点；画布范围取口袋 Cα ∪ holo 配体（与 f0/f2 同视框，空位即"配体不在这"）
const apoProj = makeProjector(camShared1, [...apoRes.map((r) => r.ca), ...fp2Final.map((a) => a.xyz)]);
const f4f1 = {
  frameId: "gk-4-f1",
  camera: "shared(step1)+扩展画布",
  view: { w: apoProj.W, h: apoProj.H },
  atoms: [],
  bonds: [],
  residues: apoRes.map((r) => { const [x, y] = apoProj.P(r.ca); return { resi: r.resi, resn: r.resn, chain: r.chain, type: "contact", x, y }; }),
  hbonds: [],
  diffNote:
    "apo（5KY6）与 holo（4ALD）来自两颗不同晶体、非同一次实验；口袋残基锚点为 apo 实测 Cα（经 T4c 叠合到 4ALD 坐标系），apo 无配体可绘。",
  provenance: [
    "5KY6（人 ALDOA，野生型，重组表达于 E. coli，X-ray 1.94 Å）apo 实测；四聚体取与 4ALD Cα 对齐最优链",
    "口袋残基集=4ALD·2FP 界面残基（≤4.5 Å）按序列游走映射到 5KY6 同名残基；锚点为 5KY6 实测 Cα 位置（经 Cα Kabsch）",
    "apo 与 holo 为不同晶体，并置属同物种同酶跨结构示意（三档规则第②档），非同一次实验的构象对",
  ],
};
writeFileSync(join(S4, "frame-f0.json"), JSON.stringify(f4f0));
writeFileSync(join(S4, "frame-f1.json"), JSON.stringify(f4f1));
writeFileSync(join(S4, "frame-f2.json"), JSON.stringify(f4f2));
writeFileSync(join(S4, "frame-f3.json"), JSON.stringify(f4f3));
writeFileSync(join(S4, "index.json"), JSON.stringify({
  stepId: "gk-4", stepIndex: 4,
  frames: [
    { frameId: "gk-4-f0", asset: "frame-f0.json", source: "4ALD / Homo sapiens / 2.8 Å（2FP=线形 F1,6BP；天然人骨骼肌 ALDOA）" },
    { frameId: "gk-4-f1", asset: "frame-f1.json", source: "5KY6 / Homo sapiens / 1.94 Å（野生型 apo，重组表达 E. coli；与 holo=4ALD 同物种跨结构）" },
    { frameId: "gk-4-f2", asset: "frame-f2.json", source: "4ALD / Homo sapiens / 2.8 Å（线形非生产性构象）" },
    { frameId: "gk-4-f3", asset: "frame-f3.json", source: "1ADO / Oryctolagus cuniculus / 1.9 Å（13P=DHAP，兔源；跨物种配体级叠合示意）" },
  ],
  alignment: {
    T4a: `4ALD·2FP 骨架 → F6P 链末端，RMSD ${rmsdT4a.toFixed(2)} Å（6 原子，含线形 vs 呋喃差异）`,
    T4b: `1ADO·13P → 2FP C1–C3 端，RMSD ${rmsdT4b.toFixed(2)} Å（4 原子）`,
    T4c: `5KY6 链${k6c.chainA} Cα → 4ALD 链${k6c.chainB}，RMSD ${k6c.rmsd.toFixed(2)} Å（${k6c.nPairs} 对；同物种同酶跨结构）`,
  },
}, null, 2));
console.log("gk-4 完成。");

// ============================================================
// 第 5 步：TPI（1NEY）
// ============================================================
const ney = parsePdb(join(CACHE, "1NEY.pdb"));
const dhaNey = ligandAtoms(ney.het, "13P", "A", 5001);
const dhaAdoFinal = dha.map((a) => ({ ...a, xyz: t4b(a.xyz) }));
const T5A_MAP = ["C1", "C2", "C3", "O1", "O2", "O3", "P", "O1P", "O2P", "O3P"];
const T5a = kabsch(T5A_MAP.map((n) => dhaNey.find((a) => a.name === n).xyz), T5A_MAP.map((n) => dhaAdoFinal.find((a) => a.name === n).xyz));
const t5a = (p) => applyRt(T5a.R, T5a.t, p);
const rmsdT5a = rmsdOf(T5A_MAP.map((n) => [t5a(dhaNey.find((a) => a.name === n).xyz), dhaAdoFinal.find((a) => a.name === n).xyz]));
console.log(`T5a（1NEY·13P → 1ADO·13P 链末端）RMSD = ${rmsdT5a.toFixed(2)} Å（10 重原子，跨物种=配体级）`);
const protNey = [...ney.prot, ...ney.het.filter((h) => h.resn === "FTR")]; // FTR168 修饰残基计入蛋白侧
const pk5 = pocketAndHbonds(protNey, dhaNey);
const res5 = pk5.residues.map((r) => ({ ...r, ca: protNey.find((p) => p.chain === r.chain && p.resi === r.resi && p.name === "CA")?.xyz ?? null })).filter((r) => r.ca);
console.log(`1NEY 界面残基 ${res5.length}（含 FTR168 与否见残基列表），氢键 ${pk5.hbonds.length} 条`);

const f5f0 = ligandFrame("gk-5-f0", camShared1, dhaNey.map((a) => ({ ...a, xyz: t5a(a.xyz) })), {
  labelOf: (a) => a.name,
  provenance: [
    "13P（DHAP）实例取自 1NEY（酵母 TPI，1.2 Å，链 A resi 5001）实验坐标",
    "经 T5a 全原子对齐（10 重原子）至第 4 步链末端（1ADO·DHAP 位置），跨物种=配体级对齐",
  ],
});
const f5f1 = ligandFrame("gk-5-f1", camShared1, dhaNey.map((a) => ({ ...a, xyz: t5a(a.xyz) })), {
  residues: res5.map((r) => ({ ...r, ca: t5a(r.ca) })),
  hbonds: pk5.hbonds.map(({ p, l, d }) => ({ p: { ...p, xyz: t5a(p.xyz) }, l: { ...l, resn: "13P", xyz: t5a(l.xyz) }, d })),
  labelOf: (a) => a.name,
  provenance: [
    "1NEY（酵母 TPI，1.2 Å）实测结合态；界面残基与氢键为离线重算（≤4.5 Å / ≤3.6 Å），provenance=computed",
    "结构含 3-氟色氨酸修饰残基 FTR168（结晶辅助，非天然），已如实计入界面扫描并在 caption 注明",
  ],
});
writeFileSync(join(S5, "frame-f0.json"), JSON.stringify(f5f0));
writeFileSync(join(S5, "frame-f1.json"), JSON.stringify(f5f1));
writeFileSync(join(S5, "index.json"), JSON.stringify({
  stepId: "gk-5", stepIndex: 5,
  frames: [
    { frameId: "gk-5-f0", asset: "frame-f0.json", source: "1NEY / Saccharomyces cerevisiae / 1.2 Å（13P=DHAP）" },
    { frameId: "gk-5-f1", asset: "frame-f1.json", source: "1NEY / Saccharomyces cerevisiae / 1.2 Å（含 FTR168）" },
    { frameId: "gk-5-f2", asset: "/assets/structures/2d/gap.json", kind: "2d", note: "GAP 无 PDB 组分（G3P=sn-甘油-3-磷酸，9FFC 陷阱）→ 2D 结构式帧" },
  ],
  alignment: { T5a: `1NEY·13P → 1ADO·13P 链末端，RMSD ${rmsdT5a.toFixed(2)} Å（10 重原子，跨物种配体级）` },
}, null, 2));
console.log("gk-5 完成。");

// ============================================================
// 第 6 步：GAPDH（1U8F + 8G15）——相机重建（链断开，帧带已声明）
// ============================================================
const u8f = parsePdb(join(CACHE, "1U8F.pdb"));
const nad = ligandAtoms(u8f.het, "NAD", "P", 336);
if (nad.length < 40) { console.error("1U8F NAD 原子数异常：", nad.length); process.exit(1); }
const pk6 = pocketAndHbonds(u8f.prot, nad);
const res6 = pk6.residues.map((r) => ({ ...r, ca: u8f.prot.find((p) => p.chain === r.chain && p.resi === r.resi && p.name === "CA")?.xyz ?? null })).filter((r) => r.ca);
const nadC = nad.map((a) => a.xyz);
const nadCentroid = [0, 1, 2].map((d) => nadC.reduce((s, p) => s + p[d], 0) / nadC.length);
const camStep6 = makeCamera(nadCentroid, [...res6.map((r) => r.ca), ...nadC], VW, VH, 64);
console.log(`第 6 步相机重建（1U8F NAD 为中心）；1U8F 界面残基 ${res6.length}，氢键 ${pk6.hbonds.length} 条`);

// 8G15 apo → Cα Kabsch 并入第 6 步相机
const g15 = parsePdb(join(CACHE, "8G15.pdb"));
const ka6 = kabschCa(g15.prot, u8f.prot);
const t6apo = (p) => applyRt(ka6.T.R, ka6.T.t, p);
console.log(`6A（8G15 → 1U8F Cα Kabsch，链 ${ka6.chainA}→${ka6.chainB}）RMSD = ${ka6.rmsd.toFixed(2)} Å（${ka6.nPairs} 对）`);
// apo 口袋残基：8G15 蛋白变换到 1U8F 坐标系后，与 NAD（1U8F 帧原位）比邻 ≤4.5 Å
const g15ProtT = g15.prot.map((p) => ({ ...p, xyz: t6apo(p.xyz) }));
const pk6apo = pocketAndHbonds(g15ProtT, nad);
const res6apo = pk6apo.residues
  .map((r) => ({ ...r, ca: g15ProtT.find((p) => p.chain === r.chain && p.resi === r.resi && p.name === "CA")?.xyz ?? null }))
  .filter((r) => r.ca);
console.log(`8G15 apo 界面残基 ${res6apo.length}（选取基准=1U8F NAD 位点 ≤4.5 Å）`);

const f6f1 = ligandFrame("gk-6-f1", camStep6, [], {
  cameraLabel: "fresh(step6)",
  residues: res6apo.map((r) => ({ ...r, ca: r.ca })),
  provenance: [
    "8G15（人 GAPDH，2.07 Å，X-ray）实验坐标，apo 无配体",
    `经 Cα Kabsch 对齐至 1U8F（链 ${ka6.chainA}→${ka6.chainB}，${ka6.nPairs} 对），RMSD ${ka6.rmsd.toFixed(2)} Å`,
    "口袋残基选取基准=对齐后 1U8F NAD 位点 ≤4.5 Å（跨结构示意）",
  ],
});
const f6f2 = ligandFrame("gk-6-f2", camStep6, nad, {
  cameraLabel: "fresh(step6)",
  residues: res6.map((r) => ({ ...r, ca: r.ca })),
  hbonds: pk6.hbonds.map(({ p, l, d }) => ({ p, l: { ...l, resn: "NAD" }, d })),
  labelOf: (a) => (a.name.startsWith("P") || a.name === "O1N" || a.name === "C4N" ? a.name : null),
  provenance: [
    "NAD 实例取自 1U8F（人 GAPDH，1.75 Å，链 P resi 336）实验坐标",
    "底物 GAP 与产物 1,3-BPG 在 PDB 配体字典中均不存在——本帧明确不声称底物在口袋",
    "界面残基与氢键为离线重算（≤4.5 Å / ≤3.6 Å），provenance=computed",
  ],
});
writeFileSync(join(S6, "frame-f1.json"), JSON.stringify(f6f1));
writeFileSync(join(S6, "frame-f2.json"), JSON.stringify(f6f2));
writeFileSync(join(S6, "index.json"), JSON.stringify({
  stepId: "gk-6", stepIndex: 6,
  frames: [
    { frameId: "gk-6-f0", asset: "/assets/structures/2d/gap.json", kind: "2d", note: "GAP 无 PDB 组分 → 2D 结构式帧" },
    { frameId: "gk-6-f1", asset: "frame-f1.json", source: "8G15 / Homo sapiens / 2.07 Å（apo，Cα 对齐并入）" },
    { frameId: "gk-6-f2", asset: "frame-f2.json", source: "1U8F / Homo sapiens / 1.75 Å（酶+NAD，无底物复合物）" },
    { frameId: "gk-6-f3", asset: "/assets/structures/2d/bpg13.json", kind: "2d", note: "1,3-BPG 无 PDB 组分 → 2D 结构式帧" },
  ],
  alignment: {
    camera: "第 6 步相机重建（GAP 无 3D 坐标，跨步链断开，帧带 boundaryNote 已声明）",
    A6: `8G15 → 1U8F Cα Kabsch，RMSD ${ka6.rmsd.toFixed(2)} Å（${ka6.nPairs} 对，链 ${ka6.chainA}→${ka6.chainB}）`,
  },
}, null, 2));
console.log("gk-6 完成。");

// ============================================================
// 第 7 步：PGK1（9FDN + 2WZB + 8YHP）——相机重建
// ============================================================
const fdn = parsePdb(join(CACHE, "9FDN.pdb"));
const pg3fdn = ligandAtoms(fdn.het, "3PG", "A", 503);
const atp = ligandAtoms(fdn.het, "ATP", "A", 502);
const pk7 = pocketAndHbonds(fdn.prot, [...pg3fdn, ...atp]);
const res7 = pk7.residues.map((r) => ({ ...r, ca: fdn.prot.find((p) => p.chain === r.chain && p.resi === r.resi && p.name === "CA")?.xyz ?? null })).filter((r) => r.ca);
const pg3c = pg3fdn.map((a) => a.xyz), atpc = atp.map((a) => a.xyz);
const mid7 = [0, 1, 2].map((d) => (pg3c.reduce((s, p) => s + p[d], 0) / pg3c.length + atpc.reduce((s, p) => s + p[d], 0) / atpc.length) / 2);
const camStep7 = makeCamera(mid7, [...res7.map((r) => r.ca), ...pg3c, ...atpc], VW, VH, 64);
console.log(`第 7 步相机重建（9FDN 3PG+ATP 为中心）；界面残基 ${res7.length}，氢键 ${pk7.hbonds.length} 条`);

const f7f3 = ligandFrame("gk-7-f3", camStep7, [...pg3fdn, ...atp], {
  cameraLabel: "fresh(step7)",
  residues: res7.map((r) => ({ ...r, ca: r.ca })),
  hbonds: pk7.hbonds.map(({ p, l, d }) => ({ p, l, d })),
  labelOf: (a) => (a.el === "P" ? a.name : (pg3fdn.includes(a) ? a.name : null)),
  provenance: [
    "3PG（A503）与 ATP（A502）同为 9FDN（人 PGK1，1.58 Å）实测——同结构双配体，无跨结构问题",
    "糖酵解方向读法：本帧=产物对（1,3-BPG+ADP → 3PG+ATP 的右侧）",
    "界面残基与氢键为离线重算（≤4.5 Å / ≤3.6 Å），provenance=computed",
  ],
});

// 2WZB：3PG Kabsch → 9FDN·3PG；ADP/MGF 随刚体变换并入
const wzb = parsePdb(join(CACHE, "2WZB.pdb"));
const pg3wzb = ligandAtoms(wzb.het, "3PG", "A", 1420);
const adpWzb = ligandAtoms(wzb.het, "ADP", "A", 1419);
const mgf = ligandAtoms(wzb.het, "MGF", "A", 1421);
const T7a = kabsch(pg3wzb.map((a) => a.xyz), pg3fdn.map((a) => a.xyz));
const t7a = (p) => applyRt(T7a.R, T7a.t, p);
const rmsdT7a = rmsdOf(pg3wzb.map((a, i) => [t7a(a.xyz), pg3fdn[i].xyz]));
console.log(`T7a（2WZB·3PG → 9FDN·3PG）RMSD = ${rmsdT7a.toFixed(2)} Å（11 重原子，同人跨结构）`);
const pk7wzb = pocketAndHbonds(wzb.prot, [...pg3wzb, ...adpWzb, ...mgf]);
const res7wzb = pk7wzb.residues.map((r) => ({ ...r, ca: wzb.prot.find((p) => p.chain === r.chain && p.resi === r.resi && p.name === "CA")?.xyz ?? null })).filter((r) => r.ca);
const MGF_SET = new Set(["F1", "F2", "F3", "MG"]);
const f7f2 = ligandFrame("gk-7-f2", camStep7, pg3wzb.map((a) => ({ ...a, xyz: t7a(a.xyz) })), {
  cameraLabel: "fresh(step7)",
  residues: res7wzb.map((r) => ({ ...r, ca: t7a(r.ca) })),
  hbonds: pk7wzb.hbonds.map(({ p, l, d }) => ({ p: { ...p, xyz: t7a(p.xyz) }, l: { ...l, xyz: t7a(l.xyz) }, d })),
  extraAtoms: [...adpWzb, ...mgf].map((a) => ({ ...a, xyz: t7a(a.xyz) })),
  emphOf: (a) => (MGF_SET.has(a.name) ? "diff" : "base"),
  labelOf: (a, isExtra) => (a.el === "P" || MGF_SET.has(a.name) || (!isExtra && a.name === "C1") ? a.name : null),
  provenance: [
    "2WZB（人 PGK1，1.47 Å）实测 ADP+3PG+MgF₃——过渡态模拟：MgF₃⁻ 模拟正在转移的磷酰基（砖红），3PG 占位 1,3-BPG 位点",
    `经 T7a（3PG 全原子 Kabsch）对齐至 9FDN 口袋位置，RMSD ${rmsdT7a.toFixed(2)} Å；同人跨结构示意`,
    "过渡态类似物 · 非真实中间体——必须显著标注，不作产物态声称",
  ],
  diffNote: "过渡态模拟（MgF₃⁻，砖红）：磷酰基正在 ADP 与 3PG 之间转移——这是实验替身，不是真实中间体",
});

// 8YHP apo → Cα Kabsch 并入第 7 步相机
const yhp = parsePdb(join(CACHE, "8YHP.pdb"));
const ka7 = kabschCa(yhp.prot, fdn.prot);
const t7apo = (p) => applyRt(ka7.T.R, ka7.T.t, p);
console.log(`7A（8YHP → 9FDN Cα Kabsch，链 ${ka7.chainA}→${ka7.chainB}）RMSD = ${ka7.rmsd.toFixed(2)} Å（${ka7.nPairs} 对）`);
// apo 口袋残基：8YHP 蛋白变换到 9FDN 坐标系后，与 3PG/ATP（9FDN 帧原位）比邻 ≤4.5 Å
// 注：7A RMSD 4.95 Å 为 PGK 开合铰链的真实构象差（apo 开态 vs holo 闭态），跨结构示意已声明
const yhpProtT = yhp.prot.map((p) => ({ ...p, xyz: t7apo(p.xyz) }));
const pk7apo = pocketAndHbonds(yhpProtT, [...pg3fdn, ...atp]);
const res7apo = pk7apo.residues
  .map((r) => ({ ...r, ca: yhpProtT.find((p) => p.chain === r.chain && p.resi === r.resi && p.name === "CA")?.xyz ?? null }))
  .filter((r) => r.ca);
console.log(`8YHP apo 界面残基 ${res7apo.length}（选取基准=9FDN 3PG/ATP 位点 ≤4.5 Å）`);
const f7f0 = ligandFrame("gk-7-f0", camStep7, [], {
  cameraLabel: "fresh(step7)",
  residues: res7apo.map((r) => ({ ...r, ca: r.ca })),
  provenance: [
    "8YHP（人 PGK1，1.95 Å，仅 EDO 结晶辅质）实验坐标，apo 无配体",
    `经 Cα Kabsch 对齐至 9FDN（链 ${ka7.chainA}→${ka7.chainB}，${ka7.nPairs} 对），RMSD ${ka7.rmsd.toFixed(2)} Å`,
    "口袋残基选取基准=对齐后 9FDN 3PG/ATP 位点 ≤4.5 Å（跨结构示意）",
  ],
});
writeFileSync(join(S7, "frame-f0.json"), JSON.stringify(f7f0));
writeFileSync(join(S7, "frame-f2.json"), JSON.stringify(f7f2));
writeFileSync(join(S7, "frame-f3.json"), JSON.stringify(f7f3));
writeFileSync(join(S7, "index.json"), JSON.stringify({
  stepId: "gk-7", stepIndex: 7,
  frames: [
    { frameId: "gk-7-f0", asset: "frame-f0.json", source: "8YHP / Homo sapiens / 1.95 Å（apo，Cα 对齐并入）" },
    { frameId: "gk-7-f1", asset: "/assets/structures/2d/bpg13.json", kind: "2d", note: "1,3-BPG 无 PDB 组分 → 2D 结构式帧" },
    { frameId: "gk-7-f2", asset: "frame-f2.json", source: "2WZB / Homo sapiens / 1.47 Å（ADP+3PG+MGF 过渡态模拟）" },
    { frameId: "gk-7-f3", asset: "frame-f3.json", source: "9FDN / Homo sapiens / 1.58 Å（3PG+ATP 同结构双配体）" },
  ],
  alignment: {
    camera: "第 7 步相机重建（与 GAPDH 无公共 3D 配体，跨步链断开，帧带 boundaryNote 已声明）",
    T7a: `2WZB·3PG → 9FDN·3PG，RMSD ${rmsdT7a.toFixed(2)} Å（11 重原子）`,
    A7: `8YHP → 9FDN Cα Kabsch，RMSD ${ka7.rmsd.toFixed(2)} Å（${ka7.nPairs} 对）`,
  },
}, null, 2));
console.log("gk-7 完成。");

// ============================================================
// 第 8 步：PGAM（1QHF + 1EQJ）
// ============================================================
const qhf = parsePdb(join(CACHE, "1QHF.pdb"));
const pg3qhf = ligandAtoms(qhf.het, "3PG", "A", 252);
const pg3fdnFinal = pg3fdn; // 9FDN 3PG 已在 camStep7 坐标系
const T8 = kabsch(pg3qhf.map((a) => a.xyz), pg3fdnFinal.map((a) => a.xyz));
const t8 = (p) => applyRt(T8.R, T8.t, p);
const rmsdT8 = rmsdOf(pg3qhf.map((a, i) => [t8(a.xyz), pg3fdnFinal[i].xyz]));
console.log(`T8（1QHF·3PG → 9FDN·3PG 第 7 步相机位置）RMSD = ${rmsdT8.toFixed(2)} Å（11 重原子，跨物种=配体级）`);
const protQhf = qhf.prot.filter((p) => p.chain === "A");
const pk8 = pocketAndHbonds(protQhf, pg3qhf);
const res8 = pk8.residues.map((r) => ({ ...r, ca: protQhf.find((p) => p.resi === r.resi && p.name === "CA")?.xyz ?? null })).filter((r) => r.ca);
console.log(`1QHF 界面残基 ${res8.length}，氢键 ${pk8.hbonds.length} 条`);

const f8f0 = ligandFrame("gk-8-f0", camStep7, pg3qhf.map((a) => ({ ...a, xyz: t8(a.xyz) })), {
  labelOf: (a) => a.name,
  provenance: [
    "3PG 实例取自 1QHF（酵母 dPGM，1.7 Å，链 A resi 252）实验坐标",
    `经 T8 全原子 Kabsch 对齐至第 7 步相机位置（9FDN·3PG），RMSD ${rmsdT8.toFixed(2)} Å；跨物种=配体级对齐`,
  ],
});
const f8f2 = ligandFrame("gk-8-f2", camStep7, pg3qhf.map((a) => ({ ...a, xyz: t8(a.xyz) })), {
  residues: res8.map((r) => ({ ...r, ca: t8(r.ca) })),
  hbonds: pk8.hbonds.map(({ p, l, d }) => ({ p: { ...p, xyz: t8(p.xyz) }, l: { ...l, resn: "3PG", xyz: t8(l.xyz) }, d })),
  labelOf: (a) => a.name,
  provenance: [
    "1QHF（酵母 dPGM，1.7 Å）实测结合态；界面残基与氢键为离线重算（≤4.5 Å / ≤3.6 Å），provenance=computed",
    "磷酰基此刻在 C3–O3（迁移前状态）；催化组氨酸以界面残基呈现",
  ],
});

// 1EQJ：2PG 分子级（跨物种兜底，口袋不并置）；对齐基准=羧基端 5 原子
const eqj = parsePdb(join(CACHE, "1EQJ.pdb"));
const pg2 = ligandAtoms(eqj.het, "2PG", "A", 801);
const pg3qhfFinal = pg3qhf.map((a) => ({ ...a, xyz: t8(a.xyz) }));
const pg3qhfByName = new Map(pg3qhfFinal.map((a) => [a.name, a]));
const T8B_MAP = ["C1", "C2", "C3", "O1", "O2"];
const T8b = kabsch(T8B_MAP.map((n) => pg2.find((a) => a.name === n).xyz), T8B_MAP.map((n) => pg3qhfByName.get(n).xyz));
const t8b = (p) => applyRt(T8b.R, T8b.t, p);
const rmsdT8b = rmsdOf(T8B_MAP.map((n) => [t8b(pg2.find((a) => a.name === n).xyz), pg3qhfByName.get(n).xyz]));
console.log(`T8b（1EQJ·2PG → 3PG 羧基端）RMSD = ${rmsdT8b.toFixed(2)} Å（5 原子；磷酰基位置差异不入对齐基准）`);
const f8f3 = ligandFrame("gk-8-f3", camStep7, pg2.map((a) => ({ ...a, xyz: t8b(a.xyz) })), {
  labelOf: (a) => a.name,
  provenance: [
    "2PG 实例取自 1EQJ（细菌 PGAM，1.7 Å，2PG+Mn，链 A resi 801）实验坐标——人 PGAM1 无产物结构，跨物种兜底",
    "分子级呈现：口袋不并置（跨物种被三档规则禁止）；Mn²⁺ 不入画（金属非分子本体）",
    `经 T8b 对齐至 3PG 羧基端（C1/C2/C3/O1/O2，5 原子），RMSD ${rmsdT8b.toFixed(2)} Å；磷酰基 C3→C2 位置差异如实呈现`,
  ],
});
writeFileSync(join(S8, "frame-f0.json"), JSON.stringify(f8f0));
writeFileSync(join(S8, "frame-f2.json"), JSON.stringify(f8f2));
writeFileSync(join(S8, "frame-f3.json"), JSON.stringify(f8f3));
writeFileSync(join(S8, "index.json"), JSON.stringify({
  stepId: "gk-8", stepIndex: 8,
  frames: [
    { frameId: "gk-8-f0", asset: "frame-f0.json", source: "1QHF / Saccharomyces cerevisiae / 1.7 Å（3PG）" },
    { frameId: "gk-8-f1", asset: null, note: "半 apo 4GPZ（NEP 修饰）+ 跨物种 → 声明帧" },
    { frameId: "gk-8-f2", asset: "frame-f2.json", source: "1QHF / Saccharomyces cerevisiae / 1.7 Å（结合态）" },
    { frameId: "gk-8-f3", asset: "frame-f3.json", source: "1EQJ / 细菌兜底 / 1.7 Å（2PG，分子级）" },
  ],
  alignment: {
    T8: `1QHF·3PG → 9FDN·3PG 第 7 步相机位置，RMSD ${rmsdT8.toFixed(2)} Å（11 重原子，跨物种配体级）`,
    T8b: `1EQJ·2PG → 3PG 羧基端，RMSD ${rmsdT8b.toFixed(2)} Å（5 原子）`,
  },
}, null, 2));
console.log("gk-8 完成。全部第 3–8 步帧资产生成完毕。");
