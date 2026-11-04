#!/usr/bin/env python3
# ============================================================
# probe-dock-6d-connect.py —— 一次性探针（不是生产代码，可删）
# 真 6D 连通性判定：状态 = (质心格点 i,j,k) × (朝向 o)
#   1) 预计算所有 (中心, 朝向) 的「配体-受体最近重原子间距」是否 ≥ CLEAR；
#   2) 对每个朝向做 26 邻域平移连通块；
#   3) 朝向之间角度 ≤ ANG 且在同一中心处两者都可行 → 合并连通块；
#   4) 看「口袋（晶体姿态）」与「8–12 Å 外壳」是否落在同一集合。
# 运行：PSTEP=0.75 NROT=180 ANG=30 /root/miniconda3/envs/wolfoclock/bin/python probe-6d-connect.py
# ============================================================
import itertools
import math
import os
import time

import numpy as np
from scipy import ndimage
from scipy.spatial import cKDTree

WORK = "/root/probe-dock/gk9"
CLEAR = float(os.environ.get("CLEAR", "2.45"))
STEP = float(os.environ.get("PSTEP", "0.75"))
NROT = int(os.environ.get("NROT", "180"))
ANG = float(os.environ.get("ANG", "30"))
BOX = np.array([28.5, 27.0, 30.0])


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
tree = cKDTree(rec)
c0 = lig.mean(axis=0)
rel = lig - c0
print(f"受体 {len(rec)} 重原子，配体 {len(lig)} 重原子；中心 {c0.round(2)}", flush=True)

# 中心网格（与生成器一致：盒子内各轴内缩 0.9 Å）
lo = c0 - BOX / 2 + 0.9
hi = c0 + BOX / 2 - 0.9
NI = int(math.floor((hi[0] - lo[0]) / STEP)) + 1
NJ = int(math.floor((hi[1] - lo[1]) / STEP)) + 1
NK = int(math.floor((hi[2] - lo[2]) / STEP)) + 1
GI, GJ, GK = np.meshgrid(np.arange(NI), np.arange(NJ), np.arange(NK), indexing="ij")
C = np.stack([lo[0] + STEP * GI.ravel(), lo[1] + STEP * GJ.ravel(), lo[2] + STEP * GK.ravel()], 1)
print(f"中心格点 {NI}×{NJ}×{NK} = {len(C)}", flush=True)
D0 = np.linalg.norm(C - c0, axis=1)


def quats_random(k, seed=11):
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
NO = len(Rots)
print(f"朝向 {NO} 个", flush=True)

# 1) 预计算 (中心 × 朝向) 可行性
t0 = time.perf_counter()
feas = np.zeros((NO, len(C)), dtype=bool)
dmax = np.zeros((NO, len(C)), dtype=np.float32)
for oi, R in enumerate(Rots):
    rr = rel @ R.T
    dmin = np.full(len(C), 1e9, dtype=np.float64)
    ok = np.ones(len(C), dtype=bool)
    for a in range(len(rr)):
        p = C + rr[a]
        inside = np.all((p >= lo - 0.5) & (p <= hi + 0.5), axis=1)
        ok &= inside
        d, _ = tree.query(p, k=1)
        dmin = np.minimum(dmin, d)
    feas[oi] = ok & (dmin >= CLEAR)
    dmax[oi] = dmin
t_pre = time.perf_counter() - t0
print(f"6D 预计算 {t_pre:.1f} s；可行状态 {int(feas.sum())}/{feas.size}（{feas.sum()/feas.size*100:.2f}%）", flush=True)

# 2) 每个朝向的平移连通块
lbls, sizes_all = [], []
for oi in range(NO):
    lbl, nc = ndimage.label(feas[oi].reshape(NI, NJ, NK), structure=np.ones((3, 3, 3), int))
    lbls.append(lbl.reshape(-1))
    sizes_all.append(np.bincount(lbl.ravel()))

# 3) 朝向邻接合并（并查集）
def qang(A, B):
    return math.degrees(math.acos(max(-1.0, min(1.0, (np.trace(A.T @ B) - 1) / 2))))


ids = [(oi, int(c)) for oi in range(NO) for c in range(1, len(sizes_all[oi]))]
idmap = {k: i for i, k in enumerate(ids)}
par = list(range(len(ids)))


def find(x):
    while par[x] != x:
        par[x] = par[par[x]]
        x = par[x]
    return x


def union(a, b):
    ra, rb = find(a), find(b)
    if ra != rb:
        par[rb] = ra


adj_pairs = [(o1, o2) for o1, o2 in itertools.combinations(range(NO), 2) if qang(Rots[o1], Rots[o2]) <= ANG]
print(f"朝向邻接对 {len(adj_pairs)}（阈值 {ANG}°）", flush=True)
merged = 0
for o1, o2 in adj_pairs:
    both = feas[o1] & feas[o2]
    if not both.any():
        continue
    idx = np.where(both)[0]
    a = lbls[o1][idx]; b = lbls[o2][idx]
    for x, y in set(zip(a.tolist(), b.tolist())):
        union(idmap[(o1, int(x))], idmap[(o2, int(y))])
        merged += 1
print(f"合并次数 {merged}", flush=True)

# 4) 判定：口袋（晶体位姿，朝向 0） vs 外壳（8–12 Å，任意朝向）
g_idx = int(np.argmin(D0))
goal_ids = [idmap[(0, int(lbls[0][g_idx]))]] if feas[0][g_idx] else [
    idmap[(0, int(lbls[0][i]))] for i in np.argsort(D0)[:200] if feas[0][i]][:1]
print(f"晶体位姿格点 idx={g_idx}（距质心 {D0[g_idx]:.2f} Å，朝向 0 可行={bool(feas[0][g_idx])}）", flush=True)

shell_ids = set()
for oi in range(NO):
    idx = np.where(feas[oi] & (D0 >= 8.0) & (D0 <= 12.0))[0]
    for i in idx:
        shell_ids.add(find(idmap[(oi, int(lbls[oi][i]))]))
print(f"8–12 Å 壳层可行状态 {int(np.sum([np.sum(feas[oi] & (D0>=8.0) & (D0<=12.0)) for oi in range(NO)]))}，"
      f"所属合并集合 {len(shell_ids)} 个", flush=True)

goal_set = find(goal_ids[0]) if goal_ids else None
ok = goal_set is not None and goal_set in shell_ids
# 口袋可达范围：同一合并集合里所有中心的最大距离
reach = 0.0
if goal_set is not None:
    members = [k for k in ids if find(idmap[k]) == goal_set]
    for oi, c in members:
        idx = np.where(lbls[oi] == c)[0]
        reach = max(reach, float(D0[idx].max()))
    print(f"口袋合并集合：{len(members)} 个 (朝向,块)，覆盖中心最远 {reach:.2f} Å", flush=True)
print("结论：" + ("6D 连通 —— 存在无碰撞进入路径" if ok else "6D 不连通 —— 刚性受体+刚性配体无无碰撞进入路径"), flush=True)
