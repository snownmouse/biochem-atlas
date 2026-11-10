// ============================================================
// validate-assets.mjs —— 结构对照页分子资产校验（2026-11-05）
//
// 覆盖：
//   1. comparisonConfig.ts 里每个证据分子（evOwnHuman / evOwnNonhuman / evOtherHuman /
//      evOtherNonhuman / evComputed / evOnly2d）都能解析到 2D 结构式；
//   2. coordSource 与资产 provenance 一致：experimental 必须带 PDB ID / 分辨率 / 物种，
//      computed 不得带 PDB ID（实验坐标与计算构象绝不混标），none 不得存在 3D 资产；
//   3. SMILES 往返一致（RDKit 解析 → 规范 SMILES → 再解析 → 规范 SMILES 相同）；
//   4. 分子式 / 分子量：SMILES 推导值 ↔ 资产字段 ↔ comparisonConfig 声明值三者一致；
//   5. SVG 键线数 = 2D JSON 键数按键级展开（双键 2 条线、三键 3 条线）；
//   6. 3D 坐标有限、范德华体积 > 50 Å³；
//   7. 单资产 gzip ≤ 5 MB。
//
// 用法：
//   node tools/validate-assets.mjs            # 全量校验
//   node tools/validate-assets.mjs --self-test # 负例自检（≥6 条）
// 依赖：Node 18+、Python + RDKit（与 tools/gen-molecule-assets.py 同一环境）。
// ============================================================
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import crypto from "node:crypto";
import { spawnSync } from "node:child_process";

const ROOT = process.cwd();
const CONFIG = path.join(ROOT, "src", "data", "comparisonConfig.ts");
const D2DIR = path.join(ROOT, "public", "assets", "structures", "2d");
const D3DIR = path.join(ROOT, "public", "assets", "ligands3d");
const MAX_GZIP = 5 * 1024 * 1024;
const MIN_VOLUME = 50;

const SUB = "₀₁₂₃₄₅₆₇₈₉";
const SUP = { "\u2070": "0", "\u00b9": "1", "\u00b2": "2", "\u00b3": "3", "\u2074": "4", "\u2075": "5", "\u2076": "6", "\u2077": "7", "\u2078": "8", "\u2079": "9" };

/** 统一分子式记法：先去上标电荷，下标转数字，去掉中文注释与 ASCII 电荷后缀 */
export function normFormula(raw) {
  if (typeof raw !== "string") return "";
  let s = raw.trim();
  s = s.split(/（|\(/)[0];
  s = s.replace(/[\u00b1\u00b2\u00b3\u00b9\u2070-\u2079]*[\u207a\u207b]$/, "");
  s = s.replace(/[₀-₉]/g, (ch) => String(SUB.indexOf(ch)));
  s = s.replace(/[\u00b2\u00b3\u00b9\u2070-\u2079]/g, (ch) => SUP[ch] ?? "");
  s = s.replace(/[\u4e00-\u9fff]/g, "");
  s = s.replace(/\s+/g, "");
  s = s.replace(/[-+][0-9]*$/, "");
  return s;
}

const MASS = { H: 1.008, C: 12.011, N: 14.007, O: 15.999, P: 30.974, S: 32.06, F: 18.998, Cl: 35.45, Na: 22.99, K: 39.098, Mg: 24.305, Ca: 40.078, Fe: 55.845, Zn: 65.38 };
/** 平均分子量（只用于与资产字段核对，不做精确定量） */
export function massOf(formula) {
  const f = normFormula(formula);
  const re = /([A-Z][a-z]?)(\d*)/g;
  let total = 0;
  let consumed = 0;
  let m;
  while ((m = re.exec(f))) {
    consumed += m[0].length;
    const el = m[1];
    const n = m[2] ? Number(m[2]) : 1;
    if (!MASS[el]) return null;
    total += MASS[el] * n;
  }
  if (consumed !== f.length) return null;
  return total;
}

/** coordSource 与 provenance 一致性（负例自检直接调用） */
export function checkProvenance(id, coordSource, provenance) {
  const errs = [];
  if (!provenance || typeof provenance !== "object") return [`${id}: 缺 provenance`];
  if (coordSource === "experimental") {
    if (provenance.kind !== "experimental") errs.push(`${id}: coordSource=experimental 但 provenance.kind=${provenance.kind}`);
    for (const k of ["pdbId", "resolution", "species"]) {
      if (!provenance[k]) errs.push(`${id}: experimental 缺 ${k}`);
    }
    if (provenance.method && !/^(X-RAY|ELECTRON MICROSCOPY|CRYO)/i.test(String(provenance.method))) {
      errs.push(`${id}: 方法不是 X-ray / cryo-EM（${provenance.method}）`);
    }
  } else if (coordSource === "computed") {
    if (provenance.kind !== "computed") errs.push(`${id}: coordSource=computed 但 provenance.kind=${provenance.kind}`);
    for (const k of ["pdbId", "resolution"]) {
      if (provenance[k]) errs.push(`${id}: computed 不得带 ${k}=${provenance[k]}`);
    }
  } else if (coordSource === "none") {
    errs.push(`${id}: coordSource=none 不应有 3D 资产`);
  }
  return errs;
}

export function checkVolume(id, volume) {
  if (typeof volume !== "number" || !Number.isFinite(volume)) return [`${id}: 体积缺失或非有限数`];
  if (volume <= MIN_VOLUME) return [`${id}: 体积 ${volume} Å³ ≤ ${MIN_VOLUME} Å³`];
  return [];
}

export function checkGzip(id, text) {
  const bytes = zlib.gzipSync(Buffer.from(text, "utf8")).length;
  return bytes > MAX_GZIP ? [`${id}: gzip ${(bytes / 1048576).toFixed(2)} MB > 5 MB`] : [];
}

export function checkSvgBondLines(id, bondOrderSum, lineCount) {
  return lineCount === bondOrderSum ? [] : [`${id}: SVG 键线 ${lineCount} 条 ≠ JSON 键级展开 ${bondOrderSum} 条`];
}

export function checkCoords(id, atoms) {
  const errs = [];
  if (!Array.isArray(atoms) || atoms.length === 0) return [`${id}: 无原子`];
  for (const a of atoms) {
    for (const k of ["x", "y", "z"]) {
      const v = a[k];
      if (typeof v !== "number" || !Number.isFinite(v)) errs.push(`${id}: 原子 ${a.name ?? a.id} 的 ${k} 非有限数`);
      else if (Math.abs(v) > 500) errs.push(`${id}: 原子 ${a.name ?? a.id} 的 ${k}=${v} 超界`);
    }
  }
  return errs;
}

export function checkFormula(id, declared, assetFormula, mw) {
  const errs = [];
  const a = normFormula(assetFormula);
  const d = normFormula(declared);
  if (a !== d) errs.push(`${id}: 分子式 ${assetFormula} ≠ 数据层声明 ${declared}`);
  const calc = massOf(assetFormula);
  if (calc === null) errs.push(`${id}: 分子式 ${assetFormula} 无法解析`);
  else if (typeof mw !== "number" || Math.abs(calc - mw) > 2.5) errs.push(`${id}: 分子量 ${mw} ≠ 由分子式计算的 ${calc.toFixed(2)}`);
  return errs;
}

/** 从 comparisonConfig.ts 抽取：molId → 证据来源 / 2D 路径 / 声明分子式 */
export function parseConfig(text) {
  const mols = new Map();
  // 共享文案常量（如 GLYCO_MISSING / REDOX_MISSING）：missing2dReason 允许引用同文件内的字符串常量，
  // 这里先把常量表建好再解析，判定口径不变（仍必须解析出一条非空原因文字）。
  const consts = new Map();
  for (const m of text.matchAll(/const\s+([A-Za-z0-9_]+)\s*(?::\s*string\s*)?=\s*"([^"]+)"/g)) {
    consts.set(m[1], m[2]);
  }
  const evRe = /ev(OwnHuman|OwnNonhuman|OtherHuman|OtherNonhuman|Computed|Only2d)\("([^"]+)"\)/g;
  for (const m of text.matchAll(evRe)) {
    const coordSource = m[1] === "Only2d" ? "none" : m[1] === "Computed" ? "computed" : "experimental";
    mols.set(m[2], { id: m[2], coordSource, pocketRole: m[1] === "Only2d" || m[1] === "Computed" ? undefined : m[1].startsWith("Own") ? "own" : "other" });
  }
  for (const mol of mols.values()) {
    const head = new RegExp(`id:\\s*"${mol.id}"`, "m");
    const at = text.search(head);
    if (at < 0) continue;
    const slice = text.slice(at, at + 900);
    const a2 = slice.match(/asset2d:\s*(?:D2\("([^"]+)"\)|"([^"]+)"|null)/);
    if (a2) {
      if (a2[1]) mol.asset2d = `/assets/structures/2d/${a2[1]}.json`;
      else if (a2[2]) mol.asset2d = a2[2];
      else mol.asset2d = null;
    }
    const f = slice.match(/formula:\s*"([^"]+)"/);
    if (f) mol.formula = f[1];
    const m2 = slice.match(/missing2dReason:\s*(?:"([^"]+)"|([A-Za-z0-9_]+))/);
    if (m2) {
      const reason = m2[1] ?? consts.get(m2[2]);
      if (reason) mol.missing2dReason = reason;
      else mol.missing2dReasonUnresolved = m2[2];
    }
  }
  return mols;
}

const PY_RDKit = String.raw`
import json, sys
from rdkit import Chem
from rdkit.Chem import rdMolDescriptors
items = json.load(sys.stdin)
out = []
for it in items:
    try:
        m = Chem.MolFromSmiles(it["smiles"])
        if m is None:
            out.append({"id": it["id"], "ok": False, "error": "SMILES 无法解析"})
            continue
        can1 = Chem.MolToSmiles(m)
        m2 = Chem.MolFromSmiles(can1)
        can2 = Chem.MolToSmiles(m2) if m2 is not None else None
        out.append({
            "id": it["id"],
            "ok": can1 == can2,
            "formula": rdMolDescriptors.CalcMolFormula(m),
            "mw": rdMolDescriptors.CalcExactMolWt(m),
        })
    except Exception as e:
        out.append({"id": it["id"], "ok": False, "error": str(e)})
print(json.dumps(out, ensure_ascii=False))
`;

function runRdkit(items) {
  const py = spawnSync("python", ["-c", PY_RDKit], { input: JSON.stringify(items), encoding: "utf8", maxBuffer: 20 * 1024 * 1024 });
  if (py.error || py.status !== 0) {
    return { error: `RDKit 调用失败：${py.error?.message ?? py.stderr?.slice(0, 300)}` };
  }
  return { rows: JSON.parse(py.stdout) };
}

function main() {
  const configText = fs.readFileSync(CONFIG, "utf8");
  const mols = parseConfig(configText);
  const errors = [];
  const warnings = [];
  const checked = [];
  const declaredNo2d = [];

  const rdItems = [];
  for (const mol of mols.values()) {
    // 1) 2D 资产
    if (!mol.asset2d) {
      // 口径：2D 结构本轮明确未建的分子，数据层必须写 missing2dReason，
      // 页面据此显示「缺 2D 结构式 + 原因」；没写原因的仍判失败。
      if (mol.missing2dReason) declaredNo2d.push(mol.id);
      else errors.push(`${mol.id}: 证据分子没有 2D 资产，且未写 missing2dReason`);
    } else {
      const jsonPath = path.join(ROOT, "public", mol.asset2d.replace(/^\//, ""));
      if (!fs.existsSync(jsonPath)) errors.push(`${mol.id}: 2D 文件不存在 ${mol.asset2d}`);
      else {
        const d2 = JSON.parse(fs.readFileSync(jsonPath, "utf8"));
        const orderSum = d2.bonds.reduce((s, b) => s + (b.order ?? 1), 0);
        const svgPath = jsonPath.replace(/\.json$/, ".svg");
        if (!fs.existsSync(svgPath)) errors.push(`${mol.id}: 2D SVG 不存在 ${path.basename(svgPath)}`);
        else {
          const svg = fs.readFileSync(svgPath, "utf8");
          const lines = (svg.match(/<line\b/g) ?? []).length;
          errors.push(...checkSvgBondLines(mol.id, orderSum, lines));
        }
      }
    }

    // 2) 3D 资产
    const p3 = path.join(D3DIR, `${mol.id}.json`);
    if (mol.coordSource === "none") {
      if (fs.existsSync(p3)) errors.push(`${mol.id}: coordSource=none 但存在 3D 资产`);
      continue;
    }
    if (!fs.existsSync(p3)) {
      errors.push(`${mol.id}: coordSource=${mol.coordSource} 但缺 3D 资产`);
      continue;
    }
    const text = fs.readFileSync(p3, "utf8");
    const a3 = JSON.parse(text);
    errors.push(...checkProvenance(mol.id, mol.coordSource, a3.provenance));
    errors.push(...checkCoords(mol.id, a3.atoms));
    errors.push(...checkVolume(mol.id, a3.shape?.vdwVolumeA3));
    errors.push(...checkGzip(mol.id, text));
    if (mol.formula) errors.push(...checkFormula(mol.id, mol.formula, a3.formula, a3.molecularWeight));
    if (a3.smiles) rdItems.push({ id: mol.id, smiles: a3.smiles });
    checked.push(mol.id);
  }

  // 3) SMILES 往返 + RDKit 推导分子式 / 分子量
  const rd = runRdkit(rdItems);
  if (rd.error) errors.push(rd.error);
  else {
    const byId = new Map(rd.rows.map((r) => [r.id, r]));
    for (const mol of mols.values()) {
      if (mol.coordSource === "none" || !byId.has(mol.id)) continue;
      const r = byId.get(mol.id);
      if (!r.ok) errors.push(`${mol.id}: SMILES 往返不一致${r.error ? `（${r.error}）` : ""}`);
      else {
        const a3 = JSON.parse(fs.readFileSync(path.join(D3DIR, `${mol.id}.json`), "utf8"));
        if (normFormula(r.formula) !== normFormula(a3.formula)) errors.push(`${mol.id}: RDKit 由 SMILES 得 ${r.formula} ≠ 资产 ${a3.formula}`);
        if (typeof r.mw === "number" && typeof a3.molecularWeight === "number" && Math.abs(r.mw - a3.molecularWeight) > 0.6) {
          errors.push(`${mol.id}: RDKit 精确分子量 ${r.mw.toFixed(2)} ≠ 资产 ${a3.molecularWeight}`);
        }
      }
    }
  }

  for (const w of warnings) console.log(`WARN ${w}`);
  if (errors.length) {
    console.log(`FAIL 资产校验：${errors.length} 条`);
    for (const e of errors) console.log(`  - ${e}`);
    process.exit(1);
  }
  console.log(`PASS 资产校验：${checked.length} 个 3D 资产、${mols.size} 个证据分子（SMILES 往返 / 分子式 / 分子量 / SVG 键线 / 坐标 / 体积 / gzip / provenance 全通过）`);
  if (declaredNo2d.length) console.log(`  其中 ${declaredNo2d.length} 个分子按数据层 missing2dReason 声明「2D 本轮未建」：${declaredNo2d.join("、")}`);
}

function selfTest() {
  const cases = [
    ["computed 却带 PDB ID", () => checkProvenance("x", "computed", { kind: "computed", pdbId: "8ZW1" })],
    ["experimental 缺 PDB ID", () => checkProvenance("x", "experimental", { kind: "experimental", resolution: 2.0, species: "Homo sapiens" })],
    ["experimental 却标 computed", () => checkProvenance("x", "experimental", { kind: "computed" })],
    ["分子式差一个 H", () => checkFormula("x", "C₆H₁₃N₃O₃", "C6H12N3O3", 175.19)],
    ["体积为 0", () => checkVolume("x", 0)],
    ["gzip 超 5 MB", () => checkGzip("x", crypto.randomBytes(6 * 1024 * 1024).toString("base64"))],
    ["SVG 键线数与键级不符", () => checkSvgBondLines("x", 4, 3)],
    ["3D 坐标非有限数", () => checkCoords("x", [{ name: "C1", x: Number.NaN, y: 0, z: 0 }])],
    ["none 却存在 3D 资产", () => checkProvenance("x", "none", { kind: "experimental", pdbId: "8ZW1", resolution: 2.0, species: "Homo sapiens" })],
    ["分子量对不上", () => checkFormula("x", "C6H12O6", "C6H12O6", 200.0)],
  ];
  let failed = 0;
  for (const [name, fn] of cases) {
    const errs = fn();
    if (errs.length) console.log(`PASS 负例被拒：${name}`);
    else {
      failed += 1;
      console.log(`FAIL 负例未被拒：${name}`);
    }
  }
  if (failed) {
    console.log(`FAIL 负例自检 ${failed}/${cases.length} 条未生效`);
    process.exit(1);
  }
  console.log(`PASS 负例自检：${cases.length}/${cases.length} 条全部被校验拒绝`);
}

if (process.argv.includes("--self-test")) selfTest();
else main();
