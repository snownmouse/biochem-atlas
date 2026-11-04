# research/ 目录索引与状态表

本目录是"深化反应"的资料底稿，全部为内容工作，不触及 src/ scripts/ public/ design/。档案与 `src/data/glycolysis.json` 逐字段对照，结论写在每份档案第 10 节。

## 文件清单与状态

| 文件 | 内容 | 状态 | 未核实项 |
|---|---|---|---|
| glycolysis/gk-01.md | 己糖激酶/葡萄糖激酶 | 完成 | HK1 催化残基精确编号；GCK 协同机制争议 |
| glycolysis/gk-02.md | 磷酸葡萄糖异构酶 | 完成 | 1JIQ 配体状态；GSD-XV 归类命名 |
| glycolysis/gk-03.md | 磷酸果糖激酶-1 | 完成 | 哺乳动物 PFK 第二金属；PFKM apo 数据质量 |
| glycolysis/gk-04.md | 醛缩酶 | 完成 | 席夫碱 Lys 精确编号；ALDOA UniProt 编号 |
| glycolysis/gk-05.md | 磷酸丙糖异构酶 | 完成 | 2JK2 配体状态 |
| glycolysis/gk-06.md | GAPDH | 完成 | 8G17 配体状态；半硫缩醛结构捕获 |
| glycolysis/gk-07.md | 磷酸甘油酸激酶 | 完成 | 8YHP 配体状态 |
| glycolysis/gk-08.md | 磷酸甘油酸变位酶 | 完成 | 磷酰-His11 中间体结构；4GPZ 配体状态 |
| glycolysis/gk-09.md | 烯醇化酶 | 完成 | 氟化物机制文献卷期 |
| glycolysis/gk-10.md | 丙酮酸激酶 | 完成 | 人源 K⁺ vs 第二 Mg²⁺；T/R 双态结构对；1ZJH 状态 |
| tca/outline.md | TCA 8 步 + PDH + 回补 | 骨架完成 | 全部 PDB 条目未重核；乌头酸酶 ΔG°′ 教材差异大 |
| oxphos/outline.md | 复合体 I–V + 化学渗透 + P/O | 骨架完成 | 复合体 I 亚基数按"约 45"处理；P/O 争议已单列 |
| cori/outline.md | 器官分工 + 乳酸穿梭 + 能量账 | 骨架完成 | 红细胞乳酸贡献比例；肾糖异生占比；MCT1-basigin 条目 |
| gluconeogenesis/outline.md | 11 步 + 四绕道 + 糖酵解逐步对照表 | 底稿完成、未上代码 | PEPCK 真底物态人源缺；FBPase 人源 apo 缺；G6PC 建议不上 3D；二价阳离子口径 |
| ppp/outline.md | 氧化相 3 步 + 非氧化相 2+2 步 + G6P 分流 | 底稿完成、未上代码 | 人 6PGL/RPIA 无结构（双缺口）；G6PD 人源 apo 缺；红系 G6P 分流比例口径 |
| fatty-acid-oxidation/outline.md | 活化 + 肉碱穿梭 + 四步循环 + 106 ATP 账 | 底稿完成、未上代码 | 人 CPT1 无结构；3EQ6 为中链 ACS 同工酶；β4 硫解 ΔG°′ 未单列不编数 |

## glycolysis.json 需要修改的地方（汇总，详见各档案第 10 节）
1. **gk-06 步骤名**"氧化磷酸化（Pi 参与）"与线粒体 oxidative phosphorylation 撞名，建议改"氧化并磷酸化（酰基磷酸生成）"。
2. **gk-06 organDiffs.rbc**"NADH 全部用于胞内还原反应"过强——主去向是 LDH 再生 NAD⁺，metHb 还原只占小部分。
3. **gk-10 isozyme**"肌 PK-M"应精确为"肌 PK-M1"（organDiffs 说的"对别构调控不敏感"正是 M1 的性质）。
4. **gk-03 organDiffs 缺 rbc 条目**（PFKL/PFKM 杂合四聚体；Tarui 病伴溶血）。
5. **gk-04 organDiffs 为空**（肝 ALDOB vs 肌 ALDOA、遗传性果糖不耐受是重要差异点）。
6. **gk-07 cofactors 缺 Mg²⁺**（其他激酶步都记了，不一致）。
7. **gk-08 cofactors**"2,3-BPG（催化中间体）"建议改"2,3-BPG（催化引物，磷酰化活性 His）"。
8. **gk-01 isozyme**"肝外组织：HK I–III"过笼统（肌 HK1/HK2、红细胞 HK1）。
9. 数据模型层（types.ts）：Step 无 EC 编号、ΔG、立体化学字段——本档案的化学数据并入数据层前需先扩字段。

## 未核实项汇总（正文已避免冒充事实，统一单列）
- 所有二手 PDB 条目状态（1JIQ/2JK2/8G17/8YHP/4GPZ/2PSN/1ZJH/5KY6）与 tca/oxphos/cori 的候选条目：**进 3D 前必须按糖酵解同款流程经 RCSB API 重核**。
- **例外**：gluconeogenesis/ppp/fatty-acid-oxidation 三份新底稿的 PDB 条目已于 2026-11-03 经 RCSB API（GraphQL + search + chemcomp 字典）实时核验，分辨率/物种/配体/原子数为当日数据；仅隔数月再上代码建议复核。
- ΔG°′ 全部取自 Lehninger Table 15-1（红细胞）；跨教材加和与 Stryer 净值 −85.4 kJ/mol 存在教材间差异，未裁断。
- 酶学细节：醛缩酶席夫碱 Lys 精确编号、人 PK 的 K⁺ 角色、PFK 哺乳动物第二金属。

## 需要用户拍板
1. gk-06 步骤名是否采纳改名（会影响通路图节点 label 与 skeleton 校验）。
2. glycolysis.json 的 9 条修改是否全部采纳（第 4/5 条会新增 organDiffs 条目，改变器官差异页内容量）。
3. types.ts 是否扩 EC/ΔG 字段（属于代码改动，本会话不动 src/，仅立项）。
4. Cori 循环是否单独立通路档案（现在的 outline 把葡萄糖-丙氨酸循环并入 cori/outline.md 一段）。

## 验收重点建议（最多 5 条）
1. gk-06 两条修改（步骤名 + 红细胞 NADH 去向）——直接影响通路页文案正确性。
2. gk-04 热力学叙事（+23.8 标准态吸能靠第 5/6 步拉动）——全档案最反直觉、教学价值最高的点。
3. gk-08 的"2,3-BPG 是催化引物"精确化——与红细胞支路共用实体，牵动数据层。
4. oxphos P/O 现代值（2.5/1.5）与老值（3/2）的并存写法——考题与科学性冲突的处理样本。
5. tca/oxphos/cori 的"3D 适配性"判断——直接决定下一轮资产管线的范围。

## 数字与来源约定
- ΔG°′ / 生理 ΔG：Lehninger Principles of Biochemistry 8th ed.（红细胞数据）；教材间差异不裁断处标"未核实"。
- EC 编号：IUBMB Enzyme List；蛋白条目：UniProt；疾病：OMIM（引用处已注明）。
- 术语首次出现括注英文；缩写 G3P 在本平台 = 甘油醛-3-磷酸（数据层已知混淆点，见 gk-05）。
