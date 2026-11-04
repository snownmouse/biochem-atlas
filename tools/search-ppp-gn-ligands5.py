# 临时检索脚本 6：打印 GLU / PYR 全部标题，检查 LAC 化学定义
import json, urllib.request
from search_ppp_gn_ligands4 import comp_entries, info

def get(url):
    with urllib.request.urlopen(url, timeout=90) as r:
        return json.load(r)

for c in ["GLU", "PYR"]:
    print("###", c)
    for e in comp_entries(c):
        try:
            r, t = info(e)
            print(f"  {e} {r} | {t[:100]}")
        except Exception as ex:
            print("  err", e, ex)

for c in ["LAC", "ALA", "GLU", "6PG", "5RP", "R5P", "S7P", "E4P", "BG6", "FBP"]:
    try:
        d = get(f"https://data.rcsb.org/rest/v1/core/chemcomp/{c}")
        desc = d["chem_comp"].get("pdbx_chem_comp_descriptor", [])
        smi = [x["descriptor"] for x in desc if x["type"] in ("SMILES_CANONICAL", "SMILES", "SMILES_DEPICTED")]
        print(f"{c} | {d['chem_comp']['name']} | {d['chem_comp']['formula']} | {smi[:1]}")
    except Exception as ex:
        print(c, "ERR", ex)
