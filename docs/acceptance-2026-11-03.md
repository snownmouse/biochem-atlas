# 验收总表 · 2026-11-03

**结论**：现在能用的只有糖酵解一条完整链——10 步化学数据、12 个 3D 资产、31 帧结构帧带（含 4 个 2D 结构式帧、5 个文字声明帧）、三器官静态 SVG、B 版挂图概览页与单步页；TCA 有页面和数据（8 步 + PDH 接驳 + 4 条回补）但没有 3D、没有单步页、没有静态 SVG；糖异生（11 步）、PPP（8 步）、β-氧化（6 条目）三个通路只有数据层和校验器，无任何页面。缺得最狠的是"数据有了但看不见"——三条新通路的数据全部压在仓库里。最该先补的两件事：① gk-4 物种口径错误（帧带称 4ALD 为兔源，manifest/meta 均为人源，属数据正确性问题，见文末"数据不一致"第 1 条）；② TCA 的单步页与静态 SVG（数据与骨架已就绪，补齐成本最低）。

---

## 一、通路总表

| 通路 | 状态 | 主步骤数 | 骨架 | 校验脚本 | 3D 资产 | 结构帧 |
|---|---|---|---|---|---|---|
| 糖酵解 | 已上线页面（挂图概览 + 单步页 + 帧带页 + 三器官 SVG） | 10 | ✓ skeleton.json（器官无关） | 无独立 validate；smoke-embed 89 项 / smoke-frames 61 项覆盖资产与页面 | 12 个（10 步 + 肝 GCK + 肌 PKM2） | 31 帧（gk-1…gk-8） |
| TCA | 已上线页面（TcaOverviewPage，pathwayId 驱动） | 8 + PDH 接驳步（tca-pdh），另有 4 条回补（anap-pc/glu/asp/odd） | ✓ skeleton-tca.json（椭圆环） | smoke-tca.mjs（39 项冒烟，非 validate） | ✗（页面固定占位：候选 1CTS / 7ACN / 1ZOY 未核验） | ✗ |
| 糖异生 | 仅数据层 | 11（gn-1…gn-11），另有 gn-cori / gn-ala 两条支路条目 | ✓ gluconeogenesis/skeleton.json | ✓ validate-gluconeogenesis.mjs | ✗（gn-1/gn-2 threeD=pending，其余 6 步 threeD=null 未规划） | ✗ |
| PPP | 仅数据层 | 8（氧化相 o1–o3 + 非氧化相 n1–n5） | ✓ ppp/skeleton.json | ✓ validate-ppp.mjs | ✗（前 5 步 threeD=pending，后 3 步无字段） | ✗ |
| β-氧化 | 仅数据层 | 6 条目（fao-act 活化 / fao-shuttle 穿梭 / fao-1…4 循环），含 C16 能量账章节 | ✓ fao/skeleton.json（四泳道） | ✓ validate-fao.mjs（正例 0 错 + 9 负例） | ✗（7 处 threeD 全部 pending） | ✗ |

数据层总步数：44 条主步骤 + TCA 4 条回补 + 糖异生 2 条支路。

---

## 二、糖酵解十步 × 三层可得性表

3D 列格式：PDB（物种）· 模式 · gzip 体积（整资产目录实测，Node zlib）。帧列：总帧数（3D / 2D / 声明）。caveats 取自 manifest.json 前 2 条原话。

| 步 | 3D 资产 | 结构帧 | caveats（前 2 条原话） |
|---|---|---|---|
| gk-1 己糖激酶 | 1CZA（人）· static · 158.6 KB | 4（4/0/0；f1 为带 gapStatement 的空口袋帧） | 3 条：①"人源 HK1 无 apo 结构，本步仅提供 static 结合态视图（无游离态切换）。"②"1CZA 为突变体且仅含 HK1 的 C 端催化半分子（单体），并非全酶四聚体。" |
| gk-2 磷酸葡萄糖异构酶 | 2CXS（小鼠）+ apo 1JIQ（人）· two-state · 369.4 KB | 4（3/0/1：f1 声明帧） | 2 条：①"跨物种配对：holo 2CXS 为小鼠（Mus musculus），apo 1JIQ 为人（Homo sapiens），物种不一致。"②"2CXS 中 GOL（甘油）为结晶添加剂，已滤除。" |
| gk-3 磷酸果糖激酶 | 8W2G（人 PFKL，cryo-EM 3.0 Å）· static · 109.2 KB | 4（2/0/2：f1 无 apo、f3 FBP 别构位） | 4 条：①"8W2G 为低温电镜（cryo-EM）3.0 Å 结构，分辨率低于其余 X 射线步骤。"②"8W2G 为人 PFKL（肝型同工酶）；肌型 PFKM 无高分辨底物复合物结构。" |
| gk-4 醛缩酶 | 4ALD（人，meta 标题 HUMAN MUSCLE…）+ apo（two-state 含 apo.pdb）· 105.4 KB | 4（3/0/1：f1 声明帧） | 2 条：①"4ALD 中底物为线形构象 F1,6BP（配体代码 2FP，已核实化学身份为 linear fructose-1,6-bisphosphate），非呋喃环天然构象。"②"4ALD 分辨率 2.8 Å，为十步中较弱之一。" |
| gk-5 磷酸丙糖异构酶 | 1NEY（酵母）+ apo 2JK2（人）· two-state · 92.2 KB | 3（2/1/0：f2 产物 GAP 为 2D） | 2 条：①"跨物种配对：holo 1NEY 为酿酒酵母，apo 2JK2 为人，物种不一致。"②"1NEY 蛋白含 6-氟色氨酸修饰残基（FTR，替代部分 Trp），已按蛋白残基保留而非配体。" |
| gk-6 GAPDH | 1U8F（人，holo）+ apo 8G15（人）· two-state · 110.7 KB | 4（2/2/0：f0 底物 GAP、f3 产物 1,3-BPG 均 2D） | 1 条：①"1U8F 不含底物 G3P/1,3-BPG 坐标，配体仅有辅因子 NAD；页面须如实标注'仅辅因子结合，不含底物坐标'。" |
| gk-7 磷酸甘油酸激酶 | 9FDN（人）+ apo 8YHP（人）· two-state · 136.3 KB | 4（3/1/0：f1 底物 1,3-BPG 为 2D） | **0 条（manifest caveats 为空数组）**——2WZB 过渡态类似物等口径只写在帧级注记里 |
| gk-8 磷酸甘油酸变位酶 | 1QHF（酵母）+ apo 4GPZ（人）· two-state · 84.7 KB | 4（3/0/1：f1 半 apo 声明帧） | 3 条：①"人源 PGAM1 无任何底物复合物结构，holo 采用酿酒酵母 1QHF（跨种）。"②"apo 4GPZ 并非严格游离态：催化组氨酸被 NEP（N1-磷酸组氨酸类似物，共价修饰残基）占据，已按修饰残基保留并如实标注。" |
| gk-9 烯醇化酶 | 3UCD（人 ENO2）+ apo 2PSN（人 ENO1）· two-state · 271.7 KB | 0（帧带断口：pendingNote"第 9 步帧待接入"） | 3 条：①"同工酶差异：holo 3UCD 为 ENO2（神经元型），apo 2PSN 为 ENO1（肌肉型），同为人源但同工酶不同。"②"3UCD 中 2PG 在 A 链、PEP 在 B 链，口袋判定以 A 链 2PG 位点为锚，PEP 输出但不参与口袋。" |
| gk-10 丙酮酸激酶 | 6NN4（人 PKL，D499N）+ apo 1ZJH（人 PKM2）· two-state · 153.1 KB | 0（同上断口） | 3 条：①"6NN4 为 D499N 突变体（催化残基 Asp499→Asn），属补偿性证据。"②"同工酶差异：holo 6NN4 为 PKL（肝型），apo 1ZJH 为 PKM2（肌肉型）。" |
| 变体 gk-1-liver | 1V4S（人 GCK，apo 1V4T 3.40 Å）· static · 142.7 KB | 0 | 3 条：①"GCK 为己糖激酶同工酶 IV（肝型变构酶），与主图 HK1 为不同同工酶。"②"1V4S 含合成激活剂 MRK（GKA 药物分子），已按替身配体滤除，属补偿性证据。" |
| 变体 gk-10-muscle | 3BJF（人 PKM2 变构态）· static · 96.0 KB | 0 | 3 条：①"3BJF 为 static 变构态结构：仅含变构激活剂 FBP 与必需离子 K⁺/Mg²⁺，无底物 PEP 坐标。"②"3BJF 中 OXL（草酸，PEP 类似物）已按替身配体滤除。" |

---

## 三、结构缺口表（完整清单，不美化）

"页面当前表达"指用户今天打开页面实际看到的东西。

| # | 位置 | 缺什么 | 原因 | 页面当前表达 |
|---|---|---|---|---|
| 1 | gk-1 | apo（游离态 HK1） | 人源所有 ≤3 Å 条目均含糖；ANM 试算缩放 7 Å 后两壁直径增益仅 0.2 Å | static 模式无切换 + manifest caveat + f1 口袋帧 gapStatement（砖红声明，不做随机扰动） |
| 2 | gk-1 | 产物 G6P 在活性位点的结合模式 | 1CZA 中 G6P 实测位于抑制位点 | f3 帧 role=allosteric，角标"1CZA 实测分布 · G6P 位于抑制位点"，注记"活性位点产物结合模式无实验结构，本帧不做伪造" |
| 3 | gk-2 | 人源 holo | 人源无 F6P 底物复合物 | holo 用鼠 2CXS + caveat"物种不一致"；帧带 f1 对人 apo 1JIQ 降级声明帧（三档规则禁止跨物种并置） |
| 4 | gk-3 | apo（人 PFK-1） | 人源无 apo 结构 | static + caveat；f1 为"无 apo 结构 · 声明帧" |
| 5 | gk-3 | 产物态（活性位点 FBP） | 8W2G 中 FBP 在别构位点非产物位 | f3 声明帧"FBP 位点=别构 · 非产物位 · 声明帧"，不声称产物态 |
| 6 | gk-4 | 跨结构 apo 并置 | 帧带认定"人 apo 与 holo 跨物种不可并置"（但该认定与 manifest 冲突，见不一致 #1） | f1 声明帧"跨物种降级 · 文字声明帧"；manifest 侧 two-state 仍含 apo.pdb |
| 7 | gk-5 | 产物 GAP 三维坐标 | PDB 组分字典不存在甘油醛-3-磷酸（G3P 是 sn-甘油-3-磷酸；9FFC 为已知陷阱） | f2 为 2D 结构式帧，角标"2D 结构式 · 无实验三维坐标" |
| 8 | gk-6 | 底物 GAP 坐标 | 同上（跨步沿用第 5 步缺口） | f0 为 2D 帧；跨步断口声明"相机在此断开" |
| 9 | gk-6 | 产物 1,3-BPG 坐标 | PDB 组分字典无该组分（13B/13PG 均无条目） | f3 为 2D 帧（2d/bpg13.json） |
| 10 | gk-7 | 底物 1,3-BPG 坐标 | 同 gk-6；真实中间体极不稳定 | f1 为 2D 帧 + 注记"不伪造结合模式" |
| 11 | gk-7 | 真实过渡态 | 1,3-BPG→3PG 磷酰转移过渡态寿命极短 | f2 用 2WZB（ADP+3PG+MgF₃⁻ 模拟过渡态），帧注记标"非真实中间体"（注意：manifest caveats 为空，此口径只在帧级） |
| 12 | gk-8 | 人 PGAM1 底物复合物 | 人源 33 条无 3PG/2PG/2,3-BPG 结构 | holo 用酵母 1QHF + caveat；f1 半 apo 4GPZ（NEP 修饰）降级声明帧 |
| 13 | gk-8 | 人源产物 2PG | 人 PGAM1 无产物结构 | f3 用细菌 1EQJ 兜底，角标"跨物种兜底 · 1EQJ（细菌）· 分子级呈现"（口袋不并置） |
| 14 | gk-9 | —（有 two-state 3D） | 同工酶不同：ENO2 holo / ENO1 apo | caveat ①；帧带未接入（第 9/10 步帧用户明确停下） |
| 15 | gk-10 | 催化残基野生型结构 | 6NN4 为 D499N 突变体 | caveat"属补偿性证据"；apo 1ZJH 为 PKM2 跨同工酶，caveat ② |
| 16 | gk-1-liver | 干净的 GCK 激活态 | 1V4S 含合成激活剂 MRK | MRK 已滤 + caveat；apo 1V4T 分辨率 3.40 Å 偏弱已注明 |
| 17 | gk-10-muscle | PKM2 底物结合态 | 3BJF 仅变构态（FBP+离子），无 PEP | static + caveat"无底物 PEP 坐标"；OXL 类似物已滤 |
| 18 | TCA 全部 8+1 步 | 3D 结合视图整体缺位 | PDB 候选未核验；复合体（PDH、α-KGDH）尺寸超单页约束 | TcaOverviewPage 右栏固定占位："3D 结合视图：待结构核验——PDB 候选（柠檬酸合酶 1CTS / 乌头酸酶 7ACN / 复合体 II 1ZOY 等）均为候选条目" |
| 19 | TCA tca-pdh | 辅因子接力中间态结构 | 五步辅因子接力（TPP→硫辛酸→FAD→NAD⁺）无全捕获结构 | tca.json significance 注明"只能 2D 呈现" |
| 20 | FAO 全部 6 条目 | 3D 资产整体缺位 | threeD 字段 7 处全部 pending | fao.json 内 pending note；穿梭步注明"CPT1 人源无结构（跨膜蛋白），穿梭段骨架走 2D 示意；CPT2 可用大鼠结构做单帧，须标注跨物种"、"人 CPT1/CPT2 均无晶体；鼠 CPT2 质量最高" |
| 21 | 糖异生 gn-1、gn-2 | 3D | threeD=pending 未启动 | 数据层 pending 标记，无页面 |
| 22 | PPP 前 5 步 | 3D | threeD=pending 未启动 | 数据层 pending 标记，无页面 |

---

## 四、证据与口径表

| 口径 | 涉及条目 | 页面标注方式 | 用户是否已明确接受 |
|---|---|---|---|
| 计算构象（ANM） | gk-1-f1 口袋帧 | gapStatement 砖红声明：ANM 增益仅 0.2 Å，**未采用**，按实验坐标呈现空口袋，seed 20261103 可复现 | 已接受"声明式缺口"兜底方案 |
| 跨物种 | gk-2（鼠 holo/人 apo）、gk-5（酵母 holo/人 apo）、gk-8（酵母 holo）、gk-4-f3 产物（兔 1ADO）、FAO CPT2（鼠 2RCU，候选） | 3D 视图角落显著标注物种（manifest caveat）+ 帧带 cornerNote"跨物种降级/跨物种兜底/跨结构示意" + 跨物种并置一律禁止（声明帧） | 已确认："必须用同工酶/跨物种结构 + 角落显著标注物种不匹配" |
| 突变体 | gk-1 1CZA（突变单体）、gk-10 6NN4（D499N） | manifest caveat"属补偿性证据"；帧带 f3 注明 1CZA 突变体半分子 | 已确认：补偿性证据默认接受但页面标注 |
| 过渡态类似物 | gk-7-f2 2WZB（MgF₃⁻） | 帧级注记"过渡态模拟（2WZB）标'非真实中间体'"；**manifest caveats 为空，未下沉到资产级 caveat** | 未在记忆中找到明确确认记录——未核实 |
| 线形构象 | gk-4 4ALD 底物 2FP | manifest caveat 原话注明"已核实化学身份…非呋喃环天然构象"；帧带注记"线形非生产性构象"；备选兔源 1ADO 已在帧带使用（f3） | 已确认：默认接受作主图，1ADO 作备选 |
| 半 apo | gk-8-f1 4GPZ（催化组氨酸被 NEP 共价修饰） | cornerNote"半 apo · NEP 修饰 · 跨物种降级 · 声明帧"+ gapStatement"人 PGAM1 全部 33 条无 3PG/2PG/2,3-BPG 结构" | 未单独确认，随 gk-8 跨物种方案一并呈现——未核实 |
| 2D 结构式帧 | gk-5-f2、gk-6-f0、gk-6-f3、gk-7-f1（共 4 帧，另有 demo-2d 不入正式序列） | 角标"2D 结构式 · 无实验三维坐标"；transition note 说明承接关系；渲染帧见砖红角标 | 已确认：产物无坐标时不伪造 3D，以 2D 承接 |
| 产物（异位）/抑制位点 | gk-1-f3 G6P 在抑制位点 | role=allosteric（核验表新增帧角色）+ cornerNote"1CZA 实测分布" | 已确认：G6P 在抑制位点作主图，默认接受 |
| 结晶添加剂/替身配体滤除 | 2CXS GOL、1QHF SO4、2PSN PO4、1V4S MRK、3BJF OXL、3UCD PO4 | manifest caveat 逐条注明"已滤除/已按替身配体滤除" | 已确认（配体显式归类 keep/filter，未归类报错的规则由资产脚本强制） |
| 同工酶差异 | gk-3 PFKL/PFKM、gk-9 ENO2/ENO1、gk-10 PKL/PKM2、gk-1 HK1/GCK | manifest caveat；肝 GCK、肌 PKM2 以独立变体资产（gk-1-liver / gk-10-muscle）出条目 | 已确认：第 10 步双条目、肝 GCK 单出 |

---

## 五、未完成清单（按优先级）

| 优先级 | 事项 | 为什么没做 | 下一步大概怎么做 |
|---|---|---|---|
| P0 | gk-4 物种口径修正 | 帧带称 4ALD 为兔源，manifest/meta 均为人源（本次验收发现，见"数据不一致"#1） | 核对 RCSB 4ALD 物种字段，改 structureFrames.ts gk-4-f1/f3 注记与三档规则判定，重跑 smoke-frames |
| P0 | TCA 单步页 | StepViewPage 硬编码 glycolysis，TCA 靠右栏详情 + 上下步回绕替代 | StepViewPage 改 pathwayId 驱动（糖酵解分发逻辑已有先例） |
| P0 | TCA 静态 SVG | build-pathway-svg.mjs 仅读 glycolysis.json | 脚本参数化 skeleton-tca.json（椭圆环几何与直链不同，需适配弧段绘制） |
| P1 | TCA 3D 结合视图 | PDB 候选未核验、PDH/α-KGDH 复合体尺寸超约束 | 逐条核验 1CTS/7ACN/1ZOY，复合体步只出核心亚基或维持占位 |
| P1 | 糖异生 / PPP / β-氧化页面 | **已完成**：三页渲染器均已接入（`GluconeogenesisOverviewPage` / `PppOverviewPage` / `FaoOverviewPage`），各自 smoke 通过；FAO 的 LinkType/StepKind 私有扩展已在渲染层适配，同实体多节点（acylcoa 跨 3 泳道）已支持 | — |
| P1 | 糖异生 11 步 ΔG 全 null | 未核实不编数（纪律：standard/physiological 均空） | 从 Lehninger 8e 或文献补 standard 值；physiological 无来源就保持 null + note |
| P2 | gk-9 / gk-10 结构帧 | 用户明确停下（帧带保留"第 9 步帧待接入"断口） | 接入时同步改 smoke-frames 中"无帧灰字"断言目标（现为 gk-9） |
| P2 | NMA / 关键帧动画 | gk-1 ANM 试算增益不足（0.2 Å），方案降级为声明帧 | 换明星步骤重试（GAPDH / PFK-1 二选一），或改用 morph 两态插值 |
| P2 | 预渲染视频兜底 | 仅明星步骤需要，尚未开工 | H.264 baseline ≤8 MB，按需加载，先做 gk-1/gk-6 |
| P3 | apo 跨结构口袋映射 | apo 视图未做口袋对齐 | 需要跨结构口袋残基映射表，人工核对 |
| P3 | 配体键级 | 全部按单键渲染 | SDF 键级解析 + 渲染双键 |
| P3 | 氢键判据 | 距离启发式、无方向性（角度判据缺失） | 加 donor-H-acceptor 角度阈值 |
| P3 | 移动端 | 用户决定只做桌面端（1440 基准） | 挂图为横向重布局，需专门适配轮 |
| P4 | 档案 §10 三条建议 | 排序靠后未做 | gk-2 酶名、gk-2 significance 去歧义、gk-7 significance 补 2 ATP 来源 |
| P4 | FAO 未核实标注清账 | HADH/SCHAD 缺乏表型、ACSL 缺陷、LCHAD-HELLP 细节、硫解酶缺乏 OMIM、心肌脂肪酸供能占比 | 逐条查文献后移出"未核实"标注 |

---

## 附：提取过程中发现的数据不一致

1. **gk-4 物种口径自相矛盾（最严重）**：structureFrames.ts gk-4-f1 caption 与 gapStatement 称"holo 均为兔源（4ALD）""人 apo 与兔 holo 跨物种不可并置"，且同文件 355 行注释写"5KY6（人）apo 与兔 holo 跨物种"；但 gly-04/meta.json 的 4ALD 标题为 "HUMAN MUSCLE FRUCTOSE 1,6-BISPHOSPHATE ALDOLASE…"，manifest gk-4 species 为 "Homo sapiens"。同文件 gk-4-f3 又称 1ADO（兔）"与 4ALD 同酶同物种"，与 f1 的说法互相打架。需人工核 RCSB 定哪个是真值。
2. **gk-4 帧带与 manifest 模式矛盾**：manifest gk-4 为 two-state 且含 "apo": "apo.pdb"（资产层已配对 5KY6 apo），帧带却把同一 apo 降级为 assetUrl=null 声明帧——同一信息在两层给了相反的可用性结论。
3. **gk-7 manifest caveats 为空数组**：十步中唯一无 caveat 的步骤，但该步恰恰用了过渡态类似物 2WZB——口径只存在于帧级注记，验收时容易被追问"类似物为什么不标在资产上"。
4. **PDB ID 不在 manifest**：manifest.json 只有 assetDir，PDB ID 藏在各 gly-XX/meta.json 的 pdbId 字段；按 stepId 直接查 manifest 查不到结构来源，接页面或写工具时容易踩。
5. **帧文件与帧定义对账一致（无问题）**：8 个帧资产目录的 frame-*.json 文件集合与 structureFrames.ts 的 assetUrl 完全对应（声明帧无文件、2D 帧指向 /assets/structures/2d/），未发现幽灵帧或缺文件。
6. **gk-1-f1 性质口径**：该帧有资产、可渲染（空口袋），但内含 gapStatement 缺口声明——统计"声明帧"时按 assetUrl=null 口径计 5 帧；若按"含缺口声明"口径则为 6 帧。本文档统一用前一口径。

## 关键数字汇总

- 数据层主步骤：44（糖酵解 10 + TCA 9 + 糖异生 11 + PPP 8 + β-氧化 6），另有 TCA 回补 4、糖异生支路 2
- 3D 资产：12（10 步 + 2 变体），单资产 gzip 最大 369.4 KB（gly-02），全部 ≪ 5 MB 红线
- 结构帧：31（3D 22 / 2D 结构式 4 / 文字声明 5），另有 demo-2d 1 帧不入正式序列；帧覆盖 gk-1…gk-8，gk-9/10 为断口
- 结构缺口：22 条（上表 #1–#22）
- 校验/冒烟脚本：validate ×3（糖异生/PPP/FAO）+ smoke ×3（embed 89 项 / frames 61 项 / tca 39 项）
- 静态 SVG：仅糖酵解（肝/肌/红细胞 3 张）；TCA 无、其余三通路无
- 上线页面：4 个（PathwayOverviewPage、StepViewPage、TcaOverviewPage、StructureFramesPage）
