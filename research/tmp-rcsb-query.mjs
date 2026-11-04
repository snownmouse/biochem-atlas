// 临时调研脚本 v2：糖酵解十步四类结构可得性核验（RCSB 实时查询）
// 修正：配体属性 rcsb_chem_comp_container_identifiers.comp_id；PKLR=P30613；GraphQL 经 nonpolymer_comp.chem_comp；fetch 重试
const SEARCH = "https://search.rcsb.org/rcsbsearch/v2/query";
const GRAPHQL = "https://data.rcsb.org/graphql";

async function f(url, opts, tries = 3) {
  for (let i = 0; i < tries; i++) {
    try {
      const r = await fetch(url, opts);
      if (r.status === 204) return { status: 204, json: null };
      const j = await r.json();
      return { status: r.status, json: j };
    } catch (e) {
      if (i === tries - 1) throw e;
      await new Promise((res) => setTimeout(res, 1500));
    }
  }
}

async function search(ligands, accession = null, { maxNPC = null, rows = 25, sort = "score" } = {}) {
  const nodes = [];
  if (accession)
    nodes.push({ type: "terminal", service: "text", parameters: { attribute: "rcsb_polymer_entity_container_identifiers.reference_sequence_identifiers.database_accession", operator: "exact_match", value: accession } });
  if (ligands)
    nodes.push({ type: "terminal", service: "text", parameters: { attribute: "rcsb_chem_comp_container_identifiers.comp_id", operator: "in", value: ligands } });
  if (maxNPC !== null)
    nodes.push({ type: "terminal", service: "text", parameters: { attribute: "rcsb_entry_info.nonpolymer_entity_count", operator: "less_or_equal", value: maxNPC } });
  const body = {
    query: nodes.length === 1 ? nodes[0] : { type: "group", logical_operator: "and", nodes },
    request_options: { paginate: { start: 0, rows }, ...(sort === "resolution" ? { sort: [{ sort_by: "rcsb_entry_info.resolution_combined", direction: "asc" }] } : {}) },
    return_type: "entry",
  };
  const { json } = await f(SEARCH, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  return json?.result_set?.map((x) => x.identifier) ?? [];
}

async function graphql(entries) {
  const out = [];
  for (let i = 0; i < entries.length; i += 80) {
    const chunk = entries.slice(i, i + 80);
    const q = `{
      entries(entry_ids:[${chunk.map((x) => `"${x}"`).join(",")}]) {
        rcsb_id
        exptl { method }
        rcsb_entry_info { resolution_combined }
        nonpolymer_entities { nonpolymer_comp { chem_comp { id name } } }
        polymer_entities { rcsb_polymer_entity_container_identifiers { uniprot_ids } }
      }
    }`;
    const { json } = await f(GRAPHQL, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ query: q }) });
    if (json.errors) console.error("GQL errors:", JSON.stringify(json.errors).slice(0, 500));
    out.push(...(json.data?.entries ?? []));
  }
  return out;
}

const comp = async (id) => {
  const { status, json } = await f(`https://data.rcsb.org/rest/v1/core/chemcomp/${id}`);
  return status === 200 ? { id, exists: true, name: json.chem_comp?.name } : { id, exists: false };
};

const ADD = new Set(["EDO","GOL","PG4","PEG","MES","SO4","PO4","CL","NA","ACT","CIT","MPD","HOH","MRD","IPA","DMS","TRS","EPE","FMT","ACA","BME","TLA","NO3","NH4","MG","MN","ZN","K","CA","CD","CO","NI","ZN3"]);
const INT = new Set(["GLC","G6P","F6P","FBP","13P","GAP","G3P","GA3P","3PG","2PG","PEP","PYR","ADP","ATP","ANP","AGS","OXL","PGA","LAC","F1P","2FP","MRK","BPG","DPG","23BPG","13B","13PG","PGT","2GP","1FP","OXP"]);
const fmt = (e) => {
  const lig = (e.nonpolymer_entities ?? []).map((n) => n.nonpolymer_comp.chem_comp.id);
  const res = e.rcsb_entry_info?.resolution_combined?.[0] ?? "?";
  const uni = [...new Set((e.polymer_entities ?? []).flatMap((p) => p.rcsb_polymer_entity_container_identifiers?.uniprot_ids ?? []))].join(",");
  return `${e.rcsb_id} [${(e.exptl ?? []).map((x) => (x.method === "X-RAY DIFFRACTION" ? "XRAY" : x.method === "ELECTRON MICROSCOPY" ? "EM" : x.method)).join("/")}] ${res}Å ${uni} {${lig.join(",")}}`;
};

const ACC = {
  HK1: "P19367", GCK: "P35557", GPI_H: "P06744", PFKL: "P17861", PFKM: "P17858",
  ALDOA: "P04075", TPI_H: "P60174", TPI_Y: "P00940", GAPDH: "P04406",
  PGK1: "P00558", PGAM1: "P18669", PGAM2: "P15259", ENO1: "P06733", ENO2: "P09104",
  PKLR: "P30613", PKM: "P14618",
};

console.log("=== 0. 化学组分存在性 ===");
for (const c of await Promise.all(["G3P","GA3P","DPG","23BPG","BPG","13B","13PG","PGT","2GP","PYR","PEP","2PG","3PG"].map(comp)))
  console.log(JSON.stringify(c));

console.log("\n=== 1. 靶向检索：UniAcc × 配体 ===");
const targeted = {
  "gk1 HK1+G6P": ["G6P", "P19367"],
  "gk1 GCK+G6P": ["G6P", "P35557"],
  "gk2 GPI_H+G6P": ["G6P", "P06744"],
  "gk2 GPI_H+F6P": ["F6P", "P06744"],
  "gk3 PFKL+FBP": ["FBP", "P17861"],
  "gk3 PFKM+FBP": ["FBP", "P17858"],
  "gk3 PFKL+ATP/ADP": ["ATP","ADP", "P17861"],
  "gk4 ALDOA+13P/G3P": ["13P","G3P","GA3P", "P04075"],
  "gk5 TPI_H+13P/G3P": ["13P","G3P","GA3P", "P60174"],
  "gk5 TPI_Y+13P/G3P": ["13P","G3P","GA3P", "P00940"],
  "gk7 PGK1+ADP": ["ADP", "P00558"],
  "gk7 PGK1+13B/BPG/DPG": ["13B","13PG","BPG","DPG","23BPG", "P00558"],
  "gk8 PGAM1+2PG": ["2PG", "P18669"],
  "gk8 PGAM+DPG/23BPG": ["DPG","23BPG","BPG", "P18669"],
  "gk8 PGAM2+2PG/DPG": ["2PG","DPG","23BPG", "P15259"],
  "gk9 ENO1+PEP": ["PEP", "P06733"],
  "gk9 ENO2+2PG/PEP": ["2PG","PEP", "P09104"],
  "gk10 PKLR+PYR": ["PYR", "P30613"],
  "gk10 PKM+PYR": ["PYR", "P14618"],
  "gk10 PKLR+ATP/ANP": ["ATP","ANP", "P30613"],
  "游离子PYR(任意entry)": ["PYR", null],
};
const searchResults = {};
for (const [k, [l, a]] of Object.entries(targeted)) {
  searchResults[k] = await search(l, a, { rows: 15 });
  console.log(`${k}: ${searchResults[k].join(" ") || "(空)"}`);
}

console.log("\n=== 2. 各酶全条目扫描（含目标配体的条目 + 条目总数） ===");
for (const [k, a] of Object.entries(ACC)) {
  const ids = await search(null, a, { rows: 60, sort: "resolution" });
  const detail = await graphql(ids);
  const hit = detail.filter((e) => (e.nonpolymer_entities ?? []).some((n) => INT.has(n.nonpolymer_comp.chem_comp.id)));
  console.log(`\n-- ${k} (${a}) 共 ${ids.length} 条，含目标配体 ${hit.length} 条 --`);
  for (const e of hit) console.log(fmt(e));
  const apoish = detail.filter((e) => {
    const lig = (e.nonpolymer_entities ?? []).map((n) => n.nonpolymer_comp.chem_comp.id).filter((x) => !ADD.has(x));
    return lig.length === 0;
  });
  console.log(`   apo(仅添加剂/无配体): ${apoish.map((e) => `${e.rcsb_id}@${e.rcsb_entry_info?.resolution_combined?.[0]}`).join(" ") || "(无)"}`);
}

console.log("\n=== 3. 已知锚点复核 ===");
for (const e of await graphql(["1CZA","2CXS","1JIQ","1U0F","8W2G","4ALD","5KY6","1NEY","2JK2","1U8F","8G17","9FDN","8YHP","1QHF","4GPZ","3UCD","2PSN","6NN4","1ZJH","1V4S","1V4T","3BJF"]))
  console.log(fmt(e));
