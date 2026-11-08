// ============================================================
// moleculeProfiles —— 页面上出现过的全部物质简介
//
// 骨架按国内教材的小节写法（人卫版 / 王镜岩）：每条先用判断句立论，
// 再按「分类归属 → 在链上的位置 → 生成与去路 → 生理/临床落点 → 考点与易错」展开。
// 不再单列「什么性质」；带电、溶解性只在直接影响细胞行为时顺带一句。
// 气泡两行：第一行「它是什么类的东西」，第二行「它在链上的关键作用」，每行 ≤21 个全角字。
// 所有事实都能回到数据层字段或教材章级出处；不写页码、不写真题年份。
// ============================================================
import { canonicalMoleculeId } from "./moleculeNotes";

export interface MoleculeProfilePathway {
  label: string;
  href: string;
  note?: string;
}

export interface MoleculeProfileSection {
  /** 判断句式小标题 */
  title: string;
  /** 一段式正文 */
  body: string;
}

export interface MoleculeProfileExam {
  title: string;
  items: string[];
}

export interface MoleculeProfile {
  /** 规范分子键（与 moleculeNotes 一致） */
  id: string;
  name: string;
  aliases: string[];
  /** 页面主标题：判断句，不写名词短语 */
  claim: string;
  /** 分类归属：一句话说清属于哪一类 */
  classification: string;
  /** 结构上的关键特征（生物学语言，一句） */
  structure: string;
  /** 在链上的位置 */
  position: MoleculeProfileSection;
  /** 生成与去路 */
  flow: MoleculeProfileSection;
  /** 生理或临床落点 */
  significance: MoleculeProfileSection;
  /** 考点与易错 */
  exam: MoleculeProfileExam;
  /** 在通路中出现的位置（挂图深链） */
  pathways: MoleculeProfilePathway[];
  /** 教材与数据字段出处 */
  sources: string[];
  /** 气泡两行 */
  bubble: { what: string; highlight: string };
  /** 有 3D 资产时的 ligand3d id；没有则只显示结构文字 */
  asset3d?: string;
  /** 2D 资产 id（仅作备用说明，不强制渲染） */
  asset2d?: string;
}

/** 页面上出现过、但不在 moleculeNotes registry 里的物质 id / 挂图变体 id → 本档案键 */
const PROFILE_ALIAS_EXTRA: Record<string, string> = {
  // 非 registry 的物质本体
  "23bpg": "23bpg", adp: "adp", amp: "amp", pi: "pi", ppi: "ppi", h2o: "h2o",
  coa: "coa", fad: "fad", fadh2: "fadh2", nad: "nad", nadp: "nadp", nadph: "nadph",
  q: "q", qh2: "qh2", o2: "o2", nh4: "nh4", camp: "camp", hmgcoa: "hmgcoa",
  acacoa: "acacoa", "7dhc": "7dhc", desmosterol: "desmosterol", gpp: "gpp", fpp: "fpp",
  acp: "acp", cytc: "cytc", malonylacp: "malonylacp",
  gly: "gly", cys: "cys", asn: "asn", his: "his", ile: "ile", lys: "lys", met: "met",
  pro: "pro", thr: "thr", trp: "trp", val: "val",
  // 同一分子在挂图上的不同节点 id
  glucose: "glc", fumarate: "fum", arg: "urea-arg", "6pg": "6pg-l", "13bpg": "bpg13", g3p: "gap",
  "pyr-cyt": "pyr", "pyr-mit": "pyr", "pyr-l": "pyr", "pyr-m": "pyr",
  "oaa-mit": "oaa", "oaa-cyt": "oaa", gap1: "gap", gap2: "gap",
  "glycogen-bd": "glycogen", "glycogen-syn": "glycogen",
  "g1p-bd": "g1p", "g1p-syn": "g1p", "limit-dextrin": "glycogen-limit",
  "free-glc": "glc", "glucose-liver": "glc", blood: "glc", "glc-l": "glc", "glc-m": "glc",
  "udp-glc": "udp-glucose", "lac-in": "lac", "lac-out": "lac",
  "ornithine-mit": "urea-orn", "ornithine-cyt": "urea-orn",
  "citrulline-mit": "urea-cit", "citrulline-cyt": "urea-cit", "asp-entry": "urea-asp",
  "fate-acacoa": "acacoa", ggpp: "fpp", "if-in-g6p": "g6p", "if-out-f6p": "f6p",
  "if-out-g3p": "gap", "if-nh4": "nh4", "hub-akg": "akg", "hub-glu": "glu",
  malonylcoa: "fas-malonyl", ketoacylacp: "fas-c4-keto", hydroxyacylacp: "fas-c4-oh",
  enoylacp: "fas-c4-enoyl", palmitate: "fa", acylcoa: "acylcoa-c16", "acylcoa-cyt": "acylcoa-c16",
  "acylcoa-short": "acylcoa-c14", "acylacp-next": "fas-c2", acylacp: "fas-c2",
  enoyl: "enoyl-c16", hydroxy: "hydroxy-c16", "hydroxyacyl": "hydroxy-c16",
  keto: "keto-c16", ketoacyl: "keto-c16", oxy: "oxidosqualene",
  "ipp-2": "ipp", "dmapp-2": "dmapp", "accoa-mito": "accoa", "accoa-cyt": "accoa",
};

/** 任何来源 id（节点 / entity / part / 别名）→ 已有档案键；没有档案返回 null */
function profileKeyFor(rawId: string | null | undefined): string | null {
  if (!rawId) return null;
  if (MOLECULE_PROFILES[rawId]) return rawId;
  const canonical = canonicalMoleculeId(rawId);
  if (canonical && MOLECULE_PROFILES[canonical]) return canonical;
  const extra = PROFILE_ALIAS_EXTRA[rawId];
  return extra && MOLECULE_PROFILES[extra] ? extra : null;
}

export const MOLECULE_PROFILES: Record<string, MoleculeProfile> = {
  g6p: {
    id: "g6p",
    name: "6-磷酸葡萄糖",
    aliases: ["G6P", "葡萄糖-6-磷酸", "6-磷酸葡糖"],
    claim: "G6P 是糖代谢的分岔点",
    classification: "糖磷酸酯：葡萄糖的 6 位羟基被磷酸化，生成己糖磷酸酯。",
    structure: "葡萄糖的 6 位羟基被磷酸化，生成磷酸单酯；磷酸基带负电，是它被锁在胞内的结构原因。",
    position: {
      title: "它卡在糖酵解第一站，同时守着三个出口",
      body:
        "糖酵解第 1 步由己糖激酶（肝为葡萄糖激酶）催化，消耗 ATP 把葡萄糖磷酸化成 G6P；第 2 步再由磷酸葡萄糖异构酶把 G6P 转成 F6P。G6P 同时是磷酸戊糖途径的入口，由葡萄糖-6-磷酸脱氢酶（G6PD）催化，也是糖原分解的产物。",
    },
    flow: {
      title: "它从葡萄糖和糖原来，往糖酵解、磷酸戊糖途径与血糖去",
      body:
        "来路：葡萄糖经己糖激酶或葡萄糖激酶磷酸化；糖原经糖原磷酸化酶生成葡萄糖-1-磷酸，再由磷酸葡萄糖变位酶转成 G6P。去向：① 经磷酸葡萄糖异构酶变成 F6P，继续走糖酵解；② 经 G6PD 进入磷酸戊糖途径，生成 NADPH 与核糖；③ 在肝、肾由葡萄糖-6-磷酸酶水解成葡萄糖，释放入血。",
    },
    significance: {
      title: "磷酸基把它锁在胞内，肝还能把它放回血液",
      body:
        "G6P 带负电，细胞膜不通透，葡萄糖一进细胞就被捕获，不能再漏出去。肝、肾的葡萄糖-6-磷酸酶是把它水解回葡萄糖的出口，空腹时靠这一步维持血糖；肌肉缺少这个酶，肌糖原只能就地供能。",
    },
    exam: {
      title: "考点是分岔、酶和第一步不可逆",
      items: [
        "G6P 不是 F6P：第 2 步磷酸葡萄糖异构酶才把醛糖转成酮糖。",
        "第 1 步是不可逆起点，关键酶是己糖激酶或葡萄糖激酶；糖酵解的限速步是 PFK-1（gk-3）。",
        "肝的葡萄糖激酶 Km 高，餐后血糖升高才大量工作。",
        "糖酵解唯一的氧化步骤在第 6 步（GAPDH，生成 NADH），不是第 1 步。",
      ],
    },
    pathways: [
      { label: "糖酵解第 1 站产物 / 第 2 站底物", href: "/pathway/glycolysis?step=gk-1" },
      { label: "磷酸戊糖途径氧化相入口", href: "/pathway/ppp?step=ppp-o1" },
      { label: "糖原分解生成 G6P", href: "/pathway/glycogen?step=gly-3" },
      { label: "糖异生末步：G6P 水解回葡萄糖", href: "/pathway/gluconeogenesis?step=gn-11" },
    ],
    sources: [
      "glycolysis.json · steps[gk-1].significance / organDiffs / misconceptions",
      "glycolysis.json · steps[gk-2].significance；steps[gk-6].equation",
      "ppp.json · steps[ppp-o1].significance",
      "glycogen.json · steps[gly-3].reaction / physiology",
      "gluconeogenesis.json · steps[gn-11].enzyme",
      "Lehninger Principles of Biochemistry, 8e, Ch.14（Glycolysis, Gluconeogenesis, and the Pentose Phosphate Pathway）",
    ],
    bubble: { what: "糖磷酸酯，葡萄糖的胞内形式", highlight: "糖酵解、PPP 与糖原的交汇点" },
    asset3d: "g6p",
    asset2d: "g6p",
  },

  pyr: {
    id: "pyr",
    name: "丙酮酸",
    aliases: ["Pyr", "pyruvate", "2-氧代丙酸"],
    claim: "丙酮酸是糖酵解终点与碳流向的岔口",
    classification: "α-酮酸：三碳羧酸，羧基旁边是酮羰基。",
    structure: "三碳 α-酮酸；羧基旁边就是酮羰基，这个结构让它既能被转氨酶接受，也能被脱羧酶切掉一个碳。",
    position: {
      title: "它是糖酵解第 10 步的终点，也是线粒体的入口",
      body:
        "糖酵解第 10 步由丙酮酸激酶把磷酸烯醇式丙酮酸的磷酸基转给 ADP，生成丙酮酸。丙酮酸进入线粒体后由丙酮酸脱氢酶复合体（PDH）氧化脱羧成乙酰-CoA，把碳接进 TCA。",
    },
    flow: {
      title: "它从 PEP 与丙氨酸来，往乙酰-CoA、草酰乙酸和乳酸去",
      body:
        "来路：糖酵解第 10 步丙酮酸激酶生成丙酮酸；丙氨酸经转氨酶脱氨也生成丙酮酸。去向：① 经 PDH 氧化脱羧成乙酰-CoA，进入 TCA；② 经丙酮酸羧化酶变成草酰乙酸，回到糖异生；③ 经乳酸脱氢酶还原成乳酸，或转氨成丙氨酸。",
    },
    significance: {
      title: "它的去向决定乳酸堆不堆",
      body:
        "氧供不足时，乳酸脱氢酶把丙酮酸还原成乳酸，同时把 NADH 氧化回 NAD⁺，让糖酵解能继续运转；肝再把乳酸重新变成丙酮酸进入糖异生。丙酮酸往哪边走，直接决定碳是进线粒体氧化，还是以乳酸形式暂时存起来。",
    },
    exam: {
      title: "考点是终点位置、PDH 辅因子和乳酸去向",
      items: [
        "丙酮酸是糖酵解的终产物，不是起点；糖异生的起点反应是丙酮酸羧化，先成草酰乙酸。",
        "PDH 复合体需要 TPP、硫辛酸、辅酶 A、FAD、NAD⁺ 五种辅酶，外加 Mg²⁺；缺 TPP 时丙酮酸堆积。",
        "乳酸脱氢酶把丙酮酸还原成乳酸，同时把 NADH 氧化成 NAD⁺，这一步不产 ATP。",
      ],
    },
    pathways: [
      { label: "糖酵解第 10 站产物", href: "/pathway/glycolysis?step=gk-10" },
      { label: "糖异生起点：丙酮酸羧化", href: "/pathway/gluconeogenesis?step=gn-1" },
      { label: "丙氨酸转氨生成丙酮酸", href: "/pathway/amino-acids?step=aa-1" },
    ],
    sources: [
      "glycolysis.json · steps[gk-10].significance / enzyme / misconceptions",
      "gluconeogenesis.json · steps[gn-1].enzyme / significance",
      "amino.json · steps[aa-1].reaction / physiology",
      "cori.json · noLoop（LDH 与 NAD⁺ 再生）",
      "Lehninger Principles of Biochemistry, 8e, Ch.14 / Ch.16（PDH 复合体与 TCA） / Ch.18",
    ],
    bubble: { what: "α-酮酸，三碳的糖酵解终产物", highlight: "决定碳进线粒体还是变乳酸" },
    asset3d: "pyr",
    asset2d: "pyruvate",
  },

  accoa: {
    id: "accoa",
    name: "乙酰-CoA",
    aliases: ["乙酰辅酶 A", "AcCoA", "acetyl-CoA"],
    claim: "乙酰-CoA 是两碳单元的通用货币",
    classification: "辅酶 A 硫酯：由泛酸（维生素 B5）构成的辅酶 A，与乙酸形成硫酯；活性形式就是酰基-CoA 硫酯。",
    structure: "辅酶 A 的巯基与乙酸形成硫酯；硫酯键的酰基转移势能高，两碳单元以硫酯形式被携带。",
    position: {
      title: "它是 TCA 第 1 步的底物，也是脂肪酸合成的起点",
      body:
        "TCA 第 1 步由柠檬酸合酶把乙酰-CoA 的乙酰基与草酰乙酸缩合成柠檬酸。乙酰-CoA 也是脂肪酸合成与胆固醇合成的起点：在胞质经乙酰-CoA 羧化酶（ACC）羧化成丙二酰-CoA，再进入脂肪酸合成。",
    },
    flow: {
      title: "它从丙酮酸、脂肪酸和氨基酸来，往 TCA、脂合成与酮体去",
      body:
        "来路：PDH 把丙酮酸氧化脱羧成乙酰-CoA；脂肪酸 β-氧化末步硫解也生成乙酰-CoA；部分氨基酸分解同样产生乙酰-CoA。去向：① 进 TCA 氧化供能；② 在胞质羧化成丙二酰-CoA，进入脂肪酸合成；③ 两分子缩合启动胆固醇合成；④ 在肝生成酮体。",
    },
    significance: {
      title: "它不能自己过线粒体内膜，主要搭柠檬酸穿梭",
      body:
        "线粒体基质里生成的乙酰-CoA 不能自由穿过线粒体内膜；它先与草酰乙酸缩合成柠檬酸，柠檬酸出线粒体后在胞质裂解回乙酰-CoA，供脂肪酸合成使用。这条柠檬酸穿梭把线粒体的碳输出与胞质的脂合成接在一起。",
    },
    exam: {
      title: "考点是硫酯、辅酶 A 与柠檬酸穿梭",
      items: [
        "辅酶 A 由泛酸（维生素 B5）构成，活性基团是巯基；乙酰-CoA 的高能键是硫酯键，不是普通酯键。",
        "乙酰-CoA 不能直接穿过线粒体内膜，脂肪酸合成在胞质、β-氧化在线粒体，靠柠檬酸穿梭衔接。",
        "PDH 把丙酮酸变成乙酰-CoA，释放 CO₂ 并生成 NADH；不是转氨，也不直接产 ATP。",
        "脂肪酸合成以乙酰-CoA 为引物、丙二酰-CoA 为增碳单元；直接缩合底物是乙酰-ACP 或脂酰-ACP 加丙二酰-ACP，不是游离的乙酰-CoA 与丙二酰-CoA。",
      ],
    },
    pathways: [
      { label: "TCA 第 1 站底物：与草酰乙酸合成柠檬酸", href: "/pathway/tca?step=tca-1" },
      { label: "脂肪酸合成起点：ACC 羧化成丙二酰-CoA", href: "/pathway/fatty-acid-synthesis?step=fas-acc" },
      { label: "β-氧化末步硫解产物", href: "/pathway/fatty-acid-oxidation?step=fao-4" },
      { label: "胆固醇合成起点：两分子乙酰-CoA 缩合", href: "/pathway/cholesterol?step=ch-1" },
    ],
    sources: [
      "tca.json · steps[tca-1].significance / enzyme",
      "fas.json · steps[fas-acc].significance；steps[fas-pdh].significance",
      "fao.json · steps[fao-4].significance",
      "cholesterol.json · steps[ch-1].significance",
      "Lehninger Principles of Biochemistry, 8e, Ch.16（PDH 与 TCA） / Ch.21（脂质合成）",
      "王镜岩《生物化学》第 11 章（维生素与辅酶：泛酸与辅酶 A 成对讲）",
    ],
    bubble: { what: "泛酸构成的辅酶 A 硫酯，两碳载体", highlight: "TCA 第 1 步底物，也是脂合成起点" },
    asset3d: "accoa",
    asset2d: "accoa",
  },

  ser: {
    id: "ser",
    name: "L-丝氨酸",
    aliases: ["丝氨酸", "Ser", "L-serine"],
    claim: "丝氨酸是一碳单位与磷脂的原料库",
    classification: "中性极性 α-氨基酸：侧链带羟基。",
    structure: "含羟基侧链的 α-氨基酸；侧链羟基能形成氢键，也能被磷酸化或糖基化，是许多酶活性中心的亲核基团。",
    position: {
      title: "它由 3-磷酸甘油酸生成，碳骨架可归入丙酮酸",
      body:
        "合成方向，糖酵解中间产物 3-磷酸甘油酸经氧化、转氨生成丝氨酸。分解方向，数据层 fates[fate-pyr] 把丝氨酸列为丙酮酸来源；本平台没有为丝氨酸脱氨单列步骤，aa-7 是胱硫醚 β-合酶，不是这条反应。丝氨酸还是甘氨酸、半胱氨酸与磷脂酰丝氨酸的原料。",
    },
    flow: {
      title: "它从糖酵解中间物来，往丙酮酸、甘氨酸与磷脂去",
      body:
        "来路：糖酵解中间产物 3-磷酸甘油酸经氧化、转氨生成丝氨酸。去向：① 脱氨后碳骨架归入丙酮酸（amino.json fates[fate-pyr] 口径；数据层未单列该步骤）；② 经丝氨酸羟甲基转移酶（SHMT）转成甘氨酸，同时把一碳单位交给四氢叶酸（这是 SHMT 的常规方向；反向需要一碳单位供给，不作默认来路）；③ 合成磷脂酰丝氨酸与鞘脂；④ 侧链羟基被磷酸化或糖基化，参与信号与识别。",
    },
    significance: {
      title: "它把碳骨架、一碳单位和磷脂三条线接在一起",
      body:
        "丝氨酸既能脱氨把碳骨架送回丙酮酸，又能向叶酸池提供一碳单位，还是磷脂酰丝氨酸与鞘脂的原料。丝氨酸蛋白酶催化中心的关键残基也是丝氨酸，侧链羟基在那里做亲核进攻。",
    },
    exam: {
      title: "考点是脱氨产物、一碳载体和侧链羟基",
      items: [
        "丝氨酸脱氨的产物是丙酮酸，不是乙酰-CoA。",
        "一碳单位的载体是四氢叶酸（THF）；S-腺苷甲硫氨酸主要供甲基，不是通用一碳载体。",
        "丝氨酸的侧链羟基是磷酸化与糖基化位点，不是带电基团；生理 pH 下它仍是两性离子。",
        "SHMT 的常规方向是丝氨酸→甘氨酸，同时把一碳单位交给四氢叶酸；甘氨酸→丝氨酸需要一碳单位供给，不是默认来路。",
      ],
    },
    pathways: [
      { label: "氨基酸代谢 · fate-pyr：丝氨酸碳骨架归丙酮酸", href: "/pathway/amino-acids" },
    ],
    sources: [
      "amino.json · fates[fate-pyr] · sources 含 ser",
      "amino.json · entities[ser]",
      "Lehninger Principles of Biochemistry, 8e, Ch.18（氨基酸氧化） / Ch.22（氨基酸合成）",
    ],
    bubble: { what: "含羟基的中性氨基酸，一碳单位原料", highlight: "脱氨进丙酮酸，也能供磷脂" },
    asset2d: "ser",
  },

  "urea-ure": {
    id: "urea-ure",
    name: "尿素",
    aliases: ["urea", "碳酰胺"],
    claim: "尿素是氮的最终出口",
    classification: "含氮小分子：两个酰胺氮连在同一个羰基上。",
    structure: "两个酰胺氮连接在同一个羰基上；分子小、极性强，不与细胞成分牢固结合。",
    position: {
      title: "它是尿素循环第 5 步的产物，催化酶是精氨酸酶",
      body:
        "尿素循环第 5 步由精氨酸酶（ARG1）水解精氨酸，释放尿素并再生鸟氨酸；鸟氨酸回到循环起点，尿素本身不再进入代谢。",
    },
    flow: {
      title: "它从氨甲酰磷酸和天冬氨酸的两个氮来，到肾排出",
      body:
        "来路：尿素循环前四步把两个氮装进精氨酸——一个来自游离氨，经 CPS1 生成氨甲酰磷酸；另一个来自天冬氨酸，经 ASS 缩合进来。第 5 步精氨酸酶水解精氨酸，释放尿素与鸟氨酸。去向：尿素经血运到肾，随尿排出；鸟氨酸回到循环，继续下一轮。",
    },
    significance: {
      title: "它把有毒的氨变成能运输的中性分子",
      body:
        "游离氨有毒，且以 NH₄⁺ 形式带电荷，不能大量在血中运输。尿素中性、水溶性高，把两个氮装进一个分子，既解除氨的毒性，又让氮能经血到肾排出。",
    },
    exam: {
      title: "考点是两个氮源、第 5 步和能量账",
      items: [
        "尿素的两个氮来源不同：一个来自游离氨（CPS1），一个来自天冬氨酸（ASS），不是两个 NH₃。",
        "第 5 步由精氨酸酶催化，生成尿素与鸟氨酸；鸟氨酸回循环，不是终产物。",
        "尿素循环名义消耗 3 ATP，实际消耗 4 个高能键；尿素本身不再进入代谢。",
      ],
    },
    pathways: [
      { label: "尿素循环第 5 站产物：精氨酸水解释放尿素", href: "/pathway/urea-cycle?step=urea-5" },
    ],
    sources: [
      "urea.json · entities[urea].note / ionization",
      "urea.json · steps[urea-5].significance",
      "urea.json · energyLedger.nitrogenNote / nominal ATP / high-energy bonds",
      "Lehninger Principles of Biochemistry, 8e, Ch.18（氨基酸氧化与尿素循环）",
    ],
    bubble: { what: "含氮小分子，两个氮的载体", highlight: "把氨装成中性分子运到肾" },
    asset3d: "urea-ure",
    asset2d: "urea-ure",
  },
  "23bpg": {
    id: "23bpg",
    name: "2,3-二磷酸甘油酸",
    aliases: ["2,3-BPG", "2,3-DPG", "二磷酸甘油酸"],
    claim: "2,3-BPG 把糖酵解的旁支接进氧运输",
    classification: "糖磷酸酯：甘油酸骨架的 C2、C3 各带一个磷酸基。",
    structure: "三碳糖酸骨架，C2 与 C3 各挂一个磷酸基；两个磷酸基让它带较高负电荷，能与血红蛋白中央腔的碱性残基结合。",
    position: {
      title: "它不在糖酵解主线，而是红细胞里的旁支",
      body:
        "数据层把它登记为糖酵解挂图节点，不参与主线步骤。糖酵解第 6 步生成的 1,3-二磷酸甘油酸在红细胞中经 BPGM 的变位酶活性转成 2,3-BPG；主线第 7 步仍由磷酸甘油酸激酶把 1,3-BPG 变成 3-磷酸甘油酸。",
    },
    flow: {
      title: "它从 1,3-BPG 来，由 BPGM 的磷酸酶活性水解回 3PG",
      body:
        "来路：1,3-BPG 在红细胞中经 BPGM 的变位酶活性（EC 5.4.2.4）生成。去向：BPGM 自身的磷酸酶活性（EC 3.1.3.13）把它水解回 3-磷酸甘油酸；BPGM 是双功能酶，两种活性在同一条多肽链上，不是另一个独立的磷酸酶。",
    },
    significance: {
      title: "它决定血红蛋白在组织放不放氧",
      body:
        "红细胞没有线粒体，只能靠糖酵解供能；2,3-BPG 与脱氧血红蛋白结合，稳定 T 态，降低氧亲和力，让氧在组织释放。",
    },
    exam: {
      title: "考点是旁支身份与氧亲和力",
      items: [
        "2,3-BPG 不是糖酵解主线的中间产物，不进入净 ATP 账；它的碳骨架来自 1,3-BPG。",
        "它由 BPGM 生成，也由 BPGM 自身的磷酸酶活性水解，构成 Rapoport-Luebering 旁路；BPGM 是双功能酶（EC 5.4.2.4 兼 EC 3.1.3.13）。",
        "2,3-BPG 升高使血红蛋白氧亲和力下降、氧解离曲线右移，不是升高氧亲和力。",
      ],
    },
    pathways: [
      { label: "糖酵解挂图节点：2,3-BPG 旁支", href: "/pathway/glycolysis" },
    ],
    sources: [
      "glycolysis.json · skeleton nodes[23bpg]",
      "glycolysis.json · steps[gk-6].significance / steps[gk-7].equation",
      "BRENDA · EC 5.4.2.4 / EC 3.1.3.13（BPGM 双功能：变位酶 + 磷酸酶）",
      "Lehninger Principles of Biochemistry, 8e, Ch.14（Glycolysis, Gluconeogenesis, and the Pentose Phosphate Pathway）",
    ],
    bubble: { what: "三碳糖磷酸，红细胞的旁支产物", highlight: "压低血红蛋白的氧亲和力" },
  },

  "2pg": {
    id: "2pg",
    name: "2-磷酸甘油酸",
    aliases: ["2PG", "2-磷酸甘油酸盐"],
    claim: "2-磷酸甘油酸是脱水前的最后一次换位",
    classification: "糖磷酸酯：3-磷酸甘油酸的磷酸基移到 C2。",
    structure: "三碳羧酸，C2 上带一个磷酸单酯；磷酸基与羧基相邻，为下一步脱水形成烯醇磷酸做准备。",
    position: {
      title: "它站在糖酵解第 8 步产物、第 9 步底物的位置",
      body:
        "糖酵解第 8 步由磷酸甘油酸变位酶把 3-磷酸甘油酸的磷酸基移到 C2，生成 2-磷酸甘油酸；第 9 步由烯醇化酶脱水，生成磷酸烯醇式丙酮酸。糖异生中同一对酶反向运行，把 2PG 送回 3PG。",
    },
    flow: {
      title: "它从 3PG 来，脱水后变成 PEP",
      body:
        "来路：3-磷酸甘油酸经磷酸甘油酸变位酶换位生成。去向：经烯醇化酶脱水生成磷酸烯醇式丙酮酸；糖异生时经同一变位酶逆向回到 3-磷酸甘油酸。",
    },
    significance: {
      title: "换位是为了让下一步脱水能成立",
      body:
        "磷酸基换到 C2 后，与羧基相邻的 β-羟基才能被脱水消去；这一步把低能的磷酸酯改造成高能的烯醇磷酸，是第 10 步能付一次底物水平磷酸化的前提。",
    },
    exam: {
      title: "考点是变位、脱水与氟化钠",
      items: [
        "第 8 步是变位，不消耗 ATP；第 9 步是脱水，也不直接产 ATP。",
        "磷酸甘油酸变位酶需要 2,3-BPG 作催化引物，缺引物时近失活。",
        "氟化钠抗凝管抑制的是烯醇化酶（第 9 步），不是第一步己糖激酶。",
      ],
    },
    pathways: [
      { label: "糖酵解第 8 步产物", href: "/pathway/glycolysis?step=gk-8" },
      { label: "糖酵解第 9 步底物", href: "/pathway/glycolysis?step=gk-9" },
      { label: "糖异生 gn-3 产物", href: "/pathway/gluconeogenesis?step=gn-3" },
    ],
    sources: [
      "glycolysis.json · steps[gk-8].significance / misconceptions",
      "glycolysis.json · steps[gk-9].significance / misconceptions",
      "gluconeogenesis.json · steps[gn-3].significance",
      "Lehninger Principles of Biochemistry, 8e, Ch.14",
    ],
    bubble: { what: "三碳糖磷酸，换位后的中间物", highlight: "脱水生成高能的 PEP" },
    asset3d: "2pg",
  },

  "3pg": {
    id: "3pg",
    name: "3-磷酸甘油酸",
    aliases: ["3PG", "3-磷酸甘油酸盐"],
    claim: "3-磷酸甘油酸是糖酵解第一次回本的兑现点",
    classification: "糖磷酸酯：甘油酸 C3 位带磷酸基。",
    structure: "三碳羧酸，C3 带磷酸单酯；羧基与磷酸基分处两端，C3 位正是下一步换位的起点。",
    position: {
      title: "它是第 7 步产物，也是第 8 步底物",
      body:
        "糖酵解第 7 步由磷酸甘油酸激酶把 1,3-BPG 的酰基磷酸转给 ADP，生成 3-磷酸甘油酸与 ATP；第 8 步由磷酸甘油酸变位酶把它转成 2-磷酸甘油酸。糖异生中，3PG 经磷酸甘油酸激酶逆向反应消耗 ATP 回到 1,3-BPG。",
    },
    flow: {
      title: "它从 1,3-BPG 来，往 2PG 或逆向回 1,3-BPG 去",
      body:
        "来路：1,3-BPG 经磷酸甘油酸激酶把磷酸基交给 ADP 后生成。去向：经变位酶转成 2PG 继续糖酵解；糖异生时被逆向磷酸化回 1,3-BPG。",
    },
    significance: {
      title: "没有它，糖酵解前段一直是净负债",
      body:
        "这一步是糖酵解第一次底物水平磷酸化：按 ×2 计正好收回第 1、3 步投入的 2 个 ATP；没有它，通路前段一直是净负债。",
    },
    exam: {
      title: "考点是底物水平磷酸化与不可逆性",
      items: [
        "第 7 步生成 ATP，是底物水平磷酸化，不靠氧化磷酸化。",
        "1,3-BPG 到 3PG 放能，3PG 到 2PG 只是换位，不产 ATP。",
        "糖异生逆向这一步要消耗 ATP，所以糖异生不是糖酵解的简单倒放。",
      ],
    },
    pathways: [
      { label: "糖酵解第 7 步产物", href: "/pathway/glycolysis?step=gk-7" },
      { label: "糖酵解第 8 步底物", href: "/pathway/glycolysis?step=gk-8" },
      { label: "糖异生 gn-4 产物", href: "/pathway/gluconeogenesis?step=gn-4" },
    ],
    sources: [
      "glycolysis.json · steps[gk-7].significance / equation",
      "glycolysis.json · steps[gk-8].significance",
      "gluconeogenesis.json · steps[gn-4].significance",
      "Lehninger Principles of Biochemistry, 8e, Ch.14",
    ],
    bubble: { what: "三碳糖磷酸，第一次回本的产物", highlight: "把 1,3-BPG 的磷酸交给 ADP" },
    asset3d: "3pg",
  },

  "6pg-l": {
    id: "6pg-l",
    name: "6-磷酸葡糖酸",
    aliases: ["6PG", "6-磷酸葡萄糖酸"],
    claim: "6-磷酸葡糖酸是氧化相第二次脱氢的底物",
    classification: "糖磷酸酯：6-磷酸葡糖酸内酯开环后的线性羧酸。",
    structure: "开环后的线性糖酸，C1 是羧基、C3 带羟基；只有开环成线性羧酸，下一步才能做 β-脱羧。",
    position: {
      title: "它站在磷酸戊糖途径氧化相的中段",
      body:
        "ppp-o2 由 6-磷酸葡糖酸内酯酶水解内酯开环，生成 6-磷酸葡糖酸；ppp-o3 由 6-磷酸葡糖酸脱氢酶氧化 C3-OH 并 β-脱羧，生成核酮糖-5-磷酸、CO₂ 与第二个 NADPH。",
    },
    flow: {
      title: "它从内酯来，脱羧后变成核酮糖-5-磷酸",
      body:
        "来路：6-磷酸葡糖酸-δ-内酯经内酯酶水解开环。去向：经 6-磷酸葡糖酸脱氢酶氧化脱羧，生成核酮糖-5-磷酸与 CO₂。",
    },
    significance: {
      title: "开环是为了让 β-脱羧丢得掉 C1",
      body:
        "氧化相的两个 NADPH 一个在入口 G6PD 步、一个在这里；开环把内酯变成线性羧酸，β-脱羧才能丢掉 C1，碳骨架从 C6 缩到 C5。",
    },
    exam: {
      title: "考点是第二个 NADPH 与脱羧位置",
      items: [
        "第二个 NADPH 在 6-磷酸葡糖酸脱氢酶步生成，不是入口步。",
        "脱羧丢掉的是 G6P 的 C1，以 CO₂ 形式逸出。",
        "内酯酶是独立胞质酶，不要与 ER 上的 H6PD 双功能酶混淆。",
      ],
    },
    pathways: [
      { label: "磷酸戊糖途径 ppp-o2 产物", href: "/pathway/ppp?step=ppp-o2" },
      { label: "氧化相 ppp-o3 底物", href: "/pathway/ppp?step=ppp-o3" },
    ],
    sources: [
      "ppp.json · steps[ppp-o2].significance / enzyme",
      "ppp.json · steps[ppp-o3].significance / equation",
      "Lehninger Principles of Biochemistry, 8e, Ch.14",
    ],
    bubble: { what: "糖酸磷酸，氧化相的线性中间物", highlight: "脱羧放出 CO₂ 与第二个 NADPH" },
    asset3d: "6pg",
  },

  "6pgl": {
    id: "6pgl",
    name: "6-磷酸葡糖酸-δ-内酯",
    aliases: ["6PGL", "6-磷酸葡糖酸内酯"],
    claim: "6-磷酸葡糖酸内酯是氧化相入口的瞬时产物",
    classification: "糖酸内酯磷酸：G6P 的 C1 脱氢后形成的 δ-内酯。",
    structure: "葡萄糖的 C1 被氧化成羧基后与 C5 羟基成环，形成六元 δ-内酯；内酯环让 C1 处于可水解的酰基状态。",
    position: {
      title: "它是 G6PD 的直接产物，也是内酯酶的底物",
      body:
        "ppp-o1 由葡萄糖-6-磷酸脱氢酶（G6PD）把 G6P 的 C1 脱氢，生成 6-磷酸葡糖酸-δ-内酯与 NADPH；ppp-o2 由内酯酶水解开环，生成 6-磷酸葡糖酸。",
    },
    flow: {
      title: "它从 G6P 来，开环后进入氧化脱羧",
      body:
        "来路：G6P 经 G6PD 氧化 C1 生成。去向：经内酯酶水解开环，进入 6-磷酸葡糖酸的氧化脱羧。",
    },
    significance: {
      title: "它只是瞬时中间物，却决定氧化相能否继续",
      body:
        "入口步是全通路限速步，NADP⁺ 专一收电子；内酯只是瞬时中间物，迅速水解开环，保证氧化相继续往下走。",
    },
    exam: {
      title: "考点是 NADP⁺ 专一性与内酯开环",
      items: [
        "G6PD 用的是 NADP⁺，不是 NAD⁺。",
        "内酯是 δ-内酯（六元环），水解后开环成线性糖酸。",
        "NADPH 堆积会抑制 G6PD，这是氧化相的反馈节流。",
      ],
    },
    pathways: [
      { label: "磷酸戊糖途径 ppp-o1 产物", href: "/pathway/ppp?step=ppp-o1" },
      { label: "ppp-o2 内酯酶底物", href: "/pathway/ppp?step=ppp-o2" },
    ],
    sources: [
      "ppp.json · steps[ppp-o1].significance / enzyme",
      "ppp.json · steps[ppp-o2].significance",
      "Lehninger Principles of Biochemistry, 8e, Ch.14",
    ],
    bubble: { what: "糖酸内酯磷酸，入口瞬时产物", highlight: "G6PD 脱氢后立即水解开环" },
    asset3d: "6pgl",
  },

  "7dhc": {
    id: "7dhc",
    name: "7-脱氢胆固醇",
    aliases: ["7-DHC", "7-脱氢胆甾醇"],
    claim: "7-脱氢胆固醇是胆固醇合成的最后一块拼图",
    classification: "甾醇：胆固醇 C7 位带一个额外双键的中间物。",
    structure: "甾核 B 环 C7 位多一个双键；DHCR7 把它还原成胆固醇，缺陷时这个双键留在终产物里。",
    position: {
      title: "它站在胆固醇合成末段，只差 DHCR7 一步",
      body:
        "数据层把它登记为胆固醇合成挂图节点，没有逐步步骤。羊毛甾醇经去甲基化与还原修饰后生成 7-脱氢胆固醇；末步由 7-脱氢胆固醇还原酶（DHCR7）把 C7 双键还原，生成胆固醇。",
    },
    flow: {
      title: "它从羊毛甾醇来，被 DHCR7 还原成胆固醇",
      body:
        "来路：羊毛甾醇经多步去甲基化、还原与双键重排生成。去向：经 DHCR7 还原 C7 双键生成胆固醇；DHCR7 缺陷时 7-DHC 堆积。",
    },
    significance: {
      title: "DHCR7 是出口，也是疾病的关口",
      body:
        "DHCR7 是胆固醇合成的出口酶；它缺陷时 7-DHC 堆积，导致 Smith-Lemli-Opitz 综合征，说明这一步不是可有可无的修饰。",
    },
    exam: {
      title: "考点是 C7 双键与 DHCR7 缺陷",
      items: [
        "7-DHC 不是胆固醇，差别在 C7 位多一个双键。",
        "DHCR7 缺陷导致 7-DHC 堆积与 Smith-Lemli-Opitz 综合征。",
        "胆固醇合成的碳源全部来自乙酰-CoA，经甲羟戊酸与角鲨烯中间物。",
      ],
    },
    pathways: [
      { label: "胆固醇合成末段：DHCR7 底物", href: "/pathway/cholesterol" },
    ],
    sources: [
      "cholesterol.json · entities[7dhc].note",
      "cholesterol.json · skeleton nodes[7dhc]",
      "Lehninger Principles of Biochemistry, 8e, Ch.21（Lipid Biosynthesis）",
    ],
    bubble: { what: "甾醇中间物，C7 多一个双键", highlight: "DHCR7 还原后才成为胆固醇" },
  },

  acacoa: {
    id: "acacoa",
    name: "乙酰乙酰-CoA",
    aliases: ["AcAcCoA", "乙酰乙酰辅酶 A"],
    claim: "乙酰乙酰-CoA 是胆固醇合成的二碳接头",
    classification: "β-酮酸硫酯：两个乙酰单元缩合，仍保留一个硫酯键。",
    structure: "四碳 β-酮酸与辅酶 A 成硫酯；C3 是酮羰基，正是下一步与乙酰-CoA 缩合的位点。",
    position: {
      title: "它是胆固醇合成第 1 步产物、第 2 步底物",
      body:
        "ch-1 由乙酰-CoA 乙酰转移酶 2 把两分子乙酰-CoA 缩合成乙酰乙酰-CoA；ch-2 由 HMG-CoA 合酶 1 再接入一个乙酰-CoA，生成 HMG-CoA。两步都在胞质。",
    },
    flow: {
      title: "它由两分子乙酰-CoA 缩合来，再装一个乙酰进 HMG-CoA",
      body:
        "来路：两分子乙酰-CoA 经硫解缩合生成，放出 CoA-SH。去向：与第三分子乙酰-CoA 缩合成 HMG-CoA，进入甲羟戊酸途径。",
    },
    significance: {
      title: "它是胆固醇合成的二碳计数起点",
      body:
        "胆固醇合成的前三步都在胞质：两个乙酰先装成乙酰乙酰-CoA，再装成 HMG-CoA，最后才生成甲羟戊酸这个限速中间物。",
    },
    exam: {
      title: "考点是碳数、硫酯与限速步",
      items: [
        "乙酰乙酰-CoA 是四碳，不是两碳；两分子乙酰-CoA 缩合后碳数翻倍。",
        "缩合放出 CoA-SH，硫酯键仍保留在产物上。",
        "胆固醇合成的限速步是 HMG-CoA 还原酶，不是 ch-1。",
      ],
    },
    pathways: [
      { label: "胆固醇合成 ch-1 产物", href: "/pathway/cholesterol?step=ch-1" },
      { label: "ch-2 HMG-CoA 合酶底物", href: "/pathway/cholesterol?step=ch-2" },
    ],
    sources: [
      "cholesterol.json · entities[acacoa].note",
      "cholesterol.json · steps[ch-1].equation / steps[ch-2].equation",
      "Lehninger Principles of Biochemistry, 8e, Ch.21",
    ],
    bubble: { what: "四碳硫酯，两分子乙酰的缩合物", highlight: "再装一个乙酰生成 HMG-CoA" },
  },

  acetoacetate: {
    id: "acetoacetate",
    name: "乙酰乙酸",
    aliases: ["AcAc", "acac", "乙酰醋酸"],
    claim: "乙酰乙酸是酮体生成的直接产物，也是肝外利用酮体的必经入口",
    classification: "酮体：四碳 β-酮酸，C3 带酮羰基、C4 带羧基。",
    structure: "四碳 β-酮酸；C3 酮羰基可被还原成羟基，C4 羧基使它在 pH 7.4 下以阴离子形式存在。",
    position: {
      title: "它在肝线粒体由 HMG-CoA 裂解生成，在肝外被重新活化",
      body:
        "ketone.json 的 kt-3 由 HMG-CoA 裂解酶把 HMG-CoA 拆成乙酰乙酸并放回一分子乙酰-CoA，是生酮唯一直接产出酮体的一步；kt-4 把它与 β-羟丁酸互变；kt-5 是它自发脱羧成丙酮的旁路。肝外利用段（kt-6）先由 OXCT1 把 CoA 从琥珀酰-CoA 转给乙酰乙酸。",
    },
    flow: {
      title: "它由 HMG-CoA 裂解来，往 β-羟丁酸、丙酮与乙酰乙酰-CoA 去",
      body:
        "来路：HMG-CoA 裂解（kt-3），同时放回一分子乙酰-CoA。去向：① 肝内 NADH 充足时经 BDH1 还原成 β-羟丁酸，成为血液中的主要运输形式；② 少量自发脱羧成丙酮，随呼气排出；③ 肝外经 OXCT1 活化成乙酰乙酰-CoA，再由硫解酶拆成两分子乙酰-CoA 进 TCA。",
    },
    significance: {
      title: "三种酮体里只有它能直接接上 CoA 活化位点",
      body:
        "乙酰乙酸是肝外利用酮体的必经中间物：β-羟丁酸要先经 BDH1 氧化回它才能被 OXCT1 活化，丙酮则不能回补。血酮升高时乙酰乙酸与 β-羟丁酸同时升高，但以 β-羟丁酸为主，判读时要区分两者，不能只看总量。",
    },
    exam: {
      title: "考点是生成步、肝内外分工与活化方式",
      items: [
        "乙酰乙酸由 HMG-CoA 裂解酶（HMGCL）催化 HMG-CoA 裂解生成，不是 HMGCS2 那一步。",
        "肝外利用必须先经 OXCT1 把 CoA 从琥珀酰-CoA 转给乙酰乙酸，生成乙酰乙酰-CoA。",
        "乙酰乙酸可还原为 β-羟丁酸，也可自发脱羧为丙酮；丙酮基本不再供能。",
      ],
    },
    pathways: [
      { label: "酮体代谢 kt-3：HMG-CoA 裂解产物", href: "/pathway/ketone?step=kt-3" },
      { label: "kt-4：与 β-羟丁酸互变", href: "/pathway/ketone?step=kt-4" },
      { label: "kt-6：肝外活化成乙酰乙酰-CoA", href: "/pathway/ketone?step=kt-6" },
    ],
    sources: [
      "ketone.json · steps[kt-3].equation / significance",
      "ketone.json · steps[kt-4].significance / misconceptions",
      "ketone.json · steps[kt-6].equation / misconceptions",
      "Lehninger Principles of Biochemistry, 8e, Ch.17（酮体）",
    ],
    bubble: { what: "四碳 β-酮酸，C3 带酮羰基", highlight: "肝外利用要先活化成 CoA 酯" },
  },

  acetone: {
    id: "acetone",
    name: "丙酮",
    aliases: ["醋酮", "acetone"],
    claim: "丙酮是乙酰乙酸自发脱羧的旁路产物，主要靠排出而不是供能",
    classification: "酮体：三碳酮，常温下易挥发。",
    structure: "三碳酮，无羧基；由乙酰乙酸失去羧基生成，挥发性强。",
    position: {
      title: "它挂在乙酰乙酸旁边，是生酮主链之外的支路",
      body:
        "ketone.json 的 kt-5 写乙酰乙酸缓慢脱羧成丙酮 + CO₂；教材口径以自发脱羧为主，人肝内是否存在独立的乙酰乙酸脱羧酶主路径，本平台未核实，因此该步的酶学细节写作未核实。",
    },
    flow: {
      title: "它由乙酰乙酸脱羧来，往呼气与尿液去",
      body:
        "来路：乙酰乙酸自发脱羧，生成量明显小于另外两种酮体。去向：主要经肺呼气排出，少量随尿排出；它不进入 TCA，也不被肝外组织当作主要燃料回补，因此不构成可观的能量来源。",
    },
    significance: {
      title: "呼气丙酮是酮症的线索，但不能替代血酮定量",
      body:
        "血酮很高时呼气可带丙酮气味，这是临床描述而不是本图的定量结论。丙酮生成慢、挥发快，浓度远低于乙酰乙酸与 β-羟丁酸，判读酮症仍以血酮为主，呼气检测只能作辅助。",
    },
    exam: {
      title: "考点是旁路定位、生成方式与排出途径",
      items: [
        "丙酮由乙酰乙酸脱羧生成，教材口径写作自发脱羧为主。",
        "丙酮主要经呼气排出，少量随尿排出，不是主要供能酮体。",
        "三种酮体里只有乙酰乙酸与丙酮含酮羰基，β-羟丁酸是羟基酸。",
      ],
    },
    pathways: [
      { label: "酮体代谢 kt-5：脱羧旁路", href: "/pathway/ketone?step=kt-5" },
    ],
    sources: [
      "ketone.json · steps[kt-5].equation / note / misconceptions",
      "ketone.json · readingGuide.paragraphs[2]",
      "Lehninger Principles of Biochemistry, 8e, Ch.17（酮体）",
    ],
    bubble: { what: "三碳酮，挥发性旁路产物", highlight: "经呼气排出，不参与供能" },
  },

  bhb: {
    id: "bhb",
    name: "β-羟丁酸",
    aliases: ["BHB", "beta-hydroxybutyrate", "D-3-羟丁酸"],
    claim: "β-羟丁酸是酮体在血中的主要运输形式，也是最主要的燃料形式",
    classification: "酮体：四碳 β-羟基酸，名字带“丁酸”，官能团不是酮。",
    structure: "四碳 β-羟基酸；C3 羟基与乙酰乙酸的 C3 酮羰基互为氧化还原对。",
    position: {
      title: "它在肝内由乙酰乙酸还原，在肝外被氧化回乙酰乙酸",
      body:
        "ketone.json 的 kt-4 是同一个 BDH1 的两个方向：肝内 NADH/NAD⁺ 比值高，把乙酰乙酸还原成 β-羟丁酸；肝外 NAD⁺ 占优，把 β-羟丁酸氧化回乙酰乙酸，再交给 OXCT1。kt-6 是肝外的利用段。",
    },
    flow: {
      title: "它从肝内乙酰乙酸还原来，往肝外线粒体的乙酰乙酸去",
      body:
        "来路：肝线粒体内乙酰乙酸 + NADH 经 BDH1 还原生成。去向：经血液运到心、肾、脑、骨骼肌，进线粒体后先被 BDH1 氧化回乙酰乙酸；肝自身缺 OXCT1，不能回收利用自己产出的 β-羟丁酸。",
    },
    significance: {
      title: "它决定酮症时血酮的主要升高成分",
      body:
        "糖尿病酮症酸中毒时 β-羟丁酸是主要升高的酮体，临床检测常以 β-羟丁酸为准；亚硝基铁氰化钠反应主要检出乙酰乙酸，对 β-羟丁酸不敏感，因此尿酮阴性不能排除酮症。",
    },
    exam: {
      title: "考点是命名陷阱、NADH 比值与肝内外分工",
      items: [
        "β-羟丁酸是 β-羟基酸，不是酮；三种酮体里只有乙酰乙酸与丙酮含酮羰基。",
        "乙酰乙酸与 β-羟丁酸的比例由线粒体 NADH/NAD⁺ 比值决定，不是两条独立的酶。",
        "肝缺 OXCT1，只生酮不利用酮体；利用发生在肝外组织。",
      ],
    },
    pathways: [
      { label: "酮体代谢 kt-4：乙酰乙酸 ⇌ β-羟丁酸", href: "/pathway/ketone?step=kt-4" },
      { label: "kt-6：肝外利用段", href: "/pathway/ketone?step=kt-6" },
    ],
    sources: [
      "ketone.json · steps[kt-4].significance / misconceptions",
      "ketone.json · steps[kt-6].significance",
      "ketone.json · transportSteps[kt-t1].note",
      "Lehninger Principles of Biochemistry, 8e, Ch.17（酮体）",
    ],
    bubble: { what: "四碳 β-羟基酸，不是酮", highlight: "血中主要的循环与燃料形式" },
  },

  acp: {
    id: "acp",
    name: "酰基载体蛋白（ACP）",
    aliases: ["ACP", "acyl carrier protein"],
    claim: "ACP 是脂肪酸合成线上的移动摆臂",
    classification: "酰基载体蛋白：FASN Ⅰ型里携带酰基的小分子蛋白。",
    structure: "酸性小蛋白，靠 4′-磷酸泛酰巯基乙胺辅基的巯基接住酰基；酰基在四个活性中心之间被摆过去。",
    position: {
      title: "它在四步环里来回送酰基，不在任何一步催化",
      body:
        "脂肪酸合成四步环的载体：fas-ks 缩合后释放 ACP，fas-te 水解后也释放 ACP。FASN Ⅰ型的 KS、KR、DH、ER 四个结构域都围着 ACP 工作；ACP 的磷酸泛酰巯基乙胺臂把增长的酰基从一个结构域送到下一个。",
    },
    flow: {
      title: "它在缩合后被释放，又接住下一轮丙二酰单元",
      body:
        "来路：ACP 在缩合步后以游离形式释放。去向：重新接住下一轮丙二酰单元，继续摆臂；终步被 TE 水解释放。",
    },
    significance: {
      title: "没有摆臂，四个结构域串不成流水线",
      body:
        "没有 ACP 的摆臂，四步环的缩合、还原、脱水、还原就无法在同一复合体上连续完成；它是把四个结构域串成一条流水线的结构基础。",
    },
    exam: {
      title: "考点是载体身份与辅基",
      items: [
        "ACP 不是酶，是酰基载体蛋白；它的辅基是磷酸泛酰巯基乙胺。",
        "ACP 靠巯基接酰基，形成硫酯，不是普通酯。",
        "四步环只在缩合步增碳，ACP 本身不催化反应。",
      ],
    },
    pathways: [
      { label: "脂肪酸合成 fas-ks 缩合步释放 ACP", href: "/pathway/fatty-acid-synthesis?step=fas-ks" },
      { label: "fas-te 终步水解后释放 ACP", href: "/pathway/fatty-acid-synthesis?step=fas-te" },
    ],
    sources: [
      "fas.json · steps[fas-ks].equation / reaction",
      "fas.json · steps[fas-te].equation / significance",
      "Lehninger Principles of Biochemistry, 8e, Ch.21",
    ],
    bubble: { what: "酰基载体蛋白，四步环的摆臂", highlight: "把增长的酰基送到下一个结构域" },
  },

  acylcarn: {
    id: "acylcarn",
    name: "脂酰肉碱",
    aliases: ["acylcarnitine", "棕榈酰肉碱"],
    claim: "脂酰肉碱是长链脂肪酸过内膜的临时车牌",
    classification: "酰基肉碱：脂酰基与肉碱的 β-羟基成酯。",
    structure: "肉碱的 β-羟基与脂酰基成酯，极性明显高于脂酰-CoA；这个极性让它可以被 CACT 转运。",
    position: {
      title: "它只在肉碱穿梭这一段存在",
      body:
        "肉碱穿梭系统 fao-shuttle 的中间物：CPT1 产物、CACT 底物、CPT2 底物。胞质中 CPT1 把脂酰-CoA 的脂酰基转到肉碱上，生成脂酰肉碱；CACT 把它转进线粒体内膜，基质侧 CPT2 再把脂酰基转回 CoA-SH。",
    },
    flow: {
      title: "CPT1 造它，CPT2 拆它",
      body:
        "来路：脂酰-CoA 在 CPT1 处接受肉碱生成。去向：经 CACT 过内膜，在 CPT2 处把脂酰基交回 CoA，自身变回肉碱。",
    },
    significance: {
      title: "它是长链脂肪酸唯一的入场券",
      body:
        "长链脂酰-CoA 不能直接过内膜；换成脂酰肉碱是唯一入场券，CPT1 还是被丙二酰-CoA 抑制的限速闸。",
    },
    exam: {
      title: "考点是三次换手与限速闸",
      items: [
        "穿梭是三次换手：CPT1 → CACT → CPT2，不是一次转运。",
        "CPT1 在线粒体外膜胞质侧，CPT2 在内膜基质侧；限速的是 CPT1。",
        "丙二酰-CoA 抑制 CPT1，脂合成开启时关闭 β-氧化入口。",
      ],
    },
    pathways: [
      { label: "肉碱穿梭 fao-shuttle 中间物", href: "/pathway/fatty-acid-oxidation?step=fao-shuttle" },
    ],
    sources: [
      "fao.json · steps[fao-shuttle].equation / significance",
      "fao.json · entities[acylcarn]",
      "Lehninger Principles of Biochemistry, 8e, Ch.17（Fatty Acid Catabolism）",
    ],
    bubble: { what: "脂酰基与肉碱的酯，过膜载体", highlight: "CPT1 造它，CPT2 拆它" },
    asset3d: "acylcarn",
  },

  "acylcoa-c16": {
    id: "acylcoa-c16",
    name: "脂酰-CoA（C16）",
    aliases: ["棕榈酰-CoA", "palmitoyl-CoA", "acyl-CoA"],
    claim: "脂酰-CoA 是 β-氧化的通用底物形式",
    classification: "酰基-CoA 硫酯：脂肪酸的羧基与辅酶 A 的巯基成硫酯。",
    structure: "长链酰基与辅酶 A 成硫酯；硫酯键的酰基转移势能高，C2–C3 位是脱氢的起点。",
    position: {
      title: "它是活化产物，也是四步环第 1 步的底物",
      body:
        "fao-act 产物、fao-shuttle 底物、fao-1 底物；C16 代表长链脂酰-CoA。fao-act 由脂酰-CoA 合成酶把棕榈酸、CoA 与 ATP 装成脂酰-CoA；进入基质后，fao-1 由酰基-CoA 脱氢酶在 C2–C3 脱氢。",
    },
    flow: {
      title: "它由脂肪酸活化而来，进基质后开始四步环",
      body:
        "来路：脂肪酸经脂酰-CoA 合成酶活化，生成脂酰-CoA、AMP 与 PPi。去向：经肉碱穿梭进基质，进入 β-氧化四步环；也可用于脂化修饰。",
    },
    significance: {
      title: "活化先付两个高能键，β-氧化才谈得上产能",
      body:
        "活化是把疏水脂肪酸变成可被酶识别的硫酯通货；ATP→AMP+PPi 直接拆 1 个高能键，PPi 水解再补 1 个，合计 2 个，是脂肪能量账要先扣 2 的原因。",
    },
    exam: {
      title: "考点是活化产物与穿梭限制",
      items: [
        "活化产物是脂酰-CoA + AMP + PPi，不是 ADP。",
        "PPi 随即水解，所以总代价是 2 个高能磷酸键。",
        "长链脂酰-CoA 不能直接过内膜，要先换成脂酰肉碱。",
      ],
    },
    pathways: [
      { label: "β-氧化 fao-act 活化产物", href: "/pathway/fatty-acid-oxidation?step=fao-act" },
      { label: "肉碱穿梭 fao-shuttle 底物", href: "/pathway/fatty-acid-oxidation?step=fao-shuttle" },
      { label: "四步环第 1 步 fao-1 底物", href: "/pathway/fatty-acid-oxidation?step=fao-1" },
    ],
    sources: [
      "fao.json · steps[fao-act].significance / equation",
      "fao.json · steps[fao-shuttle].equation",
      "fao.json · steps[fao-1].equation / significance",
      "Lehninger Principles of Biochemistry, 8e, Ch.17",
    ],
    bubble: { what: "酰基硫酯，β-氧化的入场形式", highlight: "活化花掉两个高能键" },
    asset3d: "acylcoa",
  },

  adp: {
    id: "adp",
    name: "ADP",
    aliases: ["腺苷二磷酸", "adenosine diphosphate"],
    claim: "ADP 是 ATP 的已兑现一半",
    classification: "核苷酸辅因子：腺苷二磷酸，两个磷酸基。",
    structure: "腺苷接两个串联磷酸基；末端磷酸基被水解后留下 ADP，仍保留一个高能键。",
    position: {
      title: "它是多条通路的磷酸受体与产物",
      body:
        "氧化磷酸化中，ATP 合酶把 ADP 与 Pi 装成 ATP；尿素循环 urea-1 中，CPS1 把 2 个 ATP 水解成 2 个 ADP；脂肪酸合成的 ACC 与 ACLY 步也以 ADP + Pi 形式放出。",
    },
    flow: {
      title: "它由 ATP 水解来，又被 ATP 合酶装回 ATP",
      body:
        "来路：ATP 水解或 ATP 合酶逆向反应生成。去向：被 ATP 合酶重新磷酸化成 ATP，或继续水解成 AMP。",
    },
    significance: {
      title: "ADP 浓度就是细胞能量状态的读数",
      body:
        "ADP 升高激活氧化磷酸化与糖酵解限速酶，ADP 低则说明能量充足；细胞靠 ATP/ADP 比值把产能与耗能接在一起。",
    },
    exam: {
      title: "考点是 ADP 与 AMP 的差别",
      items: [
        "ADP 不是 AMP；ADP 有一个高能键，AMP 没有。",
        "ATP 合酶的底物是 ADP + Pi，不是 AMP。",
        "ADP 升高激活 PFK-1 与氧化磷酸化，ATP 升高则抑制。",
      ],
    },
    pathways: [
      { label: "氧化磷酸化：ADP + Pi → ATP", href: "/pathway/oxphos" },
      { label: "尿素循环 urea-1：2 ATP → 2 ADP", href: "/pathway/urea-cycle?step=urea-1" },
      { label: "脂肪酸合成 fas-acc：ATP → ADP + Pi", href: "/pathway/fatty-acid-synthesis?step=fas-acc" },
    ],
    sources: [
      "urea-cycle/urea.json · steps[urea-1].equation",
      "fatty-acid-synthesis/fas.json · steps[fas-acc].equation / steps[fas-shuttle].equation",
      "oxphos.json · entities[adp]",
      "Lehninger Principles of Biochemistry, 8e, Ch.18 / Ch.19",
    ],
    bubble: { what: "腺苷二磷酸，ATP 的半个兑现", highlight: "能量状态的直接读数" },
  },

  akg: {
    id: "akg",
    name: "α-酮戊二酸",
    aliases: ["α-KG", "2-氧代戊二酸", "alpha-ketoglutarate"],
    claim: "α-酮戊二酸是 TCA 的调控闸与氮的汇点",
    classification: "α-酮酸：五碳二羧酸，C2 是酮羰基。",
    structure: "五碳二羧酸，C1 羧基旁是 C2 酮羰基；这个 α-酮酸结构既能被脱氢脱羧，也能接受转氨。",
    position: {
      title: "它夹在 tca-3 与 tca-4 之间，还接氨基酸的氨基",
      body:
        "tca-3 由异柠檬酸脱氢酶氧化脱羧生成 α-KG 与 NADH、CO₂；tca-4 由 α-KG 脱氢酶复合体再氧化脱羧，生成琥珀酰-CoA。aa-1 中丙氨酸把氨基转给 α-KG，生成丙酮酸与谷氨酸。",
    },
    flow: {
      title: "它从异柠檬酸和谷氨酸来，往琥珀酰-CoA 去",
      body:
        "来路：异柠檬酸经 ICDH 氧化脱羧；谷氨酸经转氨或氧化脱氨也生成 α-KG。去向：经 α-KG 脱氢酶复合体生成琥珀酰-CoA；或接受氨基变成谷氨酸。",
    },
    significance: {
      title: "它把碳代谢的调控与氮代谢的入口合在一处",
      body:
        "tca-3 是循环的限速步与主要调控点，ADP 与 Ca²⁺ 激活、ATP 与 NADH 抑制；α-KG 同时是氨基酸转氨的通用氨基受体，把碳代谢与氮代谢接在一起。",
    },
    exam: {
      title: "考点是限速步、复合体与转氨方向",
      items: [
        "α-KG 脱氢酶复合体与 PDH 同型，共用 E3，需要同样的五种辅因子。",
        "tca-3 是限速步，不是 tca-1；柠檬酸合酶只是闸门。",
        "转氨方向是 α-KG + 氨基酸 → 谷氨酸 + α-酮酸。",
      ],
    },
    pathways: [
      { label: "TCA tca-3 产物：异柠檬酸脱氢酶", href: "/pathway/tca?step=tca-3" },
      { label: "TCA tca-4 底物：α-KG 脱氢酶复合体", href: "/pathway/tca?step=tca-4" },
      { label: "氨基酸代谢 aa-1：丙氨酸转氨", href: "/pathway/amino-acids?step=aa-1" },
    ],
    sources: [
      "tca.json · steps[tca-3].significance / enzyme",
      "tca.json · steps[tca-4].significance / enzyme",
      "amino.json · steps[aa-1].equation",
      "Lehninger Principles of Biochemistry, 8e, Ch.16 / Ch.18",
    ],
    bubble: { what: "五碳 α-酮酸，TCA 的调控点", highlight: "既进 TCA，也接氨基酸的氨基" },
    asset3d: "akg",
  },

  ala: {
    id: "ala",
    name: "L-丙氨酸",
    aliases: ["丙氨酸", "Ala", "alanine"],
    claim: "丙氨酸是碳与氮之间的摆渡船",
    classification: "非极性 α-氨基酸：侧链是甲基。",
    structure: "α-氨基与羧基同碳，侧链只有一个甲基；侧链小，不参与特殊催化，主要承担运输。",
    position: {
      title: "它在 aa-1 接受转氨，也是糖异生的碳源",
      body:
        "氨基酸代谢 aa-1 底物；糖异生中由丙氨酸转氨生成丙酮酸。aa-1 由丙氨酸氨基转移酶（ALT）把丙氨酸的氨基转给 α-KG，生成丙酮酸与谷氨酸。",
    },
    flow: {
      title: "它从肌肉的丙酮酸来，到肝变成糖",
      body:
        "来路：肌肉中丙酮酸经 ALT 接受氨基生成丙氨酸。去向：经血到肝，ALT 逆向转氨生成丙酮酸，进入糖异生；氨基以尿素形式排出。",
    },
    significance: {
      title: "它让肌肉把碳与氮一起送到肝",
      body:
        "丙氨酸把肌肉的碳骨架与氮一起送到肝：碳用来造糖，氮进尿素循环。这条丙氨酸-葡萄糖循环避免了肌肉直接释放游离氨。",
    },
    exam: {
      title: "考点是 ALT 与丙氨酸-葡萄糖循环",
      items: [
        "ALT 把丙氨酸转成丙酮酸，不是乙酰-CoA。",
        "转氨的氨基受体是 α-KG，生成谷氨酸。",
        "丙氨酸-葡萄糖循环运送的是碳与氮，不是乳酸。",
      ],
    },
    pathways: [
      { label: "氨基酸代谢 aa-1：ALT 转氨", href: "/pathway/amino-acids?step=aa-1" },
      { label: "糖异生：丙氨酸转氨后生成丙酮酸", href: "/pathway/gluconeogenesis" },
    ],
    sources: [
      "amino.json · steps[aa-1].equation / enzyme",
      "gluconeogenesis.json · entities[ala]",
      "Lehninger Principles of Biochemistry, 8e, Ch.18 / Ch.23",
    ],
    bubble: { what: "小侧链氨基酸，碳氮摆渡船", highlight: "肌肉到肝，转氨后进糖异生" },
    asset3d: "ala",
  },

  amp: {
    id: "amp",
    name: "AMP",
    aliases: ["腺苷一磷酸", "adenosine monophosphate"],
    claim: "AMP 是能量耗竭的警报分子",
    classification: "核苷酸：腺苷一磷酸，只有一个磷酸基。",
    structure: "腺苷接一个磷酸基；没有可水解的高能键，是 ATP 两次水解后的产物。",
    position: {
      title: "它在连接酶步生成，也激活糖原分解",
      body:
        "fao-act 中脂酰-CoA 合成酶把 ATP 拆成 AMP + PPi；urea-3 中 ASS 也把 ATP 拆成 AMP + PPi。糖原分解中 AMP 与 ATP 竞争激活糖原磷酸化酶 b。",
    },
    flow: {
      title: "它从 ATP 来，经腺苷酸激酶回到 ADP",
      body:
        "来路：ATP 经连接酶反应失去两个磷酸基生成。去向：经腺苷酸激酶把 AMP 与 ATP 转成 2 ADP，回到 ATP 池。",
    },
    significance: {
      title: "AMP 升高就是把分解代谢的开关打开",
      body:
        "AMP 升高说明 ATP 被大量消耗；它激活 AMPK 与糖原磷酸化酶，把分解代谢开关打开。",
    },
    exam: {
      title: "考点是高能键数目与 AMPK",
      items: [
        "AMP 只有一个磷酸基，没有高能键；ATP→AMP+PPi 才是两个高能键。",
        "腺苷酸激酶催化 2 ADP ⇌ AMP + ATP，是 AMP 的主要来源。",
        "AMP 激活 AMPK，不是抑制。",
      ],
    },
    pathways: [
      { label: "β-氧化 fao-act：ATP → AMP + PPi", href: "/pathway/fatty-acid-oxidation?step=fao-act" },
      { label: "尿素循环 urea-3：ATP → AMP + PPi", href: "/pathway/urea-cycle?step=urea-3" },
      { label: "糖原代谢：AMP 激活磷酸化酶", href: "/pathway/glycogen" },
    ],
    sources: [
      "fao.json · steps[fao-act].equation",
      "urea.json · steps[urea-3].equation",
      "glycogen.json · entities[amp].note / steps",
      "Lehninger Principles of Biochemistry, 8e, Ch.17 / Ch.18",
    ],
    bubble: { what: "腺苷一磷酸，能量警报", highlight: "激活 AMPK 与糖原分解" },
  },

  asn: {
    id: "asn",
    name: "L-天冬酰胺",
    aliases: ["天冬酰胺", "Asn", "asparagine"],
    claim: "天冬酰胺是氮的临时仓库",
    classification: "极性 α-氨基酸：侧链酰胺基。",
    structure: "侧链末端是酰胺基，不带电荷但能形成氢键；酰胺氮可以水解释放氨。",
    position: {
      title: "它是 20 种标准氨基酸之一，数据层未拆其分解步骤",
      body:
        "天冬酰胺在氨基酸代谢页作为标准氨基酸出现；其侧链酰胺可由天冬酰胺酶水解，释放氨并生成天冬氨酸，后者进入 TCA 或尿素循环。",
    },
    flow: {
      title: "它从天冬氨酸来，水解释氨后回去",
      body:
        "来路：天冬氨酸与谷氨酰胺（或氨）在 ATP 参与下经天冬酰胺合成酶生成。去向：经天冬酰胺酶水解释放氨与天冬氨酸；天冬氨酸可转氨或进尿素循环。",
    },
    significance: {
      title: "它让氮以不伤细胞的形式在血中走",
      body:
        "天冬酰胺是血液中含量较高的氨基酸，承担氮的安全运输；肿瘤细胞依赖外源天冬酰胺，天冬酰胺酶因此成为白血病治疗药物。",
    },
    exam: {
      title: "考点是酰胺水解与两个分子的差别",
      items: [
        "天冬酰胺水解释放的是氨，产物是天冬氨酸，不是谷氨酸。",
        "天冬酰胺与天冬氨酸只差一个酰胺基，不是同一个分子。",
        "天冬酰胺酶把天冬酰胺水解成天冬氨酸 + NH₃。",
      ],
    },
    pathways: [
      { label: "氨基酸代谢：20 种氨基酸挂图", href: "/pathway/amino-acids" },
    ],
    sources: [
      "amino.json · skeleton nodes[aa-chip-asn]",
      "Lehninger Principles of Biochemistry, 8e, Ch.22（Biosynthesis of Amino Acids）",
    ],
    bubble: { what: "带酰胺侧链的氨基酸", highlight: "氮的安全运输与临时储存" },
  },

  atp: {
    id: "atp",
    name: "ATP",
    aliases: ["腺苷三磷酸", "adenosine triphosphate"],
    claim: "ATP 是细胞能量的通用现钞",
    classification: "核苷酸辅因子：腺苷三磷酸，三个串联磷酸基。",
    structure: "腺苷接三个磷酸基，末端两个是磷酸酐键；水解末端键放出较多自由能，也留下 ADP 与 Pi。",
    position: {
      title: "它是产能通路的终产物，也是耗能反应的共同供能者",
      body:
        "氧化磷酸化中 ATP 合酶把 ADP + Pi 装成 ATP；糖酵解 gk-1 与 gk-3 消耗 ATP，gk-7 与 gk-10 生成 ATP；尿素循环 urea-1 消耗 2 ATP，脂肪酸活化把 ATP 拆成 AMP + PPi。",
    },
    flow: {
      title: "它由底物水平磷酸化与氧化磷酸化来，水解后供能",
      body:
        "来路：底物水平磷酸化与氧化磷酸化。去向：水解成 ADP + Pi 或 AMP + PPi，把磷酸基与能量转给受体反应。",
    },
    significance: {
      title: "细胞靠高 ATP/ADP 比把反应偶联起来",
      body:
        "ATP 的水解自由能不是固定值，而随胞内 ATP/ADP/Pi 浓度比变化；细胞靠维持高 ATP/ADP 比把吸能反应与放能反应偶联。",
    },
    exam: {
      title: "考点是周转、两种水解与直接底物",
      items: [
        "ATP 不是能量库，周转极快；储能主要靠脂肪与糖原。",
        "ATP 水解成 ADP + Pi 与 AMP + PPi 是两种不同代价，后者拆两个高能键。",
        "氧化磷酸化的直接底物是 ADP + Pi，不是 AMP。",
      ],
    },
    pathways: [
      { label: "氧化磷酸化：ATP 合酶生成 ATP", href: "/pathway/oxphos" },
      { label: "糖酵解 gk-1：己糖激酶消耗 ATP", href: "/pathway/glycolysis?step=gk-1" },
      { label: "尿素循环 urea-1：CPS1 消耗 2 ATP", href: "/pathway/urea-cycle?step=urea-1" },
      { label: "β-氧化 fao-act：ATP → AMP + PPi", href: "/pathway/fatty-acid-oxidation?step=fao-act" },
    ],
    sources: [
      "oxphos.json · skeleton nodes[atp]",
      "glycolysis.json · steps[gk-1].equation / steps[gk-7].equation / steps[gk-10].equation",
      "urea.json · steps[urea-1].equation",
      "fao.json · steps[fao-act].equation",
      "Lehninger Principles of Biochemistry, 8e, Ch.19（Oxidative Phosphorylation）",
    ],
    bubble: { what: "腺苷三磷酸，能量的通用现钞", highlight: "水解末端键驱动耗能反应" },
  },

  bpg13: {
    id: "bpg13",
    name: "1,3-二磷酸甘油酸",
    aliases: ["1,3-BPG", "1,3-DPG"],
    claim: "1,3-二磷酸甘油酸把氧化与磷酸化绑在一起",
    classification: "酰基磷酸糖：3-磷酸甘油酸的 C1 羧基被磷酸化。",
    structure: "甘油酸 C1 羧基与磷酸成酰基磷酸，C3 另有磷酸酯；C1 的酰基磷酸是高能键。",
    position: {
      title: "它是 gk-6 产物、gk-7 底物，也是 gn-5 产物",
      body:
        "gk-6 由甘油醛-3-磷酸脱氢酶把 GAP 氧化成 1,3-BPG，同时把 Pi 装到 C1 羧基上，生成 NADH；gk-7 由磷酸甘油酸激酶把 C1 的酰基磷酸转给 ADP，生成 ATP。糖异生 gn-5 由同一激酶逆向消耗 ATP 把 3PG 抬回 1,3-BPG。",
    },
    flow: {
      title: "它从 GAP 氧化来，把磷酸交给 ADP 后变成 3PG",
      body:
        "来路：GAP + Pi + NAD⁺ 经 GAPDH 氧化生成。去向：经磷酸甘油酸激酶把磷酸基交给 ADP，生成 3PG + ATP。",
    },
    significance: {
      title: "它把 NADH 的还原当量与 ATP 的生成同时兑现",
      body:
        "这一步把氧化放能与磷酸化偶联：NADH 的还原当量与 C1 的酰基磷酸同时产生；砷酸盐冒充 Pi 会让偶联失效，通路仍氧化但不产 ATP。",
    },
    exam: {
      title: "考点是高能键位置与砷酸盐解偶联",
      items: [
        "1,3-BPG 的高能键是 C1 酰基磷酸，不是 C3 的普通磷酸酯。",
        "GAPDH 是糖酵解唯一的氧化步，生成 NADH。",
        "砷酸盐取代 Pi 会导致有氧化、无 ATP 的解偶联。",
      ],
    },
    pathways: [
      { label: "糖酵解 gk-6 产物：GAPDH", href: "/pathway/glycolysis?step=gk-6" },
      { label: "gk-7 底物：磷酸甘油酸激酶", href: "/pathway/glycolysis?step=gk-7" },
      { label: "糖异生 gn-5 产物", href: "/pathway/gluconeogenesis?step=gn-5" },
    ],
    sources: [
      "glycolysis.json · steps[gk-6].significance / equation",
      "glycolysis.json · steps[gk-7].significance / equation",
      "gluconeogenesis.json · steps[gn-5].significance",
      "Lehninger Principles of Biochemistry, 8e, Ch.14",
    ],
    bubble: { what: "酰基磷酸糖，氧化与磷酸化偶联", highlight: "把 Pi 存进高能键再交给 ADP" },
    asset3d: "13bpg",
  },

  camp: {
    id: "camp",
    name: "环腺苷一磷酸（cAMP）",
    aliases: ["cAMP", "cyclic AMP", "环磷酸腺苷"],
    claim: "cAMP 是肾上腺素在胞内留下的第二封信",
    classification: "环核苷酸：ATP 经腺苷酸环化酶环化后的第二信使。",
    structure: "腺嘌呤核苷的磷酸基与核糖 3′-羟基成环状磷酸二酯；这个环让磷酸二酯酶能专一水解它。",
    position: {
      title: "它不在糖原代谢的化学反应里，而是激素与激酶之间的信号节点",
      body:
        "糖原代谢页把它登记为信号实体，没有逐步步骤。肾上腺素与 β 受体结合，经 Gs 激活腺苷酸环化酶，把 ATP 变成 cAMP；cAMP 激活 PKA，PKA 再磷酸化磷酸化酶激酶与糖原合酶。",
    },
    flow: {
      title: "它从 ATP 环化来，被磷酸二酯酶水解成 AMP",
      body:
        "来路：ATP 经腺苷酸环化酶环化生成。去向：经磷酸二酯酶水解成 AMP，信号终止，AMP 再进入嘌呤代谢。",
    },
    significance: {
      title: "它把激素的胞外信号放大成胞内激酶级联",
      body:
        "cAMP 把激素的胞外信号放大成胞内激酶级联：PKA 磷酸化磷酸化酶激酶与糖原合酶，同时开启糖原分解、关闭糖原合成。",
    },
    exam: {
      title: "考点是生成方式与作用靶点",
      items: [
        "cAMP 由 ATP 环化生成，不是 AMP 磷酸化。",
        "磷酸二酯酶水解 cAMP 成 AMP；茶碱与咖啡因抑制该酶。",
        "cAMP 激活 PKA，不是直接激活糖原磷酸化酶。",
      ],
    },
    pathways: [
      { label: "糖原代谢：cAMP-PKA 级联", href: "/pathway/glycogen" },
    ],
    sources: [
      "glycogen.json · entities[camp].note",
      "glycogen.json · steps（磷酸化酶激酶级联）",
      "Lehninger Principles of Biochemistry, 8e, Ch.15（Glycogen Metabolism and Metabolic Regulation）",
    ],
    bubble: { what: "环核苷酸，激素的第二信使", highlight: "放大信号，激活 PKA 级联" },
  },

  carn: {
    id: "carn",
    name: "L-肉碱",
    aliases: ["肉碱", "carnitine", "L-carnitine"],
    claim: "肉碱是脂酰基过内膜的摆渡槽",
    classification: "季铵化合物：三甲基铵基与羟基丁酸。",
    structure: "小分子季铵羧酸，β-羟基是接受脂酰基的位点；两端的电荷让它留在水相而不溶于膜。",
    position: {
      title: "它只在肉碱穿梭这一段出现",
      body:
        "肉碱穿梭系统 fao-shuttle 的底物，线粒体内膜。CPT1 把脂酰-CoA 的脂酰基转到肉碱的 β-羟基上，生成脂酰肉碱；CACT 把它转进内膜，CPT2 再把脂酰基交回 CoA。",
    },
    flow: {
      title: "它在 CPT1 装货，在 CPT2 卸货，自身循环",
      body:
        "来路：动物由赖氨酸与甲硫氨酸合成，也可从食物摄取。去向：在 CPT1 接收脂酰基、在 CPT2 交回脂酰基，变回游离肉碱继续循环。",
    },
    significance: {
      title: "肉碱不足时长链脂肪酸进不了基质",
      body:
        "肉碱不足时长链脂肪酸无法进基质，β-氧化受限；它本身不被消耗，是载体，所以缺乏会造成脂质沉积与低血糖。",
    },
    exam: {
      title: "考点是载体身份与合成来源",
      items: [
        "肉碱是载体，不携带能量；脂酰基才是被搬运的货物。",
        "CPT1 把脂酰基转到肉碱，CPT2 反向操作。",
        "肉碱由赖氨酸与甲硫氨酸合成，素食者可能摄入不足。",
      ],
    },
    pathways: [
      { label: "肉碱穿梭 fao-shuttle 底物", href: "/pathway/fatty-acid-oxidation?step=fao-shuttle" },
    ],
    sources: [
      "fao.json · steps[fao-shuttle].equation / significance",
      "fao.json · entities[carn]",
      "Lehninger Principles of Biochemistry, 8e, Ch.17",
    ],
    bubble: { what: "季铵小分子，脂酰基的摆渡槽", highlight: "CPT1 装货，CPT2 卸货" },
    asset3d: "carn",
  },

  cholesterol: {
    id: "cholesterol",
    name: "胆固醇",
    aliases: ["cholesterol", "胆甾醇"],
    claim: "胆固醇是膜与甾体激素的共同原料",
    classification: "甾醇：四环甾核，C3 带羟基。",
    structure: "四环甾核、C3 羟基与疏水侧链；C3 羟基让它能插进膜脂双层，也让它能被酯化储存。",
    position: {
      title: "它是胆固醇合成的终产物，也是多条下游通路的起点",
      body:
        "胆固醇合成 ch-13 产物，内质网。羊毛甾醇经 CYP51A1、TM7SF2、MSMO1/NSDHL、HSD17B7、EBP、SC5D、DHCR7 一串反应生成胆固醇；DHCR24 可从 desmosterol 平行进入。",
    },
    flow: {
      title: "它从乙酰-CoA 经甲羟戊酸与角鲨烯来，往膜、胆汁酸、激素与维生素 D 去",
      body:
        "来路：乙酰-CoA → 甲羟戊酸 → 异戊烯基焦磷酸 → 角鲨烯 → 羊毛甾醇 → 胆固醇。去向：膜脂、胆汁酸、甾体激素与脂蛋白运输；其末端中间物 7-脱氢胆固醇在皮肤经 UV 照射生成维生素 D3。",
    },
    significance: {
      title: "它既是膜的调节器，也是激素与维生素 D 的原料",
      body:
        "胆固醇是膜流动性的调节器，也是胆汁酸与类固醇激素的前体；7-脱氢胆固醇经 UV 生成维生素 D3。合成受 HMG-CoA 还原酶与 LDL 受体双重调控。数据层 interfaces 只建了胆汁酸与甾体激素两条去向，维生素 D3 未建通路接口。",
    },
    exam: {
      title: "考点是限速酶、去向与碳源",
      items: [
        "胆固醇合成的限速酶是 HMG-CoA 还原酶。",
        "胆固醇不能彻底分解；去向包括胆汁酸、甾体激素与膜脂，7-脱氢胆固醇经 UV 生成维生素 D3。",
        "胆固醇合成的碳源是乙酰-CoA，不是脂肪酸。",
      ],
    },
    pathways: [
      { label: "胆固醇合成 ch-13 终产物", href: "/pathway/cholesterol?step=ch-13" },
      { label: "胆固醇合成通路", href: "/pathway/cholesterol" },
    ],
    sources: [
      "cholesterol.json · steps[ch-13].equation / enzyme",
      "cholesterol.json · interfaces[int-bile-acid / int-steroid]（仅两条去向接口）",
      "Lehninger Principles of Biochemistry, 8e, Ch.21（7-脱氢胆固醇经 UV 生成维生素 D3）",
    ],
    bubble: { what: "四环甾醇，膜与激素的原料", highlight: "HMG-CoA 还原酶决定它的产量" },
  },

  cit: {
    id: "cit",
    name: "柠檬酸",
    aliases: ["citrate", "枸橼酸"],
    claim: "柠檬酸既是 TCA 的闸门产物，也是胞质合成的信使",
    classification: "三羧酸：六碳三羧酸，C3 带羟基。",
    structure: "六碳三羧酸，C3 羟基与相邻羧基构成乌头酸酶的作用位点；三个羧基让它带负电。",
    position: {
      title: "它是 tca-1 产物、tca-2 底物，也是柠檬酸穿梭的货物",
      body:
        "tca-1 由柠檬酸合酶把乙酰-CoA 与草酰乙酸装成柠檬酸；tca-2 由乌头酸酶经顺乌头酸异构为异柠檬酸。柠檬酸还能出线粒体，在胞质被 ATP-柠檬酸裂解酶裂解，供脂肪酸合成。",
    },
    flow: {
      title: "它从乙酰-CoA 与 OAA 来，往异柠檬酸或胞质乙酰-CoA 去",
      body:
        "来路：乙酰-CoA + 草酰乙酸 + H₂O 经柠檬酸合酶生成。去向：经乌头酸酶异构为异柠檬酸继续 TCA；或出线粒体被 ACLY 裂解，供胞质乙酰-CoA。",
    },
    significance: {
      title: "它既是流量瓶颈的产物，也是糖酵解的刹车信号",
      body:
        "柠檬酸合酶捕获 OAA 是流量瓶颈；柠檬酸出线粒体是 FAS 原料的搬运形式，同时抑制 PFK-1，告诉糖酵解减速。",
    },
    exam: {
      title: "考点是第 1 步与限速步的区别",
      items: [
        "柠檬酸合酶是 TCA 第 1 步，不是限速步；限速是 tca-3。",
        "柠檬酸与异柠檬酸经乌头酸酶互变，中间是顺乌头酸。",
        "柠檬酸抑制 PFK-1，是 ATP 与柠檬酸充足的反馈信号。",
      ],
    },
    pathways: [
      { label: "TCA tca-1 产物：柠檬酸合酶", href: "/pathway/tca?step=tca-1" },
      { label: "tca-2 底物：乌头酸酶", href: "/pathway/tca?step=tca-2" },
      { label: "脂肪酸合成 fas-shuttle：柠檬酸出线粒体", href: "/pathway/fatty-acid-synthesis?step=fas-shuttle" },
    ],
    sources: [
      "tca.json · steps[tca-1].significance / equation",
      "tca.json · steps[tca-2].significance / equation",
      "fatty-acid-synthesis/fas.json · steps[fas-shuttle].equation",
      "Lehninger Principles of Biochemistry, 8e, Ch.16",
    ],
    bubble: { what: "六碳三羧酸，TCA 的闸门产物", highlight: "出线粒体就是脂合成的碳源" },
    asset3d: "cit",
  },

  co2: {
    id: "co2",
    name: "二氧化碳",
    aliases: ["CO₂", "carbon dioxide"],
    claim: "CO₂ 是脱羧反应留下的碳账本",
    classification: "无机气体：碳酸的酸酐。",
    structure: "线性三原子分子，溶于水生成碳酸；在胞内主要以 HCO₃⁻ 形式存在。",
    position: {
      title: "它出现在每一次脱羧的产物一侧",
      body:
        "ppp-o3 由 6-磷酸葡糖酸脱氢酶脱羧生成 CO₂；fas-pdh 由 PDH 把丙酮酸的 C1 脱掉；fas-ks 每轮缩合也释放一个 CO₂。",
    },
    flow: {
      title: "它从脱羧反应来，扩散出细胞经肺排出",
      body:
        "来路：氧化脱羧（PPP、PDH）与缩合脱羧（FAS）释放。去向：扩散出细胞经肺排出，或经碳酸酐酶转成 HCO₃⁻ 进入缓冲体系。",
    },
    significance: {
      title: "呼出的 CO₂ 就是碳骨架缩短的终点",
      body:
        "CO₂ 是碳骨架缩短的标记：PPP 把 C6 缩到 C5、PDH 把 C3 砍成 C2、FAS 每轮缩合丢一个碳；呼出的 CO₂ 就是这些碳的终点。",
    },
    exam: {
      title: "考点是各通路脱掉哪个碳",
      items: [
        "PPP 脱羧丢 C1，PDH 脱羧丢 C1，FAS 每轮丢一个碳。",
        "CO₂ 主要经碳酸酐酶变成 HCO₃⁻ 运输。",
        "CO₂ 不只是废物，它参与酸碱缓冲与呼吸调控。",
      ],
    },
    pathways: [
      { label: "磷酸戊糖途径 ppp-o3 脱羧", href: "/pathway/ppp?step=ppp-o3" },
      { label: "脂肪酸合成 fas-pdh：PDH 脱羧", href: "/pathway/fatty-acid-synthesis?step=fas-pdh" },
      { label: "fas-ks 缩合脱羧", href: "/pathway/fatty-acid-synthesis?step=fas-ks" },
    ],
    sources: [
      "ppp.json · steps[ppp-o3].equation",
      "fatty-acid-synthesis/fas.json · steps[fas-pdh].equation",
      "fatty-acid-synthesis/fas.json · steps[fas-ks].equation",
      "Lehninger Principles of Biochemistry, 8e, Ch.14 / Ch.21",
    ],
    bubble: { what: "无机气体，脱羧的碳账本", highlight: "每脱一次羧，碳骨架就短一截" },
  },

  coa: {
    id: "coa",
    name: "辅酶 A（CoA）",
    aliases: ["CoA", "coenzyme A", "CoA-SH"],
    claim: "辅酶 A 是酰基的通用插座",
    classification: "核苷酸辅因子：泛酸、腺苷与巯基乙胺构成。",
    structure: "泛酸（维生素 B5）接 ADP 与巯基乙胺；末端巯基与酰基成硫酯，把酰基牢牢挂住。",
    position: {
      title: "它在乙酰化、硫解与活化反应里反复出现",
      body:
        "fas-pdh 中 PDH 需要 CoA-SH 才能把丙酮酸装成乙酰-CoA；fas-shuttle 中 ACLY 用 CoA-SH 把柠檬酸裂解成胞质乙酰-CoA；fao-act 中脂酰-CoA 合成酶把 CoA 挂到脂肪酸上。",
    },
    flow: {
      title: "它从泛酸与 ATP 合成来，在反应中交出 CoA-SH",
      body:
        "来路：泛酸经磷酸化、与 ATP 偶联并接上巯基乙胺生成。去向：在硫解或水解反应中交出 CoA-SH，回到游离状态循环使用。",
    },
    significance: {
      title: "没有 CoA，所有酰基通货都立不起来",
      body:
        "没有 CoA，乙酰-CoA、脂酰-CoA 与琥珀酰-CoA 都无法成立；泛酸缺乏会让 PDH 与 β-氧化同时降速。",
    },
    exam: {
      title: "考点是巯基、泛酸与载体身份",
      items: [
        "CoA 的活性基团是末端巯基，结合形式是硫酯。",
        "泛酸是 CoA 的必需成分，缺乏会影响糖与脂代谢。",
        "游离 CoA 本身不携带能量；酰基-CoA 的硫酯键携带酰基转移势能。",
      ],
    },
    pathways: [
      { label: "脂肪酸合成 fas-pdh：PDH 底物", href: "/pathway/fatty-acid-synthesis?step=fas-pdh" },
      { label: "fas-shuttle：ACLY 底物", href: "/pathway/fatty-acid-synthesis?step=fas-shuttle" },
      { label: "β-氧化 fao-act：脂酰-CoA 合成酶底物", href: "/pathway/fatty-acid-oxidation?step=fao-act" },
    ],
    sources: [
      "fatty-acid-synthesis/fas.json · steps[fas-pdh].equation",
      "fatty-acid-synthesis/fas.json · steps[fas-shuttle].equation",
      "fao.json · steps[fao-act].equation",
      "Lehninger Principles of Biochemistry, 8e, Ch.14 / Ch.17",
    ],
    bubble: { what: "泛酸构成的辅因子，酰基插座", highlight: "硫酯键挂住乙酰与脂酰" },
  },

  cys: {
    id: "cys",
    name: "L-半胱氨酸",
    aliases: ["半胱氨酸", "Cys", "cysteine"],
    claim: "半胱氨酸是硫与还原力的出口",
    classification: "含硫 α-氨基酸：侧链巯基。",
    structure: "侧链末端是巯基；巯基 pKa 约 8.3，生理 pH 下部分电离，能形成二硫键。",
    position: {
      title: "它被列为标准氨基酸，转硫途径只登记到胱硫醚",
      body:
        "氨基酸代谢页把 cys 列为 20 种标准氨基酸；数据层的 aa-7 由胱硫醚 β-合酶把同型半胱氨酸与丝氨酸缩合成胱硫醚，再裂解生成半胱氨酸属于同一转硫途径的下一步。",
    },
    flow: {
      title: "它从同型半胱氨酸与丝氨酸来，往谷胱甘肽与硫酸盐去",
      body:
        "来路：甲硫氨酸转成同型半胱氨酸，与丝氨酸缩合成胱硫醚（aa-7），再裂解生成半胱氨酸与 α-酮丁酸。去向：合成谷胱甘肽、牛磺酸与 CoA 的巯基，或氧化成硫酸盐排出。",
    },
    significance: {
      title: "巯基是细胞还原力的中心",
      body:
        "半胱氨酸的巯基是谷胱甘肽的还原中心；它也是硫原子的出口，把甲硫氨酸的硫转成可排泄的硫酸盐。",
    },
    exam: {
      title: "考点是转硫途径与二硫键",
      items: [
        "半胱氨酸与胱氨酸是还原型与二硫键氧化型，不是两种不同氨基酸。",
        "转硫途径：同型半胱氨酸 + 丝氨酸 → 胱硫醚 → 半胱氨酸 + α-酮丁酸。",
        "胱硫醚 β-合酶缺陷导致同型半胱氨酸尿症。",
      ],
    },
    pathways: [
      { label: "氨基酸代谢 aa-7：转硫途径", href: "/pathway/amino-acids?step=aa-7" },
      { label: "氨基酸代谢：20 种氨基酸挂图", href: "/pathway/amino-acids" },
    ],
    sources: [
      "amino.json · entities[cys].note / chargeBasis",
      "amino.json · steps[aa-7].equation / enzyme",
      "Lehninger Principles of Biochemistry, 8e, Ch.22",
    ],
    bubble: { what: "含巯基氨基酸，还原力出口", highlight: "谷胱甘肽的还原中心" },
  },

  cystathionine: {
    id: "cystathionine",
    name: "L-胱硫醚",
    aliases: ["胱硫醚", "cystathionine"],
    claim: "胱硫醚是转硫途径的中转站",
    classification: "含硫二氨基酸：同型半胱氨酸与丝氨酸的缩合产物。",
    structure: "两个氨基两个羧基，中间由硫醚键把四碳与三碳骨架连起来；硫醚键是下一步裂解的位点。",
    position: {
      title: "它是 aa-7 产物，站在转硫途径的中点",
      body:
        "aa-7 由胱硫醚 β-合酶在同型半胱氨酸与丝氨酸之间成硫醚键，生成胱硫醚，胞质。下一步由胱硫醚 γ-裂解酶把硫醚键打开。",
    },
    flow: {
      title: "它从同型半胱氨酸与丝氨酸缩合来，裂解后交出半胱氨酸",
      body:
        "来路：同型半胱氨酸 + 丝氨酸经胱硫醚 β-合酶缩合，生成胱硫醚与水。去向：经胱硫醚 γ-裂解酶裂解为半胱氨酸与 α-酮丁酸。",
    },
    significance: {
      title: "它把甲硫氨酸的硫转给丝氨酸的碳骨架",
      body:
        "它把甲硫氨酸的硫转给丝氨酸的碳骨架；胱硫醚 β-合酶缺陷时同型半胱氨酸升高，胱硫醚生成减少，不会堆积。",
    },
    exam: {
      title: "考点是缩合原料与裂解产物",
      items: [
        "胱硫醚由同型半胱氨酸与丝氨酸缩合，不是两个半胱氨酸。",
        "胱硫醚 β-合酶缺陷是同型半胱氨酸尿症最常见的原因。",
        "裂解产物是半胱氨酸与 α-酮丁酸，α-酮丁酸进 TCA。",
      ],
    },
    pathways: [
      { label: "氨基酸代谢 aa-7 产物", href: "/pathway/amino-acids?step=aa-7" },
    ],
    sources: [
      "amino.json · steps[aa-7].equation / enzyme / significance",
      "Lehninger Principles of Biochemistry, 8e, Ch.22",
    ],
    bubble: { what: "含硫二氨基酸，转硫中转站", highlight: "裂解后交出半胱氨酸" },
  },

  cytc: {
    id: "cytc",
    name: "细胞色素 c",
    aliases: ["cyt c", "cytochrome c"],
    claim: "细胞色素 c 是呼吸链上的可溶性信使",
    classification: "血红素蛋白：单一血红素 c 辅基的小分子细胞色素。",
    structure: "小而可溶的血红素蛋白，血红素 c 通过两个硫醚键与蛋白共价连接；表面赖氨酸让它与复合体 III/IV 快速碰撞。",
    position: {
      title: "它在复合体 III 与复合体 IV 之间来回穿梭",
      body:
        "氧化磷酸化页把它登记为实体，数据层没有逐步步骤。复合体 III 把电子交给 cyt c 的血红素铁；cyt c 在水相中扩散到复合体 IV，把电子交出去。",
    },
    flow: {
      title: "它从复合体 III 接电子，往复合体 IV 送",
      body:
        "来路：复合体 III 把电子交给 cyt c 的血红素铁，Fe³⁺ 变 Fe²⁺。去向：cyt c 把电子交给复合体 IV，自身回到 Fe³⁺ 状态。",
    },
    significance: {
      title: "它是膜间隙里的电子渡船，也是凋亡信号",
      body:
        "它在膜外侧水相中穿梭，把复合体 III 与 IV 接起来；cyt c 释放到胞质还是凋亡信号，说明它不只是电子载体。",
    },
    exam: {
      title: "考点是可溶性、不泵质子与凋亡",
      items: [
        "cyt c 是膜间隙可溶蛋白，不是膜内在蛋白。",
        "它传递电子，不泵质子；泵质子的是复合体 I、III、IV。",
        "cyt c 释放入胞质会触发凋亡。",
      ],
    },
    pathways: [
      { label: "氧化磷酸化：复合体 III → cyt c → 复合体 IV", href: "/pathway/oxphos" },
    ],
    sources: [
      "oxphos.json · entities[cytc]",
      "Lehninger Principles of Biochemistry, 8e, Ch.19",
    ],
    bubble: { what: "血红素蛋白，膜间隙电子穿梭", highlight: "把复合体 III 接到 IV" },
  },

  desmosterol: {
    id: "desmosterol",
    name: "链甾醇（desmosterol）",
    aliases: ["desmosterol", "24-脱氢胆固醇"],
    claim: "链甾醇是胆固醇合成的平行出口",
    classification: "甾醇：C24 位带双键的胆固醇前体。",
    structure: "甾核与胆固醇相同，C24 位多一个双键；DHCR24 还原这个双键后成为胆固醇。",
    position: {
      title: "它在末段与 7-DHC 路线并行，由 DHCR24 还原成胆固醇",
      body:
        "胆固醇合成页把它登记为实体，没有逐步步骤。desmosterol 由羊毛甾醇下游的甾醇中间物经去甲基与还原生成，DHCR24 在其 C24 位还原双键后成为胆固醇，与 DHCR7 的 7-DHC 路线在末段并行。",
    },
    flow: {
      title: "它从羊毛甾醇下游中间物来，被 DHCR24 还原成胆固醇",
      body:
        "来路：羊毛甾醇下游的甾醇中间物经去甲基与还原生成 desmosterol（数据层未逐步列出）。去向：DHCR24 还原 C24 双键生成胆固醇。",
    },
    significance: {
      title: "两条平行末路让胆固醇合成末段既有冗余也有分工",
      body:
        "DHCR24 与 DHCR7 是两条平行末路；任一条受阻都会让前体堆积，说明胆固醇合成末段有冗余也有分工。",
    },
    exam: {
      title: "考点是 C24 双键与平行路线",
      items: [
        "链甾醇不是胆固醇，差别在 C24 双键。",
        "DHCR24 与 DHCR7 是两条平行还原路线。",
        "两条路线都在内质网完成。",
      ],
    },
    pathways: [
      { label: "胆固醇合成：DHCR24 平行路线", href: "/pathway/cholesterol" },
    ],
    sources: [
      "cholesterol.json · entities[desmosterol].note",
      "cholesterol.json · steps[ch-13].equation",
      "Lehninger Principles of Biochemistry, 8e, Ch.21",
    ],
    bubble: { what: "甾醇中间物，C24 带双键", highlight: "DHCR24 还原后变胆固醇" },
  },

  dhap: {
    id: "dhap",
    name: "磷酸二羟丙酮",
    aliases: ["DHAP", "dihydroxyacetone phosphate"],
    claim: "磷酸二羟丙酮是醛缩酶拆出的另一半",
    classification: "三碳糖磷酸：C2 酮基、C1 与 C3 各带羟基。",
    structure: "三碳糖磷酸，C2 是酮羰基，没有醛基；与 GAP 是异构体，可经磷酸丙糖异构酶互变。",
    position: {
      title: "它是 gk-4 产物、gk-5 底物，也是 gn-7 产物",
      body:
        "gk-4 由醛缩酶把 FBP 裂成 GAP 与 DHAP；gk-5 由磷酸丙糖异构酶把 DHAP 转成 GAP。糖异生 gn-7 逆向生成 DHAP，等待与 GAP 缩合。",
    },
    flow: {
      title: "它从 FBP 裂解来，异构后并进 GAP 主线",
      body:
        "来路：FBP 经醛缩酶裂解生成 GAP + DHAP。去向：经磷酸丙糖异构酶转成 GAP，进入糖酵解后半段；糖异生时反向生成，等待与 GAP 缩合。",
    },
    significance: {
      title: "它本身不进能量账，必须先变成 GAP",
      body:
        "DHAP 本身不进能量账，它必须变成 GAP 才能继续；磷酸丙糖异构酶把两者维持近平衡，使每分子 FBP 实际产出 2 个 GAP。",
    },
    exam: {
      title: "考点是裂解产物与异构",
      items: [
        "醛缩酶产物是 GAP + DHAP，不是两个 GAP。",
        "DHAP 经磷酸丙糖异构酶变 GAP，不消耗 ATP。",
        "甘油进入糖酵解也经 DHAP/GAP，甘油激酶在肝。",
      ],
    },
    pathways: [
      { label: "糖酵解 gk-4 产物：醛缩酶", href: "/pathway/glycolysis?step=gk-4" },
      { label: "gk-5 底物：磷酸丙糖异构酶", href: "/pathway/glycolysis?step=gk-5" },
      { label: "糖异生 gn-7 产物", href: "/pathway/gluconeogenesis?step=gn-7" },
    ],
    sources: [
      "glycolysis.json · steps[gk-4].equation / steps[gk-5].significance",
      "gluconeogenesis.json · steps[gn-7].equation / significance",
      "Lehninger Principles of Biochemistry, 8e, Ch.14",
    ],
    bubble: { what: "三碳糖磷酸，醛缩酶的另一半", highlight: "异构后并进 GAP 主线" },
    asset3d: "dhap",
  },

  dmapp: {
    id: "dmapp",
    name: "二甲基烯丙基二磷酸",
    aliases: ["DMAPP", "dimethylallyl pyrophosphate"],
    claim: "二甲基烯丙基二磷酸是异戊二烯的烯丙基供体",
    classification: "异戊二烯焦磷酸：IPP 的异构体。",
    structure: "五碳焦磷酸，双键位置与 IPP 不同；末端焦磷酸是离去基，烯丙型碳正离子是缩合位点。",
    position: {
      title: "它是 ch-7 产物、ch-8 底物，胞质",
      body:
        "ch-7 由异戊烯基二磷酸异构酶 1（IDI1）把 IPP 异构为 DMAPP；ch-8 由法尼基二磷酸合酶把 IPP 与 DMAPP 缩合成 GPP，胞质。",
    },
    flow: {
      title: "它从 IPP 异构来，与 IPP 缩合成 GPP 后继续延长",
      body:
        "来路：IPP 经 IDI1 异构化。去向：与 IPP 缩合成 GPP（ch-8），继续延长成 FPP 与 GGPP。",
    },
    significance: {
      title: "缩合需要烯丙基供体，DMAPP 就是这个供体",
      body:
        "缩合反应需要烯丙基供体，DMAPP 就是这个供体；没有 IDI1，IPP 无法启动异戊二烯链的延长。",
    },
    exam: {
      title: "考点是异构体身份与供体角色",
      items: [
        "DMAPP 与 IPP 是异构体，不是两个独立合成的分子。",
        "缩合时 DMAPP 提供烯丙基，IPP 提供双键受体。",
        "他汀抑制 HMG-CoA 还原酶，减少下游 IPP 与 DMAPP。",
      ],
    },
    pathways: [
      { label: "胆固醇合成 ch-7 产物：IDI1", href: "/pathway/cholesterol?step=ch-7" },
      { label: "ch-8 底物：法尼基二磷酸合酶", href: "/pathway/cholesterol?step=ch-8" },
    ],
    sources: [
      "cholesterol.json · steps[ch-7].equation / enzyme",
      "cholesterol.json · steps[ch-8].equation",
      "cholesterol.json · entities[dmapp].note",
      "Lehninger Principles of Biochemistry, 8e, Ch.21",
    ],
    bubble: { what: "异戊二烯焦磷酸，烯丙基供体", highlight: "与 IPP 缩合成 GPP" },
  },

  e4p: {
    id: "e4p",
    name: "D-赤藓糖-4-磷酸",
    aliases: ["E4P", "erythrose-4-phosphate"],
    claim: "赤藓糖-4-磷酸是转酮醇酶的接头",
    classification: "四碳糖磷酸：赤藓糖的 C4 磷酸酯。",
    structure: "四碳醛糖磷酸，C1 醛基是转酮醇酶接受的位点；C2 羟基决定它只能接二碳单位。",
    position: {
      title: "它是 ppp-n4 产物、ppp-n5 底物",
      body:
        "ppp-n4 由转醛醇酶把 S7P 与 GAP 重排成 E4P + F6P；ppp-n5 由转酮醇酶把 Xu5P 的二碳单位交给 E4P，生成 F6P + GAP。",
    },
    flow: {
      title: "它从 S7P 与 GAP 的重排来，接二碳后变 F6P",
      body:
        "来路：S7P + GAP 经转醛醇酶生成 E4P + F6P。去向：与 Xu5P 经转酮醇酶生成 F6P + GAP。",
    },
    significance: {
      title: "它是 S7P 失去三碳后剩下的 C4 残段",
      body:
        "转醛醇酶把 S7P 的三碳交给 GAP，生成 F6P，同时留下 E4P；转酮醇酶再把 Xu5P 的二碳交给 E4P，生成 F6P + GAP。非氧化相整体把 3 个 C5 重排成 2 个 C6 加 1 个 C3（15C = 12C + 3C）。",
    },
    exam: {
      title: "考点是碳数与两种切分酶",
      items: [
        "E4P 是四碳，不是五碳。",
        "转醛醇酶切三碳，转酮醇酶切二碳。",
        "PPP 非氧化相不产 NADPH，只重排碳骨架。",
      ],
    },
    pathways: [
      { label: "磷酸戊糖途径 ppp-n4 产物", href: "/pathway/ppp?step=ppp-n4" },
      { label: "ppp-n5 底物：转酮醇酶", href: "/pathway/ppp?step=ppp-n5" },
    ],
    sources: [
      "ppp.json · steps[ppp-n4].equation / significance",
      "ppp.json · steps[ppp-n5].equation / significance",
      "Lehninger Principles of Biochemistry, 8e, Ch.14",
    ],
    bubble: { what: "四碳糖磷酸，碳重排接头", highlight: "接住三碳再交二碳" },
    asset3d: "e4p",
  },

  "enoyl-c16": {
    id: "enoyl-c16",
    name: "反式-Δ²-烯酰-CoA",
    aliases: ["enoyl-CoA", "烯酰-CoA"],
    claim: "烯酰-CoA 是 β-氧化四步环的第二站",
    classification: "烯酰-CoA 硫酯：C2–C3 之间有一个反式双键。",
    structure: "长链硫酯，C2–C3 反式双键；双键是水合酶的作用位点，决定下一步只生成 L-3-羟基。",
    position: {
      title: "它是 fao-1 产物、fao-2 底物",
      body:
        "fao-1 由酰基-CoA 脱氢酶在脂酰-CoA 的 C2–C3 取氢，生成反式-Δ²-烯酰-CoA 与 FADH₂；fao-2 由烯酰-CoA 水合酶加水，生成 L-3-羟脂酰-CoA。",
    },
    flow: {
      title: "它从脱氢来，水合后变成 L-3-羟基脂酰-CoA",
      body:
        "来路：脂酰-CoA 经酰基-CoA 脱氢酶在 C2–C3 脱氢生成。去向：经烯酰-CoA 水合酶加水，生成 L-3-羟脂酰-CoA。",
    },
    significance: {
      title: "脱氢把电子交给 FAD，双键成为水合酶底物",
      body:
        "脱氢把电子交给 FAD，双键成为水合酶底物；这一站决定 β-氧化每轮的 1.5 ATP 当量来自 FADH₂。",
    },
    exam: {
      title: "考点是双键构型与两步的辅因子",
      items: [
        "双键是反式-Δ²，不是顺式。",
        "水合酶只生成 L-3-羟基，不生成 D 型。",
        "FAD 参与第 1 步，NAD⁺ 参与第 3 步。",
      ],
    },
    pathways: [
      { label: "β-氧化 fao-1 产物", href: "/pathway/fatty-acid-oxidation?step=fao-1" },
      { label: "fao-2 底物：烯酰-CoA 水合酶", href: "/pathway/fatty-acid-oxidation?step=fao-2" },
    ],
    sources: [
      "fao.json · steps[fao-1].equation / significance",
      "fao.json · steps[fao-2].equation / significance",
      "Lehninger Principles of Biochemistry, 8e, Ch.17",
    ],
    bubble: { what: "烯酰硫酯，四步环第二站", highlight: "水合后变成 L-3-羟基" },
    asset3d: "enoyl-c16",
  },

  f6p: {
    id: "f6p",
    name: "果糖-6-磷酸",
    aliases: ["F6P", "fructose-6-phosphate"],
    claim: "果糖-6-磷酸是糖酵解的分流与限速入口",
    classification: "糖磷酸酯：果糖的 C6 磷酸酯。",
    structure: "酮糖磷酸，C2 是酮羰基；C1 羟基在下一步被 PFK-1 磷酸化，是限速步的把手。",
    position: {
      title: "它是 gk-2 产物、gk-3 底物，也是 gn-9 产物",
      body:
        "gk-2 由磷酸葡萄糖异构酶把 G6P 变成果糖-6-磷酸；gk-3 由 PFK-1 把它磷酸化成 FBP。糖异生 gn-9 由 FBPase-1 水解 FBP 回到 F6P；PPP 非氧化相也生成 F6P。",
    },
    flow: {
      title: "它从 G6P 与 PPP 来，往 FBP 去",
      body:
        "来路：G6P 经磷酸葡萄糖异构酶；PPP 非氧化相也生成 F6P。去向：经 PFK-1 磷酸化成 FBP；糖异生时经 FBPase-1 水解回 F6P。",
    },
    significance: {
      title: "PFK-1 这一步决定全通路流量",
      body:
        "PFK-1 这一步是全通路限速点，ATP 与柠檬酸抑制，AMP 与 F2,6BP 激活；F6P 的浓度直接决定流量。",
    },
    exam: {
      title: "考点是限速酶与双向调控",
      items: [
        "PFK-1 是限速酶，不是己糖激酶。",
        "F6P → FBP 消耗 ATP，糖异生 FBP → F6P 只水解，不产 ATP。",
        "F2,6BP 激活 PFK-1、抑制 FBPase-1，双向拉动。",
      ],
    },
    pathways: [
      { label: "糖酵解 gk-2 产物", href: "/pathway/glycolysis?step=gk-2" },
      { label: "gk-3 底物：PFK-1", href: "/pathway/glycolysis?step=gk-3" },
      { label: "糖异生 gn-9 产物", href: "/pathway/gluconeogenesis?step=gn-9" },
    ],
    sources: [
      "glycolysis.json · steps[gk-2].significance / steps[gk-3].significance",
      "gluconeogenesis.json · steps[gn-9].significance",
      "ppp.json · steps[ppp-n5].equation",
      "Lehninger Principles of Biochemistry, 8e, Ch.14",
    ],
    bubble: { what: "糖磷酸酯，限速步的把手", highlight: "PFK-1 在这里决定通路流量" },
    asset3d: "f6p",
  },

  fa: {
    id: "fa",
    name: "棕榈酸（C16）",
    aliases: ["palmitate", "palmitic acid", "脂肪酸"],
    claim: "棕榈酸是脂肪酸合成的标准出厂品",
    classification: "饱和脂肪酸：C16 直链羧酸。",
    structure: "16 碳直链饱和羧酸，全反式构象；羧基是活化与酯化的位点，疏水尾决定膜与脂蛋白中的行为。",
    position: {
      title: "它是 fas-te 产物、fao-act 底物",
      body:
        "fas-te 由 FASN Ⅰ型的 TE 结构域把棕榈酰-ACP 水解成棕榈酸 + ACP；fao-act 由脂酰-CoA 合成酶把棕榈酸活化成棕榈酰-CoA。",
    },
    flow: {
      title: "它从棕榈酰-ACP 水解释放，活化后进 β-氧化或酯化",
      body:
        "来路：棕榈酰-ACP 经 TE 水解生成棕榈酸 + ACP。去向：活化形成棕榈酰-CoA 进 β-氧化；或酯化成甘油三酯、磷脂。",
    },
    significance: {
      title: "C16 是 TE 的选择性结果，不是四步环自动停止",
      body:
        "C16 是 TE 的选择性结果，不是四步环自动停止；棕榈酸是脂肪与膜脂最常用的饱和链。",
    },
    exam: {
      title: "考点是链长决定与活化代价",
      items: [
        "FAS 主要产物是棕榈酸（C16），不是硬脂酸（C18）。",
        "TE 决定链长；四步环本身不设定终点。",
        "棕榈酸活化消耗 2 个高能键。",
      ],
    },
    pathways: [
      { label: "脂肪酸合成 fas-te 产物", href: "/pathway/fatty-acid-synthesis?step=fas-te" },
      { label: "β-氧化 fao-act 底物", href: "/pathway/fatty-acid-oxidation?step=fao-act" },
    ],
    sources: [
      "fatty-acid-synthesis/fas.json · steps[fas-te].equation / significance",
      "fao.json · steps[fao-act].equation / significance",
      "Lehninger Principles of Biochemistry, 8e, Ch.21",
    ],
    bubble: { what: "十六碳饱和脂肪酸，标准出厂品", highlight: "TE 水解释放，活化成脂酰-CoA" },
    asset3d: "fa",
  },

  fad: {
    id: "fad",
    name: "氧化型黄素腺嘌呤二核苷酸（FAD）",
    aliases: ["FAD", "flavin adenine dinucleotide"],
    claim: "FAD 是双键氧化专用的电子中转",
    classification: "黄素辅因子：核黄素（维生素 B2）与 ADP 构成。",
    structure: "异咯嗪三环、核糖醇与 ADP；异咯嗪的 N5 与 C4a 能可逆地接两个氢。",
    position: {
      title: "它在 β-氧化第 1 步与复合体 II 反复出现",
      body:
        "fao-1 中酰基-CoA 脱氢酶以 FAD 为电子受体，把脂酰-CoA 的 C2–C3 脱氢；氧化磷酸化 oxphos-f 中复合体 II 也以 FAD 为核心。",
    },
    flow: {
      title: "它从核黄素与 ATP 合成来，接受两个氢后变 FADH₂",
      body:
        "来路：核黄素经 FAD 合成酶与 ATP 生成。去向：在酰基-CoA 脱氢酶步接受两个氢变成 FADH₂，电子经 ETF 进呼吸链。",
    },
    significance: {
      title: "它把低能级的双键氧化记在自己名下",
      body:
        "FAD 只做单电子或双电子中转，不能像 NAD⁺ 那样自由扩散；它与酶共价或紧密结合，把低能级的双键氧化记在 FADH₂ 名下。",
    },
    exam: {
      title: "考点是维生素来源与进入位点",
      items: [
        "FAD 来自维生素 B2，不是维生素 B3。",
        "FADH₂ 从复合体 II 进入，只对应 1.5 ATP 当量。",
        "FAD 在 β-氧化第 1 步，NAD⁺ 在第 3 步。",
      ],
    },
    pathways: [
      { label: "β-氧化 fao-1 底物", href: "/pathway/fatty-acid-oxidation?step=fao-1" },
      { label: "氧化磷酸化复合体 II", href: "/pathway/oxphos" },
    ],
    sources: [
      "fao.json · steps[fao-1].equation / significance",
      "oxphos.json · steps[oxphos-f]",
      "Lehninger Principles of Biochemistry, 8e, Ch.17 / Ch.19",
    ],
    bubble: { what: "黄素辅因子，双键氧化的中转", highlight: "记下 FADH₂ 的一点五当量" },
  },

  fadh2: {
    id: "fadh2",
    name: "还原型黄素腺嘌呤二核苷酸（FADH₂）",
    aliases: ["FADH2", "FADH₂", "reduced FAD"],
    claim: "FADH₂ 是低能级的还原当量",
    classification: "还原型黄素辅因子：FAD 接受两个氢后的形式。",
    structure: "异咯嗪环被还原，N5 与 N1 各带一个氢；与 FAD 之间可逆互变。",
    position: {
      title: "它是 oxphos-f 底物，也是 fao-1 产物",
      body:
        "氧化磷酸化 oxphos-f 中复合体 II 把 FADH₂ 的电子交给泛醌；fao-1 中酰基-CoA 脱氢酶把氢交给 FAD 生成 FADH₂。",
    },
    flow: {
      title: "它从脱氢反应来，在复合体 II 交出电子",
      body:
        "来路：琥珀酸脱氢酶与酰基-CoA 脱氢酶把氢交给 FAD 生成。去向：在复合体 II 把电子交给泛醌，自身回到 FAD。",
    },
    significance: {
      title: "它的电子绕过复合体 I，所以只值 1.5 ATP",
      body:
        "FADH₂ 的电子从复合体 II 进入，绕过复合体 I，所以只对应 1.5 ATP 当量；它不是 NADH 的等价物。",
    },
    exam: {
      title: "考点是进入位点与当量",
      items: [
        "FADH₂ 从复合体 II 进入，不是复合体 I。",
        "1 FADH₂ 约等于 1.5 ATP，1 NADH 约等于 2.5 ATP。",
        "FADH₂ 不直接给 ATP 合酶，电子要先经泛醌与复合体 III/IV。",
      ],
    },
    pathways: [
      { label: "氧化磷酸化 oxphos-f 底物", href: "/pathway/oxphos" },
      { label: "β-氧化 fao-1 产物", href: "/pathway/fatty-acid-oxidation?step=fao-1" },
    ],
    sources: [
      "oxphos.json · steps[oxphos-f]",
      "fao.json · steps[fao-1].equation / significance",
      "Lehninger Principles of Biochemistry, 8e, Ch.19",
    ],
    bubble: { what: "还原型黄素，低能级电子", highlight: "从复合体 II 进入呼吸链" },
  },

  "fas-c2": {
    id: "fas-c2",
    name: "脂酰-ACP（Cₙ）",
    aliases: ["acyl-ACP", "acylacp", "脂酰载体蛋白"],
    claim: "脂酰-ACP 是四步环的循环起点",
    classification: "酰基-ACP 硫酯：脂酰链挂在 ACP 的磷酸泛酰巯基乙胺上。",
    structure: "脂酰链与 ACP 辅基的巯基成硫酯；硫酯键既是缩合的接受位点，也是 TE 水解的出口。",
    position: {
      title: "它同时是 fas-ks 的底物、fas-er 的产物与 fas-te 的底物",
      body:
        "fas-er 还原本轮双键后重新生成脂酰-ACP；它进入 fas-ks 与丙二酰-ACP 缩合增碳。到 C16 时，fas-te 把它水解成棕榈酸与游离 ACP。",
    },
    flow: {
      title: "它从 ER 还原或起始装载来，往缩合或 TE 水解去",
      body:
        "来路：ER 还原本轮双键后生成，或起始由乙酰-CoA 装到 ACP。去向：进 KS 与丙二酰-ACP 缩合增碳，或到 C16 被 TE 水解成棕榈酸。",
    },
    significance: {
      title: "四步环每转一圈都要回到它",
      body:
        "四步环每转一圈都要回到脂酰-ACP 才能开始下一轮；它是循环的记数器，链长每轮加 2 个碳。",
    },
    exam: {
      title: "考点是 ACP 硫酯与增碳位置",
      items: [
        "脂酰-ACP 的酰基挂 ACP 的巯基，不是 CoA。",
        "缩合步才增碳，还原与脱水都不改变碳数。",
        "C16 由 TE 选择性终止，不是四步环自动停止。",
      ],
    },
    pathways: [
      { label: "脂肪酸合成 fas-ks 底物", href: "/pathway/fatty-acid-synthesis?step=fas-ks" },
      { label: "fas-er 产物", href: "/pathway/fatty-acid-synthesis?step=fas-er" },
      { label: "fas-te 底物", href: "/pathway/fatty-acid-synthesis?step=fas-te" },
    ],
    sources: [
      "fatty-acid-synthesis/fas.json · steps[fas-ks].equation",
      "fatty-acid-synthesis/fas.json · steps[fas-er].equation",
      "fatty-acid-synthesis/fas.json · steps[fas-te].equation / significance",
      "Lehninger Principles of Biochemistry, 8e, Ch.21",
    ],
    bubble: { what: "酰基-ACP 硫酯，循环起点", highlight: "每转一圈链长加两个碳" },
    asset3d: "fas-c2",
  },

  "fas-c4-enoyl": {
    id: "fas-c4-enoyl",
    name: "反式-Δ²-烯脂酰-ACP",
    aliases: ["enoyl-ACP", "enoylacp"],
    claim: "烯脂酰-ACP 是脱水留下的双键",
    classification: "烯酰-ACP 硫酯：C2–C3 反式双键。",
    structure: "脂酰链 C2–C3 反式双键，挂在 ACP 上；双键是 ER 还原的靶点。",
    position: {
      title: "它是 fas-dh 产物、fas-er 底物",
      body:
        "fas-dh 由 DH 结构域把 D-3-羟基脂酰-ACP 脱水，生成反式-Δ²-烯脂酰-ACP 与水；fas-er 由 ER 结构域用 NADPH 还原双键，回到饱和脂酰-ACP。",
    },
    flow: {
      title: "它从脱水来，被 NADPH 还原后回到饱和链",
      body:
        "来路：D-3-羟基脂酰-ACP 经 DH 脱水生成。去向：经 ER 用 NADPH 还原双键，回到饱和脂酰-ACP。",
    },
    significance: {
      title: "脱水与 β-氧化的水合正好反向",
      body:
        "脱水与 β-氧化的水合正好反向：合成脱水、氧化加水；ER 还原是每轮第二次 NADPH 消耗。",
    },
    exam: {
      title: "考点是双键方向与还原当量",
      items: [
        "FAS 脱水生成反式双键，β-氧化水合消耗反式双键。",
        "ER 还原用 NADPH，不是 NADH。",
        "每轮共耗 2 个 NADPH，KR 与 ER 各一个。",
      ],
    },
    pathways: [
      { label: "脂肪酸合成 fas-dh 产物", href: "/pathway/fatty-acid-synthesis?step=fas-dh" },
      { label: "fas-er 底物", href: "/pathway/fatty-acid-synthesis?step=fas-er" },
    ],
    sources: [
      "fatty-acid-synthesis/fas.json · steps[fas-dh].equation / significance",
      "fatty-acid-synthesis/fas.json · steps[fas-er].equation / significance",
      "Lehninger Principles of Biochemistry, 8e, Ch.21",
    ],
    bubble: { what: "烯酰-ACP，脱水留下的双键", highlight: "ER 用 NADPH 把双键还原" },
    asset3d: "fas-c4-enoyl",
  },

  "fas-c4-keto": {
    id: "fas-c4-keto",
    name: "3-酮脂酰-ACP",
    aliases: ["ketoacyl-ACP", "ketoacylacp"],
    claim: "酮脂酰-ACP 是缩合刚接上的羰基",
    classification: "β-酮脂酰-ACP：C3 酮基。",
    structure: "新接入的二碳单元在 C3 留下酮羰基；这个酮基是 KR 还原的靶点。",
    position: {
      title: "它是 fas-ks 产物、fas-kr 底物",
      body:
        "fas-ks 由 KS 结构域把脂酰-ACP 与丙二酰-ACP 缩合，生成 3-酮脂酰-ACP、ACP 与 CO₂；fas-kr 由 KR 结构域用 NADPH 把酮基还原成 D-3-羟基。",
    },
    flow: {
      title: "它从缩合来，被 KR 还原后变成 D-3-羟基",
      body:
        "来路：脂酰-ACP 与丙二酰-ACP 缩合，释放 ACP 与 CO₂。去向：经 KR 用 NADPH 还原成 D-3-羟基脂酰-ACP。",
    },
    significance: {
      title: "酮基的位置标记新碳的落点",
      body:
        "缩合是四步环唯一增碳步，酮基的位置标记新碳的落点；KR 把它还原掉，链才能继续。",
    },
    exam: {
      title: "考点是 CO₂ 来源与立体构型",
      items: [
        "缩合释放的 CO₂ 来自丙二酰的羧基碳，不进碳链。",
        "KR 生成 D-3-羟基，不是 L 型。",
        "缩合步由 KS 催化，ACP 在产物侧释放。",
      ],
    },
    pathways: [
      { label: "脂肪酸合成 fas-ks 产物", href: "/pathway/fatty-acid-synthesis?step=fas-ks" },
      { label: "fas-kr 底物", href: "/pathway/fatty-acid-synthesis?step=fas-kr" },
    ],
    sources: [
      "fatty-acid-synthesis/fas.json · steps[fas-ks].equation / significance",
      "fatty-acid-synthesis/fas.json · steps[fas-kr].equation",
      "Lehninger Principles of Biochemistry, 8e, Ch.21",
    ],
    bubble: { what: "β-酮脂酰-ACP，新碳的落点", highlight: "KR 还原后变成 D-3-羟基" },
    asset3d: "fas-c4-keto",
  },

  "fas-c4-oh": {
    id: "fas-c4-oh",
    name: "D-3-羟基脂酰-ACP",
    aliases: ["hydroxyacyl-ACP", "hydroxyacylacp"],
    claim: "羟基脂酰-ACP 是第一次还原的产物",
    classification: "D-3-羟基脂酰-ACP。",
    structure: "C3 羟基为 D 构型，挂在 ACP 上；羟基是 DH 脱水的离去基。",
    position: {
      title: "它是 fas-kr 产物、fas-dh 底物",
      body:
        "fas-kr 用 NADPH 把 3-酮脂酰-ACP 还原成 D-3-羟基脂酰-ACP；fas-dh 立刻把它脱水成反式-Δ²-烯脂酰-ACP。",
    },
    flow: {
      title: "它从 KR 还原来，脱水后变成烯脂酰-ACP",
      body:
        "来路：3-酮脂酰-ACP 经 KR 用 NADPH 还原。去向：经 DH 脱水生成反式-Δ²-烯脂酰-ACP。",
    },
    significance: {
      title: "D 构型是 FAS 的立体专一性标志",
      body:
        "D 构型是 FAS 的立体专一性标志；β-氧化水合只生成 L 型，两条通路在立体化学上互为镜像。",
    },
    exam: {
      title: "考点是 D/L 与消耗的还原当量",
      items: [
        "FAS 的 KR 生成 D-3-羟基；β-氧化水合酶生成 L-3-羟基。",
        "羟基不是终点，DH 马上脱水。",
        "这一步消耗 1 个 NADPH。",
      ],
    },
    pathways: [
      { label: "脂肪酸合成 fas-kr 产物", href: "/pathway/fatty-acid-synthesis?step=fas-kr" },
      { label: "fas-dh 底物", href: "/pathway/fatty-acid-synthesis?step=fas-dh" },
    ],
    sources: [
      "fatty-acid-synthesis/fas.json · steps[fas-kr].equation / significance",
      "fatty-acid-synthesis/fas.json · steps[fas-dh].equation",
      "Lehninger Principles of Biochemistry, 8e, Ch.21",
    ],
    bubble: { what: "D-3-羟基脂酰-ACP", highlight: "KR 还原的产物，DH 的底物" },
    asset3d: "fas-c4-oh",
  },

  "fas-malonyl": {
    id: "fas-malonyl",
    name: "丙二酰-CoA",
    aliases: ["malonyl-CoA", "malonylcoa"],
    claim: "丙二酰-CoA 是脂肪酸合成的 C2 增碳单元，每轮净增 2 碳",
    classification: "二羧酸单酰-CoA：丙二酸的 C3 羧基与 CoA 成硫酯。",
    structure: "三碳二羧酸，只有一端与 CoA 成硫酯；游离羧基碳在缩合时以 CO₂ 离去，剩下 C2 单元整体进链。",
    position: {
      title: "它是 fas-acc 产物；经 MAT 转成丙二酰-ACP 后才是 fas-ks 底物",
      body:
        "fas-acc 由乙酰-CoA 羧化酶把乙酰-CoA、HCO₃⁻ 与 ATP 装成丙二酰-CoA。数据层 fas-ks 的底物是 acylacp + malonylacp，丙二酰-CoA 本身不能直接缩合；它先由 FASN 的丙二酰/乙酰转移酶（MAT）结构域转到 ACP 上生成丙二酰-ACP。数据层未为 MAT 单列步骤。",
    },
    flow: {
      title: "它从乙酰-CoA 羧化来，经 MAT 上 ACP 后每轮净增 2 碳",
      body:
        "来路：乙酰-CoA + HCO₃⁻ + ATP 经 ACC 羧化生成。去向：MAT 把丙二酰基转到 ACP，生成丙二酰-ACP；KS 缩合时游离羧基碳以 CO₂ 离去，C2 单元整体接到脂酰-ACP 上，每轮净增 2 碳。",
    },
    significance: {
      title: "ACC 是通路的第一道承诺步，MAT 是进环前的转手",
      body:
        "只有羧化成丙二酰-CoA 的 C2 单元才能进四步环；它还须经 MAT 转到 ACP 上。ACC 是通路的第一道承诺步，也被 AMPK 磷酸化抑制；丙二酰-CoA 同时抑制 CPT1，脂合成与 β-氧化互相排斥。",
    },
    exam: {
      title: "考点是净增碳、MAT 转手与 CPT1 抑制",
      items: [
        "丙二酰-CoA 是三碳，但每轮净增 2 碳：游离羧基碳以 CO₂ 离去，C2 单元整体进链。",
        "丙二酰-CoA 不是 KS 的直接底物；它先经 FASN 的 MAT 结构域转成丙二酰-ACP。",
        "ACC 需要生物素，ATP 供能。",
        "丙二酰-CoA 抑制 CPT1，脂合成与 β-氧化互相排斥。",
      ],
    },
    pathways: [
      { label: "脂肪酸合成 fas-acc 产物", href: "/pathway/fatty-acid-synthesis?step=fas-acc" },
      { label: "fas-ks 底物：丙二酰-ACP（经 MAT 转手）", href: "/pathway/fatty-acid-synthesis?step=fas-ks" },
    ],
    sources: [
      "fatty-acid-synthesis/fas.json · steps[fas-acc].equation / significance",
      "fatty-acid-synthesis/fas.json · steps[fas-ks].substrates / equation",
      "Lehninger Principles of Biochemistry, 8e, Ch.21（FASN 的 MAT 结构域把丙二酰基转到 ACP）",
    ],
    bubble: { what: "三碳二羧酸单酰-CoA，增碳单元", highlight: "每轮整体进链，净增 2 碳" },
    asset3d: "fas-malonyl",
  },

  fbp: {
    id: "fbp",
    name: "果糖-1,6-二磷酸",
    aliases: ["FBP", "fructose-1,6-bisphosphate", "F1,6BP"],
    claim: "果糖-1,6-二磷酸是六碳糖的裂解点",
    classification: "糖磷酸酯：F6P 的 C1 再磷酸化产物。",
    structure: "六碳酮糖，C1 与 C6 各带磷酸；C3–C4 键是醛缩酶裂解位点。",
    position: {
      title: "它是 gk-3 产物、gk-4 底物，也是 gn-8 产物",
      body:
        "gk-3 由 PFK-1 把 F6P 磷酸化成 FBP；gk-4 由醛缩酶把它裂成 GAP + DHAP。糖异生 gn-8 由醛缩酶逆向缩合生成 FBP，gn-9 再由 FBPase-1 水解。",
    },
    flow: {
      title: "它由 PFK-1 造，醛缩酶一拆二",
      body:
        "来路：F6P 经 PFK-1 磷酸化，消耗 ATP。去向：经醛缩酶裂成 GAP + DHAP；糖异生时由醛缩酶逆向缩合，再被 FBPase-1 水解。",
    },
    significance: {
      title: "它是糖酵解与糖异生的分水岭",
      body:
        "正向由 PFK-1 造、FBPase-1 拆；两个酶受 F2,6BP 反向调控，FBP 的流向决定器官是烧糖还是造糖。",
    },
    exam: {
      title: "考点是磷酸位置与两个对立酶",
      items: [
        "FBP 的磷酸在 C1 与 C6，不是 C2。",
        "醛缩酶裂解产物是 GAP + DHAP。",
        "FBPase-1 是糖异生四个关键酶之一（PC、PEPCK、FBPase-1、G6Pase），受 F2,6BP 抑制。",
      ],
    },
    pathways: [
      { label: "糖酵解 gk-3 产物：PFK-1", href: "/pathway/glycolysis?step=gk-3" },
      { label: "gk-4 底物：醛缩酶", href: "/pathway/glycolysis?step=gk-4" },
      { label: "糖异生 gn-8 产物", href: "/pathway/gluconeogenesis?step=gn-8" },
    ],
    sources: [
      "glycolysis.json · steps[gk-3].equation / steps[gk-4].equation",
      "gluconeogenesis.json · steps[gn-8].equation / significance",
      "Lehninger Principles of Biochemistry, 8e, Ch.14",
    ],
    bubble: { what: "六碳糖二磷酸，裂解点", highlight: "醛缩酶一拆二，糖异生再合上" },
    asset3d: "fbp",
  },

  fpp: {
    id: "fpp",
    name: "法尼基二磷酸",
    aliases: ["FPP", "farnesyl pyrophosphate", "法尼基焦磷酸"],
    claim: "法尼基二磷酸是 C15 的分支点",
    classification: "异戊二烯焦磷酸：三个异戊二烯单元组成的 C15 焦磷酸。",
    structure: "C15 焦磷酸，疏水尾加焦磷酸头；两个 FPP 头对头缩合就是角鲨烯。",
    position: {
      title: "它是 ch-9 产物、ch-10 底物，也是多种异戊二烯产物的前体",
      body:
        "ch-9 由法尼基二磷酸合酶把 GPP 与 IPP 缩合成 FPP；ch-10 由角鲨烯合酶把两分子 FPP 缩合成角鲨烯。FPP 还供蛋白异戊二烯化、多萜醇、血红素 A 与 CoQ。",
    },
    flow: {
      title: "它从 GPP 与 IPP 来，两分子缩合成角鲨烯",
      body:
        "来路：GPP + IPP 经 FDPS 缩合。去向：两分子 FPP 经角鲨烯合酶缩合成角鲨烯；或供蛋白异戊二烯化与辅酶 Q 合成。",
    },
    significance: {
      title: "甾醇与非甾醇异戊二烯在这里分道",
      body:
        "FPP 是甾醇与非甾醇异戊二烯通路的岔口；他汀阻断上游会让 FPP 及其下游全部减少。",
    },
    exam: {
      title: "考点是碳数与角鲨烯的用量",
      items: [
        "FPP 是 C15，由 3 个异戊二烯单元组成。",
        "角鲨烯由 2 个 FPP 缩合，不是 1 个。",
        "FPP 还供蛋白异戊二烯化，不专属于胆固醇。",
      ],
    },
    pathways: [
      { label: "胆固醇合成 ch-9 产物", href: "/pathway/cholesterol?step=ch-9" },
      { label: "ch-10 底物：角鲨烯合酶", href: "/pathway/cholesterol?step=ch-10" },
    ],
    sources: [
      "cholesterol.json · steps[ch-9].equation / steps[ch-10].equation",
      "cholesterol.json · entities[fpp].note",
      "Lehninger Principles of Biochemistry, 8e, Ch.21",
    ],
    bubble: { what: "C15 异戊二烯焦磷酸，分支点", highlight: "两分子缩合成角鲨烯" },
  },

  fum: {
    id: "fum",
    name: "延胡索酸",
    aliases: ["fumarate", "富马酸"],
    claim: "延胡索酸是 TCA 与尿素循环之间的碳桥",
    classification: "四碳二羧酸，C2–C3 反式双键。",
    structure: "反式丁烯二酸，两个羧基分处双键两端；反式构型是延胡索酸酶专一水合的前提。",
    position: {
      title: "它是 tca-6 产物、tca-7 底物，也是 urea-4 产物",
      body:
        "tca-6 由琥珀酸脱氢酶把琥珀酸脱氢成延胡索酸；tca-7 由延胡索酸酶加水成 L-苹果酸；urea-4 由精氨酸琥珀酸裂解酶把精氨酸琥珀酸裂成精氨酸与延胡索酸。",
    },
    flow: {
      title: "它从琥珀酸与精氨酸琥珀酸来，水合后进 TCA",
      body:
        "来路：琥珀酸经 SDH 脱氢；精氨酸琥珀酸经 ASL 裂解也生成。去向：经延胡索酸酶水合成苹果酸进 TCA；其碳骨架可转成天冬氨酸回尿素循环。",
    },
    significance: {
      title: "它是尿素循环与 TCA 的接口",
      body:
        "ASL 释放的延胡索酸进 TCA，苹果酸到草酰乙酸再到天冬氨酸回流，尿素循环才不必净耗天冬氨酸。",
    },
    exam: {
      title: "考点是反式构型与复合体 II",
      items: [
        "延胡索酸是反式，苹果酸是 L 型；延胡索酸酶专一。",
        "SDH 是 TCA 唯一嵌膜酶，也就是呼吸链复合体 II。",
        "尿素循环的延胡索酸不是废物，是碳骨架回流。",
      ],
    },
    pathways: [
      { label: "TCA tca-6 产物：琥珀酸脱氢酶", href: "/pathway/tca?step=tca-6" },
      { label: "tca-7 底物：延胡索酸酶", href: "/pathway/tca?step=tca-7" },
      { label: "尿素循环 urea-4 产物", href: "/pathway/urea-cycle?step=urea-4" },
    ],
    sources: [
      "tca.json · steps[tca-6].equation / significance",
      "tca.json · steps[tca-7].equation",
      "urea.json · steps[urea-4].significance",
      "Lehninger Principles of Biochemistry, 8e, Ch.16 / Ch.18",
    ],
    bubble: { what: "四碳二羧酸，TCA 与尿素的碳桥", highlight: "水合成苹果酸，回补天冬氨酸" },
    asset3d: "fum",
  },

  g1p: {
    id: "g1p",
    name: "葡萄糖-1-磷酸",
    aliases: ["G1P", "glucose-1-phosphate"],
    claim: "葡萄糖-1-磷酸是糖原与血糖之间的转换插头",
    classification: "糖磷酸酯：葡萄糖 C1 位磷酸酯。",
    structure: "葡萄糖的 C1 羟基被磷酸化；C1 磷酸酯是糖原合成与分解的活化形式。",
    position: {
      title: "它是 gly-1 产物、gly-3 底物，也是 gly-6 产物",
      body:
        "gly-1 由糖原磷酸化酶用 Pi 切下 G1P；gly-3 由磷酸葡萄糖变位酶把 G1P 转成 G6P。gly-6 在糖原合成方向把 G6P 转回 G1P，再经 UDP-葡萄糖焦磷酸化酶装成 UDP-葡萄糖。",
    },
    flow: {
      title: "它从糖原来，变 G6P 后进糖酵解或糖异生",
      body:
        "来路：糖原经磷酸化酶与 Pi 生成 G1P。去向：经磷酸葡萄糖变位酶转成 G6P，进入糖酵解或糖异生。",
    },
    significance: {
      title: "糖原分解只能先得到 G1P",
      body:
        "G1P 是糖原分解的直接产物；它不能直接出细胞，必须先变 G6P，再由肝 G6PC1 水解成葡萄糖。",
    },
    exam: {
      title: "考点是 Pi 与变位酶",
      items: [
        "糖原磷酸化酶用 Pi，不消耗 ATP。",
        "G1P 与 G6P 由磷酸葡萄糖变位酶互变。",
        "肌糖原分解停在 G6P，不能补血糖。",
      ],
    },
    pathways: [
      { label: "糖原代谢 gly-1 产物", href: "/pathway/glycogen?step=gly-1" },
      { label: "gly-3 底物：磷酸葡萄糖变位酶", href: "/pathway/glycogen?step=gly-3" },
      { label: "gly-6 产物", href: "/pathway/glycogen?step=gly-6" },
    ],
    sources: [
      "glycogen.json · steps[gly-1].equation",
      "glycogen.json · steps[gly-3].equation / steps[gly-6].equation",
      "Lehninger Principles of Biochemistry, 8e, Ch.15",
    ],
    bubble: { what: "糖磷酸酯，糖原与血糖的插头", highlight: "磷酸化酶用 Pi 直接产出" },
  },

  gap: {
    id: "gap",
    name: "甘油醛-3-磷酸",
    aliases: ["GAP", "G3P", "甘油醛-3-磷酸"],
    claim: "GAP 是糖酵解与磷酸戊糖途径共用的三碳出口",
    classification: "三碳糖磷酸酯：甘油醛的羟基被磷酸化，生成醛糖磷酸酯。",
    structure: "三碳醛糖磷酸酯，C1 是醛基；这个醛基正是糖酵解里被氧化掉的位点。",
    position: {
      title: "它站在糖酵解第 6 步，也在戊糖磷酸途径的碳重排里",
      body:
        "糖酵解第 4 步醛缩酶把 FBP 裂成 GAP 与 DHAP，第 5 步磷酸丙糖异构酶把 DHAP 全部转成 GAP，第 6 步甘油醛-3-磷酸脱氢酶（GAPDH）以 GAP 为底物。磷酸戊糖途径里，转酮醇酶（ppp-n3、ppp-n5）生成 GAP，转醛醇酶（ppp-n4）以 GAP 为底物。",
    },
    flow: {
      title: "它从 FBP 与戊糖重排来，往 1,3-二磷酸甘油酸去",
      body:
        "来路：FBP 经醛缩酶裂解生成 GAP 与 DHAP，DHAP 再经磷酸丙糖异构酶转成 GAP；磷酸戊糖途径的转酮醇酶反应也生成 GAP。去向：经 GAPDH 氧化并磷酸化成 1,3-二磷酸甘油酸，同时把 NAD⁺ 还原成 NADH；糖异生方向则从 1,3-BPG 回到 GAP，再与 DHAP 缩合成 FBP。",
    },
    significance: {
      title: "GAP 被氧化的一步是糖酵解唯一的脱氢步",
      body:
        "GAPDH 把 GAP 氧化成 1,3-BPG 并生成 NADH，糖酵解的全部 NADH 都从这里来；NADH 必须在乳酸脱氢酶处氧化回 NAD⁺，糖酵解才能继续。砷酸盐冒充 Pi 会绕过 1,3-BPG 的高能磷酸键，使这一步不产 ATP。",
    },
    exam: {
      title: "考点是三碳糖计数、唯一脱氢步与砷酸盐",
      items: [
        "GAP 与 DHAP 是同分异构体，磷酸丙糖异构酶把 DHAP 转成 GAP；在本挂图里 DHAP 只经这一步进糖酵解，它也可流向甘油磷脂合成，不在本通路范围。",
        "一分子 FBP 裂成两分子三碳糖，所以从 GAP 起每一步都按「每葡萄糖 ×2」计。",
        "GAPDH 是糖酵解唯一生成 NADH 的步骤；砷酸盐使该步只生成 1,3-BPG 类似物而不产 ATP。",
      ],
    },
    pathways: [
      { label: "糖酵解 gk-4：醛缩酶裂解产物", href: "/pathway/glycolysis?step=gk-4" },
      { label: "糖酵解 gk-6：GAPDH 底物", href: "/pathway/glycolysis?step=gk-6" },
      { label: "戊糖磷酸途径 ppp-n4：转醛醇酶底物", href: "/pathway/ppp?step=ppp-n4" },
      { label: "糖异生 gn-8：与 DHAP 缩合成 FBP", href: "/pathway/gluconeogenesis?step=gn-8" },
    ],
    sources: [
      "glycolysis.json · steps[gk-4] / steps[gk-5] / steps[gk-6]",
      "ppp.json · steps[ppp-n3] / steps[ppp-n4] / steps[ppp-n5]",
      "gluconeogenesis.json · steps[gn-6] / steps[gn-8]",
      "Lehninger Principles of Biochemistry, 8e, Ch.14",
    ],
    bubble: { what: "三碳醛糖磷酸酯", highlight: "糖与戊糖共用的三碳出口" },
  },

  glc: {
    id: "glc",
    name: "葡萄糖",
    aliases: ["Glc", "glucose", "α-D-吡喃葡萄糖", "血糖"],
    claim: "葡萄糖是血糖的主体，也是糖代谢各通路的公共起点",
    classification: "己醛糖：六碳醛糖，开链式 C1 为醛基，环化后成吡喃糖。",
    structure: "六碳醛糖，水溶液中以 α/β-D-吡喃葡萄糖为主；C6 羟基是己糖激酶磷酸化的位点，C1 异头羟基决定糖苷键的连接方式。",
    position: {
      title: "它进细胞的第一站是己糖激酶，出肝前的最后一站是葡萄糖-6-磷酸酶",
      body:
        "糖酵解第 1 步由己糖激酶（肝为葡萄糖激酶）把葡萄糖磷酸化成 G6P。糖异生第 11 步由肝、肾的葡萄糖-6-磷酸酶在 ER 腔把 G6P 水解回葡萄糖，产物经 GLUT2 出肝入血。糖原分解的脱支酶步骤也直接放出游离葡萄糖。",
    },
    flow: {
      title: "它从肠道吸收、糖异生与糖原来，往 G6P 与血糖去",
      body:
        "来路：肠道吸收的葡萄糖经 GLUT2 进入肝；糖异生末步在 ER 腔水解 G6P 生成葡萄糖；糖原脱支酶处理极限糊精时放出游离葡萄糖。去向：经己糖激酶或葡萄糖激酶磷酸化成 G6P，进入糖酵解、磷酸戊糖途径或糖原合成；肝再把 G6P 水解成葡萄糖输出到血。",
    },
    significance: {
      title: "磷酸化把葡萄糖留在胞内，肝还能把它放回血液",
      body:
        "在多数细胞，葡萄糖进胞后由己糖激酶磷酸化成 G6P，带上负电不易漏出。肝的葡萄糖激酶 Km 高，低血糖时磷酸化少，GLUT2 又可双向转运，所以肝能把葡萄糖放回血液；肌肉没有葡萄糖-6-磷酸酶，肌糖原分解只能停在 G6P，就地进糖酵解。",
    },
    exam: {
      title: "考点是两步不可逆、两种激酶与肌糖原",
      items: [
        "葡萄糖磷酸化不可逆：肝用葡萄糖激酶（Km 高，餐后才大量工作），多数组织用己糖激酶。",
        "只有肝、肾、肠有葡萄糖-6-磷酸酶；肌肉没有，所以肌糖原不能直接补血糖。",
        "葡萄糖不是糖酵解的产物；糖异生的终产物才是游离葡萄糖。",
      ],
    },
    pathways: [
      { label: "糖酵解 gk-1：己糖激酶底物", href: "/pathway/glycolysis?step=gk-1" },
      { label: "糖异生 gn-11：葡萄糖-6-磷酸酶产物", href: "/pathway/gluconeogenesis?step=gn-11" },
      { label: "糖原分解 gly-2：脱支酶放出游离葡萄糖", href: "/pathway/glycogen?step=gly-2" },
      { label: "糖原分解 gly-4：肝 G6Pase 产葡萄糖", href: "/pathway/glycogen?step=gly-4" },
    ],
    sources: [
      "glycolysis.json · steps[gk-1].significance / organDiffs",
      "gluconeogenesis.json · steps[gn-11].significance / enzyme",
      "glycogen.json · steps[gly-2].equation / steps[gly-4].equation",
      "Lehninger Principles of Biochemistry, 8e, Ch.14",
    ],
    bubble: { what: "六碳醛糖，血糖的主体", highlight: "进胞后多被磷酸化留住" },
  },

  gln: {
    id: "gln",
    name: "L-谷氨酰胺",
    aliases: ["Gln", "glutamine", "谷氨酰胺"],
    claim: "谷氨酰胺是氨的无毒运输形式，也是肾排铵的底物",
    classification: "α-氨基酸：侧链带酰胺基，属于极性不带电氨基酸。",
    structure: "侧链酰胺基把氨以酰胺形式带着走，不会像游离 NH₄⁺ 那样直接升高血氨。",
    position: {
      title: "它在氨基酸代谢 aa-4 被肾型谷氨酰胺酶水解，位置在线粒体",
      body:
        "挂图上的 aa-4 由谷氨酰胺酶（肾型）催化，在线粒体内把 L-谷氨酰胺 + H₂O 水解成 L-谷氨酸 + NH₄⁺。这一步是谷氨酰胺脱酰胺的入口，也是肾小管把 NH₄⁺ 排进尿的来源。",
    },
    flow: {
      title: "它从外周组织释放入血来，往谷氨酸与铵去",
      body:
        "来路：外周组织（尤其肌肉）把氨装成谷氨酰胺释放入血，肾与肠摄取。去向：经谷氨酰胺酶水解成谷氨酸 + NH₄⁺；谷氨酸再经谷氨酸脱氢酶（aa-3）脱氨成 α-酮戊二酸 + NH₄⁺，碳骨架进入 TCA。",
    },
    significance: {
      title: "它把氨从外周运到肾，再由肾排进尿",
      body:
        "谷氨酰胺把外周产生的氨安全运到肾；肾型谷氨酰胺酶与谷氨酸脱氢酶接力把 NH₄⁺ 释放出来排进尿，避免氨在血中累积。应激时谷氨酰胺消耗上升，属于条件必需氨基酸。",
    },
    exam: {
      title: "考点是水解产物与氨的运输",
      items: [
        "谷氨酰胺酶水解产生 NH₄⁺，不是尿素；尿素由肝的尿素循环生成。",
        "谷氨酰胺是氨的无毒运输形式，应激时需求上升，属条件必需氨基酸。",
        "肾型谷氨酰胺酶在线粒体，产物谷氨酸可继续脱氨，也可进入 TCA。",
      ],
    },
    pathways: [
      { label: "氨基酸代谢 aa-4：谷氨酰胺酶水解", href: "/pathway/amino-acids?step=aa-4" },
      { label: "氨基酸代谢 aa-3：谷氨酸脱氢酶", href: "/pathway/amino-acids?step=aa-3" },
    ],
    sources: [
      "amino.json · steps[aa-4].equation / enzyme / compartment",
      "amino.json · steps[aa-3].equation",
      "Lehninger Principles of Biochemistry, 8e, Ch.18",
    ],
    bubble: { what: "带酰胺侧链的氨基酸", highlight: "氨的无毒运输形式" },
  },

  glu: {
    id: "glu",
    name: "谷氨酸",
    aliases: ["Glu", "glutamate", "L-谷氨酸"],
    claim: "谷氨酸是转氨反应的中央载体，也是氨的集散点",
    classification: "酸性 α-氨基酸：侧链带羧基，属于极性带电氨基酸。",
    structure: "侧链多一个羧基，生理 pH 下带负电；α-氨基是转氨酶搬运氨基的落点。",
    position: {
      title: "它夹在转氨与脱氨之间：aa-1、aa-2 的产物，aa-3 的底物",
      body:
        "aa-1（丙氨酸氨基转移酶）与 aa-2（天冬氨酸氨基转移酶）都把 α-酮戊二酸转成谷氨酸；aa-3 由谷氨酸脱氢酶把谷氨酸氧化脱氨成 α-酮戊二酸 + NH₄⁺；aa-4 谷氨酰胺酶水解也生成谷氨酸。",
    },
    flow: {
      title: "它从丙氨酸、天冬氨酸与谷氨酰胺的氨基来，往 α-酮戊二酸与铵去",
      body:
        "来路：丙氨酸、天冬氨酸经转氨酶把氨基交给 α-酮戊二酸生成谷氨酸；谷氨酰胺经谷氨酰胺酶水解也生成谷氨酸。去向：经谷氨酸脱氢酶脱氨成 α-酮戊二酸 + NH₄⁺；也可经转氨酶把氨基交给其他 α-酮酸；碳骨架以 α-酮戊二酸进入 TCA。",
    },
    significance: {
      title: "转氨酶测的就是谷氨酸与 α-酮戊二酸这对底物",
      body:
        "血清 ALT、AST 升高说明肝细胞或心肌细胞损伤，胞内的转氨反应漏进血浆；这两个酶催化的正是把氨基交给 α-酮戊二酸、生成谷氨酸的反应。谷氨酸脱氢酶则把谷氨酸的氨基直接释放成游离 NH₄⁺。",
    },
    exam: {
      title: "考点是 PLP、脱氢酶与 α-酮戊二酸",
      items: [
        "转氨酶的辅酶是磷酸吡哆醛（维生素 B6），氨基先交给 PLP 再交给 α-酮戊二酸。",
        "谷氨酸脱氢酶能用 NAD(P)⁺ 直接脱氨，产物是游离 NH₄⁺；转氨酶不产生游离氨。",
        "α-酮戊二酸是 TCA 中间物，谷氨酸与它通过转氨、脱氨互变，是氨基酸碳骨架进 TCA 的主要入口。",
      ],
    },
    pathways: [
      { label: "氨基酸代谢 aa-1：ALT 产物", href: "/pathway/amino-acids?step=aa-1" },
      { label: "氨基酸代谢 aa-2：AST 产物", href: "/pathway/amino-acids?step=aa-2" },
      { label: "氨基酸代谢 aa-3：谷氨酸脱氢酶底物", href: "/pathway/amino-acids?step=aa-3" },
      { label: "氨基酸代谢 aa-4：谷氨酰胺酶产物", href: "/pathway/amino-acids?step=aa-4" },
      { label: "TCA tca-3：α-酮戊二酸生成", href: "/pathway/tca?step=tca-3" },
    ],
    sources: [
      "amino.json · steps[aa-1] / steps[aa-2] / steps[aa-5]",
      "amino.json · steps[aa-3].equation / compartment",
      "amino.json · steps[aa-4].equation",
      "tca.json · steps[tca-3].equation",
      "Lehninger Principles of Biochemistry, 8e, Ch.18",
    ],
    bubble: { what: "酸性氨基酸，转氨的中央载体", highlight: "把氨基收进 α-酮戊二酸" },
  },

  gly: {
    id: "gly",
    name: "甘氨酸",
    aliases: ["Gly", "glycine", "氨基乙酸"],
    claim: "甘氨酸是最小的氨基酸，却是谷胱甘肽、血红素与嘌呤的共同原料",
    classification: "非极性 α-氨基酸：侧链只有一个氢，是唯一没有手性碳的氨基酸。",
    structure: "侧链仅一个氢，α-碳上两个氢相同，因此不具手性；分子小，能进入多条合成途径。",
    position: {
      title: "挂图上它只作为氨基酸实体出现，没有挂到独立步骤",
      body:
        "本平台氨基酸代谢数据层的 7 个步骤里没有以甘氨酸为底物或产物的反应，它只出现在实体表中。它的代谢位置按教材章级内容定位：丝氨酸羟甲基转移酶（SHMT）把丝氨酸转成甘氨酸，同时把一碳单位交给四氢叶酸（这是 SHMT 的常规方向）；甘氨酸也是谷胱甘肽、血红素与嘌呤核苷酸合成的原料。",
    },
    flow: {
      title: "它从丝氨酸的一碳转移来，往谷胱甘肽、血红素与嘌呤去",
      body:
        "来路：SHMT 催化丝氨酸 → 甘氨酸，同时把一碳单位交给四氢叶酸。去向：① 与谷氨酸、半胱氨酸缩合成谷胱甘肽（Glu-Cys-Gly）；② 与琥珀酰-CoA 缩合启动血红素合成；③ 提供嘌呤环的 C4、C5、N7；④ 作为结合胆酸的残基参与胆汁酸结合。",
    },
    significance: {
      title: "它小到能直接参与多类合成，供给牵动抗氧化与血红素",
      body:
        "甘氨酸是谷胱甘肽的 C 端残基，谷胱甘肽是细胞内主要的含巯基抗氧化剂；它也是血红素与嘌呤环的碳氮来源之一。甘氨酸供给不足时，这些合成途径会先受影响。",
    },
    exam: {
      title: "考点是无手性、SHMT 方向与谷胱甘肽结构",
      items: [
        "甘氨酸是唯一没有手性碳的氨基酸，侧链为 H。",
        "SHMT 的常规方向是丝氨酸→甘氨酸并交出一碳单位给四氢叶酸，不是甘氨酸→丝氨酸。",
        "谷胱甘肽是 Glu-Cys-Gly 三肽，甘氨酸位于 C 端。",
      ],
    },
    pathways: [
      { label: "氨基酸代谢实体表中的甘氨酸", href: "/pathway/amino-acids" },
    ],
    sources: [
      "amino.json · entities[gly]（无独立反应步骤）",
      "Lehninger Principles of Biochemistry, 8e, Ch.18（氨基酸分解与一碳单位）",
      "Lehninger Principles of Biochemistry, 8e, Ch.22（谷胱甘肽、血红素与核苷酸合成）",
    ],
    bubble: { what: "最小的氨基酸，无手性碳", highlight: "谷胱甘肽与嘌呤的原料" },
  },

  glycogen: {
    id: "glycogen",
    name: "糖原",
    aliases: ["glycogen", "糖原颗粒"],
    claim: "糖原是糖的储存形式，肝糖原补血糖，肌糖原只供自身",
    classification: "α-1,4 葡萄糖多聚物，链上带 α-1,6 分支，没有单一分子量。",
    structure: "以 α-1,4 糖苷键连成直链、α-1,6 形成分支；分支多、末端多，磷酸化酶可同时从多个非还原端切。",
    position: {
      title: "它在糖原代谢的分解端与合成端都出场",
      body:
        "分解端：gly-1 糖原磷酸化酶以糖原 + Pi 为底物生成 G1P；gly-2 脱支酶处理极限糊精，产物回到糖原与游离葡萄糖。合成端：gly-8 糖原合酶把 UDP-葡萄糖加到糖原引物上，gly-9 糖原分支酶在糖原上造 α-1,6 分支。",
    },
    flow: {
      title: "它从 UDP-葡萄糖来，往 G1P 与游离葡萄糖去",
      body:
        "来路：UDP-葡萄糖经糖原合酶加到糖原非还原端，分支酶再造出 α-1,6 分支。去向：糖原磷酸化酶用 Pi 切下 G1P（不耗 ATP）；脱支酶把极限糊精的分支点水解成游离葡萄糖；G1P 再经磷酸葡萄糖变位酶转成 G6P。",
    },
    significance: {
      title: "它是唯一能快速动员的糖储备",
      body:
        "肝糖原分解出的 G6P 经葡萄糖-6-磷酸酶水解成葡萄糖输出到血，维持空腹血糖；肌糖原缺少这个酶，分解产物只能就地进糖酵解供自身收缩使用。",
    },
    exam: {
      title: "考点是 Pi、脱支酶与肌糖原",
      items: [
        "糖原磷酸化酶用 Pi，不消耗 ATP；产物是 G1P，不是游离葡萄糖。",
        "脱支酶是糖原分解里唯一能放出游离葡萄糖的酶；肝的游离葡萄糖可经 GLUT2 出细胞，肌内则需己糖激酶再磷酸化，不补血糖。",
        "糖原合酶只延长 α-1,4 链，α-1,6 分支由分支酶另造。",
        "肌糖原不能补血糖，因为肌肉没有葡萄糖-6-磷酸酶。",
      ],
    },
    pathways: [
      { label: "糖原分解 gly-1：磷酸化酶底物", href: "/pathway/glycogen?step=gly-1" },
      { label: "糖原分解 gly-2：脱支酶产物", href: "/pathway/glycogen?step=gly-2" },
      { label: "糖原合成 gly-8：糖原合酶底物", href: "/pathway/glycogen?step=gly-8" },
      { label: "糖原分支 gly-9：分支酶", href: "/pathway/glycogen?step=gly-9" },
    ],
    sources: [
      "glycogen.json · steps[gly-1].equation / significance",
      "glycogen.json · steps[gly-2].equation",
      "glycogen.json · steps[gly-8].equation / steps[gly-9].equation",
      "Lehninger Principles of Biochemistry, 8e, Ch.15",
    ],
    bubble: { what: "葡萄糖的 α-1,4 多聚物", highlight: "肝补血糖、肌只自用" },
  },

  "glycogen-limit": {
    id: "glycogen-limit",
    name: "极限糊精",
    aliases: ["limit dextrin", "极限糊精"],
    claim: "极限糊精是磷酸化酶停下后留下的分支残片，只能由脱支酶接手",
    classification: "分支糖原的残留片段：磷酸化酶切到距 α-1,6 分支点约 4 个残基处停下后剩下的结构。",
    structure: "保留 α-1,6 分支点及其附近的短枝；这些分支点不能被磷酸化酶切开。",
    position: {
      title: "它只出现在糖原分解的 gly-2，是脱支酶的唯一底物",
      body:
        "gly-2 由脱支酶催化，把极限糊精转成线性糖原 + 游离葡萄糖。它是 gly-1 糖原磷酸化酶反复切到分支附近后必然产生的中间物。",
    },
    flow: {
      title: "它从糖原被切到分支点来，往线性糖原与游离葡萄糖去",
      body:
        "来路：糖原磷酸化酶从非还原端切下 G1P，切到距 α-1,6 分支点约 4 个残基处停下，留下极限糊精。去向：脱支酶把短枝转移走并水解 α-1,6 键，产物是线性糖原与游离葡萄糖；线性部分继续被磷酸化酶切。",
    },
    significance: {
      title: "没有脱支酶，糖原分解会卡在分支点",
      body:
        "糖原的分支结构让磷酸化酶能从多个末端同时切，但切到分支点就必须换酶。脱支酶处理后才能把分支点变成可继续利用的直链，同时放出糖原分解里唯一的游离葡萄糖。",
    },
    exam: {
      title: "考点是残留物身份与两种酶的分工",
      items: [
        "极限糊精是磷酸化酶切到分支点后留下的残片，不是另一种糖原。",
        "脱支酶负责转移短枝并水解 α-1,6 键，产物含游离葡萄糖。",
        "糖原磷酸化酶只能切 α-1,4 键，切不开 α-1,6 分支点。",
      ],
    },
    pathways: [
      { label: "糖原分解 gly-2：脱支酶底物", href: "/pathway/glycogen?step=gly-2" },
      { label: "糖原分解 gly-1：磷酸化酶留下残片", href: "/pathway/glycogen?step=gly-1" },
    ],
    sources: [
      "glycogen.json · steps[gly-2].equation / 实体 note",
      "glycogen.json · steps[gly-1].equation",
      "Lehninger Principles of Biochemistry, 8e, Ch.15",
    ],
    bubble: { what: "带分支的糖原残片", highlight: "脱支酶的唯一底物" },
  },

  gpp: {
    id: "gpp",
    name: "牻牛儿基二磷酸",
    aliases: ["GPP", "geranyl pyrophosphate", "牻牛儿基焦磷酸"],
    claim: "GPP 是 C10 的异戊二烯中间体，FPP 的前一步",
    classification: "异戊二烯二磷酸酯：两个 C5 单位缩合而成的 C10 焦磷酸酯。",
    structure: "C10 焦磷酸酯，末端焦磷酸在缩合反应中被替换并离去。",
    position: {
      title: "它在胆固醇合成 ch-8 生成、ch-9 被延长，两步同由法尼基二磷酸合酶催化",
      body:
        "ch-8：IPP + DMAPP → GPP + PPi；ch-9：GPP + IPP → FPP + PPi。两步都由法尼基二磷酸合酶（FDPS）催化，位置在胞质。",
    },
    flow: {
      title: "它从 IPP 与 DMAPP 缩合来，往 FPP 去",
      body:
        "来路：DMAPP 作为烯丙基供体与 IPP 缩合，放出 PPi 生成 GPP。去向：GPP 再接受一个 IPP，生成 C15 的 FPP；FPP 随后进入角鲨烯与甾醇合成，也可转向蛋白异戊二烯化等分支。",
    },
    significance: {
      title: "GPP 是甲羟戊酸途径延长链上的第一个缩合产物",
      body:
        "甲羟戊酸经脱羧得到 IPP，IPP 异构化成 DMAPP 后才能作为烯丙基供体；GPP 就是这一步缩合的产物，再延长一次就成为 FPP，甾醇合成必须经过这一段。",
    },
    exam: {
      title: "考点是碳数递增与同一个酶",
      items: [
        "GPP 是 C10，FPP 是 C15；每加一个 IPP 增 5 个碳。",
        "ch-8 与 ch-9 是同一个酶 FDPS 的连续两次缩合，不是两个不同的酶。",
        "缩合放出 PPi，推动反应向生成 GPP、FPP 的方向进行。",
      ],
    },
    pathways: [
      { label: "胆固醇合成 ch-8：GPP 生成", href: "/pathway/cholesterol?step=ch-8" },
      { label: "胆固醇合成 ch-9：GPP 延长成 FPP", href: "/pathway/cholesterol?step=ch-9" },
    ],
    sources: [
      "cholesterol.json · steps[ch-8].equation / enzyme",
      "cholesterol.json · steps[ch-9].equation / enzyme",
      "Lehninger Principles of Biochemistry, 8e, Ch.21",
    ],
    bubble: { what: "C10 异戊二烯二磷酸", highlight: "FPP 的前一步" },
  },

  h2o: {
    id: "h2o",
    name: "水",
    aliases: ["H₂O", "water", "水分子"],
    claim: "水既参与水解与水合，也在脱水与缩合中作为产物出现",
    classification: "无机小分子：既是溶剂，也是水解、水合、脱水与缩合反应的直接参与者。",
    structure: "极性小分子，两个 O–H 键；作为反应物时提供羟基或质子，作为溶剂时参与氢键网络。",
    position: {
      title: "它散在多个通路的底物或产物栏里，不集中在单一节点",
      body:
        "数据层中它出现在糖原代谢 gly-4（G6P + H₂O → 葡萄糖 + Pi）、氨基酸代谢 aa-4（谷氨酰胺水解）与 aa-6、aa-7（羟化与胱硫醚合成放出水）、脂肪酸 β-氧化 fao-2（烯酰-CoA 水合）、尿素循环 urea-5（精氨酸酶水解），以及脂肪酸合成 fas-shuttle、fas-dh、fas-te。",
    },
    flow: {
      title: "它从脱水与缩合反应来，又作为反应物进入水解与水合步",
      body:
        "来路：脱水、缩合与羟化反应放出水，如 fas-dh 脱水、aa-6 苯丙氨酸羟化、aa-7 胱硫醚合成。去向：作为反应物进入水解反应（gly-4、aa-4、urea-5、fas-te）与水合反应（fao-2）。",
    },
    significance: {
      title: "水在这些步骤里不是旁观者",
      body:
        "水解反应靠水把键拆开，水合反应靠水把双键变成羟基；把水省略掉，方程就配不平。糖原磷酸化酶用 Pi 而不是水，所以产物是 G1P；只有脱支酶与葡萄糖-6-磷酸酶的水解才放出游离葡萄糖。",
    },
    exam: {
      title: "考点是水解与水合的方向、以及 Pi 与水的区别",
      items: [
        "糖原磷酸化酶用 Pi，产物是 G1P；脱支酶与葡萄糖-6-磷酸酶用水解，才放出游离葡萄糖。",
        "延胡索酸酶（tca-7）与烯酰-CoA 水合酶（fao-2）都是加水反应，方向与脱水相反。",
        "精氨酸酶（urea-5）水解精氨酸，放出尿素与鸟氨酸，水是反应物。",
      ],
    },
    pathways: [
      { label: "糖原分解 gly-4：G6P 水解", href: "/pathway/glycogen?step=gly-4" },
      { label: "氨基酸代谢 aa-4：谷氨酰胺水解", href: "/pathway/amino-acids?step=aa-4" },
      { label: "β-氧化 fao-2：烯酰-CoA 水合", href: "/pathway/fatty-acid-oxidation?step=fao-2" },
      { label: "尿素循环 urea-5：精氨酸酶水解", href: "/pathway/urea-cycle?step=urea-5" },
      { label: "TCA tca-7：延胡索酸酶加水", href: "/pathway/tca?step=tca-7" },
      { label: "脂肪酸合成 fas-te：硫酯酶水解", href: "/pathway/fatty-acid-synthesis?step=fas-te" },
    ],
    sources: [
      "glycogen.json · steps[gly-4].equation",
      "amino.json · steps[aa-4] / steps[aa-6] / steps[aa-7]",
      "fao.json · steps[fao-2].equation",
      "urea.json · steps[urea-5].equation",
      "fas.json · steps[fas-shuttle] / steps[fas-dh] / steps[fas-te]",
      "Lehninger Principles of Biochemistry, 8e, Ch.14 / Ch.18",
    ],
    bubble: { what: "无机小分子，反应物与产物", highlight: "水解、水合、脱水都见它" },
  },

  hco3: {
    id: "hco3",
    name: "碳酸氢盐",
    aliases: ["HCO₃⁻", "bicarbonate", "碳酸氢根"],
    claim: "HCO₃⁻ 是羧化反应的碳源，也是尿素循环与糖异生共用的一个碳",
    classification: "无机阴离子：碳酸的共轭碱，在代谢中作为可溶的 CO₂ 供体。",
    structure: "一碳无机阴离子；生物素把它的碳临时装到羧化底物上，缩合时再以 CO₂ 释放。",
    position: {
      title: "它在三条通路里都作为底物：糖异生 gn-1、脂肪酸合成 fas-acc、尿素循环 urea-1",
      body:
        "gn-1 丙酮酸羧化酶在线粒体基质用 HCO₃⁻ 把丙酮酸羧化成草酰乙酸；fas-acc 乙酰-CoA 羧化酶在胞质把 HCO₃⁻ 装到乙酰-CoA 生成丙二酰-CoA；urea-1 氨甲酰磷酸合成酶 I 在线粒体基质用 NH₃ + HCO₃⁻ + 2 ATP 生成氨甲酰磷酸。",
    },
    flow: {
      title: "它从 CO₂ 溶解来，往草酰乙酸、丙二酰-CoA 与氨甲酰磷酸去",
      body:
        "来路：CO₂ 溶于水形成 HCO₃⁻。去向：① 丙酮酸羧化酶把它装到丙酮酸，生成草酰乙酸（gn-1）；② ACC 把它装到乙酰-CoA（fas-acc），缩合时再以 CO₂ 放掉；③ CPS1 用它和 NH₃ 装成尿素循环的羰基碳（urea-1）。",
    },
    significance: {
      title: "同一个 HCO₃⁻ 在三条通路里扮演不同角色",
      body:
        "在糖异生里它是羧化反应的碳源，把丙酮酸重新装回四碳酸；在尿素循环里它提供尿素的羰基碳；在脂肪酸合成里它只是丙二酰基的临时载体，缩合时就被放掉。",
    },
    exam: {
      title: "考点是生物素、临时碳与 CPS1 的激活剂",
      items: [
        "丙酮酸羧化酶需要生物素，乙酰-CoA 是变构激活剂而不是底物。",
        "ACC 装上的 HCO₃⁻ 碳在缩合时以 CO₂ 放掉，不进入碳链。",
        "CPS1 用 NH₃ + HCO₃⁻ + 2 ATP，产物是氨甲酰磷酸；N-乙酰谷氨酸是必需激活剂。",
      ],
    },
    pathways: [
      { label: "糖异生 gn-1：丙酮酸羧化酶底物", href: "/pathway/gluconeogenesis?step=gn-1" },
      { label: "脂肪酸合成 fas-acc：ACC 底物", href: "/pathway/fatty-acid-synthesis?step=fas-acc" },
      { label: "尿素循环 urea-1：CPS1 底物", href: "/pathway/urea-cycle?step=urea-1" },
    ],
    sources: [
      "gluconeogenesis.json · steps[gn-1].equation / significance",
      "fas.json · steps[fas-acc].equation / significance",
      "urea.json · steps[urea-1].equation / significance",
      "Lehninger Principles of Biochemistry, 8e, Ch.18 / Ch.21",
    ],
    bubble: { what: "无机阴离子，可溶性碳源", highlight: "羧化与尿素羰基的供体" },
  },

  hcy: {
    id: "hcy",
    name: "L-高半胱氨酸",
    aliases: ["Hcy", "homocysteine", "高半胱氨酸"],
    claim: "高半胱氨酸是甲硫氨酸循环的中间物，也是转硫途径的入口",
    classification: "含硫 α-氨基酸：甲硫氨酸脱甲基后的同型物，不是蛋白质组成氨基酸。",
    structure: "比半胱氨酸多一个亚甲基，末端仍是巯基；巯基让它能进入转硫反应。",
    position: {
      title: "它在氨基酸代谢 aa-7 被胱硫醚 β-合酶接受，与丝氨酸缩合",
      body:
        "aa-7 由胱硫醚 β-合酶催化，在胞质把 L-高半胱氨酸 + L-丝氨酸转成 L-胱硫醚 + H₂O。这一步是高半胱氨酸转入转硫途径的入口，后续走向半胱氨酸。",
    },
    flow: {
      title: "它从甲硫氨酸脱甲基来，往胱硫醚与半胱氨酸去",
      body:
        "来路：甲硫氨酸经 S-腺苷甲硫氨酸（SAM）供甲基后变成 S-腺苷同型半胱氨酸，再水解成高半胱氨酸。去向：① 经胱硫醚 β-合酶与丝氨酸缩合成胱硫醚（aa-7），再裂解成半胱氨酸；② 经甲硫氨酸合酶再甲基化回甲硫氨酸，需要维生素 B12 与叶酸。",
    },
    significance: {
      title: "它的两条去路分别依赖 B6 与 B12/叶酸",
      body:
        "转硫方向由胱硫醚 β-合酶承担，需要磷酸吡哆醛（维生素 B6）；再甲基化方向由甲硫氨酸合酶承担，需要 B12 与叶酸。血中高半胱氨酸升高与血管损伤相关，两个方向受阻都会让它堆积。",
    },
    exam: {
      title: "考点是非蛋白氨基酸与两种辅因子",
      items: [
        "高半胱氨酸不是蛋白质氨基酸，它是甲硫氨酸代谢的中间物。",
        "胱硫醚 β-合酶需要磷酸吡哆醛（维生素 B6），这一步把它接到丝氨酸上。",
        "再甲基化回甲硫氨酸需要 B12 与叶酸，转硫则需要 B6。",
      ],
    },
    pathways: [
      { label: "氨基酸代谢 aa-7：胱硫醚 β-合酶底物", href: "/pathway/amino-acids?step=aa-7" },
    ],
    sources: [
      "amino.json · steps[aa-7].equation / enzyme / compartment",
      "Lehninger Principles of Biochemistry, 8e, Ch.18",
    ],
    bubble: { what: "含硫的非蛋白氨基酸", highlight: "转硫途径的入口" },
  },

  his: {
    id: "his",
    name: "L-组氨酸",
    aliases: ["His", "histidine", "组氨酸"],
    claim: "组氨酸是组胺与肌肽的前体，分解时还要借四氢叶酸",
    classification: "碱性 α-氨基酸：侧链为咪唑环，生理 pH 以中性为主（pKa≈6.0）。",
    structure: "侧链咪唑环，生理 pH 下仅小部分质子化；酸性环境或酶活性中心里可质子化，这个环也是组胺与肌肽的功能基团。",
    position: {
      title: "挂图上它只作为氨基酸实体出现，没有独立步骤",
      body:
        "氨基酸代谢数据层的 7 个步骤里没有以组氨酸为底物或产物的反应，它只在实体表中出现。教材章级定位：组氨酸经脱羧生成组胺；分解代谢的中间产物 FIGLU 进入四氢叶酸一碳单位池，碳骨架最终变成谷氨酸。",
    },
    flow: {
      title: "它从蛋白质分解来，往组胺、肌肽与谷氨酸去",
      body:
        "来路：蛋白质分解释放组氨酸。去向：① 经组氨酸脱羧酶生成组胺；② 分解代谢经尿刊酸、FIGLU 进入一碳单位代谢，最终生成谷氨酸；③ 与 β-丙氨酸结合成肌肽。",
    },
    significance: {
      title: "组胺来自它，分解又依赖叶酸",
      body:
        "组胺是过敏反应与胃酸分泌的介质，由组氨酸脱羧生成；组氨酸分解的 FIGLU 步骤需要四氢叶酸，叶酸缺乏时 FIGLU 排出增加。",
    },
    exam: {
      title: "考点是碱性侧链、脱羧与叶酸",
      items: [
        "组氨酸是碱性氨基酸，侧链咪唑环可质子化。",
        "组氨酸脱羧生成组胺，不是转氨。",
        "组氨酸分解的 FIGLU 步骤需要四氢叶酸；叶酸缺乏时 FIGLU 排泄增加。",
      ],
    },
    pathways: [
      { label: "氨基酸代谢实体表中的组氨酸", href: "/pathway/amino-acids" },
    ],
    sources: [
      "amino.json · entities[his]（无独立反应步骤）",
      "Lehninger Principles of Biochemistry, 8e, Ch.18",
    ],
    bubble: { what: "带咪唑环的碱性氨基酸", highlight: "组胺的前体" },
  },

  hmgcoa: {
    id: "hmgcoa",
    name: "3-羟基-3-甲基戊二酰-CoA",
    aliases: ["HMG-CoA", "HMGCoA", "羟甲基戊二酰-CoA"],
    claim: "HMG-CoA 是胆固醇合成的分水岭，HMG-CoA 还原酶就在这里",
    classification: "HMG-CoA 硫酯：乙酰乙酰-CoA 与乙酰-CoA 缩合后再接一个 CoA 的产物。",
    structure: "C6 的 HMG-CoA 硫酯，C3 是叔醇；这个位点正是 HMGCR 还原的对象。",
    position: {
      title: "它在胆固醇合成 ch-2 生成、ch-3 被还原，两步都在胞质",
      body:
        "ch-2 由 HMG-CoA 合酶 1 把乙酰乙酰-CoA + 乙酰-CoA + H₂O 缩合成 HMG-CoA；ch-3 由 HMG-CoA 还原酶（HMGCR）用 2 NADPH 把 HMG-CoA 还原成甲羟戊酸。",
    },
    flow: {
      title: "它从乙酰乙酰-CoA 与乙酰-CoA 缩合来，往甲羟戊酸去",
      body:
        "来路：两分子乙酰-CoA 先缩合成乙酰乙酰-CoA，再与第三分子乙酰-CoA 缩合生成 HMG-CoA（ch-2）。去向：经 HMGCR 还原成甲羟戊酸（ch-3），这是胆固醇合成第一个不可逆的限速步骤；他汀类抑制 HMGCR。",
    },
    significance: {
      title: "HMGCR 是限速酶，也是他汀的作用位点",
      body:
        "HMG-CoA 还原成甲羟戊酸是胆固醇合成的限速步，他汀类在这一步竞争性抑制 HMGCR。酮体方向在肝线粒体：HMG-CoA 由 HMG-CoA 裂解酶（EC 4.1.3.4）裂解成乙酰乙酸 + 乙酰-CoA；乙酰乙酰-CoA 是它的上游原料，不是裂解产物。",
    },
    exam: {
      title: "考点是限速步、NADPH、他汀与酮体方向",
      items: [
        "HMG-CoA 还原酶是胆固醇合成的限速酶，消耗 2 NADPH。",
        "他汀类抑制 HMGCR，作用位点在 HMG-CoA → 甲羟戊酸这一步。",
        "乙酰-CoA 是 HMG-CoA 的原料；酮体方向由 HMG-CoA 裂解酶裂解成乙酰乙酸 + 乙酰-CoA。",
      ],
    },
    pathways: [
      { label: "胆固醇合成 ch-2：HMG-CoA 合酶产物", href: "/pathway/cholesterol?step=ch-2" },
      { label: "胆固醇合成 ch-3：HMGCR 底物", href: "/pathway/cholesterol?step=ch-3" },
    ],
    sources: [
      "cholesterol.json · steps[ch-2].equation / enzyme",
      "cholesterol.json · steps[ch-3].equation / significance",
      "Lehninger Principles of Biochemistry, 8e, Ch.21 / Ch.17（酮体生成：HMG-CoA 裂解酶 EC 4.1.3.4）",
    ],
    bubble: { what: "C6 的 HMG-CoA 硫酯", highlight: "他汀的作用位点上游" },
  },

  "hydroxy-c16": {
    id: "hydroxy-c16",
    name: "L-3-羟脂酰-CoA",
    aliases: ["L-3-hydroxyacyl-CoA", "3-羟脂酰-CoA"],
    claim: "L-3-羟脂酰-CoA 是 β-氧化第二轮氧化的起点",
    classification: "3-羟基脂酰-CoA：烯酰-CoA 水合后的产物，羟基为 L-构型。",
    structure: "C3 带 L-构型羟基；构型被锁定，才能被 3-羟酰-CoA 脱氢酶识别。",
    position: {
      title: "它在 β-氧化 fao-2 生成、fao-3 被氧化，两步都在线粒体基质",
      body:
        "fao-2 烯酰-CoA 水合酶把反式-Δ²-烯酰-CoA + H₂O 转成 L-3-羟脂酰-CoA；fao-3 由 3-羟酰-CoA 脱氢酶用 NAD⁺ 把它氧化成 3-酮脂酰-CoA + NADH。",
    },
    flow: {
      title: "它从烯酰-CoA 水合来，往 3-酮脂酰-CoA 去",
      body:
        "来路：fao-1 酰基-CoA 脱氢酶造出反式-Δ²-烯酰-CoA，经 fao-2 加水生成 L-3-羟脂酰-CoA。去向：fao-3 用 NAD⁺ 氧化成 3-酮脂酰-CoA，把氧化当量交给 NADH。",
    },
    significance: {
      title: "这一步把双键变成可氧化的羟基",
      body:
        "水合产物必须带 L-构型羟基，下一步醇氧化才有底物；没有这一刀，NAD⁺ 的氧化当量就无从产生。",
    },
    exam: {
      title: "考点是水合与脱氢的方向、NAD⁺ 与 FAD 的分级",
      items: [
        "fao-2 是水合，fao-3 是脱氢；方向与脂肪酸合成的脱水、还原相反。",
        "fao-3 用 NAD⁺，fao-1 用 FAD；两个氧化剂对应不同能级。",
        "羟脂酰-CoA 的羟基是 L-构型，由水合酶锁定。",
      ],
    },
    pathways: [
      { label: "β-氧化 fao-2：水合产物", href: "/pathway/fatty-acid-oxidation?step=fao-2" },
      { label: "β-氧化 fao-3：脱氢底物", href: "/pathway/fatty-acid-oxidation?step=fao-3" },
    ],
    sources: [
      "fao.json · steps[fao-2].equation / significance",
      "fao.json · steps[fao-3].equation / significance",
      "Lehninger Principles of Biochemistry, 8e, Ch.17",
    ],
    bubble: { what: "L-3-羟脂酰-CoA", highlight: "β-氧化第二轮氧化的起点" },
  },

  icit: {
    id: "icit",
    name: "异柠檬酸",
    aliases: ["isocitrate", "异柠檬酸"],
    claim: "异柠檬酸是 TCA 第一次氧化脱羧的底物，也是循环的调控点",
    classification: "三羧酸：柠檬酸的同分异构体，羟基从 C3 移到 C4。",
    structure: "与柠檬酸同分异构，羟基位置不同；这个排布让下一步氧化脱羧能顺利排出 CO₂。",
    position: {
      title: "它在 TCA tca-2 生成、tca-3 被氧化脱羧",
      body:
        "tca-2 乌头酸酶经顺乌头酸把柠檬酸异构化成异柠檬酸；tca-3 异柠檬酸脱氢酶用 NAD⁺ 把异柠檬酸氧化脱羧成 α-酮戊二酸 + CO₂ + NADH。",
    },
    flow: {
      title: "它从柠檬酸异构来，往 α-酮戊二酸去",
      body:
        "来路：tca-1 柠檬酸合酶生成柠檬酸，tca-2 乌头酸酶把羟基从 C3 挪到 C4，生成异柠檬酸。去向：tca-3 异柠檬酸脱氢酶氧化脱羧，生成 α-酮戊二酸、CO₂ 与 NADH；这是循环第一次释放 CO₂。",
    },
    significance: {
      title: "异柠檬酸脱氢酶是 TCA 的流量闸门之一",
      body:
        "ADP 与 Ca²⁺ 激活异柠檬酸脱氢酶，ATP 与 NADH 抑制它；这个酶的活性直接决定 TCA 循环跑多快。",
    },
    exam: {
      title: "考点是同分异构、第一次脱羧与调控",
      items: [
        "异柠檬酸与柠檬酸是同分异构体，乌头酸酶经顺乌头酸完成羟基移位。",
        "异柠檬酸脱氢酶是 TCA 第一次氧化脱羧，产 NADH 与 CO₂。",
        "ADP 与 Ca²⁺ 激活、ATP 与 NADH 抑制异柠檬酸脱氢酶。",
      ],
    },
    pathways: [
      { label: "TCA tca-2：乌头酸酶产物", href: "/pathway/tca?step=tca-2" },
      { label: "TCA tca-3：异柠檬酸脱氢酶底物", href: "/pathway/tca?step=tca-3" },
    ],
    sources: [
      "tca.json · steps[tca-2].equation / significance",
      "tca.json · steps[tca-3].equation / significance",
      "Lehninger Principles of Biochemistry, 8e, Ch.16",
    ],
    bubble: { what: "柠檬酸的三碳异构体", highlight: "首次氧化脱羧的底物" },
  },

  ile: {
    id: "ile",
    name: "L-异亮氨酸",
    aliases: ["Ile", "isoleucine", "异亮氨酸"],
    claim: "异亮氨酸是支链必需氨基酸，也是生糖兼生酮的那一个",
    classification: "支链 α-氨基酸：侧链带分支，属于必需氨基酸。",
    structure: "侧链为仲丁基，α-碳与 β-碳各有一个手性中心；支链结构使它先经支链氨基转移。",
    position: {
      title: "它只在 aa-5 的支链转氨里被点名，与亮氨酸、缬氨酸共用同一个酶",
      body:
        "aa-5 支链氨基转移酶 2 在线粒体把 L-亮氨酸（/ Ile / Val）+ α-酮戊二酸转成相应 α-酮酸 + 谷氨酸；异亮氨酸在数据层的方程里与亮氨酸、缬氨酸并列出现，没有单独的反应步骤。",
    },
    flow: {
      title: "它从蛋白质分解来，往相应 α-酮酸与乙酰-CoA、琥珀酰-CoA 去",
      body:
        "来路：蛋白质分解释放。去向：经支链氨基转移酶脱氨生成相应 α-酮酸（aa-5）；碳骨架继续分解，异亮氨酸既能生糖也能生酮。",
    },
    significance: {
      title: "支链氨基酸先在肌肉转氨，再进入氧化",
      body:
        "运动与饥饿时支链氨基酸在肌肉里先转氨供能；异亮氨酸的碳骨架可分流向生糖与生酮两条路。",
    },
    exam: {
      title: "考点是必需性、共用酶与生糖生酮分类",
      items: [
        "异亮氨酸、亮氨酸、缬氨酸都是必需氨基酸，第一步共用支链氨基转移酶。",
        "异亮氨酸是生糖兼生酮氨基酸；亮氨酸只生酮，缬氨酸只生糖。",
        "支链氨基转移的辅酶是磷酸吡哆醛。",
      ],
    },
    pathways: [
      { label: "氨基酸代谢 aa-5：支链氨基转移酶", href: "/pathway/amino-acids?step=aa-5" },
    ],
    sources: [
      "amino.json · steps[aa-5].equation",
      "Lehninger Principles of Biochemistry, 8e, Ch.18",
    ],
    bubble: { what: "支链必需氨基酸", highlight: "生糖兼生酮" },
  },

  ipp: {
    id: "ipp",
    name: "异戊烯基二磷酸",
    aliases: ["IPP", "isopentenyl pyrophosphate", "异戊烯基焦磷酸"],
    claim: "IPP 是甲羟戊酸途径的 C5 单位，甾醇的碳都从它来",
    classification: "异戊二烯二磷酸酯：C5 的二磷酸，是萜类与甾醇的共同单位。",
    structure: "C5 二磷酸酯；异构化成 DMAPP 后才成为缩合反应的烯丙基供体。",
    position: {
      title: "它在胆固醇合成 ch-6 生成、ch-7 异构化、ch-8 参与缩合",
      body:
        "ch-6 甲羟戊酸二磷酸脱羧酶把甲羟戊酸-5-二磷酸 + ATP 转成 IPP + CO₂ + ADP + Pi；ch-7 异戊烯基二磷酸异构酶 1 把 IPP 异构化成 DMAPP；ch-8 法尼基二磷酸合酶用 IPP + DMAPP 缩合成 GPP。",
    },
    flow: {
      title: "它从甲羟戊酸脱羧来，往 DMAPP、GPP 与 FPP 去",
      body:
        "来路：甲羟戊酸经 MVK、PMVK 两步磷酸化，再由 MVD 脱羧生成 IPP（ch-6）。去向：① 异构化成 DMAPP（ch-7）；② 作为 IPP 单元与 DMAPP、GPP 缩合，逐级生成 GPP 与 FPP（ch-8、ch-9）。",
    },
    significance: {
      title: "IPP 是甲羟戊酸途径的分流节点",
      body:
        "从 IPP 出发，碳可以走向甾醇、蛋白异戊二烯化、多萜醇与 CoQ10；甲羟戊酸途径的流量最终都汇到这个 C5 单位。",
    },
    exam: {
      title: "考点是碳数变化与异构化先后",
      items: [
        "IPP 是 C5；甲羟戊酸是 C6，脱羧后掉一个碳变成 C5。",
        "IPP 必须先异构化成 DMAPP 才能作为烯丙基供体参与缩合。",
        "HMGCR 是通路限速酶，位于 IPP 生成的上游。",
      ],
    },
    pathways: [
      { label: "胆固醇合成 ch-6：MVD 产物", href: "/pathway/cholesterol?step=ch-6" },
      { label: "胆固醇合成 ch-7：异构化成 DMAPP", href: "/pathway/cholesterol?step=ch-7" },
      { label: "胆固醇合成 ch-8：缩合底物", href: "/pathway/cholesterol?step=ch-8" },
    ],
    sources: [
      "cholesterol.json · steps[ch-6].equation",
      "cholesterol.json · steps[ch-7].equation",
      "cholesterol.json · steps[ch-8].equation",
      "Lehninger Principles of Biochemistry, 8e, Ch.21",
    ],
    bubble: { what: "C5 异戊二烯单位", highlight: "甾醇碳的共同来源" },
  },

  "keto-c16": {
    id: "keto-c16",
    name: "3-酮脂酰-CoA",
    aliases: ["3-ketoacyl-CoA", "β-酮脂酰-CoA"],
    claim: "3-酮脂酰-CoA 是 β-氧化硫解的底物，断链就发生在这里",
    classification: "3-酮脂酰-CoA：fao-3 氧化后的产物，C3 为酮基。",
    structure: "C3 酮基与 CoA 硫酯相邻，使 C2–C3 键成为硫解酶的断点。",
    position: {
      title: "它在 β-氧化 fao-3 生成、fao-4 被硫解",
      body:
        "fao-3 3-羟酰-CoA 脱氢酶把 L-3-羟脂酰-CoA + NAD⁺ 氧化成 3-酮脂酰-CoA + NADH；fao-4 β-酮脂酰-CoA 硫解酶用 CoA-SH 把 3-酮脂酰-CoA 断成乙酰-CoA + 少两个碳的脂酰-CoA。",
    },
    flow: {
      title: "它从羟脂酰-CoA 氧化来，往乙酰-CoA 与下一轮脂酰-CoA 去",
      body:
        "来路：fao-2 水合、fao-3 脱氢接力生成 3-酮脂酰-CoA。去向：fao-4 硫解，C1–C2 以乙酰-CoA 释出进入 TCA，剩余链少 2 个碳，成为下一轮 fao-1 的底物。",
    },
    significance: {
      title: "硫解是每轮 β-氧化的收口",
      body:
        "断键发生在 α–β 之间，β 碳已被氧化成酮基，所以这条通路叫 β-氧化；每断一次就交出一个乙酰-CoA。",
    },
    exam: {
      title: "考点是硫解产物与四步顺序",
      items: [
        "fao-4 用 CoA-SH 硫解，产物是乙酰-CoA 与 Cₙ₋₂ 脂酰-CoA。",
        "每轮 β-氧化依次是脱氢（FAD）、水合、脱氢（NAD⁺）、硫解。",
        "硫解不消耗 ATP；活化脂肪酸才消耗 2 个高能磷酸键。",
      ],
    },
    pathways: [
      { label: "β-氧化 fao-3：脱氢产物", href: "/pathway/fatty-acid-oxidation?step=fao-3" },
      { label: "β-氧化 fao-4：硫解底物", href: "/pathway/fatty-acid-oxidation?step=fao-4" },
    ],
    sources: [
      "fao.json · steps[fao-3].equation / significance",
      "fao.json · steps[fao-4].equation / significance",
      "Lehninger Principles of Biochemistry, 8e, Ch.17",
    ],
    bubble: { what: "C3 带酮基的脂酰-CoA", highlight: "硫解断链的底物" },
  },

  kic: {
    id: "kic",
    name: "α-酮异己酸",
    aliases: ["KIC", "α-ketoisocaproate", "α-酮异己酸"],
    claim: "α-酮异己酸是亮氨酸转氨后的 α-酮酸，支链分解从这里开始",
    classification: "α-酮酸：亮氨酸脱去氨基后的对应酮酸。",
    structure: "C6 支链 α-酮酸，酮基来自原来的 α-氨基；它是支链 α-酮酸脱氢酶的底物。",
    position: {
      title: "它在氨基酸代谢 aa-5 生成，酶是支链氨基转移酶 2",
      body:
        "aa-5 在线粒体把 L-亮氨酸（/ Ile / Val）+ α-酮戊二酸转成 α-酮异己酸（/ 相应 α-酮酸）+ 谷氨酸；α-酮异己酸是亮氨酸对应的产物。",
    },
    flow: {
      title: "它从亮氨酸转氨来，往乙酰乙酸与乙酰-CoA 去",
      body:
        "来路：亮氨酸经支链氨基转移酶脱氨生成 α-酮异己酸（aa-5）。去向：经支链 α-酮酸脱氢酶氧化脱羧，进入亮氨酸分解的后续步骤，最终产生乙酰乙酸与乙酰-CoA。",
    },
    significance: {
      title: "支链 α-酮酸脱氢酶缺陷时它会堆积",
      body:
        "支链 α-酮酸脱氢酶与 PDH 共用相似的复合体结构；酶缺陷时支链氨基酸与 α-酮酸堆积，形成枫糖尿症。",
    },
    exam: {
      title: "考点是归属、转氨与枫糖尿症",
      items: [
        "α-酮异己酸是亮氨酸的对应 α-酮酸，不是异亮氨酸的。",
        "支链氨基转移酶把氨基交给 α-酮戊二酸，生成谷氨酸。",
        "支链 α-酮酸脱氢酶缺陷导致枫糖尿症，支链氨基酸与 α-酮酸堆积。",
        "亮氨酸的终产物是乙酰乙酸 + 乙酰-CoA，不是乙酰乙酰-CoA（后者是上游中间物）。",
      ],
    },
    pathways: [
      { label: "氨基酸代谢 aa-5：支链转氨产物", href: "/pathway/amino-acids?step=aa-5" },
    ],
    sources: [
      "amino.json · steps[aa-5].equation",
      "Lehninger Principles of Biochemistry, 8e, Ch.18",
    ],
    bubble: { what: "亮氨酸对应的 α-酮酸", highlight: "支链分解的起点" },
  },

  lac: {
    id: "lac",
    name: "乳酸",
    aliases: ["Lac", "lactate", "2-羟基丙酸"],
    claim: "乳酸是糖酵解在无氧条件下的终点，也是 Cori 循环的搬运货币",
    classification: "α-羟基酸：三碳羧酸，C2 带羟基。",
    structure: "三碳 α-羟基酸；C2 羟基来自丙酮酸的酮基被 NADH 还原。",
    position: {
      title: "肌肉侧在 LDH 步骤生成，肝侧在 gn-cori 被氧化回丙酮酸",
      body:
        "cori.json 不重画反应式：肌肉臂引用 gn-cori 的逆向（丙酮酸 → 乳酸，LDH 把 gk-6 产生的 NADH 消耗掉、再生 NAD⁺）；肝臂引用 gn-cori 正向（乳酸 → 丙酮酸）。乳酸经 MCT4 出肌细胞、MCT1 进肝细胞。",
    },
    flow: {
      title: "它从肌肉与红细胞的丙酮酸还原来，往肝的糖异生去",
      body:
        "来路：肌肉与红细胞把糖酵解跑到终点，LDH 用 NADH 把丙酮酸还原成乳酸；红细胞没有线粒体，终点恒为乳酸。去向：经 MCT4 入血，肝用 MCT1 摄取，LDH 氧化回丙酮酸后走糖异生重建葡萄糖。",
    },
    significance: {
      title: "乳酸不是废物，它是跨器官的碳搬运",
      body:
        "肌肉无法继续氧化的碳以乳酸形式搬到肝，肝再花 6 个高能磷酸键把它变回葡萄糖；重建要绕开糖酵解 3 个不可逆步，这是 Cori 循环净耗能的来源。",
    },
    exam: {
      title: "考点是 LDH 的偶联、红细胞与净耗能",
      items: [
        "LDH 把丙酮酸还原成乳酸，同时把 NADH 氧化成 NAD⁺，这一步不产 ATP。",
        "红细胞没有线粒体，糖酵解终点恒为乳酸，是静息血乳酸的稳定来源。",
        "肝把乳酸氧化回丙酮酸再走糖异生，重建 1 葡萄糖需绕开 3 个不可逆步。",
      ],
    },
    pathways: [
      { label: "Cori 循环：肌肉产出端与肝回收端", href: "/pathway/cori" },
      { label: "糖异生 gn-cori：乳酸入口", href: "/pathway/gluconeogenesis?step=gn-cori" },
    ],
    sources: [
      "cori.json · summary / organs / arms（gn-cori 引用）",
      "gluconeogenesis.json · sideBranchSteps[gn-cori].equation / significance",
      "glycolysis.json · steps[gk-10].significance",
      "Lehninger Principles of Biochemistry, 8e, Ch.14 / Ch.23",
    ],
    bubble: { what: "三碳 α-羟基酸", highlight: "无氧糖酵解的终点" },
  },

  lanosterol: {
    id: "lanosterol",
    name: "羊毛甾醇",
    aliases: ["lanosterol", "羊毛甾醇"],
    claim: "羊毛甾醇是第一个甾醇骨架，离胆固醇还差一串修饰酶",
    classification: "四环三萜醇：C30 的甾醇骨架，由 2,3-环氧角鲨烯环化而成。",
    structure: "C30 四环骨架，带三个甲基（4α、4β、14α）；需经去甲基与还原才缩成 C27 胆固醇。",
    position: {
      title: "它在胆固醇合成 ch-12 生成、ch-13 被修饰",
      body:
        "ch-12 羊毛甾醇合酶在 ER 把 2,3-环氧角鲨烯 + H⁺ 环化成羊毛甾醇；ch-13 由羊毛甾醇 14α-去甲基酶（CYP51A1）起始，经 TM7SF2、MSMO1/NSDHL、HSD17B7、EBP、SC5D、DHCR7 一串酶变成胆固醇，DHCR24 可从 desmosterol 平行进入。",
    },
    flow: {
      title: "它从 2,3-环氧角鲨烯环化来，往胆固醇去",
      body:
        "来路：角鲨烯经角鲨烯环氧酶加氧生成 2,3-环氧角鲨烯，再由羊毛甾醇合酶环化。去向：经 ch-13 的多步去甲基、还原与双键迁移，最终成 C27 胆固醇。",
    },
    significance: {
      title: "它是甾醇合成的骨架节点，也是唑类药物的靶点上游",
      body:
        "羊毛甾醇是第一个带四环骨架的产物；CYP51A1 是 ch-13 的簇首酶，唑类抗真菌药就抑制这一步。",
    },
    exam: {
      title: "考点是 C30 到 C27 与 CYP51A1",
      items: [
        "羊毛甾醇是 C30，胆固醇是 C27；去甲基发生在 ch-13 的多步修饰里。",
        "羊毛甾醇合酶把 2,3-环氧角鲨烯环化成四环骨架。",
        "CYP51A1 是 ch-13 的簇首酶，唑类抗真菌药抑制它。",
      ],
    },
    pathways: [
      { label: "胆固醇合成 ch-12：羊毛甾醇合酶产物", href: "/pathway/cholesterol?step=ch-12" },
      { label: "胆固醇合成 ch-13：修饰起点", href: "/pathway/cholesterol?step=ch-13" },
    ],
    sources: [
      "cholesterol.json · steps[ch-12].equation / enzyme",
      "cholesterol.json · steps[ch-13].equation / significance",
      "Lehninger Principles of Biochemistry, 8e, Ch.21",
    ],
    bubble: { what: "C30 的四环三萜醇", highlight: "第一个甾醇骨架" },
  },

  leu: {
    id: "leu",
    name: "L-亮氨酸",
    aliases: ["Leu", "leucine", "亮氨酸"],
    claim: "亮氨酸是纯生酮的支链氨基酸，转氨后走乙酰-CoA",
    classification: "支链 α-氨基酸：侧链为异丁基，属于必需氨基酸。",
    structure: "侧链异丁基，疏水；支链结构使它的分解先经支链氨基转移。",
    position: {
      title: "它在 aa-5 作为支链氨基转移酶 2 的底物",
      body:
        "aa-5 在线粒体把 L-亮氨酸（/ Ile / Val）+ α-酮戊二酸转成 α-酮异己酸（/ 相应 α-酮酸）+ 谷氨酸；亮氨酸对应的产物是 α-酮异己酸。",
    },
    flow: {
      title: "它从蛋白质分解来，往 α-酮异己酸与乙酰-CoA 去",
      body:
        "来路：蛋白质分解释放。去向：经支链氨基转移酶脱氨生成 α-酮异己酸（aa-5），再由支链 α-酮酸脱氢酶氧化脱羧，最终生成乙酰乙酸与乙酰-CoA，只能生酮。",
    },
    significance: {
      title: "亮氨酸只生酮，不能净生糖",
      body:
        "亮氨酸的碳骨架最终进入乙酰乙酸与乙酰-CoA，没有净生糖的出口；饥饿时支链氨基酸在肌肉先转氨供能。",
    },
    exam: {
      title: "考点是生糖生酮分类与共用第一步",
      items: [
        "亮氨酸只生酮，异亮氨酸生糖兼生酮，缬氨酸只生糖。",
        "三种支链氨基酸第一步都由支链氨基转移酶脱氨，辅酶是磷酸吡哆醛。",
        "亮氨酸分解终产物是乙酰乙酸与乙酰-CoA，不净生糖。",
      ],
    },
    pathways: [
      { label: "氨基酸代谢 aa-5：支链氨基转移酶底物", href: "/pathway/amino-acids?step=aa-5" },
    ],
    sources: [
      "amino.json · steps[aa-5].equation",
      "Lehninger Principles of Biochemistry, 8e, Ch.18",
    ],
    bubble: { what: "纯生酮的支链氨基酸", highlight: "转氨后走乙酰-CoA" },
  },

  lys: {
    id: "lys",
    name: "L-赖氨酸",
    aliases: ["Lys", "lysine", "赖氨酸"],
    claim: "赖氨酸是纯生酮的碱性氨基酸，分解不走普通转氨",
    classification: "碱性 α-氨基酸：侧链带 ε-氨基，属于必需氨基酸。",
    structure: "侧链末端多一个氨基，生理 pH 下带正电；分解时先与 α-酮戊二酸缩合，而不是转氨。",
    position: {
      title: "挂图上它只作为氨基酸实体出现，没有独立步骤",
      body:
        "氨基酸代谢数据层的 7 个步骤里没有以赖氨酸为底物或产物的反应，它只在实体表中出现。教材章级定位：赖氨酸分解先经酵母氨酸途径与 α-酮戊二酸缩合，最终生成乙酰-CoA 与乙酰乙酸，纯生酮。",
    },
    flow: {
      title: "它从蛋白质分解来，往酵母氨酸与乙酰-CoA 去",
      body:
        "来路：蛋白质分解释放。去向：先与 α-酮戊二酸缩合成酵母氨酸，再裂解成 α-氨基己二酸半醛与谷氨酸，后续氧化成乙酰-CoA 与乙酰乙酸，只生酮。",
    },
    significance: {
      title: "它是必需氨基酸，也参与胶原交联",
      body:
        "赖氨酸是必需氨基酸；胶原中的赖氨酸经赖氨酸氧化酶变成醛赖氨酸，再参与共价交联，决定胶原的强度。",
    },
    exam: {
      title: "考点是碱性侧链、纯生酮与胶原交联",
      items: [
        "赖氨酸是碱性氨基酸，侧链 ε-氨基带正电。",
        "赖氨酸是纯生酮氨基酸，分解先与 α-酮戊二酸缩合，不走普通转氨。",
        "胶原交联的醛赖氨酸由赖氨酸氧化酶生成。",
      ],
    },
    pathways: [
      { label: "氨基酸代谢实体表中的赖氨酸", href: "/pathway/amino-acids" },
    ],
    sources: [
      "amino.json · entities[lys]（无独立反应步骤）",
      "Lehninger Principles of Biochemistry, 8e, Ch.18",
    ],
    bubble: { what: "带 ε-氨基的碱性氨基酸", highlight: "纯生酮，不走转氨" },
  },

  mal: {
    id: "mal",
    name: "苹果酸",
    aliases: ["Mal", "malate", "L-苹果酸"],
    claim: "苹果酸是 TCA 里最后一个被氧化的中间物，再生草酰乙酸",
    classification: "四碳二羧酸：延胡索酸水合后的产物，C2 带羟基。",
    structure: "C4 二羧酸，C2 的 L-构型羟基是苹果酸脱氢酶的氧化位点。",
    position: {
      title: "它在 TCA tca-7 生成、tca-8 被氧化",
      body:
        "tca-7 延胡索酸酶把延胡索酸 + H₂O 水合成 L-苹果酸；tca-8 苹果酸脱氢酶用 NAD⁺ 把 L-苹果酸氧化成草酰乙酸 + NADH。",
    },
    flow: {
      title: "它从延胡索酸水合来，往草酰乙酸去",
      body:
        "来路：tca-7 延胡索酸酶加水生成 L-苹果酸。去向：tca-8 苹果酸脱氢酶氧化成草酰乙酸，草酰乙酸回到 tca-1 与乙酰-CoA 缩合成柠檬酸，循环闭合。",
    },
    significance: {
      title: "tca-8 热力学不利，靠 tca-1 拉动",
      body:
        "苹果酸氧化成草酰乙酸本身不利，靠柠檬酸合酶的大负 ΔG 把整条循环拉过去；苹果酸也是 TCA 与糖异生之间的碳流节点。",
    },
    exam: {
      title: "考点是第三次脱氢与循环闭合",
      items: [
        "苹果酸脱氢酶产 NADH，是 TCA 第三步脱氢。",
        "tca-8 热力学不利，靠柠檬酸合酶的大负 ΔG 耦合拉动。",
        "延胡索酸酶是水合反应，不需要辅因子。",
      ],
    },
    pathways: [
      { label: "TCA tca-7：延胡索酸酶产物", href: "/pathway/tca?step=tca-7" },
      { label: "TCA tca-8：苹果酸脱氢酶底物", href: "/pathway/tca?step=tca-8" },
    ],
    sources: [
      "tca.json · steps[tca-7].equation / significance",
      "tca.json · steps[tca-8].equation / significance",
      "Lehninger Principles of Biochemistry, 8e, Ch.16",
    ],
    bubble: { what: "四碳二羧酸", highlight: "闭合 TCA 的最后一步" },
  },

  malonylacp: {
    id: "malonylacp",
    name: "丙二酰-ACP",
    aliases: ["malonyl-ACP", "丙二酰-ACP"],
    claim: "丙二酰-ACP 是脂肪酸合成四步环里唯一增碳的供体",
    classification: "丙二酰-ACP：丙二酰基与酰基载体蛋白的磷酸泛酰巯基乙胺形成硫酯。",
    structure: "丙二酰基挂在 ACP 上；缩合时游离羧基以 CO₂ 脱掉，剩下 C2 单元接进碳链。",
    position: {
      title: "它在 fas-ks 作为底物，酶是 FASN Ⅰ型 KS 结构域",
      body:
        "fas-ks 由 FASN Ⅰ型 KS 结构域催化：脂酰-ACP（Cₙ）+ 丙二酰-ACP → 3-酮脂酰-ACP（Cₙ₊₂）+ ACP + CO₂。丙二酰-ACP 的丙二酰基来自 ACC 生成的丙二酰-CoA。",
    },
    flow: {
      title: "它从丙二酰-CoA 来，往 3-酮脂酰-ACP 与 CO₂ 去",
      body:
        "来路：ACC 把乙酰-CoA 羧化成丙二酰-CoA（fas-acc），丙二酰基再转到 ACP 上。去向：fas-ks 缩合时，丙二酰-ACP 的 C2 单元接进碳链，游离羧基以 CO₂ 放出，ACP 被释放。",
    },
    significance: {
      title: "每轮缩合消耗一个丙二酰-ACP，同时放一个 CO₂",
      body:
        "7 轮缩合把 C2 引物推到 C16，同时释放 7 个 CO₂；这些 CO₂ 的碳正是 ACC 预先装上的 HCO₃⁻，不进入碳链。",
    },
    exam: {
      title: "考点是增碳供体与 CO₂ 的去向",
      items: [
        "脂肪酸合成的直接增碳供体是丙二酰-ACP，不是乙酰-CoA。",
        "缩合释放 CO₂，这个碳来自 ACC 预先装上的 HCO₃⁻，不进入碳链。",
        "KS 结构域催化的缩合是四步环里唯一增碳的一步。",
      ],
    },
    pathways: [
      { label: "脂肪酸合成 fas-ks：缩合底物", href: "/pathway/fatty-acid-synthesis?step=fas-ks" },
      { label: "脂肪酸合成 fas-acc：丙二酰-CoA 来源", href: "/pathway/fatty-acid-synthesis?step=fas-acc" },
    ],
    sources: [
      "fas.json · steps[fas-ks].equation / significance",
      "fas.json · steps[fas-acc].equation / significance",
      "Lehninger Principles of Biochemistry, 8e, Ch.21",
    ],
    bubble: { what: "挂在 ACP 上的丙二酰基", highlight: "每轮增碳的唯一供体" },
  },

  met: {
    id: "met",
    name: "L-甲硫氨酸",
    aliases: ["Met", "methionine", "甲硫氨酸"],
    claim: "甲硫氨酸是甲基供体的源头，也是转硫途径的起点",
    classification: "含硫必需氨基酸：侧链带硫醚，属于非极性氨基酸。",
    structure: "侧链硫醚甲基；这个甲基经 S-腺苷甲硫氨酸变成可转移的甲基。",
    position: {
      title: "挂图上它只作为氨基酸实体出现，没有独立步骤",
      body:
        "氨基酸代谢数据层的 7 个步骤里没有以甲硫氨酸为底物或产物的反应，它只在实体表中出现。教材章级定位：甲硫氨酸经 S-腺苷甲硫氨酸（SAM）供甲基，再转成 S-腺苷同型半胱氨酸与高半胱氨酸；高半胱氨酸进入 aa-7 的转硫途径。",
    },
    flow: {
      title: "它从蛋白质分解来，往 SAM、高半胱氨酸与半胱氨酸去",
      body:
        "来路：蛋白质分解释放。去向：① 生成 SAM，向 DNA、蛋白与磷脂提供甲基；② 脱甲基后变高半胱氨酸，经 aa-7 转硫生成胱硫醚与半胱氨酸；③ 经甲硫氨酸合酶用 B12 与叶酸再甲基化，循环回甲硫氨酸。",
    },
    significance: {
      title: "它把一碳单位、B12、叶酸与转硫串在一起",
      body:
        "甲硫氨酸是必需氨基酸，也是甲基循环的入口；它的代谢同时依赖 B12 与叶酸，任一环节受阻都会让高半胱氨酸升高。",
    },
    exam: {
      title: "考点是 SAM、必需性与两种辅因子",
      items: [
        "SAM 是主要的甲基供体，甲硫氨酸是其前体。",
        "甲硫氨酸是必需氨基酸；高半胱氨酸不是蛋白质氨基酸。",
        "高半胱氨酸再甲基化需要 B12 与叶酸，转硫需要 B6。",
      ],
    },
    pathways: [
      { label: "氨基酸代谢实体表中的甲硫氨酸", href: "/pathway/amino-acids" },
      { label: "氨基酸代谢 aa-7：下游高半胱氨酸转硫", href: "/pathway/amino-acids?step=aa-7" },
    ],
    sources: [
      "amino.json · steps[aa-7].equation / entities[met]",
      "Lehninger Principles of Biochemistry, 8e, Ch.18",
    ],
    bubble: { what: "含硫的必需氨基酸", highlight: "甲基供体 SAM 的前体" },
  },

  mev5p: {
    id: "mev5p",
    name: "甲羟戊酸-5-磷酸",
    aliases: ["mevalonate-5-phosphate", "甲羟戊酸-5-磷酸"],
    claim: "甲羟戊酸-5-磷酸是甲羟戊酸激酶的产物，C3 叔醇留给 MVD 下一步磷酸化",
    classification: "糖酸磷酸酯：甲羟戊酸的 C5 羟基被磷酸化。",
    structure: "C3 是叔醇，MVK 这一步不动它；C3 的磷酸化由 MVD 在脱羧前完成，作为消除的离去基团。",
    position: {
      title: "它在胆固醇合成 ch-4 生成、ch-5 被再磷酸化",
      body:
        "ch-4 甲羟戊酸激酶用 ATP 把甲羟戊酸磷酸化成甲羟戊酸-5-磷酸；ch-5 磷酸甲羟戊酸激酶再用 ATP 把 C5 上的磷酸转成二磷酸，生成甲羟戊酸-5-二磷酸。",
    },
    flow: {
      title: "它从甲羟戊酸来，往甲羟戊酸-5-二磷酸去",
      body:
        "来路：HMGCR 还原生成甲羟戊酸（ch-3），MVK 用 ATP 磷酸化 C5 羟基生成 mev5p（ch-4）。去向：PMVK 再磷酸化生成 mev5pp（ch-5），再由 MVD 脱羧成 IPP（ch-6）。",
    },
    significance: {
      title: "这两步连续消耗 ATP，是通路的能量投入段",
      body:
        "甲羟戊酸经 MVK 磷酸化 C5、PMVK 转成 5-二磷酸，再由 MVD 磷酸化 C3 并脱羧；C3 不是不磷酸化，而是留给 MVD。",
    },
    exam: {
      title: "考点是磷酸化位点与 ATP 计数",
      items: [
        "MVK 只磷酸化 C5；C3 叔醇由 MVD 用 ATP 磷酸化后脱羧。",
        "甲羟戊酸到 IPP 需要 3 个 ATP：MVK、PMVK 各 1 个，MVD 再用 1 个。",
        "HMGCR 在 mev5p 上游，是通路限速酶。",
      ],
    },
    pathways: [
      { label: "胆固醇合成 ch-4：MVK 产物", href: "/pathway/cholesterol?step=ch-4" },
      { label: "胆固醇合成 ch-5：PMVK 底物", href: "/pathway/cholesterol?step=ch-5" },
    ],
    sources: [
      "cholesterol.json · steps[ch-4].equation / enzyme",
      "cholesterol.json · steps[ch-5].equation / enzyme",
      "cholesterol.json · steps[ch-6].equation",
      "Lehninger Principles of Biochemistry, 8e, Ch.21",
    ],
    bubble: { what: "甲羟戊酸 C5 磷酸酯", highlight: "甲羟戊酸途径的能量投入段" },
  },

  mev5pp: {
    id: "mev5pp",
    name: "甲羟戊酸-5-二磷酸",
    aliases: ["mevalonate-5-diphosphate", "甲羟戊酸-5-二磷酸"],
    claim: "甲羟戊酸-5-二磷酸是 MVD 脱羧的底物，C5 单位在下一步成形",
    classification: "甲羟戊酸二磷酸酯：甲羟戊酸的 5 位连二磷酸。",
    structure: "C5 位带二磷酸；MVD 先用 ATP 磷酸化 3-OH，再经 β-消除脱去 CO₂ 与磷酸。",
    position: {
      title: "它在胆固醇合成 ch-5 生成、ch-6 被 MVD 脱羧",
      body:
        "ch-5 磷酸甲羟戊酸激酶用 ATP 把甲羟戊酸-5-磷酸转成甲羟戊酸-5-二磷酸 + ADP；ch-6 MVD 再用 ATP 磷酸化 3-OH，经 β-消除脱去 CO₂ 与磷酸，生成 IPP + ADP + Pi。",
    },
    flow: {
      title: "它从 mev5p 再磷酸化来，往 IPP 与 CO₂ 去",
      body:
        "来路：ch-4 MVK 先生成甲羟戊酸-5-磷酸，ch-5 PMVK 再用 ATP 接上第二个磷酸。去向：ch-6 MVD 脱羧，生成 C5 的 IPP、CO₂、ADP 与 Pi。",
    },
    significance: {
      title: "这一步把 C6 的甲羟戊酸缩成 C5 的 IPP",
      body:
        "甲羟戊酸是 C6，经 MVD 脱羧后变成 C5 的 IPP，甾醇与非甾醇类异戊二烯的碳单位才真正成形。",
    },
    exam: {
      title: "考点是三次 ATP 与脱羧位置",
      items: [
        "MVK 与 PMVK 各消耗 1 ATP，MVD 再消耗 1 ATP，共 3 个。",
        "脱羧发生在 MVD，产物是 IPP，不是 GPP。",
        "IPP 必须异构化成 DMAPP 才能作为烯丙基供体参与缩合。",
      ],
    },
    pathways: [
      { label: "胆固醇合成 ch-5：PMVK 产物", href: "/pathway/cholesterol?step=ch-5" },
      { label: "胆固醇合成 ch-6：MVD 底物", href: "/pathway/cholesterol?step=ch-6" },
    ],
    sources: [
      "cholesterol.json · steps[ch-5].equation / enzyme",
      "cholesterol.json · steps[ch-6].equation / physiology",
      "Lehninger Principles of Biochemistry, 8e, Ch.21",
    ],
    bubble: { what: "甲羟戊酸二磷酸酯", highlight: "MVD 脱羧的底物" },
  },

  mevalonate: {
    id: "mevalonate",
    name: "甲羟戊酸",
    aliases: ["mevalonate", "甲羟戊酸", "3,5-二羟基-3-甲基戊酸"],
    claim: "甲羟戊酸是胆固醇合成的第一个承诺产物，HMGCR 之后没有回头路",
    classification: "六碳糖酸：HMG-CoA 的硫酯被还原后生成的伯醇酸。",
    structure: "C6 糖酸，C3 是叔醇、C5 是伯醇；只有 C5 伯羟基能被 MVK 磷酸化。",
    position: {
      title: "它在胆固醇合成 ch-3 生成、ch-4 被 MVK 磷酸化",
      body:
        "ch-3 HMGCR 用 2 NADPH + 2 H⁺ 把 HMG-CoA 还原成甲羟戊酸 + CoA-SH + 2 NADP⁺；ch-4 MVK 用 ATP 磷酸化 C5 伯羟基，生成甲羟戊酸-5-磷酸。",
    },
    flow: {
      title: "它从 HMG-CoA 还原来，往 mev5p、IPP 与甾醇去",
      body:
        "来路：ch-1、ch-2 把三分子乙酰-CoA 接成 HMG-CoA，ch-3 HMGCR 再把它还原成甲羟戊酸。去向：ch-4 磷酸化，经 ch-5、ch-6 变成 IPP，再延伸成 GPP、FPP、角鲨烯与甾醇。",
    },
    significance: {
      title: "HMGCR 是限速步，甲羟戊酸就是该步的产物",
      body:
        "他汀抑制 HMGCR 后甲羟戊酸生成减少，下游甾醇与非甾醇类异戊二烯一起下降；这一步是整条通路最强的调控点。",
    },
    exam: {
      title: "考点是 2 NADPH、磷酸化位点与 C6 到 C5",
      items: [
        "HMGCR 消耗 2 NADPH，产物是甲羟戊酸。",
        "MVK 只磷酸化 C5 伯羟基，C3 叔羟基不被磷酸化。",
        "甲羟戊酸是 C6，经脱羧变成 C5 的 IPP。",
      ],
    },
    pathways: [
      { label: "胆固醇合成 ch-3：HMGCR 产物", href: "/pathway/cholesterol?step=ch-3" },
      { label: "胆固醇合成 ch-4：MVK 底物", href: "/pathway/cholesterol?step=ch-4" },
    ],
    sources: [
      "cholesterol.json · steps[ch-3].equation / physiology / clinical",
      "cholesterol.json · steps[ch-4].equation / physiology",
      "Lehninger Principles of Biochemistry, 8e, Ch.21",
    ],
    bubble: { what: "六碳糖酸，HMGCR 产物", highlight: "甾醇合成的承诺点" },
  },

  nad: {
    id: "nad",
    name: "氧化型烟酰胺腺嘌呤二核苷酸",
    aliases: ["NAD⁺", "NAD", "烟酰胺腺嘌呤二核苷酸"],
    claim: "NAD⁺ 是分解代谢的电子接受体，NADH/NAD⁺ 比决定氧化方向",
    classification: "吡啶核苷酸辅酶：烟酰胺环可逆地接受氢负离子。",
    structure: "烟酰胺环的 C4 接受两个电子与一个质子（净氢负离子）；氧化态是 NAD⁺。",
    position: {
      title: "它在糖酵解 gk-6、β-氧化 fao-3 与 TCA 脱氢步作为底物",
      body:
        "糖酵解 gk-6 GAPDH 用 NAD⁺ 把 GAP 氧化成 1,3-BPG；β-氧化 fao-3 用 NAD⁺ 氧化羟脂酰-CoA；TCA 的异柠檬酸脱氢酶、α-KG 脱氢酶复合体与苹果酸脱氢酶也把 NAD⁺ 还原。生成的 NADH 在复合体 I 被氧化，电子进入 Q 池。",
    },
    flow: {
      title: "它从脱氢反应接受电子来，往 NADH 与复合体 I 去",
      body:
        "来路：底物脱氢时 NAD⁺ 被还原成 NADH。去向：NADH 在复合体 I 把电子交给 Q 池，NAD⁺ 再生；胞质 NADH 还需经穿梭或乳酸脱氢酶再生 NAD⁺。",
    },
    significance: {
      title: "它把氧化当量搬到呼吸链，本身不是能量分子",
      body:
        "NAD⁺ 在脱氢步接受电子，NADH 再把电子交给复合体 I；糖酵解要持续，胞质 NAD⁺ 必须由乳酸脱氢酶再生。",
    },
    exam: {
      title: "考点是氢负离子、GAPDH 与两条电子入口",
      items: [
        "NAD⁺ 接受氢负离子，写成 NAD⁺ + 2e⁻ + H⁺ → NADH。",
        "糖酵解唯一产 NADH 的步骤是 GAPDH；丙酮酸还原成乳酸正是为了再生 NAD⁺。",
        "NADH 走复合体 I，FADH₂ 走复合体 II，ATP 当量不同。",
      ],
    },
    pathways: [
      { label: "糖酵解 gk-6：GAPDH 底物", href: "/pathway/glycolysis?step=gk-6" },
      { label: "β-氧化 fao-3：羟脂酰-CoA 脱氢底物", href: "/pathway/fatty-acid-oxidation?step=fao-3" },
      { label: "氧化磷酸化 oxphos-e：复合体 I 底物", href: "/pathway/oxphos?step=oxphos-e" },
    ],
    sources: [
      "glycolysis.json · steps[gk-6].equation",
      "fao.json · steps[fao-3].equation",
      "oxphos.json · steps[oxphos-e].substrates",
      "Lehninger Principles of Biochemistry, 8e, Ch.13 / Ch.19",
    ],
    bubble: { what: "吡啶核苷酸辅酶", highlight: "分解代谢的电子接受体" },
  },

  nadh: {
    id: "nadh",
    name: "还原型烟酰胺腺嘌呤二核苷酸",
    aliases: ["NADH", "还原型辅酶 I"],
    claim: "NADH 是 NAD⁺ 的还原态，把电子交给复合体 I",
    classification: "还原型吡啶核苷酸：烟酰胺环带氢负离子。",
    structure: "烟酰胺环被还原，C4 多一个氢；这个氢负离子是它交给呼吸链的电子载体。",
    position: {
      title: "它在糖酵解 gk-6、β-氧化 fao-3 与 TCA 脱氢步生成，在复合体 I 被氧化",
      body:
        "糖酵解 gk-6 GAPDH 生成 NADH；β-氧化 fao-3 生成 NADH；TCA 的异柠檬酸脱氢酶、α-KG 脱氢酶复合体与苹果酸脱氢酶也生成 NADH。oxphos-e 由复合体 I 把 NADH 氧化，电子进入 Q 池。",
    },
    flow: {
      title: "它从底物脱氢来，往复合体 I 与 Q 池去",
      body:
        "来路：GAPDH、羟脂酰-CoA 脱氢酶与 TCA 三个脱氢步把 NAD⁺ 还原成 NADH。去向：复合体 I 氧化 NADH，电子经 Fe-S 簇交给 Q；胞质 NADH 不能直接进线粒体，需经穿梭或乳酸脱氢酶再生。",
    },
    significance: {
      title: "NADH 的电子在复合体 I 进入呼吸链并泵出质子",
      body:
        "复合体 I 氧化 NADH 时把质子泵到膜间隙，形成电化学梯度；每 NADH 约产 2.5 ATP。",
    },
    exam: {
      title: "考点是两条入口与 ATP 当量",
      items: [
        "NADH 在复合体 I 被氧化，FADH₂ 在复合体 II 被氧化。",
        "每 NADH 约 2.5 ATP，每 FADH₂ 约 1.5 ATP。",
        "胞质 NADH 需穿梭进入线粒体，不能直接过内膜。",
      ],
    },
    pathways: [
      { label: "糖酵解 gk-6：GAPDH 产物", href: "/pathway/glycolysis?step=gk-6" },
      { label: "β-氧化 fao-3：脱氢产物", href: "/pathway/fatty-acid-oxidation?step=fao-3" },
      { label: "氧化磷酸化 oxphos-e：复合体 I 底物", href: "/pathway/oxphos?step=oxphos-e" },
    ],
    sources: [
      "glycolysis.json · steps[gk-6].equation",
      "fao.json · steps[fao-3].equation",
      "oxphos.json · steps[oxphos-e].substrates",
      "Lehninger Principles of Biochemistry, 8e, Ch.19",
    ],
    bubble: { what: "还原型吡啶核苷酸", highlight: "把电子交给复合体 I" },
  },

  nadp: {
    id: "nadp",
    name: "氧化型烟酰胺腺嘌呤二核苷酸磷酸",
    aliases: ["NADP⁺", "NADP", "辅酶 II"],
    claim: "NADP⁺ 是磷酸戊糖途径的电子接受体，专供还原合成",
    classification: "磷酸化吡啶核苷酸：NAD⁺ 的 2′-磷酸衍生物。",
    structure: "比 NAD⁺ 多一个 2′-磷酸；这个磷酸让它被脱氢酶区分，走还原合成而不是分解供能。",
    position: {
      title: "它在磷酸戊糖途径 ppp-o1、ppp-o3 作为底物",
      body:
        "ppp-o1 葡萄糖-6-磷酸脱氢酶用 NADP⁺ 把 G6P 氧化成 6-磷酸葡糖酸内酯；ppp-o3 6-磷酸葡糖酸脱氢酶再用 NADP⁺ 氧化脱羧，生成核酮糖-5-磷酸 + CO₂ + NADPH。",
    },
    flow: {
      title: "它从 PPP 氧化相接受电子来，往 NADPH 去",
      body:
        "来路：PPP 氧化相两步脱氢把 NADP⁺ 还原成 NADPH。去向：NADPH 供脂肪酸合成、胆固醇合成与谷胱甘肽还原；NADP⁺ 再生依赖这些消耗 NADPH 的反应。",
    },
    significance: {
      title: "NADP⁺/NADPH 与 NAD⁺/NADH 分工不同",
      body:
        "NADP⁺ 在 PPP 接受电子，NADPH 供还原合成与抗氧化；NAD⁺ 则在分解代谢中接受电子，NADH 把电子送进呼吸链。",
    },
    exam: {
      title: "考点是 PPP 产 NADPH 与两个辅酶对的分工",
      items: [
        "PPP 氧化相产生 2 NADPH，不是 NADH。",
        "NADPH 供脂肪酸合成与胆固醇合成，NADH 主要进呼吸链。",
        "G6PD 是 PPP 的限速酶，底物是 G6P 与 NADP⁺。",
      ],
    },
    pathways: [
      { label: "磷酸戊糖途径 ppp-o1：G6PD 底物", href: "/pathway/ppp?step=ppp-o1" },
      { label: "磷酸戊糖途径 ppp-o3：6PGD 底物", href: "/pathway/ppp?step=ppp-o3" },
    ],
    sources: [
      "ppp.json · steps[ppp-o1].equation",
      "ppp.json · steps[ppp-o3].equation / significance",
      "Lehninger Principles of Biochemistry, 8e, Ch.14",
    ],
    bubble: { what: "磷酸化吡啶核苷酸", highlight: "还原合成的电子供体" },
  },

  nadph: {
    id: "nadph",
    name: "还原型烟酰胺腺嘌呤二核苷酸磷酸",
    aliases: ["NADPH", "还原型辅酶 II"],
    claim: "NADPH 是还原合成的供氢体，也是谷胱甘肽还原酶的底物",
    classification: "还原型磷酸吡啶核苷酸：烟酰胺环带氢负离子。",
    structure: "烟酰胺环被还原，2′-磷酸让它专供还原合成；氢负离子是它交出的还原当量。",
    position: {
      title: "它在 PPP 氧化相生成，在脂肪酸合成 fas-kr、fas-er 被消耗",
      body:
        "PPP 氧化相 ppp-o1、ppp-o3 共生成 2 NADPH；脂肪酸合成 fas-kr 与 fas-er 各消耗 1 NADPH，把酮基与双键还原；胆固醇合成 ch-3、ch-10、ch-11 也消耗 NADPH。",
    },
    flow: {
      title: "它从 PPP 氧化相来，往脂合成与抗氧化去",
      body:
        "来路：PPP 氧化相两步脱氢把 NADP⁺ 还原成 NADPH。去向：脂肪酸合成每轮消耗 2 NADPH；胆固醇合成在 HMGCR、角鲨烯合酶与角鲨烯单加氧酶步骤消耗；谷胱甘肽还原酶用它把氧化型谷胱甘肽还原。",
    },
    significance: {
      title: "NADPH 把还原力供给合成与抗氧化",
      body:
        "红细胞靠 PPP 产 NADPH 维持谷胱甘肽的还原态；G6PD 缺乏时 NADPH 不足，红细胞抗氧化能力下降，容易溶血。",
    },
    exam: {
      title: "考点是每轮脂合成的 NADPH 账与 G6PD",
      items: [
        "脂肪酸合成每轮消耗 2 NADPH，β-氧化每轮生成 1 NADH + 1 FADH₂。",
        "PPP 氧化相是 NADPH 的主要来源，不是 NADH。",
        "G6PD 缺乏时 NADPH 不足，红细胞抗氧化能力下降。",
      ],
    },
    pathways: [
      { label: "磷酸戊糖途径 ppp-o1：NADPH 生成", href: "/pathway/ppp?step=ppp-o1" },
      { label: "脂肪酸合成 fas-kr：KR 还原耗 NADPH", href: "/pathway/fatty-acid-synthesis?step=fas-kr" },
      { label: "脂肪酸合成 fas-er：ER 还原耗 NADPH", href: "/pathway/fatty-acid-synthesis?step=fas-er" },
    ],
    sources: [
      "ppp.json · steps[ppp-o1] / steps[ppp-o3]",
      "fas.json · steps[fas-kr].equation / steps[fas-er].equation",
      "cholesterol.json · steps[ch-3] / steps[ch-10] / steps[ch-11]",
      "Lehninger Principles of Biochemistry, 8e, Ch.14 / Ch.21",
    ],
    bubble: { what: "还原型磷酸吡啶核苷酸", highlight: "脂合成与抗氧化的供氢体" },
  },

  nh4: {
    id: "nh4",
    name: "铵离子",
    aliases: ["NH₄⁺", "ammonium", "铵"],
    claim: "NH₄⁺ 是氨基酸脱氨的游离氨形式，必须立刻被处理",
    classification: "无机阳离子：氨的质子化形式，在生理 pH 下以铵离子存在。",
    structure: "一个小分子阳离子；它来自氨基被脱下的那一瞬间，毒性来自游离氨而不是铵本身。",
    position: {
      title: "它在氨基酸代谢 aa-3 与 aa-4 生成，两步都在线粒体",
      body:
        "aa-3 谷氨酸脱氢酶把谷氨酸氧化脱氨成 α-酮戊二酸 + NH₄⁺；aa-4 谷氨酰胺酶把谷氨酰胺水解成谷氨酸 + NH₄⁺。两步都在线粒体。",
    },
    flow: {
      title: "它从谷氨酸与谷氨酰胺脱氨来，往尿素与肾排铵去",
      body:
        "来路：谷氨酸脱氢酶与谷氨酰胺酶在肝、肾线粒体释放 NH₄⁺。去向：肝内 NH₄⁺ 进入尿素循环，经氨甲酰磷酸合成酶 I 装成尿素的氮；肾内 NH₄⁺ 直接排进尿。",
    },
    significance: {
      title: "游离氨有神经毒性，肝与肾各有一条处理路",
      body:
        "肝把氨装成尿素，肾把氨排进尿，两条路保证血氨不升高；血氨升高时氨进入脑，影响 TCA 与神经功能。",
    },
    exam: {
      title: "考点是脱氨酶与尿素循环的分工",
      items: [
        "转氨酶不产生游离氨；谷氨酸脱氢酶才直接释放 NH₄⁺。",
        "尿素循环主要在肝进行，肾皮质也能少量进行；肾排铵走的是直接排铵途径，不经过尿素循环。",
        "血氨升高时氨进入脑，消耗 α-酮戊二酸，影响 TCA。",
      ],
    },
    pathways: [
      { label: "氨基酸代谢 aa-3：谷氨酸脱氢酶产物", href: "/pathway/amino-acids?step=aa-3" },
      { label: "氨基酸代谢 aa-4：谷氨酰胺酶产物", href: "/pathway/amino-acids?step=aa-4" },
      { label: "尿素循环 urea-1：氨进入尿素", href: "/pathway/urea-cycle?step=urea-1" },
    ],
    sources: [
      "amino.json · steps[aa-3].equation",
      "amino.json · steps[aa-4].equation",
      "urea.json · steps[urea-1].equation",
      "Lehninger Principles of Biochemistry, 8e, Ch.18",
    ],
    bubble: { what: "氨的质子化形式", highlight: "必须立刻处理的游离氨" },
  },

  o2: {
    id: "o2",
    name: "氧",
    aliases: ["O₂", "oxygen", "氧气"],
    claim: "O₂ 是呼吸链的末端电子受体，也是加氧酶的底物",
    classification: "无机双原子分子：呼吸链末端受体，也是羟化与加氧反应的氧源。",
    structure: "双原子分子；它接受 4 个电子被还原成水，也可被加氧酶插入有机底物。",
    position: {
      title: "它在氧化磷酸化末端被还原成水，在氨基酸代谢 aa-6 作为羟化酶底物",
      body:
        "呼吸链把 NADH 与 FADH₂ 的电子经 Q、复合体 III、细胞色素 c 传到复合体 IV，最终把 O₂ 还原成水。aa-6 苯丙氨酸羟化酶用 BH₄ 与 O₂ 把苯丙氨酸羟化成酪氨酸 + H₂O。",
    },
    flow: {
      title: "它从肺泡来，往水与羟化产物去",
      body:
        "来路：肺泡氧经血红蛋白运到组织。去向：① 在复合体 IV 接受 4 个电子还原成水；② 在加氧与羟化反应被插入底物，如 aa-6 的苯丙氨酸羟化。",
    },
    significance: {
      title: "氧是呼吸链的终点，缺氧时整条链堵在末端",
      body:
        "电子传递链的末端反应依赖 O₂；缺氧时 NADH 与 FADH₂ 堆积，TCA 也因 NAD⁺ 不足而跑不动。",
    },
    exam: {
      title: "考点是末端受体、复合体 IV 与羟化反应",
      items: [
        "末端受体是 O₂，复合体 IV 把 O₂ 还原成水。",
        "氰化物抑制复合体 IV，电子不能交给 O₂。",
        "苯丙氨酸羟化酶需要 BH₄ 与 O₂，产物是酪氨酸。",
      ],
    },
    pathways: [
      { label: "氧化磷酸化：末端电子受体", href: "/pathway/oxphos" },
      { label: "氨基酸代谢 aa-6：苯丙氨酸羟化酶底物", href: "/pathway/amino-acids?step=aa-6" },
    ],
    sources: [
      "oxphos.json · 呼吸链末端反应（Lehninger 8e Ch.19 §19.1 定性）",
      "amino.json · steps[aa-6].equation",
      "Lehninger Principles of Biochemistry, 8e, Ch.19",
    ],
    bubble: { what: "呼吸链的末端电子受体", highlight: "被还原成水" },
  },

  oaa: {
    id: "oaa",
    name: "草酰乙酸",
    aliases: ["OAA", "oxaloacetate", "草酰乙酸"],
    claim: "草酰乙酸是 TCA 的入口接受者，也是糖异生的第一个四碳酸",
    classification: "四碳 α-酮酸：TCA 中间物，也是糖异生与转氨的节点。",
    structure: "C4 α-酮酸，C2 酮基接受乙酰-CoA 的缩合；两个羧基让它带负电。",
    position: {
      title: "它在 gn-1 生成、gn-2 被羧激酶消耗，也在 tca-1 与乙酰-CoA 缩合",
      body:
        "gn-1 丙酮酸羧化酶把丙酮酸 + HCO₃⁻ + ATP 转成草酰乙酸；gn-2 PEP 羧激酶把草酰乙酸 + GTP 转成 PEP + GDP + CO₂；tca-1 柠檬酸合酶把乙酰-CoA + 草酰乙酸 + H₂O 转成柠檬酸 + CoA-SH。",
    },
    flow: {
      title: "它从丙酮酸羧化与苹果酸氧化来，往 PEP 与柠檬酸去",
      body:
        "来路：丙酮酸羧化（gn-1）、苹果酸脱氢（tca-8）与转氨都可生成草酰乙酸。去向：① 与乙酰-CoA 缩合成柠檬酸进入 TCA（tca-1）；② 经 PEP 羧激酶脱羧生成 PEP，走糖异生（gn-2）；③ 转氨成天冬氨酸，进入尿素循环。",
    },
    significance: {
      title: "草酰乙酸浓度极低，tca-1 对它的捕获是流量瓶颈",
      body:
        "TCA 靠柠檬酸合酶把乙酰-CoA 抓到草酰乙酸上；糖异生则先在线粒体把它羧化出来，再经苹果酸或天冬氨酸形式搬到胞质脱羧。",
    },
    exam: {
      title: "考点是两个隔室、GTP 与循环入口",
      items: [
        "丙酮酸羧化酶在线粒体，PEP 羧激酶在胞质；草酰乙酸不能直接过内膜。",
        "PEP 羧激酶用 GTP，释放 CO₂；这一步是糖异生绕开丙酮酸激酶的关键。",
        "草酰乙酸是 TCA 的入口接受者，乙酰-CoA 与它缩合成柠檬酸。",
      ],
    },
    pathways: [
      { label: "糖异生 gn-1：丙酮酸羧化酶产物", href: "/pathway/gluconeogenesis?step=gn-1" },
      { label: "糖异生 gn-2：PEP 羧激酶底物", href: "/pathway/gluconeogenesis?step=gn-2" },
      { label: "TCA tca-1：柠檬酸合酶底物", href: "/pathway/tca?step=tca-1" },
    ],
    sources: [
      "gluconeogenesis.json · steps[gn-1].equation / compartment",
      "gluconeogenesis.json · steps[gn-2].equation / compartment",
      "tca.json · steps[tca-1].equation",
      "Lehninger Principles of Biochemistry, 8e, Ch.16 / Ch.14",
    ],
    bubble: { what: "四碳 α-酮酸", highlight: "TCA 入口与糖异生节点" },
  },

  oxidosqualene: {
    id: "oxidosqualene",
    name: "2,3-环氧角鲨烯",
    aliases: ["2,3-oxidosqualene", "环氧角鲨烯"],
    claim: "2,3-环氧角鲨烯是甾醇环化的直接底物，一个环氧打开四环",
    classification: "角鲨烯的 2,3-环氧化物：C30 三萜烯加氧后的产物。",
    structure: "C30 烯链，C2–C3 处成环氧；质子化打开环氧，触发整条链的环化。",
    position: {
      title: "它在胆固醇合成 ch-11 生成、ch-12 被羊毛甾醇合酶环化，两步都在 ER",
      body:
        "ch-11 角鲨烯单加氧酶（SQLE）用 O₂ 与 NADPH 把角鲨烯转成 2,3-环氧角鲨烯 + H₂O + NADP⁺；ch-12 羊毛甾醇合酶（LSS）用 H⁺ 把它环化成羊毛甾醇。",
    },
    flow: {
      title: "它从角鲨烯加氧来，往羊毛甾醇去",
      body:
        "来路：ch-10 角鲨烯合酶把 2 FPP + NADPH 缩合成角鲨烯；ch-11 SQLE 在 C2–C3 加一个氧，生成 2,3-环氧角鲨烯。去向：ch-12 LSS 质子化环氧、启动环化，一次性收成四环的羊毛甾醇。",
    },
    significance: {
      title: "环氧是环化的开关",
      body:
        "没有这一步，C30 烯链无法收成甾醇骨架；SQLE 因此是甾醇合成上继 HMGCR 之后的又一个调控点。",
    },
    exam: {
      title: "考点是加氧与环化两步的酶",
      items: [
        "SQLE 用 O₂ 与 NADPH，产物是 2,3-环氧角鲨烯。",
        "LSS 只加 H⁺，不加氧；环化一步收成四环。",
        "角鲨烯是 C30 烯链，环氧化发生在 C2–C3。",
      ],
    },
    pathways: [
      { label: "胆固醇合成 ch-11：SQLE 产物", href: "/pathway/cholesterol?step=ch-11" },
      { label: "胆固醇合成 ch-12：LSS 底物", href: "/pathway/cholesterol?step=ch-12" },
    ],
    sources: [
      "cholesterol.json · steps[ch-11].equation / enzyme",
      "cholesterol.json · steps[ch-12].equation / enzyme",
      "Lehninger Principles of Biochemistry, 8e, Ch.21",
    ],
    bubble: { what: "C30 角鲨烯环氧化物", highlight: "四环环化的直接底物" },
  },

  pep: {
    id: "pep",
    name: "磷酸烯醇式丙酮酸",
    aliases: ["PEP", "phosphoenolpyruvate", "磷酸烯醇丙酮酸"],
    claim: "PEP 是糖酵解能量最高的磷酸化合物，第二次底物水平磷酸化靠它",
    classification: "烯醇磷酸酯：2-磷酸甘油酸脱水后的高能磷酸化合物。",
    structure: "烯醇磷酸酯，磷酸基与烯醇羟基成酐；水解势能高，足以把 ADP 磷酸化成 ATP。",
    position: {
      title: "它在 gk-9 生成、gk-10 被丙酮酸激酶消耗，也在 gn-2 生成",
      body:
        "gk-9 烯醇化酶把 2-磷酸甘油酸脱水成 PEP + H₂O；gk-10 丙酮酸激酶把 PEP + ADP + H⁺ 转成丙酮酸 + ATP；gn-2 PEP 羧激酶把草酰乙酸 + GTP 转成 PEP + GDP + CO₂。",
    },
    flow: {
      title: "它从 2-磷酸甘油酸与草酰乙酸来，往丙酮酸去",
      body:
        "来路：糖酵解 gk-9 脱水生成；糖异生 gn-2 由 PEP 羧激酶生成。去向：gk-10 丙酮酸激酶把它交给 ADP，生成 ATP 与丙酮酸，这是糖酵解第二个底物水平磷酸化。",
    },
    significance: {
      title: "PEP 是糖酵解净 ATP 转正的最后一站",
      body:
        "丙酮酸激酶把 PEP 的磷酸基转给 ADP，糖酵解净账在这里完成；氟化钠采血管抑制烯醇化酶，正是靠切断这一步阻止血样里的葡萄糖继续被消耗。",
    },
    exam: {
      title: "考点是烯醇化酶、氟抑制与两步绕行",
      items: [
        "PEP 由烯醇化酶脱水生成，氟离子抑制这一步。",
        "丙酮酸激酶是糖酵解最后一个不可逆步，产 ATP；糖异生要用丙酮酸羧化酶 + PEP 羧激酶两步绕开。",
        "PEP 羧激酶用 GTP，不是 ATP。",
      ],
    },
    pathways: [
      { label: "糖酵解 gk-9：烯醇化酶产物", href: "/pathway/glycolysis?step=gk-9" },
      { label: "糖酵解 gk-10：丙酮酸激酶底物", href: "/pathway/glycolysis?step=gk-10" },
      { label: "糖异生 gn-2：PEP 羧激酶产物", href: "/pathway/gluconeogenesis?step=gn-2" },
    ],
    sources: [
      "glycolysis.json · steps[gk-9].equation / significance",
      "glycolysis.json · steps[gk-10].equation / significance",
      "gluconeogenesis.json · steps[gn-2].equation",
      "Lehninger Principles of Biochemistry, 8e, Ch.14",
    ],
    bubble: { what: "烯醇磷酸酯", highlight: "糖酵解能量最高的磷酸化合物" },
  },

  phe: {
    id: "phe",
    name: "L-苯丙氨酸",
    aliases: ["Phe", "phenylalanine", "苯丙氨酸"],
    claim: "苯丙氨酸是必需芳香氨基酸，羟化成酪氨酸后才有下游",
    classification: "芳香族 α-氨基酸：侧链为苄基，属于非极性必需氨基酸。",
    structure: "侧链苯环；C4 羟化是它转入酪氨酸代谢的开关。",
    position: {
      title: "它在氨基酸代谢 aa-6 被苯丙氨酸羟化酶羟化",
      body:
        "aa-6 苯丙氨酸羟化酶在胞质用 BH₄ 与 O₂ 把 L-苯丙氨酸转成 L-酪氨酸 + BH₂ + H₂O。",
    },
    flow: {
      title: "它从蛋白质分解来，往酪氨酸与儿茶酚胺去",
      body:
        "来路：蛋白质分解释放。去向：aa-6 羟化成酪氨酸；酪氨酸再走向儿茶酚胺、甲状腺激素与黑色素。",
    },
    significance: {
      title: "苯丙氨酸羟化酶缺陷导致苯丙酮尿症",
      body:
        "苯丙氨酸羟化酶把苯丙氨酸转成酪氨酸，酶缺陷时苯丙氨酸与苯丙酮酸堆积；苯丙氨酸是必需氨基酸，患者对酪氨酸的需求上升。",
    },
    exam: {
      title: "考点是 BH₄、必需性与 PKU",
      items: [
        "苯丙氨酸羟化酶需要 BH₄ 与 O₂，产物是酪氨酸。",
        "苯丙氨酸是必需氨基酸；酪氨酸在 PKU 患者中成为条件必需。",
        "苯丙酮尿症由苯丙氨酸羟化酶缺陷引起，苯丙酮酸堆积。",
      ],
    },
    pathways: [
      { label: "氨基酸代谢 aa-6：苯丙氨酸羟化酶底物", href: "/pathway/amino-acids?step=aa-6" },
    ],
    sources: [
      "amino.json · steps[aa-6].equation / enzyme",
      "Lehninger Principles of Biochemistry, 8e, Ch.18",
    ],
    bubble: { what: "芳香族必需氨基酸", highlight: "羟化成酪氨酸的起点" },
  },

  pi: {
    id: "pi",
    name: "无机磷酸",
    aliases: ["Pi", "phosphate", "磷酸"],
    claim: "Pi 是磷酸化与磷酸解的公共磷酸库，糖原分解靠它而不是 ATP",
    classification: "无机磷酸：磷酸的游离形式，在代谢中作为磷酸基供体与产物。",
    structure: "游离磷酸；它既能被 ATP 合酶装进 ATP，也能在糖原磷酸化酶反应里直接攻击糖苷键。",
    position: {
      title: "它在 gly-1 作为底物，在 gly-4 与 fas-shuttle 作为产物",
      body:
        "gly-1 糖原磷酸化酶用 Pi 切开 α-1,4 键，生成 G1P；gly-4 葡萄糖-6-磷酸酶水解 G6P，产物含 Pi；fas-shuttle 的 ACLY 裂解柠檬酸，产物含 Pi。",
    },
    flow: {
      title: "它从水解与裂解反应来，往 G1P 与 ATP 合成去",
      body:
        "来路：G6P 水解（gly-4）、柠檬酸裂解（fas-shuttle）等反应释放 Pi。去向：糖原磷酸化酶把 Pi 装进 G1P（gly-1）；线粒体的 ATP 合酶也把 Pi 与 ADP 装成 ATP。",
    },
    significance: {
      title: "Pi 不是惰性副产物",
      body:
        "糖原分解用 Pi 直接磷酸解，省下 ATP；线粒体则用 Pi 与 ADP 合成 ATP。同一个磷酸库在两个方向上被反复使用。",
    },
    exam: {
      title: "考点是磷酸解与水解的区别",
      items: [
        "糖原磷酸化酶用 Pi 磷酸解，产物 G1P，不消耗 ATP。",
        "葡萄糖-6-磷酸酶是水解，产物是葡萄糖 + Pi。",
        "ATP 合酶把 ADP + Pi 装成 ATP，驱动力是质子梯度。",
      ],
    },
    pathways: [
      { label: "糖原分解 gly-1：磷酸化酶底物", href: "/pathway/glycogen?step=gly-1" },
      { label: "糖原分解 gly-4：G6Pase 产物", href: "/pathway/glycogen?step=gly-4" },
      { label: "脂肪酸合成 fas-shuttle：ACLY 产物", href: "/pathway/fatty-acid-synthesis?step=fas-shuttle" },
    ],
    sources: [
      "glycogen.json · steps[gly-1].equation",
      "glycogen.json · steps[gly-4].equation",
      "fas.json · steps[fas-shuttle].equation",
      "Lehninger Principles of Biochemistry, 8e, Ch.15 / Ch.19",
    ],
    bubble: { what: "无机磷酸，游离磷酸基", highlight: "磷酸解与 ATP 合成的公共库" },
  },

  ppi: {
    id: "ppi",
    name: "焦磷酸",
    aliases: ["PPi", "pyrophosphate", "焦磷酸"],
    claim: "PPi 是缩合与活化的副产物，水解把它变成不可逆",
    classification: "无机焦磷酸：两个磷酸经酐键相连。",
    structure: "两个磷酸以酐键相连；酐键水解放能，常把前面的合成反应拉成单向。",
    position: {
      title: "它在 gly-7、fao-act、urea-3 生成",
      body:
        "gly-7 UDP-葡萄糖焦磷酸化酶把 G1P + UTP 转成 UDP-葡萄糖 + PPi；fao-act 脂酰-CoA 合成酶把脂肪酸 + CoA-SH + ATP 转成脂酰-CoA + AMP + PPi；urea-3 精氨酸琥珀酸合成酶把瓜氨酸 + 天冬氨酸 + ATP 转成精氨酸琥珀酸 + AMP + PPi。",
    },
    flow: {
      title: "它从缩合与活化反应来，往 2 Pi 去",
      body:
        "来路：上述三步都把 PPi 作为副产物释放。去向：焦磷酸酶把 PPi 水解成 2 Pi，水解放能把反应拉向产物一侧，使脂肪酸活化实际消耗 2 个高能磷酸键。",
    },
    significance: {
      title: "PPi 水解是生物合成不可逆性的常见来源",
      body:
        "脂肪酸活化与尿素循环的天冬氨酸接入都释放 PPi；随后的水解把反应推向前，使这些步骤在生理条件下难以回退。",
    },
    exam: {
      title: "考点是 2 个高能键与三处释放",
      items: [
        "脂肪酸活化 ATP → AMP + PPi，PPi 再水解，合计 2 个高能磷酸键。",
        "UDP-葡萄糖生成时释放 PPi，推动糖原合成。",
        "urea-3 也释放 PPi，天冬氨酸的接入靠 ATP 活化。",
      ],
    },
    pathways: [
      { label: "糖原合成 gly-7：UDP-葡萄糖焦磷酸化酶", href: "/pathway/glycogen?step=gly-7" },
      { label: "β-氧化 fao-act：脂肪酸活化", href: "/pathway/fatty-acid-oxidation?step=fao-act" },
      { label: "尿素循环 urea-3：ASS 反应", href: "/pathway/urea-cycle?step=urea-3" },
    ],
    sources: [
      "glycogen.json · steps[gly-7].equation",
      "fao.json · steps[fao-act].equation / significance",
      "urea.json · steps[urea-3].equation",
      "Lehninger Principles of Biochemistry, 8e, Ch.17 / Ch.18",
    ],
    bubble: { what: "无机焦磷酸", highlight: "把合成反应拉成单向" },
  },

  pro: {
    id: "pro",
    name: "L-脯氨酸",
    aliases: ["Pro", "proline", "脯氨酸"],
    claim: "脯氨酸是侧链成环的亚氨基酸，也是胶原合成的限制因素",
    classification: "亚氨基酸：侧链与 α-氨基成吡咯烷环，属于非极性氨基酸。",
    structure: "吡咯烷环把 α-氨基包进环里，所以它没有游离的 α-氨基；羟化后才参与胶原。",
    position: {
      title: "挂图上它只作为氨基酸实体出现，没有独立步骤",
      body:
        "氨基酸代谢数据层的 7 个步骤里没有以脯氨酸为底物或产物的反应，它只在实体表中出现。教材章级定位：脯氨酸由谷氨酸经还原生成，分解又回到谷氨酸；胶原中的脯氨酸经脯氨酰羟化酶羟化成羟脯氨酸。",
    },
    flow: {
      title: "它从谷氨酸来，往羟脯氨酸与谷氨酸去",
      body:
        "来路：谷氨酸经谷氨酰磷酸、谷氨酸半醛还原成脯氨酸。去向：① 胶原中经脯氨酰羟化酶羟化成羟脯氨酸，稳定三螺旋；② 分解回谷氨酸，进入 TCA。",
    },
    significance: {
      title: "胶原三螺旋的稳定性依赖羟脯氨酸",
      body:
        "脯氨酰羟化酶需要维生素 C；缺乏时胶原羟化不足，三螺旋不稳，伤口愈合与血管强度都受影响。",
    },
    exam: {
      title: "考点是亚氨基酸、维生素 C 与胶原",
      items: [
        "脯氨酸是亚氨基酸，α-氨基在吡咯烷环内。",
        "脯氨酰羟化酶需要维生素 C 与 α-酮戊二酸，产物是羟脯氨酸。",
        "维生素 C 缺乏时胶原羟化不足，伤口愈合不良。",
      ],
    },
    pathways: [
      { label: "氨基酸代谢实体表中的脯氨酸", href: "/pathway/amino-acids" },
    ],
    sources: [
      "amino.json · entities[pro]（无独立反应步骤）",
      "Lehninger Principles of Biochemistry, 8e, Ch.18",
    ],
    bubble: { what: "侧链成环的亚氨基酸", highlight: "胶原三螺旋的稳定点" },
  },

  q: {
    id: "q",
    name: "泛醌",
    aliases: ["Q", "ubiquinone", "辅酶 Q"],
    claim: "泛醌是呼吸链的移动电子载体，把复合体 I、II 的电子交给复合体 III",
    classification: "脂溶性醌类：苯醌环带长异戊二烯侧链，能在膜内自由移动。",
    structure: "苯醌环可接受 2 电子与 2 质子变成泛醇；长疏水侧链把它锚在膜内并允许它在复合体间穿梭。",
    position: {
      title: "它在 oxphos-e 与 oxphos-f 作为产物，电子汇入 Q 池",
      body:
        "oxphos-e 复合体 I 把 NADH 的电子交给 Q 池，生成 QH₂；oxphos-f 复合体 II 把 FADH₂ 的电子也交给 Q 池。Q 池再把电子交给复合体 III。",
    },
    flow: {
      title: "它从复合体 I 与 II 接受电子来，往复合体 III 去",
      body:
        "来路：NADH 在复合体 I、FADH₂ 在复合体 II 把电子交给 Q，Q 被还原成 QH₂。去向：QH₂ 在复合体 III 被氧化，电子经细胞色素 c 传到复合体 IV。",
    },
    significance: {
      title: "Q 池是两条电子入口的汇合点",
      body:
        "复合体 I 泵质子，复合体 II 不泵，差别就体现在电子进入 Q 池的方式上；FADH₂ 的 ATP 当量因此低于 NADH。",
    },
    exam: {
      title: "考点是汇合点与复合体 II 不泵质子",
      items: [
        "NADH 与 FADH₂ 的电子都汇到 Q 池，再交给复合体 III。",
        "复合体 II 不泵质子，所以 FADH₂ 的 ATP 当量低于 NADH。",
        "泛醌在膜内可移动，不是固定在内膜上的蛋白。",
      ],
    },
    pathways: [
      { label: "氧化磷酸化 oxphos-e：复合体 I 电子出口", href: "/pathway/oxphos?step=oxphos-e" },
      { label: "氧化磷酸化 oxphos-f：复合体 II 电子出口", href: "/pathway/oxphos?step=oxphos-f" },
    ],
    sources: [
      "oxphos.json · steps[oxphos-e].products",
      "oxphos.json · steps[oxphos-f].products",
      "Lehninger Principles of Biochemistry, 8e, Ch.19",
    ],
    bubble: { what: "脂溶性醌类电子载体", highlight: "两条入口的汇合点" },
  },

  qh2: {
    id: "qh2",
    name: "泛醇",
    aliases: ["QH₂", "ubiquinol", "还原型辅酶 Q"],
    claim: "泛醇是泛醌的还原态，在复合体 III 把电子交给细胞色素 c",
    classification: "还原型泛醌：苯醌环带两个羟基。",
    structure: "苯醌环被还原成对苯二酚，带两个可交出的电子与质子；长疏水侧链仍锚在膜内。",
    position: {
      title: "数据层没有单独步骤，它作为 Q 池的还原态出现在 oxphos-e 与 oxphos-f 的产物侧",
      body:
        "oxphos.json 把复合体 I 与复合体 II 的电子出口都写成 Q（泛醌），QH₂ 是 Q 接受 2 电子与 2 质子后的还原态；数据层没有为 QH₂ → 复合体 III 单列步骤。教材章级定位：QH₂ 在复合体 III 的 Q 循环中被氧化，电子分两路交给细胞色素 c。",
    },
    flow: {
      title: "它从 Q 池还原来，往复合体 III 与细胞色素 c 去",
      body:
        "来路：复合体 I 与复合体 II 把电子交给 Q，Q 还原成 QH₂。去向：复合体 III 氧化 QH₂，电子经 Rieske 铁硫蛋白与细胞色素 c₁ 传给细胞色素 c，同时泵出质子。",
    },
    significance: {
      title: "QH₂ 是 Q 池的还原端",
      body:
        "复合体 III 的 Q 循环靠 QH₂ 把 2 个电子拆成两次单电子传递，同时把质子泵到膜间隙；这一步连接 Q 池与细胞色素 c。",
    },
    exam: {
      title: "考点是还原态身份与 Q 循环",
      items: [
        "QH₂ 是泛醌的还原态，不是另一种辅酶。",
        "复合体 III 氧化 QH₂，电子交给细胞色素 c。",
        "Q 循环把 2 电子分两步传，伴随质子泵出。",
      ],
    },
    pathways: [
      { label: "Q 池还原端（oxphos-e 产物侧）", href: "/pathway/oxphos?step=oxphos-e" },
      { label: "Q 池还原端（oxphos-f 产物侧）", href: "/pathway/oxphos?step=oxphos-f" },
    ],
    sources: [
      "oxphos.json · steps[oxphos-e] / steps[oxphos-f]（Q 池出口）",
      "Lehninger Principles of Biochemistry, 8e, Ch.19",
    ],
    bubble: { what: "还原型泛醌", highlight: "复合体 III 的电子供体" },
  },

  r5p: {
    id: "r5p",
    name: "核糖-5-磷酸",
    aliases: ["R5P", "ribose-5-phosphate", "核糖-5-磷酸"],
    claim: "R5P 是核苷酸合成的唯一糖骨架出口",
    classification: "五碳醛糖磷酸酯：核糖的 5 位羟基被磷酸化。",
    structure: "五碳醛糖磷酸酯；C1 是醛基，核苷酸合成时碱基接在这里。",
    position: {
      title: "它在 ppp-n1 生成、ppp-n3 作为转酮醇酶的受体",
      body:
        "ppp-n1 核糖-5-磷酸异构酶把核酮糖-5-磷酸转成 R5P；ppp-n3 转酮醇酶用木酮糖-5-磷酸 + R5P 生成 GAP + 景天庚酮糖-7-磷酸。",
    },
    flow: {
      title: "它从 Ru5P 异构来，往核苷酸与碳重排去",
      body:
        "来路：PPP 氧化相生成的 Ru5P 经 ppp-n1 异构化成 R5P。去向：① 作为嘌呤与嘧啶核苷酸从头合成与补救合成的糖骨架；② 经 ppp-n3 转酮醇酶进入非氧化相碳重排。",
    },
    significance: {
      title: "细胞分裂旺盛时 R5P 需求上升",
      body:
        "核苷酸合成要 R5P，PPP 的氧化相与非氧化相共同保证 R5P 与 NADPH 的供给；R5P 再经 PRPP 合成酶加上焦磷酸，才成为核苷酸合成的活化糖。",
    },
    exam: {
      title: "考点是醛糖身份、PRPP 与碳重排",
      items: [
        "R5P 由 Ru5P 经异构酶生成，是醛糖；Ru5P 是酮糖。",
        "核苷酸合成的糖骨架只有 R5P，PRPP 由它再加焦磷酸生成。",
        "PPP 非氧化相可以只产 R5P 而不产 NADPH，靠碳重排回补。",
      ],
    },
    pathways: [
      { label: "磷酸戊糖途径 ppp-n1：异构酶产物", href: "/pathway/ppp?step=ppp-n1" },
      { label: "磷酸戊糖途径 ppp-n3：转酮醇酶受体", href: "/pathway/ppp?step=ppp-n3" },
    ],
    sources: [
      "ppp.json · steps[ppp-n1].equation / significance",
      "ppp.json · steps[ppp-n3].equation / significance",
      "Lehninger Principles of Biochemistry, 8e, Ch.14 / Ch.22",
    ],
    bubble: { what: "五碳醛糖磷酸酯", highlight: "核苷酸合成的糖骨架" },
  },

  ru5p: {
    id: "ru5p",
    name: "核酮糖-5-磷酸",
    aliases: ["Ru5P", "ribulose-5-phosphate", "核酮糖-5-磷酸"],
    claim: "Ru5P 是磷酸戊糖途径氧化相的产物，也是非氧化相碳重排的共用池",
    classification: "五碳酮糖磷酸酯：C2 酮基，C3 手性可被差向异构化。",
    structure: "五碳酮糖磷酸酯；C3 的手性可被差向异构酶翻转，生成木酮糖-5-磷酸。",
    position: {
      title: "它在 ppp-o3 生成，在 ppp-n1 异构化、ppp-n2 差向异构化",
      body:
        "ppp-o3 6-磷酸葡糖酸脱氢酶氧化脱羧生成 Ru5P + CO₂ + NADPH；ppp-n1 核糖-5-磷酸异构酶把 Ru5P 转成 R5P；ppp-n2 核酮糖-5-磷酸 3-差向异构酶把 Ru5P 转成 Xu5P。",
    },
    flow: {
      title: "它从 6-磷酸葡糖酸脱羧来，往 R5P 与 Xu5P 去",
      body:
        "来路：PPP 氧化相 ppp-o3 脱羧生成。去向：① 经 ppp-n1 异构化成 R5P，供核苷酸合成；② 经 ppp-n2 差向异构化成 Xu5P，作为转酮醇酶的酮糖供体进入非氧化相。",
    },
    significance: {
      title: "Ru5P 是氧化相与非氧化相的交接池",
      body:
        "两条换手路都从 Ru5P 分出去，决定碳是留在五碳供核苷酸合成，还是重组回糖酵解中间物；它本身很少积累。",
    },
    exam: {
      title: "考点是酮糖身份与两种异构酶",
      items: [
        "Ru5P 是酮糖，R5P 是醛糖；ppp-n1 是异构酶，ppp-n2 是差向异构酶。",
        "PPP 氧化相每生成 1 Ru5P 伴 2 NADPH 与 1 CO₂（G6PD 与 6PGD 各产 1 NADPH）。",
        "在 PPP 的两条转酮反应里，Xu5P 是转酮醇酶使用的酮糖供体。",
      ],
    },
    pathways: [
      { label: "磷酸戊糖途径 ppp-o3：6PGD 产物", href: "/pathway/ppp?step=ppp-o3" },
      { label: "磷酸戊糖途径 ppp-n1：异构酶底物", href: "/pathway/ppp?step=ppp-n1" },
      { label: "磷酸戊糖途径 ppp-n2：差向异构酶底物", href: "/pathway/ppp?step=ppp-n2" },
    ],
    sources: [
      "ppp.json · steps[ppp-o3].equation",
      "ppp.json · steps[ppp-n1].equation",
      "ppp.json · steps[ppp-n2].equation / significance",
      "Lehninger Principles of Biochemistry, 8e, Ch.14",
    ],
    bubble: { what: "五碳酮糖磷酸酯", highlight: "氧化相与非氧化相的交接池" },
  },

  s7p: {
    id: "s7p",
    name: "景天庚酮糖-7-磷酸",
    aliases: ["S7P", "sedoheptulose-7-phosphate", "景天庚酮糖-7-磷酸"],
    claim: "S7P 是 PPP 非氧化相的七碳中转物，转醛醇酶在这里切三碳",
    classification: "七碳酮糖磷酸酯：PPP 碳重排的中间物。",
    structure: "七碳酮糖磷酸酯；转醛醇酶从它的 C3 侧剪下三碳单位交给 GAP。",
    position: {
      title: "它在 ppp-n3 生成、ppp-n4 被转醛醇酶切开",
      body:
        "ppp-n3 转酮醇酶用 Xu5P + R5P 生成 GAP + S7P；ppp-n4 转醛醇酶用 S7P + GAP 生成 E4P + F6P。",
    },
    flow: {
      title: "它从 Xu5P 与 R5P 的转酮反应来，往 E4P 与 F6P 去",
      body:
        "来路：ppp-n3 转酮醇酶把 Xu5P 的二碳羟乙酰基缝到 R5P 上，生成 S7P。去向：ppp-n4 转醛醇酶从 S7P 剪下三碳二羟丙酮基交给 GAP，生成 E4P 与 F6P。",
    },
    significance: {
      title: "S7P 是 PPP 把五碳重新拼回六碳与四碳的关键中转",
      body:
        "它不积累，随碳流被转醛醇酶切走；没有这一步，PPP 非氧化相无法把多余的五碳并回糖酵解中间物。",
    },
    exam: {
      title: "考点是碳数与两种酶的辅因子",
      items: [
        "S7P 是 C7，由 Xu5P（C5）与 R5P（C5）的转酮反应生成，净走 2C 给 R5P。",
        "转醛醇酶把 S7P 切成 E4P（C4）与三碳，三碳交给 GAP 生成 F6P。",
        "转酮醇酶用 TPP，转醛醇酶不用辅因子。",
      ],
    },
    pathways: [
      { label: "磷酸戊糖途径 ppp-n3：转酮醇酶产物", href: "/pathway/ppp?step=ppp-n3" },
      { label: "磷酸戊糖途径 ppp-n4：转醛醇酶底物", href: "/pathway/ppp?step=ppp-n4" },
    ],
    sources: [
      "ppp.json · steps[ppp-n3].equation",
      "ppp.json · steps[ppp-n4].equation / significance",
      "Lehninger Principles of Biochemistry, 8e, Ch.14",
    ],
    bubble: { what: "七碳酮糖磷酸酯", highlight: "转醛醇酶切三碳的底物" },
  },

  squalene: {
    id: "squalene",
    name: "角鲨烯",
    aliases: ["squalene", "角鲨烯"],
    claim: "角鲨烯是 C30 的线性三萜，甾醇四环骨架从它开始收",
    classification: "三萜烯：由两个 FPP 头对头连接成的 C30 烃。",
    structure: "C30 线性烯链，两端各有一个双键；环氧化后才有环化的起点。",
    position: {
      title: "它在胆固醇合成 ch-10 生成、ch-11 被环氧化，两步都在 ER",
      body:
        "ch-10 角鲨烯合酶用 2 FPP + NADPH + H⁺ 生成角鲨烯 + 2 PPi + NADP⁺；ch-11 角鲨烯单加氧酶用 O₂ + NADPH + H⁺ 把它转成 2,3-环氧角鲨烯 + H₂O + NADP⁺。",
    },
    flow: {
      title: "它从两分子 FPP 缩合来，往 2,3-环氧角鲨烯与羊毛甾醇去",
      body:
        "来路：ch-9 FPP 生成后，ch-10 角鲨烯合酶把两分子 FPP 头对头缩合成 C30 角鲨烯。去向：ch-11 环氧化成 2,3-环氧角鲨烯，再经 ch-12 环化成羊毛甾醇。",
    },
    significance: {
      title: "角鲨烯是甾醇合成的 C30 骨架起点",
      body:
        "它把 C15 的 FPP 二聚成一条可环化的单链；没有这一步，甾醇的四环骨架无从收拢。",
    },
    exam: {
      title: "考点是 NADPH、碳数与环氧化",
      items: [
        "角鲨烯合酶消耗 NADPH，缩合两分子 FPP 并释放 2 PPi。",
        "角鲨烯是 C30，羊毛甾醇也是 C30；变成胆固醇要三次去甲基成 C27。",
        "环氧化在 ch-11，由 SQLE 用 O₂ 与 NADPH 完成。",
      ],
    },
    pathways: [
      { label: "胆固醇合成 ch-10：角鲨烯合酶产物", href: "/pathway/cholesterol?step=ch-10" },
      { label: "胆固醇合成 ch-11：SQLE 底物", href: "/pathway/cholesterol?step=ch-11" },
    ],
    sources: [
      "cholesterol.json · steps[ch-10].equation / enzyme",
      "cholesterol.json · steps[ch-11].equation / enzyme",
      "Lehninger Principles of Biochemistry, 8e, Ch.21",
    ],
    bubble: { what: "C30 线性三萜烯", highlight: "甾醇骨架的收环起点" },
  },

  suc: {
    id: "suc",
    name: "琥珀酸",
    aliases: ["Suc", "succinate", "琥珀酸"],
    claim: "琥珀酸是 TCA 里唯一直接产 GTP 那一步的产物，也是复合体 II 的底物",
    classification: "四碳二羧酸：TCA 中间物，也是呼吸链复合体 II 的底物。",
    structure: "C4 二羧酸，两端各一个羧基；它被琥珀酸脱氢酶氧化成延胡索酸。",
    position: {
      title: "它在 tca-5 生成、tca-6 被琥珀酸脱氢酶氧化",
      body:
        "tca-5 琥珀酰-CoA 合成酶用 GDP + Pi 把琥珀酰-CoA 转成琥珀酸 + GTP + CoA-SH；tca-6 琥珀酸脱氢酶用 FAD 把琥珀酸氧化成延胡索酸 + FADH₂。",
    },
    flow: {
      title: "它从琥珀酰-CoA 来，往延胡索酸与复合体 II 去",
      body:
        "来路：tca-4 α-KG 脱氢酶复合体生成琥珀酰-CoA，tca-5 再把它转成琥珀酸并产 GTP。去向：tca-6 琥珀酸脱氢酶氧化成延胡索酸，FADH₂ 就地交给泛醌。",
    },
    significance: {
      title: "tca-5 产 GTP，tca-6 的酶就是复合体 II",
      body:
        "tca-5 是循环内唯一的底物水平磷酸化；tca-6 的琥珀酸脱氢酶嵌在内膜上，直接把 TCA 与电子传递链接上。",
    },
    exam: {
      title: "考点是 GTP、复合体 II 与不泵质子",
      items: [
        "tca-5 产 GTP，不产 ATP；这是循环内唯一的底物水平磷酸化。",
        "琥珀酸脱氢酶是 TCA 唯一嵌内膜的酶，等于复合体 II。",
        "复合体 II 不泵质子，FADH₂ 的 ATP 当量低于 NADH。",
      ],
    },
    pathways: [
      { label: "TCA tca-5：琥珀酰-CoA 合成酶产物", href: "/pathway/tca?step=tca-5" },
      { label: "TCA tca-6：琥珀酸脱氢酶底物", href: "/pathway/tca?step=tca-6" },
    ],
    sources: [
      "tca.json · steps[tca-5].equation / significance",
      "tca.json · steps[tca-6].equation / significance",
      "Lehninger Principles of Biochemistry, 8e, Ch.16 / Ch.19",
    ],
    bubble: { what: "四碳二羧酸", highlight: "复合体 II 的底物" },
  },

  succoa: {
    id: "succoa",
    name: "琥珀酰-CoA",
    aliases: ["succinyl-CoA", "琥珀酰辅酶 A"],
    claim: "琥珀酰-CoA 是高能硫酯，既产 GTP，也是血红素合成的碳出口",
    classification: "二羧酸单酰-CoA 硫酯：C4 的酰基与 CoA 的巯基成硫酯。",
    structure: "C4 酰基硫酯，硫酯键的酰基转移势能足以驱动 GDP 磷酸化。",
    position: {
      title: "它在 tca-4 生成、tca-5 被琥珀酰-CoA 合成酶消耗",
      body:
        "tca-4 α-KG 脱氢酶复合体把 α-酮戊二酸 + CoA-SH + NAD⁺ 转成琥珀酰-CoA + CO₂ + NADH；tca-5 琥珀酰-CoA 合成酶把琥珀酰-CoA + GDP + Pi 转成琥珀酸 + GTP + CoA-SH。",
    },
    flow: {
      title: "它从 α-酮戊二酸氧化脱羧来，往琥珀酸、GTP 与血红素去",
      body:
        "来路：tca-4 第二次氧化脱羧生成琥珀酰-CoA。去向：① tca-5 转成琥珀酸并产 GTP；② 与甘氨酸缩合启动血红素合成，是卟啉环的碳来源。",
    },
    significance: {
      title: "琥珀酰-CoA 把 TCA 与血红素合成接在一起",
      body:
        "它的硫酯能量被用来驱动 GTP 生成；同时它是血红素合成的起始碳骨架，TCA 与卟啉合成在这里交汇。",
    },
    exam: {
      title: "考点是 PDH 同型、GTP 与血红素起点",
      items: [
        "tca-4 与 PDH 同型，都需要 TPP、硫辛酸、CoA、FAD、NAD⁺。",
        "tca-5 用 GDP 而不是 ADP，产物是 GTP。",
        "琥珀酰-CoA + 甘氨酸是血红素合成的第一步。",
      ],
    },
    pathways: [
      { label: "TCA tca-4：α-KG 脱氢酶复合体产物", href: "/pathway/tca?step=tca-4" },
      { label: "TCA tca-5：琥珀酰-CoA 合成酶底物", href: "/pathway/tca?step=tca-5" },
    ],
    sources: [
      "tca.json · steps[tca-4].equation / significance",
      "tca.json · steps[tca-5].equation / significance",
      "Lehninger Principles of Biochemistry, 8e, Ch.16",
    ],
    bubble: { what: "C4 酰基硫酯", highlight: "GTP 与血红素的碳出口" },
  },

  thr: {
    id: "thr",
    name: "L-苏氨酸",
    aliases: ["Thr", "threonine", "苏氨酸"],
    claim: "苏氨酸是必需氨基酸，也是少数带两个手性中心的蛋白氨基酸",
    classification: "极性 α-氨基酸：侧链带羟基，属于必需氨基酸。",
    structure: "侧链为 1-羟乙基，α-碳与 β-碳都是手性中心；这是它与其他氨基酸区分开的结构特征。",
    position: {
      title: "挂图上它只作为氨基酸实体出现，没有独立步骤",
      body:
        "氨基酸代谢数据层的 7 个步骤里没有以苏氨酸为底物或产物的反应，它只在实体表中出现。教材章级定位：苏氨酸经苏氨酸脱水酶（EC 4.3.1.19）脱氨生成 α-酮丁酸，再氧化脱羧成丙酰-CoA，进入 TCA 或糖异生。",
    },
    flow: {
      title: "它从蛋白质分解来，往 α-酮丁酸与丙酰-CoA 去",
      body:
        "来路：蛋白质分解释放。去向：经苏氨酸脱水酶（EC 4.3.1.19）脱氨生成 α-酮丁酸，再经氧化脱羧生成丙酰-CoA；丙酰-CoA 可经甲基丙二酰-CoA 变位酶转成琥珀酰-CoA，进入 TCA。",
    },
    significance: {
      title: "苏氨酸的分解把丙酰-CoA 接入 TCA",
      body:
        "苏氨酸是必需氨基酸；丙酰-CoA 到琥珀酰-CoA 需要 B12 依赖的甲基丙二酰-CoA 变位酶，这一段与维生素 B12 代谢相关。",
    },
    exam: {
      title: "考点是两个手性中心与丙酰-CoA",
      items: [
        "苏氨酸和异亮氨酸都有两个手性中心，是蛋白氨基酸里的特例。",
        "苏氨酸是必需氨基酸，分解经 α-酮丁酸与丙酰-CoA。",
        "丙酰-CoA → 琥珀酰-CoA 需要 B12 依赖的甲基丙二酰-CoA 变位酶。",
      ],
    },
    pathways: [
      { label: "氨基酸代谢实体表中的苏氨酸", href: "/pathway/amino-acids" },
    ],
    sources: [
      "amino.json · entities[thr]（无独立反应步骤）",
      "Lehninger Principles of Biochemistry, 8e, Ch.18",
    ],
    bubble: { what: "带羟基的必需氨基酸", highlight: "两个手性中心的特例" },
  },

  trp: {
    id: "trp",
    name: "L-色氨酸",
    aliases: ["Trp", "tryptophan", "色氨酸"],
    claim: "色氨酸是最大的必需氨基酸，也是 5-羟色胺的前体",
    classification: "芳香族 α-氨基酸：侧链为吲哚环，属于必需氨基酸。",
    structure: "侧链吲哚环，是蛋白氨基酸里最大的侧链；吲哚环是 5-羟色胺与褪黑素的功能基团。",
    position: {
      title: "挂图上它只作为氨基酸实体出现，没有独立步骤",
      body:
        "氨基酸代谢数据层的 7 个步骤里没有以色氨酸为底物或产物的反应，它只在实体表中出现。教材章级定位：色氨酸经羟化与脱羧生成 5-羟色胺；分解代谢经犬尿氨酸途径，部分碳可进入 NAD⁺ 合成。",
    },
    flow: {
      title: "它从蛋白质分解来，往 5-羟色胺、犬尿氨酸与 NAD⁺ 去",
      body:
        "来路：蛋白质分解释放。去向：① 经色氨酸羟化酶与脱羧酶生成 5-羟色胺；② 经犬尿氨酸途径分解；③ 部分碳进入 NAD⁺ 的从头合成，因此色氨酸能贡献烟酸当量。",
    },
    significance: {
      title: "色氨酸既是神经递质前体，也贡献 NAD⁺ 合成",
      body:
        "色氨酸是必需氨基酸，5-羟色胺的合成以它为起点；它的分解途径还与 NAD⁺ 的从头合成相连，是少数能替代部分烟酸的氨基酸。",
    },
    exam: {
      title: "考点是必需性、5-羟色胺与犬尿氨酸",
      items: [
        "色氨酸是必需氨基酸，也是 5-羟色胺的前体。",
        "色氨酸羟化酶是 5-羟色胺合成的限速步，需要 BH₄ 与 O₂。",
        "色氨酸分解经犬尿氨酸途径，可贡献 NAD⁺ 合成。",
      ],
    },
    pathways: [
      { label: "氨基酸代谢实体表中的色氨酸", href: "/pathway/amino-acids" },
    ],
    sources: [
      "amino.json · entities[trp]（无独立反应步骤）",
      "Lehninger Principles of Biochemistry, 8e, Ch.18 / Ch.22",
    ],
    bubble: { what: "带吲哚环的必需氨基酸", highlight: "5-羟色胺的前体" },
  },

  tyr: {
    id: "tyr",
    name: "L-酪氨酸",
    aliases: ["Tyr", "tyrosine", "酪氨酸"],
    claim: "酪氨酸是苯丙氨酸的下游产物，也是儿茶酚胺与甲状腺激素的起点",
    classification: "芳香族 α-氨基酸：侧链为对羟基苄基，属于极性氨基酸。",
    structure: "侧链苯环带对位羟基；这个羟基是酪氨酸酶与酪氨酸羟化酶的作用位点。",
    position: {
      title: "它在氨基酸代谢 aa-6 由苯丙氨酸羟化生成",
      body:
        "aa-6 苯丙氨酸羟化酶在胞质用 BH₄ 与 O₂ 把 L-苯丙氨酸转成 L-酪氨酸 + BH₂ + H₂O。",
    },
    flow: {
      title: "它从苯丙氨酸羟化来，往儿茶酚胺、甲状腺激素与黑色素去",
      body:
        "来路：aa-6 苯丙氨酸羟化生成；蛋白质分解也释放酪氨酸。去向：① 经酪氨酸羟化酶与脱羧生成多巴、多巴胺、去甲肾上腺素与肾上腺素；② 经酪氨酸酶生成黑色素；③ 碘化后生成甲状腺激素。",
    },
    significance: {
      title: "酪氨酸的三条下游分别对应神经递质、色素与甲状腺",
      body:
        "酪氨酸是 PKU 患者的条件必需氨基酸；酪氨酸羟化酶决定儿茶酚胺合成，酪氨酸酶决定黑色素合成。",
    },
    exam: {
      title: "考点是条件必需、羟化酶与白化病",
      items: [
        "酪氨酸不是必需氨基酸，但在 PKU 患者中成为条件必需。",
        "酪氨酸羟化酶是儿茶酚胺合成的限速步，需要 BH₄ 与 O₂。",
        "酪氨酸酶缺陷导致白化病；缺碘影响甲状腺激素合成。",
      ],
    },
    pathways: [
      { label: "氨基酸代谢 aa-6：苯丙氨酸羟化酶产物", href: "/pathway/amino-acids?step=aa-6" },
    ],
    sources: [
      "amino.json · steps[aa-6].equation / enzyme",
      "Lehninger Principles of Biochemistry, 8e, Ch.18",
    ],
    bubble: { what: "带对羟基的芳香氨基酸", highlight: "儿茶酚胺与甲状腺激素起点" },
  },

  udp: {
    id: "udp",
    name: "尿苷二磷酸",
    aliases: ["UDP", "uridine diphosphate", "尿苷二磷酸"],
    claim: "UDP 是糖原合酶反应的离去基团，糖原合成在它离开时完成",
    classification: "尿苷二磷酸：尿苷与两个磷酸相连的核苷二磷酸。",
    structure: "尿苷通过磷酸连到二磷酸；糖原合酶把 UDP-葡萄糖的葡萄糖转到糖原上时，UDP 作为离去基团释放。",
    position: {
      title: "它在糖原合成 gly-8 作为产物",
      body:
        "gly-8 糖原合酶把 UDP-葡萄糖 + (α-1,4-糖原)ₙ 转成 (α-1,4-糖原)ₙ₊₁ + UDP。",
    },
    flow: {
      title: "它从 UDP-葡萄糖的转糖反应来，往 UTP 再生成去",
      body:
        "来路：gly-7 UDP-葡萄糖焦磷酸化酶生成 UDP-葡萄糖，gly-8 糖原合酶把葡萄糖转到糖原上，释放 UDP。去向：UDP 可经核苷二磷酸激酶转成 UTP，再回到 gly-7 参与下一轮。",
    },
    significance: {
      title: "UDP 的释放说明糖原合酶用的是活化糖",
      body:
        "糖原合酶不接受游离葡萄糖或 G1P，只接受 UDP-葡萄糖；UDP 离开后，糖原链才延长一个残基。",
    },
    exam: {
      title: "考点是底物与 UTP/UDP 互换",
      items: [
        "糖原合酶的底物是 UDP-葡萄糖，不是 G1P 或葡萄糖。",
        "gly-7 用 UTP，gly-8 释放 UDP；UTP 与 UDP 在核苷二磷酸激酶处互换。",
        "糖原合成的能量代价体现在 UTP → PPi 这一步。",
      ],
    },
    pathways: [
      { label: "糖原合成 gly-8：糖原合酶产物", href: "/pathway/glycogen?step=gly-8" },
      { label: "糖原合成 gly-7：UTP 参与", href: "/pathway/glycogen?step=gly-7" },
    ],
    sources: [
      "glycogen.json · steps[gly-8].equation",
      "glycogen.json · steps[gly-7].equation",
      "Lehninger Principles of Biochemistry, 8e, Ch.15",
    ],
    bubble: { what: "尿苷二磷酸", highlight: "糖原合酶的离去基团" },
  },

  "udp-glucose": {
    id: "udp-glucose",
    name: "UDP-葡萄糖",
    aliases: ["UDP-glucose", "UDPG", "UDP-葡萄糖"],
    claim: "UDP-葡萄糖是糖原合成的活化糖供体",
    classification: "核苷二磷酸糖：葡萄糖的 C1 与 UDP 成糖苷键。",
    structure: "葡萄糖 C1 与 UDP 相连；这个键的断裂能给糖原合酶提供转糖势能。",
    position: {
      title: "它在 gly-7 生成、gly-8 被糖原合酶消耗",
      body:
        "gly-7 UDP-葡萄糖焦磷酸化酶把 G1P + UTP ⇌ UDP-葡萄糖 + PPi；gly-8 糖原合酶把 UDP-葡萄糖的葡萄糖转到糖原非还原端，释放 UDP。",
    },
    flow: {
      title: "它从 G1P 与 UTP 来，往糖原与 UDP 去",
      body:
        "来路：糖原分解或糖异生产生的 G1P 经 gly-7 与 UTP 反应生成 UDP-葡萄糖。去向：gly-8 把葡萄糖残基加到糖原 α-1,4 链上；UDP 释放后可再转成 UTP。",
    },
    significance: {
      title: "糖原合成必须先花 UTP 把葡萄糖活化",
      body:
        "gly-7 释放 PPi，随后的水解释放能量，把反应拉向 UDP-葡萄糖；糖原合酶才有可用的活化糖。",
    },
    exam: {
      title: "考点是 G1P + UTP、PPi 与分支酶",
      items: [
        "UDP-葡萄糖由 G1P + UTP 生成，释放 PPi。",
        "糖原合酶只延长 α-1,4 链，分支由分支酶另造。",
        "糖原合成的活化代价是 UTP，不是 ATP 直接加葡萄糖。",
      ],
    },
    pathways: [
      { label: "糖原合成 gly-7：UDP-葡萄糖焦磷酸化酶产物", href: "/pathway/glycogen?step=gly-7" },
      { label: "糖原合成 gly-8：糖原合酶底物", href: "/pathway/glycogen?step=gly-8" },
    ],
    sources: [
      "glycogen.json · steps[gly-7].equation",
      "glycogen.json · steps[gly-8].equation",
      "Lehninger Principles of Biochemistry, 8e, Ch.15",
    ],
    bubble: { what: "核苷二磷酸糖", highlight: "糖原合成的活化糖供体" },
  },

  "urea-arg": {
    id: "urea-arg",
    name: "L-精氨酸",
    aliases: ["Arg", "arginine", "精氨酸"],
    claim: "精氨酸是尿素循环的收口底物，水解后释放尿素并再生鸟氨酸",
    classification: "碱性 α-氨基酸：侧链带胍基，是蛋白氨基酸。",
    structure: "侧链胍基带三个氮；其中两个最终进入尿素，一个随鸟氨酸保留。",
    position: {
      title: "它在 urea-4 生成、urea-5 被精氨酸酶水解",
      body:
        "urea-4 精氨酸琥珀酸裂解酶把精氨酸琥珀酸转成 L-精氨酸 + 延胡索酸；urea-5 精氨酸酶 1 把 L-精氨酸 + H₂O 转成尿素 + 鸟氨酸。",
    },
    flow: {
      title: "它从精氨酸琥珀酸裂解来，往尿素与鸟氨酸去",
      body:
        "来路：urea-3 ASS 把瓜氨酸与天冬氨酸缩合成精氨酸琥珀酸，urea-4 ASL 再裂解出精氨酸与延胡索酸。去向：urea-5 ARG1 水解释放尿素，同时再生鸟氨酸；鸟氨酸经 ORNT1 回线粒体，闭环回到 OTC。",
    },
    significance: {
      title: "精氨酸酶是尿素循环的收口",
      body:
        "尿素的两个氮在这里被装进同一个分子，肝再把尿素释放入血；精氨酸同时是合成尿素与再生鸟氨酸的枢纽。",
    },
    exam: {
      title: "考点是两个氮、精氨酸酶与闭环入口",
      items: [
        "尿素的两个氮一个来自 NH₃，一个来自天冬氨酸的 α-氨基。",
        "精氨酸酶水解精氨酸，产物是尿素 + 鸟氨酸，不是瓜氨酸。",
        "鸟氨酸循环不是回到 CPS1，而是回到 OTC。",
      ],
    },
    pathways: [
      { label: "尿素循环 urea-4：ASL 产物", href: "/pathway/urea-cycle?step=urea-4" },
      { label: "尿素循环 urea-5：精氨酸酶底物", href: "/pathway/urea-cycle?step=urea-5" },
    ],
    sources: [
      "urea.json · steps[urea-4].equation",
      "urea.json · steps[urea-5].equation / significance",
      "Lehninger Principles of Biochemistry, 8e, Ch.18",
    ],
    bubble: { what: "带胍基的碱性氨基酸", highlight: "尿素循环的收口底物" },
  },

  "urea-as1": {
    id: "urea-as1",
    name: "精氨酸琥珀酸",
    aliases: ["argininosuccinate", "精氨酸琥珀酸", "精氨酸代琥珀酸"],
    claim: "精氨酸琥珀酸是尿素循环第二个氮的接入点，裂解后分出延胡索酸",
    classification: "瓜氨酸与天冬氨酸的缩合产物：带琥珀酸骨架的氨基酸衍生物。",
    structure: "瓜氨酸的脲基与天冬氨酸的氨基缩合成精氨酸琥珀酸；分子同时带精氨酸端与琥珀酸端。",
    position: {
      title: "它在 urea-3 生成、urea-4 被裂解",
      body:
        "urea-3 精氨酸琥珀酸合成酶用瓜氨酸 + L-天冬氨酸 + ATP 生成精氨酸琥珀酸 + AMP + PPi；urea-4 精氨酸琥珀酸裂解酶把它转成 L-精氨酸 + 延胡索酸。",
    },
    flow: {
      title: "它从瓜氨酸与天冬氨酸缩合来，往精氨酸与延胡索酸去",
      body:
        "来路：urea-3 ASS 把第二个氮从天冬氨酸接入。去向：urea-4 ASL 裂解，精氨酸端继续走 urea-5 释放尿素，琥珀酸端以延胡索酸出环进入 TCA。",
    },
    significance: {
      title: "这一步同时完成接氮与碳骨架分流",
      body:
        "延胡索酸出环后经 TCA 回到草酰乙酸，再转氨成天冬氨酸；正因为碳骨架能回流，尿素循环才不必净消耗天冬氨酸。",
    },
    exam: {
      title: "考点是 ATP → AMP + PPi 与裂解产物",
      items: [
        "urea-3 消耗 ATP，产物是 AMP + PPi，不是 ADP + Pi。",
        "urea-4 裂解出精氨酸与延胡索酸，不产生尿素。",
        "延胡索酸经 TCA 回到草酰乙酸，AST 转氨再生天冬氨酸。",
      ],
    },
    pathways: [
      { label: "尿素循环 urea-3：ASS 产物", href: "/pathway/urea-cycle?step=urea-3" },
      { label: "尿素循环 urea-4：ASL 底物", href: "/pathway/urea-cycle?step=urea-4" },
    ],
    sources: [
      "urea.json · steps[urea-3].equation / significance",
      "urea.json · steps[urea-4].equation / significance",
      "Lehninger Principles of Biochemistry, 8e, Ch.18",
    ],
    bubble: { what: "瓜氨酸与天冬氨酸的缩合物", highlight: "第二个氮的接入点" },
  },

  "urea-asp": {
    id: "urea-asp",
    name: "L-天冬氨酸",
    aliases: ["Asp", "aspartate", "天冬氨酸"],
    claim: "天冬氨酸是尿素循环的第二个氮源，碳骨架由 TCA 回流再生",
    classification: "酸性 α-氨基酸：侧链带羧基，属于蛋白氨基酸。",
    structure: "侧链羧基使它带负电；α-氨基在 ASS 步交给瓜氨酸，成为尿素的第二个氮。",
    position: {
      title: "它在 aa-2 被转氨，在 urea-3 作为底物",
      body:
        "aa-2 天冬氨酸氨基转移酶把 L-天冬氨酸 + α-酮戊二酸转成草酰乙酸 + 谷氨酸；urea-3 精氨酸琥珀酸合成酶把瓜氨酸 + L-天冬氨酸 + ATP 转成精氨酸琥珀酸 + AMP + PPi。",
    },
    flow: {
      title: "它从草酰乙酸转氨来，往精氨酸琥珀酸与尿素去",
      body:
        "来路：TCA 的草酰乙酸经 AST 转氨生成天冬氨酸（aa-2）。去向：urea-3 把 α-氨基交给瓜氨酸，生成精氨酸琥珀酸；该氮最终进入尿素，碳骨架以延胡索酸回 TCA。",
    },
    significance: {
      title: "它把尿素循环与 TCA 的碳骨架回流接在一起",
      body:
        "天冬氨酸是尿素第二个氮的载体；尿素循环每转一圈消耗一个天冬氨酸，又靠 TCA 与 AST 把它再生回来，才不必净消耗。",
    },
    exam: {
      title: "考点是 α-氨基、AST 与碳回流",
      items: [
        "天冬氨酸提供的是 α-氨基，不是酰胺氮；第二个氮由此接入。",
        "AST 把天冬氨酸与草酰乙酸互变，谷氨酸与 α-酮戊二酸是另一对。",
        "延胡索酸经 TCA 回到草酰乙酸，AST 转氨再生天冬氨酸，循环不必净消耗它。",
      ],
    },
    pathways: [
      { label: "氨基酸代谢 aa-2：AST 底物", href: "/pathway/amino-acids?step=aa-2" },
      { label: "尿素循环 urea-3：第二个氮接入", href: "/pathway/urea-cycle?step=urea-3" },
    ],
    sources: [
      "amino.json · steps[aa-2].equation",
      "urea.json · steps[urea-3].equation / significance",
      "Lehninger Principles of Biochemistry, 8e, Ch.18",
    ],
    bubble: { what: "酸性氨基酸，氮源 B", highlight: "尿素第二个氮的载体" },
  },

  "urea-cap": {
    id: "urea-cap",
    name: "氨甲酰磷酸",
    aliases: ["carbamoyl phosphate", "氨甲酰磷酸", "氨基甲酰磷酸"],
    claim: "氨甲酰磷酸是尿素循环的进环产物，也是 OTC 的底物",
    classification: "氨甲酰磷酸：氨甲酰基与磷酸相连的混合酐。",
    structure: "氨甲酰基与磷酸成酐；这个高能键让氨甲酰基能转移给鸟氨酸。",
    position: {
      title: "它在 urea-1 生成、urea-2 被 OTC 消耗，两步都在线粒体基质",
      body:
        "urea-1 氨甲酰磷酸合成酶 I 用 NH₃ + HCO₃⁻ + 2 ATP 生成氨甲酰磷酸 + 2 ADP + Pi；urea-2 鸟氨酸氨甲酰转移酶把氨甲酰磷酸 + 鸟氨酸转成瓜氨酸 + Pi。",
    },
    flow: {
      title: "它从 NH₃ 与 HCO₃⁻ 来，往瓜氨酸去",
      body:
        "来路：CPS1 在线粒体基质把第一个氮与羰基碳装成氨甲酰磷酸；N-乙酰谷氨酸是必需变构激活剂。去向：urea-2 OTC 把氨甲酰基交给鸟氨酸，生成瓜氨酸与 Pi。",
    },
    significance: {
      title: "它是尿素循环真正进环的第一步产物",
      body:
        "CPS1 的活性由 N-乙酰谷氨酸调控，把氨负荷与尿素合成速率接上；氨甲酰磷酸一生成，氮就已经被固定住。",
    },
    exam: {
      title: "考点是 2 ATP、NAG 与 OTC 不耗能",
      items: [
        "CPS1 消耗 2 ATP，产物是氨甲酰磷酸，不是尿素。",
        "N-乙酰谷氨酸是 CPS1 的必需变构激活剂。",
        "OTC 把氨甲酰基交给鸟氨酸，生成瓜氨酸，不消耗 ATP。",
      ],
    },
    pathways: [
      { label: "尿素循环 urea-1：CPS1 产物", href: "/pathway/urea-cycle?step=urea-1" },
      { label: "尿素循环 urea-2：OTC 底物", href: "/pathway/urea-cycle?step=urea-2" },
    ],
    sources: [
      "urea.json · steps[urea-1].equation / significance",
      "urea.json · steps[urea-2].equation",
      "Lehninger Principles of Biochemistry, 8e, Ch.18",
    ],
    bubble: { what: "氨甲酰基磷酸酐", highlight: "尿素循环的进环产物" },
  },

  "urea-cit": {
    id: "urea-cit",
    name: "瓜氨酸",
    aliases: ["citrulline", "瓜氨酸"],
    claim: "瓜氨酸是尿素循环的跨膜载体，把氨甲酰基带出线粒体",
    classification: "尿素循环的 α-氨基酸中间物：带脲基的六碳氨基酸。",
    structure: "瓜氨酸的脲基含 2 个氮；它把线粒体内装好的氨甲酰基带到胞质。",
    position: {
      title: "它在 urea-2 生成、urea-3 被 ASS 消耗",
      body:
        "urea-2 OTC 在线粒体基质把氨甲酰磷酸 + 鸟氨酸转成瓜氨酸 + Pi；urea-3 精氨酸琥珀酸合成酶在胞质把瓜氨酸 + 天冬氨酸 + ATP 转成精氨酸琥珀酸 + AMP + PPi。",
    },
    flow: {
      title: "它从氨甲酰磷酸与鸟氨酸来，往精氨酸琥珀酸去",
      body:
        "来路：urea-2 OTC 把氨甲酰基交给鸟氨酸生成瓜氨酸。去向：瓜氨酸经转运出线粒体进入胞质，在 urea-3 接入第二个氮，生成精氨酸琥珀酸。",
    },
    significance: {
      title: "瓜氨酸是循环的跨区室载体",
      body:
        "它把线粒体内的氨带出来，再把第二个氮接上；瓜氨酸与鸟氨酸的反向转运只换区室，不改变分子。",
    },
    exam: {
      title: "考点是两个隔室与载体氮",
      items: [
        "OTC 在线粒体，ASS 在胞质；瓜氨酸是两者之间的载体。",
        "瓜氨酸的脲基两个氮：一个来自鸟氨酸的 δ-氨基（载体），一个来自 CPS1 固定的 NH₃（净氮输入）。",
        "瓜氨酸 + 天冬氨酸 + ATP 生成精氨酸琥珀酸，消耗 ATP。",
      ],
    },
    pathways: [
      { label: "尿素循环 urea-2：OTC 产物", href: "/pathway/urea-cycle?step=urea-2" },
      { label: "尿素循环 urea-3：ASS 底物", href: "/pathway/urea-cycle?step=urea-3" },
    ],
    sources: [
      "urea.json · steps[urea-2].equation / significance",
      "urea.json · steps[urea-3].equation",
      "Lehninger Principles of Biochemistry, 8e, Ch.18",
    ],
    bubble: { what: "带脲基的氨基酸中间物", highlight: "跨线粒体膜的载体" },
  },

  "urea-nh3": {
    id: "urea-nh3",
    name: "氨（游离 NH₃）",
    aliases: ["NH₃", "ammonia", "游离氨"],
    claim: "游离 NH₃ 是尿素循环的第一个氮源，进入氨甲酰磷酸",
    classification: "无机小分子：氨的未质子化形式，是尿素第一个氮的来源。",
    structure: "小分子气体；在 CPS1 反应里以 NH₃ 形式与 HCO₃⁻ 一起装进氨甲酰磷酸。",
    position: {
      title: "它在尿素循环 urea-1 作为底物，位置在线粒体基质",
      body:
        "urea-1 氨甲酰磷酸合成酶 I 把 NH₃ + HCO₃⁻ + 2 ATP 转成氨甲酰磷酸 + 2 ADP + Pi；这一步的氮成为尿素两个氮中的一个。",
    },
    flow: {
      title: "它从氨基酸脱氨与肠道吸收来，往氨甲酰磷酸与尿素去",
      body:
        "来路：外周氨基酸脱氨产生的氨经谷氨酰胺或丙氨酸运到肝，肠道吸收的氨也经门静脉入肝。去向：CPS1 把它装成氨甲酰磷酸，最终在 urea-5 以尿素形式排出。",
    },
    significance: {
      title: "游离氨是尿素循环的入口底物",
      body:
        "肝把氨装成尿素，避免血氨升高；尿素的两个氮里，一个就从这一步进入。",
    },
    exam: {
      title: "考点是两个氮来源与 NAG",
      items: [
        "尿素的两个氮：一个来自 NH₃，一个来自天冬氨酸 α-氨基。",
        "CPS1 在线粒体基质，用 NH₃ 而不是 NH₄⁺ 写进方程。",
        "N-乙酰谷氨酸是 CPS1 的必需激活剂；精氨酸促进 NAG 生成。",
      ],
    },
    pathways: [
      { label: "尿素循环 urea-1：CPS1 底物", href: "/pathway/urea-cycle?step=urea-1" },
      { label: "尿素循环 urea-5：尿素释放", href: "/pathway/urea-cycle?step=urea-5" },
    ],
    sources: [
      "urea.json · steps[urea-1].equation / significance",
      "urea.json · steps[urea-5].equation",
      "Lehninger Principles of Biochemistry, 8e, Ch.18",
    ],
    bubble: { what: "氨的未质子化形式", highlight: "尿素第一个氮的来源" },
  },

  "urea-orn": {
    id: "urea-orn",
    name: "鸟氨酸",
    aliases: ["ornithine", "鸟氨酸"],
    claim: "鸟氨酸是尿素循环的 C5 载体，碳骨架净不变",
    classification: "非蛋白 α-氨基酸：尿素循环的载体分子，不进入蛋白质。",
    structure: "C5 氨基酸，δ-氨基是载体氮；它与瓜氨酸、精氨酸互变，碳骨架净不变。",
    position: {
      title: "它在 urea-2 作为底物、urea-5 作为产物",
      body:
        "urea-2 OTC 在线粒体基质把氨甲酰磷酸 + 鸟氨酸转成瓜氨酸 + Pi；urea-5 精氨酸酶 1 在胞质把 L-精氨酸 + H₂O 转成尿素 + 鸟氨酸。",
    },
    flow: {
      title: "它从精氨酸水解来，往瓜氨酸去",
      body:
        "来路：urea-5 ARG1 水解精氨酸生成鸟氨酸。去向：鸟氨酸经 ORNT1 回线粒体基质，在 urea-2 被 OTC 消耗，生成瓜氨酸；闭环回到 OTC 而不是 CPS1。",
    },
    significance: {
      title: "鸟氨酸是循环的载体，不贡献净氮",
      body:
        "它的碳骨架在循环里反复使用，所以尿素循环也叫鸟氨酸循环；鸟氨酸的 δ-氨基只是载体氮。",
    },
    exam: {
      title: "考点是非蛋白身份与闭环入口",
      items: [
        "鸟氨酸不是蛋白质氨基酸；它是尿素循环的载体。",
        "鸟氨酸的 δ-氨基变成瓜氨酸脲基中的一个氮，但不是尿素的净氮来源。",
        "闭环回到 OTC，不是回到 CPS1；ORNT1 负责鸟氨酸回线粒体。",
      ],
    },
    pathways: [
      { label: "尿素循环 urea-2：OTC 底物", href: "/pathway/urea-cycle?step=urea-2" },
      { label: "尿素循环 urea-5：精氨酸酶产物", href: "/pathway/urea-cycle?step=urea-5" },
    ],
    sources: [
      "urea.json · steps[urea-2].equation / significance",
      "urea.json · steps[urea-5].equation / significance",
      "Lehninger Principles of Biochemistry, 8e, Ch.18",
    ],
    bubble: { what: "尿素循环的 C5 载体", highlight: "碳骨架净不变" },
  },

  utp: {
    id: "utp",
    name: "尿苷三磷酸",
    aliases: ["UTP", "uridine triphosphate", "尿苷三磷酸"],
    claim: "UTP 是糖原合成的活化能源，把葡萄糖装成 UDP-葡萄糖",
    classification: "尿苷三磷酸：尿苷与三个磷酸相连的核苷三磷酸。",
    structure: "三磷酸链带负电；UTP 的 β、γ 磷酸以 PPi 离去，只有 α-磷酸随尿苷进入 UDP-葡萄糖。",
    position: {
      title: "它在糖原合成 gly-7 作为底物",
      body:
        "gly-7 UDP-葡萄糖焦磷酸化酶把 G1P + UTP ⇌ UDP-葡萄糖 + PPi；UTP 在这里提供尿苷二磷酸部分，同时把 PPi 释放出去。",
    },
    flow: {
      title: "它从 UDP 与 ATP 来，往 UDP-葡萄糖与 PPi 去",
      body:
        "来路：UDP 经核苷二磷酸激酶用 ATP 磷酸化成 UTP。去向：gly-7 把 UTP 与 G1P 转成 UDP-葡萄糖 + PPi，UDP-葡萄糖再供糖原合酶使用。",
    },
    significance: {
      title: "糖原合成要先花 UTP 活化葡萄糖",
      body:
        "PPi 随后水解，把反应拉向 UDP-葡萄糖一侧；UTP 在糖原合成中充当活化能源，而不是直接供能给糖原合酶。",
    },
    exam: {
      title: "考点是 UTP 而非 ATP、以及 UTP/UDP 循环",
      items: [
        "gly-7 用 UTP，不是 ATP；产物是 UDP-葡萄糖 + PPi。",
        "UTP 由 UDP 经核苷二磷酸激酶生成，可循环使用。",
        "糖原合酶步骤本身释放 UDP，不再消耗核苷酸。",
      ],
    },
    pathways: [
      { label: "糖原合成 gly-7：UTP 底物", href: "/pathway/glycogen?step=gly-7" },
    ],
    sources: [
      "glycogen.json · steps[gly-7].equation",
      "Lehninger Principles of Biochemistry, 8e, Ch.15",
    ],
    bubble: { what: "尿苷三磷酸", highlight: "糖原合成的活化能源" },
  },

  val: {
    id: "val",
    name: "L-缬氨酸",
    aliases: ["Val", "valine", "缬氨酸"],
    claim: "缬氨酸是只生糖的支链必需氨基酸，碳骨架最终进琥珀酰-CoA",
    classification: "支链 α-氨基酸：侧链为异丙基，属于必需氨基酸。",
    structure: "侧链为异丙基，α-碳带一个手性中心；支链结构使它先经支链氨基转移。",
    position: {
      title: "它只在 aa-5 的支链转氨里被点名，没有单独的步骤",
      body:
        "aa-5 支链氨基转移酶 2 在线粒体把 L-亮氨酸（/ Ile / Val）+ α-酮戊二酸转成相应 α-酮酸 + 谷氨酸；缬氨酸在方程里与亮氨酸、异亮氨酸并列，数据层没有为它单列反应。",
    },
    flow: {
      title: "它从蛋白质分解来，往相应 α-酮酸与琥珀酰-CoA 去",
      body:
        "来路：蛋白质分解释放。去向：aa-5 支链氨基转移酶把氨基交给 α-酮戊二酸，生成相应 α-酮酸（α-酮异戊酸）；碳骨架继续分解，缬氨酸经丙酰-CoA / 甲基丙二酰-CoA 进入琥珀酰-CoA（数据层 fates 归为生糖）。",
    },
    significance: {
      title: "支链氨基酸先在肌肉转氨，缬氨酸只供生糖",
      body:
        "aa-5 的生理说明指出肌是支链氨基酸转氨的主要场所；缬氨酸的碳骨架归入生糖组，最终可回补 TCA 的琥珀酰-CoA，而不是生酮。",
    },
    exam: {
      title: "考点是必需性、共用酶与生糖归属",
      items: [
        "缬氨酸、亮氨酸、异亮氨酸都是必需氨基酸，第一步共用支链氨基转移酶（BCAT2）。",
        "缬氨酸只生糖；亮氨酸只生酮，异亮氨酸生糖兼生酮。",
        "支链氨基转移的辅酶是磷酸吡哆醛。",
        "缬氨酸碳骨架经丙酰-CoA / 甲基丙二酰-CoA 进入琥珀酰-CoA。",
      ],
    },
    pathways: [
      { label: "氨基酸代谢 aa-5：支链氨基转移酶", href: "/pathway/amino-acids?step=aa-5" },
    ],
    sources: [
      "amino.json · steps[aa-5].equation",
      "amino.json · entities[val] · kind / formula",
      "amino.json · fates[fate-succoa] · sources",
      "Lehninger Principles of Biochemistry, 8e, Ch.18",
    ],
    bubble: { what: "支链必需氨基酸", highlight: "只生糖，碳进琥珀酰-CoA" },
  },

  xu5p: {
    id: "xu5p",
    name: "木酮糖-5-磷酸",
    aliases: ["Xu5P", "xylulose-5-phosphate", "木酮糖-5-磷酸"],
    claim: "Xu5P 是转酮醇酶认的酮糖供体，PPP 两条碳重排都从它剪二碳",
    classification: "五碳酮糖磷酸酯：Ru5P 经 C3 差向异构生成的酮糖。",
    structure: "五碳酮糖磷酸酯；C1–C2 可被转酮醇酶剪下，作为二碳羟乙酰基转给受体。",
    position: {
      title: "它在 ppp-n2 生成，在 ppp-n3 与 ppp-n5 作为转酮醇酶供体",
      body:
        "ppp-n2 核酮糖-5-磷酸 3-差向异构酶把 Ru5P ⇌ Xu5P；ppp-n3 转酮醇酶用 Xu5P + R5P ⇌ GAP + S7P；ppp-n5 同一酶用 Xu5P + E4P ⇌ F6P + GAP。",
    },
    flow: {
      title: "它从 Ru5P 差向异构来，往两条转酮接力去",
      body:
        "来路：ppp-n2 把 Ru5P 的 C3 手性翻转，生成 Xu5P。去向：① ppp-n3 把二碳羟乙酰基转给 R5P，生成 S7P 并留下 GAP；② ppp-n5 把二碳转给 E4P，生成 F6P 并留下 GAP。",
    },
    significance: {
      title: "Xu5P 决定非氧化相把碳送给哪个受体",
      body:
        "它是两条转酮接力的共同供体，浓度由 ppp-n2 与上游碳流决定；碳最终经 F6P 与 GAP 回流糖酵解，Xu5P 本身不积累。",
    },
    exam: {
      title: "考点是差向异构、TPP 与两条接力",
      items: [
        "Xu5P 与 Ru5P 是 C3 差向异构体，ppp-n2 用差向异构酶而不是异构酶。",
        "转酮醇酶搬二碳，辅因子是 TPP 与 Mg²⁺；转醛醇酶搬三碳，不用 TPP。",
        "ppp-n3 的受体是 R5P，ppp-n5 的受体是 E4P，供体都是 Xu5P。",
        "Xu5P 不是净产物，碳最终回到 F6P 与 GAP。",
      ],
    },
    pathways: [
      { label: "磷酸戊糖途径 ppp-n2：差向异构酶产物", href: "/pathway/ppp?step=ppp-n2" },
      { label: "磷酸戊糖途径 ppp-n3：转酮醇酶供体", href: "/pathway/ppp?step=ppp-n3" },
      { label: "磷酸戊糖途径 ppp-n5：转酮醇酶供体", href: "/pathway/ppp?step=ppp-n5" },
    ],
    sources: [
      "ppp.json · steps[ppp-n2].equation / significance",
      "ppp.json · steps[ppp-n3].equation / groupTransfer",
      "ppp.json · steps[ppp-n5].equation / groupTransfer",
      "Lehninger Principles of Biochemistry, 8e, Ch.14",
    ],
    bubble: { what: "五碳酮糖磷酸酯", highlight: "转酮醇酶的二碳供体" },
  },

  // __PROFILE_BATCHES__
};

/** 任何来源 id → 简介档案；没有档案返回 null */
export function profileForMolecule(rawId: string | null | undefined): MoleculeProfile | null {
  const key = profileKeyFor(rawId);
  return key ? MOLECULE_PROFILES[key] : null;
}

/** 简介页地址；没有样板返回 null */
export function moleculeProfileHref(rawId: string | null | undefined): string | null {
  const profile = profileForMolecule(rawId);
  return profile ? `/molecule/${profile.id}` : null;
}
