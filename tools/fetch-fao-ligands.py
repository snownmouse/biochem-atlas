# ============================================================
# fetch-fao-ligands.py —— 从 RCSB 下载 β-氧化配体络合物，抽出实验坐标
#
# 口径（沿用 TCA 的 "同分子优先、实验坐标优先"）：
#   · 棕榈酰-CoA 取 5DV5（FadR，细菌非本步酶，但配体 PKZ 是完整 C16 饱和酰基-CoA）；
#   · 反式-Δ²-棕榈烯酰-CoA 取 2UXW（人 VLCAD，本步酶家族，配体 TH3 为 C16 烯酰-CoA）；
#   · 仅取 HETATM 中的目标残基，不取蛋白原子；同一原子名多 altLoc 时取占位率最高者；
#   · 输出 "仅原子坐标、无键表" 的 SDF；键表由 gen-molecule-assets.py 按坐标重建；
#   · PKZ 在 5DV5 里有两套构象副本，按原子名去重；TH3 在 2UXW 里是截短配体（仅反应端），
#     这正是本页要的分块坐标，不补造缺失的 CoA 原子。
# ============================================================
import os
import sys
import urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CACHE = os.path.join(ROOT, "tools", "cache")
OUT = os.path.join(ROOT, "public", "assets", "steps", "fao-lig")
os.makedirs(CACHE, exist_ok=True)
os.makedirs(OUT, exist_ok=True)

# id: (PDB, chain, resname, expected heavy atom count, protein note)
PICKS = {
    "acylcoa-c16": ("5DV5", "A", "PKZ", 65,
                    "细菌 FadR 转录因子 · 完整棕榈酰-CoA（C16 饱和酰基）· 非 β-氧化酶口袋"),
    "enoyl-c16": ("2UXW", "A", "TH3", 24,
                  "人极长链酰基-CoA 脱氢酶 VLCAD（β-氧化第 1 步同酶家族）· 反式-Δ²-棕榈烯酰-CoA（截短配体，仅反应端）"),
}


def fetch_pdb(pdb):
    path = os.path.join(CACHE, f"{pdb}.pdb")
    if os.path.exists(path) and os.path.getsize(path) > 1000:
        return path
    url = f"https://files.rcsb.org/download/{pdb}.pdb"
    print(f"下载 {pdb} …")
    with urllib.request.urlopen(url, timeout=120) as r, open(path, "wb") as f:
        f.write(r.read())
    return path


def parse_ligand(pdb_path, resname, chain):
    atoms = {}
    with open(pdb_path, "r", encoding="utf-8", errors="ignore") as f:
        for line in f:
            if line[:6] == "ENDMDL":
                break
            if line[:6] != "HETATM":
                continue
            name = line[12:16].strip()
            alt = line[16:17]
            resn = line[17:20].strip()
            ch = line[21:22]
            if resn != resname or ch != chain:
                continue
            occ = float(line[54:60] or 0)
            el = line[76:78].strip()
            if not el:
                el = "".join(c for c in name if c.isalpha())[:1]
            x, y, z = float(line[30:38]), float(line[38:46]), float(line[46:54])
            # 同一原子名有多个副本/altLoc 时：优先 ' ' 或 'A'，否则取占位率最高者
            prev = atoms.get(name)
            key = (0 if alt in (" ", "A") else 1, -occ)
            if prev is None or key < prev["key"]:
                atoms[name] = dict(name=name, el=el, x=x, y=y, z=z, occ=occ, alt=alt, key=key)
    return list(atoms.values())


def write_sdf(path, atoms):
    lines = ["ligand", "     RCSB-excerpt  3D", ""]
    lines.append(f"{len(atoms):3d}{0:3d}  0  0  0  0  0  0  0  0999 V2000")
    for a in atoms:
        lines.append(f"{a['x']:10.4f}{a['y']:10.4f}{a['z']:10.4f} {a['el']:<3s} 0  0  0  0  0  0  0  0  0  0  0  0")
    lines.append("M  END")
    with open(path, "w", encoding="utf-8") as f:
        f.write("\n".join(lines) + "\n")


bad = []
for mid, (pdb, chain, resn, expect, note) in PICKS.items():
    p = fetch_pdb(pdb)
    atoms = parse_ligand(p, resn, chain)
    heavy = [a for a in atoms if a["el"] != "H"]
    path = os.path.join(OUT, f"{pdb}-{resn}-{chain}.sdf")
    write_sdf(path, heavy)
    ok = len(heavy) == expect
    if not ok:
        bad.append(mid)
    print(f"{'✓' if ok else '✗'} {mid:12s} {pdb} 链{chain} {resn} 原子 {len(heavy)}/{expect} 占位 {min(a['occ'] for a in heavy):.2f} · {note}")

if bad:
    print("配体原子数与预期不符：" + ",".join(bad))
    sys.exit(1)
print("全部配体原子数匹配")
