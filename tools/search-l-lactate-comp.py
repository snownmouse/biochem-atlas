import json, urllib.request

def post(url, payload):
    req = urllib.request.Request(url, data=json.dumps(payload).encode(),
                                 headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=90) as r:
        return json.load(r)

q = {"query": {"type": "terminal", "service": "chemical", "parameters": {
        "attribute": "rcsb_chem_comp_descriptor.comp_id",
        "operator": "exact_match", "value": "LAC"}},
     "return_type": "mol_definition",
     "request_options": {"paginate": {"start": 0, "rows": 10}}}
try:
    print([x["identifier"] for x in post("https://search.rcsb.org/rcsbsearch/v2/query", q)["result_set"]])
except Exception as e:
    print("search fail", e)

# 用 text 服务在 CCD 里搜 L-LACTIC ACID
for service in ["text", "text_chem"]:
    q2 = {"query": {"type": "terminal", "service": service, "parameters": {"value": "L-LACTIC ACID"}},
          "return_type": "mol_definition",
          "request_options": {"paginate": {"start": 0, "rows": 20}}}
    try:
        r = post("https://search.rcsb.org/rcsbsearch/v2/query", q2)
        print(service, [(x["identifier"], x.get("match_context", [{}])[0].get("values", [{}])[0].get("context")) for x in r["result_set"]])
    except Exception as e:
        print(service, "fail", e)
