# ============================================================
# fetch-ppp-gn-ligands.py —— 从 RCSB 抽 PPP / 糖异生配体的实验坐标
#
# 口径：同分子（真底物/产物或同一实体）+ 分辨率 ≤2.5 Å + X-ray/cryo-EM；
#       本步酶口袋优先（可跨物种，标物种）→ 人源非本酶口袋 → 其它来源；
#       取不到才用 RDKit 计算构象（不在本脚本内）。
# 输出仅坐标 SDF（无键表），键表由 gen-molecule-assets.py 依坐标重建。
# 链号自动探测：按 resname 收集各链重原子数，取与预期一致者。
# ============================================================
import os
import sys
import urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CACHE = os.path.join(ROOT, "tools", "cache")
OUT = os.path.join(ROOT, "public", "assets", "steps", "ppp-gn-lig")
os.makedirs(CACHE, exist_ok=True)
os.makedirs(OUT, exist_ok=True)

# id: (PDB, resname, expected heavy atoms, protein note)
PICKS = {
    "g6p-g6pd": ("7SNI", "BG6", 16, "人葡糖-6-磷酸脱氢酶（G6PD，PPP 氧化支路第 1 步）"),
    "6pg-l": ("3E7F", "6PG", 17, "布氏锥虫 6-磷酸葡糖酸内酯酶（6PGL，PPP 第 2 步）"),
    "6pg": ("2W90", "6PG", 17, "嗜热脂肪地芽孢杆菌 6-磷酸葡糖酸脱氢酶（6PGD，PPP 第 3 步）"),
    "ru5p": ("3OVQ", "5RP", 14, "人核酮糖-5-磷酸 3-差向异构酶（RPE，PPP 第 5 步）"),
    "ru5p-i": ("2VVP", "5RP", 14, "结核分枝杆菌核糖-5-磷酸异构酶 B（RpiB，PPP 第 4 步）"),
    "r5p": ("2VVP", "R5P", 14, "结核分枝杆菌核糖-5-磷酸异构酶 B（RpiB，PPP 第 4 步产物）"),
    "e4p": ("5XPS", "E4P", 12, "树干毕赤酵母转酮醇酶（TK，PPP 第 6/8 步）"),
    "s7p": ("4R75", "S7P", 18, "胸膜肺炎放线杆菌 AfuA 周质结合蛋白（非本通路酶）"),
    "fbp-gn": ("5ZWK", "FBP", 20, "人肝果糖-1,6-二磷酸酶 1（FBPase1，糖异生第 9 步）"),
    "f6p-gn": ("1EYI", "F6P", 16, "猪肝果糖-1,6-二磷酸酶 1（FBPase1，糖异生第 9 步产物）"),
    "pyr-gn": ("4YJ5", "PYR", 6, "人丙酮酸激酶 M2（PKM2；非糖异生丙酮酸羧化酶口袋）"),
    "lac": ("4JNK", "LAC", 6, "人乳酸脱氢酶 A（LDHA，Cori 循环乳酸→丙酮酸）"),
    "ala": ("8JDW", "ALA", 6, "人 L-精氨酸:甘氨酸脒基转移酶（AGAT；非糖异生 ALT 口袋）"),
    "glu": ("3CZD", "GLU", 10, "人肾型谷氨酰胺酶（GLS1；非糖异生 ALT 口袋）"),
}


def fetch_pdb(pdb):
    path = os.path.join(CACHE, f"{pdb}.pdb")
    if os.path.exists(path) and os.path.getsize(path) > 1000:
        return path
    print(f"下载 {pdb} …")
    url = f"https://files.rcsb.org/download/{pdb}.pdb"
    with urllib.request.urlopen(url, timeout=180) as r, open(path, "wb") as f:
        f.write(r.read())
    return path


def scan_chains(pdb_path, resname):
    """返回 {chain: 重原子名集合}（第一模型）"""
    chains = {}
    seen_model = False
    in_first = False
    with open(pdb_path, "r", encoding="utf-8", errors="ignore") as f:
        for line in f:
            rec = line[:6]
            if rec == "MODEL ":
                if seen_model:
                    break
                seen_model = True
                in_first = True
                continue
            if rec == "ENDMDL":
                break
            if rec != "HETATM":
                continue
            if line[17:20].strip() != resname:
                continue
            el = line[76:78].strip()
            if el == "H":
                continue
            ch = line[21:22]
            chains.setdefault(ch, set()).add(line[12:16].strip())
    return chains


def parse_ligand(pdb_path, resname, chain):
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
            if line[17:20].strip() != resname or line[21:22] != chain:
                continue
            occ = float(line[54:60] or 0)
            el = line[76:78].strip()
            if not el:
                el = "".join(c for c in name if c.isalpha())[:1]
            x, y, z = float(line[30:38]), float(line[38:46]), float(line[46:54])
            prev = atoms.get(name)
            key = (0 if alt in (" ", "A") else 1, -occ)
            if prev is None or key < prev["key"]:
                atoms[name] = dict(name=name, el=el, x=x, y=y, z=z, occ=occ, alt=alt, key=key)
    return [a for a in atoms.values() if a["el"] != "H"]


def write_sdf(path, atoms):
    lines = ["ligand", "     RCSB-excerpt  3D", ""]
    lines.append(f"{len(atoms):3d}{0:3d}  0  0  0  0  0  0  0  0999 V2000")
    for a in atoms:
        lines.append(f"{a['x']:10.4f}{a['y']:10.4f}{a['z']:10.4f} {a['el']:<3s} 0  0  0  0  0  0  0  0  0  0  0  0")
    lines.append("M  END")
    with open(path, "w", encoding="utf-8") as f:
        f.write("\n".join(lines) + "\n")


bad = []
for mid, (pdb, resn, expect, note) in PICKS.items():
    p = fetch_pdb(pdb)
    chains = scan_chains(p, resn)
    cands = sorted(chains.items(), key=lambda kv: (abs(len(kv[1]) - expect), kv[0]))
    if not cands:
        print(f"✗ {mid}: {pdb} 无 {resn}")
        bad.append(mid)
        continue
    chain, names = cands[0]
    if len(names) != expect:
        print(f"✗ {mid}: {pdb} 链{chain} {resn} 重原子 {len(names)}/{expect}，候选 {[(c, len(n)) for c, n in chains.items()]}")
        bad.append(mid)
        continue
    atoms = parse_ligand(p, resn, chain)
    path = os.path.join(OUT, f"{pdb}-{resn}-{chain}.sdf")
    write_sdf(path, atoms)
    print(f"✓ {mid:9s} {pdb} 链{chain} {resn} 原子 {len(atoms)}/{expect} 占位 {min(a['occ'] for a in atoms):.2f} | {note}")

if bad:
    print("不完整/未命中：" + ",".join(bad))
    sys.exit(1)
print("全部配体原子数匹配")
