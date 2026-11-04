# 临时检索脚本 4：组合条件检索（配体 + 物种 + 蛋白名 + 分辨率）
import json, urllib.request

def post(url, payload):
    req = urllib.request.Request(url, data=json.dumps(payload).encode(),
                                 headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=90) as r:
        return json.load(r)

def get(url):
    with urllib.request.urlopen(url, timeout=90) as r:
        return json.load(r)

def q_comp(comp, org=None, desc=None, maxres=2.5, rows=60):
    nodes = [{"type": "terminal", "service": "text", "parameters": {
        "attribute": "rcsb_nonpolymer_instance_annotation.comp_id",
        "operator": "exact_match", "value": comp}}]
    nodes.append({"type": "terminal", "service": "text", "parameters": {
        "attribute": "rcsb_entry_info.resolution_combined",
        "operator": "less_or_equal", "value": maxres}})
    if org:
        nodes.append({"type": "terminal", "service": "text", "parameters": {
            "attribute": "rcsb_entity_source_organism.taxonomy_lineage.name",
            "operator": "exact_match", "value": org}})
    if desc:
        nodes.append({"type": "terminal", "service": "text", "parameters": {
            "attribute": "rcsb_polymer_entity.pdbx_description",
            "operator": "contains_phrase", "value": desc}})
    q = {"query": {"type": "group", "logical_operator": "and", "nodes": nodes},
         "return_type": "entry",
         "request_options": {"paginate": {"start": 0, "rows": rows}, "results_content_type": ["experimental"]}}
    try:
        return [x["identifier"] for x in post("https://search.rcsb.org/rcsbsearch/v2/query", q)["result_set"]]
    except Exception as e:
        print("  fail", comp, desc, e)
        return []

def info(e):
    d = get(f"https://data.rcsb.org/rest/v1/core/entry/{e}")
    res = (d.get("rcsb_entry_info") or {}).get("resolution_combined")
    res = res[0] if res else None
    meth = d["exptl"][0]["method"] if d.get("exptl") else "?"
    try:
        p = get(f"https://data.rcsb.org/rest/v1/core/polymer_entity/{e}/1")
        org = (p.get("rcsb_entity_source_organism") or [{}])[0].get("ncbi_scientific_name")
        name = p["rcsb_polymer_entity"]["pdbx_description"]
    except Exception:
        org = name = None
    return res, meth, org, name, d["struct"]["title"]

CASES = [
    ("LAC", "Homo sapiens", "lactate dehydrogenase"),
    ("PYR", "Homo sapiens", "lactate dehydrogenase"),
    ("ALA", "Homo sapiens", "alanine aminotransferase"),
    ("GLU", "Homo sapiens", "alanine aminotransferase"),
    ("GLU", "Homo sapiens", "glutamate dehydrogenase"),
    ("FBP", None, "fructose-1,6-bisphosphatase"),
]
for comp, org, desc in CASES:
    print(f"### {comp} | {org} | {desc}")
    for e in q_comp(comp, org, desc):
        try:
            r = info(e)
            print(f"  {e} {r[0]} {r[1][:12]:12s} {r[2]} | {r[3]} | {r[4][:70]}")
        except Exception as ex:
            print("  err", e, ex)
