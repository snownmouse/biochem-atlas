# 第三方声明（Third-Party Notices）

本文件列出本项目**直接依赖**与**随包分发**的第三方内容，逐项给出名称、版本、许可、版权行与仓库内位置。

- 本项目原创代码与原创文档：MIT，见 [LICENSE](LICENSE)。
- 本项目自写的讲解文字与整理后的数据：CC BY 4.0，见 [LICENSE-CC-BY-4.0.md](LICENSE-CC-BY-4.0.md)。
- 本文件所列第三方内容**不在上述 MIT / CC BY 4.0 授权范围内**，按其各自条款使用。
- 核对日期：2026-11-06。版本以仓库内 `package.json` 声明与本地已安装包为准；标「待确认」的项表示当前仓库与已查位置无法确定，未作猜测。

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

3Dmol.js 的 `LICENSE` 同时声明其内含以下组件：

- **GLmol**：版本 0.47，双许可 MIT 或 LGPL-3，版权行 `(C) Copyright 2011-2012, biochem_fan`。
- **Three.js**：MIT，版权行 `Copyright (c) 2010-2012 three.js Authors. All rights reserved.`；具体版本**待确认**（已查 `node_modules/3dmol/LICENSE`、`README.md`、`package.json`，均未记录所捆绑的具体版本号）。
- **jQuery**：MIT，版权行 `Copyright (c) 2011 John Resig`；具体版本**待确认**（已查同上位置，均未记录所捆绑的具体版本号）。

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

### 3.1 Noto Sans SC

| 项 | 内容 |
| --- | --- |
| 名称 | Noto Sans SC |
| 版本 | 字体二进制 `Version 2.004-H2`（读自 woff2 名称表）；打包来源 `@fontsource` 的包版本**待确认**（`package-lock.json` 未记录该依赖） |
| 许可 | SIL Open Font License 1.1 |
| 版权行 | Copyright 2014-2021 Adobe (http://www.adobe.com/), with Reserved Font Name 'Source' |
| 仓库内位置 | `public/assets/fonts/noto-sans-sc-*.woff2`，构建后复制到 `dist/assets/fonts/` |
| 许可全文 | `public/assets/fonts/OFL.txt` |

### 3.2 Noto Serif SC

| 项 | 内容 |
| --- | --- |
| 名称 | Noto Serif SC |
| 版本 | 字体二进制 `Version 2.003-H1`（读自 woff2 名称表）；打包来源 `@fontsource` 的包版本**待确认**（`package-lock.json` 未记录该依赖） |
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
| 说明 | 只作为**事实出处**引用；未复制教材的图表、段落或表格编排，不对其授予任何许可 |

### 4.5 OMIM

| 项 | 内容 |
| --- | --- |
| 名称 | OMIM 条目引用（数据层注记中的 OMIM 编号） |
| 许可 | **待确认**（官网条款页被反机器人验证拦截，未能取得一手文本；已查 `omim.org/help/agreement`、`/about`、`/help/copyright`） |
| 仓库内位置 | 数据层注记（共 21 处） |
| 说明 | 未复制 OMIM 正文；在许可确认前不再扩大使用范围 |

## 5. 待确认项汇总

| 项 | 状态 | 已查位置 |
| --- | --- | --- |
| Three.js 具体版本（3Dmol.js 内含） | 待确认 | `node_modules/3dmol/LICENSE`、`README.md`、`package.json` |
| jQuery 具体版本（3Dmol.js 内含） | 待确认 | 同上 |
| @fontsource Noto Sans SC 包版本 | 待确认（字体二进制为 2.004） | `package-lock.json`、`package.json`、`src/styles.css` 注释 |
| @fontsource Noto Serif SC 包版本 | 待确认（字体二进制为 2.003） | 同上 |
| OMIM 使用条款 | 待确认 | `omim.org/help/agreement`、`/about`、`/help/copyright`（均被拦截） |
