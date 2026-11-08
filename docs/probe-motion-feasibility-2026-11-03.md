# 分子模拟工具链可行性勘察

- 日期：2026-11-03
- 范围：只做勘察与实测，不安装任何软件/包，不改 `src/`、不改 `public/assets`，无 git 提交。
- 实测脚本：`tools/probe-motion-a7f3.py`、`tools/probe-grid-score-c81d.py`（均为一次性探针，见文末"纪律与临时产物"）。

---

## 0. 一句话结论

**这台机器属于"能跑对接 + 只能轻量数值近似"档：Windows 侧有可用的 AutoDockFR 1.0（实跑 3.5 秒级完成一次小规模 GA 对接），有 numpy/scipy/rdkit/meeko 可做自建势能的配体松弛与轨迹生成；但没有任何 MD 引擎（OpenMM / GROMACS / NAMD / LAMMPS 全缺），GPU 虽为 RTX 4060 Laptop 8 GB 却只有 `torch+cpu`，纯 numpy 全原子 MD 约 5.8 小时/纳秒，比"真 MD"差 3–4 个数量级。**

**补正（2026-11-03 二次勘察）**：WSL 侧**不是空的**——`wolfoclock` conda 环境里已有 **AutoDock Vina 1.2.7（Python bindings）+ rdkit 2026.3.5 + meeko 0.8.0 + numpy/scipy**，本次已用它在真实复合物 1U8F（GAPDH/NAD）上跑通对接：`exhaustiveness=8` 用时 **28.0 s**，最佳 pose **−10.66 kcal/mol**。第一次漏查的原因是两层：① Vina 装成 Python 模块（`site-packages/vina`），**没有 CLI 可执行文件**，`which vina` 永远为空；② 我用的是非交互 `bash -lc`，不加载 `~/.bashrc` 里的 conda hook，PATH 里连 conda 都没有。谁要复现，必须 `conda activate wolfoclock`（或直接用 `/root/miniconda3/envs/wolfoclock/bin/python`）。

---

## 1. 硬件事实

| 项目 | 实测值 |
|---|---|
| CPU | Intel Core i7-14700HX，20 核 / 28 逻辑线程，基频 2.1 GHz |
| 内存 | 16,873,545,728 B ≈ 15.7 GiB |
| GPU | NVIDIA GeForce RTX 4060 Laptop，8188 MiB 显存，驱动 595.79，CUDA 13.2 |
| GPU 计算栈 | **无**：`torch 2.4.1+cpu`，`torch.cuda.is_available() = False`；无 CUDA Toolkit |
| numpy 后端 | OpenBLAS 0.3.23，`2000×2000` 矩阵乘 92.8 ms（≈172 GFLOP/s 量级） |
| WSL 资源 | 28 核可见，**内存仅 7 GB**（WSL 默认上限），swap 2 GB；GPU 直通可用（`nvidia-smi` 在 WSL 内能看到 4060） |

---

## 2. Windows 侧能力表

### 2.1 Python 环境

`python 3.11.5`（`<ANACONDA_HOME>\python.exe`），另有 `<PROGRAMDATA>\anaconda3` 与 `<ANACONDA_HOME>\envs\mineru`。

| 包 | 状态 | 版本 |
|---|---|---|
| numpy | **有** | 1.26.4 |
| scipy | **有** | 1.17.1 |
| rdkit | **有**（`rdkit-pypi`） | 2022.09.5 |
| meeko | **有** | 0.8.0（pdbqt 准备可用） |
| numba | **有** | 0.57.1 |
| torch | **有但 CPU 版** | 2.4.1+cpu |
| pandas / matplotlib | 有 | 2.0.3 / 3.7.2 |
| **openmm** | **缺** | PyPI 有 8.6.1，win_amd64 轮子 13.16 MB |
| **biopython / prody / mdtraj / MDAnalysis / parmed** | **全缺** | — |
| openbabel（Python 绑定）/ ase / pyscf | 缺 | — |

### 2.2 命令行工具（PATH 内）

`gmx`、`gromacs`、`vina`、`gnina`、`smina`、`obabel`、`tleap`、`namd`、`namd2`、`lammps`、`autodock`、`autodock4`、`autogrid4`(PATH 内)、`pdb2pqr`、`mcce`、`rosetta` —— **全部不在 PATH**。

磁盘检索（`<D_DRIVE_ROOT>`、`Program Files`、`%USERPROFILE%`，深度 4）也未找到 `vina*.exe` / `smina*.exe` / `gnina*.exe` / `gmx.exe` / `namd2.exe`。

### 2.3 但有一条"隐性"工具链：ADFRsuite 1.0

`<ADFR_HOME>\` 已安装 **AutoDockFR 1.0**（Scripps，AD4 打分 + 柔性受体对接），本次**实跑验证可用**：

| 可执行 | 作用 | 实测 |
|---|---|---|
| `<ADFR_HOME>\bin\adfr.bat` | ADFR 对接引擎（GA，多核） | **可用**，见 §3.1 |
| `<ADFR_HOME>\bin\agfr.bat` | 生成 AutoDock 网格 `target.trg`（内含 `*.map`） | **可用**，27.1 s |
| `<ADFR_HOME>\bin\prepare_receptor.bat` | MGLTools `prepare_receptor4.py`（PDB→PDBQT、加氢、加电荷） | **可用** |
| `<ADFR_HOME>\bin\prepare_ligand.bat` | `prepare_ligand4.py`（配体→PDBQT） | **可用** |
| `autogrid4.exe` / `autosite` / `reduce` | 网格 / 口袋检测 / 加氢 | 已在，未逐一深测 |
| `<ADFR_HOME>\OpenBabel-2.4.1\obabel.exe` | 格式转换（SDF→PDBQT 实测成功） | **可用，但必须设 `BABEL_DATADIR`** |
| 同目录 `obenergy.exe` | UFF/MMFF94 单点能量 | **可用**（UFF 单点实测返回） |
| 同目录 `obminimize.exe` | 力场最小化 | **不可用**：运行即 `0xC0000005` 访问违规（2016 年老构建） |

可用力场（`obabel -L forcefields`）：UFF、MMFF94、MMFF94s、GAFF、Ghemical。

**踩到的两个坑（写进工具链规范）**：

1. ADFR 的 `.bat` 传入**绝对 Windows 路径会失败**（脚本把路径吃掉只留 basename），必须 `cd` 到目标目录后用**相对文件名**。
2. `prepare_receptor4.py -U nonstdres` **不会**删掉蛋白链里的 HETATM 配体——第一次受体 `receptor.pdbqt` 里混进了 NAD 本身，导致网格全是位阻、对接分数变成 +616 kcal/mol。必须自己先只保留 `ATOM` 行。

其他"缺什么"的重量（**只估不装**）：

| 想装的 | 估计重量 | 备注 |
|---|---|---|
| `vina`（对接） | wheel **6.84 MB** + 依赖 ≈ 30–50 MB | **Windows 无 pip 轮子**，只能 WSL 装或 conda-forge |
| `openmm`（MD） | Windows 轮子 **13.16 MB**（CPU 平台） | CUDA 平台另需 CUDA Toolkit（GB 级）或 conda `cuda` 构建（~200–400 MB） |
| GROMACS | ~0.5–1 GB（含 CUDA） | conda-forge / 官方包 |
| gnina | 5–10 GB 容器 | 需 Linux + CUDA |
| `torch` CUDA 版 | ~2.5 GB 下载 | 现有是 CPU 版，GPU 用不上 |

---

## 3. WSL 侧能力表（二次勘察，已补全）

| 项 | 实测 |
|---|---|
| 发行版 | `Ubuntu`（默认），Ubuntu 22.04.5 LTS (Jammy)，WSL2 内核 `6.18.33.2-microsoft-standard-WSL2`；无 Docker Desktop 发行版 |
| 非交互执行 | 可以，`wsl -e bash -c "..."` 正常 |
| 用户 / HOME | `root` / `/root`（uid 0，无其他用户目录） |
| CPU / 内存 | `nproc = 28`；`free -g` 总内存 **7 GB**，swap 2 GB |
| GPU | 直通可用，`nvidia-smi` 识别 RTX 4060 8 GB；**无 `/usr/local/cuda`** |
| conda | `/root/miniconda3`，envs：**`base`** 与 **`wolfoclock`**（`~/.bashrc` 第 101–114 行有 conda init block，非交互 shell 不生效） |
| base 环境 | 几乎空（无 numpy） |
| **wolfoclock 环境** | **vina 1.2.7（pip，Python bindings）**、rdkit 2026.3.5、rdkit-pypi 2022.9.5、meeko 0.8.0、numpy 1.26.4、scipy 1.17.1；Python 3.11.16 |
| Vina 可执行 | **无 CLI**，`envs/wolfoclock/bin` 下没有 `vina`，只有模块 `/root/miniconda3/envs/wolfoclock/lib/python3.11/site-packages/vina` |
| meeko 工具 | **有**，`envs/wolfoclock/bin/mk_prepare_ligand.py`、`mk_prepare_receptor.py`、`mk_export.py` |
| obabel / gmx / namd2 / lammps / smina / gnina | 全缺 |
| 历史证据 | `~/.bash_history` 有 `cah2_project/data/inputs/*.pdbqt`、`backend=vina：物理打分` 等记录；`/root/wolfoclock-lite/smoke_vina_real.log` 是真实的 Vina 运行日志（满屏 "low exhaustiveness" 警告） |
| 既有工程 | `/root/wolfoclock-lite/`（含 `wolfoclock/score/vina_adapter.py`，用 `Vina(sf_name="vina")` + `score_only` 做虚拟筛选） |

**结论：WSL 这侧已经具备"Vina 对接 + rdkit/meeko 制备"的完整链路，不需要安装任何东西。**

---

## 4. 实跑实证（真实数字）

### 4.1 对接实证之一：Windows 侧 ADFR（Vina 在 WSL，见 §4.6）

命令（在 `%TEMP%\adfr-probe` 下，全部用相对路径）：

```powershell
# 1) 配体：项目资产 SDF → PDB → PDBQT
<ADFR_HOME>\bin\prepare_ligand.bat -l ligand.pdb -o ligand.pdbqt
# 2) 受体：holo.pdb 只保留 ATOM（去掉 NAD），再 prep
<ADFR_HOME>\bin\prepare_receptor.bat -r holo_protein.pdb -o receptor2.pdbqt -A checkhydrogens -U nphs_lps_waters_nonstdres
# 3) 生成 AutoDock4 网格（box 由配体自动包围）
<ADFR_HOME>\bin\agfr.bat -r receptor2.pdbqt -l ligand.pdbqt -o target2.trg
# 4) 小规模对接
<ADFR_HOME>\bin\adfr.bat -l ligand.pdbqt -t target2.trg -J probe2 -n 2 -p 10 -e 20000 -g 20 -c 8 -O -o run2
```

实测结果：

| 阶段 | 耗时 |
|---|---|
| 受体准备（2523 重原子 + 加氢 / 加 Gasteiger 电荷） | 数秒级（未单独计时） |
| AGFR 网格（`64×36×60` 间隔、0.375 Å，含 vdW/静电/去溶剂/梯度） | **27.1 s** |
| ADFR 对接（2 代 GA × 20,000 次评估，8 核） | **3.47 s** |
| 输出 | `run2_out.pdbqt` 共 **2 个 MODEL（2 个 pose）**；分数 **−2.9 / −2.6 kcal/mol** |

评估吞吐：40,000 次打分 / 3.47 s ≈ **11,500 次/秒（8 核）**。

**这次分数不可用于科学结论**：项目的 `ligand.sdf` 文件头自述"键全部按共价半径推断写成单键"，ADFR 据此推原子类型，NAD 的芳香环/磷酸基类型是错的（真实 NAD 正常应到 −8 ~ −11 kcal/mol 量级）。本次只用于回答"引擎能不能跑、一次要多久"。

### 4.2 简谐约束 + 配体向口袋中心松弛（题目要求的最小实证）

体系：`public/assets/steps/gly-06/` 的 1U8F 复合物，配体 NAD 44 重原子，口袋 28 个残基 → 蛋白重原子 215 个；口袋中心 `[11.73, 22.83, 27.80]`，配体初始质心距中心 2.08 Å；配体键 48 条（按距离 <1.9 Å 推断，`d0` 取初始结构）。
势能（自建、任意单位）：`E = 500·Σ(|r_ij|−d0)² + 60·Σ max(0, 3.0−r)² + 0.35·Σ|x−c|²`（键长简谐 + 配体-蛋白软球排斥 + 向口袋中心弱简谐）。最速下降，位移上限步进。

| 实验 | 规模 | 耗时 | 结果 |
|---|---|---|---|
| A 松弛 | 44 原子 × **2000 步** | **495 ms**（247 µs/步；邻接表刷新占 23.5 ms） | E = 122.2；原子平均位移 3.72 Å；RMSD 3.99 Å |
| B 加长 | 44 原子 × 20,000 步 | 4.64 s（232 µs/步） | E = 36.98；RMSD 6.40 Å（越走越散，简谐势没有真实吸引项） |
| C 全受体固定 | 44 原子 × 1000 步 | 245 ms | E = 241.7；位移 2.53 Å |
| C2 真最小化 | L-BFGS-B，**592 次**能量+梯度 | **248 ms**（418 µs/次） | 撞 500 次迭代上限，E = 30.16 |

**核心数字：44 原子 × 2000 步 ≈ 0.5 秒（约 4,000 次能量+梯度/秒，单核）。**

### 4.3 用 ADFR 网格打分做"势能面"的吞吐（关键路线验证）

把 AGFR 的 `target2.trg` 当打分函数（AutoDock4 亲和图 + 三线性插值），44 原子直接求能量：

| 项 | 实测 |
|---|---|
| 晶体姿态总能量 | **−19.36 kcal/mol**（数值合理） |
| 平移 +6 Å | **+160.57**（撞蛋白，合理） |
| 平移 +12 Å | +227.68 |
| 单次 44 原子全姿态打分 | **365 µs（≈2,742 次/秒，单核）** |
| 只做平移的 6D 路径：60 帧 × 200 步 × 7 次打分 | **28.5 s**；但**单起点会卡住**（终点仍偏离晶体姿态 8.05 Å、E=+50），说明必须多起点/退火，不能指望一次局部下降 |

（网格索引口径：AGFR 的 `NELEMENTS 64 36 60` 是**间隔数**，点数 = 65×37×61 = 146,705，最后一维 x 最快；原点 = `center − (n−1)/2·spacing`，与 `maps.xyz` 完全对上。）

### 4.4 自建 Langevin 连续轨迹的吞吐

44 原子配体 + 固定 2523 原蛋白，软球 + 简谐 + Langevin，邻接表每 20 步重建：

| 实验 | 结果 |
|---|---|
| 3000 步 | 1,471 ms → **490 µs/步**（其中约 0.3 ms 是每 20 步一次的 44×2523 距离矩阵） |
| 60 帧 × 每帧 1000 步 | **29.4 s（单核）** |

### 4.5 真全原子 MD 的上限（纯 numpy）

| 实验 | 结果 |
|---|---|
| 2808 原子全 pair 距离矩阵 | 322.5 ms/次（不含能量与梯度） |
| 8 Å 邻接后 **122,167 pair**，一次 LJ 力 + 落地 | **20.8 ms/步** |
| 外推 | **≈5.8 小时/纳秒**（1 fs 步长）；**100 ns ≈ 578 小时** |
| 若跑 1 µs（一次配体结合事件的常见尺度） | **≈5,800 小时** |

### 4.6 Vina 真实对接实证（WSL `wolfoclock` 环境）

**环境**：`/root/miniconda3/envs/wolfoclock/bin/python`（Python 3.11.16），`vina 1.2.7` Python bindings（无 CLI）。
**体系**：1U8F GAPDH（`holo.pdb` 去掉 HETATM 后 → `prepare_receptor4` → `receptor2.pdbqt`，加氢 + Gasteiger）；配体 = 同一结构里的 NAD（从 `holo.pdb` 的 HETATM NAD 提取 → OpenBabel 2.4.1 → `nad_only.pdbqt`，44 原子 / 7 个可旋转键）。
**盒**：center `[11.556, 24.631, 29.335]`，box `22×18×22 Å`。

```python
from vina import Vina
v = Vina(sf_name="vina", cpu=8, seed=42, verbosity=0)
v.set_receptor("/root/probe-dock/receptor2.pdbqt")
v.set_ligand_from_file("/root/probe-dock/nad_only.pdbqt")
v.compute_vina_maps(center=[11.556, 24.631, 29.335], box_size=[22.0, 18.0, 22.0])
v.dock(exhaustiveness=8, n_poses=8)
v.write_poses("/root/probe-dock/vina_out.pdbqt", n_poses=8, overwrite=True)
```

| 阶段 | 耗时（输入在 ext4） | 耗时（输入放在 `/mnt/c`） |
|---|---|---|
| `set_receptor` | **18.7 ms** | 47.6 **s** |
| `set_ligand_from_file` | **591 ms** | 628.5 **s** |
| `compute_vina_maps` | **382 ms** | 387.6 **s** |
| `dock(exhaustiveness=4, n_poses=8)` | **23.6 s** | — |
| `dock(exhaustiveness=8, n_poses=8)` | **28.0 s** | 27.2 s |

> **关键坑**：同样的 251 KB 受体、4.7 KB 配体，放在 Windows 盘（`/mnt/c`，9p）读取比 ext4 慢 **1000 倍**（配体 591 ms → 628 s）。所有 PDBQT 必须先 `cp` 到 WSL 的 ext4 再跑，否则会误以为"Vina 极慢"。

得分表（`exhaustiveness=8`，8 个 pose，总和 = inter + intra）：

| mode | total (kcal/mol) | inter | intra | 扭转数 |
|---|---|---|---|---|
| 1 | **−10.662** | −17.518 | −1.803 | 7 |
| 2 | −10.587 | −17.479 | −1.719 | 7 |
| 3 | −10.376 | −17.212 | −1.639 | 7 |
| 4 | −10.300 | −17.613 | −1.114 | 7 |
| 5 | −10.005 | −16.548 | −1.695 | 6 |
| 6 | −9.896 | −16.644 | −1.419 | 6 |
| 7 | −9.831 | −16.340 | −1.616 | 6 |
| 8 | −9.685 | −16.166 | −1.551 | 6 |

输出 `vina_out.pdbqt` **8 个 MODEL**。与晶体 NAD 叠合（Kabsch，按原子序）：mode 1 **3.81 Å**、mode 2 4.37 Å、mode 3 4.97 Å——属于"重新对接没有精确复现晶体构象"的典型水平（NAD 有 7 个扭转自由度；且 OpenBabel 从无 CONECT 的 PDB 感知键级只认出 5 个芳香碳，类型不完美）。

**两个决定路线可行性的延迟**：

| 调用 | 延迟 | 含义 |
|---|---|---|
| `v.score()`（当前位姿） | **0.024 ms**（≈52,000 次/秒） | 打分本身极快，**但只能打"当前已载入的那个位姿"** |
| `v.set_ligand_from_string(pdbqt)`（换位姿） | **452 ms/次** | 每改一次坐标就要 0.45 s → **不可能用 Python API 做逐步（per-step）轨迹打分**（2000 步/帧 = 15 min/帧） |
| `v.write_maps()`（导出网格） | **0.222 s**，6 张 `.map` 各约 1.2 MB | 需要 `force_even_voxels=True` 才能写；导出后可用自建打分器（见 §4.3 的 365 µs/姿态） |

**结论：Vina 在这台机器上是"能用"的，但它只适合产出离散 pose 与可复用网格，不适合做逐步积分的引擎。**

**从现有资产到 PDBQT 的转换链（实测哪一步最脆）**：

| 步骤 | 可用路径 | 实测结果 | 脆弱点 |
|---|---|---|---|
| 受体 | `holo.pdb` → 只留 `ATOM` → `prepare_receptor4.py`（ADFRsuite） | ✅ 可用，Vina 载入 18.7 ms | **必须先删 HETATM 配体/水**（否则网格被自身配体位阻污染，分数会变成 +616） |
| 受体（替代） | `mk_prepare_receptor.py`（meeko，WSL 有） | 未验证 | 需要 `reduce`/`prody` 补氢时可能缺依赖 |
| 配体 A | 项目 `ligand.sdf` → `prepare_ligand4.py` | ✅ 能转，**但 SDF 全单键 → 原子类型错**（ADFR 打分 −2.9，不可用） | **键级/芳香性**是最大坑 |
| 配体 B | `holo.pdb` 的 HETATM NAD → `obabel` → PDBQT | ✅ 可用，芳香碳识别出 5 个，Vina 打分 −10.66（合理） | 无 CONECT 时靠几何感知，部分环识别不全 |
| 配体 C | RDKit 建 mol → `mk_prepare_ligand.py`（meeko 0.8.0） | 链路在，但**需要先有正确键级的 mol** | 与 A 同一个坑：源头 SDF 就是错的 |

**也就是说：真正脆的不是转换工具，而是"配体化学结构的键级/质子化态"这一环。** 项目现有 `ligand.sdf` 是从 PDB HETATM 导出的全单键结构，直接喂给 ADFR/Vina/meeko 都会得到错误的原子类型；目前唯一走通的是"PDB → OpenBabel 几何感知"。

---

## 5. "生成一条 2 秒 / 60 帧的配体轨迹"的时间账

先校准口径：**2 秒动画 ≠ 2 秒物理**。真实结合事件是 ns–µs 尺度，60 帧只能把"慢放"的画法做出来，帧与物理时间没有可声称的映射。

| 路线 | 机器时间（本机实测外推） | 可行性 | 可信度 |
|---|---|---|---|
| **A. 网格打分 + 自建 6D 采样器**（ADFR 网格做势能 + 多起点 Langevin/退火） | 60 帧 × 1000–2000 次打分 ≈ **22–44 s 单核**；8 进程并行 <10 s | **可行，且是唯一"物理解得通"的低成本路线** | 几何/位阻/接触级；不是动力学 |
| **B. 自建势能 Langevin**（简谐 + 软球 + 隐式近似） | 60 帧 × 1000 步 ≈ **29 s 单核** | 可行 | 更低：没有静电/去溶剂，朝向易漂 |
| **C. 每帧跑一次 Vina/ADFR 对接再插值** | 60 × 23.6 s ≈ **24 min**（exh 8 则 28 min） | 可跑，但输出是**离散且无序的 pose**，必须自己插值 + 碰撞规避 | "看起来连续、但不物理"的伪轨迹 |
| **D. 真 MD（OpenMM/GROMACS）再抽帧** | 本机无可跑引擎；若装上 GPU 版，2800 原子体系约 100–300 ns/天，1 µs 需 **3–10 天** | 当前不可行 | 唯一真正物理，但采样不到结合事件 |

**回答"用 Vina 生成一段 2 秒 60 帧结合轨迹现实多久"（基于实测，不是估算）：**

**机器时间**：一条轨迹 = 1 次 Vina 对接（23.6–28.0 s）+ 路径优化（60 帧 × 1000–2000 次打分 × 365 µs ≈ 22–44 s）+ 导出，合计 **约 1–2 分钟/条**。机器时间不是瓶颈。

**但 Vina 的 Python API 不能直接当积分器**：`score()` 只要 0.024 ms，可惜只能打"当前载入的那个位姿"；每换一个位姿要 `set_ligand_from_string` **452 ms**。按每帧 2000 步算，用 Vina 自己逐步打分是 **15 分钟/帧、15 小时/条**——不可行。唯一可行的用法是：**用 Vina 出网格与参考 pose，轨迹由自建打分器生成**。

**具体步骤清单**（每步都有本机实测依据）：

1. **受体准备（一次性）**：`holo.pdb` 滤掉 HETATM（水/配体）→ ADFR `prepare_receptor.bat` → `receptor.pdbqt`；`cp` 到 WSL ext4（**不要留在 `/mnt/c`**）。
2. **配体准备**：从 `holo.pdb` 提取 HETATM 配体 → `obabel` → `.pdbqt`（或 RDKit 修键级后走 `mk_prepare_ligand.py`）。
3. **建网格**：`Vina(sf_name="vina", cpu=8)` → `set_receptor` / `set_ligand_from_file` / `compute_vina_maps(..., force_even_voxels=True)`，约 **0.4 s**；`write_maps()` 导出 6 张 `.map`（**0.22 s，各约 1.2 MB**）。
4. **出参考 pose**：`dock(exhaustiveness=8, n_poses=8)` = **28.0 s**，得 8 个 pose（最佳 −10.66 kcal/mol），用于确定"终点"和校验位姿合理性。
5. **路径优化（自建）**：用导出的 `.map` 做三线性插值打分器（numpy 实测 **365 µs/姿态**；numba/向量化后可再降一个量级），在 6 维位姿空间（3 平移 + 3 旋转四元数）跑**多起点退火 / Langevin**：
   - 起点 = 口袋外 8–12 Å 的随机朝向（8–32 个）；
   - 每帧 1000–2000 步；每 10–20 步用 `scipy.cKDTree` 做一次受体原子碰撞检查；
   - 单起点会卡住（实测终点仍偏离 8 Å、E=+50），**必须多起点 + 择优**；
   - 60 帧总耗时 **22–44 s 单核**。
6. **导出与接入**：位姿序列 → 配体坐标 → 现有帧 JSON 格式（每帧记录坐标 + 标注）→ 前端播放。
7. **工程工作量**：`.map` 读取器 + 6D 采样器 + 碰撞/平滑 + 导出脚本 ≈ **1–2 周**（不含前端播放）。

**如果要求"物理正确"，答案仍是做不到**：真实结合需要 µs 级 MD + 增强采样，而本机纯 numpy 全原子 MD 是 5.8 小时/纳秒，量级差 3–4 个数量级；WSL 也没有 MD 引擎。

---

## 6. 任何方案下都模拟不了的段落

| 段落 | 为什么不行 | 替代呈现建议 |
|---|---|---|
| **酶催化断键/成键**（糖酵解第 4 步裂解、第 9 步脱水、第 10 步磷酸基转移等） | 需要 QM/MM 或至少反应势能面；经典力场无法描述键级变化 | 2D 反应式 + 原子级高亮 + 明确标注"机理示意，非模拟结果"（沿用现有 2D 结构式帧体例） |
| **氢负/质子转移、电荷态变化**（GAPDH 的 Cys-S⁻ 亲核、NAD⁺ 氢负转移） | 同上；且质子化态在经典 FF 中被固定 | 结构帧 + 箭头；文案只描述"实验结构给出的相对位置"，不给能量 |
| **金属配位变化**（ENO2 / PK 的 Mg²⁺） | 需要极化力场或 QM/MM；经典 12-6 LJ 处理二价金属不可靠 | 结构帧 + 配位几何标注 |
| **大尺度构象变化**（loop 开合、domain motion、活性位点呼吸） | 需要 µs–ms 级 MD 或增强采样；本机 5.8 h/ns 完全不够 | 多实验结构 morph（已有帧带做法）+ 明确标"跨结构插值" |
| **结合自由能 / 动力学速率（k_on、k_off、Kd）** | 需要 FEP/伞形采样/马尔可夫模型，远超本机 | 不做数值；若要比较，只用同一打分函数做**相对排序**并标注"打分排序≠亲和力" |
| **溶剂 / 熵 / 长程静电** | 需要显式水 + PME；本机无 MD 引擎 | 隐式/真空近似，或不做；页面上不给"溶剂校正"字样 |
| **诱导契合的侧链重排** | 刚体受体做不到；ADFR 的柔性侧链也只在离散 rotamer 空间 | 用 ADFR 柔性对接（可跑）或只做刚体，并如实标注"受体刚性" |

---

## 7. 如果只做"物理驱动但精度有限"，具体怎么做

### 7.1 势函数

- **主势**：直接复用 **AGFR 生成的 AutoDock4 网格**（`target.trg` 里的 `rigidReceptor.*.map`）——vdW/氢键/去溶剂/静电都已烘焙，三线性插值即可求值（实测 **365 µs/姿态**）。这是本机**唯一**"有真实力场成分、且零安装"的势。
- **内势**：配体键长/键角/扭转用简谐项（RDKit 读出参考几何），手性/芳香平面用约束惩罚项；受体固定（可选：ADFR 柔性侧链只在对接时用，轨迹阶段固定）。
- 若嫌网格分辨率粗（0.375 Å），可自行用原子坐标 + LJ + 库仑（距离依赖介电）算，代价更高（§4.2 的 247 µs/步）。

### 7.2 约束与自由度

- **6 自由度刚体**（3 平移 + 3 旋转四元数）优先：稳定、快、朝向可采样；配体内部构象先冻结。
- 需要"手性/内部形变"时再加 4–8 个扭转自由度（NAD 这种长链辅因子约 8 个可旋转键）。
- **多起点**：8–32 个随机旋转 × 远近不同的平移起点；每个起点先粗退火再精修，最后按能量 + RMSD 聚类择优（实测单起点会卡在 +50 kcal/mol，必须多起点）。
- **帧生成**：每帧 1000–5000 步（步长 0.01–0.05 Å 或 Langevin 温度参数化）；60 帧总成本 30 s–4 min 单核，可并行。

### 7.3 可信边界

| 可以取用的结论 | 不能取用的结论 |
|---|---|
| 位姿在几何上是否可行（无碰撞、键长合理） | 亲和力数值、ΔG、Kd |
| 接触残基 / 氢键候选是否成立（±0.5 Å 级） | 氢键强度、质子化态 |
| 同一体系内不同位姿的**相对**打分排序 | 跨体系打分比较、绝对能量 |
| 局部松弛（1–3 Å 内构象微调） | 大构象变化、loop 开合 |
| 朝向/进入路径"看起来合理" | 真实进入路径、动力学时间尺度、机理 |

**一句话：可以声称"这是在该打分函数下的低能路径与几何可行位姿"，不能声称"这是分子真实运动"。** 页面文案必须带这个限定（建议复用现有的 `provenance` / `honesty` 机制，新增一档 `physics-lite`）。

---

## 8. 最小代价路径（Vina 已存在，无需安装；以下为换机器时的备选）

本机 **不需要安装**：`wolfoclock` 环境已有 vina 1.2.7 + meeko + rdkit。复现命令：

```bash
# WSL 内（不要用非交互 shell 直接 which，conda hook 不加载）
source /root/miniconda3/etc/profile.d/conda.sh
conda activate wolfoclock
python -c "from vina import Vina; print('ok')"
```

如果换一台空机器，最小路径与体积（**只估不装**）：

| 方案 | 命令 | 体积 |
|---|---|---|
| WSL + pip（推荐，与本机一致） | `pip install vina==1.2.7 meeko rdkit numpy scipy` | vina 轮子 6.84 MB + 依赖 ≈ 30–50 MB |
| Windows 原生 | —— | **无 win 轮子**（PyPI 只有 manylinux/musllinux），只能 conda-forge 碰运气 |
| 只要 ADFR（Windows） | 装 ADFRsuite 1.0 | ~200 MB 安装包（本机已有） |
| 想要真 MD | `pip install openmm`（Windows 13.16 MB 轮子，CPU 平台） | 加 CUDA 平台需 CUDA Toolkit（GB 级） |

---

## 9. 纪律与临时产物

- 未安装任何包；未改 `src/`、`public/assets`；项目不是 git 仓库（`git status` 报 `not a git repository`），未做任何提交。
- 一次性探针（**可随时删除**，已按 `tools/probe-*` 命名并标注）：
  - `tools/probe-motion-a7f3.py` —— 简谐松弛 / L-BFGS / 全原子 LJ / Langevin 微基准
  - `tools/probe-grid-score-c81d.py` —— AGFR 网格打分吞吐（用环境变量 `TRG` 指到 `target*.trg`）
- 中间产物：
  - Windows：`%TEMP%\adfr-probe\`（`target2.trg`、`run2_*.dlg`、`receptor2.pdbqt`、`nad_only.pdbqt`、`vina_out.pdbqt` 等）
  - WSL：`/root/probe-dock/`（`receptor2.pdbqt`、`nad_only.pdbqt`、`vina_out.pdbqt`、`vmaps.*.map` 6 张）
  - 临时探针脚本：`%TEMP%\probe-wsl.sh`、`%TEMP%\vina_probe*.py`、`%TEMP%\probe-dock-setup.sh`
  - 以上全部在临时目录，**不在项目目录内**。
- 复现要点：ADFR `.bat` 必须 `cd` 后用相对路径；受体 PDB 必须先滤掉 HETATM 配体再用 `prepare_receptor`；OpenBabel CLI 必须设 `BABEL_DATADIR=<ADFR_HOME>\OpenBabel-2.4.1\data`；WSL 跑 Vina 必须先把输入拷到 ext4，且必须激活 `wolfoclock`（非交互 shell 里 `which vina` 始终为空，因为它是 Python 模块）。
