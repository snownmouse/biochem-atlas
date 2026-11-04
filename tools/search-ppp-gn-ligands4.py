# 临时检索脚本 5：宽检索后本地按标题过滤（LAC/PYR/ALA/GLU）
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

if __name__ == "__main__":
    for c in ["LAC", "ALA", "GLU", "PYR"]:
        print("###", c)
        try:
            ents = comp_entries(c)
        except Exception as e:
            print("  fail", e); continue
        rows = []
        for e in ents:
            try:
                r, t = info(e)
                rows.append((e, r, t))
            except Exception:
                pass
        kw = ["dehydrogenase", "aminotransferase", "transaminase", "lactate", "alanine"]
        hits = [x for x in rows if any(k.lower() in x[2].lower() for k in kw)]
        hits.sort(key=lambda x: x[1] or 99)
        print(f"  total {len(rows)}, keyword hits {len(hits)}")
        for x in hits[:18]:
            print(f"  {x[0]} {x[1]} | {x[2][:90]}")
