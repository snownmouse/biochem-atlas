// 补查：8W2G 蛋白实体身份、2,3-BPG 组分代码（经血红蛋白 1A3N）、酵母 dPGM P00950 扫描
const GRAPHQL = "https://data.rcsb.org/graphql";
const SEARCH = "https://search.rcsb.org/rcsbsearch/v2/query";

async function f(url, opts, tries = 3) {
  for (let i = 0; i < tries; i++) {
    try {
      const r = await fetch(url, opts);
      if (r.status === 204) return null;
      return await r.json();
    } catch (e) {
      if (i === tries - 1) throw e;
      await new Promise((res) => setTimeout(res, 1500));
    }
  }
}

async function gql(q) {
  const j = await f(GRAPHQL, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ query: q }) });
  if (j.errors) console.error("GQL errors:", JSON.stringify(j.errors).slice(0, 400));
  return j.data;
}

// 1. 8W2G 与 28LN 的蛋白实体全名/基因名
const d1 = await gql(`{
  entries(entry_ids:["8W2G","28LN","7LW1","8W2H","6R5Q"]) {
    rcsb_id
    struct { title }
    polymer_entities {
      rcsb_polymer_entity { pdbx_description }
      rcsb_polymer_entity_container_identifiers { uniprot_ids }
    }
  }
}`);
for (const e of d1.entries) {
  console.log(`\n${e.rcsb_id}: ${e.struct?.title?.slice(0, 90)}`);
  for (const p of e.polymer_entities ?? [])
    console.log(`   entity: ${(p.rcsb_polymer_entity?.pdbx_description ?? "").slice(0, 80)} | uni=${(p.rcsb_polymer_entity_container_identifiers?.uniprot_ids ?? []).join(",")}`);
}

// 2. 1A3N 血红蛋白配体（找 2,3-BPG 代码）
const d2 = await gql(`{
  entries(entry_ids:["1A3N","1B86"]) {
    rcsb_id
    nonpolymer_entities { nonpolymer_comp { chem_comp { id name } } }
  }
}`);
for (const e of d2.entries)
  console.log(`\n${e.rcsb_id} ligands: ${(e.nonpolymer_entities ?? []).map((n) => `${n.nonpolymer_comp.chem_comp.id}(${n.nonpolymer_comp.chem_comp.name.slice(0, 40)})`).join(", ")}`);

// 3. 酵母 dPGM P00950 全扫描
const body = {
  query: { type: "terminal", service: "text", parameters: { attribute: "rcsb_polymer_entity_container_identifiers.reference_sequence_identifiers.database_accession", operator: "exact_match", value: "P00950" } },
  request_options: { paginate: { start: 0, rows: 30 }, sort: [{ sort_by: "rcsb_entry_info.resolution_combined", direction: "asc" }] },
  return_type: "entry",
};
const sr = await f(SEARCH, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
const ids = sr.result_set?.map((x) => x.identifier) ?? [];
console.log(`\n\nP00950 (酵母 dPGM) 共 ${ids.length} 条: ${ids.join(" ")}`);
const d3 = await gql(`{
  entries(entry_ids:[${ids.map((x) => `"${x}"`).join(",")}]) {
    rcsb_id
    exptl { method }
    rcsb_entry_info { resolution_combined }
    nonpolymer_entities { nonpolymer_comp { chem_comp { id } } }
    polymer_entities { rcsb_polymer_entity_container_identifiers { uniprot_ids } }
  }
}`);
for (const e of d3.entries ?? [])
  console.log(`${e.rcsb_id} [${(e.exptl ?? []).map((x) => x.method).join("/")}] ${e.rcsb_entry_info?.resolution_combined?.[0]}Å uni=${(e.polymer_entities ?? []).flatMap((p) => p.rcsb_polymer_entity_container_identifiers?.uniprot_ids ?? []).join(",")} {${(e.nonpolymer_entities ?? []).map((n) => n.nonpolymer_comp.chem_comp.id).join(",")}}`);

// 4. TPI 9FFC 的 G3P（确认是 sn-甘油-3-磷酸 而非甘油醛-3-磷酸）+ 人 PGK 2X13/2WZB 复核
const d4 = await gql(`{
  entries(entry_ids:["9FFC","2X13","2WZB","8TBS","5X0I"]) {
    rcsb_id
    exptl { method }
    rcsb_entry_info { resolution_combined }
    nonpolymer_entities { nonpolymer_comp { chem_comp { id name } } }
    polymer_entities { rcsb_polymer_entity_container_identifiers { uniprot_ids } }
  }
}`);
console.log("");
for (const e of d4.entries ?? [])
  console.log(`${e.rcsb_id} [${(e.exptl ?? []).map((x) => x.method).join("/")}] ${e.rcsb_entry_info?.resolution_combined?.[0]}Å uni=${(e.polymer_entities ?? []).flatMap((p) => p.rcsb_polymer_entity_container_identifiers?.uniprot_ids ?? []).join(",")} {${(e.nonpolymer_entities ?? []).map((n) => `${n.nonpolymer_comp.chem_comp.id}`).join(",")}}`);
