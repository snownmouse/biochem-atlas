# 临时检索脚本 3：针对 FBP / LAC / ALA / PYR 找本酶络合物
import json, urllib.request

def post(url, payload):
    req = urllib.request.Request(url, data=json.dumps(payload).encode(),
                                 headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=60) as r:
        return json.load(r)

def get(url):
    with urllib.request.urlopen(url, timeout=60) as r:
        return json.load(r)

def comp_entries(comp):
    q = {"query": {"type": "terminal", "service": "text", "parameters": {
        "attribute": "rcsb_nonpolymer_instance_annotation.comp_id",
        "operator": "exact_match", "value": comp}},
        "return_type": "entry",
        "request_options": {"paginate": {"start": 0, "rows": 200}, "results_content_type": ["experimental"]}}
    try:
        return [x["identifier"] for x in post("https://search.rcsb.org/rcsbsearch/v2/query", q)["result_set"]]
    except Exception as e:
        return []

def text(text):
    q = {"query": {"type": "terminal", "service": "full_text", "parameters": {"value": text}},
         "return_type": "entry",
         "request_options": {"paginate": {"start": 0, "rows": 100}, "results_content_type": ["experimental"]}}
    try:
        return [x["identifier"] for x in post("https://search.rcsb.org/rcsbsearch/v2/query", q)["result_set"]]
    except Exception as e:
        print("  text fail", e)
        return []

def info(e):
    d = get(f"https://data.rcsb.org/rest/v1/core/entry/{e}")
    meth = d["exptl"][0]["method"] if d.get("exptl") else "?"
    res = (d.get("rcsb_entry_info") or {}).get("resolution_combined")
    res = res[0] if res else None
    try:
        ents = get(f"https://data.rcsb.org/rest/v1/core/polymer_entity/{e}/1")
        org = (ents.get("rcsb_entity_source_organism") or [{}])[0].get("ncbi_scientific_name")
        name = ents["rcsb_polymer_entity"]["pdbx_description"]
    except Exception:
        org = name = None
    return res, meth, org, name, d["struct"]["title"]

for comp in ["FBP", "PYR"]:
    print(f"### comp {comp}")
    rows = []
    for e in comp_entries(comp):
        try:
            r = info(e)
            rows.append((e, *r))
        except Exception as ex:
            pass
    rows = [r for r in rows if r[1] is not None and r[1] <= 2.5]
    rows.sort(key=lambda x: x[1])
    for r in rows[:20]:
        print(f"  {r[0]} {r[1]} {r[2][:12]:12s} {r[3]} | {r[4]} | {r[5][:70]}")

for q in ["lactate dehydrogenase L-lactate complex", "human alanine aminotransferase alanine complex", "alanine aminotransferase PLP alanine human"]:
    print(f"### text {q}")
    for e in text(q)[:15]:
        try:
            r = info(e)
            print(f"  {e} {r[0]} {r[1][:12]:12s} {r[2]} | {r[3]} | {r[4][:70]}")
        except Exception:
            pass
