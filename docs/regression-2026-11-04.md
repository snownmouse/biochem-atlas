# 发布前全站回归报告（2026-11-04）

范围：全站首页、五条挂图（糖酵解 / TCA / 糖异生 / PPP / β-氧化）、五个结构对照页、糖酵解单步页、十一套冒烟 + 四套数据校验。
口径：只读为主，不改生产代码；仅修阻塞问题（本次为 0 条）。测试全部对 `dist` 产物（`vite preview`，4173）实测，无任何断言删除或弱化。

## 结论速览

- **阻塞级问题：0 条。** 11 套冒烟 + 4 套校验全绿，12 条路由全部 HTTP 200、首屏 `pageerror` / `console.error` 均为 0。
- 构建通过：`vite build` 2.09s（含 npm 开销 5.26s），产物 `index.js` 582.31 kB / gzip 211.19 kB，`3Dmol` 独立 chunk 588.12 kB / gzip 169.78 kB（动态 import，首屏不加载）。
- 最脆的一套：`smoke-embed`（见 Q2）。
- 全站最不一致：挂图编号与跨页引用（见 Q3）。
- 明天只做一件事：统一挂图编号与跨页引用（见 Q4）。

## 一、测试矩阵（全部通过）

计数口径：冒烟脚本按输出行首 `✓` 计数；validate 按“正例 0 错 + 负例 N/N”计数。总耗时约 143s。

| 套件 | 结果 | 通过数 | 耗时 | 覆盖面 |
|---|---|---|---|---|
| `npm run build` | ✅ | exit 0 | 2.09s（build 内部）/ 5.26s（含 npm） | 产物生成，无 error |
| `tools/smoke-embed.mjs` | ✅ | 94 | 32.1s | 五图交互、URL 还原、器官切换、内嵌 3D 与降级 |
| `tools/smoke-tca.mjs` | ✅ | 40 | 10.1s | TCA 语义、闭环/回流带、截图 |
| `tools/smoke-frames.mjs` | ✅ | 98 | 18.5s | 结构对照页十块、资产与来源角标 |
| `tools/smoke-tca-structures.mjs` | ✅ | 56 | 11.9s | TCA 九个分子块、来源说明、默认模式 |
| `tools/smoke-gluconeogenesis.mjs` | ✅ | 48 | 7.1s | 四泳道、跨膜路径、镜像表、能量账 |
| `tools/smoke-ppp-structures.mjs` | ✅ | 68 | 9.6s | PPP 分子块、TKT 两段接力、资产 |
| `tools/smoke-ppp-poster.mjs` | ✅ | 44 | 9.4s | PPP 挂图列账与接力语义 |
| `tools/smoke-evidence.mjs` | ✅ | 89 | 11.6s | 证据等级、来源、口径标注（全站） |
| `tools/smoke-fao.mjs` | ✅ | 79 | 8.4s | FAO 四步环、回流弧、能量账 106 |
| `tools/smoke-fao-structures.mjs` | ✅ | 53 | 8.9s | FAO 六块、2D/3D 与来源 |
| `tools/validate-home.mjs` | ✅ | 10 项正例，0 错 | 0.2s | 首页数据/链接 |
| `tools/validate-gluconeogenesis.mjs` | ✅ | 正例 0 错 + 负例 10/10 | 0.1s | 四泳道与碳守恒 |
| `tools/validate-fao.mjs` | ✅ | 正例 0 错 + 负例 9/9 | 0.1s | 循环闭合、碳守恒、P/O 分摊 |
| `tools/validate-ppp.mjs` | ✅ | 正例 0 错 + 负例 8/8 | 0.1s | PPP 两相净账 |

冒烟合计 **748** 项断言；validate 合计 **37** 项（首页 10 项正例 + 糖异生 10 负例 + β-氧化 9 负例 + PPP 8 负例）。**失败 0 套，因此不存在“代码真错 vs 断言过时”的分类分歧**。唯一需要记录的是：`smoke-fao` 与 `smoke-ppp-poster` 都把“PLATE 04”写成了硬断言（见 Q3 第 1 条），属于“断言把缺陷固定下来”，而非测试误报。

构建已知噪声（非错误）：3Dmol 的 eval 警告、`chunk > 500 kB` 提示。产物体积较上一版增长明显（`index.js` gzip 211.19 kB，上一版约 120 kB 量级），主要来自五条通路的数据/配置内联；仍是单文件 < 5 MB 约束内。

## 二、浏览器实测结论（1440 宽，Edge headless）

### 2.1 路由 200 + 首屏零报错 ✅

| 路由 | HTTP | 首屏 console error | 首屏 canvas |
|---|---|---|---|
| `/` | 200 | 0 | 0 |
| `/pathway/glycolysis` | 200 | 0 | 0 |
| `/pathway/tca` | 200 | 0 | 0 |
| `/pathway/gluconeogenesis` | 200 | 0 | 0 |
| `/pathway/ppp` | 200 | 0 | 0 |
| `/pathway/fatty-acid-oxidation` | 200 | 0 | 0 |
| `/structures/glycolysis` | 200 | 0 | 4 |
| `/structures/tca` | 200 | 0 | 4 |
| `/structures/gluconeogenesis` | 200 | 0 | 4 |
| `/structures/ppp` | 200 | 0 | 2 |
| `/structures/fatty-acid-oxidation` | 200 | 0 | 4 |
| `/step/gk-6` | 200 | 0 | 1 |
| `/no-such-route-404` | 200（SPA fallback） | 0 | 0 |

404 路径**无白屏、无控制台报错**，但显示的是 React Router 默认错误页（正文仅 `Unexpected Application Error! 404 Not Found`，43 字符），没有站内 404 版式与返回入口。列入建议第 3 条，非阻塞。

### 2.2 首页 → 挂图 → 结构对照 → 返回 ✅（五条链路全通）

| 链路 | 首页入口 | 选中步 URL | 结构入口 | 结构页 | 返回落点 |
|---|---|---|---|---|---|
| 糖酵解 | ✅ | `?step=gk-1` | `/structures/glycolysis?frame=gk-1-f0` | ✅ | `/pathway/glycolysis?step=gk-1` |
| TCA | ✅ | `?step=tca-1` | `/structures/tca#tca-1` | ✅ | `/pathway/tca` |
| 糖异生 | ✅ | `?step=gn-3` | `/structures/gluconeogenesis#gn-3` | ✅ | `/pathway/gluconeogenesis` |
| PPP | ✅ | `?step=ppp-o1` | `/structures/ppp#ppp-o1` | ✅ | `/pathway/ppp` |
| β-氧化 | ✅ | `?step=fao-2` | `/structures/fatty-acid-oxidation#fao-2` | ✅ | `/pathway/fatty-acid-oxidation` |

返回值差异：**只有糖酵解的结构页返回带 `?step=`**，其余四条返回裸挂图（丢失选中步）。不阻塞，但属于往返上下文不一致（建议第 2 条）。

另：五张挂图在**未选中任何步骤时都没有结构对照入口**（选中一步后右栏才出现入口）。首页本身有 10 个直达入口（5 挂图 + 5 结构页），链路可达；这是交互取舍，记录备查。

### 2.3 URL 参数刷新还原 ✅

- `?step=`：五条挂图分别用 gk-3 / tca-3 / gn-3 / ppp-o1 / fao-2 实测，刷新前后器官 tab 与右栏步骤文案一致，选中高亮 `svg .hl` 计数保持 2。
- `?organ=`：`rbc`（糖酵解 / PPP）、`muscle`（TCA）、`liver`（糖异生 / FAO）刷新后 tab 仍正确。
- `?mode=2d`：`/structures/glycolysis` 刷新前后 `.cmp-poster[data-mode]` 均为 `2d`。
- `?grade=a`：`/structures/tca` 刷新后 1 个筛选框 checked、9 块中隐藏 8 块、`gradeA=1`。
- `?frame=gk-9-f0`：按旧链接兼容规则重定向到 `#gk-9`，锚点存在。**只恢复到步骤锚点，不恢复具体帧**（当前页面为静态对照，非帧播放器，属既定设计）。

### 2.4 crumb 互跳 ✅

五张挂图的 crumb 均为 5 条链接（首页 + 其余四条通路），逐页比对 `href` 无缺失；站内 11 个去重链接全部 200。

### 2.5 视觉纪律全站扫描 ✅（12 页）

| 检查项 | 残留 | 说明 |
|---|---|---|
| 圆角卡片（radius ≥ 8px 的可见块） | 0 | 挂图、结构页、单步页均为直角纸面 |
| 投影（box-shadow） | 0 | — |
| 彩色装饰渐变 | 0 | 6 页检出的 `plate-canvas / home-canvas` 为 1px 墨色坐标纸网格，属挂图体例，非装饰渐变 |
| 胶囊 tab / `.pill` / `.capsule` | 0 | crumb 为下划线文字 |
| emoji | 0 | — |

已知边界（沿用上版定性）：单步页 `.op-hint` 提示气泡仍为 `border-radius: 999px` 的深色胶囊形（[styles.css L198-207](src/styles.css#L198-L207)），非控件、配色合规；不计入违规。另发现 `.skeleton / .sk-block` 是**未被任何页面引用的死样式**（10px 圆角 + shimmer 渐变），建议清理。

### 2.6 首页首屏零 3D / 零重资产 ✅

`/` 的全部请求：`index.html`、`index-hU3M_WHm.js`（582 kB）、`index-CLfioCyp.css`（47.7 kB）、Google Fonts（css + 多份 woff2 子集）。**无 canvas、无 3Dmol chunk、无 .pdb/.glb、无 /assets/steps 资产**。

额外风险（非阻塞）：首页外链 Google Fonts，境内网络环境下会回退系统字体，首屏字形与设计稿不一致；共触发约 30 个 woff2 子集请求。建议发布前改为自托管或本地子集（见建议第 5 条）。

### 2.7 “回流弧/接口被读成多一步” ✅

| 图 | `g[data-step-id]` 计数 | 与步数关系 | 结论 |
|---|---|---|---|
| TCA | 9（8 环步 + 接驳 PDH） | `tca-1..tca-8` + `tca-pdh`，互不重复；回流带不带 `data-step-id` | ✅ 回流带自身文案“闭环 · 非第 9 步”，不会被计成步 |
| PPP | 8（`ppp-o1..o3` + `ppp-n1..n5`） | TKT 在 n3 / n5 是**两个真实步骤**，各有独立 id | ✅ 两段接力没有被合并成一步，也没有多出幽灵步 |
| β-氧化 | 4（`fao-1..4`） | 活化 / 穿梭用 `data-prep-id`，不混入循环计数 | ✅ 回流弧不带 step id，循环仍为 4 步 |

数据层佐证：`tca.json` steps=8 + sideBranchSteps=[tca-pdh]；`ppp.json` steps=8；`fao.json` steps=6（4 循环 + 2 前置，前置单独用 prep id 选择）。

## 三、资产完整性（第 4 项）

- **总量**：3D 分子资产 **45** 个（`public/assets/ligands3d/*.json`）；2D 资产 **44** JSON + **43** SVG（`public/assets/structures/2d/`）。
- **实验 / 计算比例**：`experimental` **33**（73.3%）/ `computed` **12**（26.7%）。页面按 provenance 分别标注，未混用。
- **引用完整性**：`comparisonConfig.ts` 的 42 个 `D2(...)` 引用全部存在（JSON 与 SVG 都齐）；除 `co2` / `hco3`（只作为分子式文本块，按设计无 3D）外，配置内 37 个分子 id 均有 3D 资产。
- **实际加载**：五个结构对照页共请求 **212 次**分子资产、**48** 个去重 id，全部 HTTP 200。
- **10 块抽查**（2pg / 6pgl / acylcoa-c16 / carn / e4p / fa / fum / glc / icit / oaa）：2D/3D 均存在、可解析，坐标全部有限；3D `vdwVolumeA3` 94.7–318.6 Å³（均 > 50）；2D viewBox 860×540（长链块 1514×540 / 1506×540），原子均在框内，键索引全部有效。**失败 0**。
- 资产卫生：`demo-gap.json` 为无对应 SVG、且未被引用的演示残留；`2D` 中 `pyruvate` 与 `3D` 中 `pyr` 是同一分子的不同命名（配置分别引用，可工作但命名不统一）。

## 四、数据一致性（第 5 项）

### 4.1 能量账口径

| 通路 | 展示口径 | 数值 | 与 2.5/1.5 的关系 |
|---|---|---|---|
| 糖酵解 | 每葡萄糖 | 净 +2 ATP、+2 NADH | 不用 P/O，不冲突 |
| TCA | 每轮（每乙酰基） | +3 NADH、+1 FADH₂、+1 GTP、+2 CO₂ | **不给 ATP 当量** |
| 糖异生 | 每 2 丙酮酸 | −4 ATP、−2 GTP、−2 NADH | 不用 P/O，与糖酵解可闭环（4 ATP 对 2 ATP×2） |
| PPP | 每 1 G6P | +2 NADPH、+1 CO₂、ATP 0 | 明确“NADPH 不是 ATP” |
| β-氧化 | 每 C16 | 7 轮 × (1 NADH + 1 FADH₂) + 8 乙酰-CoA × 10 − 2 = **106** | 明确 P/O 2.5 / 1.5；旧口径 3/2 → 129 仅并列、不进加和 |

算术复核：`7 × 2.5 = 17.5`、`7 × 1.5 = 10.5`、`8 × 10 = 80`、`80 + 17.5 + 10.5 − 2 = 106` ✅。五条通路**没有互相矛盾的数值**；唯一缺口是 TCA 页只给还原当量、不给 ATP 当量，而 FAO 声称“与 TCA 档案同版本”，`tca.json` 却没有 `poBasis` 字段。属口径说明缺口，非数字错误。

### 4.2 同一分子跨通路一致性

跨通路重复分子逐对比对分子式 / 分子量：`f6p`↔`f6p-gn`、`fbp`↔`fbp-gn`、`pyr`↔`pyr-gn`、`6pg`↔`6pg-l`、`ru5p`↔`ru5p-i` 全部一致 ✅。

**一处不一致**：`g6p` = `C6H11O9P / 258.12`（1CZA，糖酵解），`g6p-g6pd` = `C6H13O9P / 260.13`（7SNI，PPP）。差 2 个 H，根因是磷酸基电离态口径不同（阴离子 vs 中性磷酸）。页面上 G6P 的分子式来自配置常量（统一显示 `C₆H₁₁O₉P`），所以**用户界面暂未外露矛盾**，但资产层口径不统一，后续若把资产分子式接到界面就会穿帮。

## 五、问题清单

### 阻塞级（0 条）

**空。** 无页面报错、无 404（SPA fallback 正常）、无 href 错误、无断言与行为矛盾、无视觉纪律违规。

### 非阻塞建议（按优先级）

1. **【P1】挂图编号与跨页引用错乱（本次最大的不一致）—— ✅ 已修，见第八节**
   - PPP 与 β-氧化主挂图都写 `PLATE 04 / 12`（[PppOverviewPage L436](src/pages/PppOverviewPage.tsx#L436)、[FaoOverviewPage L306](src/pages/FaoOverviewPage.tsx#L306)），但 FAO 自己的结构页是 `PLATE SF-05`——同一通路自相矛盾。FAO 应为 `PLATE 05 / 12`。
   - 糖酵解与 TCA 都把 NADH 指向“呼吸链（挂图 04）”（[PathwayOverviewPage L546](src/pages/PathwayOverviewPage.tsx#L546)、[TcaOverviewPage L503](src/pages/TcaOverviewPage.tsx#L503)），但 04 已是 PPP/FAO，全站也没有呼吸链页。
   - 糖酵解页脚仍写“挂图 02 · 丙酮酸氧化脱羧 → TCA 循环（**待续，本版未含**）”（[PathwayOverviewPage L676](src/pages/PathwayOverviewPage.tsx#L676)），而 TCA 早已上线。
   - 修这三处会联动 `smoke-fao.mjs` / `smoke-ppp-poster.mjs` 里写死的 `PLATE 04` 断言（[smoke-fao L63](tools/smoke-fao.mjs#L63)、[smoke-ppp-poster L40](tools/smoke-ppp-poster.mjs#L40)），需同步改断言值而非删断言。
2. **【P2】结构对照页返回丢选中步**：TCA / 糖异生 / PPP / β-氧化 的 `back` 目标不含 `?step=`，只有糖酵解保留。建议让 `comparisonConfig` 的 back 目标参数化，与结构页入口的锚点保持一致。
3. **【P2】无自定义 404**：未知路径落在 React Router 默认错误页，仅一行英文。建议加 catch-all 路由，用挂图版式给“回首页 / 五条挂图”入口。
4. **【P3】数据层电离态口径**：统一 G6P（以及所有磷酸糖）的质子化/电离约定，使资产 `formula` 与配置常量一致；同步把资产分子式接入界面前必须先做这一步。
5. **【P3】字体外链**：`fonts.googleapis.com` 在境内不可靠，首页首屏会回退字体；建议自托管 Noto Sans/Serif SC 子集，或将字族改为系统字体栈。
6. **【P3】文案/资产卫生**：结构对照页缺配置分支的“已接入”说明漏写 β-氧化（[StructureFramesPage L952](src/pages/StructureFramesPage.tsx#L952)，当前不可见）；`.skeleton / .sk-block` 死样式；`demo-gap.json` 无引用残留；`pyruvate` / `pyr` 命名不统一。
7. **【P4】首屏包体积**：`index.js` gzip 211 kB（较上版约翻倍），建议把五条通路的静态数据按路由拆 chunk 或做 JSON 懒加载。

## 六、回答四个问题

**Q1：有没有阻塞级问题？**
没有。0 条。所有路由可达、首屏零报错、测试全绿；唯一“像故障”的 `/no-such-route-404` 是 SPA fallback 正常返回 200 后落到默认 404 版式，不影响任何已上线链路。

**Q2：十一套冒烟里最脆的一套是哪套，为什么？**
`smoke-embed`（94 项 / 32.1s，全站最慢）。它依赖真实 WebGL 与 canvas 像素采样（内嵌 3D 是否真的画出来、点击残基是否命中），对机器负载/GPU 软渲染最敏感；其余套件大多是 SVG DOM 与数据断言，确定性强。`smoke-frames`（98 项）断言面最大、与结构资产耦合最深，排第二脆：数据或资产一改就要跟着改。

**Q3：全站现在最不一致的地方（按严重度）？**
1. **文案/编号**：`PLATE 04` 双重占用 + FAO 结构页 `SF-05` 自相矛盾 + 两处“呼吸链（挂图 04）”指向不存在的图 + 糖酵解“TCA 待续，本版未含”过期。全部是用户可见的事实性矛盾，最严重。
2. **数据口径**：G6P 资产分子式 `C6H11O9P` vs `C6H13O9P`（电离态未统一，暂未在界面外露）。
3. **能量账说明**：FAO 用 2.5/1.5 并声称与 TCA 同版本，但 TCA 页只给还原当量、`tca.json` 无 `poBasis`，读者无法自行对账。
4. **视觉**：仅单步页 `op-hint` 胶囊气泡一处已知边界；其余圆角/投影/渐变/胶囊/emoji 全站为 0。
5. **资产命名**：`pyr` / `pyruvate`、`demo-gap.json` 残留。

**Q4：如果明天只做一件事？**
统一“挂图编号 + 跨页引用”这一组文案错误：FAO 改 `PLATE 05 / 12`；两处 NADH 引用去掉错误的“挂图 04”；删掉糖酵解页脚的“待续，本版未含”；同步两条冒烟断言。改动小、风险低、全部是发布后用户第一眼能看到的矛盾。

## 七、产出物

截图（1440 宽，`preview/`，fullPage）：

| 文件 | 页面 | 高度 |
|---|---|---|
| [reg-01-home.png](preview/reg-01-home.png) | `/` | 1581 px |
| [reg-02-poster-glycolysis.png](preview/reg-02-poster-glycolysis.png) | `/pathway/glycolysis` | 1790 px |
| [reg-03-poster-tca.png](preview/reg-03-poster-tca.png) | `/pathway/tca` | 1799 px |
| [reg-04-poster-fao.png](preview/reg-04-poster-fao.png) | `/pathway/fatty-acid-oxidation` | 1993 px |
| [reg-05-structures-tca.png](preview/reg-05-structures-tca.png) | `/structures/tca` | 8819 px |
| [reg-06-step-gk6.png](preview/reg-06-step-gk6.png) | `/step/gk-6` | 2077 px |
| [reg-07-fao-plate-05.png](preview/reg-07-fao-plate-05.png) | `/pathway/fatty-acid-oxidation` 报头（1440×240 裁切） | 240 px |

首轮回归未改生产代码/测试；编号整改为追改（见第八节），未 git 提交；浏览器实测与资产/数据检查均为一次性脚本（未入库）。

## 八、编号与跨页引用整改（2026-11-04 追补）

范围声明：只改编号、悬空引用、过期页脚及对应断言；其余非阻塞项（返回丢步、404 版式、G6P 电离态、字体外链、返回丢失参数、包体积等）一律未动。

### 8.1 全站编号总表

扫描前缀：`PLATE 00–05`（主挂图）、`PLATE SF-01–SF-05`（结构对照）、`PLATE S-01–S-10`（糖酵解单步）。三套编号**各自无重复、无跳号**。

| 系列 | 编号 | 页面 | 路由 |
|---|---|---|---|
| 主挂图 | `PLATE 00 / 12` | 全站总图 | `/` |
| 主挂图 | `PLATE 01 / 12` | 糖酵解 | `/pathway/glycolysis` |
| 主挂图 | `PLATE 02 / 12` | TCA 循环 | `/pathway/tca` |
| 主挂图 | `PLATE 03 / 12` | 糖异生 | `/pathway/gluconeogenesis` |
| 主挂图 | `PLATE 04 / 12` | 磷酸戊糖通路 PPP | `/pathway/ppp` |
| 主挂图 | `PLATE 05 / 12` | 脂肪酸 β-氧化 | `/pathway/fatty-acid-oxidation` |
| 结构对照 | `PLATE SF-01` | 糖酵解 | `/structures/glycolysis` |
| 结构对照 | `PLATE SF-02` | TCA | `/structures/tca` |
| 结构对照 | `PLATE SF-03` | PPP | `/structures/ppp` |
| 结构对照 | `PLATE SF-04` | 糖异生 | `/structures/gluconeogenesis` |
| 结构对照 | `PLATE SF-05` | β-氧化 | `/structures/fatty-acid-oxidation` |
| 单步结构 | `PLATE S-01 … S-10 / 10` | 糖酵解各步 | `/step/<stepId>`（仅糖酵解） |

说明：`SF-03` / `SF-04` 按**结构对照页接入先后**独立编号（PPP 先于糖异生），与主挂图号不一一对应；两套体系各自无重复、无跳号，本轮不重排，避免超出唯一改动范围。主挂图号现已与 [homeMap.ts](src/data/homeMap.ts) 的映射完全一致（01 糖酵解 / 02 TCA / 03 糖异生 / 04 PPP / 05 β-氧化）。

### 8.2 文案改动（逐条：原文 → 新文）

| # | 文件:行 | 原文 | 新文 |
|---|---|---|---|
| 1 | [FaoOverviewPage.tsx L306](src/pages/FaoOverviewPage.tsx#L306) | `PLATE 04 / 12 · 第一版 · 2026` | `PLATE 05 / 12 · 第一版 · 2026` |
| 2 | [FaoOverviewPage.tsx L1](src/pages/FaoOverviewPage.tsx#L1) | `// 脂肪酸 β-氧化挂图页（PLATE 04）。` | `// 脂肪酸 β-氧化挂图页（PLATE 05）。` |
| 3 | [PathwayOverviewPage.tsx L546](src/pages/PathwayOverviewPage.tsx#L546) | `NADH → 呼吸链（挂图 04）` | `NADH → 呼吸链（本版未含）` |
| 4 | [TcaOverviewPage.tsx L503](src/pages/TcaOverviewPage.tsx#L503) | `NADH / FADH₂ → 呼吸链（挂图 04）` | `NADH / FADH₂ → 呼吸链（本版未含）` |
| 5 | [PathwayOverviewPage.tsx L676](src/pages/PathwayOverviewPage.tsx#L676) | `挂图 02 · 丙酮酸氧化脱羧 → TCA 循环（待续，本版未含）` | `挂图 02 · 丙酮酸氧化脱羧 → TCA 循环` |

悬空引用处理口径：两处 NADH 引用改为“呼吸链（本版未含）”，**不指向任何现存挂图**（氧化磷酸化本轮无页面，未新增/未伪造页号）。糖酵解页脚直接删除“待续，本版未含”，因为 TCA 已接入且编号就是 02。

### 8.3 被改写的断言清单

| 文件:行 | 原断言 | 新断言 | 改写原因（已写进断言注释） |
|---|---|---|---|
| [smoke-fao.mjs L63-64](tools/smoke-fao.mjs#L63-L64) | `check("报头 PLATE 04", ...includes("PLATE 04"))` | `check("报头 PLATE 05", ...includes("PLATE 05"))` | FAO 主挂图由 04 改为 05，04 归 PPP，消除与自身结构页 SF-05 的自相矛盾 |

其余涉及 `PLATE` 的断言逐条核对后**未改**且语义不变：`smoke-home`（`PLATE 00`）、`smoke-ppp-poster`（`PLATE 04`，PPP 本身不变）、`smoke-fao-structures`（`SF-05`）。`smoke-evidence` 等其余套件不含编号断言，未触碰。

### 8.4 整改后回归

- `npm run build` ✅ exit 0，`vite build` 2.09s（含 npm 5.51s）；产物 `index-CsHHi2gU.js` 582.30 kB / gzip 211.18 kB，`3Dmol` 588.12 kB / gzip 169.78 kB。
- 11 套冒烟 + 4 套 validate 全量重跑，**15/15 全绿，0 失败**：`smoke-home 79`、`smoke-embed 94`、`smoke-tca 40`、`smoke-frames 98`、`smoke-tca-structures 56`、`smoke-gluconeogenesis 48`、`smoke-ppp-structures 68`、`smoke-ppp-poster 44`、`smoke-evidence 89`、`smoke-fao 79`、`smoke-fao-structures 53`；validate-home 10、validate-gluconeogenesis 正例 0 错 + 负例 10/10、validate-fao 正例 0 错 + 负例 9/9、validate-ppp 正例 0 错 + 负例 8/8。总耗时约 143s。
- 线上实测（`vite preview` 4173）：FAO 报头为 `PLATE 05 / 12 · 第一版 · 2026`；糖酵解 / TCA 文本含“呼吸链（本版未含）”、不含“挂图 04”；糖酵解文本不含“待续”。
- 截图：[reg-07-fao-plate-05.png](preview/reg-07-fao-plate-05.png)（1440×240 报头裁切）。
