#!/usr/bin/env python3
# ============================================================
# probe-open-state.py —— 一次性探针（不是生产代码，可删）
# 问题：3UCD（holo，闭合）在该口袋处的瓶颈只有 1.1 Å。换成同酶同物种的 apo 1TE6，
#       把它的链 A 用 Cα Kabsch 叠到 3UCD 坐标系，再量同一口袋点的「最大可通行球半径」。
#       若 apo 明显更宽 → 说明卡点是构象闭合，而不是打分/算法；修复路径应是「换开放构象」而非加侧链。
# 运行：/root/miniconda3/envs/wolfoclock/bin/python probe-open-state.py
# ============================================================
import heapq
import math
import os

import numpy as np
from scipy.spatial import cKDTree

WORK = "/root/probe-dock/gk9"
STEP = 0.4
BOX = np.array([28.5, 27.0, 30.0])
VDW = {"C": 1.70, "N": 1.55, "O": 1.52, "S": 1.80, "P": 1.80}


def parse_pdb(path):
    at = []
    for L in open(path):
        if L.startswith("ATOM"):
            at.append({
                "name": L[12:16].strip(), "resn": L[17:20].strip(), "chain": L[21:22].strip(),
                "resi": int(L[22:26]), "el": (L[76:78].strip() or L[12:16].strip()[0]).upper(),
                "xyz": np.array([float(L[30:38]), float(L[38:46]), float(L[46:54])]),
            })
    return at


def kabsch(A, B):
    ca, cb = A.mean(0), B.mean(0)
    H = (A - ca).T @ (B - cb)
    U, S, Vt = np.linalg.svd(H)
    d = np.sign(np.linalg.det(Vt.T @ U.T))
    D = np.diag([1, 1, d])
    R = Vt.T @ D @ U.T
    return R, cb - R @ ca


holo = parse_pdb(os.path.join(WORK, "holo.pdb"))
apo = parse_pdb(os.path.join(WORK, "1TE6.pdb"))
lig = np.array([
    [float(L[30:38]), float(L[38:46]), float(L[46:54])]
    for L in open(os.path.join(WORK, "holo.pdb"))
    if L.startswith("HETATM") and L[17:20].strip() == "2PG" and L[21:22].strip() == "A"
])

# 3UCD 链 A Cα
ca_h = {(a["resi"], a["resn"]): a["xyz"] for a in holo if a["chain"] == "A" and a["name"] == "CA"}
# 1TE6 选链：与 3UCD Cα 重合最多的一条
best = None
for ch in sorted({a["chain"] for a in apo if a["name"] == "CA"}):
    ca_a = {(a["resi"], a["resn"]): a["xyz"] for a in apo if a["chain"] == ch and a["name"] == "CA"}
    keys = sorted(set(ca_h) & set(ca_a))
    if len(keys) > (best[0] if best else 0):
        best = (len(keys), ch, keys)
n_match, ch, keys = best
A = np.array([ca_h[k] for k in keys])
B = np.array([{ (a["resi"], a["resn"]): a["xyz"] for a in apo if a["chain"] == ch and a["name"] == "CA"}[k] for k in keys])
R, t = kabsch(B, A)
rmsd = float(np.sqrt(np.mean(np.sum((B @ R.T + t - A) ** 2, axis=1))))
print(f"1TE6 链 {ch} → 3UCD 链 A：匹配 Cα {n_match} 个，叠合 RMSD {rmsd:.2f} Å", flush=True)

apo_ch = [a for a in apo if a["chain"] == ch and a["el"] not in ("H", "D")]
rec = np.array([a["xyz"] for a in apo_ch]) @ R.T + t
radii = np.array([VDW.get(a["el"], 1.70) for a in apo_ch])
c0 = lig.mean(0)
print(f"apo 受体 {len(rec)} 原子；目标口袋点（3UCD 2PG 质心）{c0.round(2)}", flush=True)


def widest_path(rec, radii, c0):
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
                heapq.heappush(q, (-cand, ii, jj, kk))
    gc = tuple(np.clip(np.round((c0 - lo) / STEP).astype(int), 0, [NI - 1, NJ - 1, NK - 1]))
    return float(best[gc]), float(D[gc]), NI * NJ * NK


B, Dloc, n = widest_path(rec, radii, c0)
print(f"apo 1TE6：格点 {n}，口袋点瓶颈 B={B:.2f} Å，局部间隙 D={Dloc:.2f} Å", flush=True)
print(f"对照 3UCD：B=1.12 Å（0.4 Å 网格）。apo {'更宽' if B > 1.4 else '同样闭合'}", flush=True)
