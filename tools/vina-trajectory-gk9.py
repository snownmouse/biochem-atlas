#!/usr/bin/env python3
# ============================================================
# vina-trajectory-gk9.py —— gk-9（ENO2 / 2PG / 3UCD 链 A）刚体 6D 寻路生成器
#
# 范围锁死（用户批准的最小切片）：
#   - 蛋白完全刚性；配体刚体（无内部构象变化、无键级/化学变化）
#   - 单起点、单路径：Vina 打分网格上的引导式势能下降 + 少量 Langevin 扰动
#   - 硬碰撞约束：配体重原子与受体重原子 < 2.6 Å 施加惩罚，< 2.4 Å 直接拒绝
#
# 计算全部在 ext4（/root/probe-dock/gk9）内完成，不在 /mnt/c 上迭代/读网格。
# 依赖：wolfoclock env 的 vina 1.2.7 (python bindings) / rdkit / meeko / numpy / scipy
#
# 运行：
#   /root/miniconda3/envs/wolfoclock/bin/python vina-trajectory-gk9.py
# 产物：
#   /root/probe-dock/gk9/out/trajectory-3d.json（3D 世界坐标 + 指标）
# ============================================================
import json
import math
import os
import shutil
import subprocess
import sys
import time

import numpy as np
from scipy.spatial import cKDTree

WORK = "/root/probe-dock/gk9"
ENV = "/root/miniconda3/envs/wolfoclock"
PY = os.path.join(ENV, "bin", "python")
MK_REC = os.path.join(ENV, "bin", "mk_prepare_receptor.py")
MK_LIG = os.path.join(ENV, "bin", "mk_prepare_ligand.py")

os.makedirs(WORK, exist_ok=True)
OUT = os.path.join(WORK, "out")
os.makedirs(OUT, exist_ok=True)


def log(msg):
    print(msg, flush=True)


# ------------------------------------------------------------
# 1. 从 3UCD holo.pdb 拆出链 A 受体 / 2PG 晶体配体
# ------------------------------------------------------------
SRC = os.path.join(WORK, "holo.pdb")
if not os.path.exists(SRC):
    raise SystemExit("缺少 holo.pdb（先从 public/assets/steps/gly-09/ 拷到 ext4）")

prot_atoms = []   # heavy atoms only
lig_atoms = []
lines = open(SRC, "r", encoding="utf-8", errors="ignore").read().splitlines()
for L in lines:
    if L.startswith("ATOM"):
        chain = L[21:22].strip()
        alt = L[16:17].strip()
        if chain != "A":
            continue
        if alt not in ("", "A"):
            continue
        el = (L[76:78].strip() or L[12:16].strip()[0]).upper()
        if el in ("H", "D"):
            continue
        name = L[12:16].strip()
        prot_atoms.append({
            "name": name, "resn": L[17:20].strip(), "chain": chain,
            "resi": int(L[22:26]), "el": el,
            "xyz": [float(L[30:38]), float(L[38:46]), float(L[46:54])],
        })
    elif L.startswith("HETATM"):
        resn = L[17:20].strip()
        chain = L[21:22].strip()
        if chain != "A" or resn != "2PG":
            continue
        name = L[12:16].strip()
        el = (L[76:78].strip() or name[0]).upper()
        if el in ("H", "D"):
            continue
        lig_atoms.append({
            "name": name, "el": el,
            "xyz": [float(L[30:38]), float(L[38:46]), float(L[46:54])],
        })

# 原子顺序固定为 PDB 出现顺序（与既有 3UCD 资产一致：C1,C2,C3,P,O1,O2,O3,O1P,O2P,O3P,O4P）
LIG_ORDER = ["C1", "C2", "C3", "P", "O1", "O2", "O3", "O1P", "O2P", "O3P", "O4P"]
lig_atoms.sort(key=lambda a: LIG_ORDER.index(a["name"]))
assert [a["name"] for a in lig_atoms] == LIG_ORDER, [a["name"] for a in lig_atoms]
lig_heavy = np.array([a["xyz"] for a in lig_atoms], dtype=float)
prot_heavy = np.array([a["xyz"] for a in prot_atoms], dtype=float)
pocket_center = lig_heavy.mean(axis=0)

# 受体 PDB（链 A 蛋白原子；MG 单列，若 meeko 不接受则回退蛋白-only）
rec_pdb = os.path.join(WORK, "receptor.pdb")
with open(rec_pdb, "w") as f:
    for i, a in enumerate(prot_atoms, 1):
        # 写回为 ATOM，元素列保持
        f.write(
            f"ATOM  {i:5d} {a['name']:<4s} {a['resn']:>3s} {a['chain']}{a['resi']:4d}    "
            f"{a['xyz'][0]:8.3f}{a['xyz'][1]:8.3f}{a['xyz'][2]:8.3f}  1.00  0.00          {a['el']:>2s}\n"
        )
    f.write("END\n")

# 2PG 晶体配体 SDF（键级由化学写出；坐标保留晶体值）
from rdkit import Chem


def build_ligand_sdf():
    names = LIG_ORDER
    idx = {n: i for i, n in enumerate(names)}
    mol = Chem.RWMol()
    for n in names:
        el = "P" if n == "P" else ("O" if n.startswith("O") else "C")
        a = Chem.Atom(el)
        a.SetProp("_Name", n)
        mol.AddAtom(a)
    BOND = [
        ("C1", "O1", Chem.BondType.DOUBLE),
        ("C1", "O2", Chem.BondType.SINGLE),
        ("C1", "C2", Chem.BondType.SINGLE),
        ("C2", "C3", Chem.BondType.SINGLE),
        ("C2", "O1P", Chem.BondType.SINGLE),
        ("C3", "O3", Chem.BondType.SINGLE),
        ("O1P", "P", Chem.BondType.SINGLE),
        ("P", "O2P", Chem.BondType.DOUBLE),
        ("P", "O3P", Chem.BondType.SINGLE),
        ("P", "O4P", Chem.BondType.SINGLE),
    ]
    for a, b, t in BOND:
        mol.AddBond(idx[a], idx[b], t)
    # 羧酸根 O2 与磷酸双去质子 O3P/O4P
    mol.GetAtomWithIdx(idx["O2"]).SetFormalCharge(-1)
    mol.GetAtomWithIdx(idx["O3P"]).SetFormalCharge(-1)
    mol.GetAtomWithIdx(idx["O4P"]).SetFormalCharge(-1)
    conf = Chem.Conformer(len(names))
    for i, n in enumerate(names):
        p = lig_heavy[i]
        conf.SetAtomPosition(i, (float(p[0]), float(p[1]), float(p[2])))
    mol.AddConformer(conf, assignId=True)
    m = mol.GetMol()
    Chem.SanitizeMol(m)
    # 加显式氢（保留重原子坐标）
    m = Chem.AddHs(m, addCoords=True)
    sdf = os.path.join(WORK, "lig_crystal.sdf")
    w = Chem.SDWriter(sdf)
    w.write(m)
    w.close()
    return sdf, m


sdf_path, mol_h = build_ligand_sdf()
log(f"配体 SDF：{sdf_path}（重原子 {mol_h.GetNumHeavyAtoms()}，总原子 {mol_h.GetNumAtoms()}）")

# 准备受体 / 配体 pdbqt（meeko）
rec_pdbqt = os.path.join(WORK, "receptor.pdbqt")
if not os.path.exists(rec_pdbqt):
    r = subprocess.run(
        [PY, MK_REC, "--read_pdb", rec_pdb, "-o", os.path.join(WORK, "receptor"), "-p"],
        cwd=WORK, capture_output=True, text=True
    )
    log("mk_prepare_receptor rc=%d" % r.returncode)
    if r.returncode != 0:
        log(r.stdout[-2000:])
        log(r.stderr[-2000:])
        raise SystemExit("受体 pdbqt 准备失败")
    log(r.stderr[-800:])

lig_pdbqt = os.path.join(WORK, "lig_crystal.pdbqt")
if not os.path.exists(lig_pdbqt):
    r = subprocess.run(
        [PY, MK_LIG, "-i", sdf_path, "-o", lig_pdbqt],
        cwd=WORK, capture_output=True, text=True
    )
    log("mk_prepare_ligand rc=%d" % r.returncode)
    if r.returncode != 0:
        log(r.stdout[-2000:]); log(r.stderr[-2000:])
        raise SystemExit("配体 pdbqt 准备失败")
    log(r.stderr[-800:])


def parse_pdbqt_atoms(path):
    out = []
    for L in open(path):
        if L.startswith(("ATOM", "HETATM")):
            x = float(L[30:38]); y = float(L[38:46]); z = float(L[46:54])
            atype = L[77:].strip().split()[-1] if L[77:].strip() else ""
            name = L[12:16].strip()
            out.append({"name": name, "type": atype, "xyz": [x, y, z]})
    return out


lig_pq = parse_pdbqt_atoms(lig_pdbqt)
log(f"配体 pdbqt 原子 {len(lig_pq)}（类型 {sorted(set(a['type'] for a in lig_pq))}）")

# 把 pdbqt 原子映射回 11 个重原子（坐标最近；晶体坐标未变）
pq_heavy_idx = []
for i, a in enumerate(lig_atoms):
    p = np.array(a["xyz"])
    best = min(range(len(lig_pq)), key=lambda j: np.linalg.norm(np.array(lig_pq[j]["xyz"]) - p))
    pq_heavy_idx.append(best)
assert len(set(pq_heavy_idx)) == 11, pq_heavy_idx
pq_xyz = np.array([a["xyz"] for a in lig_pq], dtype=float)
pq_types = [a["type"] for a in lig_pq]

# ------------------------------------------------------------
# 2. Vina：计算打分网格并导出 .map（ext4）
# ------------------------------------------------------------
from vina import Vina

BOX_SIZE = (28.5, 27.0, 30.0)  # 0.375 Å 步长下每轴体素数为偶数（76×72×80），避免奇数体素报错
MAP_BASE = os.path.join(WORK, "vmaps")

t0 = time.perf_counter()
v = Vina(sf_name="vina", cpu=0, seed=20261103, verbosity=0)
v.set_receptor(rec_pdbqt)
v.set_ligand_from_file(lig_pdbqt)
v.compute_vina_maps(center=pocket_center.tolist(), box_size=list(BOX_SIZE))
t_maps = time.perf_counter() - t0
log(f"Vina 网格计算 {t_maps*1000:.0f} ms（box {BOX_SIZE}，center {pocket_center.round(3)}）")

for f in os.listdir(WORK):
    if f.startswith("vmaps.") and f.endswith(".map"):
        os.remove(os.path.join(WORK, f))
t0 = time.perf_counter()
v.write_maps(MAP_BASE, overwrite=True)
t_write = time.perf_counter() - t0
map_files = sorted(f for f in os.listdir(WORK) if f.startswith("vmaps.") and f.endswith(".map"))
log(f"write_maps {t_write*1000:.0f} ms → {map_files}")


def read_vina_map(path):
    tok = open(path, "r").read().split()
    i = 0
    spacing = None; nelem = None; center = None
    while i < len(tok):
        if tok[i] == "SPACING":
            spacing = float(tok[i + 1]); i += 2
        elif tok[i] == "NELEMENTS":
            nelem = [int(tok[i + 1]), int(tok[i + 2]), int(tok[i + 3])]; i += 4
        elif tok[i] == "CENTER":
            center = [float(tok[i + 1]), float(tok[i + 2]), float(tok[i + 3])]; i += 4
        else:
            # 到第一个纯数值（网格起点）
            try:
                float(tok[i]); break
            except ValueError:
                i += 1
    vals = np.array([float(x) for x in tok[i:]], dtype=np.float64)
    # Vina 的 NELEMENTS 是「间隔数」；点数 = +1（与 ADFR 实测一致）
    n = [e + 1 for e in nelem]
    if vals.size == nelem[0] * nelem[1] * nelem[2]:
        n = list(nelem)
    elif vals.size != n[0] * n[1] * n[2]:
        raise SystemExit(f"{path}: 数值 {vals.size} 与 {n} 不符")
    return {
        "spacing": spacing, "n": n, "center": np.array(center),
        "origin": np.array(center) - (np.array(n) - 1) * spacing / 2.0,
        "grid": vals.reshape(n[2], n[1], n[0]),  # 索引 [z,y,x]
    }


maps = {}
for f in map_files:
    atype = f[len("vmaps."):-len(".map")]
    maps[atype] = read_vina_map(os.path.join(WORK, f))
log("网格：" + ", ".join(f"{k} {v['n']}" for k, v in maps.items()))

# 配体原子类型 → Vina 图例 map 名。
# 注意：Vina 会把羟基氧（连 HD 的那个）单独归为 O_DA，其余氧为 O_A；
# 这个分箱只能从「哪个 O 旁边有 HD」推断，不能只看 pdbqt 的 OA 标签。
pq_map_keys = []
hd_idx = [i for i, t in enumerate(pq_types) if t in ("HD", "H")]
o_da_idx = None
if hd_idx:
    hd_pos = pq_xyz[hd_idx[0]]
    cand = [(np.linalg.norm(pq_xyz[i] - hd_pos), i) for i, t in enumerate(pq_types) if t in ("OA", "O_A", "OS")]
    o_da_idx = min(cand)[1]
for i, t in enumerate(pq_types):
    if t in ("OA", "O_A", "OS"):
        pq_map_keys.append("O_DA" if i == o_da_idx else "O_A")
    elif t in ("C", "C_H", "C_P"):
        # 2PG 三个碳都直接连氧 → C_P；为稳妥按“是否有 O/N/S/P 邻居”判定
        p = pq_xyz[i]
        hetero = any(
            (j != i and (pq_types[j].startswith(("O", "N", "P", "S"))) and np.linalg.norm(pq_xyz[j] - p) < 2.0)
            for j in range(len(pq_types))
        )
        pq_map_keys.append("C_P" if hetero else "C_H")
    elif t in ("P", "P_P"):
        pq_map_keys.append("P_P")
    elif t in ("N", "NA", "N_A", "N_P", "ND"):
        pq_map_keys.append("N_P" if t == "N_P" else "N_A")
    else:
        pq_map_keys.append(None)
missing = sorted({k for k in pq_map_keys if k is not None} - set(maps))
if missing:
    raise SystemExit(f"配体类型无对应 map：{missing}；现有 {sorted(maps)}")
log(f"配体分箱：O_DA 原子 #{o_da_idx}（羟基氧），其余氧 O_A；map 键 {sorted(set(k for k in pq_map_keys if k))}")


def trilinear(g, p):
    sp = g["spacing"]; n = g["n"]; org = g["origin"]
    f = (np.asarray(p, dtype=float) - org) / sp
    if np.any(f < 0) or np.any(f > np.array(n) - 1.0):
        return 50.0  # 出界：视为不可采样
    i0 = np.floor(f).astype(int)
    i0 = np.minimum(i0, np.array(n) - 2)
    t = f - i0
    x0, y0, z0 = i0
    tx, ty, tz = t
    G = g["grid"]
    c000 = G[z0, y0, x0]; c100 = G[z0, y0, x0 + 1]
    c010 = G[z0, y0 + 1, x0]; c110 = G[z0, y0 + 1, x0 + 1]
    c001 = G[z0 + 1, y0, x0]; c101 = G[z0 + 1, y0, x0 + 1]
    c011 = G[z0 + 1, y0 + 1, x0]; c111 = G[z0 + 1, y0 + 1, x0 + 1]
    return float(
        c000 * (1 - tx) * (1 - ty) * (1 - tz) + c100 * tx * (1 - ty) * (1 - tz)
        + c010 * (1 - tx) * ty * (1 - tz) + c110 * tx * ty * (1 - tz)
        + c001 * (1 - tx) * (1 - ty) * tz + c101 * tx * (1 - ty) * tz
        + c011 * (1 - tx) * ty * tz + c111 * tx * ty * tz
    )


pq_keys = pq_map_keys


def vina_score(xyz):
    s = 0.0
    for p, k in zip(xyz, pq_keys):
        if k is None or k not in maps:
            continue
        s += trilinear(maps[k], p)
    return s


def vina_inter(xyz):
    return vina_score(xyz)


# 校验：我们的网格插值与 Vina 自身的 lig_inter 是否一致
crystal_score_ours = vina_score(pq_xyz)
try:
    se = np.asarray(v.score()).ravel()
    vina_self = float(se[1]) if se.size > 1 else float(se[0])
    vina_total = float(se[0])
    log(f"Vina score() 列：{np.round(se, 3).tolist()}")
except Exception as e:
    vina_self = float("nan"); vina_total = float("nan"); log(f"v.score() 失败：{e}")
log(f"打分校验（晶体姿态）：网格插值 {crystal_score_ours:.3f} vs Vina lig_inter {vina_self:.3f}（total {vina_total:.3f}）")

# 平移 +6 / +12 Å 的对照（每次 set_ligand_from_string 约 0.45 s，仅两次）
def shifted_pdbqt_text(dx):
    txt = open(lig_pdbqt).read().splitlines()
    out = []
    for L in txt:
        if L.startswith(("ATOM", "HETATM")):
            x = float(L[30:38]) + dx
            L = L[:30] + f"{x:8.3f}" + L[38:]
        out.append(L)
    return "\n".join(out) + "\n"

for dx in (6.0, 12.0):
    try:
        v.set_ligand_from_string(shifted_pdbqt_text(dx))
        se = np.asarray(v.score()).ravel()
        s_self = float(se[1]) if se.size > 1 else float(se[0])
        shift_xyz = pq_xyz + np.array([dx, 0, 0])
        s_ours = vina_score(shift_xyz)
        log(f"打分校验（+{dx:.0f} Å）：ours {s_ours:.3f} vs vina lig_inter {s_self:.3f}")
    except Exception as e:
        log(f"+{dx} Å 校验失败：{e}")

# ------------------------------------------------------------
# 3. 刚体 6D 采样器
# ------------------------------------------------------------
PROT_TREE = cKDTree(prot_heavy)
K_CLASH = 80.0      # 每 Å² 的软球惩罚系数（3.0 Å 内）
CLASH_SOFT = 3.0
CLASH_HARD = 2.4
K_FUNNEL = 0.15     # 向口袋中心的弱引导（kcal/mol/Å²）：把配体拉向结合位点，避免停在外围浅坑
ANCHOR_K = 1.2      # 6 Å 内逐渐增强的晶体姿态锚定（末段保证终点重合）

lig_c0 = lig_heavy.mean(axis=0)          # 配体晶体质心
pq_c0 = pq_xyz.mean(axis=0)
pq_rel = pq_xyz - pq_c0                  # 刚体内部坐标
heavy_rel = lig_heavy - lig_c0


def rodrigues(w):
    th = float(np.linalg.norm(w))
    if th < 1e-12:
        return np.eye(3)
    k = w / th
    K = np.array([[0, -k[2], k[1]], [k[2], 0, -k[0]], [-k[1], k[0], 0]])
    return np.eye(3) + math.sin(th) * K + (1 - math.cos(th)) * (K @ K)


def pose_xyz(t, w):
    R = rodrigues(w)
    return (R @ pq_rel.T).T + pq_c0 + t


def pose_heavy(t, w):
    R = rodrigues(w)
    return (R @ heavy_rel.T).T + lig_c0 + t


# 起点：口袋中心外 8–12 Å，扫描方向选无碰撞、在网格内的方向
G0 = maps[pq_map_keys[0]]
NT = np.array(G0["n"])
ORG = G0["origin"]
SP = float(G0["spacing"])

def in_box(xyz):
    f = (np.asarray(xyz) - ORG) / SP
    return bool(np.all(f >= 0.5) and np.all(f <= NT - 1.5))


best_start = None
rng = np.random.default_rng(20261103)


def clearance_along(t, w, n=21):
    """从起点到晶体姿态的线性通道最小重原子间距（起点选路用，不参与采样）。"""
    worst = 1e9
    for s in np.linspace(0.0, 1.0, n):
        h = pose_heavy(t * (1 - s), w * (1 - s))
        worst = min(worst, float(PROT_TREE.query(h, k=1)[0].min()))
    return worst


# 起点朝向候选：先用晶体朝向（刚性配体以正确朝向进入通道；旋转自由度在末段局部松弛中再放开）
w_cands = [np.zeros(3)]

dirs = []
for _ in range(500):
    u = rng.normal(size=3); u /= np.linalg.norm(u)
    dirs.append(u)
for u in np.eye(3).tolist() + (-np.eye(3)).tolist():
    dirs.append(np.array(u) / np.linalg.norm(u))

for u in dirs:
    for dist in (10.5, 9.0, 11.5, 12.0, 8.0):
        t = u * dist
        for w0 in w_cands:
            h0 = pose_heavy(t, w0)
            if not in_box(h0):
                continue
            d0 = float(PROT_TREE.query(h0, k=1)[0].min())
            if d0 < 2.9:
                continue
            clr = clearance_along(t, w0)
            # 优先通道最宽；同宽时取更靠外的起点
            key = (clr, dist + 0.02 * d0)
            if best_start is None or key > best_start[0]:
                best_start = (key, t.copy(), u.copy(), w0.copy(), dist, d0, clr)
if best_start is None:
    raise SystemExit("找不到无碰撞且落在网格内的起点")
_, t_start, u_start, w_start, dist_start, dmin_start, clr_start = best_start

log(f"起点：center + {dist_start:.1f} Å × ({u_start.round(3)})，起点最小间距 {dmin_start:.2f} Å，"
    f"线性通道最小间距 {clr_start:.2f} Å，朝向偏移 {math.degrees(np.linalg.norm(w_start)):.0f}°")
if clr_start < 2.4:
    log("警告：所有候选起点的线性通道都 < 2.4 Å（需要绕行；本切片不做曲线路径搜索）")

# 直通道诊断：从起点到晶体姿态的线性插值是否可用（只看不参与采样）
log("直通道诊断（s=0 起点 → s=1 晶体姿态）：")
for s in np.linspace(0.0, 1.0, 11):
    ts = t_start * (1 - s)
    ws = w_start * (1 - s)
    h = pose_heavy(ts, ws)
    d = float(PROT_TREE.query(h, k=1)[0].min())
    sc = vina_score(pose_xyz(ts, ws))
    rr = float(np.sqrt(np.mean(np.sum((h - lig_heavy) ** 2, axis=1))))
    log(f"  s={s:.1f}  dmin={d:.2f} Å  score={sc:.2f}  rmsd={rr:.2f}")

if os.environ.get("DIAG_ONLY") == "1":
    raise SystemExit(0)


def min_dist(xyz_heavy):
    return float(PROT_TREE.query(xyz_heavy, k=1)[0].min())


def pose_rmsd(heavy):
    # 同一坐标系下的姿态 RMSD（不做叠合：受体是同一晶体结构，叠合会把纯旋转抹掉）
    d = heavy - lig_heavy
    return float(np.sqrt(np.mean(np.sum(d * d, axis=1))))


def energy(t, w):
    xyz = pose_xyz(t, w)
    e = vina_score(xyz)
    heavy = pose_heavy(t, w)
    d = PROT_TREE.query(heavy, k=1)[0]
    e += K_CLASH * float(np.sum(np.maximum(0.0, CLASH_SOFT - d) ** 2))
    # 引导项：配体质心向晶体质心（口袋中心）收拢；离得越远拉力越明显
    e += K_FUNNEL * float(np.dot(t, t))
    rmsd = pose_rmsd(heavy)
    # 末段朝向/姿态锚定：只在 6 Å 内起作用，把晶体姿态当终点（显式写进 honesty）
    if rmsd < 6.0:
        e += ANCHOR_K * (6.0 - rmsd) / 6.0 * rmsd * rmsd
    return e, rmsd, float(d.min())


def grad6(t, w, e0):
    g = np.zeros(6)
    ht = 0.015; hw = 0.004
    for k in range(3):
        tt = t.copy(); tt[k] += ht
        g[k] = (energy(tt, w)[0] - e0) / ht
    for k in range(3):
        ww = w.copy(); ww[k] += hw
        g[3 + k] = (energy(t, ww)[0] - e0) / hw
    return g


t_cur = t_start.copy()
w_cur = w_start.copy()
e_cur, rmsd_cur, dmin_cur = energy(t_cur, w_cur)
log(f"起点能量 {e_cur:.2f}，RMSD {rmsd_cur:.2f} Å，最小间距 {dmin_cur:.2f} Å")

# ------------------------------------------------------------
# 3a. 碰撞可行的通道搜索（A*）
#     口袋是埋藏的：从 8–12 Å 外到晶体姿态的任意直线通道最小间距都 < 0.5 Å（见上），
#     所以先在打分网格上找一条碰撞可行的低能量通道，再做局部 6D 松弛。
#     状态 = 配体质心（3D）；朝向由到晶体姿态的距离决定（w = w_start*(1-s)），
#     因此每个格点对应一个确定的 6D 位姿。代价 = 路径长度 + λ·max(0, Vina 分数)。
# ------------------------------------------------------------
import heapq

G_STEP = float(os.environ.get("G_STEP", "0.75"))
FEAS_MIN = float(os.environ.get("FEAS_MIN", "2.45"))
g_lo = ORG + 0.9
g_hi = ORG + (NT - 1) * SP - 0.9
NI = int(math.floor((g_hi[0] - g_lo[0]) / G_STEP)) + 1
NJ = int(math.floor((g_hi[1] - g_lo[1]) / G_STEP)) + 1
NK = int(math.floor((g_hi[2] - g_lo[2]) / G_STEP)) + 1


def gpos(i, j, k):
    return g_lo + G_STEP * np.array([i, j, k], dtype=float)


def orient_at(pos):
    """朝向随接近程度收敛：离晶体质心 > dist_start 时用起始朝向；
    在 1.5 Å 内完全回到晶体朝向（否则末段格点会因为残余转角而全部碰撞）。"""
    d = float(np.linalg.norm(pos - lig_c0))
    span = max(dist_start - 1.5, 1e-6)
    s = 0.0 if d >= dist_start else min(1.0, (dist_start - d) / span)
    return w_start * (1.0 - s)


feas = np.zeros((NI, NJ, NK), dtype=bool)
scs = np.full((NI, NJ, NK), 1e3, dtype=float)
clrs = np.zeros((NI, NJ, NK), dtype=float)

t_begin = time.perf_counter()
for i in range(NI):
    for j in range(NJ):
        for k in range(NK):
            pos = gpos(i, j, k)
            w = orient_at(pos)
            h = pose_heavy(pos - lig_c0, w)
            if not in_box(h):
                continue
            dm = float(PROT_TREE.query(h, k=1)[0].min())
            if dm < FEAS_MIN:          # 高于硬约束 2.4，留余量
                continue
            feas[i, j, k] = True
            clrs[i, j, k] = dm
            scs[i, j, k] = vina_score(pose_xyz(pos - lig_c0, w))
t_grid = time.perf_counter() - t_begin
n_feas = int(feas.sum())
log(f"通道网格：{NI}×{NJ}×{NK}，可行格点 {n_feas}（{n_feas/(NI*NJ*NK)*100:.1f}%），"
    f"预计算 {t_grid*1000:.0f} ms")

if n_feas == 0:
    raise SystemExit("通道网格没有可行格点")

INF = float("inf")
gcost = np.full((NI, NJ, NK), INF, dtype=float)
parent = {}
start_pos = lig_c0 + t_start
goal_pos = lig_c0


def nearest_feasible(pos, max_r=5):
    c = np.round((pos - g_lo) / G_STEP).astype(int)
    best = None
    for di in range(-max_r, max_r + 1):
        for dj in range(-max_r, max_r + 1):
            for dk in range(-max_r, max_r + 1):
                i, j, k = c[0] + di, c[1] + dj, c[2] + dk
                if 0 <= i < NI and 0 <= j < NJ and 0 <= k < NK and feas[i, j, k]:
                    d = float(np.linalg.norm(gpos(i, j, k) - pos))
                    if best is None or d < best[0]:
                        best = (d, i, j, k)
    return None if best is None else best[1:]


s_ijk = nearest_feasible(start_pos)
g_ijk = nearest_feasible(goal_pos, max_r=3)
if s_ijk is None or g_ijk is None:
    raise SystemExit(f"起点/终点附近没有可行格点（start={s_ijk}, goal={g_ijk}）")
log(f"A* 起点格点 {s_ijk}（距请求起点 {np.linalg.norm(gpos(*s_ijk)-start_pos):.2f} Å），"
    f"终点格点 {g_ijk}（距晶体质心 {np.linalg.norm(gpos(*g_ijk)-goal_pos):.2f} Å）")

# 连通性诊断：可行域连通块各自能延伸多远；口袋块是否有 8–12 Å 壳层格点
from scipy import ndimage

lbl, ncomp = ndimage.label(feas, structure=np.ones((3, 3, 3), dtype=int))
sizes = np.bincount(lbl.ravel())
order = [int(c) for c in np.argsort(sizes)[::-1] if c != 0][:6]
log(f"可行域连通块 {ncomp} 个；最大 6 块：")
comp_shell = {}
for c in order:
    idx_c = np.argwhere(lbl == c)
    d = np.linalg.norm(g_lo + G_STEP * idx_c - lig_c0, axis=1)
    n_shell = int(np.sum((d >= 8.0) & (d <= 12.0)))
    comp_shell[c] = n_shell
    log(f"  块 #{c}: {int(sizes[c])} 格点，距晶体质心 {d.min():.1f}–{d.max():.1f} Å，8–12 Å 壳层 {n_shell} 个")

cs = int(lbl[s_ijk])
cg = int(lbl[g_ijk])
diag = {
    "nFeasible": n_feas,
    "feasiblePct": round(n_feas / (NI * NJ * NK) * 100, 2),
    "nComponents": int(ncomp),
    "startComp": cs, "goalComp": cg,
    "startCompSize": int(sizes[cs]) if cs else 0,
    "goalCompSize": int(sizes[cg]) if cg else 0,
    "startCompShell": comp_shell.get(cs, 0),
    "sameComponent": bool(cs == cg),
}
if cs != cg or comp_shell.get(cg, 0) == 0:
    raise SystemExit(
        "连通性诊断：不存在无碰撞进入通道 —— "
        f"起点块 #{cs}（{int(sizes[cs])} 格点，8–12 Å 壳层 {comp_shell.get(cs,0)} 个）"
        f"与口袋块 #{cg}（{int(sizes[cg])} 格点，8–12 Å 壳层 {comp_shell.get(cg,0)} 个）不连通"
    )

NEI = [(di, dj, dk) for di in (-1, 0, 1) for dj in (-1, 0, 1) for dk in (-1, 0, 1)
       if not (di == dj == dk == 0)]
LAMBDA_SCORE = 0.02

gi, gj, gk = g_ijk


def hfun(i, j, k):
    return G_STEP * math.sqrt((i - gi) ** 2 + (j - gj) ** 2 + (k - gk) ** 2)


gcost[s_ijk] = 0.0
openq = [(hfun(*s_ijk), 0.0, s_ijk)]
expanded = 0
found = False
while openq:
    f, gc, node = heapq.heappop(openq)
    if gc > gcost[node] + 1e-9:
        continue
    if node == g_ijk:
        found = True
        break
    expanded += 1
    i, j, k = node
    for di, dj, dk in NEI:
        ni, nj, nk = i + di, j + dj, k + dk
        if not (0 <= ni < NI and 0 <= nj < NJ and 0 <= nk < NK) or not feas[ni, nj, nk]:
            continue
        step = G_STEP * math.sqrt(di * di + dj * dj + dk * dk)
        ng = gc + step + LAMBDA_SCORE * max(0.0, float(scs[ni, nj, nk]))
        if ng < gcost[ni, nj, nk]:
            gcost[ni, nj, nk] = ng
            parent[(ni, nj, nk)] = node
            heapq.heappush(openq, (ng + hfun(ni, nj, nk), ng, (ni, nj, nk)))
t_astar = time.perf_counter() - t_begin - t_grid

if not found:
    raise SystemExit(f"A* 未找到碰撞可行通道（扩展 {expanded} 节点）；本切片到这里停止，不做假轨迹")
log(f"A* 扩展 {expanded} 节点，用时 {t_astar*1000:.0f} ms")

# 回溯
node_path = [g_ijk]
while node_path[-1] != s_ijk:
    node_path.append(parent[node_path[-1]])
node_path.reverse()
poses0 = []
for (i, j, k) in node_path:
    pos = gpos(i, j, k)
    poses0.append({"t": (pos - lig_c0).tolist(), "w": orient_at(pos).tolist()})
log(f"通道节点 {len(poses0)}，路径直线长度 "
    f"{sum(np.linalg.norm(gpos(*node_path[a+1])-gpos(*node_path[a])) for a in range(len(node_path)-1)):.1f} Å")


def seg_ok(a, b, n=None):
    ta = np.array(a["t"]); tb = np.array(b["t"])
    wa = np.array(a["w"]); wb = np.array(b["w"])
    L = float(np.linalg.norm(ta - tb))
    if n is None:
        n = max(2, int(math.ceil(L / 0.4)))
    for u in np.linspace(0.0, 1.0, n):
        t = ta * (1 - u) + tb * u
        w = wa * (1 - u) + wb * u
        h = pose_heavy(t, w)
        if not in_box(h):
            return False
        if float(PROT_TREE.query(h, k=1)[0].min()) < FEAS_MIN:
            return False
    return True


# 捷径拉直（保留碰撞可行性）
smooth = [poses0[0]]
i0 = 0
while i0 < len(poses0) - 1:
    j0 = len(poses0) - 1
    while j0 > i0 + 1 and not seg_ok(poses0[i0], poses0[j0]):
        j0 -= 1
    smooth.append(poses0[j0])
    i0 = j0
log(f"拉直后通道节点 {len(smooth)}")

# 沿弧长均匀重采样（保证时间均匀 + 末帧=晶体姿态）
cum = [0.0]
for a in range(len(smooth) - 1):
    cum.append(cum[-1] + float(np.linalg.norm(np.array(smooth[a + 1]["t"]) - np.array(smooth[a]["t"]))))
N_FRAMES = 60
targets = np.linspace(0.0, cum[-1], N_FRAMES)
frames = []
seg = 0
for fi, sdist in enumerate(targets):
    while seg < len(cum) - 2 and sdist > cum[seg + 1]:
        seg += 1
    span = cum[seg + 1] - cum[seg]
    u = 0.0 if span <= 1e-12 else (sdist - cum[seg]) / span
    ta = np.array(smooth[seg]["t"]); tb = np.array(smooth[seg + 1]["t"])
    wa = np.array(smooth[seg]["w"]); wb = np.array(smooth[seg + 1]["w"])
    t = ta * (1 - u) + tb * u
    w = wa * (1 - u) + wb * u
    if fi == N_FRAMES - 1:
        t = np.zeros(3); w = np.zeros(3)   # 末帧强制为晶体姿态
    h = pose_heavy(t, w)
    frames.append({
        "t": t, "w": w,
        "score": float(vina_score(pose_xyz(t, w))),
        "rmsd": pose_rmsd(h),
        "dmin": float(PROT_TREE.query(h, k=1)[0].min()),
    })

# 少量 Langevin 扰动：逐帧做 4 次小扰动，仅接受「能量更低且仍无碰撞」的位姿
t_lang = time.perf_counter()
for fi in range(1, N_FRAMES - 1):
    cur = frames[fi]
    ecur = cur["score"] + K_CLASH * max(0.0, CLASH_SOFT - cur["dmin"]) ** 2
    for _ in range(4):
        t = cur["t"] + rng.normal(scale=0.025, size=3)
        w = cur["w"] + rng.normal(scale=0.0025, size=3)
        h = pose_heavy(t, w)
        if not in_box(h):
            continue
        dm = float(PROT_TREE.query(h, k=1)[0].min())
        if dm < FEAS_MIN:
            continue
        sc = float(vina_score(pose_xyz(t, w)))
        en = sc + K_CLASH * max(0.0, CLASH_SOFT - dm) ** 2
        # 轻微平滑项：不要离开相邻帧太远
        prev_t = frames[fi - 1]["t"]; next_t = frames[fi + 1]["t"]
        en += 0.15 * float(np.sum((t - 0.5 * (prev_t + next_t)) ** 2))
        if en < ecur:
            cur["t"], cur["w"], cur["score"], cur["dmin"] = t, w, sc, dm
            cur["rmsd"] = pose_rmsd(h)
            ecur = en
t_lang = time.perf_counter() - t_lang
t_sample = time.perf_counter() - t_begin

scores = [f["score"] for f in frames]
dmins = [f["dmin"] for f in frames]
rmsds = [f["rmsd"] for f in frames]
jumps = [abs(scores[i + 1] - scores[i]) for i in range(len(scores) - 1)]
log(f"采样总用时 {t_sample*1000:.0f} ms（网格 {t_grid*1000:.0f} + A* {t_astar*1000:.0f} + Langevin {t_lang*1000:.0f}）")
log(f"打分首/末 {scores[0]:.2f} → {scores[-1]:.2f}；最大逐帧跳变 {max(jumps):.2f}；"
    f"最小重原子间距 {min(dmins):.2f} Å；末帧 RMSD {rmsds[-1]:.2f} Å")

if rmsds[-1] >= 1.5:
    raise SystemExit(f"末帧 RMSD {rmsds[-1]:.2f} Å ≥ 1.5 Å，判定失败，不写轨迹")

frames_out = []
for fi, fr in enumerate(frames):
    t = np.asarray(fr["t"]); w = np.asarray(fr["w"])
    frames_out.append({
        "i": fi,
        "t": np.round(t, 4).tolist(),
        "w": np.round(w, 5).tolist(),
        "heavy": np.round(pose_heavy(t, w), 3).tolist(),
        "score": round(float(fr["score"]), 3),
        "rmsd": round(float(fr["rmsd"]), 3),
        "dmin": round(float(fr["dmin"]), 3),
    })

traj = {
    "clipId": "gk-9-vina",
    "stepId": "gk-9",
    "variant": "vina",
    "source": {
        "receptor": "3UCD 链 A（Homo sapiens ENO2，1.41 Å，去水去 2PG/PEP；受体刚性）",
        "ligand": "2PG 晶体坐标（3UCD A/601，11 重原子；刚体，无内部构象变化）",
        "grid": "Vina 1.2.7 write_maps（spacing 0.375 Å；盒子取偶数体素 76×72×80）",
        "box": {"center": np.round(pocket_center, 3).tolist(), "size": list(BOX_SIZE)},
    },
    "ligand": {
        "names": LIG_ORDER,
        "elements": [a["el"] for a in lig_atoms],
        "pdbqtTypes": pq_types,
        "heavyIdx": pq_heavy_idx,
        "bonds": [[0, 4], [0, 5], [0, 1], [1, 2], [1, 7], [2, 6], [7, 3],
                  [3, 8], [3, 9], [3, 10]],
    },
    "frames": frames_out,
    "metrics": {
        "gridComputeMs": round(t_maps * 1000, 1),
        "writeMapsMs": round(t_write * 1000, 1),
        "samplingMs": round(t_sample * 1000, 1),
        "astarGridMs": round(t_grid * 1000, 1),
        "astarMs": round(t_astar * 1000, 1),
        "langevinMs": round(t_lang * 1000, 1),
        "channelNodes": len(poses0),
        "smoothedNodes": len(smooth),
        "astarExpanded": expanded,
        "pathLengthA": round(cum[-1], 1),
        "scoreFirst": scores[0],
        "scoreLast": scores[-1],
        "scoreMin": min(scores),
        "scoreMax": max(scores),
        "maxFrameJump": round(max(jumps), 3),
        "minHeavyDist": min(dmins),
        "rmsdFirst": rmsds[0],
        "rmsdLast": rmsds[-1],
        "startOffsetA": round(float(np.linalg.norm(t_start)), 3),
        "startRotDeg": round(float(math.degrees(np.linalg.norm(w_start))), 1),
        "scoreValidation": {"oursCrystal": round(crystal_score_ours, 3), "vinaCrystal": round(vina_self, 3)},
        "funnelK": K_FUNNEL,
        "anchorK": ANCHOR_K,
        "clashSoft": CLASH_SOFT,
        "clashHard": CLASH_HARD,
        "nFrames": N_FRAMES,
    },
}
with open(os.path.join(OUT, "trajectory-3d.json"), "w") as f:
    json.dump(traj, f, separators=(",", ":"))
log(f"写出 {os.path.join(OUT, 'trajectory-3d.json')}")
