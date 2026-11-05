# fetch-urea-fas-ligands.py —— 尿素循环 / 脂肪酸合成 配体实验坐标抽取
#
# 口径：同分子（真底物/真产物）+ 分辨率 ≤2.5 Å + X-ray/cryo-EM；本酶口袋优先，
# 命不中时保留原来源并写明“未获本酶口袋结构、取自 <蛋白>”。
# 只取 HETATM 中目标残基实例；同一 chain 下多个实例按 (chain, resSeq) 分组，
# 避免旧脚本按原子名合并导致不同拷贝坐标混用。
import os
import sys
import urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CACHE = os.path.join(ROOT, "tools", "cache")
OUT = os.path.join(ROOT, "public", "assets", "steps", "urea-fas-lig")
os.makedirs(CACHE, exist_ok=True)
os.makedirs(OUT, exist_ok=True)

# id: (PDB, chain, resSeq, resname, expected heavy atom count, note)
PICKS = {
    # 尿素循环
    "urea-orn":   ("3GMZ", "A", "551", "ORN", 9,  "人精氨酸酶 1（ARG1）· L-鸟氨酸产物结合态"),
    "urea-cit":   ("2NZ2", "A", "502", "CIR", 12, "人精氨酸琥珀酸合成酶 ASS1 · 瓜氨酸 + 天冬氨酸底物结合态"),
    "urea-asp":   ("2NZ2", "A", "501", "ASP", 9,  "人精氨酸琥珀酸合成酶 ASS1 · 瓜氨酸 + 天冬氨酸底物结合态"),
    "urea-as1":   ("1J20", "A", "520", "AS1", 20, "Thermus thermophilus 精氨酸琥珀酸合成酶 · 精氨酸琥珀酸产物结合态"),
    "urea-arg":   ("9GGJ", "B", "605", "ARG", 12, "拟南芥精氨酸琥珀酸裂解酶 ASL · 精氨酸 + 延胡索酸产物结合态"),
    "urea-fum":   ("9GGJ", "A", "609", "FUM", 8,  "拟南芥精氨酸琥珀酸裂解酶 ASL · 精氨酸 + 延胡索酸产物结合态"),
    "urea-ure":   ("1HQG", "A", "1901", "URE", 4, "大鼠精氨酸酶 1 H141C 突变体 · 尿素 + 鸟氨酸产物结合态"),
    # 脂肪酸合成
    "fas-accoa":  ("8ZW1", "B", "502", "ACO", 51, "人柠檬酸合酶 CS · 完整乙酰-CoA（TCA 已有同一结构）"),
    "fas-malonyl":("8H6C", "C", "701", "MLC", 54, "人 GCN5 组蛋白乙酰转移酶 · 丙二酰-CoA（非 FASN 口袋）"),
    "fas-malonyl-ec": ("1HNJ", "A", "350", "MLC", 48, "E. coli β-酮酰-ACP 合酶 III（KAS III）· 丙二酰-CoA（尾部 6 原子未建模）"),
    "fas-c16":    ("2WUT", "A", "1134", "PLM", 18, "人髓鞘蛋白 P2（脂肪酸结合蛋白）· 棕榈酸"),
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


def parse_instance(pdb_path, resname, chain, resseq):
    """只取指定 (chain, resSeq) 的一个配体实例；altLoc 优先空白/A，否则占位最高。"""
    atoms = {}
    seen_model = False
    with open(pdb_path, "r", encoding="utf-8", errors="ignore") as f:
        for line in f:
            rec = line[:6]
            if rec == "MODEL ":
                if seen_model:
                    break
                seen_model = True
                continue
            if rec == "ENDMDL":
                break
            if rec != "HETATM":
                continue
            name = line[12:16].strip()
            alt = line[16:17]
            resn = line[17:20].strip()
            ch = line[21:22]
            rs = line[22:27].strip()
            if resn != resname or ch != chain or rs != resseq:
                continue
            occ = float(line[54:60] or 0)
            el = line[76:78].strip()
            if not el:
                el = "".join(c for c in name if c.isalpha())[:1]
            x, y, z = float(line[30:38]), float(line[38:46]), float(line[46:54])
            prev = atoms.get(name)
            pref = 0 if alt in (" ", "A") else 1
            key = (pref, -occ)
            if prev is None or key < prev["key"]:
                atoms[name] = dict(name=name, el=el, x=x, y=y, z=z, occ=occ, alt=alt, key=key)
    return list(atoms.values())


def write_sdf(path, atoms):
    lines = [os.path.basename(path), "     RCSB-excerpt  3D", ""]
    lines.append(f"{len(atoms):3d}{0:3d}  0  0  0  0  0  0  0  0999 V2000")
    for a in atoms:
        lines.append(f"{a['x']:10.4f}{a['y']:10.4f}{a['z']:10.4f} {a['el']:<3s} 0  0  0  0  0  0  0  0  0  0  0  0")
    lines.append("M  END")
    with open(path, "w", encoding="utf-8") as f:
        f.write("\n".join(lines) + "\n")


bad = []
for mid, (pdb, chain, rs, resn, expect, note) in PICKS.items():
    p = fetch_pdb(pdb)
    atoms = parse_instance(p, resn, chain, rs)
    heavy = [a for a in atoms if a["el"] != "H"]
    path = os.path.join(OUT, f"{mid}-{pdb}-{resn}-{chain}{rs}.sdf")
    write_sdf(path, heavy)
    ok = len(heavy) == expect
    if not ok:
        bad.append(mid)
    print(f"{'✓' if ok else '✗'} {mid:14s} {pdb} 链{chain} {resn}{rs} 原子 {len(heavy)}/{expect} 占位 {min((a['occ'] for a in heavy), default=0):.2f} · {note}")

if bad:
    print("不完整配体：" + ",".join(bad))
    sys.exit(1)
print("全部配体原子数匹配")
