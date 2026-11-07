# 非糖酵解通路 3D 资产 · 清单与落地记录（第一至五轮）

生成日期：2026-11-07 ｜ 范围：`src/data` 中 `threeD.status === "pending"` 的 **31 个步骤**（fao 6 + fas 8 + 糖异生 4 + ppp 8 + urea 5；不含 5 条通路级汇总条目）。第二轮新增落地 gn-11 / urea-3 / ppp-o3 / fao-3；第三轮新增落地 fao-act / fao-4 / ppp-n3 / gn-2 / gn-9 / urea-1；第四轮新增落地 fas-pdh / fas-acc / ppp-n5；第五轮给管线加 `domain` / `focusResidues` / `focusLigandInstance`，并用 8VM0 落地 fas-er / fas-kr。
核验方式：逐条请求 RCSB Data API（`/core/entry`、`/core/polymer_entity`、`/core/nonpolymer_entity`）确认条目存在、标题、实验方法、分辨率、物种、链、共配体；无候选的步骤用 UniProt REST 的 PDB 交叉引用补齐后再核验。所有登记候选均存在（无 404）；既有 **6 处身份/状态误标**见下表，第三至五轮新增问题见第二节对应小节。

---

## 一、31 个 pending 步骤全貌

状态说明：`已落地` = 本轮已出 holo/apo/SDF/pocket/meta 并进 manifest；`可做未做` = 结构可用但本轮未选；`暂不做` = 结构缺失或质量/配体证据不足，理由列在第五节。

| # | 步骤 | 酶（同工酶/基因） | EC | 已核验候选（方法 / Å / 物种；配体） | 状态 |
|---|---|---|---|---|---|
| 1 | fao-act | 脂酰-CoA 合成酶（ACSM2A，中链；非 ACSL1） | 6.2.1.3 | 3EQ6 X-ray 2.4 人 **L64P**（SEQADV 已核）；AMP + BCO（丁酰-CoA，产物侧） | **已落地** |
| 2 | fao-shuttle | CPT1 / CACT / CPT2 | 2.3.1.21 | 2RCU 1.78 大鼠；BUJ + BOG；2H4T 1.9 大鼠；D12 | 暂不做 |
| 3 | fao-1 | 中链酰基-CoA 脱氢酶 MCAD（ACADM） | 1.3.8.7 | 1EGC 2.6 人 T255E/E376G；CO8 + FAD；4P13 1.73 人 K304E；FAD；2UXW 1.45 人 VLCAD；TH3 + FAD | **已落地** |
| 4 | fao-2 | 短链烯酰-CoA 水合酶 ECHS1 | 4.2.1.17 | 2HW5 2.55 人；COO + MG；1DUB 2.5 大鼠；CAA；**1HZD 实为 AUH，非 ECHS1** | **已落地** |
| 5 | fao-3 | 3-羟酰-CoA 脱氢酶 HADH | 1.1.1.35 | **1F0Y 1.8 人；CAA + NAD**；无野生型 apo（1F14/2HDH 均带工程突变） | **已落地** |
| 6 | fao-4 | β-酮脂酰-CoA 硫解酶 ACAA2 | 2.3.1.16 | 4C2J 2.0 人 ACAA2；COA（游离）；CSO 修饰 Cys；2IIK 2.55 人为过氧化物酶体 ACAA1（不同酶） | **已落地** |
| 7 | fas-pdh | 丙酮酸脱氢酶复合体 E1/E2/E3 | 1.2.4.1 | **1NI4 1.95 人 E1（α₂β₂）；TPP + MG（PDB 标于 C 链、配位 A 链活性位点）+ K（滤）**；2OZL 1.9 人 S264E | **已落地** |
| 8 | fas-shuttle | CS → CIC → ACLY | 2.3.3.8 / 4.1.3.8 | 补核 ACLY：3MWD 2.1 人截短；CIT；8G1E 2.8 人 D1026A 产物态；6UUW 2.85 人 E599Q + 类似物 | 暂不做 |
| 9 | fas-acc | 乙酰-CoA 羧化酶 ACC（ACACA） | 6.4.1.2 | **2YL2 2.3 人 BC 域（apo，无 HETATM 配体、无 BTN）**；8XKZ 2.55 cryo-EM 为 citrate-induced ACC1 filament 核心区（非独立 BC 域，不采用） | **已落地** |
| 10 | fas-ks | FASN KS 域 | 2.3.1.41 | 8VM0 cryo-EM 3.3 人全酶；NDP 归属 KR/ER，无 KS 域特异配体 | 暂不做 |
| 11 | fas-kr | FASN KR 域 | 1.1.1.100 | **8VM0 全酶；KR entity 1896–2150，NDP 2602 距 KR 活性位点 2.57 Å；只显示 KR 域** | **已落地** |
| 12 | fas-dh | FASN DH 域 | 4.2.1.59 | 无独立 DH 域结构；8VM0 仅全酶上下文 | 暂不做 |
| 13 | fas-er | FASN ER 域 | 1.3.1.39 | **8VM0 全酶；ER entity 1667–1895，NDP 2601 距 ER 活性位点 2.33 Å；只显示 ER 域** | **已落地** |
| 14 | fas-te | FASN TE 域 | 3.1.2.14 | 1XKT 2.6 人 TE 域；无配体 | 暂不做 |
| 15 | gn-1 | 丙酮酸羧化酶 PC | 6.4.1.1 | 3BG3 2.8 人**缺失 BC 域**；PYR + BTI + MN；3TW6 2.4 **Rhizobium etli T882A**；PAE（膦酰乙酸，非丙酮酸） | **已落地** |
| 16 | gn-2 | PEP 羧激酶 PEPCK1 | 4.1.1.32 | 1KHB 1.854 人；GCP（不可水解 GTP 类似物）+ MN；**1KHG 2.34 人 apo（MN）**；1KHE 2.4；1M51 2.25 抑制剂 | **已落地** |
| 17 | gn-9 | 果糖-1,6-二磷酸酶-1 FBP1 | 3.1.3.11 | 1FTA 2.3 人；AMP（变构抑制，无底物）；**5LDZ 2.2 人 apo**；1EYI 2.32 **猪**；F6P + MG + PO4；2Y5K 2.1 人抑制剂 | **已落地** |
| 18 | gn-11 | 葡萄糖-6-磷酸酶 G6PC1 | 3.1.3.9 | **9JTM 2.9 人 H176N；G6P（P5S 滤）+ 9J7V 3.3 人 apo（POV 滤）**；9J7U 3.14 H176A；BG6 | **已落地** |
| 19 | ppp-o1 | 葡萄糖-6-磷酸脱氢酶 G6PD | 1.1.1.49 | 7SNI cryo-EM 2.5 人 **D200N**；NAP + BG6；2BH9 2.5 人缺失变体；NAP | **已落地** |
| 20 | ppp-o2 | 6-磷酸葡糖酸内酯酶 6PGL | 3.1.1.31 | 3CH7 2.29 **利什曼原虫**；1VL1 1.55 **嗜热菌**；CIT | 暂不做 |
| 21 | ppp-o3 | 6-磷酸葡糖酸脱氢酶 6PGD | 1.1.1.44 | **2JKV 2.53 人；NAP（仅辅酶，无 6PG）+ 4GWG 1.39 人 apo**；2W90 2.2 **Geobacillus**；6PG | **已落地** |
| 22 | ppp-n1 | 核糖-5-磷酸异构酶 RPI | 5.3.1.6 | 2VVP 1.65 **结核分枝杆菌**；R5P + 5RP | 暂不做 |
| 23 | ppp-n2 | 核酮糖-5-磷酸 3-差向异构酶 RPE | 5.1.3.1 | 3OVQ 2.0 人；5RP；3OVP 1.7 人 apo | **已落地** |
| 24 | ppp-n3 | 转酮醇酶 TKT（第一接力） | 2.2.1.1 | 4KXV 0.97 人；TPP + DX5（还原型拟底物）；3MOS 1.75 人；TPP | **已落地** |
| 25 | ppp-n4 | 转醛醇酶 TALDO1 | 2.2.1.2 | 1F05 2.45 人 apo；1ONR 1.87 **大肠杆菌** apo | 暂不做 |
| 26 | ppp-n5 | 转酮醇酶 TKT（第二接力） | 2.2.1.1 | **4KXV 0.97 人（复用 ppp-n3；独立目录 ppp-n5）**；TPP + DX5 | **已落地** |
| 27 | urea-1 | 氨甲酰磷酸合成酶 I CPS1 | 6.3.4.16 | 5DOT 2.4 人 apo（2 链）；5DOU 2.6 人（4 链）；ADP + NLG + MG | **已落地** |
| 28 | urea-2 | 鸟氨酸转氨甲酰酶 OTC | 2.1.3.3 | **1C9Y 1.9 人野生型；CP（NVA 滤除）**；1FVO 2.6 人 L101F/Q270R；CP；1OTH 1.85 人；PAO 类似物 | **已落地** |
| 29 | urea-3 | 精氨酸琥珀酸合成酶 ASS1 | 6.3.4.5 | **2NZ2 2.4 人；ASP + CIR（双真实底物；无 apo）** | **已落地** |
| 30 | urea-4 | 精氨酸琥珀酸裂解酶 ASL | 4.3.2.1 | 1AOS 4.2 人 apo；1K62 2.65 人 Q286R apo | 暂不做 |
| 31 | urea-5 | 精氨酸酶 1 ARG1 | 3.5.3.1 | 2ZAV 1.7 人 apo；2PHA 1.9 人 apo；3SJT 1.597 人抑制剂；1WVA 1.94 人抑制剂 | 暂不做 |

**统计（第五轮后）**：已落地 **21**；可做未做 **0**；暂不做 **10**（9 个既有 + fas-ks）。31 = 21 + 10，已全部收口；fas-ks 因无 KS 域特异配体维持 C 档，不再有"结构可行但被管线卡住"的条目。

### 数据层候选中的身份/状态误标（必须修正）

| 条目 | 数据层原写法 | 核实结果 |
|---|---|---|
| 1HZD | fao-2 的 "人源 apo" | 实为 **人 AUH 蛋白**（RNA 结合的同源蛋白），不是 ECHS1；不能当 ECHS1 apo |
| 2IIK | fao-4 的 "人 ACAA5 apo" | 实为 **人过氧化物酶体 ACAA1**（乙酰-CoA 酰基转移酶 1），不是 ACAA5 |
| 3TW6 | gn-1 的 "PAE 丙酮酸" | PAE 是**膦酰乙酸（丙酮酸类似物）**，且该结构为 **Rhizobium etli T882A 突变体**，非人源 |
| 3BG3 | gn-1 的 "全酶四聚体，双底物同框" | 标题明确为 **缺失生物素羧化酶（BC）域** 的人 PC；有 PYR + BTI + MN，但无 ATP/碳酸氢根 |
| 1EGC / 4P13 | fao-1 的 "人源真底物 / 高分辨 apo" | 两者分别是 **T255E/E376G** 与 **K304E** 突变体；apo 仍含 FAD |
| 3EQ6 | fao-act 的 "人源捕获态" | 实为 **L64P 工程突变体**（SEQADV 有 ENGINEERED MUTATION 记录） |

---

## 二、已落地的 21 个（限速酶 / 考点酶）

### 第一轮 6 个

选择依据：PPP 限速（G6PD）、β 氧化首步（MCAD）、β 氧化第二步（ECHS1）、尿素循环核心（OTC）、糖异生限速（PC）、PPP 非氧化支路且结构最干净（RPE）。

| 步骤 | holo | apo | 链选择 | 配体处理 |
|---|---|---|---|---|
| ppp-o1 G6PD | 7SNI（cryo-EM 2.5，D200N） | 7SNG（cryo-EM 2.8，WT） | 主链 B（口袋接触最多）；四聚体只取一条 | 保留 NAP（催化 + 结构 NADP 两个位点）与 BG6（G6P）；其余无 |
| fao-1 MCAD | 1EGC（X-ray 2.6，T255E/E376G） | 8SGP（cryo-EM 2.69，WT 肝 MCAD） | C + D：D 是界面亚基，贡献 14 个口袋残基 | 保留 CO8（辛酰-CoA，真实底物）与 FAD（必需辅基）；apo 保留 FAD 并标注 |
| urea-2 OTC | 1C9Y（X-ray 1.9，野生型） | —（static） | 单链 A；CP 结合位点在本亚基 | 保留 CP（氨甲酰磷酸，真实底物）；NVA（正缬氨酸，鸟氨酸类似物）按替身滤除；无第二底物真实坐标 |
| gn-1 PC | 7WTE（cryo-EM 3.3） | 7WTA（cryo-EM 3.9） | 主链 D（口袋接触 123 残基）；A/B 链较短不选 | ATP（底物，口袋内）；ACO（乙酰-CoA 变构激活剂，41 Å 外，输出但不参与口袋）；BTI 按生物素化赖氨酸修饰残基保留 |
| ppp-n2 RPE | 3OVQ（X-ray 2.0） | 3OVP（1.7） | 单链 A | 5RP（Ru5P，产物侧）；FE2 与 PEG 链（XPE）按结晶离子/添加剂滤除 |
| fao-2 ECHS1 | 2HW5（X-ray 2.55） | 8ZRU（cryo-EM 2.18） | 主链 C（其 COO 有 13 个口袋残基；B 链同名副本仅 1 个且与 C 几何重叠） | COO（巴豆酰-CoA，产物侧）；MG 按非必需结晶离子滤除 |

资产体积（gzip）：ppp-01 149 KB；fao-01 233 KB；urea-02 52 KB；gn-01 267 KB；ppp-n2 71 KB；fao-02 84 KB。单项最大 160 KB（gn-01/holo.pdb），全部远低于 5 MB 上限。

### 第二轮 4 个

| 步骤 | holo | apo | 链选择 | 配体处理 |
|---|---|---|---|---|
| gn-11 G6PC1 | 9JTM（cryo-EM 2.9，H176N） | 9J7V（cryo-EM 3.3，野生型） | 单链 A（口袋接触 39 残基） | 保留 G6P（真实底物）；P5S（共结晶磷脂）滤除；apo 的 POV 磷脂滤除 |
| urea-3 ASS1 | 2NZ2（X-ray 2.4） | —（static） | 单链 A（口袋接触 70 残基） | 保留 ASP（天冬氨酸）与 CIR（瓜氨酸），二者均为真实底物；Na⁺ 滤除 |
| ppp-o3 6PGD | 2JKV（X-ray 2.53） | 4GWG（X-ray 1.39） | A + B；B 为界面亚基（贡献 22 个口袋残基） | 保留 NAP（NADP⁺ 辅酶）；Cl⁻/SO₄²⁻ 滤除；无 6PG 底物坐标 |
| fao-3 HADH | 1F0Y（X-ray 1.8） | —（static） | B + A；A 贡献 3 个界面残基 | 保留 CAA（乙酰乙酰-CoA，产物侧）与 NAD（辅酶，18 Å 外仅输出不画）；无野生型 apo |

第二轮体积（gzip）：gn-11 100 KB；urea-03 65 KB；ppp-o3 221 KB；fao-03 93 KB；单项最大 148 KB（ppp-o3/holo.pdb）。

第二轮渲染实测：gn-11 2795/120463、gn-11 apo 2828/115566、urea-03 3227/82884、ppp-o3 7474/210446、ppp-o3 apo 3624/104247、fao-03 4635/139305，全部 PASS。

说明：OTC 最初选用 1FVO，但其 SEQADV 记录 L101F/Q270R 变异；复核后改用 **1C9Y**（人源野生型、1.9 Å、含真实 CP），1FVO/1EP9 仅作为备选保留在清单中。

### 第三轮 6 个

| 步骤 | holo | apo | 链选择 | 配体处理 |
|---|---|---|---|---|
| fao-act ACSM2A | 3EQ6（X-ray 2.4，L64P） | —（static） | 单链 A（口袋接触最多；B 链未达界面阈值） | 保留 BCO（丁酰-CoA，产物侧）与 AMP（产物）；无脂酰底物/ATP/PPi；L64P 为工程突变 |
| fao-4 ACAA2 | 4C2J（X-ray 2.0） | —（static） | 单链 D（口袋接触最多） | 保留 COA（游离辅酶 A，硫解产物）；CSO（S-羟基 Cys126）按修饰残基保留；EDO 滤除 |
| ppp-n3 TKT | 4KXV（X-ray 0.97） | —（static） | 单链 A（ASU 仅 1 链；功能性二聚体由对称性补全） | 保留 TPP（辅酶）与 DX5（D-木糖醇-5-磷酸，还原型类似物，共价中间体捕获态）；Ca²⁺/EDO 滤除 |
| gn-2 PEPCK1 | 1KHB（X-ray 1.854） | 1KHG（X-ray 2.34） | 单链 A | GCP（GMP-PCP，GTP 不可水解类似物）+ Mn²⁺（催化金属）；apo 保留 Mn²⁺；ACT/EDO 滤除 |
| gn-9 FBP1 | 1FTA（X-ray 2.3，AMP） | 5LDZ（X-ray 2.2，apo） | holo 单链 C；apo 单链 F | AMP（变构抑制剂，真实配体）；口袋为 AMP 变构位点，非催化中心；apo 的 Zn²⁺/SO₄²⁻/Cl⁻ 滤除 |
| urea-1 CPS1 | 5DOU（X-ray 2.6） | 5DOT（X-ray 2.4） | holo 单链 C；apo 单链 A | ADP（产物）+ NLG/NAG（N-乙酰-L-谷氨酸，变构激活剂）+ Mg²⁺（催化金属）；每链 2 个 ADP 位点、3 个 Mg²⁺，视图只画口袋相关实例；NAG 40 Å 外仅记录不画；K⁺/PO₄/Ni²⁺/甘油/EDO 滤除 |

第三轮体积（gzip）：fao-act 89 KB；fao-04 63 KB；ppp-n3 98 KB；gn-02 190 KB；gn-09 102 KB；urea-01 439 KB；单项最大 225 KB（urea-01/holo.pdb），全部远低于 5 MB 上限。

第三轮页面实测（Playwright + 无头 Edge，656×480 canvas，采样非白像素）：fao-act 21634、fao-4 16054、ppp-n3 23964、gn-2 20530 / apo 20416、gn-9 18547 / apo 4566、urea-1 30114 / apo 5379；6/6 PASS，3 个 two-state 往返正常，3 个 static 无切换控件，控制台无错误。

**第三轮新增身份/状态问题（均已写入 caveat）**：

- **fao-4 的酶名**：旧清单写作 ACAT1，但数据层与 4C2J 均为 **ACAA2**（P42765，线粒体 3-酮脂酰-CoA 硫解酶）；ACAT1（P24752）与过氧化物酶体 ACAA1/ACAA5 都不是本步酶。已按 ACAA2 落地并修正清单。
- **gn-2 序列差异**：1KHB/1KHG 相对 P35558 有 V267I/D586E/V597E（SEQADV `VARIANT`，非工程催化突变）；GCP 是 GTP 不可水解类似物，不是真实 GTP。
- **gn-9 序列冲突与配体范围**：1FTA 有 V11/A214/I316 三处 `CONFLICT`；该结构只有变构抑制剂 AMP，没有底物 FBP/F6P 或 Mg²⁺；人源 FBP1 无底物结合态实验结构。
- **urea-1 装配体差异**：5DOU 为 4 链 ASU（2.6 Å），5DOT 为 2 链 apo（2.4 Å）；两态来自不同装配体，视图各取 1 链，切换时取景会变化。
- **fao-act 与 ppp-n3 的配体侧**：3EQ6 为 AMP + 丁酰-CoA 产物侧且为 L64P 突变体；4KXV 的 DX5 是还原型木糖醇-5-磷酸类似物，不是真实酮糖底物。

### 第四轮 3 个

| 步骤 | holo | apo | 链选择 | 配体处理 |
|---|---|---|---|---|
| fas-pdh PDH E1 | 1NI4（X-ray 1.95，人 E1 α₂β₂） | —（static） | A + D：1 个 αβ 异二聚体（A=α，D=β）；C+B 为对称副本，活性位点在 α/β 界面 | TPP（辅酶）+ Mg²⁺（PDB 标于 C 链，实际配位 A 链 Asp167/Asn196/Tyr198 与 TPP，按 `crossChainLigands` 跨链保留）；K⁺ 滤除；MSE 修饰残基按蛋白保留 |
| fas-acc ACC1 BC 域 | 2YL2（X-ray 2.3，人 BC 域 apo） | —（static） | A + B：BC 域二聚体 | 无 HETATM 配体、无 BTN；pocket 为空、无 SDF；meta 标记 `noLigand: true` |
| ppp-n5 TKT 第二接力 | 4KXV（X-ray 0.97，人 TKT） | —（static） | 单链 A（ASU 仅 1 链） | TPP + DX5（同 ppp-n3）；独立目录 `ppp-n5` 与独立 stepId，不覆盖 ppp-n3 |

**管线新增能力**：① `noLigand` 模式（只裁蛋白链、跳过配体分类/`selectChains`/`pocketOf`，输出空 `pocket.json` 与 `meta.ligands=[]`）；② `crossChainLigands`（PDB 链标注与真实配位关系不一致时，按口袋相关性跨链取配体实例）。两项都不改 4.5 Å 口袋几何口径。

第四轮体积（gzip）：fas-pdh 108 KB（最大 76 KB holo.pdb）；fas-acc 77 KB（最大 42 KB holo.pdb）；ppp-n5 97 KB（最大 64 KB holo.pdb）；全部远低于 5 MB 上限。

第四轮页面实测（Playwright + 无头 Edge，656×480 canvas，采样非白像素）：fas-pdh 50725、fas-acc 49978、ppp-n5 184159；3/3 PASS。fas-pdh 抽屉 1 个（23 残基口袋），fas-acc 因空口袋抽屉不渲染，ppp-n5 抽屉 1 个（21 残基）；三者均无降级、无控制台错误。另核验 `ppp-n3` 与 `ppp-n5` 的 `assetDir` 与 `meta.stepId` 各自独立，复用结构未互相覆盖。

**第四轮核验修正**：

- **2YL2 无生物素**：旧清单写作"2YL2 2.3 人 BC 域；生物素"有误。2YL2 是 BC 域 apo 结构，A/B 链、observed 139–654，无任何 HETATM 配体（仅水）；生物素是 BCCP 域上共价连接的辅基，不在 BC 域晶体中。
- **8XKZ 不是独立 BC 域**：其标题为 citrate-induced human ACC1 filament 的 core region（cryo-EM 2.55 Å，C/D 链 + BTN），含全酶/丝状体上下文，不符合"只含 BC 域、不含 CT/BCCP"，故不采用。
- **1NI4 的 Mg²⁺ 链标注**：Mg²⁺ 在 PDB 中标注于 C 链（2331），但 3.2 Å 内的配位对象是 A 链 Asp167/Asn196/Tyr198 与 TPP（2330），属 A 活性位点；若按主链过滤会丢失该金属，故新增跨链配体规则保留。
- **1NI4 装配体**：α₂β₂ 四聚体，视图只取 A+D 一个 αβ 异二聚体；完整 E1 的另一对为 C+B，由晶体对称性补全，不代表 E2/E3。

### 第五轮 2 个（B 档域视图）

| 步骤 | holo | apo | 域 / 实例选择 | 口袋 |
|---|---|---|---|---|
| fas-er | 8VM0（cryo-EM 3.3，人 FASN 全酶） | —（static） | 只显示 **ER 1667–1895**（8VM0 entity；UniProt 1635–1863）；`focusLigandInstance = A/2601`；链 A | 22 残基 / 8 氢键 |
| fas-kr | 8VM0（同上） | —（static） | 只显示 **KR 1896–2150**（8VM0 entity；UniProt 1864–2118）；`focusLigandInstance = A/2602`；链 A | 21 残基 / 7 氢键 |

**管线新增字段**：`domain: { name, start, end }`、`focusResidues: [[start,end]]`、`focusLigandInstance: { chain, resSeq }`。几何口径未改：仍为 4.5 Å 残基 / 3.5 Å 氢键 / 8 Å 水；只改"选哪个 NDP 实例"与"显示哪些残基"。`selectChains` 在指定实例时强制该实例所在链为主链，避免同链两个 NDP 被合并成不连续口袋。

第五轮体积（gzip）：fas-er 41 KB（最大 41 KB holo.pdb）；fas-kr 38 KB（最大 38 KB holo.pdb）；manifest 现 **33 条**。

第五轮页面实测（Playwright + 无头 Edge，656×480 canvas，采样非白像素）：fas-er 95566、fas-kr 116499；2/2 PASS，抽屉各 1 个（22 / 21 残基），无降级、无控制台错误；页面 meta 与请求一致（fas-er `A/2601`、fas-kr `A/2602`）。

**KR 完整性复核（落地时再次确认）**：链 A 蛋白覆盖 1–2112；`2067–2080` 缺失（gap 2066→2081）、`2113–2150` 缺失（38 aa，链止于 2112）；**KR 催化活性位点 1918–1933 为 16/16 完整，NADPH 结合位点 1886–1901 为 16/16 完整**，核心活性位点可用，但 C 端结构不完整。ER 域 1667–1895 无 gap，覆盖完整。

**第五轮 caveat 要点**：两步均写明"3.3 Å 人源 FASN 全酶 cryo-EM、只显示目标域、不是独立域结构"；视野不含另一域及 ACP；配体为 NADPH（NDP），不是酰基-ACP 底物；KR 单独写明两段缺失与活性位点完整性。

### 渲染实测（3Dmol + 无头 Edge，逐文件 `addModel` + cartoon/stick + render）

| 文件 | 原子数 | 非白像素 | 结果 |
|---|---|---|---|
| ppp-01/holo.pdb | 4078 | 123983 | PASS |
| ppp-01/apo.pdb | 3775 | 107639 | PASS |
| fao-01/holo.pdb | 6099 | 170034 | PASS |
| fao-01/apo.pdb | 6050 | 159382 | PASS |
| urea-02/holo.pdb | 2552 | 176488 | PASS |
| gn-01/holo.pdb | 8959 | 151050 | PASS |
| gn-01/apo.pdb | 5270 | 69259 | PASS |
| ppp-n2/holo.pdb | 1682 | 194875 | PASS |
| ppp-n2/apo.pdb | 1693 | 177552 | PASS |
| fao-02/holo.pdb | 1951 | 122821 | PASS |
| fao-02/apo.pdb | 1969 | 127440 | PASS |

---

## 三、暂不做的 10 个及原因

| 步骤 | 原因 |
|---|---|
| fao-shuttle | 人 CPT1/CPT2 均无实验结构；仅有大鼠 CPT2（2RCU 为棕榈酰肉碱类似物，2H4T 为烷烃通道态），无法代表人源肉碱穿梭 |
| fas-shuttle | ACLY 只有截短/突变体/产物态结构；CS 与 CIC 无可用人源共晶；无法组成可信的"C2 搬运"结合态 |
| fas-ks | 8VM0 为 3.3 Å 全酶；NDP 经审计归属 KR/ER 活性位点（距 KS 活性位点远），无 KS 域特异性配体；只能做无配体域视图，教学价值不足，维持 C 档 |
| fas-dh | FASN DH 域无独立高分辨结构与配体复合物；8VM0 全酶 3.3 Å 不足以定位 DH 活性位点 |
| fas-te | 1XKT 为人 TE 域 apo（2.6 Å），无酰基-ACP 或棕榈酸产物复合物 |
| ppp-o2 | 无人源 6PGL 结构；仅有利什曼原虫（2.29 Å）与嗜热菌（1.55 Å） |
| ppp-n1 | 无人源 RPI 结构；仅结核分枝杆菌 2VVP |
| ppp-n4 | 人 TALDO 1F05 为 apo（2.45 Å）；唯一配体结构为大肠杆菌 1ONR apo，均无底物/产物 |
| urea-4 | 人 ASL 只有 4.2 Å apo 与 Q286R 突变体 2.65 Å apo，无配体复合物，分辨率不足 |
| urea-5 | 人 ARG1 有优质 apo（2ZAV 1.7 Å）但无 L-精氨酸真实底物复合物，现有配体结构均为抑制剂（ABH/硼酸类） |

---

## 四、产物与接口

- **manifest**：`public/assets/steps/manifest.json`，现有 **33 条**（12 条既有 `gk-*` + 五轮 21 条）。新条目字段与 `src/data/stepAssets.ts` 兼容：`stepId / assetDir / mode / urlAlias / species / method / resolution / holo / apo / ligands / pocket / meta / caveats`；static 步 `apo: null`。
- **目录**：`public/assets/steps/{ppp-01,fao-01,urea-02,gn-01,ppp-n2,fao-02,gn-11,urea-03,ppp-o3,fao-03,fao-act,fao-04,ppp-n3,gn-02,gn-09,urea-01,fas-pdh,fas-acc,ppp-n5,fas-er,fas-kr}/`，每步含 `holo.pdb`、`apo.pdb`（如有）、`ligand*.sdf`、`pocket.json`、`meta.json`；`fas-acc` 为 `noLigand` 域视图，只有 `holo.pdb / pocket.json / meta.json`，无 SDF；`fas-er` / `fas-kr` 为 `domain` 域视图，只有目标域残基与所选 NDP 实例。
- **管线**：`scripts/build-pathway-assets.mjs`，幂等，支持 `--refresh` 与 `--only ppp-o1`。口袋口径与既有糖酵解管线一致（4.5 Å 残基 / 3.5 Å 氢键 / 8 Å 水），并对大配体补充 6 Å 原子接触判据。第四轮新增 `noLigand` 与 `crossChainLigands`；第五轮新增 `domain` / `focusResidues` / `focusLigandInstance`，均不改变默认几何口径。
- **页面接入（第二至五轮）**：Fao / Ppp / Gluconeogenesis / UreaCycle / Fas 五个 Overview 页的 3D 占位替换为 `EmbeddedStepViewer`（manifest 有资产才渲染，否则保留原占位）；`EmbeddedStepViewer` 增加 holo/apo 切换，并对空口袋（`noLigand`）隐藏残基抽屉、取景全部蛋白。未改 12 个 Overview 导读正文、`src/styles.css`、首页画布、`package.json` 与锁文件；未 commit / push。
- **页面实测**：21 个已落地资产全部在对应 Overview 页渲染；10 个 two-state 步（fao-1/fao-2/ppp-o1/ppp-n2/gn-1/gn-11/ppp-o3/gn-2/gn-9/urea-1）holo↔apo 往返正常，11 个 static 步（urea-2/urea-3/fao-3/fao-act/fao-4/ppp-n3/fas-pdh/fas-acc/ppp-n5/fas-er/fas-kr）不渲染切换控件；全程无控制台错误。

---

## 五、建议的下一步顺序

1. **A/B 档与复用项已全部落地**：fas-pdh（E1）、fas-acc（BC 域）、ppp-n5、fas-er、fas-kr 已出资产并页面实测；当前已落地 21 / 可做 0 / 暂不做 10，本轮 3D 收口。
2. **B 档字段已实施**：`domain`（name/start/end）、`focusResidues`、`focusLigandInstance`（按 resSeq 选 NDP 2601/2602）已进管线；只裁显示、未改 4.5 Å 口袋几何。
3. **fas-ks 维持 C 档**：8VM0 的 NDP 已审计归属 KR/ER，不能冒充 KS 配体；无 KS 域特异配体时不做无配体域视图。
4. **fas-dh / fas-te / fas-shuttle** 维持暂不做，理由见第三节。
5. 所有页面降级文案沿用现有 pending 逻辑，不伪造资产路径；本轮结束停手等确认。

---

## 六、希望人工复核的条目（最多 5 条）

1. **1HZD 的身份错配**：`fao.json` 把 1HZD 当作 ECHS1 apo；已核实为人 AUH。建议删除该候选并改用 8ZRU（本轮已用）。这是本轮最重要的数据修正。
2. **2IIK 被写成 ACAA5**：实为 ACAA1；若页面文案出现"ACAA5"，需同步改为 ACAA1 或删去该候选。
3. **3TW6 的 "PAE 丙酮酸" 与 "人源" 表述**：PAE 是膦酰乙酸类似物，结构为 Rhizobium etli T882A；建议在 gn-1 文案里不再引用该条目。
4. **3BG3 "全酶四聚体"**：实际缺失 BC 域；若保留该候选，caveat 必须写"缺失 BC 域"。
5. **gn-1 两态链长差异**（7WTE 8877 原子 vs 7WTA 5270 原子）：已实测，apo 视图明显小于 holo；组件现按"坐标系/尺度不一致则自动重新取景"处理（避免沿用 holo 相机导致空屏），因此切换时会有取景变化，属预期行为。若需严格同框比较，应改用同一坐标系的两态结构。

---

## 七、FASN / ACC / PDH 的"域缺失 / 全酶上下文"处理方案与 B 档审计

结论：剩余 6 个不再按"一个酶一条 3D"处理，而按**结构证据等级**分三档；A 档与复用项已在第四轮落地，B 档（fas-er / fas-kr）已在第五轮落地，C 档（fas-ks 等）维持 pending 与 2D 导读。

### 判定标准
- **A 档（可落地为域/亚基资产）**：有独立域或独立亚基的实验结构，分辨率 ≤3.0 Å，且至少有一个真实配体/修饰残基能定位该域活性位点；caveat 固定写"仅 XX 域/亚基，非全酶"。
- **B 档（全酶上下文）**：只有全酶结构（如 8VM0，3.3 Å），但域边界可由 UniProt/文献确定，且目标域配体归属明确；输出保留全酶链，只高亮目标域，caveat 固定写"全酶上下文中的 XX 域片段，非独立域结构"。
- **C 档（暂不做）**：只有全酶且域边界/配体归属不明确，或分辨率不足以定位活性位点；维持 pending，不硬造 3D。

### 逐项判定

| 步骤 | 现有结构证据 | 判定 | 处理建议 |
|---|---|---|---|
| fas-pdh | 1NI4 人 E1（1.95 Å，TPP + Mg²⁺ + K⁺）；E2/E3 无同框人源结构 | A（已落地） | 已落地 E1 亚基；caveat "仅 E1，不含 E2/E3 与完整 PDH 复合体"；TPP/Mg²⁺ 保留，K⁺ 按结晶离子滤除 |
| fas-acc | 2YL2 人 BC 域 2.3 Å（apo，无 BTN）；8XKZ 2.55 Å 为 citrate-induced filament 核心区（非独立 BC 域） | A（已落地） | 已落地 2YL2 BC 域；caveat "仅 BC 域，不含 CT/BCCP；无 ATP/生物素/丙二酰-CoA" |
| fas-ks | 8VM0 人 FASN 全酶 cryo-EM 3.3 Å；NDP 已审计归属 KR/ER | C | 不用 NDP 冒充 KS 配体；暂不做 3D，保留 pending 文案 |
| fas-kr | 8VM0 全酶；KR entity 1896–2150；NDP 2602 距 KR 活性位点 2.57 Å | B（已落地） | 已加 `domain` + `focusLigandInstance` 裁域；caveat "全酶上下文中的 KR 域" |
| fas-er | 8VM0 全酶；ER entity 1667–1895；NDP 2601 距 ER 活性位点 2.33 Å | B（已落地） | 已加 `domain` + `focusLigandInstance` 裁域；caveat "全酶上下文中的 ER 域" |
| fas-dh | 8VM0 全酶，无独立 DH 域结构 | C | 维持暂不做；3.3 Å 不足以定位 DH 活性位点 |
| fas-te | 1XKT 人 TE 域 2.6 Å apo | 暂不做（已有） | 无酰基-ACP/棕榈酸产物，维持空白 |
| fas-shuttle | ACLY 截短/突变/产物态；CS/CIC 无可用共晶 | 暂不做（已有） | 维持空白 |

### B 档域边界审计（第四轮，只出结论，先不改管线）

**数据来源**：UniProt **P49327**（人 FASN，2511 aa）的 curated 域注释 + RCSB **8VM0** 的 polymer entity / SIFTS 序列对齐 + PDB 链坐标。

**UniProt 域注释（P49327）**：

| 域 | 残基区间 | 备注 |
|---|---|---|
| KS3 | 1–406 | β-酮脂酰合成酶 |
| AT | 429–817 | 乙酰/丙二酰转移酶 |
| DH | 838–1108 | 脱水酶 |
| ER | 1635–1863 | 烯酰还原酶 |
| KR | 1864–2118 | 酮脂酰还原酶 |
| Carrier | 2121–2198 | ACP 载体 |
| TE | 2207–2511 | 硫酯酶 |

**8VM0 序列对齐**：SIFTS 给出 entity_beg_seq_id = 34、length = 2510、ref_beg_seq_id = 2，故 **UniProt 编号 = entity 编号 − 32**。换算到 8VM0 entity 坐标：

- **ER：1667–1895**；
- **KR：1896–2150**；
- DH：870–1140；KS：33–438；AT：461–849。

**8VM0 链覆盖**：A/B 链 res = 2068/2071，坐标范围 1–2112/2113；三处 gap：`852→859`、`1148/1150→1173`、`2066→2081`。

- **ER（1667–1895）**：完整落在坐标内且不在 gap 中 ⇒ **覆盖完整，可信度高**。
- **KR（1896–2150）**：核心 1896–2065 与 2082–2112 存在；缺 2066–2081（16 残基）与 2113–2150（38 残基）。KR 活性位点 1918–1933 存在 ⇒ **核心可信、C 端不完整，可信度中高**。

**NDP 归属（实例级距离，不用整域质心）**：

- NDP A/2601 → ER 活性位点 1703–1720 最近距离 **2.33 Å**；→ KR 活性位点 1918–1933 为 **27.12 Å** ⇒ **ER 结合**。
- NDP A/2602 → KR 活性位点 1918–1933 最近距离 **2.57 Å**；→ ER 活性位点 1703–1720 为 **53.91 Å** ⇒ **KR 结合**。
- 早期用"整域原子距离"会把 NDP 2602 误判为同时贴近 ER/KR（均约 2 Å），必须用活性位点残基集合，结论才唯一。

**结论**：ER/KR 域边界可信，属 **B 档可行**；不是"暂不做"。但当前管线不能直接落地，需补以下字段/能力：

1. `domain: { name, start, end }`：声明目标域在 UniProt 编号中的区间（管线内部换算为 entity 编号，或直接给 entity 区间）。
2. `focusResidues` / `displayResidues`：只显示域内残基；口袋残基按域过滤后输出，或保留全链口袋再在渲染层裁剪。
3. `focusLigandInstance`（或 `ligandResSeq`）：按实例选 NDP 2601/2602。当前 `selectChains` / `pocketAtoms` 会把同一链的多个 NDP 实例合并成不连续口袋；这是 B 档落地的主要阻塞点。
4. 可选 `displayChains`：显式指定显示 A/B（或只显示主链），避免全酶四聚体/二聚体的取景歧义。
5. `caveat` 固定句式："8VM0 为 3.3 Å 人 FASN 全酶；本视图仅显示 XX 域（残基 a–b），非独立域结构；NDP 为全局 NADPH，不能据此判断域特异性。"

**"只裁显示、不改口袋算法"的可行性**：可行。口袋几何仍是"蛋白残基重原子距所选配体实例 ≤4.5 Å、氢键 ≤3.5 Å、水 ≤8 Å"，不需要改判据；只需把"所选配体实例"从"主链第一实例"改为 `focusLigandInstance`，并在输出/渲染时按 `domain` 过滤残基。这样 ER/KR 的域视图可复用现有 4.5 Å 算法，风险集中在实例选择与显示裁剪，不在几何口径。

**fas-ks 的最终判定**：8VM0 3.3 Å 无 KS 域特异性配体；NDP 2601/2602 分别归属 ER/KR，KS 活性位点（UniProt 161/293/331，entity 129/261/299）附近无 NDP。若只做"无配体 KS 域视图"，既无口袋也无域特异配体，教学价值不足 ⇒ 维持 **C 档暂不做**。

### 实施顺序与门槛

1. **已实施（第四轮）**：fas-pdh、fas-acc、ppp-n5；未改默认口袋算法，仅新增 `noLigand` 与 `crossChainLigands`。
2. **已实施（第五轮）**：加 `domain` / `focusLigandInstance` / `focusResidues`，落地 **fas-er** 与 **fas-kr**；ER 域覆盖完整、NDP 归属最清晰；KR caveat 已写明 C 端 2067–2080、2113–2150 缺失，并复核 1918–1933 / 1886–1901 完整。
3. **fas-ks** 维持 C 档；不要用 NDP 作 KS 配体。
4. 所有 B 档资产的 caveat 固定句式见上；未落地的步骤继续保留 pending 占位，不伪造资产路径。
