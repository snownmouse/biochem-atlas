"""Archive-only calculation of standard transformed Gibbs energies (deltaG'°).

数值仅供存档，未在页面展示。当前站点是通路流程图，不展示热力学数值；
如需启用这些数值，必须同步修改页面渲染与 validate-* / smoke-* 断言。

Reproducible conditions are fixed below.  Reactions are written as KEGG compound
IDs; the compound identities were resolved with the KEGG REST API and verified
against the eQuilibrator compound cache (formula + InChIKey).

Run:
    <venv>/Scripts/python.exe tools/calc-deltag-equilibrator.py
"""
import json
import sys
from importlib.metadata import version

from equilibrator_api import ComponentContribution, Q_

CONDITIONS = {
    "tool": f"equilibrator-api {version('equilibrator-api')}",
    "componentContribution": f"component-contribution {version('component-contribution')}",
    "compoundCache": f"equilibrator-cache {version('equilibrator-cache')}",
    "pH": 7.4,
    "ionicStrength": "0.25 M",
    "temperature": "298.15 K",
    "pMg": 14,
    "date": "2026-11-06",
}

cc = ComponentContribution()
cc.pH = Q_(CONDITIONS["pH"])
cc.ionic_strength = Q_(CONDITIONS["ionicStrength"])
cc.temperature = Q_(CONDITIONS["temperature"])
cc.pMg = Q_(CONDITIONS["pMg"])

# id -> reaction (KEGG IDs).  `<=>` is the reversible arrow; eQuilibrator only
# uses the stoichiometric direction to sign the value.
REACTIONS = {
    # ---- gluconeogenesis -------------------------------------------------
    "gn-1": "KEGG:C00022 + KEGG:C00288 + KEGG:C00002 <=> KEGG:C00036 + KEGG:C00008 + KEGG:C00009",
    "gn-2": "KEGG:C00036 + KEGG:C00044 <=> KEGG:C00074 + KEGG:C00035 + KEGG:C00011",
    "gn-3": "KEGG:C00074 + KEGG:C00001 <=> KEGG:C00631",
    "gn-4": "KEGG:C00631 <=> KEGG:C00197",
    "gn-5": "KEGG:C00197 + KEGG:C00002 <=> KEGG:C00236 + KEGG:C00008",
    "gn-6": "KEGG:C00236 + KEGG:C00004 + KEGG:C00080 <=> KEGG:C00118 + KEGG:C00003 + KEGG:C00009",
    "gn-7": "KEGG:C00118 <=> KEGG:C00111",
    "gn-8": "KEGG:C00118 + KEGG:C00111 <=> KEGG:C00354",
    "gn-9": "KEGG:C00354 + KEGG:C00001 <=> KEGG:C05345 + KEGG:C00009",
    "gn-10": "KEGG:C05345 <=> KEGG:C00092",
    "gn-11": "KEGG:C00092 + KEGG:C00001 <=> KEGG:C00031 + KEGG:C00009",
    "gn-cori": "KEGG:C00186 + KEGG:C00003 <=> KEGG:C00022 + KEGG:C00004 + KEGG:C00080",
    "gn-ala": "KEGG:C00041 + KEGG:C00026 <=> KEGG:C00022 + KEGG:C00025",
    # ---- beta-oxidation, instantiated at C16 (palmitoyl-CoA) ----------------
    "fao-act": "KEGG:C00249 + KEGG:C00010 + KEGG:C00002 <=> KEGG:C00154 + KEGG:C00020 + KEGG:C00013",
    "fao-1": "KEGG:C00154 + KEGG:C00016 <=> KEGG:C05272 + KEGG:C01352",
    "fao-2": "KEGG:C05272 + KEGG:C00001 <=> KEGG:C05258",
    "fao-3": "KEGG:C05258 + KEGG:C00003 <=> KEGG:C05259 + KEGG:C00004 + KEGG:C00080",
    "fao-4": "KEGG:C05259 + KEGG:C00010 <=> KEGG:C00024 + KEGG:C02593",
    # ---- fatty acid synthesis ---------------------------------------------
    "fas-pdh": "KEGG:C00022 + KEGG:C00010 + KEGG:C00003 <=> KEGG:C00024 + KEGG:C00011 + KEGG:C00004 + KEGG:C00080",
    "fas-acc": "KEGG:C00024 + KEGG:C00288 + KEGG:C00002 <=> KEGG:C00083 + KEGG:C00008 + KEGG:C00009",
    # ---- cholesterol synthesis ---------------------------------------------
    "ch-1": "2 KEGG:C00024 <=> KEGG:C00332 + KEGG:C00010",
    "ch-2": "KEGG:C00332 + KEGG:C00024 + KEGG:C00001 <=> KEGG:C00356 + KEGG:C00010",
    "ch-3": "KEGG:C00356 + 2 KEGG:C00005 + 2 KEGG:C00080 <=> KEGG:C00418 + KEGG:C00010 + 2 KEGG:C00006",
    "ch-4": "KEGG:C00418 + KEGG:C00002 <=> KEGG:C01107 + KEGG:C00008",
    "ch-5": "KEGG:C01107 + KEGG:C00002 <=> KEGG:C01143 + KEGG:C00008",
    "ch-6": "KEGG:C01143 + KEGG:C00002 <=> KEGG:C00129 + KEGG:C00011 + KEGG:C00008 + KEGG:C00009",
    "ch-7": "KEGG:C00129 <=> KEGG:C00235",
    "ch-8": "KEGG:C00129 + KEGG:C00235 <=> KEGG:C00341 + KEGG:C00013",
    "ch-9": "KEGG:C00341 + KEGG:C00129 <=> KEGG:C00448 + KEGG:C00013",
    "ch-10": "2 KEGG:C00448 + KEGG:C00005 + KEGG:C00080 <=> KEGG:C00751 + 2 KEGG:C00013 + KEGG:C00006",
    "ch-11": "KEGG:C00751 + KEGG:C00007 + KEGG:C00005 + KEGG:C00080 <=> KEGG:C01054 + KEGG:C00001 + KEGG:C00006",
    "ch-12": "KEGG:C01054 + KEGG:C00080 <=> KEGG:C01724",
    # ---- pentose phosphate pathway ----------------------------------------
    "ppp-o1": "KEGG:C00092 + KEGG:C00006 <=> KEGG:C01236 + KEGG:C00005 + KEGG:C00080",
    "ppp-o2": "KEGG:C01236 + KEGG:C00001 <=> KEGG:C00345 + KEGG:C00080",
    "ppp-o3": "KEGG:C00345 + KEGG:C00006 <=> KEGG:C00199 + KEGG:C00011 + KEGG:C00005 + KEGG:C00080",
    "ppp-n1": "KEGG:C00199 <=> KEGG:C00117",
    "ppp-n2": "KEGG:C00199 <=> KEGG:C00231",
    "ppp-n3": "KEGG:C00231 + KEGG:C00117 <=> KEGG:C00118 + KEGG:C05382",
    "ppp-n4": "KEGG:C05382 + KEGG:C00118 <=> KEGG:C00279 + KEGG:C05345",
    "ppp-n5": "KEGG:C00231 + KEGG:C00279 <=> KEGG:C05345 + KEGG:C00118",
    # ---- urea cycle -------------------------------------------------------
    "urea-1": "KEGG:C00014 + KEGG:C00288 + 2 KEGG:C00002 <=> KEGG:C00169 + 2 KEGG:C00008 + KEGG:C00009",
    "urea-2": "KEGG:C00169 + KEGG:C00077 <=> KEGG:C00327 + KEGG:C00009",
    "urea-3": "KEGG:C00327 + KEGG:C00049 + KEGG:C00002 <=> KEGG:C03406 + KEGG:C00020 + KEGG:C00013",
    "urea-4": "KEGG:C03406 <=> KEGG:C00062 + KEGG:C00122",
    "urea-5": "KEGG:C00062 + KEGG:C00001 <=> KEGG:C00086 + KEGG:C00077",
    # ---- glycogen ---------------------------------------------------------
    "gly-3": "KEGG:C00103 <=> KEGG:C00092",
    "gly-4": "KEGG:C00092 + KEGG:C00001 <=> KEGG:C00031 + KEGG:C00009",
    "gly-5": "KEGG:C00092 <=> KEGG:C05345",
    "gly-6": "KEGG:C00092 <=> KEGG:C00103",
    "gly-7": "KEGG:C00103 + KEGG:C00075 <=> KEGG:C00029 + KEGG:C00013",
    # ---- amino acid metabolism -------------------------------------------
    "aa-1": "KEGG:C00041 + KEGG:C00026 <=> KEGG:C00022 + KEGG:C00025",
    "aa-2": "KEGG:C00049 + KEGG:C00026 <=> KEGG:C00036 + KEGG:C00025",
    "aa-3": "KEGG:C00025 + KEGG:C00003 + KEGG:C00001 <=> KEGG:C00026 + KEGG:C00014 + KEGG:C00004 + KEGG:C00080",
    "aa-4": "KEGG:C00064 + KEGG:C00001 <=> KEGG:C00025 + KEGG:C00014",
    "aa-5": "KEGG:C00123 + KEGG:C00026 <=> KEGG:C00233 + KEGG:C00025",
    "aa-6": "KEGG:C00079 + KEGG:C00272 + KEGG:C00007 <=> KEGG:C00082 + KEGG:C00268 + KEGG:C00001",
    "aa-7": "KEGG:C05330 + KEGG:C00065 <=> KEGG:C02291 + KEGG:C00001",
}

# Steps that cannot be mapped to an exact reaction.  The reason is copied into
# the data `note` field.
NOT_APPLICABLE = {
    "fao-shuttle": "净反应为肉碱穿梭（无化学键变化，仅跨膜转运），eQuilibrator 不适用于转运步。",
    "fas-shuttle": "该步为 CS + ACLY + 柠檬酸/草酰乙酸跨膜的两酶耦合过程，非单一反应式，保留 null。",
    "fas-ks": "底物为 ACP（酰基载体蛋白）硫酯，eQuilibrator 化合物库无 ACP 结合态中间物，保留 null。",
    "fas-kr": "底物为 ACP（酰基载体蛋白）硫酯，eQuilibrator 化合物库无 ACP 结合态中间物，保留 null。",
    "fas-dh": "底物为 ACP（酰基载体蛋白）硫酯，eQuilibrator 化合物库无 ACP 结合态中间物，保留 null。",
    "fas-er": "底物为 ACP（酰基载体蛋白）硫酯，eQuilibrator 化合物库无 ACP 结合态中间物，保留 null。",
    "fas-te": "产物为 ACP 硫酯水解/释放，eQuilibrator 化合物库无 ACP 结合态中间物，保留 null。",
    "gly-1": "底物为糖原高分子（(1→4) 葡聚糖链），非可枚举小分子，无法映射。",
    "gly-2": "底物为极限糊精（支链糖原片段），非可枚举小分子，无法映射。",
    "gly-8": "反应涉及糖原高分子链延伸，非可枚举小分子，无法映射。",
    "gly-9": "反应涉及糖原高分子分支，非可枚举小分子，无法映射。",
    "ch-13": "该步为多酶下游修饰簇（去甲基化/还原/脱氢等十余步），非单一反应式，保留 null。",
    "oxphos-e": "电子传递链为多个氧化还原中心串联的膜蛋白过程，不满足单一化学方程式的 ΔG 定义，保留 null。",
    "oxphos-f": "化学渗透与 ATP 合酶转动催化，驱动力为质子电化学梯度而非单一反应浓度商，保留 null。",
}

# Mapped reactions whose computed value is demonstrably unusable.  They are
# reported but not written into the data layer.
REJECTED = {
    "aa-6": "eQuilibrator 对 BH₄/BH₂ 的基团贡献估算发散（±10⁵ kJ/mol 量级），不采用。",
    "ch-11": "eQuilibrator 对 2,3-氧化角鲨烯的基团贡献明显失真：同一模型下 NADPH+O₂→H₂O₂ 参考反应为 −129 kJ/mol，本步却给出 −413 kJ/mol，不采用。",
    "ch-12": "eQuilibrator 对羊毛固醇的基团贡献估算发散（±3.1×10⁵ kJ/mol），不采用。",
}


def main():
    results = {}
    for step_id, formula in REACTIONS.items():
        try:
            rxn = cc.parse_reaction_formula(formula)
            balanced = rxn.is_balanced()
            dg = cc.standard_dg_prime(rxn)
            results[step_id] = {
                "reaction": formula,
                "balanced": bool(balanced),
                "dgKJ": round(float(dg.value.magnitude), 2),
                "uncertaintyKJ": round(float(dg.error.magnitude), 2),
                "nCompounds": len(list(rxn.keys())),
                "status": "rejected" if step_id in REJECTED else "computed",
                "rejectReason": REJECTED.get(step_id),
            }
            print(f"{step_id}\t{dg.value.magnitude:.2f}\t±{dg.error.magnitude:.2f}\tbalanced={balanced}\t{formula}")
        except Exception as exc:  # noqa: BLE001 - report and continue
            results[step_id] = {"reaction": formula, "error": f"{type(exc).__name__}: {exc}"}
            print(f"{step_id}\tERROR\t{type(exc).__name__}: {exc}")

    # Redox couple documentation (NAD+/NADH, NADP+/NADPH, FAD/FADH2) at the same conditions.
    # standard_e_prime in component-contribution 0.8.0 reports millivolts (mV).
    couples = {
        "NAD+/NADH": "KEGG:C00003 + KEGG:C00080 <=> KEGG:C00004",
        "NADP+/NADPH": "KEGG:C00006 + KEGG:C00080 <=> KEGG:C00005",
        "FAD/FADH2": "KEGG:C00016 + 2 KEGG:C00080 <=> KEGG:C01352",
    }
    redox = {}
    for name, formula in couples.items():
        try:
            e = cc.standard_e_prime(cc.parse_reaction_formula(formula))
            redox[name] = {
                "ePrimeMv": round(float(e.value.magnitude), 2),
                "uncertaintyMv": round(float(e.error.magnitude), 2),
            }
            print(f"E0'{name}\t{e.value.magnitude:.4f} mV\t±{e.error.magnitude:.4f}")
        except Exception as exc:  # noqa: BLE001
            print(f"E0'{name}\tERROR\t{exc}")

    conditions = dict(CONDITIONS)
    conditions["redoxCouples"] = redox
    out = {"conditions": conditions, "results": results, "notApplicable": NOT_APPLICABLE}
    with open("tools/deltag-results.json", "w", encoding="utf-8") as fh:
        json.dump(out, fh, ensure_ascii=False, indent=2)
    print("wrote tools/deltag-results.json")


if __name__ == "__main__":
    sys.exit(main())
