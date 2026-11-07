# 第三方声明（Third-Party Notices）

本文件列出本项目**直接依赖**与**随包分发**的第三方内容，逐项给出名称、版本、许可、版权行与仓库内位置。

- 本项目原创代码与原创文档：MIT，见 [LICENSE](LICENSE)。
- 本项目自写的讲解文字与整理后的数据：CC BY 4.0，见 [LICENSE-CC-BY-4.0.md](LICENSE-CC-BY-4.0.md)。
- 本文件所列第三方内容**不在上述 MIT / CC BY 4.0 授权范围内**，按其各自条款使用。
- 核对日期：2026-11-07。版本以仓库内 `package.json` 声明、本地已安装包与构建产物文件头为准；标「查不到」的项表示已查位置均无法确定，未作猜测。

## 1. 运行时随包分发（进入浏览器构建产物）

### 1.1 3Dmol.js

| 项 | 内容 |
| --- | --- |
| 名称 | 3Dmol.js |
| 版本 | 2.5.5（`package.json` 声明 `^2.5.5`，本地安装 2.5.5） |
| 许可 | BSD-3-Clause |
| 版权行 | Copyright (c) 2014, University of Pittsburgh and contributors |
| 仓库内位置 | `node_modules/3dmol/`；由 `src/components/` 引用，构建后进入 `dist/` 产物 |
| 许可全文 | `node_modules/3dmol/LICENSE` |

3Dmol.js 的 `LICENSE` 声明其代码取自 GLmol、Three.js 与 jQuery，但 2.5.5 的构建产物并不是把三个库整体打包：

- **GLmol**：版本 0.47（`node_modules/3dmol/LICENSE` 明写「GLmol - Molecular Viewer on WebGL/Javascript (0.47)」），双许可 MIT 或 LGPL-3，版权行 `(C) Copyright 2011-2012, biochem_fan`。主构建 `build/3Dmol.js` 含 GLmol 派生代码（第 21614 行注释「a molecular viewer based on GLMol」）。
- **jQuery**：版本 **3.7.1**。依据是构建产物文件头：`build/3Dmol.ui.js` 第 26 行、`build/3Dmol.ui-min.js.LICENSE.txt` 第 8 行均含 `jQuery JavaScript Library v3.7.1`，版权行 `Copyright OpenJS Foundation and other contributors`。注意：该 jQuery 只出现在 UI 构建中；主构建 `build/3Dmol.js` 不含 jQuery 库（检索 `jQuery.fn` / `window.jQuery` 均为 0 命中），本项目经 `package.json` 的 `main: build/3Dmol.js` 引用的是主构建。3Dmol 自身 `package.json` 的 `devDependencies.jquery: "^3.6.3"` 是其开发/测试声明，不是捆绑版本。
- **Three.js**：具体版本**查不到**。`LICENSE` 只写 `Copyright (c) 2010-2012 three.js Authors. All rights reserved.`；`build/3Dmol.js`、`build/3Dmol.es6.js`、`build/3Dmol-min.js`、`build/3Dmol.es6-min.js` 均无 `THREE.REVISION` / `three.js rNNN` 版本常量；3Dmol 的 `package.json` 无 `three` 依赖；本地 `node_modules/three` 不存在。只能确认 MIT 版权行与 2010-2012 的时间范围，无法确认版次。

### 1.2 React / React DOM

| 项 | 内容 |
| --- | --- |
| 名称 | React、React DOM |
| 版本 | 18.3.1（`package.json` 声明 `^18.3.1`，本地安装 18.3.1） |
| 许可 | MIT |
| 版权行 | Copyright (c) Facebook, Inc. and its affiliates. |
| 仓库内位置 | `node_modules/react/`、`node_modules/react-dom/`；随构建进入 `dist/` 产物 |
| 许可全文 | `node_modules/react/LICENSE`、`node_modules/react-dom/LICENSE` |

### 1.3 react-router-dom

| 项 | 内容 |
| --- | --- |
| 名称 | react-router-dom |
| 版本 | 7.18.5（`package.json` 声明 `^7.18.5`，本地安装 7.18.5） |
| 许可 | MIT |
| 版权行 | Copyright (c) React Training LLC 2015-2019；Copyright (c) Remix Software Inc. 2020-2021；Copyright (c) Shopify Inc. 2022-2023 |
| 仓库内位置 | `node_modules/react-router-dom/`；由 `src/main.tsx` 路由表引用，随构建进入 `dist/` 产物 |
| 许可全文 | `node_modules/react-router-dom/LICENSE.md` |

## 2. 构建 / 开发依赖（不进入浏览器产物）

### 2.1 Vite

| 项 | 内容 |
| --- | --- |
| 名称 | Vite |
| 版本 | 6.4.5（`package.json` 声明 `^6.4.5`，本地安装 6.4.5） |
| 许可 | MIT |
| 版权行 | Copyright (c) 2019-present, VoidZero Inc. and Vite contributors |
| 仓库内位置 | `devDependencies`；仅用于 `npm run dev` / `npm run build` / `npm run preview`，不进入浏览器产物 |
| 许可全文 | `node_modules/vite/LICENSE.md`（该文件同时收录随 Vite 分发的第三方组件版权声明） |

### 2.2 TypeScript

| 项 | 内容 |
| --- | --- |
| 名称 | TypeScript |
| 版本 | 5.9.3（`package.json` 声明 `^5.6.3`，本地解析安装 5.9.3） |
| 许可 | Apache-2.0 |
| 版权行 | 版权持有者：Microsoft Corp.（`package.json` 的 `author` 字段）；Apache-2.0 正文本身未单列版权行 |
| 仓库内位置 | `devDependencies`；仅用于 `tsc --noEmit` 与编辑器类型检查，不进入浏览器产物 |
| 许可全文 | `node_modules/typescript/LICENSE.txt` |

### 2.3 @vitejs/plugin-react

| 项 | 内容 |
| --- | --- |
| 名称 | @vitejs/plugin-react |
| 版本 | 4.7.0（`package.json` 声明 `^4.3.4`，本地解析安装 4.7.0） |
| 许可 | MIT |
| 版权行 | Copyright (c) 2019-present, Yuxi (Evan) You and Vite contributors |
| 仓库内位置 | `devDependencies`；仅参与构建，不进入浏览器产物 |
| 许可全文 | `node_modules/@vitejs/plugin-react/LICENSE` |

### 2.4 playwright-core

| 项 | 内容 |
| --- | --- |
| 名称 | playwright-core |
| 版本 | 1.64.1（`package.json` 声明 `^1.49.1`，本地解析安装 1.64.1） |
| 许可 | Apache-2.0 |
| 版权行 | Copyright Microsoft Corporation |
| 仓库内位置 | `devDependencies`；仅由 `tools/smoke-*.mjs` 在本地跑浏览器断言，不进入浏览器产物 |
| 许可全文 | `node_modules/playwright-core/LICENSE` |

### 2.5 RDKit

| 项 | 内容 |
| --- | --- |
| 名称 | RDKit |
| 版本 | 2022.09.5（本地 Python 环境 `python -c "import rdkit; print(rdkit.__version__)"`） |
| 许可 | BSD-3-Clause |
| 版权行 | Copyright (c) 2006-2015, Rational Discovery LLC, Greg Landrum, and Julie Penzotti and others |
| 仓库内位置 | 不在仓库内，也不随 Web 包分发；仅作为离线资产生成工具，由 `tools/` 与 `scripts/` 下的 Python 脚本调用（2D 布局、3D 构象、SDF 键级、电离态处理） |
| 许可全文 | 本地安装目录 `D:\Anaconda3\Lib\site-packages\rdkit\license.txt` |

## 3. 字体（随包分发）

两个字体族的许可全文统一放在 [`public/assets/fonts/OFL.txt`](public/assets/fonts/OFL.txt)，该文件收录 SIL OFL 1.1 官方全文与两个字体各自的版权行。

字体已全部自托管：`public/assets/fonts/` 下有 **404 个 woff2**，直接随仓库分发。`package.json` 与 `package-lock.json` 均无字体打包依赖，因此本声明只列字体文件本身。

### 3.1 Noto Sans SC

| 项 | 内容 |
| --- | --- |
| 名称 | Noto Sans SC |
| 版本 | 字体二进制 `Version 2.004-H2`（读自 woff2 名称表）；自托管文件，不经过打包器引入 |
| 许可 | SIL Open Font License 1.1 |
| 版权行 | Copyright 2014-2021 Adobe (http://www.adobe.com/), with Reserved Font Name 'Source' |
| 仓库内位置 | `public/assets/fonts/noto-sans-sc-*.woff2`，构建后复制到 `dist/assets/fonts/` |
| 许可全文 | `public/assets/fonts/OFL.txt` |

### 3.2 Noto Serif SC

| 项 | 内容 |
| --- | --- |
| 名称 | Noto Serif SC |
| 版本 | 字体二进制 `Version 2.003-H1`（读自 woff2 名称表）；自托管文件，不经过打包器引入 |
| 许可 | SIL Open Font License 1.1 |
| 版权行 | Copyright 2012 Google Inc. All Rights Reserved. |
| 仓库内位置 | `public/assets/fonts/noto-serif-sc-*.woff2`，构建后复制到 `dist/assets/fonts/` |
| 许可全文 | `public/assets/fonts/OFL.txt` |

## 4. 随包分发的外部数据与教材

### 4.1 wwPDB / RCSB PDB

| 项 | 内容 |
| --- | --- |
| 名称 | PDB 实验结构坐标（含由 HETATM 截取的配体坐标） |
| 许可 | CC0 1.0（wwPDB 使用条款） |
| 仓库内位置 | `public/assets/ligands3d/`（实验坐标条目）、`public/assets/structures/2d/`、`public/assets/steps/` |
| 说明 | 数据本身为 CC0；本项目对其的整理与标注按 CC BY 4.0。各条目的 PDB ID 与核验信息见 `docs/data-provenance.md` |

### 4.2 UniProt

| 项 | 内容 |
| --- | --- |
| 名称 | UniProt 条目与 accession 注释 |
| 许可 | CC BY 4.0 |
| 仓库内位置 | 数据层中的 accession 注释（见 `src/data/amino-acid/` 与 `docs/data-provenance.md`） |
| 说明 | 仅用于条目核对与 accession 注释；对应版权归 UniProt Consortium |

### 4.3 IUBMB Enzyme Nomenclature（EC 编号）

| 项 | 内容 |
| --- | --- |
| 名称 | EC 编号 |
| 许可 | CC BY 4.0（经 EBI OLS4 标注） |
| 仓库内位置 | 数据层 `ec` 字段（85/87 步有 EC） |
| 说明 | 仅使用编号本身，不复制其描述文本 |

### 4.4 教材（Lehninger Principles of Biochemistry, 8e）

| 项 | 内容 |
| --- | --- |
| 名称 | Lehninger Principles of Biochemistry, 8e |
| 许可 | 无开放许可（版权归原出版方） |
| 仓库内位置 | 仅出现在数据层的章 / 表级出处标注与文档说明中 |
| 说明 | 只作为**事实出处**引用；未复制教材的图表、段落或表格编排，不对其授予任何许可。引用粒度一律为「书名 + 版次 + 章/表号」，不写未核实页码 |

### 4.5 OMIM

| 项 | 内容 |
| --- | --- |
| 名称 | OMIM 条目引用（数据层注记中的 OMIM 编号） |
| 许可 | **条款全文查不到**：官网 `omim.org/help/agreement`、`/about`、`/help/copyright` 仍返回反机器人验证页；Wayback、archive.today、r.jina.ai、Google 翻译代理入口均无可读内容。可确认的事实：① OMIM 数据版权归 Johns Hopkins University，镜像数据文件头为 `Copyright (c) 1966-2016 Johns Hopkins University. Use of this file adheres to the terms specified at http://omim.org/help/agreement.`（来源：`http://data.biostarhandbook.com/omim/mim2gene.txt`）；② NCBI 的 OMIM 说明页称其「freely available」、由 JHU 编写，官方主页为 omim.org（来源：`https://www.ncbi.nlm.nih.gov/omim`）；③ 第三方 EULA 均写明 OMIM 数据由 JHU 控制，商业使用与再分发需 JHU 许可：NeDRex EULA（`https://nedrex.net/about.html`）、PanelApp Terms of Use（`https://prod-media-panelapp.genomicsengland.co.uk/media/files/GEL_-_PanelApp_Terms_of_Use_December_2019.pdf`）、Illumina DRAGEN 附加条款（`https://support.illumina.com/content/dam/illumina-support/documents/documentation/software_documentation/dragen-bio-it/Software%20Subscription%20Agreement%20-%20DRAGEN.pdf`）；④ reusabledata.org 把 OMIM 许可标为 `custom`（`https://reusabledata.org/omim.html`） |
| 仓库内位置 | 数据层注记（共 21 处，只出现 MIM 编号与病名） |
| 说明 | 标注方式：`OMIM #<MIM>（<病名>），OMIM / Johns Hopkins University，https://omim.org`；只引登记号与病名，不复制条目正文、表格或描述；不把 OMIM 内容纳入 CC BY 4.0；条款全文取得前不扩大使用范围 |

## 5. 版本与条款核查结果

| 项 | 结果 | 已查位置 |
| --- | --- | --- |
| Three.js 具体版本（3Dmol.js 内含） | **查不到** | `node_modules/3dmol/LICENSE`、`package.json`、`build/3Dmol.js`、`build/3Dmol.es6.js`、`build/3Dmol-min.js`、`build/3Dmol.es6-min.js`（无 `THREE.REVISION` / `three.js rNNN`）；本地无 `node_modules/three` |
| jQuery 具体版本（3Dmol.js 内含） | **已确认 3.7.1** | `build/3Dmol.ui.js` L26、`build/3Dmol.ui-min.js.LICENSE.txt` L8（均为 `jQuery JavaScript Library v3.7.1`） |
| OMIM 使用条款 | **条款全文查不到**；已确认版权归 JHU、商业/再分发需 JHU 许可 | 官网三页（拦截）、Wayback / archive.today / r.jina.ai / Google 翻译（空）、镜像数据文件头、NeDRex / PanelApp / Illumina EULA、reusabledata.org |
