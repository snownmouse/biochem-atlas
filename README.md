# 生化反应 3D 可视化挂图平台

*Biochemical pathway atlas — data-driven SVG posters and 3Dmol.js structure demos, with no chemistry computed at runtime.*

把代谢通路做成可以贴着墙看的「挂图」：每个通路一张由数据驱动的 SVG 大图，每个分子可以在挂图上点开，看到 2D 结构式与 3D 结构对照。所有分子几何、构象、图像资产都在离线阶段生成好，页面运行时只做「数据 → 版面 → 交互」的映射，不在浏览器里跑任何化学计算，也不依赖后端起服务。

## 当前进度

全站共 23 张挂图（PLATE 00–22）：PLATE 00 为首页总图，PLATE 01–22 为 22 张通路挂图（PLATE 07 为 Cori 循环）。

| 编号 | 内容 | 状态 |
| --- | --- | --- |
| PLATE 00 | 首页总图（上下两域 · 代谢脊柱，二十二条通路标题块） | 已完成 |
| PLATE 01 | 糖酵解（10 步，肝 / 肌 / 红细胞三张 SVG） | 已完成 |
| PLATE 02 | 三羧酸循环（8 步闭环 + PDH 接驳步） | 已完成 |
| PLATE 03 | 糖异生（11 步，三次跨膜） | 已完成 |
| PLATE 04 | 磷酸戊糖途径（氧化相 + 非氧化相） | 已完成 |
| PLATE 05 | β-氧化（4 步 × 7 轮 + 活化与肉碱穿梭） | 已完成 |
| PLATE 06 | 氧化磷酸化（膜内模块页 + 独立结构页） | 已完成 |
| PLATE 07 | Cori 循环（器官列 + 血流带 + 能量账本） | 已完成 |
| PLATE 08 | 脂肪酸从头合成（三泳道 + 四步环） | 已完成 |
| PLATE 09 | 尿素循环（五步、跨区室闭环、双氮源） | 已完成 |
| PLATE 10 | 糖原代谢（分解 / 合成双臂，肝 vs 肌） | 已完成 |
| PLATE 11 | 氨基酸代谢（`src/data/amino-acid/`，挂图 + 7 个结构对照块） | 已完成 |
| PLATE 12 | 胆固醇代谢（挂图 + 7 个结构对照块） | 已完成 |
| PLATE 13 | 酮体代谢（生酮 5 步 + 肝外利用 1 段，肝线粒体 / 血液 / 肝外线粒体三区室，只做 2D） | 已完成 |
| PLATE 14 | 一碳单位 / 叶酸-甲硫氨酸循环（线粒体装载 2 + 胞质 7，只做 2D） | 已完成 |
| PLATE 15 | 嘧啶核苷酸代谢（胞质 11 + 线粒体内膜 DHODH 1，只做 2D） | 已完成 |
| PLATE 16 | 嘌呤核苷酸代谢（胞质 15 步，IMP 分叉 AMP / GMP，只做 2D） | 已完成 |
| PLATE 17 | 甘油磷脂与鞘脂代谢（内质网 14 + 高尔基体 1，只做 2D） | 已完成 |
| PLATE 18 | 血浆脂蛋白代谢（4 器官列 + 血浆带，11 段器官间物流，只做 2D） | 已完成 |
| PLATE 19 | 血红素代谢（合成 8 步 + 降解 2 步，线粒体起始 / 胞质中段 / 线粒体末端 / 内质网，只做 2D） | 已完成 |
| PLATE 20 | 胆汁酸代谢（6 步 + 1 段肠肝循环，内质网 / 线粒体 / 过氧化物酶体，只做 2D） | 已完成 |
| PLATE 21 | 糖复合物代谢（13 步，糖核苷酸供体 → 糖链，胞质 / 内质网 / 高尔基体，只做 2D） | 已完成 |
| PLATE 22 | 氧化还原与自由基（6 步，NADPH–GSH 抗氧化网与 ROS 主干；防御网络，非经典代谢通路，只做 2D） | 已完成 |

结构对照页共 **180 块**（每块 = 一步的底物 / 产物分子对照；SF-07 的 9 块复用糖酵解 / 糖异生既有块，不重复计数）：

| 结构页编号 | 通路 | 块数 |
| --- | --- | --- |
| SF-01 | 糖酵解 | 10 |
| SF-02 | TCA（含 PDH 接驳步） | 9 |
| SF-03 | 糖异生 | 13 |
| SF-04 | PPP | 8 |
| SF-05 | β-氧化 | 6 |
| SF-06 | 氧化磷酸化 | 独立模块页，不套用逐步对照器 |
| SF-07 | Cori 循环 | 9（复用糖酵解 / 糖异生既有对照块，不新建分子或 3D） |
| SF-08 | 脂肪酸从头合成 | 6 |
| SF-09 | 尿素循环 | 5 |
| SF-10 | 糖原代谢 | 6 |
| SF-11 | 氨基酸代谢 | 7 |
| SF-12 | 胆固醇合成 | 7 |
| SF-13 | 酮体代谢 | 6 |
| SF-14 | 一碳单位 / 叶酸-甲硫氨酸循环 | 9 |
| SF-15 | 嘧啶核苷酸代谢 | 12 |
| SF-16 | 嘌呤核苷酸代谢 | 15 |
| SF-17 | 甘油磷脂与鞘脂代谢 | 15 |
| SF-18 | 血浆脂蛋白代谢 | 11（颗粒组成对照，不是分子结构对照） |
| SF-19 | 血红素代谢 | 10 |
| SF-20 | 胆汁酸代谢 | 6 |
| SF-21 | 糖复合物代谢 | 13 |
| SF-22 | 氧化还原与自由基 | 6 |

`SF` 编号与 `PLATE` 编号一一对应（SF-07 即 PLATE 07），因此编号不会因为新增通路而重排。

结构页现状：**22 页全部已建**（SF-01–22）；SF-07 的 Cori 页复用糖酵解 / 糖异生既有对照块（9 块），不新建分子或 3D。SF-13–22 按同一口径只做 2D，不建 3D、不登记 PDB 候选；SF-18 以脂蛋白颗粒组成作对照，不画单一分子结构。

## 技术栈

- **Vite 6.4.5** + **React 18** + **TypeScript 5（`strict` 全开，含 `noUnusedLocals` / `noUnusedParameters`）**
- **react-router-dom 6**：`/`、`/pathway/:pathwayId`、`/step/:stepId`、`/structures/:pathwayId`
- **3dmol.js**：结构 3D 演示，按需懒加载（不进首屏 chunk）
- 离线侧只有 Node 内置能力 + Python/RDKit（生成 2D/3D 分子资产、补 SDF 键级、统一电离态）
- 无后端、无数据库、无运行时外部 API 调用

## 目录结构

```text
src/
  main.tsx               路由表（四个路由；通路与结构分别做分发）
  pages/                 页面：首页、各通路挂图页、单步页、结构对照页
  components/            内嵌 3D 查看器、酶 3D 面板、分子 3D、统一通路切换器
  data/
    <pathway>/           多数通路：xxx.json + skeleton.json + types.ts
    glycolysis.json      糖酵解数据（与 skeleton.json 同在 data 根）
    tca.json             TCA 数据（skeleton-tca.json 同在 data 根）
    comparisonConfig.ts  180 块结构对照配置（分子、标注、来源说明、默认模式判据）
    evidenceGrade.ts     证据等级的唯一推导处
    homeMap.ts           首页节点 / 连线 / 交汇点的数据推导
    homeLayout.ts        首页版面坐标与分域、预留槽
  styles.css             全站样式与挂图图框变量
scripts/
  build-pathway-svg.mjs  由 skeleton.json + glycolysis.json 生成三张器官 SVG（含坐标与化学一致性校验）
tools/                   资产生成、核验与校验脚本（见下）
public/assets/
  pathways/              生成好的通路 SVG
  structures/2d/         2D 结构式资产（JSON + SVG）
  ligands3d/             3D 配体资产（61 个 JSON，重原子坐标 + 键表）
  steps/                 单步切片用的 SDF / 帧资产
```

## 怎么跑

```bash
npm install
npm run dev       # 本地开发
npm run build     # 生成 SVG → tsc --noEmit → vite build
npm run preview   # 预览构建产物（默认 http://localhost:4173）
```

`npm run build` 的三个阶段按顺序执行，任一步失败即中止：`build:svg`（`scripts/build-pathway-svg.mjs`）、`tsc --noEmit -p tsconfig.json`、`vite build`。

首页有三种 fold 形态，共用同一套 URL 参数：

| 形态 | URL | 行为 |
| --- | --- | --- |
| 默认 | `/` | 收起右栏，按可视宽度等比铺满（上限 1400px） |
| 居中 | `/?fold=center` | 收起右栏，1020 原生宽度居中 |
| 展开 | `/?fold=open` | 展开右栏详情 |

## 怎么验

两类脚本，全部是独立可执行文件，不挂在 `npm run build` 里。

### 冒烟（30 个 `tools/smoke-*.mjs`）

用 `playwright-core` 驱动本机 Edge / Chrome 做真实浏览器断言。运行前先 `npm run build` 并 `npm run preview`，默认连 `http://localhost:4173`（可用环境变量 `BASE_URL` 改）。

```bash
node tools/smoke-home.mjs        # 首页总图
node tools/smoke-tca.mjs         # TCA 挂图切片
node tools/smoke-cori.mjs        # Cori 循环挂图
```

| 脚本 | 管什么 |
| --- | --- |
| `smoke-home` | 首页两域构图、节点与连线、点击语义、预留槽 |
| `smoke-nav` | 统一通路切换器（19 条 = 18 通路 + 首页、高亮唯一、跨页可达） |
| `smoke-embed` | 糖酵解海报 + 内嵌 3D 切片、缺资产降级、URL 还原 |
| `smoke-frames` | 糖酵解结构对照页 |
| `smoke-tca` / `smoke-tca-structures` | TCA 挂图 / TCA 结构对照页 |
| `smoke-gluconeogenesis` | 糖异生挂图（三次跨膜、右栏镜像对照） |
| `smoke-ppp-poster` / `smoke-ppp-structures` | PPP 挂图 / PPP 与糖异生结构对照页 |
| `smoke-fao` / `smoke-fao-structures` | β-氧化挂图 / 结构对照页 |
| `smoke-fas` | 脂肪酸从头合成挂图 |
| `smoke-oxphos` | 氧化磷酸化挂图 + 结构模块页 |
| `smoke-urea` | 尿素循环挂图 |
| `smoke-glycogen` | 糖原代谢挂图 + 结构对照页 |
| `smoke-amino` | 氨基酸代谢挂图 + 结构对照页 |
| `smoke-cori` | Cori 循环挂图（方向、引用、账本加法、首页回路不改六标题） |
| `smoke-cholesterol` | 胆固醇合成挂图 + 结构对照页 |
| `smoke-ketone` | 酮体代谢挂图（三区室、运输段、2D-only）+ SF-13 结构对照页 |
| `smoke-onecarbon` | 一碳单位挂图（2 区室、运输段、2D-only）+ SF-14 结构对照页 |
| `smoke-pyrimidine` | 嘧啶核苷酸挂图（CPS2 / DHODH 跨区室、3 接口）+ SF-15 结构对照页 |
| `smoke-purine` | 嘌呤核苷酸挂图（IMP 分叉、2 接口）+ SF-16 结构对照页 |
| `smoke-glycerophospholipid` | 甘油磷脂 / 鞘脂挂图（内质网 / 高尔基体、3 接口）+ SF-17 结构对照页 |
| `smoke-lipoprotein` | 血浆脂蛋白挂图（器官物流版式、颗粒账本）+ SF-18 颗粒组成对照页 |
| `smoke-heme` | 血红素代谢挂图（四区室、10 步、2 接口与 2D-only）+ SF-19 结构对照页 |
| `smoke-bile` | 胆汁酸代谢挂图（四区室、6 步 + 肠肝循环运输段、2 接口）+ SF-20 结构对照页 |
| `smoke-glycoconjugate` | 糖复合物代谢挂图（三区室、13 步、7 种糖核苷酸供体、4 接口、2D-only）+ SF-21 结构对照页 |
| `smoke-redox` | 氧化还原与自由基挂图（两区室、6 步、防御网络声明、2 接口、2D-only）+ SF-22 结构对照页 |
| `smoke-evidence` | 证据分级（糖酵解 / TCA / PPP / 糖异生四通路） |
| `smoke-atom-colors` | 全站原子配色一致性 |
| `smoke-molecule-profiles` | `/molecule/:id` 与 `/substances` 条目完整度 |
| `smoke-layout` | 全站版式红线（消费 `tools/audit-layout.mjs` 的报告，需先跑 `node tools/audit-layout.mjs --tag after`） |

### 数据校验（22 个 `tools/validate-*.mjs`）

纯 Node，不需要预览服务，非零退出即失败。多数脚本内置「负例自检」——故意改错一处，确认校验器真的会报错。

```bash
node tools/validate-ionization.mjs
node tools/validate-urea.mjs
```

| 脚本 | 管什么 |
| --- | --- |
| `validate-assets` | 结构对照页分子资产：3D / 2D 资产与数据层三方一致，含负例自检 |
| `validate-ionization` | pH 7.4 电离态口径：规则表、分子式独立推算、跨通路一致性、数据层 chargeBasis |
| `validate-home` | 首页总图数据（节点 / 边 / 交汇点，不依赖页面渲染） |
| `validate-cori` | Cori 数据：引用真实存在、账本按加法可验、无复制反应式 |
| `validate-gluconeogenesis` | 糖异生数据层化学 / 几何约束 |
| `validate-ppp` | PPP 数据层，7 条负例自检 |
| `validate-fao` | β-氧化数据层 |
| `validate-fas` | FAS 数据层，11 条负例自检 |
| `validate-urea` | 尿素循环，≥6 条负例自检 |
| `validate-glycogen` | 糖原代谢数据层（PLATE 10 / SF-10） |
| `validate-amino` | 氨基酸代谢数据层（PLATE 11 / SF-11） |
| `validate-cholesterol` | 胆固醇合成数据层（PLATE 12 / SF-12） |
| `validate-ketone` | 酮体代谢数据层（PLATE 13 / SF-13）：三区室、2D-only、无 PDB 候选，9 条负例自检 |
| `validate-onecarbon` | 一碳单位数据层（PLATE 14 / SF-14），17 组 + 11 条负例 |
| `validate-pyrimidine` | 嘧啶核苷酸数据层（PLATE 15 / SF-15），12 条负例 |
| `validate-purine` | 嘌呤核苷酸数据层（PLATE 16 / SF-16），12 条负例 |
| `validate-glycerophospholipid` | 甘油磷脂 / 鞘脂数据层（PLATE 17 / SF-17），15 条负例 |
| `validate-lipoprotein` | 血浆脂蛋白数据层（PLATE 18 / SF-18）：器官物流、颗粒账本、2D-only，16 条负例 |
| `validate-heme` | 血红素代谢数据层（PLATE 19 / SF-19）：10 步 / 4 区室 / 2 接口 / 2D-only，13 条负例 |
| `validate-bile` | 胆汁酸数据层（PLATE 20 / SF-20）：6 步 + 1 段运输 / 2 接口 / 2D-only，13 条负例 |
| `validate-glycoconjugate` | 糖复合物数据层（PLATE 21 / SF-21）：13 步 / 3 区室 / 7 种供体 / 4 接口 / 2D-only，15 条负例 |
| `validate-redox` | 氧化还原数据层（PLATE 22 / SF-22）：6 步上限 / 防御网络声明 / 2 接口 / 2D-only，15 条负例 |
| `validate-molecule-notes` | 分子档案 note 完整度 |
| `validate-substances` | `/substances` 条目字段完整度与链路可达 |

## 关键约定

### 证据分级 A/B/C/D

等级不手写，一律由 `src/data/evidenceGrade.ts` 从 `coordSource` / `pocketRole` / `species` 推导：`experimental + own + human` = A（本酶人源），`experimental + own + nonhuman` = B（本酶跨种），`experimental + other + human` = C（人源非本酶），`experimental + other + nonhuman` = D（跨种非本酶）。`computed`（RDKit 自由态构象）与 `none`（只做 2D，如 CO₂ / HCO₃⁻）不进入 A–D，只作为「计算构象」「仅 2D」两个覆盖标签。块级等级取两侧实验坐标分子中最差的一级，字段缺失或与分子对不上时显式显示「未分级」，不猜、不硬塞。

### 电离态按 pKa 口径

所有分子资产统一到生理 pH 7.4 的电离态：磷酸单酯 −2、酰基磷酸 −2、羧酸 −1、氨基酸 α-羧基 −1 / α-氨基 +1、胍基 +1，酰胺 N、硫酯、醇 / 酚、季铵等按各自 pKa 判据处理。规则表与逐分子电荷依据在 `tools/validate-ionization.mjs` 与各实体的 `chargeBasis` 字段里，2D/3D 资产与数据层的电荷、分子式必须三方一致。

### SDF 键级规范

实验配体 SDF 由 PDB HETATM 截取时只带坐标，键表需要补齐，口径写在 `tools/fix-sdf-bond-orders.py`：

- 原子坐标与原子顺序逐字节保留，只重写 counts 行与 bond block；
- counts 行必须落在 V2000 固定列位（脚本用 `counts[34:39] == "V2000"` 自检），否则直接退出；
- 键级优先来自已核验 SMILES 模板，芳环一律写 Kekulé（1/2 交替），**禁止 order 4**；匹配不到时才用 RDKit 从坐标推断，并在报告里标 fallback；
- 双 / 三键会做键长自检（明显接近单键长度即视为模板映射落错位置）。

### 挂图图框统一规范

所有挂图与结构面板共用同一组 CSS 变量（`src/styles.css`）：`--plate-frame-ink: #22282a` 的 1px 墨色边框、`--plate-frame-paper: #f6f3ec` 的纸白底、`--plate-frame-pad: 24px` 内边距。新增挂图沿用变量，不写死颜色与内边距。

### 首页 fold 三档

见上文「怎么跑」的表格：默认 fitwidth、`?fold=center`、`?fold=open`。三档共用同一套 URL 参数与同一份版面数据，切换只改变右栏开合与画布缩放，不改节点与连线。

## 数据来源与许可

许可按内容分三层，各自指向独立文件：

| 内容 | 许可 | 文件 |
| --- | --- | --- |
| 本项目原创代码与原创文档 | MIT | [LICENSE](LICENSE) |
| 自写的讲解文字与整理后的数据 | CC BY 4.0 | [LICENSE-CC-BY-4.0.md](LICENSE-CC-BY-4.0.md) |
| 第三方库、字体与随包分发的外部数据 | 各自条款 | [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) |

教材内容只作事实出处标注，不对其图表、段落或表格编排授予任何许可。

- 化学事实、EC 编号与能量数据：教材 `Lehninger Principles of Biochemistry, 8e`（章/表级引用）；EC 编号经 IUBMB Enzyme Nomenclature（EBI OLS4 标 CC BY 4.0）。
- 结构坐标以 wwPDB / RCSB PDB 实验结构为准（PDB 归档数据为 CC0 1.0），选用前逐个在 RCSB 核验物种、方法、分辨率、配体；UniProt（CC BY 4.0）仅用于条目核对与 amino 数据的 accession 注释。
- 数值性质：**ΔG 数值不在页面展示**，全部步骤只保留「单向 / 可逆 / 限速」等定性标注与 ATP/NADPH 化学计量；`deltaG` 的 `standard` / `physiological` / `value` / `valueKcal` 字段统一为 `null`，`qualitative` 与教材级 `source` 保留。历史计算存档见 `tools/calc-deltag-equilibrator.py` 与 `tools/deltag-results.json`（仅供复现，未在页面展示；启用须同步改渲染与断言）。43 个分子 3D 资产为实验坐标，18 个为 RDKit 计算构象（ETKDGv3 + MMFF94）；2D 资产共 125 个 JSON / 124 个 SVG：82 个为 RDKit 2D 布局、39 个为 2D-only 口径、3 个为脚本手写坐标、1 个为 DEMO 占位。此外有 20 个分子（THF 的四个氧化级 + 16 个甘油磷脂 / 鞘脂）本轮明确不建 2D，数据层用 `missing2dReason` 声明原因、页面显示「缺 2D 结构式 + 原因」，不用近似结构凑数。查不到的数字留空，不估算。
- 实验坐标**未做几何纠正**：不理想化、不最小化、不重嵌入，原子位置是结构文件里的原始坐标；键长 / 键角的视觉偏差属数据本身，不是渲染误差。
- 第三方库与字体：React、Vite、react-router-dom 为 MIT；RDKit、3Dmol.js 为 BSD-3-Clause；Noto Sans SC / Noto Serif SC 为 SIL OFL 1.1。逐项版本、版权行与仓库内位置见 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)；字体目录内许可全文为 `public/assets/fonts/OFL.txt`。
- KEGG、BRENDA、MetaCyc、SABIO-RK、eQuilibrator 当前未用于页面或数据生产；KEGG 仅在首页致谢文字中被提及，eQuilibrator 仅有计算存档脚本。
- 遇到争议口径时只采用一个口径，另一口径只进注记；非人源/非本酶结构必须标明物种与来源蛋白，实验坐标与计算构象不得混用。完整清单与处理规则见下。
- 来源登记表、引用完整度审计、缺口清单、争议清单、核实结果与未解决项见 [docs/data-provenance.md](docs/data-provenance.md)。
- 本项目**仅用于教学与演示**，不构成科研结论、不做临床或药物决策依据。

## 许可

- 原创代码与原创文档：MIT，见 [LICENSE](LICENSE)。
- 自写的讲解文字与整理后的数据：CC BY 4.0，官方全文与建议署名格式见 [LICENSE-CC-BY-4.0.md](LICENSE-CC-BY-4.0.md)。
- 第三方库、字体与外部数据：按各自条款使用，逐项清单见 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)。
- 教材内容只作事实出处，不授予任何许可；更细的来源与争议记录见 [docs/data-provenance.md](docs/data-provenance.md)。
