# 临时脚本：从 RCSB ideal SDF 推导配体 canonical SMILES / 分子式 / 手性
import os, urllib.request
from rdkit import Chem
from rdkit.Chem import rdMolDescriptors

CACHE = "tools/cache/ideal"
os.makedirs(CACHE, exist_ok=True)

COMPS = ["BG6", "6PG", "5RP", "R5P", "E4P", "S7P", "FBP", "F6P", "PYR", "LAC", "ALA", "GLU", "BCT", "CO2"]
for c in COMPS:
    p = os.path.join(CACHE, f"{c}_ideal.sdf")
    if not os.path.exists(p):
        with urllib.request.urlopen(f"https://files.rcsb.org/ligands/download/{c}_ideal.sdf", timeout=60) as r, open(p, "wb") as f:
            f.write(r.read())
    m = Chem.MolFromMolFile(p, removeHs=True, sanitize=True)
    if m is None:
        print(c, "PARSE FAIL")
        continue
    Chem.AssignStereochemistry(m, cleanIt=True, force=True)
    smi = Chem.MolToSmiles(m, canonical=True, isomericSmiles=True)
    formula = rdMolDescriptors.CalcMolFormula(m)
    centers = Chem.FindMolChiralCenters(m, includeUnassigned=True, useLegacyImplementation=False)
    print(f"{c} | {formula} | {smi} | CIP {centers}")
