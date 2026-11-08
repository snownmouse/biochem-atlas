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
  classification: string;
  structure: string;
  position: SubstanceSectionContent;
  origin: SubstanceSectionContent;
  significance: SubstanceSectionContent;
  exam: { title: string; items: string[] };
  sources: string[];
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
      "视黄酯在肠道水解成视黄醇，随乳糜微粒经淋巴入血；β-胡萝卜素在肠黏膜裂解生成视黄醛，再还原为视黄醇。肝星状细胞储存视黄酯，需要时经视黄醇结合蛋白运往靶组织。",
  },
  significance: {
    title: "缺乏先影响暗适应，过量则伤肝并致畸",
    body:
      "缺乏时暗适应下降，进一步出现夜盲、结膜干燥与角膜软化；儿童缺乏还影响生长与免疫。长期过量摄入可致肝损伤、骨痛与致畸，脂溶性维生素不宜盲目补充。",
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
      "植物与多数动物可合成抗坏血酸；人缺少古洛糖酸内酯氧化酶，不能自身合成，必须从新鲜果蔬摄入。小肠吸收，过量主要经肾排出。",
  },
  significance: {
    title: "缺乏导致坏血病，表现为出血与愈合不良",
    body:
      "缺乏时胶原成熟受阻，出现牙龈出血、皮下瘀斑、伤口愈合不良与毛细血管脆性增加，即坏血病。长期不足还影响骨与结缔组织；过量补充可致胃肠不适与草酸盐负荷增加。",
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
  classification: "二糖；α-D-葡萄糖与 β-D-果糖",
  structure:
    "葡萄糖 C1 与果糖 C2 以 α-1,2-糖苷键相连，两个异头碳都参与成键，因此没有还原性。",
  position: {
    title: "它在植物里运输，在肠道里被水解后进入糖酵解",
    body:
      "植物把光合产物装成蔗糖运输；人体小肠刷状缘蔗糖酶把它水解为葡萄糖与果糖，两种单糖随后分别进入糖酵解。蔗糖本身没有独立代谢通路，不能当作糖酵解中间物。",
  },
  origin: {
    title: "它从甘蔗与甜菜来，消化后经门静脉入肝",
    body:
      "甘蔗与甜菜积累蔗糖；食用后蔗糖酶水解，葡萄糖与果糖经门静脉入肝。果糖主要在肝内磷酸化，再经醛缩酶裂解进入糖酵解。",
  },
  significance: {
    title: "它是膳食添加糖的主要形式，负荷落在果糖代谢",
    body:
      "蔗糖是日常添加糖的主要来源；大量摄入与能量过剩、果糖代谢负荷相关。蔗糖酶缺乏较少见，更多见的是乳糖酶缺乏，两者不要混淆。",
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
      { id: "ctp", name: "CTP", summary: "胞苷三磷酸，RNA 合成与磷脂合成的供能分子。" },
      { id: "amp", name: "AMP", summary: "腺苷一磷酸，ATP 水解后的低能形式。", moleculeId: "amp" },
      { id: "adp", name: "ADP", summary: "腺苷二磷酸，ATP 与 AMP 之间的中间形式。", moleculeId: "adp" },
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
