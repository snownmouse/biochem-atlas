# 待确认项总账（生化代谢图册）

> 本文件取代此前口头提到的 `PENDING_HUMAN_REVIEW.yaml`——那份文件属于另一个项目（`D:\语言拟和模型`），本仓库从未有过。
>
> **定位**：本文件是**待外部答复 / 待外部证据事项的总账**，只登记现在仍定不了、需要外部机构或维护者决定的事项，以及已经核查过、结论为「无需改动」的记录。它不替代 `docs/data-provenance.md`：后者是来源与许可的账本，两者是**双账本**关系；凡是两处都登记的事项（OMIM、PDB CCD、eQuilibrator、`6PGL`/`6PGD`、32 个 `pdbCandidates` 等），**改一处必须同步另一处**，不允许只改一边。
>
> **提交状态**：2026-11-10 有两批本地提交（均未 push）：数据层批次已作为 `093cd5b` 补交；同一日的外部事项核查批次（本文件第 3–5 节的结论）紧随其后，SHA 见 `git log`。本文件记录核查结论，不代替 `docs/data-provenance.md` 的来源登记。

## 1. 已定案并落地

| # | 事项 | 处理 | 依据 |
|---|---|---|---|
| 1 | 氨基酸去路 `fate-acacoa` / 接口 `if-ketone` 仍写「生酮未建」 | 改为 `status: linked`，指向 `ketone:kt-1`（乙酰-CoA → 乙酰乙酰-CoA）与 `ketone:kt-3`（HMG-CoA → 乙酰乙酸）；页面底注、骨架注、`n-ketone` 说明同步改为已接入 | PLATE 13 已建（`src/data/ketone/ketone.json`）；旧口径是 PLATE 13 上线前的历史遗留，属内部自相矛盾 |
| 2 | 糖原接口 `int-utp` 仍写「本平台未建」 | 改为 `status: connected`，指向 `pyrimidine:pyr-8`（NDPK · UDP → UTP）；嘧啶页脚注的「糖原图当前仍记为未建」同步更正 | PLATE 15 已建；`validate-glycogen` 增补真实 id 校验，负例改为「指向不存在的 pyr-99」 |
| 3 | 嘧啶：乳清酸如何出线粒体未写清 | 在 `pyr-4` / 页脚写明：DHODH 催化域朝向膜间隙，乳清酸直接释放到膜间隙，经外膜孔蛋白扩散入胞质，**不需要专一转运体**；运输线只标方向、不计步 | Lehninger 8e Ch.22（DHODH 位于内膜、活性位点朝膜间隙）+ Ch.19（外膜孔蛋白通透小分子） |
| 4 | 嘧啶：哺乳动物 CAD 上的 ATCase 是否保留 CTP 变构抑制 | 按物种分写：大肠杆菌 ATCase 受 CTP 反馈抑制；哺乳动物 CAD 的变构调节主要落在 CPS2 域（UTP 抑制、PRPP 激活），**不对 CAD 的 ATCase 域标 CTP 抑制** | 教材的 CTP 抑制证据来自细菌 ATCase（Lehninger 8e Ch.22）；不把细菌结论外推到 CAD |
| 5 | 甘油磷脂 `gpl-14`（DES）EC 留空 | 填 `1.14.19.17`，note 注明 IUBMB 反应以细胞色素 b5 为直接电子供体、本图方程为总 NAD(P)H 消耗 | IUBMB / EBI OLS4：EC 1.14.19.17 = sphingolipid 4-desaturase（N-酰基鞘氨醇 + 2 Fe(II)-cyt b5 + O₂ → N-酰基鞘氨-4-烯醇） |
| 6 | 一碳 `oc-2` / `oc-3` 的 MTHFD EC 留空 | 分别填 `1.5.1.15` / `1.5.1.5`，note 列出另一活性域（环水解酶 EC 3.5.4.9；MTHFD1 另有 EC 6.3.4.3），单值字段只记脱氢酶域 | IUBMB OLS4 + UniProt P13995（MTHFD2，NAD⁺）/ P11586（MTHFD1，NADP⁺） |
| 7 | 一碳 `oc-2` 方程把 MTHFD2 写成 NADP⁺ | 改为 NAD⁺ → NADH（旧写法与 IUBMB/UniProt 不符），`cofactors`、误概念条目同步更正 | UniProt P13995 催化反应：NAD⁺ → NADH；MTHFD2 是 NAD⁺ 依赖，NADP⁺ 依赖的是胞质 MTHFD1 |
| 8 | `docs/data-provenance.md` 的 EC / 定性 ΔG 计数过期且自相矛盾（162 vs 165；§2.1「161」与 §4「144」并存；许可表 138 / 126） | 统一为 EC 165/190（缺口 25）、定性 ΔG 161；并写明 2026-11-10 补的 3 条 EC | 全量脚本统计：21 个数据文件 / 190 步；`deltaG.source` 179；`qualitative` 161 |
| 9 | 四项许可条款（OMIM / Lehninger / PDB+CCD / eQuilibrator） | 逐项给出结论并同步声明文件，见第 3 节 | 官方条款页 / 数据库许可页，均 2026-11-10 查阅，地址逐条列在第 3 节 |
| 10 | 32 个 `pdbCandidates` 的逐条核验 | **32/32 通过**：RCSB 条目全部存在，标题与步骤酶一致；明细落 `docs/pdb-candidates-check.tsv` | RCSB REST API `https://data.rcsb.org/rest/v1/core/entry/{PDB_ID}`，2026-11-10 |
| 11 | 86 个 SMILES 的逐条来源核验 | **81/86 与 PubChem 精确同构**；5 条为已声明的分块片段或环式/电荷差异，不构成数据错误；明细落 `docs/smiles-source-map.tsv` | RDKit 2022.09.5 生成 InChIKey + PubChem PUG REST 反查，2026-11-10 |

## 2. 已核查、结论为「无需改动」

| # | 事项 | 核查结果 |
|---|---|---|
| 12 | BHMT 支路未画 | 已画：`one-carbon.json` 的 `oc-9`（BHMT · 甜菜碱 → 甲硫氨酸），`validate-onecarbon` 有「BHMT 被改成不可逆」负例。旧结论过期，不改数据 |
| 13 | PLATE 18 颗粒组成只做定性 | 已在数据层显式声明：`lipoprotein.json` 的 `ledger.basis` 写明「只按高/中/低相对占比，不写精确百分比，不同教材数值不统一」，页脚另有「脂蛋白是颗粒，不建 3D、不登记 PDB」。无需补数字 |
| 14 | 20 个物质未建 3D 的声明 | 仓库内不存在「20 个」这一计数（全仓检索无匹配）。实测：`moleculeProfiles` 182 条中 27 条有 `asset3d`、155 条没有；结构对照 189 块中 96 块两侧都无 3D 资产。页面已统一处理：无 `asset3d` 时展示「本物质暂无 3D 资产，结构以文字说明」（`MoleculeProfilePage.tsx`）。**不按无法复现的「20」改任何数据** |
| 15 | 新增 56 条档案的章节归属 | 实测 182/182 条 `sources` 均含教材/章级或章号引用，`onlyData`（只写数据文件）为 0 条。无需补 |
| 16 | `6PGL` / `6PGD` 误命中 | 确认是酶缩写，不是错数据；已标注自动抽取不可靠。数据与页面不改，后续 PDB 抽取一律人工复核 |
| 17 | 首页首屏（血红素、胆汁酸是否首屏可见） | **用户已判定可接受**（2026-11-10）：血红素、胆汁酸在首屏外，不做调整。本条只作记录，不再改动 |

## 3. 外部事项结论（2026-11-10 核验）

结论只用四类：**允许 / 有条件允许 / 不允许 / 未取得**。每项都写依据地址与查阅日期；没有「大概可以」。

| # | 事项 | 结论 | 依据（地址 · 查阅日期） | 对仓库的处理 |
|---|---|---|---|---|
| 18 | OMIM 使用条款 | **有条件允许**：个人使用、教育/学术、研究用途允许；商业使用或（为再分发的）复制、分发、传输、改编须 JHU 许可 | `https://www.ncbi.nlm.nih.gov/books/NBK21108/`（NCBI Bookshelf 收录的 OMIM 条款原文：「…for your personal use, for educational or scholarly use, or for research purposes only… may not be copied, distributed… for commercial purposes or for the purpose of redistribution without a license from The Johns Hopkins University」）· 2026-11-10。**现行条款页 `https://omim.org/help/agreement` 本轮直连仍被 Cloudflare 拦（HTTP 403）**，未直读，见第 6 节 | 当前只引 MIM 编号与病名、标注 OMIM / JHU 与官网，不复制正文，落在允许用途内。`THIRD_PARTY_NOTICES.md` 4.5 与 `docs/data-provenance.md` 第 1、5 节按此改写 |
| 19 | Lehninger 教材材料的再分发 | **有条件允许**：事实性内容与自写释义可引；复制教材图表、表格编排或原文段落须出版社许可 | `https://www.macmillanlearning.com/college/us/legal/copyright-permission-form`（Macmillan Learning：「Thank you for seeking permission to reproduce copyrighted material…」）· 2026-11-10。另做全仓审计：`Lehninger` 命中 60 处，逐条通读为「事实性结论 + 自写中文释义 + 章/表级出处」，**未发现原文段落、图表或表格编排的复制，也未发现逐句翻译**，故本轮没有需要改成转述的段落 | 维持现状：不复制图表/段落/表格编排、不展示 ΔG 数值、只写章/表号不写未核实页码。`data-provenance.md` 第 1 节与 `THIRD_PARTY_NOTICES.md` 4.4 按此措辞改写 |
| 20 | PDB 条目数据与 CCD | **允许**（CC0 1.0；署名鼓励但非强制） | `https://www.wwpdb.org/about/usage-policies`：「Data files contained in the PDB archive are available under the CC0 1.0 Universal (CC0 1.0) Public Domain Dedication. Users of PDB data are encouraged to attribute the original authors…」· 2026-11-10；`https://www.rcsb.org/pages/policies`：「Data provided by RCSB PDB programmatic APIs are available under the same license unless they originate from an integrated external resource… RCSB PDB software products are distributed under the terms of an open source license (MIT or Apache 2.0)」· 2026-11-10。CCD（`components.cif`）是 PDB 归档数据文件，随归档适用同一 CC0；**未检索到 CCD 单独条款页** | 无需取得额外许可；保留 PDB ID 作署名入口，本项目对数据的整理与标注按 CC BY 4.0。`data-provenance.md` 第 1、5 节与 `THIRD_PARTY_NOTICES.md` 4.1 同步 |
| 21 | eQuilibrator 许可 | **软件：允许（MIT）**；**数据：有条件允许（CC BY 4.0，须署名、注明修改并保留许可指向）** | 软件：`https://github.com/eladnoor/equilibrator-api/blob/master/LICENSE`（GitHub API 返回 `license.spdx_id = MIT`）· 2026-11-10。数据：`https://zenodo.org/api/records/4128542`（Compound Database for eQuilibrator，v1.0.0，`license.id = cc-by-4.0`，DOI `10.5281/zenodo.4128543`）· 2026-11-10；`https://zenodo.org/api/records/3978439`（Training data for the component contribution method，v1.1，`license.id = cc-by-4.0`，DOI `10.5281/zenodo.5495826`）· 2026-11-10 | 当前页面与数据层不使用其数值，`tools/deltag-results.json` 仅为存档，故当前不产生署名义务；若启用数值，须按 CC BY 4.0 署名并存档版本与 DOI。`THIRD_PARTY_NOTICES.md` 新增 4.6，README 与 `data-provenance.md` 同步现状 |
| 22 | 32 个 `pdbCandidates` 逐条核验 | **已核验通过**：32/32 条目在 RCSB 存在（HTTP 200），标题与步骤酶一致，无失效 ID | `https://data.rcsb.org/rest/v1/core/entry/{PDB_ID}` 逐条调用 · 2026-11-10；明细见 `docs/pdb-candidates-check.tsv` | 数据层不改。两处需说明：`ch-13` 的 6JKH（NSDHL）与 6OHT（EBP）不是 CYP51，但该步是「去甲基化/还原修饰簇」，两条 `role` 为 `architecture`；`gly-3` / `gly-6` 复用同一 6UIQ（PGM1），分别对应分解向与合成向，属合理复用 |
| 23 | 86 个 SMILES 的逐条来源 | **已核验**：86/86 均可生成 InChIKey，PubChem 精确同构命中 81/86；5 条例外见第 5 节，不构成需修正的数据错误 | `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/inchikey/{InChIKey}/cids/JSON` 逐条反查 · 2026-11-10；明细见 `docs/smiles-source-map.tsv` | 不改 SMILES。口径写明：这些 SMILES 是项目内维护的输入表，PubChem CID 只作**身份核验**，不作为数据来源归属；对外仍按项目整理数据（CC BY 4.0）处理 |

## 4. 32 个 `pdbCandidates`：核验记录

- 方法：对 `cholesterol.json`（18 条）与 `glycogen.json`（14 条）的全部候选逐条调用 RCSB REST `core/entry/{id}`，记录 `struct.title`、实验方法与分辨率；同一轮不批量改数据层。
- 结果：**32/32 返回 200**，条目存在；标题与被标注的酶逐一对应，方法/分辨率与数据层注记一致。
- 需单独说明的两类：
  1. `ch-13`（去甲基化/还原修饰簇，簇首酶 CYP51A1）的 6JKH 是 NSDHL、6OHT 是 EBP，不是 CYP51。该步骤按「簇」登记，两条候选的 `role` 已标 `architecture`，标题与各自的酶一致，属预期用途内的簇内旁证，不是错配。
  2. `gly-3` 与 `gly-6` 共用 6UIQ（人 PGM1 与 G6P 复合物）。两步分别是磷酸葡萄糖变位酶的分解向与合成向，同一结构复用属合理，不重复登记。
- 明细（逐条 path/stage/PDB ID/标题/方法/分辨率/状态/核验日期）：`docs/pdb-candidates-check.tsv`。

## 5. 86 个 SMILES：核验记录

- 方法：对 `public/assets/structures/2d/*.json` 中带 `provenance.sourceSmiles` 的 86 个资产，先用 RDKit 2022.09.5 计算 InChIKey（86/86 有效、0 条无法解析），再按完整 InChIKey 到 PubChem PUG REST 反查 CID。完整 InChIKey 含质子化层，因此「命中」表示同一电离态、同一立体化学。
- 结果：**81/86 精确命中**；命中记录（含多 CID 的情况）逐条写入 `docs/smiles-source-map.tsv`。
- 5 条未精确命中的逐条差异（均为**已知设计**，不改 SMILES）：
  1. `enoyl-c16`：本项目只画 C1–C16 烯酰基 + 硫酯 S 的分块片段；`comparisonConfig.ts` 的 caveat 已写「分块呈现，不是完整分子…CoA 长链省略」。完整反式-2-十六碳烯酰-CoA 为 PubChem CID 46173176（`JUPAQFRKPHPXLD-MSHHSVQMSA-J`）。
  2. `hydroxy-c16`：同上，分块片段。完整 3-羟基十六碳酰-CoA 为 CID 3082414（`DEHLMTDDPWDRDR-QTFKDKGUSA-N`）。
  3. `keto-c16`：同上，分块片段。完整 3-氧代十六碳酰-CoA 为 CID 440601（`NQMPLXPCRJOSHL-TZIIWEFPSA-N`）。
  4. `succoa`：同上，只画琥珀酰基 + 硫酯 S。完整琥珀酰-CoA 为 CID 92133（`VNOYUJKHFWYWIR-ITIYDSSPSA-N`）。
  5. `s7p`：本项目 SMILES 为呋喃型环式、−2 电荷（RDKit 实测 `C7H13O10P-2`，InChIKey `RKCHIPUTSFLEHR-UHFFFAOYSA-L`）；PubChem 无该 InChIKey 记录，最接近的是开链中性 CID 165007（`JDTUMPKOJBQPKX-GBNDHIKLSA-N`，`C7H15O10P`）。`comparisonConfig.ts` 的 S7P caveat 已写「配体为环式，非开链」，属有意选择。
- 附带确认：`kic` 精确命中 CID 3527278（阴离子型 `C6H9O3⁻`），中性型为 CID 70；数据层的阴离子写法与生理 pH 口径一致，不改。

## 6. 仍待外部答复 / 待复核（本轮剩余）

| # | 事项 | 本轮结果 | 需要谁提供 |
|---|---|---|---|
| 24 | OMIM **现行条款页**直读 | **本轮未能联网核验该页**：`https://omim.org/help/agreement` 与 `https://www.omim.org/help/agreement` 均返回 HTTP 403「Just a moment… Enable JavaScript and cookies to continue」（Cloudflare）；NCBI Bookshelf 直连返回 reCAPTCHA。第 3 节 OMIM 的结论依据是 WebFetch 取得的 NBK21108 条款原文（2002 年版），不是现行页面 | 人工用真实浏览器打开并留存现行条款页；若条款已变更，按新条款重评 |
| 25 | OMIM 商业使用或再分发的书面许可 | 当前用途不需要；一旦涉及商业使用或再分发，须先取得 JHU 许可 | Johns Hopkins University（omim.org 所列许可联系方式） |
| 26 | Lehninger 的复制许可 | 当前用途不需要；一旦要复制图表、表格编排或原文段落（含商业发行），须提交 Macmillan 许可申请 | Macmillan Learning Permissions |

## 7. 判定标准（供后续沿用）

1. 能由教材章级、IUBMB/UniProt/RCSB、或数据层自身推出的 → 直接改，并在提交信息/本文件写依据。
2. 需要许可条款、法律意见、第三方答复的 → 不改，写清缺什么、找谁。
3. 计数与实际不符但无法复现来源的 → 不改数据，先复核实测值，并在此登记实测结果。
4. 断言只更新期望值并说明原因，不把精确断言放宽成「至少」。
5. 许可结论必须带「官方页地址 + 查阅日期 + 结论类别」；直连被拦时写清拦截方式（状态码 / 拦截页文字），不得用记忆或二手转述冒充直读结果。
