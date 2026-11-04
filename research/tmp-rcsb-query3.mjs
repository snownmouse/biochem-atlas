// 终检：UniProt 官方 accession 澄清 + PGAM1+DG2 + HK1 全条目 + 1QHA/1HKB 复核
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

// 1. UniProt 名称澄清
for (const acc of ["P17858", "P17861", "Q01813", "P30613", "P14618", "P06745"]) {
  const j = await f(`https://rest.uniprot.org/uniprotkb/${acc}.json?fields=protein_name,gene_names,organism_name`);
  console.log(`${acc}: ${j?.proteinDescription?.recommendedName?.fullName?.value ?? "?"} | ${j?.organism?.scientificName ?? "?"} | gene=${(j?.genes ?? []).map((g) => g.geneName?.value).join(",")}`);
}

// 2. UniProt 查询 human PFKL 的 accession
const sr = await f(`https://rest.uniprot.org/uniprotkb/search?query=gene:PFKL+AND+organism_id:9606&fields=accession,protein_name&format=json`);
console.log("\nhuman PFKL 搜索:", (sr?.results ?? []).map((r) => `${r.primaryAccession} ${r.proteinDescription?.recommendedName?.fullName?.value}`).join(" | ") || "(空)");
const sr2 = await f(`https://rest.uniprot.org/uniprotkb/search?query=gene:PFKM+AND+organism_id:9606&fields=accession,protein_name&format=json`);
console.log("human PFKM 搜索:", (sr2?.results ?? []).map((r) => `${r.primaryAccession} ${r.proteinDescription?.recommendedName?.fullName?.value}`).join(" | ") || "(空)");

// 3. PGAM1(P18669) + DG2 (2,3-BPG) 与 酵母 dPGM+DG2 复查；P17858 真实条目全列表
const SEARCH = "https://search.rcsb.org/rcsbsearch/v2/query";
const GRAPHQL = "https://data.rcsb.org/graphql";
const accSearch = async (a, lig, rows = 25) => {
  const nodes = [
    { type: "terminal", service: "text", parameters: { attribute: "rcsb_polymer_entity_container_identifiers.reference_sequence_identifiers.database_accession", operator: "exact_match", value: a } },
  ];
  if (lig) nodes.push({ type: "terminal", service: "text", parameters: { attribute: "rcsb_chem_comp_container_identifiers.comp_id", operator: "in", value: lig } });
  const j = await f(SEARCH, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ query: nodes.length === 1 ? nodes[0] : { type: "group", logical_operator: "and", nodes }, request_options: { paginate: { start: 0, rows } }, return_type: "entry" }) });
  return j?.result_set?.map((x) => x.identifier) ?? [];
};
const gql2 = async (ids) => {
  const j = await f(GRAPHQL, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ query: `{
    entries(entry_ids:[${ids.map((x) => `"${x}"`).join(",")}]) {
      rcsb_id exptl { method } rcsb_entry_info { resolution_combined }
      nonpolymer_entities { nonpolymer_comp { chem_comp { id } } }
      polymer_entities { rcsb_polymer_entity_container_identifiers { uniprot_ids } }
    }
  }` }) });
  return j?.data?.entries ?? [];
};
console.log("\nPGAM1+DG2:", (await accSearch("P18669", ["DG2"])).join(" ") || "(空)");
console.log("dPGM(P00950)+DG2:", (await accSearch("P00950", ["DG2"])).join(" ") || "(空)");

// 4. P17858 全条目（确认 8W2G 系列是否为该 accession 下唯一哺乳动物 PFK 结构）
const ids = await accSearch("P17858", null, 30);
console.log(`\nP17858 全部 ${ids.length} 条:`);
for (const e of await gql2(ids))
  console.log(`${e.rcsb_id} [${(e.exptl ?? []).map((x) => (x.method === "X-RAY DIFFRACTION" ? "XRAY" : x.method === "ELECTRON MICROSCOPY" ? "EM" : x.method)).join("/")}] ${e.rcsb_entry_info?.resolution_combined?.[0]}Å uni=${(e.polymer_entities ?? []).flatMap((p) => p.rcsb_polymer_entity_container_identifiers?.uniprot_ids ?? []).join(",")} {${(e.nonpolymer_entities ?? []).map((n) => n.nonpolymer_comp.chem_comp.id).join(",")}}`);

// 5. HK1 全条目 + 1QHA/1HKB 复核
const ids2 = await accSearch("P19367", null, 20);
console.log(`\nP19367 (HK1) 全部 ${ids2.length} 条:`);
for (const e of await gql2(ids2))
  console.log(`${e.rcsb_id} [${(e.exptl ?? []).map((x) => x.method).join("/")}] ${e.rcsb_entry_info?.resolution_combined?.[0]}Å {${(e.nonpolymer_entities ?? []).map((n) => n.nonpolymer_comp.chem_comp.id).join(",")}}`);
