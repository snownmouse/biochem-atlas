# 临时检索脚本 2：配体定义 + 候选条目详情（物种/蛋白名/链）
import json, urllib.request

def get(url):
    with urllib.request.urlopen(url, timeout=60) as r:
        return json.load(r)

CHEM = ["6PL", "6PG", "5RP", "R5P", "DX5", "S7P", "E4P", "LAC", "ALA", "BG6", "BCT", "CO2", "PEP", "2PG", "3PG", "FBP", "G3P", "DHAP", "GLC", "MAL", "OAA", "PYR"]
print("### chem comps")
for c in CHEM:
    try:
        d = get(f"https://data.rcsb.org/rest/v1/core/chemcomp/{c}")
        print(c, "|", d["chem_comp"]["name"], "|", d["chem_comp"]["formula"], "|", d["chem_comp"]["type"])
    except Exception as e:
        print(c, "ERR", e)

ENTRIES = ["7SNI", "3E7F", "2W90", "3OVQ", "2VVP", "4KXV", "5XPS", "3S1U", "3M6L", "2R5N", "4R75", "1PIN", "1CZA", "1F05", "1U0G", "1HCB", "9NUC", "9EOL", "4P77", "3HHE", "4M8L", "1UJ5", "7UF1", "3K7S", "1ONR", "1FWT", "1NGS", "2J8G"]
print("\n### entries")
for e in ENTRIES:
    try:
        d = get(f"https://data.rcsb.org/rest/v1/core/entry/{e}")
        meth = d["exptl"][0]["method"] if d.get("exptl") else "?"
        res = (d.get("rcsb_entry_info") or {}).get("resolution_combined")
        ents = get(f"https://data.rcsb.org/rest/v1/core/polymer_entity/{e}/1")
        org = (ents.get("rcsb_entity_source_organism") or [{}])[0].get("ncbi_scientific_name")
        print(f"{e} {res} {meth} | {org} | {ents['rcsb_polymer_entity']['pdbx_description']} | {d['struct']['title'][:90]}")
    except Exception as ex:
        print(e, "ERR", ex)
