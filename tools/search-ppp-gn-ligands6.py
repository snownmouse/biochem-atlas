# 临时检索脚本 6：打印 GLU / PYR 全部标题，检查 LAC 化学定义
import json, urllib.request

def post(url, payload):
    req = urllib.request.Request(url, data=json.dumps(payload).encode(),
                                 headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=90) as r:
        return json.load(r)

def get(url):
    with urllib.request.urlopen(url, timeout=90) as r:
        return json.load(r)

def comp_entries(comp, org="Homo sapiens", maxres=2.5, rows=120):
    nodes = [{"type": "terminal", "service": "text", "parameters": {
        "attribute": "rcsb_nonpolymer_instance_annotation.comp_id",
        "operator": "exact_match", "value": comp}},
        {"type": "terminal", "service": "text", "parameters": {
            "attribute": "rcsb_entry_info.resolution_combined",
            "operator": "less_or_equal", "value": maxres}}]
    if org:
        nodes.append({"type": "terminal", "service": "text", "parameters": {
            "attribute": "rcsb_entity_source_organism.taxonomy_lineage.name",
            "operator": "exact_match", "value": org}})
    q = {"query": {"type": "group", "logical_operator": "and", "nodes": nodes},
         "return_type": "entry",
         "request_options": {"paginate": {"start": 0, "rows": rows}, "results_content_type": ["experimental"]}}
    return [x["identifier"] for x in post("https://search.rcsb.org/rcsbsearch/v2/query", q)["result_set"]]

def info(e):
    d = get(f"https://data.rcsb.org/rest/v1/core/entry/{e}")
    res = (d.get("rcsb_entry_info") or {}).get("resolution_combined")
    return (res[0] if res else None), d["struct"]["title"]

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
