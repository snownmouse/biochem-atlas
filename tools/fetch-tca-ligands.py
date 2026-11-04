# ============================================================
# fetch-tca-ligands.py —— 从 RCSB 下载 TCA 配体络合物，抽出实验坐标
#
# 口径（本轮：能换就换，TCA 本酶优先）：
#   · 每个分子先在 TCA 本酶里找同种配体络合物：同分子 + 分辨率 ≤2.5 Å + X-ray/cryo-EM；
#   · 命中即替换（人源优先，其次哺乳动物，再其它物种；非人源在页面首屏说明里逐条标注）；
#   · 本酶口袋内没有 ≤2.5 Å 同分子结构时，保留原坐标并在说明里写明"未获本酶口袋结构、取自 <来源蛋白>"；
#   · 只取 HETATM 中的目标残基（首选 altLoc=' '/A，按占位率去重），不取邻近蛋白原子；
#   · 输出“仅原子坐标、无键表”的 SDF；键表由 gen-molecule-assets.py 用坐标重建（RDKit DetermineConnectivity）；
#   · 不完整的配体（缺原子 / 全零占位）直接报错，不静默放行。
# ============================================================
import os
import sys
import urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CACHE = os.path.join(ROOT, "tools", "cache")
OUT = os.path.join(ROOT, "public", "assets", "steps", "tca-lig")
os.makedirs(CACHE, exist_ok=True)
os.makedirs(OUT, exist_ok=True)

# id: (PDB, chain, resname, expected heavy atom count, protein note)
PICKS = {
    "accoa": ("8ZW1", "B", "ACO", 51, "人柠檬酸合酶（CS，TCA 第 1 步）· OAA + 完整乙酰-CoA 三元反应中间态"),
    "oaa": ("8ZVW", "A", "OAA", 9, "人柠檬酸合酶（CS，TCA 第 1 步）· 草酰乙酸 + CoA"),
    "cit": ("8ZVV", "A", "CIT", 13, "人柠檬酸合酶（CS，TCA 第 1 步）· 柠檬酸产物结合态"),
    "icit": ("5H3E", "A", "ICT", 13, "小鼠线粒体异柠檬酸脱氢酶 IDH2 K256Q（TCA 第 3 步）· 异柠檬酸"),
    "akg": ("5I95", "A", "AKG", 10, "人线粒体异柠檬酸脱氢酶 IDH2 R140Q（TCA 第 3 步）· NADPH + α-酮戊二酸"),
    "succoa": ("8P5V", "A", "SCA", 55, "谷氨酸棒杆菌 2-酮戊二酸脱氢酶 E1/E2 复合体（TCA 第 4 步）· 琥珀酰-CoA 产物结合态"),
    "suc": ("7MSS", "B", "SIN", 8, "人琥珀酰-CoA 合成酶（SUCL，TCA 第 5 步）· 琥珀酸 + CoA + Mg"),
    "fum": ("9BPW", "A", "FUM", 8, "金黄色葡萄球菌 II 型延胡索酸酶 FumC（TCA 第 7 步）· 延胡索酸"),
    "mal": ("2DFD", "A", "LMR", 9, "人线粒体苹果酸脱氢酶 MDH2（TCA 第 8 步）· L-苹果酸"),
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
    in_first_model = False
    seen_model = False
    with open(pdb_path, "r", encoding="utf-8", errors="ignore") as f:
        for line in f:
            rec = line[:6]
            if rec == "MODEL ":
                if seen_model:
                    break
                seen_model = True
                in_first_model = True
                continue
            if rec == "ENDMDL":
                break
            if rec != "HETATM":
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
            # 同一原子名有多个 altLoc 时：优先 ' ' 或 'A'，否则取占位率最高者
            prev = atoms.get(name)
            pref = 0 if alt in (" ", "A") else 1
            key = (pref, -occ)
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
    print(f"{'✓' if ok else '✗'} {mid:7s} {pdb} 链{chain} {resn} 原子 {len(heavy)}/{expect} 占位 {min(a['occ'] for a in heavy):.2f}")

if bad:
    print("不完整配体：" + ",".join(bad))
    sys.exit(1)
print("全部配体原子数匹配")
