# 全站内容缺口盘点 · 2026-11-05

范围：PLATE 00 首页 + PLATE 01–09 九条通路 + SF-01…SF-07 结构对照页。
方式：只读脚本审计数据层与 comparisonConfig，再用 RCSB PDB / IUBMB EC / UniProt 一手页面核对可疑条目。
约束：未改 `HomePage.tsx` / `homeLayout.ts` / `homeMap.ts` / `styles.css`，未新增通路，未 commit。

## 一、结论

| 类别 | 盘点到 | 已补 | 未补（含原因） |
|---|---|---|---|
| 数据层化学 / 表述错误 | 7 | 7 | 0 |
| 表述精度改进（非硬错误） | 2 | 2 | 0 |
| 结构来源标注（首屏可见） | 8 处 | 8 处 | 0 |
| 校验器覆盖缺口 | 3 个脚本 | 3 个脚本 | 0 |
| 可访问性（导航 skip link） | 1 | 1 | 0 |
| 已登记但元数据不全的 PDB 候选 | 7 条 | 7 条 | 0 |
| 数据层结构性缺口（非化学错误） | 6 类 | 0 | 6 类（见第三节） |
| 已知遗留（视觉 / 交互 / 资产工艺） | 4 类 | 0 | 4 类（见第三节） |
| 首页项（本轮禁改） | 2 类 | 0 | 2 类（见第三节） |

合计：补 28 个事实项（含 16 条新增校验负例），留档 12 类。

## 二、已补清单（每项带出处）

### 2.1 化学 / 表述错误（7）

1. **FAS 第 Ⅳ 步 ER 的 EC 号错**
   - 原值 `1.3.1.9（烯脂酰-ACP 还原酶，NADPH）`；IUBMB 的 1.3.1.9 是 **NADH 特异**（enoyl-[acyl-carrier-protein] reductase, NADH）。
   - 改为 `1.3.1.39（烯脂酰-ACP 还原酶，NADPH，Re 特异）`。出处：IUBMB EC 1.3.1.39；UniProt **P49327**（人 FASN）注释的 enoyl-ACP reductase 活性。
2. **FAS 实体 `cit` 分子式与电离态矛盾**：`C6H5O7-` 只表示 −1，但 `ionization` 写“三个羧酸各 −1，净 −3”。改为 `C6H5O7³⁻`。出处：柠檬酸三羧酸 pKa（2.1 / 4.8 / 6.4，Lehninger 8e Ch.2 电离表），pH 7.4 下净 −3；PubChem CID 311。
3. **FAS 实体 `oaa` 分子式与电离态矛盾**：`C4H2O5-` 只表示 −1，但 `ionization` 写“净 −2”。改为 `C4H2O5²⁻`。出处：草酰乙酸两个羧酸 pKa（2.2 / 3.9，Lehninger 8e Ch.2）；PubChem CID 970。
4. **PDB 2CG5 身份错误（3 处登记）**：原写作“酵母 Ⅰ 型 FAS 复合体”。RCSB 2CG5 实为 **人 AASDHPPT（氨基己二酸半醛脱氢酶-磷酸泛酰巯基乙胺转移酶）与 ACP/CoA 复合体，X-ray 2.70 Å**，与 FAS 无关。已全部删除，替换为人源 **8VM0**。
5. **PDB 1XKT 身份错误（2 处登记）**：原写作“酵母 FAS”。RCSB 1XKT 实为 **人 FASN 硫酯酶（TE）结构域单独结晶，X-ray 2.60 Å，无配体，4,111 原子**。已改 `organism: Homo sapiens`、`role: domain-fragment`、`resolutionA: 2.6`。
6. **PDB 1C9S 身份错误（尿素循环 OTC 候选）**：RCSB 1C9S 实为 **Geobacillus stearothermophilus TRAP–RNA 复合体，X-ray 1.90 Å**，不是 OTC。已删除。
7. **PDB 4F2Y 身份错误（尿素循环 OTC 候选）**：RCSB 4F2Y 实为 **3'-氟环己烯基核酸（F-CeNA）十聚体 DNA，X-ray 1.59 Å，配体 MG**，不是 OTC。已删除。

### 2.2 表述精度改进（2）

8. **`gk-rap`（Rapoport–Luebering 支路）补 EC 号**：`5.4.2.4（双磷酸甘油酸变位酶 BPGM；兼有 EC 3.1.3.13 磷酸酶活性，故为双功能酶）`。出处：IUBMB EC 5.4.2.4 + EC 3.1.3.13；该支路“变位酶 + 磷酸酶”双功能是既有 `significance` 文本的化学依据。
9. **`fao-1` 的 EC 注释精确化**：由“1.3.8.7（家族成员按链长细分）”改为“1.3.8.7（MCAD 代表；家族按链长另有 1.3.8.8 LCAD / 1.3.8.9 VLCAD / 1.3.8.1 短链）”。出处：IUBMB EC 1.3.8.7 / 1.3.8.8 / 1.3.8.9 / 1.3.8.1；图中 C16 底物由 LCAD/VLCAD 处理，原注释会让读者误以为只有一个 EC。

### 2.3 结构候选元数据补齐（7 条候选，0 条残留）

| 位置 | PDB | 物种 | 方法 | 分辨率 | 配体 | 说明 |
|---|---|---|---|---|---|---|
| FAS 全长（KS / KR） | 8VM0 | Homo sapiens | cryo-EM | 3.30 Å | NDP | 560.43 kDa，无突变，复合态 |
| FAS TE | 1XKT | Homo sapiens | X-ray | 2.60 Å | 无 | 仅 TE 结构域，非全长 |
| 尿素 OTC | 1EP9 | Homo sapiens | X-ray | 2.40 Å | CP | **突变体 L101F / Q270R**，非野生型 |
| 尿素 OTC | 1OTH | Homo sapiens | X-ray | 1.85 Å | PALO | 野生型；PALO 为**双底物类似物，非真实底物** |

同步改写页面上可见文案：`FasOverviewPage.tsx` 页脚原写“候选仅有酵母 FAS 2CG5 / 1XKT（分辨率与配体未核验）”，改为已核实的人源 8VM0 / 1XKT 说明；`urea.json` 顶层与 `urea-2` 的 `threeD.note` 同步改写。

### 2.4 首屏来源标注（8 处，全部在 `comparisonConfig.ts`）

糖酵解是唯一整条通路缺 `sourceNote` 的。`caveat` 与 `sourceNote` 在 `StructureFramesPage` 的 2D / 3D 两种模式下都在首屏可见（非折叠层），因此补齐即可。

| 块 | 分子 | 坐标来源 | 补写的关键事实 |
|---|---|---|---|
| gk-2 | g6p | 1CZA，人 HK1，1.90 Å | 人源但非 GPI 口袋；且 1CZA 中 G6P 位于**抑制位点** |
| gk-2 | f6p | 2CXS，小鼠 GPI，1.50 Å | 本酶活性位点但**非人源** |
| gk-3 | f6p | 2CXS，小鼠 GPI，1.50 Å | **非本步 PFK-1 口袋**，且非人源 |
| gk-4 | dhap | 1NEY，酵母 TPI，1.20 Å | **非本步醛缩酶口袋**，且非人源 |
| gk-5 | dhap | 1NEY，酵母 TPI，1.20 Å | 本酶活性位点但非人源 |
| gk-8 | 3pg | 9FDN，人 PGK1，1.58 Å | 人源但**非本步 PGAM 口袋** |
| gk-8 | 2pg | 3UCD，人 ENO2，1.41 Å | 人源但**非本步 PGAM 口袋** |
| gk-10 | pep | 3UCD，人 ENO2，1.41 Å | 人源但**非本步丙酮酸激酶口袋** |

`computed` 分子（BKPT 等 38 个）本来就有 `caveat`，本轮不重复添加。

### 2.5 校验器（3 个脚本，16 条新增负例）

| 脚本 | 原状态 | 本轮新增断言 | 新增负例 |
|---|---|---|---|
| `validate-fas.mjs` | 8 条负例；不校验分子式电荷、ER EC、PDB 身份 | 9) 分子式电荷 ↔ `ionization` 净电荷一致；10) 烯脂酰-ACP 还原必须 EC 1.3.1.39；11) PDB 候选人源 + 方法 + 分辨率 + 配体齐全，且 2CG5 不得出现 | 3（柠檬酸式退回、ER EC 退回、2CG5 退回） |
| `validate-cori.mjs` | **0 条负例** | 逻辑抽成 `check()`，正例与负例共用同一实现 | 6（引用断链、计数不符、账本求和矛盾、chip 断链、NADH 净额、血流方向） |
| `validate-urea.mjs` | 9 条负例；候选只查“未核验却填元数据” | 13) OTC 候选必须是人源 1EP9 / 1OTH 白名单，1C9S / 4F2Y 黑名单 | 2（退回 1C9S、物种改非人源），总计 11 |

负例均只改一处事实，让数据自身前后矛盾，再用同一 `check()` 复跑；不存在“求和与结论互相矛盾”的假命题。

### 2.6 可访问性

`PathwaySwitcher.tsx` 增加 skip link（“跳到主要内容”），落点 `span` 放在 `<nav>` 之后；样式写入 `src/styles/pathway-nav.css`（未动 `styles.css`）。默认 `transform: translateY(-200%)` + `opacity: 0`，仅 `:focus` 时显示；放在 nav 外是因为 `.pathway-switcher` 有 `overflow-x: auto`，放进去会被裁切。

## 三、未补清单（逐条原因）

### 3.1 首页项（本轮禁改，与并行会话冲突）

1. 首页 `HomePage.tsx` / `homeLayout.ts` / `homeMap.ts` / `styles.css` 的任何版式、文案、跳转改动。
2. 把 FAS / 尿素循环并入首页 SOURCES：`homeMap.ts` 明示这两条“不并入 SOURCES”，`validate-home.mjs` 的 `rawPathways` 也只含 6 条，属有意设计；落地必须改 `homeMap.ts`。

### 3.2 数据层结构性缺口（不是化学错误，本轮不改）

3. **`oxphos.json` 的 steps 只有 2 条且缺 `equation` / `ecNumber` / `deltaG` / `compartment`**。呼吸链复合体不是单一 EC 酶，硬填 EC 会是编造；`OxphosOverviewPage` 也不渲染 `steps`，候选列表反而完整（5LDW / 7QSK / 1ZOY / 1BE3 / 3ZCF / 5Z62 / 1BMF 均有人源、方法、分辨率、配体、原子数）。留档待“氧化磷酸化步骤补全”轮次。
4. **glucose / TCA / PPP 的 step 无 `compartment` 字段**（glycolysis 10、tca 8、ppp 8）。这三条是单区室通路，区室由 skeleton 泳道承担；加字段不会改变渲染，反而与 skeleton 双源。留档。
5. **FAS 没有 `ionization` 数组**，只有实体级 `formula` + `ionization` 文本；`validate-ionization.mjs` 因此不覆盖 FAS。本轮把电荷一致性并入 `validate-fas.mjs`（见 2.5），但不新建口径文件。
6. **`validate-home.mjs` 无负例自检**，且只覆盖 6 条通路。它强耦合 `homeLayout` / `homeMap`，本轮禁改这两个文件；补负例需要先确定首页会话的最终结构。留档。
7. **`validate-gluconeogenesis.mjs` 已有 10 条负例**，本轮未动该通路数据，未再扩写；不属于缺口。
8. **FAS / 尿素循环只有“候选”，没有 3D 资产**。FASN 560 kDa 巨型合酶、尿素循环当前步骤无“人源本酶 + 真实底物”的高分辨条目；页面明确“不出 3D、不伪造资产路径”，属设计而非缺陷。

### 3.3 已知遗留（视觉 / 交互 / 资产工艺）

9. **Cori 在 1280 宽下的肌列可见比例**：骨架横向总宽超过 1280 视口，肌列被横向裁切一部分；属骨架几何与响应式策略问题，改它要动 Cori skeleton 与版面，不在“内容补充”范围。
10. **hover 详情**：挂图分子 hover 详情已于 2026-11-06 实现（单例气泡 `ContentBubble.tsx`，见 `docs/todo-hover-detail.md`），不属内容缺口。
11. **配体 SDF 全单键**：`public/assets` 下 59 个 `.sdf` 仍为单键表示（例如 `public/assets/steps/gly-01/ligand-G6P.sdf`）。这是 2D 结构式资产格式问题，重生成需要改生成管线，本轮不做。
12. **6 个 `coordSource: "none"` 分子只有 2D**：`ppp-o3/co2`、`gn-1/hco3`、`urea-1/urea-nh3`、`urea-1/hco3`、`urea-1/urea-cap`、`urea-2/urea-cap`。CO₂ / HCO₃⁻ 只有 3–4 个重原子，无可用 3D 形状；CAP 易水解、无本酶口袋高分辨结构。均已在块内写 `sourceNote` 说明“只做 2D”。这是刻意选择，不是遗漏。

## 四、跨通路引用一致性（全过，无需修）

- **Cori 13 枚芯片**：全部指向 `cori-m-*` / `cori-l-*` 本地 arm 步骤；`gn-shuttle-mpc` 是糖异生 `skeleton.transportSteps` 成员，`GluconeogenesisOverviewPage` 能解析。
- **urea → TCA 回流**：`tcaInterface.sharedWith.entityId = fum`，`tca-6` / `tca-7` 均真实存在。
- **PPP 接口**：非氧化相 `ppp-n*` 的供体/受体碳数守恒，`validate-ppp.mjs` 负例全过。
- **PLATE 与 SF 编号**：PLATE 01–09 与 SF-01…SF-07 映射一致；Cori 无结构对照页属既有设计。Cori 的 `plateNo` 为 `PLATE 07 / 12`（其内部 12 格编号口径），不构成错指。

## 五、验证

```
npm run build                     通过（tsc 类型检查 + vite build）
validate-assets                    PASS（61 个 3D 资产 / 65 个证据分子；含负例自检）
validate-ionization                全部通过（含负例自检）
validate-home                      全部通过
validate-ppp                       PASS（正例 0 错 + 7 负例全抓）
validate-fao                       正例 0 错；负例 9/9
validate-gluconeogenesis           PASS（正例 + 负例 10/10）
validate-fas                       正例通过；负例 11/11（本轮 8→11）
validate-cori                      正例通过；负例 6/6（本轮 0→6）
validate-urea                      正例通过；负例 11/11（本轮新增 2 条，全抓）
```
