// ============================================================
// comparisonConfig —— "结构对照页"按 pathwayId 取配置
//
// 本轮口径（页头 2D/3D 整页开关，两种模式同一版式）：
//   · 每步右栏 = 左底物 → 箭头（这一步改了什么）→ 右产物；模式只换渲染方式（3D 球棍 / 2D 结构式）；
//   · 3D 资产的来源在分子角落逐条标注：实验坐标（PDB ID + 分辨率 + 物种）或计算构象（ETKDG+MMFF94），
//     两类绝不混标；2D 模式标注同一批原子，不另画圈；
//   · 变化原子按 name 标在图上（added=新增基团 / newbond=新键或换位 / leaving=离去基）；
//   · 糖酵解数据自 stepComparison.ts 原样搬入（块数/顺序/标注未改）；TCA 为本轮新增。
//
// 3D 资产：public/assets/ligands3d/<id>.json（tools/gen-molecule-assets.py 生成）
// 2D 资产：public/assets/structures/2d/<id>.json（RDKit 生成 + 既有手绘资产）
// 酶结构：public/assets/steps/<assetDir>（由 manifest.json 解析）；TCA 无酶资产，enzymePanel=false
// ============================================================

import type { MolPart, PartEvidence, StepComparison } from "./stepComparison";

/**
 * 证据字段的构造器（只写结构化事实，不写等级）：
 * 等级 A/B/C/D 一律由 evidenceGrade.ts 从 pocketRole + species + coordSource 推导。
 */
const evOwnHuman = (molId: string): PartEvidence => ({
  molId,
  coordSource: "experimental",
  pocketRole: "own",
  species: "human",
});
const evOwnNonhuman = (molId: string): PartEvidence => ({
  molId,
  coordSource: "experimental",
  pocketRole: "own",
  species: "nonhuman",
});
const evOtherHuman = (molId: string): PartEvidence => ({
  molId,
  coordSource: "experimental",
  pocketRole: "other",
  species: "human",
});
const evOtherNonhuman = (molId: string): PartEvidence => ({
  molId,
  coordSource: "experimental",
  pocketRole: "other",
  species: "nonhuman",
});
/** RDKit 计算构象：自由态，无实验坐标 */
const evComputed = (molId: string): PartEvidence => ({ molId, coordSource: "computed" });
/** 无 3D 坐标、只做 2D（CO₂ / HCO₃⁻） */
const evOnly2d = (molId: string): PartEvidence => ({ molId, coordSource: "none" });

/** 按通路取配置：块数、顺序、分子、mark、来源说明都在这里，组件不写死任何通路 */
export interface ComparisonConfig {
  pathwayId: string;
  /** 页头标题（h1） */
  title: string;
  /** 页头摘要（两种模式共用同一段文字，避免切换时页头高度变化） */
  summary: string;
  /** 页码记号，如 "PLATE 03" */
  plateNo: string;
  /** 返回挂图的链接 */
  back: { to: string; label: string };
  /** 返回行后的通路名 */
  backCaption: string;
  /** 本通路是否有酶 3D 结构资产；false 时左栏只给一行灰字声明 */
  enzymePanel: boolean;
  /** enzymePanel=false 时的灰字声明（配置字段，不写死在组件里） */
  enzymePanelOffNote: string;
  /** 页脚口径说明（来源分类、计算/实验分歧等） */
  footerNote: string;
  /** 默认模式的判据口径（阈值与拓扑条件；逐块命中数字写在 StepComparison.defaultModeRule） */
  defaultModePolicy: string;
  steps: StepComparison[];
}

const D2 = (id: string) => `/assets/structures/2d/${id}.json`;

const GLC = { id: "glc", name: "α-D-葡萄糖（GLC）", formula: "C₆H₁₂O₆", asset2d: D2("glc") };
const G6P = { id: "g6p", name: "6-磷酸葡萄糖（G6P）", formula: "C₆H₁₁O₉P", asset2d: D2("g6p") };
const F6P = { id: "f6p", name: "6-磷酸果糖（F6P）", formula: "C₆H₁₁O₉P", asset2d: D2("f6p") };
const FBP = { id: "fbp", name: "果糖-1,6-二磷酸（呋喃型）", formula: "C₆H₁₀O₁₂P₂", asset2d: D2("fbp") };
const FBP_LINEAR = {
  id: "fbp-linear",
  name: "果糖-1,6-二磷酸（线形，4ALD 结合态）",
  formula: "C₆H₁₀O₁₂P₂",
  asset2d: D2("fbp-linear"),
  caveat:
    "4ALD 晶体里结合的是线形构象（2FP），此处按结合态呈现，不是自由态呋喃环。键级来自模板，坐标为实验结构原值，键长偏长系晶体构象，未做几何纠正。",
};
const DHAP = {
  id: "dhap",
  name: "磷酸二羟丙酮（DHAP）",
  formula: "C₃H₅O₆P",
  asset2d: D2("dhap"),
  caveat: "键级来自模板，坐标为实验结构原值，键长偏长系晶体构象，未做几何纠正。",
};
const GAP = {
  id: "gap",
  name: "甘油醛-3-磷酸（GAP）",
  formula: "C₃H₅O₆P",
  asset2d: D2("gap"),
  caveat: "GAP 无实验配体坐标（1U8F 只结合 NAD），此形状为计算构象（自由态）。",
};
const BPG13 = {
  id: "bpg13",
  name: "1,3-二磷酸甘油酸（1,3-BPG）",
  formula: "C₃H₄O₁₀P₂",
  asset2d: D2("bpg13"),
  caveat:
    "展示形式：C1 羧基与磷酸成 mixed anhydride（酰基磷酸），按普通 C–O–P 单键绘制——高能键是热力学性质，不是另一种键型，画成特殊键型反而错。3D 为计算构象（无实验配体坐标），自由态下多磷酸链可能折叠，不冒充口袋里的伸展结合态。",
};
const PG3 = { id: "3pg", name: "3-磷酸甘油酸（3PG）", formula: "C₃H₄O₇P", asset2d: D2("3pg") };
const PG2 = { id: "2pg", name: "2-磷酸甘油酸（2PG）", formula: "C₃H₄O₇P", asset2d: D2("2pg") };
const PEP = { id: "pep", name: "磷酸烯醇式丙酮酸（PEP）", formula: "C₃H₂O₆P", asset2d: D2("pep") };
// 丙酮酸的 2D 沿用既有手绘资产 pyruvate.json（id 与 3D 的 pyr 不同：老资产被结构帧页 gk-10-f3 直接引用，
// 改名会打断单步页；此处只做显式映射，不复制一份同内容文件）。
const PYR = {
  id: "pyr",
  name: "丙酮酸",
  formula: "C₃H₃O₃",
  asset2d: "/assets/structures/2d/pyruvate.json",
  caveat: "丙酮酸无实验配体坐标（3UCD 只结合 2PG/PEP），此形状为计算构象（自由态），不是观测值。",
};

export const GLYCOLYSIS_COMPARISON: StepComparison[] = [
  {
    stepId: "gk-1",
    evidence: {
      substrate: [evOwnHuman("glc")],
      product: [evOwnHuman("g6p")],
    },
    index: 1,
    enzyme: "己糖激酶",
    isozyme: "HK1",
    equation: "葡萄糖 + ATP → 葡糖-6-磷酸 + ADP + H⁺",
    substrate: {
      name: "α-D-葡萄糖（GLC）",
      formula: "C₆H₁₂O₆",
      parts: [{ ...GLC, marks: [{ name: "C6", kind: "newbond", note: "C6–OH" }] }],
    },
    product: {
      name: "6-磷酸葡萄糖（G6P）",
      formula: "C₆H₁₁O₉P",
      parts: [
        {
          ...G6P,
          marks: [
            { name: "C6", kind: "newbond", note: "C6–O" },
            { name: "O6", kind: "newbond", note: "新酯氧" },
            { name: "P6", kind: "added", note: "γ-磷酸" },
          ],
        },
      ],
    },
    arrowLabel: "己糖激酶 · ATP 的 γ-磷酸转移",
    change:
      "只有 C6–OH 被磷酰化：新增 C6–O–P 磷酸酯键（3D 中砖红=新增的 P，青=新生成的 C6–O、O–P 键）；糖环构型与其余羟基不变。ATP 的腺苷与其余磷酸按本页口径不入画。",
    physiology: "第一次投入 ATP，把葡萄糖变成带负电的 G6P，锁进细胞、不再自由穿膜。",
  },
  {
    stepId: "gk-2",
    evidence: {
      substrate: [evOtherHuman("g6p")],
      product: [evOwnNonhuman("f6p")],
    },
    index: 2,
    enzyme: "磷酸葡萄糖异构酶",
    isozyme: "GPI",
    equation: "葡糖-6-磷酸 ⇌ 果糖-6-磷酸",
    substrate: {
      name: "6-磷酸葡萄糖（G6P）",
      formula: "C₆H₁₁O₉P",
      parts: [{ ...G6P, sourceNote: "取自人己糖激酶 HK1 PDB 1CZA（1.90 Å · X-ray · Homo sapiens · 链 A · 配体 G6P）——人源但非本步 GPI 口袋（且 1CZA 中 G6P 位于抑制位点）；实验坐标。", marks: [{ name: "C1", kind: "newbond", note: "醛基" }, { name: "C2", kind: "newbond", note: "醇" }] }],
    },
    product: {
      name: "6-磷酸果糖（F6P）",
      formula: "C₆H₁₁O₉P",
      parts: [{ ...F6P, sourceNote: "取自小鼠磷酸葡萄糖异构酶 GPI PDB 2CXS（1.50 Å · X-ray · Mus musculus · 链 A · 配体 F6P）——本步本酶（GPI）活性位点但非人源；实验坐标。", marks: [{ name: "C1", kind: "newbond", note: "醇" }, { name: "C2", kind: "newbond", note: "酮基" }] }],
    },
    arrowLabel: "GPI · C1–C2 异构化（醛糖→酮糖）",
    change: "羰基从 C1 移到 C2：醛糖（吡喃六元环）变成酮糖（呋喃五元环），C1 退为 CH₂OH；无原子增减，环的大小与形状随之一变。",
    physiology: "把醛糖与酮糖互变，为下一步的 C1 磷酸化准备酮糖底物。",
    defaultMode: "2d",
    defaultModeRule:
      "默认 2D 判据：重原子数同为 16；体积 190.2→192.1 Å³（ΔV +1.00%，≤2.5%）；拓扑改变（C1 羰基→C2 酮基，六元环→五元环）。3D 球棍看上去几乎没变，2D 才读得出醛糖→酮糖。",
  },
  {
    stepId: "gk-3",
    evidence: {
      substrate: [evOtherNonhuman("f6p")],
      product: [evOwnHuman("fbp")],
    },
    index: 3,
    enzyme: "磷酸果糖激酶-1",
    isozyme: "PFKL（肝型）",
    equation: "果糖-6-磷酸 + ATP → 果糖-1,6-二磷酸 + ADP + H⁺",
    substrate: {
      name: "6-磷酸果糖（F6P）",
      formula: "C₆H₁₁O₉P",
      parts: [{ ...F6P, sourceNote: "取自小鼠磷酸葡萄糖异构酶 GPI PDB 2CXS（1.50 Å · X-ray · Mus musculus · 链 A · 配体 F6P）——非本步 PFK-1 口袋，且非人源；实验坐标。", marks: [{ name: "C1", kind: "newbond", note: "C1–OH" }] }],
    },
    product: {
      name: "果糖-1,6-二磷酸（F1,6BP）",
      formula: "C₆H₁₀O₁₂P₂",
      parts: [
        {
          ...FBP,
          marks: [
            { name: "C1", kind: "newbond", note: "C1–O" },
            { name: "O1", kind: "newbond", note: "新酯氧" },
            { name: "P1", kind: "added", note: "第二个磷酸" },
          ],
        },
      ],
    },
    arrowLabel: "PFK-1 · C1 磷酰化（第二个磷酸基）",
    change: "C1–OH 接受 ATP 的 γ-磷酸，新增 C1 磷酸酯；分子变成两端各带一个磷酸的双磷酸糖，主轴长度明显增加。",
    physiology: "限速步骤：第一个真正决定糖酵解通量的不可逆调节点（ATP/柠檬酸抑制、AMP/F2,6BP 激活）。",
  },
  {
    stepId: "gk-4",
    evidence: {
      substrate: [evOwnHuman("fbp-linear")],
      product: [evOtherNonhuman("dhap"), evComputed("gap")],
    },
    index: 4,
    enzyme: "醛缩酶",
    isozyme: "ALDOA",
    equation: "果糖-1,6-二磷酸 ⇌ 甘油醛-3-磷酸 + 磷酸二羟丙酮",
    substrate: {
      name: "果糖-1,6-二磷酸（F1,6BP，线形）",
      formula: "C₆H₁₀O₁₂P₂",
      parts: [{ ...FBP_LINEAR, marks: [{ name: "C3", kind: "leaving", note: "断键位" }, { name: "C4", kind: "leaving", note: "断键位" }] }],
    },
    product: {
      name: "甘油醛-3-磷酸（GAP）＋ 磷酸二羟丙酮（DHAP）",
      formula: "两个 C₃H₅O₆P",
      parts: [
        { ...DHAP, sourceNote: "取自酿酒酵母磷酸丙糖异构酶 TPI PDB 1NEY（1.20 Å · X-ray · Saccharomyces cerevisiae · 链 A · 配体 DHAP）——非本步醛缩酶口袋，且非人源；实验坐标。", marks: [{ name: "C3", kind: "newbond", note: "新 CH₂OH" }] },
        { ...GAP, marks: [{ name: "C1", kind: "newbond", note: "新醛基" }] },
      ],
    },
    arrowLabel: "醛缩酶 · C3–C4 键断裂（一分为二）",
    change:
      "C3–C4 键断裂：六碳的 F1,6BP 裂成 DHAP（C1–C3 片段）与 GAP（C4–C6 片段）。产物侧两个 3D 分子并排显示，体积合计与底物同量级，但两个小分子的最大主轴长度都只有底物的一半左右。",
    physiology: "六碳糖裂成两个三碳糖，此后每步都按两分子计（产能也翻倍）。",
    defaultMode: "2d",
    defaultModeRule:
      "默认 2D 判据：重原子数同为 20；体积 246.4→243.0 Å³（ΔV −1.38%，≤2.5%）；拓扑改变（C3–C4 断裂，1 分子→2 分子）。主轴虽从 12.92→7.13 Å 变短，但两产物并排后 3D 仍像同一堆原子，2D 才读得出六碳裂成两个三碳。",
  },
  {
    stepId: "gk-5",
    evidence: {
      substrate: [evOwnNonhuman("dhap")],
      product: [evComputed("gap")],
    },
    index: 5,
    enzyme: "磷酸丙糖异构酶",
    isozyme: "TPI",
    equation: "磷酸二羟丙酮 ⇌ 甘油醛-3-磷酸",
    substrate: {
      name: "磷酸二羟丙酮（DHAP）",
      formula: "C₃H₅O₆P",
      parts: [{ ...DHAP, sourceNote: "取自酿酒酵母磷酸丙糖异构酶 TPI PDB 1NEY（1.20 Å · X-ray · Saccharomyces cerevisiae · 链 A · 配体 DHAP）——本步本酶（TPI）活性位点但非人源；实验坐标。", marks: [{ name: "C1", kind: "newbond", note: "醇" }, { name: "C2", kind: "newbond", note: "酮基" }] }],
    },
    product: {
      name: "甘油醛-3-磷酸（GAP）",
      formula: "C₃H₅O₆P",
      parts: [{ ...GAP, marks: [{ name: "C1", kind: "newbond", note: "醛基" }, { name: "C2", kind: "newbond", note: "C2 变 R" }] }],
    },
    arrowLabel: "TPI · 1,2-氢迁移",
    change: "C1–H 经烯二醇中间体迁移到 C2：酮基（C2=O）变成醛基（C1=O），C2 从前手性变为 R 构型；无原子增减，分子式不变，形状只发生局部扭转。",
    physiology: "只有 GAP 能继续走糖酵解；TPI 把 DHAP 不断拉成 GAP，使裂解产物全部可用。",
    defaultMode: "2d",
    defaultModeRule:
      "默认 2D 判据：重原子数同为 10；体积 121.5→121.5 Å³（ΔV +0.00%，≤2.5%）；拓扑改变（C1=O↔C2=O，酮糖↔醛糖）。3D 只看到局部扭转，2D 上羰基换位一目了然。",
  },
  {
    stepId: "gk-6",
    evidence: {
      substrate: [evComputed("gap")],
      product: [evComputed("bpg13")],
    },
    index: 6,
    enzyme: "甘油醛-3-磷酸脱氢酶",
    isozyme: "GAPDH",
    equation: "甘油醛-3-磷酸 + Pi + NAD⁺ ⇌ 1,3-二磷酸甘油酸 + NADH + H⁺",
    substrate: {
      name: "甘油醛-3-磷酸（GAP）",
      formula: "C₃H₅O₆P",
      parts: [{ ...GAP, marks: [{ name: "C1", kind: "newbond", note: "C1 醛基" }] }],
    },
    product: {
      name: "1,3-二磷酸甘油酸（1,3-BPG）",
      formula: "C₃H₄O₁₀P₂",
      parts: [
        {
          ...BPG13,
          marks: [
            { name: "C1", kind: "newbond", note: "C1–O" },
            { name: "O1", kind: "newbond", note: "酰基磷酸氧" },
            { name: "P1", kind: "added", note: "Pi 加成的磷酸" },
          ],
        },
      ],
    },
    arrowLabel: "GAPDH · NAD⁺/Pi · 氧化 + 磷酸化",
    change: "C1 醛基被氧化为酰基磷酸（新增 C1–O–P 高能键，同时 C1 由 C=O 变为 C–O）；NAD⁺ 接受氢负变成 NADH。分子末端多出一个磷酸，形状向一侧明显伸出。",
    physiology: "第一次氧化还原：把醛氧化成高能酰基磷酸，为下一步底物水平磷酸化储备能量。",
  },
  {
    stepId: "gk-7",
    evidence: {
      substrate: [evComputed("bpg13")],
      product: [evOwnHuman("3pg")],
    },
    index: 7,
    enzyme: "磷酸甘油酸激酶",
    isozyme: "PGK1",
    equation: "1,3-二磷酸甘油酸 + ADP ⇌ 3-磷酸甘油酸 + ATP",
    substrate: {
      name: "1,3-二磷酸甘油酸（1,3-BPG）",
      formula: "C₃H₄O₁₀P₂",
      parts: [{ ...BPG13, marks: [{ name: "C1", kind: "leaving", note: "离开的磷酰基" }, { name: "O1", kind: "leaving" }, { name: "P1", kind: "leaving" }] }],
    },
    product: {
      name: "3-磷酸甘油酸（3PG）",
      formula: "C₃H₄O₇P",
      parts: [{ ...PG3, marks: [{ name: "C1", kind: "newbond", note: "回到羧酸" }] }],
      cofactorNote: "ATP 为辅因子，按 gk-1 同一口径不入画：产物侧只显示碳骨架 3PG 的形状。",
    },
    arrowLabel: "PGK · 磷酰基转移（1,3-BPG → ADP）",
    change: "C1 酰基磷酸的磷酰基转移给 ADP：C1 回到羧酸（3PG），ADP 变 ATP；碳骨架不变，分子体积与主轴长度因失去一个磷酸而缩小。",
    physiology: "第一次底物水平磷酸化，净赚 1 个 ATP（两分子三碳糖共 2 ATP）。",
  },
  {
    stepId: "gk-8",
    evidence: {
      substrate: [evOtherHuman("3pg")],
      product: [evOtherHuman("2pg")],
    },
    index: 8,
    enzyme: "磷酸甘油酸变位酶",
    isozyme: "PGAM1",
    equation: "3-磷酸甘油酸 ⇌ 2-磷酸甘油酸",
    substrate: {
      name: "3-磷酸甘油酸（3PG）",
      formula: "C₃H₄O₇P",
      parts: [{ ...PG3, sourceNote: "取自人磷酸甘油酸激酶 PGK1 PDB 9FDN（1.58 Å · X-ray · Homo sapiens · 链 A · 配体 3PG）——人源但非本步 PGAM 口袋；实验坐标。", marks: [{ name: "C3", kind: "newbond", note: "磷酸离开 C3" }, { name: "P3", kind: "newbond" }] }],
    },
    product: {
      name: "2-磷酸甘油酸（2PG）",
      formula: "C₃H₄O₇P",
      parts: [{ ...PG2, sourceNote: "取自人烯醇化酶 ENO2 PDB 3UCD（1.41 Å · X-ray · Homo sapiens · 链 A · 配体 2PG）——人源但非本步 PGAM 口袋；实验坐标。", marks: [{ name: "C2", kind: "newbond", note: "磷酸落到 C2" }, { name: "P2", kind: "newbond" }] }],
    },
    arrowLabel: "PGAM · 磷酸基 C3→C2 迁移",
    change: "磷酰基从 C3–O3 迁移到 C2–O2（经磷酰化组氨酸中间体）：原子组成不变，只换连接位置——3D 里表现为磷酸基贴着碳链平移了一段。",
    physiology: "把磷酸基挪到 C2，为下一步烯醇化酶脱水生成高能烯醇磷酸做准备。",
    defaultMode: "2d",
    defaultModeRule:
      "默认 2D 判据：重原子数同为 11；体积 126.2→126.0 Å³（ΔV −0.16%，≤2.5%）；拓扑改变（磷酸从 C3–O3 换到 C2–O2）。3D 里只是磷酸基贴着碳链平移，2D 上位置清楚。",
  },
  {
    stepId: "gk-9",
    evidence: {
      substrate: [evOwnHuman("2pg")],
      product: [evOwnHuman("pep")],
    },
    index: 9,
    enzyme: "烯醇化酶",
    isozyme: "ENO2（神经元型）",
    equation: "2-磷酸甘油酸 ⇌ 磷酸烯醇式丙酮酸 + H₂O",
    substrate: {
      name: "2-磷酸甘油酸（2PG）",
      formula: "C₃H₄O₇P",
      parts: [{ ...PG2, marks: [{ name: "C3", kind: "leaving", note: "OH 与 H 以 H₂O 脱去" }] }],
    },
    product: {
      name: "磷酸烯醇式丙酮酸（PEP）",
      formula: "C₃H₂O₆P",
      parts: [{ ...PEP, marks: [{ name: "C2", kind: "newbond", note: "C2=C3" }, { name: "C3", kind: "newbond", note: "C2=C3" }] }],
    },
    arrowLabel: "烯醇化 · 脱水（− H₂O）",
    change: "C3–OH 与 C2–H 以 H₂O 脱去，C2=C3 双键生成；磷酸基始终酯化在 C2（从 2PG 到 PEP 未换位置）。原子数减少，分子更扁平。",
    physiology: "脱水把 2PG 的低能磷酸酯抬成 PEP 的高能烯醇磷酸，为下一步产 ATP 提供驱动力。",
  },
  {
    stepId: "gk-10",
    evidence: {
      substrate: [evOtherHuman("pep")],
      product: [evComputed("pyr")],
    },
    index: 10,
    enzyme: "丙酮酸激酶",
    isozyme: "PKL（肝型）",
    equation: "磷酸烯醇式丙酮酸 + ADP + H⁺ → 丙酮酸 + ATP",
    substrate: {
      name: "磷酸烯醇式丙酮酸（PEP）",
      formula: "C₃H₂O₆P",
      parts: [{ ...PEP, sourceNote: "取自人烯醇化酶 ENO2 PDB 3UCD（1.41 Å · X-ray · Homo sapiens · 链 A · 配体 PEP）——人源但非本步丙酮酸激酶口袋；实验坐标。", marks: [{ name: "P2", kind: "leaving", note: "磷酰基转移给 ADP" }, { name: "C2", kind: "newbond", note: "C2=C3 消失" }, { name: "C3", kind: "newbond" }] }],
    },
    product: {
      name: "丙酮酸",
      formula: "C₃H₃O₃",
      parts: [{ ...PYR, marks: [{ name: "C1", kind: "newbond", note: "羧酸" }, { name: "C2", kind: "newbond", note: "C2=O" }, { name: "C3", kind: "newbond", note: "甲基" }] }],
      cofactorNote: "ATP 为辅因子，按 gk-1 同一口径不入画：产物侧只显示丙酮酸的形状。",
    },
    arrowLabel: "PK · 磷酰基转移 + 烯醇→酮式互变异构",
    change: "PEP 的磷酰基转移给 ADP 生成 ATP；烯醇式丙酮酸的 C2=C3 随即自发互变异构为酮式（C2=O、C3 甲基），双键消失。分子去掉了整个磷酸基，体积明显缩小。",
    physiology: "第二次底物水平磷酸化，糖酵解收尾并锁定净产 2 ATP / 2 丙酮酸。",
  },
];

// ------------------------------------------------------------
// TCA（柠檬酸循环）：9 个有机酸 + 接驳步 PDH，共 9 块
//
// 实体名以 src/data/tca.json 为准。九个有机酸的 3D 资产全部来自 RCSB 实验配体络合物
// （tools/fetch-tca-ligands.py 取 HETATM 实测坐标），不是 RDKit 自由态构象；本轮按
// “TCA 本酶优先、能换就换”（同分子 + ≤2.5 Å + X-ray/cryo-EM）替换 4 个、保留 5 个，
// 每个分子都带 sourceNote（首屏可见的来源蛋白说明），不靠角标藏备注。
// 接驳步底物丙酮酸（共享糖酵解资产）不在九分子清单内，仍为计算构象，页面如实标「自由态」。
// 乙酰-CoA / 琥珀酰-CoA 是大分子，仍按「分块呈现」：只画反应端 + 硫酯 S，
// S 右侧接一个碳作为 CoA 链折线起点并标「CoA 略」；说明里写明完整配体来源与省略部分。
// ------------------------------------------------------------
const ACCOA = {
  id: "accoa",
  name: "乙酰-CoA（分块：乙酰基 + 硫酯 S）",
  formula: "C₃H₆OS 片段",
  asset2d: D2("accoa"),
  caveat:
    "分块呈现，不是完整分子：只画反应端（乙酰基 + 硫酯 S）。实验坐标取自 8ZW1 的完整乙酰-CoA（配体 ACO，链 B，2.10 Å，人 CS 与 OAA/柠檬酸共结晶的三元反应中间态，CoA 完整，51 重原子）：只保留反应端实测几何，CoA 长链省略；S 右侧的碳仅作 CoA 折线起点并标「CoA 略」，不代表完整 CoA。完整乙酰-CoA 为 C₂₃H₃₆N₇O₁₇P₃S。",
  sourceNote:
    "取自人柠檬酸合酶（CS，TCA 第 1 步）的三元反应中间态 PDB 8ZW1（2.10 Å · X-ray · Homo sapiens · 链 B · 配体 ACO · 完整 CoA 51 重原子）——乙酰-CoA 与 OAA、柠檬酸共结晶，正是本步的底物口袋；本页只画反应端。",
};
const OAA = {
  id: "oaa", name: "草酰乙酸（OAA）", formula: "C₄H₂O₅", asset2d: D2("oaa"),
  caveat: "实验坐标来自 8ZVW（人柠檬酸合酶，链 A，配体 OAA，1.82 Å）；按实测酮式呈现，自由态烯醇式不混标。",
  sourceNote:
    "取自人柠檬酸合酶（CS，TCA 第 1 步）PDB 8ZVW（1.82 Å · X-ray · Homo sapiens · 链 A · 配体 OAA）——本步生理底物直接结合在活性位点，与 CoA 共结晶。",
};
const CIT = {
  id: "cit", name: "柠檬酸", formula: "C₆H₅O₇", asset2d: D2("cit"),
  caveat: "实验坐标来自 8ZVV（人柠檬酸合酶 CS，链 A，配体 CIT，1.59 Å）：本轮由非本酶的 ACLY 3MWD 换到本步酶口袋，柠檬酸为产物结合态。",
  sourceNote:
    "取自人柠檬酸合酶（CS，TCA 第 1 步）PDB 8ZVV（1.59 Å · X-ray · Homo sapiens · 链 A · 配体 CIT）——本步产物直接结合在活性位点；本轮由 ACLY（3MWD）换到本酶。",
};
const ICIT = {
  id: "icit", name: "异柠檬酸", formula: "C₆H₅O₇", asset2d: D2("icit"),
  caveat: "实验坐标来自 5H3E（小鼠线粒体 IDH2 K256Q，链 A，配体 ICT，2.21 Å）：人源线粒体 IDH2/IDH3 的 ICT 络合物 ≤2.5 Å 未获，本轮由胞质 IDH1 6PAY 换到线粒体 IDH2。生理底物为 (2R,3S)-异柠檬酸，模板按该构型建模。",
  sourceNote:
    "取自小鼠线粒体异柠檬酸脱氢酶 IDH2 K256Q（TCA 第 3 步）PDB 5H3E（2.21 Å · X-ray · Mus musculus · 链 A · 配体 ICT）——同酶但非人源、且带 K256Q 突变；人源线粒体 IDH2/IDH3 的 ICT 络合物 ≤2.5 Å 未获，本轮由胞质 IDH1（6PAY）换到线粒体 IDH2。",
};
const AKG = {
  id: "akg", name: "α-酮戊二酸（α-KG）", formula: "C₅H₄O₅", asset2d: D2("akg"),
  caveat: "实验坐标来自 5I95（人 IDH2 R140Q，链 A，配体 AKG，1.54 Å）；按实测酮式呈现，水合形式不入画。",
  sourceNote:
    "取自人线粒体异柠檬酸脱氢酶 IDH2 R140Q（TCA 第 3 步）PDB 5I95（1.54 Å · X-ray · Homo sapiens · 链 A · 配体 AKG）——本步产物结合在活性位点；R140Q 突变体会移动构象平衡，配体几何按实测。",
};
const SUCOA = {
  id: "succoa",
  name: "琥珀酰-CoA（分块：琥珀酰基 + 硫酯 S）",
  formula: "C₅H₇O₃S 片段",
  asset2d: D2("succoa"),
  caveat:
    "分块呈现，不是完整分子：只画反应端（琥珀酰基 + 硫酯 S）。实验坐标取自 8P5V 的完整琥珀酰-CoA（配体 SCA，链 A，2.07 Å，cryo-EM，谷氨酸棒杆菌 OGDH E1/E2）：只保留反应端实测几何，CoA 长链省略；S 右侧的碳仅作 CoA 折线起点并标「CoA 略」。完整琥珀酰-CoA 为 C₂₅H₃₈N₇O₁₉P₃S。",
  sourceNote:
    "取自谷氨酸棒杆菌 2-酮戊二酸脱氢酶 E1/E2 复合体（TCA 第 4 步产物释放位点）PDB 8P5V（2.07 Å · cryo-EM · Corynebacterium glutamicum · 链 A · 配体 SCA）——TCA 酶口袋，但不是人源、也不是下游 SUCL；人源 SUCL/OGDH 的琥珀酰-CoA 络合物 ≤2.5 Å 未获，本轮由 GCN5（5TRL）换到 OGDH。完整 CoA 在结构里，本页只画反应端。",
};
const SUC = {
  id: "suc", name: "琥珀酸", formula: "C₄H₄O₄", asset2d: D2("suc"),
  caveat: "实验坐标来自 7MSS（人 SUCL，链 B，配体 SIN，1.75 Å）；平面骨架，实测几何与自由态接近。",
  sourceNote:
    "取自人琥珀酰-CoA 合成酶 SUCL（TCA 第 5 步）PDB 7MSS（1.75 Å · X-ray · Homo sapiens · 链 B · 配体 SIN）——本步酶（SDH）口袋内同分子 ≤2.5 Å 结构未获，坐标取自相邻的 SUCL；琥珀酸为 SUCL 产物结合态。",
};
const FUM = {
  id: "fum", name: "延胡索酸（反式）", formula: "C₄H₂O₄", asset2d: D2("fum"),
  caveat: "实验坐标来自 9BPW（金黄色葡萄球菌 FumC，链 A，配体 FUM，2.00 Å）：本轮由非本酶的 ME2 变构位点 1PJ3 换到本步酶 FH 活性位点；人源 FH 的 FUM 络合物 ≤2.5 Å 未获，故为微生物同酶。反式双键为平面，构象几乎刚性。",
  sourceNote:
    "取自金黄色葡萄球菌 II 型延胡索酸酶 FumC（TCA 第 7 步）PDB 9BPW（2.00 Å · X-ray · Staphylococcus aureus · 链 A · 配体 FUM）——本步酶活性位点；人源 FH 的 FUM 络合物 ≤2.5 Å 未获，本轮由 ME2 变构位点（1PJ3）换到本酶。",
};
const MAL = {
  id: "mal", name: "L-苹果酸", formula: "C₄H₄O₅", asset2d: D2("mal"),
  caveat: "实验坐标来自 2DFD（人 MDH2，链 A，配体 LMR，1.90 Å）；LMR 即 (2S)-L-苹果酸（不是 D 型 MLT）。",
  sourceNote:
    "取自人线粒体苹果酸脱氢酶 MDH2（TCA 第 8 步）PDB 2DFD（1.90 Å · X-ray · Homo sapiens · 链 A · 配体 LMR）——本步产物直接结合在活性位点。",
};

const TCA_COMPARISON: StepComparison[] = [
  {
    stepId: "tca-pdh",
    evidence: {
      substrate: [evComputed("pyr")],
      product: [evOtherHuman("accoa")],
    },
    index: 0,
    stageLabel: "接驳步",
    enzyme: "丙酮酸脱氢酶复合体",
    isozyme: "PDH（E1-E2-E3）",
    equation: "丙酮酸 + CoA-SH + NAD⁺ → 乙酰-CoA + CO₂ + NADH + H⁺",
    substrate: {
      name: "丙酮酸",
      formula: "C₃H₃O₃",
      parts: [{ ...PYR, marks: [{ name: "C1", kind: "leaving", note: "脱羧为 CO₂" }] }],
    },
    product: {
      name: "乙酰-CoA（分块）",
      formula: "C₂₃H₃₆N₇O₁₇P₃S（分块显示）",
      parts: [
        {
          ...ACCOA,
          sourceNote:
            "取自人柠檬酸合酶（CS，TCA 第 1 步）三元反应中间态 PDB 8ZW1（2.10 Å · X-ray · Homo sapiens · 链 B · 配体 ACO · 完整 CoA 51 重原子）——是 CS 的底物口袋，不是本步 PDH 口袋；人源 PDH 的乙酰-CoA 络合物 ≤2.5 Å 未获；本轮由 ACLY（3MWD）换到 CS。本页只画反应端。",
          caveat:
            "分块呈现：只画乙酰基 + 硫酯 S。实验坐标来自 8ZW1（人 CS，链 B，2.10 Å）——CS 的底物口袋，不是本步 PDH；CoA 长链省略。",
          marks: [
            { name: "C1", kind: "newbond", note: "新硫酯羰基" },
            { name: "S", kind: "added", note: "CoA 硫醇进入" },
          ],
        },
      ],
      cofactorNote: "NAD⁺ / TPP / 硫辛酸等辅因子按本页口径不入画；产物只显示乙酰基与硫酯 S（分块）。",
    },
    arrowLabel: "PDH · 氧化脱羧，把丙酮酸接进 TCA",
    change: "丙酮酸的 C1 脱羧放出 CO₂，剩余乙酰基与 CoA 的硫醇形成硫酯，进入柠檬酸循环。",
    physiology: "把糖酵解的终产物转成 TCA 的入口燃料；这是 TCA 的接驳步，不属于环内八步。",
  },
  {
    stepId: "tca-1",
    evidence: {
      substrate: [evOwnHuman("accoa"), evOwnHuman("oaa")],
      product: [evOwnHuman("cit")],
    },
    index: 1,
    enzyme: "柠檬酸合酶",
    isozyme: "CS",
    equation: "乙酰-CoA + 草酰乙酸 + H₂O → 柠檬酸 + CoA-SH",
    substrate: {
      name: "乙酰-CoA + 草酰乙酸",
      formula: "C₂₃H₃₆N₇O₁₇P₃S + C₄H₂O₅（分块显示）",
      parts: [
        {
          ...ACCOA,
          marks: [
            { name: "C1", kind: "newbond", note: "乙酰羰基" },
            { name: "C2", kind: "newbond", note: "乙酰甲基" },
          ],
        },
        { ...OAA, marks: [{ name: "C3", kind: "newbond", note: "缩合中心" }] },
      ],
    },
    product: {
      name: "柠檬酸",
      formula: "C₆H₅O₇",
      parts: [
        {
          ...CIT,
          marks: [
            { name: "C4", kind: "newbond", note: "乙酰甲基落位" },
            { name: "C6", kind: "newbond", note: "乙酰羰基成羧基" },
            { name: "C3", kind: "newbond", note: "新 C–C 键" },
          ],
        },
      ],
    },
    arrowLabel: "CS · 乙酰基的两个碳并入草酰乙酸",
    change: "乙酰基的两个碳（C1 羰基、C2 甲基）与草酰乙酸的酮碳 C3 缩合，生成六碳的柠檬酸；CoA-SH 释放。",
    physiology: "TCA 的起手缩合：把二碳的乙酰基接上四碳的草酰乙酸，六碳骨架由此建立。",
  },
  {
    stepId: "tca-2",
    evidence: {
      substrate: [evOtherHuman("cit")],
      product: [evOtherNonhuman("icit")],
    },
    index: 2,
    enzyme: "乌头酸酶",
    isozyme: "ACO2（线粒体）",
    equation: "柠檬酸 ⇌ 顺乌头酸 ⇌ 异柠檬酸",
    substrate: {
      name: "柠檬酸",
      formula: "C₆H₅O₇",
      parts: [
        {
          ...CIT,
          sourceNote:
            "取自人柠檬酸合酶（CS，TCA 第 1 步）PDB 8ZVV（1.59 Å · X-ray · Homo sapiens · 链 A · 配体 CIT）——是 CS 的产物结合态，不是本步乌头酸酶（ACO2）口袋；人源 ACO2 的 CIT 络合物 ≤2.5 Å 未获；本轮由 ACLY（3MWD）换到 CS。",
          caveat: "实验坐标来自 8ZVV（人 CS，链 A，配体 CIT，1.59 Å）——非本步乌头酸酶口袋。",
          marks: [
            { name: "C2", kind: "newbond", note: "H 转移" },
            { name: "C3", kind: "newbond", note: "OH 离开" },
          ],
        },
      ],
    },
    product: {
      name: "异柠檬酸",
      formula: "C₆H₅O₇",
      parts: [
        {
          ...ICIT,
          sourceNote:
            "取自小鼠线粒体异柠檬酸脱氢酶 IDH2 K256Q（TCA 第 3 步）PDB 5H3E（2.21 Å · X-ray · Mus musculus · 链 A · 配体 ICT）——是 IDH2 的底物结合态，非人源、非本步乌头酸酶；人源 ACO2 的 ICT 络合物 ≤2.5 Å 未获。",
          caveat:
            "实验坐标来自 5H3E（小鼠 IDH2，链 A，2.21 Å）——非人源、非本步乌头酸酶；生理底物为 (2R,3S)-异柠檬酸，模板按该构型建模。",
          marks: [
            { name: "C2", kind: "newbond", note: "OH 落位" },
            { name: "C3", kind: "newbond", note: "H 转移" },
          ],
        },
      ],
    },
    arrowLabel: "ACO · 脱水-再水合，-OH 从 C3 挪到 C2",
    change: "先脱水成顺乌头酸、再水合，羟基从柠檬酸的中央碳 C3 移到 C2；分子式不变，只是基团换位。",
    physiology: "为下一步氧化脱羧把羟基摆到可氧化的位置；柠檬酸与异柠檬酸只差一个羟基位置。",
    defaultMode: "2d",
    defaultModeRule:
      "默认 2D 判据：重原子数同为 13；体积 143.0→143.4 Å³（ΔV +0.28%，≤2.5%）；拓扑改变（羟基从中央碳 C3 移到 C2）。3D 球棍几乎同形，2D 上羟基换位才可读。",
  },
  {
    stepId: "tca-3",
    evidence: {
      substrate: [evOwnNonhuman("icit")],
      product: [evOwnHuman("akg")],
    },
    index: 3,
    enzyme: "异柠檬酸脱氢酶",
    isozyme: "IDH3 / IDH2",
    equation: "异柠檬酸 + NAD(P)⁺ → α-酮戊二酸 + CO₂ + NAD(P)H + H⁺",
    substrate: {
      name: "异柠檬酸",
      formula: "C₆H₅O₇",
      parts: [
        {
          ...ICIT,
          marks: [
            { name: "C1", kind: "leaving", note: "脱羧为 CO₂" },
            { name: "C2", kind: "newbond", note: "C2 氧化为酮" },
          ],
        },
      ],
    },
    product: {
      name: "α-酮戊二酸",
      formula: "C₅H₄O₅",
      parts: [
        {
          ...AKG,
          marks: [
            { name: "C4", kind: "newbond", note: "新酮基" },
            { name: "C1", kind: "newbond", note: "新羧基" },
          ],
        },
      ],
    },
    arrowLabel: "IDH · 氧化 + 脱羧（TCA 第一个 CO₂）",
    change: "C2 的羟基氧化为酮，随后 C1 羧基脱羧放出 CO₂，六碳变五碳，生成 α-酮戊二酸。",
    physiology: "TCA 第一次产能性脱羧，NADH/NADPH 与 CO₂ 同时产出。",
  },
  {
    stepId: "tca-4",
    evidence: {
      substrate: [evOtherHuman("akg")],
      product: [evOwnNonhuman("succoa")],
    },
    index: 4,
    enzyme: "α-酮戊二酸脱氢酶复合体",
    isozyme: "α-KGDH（E1-E2-E3）",
    equation: "α-酮戊二酸 + CoA-SH + NAD⁺ → 琥珀酰-CoA + CO₂ + NADH + H⁺",
    substrate: {
      name: "α-酮戊二酸",
      formula: "C₅H₄O₅",
      parts: [
        {
          ...AKG,
          sourceNote:
            "取自人线粒体异柠檬酸脱氢酶 IDH2 R140Q（TCA 第 3 步）PDB 5I95（1.54 Å · X-ray · Homo sapiens · 链 A · 配体 AKG）——是 IDH2 的产物结合态，不是本步 α-KGDH 口袋；人源 KGDH 的 AKG 络合物 ≤2.5 Å 未获。",
          caveat: "实验坐标来自 5I95（人 IDH2，链 A，1.54 Å）——非本步 α-KGDH 口袋；按实测酮式呈现。",
          marks: [
            { name: "C1", kind: "leaving", note: "脱羧为 CO₂" },
            { name: "C4", kind: "newbond", note: "C4 成硫酯羰基" },
          ],
        },
      ],
    },
    product: {
      name: "琥珀酰-CoA（分块）",
      formula: "C₂₅H₃₈N₇O₁₉P₃S（分块显示）",
      parts: [
        {
          ...SUCOA,
          marks: [
            { name: "C1", kind: "newbond", note: "新硫酯羰基" },
            { name: "S", kind: "added", note: "CoA 硫醇进入" },
          ],
        },
      ],
    },
    arrowLabel: "α-KGDH · 氧化脱羧 + 硫酯化（TCA 第二个 CO₂）",
    change: "α-KG 脱羧放出 CO₂，剩余琥珀酰基与 CoA 形成高能硫酯；这是 TCA 第二步产能性脱羧。",
    physiology: "与 PDH 同构的复合体，产出 NADH 与高能硫酯，为下一步底物水平磷酸化储备能量。",
  },
  {
    stepId: "tca-5",
    evidence: {
      substrate: [evOtherNonhuman("succoa")],
      product: [evOwnHuman("suc")],
    },
    index: 5,
    enzyme: "琥珀酰-CoA 合成酶",
    isozyme: "SUCLG1/2",
    equation: "琥珀酰-CoA + GDP + Pi → 琥珀酸 + GTP + CoA-SH",
    substrate: {
      name: "琥珀酰-CoA（分块）",
      formula: "C₂₅H₃₈N₇O₁₉P₃S（分块显示）",
      parts: [
        {
          ...SUCOA,
          marks: [
            { name: "C1", kind: "newbond", note: "硫酯水解" },
            { name: "S", kind: "leaving", note: "CoA-SH 离去" },
          ],
        },
      ],
    },
    product: {
      name: "琥珀酸",
      formula: "C₄H₄O₄",
      parts: [{ ...SUC, marks: [{ name: "C1", kind: "newbond", note: "新羧基" }] }],
    },
    arrowLabel: "SUCL · 硫酯水解，能量转给 GDP",
    change: "硫酯水解释放的能量用来把 GDP 磷酸化成 GTP；琥珀酰基变成琥珀酸，CoA-SH 离去。",
    physiology: "TCA 唯一的底物水平磷酸化：高能硫酯直接换成 GTP（可再转成 ATP）。",
  },
  {
    stepId: "tca-6",
    evidence: {
      substrate: [evOtherHuman("suc")],
      product: [evOtherNonhuman("fum")],
    },
    index: 6,
    enzyme: "琥珀酸脱氢酶",
    isozyme: "SDH（复合体 II）",
    equation: "琥珀酸 + FAD → 延胡索酸 + FADH₂",
    substrate: {
      name: "琥珀酸",
      formula: "C₄H₄O₄",
      parts: [
        {
          ...SUC,
          marks: [
            { name: "C2", kind: "newbond", note: "C2=C3" },
            { name: "C3", kind: "newbond", note: "C2=C3" },
          ],
        },
      ],
    },
    product: {
      name: "延胡索酸",
      formula: "C₄H₂O₄",
      parts: [
        {
          ...FUM,
          sourceNote:
            "取自金黄色葡萄球菌 II 型延胡索酸酶 FumC（TCA 第 7 步）PDB 9BPW（2.00 Å · X-ray · Staphylococcus aureus · 链 A · 配体 FUM）——是 FumC 的活性位点，不是本步 SDH 口袋；非人源；人源 FH 的 FUM 络合物 ≤2.5 Å 未获；本轮由 ME2 变构位点（1PJ3）换到微生物 FumC。",
          caveat: "实验坐标来自 9BPW（金黄色葡萄球菌 FumC，链 A，2.00 Å）——非人源、非本步 SDH；反式双键为平面。",
          marks: [
            { name: "C2", kind: "newbond", note: "C2=C3" },
            { name: "C3", kind: "newbond", note: "C2=C3" },
          ],
        },
      ],
    },
    arrowLabel: "SDH · 脱氢生成反式 C=C",
    change: "C2–C3 脱去一对氢，生成反式双键；四个碳的骨架从单键变成平面双键。",
    physiology: "TCA 里唯一嵌在内膜上的酶（复合体 II），FADH₂ 直接进电子传递链。",
  },
  {
    stepId: "tca-7",
    evidence: {
      substrate: [evOwnNonhuman("fum")],
      product: [evOtherHuman("mal")],
    },
    index: 7,
    enzyme: "延胡索酸酶",
    isozyme: "FH（线粒体）",
    equation: "延胡索酸 + H₂O → L-苹果酸",
    substrate: {
      name: "延胡索酸",
      formula: "C₄H₂O₄",
      parts: [
        {
          ...FUM,
          marks: [
            { name: "C2", kind: "newbond", note: "水合位" },
            { name: "C3", kind: "newbond", note: "水合位" },
          ],
        },
      ],
    },
    product: {
      name: "L-苹果酸",
      formula: "C₄H₄O₅",
      parts: [
        {
          ...MAL,
          sourceNote:
            "取自人线粒体苹果酸脱氢酶 MDH2（TCA 第 8 步）PDB 2DFD（1.90 Å · X-ray · Homo sapiens · 链 A · 配体 LMR）——是 MDH2 的产物结合态，不是本步延胡索酸酶口袋；人源 FH 的 MAL 络合物 ≤2.5 Å 未获。",
          caveat: "实验坐标来自 2DFD（人 MDH2，链 A，1.90 Å）——非本步延胡索酸酶口袋；LMR 为 (2S)-L-苹果酸。",
          marks: [
            { name: "C2", kind: "newbond", note: "新 OH" },
            { name: "C3", kind: "newbond", note: "新 H" },
          ],
        },
      ],
    },
    arrowLabel: "FH · 反式水合，C=C 变 C–OH",
    change: "水分子反式加成到双键：C2 得到羟基、C3 得到氢，生成 L-苹果酸。",
    physiology: "把双键水化成可氧化的仲醇，为下一步闭环再生草酰乙酸做准备。",
  },
  {
    stepId: "tca-8",
    evidence: {
      substrate: [evOwnHuman("mal")],
      product: [evOtherHuman("oaa")],
    },
    index: 8,
    enzyme: "苹果酸脱氢酶",
    isozyme: "MDH2",
    equation: "L-苹果酸 + NAD⁺ → 草酰乙酸 + NADH + H⁺",
    substrate: {
      name: "L-苹果酸",
      formula: "C₄H₄O₅",
      parts: [{ ...MAL, marks: [{ name: "C2", kind: "newbond", note: "C2 氧化为酮" }] }],
    },
    product: {
      name: "草酰乙酸",
      formula: "C₄H₂O₅",
      parts: [
        {
          ...OAA,
          sourceNote:
            "取自人柠檬酸合酶（CS，TCA 第 1 步）PDB 8ZVW（1.82 Å · X-ray · Homo sapiens · 链 A · 配体 OAA）——是 CS 的底物口袋，不是本步 MDH2 口袋；人源 MDH2 的 OAA 络合物 ≤2.5 Å 未获。",
          caveat: "实验坐标来自 8ZVW（人 CS，链 A，1.82 Å）——非本步 MDH2 口袋；按实测酮式呈现。",
          marks: [{ name: "C3", kind: "newbond", note: "新酮基" }],
        },
      ],
    },
    arrowLabel: "MDH · 氧化，闭环再生 OAA",
    change: "C2 的羟基氧化为酮，L-苹果酸变回草酰乙酸；四碳骨架回到第 1 步的起始物。",
    physiology: "闭环的最后一步：再生草酰乙酸，TCA 才能继续转；同时产出 NADH。",
  },
];

const GLYCOLYSIS_CONFIG: ComparisonConfig = {
  pathwayId: "glycolysis",
  title: "糖酵解 · 结构对照",
  summary:
    "十步逐步对照：左为酶的静态 3D 结构，只回答「这一步是哪个酶、口袋在哪、哪些残基在界面」；右为主角——底物与产物的结构并置。页头开关整页切换 3D 球棍 / 2D 结构式：3D 球棍拖动可旋转，2D 用同色圈注同一批原子；箭头下方始终给出范德华体积与主轴长度的变化。本页不播放动画：酶的构象变化、配体进入口袋的过程都不呈现。",
  plateNo: "PLATE SF-01 · 结构对照 · 第二版 · 2026",
  back: { to: "/pathway/glycolysis?step=gk-1", label: "← 返回挂图" },
  backCaption: "糖酵解 · 结构对照",
  enzymePanel: true,
  enzymePanelOffNote: "本步酶结构资产未建立 · 待核验后接入",
  footerNote:
    "3D 分子来源分两类并逐条标注：实验坐标取 RCSB PDB 配体实例（青标，PDB ID/分辨率/方法/物种/链/配体名），无实验坐标的分子用 RDKit ETKDG+MMFF94 计算构象（琥珀标，并写明「自由态，不等于结合态」），两类不混标。平面结构式与分子资产由 tools/gen-molecule-assets.py 离线生成；酶结构来自 PDB 实验坐标。",
  defaultModePolicy:
    "默认模式按数据判据逐块决定：重原子数不变 + 拓扑改变（原子命名下的连接/键级/环大小变化）+ |ΔV| ≤ 2.5% → 该块默认 2D，其余默认 3D。?mode=2d|3d 为显式覆盖，优先级高于默认值。",
  steps: GLYCOLYSIS_COMPARISON,
};

const TCA_CONFIG: ComparisonConfig = {
  pathwayId: "tca",
  title: "TCA 循环 · 结构对照",
  summary:
    "九块逐步对照：接驳步（丙酮酸 → 乙酰-CoA）加环内八步，只对分子本身作形状对照——左侧酶位如实声明「未建立」，不伪造酶结构。页头开关整页切换 3D 球棍 / 2D 结构式：3D 球棍拖动可旋转，2D 用同色圈注同一批原子；箭头下方始终给出范德华体积与主轴长度的变化。九个有机酸全部使用 RCSB 实验配体坐标，并在每块分子对照下方给出一句首屏可见的「配体来源」（PDB ID / 分辨率 / 方法 / 物种 / 来源蛋白全名与它在 TCA 中的角色）。本轮按「TCA 本酶优先、能换就换」替换 4 个：柠檬酸→人 CS 8ZVV、异柠檬酸→线粒体 IDH2 5H3E、琥珀酰-CoA→OGDH 8P5V、延胡索酸→FH 9BPW；其余保留并写明来源。接驳步底物丙酮酸无实验配体坐标，沿用计算构象并标「自由态，不等于结合态」。乙酰-CoA 与琥珀酰-CoA 是分块呈现：只画反应端与硫酯 S，CoA 部分标「略」。",
  plateNo: "PLATE SF-02 · 结构对照 · TCA · 2026",
  back: { to: "/pathway/tca", label: "← 返回挂图" },
  backCaption: "TCA 循环 · 结构对照",
  enzymePanel: false,
  enzymePanelOffNote: "本步酶结构资产未建立 · 待核验后接入",
  footerNote:
    "TCA 环内九个有机酸（含乙酰-CoA / 琥珀酰-CoA 的反应端）全部来自 RCSB PDB 真实配体络合物的实验坐标；每个分子在块内首屏有一句「配体来源」，写明 PDB ID/分辨率/方法/物种/链/配体 resname 与来源蛋白全名及其在 TCA 中的角色。本轮能换就换（同分子 + 分辨率 ≤2.5 Å + X-ray/cryo-EM）：柠檬酸 3MWD→8ZVV（人 CS，1.59 Å）、异柠檬酸 6PAY→5H3E（小鼠线粒体 IDH2 K256Q，2.21 Å）、琥珀酰-CoA 5TRL→8P5V（谷氨酸棒杆菌 OGDH E1/E2，2.07 Å，cryo-EM）、延胡索酸 1PJ3（人 ME2 变构位点）→9BPW（金黄色葡萄球菌 FumC，2.00 Å）。未换的：琥珀酸仍取自人 SUCL 7MSS（1.75 Å），本步 SDH 口袋内同分子 ≤2.5 Å 未获；α-酮戊二酸取自人 IDH2 R140Q 5I95（1.54 Å）；乙酰-CoA/OAA/苹果酸分别取自人 CS 8ZW1/8ZVW、人 MDH2 2DFD。不理想的点逐条明写：异柠檬酸与延胡索酸为非人源（前者还是 K256Q 突变体）、琥珀酰-CoA 来自非人源 OGDH 而非 SUCL、琥珀酸取自相邻的 SUCL；这些都不是拿类似物冒充底物。接驳步丙酮酸无实验配体坐标，保留计算构象（琥珀标，自由态，不等于结合态），不计入这九个分子。乙酰-CoA / 琥珀酰-CoA 为分块呈现（CoA 略），反应端用完整配体的实测几何，不是完整分子。本通路酶 3D 结构资产未建立：每块左侧只给一行灰字声明，不伪造。",
  defaultModePolicy:
    "默认模式按数据判据逐块决定：重原子数不变 + 拓扑改变（原子命名下的连接/键级/环大小变化）+ |ΔV| ≤ 2.5% → 该块默认 2D，其余默认 3D。?mode=2d|3d 为显式覆盖，优先级高于默认值。",
  steps: TCA_COMPARISON,
};

// ------------------------------------------------------------
// PPP（磷酸戊糖途径）：8 步（氧化支路 3 + 非氧化支路 5）
//
// 实体清单以 src/data/ppp/ppp.json 为准（11 个分子：G6P / 6PGL / 6PG / CO₂ /
// Ru5P / R5P / Xu5P / S7P / E4P / GAP / F6P）。本轮为 PPP 新建 10 个资产：
// 8 个实验坐标 + 2 个计算构象（6PGL、Xu5P）；CO₂ 只做 2D、3D 不建并写明原因。
// 本通路没有酶 3D 资产，enzymePanel=false；页面左栏只给灰字声明，不伪造。
// 已知缺口：PPP 暂无挂图页，/structures/ppp 只能通过 URL 直达（不是遗漏）。
// ------------------------------------------------------------
const G6P_G6PD = {
  id: "g6p-g6pd",
  name: "6-磷酸葡萄糖（G6P，G6PD 口袋）",
  formula: "C₆H₁₁O₉P",
  asset2d: D2("g6p"),
  caveat: "实验坐标来自 7SNI（人 G6PD，链 A，配体 BG6，2.50 Å cryo-EM）；与糖酵解页共享 2D 结构式，但 3D 用本步本酶的 G6PD 口袋，不是 1CZA 的己糖激酶口袋。",
  sourceNote:
    "取自人葡糖-6-磷酸脱氢酶 G6PD（PPP 氧化支路第 1 步）PDB 7SNI（2.50 Å · cryo-EM · Homo sapiens · 链 A · 配体 BG6）——本步本酶口袋、人源；实验坐标。",
};
const PGL = {
  id: "6pgl",
  name: "6-磷酸葡糖酸-1,5-内酯（6PGL）",
  formula: "C₆H₉O₉P",
  asset2d: D2("6pgl"),
  caveat: "PDB 无 6-磷酸葡糖酸内酯本体络合物（6PL 为磷脂类，不是内酯）；此形状为 RDKit 计算构象（自由态，不等于结合态），不拿内酯类似物冒充。",
  sourceNote:
    "无实验配体坐标：PDB 未见 6-磷酸葡糖酸-1,5-内酯本体络合物；本分子为 RDKit ETKDGv3+MMFF94 计算构象（自由态，不等于结合态）。",
};
const PG6_D = {
  id: "6pg",
  name: "6-磷酸葡糖酸（6PG，6PGD 口袋）",
  formula: "C₆H₁₀O₁₀P",
  asset2d: D2("6pg"),
  caveat: "实验坐标来自 2W90（6PGD，链 A，配体 6PG，2.20 Å）：本步酶口袋但非人源；人源 6PGD 的 6PG 络合物 ≤2.5 Å 未获。",
  sourceNote:
    "取自嗜热脂肪地芽孢杆菌 6-磷酸葡糖酸脱氢酶 6PGD（PPP 第 3 步）PDB 2W90（2.20 Å · X-ray · Geobacillus stearothermophilus · 链 A · 配体 6PG）——本步本酶口袋，但非人源；实验坐标。人源 6PGD 同分子 ≤2.5 Å 络合物未获。",
};
const PG6_L = {
  id: "6pg-l",
  name: "6-磷酸葡糖酸（6PG，6PGL 口袋）",
  formula: "C₆H₁₀O₁₀P",
  asset2d: D2("6pg-l"),
  caveat: "实验坐标来自 3E7F（6PGL，链 A，配体 6PG，2.20 Å）：本步酶口袋但非人源；人源 6PGL 无 ≤2.5 Å 的 6PG 络合物。",
  sourceNote:
    "取自布氏锥虫 6-磷酸葡糖酸内酯酶 6PGL（PPP 第 2 步）PDB 3E7F（2.20 Å · X-ray · Trypanosoma brucei · 链 A · 配体 6PG）——本步本酶口袋（产物结合态），但非人源；实验坐标。",
};
const RU5P = {
  id: "ru5p",
  name: "D-核酮糖-5-磷酸（Ru5P，RPE 口袋）",
  formula: "C₅H₉O₈P",
  asset2d: D2("ru5p"),
  caveat: "实验坐标来自 3OVQ（人 RPE，链 A，配体 5RP，2.00 Å）：本步本酶且人源。",
  sourceNote:
    "取自人核酮糖-5-磷酸 3-差向异构酶 RPE（PPP 第 5 步）PDB 3OVQ（2.00 Å · X-ray · Homo sapiens · 链 A · 配体 5RP）——本步本酶口袋、人源；实验坐标。",
};
const RU5P_I = {
  id: "ru5p-i",
  name: "D-核酮糖-5-磷酸（Ru5P，RpiB 口袋）",
  formula: "C₅H₉O₈P",
  asset2d: D2("ru5p-i"),
  caveat: "实验坐标来自 2VVP（结核分枝杆菌 RpiB，链 A，配体 5RP，1.65 Å）：RpiB 与人类 RPIA（RpiA 家族）不是同一酶，按分级规则算「跨种非本酶」；配体占位 0.50，原子完整。",
  sourceNote:
    "取自结核分枝杆菌核糖-5-磷酸异构酶 B（RpiB，PPP 第 4 步）PDB 2VVP（1.65 Å · X-ray · Mycobacterium tuberculosis · 链 A · 配体 5RP）——同反应但属 RpiB 家族，不是本步人类 RPIA（RpiA 家族），故不按「本步酶」计；人源 RPIA 未检索到结构。配体占位 0.50，原子完整。",
};
const R5P = {
  id: "r5p",
  name: "D-核糖-5-磷酸（R5P，RpiB 口袋）",
  formula: "C₅H₉O₈P",
  asset2d: D2("r5p"),
  caveat: "实验坐标来自 2VVP（结核分枝杆菌 RpiB，链 A，配体 R5P，1.65 Å）：RpiB 与人类 RPIA（RpiA 家族）不是同一酶，按分级规则算「跨种非本酶」。",
  sourceNote:
    "取自结核分枝杆菌核糖-5-磷酸异构酶 B（RpiB，PPP 第 4 步）PDB 2VVP（1.65 Å · X-ray · Mycobacterium tuberculosis · 链 A · 配体 R5P）——同反应不同家族（RpiB），不是本步人类 RPIA 的产物结合态；非人源。实验坐标。",
};
const XU5P = {
  id: "xu5p",
  name: "D-木酮糖-5-磷酸（Xu5P）",
  formula: "C₅H₉O₈P",
  asset2d: D2("xu5p"),
  caveat: "PDB 无 Xu5P 本体络合物：4KXV 的 DX5 是木糖醇-5-磷酸（C₅H₁₃O₈P，还原型类似物），不作底物替换；此形状为 RDKit 计算构象（自由态，不等于结合态）。",
  sourceNote:
    "无实验配体坐标：PDB 未见 Xu5P 本体络合物（4KXV 的 DX5 为木糖醇-5-磷酸类似物，不作底物）；本分子为 RDKit 计算构象（自由态，不等于结合态）。",
};
const S7P = {
  id: "s7p",
  name: "景天庚酮糖-7-磷酸（S7P）",
  formula: "C₇H₁₃O₁₀P",
  asset2d: D2("s7p"),
  caveat: "实验坐标来自 4R75（AfuA 周质结合蛋白，链 A，配体 S7P，1.278 Å）：同分子但来源蛋白不是本步转醛醇酶；配体为环式，非开链。",
  sourceNote:
    "取自胸膜肺炎放线杆菌 AfuA 周质结合蛋白（ABC 转运体底物结合蛋白，非 PPP 酶）PDB 4R75（1.28 Å · X-ray · Actinobacillus pleuropneumoniae · 链 A · 配体 S7P）——同分子实验坐标，但来源蛋白不是本步转醛醇酶；人源转醛醇酶的 S7P 络合物未获，配体为环式。",
};
const E4P = {
  id: "e4p",
  name: "D-赤藓糖-4-磷酸（E4P）",
  formula: "C₄H₇O₇P",
  asset2d: D2("e4p"),
  caveat: "实验坐标来自 5XPS（转酮醇酶，链 A，配体 E4P，1.07 Å）：本步酶口袋但非人源；ppp-n4 的转醛醇酶口袋未获同分子结构。",
  sourceNote:
    "取自树干毕赤酵母转酮醇酶 TK（PPP 第 6/8 步）PDB 5XPS（1.07 Å · X-ray · Scheffersomyces stipitis · 链 A · 配体 E4P）——转酮醇酶是本步（n5）的本酶，但非人源；ppp-n4 的转醛醇酶口袋未获同分子结构。",
};
const CO2 = {
  id: "co2",
  name: "二氧化碳（CO₂）",
  formula: "CO₂",
  asset2d: D2("co2"),
  no3dReason: "CO₂ 仅 3 个原子，球棍模型没有形状信息量；2D 结构式已足以表示，3D 不建，不用假球填充。",
  caveat: "只做 2D；不建 3D（数据层 co2/no3d 记录原因），不拿假球冒充实验结构。",
  sourceNote: "无实验配体坐标：CO₂ 仅 3 原子，PDB 无可用络合物；本页只做 2D 结构式，3D 不建（原因见分子说明）。",
};

const FBP_GN = {
  id: "fbp-gn",
  name: "果糖-1,6-二磷酸（FBP，FBPase1 口袋）",
  formula: "C₆H₁₀O₁₂P₂",
  asset2d: D2("fbp"),
  caveat: "实验坐标来自 5ZWK（人 FBPase1，链 A，配体 FBP，2.10 Å）：本步本酶且人源；糖酵解页仍沿用 8W2G（人 PFKL，3.0 Å），两页来源不同步。",
  sourceNote:
    "取自人肝果糖-1,6-二磷酸酶 1（FBPase1，糖异生第 9 步）PDB 5ZWK（2.10 Å · X-ray · Homo sapiens · 链 A · 配体 FBP）——本步本酶口袋、人源；实验坐标。",
};
const F6P_GN = {
  id: "f6p-gn",
  name: "6-磷酸果糖（F6P，FBPase1 口袋）",
  formula: "C₆H₁₁O₉P",
  asset2d: D2("f6p"),
  caveat: "实验坐标来自 1EYI（猪肝 FBPase1，链 A，配体 F6P，2.32 Å）：本步本酶但为哺乳动物非人源；糖酵解/PPP 页仍沿用 2CXS（小鼠 GPI）。",
  sourceNote:
    "取自猪肝果糖-1,6-二磷酸酶 1（FBPase1，糖异生第 9 步）PDB 1EYI（2.32 Å · X-ray · Sus scrofa · 链 A · 配体 F6P）——本步本酶口袋（产物结合态），但为哺乳动物非人源；实验坐标。",
};
const PYR_GN = {
  id: "pyr-gn",
  name: "丙酮酸（PKM2 口袋）",
  formula: "C₃H₃O₃",
  asset2d: "/assets/structures/2d/pyruvate.json",
  caveat: "实验坐标来自 4YJ5（人 PKM2，链 A，配体 PYR，2.41 Å）：人源但非本步丙酮酸羧化酶口袋；人 PC 的 PYR 络合物 3BG3 为 2.8 Å，超过本轮阈值。",
  sourceNote:
    "取自人丙酮酸激酶 M2（PKM2）PDB 4YJ5（2.41 Å · X-ray · Homo sapiens · 链 A · 配体 PYR）——人源但非本步丙酮酸羧化酶口袋；实验坐标。人 PC 的 PYR 络合物 3BG3 为 2.80 Å，超过 ≤2.5 Å 阈值。",
};
const LAC_MOL = {
  id: "lac",
  name: "L-乳酸（(S)-构型）",
  formula: "C₃H₅O₃",
  asset2d: D2("lac"),
  caveat: "PDB 唯一乳酸配体 LAC 的 CCD 为 D-乳酸（(R)），与 Cori 循环的 L-乳酸不是同一分子；本轮不拿对映体冒充，改为 RDKit 计算构象（自由态，不等于结合态）。",
  sourceNote:
    "无实验配体坐标：PDB 唯一乳酸配体 LAC 的 CCD 为 D-乳酸（(R)），与本步 L-乳酸不是同一分子；本轮不拿对映体冒充，改用 RDKit 计算构象（自由态，不等于结合态）。",
};
const ALA_MOL = {
  id: "ala",
  name: "L-丙氨酸",
  formula: "C₃H₇NO₂",
  asset2d: D2("ala"),
  caveat: "实验坐标来自 8JDW（人 AGAT，链 A，配体 ALA，2.30 Å）：人源但非本步丙氨酸氨基转移酶口袋；人 ALT2（3IHJ）未见 ALA 配体。",
  sourceNote:
    "取自人 L-精氨酸:甘氨酸脒基转移酶 AGAT（非糖异生 ALT 口袋）PDB 8JDW（2.30 Å · X-ray · Homo sapiens · 链 A · 配体 ALA）——人源但非本步酶口袋；实验坐标。人 ALT2（3IHJ）未见 ALA 配体。",
};
const GLU_MOL = {
  id: "glu",
  name: "L-谷氨酸",
  formula: "C₅H₈NO₄",
  asset2d: D2("glu"),
  caveat: "实验坐标来自 3CZD（人 GLS1，链 A，配体 GLU，2.40 Å）：人源但非本步丙氨酸氨基转移酶口袋。",
  sourceNote:
    "取自人肾型谷氨酰胺酶 GLS1（非糖异生 ALT 口袋）PDB 3CZD（2.40 Å · X-ray · Homo sapiens · 链 A · 配体 GLU）——人源但非本步酶口袋；实验坐标。",
};
const HCO3 = {
  id: "hco3",
  name: "碳酸氢根（HCO₃⁻）",
  formula: "CHO₃⁻",
  asset2d: D2("hco3"),
  no3dReason: "HCO₃⁻ 仅 4 个原子，球棍模型没有形状信息量；2D 结构式已足以表示，3D 不建，不用假球填充。",
  caveat: "只做 2D；不建 3D（数据层 hco3/no3d 记录原因），不拿假球冒充实验结构。",
  sourceNote: "无实验配体坐标：HCO₃⁻ 仅 4 原子，PDB 无可用络合物；本页只做 2D 结构式，3D 不建（原因见分子说明）。",
};

const PPP_COMPARISON: StepComparison[] = [
  {
    stepId: "ppp-o1",
    evidence: {
      substrate: [evOwnHuman("g6p-g6pd")],
      product: [evComputed("6pgl")],
    },
    index: 1,
    enzyme: "葡糖-6-磷酸脱氢酶",
    isozyme: "G6PD",
    equation: "葡糖-6-磷酸 + NADP⁺ → 6-磷酸葡糖酸内酯 + NADPH + H⁺",
    substrate: {
      name: "葡糖-6-磷酸（G6P）",
      formula: "C₆H₁₁O₉P",
      parts: [{ ...G6P_G6PD, marks: [{ name: "C1", kind: "newbond", note: "C1–OH" }] }],
    },
    product: {
      name: "6-磷酸葡糖酸-1,5-内酯（6PGL）",
      formula: "C₆H₉O₉P",
      parts: [
        {
          ...PGL,
          marks: [
            { name: "C1", kind: "newbond", note: "内酯羰基 C1=O" },
            { name: "C5", kind: "newbond", note: "环内酯氧" },
          ],
        },
      ],
      cofactorNote: "NADP⁺ / NADPH 为辅因子，按本页口径不入画：产物侧只显示碳骨架的内酯形状。",
    },
    arrowLabel: "G6PD · C1 醇氧化成内酯（NADP⁺）",
    change:
      "C1 的醇被氧化为内酯羰基，C5–OH 与 C1 成环：开链的 G6P 变成六元内酯环 6PGL；NADP⁺ 接受氢负变成 NADPH。原子数不变，环化让形状略收紧。",
    physiology: "氧化支路的入口：第一次产生 NADPH，为谷胱甘肽还原与还原性合成提供还原力。",
    defaultMode: "3d",
    defaultModeRule:
      "默认 3D 判据：重原子数同为 16；体积 191.4→185.4 Å³（ΔV −3.13%，>2.5%）；拓扑改变（C1 醇→内酯羰基、C1–O 成环）。ΔV 超过 2.5% 阈值，按规则默认 3D；?mode=2d 仍可显式切换读开链→内酯。",
  },
  {
    stepId: "ppp-o2",
    evidence: {
      substrate: [evComputed("6pgl")],
      product: [evOwnNonhuman("6pg-l")],
    },
    index: 2,
    enzyme: "6-磷酸葡糖酸内酯酶",
    isozyme: "6PGL",
    equation: "6-磷酸葡糖酸内酯 + H₂O → 6-磷酸葡糖酸",
    substrate: {
      name: "6-磷酸葡糖酸-1,5-内酯（6PGL）",
      formula: "C₆H₉O₉P",
      parts: [{ ...PGL, marks: [{ name: "C1", kind: "leaving", note: "内酯开环位" }] }],
    },
    product: {
      name: "6-磷酸葡糖酸（6PG）",
      formula: "C₆H₁₀O₁₀P",
      parts: [
        {
          ...PG6_L,
          marks: [
            { name: "C1", kind: "newbond", note: "开环成羧酸" },
            { name: "C6", kind: "newbond", note: "C6–O–P" },
          ],
        },
      ],
    },
    arrowLabel: "6PGL · 内酯水解开环",
    change: "内酯的 C1=O 被水加成开环，C1 变成羧酸、C5–O 键断开：六元环打开成开链的 6PG。多一个水分子（重原子 16→17），体积变大。",
    physiology: "把自发形成的内酯及时水解掉，保证氧化支路能以 6PG 继续脱羧。",
  },
  {
    stepId: "ppp-o3",
    evidence: {
      substrate: [evOwnNonhuman("6pg")],
      product: [evOtherHuman("ru5p"), evOnly2d("co2")],
    },
    index: 3,
    enzyme: "6-磷酸葡糖酸脱氢酶",
    isozyme: "6PGD",
    equation: "6-磷酸葡糖酸 + NADP⁺ → 核酮糖-5-磷酸 + CO₂ + NADPH + H⁺",
    substrate: {
      name: "6-磷酸葡糖酸（6PG）",
      formula: "C₆H₁₀O₁₀P",
      parts: [{ ...PG6_D, marks: [{ name: "C1", kind: "leaving", note: "脱羧为 CO₂" }] }],
    },
    product: {
      name: "核酮糖-5-磷酸（Ru5P）＋ CO₂",
      formula: "C₅H₉O₈P + CO₂",
      parts: [
        {
          ...RU5P,
          sourceNote:
            "取自人核酮糖-5-磷酸 3-差向异构酶 RPE（PPP 第 5 步）PDB 3OVQ（2.00 Å · X-ray · Homo sapiens · 链 A · 配体 5RP）——人源但非本步 6PGD 口袋；实验坐标（与第 5 步共享资产）。",
          marks: [{ name: "C1", kind: "newbond", note: "C1 醇" }, { name: "C2", kind: "newbond", note: "C2 酮基" }],
        },
        { ...CO2 },
      ],
      cofactorNote: "NADP⁺ / NADPH 不入画；CO₂ 仅 3 原子，只画 2D，3D 不建。",
    },
    arrowLabel: "6PGD · 氧化脱羧（C1 → CO₂）",
    change:
      "C1 羧基氧化脱羧放出 CO₂，剩余五碳成为核酮糖-5-磷酸：碳骨架从六碳减到五碳，重原子 17→14，形状明显收缩。CO₂ 只做 2D，体积差只计有机分子骨架。",
    physiology: "氧化支路的第二次 NADPH 产出，同时把六碳糖削成五碳的磷酸戊糖，进入非氧化支路。",
  },
  {
    stepId: "ppp-n1",
    evidence: {
      substrate: [evOtherNonhuman("ru5p-i")],
      product: [evOtherNonhuman("r5p")],
    },
    index: 4,
    enzyme: "核糖-5-磷酸异构酶",
    isozyme: "RPIA（RpiA 家族）",
    equation: "核酮糖-5-磷酸 ⇌ 核糖-5-磷酸",
    substrate: {
      name: "核酮糖-5-磷酸（Ru5P）",
      formula: "C₅H₉O₈P",
      parts: [{ ...RU5P_I, marks: [{ name: "C2", kind: "newbond", note: "酮基 C2=O" }, { name: "C1", kind: "newbond", note: "C1 醇" }] }],
    },
    product: {
      name: "核糖-5-磷酸（R5P）",
      formula: "C₅H₉O₈P",
      parts: [{ ...R5P, marks: [{ name: "C1", kind: "newbond", note: "醛基" }, { name: "C2", kind: "newbond", note: "C2 醇" }] }],
    },
    arrowLabel: "RPIA · C1–C2 酮糖→醛糖异构",
    change: "羰基从 C2 移到 C1：酮糖变成醛糖，C1 由 CH₂OH 变成醛基、C2 变成仲醇；原子组成不变，只有局部键级换位。",
    physiology: "把非氧化支路的酮糖拉成醛糖，供核苷酸合成与转酮/转醛反应使用。",
    defaultMode: "2d",
    defaultModeRule:
      "默认 2D 判据：重原子数同为 14；体积 170.9→170.9 Å³（ΔV +0.00%，≤2.5%）；拓扑改变（C2 酮基↔C1 醛基，酮糖→醛糖）。3D 几乎同形，2D 才看得见羰基换位。",
  },
  {
    stepId: "ppp-n2",
    evidence: {
      substrate: [evOwnHuman("ru5p")],
      product: [evComputed("xu5p")],
    },
    index: 5,
    enzyme: "核酮糖-5-磷酸 3-差向异构酶",
    isozyme: "RPE",
    equation: "核酮糖-5-磷酸 ⇌ 木酮糖-5-磷酸",
    substrate: {
      name: "核酮糖-5-磷酸（Ru5P）",
      formula: "C₅H₉O₈P",
      parts: [{ ...RU5P, marks: [{ name: "C3", kind: "newbond", note: "C3 构型翻转" }] }],
    },
    product: {
      name: "木酮糖-5-磷酸（Xu5P）",
      formula: "C₅H₉O₈P",
      parts: [{ ...XU5P, marks: [{ name: "C3", kind: "newbond", note: "C3 构型翻转" }] }],
    },
    arrowLabel: "RPE · C3 差向化（立体翻转）",
    change: "只翻转 C3 的构型：连接与键级不变，C3–OH 的朝向改变，形成 Xu5P。原子组成相同、体积几乎相同；按数据判据（拓扑未变，仅立体化学变化）该块默认 3D。",
    physiology: "造出转酮醇酶的供体底物 Xu5P，非氧化支路的碳流由此分流。",
  },
  {
    stepId: "ppp-n3",
    evidence: {
      substrate: [evComputed("xu5p"), evOtherNonhuman("r5p")],
      product: [evComputed("gap"), evOtherNonhuman("s7p")],
    },
    index: 6,
    enzyme: "转酮醇酶",
    isozyme: "TKT",
    equation: "木酮糖-5-磷酸 + 核糖-5-磷酸 ⇌ 甘油醛-3-磷酸 + 景天庚酮糖-7-磷酸",
    substrate: {
      name: "木酮糖-5-磷酸 + 核糖-5-磷酸",
      formula: "两个 C₅H₉O₈P",
      parts: [
        { ...XU5P, marks: [{ name: "C1", kind: "leaving", note: "二碳单位 C1–C2" }, { name: "C2", kind: "leaving" }] },
        {
          ...R5P,
          sourceNote:
            "取自结核分枝杆菌核糖-5-磷酸异构酶 B（RpiB，PPP 第 4 步）PDB 2VVP（1.65 Å · X-ray · Mycobacterium tuberculosis · 链 A · 配体 R5P）——非人源，且来源蛋白不是本步转酮醇酶；实验坐标（与第 4 步共享资产）。",
          marks: [{ name: "C1", kind: "newbond", note: "受体醛基碳" }],
        },
      ],
    },
    product: {
      name: "甘油醛-3-磷酸（GAP）＋ 景天庚酮糖-7-磷酸（S7P）",
      formula: "C₃H₅O₆P + C₇H₁₃O₁₀P",
      parts: [
        {
          ...GAP,
          sourceNote:
            "无实验配体坐标：PDB 未见 GAP 本体络合物；本分子为 RDKit 计算构象（自由态，不等于结合态），与糖酵解/糖异生页共享同一资产。",
          marks: [{ name: "C1", kind: "newbond", note: "新醛基" }],
        },
        {
          ...S7P,
          sourceNote:
            "取自胸膜肺炎放线杆菌 AfuA 周质结合蛋白（ABC 转运体底物结合蛋白，非 PPP 酶）PDB 4R75（1.28 Å · X-ray · Actinobacillus pleuropneumoniae · 链 A · 配体 S7P）——同分子实验坐标，但来源蛋白不是本步转酮醇酶；人源转酮醇酶的 S7P 络合物未获，配体为环式。",
          marks: [{ name: "C1", kind: "newbond", note: "接受二碳单位" }, { name: "C2", kind: "newbond" }],
        },
      ],
    },
    arrowLabel: "TKT · 二碳单位（C1–C2）从 Xu5P 转到 R5P",
    change:
      "Xu5P 的 C1–C2 二碳单位整体转移到 R5P 的 C1 上：Xu5P 剩三碳（GAP），R5P 变七碳（S7P）。重原子总数不变（28→28），但两个分子的碳骨架重排；3D 并排后像同一堆原子，2D 才读得清二碳单位的搬家。",
    physiology: "非氧化支路的核心：把五碳糖拆成三碳 + 七碳，为后续重排与糖酵解接口做准备。",
    defaultMode: "2d",
    defaultModeRule:
      "默认 2D 判据：重原子数合计同为 28；体积 343.4→337.0 Å³（ΔV −1.86%，≤2.5%）；拓扑改变（二碳单位 C1–C2 从 Xu5P 转到 R5P）。",
  },
  {
    stepId: "ppp-n4",
    evidence: {
      substrate: [evOtherNonhuman("s7p"), evComputed("gap")],
      product: [evOtherNonhuman("e4p"), evOtherNonhuman("f6p")],
    },
    index: 7,
    enzyme: "转醛醇酶",
    isozyme: "TALDO1",
    equation: "景天庚酮糖-7-磷酸 + 甘油醛-3-磷酸 ⇌ 赤藓糖-4-磷酸 + 果糖-6-磷酸",
    substrate: {
      name: "景天庚酮糖-7-磷酸 + 甘油醛-3-磷酸",
      formula: "C₇H₁₃O₁₀P + C₃H₅O₆P",
      parts: [
        {
          ...S7P,
          marks: [
            { name: "C1", kind: "leaving", note: "三碳单位 C1–C3" },
            { name: "C2", kind: "leaving" },
            { name: "C3", kind: "leaving" },
          ],
        },
        {
          ...GAP,
          sourceNote:
            "无实验配体坐标：PDB 未见 GAP 本体络合物；本分子为 RDKit 计算构象（自由态，不等于结合态），与糖酵解/糖异生页共享同一资产。",
          marks: [{ name: "C1", kind: "newbond", note: "受体醛基碳" }],
        },
      ],
    },
    product: {
      name: "赤藓糖-4-磷酸（E4P）＋ 果糖-6-磷酸（F6P）",
      formula: "C₄H₇O₇P + C₆H₁₁O₉P",
      parts: [
        { ...E4P, marks: [{ name: "C1", kind: "newbond", note: "保留醛基" }] },
        {
          ...F6P,
          sourceNote:
            "取自小鼠磷酸葡萄糖异构酶 GPI PDB 2CXS（1.50 Å · X-ray · Mus musculus · 链 A · 配体 F6P）——本步转醛醇酶口袋未见 F6P 络合物；实验坐标（糖酵解页共享资产）。",
          marks: [{ name: "C1", kind: "newbond", note: "接受三碳单位" }, { name: "C2", kind: "newbond" }],
        },
      ],
    },
    arrowLabel: "TALDO · 三碳单位（C1–C3）从 S7P 转到 GAP",
    change:
      "S7P 的 C1–C3 三碳单位转移到 GAP 的 C1：S7P 剩四碳（E4P），GAP 变六碳（F6P）。重原子总数仍为 28，但碳骨架在两侧重新分配；按规则该块默认 2D。",
    physiology: "把七碳 + 三碳重排成四碳 + 六碳，六碳可直接回到糖酵解，四碳留给转酮醇酶。",
    defaultMode: "2d",
    defaultModeRule:
      "默认 2D 判据：重原子数合计同为 28；体积 337.0→337.5 Å³（ΔV +0.15%，≤2.5%）；拓扑改变（三碳单位 C1–C3 从 S7P 转到 GAP）。",
  },
  {
    stepId: "ppp-n5",
    evidence: {
      substrate: [evComputed("xu5p"), evOwnNonhuman("e4p")],
      product: [evOtherNonhuman("f6p"), evComputed("gap")],
    },
    index: 8,
    enzyme: "转酮醇酶",
    isozyme: "TKT",
    equation: "木酮糖-5-磷酸 + 赤藓糖-4-磷酸 ⇌ 果糖-6-磷酸 + 甘油醛-3-磷酸",
    substrate: {
      name: "木酮糖-5-磷酸 + 赤藓糖-4-磷酸",
      formula: "C₅H₉O₈P + C₄H₇O₇P",
      parts: [
        { ...XU5P, marks: [{ name: "C1", kind: "leaving", note: "二碳单位 C1–C2" }, { name: "C2", kind: "leaving" }] },
        { ...E4P, marks: [{ name: "C1", kind: "newbond", note: "受体醛基碳" }] },
      ],
    },
    product: {
      name: "果糖-6-磷酸（F6P）＋ 甘油醛-3-磷酸（GAP）",
      formula: "C₆H₁₁O₉P + C₃H₅O₆P",
      parts: [
        {
          ...F6P,
          sourceNote:
            "取自小鼠磷酸葡萄糖异构酶 GPI PDB 2CXS（1.50 Å · X-ray · Mus musculus · 链 A · 配体 F6P）——本步转酮醇酶口袋未见 F6P 络合物；实验坐标（糖酵解页共享资产）。",
          marks: [{ name: "C1", kind: "newbond", note: "接受二碳单位" }, { name: "C2", kind: "newbond" }],
        },
        {
          ...GAP,
          sourceNote:
            "无实验配体坐标：PDB 未见 GAP 本体络合物；本分子为 RDKit 计算构象（自由态，不等于结合态），与糖酵解/糖异生页共享同一资产。",
          marks: [{ name: "C1", kind: "newbond", note: "新醛基" }],
        },
      ],
    },
    arrowLabel: "TKT · 二碳单位从 Xu5P 转到 E4P",
    change:
      "Xu5P 的 C1–C2 二碳单位转移到 E4P 的 C1：Xu5P 剩三碳（GAP），E4P 变六碳（F6P）。重原子总数 26→26；体积差 −1.35%，≤2.5% 阈值，且拓扑改变（二碳单位转移），按规则默认 2D。",
    physiology: "把四碳 + 五碳补成六碳 + 三碳，让非氧化支路产出可直接回糖酵解的 F6P 与 GAP。",
    defaultMode: "2d",
    defaultModeRule:
      "默认 2D 判据：重原子数合计同为 26；体积 317.9→313.6 Å³（ΔV −1.35%，≤2.5%）；拓扑改变（二碳单位 C1–C2 从 Xu5P 转到 E4P）。",
  },
];

const GLUCONEOGENESIS_COMPARISON: StepComparison[] = [
  {
    stepId: "gn-1",
    evidence: {
      substrate: [evOtherHuman("pyr-gn"), evOnly2d("hco3")],
      product: [evOtherHuman("oaa")],
    },
    index: 1,
    enzyme: "丙酮酸羧化酶",
    isozyme: "PC（线粒体）",
    equation: "丙酮酸 + HCO₃⁻ + ATP → 草酰乙酸 + ADP + Pi",
    substrate: {
      name: "丙酮酸 + 碳酸氢根",
      formula: "C₃H₃O₃ + CHO₃⁻",
      parts: [
        { ...PYR_GN, marks: [{ name: "C1", kind: "leaving", note: "羧基碳接 CO₂" }] },
        { ...HCO3 },
      ],
      cofactorNote: "ATP / 生物素辅因子不入画；HCO₃⁻ 仅 4 原子，只画 2D，3D 不建。",
    },
    product: {
      name: "草酰乙酸（OAA）",
      formula: "C₄H₂O₅",
      parts: [{ ...OAA, sourceNote: "取自人柠檬酸合酶 CS（TCA 第 1 步）PDB 8ZVW（1.82 Å · X-ray · Homo sapiens · 链 A · 配体 OAA）——人源但非本步丙酮酸羧化酶口袋；实验坐标。", marks: [{ name: "C4", kind: "newbond", note: "新羧基" }, { name: "C2", kind: "newbond", note: "C2 酮基" }] }],
    },
    arrowLabel: "PC · 生物素羧化，C1 + CO₂ → 新羧基",
    change:
      "HCO₃⁻ 的 CO₂ 接到丙酮酸的 C1 上，生成四碳二羧酸的草酰乙酸：碳骨架从三碳增到四碳，新增一个羧基。HCO₃⁻ 只做 2D，体积差只计有机分子。",
    physiology: "糖异生的第一个不可逆闸门：把三碳的丙酮酸补成四碳，TCA 中间物由此从线粒体输出。",
  },
  {
    stepId: "gn-2",
    evidence: {
      substrate: [evOtherHuman("oaa")],
      product: [evOtherHuman("pep")],
    },
    index: 2,
    enzyme: "磷酸烯醇式丙酮酸羧激酶",
    isozyme: "PEPCK（PCK1/PCK2）",
    equation: "草酰乙酸 + GTP → 磷酸烯醇式丙酮酸 + GDP + CO₂",
    substrate: {
      name: "草酰乙酸（OAA）",
      formula: "C₄H₂O₅",
      parts: [{ ...OAA, sourceNote: "取自人柠檬酸合酶 CS（TCA 第 1 步）PDB 8ZVW（1.82 Å · X-ray · Homo sapiens · 链 A · 配体 OAA）——人源但非本步 PEPCK 口袋；实验坐标。", marks: [{ name: "C1", kind: "leaving", note: "脱羧 C1" }] }],
    },
    product: {
      name: "磷酸烯醇式丙酮酸（PEP）",
      formula: "C₃H₂O₆P",
      parts: [{ ...PEP, sourceNote: "取自人烯醇化酶 ENO2 PDB 3UCD（1.41 Å · X-ray · Homo sapiens · 链 A · 配体 PEP）——人源但非本步 PEPCK 口袋；实验坐标。", marks: [{ name: "C2", kind: "newbond", note: "C2=C3" }, { name: "C3", kind: "newbond" }] }],
    },
    arrowLabel: "PEPCK · 脱羧 + 磷酸化（GTP 供能）",
    change: "OAA 的 C1 脱羧放出 CO₂，同时 C2 被 GTP 磷酰化生成高能烯醇磷酸 PEP；碳骨架从四碳回到三碳，去掉一个羧基、加上一个磷酸。",
    physiology: "第二个不可逆闸门：把四碳的 OAA 转成三碳 PEP，绕开丙酮酸激酶这一步的不可逆。",
  },
  {
    stepId: "gn-3",
    evidence: {
      substrate: [evOwnHuman("pep")],
      product: [evOwnHuman("2pg")],
    },
    index: 3,
    enzyme: "烯醇化酶",
    isozyme: "ENO2（神经元型）",
    equation: "磷酸烯醇式丙酮酸 + H₂O ⇌ 2-磷酸甘油酸",
    substrate: {
      name: "磷酸烯醇式丙酮酸（PEP）",
      formula: "C₃H₂O₆P",
      parts: [{ ...PEP, sourceNote: "取自人烯醇化酶 ENO2 PDB 3UCD（1.41 Å · X-ray · Homo sapiens · 链 A · 配体 PEP）——本步本酶口袋、人源（糖酵解页共享资产）；实验坐标。", marks: [{ name: "C2", kind: "newbond", note: "C2=C3 水合" }, { name: "C3", kind: "newbond" }] }],
    },
    product: {
      name: "2-磷酸甘油酸（2PG）",
      formula: "C₃H₄O₇P",
      parts: [{ ...PG2, sourceNote: "取自人烯醇化酶 ENO2 PDB 3UCD（1.41 Å · X-ray · Homo sapiens · 链 A · 配体 2PG）——本步本酶口袋、人源（糖酵解页共享资产）；实验坐标。", marks: [{ name: "C2", kind: "newbond", note: "新 OH" }, { name: "C3", kind: "newbond", note: "新 H" }] }],
    },
    arrowLabel: "ENO2 · 反式水合（C2=C3 → C–OH）",
    change: "水分子反式加成到 C2=C3 双键，烯醇磷酸变回 2PG；重原子 10→11，多一个水分子，体积变大（默认 3D）。",
    physiology: "糖异生沿糖酵解逆行的第一步可逆反应：把 PEP 水合成 2PG，高能磷酸保留在 C2。",
  },
  {
    stepId: "gn-4",
    evidence: {
      substrate: [evOtherHuman("2pg")],
      product: [evOtherHuman("3pg")],
    },
    index: 4,
    enzyme: "磷酸甘油酸变位酶",
    isozyme: "PGAM1",
    equation: "2-磷酸甘油酸 ⇌ 3-磷酸甘油酸",
    substrate: {
      name: "2-磷酸甘油酸（2PG）",
      formula: "C₃H₄O₇P",
      parts: [{ ...PG2, sourceNote: "取自人烯醇化酶 ENO2 PDB 3UCD（1.41 Å · X-ray · Homo sapiens · 链 A · 配体 2PG）——人源但非本步 PGAM 口袋；实验坐标。", marks: [{ name: "P2", kind: "leaving", note: "磷酸离开 C2" }] }],
    },
    product: {
      name: "3-磷酸甘油酸（3PG）",
      formula: "C₃H₄O₇P",
      parts: [{ ...PG3, sourceNote: "取自人磷酸甘油酸激酶 PGK1 PDB 9FDN（1.58 Å · X-ray · Homo sapiens · 链 A · 配体 3PG）——人源但非本步 PGAM 口袋；实验坐标。", marks: [{ name: "P3", kind: "added", note: "磷酸落到 C3" }, { name: "C3", kind: "newbond" }] }],
    },
    arrowLabel: "PGAM · 磷酸基 C2→C3 迁移",
    change: "磷酰基从 C2–O2 迁移到 C3–O3（经磷酰化组氨酸中间体）：原子组成不变，只换连接位置。按规则该块默认 2D。",
    physiology: "把磷酸从 C2 挪到 C3，为下一步激酶反应准备 1,3-二磷酸甘油酸。",
    defaultMode: "2d",
    defaultModeRule:
      "默认 2D 判据：重原子数同为 11；体积 126.0→126.2 Å³（ΔV +0.16%，≤2.5%）；拓扑改变（磷酸基 C2→C3 换位）。",
  },
  {
    stepId: "gn-5",
    evidence: {
      substrate: [evOwnHuman("3pg")],
      product: [evComputed("bpg13")],
    },
    index: 5,
    enzyme: "磷酸甘油酸激酶",
    isozyme: "PGK1",
    equation: "3-磷酸甘油酸 + ATP ⇌ 1,3-二磷酸甘油酸 + ADP",
    substrate: {
      name: "3-磷酸甘油酸（3PG）",
      formula: "C₃H₄O₇P",
      parts: [{ ...PG3, sourceNote: "取自人磷酸甘油酸激酶 PGK1 PDB 9FDN（1.58 Å · X-ray · Homo sapiens · 链 A · 配体 3PG）——本步本酶口袋、人源；实验坐标。", marks: [{ name: "C1", kind: "newbond", note: "C1 羧基" }] }],
    },
    product: {
      name: "1,3-二磷酸甘油酸（1,3-BPG）",
      formula: "C₃H₄O₁₀P₂",
      parts: [{ ...BPG13, sourceNote: "无实验配体坐标：PDB 未见 1,3-BPG 本体络合物；本分子为 RDKit 计算构象（自由态，不等于结合态），高能酰基磷酸按普通 C–O–P 单键绘制。", marks: [{ name: "C1", kind: "newbond", note: "C1–O–P" }, { name: "P1", kind: "added", note: "新磷酸" }] }],
    },
    arrowLabel: "PGK · C1 羧基磷酰化（ATP 供磷酸）",
    change: "C1 羧基接受 ATP 的 γ-磷酸，生成酰基磷酸（1,3-BPG）：多一个磷酸（重原子 11→15），分子向一侧伸出，形状明显变大。",
    physiology: "糖异生逆行的吸能步：用 ATP 把 3PG 抬成高能酰基磷酸，为下一步氧化做准备。",
  },
  {
    stepId: "gn-6",
    evidence: {
      substrate: [evComputed("bpg13")],
      product: [evComputed("gap")],
    },
    index: 6,
    enzyme: "甘油醛-3-磷酸脱氢酶",
    isozyme: "GAPDH",
    equation: "1,3-二磷酸甘油酸 + NADH + H⁺ ⇌ 甘油醛-3-磷酸 + NAD⁺ + Pi",
    substrate: {
      name: "1,3-二磷酸甘油酸（1,3-BPG）",
      formula: "C₃H₄O₁₀P₂",
      parts: [{ ...BPG13, sourceNote: "无实验配体坐标：PDB 未见 1,3-BPG 本体络合物；本分子为 RDKit 计算构象（自由态，不等于结合态）。", marks: [{ name: "C1", kind: "leaving", note: "C1 还原为醛" }, { name: "P1", kind: "leaving", note: "磷酸离去" }] }],
    },
    product: {
      name: "甘油醛-3-磷酸（GAP）",
      formula: "C₃H₅O₆P",
      parts: [{ ...GAP, sourceNote: "无实验配体坐标：PDB 未见 GAP 本体络合物；本分子为 RDKit 计算构象（自由态，不等于结合态），与糖酵解/PPP 页共享同一资产。", marks: [{ name: "C1", kind: "newbond", note: "新醛基" }] }],
      cofactorNote: "NADH / NAD⁺ 为辅因子，按本页口径不入画；产物侧只显示三碳糖骨架。",
    },
    arrowLabel: "GAPDH · 逆反应：酰基磷酸还原 + 脱磷酸",
    change: "C1 的酰基磷酸被 NADH 还原，C1 变回醛、磷酸离去：1,3-BPG 缩成 GAP，重原子 15→10，体积明显缩小。",
    physiology: "糖异生逆行的氧化还原步：消耗 NADH 把高能酰基磷酸还原成三碳醛糖。",
  },
  {
    stepId: "gn-7",
    evidence: {
      substrate: [evComputed("gap")],
      product: [evOwnNonhuman("dhap")],
    },
    index: 7,
    enzyme: "磷酸丙糖异构酶",
    isozyme: "TPI",
    equation: "甘油醛-3-磷酸 ⇌ 磷酸二羟丙酮",
    substrate: {
      name: "甘油醛-3-磷酸（GAP）",
      formula: "C₃H₅O₆P",
      parts: [{ ...GAP, sourceNote: "无实验配体坐标：PDB 未见 GAP 本体络合物；本分子为 RDKit 计算构象（自由态，不等于结合态）。", marks: [{ name: "C1", kind: "newbond", note: "醛基" }, { name: "C2", kind: "newbond" }] }],
    },
    product: {
      name: "磷酸二羟丙酮（DHAP）",
      formula: "C₃H₅O₆P",
      parts: [{ ...DHAP, sourceNote: "取自酿酒酵母磷酸丙糖异构酶 TPI PDB 1NEY（1.20 Å · X-ray · Saccharomyces cerevisiae · 链 A · 配体 DHAP）——本步同源酶口袋但非人源；实验坐标。", marks: [{ name: "C1", kind: "newbond", note: "C1 醇" }, { name: "C2", kind: "newbond", note: "C2 酮基" }] }],
    },
    arrowLabel: "TPI · 1,2-氢迁移（醛糖→酮糖）",
    change: "C1–H 经烯二醇中间体迁移到 C2：醛基变酮基，C2 从前手性变 R；原子组成不变，只有局部键级与构型变化。按规则该块默认 2D。",
    physiology: "把 GAP 部分转成 DHAP，为下一步醛缩合提供酮糖底物。",
    defaultMode: "2d",
    defaultModeRule:
      "默认 2D 判据：重原子数同为 10；体积 121.5→121.5 Å³（ΔV +0.00%，≤2.5%）；拓扑改变（C1 醛基↔C2 酮基）。",
  },
  {
    stepId: "gn-8",
    evidence: {
      substrate: [evComputed("gap"), evOtherNonhuman("dhap")],
      product: [evOtherHuman("fbp-gn")],
    },
    index: 8,
    enzyme: "醛缩酶",
    isozyme: "ALDOB（肝型，糖异生）",
    equation: "甘油醛-3-磷酸 + 磷酸二羟丙酮 ⇌ 果糖-1,6-二磷酸",
    substrate: {
      name: "甘油醛-3-磷酸 + 磷酸二羟丙酮",
      formula: "两个 C₃H₅O₆P",
      parts: [
        { ...GAP, sourceNote: "无实验配体坐标：PDB 未见 GAP 本体络合物；本分子为 RDKit 计算构象（自由态，不等于结合态）。", marks: [{ name: "C1", kind: "newbond", note: "新 C–C 键" }] },
        { ...DHAP, sourceNote: "取自酿酒酵母磷酸丙糖异构酶 TPI PDB 1NEY（1.20 Å · X-ray · Saccharomyces cerevisiae · 链 A · 配体 DHAP）——非本步醛缩酶口袋；实验坐标。", marks: [{ name: "C1", kind: "newbond", note: "C1 醛基碳" }] },
      ],
    },
    product: {
      name: "果糖-1,6-二磷酸（FBP）",
      formula: "C₆H₁₀O₁₂P₂",
      parts: [
        {
          ...FBP_GN,
          sourceNote:
            "取自人肝果糖-1,6-二磷酸酶 1（FBPase1，糖异生第 9 步）PDB 5ZWK（2.10 Å · X-ray · Homo sapiens · 链 A · 配体 FBP）——人源但非本步醛缩酶口袋；实验坐标（与第 9 步共享资产）。",
          marks: [{ name: "C1", kind: "newbond", note: "C1 新 C–C 键" }, { name: "C2", kind: "newbond" }],
        },
      ],
    },
    arrowLabel: "ALDOB · C1–C2 缩合，三碳 + 三碳 → 六碳",
    change:
      "DHAP 的 C1 与 GAP 的 C1 缩合，生成六碳的二磷酸果糖：重原子 20→20，拓扑改变（新 C–C 键）。但实验 FBP 是口袋内的折叠构象，体积 243.0→231.3 Å³（ΔV −4.81%，超过 2.5%），所以该块仍默认 3D，规则不放宽。",
    physiology: "糖异生的碳骨架拼接：两个三碳糖合成六碳糖，是整条通路“由小变大”的关键一步。",
  },
  {
    stepId: "gn-9",
    evidence: {
      substrate: [evOwnHuman("fbp-gn")],
      product: [evOwnNonhuman("f6p-gn")],
    },
    index: 9,
    enzyme: "果糖-1,6-二磷酸酶",
    isozyme: "FBPase1（肝型）",
    equation: "果糖-1,6-二磷酸 + H₂O → 果糖-6-磷酸 + Pi",
    substrate: {
      name: "果糖-1,6-二磷酸（FBP）",
      formula: "C₆H₁₀O₁₂P₂",
      parts: [{ ...FBP_GN, marks: [{ name: "C1", kind: "leaving", note: "C1 磷酸水解" }] }],
    },
    product: {
      name: "果糖-6-磷酸（F6P）",
      formula: "C₆H₁₁O₉P",
      parts: [{ ...F6P_GN, marks: [{ name: "C1", kind: "newbond", note: "C1 新 OH" }] }],
    },
    arrowLabel: "FBPase1 · C1 磷酸水解（不可逆闸门）",
    change: "C1 的磷酸水解离去，FBP 变 F6P：重原子 20→16，去掉一个磷酸，体积明显缩小。",
    physiology: "糖异生的第三个不可逆闸门：绕开 PFK-1，把二磷酸糖降回单磷酸糖。",
  },
  {
    stepId: "gn-10",
    evidence: {
      substrate: [evOwnNonhuman("f6p")],
      product: [evOtherHuman("g6p")],
    },
    index: 10,
    enzyme: "磷酸葡萄糖异构酶",
    isozyme: "GPI",
    equation: "果糖-6-磷酸 ⇌ 葡萄糖-6-磷酸",
    substrate: {
      name: "果糖-6-磷酸（F6P）",
      formula: "C₆H₁₁O₉P",
      parts: [{ ...F6P, sourceNote: "取自小鼠磷酸葡萄糖异构酶 GPI PDB 2CXS（1.50 Å · X-ray · Mus musculus · 链 A · 配体 F6P）——本步本酶（GPI）但非人源；实验坐标。", marks: [{ name: "C2", kind: "newbond", note: "C2 酮基" }] }],
    },
    product: {
      name: "葡萄糖-6-磷酸（G6P）",
      formula: "C₆H₁₁O₉P",
      parts: [{ ...G6P, sourceNote: "取自人己糖激酶 HK1 PDB 1CZA（1.90 Å · X-ray · Homo sapiens · 链 A · 配体 G6P）——人源但非本步 GPI 口袋；实验坐标（糖酵解页共享资产）。", marks: [{ name: "C1", kind: "newbond", note: "C1 醛糖" }] }],
    },
    arrowLabel: "GPI · 酮糖→醛糖异构",
    change: "羰基从 C2 移到 C1：F6P 的酮糖（五元环）变回 G6P 的醛糖（六元环）；原子组成不变，环大小与构型随之改变。按规则该块默认 2D。",
    physiology: "把酮糖变回醛糖，为最后一步去磷酸化准备 G6P。",
    defaultMode: "2d",
    defaultModeRule:
      "默认 2D 判据：重原子数同为 16；体积 192.1→190.2 Å³（ΔV −0.99%，≤2.5%）；拓扑改变（C2 酮糖→C1 醛糖，五元环→六元环）。",
  },
  {
    stepId: "gn-11",
    evidence: {
      substrate: [evOtherHuman("g6p")],
      product: [evOtherHuman("glc")],
    },
    index: 11,
    enzyme: "葡糖-6-磷酸酶",
    isozyme: "G6PC1（肝/肾）",
    equation: "葡萄糖-6-磷酸 + H₂O → 葡萄糖 + Pi",
    substrate: {
      name: "葡萄糖-6-磷酸（G6P）",
      formula: "C₆H₁₁O₉P",
      parts: [{ ...G6P, sourceNote: "取自人己糖激酶 HK1 PDB 1CZA（1.90 Å · X-ray · Homo sapiens · 链 A · 配体 G6P）——人源但非本步 G6PC1 口袋；实验坐标（糖酵解页共享资产）。", marks: [{ name: "C6", kind: "leaving", note: "C6 磷酸水解" }] }],
    },
    product: {
      name: "葡萄糖（GLC）",
      formula: "C₆H₁₂O₆",
      parts: [{ ...GLC, sourceNote: "取自人己糖激酶 HK1 PDB 1CZA（1.90 Å · X-ray · Homo sapiens · 链 A · 配体 GLC）——人源但非本步 G6PC1 口袋；实验坐标（糖酵解页共享资产）。", marks: [{ name: "C6", kind: "newbond", note: "C6–OH" }] }],
    },
    arrowLabel: "G6PC1 · C6 磷酸水解，释出游离葡萄糖",
    change: "C6 的磷酸酯被水解，G6P 变回葡萄糖：重原子 16→12，去掉整个磷酸，分子缩小。游离葡萄糖可离开肝细胞进入血液。",
    physiology: "糖异生的出口：肝脏把 G6P 去磷酸化，释放可被其他组织摄取的葡萄糖。",
  },
  {
    stepId: "gn-cori",
    evidence: {
      substrate: [evComputed("lac")],
      product: [evOtherHuman("pyr-gn")],
    },
    index: 12,
    stageLabel: "乳酸支路",
    enzyme: "乳酸脱氢酶",
    isozyme: "LDHA",
    equation: "L-乳酸 + NAD⁺ ⇌ 丙酮酸 + NADH + H⁺",
    substrate: {
      name: "L-乳酸（(S)-构型）",
      formula: "C₃H₅O₃",
      parts: [{ ...LAC_MOL, marks: [{ name: "C1", kind: "leaving", note: "C1 氧化为酮" }, { name: "C2", kind: "newbond" }] }],
    },
    product: {
      name: "丙酮酸",
      formula: "C₃H₃O₃",
      parts: [{ ...PYR_GN, sourceNote: "取自人丙酮酸激酶 M2 PKM2 PDB 4YJ5（2.41 Å · X-ray · Homo sapiens · 链 A · 配体 PYR）——人源但非本步 LDH-A 口袋；实验坐标。", marks: [{ name: "C1", kind: "newbond", note: "新羧基" }, { name: "C2", kind: "newbond", note: "C2 酮基" }] }],
      cofactorNote: "NAD⁺ / NADH 为辅因子，按本页口径不入画。",
    },
    arrowLabel: "LDHA · 乳酸氧化为丙酮酸（Cori 循环入口）",
    change: "C2 的羟基氧化为酮、C1 仍是羧酸：L-乳酸脱氢变丙酮酸；重原子同为 6，但 C–O/C=O 键级改变。体积差 −8.48%（乳酸计算构象 vs 丙酮酸实验构象），超过阈值，该块默认 3D。",
    physiology: "Cori 循环的肝脏端：把肌肉送来的乳酸氧化回丙酮酸，再进入糖异生。",
  },
  {
    stepId: "gn-ala",
    evidence: {
      substrate: [evOtherHuman("ala"), evOtherHuman("akg")],
      product: [evOtherHuman("pyr-gn"), evOtherHuman("glu")],
    },
    index: 13,
    stageLabel: "丙氨酸支路",
    enzyme: "丙氨酸氨基转移酶",
    isozyme: "ALT1（肝型，PLP 依赖）",
    equation: "L-丙氨酸 + α-酮戊二酸 ⇌ 丙酮酸 + L-谷氨酸",
    substrate: {
      name: "L-丙氨酸 + α-酮戊二酸",
      formula: "C₃H₇NO₂ + C₅H₄O₅",
      parts: [
        { ...ALA_MOL, marks: [{ name: "N", kind: "leaving", note: "氨基转移" }, { name: "C2", kind: "newbond" }] },
        {
          ...AKG,
          sourceNote:
            "取自人线粒体异柠檬酸脱氢酶 IDH2 R140Q（TCA 第 3 步）PDB 5I95（1.54 Å · X-ray · Homo sapiens · 链 A · 配体 AKG）——TCA 页共享资产，非本步 ALT 口袋；实验坐标。",
          marks: [{ name: "C2", kind: "newbond", note: "接受氨基" }],
        },
      ],
    },
    product: {
      name: "丙酮酸 + L-谷氨酸",
      formula: "C₃H₃O₃ + C₅H₈NO₄",
      parts: [
        { ...PYR_GN, sourceNote: "取自人丙酮酸激酶 M2 PKM2 PDB 4YJ5（2.41 Å · X-ray · Homo sapiens · 链 A · 配体 PYR）——人源但非本步 ALT 口袋；实验坐标。", marks: [{ name: "C2", kind: "newbond", note: "新酮基" }] },
        { ...GLU_MOL, marks: [{ name: "N", kind: "added", note: "新氨基" }, { name: "C2", kind: "newbond" }] },
      ],
      cofactorNote: "PLP 为辅因子，按本页口径不入画；产物侧只显示丙酮酸与谷氨酸的碳骨架。",
    },
    arrowLabel: "ALT · 氨基从 Ala 转到 α-KG",
    change:
      "丙氨酸的氨基转移给 α-酮戊二酸：丙氨酸失去氨基变丙酮酸，α-KG 得到氨基变谷氨酸。重原子合计 16→16，键级与取代基改变而体积几乎不变；按规则该块默认 2D。",
    physiology: "丙氨酸支路的肝脏端：把肌肉送来的丙氨酸脱氨基成丙酮酸，进入糖异生；氨基以谷氨酸形式进入尿素循环。",
    defaultMode: "2d",
    defaultModeRule:
      "默认 2D 判据：重原子数合计同为 16；体积 197.7→198.2 Å³（ΔV +0.25%，≤2.5%）；拓扑改变（氨基从 Ala 转到 α-KG，C2 取代基改变）。",
  },
];

/* ============================================================
   β-氧化（FAO）—— 6 块：活化 / 肉碱穿梭 / 四步循环
   分子资产：8 个新建 + 乙酰-CoA（TCA 页共享）；脂酰-CoA 系列全部分块。
   ============================================================ */
const FA_MOL = {
  id: "fa",
  name: "棕榈酸（软脂酸，C16:0）",
  formula: "C₁₆H₃₁O₂",
  asset2d: D2("fa"),
  sourceNote:
    "计算构象 · 自由态（RDKit ETKDGv3 30 起点 + MMFF94）；无同分子实验配体。游离棕榈酸在血浆中主要与白蛋白结合：本资产是自由态，不等于白蛋白结合态，也不代表膜内构象。",
};
const ACYL_C16 = {
  id: "acylcoa-c16",
  name: "棕榈酰-CoA（分块 · C16 酰基 + 硫酯 S）",
  formula: "C₁₇H₃₄OS（反应端）",
  asset2d: D2("acylcoa-c16"),
  caveat:
    "分块呈现，不是完整分子：只画反应端（棕榈酰基 C1–C16 + 硫酯 S），CoA 长链省略，S 右侧碳仅作折线起点并标「CoA 略」。完整棕榈酰-CoA 为 C₃₇H₆₄N₇O₁₇P₃S。链长 C16 保留在酰基链上，不是完整 CoA。",
  sourceNote:
    "取自 PDB 5DV5（2.40 Å · X-ray · Vibrio alginolyticus · 链 A · 配体 PKZ · 65 重原子）——完整棕榈酰-CoA，但来源蛋白是细菌脂肪酸响应转录因子 FadR，不是 β-氧化酶口袋。本步酶（ACAD 家族）口袋内 C16 饱和脂酰-CoA 的高分辨结构本轮未获；只取反应端实测几何。",
};
const ENOYL_C16 = {
  id: "enoyl-c16",
  name: "反式-Δ²-棕榈烯酰-CoA（分块 · C16 烯酰基）",
  formula: "C₁₇H₃₂OS（反应端）",
  asset2d: D2("enoyl-c16"),
  caveat:
    "分块呈现，不是完整分子：只画反应端（C1–C16 烯酰基 + 硫酯 S），CoA 长链省略，S 右侧碳标「CoA 略」。完整反式-Δ²-棕榈烯酰-CoA 为 C₃₇H₆₂N₇O₁₇P₃S。2UXW 的 TH3 在晶体中只建模 24 个重原子，是截短的酰基-N-乙酰半胱胺硫酯（CoA 尾未建模），不是完整 CoA；本块只用其反应端实测几何。",
  sourceNote:
    "取自 PDB 2UXW（1.45 Å · X-ray · Homo sapiens · 链 A · 配体 TH3）——人极长链酰基-CoA 脱氢酶 VLCAD（ACADVL），正是本步同酶家族；TH3 为截短配体（CoA 尾未建模），C2=C3 为实测 trans 几何。",
};
const HYDROXY_C16 = {
  id: "hydroxy-c16",
  name: "L-3-羟基棕榈酰-CoA（分块 · C16 羟酰基）",
  formula: "C₁₇H₃₄O₂S（反应端）",
  asset2d: D2("hydroxy-c16"),
  caveat:
    "分块呈现，不是完整分子；且为计算构象。只画反应端（C1–C16 羟酰基 + 硫酯 S），C3 为 L-3-羟基（S 构型），CoA 长链省略。完整 L-3-羟基棕榈酰-CoA 为 C₃₇H₆₄N₇O₁₈P₃S。",
  sourceNote:
    "计算构象 · 自由态（RDKit ETKDGv3 30 起点 + MMFF94）；本步酶（人 HADH）口袋内 C16 3-羟基脂酰-CoA 的实验络合物本轮未获。人 HADH 的 C4 3-羟基丁酰-CoA 络合物 1F12 存在，但链长 C4 与 C16 不一致，混用会让 ΔV 把链长差当成化学变化，故不采用。自由态，不等于 HADH 口袋的结合态。",
};
const KETO_C16 = {
  id: "keto-c16",
  name: "3-酮棕榈酰-CoA（分块 · C16 酮酰基）",
  formula: "C₁₇H₃₂O₂S（反应端）",
  asset2d: D2("keto-c16"),
  caveat:
    "分块呈现，不是完整分子；且为计算构象。只画反应端（C1–C16 酮酰基 + 硫酯 S），C3 为酮基，CoA 长链省略。完整 3-酮棕榈酰-CoA 为 C₃₇H₆₂N₇O₁₈P₃S。",
  sourceNote:
    "计算构象 · 自由态（RDKit ETKDGv3 30 起点 + MMFF94）；本步酶（人 SCHAD/HADH）口袋内 C16 3-酮脂酰-CoA 的实验络合物本轮未获。人 SCHAD 的 C4 乙酰乙酰-CoA 络合物 1F0Y 存在，但链长 C4 与 C16 不一致，混用会把链长差当成化学变化，故不采用。自由态，不等于 SCHAD/HADH 口袋的结合态。",
};
const ACYL_C14 = {
  id: "acylcoa-c14",
  name: "肉豆蔻酰-CoA（分块 · C14 酰基 + 硫酯 S）",
  formula: "C₁₅H₃₀OS（反应端）",
  asset2d: D2("acylcoa-c14"),
  caveat:
    "分块呈现，不是完整分子；且为计算构象。只画反应端（C14 酰基 + 硫酯 S），CoA 长链省略。完整肉豆蔻酰-CoA 为 C₃₅H₆₀N₇O₁₇P₃S。该块用于让读者看见第 4 步链缩短 2C：C16 酮酰基 → C14 酰基。",
  sourceNote:
    "计算构象 · 自由态（RDKit ETKDGv3 30 起点 + MMFF94）；C14 肉豆蔻酰-CoA 的完整实验配体本轮未获。链长 C14 由酰基链上的 14 个碳明确表达，比 C16 少两个碳。自由态，不等于酶口袋的结合态。",
};
const ACYLCARN = {
  id: "acylcarn",
  name: "棕榈酰肉碱（C16 脂酰肉碱）",
  formula: "C₂₃H₄₅NO₄",
  asset2d: D2("acylcarn"),
  sourceNote:
    "计算构象 · 自由态（RDKit ETKDGv3 30 起点 + MMFF94）；2RCU 的 BUJ 是棕榈酰肉碱类似物（鼠 CPT2），不是同一分子，本轮不用类似物冒充底物。C3 按天然 (R)-肉碱构型建模；自由态，不等于 CPT1/CPT2 结合态。",
};
const CARN = {
  id: "carn",
  name: "L-肉碱（(R)-3-羟基-4-三甲铵丁酸）",
  formula: "C₇H₁₅NO₃",
  asset2d: D2("carn"),
  sourceNote:
    "计算构象 · 自由态（RDKit ETKDGv3 30 起点 + MMFF94）；肉碱作为酰基载体入画，自由态构象不等于 CPT1/CPT2 结合态。C3 按天然 (R)-构型建模。",
};

const FAO_COMPARISON: StepComparison[] = [
  {
    stepId: "fao-act",
    index: 0,
    stageLabel: "前置 · 活化",
    enzyme: "脂酰-CoA 合成酶（ACSL / ACSVL）",
    equation: "棕榈酸 + CoA-SH + ATP → 棕榈酰-CoA + AMP + PPi（PPi → 2 Pi）",
    substrate: {
      name: "棕榈酸（C16:0）",
      formula: "C₁₆H₃₁O₂",
      parts: [{ ...FA_MOL }],
      cofactorNote: "ATP、CoA-SH、Mg²⁺ 按本页口径不入画；左侧只显示棕榈酸碳骨架。",
    },
    product: {
      name: "棕榈酰-CoA（分块 · 反应端）",
      formula: "C₁₇H₃₄OS（片段）",
      parts: [
        { ...ACYL_C16, marks: [
          { name: "S", kind: "newbond", note: "新硫酯键" },
          { name: "C17", kind: "added", note: "CoA 折线起点" },
        ] },
      ],
      cofactorNote: "ATP 拆成 AMP + PPi，PPi 再水解为 2 Pi；这两步共消耗 2 个高能磷酸键，CoA 长链省略。",
    },
    evidence: {
      substrate: [evComputed("fa")],
      product: [evOtherNonhuman("acylcoa-c16")],
    },
    arrowLabel: "ATP 驱动：羧基 → 硫酯（AMP + PPi，消耗 2 个高能键）",
    change:
      "把游离脂肪酸的羧基转成酰基-CoA 硫酯：这是整条通路唯一的「入场费」。重原子 18→19（新增硫酯 S 与 CoA 折线起点），体积 288.6→318.6 Å³（ΔV +10.40%），键级与官能团改变；按规则默认 3D。",
    physiology:
      "长链脂肪酸不能自由过膜，必须先变成「酰基硫酯通货」才能进入 β-氧化或酯化。ATP→AMP+PPi 直接拆 1 个高能键，PPi 水解再补 1 个，合计 2 个高能磷酸键——这就是软脂酸能量账要从毛收入扣 2 的原因。",
    defaultMode: "3d",
    defaultModeRule:
      "默认 3D 判据：重原子 18→19（不等）；体积 288.6→318.6 Å³（ΔV +10.40%，>2.5%）；拓扑改变（羧基 → 硫酯）。",
  },
  {
    stepId: "fao-shuttle",
    index: 0,
    stageLabel: "前置 · 跨膜",
    enzyme: "CPT1（外膜限速）→ CACT（内膜转位）→ CPT2（基质侧）",
    equation: "脂酰-CoA（胞质）+ 肉碱 → 脂酰肉碱 → 脂酰-CoA（基质）+ 肉碱",
    substrate: {
      name: "棕榈酰-CoA（胞质侧）+ 肉碱",
      formula: "C₁₇H₃₄OS（片段）+ C₇H₁₅NO₃",
      parts: [{ ...ACYL_C16 }, { ...CARN }],
      cofactorNote: "肉碱为载体；CoA-SH 在 CPT2 侧换回。图中只画脂酰基与肉碱本体，CoA 长链省略。",
    },
    product: {
      name: "棕榈酰肉碱（膜间腔 / 转位中间态）",
      formula: "C₂₃H₄₅NO₄",
      parts: [{ ...ACYLCARN }],
      cofactorNote: "CACT 是电中性交换：脂酰肉碱进、肉碱出，不耗 ATP；本块产物是转位中间态，最终在基质侧换回脂酰-CoA。",
    },
    evidence: {
      substrate: [evOtherNonhuman("acylcoa-c16"), evComputed("carn")],
      product: [evComputed("acylcarn")],
    },
    arrowLabel: "只换载体：脂酰基整体转移，无碳骨架改变（不耗 ATP）",
    change:
      "脂酰基从 CoA 转到肉碱，过内膜后再从肉碱转回 CoA：两次都是硫酯 ↔ 酯的载体交换，脂酰基的碳骨架与氧化态完全不变。图中把肉碱本体一起入画：底物侧（C16 酰基-CoA 片段 19 原子 + 肉碱 11 原子，共 30）→ 产物棕榈酰肉碱 28 原子（CoA 的 S 与折线起点随 CoA-SH 离开，CoA 长链省略）。体积 478.2→431.2 Å³（ΔV −9.83%）；这是载体差异，不是化学氧化，按规则默认 3D，ΔV 不应读成「氧化程度」。",
    physiology:
      "长链脂肪酸唯一的入场券：CPT1 是限速闸，被丙二酰-CoA 抑制（「合成开启时焊死分解的门」），避免脂肪酸合成与氧化同时空转。CACT 电中性交换过内膜，基质侧 CPT2 换回 CoA-SH，肉碱回程复用。",
    defaultMode: "3d",
    defaultModeRule:
      "默认 3D 判据：重原子 30→28（不等；底物侧含肉碱 11 原子）；体积 478.2→431.2 Å³（ΔV −9.83%，>2.5%）；拓扑改变为载体交换，但酰基碳骨架未变（ΔV 只反映载体体积，不应当作氧化程度）。",
  },
  {
    stepId: "fao-1",
    index: 1,
    enzyme: "酰基-CoA 脱氢酶（ACAD 家族；长链 VLCAD/LCAD）",
    equation: "棕榈酰-CoA + FAD → 反式-Δ²-棕榈烯酰-CoA + FADH₂",
    substrate: {
      name: "棕榈酰-CoA（分块 · C16）",
      formula: "C₁₇H₃₄OS（片段）",
      parts: [{ ...ACYL_C16 }],
      cofactorNote: "FAD 为辅基，按本页口径不入画；底物侧的 C2–C3 是饱和单键。",
    },
    product: {
      name: "反式-Δ²-棕榈烯酰-CoA（分块 · C16）",
      formula: "C₁₇H₃₂OS（片段）",
      parts: [{ ...ENOYL_C16, marks: [
        { name: "C2", kind: "newbond", note: "C2=C3 反式双键" },
        { name: "C3", kind: "newbond" },
      ] }],
      cofactorNote: "FAD→FADH₂ 不入画；产物侧的 C2=C3 是实测 trans 双键。",
    },
    evidence: {
      substrate: [evOtherNonhuman("acylcoa-c16")],
      product: [evOwnHuman("enoyl-c16")],
    },
    arrowLabel: "C2–C3 脱氢：生成反式 C2=C3，FAD → FADH₂",
    change:
      "从 C2–C3 取两个氢，造一个反式-Δ² 双键。重原子 19→19（只改键级），体积 318.6→310.4 Å³（ΔV −2.57%）；拓扑改变（C2=C3 双键）。ΔV 恰好超过 2.5% 阈值，按规则默认 3D，不因「只改键级」而误判为 2D。",
    physiology:
      "每轮的第一刀：把氧化当量记在 FAD 名下。双键氧化的低能级只够还原 FAD（1.5 ATP 当量），电子经 ETF→ETF-QO 入呼吸链——这是 β-氧化「氧化剂分级」的第一个锚点。",
    defaultMode: "3d",
    defaultModeRule:
      "默认 3D 判据：重原子 19→19；体积 318.6→310.4 Å³（ΔV −2.57%，>2.5%）；拓扑改变（C2=C3 双键）。差 0.07 个百分点未命中 2D 阈值，如实按 3D。",
  },
  {
    stepId: "fao-2",
    index: 2,
    enzyme: "烯酰-CoA 水合酶（ECHS1 / crotonase）",
    equation: "反式-Δ²-棕榈烯酰-CoA + H₂O → L-3-羟基棕榈酰-CoA",
    substrate: {
      name: "反式-Δ²-棕榈烯酰-CoA（分块 · C16）",
      formula: "C₁₇H₃₂OS（片段）",
      parts: [{ ...ENOYL_C16 }],
      cofactorNote: "H₂O 按本页口径不入画；底物侧 C2=C3 为反式双键。",
    },
    product: {
      name: "L-3-羟基棕榈酰-CoA（分块 · C16）",
      formula: "C₁₇H₃₄O₂S（片段）",
      parts: [{ ...HYDROXY_C16, marks: [
        { name: "C3", kind: "newbond", note: "C3 接 OH（L 构型）" },
      ] }],
      cofactorNote: "H₂O 的 O 加到 C3、H 加到 C2；产物侧只画 C3-OH，水分子本身不入画。",
    },
    evidence: {
      substrate: [evOwnHuman("enoyl-c16")],
      product: [evComputed("hydroxy-c16")],
    },
    arrowLabel: "加水：C2=C3 → C3-OH（L 构型）",
    change:
      "反式双键加水：C3 接羟基、C2 接氢，生成 L-3-羟基脂酰-CoA。重原子 19→20（新增 1 个 O），体积 310.4→326.7 Å³（ΔV +5.25%）；官能团与键级同时改变，按规则默认 3D。",
    physiology:
      "把双键变成可氧化的羟基：一步水化打通「烯 → 醇」并锁定 L-构型，为第 3 步的标准醇氧化备好底物——没有这步，NAD⁺ 的 2.5 当量就无从谈起。",
    defaultMode: "3d",
    defaultModeRule:
      "默认 3D 判据：重原子 19→20（不等）；体积 310.4→326.7 Å³（ΔV +5.25%，>2.5%）；拓扑改变（C3-OH 新基团）。",
  },
  {
    stepId: "fao-3",
    index: 3,
    enzyme: "L-3-羟脂酰-CoA 脱氢酶（HADH / SCHAD）",
    equation: "L-3-羟基棕榈酰-CoA + NAD⁺ → 3-酮棕榈酰-CoA + NADH + H⁺",
    substrate: {
      name: "L-3-羟基棕榈酰-CoA（分块 · C16）",
      formula: "C₁₇H₃₄O₂S（片段）",
      parts: [{ ...HYDROXY_C16 }],
      cofactorNote: "NAD⁺ 按本页口径不入画；底物侧 C3 为 L-3-羟基。",
    },
    product: {
      name: "3-酮棕榈酰-CoA（分块 · C16）",
      formula: "C₁₇H₃₂O₂S（片段）",
      parts: [{ ...KETO_C16, marks: [
        { name: "C3", kind: "newbond", note: "C3-OH → C3=O" },
      ] }],
      cofactorNote: "NAD⁺→NADH + H⁺ 不入画；产物侧 C3 为酮基，O 仍在位但键级改变。",
    },
    evidence: {
      substrate: [evComputed("hydroxy-c16")],
      product: [evComputed("keto-c16")],
    },
    arrowLabel: "再脱氢：C3-OH → C3=O，NAD⁺ → NADH",
    change:
      "标准醇氧化：C3 的羟基被 NAD⁺ 氧化成酮基，重原子 20→20（只改键级，O 未增减），体积 326.7→320.8 Å³（ΔV −1.81%）；拓扑改变（C3-OH → C3=O）。命中「重原子不变 + 拓扑改变 + |ΔV| ≤ 2.5%」，按规则默认 2D。",
    physiology:
      "第二刀换 NAD⁺：标准醇氧化够格还原 NAD⁺（2.5 ATP 当量），与第 1 步的 FAD（1.5 当量）构成「氧化剂分级」——本通路第二个教学锚点，也是能量账里 7 NADH 的来源。",
    defaultMode: "2d",
    defaultModeRule:
      "默认 2D 判据：重原子 20→20；体积 326.7→320.8 Å³（ΔV −1.81%，≤2.5%）；拓扑改变（C3-OH → C3=O），且 O 原子未增减，故判 2D。?mode= 仍可显式覆盖。",
  },
  {
    stepId: "fao-4",
    index: 4,
    enzyme: "β-酮脂酰-CoA 硫解酶（线粒体 ACAA2）",
    equation: "3-酮棕榈酰-CoA + CoA-SH → 乙酰-CoA + 肉豆蔻酰-CoA（C14）",
    substrate: {
      name: "3-酮棕榈酰-CoA（分块 · C16）",
      formula: "C₁₇H₃₂O₂S（片段）",
      parts: [{ ...KETO_C16, marks: [
        { name: "C3", kind: "leaving", note: "C2–C3 硫解断键" },
      ] }],
      cofactorNote: "CoA-SH 按本页口径不入画；断键发生在 C2–C3 之间（C3 为酮基）。",
    },
    product: {
      name: "乙酰-CoA + 肉豆蔻酰-CoA（C14）",
      formula: "C₃H₆OS + C₁₅H₃₀OS（两个反应端片段）",
      parts: [
        { ...ACCOA, sourceNote: "取自人柠檬酸合酶（CS，TCA 第 1 步）的三元反应中间态 PDB 8ZW1（2.10 Å · X-ray · Homo sapiens · 链 B · 配体 ACO · 完整 CoA 51 重原子）——TCA 页共享资产，不是本步硫解酶口袋；本页只画反应端。", marks: [
          { name: "S", kind: "newbond", note: "新生乙酰基硫酯" },
        ] },
        { ...ACYL_C14, marks: [
          { name: "C14", kind: "newbond", note: "链缩短 2C 后的末端" },
        ] },
      ],
      cofactorNote: "CoA-SH 不入画；乙酰-CoA 出环进 TCA，C14 脂酰-CoA 回到第 1 步即下一轮。",
    },
    evidence: {
      substrate: [evComputed("keto-c16")],
      product: [evOtherHuman("accoa"), evComputed("acylcoa-c14")],
    },
    arrowLabel: "硫解：C2–C3 断裂，乙酰-CoA 出环，链 −2C",
    change:
      "Claisen 硫解：C2–C3 键断裂，C1–C2 以乙酰-CoA 离环，剩余 C3–C16 变成 C14 脂酰-CoA（C14 是原链的 C3–C16，编号重排后为新链 C1–C14）。重原子 20→24（乙酰-CoA 5 + C14 片段 17，CoA 长链省略），体积 320.8→（83.3 + 284.9）Å³（ΔV +14.8%）；这是断键，不是简单构象变化，按规则默认 3D。",
    physiology:
      "每轮在此收尾：乙酰-CoA 进 TCA（每分子按 10 ATP 计），剩余链 −2C 回到第 1 步。软脂酸 C16 经 7 轮得到 8 乙酰-CoA + 7 FADH₂ + 7 NADH；能量账必须从「每轮产出」汇总，不能只看最后一步。",
    defaultMode: "3d",
    defaultModeRule:
      "默认 3D 判据：重原子 20→24（不等）；体积 320.8→368.2 Å³（ΔV +14.8%，>2.5%）；拓扑改变为 Claisen 断键，产物为两个分子。",
  },
];

const FAO_CONFIG: ComparisonConfig = {
  pathwayId: "fatty-acid-oxidation",
  title: "β-氧化 · 结构对照",
  summary:
    "六块逐步对照：活化 + 肉碱穿梭 + 四步循环。只对分子本身作形状对照——左侧酶位如实声明「未建立」，不伪造酶结构。9 个入画的分子中 3 个用 RCSB 实验配体坐标（棕榈酰-CoA 5DV5、反式-Δ²-棕榈烯酰-CoA 2UXW、乙酰-CoA 8ZW1），6 个用 RDKit 计算构象并标「自由态，不等于结合态」；脂酰-CoA 系列全部分块，只画酰基链 + 硫酯 S，CoA 长链省略。",
  plateNo: "PLATE SF-05 · 结构对照 · β-氧化 · 2026",
  back: { to: "/pathway/fatty-acid-oxidation", label: "← 返回挂图" },
  backCaption: "β-氧化 · 结构对照（挂图页 /pathway/fatty-acid-oxidation）",
  enzymePanel: false,
  enzymePanelOffNote: "本通路酶 3D 结构资产未建立 · 本轮只做分子对照",
  footerNote:
    "β-氧化数据层登记 17 个代谢物实体；本页入画 8 个（棕榈酸、棕榈酰-CoA、反式-Δ²-棕榈烯酰-CoA、L-3-羟基棕榈酰-CoA、3-酮棕榈酰-CoA、棕榈酰肉碱、L-肉碱、乙酰-CoA），另为第 4 步链缩短单建 C14 脂酰-CoA 变体，共 9 个分子块。实验坐标 3 个：棕榈酰-CoA 5DV5（2.40 Å，Vibrio alginolyticus FadR，非 β-氧化酶）、反式-Δ²-棕榈烯酰-CoA 2UXW（1.45 Å，人 VLCAD，TH3 为截短配体）、乙酰-CoA 8ZW1（2.10 Å，人 CS，TCA 页共享）。计算构象 6 个：棕榈酸、L-3-羟基棕榈酰-CoA、3-酮棕榈酰-CoA、C14 脂酰-CoA、棕榈酰肉碱、L-肉碱。未入画 9 个：ATP / AMP / PPi / CoA-SH / FAD / FADH₂ / NAD⁺ / NADH / H₂O——沿用糖酵解与 TCA 的「辅因子与溶剂不入主链画」口径，在块内 cofactorNote 逐条说明。已知缺口：人 HADH 的 C4 羟基/酮基络合物 1F12、1F0Y 存在，但链长 C4 与 C16 不一致，本轮不混用；2RCU 的 BUJ 是棕榈酰肉碱类似物，不冒充底物；CPT1 人源无结构，穿梭段只做分子对照、不建膜蛋白视图。",
  defaultModePolicy:
    "默认模式按数据判据逐块决定：重原子数不变 + 拓扑改变（原子命名下的连接/键级/环大小变化）+ |ΔV| ≤ 2.5% → 该块默认 2D，其余默认 3D。?mode=2d|3d 为显式覆盖，优先级高于默认值。",
  steps: FAO_COMPARISON,
};

const PPP_CONFIG: ComparisonConfig = {
  pathwayId: "ppp",
  title: "磷酸戊糖途径 · 结构对照",
  summary:
    "八块逐步对照：氧化支路 3 步 + 非氧化支路 5 步，只对分子本身作形状对照——左侧酶位如实声明「未建立」，不伪造酶结构。页头开关整页切换 3D 球棍 / 2D 结构式；箭头下方始终给出范德华体积与主轴长度变化。11 个分子中 7 个用 RCSB 实验配体坐标，3 个（6PGL / Xu5P / GAP）无本体络合物、用 RDKit 计算构象并标「自由态，不等于结合态」；CO₂ 只做 2D、3D 不建。每块分子对照下方有一句首屏可见的「配体来源」。",
  plateNo: "PLATE SF-04 · 结构对照 · PPP · 2026",
  back: { to: "/pathway/ppp", label: "← 返回挂图" },
  backCaption: "磷酸戊糖途径 · 结构对照（挂图页 /pathway/ppp）",
  enzymePanel: false,
  enzymePanelOffNote: "本通路酶 3D 结构资产未建立 · 本轮只做分子对照",
  footerNote:
    "PPP 11 个分子中 7 个取自 RCSB 实验配体络合物（G6P 7SNI 人 G6PD；6PG 3E7F / 2W90 非人源；Ru5P 3OVQ 人 RPE 与 2VVP 结核 RpiB；R5P 2VVP；S7P 4R75 AfuA；E4P 5XPS 酵母 TK；F6P 2CXS 小鼠 GPI），3 个为 RDKit 计算构象（6PGL、Xu5P、GAP：PDB 无本体络合物；4KXV 的 DX5 是木糖醇-5-磷酸类似物，不作底物），CO₂ 仅 3 原子只做 2D。非人源来源逐条写在各块：6PG（布氏锥虫 / 嗜热地芽孢杆菌）、Ru5P/R5P（结核分枝杆菌）、S7P（胸膜肺炎放线杆菌 AfuA，非本通路酶）、E4P（树干毕赤酵母）。分级口径：2VVP 的 RpiB 与人类 RPIA（RpiA 家族）不是同一酶，Ru5P / R5P 按「跨种非本酶」计，不按「本步跨种」计。已知缺口：本通路酶 3D 结构资产未建立，左侧只给灰字声明；挂图页已接入（/pathway/ppp），本页从挂图右栏入口进入。",
  defaultModePolicy:
    "默认模式按数据判据逐块决定：重原子数不变 + 拓扑改变（原子命名下的连接/键级/环大小变化）+ |ΔV| ≤ 2.5% → 该块默认 2D，其余默认 3D。?mode=2d|3d 为显式覆盖，优先级高于默认值。",
  steps: PPP_COMPARISON,
};

const GLUCONEOGENESIS_CONFIG: ComparisonConfig = {
  pathwayId: "gluconeogenesis",
  title: "糖异生 · 结构对照",
  summary:
    "十一块主链 + 两条支路（乳酸 Cori、丙氨酸）：只对分子本身作形状对照——左侧酶位如实声明「未建立」，不伪造酶结构。页头开关整页切换 3D 球棍 / 2D 结构式；箭头下方始终给出范德华体积与主轴长度变化。FBP / F6P / 丙酮酸 / 乳酸 / 丙氨酸 / 谷氨酸使用本轮新建的实验或计算资产，其余沿用糖酵解/TCA 页共享资产并在块内写明来源。HCO₃⁻ 只做 2D、3D 不建。",
  plateNo: "PLATE SF-03 · 结构对照 · 糖异生 · 2026",
  back: { to: "/pathway/gluconeogenesis", label: "← 返回挂图" },
  backCaption: "糖异生 · 结构对照",
  enzymePanel: false,
  enzymePanelOffNote: "本通路酶 3D 结构资产未建立 · 本轮只做分子对照",
  footerNote:
    "糖异生主链 11 步 + 乳酸/丙氨酸支路 2 块。新建资产：FBP 5ZWK（人 FBPase1，2.10 Å）、F6P 1EYI（猪肝 FBPase1，2.32 Å）、丙酮酸 4YJ5（人 PKM2，2.41 Å）、丙氨酸 8JDW（人 AGAT，2.30 Å）、谷氨酸 3CZD（人 GLS1，2.40 Å）；乳酸无 L-型实验坐标（PDB 的 LAC 是 D-乳酸），改用 RDKit 计算构象；HCO₃⁻ 仅 4 原子只做 2D。共享资产：PEP/2PG 3UCD（人 ENO2）、3PG 9FDN（人 PGK1）、DHAP 1NEY（酵母 TPI）、GAP 计算构象、OAA 8ZVW（人 CS）、α-KG 5I95（人 IDH2 R140Q）、G6P/GLC 1CZA（人 HK1）。非人源或非本酶口袋逐条写在各块，不拿类似物/对映体冒充底物。数据层口径：gn-ala 实体表只登记丙氨酸、丙酮酸，反应式另含 α-酮戊二酸与谷氨酸，本页按反应式补入（α-KG 复用 TCA 5I95、谷氨酸新建 3CZD）；实体 mal 未被任何步骤使用，本页不展示；数据层「乳酸」未标构型，Cori 循环按 L-乳酸处理（PDB 的 LAC 为 D-型，故用计算构象）。本通路酶 3D 结构资产未建立，左侧只给灰字声明。",
  defaultModePolicy:
    "默认模式按数据判据逐块决定：重原子数不变 + 拓扑改变（原子命名下的连接/键级/环大小变化）+ |ΔV| ≤ 2.5% → 该块默认 2D，其余默认 3D。?mode=2d|3d 为显式覆盖，优先级高于默认值。",
  steps: GLUCONEOGENESIS_COMPARISON,
};

// ------------------------------------------------------------
// PLATE SF-08 · 脂肪酸从头合成（FAS）· 结构对照
//
// 本轮补齐：6 块 12 个分子块都有 2D 结构式 + 3D 资产。
//   · 实验坐标 3 个：乙酰-CoA（8ZW1，人 CS）、丙二酰-CoA（8H6C，人 GCN5）、棕榈酸（2WUT，人髓鞘蛋白 P2）——
//     全部不是 FASN 本酶口袋，块内首屏 sourceNote 逐条写明来源蛋白；等级由 evidenceGrade.ts 推导为 C（人源非本酶）。
//   · 计算构象 6 个：C2 引物、C4 酮 / D-3-羟基 / 反式-Δ²-烯酰 / 饱和酰基、C16 酰基-ACP——
//     均为 ACP 上的共价中间体，PDB 无小分子配体络合物，用 RDKit ETKDGv3 + MMFF94，页面标「计算构象」。
//   · FASN ≈540 kDa 巨型合酶：不做酶的三维，只做小分子；不截取结构冒充全酶。
// 默认模式按既有数据判据逐块计算（数字见每块 defaultModeRule），不手写等级。
// ------------------------------------------------------------
const FAS_ACCOA_FRAG = {
  id: "fas-accoa",
  name: "乙酰-CoA（反应端片段）",
  formula: "C₂H₃OS（片段）",
  asset2d: D2("fas-accoa"),
  caveat: "按本页口径只画乙酰基 + 硫酯 S，CoA 长链省略；与 TCA / β-氧化页的乙酰-CoA 分块一致。",
  sourceNote:
    "实验坐标：PDB 8ZW1 · 链 B · 配体 ACO（X-ray，2.1 Å，Homo sapiens）· 来源蛋白是人柠檬酸合酶 CS（TCA 第 1 步），不是本步 ACC、更不是 FASN；本酶口袋内同分子高分辨结构未获。只取乙酰基 + 硫酯 S 的实测几何，CoA 长链省略。",
};
const FAS_MALONYL_FRAG = {
  id: "fas-malonyl",
  name: "丙二酰-CoA（反应端片段）",
  formula: "C₃H₃O₃S（片段）",
  asset2d: D2("fas-malonyl"),
  caveat: "游离羧酸 −1、硫酯 0；羧基碳在缩合时以 CO₂ 离去，不进入碳链。",
  sourceNote:
    "实验坐标：PDB 8H6C · 链 C · 配体 MLC（X-ray，2.5 Å，Homo sapiens）· 来源蛋白是人 GCN5 组蛋白乙酰转移酶，不是本步 ACC、也不是 FASN；本酶口袋内同分子高分辨结构未获。只取丙二酰基 + 硫酯 S 的实测几何，CoA 长链省略。",
};
const FAS_C2_ACP = {
  id: "fas-c2",
  name: "乙酰-ACP（C2 引物 · 分块）",
  formula: "C₂H₃OS（酰基-ACP 反应端）",
  asset2d: D2("fas-c2"),
  caveat: "ACP 是 FASN 的结构域载体，不按独立分子画；只保留酰基链 + 硫酯 S。",
  sourceNote:
    "计算构象：RDKit ETKDGv3（30 起点）+ MMFF94 取最低能量，无实验配体坐标（酰基-ACP 是 ACP 上的共价中间体，PDB 无小分子配体络合物）；自由态构象不等于 ACP 口袋内的结合态。",
};
const FAS_C4_KETO = {
  id: "fas-c4-keto",
  name: "3-酮丁酰-ACP（C4 · 分块）",
  formula: "C₄H₅O₂S（酰基-ACP 反应端）",
  asset2d: D2("fas-c4-keto"),
  caveat: "缩合新键在 C2–C3 之间；C4 是「引物 C2 + 丙二酰 C2 − CO₂」的结果。",
  sourceNote:
    "计算构象：RDKit ETKDGv3（30 起点）+ MMFF94 取最低能量，无实验配体坐标（C4 酮酰-ACP 是 ACP 上的共价中间体，PDB 无小分子配体络合物）。",
};
const FAS_C4_OH = {
  id: "fas-c4-oh",
  name: "D-3-羟基丁酰-ACP（C4 · 分块）",
  formula: "C₄H₇O₂S（酰基-ACP 反应端）",
  asset2d: D2("fas-c4-oh"),
  caveat: "FAS 生成 D-3-羟基（C3 为 R）；β-氧化水化生成 L-3-羟基，两者是镜像构型，不能互换。",
  sourceNote:
    "计算构象：RDKit ETKDGv3（30 起点，按 C3=R 建模）+ MMFF94 取最低能量，无实验配体坐标（羟酰-ACP 是 ACP 上的共价中间体）。",
};
const FAS_C4_ENOYL = {
  id: "fas-c4-enoyl",
  name: "反式-Δ²-丁烯酰-ACP（C4 · 分块）",
  formula: "C₄H₅OS（酰基-ACP 反应端）",
  asset2d: D2("fas-c4-enoyl"),
  caveat: "脱水生成反式-Δ² 双键；β-氧化在对应步骤加水，方向相反。",
  sourceNote:
    "计算构象：RDKit ETKDGv3（30 起点，C2=C3 反式）+ MMFF94 取最低能量，无实验配体坐标（烯酰-ACP 是 ACP 上的共价中间体）。",
};
const FAS_C4_ACYL = {
  id: "fas-c4-acyl",
  name: "丁酰-ACP（C4，饱和 · 分块）",
  formula: "C₄H₇OS（酰基-ACP 反应端）",
  asset2d: D2("fas-c4-acyl"),
  caveat: "饱和脂酰-ACP 回到 KS 作为下一轮 Cₙ；这是环的收口，不是新步骤。",
  sourceNote:
    "计算构象：RDKit ETKDGv3（30 起点）+ MMFF94 取最低能量，无实验配体坐标（丁酰-ACP 是 ACP 上的共价中间体）。",
};
const FAS_C16_ACYL = {
  id: "fas-c16-acyl",
  name: "棕榈酰-ACP（C16 · 分块）",
  formula: "C₁₆H₃₁OS（酰基-ACP 反应端）",
  asset2d: D2("fas-c16-acyl"),
  caveat: "C16 是 TE 的长度选择性结果，不是四步环自动停止；只画酰基链 + 硫酯 S。",
  sourceNote:
    "计算构象：RDKit ETKDGv3（30 起点）+ MMFF94 取最低能量，无实验配体坐标（棕榈酰-ACP 是 ACP 上的共价中间体，PDB 无小分子配体络合物）。",
};
const FAS_C16 = {
  id: "fas-c16",
  name: "棕榈酸（C16）",
  formula: "C₁₆H₃₁O₂⁻（中性式 C₁₆H₃₂O₂）",
  asset2d: D2("fas-c16"),
  caveat: "TE 在 C16 到站时水解硫酯；释放的是游离棕榈酸，不是棕榈酰-CoA。",
  sourceNote:
    "实验坐标：PDB 2WUT · 链 A · 配体 PLM（X-ray，1.85 Å，Homo sapiens）· 来源蛋白是人髓鞘蛋白 P2（脂肪酸结合蛋白），不是 FASN；本酶口袋内同分子高分辨结构未获。",
};

const FAS_COMPARISON: StepComparison[] = [
  {
    stepId: "fas-acc",
    index: 1,
    stageLabel: "准备步 · ACC 羧化",
    enzyme: "乙酰-CoA 羧化酶（ACC）",
    isozyme: "ACC1（ACACA）",
    equation: "乙酰-CoA + HCO₃⁻ + ATP → 丙二酰-CoA + ADP + Pi",
    substrate: {
      name: "乙酰-CoA（反应端片段）",
      formula: "C₂H₃OS（片段）",
      parts: [{ ...FAS_ACCOA_FRAG, marks: [{ name: "C2", kind: "newbond", note: "羧基接入位点" }] }],
      cofactorNote: "ATP / HCO₃⁻ / 生物素不入画；只有羧化成丙二酰-CoA 的 C2 单元能进四步环。",
    },
    product: {
      name: "丙二酰-CoA（反应端片段）",
      formula: "C₃H₃O₃S（片段）",
      parts: [{ ...FAS_MALONYL_FRAG, marks: [{ name: "C2", kind: "added", note: "新增游离羧基（−1）" }] }],
      cofactorNote: "ADP / Pi 不入画；羧基碳在缩合时以 CO₂ 离去，因此对碳链的净贡献仍是 C2。",
    },
    evidence: { substrate: [evOtherHuman("fas-accoa")], product: [evOtherHuman("fas-malonyl")] },
    arrowLabel: "羧化：+ HCO₃⁻ + ATP，引入游离羧基（−1）",
    change:
      "乙酰-CoA 的 C2 被生物素依赖的羧化酶装上 HCO₃⁻，生成丙二酰-CoA：多出一个游离羧基（电离态 −1），硫酯键保留。重原子增加 1 个碳 + 2 个氧；两块资产均为实验坐标（8ZW1 / 8H6C，非 FASN 本酶口袋），首屏来源说明已逐条标注。",
    physiology:
      "承诺步 / 限速步：只有羧化的 C2 单元能被 KS 缩合。丙二酰-CoA 还抑制 CPT1，把「合成开启」与「β-氧化关闭」连成同一个开关。",
    defaultMode: "3d",
    defaultModeRule:
      "默认 3D 判据：重原子 4→7（改变，不命中「重原子数不变」）；体积 63.6→92.0 Å³（ΔV +44.7%）；拓扑改变（C2 新增游离羧基）。重原子数与体积都明显变化，3D 直接呈现分子长大。",
  },
  {
    stepId: "fas-ks",
    index: 2,
    stageLabel: "四步环 Ⅰ · KS 缩合",
    enzyme: "FASN Ⅰ型 · KS 结构域",
    equation: "脂酰-ACP（C2）+ 丙二酰-ACP → 3-酮丁酰-ACP（C4）+ ACP + CO₂",
    substrate: {
      name: "乙酰-ACP（C2 引物） + 丙二酰-ACP",
      formula: "C₂H₃OS + C₃H₃O₃S（反应端片段）",
      parts: [{ ...FAS_C2_ACP, marks: [{ name: "C2", kind: "newbond", note: "成键位点（C2–C3）" }] }],
      cofactorNote: "丙二酰-ACP 由 ACC 产物经 MAT 转到 ACP；ACP 不作独立分子入画。",
    },
    product: {
      name: "3-酮丁酰-ACP（C4）",
      formula: "C₄H₅O₂S（片段）",
      parts: [{ ...FAS_C4_KETO, marks: [{ name: "C3", kind: "newbond", note: "新酮基；C2–C3 成键" }] }],
      cofactorNote: "CO₂ 与 ACP 不入画；CO₂ 的碳来自 HCO₃⁻，不是链上碳。",
    },
    evidence: { substrate: [evComputed("fas-c2")], product: [evComputed("fas-c4-keto")] },
    arrowLabel: "+C2 单元：C2–C3 成键，CO₂ 离去",
    change:
      "丙二酰单元以脱羧驱动缩合：新 C–C 键落在增长链的 C2 与丙二酰 C2 之间（编号后为 C2–C3），净增 2 个碳并释放 1 个 CO₂。不是 C3–C4——那是 β-氧化硫解的断键位置。",
    physiology:
      "四步环唯一增碳的一步。7 轮缩合把 C2 引物推到 C16，同时释放 7 个 CO₂；这一步决定整条链的长度上限。",
    defaultMode: "3d",
    defaultModeRule:
      "默认 3D 判据：重原子 4→7（改变）；体积 64.1→99.1 Å³（ΔV +54.6%）；拓扑改变（C2–C3 成键，新增 2 个碳 + 1 个氧）。重原子数与体积都变，3D 直接呈现链增长。",
  },
  {
    stepId: "fas-kr",
    index: 3,
    stageLabel: "四步环 Ⅱ · KR 还原",
    enzyme: "FASN Ⅰ型 · KR 结构域",
    equation: "3-酮丁酰-ACP + NADPH + H⁺ → D-3-羟基丁酰-ACP + NADP⁺",
    substrate: {
      name: "3-酮丁酰-ACP（C4）",
      formula: "C₄H₅O₂S（片段）",
      parts: [{ ...FAS_C4_KETO, marks: [{ name: "C3", kind: "newbond", note: "C3=O → C3-OH" }] }],
      cofactorNote: "NADPH + H⁺ 不入画；还原当量必须用 NADPH，不是 NADH。",
    },
    product: {
      name: "D-3-羟基丁酰-ACP（C4）",
      formula: "C₄H₇O₂S（片段）",
      parts: [{ ...FAS_C4_OH, marks: [{ name: "C3", kind: "added", note: "D-3-羟基（与 β-氧化 L 型镜像）" }] }],
      cofactorNote: "NADP⁺ 不入画；羟基构型为 D 型。",
    },
    evidence: { substrate: [evComputed("fas-c4-keto")], product: [evComputed("fas-c4-oh")] },
    arrowLabel: "还原：C3=O → D-3-OH，耗 1 NADPH",
    change:
      "β-酮基被 NADPH 还原成 D-3-羟基；重原子数不变，只改 C3 的键级与构型。FAS 用 NADPH、β-氧化用 NAD⁺，方向与辅因子都成镜像。",
    physiology:
      "每轮 2 个 NADPH 中的第 1 个。胞质 NADPH 由 PPP / 苹果酸酶供给，不由 ACLY 产生——这是「NADPH 来源」最常见的误解点。",
    defaultMode: "3d",
    defaultModeRule:
      "默认 3D 判据：重原子 7→7（不变）；体积 99.1→105.8 Å³（ΔV +6.76%，>2.5%）；拓扑改变（C3=O→C3–OH）。体积变化超过 2.5% 阈值，不命中「默认 2D」，按 3D。",
  },
  {
    stepId: "fas-dh",
    index: 4,
    stageLabel: "四步环 Ⅲ · DH 脱水",
    enzyme: "FASN Ⅰ型 · DH 结构域",
    equation: "D-3-羟基丁酰-ACP → 反式-Δ²-丁烯酰-ACP + H₂O",
    substrate: {
      name: "D-3-羟基丁酰-ACP（C4）",
      formula: "C₄H₇O₂S（片段）",
      parts: [{ ...FAS_C4_OH }],
      cofactorNote: "脱水不耗辅因子；与 β-氧化的水化方向相反。",
    },
    product: {
      name: "反式-Δ²-丁烯酰-ACP（C4）",
      formula: "C₄H₅OS（片段）",
      parts: [{ ...FAS_C4_ENOYL, marks: [{ name: "C2", kind: "newbond", note: "C2=C3 双键（反式）" }] }],
      cofactorNote: "H₂O 不入画；只移除 H₂O，碳数不变。",
    },
    evidence: { substrate: [evComputed("fas-c4-oh")], product: [evComputed("fas-c4-enoyl")] },
    arrowLabel: "脱水：C3-OH + C2-H → 反式-Δ²，−H₂O",
    change:
      "DH 移除 1 分子 H₂O，生成反式-Δ² 双键；重原子数不变，拓扑改变。β-氧化在对应步骤加水，FAS 是脱水——方向相反，不能照抄酶名。",
    physiology:
      "脱水为下一步还原准备双键；它不改碳数、不耗还原当量，是最容易被忽略的一步。",
    defaultMode: "3d",
    defaultModeRule:
      "默认 3D 判据：重原子 7→6（改变，脱水少 1 个氧）；体积 105.8→92.4 Å³（ΔV −12.7%）；拓扑改变（C3–OH + C2–H → C2=C3 反式双键）。重原子数减少，按 3D。",
  },
  {
    stepId: "fas-er",
    index: 5,
    stageLabel: "四步环 Ⅳ · ER 还原",
    enzyme: "FASN Ⅰ型 · ER 结构域",
    equation: "反式-Δ²-丁烯酰-ACP + NADPH + H⁺ → 丁酰-ACP（C4）+ NADP⁺",
    substrate: {
      name: "反式-Δ²-丁烯酰-ACP（C4）",
      formula: "C₄H₅OS（片段）",
      parts: [{ ...FAS_C4_ENOYL }],
      cofactorNote: "NADPH + H⁺ 不入画；每轮第 2 个 NADPH。",
    },
    product: {
      name: "丁酰-ACP（C4，饱和）",
      formula: "C₄H₇OS（片段）",
      parts: [{ ...FAS_C4_ACYL, marks: [{ name: "C2", kind: "newbond", note: "双键还原为单键" }] }],
      cofactorNote: "NADP⁺ 不入画；产物回到第 1 步的底物位。",
    },
    evidence: { substrate: [evComputed("fas-c4-enoyl")], product: [evComputed("fas-c4-acyl")] },
    arrowLabel: "还原：双键 → 饱和链，耗 1 NADPH，本轮 +2C 收口",
    change:
      "ER 把反式-Δ² 双键还原成饱和链，碳数在 KS 已经 +2，这里只做还原收口。产物回到 KS，构成闭合四步环。",
    physiology:
      "每轮 2 个 NADPH 中的第 2 个。到这里一轮结束：净 +2C、耗 2 NADPH；C16 到站后由 TE 出环，四步环本身没有终止信号。",
    defaultMode: "3d",
    defaultModeRule:
      "默认 3D 判据：重原子 6→6（不变）；体积 92.4→97.5 Å³（ΔV +5.52%，>2.5%）；拓扑改变（C2=C3 还原为单键）。体积变化超过 2.5% 阈值，不命中「默认 2D」，按 3D。",
  },
  {
    stepId: "fas-te",
    index: 6,
    stageLabel: "终步 · TE 硫酯酶释放",
    enzyme: "FASN Ⅰ型 · TE 结构域",
    equation: "棕榈酰-ACP（C16）+ H₂O → 棕榈酸 + ACP + H⁺",
    substrate: {
      name: "棕榈酰-ACP（C16· 分块）",
      formula: "C₁₆H₃₁OS（酰基-ACP 反应端）",
      parts: [{ ...FAS_C16_ACYL, marks: [{ name: "C1", kind: "leaving", note: "硫酯水解位点" }] }],
      cofactorNote: "ACP 与 H₂O 不单独入画；水解的是硫酯，不是碳链。",
    },
    product: {
      name: "棕榈酸（C16）",
      formula: "C₁₆H₃₁O₂⁻（中性式 C₁₆H₃₂O₂）",
      parts: [{ ...FAS_C16, marks: [{ name: "C1", kind: "newbond", note: "游离羧酸（−1）" }] }],
      cofactorNote: "ACP 回环再用；释放的是游离棕榈酸，要变棕榈酰-CoA 需另做活化。",
    },
    evidence: { substrate: [evComputed("fas-c16-acyl")], product: [evOtherHuman("fas-c16")] },
    arrowLabel: "水解硫酯：C16 到站，棕榈酸出环",
    change:
      "TE 水解棕榈酰-ACP 的硫酯键，释放游离棕榈酸 + ACP；碳链不变，只把载体去掉。这一步不在四步环内，也不增碳。",
    physiology:
      "链长由 TE 的选择性决定：C16 到站才释放。若 TE 放行，链会继续延长；所以「C16」是酶学结果，不是环的数学终点。",
    defaultMode: "3d",
    defaultModeRule:
      "默认 3D 判据：重原子 18→18（不变）；体积 300.9→285.3 Å³（ΔV −5.19%，>2.5%）；拓扑改变（硫酯 C1–S 水解为 C1–O⁻）。体积变化超过 2.5% 阈值，不命中「默认 2D」，按 3D。",
  },
];

const FAS_CONFIG: ComparisonConfig = {
  pathwayId: "fatty-acid-synthesis",
  title: "脂肪酸从头合成 · 结构对照",
  summary:
    "六块逐步对照：ACC 羧化、四步环（KS / KR / DH / ER）、TE 释放。12 个分子端都补上了 2D 结构式与 3D 资产：乙酰-CoA（8ZW1，人 CS）、丙二酰-CoA（8H6C，人 GCN5）、棕榈酸（2WUT，人髓鞘蛋白 P2）为实验坐标，但都不是 FASN 本酶口袋，块内首屏逐条写明来源蛋白；C2 引物、C4 四个中间体与 C16 酰基-ACP 没有小分子实验配体，用 RDKit 计算构象并标「计算构象」。FASN 约 540 kDa 巨型合酶，本页不做酶的三维。",
  plateNo: "PLATE SF-08 · 结构对照 · 脂肪酸合成 · 2026",
  back: { to: "/pathway/fas", label: "← 返回挂图" },
  backCaption: "脂肪酸从头合成 · 结构对照（挂图页 /pathway/fas）",
  enzymePanel: false,
  enzymePanelOffNote: "本通路不做酶的三维（FASN ≈540 kDa 巨型合酶）· 只做小分子结构对照",
  footerNote:
    "FAS 6 个分子块（12 个分子端）：乙酰-CoA 片段、丙二酰-CoA 片段、C2 引物、C4 酮 / D-3-羟基 / 反式-Δ²-烯酰 / 饱和酰基、C16 酰基-ACP、C16 棕榈酸。坐标口径：① 实验坐标 3 个——乙酰-CoA 取自 8ZW1（人柠檬酸合酶 CS，链 B，配体 ACO，X-ray 2.1 Å）、丙二酰-CoA 取自 8H6C（人 GCN5，链 C，配体 MLC，X-ray 2.5 Å）、棕榈酸取自 2WUT（人髓鞘蛋白 P2，链 A，配体 PLM，X-ray 1.85 Å）；三者都不是 FASN 本酶口袋，本酶口袋内同分子高分辨结构未获，按 evidenceGrade 计为 C（人源非本酶），块内首屏逐条写明。② 计算构象 6 个——C2 引物、C4 四个中间体与 C16 酰基-ACP 都是 ACP 上的共价中间体，PDB 无小分子配体络合物，用 RDKit ETKDGv3（30 起点）+ MMFF94，页面标「计算构象」，不与实验坐标混标。分块口径：乙酰-CoA / 丙二酰-CoA 与酰基-ACP 只画反应端（酰基链 + 硫酯 S），CoA / ACP 长链省略，资产里 S 以硫醇盐表示省略的连接，不冒充完整分子。FASN 约 540 kDa（同源二聚体），完整结构过大，本页不做酶视图，也不截取任一段结构冒充全酶。未入画：ATP / ADP / Pi / NADPH / NADP⁺ / CoA-SH / ACP / HCO₃⁻ / CO₂ / H₂O。",
  defaultModePolicy:
    "默认模式按数据判据逐块决定：重原子数不变 + 拓扑改变 + |ΔV| ≤2.5% → 该块默认 2D，其余默认 3D。六块实测数字写在每块 defaultModeRule；本轮六块全部按数字落到 3D（三块重原子数改变、三块体积变化 >2.5%）。?mode=2d|3d 为显式覆盖，优先级高于默认值。",
  steps: FAS_COMPARISON,
};

// ============================================================
// 尿素循环（PLATE 09/12 · 结构对照 SF-09）
// 五块：CPS1 → OTC → ASS → ASL → ARG1。
// 本轮补齐：瓜氨酸 / 鸟氨酸 / 天冬氨酸 / 精氨酸琥珀酸 / 精氨酸 / 延胡索酸 / 尿素
// 共 7 个分子补 2D + 3D；NH₃、HCO₃⁻、氨甲酰磷酸只做 2D（原子过少或中间体不稳定，逐条写原因）。
// 3D 全部为实验坐标，但多数取自相邻酶或非人源同源酶，块内首屏 sourceNote 写明；
// 等级由 evidenceGrade.ts 从 pocketRole + species 推导，不手写。
// CPS1 等尿素循环酶的三维一律不做（巨型酶 / 只做小分子），不截取结构冒充全酶。
// ============================================================
const UREA_NH3 = {
  id: "urea-nh3",
  name: "氨（NH₃）",
  formula: "NH₃",
  asset2d: D2("urea-nh3"),
  no3dReason: "NH₃ 仅 1 个重原子，球棍模型没有可读的三维形状；沿用项目 CO₂ / HCO₃⁻ 口径只做 2D，不伪造 3D。",
  caveat: "只做 2D；不建 3D。",
  sourceNote: "无实验配体坐标：NH₃ 仅 1 个重原子，无可读三维形状；本页只做 2D 结构式，3D 不建。",
};
const UREA_CAP = {
  id: "urea-cap",
  name: "氨甲酰磷酸（CAP²⁻）",
  formula: "CH₂NO₅P²⁻",
  asset2d: D2("urea-cap"),
  no3dReason:
    "氨甲酰磷酸在水溶液中不稳定（易水解为氨甲酸 / 磷酸），且本轮未获本酶 CPS1 口袋内同分子高分辨络合物；按项目「不稳定中间体只做 2D」的口径，3D 留缺并如实说明。",
  caveat: "2D 为 RDKit 由 SMILES 生成的结构式，不是三维构象。",
  sourceNote: "无实验坐标、无计算 3D：本酶 CPS1 口袋内同分子高分辨结构未获，且 CAP 易水解；只做 2D 结构式。",
};
const UREA_ORN = {
  id: "urea-orn",
  name: "L-鸟氨酸",
  formula: "C₅H₁₃N₂O₂⁺",
  asset2d: D2("urea-orn"),
  caveat: "实验坐标来自 3GMZ（人 ARG1）：第 2 步（OTC 底物）不是 OTC 口袋；第 5 步（ARG1 产物）为本酶口袋。",
  sourceNote:
    "实验坐标：PDB 3GMZ · 链 A · 配体 ORN（X-ray，1.43 Å，Homo sapiens）· 来源蛋白是人精氨酸酶 1 ARG1。第 2 步是 OTC 的底物，不是本酶口袋；第 5 步是 ARG1 的产物，为本酶口袋。",
};
const UREA_CIT = {
  id: "urea-cit",
  name: "L-瓜氨酸",
  formula: "C₆H₁₃N₃O₃",
  asset2d: D2("urea-cit"),
  caveat: "实验坐标来自 2NZ2（人 ASS1）：第 2 步（OTC 产物）不是 OTC 口袋；第 3 步（ASS1 底物）为本酶口袋。",
  sourceNote:
    "实验坐标：PDB 2NZ2 · 链 A · 配体 CIR（X-ray，2.4 Å，Homo sapiens）· 来源蛋白是人精氨酸琥珀酸合成酶 ASS1。第 2 步是 OTC 的产物，不是本酶口袋；第 3 步是 ASS1 的底物，为本酶口袋。",
};
const UREA_ASP = {
  id: "urea-asp",
  name: "L-天冬氨酸（ASP⁻）",
  formula: "C₄H₆NO₄⁻",
  asset2d: D2("urea-asp"),
  caveat: "实验坐标来自 2NZ2（人 ASS1 本酶口袋内的天冬氨酸底物）。",
  sourceNote:
    "实验坐标：PDB 2NZ2 · 链 A · 配体 ASP（X-ray，2.4 Å，Homo sapiens）· 人 ASS1 本酶口袋内的天冬氨酸底物（与瓜氨酸同晶体）。",
};
const UREA_AS1 = {
  id: "urea-as1",
  name: "L-精氨酸琥珀酸（AS1⁻）",
  formula: "C₁₀H₁₇N₄O₆⁻",
  asset2d: D2("urea-as1"),
  caveat: "实验坐标来自 1J20（嗜热栖热菌 ASS1）：第 3 步为本酶产物（非人源）；第 4 步（ASL 底物）不是 ASL 口袋。",
  sourceNote:
    "实验坐标：PDB 1J20 · 链 A · 配体 AS1（X-ray，2.0 Å，Thermus thermophilus）· 嗜热栖热菌 ASS1 同源酶。第 3 步（ASS1 产物）为本酶口袋但非人源；第 4 步（ASL 底物）不是 ASL 本酶口袋。",
};
const UREA_ARG = {
  id: "urea-arg",
  name: "L-精氨酸（ARG⁺）",
  formula: "C₆H₁₅N₄O₂⁺",
  asset2d: D2("urea-arg"),
  caveat: "实验坐标来自 9GGJ（拟南芥 ASL）：第 4 步为本酶产物（非人源）；第 5 步（ARG1 底物）不是 ARG1 口袋。",
  sourceNote:
    "实验坐标：PDB 9GGJ · 链 B · 配体 ARG（X-ray，2.0 Å，Arabidopsis thaliana）· 拟南芥精氨酸琥珀酸裂解酶 ASL。第 4 步（ASL 产物）为本酶口袋但非人源；第 5 步（ARG1 底物）不是 ARG1 本酶口袋。",
};
const UREA_FUM = {
  id: "urea-fum",
  name: "延胡索酸（反式）",
  formula: "C₄H₂O₄²⁻",
  asset2d: D2("urea-fum"),
  caveat: "延胡索酸出环后进入 TCA 回流，不是尿素循环的终产物；本条为 9GGJ 拟南芥 ASL 本酶口袋内的反式构型。",
  sourceNote:
    "实验坐标：PDB 9GGJ · 链 A · 配体 FUM（X-ray，2.0 Å，Arabidopsis thaliana）· 拟南芥 ASL 本酶口袋内的延胡索酸产物（反式）。",
};
const UREA_URE = {
  id: "urea-ure",
  name: "尿素",
  formula: "CH₄N₂O",
  asset2d: D2("urea-ure"),
  caveat: "实验坐标来自 1HQG（大鼠 ARG1 H141C 突变体）：本酶口袋但非人源、且为突变体。",
  sourceNote:
    "实验坐标：PDB 1HQG · 链 A · 配体 URE（X-ray，2.0 Å，Rattus norvegicus）· 大鼠精氨酸酶 1 H141C 突变体口袋；非人源、突变体，中性记录。",
};

const UREA_COMPARISON: StepComparison[] = [
  {
    stepId: "urea-1",
    index: 1,
    stageLabel: "① 进环 · CPS1",
    enzyme: "CPS1 · 氨甲酰磷酸合成酶 I（线粒体基质）",
    equation: "NH₃ + HCO₃⁻ + 2 ATP → 氨甲酰磷酸 + 2 ADP + Pi",
    substrate: {
      name: "NH₃ + HCO₃⁻ + 2 ATP",
      formula: "NH₃ + CHO₃⁻（ATP 为分子式辅因子，不入画）",
      parts: [{ ...UREA_NH3 }, { ...HCO3 }],
      cofactorNote: "2 ATP 不入画；ATP 名义计数 2，高能键折算 2。",
    },
    product: {
      name: "氨甲酰磷酸",
      formula: "CH₂NO₅P²⁻",
      parts: [{ ...UREA_CAP }],
      cofactorNote: "2 ADP + Pi 不入画；Pi 来自 CPS1 的第二个 ATP。",
    },
    evidence: { substrate: [evOnly2d("urea-nh3"), evOnly2d("hco3")], product: [evOnly2d("urea-cap")] },
    arrowLabel: "固定第一个氮：NH₃ + HCO₃⁻ + 2 ATP → 氨甲酰磷酸",
    change: "CPS1 把游离 NH₃ 的氮装进氨甲酰磷酸的酰胺位，HCO₃⁻ 提供羰基碳；两个 ATP 驱动，生理上不可逆。",
    physiology: "线粒体基质的进环步；N-乙酰谷氨酸是必需变构激活剂，把氨负荷接到尿素合成速率上。",
    defaultMode: "2d",
    defaultModeRule:
      "默认 2D：NH₃ 仅 1 个重原子、HCO₃⁻ 仅 4 个原子、CAP 为不稳定中间体且本酶口袋高分辨结构未获——三块都没有 3D 坐标，无法参与体积/拓扑判据，按数据缺失默认 2D。",
  },
  {
    stepId: "urea-2",
    index: 2,
    stageLabel: "② 闭环 Ⅰ · OTC",
    enzyme: "OTC · 鸟氨酸氨甲酰转移酶（线粒体基质，X 连锁）",
    equation: "氨甲酰磷酸 + 鸟氨酸 → 瓜氨酸 + Pi",
    substrate: {
      name: "氨甲酰磷酸 + 鸟氨酸",
      formula: "CH₂NO₅P²⁻ + C₅H₁₃N₂O₂⁺",
      parts: [{ ...UREA_CAP }, { ...UREA_ORN }],
      cofactorNote: "鸟氨酸 δ-氨基是载体氮，不进入尿素的净氮账。",
    },
    product: {
      name: "瓜氨酸",
      formula: "C₆H₁₃N₃O₃",
      parts: [{ ...UREA_CIT }],
      cofactorNote: "Pi 不入画；这一步没有新增净氮。",
    },
    evidence: { substrate: [evOnly2d("urea-cap"), evOtherHuman("urea-orn")], product: [evOtherHuman("urea-cit")] },
    arrowLabel: "氨甲酰基转移：CAP + Orn → Cit，鸟氨酸 C5 骨架不变",
    change: "氨甲酰磷酸把氨甲酰基交给鸟氨酸 δ-氨基；鸟氨酸 C5 与 δ-N 都留在载体上，碳账净 0。",
    physiology: "反应本身可逆，生理上由 CPS1 的持续供料拉动；OTC 缺陷是最常见的尿素循环障碍。",
    defaultMode: "2d",
    defaultModeRule:
      "默认 2D：底物侧 CAP 只有 2D，无法与产物做同口径体积对比（重原子 8+9=17 → 12 已改变，但 CAP 缺 3D）；按「含无 3D 分子」默认 2D。",
  },
  {
    stepId: "urea-3",
    index: 3,
    stageLabel: "③ 闭环 Ⅱ · ASS（接入第二个氮）",
    enzyme: "ASS1 · 精氨酸琥珀酸合成酶（胞质）",
    equation: "瓜氨酸 + 天冬氨酸 + ATP → 精氨酸琥珀酸 + AMP + PPi",
    substrate: {
      name: "瓜氨酸 + 天冬氨酸 + ATP",
      formula: "C₆H₁₃N₃O₃ + C₄H₆NO₄⁻（ATP 辅因子，不入画）",
      parts: [{ ...UREA_CIT }, { ...UREA_ASP }],
      cofactorNote: "ATP → AMP + PPi，折算 2 个高能键；Mg²⁺ 不入画。",
    },
    product: {
      name: "精氨酸琥珀酸",
      formula: "C₁₀H₁₇N₄O₆⁻",
      parts: [{ ...UREA_AS1 }],
      cofactorNote: "AMP + PPi 不入画；PPi 的酸酐键可继续水解。",
    },
    evidence: { substrate: [evOwnHuman("urea-cit"), evOwnHuman("urea-asp")], product: [evOwnNonhuman("urea-as1")] },
    arrowLabel: "接入第二个氮：Cit + Asp α-NH₂ + ATP → 精氨酸琥珀酸",
    change: "天冬氨酸 α-氨基接到脲基上；这是尿素的第二个氮，来源与 NH₃ 不同。ATP 走 AMP + PPi，计 2 个高能键。",
    physiology: "第二个氮在此进环；天冬氨酸由 TCA 草酰乙酸经 AST 转氨再生，是碳骨架回流的接口。",
    defaultMode: "3d",
    defaultModeRule:
      "默认 3D 判据：重原子 12+9=21 → 20（改变）；体积 158.8+108.0=266.8 → 252.1 Å³（ΔV −5.51%，>2.5%）；拓扑改变（瓜氨酸脲基与 Asp α-NH₂ 缩合成新 C–N 键）。重原子数与体积都变，按 3D。",
  },
  {
    stepId: "urea-4",
    index: 4,
    stageLabel: "④ 闭环 Ⅲ · ASL",
    enzyme: "ASL · 精氨酸琥珀酸裂解酶（胞质）",
    equation: "精氨酸琥珀酸 → 精氨酸 + 延胡索酸",
    substrate: {
      name: "精氨酸琥珀酸",
      formula: "C₁₀H₁₇N₄O₆⁻",
      parts: [{ ...UREA_AS1 }],
      cofactorNote: "裂解不需要辅因子；不改变氮的归属。",
    },
    product: {
      name: "精氨酸 + 延胡索酸",
      formula: "C₆H₁₅N₄O₂⁺ + C₄H₂O₄²⁻",
      parts: [{ ...UREA_ARG }, { ...UREA_FUM }],
      cofactorNote: "延胡索酸不入尿素终产物账；它经 TCA 回到天冬氨酸。",
    },
    evidence: { substrate: [evOtherNonhuman("urea-as1")], product: [evOwnNonhuman("urea-arg"), evOwnNonhuman("urea-fum")] },
    arrowLabel: "裂解：精氨酸琥珀酸 → Arg + 延胡索酸（C4 出环）",
    change: "ASL 裂解精氨酸琥珀酸，延胡索酸带着天冬氨酸的 C4 骨架离开；两个净氮留在精氨酸胍基里。",
    physiology: "延胡索酸进 TCA，最后以天冬氨酸回到 ASS 步；没有这条回流，循环每轮都要净耗天冬氨酸。",
    defaultMode: "2d",
    defaultModeRule:
      "默认 2D 判据：重原子 20 → 12+8=20（不变）；体积 252.1 → 166.7+88.8=255.5 Å³（ΔV +1.35%，≤2.5%）；拓扑改变（一分子裂成两分子）。三项命中，默认 2D。",
  },
  {
    stepId: "urea-5",
    index: 5,
    stageLabel: "⑤ 闭环 Ⅳ · ARG1",
    enzyme: "ARG1 · 精氨酸酶 1（胞质）",
    equation: "精氨酸 + H₂O → 尿素 + 鸟氨酸",
    substrate: {
      name: "精氨酸 + H₂O",
      formula: "C₆H₁₅N₄O₂⁺（H₂O 不入画）",
      parts: [{ ...UREA_ARG }],
      cofactorNote: "H₂O 与金属辅因子不入画；水解的是胍基。",
    },
    product: {
      name: "尿素 + 鸟氨酸",
      formula: "CH₄N₂O + C₅H₁₃N₂O₂⁺",
      parts: [{ ...UREA_URE }, { ...UREA_ORN }],
      cofactorNote: "尿素含 2 N；鸟氨酸 C5 载体碳骨架净不变。",
    },
    evidence: { substrate: [evOtherNonhuman("urea-arg")], product: [evOwnNonhuman("urea-ure"), evOwnHuman("urea-orn")] },
    arrowLabel: "水解胍基：Arg → 尿素（2 N）+ 鸟氨酸（回到 OTC）",
    change: "ARG1 水解释放尿素，两个氮一起出环；鸟氨酸再生，经 ORNT1 回到线粒体基质。",
    physiology: "排氮的收口步；尿素的两个氮来源不同，鸟氨酸只是载体，必须回到 OTC 才能继续下一轮。",
    defaultMode: "3d",
    defaultModeRule:
      "默认 3D 判据：重原子 12 → 4+9=13（改变）；体积 166.7 → 53.2+131.5=184.7 Å³（ΔV +10.8%，>2.5%）；拓扑改变（胍基水解，一分子变两分子）。重原子数与体积都变，按 3D。",
  },
];

const UREA_CONFIG: ComparisonConfig = {
  pathwayId: "urea-cycle",
  title: "尿素循环 · 结构对照",
  summary:
    "五块逐步对照：CPS1、OTC、ASS、ASL、ARG1。瓜氨酸、鸟氨酸、天冬氨酸、精氨酸琥珀酸、精氨酸、延胡索酸、尿素共 7 个分子补上了 2D + 3D；NH₃、HCO₃⁻ 与氨甲酰磷酸只做 2D（原子过少 / 中间体不稳定，逐条写原因）。3D 全部为实验坐标，但多数取自相邻酶或非人源同源酶，块内首屏说明写明来源蛋白与本酶口袋是否命中；只有瓜氨酸、天冬氨酸（人 ASS1 2NZ2）与鸟氨酸（人 ARG1 3GMZ）在本步本酶口袋内且人源。CPS1（约 165 kDa/单体）等尿素循环酶的三维一律不做，只做小分子。",
  plateNo: "PLATE SF-09 · 结构对照 · 尿素循环 · 2026",
  back: { to: "/pathway/urea-cycle", label: "← 返回挂图" },
  backCaption: "尿素循环 · 结构对照（挂图页 /pathway/urea-cycle）",
  enzymePanel: false,
  enzymePanelOffNote: "本通路不做酶的三维（CPS1 ≈165 kDa/单体等）· 只做小分子结构对照",
  footerNote:
    "尿素循环 5 块 10 个分子端：NH₃、HCO₃⁻、氨甲酰磷酸、鸟氨酸、瓜氨酸、天冬氨酸、精氨酸琥珀酸、精氨酸、延胡索酸、尿素。坐标口径：① 只做 2D——NH₃（1 个重原子）、HCO₃⁻（4 个原子）、氨甲酰磷酸（易水解且本酶 CPS1 口袋内同分子高分辨结构未获），3D 不建并逐条写原因。② 实验坐标 7 个——鸟氨酸 3GMZ（人 ARG1，链 A，配体 ORN，X-ray 1.43 Å）、瓜氨酸与天冬氨酸 2NZ2（人 ASS1，链 A，配体 CIR / ASP，X-ray 2.4 Å）、精氨酸琥珀酸 1J20（Thermus thermophilus ASS1，链 A，配体 AS1，X-ray 2.0 Å）、精氨酸与延胡索酸 9GGJ（拟南芥 ASL，链 B / A，配体 ARG / FUM，X-ray 2.0 Å）、尿素 1HQG（大鼠 ARG1 H141C 突变体，链 A，配体 URE，X-ray 2.0 Å）。跨物种、同工酶、突变体均已写进块内首屏来源说明：OTC 本酶口袋内同分子高分辨结构未获，因此第 2 步的鸟氨酸 / 瓜氨酸取自 ARG1 / ASS1 口袋（C）；第 3 步的 ASS1 本酶口袋命中（瓜氨酸 / 天冬氨酸人源 A、精氨酸琥珀酸非人源 B）；第 4 步的 ASL 本酶口袋为拟南芥同源酶（B），其底物精氨酸琥珀酸取自嗜热菌 ASS1（D）；第 5 步的 ARG1 口袋只有大鼠突变体 1HQG（B），底物精氨酸取自拟南芥 ASL（D）。③ 不做酶的三维：CPS1 约 165 kDa/单体，其余尿素循环酶同样只做小分子，不截取结构冒充全酶。延胡索酸出环后进入 TCA 回流，本页用 9GGJ 的 ASL 本酶口袋坐标，不复制 TCA 页资产。未入画：ATP / ADP / AMP / PPi / Pi / H₂O / Mg²⁺ / Mn²⁺。",
  defaultModePolicy:
    "默认模式按数据判据逐块决定：重原子数不变 + 拓扑改变 + |ΔV| ≤2.5% → 该块默认 2D，其余默认 3D。逐块实测数字写在 defaultModeRule；第 1、2 块因含仅 2D 分子（NH₃ / HCO₃⁻ / CAP）无法参与体积判据，保持 2D；第 4 块命中默认 2D（ΔV +1.35%、重原子不变、拓扑改变）；第 3、5 块重原子数改变，按 3D。?mode=2d|3d 为显式覆盖，优先级高于默认值。",
  steps: UREA_COMPARISON,
};

// —— 糖原代谢（PLATE SF-10）——
// 6 块：磷酸解、脱支、PGM 分解向、肝 G6PC1、UGP2、糖原合酶。
// 3D 只用既有 g6p / glc（1CZA 人 HK1 口袋，非糖原代谢酶）；
// G1P、UTP、UDP-葡萄糖、PPi、UDP 与糖原/极限糊精各补 2D 结构式（RDKit 由 SMILES 生成），
// 这 7 个仍不生成 3D、不写 PDB 坐标，逐条在首屏写原因。等级全部由 evidenceGrade 推导，不手写 A/B/C/D。
const GLY_GLYCOGEN = {
  id: "glycogen",
  name: "糖原（α-1,4 链段）ₙ",
  formula: "C₆H₁₀O₅（每残基）",
  asset2d: D2("glycogen"),
  no3dReason: "糖原聚合度不固定，没有单一实验构象；只做 2D 片段示意，3D 不建。",
  caveat:
    "2D 为麦芽三糖片段（3 个残基）的 α-1,4 链段示意，不代表整条糖原的聚合度与分支拓扑。",
  sourceNote:
    "2D 由 RDKit 生成（片段示意，非三维构象）；糖原为不均一聚合物，无单一 PDB 配体能代表整条链。本轮只登记分支酶/脱支酶的酶结构候选（5CLW、8ZEQ），不把糖链片段冒充糖原。",
};
const GLY_LIMIT = {
  id: "glycogen-limit",
  name: "极限糊精（分支糖原剩余）",
  formula: "C₆H₁₀O₅（每残基）",
  asset2d: D2("glycogen-limit"),
  no3dReason: "聚合度与分支拓扑不固定，无单一 3D 构象；只做 2D 片段示意，3D 不建。",
  caveat:
    "2D 为潘糖片段（α-1,6 分支 + α-1,4 主链，3 个残基）的分支示意；极限糊精的分支度与聚合度都不固定，此图不代表真实链长。",
  sourceNote:
    "2D 由 RDKit 生成（片段示意，非三维构象）；极限糊精不是单一分子。脱支酶 8ZEQ（人 AGL，3.36 Å，cryo-EM）为 apo 架构，无糖原配体，不能当作底物复合物。",
};
const GLY_G1P = {
  id: "g1p",
  name: "葡萄糖-1-磷酸（G1P）",
  formula: "C₆H₁₁O₉P",
  asset2d: D2("g1p"),
  no3dReason: "本分子无 3D 资产；不拿其他分子坐标替代，3D 不建。",
  sourceNote:
    "2D 由 RDKit 由 SMILES 生成；本分子不建 3D。人源 PGM1–G6P 结构 6UIQ（2.3 Å，X-ray，链 A/B，配体 G6P + MG）已核验；G1P 是同一可逆反应的产物侧，但未取坐标。",
};
const GLY_UTP = {
  id: "utp",
  name: "尿苷三磷酸（UTP）",
  formula: "C₉H₁₁N₂O₁₅P₃",
  asset2d: D2("utp"),
  no3dReason: "UTP 来源未建独立通路，也没有本轮可用的同分子本酶坐标；不生成 3D 资产。",
  sourceNote:
    "2D 由 RDKit 由 SMILES 生成；本分子不建 3D。UTP 由嘧啶核苷酸合成供给；本平台未建该通路，只注记，不指向任何不存在的接口 id。",
};
const GLY_UDPG = {
  id: "udp-glucose",
  name: "UDP-葡萄糖（UDP-Glc）",
  formula: "C₁₅H₂₂N₂O₁₇P₂",
  asset2d: D2("udp-glucose"),
  no3dReason:
    "本分子不生成 3D 资产；4R7P 的 UPG 坐标只完成身份核验，未提取为原子资产。",
  sourceNote:
    "2D 由 RDKit 由 SMILES 生成；本分子不建 3D。人源 UGP2–UDP-葡萄糖结构 4R7P（3.35 Å，X-ray，链 A–D，配体 UPG）已核验，但未把 UPG 坐标提取成 3D 资产。",
};
const GLY_PPI = {
  id: "ppi",
  name: "焦磷酸（PPi）",
  formula: "HP₂O₇",
  asset2d: D2("ppi"),
  no3dReason: "原子数过少，球棍无形状信息量；只做 2D 结构式，3D 不建。",
  sourceNote:
    "2D 由 RDKit 由 SMILES 生成；本分子不建 3D。PPi 作为 UGP2 的离去基团；水解后计 1 个酐键。",
};
const GLY_UDP = {
  id: "udp",
  name: "尿苷二磷酸（UDP）",
  formula: "C₉H₁₂N₂O₁₂P₂",
  asset2d: D2("udp"),
  no3dReason: "本分子无 3D 资产；不拿其他核苷酸坐标替代，3D 不建。",
  sourceNote:
    "2D 由 RDKit 由 SMILES 生成；本分子不建 3D。UDP 是糖原合酶反应的离去基团。",
};
const GLY_G6P: MolPart = {
  ...G6P,
  sourceNote:
    "首屏来源：坐标取自人己糖激酶 HK1（1CZA，1.9 Å，X-ray）口袋里的 G6P；HK1 不是本步酶。本步人源 PGM1–G6P 结构 6UIQ（2.3 Å，X-ray，链 A/B，配体 G6P + MG）已核验，但本轮未生成对应原子资产。",
};
const GLY_GLC: MolPart = {
  ...GLC,
  sourceNote:
    "首屏来源：坐标取自人己糖激酶 HK1（1CZA，1.9 Å，X-ray）口袋里的 α-D-葡萄糖；HK1 不是本步酶。人源 G6PC1–G6P 结构 9JTM（2.9 Å，cryo-EM）只作酶结构核验，产物葡萄糖资产仍取自 1CZA。",
};

const GLYCOGEN_COMPARISON: StepComparison[] = [
  {
    stepId: "gly-1",
    index: 1,
    enzyme: "糖原磷酸化酶（肝 PYGL / 肌 PYGM）",
    isozyme: "PLP 共价辅因子",
    equation: "(α-1,4-糖原)ₙ + Pi → G1P + (α-1,4-糖原)ₙ₋₁",
    substrate: {
      name: "糖原（α-1,4）ₙ + Pi",
      formula: "C₆H₁₀O₅（每残基）+ HPO₄²⁻",
      parts: [GLY_GLYCOGEN],
      cofactorNote: "Pi 与 PLP 只作文字：Pi 单原子基团不入画，PLP 是酶共价辅因子。",
    },
    product: {
      name: "G1P + 糖原（n−1）",
      formula: "C₆H₁₁O₉P²⁻ + C₆H₁₀O₅（每残基）",
      parts: [GLY_G1P],
      cofactorNote: "糖原（n−1）仍是同一聚合物，不入画。",
    },
    arrowLabel: "Pi 直接插入 α-1,4 键",
    change: "磷酸解：糖苷键被 Pi 裂解，葡萄糖单位以 G1P 形式释放；不消耗 ATP。",
    physiology: "磷酸解每释放 1 个 G1P 相当于省下 1 个 ATP；PLP 是活性位点必需的共价辅因子。",
    evidence: {
      substrate: [evOnly2d("glycogen")],
      product: [evOnly2d("g1p")],
    },
    defaultMode: "2d",
    defaultModeRule:
      "两侧都无可比 3D（糖原为聚合物只有 2D 片段、G1P 无 3D），保持 2D。",
  },
  {
    stepId: "gly-2",
    index: 2,
    enzyme: "脱支酶（AGL，双功能）",
    equation: "极限糊精（分支）→ 线性糖原 + 游离葡萄糖",
    substrate: {
      name: "极限糊精（分支糖原剩余）",
      formula: "C₆H₁₀O₅（每残基）",
      parts: [GLY_LIMIT],
      cofactorNote: "转移与水解是同一酶的两个活性，不另画辅因子。",
    },
    product: {
      name: "游离葡萄糖（每分支 1 个）",
      formula: "C₆H₁₂O₆",
      parts: [GLY_GLC],
      cofactorNote: "线性糖原仍留在颗粒中，不入画；表中只对照被切下的游离葡萄糖。",
    },
    arrowLabel: "转移 3 残基 + 水解 α-1,6",
    change: "AGL 先把 3 个残基转到主链，再水解 α-1,6 键；每分支释放 1 个游离葡萄糖。",
    physiology: "肝可直接释出游离葡萄糖；肌需己糖激酶再磷酸化（耗 1 ATP）后进糖酵解。",
    evidence: {
      substrate: [evOnly2d("glycogen-limit")],
      product: [evOtherHuman("glc")],
    },
    defaultMode: "2d",
    defaultModeRule: "底物侧为分支聚合物（只有 2D 片段、无 3D）；产物侧只有既有 GLC 3D，保持 2D 以保证两侧对称。",
  },
  {
    stepId: "gly-3",
    index: 3,
    enzyme: "磷酸葡萄糖变位酶 1（PGM1）",
    equation: "G1P ⇌ G6P",
    substrate: {
      name: "葡萄糖-1-磷酸（G1P）",
      formula: "C₆H₁₁O₉P²⁻",
      parts: [GLY_G1P],
      cofactorNote: "glucose-1,6-bisphosphate 是催化中间体，不入画。",
    },
    product: {
      name: "葡萄糖-6-磷酸（G6P）",
      formula: "C₆H₁₁O₉P²⁻",
      parts: [GLY_G6P],
      cofactorNote: "磷酸基从 C1 转到 C6，不消耗 ATP。",
    },
    arrowLabel: "磷酸基 C1 → C6",
    change: "同一磷酸基在葡萄糖环上换位；G1P 与 G6P 都是磷酸单酯二价阴离子。",
    physiology: "把糖原磷酸解产物接到糖酵解与糖异生共用的 G6P 池。",
    evidence: {
      substrate: [evOnly2d("g1p")],
      product: [evOtherHuman("g6p")],
    },
    defaultMode: "2d",
    defaultModeRule: "G1P 只有 2D、无 3D；G6P 一侧有既有 3D，保持 2D，避免把单侧 3D 当成两侧对照。",
  },
  {
    stepId: "gly-4",
    index: 4,
    stageLabel: "肝臂 · 释糖",
    enzyme: "葡萄糖-6-磷酸酶催化亚基 1（G6PC1）",
    isozyme: "ER 膜 · SLC37A4 转运 G6P",
    equation: "G6P + H₂O → 葡萄糖 + Pi",
    substrate: {
      name: "葡萄糖-6-磷酸（G6P）",
      formula: "C₆H₁₁O₉P²⁻",
      parts: [GLY_G6P],
      cofactorNote: "H₂O 与 Pi 不入画：单原子/小基团无形状信息量。",
    },
    product: {
      name: "葡萄糖（GLC）",
      formula: "C₆H₁₂O₆",
      parts: [GLY_GLC],
      cofactorNote: "Pi 是水解产物，不入画；本块只对照 G6P → 葡萄糖。",
    },
    arrowLabel: "磷酸酯水解",
    change: "G6P 的 C6 磷酸酯键被水解释放，生成游离葡萄糖与 Pi；这是肝糖原补充血糖的唯一出口。",
    physiology: "仅肝（及肾皮质）表达 G6PC1；肌无此酶，肌糖原不能直接释放葡萄糖。",
    evidence: {
      substrate: [evOtherHuman("g6p")],
      product: [evOtherHuman("glc")],
    },
    defaultMode: "3d",
    defaultModeRule: "两侧均有既有 3D 资产（g6p / glc，均取自 1CZA 人 HK1 口袋）；产物少一个磷酸基，重原子数与体积均改变，按 3D。",
  },
  {
    stepId: "gly-7",
    index: 7,
    enzyme: "UDP-葡萄糖焦磷酸化酶（UGP2）",
    equation: "G1P + UTP ⇌ UDP-葡萄糖 + PPi",
    substrate: {
      name: "G1P + UTP",
      formula: "C₆H₁₁O₉P²⁻ + C₉H₁₁N₂O₁₅P₃⁴⁻",
      parts: [GLY_G1P, GLY_UTP],
      cofactorNote: "UTP 的 β/γ 磷酸以 PPi 释出；本块不入画 UTP 的 3D。",
    },
    product: {
      name: "UDP-葡萄糖 + PPi",
      formula: "C₁₅H₂₂N₂O₁₇P₂²⁻ + HP₂O₇³⁻",
      parts: [GLY_UDPG, GLY_PPI],
      cofactorNote: "PPi 随后被焦磷酸酶水解为 2 Pi，拉动本反应。",
    },
    arrowLabel: "G1P 攻击 UTP α-磷酸",
    change: "G1P 的磷酸与 UMP 的 α-磷酸成酐键，β/γ 磷酸以 PPi 离去。",
    physiology: "每活化 1 个残基消耗 2 个酐键：UTP → PPi 一个，PPi 水解一个。",
    evidence: {
      substrate: [evOnly2d("g1p"), evOnly2d("utp")],
      product: [evOnly2d("udp-glucose"), evOnly2d("ppi")],
    },
    defaultMode: "2d",
    defaultModeRule: "四个分子端都只有 2D、无 3D；保持 2D，不拿其他核苷酸坐标替代。",
  },
  {
    stepId: "gly-8",
    index: 8,
    enzyme: "糖原合酶（肌 GYS1 / 肝 GYS2）",
    isozyme: "需要 glycogenin 引物",
    equation: "UDP-葡萄糖 + (α-1,4-糖原)ₙ → (α-1,4-糖原)ₙ₊₁ + UDP",
    substrate: {
      name: "UDP-葡萄糖 + 糖原（α-1,4）ₙ",
      formula: "C₁₅H₂₂N₂O₁₇P₂²⁻ + C₆H₁₀O₅（每残基）",
      parts: [GLY_UDPG, GLY_GLYCOGEN],
      cofactorNote: "UDP-葡萄糖是活化糖基；糖原链段不入画。",
    },
    product: {
      name: "糖原（α-1,4）ₙ₊₁ + UDP",
      formula: "C₆H₁₀O₅（每残基）+ C₉H₁₂N₂O₁₂P₂²⁻",
      parts: [GLY_GLYCOGEN, GLY_UDP],
      cofactorNote: "UDP 是离去基团；糖原只延长一个残基，不入画整链。",
    },
    arrowLabel: "糖基转移到非还原端",
    change: "UDP-葡萄糖的 C1 被转到糖原非还原端，UDP 离去；只延长 α-1,4 链。",
    physiology: "糖原合酶起始需要 glycogenin 自糖基化引物；本平台不单列 glycogenin 实体。",
    evidence: {
      substrate: [evOnly2d("udp-glucose"), evOnly2d("glycogen")],
      product: [evOnly2d("glycogen"), evOnly2d("udp")],
    },
    defaultMode: "2d",
    defaultModeRule: "两侧都含糖原聚合物与只有 2D 的分子；保持 2D。",
  },
];

const GLYCOGEN_CONFIG: ComparisonConfig = {
  pathwayId: "glycogen",
  title: "糖原代谢 · 结构对照",
  summary:
    "六块逐步对照：磷酸解、脱支、PGM 分解向、肝 G6PC1、UGP2、糖原合酶。只有 G6P 与葡萄糖使用既有 3D 资产（取自人 HK1 1CZA 口袋，不是糖原代谢酶）；G1P、UTP、UDP-葡萄糖、PPi、UDP 与糖原/极限糊精只有 2D 结构式（RDKit 由 SMILES 生成），不建 3D、不写 PDB 坐标，逐条在首屏写原因。糖原磷酸化酶、G6PC1、GYS1、GBE1、UGP2、PGM1、AGL 的 PDB 身份已在挂图页实时核验，但本轮不提取为原子资产。",
  plateNo: "PLATE SF-10 · 结构对照 · 糖原代谢 · 2026",
  back: { to: "/pathway/glycogen", label: "← 返回挂图" },
  backCaption: "糖原代谢 · 结构对照（挂图页 /pathway/glycogen）",
  enzymePanel: false,
  enzymePanelOffNote: "本通路不做酶的三维（糖原磷酸化酶 / G6PC1 / GYS1 等只做身份核验）· 只做小分子结构对照",
  footerNote:
    "糖原代谢 6 块：磷酸解、脱支、PGM 分解向、肝 G6PC1、UGP2、糖原合酶。3D 只有 G6P 与 α-D-葡萄糖，坐标取自人己糖激酶 HK1 1CZA（1.9 Å，X-ray）口袋，不是糖原代谢酶口袋，首屏来源说明已写明。G1P、UTP、UDP-葡萄糖、PPi、UDP 与糖原/极限糊精只有 2D 结构式（RDKit 由 SMILES 生成，糖原与极限糊精为 3 残基片段示意），不建 3D、不写 PDB 坐标：G1P 与 UDP-葡萄糖虽有已核验的人源本酶结构（6UIQ 2.3 Å、4R7P 3.35 Å），但未提取坐标；糖原为不均一聚合物，无单一实验构象。酶结构候选：1EM6（人 PYGL a 2.2 Å，PLP + NBG + CP4）、1FA9（人 PYGL a 2.4 Å，GLC + AMP）、1Z8D（人 PYGM a 2.3 Å，GLC + AMP）、9JTM/9JTN/9JTO（人 G6PC1 2.9/3.1/3.3 Å，G6P/PO4/F6P）、7Q13/7Q0S（人 GYS1–GYG1 3.0/4.0 Å）、5CLW/5CLT/4BZY（人 GBE1 2.8/2.79/2.75 Å）、4R7P（人 UGP2 3.35 Å，UPG）、6UIQ（人 PGM1 2.3 Å，G6P）、8ZEQ（人 AGL 3.36 Å，apo）。全部 ΔG 为 null，只写定性方向与 Lehninger 8e Ch.19，不编数字。",
  defaultModePolicy:
    "默认模式逐块决定：两侧都有可比 3D 资产且重原子数/体积改变 → 3D；任一侧含聚合物或只有 2D 的分子 → 2D。?mode=2d|3d 为显式覆盖，优先级高于默认值。",
  steps: GLYCOGEN_COMPARISON,
};

export const COMPARISON_CONFIGS: Record<string, ComparisonConfig> = {
  glycolysis: GLYCOLYSIS_CONFIG,
  tca: TCA_CONFIG,
  ppp: PPP_CONFIG,
  gluconeogenesis: GLUCONEOGENESIS_CONFIG,
  "fatty-acid-oxidation": FAO_CONFIG,
  "fatty-acid-synthesis": FAS_CONFIG,
  "urea-cycle": UREA_CONFIG,
  glycogen: GLYCOGEN_CONFIG,
};

export const comparisonConfigFor = (pathwayId?: string): ComparisonConfig | null =>
  (pathwayId ? COMPARISON_CONFIGS[pathwayId] ?? null : null);

/** 每步是否具备完整的底物+产物两侧 2D 结构式（页脚统计用） */
export const hasBothSides = (s: StepComparison) =>
  s.substrate.parts.every((p) => !!p.asset2d) && s.product.parts.every((p) => !!p.asset2d);

/** 每步是否具备完整的底物+产物两侧 3D 资产（原子数过少而明确不建 3D 的分子视为已交代） */
export const hasBothSides3D = (s: StepComparison) =>
  s.substrate.parts.every((p) => !!p.id || !!p.no3dReason) &&
  s.product.parts.every((p) => !!p.id || !!p.no3dReason);
