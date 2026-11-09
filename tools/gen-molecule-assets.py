# ============================================================
# gen-molecule-assets.py —— 分子级 2D / 3D 资产离线生成（RDKit）
#
# 口径：
#   · 2D：SMILES → RDKit 2D 坐标 → 项目既有 2D JSON schema（frameId/kind/view/atoms/bonds/wedge/annotations）
#          + 与 Frame2D 渲染器同参数的 SVG（纸白底、1.6 键线、8.5 杂原子圈、12px 粗体元素、9.5px 标签）
#   · 3D：优先实验坐标（public/assets/steps/*/ligand*.sdf，来自 RCSB 配体实例）；
#          无实验坐标时才用 ETKDG v3（≥20 起点）+ MMFF94 优化取最低能量构象
#   · 每个分子另算范德华体积（0.4 Å 体素计数，含氢）与惯性主轴长度，供“形状变多少”量化
#   · 所有分子做 SMILES 往返 / 分子式 / 坐标有限 / 键数 断言，失败即非零退出
#
# 用法：python tools/gen-molecule-assets.py
# 说明：RDKit 无法读取含中文的路径，SDF 先复制到 %TEMP% 的 ASCII 目录再解析。
# ============================================================
import argparse
import json
import math
import os
import re
import shutil
import statistics
import sys
import tempfile

import numpy as np
from rdkit import Chem
from rdkit.Chem import AllChem, Descriptors, rdDetermineBonds, rdMolDescriptors

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT2D = os.path.join(ROOT, "public", "assets", "structures", "2d")
OUT3D = os.path.join(ROOT, "public", "assets", "ligands3d")
REPORT = os.path.join(ROOT, "preview", "molecule-assets-report.json")
WORK = os.path.join(tempfile.gettempdir(), "molassets")

# 全站唯一原子配色表：与 src/data/atomColors.ts 共用同一份 JSON。
# 2D 杂原子标签必须与 3D 原子色一致；碳不上色，键与顶点仍用墨色。
PALETTE_PATH = os.path.join(ROOT, "src", "data", "atom-colors.json")
with open(PALETTE_PATH, encoding="utf-8") as _fh:
    ATOM_PALETTE = json.load(_fh)
ATOM_COLORS = ATOM_PALETTE["elements"]
ATOM_FALLBACK = ATOM_PALETTE["fallback"]
os.makedirs(WORK, exist_ok=True)
os.makedirs(OUT2D, exist_ok=True)
os.makedirs(OUT3D, exist_ok=True)
os.makedirs(os.path.dirname(REPORT), exist_ok=True)

V = 860
H = 540
BOND_2D = 100  # 与既有 2D 资产同量级（现有键长约 110 px）

VDW = {"H": 1.20, "C": 1.70, "N": 1.55, "O": 1.52, "P": 1.80, "S": 1.80}

# ---------- 分子表 ----------
# smiles：用于 2D 与非手性 3D；stereo：计算构象需要手性时使用
# src：实验坐标来源（相对项目根）；无则用计算构象
MOLS = [
    dict(id="glc", name="α-D-葡萄糖（GLC）", formula="C6H12O6",
         smiles="O[CH2:6][C@H:5]1O[C@H:1](O)[C@@H:2](O)[C@H:3](O)[C@H:4]1O",
         src="public/assets/steps/gly-01/ligand-GLC.sdf", sdf="glc.sdf",
         pdb="1CZA", species="Homo sapiens", method="X-RAY DIFFRACTION", res=1.9,
         form="α-D-吡喃葡萄糖（1CZA 配体 GLC）",
         caveat="晶体配体为 α-D-吡喃型；2D 平面图为去立体标注的示意，立体化学以 3D 实验坐标为准。"),
    dict(id="g6p", name="6-磷酸葡萄糖（G6P）", formula="C6H11O9P",
         smiles="[O-][P]([O-])(=O)O[CH2:6][C@H:5]1O[C@H:1](O)[C@@H:2](O)[C@H:3](O)[C@H:4]1O",
         src="public/assets/steps/gly-01/ligand-G6P.sdf", sdf="g6p.sdf",
         pdb="1CZA", species="Homo sapiens", method="X-RAY DIFFRACTION", res=1.9,
         form="6-O-膦酰吡喃葡萄糖（磷酸二价阴离子，与数据层分子式一致）",
         caveat="与 GLC 同存于 1CZA 同一晶体：磷酸基加在 C6 上，糖环未变。"),
    dict(id="f6p", name="6-磷酸果糖（F6P）", formula="C6H11O9P",
         smiles="O[CH2:1][C:2]1(O)O[C@H:5](CO[P]([O-])(=O)[O-])[C@H:4](O)[C@@H:3]1O",
         src="public/assets/steps/gly-02/ligand.sdf", sdf="f6p.sdf",
         pdb="2CXS", species="Mus musculus", method="X-RAY DIFFRACTION", res=1.5,
         form="β-D-呋喃果糖-6-磷酸（五元环）",
         caveat="晶体配体来自小鼠 GPI（2CXS）；呋喃环型是溶液与晶体中的主要形式，醛糖↔酮糖环型差异由 3D 形状直接呈现。"),
    dict(id="fbp", name="果糖-1,6-二磷酸（F1,6BP，呋喃型）", formula="C6H10O12P2",
         smiles="[O-][P]([O-])(=O)O[CH2:1][C:2]1(O)O[C@H:5](CO[P]([O-])(=O)[O-])[C@H:4](O)[C@@H:3]1O",
         src="public/assets/steps/gly-03/ligand-FBP.sdf", sdf="fbp.sdf",
         pdb="8W2G", species="Homo sapiens", method="ELECTRON MICROSCOPY", res=3.0,
         form="β-D-呋喃果糖-1,6-二磷酸（四价阴离子）",
         caveat="8W2G 为人 PFKL cryo-EM（3.0 Å），配体为呋喃环型；与 4ALD 中结合态线形构象不同，见 fbp-linear。"),
    dict(id="fbp-linear", name="果糖-1,6-二磷酸（线形，4ALD 结合态）", formula="C6H10O12P2",
         smiles="[O-][P]([O-])(=O)O[CH2:1][C:2](=O)[C@@H:3](O)[C@H:4](O)[C@@H:5](O)[CH2:6]O[P]([O-])(=O)[O-]",
         src="public/assets/steps/gly-04/ligand.sdf", sdf="fbp_4ald.sdf",
         pdb="4ALD", species="Homo sapiens", method="X-RAY DIFFRACTION", res=2.8,
         form="线形果糖-1,6-二磷酸（醛缩酶结合态，PDB 配体代码 2FP）",
         caveat="4ALD 结合的是线形构象（2FP），不是自由态呋喃环；与 fbp（8W2G 呋喃型）是两个实验构象，不混标。"
                "注：该配体 SDF 的键表漏了 C4–O5，且 C2–O 实测 1.68 Å 明显偏长；连接关系按坐标重建，键级沿用模板（C2=O），如实保留实验几何。"),
    dict(id="dhap", name="磷酸二羟丙酮（DHAP）", formula="C3H5O6P",
         smiles="O[CH2:1][C:2](=O)[CH2:3]O[P](=O)([O-])[O-]",
         src="public/assets/steps/gly-05/ligand.sdf", sdf="dhap.sdf",
         pdb="1NEY", species="Saccharomyces cerevisiae", method="X-RAY DIFFRACTION", res=1.2,
         form="磷酸二羟丙酮（酮糖三碳，1NEY 配体 13P）",
         caveat="实验坐标来自酿酒酵母 TPI（1NEY，1.2 Å）；C3 为 CH₂OH，无手性中心。"),
    dict(id="gap", name="甘油醛-3-磷酸（GAP）", formula="C3H5O6P",
         smiles="O=[CH:1][C@@H:2](O)[CH2:3]O[P](=O)([O-])[O-]",
         src=None, sdf=None,
         pdb=None, species=None, method=None, res=None,
         form="D-甘油醛-3-磷酸（C2 为 R 构型）",
         caveat="十步中唯一没有任何实验配体坐标的三碳醛（GAPDH 结构 1U8F 仅结合 NAD），只能用计算构象；自由态构象与结合态未必一致。"),
    dict(id="bpg13", name="1,3-二磷酸甘油酸（1,3-BPG）", formula="C3H4O10P2",
         smiles="O=[C:1](O[P](=O)([O-])[O-])[C@@H:2](O)[CH2:3]O[P](=O)([O-])[O-]",
         src=None, sdf=None,
         pdb=None, species=None, method=None, res=None,
         form="1,3-二磷酸甘油酸（C1 为酰基磷酸，C3 为磷酸酯）",
         caveat="无实验配体坐标（1,3-BPG 极不稳定，PDB 无结合态），只能用计算构象；高能酰基磷酸的展示形式按 C1–O–P 单键 + P=O 绘制。"),
    dict(id="3pg", name="3-磷酸甘油酸（3PG）", formula="C3H4O7P",
         smiles="[O-][C:1](=O)[C@@H:2](O)[CH2:3]O[P](=O)([O-])[O-]",
         src="public/assets/steps/gly-07/ligand-3PG.sdf", sdf="3pg.sdf",
         pdb="9FDN", species="Homo sapiens", method="X-RAY DIFFRACTION", res=1.58,
         form="D-3-磷酸甘油酸（C3 磷酸酯）",
         caveat="实验坐标为 9FDN 人 PGK 结合态；磷酸在 C3，羧基端为 C1。"),
    dict(id="2pg", name="2-磷酸甘油酸（2PG）", formula="C3H4O7P",
         smiles="[O-][C:1](=O)[C@H:2](O[P](=O)([O-])[O-])[CH2:3]O",
         src="public/assets/steps/gly-09/ligand-2PG.sdf", sdf="2pg.sdf",
         pdb="3UCD", species="Homo sapiens", method="X-RAY DIFFRACTION", res=1.41,
         form="D-2-磷酸甘油酸（C2 磷酸酯）",
         caveat="实验坐标来自 3UCD 人 ENO2（1.41 Å）结合态。"),
    dict(id="pep", name="磷酸烯醇式丙酮酸（PEP）", formula="C3H2O6P",
         smiles="[O-][C:1](=O)[C:2](O[P](=O)([O-])[O-])=[CH2:3]",
         src="public/assets/steps/gly-09/ligand-PEP.sdf", sdf="pep.sdf",
         pdb="3UCD", species="Homo sapiens", method="X-RAY DIFFRACTION", res=1.41,
         form="磷酸烯醇式丙酮酸（C2=C3 烯醇磷酸）",
         caveat="实验坐标来自 3UCD（1.41 Å）；与 2PG 同晶体，烯醇双键为平面构型。"),
    dict(id="pyr", name="丙酮酸", formula="C3H3O3",
         smiles="[O-][C:1](=O)[C:2](=O)[CH3:3]",
         src=None, sdf=None,
         pdb=None, species=None, method=None, res=None,
         form="丙酮酸（C1 羧酸根、C2 酮羰基、C3 甲基）",
         caveat="6NN4 不含丙酮酸坐标（PK 产物未建模），只能用计算构象；平面分子，构象自由度很低。"),
]

# ---------- TCA：九个有机酸（实体名以 src/data/tca.json 为准） ----------
# 实验坐标来源：tools/fetch-tca-ligands.py 从 RCSB 逐个下载真实配体络合物，抽 HETATM 目标残基
# （仅原子 + 坐标，不写键表），存到 public/assets/steps/tca-lig/。本轮口径是“TCA 本酶优先、能换就换”：
# 同分子 + ≤2.5 Å + X-ray/cryo-EM 命中即替换（人源优先；非人源、突变体、相邻酶在页面首屏逐条标注），
# 本酶口袋内未命中的保留原坐标并写明来源蛋白；九个分子仍全部为实验坐标，provenance.kind=experimental。
# 每项记录 PDB ID / 分辨率 / 方法 / 物种 / 链 / 配体 resname / 蛋白（实验坐标不理想之处见报告）。
# 乙酰-CoA / 琥珀酰-CoA 是大分子：仍按分块呈现只画反应端 + 硫酯 S，S 右侧接一个碳作为
# CoA 链的折线起点并标「CoA 略」；实验坐标只取反应端的实测几何，CoA 链省略（fragment 写明）。
TCA_MOLS = [
    dict(id="accoa", name="乙酰-CoA（分块：乙酰基 + 硫酯 S）", formula="C3H6OS",
         smiles="O=[C:1]([CH3:2])[S][CH3:5]",
         src="public/assets/steps/tca-lig/8ZW1-ACO-B.sdf", sdf="accoa_8zw1.sdf",
         pdb="8ZW1", species="Homo sapiens", method="X-RAY DIFFRACTION", res=2.1,
         chain="B", resname="ACO", protein="人柠檬酸合酶（CS，TCA 第 1 步）· OAA + 完整乙酰-CoA 三元反应中间态",
         form="乙酰-CoA 反应端（分块）：乙酰基 C1/C2 + 硫酯 S + CoA 折线起点",
         caveat="分块呈现，不是完整分子：只画反应端（乙酰基 + 硫酯 S）。实验坐标取自 8ZW1 的完整乙酰-CoA（配体 ACO，链 B，2.10 Å，人 CS 与 OAA/柠檬酸共结晶的三元反应中间态，CoA 完整，51 重原子）：只保留乙酰基 + 硫酯 S 的实测几何，CoA 长链省略；S 右侧的碳仅作 CoA 链的折线起点并标「CoA 略」，不代表完整 CoA。完整乙酰-CoA 为 C23H36N7O17P3S（泛酸/腺苷部分不入画）。",
         fragment=dict(kind="block", shown="乙酰基 C1/C2 + 硫酯 S", omitted="CoA 长链（泛酸、腺苷、3′-磷酸）",
                       note="分块资产：只画反应端，不是完整乙酰-CoA（C23H36N7O17P3S）；S 右侧碳为 CoA 折线起点，标「CoA 略」；反应端坐标为 8ZW1 实测。"),
         coa_label_atom=5, label_atoms={5: "CoA 略"}),
    dict(id="oaa", name="草酰乙酸（OAA）", formula="C4H2O5",
         smiles="[O-][C:1](=O)[CH2:2][C:3](=O)[C:4](=O)[O-]",
         src="public/assets/steps/tca-lig/8ZVW-OAA-A.sdf", sdf="oaa_8zvw.sdf",
         pdb="8ZVW", species="Homo sapiens", method="X-RAY DIFFRACTION", res=1.82,
         chain="A", resname="OAA", protein="人柠檬酸合酶（CS）· 草酰乙酸 + CoA",
         form="草酰乙酸（C1/C4 羧基、C2 亚甲基、C3 酮基）",
         caveat="实验坐标来自 8ZVW（人柠檬酸合酶，链 A，配体 OAA，1.82 Å）；OAA 在溶液中以烯醇式平衡存在，资产按实测的酮式呈现。",
         ),
    dict(id="cit", name="柠檬酸", formula="C6H5O7",
         smiles="[O-][C:1](=O)[CH2:2][C:3](O)([C:6](=O)[O-])[CH2:4][C:5](=O)[O-]",
         src="public/assets/steps/tca-lig/8ZVV-CIT-A.sdf", sdf="cit_8zvv.sdf",
         pdb="8ZVV", species="Homo sapiens", method="X-RAY DIFFRACTION", res=1.59,
         chain="A", resname="CIT", protein="人柠檬酸合酶（CS，TCA 第 1 步）· 柠檬酸产物结合态",
         form="柠檬酸（C3 中央碳带 OH 与 C6 羧基，C1/C5 为两臂羧基）",
         caveat="实验坐标来自 8ZVV（人柠檬酸合酶 CS，链 A，配体 CIT，1.59 Å）：本轮从非本酶的 ACLY 3MWD 换到本步酶口袋，柠檬酸为产物结合态。",
         ),
    dict(id="icit", name="异柠檬酸", formula="C6H5O7",
         smiles="[O-][C:1](=O)[C@H:2](O)[C@@H:3]([C:6](=O)[O-])[CH2:4][C:5](=O)[O-]",
         src="public/assets/steps/tca-lig/5H3E-ICT-A.sdf", sdf="icit_5h3e.sdf",
         pdb="5H3E", species="Mus musculus", method="X-RAY DIFFRACTION", res=2.21,
         chain="A", resname="ICT", protein="小鼠线粒体异柠檬酸脱氢酶 IDH2 K256Q（TCA 第 3 步）· 异柠檬酸",
         form="异柠檬酸（C2 带 OH、C3 带 C6 羧基；C2/C3 为手性中心）",
         caveat="实验坐标来自 5H3E（小鼠线粒体 IDH2 K256Q，链 A，配体 ICT，2.21 Å）：本轮从非本酶的胞质 IDH1 6PAY 换到线粒体 IDH2；人源线粒体 IDH2/IDH3 的 ICT 络合物 ≤2.5 Å 未获。生理底物为 (2R,3S)-异柠檬酸，模板按该构型建模（CIP 校验见报告）。",
         expect_cip="C2:R,C3:S"),
    dict(id="akg", name="α-酮戊二酸（α-KG）", formula="C5H4O5",
         smiles="[O-][C:1](=O)[CH2:2][CH2:3][C:4](=O)[C:5](=O)[O-]",
         src="public/assets/steps/tca-lig/5I95-AKG-A.sdf", sdf="akg_5i95.sdf",
         pdb="5I95", species="Homo sapiens", method="X-RAY DIFFRACTION", res=1.54,
         chain="A", resname="AKG", protein="人线粒体异柠檬酸脱氢酶 IDH2 R140Q（TCA 第 3 步）· NADPH + α-酮戊二酸",
         form="α-酮戊二酸（C4 酮基、C1/C5 羧基）",
         caveat="实验坐标来自 5I95（人 IDH2 R140Q，链 A，配体 AKG，1.54 Å）；α-酮酸在溶液中部分水合，资产按实测酮式呈现。",
         ),
    dict(id="succoa", name="琥珀酰-CoA（分块：琥珀酰基 + 硫酯 S）", formula="C5H7O3S",
         smiles="O=[C:1]([CH2:2][CH2:3][C:4](=O)[O-])[S][CH3:5]",
         src="public/assets/steps/tca-lig/8P5V-SCA-A.sdf", sdf="succoa_8p5v.sdf",
         pdb="8P5V", species="Corynebacterium glutamicum", method="ELECTRON MICROSCOPY", res=2.07,
         chain="A", resname="SCA", protein="谷氨酸棒杆菌 2-酮戊二酸脱氢酶 E1/E2 复合体（TCA 第 4 步）· 琥珀酰-CoA 产物结合态",
         form="琥珀酰-CoA 反应端（分块）：琥珀酰基 C1–C4 + 硫酯 S + CoA 折线起点",
         caveat="分块呈现，不是完整分子：只画反应端（琥珀酰基 + 硫酯 S）。实验坐标取自 8P5V 的完整琥珀酰-CoA（配体 SCA，链 A，2.07 Å，cryo-EM，谷氨酸棒杆菌 OGDH E1/E2 产物结合态）：只保留琥珀酰基 + 硫酯 S 的实测几何，CoA 长链省略；S 右侧的碳仅作 CoA 链的折线起点并标「CoA 略」。人源 SUCL/OGDH 的 SCA 络合物 ≤2.5 Å 未获；本轮从非 TCA 的 GCN5 5TRL 换到 TCA 的 OGDH 8P5V。完整琥珀酰-CoA 为 C25H38N7O19P3S。",
         fragment=dict(kind="block", shown="琥珀酰基 C1–C4 + 硫酯 S", omitted="CoA 长链（泛酸、腺苷、3′-磷酸）",
                       note="分块资产：只画反应端，不是完整琥珀酰-CoA（C25H38N7O19P3S）；S 右侧碳为 CoA 折线起点，标「CoA 略」；反应端坐标为 8P5V 实测（谷氨酸棒杆菌 OGDH，TCA 第 4 步）。"),
         coa_label_atom=5, label_atoms={5: "CoA 略"}),
    dict(id="suc", name="琥珀酸", formula="C4H4O4",
         smiles="[O-][C:1](=O)[CH2:2][CH2:3][C:4](=O)[O-]",
         src="public/assets/steps/tca-lig/7MSS-SIN-B.sdf", sdf="suc_7mss.sdf",
         pdb="7MSS", species="Homo sapiens", method="X-RAY DIFFRACTION", res=1.75,
         chain="B", resname="SIN", protein="人琥珀酰-CoA 合成酶（SUCLA2/SUCLG2）· 琥珀酸 + CoA + Mg",
         form="琥珀酸（C1/C4 羧基、C2/C3 亚甲基）",
         caveat="实验坐标来自 7MSS（人 SUCL，链 B，配体 SIN，1.75 Å）；平面骨架，构象自由度低，实测几何与自由态接近。",
         ),
    dict(id="fum", name="延胡索酸（反式）", formula="C4H2O4",
         smiles="[O-][C:1](=O)/[CH:2]=[CH:3]/[C:4](=O)[O-]",
         src="public/assets/steps/tca-lig/9BPW-FUM-A.sdf", sdf="fum_9bpw.sdf",
         pdb="9BPW", species="Staphylococcus aureus", method="X-RAY DIFFRACTION", res=2.0,
         chain="A", resname="FUM", protein="金黄色葡萄球菌 II 型延胡索酸酶 FumC（TCA 第 7 步）· 延胡索酸",
         form="延胡索酸（反式丁烯二酸，C2=C3）",
         caveat="实验坐标来自 9BPW（金黄色葡萄球菌 FumC，链 A，配体 FUM，2.00 Å）：本轮从非本酶的变构位点 ME2 1PJ3 换到本步酶 FH 活性位点；人源 FH 的 FUM 络合物 ≤2.5 Å 未获，故为微生物同酶。反式双键为平面，构象几乎刚性。",
         ),
    dict(id="mal", name="L-苹果酸", formula="C4H4O5",
         smiles="[O-][C:1](=O)[C@@H:2](O)[CH2:3][C:4](=O)[O-]",
         src="public/assets/steps/tca-lig/2DFD-LMR-A.sdf", sdf="mal_2dfd.sdf",
         pdb="2DFD", species="Homo sapiens", method="X-RAY DIFFRACTION", res=1.9,
         chain="A", resname="LMR", protein="人线粒体苹果酸脱氢酶 MDH2 · L-苹果酸",
         form="L-苹果酸（C2 带 OH 的 (S)-构型）",
         caveat="实验坐标来自 2DFD（人 MDH2，链 A，配体 LMR，1.90 Å）；LMR 即 (2S)-L-苹果酸（不是 D 型的 MLT）；模板按 (S)-构型建模（CIP 校验见报告）。",
         expect_cip="C2:S"),
]

TWO_D_IDS = {"glc", "g6p", "f6p", "fbp", "fbp-linear", "dhap", "3pg", "2pg", "pep"}
TCA_TWO_D_IDS = {m["id"] for m in TCA_MOLS}
# 这三个分子的 2D 是**既有手绘资产**（tools/gen-2d-frames.mjs 维护，结构帧页/单步页仍直接引用），
# 不覆盖 JSON，只按其内容补一份同名 SVG，保证"每个分子都有 JSON + SVG"。
LEGACY_2D = {"gap": "gap.json", "bpg13": "bpg13.json", "pyr": "pyruvate.json"}

# ---------- PPP / 糖异生分子表（本轮新增） ----------
# 口径与 TCA 一致：实验坐标优先（本步酶口袋 → 人源非本酶口袋 → 其它来源），
# 取不到才用 RDKit ETKDGv3(30 起点) + MMFF94。CO₂ / HCO₃⁻ 原子数过少，
# 球棍无形状信息量，只做 2D，3D 不建并在数据里写明原因（no3d）。
PPP_MOLS = [
    # 本步酶 = 人 G6PD；人源 + 本酶口袋，比糖酵解沿用的 1CZA（人己糖激酶）更贴合 PPP 第 1 步。
    dict(id="g6p-g6pd", name="6-磷酸葡萄糖（G6P，G6PD 结合态）", formula="C6H11O9P",
         smiles="O=[P]([O-])([O-])O[CH2:6][C@H:5]1O[C@@H:1](O)[C@H:2](O)[C@@H:3](O)[C@@H:4]1O",
         src="public/assets/steps/ppp-gn-lig/7SNI-BG6-A.sdf", sdf="g6p_7sni.sdf",
         pdb="7SNI", species="Homo sapiens", method="ELECTRON MICROSCOPY", res=2.5,
         chain="A", resname="BG6", protein="人葡糖-6-磷酸脱氢酶 G6PD（PPP 氧化支路第 1 步）· 底物结合态",
         form="β-D-葡萄糖-6-磷酸（BG6，环式）",
         caveat="实验坐标来自 7SNI（人 G6PD，链 A，配体 BG6，2.50 Å cryo-EM）：本步本酶且人源，本轮未沿用糖酵解的 1CZA（人己糖激酶，非 G6PD 口袋）。"),
    dict(id="6pgl", name="6-磷酸葡糖酸-1,5-内酯（6PGL）", formula="C6H9O9P",
         smiles="O=[C:1]1O[C@H:5](CO[P](=O)([O-])[O-])[C@@H:4](O)[C@H:3](O)[C@@H:2]1O",
         src=None, sdf=None,
         form="6-磷酸-D-葡萄糖酸-1,5-内酯（六元内酯环）",
         caveat="PDB 无 6-磷酸葡糖酸内酯本体络合物（6PL 为磷脂类而非内酯）；本轮为 RDKit 计算构象（自由态，不等于结合态），不拿内酯类似物冒充。"),
    dict(id="6pg", name="6-磷酸葡糖酸（6PG，6PGD 口袋）", formula="C6H10O10P",
         smiles="O=[C:1]([O-])[C@H:2](O)[C@@H:3](O)[C@H:4](O)[C@H:5](O)[CH2:6]O[P](=O)([O-])[O-]",
         src="public/assets/steps/ppp-gn-lig/2W90-6PG-A.sdf", sdf="6pg_2w90.sdf",
         pdb="2W90", species="Geobacillus stearothermophilus", method="X-RAY DIFFRACTION", res=2.2,
         chain="A", resname="6PG", protein="嗜热脂肪地芽孢杆菌 6-磷酸葡糖酸脱氢酶 6PGD（PPP 第 3 步）· 底物结合态",
         form="6-磷酸-D-葡萄糖酸（开链羧酸根，pH 7.4 简式）",
         caveat="实验坐标来自 2W90（6PGD，链 A，配体 6PG，2.20 Å）：本步酶口袋但非人源；人源 6PGD 的 6PG 络合物 ≤2.5 Å 未获。"),
    dict(id="6pg-l", name="6-磷酸葡糖酸（6PG，6PGL 口袋）", formula="C6H10O10P",
         smiles="O=[C:1]([O-])[C@H:2](O)[C@@H:3](O)[C@H:4](O)[C@H:5](O)[CH2:6]O[P](=O)([O-])[O-]",
         src="public/assets/steps/ppp-gn-lig/3E7F-6PG-A.sdf", sdf="6pg_3e7f.sdf",
         pdb="3E7F", species="Trypanosoma brucei", method="X-RAY DIFFRACTION", res=2.2,
         chain="A", resname="6PG", protein="布氏锥虫 6-磷酸葡糖酸内酯酶 6PGL（PPP 第 2 步）· 产物结合态",
         form="6-磷酸-D-葡萄糖酸（开链羧酸根，pH 7.4 简式）",
         caveat="实验坐标来自 3E7F（6PGL，链 A，配体 6PG，2.20 Å）：本步酶口袋但非人源；人源 6PGL 无 ≤2.5 Å 的 6PG 络合物。"),
    dict(id="ru5p", name="D-核酮糖-5-磷酸（Ru5P，RPE 口袋）", formula="C5H9O8P",
         smiles="O=[C:2]([CH2:1]O)[C@H:3](O)[C@H:4](O)[CH2:5]O[P](=O)([O-])[O-]",
         src="public/assets/steps/ppp-gn-lig/3OVQ-5RP-A.sdf", sdf="ru5p_3ovq.sdf",
         pdb="3OVQ", species="Homo sapiens", method="X-RAY DIFFRACTION", res=2.0,
         chain="A", resname="5RP", protein="人核酮糖-5-磷酸 3-差向异构酶 RPE（PPP 第 5 步）· 底物结合态",
         form="D-核酮糖-5-磷酸（开链酮糖）",
         caveat="实验坐标来自 3OVQ（人 RPE，链 A，配体 5RP，2.00 Å）：本步酶且人源；用于 ppp-n2。"),
    dict(id="ru5p-i", name="D-核酮糖-5-磷酸（Ru5P，RpiB 口袋）", formula="C5H9O8P",
         smiles="O=[C:2]([CH2:1]O)[C@H:3](O)[C@H:4](O)[CH2:5]O[P](=O)([O-])[O-]",
         src="public/assets/steps/ppp-gn-lig/2VVP-5RP-A.sdf", sdf="ru5p_2vpp.sdf",
         pdb="2VVP", species="Mycobacterium tuberculosis", method="X-RAY DIFFRACTION", res=1.65,
         chain="A", resname="5RP", protein="结核分枝杆菌核糖-5-磷酸异构酶 B（RpiB，PPP 第 4 步）· 底物结合态",
         form="D-核酮糖-5-磷酸（开链酮糖）",
         caveat="实验坐标来自 2VVP（结核分枝杆菌 RpiB，链 A，配体 5RP，1.65 Å）：本步异构酶口袋但非人源；人源 RPIA（RpiA 家族）未检索到结构。配体占位 0.50，原子完整。"),
    dict(id="r5p", name="D-核糖-5-磷酸（R5P，RpiB 口袋）", formula="C5H9O8P",
         smiles="O=[CH:1][C@H:2](O)[C@H:3](O)[C@H:4](O)[CH2:5]O[P](=O)([O-])[O-]",
         src="public/assets/steps/ppp-gn-lig/2VVP-R5P-A.sdf", sdf="r5p_2vpp.sdf",
         pdb="2VVP", species="Mycobacterium tuberculosis", method="X-RAY DIFFRACTION", res=1.65,
         chain="A", resname="R5P", protein="结核分枝杆菌核糖-5-磷酸异构酶 B（RpiB，PPP 第 4 步）· 产物结合态",
         form="D-核糖-5-磷酸（开链醛糖）",
         caveat="实验坐标来自 2VVP（结核分枝杆菌 RpiB，链 A，配体 R5P，1.65 Å）：本步异构酶口袋但非人源。"),
    dict(id="xu5p", name="D-木酮糖-5-磷酸（Xu5P）", formula="C5H9O8P",
         smiles="O=[C:2]([CH2:1]O)[C@@H:3](O)[C@H:4](O)[CH2:5]O[P](=O)([O-])[O-]",
         src=None, sdf=None,
         form="D-木酮糖-5-磷酸（开链酮糖，C3 与 Ru5P 相反）",
         caveat="PDB 无 Xu5P 本体络合物：4KXV 的 DX5 是木糖醇-5-磷酸（C5H13O8P，还原型类似物），不作底物替换；本轮为 RDKit 计算构象（自由态，不等于结合态）。"),
    dict(id="s7p", name="景天庚酮糖-7-磷酸（S7P）", formula="C7H13O10P",
         smiles="O=[P]([O-])([O-])O[CH2:7][C@@H:6](O)[C@H:5]1O[C@:2](O)([CH2:1]O)[C@@H:3](O)[C@@H:4]1O",
         src="public/assets/steps/ppp-gn-lig/4R75-S7P-A.sdf", sdf="s7p_4r75.sdf",
         pdb="4R75", species="Actinobacillus pleuropneumoniae", method="X-RAY DIFFRACTION", res=1.278,
         chain="A", resname="S7P", protein="胸膜肺炎放线杆菌 AfuA 周质结合蛋白（ABC 转运体底物结合蛋白，非 PPP 酶）",
         form="景天庚酮糖-7-磷酸（4R75 中的环式 altrofuranose）",
         caveat="实验坐标来自 4R75（AfuA 周质结合蛋白，链 A，配体 S7P，1.278 Å）：同分子但来源蛋白不是本步转醛醇酶；人源转醛醇酶的 S7P 络合物未获。配体为环式，非开链。"),
    dict(id="e4p", name="D-赤藓糖-4-磷酸（E4P）", formula="C4H7O7P",
         smiles="O=[CH:1][C@H:2](O)[C@H:3](O)[CH2:4]O[P](=O)([O-])[O-]",
         src="public/assets/steps/ppp-gn-lig/5XPS-E4P-A.sdf", sdf="e4p_5xps.sdf",
         pdb="5XPS", species="Scheffersomyces stipitis", method="X-RAY DIFFRACTION", res=1.07,
         chain="A", resname="E4P", protein="树干毕赤酵母转酮醇酶 TK（PPP 第 6/8 步）· 受体底物结合态",
         form="D-赤藓糖-4-磷酸（开链醛糖）",
         caveat="实验坐标来自 5XPS（转酮醇酶，链 A，配体 E4P，1.07 Å）：本步酶口袋但非人源、也非人源同工酶；用于 ppp-n5；ppp-n4 的转醛醇酶口袋未获同分子结构。"),
    dict(id="co2", name="二氧化碳（CO₂）", formula="CO2",
         smiles="O=C=O", src=None, sdf=None, no3d=True,
         form="二氧化碳（直线三原子）",
         caveat="CO₂ 仅 3 个原子，球棍模型没有形状信息量；本轮只做 2D，不建 3D（数据里 co2/no3d 记录原因），不用假球填充。"),
]

GN_MOLS = [
    dict(id="pyr-gn", name="丙酮酸（PKM2 口袋）", formula="C3H3O3",
         smiles="O=[C:1]([O-])[C:2](=O)[CH3:3]",
         src="public/assets/steps/ppp-gn-lig/4YJ5-PYR-A.sdf", sdf="pyr_4yj5.sdf",
         pdb="4YJ5", species="Homo sapiens", method="X-RAY DIFFRACTION", res=2.41,
         chain="A", resname="PYR", protein="人丙酮酸激酶 M2（PKM2；糖酵解末步，非糖异生丙酮酸羧化酶口袋）",
         form="丙酮酸（羧酸/酮）",
         caveat="实验坐标来自 4YJ5（人 PKM2，链 A，配体 PYR，2.41 Å）：人源但非本步丙酮酸羧化酶口袋；人 PC 的 PYR 络合物 3BG3 为 2.8 Å，超过本轮阈值。"),
    dict(id="hco3", name="碳酸氢根（HCO₃⁻）", formula="CHO3",
         smiles="O=C([O-])O", src=None, sdf=None, no3d=True,
         form="碳酸氢根（平面三氧碳酸）",
         caveat="HCO₃⁻ 仅 4 个原子，球棍模型没有形状信息量；本轮只做 2D，不建 3D（数据里 hco3/no3d 记录原因），不用假球填充。"),
    dict(id="fbp-gn", name="果糖-1,6-二磷酸（FBP，FBPase1 口袋）", formula="C6H10O12P2",
         smiles="[O-][P]([O-])(=O)O[CH2:1][C:2]1(O)O[C@H:5](CO[P]([O-])(=O)[O-])[C@H:4](O)[C@@H:3]1O",
         src="public/assets/steps/ppp-gn-lig/5ZWK-FBP-A.sdf", sdf="fbp_5zwk.sdf",
         pdb="5ZWK", species="Homo sapiens", method="X-RAY DIFFRACTION", res=2.1,
         chain="A", resname="FBP", protein="人肝果糖-1,6-二磷酸酶 1（FBPase1，糖异生第 9 步）· 底物结合态",
         form="β-D-呋喃果糖-1,6-二磷酸（四价阴离子）",
         caveat="实验坐标来自 5ZWK（人 FBPase1，链 A，配体 FBP，2.10 Å）：本步酶且人源；糖酵解页仍沿用 8W2G（人 PFKL，3.0 Å），两页来源不同步。"),
    dict(id="f6p-gn", name="6-磷酸果糖（F6P，FBPase1 口袋）", formula="C6H11O9P",
         smiles="O[CH2:1][C:2]1(O)O[C@H:5](CO[P]([O-])(=O)[O-])[C@H:4](O)[C@@H:3]1O",
         src="public/assets/steps/ppp-gn-lig/1EYI-F6P-A.sdf", sdf="f6p_1eyi.sdf",
         pdb="1EYI", species="Sus scrofa", method="X-RAY DIFFRACTION", res=2.32,
         chain="A", resname="F6P", protein="猪肝果糖-1,6-二磷酸酶 1（FBPase1，糖异生第 9 步）· 产物结合态",
         form="β-D-呋喃果糖-6-磷酸（五元环）",
         caveat="实验坐标来自 1EYI（猪肝 FBPase1，链 A，配体 F6P，2.32 Å）：本步酶但为哺乳动物非人源；糖酵解/PPP 页仍沿用 2CXS（小鼠 GPI）。"),
    dict(id="lac", name="L-乳酸（(S)-构型）", formula="C3H5O3",
         smiles="C[C@H:2](O)[C:1](=O)[O-]", src=None, sdf=None,
         form="L-乳酸（(S)-构型；计算构象）",
         caveat="PDB 唯一乳酸配体 LAC 的 CCD 为 D-乳酸（(R)），与 Cori 循环的 L-乳酸不是同一分子；本轮不拿对映体冒充，改为 RDKit 计算构象（自由态，不等于结合态）。"),
    dict(id="ala", name="L-丙氨酸", formula="C3H7NO2",
         smiles="C[C@H:2](N)[C:1](=O)O",
         src="public/assets/steps/ppp-gn-lig/8JDW-ALA-A.sdf", sdf="ala_8jdw.sdf",
         pdb="8JDW", species="Homo sapiens", method="X-RAY DIFFRACTION", res=2.3,
         chain="A", resname="ALA", protein="人 L-精氨酸:甘氨酸脒基转移酶 AGAT（非糖异生 ALT 口袋）",
         form="L-丙氨酸（(S)-构型）",
         caveat="实验坐标来自 8JDW（人 AGAT，链 A，配体 ALA，2.30 Å）：人源但非本步丙氨酸氨基转移酶口袋；人 ALT2（3IHJ）未见 ALA 配体。"),
    dict(id="glu", name="L-谷氨酸", formula="C5H8NO4",
         smiles="[NH3+][C@@H:2]([CH2:3][CH2:4][C:5](=O)[O-])[C:1](=O)[O-]",
         src="public/assets/steps/ppp-gn-lig/3CZD-GLU-A.sdf", sdf="glu_3czd.sdf",
         pdb="3CZD", species="Homo sapiens", method="X-RAY DIFFRACTION", res=2.4,
         chain="A", resname="GLU", protein="人肾型谷氨酰胺酶 GLS1（非糖异生 ALT 口袋）",
         form="L-谷氨酸（(S)-构型）",
         caveat="实验坐标来自 3CZD（人 GLS1，链 A，配体 GLU，2.40 Å）：人源但非本步丙氨酸氨基转移酶口袋。"),
]

PPP_TWO_D_IDS = {"6pgl", "6pg", "6pg-l", "ru5p", "ru5p-i", "r5p", "xu5p", "s7p", "e4p", "co2"}
GN_TWO_D_IDS = {"lac", "ala", "glu", "hco3"}

# ---------- β-氧化分子表（本轮新增） ----------
# 口径：①本步酶口袋（可跨种）→②人源非本酶→③其它；取不到才用 RDKit。
# 脂酰-CoA 系列全部"分块"：只画酰基链 + 硫酯 S，CoA 长链省略并标「CoA 略」。
# 链长必须留在块里（C16 画 16 个酰基碳、C14 画 14 个），不能只剩一个 S 原子。
FAO_MOLS = [
    dict(id="fa", name="棕榈酸（软脂酸，C16:0）", formula="C16H31O2",
         smiles="[CH3:16]CCCCCCCCCCCCCCC(=O)[O-]", src=None, sdf=None,
         form="棕榈酸（C16:0 饱和直链脂肪酸）",
         caveat="无同分子实验配体：棕榈酸在结构库里多以 PLM 出现在疏水口袋，但均非 β-氧化本步酶口袋；本轮按 RDKit ETKDGv3（30 起点）+ MMFF94 生成自由态构象，标注为计算构象，不等于白蛋白结合态或膜内构象。"),
    dict(id="acylcoa-c16", name="棕榈酰-CoA（分块：棕榈酰基 C1–C16 + 硫酯 S）", formula="C17H34OS",
         smiles="[CH3:16]" + "[CH2]" * 13 + "[CH2:2][C:1](=O)[S][CH3:17]",
         src="public/assets/steps/fao-lig/5DV5-PKZ-A.sdf", sdf="acylcoa_5dv5.sdf",
         pdb="5DV5", species="Vibrio alginolyticus", method="X-RAY DIFFRACTION", res=2.4,
         chain="A", resname="PKZ", protein="溶藻弧菌脂肪酸响应转录因子 FadR · 完整棕榈酰-CoA（非 β-氧化酶口袋）",
         form="棕榈酰-CoA 反应端（分块）：棕榈酰基 C1–C16 + 硫酯 S + CoA 折线起点",
         caveat="分块呈现，不是完整分子：只画反应端（棕榈酰基 C1–C16 + 硫酯 S）。实验坐标取自 5DV5 的完整棕榈酰-CoA（配体 PKZ，链 A，2.40 Å X-ray，溶藻弧菌 FadR，65 重原子）：只保留棕榈酰基 + 硫酯 S 的实测几何，CoA 长链省略；S 右侧的碳仅作 CoA 链的折线起点并标「CoA 略」。FadR 不是 β-氧化酶，本步酶（ACAD 家族）口袋内 C16 饱和酰基-CoA 的高分辨结构本轮未获。完整棕榈酰-CoA 为 C37H64N7O17P3S。",
         fragment=dict(kind="block", shown="棕榈酰基 C1–C16 + 硫酯 S",
                       omitted="CoA 长链（泛酸、腺苷、3′-磷酸）",
                       note="分块资产：只画反应端，不是完整棕榈酰-CoA（C37H64N7O17P3S）；链长 C16 保留在酰基链上，S 右侧碳为 CoA 折线起点并标「CoA 略」。"),
         coa_label_atom=17, label_atoms={17: "CoA 略"}),
    dict(id="enoyl-c16", name="反式-Δ²-棕榈烯酰-CoA（分块：C16 烯酰基 + 硫酯 S）", formula="C17H32OS",
         smiles="[CH3:16]" + "[CH2]" * 11 + "[CH2:4]/[CH:3]=[CH:2]/[C:1](=O)[S][CH3:17]",
         src="public/assets/steps/fao-lig/2UXW-TH3-A.sdf", sdf="enoyl_2uxw.sdf",
         pdb="2UXW", species="Homo sapiens", method="X-RAY DIFFRACTION", res=1.45,
         chain="A", resname="TH3", protein="人极长链酰基-CoA 脱氢酶 VLCAD（ACADVL，β-氧化第 1 步同酶）· 反式-Δ²-棕榈烯酰-CoA",
         form="反式-Δ²-棕榈烯酰-CoA 反应端（分块）：C1–C16 烯酰基（C2=C3 trans）+ 硫酯 S + CoA 折线起点",
         caveat="分块呈现，不是完整分子：只画反应端（C1–C16 烯酰基 + 硫酯 S）。实验坐标取自 2UXW 的配体 TH3（链 A，1.45 Å X-ray，人 VLCAD）：PDB 中 TH3 只建模了 24 个重原子，是截短的酰基-N-乙酰半胱胺硫酯（CoA 尾未建模），不是完整 CoA；本资产只用其反应端的实测几何，C2=C3 为实测 trans 双键，S 右侧碳仅作 CoA 折线起点并标「CoA 略」。完整反式-Δ²-棕榈烯酰-CoA 为 C37H62N7O17P3S。",
         fragment=dict(kind="block", shown="C1–C16 烯酰基（C2=C3 trans）+ 硫酯 S",
                       omitted="CoA 长链（泛酸、腺苷、3′-磷酸）",
                       note="分块资产：只画反应端，不是完整反式-Δ²-棕榈烯酰-CoA（C37H62N7O17P3S）；TH3 在晶体中是截短的酰基-N-乙酰半胱胺硫酯，CoA 尾未建模；链长 C16 与 C2=C3 双键保留在酰基链上。"),
         coa_label_atom=17, label_atoms={17: "CoA 略"}),
    dict(id="hydroxy-c16", name="L-3-羟基棕榈酰-CoA（分块：C16 羟酰基 + 硫酯 S）", formula="C17H34O2S",
         smiles="[CH3:16]" + "[CH2]" * 12 + "[C@H:3](O)[CH2:2][C:1](=O)[S][CH3:17]",
         src=None, sdf=None,
         form="L-3-羟基棕榈酰-CoA 反应端（分块）：C1–C16 羟酰基（C3 带 OH，S 构型）+ 硫酯 S + CoA 折线起点",
         caveat="分块呈现，不是完整分子；且为计算构象：本步酶（人 HADH）口袋内 C16 3-羟基脂酰-CoA 的实验络合物本轮未获。人 HADH 的 C4 3-羟基丁酰-CoA 络合物 1F12（2.4 Å）存在，但链长 C4 与 C16 不一致，混用会让 ΔV 把链长差当成化学变化，故不采用。构象由 RDKit ETKDGv3（30 起点）+ MMFF94 生成（自由态，不等于结合态）。C3 按 L-3-羟基酰-CoA 的 (S) 构型建模（CIP 校验见报告）。完整 L-3-羟基棕榈酰-CoA 为 C37H64N7O18P3S。",
         fragment=dict(kind="block", shown="C1–C16 羟酰基（C3-OH，S）+ 硫酯 S",
                       omitted="CoA 长链（泛酸、腺苷、3′-磷酸）",
                       note="分块资产：只画反应端，不是完整 L-3-羟基棕榈酰-CoA（C37H64N7O18P3S）；链长 C16 与 C3-OH 保留在酰基链上；3D 为计算构象。"),
         coa_label_atom=17, label_atoms={17: "CoA 略"}, expect_cip="C3:S"),
    dict(id="keto-c16", name="3-酮棕榈酰-CoA（分块：C16 酮酰基 + 硫酯 S）", formula="C17H32O2S",
         smiles="[CH3:16]" + "[CH2]" * 12 + "[C:3](=O)[CH2:2][C:1](=O)[S][CH3:17]",
         src=None, sdf=None,
         form="3-酮棕榈酰-CoA 反应端（分块）：C1–C16 酮酰基（C3 酮基）+ 硫酯 S + CoA 折线起点",
         caveat="分块呈现，不是完整分子；且为计算构象：本步酶（人 SCHAD/HADH）口袋内 C16 3-酮脂酰-CoA 的实验络合物本轮未获。人 SCHAD 的 C4 乙酰乙酰-CoA 络合物 1F0Y（1.8 Å，含 NAD）存在，但链长 C4 与 C16 不一致，混用会让 ΔV 把链长差当成化学变化，故不采用。构象由 RDKit ETKDGv3（30 起点）+ MMFF94 生成（自由态，不等于结合态）。完整 3-酮棕榈酰-CoA 为 C37H62N7O18P3S。",
         fragment=dict(kind="block", shown="C1–C16 酮酰基（C3=O）+ 硫酯 S",
                       omitted="CoA 长链（泛酸、腺苷、3′-磷酸）",
                       note="分块资产：只画反应端，不是完整 3-酮棕榈酰-CoA（C37H62N7O18P3S）；链长 C16 与 C3 酮基保留在酰基链上；3D 为计算构象。"),
         coa_label_atom=17, label_atoms={17: "CoA 略"}),
    dict(id="acylcoa-c14", name="肉豆蔻酰-CoA（分块：C14 酰基 + 硫酯 S）", formula="C15H30OS",
         smiles="[CH3:14]" + "[CH2]" * 11 + "[CH2:2][C:1](=O)[S][CH3:15]",
         src=None, sdf=None,
         form="肉豆蔻酰-CoA 反应端（分块）：C14 酰基 + 硫酯 S + CoA 折线起点",
         caveat="分块呈现，不是完整分子；且为计算构象：C14 肉豆蔻酰-CoA 的完整实验配体本轮未获。该块只用于表达第 4 步「链缩短 2C」的产物，构象由 RDKit ETKDGv3（30 起点）+ MMFF94 生成（自由态，不等于结合态）。完整肉豆蔻酰-CoA 为 C35H60N7O17P3S。",
         fragment=dict(kind="block", shown="C1–C14 酰基 + 硫酯 S",
                       omitted="CoA 长链（泛酸、腺苷、3′-磷酸）",
                       note="分块资产：只画反应端，不是完整肉豆蔻酰-CoA（C35H60N7O17P3S）；链长 C14 保留在酰基链上，比 C16 少两个碳。3D 为计算构象。"),
         coa_label_atom=15, label_atoms={15: "CoA 略"}),
    dict(id="acylcarn", name="棕榈酰肉碱（C16 脂酰肉碱）", formula="C23H45NO4",
         smiles="[CH3:16]CCCCCCCCCCCCCCC(=O)O[C@H:3](CC(=O)[O-])C[N+](C)(C)C", src=None, sdf=None,
         form="棕榈酰肉碱（C16 脂酰基酯化在肉碱 C3-OH；C3 为 R 构型）",
         caveat="无同分子实验配体：2RCU 的 BUJ 是棕榈酰肉碱类似物（鼠 CPT2），不是同一分子；本轮不用类似物冒充底物。按 RDKit ETKDGv3（30 起点）+ MMFF94 生成自由态构象，标注为计算构象；C3 按天然 (R)-肉碱构型建模（CIP 校验见报告）。",
         expect_cip="C3:R"),
    dict(id="carn", name="L-肉碱（(R)-3-羟基-4-三甲铵丁酸）", formula="C7H15NO3",
         smiles="C[N+](C)(C)C[C@H:3](O)CC(=O)[O-]", src=None, sdf=None,
         form="L-肉碱（两性离子；C3 为 R 构型）",
         caveat="作为酰基载体入画，游离态构象不代表 CPT1/CPT2 结合态；按 RDKit ETKDGv3（30 起点）+ MMFF94 生成计算构象（自由态），C3 按天然 (R) 构型建模（CIP 校验见报告）。",
         expect_cip="C3:R"),
]
FAO_TWO_D_IDS = {m["id"] for m in FAO_MOLS}

# ---------- 尿素循环：5 个块的小分子（2026-11-05 补齐） ----------
# 坐标口径：同分子 + ≤2.5 Å + X-ray/cryo-EM；本酶口袋优先，跨蛋白/跨物种/突变体在
# comparisonConfig 的首屏来源说明里逐条写明，不在此处辩护。
# 氨甲酰磷酸在水溶液中不稳定，且未获本酶口袋同分子高分辨络合物，只做 2D。
# NH3 只有 1 个重原子，球棍无信息量，沿用 CO₂/HCO₃⁻ 口径只做 2D；HCO₃⁻ 复用既有 hco3 资产。
UREA_MOLS = [
    dict(id="urea-nh3", name="氨（NH₃）", formula="H3N",
         smiles="[NH3:1]", src=None, sdf=None, no3d=True,
         form="氨（单重原子氮，溶于水以 NH₃/NH₄⁺ 平衡存在）",
         caveat="只有 1 个重原子，球棍模型没有可读的三维形状；沿用项目 CO₂/HCO₃⁻ 口径只做 2D，不伪造 3D。"),
    dict(id="urea-cap", name="氨甲酰磷酸（CAP²⁻）", formula="CH2NO5P",
         smiles="NC(=O)O[P](=O)([O-])[O-]", src=None, sdf=None, no3d=True,
         form="氨甲酰磷酸（C1 氨甲酰基、C1–O–P 酰基磷酸键）",
         caveat="氨甲酰磷酸在水溶液中不稳定（易水解为氨甲酸/磷酸），且本轮未获本酶 CPS1 口袋内同分子高分辨络合物；按项目“不稳定中间体只做 2D”的口径处理，3D 留缺并如实说明。"),
    dict(id="urea-orn", name="L-鸟氨酸", formula="C5H13N2O2",
         smiles="[NH3+][C@@H:2](CCCN)C(=O)O",
         src="public/assets/steps/urea-fas-lig/urea-orn-3GMZ-ORN-A551.sdf", sdf="urea_orn_3gmz.sdf",
         pdb="3GMZ", species="Homo sapiens", method="X-RAY DIFFRACTION", res=1.43,
         chain="A", resname="ORN", protein="人精氨酸酶 1（ARG1）· L-鸟氨酸产物结合态",
         form="L-鸟氨酸（α-氨基质子化；C2 为 S 构型）",
         caveat="实验坐标来自 3GMZ（人 ARG1，链 A，配体 ORN，1.43 Å）：鸟氨酸是 ARG1 的产物。用于尿素循环第 2 步（OTC 底物）时，坐标并非 OTC 口袋；用于第 5 步（ARG1 产物）时为本酶口袋。",
         expect_cip="C2:S"),
    dict(id="urea-cit", name="L-瓜氨酸", formula="C6H13N3O3",
         smiles="N[C@@H:2](CCCNC(N)=O)C(=O)O",
         src="public/assets/steps/urea-fas-lig/urea-cit-2NZ2-CIR-A502.sdf", sdf="urea_cit_2nz2.sdf",
         pdb="2NZ2", species="Homo sapiens", method="X-RAY DIFFRACTION", res=2.4,
         chain="A", resname="CIR", protein="人精氨酸琥珀酸合成酶 ASS1 · 瓜氨酸 + 天冬氨酸底物结合态",
         form="L-瓜氨酸（C2 为 S 构型；末端脲基）",
         caveat="实验坐标来自 2NZ2（人 ASS1，链 A，配体 CIR，2.40 Å）：瓜氨酸是 ASS1 的底物。用于第 2 步（OTC 产物）时，坐标并非 OTC 口袋；用于第 3 步（ASS1 底物）时为本酶口袋。",
         expect_cip="C2:S"),
    dict(id="urea-asp", name="L-天冬氨酸（ASP⁻）", formula="C4H6NO4",
         smiles="N[C@@H:2](CC(=O)[O-])C(=O)O",
         src="public/assets/steps/urea-fas-lig/urea-asp-2NZ2-ASP-A501.sdf", sdf="urea_asp_2nz2.sdf",
         pdb="2NZ2", species="Homo sapiens", method="X-RAY DIFFRACTION", res=2.4,
         chain="A", resname="ASP", protein="人精氨酸琥珀酸合成酶 ASS1 · 瓜氨酸 + 天冬氨酸底物结合态",
         form="L-天冬氨酸（侧链羧基电离；C2 为 S 构型）",
         caveat="实验坐标来自 2NZ2（人 ASS1，链 A，配体 ASP，2.40 Å）：本步酶口袋内的真底物结合态。",
         expect_cip="C2:S"),
    dict(id="urea-as1", name="L-精氨酸琥珀酸（AS1⁻）", formula="C10H17N4O6",
         smiles="C(C[C@@H:2](C(=O)[O-])N)C/N=C(\\N)/N[C@@H:10](CC(=O)O)C(=O)O",
         src="public/assets/steps/urea-fas-lig/urea-as1-1J20-AS1-A520.sdf", sdf="urea_as1_1j20.sdf",
         pdb="1J20", species="Thermus thermophilus", method="X-RAY DIFFRACTION", res=2.0,
         chain="A", resname="AS1", protein="Thermus thermophilus 精氨酸琥珀酸合成酶 ASS1 · 精氨酸琥珀酸产物结合态",
         form="L-精氨酸琥珀酸（C2/C10 均为 S 构型；瓜氨酸脲基与天冬氨酸羧基缩合）",
         caveat="实验坐标来自 1J20（嗜热栖热菌 ASS1，链 A，配体 AS1，2.00 Å）：精氨酸琥珀酸是 ASS1 的产物。用于第 3 步（ASS1 产物）时为本酶口袋；用于第 4 步（ASL 底物）时并非 ASL 口袋。非人源同酶。",
         expect_cip="C2:S,C10:S"),
    dict(id="urea-arg", name="L-精氨酸（ARG⁺）", formula="C6H15N4O2",
         smiles="C(C[C@@H:2](C(=O)O)N)CNC(=[NH2+])N",
         src="public/assets/steps/urea-fas-lig/urea-arg-9GGJ-ARG-B605.sdf", sdf="urea_arg_9ggj.sdf",
         pdb="9GGJ", species="Arabidopsis thaliana", method="X-RAY DIFFRACTION", res=2.0,
         chain="B", resname="ARG", protein="拟南芥精氨酸琥珀酸裂解酶 ASL · 精氨酸 + 延胡索酸产物结合态",
         form="L-精氨酸（胍基带正电；C2 为 S 构型）",
         caveat="实验坐标来自 9GGJ（拟南芥 ASL，链 B，配体 ARG，2.00 Å）：精氨酸是 ASL 的产物。用于第 4 步（ASL 产物）时为本酶口袋；用于第 5 步（ARG1 底物）时并非 ARG1 口袋。非人源同酶。",
         expect_cip="C2:S"),
    dict(id="urea-fum", name="延胡索酸（反式）", formula="C4H2O4",
         smiles="[O-][C:1](=O)/[CH:2]=[CH:3]/[C:4](=O)[O-]",
         src="public/assets/steps/urea-fas-lig/urea-fum-9GGJ-FUM-A609.sdf", sdf="urea_fum_9ggj.sdf",
         pdb="9GGJ", species="Arabidopsis thaliana", method="X-RAY DIFFRACTION", res=2.0,
         chain="A", resname="FUM", protein="拟南芥精氨酸琥珀酸裂解酶 ASL · 精氨酸 + 延胡索酸产物结合态",
         form="延胡索酸（反式丁烯二酸，C2=C3）",
         caveat="实验坐标来自 9GGJ（拟南芥 ASL，链 A，配体 FUM，2.00 Å）：延胡索酸是 ASL 的产物，本步为本酶口袋。非人源同酶；反式双键为平面，构象几乎刚性。",
         ),
    dict(id="urea-ure", name="尿素", formula="CH4N2O",
         smiles="NC(N)=O",
         src="public/assets/steps/urea-fas-lig/urea-ure-1HQG-URE-A1901.sdf", sdf="urea_ure_1hqg.sdf",
         pdb="1HQG", species="Rattus norvegicus", method="X-RAY DIFFRACTION", res=2.0,
         chain="A", resname="URE", protein="大鼠精氨酸酶 1 H141C 突变体 · 尿素 + 鸟氨酸产物结合态",
         form="尿素（C1 羰基、N1/N2 氨基）",
         caveat="实验坐标来自 1HQG（大鼠 ARG1 H141C 突变体，链 A，配体 URE，2.00 Å）：尿素是 ARG1 的产物。H141C 突变体不在底物直接接触位点，按原结构如实标注；非人源同酶。",
         ),
]
UREA_IDS = {m["id"] for m in UREA_MOLS}

# ---------- 脂肪酸合成：6 个块的小分子（2026-11-05 补齐） ----------
# FASN 约 540 kDa，按红线只做小分子、不做全酶三维。ACP 是蛋白载体，酰基-ACP 中间体
# 没有小分子实验配体，统一用计算构象并标注；乙酰-CoA/丙二酰-CoA 只取反应端 + 硫酯 S，
# 实验坐标来自完整 CoA 配体，S 以硫醇盐表示省略的载体连接。
# 棕榈酰-ACP（fas-c16-acyl）的配置分子式 C₁₆H₃₁O₂⁻ 与硫酯端 C₁₆H₃₁OS 冲突，未擅自改数据，
# 本轮不建资产，冲突写入 docs/asset-gaps-2026-11-05.md。
FAS_MOLS = [
    dict(id="fas-accoa", name="乙酰-CoA（分块：乙酰基 + 硫酯 S）", formula="C2H3OS",
         smiles="[S-:5][C:1](=O)[CH3:2]",
         src="public/assets/steps/tca-lig/8ZW1-ACO-B.sdf", sdf="fas_accoa_8zw1.sdf",
         pdb="8ZW1", species="Homo sapiens", method="X-RAY DIFFRACTION", res=2.1,
         chain="B", resname="ACO", protein="人柠檬酸合酶 CS · 完整乙酰-CoA（TCA 第 1 步；非 FASN 口袋）",
         form="乙酰-CoA 反应端（分块）：乙酰基 C1/C2 + 硫酯 S（硫醇盐表示省略的 CoA 连接）",
         caveat="分块呈现，不是完整分子：只画反应端（乙酰基 + 硫酯 S）。实验坐标取自 8ZW1 的完整乙酰-CoA（配体 ACO，链 B，2.1 Å，人 CS，51 重原子）：只保留乙酰基 + 硫酯 S 的实测几何，CoA 长链省略，S 端以硫醇盐表示。完整乙酰-CoA 为 C23H36N7O17P3S。",
         fragment=dict(kind="block", shown="乙酰基 C1/C2 + 硫酯 S", omitted="CoA 长链（泛酸、腺苷、3′-磷酸）",
                       note="分块资产：只画反应端，不是完整乙酰-CoA（C23H36N7O17P3S）；S 端为硫醇盐，表示省略的 CoA 连接。"),
         label_atoms={5: "CoA 略"}),
    dict(id="fas-c2", name="乙酰-ACP（分块：乙酰基 + 硫酯 S）", formula="C2H3OS",
         smiles="[S-:5][C:1](=O)[CH3:2]", src=None, sdf=None,
         form="乙酰-ACP 反应端（分块）：乙酰基 C1/C2 + 硫酯 S（硫醇盐表示省略的 ACP 连接）",
         caveat="分块呈现，不是完整分子；且为计算构象：ACP 是蛋白载体，乙酰-ACP 没有小分子实验配体。构象由 RDKit ETKDGv3（30 起点）+ MMFF94 生成（自由态，不等于结合态）。只画反应端，S 端为硫醇盐，表示省略的 ACP 连接；完整乙酰-ACP 的载体蛋白不在本资产内。",
         fragment=dict(kind="block", shown="乙酰基 C1/C2 + 硫酯 S", omitted="ACP 蛋白载体",
                       note="分块资产：只画反应端，不是完整乙酰-ACP；S 端为硫醇盐，表示省略的 ACP 连接；3D 为计算构象。"),
         label_atoms={5: "ACP 略"}),
    dict(id="fas-malonyl", name="丙二酰-CoA（分块：丙二酰基 + 硫酯 S）", formula="C3H3O3S",
         smiles="[S-:5][C:1](=O)[CH2:2][C:3](=O)O",
         src="public/assets/steps/urea-fas-lig/fas-malonyl-8H6C-MLC-C701.sdf", sdf="fas_malonyl_8h6c.sdf",
         pdb="8H6C", species="Homo sapiens", method="X-RAY DIFFRACTION", res=2.5,
         chain="C", resname="MLC", protein="人 GCN5 组蛋白乙酰转移酶 · 丙二酰-CoA（非 FASN 口袋）",
         form="丙二酰-CoA 反应端（分块）：丙二酰基 C1–C3 + 硫酯 S（硫醇盐表示省略的 CoA 连接）",
         caveat="分块呈现，不是完整分子：只画反应端（丙二酰基 + 硫酯 S）。实验坐标取自 8H6C 的完整丙二酰-CoA（配体 MLC，链 C，2.5 Å，人 GCN5，54 重原子）：只保留丙二酰基 + 硫酯 S 的实测几何，CoA 长链省略，S 端以硫醇盐表示。人 FASN 的 MLC 络合物 ≤2.5 Å 未获；此结构不是 FASN 口袋。完整丙二酰-CoA 为 C24H38N7O19P3S。",
         fragment=dict(kind="block", shown="丙二酰基 C1–C3 + 硫酯 S", omitted="CoA 长链（泛酸、腺苷、3′-磷酸）",
                       note="分块资产：只画反应端，不是完整丙二酰-CoA（C24H38N7O19P3S）；S 端为硫醇盐，表示省略的 CoA 连接。"),
         label_atoms={5: "CoA 略"}),
    dict(id="fas-c4-keto", name="3-酮丁酰-ACP（分块：C4 酮酰基 + 硫酯 S）", formula="C4H5O2S",
         smiles="[S-:5][C:1](=O)[CH2:2][C:3](=O)[CH3:4]", src=None, sdf=None,
         form="3-酮丁酰-ACP 反应端（分块）：C1–C4 酮酰基（C3=O）+ 硫酯 S",
         caveat="分块呈现，不是完整分子；且为计算构象：ACP 是蛋白载体，3-酮丁酰-ACP 没有小分子实验配体。构象由 RDKit ETKDGv3（30 起点）+ MMFF94 生成（自由态，不等于结合态）。只画反应端，S 端为硫醇盐，表示省略的 ACP 连接。",
         fragment=dict(kind="block", shown="C1–C4 酮酰基（C3=O）+ 硫酯 S", omitted="ACP 蛋白载体",
                       note="分块资产：只画反应端，不是完整 3-酮丁酰-ACP；S 端为硫醇盐，表示省略的 ACP 连接；3D 为计算构象。"),
         label_atoms={5: "ACP 略"}),
    dict(id="fas-c4-oh", name="D-3-羟基丁酰-ACP（分块：C4 羟酰基 + 硫酯 S）", formula="C4H7O2S",
         smiles="[S-:5][C:1](=O)[CH2:2][C@H:3](O)[CH3:4]", src=None, sdf=None,
         form="D-3-羟基丁酰-ACP 反应端（分块）：C1–C4 羟酰基（C3-OH，R 构型）+ 硫酯 S",
         caveat="分块呈现，不是完整分子；且为计算构象：ACP 是蛋白载体，D-3-羟基丁酰-ACP 没有小分子实验配体。构象由 RDKit ETKDGv3（30 起点）+ MMFF94 生成（自由态，不等于结合态）。C3 按 D-3-羟基酰基的 (R) 构型建模；S 端为硫醇盐，表示省略的 ACP 连接。",
         fragment=dict(kind="block", shown="C1–C4 羟酰基（C3-OH，R）+ 硫酯 S", omitted="ACP 蛋白载体",
                       note="分块资产：只画反应端，不是完整 D-3-羟基丁酰-ACP；S 端为硫醇盐，表示省略的 ACP 连接；3D 为计算构象。"),
         label_atoms={5: "ACP 略"}, expect_cip="C3:R"),
    dict(id="fas-c4-enoyl", name="反式-Δ²-丁烯酰-ACP（分块：C4 烯酰基 + 硫酯 S）", formula="C4H5OS",
         smiles="[S-:5][C:1](=O)/[CH:2]=[CH:3]/[CH3:4]", src=None, sdf=None,
         form="反式-Δ²-丁烯酰-ACP 反应端（分块）：C1–C4 烯酰基（C2=C3 trans）+ 硫酯 S",
         caveat="分块呈现，不是完整分子；且为计算构象：ACP 是蛋白载体，反式-Δ²-丁烯酰-ACP 没有小分子实验配体。构象由 RDKit ETKDGv3（30 起点）+ MMFF94 生成（自由态，不等于结合态）。C2=C3 为反式双键；S 端为硫醇盐，表示省略的 ACP 连接。",
         fragment=dict(kind="block", shown="C1–C4 烯酰基（C2=C3 trans）+ 硫酯 S", omitted="ACP 蛋白载体",
                       note="分块资产：只画反应端，不是完整反式-Δ²-丁烯酰-ACP；S 端为硫醇盐，表示省略的 ACP 连接；3D 为计算构象。"),
         label_atoms={5: "ACP 略"}),
    dict(id="fas-c4-acyl", name="丁酰-ACP（分块：C4 酰基 + 硫酯 S）", formula="C4H7OS",
         smiles="[S-:5][C:1](=O)[CH2:2][CH2:3][CH3:4]", src=None, sdf=None,
         form="丁酰-ACP 反应端（分块）：C1–C4 饱和酰基 + 硫酯 S",
         caveat="分块呈现，不是完整分子；且为计算构象：ACP 是蛋白载体，丁酰-ACP 没有小分子实验配体。构象由 RDKit ETKDGv3（30 起点）+ MMFF94 生成（自由态，不等于结合态）。只画反应端，S 端为硫醇盐，表示省略的 ACP 连接。",
         fragment=dict(kind="block", shown="C1–C4 饱和酰基 + 硫酯 S", omitted="ACP 蛋白载体",
                       note="分块资产：只画反应端，不是完整丁酰-ACP；S 端为硫醇盐，表示省略的 ACP 连接；3D 为计算构象。"),
         label_atoms={5: "ACP 略"}),
    dict(id="fas-c16-acyl", name="棕榈酰-ACP（分块：C16 酰基 + 硫酯 S）", formula="C16H31OS",
         smiles="[S-:5][C:1](=O)CCCCCCCCCCCCCCC", src=None, sdf=None,
         form="棕榈酰-ACP 反应端（分块）：C1–C16 饱和酰基 + 硫酯 S",
         caveat="分块呈现，不是完整分子；且为计算构象：ACP 是蛋白载体，棕榈酰-ACP 没有小分子实验配体。构象由 RDKit ETKDGv3（30 起点）+ MMFF94 生成（自由态，不等于结合态）。只画反应端，S 端为硫醇盐，表示省略的 ACP 连接。",
         fragment=dict(kind="block", shown="C1–C16 饱和酰基 + 硫酯 S", omitted="ACP 蛋白载体",
                       note="分块资产：只画反应端，不是完整棕榈酰-ACP；S 端为硫醇盐，表示省略的 ACP 连接；3D 为计算构象。"),
         label_atoms={5: "ACP 略"}),
    dict(id="fas-c16", name="棕榈酸（C16:0）", formula="C16H31O2",
         smiles="[O-][C:1](=O)CCCCCCCCCCCCCCC",
         src="public/assets/steps/urea-fas-lig/fas-c16-2WUT-PLM-A1134.sdf", sdf="fas_c16_2wut.sdf",
         pdb="2WUT", species="Homo sapiens", method="X-RAY DIFFRACTION", res=1.85,
         chain="A", resname="PLM", protein="人髓鞘蛋白 P2（脂肪酸结合蛋白）· 棕榈酸（非 FASN 口袋）",
         form="棕榈酸（C16:0 饱和直链脂肪酸；羧酸根）",
         caveat="实验坐标来自 2WUT（人髓鞘蛋白 P2，链 A，配体 PLM，1.85 Å）：棕榈酸为 FASN 硫酯酶的产物。人 FASN 硫酯酶域与 C16 脂肪酸的高分辨络合物本轮未获；此结构不是 FASN 口袋。配体 PLM 为中性棕榈酸，资产按数据层 C16H31O2⁻ 阴离子口径渲染，只影响质子化标注，不改重原子坐标。",
         ),
]
FAS_IDS = {m["id"] for m in FAS_MOLS}

# ---------- 糖原：7 个只做 2D 的分子（不生成 3D，不写 PDB 坐标） ----------
# 聚合度不固定的糖原/极限糊精只画代表性片段（麦芽三糖 / 潘糖），片段说明写在 form/caveat；
# 其余 5 个是确定的单分子（G1P / UTP / UDP-葡萄糖 / PPi / UDP），同样只做 2D。
GLYCOGEN_2D_MOLS = [
    dict(id="glycogen", name="糖原（α-1,4 链段）ₙ", formula="C18H32O16",
         smiles="OC[C@H]1O[C@H](O[C@H]2[C@H](O)[C@@H](O)[C@H](O[C@H]3[C@H](O)[C@@H](O)[C@H](O)O[C@@H]3CO)O[C@@H]2CO)[C@H](O)[C@@H](O)[C@@H]1O",
         no3d=True,
         form="糖原 α-1,4 链段三糖示意（麦芽三糖片段，不代表聚合度）",
         caveat="糖原聚合度不固定，2D 只画 3 个葡萄糖残基的 α-1,4 链段示意；不生成 3D（无单一大分子实验坐标）。"),
    dict(id="glycogen-limit", name="糖原极限糊精（α-1,6 分支片段）", formula="C18H32O16",
         smiles="C([C@@H]1[C@H]([C@@H]([C@H]([C@H](O1)OC[C@@H]2[C@H]([C@@H]([C@H]([C@H](O2)O[C@H]([C@@H](CO)O)[C@@H]([C@H](C=O)O)O)O)O)O)O)O)O)O",
         no3d=True,
         form="极限糊精分支片段示意（潘糖：α-1,6 分支 + α-1,4 主链）",
         caveat="极限糊精是分支聚合物，2D 只画潘糖片段示意；不生成 3D。"),
    dict(id="g1p", name="葡萄糖-1-磷酸（G1P）", formula="C6H11O9P",
         smiles="O=P([O-])([O-])O[C@H]1O[C@H](CO)[C@@H](O)[C@H](O)[C@H]1O",
         no3d=True,
         form="α-D-葡萄糖-1-磷酸（二价阴离子）",
         caveat="本轮仅补 2D；无实验配体坐标，不生成 3D。"),
    dict(id="utp", name="尿苷三磷酸（UTP）", formula="C9H11N2O15P3",
         smiles="O=c1ccn([C@@H]2O[C@H](COP(=O)([O-])OP(=O)([O-])OP(=O)([O-])[O-])[C@@H](O)[C@H]2O)c(=O)[nH]1",
         no3d=True,
         form="尿苷三磷酸（四价阴离子）",
         caveat="本轮仅补 2D；无实验配体坐标，不生成 3D。"),
    dict(id="udp-glucose", name="UDP-α-D-葡萄糖（UDP-Glc）", formula="C15H22N2O17P2",
         smiles="O=c1ccn([C@@H]2O[C@H](COP(=O)([O-])OP(=O)([O-])O[C@H]3O[C@H](CO)[C@@H](O)[C@H](O)[C@H]3O)[C@@H](O)[C@H]2O)c(=O)[nH]1",
         no3d=True,
         form="UDP-α-D-葡萄糖（二价阴离子）",
         caveat="本轮仅补 2D；无实验配体坐标，不生成 3D。"),
    dict(id="ppi", name="焦磷酸（PPi）", formula="HO7P2",
         smiles="OP([O-])(=O)OP([O-])(=O)[O-]",
         no3d=True,
         form="焦磷酸（HP₂O₇³⁻）",
         caveat="本轮仅补 2D；无实验配体坐标，不生成 3D。"),
    dict(id="udp", name="尿苷二磷酸（UDP）", formula="C9H12N2O12P2",
         smiles="O=c1ccn([C@@H]2O[C@H](COP(=O)([O-])OP(=O)([O-])O)[C@@H](O)[C@H]2O)c(=O)[nH]1",
         no3d=True,
         form="尿苷二磷酸（二价阴离子）",
         caveat="本轮仅补 2D；无实验配体坐标，不生成 3D。"),
]
GLYCOGEN_2D_IDS = {m["id"] for m in GLYCOGEN_2D_MOLS}

# 氨基酸代谢（PLATE 11）：仅补 2D，不生成 3D。SMILES 统一按 pH 7.4 电离态书写。
AMINO_2D_MOLS = [
    dict(id="leu", name="L-亮氨酸（Leu）", formula="C6H13NO2",
         smiles="[NH3+][C@@H](CC(C)C)C(=O)[O-]",
         no3d=True,
         form="L-亮氨酸两性离子（α-NH₃⁺ / α-COO⁻，净电荷 0）",
         caveat="本轮仅补 2D；无本步酶口袋的人源实验配体坐标，不生成 3D。"),
    dict(id="kic", name="α-酮异己酸（KIC）", formula="C6H9O3",
         smiles="CC(C)CC(=O)C(=O)[O-]",
         no3d=True,
         form="α-酮异己酸（α-酮酸阴离子，pH 7.4 羧基电离）",
         caveat="本轮仅补 2D；无实验配体坐标，不生成 3D。"),
    dict(id="phe", name="L-苯丙氨酸（Phe）", formula="C9H11NO2",
         smiles="[NH3+][C@@H](Cc1ccccc1)C(=O)[O-]",
         no3d=True,
         form="L-苯丙氨酸两性离子（净电荷 0）",
         caveat="本轮仅补 2D；无本步酶口袋的人源实验配体坐标，不生成 3D。"),
    dict(id="tyr", name="L-酪氨酸（Tyr）", formula="C9H11NO3",
         smiles="[NH3+][C@@H](Cc1ccc(O)cc1)C(=O)[O-]",
         no3d=True,
         form="L-酪氨酸两性离子（酚羟基 pKa≈10，pH 7.4 不电离；净电荷 0）",
         caveat="本轮仅补 2D；无本步酶口袋的人源实验配体坐标，不生成 3D。"),
    dict(id="hcy", name="L-高半胱氨酸（Hcy）", formula="C4H9NO2S",
         smiles="[NH3+][C@@H](CCS)C(=O)[O-]",
         no3d=True,
         form="L-高半胱氨酸两性离子（巯基 pKa≈10.4，pH 7.4 不电离；净电荷 0）",
         caveat="本轮仅补 2D；无本步酶口袋的人源实验配体坐标，不生成 3D。"),
    dict(id="ser", name="L-丝氨酸（Ser）", formula="C3H7NO3",
         smiles="[NH3+][C@@H](CO)C(=O)[O-]",
         no3d=True,
         form="L-丝氨酸两性离子（净电荷 0）",
         caveat="本轮仅补 2D；无本步酶口袋的人源实验配体坐标，不生成 3D。"),
    dict(id="cystathionine", name="L-胱硫醚（Cystathionine）", formula="C7H14N2O4S",
         smiles="[NH3+][C@@H](CCSC[C@H]([NH3+])C(=O)[O-])C(=O)[O-]",
         no3d=True,
         form="L-胱硫醚两性离子（两个 α-羧基 −2、两个 α-氨基 +2，净电荷 0）",
         caveat="本轮仅补 2D；无实验配体坐标，不生成 3D。"),
    dict(id="gln", name="L-谷氨酰胺（Gln）", formula="C5H10N2O3",
         smiles="[NH3+][C@@H](CCC(N)=O)C(=O)[O-]",
         no3d=True,
         form="L-谷氨酰胺两性离子（侧链酰胺不电离，净电荷 0）",
         caveat="本轮仅补 2D；无本步酶口袋的人源实验配体坐标，不生成 3D。"),
]
AMINO_2D_IDS = {m["id"] for m in AMINO_2D_MOLS}

# 胆固醇合成 / 甲羟戊酸通路（PLATE 12）：仅补 2D，不生成 3D。
# SMILES 取自 PubChem 规范 SMILES（CID 449 / 439400 / 439418 / 1195 / 647 / 638072 / 5366020 / 246983 / 5997），
# 前五个按 pH 7.4 去质子（羧基 −1；单磷酸 −2；二磷酸 −3；二磷酸单酯 −3）。
CHOLESTEROL_2D_MOLS = [
    dict(id="mevalonate", name="甲羟戊酸（MVA）", formula="C6H11O4",
         smiles="CC(CCO)(CC(=O)[O-])O",
         no3d=True,
         form="甲羟戊酸阴离子（C1 羧基 −1；C3 / C5 羟基 pKa≈15，pH 7.4 不电离）",
         caveat="本轮仅补 2D；无本步酶 HMGCR 口袋内甲羟戊酸的实验配体坐标，不生成 3D。"),
    dict(id="mev5p", name="甲羟戊酸-5-磷酸（MVA-5-P）", formula="C6H10O7P",
         smiles="C[C@@](CCOP(=O)([O-])[O-])(CC(=O)[O-])O",
         no3d=True,
         form="甲羟戊酸-5-磷酸三价阴离子（羧基 −1 + 5-磷酸单酯 −2）",
         caveat="本轮仅补 2D；无实验配体坐标，不生成 3D。"),
    dict(id="mev5pp", name="甲羟戊酸-5-二磷酸（MVA-5-PP）", formula="C6H10O10P2",
         smiles="C[C@@](CCOP(=O)([O-])OP(=O)([O-])[O-])(CC(=O)[O-])O",
         no3d=True,
         form="甲羟戊酸-5-二磷酸四价阴离子（羧基 −1 + 二磷酸单酯 −3）",
         caveat="本轮仅补 2D；无实验配体坐标，不生成 3D。"),
    dict(id="ipp", name="异戊烯基二磷酸（IPP）", formula="C5H9O7P2",
         smiles="CC(=C)CCOP(=O)([O-])OP(=O)([O-])[O-]",
         no3d=True,
         form="IPP 三价阴离子（二磷酸单酯：内部 −1、末端 −2）",
         caveat="本轮仅补 2D；无实验配体坐标，不生成 3D。"),
    dict(id="dmapp", name="二甲基烯丙基二磷酸（DMAPP）", formula="C5H9O7P2",
         smiles="CC(=CCOP(=O)([O-])OP(=O)([O-])[O-])C",
         no3d=True,
         form="DMAPP 三价阴离子（与 IPP 同分子式；二磷酸单酯 −3）",
         caveat="本轮仅补 2D；FBPP / FDPS 口袋内 DMAPP 的实验坐标未取，不生成 3D。"),
    dict(id="squalene", name="角鲨烯（Squalene）", formula="C30H50",
         smiles="CC(=CCC/C(=C/CC/C(=C/CC/C=C(/CC/C=C(/CCC=C(C)C)\\C)\\C)/C)/C)C",
         no3d=True,
         form="全反式 C30 烃，无 pKa 相关基团，pH 7.4 中性",
         caveat="本轮仅补 2D；无实验配体坐标，不生成 3D。"),
    dict(id="oxidosqualene", name="2,3-环氧角鲨烯（2,3-OS）", formula="C30H50O",
         smiles="CC(=CCC/C(=C/CC/C(=C/CC/C=C(\\C)/CC/C=C(\\C)/CCC1C(O1)(C)C)/C)/C)C",
         no3d=True,
         form="环氧与烃链均不解离，pH 7.4 中性",
         caveat="本轮仅补 2D；无实验配体坐标，不生成 3D。"),
    dict(id="lanosterol", name="羊毛甾醇（Lanosterol）", formula="C30H50O",
         smiles="C[C@H](CCC=C(C)C)[C@H]1CC[C@@]2([C@@]1(CCC3=C2CC[C@@H]4[C@@]3(CC[C@@H](C4(C)C)O)C)C)C",
         no3d=True,
         form="3β-羟基 pKa≈15，pH 7.4 不解离；中性",
         caveat="本轮仅补 2D；LSS 的 1W6K 虽有羊毛甾醇配体，按项目口径不截取酶坐标做分子资产，不生成 3D。"),
    dict(id="cholesterol", name="胆固醇（Cholesterol）", formula="C27H46O",
         smiles="C[C@H](CCCC(C)C)[C@H]1CC[C@@H]2[C@@]1(CC[C@H]3[C@H]2CC=C4[C@@]3(CC[C@@H](C4)O)C)C",
         no3d=True,
         form="3β-羟基 pKa≈15，pH 7.4 不解离；中性",
         caveat="本轮仅补 2D；无实验配体坐标，不生成 3D。"),
]
CHOLESTEROL_2D_IDS = {m["id"] for m in CHOLESTEROL_2D_MOLS}


def copytemp(src_rel, sdf_name):
    src = os.path.join(ROOT, src_rel)
    if not os.path.exists(src):
        raise SystemExit(f"实验坐标 SDF 不存在：{src}")
    dst = os.path.join(WORK, sdf_name)
    shutil.copyfile(src, dst)
    return dst


def load_sdf(path):
    m = Chem.MolFromMolFile(path, removeHs=False, sanitize=False)
    if m is None:
        raise SystemExit(f"SDF 解析失败：{path}")
    m.UpdatePropertyCache(strict=False)
    return m


def parse_template(smi, strict=True):
    m = Chem.MolFromSmiles(smi)
    if m is None:
        raise SystemExit(f"SMILES 解析失败：{smi}")
    if strict:
        Chem.AssignStereochemistry(m, cleanIt=True, force=True)
    return m


def formula_of(m):
    f = rdMolDescriptors.CalcMolFormula(m)
    return re.sub(r"[+-]\d*$", "", f)


def atom_name(a, mol):
    el = a.GetSymbol()
    mp = a.GetAtomMapNum()
    if el == "C":
        return f"C{mp}" if mp else "C"
    if el == "P":
        for nb in a.GetNeighbors():
            if nb.GetSymbol() == "O":
                for c in nb.GetNeighbors():
                    if c.GetSymbol() == "C" and c.GetAtomMapNum():
                        return f"P{c.GetAtomMapNum()}"
        return "P"
    if el == "O":
        cn = [nb for nb in a.GetNeighbors() if nb.GetSymbol() == "C" and nb.GetAtomMapNum()]
        pn = [nb for nb in a.GetNeighbors() if nb.GetSymbol() == "P"]
        if cn and pn:
            return f"O{cn[0].GetAtomMapNum()}"
        return "O"
    return el


def repair_connectivity(sdf_mol, cov_factor=1.2):
    """SDF 的键表由共价半径推断，个别 C–O/C–C 键会漏（如 4ALD 的 1.68 Å、AS1 的 1.80 Å）。
    用 RDKit 的 DetermineConnectivity 从坐标重建连接表，只取连接关系，不取键级。

    2026-11-05：SDF 键表已由 tools/fix-sdf-bond-orders.py 用 SMILES 模板补齐真实键级。
    匹配失败时 match_to_sdf 会退回 union_connectivity（坐标推断 ∪ 键表），以保留只存在于
    键表里的环闭合键（如 8W2G 的呋喃环）；正常路径仍只用坐标推断，保持既有映射顺序。"""
    raw = Chem.RWMol()
    for a in sdf_mol.GetAtoms():
        raw.AddAtom(Chem.Atom(a.GetSymbol()))
    raw.AddConformer(sdf_mol.GetConformer(), assignId=True)
    m = raw.GetMol()
    rdDetermineBonds.DetermineConnectivity(m, covFactor=cov_factor)
    return m


def union_connectivity(sdf_mol, cov_factor=1.2):
    """坐标推断 + SDF 现有键表并集：保留只存在于键表里的环闭合键（如 8W2G 的呋喃环）。
    注意 DetermineConnectivity 会重写键表，并集必须放在它之后。"""
    m = repair_connectivity(sdf_mol, cov_factor)
    rw = Chem.RWMol(m)
    for b in sdf_mol.GetBonds():
        if not rw.GetBondBetweenAtoms(b.GetBeginAtomIdx(), b.GetEndAtomIdx()):
            rw.AddBond(b.GetBeginAtomIdx(), b.GetEndAtomIdx(), Chem.BondType.SINGLE)
    return rw.GetMol()


def match_to_sdf(template, sdf_mol):
    """把模板图（键级泛化、电荷清零）匹配到 SDF 的连接表；返回 templateIdx→sdfIdx 映射"""
    raw_sdf = sdf_mol
    sdf_mol = repair_connectivity(sdf_mol)
    # 实验配体应当是单个分子；若默认共价半径把一根长键漏成两个片段，
    # 逐步放宽 covFactor 直到连通（AS1 的 N–C 键长 1.80 Å 需要 1.35）。
    if len(Chem.GetMolFrags(sdf_mol)) > 1:
        for cf in (1.25, 1.3, 1.35, 1.4):
            trial = repair_connectivity(sdf_mol, cf)
            if len(Chem.GetMolFrags(trial)) == 1:
                sdf_mol = trial
                break
    q = Chem.RWMol(template)
    for a in q.GetAtoms():
        a.SetFormalCharge(0)
    Chem.Kekulize(q, clearAromaticFlags=True)
    qp = Chem.AdjustQueryParameters()
    qp.makeBondsGeneric = True
    q = Chem.AdjustQueryProperties(q, qp)
    matches = sdf_mol.GetSubstructMatches(q, uniquify=False, maxMatches=500)
    if not matches:
        # 坐标推断漏掉的环闭合键（8W2G 呋喃环的 C–O 在键表里、但共价半径判不出来）：
        # 用「坐标推断 ∪ SDF 键表」再试一次；只有命中失败时才走这条，避免改变既有映射顺序。
        sdf_rep = union_connectivity(raw_sdf)
        matches = sdf_rep.GetSubstructMatches(q, uniquify=False, maxMatches=500)
        if not matches:
            raise SystemExit("模板与实验坐标连接表不匹配（原子/连接不一致）")
        sdf_mol = sdf_rep
    # 多解时取“键长分布最接近模板 2D 布局”的一个：用模板 2D 坐标的键长中位无关，改用首个即可；
    # 对称匹配互等价，但为避免手性反转，优先取与模板 3D（ETKDG）对齐后 RMSD 最小者
    ref = Chem.AddHs(template)
    ps = AllChem.ETKDGv3()
    ps.randomSeed = 20261103
    if AllChem.EmbedMolecule(ref, ps) != 0:
        return matches[0]
    refc = ref.GetConformer()
    best, best_rms = None, 1e9
    for mt in matches:
        d2 = 0.0
        for ti, si in enumerate(mt):
            if ref.GetAtomWithIdx(ti).GetSymbol() == "H":
                continue
            p = sdf_mol.GetConformer().GetAtomPosition(si)
            r = refc.GetAtomPosition(ti)
            d2 += (p.x - r.x) ** 2 + (p.y - r.y) ** 2 + (p.z - r.z) ** 2
        rms = math.sqrt(d2 / template.GetNumAtoms())
        if rms < best_rms:
            best, best_rms = mt, rms
    return best


def vdw_volume(mol, conf_id=-1, grid=0.4):
    conf = mol.GetConformer(conf_id)
    pts = np.array([[conf.GetAtomPosition(i).x, conf.GetAtomPosition(i).y, conf.GetAtomPosition(i).z]
                    for i in range(mol.GetNumAtoms())])
    radii = np.array([VDW.get(a.GetSymbol(), 1.7) for a in mol.GetAtoms()])
    lo = (pts - radii[:, None]).min(axis=0) - 0.5
    hi = (pts + radii[:, None]).max(axis=0) + 0.5
    n = np.ceil((hi - lo) / grid).astype(int)
    xs = lo[0] + (np.arange(n[0]) + 0.5) * grid
    ys = lo[1] + (np.arange(n[1]) + 0.5) * grid
    zs = lo[2] + (np.arange(n[2]) + 0.5) * grid
    inside = np.zeros((n[0], n[1], n[2]), dtype=bool)
    # 逐原子做球体掩码，避免全网格 × 全原子的内存放大
    for p, r in zip(pts, radii):
        i0 = max(0, int((p[0] - r - lo[0]) / grid)); i1 = min(n[0], int((p[0] + r - lo[0]) / grid) + 1)
        j0 = max(0, int((p[1] - r - lo[1]) / grid)); j1 = min(n[1], int((p[1] + r - lo[1]) / grid) + 1)
        k0 = max(0, int((p[2] - r - lo[2]) / grid)); k1 = min(n[2], int((p[2] + r - lo[2]) / grid) + 1)
        sub = np.array(np.meshgrid(xs[i0:i1], ys[j0:j1], zs[k0:k1], indexing="ij"))
        d2 = ((sub - p[:, None, None, None]) ** 2).sum(axis=0)
        inside[i0:i1, j0:j1, k0:k1] |= d2 <= r * r
    return float(inside.sum()) * grid ** 3


def shape_metrics(mol_h):
    conf = mol_h.GetConformer()
    pts = np.array([[conf.GetAtomPosition(i).x, conf.GetAtomPosition(i).y, conf.GetAtomPosition(i).z]
                    for i in range(mol_h.GetNumAtoms())])
    c = pts - pts.mean(axis=0)
    _, _, vt = np.linalg.svd(c, full_matrices=False)
    proj = c @ vt.T
    axes = (proj.max(axis=0) - proj.min(axis=0)).tolist()
    return {
        "vdwVolumeA3": round(vdw_volume(mol_h), 1),
        "axesA": [round(x, 2) for x in sorted(axes, reverse=True)],
        "maxExtentA": round(max(axes), 2),
    }


def build_experimental(spec, template):
    sdf = load_sdf(copytemp(spec["src"], spec["sdf"]))
    mapping = match_to_sdf(template, sdf)
    mol3 = Chem.Mol(template)
    conf = Chem.Conformer(mol3.GetNumAtoms())
    for ti, si in enumerate(mapping):
        p = sdf.GetConformer().GetAtomPosition(si)
        conf.SetAtomPosition(ti, p)
    mol3.RemoveAllConformers()
    mol3.AddConformer(conf)
    return mol3, mapping


def build_computed(spec, template):
    mh = Chem.AddHs(template)
    ps = AllChem.ETKDGv3()
    ps.randomSeed = 20261103
    # 不做 RMSD 去重（pruneRmsThresh=-1）：刚体分子（如丙酮酸）去重后只剩 1 个构象，
    # 与"≥20 个起点逐一优化再取最低"的口径不符；此处保留全部 30 个起点并如实记录数量。
    ps.pruneRmsThresh = -1.0
    ps.numThreads = 0
    cids = list(AllChem.EmbedMultipleConfs(mh, numConfs=30, params=ps))
    if not cids:
        raise SystemExit(f"{spec['id']}：ETKDG 未生成任何构象")
    props = AllChem.MMFFGetMoleculeProperties(mh)
    if props is not None:
        results = AllChem.MMFFOptimizeMoleculeConfs(mh, maxIters=2000, numThreads=0)
        method = "MMFF94"
    else:
        results = AllChem.UFFOptimizeMoleculeConfs(mh, maxIters=2000, numThreads=0)
        method = "UFF"
    energies = [e for (_, e) in results]
    best_cid = int(np.argmin(energies))
    energies = [round(e, 2) for e in energies]
    # 只保留重原子坐标（AddHs 把 H 追加在尾部，重原子索引不变）
    mol3 = Chem.RemoveHs(mh, sanitize=True)
    mol3.RemoveAllConformers()
    conf = Chem.Conformer(mol3.GetNumAtoms())
    src = mh.GetConformer(cids[best_cid])
    for i in range(mol3.GetNumAtoms()):
        conf.SetAtomPosition(i, src.GetAtomPosition(i))
    conf.Set3D(True)
    mol3.AddConformer(conf, assignId=True)
    return mol3, {
        "kind": "computed",
        "method": f"RDKit ETKDGv3 + {method}",
        "conformerCount": len(cids),
        "energyKcalMol": round(min(energies), 2),
        "randomSeed": 20261103,
        "note": "计算构象（自由态），不是实验观测；与晶体结合构象可能不同。",
    }


def svg_2d(asset):
    atoms = {a["id"]: a for a in asset["atoms"]}
    xs = [a["x"] for a in asset["atoms"]]
    ys = [a["y"] for a in asset["atoms"]]
    pad = 40
    bx, by = min(xs) - pad, min(ys) - pad
    bw, bh = max(xs) - min(xs) + pad * 2, max(ys) - min(ys) + pad * 2
    ink, paper, hair, brick = "#22282a", "#f6f3ec", "rgba(34,40,42,0.55)", "#9c4a3c"
    out = [f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{bx:.1f} {by:.1f} {bw:.1f} {bh:.1f}" '
           f'width="{bw:.0f}" height="{bh:.0f}" role="img" aria-label="{asset["frameId"]}">',
           f'<rect x="{bx:.1f}" y="{by:.1f}" width="{bw:.1f}" height="{bh:.1f}" fill="{paper}"/>']
    lines = 0
    base_bonds = 0
    for b in asset["bonds"]:
        a, c = atoms[b["a"]], atoms[b["b"]]
        dx, dy = c["x"] - a["x"], c["y"] - a["y"]
        L = math.hypot(dx, dy) or 1
        ox, oy = (-dy / L) * 2.6, (dx / L) * 2.6
        out.append(f'<line x1="{a["x"]:.1f}" y1="{a["y"]:.1f}" x2="{c["x"]:.1f}" y2="{c["y"]:.1f}" '
                   f'stroke="{ink}" stroke-width="1.6"/>')
        lines += 1
        base_bonds += 1
        if b.get("order") == 2:
            out.append(f'<line x1="{a["x"] * 0.85 + c["x"] * 0.15 + ox:.1f}" '
                       f'y1="{a["y"] * 0.85 + c["y"] * 0.15 + oy:.1f}" '
                       f'x2="{c["x"] * 0.85 + a["x"] * 0.15 + ox:.1f}" '
                       f'y2="{c["y"] * 0.85 + a["y"] * 0.15 + oy:.1f}" stroke="{ink}" stroke-width="1.6"/>')
            lines += 1
    for w in asset.get("wedge", []):
        a, c = atoms[w["a"]], atoms[w["b"]]
        dx, dy = c["x"] - a["x"], c["y"] - a["y"]
        L = math.hypot(dx, dy) or 1
        px, py = (-dy / L) * 3.6, (dx / L) * 3.6
        out.append(f'<polygon points="{a["x"]:.1f},{a["y"]:.1f} {c["x"] + px:.1f},{c["y"] + py:.1f} '
                   f'{c["x"] - px:.1f},{c["y"] - py:.1f}" fill="{ink}"/>')
    # 电荷符号落位：默认右下 (+9,+8)；与相邻杂原子标签、碳编号或其它电荷压叠时依次退让。
    # 只挪电荷符号的位置偏移，不改字号、键线与原子标签。
    label_boxes = []
    for a in asset["atoms"]:
        if a["el"] in ("O", "N", "S", "P"):
            label_boxes.append((a["x"] - 4.5, a["y"] - 9.0, a["x"] + 4.5, a["y"] + 4.0))
        if a.get("label"):
            wdt = len(a["label"]) * 5.6
            label_boxes.append((a["x"] + 9, a["y"] - 14.0, a["x"] + 9 + wdt, a["y"] - 5.0))
    charge_layout = {}
    charge_boxes = []
    spots = [(9, 8), (9, -8), (14, 8), (9, 17), (14, 17), (9, 24), (16, -5), (5, -17)]
    for a in asset["atoms"]:
        if not a.get("charge"):
            continue
        best, best_score = spots[0], float("inf")
        for dx, dy in spots:
            b = (a["x"] + dx, a["y"] + dy - 9.4, a["x"] + dx + 5.6, a["y"] + dy + 3.2)
            score = 0.0
            if b[0] < bx or b[2] > bx + bw or b[1] < by or b[3] > by + bh:
                score += 400
            for o in label_boxes + charge_boxes:
                ix = min(b[2], o[2]) - max(b[0], o[0])
                iy = min(b[3], o[3]) - max(b[1], o[1])
                if ix > 0 and iy > 0:
                    score += ix * iy + 1
            if score < best_score:
                best_score, best = score, (dx, dy)
                if score == 0:
                    break
        charge_boxes.append((a["x"] + best[0], a["y"] + best[1] - 9.4,
                             a["x"] + best[0] + 5.6, a["y"] + best[1] + 3.2))
        charge_layout[a["id"]] = (a["x"] + best[0], a["y"] + best[1])
    for a in asset["atoms"]:
        if a["el"] in ("O", "N", "S", "P"):
            out.append(f'<circle cx="{a["x"]:.1f}" cy="{a["y"]:.1f}" r="8.5" fill="{paper}"/>')
            el_fill = ATOM_COLORS.get(a["el"], ATOM_FALLBACK)
            out.append(f'<text x="{a["x"]:.1f}" y="{a["y"] + 3.2:.1f}" text-anchor="middle" '
                       f'data-element="{a["el"]}" data-element-color="{el_fill}" '
                       f'style="fill:{el_fill}" '
                       f'font-family="Helvetica, Arial, sans-serif" font-size="12" font-weight="700" fill="{el_fill}">{a["el"]}</text>')
        else:
            out.append(f'<circle cx="{a["x"]:.1f}" cy="{a["y"]:.1f}" r="1.8" fill="{hair}"/>')
        if a.get("label"):
            out.append(f'<text x="{a["x"] + 9:.1f}" y="{a["y"] - 5:.1f}" font-family="Helvetica, Arial, sans-serif" '
                       f'font-size="9.5" fill="{hair}">{a["label"]}</text>')
        if a.get("charge"):
            cx, cy = charge_layout[a["id"]]
            out.append(f'<text x="{cx:.1f}" y="{cy:.1f}" font-family="Helvetica, Arial, sans-serif" '
                       f'font-size="9.5" fill="{brick}">{a["charge"]}</text>')
    out.append("</svg>")
    return "\n".join(out), lines, base_bonds


def svg_viewbox_ok(svg):
    m = re.search(r'viewBox="([^"]+)"', svg)
    if not m:
        return False
    nums = [float(x) for x in m.group(1).split()]
    return len(nums) == 4 and nums[2] > 0 and nums[3] > 0


def make_2d(spec, template):
    m = Chem.Mol(template)
    AllChem.Compute2DCoords(m)
    conf = m.GetConformer()
    lens = []
    for b in m.GetBonds():
        p1, p2 = conf.GetAtomPosition(b.GetBeginAtomIdx()), conf.GetAtomPosition(b.GetEndAtomIdx())
        lens.append(math.hypot(p1.x - p2.x, p1.y - p2.y))
    # 单重原子分子（如 NH₃）没有键，median 无定义；此时不缩放，按默认尺度画点。
    med = statistics.median(lens) if lens else 1.0
    k = BOND_2D / med
    Chem.AssignStereochemistry(m, cleanIt=True, force=True)
    Chem.WedgeMolBonds(m, conf)
    pts = {i: (conf.GetAtomPosition(i).x * k, conf.GetAtomPosition(i).y * k) for i in range(m.GetNumAtoms())}
    minx = min(p[0] for p in pts.values())
    miny = min(p[1] for p in pts.values())
    w = max(pts[i][0] - minx for i in pts) + 120
    h = max(pts[i][1] - miny for i in pts) + 120
    view = {"w": max(V, int(math.ceil(w))), "h": max(H, int(math.ceil(h)))}
    atoms = []
    idx2id = {}
    for i, a in enumerate(m.GetAtoms()):
        aid = i + 1
        idx2id[i] = aid
        el = a.GetSymbol()
        ch = ""
        if a.GetFormalCharge() < 0:
            ch = "−" if a.GetFormalCharge() == -1 else f"{abs(a.GetFormalCharge())}−"
        elif a.GetFormalCharge() > 0:
            ch = "+"
        # 分块资产把 CoA 折线起点的碳直接标成「CoA 略」（覆盖 C5 这类编号标签）
        override = spec.get("label_atoms", {})
        if a.GetAtomMapNum() in override:
            label = override[a.GetAtomMapNum()]
        elif el == "C":
            label = f"C{a.GetAtomMapNum()}" if a.GetAtomMapNum() else ""
        elif el == "P":
            label = atom_name(a, m)  # P6 / P1 / P
        else:
            label = ""
        atoms.append({
            "id": aid, "el": el,
            "x": round(pts[i][0] - minx + 60, 1), "y": round(pts[i][1] - miny + 60, 1),
            "label": label, **({"charge": ch} if ch else {}),
        })
    bonds = []
    for b in m.GetBonds():
        order = 1 if b.GetBondType() == Chem.BondType.SINGLE else 2 if b.GetBondType() == Chem.BondType.DOUBLE else 3
        bonds.append({"a": idx2id[b.GetBeginAtomIdx()], "b": idx2id[b.GetEndAtomIdx()], "order": order})
    wedge = []
    for b in m.GetBonds():
        if b.GetBondDir() == Chem.BondDir.BEGINWEDGE:
            wedge.append({"a": idx2id[b.GetBeginAtomIdx()], "b": idx2id[b.GetEndAtomIdx()]})
    asset = {
        "frameId": f"{spec['id']}-2d", "kind": "2d",
        "generatedBy": "tools/gen-molecule-assets.py",
        "method": "RDKit 2D depiction（SMILES → 2D 坐标，非三维构象）",
        "provenance": {"kind": "computed", "note": "仅 2D 示意；不建 3D，不登记 PDB 候选"},
        "view": view,
        "atoms": atoms, "bonds": bonds, "wedge": wedge,
        "annotations": [{"x": 60, "y": view["h"] - 20,
                         "text": f"{spec['form']} · RDKit 由 SMILES 生成（2D 示意，非三维构象）"}],
    }
    svg, nlines, base_bonds = svg_2d(asset)
    return asset, svg, nlines, base_bonds


def build_3d(spec, template):
    if spec["src"]:
        mol3, mapping = build_experimental(spec, template)
        prov = {
            "kind": "experimental", "pdbId": spec["pdb"], "resolution": spec["res"],
            "method": spec["method"], "species": spec["species"],
            "chain": spec.get("chain"), "resname": spec.get("resname"),
            "protein": spec.get("protein"),
            "sdf": spec["src"],
            "note": (f"实验坐标：PDB {spec['pdb']} · 链 {spec.get('chain', '—')} · 配体 "
                     f"{spec.get('resname', '—')}（{spec['method']}，{spec['res']} Å，{spec['species']}）"
                     f"{('；' + spec['protein']) if spec.get('protein') else ''}。"
                     "与该配体实例的实测几何一致，标注为实验坐标。"),
        }
        mol_h = Chem.AddHs(mol3, addCoords=True)
        conformers = None
        energy = None
    else:
        mol3, prov = build_computed(spec, template)
        mol_h = Chem.AddHs(mol3, addCoords=True)
        conformers = prov["conformerCount"]
        energy = prov["energyKcalMol"]
    atoms = []
    for i, a in enumerate(mol3.GetAtoms()):
        p = mol3.GetConformer().GetAtomPosition(i)
        atoms.append({"id": i + 1, "el": a.GetSymbol(), "name": atom_name(a, mol3),
                      "x": round(p.x, 3), "y": round(p.y, 3), "z": round(p.z, 3),
                      **({"charge": a.GetFormalCharge()} if a.GetFormalCharge() else {})})
    bonds = []
    for b in mol3.GetBonds():
        order = 1 if b.GetBondType() == Chem.BondType.SINGLE else 2 if b.GetBondType() == Chem.BondType.DOUBLE else 3
        bonds.append({"a": b.GetBeginAtomIdx() + 1, "b": b.GetEndAtomIdx() + 1, "order": order})
    shape = shape_metrics(mol_h)
    asset = {
        "id": spec["id"], "name": spec["name"], "formula": spec["formula"],
        "smiles": spec["smiles"], "form": spec["form"],
        "molecularWeight": round(Descriptors.MolWt(template), 2),
        "provenance": prov, "shape": shape,
        "atoms": atoms, "bonds": bonds,
        "caveats": [spec["caveat"]],
        "generatedBy": "tools/gen-molecule-assets.py",
    }
    # 分块资产：数据里写明只画反应端、不是完整分子；并在 3D 画布上叠「CoA 略」标签
    if spec.get("fragment"):
        asset["fragment"] = spec["fragment"]
        asset["caveats"].append(spec["fragment"]["note"])
    if spec.get("coa_label_atom"):
        for a in mol3.GetAtoms():
            if a.GetAtomMapNum() == spec["coa_label_atom"]:
                asset["label"] = {"text": "CoA 略", "atomId": a.GetIdx() + 1}
                break
    return asset, conformers, energy


def generate(mols, two_d_ids, report_path, generated_at):
    report = []
    errors = []
    for spec in mols:
        stereo = parse_template(spec["smiles"], strict=True)
        flat = Chem.Mol(stereo)
        Chem.RemoveStereochemistry(flat)
        # --- 校验 1：分子式（对数据层记录值） ---
        if formula_of(flat) != spec["formula"]:
            errors.append(f"{spec['id']} 分子式不符：模板 {formula_of(flat)}，数据层 {spec['formula']}")
            continue
        # --- 校验 2：SMILES 往返（去原子映射号 → canonical → 再解析 → 同式） ---
        clean = Chem.Mol(flat)
        for a in clean.GetAtoms():
            a.SetAtomMapNum(0)
        can = Chem.MolToSmiles(clean, canonical=True)
        back = Chem.MolFromSmiles(can)
        if back is None or formula_of(back) != spec["formula"]:
            errors.append(f"{spec['id']} SMILES 往返失败")
            continue
        if can != Chem.MolToSmiles(Chem.MolFromSmiles(can), canonical=True):
            errors.append(f"{spec['id']} canonical SMILES 不稳定")
            continue
        # --- 只做 2D 的分子（CO₂ / HCO₃⁻）：3D 不建，报告里写原因，不塞假球 ---
        if spec.get("no3d"):
            if spec["id"] not in two_d_ids:
                errors.append(f"{spec['id']} 标记 no3d 但未列入 2D 生成清单")
                continue
            # 2D 也统一写 Kekulé 键级（1/2），避免芳香键 1.5 让 SVG 键线数对不上
            flat_k = Chem.Mol(flat)
            Chem.Kekulize(flat_k, clearAromaticFlags=True)
            asset2d, svg, svg_lines, svg_bonds = make_2d(spec, flat_k)
            path2d = os.path.join(OUT2D, f"{spec['id']}.json")
            order_sum = sum(b["order"] for b in asset2d["bonds"])
            if svg_bonds != len(asset2d["bonds"]) or svg_lines != order_sum:
                errors.append(f"{spec['id']} SVG 键线数与 JSON 键级展开不符")
            with open(path2d, "w", encoding="utf-8") as fh:
                json.dump(asset2d, fh, ensure_ascii=False, separators=(",", ":"))
            with open(os.path.join(OUT2D, f"{spec['id']}.svg"), "w", encoding="utf-8") as fh:
                fh.write(svg)
            entry = {
                "id": spec["id"], "name": spec["name"], "formula": spec["formula"],
                "canonicalSmiles": can, "mw": round(Descriptors.MolWt(flat), 2), "cip": "",
                "fragment": None, "provenance": "none", "no3dReason": spec["caveat"],
                "pdb": None, "resolution": None, "method": None, "species": None,
                "chain": None, "resname": None, "protein": None,
                "conformerCount": None, "energy": None,
                "atoms": flat.GetNumAtoms(), "bonds": flat.GetNumBonds(),
                "volume": None, "extent": None, "bytes3d": None,
                "bytes2d": os.path.getsize(path2d),
                "svgLines": svg_lines, "svgBytes": os.path.getsize(os.path.splitext(path2d)[0] + ".svg"),
                "source2d": "generated",
            }
            report.append(entry)
            print(f"✓ {spec['id']:<10} {'2D-only':<12} {spec['formula']:<12} 原子 {flat.GetNumAtoms()}（3D 未建）")
            continue
        # --- 3D ---
        a3, conf_n, energy = build_3d(spec, flat)
        a3["smiles"] = can
        a3["smilesWithAtomMap"] = spec["smiles"]
        coords = [(a["x"], a["y"], a["z"]) for a in a3["atoms"]]
        if not all(math.isfinite(v) for c in coords for v in c):
            errors.append(f"{spec['id']} 3D 坐标含非有限值")
        if len(a3["bonds"]) != flat.GetNumBonds():
            errors.append(f"{spec['id']} 键数不符：{len(a3['bonds'])} vs {flat.GetNumBonds()}")
        if a3["shape"]["vdwVolumeA3"] <= 50:
            errors.append(f"{spec['id']} 体积异常：{a3['shape']['vdwVolumeA3']}")
        if a3["provenance"]["kind"] == "computed" and (conf_n is None or conf_n < 20):
            errors.append(f"{spec['id']} 计算构象数不足 20（实际 {conf_n}）")
        # --- 2D ---
        svg_lines = None
        asset2d = None
        path2d = None
        if spec["id"] in two_d_ids:
            asset2d, svg, svg_lines, svg_bonds = make_2d(spec, flat)
            path2d = os.path.join(OUT2D, f"{spec['id']}.json")
            if asset2d["view"]["w"] <= 0 or asset2d["view"]["h"] <= 0:
                errors.append(f"{spec['id']} 2D viewBox 非法")
            # 每个 JSON 键都要有对应的 SVG 键线（双键多画一条，故只要求 >=；单键必须逐条对上）
            if svg_bonds != len(asset2d["bonds"]) or svg_lines < len(asset2d["bonds"]):
                errors.append(f"{spec['id']} SVG 键线数与 JSON 键数不符：{svg_bonds}/{svg_lines} vs {len(asset2d['bonds'])}")
            if not svg_viewbox_ok(svg):
                errors.append(f"{spec['id']} SVG viewBox 缺失/非法")
            with open(path2d, "w", encoding="utf-8") as fh:
                json.dump(asset2d, fh, ensure_ascii=False, separators=(",", ":"))
            with open(os.path.join(OUT2D, f"{spec['id']}.svg"), "w", encoding="utf-8") as fh:
                fh.write(svg)
        elif spec["id"] in LEGACY_2D:
            # 既有手绘 2D：只读 JSON 出 SVG，不覆盖画面（结构帧页依赖原文件）
            path2d = os.path.join(OUT2D, LEGACY_2D[spec["id"]])
            with open(path2d, encoding="utf-8") as fh:
                asset2d = json.load(fh)
            svg, svg_lines, svg_bonds = svg_2d(asset2d)
            if svg_bonds != len(asset2d["bonds"]) or svg_lines < len(asset2d["bonds"]):
                errors.append(f"{spec['id']} 既有 2D 的 SVG 键线数不足")
            if not svg_viewbox_ok(svg):
                errors.append(f"{spec['id']} 既有 2D 的 SVG viewBox 缺失/非法")
            with open(os.path.splitext(path2d)[0] + ".svg", "w", encoding="utf-8") as fh:
                fh.write(svg)
        # 写 3D
        p3 = os.path.join(OUT3D, f"{spec['id']}.json")
        with open(p3, "w", encoding="utf-8") as fh:
            json.dump(a3, fh, ensure_ascii=False, separators=(",", ":"))
        # CIP 必须在带立体化学的原模板上算（flat 已 RemoveStereochemistry，只会得到 ?）
        centers = Chem.FindMolChiralCenters(stereo, includeUnassigned=True, useLegacyImplementation=False)
        cip = ",".join(f"{atom_name(stereo.GetAtomWithIdx(idx), stereo)}:{lab}" for idx, lab in centers)
        if spec.get("expect_cip") and cip != spec["expect_cip"]:
            errors.append(f"{spec['id']} 手性中心不符：{cip} ≠ {spec['expect_cip']}")
        entry = {
            "id": spec["id"], "name": spec["name"], "formula": spec["formula"],
            "canonicalSmiles": can, "mw": a3["molecularWeight"], "cip": cip,
            "fragment": spec.get("fragment", {}).get("kind") if spec.get("fragment") else None,
            "provenance": a3["provenance"]["kind"],
            "pdb": a3["provenance"].get("pdbId"), "resolution": a3["provenance"].get("resolution"),
            "method": a3["provenance"].get("method"), "species": a3["provenance"].get("species"),
            "chain": a3["provenance"].get("chain"), "resname": a3["provenance"].get("resname"),
            "protein": a3["provenance"].get("protein"),
            "conformerCount": conf_n, "energy": energy,
            "atoms": len(a3["atoms"]), "bonds": len(a3["bonds"]),
            "volume": a3["shape"]["vdwVolumeA3"], "extent": a3["shape"]["maxExtentA"],
            "bytes3d": os.path.getsize(p3),
            "bytes2d": os.path.getsize(path2d) if path2d else None,
            "svgLines": svg_lines,
            "svgBytes": os.path.getsize(os.path.splitext(path2d)[0] + ".svg") if path2d else None,
            "source2d": "generated" if spec["id"] in two_d_ids else "legacy",
        }
        report.append(entry)
        print(f"✓ {spec['id']:<10} {a3['provenance']['kind']:<12} {spec['formula']:<12} "
              f"V={entry['volume']:>7.1f} Å³  轴长={entry['extent']:>5.1f} Å  原子 {len(a3['atoms'])}")
    with open(report_path, "w", encoding="utf-8") as fh:
        json.dump({"generatedAt": generated_at, "molecules": report, "errors": errors}, fh,
                  ensure_ascii=False, indent=2)
    if errors:
        print("\n✗ 校验失败：")
        for e in errors:
            print("  -", e)
        sys.exit(1)
    print(f"\n全部通过：{len(report)} 个分子；报告 {report_path}")


def svg_only():
    """只按现有 2D JSON 重绘 SVG（配色改动专用）：不改 JSON、不改 3D、不重算坐标。"""
    names = sorted(fn for fn in os.listdir(OUT2D) if fn.endswith(".json") and fn != "demo-gap.json")
    errors = []
    for fn in names:
        path = os.path.join(OUT2D, fn)
        with open(path, encoding="utf-8") as fh:
            asset = json.load(fh)
        svg, lines, bonds = svg_2d(asset)
        if bonds != len(asset["bonds"]) or lines < len(asset["bonds"]):
            errors.append(f"{fn} SVG 键线数与 JSON 键数不符")
            continue
        if not svg_viewbox_ok(svg):
            errors.append(f"{fn} SVG viewBox 缺失/非法")
            continue
        with open(os.path.splitext(path)[0] + ".svg", "w", encoding="utf-8") as fh:
            fh.write(svg)
    if errors:
        print("\n✗ 校验失败：")
        for e in errors:
            print("  -", e)
        sys.exit(1)
    print(f"仅重绘 SVG：{len(names)} 个文件（JSON / 3D 未改动）")


KETONE_MOLS = [
    dict(id="acacoa", name="乙酰乙酰-CoA（片段：乙酰乙酰-硫酯）", formula="C5H8O2S",
         smiles="CC(=O)CC(=O)SC", src=None, sdf=None, no3d=True,
         form="乙酰乙酰-CoA（C4 二羰基单元 + 硫酯 S；CoA 长链略）",
         caveat="按项目既有片段口径只画 C4 二羰基单元与硫酯 S（CoA 略），不建 3D。"),
    dict(id="hmgcoa", name="HMG-CoA（片段：3-羟基-3-甲基戊二酰-硫酯）", formula="C7H11O4S",
         smiles="[O-]C(=O)CC(O)(C)CC(=O)SC", src=None, sdf=None, no3d=True,
         form="HMG-CoA（C6 羟甲基戊二酰单元 + 硫酯 S；羧基按 pH 7.4 电离，CoA 略）",
         caveat="按项目既有片段口径只画 C6 羟甲基戊二酰单元与硫酯 S（CoA 略），不建 3D。"),
    dict(id="acetoacetate", name="乙酰乙酸（乙酰乙酸根）", formula="C4H5O3",
         smiles="CC(=O)CC(=O)[O-]", src=None, sdf=None, no3d=True,
         form="乙酰乙酸（β-酮酸；羧基按 pH 7.4 电离）",
         caveat="酮体按项目本轮口径只做 2D，不建 3D。"),
    dict(id="bhb", name="β-羟丁酸（D-3-羟丁酸根）", formula="C4H7O3",
         smiles="CC(O)CC(=O)[O-]", src=None, sdf=None, no3d=True,
         form="β-羟丁酸（β-羟基酸；羧基按 pH 7.4 电离）",
         caveat="酮体按项目本轮口径只做 2D，不建 3D。"),
    dict(id="acetone", name="丙酮", formula="C3H6O",
         smiles="CC(=O)C", src=None, sdf=None, no3d=True,
         form="丙酮（挥发性酮，随呼气/尿液排出）",
         caveat="酮体按项目本轮口径只做 2D，不建 3D。"),
]
KETONE_2D_IDS = {spec["id"] for spec in KETONE_MOLS}

# 一碳单位（PLATE 14）：仅补 2D，不生成 3D，不登记 PDB 候选。
# 蝶啶环系 + PABA–Glu 尾链的 THF 各氧化级不做近似结构：SMILES 逐原子核验未完成，
# 本轮如实留空，结构页对应块标注“本平台未建 2D 资产”，不凑数。
ONE_CARBON_2D_MOLS = [
    dict(id="gly", name="甘氨酸（Gly）", formula="C2H4NO2",
         smiles="NCC(=O)[O-]", src=None, sdf=None, no3d=True,
         form="甘氨酸（α-氨基未质子化写法；羧基按 pH 7.4 电离）",
         caveat="本轮仅补 2D；一碳单位按项目口径只做 2D，不建 3D。"),
    dict(id="met", name="L-甲硫氨酸（Met）", formula="C5H11NO2S",
         smiles="CSCCC([NH3+])C(=O)[O-]", src=None, sdf=None, no3d=True,
         form="L-甲硫氨酸两性离子（净电荷 0）",
         caveat="本轮仅补 2D；一碳单位按项目口径只做 2D，不建 3D。"),
    dict(id="sam", name="S-腺苷甲硫氨酸（SAM）", formula="C15H23N6O5S",
         smiles="C[S+](CCC([NH3+])C(=O)[O-])C1OC(CO)C(O)C1n2cnc3c(N)ncnc32", src=None, sdf=None, no3d=True,
         form="SAM 锍离子 + 质子化 α-氨基（净电荷 +1；生理 pH 下的书写近似）",
         caveat="本轮仅补 2D；甲基供体按项目口径只做 2D，不建 3D。"),
    dict(id="sah", name="S-腺苷同型半胱氨酸（SAH）", formula="C14H20N6O5S",
         smiles="S(CCC([NH3+])C(=O)[O-])C1OC(CO)C(O)C1n2cnc3c(N)ncnc32", src=None, sdf=None, no3d=True,
         form="SAH 两性离子（硫醚不带电；净电荷 0）",
         caveat="本轮仅补 2D；一碳单位按项目口径只做 2D，不建 3D。"),
    dict(id="ado", name="腺苷（Adenosine）", formula="C10H13N5O4",
         smiles="Nc1ncnc2c1ncn2C3OC(CO)C(O)C3O", src=None, sdf=None, no3d=True,
         form="腺苷（中性核糖核苷；不画磷酸基）",
         caveat="本轮仅补 2D；一碳单位按项目口径只做 2D，不建 3D。"),
]
ONE_CARBON_2D_IDS = {spec["id"] for spec in ONE_CARBON_2D_MOLS}

# 嘧啶核苷酸（PLATE 15）：仅补 2D；CPS2 起始到 dTMP 的 11 个新资产。
# 氨甲酰磷酸 / 天冬氨酸 / UDP / UTP 复用既有资产；叶酸两种形式本轮仍不建 2D，理由同一碳单位。
PYRIMIDINE_2D_MOLS = [
    dict(id="caasp", name="N-氨甲酰天冬氨酸", formula="C5H8N2O5",
         smiles="NC(=O)NC(CC(=O)O)C(=O)O", src=None, sdf=None, no3d=True,
         form="N-氨甲酰天冬氨酸（中性写法）",
         caveat="本轮仅补 2D；嘧啶核苷酸按项目口径只做 2D，不建 3D。"),
    dict(id="dho", name="二氢乳清酸", formula="C5H6N2O4",
         smiles="O=C1NC(=O)CC(C(=O)O)N1", src=None, sdf=None, no3d=True,
         form="二氢乳清酸（6-羧基-5,6-二氢尿嘧啶，中性写法）",
         caveat="本轮仅补 2D；嘧啶核苷酸按项目口径只做 2D，不建 3D。"),
    dict(id="oro", name="乳清酸", formula="C5H4N2O4",
         smiles="O=C1NC(=O)C=C(C(=O)O)N1", src=None, sdf=None, no3d=True,
         form="乳清酸（6-羧基尿嘧啶，中性写法）",
         caveat="本轮仅补 2D；嘧啶核苷酸按项目口径只做 2D，不建 3D。"),
    dict(id="prpp", name="磷酸核糖焦磷酸（PRPP）", formula="C5H13O14P3",
         smiles="O=P(O)(O)OCC1OC(OP(=O)(O)OP(=O)(O)O)C(O)C1O", src=None, sdf=None, no3d=True,
         form="PRPP 全质子化写法（生理 pH 下多级电离，结构式按中性画）",
         caveat="本轮仅补 2D；嘧啶核苷酸按项目口径只做 2D，不建 3D。"),
    dict(id="omp", name="乳清酸核苷酸（OMP）", formula="C10H13N2O11P",
         smiles="O=C1NC(=O)C=C(C(=O)O)N1C2OC(COP(=O)(O)O)C(O)C2O", src=None, sdf=None, no3d=True,
         form="OMP 全质子化写法（磷酸按中性画）",
         caveat="本轮仅补 2D；嘧啶核苷酸按项目口径只做 2D，不建 3D。"),
    dict(id="ump", name="尿苷一磷酸（UMP）", formula="C9H13N2O9P",
         smiles="O=c1cc[nH]c(=O)n1C2OC(COP(=O)(O)O)C(O)C2O", src=None, sdf=None, no3d=True,
         form="UMP 全质子化写法（磷酸按中性画）",
         caveat="本轮仅补 2D；嘧啶核苷酸按项目口径只做 2D，不建 3D。"),
    dict(id="ctp", name="胞苷三磷酸（CTP）", formula="C9H16N3O14P3",
         smiles="Nc1ccn(C2OC(COP(=O)(O)OP(=O)(O)OP(=O)(O)O)C(O)C2O)c(=O)n1", src=None, sdf=None, no3d=True,
         form="CTP 全质子化写法（三磷酸按中性画）",
         caveat="本轮仅补 2D；嘧啶核苷酸按项目口径只做 2D，不建 3D。"),
    dict(id="dudp", name="脱氧尿苷二磷酸（dUDP）", formula="C9H14N2O11P2",
         smiles="O=c1cc[nH]c(=O)n1C1CC(O)C(COP(=O)(O)OP(=O)(O)O)O1", src=None, sdf=None, no3d=True,
         form="dUDP 全质子化写法（二磷酸按中性画）",
         caveat="本轮仅补 2D；嘧啶核苷酸按项目口径只做 2D，不建 3D。"),
    dict(id="dutp", name="脱氧尿苷三磷酸（dUTP）", formula="C9H15N2O14P3",
         smiles="O=c1cc[nH]c(=O)n1C1CC(O)C(COP(=O)(O)OP(=O)(O)OP(=O)(O)O)O1", src=None, sdf=None, no3d=True,
         form="dUTP 全质子化写法（三磷酸按中性画）",
         caveat="本轮仅补 2D；嘧啶核苷酸按项目口径只做 2D，不建 3D。"),
    dict(id="dump", name="脱氧尿苷一磷酸（dUMP）", formula="C9H13N2O8P",
         smiles="O=c1cc[nH]c(=O)n1C1CC(O)C(COP(=O)(O)O)O1", src=None, sdf=None, no3d=True,
         form="dUMP 全质子化写法（磷酸按中性画）",
         caveat="本轮仅补 2D；嘧啶核苷酸按项目口径只做 2D，不建 3D。"),
    dict(id="dtmp", name="脱氧胸苷一磷酸（dTMP）", formula="C10H15N2O8P",
         smiles="Cc1cn(C2CC(O)C(COP(=O)(O)O)O2)c(=O)[nH]c1=O", src=None, sdf=None, no3d=True,
         form="dTMP 全质子化写法（磷酸按中性画）",
         caveat="本轮仅补 2D；嘧啶核苷酸按项目口径只做 2D，不建 3D。"),
]
PYRIMIDINE_2D_IDS = {spec["id"] for spec in PYRIMIDINE_2D_MOLS}

# 嘌呤核苷酸（PLATE 16）：仅补 2D；从 PRA 到腺苷酸琥珀酸的 14 个新资产。
# R5P / PRPP / Gly / Gln / Glu / Fum / CO2 复用既有资产；THF 与 10-甲酰THF 不建 2D，理由同一碳单位。
PURINE_2D_MOLS = [
    dict(id="pra", name="5-磷酸核糖胺（PRA）", formula="C5H12NO7P",
         smiles="N[C@@H]1O[C@H](COP(=O)(O)O)[C@@H](O)[C@H]1O", src=None, sdf=None, no3d=True,
         form="中性写法",
         caveat="本轮仅补 2D；嘌呤核苷酸按项目口径只做 2D，不建 3D。"),
    dict(id="gar", name="甘氨酰胺核苷酸（GAR）", formula="C7H15N2O8P",
         smiles="NCC(=O)N[C@@H]1O[C@H](COP(=O)(O)O)[C@@H](O)[C@H]1O", src=None, sdf=None, no3d=True,
         form="中性写法",
         caveat="本轮仅补 2D；嘌呤核苷酸按项目口径只做 2D，不建 3D。"),
    dict(id="fgar", name="甲酰甘氨酰胺核苷酸（FGAR）", formula="C8H15N2O9P",
         smiles="O=CNCC(=O)N[C@@H]1O[C@H](COP(=O)(O)O)[C@@H](O)[C@H]1O", src=None, sdf=None, no3d=True,
         form="中性写法",
         caveat="本轮仅补 2D；嘌呤核苷酸按项目口径只做 2D，不建 3D。"),
    dict(id="fgam", name="甲酰甘氨脒核苷酸（FGAM）", formula="C8H16N3O8P",
         smiles="O=CNCC(=N)N[C@@H]1O[C@H](COP(=O)(O)O)[C@@H](O)[C@H]1O", src=None, sdf=None, no3d=True,
         form="中性写法",
         caveat="本轮仅补 2D；嘌呤核苷酸按项目口径只做 2D，不建 3D。"),
    dict(id="air", name="5-氨基咪唑核苷酸（AIR）", formula="C8H14N3O7P",
         smiles="Nc1ncn([C@@H]2O[C@H](COP(=O)(O)O)[C@@H](O)[C@H]2O)c1", src=None, sdf=None, no3d=True,
         form="中性写法",
         caveat="本轮仅补 2D；嘌呤核苷酸按项目口径只做 2D，不建 3D。"),
    dict(id="cair", name="5-氨基咪唑-4-羧酸核苷酸（CAIR）", formula="C9H14N3O9P",
         smiles="Nc1c(C(=O)O)ncn1[C@@H]2O[C@H](COP(=O)(O)O)[C@@H](O)[C@H]2O", src=None, sdf=None, no3d=True,
         form="中性写法",
         caveat="本轮仅补 2D；嘌呤核苷酸按项目口径只做 2D，不建 3D。"),
    dict(id="saicar", name="腺苷酸琥珀酸甲酰胺核苷酸（SAICAR）", formula="C13H19N4O12P",
         smiles="O=C(O)C[C@@H](NC(=O)c1c(N)ncn1[C@@H]1O[C@H](COP(=O)(O)O)[C@@H](O)[C@H]1O)C(=O)O", src=None, sdf=None, no3d=True,
         form="中性写法",
         caveat="本轮仅补 2D；嘌呤核苷酸按项目口径只做 2D，不建 3D。"),
    dict(id="aicar", name="5-氨基咪唑-4-甲酰胺核苷酸（AICAR）", formula="C9H15N4O8P",
         smiles="NC(=O)c1c(N)ncn1[C@@H]1O[C@H](COP(=O)(O)O)[C@@H](O)[C@H]1O", src=None, sdf=None, no3d=True,
         form="中性写法",
         caveat="本轮仅补 2D；嘌呤核苷酸按项目口径只做 2D，不建 3D。"),
    dict(id="faicar", name="5-甲酰胺基咪唑-4-甲酰胺核苷酸（FAICAR）", formula="C10H15N4O9P",
         smiles="O=CNC(=O)c1c(N)ncn1[C@@H]1O[C@H](COP(=O)(O)O)[C@@H](O)[C@H]1O", src=None, sdf=None, no3d=True,
         form="中性写法",
         caveat="本轮仅补 2D；嘌呤核苷酸按项目口径只做 2D，不建 3D。"),
    dict(id="imp", name="次黄苷酸（IMP）", formula="C10H13N4O8P",
         smiles="O=c1[nH]cnc2c1ncn2[C@@H]1O[C@H](COP(=O)(O)O)[C@@H](O)[C@H]1O", src=None, sdf=None, no3d=True,
         form="中性写法",
         caveat="本轮仅补 2D；嘌呤核苷酸按项目口径只做 2D，不建 3D。"),
    dict(id="amp", name="腺苷一磷酸（AMP）", formula="C10H14N5O7P",
         smiles="Nc1ncnc2c1ncn2[C@@H]1O[C@H](COP(=O)(O)O)[C@@H](O)[C@H]1O", src=None, sdf=None, no3d=True,
         form="中性写法",
         caveat="本轮仅补 2D；嘌呤核苷酸按项目口径只做 2D，不建 3D。"),
    dict(id="gmp", name="鸟苷一磷酸（GMP）", formula="C10H14N5O8P",
         smiles="Nc1nc2c(ncn2[C@@H]2O[C@H](COP(=O)(O)O)[C@@H](O)[C@H]2O)c(=O)[nH]1", src=None, sdf=None, no3d=True,
         form="中性写法",
         caveat="本轮仅补 2D；嘌呤核苷酸按项目口径只做 2D，不建 3D。"),
    dict(id="xmp", name="黄苷酸（XMP）", formula="C10H13N4O9P",
         smiles="O=c1[nH]c2c(ncn2[C@@H]2O[C@H](COP(=O)(O)O)[C@@H](O)[C@H]2O)c(=O)[nH]1", src=None, sdf=None, no3d=True,
         form="中性写法",
         caveat="本轮仅补 2D；嘌呤核苷酸按项目口径只做 2D，不建 3D。"),
    dict(id="asuc", name="腺苷酸琥珀酸", formula="C14H18N5O11P",
         smiles="O=C(O)C[C@@H](Nc1ncnc2c1ncn2[C@@H]1O[C@H](COP(=O)(O)O)[C@@H](O)[C@H]1O)C(=O)O", src=None, sdf=None, no3d=True,
         form="中性写法",
         caveat="本轮仅补 2D；嘌呤核苷酸按项目口径只做 2D，不建 3D。"),
]
PURINE_2D_IDS = {spec["id"] for spec in PURINE_2D_MOLS}

# 甘油磷脂与鞘脂（PLATE 17）：仅补 4 个小分子 2D；脂质含可变酰基链，不建 2D/3D。
# 甘油-3-磷酸、胆碱、乙醇胺、肌醇为新增；acylcoa-c16 / ctp / ser / sam / sah / co2 复用既有资产。
GLYCEROLIPID_2D_MOLS = [
    dict(id="g3p", name="甘油-3-磷酸（G3P）", formula="C3H9O6P",
         smiles="OCC(O)COP(=O)(O)O", src=None, sdf=None, no3d=True,
         form="中性写法",
         caveat="本轮仅补 2D；甘油磷脂图按项目口径只做 2D，不建 3D。"),
    dict(id="choline", name="胆碱", formula="C5H14NO",
         smiles="C[N+](C)(C)CCO", src=None, sdf=None, no3d=True,
         form="阳离子写法",
         caveat="本轮仅补 2D；胆碱以季铵阳离子形式存在，不建 3D。"),
    dict(id="ethanolamine", name="乙醇胺", formula="C2H7NO",
         smiles="NCCO", src=None, sdf=None, no3d=True,
         form="中性写法",
         caveat="本轮仅补 2D；乙醇胺按中性游离碱写，不建 3D。"),
    dict(id="inositol", name="肌醇", formula="C6H12O6",
         smiles="OC1[C@H](O)[C@@H](O)[C@H](O)[C@@H](O)[C@@H]1O", src=None, sdf=None, no3d=True,
         form="myo-肌醇写法",
         caveat="本轮仅补 2D；肌醇按 myo 构型写，不建 3D。"),
]
GLYCEROLIPID_2D_IDS = {spec["id"] for spec in GLYCEROLIPID_2D_MOLS}



def main():
    ap = argparse.ArgumentParser(description="离线生成分子 2D/3D 资产")
    ap.add_argument("--pathway", choices=["glycolysis", "tca", "ppp", "gluconeogenesis", "fao", "urea", "fas", "glycogen", "amino", "cholesterol", "ketone", "one-carbon", "pyrimidine", "purine", "glycerolipid"], default="glycolysis",
                    help="默认 glycolysis（保持原报告路径与行为）；tca/ppp/gluconeogenesis/fao/urea/fas 写独立报告")
    ap.add_argument("--svg-only", action="store_true",
                    help="只按现有 2D JSON 重绘 SVG（配色专用，幂等）")
    args = ap.parse_args()
    if args.svg_only:
        svg_only()
        return
    if args.pathway == "tca":
        generate(TCA_MOLS, TCA_TWO_D_IDS,
                 os.path.join(ROOT, "preview", "tca-molecule-assets-report.json"),
                 "2026-11-03 · TCA")
    elif args.pathway == "ppp":
        generate(PPP_MOLS, PPP_TWO_D_IDS,
                 os.path.join(ROOT, "preview", "ppp-molecule-assets-report.json"),
                 "2026-11-04 · PPP")
    elif args.pathway == "gluconeogenesis":
        generate(GN_MOLS, GN_TWO_D_IDS,
                 os.path.join(ROOT, "preview", "gluconeogenesis-molecule-assets-report.json"),
                 "2026-11-04 · 糖异生")
    elif args.pathway == "fao":
        generate(FAO_MOLS, FAO_TWO_D_IDS,
                 os.path.join(ROOT, "preview", "fao-molecule-assets-report.json"),
                 "2026-11-05 · β-氧化")
    elif args.pathway == "urea":
        generate(UREA_MOLS, UREA_IDS,
                 os.path.join(ROOT, "preview", "urea-molecule-assets-report.json"),
                 "2026-11-05 · 尿素循环")
    elif args.pathway == "ketone":
        generate(KETONE_MOLS, KETONE_2D_IDS,
                 os.path.join(ROOT, "preview", "ketone-molecule-assets-report.json"),
                 "2026-11-08 · 酮体")
    elif args.pathway == "fas":
        generate(FAS_MOLS, FAS_IDS,
                 os.path.join(ROOT, "preview", "fas-molecule-assets-report.json"),
                 "2026-11-05 · 脂肪酸合成")
    elif args.pathway == "glycogen":
        generate(GLYCOGEN_2D_MOLS, GLYCOGEN_2D_IDS,
                 os.path.join(ROOT, "preview", "glycogen-2d-assets-report.json"),
                 "2026-11-05 · 糖原（仅 2D）")
    elif args.pathway == "amino":
        generate(AMINO_2D_MOLS, AMINO_2D_IDS,
                 os.path.join(ROOT, "preview", "amino-2d-assets-report.json"),
                 "2026-11-05 · 氨基酸代谢（仅 2D）")
    elif args.pathway == "cholesterol":
        generate(CHOLESTEROL_2D_MOLS, CHOLESTEROL_2D_IDS,
                 os.path.join(ROOT, "preview", "cholesterol-2d-assets-report.json"),
                 "2026-11-05 · 胆固醇合成（仅 2D）")
    elif args.pathway == "one-carbon":
        generate(ONE_CARBON_2D_MOLS, ONE_CARBON_2D_IDS,
                 os.path.join(ROOT, "preview", "one-carbon-2d-assets-report.json"),
                 "2026-11-09 · 一碳单位（仅 2D）")
    elif args.pathway == "pyrimidine":
        generate(PYRIMIDINE_2D_MOLS, PYRIMIDINE_2D_IDS,
                 os.path.join(ROOT, "preview", "pyrimidine-2d-assets-report.json"),
                 "2026-11-09 · 嘧啶核苷酸（仅 2D）")
    elif args.pathway == "purine":
        generate(PURINE_2D_MOLS, PURINE_2D_IDS,
                 os.path.join(ROOT, "preview", "purine-2d-assets-report.json"),
                 "2026-11-09 · 嘌呤核苷酸（仅 2D）")
    elif args.pathway == "glycerolipid":
        generate(GLYCEROLIPID_2D_MOLS, GLYCEROLIPID_2D_IDS,
                 os.path.join(ROOT, "preview", "glycerolipid-2d-assets-report.json"),
                 "2026-11-09 · 甘油磷脂与鞘脂（仅 2D）")
    else:
        generate(MOLS, TWO_D_IDS, REPORT, "2026-11-03")


if __name__ == "__main__":
    main()
