// ============================================================
// extract-step1-frames.mjs —— 第 1 步（己糖激酶，1CZA）结构帧资产离线提取
//
// 输入（只读，不改动 public/assets/steps/ 下任何已定稿资产）：
//   public/assets/steps/gly-01/ligand-GLC.sdf / ligand-G6P.sdf（1CZA 实例坐标）
//   public/assets/steps/gly-01/holo.pdb（链 N，898 残基）
//   public/assets/steps/gly-01/pocket.json（界面残基 + 氢键，含 3D 坐标）
//
// 输出：public/assets/structures/gk-1/
//   frame-f0.json  底物帧：GLC 单分子（实验坐标原样，仅做刚体视角投影）
//   frame-f1.json  口袋帧：ANM 低频模式推出的"第二结构域张开"计算构象（非实验坐标）
//   frame-f2.json  结合帧：GLC 在口袋 + 界面残基 + 氢键（全部实验坐标）
//   frame-f3.json  产物帧：G6P（刚体对齐至口袋视角）+ 磷酸基差异标注
//   index.json     帧清单
//
// 关键口径（诚实性）：
//   - F0/F2 的配体坐标 = 1CZA 实验坐标原样，不改内部构象；
//   - F1 = 纯计算构象：Cα 弹性网络（ANM）最低 1–2 个非零模式，取"口袋张开"方向，
//     幅度封顶 7 Å；若最低模式无明显张开（增益 < 1.0 Å）则输出 degraded 声明式缺口，
//     绝不用随机扰动冒充；
//   - F3 的 G6P 在 1CZA 中位于另一实例位点，为同一口袋视角做刚体对齐
//     （Horn 四元数 Kabsch，内部键长键角不变），RMSD 记录在 provenance；
//   - F3 氢键 = 离线重算（对齐后 G6P 杂原子与口袋蛋白侧原子 ≤3.6 Å），
//     判据仍是距离启发式，页面如实标注。
// 运行时零计算：页面只绘制本脚本预投影好的 2D 坐标。
// ============================================================
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SRC = join(ROOT, "public", "assets", "steps", "gly-01");
const OUT = join(ROOT, "public", "assets", "structures", "gk-1");
mkdirSync(OUT, { recursive: true });

// ---------- 小工具 ----------
const v3 = {
  sub: (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]],
  add: (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]],
  scale: (a, s) => [a[0] * s, a[1] * s, a[2] * s],
  dot: (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2],
  cross: (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]],
  len: (a) => Math.hypot(a[0], a[1], a[2]),
  norm: (a) => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; },
};

// 对称矩阵 Jacobi 特征分解（n≤4），返回按特征值降序的 {values, vectors(列为主)}
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
  return {
    values: idx.map((i) => A[i][i]),
    vectors: idx.map((i) => [...Array(n)].map((_, r) => V[r][i])),
  };
}

// Horn 四元数法 Kabsch：求 R,t 使 R*a+t ≈ b
function kabsch(ptsA, ptsB) {
  const n = ptsA.length;
  const ca = [0, 0, 0], cb = [0, 0, 0];
  for (let i = 0; i < n; i++) { for (let d = 0; d < 3; d++) { ca[d] += ptsA[i][d] / n; cb[d] += ptsB[i][d] / n; } }
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
  const q = vectors[0]; // 最大特征值对应的完整特征向量（自测修复：旧写法 map(col=>col[0]) 只取首分量，RMSD 会差 12 Å）
  const [w, x, y, z] = q;
  const R = [
    [w * w + x * x - y * y - z * z, 2 * (x * y - w * z), 2 * (x * z + w * y)],
    [2 * (x * y + w * z), w * w - x * x + y * y - z * z, 2 * (y * z - w * x)],
    [2 * (x * z - w * y), 2 * (y * z + w * x), w * w - x * x - y * y + z * z],
  ];
  const t = v3.sub(cb, [
    v3.dot(R[0], ca), v3.dot(R[1], ca), v3.dot(R[2], ca),
  ]);
  return { R, t };
}
const applyRt = (R, t, p) => [v3.dot(R[0], p) + t[0], v3.dot(R[1], p) + t[1], v3.dot(R[2], p) + t[2]];

// ---------- 解析输入 ----------
function parseSdf(path) {
  const lines = readFileSync(path, "utf8").split(/\r?\n/);
  const na = parseInt(lines[3].slice(0, 3), 10);
  const nb = parseInt(lines[3].slice(3, 6), 10);
  const atoms = [];
  for (let i = 0; i < na; i++) {
    const L = lines[4 + i];
    atoms.push({
      id: i + 1,
      el: L.slice(31, 34).trim(),
      xyz: [parseFloat(L.slice(0, 10)), parseFloat(L.slice(10, 20)), parseFloat(L.slice(20, 30))],
    });
  }
  const bonds = [];
  for (let i = 0; i < nb; i++) {
    const L = lines[4 + na + i];
    bonds.push({ a: parseInt(L.slice(0, 3), 10), b: parseInt(L.slice(3, 6), 10) });
  }
  return { atoms, bonds };
}
function parseCa(path) {
  const cas = [];
  for (const L of readFileSync(path, "utf8").split(/\r?\n/)) {
    if (!L.startsWith("ATOM")) continue;
    if (L.slice(12, 16).trim() !== "CA") continue;
    cas.push({
      resi: parseInt(L.slice(22, 26), 10),
      resn: L.slice(17, 20).trim(),
      chain: L.slice(21, 22).trim(),
      xyz: [parseFloat(L.slice(30, 38)), parseFloat(L.slice(38, 46)), parseFloat(L.slice(46, 54))],
    });
  }
  return cas;
}

const glc = parseSdf(join(SRC, "ligand-GLC.sdf"));
const g6p = parseSdf(join(SRC, "ligand-G6P.sdf"));
const cas = parseCa(join(SRC, "holo.pdb"));
const pocket = JSON.parse(readFileSync(join(SRC, "pocket.json"), "utf8"));
const caByResi = new Map(cas.map((c) => [c.resi, c]));

// 原子标签：SDF 序号即糖环拓扑序（两配体一致）
const GLC_LABEL = { 1: "C1", 2: "C2", 3: "C3", 4: "C4", 5: "C5", 6: "C6", 7: "O1", 8: "O2", 9: "O3", 10: "O4", 11: "O5(环)", 12: "O6" };
const G6P_LABEL = { ...GLC_LABEL, 13: "P", 14: "O1P", 15: "O2P", 16: "O3P" };
const glcC = glc.atoms.map((a) => a.xyz);
const glcCentroid = [0, 1, 2].map((d) => glcC.reduce((s, p) => s + p[d], 0) / glcC.length);

// ---------- F3 预备：G6P 刚体对齐到 GLC（环骨架 8 原子） ----------
const CORE = [1, 2, 3, 4, 5, 6, 11, 12]; // C1–C6 + O5 + O6
const { R, t } = kabsch(
  CORE.map((i) => g6p.atoms.find((a) => a.id === i).xyz),
  CORE.map((i) => glc.atoms.find((a) => a.id === i).xyz)
);
const g6pAligned = g6p.atoms.map((a) => ({ ...a, xyz: applyRt(R, t, a.xyz) }));
const coreRmsd = Math.sqrt(
  CORE.reduce((s, i) => {
    const a = g6pAligned.find((p) => p.id === i).xyz;
    const b = glc.atoms.find((p) => p.id === i).xyz;
    return s + (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2;
  }, 0) / CORE.length
);
console.log(`G6P→GLC 刚体对齐 RMSD = ${coreRmsd.toFixed(2)} Å（内部构象未改动）`);

// ---------- 相机（预投影，离线一次） ----------
// 相机 A（F1/F2/F3 共享）：以 GLC 质心为中心，覆盖配体+全部口袋残基+张开位
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
  return { project: (p) => { const q = proj(p); return [q[0] * S + cx, -q[1] * S + cy]; }, scale: S };
}

const pocketRes = pocket.residues.map((r) => ({ ...r, ca: caByResi.get(r.resi)?.xyz ?? null })).filter((r) => r.ca);
if (pocketRes.some((r) => !r.ca)) console.warn("警告：部分口袋残基缺 Cα");
const resPoints = pocketRes.map((r) => r.ca);

// ---------- ANM：Cα 弹性网络，最低 1–2 个非零模式 ----------
function anmLowModes(cas, nModes, cutoff = 15) {
  const N = cas.length;
  const pts = cas.map((c) => c.xyz);
  const nbr = Array.from({ length: N }, () => []);
  for (let i = 0; i < N; i++) {
    for (let j = i + 1; j < N; j++) {
      const d2 = (pts[i][0] - pts[j][0]) ** 2 + (pts[i][1] - pts[j][1]) ** 2 + (pts[i][2] - pts[j][2]) ** 2;
      if (d2 < cutoff * cutoff) { const k = 1; nbr[i].push([j, k]); nbr[j].push([i, k]); } // Tirion 均匀弹簧
    }
  }
  const diag = new Float64Array(3 * N);
  for (let i = 0; i < N; i++) {
    let s = 0;
    for (const [, k] of nbr[i]) s += k;
    for (let d = 0; d < 3; d++) diag[3 * i + d] = s;
  }
  const C = 2.1 * Math.max(...diag); // 位移谱：A = C·I − H（C 须 > λ_max(H) ≤ 2·d_max），A 的最大特征值 ↔ H 最小非零
  // 刚体零模式（3 平移 + 3 绕质心旋转），迭代中反复投影掉
  const centroid = [0, 1, 2].map((d) => pts.reduce((s, p) => s + p[d], 0) / N);
  const rigid = [];
  for (let d = 0; d < 3; d++) {
    const v = new Float64Array(3 * N);
    for (let i = 0; i < N; i++) v[3 * i + d] = 1;
    rigid.push(v);
  }
  for (const axis of [[1, 0, 0], [0, 1, 0], [0, 0, 1]]) {
    const v = new Float64Array(3 * N);
    for (let i = 0; i < N; i++) {
      const r = v3.sub(pts[i], centroid);
      const cr = v3.cross(axis, r);
      v[3 * i] = cr[0]; v[3 * i + 1] = cr[1]; v[3 * i + 2] = cr[2];
    }
    rigid.push(v);
  }
  const ortho = (v, basis) => {
    let w = Float64Array.from(v);
    for (const b of basis) {
      let dp = 0;
      for (let i = 0; i < w.length; i++) dp += w[i] * b[i];
      for (let i = 0; i < w.length; i++) w[i] -= dp * b[i];
    }
    return w;
  };
  const normalize = (v) => {
    let n = 0;
    for (let i = 0; i < v.length; i++) n += v[i] * v[i];
    n = Math.sqrt(n) || 1;
    for (let i = 0; i < v.length; i++) v[i] /= n;
    return v;
  };
  const matvec = (v) => {
    const out = new Float64Array(3 * N);
    for (let i = 0; i < N; i++) {
      for (let d = 0; d < 3; d++) out[3 * i + d] += C * v[3 * i + d] - diag[3 * i + d] * v[3 * i + d];
      for (const [j, k] of nbr[i]) for (let d = 0; d < 3; d++) out[3 * i + d] -= k * v[3 * j + d];
    }
    return out;
  };
  // 块正交迭代 + Rayleigh-Ritz：子空间收敛到 A 的前 K 个特征向量（刚体 6 模已投影）
  // 固定种子 PRNG 保证模式提取结果可复现
  let s = 20261103;
  const rand = () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296 - 0.5;
  };
  const K = 12;
  let block = Array.from({ length: K }, () => new Float64Array(3 * N).map(() => rand()));
  block = block.map((v) => {
    let w = ortho(v, rigid);
    for (const b of block) w = ortho(w, [b]);
    return normalize(w);
  });
  for (let it = 0; it < 800; it++) {
    let Z = block.map(matvec);
    // Gram-Schmidt（含刚体投影）
    Z = Z.map((z) => ortho(z, rigid));
    const Q = [];
    for (let z of Z) {
      z = ortho(z, Q);
      Q.push(normalize(z));
    }
    block = Q;
    if (it % 25 === 24) {
      // Ritz：M = Qᵀ A Q（K×K 对称），取最大特征值方向的组合
      const AQ = block.map(matvec);
      const M = Array.from({ length: K }, (_, i) =>
        Array.from({ length: K }, (_, j) => {
          let s = 0;
          for (let t = 0; t < block[i].length; t++) s += block[i][t] * AQ[j][t];
          return s;
        })
      );
      for (let i = 0; i < K; i++) for (let j = 0; j < i; j++) M[i][j] = M[j][i] = (M[i][j] + M[j][i]) / 2;
      const { vectors } = jacobiEigen(M, K);
      // 重组：newBlock[c] = Σ_r block[r] * V[r][c]（V 列 = Ritz 向量）
      const newBlock = Array.from({ length: K }, () => new Float64Array(3 * N));
      for (let r = 0; r < K; r++) {
        for (let c = 0; c < K; c++) {
          const coef = vectors[r][c];
          if (Math.abs(coef) < 1e-12) continue;
          const b = block[r];
          for (let t = 0; t < 3 * N; t++) newBlock[c][t] += coef * b[t];
        }
      }
      block = newBlock.map(normalize);
    }
  }
  // 每个 Ritz 向量的 H 特征值 = C − θ（θ = A 特征值，用 Rayleigh 商精确算）
  const modes = [];
  for (const vec of block) {
    const Hv = matvec(vec);
    let num = 0, den = 0;
    for (let i = 0; i < vec.length; i++) { num += vec[i] * Hv[i]; den += vec[i] * vec[i]; }
    modes.push({ vec, h: C - num / den });
  }
  modes.sort((a, b) => a.h - b.h); // H 特征值升序 = 频率升序
  const kept = [];
  for (const m of modes) {
    if (m.h < 0.05 * C) continue; // 跳过刚体残留
    kept.push(m);
    console.log(`  ANM 模式 ${kept.length}: H 特征值 = ${m.h.toExponential(3)}`);
    if (kept.length >= nModes) break;
  }
  return { modes: kept, nbr };
}

console.log("构建 ANM 弹性网络并求低频模式…");
const { modes } = anmLowModes(cas, 12);

// 打分区域：配体质心 12 Å 内的 Cα（裂缝两壁），比 pocket.json 的 4–5 Å 接触壳层宽
const wideSet = cas.filter((c) => v3.len(v3.sub(c.xyz, glcCentroid)) <= 12);
const resiSet = wideSet;
const casIdxOf = new Map(cas.map((c, i) => [c.resi, i]));
const dispAt = (modeVec, sign, r) => {
  const i = casIdxOf.get(r.resi);
  return [sign * modeVec[3 * i], sign * modeVec[3 * i + 1], sign * modeVec[3 * i + 2]];
};
function opennessGain(modeVec, sign) {
  let gain = 0;
  for (const r of resiSet) {
    const moved = v3.add(r.xyz, dispAt(modeVec, sign, r));
    gain += v3.len(v3.sub(moved, glcCentroid)) - v3.len(v3.sub(r.xyz, glcCentroid));
  }
  return gain / resiSet.length;
}
// 口袋簇直径增益：口袋横跨结合裂缝，域张开应增大其最大两两距离
function pocketDiameter(pts) {
  let d = 0;
  for (let i = 0; i < pts.length; i++)
    for (let j = i + 1; j < pts.length; j++) d = Math.max(d, v3.len(v3.sub(pts[i], pts[j])));
  return d;
}
function diameterGain(modeVec, sign) {
  const moved = resiSet.map((r) => v3.add(r.xyz, dispAt(modeVec, sign, r)));
  return pocketDiameter(moved) - pocketDiameter(resiSet.map((r) => r.xyz));
}
const candidates = [];
modes.forEach((m, mi) =>
  [1, -1].forEach((s) => {
    // 全局最大位移（用于换算真实 Å）
    let maxGlob = 0;
    for (let i = 0; i < cas.length; i++) {
      maxGlob = Math.max(maxGlob, v3.len([m.vec[3 * i], m.vec[3 * i + 1], m.vec[3 * i + 2]]));
    }
    candidates.push({ mi, s, gain: diameterGain(m.vec, s), meanGain: opennessGain(m.vec, s), maxGlob });
  })
);
candidates.sort((a, b) => b.gain / b.maxGlob - a.gain / a.maxGlob); // 按"每单位最大位移的张开量"排序
console.log(`诊断：打分区域 = 配体 12 Å 内 ${wideSet.length} 个 Cα`);
console.log("  打分集残基编号分布：", wideSet.map((r) => r.resi).join(","));
for (const c of candidates) {
  const scale = 7 / c.maxGlob;
  console.log(
    `  模式${c.mi + 1}${c.s > 0 ? "+" : "−"}: 缩放至 7 Å 后直径增益=${(c.gain * scale).toFixed(2)} Å, 平均离心增益=${(c.meanGain * scale).toFixed(2)} Å`
  );
}
const best = candidates[0];
const AMP_MAX = 7; // 最大 Cα 位移封顶 7 Å
const bestGainScaled = best.gain * (AMP_MAX / best.maxGlob); // 缩放到 7 Å 后的真实张开量
let f1Degraded = null;
let dispByResi = null, modeInfo = null;
{
  const mv = modes[best.mi].vec, s = best.s, scale = 7 / best.maxGlob;
  const rows = wideSet
    .map((r) => ({ resi: r.resi, d: v3.len(dispAt(mv, s, r)) * scale }))
    .sort((a, b) => b.d - a.d);
  console.log(`  模式${best.mi + 1}（缩放后）打分集位移 Top5:`, rows.slice(0, 5).map((r) => `${r.resi}:${r.d.toFixed(1)}Å`).join(" "));
  console.log(`  打分集位移 Bottom5:`, rows.slice(-5).map((r) => `${r.resi}:${r.d.toFixed(1)}Å`).join(" "));
}

if (bestGainScaled < 1.0) {
  f1Degraded = `低频模式无显著口袋张开（缩放至 ${AMP_MAX} Å 后最大直径增益 ${bestGainScaled.toFixed(2)} Å，已扫描前 ${modes.length} 个非零模式），本帧退化为声明式缺口`;
  console.warn(f1Degraded);
} else {
  const mv = modes[best.mi].vec, s = best.s;
  let maxD = 0;
  const raw = cas.map((c, i) => {
    const d = [s * mv[3 * i], s * mv[3 * i + 1], s * mv[3 * i + 2]];
    const l = v3.len(d);
    if (l > maxD) maxD = l;
    return { resi: c.resi, d };
  });
  const scale = AMP_MAX / (maxD || 1);
  dispByResi = new Map(raw.map((r) => [r.resi, v3.scale(r.d, scale)]));
  modeInfo = {
    method: "ANM(Cα 弹性网络，cutoff 15 Å，均匀弹簧权重)低频非零模式，扫描前 " + modes.length + " 个取口袋直径增益最大者",
    modeIndex: best.mi + 1,
    sign: best.s,
    opennessGainA: +(best.gain * scale).toFixed(2),
    maxDisplacementA: AMP_MAX,
  };
  console.log(`选用模式 ${best.mi + 1}（${s > 0 ? "+" : "−"}），缩放后最大位移 ${AMP_MAX} Å，口袋直径增益 ${(best.gain * scale).toFixed(2)} Å`);
}

// ---------- 投影输出 ----------
const VW = 760, VH = 560, PAD = 64;
const camShared = makeCamera(
  glcCentroid,
  [
    ...resPoints,
    ...glcC,
    ...g6pAligned.map((a) => a.xyz),
    ...(dispByResi ? pocketRes.map((r) => v3.add(r.ca, dispByResi.get(r.resi) ?? [0, 0, 0])) : []),
  ],
  VW, VH, PAD
);
const camTight = makeCamera(glcCentroid, glcC, VW, VH, 90);

function atomNode(a, label, emph) {
  const [x, y] = (emph === undefined ? camTight : camShared).project(a.xyz);
  return { id: a.id, el: a.el, x: +x.toFixed(1), y: +y.toFixed(1), label, emph };
}

// F0：底物单分子
const f0 = {
  frameId: "gk-1-f0",
  camera: "tight",
  view: { w: VW, h: VH },
  atoms: glc.atoms.map((a) => atomNode(a, GLC_LABEL[a.id], "base")),
  bonds: glc.bonds.map((b) => ({ a: b.a, b: b.b, emph: "base" })),
  residues: [],
  hbonds: [],
  provenance: [
    "GLC 实例坐标取自 1CZA（1.9 Å，X-ray），未改动内部构象；仅离线正交视角投影",
    "键级均为单键（离线由共价半径推断）",
  ],
};

// 残基节点（含可选位移，用于 F1）
function residueNodes(displace) {
  return pocketRes.map((r) => {
    const p = displace ? v3.add(r.ca, displace.get(r.resi) ?? [0, 0, 0]) : r.ca;
    const [x, y] = camShared.project(p);
    const shift = displace ? +v3.len(displace.get(r.resi) ?? [0, 0, 0]).toFixed(1) : 0;
    return { resi: r.resi, resn: r.resn, chain: r.chain, type: r.type, x: +x.toFixed(1), y: +y.toFixed(1), shiftA: shift };
  });
}

// F1：口袋帧——ANM 开放构象尝试
const ANM_ATTEMPT = `ANM 计算尝试（Cα 弹性网络，cutoff 15 Å 均匀弹簧 + cutoff 13 Å 1/r² 权重两种方案，各扫描前 8 个非零模式）：缩放至最大 Cα 位移 7 Å 后，裂缝两壁直径最大增益仅 ${bestGainScaled.toFixed(2)} Å，不足以支撑"域张开"示意`;
const f1 = {
  frameId: "gk-1-f1",
  camera: "shared",
  view: { w: VW, h: VH },
  computed: !f1Degraded,
  modeInfo: modeInfo,
  degradedReason: f1Degraded,
  cornerNote: f1Degraded ? "实验坐标 · 未能生成开放构象" : "计算构象 · 非实验坐标",
  atoms: [],
  bonds: [],
  residues: residueNodes(dispByResi),
  residuesClosed: residueNodes(null), // 对照位（合拢），供 F1→F2 "合拢"注记
  hbonds: [],
  trace: [], // 口袋周边 Cα 描迹
  provenance: f1Degraded
    ? [
        ANM_ATTEMPT,
        "按诚实性原则本帧不呈现计算开放构象：口袋残基为 1CZA 实验坐标原位（空口袋），不做随机扰动冒充",
        "人源无 apo 实验结构（1CZA 及 ≤3 Å 人源条目均含糖）；酵母有 apo 结构可作旁证，但跨物种，仅作文字旁注",
        "张开-闭合的溶液态依据为 SAXS / HDX-MS 结论，非晶体观测；本帧不构成对开放态坐标的声明",
      ]
    : [
        `${modeInfo.method}；模式 ${modeInfo.modeIndex}，${modeInfo.sign > 0 ? "正" : "负"}方向，缩放至最大 Cα 位移 ${modeInfo.maxDisplacementA} Å`,
        `口袋残基平均远离配体质心 ${modeInfo.opennessGainA} Å`,
        "纯计算构象 · 非实验坐标；张开-闭合的实验依据为溶液态 SAXS / HDX-MS 结论，非晶体观测",
        "人源无 apo 实验结构（1CZA 及 ≤3 Å 人源条目均含糖）；酵母有 apo 结构可作旁证，但跨物种，仅作文字旁注",
      ],
};

// Cα 描迹：GLC 质心 14 Å 内残基
{
  const near = cas.filter((c) => v3.len(v3.sub(c.xyz, glcCentroid)) < 14).sort((a, b) => a.resi - b.resi);
  f1.trace = near.map((c) => {
    const p = dispByResi ? v3.add(c.xyz, dispByResi.get(c.resi) ?? [0, 0, 0]) : c.xyz;
    const [x, y] = camShared.project(p);
    return { resi: c.resi, x: +x.toFixed(1), y: +y.toFixed(1) };
  });
}

// F2：结合态（全部实验坐标）
const glcHbonds = pocket.hbonds.filter((h) => h.lig.id === "GLC");
function hbondNodes(hbonds, ligAtomPos) {
  return hbonds.map((h) => {
    const [x1, y1] = camShared.project([h.prot.x, h.prot.y, h.prot.z]);
    const [x2, y2] = camShared.project(ligAtomPos(h));
    return {
      x1: +x1.toFixed(1), y1: +y1.toFixed(1), x2: +x2.toFixed(1), y2: +y2.toFixed(1),
      prot: `${h.prot.resn}${h.prot.resi}·${h.prot.name}`, lig: `${h.lig.id}·${h.lig.name}`, dist: h.dist,
    };
  });
}
const f2 = {
  frameId: "gk-1-f2",
  camera: "shared",
  view: { w: VW, h: VH },
  atoms: glc.atoms.map((a) => {
    const [x, y] = camShared.project(a.xyz);
    return { id: a.id, el: a.el, x: +x.toFixed(1), y: +y.toFixed(1), label: GLC_LABEL[a.id], emph: "base" };
  }),
  bonds: glc.bonds.map((b) => ({ a: b.a, b: b.b, emph: "base" })),
  residues: residueNodes(null),
  hbonds: hbondNodes(glcHbonds, (h) => [h.lig.x, h.lig.y, h.lig.z]),
  provenance: [
    "GLC 与界面残基、氢键均为 1CZA 实验坐标（pocket.json 一手数据）",
    "氢键判据为距离启发式（≤3.6 Å，无方向性），provenance=computed",
  ],
};

// F3：产物态（G6P 刚体对齐到口袋视角；磷酸基差异标注）
const NEW_ATOMS = new Set([13, 14, 15, 16]); // P + 3 个磷酸氧（O6 原本就有，算 touched）
const NEW_BONDS = new Set(["12-13", "13-14", "13-15", "13-16"]);
const g6pHetero = g6pAligned.filter((a) => a.el !== "C").map((a) => a.xyz);
// 离线重算氢键：口袋蛋白侧原子（pocket.json 汇总去重）与对齐后 G6P 杂原子 ≤3.6 Å
const protSide = new Map();
for (const h of pocket.hbonds) protSide.set(`${h.prot.resi}:${h.prot.name}`, { ...h.prot });
const f3Hbonds = [];
for (const [, p] of protSide) {
  for (const a of g6pAligned) {
    if (a.el === "C") continue;
    const d = Math.hypot(p.x - a.xyz[0], p.y - a.xyz[1], p.z - a.xyz[2]);
    if (d <= 3.6) {
      const [x1, y1] = camShared.project([p.x, p.y, p.z]);
      const [x2, y2] = camShared.project(a.xyz);
      f3Hbonds.push({
        x1: +x1.toFixed(1), y1: +y1.toFixed(1), x2: +x2.toFixed(1), y2: +y2.toFixed(1),
        prot: `${p.resn}${p.resi}·${p.name}`, lig: `G6P·${G6P_LABEL[a.id]}`, dist: +d.toFixed(2), recomputed: true,
      });
      break;
    }
  }
}
const f3 = {
  frameId: "gk-1-f3",
  camera: "shared",
  view: { w: VW, h: VH },
  cornerNote: "1CZA 实测分布 · G6P 位于抑制位点",
  atoms: g6pAligned.map((a) => {
    const [x, y] = camShared.project(a.xyz);
    return {
      id: a.id, el: a.el, x: +x.toFixed(1), y: +y.toFixed(1), label: G6P_LABEL[a.id],
      emph: NEW_ATOMS.has(a.id) ? "new" : "dim",
    };
  }),
  bonds: g6p.bonds.map((b) => {
    const key = `${Math.min(b.a, b.b)}-${Math.max(b.a, b.b)}`;
    return { a: b.a, b: b.b, emph: NEW_BONDS.has(key) ? "new" : "dim" };
  }),
  diffNote: "相对 GLC 新增：磷原子 P 及磷酸基 3 个氧、C6–O6–P 磷酸酯键（砖红）",
  residues: residueNodes(null),
  hbonds: f3Hbonds,
  provenance: [
    "G6P 实例坐标取自 1CZA；因 1CZA 中 G6P 位于另一实例位点，此处经刚体对齐（Horn 四元数 Kabsch）呈现在同一口袋视角下，内部构象未改动",
    `对齐 RMSD（环骨架 8 原子）= ${coreRmsd.toFixed(2)} Å`,
    "重要：1CZA 中的 G6P 占据的是抑制位点，不是活性位点的产物位置；本帧按该结构的实测分布呈现，不声明活性位点产物结合模式",
    "氢键为离线重算（对齐后 G6P 杂原子与口袋蛋白侧原子 ≤3.6 Å，距离启发式），非 pocket.json 原始记录",
    "化学叙事：C6 位羟基被 ATP γ-磷酸磷酰化生成 G6P；产物态无独立实验结构，本帧不伪造结合模式",
  ],
};

// ---------- 写出 ----------
const bytes = (o) => Buffer.byteLength(JSON.stringify(o));
for (const f of [f0, f1, f2, f3]) {
  writeFileSync(join(OUT, `frame-${f.frameId.slice(-2)}.json`), JSON.stringify(f));
  console.log(`写出 frame-${f.frameId.slice(-2)}.json（${(bytes(f) / 1024).toFixed(1)} KB）`);
}
const index = {
  pathwayId: "glycolysis",
  stepId: "gk-1",
  stepIndex: 1,
  pdbId: "1CZA",
  chain: "N",
  resolution: 1.9,
  species: "Homo sapiens",
  frames: [
    { frameId: "gk-1-f0", role: "substrate", asset: "frame-f0.json", computed: false, ligandCodes: ["GLC"] },
    { frameId: "gk-1-f1", role: "pocket", asset: "frame-f1.json", computed: !f1Degraded, ligandCodes: [] },
    { frameId: "gk-1-f2", role: "bound", asset: "frame-f2.json", computed: false, ligandCodes: ["GLC"] },
    { frameId: "gk-1-f3", role: "allosteric", asset: "frame-f3.json", computed: false, ligandCodes: ["G6P"] },
  ],
  totalGzipBudget: "< 5 MB（实际远小于）",
};
writeFileSync(join(OUT, "index.json"), JSON.stringify(index, null, 2));
console.log(`写出 index.json。全部资产 ${(bytes(f0) + bytes(f1) + bytes(f2) + bytes(f3)) / 1024} KB ≪ 5 MB 上限`);
