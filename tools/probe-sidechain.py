#!/usr/bin/env python3
# ============================================================
# probe-sidechain.py —— 一次性探针（不是生产代码，可删）
# 问题：3UCD 里口袋闸门由 SER248 / GLU249 / ASP318 的侧链卡住（B=1.12 Å）。
#       若只把这些残基的侧链「拿掉」（保留 N/CA/C/O 主链），通道瓶颈会变成多少？
#       这是「最小松弛代价」的下界估计：若拿掉侧链后仍 < 1.7 Å，连侧链松弛也救不了。
# 运行：DROP_SC=248,249,318 PSTEP=0.4 /root/.../python probe-sidechain.py
# ============================================================
import heapq
import math
import os

import numpy as np
from scipy.spatial import cKDTree

WORK = "/root/probe-dock/gk9"
STEP = float(os.environ.get("PSTEP", "0.4"))
BOX = np.array([28.5, 27.0, 30.0])
DROP = {int(x) for x in os.environ.get("DROP_SC", "248,249,318").split(",") if x.strip()}
BACKBONE = {"N", "CA", "C", "O", "OXT"}
VDW = {"C": 1.70, "N": 1.55, "O": 1.52, "S": 1.80, "P": 1.80}


def read_pdbqt(path):
    at, ty = [], []
    for L in open(path):
        if L.startswith(("ATOM", "HETATM")):
            at.append([float(L[30:38]), float(L[38:46]), float(L[46:54])])
            ty.append(L[77:].strip().split()[-1] if L[77:].strip() else "")
    return np.array(at), ty


def elem(t):
    for p in ("CL", "BR", "NA", "OA", "SA", "HD", "C", "N", "O", "S", "P", "F"):
        if t.startswith(p):
            return {"NA": "N", "OA": "O", "SA": "S"}.get(p, p)
    return "C"


lig = np.array([[float(L[30:38]), float(L[38:46]), float(L[46:54])]
                for L in open(os.path.join(WORK, "lig_crystal.pdbqt"))
                if L.startswith(("ATOM", "HETATM"))
                and L[77:].strip().split()[-1] not in ("HD", "H")]) if False else None

lig_at, lig_ty = read_pdbqt(os.path.join(WORK, "lig_crystal.pdbqt"))
lig = lig_at[[t not in ("HD", "H") for t in lig_ty]]
c0 = lig.mean(0)

# 受体：从 receptor.pdb（带残基名/号，才能筛侧链）
rec, radii = [], []
for L in open(os.path.join(WORK, "receptor.pdb")):
    if not L.startswith("ATOM"):
        continue
    resi = int(L[22:26]); name = L[12:16].strip()
    el = (L[76:78].strip() or name[0]).upper()
    if el in ("H", "D"):
        continue
    if resi in DROP and name not in BACKBONE:
        continue
    rec.append([float(L[30:38]), float(L[38:46]), float(L[46:54])])
    radii.append(VDW.get(el, 1.70))
rec = np.array(rec); radii = np.array(radii)
print(f"受体原子 {len(rec)}（已去掉 {sorted(DROP)} 的侧链）", flush=True)

tree = cKDTree(rec)
lo = c0 - BOX / 2
NI = int(math.floor(BOX[0] / STEP)) + 1
NJ = int(math.floor(BOX[1] / STEP)) + 1
NK = int(math.floor(BOX[2] / STEP)) + 1
GI, GJ, GK = np.meshgrid(np.arange(NI), np.arange(NJ), np.arange(NK), indexing="ij")
P = np.stack([lo[0] + STEP * GI.ravel(), lo[1] + STEP * GJ.ravel(), lo[2] + STEP * GK.ravel()], 1)
d, idx = tree.query(P, k=1)
D = (d - radii[idx]).reshape(NI, NJ, NK)

best = np.full((NI, NJ, NK), -1e9, dtype=np.float32)
par = {}
q = []
for i in range(NI):
    for j in range(NJ):
        for k in range(NK):
            if i in (0, NI - 1) or j in (0, NJ - 1) or k in (0, NK - 1):
                best[i, j, k] = D[i, j, k]
                q.append((-D[i, j, k], i, j, k))
heapq.heapify(q)
NB = [(a, b, c) for a in (-1, 0, 1) for b in (-1, 0, 1) for c in (-1, 0, 1) if not (a == b == c == 0)]
while q:
    nb, i, j, k = heapq.heappop(q)
    nb = -nb
    if nb < best[i, j, k] - 1e-6:
        continue
    for a, b, c in NB:
        ii, jj, kk = i + a, j + b, k + c
        if not (0 <= ii < NI and 0 <= jj < NJ and 0 <= kk < NK):
            continue
        cand = min(nb, float(D[ii, jj, kk]))
        if cand > best[ii, jj, kk] + 1e-6:
            best[ii, jj, kk] = cand
            par[(ii, jj, kk)] = (i, j, k)
            heapq.heappush(q, (-cand, ii, jj, kk))

gc = tuple(np.clip(np.round((c0 - lo) / STEP).astype(int), 0, [NI - 1, NJ - 1, NK - 1]))
print(f"去掉侧链后：口袋点瓶颈 B={float(best[gc]):.2f} Å，局部间隙 D={float(D[gc]):.2f} Å", flush=True)
print(f"配体重原子最小 vdW 半径 1.52 Å；判定：{'仍不够（侧链松弛救不了）' if float(best[gc]) < 1.52 else '够单原子通过（侧链松弛可能可行）'}", flush=True)

# 新闸门定位：回溯最优路径 → 最小 D 节点 → 附近残基（用未裁剪的 receptor.pdb 坐标）
path = [gc]
while path[-1] in par:
    path.append(par[path[-1]])
gate = min(path, key=lambda t: D[t])
gp = lo + STEP * np.array(gate)
res = []
for L in open(os.path.join(WORK, "receptor.pdb")):
    if L.startswith("ATOM"):
        x, y, z = float(L[30:38]), float(L[38:46]), float(L[46:54])
        dd = math.sqrt((x - gp[0]) ** 2 + (y - gp[1]) ** 2 + (z - gp[2]) ** 2)
        if dd < 4.0:
            res.append((dd, L[17:20].strip(), int(L[22:26]), L[12:16].strip()))
res.sort()
seen, out = set(), []
for dd, rn, ri, an in res:
    if (rn, ri) not in seen:
        seen.add((rn, ri)); out.append(f"{rn}{ri}({dd:.1f}Å)")
print(f"新闸门 {gp.round(2)}（D={float(D[gate]):.2f} Å）4 Å 内残基：", ", ".join(out[:12]), flush=True)

