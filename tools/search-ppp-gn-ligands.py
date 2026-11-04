# 临时检索脚本：按配体 comp_id 找 RCSB 条目，读分辨率/方法/物种/蛋白名
import json, urllib.request

COMP = {
    "6pgl": ["6PG", "6PL", "GDL", "PG6"],
    "6pg": ["6PG"],
    "ru5p": ["5RP", "RUP"],
    "r5p": ["R5P", "RP5"],
    "xu5p": ["X5P", "DX5", "XUL"],
    "s7p": ["S7P", "S7H"],
    "e4p": ["E4P", "E4R"],
    "lac": ["LAC", "LCT"],
    "ala": ["ALA"],
    "hco3": ["BCT", "CO3"],
}

def post(url, payload):
    req = urllib.request.Request(url, data=json.dumps(payload).encode(),
                                 headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=60) as r:
        return json.load(r)

def get(url):
    with urllib.request.urlopen(url, timeout=60) as r:
        return json.load(r)

def search(comp):
    q = {
        "query": {"type": "terminal", "service": "text", "parameters": {
            "attribute": "rcsb_nonpolymer_instance_annotation.comp_id",
            "operator": "exact_match", "value": comp}},
        "return_type": "entry",
        "request_options": {"paginate": {"start": 0, "rows": 200}, "results_content_type": ["experimental"]},
    }
    try:
        return [x["identifier"] for x in post("https://search.rcsb.org/rcsbsearch/v2/query", q)["result_set"]]
    except Exception as e:
        print(f"  [{comp}] search fail {e}")
        return []

out = {}
for mid, ids in COMP.items():
    print(f"## {mid}")
    rows = []
    for comp in ids:
        ents = search(comp)
        print(f"  {comp}: {len(ents)} entries")
        for e in ents[:40]:
            try:
                d = get(f"https://data.rcsb.org/rest/v1/core/entry/{e}")
                meth = d["exptl"][0]["method"] if d.get("exptl") else "?"
                res = (d.get("rcsb_entry_info") or {}).get("resolution_combined")
                res = res[0] if res else None
                org = ((d.get("rcsb_entity_source_organism") or [{}])[0]).get("ncbi_scientific_name")
                title = d["struct"]["title"]
                rows.append((e, comp, meth, res, org, title))
            except Exception as ex:
                print("   err", e, ex)
    rows.sort(key=lambda x: (x[3] is None, x[3] or 99))
    for r in rows[:25]:
        print(f"  {r[0]} {r[1]} {r[3]} {r[2][:12]:12s} {r[4]} | {r[5][:80]}")
    out[mid] = rows

with open("tools/cache/ppp-gn-ligand-search.json", "w", encoding="utf-8") as f:
    json.dump(out, f, ensure_ascii=False, indent=1)
