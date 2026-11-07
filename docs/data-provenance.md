# 数据来源与许可（Data Provenance & Licensing）

本文件记录本项目（生化反应 3D 可视化平台）所用数据、结构坐标、计算工具与字体的来源、许可状态、引用完整度，以及存在分歧的数据口径。面向仓库读者与复用者，便于逐条查证。

- 核查日期：2026-11-06
- 核查方式：只读检查仓库文件；逐条读取上游官方许可页 / 代码仓库 LICENSE / npm 与 PyPI 元数据；对结构编号调用 RCSB PDB REST API（`https://data.rcsb.org/rest/v1/core/entry/{id}`）核验是否存在。未凭记忆填写许可条款。
- 本轮范围：审计与文档；许可边界轮已补 `LICENSE` 适用范围、`LICENSE-CC-BY-4.0.md`、`THIRD_PARTY_NOTICES.md` 与 `public/assets/fonts/OFL.txt`。仍不修改 `src/data/**/*.json` 的引用字段，不 commit、不 push，不改 `package.json`、`index.html` 与字体文件本身。

---

## 1. 来源登记表

说明：
- 「许可」均为 2026-11-06 至 2026-11-07 从上游页面或仓库许可文件读到的原文结论；未能取得原文的标为「待确认」或「查不到」。
- 「提取-重组」指数据库权利层面的摘取与重新编排，不等同于版权层面的引用。
- 「本项目如何遵守」只写当前仓库实际做到的事；未做到的列入第 5 节缺口清单。

| 来源 | 用途与落点 | 许可 | 是否要求署名 | 是否限制商业使用 | 再分发 / 衍生 | 提取-重组限制 | 本项目如何遵守 |
|---|---|---|---|---|---|---|---|
| wwPDB / RCSB PDB 条目（结构坐标） | 43 个实验 3D 资产的配体坐标；结构对照块的来源说明；步骤页 21 个 PDB 文件 | CC0 1.0 Universal Public Domain Dedication，见 wwPDB Usage Policy | 不要求；wwPDB 明确「鼓励在可能时署名原始作者」 | 不限制（CC0 允许商业使用） | 允许再分发与衍生 | 无（CC0 放弃版权与相关数据库权利） | 逐条记录 PDB ID、方法、分辨率、物种、链、配体 resname；实验坐标不做几何纠正；保留原始作者署名入口（PDB ID） |
| PDB CCD（化学组分字典，配体定义） | 配体 atom/bond 名称与组分解读 | 作为 PDB 归档数据文件的一部分，按 wwPDB Usage Policy 的 CC0 处理；未检索到 CCD 单独许可页 | 不要求 | 不限制 | 允许 | 无 | 仅在资产生成与核对阶段使用；未把 CCD 条目文本作为页面文案 |
| UniProt | `src/data/amino-acid/amino.json` 中 10 个 accession 的条目核对；研究文档中的酶身份核对 | CC BY 4.0，见 UniProt License & disclaimer | 要求署名（CC BY 4.0） | 不限制 | 允许，须保留署名与许可指向 | 允许，须署名（CC BY 4.0 覆盖版权与数据库权利） | 数据层保留 accession；页面/文档引用 UniProt 名称；未复制条目正文 |
| IUBMB Enzyme Nomenclature（EC 编号，经 ExplorEnz / EBI OLS4 分发） | 85 个步骤的 EC 编号与酶分类 | EBI OLS4 的 Enzyme Nomenclature 条目声明 CC-BY-4.0；IUBMB 原站未提供统一许可页 | 要求署名（CC BY 4.0） | 不限制 | 允许，须署名 | 允许，须署名 | 每个步骤在 `ecNumber` 或 `enzyme.ec` 写 EC 编号；页面详情栏显示 EC；未复制酶学说明段落 |
| OMIM | 21 处临床/疾病关联编号 | **条款全文查不到**：官网 omim.org/help/agreement、/about、/help/copyright 仍返回反机器人验证页；Wayback、archive.today、r.jina.ai、Google 翻译入口均无可读内容。可确认：版权归 Johns Hopkins University（镜像数据文件头 `Copyright (c) 1966-2016 Johns Hopkins University` 并指向 `http://omim.org/help/agreement`）；第三方 EULA（NeDRex、PanelApp、Illumina）写明商业使用/再分发需 JHU 许可；reusabledata.org 标为 custom | 待确认（仅取得第三方转述，不作一手依据） | 待确认 | 待确认 | 待确认 | 只引 MIM 编号与病名，不复制条目正文；标注「OMIM / Johns Hopkins University, https://omim.org」；不把 OMIM 内容纳入 CC BY 4.0 |
| Lehninger Principles of Biochemistry, 8e | 85 个定性 ΔG（数值不作页面展示）、能量账与机制描述 | 无开放许可；教材文字、图表、表格编排受出版社版权保护。事实性数据在多数法域不受版权保护，但汇编/选择可能受保护 | 无许可意义上的署名要求；学术引用为惯例 | 未授予 | 未授予（事实可引用，表达不可复制） | 未授予（未复制原表结构与图表） | 只引用反应事实与自写中文释义，标注章节/表号；未复制教材图表、表格排版或整段文字；数值缺口留空 |
| KEGG | **未使用**（代码与数据层无 KEGG 数据）；首页致谢文字提及名称与年份 | 未核查（未使用其数据） | 不适用 | 不适用 | 不适用 | 不适用 | 未复制 KEGG 通路图、KO 编号或数据库内容；如后续接入，须先核实其学术/商业条款 |
| BRENDA | **未使用** | 未核查（未使用其数据） | 不适用 | 不适用 | 不适用 | 不适用 | 代码、数据、文档均未引用 |
| MetaCyc | **未使用** | 未核查（未使用其数据） | 不适用 | 不适用 | 不适用 | 不适用 | 代码、数据、文档均未引用 |
| SABIO-RK | **未使用** | 未核查（未使用其数据） | 不适用 | 不适用 | 不适用 | 不适用 | 代码、数据、文档均未引用 |
| eQuilibrator | **页面未使用**；`tools/calc-deltag-equilibrator.py` 与 `tools/deltag-results.json` 仅作计算存档，数值不进入页面与数据层 | 若后续启用：`equilibrator-api` 的 PyPI 元数据为 MIT；eQuilibrator 3.0 论文称算法所需原始数据以 Creative Commons 4.0 存放于 Zenodo | 若启用：代码保留 MIT 声明；数据须署名（具体 CC 变体待确认） | 代码不限制；数据待确认 | 代码允许；数据须按 CC 条款 | 待确认 | 存档脚本仅供复现；如启用须先锁定数据集版本、CC 变体与署名方式，并同步改渲染与断言 |
| PubChem | **未在代码/数据层检索到 PubChem 引用**；SMILES 的具体来源未标注 | 未核查（来源未确认） | 不适用 | 不适用 | 不适用 | 不适用 | 统一口径见第 5 节 #4：86 个分子的 SMILES 是项目内维护的输入表，未记录逐条来源；不归因于 PubChem、教材或任何单一数据库 |
| RDKit | 生成 2D 布局；18 个计算 3D 构象（ETKDGv3 + MMFF94）；离线生成资产 | BSD 3-Clause，见 rdkit/license.txt | 要求保留版权声明、条件与免责声明 | 不限制 | 允许再分发与衍生，须保留声明 | 不适用（软件许可） | 仅作为开发期工具；第三方声明见 `THIRD_PARTY_NOTICES.md` 第 2.5 节 |
| 3Dmol.js | 页面 3D 球棍渲染 | BSD 3-Clause，见 3Dmol.js/LICENSE；其 LICENSE 声明含 GLmol（0.47，MIT 或 LGPL-3 双许可）、Three.js（MIT）、jQuery（MIT）代码 | 要求保留版权声明、条件与免责声明 | 不限制 | 允许再分发与衍生，须保留声明 | 不适用（软件许可） | 构建产物事实：jQuery 3.7.1 仅见于 UI 构建文件头；Three.js 具体版本查不到；逐项声明见 `THIRD_PARTY_NOTICES.md` 第 1.1 节 |
| React / React DOM | 前端运行时 | MIT，见 facebook/react/LICENSE | 要求保留版权与许可声明 | 不限制 | 允许 | 不适用 | 运行时依赖；声明见 `THIRD_PARTY_NOTICES.md` 第 1.2 节 |
| Vite | 构建工具 | MIT，见 vitejs/vite/LICENSE | 要求保留声明 | 不限制 | 允许 | 不适用 | 开发期工具，不进入运行时页面 |
| react-router-dom | 路由 | MIT，见 remix-run/react-router/LICENSE.md | 要求保留声明 | 不限制 | 允许 | 不适用 | 运行时依赖 |
| TypeScript | 类型检查/编译 | Apache-2.0（npm registry 元数据） | 要求保留声明与 NOTICE（如适用） | 不限制 | 允许 | 不适用 | 开发期工具 |
| playwright-core | 冒烟/截图测试 | Apache-2.0（npm registry 元数据） | 要求保留声明与 NOTICE（如适用） | 不限制 | 允许 | 不适用 | 开发期工具，不进入运行时页面 |
| Noto Sans SC / Noto Serif SC（自托管字体文件） | `public/assets/fonts/` 下 404 个 woff2，全部随仓库分发 | SIL Open Font License 1.1；字体二进制版本 2.004-H2 / 2.003-H1；Noto 官方文档确认 OFL 允许商业使用与再分发，但不得单独售卖字体 | 要求保留字体版权声明与 OFL 许可文本 | 不限制（允许商业使用）；不得单独售卖字体 | 允许随产品再分发；修改后的字体不得使用保留字体名（如适用） | 不适用（字体软件） | 未修改字体文件；`package.json` 与 `package-lock.json` 均无 `@fontsource` 依赖，声明不保留该包；OFL 1.1 全文与两个字体的版权行在 `public/assets/fonts/OFL.txt` |
| 本项目原创代码与原创文档 | `src/`、`tools/`、`docs/` 中的原创代码与说明文档 | MIT，见根目录 `LICENSE`（Copyright (c) 2026 snownmouse） | 要求保留版权与许可声明 | 不限制 | 允许 | 不适用 | 根目录 `LICENSE` 末尾已加「适用范围」，明确 MIT 只覆盖原创代码与原创文档 |
| 本项目自写的讲解文字与整理后的数据 | 挂图讲解、结构对照标注、数据整理结果 | CC BY 4.0，官方全文见 `LICENSE-CC-BY-4.0.md` | 要求署名，并注明是否修改 | 不限制 | 允许，须署名与许可指向 | 允许，须署名 | 建议署名格式写在 `LICENSE-CC-BY-4.0.md`；教材内容不纳入此许可 |

### 1.1 许可结论摘要

- **可以安全再分发**：PDB 条目与 CCD（CC0）；RDKit、3Dmol.js、React、Vite、react-router-dom（BSD/MIT，保留声明）；Noto 字体（OFL 1.1，保留许可文本）。
- **可以再分发但必须署名**：UniProt（CC BY 4.0）、IUBMB EC（CC BY 4.0）、Noto 字体（OFL 要求保留版权与许可）。
- **未授予再分发权，需按事实性数据/合理引用处理**：Lehninger 教材内容。
- **条款未核实，不应作为可再许可内容**：OMIM（条款全文仍未取得；只引 MIM 编号与病名，不引正文）。
- **未使用，不产生许可义务**：KEGG、BRENDA、MetaCyc、SABIO-RK、eQuilibrator（eQuilibrator 仅有存档脚本，数值不进入页面与数据层）。
- **许可文本已补齐**：`public/assets/fonts/OFL.txt`（SIL OFL 1.1 全文 + 两个 Noto 字体的版权行）；根目录 `THIRD_PARTY_NOTICES.md`（第三方逐项声明）；`LICENSE-CC-BY-4.0.md`（CC BY 4.0 官方全文 + 建议署名格式）。

---

## 2. 引用完整度审计

### 2.1 步骤数据（`src/data/**/*.json`）

共 11 个数据文件、87 个步骤：糖酵解 10、TCA 8、糖异生 11、PPP 8、FAO 6、FAS 8、尿素循环 5、糖原 9、氨基酸 7、胆固醇 13、氧化磷酸化 2。

| 指标 | 数量 | 说明 |
|---|---:|---|
| 顶层 `source` 字段 | 0 | 现有 schema 不在步骤顶层放 `source` |
| `deltaG.source` 有值 | 85 / 87 | 引用实际挂在 `deltaG.source` 上 |
| 无任何出处字段 | 2 | `oxphos-e`、`oxphos-f`；电子入口模块，无 ΔG/EC |
| 有 EC 编号（`ecNumber` 或 `enzyme.ec`） | 85 / 87 | 缺 2 个即上述氧化磷酸化模块 |
| ΔG 有数值 | 0 | 页面不展示热力学数值；`standard` / `physiological` / `value` / `valueKcal` 统一写 `null` |
| ΔG 仅定性、无数字 | 85 | 保留 `qualitative` 与教材级 `source` |
| ΔG 完全缺失 | 2 | 同上，氧化磷酸化模块 `oxphos-e`、`oxphos-f` |
| 文本含「未核实 / 未核验」 | 83 行 | 项目主动标注的未核实项 |

- 全部 `deltaG.source` 均为 `Lehninger 8e` 的章/表级引用，或指向同项目内其他步骤的口径；**没有页码**。
- 糖酵解与 TCA 的教材表号仍保留在 `source`（Table 15-1 / Table 16-2），但数值字段为 `null`，页面不显示数字。
- 其余通路的 ΔG 只保留定性结论（如「近平衡」「强放能」「可逆」），不写数字。

### 2.2 结构对照数据（`src/data/comparisonConfig.ts`）

共 10 个通路配置、77 个结构块、185 个「分子 × 侧（底物/产物）」条目。

| 指标 | 数量 | 说明 |
|---|---:|---|
| 结构块 | 77 | 本轮已把 README 同步为 77（原 63 未含氨基酸 7 + 胆固醇 7） |
| 分子条目 | 185 | 同分子多次出现按条目计 |
| `coordSource = experimental` | 106 | 有实验坐标 |
| `coordSource = computed` | 39 | RDKit 计算构象 |
| `coordSource = none` | 40 | 仅 2D |
| 有 `sourceNote` | 170 / 185 | 91.9% |
| 缺 `sourceNote` | 15 | 7 个实验条目 + 8 个计算条目（计算条目有 `caveat`） |
| 实验条目中 `sourceNote` 含 PDB ID | 99 / 106 | 93.4% |
| 实验条目无 `sourceNote`（因而无 PDB ID） | 7 | 全部在糖酵解早期条目（`glc`、`g6p`、`fbp`、`fbp-linear`、`3pg`、`2pg`、`pep`） |

### 2.3 分子资产

| 资产类型 | 数量 | 结构化来源字段 | 现状 |
|---|---:|---|---|
| `public/assets/ligands3d/*.json` | 61 | 有 `provenance` | 43 个 `experimental`（全部有 `pdbId`、`method`、`resolution`、`species`）；18 个 `computed`（全部有 `method`、`conformerCount`、`energyKcalMol`、`randomSeed`、`note`、`generatedBy`） |
| `public/assets/structures/2d/*.json` | 86 | **无 `provenance` / `generatedBy` 字段** | 82 个 `annotations` 明写 RDKit；4 个未写：`gap`（0 条 annotation）、`bpg13`、`pyruvate`、`demo-gap`（DEMO 占位，不进正式序列） |
| `public/assets/structures/2d/*.svg` | 85 | 无 | 与 JSON 配对；缺 1 个 SVG（`demo-gap`） |
| `public/assets/steps/manifest.json` | 12 个步骤条目 | **0 个 `pdbId` 字段** | 有物种、方法、分辨率、caveat，但无 PDB ID |
| `public/assets/steps/**/*.sdf` | 59 | 无结构化来源 | 文件头只有一句「experimental coordinates preserved; bond orders from SMILES template」，无 PDB ID |
| `public/assets/steps/**/*.pdb` | 21 | 无 | 文件头被裁剪为 `REMARK 1 TRIMMED BY ...`，缺 `HEADER` / `TITLE` / `REMARK 2`，无原始 PDB ID |

### 2.4 PDB 编号真实性核验

对代码与数据中出现的所有「形似 PDB ID」的 4 字符编号做了 RCSB 存在性核验：

| 结果 | 数量 | 说明 |
|---|---:|---|
| 形态匹配的 4 字符编号 | 88 | 来自 `sourceNote`、3D 资产 `provenance.pdbId`、`pdbCandidates` |
| RCSB 可解析 | 88 / 88 | 无虚构编号 |
| 误命中 | 2 | `6PGL`、`6PGD` 是酶缩写（6-磷酸葡萄糖酸内酯酶 / 6-磷酸葡萄糖酸脱氢酶），不是 PDB 引用；RCSB 同名条目为无关蛋白 |
| 真实 PDB 编号 | 86 | 含历史替换记录（如 `5TRL` → `8P5V`、`1PJ3` → `9BPW`），并非全部对应现行资产 |

**结论**：`coordSource` 本身只是枚举值（`experimental` / `computed` / `none`），不直接存放 PDB ID；实际 PDB 指向在 `sourceNote` 与资产 `provenance.pdbId` 中。106 个实验条目里 99 个在 `sourceNote` 写明 PDB ID，43 个实验 3D 资产全部有 `pdbId` 且全部真实存在；**未发现伪造 PDB 编号**。缺口是 7 个糖酵解实验条目没有写明 PDB ID，以及 12 个步骤 manifest 与 21 个 PDB 文件缺结构化 PDB ID。

### 2.5 数值性质分类

| 数值 | 性质 | 位置 / 数量 |
|---|---|---|
| 0 个数值 ΔG | 页面不展示热力学数值；数值字段统一 `null` | 全部通路 |
| 85 个定性 ΔG | 引用文献的定性结论；无数字（另 2 个电子入口模块 `oxphos-e` / `oxphos-f` 无 ΔG） | 全部通路 |
| 43 个实验 3D 坐标 | 实验观测（PDB） | `ligands3d` 的 `experimental` |
| 18 个计算 3D 构象 | 计算（RDKit ETKDGv3 + MMFF94） | `ligands3d` 的 `computed`；含能量、种子、构象数 |
| 86 个 2D 布局坐标 | 计算/绘制（RDKit 为主，4 个为脚本手写坐标） | `structures/2d` |
| 范德华体积、主轴长度、ΔV% | 由坐标计算 | 资产 `shape`；结构对照默认模式判据 |
| 分子式、净电荷 | 由 SMILES + pH 7.4 电离口径推导 | 实体字段 + `validate-ionization` 校验 |
| 31 个酶 3D | **待建**（`threeD.status = pending`） | 各通路步骤数据 |
| 32 个 `pdbCandidates` | 本轮核验存在，但数据层未记录核验状态 | 胆固醇 18、糖原 14 |
| 83 行「未核实/未核验」 | 未核实 | 各数据文件注释/note |

---

## 3. 缺口清单

| # | 文件 | 字段 / 位置 | 缺口 | 条目数 | 建议处理（下一步） |
|---|---|---|---:|---|
| 1 | `src/data/oxphos/oxphos.json` | `steps[oxphos-e]`、`steps[oxphos-f]` | 无 `deltaG`、`ecNumber`、`source` | 2 | 补 `source` 说明「电子入口模块，非催化步骤」；或显式标 `notApplicable` |
| 2 | `src/data/cholesterol/cholesterol.json` | `steps[].pdbCandidates[].status` | 候选对象存在，但无 `status` / 核验日期 | 18 | 按 amino 的 `status: verified` 格式补齐 |
| 3 | `src/data/glycogen/glycogen.json` | `steps[].pdbCandidates` | 以字符串数组形式存在，无物种/方法/分辨率/状态 | 14 | 统一为对象结构并补核验状态 |
| 4 | `src/data/comparisonConfig.ts` | `*.parts[].sourceNote` | 缺来源说明 | 15（实验 7 + 计算 8） | 实验 7 条补 PDB ID/来源蛋白；计算 8 条补「计算构象」结构化说明（现有 `caveat` 保留） |
| 5 | `src/data/comparisonConfig.ts` | 实验条目 `sourceNote` | 无 `sourceNote`（因而无 PDB ID） | 7（均为糖酵解早期） | 逐条补 PDB ID（如 `glc` 1CZA、`g6p` 1CZA、`3pg` 9FDN、`2pg`/`pep` 3UCD；`fbp` 4ALD） |
| 6 | `public/assets/structures/2d/*.json` | 顶层 | 无 `provenance` / `generatedBy` | 86 | 增加 `generatedBy`、`method`（RDKit 版本或「手写坐标」） |
| 7 | `public/assets/structures/2d/` | `annotations` | 无生成方式说明 | 4（`gap`、`bpg13`、`pyruvate`、`demo-gap`） | `gap` 补 annotation；其余标明「脚本手写坐标」或「DEMO」 |
| 8 | `public/assets/steps/manifest.json` | 每条目 | 无 `pdbId` | 12 个条目，0 个有值 | 增加 `pdbId` 与 `sourceUrl` |
| 9 | `public/assets/steps/**/*.pdb` | 文件头 | 无 `HEADER`/`TITLE`/`REMARK 2`，无 PDB ID | 21 | 生成时保留原始 `HEADER`、`TITLE`、`REMARK 2`，或在 manifest 记录 |
| 10 | `public/assets/steps/**/*.sdf` | 文件头 | 只有一句来源说明，无 PDB ID / 计算方式 | 59 | 增加 SDF data field：`PDB_ID` / `SOURCE` / `METHOD` |
| 11 | `tools/gen-molecule-assets.py` | SMILES 输入表 | 无逐分子来源字段；当前不能归因于 PubChem、教材或手工中的任一类 | 86 个分子 | 若需对外声称来源，增加 `SMILES_SOURCE` 并逐条核实；在此之前按项目整理数据（CC BY 4.0）处理 |
| 12 | `public/assets/fonts/` | 目录 | **已完成（2026-11-06）**：已补 SIL OFL 1.1 全文与两个字体版权行 | 1 个目录 | 文件：`public/assets/fonts/OFL.txt`；字体文件本身未改 |
| 13 | 仓库根目录 | 第三方声明 | **已完成（2026-11-06）**：已补第三方逐项声明 | 1 | 文件：`THIRD_PARTY_NOTICES.md`；覆盖 RDKit、3Dmol.js（含 GLmol / Three.js / jQuery）、React / React DOM、react-router-dom、Vite、TypeScript、@vitejs/plugin-react、playwright-core、Noto Sans SC / Noto Serif SC、PDB / UniProt / EC / 教材 / OMIM |
| 14 | `README.md` | 结构块计数 / 进度表 | **已完成**：README 现为 77 块、结构页 12 页已建，与仓库实际一致；本轮按要求不改 README | 0 | 无（如后续再出现 63，按缺口处理） |
| 15 | `src/data/**/*.json` | OMIM 编号 | **条款全文仍未取得**：官网与 4 个替代入口均无全文；已确认版权归 JHU、商业/再分发需 JHU 许可 | 21 处 | 保持「只引编号与病名、不引正文」；标注 `OMIM / Johns Hopkins University, https://omim.org` |
| 16 | 各通路步骤数据 | `threeD.status` | 酶 3D 未建 | 31 步 | 维持页面灰字「待核验后接入」，不得用别酶结构冒充 |

---

## 4. 争议数据清单与处理规则

| # | 争议项 | 分歧 | 本项目采用 | 依据 | 页面如何标注 |
|---|---|---|---|---|---|
| 1 | FAS 的 ER 酶 EC 号 | `1.3.1.39`（NADPH 依赖的烯酰-ACP 还原酶）与 `1.3.1.9`（NADH 依赖的旧口径） | `1.3.1.39` | FASN 的还原步骤使用 NADPH（Lehninger Ch.21）；IUBMB EC 1.3.1.39 的名称与反应写明 NADPH | FAS 挂图/详情栏显示 `EC 1.3.1.39`，不出现 `1.3.1.9` |
| 2 | FDPS 的区室归属 | 胞质 vs 过氧化物酶体 | 以胞质为主，注记「部分定位于过氧化物酶体」 | 数据层 `enzyme.note`；外部定位依据尚未写入 accession，列为待补 | 胆固醇页步骤详情显示区室与 `enzyme.note`，不把双重定位压成单一定位 |
| 3 | MSDHL 与 MSMO1 基因名 | 旧称 `MSDHL` vs 现行 `MSMO1`（SC4MOL） | `MSMO1`，`MSDHL` 视为旧称 | 数据层注释与项目既定口径；外部基因命名核验尚未落库 | 胆固醇页显示 `MSMO1`，注释中保留旧称以便检索 |
| 4 | 胆固醇末端两条平行路线 | `DHCR7`（7-脱氢胆固醇 → 胆固醇）vs `DHCR24`（desmosterol → 胆固醇） | 两条都保留，画成并行终点 | 数据层分别登记两个酶与底物；临床关联各自成立 | 胆固醇页同时显示两条末端分支，不合并成单一路线 |
| 5 | ΔG 的标准态 / 生理态 | `ΔG°′` 文献值 vs 细胞内实际 ΔG | **决定：数值全部不作页面展示** | 标准态与生理态口径打架、部分数值误差过大、覆盖率不齐；只保留「单向 / 可逆 / 限速」等定性标注与 ATP/NADPH 化学计量 | 页面不出现具体 ΔG 数值；`deltaG` 数值字段统一 `null`，只显示定性句与 Lehninger 级出处；计算存档见 `tools/calc-deltag-equilibrator.py` |
| 6 | 键级来自模板、坐标为实验值 | 模板键级 vs 实验几何键长偏长 | 保留模板键级，不改坐标；1.56–1.71 Å 的双键加统一注记 | `docs` 与结构对照块的 `caveat`：坐标为实验原值，键长偏长系晶体构象，未做几何纠正 | 分子对照首屏显示「键级来自模板，坐标为实验结构原值，键长偏长系晶体构象，未做几何纠正」 |
| 7 | P/O 比口径 | 旧口径 NADH 3 / FADH₂ 2 vs 现行 2.5 / 1.5 | 2.5 / 1.5；C16 净 106 ATP | Lehninger Ch.17；旧 129 仅作 legacy 对照 | FAO 能量账本写 2.5/1.5 与 106；旧值只在注记中出现 |
| 8 | 糖原能量账 | 分解省 1 ATP、合成耗 2 个酐键，是否可相抵为「净赚 1 ATP」 | 不相抵；分别列分解端与合成端 | 糖原磷酸解省 1 ATP/残基；UDP-葡萄糖合成消耗 2 个酐键；两侧方向不同 | 糖原页能量账本分别显示「省 1 ATP / 残基」与「耗 2 酐键 / 残基」，并注明不可相抵 |
| 9 | HMGCR 的区室 | 酶是内质网膜蛋白 vs 数据 `compartment = cytosol` | `compartment` 记胞质（催化域朝向胞质），`enzyme.note` 保留内质网膜定位 | 数据层 `enzyme.note`；反应发生在催化域一侧 | 胆固醇页同时显示区室标签与「内质网膜蛋白，催化结构域朝胞质」注记 |
| 10 | Cori 循环无专属酶 | 是否应画独立十步反应 | 不重复画；肌肉侧复用糖酵解步骤，肝侧复用糖异生步骤 | Cori 循环由既有通路步骤组成；项目按 `pathway + stepId` 引用 | Cori 页只画器官间物质流与骨架步骤，点击跳转既有通路，不复制酶名/反应式 |
| 11 | 第 4 步醛缩酶物种 | 人 `4ALD` vs 兔 `1ADO` | 人 `4ALD`；兔 `1ADO` 仅作同酶跨物种对照 | `research/aldolase-species-check.md` 的 RCSB 裁决 | 帧带每帧统一标注物种；兔结构明确写「兔 ALDOA」，不写「同物种」 |
| 12 | 第 8 步 PGAM 物种 | 人源无底物复合物 vs 酵母 `1QHF` | 酵母 `1QHF`，明确标非人源 | RCSB 检索：人源 PGAM 无任何底物复合物 | 结构对照/帧带显著标注「酵母 1QHF」，不冒充人源 |
| 13 | README 的结构块计数与进度 | 旧 README 写 63 块、PLATE 11/12 未完成；实际 77 块、数据与页面已存在 | 以仓库实际为准（77 块） | 本轮 `comparisonConfig.ts` 统计 | README 现为 77 块、12 页已建；本轮按要求未改 README |
| 14 | 教材引用粒度 | 章/表级 vs 页码级 | 只写书名 + 版次 + 章/表号，不写未核实页码 | 数据层 `source` 现状；不凭记忆补页码；逐条对书核页码成本过高且易错 | 页面与数据保留章/表号；页码仅在对书核实后才可加 |

### 4.1 教材引用粒度：页码 vs 章/表号（2026-11-07 决定）

| 方案 | 风险 | 工作量 | 结论 |
|---|---|---|---|
| 保留页码 | 版次 / 印次不同，页码会漂移；24 个 `deltaG.source` 与 87 步需逐条翻书核对；记错即产生「假精确」，比没有页码更糟 | 高：需实体书逐条比对，并记录印次与核对日期 | 不采用 |
| 书名 + 版次 + 章/表号 | 粒度较粗，同章多表时需靠表号消歧；但不会出现错页码 | 低：现有数据已是章 / 表级 | 采用 |

执行规则：凡无法确认某条页码确实对得上的，一律写成「Lehninger Principles of Biochemistry, 8e, Ch.xx / Table xx-x」，不保留页码。核查结果：`src/data/**/*.json` 的 `source` / `deltaG.source` 中未发现页码（检索 `p.` / `pp.` / `页码` 均无命中），本轮无需改数据；`src/` 按要求不动。

**统一处理规则**：
1. 同一数据只采用一个口径；另一口径只能出现在注记/对照中，不能同时作为正文事实。
2. 查不到数字就不写数字；定性结论必须带出处或标「未核实」。
3. 实验坐标与计算构象分开标注；不得用计算构象冒充结合态，不得用别酶口袋冒充本酶。
4. 非人源/非本酶结构必须写明物种、来源蛋白与「不是本步酶口袋」。
5. 不为了让图更好看而改数据、键级或坐标；几何偏差如实注记。

---

## 5. 待确认项与落实结果

| # | 事项 | 查了哪里 | 缺什么 / 为什么不能下结论 |
|---|---|---|---|
| 1 | OMIM 使用条款 | `omim.org/help/agreement`、`/about`、`/help/copyright`；Wayback、archive.today、r.jina.ai、Google 翻译入口；镜像数据文件头；NeDRex / PanelApp / Illumina EULA；reusabledata.org | **条款全文查不到**（官网仍拦截，4 个替代入口无可读副本）。已确认：版权归 JHU；商业使用/再分发需 JHU 许可；`custom` 许可。只引编号与病名时的标注方式见第 1 节 OMIM 行与 `THIRD_PARTY_NOTICES.md` 第 4.5 节 |
| 2 | Lehninger 数值再分发的法域风险 | 数据层 `source` 字符串；教材版权一般原则 | 未取得出版社书面许可；事实性数据与表格汇编的保护范围因法域而异，需法律意见 |
| 3 | Lehninger 章/表号与页码 | 24 个 `deltaG.source` 字符串；全量 `src/data/**/*.json` 页码检索 | **已决定并执行**：一律用书名 + 版次 + 章/表号，不写未核实页码；当前数据层无页码，无需转换。见第 4.1 节 |
| 4 | 86 个分子的 SMILES 来源 | `tools/gen-molecule-assets.py`、`ligands3d/*.json`、全仓 `PubChem` 检索 | **统一口径**：SMILES 是项目内维护的输入表，未记录逐条来源；不归因于 PubChem、教材或任何单一数据库。只用于离线资产生成（2D 坐标、计算构象、分子式/电荷推导），属项目整理数据，按 CC BY 4.0。RDKit 往返与分子式断言只证明可解析/一致，不证明来源。若需对外声称来源，须逐分子补 `SMILES_SOURCE` |
| 5 | 字体文件版本与取得路径 | `public/assets/fonts/` 的 404 个 woff2 名称表；`package.json`、`package-lock.json` | **已解决**：字体全部自托管，不依赖 `@fontsource` 包；字体二进制版本 2.004-H2（Sans）/ 2.003-H1（Serif）。`src/styles.css` 注释仍写「由 @fontsource 分片生成」，属历史生成说明，不构成依赖；本轮不动 `src/` |
| 6 | PDB CCD 是否有单独条款 | wwPDB Usage Policy、RCSB Policies | 未检索到 CCD 单独许可页；按 PDB 归档 CC0 处理，但「无例外」尚未取得明文确认 |
| 7 | eQuilibrator 存档数据的许可 | PyPI `equilibrator-api`、eQuilibrator 3.0 论文（arXiv:2103.00621） | 页面不展示数值，数据层不含计算值；`tools/` 仅保留复现脚本与结果存档 | 代码为 MIT；论文称原始数据为 CC 4.0，但未写明 BY 变体、数据集版本与署名格式；如启用须重新核实 |
| 8 | `6PGL` / `6PGD` 类误命中 | RCSB 条目标题 | 已确认是酶缩写，不是错数据；但说明「PDB 编号自动抽取」不可靠，后续需人工核对 |
| 9 | 32 个 `pdbCandidates` 的核验记录 | RCSB REST API（2026-11-06） | 本轮确认全部真实存在，但数据层没有逐条 `status` / 核验日期；需落库 |
| 10 | KEGG 等未使用数据库 | 全仓代码/数据检索 | 确认当前未使用；若后续接入，须重新核查条款，不能沿用本文件「未使用」结论 |

---

## 6. 维护规则

- 新增任何外部来源前，先在本文第 1 节登记「许可 / 署名 / 商业 / 再分发 / 提取-重组」，并附官方链接与核查日期。
- 新增数值必须带出处；查不到就写 `null` + 定性 + 来源，不得估算。
- 新增结构资产必须有 `provenance.kind`（`experimental` / `computed` / `none`）；实验资产必须有 `pdbId`、`method`、`resolution`、`species`。
- 2D 资产应补 `generatedBy` / `method`；手写坐标与 RDKit 输出必须可区分。
- 实验坐标与计算构象不得混用；非人源/非本酶结构必须在首屏可见处说明。
- 第三方代码、字体、数据库内容不得被仓库的 MIT 许可「再许可」；再分发时保留各自许可文本与署名。
- 本文件中的「待确认」项在核实前不得写成确定结论，也不得据此对外声明合规。
