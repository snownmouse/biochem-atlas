"""
一次性探针（非生产代码，跑完可删）：用 ADFR/AGFR 生成的 AutoDock4 网格打分函数，
测「每评估一个姿态的耗时」——这是「用打分函数做势能面引导路径搜索」能否离线批量出帧的唯一依据。
输入：$TEMP/adfr-probe/target.trg（AGFR 产物，内含 rigidReceptor.<类型>.map）与 ligand.pdbqt。
"""
import os
import time
import zipfile

import numpy as np

TRG = os.environ.get("TRG") or os.path.join(os.environ["TEMP"], "adfr-probe", "target.trg")
LIG = os.path.join(os.environ["TEMP"], "adfr-probe", "ligand.pdbqt")

z = zipfile.ZipFile(TRG)
_entries = z.namelist()
PREFIX = next(n for n in _entries if n.endswith(".C.map"))[: -len("C.map")]
head = z.read(PREFIX + "C.map").decode("ascii").splitlines()[:6]
spacing = float(head[3].split()[1])
niv = [int(v) for v in head[4].split()[1:]]        # AGFR 给的是「间隔数」
nx, ny, nz = [v + 1 for v in niv]                   # 点数 = 间隔数 + 1（65x37x61 与 .maps.xyz 一致）
cx, cy, cz = [float(v) for v in head[5].split()[1:]]
origin = np.array([cx, cy, cz]) - (np.array([nx, ny, nz]) - 1) * spacing / 2.0
print(f"[网格] spacing={spacing} dims={nx}x{ny}x{nz} center={cx, cy, cz} origin={np.round(origin, 3).tolist()}")


def load_map(t):
    raw = z.read(PREFIX + f"{t}.map").decode("ascii").splitlines()[6:]
    return np.array([float(v) for v in raw], dtype=np.float32).reshape(nz, ny, nx)  # 最后一维 x 最快


lig_atoms, lig_types = [], []
for ln in open(LIG):
    if ln.startswith(("ATOM", "HETATM")):
        lig_atoms.append([float(ln[30:38]), float(ln[38:46]), float(ln[46:54])])
        lig_types.append(ln[77:79].strip())
X0 = np.array(lig_atoms)
types = sorted(set(lig_types))
maps = {t: load_map(t) for t in types}
print(f"[网格] 配体 {len(X0)} 原子，类型 {types}；已载入 {len(maps)} 张图")


def elem_energy(t, xyz):
    g = maps[t]
    f = (xyz - origin) / spacing
    i = np.clip(np.floor(f).astype(np.int32), 0, [nx - 2, ny - 2, nz - 2])
    d = np.clip(f - i, 0.0, 1.0)
    ix, iy, iz = i[:, 0], i[:, 1], i[:, 2]
    dx, dy, dz = d[:, 0], d[:, 1], d[:, 2]
    flat = iz * (ny * nx) + iy * nx + ix
    c000 = g.ravel()[flat]
    c100 = g.ravel()[flat + 1]
    c010 = g.ravel()[flat + nx]
    c110 = g.ravel()[flat + nx + 1]
    c001 = g.ravel()[flat + nx * ny]
    c101 = g.ravel()[flat + nx * ny + 1]
    c011 = g.ravel()[flat + nx * ny + nx]
    c111 = g.ravel()[flat + nx * ny + nx + 1]
    w000 = (1 - dx) * (1 - dy) * (1 - dz)
    w100 = dx * (1 - dy) * (1 - dz)
    w010 = (1 - dx) * dy * (1 - dz)
    w110 = dx * dy * (1 - dz)
    w001 = (1 - dx) * (1 - dy) * dz
    w101 = dx * (1 - dy) * dz
    w011 = (1 - dx) * dy * dz
    w111 = dx * dy * dz
    return float((w000 * c000 + w100 * c100 + w010 * c010 + w110 * c110 +
                  w001 * c001 + w101 * c101 + w011 * c011 + w111 * c111).sum())


def score(xyz):
    total = 0.0
    for t in types:
        m = np.array(lig_types) == t
        total += elem_energy(t, xyz[m])
    return total


e_crystal = score(X0)
e_shift6 = score(X0 + np.array([6.0, 0.0, 0.0]))
e_shift12 = score(X0 + np.array([12.0, 0.0, 0.0]))
print(f"[能量] 晶体姿态 {e_crystal:.2f} kcal/mol | 平移 6 Å {e_shift6:.2f} | 平移 12 Å {e_shift12:.2f}")

n = 200
t0 = time.perf_counter()
for _ in range(n):
    score(X0)
dt = (time.perf_counter() - t0) / n
print(f"[吞吐] 44 原子全姿态打分 = {dt * 1e6:.0f} µs/次 -> {1 / dt:.0f} 次/秒（单核）")

# 6 自由度（仅平移）梯度下降 60 帧：测「路径搜索」级成本
x = X0 + np.array([8.0, 0.0, 0.0])
frames = []
t0 = time.perf_counter()
for fr in range(60):
    for _ in range(200):  # 每帧 200 步，数值梯度
        g = np.zeros(3)
        for k in range(3):
            d = np.zeros(3)
            d[k] = 0.05
            g[k] = (score(x + d) - score(x - d)) / 0.1
        step = 0.05 * g / (np.abs(g).max() + 1e-9)
        x -= step
    frames.append(x.copy())
dt = time.perf_counter() - t0
print(f"[路径] 60 帧 x 每帧 200 步（每步 7 次打分）= {dt:.2f} s；终点相对晶体姿态平移 "
      f"{np.round((frames[-1] - X0).mean(axis=0), 2).tolist()}，终点能量 {score(frames[-1]):.2f}")
