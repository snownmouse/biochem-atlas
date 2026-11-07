// 非糖酵解通路 3D 资产管线（第二轮：ppp / fao / urea / 糖异生 的 6 个关键酶）。
// 产出 public/assets/steps/<dir>/：holo.pdb / apo.pdb(two-state) / ligand[-ID].sdf / pocket.json / meta.json
// 合并进 public/assets/steps/manifest.json（不覆盖既有 gk-* 条目）。
//
// 与 scripts/build-step-assets-all.mjs 同一套离线口径：
//   口袋残基 = 任一重原子距"口袋相关配体" ≤4.5 Å；氢键 N/O–N/O ≤3.5 Å；展示水 ≤8 Å。
//   口袋相关实例 = 距主配体在主链上的第一实例质心 ≤12 Å。
//   链选择 R1–R4（候选链 ≥30 残基 / 主链承载配体最多 / 附加链承载独有配体或贡献 ≥3 口袋残基 / apo 链数=holo）。
// 运行时零计算：几何、距离、氢键、水全部在此离线算完。
//
// 用法：node scripts/build-pathway-assets.mjs [--refresh] [--only ppp-o1]
import { mkdirSync, readFileSync, writeFileSync, existsSync, statSync } from "node:fs";
import { gzipSync } from "node:zlib";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const OUTBASE = join(ROOT, "public", "assets", "steps");
const CACHE = join(ROOT, "scripts", "cache", "pdb");
const REFRESH = process.argv.includes("--refresh");
const ONLY = (() => { const i = process.argv.indexOf("--only"); return i >= 0 ? process.argv[i + 1] : null; })();
const MAX_GZIP = 5 * 1024 * 1024;
const POCKET_CUTOFF = 4.5;
const HBOND_CUTOFF = 3.5;
const WATER_CUTOFF = 8.0;
const POCKET_LIGAND_RADIUS = 12.0;
const POCKET_LIGAND_CONTACT = 6.0;
const INTERFACE_MIN_RESIDUES = 3;
const HYDROPHOBIC = new Set(["ALA", "VAL", "LEU", "ILE", "PHE", "MET", "TRP", "PRO", "CYS", "GLY"]);
const COVALENT_R = { H: 0.31, C: 0.76, N: 0.71, O: 0.66, P: 1.07, S: 1.05, MG: 1.39, K: 2.03, NA: 1.66, CL: 1.02, F: 0.57, FE: 1.32, CA: 1.76, MN: 1.39, ZN: 1.22 };

function fail(m) { console.error(`[build-pathway-assets] 失败：${m}`); process.exit(1); }

// 全局滤除表（添加剂 / 替身 / 无关离子）
const FILTER = {
  EDO: ["artifact", "乙二醇，结晶添加剂"], GOL: ["artifact", "甘油，结晶添加剂"],
  PG4: ["artifact", "PEG 片段，结晶添加剂"], XPE: ["artifact", "PEG 链，结晶添加剂"],
  MES: ["artifact", "MES 缓冲液"], SO4: ["artifact", "硫酸根，结晶添加剂"],
  PO4: ["artifact", "无机磷酸，结晶添加剂"], CL: ["artifact", "氯离子"], NA: ["artifact", "钠离子"],
  K: ["artifact", "钾离子（非本步必需时可滤）"], ACT: ["artifact", "乙酸根"],
  CIT: ["artifact", "柠檬酸根/缓冲成分"], FLC: ["artifact", "柠檬酸根"],
  DMS: ["artifact", "DMSO"], TRS: ["artifact", "Tris"], EPE: ["artifact", "HEPES"],
  FE2: ["artifact", "Fe(II)，非该酶催化金属，按结晶离子滤除"],
  MG: ["artifact", "Mg²⁺ 结晶/非必需离子（本步配置声明时滤除）"],
  ZN: ["artifact", "Zn²⁺，结晶离子"],
  NI: ["artifact", "Ni²⁺，结晶离子"],
  CA: ["artifact", "Ca²⁺，结晶离子"],
  OXL: ["analog", "草酸，PEP/丙酮酸类似物（替身）"],
  PGA: ["analog", "2-磷酸乙醇酸（替身）"],
  ANP: ["analog", "AMP-PNP，不可水解 ATP 类似物（替身）"],
  GCP: ["analog", "GTP 不可水解类似物（替身）"],
  PAO: ["analog", "N-膦酰乙酰鸟氨酸，鸟氨酸类似物（替身）"],
  NVA: ["analog", "正缬氨酸，鸟氨酸类似物（替身）"],
  P5S: ["artifact", "共结晶磷脂（去污剂），按添加剂滤除"],
  POV: ["artifact", "共结晶磷脂（去污剂/脂质），按添加剂滤除"],
  TSX: ["analog", "PEPCK 抑制剂（替身）"],
  YCU: ["analog", "FBPase 抑制剂（替身）"],
  A37: ["analog", "FBPase 变构抑制剂（替身）"],
  MRK: ["analog", "合成 GCK 激活剂（替身）"],
  S2C: ["analog", "精氨酸酶抑制剂（替身）"],
  G3P: ["analog", "PDB 代码 G3P = sn-甘油-3-磷酸，非甘油醛-3-磷酸（误标陷阱），不保留"],
};

// ---------- 6 个关键酶配置 ----------
// keep: id -> [role, name, rationale]
const STEPS = [
  {
    id: "ppp-o1", dir: "ppp-01", name: "6-磷酸葡萄糖脱氢酶（G6PD，PPP 限速步）", mode: "two-state",
    primaryLigand: "BG6",
    holo: {
      pdbId: "7SNI", species: "Homo sapiens", modifiedResidues: [],
      keep: {
        BG6: ["substrate", "6-磷酸-D-葡萄糖（G6P）", "真实底物，活性位点"],
        NAP: ["cofactor", "NADP⁺（辅酶，每链 2 个：催化位点 + 结构位点）", "真实辅酶，氧化还原当量受体"],
      },
    },
    apo: { pdbId: "7SNG", species: "Homo sapiens", apoAllowed: [], modifiedResidues: [] },
    caveats: [
      "holo 7SNI 为 D200N 突变体（cryo-EM 2.5 Å），apo 7SNG 为野生型（cryo-EM 2.8 Å），两态构建不一致。",
      "每链含 2 个 NADP⁺ 位点（催化位点 + 结构位点），口袋只计 G6P 附近 12 Å 内实例。",
    ],
  },
  {
    id: "fao-1", dir: "fao-01", name: "中链酰基辅酶 A 脱氢酶（MCAD，β 氧化首步）", mode: "two-state",
    primaryLigand: "CO8",
    holo: {
      pdbId: "1EGC", species: "Homo sapiens", modifiedResidues: [],
      keep: {
        CO8: ["substrate", "辛酰辅酶 A（C8 acyl-CoA）", "真实底物，代表中链长度"],
        FAD: ["cofactor", "FAD（黄素腺嘌呤二核苷酸）", "酶共价结合的必需辅基，脱氢反应电子受体"],
      },
    },
    apo: { pdbId: "8SGP", species: "Homo sapiens", apoAllowed: ["FAD"], modifiedResidues: [] },
    caveats: [
      "holo 1EGC 为 T255E/E376G 突变体（X-ray 2.6 Å），apo 8SGP 为野生型肝 MCAD（cryo-EM 2.69 Å），两态构建不一致。",
      "apo 8SGP 仍含 FAD 辅基（实验结构无完全脱辅基的人源 MCAD），游离态并非严格无配体。",
      "底物为 C8 辛酰辅酶 A；更长/更短链由不同链长特异性脱氢酶处理。",
    ],
  },
  {
    id: "urea-2", dir: "urea-02", name: "鸟氨酸转氨甲酰酶（OTC，尿素循环第二步）", mode: "static",
    primaryLigand: "CP",
    holo: {
      pdbId: "1C9Y", species: "Homo sapiens", modifiedResidues: [],
      keep: { CP: ["substrate", "氨甲酰磷酸（carbamoyl phosphate）", "真实底物，活性位点"] },
    },
    apo: null,
    caveats: [
      "1C9Y 为人源野生型 OTC（X-ray 1.9 Å，SEQADV 无变异记录）；同组 1FVO/1EP9 才携带 L101F/Q270R。",
      "1C9Y 仅含氨甲酰磷酸（CP）与正缬氨酸（NVA）；NVA 为鸟氨酸类似物，已按替身滤除，故第二底物位点无真实配体。",
      "鸟氨酸结合位点由相邻亚基提供，单链视图不呈现完整双底物口袋。",
      "人源 OTC 无实验 apo 结构，本步仅提供 static 结合态视图。",
    ],
  },
  {
    id: "gn-1", dir: "gn-01", name: "丙酮酸羧化酶（PC，糖异生第一步限速）", mode: "two-state",
    primaryLigand: "ATP",
    holo: {
      pdbId: "7WTE", species: "Homo sapiens", modifiedResidues: ["BTI"],
      keep: {
        ATP: ["substrate", "ATP（磷酸供体）", "真实底物之一，生物素羧化后转羧基"],
        ACO: ["cofactor", "乙酰辅酶 A（变构激活剂）", "真实代谢物，变构激活位点"],
      },
    },
    apo: { pdbId: "7WTA", species: "Homo sapiens", apoAllowed: [], modifiedResidues: ["BTI"] },
    caveats: [
      "7WTE/7WTA 均为 cryo-EM（3.3 Å / 3.9 Å），分辨率低于 X 射线步骤。",
      "两个结构均缺少丙酮酸与碳酸氢根坐标；holo 只呈现 ATP 与乙酰辅酶 A。",
      "7WTA（apo）解析的链明显短于 7WTE（holo）（5270 vs 8877 原子），两态形态不可直接叠加。",
      "BTI 为生物素化赖氨酸修饰残基（BCCP 域共价生物素），按蛋白保留而非配体。",
    ],
  },
  {
    id: "ppp-n2", dir: "ppp-n2", name: "核糖磷酸异构酶（RPE，PPP 非氧化支路）", mode: "two-state",
    primaryLigand: "5RP",
    holo: {
      pdbId: "3OVQ", species: "Homo sapiens", modifiedResidues: [],
      keep: { "5RP": ["product", "核酮糖-5-磷酸（Ru5P）", "真实代谢物；该反应可逆，晶体中为产物侧"] },
    },
    apo: { pdbId: "3OVP", species: "Homo sapiens", apoAllowed: [], modifiedResidues: [] },
    caveats: [
      "3OVQ 含 Ru5P（产物侧），不含 R5P 底物侧；反应可逆，异构化方向以页面文案为准。",
      "3OVQ/3OVP 中的 Fe(II) 与 PEG 链按结晶离子/添加剂滤除。",
    ],
  },
  {
    id: "gn-11", dir: "gn-11", name: "葡萄糖-6-磷酸酶催化亚基 1（G6PC1，糖异生末步）", mode: "two-state",
    primaryLigand: "G6P",
    holo: {
      pdbId: "9JTM", species: "Homo sapiens", modifiedResidues: [],
      keep: { G6P: ["substrate", "6-磷酸-D-葡萄糖（G6P）", "真实底物，活性位点"] },
    },
    apo: { pdbId: "9J7V", species: "Homo sapiens", apoAllowed: [], modifiedResidues: [] },
    caveats: [
      "holo 9JTM 为 H176N 催化失活突变体（cryo-EM 2.9 Å）；apo 9J7V 为野生型（3.3 Å），两态构建不一致。",
      "apo 9J7V 含共结晶磷脂 POV，已按添加剂滤除；并非严格脱辅基结构。",
      "9JTM 不含磷酸根离去基团坐标；反应方向与 ER 腔侧拓扑以页面文案为准。",
    ],
  },
  {
    id: "urea-3", dir: "urea-03", name: "精氨琥珀酸合成酶（ASS1，尿素循环第三步）", mode: "static",
    primaryLigand: "ASP",
    holo: {
      pdbId: "2NZ2", species: "Homo sapiens", modifiedResidues: [],
      keep: {
        ASP: ["substrate", "天冬氨酸（aspartate）", "真实底物之一，尿素循环第二氮供体"],
        CIR: ["substrate", "瓜氨酸（citrulline）", "真实底物之一，与天冬氨酸缩合"],
      },
    },
    apo: null,
    caveats: [
      "2NZ2 为人源 ASS1 唯一实验结构（X-ray 2.4 Å），无 apo 对照，本步为 static。",
      "同一位点同时呈现天冬氨酸与瓜氨酸，二者均为真实底物；Na⁺ 已滤除。",
    ],
  },
  {
    id: "ppp-o3", dir: "ppp-o3", name: "6-磷酸葡萄糖酸脱氢酶（6PGD，PPP 氧化支路）", mode: "two-state",
    primaryLigand: "NAP",
    holo: {
      pdbId: "2JKV", species: "Homo sapiens", modifiedResidues: [],
      keep: { NAP: ["cofactor", "NADP⁺（辅酶）", "真实辅酶，氧化脱羧的电子受体"] },
    },
    apo: { pdbId: "4GWG", species: "Homo sapiens", apoAllowed: [], modifiedResidues: [] },
    caveats: [
      "holo 2JKV 仅含 NADP⁺、无 6-磷酸葡萄糖酸底物坐标，属辅因子结合态。",
      "2JKV 为六聚体（6 条链），4GWG 为单链 1.39 Å 无配体结构；仅取单链视图，两态装配体不一致。",
      "2JKV 的 Cl⁻/SO₄²⁻ 与 4GWG 的 MES 均按结晶添加剂滤除。",
    ],
  },
  {
    id: "fao-3", dir: "fao-03", name: "L-3-羟酰基辅酶 A 脱氢酶（HADH，β 氧化第三步）", mode: "static",
    primaryLigand: "CAA",
    holo: {
      pdbId: "1F0Y", species: "Homo sapiens", modifiedResidues: [],
      keep: {
        CAA: ["product", "乙酰乙酰辅酶 A（acetoacetyl-CoA）", "真实代谢物；晶体中为产物侧"],
        NAD: ["cofactor", "NAD⁺（辅酶）", "真实辅酶，脱氢反应电子受体"],
      },
    },
    apo: null,
    caveats: [
      "1F0Y 的 CAA 为产物侧乙酰乙酰-CoA，非上游 3-羟酰基-CoA 底物侧。",
      "人源 HADH 无野生型 apo 结构；同源脱辅基结构（1F14/2HDH）均带工程突变，本步为 static。",
    ],
  },
  {
    id: "fao-2", dir: "fao-02", name: "短链烯酰辅酶 A 水合酶（ECHS1，β 氧化第二步）", mode: "two-state",
    primaryLigand: "COO",
    holo: {
      pdbId: "2HW5", species: "Homo sapiens", modifiedResidues: [],
      keep: { COO: ["product", "巴豆酰辅酶 A（crotonyl-CoA）", "真实代谢物；水合反应的产物侧"] },
    },
    apo: { pdbId: "8ZRU", species: "Homo sapiens", apoAllowed: [], modifiedResidues: [] },
    caveats: [
      "holo 2HW5 为 X-ray 2.55 Å，apo 8ZRU 为 cryo-EM 2.18 Å，两态方法不同。",
      "2HW5 的 Mg²⁺ 与 8ZRU 的 Mg²⁺ 均按结晶离子滤除（ECHS1 不需金属）。",
      "2HW5 配体为巴豆酰-CoA（产物侧），非上游的烯酰-CoA 底物侧。",
    ],
  },
  {
    id: "fao-act", dir: "fao-act", name: "脂酰-CoA 合成酶（ACSM2A，β 氧化前的活化步）", mode: "static",
    primaryLigand: "BCO",
    holo: {
      pdbId: "3EQ6", species: "Homo sapiens", modifiedResidues: [],
      keep: {
        BCO: ["product", "丁酰辅酶 A（butyryl-CoA）", "真实产物；晶体为 AMP + 丁酰-CoA 产物复合物"],
        AMP: ["product", "腺苷一磷酸（AMP）", "真实产物；脂肪酸活化释放 AMP"],
      },
    },
    apo: null,
    caveats: [
      "3EQ6 为 ACSM2A L64P 工程突变体（X-ray 2.4 Å，SEQADV 明确记录）；人源 ACSM2A 无野生型结构。",
      "结构为产物侧（AMP + 丁酰-CoA），不含脂酰底物、ATP 或焦磷酸；反应方向以页面文案为准。",
      "本步同工酶为 ACSM2A（非 ACSL1）；其底物偏好以中短链脂肪酸为主。",
    ],
  },
  {
    id: "fao-4", dir: "fao-04", name: "β-酮脂酰-CoA 硫解酶（ACAA2，β 氧化第四步）", mode: "static",
    primaryLigand: "COA",
    holo: {
      pdbId: "4C2J", species: "Homo sapiens", modifiedResidues: ["CSO"],
      keep: {
        COA: ["product", "辅酶 A（CoA-SH，硫解产物）", "真实产物；硫解反应释放 CoA 并生成乙酰-CoA"],
      },
    },
    apo: null,
    caveats: [
      "4C2J 为人源线粒体 ACAA2（EC 2.3.1.16），不是 ACAT1，也不是过氧化物酶体 ACAA1/ACAA5。",
      "晶体仅含游离 CoA，无 3-酮脂酰-CoA 底物或乙酰-CoA 产物；属辅因子/产物侧结合态。",
      "Cys126 为 S-羟基半胱氨酸（CSO）修饰残基，按蛋白保留；乙二醇（EDO）按添加剂滤除。",
    ],
  },
  {
    id: "ppp-n3", dir: "ppp-n3", name: "转酮醇酶（TKT，PPP 非氧化支路第一接力）", mode: "static",
    primaryLigand: "DX5",
    holo: {
      pdbId: "4KXV", species: "Homo sapiens", modifiedResidues: [],
      keep: {
        DX5: ["analog", "D-木糖醇-5-磷酸（还原型木酮糖-5-磷酸类似物）", "供体底物的还原类似物；晶体捕获 TPP-底物共价中间体"],
        TPP: ["cofactor", "焦磷酸硫胺素（TPP）", "真实辅酶；转酮醇反应的必需辅基"],
      },
    },
    apo: null,
    caveats: [
      "4KXV 为 0.97 Å 人源 TKT，晶体不对称单元仅 1 条链；功能性二聚体由晶体对称性补全。",
      "DX5 为 D-木糖醇-5-磷酸（xylitol-5-phosphate），是 D-木酮糖-5-磷酸的还原类似物，非真实酮糖底物；晶体为共价中间体捕获态。",
      "Ca²⁺ 与乙二醇按结晶离子/添加剂滤除。",
    ],
  },
  {
    id: "gn-2", dir: "gn-02", name: "磷酸烯醇式丙酮酸羧激酶 1（PEPCK1，糖异生限速步）", mode: "two-state",
    primaryLigand: "GCP",
    holo: {
      pdbId: "1KHB", species: "Homo sapiens", modifiedResidues: [],
      keep: {
        GCP: ["analog", "GTP 不可水解类似物（GMP-PCP）", "真实 GTP 的不可水解替身，占据核苷酸结合位点"],
        MN: ["cofactor", "Mn²⁺（催化金属）", "GTP 水解与草酰乙酸羧化必需的双价金属"],
      },
    },
    apo: { pdbId: "1KHG", species: "Homo sapiens", apoAllowed: ["MN"], modifiedResidues: [] },
    caveats: [
      "holo 1KHB 含 GCP（GMP-PCP），为 GTP 的不可水解类似物，不是真实 GTP；无草酰乙酸/CO₂ 坐标。",
      "1KHB/1KHG 相对 UniProt P35558 有 V267I/D586E/V597E 序列差异（SEQADV VARIANT，非工程催化突变）。",
      "每链含 2 个 Mn²⁺（催化位点 + 结构位点），视图只画口袋相关实例；apo 仍含催化 Mn²⁺，为核苷酸-free 而非完全脱金属态。",
    ],
  },
  {
    id: "gn-9", dir: "gn-09", name: "果糖-1,6-二磷酸酶 1（FBP1，糖异生关键调控步）", mode: "two-state",
    primaryLigand: "AMP",
    holo: {
      pdbId: "1FTA", species: "Homo sapiens", modifiedResidues: [],
      keep: { AMP: ["cofactor", "AMP（变构抑制剂）", "真实变构配体；占据 AMP 变构位点并抑制 FBP1"] },
    },
    apo: { pdbId: "5LDZ", species: "Homo sapiens", apoAllowed: [], modifiedResidues: [] },
    caveats: [
      "holo 1FTA 仅含变构抑制剂 AMP，不含底物 FBP/F6P 或 Mg²⁺；口袋为 AMP 变构位点，非催化中心。",
      "人源 FBP1 无底物结合态实验结构；5LDZ 为无 AMP 的 apo 对照（2.2 Å，6 链晶体）。",
      "1FTA 有 V11/A214/I316 三处序列冲突（SEQADV CONFLICT），非工程突变；两态来自不同晶体形式。",
    ],
  },
  {
    id: "urea-1", dir: "urea-01", name: "氨甲酰磷酸合成酶 I（CPS1，尿素循环首步限速）", mode: "two-state",
    primaryLigand: "ADP",
    holo: {
      pdbId: "5DOU", species: "Homo sapiens", modifiedResidues: [],
      keep: {
        ADP: ["product", "腺苷二磷酸（ADP）", "真实产物；ATP 水解后留在核苷酸位点"],
        NLG: ["cofactor", "N-乙酰-L-谷氨酸（NAG）", "真实变构激活剂；CPS1 活性必需"],
        MG: ["cofactor", "Mg²⁺（催化金属）", "ATP 水解与氨甲酰磷酸合成必需"],
      },
    },
    apo: { pdbId: "5DOT", species: "Homo sapiens", apoAllowed: [], modifiedResidues: [] },
    caveats: [
      "holo 5DOU 为产物侧（ADP + 无机磷酸），无 ATP、氨或碳酸氢根底物坐标；每链 2 个 ADP 位点、3 个 Mg²⁺，视图只画口袋相关实例，NAG 变构位点在 40 Å 外仅记录不绘制。",
      "5DOU 为 4 链装配体、5DOT 为 2 链 apo（2.4 Å），两态装配体与链数不一致；apo 的 Ni²⁺/甘油/乙二醇均滤除。",
      "CPS1 为多域全酶，本视图为单体/局部二聚体上下文，不呈现完整氨甲酰磷酸合成循环。",
    ],
  },
  {
    id: "fas-pdh", dir: "fas-pdh", name: "丙酮酸脱氢酶复合体 E1（PDH，FAS 前体乙酰-CoA 供应）", mode: "static",
    primaryLigand: "TPP",
    holo: {
      pdbId: "1NI4", species: "Homo sapiens", modifiedResidues: ["MSE"],
      keep: {
        TPP: ["cofactor", "焦磷酸硫胺素（TPP）", "真实辅酶；E1 丙酮酸脱羧的必需辅基"],
        MG: ["cofactor", "Mg²⁺（E1 活性位点金属）", "与 TPP 焦磷酸共同构成活性位点；PDB 标注在 C 链，实际配位 A 链 Asp167/Asn196/Tyr198"],
      },
    },
    /** PDB 把 A 活性位点的 Mg²⁺ 标在 C 链；按配位关系跨链取出，不再按主链过滤 */
    crossChainLigands: ["MG"],
    apo: null,
    caveats: [
      "1NI4 只含 PDH 复合体的 E1 组分，不含 E2（二氢硫辛酰胺转乙酰酶）与 E3（二氢硫辛酰胺脱氢酶）。",
      "1NI4 为 α₂β₂ 四聚体（α 链 A/C、β 链 B/D）；本视图取 1 个 αβ 异二聚体（A+D），活性位点位于 α/β 界面，另一对 C+B 由晶体对称性补全。",
      "E1 只负责丙酮酸脱羧并把乙酰基转移到 E2 的硫辛酰胺；本视图不能代表 E2/E3 的硫辛酸臂摆动与乙酰-CoA 最终生成。",
      "1NI4 含大量 MSE（硒代甲硫氨酸）修饰残基，按蛋白保留，不是突变；仅 N 端有克隆标签残留（CLONING ARTIFACT）。",
      "晶体为 TPP + Mg²⁺ 结合态，无丙酮酸或辅酶 A 坐标；Mg²⁺ 的 PDB 链标注为 C，但配位 A 链活性位点残基与 TPP，故按跨链配体保留。K⁺ 与结晶水滤除。",
    ],
  },
  {
    id: "fas-acc", dir: "fas-acc", name: "乙酰-CoA 羧化酶 1（ACC1，BC 域；FAS 丙二酰-CoA 供应）", mode: "static",
    primaryLigand: null,
    noLigand: {
      chains: ["A", "B"],
      rationale: "2YL2 不对称单元为 BC 域二聚体（A/B 两条链），按二聚体整体呈现",
    },
    holo: { pdbId: "2YL2", species: "Homo sapiens", modifiedResidues: [], keep: {} },
    apo: null,
    caveats: [
      "2YL2 只含人源 ACC1 的生物素羧化酶（BC）域（observed residues 139–654；COMPND 片段 78–617），不含 CT（羧基转移酶）域与 BCCP（生物素羧基载体蛋白）域。",
      "2YL2 为无配体 apo 结构：晶体中无 ATP、HCO₃⁻、生物素（BTN）或丙二酰-CoA；生物素是 BCCP 域上共价连接的辅基，不在 BC 域内。",
      "BC 域催化 ATP + HCO₃⁻ 生成碳-磷键中间体并向 BCCP 上的生物素转移羧基；本视图只呈现 BC 域本身，不能代表 ACC 全酶的域间协同。",
      "本步为无口袋域视图：pocket 为空，残基表与氢键均为 0，仅呈现蛋白折叠与 A/B 二聚体界面，不代表配体结合口袋。",
    ],
  },
  {
    id: "ppp-n5", dir: "ppp-n5", name: "转酮醇酶（TKT，PPP 非氧化支路第二接力）", mode: "static",
    primaryLigand: "DX5",
    holo: {
      pdbId: "4KXV", species: "Homo sapiens", modifiedResidues: [],
      keep: {
        DX5: ["analog", "D-木糖醇-5-磷酸（还原型木酮糖-5-磷酸类似物）", "供体底物的还原类似物；晶体捕获 TPP-底物共价中间体"],
        TPP: ["cofactor", "焦磷酸硫胺素（TPP）", "真实辅酶；转酮醇反应的必需辅基"],
      },
    },
    apo: null,
    caveats: [
      "4KXV 与 ppp-n3 为同一实验结构（0.97 Å 人源 TKT）；本步复用该结构，但使用独立资产目录 ppp-n5，与 ppp-n3 互不覆盖。",
      "TKT 在 PPP 非氧化支路催化两段化学相同的转酮醇反应（ppp-n3 / ppp-n5）；结构本身不区分接力次序，两段共用同一活性位点。",
      "DX5 为 D-木糖醇-5-磷酸（还原型木酮糖-5-磷酸类似物），非真实酮糖底物；晶体为 TPP-底物共价中间体捕获态。",
      "4KXV 不对称单元仅 1 条链；功能性二聚体由晶体对称性补全。Ca²⁺ 与乙二醇按结晶离子/添加剂滤除。",
    ],
  },
  {
    id: "fas-er", dir: "fas-er", name: "FASN 烯酰还原酶域（ER，脂肪酸合酶第三步）", mode: "static",
    primaryLigand: "NDP",
    domain: { name: "ER", start: 1667, end: 1895, numbering: "8VM0 entity（UniProt P49327 1635–1863）" },
    focusResidues: [[1667, 1895]],
    focusLigandInstance: { chain: "A", resSeq: 2601 },
    holo: {
      pdbId: "8VM0", species: "Homo sapiens", modifiedResidues: [],
      keep: { NDP: ["cofactor", "NADPH（还原型辅酶Ⅱ）", "真实辅酶；ER 域烯酰还原的氢负离子供体"] },
    },
    apo: null,
    caveats: [
      "8VM0 为 3.3 Å 人源 FASN 全酶 cryo-EM 结构；本视图只显示 ER（烯酰还原酶）域，8VM0 entity 残基 1667–1895（UniProt P49327 1635–1863），不是独立域结构。",
      "视野中不含 KR、DH、KS、AT、TE 域及 ACP（载体蛋白）域；这些域仍在同一全酶中，只是未显示。",
      "ER 域在 8VM0 中覆盖完整、无 gap；NADPH（NDP 2601）距 ER 活性位点 1703–1720 约 2.33 Å，归属明确。",
      "配体为 NADPH（NDP），不是酰基-ACP 底物；8VM0 无底物坐标，反应方向以页面文案为准。",
    ],
  },
  {
    id: "fas-kr", dir: "fas-kr", name: "FASN 酮脂酰还原酶域（KR，脂肪酸合酶第四步）", mode: "static",
    primaryLigand: "NDP",
    domain: { name: "KR", start: 1896, end: 2150, numbering: "8VM0 entity（UniProt P49327 1864–2118）" },
    focusResidues: [[1896, 2150]],
    focusLigandInstance: { chain: "A", resSeq: 2602 },
    holo: {
      pdbId: "8VM0", species: "Homo sapiens", modifiedResidues: [],
      keep: { NDP: ["cofactor", "NADPH（还原型辅酶Ⅱ）", "真实辅酶；KR 域β-酮脂酰还原的氢负离子供体"] },
    },
    apo: null,
    caveats: [
      "8VM0 为 3.3 Å 人源 FASN 全酶 cryo-EM 结构；本视图只显示 KR（酮脂酰还原酶）域，8VM0 entity 残基 1896–2150（UniProt P49327 1864–2118），不是独立域结构。",
      "视野中不含 ER、DH、KS、AT、TE 域及 ACP（载体蛋白）域；这些域仍在同一全酶中，只是未显示。",
      "KR 域在 8VM0 中不完整：链 A 止于 2112，2067–2080（gap 2066→2081）与 2113–2150（38 aa）缺失；KR 催化活性位点 1918–1933 与 NADPH 结合位点 1886–1901 均完整存在，核心活性位点可用，但 C 端结构不完整。",
      "NADPH（NDP 2602）距 KR 活性位点 1918–1933 约 2.57 Å，归属明确；配体为 NADPH，不是酰基-ACP 底物。",
    ],
  },
];

// ---------- 下载 ----------
async function download(id) {
  mkdirSync(CACHE, { recursive: true });
  const f = join(CACHE, `${id}.pdb`);
  if (!REFRESH && existsSync(f) && statSync(f).size > 0) return readFileSync(f, "utf8");
  const r = await fetch(`https://files.rcsb.org/download/${id}.pdb`);
  if (!r.ok) fail(`下载 ${id} 失败：HTTP ${r.status}`);
  const t = await r.text();
  if (!t.includes("ATOM  ")) fail(`${id} 无 ATOM 记录`);
  writeFileSync(f, t, "utf8");
  console.log(`  · 已下载 ${id}（${(t.length / 1024).toFixed(0)} KB）`);
  return t;
}

// ---------- 解析 ----------
function atomOf(l) {
  return {
    serial: parseInt(l.slice(6, 11), 10), name: l.slice(12, 16).trim(),
    altLoc: l.slice(16, 17).trim(), resName: l.slice(17, 20).trim(),
    chain: l.slice(21, 22).trim(), resSeq: parseInt(l.slice(22, 26), 10),
    icode: l.slice(26, 27).trim(),
    x: parseFloat(l.slice(30, 38)), y: parseFloat(l.slice(38, 46)), z: parseFloat(l.slice(46, 54)),
    element: l.slice(76, 78).trim().toUpperCase() || "C", raw: l,
  };
}
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
const centroid = (as) => ({ x: as.reduce((s, a) => s + a.x, 0) / as.length, y: as.reduce((s, a) => s + a.y, 0) / as.length, z: as.reduce((s, a) => s + a.z, 0) / as.length });

function parse(text, modified) {
  const protein = [], waters = [];
  const instances = new Map();
  const het = new Map();
  const mod = new Set(modified);
  let method = null, resolution = null;
  for (const l of text.split("\n")) {
    const rec = l.slice(0, 6).trim();
    if (rec === "EXPDTA") method = l.slice(10, 80).trim();
    if (rec === "REMARK" && l.includes("RESOLUTION.")) {
      const m = l.match(/RESOLUTION\.\s+([\d.]+)\s+ANGSTROM/); if (m) resolution = parseFloat(m[1]);
    }
    if (rec !== "ATOM" && rec !== "HETATM") continue;
    const a = atomOf(l);
    if (a.altLoc && a.altLoc !== "A") continue;
    if (a.element === "H" || a.element === "D") continue;
    if (rec === "ATOM") { protein.push(a); continue; }
    het.set(a.resName, (het.get(a.resName) ?? 0) + 1);
    if (a.resName === "HOH") { waters.push(a); continue; }
    if (mod.has(a.resName)) { protein.push(a); continue; }
    const key = `${a.chain}|${a.resName}|${a.resSeq}`;
    if (!instances.has(key)) instances.set(key, { resName: a.resName, chain: a.chain, resSeq: a.resSeq, atoms: [], firstSerial: a.serial });
    const inst = instances.get(key);
    inst.atoms.push(a);
    if (a.serial < inst.firstSerial) inst.firstSerial = a.serial;
  }
  return { protein, waters, instances, het, method, resolution };
}

// ---------- 选链 ----------
function selectChains(parsed, primaryId, keepSet, focusInst = null) {
  const chainRes = new Map(), chainAtoms = new Map();
  for (const p of parsed.protein) {
    if (!chainRes.has(p.chain)) { chainRes.set(p.chain, new Set()); chainAtoms.set(p.chain, 0); }
    chainRes.get(p.chain).add(p.resSeq);
    chainAtoms.set(p.chain, chainAtoms.get(p.chain) + 1);
  }
  const cand = [...chainRes.entries()].filter(([, rs]) => rs.size >= 30).map(([c]) => c);
  if (!cand.length) fail("无候选链");
  const hosted = new Map(cand.map((c) => [c, { atoms: 0, names: new Set(), insts: [] }]));
  const keptAll = [];
  for (const inst of parsed.instances.values()) {
    if (!keepSet.has(inst.resName)) continue;
    keptAll.push(inst);
    if (hosted.has(inst.chain)) {
      const h = hosted.get(inst.chain);
      h.atoms += inst.atoms.length; h.names.add(inst.resName); h.insts.push(inst);
    }
  }
  // R2 打分：优先选"配体真正被口袋包住"的链（接触残基数），避免选到只有部分建模的配体副本
  const contactScore = new Map();
  for (const c of cand) {
    const atomsOfChain = hosted.get(c).insts.flatMap((i) => i.atoms);
    let n = 0;
    for (const p of parsed.protein) {
      if (p.chain === c && atomsOfChain.some((l) => dist(p, l) <= POCKET_CUTOFF)) n++;
    }
    contactScore.set(c, n);
  }
  const sorted = [...cand].sort((a, b) =>
    (contactScore.get(b) - contactScore.get(a)) ||
    (hosted.get(b).atoms - hosted.get(a).atoms) ||
    (chainAtoms.get(b) - chainAtoms.get(a)) || a.localeCompare(b));
  // focusLigandInstance 指定实例时，强制其所在链为主链，保证 anchor 与下游口袋都以该实例为中心
  const primary = focusInst && cand.includes(focusInst.chain) ? focusInst.chain : sorted[0];
  const kept = new Set([primary]);
  const rule = new Map([[primary, focusInst ? `R2 主链：focusLigandInstance 指定 ${primary}` : `R2 主链：口袋接触残基最多（${contactScore.get(primary)} 个）`]]);
  const anchorInsts = keptAll.filter((i) => i.resName === primaryId && i.chain === primary).sort((a, b) => a.firstSerial - b.firstSerial);
  if (!anchorInsts.length) fail(`主配体 ${primaryId} 在主链 ${primary} 上无实例`);
  let anchor = anchorInsts[0];
  if (focusInst) {
    anchor = keptAll.find((i) => i.resName === primaryId && i.chain === focusInst.chain && i.resSeq === focusInst.resSeq);
    if (!anchor) fail(`focusLigandInstance ${primaryId} ${focusInst.chain}/${focusInst.resSeq} 不存在`);
  }
  const ac = centroid(anchor.atoms);
  const relevant = keptAll.filter((i) => {
    if (dist(centroid(i.atoms), ac) <= POCKET_LIGAND_RADIUS) return true;
    // 大配体（NADP/FAD/CoA 衍生物）质心可能 >12 Å，但原子实际接触主配体；按 6 Å 接触判据补入
    return i.atoms.some((a) => anchor.atoms.some((b) => dist(a, b) <= POCKET_LIGAND_CONTACT));
  });
  const relevantAtoms = relevant.flatMap((i) => i.atoms);
  let changed = true;
  while (changed) {
    changed = false;
    for (const c of sorted) {
      if (kept.has(c)) continue;
      const names = new Set();
      for (const k of kept) for (const n of hosted.get(k).names) names.add(n);
      const unique = [...hosted.get(c).names].filter((n) => !names.has(n));
      if (unique.length) { kept.add(c); rule.set(c, `R3(a)：承载独有配体 ${unique.join("/")}`); changed = true; continue; }
      const near = new Set();
      for (const p of parsed.protein) if (p.chain === c && relevantAtoms.some((l) => dist(p, l) <= POCKET_CUTOFF)) near.add(p.resSeq);
      if (near.size >= INTERFACE_MIN_RESIDUES) { kept.add(c); rule.set(c, `R3(b)：界面贡献 ${near.size} 个口袋残基`); changed = true; }
    }
  }
  return { chains: [...kept].sort(), primary, rule, anchor, relevant, relevantAtoms };
}

function selectApo(parsed, n) {
  const ca = new Map();
  for (const p of parsed.protein) ca.set(p.chain, (ca.get(p.chain) ?? 0) + 1);
  const chains = [...ca.entries()].sort((a, b) => (b[1] - a[1]) || a[0].localeCompare(b[0])).slice(0, n).map(([c]) => c);
  return { chains, rule: Object.fromEntries(chains.map((c) => [c, "R4 apo：与 holo 链数一致，按蛋白原子数降序"]) ) };
}

// ---------- 口袋 ----------
function pocketOf(protein, ligAtoms, waters) {
  const byRes = new Map();
  for (const p of protein) {
    let best = Infinity, bestH = Infinity, bestHL = null;
    const pNO = p.element === "N" || p.element === "O";
    for (const l of ligAtoms) {
      const d = dist(p, l);
      if (d < best) best = d;
      if (pNO && (l.element === "N" || l.element === "O") && d < bestH) { bestH = d; bestHL = l; }
    }
    if (best > POCKET_CUTOFF) continue;
    const key = `${p.chain}|${p.resSeq}`;
    if (!byRes.has(key)) byRes.set(key, { resi: p.resSeq, resn: p.resName, chain: p.chain, minDist: Infinity, hb: false, pair: null });
    const e = byRes.get(key);
    if (best < e.minDist) e.minDist = best;
    if (pNO && bestHL && bestH <= HBOND_CUTOFF) {
      e.hb = true;
      if (!e.pair || bestH < e.pair.dist) {
        e.pair = {
          dist: bestH,
          prot: { name: p.name, resi: p.resSeq, resn: p.resName, chain: p.chain, x: p.x, y: p.y, z: p.z },
          lig: { id: bestHL.resName, resi: bestHL.resSeq, chain: bestHL.chain, name: bestHL.name, x: bestHL.x, y: bestHL.y, z: bestHL.z },
        };
      }
    }
  }
  const residues = [...byRes.values()].map((e) => ({
    resi: e.resi, resn: e.resn, chain: e.chain, minDist: Math.round(e.minDist * 100) / 100,
    type: e.hb ? "hbond" : HYDROPHOBIC.has(e.resn) ? "hydrophobic" : "contact", provenance: "computed",
  })).sort((a, b) => a.chain.localeCompare(b.chain) || a.resi - b.resi);
  const hbonds = [...byRes.values()].filter((e) => e.pair).map((e) => ({ dist: Math.round(e.pair.dist * 10) / 10, prot: e.pair.prot, lig: e.pair.lig, provenance: "computed" }));
  const w = [...new Set(waters.filter((x) => ligAtoms.some((l) => dist(x, l) <= WATER_CUTOFF)).map((x) => x.resSeq))].sort((a, b) => a - b);
  return { residues, hbonds, waters: w };
}

// ---------- SDF / PDB ----------
function sdfOf(id, atoms, pdbId) {
  const bonds = [];
  for (let i = 0; i < atoms.length; i++) for (let j = i + 1; j < atoms.length; j++) {
    const r1 = COVALENT_R[atoms[i].element] ?? 0.77, r2 = COVALENT_R[atoms[j].element] ?? 0.77;
    if (dist(atoms[i], atoms[j]) <= (r1 + r2) * 1.15) bonds.push([i + 1, j + 1, 1]);
  }
  const pad = (s, n) => String(s).padStart(n);
  const out = [id, `  RCSB ${pdbId} offline extraction; bonds inferred from covalent radii (all single)`, "",
    `${pad(atoms.length, 3)}${pad(bonds.length, 3)}  0  0  0  0  0  0  0  0999 V2000`];
  for (const a of atoms) out.push(`${a.x.toFixed(4).padStart(10)}${a.y.toFixed(4).padStart(10)}${a.z.toFixed(4).padStart(10)} ${a.element.padEnd(3)} 0  0  0  0  0  0  0  0  0  0  0  0`);
  for (const [i, j, t] of bonds) out.push(`${pad(i, 3)}${pad(j, 3)}${pad(t, 3)}  0  0  0`);
  out.push("M  END");
  return out.join("\n") + "\n";
}

function pdbOf(text, protein, ligInsts, waters) {
  const meta = [];
  for (const l of text.split("\n")) {
    const rec = l.slice(0, 6).trim();
    if (rec === "HELIX" || rec === "SHEET") meta.push(l.trimEnd());
  }
  const out = ["REMARK   1 TRIMMED BY build-pathway-assets.mjs (curated chains + curated ligands only)", ...meta];
  for (const a of protein) out.push(a.raw.trimEnd());
  out.push("TER");
  for (const i of ligInsts) for (const a of i.atoms) out.push(a.raw.trimEnd());
  for (const w of new Set(waters.map((x) => x.raw.trimEnd()))) out.push(w);
  out.push("END");
  return out.join("\n") + "\n";
}

function classify(id, cfg, side) {
  if (side === "holo" && cfg.holo.keep[id]) return { role: cfg.holo.keep[id][0], rationale: cfg.holo.keep[id][2] };
  if (side === "apo" && cfg.apo?.apoAllowed?.includes(id)) return { role: "cofactor", rationale: "apo 中保留的必需辅基" };
  if (FILTER[id]) return { role: FILTER[id][0], rationale: FILTER[id][1] };
  return null;
}

// ---------- 构建 ----------
const written = [];

/** 无配体域视图：只裁剪蛋白链，不计算口袋；pocket 为空，meta.ligands 为空。 */
function buildNoLigand(cfg, holoText, holo, OUT) {
  console.log(`\n========== ${cfg.id} ${cfg.name}（无配体域视图） ==========`);
  for (const id of holo.het.keys()) {
    if (id !== "HOH" && !cfg.holo.modifiedResidues.includes(id)) fail(`${cfg.holo.pdbId} 无配体模式下出现未归类 HETATM ${id}`);
  }
  const chainRes = new Map();
  for (const p of holo.protein) {
    if (!chainRes.has(p.chain)) chainRes.set(p.chain, new Set());
    chainRes.get(p.chain).add(p.resSeq);
  }
  const want = cfg.noLigand.chains;
  for (const c of want) {
    if (!chainRes.has(c)) fail(`${cfg.holo.pdbId} 缺少配置链 ${c}`);
    if (chainRes.get(c).size < 30) fail(`${cfg.holo.pdbId} 链 ${c} 仅 ${chainRes.get(c).size} 残基，低于 30`);
  }
  const chains = [...want].sort();
  const prot = holo.protein.filter((p) => chains.includes(p.chain));
  const pocket = { residues: [], hbonds: [], waters: [] };
  writeFileSync(join(OUT, "holo.pdb"), pdbOf(holoText, prot, [], []), "utf8");
  written.push(`${cfg.dir}/holo.pdb`);
  writeFileSync(join(OUT, "pocket.json"), JSON.stringify(pocket, null, 2) + "\n", "utf8");
  written.push(`${cfg.dir}/pocket.json`);

  const files = {};
  for (const rel of [`${cfg.dir}/holo.pdb`, `${cfg.dir}/pocket.json`]) {
    const buf = readFileSync(join(OUTBASE, rel));
    files[rel.split("/")[1]] = { bytes: buf.length, gzipBytes: gzipSync(buf, { level: 9 }).length };
  }
  const chainRule = Object.fromEntries(chains.map((c) => [c, cfg.noLigand.rationale]));
  const holoBlock = {
    pdbId: cfg.holo.pdbId, species: cfg.holo.species, method: holo.method, resolution: holo.resolution,
    chainSelection: { chains, rule: chainRule }, atomCount: prot.length,
    proteinAtomCount: prot.length, ligands: [], filteredLigands: [],
    residueModifications: cfg.holo.modifiedResidues.map((id) => ({ id, note: "共价修饰残基，按蛋白保留" })),
    presentLigandsRaw: [...holo.het.keys()].filter((id) => id !== "HOH"),
  };
  const meta = {
    stepId: cfg.id, stepName: cfg.name, assetVersion: "1.0.0",
    generatedAt: new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Shanghai" }).format(new Date()),
    provenance: "computed", mode: cfg.mode, noLigand: true,
    pocketCriteria: { distanceCutoffA: POCKET_CUTOFF, hbondCutoffA: HBOND_CUTOFF, waterCutoffA: WATER_CUTOFF, pocketRelevantRadiusA: POCKET_LIGAND_RADIUS, pocketRelevantContactA: POCKET_LIGAND_CONTACT },
    pdbId: cfg.holo.pdbId, species: cfg.holo.species, method: holo.method, resolution: holo.resolution,
    resolutionPerState: { holo: holo.resolution, apo: null },
    atomCount: prot.length, chainSelection: { chains, rule: chainRule },
    ligands: [], caveats: cfg.caveats, files, holo: holoBlock, apo: null,
  };
  writeFileSync(join(OUT, "meta.json"), JSON.stringify(meta, null, 2), "utf8");
  written.push(`${cfg.dir}/meta.json`);

  console.log(`  · holo ${cfg.holo.pdbId} 链[${chains.join(",")}] 蛋白 ${prot.length} 原子；无配体（空口袋）`);
  for (const c of chains) console.log(`    链 ${c}：${cfg.noLigand.rationale}`);
  return meta;
}

async function build(cfg) {
  console.log(`\n========== ${cfg.id} ${cfg.name} ==========`);
  const OUT = join(OUTBASE, cfg.dir);
  mkdirSync(OUT, { recursive: true });
  const holoText = await download(cfg.holo.pdbId);
  const holo = parse(holoText, cfg.holo.modifiedResidues);
  if (cfg.noLigand) return buildNoLigand(cfg, holoText, holo, OUT);
  for (const id of holo.het.keys()) {
    if (id !== "HOH" && !classify(id, cfg, "holo") && !cfg.holo.modifiedResidues.includes(id)) fail(`${cfg.holo.pdbId} 未归类配体 ${id}`);
  }
  const keepSet = new Set(Object.keys(cfg.holo.keep));
  const cross = new Set(cfg.crossChainLigands ?? []);
  const focusInstCfg = cfg.focusLigandInstance ?? null;
  const sel = selectChains(holo, cfg.primaryLigand, keepSet, focusInstCfg);
  // 只输出主链上的配体实例：相邻亚基的同名配体副本会与主链配体几何重叠（如 2HW5 两拷贝仅 3.1 Å），
  // 不能同框渲染；界面亚基仅用于提供口袋残基上下文。
  // 例外 1：crossChainLigands 指定的配体（如 1NI4 标在 C 链、却配位 A 链活性位点的 Mg²⁺）按口袋相关性跨链保留。
  // 例外 2：focusLigandInstance 指定实例时，只保留该实例（8VM0 每链 2 个 NDP，2601 归 ER、2602 归 KR）。
  const focusInst = focusInstCfg ? holo.instances.get(`${focusInstCfg.chain}|${cfg.primaryLigand}|${focusInstCfg.resSeq}`) : null;
  if (focusInstCfg && !focusInst) fail(`focusLigandInstance ${cfg.primaryLigand} ${focusInstCfg.chain}/${focusInstCfg.resSeq} 不存在`);
  const ligs = [...holo.instances.values()]
    .filter((i) => {
      if (!keepSet.has(i.resName)) return false;
      if (focusInst && i.resName === cfg.primaryLigand) return i === focusInst;
      return i.chain === sel.primary || (cross.has(i.resName) && sel.relevant.includes(i));
    })
    .sort((a, b) => a.firstSerial - b.firstSerial);
  const pocketInsts = sel.relevant.filter((i) => (i.chain === sel.primary || cross.has(i.resName)) && (!focusInst || i.resName !== cfg.primaryLigand || i === focusInst));
  const pocketAtoms = pocketInsts.flatMap((i) => i.atoms);
  // 只裁显示：domain / focusResidues 决定视野内残基，口袋判据（4.5 Å / 3.5 Å / 8 Å）保持不变
  const focusRanges = cfg.focusResidues ?? (cfg.domain ? [[cfg.domain.start, cfg.domain.end]] : null);
  const inFocus = (p) => !focusRanges || focusRanges.some(([a, b]) => p.resSeq >= a && p.resSeq <= b);
  const viewProt = holo.protein.filter((p) => sel.chains.includes(p.chain) && inFocus(p));
  if (!ligs.length) fail("主链上无保留配体实例");
  if (!pocketAtoms.length) fail("主链上无口袋相关配体原子");
  const pocket = pocketOf(viewProt, pocketAtoms, holo.waters);
  if (!pocket.residues.length) fail("口袋残基为 0");
  // 只保留口袋 8 Å 内的结晶水，避免整份水链进入资产
  const waterKeep = holo.waters.filter((w) => pocketAtoms.some((l) => dist(w, l) <= WATER_CUTOFF));
  writeFileSync(join(OUT, "holo.pdb"), pdbOf(holoText, viewProt, ligs, waterKeep), "utf8");
  written.push(`${cfg.dir}/holo.pdb`);

  const ids = [...new Set(ligs.map((l) => l.resName))];
  const relevantInst = new Map();
  for (const i of sel.relevant) if ((i.chain === sel.primary || cross.has(i.resName)) && (!focusInst || i.resName !== cfg.primaryLigand || i === focusInst) && !relevantInst.has(i.resName)) relevantInst.set(i.resName, i);
  const sdfNames = {};
  for (const id of ids) {
    const fname = ids.length === 1 ? "ligand.sdf" : `ligand-${id}.sdf`;
    const inst = relevantInst.get(id) ?? ligs.find((l) => l.resName === id);
    writeFileSync(join(OUT, fname), sdfOf(id, inst.atoms, cfg.holo.pdbId), "utf8");
    written.push(`${cfg.dir}/${fname}`); sdfNames[id] = fname;
  }
  writeFileSync(join(OUT, "pocket.json"), JSON.stringify(pocket, null, 2), "utf8");
  written.push(`${cfg.dir}/pocket.json`);

  const holoLigs = ids.map((id) => {
    const [role, name, rationale] = cfg.holo.keep[id] ?? ["cofactor", id, "apo 保留辅基"];
    const insts = ligs.filter((l) => l.resName === id);
    const mapped = [...relevantInst.values()].find((i) => i.resName === id);
    const c0 = centroid(sel.anchor.atoms);
    const dmin = Math.round(Math.min(...insts.map((i) => dist(centroid(i.atoms), c0))) * 10) / 10;
    return { id, name, role, rationale, instances: insts.length, instanceChains: insts.map((i) => `${i.chain}/${i.resSeq}`), pocketRelevant: !!mapped, minDistToPrimaryA: id === cfg.primaryLigand ? 0 : dmin, atomCount: insts.reduce((s, i) => s + i.atoms.length, 0), sdfFile: sdfNames[id] };
  });
  const filtered = [...holo.het.keys()].filter((id) => id !== "HOH" && !cfg.holo.keep[id] && !cfg.holo.modifiedResidues.includes(id)).map((id) => {
    const c = classify(id, cfg, "holo");
    const atoms = [...holo.instances.values()].filter((i) => i.resName === id).flatMap((i) => i.atoms);
    const dmin = atoms.length ? Math.round(Math.min(...atoms.map((a) => Math.min(...sel.anchor.atoms.map((b) => dist(a, b))))) * 100) / 100 : null;
    return { id, role: c.role, rationale: c.rationale, instances: holo.het.get(id), minDistToPrimaryLigand: dmin };
  });

  let apoBlock = null;
  if (cfg.mode === "two-state") {
    const t = await download(cfg.apo.pdbId);
    const apo = parse(t, cfg.apo.modifiedResidues);
    for (const id of apo.het.keys()) {
      if (id !== "HOH" && !classify(id, cfg, "apo") && !cfg.apo.modifiedResidues.includes(id)) fail(`${cfg.apo.pdbId} 未归类配体 ${id}`);
    }
    const as = selectApo(apo, sel.chains.length);
    const prot = apo.protein.filter((p) => as.chains.includes(p.chain));
    const li = cfg.apo.apoAllowed.length ? [...apo.instances.values()].filter((i) => cfg.apo.apoAllowed.includes(i.resName) && as.chains.includes(i.chain)) : [];
    writeFileSync(join(OUT, "apo.pdb"), pdbOf(t, prot, li, []), "utf8");
    written.push(`${cfg.dir}/apo.pdb`);
    apoBlock = {
      pdbId: cfg.apo.pdbId, species: cfg.apo.species, method: apo.method, resolution: apo.resolution,
      chainSelection: { chains: as.chains, rule: as.rule }, atomCount: prot.length + li.reduce((s, i) => s + i.atoms.length, 0),
      proteinAtomCount: prot.length, ligands: cfg.apo.apoAllowed.map((id) => ({ id, role: "cofactor", rationale: "apo 中保留的必需辅基" })),
      presentLigands: [...apo.het.keys()].filter((id) => id !== "HOH").map((id) => {
        const c = classify(id, cfg, "apo");
        return c ? { id, role: c.role, rationale: c.rationale } : { id, role: "modified", rationale: "共价修饰残基，按蛋白保留" };
      }),
      residueModifications: cfg.apo.modifiedResidues.map((id) => ({ id, note: "共价修饰残基，按蛋白保留" })),
      note: "游离态（apo）视图。",
    };
  }

  const holoProt = viewProt;
  const atomCount = holoProt.length + ligs.reduce((s, i) => s + i.atoms.length, 0);
  const files = {};
  for (const rel of [`${cfg.dir}/holo.pdb`, ...(cfg.mode === "two-state" ? [`${cfg.dir}/apo.pdb`] : []), ...Object.values(sdfNames).map((f) => `${cfg.dir}/${f}`), `${cfg.dir}/pocket.json`]) {
    const buf = readFileSync(join(OUTBASE, rel));
    files[rel.split("/")[1]] = { bytes: buf.length, gzipBytes: gzipSync(buf, { level: 9 }).length };
  }
  const meta = {
    stepId: cfg.id, stepName: cfg.name, assetVersion: "1.0.0",
    generatedAt: new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Shanghai" }).format(new Date()),
    provenance: "computed", mode: cfg.mode,
    domain: cfg.domain ?? null, focusResidues: focusRanges, focusLigandInstance: focusInstCfg,
    pocketCriteria: { distanceCutoffA: POCKET_CUTOFF, hbondCutoffA: HBOND_CUTOFF, waterCutoffA: WATER_CUTOFF, pocketRelevantRadiusA: POCKET_LIGAND_RADIUS, pocketRelevantContactA: POCKET_LIGAND_CONTACT },
    pdbId: cfg.holo.pdbId, species: cfg.holo.species, method: holo.method, resolution: holo.resolution,
    resolutionPerState: { holo: holo.resolution, apo: apoBlock?.resolution ?? null },
    atomCount, chainSelection: { chains: sel.chains, rule: Object.fromEntries(sel.rule) },
    ligands: holoLigs, caveats: cfg.caveats, files,
    holo: {
      pdbId: cfg.holo.pdbId, species: cfg.holo.species, method: holo.method, resolution: holo.resolution,
      chainSelection: { chains: sel.chains, rule: Object.fromEntries(sel.rule) }, atomCount,
      domain: cfg.domain ?? null, focusResidues: focusRanges, focusLigandInstance: focusInstCfg,
      proteinAtomCount: holoProt.length, ligands: holoLigs, filteredLigands: filtered,
      residueModifications: cfg.holo.modifiedResidues.map((id) => ({ id, note: "共价修饰残基，按蛋白保留" })),
      presentLigandsRaw: [...holo.het.keys()].filter((id) => id !== "HOH"),
    },
    apo: apoBlock,
  };
  writeFileSync(join(OUT, "meta.json"), JSON.stringify(meta, null, 2), "utf8");
  written.push(`${cfg.dir}/meta.json`);

  console.log(`  · holo ${cfg.holo.pdbId} 链[${sel.chains.join(",")}] 蛋白 ${holoProt.length} 原子，配体 ${ids.join("+")}，口袋 ${pocket.residues.length} 残基 / 氢键 ${pocket.hbonds.length}`);
  for (const [c, r] of sel.rule) console.log(`    链 ${c}：${r}`);
  for (const l of holoLigs) console.log(`    保留 ${l.id}(${l.role}) ${l.instances} 实例${l.pocketRelevant ? "，口袋相关" : "，口袋外"}，距主配体 ${l.minDistToPrimaryA} Å`);
  for (const f of filtered) console.log(`    滤除 ${f.id}(${f.role}) ${f.instances} 原子，距主配体 ${f.minDistToPrimaryLigand} Å`);
  if (apoBlock) console.log(`  · apo ${cfg.apo.pdbId} 链[${apoBlock.chainSelection.chains.join(",")}] 蛋白 ${apoBlock.proteinAtomCount} 原子`);
  return meta;
}

// ---------- 主流程 ----------
const todo = ONLY ? STEPS.filter((s) => s.id === ONLY) : STEPS;
if (!todo.length) fail(`--only ${ONLY} 未匹配（可用：${STEPS.map((s) => s.id).join(", ")}）`);

const manifestPath = join(OUTBASE, "manifest.json");
const manifest = existsSync(manifestPath) ? JSON.parse(readFileSync(manifestPath, "utf8")) : {};
for (const cfg of todo) {
  const m = await build(cfg);
  manifest[cfg.id] = {
    stepId: cfg.id, assetDir: cfg.dir, mode: cfg.mode, urlAlias: cfg.id,
    species: m.species, method: m.method, resolution: m.resolution,
    holo: "holo.pdb", apo: m.mode === "two-state" ? "apo.pdb" : null,
    ligands: m.ligands.map((l) => ({ id: l.id, name: l.name, role: l.role, sdf: l.sdfFile })),
    pocket: "pocket.json", meta: "meta.json", caveats: m.caveats,
  };
}
writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + "\n", "utf8");
written.push("manifest.json");

console.log("\n体积报告（原始 / gzip）：");
let over = false;
for (const rel of written) {
  const buf = readFileSync(join(OUTBASE, rel));
  const gz = gzipSync(buf, { level: 9 });
  if (gz.length > MAX_GZIP) over = true;
  console.log(`  ${rel.padEnd(30)} ${(buf.length / 1024).toFixed(1).padStart(9)} KB / ${(gz.length / 1024).toFixed(1).padStart(9)} KB${gz.length > MAX_GZIP ? "  ← 超限" : ""}`);
}
if (over) fail("存在 >5 MB(gzip) 资产");
console.log(`\n✓ 完成 ${todo.length} 步；manifest 现有 ${Object.keys(manifest).length} 条`);
