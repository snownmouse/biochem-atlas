// ============================================================
// structureFrames —— 帧元数据（已退役的"帧带"数据）
//
// 状态：帧带页与逐帧播放已按最终决定取消，/structures/:pathwayId 改为"结构对照页"
// （见 src/pages/StructureFramesPage.tsx 与 src/data/stepComparison.ts）。
// 本文件保留的唯一用途：给挂图入口判断"这一步有没有帧资产"（framesForStep），
// 以及保留每帧的坐标来源/说明作为历史溯源。页面不再渲染这些帧。
// 下面的 role/transition 语义仅作文档留存，不再驱动 UI。
// ============================================================
//
// role 语义（覆盖第 9 步"真四格"与 gk-1"三格+一处抑制位点"两种样例）：
//   substrate   底物单分子（可多配体实例，ligandCodes 数组）
//   pocket      酶口袋（含 apo 空口袋、计算开放构象、声明式缺口三种承载方式）
//   apo         空口袋 / apo 结构（第 9 步四格用；与 pocket 的区别=有实验结构）
//   bound       结合态（底物在口袋，界面残基 + 氢键）
//   product     产物态（活性位点实测产物）
//   allosteric  产物（异位）/ 抑制位点——产物已生成但实测占据别处（如 1CZA 的 G6P）
// 资产 schema（离线生成）为扁平 atoms/bonds/residues/hbonds 列表，可容纳同一 PDB
// 的多个配体实例（第 9 步 3UCD 的 2PG+PEP 两分子可直接拼进同一帧资产）。
// ============================================================

export type FrameRole = "substrate" | "pocket" | "apo" | "bound" | "product" | "allosteric";

export const ROLE_LABEL: Record<FrameRole, string> = {
  substrate: "底物单分子",
  pocket: "酶口袋",
  apo: "空口袋（apo）",
  bound: "结合态",
  product: "产物态",
  allosteric: "产物（异位）",
};

/** 帧间转移：kind 说明这一帧相对上一帧"发生了什么"，页面据此渲染衔接注记 */
export interface FrameTransition {
  /** entry=入袋/合拢 | context=语境切换 | diff=化学差异 | gap=声明式缺口衔接 | crossStep=跨步（换位点/换结构） */
  kind: "entry" | "context" | "diff" | "gap" | "crossStep";
  note: string;
}

export interface StructureFrame {
  /** 全局唯一，如 "gk-1-f0" */
  frameId: string;
  stepId: string;
  stepIndex: number; // 1 起，用于"第 1 步 · 共 N 帧"
  role: FrameRole;
  /** 该帧实际坐标来源结构；声明式缺口帧也可指向其坐标来源 */
  pdbId: string | null;
  ligandCodes: string[];
  /** 一句结构上发生了什么（主舞台用） */
  caption: string;
  stereochemistry: string[];
  /** 高亮残基（展示层；坐标在资产 JSON 里） */
  highlightResidues: { resi: number; resn: string; chain: string }[];
  /** 预投影 2D 资产；null=纯声明帧 */
  assetUrl: string | null;
  /** 帧角标注记（9.5px 档，如 "计算构象 · 非实验坐标"） */
  cornerNote?: string;
  /** 坐标来源结构信息（帧角 PDB / 物种 / 分辨率 三元组） */
  species?: string;
  resolution?: number;
  /** 实验方法（如 "cryo-EM" / "X-ray"）；缺省为 X-ray，cryo-EM 必须标注 */
  method?: string;
  /** 渲染模式：缺省 "3d"（预投影原子/键/残基）；"2d"=结构式帧（PDB 无该分子坐标时） */
  renderMode?: "2d";
  /** 角标色调："teal"=青色（旗舰步"全实验零拼贴"的视觉签名，区别于砖红） */
  cornerTone?: "teal";
  /** 跨步分隔注记：帧带在此帧之前渲染分隔条（用于第 1→2 步等步间过渡，区别于步内换帧） */
  boundaryNote?: string;
  /** 砖红缺口说明（F1 类诚实缺口帧必填） */
  gapStatement?: string;
  transitionFromPrev: FrameTransition | null;
}

export interface FrameSequence {
  pathwayId: string;
  title: string;
  plateNo: string;
  /** 可追加数组：第 2 步直接 push，不改渲染 */
  frames: StructureFrame[];
  plannedSteps: number;
  /** 已有帧的步骤（推导断口用） */
  stepsWithFrames: string[];
  /** 断口指示文案（帧带右端）；带子收尾（complete=true）后不再渲染 */
  pendingNote?: string;
  /** 帧带是否完整收尾（true=无 pending 提示，页头/帧脚改用收尾语义） */
  complete?: boolean;
}

const HB_RESIDUES = [
  { resi: 84, resn: "ASP", chain: "N" },
  { resi: 88, resn: "SER", chain: "N" },
  { resi: 155, resn: "SER", chain: "N" },
  { resi: 172, resn: "THR", chain: "N" },
  { resi: 173, resn: "LYS", chain: "N" },
  { resi: 208, resn: "ASN", chain: "N" },
  { resi: 209, resn: "ASP", chain: "N" },
];

// ---------- 糖酵解帧序列：第 1 步（己糖激酶，1CZA）"三格 + 一处抑制位点" ----------
// 注意：1CZA 无 apo（所有 ≤3 Å 人源条目均含糖）；G6P 在 1CZA 中占据抑制位点，
// 故第 4 帧 role=allosteric，不硬套"产物态"四格语义。
export const glycolysisFrameSequence: FrameSequence = {
  pathwayId: "glycolysis",
  title: "糖酵解 · 结构帧带",
  plateNo: "SF-01",
  plannedSteps: 10,
  stepsWithFrames: ["gk-1", "gk-2", "gk-3", "gk-4", "gk-5", "gk-6", "gk-7", "gk-8", "gk-9", "gk-10"],
  // 运动镜头已取消（最终口径：不演配体进入、不演酶构象变化，页面改为"结构对照"）。
  complete: true, // 糖酵解十步帧带完整（gk-1…gk-10 全接入，无 pending 提示）
  frames: [
    {
      frameId: "gk-1-f0",
      stepId: "gk-1",
      stepIndex: 1,
      role: "substrate",
      pdbId: "1CZA",
      species: "Homo sapiens",
      ligandCodes: ["GLC"],
      caption: "游离葡萄糖单分子：β-D-吡喃型椅式构象，坐标取自 1CZA 实验实例，尚未接触酶。",
      stereochemistry: ["β-D-吡喃葡萄糖（^4C1 椅式）；葡萄糖开/环两种形式均可作底物"],
      highlightResidues: [],
      assetUrl: "/assets/structures/gk-1/frame-f0.json",
      transitionFromPrev: null,
    },
    {
      frameId: "gk-1-f1",
      stepId: "gk-1",
      stepIndex: 1,
      role: "pocket",
      pdbId: "1CZA",
      species: "Homo sapiens",
      ligandCodes: [],
      caption:
        "酶口袋：GLC 去除后的界面残基位置（实验坐标原位）。开放-闭合运动以溶液态 SAXS / HDX-MS 结论为准，本帧不声明任何开放态坐标。",
      stereochemistry: [],
      highlightResidues: HB_RESIDUES,
      assetUrl: "/assets/structures/gk-1/frame-f1.json",
      cornerNote: "实验坐标 · 未能生成开放构象",
      gapStatement:
        "本步人源无 apo 实验结构（1CZA 及所有 ≤3 Å 人源条目均含糖）；ANM 计算开放构象未能生成有效示意（缩放至最大位移 7 Å 后两壁直径增益仅 0.2 Å），故按实验坐标呈现空口袋，不做随机扰动。",
      transitionFromPrev: {
        kind: "entry",
        note: "葡萄糖从游离态进入口袋——口袋随之合拢（合拢态为 1CZA 实验观测，开放态仅溶液态证据）。",
      },
    },
    {
      frameId: "gk-1-f2",
      stepId: "gk-1",
      stepIndex: 1,
      role: "bound",
      pdbId: "1CZA",
      species: "Homo sapiens",
      ligandCodes: ["GLC"],
      caption:
        "结合态：GLC 在活性口袋内，界面残基以氢键网络锁定糖环（ASP84 / SER88 / THR172 / LYS173 / ASN208 / ASP209），口袋呈闭合态。",
      stereochemistry: ["糖环保持 ^4C1 椅式；C6–O6 羟基外伸，等待接受 ATP γ-磷酸"],
      highlightResidues: HB_RESIDUES,
      assetUrl: "/assets/structures/gk-1/frame-f2.json",
      transitionFromPrev: {
        kind: "diff",
        note: "同一口袋视角下化学发生变化：C6 位羟基被 ATP γ-磷酸磷酰化——差异=磷酸基（砖红）。",
      },
    },
    {
      frameId: "gk-1-f3",
      stepId: "gk-1",
      stepIndex: 1,
      role: "allosteric",
      pdbId: "1CZA",
      species: "Homo sapiens",
      ligandCodes: ["G6P"],
      caption:
        "G6P 已生成，出现在抑制位点（非活性位点的产物位）——这是 1CZA 的实测分布。相对 GLC 新增 C6–O6–P 磷酸酯键（砖红标注）；活性位点产物结合模式无实验结构，本帧不做伪造。",
      stereochemistry: ["β-D-葡糖-6-磷酸（β-吡喃型）；C6 位磷酰化后糖环构型不变"],
      highlightResidues: HB_RESIDUES,
      assetUrl: "/assets/structures/gk-1/frame-f3.json",
      cornerNote: "1CZA 实测分布 · G6P 位于抑制位点",
      transitionFromPrev: {
        kind: "diff",
        note: "同一化学（C6 磷酰化）在 1CZA 的另一实例位点呈现；帧间差异=磷原子与磷酸基三氧（砖红）。",
      },
    },

    // ==================== 第 2 步（磷酸葡萄糖异构酶，G6P ⇌ F6P） ====================
    // 三档规则：1U0F/2CXS 同酶同物种跨结构 → 可并置 + 标"跨结构示意"；
    // 1JIQ（人）apo 对 holo（鼠）跨物种 → 降级为文字声明帧，不并置。
    {
      frameId: "gk-2-f0",
      stepId: "gk-2",
      stepIndex: 2,
      role: "substrate",
      pdbId: "1U0F",
      species: "Mus musculus",
      resolution: 1.6,
      ligandCodes: ["G6P"],
      caption:
        "底物 G6P 单分子：1U0F 实验实例（链 A resi 900），β-D-吡喃型，C1 为醛糖碳（环式半缩醛）——与第 1 步末的 G6P 是同一分子。",
      stereochemistry: ["β-D-吡喃葡萄糖-6-磷酸（^4C1 椅式）；C1–C2 待异构化"],
      highlightResidues: [],
      assetUrl: "/assets/structures/gk-2/frame-f0.json",
      boundaryNote:
        "跨步 · G6P 换手：第 1 步产物 G6P 自 HK1 释出，进入第 2 步 GPI 活性位点。同一分子、两个结构（1CZA 人 → 1U0F 鼠），画面位置连续是视角对齐的结果，不是同一口袋。",
      transitionFromPrev: {
        kind: "crossStep",
        note: "同一分子换位点：第 1 步末 G6P 在 1CZA 抑制位点（实测分布），此处进入 1U0F 的 GPI 活性位点（底物态）。化学式未变，糖环仍为吡喃型；跨结构示意。",
      },
    },
    {
      frameId: "gk-2-f1",
      stepId: "gk-2",
      stepIndex: 2,
      role: "apo",
      pdbId: "1JIQ",
      species: "Homo sapiens",
      resolution: 1.9,
      ligandCodes: [],
      caption:
        "apo 空口袋：结构已存在（1JIQ，无配体二聚体），但 holo 均为小鼠——跨物种并置被三档规则禁止，本帧只声明、不展示口袋坐标。",
      stereochemistry: [],
      highlightResidues: [],
      assetUrl: null,
      cornerNote: "跨物种降级 · 文字声明帧",
      gapStatement:
        "本步有真人源 apo（1JIQ，1.9 Å，无配体二聚体）；但 holo 结构均为小鼠（1U0F / 2CXS）。按核验表三档规则，跨物种 apo 与 holo 口袋不可直接并置——本帧降级为文字说明，不呈现 1JIQ 口袋坐标，也不与鼠源口袋混排。",
      transitionFromPrev: {
        kind: "entry",
        note: "G6P 进入 GPI 活性位点（闭合态由 1U0F 实测）；apo（人）与 holo（鼠）口袋形状差异不可比，故本帧不绘制。",
      },
    },
    {
      frameId: "gk-2-f2",
      stepId: "gk-2",
      stepIndex: 2,
      role: "bound",
      pdbId: "1U0F",
      species: "Mus musculus",
      resolution: 1.6,
      ligandCodes: ["G6P"],
      caption:
        "结合态：G6P 在 GPI 活性位点内，界面残基以氢键锁定糖环与磷酸基（离线重算，距离启发式）；与 2CXS 同酶同物种跨结构并置。",
      stereochemistry: ["G6P 保持 ^4C1 吡喃型；C1–C2 键准备质子转移"],
      highlightResidues: [],
      assetUrl: "/assets/structures/gk-2/frame-f2.json",
      cornerNote: "跨结构示意 · 1U0F",
      transitionFromPrev: {
        kind: "diff",
        note: "羰基从 C1 移到 C2：G6P（醛糖，吡喃环）⇌ F6P（酮糖，呋喃环）——C1–C2 异构化，无新增原子（砖红=C1/C2/O2 及其键）。",
      },
    },
    {
      frameId: "gk-2-f3",
      stepId: "gk-2",
      stepIndex: 2,
      role: "product",
      pdbId: "2CXS",
      species: "Mus musculus",
      resolution: 1.5,
      ligandCodes: ["F6P"],
      caption:
        "产物 F6P：2CXS 实验实例（活性位点实测），呋喃型酮糖——C2 带羟基（半缩酮）、C1 退为 CH₂OH；与 F2 来自不同结构，跨结构示意。",
      stereochemistry: ["β-D-呋喃果糖-6-磷酸；异构化后磷酸基仍在 C6"],
      highlightResidues: [],
      assetUrl: "/assets/structures/gk-2/frame-f3.json",
      cornerNote: "跨结构示意 · 2CXS",
      transitionFromPrev: {
        kind: "diff",
        note: "羰基从 C1 移到 C2：G6P（醛糖，吡喃环）⇌ F6P（酮糖，呋喃环）——C1–C2 异构化，无新增原子（砖红=C1/C2/O2 及其键）。",
      },
    },

    // ==================== 第 3 步（PFK-1，人肝 PFKL，8W2G cryo-EM 3.0 Å） ====================
    // 核验表：P17858 全部 cryo-EM、全部带配体、无 apo；FBP 实测于远端别构位点（42.1 Å），
    // 活性位点产物结合无实验结构 → 产物帧为声明帧，不声称"产物态"。
    {
      frameId: "gk-3-f0",
      stepId: "gk-3",
      stepIndex: 3,
      role: "substrate",
      pdbId: "8W2G",
      species: "Homo sapiens",
      resolution: 3.0,
      method: "cryo-EM",
      ligandCodes: ["F6P"],
      caption:
        "底物 F6P 单分子：8W2G 实测（人 PFKL，四聚体，链 A resi 801）——第 2 步产物进入第 3 步；本步化学=F6P 的 C1–O1 接受 ATP γ-磷酰基。",
      stereochemistry: ["F6P 保持 β-D-呋喃型；C1–OH 为磷酰基受体"],
      highlightResidues: [],
      assetUrl: "/assets/structures/gk-3/frame-f0.json",
      boundaryNote:
        "跨步 · F6P 换手：第 2 步产物 F6P 自 GPI 释出，进入第 3 步 PFK-1。分子为同一化学实体（2CXS 鼠 → 8W2G 人，跨物种=配体级全原子对齐）；画面位置连续是视角对齐的结果。",
      transitionFromPrev: {
        kind: "crossStep",
        note: "同一分子换结构：2CXS（鼠）→ 8W2G（人），跨物种配体级对齐（16 原子 Kabsch，RMSD 见报脚），跨物种显式标注。",
      },
    },
    {
      frameId: "gk-3-f1",
      stepId: "gk-3",
      stepIndex: 3,
      role: "pocket",
      pdbId: null,
      ligandCodes: [],
      caption: "酶口袋（apo）：不可呈现——人肝 PFKL 全部 6 个 cryo-EM 条目均带配体，无 apo 结构。",
      stereochemistry: [],
      highlightResidues: [],
      assetUrl: null,
      cornerNote: "无 apo 结构 · 声明帧",
      gapStatement:
        "人肝 PFKL（P17858）下仅 6 条，全部 cryo-EM（2.6–3.6 Å）且全部带配体（8W2G/7LW1/8W2H 等），无 apo。按核验纪律本帧不呈现任何口袋坐标，也不用其他 PFKM/别种结构顶替。",
      transitionFromPrev: {
        kind: "entry",
        note: "F6P 进入 PFK-1 活性位点（结合态由 8W2G 实测）；apo 缺失——口袋如何等待底物，无实验坐标可示。",
      },
    },
    {
      frameId: "gk-3-f2",
      stepId: "gk-3",
      stepIndex: 3,
      role: "bound",
      pdbId: "8W2G",
      species: "Homo sapiens",
      resolution: 3.0,
      method: "cryo-EM",
      ligandCodes: ["F6P", "ADP"],
      caption:
        "结合态：F6P 与催化位点 ADP 同框（8W2G 实测，同一结构）——ATP 的 γ-磷酰基已不在（本步化学=磷酰基转移至 F6P 的 C1–O1，生成 FBP+ADP）。四聚体取单亚基口袋：活性位点位于亚基内部，帧带尺度下整四聚体会把口袋缩到不可读；别构位点在下一帧单独声明。",
      stereochemistry: ["F6P 呋喃型保持；C1–O1 为受磷酰基的羟基"],
      highlightResidues: [],
      assetUrl: "/assets/structures/gk-3/frame-f2.json",
      cornerNote: "跨结构示意 · 8W2G · cryo-EM · 四聚体取单亚基",
      transitionFromPrev: {
        kind: "entry",
        note: "F6P 合拢入袋（实测结合态）；催化位点的 ADP 与 F6P 同框，等待磷酰基转移。",
      },
    },
    {
      frameId: "gk-3-f3",
      stepId: "gk-3",
      stepIndex: 3,
      role: "allosteric",
      pdbId: "8W2G",
      species: "Homo sapiens",
      resolution: 3.0,
      method: "cryo-EM",
      ligandCodes: ["FBP"],
      caption:
        "FBP（本步产物）在 8W2G 中有实验坐标，但实测位于远端别构位点（距活性位点 42.1 Å）——不是活性位点的产物位。活性位点「F6P+ADP→FBP」的产物结合模式无实验结构。",
      stereochemistry: ["FBP = F6P 的 C1 位新增磷酰基（化学差异可声明，结合模式不可展示）"],
      highlightResidues: [],
      assetUrl: null,
      cornerNote: "FBP 位点=别构 · 非产物位 · 声明帧",
      gapStatement:
        "核验表确认：8W2G 的 FBP 实测于远端别构位点（42.1 Å），产物态判定=无。本帧只声明化学差异（C1 新增磷酰基），不展示别构位点坐标（距活性口袋过远、并置会误导），也不伪造产物结合模式。",
      transitionFromPrev: {
        kind: "diff",
        note: "化学差异：F6P 的 C1–O1 新增磷酰基 → FBP；但产物结合模式无实验坐标，差异只能声明。",
      },
    },

    // ==================== 第 4 步（醛缩酶 ALDOA，4ALD 人 / 1ADO 兔 / 5KY6 人 apo） ====================
    // RCSB 一手字段核实（research/aldolase-species-check.md）：4ALD=Homo sapiens P04075（天然人骨骼肌，非兔）；
    // 1ADO=Oryctolagus cuniculus P00883（兔骨骼肌，与 4ALD 同酶不同物种）；5KY6=人野生型 apo（重组表达 E. coli）。
    // 4ALD 的 2FP=线形 F1,6BP 是唯一人源底物态；DHAP 以共价席夫碱中间体存在（无结构）；
    // apo（5KY6）与 holo（4ALD）同物种同酶跨结构 → 三档规则第②档，允许并置+角标（f1 为真 3D 帧）。
    {
      frameId: "gk-4-f0",
      stepId: "gk-4",
      stepIndex: 4,
      role: "substrate",
      pdbId: "4ALD",
      species: "Homo sapiens",
      resolution: 2.8,
      ligandCodes: ["2FP"],
      caption:
        "底物 F1,6BP 单分子：4ALD 实测（人 ALDOA，天然人骨骼肌，链 A resi 364）。构象说明：配体为线形（开链）型，而非溶液中的主要环式——醛缩酶的切断反应正需要开链骨架；线形与物种来源互不相关，是 4ALD 晶体捕获的结合构象。",
      stereochemistry: ["开链 D-果糖-1,6-二磷酸；C3–C4 键将被切断（→ DHAP + GAP）"],
      highlightResidues: [],
      assetUrl: "/assets/structures/gk-4/frame-f0.json",
      boundaryNote:
        "跨步 · FBP 换手：第 3 步的 FBP 在 8W2G 只有别构位点实测坐标（非产物位）；第 4 步以 4ALD 的线形 F1,6BP（配体代码 2FP）实测坐标呈现底物。分子为同一化学实体（开链型），跨结构对齐基准=F6P 共同骨架（RMSD 见报脚）。",
      transitionFromPrev: {
        kind: "crossStep",
        note: "同一分子换结构：8W2G（人 PFKL）→ 4ALD（人 ALDOA），物种相同但跨酶，仅配体级骨架对齐；线形构象为 4ALD 实测，非本步化学产物构型声明。",
      },
    },
    {
      frameId: "gk-4-f1",
      stepId: "gk-4",
      stepIndex: 4,
      role: "apo",
      pdbId: "5KY6",
      species: "Homo sapiens",
      resolution: 1.94,
      ligandCodes: [],
      caption:
        "apo 空口袋：5KY6 实测（人 ALDOA，野生型，重组表达于 E. coli，1.94 Å）。apo 与 holo（4ALD，2.8 Å）来自两颗不同晶体、不是同一次实验；口袋残基锚点为 apo 实测位置，经 Cα 叠合到 4ALD 坐标系并置——同物种同酶跨结构示意，无配体可绘。",
      stereochemistry: [],
      highlightResidues: [],
      assetUrl: "/assets/structures/gk-4/frame-f1.json",
      cornerNote: "人源 ALDOA · 5KY6 · 1.94 Å · X-ray · 跨结构同物种",
      transitionFromPrev: {
        kind: "entry",
        note: "空口袋与结合态对照：apo（5KY6）与 holo（4ALD）为两颗不同晶体，同物种同酶跨结构并置；残基锚点是 apo 实测位置，无配体可绘。",
      },
    },
    {
      frameId: "gk-4-f2",
      stepId: "gk-4",
      stepIndex: 4,
      role: "bound",
      pdbId: "4ALD",
      species: "Homo sapiens",
      resolution: 2.8,
      ligandCodes: ["2FP"],
      caption:
        "结合态：线形 F1,6BP 在 4ALD 口袋内——该构象为非生产性构象（未处于 C3–C4 切割几何），催化性席夫碱中间体本身无结构；本帧如实呈现实测结合模式，不声称「即将切断」。",
      stereochemistry: ["开链 F1,6BP；共价席夫碱（Lys 与 C2）中间体无实验结构"],
      highlightResidues: [],
      assetUrl: "/assets/structures/gk-4/frame-f2.json",
      cornerNote: "线形非生产性构象 · 实测如实呈现",
      transitionFromPrev: {
        kind: "entry",
        note: "开链 F1,6BP 进入口袋（4ALD 实测）；apo（5KY6）与 holo 同物种（人）跨结构并置，口袋差异为真实物理差异。",
      },
    },
    {
      frameId: "gk-4-f3",
      stepId: "gk-4",
      stepIndex: 4,
      role: "product",
      pdbId: "1ADO",
      species: "Oryctolagus cuniculus",
      resolution: 1.9,
      ligandCodes: ["13P"],
      caption:
        "产物 DHAP：1ADO 实测（兔 Oryctolagus cuniculus，P00883；与 4ALD 同酶不同物种 · 配体级叠合示意）——醛缩酶切断 C3–C4 后，C1–C3 片段（DHAP）离开口袋；GAP（C4–C6 片段）在 PDB 无可信坐标，下一帧以 2D 承接。",
      stereochemistry: ["DHAP：C2 前手性（本步尚不成为手性中心）"],
      highlightResidues: [],
      assetUrl: "/assets/structures/gk-4/frame-f3.json",
      cornerNote: "跨结构示意 · 1ADO（兔）· 同酶不同物种",
      transitionFromPrev: {
        kind: "diff",
        note: "C3–C4 键断裂：F1,6BP → DHAP（C1–C3）+ GAP（C4–C6）；DHAP 经公共原子（C1/C2/C3/O1）对齐到 4ALD 坐标系（RMSD 见报脚）。",
      },
    },

    // ==================== 第 5 步（TPI，1NEY 酵母 1.2 Å） ====================
    // 核验表：PDB 组分字典中不存在甘油醛-3-磷酸（G3P=sn-甘油-3-磷酸，9FFC 是陷阱）；
    // 产物态全无 → 产物帧用 2D 结构式（渲染路径首用）。
    {
      frameId: "gk-5-f0",
      stepId: "gk-5",
      stepIndex: 5,
      role: "substrate",
      pdbId: "1NEY",
      species: "Saccharomyces cerevisiae",
      resolution: 1.2,
      ligandCodes: ["13P"],
      caption:
        "底物 DHAP 单分子：1NEY 实测（酵母 TPI，链 A resi 5001，1.2 Å）；DHAP 前手性——本步化学=C1↔C2 的 1,2-氢迁移（经烯二醇中间体），把酮二羟丙酮变为醛糖 GAP。",
      stereochemistry: ["DHAP：C1/C2 前手性；迁移后 GAP 的 C2 成为 R 构型手性中心"],
      highlightResidues: [],
      assetUrl: "/assets/structures/gk-5/frame-f0.json",
      boundaryNote:
        "跨步 · DHAP 换手：第 4 步产物 DHAP（兔 1ADO 实测）进入第 5 步 TPI；此处为酵母 1NEY 的实测坐标——跨物种=配体级全原子对齐（显式标注），口袋并置仍被禁止。",
      transitionFromPrev: {
        kind: "crossStep",
        note: "同一分子换结构：1ADO（兔）→ 1NEY（酵母），跨物种配体级对齐（10 重原子 Kabsch，RMSD 见报脚）。",
      },
    },
    {
      frameId: "gk-5-f1",
      stepId: "gk-5",
      stepIndex: 5,
      role: "bound",
      pdbId: "1NEY",
      species: "Saccharomyces cerevisiae",
      resolution: 1.2,
      ligandCodes: ["13P"],
      caption:
        "结合态：DHAP 在 TPI 活性位点（1NEY 实测）。结构含 3-氟色氨酸修饰残基 FTR168（结晶辅助，非天然），如实保留于界面扫描并在此注明——不影响口袋几何解读。",
      stereochemistry: ["DHAP 结合构象=烯二醇中间体路径的起点（中间体本身无结构）"],
      highlightResidues: [],
      assetUrl: "/assets/structures/gk-5/frame-f1.json",
      cornerNote: "含 FTR168 修饰残基 · 实测",
      transitionFromPrev: {
        kind: "entry",
        note: "DHAP 进入活性位点（1NEY 实测）；催化残基环境以界面残基呈现。",
      },
    },
    {
      frameId: "gk-5-f2",
      stepId: "gk-5",
      stepIndex: 5,
      role: "product",
      pdbId: null,
      ligandCodes: ["GAP"],
      renderMode: "2d",
      caption:
        "产物 GAP：PDB 组分字典中不存在甘油醛-3-磷酸（G3P 是 sn-甘油-3-磷酸；9FFC 条目是已知陷阱）——全库无实验三维坐标，以 2D 结构式代表，不伪造 3D。",
      stereochemistry: [
        "D-GAP：C2 为 R 构型——1,2-氢迁移使 C2 从前手性变为手性",
        "烯二醇中间体：C1–C2 双键瞬时形成，C1 的氢转移到 C2",
      ],
      highlightResidues: [],
      assetUrl: "/assets/structures/2d/gap.json",
      cornerNote: "2D 结构式 · 无实验三维坐标",
      transitionFromPrev: {
        kind: "gap",
        note: "DHAP→GAP：分子内 1,2-氢迁移（C1–H 经烯二醇中间体转移到 C2），无原子增减；产物无实验坐标，以 2D 代表（渲染帧见砖红角标）。",
      },
    },

    // ==================== 第 6 步（GAPDH，1U8F 人 1.75 Å；apo 8G15 人 2.07 Å） ====================
    // 核验表：人 23 条无任何底物/产物配体结构；GAP 与 1,3-BPG 均无 PDB 组分。
    {
      frameId: "gk-6-f0",
      stepId: "gk-6",
      stepIndex: 6,
      role: "substrate",
      pdbId: null,
      ligandCodes: ["GAP"],
      renderMode: "2d",
      caption:
        "底物 GAP：仍以 2D 结构式代表（无实验三维坐标）——与第 5 步产物帧是同一分子的账面交接；GAPDH 将把 C1 醛基氧化为酰基磷酸。",
      stereochemistry: ["D-GAP：C2 为 R 构型；C1 醛基为本步氧化位点"],
      highlightResidues: [],
      assetUrl: "/assets/structures/2d/gap.json",
      cornerNote: "2D 结构式 · 无实验三维坐标",
      boundaryNote:
        "跨步 · GAP 换手（账面）：第 5 步产物 GAP 无实验三维坐标（2D 代表），第 6 步底物仍是它——此处为两个 2D 帧之间的衔接。另：第 5→6 步跨步相机在此断开（GAP 无 3D 坐标，无法做公共原子对齐），第 6 步起以自身口袋重建视角。",
      transitionFromPrev: {
        kind: "crossStep",
        note: "同一分子（2D 代表）进入第 6 步；1U8F 实测结构只含酶+NAD，底物结合模式无实验结构。",
      },
    },
    {
      frameId: "gk-6-f1",
      stepId: "gk-6",
      stepIndex: 6,
      role: "apo",
      pdbId: "8G15",
      species: "Homo sapiens",
      resolution: 2.07,
      ligandCodes: [],
      caption:
        "apo 空口袋：8G15（人，2.07 Å，X-ray）实测——与结合态 1U8F 同酶同物种，可并置（跨结构示意）；这是第 6 步唯一可并置的口袋对照。",
      stereochemistry: [],
      highlightResidues: [],
      assetUrl: "/assets/structures/gk-6/frame-f1.json",
      cornerNote: "跨结构示意 · 8G15（人）",
      transitionFromPrev: {
        kind: "entry",
        note: "口袋先于辅因子呈现；8G15 与 1U8F 经 Cα 刚体对齐（RMSD 见报脚）。",
      },
    },
    {
      frameId: "gk-6-f2",
      stepId: "gk-6",
      stepIndex: 6,
      role: "bound",
      pdbId: "1U8F",
      species: "Homo sapiens",
      resolution: 1.75,
      ligandCodes: ["NAD"],
      caption:
        "结合态：GAPDH 只实测到酶+NAD（1U8F，链 P resi 336）——底物 GAP 与产物 1,3-BPG 在 PDB 配体字典中均不存在，无复合物结构。本帧明确不声称底物在口袋。",
      stereochemistry: ["NAD⁺：C4N 为氢负受体（本步化学=C1 醛基氧化 + 氢负转移至 NAD⁺）"],
      highlightResidues: [],
      assetUrl: "/assets/structures/gk-6/frame-f2.json",
      cornerNote: "仅辅因子结合态 · 无底物复合物",
      transitionFromPrev: {
        kind: "entry",
        note: "NAD⁺ 占据催化口袋（实测）；底物 GAP 以 2D 代表，其结合模式无实验结构。",
      },
    },
    {
      frameId: "gk-6-f3",
      stepId: "gk-6",
      stepIndex: 6,
      role: "product",
      pdbId: null,
      ligandCodes: ["13B"],
      renderMode: "2d",
      caption:
        "产物 1,3-BPG：PDB 组分字典中不存在（13B/13PG 均无条目），以 2D 结构式代表。本步化学=C1 醛基氧化为酰基磷酸（C1–O–P 高能键），氢负转移至 NAD⁺（NADH 生成）。",
      stereochemistry: ["1,3-BPG：C2 保持 R 构型；C1 由醛基变为酰基磷酸"],
      highlightResidues: [],
      assetUrl: "/assets/structures/2d/bpg13.json",
      cornerNote: "2D 结构式 · 无实验三维坐标",
      transitionFromPrev: {
        kind: "gap",
        note: "醛基→酰基磷酸（无机磷酸进攻硫半缩醛中间体）+ NAD⁺→NADH；产物无实验坐标，以 2D 代表。",
      },
    },

    // ==================== 第 7 步（PGK1，9FDN 人 1.58 Å；apo 8YHP 人；TS 模拟 2WZB 人） ====================
    // 核验表：9FDN=唯一"双真实底物"结构（3PG+ATP，即糖酵解方向产物对）；
    // 2WZB=ADP+3PG+MgF₃ 过渡态模拟（人）；1,3-BPG 无组分 → 底物帧 2D。
    {
      frameId: "gk-7-f0",
      stepId: "gk-7",
      stepIndex: 7,
      role: "apo",
      pdbId: "8YHP",
      species: "Homo sapiens",
      resolution: 1.95,
      ligandCodes: [],
      caption:
        "apo 空口袋：8YHP（人，1.95 Å，仅 EDO 结晶辅质）实测——与 9FDN/2WZB 同酶同物种，经 Cα 对齐投影（RMSD 见报脚），跨结构示意。",
      stereochemistry: [],
      highlightResidues: [],
      assetUrl: "/assets/structures/gk-7/frame-f0.json",
      cornerNote: "跨结构示意 · 8YHP（人）",
      boundaryNote:
        "跨步 · 1,3-BPG 换手（账面）：第 6 步产物 1,3-BPG 无实验三维坐标；第 7 步先呈现实测 apo（8YHP），底物以 2D 进入口袋，实测结构给出的是产物对（9FDN）与过渡态模拟（2WZB）。另：第 6→7 步跨步相机在此断开重建（GAPDH 与 PGK 无公共 3D 配体可对齐）。",
      transitionFromPrev: {
        kind: "crossStep",
        note: "进入第 7 步：口袋先于底物呈现（8YHP 实测，人）；底物 1,3-BPG 的结合模式无实验结构。",
      },
    },
    {
      frameId: "gk-7-f1",
      stepId: "gk-7",
      stepIndex: 7,
      role: "substrate",
      pdbId: null,
      ligandCodes: ["13B"],
      renderMode: "2d",
      caption:
        "底物 1,3-BPG 进入口袋：无实验三维坐标（PDB 无该组分）——真实中间体极不稳定，这正是它没有结构的原因；以 2D 结构式代表，不伪造结合模式。",
      stereochemistry: ["1,3-BPG：C1 酰基磷酸为 PGK 的磷酰基供体"],
      highlightResidues: [],
      assetUrl: "/assets/structures/2d/bpg13.json",
      cornerNote: "2D 结构式 · 无实验三维坐标",
      transitionFromPrev: {
        kind: "gap",
        note: "底物以 2D 代表进入 PGK 口袋；结合模式无实验结构。",
      },
    },
    {
      frameId: "gk-7-f2",
      stepId: "gk-7",
      stepIndex: 7,
      role: "bound",
      pdbId: "2WZB",
      species: "Homo sapiens",
      resolution: 1.47,
      ligandCodes: ["ADP", "3PG", "MGF"],
      caption:
        "过渡态模拟：2WZB（人，1.47 Å）实测 ADP+3PG+MgF₃——MgF₃⁻ 模拟正在 ADP 与 3PG 之间转移的磷酰基，3PG 占位 1,3-BPG 位点。这是实验过渡态替身，不是真实中间体。",
      stereochemistry: ["磷酰基转移的几何：ADP–MgF₃–3PG 近似直线排布（实测）"],
      highlightResidues: [],
      assetUrl: "/assets/structures/gk-7/frame-f2.json",
      cornerNote: "过渡态类似物 · 非真实中间体 · 跨结构示意",
      transitionFromPrev: {
        kind: "diff",
        note: "磷酰基转移瞬间（模拟）：1,3-BPG 的 C1 酰基磷酰基转移给 ADP；砖红=MgF₃ 四原子组（模拟正在转移的磷酰基）。",
      },
    },
    {
      frameId: "gk-7-f3",
      stepId: "gk-7",
      stepIndex: 7,
      role: "product",
      pdbId: "9FDN",
      species: "Homo sapiens",
      resolution: 1.58,
      ligandCodes: ["3PG", "ATP"],
      caption:
        "产物对实测：9FDN（人，1.58 Å）同时含 3PG 与 ATP——糖酵解方向「1,3-BPG+ADP → 3PG+ATP」右侧的实测双配体态；两配体同结构，无跨结构问题（核验表唯一零瑕疵双配体）。",
      stereochemistry: ["3PG：C1 已从酰基磷酸退回羧酸；磷酰基在 ATP 的 γ 位"],
      highlightResidues: [],
      assetUrl: "/assets/structures/gk-7/frame-f3.json",
      cornerNote: "同结构双配体 · 9FDN",
      transitionFromPrev: {
        kind: "diff",
        note: "磷酰基已转移完成：口袋中留下 3PG（C1 羧酸）与 ATP；本帧即第 8 步底物 3PG 的实测来源。",
      },
    },

    // ==================== 第 8 步（PGAM，1QHF 酵母 1.7 Å；半 apo 4GPZ 人；产物兜底 1EQJ 细菌） ====================
    // 核验表：人 PGAM1 无 3PG/2PG/2,3-BPG 结构；4GPZ=半 apo（NEP 磷酰化组氨酸）；2PG 以 1EQJ（细菌）兜底。
    {
      frameId: "gk-8-f0",
      stepId: "gk-8",
      stepIndex: 8,
      role: "substrate",
      pdbId: "1QHF",
      species: "Saccharomyces cerevisiae",
      resolution: 1.7,
      ligandCodes: ["3PG"],
      caption:
        "底物 3PG 单分子：1QHF 实测（酵母 dPGM，链 A resi 252，1.7 Å）；本步化学=磷酰基从 C3–O3 迁移到 C2–O2（3PG→2PG），经磷酰化组氨酸中间体（酵母 dPGM 路径）。",
      stereochemistry: ["3PG：C2 保持 R 构型；磷酰基在 C3–O3（迁移前）"],
      highlightResidues: [],
      assetUrl: "/assets/structures/gk-8/frame-f0.json",
      boundaryNote:
        "跨步 · 3PG 换手：第 7 步产物 3PG（9FDN 人源实测）进入第 8 步 PGAM；此处为酵母 1QHF 的实测坐标——跨物种=配体级全原子对齐（显式标注），口袋并置被三档规则禁止。",
      transitionFromPrev: {
        kind: "crossStep",
        note: "同一分子换结构：9FDN（人）→ 1QHF（酵母），跨物种配体级对齐（11 重原子 Kabsch，RMSD 见报脚）。",
      },
    },
    {
      frameId: "gk-8-f1",
      stepId: "gk-8",
      stepIndex: 8,
      role: "apo",
      pdbId: "4GPZ",
      species: "Homo sapiens",
      resolution: 1.65,
      ligandCodes: [],
      caption:
        "apo（半 apo）：4GPZ（人，1.65 Å）的催化组氨酸被 NEP 共价修饰——不是干净 apo；且跨物种（酵母 holo vs 人 apo）不可并置，本帧只声明、不展示口袋坐标。",
      stereochemistry: [],
      highlightResidues: [],
      assetUrl: null,
      cornerNote: "半 apo · NEP 修饰 · 跨物种降级 · 声明帧",
      gapStatement:
        "人 PGAM1 全部 33 条无 3PG/2PG/2,3-BPG 结构；apo 4GPZ（1.65 Å）含 NEP 磷酰化组氨酸修饰（催化残基被占位，属「半 apo」）。与酵母 holo（1QHF）跨物种并置被三档规则禁止——本帧降级为文字说明。",
      transitionFromPrev: {
        kind: "entry",
        note: "3PG 进入 PGAM 活性位点（结合态由 1QHF 实测）；半 apo 的口袋对照不可比，故不绘制。",
      },
    },
    {
      frameId: "gk-8-f2",
      stepId: "gk-8",
      stepIndex: 8,
      role: "bound",
      pdbId: "1QHF",
      species: "Saccharomyces cerevisiae",
      resolution: 1.7,
      ligandCodes: ["3PG"],
      caption:
        "结合态：3PG 在 PGAM 活性位点（1QHF 实测）——磷酰基此刻仍在 C3–O3，迁移前状态；催化组氨酸以界面残基呈现。",
      stereochemistry: ["3PG 结合构象：C2–OH 与 C3–磷酸均朝向催化残基"],
      highlightResidues: [],
      assetUrl: "/assets/structures/gk-8/frame-f2.json",
      cornerNote: "实测 · 1QHF",
      transitionFromPrev: {
        kind: "entry",
        note: "3PG 进入活性位点（实测）；半 apo（4GPZ，NEP 修饰）只作文字声明。",
      },
    },
    {
      frameId: "gk-8-f3",
      stepId: "gk-8",
      stepIndex: 8,
      role: "product",
      pdbId: "1EQJ",
      species: "细菌（兜底）",
      resolution: 1.7,
      ligandCodes: ["2PG"],
      caption:
        "产物 2PG：人 PGAM1 无产物结构，以细菌 1EQJ（1.7 Å，2PG+Mn）实验坐标兜底，作分子级呈现（口袋不并置——跨物种）。磷酰基已在 C2–O2。",
      stereochemistry: ["2PG：C2 仍为 R 构型；磷酰基位置 C3→C2（连接改变，原子组成不变）"],
      highlightResidues: [],
      assetUrl: "/assets/structures/gk-8/frame-f3.json",
      cornerNote: "跨物种兜底 · 1EQJ（细菌）· 分子级呈现",
      transitionFromPrev: {
        kind: "diff",
        note: "磷酰基从 C3–O3 移到 C2–O2：原子组成不变、连接位置改变（区别于第 2 步的羰基迁移）；对齐基准=C1–C3+O1/O2 羧基端（5 原子 Kabsch，RMSD 见报脚）。",
      },
    },

    // ==================== 第 9 步（烯醇化酶 ENO，3UCD 人 ENO2 1.41 Å）——旗舰"真四格" ====================
    // 核验表：同一结构同时含 2PG（A/601，底物）+ PEP（B/601，产物）+ 双 Mg²⁺；apo 1TE6（人 ENO2，1.8 Å）
    // 为十步中唯一"同酶同物种同编号"的 apo——四帧全实验、零拼贴，角标用青色以资识别。
    // 注意：3UCD 的 2PG 与 PEP 分属两亚基两态（非同口袋两态）；PEP 叠合进 2PG 位点为呈现手段，provenance 已声明。
    {
      frameId: "gk-9-f0",
      stepId: "gk-9",
      stepIndex: 9,
      role: "substrate",
      pdbId: "3UCD",
      species: "Homo sapiens",
      resolution: 1.41,
      ligandCodes: ["2PG"],
      caption:
        "底物 2PG 单分子：3UCD 实测（人 ENO2，1.41 Å，链 A resi 601）——第 8 步产物 2PG 进入第 9 步；本步化学=C3–OH 与 C2–H 脱去 H₂O，生成 C2=C3 双键（PEP）。",
      stereochemistry: ["2PG：C2 为 R 构型；C3–OH 为离去基（Glu211 抽 C2–H、Lys345 质子化 C3–OH）"],
      highlightResidues: [],
      assetUrl: "/assets/structures/gk-9/frame-f0.json",
      cornerNote: "人 ENO2 · 同酶同编号 · 3UCD 实测",
      cornerTone: "teal",
      boundaryNote:
        "跨步 · 2PG 换手：第 8 步产物 2PG（1EQJ 细菌兜底，分子级）进入第 9 步烯醇化酶活性位点；同一配体代码（2PG）同名 11 原子 Kabsch 对齐，跨结构但同分子（RMSD 见报脚）。",
      transitionFromPrev: {
        kind: "crossStep",
        note: "同一分子换结构：1EQJ（细菌，分子级）→ 3UCD（人 ENO2 实测）——从分子级兜底回到真口袋，全实验坐标。",
      },
    },
    {
      frameId: "gk-9-f1",
      stepId: "gk-9",
      stepIndex: 9,
      role: "apo",
      pdbId: "1TE6",
      species: "Homo sapiens",
      resolution: 1.8,
      ligandCodes: [],
      caption:
        "apo 空口袋（真 3D）：1TE6（人 ENO2，1.8 Å）——十步中唯一与 holo 同酶、同物种、同编号的 apo，可直接并置（Cα Kabsch 后残基一一对应）；结晶添加剂 PO4/TRS 不入画。保留的 Mg²⁺ 为必需金属。",
      stereochemistry: [],
      highlightResidues: [],
      assetUrl: "/assets/structures/gk-9/frame-f1.json",
      cornerNote: "人 ENO2 · 同酶同编号 · 1TE6 apo",
      cornerTone: "teal",
      transitionFromPrev: {
        kind: "entry",
        note: "2PG 进入口袋前：apo 与 holo 同酶同编号，口袋残基直接可比——无需跨结构拼贴声明。",
      },
    },
    {
      frameId: "gk-9-f2",
      stepId: "gk-9",
      stepIndex: 9,
      role: "bound",
      pdbId: "3UCD",
      species: "Homo sapiens",
      resolution: 1.41,
      ligandCodes: ["2PG", "MG"],
      caption:
        "结合态：2PG 在烯醇化酶活性位点（3UCD 实测），双 Mg²⁺（A/599、A/600）活化 C2–H 的酸化与 C3–OH 的离去——同结构，无跨结构问题。",
      stereochemistry: ["2PG 结合构象：C2–H 朝向 Glu211（广义碱），C3–OH 由 Lys345/金属活化"],
      highlightResidues: [],
      assetUrl: "/assets/structures/gk-9/frame-f2.json",
      cornerNote: "人 ENO2 · 同酶同编号 · 结合态实测",
      cornerTone: "teal",
      transitionFromPrev: {
        kind: "entry",
        note: "2PG 入位，双 Mg²⁺ 就位（均为 3UCD 实验坐标）——脱水化学即将发生。",
      },
    },
    {
      frameId: "gk-9-f3",
      stepId: "gk-9",
      stepIndex: 9,
      role: "product",
      pdbId: "3UCD",
      species: "Homo sapiens",
      resolution: 1.41,
      ligandCodes: ["2PG", "PEP", "MG"],
      caption:
        "产物帧 · 一帧双分子：2PG（暗色，底物态）与 PEP（亮色，产物态）同为 3UCD 实验坐标；差异=删原子/加键——2PG 的 O3（标「离去」）在 PEP 中不存在，C2=C3 以双线呈现。3UCD 的 2PG 在 A 链、PEP 在 B 链（同结构两亚基两态），PEP 经 7 锚点叠合到本亚基 2PG 位点示意（见报脚 provenance）。",
      stereochemistry: ["PEP：C2=C3 烯醇磷酸（C2 sp²）；磷酸始终酯化在 C2——从 2PG 到 PEP 未换位置"],
      highlightResidues: [],
      assetUrl: "/assets/structures/gk-9/frame-f3.json",
      cornerNote: "人 ENO2 · 同酶同编号 · 一帧双分子",
      cornerTone: "teal",
      transitionFromPrev: {
        kind: "diff",
        note: "脱水已完成：2PG（暗色）的 C3–OH（O3 标「离去·H₂O」）与 C2–H 以 H₂O 脱去 → PEP（C2/C3 砖红）生成 C2=C3 双键（双线）；磷酸始终在 C2（烯醇磷酸）。",
      },
    },

    // ==================== 第 10 步（丙酮酸激酶 PK，6NN4 人 PKL D499N 2.15 Å） ====================
    // 核验表：6NN4 含 PEP（C/603）+ FBP（C/601，别构 36.6 Å 远端）；无 ADP、无金属、无丙酮酸 → 产物 2D 帧。
    // apo 6NN5（人 PKLR 2.26 Å，干净 apo 但含 H527W 结晶工程突变，如实注明）。
    {
      frameId: "gk-10-f0",
      stepId: "gk-10",
      stepIndex: 10,
      role: "substrate",
      pdbId: "6NN4",
      species: "Homo sapiens",
      resolution: 2.15,
      ligandCodes: ["PEP"],
      caption:
        "底物 PEP 单分子：6NN4 实测（人丙酮酸激酶 PKL，D499N 突变体，2.15 Å，链 C resi 603）——第 9 步产物 PEP 进入第 10 步；本步化学=PEP 的磷酰基转移给 ADP 生成 ATP，烯醇式丙酮酸随后自发异构为丙酮酸。",
      stereochemistry: ["PEP：C2=C3 烯醇磷酸；磷酰基即将离去（磷酰基转移发生在磷原子上，C2=C3 保持）"],
      highlightResidues: [],
      assetUrl: "/assets/structures/gk-10/frame-f0.json",
      cornerNote: "人 PKL · D499N 突变体 · 6NN4 实测",
      boundaryNote:
        "跨步 · PEP 换手：第 9 步产物 PEP（3UCD）释出，进入第 10 步丙酮酸激酶；6NN4（人）→ 同分子（人→人）10 重原子全同名 Kabsch 对齐（RMSD 见报脚）。",
      transitionFromPrev: {
        kind: "crossStep",
        note: "同一分子换结构：3UCD（人 ENO2）→ 6NN4（人 PKL D499N）——同分子配体级对齐，画面位置连续是视角对齐的结果。",
      },
    },
    {
      frameId: "gk-10-f1",
      stepId: "gk-10",
      stepIndex: 10,
      role: "apo",
      pdbId: "6NN5",
      species: "Homo sapiens",
      resolution: 2.26,
      ligandCodes: [],
      caption:
        "apo 空口袋（真 3D）：6NN5（人 PKLR，2.26 Å）——与 holo（6NN4）同酶（PKLR）、同物种（人），可直接并置；6NN5 为野生型 Asp499，但含 H527W 结晶工程突变（非催化残基，如实注明）；结晶添加物 GOL/EDO 不入画。",
      stereochemistry: [],
      highlightResidues: [],
      assetUrl: "/assets/structures/gk-10/frame-f1.json",
      cornerNote: "人 PKLR · 同酶同物种 · 6NN5 apo（H527W 已注明）",
      transitionFromPrev: {
        kind: "entry",
        note: "PEP 进入口袋前：apo（6NN5）与 holo（6NN4）同酶同物种，Cα Kabsch 后口袋残基直接可比。",
      },
    },
    {
      frameId: "gk-10-f2",
      stepId: "gk-10",
      stepIndex: 10,
      role: "bound",
      pdbId: "6NN4",
      species: "Homo sapiens",
      resolution: 2.15,
      ligandCodes: ["PEP", "FBP"],
      caption:
        "结合态：PEP 在 PK 活性位点（6NN4 实测）。D499N 突变体——突变体事实标注不隐去：Asn499 位于 FBP 别构位点边缘（8.9 Å）、距活性位点 PEP 43 Å，突变经变构界面锁定构象以稳定 PEP 结合，不直接接触底物。FBP（别构激活剂）共结晶于 36.6 Å 远端变构位点，超出画幅不入画。器官变体说明：帧带不支持 organ 参数切换，肌型 PKM2 的替代帧（3BJF，OXL 草酸为 PEP 类似物，标「类似物 · 非真实底物」）未入带——如需肌视图请看步骤页内嵌 3D。",
      stereochemistry: ["PEP 结合构象：磷酰基朝向 ADP 位（本结构未建模 ADP）"],
      highlightResidues: [],
      assetUrl: "/assets/structures/gk-10/frame-f2.json",
      cornerNote: "人 PKL · D499N 突变体 · 结合态实测",
      transitionFromPrev: {
        kind: "entry",
        note: "PEP 入位（实测）；催化 waiting ADP——ADP 未建模，磷酰基转移化学以后续 2D 帧承接。",
      },
    },
    {
      frameId: "gk-10-f3",
      stepId: "gk-10",
      stepIndex: 10,
      role: "product",
      pdbId: null,
      ligandCodes: [],
      renderMode: "2d",
      caption:
        "产物丙酮酸：2D 结构式帧——6NN4 无丙酮酸坐标、ADP 未建模，PDB 亦无可信产物态，按统一规则以 2D 呈现，不用计算构象假装 3D。PK 直接产物为烯醇式丙酮酸，自发互变异构为酮式（图示酮式终态）。",
      stereochemistry: ["丙酮酸：CH₃–C(=O)–COO⁻；C1 羧酸根为第 5–9 步保住的碳骨架端基"],
      highlightResidues: [],
      assetUrl: "/assets/structures/2d/pyruvate.json",
      cornerNote: "2D 结构式 · 无实验三维坐标",
      transitionFromPrev: {
        kind: "diff",
        note: "磷酰基已转移给 ADP（生成 ATP）：PEP 的 C2=C3 烯醇断开磷酯键，烯醇式丙酮酸互变异构为酮式——糖酵解十步收尾。",
      },
    },
  ],
};

export const FRAME_SEQUENCES: Record<string, FrameSequence> = {
  glycolysis: glycolysisFrameSequence,
};

/**
 * DEMO 占位帧：验证 2D 结构式渲染路径用，**不进入正式帧序列**。
 * 访问方式：/structures/glycolysis?frame=demo-2d（页面特殊处理，仅主舞台呈现）。
 */
export const DEMO_FRAME_2D: StructureFrame = {
  frameId: "demo-2d",
  stepId: "demo",
  stepIndex: 0,
  role: "substrate",
  pdbId: null,
  ligandCodes: ["GAP"],
  renderMode: "2d",
  caption:
    "DEMO 占位帧：验证「2D 结构式帧」渲染路径（纸白底 + 线描结构式 + 立体化学标注）。此帧不属于正式帧序列，仅用于冒烟断言。",
  stereochemistry: ["示例：D-GAP C2=R（实楔=朝向观察者）"],
  highlightResidues: [],
  assetUrl: "/assets/structures/2d/demo-gap.json",
  cornerNote: "DEMO · 2D 渲染路径验证 · 不在正式序列",
  transitionFromPrev: null,
};

/** 第 2 步接入方式：glycolysisFrameSequence.frames.push(...gk2Frames) */
export const framesForStep = (seq: FrameSequence, stepId: string) =>
  seq.frames.filter((f) => f.stepId === stepId);
