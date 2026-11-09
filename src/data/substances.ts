// ============================================================
// substances —— 「常见物质」模块目录与占位内容
//
// 六类分区按教材口径列条目：已有简介档案的条目直接指向 /molecule/:id，
// 尚无档案的先指向 /substance/:id 骨架页，页面明确标注「内容整理中」。
// 目前只有维生素 A、维生素 C、蔗糖三条写满四段；其余条目只给一句话定位，
// 不写剂量、不写页码、不写真题年份。
// ============================================================

export type SubstanceCategoryId =
  | "sugars"
  | "lipids"
  | "amino"
  | "nucleotides"
  | "vitamins"
  | "hormones";

export interface SubstanceSectionContent {
  title: string;
  body: string;
}

export interface SubstanceDossier {
  /** 判断句主标题 */
  claim: string;
  /** 教材常见别名（至少一条） */
  aliases: string[];
  classification: string;
  structure: string;
  position: SubstanceSectionContent;
  origin: SubstanceSectionContent;
  significance: SubstanceSectionContent;
  exam: { title: string; items: string[] };
  sources: string[];
  /** 仅指向站内已存在的档案或通路，不写幽灵链接 */
  related?: { label: string; to: string }[];
}

export interface SubstanceEntry {
  /** 条目页路由 id（已有档案条目仍保留，便于反查） */
  id: string;
  name: string;
  /** 教材口径的一句话定位，不写数字 */
  summary: string;
  /** 已收录的 114 条简介档案 id */
  moleculeId?: string;
  /** 只有三条完整内容，其余留空表示「内容整理中」 */
  dossier?: SubstanceDossier;
}

export interface SubstanceCategory {
  id: SubstanceCategoryId;
  name: string;
  en: string;
  intro: string;
  entries: SubstanceEntry[];
}

const cAMP_ENTRY: SubstanceEntry = {
  id: "camp",
  name: "cAMP",
  summary: "环腺苷酸，激素信号转导的经典第二信使。",
  moleculeId: "camp",
};

const VITAMIN_A: SubstanceDossier = {
  claim: "维生素 A 是视觉循环与上皮分化必需的脂溶性辅因子",
  aliases: ["视黄醇", "抗干眼病维生素"],
  classification: "脂溶性维生素；视黄醇、视黄醛、视黄酸及其酯",
  structure:
    "含 β-紫罗兰酮环与共轭多烯侧链；11-顺视黄醛是视紫红质的发色团。",
  position: {
    title: "它把光信号变成神经冲动，也维持上皮完整性",
    body:
      "视网膜视杆细胞的视紫红质由视蛋白与 11-顺视黄醛结合；光激发后视黄醛异构为全反式，触发光转导级联。视黄酸还参与上皮细胞分化与免疫调节，是维持角膜与呼吸道上皮完整性的必需信号。",
  },
  origin: {
    title: "它从动物性食物与 β-胡萝卜素来，主要在肝储存",
    body:
      "视黄酯在肠道水解成视黄醇，随乳糜微粒经淋巴入血；β-胡萝卜素在肠黏膜裂解生成视黄醛，再还原为视黄醇。肝星状细胞储存视黄酯，需要时经视黄醇结合蛋白运往靶组织；脂类吸收障碍时也会不足。",
  },
  significance: {
    title: "缺乏先影响暗适应，过量则伤肝并致畸",
    body:
      "缺乏时暗适应下降，进一步出现夜盲、结膜干燥与角膜软化；儿童缺乏还影响生长与免疫。长期过量摄入可致肝损伤、骨痛与致畸，脂溶性维生素不宜盲目补充，因此补充应控制在安全范围。",
  },
  exam: {
    title: "考点是视紫红质、11-顺视黄醛与缺乏表现",
    items: [
      "11-顺视黄醛与视蛋白结合形成视紫红质，光异构化后变为全反式。",
      "维生素 A 缺乏最早表现为暗适应下降与夜盲。",
      "β-胡萝卜素是维生素 A 原，裂解后生成视黄醛。",
      "视黄酸参与上皮分化，缺乏可致角膜软化。",
    ],
  },
  sources: [
    "Lehninger Principles of Biochemistry, 8e, 脂溶性维生素与视觉循环相关章节",
    "王镜岩《生物化学》第三版, 维生素与辅酶相关章节",
  ],
};

const VITAMIN_C: SubstanceDossier = {
  claim: "维生素 C 是胶原羟化与抗氧化防御的水溶性辅因子",
  aliases: ["抗坏血酸", "L-抗坏血酸"],
  classification: "水溶性维生素；抗坏血酸及其氧化型脱氢抗坏血酸",
  structure:
    "含烯二醇内酯结构，易给出电子而被氧化；水溶性强，体内不大量储存。",
  position: {
    title: "它让胶原三螺旋稳定，也给自由基供电子",
    body:
      "脯氨酸与赖氨酸羟化酶以抗坏血酸和 Fe²⁺ 为辅因子；羟化后的胶原才能形成稳定三螺旋。抗坏血酸还清除自由基、保护膜脂与蛋白，并把食物中的 Fe³⁺ 还原为易吸收的 Fe²⁺。",
  },
  origin: {
    title: "它从植物性食物来，人体不能自身合成",
    body:
      "植物与多数动物可合成抗坏血酸；人缺少古洛糖酸内酯氧化酶，不能自身合成，必须从新鲜果蔬摄入。小肠吸收，过量主要经肾排出；储存与烹调会损失部分抗坏血酸，因此新鲜果蔬更可靠。",
  },
  significance: {
    title: "缺乏导致坏血病，表现为出血与愈合不良",
    body:
      "缺乏时胶原成熟受阻，出现牙龈出血、皮下瘀斑、伤口愈合不良与毛细血管脆性增加，即坏血病。长期不足还影响骨与结缔组织；过量补充可致胃肠不适与草酸盐负荷增加，缺乏者需及时补充新鲜果蔬。",
  },
  exam: {
    title: "考点是烯二醇、脯氨酸羟化与坏血病",
    items: [
      "烯二醇结构决定其还原性，氧化后变为脱氢抗坏血酸。",
      "脯氨酸羟化酶以抗坏血酸和 Fe²⁺ 为辅因子，缺乏时胶原成熟受阻。",
      "人体不能合成维生素 C，因为缺少古洛糖酸内酯氧化酶。",
      "坏血病的典型表现是牙龈出血与伤口愈合差。",
    ],
  },
  sources: [
    "Lehninger Principles of Biochemistry, 8e, 水溶性维生素与胶原相关章节",
    "王镜岩《生物化学》第三版, 维生素与辅酶相关章节",
  ],
};

const SUCROSE: SubstanceDossier = {
  claim: "蔗糖是葡萄糖与果糖组成的非还原二糖，是植物主要运输糖",
  aliases: ["食糖", "白糖"],
  classification: "二糖；α-D-葡萄糖与 β-D-果糖",
  structure:
    "葡萄糖 C1 与果糖 C2 以 α-1,2-糖苷键相连，两个异头碳都参与成键，因此没有还原性。",
  position: {
    title: "它在植物里运输，在肠道里被水解后进入糖酵解",
    body:
      "植物把光合产物装成蔗糖运输；人体小肠刷状缘蔗糖酶把它水解为葡萄糖与果糖，两种单糖随后分别进入糖酵解。蔗糖本身没有独立代谢通路，不能当作糖酵解中间物，蔗糖水解产生的果糖主要在肝内代谢。",
  },
  origin: {
    title: "它从甘蔗与甜菜来，消化后经门静脉入肝",
    body:
      "甘蔗与甜菜积累蔗糖，是食糖的主要来源；食用后蔗糖酶在小肠把它水解，葡萄糖与果糖经门静脉入肝。果糖主要在肝内磷酸化，再经醛缩酶裂解进入糖酵解，因此蔗糖负荷主要落在肝。",
  },
  significance: {
    title: "它是膳食添加糖的主要形式，负荷落在果糖代谢",
    body:
      "蔗糖是日常添加糖的主要来源，大量摄入与能量过剩、果糖代谢负荷相关，长期过量还增加龋齿风险。蔗糖酶缺乏较少见，更多见的是乳糖酶缺乏，两者不要混淆，控制添加糖有助于减轻肝脂合成压力。",
  },
  exam: {
    title: "考点是非还原糖、蔗糖酶与水解产物",
    items: [
      "蔗糖是非还原糖，因为葡萄糖 C1 与果糖 C2 都参与糖苷键。",
      "蔗糖酶水解蔗糖生成葡萄糖与果糖。",
      "蔗糖水解产生的果糖在肝内进入糖酵解。",
      "蔗糖无独立代谢步骤，不能把它当作糖酵解中间物。",
    ],
  },
  sources: [
    "Lehninger Principles of Biochemistry, 8e, 碳水化合物相关章节",
    "王镜岩《生物化学》第三版, 糖类化学与糖代谢相关章节",
  ],
};

export const SUBSTANCE_CATEGORIES: SubstanceCategory[] = [
  {
    id: "sugars",
    name: "糖类",
    en: "CARBOHYDRATES",
    intro: "单糖、二糖与多糖；只收教材单独成条的糖，已有档案的进入简介页。",
    entries: [
      {
        id: "glc",
        name: "葡萄糖",
        summary: "血糖的主要形式，糖酵解与糖异生的中心单糖。",
        moleculeId: "glc",
      },
      {
        id: "fructose",
        name: "果糖",
        summary: "己糖的一种，经果糖-1-磷酸进入糖酵解旁路。",
      },
      {
        id: "galactose",
        name: "半乳糖",
        summary: "乳糖的组成单糖，经 Leloir 途径转为葡萄糖-1-磷酸。",
      },
      {
        id: "ribose",
        name: "核糖",
        summary: "戊糖，RNA 与核苷酸骨架的糖组分。",
      },
      {
        id: "deoxyribose",
        name: "脱氧核糖",
        summary: "DNA 的糖组分，2′-位脱氧。",
      },
      {
        id: "sucrose",
        name: "蔗糖",
        summary: "葡萄糖与果糖组成的二糖，植物主要运输糖。",
        dossier: SUCROSE,
      },
      {
        id: "lactose",
        name: "乳糖",
        summary: "葡萄糖与半乳糖组成的二糖，哺乳动物乳汁中的糖。",
      },
      {
        id: "maltose",
        name: "麦芽糖",
        summary: "两个葡萄糖以 α-1,4 键相连的二糖，淀粉水解产物。",
      },
      {
        id: "starch",
        name: "淀粉",
        summary: "植物储存多糖，消化后提供葡萄糖。",
      },
      {
        id: "cellulose",
        name: "纤维素",
        summary: "β-1,4 葡聚糖，人体不消化，作为膳食纤维。",
      },
      {
        id: "glycogen",
        name: "糖原",
        summary: "动物储存多糖，肝与肌的葡萄糖库。",
        moleculeId: "glycogen",
      },
      {
        id: "glycosaminoglycan",
        name: "糖胺聚糖",
        summary: "氨基糖与糖醛酸重复单元构成的细胞外基质多糖。",
      },
      {
        id: "sialic-acid",
        name: "唾液酸",
        summary: "九碳羧酸糖，常位于糖蛋白与糖脂末端。",
      },
    ],
  },
  {
    id: "lipids",
    name: "脂类",
    en: "LIPIDS",
    intro: "脂肪酸、甘油酯、磷脂、鞘脂、胆固醇与类花生酸；碳链长度按教材条目分列。",
    entries: [
      {
        id: "fa",
        name: "软脂酸（棕榈酸）",
        summary: "C16 饱和脂肪酸，脂肪酸合成与 β-氧化的代表底物。",
        moleculeId: "fa",
      },
      {
        id: "stearic-acid",
        name: "硬脂酸",
        summary: "C18 饱和脂肪酸，长链饱和脂肪酸的一种。",
      },
      {
        id: "oleic-acid",
        name: "油酸",
        summary: "C18 单不饱和脂肪酸，含一个顺式双键。",
      },
      {
        id: "linoleic-acid",
        name: "亚油酸",
        summary: "C18 二不饱和必需脂肪酸，哺乳动物不能自身合成。",
      },
      {
        id: "linolenic-acid",
        name: "亚麻酸",
        summary: "C18 三不饱和必需脂肪酸。",
      },
      {
        id: "arachidonic-acid",
        name: "花生四烯酸",
        summary: "C20 多不饱和脂肪酸，类花生酸合成的前体。",
      },
      {
        id: "triglyceride",
        name: "甘油三酯",
        summary: "甘油与三分子脂肪酸酯化形成的储能脂。",
      },
      {
        id: "pc",
        name: "磷脂酰胆碱",
        summary: "胆碱为头基的甘油磷脂，膜脂与脂蛋白的主要成分。",
      },
      {
        id: "pe",
        name: "磷脂酰乙醇胺",
        summary: "乙醇胺为头基的甘油磷脂，膜脂的重要成分。",
      },
      {
        id: "ps",
        name: "磷脂酰丝氨酸",
        summary: "丝氨酸为头基的甘油磷脂，膜内侧参与信号。",
      },
      {
        id: "pi-lipid",
        name: "磷脂酰肌醇",
        summary: "肌醇为头基的甘油磷脂，可被磷脂酶 C 水解生成 IP3 与 DAG。",
      },
      {
        id: "sphingosine",
        name: "鞘氨醇",
        summary: "鞘脂的骨架氨基醇。",
      },
      {
        id: "sphingolipid",
        name: "鞘脂",
        summary: "以鞘氨醇为骨架的脂类，包括神经酰胺与鞘磷脂。",
      },
      {
        id: "cardiolipin",
        name: "心磷脂",
        summary: "双磷脂酰甘油，线粒体内膜的特征性磷脂。",
      },
      {
        id: "ceramide",
        name: "神经酰胺",
        summary: "鞘氨醇的 N-酰化产物，鞘脂合成与信号转导的中心中间物。",
      },
      {
        id: "cholesterol",
        name: "胆固醇",
        summary: "动物细胞膜的甾醇，也是胆汁酸与类固醇激素前体。",
        moleculeId: "cholesterol",
      },
      {
        id: "bile-acid",
        name: "胆汁酸",
        summary: "胆固醇在肝内转化成的两亲性分子，帮助脂类消化吸收。",
      },
      {
        id: "prostaglandin",
        name: "前列腺素",
        summary: "花生四烯酸经环加氧酶生成的前列腺烷类信号分子。",
      },
      {
        id: "leukotriene",
        name: "白三烯",
        summary: "花生四烯酸经脂加氧酶生成的信号分子。",
      },
      {
        id: "acetoacetate",
        name: "乙酰乙酸",
        summary: "酮体之一，肝线粒体生成并释放入血。",
      },
      {
        id: "beta-hydroxybutyrate",
        name: "β-羟丁酸",
        summary: "酮体之一，主要经 β-羟丁酸脱氢酶互变。",
      },
      {
        id: "acetone",
        name: "丙酮",
        summary: "酮体之一，由乙酰乙酸脱羧生成，主要经呼气排出。",
      },
      {
        id: "chylomicron",
        name: "乳糜微粒",
        summary: "颗粒，不是单一分子；小肠组装的外源脂类运输颗粒，表面带 ApoB-48。",
      },
      {
        id: "vldl",
        name: "VLDL",
        summary: "颗粒，不是单一分子；肝分泌的内源 TG 运输颗粒，表面带 ApoB-100。",
      },
      {
        id: "ldl-cholesterol",
        name: "LDL",
        summary: "颗粒，不是单一分子；胆固醇酯富集的脂蛋白颗粒，经 LDLR 进入细胞。",
      },
      {
        id: "hdl",
        name: "HDL",
        summary: "颗粒，不是单一分子；参与逆向胆固醇转运的脂蛋白颗粒，表面带 ApoA-I。",
      },
    ],
  },
  {
    id: "amino",
    name: "蛋白质与氨基酸",
    en: "PROTEINS & AMINO ACIDS",
    intro: "20 种标准氨基酸全部已有简介档案；蛋白质/多肽大分子不在本模块收录范围。",
    entries: [
      { id: "ala", name: "丙氨酸", summary: "生糖氨基酸，葡萄糖-丙氨酸循环的载体。", moleculeId: "ala" },
      { id: "urea-arg", name: "精氨酸", summary: "碱性氨基酸，尿素循环中生成尿素的直接前体。", moleculeId: "urea-arg" },
      { id: "asn", name: "天冬酰胺", summary: "酰胺侧链氨基酸，参与氮的储存与转运。", moleculeId: "asn" },
      { id: "urea-asp", name: "天冬氨酸", summary: "酸性氨基酸，尿素循环第二个氮的供体。", moleculeId: "urea-asp" },
      { id: "cys", name: "半胱氨酸", summary: "含巯基氨基酸，谷胱甘肽与二硫键的原料。", moleculeId: "cys" },
      { id: "gln", name: "谷氨酰胺", summary: "酰胺侧链氨基酸，氨的运输与储存形式。", moleculeId: "gln" },
      { id: "glu", name: "谷氨酸", summary: "酸性氨基酸，转氨与氧化脱氨的枢纽。", moleculeId: "glu" },
      { id: "gly", name: "甘氨酸", summary: "最小氨基酸，血红素与嘌呤合成的原料。", moleculeId: "gly" },
      { id: "his", name: "组氨酸", summary: "咪唑侧链氨基酸，组胺与一碳单位相关。", moleculeId: "his" },
      { id: "ile", name: "异亮氨酸", summary: "支链氨基酸，生糖兼生酮。", moleculeId: "ile" },
      { id: "leu", name: "亮氨酸", summary: "支链氨基酸，纯生酮。", moleculeId: "leu" },
      { id: "lys", name: "赖氨酸", summary: "碱性氨基酸，纯生酮。", moleculeId: "lys" },
      { id: "met", name: "甲硫氨酸", summary: "含硫氨基酸，SAM 与一碳单位的供体。", moleculeId: "met" },
      { id: "hcy", name: "同型半胱氨酸", summary: "甲硫氨酸循环的中间产物，可经甲基化回甲硫氨酸。", moleculeId: "hcy" },
      { id: "sam", name: "SAM", summary: "S-腺苷甲硫氨酸，体内最主要的甲基供体。" },
      { id: "sah", name: "SAH", summary: "S-腺苷同型半胱氨酸，SAM 供甲基后的产物。" },
      { id: "phe", name: "苯丙氨酸", summary: "芳香族氨基酸，羟化为酪氨酸。", moleculeId: "phe" },
      { id: "pro", name: "脯氨酸", summary: "环状亚氨基酸，胶原中经羟化。", moleculeId: "pro" },
      { id: "ser", name: "丝氨酸", summary: "含羟基氨基酸，一碳单位与磷脂原料。", moleculeId: "ser" },
      { id: "thr", name: "苏氨酸", summary: "含羟基氨基酸，生糖兼生酮。", moleculeId: "thr" },
      { id: "trp", name: "色氨酸", summary: "吲哚环氨基酸，血清素与烟酸的前体。", moleculeId: "trp" },
      { id: "tyr", name: "酪氨酸", summary: "芳香族氨基酸，儿茶酚胺与甲状腺激素前体。", moleculeId: "tyr" },
      { id: "val", name: "缬氨酸", summary: "支链氨基酸，生糖。", moleculeId: "val" },
    ],
  },
  {
    id: "nucleotides",
    name: "核酸与核苷酸",
    en: "NUCLEOTIDES & NUCLEIC ACIDS",
    intro: "核苷酸、环核苷酸与核酸大分子；RNA/DNA 只作条目占位，不展开聚合过程。",
    entries: [
      { id: "atp", name: "ATP", summary: "细胞的通用能量货币，磷酸酐键水解释能。", moleculeId: "atp" },
      { id: "utp", name: "UTP", summary: "尿苷三磷酸，RNA 合成与糖原 UDP-葡萄糖的供体。", moleculeId: "utp" },
      { id: "gtp", name: "GTP", summary: "鸟苷三磷酸，糖异生 PEPCK 与翻译等过程的供能分子。" },
      { id: "ctp", name: "CTP", summary: "RNA 合成底物；胞苷酰基载体：与磷酸胆碱/磷酸乙醇胺缩合生成 CDP-胆碱/CDP-乙醇胺并释放 PPi；ATP 用于胆碱/乙醇胺的磷酸化。" },
      { id: "amp", name: "AMP", summary: "腺苷一磷酸，ATP 水解后的低能形式。", moleculeId: "amp" },
      { id: "adp", name: "ADP", summary: "腺苷二磷酸，ATP 与 AMP 之间的中间形式。", moleculeId: "adp" },
      { id: "imp", name: "IMP", summary: "次黄苷酸，嘌呤从头合成的中心产物，AMP 与 GMP 的共同前体。" },
      { id: "gmp", name: "GMP", summary: "鸟苷一磷酸，RNA 的组成单位，由 IMP 经 XMP 生成。" },
      { id: "xmp", name: "XMP", summary: "黄苷酸，IMP 氧化后的中间物，GMP 的直接前体。" },
      { id: "adenosine", name: "腺苷", summary: "腺嘌呤与核糖组成的核苷，甲硫氨酸循环的副产物之一。" },
      cAMP_ENTRY,
      { id: "damp", name: "dAMP", summary: "脱氧腺苷一磷酸，DNA 的组成单位。" },
      { id: "dgmp", name: "dGMP", summary: "脱氧鸟苷一磷酸，DNA 的组成单位。" },
      { id: "rna", name: "RNA", summary: "核糖核酸，参与转录与翻译的大分子。" },
      { id: "dna", name: "DNA", summary: "脱氧核糖核酸，遗传信息的载体。" },
    ],
  },
  {
    id: "vitamins",
    name: "维生素与辅因子",
    en: "VITAMINS & COFACTORS",
    intro: "13 种维生素本体与常见辅因子形式分开列；已有辅因子档案的条目直接进简介页。",
    entries: [
      { id: "vit-a", name: "维生素 A", summary: "脂溶性维生素，视觉循环与上皮分化必需。", dossier: VITAMIN_A },
      { id: "vit-d", name: "维生素 D", summary: "脂溶性维生素，调节钙磷代谢与骨矿化。" },
      { id: "vit-e", name: "维生素 E", summary: "脂溶性维生素，主要作为抗氧化剂保护膜脂。" },
      { id: "vit-k", name: "维生素 K", summary: "脂溶性维生素，参与凝血因子与骨蛋白的 γ-羧化。" },
      { id: "vit-b1", name: "维生素 B1", summary: "水溶性维生素，活性形式 TPP 参与脱羧与转酮。" },
      { id: "vit-b2", name: "维生素 B2", summary: "水溶性维生素，活性形式 FAD/FMN 参与氧化还原。" },
      { id: "vit-b3", name: "维生素 B3", summary: "水溶性维生素，活性形式 NAD/NADP 参与氧化还原。" },
      { id: "vit-b5", name: "维生素 B5", summary: "水溶性维生素，辅酶 A 的组成成分。" },
      { id: "vit-b6", name: "维生素 B6", summary: "水溶性维生素，活性形式 PLP 参与转氨与脱羧。" },
      { id: "vit-b7", name: "维生素 B7", summary: "水溶性维生素，羧化酶的辅基。" },
      { id: "vit-b9", name: "维生素 B9", summary: "水溶性维生素，活性形式 THF 参与一碳单位转移。" },
      { id: "vit-b12", name: "维生素 B12", summary: "水溶性维生素，参与甲基丙二酰-CoA 与甲硫氨酸代谢。" },
      { id: "vit-c", name: "维生素 C", summary: "水溶性维生素，抗氧化与胶原羟化辅因子。", dossier: VITAMIN_C },
      { id: "tpp", name: "TPP", summary: "硫胺素焦磷酸，脱羧酶与转酮酶的辅因子。" },
      { id: "fad", name: "FAD", summary: "黄素腺嘌呤二核苷酸，氧化还原反应的电子载体。", moleculeId: "fad" },
      { id: "fadh2", name: "FADH₂", summary: "FAD 的还原形式，把电子交给呼吸链。", moleculeId: "fadh2" },
      { id: "fmn", name: "FMN", summary: "黄素单核苷酸，复合体 I 等黄素蛋白的辅基。" },
      { id: "nad", name: "NAD", summary: "烟酰胺腺嘌呤二核苷酸，氧化还原的电子载体。", moleculeId: "nad" },
      { id: "nadh", name: "NADH", summary: "NAD 的还原形式，主要把电子交给呼吸链。", moleculeId: "nadh" },
      { id: "nadp", name: "NADP", summary: "烟酰胺腺嘌呤二核苷酸磷酸，合成代谢的电子载体。", moleculeId: "nadp" },
      { id: "nadph", name: "NADPH", summary: "NADP 的还原形式，合成代谢的还原力。", moleculeId: "nadph" },
      { id: "coa", name: "CoA", summary: "泛酸构成的辅酶，酰基载体。", moleculeId: "coa" },
      { id: "biotin", name: "生物素", summary: "羧化酶的共价辅基，参与羧化反应。" },
      { id: "thf", name: "THF", summary: "四氢叶酸，一碳单位的载体。" },
      { id: "plp", name: "PLP", summary: "磷酸吡哆醛，转氨酶与脱羧酶的辅因子。" },
    ],
  },
  {
    id: "hormones",
    name: "激素与信号分子",
    en: "HORMONES & SIGNALS",
    intro: "血糖调控激素与第二信使；cAMP 在核酸类已出现一次，这里按信号分子再次列出。",
    entries: [
      { id: "insulin", name: "胰岛素", summary: "胰岛 β 细胞分泌的降血糖激素。" },
      { id: "glucagon", name: "胰高血糖素", summary: "胰岛 α 细胞分泌的升血糖激素。" },
      { id: "epinephrine", name: "肾上腺素", summary: "肾上腺髓质分泌的儿茶酚胺，应激时升高血糖。" },
      { id: "norepinephrine", name: "去甲肾上腺素", summary: "儿茶酚胺类神经递质与激素。" },
      { id: "cortisol", name: "皮质醇", summary: "肾上腺皮质激素，促进糖异生。" },
      cAMP_ENTRY,
      { id: "ip3", name: "IP3", summary: "肌醇三磷酸，磷脂酰肌醇信号通路的水溶性第二信使。" },
      { id: "dag", name: "DAG", summary: "二酰甘油，磷脂酰肌醇信号通路的脂溶性第二信使。" },
      { id: "no", name: "NO", summary: "一氧化氮，血管舒张与神经信号的气体信使。" },
    ],
  },
];

export const ALL_SUBSTANCES: SubstanceEntry[] = SUBSTANCE_CATEGORIES.flatMap((category) => category.entries);

/** 条目路由用：同名条目（如 cAMP）保留第一次出现的对象即可 */
export const substanceById = new Map<string, SubstanceEntry>();
for (const entry of ALL_SUBSTANCES) {
  if (!substanceById.has(entry.id)) substanceById.set(entry.id, entry);
}

export const SUBSTANCE_COUNTS: Record<SubstanceCategoryId, number> = {
  sugars: SUBSTANCE_CATEGORIES[0].entries.length,
  lipids: SUBSTANCE_CATEGORIES[1].entries.length,
  amino: SUBSTANCE_CATEGORIES[2].entries.length,
  nucleotides: SUBSTANCE_CATEGORIES[3].entries.length,
  vitamins: SUBSTANCE_CATEGORIES[4].entries.length,
  hormones: SUBSTANCE_CATEGORIES[5].entries.length,
};

export const SUBSTANCE_TOTAL = ALL_SUBSTANCES.length;

// ============================================================
// 补充档案（分批补齐）：按 id 挂到尚未收录的条目上。
// 已有 moleculeId 的条目不再写第二条，只通过 related 互链。
// ============================================================
const DOSSIERS: Record<string, SubstanceDossier> = {
  // -------------------------- 糖类 --------------------------
  fructose: {
    claim: "果糖是主要经果糖-1-磷酸旁路进入糖酵解的己糖",
    aliases: ["左旋糖", "levulose"],
    classification: "单糖；己糖（己酮糖）",
    structure: "与葡萄糖同为六碳糖，C2 为酮基；游离状态常成吡喃环或呋喃环。",
    position: {
      title: "它在肝内走果糖-1-磷酸旁路",
      body: "肝细胞果糖激酶把果糖磷酸化为果糖-1-磷酸，再由醛缩酶 B 裂解成甘油醛与磷酸二羟丙酮，绕过磷酸果糖激酶这一调控点；肌肉等组织则经己糖激酶生成果糖-6-磷酸。本平台未建果糖-1-磷酸旁路。",
    },
    origin: {
      title: "它来自蔗糖与水果，也可由山梨醇生成",
      body: "膳食中的蔗糖在肠内水解后释放果糖，水果与蜂蜜提供游离果糖，肝内山梨醇途径也能把葡萄糖转为果糖。吸收后主要经门静脉入肝，部分供外周组织利用；过量摄入时肝内代谢负荷明显上升。",
    },
    significance: {
      title: "大量摄入加重肝脂合成，遗传缺陷则低血糖",
      body: "果糖在肝内快速进入脂质合成，长期过量与脂肪肝、胰岛素抵抗相关；遗传性果糖不耐受者醛缩酶 B 缺陷，摄入果糖后出现低血糖、呕吐与肝损伤，必须避免含果糖与蔗糖的食物。",
    },
    exam: {
      title: "考点是旁路入口、醛缩酶 B 与不耐受",
      items: [
        "果糖激酶在肝内催化果糖生成果糖-1-磷酸，这一步不受磷酸果糖激酶的能荷调控。",
        "醛缩酶 B 把果糖-1-磷酸裂解为甘油醛与磷酸二羟丙酮。",
        "遗传性果糖不耐受由醛缩酶 B 缺陷引起，摄入果糖后出现低血糖。",
        "果糖也可经己糖激酶生成果糖-6-磷酸，直接进入糖酵解。",
      ],
    },
    sources: [
      "Lehninger Principles of Biochemistry, 8e, 碳水化合物与糖代谢相关章节",
      "王镜岩《生物化学》第三版, 糖类化学与糖代谢相关章节",
    ],
    related: [{ label: "糖酵解", to: "/pathway/glycolysis" }],
  },
  galactose: {
    claim: "半乳糖必须经 Leloir 途径转为葡萄糖-1-磷酸才能进入糖代谢",
    aliases: ["D-半乳糖", "galactose"],
    classification: "单糖；己糖（己醛糖）",
    structure: "葡萄糖的 C4 差向异构体；乳糖与糖蛋白、糖脂糖链中的常见组分。",
    position: {
      title: "它在 Leloir 途径里换成 UDP-葡萄糖",
      body: "半乳糖激酶先把它磷酸化为半乳糖-1-磷酸，半乳糖-1-磷酸尿苷酰转移酶再与 UDP-葡萄糖交换生成 UDP-半乳糖，最后由 UDP-半乳糖-4-差向异构酶转为 UDP-葡萄糖。本平台未建 Leloir 途径。",
    },
    origin: {
      title: "它从乳糖来，也由 UDP-葡萄糖差向生成",
      body: "乳糖水解与乳制品是主要膳食来源；体内 UDP-葡萄糖经差向异构酶也能生成 UDP-半乳糖，供糖蛋白与糖脂的糖链合成。半乳糖摄入后主要在肝内代谢，红细胞也参与利用。",
    },
    significance: {
      title: "它缺失时表现为半乳糖血症",
      body: "半乳糖-1-磷酸尿苷酰转移酶缺陷导致半乳糖血症，表现为喂养困难、肝损伤与白内障；半乳糖激酶缺陷则主要引起白内障。治疗需限制乳糖与半乳糖，新生儿筛查可早期发现，早期干预能减轻智力损害。",
    },
    exam: {
      title: "考点是 Leloir 三步酶与半乳糖血症",
      items: [
        "Leloir 途径依次需要半乳糖激酶、半乳糖-1-磷酸尿苷酰转移酶与 UDP-半乳糖差向异构酶。",
        "半乳糖-1-磷酸尿苷酰转移酶缺陷是经典型半乳糖血症的主要原因。",
        "UDP-半乳糖是糖蛋白与糖脂糖链的半乳糖供体。",
        "半乳糖激酶缺陷主要引起白内障，不出现严重肝损伤。",
      ],
    },
    sources: [
      "Lehninger Principles of Biochemistry, 8e, 碳水化合物与糖代谢相关章节",
      "王镜岩《生物化学》第三版, 糖类化学与糖代谢相关章节",
    ],
    related: [{ label: "葡萄糖 · 物质简介", to: "/molecule/glc" }],
  },
  ribose: {
    claim: "核糖是 RNA 与核苷酸的戊糖骨架，其磷酸酯主要由磷酸戊糖途径供给",
    aliases: ["D-核糖", "ribose"],
    classification: "单糖；戊糖（戊醛糖）",
    structure: "五碳醛糖，核酸中为 β-D-呋喃核糖；C2′ 羟基在脱氧核糖中被氢取代。",
    position: {
      title: "它的磷酸酯从磷酸戊糖途径来",
      body: "核糖-5-磷酸由磷酸戊糖途径的氧化阶段与非氧化阶段生成，也可经转酮、转醛从糖酵解中间物重排得到；它随后用于合成 PRPP，供给嘌呤、嘧啶与 RNA 的骨架，这条途径同时把糖酵解中间物拉回戊糖池。",
    },
    origin: {
      title: "体内核糖靠磷酸戊糖途径供给",
      body: "体内核糖主要不靠食物直接补充，而由磷酸戊糖途径供给；核苷酸降解产生的核糖-1-磷酸也可进入补救合成。葡萄糖经磷酸戊糖途径生成核糖-5-磷酸是主要来源，因此核糖供应与血糖利用状态相连。",
    },
    significance: {
      title: "它决定核苷酸合成的原料供应",
      body: "磷酸戊糖途径既决定核糖供应，也决定 NADPH 供应；核糖不足会限制核苷酸从头合成，而 NADPH 不足影响还原性合成与抗氧化。核糖不是人体必需营养素，这也是肿瘤细胞代谢重编程的关注点。",
    },
    exam: {
      title: "考点是 R5P、PRPP 与转酮转醛",
      items: [
        "核糖-5-磷酸来自磷酸戊糖途径，是 PRPP 合成的直接前体。",
        "PRPP 参与嘌呤与嘧啶核苷酸的从头合成。",
        "转酮酶与转醛酶把糖酵解中间物重排为核糖-5-磷酸，不消耗 ATP。",
        "核糖与脱氧核糖的差别只在 C2′ 位是否带羟基。",
      ],
    },
    sources: [
      "Lehninger Principles of Biochemistry, 8e, 磷酸戊糖途径与核苷酸代谢相关章节",
      "王镜岩《生物化学》第三版, 糖代谢与核苷酸代谢相关章节",
    ],
    related: [{ label: "磷酸戊糖途径", to: "/pathway/ppp" }],
  },
  deoxyribose: {
    claim: "脱氧核糖是 DNA 的糖组分，其 2′-脱氧由核糖核苷酸还原酶催化",
    aliases: ["2′-脱氧核糖", "deoxyribose"],
    classification: "单糖；脱氧戊糖",
    structure: "核糖的 C2′ 羟基被氢取代；DNA 中为 β-D-2′-脱氧呋喃核糖，缺少 2′-羟基使双螺旋更稳定。",
    position: {
      title: "它以 dNTP 形式进入 DNA，不以游离糖代谢",
      body: "脱氧核糖不以游离糖参与代谢，而以 dNTP 形式进入 DNA 链；dNTP 由 NDP 经核糖核苷酸还原酶还原为 dNDP，再磷酸化生成。本平台未建核苷酸合成与核糖核苷酸还原酶通路。",
    },
    origin: {
      title: "它由核糖核苷酸还原生成",
      body: "体内脱氧核糖全部由核糖核苷酸还原生成，食物核酸消化后只能提供少量碱基与核苷；DNA 降解产生的脱氧核苷也可经补救合成回收，减少从头合成负担，这一回收途径能降低细胞对还原酶的依赖。",
    },
    significance: {
      title: "还原酶是 DNA 复制的限速环节",
      body: "还原酶活性受 ATP 与 dATP 调控，以维持四种 dNTP 的供应平衡；抑制该酶会阻断 DNA 复制，因此成为化疗与抗病毒治疗的靶点，正常细胞也会受到一定影响。",
    },
    exam: {
      title: "考点是 C2′、NDP 底物与反馈抑制",
      items: [
        "脱氧核糖与核糖的差别是 C2′ 位羟基被氢取代。",
        "核糖核苷酸还原酶的底物是 NDP，产物是 dNDP。",
        "dATP 反馈抑制还原酶，避免脱氧核苷酸过量。",
        "DNA 与 RNA 的糖组分不同，DNA 用脱氧核糖，RNA 用核糖。",
      ],
    },
    sources: [
      "Lehninger Principles of Biochemistry, 8e, 核苷酸代谢相关章节",
      "王镜岩《生物化学》第三版, 核苷酸代谢相关章节",
    ],
  },
  lactose: {
    claim: "乳糖是葡萄糖与半乳糖以 β-1,4 键相连的还原二糖",
    aliases: ["lactose", "乳糖"],
    classification: "二糖；半乳糖与葡萄糖",
    structure: "半乳糖 C1 与葡萄糖 C4 以 β-1,4-糖苷键连接；葡萄糖 C1 异头碳游离，因此具有还原性。",
    position: {
      title: "它靠乳糖酶拆成两种单糖",
      body: "小肠刷状缘乳糖酶把乳糖水解为葡萄糖与半乳糖，两种单糖分别进入糖代谢；半乳糖再经 Leloir 途径转为葡萄糖-1-磷酸。本平台未建乳糖水解与 Leloir 途径。",
    },
    origin: {
      title: "它由乳腺合成，乳汁是主要来源",
      body: "哺乳动物乳腺以葡萄糖与 UDP-半乳糖为原料合成乳糖，乳汁是主要膳食来源；发酵乳制品中部分乳糖已被菌群分解，因此乳糖含量低于鲜奶，乳糖含量也成为乳制品标签的常用指标。",
    },
    significance: {
      title: "乳糖酶缺乏引起渗透性腹泻",
      body: "乳糖酶缺乏时未水解的乳糖在结肠发酵，引起腹胀、腹泻与肠鸣；先天性半乳糖血症患者必须避免乳糖。乳糖不耐受与牛奶蛋白过敏是两回事，前者不涉及免疫反应，避免乳糖是半乳糖血症饮食治疗的核心。",
    },
    exam: {
      title: "考点是 β-1,4、还原性与乳糖酶",
      items: [
        "乳糖以 β-1,4-糖苷键连接半乳糖与葡萄糖，是还原糖。",
        "乳糖酶把乳糖水解为葡萄糖与半乳糖。",
        "乳糖合成酶利用 UDP-半乳糖作为半乳糖供体。",
        "乳糖不耐受由乳糖酶活性下降引起，不是免疫过敏。",
      ],
    },
    sources: [
      "Lehninger Principles of Biochemistry, 8e, 碳水化合物与糖代谢相关章节",
      "王镜岩《生物化学》第三版, 糖类化学相关章节",
    ],
    related: [{ label: "葡萄糖 · 物质简介", to: "/molecule/glc" }],
  },
  maltose: {
    claim: "麦芽糖是两个葡萄糖以 α-1,4 键相连的还原二糖，是淀粉水解的中间产物",
    aliases: ["maltose", "饴糖"],
    classification: "二糖；两个葡萄糖",
    structure: "两个 α-D-葡萄糖以 α-1,4-糖苷键连接，一端异头碳游离，故为还原糖。",
    position: {
      title: "它是淀粉消化的中间产物",
      body: "唾液与胰 α-淀粉酶把淀粉切为麦芽糖与麦芽三糖，小肠刷状缘麦芽糖酶再把它们水解为葡萄糖；葡萄糖经钠依赖转运体吸收后进入门静脉。本平台未建淀粉消化通路，肠腔中的麦芽糖几乎都来自淀粉。",
    },
    origin: {
      title: "它从淀粉水解与发芽谷物来",
      body: "淀粉水解与发芽谷物富含麦芽糖，饴糖由淀粉糖化制得；作为膳食二糖，麦芽糖在胃内几乎不被消化，主要在小肠上段完成水解，它很少作为独立食物大量摄入，多为淀粉类食物的伴随成分。",
    },
    significance: {
      title: "它通常只是消化过渡物",
      body: "麦芽糖酶缺乏罕见，未水解的麦芽糖在肠内发酵可引起腹泻；对多数人而言，麦芽糖只是淀粉消化的过渡产物，不会单独造成明显代谢负担，它的升糖作用最终由水解产生的葡萄糖决定。",
    },
    exam: {
      title: "考点是 α-1,4、还原端与淀粉酶",
      items: [
        "麦芽糖由两个葡萄糖以 α-1,4-糖苷键连接，具有还原性。",
        "α-淀粉酶把淀粉水解为麦芽糖与麦芽三糖。",
        "麦芽糖酶把麦芽糖水解为两分子葡萄糖。",
        "蔗糖是非还原二糖，麦芽糖是还原二糖，二者不要混淆。",
      ],
    },
    sources: [
      "Lehninger Principles of Biochemistry, 8e, 碳水化合物与糖代谢相关章节",
      "王镜岩《生物化学》第三版, 糖类化学相关章节",
    ],
    related: [{ label: "葡萄糖 · 物质简介", to: "/molecule/glc" }],
  },
  starch: {
    claim: "淀粉是植物储存的 α-葡聚糖，人体靠淀粉酶和麦芽糖酶把它拆成葡萄糖",
    aliases: ["starch", "淀粉"],
    classification: "多糖；α-D-葡萄糖聚合物",
    structure: "直链淀粉以 α-1,4 键连成螺旋，支链淀粉每隔一段加 α-1,6 分支；两者都不溶于冷水。",
    position: {
      title: "它从口腔开始被逐步水解",
      body: "口腔唾液淀粉酶与胰淀粉酶把淀粉水解为糊精和麦芽糖，小肠刷状缘酶完成最后水解；葡萄糖经小肠上皮吸收后进入门静脉，供全身利用。本平台未建淀粉消化通路，未在小肠消化的部分进入结肠。",
    },
    origin: {
      title: "它由植物光合产物储存而来",
      body: "谷物、薯类与豆类储存淀粉，植物把光合产物暂存为淀粉；人体摄入后由消化酶逐步拆解，未消化的抗性淀粉进入结肠被菌群发酵，精制米面去除了部分外层，抗性淀粉含量随之下降。",
    },
    significance: {
      title: "它是主食能量来源，也影响餐后血糖",
      body: "淀粉是主食能量的主要来源；抗性淀粉不被小肠消化，对餐后血糖影响较小。胰腺外分泌不足或淀粉酶活性下降时，淀粉消化会明显变差，与游离糖相比，淀粉的消化吸收更缓慢，对血糖更友好。",
    },
    exam: {
      title: "考点是 α-1,4、α-1,6 与淀粉酶",
      items: [
        "直链淀粉只有 α-1,4 键，支链淀粉另有 α-1,6 分支。",
        "唾液淀粉酶与胰淀粉酶把淀粉水解为糊精和麦芽糖。",
        "淀粉与纤维素都是葡萄糖聚合物，差别在 α 与 β 键型。",
        "糖原与支链淀粉结构相似，但糖原分支更密。",
      ],
    },
    sources: [
      "Lehninger Principles of Biochemistry, 8e, 碳水化合物与糖代谢相关章节",
      "王镜岩《生物化学》第三版, 糖类化学与糖代谢相关章节",
    ],
    related: [{ label: "葡萄糖 · 物质简介", to: "/molecule/glc" }],
  },
  cellulose: {
    claim: "纤维素是 β-1,4 葡聚糖，人体没有纤维素酶，因此不能消化它",
    aliases: ["cellulose", "膳食纤维"],
    classification: "多糖；β-D-葡萄糖聚合物",
    structure: "β-D-葡萄糖以 β-1,4 键连成直链，链间氢键使纤维束稳定；与淀粉的 α 键构型不同。",
    position: {
      title: "它不被人体酶水解，只作为膳食纤维",
      body: "人体消化道没有水解 β-1,4 糖苷键的酶，纤维素不被吸收，只作为膳食纤维增加肠内容物体积、影响通过时间与糖脂吸收。本平台未建该通路，它不提供葡萄糖，也不参与糖酵解。",
    },
    origin: {
      title: "它来自植物细胞壁",
      body: "纤维素是植物细胞壁的主要成分，蔬菜、全谷与豆类含量高；反刍动物依靠瘤胃微生物的纤维素酶分解它，人体没有相应的酶。精制加工会去除大部分膳食纤维，因此全谷比精制谷物保留更多纤维素。",
    },
    significance: {
      title: "它促进排便，但不提供能量",
      body: "膳食纤维促进排便、延缓葡萄糖吸收，过量则可能影响矿物质吸收；纤维素本身不提供能量，也不直接升高血糖。它还是结肠菌群发酵的底物，足量饮水与逐步增加摄入可减少腹胀。",
    },
    exam: {
      title: "考点是 β-1,4 与人体缺酶",
      items: [
        "纤维素由 β-D-葡萄糖以 β-1,4-糖苷键连接。",
        "人体没有纤维素酶，所以纤维素不能被消化吸收。",
        "淀粉是 α-1,4 葡聚糖，纤维素是 β-1,4 葡聚糖。",
        "反刍动物靠瘤胃微生物分解纤维素，不是自身分泌纤维素酶。",
      ],
    },
    sources: [
      "Lehninger Principles of Biochemistry, 8e, 碳水化合物相关章节",
      "王镜岩《生物化学》第三版, 糖类化学相关章节",
    ],
  },
  glycosaminoglycan: {
    claim: "糖胺聚糖是氨基糖与糖醛酸重复构成的细胞外基质多糖",
    aliases: ["GAG", "黏多糖"],
    classification: "多糖；糖胺聚糖",
    structure: "二糖重复单元含己糖胺与糖醛酸，多带负电；透明质酸、硫酸软骨素与肝素均属此类。",
    position: {
      title: "它构成基质、滑液与软骨",
      body: "糖胺聚糖与核心蛋白连成蛋白聚糖，构成细胞外基质、关节滑液与软骨；肝素作为其中一员还用于抗凝。本平台未建糖胺聚糖合成通路，不同组织的糖胺聚糖组成决定基质的力学性质。",
    },
    origin: {
      title: "它由基质细胞合成，在溶酶体降解",
      body: "成纤维细胞与软骨细胞合成糖胺聚糖，原料来自葡萄糖代谢；降解主要在溶酶体完成。透明质酸的合成都从 UDP-糖核苷酸起步，硫酸化修饰在细胞外完成，分解不全时片段会在细胞内堆积。",
    },
    significance: {
      title: "降解缺陷导致黏多糖贮积症",
      body: "溶酶体酶缺陷导致黏多糖贮积症，表现为骨骼畸形、角膜混浊与器官受累；肝素抗凝过量可致出血，需监测凝血指标。不同类型的贮积症由不同酶缺陷决定，早期诊断依赖酶学与基因检测。",
    },
    exam: {
      title: "考点是重复二糖与贮积症",
      items: [
        "糖胺聚糖由氨基糖与糖醛酸组成的二糖单元重复构成。",
        "透明质酸是少数不发生硫酸化的糖胺聚糖。",
        "溶酶体降解酶缺陷引起黏多糖贮积症。",
        "肝素的抗凝作用来自它与抗凝血酶的相互作用。",
      ],
    },
    sources: [
      "Lehninger Principles of Biochemistry, 8e, 糖复合物与细胞外基质相关章节",
      "王镜岩《生物化学》第三版, 糖复合物相关章节",
    ],
  },
  "sialic-acid": {
    claim: "唾液酸是糖蛋白与糖脂末端的九碳羧酸糖，参与识别与遮蔽",
    aliases: ["N-乙酰神经氨酸", "Neu5Ac"],
    classification: "单糖衍生物；九碳羧酸糖",
    structure: "九碳 α-酮酸，N-乙酰神经氨酸最常见；常以 α-2,3 或 α-2,6 键连在糖链末端。",
    position: {
      title: "它站在糖链末端参与识别",
      body: "唾液酸位于细胞表面糖链末端，参与细胞黏附、受体识别与免疫调节；它也可遮蔽下层糖链，改变细胞间的识别。平台未建糖链合成通路，这种末端修饰是糖链功能的重要开关，并影响免疫识别。",
    },
    origin: {
      title: "它由 UDP-GlcNAc 合成，也可补救回收",
      body: "体内唾液酸由 UDP-GlcNAc 经多步反应合成，食物中含量有限；肿瘤细胞常上调其合成，使表面糖链末端唾液酸化增强，也可经补救途径从外源糖链回收，饮食中的唾液酸多以糖复合物形式存在。",
    },
    significance: {
      title: "它是流感受体与肿瘤标志",
      body: "流感病毒以唾液酸为受体，神经氨酸酶负责切开连接以释放子代病毒；肿瘤表面唾液酸与侵袭、免疫逃逸相关，是糖生物学的重要标志，针对神经氨酸酶的药物可阻断病毒释放，其机制仍是药物研发重点。",
    },
    exam: {
      title: "考点是九碳、末端与流感病毒",
      items: [
        "唾液酸是九碳羧酸糖，常见形式为 N-乙酰神经氨酸。",
        "唾液酸常位于糖蛋白与糖脂糖链的末端。",
        "流感病毒以唾液酸为受体，神经氨酸酶负责释放病毒。",
        "唾液酸化增强与肿瘤侵袭、免疫逃逸相关。",
      ],
    },
    sources: [
      "Lehninger Principles of Biochemistry, 8e, 糖复合物相关章节",
      "王镜岩《生物化学》第三版, 糖复合物相关章节",
    ],
  },
  // -------------------------- 脂类 --------------------------
  "stearic-acid": {
    claim: "硬脂酸是十八碳饱和脂肪酸，是 β-氧化的常见底物",
    aliases: ["十八酸", "stearic acid"],
    classification: "脂肪酸；长链饱和脂肪酸",
    structure: "直链十八碳饱和羧酸，无双键；熔点高于同碳数的不饱和脂肪酸。",
    position: {
      title: "它在 β-氧化里逐轮缩短两个碳",
      body: "在胞质活化为硬脂酰-CoA，经肉碱穿梭进入线粒体，每轮 β-氧化依次脱氢、水化、再脱氢与硫解，缩短两个碳并生成乙酰-CoA 与还原当量；平台 β-氧化通路以脂肪酸底物为例。",
    },
    origin: {
      title: "它来自膳食，也由软脂酸延长生成",
      body: "膳食脂肪与体内合成都能提供；脂肪酸合成酶的主要产物是软脂酸，延长酶可再加两个碳生成硬脂酸，因此肝与脂肪组织都能合成它。平台脂肪酸合成数据未单列延长步骤，这也是膳食脂肪的常见成分。",
    },
    significance: {
      title: "过量饱和脂肪不利于血脂管理",
      body: "过量饱和脂肪与血脂升高相关，工业氢化也会带来反式脂肪问题；硬脂酸可在去饱和酶作用下转为油酸，后者是常见的单不饱和脂肪酸，也是膳食脂肪的重要组成，因此应看整体膳食结构。",
    },
    exam: {
      title: "考点是饱和、偶数碳与 β-氧化",
      items: [
        "硬脂酸是十八碳饱和脂肪酸，不含双键。",
        "β-氧化每轮脱氢、水化、再脱氢与硫解，缩短两个碳。",
        "偶数碳饱和脂肪酸经 β-氧化可完全生成乙酰-CoA。",
        "硬脂酸可去饱和生成油酸，二者饱和度不同。",
      ],
    },
    sources: [
      "Lehninger Principles of Biochemistry, 8e, 脂类与脂肪酸代谢相关章节",
      "王镜岩《生物化学》第三版, 脂类化学与脂代谢相关章节",
    ],
    related: [{ label: "脂肪酸 β-氧化", to: "/pathway/fatty-acid-oxidation" }],
  },
  "oleic-acid": {
    claim: "油酸是十八碳单不饱和脂肪酸，一个顺式双键使它熔点低于硬脂酸",
    aliases: ["十八烯酸", "oleic acid"],
    classification: "脂肪酸；单不饱和脂肪酸",
    structure: "顺式-9-十八碳烯酸，含一个双键；双键处碳链弯折，不易紧密堆积。",
    position: {
      title: "它进入甘油三酯与磷脂，氧化前先异构",
      body: "酯化进入甘油三酯与磷脂；β-氧化前需异构酶把顺式双键转为反式-2-烯酰-CoA，再由还原酶处理，才能继续按 β-氧化循环拆解。平台 β-氧化数据未单列不饱和脂肪酸的异构步骤。",
    },
    origin: {
      title: "它来自植物油，也由硬脂酸去饱和生成",
      body: "橄榄油、茶油与坚果油脂含量高，是膳食单不饱和脂肪的主要来源；体内由硬脂酸在去饱和酶作用下生成，因此膳食摄入与内源合成都可提供油酸，橄榄油也因此被视为其代表来源。",
    },
    significance: {
      title: "替代饱和脂肪有利，但仍属能量来源",
      body: "以单不饱和脂肪替代部分饱和脂肪有利于血脂管理，也是地中海饮食的特点；油酸仍是能量来源，过量摄入同样增加能量负担，不能把它当作无害，它也常被用来解释该膳食模式的脂质特点。",
    },
    exam: {
      title: "考点是顺式双键与不饱和脂肪酸氧化",
      items: [
        "油酸是顺式-9-十八碳烯酸，只有一个双键。",
        "不饱和脂肪酸 β-氧化需要异构酶与还原酶处理双键。",
        "双键使熔点低于同碳数的硬脂酸。",
        "油酸可由硬脂酸在去饱和酶作用下生成。",
      ],
    },
    sources: [
      "Lehninger Principles of Biochemistry, 8e, 脂类与脂肪酸代谢相关章节",
      "王镜岩《生物化学》第三版, 脂类化学与脂代谢相关章节",
    ],
    related: [{ label: "脂肪酸 β-氧化", to: "/pathway/fatty-acid-oxidation" }],
  },
  "linoleic-acid": {
    claim: "亚油酸是哺乳动物不能合成的十八碳二烯必需脂肪酸",
    aliases: ["十八碳二烯酸", "linoleic acid"],
    classification: "脂肪酸；ω-6 多不饱和必需脂肪酸",
    structure: "顺,顺-9,12-十八碳二烯酸，含两个双键；属 ω-6 家族。",
    position: {
      title: "它是花生四烯酸与类花生酸的前体",
      body: "是花生四烯酸与类花生酸的前体，参与膜磷脂构成并影响膜流动性；缺乏时皮肤与生长受影响。平台未建类花生酸通路，亚油酸本身也不能由人体合成，因此只能作为前体参与，只有花生四烯酸能承接类花生酸合成。",
    },
    origin: {
      title: "它只能从植物油等膳食来源获得",
      body: "向日葵油、玉米油与大豆油是主要来源，必须由膳食供给；体内不能从头合成 ω-6 双键，因此缺乏时只能靠摄入补充，不能由葡萄糖转化，肠外营养中必须专门补充，配方食品需标注其含量。",
    },
    significance: {
      title: "缺乏致皮炎，过量则需与 ω-3 平衡",
      body: "缺乏可致皮炎与生长迟缓，动物实验中还影响生殖；过量 ω-6 摄入与炎症前体偏多相关，应与 ω-3 保持平衡，而不是简单追求总量，摄入比例比单一总量更值得关注，这也是膳食指南强调脂肪酸平衡的原因。",
    },
    exam: {
      title: "考点是必需、ω-6 与花生四烯酸",
      items: [
        "亚油酸是必需脂肪酸，人体不能自身合成。",
        "亚油酸属 ω-6 家族，含两个双键。",
        "亚油酸经延长与去饱和可生成花生四烯酸。",
        "必需脂肪酸缺乏表现为皮炎与生长迟缓。",
      ],
    },
    sources: [
      "Lehninger Principles of Biochemistry, 8e, 脂类与脂肪酸代谢相关章节",
      "王镜岩《生物化学》第三版, 脂类化学相关章节",
    ],
    related: [{ label: "脂肪酸 β-氧化", to: "/pathway/fatty-acid-oxidation" }],
  },
  "linolenic-acid": {
    claim: "亚麻酸是十八碳三烯的 ω-3 必需脂肪酸",
    aliases: ["α-亚麻酸", "linolenic acid"],
    classification: "脂肪酸；ω-3 多不饱和必需脂肪酸",
    structure: "全顺-9,12,15-十八碳三烯酸，含三个双键；属 ω-3 家族。",
    position: {
      title: "它可转化为 EPA 与 DHA",
      body: "可经延长与去饱和生成 EPA 与 DHA，参与膜磷脂与抗炎介质合成；平台未建该通路，相关转化步骤不在本站数据层，不能在本页展开反应链，因此只写归属，不列具体酶与中间物。",
    },
    origin: {
      title: "它来自亚麻籽油、紫苏油与核桃",
      body: "亚麻籽油、紫苏油与核桃是主要来源，必须由膳食供给；体内不能合成 ω-3 双键，故属必需脂肪酸，缺乏只能靠膳食补充，膳食结构直接决定其摄入水平，植物来源差异也会影响实际摄入量。",
    },
    significance: {
      title: "它影响炎症、血小板与神经膜",
      body: "ω-3 脂肪酸影响炎症与血小板功能；DHA 是视网膜与神经膜的重要成分，缺乏时相关功能受影响，孕期与婴幼儿需求更受关注，婴幼儿配方食品因此需要关注其供应，配方中常需强化。",
    },
    exam: {
      title: "考点是 ω-3、三个双键与 EPA/DHA",
      items: [
        "亚麻酸是 ω-3 必需脂肪酸，含三个双键。",
        "亚麻酸经延长与去饱和生成 EPA 与 DHA。",
        "DHA 是视网膜与神经细胞膜的重要成分。",
        "亚油酸属 ω-6，亚麻酸属 ω-3，二者不可互相替代。",
      ],
    },
    sources: [
      "Lehninger Principles of Biochemistry, 8e, 脂类与脂肪酸代谢相关章节",
      "王镜岩《生物化学》第三版, 脂类化学相关章节",
    ],
  },
  "arachidonic-acid": {
    claim: "花生四烯酸是二十碳四烯酸，是类花生酸合成的共同前体",
    aliases: ["二十碳四烯酸", "arachidonic acid"],
    classification: "脂肪酸；ω-6 多不饱和脂肪酸",
    structure: "含四个顺式双键（5,8,11,14）；酯化于膜磷脂 sn-2 位。",
    position: {
      title: "它经 COX 与 LOX 分出两条信号支路",
      body: "磷脂酶 A2 释放后经环加氧酶生成前列腺素与血栓素，经脂加氧酶生成白三烯；两条支路都从同一前体出发，但产物与受体不同。平台未建类花生酸通路，本站只保留前列腺素与白三烯的条目页。",
    },
    origin: {
      title: "它由亚油酸合成，也储存在膜磷脂",
      body: "可由亚油酸经延长与去饱和合成，也可直接来自动物性膳食；主要酯化储存于膜磷脂 sn-2 位，需要时被磷脂酶 A2 释放，膜磷脂因此是它的主要体内储库，释放过程受刺激与受体调控。",
    },
    significance: {
      title: "它是炎症与血小板聚集的前体",
      body: "参与炎症、疼痛、发热与血小板聚集；阿司匹林抑制环加氧酶，减少前列腺素生成，因此常用于抗炎抗血小板，但也会影响胃黏膜保护，这解释了它的胃肠道副作用，也是选择性 COX-2 抑制剂研发的背景。",
    },
    exam: {
      title: "考点是 COX、LOX 与阿司匹林",
      items: [
        "花生四烯酸经环加氧酶生成前列腺素与血栓素。",
        "花生四烯酸经脂加氧酶生成白三烯。",
        "磷脂酶 A2 把花生四烯酸从膜磷脂释放出来。",
        "阿司匹林通过抑制环加氧酶发挥抗炎抗血小板作用。",
      ],
    },
    sources: [
      "Lehninger Principles of Biochemistry, 8e, 脂类与类花生酸相关章节",
      "王镜岩《生物化学》第三版, 脂类代谢相关章节",
    ],
    related: [
      { label: "前列腺素", to: "/substance/prostaglandin" },
      { label: "白三烯", to: "/substance/leukotriene" },
    ],
  },
  triglyceride: {
    claim: "甘油三酯是甘油与三分子脂肪酸酯化形成的储能脂",
    aliases: ["三酰甘油", "triglyceride"],
    classification: "脂类；甘油酯",
    structure: "甘油三个羟基分别与脂肪酸羧基成酯；高度疏水，以脂滴形式储存。",
    position: {
      title: "它在脂肪组织储存，由脂蛋白运输",
      body: "脂肪组织是主要储存部位，脂蛋白把肝内合成的甘油三酯运往外周；脂肪酶水解释放脂肪酸供氧化，饥饿时这一过程明显增强。血浆脂蛋白的搬运与分发见 PLATE 18，空腹延长会动用脂肪储备。",
    },
    origin: {
      title: "它由肠道吸收与肝内合成两条来源",
      body: "小肠吸收的脂肪以乳糜微粒运输，肝内把多余糖与脂肪酸合成甘油三酯并入 VLDL；过量能量摄入促进储存，这是肥胖形成的核心环节，高糖高脂饮食会加速这一过程，运动与禁食则促进其消耗。",
    },
    significance: {
      title: "长期过剩导致肥胖与高甘油三酯血症",
      body: "长期能量过剩导致肥胖、脂肪肝与高甘油三酯血症；血中甘油三酯过高还增加胰腺炎风险，控制总能量与减少精制糖是主要干预方向，必要时需药物干预，体重管理与饮食结构调整应并行。",
    },
    exam: {
      title: "考点是酯化、脂蛋白与脂解",
      items: [
        "一分子甘油与三分子脂肪酸酯化生成甘油三酯。",
        "乳糜微粒运输小肠吸收的脂肪，VLDL 运输肝内合成的甘油三酯。",
        "脂肪酶水解甘油三酯释放游离脂肪酸。",
        "甘油三酯是储能脂，磷脂是膜脂，二者结构不同。",
      ],
    },
    sources: [
      "Lehninger Principles of Biochemistry, 8e, 脂类与脂蛋白相关章节",
      "王镜岩《生物化学》第三版, 脂类代谢相关章节",
    ],
  },
  pc: {
    claim: "磷脂酰胆碱是胆碱头基的甘油磷脂，是膜与脂蛋白的主要磷脂",
    aliases: ["卵磷脂", "phosphatidylcholine"],
    classification: "脂类；甘油磷脂",
    structure: "甘油磷脂，sn-3 磷酸连接胆碱，sn-1/sn-2 接脂肪酸；两亲性分子。",
    position: {
      title: "它构成膜与脂蛋白表面",
      body: "构成细胞膜与脂蛋白表面，也是肺表面活性物质的主要磷脂；它维持膜流动性，并为脂蛋白提供两亲性外壳。甘油磷脂合成见 PLATE 17，它同时也是血浆脂蛋白颗粒装配时最先铺上的表面磷脂。",
    },
    origin: {
      title: "它从食物与肝内合成两路来",
      body: "食物中的卵磷脂与肝内合成都能提供；肝内可由磷脂酰乙醇胺甲基化生成，胆碱是必需原料，因此胆碱缺乏会影响其供应，孕期需求也会相应增加，长期摄入不足则肝内磷脂供应受限。",
    },
    significance: {
      title: "胆碱缺乏可致脂肪肝，表面活性物质不足则塌陷",
      body: "胆碱缺乏影响肝内脂蛋白装配，可致脂肪肝；肺表面活性物质不足时肺泡易塌陷，早产儿尤其明显，这也是产前糖皮质激素的临床背景之一，产前评估与新生儿呼吸支持很重要，因此产前评估不可忽视。",
    },
    exam: {
      title: "考点是胆碱头基与表面活性物质",
      items: [
        "磷脂酰胆碱是胆碱头基的甘油磷脂。",
        "胆碱缺乏会影响肝内脂蛋白装配。",
        "肺表面活性物质以磷脂酰胆碱为主要成分。",
        "磷脂酰乙醇胺甲基化可生成磷脂酰胆碱。",
      ],
    },
    sources: [
      "Lehninger Principles of Biochemistry, 8e, 磷脂与脂蛋白相关章节",
      "王镜岩《生物化学》第三版, 脂类化学相关章节",
    ],
  },
  pe: {
    claim: "磷脂酰乙醇胺是乙醇胺头基的甘油磷脂，参与膜融合与自噬",
    aliases: ["脑磷脂", "phosphatidylethanolamine"],
    classification: "脂类；甘油磷脂",
    structure: "甘油磷脂，头基为乙醇胺；与磷脂酰丝氨酸可经头基交换互变。",
    position: {
      title: "它在膜内叶参与融合与自噬",
      body: "主要位于膜内叶，参与膜曲率与融合；自噬体形成时需要 PE 与 LC3 结合，因此 PE 供应影响自噬效率，PE 不足会削弱自噬体膜的形成。平台未建自噬与磷脂合成通路。",
    },
    origin: {
      title: "它经 CDP-乙醇胺途径合成",
      body: "经 CDP-乙醇胺途径合成，也可由磷脂酰丝氨酸脱羧生成；线粒体内膜含量较高，脑组织含量也高，是膜磷脂的重要组成，肝内合成尤为活跃，膳食并非其主要来源，其合成速率与膜更新需求相关。",
    },
    significance: {
      title: "它影响膜融合、自噬与红细胞形态",
      body: "PE 参与膜融合与自噬；红细胞膜磷脂组成改变会影响细胞形态与寿命，PE 与 PS 的互变也影响膜不对称性，进而影响细胞识别，因此膜磷脂平衡对红细胞存活很重要，膜磷脂失衡也见于部分溶血性疾病。",
    },
    exam: {
      title: "考点是乙醇胺头基与 PE-LC3",
      items: [
        "磷脂酰乙醇胺是乙醇胺头基的甘油磷脂。",
        "PE 与 LC3 结合是自噬体膜形成的重要步骤。",
        "磷脂酰丝氨酸脱羧可生成 PE。",
        "PE 与 PC 的头基不同，前者为乙醇胺，后者为胆碱。",
      ],
    },
    sources: [
      "Lehninger Principles of Biochemistry, 8e, 磷脂与膜结构相关章节",
      "王镜岩《生物化学》第三版, 脂类化学相关章节",
    ],
  },
  ps: {
    claim: "磷脂酰丝氨酸是丝氨酸头基的甘油磷脂，正常位于膜内侧",
    aliases: ["phosphatidylserine"],
    classification: "脂类；甘油磷脂",
    structure: "头基为丝氨酸，带负电；与 PE 可经头基交换互变。",
    position: {
      title: "它在凋亡时外翻，成为吞噬信号",
      body: "正常位于膜内叶，其内侧定位依赖翻转酶维持；凋亡时外翻成为吞噬信号，血小板活化时外翻参与凝血。平台未建该通路，本站不单列其翻转酶，也不展开凋亡级联，PS 暴露是细胞状态改变的敏感指标。",
    },
    origin: {
      title: "它由 PE 与丝氨酸交换头基生成",
      body: "由磷脂酰乙醇胺与丝氨酸交换头基生成，也可来自膳食；合成依赖磷脂酰丝氨酸合成酶，肝与脑是主要合成部位，红细胞也依赖该途径更新膜磷脂，因此其供应依赖酶活性，该酶活性变化会直接改变膜磷脂组成。",
    },
    significance: {
      title: "外翻标记凋亡细胞，也参与凝血",
      body: "外翻是凋亡细胞被清除的标志；血小板表面外翻为凝血因子提供结合位点，因此 PS 暴露与凝血激活相关，也是凋亡检测的常用依据，凋亡与凝血两个过程都依赖 PS 定位。",
    },
    exam: {
      title: "考点是膜内叶、外翻与凋亡",
      items: [
        "磷脂酰丝氨酸正常位于细胞膜内叶。",
        "凋亡时 PS 外翻，成为巨噬细胞识别与吞噬的信号。",
        "PS 由 PE 与丝氨酸交换头基生成。",
        "血小板活化时 PS 外翻，为凝血因子提供结合位点。",
      ],
    },
    sources: [
      "Lehninger Principles of Biochemistry, 8e, 磷脂与膜结构相关章节",
      "王镜岩《生物化学》第三版, 脂类化学相关章节",
    ],
  },
  "pi-lipid": {
    claim: "磷脂酰肌醇是可被磷脂酶 C 水解生成 IP3 与 DAG 的膜磷脂",
    aliases: ["PI", "phosphatidylinositol"],
    classification: "脂类；甘油磷脂",
    structure: "甘油磷脂，头基为肌醇环；可被 PI 激酶磷酸化为 PIP2。",
    position: {
      title: "它在膜内叶被 PLC 切成两个信使",
      body: "位于膜内叶，PLC 水解 PIP2 生成 IP3 与 DAG，分别触发钙释放与 PKC 激活。平台未建 PI 信号通路，本站只保留 IP3 与 DAG 的条目页。",
    },
    origin: {
      title: "它经 PI 循环反复磷酸化与水解",
      body: "由 CDP-二酰甘油与肌醇合成，经 PI 循环在膜上反复磷酸化与水解，肌醇由此反复周转；这一循环也是锂盐作用的靶点，影响神经细胞信号，肌醇供应会影响信号强度，因此肌醇摄入与合成都会改变该循环。",
    },
    significance: {
      title: "它是钙与 PKC 信号的上游",
      body: "多种激素与生长因子通过该途径传递信号；锂盐通过抑制肌醇单磷酸酶影响 PI 循环，是情绪稳定剂的作用基础，也说明该磷脂在神经信号中地位重要，因此该通路是多种药物的潜在靶点。",
    },
    exam: {
      title: "考点是 PLC、PIP2 与 IP3/DAG",
      items: [
        "磷脂酶 C 水解 PIP2 生成 IP3 与 DAG。",
        "IP3 触发内质网释放钙，DAG 激活蛋白激酶 C。",
        "PIP2 由磷脂酰肌醇经 PI 激酶磷酸化生成。",
        "锂盐通过抑制肌醇单磷酸酶影响 PI 循环。",
      ],
    },
    sources: [
      "Lehninger Principles of Biochemistry, 8e, 磷脂与信号转导相关章节",
      "王镜岩《生物化学》第三版, 脂类与信号转导相关章节",
    ],
    related: [
      { label: "IP3", to: "/substance/ip3" },
      { label: "DAG", to: "/substance/dag" },
    ],
  },
  sphingosine: {
    claim: "鞘氨醇是鞘脂的骨架氨基醇，也是神经酰胺的前体",
    aliases: ["sphingosine", "神经鞘氨醇"],
    classification: "脂类；鞘脂骨架",
    structure: "十八碳氨基醇，含反式双键与两个羟基；氨基可被脂肪酸酰化。",
    position: {
      title: "它作为鞘脂骨架，而不是游离脂质",
      body: "鞘氨醇不是游离存在的主要形式，而是鞘脂的骨架：它的氨基被脂肪酸酰化后成为神经酰胺，再进一步生成鞘磷脂与糖鞘脂。平台未建鞘脂合成通路，本站只写骨架定位与去向，游离鞘氨醇在细胞中含量很低。",
    },
    origin: {
      title: "它由丝氨酸与棕榈酰辅酶 A 起始合成",
      body: "由丝氨酸与棕榈酰辅酶 A 缩合起始，经还原与酰化生成神经酰胺，再供给鞘磷脂与糖鞘脂合成。反应步骤属教材章级内容，本平台未建鞘脂代谢通路，因此不展开酶名与中间物。",
    },
    significance: {
      title: "鞘脂构成髓鞘，其磷酸化产物参与信号",
      body: "鞘脂构成髓鞘与细胞膜外叶，鞘氨醇的磷酸化产物参与细胞迁移与免疫调节；神经酰胺则与应激和凋亡信号相关，因此鞘脂平衡会影响神经与免疫系统的功能状态，神经酰胺累积也见于部分代谢性疾病。",
    },
    exam: {
      title: "考点是氨基醇骨架与神经酰胺",
      items: [
        "鞘氨醇是含氨基的十八碳氨基醇，不是甘油衍生物。",
        "鞘脂的骨架是鞘氨醇，甘油磷脂的骨架是甘油。",
        "神经酰胺由鞘氨醇与脂肪酸酰化生成。",
        "鞘氨醇的磷酸化产物可参与细胞信号。",
      ],
    },
    sources: [
      "Lehninger Principles of Biochemistry, 8e, 脂类与鞘脂相关章节",
      "王镜岩《生物化学》第三版, 脂类化学相关章节",
    ],
    related: [{ label: "鞘脂", to: "/substance/sphingolipid" }],
  },
  sphingolipid: {
    claim: "鞘脂是以鞘氨醇为骨架、在膜外叶发挥作用的脂类家族",
    aliases: ["sphingolipid", "神经鞘脂"],
    classification: "脂类；鞘脂",
    structure: "以鞘氨醇为骨架，神经酰胺为中枢中间物；可接磷酸胆碱或糖基。",
    position: {
      title: "它在膜外叶，神经酰胺是家族中枢",
      body: "鞘脂主要位于细胞膜外叶，神经酰胺是其中枢中间物，鞘磷脂在髓鞘中含量高，糖鞘脂参与细胞识别。平台未建鞘脂通路，本站只写其膜内定位与家族关系，糖鞘脂的糖链朝向细胞外侧。",
    },
    origin: {
      title: "它由神经酰胺分流为鞘磷脂与糖鞘脂",
      body: "由丝氨酸与棕榈酰辅酶 A 起始合成神经酰胺，再分别接入磷酸胆碱或糖基，形成鞘磷脂与糖鞘脂；降解在溶酶体进行，神经酰胺也可来自鞘磷脂的降解回补。教材章级出处，本平台未建该通路。",
    },
    significance: {
      title: "髓鞘、血型抗原与贮积病都落在鞘脂",
      body: "鞘磷脂构成髓鞘，糖鞘脂参与血型抗原与细胞识别，鞘脂沉积可致溶酶体贮积病；因此鞘脂代谢异常会同时影响神经与造血系统，神经鞘脂的降解障碍多表现为进行性神经系统症状。",
    },
    exam: {
      title: "考点是鞘氨醇骨架与糖鞘脂",
      items: [
        "鞘脂以鞘氨醇为骨架，不含甘油。",
        "神经酰胺是鞘脂合成的中枢中间物。",
        "鞘磷脂由神经酰胺接磷酸胆碱生成。",
        "糖鞘脂的糖基决定血型抗原特异性。",
      ],
    },
    sources: [
      "Lehninger Principles of Biochemistry, 8e, 脂类与膜结构相关章节",
      "王镜岩《生物化学》第三版, 脂类化学相关章节",
    ],
    related: [
      { label: "鞘氨醇", to: "/substance/sphingosine" },
      { label: "唾液酸", to: "/substance/sialic-acid" },
    ],
  },
  "bile-acid": {
    claim: "胆汁酸是胆固醇在肝内转化成的两亲性分子，帮助脂类消化吸收",
    aliases: ["胆汁酸盐", "bile acid"],
    classification: "脂类；胆固醇衍生物",
    structure: "甾体骨架带羟基与侧链羧基，可与甘氨酸或牛磺酸结合成盐。",
    position: {
      title: "它在肠肝之间循环，乳化膳食脂类",
      body: "胆汁酸在肝内由胆固醇转化，随胆汁排入小肠，以胆汁酸盐形式乳化脂类；大部分在回肠被重吸收，经门静脉回肝，构成肠肝循环。站内胆固醇合成通路止于胆固醇，未建胆汁酸生成步骤。",
    },
    origin: {
      title: "它由胆固醇羟化、氧化并结合生成",
      body: "以胆固醇为原料，经羟化、氧化与侧链缩短生成胆酸与鹅脱氧胆酸，再与甘氨酸或牛磺酸结合成胆汁盐；胆固醇 7α-羟化酶是限速步骤。以上为教材章级内容，初级胆汁酸在肠道经菌群作用转为次级胆汁酸。",
    },
    significance: {
      title: "它促进脂类与脂溶性维生素吸收",
      body: "胆汁酸乳化膳食脂类，促进脂肪与脂溶性维生素吸收；肠肝循环被阻断时脂类吸收下降，临床也用它降低血胆固醇，因此胆汁酸代谢与消化和血脂都相关，胆汁酸还能促进胆固醇的排泄与更新。",
    },
    exam: {
      title: "考点是限速酶、结合与肠肝循环",
      items: [
        "胆汁酸由胆固醇在肝内转化生成。",
        "胆固醇 7α-羟化酶是胆汁酸合成的限速酶。",
        "胆汁酸与甘氨酸或牛磺酸结合后分泌。",
        "肠肝循环主要在回肠完成重吸收。",
      ],
    },
    sources: [
      "Lehninger Principles of Biochemistry, 8e, 脂类与胆固醇代谢相关章节",
      "人卫版《生物化学》, 脂类代谢相关章节",
    ],
    related: [
      { label: "胆固醇", to: "/molecule/cholesterol" },
      { label: "胆固醇合成", to: "/pathway/cholesterol" },
    ],
  },
  prostaglandin: {
    claim: "前列腺素是花生四烯酸经环加氧酶生成的前列腺烷类信号分子",
    aliases: ["PG", "prostaglandin"],
    classification: "脂类；类花生酸",
    structure: "二十碳前列腺烷酸骨架，含环戊烷环与两条侧链。",
    position: {
      title: "它在局部生成，作用于邻近细胞",
      body: "前列腺素在局部生成并作用于邻近细胞，属于旁分泌信号；环加氧酶先将花生四烯酸转为 PGH2，再由各组织特异的合成酶生成 PGE2、PGI2 与 TXA2 等。平台未建类花生酸通路。",
    },
    origin: {
      title: "底物来自膜磷脂，经环加氧酶分流",
      body: "底物花生四烯酸由膜磷脂经磷脂酶 A2 释放，再经环加氧酶与下游合成酶生成；COX-1 为构成型，COX-2 在炎症刺激下诱导。上述路径属教材章级内容，本站不展开反应步骤。",
    },
    significance: {
      title: "它参与炎症与血栓形成的平衡",
      body: "前列腺素参与炎症、疼痛与发热，也调节血管张力与血小板聚集；PGI2 舒张血管并抑制血小板，TXA2 作用相反，因此二者平衡会影响血栓形成与血管事件风险，低剂量阿司匹林以抑制血小板 TXA2 为主。",
    },
    exam: {
      title: "考点是环加氧酶与 PGI2/TXA2",
      items: [
        "前列腺素的前体是花生四烯酸。",
        "环加氧酶把花生四烯酸转为 PGH2。",
        "阿司匹林不可逆乙酰化环加氧酶。",
        "PGI2 与 TXA2 对血小板的作用相反。",
      ],
    },
    sources: [
      "Lehninger Principles of Biochemistry, 8e, 脂类与类花生酸相关章节",
      "人卫版《生物化学》, 脂类代谢相关章节",
    ],
    related: [
      { label: "花生四烯酸", to: "/substance/arachidonic-acid" },
      { label: "白三烯", to: "/substance/leukotriene" },
    ],
  },
  leukotriene: {
    claim: "白三烯是花生四烯酸经脂加氧酶生成的支气管与炎症信号分子",
    aliases: ["LT", "leukotriene"],
    classification: "脂类；类花生酸",
    structure: "二十碳多烯酸衍生物，含共轭三烯结构；半胱氨酰型带肽链。",
    position: {
      title: "它由炎症细胞生成，作用于邻近细胞",
      body: "白三烯在炎症细胞局部生成，作用于邻近细胞；5-脂加氧酶把花生四烯酸转为 LTA4，再分流为 LTB4 与半胱氨酰白三烯。平台未建类花生酸通路，本站只写其定位与分流去向。",
    },
    origin: {
      title: "它经 5-脂加氧酶与 FLAP 生成",
      body: "由花生四烯酸在 5-脂加氧酶作用下生成，需 FLAP 辅助；LTC4 经转运与肽酶加工形成 LTD4 与 LTE4。以上为教材章级内容，本平台未建该通路，不列具体酶与中间物。",
    },
    significance: {
      title: "它驱动支气管收缩与过敏性炎症",
      body: "LTB4 招募中性粒细胞，半胱氨酰白三烯引起支气管收缩、黏液分泌与水肿；因此白三烯是哮喘与过敏性炎症的重要介质，也是受体拮抗药的作用靶点，临床上以半胱氨酰白三烯受体为靶点。",
    },
    exam: {
      title: "考点是 5-脂加氧酶与半胱氨酰白三烯",
      items: [
        "白三烯由花生四烯酸经 5-脂加氧酶生成。",
        "LTB4 主要作用是招募中性粒细胞。",
        "半胱氨酰白三烯引起支气管收缩。",
        "白三烯受体拮抗药用于哮喘治疗。",
      ],
    },
    sources: [
      "Lehninger Principles of Biochemistry, 8e, 脂类与类花生酸相关章节",
      "人卫版《生物化学》, 脂类代谢相关章节",
    ],
    related: [
      { label: "花生四烯酸", to: "/substance/arachidonic-acid" },
      { label: "前列腺素", to: "/substance/prostaglandin" },
    ],
  },
  acetoacetate: {
    claim: "乙酰乙酸是肝内生成、肝外利用的酮体之一",
    aliases: ["乙酰醋酸", "acetoacetate"],
    classification: "脂类；酮体",
    structure: "四碳 β-酮酸，含酮羰基与羧基；可被还原为 β-羟丁酸。",
    position: {
      title: "它在肝内生成，在肝外被氧化",
      body: "乙酰乙酸在肝线粒体由 HMG-CoA 裂解生成，释放入血后供肝外组织氧化；肝内缺少 OXCT1，因此只产不用。站内酮体代谢图 PLATE 13 已建，可按 kt-3 至 kt-6 查看生成与利用步骤。",
    },
    origin: {
      title: "它由乙酰辅酶 A 经 HMG-辅酶 A 途径生成",
      body: "由乙酰辅酶 A 缩合生成乙酰乙酰辅酶 A，再经 HMG-辅酶 A 途径裂解生成；饥饿与低糖状态促进其生成，其生成受胰岛素与胰高血糖素比例调控。具体步骤见站内酮体代谢图 kt-1 至 kt-3。",
    },
    significance: {
      title: "它是饥饿时的替代燃料，过量则致酮症",
      body: "饥饿时酮体为脑与心肌提供替代燃料；生成过多时出现酮血症与酮尿，糖尿病酮症酸中毒即与此相关，因此酮体水平反映糖脂代谢状态与胰岛素作用是否充分，血酮与尿酮检测是临床常用的监测手段。",
    },
    exam: {
      title: "考点是酮体组成与肝内肝外分工",
      items: [
        "酮体包括乙酰乙酸、β-羟丁酸与丙酮。",
        "肝内生成酮体但不利用酮体。",
        "乙酰乙酸是酮体生成的直接产物。",
        "糖尿病酮症酸中毒时酮体生成增加。",
      ],
    },
    sources: [
      "Lehninger Principles of Biochemistry, 8e, 脂类代谢与酮体相关章节",
      "人卫版《生物化学》, 脂类代谢相关章节",
    ],
    related: [
      { label: "β-羟丁酸", to: "/substance/beta-hydroxybutyrate" },
      { label: "丙酮", to: "/substance/acetone" },
      { label: "酮体代谢", to: "/pathway/ketone" },
      { label: "物质档案", to: "/molecule/acetoacetate" },
    ],
  },
  "beta-hydroxybutyrate": {
    claim: "β-羟丁酸是血中含量最高的酮体，由乙酰乙酸还原生成",
    aliases: ["β-羟丁酸", "BHB"],
    classification: "脂类；酮体",
    structure: "四碳 β-羟基酸；与乙酰乙酸经脱氢酶互变，反应依赖 NADH。",
    position: {
      title: "它是酮体在血中的主要运输形式",
      body: "β-羟丁酸是酮体在血中的主要形式，经单羧酸转运体进入肝外组织，再转为乙酰乙酸后被氧化。站内酮体代谢图已建，可按 kt-4 与 kt-6 查看生成、转运与利用；它在血中半衰期较短，需持续生成维持水平。",
    },
    origin: {
      title: "它由乙酰乙酸还原，比例反映氧化还原状态",
      body: "由乙酰乙酸在 β-羟丁酸脱氢酶催化下还原生成，反应以 NADH 供氢并可逆；因此乙酰乙酸与 β-羟丁酸的比例反映线粒体氧化还原状态，肝内生成后主要以该形式释放入血是教材章级内容。",
    },
    significance: {
      title: "它供能可靠，但常规酮体检测易漏检",
      body: "它是饥饿状态下脑与骨骼肌的重要燃料；血中水平升高提示酮症，但常规亚硝基铁氰化钠法不检出它，因此检测方法选择会影响结果判读，临床需结合酶法测定，血酮监测比尿酮更能反映即时状态。",
    },
    exam: {
      title: "考点是互变、供能与检测盲区",
      items: [
        "β-羟丁酸与乙酰乙酸经脱氢酶互变。",
        "β-羟丁酸是血中含量最高的酮体。",
        "亚硝基铁氰化钠反应不检出 β-羟丁酸。",
        "酮体在肝外组织被氧化利用。",
      ],
    },
    sources: [
      "Lehninger Principles of Biochemistry, 8e, 脂类代谢与酮体相关章节",
      "人卫版《生物化学》, 脂类代谢相关章节",
    ],
    related: [
      { label: "乙酰乙酸", to: "/substance/acetoacetate" },
      { label: "酮体代谢", to: "/pathway/ketone" },
      { label: "物质档案", to: "/molecule/bhb" },
    ],
  },
  acetone: {
    claim: "丙酮是乙酰乙酸脱羧生成的挥发性酮体，主要经呼气排出",
    aliases: ["醋酮", "acetone"],
    classification: "脂类；酮体",
    structure: "三碳酮，常温下易挥发；由乙酰乙酸失去羧基生成。",
    position: {
      title: "它经肺排出，不承担供能",
      body: "丙酮在血中生成后主要经肺呼气排出，少量随尿排出；它不参与供能，属于酮体的代谢副产物。站内酮体代谢图 PLATE 13 已建，kt-5 即脱羧旁路；肺泡通气量变化也会影响其排出速度。",
    },
    origin: {
      title: "它由乙酰乙酸自发脱羧，不需酶催化",
      body: "由乙酰乙酸自发脱羧生成，教材口径不写独立脱羧酶主路径；酮体生成增加时呼气中丙酮随之升高。该反应在体内缓慢进行，其速度与酮体生成量相关，因此呼气丙酮升高滞后于血酮。",
    },
    significance: {
      title: "呼气丙酮提示酮症，但不足以定量",
      body: "呼气丙酮可反映酮体生成水平，是酮症的辅助线索；但它挥发性强、血中浓度低，不能替代乙酰乙酸与 β-羟丁酸的定量检测，因此判读时须结合血酮与尿酮，呼气检测无创，适合作为随访的辅助指标。",
    },
    exam: {
      title: "考点是脱羧生成与呼气排出",
      items: [
        "丙酮由乙酰乙酸脱羧生成。",
        "丙酮主要经呼气排出体外。",
        "丙酮不是主要的供能酮体。",
        "酮症时呼气可有丙酮味。",
      ],
    },
    sources: [
      "Lehninger Principles of Biochemistry, 8e, 脂类代谢与酮体相关章节",
      "人卫版《生物化学》, 脂类代谢相关章节",
    ],
    related: [
      { label: "乙酰乙酸", to: "/substance/acetoacetate" },
      { label: "酮体代谢", to: "/pathway/ketone" },
      { label: "物质档案", to: "/molecule/acetone" },
    ],
  },
  gtp: {
    claim: "GTP 是鸟苷三磷酸，在三羧酸循环与糖异生中承担磷酸供体角色",
    aliases: ["鸟苷三磷酸", "guanosine triphosphate"],
    classification: "核苷酸；嘌呤核苷三磷酸",
    structure: "鸟嘌呤、核糖与三个磷酸基构成；磷酸酐键水解释能，与 ATP 结构相近但碱基不同。",
    position: {
      title: "它在两条通路里分别生成与消耗",
      body: "GTP 与 ATP 同属核苷三磷酸，但细胞内含量较低；它在三羧酸循环中作为一步产物出现，在糖异生中为 PEPCK 提供磷酸。站内这两条通路都列出 GTP，本站不重复其结构页。",
    },
    origin: {
      title: "它由 GDP 与 GMP 逐级磷酸化生成",
      body: "由 GMP 经激酶磷酸化生成，也可由 GDP 再磷酸化；三羧酸循环中琥珀酰辅酶 A 的能级转移可生成 GTP，糖异生则消耗 GTP。具体步骤见站内三羧酸循环与糖异生通路页。",
    },
    significance: {
      title: "它连接能量代谢、翻译与信号转导",
      body: "GTP 参与翻译延伸、G 蛋白信号与微管聚合；在三羧酸循环与糖异生中则是可逆的磷酸载体，因此 GTP 水平反映细胞能量与合成状态，也连接能量代谢与信号转导，也是能量状态的间接读出。",
    },
    exam: {
      title: "考点是三羧酸循环产 GTP 与 PEPCK 用 GTP",
      items: [
        "GTP 与 ATP 都是核苷三磷酸，但碱基不同。",
        "三羧酸循环中有一步直接生成 GTP。",
        "糖异生中 PEPCK 以 GTP 为磷酸供体。",
        "GTP 也参与翻译延伸与 G 蛋白信号。",
      ],
    },
    sources: [
      "Lehninger Principles of Biochemistry, 8e, 核苷酸与糖代谢相关章节",
      "人卫版《生物化学》, 糖代谢与核酸代谢相关章节",
    ],
    related: [
      { label: "三羧酸循环", to: "/pathway/tca" },
      { label: "糖异生", to: "/pathway/gluconeogenesis" },
    ],
  },
  ctp: {
    claim: "CTP 是胞苷三磷酸，是 RNA 合成的底物与磷脂合成中的胞苷酰基载体",
    aliases: ["胞苷三磷酸", "cytidine triphosphate"],
    classification: "核苷酸；嘧啶核苷三磷酸",
    structure: "胞嘧啶、核糖与三个磷酸基构成；与 UTP 同为嘧啶核苷三磷酸。",
    position: {
      title: "它在核酸与磷脂两条合成线上",
      body: "CTP 参与核酸与磷脂合成：RNA 聚合时作胞苷供体；磷脂合成中作胞苷酰基载体——与磷酸胆碱/磷酸乙醇胺缩合生成 CDP-胆碱/CDP-乙醇胺并释放 PPi（ATP 用于胆碱/乙醇胺的磷酸化），或与 PA 生成 CDP-DAG。",
    },
    origin: {
      title: "它由 CMP 经两步磷酸化生成",
      body: "由 CMP 经激酶逐步磷酸化生成，也可由 CDP 再磷酸化；嘧啶环的合成与 UTP 共享前期步骤，嘧啶核苷酸的补救合成也可补充 CTP 前体。以上为教材章级内容，本平台未建该通路，不展开酶名与中间物。",
    },
    significance: {
      title: "它影响 RNA 合成与膜磷脂更新",
      body: "CTP 供应影响 RNA 合成速率与膜磷脂更新；在快速增殖细胞中需求较高，因此 CTP 代谢与核酸合成和膜组装都相关，也常被作为细胞增殖状态的间接指标，在肿瘤细胞中常被作为代谢活跃的标志。",
    },
    exam: {
      title: "考点是 RNA 供体与 CDP-二酰甘油",
      items: [
        "CTP 是 RNA 合成的胞苷供体。",
        "CTP 参与磷脂合成时作胞苷酰基载体，生成 CDP-胆碱 / CDP-乙醇胺 / CDP-DAG。",
        "CTP 与 UTP 同属嘧啶核苷三磷酸。",
        "CTP 由 CMP 经两步磷酸化生成。",
      ],
    },
    sources: [
      "Lehninger Principles of Biochemistry, 8e, 核苷酸与脂类代谢相关章节",
      "人卫版《生物化学》, 核酸代谢相关章节",
    ],
    related: [{ label: "RNA", to: "/substance/rna" }],
  },
  damp: {
    claim: "dAMP 是脱氧腺苷一磷酸，DNA 链中的腺嘌呤组成单位",
    aliases: ["脱氧腺苷酸", "deoxyadenosine monophosphate"],
    classification: "核苷酸；脱氧核苷酸",
    structure: "脱氧腺嘌呤核苷加一个磷酸基；2'-脱氧核糖是其与 AMP 的关键差别。",
    position: {
      title: "它是 DNA 的四种组成单位之一",
      body: "dAMP 是 DNA 四种组成单位之一，掺入后由磷酸二酯键连接成链；游离 dAMP 主要来自 DNA 降解或补救合成。站内未建 DNA 聚合通路，本站只写其在 DNA 中的位置。",
    },
    origin: {
      title: "它由 dATP 水解或补救途径生成",
      body: "由 dATP 水解或 dADP 去磷酸生成，也可经脱氧核苷补救途径形成；细胞内多以 dNTP 形式供聚合使用，补救合成比从头合成更节省能量。以上为教材章级内容，本平台未建该通路。",
    },
    significance: {
      title: "它决定 DNA 的腺嘌呤比例",
      body: "dAMP 比例影响 DNA 碱基组成；脱氧核苷酸供应不足会限制 DNA 复制，因此其合成与细胞增殖能力相关，也影响复制过程中碱基配对的准确性，复制前 dNTP 库的充足程度决定延伸能否持续。",
    },
    exam: {
      title: "考点是脱氧核糖与 dNTP 供体",
      items: [
        "dAMP 含 2'-脱氧核糖，AMP 含核糖。",
        "dAMP 是 DNA 的腺嘌呤组成单位。",
        "DNA 聚合使用 dNTP 而非 dNMP。",
        "dAMP 可由 dATP 水解生成。",
      ],
    },
    sources: [
      "Lehninger Principles of Biochemistry, 8e, 核苷酸与核酸相关章节",
      "人卫版《生物化学》, 核酸代谢相关章节",
    ],
    related: [
      { label: "DNA", to: "/substance/dna" },
      { label: "AMP", to: "/substance/amp" },
    ],
  },
  dgmp: {
    claim: "dGMP 是脱氧鸟苷一磷酸，DNA 链中的鸟嘌呤组成单位",
    aliases: ["脱氧鸟苷酸", "deoxyguanosine monophosphate"],
    classification: "核苷酸；脱氧核苷酸",
    structure: "脱氧鸟嘌呤核苷加一个磷酸基；与 GMP 的差别在 2'-脱氧核糖。",
    position: {
      title: "它是 DNA 的鸟嘌呤组成单位",
      body: "dGMP 是 DNA 四种组成单位之一；游离形式来自 DNA 降解或补救合成，聚合时以 dGTP 掺入。站内未建 DNA 聚合通路，本站只写其在 DNA 链中的位置。",
    },
    origin: {
      title: "它由 dGTP 水解或补救途径生成",
      body: "由 dGTP 水解或 dGDP 去磷酸生成，也可经脱氧核苷补救途径形成；细胞内的聚合底物是 dGTP，两类来源共同维持细胞内的脱氧核苷酸库。以上为教材章级内容，本平台未建该通路，不列具体酶名。",
    },
    significance: {
      title: "它与 dAMP 共同决定碱基组成",
      body: "dGMP 与 dAMP 等共同决定 DNA 碱基组成；其供应受限会拖慢复制，因此脱氧核苷酸平衡与基因组稳定性相关，也影响细胞周期能否顺利推进，碱基类似物掺入也会干扰这一平衡。",
    },
    exam: {
      title: "考点是脱氧核糖与碱基配对",
      items: [
        "dGMP 含 2'-脱氧核糖，GMP 含核糖。",
        "dGMP 是 DNA 的鸟嘌呤组成单位。",
        "dGMP 与 dCMP 在 DNA 中配对。",
        "DNA 聚合以 dGTP 为鸟嘌呤供体。",
      ],
    },
    sources: [
      "Lehninger Principles of Biochemistry, 8e, 核苷酸与核酸相关章节",
      "人卫版《生物化学》, 核酸代谢相关章节",
    ],
    related: [
      { label: "DNA", to: "/substance/dna" },
      { label: "dAMP", to: "/substance/damp" },
    ],
  },
  rna: {
    claim: "RNA 是核糖核酸，承担转录、翻译与催化的多重角色",
    aliases: ["核糖核酸", "ribonucleic acid"],
    classification: "核酸；核糖核酸",
    structure: "核糖与磷酸二酯键构成骨架，碱基为 A、U、G、C；多为单链，可形成局部双链与复杂折叠。",
    position: {
      title: "它按类型分工，而非单一功能分子",
      body: "RNA 在细胞中分为 mRNA、tRNA、rRNA 等，分别承担信息传递、氨基酸搬运与核糖体组装；部分小 RNA 参与调控。站内未建转录与翻译通路，本站只写类型分工。",
    },
    origin: {
      title: "它以 DNA 为模板转录生成",
      body: "由 RNA 聚合酶以 DNA 为模板转录生成，核糖核苷三磷酸为底物；转录后还可剪接与修饰，不同 RNA 类型的加工方式并不相同。以上为教材章级内容，本平台未建该通路，不展开聚合与加工步骤。",
    },
    significance: {
      title: "它是基因信息与蛋白质之间的载体",
      body: "RNA 是基因信息与蛋白质之间的中间载体，也是许多调控与催化过程的核心；RNA 病毒与 RNA 药物都以此为物质基础，因此 RNA 的稳定性与修饰状态直接影响其功能。",
    },
    exam: {
      title: "考点是核糖、尿嘧啶与类型分工",
      items: [
        "RNA 含核糖与尿嘧啶，DNA 含脱氧核糖与胸腺嘧啶。",
        "mRNA、tRNA、rRNA 的分工不同。",
        "RNA 聚合酶以 DNA 为模板合成 RNA。",
        "部分 RNA 具有催化功能。",
      ],
    },
    sources: [
      "Lehninger Principles of Biochemistry, 8e, 核酸与转录翻译相关章节",
      "人卫版《生物化学》, 核酸代谢相关章节",
    ],
    related: [
      { label: "DNA", to: "/substance/dna" },
      { label: "CTP", to: "/substance/ctp" },
    ],
  },
  dna: {
    claim: "DNA 是脱氧核糖核酸，是遗传信息的稳定载体",
    aliases: ["脱氧核糖核酸", "deoxyribonucleic acid"],
    classification: "核酸；脱氧核糖核酸",
    structure: "脱氧核糖与磷酸构成骨架，碱基为 A、T、G、C；通常为双螺旋，两条链反向平行。",
    position: {
      title: "它在核与线粒体中保存遗传信息",
      body: "DNA 主要位于细胞核，线粒体也有自己的 DNA；它以碱基序列保存遗传信息，并通过复制传给子代。站内未建复制与转录通路，本站只写其所在位置与信息角色，核 DNA 与线粒体 DNA 的复制方式也有差异。",
    },
    origin: {
      title: "它以半保留方式复制",
      body: "由 DNA 聚合酶在模板指导下聚合 dNTP 生成；复制是半保留的，子代分子含一条旧链与一条新链，复制起点与方向因分子类型而异。以上为教材章级内容，本平台未建该通路，不展开酶名与步骤。",
    },
    significance: {
      title: "序列决定产物，突变改变遗传信息",
      body: "DNA 序列决定蛋白质与 RNA 的序列，突变则改变遗传信息；因此 DNA 的稳定性与修复能力直接影响细胞命运与遗传病发生，也是遗传检测与分子诊断的物质基础，修复缺陷会累积突变进而影响细胞表型。",
    },
    exam: {
      title: "考点是双螺旋、半保留复制与 dNTP",
      items: [
        "DNA 含脱氧核糖与胸腺嘧啶。",
        "DNA 双螺旋两条链反向平行。",
        "DNA 复制是半保留复制。",
        "DNA 聚合酶以 dNTP 为底物。",
      ],
    },
    sources: [
      "Lehninger Principles of Biochemistry, 8e, 核酸与复制相关章节",
      "人卫版《生物化学》, 核酸代谢相关章节",
    ],
    related: [
      { label: "RNA", to: "/substance/rna" },
      { label: "dAMP", to: "/substance/damp" },
    ],
  },
  "vit-d": {
    claim: "维生素 D 是调节钙磷代谢与骨矿化的脂溶性维生素",
    aliases: ["胆钙化醇", "钙化醇"],
    classification: "维生素；脂溶性",
    structure: "开环甾体衍生物，由胆固醇骨架经紫外照射开环生成；D2 与 D3 侧链不同。",
    position: {
      title: "它需两步羟化才成为活性形式",
      body: "维生素 D 本身不是活性形式，需在肝与肾两次羟化生成 1,25-二羟维生素 D3，再作用于肠、骨与肾。站内未建该通路，本站只写其活化层级，不假装站内有对应通路。",
    },
    origin: {
      title: "它来自皮肤照射与膳食，再经肝肾活化",
      body: "皮肤中的 7-脱氢胆固醇经紫外线照射生成 D3，食物也可提供 D2 与 D3；活化需肝、肾两步羟化，活性形式的生成受钙需求与甲状旁腺激素调节。以上为教材章级内容，本平台未建该通路。",
    },
    significance: {
      title: "它促进肠钙吸收与骨矿化",
      body: "活性形式促进肠钙吸收与骨矿化；缺乏致佝偻病与骨软化，过量则高钙血症，因此维生素 D 与钙磷平衡和骨骼健康直接相关，补充时需注意剂量与监测，也是钙磷代谢评估中的常规检测项目。",
    },
    exam: {
      title: "考点是两次羟化与钙磷代谢",
      items: [
        "维生素 D 需经肝、肾两次羟化才具活性。",
        "7-脱氢胆固醇经紫外线照射生成维生素 D3。",
        "维生素 D 缺乏可致佝偻病或骨软化。",
        "活性维生素 D 促进肠钙吸收。",
      ],
    },
    sources: [
      "Lehninger Principles of Biochemistry, 8e, 维生素与钙磷代谢相关章节",
      "人卫版《生物化学》, 维生素相关章节",
    ],
    related: [{ label: "胆固醇", to: "/molecule/cholesterol" }],
  },
  "vit-e": {
    claim: "维生素 E 是保护膜脂免受氧化的脂溶性抗氧化剂",
    aliases: ["生育酚", "tocopherol"],
    classification: "维生素；脂溶性",
    structure: "生育酚的色满环带羟基，可提供氢自由基；侧链疏水，使其嵌入膜脂。",
    position: {
      title: "它嵌入膜疏水区，截获脂类自由基",
      body: "维生素 E 主要嵌在细胞膜与脂蛋白的疏水区，在脂类氧化链式反应中截获自由基；它与维生素 C 在膜内外协同再生。站内未建抗氧化通路，本站只写其膜内定位，脂蛋白中的维生素 E 也保护其携带的脂类。",
    },
    origin: {
      title: "它由植物合成，经脂类消化吸收",
      body: "由植物合成，植物油与坚果是主要膳食来源；吸收依赖胆汁酸与脂类消化，吸收后主要随乳糜微粒进入循环，再分布到各组织。以上为教材章级内容，本平台未建该通路，不列具体转运蛋白。",
    },
    significance: {
      title: "缺乏时膜脂易氧化而溶血",
      body: "缺乏时红细胞膜易受损而溶血，也可影响神经与免疫；过量补充则有出血风险，因此其作用与膜脂氧化应激密切相关，临床补充需权衡获益与风险，其需要量与膳食脂肪摄入量大致相关。",
    },
    exam: {
      title: "考点是生育酚与膜脂抗氧化",
      items: [
        "维生素 E 是脂溶性抗氧化剂，主要保护膜脂。",
        "生育酚通过提供氢自由基中断脂类氧化链。",
        "维生素 E 与维生素 C 可协同再生。",
        "吸收依赖胆汁酸与脂类消化。",
      ],
    },
    sources: [
      "Lehninger Principles of Biochemistry, 8e, 维生素与脂类氧化相关章节",
      "人卫版《生物化学》, 维生素相关章节",
    ],
    related: [{ label: "维生素 C", to: "/substance/vit-c" }],
  },
  "vit-k": {
    claim: "维生素 K 是凝血因子与骨蛋白 γ-羧化反应的必需辅因子",
    aliases: ["叶绿醌", "凝血维生素"],
    classification: "维生素；脂溶性",
    structure: "萘醌环带疏水侧链；还原型可反复参与 γ-羧化循环。",
    position: {
      title: "它作为 γ-羧化酶的辅因子",
      body: "维生素 K 是 γ-谷氨酰羧化酶的辅因子，使凝血因子与骨蛋白的谷氨酸残基羧化；反应在肝与骨中发生，羧化后的残基带负电，可结合钙离子与膜磷脂。站内未建该通路，本站只写其辅因子定位。",
    },
    origin: {
      title: "它来自植物与肠道菌群，经脂类吸收",
      body: "植物提供 K1，肠道菌群合成 K2；吸收依赖胆汁酸与脂类消化，K1 与 K2 的来源不同，但都可被同一循环利用。以上为教材章级内容，本平台未建该通路，不列具体转运与储存部位。",
    },
    significance: {
      title: "缺乏时凝血因子羧化不足而出血",
      body: "缺乏时凝血因子羧化不足，出现出血倾向；新生儿与长期抗生素使用者风险较高，因此维生素 K 与止血和骨代谢都相关，围产期补充是常见预防措施，华法林正是通过干扰该循环发挥抗凝作用。",
    },
    exam: {
      title: "考点是 γ-羧化与凝血因子",
      items: [
        "维生素 K 是 γ-羧化反应的辅因子。",
        "凝血因子Ⅱ、Ⅶ、Ⅸ、Ⅹ 的活化依赖维生素 K。",
        "维生素 K 缺乏可致出血倾向。",
        "维生素 K 也参与骨蛋白羧化。",
      ],
    },
    sources: [
      "Lehninger Principles of Biochemistry, 8e, 维生素与凝血相关章节",
      "人卫版《生物化学》, 维生素相关章节",
    ],
  },
  "vit-b1": {
    claim: "维生素 B1 的活性形式 TPP 是脱羧酶与转酮酶的辅因子",
    aliases: ["硫胺素", "thiamine"],
    classification: "维生素；水溶性 B 族",
    structure: "含嘧啶环与噻唑环，噻唑环的碳原子参与辅因子反应。",
    position: {
      title: "它以 TPP 形式进入糖代谢的脱羧步骤",
      body: "维生素 B1 在小肠吸收后经磷酸化生成 TPP，TPP 结合于丙酮酸脱氢酶复合体、α-酮戊二酸脱氢酶与转酮酶。站内未建维生素代谢通路，只链到 TPP 条目页，因此其缺乏最先影响依赖糖代谢的组织。",
    },
    origin: {
      title: "它由谷物与豆类提供，体内不能大量储存",
      body: "由食物提供，谷物外皮与豆类含量较高；体内不能大量储存，需持续摄入，缺乏时首先影响高耗能组织。谷物精加工会损失较多硫胺素，因此主食过度精制是风险因素，以上为教材章级内容，本平台未建该通路。",
    },
    significance: {
      title: "缺乏阻断丙酮酸进入三羧酸循环",
      body: "缺乏致脚气病与韦尼克脑病，表现为神经与心功能异常；TPP 供应不足会阻断丙酮酸进入三羧酸循环，因此其营养状态与糖代谢直接相关，酗酒者风险更高，补充硫胺素后症状通常可较快改善。",
    },
    exam: {
      title: "考点是 TPP 与脱羧、转酮反应",
      items: [
        "维生素 B1 的活性形式是 TPP。",
        "TPP 参与丙酮酸脱氢与 α-酮戊二酸脱氢。",
        "TPP 也是转酮酶的辅因子。",
        "维生素 B1 缺乏可致脚气病。",
      ],
    },
    sources: [
      "Lehninger Principles of Biochemistry, 8e, 维生素与糖代谢相关章节",
      "人卫版《生物化学》, 维生素相关章节",
    ],
    related: [{ label: "TPP", to: "/substance/tpp" }],
  },
  "vit-b2": {
    claim: "维生素 B2 的活性形式 FMN 与 FAD 是氧化还原反应的电子载体",
    aliases: ["核黄素", "riboflavin"],
    classification: "维生素；水溶性 B 族",
    structure: "异咯嗪环为核心，核糖醇侧链连接；异咯嗪环可接受两个电子与两个质子。",
    position: {
      title: "它以 FMN 与 FAD 进入氧化还原反应",
      body: "维生素 B2 在小肠吸收后经磷酸化生成 FMN，再经腺苷化生成 FAD；两者作为辅基结合于脱氢酶与氧化酶，参与底物脱氢。站内未建维生素代谢通路，本站只写辅因子定位。",
    },
    origin: {
      title: "它由奶蛋与肝脏提供，体内储存有限",
      body: "由食物提供，奶类、蛋类与肝脏含量较高；吸收后主要在肝内转为辅因子形式，体内储存有限，膳食来源以动物性食物为主，植物性食物含量较低。以上为教材章级内容，本平台未建该通路，不展开转运步骤。",
    },
    significance: {
      title: "缺乏时口角炎与舌炎较典型",
      body: "缺乏时出现口角炎、舌炎与脂溢性皮炎；因其参与多个氧化还原反应，缺乏会影响能量代谢与黏膜更新，因此其状态常与整体营养水平并行评估，评估核黄素状态时常结合多项缺乏体征。",
    },
    exam: {
      title: "考点是 FMN、FAD 与异咯嗪环",
      items: [
        "维生素 B2 的活性形式是 FMN 与 FAD。",
        "FAD 由 FMN 腺苷化生成。",
        "异咯嗪环可传递两个电子与两个质子。",
        "维生素 B2 缺乏可致口角炎与舌炎。",
      ],
    },
    sources: [
      "Lehninger Principles of Biochemistry, 8e, 维生素与氧化还原相关章节",
      "人卫版《生物化学》, 维生素相关章节",
    ],
    related: [
      { label: "FAD", to: "/molecule/fad" },
      { label: "FMN", to: "/substance/fmn" },
    ],
  },
  "vit-b3": {
    claim: "维生素 B3 的活性形式 NAD 与 NADP 是氧化还原反应的电子载体",
    aliases: ["烟酸", "niacin"],
    classification: "维生素；水溶性 B 族",
    structure: "烟酰胺环与核糖、磷酸构成；NADP 比 NAD 多一个磷酸基。",
    position: {
      title: "NAD 管分解代谢，NADP 管合成代谢",
      body: "NAD 主要参与分解代谢，接受底物脱下的电子；NADP 主要参与合成代谢，提供还原力。站内未建维生素代谢通路，本站只写两种辅因子的分工，不展开酶促步骤，两者在细胞内保持一定比例以匹配合成与分解需求。",
    },
    origin: {
      title: "它可由膳食提供，也可由色氨酸转化",
      body: "可由食物提供，也可由色氨酸转化；色氨酸转化效率有限，因此烟酸当量需合并计算，烟酸当量以烟酸与色氨酸折算值合计表示。以上为教材章级内容，本平台未建该通路，不列具体转化步骤。",
    },
    significance: {
      title: "缺乏致癞皮病，过量则伤肝",
      body: "缺乏致癞皮病，表现为皮炎、腹泻与痴呆；过量补充则可能引起皮肤潮红与肝损伤，因此其摄入需兼顾缺乏与过量风险，补充剂量不宜随意加大，补充烟酸需在专业指导下进行并定期复评。",
    },
    exam: {
      title: "考点是 NAD/NADP 分工与癞皮病",
      items: [
        "维生素 B3 的活性形式是 NAD 与 NADP。",
        "NAD 主要参与分解代谢，NADP 主要参与合成代谢。",
        "色氨酸可在体内转化为烟酸。",
        "烟酸缺乏可致癞皮病。",
      ],
    },
    sources: [
      "Lehninger Principles of Biochemistry, 8e, 维生素与氧化还原相关章节",
      "人卫版《生物化学》, 维生素相关章节",
    ],
    related: [
      { label: "NAD", to: "/molecule/nad" },
      { label: "NADP", to: "/molecule/nadp" },
    ],
  },
  "vit-b5": {
    claim: "维生素 B5 是辅酶 A 的组成成分，参与酰基转移反应",
    aliases: ["泛酸", "pantothenic acid"],
    classification: "维生素；水溶性 B 族",
    structure: "泛酸由泛解酸与β-丙氨酸构成，是辅酶 A 的骨架部分。",
    position: {
      title: "它装配成辅酶 A 后携带酰基",
      body: "维生素 B5 经磷酸化与腺苷化装配成辅酶 A，辅酶 A 在三羧酸循环、脂肪酸氧化与合成中携带酰基。站内未建维生素代谢通路，只链到辅酶 A 档案，不重复其结构页。",
    },
    origin: {
      title: "它广泛存在于动植物食物中",
      body: "广泛存在于食物中，谷类、豆类与动物组织均含；吸收后参与辅酶 A 的装配，泛酸性质稳定，一般烹调损失不大。以上为教材章级内容，本平台未建该通路，不列装配步骤与酶名。",
    },
    significance: {
      title: "缺乏少见，多与其他 B 族缺乏并存",
      body: "缺乏单独出现较少，通常与其他 B 族维生素缺乏并存；辅酶 A 供应不足会影响酰基转移与能量代谢，因此其状态更多作为整体营养评估的一部分，辅酶 A 水平下降会牵连多个酰基转移反应。",
    },
    exam: {
      title: "考点是泛酸与辅酶 A",
      items: [
        "维生素 B5 即泛酸，是辅酶 A 的组成成分。",
        "辅酶 A 在代谢中携带酰基。",
        "泛酸广泛存在于动植物食物中。",
        "辅酶 A 参与三羧酸循环与脂肪酸代谢。",
      ],
    },
    sources: [
      "Lehninger Principles of Biochemistry, 8e, 维生素与辅酶相关章节",
      "人卫版《生物化学》, 维生素相关章节",
    ],
    related: [{ label: "辅酶 A", to: "/molecule/coa" }],
  },
  "vit-b6": {
    claim: "维生素 B6 的活性形式 PLP 是转氨酶与脱羧酶的辅因子",
    aliases: ["吡哆醇", "pyridoxine"],
    classification: "维生素；水溶性 B 族",
    structure: "吡啶环带羟甲基，PLP 的醛基可与底物氨基形成希夫碱。",
    position: {
      title: "PLP 以希夫碱参与转氨与脱羧",
      body: "维生素 B6 经磷酸化生成 PLP，PLP 以希夫碱形式参与转氨、脱羧与消旋反应，也作为糖原磷酸化酶的辅因子。站内未建维生素代谢通路，只链到 PLP 条目页，因此 PLP 供应影响氨基酸代谢的整体通量。",
    },
    origin: {
      title: "它由谷物豆类提供，需持续摄入",
      body: "由食物提供，谷物、豆类与动物组织均含；体内需持续摄入，缺乏常与药物或慢性病相关，谷物精加工也会损失部分吡哆醇。以上为教材章级内容，本平台未建该通路，不列储存部位。",
    },
    significance: {
      title: "缺乏致神经病与贫血，药物可干扰",
      body: "缺乏可致周围神经病、贫血与婴儿惊厥；异烟肼等药物会干扰 PLP 作用，因此用药期间需关注神经系统症状与补充需求，必要时监测血象与神经体征，补充与停药时机需结合用药方案判断。",
    },
    exam: {
      title: "考点是 PLP、希夫碱与药物干扰",
      items: [
        "维生素 B6 的活性形式是 PLP。",
        "PLP 以希夫碱形式参与转氨反应。",
        "PLP 也是糖原磷酸化酶的辅因子。",
        "异烟肼可干扰 PLP 的作用。",
      ],
    },
    sources: [
      "Lehninger Principles of Biochemistry, 8e, 维生素与氨基酸代谢相关章节",
      "人卫版《生物化学》, 维生素相关章节",
    ],
    related: [{ label: "PLP", to: "/substance/plp" }],
  },
  "vit-b7": {
    claim: "维生素 B7 是生物素本体，作为羧化酶的共价辅基参与羧化反应",
    aliases: ["生物素", "biotin"],
    classification: "维生素；水溶性 B 族",
    structure: "含咪唑啉酮环与戊酸侧链，侧链羧基与酶蛋白赖氨酸残基共价连接。",
    position: {
      title: "它与羧化酶共价结合，转移二氧化碳",
      body: "维生素 B7 与酶蛋白共价结合成羧化酶辅基，在丙酮酸羧化、乙酰辅酶 A 羧化与丙酰辅酶 A 羧化中转移二氧化碳。站内未建维生素代谢通路，只链到生物素条目页，该辅基在羧化后需经转羧基步骤再生。",
    },
    origin: {
      title: "它由食物与肠道菌群提供，生蛋清会阻碍吸收",
      body: "由食物与肠道菌群提供，生蛋清中的抗生物素蛋白会结合并阻碍其吸收，肠道菌群合成可提供一部分，但难以完全替代膳食来源。以上为教材章级内容，本平台未建该通路，不展开转运步骤与酶名。",
    },
    significance: {
      title: "缺乏少见，长期生食蛋清者风险较高",
      body: "缺乏少见，表现为皮炎、脱发与神经系统症状；长期生食蛋清或全静脉营养者可出现缺乏，因此其风险与膳食和营养支持方式相关，需针对性评估，长期生食蛋清者应调整饮食或补充生物素。",
    },
    exam: {
      title: "考点是共价辅基与抗生物素蛋白",
      items: [
        "维生素 B7 即生物素，是羧化酶的共价辅基。",
        "生物素通过赖氨酸残基与酶蛋白连接。",
        "抗生物素蛋白会阻碍生物素吸收。",
        "生物素参与丙酮酸与乙酰辅酶 A 的羧化。",
      ],
    },
    sources: [
      "Lehninger Principles of Biochemistry, 8e, 维生素与羧化反应相关章节",
      "人卫版《生物化学》, 维生素相关章节",
    ],
    related: [{ label: "生物素", to: "/substance/biotin" }],
  },
  "vit-b9": {
    claim: "维生素 B9 的活性形式 THF 是一碳单位的载体",
    aliases: ["叶酸", "folate"],
    classification: "维生素；水溶性 B 族",
    structure: "蝶啶环、对氨基苯甲酸与谷氨酸构成；THF 可携带不同氧化态的一碳单位。",
    position: {
      title: "THF 在核苷酸与氨基酸代谢中转移一碳单位",
      body: "THF 在核苷酸合成与氨基酸代谢中转移一碳单位，参与胸苷酸与嘌呤的合成，也参与甲硫氨酸循环。站内未建维生素代谢通路，只链到 THF 条目页，不展开循环步骤，因此叶酸状态直接影响 DNA 合成的原料供应。",
    },
    origin: {
      title: "它来自绿叶蔬菜，需还原与多谷氨酸化",
      body: "由食物提供，绿叶蔬菜含量较高；吸收后需经还原与多谷氨酸化才成为活性形式，多谷氨酸化可增加其与酶的亲和力并保留在细胞内。以上为教材章级内容，本平台未建该通路，不列具体酶名。",
    },
    significance: {
      title: "缺乏致巨幼细胞贫血与神经管缺陷",
      body: "缺乏致巨幼细胞贫血，孕期缺乏增加神经管缺陷风险；因此围孕期补充叶酸是常规预防措施，也需注意其可能掩盖维生素 B12 缺乏的血液学表现，补充剂量与时机应结合孕周与个体风险评估。",
    },
    exam: {
      title: "考点是 THF、胸苷酸与神经管缺陷",
      items: [
        "维生素 B9 的活性形式是 THF。",
        "THF 参与胸苷酸与嘌呤合成。",
        "叶酸缺乏可致巨幼细胞贫血。",
        "围孕期补充叶酸可降低神经管缺陷风险。",
      ],
    },
    sources: [
      "Lehninger Principles of Biochemistry, 8e, 维生素与一碳单位相关章节",
      "人卫版《生物化学》, 维生素相关章节",
    ],
    related: [
      { label: "THF", to: "/substance/thf" },
      { label: "维生素 B12", to: "/substance/vit-b12" },
    ],
  },
  "vit-b12": {
    claim: "维生素 B12 是含钴的维生素，参与甲基转移与甲基丙二酰辅酶 A 代谢",
    aliases: ["钴胺素", "cobalamin"],
    classification: "维生素；水溶性 B 族",
    structure: "咕啉环中心配位钴离子，是唯一含金属的维生素。",
    position: {
      title: "它以两种辅因子形式进入两类反应",
      body: "维生素 B12 以甲基钴胺素与脱氧腺苷钴胺素两种辅因子形式发挥作用，分别参与甲硫氨酸合成与甲基丙二酰辅酶 A 变位。站内未建维生素代谢通路，本站只写辅因子分工。",
    },
    origin: {
      title: "它由微生物合成，吸收依赖内因子",
      body: "由微生物合成，动物性食物是主要来源；吸收需胃壁细胞分泌的内因子，并在回肠完成，因此胃切除或萎缩性胃炎患者更易出现吸收不足。以上为教材章级内容，本平台未建该通路，不展开转运细节。",
    },
    significance: {
      title: "缺乏致巨幼细胞贫血与神经损害",
      body: "缺乏致巨幼细胞贫血与神经系统损害，内因子缺失可致恶性贫血；因此其缺乏常与胃部疾病和吸收障碍相关，神经系统症状可早于贫血出现，需及早识别，血象与神经症状需同时评估，不能只看贫血。",
    },
    exam: {
      title: "考点是钴、内因子与两类辅因子",
      items: [
        "维生素 B12 是唯一含钴的维生素。",
        "内因子是维生素 B12 吸收所必需。",
        "维生素 B12 参与甲硫氨酸合成。",
        "缺乏可致巨幼细胞贫血与神经损害。",
      ],
    },
    sources: [
      "Lehninger Principles of Biochemistry, 8e, 维生素与一碳单位相关章节",
      "人卫版《生物化学》, 维生素相关章节",
    ],
    related: [{ label: "维生素 B9", to: "/substance/vit-b9" }],
  },
  tpp: {
    claim: "TPP 是硫胺素焦磷酸，是脱羧酶与转酮酶的辅因子",
    aliases: ["硫胺素焦磷酸", "thiamine pyrophosphate"],
    classification: "辅因子；维生素 B1 活性形式",
    structure: "嘧啶环与噻唑环相连，噻唑环的碳负离子参与碳碳键断裂。",
    position: {
      title: "它结合于脱羧酶与转酮酶",
      body: "TPP 结合于丙酮酸脱氢酶复合体、α-酮戊二酸脱氢酶、转酮酶与支链α-酮酸脱氢酶，参与脱羧与碳链转移。站内未建辅因子通路，本站只写其结合位点与反应类型，它的缺乏会同时影响多条以脱羧起始的通路。",
    },
    origin: {
      title: "它由硫胺素磷酸化生成",
      body: "由维生素 B1 经磷酸化生成，不能由人体从头合成；因此 TPP 供应取决于硫胺素摄入，硫胺素在体内转化效率有限，摄入不足时 TPP 随之下降。以上为教材章级内容，本平台未建该通路，不列具体激酶名称。",
    },
    significance: {
      title: "不足时氧化脱羧受阻，神经心脏受累",
      body: "TPP 不足会阻断丙酮酸与α-酮戊二酸的氧化脱羧，导致能量代谢受阻；因此其状态与神经系统和心脏功能密切相关，缺乏时症状进展较快，需及时补充，因此其缺乏常以神经与心血管表现同时出现。",
    },
    exam: {
      title: "考点是 TPP 的三类反应",
      items: [
        "TPP 是维生素 B1 的活性形式。",
        "TPP 参与丙酮酸脱氢与α-酮戊二酸脱氢。",
        "TPP 是转酮酶的辅因子。",
        "TPP 缺乏会阻断三羧酸循环上游。",
      ],
    },
    sources: [
      "Lehninger Principles of Biochemistry, 8e, 维生素与辅酶相关章节",
      "人卫版《生物化学》, 维生素相关章节",
    ],
    related: [{ label: "维生素 B1", to: "/substance/vit-b1" }],
  },
  fmn: {
    claim: "FMN 是黄素单核苷酸，是黄素蛋白传递电子的辅基",
    aliases: ["黄素单核苷酸", "flavin mononucleotide"],
    classification: "辅因子；维生素 B2 活性形式",
    structure: "异咯嗪环与核糖醇磷酸构成；异咯嗪环可逆地接受电子与质子。",
    position: {
      title: "它在电子传递链中把电子交给铁硫中心",
      body: "FMN 作为辅基结合于复合体 I 等黄素蛋白，在电子传递链中把电子交给铁硫中心；它也可参与氧化酶催化的反应。站内未建辅因子通路，本站只写其电子载体定位，因此其氧化还原状态直接影响电子流的方向与速率。",
    },
    origin: {
      title: "它由核黄素磷酸化生成",
      body: "由维生素 B2 经磷酸化生成，不能由人体从头合成；因此 FMN 供应取决于核黄素摄入，核黄素缺乏时 FMN 与 FAD 都会同步下降。以上为教材章级内容，本平台未建该通路，不列具体酶名与步骤。",
    },
    significance: {
      title: "它影响呼吸链效率与抗氧化能力",
      body: "FMN 参与呼吸链与多种氧化还原反应；其不足会影响电子传递效率，因此核黄素状态与能量代谢和抗氧化能力都相关，缺乏时表现常较为隐匿，因此核黄素补充对维持呼吸链功能具有基础意义。",
    },
    exam: {
      title: "考点是异咯嗪环与复合体 I",
      items: [
        "FMN 是维生素 B2 的活性形式之一。",
        "FMN 的异咯嗪环可传递电子与质子。",
        "FMN 参与复合体 I 的电子传递。",
        "FMN 由核黄素磷酸化生成。",
      ],
    },
    sources: [
      "Lehninger Principles of Biochemistry, 8e, 维生素与呼吸链相关章节",
      "人卫版《生物化学》, 维生素相关章节",
    ],
    related: [
      { label: "FAD", to: "/molecule/fad" },
      { label: "维生素 B2", to: "/substance/vit-b2" },
    ],
  },
  biotin: {
    claim: "生物素是羧化酶的共价辅基，在羧化反应中转移二氧化碳",
    aliases: ["维生素 B7", "biotin"],
    classification: "辅因子；维生素 B7 本体",
    structure: "咪唑啉酮环与戊酸侧链；侧链与酶蛋白赖氨酸残基形成酰胺键。",
    position: {
      title: "它与羧化酶共价结合并转移二氧化碳",
      body: "生物素与羧化酶共价结合，在丙酮酸羧化酶、乙酰辅酶 A 羧化酶与丙酰辅酶 A 羧化酶中转移二氧化碳。站内未建辅因子通路，本站只写其共价结合定位与反应类型，羧化反应因此成为糖异生与脂肪酸合成的起始步骤之一。",
    },
    origin: {
      title: "它由食物与肠道菌群提供",
      body: "由食物与肠道菌群提供，生蛋清中的抗生物素蛋白会与其结合并阻碍吸收，肠道菌群合成量有限，主要仍依赖膳食摄入。以上为教材章级内容，本平台未建该通路，不展开转运与储存部位。",
    },
    significance: {
      title: "缺乏削弱羧化反应，影响糖异生与脂合成",
      body: "生物素缺乏会削弱羧化反应，影响糖异生与脂肪酸合成；长期生食蛋清或全静脉营养者可出现缺乏，因此其风险与膳食和营养支持方式相关，需针对性补充，因此全静脉营养者需在配方中保证生物素供给。",
    },
    exam: {
      title: "考点是共价连接与三类羧化酶",
      items: [
        "生物素是羧化酶的共价辅基。",
        "生物素与酶蛋白赖氨酸残基共价连接。",
        "抗生物素蛋白会阻碍生物素吸收。",
        "生物素参与丙酮酸羧化与乙酰辅酶 A 羧化。",
      ],
    },
    sources: [
      "Lehninger Principles of Biochemistry, 8e, 维生素与羧化反应相关章节",
      "人卫版《生物化学》, 维生素相关章节",
    ],
    related: [{ label: "维生素 B7", to: "/substance/vit-b7" }],
  },
  thf: {
    claim: "THF 是四氢叶酸，是一碳单位代谢的核心载体",
    aliases: ["四氢叶酸", "tetrahydrofolate"],
    classification: "辅因子；维生素 B9 活性形式",
    structure: "蝶啶环、对氨基苯甲酸与多谷氨酸构成；N5 与 N10 位可携带一碳单位。",
    position: {
      title: "它在三类一碳转移反应中周转",
      body: "THF 在细胞质与线粒体中转移不同氧化态的一碳单位，参与胸苷酸合成、嘌呤合成与甲硫氨酸再生。站内未建一碳单位通路，本站只写其三类去向，不展开具体反应步骤与酶名。",
    },
    origin: {
      title: "它由叶酸还原并多谷氨酸化生成",
      body: "由叶酸经还原生成，需多谷氨酸化才能保留在细胞内；人体不能从头合成蝶啶环，因此必须依赖膳食叶酸，叶酸缺乏时该辅因子随之减少。以上为教材章级内容，本平台未建该通路，不列酶名。",
    },
    significance: {
      title: "供应不足削弱 DNA 合成",
      body: "THF 供应不足会削弱 DNA 合成，导致巨幼细胞贫血；孕期需求增加与神经管缺陷相关，因此其状态在增殖活跃组织与围孕期尤为重要，补充时机也影响结局，因此其补充应与孕期管理衔接。",
    },
    exam: {
      title: "考点是一碳单位与三类合成",
      items: [
        "THF 是维生素 B9 的活性形式。",
        "THF 携带一碳单位，参与胸苷酸与嘌呤合成。",
        "THF 参与甲硫氨酸再生，需维生素 B12 协同。",
        "THF 不足可致巨幼细胞贫血。",
      ],
    },
    sources: [
      "Lehninger Principles of Biochemistry, 8e, 一碳单位与核苷酸合成相关章节",
      "人卫版《生物化学》, 维生素与核酸代谢相关章节",
    ],
    related: [
      { label: "维生素 B9", to: "/substance/vit-b9" },
      { label: "维生素 B12", to: "/substance/vit-b12" },
    ],
  },
  plp: {
    claim: "PLP 是磷酸吡哆醛，是转氨酶与脱羧酶的辅因子",
    aliases: ["磷酸吡哆醛", "pyridoxal phosphate"],
    classification: "辅因子；维生素 B6 活性形式",
    structure: "吡啶环带醛基，醛基与底物氨基形成希夫碱，稳定碳负离子中间体。",
    position: {
      title: "它以希夫碱结合底物氨基",
      body: "PLP 以希夫碱形式结合于转氨酶、脱羧酶与消旋酶，参与氨基酸的氨基转移与脱羧，也作为糖原磷酸化酶的辅因子。站内未建辅因子通路，本站只写其反应类型与结合方式，因此它连接氨基酸代谢与糖原分解。",
    },
    origin: {
      title: "它由吡哆醇磷酸化生成",
      body: "由维生素 B6 经磷酸化生成，人体不能从头合成吡啶环；因此 PLP 供应取决于吡哆醇摄入，膳食不足时辅因子生成随之受限。以上为教材章级内容，本平台未建该通路，不列具体激酶名称。",
    },
    significance: {
      title: "不足影响神经递质与氨基酸代谢",
      body: "PLP 不足会影响神经递质合成与氨基酸代谢，出现周围神经病、贫血与惊厥；异烟肼等药物会干扰其作用，因此用药与营养状态需同时评估，必要时补充，因此营养评估需覆盖用药史。",
    },
    exam: {
      title: "考点是希夫碱与药物干扰",
      items: [
        "PLP 是维生素 B6 的活性形式。",
        "PLP 以希夫碱形式参与转氨与脱羧。",
        "PLP 也是糖原磷酸化酶的辅因子。",
        "异烟肼可干扰 PLP 的作用。",
      ],
    },
    sources: [
      "Lehninger Principles of Biochemistry, 8e, 维生素与氨基酸代谢相关章节",
      "人卫版《生物化学》, 维生素相关章节",
    ],
    related: [{ label: "维生素 B6", to: "/substance/vit-b6" }],
  },
  insulin: {
    claim: "胰岛素是胰岛 β 细胞分泌的降血糖激素，促进合成代谢",
    aliases: ["降糖激素", "insulin"],
    classification: "激素；肽类激素",
    structure: "由 A、B 两条肽链经二硫键连接，前体为胰岛素原。",
    position: {
      title: "它作用于肝、肌肉与脂肪组织",
      body: "胰岛素由胰岛 β 细胞分泌，经门静脉入肝后分布全身；它作用于肝、肌肉与脂肪组织，促进葡萄糖摄取与糖原、脂肪、蛋白质合成。站内未建胰岛素信号通路，本站只写其靶组织定位。",
    },
    origin: {
      title: "它由胰岛素原酶切后随颗粒释放",
      body: "由胰岛素原经酶切生成并随分泌颗粒释放；血糖升高是主要刺激，分泌受神经与激素调节，因此其释放量与血糖水平相互匹配。以上为教材章级内容，本平台未建该通路，不展开受体后信号步骤。",
    },
    significance: {
      title: "不足或抵抗都会升高血糖",
      body: "胰岛素不足或作用受阻会升高血糖，1 型糖尿病以分泌不足为主，2 型以抵抗为主；因此它也是血糖调控的核心激素与治疗药物，其作用状态决定糖脂代谢走向，因此治疗需兼顾分泌与抵抗两方面。",
    },
    exam: {
      title: "考点是 β 细胞、合成代谢与糖尿病",
      items: [
        "胰岛素由胰岛 β 细胞分泌。",
        "胰岛素促进糖原、脂肪与蛋白质合成。",
        "胰岛素不足可致高血糖与酮症。",
        "胰岛素原经酶切生成胰岛素。",
      ],
    },
    sources: [
      "Lehninger Principles of Biochemistry, 8e, 激素与代谢整合相关章节",
      "人卫版《生物化学》, 激素与糖代谢相关章节",
    ],
    related: [
      { label: "糖原代谢", to: "/pathway/glycogen" },
      { label: "胰高血糖素", to: "/substance/glucagon" },
    ],
  },
  glucagon: {
    claim: "胰高血糖素是胰岛 α 细胞分泌的升血糖激素，动员储能",
    aliases: ["升糖激素", "glucagon"],
    classification: "激素；肽类激素",
    structure: "单链肽，由胰岛 α 细胞合成；与胰岛素的来源细胞不同。",
    position: {
      title: "它以肝为靶，促进糖原分解与糖异生",
      body: "胰高血糖素作用于肝，促进糖原分解与糖异生，抑制糖酵解；它也促进脂肪分解与酮体生成。站内未建激素信号通路，只链到糖异生与糖原通路页，不展开受体后步骤，因此肝是其主要效应器官。",
    },
    origin: {
      title: "它由胰岛 α 细胞分泌，低血糖时升高",
      body: "由胰岛 α 细胞分泌，低血糖、饥饿与运动是主要刺激；分泌受胰岛素与血糖水平调节，因此其水平随进食与空腹状态波动。以上为教材章级内容，本平台未建该通路，不列具体分泌调节细节。",
    },
    significance: {
      title: "它与胰岛素共同维持血糖稳态",
      body: "胰高血糖素与胰岛素共同维持血糖稳态；缺乏或过量都会打乱血糖，因此其与胰岛素的比例决定肝糖输出的方向，也是饥饿与运动时血糖得以维持的基础，因此两者比例失调会表现为血糖异常。",
    },
    exam: {
      title: "考点是 α 细胞与糖异生",
      items: [
        "胰高血糖素由胰岛 α 细胞分泌。",
        "胰高血糖素促进糖原分解与糖异生。",
        "胰高血糖素与胰岛素作用相反。",
        "低血糖刺激胰高血糖素分泌。",
      ],
    },
    sources: [
      "Lehninger Principles of Biochemistry, 8e, 激素与代谢整合相关章节",
      "人卫版《生物化学》, 激素与糖代谢相关章节",
    ],
    related: [
      { label: "糖异生", to: "/pathway/gluconeogenesis" },
      { label: "糖原代谢", to: "/pathway/glycogen" },
      { label: "胰岛素", to: "/substance/insulin" },
    ],
  },
  epinephrine: {
    claim: "肾上腺素是肾上腺髓质分泌的儿茶酚胺，应激时快速升高血糖",
    aliases: ["adrenaline", "epinephrine"],
    classification: "激素；儿茶酚胺",
    structure: "儿茶酚环带羟基，含氨基侧链；由酪氨酸经多步合成。",
    position: {
      title: "它经 α 与 β 受体动员能量",
      body: "肾上腺素在应激时释放，作用于 α 与 β 受体；它促进肝糖原分解与脂肪分解，并使心率与血压升高。站内未建受体信号通路，只链到糖原通路页，不展开受体后级联，因此它把应激信号转为代谢与循环反应。",
    },
    origin: {
      title: "它由肾上腺髓质合成并释放",
      body: "由肾上腺髓质合成并释放，交感神经兴奋是主要刺激；它也可作为神经递质参与局部信号，因此其释放量与交感兴奋程度一致。以上为教材章级内容，本平台未建该通路，不列具体合成步骤与酶名。",
    },
    significance: {
      title: "它为应激提供快速能量与循环支持",
      body: "肾上腺素为应激提供快速能量与循环支持；过量或分泌性肿瘤会引起心悸、高血压与高血糖，因此其水平与交感张力相关，也是急诊循环支持药物的基础，因此其作用具有起效快、持续时间短的特点。",
    },
    exam: {
      title: "考点是髓质来源与糖原分解",
      items: [
        "肾上腺素由肾上腺髓质分泌。",
        "肾上腺素促进糖原分解与脂肪分解。",
        "肾上腺素作用于 α 与 β 受体。",
        "应激时肾上腺素迅速升高。",
      ],
    },
    sources: [
      "Lehninger Principles of Biochemistry, 8e, 激素与代谢整合相关章节",
      "人卫版《生物化学》, 激素相关章节",
    ],
    related: [
      { label: "糖原代谢", to: "/pathway/glycogen" },
      { label: "去甲肾上腺素", to: "/substance/norepinephrine" },
    ],
  },
  norepinephrine: {
    claim: "去甲肾上腺素是儿茶酚胺类神经递质，也是交感神经的效应分子",
    aliases: ["noradrenaline", "norepinephrine"],
    classification: "激素与神经递质；儿茶酚胺",
    structure: "儿茶酚环带羟基与氨基侧链；比肾上腺素少一个甲基。",
    position: {
      title: "它主要由交感神经末梢释放",
      body: "去甲肾上腺素既是交感神经末梢的递质，也由肾上腺髓质少量分泌；它主要作用于 α 受体，引起血管收缩与血压升高。站内未建受体信号通路，本站只写其释放部位与效应方向。",
    },
    origin: {
      title: "它由酪氨酸合成并储存于囊泡",
      body: "由酪氨酸经多步合成，储存于囊泡并在交感兴奋时释放；释放后部分被再摄取，因此其作用范围取决于释放部位。以上为教材章级内容，本平台未建该通路，不列具体合成步骤与酶名。",
    },
    significance: {
      title: "它维持血管张力与应激反应",
      body: "去甲肾上腺素维持血管张力与血压，也参与注意力与应激反应；其水平异常与高血压、休克等循环状态相关，因此常作为循环监测指标，也用于升压治疗，因此其水平变化常提示交感张力改变。",
    },
    exam: {
      title: "考点是交感递质与 α 受体",
      items: [
        "去甲肾上腺素是交感神经递质。",
        "去甲肾上腺素主要作用于 α 受体。",
        "去甲肾上腺素比肾上腺素少一个甲基。",
        "去甲肾上腺素升高血压。",
      ],
    },
    sources: [
      "Lehninger Principles of Biochemistry, 8e, 激素与神经递质相关章节",
      "人卫版《生物化学》, 激素相关章节",
    ],
    related: [{ label: "肾上腺素", to: "/substance/epinephrine" }],
  },
  cortisol: {
    claim: "皮质醇是肾上腺皮质激素，促进糖异生并抑制免疫炎症",
    aliases: ["氢化可的松", "cortisol"],
    classification: "激素；糖皮质激素",
    structure: "甾体激素，含环戊烷多氢菲骨架；由胆固醇衍生。",
    position: {
      title: "它作用于肝、肌肉与脂肪组织",
      body: "皮质醇由肾上腺皮质束状带分泌，作用于肝、肌肉与脂肪组织；它促进糖异生与蛋白分解，并抑制炎症与免疫反应。站内未建激素信号通路，本站只写其靶组织与效应方向，因此肝糖输出与蛋白分解同步增加。",
    },
    origin: {
      title: "它由胆固醇生成，受 HPA 轴调节",
      body: "由胆固醇经多步羟化生成，分泌受下丘脑-垂体-肾上腺轴调节，呈昼夜节律，因此其水平随昼夜节律明显波动。以上为教材章级内容，本平台未建该通路，不列具体羟化步骤与酶名。",
    },
    significance: {
      title: "过量致库欣综合征，不足致功能不全",
      body: "皮质醇过量致库欣综合征，不足致肾上腺功能不全；应激时它升高血糖并维持循环，因此其水平与代谢、免疫和应激反应都相关，临床评估需结合节律与病因，因此其评估不能只看单次随机值。",
    },
    exam: {
      title: "考点是糖异生、HPA 轴与库欣综合征",
      items: [
        "皮质醇是糖皮质激素，促进糖异生。",
        "皮质醇分泌受下丘脑-垂体-肾上腺轴调节。",
        "皮质醇过量可致库欣综合征。",
        "皮质醇具有抗炎与免疫抑制作用。",
      ],
    },
    sources: [
      "Lehninger Principles of Biochemistry, 8e, 激素与代谢整合相关章节",
      "人卫版《生物化学》, 激素相关章节",
    ],
    related: [
      { label: "糖异生", to: "/pathway/gluconeogenesis" },
      { label: "胆固醇", to: "/molecule/cholesterol" },
    ],
  },
  ip3: {
    claim: "IP3 是肌醇三磷酸，是磷脂酰肌醇信号通路的水溶性第二信使",
    aliases: ["肌醇三磷酸", "inositol trisphosphate"],
    classification: "信号分子；第二信使",
    structure: "肌醇环带三个磷酸基；由 PIP2 水解生成，水溶性强。",
    position: {
      title: "它进入细胞质，促使内质网释放钙",
      body: "IP3 在细胞膜生成后进入细胞质，结合内质网受体，促使钙离子释放；它本身不进入细胞核，作用局限于局部。站内未建信号通路，只链到相关条目页，不展开受体类型，因此其作用迅速而局限。",
    },
    origin: {
      title: "它由磷脂酶 C 水解 PIP2 生成",
      body: "由磷脂酶 C 水解 PIP2 生成，与 DAG 同时产生；其水平受受体与 G 蛋白调控，信号随后被磷酸酶终止。以上为教材章级内容，本平台未建该通路，不列具体酶名。",
    },
    significance: {
      title: "它把膜受体信号转为细胞内钙信号",
      body: "IP3 引起的钙释放参与分泌、收缩与基因表达调控；因此它把膜受体信号转为细胞内钙信号，是跨膜信号转导的关键节点，其幅度与持续时间决定下游反应，因此其信号强度与受体激活程度相关。",
    },
    exam: {
      title: "考点是 PIP2 水解与钙释放",
      items: [
        "IP3 由 PIP2 水解生成。",
        "IP3 作用于内质网并促使钙释放。",
        "IP3 与 DAG 由同一反应同时产生。",
        "IP3 是水溶性第二信使。",
      ],
    },
    sources: [
      "Lehninger Principles of Biochemistry, 8e, 信号转导相关章节",
      "人卫版《生物化学》, 信号转导相关章节",
    ],
    related: [
      { label: "DAG", to: "/substance/dag" },
      { label: "磷脂酰肌醇", to: "/substance/pi-lipid" },
    ],
  },
  dag: {
    claim: "DAG 是二酰甘油，是磷脂酰肌醇信号通路的脂溶性第二信使",
    aliases: ["二酰甘油", "diacylglycerol"],
    classification: "信号分子；第二信使",
    structure: "甘油骨架连两个脂肪酸；疏水性强，生成后留在膜内。",
    position: {
      title: "它留在膜上，与钙共同激活蛋白激酶 C",
      body: "DAG 在膜内生成并保留于膜上，与钙离子共同激活蛋白激酶 C；它也是甘油三酯合成的中间物。站内未建信号通路，只链到相关条目页，不展开下游靶蛋白，因此其信号作用限于膜附近。",
    },
    origin: {
      title: "它由 PIP2 水解生成，与 IP3 同时产生",
      body: "由磷脂酶 C 水解 PIP2 生成，与 IP3 同时产生；也可来自磷脂酸去磷酸，两条来源汇入同一脂质池，因此其水平随受体激活而短暂升高。以上为教材章级内容，本平台未建该通路，不列具体酶名。",
    },
    significance: {
      title: "它经蛋白激酶 C 影响增殖与分泌",
      body: "DAG 通过蛋白激酶 C 影响细胞增殖、分泌与收缩；因其留在膜内，作用范围与 IP3 的钙信号互补，两者共同构成磷脂酰肌醇信号的两个分支，协同决定细胞反应，因此它与 IP3 的信号在时间上相互配合。",
    },
    exam: {
      title: "考点是膜内定位与蛋白激酶 C",
      items: [
        "DAG 由 PIP2 水解生成。",
        "DAG 留在膜内并激活蛋白激酶 C。",
        "DAG 与 IP3 同时产生。",
        "DAG 也是甘油三酯合成的中间物。",
      ],
    },
    sources: [
      "Lehninger Principles of Biochemistry, 8e, 信号转导相关章节",
      "人卫版《生物化学》, 信号转导相关章节",
    ],
    related: [
      { label: "IP3", to: "/substance/ip3" },
      { label: "磷脂酰肌醇", to: "/substance/pi-lipid" },
    ],
  },
  no: {
    claim: "一氧化氮是气体信使，由精氨酸生成并引起血管舒张",
    aliases: ["一氧化氮", "nitric oxide"],
    classification: "信号分子；气体信使",
    structure: "双原子自由基气体，半衰期短，脂溶性使其可自由跨膜扩散。",
    position: {
      title: "它由内皮扩散至平滑肌，激活鸟苷酸环化酶",
      body: "NO 由血管内皮等细胞生成后扩散至邻近平滑肌，激活可溶性鸟苷酸环化酶，使 cGMP 升高并引起血管舒张。站内未建信号通路，只链到 GTP 条目页，不展开受体类型。",
    },
    origin: {
      title: "它由 L-精氨酸经一氧化氮合酶生成",
      body: "由 L-精氨酸经一氧化氮合酶生成，反应需要氧与辅因子；生成量受内皮功能与刺激调节，因此其生成量可反映内皮功能状态。以上为教材章级内容，本平台未建该通路，不列具体辅因子与酶名。",
    },
    significance: {
      title: "它调节血管张力、血小板与神经信号",
      body: "NO 调节血管张力、血小板与神经信号；内皮 NO 不足与高血压和动脉硬化相关，硝酸甘油等药物也通过释放 NO 发挥作用，因此其生成能力反映内皮功能，因此其作用迅速但范围有限。",
    },
    exam: {
      title: "考点是精氨酸、cGMP 与血管舒张",
      items: [
        "NO 由 L-精氨酸生成。",
        "NO 激活可溶性鸟苷酸环化酶。",
        "NO 使 cGMP 升高并引起血管舒张。",
        "NO 是半衰期短的气体信使。",
      ],
    },
    sources: [
      "Lehninger Principles of Biochemistry, 8e, 信号转导相关章节",
      "人卫版《生物化学》, 信号转导相关章节",
    ],
    related: [{ label: "GTP", to: "/substance/gtp" }],
  },
};

for (const entry of ALL_SUBSTANCES) {
  const dossier = DOSSIERS[entry.id];
  if (dossier && !entry.moleculeId) entry.dossier = dossier;
}
