#!/usr/bin/env python3
# ============================================================
# probe-dock-6d.py —— 一次性探针（不是生产代码，可删）
# 目的：在「刚性受体 + 刚性配体 + 2.45 Å 硬间距」下，放开全部朝向（SO(3) 随机采样），
#       判断口袋与 8–12 Å 外壳之间是否存在**任何**朝向可通行的连通通道。
# 若此刻度下仍不连通，则可判定「刚性受体下不存在无碰撞进入路径」，按用户约定停止。
# 运行：/root/miniconda3/envs/wolfoclock/bin/python probe-6d.py
# ============================================================
import math
import os
import time

import numpy as np
from scipy import ndimage
from scipy.spatial import cKDTree

WORK = "/root/probe-dock/gk9"
CLEAR = float(os.environ.get("CLEAR", "2.45"))
STEP = float(os.environ.get("PSTEP", "1.0"))
NROT = int(os.environ.get("NROT", "600"))


def read_pdbqt(path):
    at, ty = [], []
    for L in open(path):
        if L.startswith(("ATOM", "HETATM")):
            at.append([float(L[30:38]), float(L[38:46]), float(L[46:54])])
            ty.append(L[77:].strip().split()[-1] if L[77:].strip() else "")
    return np.array(at), ty


rec, rty = read_pdbqt(os.path.join(WORK, "receptor.pdbqt"))
lig, lty = read_pdbqt(os.path.join(WORK, "lig_crystal.pdbqt"))
rec = rec[[t not in ("HD", "H") for t in rty]]
lig = lig[[t not in ("HD", "H") for t in lty]]
print(f"受体重原子 {len(rec)}，配体重原子 {len(lig)}", flush=True)

tree = cKDTree(rec)
c0 = lig.mean(axis=0)
rel = lig - c0
R_MAX = float(os.environ.get("RMAX", "14.0"))

# 网格（1 Å）
n = int(math.floor(2 * R_MAX / STEP)) + 1
ax = (np.arange(n) - (n - 1) / 2.0) * STEP
G = np.stack(np.meshgrid(ax, ax, ax, indexing="ij"), axis=-1).reshape(-1, 3)
G = G[np.linalg.norm(G, axis=1) <= R_MAX]
print(f"探测中心格点 {len(G)}（1 Å，半径 {R_MAX} Å）", flush=True)


def quats_random(k, seed=7):
    rng = np.random.default_rng(seed)
    u = rng.normal(size=(k, 4))
    u /= np.linalg.norm(u, axis=1, keepdims=True)
    w, x, y, z = u[:, 0], u[:, 1], u[:, 2], u[:, 3]
    return np.stack([
        np.stack([1 - 2 * (y * y + z * z), 2 * (x * y - w * z), 2 * (x * z + w * y)], 1),
        np.stack([2 * (x * y + w * z), 1 - 2 * (x * x + z * z), 2 * (y * z - w * x)], 1),
        np.stack([2 * (x * z - w * y), 2 * (y * z + w * x), 1 - 2 * (x * x + y * y)], 1),
    ], axis=1)


Rots = np.concatenate([np.eye(3)[None], quats_random(NROT)])
print(f"朝向采样 {len(Rots)} 个（含晶体朝向）", flush=True)

t0 = time.perf_counter()
best = np.full(len(G), -1.0)      # 每个中心在所有朝向上的最大「最近重原子间距」
best_rot = np.zeros(len(G), dtype=int)
for ri, R in enumerate(Rots):
    rr = rel @ R.T                # (11,3)
    dmin = np.full(len(G), 1e9)
    for a in range(len(rr)):
        d, _ = tree.query(G + rr[a], k=1)
        dmin = np.minimum(dmin, d)
    upd = dmin > best
    best[upd] = dmin[upd]
    best_rot[upd] = ri
t_rot = time.perf_counter() - t0
print(f"6D 探测 {t_rot:.1f} s；中心可行率 {np.mean(best >= CLEAR) * 100:.1f}%", flush=True)

feas = (best >= CLEAR).reshape(n, n, n)
lbl, ncomp = ndimage.label(feas, structure=np.ones((3, 3, 3), dtype=int))
sizes = np.bincount(lbl.ravel())
print(f"可行中心连通块 {ncomp} 个；最大 5 块：" +
      ", ".join(f"#{int(c)}={int(sizes[c])}" for c in np.argsort(sizes)[::-1][:5] if c != 0), flush=True)

# 口袋中心（相对坐标 0）所在块 vs 8–12 Å 壳层所在块
pocket_vox = tuple(np.round((np.zeros(3) - G.min(0)) / STEP).astype(int))
# 找到最近可行中心
d0 = np.linalg.norm(G, axis=1)
near_idx = np.where(feas.reshape(-1))[0]
near_idx = near_idx[np.argsort(np.linalg.norm(G[near_idx], axis=1))[:5]]
print("离晶体质心最近的可行中心:", [(np.round(G[i], 2).tolist(), round(float(d0[i]), 2)) for i in near_idx], flush=True)
gi = near_idx[0]
cg = lbl.reshape(-1)[gi]
idx_c = np.argwhere(lbl == cg)
dc = np.linalg.norm((idx_c - (n - 1) / 2.0) * STEP, axis=1)
n_shell = int(np.sum((dc >= 8.0) & (dc <= 12.0)))
print(f"口袋所在块 #{int(cg)}：{len(idx_c)} 个中心，距质心 {dc.min():.1f}–{dc.max():.1f} Å，"
      f"8–12 Å 壳层 {n_shell} 个；该块最大可达间距 {best.reshape(n,n,n)[lbl==cg].max():.2f} Å", flush=True)

shell_feas = np.sum((np.asarray(best >= CLEAR)) & (np.linalg.norm(G, axis=1) >= 8.0) & (np.linalg.norm(G, axis=1) <= 12.0))
print(f"全空间 8–12 Å 壳层可行中心 {int(shell_feas)} 个", flush=True)
print("结论：" + ("连通，可能存在 6D 路径" if n_shell > 0 else "不连通：刚性受体下无无碰撞进入路径"), flush=True)
