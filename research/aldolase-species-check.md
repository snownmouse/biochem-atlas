# 醛缩酶（第 4 步）物种口径核实笔记

> 核实日期：2026-11-03。数据来源：RCSB Data API（data.rcsb.org GraphQL / REST）与 Search API 实时查询，全部为一手字段，未引用本项目任何既有文档作证据。
> 本笔记只核实事实，不改代码。

---

## 一、三个判据问题的明确答案

### 判据 1：第 4 步 holo（酶+底物复合物）应标 **人源**。资产清单（meta/manifest）标的是对的，帧带标错了。

**4ALD 是人源结构**，不是兔源。RCSB 一手字段：

- 标题：`HUMAN MUSCLE FRUCTOSE 1,6-BISPHOSPHATE ALDOLASE COMPLEXED WITH FRUCTOSE 1,6-BISPHOSPHATE`
- 物种：`Homo sapiens`（NCBI taxonomy 9606）；UniProt `P04075`（人 Fructose-bisphosphate aldolase A，ALDOA）
- 来源类型：**天然组织来源**（`entity_src_nat`：common_name "human"、organ "SKELETAL"、tissue "MUSCLE"、details "LEG TISSUE"），非重组表达、非突变体（无 `entity_src_gen` / `entity_src_mut`，全部链实例无 MUTATION 特征注释）
- 方法/分辨率：X-RAY DIFFRACTION，2.8 Å
- 沉积原子数：2783（仅 1 条聚合链 A + 1 个 2FP 实例，单亚基沉积）
- 配体：`2FP` = 1,6-FRUCTOSE DIPHOSPHATE (LINEAR FORM)（saccharide 类型）

本项目资产实际使用的 holo 就是 4ALD：[gly-04/meta.json](public/assets/steps/gly-04/meta.json) 与 [manifest.json](public/assets/steps/manifest.json)（gk-4 条目，128–152 行）均标 `pdbId: 4ALD, species: Homo sapiens`。**资产清单无误；错误只在 structureFrames.ts 的帧带数据**（gk-4-f0 与 gk-4-f2 的 `species` 字段写成 `Oryctolagus cuniculus`）。

页面角标可直接引用的正确写法：**「人源 ALDOA（天然人骨骼肌）· 2.8 Å · X-ray」**。

### 判据 2：1ADO 与 4ALD **不同物种**。帧带里"与 4ALD 同物种"是错的。

- 4ALD = 人（`Homo sapiens`，UniProt P04075，人骨骼肌）
- 1ADO = 兔（`Oryctolagus cuniculus`，NCBI taxonomy 9986；UniProt `P00883`，兔 Fructose-bisphosphate aldolase A），天然兔骨骼肌来源，X-ray 1.9 Å，14356 沉积原子，配体 `13P` = 1,3-DIHYDROXYACETONEPHOSPHATE（DHAP）+ `SO4`（硫酸根），无突变注释

两者**同酶（都是 aldolase A）不同物种**。gk-4-f3 的角标「1ADO（兔）· 同酶同物种 · 跨结构示意」中"同物种"三字错误：这是**跨物种**并置（兔源 DHAP 配体对齐到人源 4ALD 坐标系），须改为跨物种配体级对齐的措辞（与第 5 步 1ADO→1NEY 同一处理方式）。

### 判据 3：apo 那一帧**应该能渲染，且当前"声明帧"降级的理由不成立**。

依据链：

1. 5KY6 是真实、完整、可渲染的实验结构：人 ALDOA，X-RAY DIFFRACTION **1.94 Å**（API 原值 1.941），10664 沉积原子（四聚体），**无任何配体**（`nonpolymer_entities: null`，即真 apo）；重组表达于 *E. coli* BL21（`entity_src_gen`），基因 ALDOA/ALDA，UniProt P04075，无突变特征注释（wild type）。
2. 资产层 apo.pdb 确实存在且已提取：manifest gk-4 与 gly-04/meta.json 的 `apo` 块（`pdbId: 5KY6`、链 B、2564 原子、`files["apo.pdb"]` 210108 字节）。
3. 降级的唯一理由是"holo 均为兔源（4ALD）→ 跨物种并置被三档规则禁止"。**这个前提是假的**：4ALD 是人源。因此 apo（5KY6，人 1.94 Å）与 holo（4ALD，人 2.8 Å）是**同物种同酶、跨结构**关系——按本项目核验表三档规则，这属于**允许并置、加"跨结构示意"角标**的那一档（第 2 步 1U0F/2CXS 同款处理），不是降级档。
4. 结论：gk-4-f1 应从文字声明帧改回可渲染的 apo 帧，角标可用 **「人 apo · 5KY6 · 1.94 Å · X-ray」+「同物种跨结构示意（holo=4ALD 2.8 Å）」**。

---

## 二、逐条目 RCSB 一手字段

### 4ALD

| 字段 | 值 |
|---|---|
| 标题 | HUMAN MUSCLE FRUCTOSE 1,6-BISPHOSPHATE ALDOLASE COMPLEXED WITH FRUCTOSE 1,6-BISPHOSPHATE |
| 物种 | Homo sapiens（9606），天然来源：人骨骼肌（organ=SKELETAL, tissue=MUSCLE, details=LEG TISSUE） |
| UniProt | P04075（ALDOA，人 aldolase A） |
| 方法 / 分辨率 | X-RAY DIFFRACTION / 2.8 Å |
| 沉积原子数 | 2783（1 model；链 A 单亚基 + 1 个 2FP） |
| 配体 | 2FP — 1,6-FRUCTOSE DIPHOSPHATE (LINEAR FORM)（saccharide） |
| 突变/构建体 | 无（天然组织来源，无任何链的 MUTATION 特征） |

### 1ADO

| 字段 | 值 |
|---|---|
| 标题 | FRUCTOSE 1,6-BISPHOSPHATE ALDOLASE FROM RABBIT MUSCLE |
| 物种 | Oryctolagus cuniculus（9986），天然来源：兔骨骼肌 |
| UniProt | P00883（兔 aldolase A） |
| 方法 / 分辨率 | X-RAY DIFFRACTION / 1.9 Å |
| 沉积原子数 | 14356 |
| 配体 | 13P — 1,3-DIHYDROXYACETONEPHOSPHATE（DHAP）；SO4 — SULFATE ION |
| 突变/构建体 | 无 |

### 5KY6

| 字段 | 值 |
|---|---|
| 标题 | Human muscle fructose-1,6-bisphosphate aldolase |
| 物种 | Homo sapiens（9606）；基因 ALDOA/ALDA；重组表达（宿主 *E. coli* BL21，pETite 质粒） |
| UniProt | P04075 |
| 方法 / 分辨率 | X-RAY DIFFRACTION / 1.941 Å（meta.json 记 1.94，为四舍五入，可接受但建议对齐 API 原值） |
| 沉积原子数 | 10664（四聚体，全蛋白，无配体=真 apo） |
| 配体 | 无 |
| 突变/构建体 | 无突变注释（wild type；重组构建体） |

### 1FDJ（存在）

| 字段 | 值 |
|---|---|
| 标题 | FRUCTOSE 1,6-BISPHOSPHATE ALDOLASE FROM RABBIT LIVER |
| 物种 | Oryctolagus cuniculus（9986），天然来源：兔肝 |
| UniProt | **P79226（兔 aldolase B，肝型同工酶——不是 ALDOA）** |
| 方法 / 分辨率 | X-RAY DIFFRACTION / 2.1 Å |
| 沉积原子数 | 15089 |
| 配体 | 2FP（线形 F1,6BP）、13P（DHAP）、G3P（SN-GLYCEROL-3-PHOSPHATE）、SO4 |
| 突变/构建体 | 无 |

注意：1FDJ 虽然配体组合漂亮（线形 FBP+DHAP+G3P 同框），但它是**肝型 aldolase B**，与糖酵解主链的肌肉型 aldolase A 不同同工酶，不建议作第 4 步替代结构。

---

## 三、更优替代候选核查结论：**不存在"人源 + 真实底物"的更优结构，4ALD 不可替代**

对 UniProt P04075（人 ALDOA）全量搜索（含任何非聚合物、按分辨率升序），共 10 个条目，逐一核对后：

| PDB | 分辨率 | 配体 | 可用性判断 |
|---|---|---|---|
| 6XML | 1.88 Å | PO4 + GOL | **I98C 突变体**，无底物 |
| 6XMH | 1.95 Å | PO4 + GOL | 野生型，但无底物（仅磷酸根/甘油） |
| 6XMM | 2.11 Å | PO4 + GOL | **I98S 突变体**，无底物 |
| 6XMO | 2.6 Å | GOL + PO4 | **I98F 突变体**，无底物 |
| **4ALD** | 2.8 Å | **2FP（线形 F1,6BP）** | **唯一的人源 ALDOA 底物态结构** |
| 1ALD | 2.0 Å | 无 | 人源 apo（野生型，标题 "ACTIVITY AND SPECIFICITY OF HUMAN ALDOLOSES"，2763 原子）——帧带 gapStatement 里引用的 1ALD 核实无误，可作人 apo 备选 |
| 1QO5 | 2.5 Å | SO4 | 人 **aldolase B**（P05062，肝），非 ALDOA |
| 1XDL / 1XDM | 3.0 Å | SO4 | 人 aldolase B **A149P 突变体**（遗传性果糖不耐受），非 ALDOA |
| 3S5N / 3S5O | 2.5/1.97 Å | EDO、K/Na | 人 4-hydroxy-2-oxoglutarate aldolase（Q86XE5），**别的酶**，非 ALDOA |

结论：人源 ALDOA 带底物的只有 4ALD（2.8 Å，线形 2FP）。候选清单里没有任何"更高分辨率且含真实底物"的人源替代；兔源 1ADO（1.9 Å，DHAP 实测）仍是 DHAP 结合态的唯一实测结构。

---

## 四、现有表述错误清单（供修帧带文案直接引用）

以下均为 [structureFrames.ts](src/data/structureFrames.ts) 中 gk-4 相关内容（只列事实错误，不给改法）：

1. **gk-4-f0 `species: "Oryctolagus cuniculus"`**（约 362 行）→ 错。4ALD 物种 = `Homo sapiens`（P04075，天然人骨骼肌）。
2. **gk-4-f0 caption "4ALD 实测（兔 ALDOA，链 A resi 364）"**（约 366 行）→ "兔" 错，应为"人 ALDOA"。
3. **注释行 "第 4 步（醛缩酶 ALDOA，4ALD 兔 / 1ADO 兔 / 5KY6 人）"**（约 353 行）→ "4ALD 兔" 错。
4. **gk-4-f1 整帧降级理由 "holo 均为兔源（4ALD）→ 跨物种并置被三档规则禁止"**（约 387–396 行）→ 前提为假。4ALD 人源，5KY6 人源，属同物种跨结构并置档（允许 + 角标），该帧可渲染（apo.pdb 已存在于资产）。
5. **gk-4-f2 transitionFromPrev "apo 为人源跨物种"**（约 416 行）→ 错。apo（5KY6）与 holo（4ALD）均人源，不存在跨物种。
6. **gk-4-f3 caption "1ADO 实测（兔，与 4ALD 同酶同物种，跨结构示意）"**（约 429 行）→ "同物种" 错。1ADO=兔（P00883），4ALD=人（P04075），同酶不同物种；此处应为跨物种配体级对齐措辞。
7. **gk-4-f1 gapStatement 引用 "6XML"**（约 393 行）→ 6XML 是 I98C 突变体（1.88 Å，PO4+GOL），作"人源 apo 充足"例证时应注明是突变体，或改引 1ALD（人野生型 apo 2.0 Å）。

无误的表述（核实通过）：4ALD 的 2FP=线形 F1,6BP 身份、链 A resi 364 配体实例、"席夫碱中间体无结构"、1ADO 的 13P=DHAP、apo 分辨率 1.94/1.941、manifest 与 gly-04/meta.json 的全部物种字段（均为 Homo sapiens）。

---

## 附：可复用角标措辞（RCSB 一手字段浓缩）

- holo 帧：`人源 ALDOA（天然人骨骼肌）· 4ALD · 2.8 Å · X-ray`
- apo 帧（若恢复渲染）：`人源 ALDOA · 5KY6 · 1.94 Å · X-ray · 重组表达（E. coli）`＋角标 `同物种跨结构示意 · holo=4ALD`
- 产物帧：`兔源 ALDOA（Oryctolagus cuniculus）· 1ADO · 1.9 Å · X-ray · 跨物种配体对齐 → 人 4ALD 坐标系`
