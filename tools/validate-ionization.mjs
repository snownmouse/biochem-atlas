// ============================================================
// validate-ionization.mjs —— 生理 pH 7.4 电离态口径校验
//
// 做四件事：
//   1) 规则表自检：每条规则必须有电荷与 pKa 依据；关键分子的目标电荷/分子式逐条命中；
//   2) 从 3D 资产的原子/键/电荷**独立推算**分子式（隐式氢规则），与资产 formula、
//      数据层 part.formula 三方比对；
//   3) 跨通路一致性：同一实体（g6p↔g6p-g6pd、f6p↔f6p-gn、fbp↔fbp-linear↔fbp-gn、
//      pyr↔pyr-gn、6pg↔6pg-l、ru5p↔ru5p-i）必须得到完全相同的分子式字符串；
//   4) 2D/3D 资产一致（重原子元素计数、净电荷、键级计数）+ 打印「分子 × 通路」全量对照表；
//   5) 尿素循环数据层（无 3D 资产）：按 pKa 推导表逐分子核对电荷/分子式/chargeBasis，
//      并内置负例自检（瓜氨酸改回 −1 必须报错）。
//
// 用法：node tools/validate-ionization.mjs
// 非零退出 = 有任一项不一致。
// ============================================================
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const P3D = join(ROOT, "public", "assets", "ligands3d");
const P2D = join(ROOT, "public", "assets", "structures", "2d");
const PATHWAYS = ["glycolysis", "tca", "ppp", "gluconeogenesis", "fatty-acid-oxidation", "urea-cycle"];

let failed = false;
const ok = (label, cond, detail = "") => {
  if (!cond) failed = true;
  console.log(`${cond ? "✓" : "✗"} ${label}${detail && !cond ? `  ← ${detail}` : ""}`);
};

// ---------- 规则表（自检对象） ----------
const RULES = [
  { key: "phosphate_monoester", group: "磷酸单酯", charge: -2, pKa: "pKa1 ≈ 1–2；pKa2 ≈ 6.3–7.2" },
  { key: "acyl_phosphate", group: "酰基磷酸（混酐）", charge: -2, pKa: "pKa ≈ 3.5–4.5（强酸）" },
  { key: "enol_phosphate", group: "烯醇磷酸", charge: -2, pKa: "按磷酸单酯 pKa2 ≈ 6.3" },
  { key: "carboxyl", group: "羧酸", charge: -1, pKa: "pKa ≈ 4.8" },
  { key: "carboxyl_amino_acid", group: "氨基酸 α-羧基", charge: -1, pKa: "pKa ≈ 2.0–2.4" },
  { key: "guanidinium", group: "胍基（精氨酸/精氨酸琥珀酸）", charge: +1, pKa: "pKa ≈ 12.5" },
  { key: "amide_n", group: "酰胺/脲基 N", charge: 0, pKa: "pKa ≈ 0.1（7.4 下不电离）" },
  { key: "thioester", group: "硫酯", charge: 0, pKa: "pKa > 13（7.4 下不电离）" },
  { key: "amino_acid_n", group: "氨基酸 α-氨基", charge: +1, pKa: "pKa ≈ 9.0–9.7" },
  { key: "quaternary_n", group: "季铵/肉碱", charge: +1, pKa: "pKa 不适用（永久电荷，不随 pH 变）" },
  { key: "hydroxyl", group: "醇/酚", charge: 0, pKa: "pKa 10–17" },
  { key: "carbonate", group: "碳酸氢根/CO₂", charge: -1, pKa: "H₂CO₃ pKa1 ≈ 6.35" },
];

// ---------- 化学工具 ----------
// Unicode 下标 U+2080–U+2089 → ASCII 数字（按码点逐字符转换，避免正则转义歧义）
const ascii = (s) =>
  Array.from(String(s), (c) => {
    const cp = c.codePointAt(0);
    return cp >= 0x2080 && cp <= 0x2089 ? String(cp - 0x2080) : c;
  }).join("");

function normFormula(raw) {
  if (!raw) return null;
  let s = ascii(raw)
    .replace(/（[^）]*）/g, "")
    .replace(/\([^)]*\)/g, "")
    .replace(/片段|分块显示/g, "")
    .replace(/^\s*两个\s*/, "")
    .replace(/[⁻⁺·\s]/g, "");
  return s || null;
}

function formulaMap(s) {
  const m = {};
  for (const [, el, n] of s.matchAll(/([A-Z][a-z]?)(\d*)/g)) {
    m[el] = (m[el] ?? 0) + (n ? Number(n) : 1);
  }
  return m;
}

function canonical(map) {
  const order = ["C", "H"];
  const rest = Object.keys(map).filter((e) => !order.includes(e) && map[e]).sort();
  return [...order, ...rest]
    .filter((e) => (map[e] ?? 0) > 0)
    .map((e) => `${e}${map[e] > 1 ? map[e] : ""}`)
    .join("");
}

function parseCharge(c) {
  if (c === undefined || c === null || c === "" || c === 0 || c === "0") return 0;
  if (typeof c === "number") return c;
  const s = String(c).replace(/−/g, "-");
  const sign = s.includes("-") ? -1 : 1;
  const n = Number((s.match(/\d+/) ?? ["1"])[0]);
  return sign * n;
}

const VALENCE = { C: 4, N: 3, O: 2, S: 2, P: 5 };

/** 只从重原子 + 键级 + 形式电荷推算分子式（隐式氢） */
function derivedFromAsset(asset) {
  const nbrs = new Map();
  for (const b of asset.bonds ?? []) {
    if (!nbrs.has(b.a)) nbrs.set(b.a, []);
    if (!nbrs.has(b.b)) nbrs.set(b.b, []);
    nbrs.get(b.a).push({ other: b.b, order: b.order ?? 1 });
    nbrs.get(b.b).push({ other: b.a, order: b.order ?? 1 });
  }
  const map = {};
  let charge = 0;
  for (const a of asset.atoms ?? []) {
    const q = parseCharge(a.charge);
    charge += q;
    let v = VALENCE[a.el] ?? 0;
    if (a.el === "O" && q === -1) v = 1;
    else if (a.el === "N" && q === -1) v = 2;
    else if (a.el === "N" && q === +1) v = 4;
    else if (a.el === "S" && q === -1) v = 1;
    const bo = (nbrs.get(a.id) ?? []).reduce((x, y) => x + y.order, 0);
    map[a.el] = (map[a.el] ?? 0) + 1;
    map.H = (map.H ?? 0) + Math.max(0, v - bo);
  }
  return { formula: canonical(map), charge };
}

function bondProfile(asset) {
  const c = { 1: 0, 2: 0, 3: 0 };
  for (const b of asset.bonds ?? []) c[b.order ?? 1] = (c[b.order ?? 1] ?? 0) + 1;
  return `1:${c[1]} 2:${c[2]}${c[3] ? ` 3:${c[3]}` : ""}`;
}

function elementProfile(asset) {
  const m = {};
  for (const a of asset.atoms ?? []) m[a.el] = (m[a.el] ?? 0) + 1;
  return canonical(m).replace(/H\d*/, "");
}

// ---------- 读资产 ----------
const asset3d = new Map();
for (const f of readdirSync(P3D).filter((x) => x.endsWith(".json"))) {
  const id = f.replace(/\.json$/, "");
  asset3d.set(id, JSON.parse(readFileSync(join(P3D, f), "utf8")));
}
const asset2dCache = new Map();
function get2d(id) {
  if (asset2dCache.has(id)) return asset2dCache.get(id);
  const p = join(P2D, `${id}.json`);
  const v = existsSync(p) ? JSON.parse(readFileSync(p, "utf8")) : null;
  asset2dCache.set(id, v);
  return v;
}

// ---------- 读配置（esbuild 内存打包，不留临时文件） ----------
const built = await build({
  entryPoints: [join(ROOT, "src", "data", "comparisonConfig.ts")],
  bundle: true,
  write: false,
  format: "esm",
  platform: "node",
});
const cfgMod = await import(`data:text/javascript;base64,${Buffer.from(built.outputFiles[0].text).toString("base64")}`);

// ---------- 1) 规则表自检 ----------
console.log("=== 1) 规则表自检 ===");
for (const r of RULES) {
  ok(`规则 ${r.group}：电荷 ${r.charge > 0 ? "+" : ""}${r.charge}，依据 ${r.pKa}`,
     Number.isInteger(r.charge) && Boolean(r.pKa) && r.pKa.includes("pKa"));
}

// 关键分子的目标值（分子式按规则记账后的唯一结果）
const EXPECT = {
  // 磷酸单酯 / 二价阴离子
  g6p: [-2, "C6H11O9P"], "g6p-g6pd": [-2, "C6H11O9P"],
  f6p: [-2, "C6H11O9P"], "f6p-gn": [-2, "C6H11O9P"],
  dhap: [-2, "C3H5O6P"], gap: [-2, "C3H5O6P"],
  "3pg": [-3, "C3H4O7P"], "2pg": [-3, "C3H4O7P"],
  "6pgl": [-2, "C6H9O9P"], "6pg": [-3, "C6H10O10P"], "6pg-l": [-3, "C6H10O10P"],
  r5p: [-2, "C5H9O8P"], ru5p: [-2, "C5H9O8P"], "ru5p-i": [-2, "C5H9O8P"],
  xu5p: [-2, "C5H9O8P"], s7p: [-2, "C7H13O10P"], e4p: [-2, "C4H7O7P"],
  fbp: [-4, "C6H10O12P2"], "fbp-linear": [-4, "C6H10O12P2"], "fbp-gn": [-4, "C6H10O12P2"],
  // 酰基磷酸 + 单酯
  bpg13: [-4, "C3H4O10P2"],
  // 烯醇磷酸 + 羧酸
  pep: [-3, "C3H2O6P"],
  // 羧酸一价阴离子
  pyr: [-1, "C3H3O3"], "pyr-gn": [-1, "C3H3O3"], lac: [-1, "C3H5O3"],
  oaa: [-2, "C4H2O5"], cit: [-3, "C6H5O7"], icit: [-3, "C6H5O7"],
  akg: [-2, "C5H4O5"], suc: [-2, "C4H4O4"], fum: [-2, "C4H2O4"], mal: [-2, "C4H4O5"],
  fa: [-1, "C16H31O2"],
  // 硫酯 + CoA 片段
  accoa: [0, "C3H6OS"], succoa: [-1, "C5H7O3S"],
  "acylcoa-c16": [0, null], "enoyl-c16": [0, null], "hydroxy-c16": [0, null],
  "keto-c16": [0, null], "acylcoa-c14": [0, null],
  acylcarn: [0, null], carn: [0, null],
  // 糖 / 氨基酸 / 碳酸
  glc: [0, "C6H12O6"],
  glu: [-1, "C5H8NO4"],
  ala: [0, "C3H7NO2"], // 口径选择：中性式（与两性离子分子式相同，净 0）
};

for (const [id, [charge, formula]] of Object.entries(EXPECT)) {
  const a = asset3d.get(id);
  if (!a) { ok(`目标值 ${id} 有 3D 资产`, false, "资产缺失"); continue; }
  const d = derivedFromAsset(a);
  const formulaOk = formula === null || d.formula === formula;
  ok(`目标值 ${id}：净电荷 ${charge}、结构推算 ${d.formula}${formula ? `（期望 ${formula}）` : ""}`,
     d.charge === charge && formulaOk, `电荷 ${d.charge} / 式 ${d.formula}`);
}

// ---------- 2) 数据层 / 3D / 2D 一致性 ----------
console.log("\n=== 2) 数据层 ↔ 资产一致性 ===");
const rows = [];
const formulaByEntity = new Map();
const ENTITY = {
  "g6p": "G6P", "g6p-g6pd": "G6P",
  "f6p": "F6P", "f6p-gn": "F6P",
  fbp: "FBP", "fbp-linear": "FBP", "fbp-gn": "FBP",
  pyr: "PYR", "pyr-gn": "PYR",
  "6pg": "6PG", "6pg-l": "6PG",
  ru5p: "Ru5P", "ru5p-i": "Ru5P",
};

for (const pid of PATHWAYS) {
  const cfg = cfgMod.comparisonConfigFor(pid);
  for (const step of cfg.steps) {
    for (const sideKey of ["substrate", "product"]) {
      const side = step[sideKey];
      if (!side) continue;
      for (const part of side.parts ?? []) {
        const raw = part.formula;
        const nf = normFormula(raw);
        if (!nf) continue;
        const a3 = asset3d.get(part.id);
        const d = a3 ? derivedFromAsset(a3) : null;
        const a3f = a3 ? a3.formula : null;
        const a2id = (part.asset2d ?? "").split("/").pop()?.replace(/\.json$/, "") ?? null;
        const a2 = a2id ? get2d(a2id) : null;
        const d2 = a2 ? derivedFromAsset(a2) : null;

        const cfgCanon = canonical(formulaMap(nf));
        const good = (!a3 || (cfgCanon === canonical(formulaMap(a3f)) && cfgCanon === d.formula)) &&
          (!a2 || (cfgCanon === d2.formula && (a3 ? d.charge === d2.charge : true)));
        ok(
          `${pid} ${step.stepId} ${sideKey} ${part.id}：数据层 ${nf} / 3D ${a3f ?? "—"} / 推算 ${d?.formula ?? "—"} / 2D ${d2?.formula ?? "—"}`,
          good,
          !good ? "三方不一致" : "",
        );

        rows.push({
          entity: ENTITY[part.id] ?? part.id,
          id: part.id,
          pathways: pid,
          step: step.stepId,
          side: sideKey === "substrate" ? "底物" : "产物",
          cfg: nf,
          a3: a3f ?? "—",
          derived: d?.formula ?? "—",
          charge: d?.charge ?? "—",
          a2: d2?.formula ?? "—",
          a2charges: a2 ? d2.charge : "—",
          a2heavy: a2 ? elementProfile(a2) : "—",
          a3heavy: a3 ? elementProfile(a3) : "—",
          bond: a2 && a3 ? bondProfile(a2) === bondProfile(a3) : null,
        });

        if (!formulaByEntity.has(rows.at(-1).entity)) formulaByEntity.set(rows.at(-1).entity, new Map());
        const m = formulaByEntity.get(rows.at(-1).entity);
        if (!m.has(cfgCanon)) m.set(cfgCanon, []);
        m.get(cfgCanon).push(`${pid}/${step.stepId}/${sideKey}`);
      }
    }
  }
}

// ---------- 3) 跨通路一致性 ----------
console.log("\n=== 3) 跨通路分子式一致性 ===");
for (const [entity, m] of formulaByEntity) {
  const forms = [...m.keys()].filter((x) => x !== "—");
  ok(
    `${entity}：${forms.length === 1 ? forms[0] : `出现 ${forms.length} 种写法`}`,
    forms.length <= 1,
    [...m.entries()].map(([f, where]) => `${f} @ ${where.join(",")}`).join(" | "),
  );
}

// ---------- 4) 2D/3D 资产一致（元素/电荷/键级） ----------
console.log("\n=== 4) 2D/3D 资产一致 ===");
const seen = new Set();
let assetBad = 0;
for (const r of rows) {
  const key = `${r.id}`;
  if (seen.has(key) || r.a2 === "—" || r.a3 === "—") continue;
  seen.add(key);
  const heavyOk = r.a2heavy === r.a3heavy;
  const chOk = r.a2charges === r.charge;
  const bondOk = r.bond === true;
  if (!(heavyOk && chOk && bondOk)) assetBad++;
  ok(
    `${r.id}：重原子 2D=${r.a2heavy} / 3D=${r.a3heavy}；净电荷 2D=${r.a2charges} / 3D=${r.charge}；键级 ${bondOk ? "一致" : "不同"}`,
    heavyOk && chOk && bondOk,
  );
}
console.log(assetBad === 0 ? `2D/3D 逻辑一致（${seen.size} 个分子）` : `有 ${assetBad} 个分子 2D/3D 不一致`);

// ---------- 5) 全量「分子 × 通路」对照表 ----------
console.log("\n=== 5) 全量「分子 × 通路」对照表 ===");
const pad = (s, n) => String(s).padEnd(n);
console.log(
  `${pad("实体", 8)}${pad("id", 14)}${pad("通路/步/侧", 34)}${pad("数据层", 12)}${pad("3D", 12)}${pad("推算", 12)}${pad("电荷", 5)}${pad("2D", 12)}`,
);
for (const r of rows) {
  console.log(
    `${pad(r.entity, 8)}${pad(r.id, 14)}${pad(`${r.pathways}/${r.step}/${r.side}`, 34)}${pad(r.cfg, 12)}${pad(r.a3, 12)}${pad(r.derived, 12)}${pad(r.charge, 5)}${pad(r.a2, 12)}`,
  );
}

// ---------- 6) 侧面 formula 与 parts 汇总一致（片段/完整 CoA 例外单列） ----------
console.log("\n=== 6) side.formula ↔ parts 汇总 ===");
for (const pid of PATHWAYS) {
  const cfg = cfgMod.comparisonConfigFor(pid);
  for (const step of cfg.steps) {
    for (const sideKey of ["substrate", "product"]) {
      const side = step[sideKey];
      const parts = side.parts ?? [];
      if (!parts.length) continue;
      const hasFragment = parts.some((p) => /片段/.test(p.formula ?? ""));
      if (hasFragment) {
        console.log(`· ${pid}/${step.stepId}/${sideKey}：含 CoA 片段，side.formula 用完整 CoA 注记（有意例外）`);
        continue;
      }
      const want = [];
      for (const p of parts) {
        const n = normFormula(p.formula);
        if (!n) continue;
        // 一个 part 内可能并列多个分子（尿素循环把“NH₃ + HCO₃⁻”放在同一块），按 + 展开后再比
        for (const piece of n.split("+")) {
          if (piece.trim()) want.push(canonical(formulaMap(piece)));
        }
      }
      const raw = normFormula(side.formula) ?? "";
      let got;
      if (/^两个/.test(side.formula ?? "")) {
        const x = canonical(formulaMap(raw));
        got = [x, x];
      } else {
        got = raw.split("+").map((x) => canonical(formulaMap(x))).filter(Boolean);
      }
      const same = want.length === got.length && want.every((v, i) => v === got[i]);
      ok(`${pid}/${step.stepId}/${sideKey}：side ${side.formula} = parts ${parts.map((p) => p.formula).join(" + ")}`, same);
    }
  }
}

// ---------- 7) 尿素循环数据层电离态（pKa 推导，无 3D 资产） ----------
console.log("\n=== 7) 尿素循环电离态（pKa 推导） ===");
// 此表的值由 pKa 推导，不由人工估计：羧酸 pKa≈2 → COO⁻；α-氨基 pKa≈9–10 → NH₃⁺；
// 胍基 pKa≈12.5 → +1；酰基磷酸/磷酸单酯 pKa₂≈6.3–7.2 → −2；酰胺 N 不电离 → 0。
// 键 = [净电荷, 分子式（ASCII，不含电荷符号）]。
// 尿素循环没有 3D 资产，所以不走 EXPECT 的资产推算路径，直接核对 urea.json 数据层。
const UREA_EXPECT = {
  carbamoylP: [-2, "CH2NO5P"],
  citrulline: [0, "C6H13N3O3"],          // 两性离子：COO⁻ + NH₃⁺
  argininosuccinate: [-1, "C10H17N4O6"], // 3 个游离羧基 −3；α-NH₃⁺ +1；胍基 +1
  arginine: [+1, "C6H15N4O2"],
  urea: [0, "CH4N2O"],
  fumarate: [-2, "C4H2O4"],
  ornithine: [+1, "C5H13N2O2"],
  asp: [-1, "C4H6NO4"],
  hco3: [-1, "CHO3"],
};

// 基团清单基线：数字对不等于结构对。每个分子必须与这张结构基线逐项一致。
// 例：精氨酸琥珀酸 = 3 个游离羧基（Arg α、Asp α、Asp β）+ 1 个 Arg α-氨基 + 1 个胍基；
// 若误把 Asp β-羧基当成酰胺、把 Asp α-氨基当成游离氨基，即使净电荷仍凑成 −1，也必须报错。
const UREA_GROUP_CHARGE = {
  carboxyl: -1,
  "alpha-amino": +1,
  guanidinium: +1,
  "amide-N": 0,
  "acyl-phosphate": -2,
  bicarbonate: -1,
};
const UREA_GROUPS = {
  carbamoylP: { "amide-N": 1, "acyl-phosphate": 1 },
  citrulline: { carboxyl: 1, "alpha-amino": 1, "amide-N": 2 },
  argininosuccinate: { carboxyl: 3, "alpha-amino": 1, guanidinium: 1 },
  arginine: { carboxyl: 1, "alpha-amino": 1, guanidinium: 1 },
  urea: { "amide-N": 2 },
  fumarate: { carboxyl: 2 },
  ornithine: { carboxyl: 1, "alpha-amino": 2 },
  asp: { carboxyl: 2, "alpha-amino": 1 },
  hco3: { bicarbonate: 1 },
};

function checkUreaIonization(data) {
  const errors = [];
  const byId = new Map((data.entities ?? []).map((e) => [e.id, e]));
  for (const [id, [wantCharge, wantFormula]] of Object.entries(UREA_EXPECT)) {
    const e = byId.get(id);
    if (!e) { errors.push(`${id} 实体缺失`); continue; }
    const nf = normFormula(e.formula);
    if (canonical(formulaMap(nf ?? "")) !== wantFormula) errors.push(`${id} 分子式 ${nf} ≠ ${wantFormula}`);
    // 只取 description 的头部电荷，避免把括号内的“−1 / +1”当成净电荷
    const headCharge = parseCharge(String(e.ionization ?? "").replace(/（.*$/, "").replace(/\(.*$/, "").trim());
    if (headCharge !== wantCharge) errors.push(`${id} 电荷 ${headCharge} ≠ ${wantCharge}`);
    if (!e.chargeBasis) { errors.push(`${id} 缺 chargeBasis`); continue; }
    const terms = [...String(e.chargeBasis).matchAll(/[（(]\s*([+−-]?\d+)\s*[）)]/g)].map((m) => parseCharge(m[1]));
    const sum = terms.reduce((a, b) => a + b, 0);
    if (terms.length === 0) errors.push(`${id} chargeBasis 无可解析的逐项电荷`);
    else if (sum !== wantCharge) errors.push(`${id} chargeBasis 求和 ${sum} ≠ ${wantCharge}`);

    // 基团清单 vs 结构基线：防止“净电荷凑对、基团清单写错”
    const base = UREA_GROUPS[id] ?? {};
    const declared = new Map();
    for (const g of e.ionizableGroups ?? []) {
      if (!(g.group in UREA_GROUP_CHARGE)) { errors.push(`${id} 未知可电离基团 ${g.group}`); continue; }
      if (g.chargePerGroup !== UREA_GROUP_CHARGE[g.group]) {
        errors.push(`${id} ${g.group} 单基团电荷 ${g.chargePerGroup} ≠ ${UREA_GROUP_CHARGE[g.group]}`);
      }
      declared.set(g.group, (declared.get(g.group) ?? 0) + g.count);
    }
    for (const [g, n] of Object.entries(base)) {
      if ((declared.get(g) ?? 0) !== n) errors.push(`${id} ${g} 数量 ${declared.get(g) ?? 0} ≠ 结构基线 ${n}`);
      declared.delete(g);
    }
    for (const [g, n] of declared) errors.push(`${id} 多出结构基线外的基团 ${g}×${n}`);
    const groupSum = (e.ionizableGroups ?? []).reduce((s, g) => s + g.count * g.chargePerGroup, 0);
    if (groupSum !== wantCharge) errors.push(`${id} 基团清单求电荷 ${groupSum} ≠ ${wantCharge}`);
  }
  return errors;
}

const ureaData = JSON.parse(readFileSync(join(ROOT, "src", "data", "urea-cycle", "urea.json"), "utf8"));
ok(
  "urea.json 声明电离态由 pKa 推导、不由人工估计",
  /pKa/.test(ureaData.ionizationConvention ?? "") && /不由人工估计/.test(ureaData.ionizationConvention ?? ""),
);
const ureaErrors = checkUreaIonization(ureaData);
ok(
  `urea.json ${Object.keys(UREA_EXPECT).length} 个分子：电荷 / 分子式 / chargeBasis 逐项一致`,
  ureaErrors.length === 0,
  ureaErrors.join("；"),
);

// 负例自检：把瓜氨酸改回上一轮错误的 −1（分子式、电荷、推导式三项自洽但化学错误），必须报错。
const badUrea = JSON.parse(JSON.stringify(ureaData));
const badCit = badUrea.entities.find((e) => e.id === "citrulline");
badCit.formula = "C₆H₁₂N₃O₃⁻";
badCit.ionization = "−1";
badCit.chargeBasis = "COO⁻(−1) = −1";
const badErrors = checkUreaIonization(badUrea);
ok("负例被抓：瓜氨酸改回 −1 时校验报错", badErrors.length > 0, badErrors.join("；"));

// 负例自检：精氨酸琥珀酸写成“2 个游离羧基 + Asp β-羧基成酰胺 + 胍基”，
// 净电荷与 chargeBasis 求和都仍是 −1，但基团清单与结构不符（少 1 个羧基、少 Arg α-氨基），必须报错。
const badAS = JSON.parse(JSON.stringify(ureaData));
const badASE = badAS.entities.find((e) => e.id === "argininosuccinate");
badASE.chargeBasis = "2×COO⁻(−2) + 酰胺 N(0) + 胍基(+1) = −1";
badASE.ionizableGroups = [
  { group: "carboxyl", count: 2, chargePerGroup: -1, pKa: "≈2" },
  { group: "amide-N", count: 1, chargePerGroup: 0, pKa: "β-羧基成酰胺" },
  { group: "guanidinium", count: 1, chargePerGroup: 1, pKa: "≈12.5" },
];
const badASErrors = checkUreaIonization(badAS);
ok("负例被抓：精氨酸琥珀酸净电荷 −1 但基团清单不符结构", badASErrors.length > 0, badASErrors.join("；"));

console.log(failed ? "\n✗ 电离态口径校验失败" : "\n✓ 电离态口径校验全部通过");
process.exit(failed ? 1 : 0);
