# 糖酵解 3D 资产审计（asset-audit）

> 生成：2026-11-03 ｜ 供人工复核用，非机器消费。管线：`scripts/build-step-assets-all.mjs`（gk-1..gk-5、gk-7..gk-10 + 2 器官变体）；gk-6（GAPDH）沿用 `scripts/build-step-assets.mjs` 既有产物，未改动。
> 消费入口：`public/assets/steps/manifest.json`（12 个步骤，含 gk-6）。

## 一、通用规则（写死在脚本中，可复现）

- **口袋判据**：残基重原子到"口袋相关"配体实例 ≤4.5 Å；氢键 N/O–N/O ≤3.5 Å（距离启发式，无方向性，沿用 gk-6 判据）；展示水 ≤8 Å。
- **口袋相关实例**：以主配体在 R2 主链上的第一实例（最小 atom serial）质心为锚，质心距 ≤12 Å 的保留配体实例才参与 pocket.json；其余保留配体（等价副本、远端变构配体）照常输出坐标与 SDF，但 meta 里 `pocketRelevant:false`。此规则用于处理 8W2G 每链 3 个 ADP、2CXS/3UCD 二聚体两位点等问题。
- **选链规则 R1–R4**（详见脚本头注释）：R1 候选链 ≥30 残基；R2 主链=承载保留配体重原子最多（并列取蛋白原子多、再取链名字典序）；R3 附加链须 (a) 承载已保留链没有的配体 resName，或 (b) 贡献 ≥3 个口袋残基（二聚体界面口袋）；R4 apo 链数=holo 链数，按蛋白原子数降序取。
- **配体策略**：每个共晶 resName 必须显式归类（keep/filter/修饰残基），未归类一律报错退出。全局滤除表含 EDO/GOL/PG4/PEG/MES/SO4/PO4/CL/NA/ACT/CIT/MPD 等添加剂，及 OXL/PGA/ANP/AGS/MGF/MRK/G3P 等替身配体。
- **G3P 陷阱核查**：已核对全部 19 个条目的 HETATM 清单——**没有任何所选结构含 G3P resname**，不存在"sn-甘油-3-磷酸冒充甘油醛-3-磷酸"的问题。1NEY 的甘油醛-3-磷酸途径底物以 DHAP 形式存在，其 PDB 代码 **13P**（已查 RCSB chemcomp：1,3-dihydroxyacetone phosphate）。

## 二、修饰残基（HETATM 形式但属蛋白共价部分，按蛋白保留，不作配体）

| 条目 | resName | 身份（已查 RCSB） | 处理 |
|---|---|---|---|
| 1NEY | FTR | 6-氟色氨酸（L-peptide linking） | 并入蛋白链；meta.residueModifications 记录 |
| 4GPZ | NEP | N1-磷酸组氨酸（磷酰化组氨酸类似物） | 并入蛋白链；**apo 非"严格游离态"已写入 caveat** |

## 三、逐步配体清单与判断依据

原子数均不含水。`minDist` = 该配体实例到主配体锚实例的最小质心距离。

### gk-1 己糖激酶 HK1（static，1CZA，1.9 Å，人）
| 配体 | 角色 | 依据 |
|---|---|---|
| GLC ×2 | substrate | 真实底物，主配体（锚） |
| G6P ×2 | product | 真实产物，最近 9.3 Å，同口袋区 |
| ADP ×1 | cofactor | ATP 水解态；距锚 27 Å，不参与口袋（口袋 = 糖位点） |

滤除：无（除水）。链：单链 N（1CZA 本身就是突变单体）。caveats：突变单体半分子；无 apo；ADP 非 ATP 态。

### gk-2 磷酸葡萄糖异构酶（two-state，2CXS 小鼠 1.5 Å / 1JIQ 人 1.9 Å）
| 配体 | 角色 | 依据 |
|---|---|---|
| F6P ×2（A、B 链各一，相距 39 Å） | substrate | 真实底物；A 链实例为锚，B 链实例输出但不参与口袋 |

滤除：GOL ×24（甘油添加剂，最近 22.7 Å）。链：A+B（B 链贡献 3 个界面口袋残基，R3(b) 触发，符合 PGI 界面活性位点）。caveat：跨种配对。

### gk-3 PFK-1（static，8W2G 人 PFKL cryo-EM 3.0 Å）
| 配体 | 角色 | 依据 |
|---|---|---|
| F6P ×1 | substrate | 真实底物（R 态），主配体 |
| ADP ×3 | cofactor | 催化 + 变构核苷酸位点；最近 13.2 Å，均判口袋外 |
| FBP ×1 | product | 真实代谢物；42.1 Å（远端位点），不参与口袋 |

滤除：无。链：单链 A（四聚体等价副本，R3 不触发）。caveats：cryo-EM 3.0 Å；PFKL 肝型（肌型无高分辨）；无 apo；多 ADP 位点。

### gk-4 醛缩酶 ALDOA（two-state，4ALD 人 2.8 Å / 5KY6 人 1.94 Å）
| 配体 | 角色 | 依据 |
|---|---|---|
| 2FP ×1 | substrate | **已查 RCSB：1,6-fructose diphosphate (linear form)**，即线形构象 F1,6BP（非呋喃环，非生产性构象） |

滤除：无。链：单链 A。注意：配体代码是 **2FP 而非 FBP**，SDF/meta 均用 2FP 并注明化学身份。caveats：线形构象；2.8 Å。

### gk-5 磷酸丙糖异构酶 TPI（two-state，1NEY 酵母 1.2 Å / 2JK2 人 1.7 Å）
| 配体 | 角色 | 依据 |
|---|---|---|
| 13P ×1 | substrate | **已查 RCSB：DHAP**（磷酸二羟丙酮），真实底物 |

修饰残基：FTR（6-氟色氨酸）并入蛋白。滤除：无。链：单链 A——B 链界面残基到 DHAP 均 >4.5 Å，R3(b) 未触发；TPI 界面环（loop 70s）主要影响底物进出而非直接接触底物，口袋 15 残基全在 A 链（催化 Glu165 同链）。caveat：跨种。

### gk-7 磷酸甘油酸激酶 PGK1（two-state，9FDN 人 1.58 Å / 8YHP 人 1.95 Å）
| 配体 | 角色 | 依据 |
|---|---|---|
| ATP ×1 | substrate | **真实 ATP**（非 ANP 类似物，resname 已核），磷酸供体 |
| 3PG ×1 | substrate | 真实底物，主配体（锚），相距 10.9 Å，同口袋 |

滤除：NA ×1（结晶钠，距主配体仅 4.6 Å——但钠离子非酶学组分，滤除）；PG4 ×13（PEG 片段）。链：单链 A（PGK 单体，双域）。本步为十步中唯一"双真实底物"复合物，无科学瑕疵。

### gk-8 磷酸甘油酸变位酶 PGAM（two-state，1QHF 酵母 1.7 Å / 4GPZ 人 1.65 Å）
| 配体 | 角色 | 依据 |
|---|---|---|
| 3PG ×1 | substrate | 真实底物（酵母 dPGM），主配体 |

滤除：SO4 ×4（**距主配体仅 0.17 Å——与 3PG 磷酸基近重叠，应为磷酸位点标记物/添加剂**，不构成独立证据，滤除并在此记录）。链：单链 A。caveats：人源无底物复合物（跨种）；**apo 4GPZ 含 NEP（磷酰化组氨酸类似物）修饰催化 His，非严格游离态**。

### gk-9 烯醇化酶（two-state，3UCD 人 ENO2 1.41 Å / 2PSN 人 ENO1 2.2 Å）
| 配体 | 角色 | 依据 |
|---|---|---|
| 2PG ×1（A 链） | substrate | **resname 2PG = 2-磷酸甘油酸（真实底物），已核实不是 PGA（2-磷酸乙醇酸类似物）**；主配体 |
| PEP ×1（B 链） | product | 真实产物；距锚 31 Å（B 链位点），不参与口袋 |
| MG ×4（A、B 各 2） | cofactor | A 链 2 个距 2PG 3.2–4.4 Å（双 Mg 活性位点）参与口袋；B 链 2 个属 PEP 位点，不参与 |

滤除：无（2PSN 的 PO4 ×4 按结晶磷酸滤除，Mg 保留在 apo）。链：A+B，B 链经 R3(a)（承载 PEP）。caveats：同工酶差异（ENO2 holo vs ENO1 apo）；口袋以 2PG 位点为锚。

### gk-10 丙酮酸激酶 PKL（two-state，6NN4 人 2.15 Å / 1ZJH 人 2.2 Å）
| 配体 | 角色 | 依据 |
|---|---|---|
| PEP ×1（C 链） | substrate | 真实底物，主配体 |
| FBP ×1（C 链） | cofactor | 真实代谢物，变构激活位点；36.6 Å，不参与口袋 |

滤除：EDO ×28。链：单链 C（初版曾误保留 A 链——锚未绑定主链所致，已修复为锚必须落在 R2 主链上；A 链到 C 链 PEP 实际 0 个 ≤4.5 Å 残基）。caveats：D499N 突变体；PKL vs PKM2 同工酶；无金属坐标。

### gk-1-liver 肝型葡萄糖激酶 GCK（two-state，1V4S 2.3 Å / 1V4T 3.4 Å，人）
| 配体 | 角色 | 依据 |
|---|---|---|
| GLC ×1 | substrate | 真实底物，主配体 |

滤除：**MRK ×1（合成 GCK 激活剂，已按要求隐藏，距葡萄糖位点 16.2 Å 变构位点）**；NA ×1。链：单链 A。caveats：GCK 与 HK1 不同同工酶；MRK 属补偿性证据；apo 3.4 Å 较弱。

### gk-10-muscle 肌型 PKM2（static，3BJF 人 2.03 Å）
| 配体 | 角色 | 依据 |
|---|---|---|
| FBP ×1 | cofactor | 真实代谢物，变构激活位点，主配体（本结构无底物） |
| K ×1 / MG ×1 | cofactor | PK 必需离子，天然结合态；距 FBP 35–39 Å（活性位点侧），不参与口袋 |

滤除：**OXL ×4（草酸，PEP/丙酮酸替身配体，距 FBP 30 Å）**。链：单链 A。caveats：仅变构态无底物；PKM2 同工酶。

### gk-6 GAPDH（two-state，1U8F 1.75 Å / 8G17 2.0 Å）——既有产物，未改动
配体仅 NAD（cofactorOnly），manifest 从其 meta.json 读取。

## 四、体积与版本

全部 12 步单文件 gzip 最大 188.4 KB（gly-02/holo.pdb），远低于 5 MB 上限；合计 gzip 1.70 MB。meta `assetVersion: "2.0.0"`（gk-6 保持 1.0.0）。脚本支持 `--refresh`、`--only <id>`，幂等可重跑；从零重跑（清空 `scripts/cache/pdb` 后）已验证 19 个 PDB 全部可下载且无报错。

## 五、建议人工复核的条目（按优先级）

1. **1QHF 的 SO4 与 3PG 磷酸基 0.17 Å 重叠**——若 SO4 实为"磷酰化中间态标记"而非添加剂，gk-8 页面文案可加一句说明（坐标已滤除，不影响渲染）。
2. **8W2G 的 3 个 ADP 位点均判口袋外（最近 13.2 Å）**——请确认催化核苷酸位点在 8W2G 中是否真由 ADP 占据，还是 F6P 位点为唯一可展示结合事件。
3. **4GPZ 的 NEP 修饰残基**——"apo"含磷酰化组氨酸类似物，页面降级文案如何措辞建议由内容侧定稿。
4. **1NEY 的 FTR（6-氟色氨酸）**—— fluorotryptophan 全掺入型标记是否需要在页面脚注说明（蛋白序列与野生型有系统性差异）。
5. **2CXS F6P 第二实例（B 链）**——输出在坐标中但不参与口袋；若页面只渲染口袋相关配体，需确认渲染端过滤策略（可按 `meta.holo.ligands[].instanceChains` 与 pocket.json 对照）。
