#!/usr/bin/env python3
# ============================================================
# probe-access.py —— 一次性探针（不是生产代码，可删）
# 问题：从盒子外部到 2PG 晶体位姿处，**最大可通行的探针球半径**是多少？
#       做法：受体原子填 vdW 球 → 距离场 D(p) = min_a(|p-a| - r_a)；
#             在格点上求「从边界到口袋中心的最大化瓶颈路径」（maximin / widest path）；
#             瓶颈值 B = 能挤过通道的最大球半径。
#       若 B 远小于配体有效半径，则刚性受体下不可能有刚性配体的无碰撞进入路径。
# 同时报告：配体重原子各点的 D 值（埋藏深度）、1.4 Å 探针能否触达配体。
# 运行：PSTEP=0.6 /root/miniconda3/envs/wolfoclock/bin/python probe-access.py
# ============================================================
import heapq
import math
import os

import numpy as np
from scipy.spatial import cKDTree

WORK = "/root/probe-dock/gk9"
STEP = float(os.environ.get("PSTEP", "0.6"))
BOX = np.array([28.5, 27.0, 30.0])
VDW = {"C": 1.70, "N": 1.55, "O": 1.52, "S": 1.80, "P": 1.80, "F": 1.47, "CL": 1.75, "BR": 1.85}


def read_pdbqt(path):
    at, ty = [], []
    for L in open(path):
        if L.startswith(("ATOM", "HETATM")):
            at.append([float(L[30:38]), float(L[38:46]), float(L[46:54])])
            ty.append(L[77:].strip().split()[-1] if L[77:].strip() else "")
    return np.array(at), ty


rec, rty = read_pdbqt(os.path.join(WORK, "receptor.pdbqt"))
lig, lty = read_pdbqt(os.path.join(WORK, "lig_crystal.pdbqt"))
keep = [i for i, t in enumerate(rty) if t not in ("HD", "H")]
rec = rec[keep]
# pdbqt 类型 → 元素
def elem(t):
    for p in ("CL", "BR", "NA", "OA", "SA", "HD", "C", "N", "O", "S", "P", "F"):
        if t.startswith(p):
            return {"NA": "N", "OA": "O", "SA": "S"}.get(p, p)
    return "C"


radii = np.array([VDW.get(elem(t), 1.70) for t in np.array(rty)[keep]])
lig = lig[[t not in ("HD", "H") for t in lty]]
c0 = lig.mean(axis=0)

lo = c0 - BOX / 2
hi = c0 + BOX / 2
NI = int(math.floor((hi[0] - lo[0]) / STEP)) + 1
NJ = int(math.floor((hi[1] - lo[1]) / STEP)) + 1
NK = int(math.floor((hi[2] - lo[2]) / STEP)) + 1
print(f"格点 {NI}×{NJ}×{NK}，步长 {STEP} Å，{NI*NJ*NK} 点", flush=True)

GI, GJ, GK = np.meshgrid(np.arange(NI), np.arange(NJ), np.arange(NK), indexing="ij")
P = np.stack([lo[0] + STEP * GI.ravel(), lo[1] + STEP * GJ.ravel(), lo[2] + STEP * GK.ravel()], 1)

# 距离场：对每个格点，取「到最近受体原子表面」的粗估（用最近原子中心 − 该原子 vdW）
tree = cKDTree(rec)
d, idx = tree.query(P, k=1)
D = (d - radii[idx]).reshape(NI, NJ, NK)
print(f"距离场完成；格点最大 D {D.max():.2f} Å", flush=True)

# maximin 可达性：从六个面（最外层一圈）出发，维护每个格点的「瓶颈下界」
best = np.full((NI, NJ, NK), -1e9, dtype=np.float32)
par = {}
heap = []
for i in range(NI):
    for j in range(NJ):
        for k in range(NK):
            if i in (0, NI - 1) or j in (0, NJ - 1) or k in (0, NK - 1):
                v = float(D[i, j, k])
                best[i, j, k] = v
                heap.append((-v, i, j, k))
heapq.heapify(heap)
NB = [(a, b, c) for a in (-1, 0, 1) for b in (-1, 0, 1) for c in (-1, 0, 1) if not (a == b == c == 0)]
expanded = 0
while heap:
    nb, i, j, k = heapq.heappop(heap)
    nb = -nb
    if nb < best[i, j, k] - 1e-6:
        continue
    expanded += 1
    for a, b, c in NB:
        ii, jj, kk = i + a, j + b, k + c
        if not (0 <= ii < NI and 0 <= jj < NJ and 0 <= kk < NK):
            continue
        cand = min(nb, float(D[ii, jj, kk]))
        if cand > best[ii, jj, kk] + 1e-6:
            best[ii, jj, kk] = cand
            par[(ii, jj, kk)] = (i, j, k)
            heapq.heappush(heap, (-cand, ii, jj, kk))
print(f"maximin 扩展 {expanded} 节点", flush=True)

# 口袋中心与配体各重原子处的瓶颈值
def at(p):
    c = np.round((np.array(p) - lo) / STEP).astype(int)
    c = np.clip(c, 0, [NI - 1, NJ - 1, NK - 1])
    return float(best[tuple(c)]), float(D[tuple(c)])


b_c, d_c = at(c0)
print(f"口袋中心（2PG 质心）：瓶颈 B={b_c:.2f} Å，局部间隙 D={d_c:.2f} Å", flush=True)
print("配体各重原子的瓶颈 / 局部间隙：", flush=True)
for i, p in enumerate(lig, 1):
    b, dd = at(p)
    print(f"  atom{i:02d}  B={b:5.2f}  D={dd:5.2f}", flush=True)

# 配体「最小截面半径」粗估：质心到各原子的最大距离的最近原子？这里给出配体原子的最小 vdW 半径与尺寸
from scipy.spatial.distance import pdist
span = float(pdist(lig).max())
print(f"配体最大原子间距 {span:.2f} Å；配体原子 vdW 半径 1.52–1.80 Å", flush=True)

# 瓶颈位置：回溯 maximin 最优路径，找最小 D 的节点，列出附近的受体残基
gc = tuple(np.clip(np.round((c0 - lo) / STEP).astype(int), 0, [NI - 1, NJ - 1, NK - 1]))
path = [gc]
while path[-1] in par:
    path.append(par[path[-1]])
gate = min(path, key=lambda t: D[t])
gp = lo + STEP * np.array(gate)
dg = float(D[gate])
print(f"最优路径 {len(path)} 节点；瓶颈闸门在 {gp.round(2)}（D={dg:.2f} Å，B={float(best[gate]):.2f} Å）", flush=True)

res = []
for L in open(os.path.join(WORK, "receptor.pdb")):
    if L.startswith("ATOM"):
        x, y, z = float(L[30:38]), float(L[38:46]), float(L[46:54])
        d = math.sqrt((x - gp[0]) ** 2 + (y - gp[1]) ** 2 + (z - gp[2]) ** 2)
        if d < 4.0:
            res.append((d, L[17:20].strip(), int(L[22:26]), L[12:16].strip()))
res.sort()
seen, out = set(), []
for d, rn, ri, an in res:
    if (rn, ri) not in seen:
        seen.add((rn, ri)); out.append(f"{rn}{ri}({d:.1f}Å)")
print(f"闸门 4.0 Å 内残基 {len(seen)} 个：" + ", ".join(out[:12]), flush=True)

print("判定：B 若 < 1.5 Å，则连水（1.4 Å 探针）都进不去；刚性受体下配体必然无进入通道。", flush=True)
