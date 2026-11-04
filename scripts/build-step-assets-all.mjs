// 全步骤 3D 结合视图离线资产管线：gk-1..gk-10 中除 gk-6 外的 9 步 + 2 个器官变体。
// gk-6（GAPDH）由 build-step-assets.mjs 负责，此处不重做，仅读其 meta.json 进 manifest。
// 零第三方依赖（Node ≥ 18），幂等可重复执行；--refresh 强制重新下载；--only gk-3 单步重跑。
// 产出 public/assets/steps/<dir>/：holo.pdb / apo.pdb(two-state 才有) / ligand[-ID].sdf / pocket.json / meta.json
// 并汇总 public/assets/steps/manifest.json（与 src/data/stepAssets.ts 字段兼容并扩展）。
//
// 运行时零计算原则：口袋残基、氢键、水、相互作用类型全部在此离线算完。
//
// 链选择规则（可复现，R1–R4）：
//   R1 候选链 = 含 ≥30 个氨基酸残基的蛋白链（含修饰残基）。
//   R2 主链 = 承载"保留配体"重原子数最多的链；并列取蛋白原子多者，再并列取链名字典序最小。
//   R3 附加链依次满足任一条件即保留（循环至不再新增）：
//      (a) 该链承载了已保留链集合中没有的保留配体 resName（不同位点承载不同配体，如 3UCD A 链 2PG / B 链 PEP）；
//      (b) 该链有 ≥3 个口袋残基（残基重原子到"口袋相关"配体实例 ≤4.5 Å）——二聚体界面口袋（如 TPI/PGI/PGAM）。
//   R4 apo 链数 = holo 保留链数；按蛋白原子数降序、链名字典序升序取前 N。
//   多链都承载同一保留配体的等价副本（如 8W2G 四聚体）时，(a) 不触发，避免整装输出。
//
// 口袋相关配体实例规则：以主配体（config.primaryLigand）的"第一实例"（文件中最小 atom serial）质心为锚，
//   质心距 ≤12 Å 的保留配体实例参与口袋判定；其余保留配体（变构位点等价副本、远端变构配体）输出到坐标
//   与 SDF 清单，但不参与 pocket.json（meta.ligands[].pocketRelevant 如实记录）。
import { mkdirSync, readFileSync, writeFileSync, existsSync, statSync } from "node:fs";
import { gzipSync } from "node:zlib";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const CACHE = join(ROOT, "scripts", "cache", "pdb");
const OUTBASE = join(ROOT, "public", "assets", "steps");
const REFRESH = process.argv.includes("--refresh");
const ONLY = (() => {
  const i = process.argv.indexOf("--only");
  return i >= 0 ? process.argv[i + 1] : null;
})();
const MAX_GZIP = 5 * 1024 * 1024; // 单资产 gzip 上限（与项目硬约束一致）
const POCKET_CUTOFF = 4.5; // 口袋残基判据：重原子到相关配体最近距离 ≤ 4.5 Å
const HBOND_CUTOFF = 3.5; // 氢键判据：N/O–N/O 距离 ≤ 3.5 Å
const WATER_CUTOFF = 8.0; // 展示的结晶水：到相关配体 ≤ 8 Å
const POCKET_LIGAND_RADIUS = 12.0; // 口袋相关实例判据：质心距主配体第一实例 ≤ 12 Å
const INTERFACE_MIN_RESIDUES = 3; // R3(b) 界面链最少口袋残基数
const HYDROPHOBIC = new Set(["ALA", "VAL", "LEU", "ILE", "PHE", "MET", "TRP", "PRO", "CYS", "GLY"]);
const COVALENT_R = { H: 0.31, C: 0.76, N: 0.71, O: 0.66, P: 1.07, S: 1.05, MG: 1.39, K: 2.03, NA: 1.66, CL: 1.02, F: 0.57 };

function fail(msg) {
  console.error(`[build-step-assets-all] 失败：${msg}`);
  process.exit(1);
}

// ---------- 全局替身/添加剂滤除策略（所有 holo/apo 条目共用） ----------
const GLOBAL_FILTER = {
  EDO: ["artifact", "乙二醇，结晶防冻添加剂"],
  GOL: ["artifact", "甘油，结晶添加剂"],
  PG4: ["artifact", "四聚乙二醇（PEG 片段），结晶添加剂"],
  PEG: ["artifact", "聚乙二醇，结晶添加剂"],
  MES: ["artifact", "MES 缓冲液成分"],
  SO4: ["artifact", "硫酸根，结晶添加剂（可能占据磷酸位点，但不构成底物证据）"],
  PO4: ["artifact", "无机磷酸，结晶添加剂（非底物态证据）"],
  CL: ["artifact", "氯离子，结晶添加剂"],
  NA: ["artifact", "钠离子，结晶添加剂"],
  ACT: ["artifact", "乙酸根，缓冲成分"],
  CIT: ["artifact", "柠檬酸根，缓冲/结晶成分"],
  FLC: ["artifact", "柠檬酸铁铵混合物成分，结晶添加剂"],
  MPD: ["artifact", "2-甲基-2,4-戊二醇，结晶添加剂"],
  DMS: ["artifact", "DMSO，添加剂"],
  TRS: ["artifact", "Tris 缓冲液成分"],
  EPE: ["artifact", "HEPES 缓冲液成分"],
  BME: ["artifact", "β-巯基乙醇，还原剂添加剂"],
  MRD: ["artifact", "甲基戊二醇，结晶添加剂"],
  OXL: ["analog", "草酸，PEP/丙酮酸类似物（替身配体），非真实底物"],
  PGA: ["analog", "2-磷酸乙醇酸，TPI 抑制剂/类似物（替身配体）"],
  ANP: ["analog", "AMP-PNP，不可水解 ATP 类似物（替身配体）"],
  AGS: ["analog", "AMP-胍基磷酸类似物（替身配体）"],
  MGF: ["analog", "氟化镁过渡态模拟体系（替身配体）"],
  MRK: ["analog", "合成葡萄糖激酶激活剂（GKA 药物分子），非内源配体"],
  G3P: ["analog", "PDB 代码 G3P = sn-甘油-3-磷酸，并非糖酵解中间物甘油醛-3-磷酸（常见误标陷阱），不保留"],
};

// ---------- 步骤配置 ----------
// keep: resName -> { role, name, rationale }；role ∈ substrate/product/cofactor
// primaryLigand: 口袋锚定配体 id；apoAllowed: apo 结构中仍保留的配体（如必需金属）
// modifiedResidues: HETATM 形式的共价修饰氨基酸残基，按蛋白保留（非配体）
const STEPS = [
  {
    id: "gk-1", dir: "gly-01", name: "葡萄糖磷酸化（己糖激酶 HK1）", mode: "static",
    primaryLigand: "GLC",
    holo: {
      pdbId: "1CZA", species: "Homo sapiens", modifiedResidues: [],
      keep: {
        GLC: ["substrate", "α-D-葡萄糖", "真实底物，占据活性位点"],
        G6P: ["product", "6-磷酸-D-葡萄糖", "真实产物，与底物同存于 1CZA"],
        ADP: ["cofactor", "ADP", "ATP 已水解为 ADP，代表核苷酸结合态（非 ATP 结合态）"],
      },
    },
    apo: null,
    caveats: [
      "人源 HK1 无 apo 结构，本步仅提供 static 结合态视图（无游离态切换）。",
      "1CZA 为突变体且仅含 HK1 的 C 端催化半分子（单体），并非全酶四聚体。",
      "1CZA 中 ADP 为 ATP 水解产物，不代表 ATP 结合态。",
    ],
  },
  {
    id: "gk-2", dir: "gly-02", name: "G6P ↔ F6P 异构（磷酸葡萄糖异构酶）", mode: "two-state",
    primaryLigand: "F6P",
    holo: {
      pdbId: "2CXS", species: "Mus musculus", modifiedResidues: [],
      keep: { F6P: ["substrate", "6-磷酸-D-果糖", "真实底物"] },
    },
    apo: { pdbId: "1JIQ", species: "Homo sapiens", apoAllowed: [], modifiedResidues: [] },
    caveats: [
      "跨物种配对：holo 2CXS 为小鼠（Mus musculus），apo 1JIQ 为人（Homo sapiens），物种不一致。",
      "2CXS 中 GOL（甘油）为结晶添加剂，已滤除。",
    ],
  },
  {
    id: "gk-3", dir: "gly-03", name: "F6P 磷酸化（磷酸果糖激酶 PFK-1）", mode: "static",
    primaryLigand: "F6P",
    holo: {
      pdbId: "8W2G", species: "Homo sapiens", modifiedResidues: [],
      keep: {
        F6P: ["substrate", "6-磷酸-D-果糖", "真实底物，活性位点"],
        ADP: ["cofactor", "ADP", "每链 3 个 ADP 实例：仅 F6P 附近 12 Å 内的实例参与口袋判定，其余为变构核苷酸位点"],
        FBP: ["product", "1,6-二磷酸果糖", "真实代谢物；每链 1 实例，是否参与口袋由 12 Å 判据决定"],
      },
    },
    apo: null,
    caveats: [
      "8W2G 为低温电镜（cryo-EM）3.0 Å 结构，分辨率低于其余 X 射线步骤。",
      "8W2G 为人 PFKL（肝型同工酶）；肌型 PFKM 无高分辨底物复合物结构。",
      "人源 PFK-1 无 apo 结构，本步仅提供 static 结合态视图。",
      "8W2G 每链含多个 ADP 位点（催化 + 变构），口袋判定仅计 F6P 附近 12 Å 内实例。",
    ],
  },
  {
    id: "gk-4", dir: "gly-04", name: "F1,6BP 裂解（醛缩酶 ALDOA）", mode: "two-state",
    primaryLigand: "2FP",
    holo: {
      pdbId: "4ALD", species: "Homo sapiens", modifiedResidues: [],
      keep: { "2FP": ["substrate", "1,6-二磷酸果糖（线形构象，PDB 代码 2FP）", "真实底物但为线形非生产性构象"] },
    },
    apo: { pdbId: "5KY6", species: "Homo sapiens", apoAllowed: [], modifiedResidues: [] },
    caveats: [
      "4ALD 中底物为线形构象 F1,6BP（配体代码 2FP，已核实化学身份为 linear fructose-1,6-bisphosphate），非呋喃环天然构象。",
      "4ALD 分辨率 2.8 Å，为十步中较弱之一。",
    ],
  },
  {
    id: "gk-5", dir: "gly-05", name: "DHAP ↔ G3P 异构（磷酸丙糖异构酶 TPI）", mode: "two-state",
    primaryLigand: "13P",
    holo: {
      pdbId: "1NEY", species: "Saccharomyces cerevisiae", modifiedResidues: ["FTR"],
      keep: { "13P": ["substrate", "磷酸二羟丙酮（DHAP，PDB 代码 13P，已核实）", "真实底物"] },
    },
    apo: { pdbId: "2JK2", species: "Homo sapiens", apoAllowed: [], modifiedResidues: [] },
    caveats: [
      "跨物种配对：holo 1NEY 为酿酒酵母，apo 2JK2 为人，物种不一致。",
      "1NEY 蛋白含 6-氟色氨酸修饰残基（FTR，替代部分 Trp），已按蛋白残基保留而非配体。",
    ],
  },
  {
    id: "gk-7", dir: "gly-07", name: "1,3-BPG ↔ 3PG 磷酰转移（磷酸甘油酸激酶 PGK1）", mode: "two-state",
    primaryLigand: "3PG",
    holo: {
      pdbId: "9FDN", species: "Homo sapiens", modifiedResidues: [],
      keep: {
        ATP: ["substrate", "三磷酸腺苷（ATP）", "真实 ATP（非类似物），磷酸供体"],
        "3PG": ["substrate", "3-磷酸甘油酸", "真实底物，磷酸受体"],
      },
    },
    apo: { pdbId: "8YHP", species: "Homo sapiens", apoAllowed: [], modifiedResidues: [] },
    caveats: [],
  },
  {
    id: "gk-8", dir: "gly-08", name: "3PG ↔ 2PG 变位（磷酸甘油酸变位酶 PGAM）", mode: "two-state",
    primaryLigand: "3PG",
    holo: {
      pdbId: "1QHF", species: "Saccharomyces cerevisiae", modifiedResidues: [],
      keep: { "3PG": ["substrate", "3-磷酸甘油酸", "真实底物（酵母 dPGM）"] },
    },
    apo: { pdbId: "4GPZ", species: "Homo sapiens", apoAllowed: [], modifiedResidues: ["NEP"] },
    caveats: [
      "人源 PGAM1 无任何底物复合物结构，holo 采用酿酒酵母 1QHF（跨种）。",
      "apo 4GPZ 并非严格游离态：催化组氨酸被 NEP（N1-磷酸组氨酸类似物，共价修饰残基）占据，已按修饰残基保留并如实标注。",
      "1QHF 中 SO4（每链 2 个）为结晶磷酸已滤除，可能模拟天然磷酰中间态。",
    ],
  },
  {
    id: "gk-9", dir: "gly-09", name: "2PG → PEP 脱水（烯醇化酶 ENO）", mode: "two-state",
    primaryLigand: "2PG",
    holo: {
      pdbId: "3UCD", species: "Homo sapiens", modifiedResidues: [],
      keep: {
        "2PG": ["substrate", "2-磷酸甘油酸", "真实底物（A 链）"],
        PEP: ["product", "磷酸烯醇式丙酮酸", "真实产物（B 链；口袋判定以 2PG 所在位点为锚）"],
        MG: ["cofactor", "Mg²⁺（必需金属辅因子）", "烯醇化酶活性必需双 Mg²⁺"],
      },
    },
    apo: { pdbId: "2PSN", species: "Homo sapiens", apoAllowed: ["MG"], modifiedResidues: [] },
    caveats: [
      "同工酶差异：holo 3UCD 为 ENO2（神经元型），apo 2PSN 为 ENO1（肌肉型），同为人源但同工酶不同。",
      "3UCD 中 2PG 在 A 链、PEP 在 B 链，口袋判定以 A 链 2PG 位点为锚，PEP 输出但不参与口袋。",
      "apo 2PSN 保留必需金属 Mg²⁺；其每链 1 个 PO4 按结晶磷酸滤除。",
    ],
  },
  {
    id: "gk-10", dir: "gly-10", name: "PEP → 丙酮酸（丙酮酸激酶 PKL）", mode: "two-state",
    primaryLigand: "PEP",
    holo: {
      pdbId: "6NN4", species: "Homo sapiens", modifiedResidues: [],
      keep: {
        PEP: ["substrate", "磷酸烯醇式丙酮酸", "真实底物，活性位点"],
        FBP: ["cofactor", "1,6-二磷酸果糖（变构激活剂）", "真实代谢物，占据变构激活位点（远端，不参与口袋判定）"],
      },
    },
    apo: { pdbId: "1ZJH", species: "Homo sapiens", apoAllowed: [], modifiedResidues: [] },
    caveats: [
      "6NN4 为 D499N 突变体（催化残基 Asp499→Asn），属补偿性证据。",
      "同工酶差异：holo 6NN4 为 PKL（肝型），apo 1ZJH 为 PKM2（肌肉型）。",
      "6NN4 无金属离子坐标（PK 反应本需 Mg²⁺/K⁺），口袋不含金属。",
    ],
  },
  {
    id: "gk-1-liver", dir: "gly-01-liver", name: "肝型葡萄糖激酶 GCK（器官变体）", mode: "two-state",
    primaryLigand: "GLC",
    holo: {
      pdbId: "1V4S", species: "Homo sapiens", modifiedResidues: [],
      keep: { GLC: ["substrate", "α-D-葡萄糖", "真实底物；合成激活剂 MRK 已按替身配体滤除（页面不可见）"] },
    },
    apo: { pdbId: "1V4T", species: "Homo sapiens", apoAllowed: [], modifiedResidues: [] },
    caveats: [
      "GCK 为己糖激酶同工酶 IV（肝型变构酶），与主图 HK1 为不同同工酶。",
      "1V4S 含合成激活剂 MRK（GKA 药物分子），已按替身配体滤除，属补偿性证据。",
      "1V4T（apo）分辨率 3.40 Å，游离态结构较弱。",
    ],
  },
  {
    id: "gk-10-muscle", dir: "gly-10-muscle", name: "肌型丙酮酸激酶 PKM2（器官变体）", mode: "static",
    primaryLigand: "FBP",
    holo: {
      pdbId: "3BJF", species: "Homo sapiens", modifiedResidues: [],
      keep: {
        FBP: ["cofactor", "1,6-二磷酸果糖（变构激活剂）", "真实代谢物，变构激活位点"],
        K: ["cofactor", "K⁺（激活一价阳离子）", "PK 反应必需离子，天然结合态"],
        MG: ["cofactor", "Mg²⁺（必需金属辅因子）", "PK 反应必需金属，天然结合态"],
      },
    },
    apo: null,
    caveats: [
      "3BJF 为 static 变构态结构：仅含变构激活剂 FBP 与必需离子 K⁺/Mg²⁺，无底物 PEP 坐标。",
      "3BJF 中 OXL（草酸，PEP 类似物）已按替身配体滤除。",
      "PKM2 为肌肉型同工酶，与主图 PKL 不同同工酶。",
    ],
  },
];

// ---------- PDB 下载（幂等：缓存存在则跳过） ----------
async function download(pdbId) {
  mkdirSync(CACHE, { recursive: true });
  const file = join(CACHE, `${pdbId}.pdb`);
  if (!REFRESH && existsSync(file) && statSync(file).size > 0) {
    return readFileSync(file, "utf8");
  }
  const res = await fetch(`https://files.rcsb.org/download/${pdbId}.pdb`);
  if (!res.ok) fail(`下载 ${pdbId} 失败：HTTP ${res.status}`);
  const text = await res.text();
  if (!text.includes("ATOM  ")) fail(`${pdbId} 内容异常（无 ATOM 记录）`);
  writeFileSync(file, text, "utf8");
  console.log(`  · 已下载 ${pdbId}（${(text.length / 1024).toFixed(0)} KB）`);
  return text;
}

// ---------- PDB 解析 ----------
function parseAtomLine(l) {
  return {
    serial: parseInt(l.slice(6, 11), 10),
    name: l.slice(12, 16).trim(),
    altLoc: l.slice(16, 17).trim(),
    resName: l.slice(17, 20).trim(),
    chain: l.slice(21, 22).trim(),
    resSeq: parseInt(l.slice(22, 26), 10),
    icode: l.slice(26, 27).trim(),
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
function dist(a, b) {
  const dx = a.x - b.x, dy = a.y - b.y, dz = a.z - b.z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}
function centroid(atoms) {
  let sx = 0, sy = 0, sz = 0;
  for (const a of atoms) { sx += a.x; sy += a.y; sz += a.z; }
  return { x: sx / atoms.length, y: sy / atoms.length, z: sz / atoms.length };
}

/**
 * 解析 PDB 文本。修饰残基（modifiedResidues，如 FTR/NEP）按蛋白保留。
 * H/D 原子一律滤除。返回蛋白原子（按链分组）、配体实例（chain|resName|resSeq → atoms）、水、共晶配体种类。
 */
function parsePdb(text, modifiedResidues) {
  const protein = [];
  const instances = new Map(); // key -> {resName, chain, resSeq, atoms, firstSerial}
  const waters = [];
  const hetResNames = new Map(); // resName -> atom count（含修饰残基，供审计）
  let method = null, resolution = null, title = null;
  const modSet = new Set(modifiedResidues);

  for (const l of text.split("\n")) {
    const rec = l.slice(0, 6).trim();
    if (rec === "EXPDTA") method = l.slice(10, 80).trim();
    if (rec === "REMARK" && l.includes("RESOLUTION.")) {
      const m = l.match(/RESOLUTION\.\s+([\d.]+)\s+ANGSTROM/);
      if (m) resolution = parseFloat(m[1]);
    }
    if (rec === "TITLE" && title === null) title = l.slice(10, 80).trim();
    if (rec !== "ATOM" && rec !== "HETATM") continue;
    const a = parseAtomLine(l);
    if (a.altLoc && a.altLoc !== "A") continue;
    if (a.element === "H" || a.element === "D") continue;
    if (rec === "ATOM") {
      if (a.resSeq >= 0) protein.push(a);
      continue;
    }
    // HETATM
    hetResNames.set(a.resName, (hetResNames.get(a.resName) ?? 0) + 1);
    if (a.resName === "HOH") { waters.push(a); continue; }
    if (modSet.has(a.resName)) { protein.push(a); continue; } // 修饰残基按蛋白处理
    const key = `${a.chain}|${a.resName}|${a.resSeq}`;
    if (!instances.has(key)) instances.set(key, { resName: a.resName, chain: a.chain, resSeq: a.resSeq, atoms: [], firstSerial: a.serial });
    const inst = instances.get(key);
    inst.atoms.push(a);
    if (a.serial < inst.firstSerial) inst.firstSerial = a.serial;
  }
  return { protein, instances, waters, hetResNames, method, resolution, title };
}

// ---------- 链选择（规则 R1–R4，见文件头注释） ----------
function selectHoloChains(parsed, keepIds) {
  const chainResidues = new Map(); // chain -> Set(resSeq)
  const chainAtoms = new Map(); // chain -> atom count
  for (const p of parsed.protein) {
    if (!chainResidues.has(p.chain)) { chainResidues.set(p.chain, new Set()); chainAtoms.set(p.chain, 0); }
    chainResidues.get(p.chain).add(p.resSeq);
    chainAtoms.set(p.chain, chainAtoms.get(p.chain) + 1);
  }
  const candidates = [...chainResidues.entries()].filter(([, rs]) => rs.size >= 30).map(([c]) => c);
  if (candidates.length === 0) fail("R1 无候选蛋白链（≥30 残基）");

  // 每链承载的保留配体重原子数与 resName 集合
  const hosted = new Map(); // chain -> {atoms, resNames:Set, instances:[]}
  for (const c of candidates) hosted.set(c, { atoms: 0, resNames: new Set(), instances: [] });
  const keptInstances = [];
  for (const inst of parsed.instances.values()) {
    if (!keepIds.has(inst.resName)) continue;
    keptInstances.push(inst);
    if (hosted.has(inst.chain)) {
      hosted.get(inst.chain).atoms += inst.atoms.length;
      hosted.get(inst.chain).resNames.add(inst.resName);
      hosted.get(inst.chain).instances.push(inst);
    }
  }
  // R2 主链
  const sorted = [...candidates].sort((a, b) =>
    (hosted.get(b).atoms - hosted.get(a).atoms) || (chainAtoms.get(b) - chainAtoms.get(a)) || a.localeCompare(b));
  const primary = sorted[0];
  const kept = new Set([primary]);
  const reasons = new Map([[primary, "R2 主链：承载保留配体重原子最多"]]);

  // 主配体第一实例（口袋锚）——必须落在 R2 主链上，否则锚与主链错位（6NN4 教训）
  const primaryInstances = keptInstances.filter((i) => i.resName === keepIds.get("_primary") && i.chain === primary);
  if (primaryInstances.length === 0) fail(`主配体 ${keepIds.get("_primary")} 在主链 ${primary} 上无实例`);
  primaryInstances.sort((a, b) => a.firstSerial - b.firstSerial);
  const anchor = primaryInstances[0];
  const anchorC = centroid(anchor.atoms);

  // 口袋相关实例：质心距锚 ≤12 Å
  const relevant = keptInstances.filter((i) => {
    const c = centroid(i.atoms);
    return Math.sqrt((c.x - anchorC.x) ** 2 + (c.y - anchorC.y) ** 2 + (c.z - anchorC.z) ** 2) <= POCKET_LIGAND_RADIUS;
  });
  const relevantAtoms = relevant.flatMap((i) => i.atoms);

  // R3 附加链（循环至稳定）
  let changed = true;
  while (changed) {
    changed = false;
    for (const c of sorted) {
      if (kept.has(c)) continue;
      // (a) 承载已保留链集合没有的保留配体 resName
      const keptResNames = new Set();
      for (const k of kept) for (const rn of hosted.get(k).resNames) keptResNames.add(rn);
      const uniqueNames = [...hosted.get(c).resNames].filter((rn) => !keptResNames.has(rn));
      if (uniqueNames.length > 0) {
        kept.add(c); reasons.set(c, `R3(a)：承载已保留链没有的配体 ${uniqueNames.join("/")}`);
        changed = true; continue;
      }
      // (b) ≥3 个口袋残基（到相关配体实例 ≤4.5 Å）
      const byRes = new Set();
      for (const p of parsed.protein) {
        if (p.chain !== c) continue;
        if (relevantAtoms.some((l) => dist(p, l) <= POCKET_CUTOFF)) byRes.add(p.resSeq);
      }
      if (byRes.size >= INTERFACE_MIN_RESIDUES) {
        kept.add(c); reasons.set(c, `R3(b)：界面口袋贡献 ${byRes.size} 个残基（≤4.5 Å）`);
        changed = true;
      }
    }
  }
  return { chains: [...kept].sort(), reasons, anchor, relevant, relevantAtoms, keptInstances };
}

function selectApoChains(parsed, nChains) {
  // R4：按蛋白原子数降序、链名字典序升序取前 N
  const chainAtoms = new Map();
  for (const p of parsed.protein) chainAtoms.set(p.chain, (chainAtoms.get(p.chain) ?? 0) + 1);
  const chains = [...chainAtoms.entries()]
    .sort((a, b) => (b[1] - a[1]) || a[0].localeCompare(b[0]))
    .slice(0, nChains).map(([c]) => c);
  return { chains, reasons: Object.fromEntries(chains.map((c) => [c, "R4 apo：与 holo 链数一致，按蛋白原子数降序选取"])) };
}

// ---------- 口袋计算（离线；对"口袋相关"配体实例） ----------
function computePocket(protein, ligandAtoms, waters) {
  const byResidue = new Map(); // `${chain}|${resSeq}` -> entry
  for (const p of protein) {
    let best = Infinity, bestH = Infinity, bestHLig = null;
    const pIsNO = p.element === "N" || p.element === "O";
    for (const l of ligandAtoms) {
      const d = dist(p, l);
      if (d < best) best = d;
      if (pIsNO && (l.element === "N" || l.element === "O") && d < bestH) { bestH = d; bestHLig = l; }
    }
    if (best > POCKET_CUTOFF) continue;
    const key = `${p.chain}|${p.resSeq}`;
    if (!byResidue.has(key)) {
      byResidue.set(key, { resi: p.resSeq, resn: p.resName, chain: p.chain, minDist: Infinity, hbond: false, closestPair: null });
    }
    const e = byResidue.get(key);
    if (best < e.minDist) e.minDist = best;
    if (pIsNO && bestHLig && bestH <= HBOND_CUTOFF) {
      e.hbond = true;
      if (e.closestPair === null || bestH < e.closestPair.dist) {
        e.closestPair = {
          dist: bestH,
          prot: { name: p.name, resi: p.resSeq, resn: p.resName, chain: p.chain, x: p.x, y: p.y, z: p.z },
          lig: { id: bestHLig.resName, resi: bestHLig.resSeq, chain: bestHLig.chain, name: bestHLig.name, x: bestHLig.x, y: bestHLig.y, z: bestHLig.z },
        };
      }
    }
  }
  const residues = [...byResidue.values()].map((e) => {
    let type;
    if (e.hbond) type = "hbond";
    else if (HYDROPHOBIC.has(e.resn)) type = "hydrophobic";
    else type = "contact";
    return { resi: e.resi, resn: e.resn, chain: e.chain, minDist: Math.round(e.minDist * 100) / 100, type, provenance: "computed" };
  }).sort((a, b) => a.chain.localeCompare(b.chain) || a.resi - b.resi);

  const hbonds = [];
  for (const e of byResidue.values()) {
    if (e.closestPair) {
      hbonds.push({ dist: Math.round(e.closestPair.dist * 10) / 10, prot: e.closestPair.prot, lig: e.closestPair.lig, provenance: "computed" });
    }
  }
  const nearWaters = waters
    .filter((w) => ligandAtoms.some((l) => dist(w, l) <= WATER_CUTOFF))
    .map((w) => w.resSeq);
  return { residues, hbonds, waters: [...new Set(nearWaters)].sort((a, b) => a - b) };
}

// ---------- SDF（V2000，键由共价半径距离推定，全部按单键书写） ----------
function writeSdf(ligandId, atoms, sourcePdbId) {
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
  lines.push(ligandId);
  lines.push(`  RCSB${sourcePdbId}  instance coordinates extracted offline; bonds inferred from covalent radii (all single)`);
  lines.push("");
  lines.push(`${pad(atoms.length, 3)}${pad(bonds.length, 3)}  0  0  0  0  0  0  0  0999 V2000`);
  for (const a of atoms) {
    lines.push(
      `${a.x.toFixed(4).padStart(10)}${a.y.toFixed(4).padStart(10)}${a.z.toFixed(4).padStart(10)} ` +
      `${a.element.padEnd(3)} 0  0  0  0  0  0  0  0  0  0  0  0`
    );
  }
  for (const [i, j, t] of bonds) lines.push(`${pad(i, 3)}${pad(j, 3)}${pad(t, 3)}  0  0  0`);
  lines.push("M  END");
  return lines.join("\n") + "\n";
}

// ---------- 组装 PDB（保留 HELIX/SHEET；修饰残基随蛋白段输出） ----------
function buildChainPdb(text, { protein, ligandInstances, waters }) {
  const meta = [];
  for (const l of text.split("\n")) {
    const rec = l.slice(0, 6).trim();
    if (rec === "HELIX" || rec === "SHEET") meta.push(l.trimEnd());
  }
  const out = [];
  out.push("REMARK   1 TRIMMED BY build-step-assets-all.mjs (curated chains + curated ligands only)");
  out.push(...meta);
  for (const a of protein) out.push(a.raw.trimEnd());
  out.push("TER");
  for (const inst of ligandInstances) for (const a of inst.atoms) out.push(a.raw.trimEnd());
  const waterSet = new Set(waters.map((w) => w.raw.trimEnd()));
  for (const w of waterSet) out.push(w);
  out.push("END");
  return out.join("\n") + "\n";
}

// ---------- 配体策略核对：未知共晶配体一律报错（强制显式归类） ----------
function classify(resName, cfg, side) {
  if (side === "holo" && cfg.holo.keep[resName]) return { role: cfg.holo.keep[resName][0], rationale: cfg.holo.keep[resName][2] };
  if (side === "apo" && cfg.apo?.apoAllowed?.includes(resName)) return { role: "cofactor", rationale: "apo 结构中保留的必需辅因子/金属" };
  if (GLOBAL_FILTER[resName]) return { role: GLOBAL_FILTER[resName][0], rationale: GLOBAL_FILTER[resName][1] };
  return null; // 未归类
}

// ---------- 单步构建 ----------
const written = []; // {abs, rel}
async function buildStep(cfg) {
  console.log(`\n========== ${cfg.id}（${cfg.name}） ==========`);
  const OUT = join(OUTBASE, cfg.dir);
  mkdirSync(OUT, { recursive: true });

  const holoText = await download(cfg.holo.pdbId);
  const holo = parsePdb(holoText, cfg.holo.modifiedResidues);
  const keepIds = new Map(Object.keys(cfg.holo.keep).map((k) => [k, true]));
  keepIds.set("_primary", cfg.primaryLigand);

  // 配体策略核对（holo）
  const unclassified = [...holo.hetResNames.keys()].filter((rn) => rn !== "HOH" && !classify(rn, cfg, "holo") && !cfg.holo.modifiedResidues.includes(rn));
  if (unclassified.length > 0) fail(`${cfg.holo.pdbId} 存在未归类共晶配体：${unclassified.join(", ")}（请在 STEPS 配置或 GLOBAL_FILTER 中显式处理）`);

  const sel = selectHoloChains(holo, keepIds);
  const ligInstances = sel.relevant
    .concat(sel.keptInstances.filter((i) => !sel.relevant.includes(i)))
    .filter((i) => sel.chains.includes(i.chain))
    .sort((a, b) => a.firstSerial - b.firstSerial);
  if (ligInstances.length === 0) fail(`${cfg.holo.pdbId} 所选链上无保留配体实例`);

  const pocket = computePocket(holo.protein.filter((p) => sel.chains.includes(p.chain)), sel.relevantAtoms, holo.waters);
  if (pocket.residues.length === 0) fail(`${cfg.holo.pdbId} 口袋残基为 0，判据或解析有误`);

  const holoPdb = buildChainPdb(holoText, { protein: holo.protein.filter((p) => sel.chains.includes(p.chain)), ligandInstances: ligInstances, waters: holo.waters });
  writeFileSync(join(OUT, "holo.pdb"), holoPdb, "utf8");
  written.push({ abs: join(OUT, "holo.pdb"), rel: `${cfg.dir}/holo.pdb` });

  // SDF：单配体 → ligand.sdf；多配体 → ligand-<ID>.sdf
  const byId = new Map(); // resName -> 聚合信息
  for (const inst of ligInstances) {
    if (!byId.has(inst.resName)) byId.set(inst.resName, { instances: 0, atoms: 0, relevant: false, relevantInst: null });
    const e = byId.get(inst.resName);
    e.instances++;
    e.atoms += inst.atoms.length;
    if (sel.relevant.includes(inst)) { e.relevant = true; if (!e.relevantInst) e.relevantInst = inst; }
  }
  const ids = [...byId.keys()];
  const sdfFiles = {};
  for (const id of ids) {
    const atoms = (byId.get(id).relevantInst ?? ligInstances.find((i) => i.resName === id)).atoms;
    const fname = ids.length === 1 ? "ligand.sdf" : `ligand-${id}.sdf`;
    writeFileSync(join(OUT, fname), writeSdf(id, atoms, cfg.holo.pdbId), "utf8");
    written.push({ abs: join(OUT, fname), rel: `${cfg.dir}/${fname}` });
    sdfFiles[id] = fname;
  }
  writeFileSync(join(OUT, "pocket.json"), JSON.stringify(pocket, null, 2), "utf8");
  written.push({ abs: join(OUT, "pocket.json"), rel: `${cfg.dir}/pocket.json` });

  const holoLigands = ids.map((id) => {
    const [role, name, rationale] = cfg.holo.keep[id];
    const chainList = [...new Set(ligInstances.filter((i) => i.resName === id).map((i) => `${i.chain}/${i.resSeq}`))];
    const c0 = centroid(sel.anchor.atoms);
    const dists = ligInstances.filter((i) => i.resName === id)
      .map((i) => { const c = centroid(i.atoms); return Math.round(Math.sqrt((c.x - c0.x) ** 2 + (c.y - c0.y) ** 2 + (c.z - c0.z) ** 2) * 10) / 10; })
      .sort((a, b) => a - b);
    return {
      id, name, role, rationale,
      instances: byId.get(id).instances,
      instanceChains: chainList,
      pocketRelevant: byId.get(id).relevant,
      minDistToPrimaryA: id === cfg.primaryLigand ? 0 : dists[0],
      atomCount: byId.get(id).atoms,
      sdfFile: sdfFiles[id],
    };
  });
  const filteredIds = [...holo.hetResNames.keys()].filter((rn) => rn !== "HOH" && !cfg.holo.keep[rn] && !cfg.holo.modifiedResidues.includes(rn));
  const holoFiltered = filteredIds.map((id) => {
    const c = classify(id, cfg, "holo");
    const role = c.role, rationale = c.rationale;
    // 到锚配体的最小距离（供审计：判断"添加剂"是否实际占据口袋附近）
    const instAtoms = [...holo.instances.values()].filter((i) => i.resName === id).flatMap((i) => i.atoms);
    let minToPrimary = null;
    if (sel.anchor && instAtoms.length) minToPrimary = Math.round(Math.min(...instAtoms.map((a) => Math.min(...sel.anchor.atoms.map((b) => dist(a, b))))) * 100) / 100;
    return { id, role, rationale, instances: holo.hetResNames.get(id), minDistToPrimaryLigand: minToPrimary };
  });

  // apo（static 步不产出）
  let apoBlock = null, apoPdbStr = null;
  if (cfg.mode === "two-state") {
    const apoText = await download(cfg.apo.pdbId);
    const apo = parsePdb(apoText, cfg.apo.modifiedResidues);
    const apoUnclassified = [...apo.hetResNames.keys()].filter((rn) => rn !== "HOH" && !classify(rn, cfg, "apo") && !cfg.apo.modifiedResidues.includes(rn));
    if (apoUnclassified.length > 0) fail(`${cfg.apo.pdbId} 存在未归类共晶配体：${apoUnclassified.join(", ")}`);
    const asel = selectApoChains(apo, sel.chains.length);
    const apoLigInst = cfg.apo.apoAllowed.length
      ? [...apo.instances.values()].filter((i) => cfg.apo.apoAllowed.includes(i.resName) && asel.chains.includes(i.chain))
      : [];
    const apoProtein = apo.protein.filter((p) => asel.chains.includes(p.chain));
    apoPdbStr = buildChainPdb(apoText, { protein: apoProtein, ligandInstances: apoLigInst, waters: [] });
    writeFileSync(join(OUT, "apo.pdb"), apoPdbStr, "utf8");
    written.push({ abs: join(OUT, "apo.pdb"), rel: `${cfg.dir}/apo.pdb` });
    apoBlock = {
      pdbId: cfg.apo.pdbId,
      species: cfg.apo.species,
      method: apo.method,
      resolution: apo.resolution,
      chainSelection: { chains: asel.chains, rule: asel.reasons },
      atomCount: apoProtein.length + apoLigInst.reduce((s, i) => s + i.atoms.length, 0),
      proteinAtomCount: apoProtein.length,
      ligands: cfg.apo.apoAllowed.map((id) => ({ id, role: "cofactor", rationale: "apo 结构中保留的必需辅因子/金属" })),
      presentLigands: [...apo.hetResNames.keys()].filter((rn) => rn !== "HOH").map((id) => ({ id, role: classify(id, cfg, "apo")?.role ?? "unclassified", rationale: classify(id, cfg, "apo")?.rationale ?? "未归类" })),
      residueModifications: cfg.apo.modifiedResidues.map((id) => ({ id, note: "共价修饰氨基酸残基，按蛋白保留" })),
      note: "游离态（apo）视图。",
    };
    if (apo.method !== "X-RAY DIFFRACTION" || !apo.resolution) console.log(`  ⚠ apo ${cfg.apo.pdbId} 元信息：method=${apo.method} resolution=${apo.resolution}`);
  }

  console.log(`  · holo ${cfg.holo.pdbId} 链[${sel.chains.join(",")}] 蛋白 ${holo.protein.filter((p) => sel.chains.includes(p.chain)).length} 原子；保留配体 ${ids.join(", ")}；口袋残基 ${pocket.residues.length}（hbond ${pocket.residues.filter((r) => r.type === "hbond").length} / hydrophobic ${pocket.residues.filter((r) => r.type === "hydrophobic").length} / contact ${pocket.residues.filter((r) => r.type === "contact").length}），氢键 ${pocket.hbonds.length}，展示水 ${pocket.waters.length}`);
  for (const [c, r] of sel.reasons) console.log(`    链 ${c}：${r}`);
  for (const l of holoLigands) console.log(`    保留 ${l.id}（${l.role}）实例 ${l.instances}${l.pocketRelevant ? "，口袋相关" : "，口袋外"}，距主配体最近 ${l.minDistToPrimaryA} Å`);
  for (const f of holoFiltered) console.log(`    滤除 ${f.id}（${f.role}）实例 ${f.instances}${f.minDistToPrimaryLigand !== null ? `，距主配体 ${f.minDistToPrimaryLigand} Å` : ""}`);

  // meta.json（先写四个文件再统计体积）
  const files = {};
  for (const rel of [`${cfg.dir}/holo.pdb`, ...(apoPdbStr ? [`${cfg.dir}/apo.pdb`] : []), ...Object.values(sdfFiles).map((f) => `${cfg.dir}/${f}`), `${cfg.dir}/pocket.json`]) {
    const buf = readFileSync(join(OUTBASE, rel));
    files[rel.split("/")[1]] = { bytes: buf.length, gzipBytes: gzipSync(buf, { level: 9 }).length };
  }
  const holoProteinAtoms = holo.protein.filter((p) => sel.chains.includes(p.chain)).length;
  const meta = {
    stepId: cfg.id,
    stepName: cfg.name,
    assetVersion: "2.0.0",
    generatedAt: new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Shanghai" }).format(new Date()),
    provenance: "computed",
    mode: cfg.mode,
    pocketCriteria: { distanceCutoffA: POCKET_CUTOFF, hbondCutoffA: HBOND_CUTOFF, waterCutoffA: WATER_CUTOFF, pocketRelevantRadiusA: POCKET_LIGAND_RADIUS },
    pdbId: cfg.holo.pdbId,
    species: cfg.holo.species,
    method: holo.method,
    resolution: holo.resolution,
    resolutionPerState: { holo: holo.resolution, apo: apoBlock?.resolution ?? null },
    atomCount: holoProteinAtoms + ligInstances.reduce((s, i) => s + i.atoms.length, 0),
    chainSelection: { chains: sel.chains, rule: Object.fromEntries(sel.reasons) },
    ligands: holoLigands,
    caveats: cfg.caveats,
    files,
    holo: {
      pdbId: cfg.holo.pdbId,
      species: cfg.holo.species,
      method: holo.method,
      resolution: holo.resolution,
      title: holo.title,
      chainSelection: { chains: sel.chains, rule: Object.fromEntries(sel.reasons) },
      atomCount: holoProteinAtoms + ligInstances.reduce((s, i) => s + i.atoms.length, 0),
      proteinAtomCount: holoProteinAtoms,
      ligands: holoLigands,
      filteredLigands: holoFiltered,
      residueModifications: cfg.holo.modifiedResidues.map((id) => ({ id, note: "共价修饰氨基酸残基，按蛋白保留" })),
      presentLigandsRaw: [...holo.hetResNames.keys()].filter((rn) => rn !== "HOH"),
    },
    apo: apoBlock,
  };
  writeFileSync(join(OUT, "meta.json"), JSON.stringify(meta, null, 2), "utf8");
  written.push({ abs: join(OUT, "meta.json"), rel: `${cfg.dir}/meta.json` });

  // 自查
  if (sel.chains.some((c) => !pocket.residues.some((r) => r.chain === c)) && sel.chains.length > 1) {
    console.log(`  ⚠ 口袋残基未覆盖全部所选链（附加链可能仅为承载配体而保留）`);
  }
  for (const l of holoLigands) {
    if (l.atomCount === 0) fail(`${cfg.id} 保留配体 ${l.id} 原子数为 0`);
  }
  return meta;
}

// ---------- 主流程 ----------
const todo = ONLY ? STEPS.filter((s) => s.id === ONLY) : STEPS;
if (todo.length === 0) fail(`--only ${ONLY} 未匹配任何步骤（可用：${STEPS.map((s) => s.id).join(", ")}）`);

const metas = {};
for (const cfg of todo) metas[cfg.id] = await buildStep(cfg);

// ---------- manifest.json（gk-6 读既有 meta；--only 时合并既有 manifest） ----------
const MANIFEST_PATH = join(OUTBASE, "manifest.json");
const manifest = existsSync(MANIFEST_PATH) ? JSON.parse(readFileSync(MANIFEST_PATH, "utf8")) : {};

if (!ONLY || ONLY === "gk-6") {
  const gk6MetaPath = join(OUTBASE, "gly-06", "meta.json");
  if (existsSync(gk6MetaPath)) {
    const m = JSON.parse(readFileSync(gk6MetaPath, "utf8"));
    manifest["gk-6"] = {
      stepId: "gk-6", assetDir: "gly-06", mode: "two-state", urlAlias: "gly-06",
      species: "Homo sapiens", method: m.holo.method, resolution: m.holo.resolution,
      holo: "holo.pdb", apo: "apo.pdb",
      ligands: [{ id: "NAD", name: m.holo.ligand.name, role: "cofactor", sdf: "ligand.sdf" }],
      pocket: "pocket.json", meta: "meta.json",
      caveats: [m.holo.note],
    };
  }
}
for (const cfg of todo) {
  const m = metas[cfg.id];
  const alias = (() => {
    const m = /^gk-(\d+)(-liver|-muscle)?$/.exec(cfg.id);
    return m ? `gly-${m[1].padStart(2, "0")}${m[2] ?? ""}` : cfg.id;
  })();
  manifest[cfg.id] = {
    stepId: cfg.id, assetDir: cfg.dir, mode: cfg.mode, urlAlias: alias,
    species: m.species, method: m.method, resolution: m.resolution,
    holo: "holo.pdb", apo: m.mode === "two-state" ? "apo.pdb" : null,
    ligands: m.ligands.map((l) => ({ id: l.id, name: l.name, role: l.role, sdf: l.sdfFile })),
    pocket: "pocket.json", meta: "meta.json",
    caveats: m.caveats,
  };
}
writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2) + "\n", "utf8");
written.push({ abs: MANIFEST_PATH, rel: "manifest.json" });

// ---------- 体积报告 + 上限校验 ----------
console.log("\n资产体积报告（原始 / gzip）：");
let over = false;
let totalRaw = 0, totalGz = 0;
for (const f of written) {
  const buf = readFileSync(f.abs);
  const gz = gzipSync(buf, { level: 9 });
  totalRaw += buf.length; totalGz += gz.length;
  const flag = gz.length > MAX_GZIP ? "  ← 超限！" : "";
  if (gz.length > MAX_GZIP) over = true;
  console.log(`  ${f.rel.padEnd(32)} ${(buf.length / 1024).toFixed(1).padStart(9)} KB / ${(gz.length / 1024).toFixed(1).padStart(9)} KB${flag}`);
}
console.log(`  ${"合计".padEnd(32)} ${(totalRaw / 1024).toFixed(1).padStart(9)} KB / ${(totalGz / 1024).toFixed(1).padStart(9)} KB`);
if (over) fail("存在超过 5 MB（gzip）的资产，按约束退出");
console.log(`\n✓ 完成 ${todo.length} 步 → ${OUTBASE}\n  manifest：public/assets/steps/manifest.json（${Object.keys(manifest).length} 个步骤）`);
