# 数据来源与许可（Data Provenance & Licensing）

本文件记录本项目（生化反应 3D 可视化平台）所用数据、结构坐标、计算工具与字体的来源、许可状态、引用完整度，以及存在分歧的数据口径。面向仓库读者与复用者，便于逐条查证。

- 核查日期：2026-11-06；许可条款与结构清单复评：2026-11-10（结论与依据见 `docs/pending-review.md` 第 3–5 节）
- 核查方式：只读检查仓库文件；逐条读取上游官方许可页 / 代码仓库 LICENSE / npm 与 PyPI 元数据；对结构编号调用 RCSB PDB REST API（`https://data.rcsb.org/rest/v1/core/entry/{id}`）核验是否存在。未凭记忆填写许可条款。
- 本轮范围：审计与文档；许可边界轮已补 `LICENSE` 适用范围、`LICENSE-CC-BY-4.0.md`、`THIRD_PARTY_NOTICES.md` 与 `public/assets/fonts/OFL.txt`。仍不修改 `src/data/**/*.json` 的引用字段，不 commit、不 push，不改 `package.json`、`index.html` 与字体文件本身。

---

## 1. 来源登记表

说明：
- 「许可」均为 2026-11-06 至 2026-11-07 从上游页面或仓库许可文件读到的原文结论；未能取得原文的标为「未取得」或「查不到」。
- 「提取-重组」指数据库权利层面的摘取与重新编排，不等同于版权层面的引用。
- 「本项目如何遵守」只写当前仓库实际做到的事；未做到的列入第 5 节缺口清单。

| 来源 | 用途与落点 | 许可 | 是否要求署名 | 是否限制商业使用 | 再分发 / 衍生 | 提取-重组限制 | 本项目如何遵守 |
|---|---|---|---|---|---|---|---|
| wwPDB / RCSB PDB 条目（结构坐标） | 43 个实验 3D 资产的配体坐标；结构对照块的来源说明；步骤页 21 个 PDB 文件 | CC0 1.0 Universal Public Domain Dedication，见 wwPDB Usage Policy | 不要求；wwPDB 明确「鼓励在可能时署名原始作者」 | 不限制（CC0 允许商业使用） | 允许再分发与衍生 | 无（CC0 放弃版权与相关数据库权利） | 逐条记录 PDB ID、方法、分辨率、物种、链、配体 resname；实验坐标不做几何纠正；保留原始作者署名入口（PDB ID） |
| PDB CCD（化学组分字典，配体定义） | 配体 atom/bond 名称与组分解读 | **CC0 1.0（2026-11-10 复核）**：CCD（`components.cif`）是 PDB 归档数据文件，随归档适用 wwPDB Usage Policy（`https://www.wwpdb.org/about/usage-policies`）；未检索到单独条款页，也无与之冲突的例外条款 | 不要求 | 不限制 | 允许 | 无 | 仅在资产生成与核对阶段使用；未把 CCD 条目文本作为页面文案 |
| UniProt | `src/data/amino-acid/amino.json` 中 10 个 accession 的条目核对；研究文档中的酶身份核对 | CC BY 4.0，见 UniProt License & disclaimer | 要求署名（CC BY 4.0） | 不限制 | 允许，须保留署名与许可指向 | 允许，须署名（CC BY 4.0 覆盖版权与数据库权利） | 数据层保留 accession；页面/文档引用 UniProt 名称；未复制条目正文 |
| IUBMB Enzyme Nomenclature（EC 编号，经 ExplorEnz / EBI OLS4 分发） | 165 条步骤记录的 EC 编号与酶分类 | EBI OLS4 的 Enzyme Nomenclature 条目声明 CC-BY-4.0；IUBMB 原站未提供统一许可页 | 要求署名（CC BY 4.0） | 不限制 | 允许，须署名 | 允许，须署名 | 每个步骤在 `ecNumber` 或 `enzyme.ec` 写 EC 编号；页面详情栏显示 EC；未复制酶学说明段落 |
| OMIM | 21 处临床/疾病关联编号 | **有条件允许（2026-11-10）**：NCBI Bookshelf 收录的 OMIM 条款原文写明可用于个人、教育/学术与研究用途，商业目的或再分发的复制、分发、传输、改编须 JHU 许可（`https://www.ncbi.nlm.nih.gov/books/NBK21108/`，2026-11-10）。版权归 Johns Hopkins University。**现行 Use Agreement 页 `https://www.omim.org/help/agreement` 源站返回 403，页面无条款正文**；已由用户本机与自动化会话两个独立复核确认（`/help/copyright`、`/`、`/help/faq` 同为 403 模板），原因在源站一侧，不再尝试访问。判定依据为 NCBI 收录的 **2002 年版**条款，**未直读最新版**，见 `docs/pending-review.md` 第 6 节 #24 | 要求（按学术惯例标注 OMIM / JHU 与官网） | 须 JHU 许可 | 须 JHU 许可（为再分发的复制/传输/改编均在限制内） | 须 JHU 许可 | 只引 MIM 编号与病名，不复制条目正文；标注「OMIM / Johns Hopkins University, https://omim.org」；不把 OMIM 内容纳入 CC BY 4.0；不用于商业用途 |
| Lehninger Principles of Biochemistry, 8e | 161 个定性 ΔG（数值不作页面展示）、能量账与机制描述 | **有条件允许（2026-11-10）**：无开放许可；复制受版权保护的材料须向 Macmillan Learning 申请许可（`https://www.macmillanlearning.com/college/us/legal/copyright-permission-form`，2026-11-10）。事实本身不受版权保护，表达（图表、表格编排、原文段落）受保护 | 无许可意义上的署名要求；学术引用为惯例 | 未授予（复制发行须许可） | 未授予（事实可引用，表达不可复制） | 未授予（未复制原表结构与图表） | 只引用反应事实与自写中文释义，标注章节/表号；2026-11-10 通读全仓 60 处引用，未发现原文段落、图表或表格编排的复制，也未发现逐句翻译；数值缺口留空 |
| KEGG | **未使用**（代码与数据层无 KEGG 数据）；首页致谢文字提及名称与年份 | 未核查（未使用其数据） | 不适用 | 不适用 | 不适用 | 不适用 | 未复制 KEGG 通路图、KO 编号或数据库内容；如后续接入，须先核实其学术/商业条款 |
| BRENDA | **未使用** | 未核查（未使用其数据） | 不适用 | 不适用 | 不适用 | 不适用 | 代码、数据、文档均未引用 |
| MetaCyc | **未使用** | 未核查（未使用其数据） | 不适用 | 不适用 | 不适用 | 不适用 | 代码、数据、文档均未引用 |
| SABIO-RK | **未使用** | 未核查（未使用其数据） | 不适用 | 不适用 | 不适用 | 不适用 | 代码、数据、文档均未引用 |
| eQuilibrator | **页面未使用**；`tools/calc-deltag-equilibrator.py` 与 `tools/deltag-results.json` 仅作计算存档，数值不进入页面与数据层 | **已核实（2026-11-10）**：软件 MIT（`eladnoor/equilibrator-api` 的 LICENSE，GitHub API 返回 `spdx_id = MIT`，`https://github.com/eladnoor/equilibrator-api/blob/master/LICENSE`）；数据 CC BY 4.0（Zenodo `4128542` Compound Database v1.0.0，DOI `10.5281/zenodo.4128543`；`3978439` Training data v1.1，DOI `10.5281/zenodo.5495826`；均 `license.id = cc-by-4.0`） | 启用时要求（CC BY 4.0） | 不限制 | 允许，须署名并注明修改 | 允许，须署名 | 存档脚本仅供复现；如启用须锁定版本（v1.0.0 / v1.1）、保留 DOI 与署名，并同步改渲染与断言 |
| PubChem | 2026-11-10 以 InChIKey 反查做**身份核验**（86 个 2D 资产的 SMILES），不作为来源归属 | 不适用（未引用 PubChem 数据，仅调用 PUG REST 核对） | 不适用 | 不适用 | 不适用 | 不适用 | 86 条全部可生成 InChIKey，81 条精确命中、5 条为已声明的分块片段或环式/电荷差异；明细见 `docs/smiles-source-map.tsv`。SMILES 仍按项目整理数据（CC BY 4.0），不归因于 PubChem 或任何单一数据库 |
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

- **可以安全再分发**：PDB 条目与 CCD（CC0；CCD 随归档适用，无单独条款页，2026-11-10 复核）；RDKit、3Dmol.js、React、Vite、react-router-dom（BSD/MIT，保留声明）；Noto 字体（OFL 1.1，保留许可文本）。
- **可以再分发但必须署名**：UniProt（CC BY 4.0）、IUBMB EC（CC BY 4.0）、Noto 字体（OFL 要求保留版权与许可）。
- **有条件允许（2026-11-10）**：Lehninger 教材内容——可引事实与自写释义，复制图表 / 表格编排 / 原文段落须向 Macmillan Learning 取得许可。
- **有条件允许（非商业，2026-11-10）**：OMIM——个人、教育/学术、研究用途允许；商业使用或再分发须 JHU 许可。结论依据 NCBI Bookshelf 收录的 2002 年版条款（`NBK21108`）；现行 Use Agreement 页源站 403、无条款正文（两个独立浏览器复核一致），未直读最新版，原因在源站一侧。只引 MIM 编号与病名，不引正文。
- **未使用，不产生许可义务**：KEGG、BRENDA、MetaCyc、SABIO-RK、eQuilibrator（eQuilibrator 仅有存档脚本，数值不进入页面与数据层；其软件 MIT、存档数据 CC BY 4.0 已于 2026-11-10 核实，启用时须署名）。
- **许可文本已补齐**：`public/assets/fonts/OFL.txt`（SIL OFL 1.1 全文 + 两个 Noto 字体的版权行）；根目录 `THIRD_PARTY_NOTICES.md`（第三方逐项声明）；`LICENSE-CC-BY-4.0.md`（CC BY 4.0 官方全文 + 建议署名格式）。

---

## 2. 引用完整度审计

### 2.1 步骤数据（`src/data/**/*.json`）

共 21 个数据文件、190 条步骤记录（按各文件 `steps` 数组逐条计）：糖酵解 10、TCA 8、糖异生 11、PPP 8、FAO 6、FAS 8、尿素循环 5、糖原 9、氨基酸 7、胆固醇 13、氧化磷酸化 2、酮体 6、一碳单位 9、嘧啶核苷酸 12、嘌呤核苷酸 15、甘油磷脂/鞘脂 15、糖复合物 13、氧化还原与自由基 6、血浆脂蛋白 11（物流步骤）、血红素 10（合成 8 + 降解 2）、胆汁酸 6（另有 4 段肠肝循环运输：BSEP / 胆囊排空 / ASBT+OST / NTCP，不计步）。氧化磷酸化的 7 个模块不计入步骤数。

| 指标 | 数量 | 说明 |
|---|---:|---|
| 顶层 `source` 字段 | 0 | 现有 schema 不在步骤顶层放 `source` |
| `deltaG.source` 有值 | 179 / 190 | 引用实际挂在 `deltaG.source` 上 |
| 无任何出处字段 | 11 | 血浆脂蛋白 11 条物流步骤；本就不走 ΔG 口径 |
| 有 EC 编号（`ecNumber` 或 `enzyme.ec`） | 165 / 190 | 缺口 25：氧化磷酸化 2 个电子入口模块、血浆脂蛋白 11 段物流、胆汁酸 4、糖复合物 2、氧化还原与自由基 4、酮体 1（丙酮旁路）、一碳单位 1（甲基转移酶家族）；这些步骤的 `enzyme.ec` 一律留空，不写占位文字。2026-11-10 补 3 条：甘油磷脂 `gpl-14`（1.14.19.17）、一碳 `oc-2`（1.5.1.15）、`oc-3`（1.5.1.5），依据 IUBMB EC / UniProt P13995、P11586 |
| ΔG 有数值 | 0 | 页面不展示热力学数值；`standard` / `physiological` / `value` / `valueKcal` 统一写 `null` |
| ΔG 仅定性、无数字 | 161 | 保留 `qualitative` 与教材级 `source` |
| ΔG 完全缺失 | 11 | 同上：血浆脂蛋白 11 条物流步骤 |
| 页面可见「未核实 / 未核验」类占位文字 | 0 条 | 查得到的事实已补实，查不到的字段留空且页面不渲染；仅 `types.ts` 内部注释还有 9 处说明性文字，不进入页面 |

- 全部 `deltaG.source` 均为 `Lehninger 8e` 的章/表级引用，或指向同项目内其他步骤的口径；**没有页码**。
- 糖酵解与 TCA 的教材表号仍保留在 `source`（Table 15-1 / Table 16-2），但数值字段为 `null`，页面不显示数字。
- 其余通路的 ΔG 只保留定性结论（如「近平衡」「强放能」「可逆」），不写数字。

### 2.2 结构对照数据（`src/data/comparisonConfig.ts`）

共 21 个通路配置、180 个结构块、438 个「分子 × 侧（底物/产物）」条目（按 `comparisonConfig.ts` 中 `substrate` / `product` 两侧的 `ev*` 调用逐条计，含新增 SF-13–22）。

| 指标 | 数量 | 说明 |
|---|---:|---|
| 结构块 | 180 | 含 SF-14–22 新增 97 块；SF-07 复用既有 9 块，不重复计 |
| 分子条目 | 438 | 同分子多次出现按条目计；其中 SF-14–22 新增 235 条 |
| `coordSource = experimental` | 123 | 有实验坐标；其中 7 条为 SF-13 / SF-17 复用的既有 3D 资产分子（`accoa` / `succoa` / `suc` / `fum` / `r5p` / `glu` / `acylcoa-c16`），这两张图不展示 3D |
| `coordSource = computed` | 39 | RDKit 计算构象（全部来自既有 13 个配置） |
| `coordSource = none` | 276 | 仅 2D；SF-14–22 的 2D-only 口径占 224 条 |
| 有 `sourceNote` | 170 / 185（既有 83 块） | 91.9%；SF-13–20 的 2D-only 条目统一用 `caveat` / `missing2dReason` 说明，不写 `sourceNote` |
| 缺 `sourceNote` | 15（既有 83 块） | 7 个实验条目 + 8 个计算条目（计算条目有 `caveat`） |
| 实验条目中 `sourceNote` 含 PDB ID | 99 / 106（既有 83 块审计口径） | 93.4%；该行未随 SF-13–20 重算 |
| 实验条目无 `sourceNote`（因而无 PDB ID） | 7（既有 83 块审计口径） | 全部在糖酵解早期条目（`glc`、`g6p`、`fbp`、`fbp-linear`、`3pg`、`2pg`、`pep`） |

### 2.3 分子资产

| 资产类型 | 数量 | 结构化来源字段 | 现状 |
|---|---:|---|---|
| `public/assets/ligands3d/*.json` | 61 | 有 `provenance` | 43 个 `experimental`（全部有 `pdbId`、`method`、`resolution`、`species`）；18 个 `computed`（全部有 `method`、`conformerCount`、`energyKcalMol`、`randomSeed`、`note`、`generatedBy`） |
| `public/assets/structures/2d/*.json` | 125 | 有 `provenance`（125/125） | 82 个为 RDKit 2D 布局（`kind: computed-2d`，带 `sourceSmiles` / `verifiedOn`）；39 个为 2D-only 口径（`kind: computed`，注明「仅 2D 示意；不建 3D，不登记 PDB 候选」，含 PLATE 13–17 新增资产）；3 个脚本手写坐标仍在 `annotations` 里注明；1 个 DEMO 占位 |
| `public/assets/structures/2d/*.svg` | 124 | 无 | 与 JSON 配对；缺 1 个 SVG（`demo-gap`，DEMO 占位，不进正式序列） |
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
| 161 个定性 ΔG | 引用文献的定性结论；无数字（11 段脂蛋白物流步骤无 ΔG 字段；其余 179 条有 ΔG 记录，其中 161 条带定性结论） | 全部通路 |
| 43 个实验 3D 坐标 | 实验观测（PDB） | `ligands3d` 的 `experimental` |
| 18 个计算 3D 构象 | 计算（RDKit ETKDGv3 + MMFF94） | `ligands3d` 的 `computed`；含能量、种子、构象数 |
| 125 个 2D 布局坐标 | 计算/绘制（RDKit 为主，3 个为脚本手写坐标，1 个 DEMO） | `structures/2d` |
| 范德华体积、主轴长度、ΔV% | 由坐标计算 | 资产 `shape`；结构对照默认模式判据 |
| 分子式、净电荷 | 由 SMILES + pH 7.4 电离口径推导 | 实体字段 + `validate-ionization` 校验 |
| 21 个酶 3D 已建 / 10 个无可用结构 | 21 步已接入 `public/assets/steps` 并在 manifest 解析；10 步 `threeD.status = pending`，原因分三类：人源结构缺失、无本酶-底物复合物、仅有跨物种替代或无配体 apo（清单见 `scripts/pathway-enzyme-inventory.md`） | 各通路步骤数据 |
| 32 个 `pdbCandidates` | 本轮核验存在，但数据层未记录核验状态 | 胆固醇 18、糖原 14 |

---

## 3. 缺口清单

| # | 文件 | 字段 / 位置 | 缺口 | 条目数 | 建议处理（下一步） |
|---|---|---|---:|---|
| 1 | `src/data/oxphos/oxphos.json` | `steps[oxphos-e]`、`steps[oxphos-f]` | 无 `deltaG`、`ecNumber`、`source` | 2 | 补 `source` 说明「电子入口模块，非催化步骤」；或显式标 `notApplicable` |
| 2 | `src/data/cholesterol/cholesterol.json` | `steps[].pdbCandidates[].status` | 候选对象存在，但无 `status` / 核验日期 | 18 | 按 amino 的 `status: verified` 格式补齐 |
| 3 | `src/data/glycogen/glycogen.json` | `steps[].pdbCandidates` | 以字符串数组形式存在，无物种/方法/分辨率/状态 | 14 | 统一为对象结构并补核验状态 |
| 4 | `src/data/comparisonConfig.ts` | `*.parts[].sourceNote` | 缺来源说明 | 15（实验 7 + 计算 8） | 实验 7 条补 PDB ID/来源蛋白；计算 8 条补「计算构象」结构化说明（现有 `caveat` 保留） |
| 5 | `src/data/comparisonConfig.ts` | 实验条目 `sourceNote` | 无 `sourceNote`（因而无 PDB ID） | 7（均为糖酵解早期） | 逐条补 PDB ID（如 `glc` 1CZA、`g6p` 1CZA、`3pg` 9FDN、`2pg`/`pep` 3UCD；`fbp` 4ALD） |
| 6 | `public/assets/structures/2d/*.json` | 顶层 | **已完成（2026-11-09）**：125/125 个 2D 资产均带 `generatedBy` / `method` / `provenance`；PLATE 13–17 新增 34 个资产按 2D-only 口径写明「不建 3D，不登记 PDB 候选」 | 0 | 无；后续新增资产沿用同一字段口径 |
| 7 | `public/assets/structures/2d/` | `annotations` | 无生成方式说明 | 4（`gap`、`bpg13`、`pyruvate`、`demo-gap`） | `gap` 补 annotation；其余标明「脚本手写坐标」或「DEMO」 |
| 8 | `public/assets/steps/manifest.json` | 每条目 | 无 `pdbId` | 12 个条目，0 个有值 | 增加 `pdbId` 与 `sourceUrl` |
| 9 | `public/assets/steps/**/*.pdb` | 文件头 | 无 `HEADER`/`TITLE`/`REMARK 2`，无 PDB ID | 21 | 生成时保留原始 `HEADER`、`TITLE`、`REMARK 2`，或在 manifest 记录 |
| 10 | `public/assets/steps/**/*.sdf` | 文件头 | 只有一句来源说明，无 PDB ID / 计算方式 | 59 | 增加 SDF data field：`PDB_ID` / `SOURCE` / `METHOD` |
| 11 | `tools/gen-molecule-assets.py` | SMILES 输入表 | 无逐分子来源字段；当前不能归因于 PubChem、教材或手工中的任一类。2026-11-10 已对 86 个带 `sourceSmiles` 的 2D 资产做 InChIKey → PubChem 身份核验（81 精确命中，5 条为已声明例外，明细 `docs/smiles-source-map.tsv`）；核验只证明结构身份，不构成来源归属 | 125 个分子 | 若需对外声称来源，增加 `SMILES_SOURCE` 并逐条核实；在此之前按项目整理数据（CC BY 4.0）处理 |
| 12 | `public/assets/fonts/` | 目录 | **已完成（2026-11-06）**：已补 SIL OFL 1.1 全文与两个字体版权行 | 1 个目录 | 文件：`public/assets/fonts/OFL.txt`；字体文件本身未改 |
| 13 | 仓库根目录 | 第三方声明 | **已完成（2026-11-06）**：已补第三方逐项声明 | 1 | 文件：`THIRD_PARTY_NOTICES.md`；覆盖 RDKit、3Dmol.js（含 GLmol / Three.js / jQuery）、React / React DOM、react-router-dom、Vite、TypeScript、@vitejs/plugin-react、playwright-core、Noto Sans SC / Noto Serif SC、PDB / UniProt / EC / 教材 / OMIM |
| 14 | `README.md` | 结构块计数 / 进度表 | **已完成（2026-11-09）**：README 现为 145 块、18 页已建（含 PLATE 14–18），与仓库实际一致 | 0 | 无（如后续再出现旧计数，按缺口处理） |
| 15 | `src/data/**/*.json` | OMIM 编号 | **有条件允许（2026-11-10）**：条款原文（NCBI Bookshelf `NBK21108`）允许个人、教育/学术、研究用途；商业使用或再分发须 JHU 许可。现行 Use Agreement 页源站 403、无条款正文（两个独立复核），依据 2002 年版条款，未直读最新版；见第 5 节 #1 | 21 处 | 保持「只引编号与病名、不引正文」；标注 `OMIM / Johns Hopkins University, https://omim.org`；不用于商业用途 |
| 16 | 各通路步骤数据 | `threeD.status` | 21 个已建 / 10 个无可用结构 | 10 步 | 已建步骤显示 3D；10 个无资产步骤保留灰字「待核验」，不得用别酶结构冒充 |

---

## 4. 争议数据清单与处理规则

| # | 争议项 | 分歧 | 本项目采用 | 依据 | 页面如何标注 |
|---|---|---|---|---|---|
| 1 | FAS 的 ER 酶 EC 号 | `1.3.1.39`（NADPH 依赖的烯酰-ACP 还原酶）与 `1.3.1.9`（NADH 依赖的旧口径） | `1.3.1.39` | FASN 的还原步骤使用 NADPH（Lehninger Ch.21）；IUBMB EC 1.3.1.39 的名称与反应写明 NADPH | FAS 挂图/详情栏显示 `EC 1.3.1.39`，不出现 `1.3.1.9` |
| 2 | FDPS 的区室归属 | 胞质 vs 过氧化物酶体 | 以胞质为主，注记「部分定位于过氧化物酶体」 | 数据层 `enzyme.note`；**未解决**：外部定位依据尚未写入 accession（尚未逐条核对可引用条目），在补齐前不把双重定位写成单一确定结论 | 胆固醇页步骤详情显示区室与 `enzyme.note`，不把双重定位压成单一定位 |
| 3 | MSDHL 与 MSMO1 基因名 | 旧称 `MSDHL` vs 现行 `MSMO1`（SC4MOL） | `MSMO1`，`MSDHL` 视为旧称 | 数据层注释与项目既定口径；**未解决**：外部基因命名核验尚未落库，在写入核验记录前不把旧称作废 | 胆固醇页显示 `MSMO1`，注释中保留旧称以便检索 |
| 4 | 胆固醇末端两条平行路线 | `DHCR7`（7-脱氢胆固醇 → 胆固醇）vs `DHCR24`（desmosterol → 胆固醇） | 两条都保留，画成并行终点 | 数据层分别登记两个酶与底物；临床关联各自成立 | 胆固醇页同时显示两条末端分支，不合并成单一路线 |
| 5 | ΔG 的标准态 / 生理态 | `ΔG°′` 文献值 vs 细胞内实际 ΔG | **决定：数值全部不作页面展示** | 标准态与生理态口径打架、部分数值误差过大、覆盖率不齐；只保留「单向 / 可逆 / 限速」等定性标注与 ATP/NADPH 化学计量 | 页面不出现具体 ΔG 数值；`deltaG` 数值字段统一 `null`，只显示定性句与 Lehninger 级出处；ΔG 页面只呈现定性方向，不展示数值，也不展示「数值未核实」的提示；计算存档见 `tools/calc-deltag-equilibrator.py` |
| 6 | 键级来自模板、坐标为实验值 | 模板键级 vs 实验几何键长偏长 | 保留模板键级，不改坐标；1.56–1.71 Å 的双键加统一注记 | `docs` 与结构对照块的 `caveat`：坐标为实验原值，键长偏长系晶体构象，未做几何纠正 | 分子对照首屏显示「键级来自模板，坐标为实验结构原值，键长偏长系晶体构象，未做几何纠正」 |
| 7 | P/O 比口径 | 旧口径 NADH 3 / FADH₂ 2 vs 现行 2.5 / 1.5 | 2.5 / 1.5；C16 净 106 ATP | Lehninger Ch.17；旧 129 仅作 legacy 对照 | FAO 能量账本写 2.5/1.5 与 106；旧值只在注记中出现 |
| 8 | 糖原能量账 | 分解省 1 ATP、合成耗 2 个酐键，是否可相抵为「净赚 1 ATP」 | 不相抵；分别列分解端与合成端 | 糖原磷酸解省 1 ATP/残基；UDP-葡萄糖合成消耗 2 个酐键；两侧方向不同 | 糖原页能量账本分别显示「省 1 ATP / 残基」与「耗 2 酐键 / 残基」，并注明不可相抵 |
| 9 | HMGCR 的区室 | 酶是内质网膜蛋白 vs 数据 `compartment = cytosol` | `compartment` 记胞质（催化域朝向胞质），`enzyme.note` 保留内质网膜定位 | 数据层 `enzyme.note`；反应发生在催化域一侧 | 胆固醇页同时显示区室标签与「内质网膜蛋白，催化结构域朝胞质」注记 |
| 10 | Cori 循环无专属酶 | 是否应画独立十步反应 | 不重复画；肌肉侧复用糖酵解步骤，肝侧复用糖异生步骤 | Cori 循环由既有通路步骤组成；项目按 `pathway + stepId` 引用 | Cori 页只画器官间物质流与骨架步骤，点击跳转既有通路，不复制酶名/反应式 |
| 11 | 第 4 步醛缩酶物种 | 人 `4ALD` vs 兔 `1ADO` | 人 `4ALD`；兔 `1ADO` 仅作同酶跨物种对照 | `research/aldolase-species-check.md` 的 RCSB 裁决 | 帧带每帧统一标注物种；兔结构明确写「兔 ALDOA」，不写「同物种」 |
| 12 | 第 8 步 PGAM 物种 | 人源无底物复合物 vs 酵母 `1QHF` | 酵母 `1QHF`，明确标非人源 | RCSB 检索：人源 PGAM 无任何底物复合物 | 结构对照/帧带显著标注「酵母 1QHF」，不冒充人源 |
| 13 | README 的结构块计数与进度 | 旧 README 曾写 63 块、PLATE 11/12 未完成；现按现状更正为 83 块、13 页已建（含 PLATE 13 / SF-13） | 以仓库实际为准（83 块） | `comparisonConfig.ts` 统计（`stepId` 逐条计数） | README 现为 83 块、13 页已建 |
| 14 | 教材引用粒度 | 章/表级 vs 页码级 | 只写书名 + 版次 + 章/表号，不写未核实页码 | 数据层 `source` 现状；不凭记忆补页码；逐条对书核页码成本过高且易错 | 页面与数据保留章/表号；页码仅在对书核实后才可加 |

### 4.1 教材引用粒度：页码 vs 章/表号（2026-11-07 决定）

| 方案 | 风险 | 工作量 | 结论 |
|---|---|---|---|
| 保留页码 | 版次 / 印次不同，页码会漂移；24 个 `deltaG.source` 与 87 步需逐条翻书核对；记错即产生「假精确」，比没有页码更糟 | 高：需实体书逐条比对，并记录印次与核对日期 | 不采用 |
| 书名 + 版次 + 章/表号 | 粒度较粗，同章多表时需靠表号消歧；但不会出现错页码 | 低：现有数据已是章 / 表级 | 采用 |

执行规则：凡无法确认某条页码确实对得上的，一律写成「Lehninger Principles of Biochemistry, 8e, Ch.xx / Table xx-x」，不保留页码。核查结果：`src/data/**/*.json` 的 `source` / `deltaG.source` 中未发现页码（检索 `p.` / `pp.` / `页码` 均无命中），本轮无需改数据；`src/` 按要求不动。

**统一处理规则**：
1. 同一数据只采用一个口径；另一口径只能出现在注记/对照中，不能同时作为正文事实。
2. 查不到数字就不写数字；定性结论必须带出处，无出处的定性判断不写进页面。
3. 实验坐标与计算构象分开标注；不得用计算构象冒充结合态，不得用别酶口袋冒充本酶。
4. 非人源/非本酶结构必须写明物种、来源蛋白与「不是本步酶口袋」。
5. 不为了让图更好看而改数据、键级或坐标；几何偏差如实注记。

---

## 5. 核实结果（全部收口）

| # | 事项 | 查了哪里 | 结论 |
|---|---|---|---|
| 1 | OMIM 使用条款 | `https://www.ncbi.nlm.nih.gov/books/NBK21108/`（2026-11-10）；`https://www.omim.org/help/agreement`（源站返回 403 错误模板、无条款正文，2026-11-10） | **已收口（2026-11-10）**：2002 年版条款原文表明个人、教育/学术、研究用途允许，商业使用或再分发须 JHU 许可。现行 Use Agreement 页由用户本机与自动化会话两个独立复核，均为同一 1019 字符 403 模板（`/help/copyright`、`/`、`/help/faq` 亦然），原因在源站一侧，不再尝试访问；**未直读最新版**，结论依据为 2002 年版。实际采用：只引 MIM 编号与病名，标注 `OMIM / Johns Hopkins University, https://omim.org`。见 `docs/pending-review.md` 第 3 节 #18 与第 6 节 #24 |
| 2 | Lehninger 数值再分发的法域风险 | `https://www.macmillanlearning.com/college/us/legal/copyright-permission-form`（2026-11-10）；全仓 60 处 `Lehninger` 引用逐条通读 | **已定案（2026-11-10）**：当前用法成立——只引事实性结论与自写释义、章/表级出处，不展示 ΔG 数值、不复制图表或表格编排；未发现原文段落复制或逐句翻译。复制发行须向 Macmillan 申请许可；若日后需要，另立条目跟踪 |
| 3 | Lehninger 章/表号与页码 | 24 个 `deltaG.source` 字符串；全量 `src/data/**/*.json` 页码检索 | **已决定并执行**：一律用书名 + 版次 + 章/表号，不写未核实页码；当前数据层无页码，无需转换。见第 4.1 节 |
| 4 | 86 个分子的 SMILES 来源 | RDKit 2022.09.5 生成 InChIKey；PubChem PUG REST 按完整 InChIKey 反查（2026-11-10） | **已核验（2026-11-10）**：86/86 可生成 InChIKey；PubChem 精确命中 81 条。5 条例外：`enoyl-c16` / `hydroxy-c16` / `keto-c16` / `succoa` 为已声明的反应端分块片段（CoA 长链省略，`comparisonConfig.ts` caveat 写明），`s7p` 为环式 −2 电荷、与 PubChem 开链中性记录不同构。均为已知设计，不改 SMILES。SMILES 仍是项目内维护输入，PubChem CID 仅作身份核验；明细 `docs/smiles-source-map.tsv` |
| 5 | 字体文件版本与取得路径 | `public/assets/fonts/` 的 404 个 woff2 名称表；`package.json`、`package-lock.json`；`src/styles.css` 首行注释 | **已解决**：字体全部自托管，不依赖 `@fontsource` 包；字体二进制版本 2.004-H2（Sans）/ 2.003-H1（Serif）；`src/styles.css` 首行注释已于 2026-11-07 改为「woff2 随仓库分发；来源与许可见 `public/assets/fonts/OFL.txt`」，不再提 `@fontsource` |
| 6 | PDB CCD 是否有单独条款 | `https://www.wwpdb.org/about/usage-policies`、`https://www.rcsb.org/pages/policies`（2026-11-10） | **已解决（2026-11-10）**：CCD（`components.cif`）是 PDB 归档数据文件，随归档适用 CC0 1.0；未检索到单独条款页，也未发现与之冲突的例外条款。按 CC0 使用，保留 PDB ID 署名入口 |
| 7 | eQuilibrator 存档数据的许可 | GitHub `eladnoor/equilibrator-api` LICENSE（API 返回 `spdx_id=MIT`）；Zenodo `4128542`、`3978439`（2026-11-10） | **已核实（2026-11-10）**：软件 MIT；数据 CC BY 4.0（Compound Database v1.0.0，DOI 10.5281/zenodo.4128543；Training data v1.1，DOI 10.5281/zenodo.5495826）。当前页面与数据层不使用其数值，不产生署名义务；若启用，须署名、注明修改、保留许可指向，并锁定版本与 DOI |
| 8 | `6PGL` / `6PGD` 类误命中 | RCSB 条目标题 | **已定案（2026-11-10）**：确认是酶缩写，不是错数据；数据与页面不改。该现象说明「PDB 编号自动抽取」不可靠，后续抽取一律人工复核 |
| 9 | 32 个 `pdbCandidates` 的核验记录 | RCSB REST API `core/entry/{id}` 逐条调用（2026-11-10） | **已核验（2026-11-10）**：32/32 返回 200，条目存在，标题与步骤酶一致。`ch-13` 的 6JKH（NSDHL）/ 6OHT（EBP）为簇内旁证（`role: architecture`）；`gly-3` / `gly-6` 复用 6UIQ（PGM1）属合理。数据层不改；逐条记录 `docs/pdb-candidates-check.tsv` |
| 10 | KEGG 等未使用数据库 | 全仓代码/数据检索 | 确认当前未使用；若后续接入，须重新核查条款，不能沿用本文件「未使用」结论 |

---

## 6. 维护规则

- 新增任何外部来源前，先在本文第 1 节登记「许可 / 署名 / 商业 / 再分发 / 提取-重组」，并附官方链接与核查日期。
- 新增数值必须带出处；查不到就写 `null` + 定性 + 来源，不得估算。
- 新增结构资产必须有 `provenance.kind`（`experimental` / `computed` / `none`）；实验资产必须有 `pdbId`、`method`、`resolution`、`species`。
- 2D 资产应补 `generatedBy` / `method`；手写坐标与 RDKit 输出必须可区分。
- 实验坐标与计算构象不得混用；非人源/非本酶结构必须在首屏可见处说明。
- 第三方代码、字体、数据库内容不得被仓库的 MIT 许可「再许可」；再分发时保留各自许可文本与署名。
- 本文件标为「未取得」「查不到」或第 5 节仍写「未决」的项，在核实前不得写成确定结论，也不得据此对外声明合规。
