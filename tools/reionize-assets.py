"""把现有 3D / 2D 分子资产统一到 pH 7.4 电离态口径。

设计要点：
- 3D 资产只存重原子坐标：本脚本从现有 JSON 的原子/键表重建分子，按官能团
  规则设置形式电荷，再用 AddHs(addCoords=True) 补氢并重算体积/主轴。
  因此重原子坐标与原子顺序完全不变，不做 ETKDG 重嵌入。
- 2D 资产只重生成“电荷显示需要变化”的非 legacy 分子；gap / bpg13 / pyr 的
  手绘资产本轮不改（已经在磷酸/羧基位置画出正确电荷）。
- 与 tools/gen-molecule-assets.py 的分子表共享同一套 SMILES/formula；
  gen 表已同步，未来全量重跑也能得到相同口径。
"""
import importlib.util
import json
import os
import re
import sys

from rdkit import Chem
from rdkit.Chem import Descriptors, rdMolDescriptors

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ASSET3D = os.path.join(ROOT, "public", "assets", "ligands3d")
ASSET2D = os.path.join(ROOT, "public", "assets", "structures", "2d")


def load_gen():
    spec = importlib.util.spec_from_file_location(
        "gen_molecule_assets", os.path.join(ROOT, "tools", "gen-molecule-assets.py"))
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


GEN = load_gen()

# 本轮需要改变电离态的 3D 资产（其余资产已经是目标口径，保持不动）
TARGET3D = {
    "2pg", "3pg", "6pg", "6pg-l", "6pgl", "dhap", "e4p", "gap", "pep", "r5p",
    "ru5p", "ru5p-i", "s7p", "xu5p", "g6p-g6pd", "oaa", "cit", "icit", "akg",
    "suc", "fum", "mal", "fa", "pyr", "pyr-gn", "lac", "succoa", "bpg13", "glu",
}

# 需要重生成的 2D 资产（legacy：gap / bpg13 / pyr 已正确，不动）
TWOD_REGEN = {
    "dhap", "3pg", "2pg", "pep",
    "6pgl", "6pg", "6pg-l", "ru5p", "ru5p-i", "r5p", "xu5p", "s7p", "e4p",
    "oaa", "cit", "icit", "akg", "suc", "fum", "mal", "succoa",
    "lac", "glu", "fa",
}

SPEC_BY_ID = {}
for mols in (GEN.MOLS, GEN.TCA_MOLS, GEN.PPP_MOLS, GEN.GN_MOLS, GEN.FAO_MOLS):
    for spec in mols:
        SPEC_BY_ID[spec["id"]] = spec


def formula_of(m):
    return re.sub(r"[+-]\d*$", "", rdMolDescriptors.CalcMolFormula(m))


def charge_text(q):
    if q == -1:
        return "−"
    if q == 1:
        return "+"
    if q < -1:
        return f"{abs(q)}−"
    if q > 1:
        return f"{q}+"
    return ""


def mol_from_asset(asset):
    rw = Chem.RWMol()
    for a in asset["atoms"]:
        at = Chem.Atom(a["el"])
        if a.get("charge"):
            ch = str(a["charge"])
            if ch == "−":
                at.SetFormalCharge(-1)
            elif ch == "+":
                at.SetFormalCharge(1)
            elif "−" in ch:
                at.SetFormalCharge(-int(ch.replace("−", "")))
            elif "+" in ch:
                at.SetFormalCharge(int(ch.replace("+", "")))
            else:
                at.SetFormalCharge(int(ch))
        rw.AddAtom(at)
    for b in asset["bonds"]:
        bt = {1: Chem.BondType.SINGLE, 2: Chem.BondType.DOUBLE, 3: Chem.BondType.TRIPLE}[b["order"]]
        rw.AddBond(b["a"] - 1, b["b"] - 1, bt)
    m = rw.GetMol()
    conf = Chem.Conformer(m.GetNumAtoms())
    for i, a in enumerate(asset["atoms"]):
        conf.SetAtomPosition(i, (a["x"], a["y"], a["z"]))
    m.AddConformer(conf)
    Chem.SanitizeMol(m)
    return m


def ionize(m, amino_acid=False):
    """按 pH 7.4 规则设置形式电荷，返回被设置的原子索引。

    - 磷酸单酯 / 酰基磷酸混酐 / 烯醇磷酸：P 上两个端基单键 O → −1（每个 P）
    - 羧酸：C(=O)O 中只与羰基碳相连的单键 O → −1（每个羧基）
    - 氨基酸（仅谷氨酸）：α-氨基 N → +1（丙氨酸净电荷 0，按电中性简式保留）
    """
    charged = set()
    for a in m.GetAtoms():
        if a.GetSymbol() != "P":
            continue
        for nb in a.GetNeighbors():
            if (nb.GetSymbol() == "O"
                    and m.GetBondBetweenAtoms(a.GetIdx(), nb.GetIdx()).GetBondType() == Chem.BondType.SINGLE
                    and not any(x.GetSymbol() == "C" for x in nb.GetNeighbors())):
                nb.SetFormalCharge(-1)
                charged.add(nb.GetIdx())
    for a in m.GetAtoms():
        if a.GetSymbol() != "C":
            continue
        os_ = [nb for nb in a.GetNeighbors() if nb.GetSymbol() == "O"]
        dbl = [o for o in os_ if m.GetBondBetweenAtoms(a.GetIdx(), o.GetIdx()).GetBondType() == Chem.BondType.DOUBLE]
        sgl = [o for o in os_ if m.GetBondBetweenAtoms(a.GetIdx(), o.GetIdx()).GetBondType() == Chem.BondType.SINGLE
               and not any(x.GetIdx() != a.GetIdx() for x in o.GetNeighbors())]
        if dbl and sgl:
            for o in sgl:
                o.SetFormalCharge(-1)
                charged.add(o.GetIdx())
    if amino_acid:
        for a in m.GetAtoms():
            if a.GetSymbol() == "N" and a.GetDegree() == 1:
                a.SetFormalCharge(1)
                charged.add(a.GetIdx())
    Chem.SanitizeMol(m)
    return charged


def round_asset(asset, m, charged):
    atoms = []
    for i, a in enumerate(asset["atoms"]):
        item = dict(a)
        item.pop("charge", None)
        q = m.GetAtomWithIdx(i).GetFormalCharge()
        if q:
            item["charge"] = charge_text(q)
        atoms.append(item)
    asset["atoms"] = atoms
    asset["formula"] = formula_of(m)
    asset["smiles"] = Chem.MolToSmiles(m, canonical=True)
    spec = SPEC_BY_ID.get(asset["id"])
    if spec:
        asset["smilesWithAtomMap"] = spec["smiles"]
        asset["form"] = spec["form"]
    asset["molecularWeight"] = round(Descriptors.MolWt(m), 2)
    mh = Chem.AddHs(m, addCoords=True)
    asset["shape"] = GEN.shape_metrics(mh)
    return asset


def regen_2d(mid):
    spec = SPEC_BY_ID[mid]
    template = Chem.MolFromSmiles(spec["smiles"])
    if template is None:
        raise SystemExit(f"{mid}: 无法解析 SMILES {spec['smiles']}")
    asset2d, svg, nlines, base_bonds = GEN.make_2d(spec, template)
    if base_bonds != len(asset2d["bonds"]) or nlines < len(asset2d["bonds"]):
        raise SystemExit(f"{mid}: 2D SVG 键线数与 JSON 键数不符")
    with open(os.path.join(ASSET2D, f"{mid}.json"), "w", encoding="utf-8") as fh:
        json.dump(asset2d, fh, ensure_ascii=False, separators=(",", ":"))
    with open(os.path.join(ASSET2D, f"{mid}.svg"), "w", encoding="utf-8") as fh:
        fh.write(svg)


def main():
    changed = []
    errors = []
    for mid in sorted(TARGET3D):
        path = os.path.join(ASSET3D, f"{mid}.json")
        if not os.path.exists(path):
            errors.append(f"缺少 3D 资产：{mid}")
            continue
        asset = json.load(open(path, encoding="utf-8"))
        spec = SPEC_BY_ID.get(mid)
        if not spec:
            errors.append(f"gen 分子表缺少：{mid}")
            continue
        m = mol_from_asset(asset)
        ionize(m, amino_acid=(mid == "glu"))
        expect = spec["formula"]
        got = formula_of(m)
        if got != expect:
            errors.append(f"{mid}: 电离后分子式 {got} ≠ 数据层 {expect}")
            continue
        before = (asset.get("formula"), asset.get("smiles"), asset["shape"]["vdwVolumeA3"])
        asset = round_asset(asset, m, set())
        after = (asset["formula"], asset["smiles"], asset["shape"]["vdwVolumeA3"])
        with open(path, "w", encoding="utf-8") as fh:
            json.dump(asset, fh, ensure_ascii=False)
        changed.append((mid, before, after))
        if mid in TWOD_REGEN:
            regen_2d(mid)
    if errors:
        print("\n".join(errors), file=sys.stderr)
        raise SystemExit(1)
    print(f"3D 已更新 {len(changed)} 个；2D 已重生成 {len(TWOD_REGEN)} 个")
    for mid, before, after in changed:
        print(f"{mid:10s} {before[0]:12s}->{after[0]:12s}  V {before[2]}->{after[2]}  {after[1]}")


if __name__ == "__main__":
    main()
