import json, urllib.request
from rdkit import Chem

def get(url):
    with urllib.request.urlopen(url, timeout=60) as r:
        return json.load(r)

for c in ["LAC", "DLC", "ALA", "GLU", "6PG", "S7P"]:
    try:
        d = get(f"https://data.rcsb.org/rest/v1/core/chemcomp/{c}")
        cc = d["chem_comp"]
        print("##", c, "|", cc["name"], "|", cc["formula"])
        for x in d.get("pdbx_chem_comp_descriptor", []):
            if "SMILES" in x["type"] or x["type"] in ("InChI", "InChIKey"):
                print("   ", x["type"], "=", x["descriptor"])
    except Exception as e:
        print(c, "ERR", e)

for smi in ["C[C@@H](O)C(=O)O", "C[C@H](O)C(=O)O"]:
    m = Chem.MolFromSmiles(smi)
    Chem.AssignStereochemistry(m, cleanIt=True, force=True)
    print(smi, Chem.FindMolChiralCenters(m, useLegacyImplementation=False))
