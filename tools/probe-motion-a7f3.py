"""
一次性探针（非生产代码，跑完可删）：简谐约束 + 软排斥下的配体最小能量松弛微基准。
用途：测「这台 CPU 上 numpy 每步内力/能量计算能跑多快」，据此判断离线生成 60 帧轨迹的上限。
输入：public/assets/steps/gly-06/{holo.pdb, ligand.sdf, pocket.json}（GAPDH / NAD，1U8F）。
输出：控制台一份可抄进报告的实测数字。

口径：
  E = k_b * Σ(|x_i - x_j| - d0_ij)^2          # 配体键长简谐（d0 = 初始结构键长）
    + k_rep * Σ max(0, r_min - r_ij)^2          # 配体原子 vs 口袋蛋白原子的软球排斥
    + k_anchor * Σ |x_i - c|^2                  # 向口袋中心 c 的弱简谐吸引
  原子配对集合与斥力 pair 列表每 20 步重建一次（模拟邻接表刷新成本）。
  优化器：最速下降 + 固定步长（不追求收敛，只测吞吐）。
"""
import json
import time
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parent.parent
STEP = ROOT / "public" / "assets" / "steps" / "gly-06"


def parse_pdb(path, chain=None, resi_set=None):
    names, resns, coords = [], [], []
    with open(path, encoding="utf-8", errors="ignore") as fh:
        for line in fh:
            if not line.startswith(("ATOM", "HETATM")):
                continue
            alt = line[16]
            if alt not in (" ", "A"):
                continue
            ch = line[21]
            resi = int(line[22:26])
            if chain and ch != chain:
                continue
            if resi_set and resi not in resi_set:
                continue
            atom_name = line[12:16].strip()
            element = line[76:78].strip() or atom_name[0]
            if element == "H":  # 只留重原子，避免氢原子把体量测虚
                continue
            names.append(atom_name)
            resns.append(line[17:20].strip())
            coords.append([float(line[30:38]), float(line[38:46]), float(line[46:54])])
    return names, resns, np.array(coords, dtype=np.float64)


def parse_sdf(path):
    lines = Path(path).read_text(encoding="utf-8", errors="ignore").splitlines()
    counts = lines[3]
    n_atoms = int(counts[0:3])
    names, coords = [], []
    for i in range(n_atoms):
        ln = lines[4 + i]
        names.append(ln[31:34].strip())
        coords.append([float(ln[0:10]), float(ln[10:20]), float(ln[20:30])])
    return names, np.array(coords, dtype=np.float64)


pocket = json.loads((STEP / "pocket.json").read_text(encoding="utf-8"))
resi_set = {r["resi"] for r in pocket["residues"]}

p_names, p_resns, p_xyz = parse_pdb(STEP / "holo.pdb", chain="P", resi_set=resi_set)
l_names, l_xyz = parse_sdf(STEP / "ligand.sdf")
lig_c0 = l_xyz.mean(axis=0)
centroid = p_xyz.mean(axis=0)  # 口袋中心 = 口袋残基重原子的几何中心

print(f"[体系] 配体 {len(l_xyz)} 原子；口袋残基 {len(resi_set)} 个 -> 蛋白重原子 {len(p_xyz)} 个")
print(f"[体系] 口袋中心 {np.round(centroid, 2).tolist()}；配体初始质心 {np.round(lig_c0, 2).tolist()}；"
      f"初始距离 {np.linalg.norm(lig_c0 - centroid):.2f} Å")

# 配体键（按距离推断，<1.9 Å），d0 取初始结构
d = np.linalg.norm(l_xyz[:, None, :] - l_xyz[None, :, :], axis=-1)
ii, jj = np.where((d > 0.4) & (d < 1.9))
mask = ii < jj
bi, bj = ii[mask], jj[mask]
d0 = d[bi, bj]
print(f"[体系] 配体键 {len(bi)} 条")

K_B, K_REP, K_ANCHOR = 500.0, 60.0, 0.35
R_MIN = 3.0
PAIR_CUT = 8.0


def build_pairs(x):
    dd = np.linalg.norm(x[:, None, :] - p_xyz[None, :, :], axis=-1)
    a, b = np.where(dd < PAIR_CUT)
    return a, b, dd[a, b]


def energy_grad(x, pairs):
    # 键（配体内部，固定索引 bi/bj）
    dv = x[bj] - x[bi]
    r = np.linalg.norm(dv, axis=1)
    eb = K_B * ((r - d0) ** 2).sum()
    coef = 2.0 * K_B * (r - d0) / np.maximum(r, 1e-9)
    gb = np.zeros_like(x)
    np.add.at(gb, bi, -coef[:, None] * dv)
    np.add.at(gb, bj, coef[:, None] * dv)
    # 排斥（配体原子 pa vs 蛋白原子 pb）
    pa = pairs[0]
    pb = pairs[1]
    pv = x[pa] - p_xyz[pb]
    pr = np.linalg.norm(pv, axis=1)
    overlap = np.maximum(0.0, R_MIN - pr)
    er = K_REP * (overlap ** 2).sum()
    gc = (-2.0 * K_REP * overlap / np.maximum(pr, 1e-6))[:, None]
    gr = np.zeros_like(x)
    np.add.at(gr, pa, gc * pv)
    # 锚定
    dcen = x - centroid
    ea = K_ANCHOR * (dcen ** 2).sum()
    ga = 2.0 * K_ANCHOR * dcen
    return eb + er + ea, gb + gr + ga


def run(x0, steps, lr, label, pairs_refresh=20, tag=""):
    """位移上限步进：每步最多移动 lr 埃，避免固定步长在刚性弹簧下发散。"""
    x = x0.copy()
    pairs = build_pairs(x)
    t_refresh = 0.0
    e = None
    t0 = time.perf_counter()
    for k in range(steps):
        if k % pairs_refresh == 0:
            tr = time.perf_counter()
            pairs = build_pairs(x)
            t_refresh += time.perf_counter() - tr
        e, g = energy_grad(x, pairs)
        gmax = np.abs(g).max() + 1e-12
        x -= lr * g / gmax
    dt = time.perf_counter() - t0
    disp = np.linalg.norm(x - x0, axis=1).mean()
    rmsd = float(np.sqrt(((x - x0) ** 2).sum(axis=1).mean()))
    print(
        f"[{label}] {len(x)} 原子 x {steps} 步 = {dt * 1000:.1f} ms"
        f"（{dt / steps * 1e6:.0f} µs/步，邻接表刷新占 {t_refresh * 1000:.1f} ms）"
        f" | E={e:.2f} | 原子平均位移 {disp:.3f} Å | RMSD {rmsd:.3f} Å {tag}"
    )
    return x, dt


def run_lbfgs(x0, maxiter, label):
    from scipy.optimize import minimize

    pairs0 = build_pairs(x0)
    n_eval = [0]

    def fg(flat):
        n_eval[0] += 1
        yy = flat.reshape(-1, 3)
        pairs = build_pairs(yy) if n_eval[0] % 20 == 1 else pairs0
        e, g = energy_grad(yy, pairs)
        return e, g.ravel()

    t0 = time.perf_counter()
    res = minimize(fg, x0.ravel(), jac=True, method="L-BFGS-B",
                   options={"maxiter": maxiter, "ftol": 1e-10})
    dt = time.perf_counter() - t0
    y = res.x.reshape(-1, 3)
    rmsd = float(np.sqrt(((y - x0) ** 2).sum(axis=1).mean()))
    print(
        f"[{label}] L-BFGS-B {res.nit} 次迭代 / {n_eval[0]} 次能量+梯度 = {dt * 1000:.1f} ms"
        f"（{dt / max(n_eval[0], 1) * 1e6:.0f} µs/次）| E={res.fun:.3f} | RMSD {rmsd:.3f} Å | {res.message}"
    )
    return y, dt, n_eval[0]


if __name__ == "__main__":
    # 1) 小体系，2000 步（题目要求的松弛实证）
    out, dt1 = run(l_xyz, 2000, 0.01, "A 简谐松弛 2000 步")

    # 2) 同体系 10 倍步数，看线性度
    _, dt2 = run(l_xyz, 20000, 0.01, "B 简谐松弛 20000 步")

    # 3) 全蛋白固定 + 配体（2523 原子受体）不同步数
    for steps in (100, 1000):
        _, dt3 = run(l_xyz, steps, 0.01, f"C 全蛋白受体 {steps} 步", pairs_refresh=10)

    # 3b) 真实最小化：L-BFGS-B
    _, dtlb, nev = run_lbfgs(l_xyz, 500, "C2 L-BFGS 最小化")

    # 4) 纯 pair 力计算吞吐（衡量 MD 风格每步成本的量级）
    pairs = build_pairs(l_xyz)
    x = l_xyz.copy()
    t0 = time.perf_counter()
    n = 500
    for _ in range(n):
        energy_grad(x, pairs)
    dt = time.perf_counter() - t0
    print(f"[D] 单次 44x{len(p_xyz)} 对势能+梯度（固定 pair 列表）= {dt / n * 1e6:.0f} µs/次")

    # 5) 外推：受体原子数放大到 5000
    big = np.repeat(p_xyz, 2, axis=0)
    t0 = time.perf_counter()
    for _ in range(200):
        _ = np.linalg.norm(l_xyz[:, None, :] - big[None, :, :], axis=-1)
    dt = time.perf_counter() - t0
    print(f"[E] 44 x {len(big)} 全广播距离矩阵 = {dt / 200 * 1e6:.0f} µs/次")

    # 6) 全蛋白自对势距离矩阵（2523 重原子全 pair）——纯 numpy MD 的每步下限
    f_names, f_resns, full = parse_pdb(STEP / "holo.pdb", chain="P")
    nfull = len(full)
    t0 = time.perf_counter()
    reps = 5
    for _ in range(reps):
        dd = np.linalg.norm(full[:, None, :] - full[None, :, :], axis=-1)
        _ = (dd < 10.0).sum()
    dt = (time.perf_counter() - t0) / reps
    print(f"[F] 全蛋白 {nfull} 原子自对势距离矩阵 = {dt * 1000:.1f} ms/次（仅距离，不含能量/梯度）")
    print(f"[G] 若按 1 fs 步长跑 1 ns = 1e6 步，按 F 计每步下限 {dt * 1000:.1f} ms -> {dt * 1e6 / 3600:.1f} 小时/ns")

    # 7) 邻接裁剪版：只保留 8 Å 内 pair，测真实 MD 风格的每步成本（LJ 简化）
    dd = np.linalg.norm(full[:, None, :] - full[None, :, :], axis=-1)
    pi, pj = np.where((dd < 8.0) & (dd > 0.4))
    keep = pi < pj
    pi, pj = pi[keep], pj[keep]
    print(f"[H] 8 Å 邻接后全蛋白 pair {len(pi)} 个（{nfull} 原子，密度比 {len(pi) / nfull:.1f} pair/atom）")

    def lj_step(pos, pi, pj):
        dv = pos[pi] - pos[pj]
        r2 = (dv ** 2).sum(axis=1)
        inv = 1.0 / np.maximum(r2, 1.0)
        f = (inv * inv * inv) * 24.0 * (2.0 * inv ** 3 - inv) * inv
        g = np.zeros_like(pos)
        np.add.at(g, pi, f[:, None] * dv)
        np.add.at(g, pj, -f[:, None] * dv)
        return g

    t0 = time.perf_counter()
    reps = 20
    for _ in range(reps):
        _ = lj_step(full, pi, pj)
    dt = (time.perf_counter() - t0) / reps
    print(f"[I] 全蛋白 {nfull} 原子（{len(pi)} pair）一次 LJ 力+落地 = {dt * 1000:.1f} ms/步")
    print(f"[J] 按 [I] 计：1 ns（1e6 步，1 fs）≈ {dt * 1e6 / 3600:.1f} 小时；100 ns ≈ {dt * 1e8 / 3600:.0f} 小时")
