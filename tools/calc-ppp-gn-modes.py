import json, os
ROOT = "public/assets/ligands3d"
def load(i):
    with open(os.path.join(ROOT, f"{i}.json"), encoding="utf-8") as f:
        a = json.load(f)
    return len([x for x in a["atoms"] if x["el"] != "H"]), a["shape"]["vdwVolumeA3"], a["shape"]["maxExtentA"]

def show(label, subs, prods, topology):
    sv = sum(load(i)[1] for i in subs if load(i)[1])
    pv = sum(load(i)[1] for i in prods if load(i)[1])
    sa = sum(load(i)[0] for i in subs)
    pa = sum(load(i)[0] for i in prods)
    dv = (pv - sv) / sv * 100 if sv else 0
    print(f"{label:7s} atoms {sa:2d}->{pa:2d} V {sv:6.1f}->{pv:6.1f} dV {dv:+6.2f}% topo={topology} "
          f"hit={'YES' if sa == pa and topology and abs(dv) <= 2.5 else 'no'}")

show("ppp-o1", ["g6p-g6pd"], ["6pgl"], True)
show("ppp-o2", ["6pgl"], ["6pg-l"], True)
show("ppp-o3", ["6pg"], ["ru5p"], True)
show("ppp-n1", ["ru5p-i"], ["r5p"], True)
show("ppp-n2", ["ru5p"], ["xu5p"], False)
show("ppp-n3", ["xu5p", "r5p"], ["gap", "s7p"], True)
show("ppp-n4", ["s7p", "gap"], ["e4p", "f6p"], True)
show("ppp-n5", ["xu5p", "e4p"], ["f6p", "gap"], True)
show("gn-1", ["pyr-gn"], ["oaa"], True)
show("gn-2", ["oaa"], ["pep"], True)
show("gn-3", ["pep"], ["2pg"], True)
show("gn-4", ["2pg"], ["3pg"], True)
show("gn-5", ["3pg"], ["bpg13"], True)
show("gn-6", ["bpg13"], ["gap"], True)
show("gn-7", ["gap"], ["dhap"], True)
show("gn-8", ["gap", "dhap"], ["fbp-gn"], True)
show("gn-9", ["fbp-gn"], ["f6p-gn"], True)
show("gn-10", ["f6p"], ["g6p"], True)
show("gn-11", ["g6p"], ["glc"], True)
show("gn-cori", ["lac"], ["pyr-gn"], True)
show("gn-ala", ["ala", "akg"], ["pyr-gn", "glu"], True)
