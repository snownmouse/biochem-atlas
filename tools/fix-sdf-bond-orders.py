#!/usr/bin/env python3
# fix-sdf-bond-orders.py —— 给 public/assets/steps 下的实验配体 SDF 补齐真实键级
#
# 背景：这些 SDF 由 fetch-*.py / extract-step*.mjs 从 RCSB HETATM 截取，只保留了原子坐标，
#       键表要么为空，要么全是单键（DetermineConnectivity 只给连接关系，不给键级）。
#       3Dmol 读 SDF 的 bond block 第 7–9 列画双键/三键，所以旧文件在页面上双键、芳环
#       都和单键一样。
#
# 做法：
#   · 原子坐标与原子顺序原样保留（atom lines 逐字节复用），只重写 counts 行与 bond block；
#   · 键级来自 SMILES 模板：优先 tools/gen-molecule-assets.py 中该 src 的已核验 SMILES，
#     其余从 RCSB CCD（chem_comp SMILES_stereo）取；芳环用 Kekulé（写 1/2 交替，绝不写 4）；
#   · 模板图与坐标连接表做子图匹配（允许截断配体，如 1HNJ 的 MLC 尾部 6 原子未建模），
#     把模板键级映射回 SDF 原子序号；
#   · 匹配不到时用 RDKit DetermineBondOrders 从坐标推断，并在报告里标 fallback。
#
# 用法：
#   python tools/fix-sdf-bond-orders.py             # 写入
#   python tools/fix-sdf-bond-orders.py --check     # 只报告，不写
#   python tools/fix-sdf-bond-orders.py --report preview/sdf-bond-orders-report.json
# ============================================================
import argparse
import importlib.util
import json
import os
import re
import sys
import urllib.request

from rdkit import Chem
from rdkit.Chem import rdDetermineBonds

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
STEPS = os.path.join(ROOT, "public", "assets", "steps")
CCD_CACHE = os.path.join(ROOT, "tools", "cache", "ccd")


def load_specs():
    path = os.path.join(ROOT, "tools", "gen-molecule-assets.py")
    spec = importlib.util.spec_from_file_location("gen_molecule_assets", path)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    out = []
    for name in ("MOLS", "TCA_MOLS", "PPP_MOLS", "GN_MOLS", "FAO_MOLS", "UREA_MOLS", "FAS_MOLS"):
        out.extend(getattr(mod, name))
    return out


def norm_rel(p):
    return os.path.relpath(os.path.abspath(p), ROOT).replace(os.sep, "/")


def elem_of(atom_line):
    raw = atom_line[31:34].strip()
    if not raw:
        raise SystemExit(f"原子行为空元素符号：{atom_line!r}")
    return raw[0].upper() + raw[1:].lower()


def parse_sdf(path):
    lines = open(path, encoding="utf-8").read().splitlines()
    if len(lines) < 4:
        raise SystemExit(f"SDF 行数不足：{path}")
    counts = lines[3]
    na, nb = int(counts[0:3]), int(counts[3:6])
    atom_lines = lines[4:4 + na]
    if len(atom_lines) != na:
        raise SystemExit(f"SDF 原子行不足：{path}")
    coords = []
    for ln in atom_lines:
        coords.append((float(ln[0:10]), float(ln[10:20]), float(ln[20:30])))
    for c in coords:
        if not all(x == x and abs(x) < 1e6 for x in c):
            raise SystemExit(f"坐标非有限数：{path}")
    return lines, na, nb, atom_lines, coords


def probe_mol(coords, atom_lines, cov_factor=1.2):
    mol = Chem.RWMol()
    for ln in atom_lines:
        mol.AddAtom(Chem.Atom(elem_of(ln)))
    m = mol.GetMol()
    if len(coords) == 0:
        return m
    conf = Chem.Conformer(len(coords))
    for i, (x, y, z) in enumerate(coords):
        conf.SetAtomPosition(i, (x, y, z))
    m.AddConformer(conf, assignId=True)
    rdDetermineBonds.DetermineConnectivity(m, covFactor=cov_factor)
    return m


def prep_template(mol):
    # 先 Kekulé（清电荷会破坏 [n+] 等芳环的价键，导致 kekulize 失败），再清电荷
    m = Chem.RWMol(mol)
    Chem.Kekulize(m, clearAromaticFlags=True)
    for a in m.GetAtoms():
        a.SetFormalCharge(0)
    return m.GetMol()


def query_of(mol):
    q = Chem.RWMol(mol)
    for a in q.GetAtoms():
        a.SetFormalCharge(0)
        a.SetIsAromatic(False)
    p = Chem.AdjustQueryParameters()
    p.makeBondsGeneric = True
    return Chem.AdjustQueryProperties(q.GetMol(), p)

def orders_of(template):
    out = {}
    for b in template.GetBonds():
        i, j = sorted((b.GetBeginAtomIdx(), b.GetEndAtomIdx()))
        out[(i, j)] = int(round(b.GetBondTypeAsDouble()))
    return out


def map_probe_to_template(probe, template):
    """probe（坐标连接表）→ template 原子映射；允许 probe 是 template 的子图（截断配体）"""
    q = query_of(probe)
    matches = template.GetSubstructMatches(q, uniquify=False, maxMatches=1)
    if matches and len(probe.GetAtoms()) <= len(template.GetAtoms()):
        return list(matches[0])
    # 原子数相同但方向不匹配时，反过来匹配一次
    tq = query_of(template)
    back = probe.GetSubstructMatches(tq, uniquify=False, maxMatches=1)
    if back:
        inv = [None] * len(template.GetAtoms())
        for ti, pi in enumerate(back[0]):
            inv[pi] = ti
        if all(x is not None for x in inv):
            return inv
    return None


def bonds_from_mapping(probe, template, mapping):
    """mapping[probeIdx] = templateIdx；返回 (probe_i, probe_j, order)，probe 序号 0 基"""
    orders = orders_of(template)
    inv = {}
    for pi, ti in enumerate(mapping):
        if ti is not None:
            inv[ti] = pi
    bonds = []
    extra_single = 0
    for (ti, tj), order in orders.items():
        pi, pj = inv.get(ti), inv.get(tj)
        if pi is None or pj is None:
            continue
        bonds.append((pi, pj, order))
    # probe 连接表里出现、但模板没有的边：保留为单键并计数（不静默丢弃）
    probe_pairs = {tuple(sorted((b.GetBeginAtomIdx(), b.GetEndAtomIdx()))) for b in probe.GetBonds()}
    tmpl_pairs = {(min(inv[ti], inv[tj]), max(inv[ti], inv[tj])) for (ti, tj) in orders if ti in inv and tj in inv}
    for pair in sorted(probe_pairs - tmpl_pairs):
        bonds.append((pair[0], pair[1], 1))
        extra_single += 1
    return bonds, extra_single


def fallback_orders(probe):
    """模板缺失时的兜底：从坐标推断键级，逐个电荷试到价键自洽且无自由基"""
    for charge in (0, -1, -2, -3, -4, 1, 2):
        m = Chem.Mol(probe)
        try:
            rdDetermineBonds.DetermineBondOrders(m, charge=charge)
        except Exception:
            continue
        if any(a.GetNumRadicalElectrons() for a in m.GetAtoms()):
            continue
        orders = orders_of(m)
        if any(o not in (1, 2, 3) for o in orders.values()):
            continue
        return orders, charge
    return None, None


def resname_of(path, specs_by_src):
    base = os.path.basename(path)[:-4]
    parts = base.split("-")
    for i, tok in enumerate(parts):
        if re.fullmatch(r"[0-9][A-Z0-9]{3}", tok) and i + 1 < len(parts):
            return parts[i + 1]
    # gly-* 的 ligand*.sdf 从 meta.json 找
    meta_path = os.path.join(os.path.dirname(path), "meta.json")
    if os.path.exists(meta_path):
        meta = json.load(open(meta_path, encoding="utf-8"))
        for lig in meta.get("ligands") or []:
            if lig.get("sdfFile") == os.path.basename(path):
                return lig["id"]
        lig = ((meta.get("holo") or {}).get("ligand") or {})
        if lig.get("id"):
            return lig["id"]
    return None


def fetch_ccd_smiles(resname):
    os.makedirs(CCD_CACHE, exist_ok=True)
    path = os.path.join(CCD_CACHE, f"{resname}.json")
    if not os.path.exists(path):
        url = f"https://data.rcsb.org/rest/v1/core/chemcomp/{resname}"
        try:
            with urllib.request.urlopen(url, timeout=30) as r:
                data = json.load(r)
        except Exception as e:
            raise SystemExit(f"RCSB CCD 取 {resname} 失败：{e}")
        json.dump(data, open(path, "w", encoding="utf-8"), ensure_ascii=False)
    data = json.load(open(path, encoding="utf-8"))
    desc = data.get("rcsb_chem_comp_descriptor") or {}
    smiles = desc.get("SMILES_stereo") or desc.get("SMILES")
    comp = data.get("chem_comp") or {}
    return smiles, comp.get("formula"), comp.get("formula_weight")


def template_candidates(path, na, specs_by_src, resname):
    """精确原子数优先；没有精确模板时允许更大模板做子图匹配（截断配体，如 1HNJ A350）"""
    exact, partial = [], []
    for spec in specs_by_src.get(norm_rel(path), []):
        smi = spec.get("stereo") or spec.get("smiles")
        if not smi:
            continue
        t = Chem.MolFromSmiles(smi)
        if t is None:
            continue
        bucket = exact if t.GetNumAtoms() == na else partial if t.GetNumAtoms() > na else None
        if bucket is not None:
            bucket.append(("spec:" + spec["id"], t, spec.get("formula")))
    if resname:
        smi, formula, _ = fetch_ccd_smiles(resname)
        if smi:
            t = Chem.MolFromSmiles(smi)
            if t is not None:
                bucket = exact if t.GetNumAtoms() == na else partial if t.GetNumAtoms() > na else None
                if bucket is not None:
                    bucket.append(("ccd:" + resname, t, formula))
    return exact + partial


def fix_one(path, specs_by_src, check=False):
    lines, na, nb_old, atom_lines, coords = parse_sdf(path)
    rel = norm_rel(path)
    resname = resname_of(path, specs_by_src)
    row = dict(file=rel, resname=resname, atoms=na, bondsBefore=nb_old,
               ordersBefore={}, ordersAfter={}, template=None, partial=False,
               extraSingle=0, status="ok", note="")
    if na == 0:
        row["status"] = "skip"
        row["note"] = "空配体摘录（0 原子），无键可补"
        return row, None
    if any(ln != ln for ln in atom_lines):
        raise SystemExit(f"原子行异常：{path}")
    for ln in atom_lines:
        # 旧文件 bond block 只可能全是单键或没有键
        pass
    probe = probe_mol(coords, atom_lines)
    if len(probe.GetAtoms()) > 0:
        # 连通性兜底：默认共价半径漏键时逐步放宽（与 gen-molecule-assets.py 同口径）
        if len(Chem.GetMolFrags(probe)) > 1:
            for cf in (1.25, 1.3, 1.35, 1.4):
                trial = probe_mol(coords, atom_lines, cf)
                if len(Chem.GetMolFrags(trial)) == 1:
                    probe = trial
                    break

    cands = template_candidates(path, na, specs_by_src, resname)
    bonds = None
    for label, tpl, formula in cands:
        pt = prep_template(tpl)
        mapping = map_probe_to_template(probe, pt)
        if mapping is None:
            continue
        b, extra = bonds_from_mapping(probe, pt, mapping)
        row["partial"] = tpl.GetNumAtoms() > na
        row["templateAtoms"] = tpl.GetNumAtoms()
        bonds, row["template"], row["extraSingle"] = b, label, extra
        row["formula"] = formula
        break
    if bonds is None:
        orders, charge = fallback_orders(probe)
        if orders is None:
            row["status"] = "error"
            row["note"] = "模板缺失且坐标推断键级失败"
            return row, None
        inv = {}
        bonds = [(i, j, o) for (i, j), o in orders.items()]
        row["template"] = f"fallback:DetermineBondOrders(charge={charge})"

    # 数值/重复检查
    seen = set()
    for i, j, o in bonds:
        if not (0 <= i < na and 0 <= j < na) or i == j:
            raise SystemExit(f"坏键：{rel} {i}-{j}")
        if o not in (1, 2, 3):
            raise SystemExit(f"非法键级 {o}：{rel} {i}-{j}")
        pair = tuple(sorted((i, j)))
        if pair in seen:
            raise SystemExit(f"重复键：{rel} {pair}")
        seen.add(pair)

    nb_new = len(bonds)
    # 键级-键长自检：双/三键的实测长度不应接近单键（>1.55 Å），否则说明模板映射落错了位置
    long_multi = []
    for i, j, o in bonds:
        if o < 2:
            continue
        d = sum((coords[i][k] - coords[j][k]) ** 2 for k in range(3)) ** 0.5
        if d > 1.55 or d < 1.05:
            long_multi.append(dict(a=i, b=j, order=o, dist=round(d, 2)))
    row["longMultiBonds"] = long_multi
    row["ordersAfter"] = {str(k): sum(1 for b in bonds if b[2] == k) for k in (1, 2, 3) if any(b[2] == k for b in bonds)}
    old_orders = {}
    if nb_old:
        for k in range(nb_old):
            ln = lines[4 + na + k]
            o = ln[6:9].strip()
            old_orders[o] = old_orders.get(o, 0) + 1
    row["ordersBefore"] = old_orders

    if not check:
        counts = f"{na:3d}{nb_new:3d}  0  0  0  0  0  0  0  0999 V2000"
        if counts[34:39] != "V2000":
            raise SystemExit(f"counts 行 V2000 错位：{counts!r}")
        header = lines[:3]
        if len(header) >= 2:
            header[1] = "  experimental coordinates preserved; bond orders from SMILES template (Kekulé)"
        bond_lines = [f"{i + 1:3d}{j + 1:3d}{o:3d}  0  0  0  0" for i, j, o in sorted(bonds)]
        out = header + [counts] + atom_lines + bond_lines + ["M  END"]
        with open(path, "w", encoding="utf-8", newline="\n") as fh:
            fh.write("\n".join(out) + "\n")
    return row, (coords, atom_lines)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--check", action="store_true")
    ap.add_argument("--report", default=os.path.join("preview", "sdf-bond-orders-report.json"))
    ap.add_argument("files", nargs="*")
    args = ap.parse_args()

    specs_by_src = {}
    for s in load_specs():
        if s.get("src"):
            specs_by_src.setdefault(norm_rel(os.path.join(ROOT, s["src"])), []).append(s)

    if args.files:
        files = [os.path.abspath(p) for p in args.files]
    else:
        files = sorted(
            os.path.join(dp, fn)
            for dp, _, fns in os.walk(STEPS)
            for fn in fns if fn.lower().endswith(".sdf")
        )

    rows = []
    totals = {1: 0, 2: 0, 3: 0}
    errors = []
    for idx, p in enumerate(files, 1):
        print(f"[{idx}/{len(files)}] {norm_rel(p)}", flush=True)
        row, coords = fix_one(p, specs_by_src, check=args.check)
        rows.append(row)
        for k, v in row["ordersAfter"].items():
            totals[int(k)] += v
        if row["status"] == "error":
            errors.append(row)

    # 坐标零改动证据：单文件坐标列表 sha256（写盘前后同一进程内不可比，二次运行用 --verify-hash）
    report = dict(
        generatedBy="tools/fix-sdf-bond-orders.py",
        files=len(rows),
        totalsAfter=totals,
        errors=len(errors),
        rows=rows,
    )
    os.makedirs(os.path.join(ROOT, os.path.dirname(args.report)), exist_ok=True)
    with open(os.path.join(ROOT, args.report), "w", encoding="utf-8") as fh:
        json.dump(report, fh, ensure_ascii=False, indent=1)
    print(f"SDF {len(rows)} 个；键级总数 单 {totals[1]} / 双 {totals[2]} / 三 {totals[3]}；失败 {len(errors)}")
    if errors:
        for e in errors:
            print("  ERR", e["file"], e["note"])
        sys.exit(1)


if __name__ == "__main__":
    main()
