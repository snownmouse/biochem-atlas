// ============================================================
// moleculeNotes —— 分子档案的唯一文本源（方案 B）
//
// 受众是医学 / 生物学读者，四段按课堂讲法组织：
//   role      它是什么角色（≤25 字；本文件统一压到 ≤21，兼作气泡第 1 行）
//   position  站在哪（≤35 字）
//   flows     从哪来到哪去（≤45 字）
//   whyHere   为什么非它不可（≤45 字）
//   brief     气泡第 2 行（≤21 个全角字，硬上限，超了会被省略号吃掉）
// sources[] 每段事实的出处：数据层字段用「文件 · 字段」写法，教材写书名 + 版次 + 章/表号。
//
// 纪律：不写分子式 / 分子量 / 净电荷做开场（只在机制需要时点一句）；
//       不编数值；不写「参与能量代谢」这类空话。
// id 为规范分子键：同一分子在不同结构口袋的 id 归并到 aliases。
// ============================================================

export interface MoleculeNote {
  id: string;
  role: string;
  brief: string;
  position: string;
  flows: string;
  whyHere: string;
  sources: string[];
}

interface RegistryEntry {
  key: string;
  name: string;
  aliases: string[];
}

/** 79 个规范分子（由结构对照页 89 个 part id 按分子归并而来） */
export const MOLECULE_REGISTRY: RegistryEntry[] = [
  { key: "2pg", name: "2-磷酸甘油酸", aliases: ["2pg"] },
  { key: "3pg", name: "3-磷酸甘油酸", aliases: ["3pg"] },
  { key: "6pg-l", name: "6-磷酸葡糖酸", aliases: ["6pg-l", "6pg"] },
  { key: "6pgl", name: "6-磷酸葡糖酸-1,5-内酯", aliases: ["6pgl"] },
  { key: "accoa", name: "乙酰-CoA", aliases: ["accoa", "fas-accoa", "accoa-mito", "accoa-cyt"] },
  { key: "acylcarn", name: "棕榈酰肉碱", aliases: ["acylcarn"] },
  { key: "acylcoa-c14", name: "肉豆蔻酰-CoA", aliases: ["acylcoa-c14", "acylcoa-short"] },
  { key: "acylcoa-c16", name: "棕榈酰-CoA", aliases: ["acylcoa-c16", "acylcoa", "acylcoa-cyt"] },
  { key: "akg", name: "α-酮戊二酸", aliases: ["akg"] },
  { key: "ala", name: "L-丙氨酸", aliases: ["ala"] },
  { key: "bpg13", name: "1,3-二磷酸甘油酸", aliases: ["bpg13", "13bpg"] },
  { key: "carn", name: "L-肉碱", aliases: ["carn"] },
  { key: "cholesterol", name: "胆固醇", aliases: ["cholesterol"] },
  { key: "cit", name: "柠檬酸", aliases: ["cit"] },
  { key: "co2", name: "二氧化碳", aliases: ["co2"] },
  { key: "cystathionine", name: "L-胱硫醚", aliases: ["cystathionine"] },
  { key: "dhap", name: "磷酸二羟丙酮", aliases: ["dhap"] },
  { key: "dmapp", name: "二甲基烯丙基二磷酸", aliases: ["dmapp"] },
  { key: "e4p", name: "D-赤藓糖-4-磷酸", aliases: ["e4p"] },
  { key: "enoyl-c16", name: "反式-Δ²-棕榈烯酰-CoA", aliases: ["enoyl-c16", "enoyl"] },
  { key: "f6p", name: "6-磷酸果糖", aliases: ["f6p", "f6p-gn"] },
  { key: "fa", name: "棕榈酸", aliases: ["fa", "fas-c16", "palmitate"] },
  { key: "fas-c16-acyl", name: "棕榈酰-ACP", aliases: ["fas-c16-acyl"] },
  { key: "fas-c2", name: "乙酰-ACP", aliases: ["fas-c2", "acylacp"] },
  { key: "fas-c4-acyl", name: "丁酰-ACP", aliases: ["fas-c4-acyl", "acylacp-next"] },
  { key: "fas-c4-enoyl", name: "反式-Δ²-丁烯酰-ACP", aliases: ["fas-c4-enoyl", "enoylacp"] },
  { key: "fas-c4-keto", name: "3-酮丁酰-ACP", aliases: ["fas-c4-keto", "ketoacylacp"] },
  { key: "fas-c4-oh", name: "D-3-羟基丁酰-ACP", aliases: ["fas-c4-oh", "hydroxyacylacp"] },
  { key: "fas-malonyl", name: "丙二酰-CoA", aliases: ["fas-malonyl", "malonylcoa"] },
  { key: "fbp", name: "果糖-1,6-二磷酸", aliases: ["fbp", "fbp-linear", "fbp-gn"] },
  { key: "fum", name: "延胡索酸", aliases: ["fum", "urea-fum"] },
  { key: "g1p", name: "葡萄糖-1-磷酸", aliases: ["g1p"] },
  { key: "g6p", name: "6-磷酸葡萄糖", aliases: ["g6p", "g6p-g6pd"] },
  { key: "gap", name: "甘油醛-3-磷酸", aliases: ["gap", "g3p"] },
  { key: "glc", name: "α-D-葡萄糖", aliases: ["glc"] },
  { key: "gln", name: "L-谷氨酰胺", aliases: ["gln"] },
  { key: "glu", name: "L-谷氨酸", aliases: ["glu"] },
  { key: "glycogen", name: "糖原", aliases: ["glycogen"] },
  { key: "glycogen-limit", name: "极限糊精", aliases: ["glycogen-limit"] },
  { key: "hco3", name: "碳酸氢根", aliases: ["hco3"] },
  { key: "hcy", name: "L-高半胱氨酸", aliases: ["hcy"] },
  { key: "hydroxy-c16", name: "L-3-羟基棕榈酰-CoA", aliases: ["hydroxy-c16", "hydroxy", "hydroxyacyl"] },
  { key: "icit", name: "异柠檬酸", aliases: ["icit"] },
  { key: "ipp", name: "异戊烯基二磷酸", aliases: ["ipp"] },
  { key: "keto-c16", name: "3-酮棕榈酰-CoA", aliases: ["keto-c16", "keto", "ketoacyl"] },
  { key: "kic", name: "α-酮异己酸", aliases: ["kic"] },
  { key: "lac", name: "L-乳酸", aliases: ["lac"] },
  { key: "lanosterol", name: "羊毛甾醇", aliases: ["lanosterol"] },
  { key: "leu", name: "L-亮氨酸", aliases: ["leu"] },
  { key: "mal", name: "L-苹果酸", aliases: ["mal"] },
  { key: "mev5p", name: "甲羟戊酸-5-磷酸", aliases: ["mev5p"] },
  { key: "mev5pp", name: "甲羟戊酸-5-二磷酸", aliases: ["mev5pp"] },
  { key: "mevalonate", name: "甲羟戊酸", aliases: ["mevalonate"] },
  { key: "oaa", name: "草酰乙酸", aliases: ["oaa"] },
  { key: "oxidosqualene", name: "2,3-环氧角鲨烯", aliases: ["oxidosqualene"] },
  { key: "pep", name: "磷酸烯醇式丙酮酸", aliases: ["pep"] },
  { key: "phe", name: "L-苯丙氨酸", aliases: ["phe"] },
  { key: "ppi", name: "焦磷酸", aliases: ["ppi"] },
  { key: "pyr", name: "丙酮酸", aliases: ["pyr", "pyr-gn"] },
  { key: "r5p", name: "D-核糖-5-磷酸", aliases: ["r5p"] },
  { key: "ru5p", name: "D-核酮糖-5-磷酸", aliases: ["ru5p", "ru5p-i"] },
  { key: "s7p", name: "景天庚酮糖-7-磷酸", aliases: ["s7p"] },
  { key: "ser", name: "L-丝氨酸", aliases: ["ser"] },
  { key: "squalene", name: "角鲨烯", aliases: ["squalene"] },
  { key: "suc", name: "琥珀酸", aliases: ["suc"] },
  { key: "succoa", name: "琥珀酰-CoA", aliases: ["succoa"] },
  { key: "tyr", name: "L-酪氨酸", aliases: ["tyr"] },
  { key: "udp", name: "尿苷二磷酸", aliases: ["udp"] },
  { key: "udp-glucose", name: "UDP-葡萄糖", aliases: ["udp-glucose"] },
  { key: "urea-arg", name: "L-精氨酸", aliases: ["urea-arg", "arginine"] },
  { key: "urea-as1", name: "L-精氨酸琥珀酸", aliases: ["urea-as1", "as1", "argininosuccinate"] },
  { key: "urea-asp", name: "L-天冬氨酸", aliases: ["urea-asp", "asp"] },
  { key: "urea-cap", name: "氨甲酰磷酸", aliases: ["urea-cap", "carbamoylP"] },
  { key: "urea-cit", name: "L-瓜氨酸", aliases: ["urea-cit", "citrulline"] },
  { key: "urea-nh3", name: "氨", aliases: ["urea-nh3", "nh3"] },
  { key: "urea-orn", name: "L-鸟氨酸", aliases: ["urea-orn", "ornithine"] },
  { key: "urea-ure", name: "尿素", aliases: ["urea-ure", "urea"] },
  { key: "utp", name: "尿苷三磷酸", aliases: ["utp"] },
  { key: "xu5p", name: "D-木酮糖-5-磷酸", aliases: ["xu5p"] },
];

/** 辅因子单独成组：它们不是结构对照页的 part，但气泡里同样要讲清角色 */
export const COFACTOR_IDS = ["atp", "nadh"] as const;

/** 辅因子不在结构对照页 registry 里，但挂图节点需要名字作气泡标题 */
const COFACTOR_NAMES: Record<string, string> = {
  atp: "腺苷三磷酸（ATP）",
  nadh: "还原型烟酰胺腺嘌呤二核苷酸（NADH）",
};

const ALIAS = new Map<string, string>();
for (const entry of MOLECULE_REGISTRY) {
  ALIAS.set(entry.key, entry.key);
  for (const alias of entry.aliases) ALIAS.set(alias, entry.key);
}
for (const id of COFACTOR_IDS) ALIAS.set(id, id);

/** 任何来源 id（part id / 口袋变体 / 通路 entity id）→ 规范分子键 */
export function canonicalMoleculeId(rawId: string | null | undefined): string | null {
  if (!rawId) return null;
  return ALIAS.get(rawId) ?? null;
}

export function noteForMolecule(rawId: string | null | undefined): MoleculeNote | null {
  const key = canonicalMoleculeId(rawId);
  if (!key) return null;
  return MOLECULE_NOTES[key] ?? COFACTOR_NOTES[key] ?? null;
}

/** 规范分子名（挂图节点没有登记进步骤时，用它作气泡标题） */
export function moleculeName(rawId: string | null | undefined): string | null {
  const key = canonicalMoleculeId(rawId);
  if (!key) return null;
  return MOLECULE_REGISTRY.find((entry) => entry.key === key)?.name ?? COFACTOR_NAMES[key] ?? null;
}

// ---------- 第一批 10 个（G6P / 丙酮酸 / 乙酰-CoA / OAA / 尿素 / ATP / NADH / 氨 / PEP / 丙二酰-CoA） ----------

export const MOLECULE_NOTES: Record<string, MoleculeNote> = {
  g6p: {
    id: "g6p",
    role: "糖酵解第一站产物，三路分岔口",
    brief: "带负电，被锁在胞内",
    position: "糖酵解第 1 站产物、第 2 站底物；PPP 氧化相入口；糖原分解产物。",
    flows: "由葡萄糖 + ATP 生成；去路 F6P、6-磷酸葡糖酸内酯、葡萄糖（肝 G6PC1 水解）。",
    whyHere: "磷酸基带负电使其不能过膜，被锁在胞内；它又是 HK 的变构抑制产物、G6PD 的底物。",
    sources: [
      "glycolysis.json · steps[gk-1].significance / misconceptions",
      "ppp.json · steps[ppp-o1].significance",
      "glycolysis.json · steps[gk-2].significance",
      "glycogen.json · steps[gly-3] / steps[gly-4]",
    ],
  },
  pyr: {
    id: "pyr",
    role: "糖酵解的终点，三路去向",
    brief: "PDH 与 PC 争同一底物",
    position: "糖酵解第 10 站产物；PDH、丙酮酸羧化酶、ALT 的底物。",
    flows: "由 PEP + ADP 生成（PK）；去路是乙酰-CoA、OAA、丙氨酸（ALT）。",
    whyHere: "它是糖酵解唯一出口：PDH 送它进线粒体，PC 拉它回糖异生，方向由乙酰-CoA 别构决定。",
    sources: [
      "glycolysis.json · steps[gk-10].significance",
      "fas.json · steps[fas-pdh].significance",
      "gluconeogenesis.json · steps[gn-1].significance",
      "amino.json · steps[aa-1]",
    ],
  },
  accoa: {
    id: "accoa",
    role: "C2 单元的通用通货",
    brief: "过不了膜，得换成柠檬酸",
    position: "TCA 第 1 站底物；PDH 产物；β-氧化硫解产物；FAS 与胆固醇的起点。",
    flows: "由丙酮酸（PDH）或脂酰链硫解生成；去路柠檬酸、丙二酰-CoA、胆固醇。",
    whyHere: "C2 单元不能自由过内膜，必须先与 OAA 装成柠檬酸出线粒体——这是 FAS 的原料瓶颈。",
    sources: [
      "tca.json · steps[tca-1].significance",
      "fas.json · steps[fas-pdh].significance / steps[fas-shuttle].significance",
      "fao.json · steps[fao-4].significance",
    ],
  },
  oaa: {
    id: "oaa",
    role: "TCA 的起点，也是终点",
    brief: "浓度极低，卡住整条环",
    position: "TCA 第 1 站底物、第 8 站产物；糖异生 gn-1 产物、gn-2 底物。",
    flows: "由苹果酸氧化（MDH）或丙酮酸羧化（PC）生成；去路柠檬酸（CS）、PEP（PEPCK）。",
    whyHere: "胞内浓度极低，CS 捕获 OAA 是流量瓶颈；MDH 步靠 CS 的大负 ΔG 拉动。",
    sources: [
      "tca.json · steps[tca-1].significance / steps[tca-8].significance",
      "gluconeogenesis.json · steps[gn-1] / steps[gn-2]",
    ],
  },
  "urea-ure": {
    id: "urea-ure",
    role: "两个氮的最终出口；尿素循环的产物",
    brief: "中性分子，经血入肾",
    position: "尿素循环第 5 站产物；ARG1 水解释放尿素，同时再生鸟氨酸进下一轮。",
    flows: "由精氨酸水解（ARG1）生成；两个氮分别来自 NH₃ 与 Asp；经血运至肾排出。",
    whyHere: "循环必须有个终产物：两个氮装进同一分子才能一次排出，不再留给肝外组织。",
    sources: [
      "urea.json · entities[urea].note / ionization",
      "urea.json · steps[urea-5].significance",
      "urea.json · energyLedger.nitrogenNote",
      "Lehninger Principles of Biochemistry, 8e, Ch.18",
    ],
  },
  pep: {
    id: "pep",
    role: "全通路能量最高的磷酸化合物",
    brief: "脱水后才值一个 ATP",
    position: "糖酵解第 9 站产物、第 10 站底物；糖异生 gn-2 产物。",
    flows: "由 2PG 脱水（烯醇化酶）生成；去路是丙酮酸（PK），或糖异生逆向回 2PG。",
    whyHere: "脱水把低能的 2PG 磷酸变成全通路能量最高的烯醇磷酸，PK 步才付得起一次底物水平的磷酸化。",
    sources: [
      "glycolysis.json · steps[gk-9].significance / steps[gk-10].significance",
      "gluconeogenesis.json · steps[gn-2] / steps[gn-3]",
    ],
  },
  "fas-malonyl": {
    id: "fas-malonyl",
    role: "FAS 第一道承诺步的产物",
    brief: "羧化过的 C2 才能进环",
    position: "FAS fas-acc 产物、FASN 缩合底物；CPT1 的抑制剂。",
    flows: "由乙酰-CoA + HCO₃⁻（ACC 耗 ATP）生成；去路 FASN 四步缩合环。",
    whyHere: "只有羧化的 C2 能进 FASN 的环；它同时抑制 CPT1，把合成开启与氧化关闭绑在一起。",
    sources: [
      "fas.json · steps[fas-acc].significance",
      "fas.json · entities[malonylcoa].ionization",
      "comparisonConfig.ts · fas-acc part[fas-malonyl].sourceNote",
    ],
  },
  "urea-nh3": {
    id: "urea-nh3",
    role: "尿素循环两个氮源之一（游离氨）",
    brief: "就地装进氨甲酰磷酸",
    position: "尿素循环 urea-1 底物；GLDH 与谷氨酰胺酶的产物。",
    flows: "由氨基酸脱氨（GLDH）与谷氨酰胺水解（GLS1）生成；去路氨甲酰磷酸（CPS1）→ 尿素。",
    whyHere: "游离氨不能长途运输，必须在线粒体基质被 CPS1 就地装进氨甲酰磷酸。",
    sources: [
      "urea.json · entities[nh3].note / ionization",
      "urea.json · steps[urea-1].significance",
      "urea.json · energyLedger.nitrogenNote",
    ],
  },

  // ---------- 第二批 20 个（糖酵解 / TCA / 糖原主链） ----------

  f6p: {
    id: "f6p",
    role: "糖酵解第 2 站产物，PFK-1 的底物",
    brief: "下游一步就是限速闸门",
    position: "糖酵解第 2 站产物、第 3 站底物；PPP 转醛醇酶产物；糖异生 gn-9 产物。",
    flows: "由 G6P 异构（PGI）生成，PPP 的转醛醇酶也产出它；去路是 FBP（PFK-1）。",
    whyHere: "本步近平衡，方向全靠下游 PFK-1 持续抽走 F6P；它自身不设闸。",
    sources: [
      "glycolysis.json · steps[gk-2].significance / steps[gk-3].significance",
      "ppp.json · steps[ppp-n4].significance / steps[ppp-n5].significance",
      "gluconeogenesis.json · steps[gn-9] / steps[gn-10]",
    ],
  },

  fbp: {
    id: "fbp",
    role: "糖酵解唯一的六碳裂解点",
    brief: "一拆二，从此按双份算",
    position: "糖酵解第 3 站产物、第 4 站底物；糖异生 gn-8 产物、gn-9 底物。",
    flows: "由 F6P 经 PFK-1 生成；去路由醛缩酶拆成 GAP + DHAP；糖异生侧 FBPase-1 水解。",
    whyHere: "裂解本身近平衡，靠下游 GAPDH 的氧化把流量拉过去；反向必须另开 FBPase-1 水解。",
    sources: [
      "glycolysis.json · steps[gk-3].significance / steps[gk-4].significance",
      "gluconeogenesis.json · steps[gn-8].significance / steps[gn-9].significance",
    ],
  },

  dhap: {
    id: "dhap",
    role: "FBP 裂解的另一半，需再异构",
    brief: "不转化这一拆就白拆",
    position: "糖酵解第 4 站产物、第 5 站底物；糖异生 gn-7 产物、gn-8 底物。",
    flows: "由 FBP 裂解（醛缩酶）生成；经 TPI 变成 GAP 才进产能段；糖异生时反向攒成第二个三碳。",
    whyHere: "它自己不进产能段，只有变成 GAP 才能被 GAPDH 氧化；TPI 近平衡，靠 GAP 被抽走推动。",
    sources: [
      "glycolysis.json · steps[gk-4].significance / steps[gk-5].significance",
      "gluconeogenesis.json · steps[gn-7].significance / steps[gn-8].significance",
    ],
  },

  gap: {
    id: "gap",
    role: "糖酵解产能段的三碳入口",
    brief: "氧化一次，存下 1,3-BPG",
    position: "糖酵解第 4/5 站产物、第 6 站底物；PPP 的产物；糖异生 gn-6 产物。",
    flows: "由 FBP 裂解与 DHAP 异构生成，PPP 的转酮醇酶也产出；去路 1,3-BPG（GAPDH）。",
    whyHere: "全通路唯一的氧化还原步：醛基氧化释放的能量被存进酰基磷酸，而不是散成热。",
    sources: [
      "glycolysis.json · steps[gk-5].significance / steps[gk-6].significance",
      "ppp.json · steps[ppp-n3].significance / steps[ppp-n5].significance",
      "gluconeogenesis.json · steps[gn-6].significance",
    ],
  },

  bpg13: {
    id: "bpg13",
    role: "糖酵解第一个高能磷酸中间物",
    brief: "酰基磷酸，专供 PGK",
    position: "糖酵解第 6 站产物、第 7 站底物；糖异生 gn-5 产物、gn-6 底物。",
    flows: "由 G3P 氧化磷酸化（GAPDH）生成；磷酸交给 ADP 后变 3PG；糖异生侧耗 ATP 重建。",
    whyHere: "能量先存进羧基-磷酸酐，才能不新建 ATP 就给 ADP 一次底物水平磷酸化。",
    sources: [
      "glycolysis.json · steps[gk-6].significance / steps[gk-7].significance",
      "gluconeogenesis.json · steps[gn-5].significance / steps[gn-6].significance",
      "comparisonConfig.ts · gk-6 part[bpg13].caveat",
    ],
  },

  "3pg": {
    id: "3pg",
    role: "第一次底物磷酸化后的三碳酸",
    brief: "磷酸要挪位才能脱水",
    position: "糖酵解第 7 站产物、第 8 站底物；糖异生 gn-4 产物、gn-5 底物。",
    flows: "由 1,3-BPG 交磷酸给 ADP 生成；变位酶挪到 C2 变 2PG；糖异生侧逆向回 1,3-BPG。",
    whyHere: "磷酸留在 C3 无法脱水；只有挪到 C2，烯醇化酶才有底物可脱水成高能 PEP。",
    sources: [
      "glycolysis.json · steps[gk-7].significance / steps[gk-8].significance",
      "gluconeogenesis.json · steps[gn-4].significance / steps[gn-5].significance",
    ],
  },

  "2pg": {
    id: "2pg",
    role: "脱水前的底物，磷酸仍低能",
    brief: "磷已在 C2，等着脱水",
    position: "糖酵解第 8 站产物、第 9 站底物；糖异生 gn-3 产物、gn-4 底物。",
    flows: "由 3PG 变位生成；经烯醇化酶脱水成 PEP；糖异生侧由 PEP 水合回来。",
    whyHere: "2PG 的磷酸键并不高能；只有脱水把 C2 磷变成烯醇磷酸，PEP 才够格付一次底物水平磷酸化。",
    sources: [
      "glycolysis.json · steps[gk-8].significance / steps[gk-9].significance",
      "gluconeogenesis.json · steps[gn-3].significance / steps[gn-4].significance",
    ],
  },

  glc: {
    id: "glc",
    role: "血糖的通用燃料，进胞即被锁",
    brief: "一进胞就被磷酸化",
    position: "糖酵解第 1 站底物；糖异生 gn-11 产物；糖原分解在肝的终产物。",
    flows: "由 G6P 水解（G6PC1，肝/肾/肠）生成，经 GLUT2 入血；去路是各组织的 HK 磷酸化。",
    whyHere: "只有肝、肾、肠有 G6PC1 这对搭档：这是肌糖原不能补血糖的分子根据。",
    sources: [
      "glycolysis.json · steps[gk-1].significance",
      "gluconeogenesis.json · steps[gn-11].significance",
      "glycogen.json · steps[gly-4]",
    ],
  },

  lac: {
    id: "lac",
    role: "无氧糖酵解的终点，Cori 的载体",
    brief: "把 NADH 当场还回去",
    position: "LDH 的产物与底物；Cori 循环中肌→肝的运输形式，肝内再氧化。",
    flows: "由丙酮酸还原（LDH，耗 NADH）生成；经血到肝，再氧化回丙酮酸进入糖异生。",
    whyHere: "它让 NADH 就地再生 NAD⁺，糖酵解在无氧下才能继续；同时把碳运到肝。",
    sources: [
      "cori.json · summary / energyLedger",
      "gluconeogenesis.json · entities[lac]",
    ],
  },

  cit: {
    id: "cit",
    role: "TCA 第 1 站产物，双向枢纽",
    brief: "出线粒体就成了碳源",
    position: "TCA 第 1 站产物、第 2 站底物；FAS 的胞质碳源；PFK-1 抑制剂。",
    flows: "由乙酰-CoA 与 OAA 缩合（CS）生成；去路异柠檬酸，或出线粒体被 ACLY 裂解。",
    whyHere: "缩合把 C2 与 C4 拼成 C6，同时把 OAA 拉回循环；柠檬酸还是 C2 出线粒体的载体。",
    sources: [
      "tca.json · steps[tca-1].significance / steps[tca-2].significance",
      "fas.json · steps[fas-shuttle].significance",
      "fas.json · entities[cit].formula / ionization",
    ],
  },

  icit: {
    id: "icit",
    role: "TCA 限速步底物，第一个 CO₂ 出口",
    brief: "ADP 与 NADH 在这里定速",
    position: "TCA 第 2 站产物、第 3 站底物；异柠檬酸脱氢酶的底物。",
    flows: "由柠檬酸经顺乌头酸异构生成；去路 α-KG + CO₂（IDH，产 NADH）。",
    whyHere: "IDH 是全环的调控阀：ADP/Ca²⁺ 开、ATP/NADH 关；它一停，后面整条链都没碳进。",
    sources: [
      "tca.json · steps[tca-2].significance / steps[tca-3].significance",
    ],
  },

  akg: {
    id: "akg",
    role: "TCA 与氨基酸代谢的公共节点",
    brief: "转氨的通用氨基受体",
    position: "TCA 第 3 站产物、第 4 站底物；转氨酶的氨基受体；GLDH 产物。",
    flows: "由异柠檬酸氧化脱羧生成，也由谷氨酸脱氨（GLDH）生成；去路琥珀酰-CoA 或转氨成氨基酸。",
    whyHere: "它同时是环的中间物和氮的集散点：转氨把氨基集中到这里，再由 GLDH 放氨进尿素循环。",
    sources: [
      "tca.json · steps[tca-3].significance / steps[tca-4].significance",
      "amino.json · steps[aa-1] / steps[aa-2] / steps[aa-3]",
    ],
  },

  succoa: {
    id: "succoa",
    role: "高能硫酯，环内唯一产 GTP",
    brief: "硫酯键值一个 GTP",
    position: "TCA 第 4 站产物、第 5 站底物；血红素合成的一个碳出口。",
    flows: "由 α-KG 氧化脱羧（KGDH）生成；经合成酶换成 GTP 与琥珀酸，或去血红素合成。",
    whyHere: "硫酯键的能量必须就地变现：这一步用 GDP + Pi 产 GTP，是环内唯一的底物水平磷酸化。",
    sources: [
      "tca.json · steps[tca-4].significance / steps[tca-5].significance",
    ],
  },

  suc: {
    id: "suc",
    role: "TCA 唯一交给 FAD 的底物",
    brief: "交给复合体 II，不进 NADH",
    position: "TCA 第 5 站产物、第 6 站底物；呼吸链复合体 II 的底物。",
    flows: "由琥珀酰-CoA 水解生成；经琥珀酸脱氢酶氧化成延胡索酸，电子直接进泛醌池。",
    whyHere: "这一步的氧化电位不够还原 NAD⁺，只能交给 FAD；而 SDH 本身就是复合体 II，不泵质子。",
    sources: [
      "tca.json · steps[tca-5].significance / steps[tca-6].significance",
    ],
  },

  fum: {
    id: "fum",
    role: "TCA 中段的水合底物，反式双键",
    brief: "加水就变 L-苹果酸",
    position: "TCA 第 6 站产物、第 7 站底物；延胡索酸酶的底物，水合有立体专一性。",
    flows: "由琥珀酸氧化（SDH）生成；经延胡索酸酶加水成苹果酸，近平衡随流量走。",
    whyHere: "反式双键加水有明确立体化学，只生成 L-苹果酸；这一步不设闸，方向由前后步流量决定。",
    sources: [
      "tca.json · steps[tca-6].significance / steps[tca-7].significance",
    ],
  },

  mal: {
    id: "mal",
    role: "TCA 闭环前的最后一步底物",
    brief: "最不利的一步，靠 CS 拉",
    position: "TCA 第 7 站产物、第 8 站底物；苹果酸-天冬氨酸穿梭的胞质底物。",
    flows: "由延胡索酸水合生成；氧化成 OAA（MDH，产 NADH）后回第 1 站；胞质侧走苹果酸穿梭。",
    whyHere: "MDH 的 ΔG 是正的，单独走不动；靠第 1 站 CS 的大负 ΔG 把它拉过去。",
    sources: [
      "tca.json · steps[tca-7].significance / steps[tca-8].significance",
      "gluconeogenesis.json · entities[mal]",
    ],
  },

  g1p: {
    id: "g1p",
    role: "糖原与血糖之间的转接点",
    brief: "糖原分解的第一站",
    position: "糖原磷酸化酶产物；变位酶的底物与产物；UDP-葡萄糖焦磷酸化酶底物。",
    flows: "由糖原磷酸解生成；变位成 G6P 走向分解，或经 UTP 变成 UDP-葡萄糖走向合成。",
    whyHere: "磷酸解不花 ATP 就切下葡萄糖，还保留一个磷酸基；这是糖原比游离葡萄糖更经济之处。",
    sources: [
      "glycogen.json · steps[gly-1] / steps[gly-3] / steps[gly-6] / steps[gly-7]",
      "glycogen.json · entities[g1p].formula / ionization",
    ],
  },

  glycogen: {
    id: "glycogen",
    role: "葡萄糖的聚合仓库，两端不同",
    brief: "肝放糖，肌只自用",
    position: "糖原磷酸化酶与脱支酶的底物；糖原合酶与分支酶的产物。",
    flows: "由 UDP-葡萄糖经糖原合酶延伸、分支酶造枝；分解由磷酸化酶与脱支酶完成，肝可水解成血糖。",
    whyHere: "分支让非还原端变多，磷酸化酶能同时切多处；肝有 G6PC1 可放糖，肌没有只能自用。",
    sources: [
      "glycogen.json · entities[glycogen].note / formula",
      "glycogen.json · steps[gly-1] / steps[gly-2] / steps[gly-8] / steps[gly-9]",
      "gluconeogenesis.json · steps[gn-11].significance",
    ],
  },

  "glycogen-limit": {
    id: "glycogen-limit",
    role: "磷酸化酶停手后剩下的分支核心",
    brief: "离分支 4 个残基就停",
    position: "糖原磷酸解到 α-1,6 分支点前 4 个残基停下后的产物；脱支酶的底物。",
    flows: "由糖原磷酸解到分支前停下生成；脱支酶先转移三个残基、再水解 α-1,6 键，放出游离葡萄糖。",
    whyHere: "α-1,6 键磷酸化酶切不动，只能由脱支酶两步处理；游离葡萄糖是糖原分解不产 G6P 的出口。",
    sources: [
      "glycogen.json · entities[glycogen-limit].note",
      "glycogen.json · steps[gly-2]",
    ],
  },

  "udp-glucose": {
    id: "udp-glucose",
    role: "糖原合成中活化的葡萄糖供体",
    brief: "UTP 把葡萄糖激活",
    position: "UDP-葡萄糖焦磷酸化酶产物；糖原合酶 gly-8 的底物。",
    flows: "由 G1P + UTP 生成，放出焦磷酸；糖原合酶把葡萄糖接到非还原端，释放 UDP。",
    whyHere: "糖原合酶只能接活化的葡萄糖：UDP-葡萄糖的 C1 有良好离去基团，接链不另耗 ATP。",
    sources: [
      "glycogen.json · steps[gly-7] / steps[gly-8]",
      "glycogen.json · entities[udp-glucose].formula / ionization",
    ],
  },

  // ---------- 第三批 18 个（PPP / 尿素循环 / 通用载体） ----------

  "6pg-l": {
    id: "6pg-l",
    role: "PPP 氧化相第二步的产物",
    brief: "开环才能继续脱羧",
    position: "PPP ppp-o2 产物、ppp-o3 底物；直链羧酸中间物。",
    flows: "由 6-磷酸葡糖酸内酯水解开环生成；去路核酮糖-5-磷酸 + CO₂（6PGD，产 NADPH）。",
    whyHere: "只有开环后的直链羧酸才能 β-脱羧丢掉 C1；内酯环不打开，氧化脱羧就无从发生。",
    sources: [
      "ppp.json · steps[ppp-o2].significance / steps[ppp-o3].significance",
      "ppp.json · entities[6pg] / entities[6pgl]",
    ],
  },

  "6pgl": {
    id: "6pgl",
    role: "PPP 的入口产物，带一个内酯环",
    brief: "G6PD 的唯一产物",
    position: "PPP 氧化相 ppp-o1 产物、ppp-o2 底物；G6PD 的产物。",
    flows: "由 G6P 在 C1 位脱氢（G6PD）生成，NADP⁺ 专一收电子；去路是内酯酶水解开环。",
    whyHere: "这一步就是 PPP 的限速闸：NADPH 堆积会压住 G6PD，把 G6P 让回糖酵解。",
    sources: [
      "ppp.json · steps[ppp-o1].significance / steps[ppp-o2].significance",
    ],
  },

  r5p: {
    id: "r5p",
    role: "核酸合成的唯一糖骨架出口",
    brief: "核苷酸都要它",
    position: "PPP 非氧化相 ppp-n1 产物；转酮醇酶 ppp-n3 的受体。",
    flows: "由 Ru5P 异构生成；去路是核苷酸从头合成与补救，或作为转酮醇酶的受体进入碳骨架重组。",
    whyHere: "核苷酸只能用它做糖骨架；细胞分裂旺盛时这条出口吃紧，碳流就不回糖酵解了。",
    sources: [
      "ppp.json · steps[ppp-n1].significance / steps[ppp-n3].significance",
    ],
  },

  ru5p: {
    id: "ru5p",
    role: "PPP 氧化相的出口，三条路的共用池",
    brief: "三条非氧化路共用它",
    position: "PPP ppp-o3 产物；ppp-n1 与 ppp-n2 的底物。",
    flows: "由 6-磷酸葡糖酸氧化脱羧（6PGD）生成；去路为 R5P、Xu5P 或回流糖酵解。",
    whyHere: "它是氧化相与碳骨架重组的接点：同一个池同时分给 R5P 与 Xu5P 两条换手路。",
    sources: [
      "ppp.json · steps[ppp-o3].significance / steps[ppp-n1].significance / steps[ppp-n2].significance",
    ],
  },

  xu5p: {
    id: "xu5p",
    role: "转酮醇酶唯一认的酮糖供体",
    brief: "只负责剪二碳",
    position: "PPP ppp-n2 产物；转酮醇酶 ppp-n3 / ppp-n5 的供体。",
    flows: "由 Ru5P 的 C3 手性翻转（差向异构酶）生成；去路被转酮醇酶剪掉二碳，剩下 GAP。",
    whyHere: "转酮醇酶只认这个酮糖形态：没有 Xu5P，碳骨架重组的两刀都下不去，戊糖磷酸就积在这里。",
    sources: [
      "ppp.json · steps[ppp-n2].significance / steps[ppp-n3].significance / steps[ppp-n5].significance",
    ],
  },

  e4p: {
    id: "e4p",
    role: "碳骨架重组的中转 C4，专收二碳",
    brief: "转醛醇酶留给转酮醇酶",
    position: "PPP ppp-n4 产物；转酮醇酶 ppp-n5 的受体。",
    flows: "由 S7P 卸下三碳后剩下的 C4 残链生成；去路接受 Xu5P 的第二刀二碳变成 F6P。",
    whyHere: "它是 N4 与 N5 两刀的接力点：没有 E4P 接收第二刀，15C 的净账就合不上，两个 C6 也出不来。",
    sources: [
      "ppp.json · steps[ppp-n4].significance / steps[ppp-n5].significance",
    ],
  },

  s7p: {
    id: "s7p",
    role: "PPP 碳骨架重组的 C7 中间物",
    brief: "转醛醇酶的临时产物",
    position: "PPP ppp-n3 产物、ppp-n4 底物；转醛醇酶的底物。",
    flows: "由 Xu5P 的二碳缝到 R5P 上生成；去路被转醛醇酶卸下三碳，留下 E4P 与 F6P。",
    whyHere: "C7 只是重组过程的临时形状：它必须立刻交出三碳，否则 C5→C6 的路线接不上。",
    sources: [
      "ppp.json · steps[ppp-n3].significance / steps[ppp-n4].significance",
    ],
  },

  "urea-arg": {
    id: "urea-arg",
    role: "尿素的直接前体，也是氮的暂存",
    brief: "水解一次放出尿素",
    position: "尿素循环 urea-4 产物、urea-5 底物；ARG1 的底物。",
    flows: "由精氨酸琥珀酸裂解生成（延胡索酸同时出环）；去路 ARG1 水解成尿素 + 鸟氨酸。",
    whyHere: "两个氮必须先装进同一个胍基，才能被 ARG1 一次水解释放；这一步是循环的收口。",
    sources: [
      "urea.json · steps[urea-4].significance / steps[urea-5].significance",
      "urea.json · entities[arginine].note / ionization",
    ],
  },

  "urea-as1": {
    id: "urea-as1",
    role: "两个氮第一次同框的 C9 中间物",
    brief: "裂解就放出延胡索酸",
    position: "尿素循环 urea-3 产物、urea-4 底物；ASS 与 ASL 之间。",
    flows: "由瓜氨酸 + 天冬氨酸 + ATP 生成；去路裂解成精氨酸 + 延胡索酸，后者回 TCA。",
    whyHere: "它把尿素循环与 TCA 焊在一起：延胡索酸出环、苹果酸回环，碳骨架才不必净消耗。",
    sources: [
      "urea.json · steps[urea-3].significance / steps[urea-4].significance",
      "urea.json · entities[argininosuccinate]",
    ],
  },

  "urea-asp": {
    id: "urea-asp",
    role: "尿素的第二个氮源，兼 TCA 回流",
    brief: "碳骨架来自草酰乙酸",
    position: "尿素循环 urea-3 底物；AST 的产物；TCA 草酰乙酸经转氨而来。",
    flows: "由 OAA 经 AST 转氨生成；去路在 ASS 步把氨基交给瓜氨酸，碳骨架以延胡索酸回 TCA。",
    whyHere: "循环需要可再生的氮源：天冬氨酸的碳骨架能回 TCA，才不至于每轮净吃一个 C4。",
    sources: [
      "urea.json · steps[urea-3].significance",
      "urea.json · entities[asp].note / ionization",
      "amino.json · steps[aa-2]",
    ],
  },

  "urea-cap": {
    id: "urea-cap",
    role: "尿素循环进环的活化氨甲酰基",
    brief: "CPS1 装好的第一份氮",
    position: "尿素循环 urea-1 产物、urea-2 底物；OTC 的底物。",
    flows: "由 NH₃ + HCO₃⁻ + 2 ATP（CPS1）生成；释放 2 ADP + Pi，经 OTC 交给鸟氨酸。",
    whyHere: "游离氨必须先在基质里被固定成氨甲酰磷酸，才能安全地整份交给鸟氨酸带走。",
    sources: [
      "urea.json · steps[urea-1].significance / steps[urea-2].significance",
      "urea.json · entities[carbamoylP].note / ionization",
    ],
  },

  "urea-cit": {
    id: "urea-cit",
    role: "跨线粒体膜的瓜氨酸载体",
    brief: "出线粒体，再等第二个氮",
    position: "尿素循环 urea-2 产物、urea-3 底物；胞质 ASS 的底物。",
    flows: "由氨甲酰磷酸 + 鸟氨酸（OTC）生成；经转运出内膜，去路与天冬氨酸缩合成精氨酸琥珀酸。",
    whyHere: "它把已固定的氮搬出线粒体：只有胞质才有天冬氨酸，第二个氮只能在胞质接上。",
    sources: [
      "urea.json · steps[urea-2].significance / steps[urea-3].significance",
      "urea.json · entities[citrulline].note / ionization",
    ],
  },

  "urea-orn": {
    id: "urea-orn",
    role: "C5 载体，碳骨架不消耗",
    brief: "送氨出线粒体再回来",
    position: "尿素循环 urea-2 底物、urea-5 产物；OTC 与 ARG1 之间循环。",
    flows: "由 ARG1 水解精氨酸再生；经 ORNT1 回基质，去路再被 OTC 消耗成瓜氨酸。",
    whyHere: "它是循环的载体而非原料：δ-氨基只是被借走，碳骨架净不变，每轮只需催化量。",
    sources: [
      "urea.json · steps[urea-2].significance / steps[urea-5].significance",
      "urea.json · entities[ornithine].note / ionization",
    ],
  },

  co2: {
    id: "co2",
    role: "脱羧放出的碳，不是废物",
    brief: "两次脱羧各放一个",
    position: "PPP ppp-o3 产物；PDH、FAS 缩合与 TCA 脱羧的产物。",
    flows: "由 6PGD β-脱羧、PDH 与 KGDH 氧化脱羧、FAS 缩合释放；去路呼出或再被羧化固定。",
    whyHere: "FAS 缩合放出的 CO₂ 正是 ACC 预装的 HCO₃⁻ 碳：它不进碳链，只是羧化的临时载体。",
    sources: [
      "ppp.json · steps[ppp-o3].significance",
      "fas.json · steps[fas-pdh].significance / steps[fas-ks].significance",
      "fas.json · entities[co2].formula / ionization",
    ],
  },

  hco3: {
    id: "hco3",
    role: "羧化反应的临时一碳载体",
    brief: "生物素把它装上",
    position: "gn-1、urea-1、fas-acc 的底物。",
    flows: "由 CO₂ 水合或血液碳酸氢盐供给；在 PC、CPS1、ACC 三处被 ATP 装进羧基，随后释放。",
    whyHere: "三个羧化酶都用它搬运同一件事：把 CO₂ 的碳临时装到羧基上，再在下一步放掉、不留给碳链。",
    sources: [
      "gluconeogenesis.json · steps[gn-1].significance",
      "urea.json · steps[urea-1].significance",
      "fas.json · steps[fas-acc].significance",
      "urea.json · entities[hco3].note / ionization",
    ],
  },

  ppi: {
    id: "ppi",
    role: "两处反应共用的焦磷酸副产物",
    brief: "一水解就等于两个 Pi",
    position: "fao-act、urea-3、gly-7 的产物。",
    flows: "由 ATP→AMP + PPi、UTP 转移等反应放出；立即被焦磷酸酶水解成 2 Pi，推动反应单向。",
    whyHere: "它一水解放出两个 Pi，等于把 ATP 的两个高能键一次性彻底花掉，反应因此不可逆。",
    sources: [
      "fao.json · steps[fao-act].significance",
      "urea.json · steps[urea-3].significance",
      "glycogen.json · steps[gly-7]",
      "urea.json · entities[ppi].ionization",
    ],
  },

  utp: {
    id: "utp",
    role: "糖原合成专用的活化核苷酸",
    brief: "把 G1P 变成 UDP-葡萄糖",
    position: "糖原合成 gly-7 底物；UDP-葡萄糖焦磷酸化酶的底物。",
    flows: "在 gly-7 提供三磷酸：G1P 变 UDP-葡萄糖并放出 PPi；去路进糖原合酶。",
    whyHere: "活化糖需要好的离去基团：UTP 把 G1P 的 C1 抬到 UDP-葡萄糖能级，糖原合酶才接得上。",
    sources: [
      "glycogen.json · steps[gly-7] / steps[gly-8]",
      "glycogen.json · entities[utp].note / ionization",
    ],
  },

  udp: {
    id: "udp",
    role: "糖原合酶反应后的空载核苷酸",
    brief: "糖链接上后就离开",
    position: "糖原合成 gly-8 产物；UDP-葡萄糖的载体部分。",
    flows: "由糖原合酶把葡萄糖接到非还原端后释放；去路可再磷酸化成 UTP，回到 gly-7 循环使用。",
    whyHere: "它只是载体：葡萄糖一接上就离开，UDP 可再生回 UTP，所以每接一个糖只净耗一个活化糖。",
    sources: [
      "glycogen.json · steps[gly-7] / steps[gly-8]",
      "glycogen.json · entities[udp].note / ionization",
    ],
  },

  // ---------- 第四批 18 个（β-氧化 / FAS / 氨基酸转氨） ----------

  carn: {
    id: "carn",
    role: "把长链酰基背过内膜的载体",
    brief: "没有它长链进不了基质",
    position: "fao-shuttle 的核心载体；CPT1 的底物、CPT2 的产物。",
    flows: "由赖氨酸与甲硫氨酸合成，也可摄入；在胞质与脂酰-CoA 换酰基，经 CACT 过膜，基质内交还。",
    whyHere: "长链酰基-CoA 不能穿过内膜，必须换成肉碱载体；短链能走别的转运，长链只认这一条。",
    sources: [
      "fao.json · steps[fao-shuttle].significance / equation",
      "fao.json · entities[carn].note",
      "comparisonConfig.ts · fao part[carn].sourceNote",
    ],
  },

  acylcarn: {
    id: "acylcarn",
    role: "过内膜时的酰基载体形态",
    brief: "只负责搬，不参与氧化",
    position: "fao-shuttle 的中间物；CPT1 产物，CPT2 底物。",
    flows: "由脂酰-CoA + 肉碱（CPT1）生成；经 CACT 过膜，在基质侧被 CPT2 换回酰基。",
    whyHere: "换成肉碱才带得动长链酰基：把不可溶的脂酰-CoA 变成可过膜的阳离子，CPT1 因此是限速闸。",
    sources: [
      "fao.json · steps[fao-shuttle].significance / equation",
      "comparisonConfig.ts · fao part[acylcarn].sourceNote",
    ],
  },

  "acylcoa-c16": {
    id: "acylcoa-c16",
    role: "β-氧化的起点底物，C16 硫酯",
    brief: "活化过的棕榈酸",
    position: "fao-1 底物；ACAD 脱氢的底物；活化步 fao-act 的产物。",
    flows: "由棕榈酸 + CoA + ATP（ACSL）生成；经肉碱穿梭入基质，被 ACAD 脱氢成烯酰-CoA。",
    whyHere: "游离脂肪酸不溶于水也不进膜，必须先变成硫酯才能被酶识别；硫酯同时把 C1 活化。",
    sources: [
      "fao.json · steps[fao-act].significance / equation",
      "fao.json · steps[fao-1].significance",
      "comparisonConfig.ts · fao part[acylcoa-c16].sourceNote / caveat",
    ],
  },

  "enoyl-c16": {
    id: "enoyl-c16",
    role: "脱氢后的 C16 烯酰硫酯",
    brief: "反式双键等着加水",
    position: "fao-1 产物、fao-2 底物；ACAD 与 EH 之间。",
    flows: "由棕榈酰-CoA 脱氢（ACAD，交 FAD）生成；去路加水成 L-3-羟基棕榈酰-CoA。",
    whyHere: "脱氢把电子交给 FAD 而不是 NAD⁺：C16 的氧化电位不够还原 NAD⁺，只能由 FAD 收。",
    sources: [
      "fao.json · steps[fao-1].significance / steps[fao-2].significance",
      "comparisonConfig.ts · fao part[enoyl-c16].sourceNote / caveat",
    ],
  },

  "hydroxy-c16": {
    id: "hydroxy-c16",
    role: "水化后的 L-构型羟酰硫酯",
    brief: "只有 L-型才能继续",
    position: "fao-2 产物、fao-3 底物；HADH 的底物。",
    flows: "由烯酰-CoA 加水（EH）生成；去路脱氢成 3-酮棕榈酰-CoA（HADH，产 NADH）。",
    whyHere: "水化必须是反式加成，才得到 L-3-羟基；β-氧化的 HADH 只认 L 型，D 型要另找酶。",
    sources: [
      "fao.json · steps[fao-2].significance / steps[fao-3].significance",
      "comparisonConfig.ts · fao part[hydroxy-c16].sourceNote / caveat",
    ],
  },

  "keto-c16": {
    id: "keto-c16",
    role: "第二次脱氢的酮酰硫酯",
    brief: "硫解前的最后一步",
    position: "fao-3 产物、fao-4 底物；ACAA2 硫解酶的底物。",
    flows: "由 L-3-羟基棕榈酰-CoA 脱氢（HADH）生成；硫解成肉豆蔻酰-CoA + 乙酰-CoA。",
    whyHere: "β-酮硫酯的 C2–C3 键被硫解酶切开：硫酯与酮基双重拉电子，这个键才够弱、能被硫解。",
    sources: [
      "fao.json · steps[fao-3].significance / steps[fao-4].significance",
      "comparisonConfig.ts · fao part[keto-c16].sourceNote / caveat",
    ],
  },

  "acylcoa-c14": {
    id: "acylcoa-c14",
    role: "一轮循环后缩短 2C 的产物",
    brief: "下一轮从头再来",
    position: "fao-4 产物；下一轮 fao-1 的底物；ACAA2 的产物。",
    flows: "由 C16 酮酰-CoA 硫解（ACAA2）生成，放出乙酰-CoA；去路是重新进 fao-1。",
    whyHere: "每轮净缩 2C，链长靠硫解逐轮递减；C14 不是终点，只是第 2 轮脱氢的起点。",
    sources: [
      "fao.json · steps[fao-4].significance / equation",
      "comparisonConfig.ts · fao part[acylcoa-c14].caveat / sourceNote",
    ],
  },

  fa: {
    id: "fa",
    role: "脂肪里储量最大的 C16 脂肪酸",
    brief: "先交 2 个高能键才进门",
    position: "fao-act 底物；ACSL 的底物；脂肪分解释放的游离脂肪酸。",
    flows: "由脂肪酶水解甘油三酯释放，或由 FAS 的 TE 水解释放；去路经 ACSL 活化成棕榈酰-CoA。",
    whyHere: "游离脂肪酸不能自由过膜、也不被酶识别；活化是唯一入口，且一进门就花掉 2 个高能键。",
    sources: [
      "fao.json · steps[fao-act].significance / equation",
      "comparisonConfig.ts · fao part[fa].sourceNote",
      "fas.json · steps[fas-te].significance",
    ],
  },

  "fas-c2": {
    id: "fas-c2",
    role: "FAS 的 C2 引物，挂在 ACP 上",
    brief: "第一轮只接一个 C2",
    position: "fas-ks 底物；由乙酰-CoA 经 MAT 转到 ACP；环的起点。",
    flows: "由乙酰-CoA 把酰基交给 ACP（MAT）生成；去路与丙二酰-ACP 缩合成 C4 酮酰-ACP。",
    whyHere: "引物必须以 ACP 硫酯形式出现：KS 只接 ACP 上的酰基，不认游离乙酰-CoA。",
    sources: [
      "fas.json · steps[fas-ks].significance",
      "fas.json · steps[fas-acc].significance",
      "comparisonConfig.ts · fas part[fas-c2].sourceNote",
    ],
  },

  "fas-c4-keto": {
    id: "fas-c4-keto",
    role: "第一轮缩合后的 C4 酮酰",
    brief: "缩合的产物，要还原两次",
    position: "fas-ks 产物、fas-kr 底物；KS 与 KR 之间。",
    flows: "由 C2 引物 + 丙二酰-ACP 缩合生成，放出 CO₂ 与 ACP；去路被 KR 还原成 D-3-羟基。",
    whyHere: "缩合是环里唯一增碳的一步：新 C2 来自丙二酰，留下的酮基正是后续两步还原要打的靶子。",
    sources: [
      "fas.json · steps[fas-ks].significance / equation",
      "comparisonConfig.ts · fas part[fas-c4-keto].caveat / sourceNote",
    ],
  },

  "fas-c4-oh": {
    id: "fas-c4-oh",
    role: "FAS 的 D-型羟酰中间物",
    brief: "构型与 β-氧化相反",
    position: "fas-kr 产物、fas-dh 底物；KR 与 DH 之间。",
    flows: "由 C4 酮酰-ACP 还原（KR，耗 NADPH）生成；去路脱水成反式-Δ²-丁烯酰-ACP。",
    whyHere: "FAS 的 KR 只生成 D-3-羟基：与 β-氧化的 L 型镜像，两条通路因此不能共用中间物。",
    sources: [
      "fas.json · steps[fas-kr].significance / equation",
      "comparisonConfig.ts · fas part[fas-c4-oh].caveat",
    ],
  },

  "fas-c4-enoyl": {
    id: "fas-c4-enoyl",
    role: "脱水后的 C4 反式烯酰，ER 的底物",
    brief: "再还原一次就闭环",
    position: "fas-dh 产物、fas-er 底物；DH 与 ER 之间。",
    flows: "由 D-3-羟基丁酰-ACP 脱水（DH，生成反式-Δ²）生成；去路被 ER 还原成丁酰-ACP。",
    whyHere: "反式-Δ² 双键是 ER 的唯一底物；DH 只造这一种构型，方向与 β-氧化的水化相反。",
    sources: [
      "fas.json · steps[fas-dh].significance / equation",
      "comparisonConfig.ts · fas part[fas-c4-enoyl].caveat",
    ],
  },

  "fas-c4-acyl": {
    id: "fas-c4-acyl",
    role: "第一轮收口后的饱和 C4",
    brief: "回到 KS 再来一轮",
    position: "fas-er 产物；下一轮 fas-ks 的底物；环的收口产物。",
    flows: "由反式烯酰-ACP 还原（ER，耗 NADPH）生成；去路回到 KS，与下一个丙二酰缩合。",
    whyHere: "只有还原回饱和链，KS 才认它作下一轮引物；ER 因此是四步环的收口，也是每轮 +2C 的落点。",
    sources: [
      "fas.json · steps[fas-er].significance / equation",
      "comparisonConfig.ts · fas part[fas-c4-acyl].caveat",
    ],
  },

  "fas-c16-acyl": {
    id: "fas-c16-acyl",
    role: "链长到 C16、等待 TE 水解的酰基-ACP",
    brief: "等 TE 决定放不放行",
    position: "fas-te 底物；7 轮循环后的产物；TE 的长度选择位点。",
    flows: "由第 7 轮 ER 还原生成；去路由 TE 水解，释放棕榈酸 + ACP。",
    whyHere: "C16 不是四步环自动停，而是 TE 在这个长度水解；链长由酶的选择性决定，环本身不设上限。",
    sources: [
      "fas.json · steps[fas-te].significance / equation",
      "comparisonConfig.ts · fas part[fas-c16-acyl].caveat / sourceNote",
    ],
  },

  ala: {
    id: "ala",
    role: "肌→肝的氮与碳双载体",
    brief: "转氨一次，碳进糖异生",
    position: "amino aa-1 底物；ALT 的底物；糖异生的上游前体。",
    flows: "由丙酮酸 + 谷氨酸转氨（ALT）生成；经血运到肝，脱氨成丙酮酸进糖异生，氨进尿素循环。",
    whyHere: "它把肌肉用不完的碳和氮打包成中性分子运送，肝一次转氨就同时拿到糖异生的底物和氨。",
    sources: [
      "amino.json · steps[aa-1].significance / equation",
      "comparisonConfig.ts · amino step[aa-1].physiology",
      "gluconeogenesis.json · entities[ala]",
    ],
  },

  glu: {
    id: "glu",
    role: "氨基的中央集散分子",
    brief: "转氨都拿它当供体",
    position: "aa-1 / aa-2 / aa-5 产物；aa-3 底物；aa-4 产物。",
    flows: "由 α-KG 接受氨基（ALT/AST/BCAT），或由谷氨酰胺水解生成；去路 GLDH 放氨。",
    whyHere: "它是唯一能直接把氨交给 GLDH 的氨基酸：其他氨基酸的氨都要先转给它，再统一释放。",
    sources: [
      "amino.json · steps[aa-1] / steps[aa-2] / steps[aa-3] / steps[aa-4]",
      "amino.json · entities[glu].formula / ionization",
    ],
  },

  gln: {
    id: "gln",
    role: "氨的无毒运输形式",
    brief: "多装一个氮，送到肝/肾",
    position: "amino aa-4 底物；GLS1 的底物；肝、肾的氨来源。",
    flows: "由谷氨酸 + NH₃（谷氨酰胺合成酶）生成；去路被 GLS1 水解成谷氨酸 + NH₄⁺，进尿素循环。",
    whyHere: "游离氨不能进血，谷氨酰胺多背一个氮且中性；到肝/肾再水解，氨就有了安全运输路径。",
    sources: [
      "amino.json · steps[aa-4].significance / equation",
      "amino.json · entities[gln].formula / ionization",
      "urea.json · entities[nh3].note",
    ],
  },

  leu: {
    id: "leu",
    role: "不能生糖、只能生酮的氨基酸",
    brief: "氨基交给 α-KG 就完事",
    position: "amino aa-5 底物；BCAT2 的底物；生酮支路的起点。",
    flows: "由食物蛋白分解供给；经 BCAT2 转氨成 α-酮异己酸，碳骨架去酮体与乙酰-CoA。",
    whyHere: "亮氨酸没有生糖出口：碳只能进酮体与脂肪酸，这是生酮氨基酸的定义，也是生糖与否的分界。",
    sources: [
      "amino.json · steps[aa-5].significance / equation",
      "amino.json · entities[leu].formula / ionization",
    ],
  },

  // ── 第五批：胆固醇链 9 个 + 氨基酸 6 个 ──────────────────────

  mevalonate: {
    id: "mevalonate",
    role: "胆固醇合成的限速产物",
    brief: "他汀就把这一步卡住",
    position: "ch-3 产物、ch-4 底物；HMGCR 之后的第一站。",
    flows: "由 HMG-CoA 耗 2 NADPH 还原生成；去路经 MVK 磷酸化成甲羟戊酸-5-磷酸。",
    whyHere:
      "HMGCR 是全通路限速步、也是他汀靶点：糖与脂肪酸都走别的路，卡住它能整体关掉甾醇合成。",
    sources: [
      "cholesterol.json · steps[ch-3].significance / equation / enzyme",
      "cholesterol.json · steps[ch-4].equation",
      "cholesterol.json · entities[mevalonate].note / chargeBasis",
      "comparisonConfig.ts · CHOLESTEROL_CONFIG.footerNote（Lehninger 8e Ch.21）",
    ],
  },

  mev5p: {
    id: "mev5p",
    role: "甲羟戊酸的第一道磷酸化产物",
    brief: "还要再磷酸化一次",
    position: "ch-4 产物、ch-5 底物；MVK 与 PMVK 之间。",
    flows: "由甲羟戊酸 + ATP 磷酸化 C5 羟基生成（MVK）；去路 PMVK 再磷酸化 C3 羟基。",
    whyHere:
      "只磷酸化 C5 的伯羟基，C3 叔羟基留到下一步：顺序不能反，否则 MVD 没有可消除的离去基团。",
    sources: [
      "cholesterol.json · steps[ch-4].significance / equation",
      "cholesterol.json · steps[ch-5].significance / equation",
      "cholesterol.json · entities[mev5p].note / chargeBasis",
    ],
  },

  mev5pp: {
    id: "mev5pp",
    role: "MVD 脱羧前的二磷酸中间物",
    brief: "脱羧就放出 IPP",
    position: "ch-5 产物、ch-6 底物；MVD 脱羧-消除前的最后形态。",
    flows: "由 mev5p 再耗 1 ATP 磷酸化 3-OH 生成（PMVK）；去路 MVD 脱羧-消除成 IPP。",
    whyHere:
      "3-羟基磷酸化后才给 MVD 一个好离去基团：β-消除要同时脱 CO₂ 与磷酸。",
    sources: [
      "cholesterol.json · steps[ch-5].significance / equation",
      "cholesterol.json · steps[ch-6].significance / equation",
      "cholesterol.json · entities[mev5pp].note / chargeBasis",
    ],
  },

  ipp: {
    id: "ipp",
    role: "所有异戊二烯单位的 C5 砌块",
    brief: "先异构才能当供体",
    position: "ch-6 产物；ch-7 底物；ch-8/9 缩合的亲核体。",
    flows: "由 mev5pp 脱羧生成；去路异构为 DMAPP，或与 DMAPP/GPP 缩合成 GPP/FPP。",
    whyHere:
      "IPP 的双键不在末端，只有异构成 DMAPP 才有烯丙基型碳正离子；它是下游缩合的必需前体。",
    sources: [
      "cholesterol.json · steps[ch-6].equation",
      "cholesterol.json · steps[ch-7] / steps[ch-8] / steps[ch-9].significance",
      "cholesterol.json · entities[ipp].note / chargeBasis",
    ],
  },

  dmapp: {
    id: "dmapp",
    role: "IPP 的烯丙基异构体",
    brief: "缩合时它出亲核碳",
    position: "ch-7 产物；ch-8 的烯丙基供体；与 IPP 缩合成 GPP。",
    flows: "由 IPP 经 IDI1 异构生成；去路与 IPP 头尾缩合成 GPP，再延到 FPP。",
    whyHere:
      "DMAPP 的烯丙基焦磷酸是缩合反应的亲核供体；IPP 本身不能直接进攻，必须先 IDI1 异构。",
    sources: [
      "cholesterol.json · steps[ch-7].significance / equation",
      "cholesterol.json · steps[ch-8].significance / equation",
      "cholesterol.json · entities[dmapp].note / chargeBasis",
    ],
  },

  squalene: {
    id: "squalene",
    role: "两个 FPP 头对头接成的 C30 烯烃",
    brief: "甾醇骨架的原料",
    position: "ch-10 产物、ch-11 底物；FDFT1 之后、SQLE 之前。",
    flows: "由 2 分子 FPP 缩合并耗 1 NADPH 生成（FDFT1）；去路被 SQLE 环氧化。",
    whyHere:
      "两个 C15 必须头对头缩合，才能得到 C30 的对称骨架；这一步定下碳数，后续环化不再加碳。",
    sources: [
      "cholesterol.json · steps[ch-10].significance / equation",
      "cholesterol.json · steps[ch-11].equation",
      "cholesterol.json · entities[squalene].note / chargeBasis",
    ],
  },

  oxidosqualene: {
    id: "oxidosqualene",
    role: "环化前被环氧化的 C30 中间物",
    brief: "LSS 从这里起爆",
    position: "ch-11 产物、ch-12 底物；SQLE 与 LSS 之间。",
    flows: "由角鲨烯 + O₂ + NADPH 生成（SQLE）；去路 LSS 开环、重排成羊毛甾醇。",
    whyHere:
      "环氧把末端双键变成质子可进攻的点：LSS 只需一个 H⁺ 起爆，就能让 C30 链连环成四环。",
    sources: [
      "cholesterol.json · steps[ch-11].significance / equation",
      "cholesterol.json · steps[ch-12].significance / equation",
      "cholesterol.json · entities[oxidosqualene].note / chargeBasis",
    ],
  },

  lanosterol: {
    id: "lanosterol",
    role: "环化后的第一个四环甾醇",
    brief: "C30，还要削成 C27",
    position: "ch-12 产物、ch-13 底物；LSS 的产物、修饰簇的起点。",
    flows: "由 2,3-环氧角鲨烯经 LSS 环化生成；去路经 CYP51A1 等修饰簇逐步脱甲基成胆固醇。",
    whyHere:
      "它是环化终点、也是修饰簇起点：C30 到 C27 要连续去甲基、还原、引双键。",
    sources: [
      "cholesterol.json · steps[ch-12].significance / equation",
      "cholesterol.json · steps[ch-13].significance / equation",
      "cholesterol.json · entities[lanosterol].note / chargeBasis",
    ],
  },

  cholesterol: {
    id: "cholesterol",
    role: "膜脂与甾体激素的共用母核",
    brief: "C27 的终产物",
    position: "ch-13 产物；修饰簇的终点；膜胆固醇的来源。",
    flows: "由羊毛甾醇经 CYP51A1 等酶簇生成；去路是膜、胆汁酸与类固醇激素，也可酯化储存。",
    whyHere:
      "C27 四环是膜脂与激素的共同骨架；终点受 LDL 摄取与 ACAT 酯化反馈压制，合成不会无限开。",
    sources: [
      "cholesterol.json · steps[ch-13].significance / equation",
      "cholesterol.json · entities[cholesterol].note / chargeBasis",
      "comparisonConfig.ts · CHOLESTEROL_CONFIG.footerNote（Lehninger 8e Ch.21）",
    ],
  },

  kic: {
    id: "kic",
    role: "亮氨酸转氨后的 α-酮酸",
    brief: "BCKDH 的下一个底物",
    position: "aa-5 产物；BCAT2 之后；BCKDH 的底物。",
    flows: "由亮氨酸转氨生成（BCAT2）；去路 BCKDH 氧化脱羧，碳骨架进酮体与乙酰-CoA。",
    whyHere:
      "支链 α-酮酸不能排出：BCKDH 是不可逆的氧化脱羧闸，缺酶时亮氨酸碳氮堆积（MSUD）。",
    sources: [
      "amino.json · steps[aa-5].significance / equation",
      "amino.json · entities[kic].chargeBasis",
      "amino-acid/skeleton.json · nodes[clin-msud]",
      "comparisonConfig.ts · AMINO_CONFIG.footerNote（Lehninger 8e Ch.18）",
    ],
  },

  hcy: {
    id: "hcy",
    role: "甲硫氨酸循环的岔口，也是转硫入口",
    brief: "CBS 把硫转给丝氨酸",
    position: "aa-7 底物；CBS 的底物；转硫作用的入口。",
    flows: "由甲硫氨酸脱甲基供给；去路经 CBS 与丝氨酸合成胱硫醚，或再甲基化回甲硫氨酸。",
    whyHere:
      "同型半胱氨酸是甲硫氨酸与半胱氨酸之间的唯一路口；CBS 缺失时它蓄积（同型半胱氨酸尿症）。",
    sources: [
      "amino.json · steps[aa-7].significance / equation",
      "amino.json · entities[hcy].chargeBasis",
      "amino-acid/skeleton.json · nodes[clin-cbs]",
      "comparisonConfig.ts · AMINO_CONFIG.footerNote（Lehninger 8e Ch.18）",
    ],
  },

  cystathionine: {
    id: "cystathionine",
    role: "转硫作用的中继，Cys 的硫从这里过",
    brief: "一半来自 Hcy，一半来自 Ser",
    position: "aa-7 产物；CBS 的产物；裂解后生半胱氨酸。",
    flows: "由高半胱氨酸 + 丝氨酸缩合生成（CBS）；去路裂解为半胱氨酸与 α-酮丁酸。",
    whyHere:
      "把高半胱氨酸的硫转给丝氨酸，是合成半胱氨酸的唯一途径；CBS 缺失堆积（同型半胱氨酸尿症）。",
    sources: [
      "amino.json · steps[aa-7].significance / equation",
      "amino.json · entities[cystathionine].chargeBasis",
      "amino-acid/skeleton.json · nodes[clin-cbs]",
    ],
  },

  ser: {
    id: "ser",
    role: "一碳单位与转硫共用的供体",
    brief: "CBS 的另一半底物",
    position: "aa-7 底物；CBS 与 SHMT 共用；转硫反应的丝氨酸供体。",
    flows: "由食物蛋白供给；去路与高半胱氨酸合成胱硫醚（CBS），也供一碳单位（SHMT）。",
    whyHere:
      "丝氨酸的侧链羟基正是 CBS 接受的位点；没有它，高半胱氨酸的硫就没有出口，只能一直堆着。",
    sources: [
      "amino.json · steps[aa-7].significance / equation",
      "amino.json · entities[ser].chargeBasis",
      "comparisonConfig.ts · AMINO_CONFIG.footerNote（Lehninger 8e Ch.18）",
    ],
  },

  phe: {
    id: "phe",
    role: "芳香族氨基酸，苯丙氨酸只能变成酪氨酸",
    brief: "PAH 是它唯一出口",
    position: "aa-6 底物；PAH 的底物；芳香族分解的起点。",
    flows: "由食物蛋白分解供给；去路经 PAH 羟化成酪氨酸，再走 Tyr 的分解支路。",
    whyHere:
      "Phe 不能直接脱氨基或开环：必须先由 PAH 羟化成 Tyr，这也是苯丙酮尿症（PKU）的关口。",
    sources: [
      "amino.json · steps[aa-6].significance / equation",
      "amino.json · entities[phe].chargeBasis",
      "amino-acid/skeleton.json · nodes[clin-pku]",
      "comparisonConfig.ts · AMINO_CONFIG.footerNote（Lehninger 8e Ch.18）",
    ],
  },

  tyr: {
    id: "tyr",
    role: "生糖兼生酮的芳香族氨基酸",
    brief: "Phe 羟化后的下游",
    position: "aa-6 产物；Tyr 分解支路的起点；碳骨架可进 TCA 与酮体。",
    flows: "由苯丙氨酸经 PAH 羟化生成；去路延胡索酸与乙酰乙酸，分别进 TCA 与酮体。",
    whyHere:
      "Tyr 的酚环可被羟化、开环，最终裂成延胡索酸与乙酰乙酸；Phe 必须先变成它才能走到这一步。",
    sources: [
      "amino.json · steps[aa-6].significance / equation",
      "amino.json · entities[tyr].chargeBasis",
      "comparisonConfig.ts · AMINO_CONFIG.footerNote（Lehninger 8e Ch.18）",
    ],
  },
};

export const COFACTOR_NOTES: Record<string, MoleculeNote> = {
  atp: {
    id: "atp",
    role: "细胞通用能量货币，也是全站记账单位",
    brief: "投入与产出都按它记账",
    position: "糖酵解第 1 站与脂肪酸活化的投入；尿素循环 CPS1 用 2、ASS 用 1。",
    flows: "由底物水平磷酸化（PGK、PK）与氧化磷酸化生成；去路是激酶磷酸化与尿素循环。",
    whyHere: "全站能量账只有两个口径：ATP 分子数与高能键数，都靠它统一记。",
    sources: [
      "urea.json · energyLedger.nominalAtp / highEnergyBonds / entries",
      "urea.json · entities[atp].note / ionization",
      "fao.json · steps[fao-act].significance",
      "glycolysis.json · steps[gk-1]",
    ],
  },
  nadh: {
    id: "nadh",
    role: "2 e⁻ 的还原当量载体，走复合体 I",
    brief: "醇氧化交给它，不交给 FAD",
    position: "β-氧化第 3 站产物；PDH 与 TCA 的产物；复合体 I 底物。",
    flows: "由醇氧化（β-氧化、PDH）生成；去路复合体 I → Q 池 → 氧化磷酸化（2.5 ATP 当量）。",
    whyHere: "醇氧化的电位够还原 NAD⁺；FAD 只接更硬的氧化，二者构成氧化剂的分级。",
    sources: [
      "fao.json · steps[fao-3].significance",
      "fas.json · steps[fas-pdh].significance",
      "oxphos.json · steps[oxphos-e]",
      "fas.json · entities[nadh].ionization",
    ],
  },
};

export const REQUIRED_IDS: string[] = [...MOLECULE_REGISTRY.map((entry) => entry.key), ...COFACTOR_IDS];

export const COFACTOR_WHY = "辅因子：不是结构对照页的 part，但参与反应计量";
