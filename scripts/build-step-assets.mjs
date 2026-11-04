// 单步 3D 结合视图离线资产管线（当前仅 gly-06 / GAPDH）。
// 零第三方依赖（Node ≥ 18），幂等可重复执行；--refresh 强制重新下载 PDB。
// 产出 public/assets/steps/<step>/：holo.pdb / apo.pdb / ligand.sdf / pocket.json / meta.json
// 运行时零计算原则：口袋残基、氢键、水、相互作用类型全部在此离线算完。
import { mkdirSync, readFileSync, writeFileSync, existsSync, statSync } from "node:fs";
import { gzipSync } from "node:zlib";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const CACHE = join(ROOT, "scripts", "cache", "pdb");
const REFRESH = process.argv.includes("--refresh");
const MAX_GZIP = 5 * 1024 * 1024; // 单资产 gzip 上限（与项目硬约束一致）

// ---------- 步骤配置（后续步骤在此扩展） ----------
const STEP = {
  id: "gly-06",
  name: "G3P 氧化磷酸化（GAPDH）",
  holo: { pdbId: "1U8F", chain: "P", ligand: "NAD", organism: "Homo sapiens" },
  apo: { pdbId: "8G17", chain: "A", organism: "Homo sapiens" },
  note: "1U8F 不含底物 G3P/1,3-BPG 坐标，配体仅有辅因子 NAD；页面须如实标注“仅辅因子结合，不含底物坐标”。",
};
const POCKET_CUTOFF = 4.5; // 口袋残基判据：重原子到 NAD 最近距离 ≤ 4.5 Å
const HBOND_CUTOFF = 3.5; // 氢键判据：N/O–N/O 距离 ≤ 3.5 Å
const WATER_CUTOFF = 8.0; // 展示的结晶水：到 NAD ≤ 8 Å
const HYDROPHOBIC = new Set(["ALA", "VAL", "LEU", "ILE", "PHE", "MET", "TRP", "PRO", "CYS"]);
const COVALENT_R = { H: 0.31, C: 0.76, N: 0.71, O: 0.66, P: 1.07, S: 1.05, MG: 1.39 };

function fail(msg) {
  console.error(`[build-step-assets] 失败：${msg}`);
  process.exit(1);
}

// ---------- PDB 下载（幂等：缓存存在则跳过） ----------
async function download(pdbId) {
  mkdirSync(CACHE, { recursive: true });
  const file = join(CACHE, `${pdbId}.pdb`);
  if (!REFRESH && existsSync(file) && statSync(file).size > 0) {
    console.log(`· 缓存命中 ${pdbId}（--refresh 可强制重新下载）`);
    return readFileSync(file, "utf8");
  }
  const res = await fetch(`https://files.rcsb.org/download/${pdbId}.pdb`);
  if (!res.ok) fail(`下载 ${pdbId} 失败：HTTP ${res.status}`);
  const text = await res.text();
  if (!text.includes("ATOM  ")) fail(`${pdbId} 内容异常（无 ATOM 记录）`);
  writeFileSync(file, text, "utf8");
  console.log(`· 已下载 ${pdbId}（${(text.length / 1024).toFixed(0)} KB）`);
  return text;
}

// ---------- PDB 解析 ----------
function parseAtomLine(l) {
  return {
    record: l.slice(0, 6).trim(),
    serial: l.slice(6, 11).trim(),
    name: l.slice(12, 16).trim(),
    altLoc: l.slice(16, 17).trim(),
    resName: l.slice(17, 20).trim(),
    chain: l.slice(21, 22).trim(),
    resSeq: parseInt(l.slice(22, 26), 10),
    x: parseFloat(l.slice(30, 38)),
    y: parseFloat(l.slice(38, 46)),
    z: parseFloat(l.slice(46, 54)),
    element: l.slice(76, 78).trim().toUpperCase() || guessElement(l.slice(12, 16).trim()),
    raw: l,
  };
}
function guessElement(atomName) {
  const t = atomName.replace(/[^A-Za-z]/g, "");
  return /^[NHOPSC]/.test(t) ? t[0] : "C";
}

/** 从 PDB 文本提取链、配体、水；header 元信息单独解析 */
function parsePdb(text, chain) {
  const protein = [];
  const het = new Map(); // resName -> atoms（仅目标链）
  const waters = [];
  const hetResNames = new Set();
  let method = null;
  let resolution = null;
  let organism = null;
  let title = null;

  for (const l of text.split("\n")) {
    const rec = l.slice(0, 6).trim();
    if (rec === "EXPDTA") method = l.slice(10, 80).trim();
    if (rec === "REMARK" && l.includes("RESOLUTION.")) {
      const m = l.match(/RESOLUTION\.\s+([\d.]+)\s+ANGSTROM/);
      if (m) resolution = parseFloat(m[1]);
    }
    if (rec === "COMPND") {
      if (l.includes("MOLECULE:") && title === null) title = l.slice(10, 80).trim();
    }
    if (rec === "SOURCE" && l.includes("ORGANISM_SCIENTIFIC:")) {
      if (organism === null) {
        const v = l.slice(10, 80).trim().replace(/;$/, "").split(":")[1];
        organism = v ? v.trim() : null;
      }
    }
    if (rec === "ATOM" || rec === "HETATM") {
      const a = parseAtomLine(l);
      if (a.altLoc && a.altLoc !== "A") continue;
      if (rec === "ATOM") {
        if (a.chain === chain) protein.push(a);
      } else {
        hetResNames.add(a.resName);
        if (a.resName === "HOH") {
          if (a.chain === chain) waters.push(a);
        } else if (a.chain === chain && a.resName === "NAD") {
          if (!het.has("NAD")) het.set("NAD", []);
          het.get("NAD").push(a);
        }
        // 其他 HETATM（EDO/GOL/SO4 等添加剂）一律不保留
      }
    }
  }
  // 标题行兜底：TITLE 第一行
  if (title === null) {
    for (const l of text.split("\n")) {
      if (l.startsWith("TITLE ")) { title = l.slice(10, 80).trim(); break; }
    }
  }
  return { protein, het, waters, hetResNames, method, resolution, organism, title };
}

// ---------- 几何计算（离线） ----------
function dist(a, b) {
  const dx = a.x - b.x, dy = a.y - b.y, dz = a.z - b.z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

function computePocket(protein, nadAtoms, waters) {
  // 口袋残基：重原子到 NAD 任一重原子 ≤ 4.5 Å
  const byResidue = new Map();
  for (const p of protein) {
    let best = Infinity;
    let bestNad = null;
    let bestH = Infinity; // 氢键候选：本蛋白 N/O 原子与 NAD N/O 原子的最小距离
    let bestHNad = null;
    const pIsNO = p.element === "N" || p.element === "O";
    for (const n of nadAtoms) {
      const d = dist(p, n);
      if (d < best) { best = d; bestNad = n; }
      if (pIsNO && (n.element === "N" || n.element === "O") && d < bestH) {
        bestH = d; bestHNad = n;
      }
    }
    if (best > POCKET_CUTOFF) continue;
    const key = p.resSeq;
    if (!byResidue.has(key)) {
      byResidue.set(key, {
        resi: p.resSeq, resn: p.resName, chain: p.chain,
        minDist: Infinity, hbond: false, closestPair: null,
      });
    }
    const e = byResidue.get(key);
    if (best < e.minDist) e.minDist = best;
    if (pIsNO && bestHNad && bestH <= HBOND_CUTOFF) {
      e.hbond = true;
      if (e.closestPair === null || bestH < e.closestPair.dist) {
        e.closestPair = {
          dist: bestH,
          prot: { name: p.name, resi: p.resSeq, resn: p.resName, chain: p.chain, x: p.x, y: p.y, z: p.z },
          nad: { name: bestHNad.name, resi: bestHNad.resSeq, resn: "NAD", chain: bestHNad.chain, x: bestHNad.x, y: bestHNad.y, z: bestHNad.z },
        };
      }
    }
  }

  const residues = [...byResidue.values()].map((e) => {
    let type;
    if (e.hbond) type = "hbond";
    else if (HYDROPHOBIC.has(e.resn)) type = "hydrophobic";
    else type = "contact";
    return {
      resi: e.resi, resn: e.resn, chain: e.chain,
      minDist: Math.round(e.minDist * 100) / 100,
      type,
      provenance: "computed",
    };
  }).sort((a, b) => a.resi - b.resi);

  // 氢键清单（供 3D 虚线渲染，坐标已算好）
  const hbonds = [];
  for (const e of byResidue.values()) {
    if (e.closestPair) {
      hbonds.push({
        dist: Math.round(e.closestPair.dist * 10) / 10,
        prot: e.closestPair.prot,
        nad: e.closestPair.nad,
        provenance: "computed",
      });
    }
  }

  const nearWaters = waters
    .filter((w) => nadAtoms.some((n) => dist(w, n) <= WATER_CUTOFF))
    .map((w) => w.resSeq);

  return { residues, hbonds, waters: [...new Set(nearWaters)].sort((a, b) => a - b) };
}

// ---------- NAD → SDF（V2000，键由共价半径距离推定，全部按单键书写） ----------
function writeSdf(nadAtoms) {
  const atoms = nadAtoms.map((a) => ({ ...a }));
  const bonds = [];
  for (let i = 0; i < atoms.length; i++) {
    for (let j = i + 1; j < atoms.length; j++) {
      const r1 = COVALENT_R[atoms[i].element] ?? 0.77;
      const r2 = COVALENT_R[atoms[j].element] ?? 0.77;
      if (dist(atoms[i], atoms[j]) <= (r1 + r2) * 1.15) bonds.push([i + 1, j + 1, 1]);
    }
  }
  const pad = (s, n) => String(s).padStart(n);
  const lines = [];
  lines.push("NAD");
  lines.push(`  RCSB1U8F  instance coordinates extracted offline; bonds inferred from covalent radii (all written as single)`);
  lines.push("");
  lines.push(`${pad(atoms.length, 3)}${pad(bonds.length, 3)}  0  0  0  0  0  0  0  0999 V2000`);
  for (const a of atoms) {
    lines.push(
      `${a.x.toFixed(4).padStart(10)}${a.y.toFixed(4).padStart(10)}${a.z.toFixed(4).padStart(10)} ` +
      `${a.element.padEnd(3, " ").padEnd(3)} 0  0  0  0  0  0  0  0  0  0  0  0`
    );
  }
  for (const [i, j, t] of bonds) lines.push(`${pad(i, 3)}${pad(j, 3)}${pad(t, 3)}  0  0  0`);
  lines.push("M  END");
  return lines.join("\n") + "\n";
}

// ---------- 组装单链 PDB（保留 HELIX/SHEET 供 cartoon 二级结构着色） ----------
function buildChainPdb(text, { protein, het, waters }) {
  const meta = [];
  for (const l of text.split("\n")) {
    const rec = l.slice(0, 6).trim();
    if (rec === "HELIX" || rec === "SHEET") meta.push(l.trimEnd());
  }
  const out = [];
  out.push("REMARK   1 TRIMMED BY build-step-assets.mjs (single chain, curated ligands only)");
  out.push(...meta);
  let lastSeq = -1;
  for (const a of protein) {
    if (a.resSeq !== lastSeq) { /* 残基切换无需特殊行 */ lastSeq = a.resSeq; }
    out.push(a.raw.trimEnd());
  }
  out.push("TER");
  for (const a of het.get("NAD") ?? []) out.push(a.raw.trimEnd());
  const waterSet = new Set(waters);
  for (const w of waterSet) out.push(w.raw.trimEnd());
  out.push("END");
  return out.join("\n") + "\n";
}

// ---------- 主流程 ----------
mkdirSync(join(ROOT, "public", "assets", "steps", STEP.id), { recursive: true });
const OUT = join(ROOT, "public", "assets", "steps", STEP.id);

const holoText = await download(STEP.holo.pdbId);
const apoText = await download(STEP.apo.pdbId);

const holo = parsePdb(holoText, STEP.holo.chain);
const apo = parsePdb(apoText, STEP.apo.chain);

const nad = holo.het.get("NAD");
if (!nad || nad.length === 0) fail(`${STEP.holo.pdbId} 链 ${STEP.holo.chain} 未找到 NAD 配体`);
console.log(`· ${STEP.holo.pdbId} 链 ${STEP.holo.chain}：蛋白 ${holo.protein.length} 原子，NAD ${nad.length} 原子；共晶配体种类：${[...holo.hetResNames].join(", ")}`);
console.log(`· ${STEP.apo.pdbId} 链 ${STEP.apo.chain}：蛋白 ${apo.protein.length} 原子；共晶配体种类：${[...apo.hetResNames].join(", ") || "无"}`);
if (apo.het.has("NAD")) fail(`${STEP.apo.pdbId} 意外含 NAD，请人工核查`);
if (!holo.method || !holo.resolution || !holo.organism) fail(`元信息解析不完整：method=${holo.method} resolution=${holo.resolution} organism=${holo.organism}`);

const pocket = computePocket(holo.protein, nad, holo.waters);
console.log(`· 口袋残基 ${pocket.residues.length} 个（hbond ${pocket.residues.filter((r) => r.type === "hbond").length} / hydrophobic ${pocket.residues.filter((r) => r.type === "hydrophobic").length} / contact ${pocket.residues.filter((r) => r.type === "contact").length}），氢键 ${pocket.hbonds.length} 条，展示水 ${pocket.waters.length} 个`);
if (pocket.residues.length === 0) fail("口袋残基为 0，判据或解析有误");

const holoPdb = buildChainPdb(holoText, { protein: holo.protein, het: holo.het, waters: holo.waters });
const apoPdb = buildChainPdb(apoText, { protein: apo.protein, het: new Map(), waters: [] });

const meta = {
  stepId: STEP.id,
  stepName: STEP.name,
  assetVersion: "1.0.0",
  generatedAt: new Date().toISOString().slice(0, 10),
  provenance: "computed",
  pocketCriteria: { distanceCutoffA: POCKET_CUTOFF, hbondCutoffA: HBOND_CUTOFF, waterCutoffA: WATER_CUTOFF },
  holo: {
    pdbId: STEP.holo.pdbId,
    organism: holo.organism,
    method: holo.method,
    resolution: holo.resolution,
    chain: STEP.holo.chain,
    atomCount: holo.protein.length + nad.length,
    proteinAtomCount: holo.protein.length,
    ligand: { id: "NAD", name: "烟酰胺腺嘌呤二核苷酸（NAD⁺/NADH 辅因子）" },
    cofactorOnly: true,
    note: STEP.note,
  },
  apo: {
    pdbId: STEP.apo.pdbId,
    organism: apo.organism ?? STEP.apo.organism,
    method: apo.method,
    resolution: apo.resolution,
    chain: STEP.apo.chain,
    atomCount: apo.protein.length,
    proteinAtomCount: apo.protein.length,
    ligand: null,
    note: "游离态（apo），无配体坐标。",
  },
};

writeFileSync(join(OUT, "holo.pdb"), holoPdb, "utf8");
writeFileSync(join(OUT, "apo.pdb"), apoPdb, "utf8");
writeFileSync(join(OUT, "ligand.sdf"), writeSdf(nad), "utf8");
writeFileSync(join(OUT, "pocket.json"), JSON.stringify(pocket, null, 2), "utf8");
writeFileSync(join(OUT, "meta.json"), JSON.stringify(meta, null, 2), "utf8");

// ---------- 体积报告 + 上限校验 ----------
console.log("\n资产体积报告（原始 / gzip）：");
let over = false;
for (const f of ["holo.pdb", "apo.pdb", "ligand.sdf", "pocket.json", "meta.json"]) {
  const buf = readFileSync(join(OUT, f));
  const gz = gzipSync(buf, { level: 9 });
  const kb = (buf.length / 1024).toFixed(1);
  const gzb = (gz.length / 1024).toFixed(1);
  const flag = gz.length > MAX_GZIP ? "  ← 超限！" : "";
  if (gz.length > MAX_GZIP) over = true;
  console.log(`  ${f.padEnd(12)} ${kb.padStart(8)} KB / ${gzb.padStart(8)} KB${flag}`);
}
if (over) fail("存在超过 5 MB（gzip）的资产，按约束退出");
console.log(`\n✓ ${STEP.id} 资产管线完成 → ${OUT}`);
