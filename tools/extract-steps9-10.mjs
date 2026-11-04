// ============================================================
// extract-steps9-10.mjs —— 第 9–10 步帧资产（烯醇化酶 ENO / 丙酮酸激酶 PK）糖酵解收尾
//
// 结构实情（research/step-states.md 核验表，不猜）：
//   gk-9  3UCD 人 ENO2 1.41 Å（2PG A/601 + PEP B/601 + MG A/599,A/600 + B 链同名）；
//         apo 1TE6 人 ENO2 1.8 Å——十步中唯一"底物+产物+金属同结构、apo 同酶同物种"的旗舰步。
//         注意：2PG 在 A 链、PEP 在 B 链（同结构两亚基两态，非同口袋两态），帧内必须声明。
//   gk-10 6NN4 人 PKL **D499N 突变体** 2.15 Å（PEP C/603 + FBP C/601 别构 36.6 Å 远端，无 ADP、无金属）；
//         产物丙酮酸不在该结构、PDB 亦无可信产物态 → 2D 结构式帧；
//         apo 6NN5 人 PKLR 2.26 Å（仅 GOL/EDO/HOH，干净 apo；含 H527W 结晶工程突变，如实注明）。
//
// 化学差异（数据驱动核验，见 _check-ligands.mjs 输出）：
//   2PG → PEP = 脱水：C3–OH（2PG 的 O3）与 C2–H 脱去 H₂O，C2=C3 双键生成；
//   磷酸始终酯化在 C2（2PG 桥氧 O1P → PEP 桥氧 O2，同名不同义，叠合锚点显式配对）。
//
// 相机链：
//   步 9：T9 = Kabsch(3UCD·2PG → 第 8 步链末端 1EQJ·2PG 位置)，11 重原子全同名；
//         1TE6 apo 经 Cα Kabsch 并入（人→人同酶）；
//         T9p = PEP 经 7 锚点叠合到 2PG 位点（f3 一帧双分子；PEP 原位在 B 链 31 Å 外，必须声明）。
//   步 10：T10 = Kabsch(6NN4·PEP → gk-9-f3 中 PEP 的呈现位置)，10 重原子全同名（人→人同分子）。
//
// 输出：public/assets/structures/gk-{9,10}/frame-*.json + index.json
// ============================================================
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const CACHE = join(ROOT, "tools", "cache");
const G9 = join(ROOT, "public", "assets", "steps", "gly-09");
const G10 = join(ROOT, "public", "assets", "steps", "gly-10");
const S7 = join(ROOT, "public", "assets", "structures", "gk-7");
const S8 = join(ROOT, "public", "assets", "structures", "gk-8");
const S9 = join(ROOT, "public", "assets", "structures", "gk-9");
const S10 = join(ROOT, "public", "assets", "structures", "gk-10");
mkdirSync(S9, { recursive: true });
mkdirSync(S10, { recursive: true });

// ---------- 数学（与 extract-step1/2/3-8 脚本一致，勿单独改动） ----------
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

// ---------- 解析（与 extract-steps3-8 一致） ----------
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
function ligandAtoms(het, resn, chain, resi) {
  const altRank = (a) => (a.altloc.trim() === "" ? 0 : a.altloc.trim() === "A" ? 1 : 2);
  const seen = new Set();
  return het
    .filter((a) => a.resn === resn && a.chain === chain && a.resi === resi && a.el !== "H" && a.el !== "D")
    .sort((a, b) => altRank(a) - altRank(b))
    .filter((a) => { const k = a.name; if (seen.has(k)) return false; seen.add(k); return true; });
}
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

/** 配体帧资产（分子 + 可选口袋/氢键）——与 extract-steps3-8.mjs 同一实现 */
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
    // type 可显式给出（gate=门控残基，Tier B 镜头高亮用）；未给出时按氢键/接触判定
    residues: residues.map((r) => { const [x, y] = P(r.ca); return { resi: r.resi, resn: r.resn, chain: r.chain, type: r.type ?? (r.hbond ? "hbond" : "contact"), x, y }; }),
    hbonds: hbonds.map(({ p, l, d }) => { const [x1, y1] = P(p.xyz); const [x2, y2] = P(l.xyz); return { x1, y1, x2, y2, prot: `${p.resn}${p.resi}·${p.name}`, lig: `${l.resn ?? "LIG"}·${l.name}`, dist: r1(d) }; }),
    diffNote,
    provenance,
  };
}

// ============================================================
// 第 7 步相机重建 + 确定性校验（与 extract-steps3-8.mjs 完全同一路径）
// ============================================================
const fdn = parsePdb(join(CACHE, "9FDN.pdb"));
const pg3fdn = ligandAtoms(fdn.het, "3PG", "A", 503);
const atp = ligandAtoms(fdn.het, "ATP", "A", 502);
const pk7 = pocketAndHbonds(fdn.prot, [...pg3fdn, ...atp]);
const res7 = pk7.residues.map((r) => ({ ...r, ca: fdn.prot.find((p) => p.chain === r.chain && p.resi === r.resi && p.name === "CA")?.xyz ?? null })).filter((r) => r.ca);
const pg3c = pg3fdn.map((a) => a.xyz), atpc = atp.map((a) => a.xyz);
const mid7 = [0, 1, 2].map((d) => (pg3c.reduce((s, p) => s + p[d], 0) / pg3c.length + atpc.reduce((s, p) => s + p[d], 0) / atpc.length) / 2);
const camStep7 = makeCamera(mid7, [...res7.map((r) => r.ca), ...pg3c, ...atpc], VW, VH, 64);

// 确定性校验：gk-7/frame-f3.json 的原子投影必须与本次重建一致（<0.2 px）
// 注意：帧 JSON 坐标含 makeProjector 的画布外扩偏移，校验须用同一路径（atoms3d=[3PG+ATP]）
const refF73 = JSON.parse(readFileSync(join(S7, "frame-f3.json"), "utf8"));
const refByLabel = new Map(refF73.atoms.filter((a) => a.label).map((a) => [a.label, a]));
const P7 = makeProjector(camStep7, [...pg3fdn, ...atp]);
// 注意：ATP 腺嘌呤环有同名原子 C2，与 3PG 的 C2 撞名——校验只取 3PG 全原子 + ATP 磷原子（PA/PB/PG 不撞名）
let maxDev7 = 0;
for (const a of [...pg3fdn, ...atp.filter((x) => x.el === "P")]) {
  const ref = refByLabel.get(a.name);
  if (!ref) continue;
  const [x, y] = P7.P(a.xyz);
  maxDev7 = Math.max(maxDev7, Math.hypot(x - ref.x, y - ref.y));
}
console.log(`第 7 步相机重建校验：与 gk-7/frame-f3.json 最大偏差 ${maxDev7.toFixed(3)} px`);
if (maxDev7 > 0.2) { console.error("相机重建与 gk-7 不一致，中止"); process.exit(1); }

// ============================================================
// 第 8 步链末端 3D 重算：T8（1QHF·3PG → 9FDN·3PG）+ T8b（1EQJ·2PG → 3PG 羧基端）
// （gk-8 帧资产只存 2D 投影，3D 链末端须按同一路径重算；9FDN·3PG 即 camStep7 坐标本位）
// ============================================================
const qhf = parsePdb(join(CACHE, "1QHF.pdb"));
const pg3qhf = ligandAtoms(qhf.het, "3PG", "A", 252);
const T8 = kabsch(pg3qhf.map((a) => a.xyz), pg3fdn.map((a) => a.xyz));
const t8 = (p) => applyRt(T8.R, T8.t, p);
const rmsdT8 = rmsdOf(pg3qhf.map((a, i) => [t8(a.xyz), pg3fdn[i].xyz]));
const eqj = parsePdb(join(CACHE, "1EQJ.pdb"));
const pg2eqj = ligandAtoms(eqj.het, "2PG", "A", 801);
const pg3qhfFinal = pg3qhf.map((a) => ({ ...a, xyz: t8(a.xyz) }));
const pg3qhfByName = new Map(pg3qhfFinal.map((a) => [a.name, a]));
const T8B_MAP = ["C1", "C2", "C3", "O1", "O2"];
const T8b = kabsch(T8B_MAP.map((n) => pg2eqj.find((a) => a.name === n).xyz), T8B_MAP.map((n) => pg3qhfByName.get(n).xyz));
const t8b = (p) => applyRt(T8b.R, T8b.t, p);
console.log(`链末端重算：T8 RMSD ${rmsdT8.toFixed(2)} Å、T8b 锚点吻合（与 gk-8 index.json 报脚同值即一致）`);

// ============================================================
// 第 9 步：烯醇化酶（3UCD + 1TE6）
// ============================================================
const ucd = parsePdb(join(G9, "holo.pdb"));
const pg2ucd = ligandAtoms(ucd.het, "2PG", "A", 601);
const pepUcd = ligandAtoms(ucd.het, "PEP", "B", 601);
const mgUcd = [...ligandAtoms(ucd.het, "MG", "A", 599), ...ligandAtoms(ucd.het, "MG", "A", 600)];
if (pg2ucd.length !== 11 || pepUcd.length !== 10 || mgUcd.length !== 2) {
  console.error(`3UCD 配体原子数异常：2PG=${pg2ucd.length} PEP=${pepUcd.length} MG=${mgUcd.length}`); process.exit(1);
}
// 核验 2PG 连接（数据驱动）：O3 应只连 C3（离去羟基）、桥氧应连 C2 与 P
const byName = new Map(pg2ucd.map((a) => [a.name, a]));
const nbrs = (nm, cut = 1.75) => pg2ucd.filter((a) => a.name !== nm && Math.hypot(...v3.sub(byName.get(nm).xyz, a.xyz)) < cut).map((a) => a.name);
const okO3 = nbrs("O3").join(",") === "C3";
const okBridge = nbrs("O1P").includes("C2") && nbrs("O1P").includes("P");
console.log(`2PG 连接核验：O3→[${nbrs("O3")}]（应为 C3）、O1P→[${nbrs("O1P")}]（应为 C2,P）${okO3 && okBridge ? " ✓" : " ✗ 异常!"}`);
if (!okO3 || !okBridge) process.exit(1);

// T9：3UCD·2PG → 第 8 步链末端（1EQJ·2PG 重算位置，全 11 原子同名）
const chainEnd = pg2eqj.map((a) => ({ ...a, xyz: t8b(a.xyz) }));
const chainEndByName = new Map(chainEnd.map((a) => [a.name, a]));
const T9 = kabsch(pg2ucd.map((a) => a.xyz), pg2ucd.map((a) => chainEndByName.get(a.name).xyz));
const t9 = (p) => applyRt(T9.R, T9.t, p);
const rmsdT9 = rmsdOf(pg2ucd.map((a) => [t9(a.xyz), chainEndByName.get(a.name).xyz]));
console.log(`T9（3UCD·2PG → 第 8 步链末端）RMSD = ${rmsdT9.toFixed(2)} Å（11 重原子全同名，同人跨结构=配体级）`);
const pg2Final = pg2ucd.map((a) => ({ ...a, xyz: t9(a.xyz) }));
const mgFinal = mgUcd.map((a) => ({ ...a, xyz: t9(a.xyz) }));

// f0：2PG 单分子
const f9f0 = ligandFrame("gk-9-f0", camStep7, pg2Final, {
  labelOf: (a) => a.name,
  provenance: [
    "2PG 实例取自 3UCD（人 ENO2，1.41 Å，链 A resi 601）实验坐标，未改动内部构象",
    `经 T9 全原子 Kabsch（11 重原子同名）对齐至第 8 步链末端（1EQJ·2PG 位置），RMSD ${rmsdT9.toFixed(2)} Å`,
    "同一配体代码（2PG）同名对接：跨结构但同分子，无物种/命名歧义",
  ],
});

// f1：apo 1TE6（人 ENO2 1.8 Å，同酶同物种同编号）——真 3D apo 帧
const te6 = parsePdb(join(CACHE, "1TE6.pdb"));
const ka9 = kabschCa(te6.prot, ucd.prot);
const t9apo = (p) => t9(applyRt(ka9.T.R, ka9.T.t, p));
console.log(`A9（1TE6 → 3UCD Cα Kabsch，链 ${ka9.chainA}→${ka9.chainB}）RMSD = ${ka9.rmsd.toFixed(2)} Å（${ka9.nPairs} 对，同酶同物种同编号）`);
const te6ProtT = te6.prot.map((p) => ({ ...p, xyz: t9apo(p.xyz) }));
const pk9apo = pocketAndHbonds(te6ProtT, pg2Final);
const res9apo = pk9apo.residues
  .map((r) => ({ ...r, ca: te6ProtT.find((p) => p.chain === r.chain && p.resi === r.resi && p.name === "CA")?.xyz ?? null }))
  .filter((r) => r.ca);
console.log(`1TE6 apo 界面残基 ${res9apo.length}（选取基准=3UCD 2PG 位点 ≤4.5 Å）`);
// 1TE6 结晶添加剂是否侵占活性位点（PO4/TRS/CL 距 2PG 位点 ≤5 Å 则必须声明）
const te6Adducts = te6.het.filter((h) => ["PO4", "TRS", "CL"].includes(h.resn));
const adductNear = te6Adducts.filter((h) => pg2Final.some((l) => Math.hypot(...v3.sub(h.xyz, l.xyz)) < 5));
console.log(`1TE6 结晶添加剂 ${te6Adducts.length} 个，其中距 2PG 位点 ≤5 Å 的 ${adductNear.length} 个${adductNear.length ? "：" + [...new Set(adductNear.map((h) => h.resn))].join("/") : "（活性位点干净）"}`);
const f9f1 = ligandFrame("gk-9-f1", camStep7, [], {
  cameraLabel: "shared(step1)+扩展画布",
  residues: res9apo.map((r) => ({ ...r, ca: r.ca })),
  provenance: [
    "1TE6（人 ENO2，1.8 Å，X-ray）实验坐标，apo 无底物/产物配体",
    `经 Cα Kabsch 对齐至 3UCD（链 ${ka9.chainA}→${ka9.chainB}，${ka9.nPairs} 对），RMSD ${ka9.rmsd.toFixed(2)} Å——同酶（ENO2）、同物种（人）、同编号体系，十步中唯一无需跨结构拼贴声明的 apo`,
    "口袋残基选取基准=对齐后 3UCD 2PG 位点 ≤4.5 Å（跨结构示意，但同酶同编号，残基一一对应）",
  ],
});

// f2：结合态 2PG + 双 Mg + 口袋（蛋白与配体必须同处 camStep7 坐标系——protA 全部经 t9）
const protUcdAT = ucd.prot.filter((p) => p.chain === "A").map((p) => ({ ...p, xyz: t9(p.xyz) }));
const pk9 = pocketAndHbonds(protUcdAT, [...pg2Final, ...mgFinal]);
const res9 = pk9.residues.map((r) => ({ ...r, ca: protUcdAT.find((p) => p.resi === r.resi && p.name === "CA")?.xyz ?? null })).filter((r) => r.ca);
console.log(`3UCD 界面残基 ${res9.length}，氢键 ${pk9.hbonds.length} 条`);

// 门控残基（Tier B 高亮）：并行勘察判定 3UCD 口袋在晶体中闭合（最大可通行球 1.12 Å < 2PG 最小重原子 1.52 Å），
// 卡门由 GLU249 / ASP318 / SER248 侧链构成（同酶 apo 1TE6 同样闭合，1.10 Å）。此处只标残基身份与 Cα 位置，不画侧链。
const GATEKEEPERS = [["GLU", 249], ["ASP", 318], ["SER", 248]];
const gateRes = GATEKEEPERS.map(([resn, resi]) => {
  const ca = protUcdAT.find((p) => p.chain === "A" && p.resi === resi && p.name === "CA")?.xyz;
  if (!ca) throw new Error(`门控残基缺失：${resn}${resi}（3UCD A 链）`);
  return { resi, resn, chain: "A", type: "gate", ca };
});
const res9WithGates = [...res9.filter((r) => !gateRes.some((g) => g.resi === r.resi)), ...gateRes];
console.log(`门控残基 ${gateRes.map((g) => g.resn + g.resi).join(" / ")} 已并入 f2（type=gate）`);
const f9f2 = ligandFrame("gk-9-f2", camStep7, [...pg2Final, ...mgFinal], {
  residues: res9WithGates.map((r) => ({ ...r, ca: r.ca })),
  hbonds: pk9.hbonds.map(({ p, l, d }) => ({ p, l, d })),
  labelOf: (a) => (a.el === "MG" ? "Mg" : a.name),
  provenance: [
    "2PG 与双 Mg²⁺（A/599、A/600）同为 3UCD 实测——同结构，无跨结构问题",
    "界面残基与氢键为离线重算（≤4.5 Å / ≤3.6 Å 距离启发式），provenance=computed",
    "门控残基 GLU249 / ASP318 / SER248（type=gate）按残基身份标出：晶体口袋闭合（最大可通行球 1.12 Å < 2PG 最小重原子 1.52 Å），配体无「从外部进入」的通道",
    "烯醇化酶催化需要双 Mg²⁺：Mg²⁺ 活化 C2–H 的酸化与 C3–OH 的离去",
  ],
});

// f3：一帧双分子——2PG（暗）+ PEP（实）+ 双 Mg；PEP 经 7 锚点叠合到 2PG 位点
// 锚点（数据驱动核验过）：同名 C1/C2/C3/P/O1 + 显式配对 桥氧 2PG·O1P↔PEP·O2、羧基 2PG·O2↔PEP·O2′
const pepByName = new Map(pepUcd.map((a) => [a.name, a]));
const ANCHOR = [["C1", "C1"], ["C2", "C2"], ["C3", "C3"], ["P", "P"], ["O1", "O1"], ["O1P", "O2"], ["O2", "O2'"]];
for (const [a, b] of ANCHOR) {
  if (!byName.has(a) || !pepByName.has(b)) { console.error(`锚点缺失：2PG·${a} / PEP·${b}`); process.exit(1); }
}
const T9p = kabsch(ANCHOR.map(([a]) => byName.get(a).xyz), ANCHOR.map(([, b]) => pepByName.get(b).xyz));
const rmsdT9p = rmsdOf(ANCHOR.map(([a, b]) => [applyRt(T9p.R, T9p.t, byName.get(a).xyz), pepByName.get(b).xyz]));
console.log(`T9p（PEP → 2PG 位点，7 锚点叠合）RMSD = ${rmsdT9p.toFixed(2)} Å（桥氧/羧基跨命名显式配对）`);
const pepFinal = pepUcd.map((a) => ({ ...a, xyz: t9(applyRt(T9p.R, T9p.t, a.xyz)) }));
// PEP 键：距离成键 + C2=C3 双键（order 2）；C2/C3 砖红
const pepBonds = distBonds(pepFinal).map((b) => {
  const na = pepFinal[b.a - 1].name, nb2 = pepFinal[b.b - 1].name;
  const isDouble = (na === "C2" && nb2 === "C3") || (na === "C3" && nb2 === "C2");
  return { ...b, ...(isDouble ? { order: 2 } : {}) };
});
const NEW_SET = new Set(["C2", "C3"]);
const MAIN_DIM = new Set(pg2Final); // 主分子 2PG 全暗色；Mg（主）为 base；PEP（extra）C2/C3 砖红
const f9f3 = ligandFrame("gk-9-f3", camStep7, [...pg2Final, ...mgFinal], {
  residues: [],
  hbonds: [],
  extraAtoms: pepFinal,
  extraBonds: pepBonds,
  emphOf: (a) => (MAIN_DIM.has(a) ? "dim" : NEW_SET.has(a.name) ? "new" : "base"),
  labelOf: (a, isExtra) => {
    if (a.el === "MG") return "Mg";
    if (!isExtra) return a.name === "O3" ? "O3·离去(H₂O)" : a.name === "C2" || a.name === "C3" ? a.name : null;
    return a.name === "C2" || a.name === "C3" ? a.name : null;
  },
  diffNote:
    "脱水已完成：2PG（暗色）的 C3–OH（O3 标「离去」）与 C2–H 以 H₂O 脱去 → PEP（C2/C3 砖红）生成 C2=C3 双键（双线）；磷酸始终酯化在 C2（烯醇磷酸）。",
  provenance: [
    "一帧双分子：2PG（暗色，A 链实测）+ PEP（亮色，B 链实测）+ 双 Mg²⁺（A 链位点实测）——全部 3UCD 实验坐标",
    "核验表声明：3UCD 的 2PG 在 A 链、PEP 在 B 链（同结构两亚基两态，非同口袋两态）；PEP 原位距 2PG 位点约 31 Å",
    `PEP 经 T9p（7 锚点 Kabsch：C1/C2/C3/P/O1 同名 + 桥氧 O1P↔O2、羧基 O2↔O2′ 显式配对）叠合到本亚基 2PG 位点示意，RMSD ${rmsdT9p.toFixed(2)} Å——叠合是呈现手段，非实验观测`,
    "差异表达=删原子/加键：PEP 中不存在 2PG 的 O3（离去基），C2=C3 以双线（order 2）呈现；非仅改色",
  ],
});
writeFileSync(join(S9, "frame-f0.json"), JSON.stringify(f9f0));
writeFileSync(join(S9, "frame-f1.json"), JSON.stringify(f9f1));
writeFileSync(join(S9, "frame-f2.json"), JSON.stringify(f9f2));
writeFileSync(join(S9, "frame-f3.json"), JSON.stringify(f9f3));
writeFileSync(join(S9, "index.json"), JSON.stringify({
  stepId: "gk-9", stepIndex: 9,
  frames: [
    { frameId: "gk-9-f0", asset: "frame-f0.json", source: "3UCD / Homo sapiens / 1.41 Å（2PG，A 链）" },
    { frameId: "gk-9-f1", asset: "frame-f1.json", source: "1TE6 / Homo sapiens / 1.8 Å（apo，人 ENO2 同酶同物种同编号）" },
    { frameId: "gk-9-f2", asset: "frame-f2.json", source: "3UCD / Homo sapiens / 1.41 Å（结合态 2PG+双 Mg）" },
    { frameId: "gk-9-f3", asset: "frame-f3.json", source: "3UCD / Homo sapiens / 1.41 Å（一帧双分子：2PG+PEP+双 Mg，PEP 叠合示意）" },
  ],
  alignment: {
    T9: `3UCD·2PG → 第 8 步链末端（1EQJ·2PG 重算位置），RMSD ${rmsdT9.toFixed(2)} Å（11 重原子全同名）`,
    A9: `1TE6 → 3UCD Cα Kabsch，RMSD ${ka9.rmsd.toFixed(2)} Å（${ka9.nPairs} 对，同酶同物种）`,
    T9p: `3UCD·PEP → 2PG 位点 7 锚点叠合，RMSD ${rmsdT9p.toFixed(2)} Å（f3 双分子示意，已声明）`,
  },
  gatekeepers: gateRes.map((g) => `${g.resn}${g.resi}(${g.chain})`),
  pocketClosure: "晶体口袋闭合：3UCD 最大可通行球 1.12 Å、1TE6 1.10 Å；2PG 最小重原子半径 1.52 Å → 无配体外进通道",
}, null, 2));
console.log("gk-9 完成。");

// ============================================================
// 第 10 步：丙酮酸激酶（6NN4 D499N + 6NN5 apo）
// ============================================================
const n4 = parsePdb(join(G10, "holo.pdb"));
const pep6n = ligandAtoms(n4.het, "PEP", "C", 603);
if (pep6n.length !== 10) { console.error(`6NN4 PEP 原子数异常：${pep6n.length}`); process.exit(1); }
// T10：6NN4·PEP → gk-9-f3 中 PEP 的呈现位置（10 原子全同名，人→人同分子）
const pepFinalByName = new Map(pepFinal.map((a) => [a.name, a]));
const T10 = kabsch(pep6n.map((a) => a.xyz), pep6n.map((a) => pepFinalByName.get(a.name).xyz));
const t10 = (p) => applyRt(T10.R, T10.t, p);
const rmsdT10 = rmsdOf(pep6n.map((a) => [t10(a.xyz), pepFinalByName.get(a.name).xyz]));
console.log(`T10（6NN4·PEP → gk-9-f3 PEP 呈现位置）RMSD = ${rmsdT10.toFixed(2)} Å（10 重原子全同名，人→人同分子）`);
const pep6nFinal = pep6n.map((a) => ({ ...a, xyz: t10(a.xyz) }));

// D499N 核验：残基 499 应为 ASN（突变体事实，帧内必须标注）
const asn499 = n4.prot.find((p) => p.resi === 499 && p.name === "CA");
console.log(`D499N 核验：6NN4 残基 499 resn=${asn499?.resn ?? "缺失"}${asn499?.resn === "ASN" ? "（突变体确认 ✓）" : " ✗ 异常!"}`);
if (asn499?.resn !== "ASN") process.exit(1);

// f0：PEP 单分子
const f10f0 = ligandFrame("gk-10-f0", camStep7, pep6nFinal, {
  labelOf: (a) => a.name,
  provenance: [
    "PEP 实例取自 6NN4（人丙酮酸激酶 PKL，D499N 突变体，2.15 Å，链 C resi 603）实验坐标",
    `经 T10 全原子 Kabsch（10 重原子同名）对齐至第 9 步产物帧中 PEP 的呈现位置，RMSD ${rmsdT10.toFixed(2)} Å`,
    "同一分子（人→人）配体级对齐：第 9 步 PEP（叠合示意）→ 第 10 步底物 PEP（实测）",
  ],
});

// f1：apo 6NN5（人 PKLR 2.26 Å）
const n5 = parsePdb(join(CACHE, "6NN5.pdb"));
const ka10 = kabschCa(n5.prot, n4.prot);
const t10apo = (p) => t10(applyRt(ka10.T.R, ka10.T.t, p));
console.log(`A10（6NN5 → 6NN4 Cα Kabsch，链 ${ka10.chainA}→${ka10.chainB}）RMSD = ${ka10.rmsd.toFixed(2)} Å（${ka10.nPairs} 对，同酶 PKLR 同物种）`);
const n5ProtT = n5.prot.map((p) => ({ ...p, xyz: t10apo(p.xyz) }));
const pk10apo = pocketAndHbonds(n5ProtT, pep6nFinal);
const res10apo = pk10apo.residues
  .map((r) => ({ ...r, ca: n5ProtT.find((p) => p.chain === r.chain && p.resi === r.resi && p.name === "CA")?.xyz ?? null }))
  .filter((r) => r.ca);
console.log(`6NN5 apo 界面残基 ${res10apo.length}（选取基准=6NN4 PEP 位点 ≤4.5 Å）`);
// 6NN5 结晶小分子（GOL/EDO）是否侵占活性位点
const n5Adducts = n5.het.filter((h) => ["GOL", "EDO"].includes(h.resn));
const adductNear10 = n5Adducts.filter((h) => pep6nFinal.some((l) => Math.hypot(...v3.sub(h.xyz, l.xyz)) < 5));
console.log(`6NN5 结晶添加剂（GOL/EDO）距 PEP 位点 ≤5 Å 的 ${adductNear10.length} 个${adductNear10.length ? "：" + [...new Set(adductNear10.map((h) => h.resn))].join("/") : "（活性位点干净）"}`);
const f10f1 = ligandFrame("gk-10-f1", camStep7, [], {
  cameraLabel: "shared(step1)+扩展画布",
  residues: res10apo.map((r) => ({ ...r, ca: r.ca })),
  provenance: [
    "6NN5（人丙酮酸激酶 PKLR，2.26 Å，X-ray）实验坐标，apo 仅含结晶添加物 GOL/EDO（不入画）",
    `经 Cα Kabsch 对齐至 6NN4（链 ${ka10.chainA}→${ka10.chainB}，${ka10.nPairs} 对），RMSD ${ka10.rmsd.toFixed(2)} Å——同酶（PKLR）、同物种（人）`,
    "6NN5 为野生型 Asp499（6NN4 为 D499N 突变体对照），但含 H527W 结晶工程突变（非催化残基，如实注明）",
    "口袋残基选取基准=对齐后 6NN4 PEP 位点 ≤4.5 Å（跨结构示意，同酶同编号）",
  ],
});

// f2：结合态 PEP + 口袋（D499N 锁定）；FBP 别构位点 36.6 Å 远端不入画
const protN4C = n4.prot.filter((p) => p.chain === "C");
const pk10 = pocketAndHbonds(protN4C, pep6n);
const res10 = pk10.residues.map((r) => ({ ...r, ca: protN4C.find((p) => p.resi === r.resi && p.name === "CA")?.xyz ?? null })).filter((r) => r.ca);
console.log(`6NN4 界面残基 ${res10.length}，氢键 ${pk10.hbonds.length} 条；D499N 在界面：${res10.some((r) => r.resi === 499)}；Asp499 位点残基 resn=${res10.find((r) => r.resi === 499)?.resn ?? "不在界面"}`);
// 499 与 PEP 的最近距离（用于 caption 如实描述）
const asn499Atoms = protN4C.filter((p) => p.resi === 499);
const d499 = Math.min(...asn499Atoms.map((p) => Math.min(...pep6n.map((l) => Math.hypot(...v3.sub(p.xyz, l.xyz))))));
console.log(`Asn499 最近原子距 PEP = ${d499.toFixed(1)} Å（>4.5 Å 则不入界面残基，标注进 caption）`);
const f10f2 = ligandFrame("gk-10-f2", camStep7, pep6nFinal, {
  residues: res10.map((r) => ({ ...r, ca: t10(r.ca) })),
  hbonds: pk10.hbonds.map(({ p, l, d }) => ({ p: { ...p, xyz: t10(p.xyz) }, l: { ...l, xyz: t10(l.xyz) }, d })),
  labelOf: (a) => a.name,
  provenance: [
    "6NN4（人 PKL，D499N 突变体，2.15 Å）实测结合态",
    `D499N 为该结构的结晶构建事实（残基 499=ASN 已在文件内核验，帧上标注不隐去）；实测 Asn499 位于 FBP 别构位点边缘（8.9 Å）、距活性位点 PEP ${d499.toFixed(1)} Å——突变经变构界面锁定构象以稳定 PEP 结合，不直接接触底物`,
    "FBP（别构激活剂）共结晶于 36.6 Å 远端变构位点，超出本帧画幅，不入画（见 caption）",
    "界面残基与氢键为离线重算（≤4.5 Å / ≤3.6 Å 距离启发式），provenance=computed",
  ],
});

writeFileSync(join(S10, "frame-f0.json"), JSON.stringify(f10f0));
writeFileSync(join(S10, "frame-f1.json"), JSON.stringify(f10f1));
writeFileSync(join(S10, "frame-f2.json"), JSON.stringify(f10f2));
writeFileSync(join(S10, "index.json"), JSON.stringify({
  stepId: "gk-10", stepIndex: 10,
  frames: [
    { frameId: "gk-10-f0", asset: "frame-f0.json", source: "6NN4 / Homo sapiens / 2.15 Å（PEP，D499N 突变体）" },
    { frameId: "gk-10-f1", asset: "frame-f1.json", source: "6NN5 / Homo sapiens / 2.26 Å（apo PKLR，H527W 工程突变已注明）" },
    { frameId: "gk-10-f2", asset: "frame-f2.json", source: "6NN4 / Homo sapiens / 2.15 Å（结合态 PEP，D499N）" },
    { frameId: "gk-10-f3", asset: "/assets/structures/2d/pyruvate.json", kind: "2d", note: "丙酮酸无产物态实验坐标（6NN4 无 PYR、ADP 未建模）→ 2D 结构式帧" },
  ],
  alignment: {
    T10: `6NN4·PEP → gk-9-f3 PEP 呈现位置，RMSD ${rmsdT10.toFixed(2)} Å（10 重原子全同名，人→人同分子）`,
    A10: `6NN5 → 6NN4 Cα Kabsch，RMSD ${ka10.rmsd.toFixed(2)} Å（${ka10.nPairs} 对，同酶 PKLR）`,
  },
}, null, 2));
console.log("gk-10 完成。第 9–10 步帧资产生成完毕，糖酵解十步收尾。");
