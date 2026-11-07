// ============================================================
// MoleculesIndexPage —— /molecules 物质索引（全量 114 条）
//
// 只做索引，不改档案正文：按每条档案的首个通路分组，组内按名称排序；
// 搜索框按名称 / 别名 / id 过滤（不搜正文，避免把索引变成全文检索）。
// 版式沿用 /molecule/:id 的 .mp- 骨架，新增样式全部收在 .mol- 作用域内。
// ============================================================
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { MOLECULE_PROFILES, type MoleculeProfile } from "../data/moleculeProfiles";
import { PATHWAY_NAV, type NavItemId } from "../data/pathways";

/** 档案里的挂图 href（含 /pathway/fas 之外的旧别名）→ 统一导航 id */
const ROUTE_TO_NAV: Record<string, NavItemId> = {
  "/pathway/glycolysis": "glycolysis",
  "/pathway/tca": "tca",
  "/pathway/gluconeogenesis": "gluconeogenesis",
  "/pathway/ppp": "ppp",
  "/pathway/fatty-acid-oxidation": "fatty-acid-oxidation",
  "/pathway/fas": "fatty-acid-synthesis",
  "/pathway/fatty-acid-synthesis": "fatty-acid-synthesis",
  "/pathway/oxphos": "oxphos",
  "/pathway/cori": "cori",
  "/pathway/urea-cycle": "urea-cycle",
  "/pathway/urea": "urea-cycle",
  "/pathway/glycogen": "glycogen",
  "/pathway/glycogen-metabolism": "glycogen",
  "/pathway/amino-acids": "amino-acids",
  "/pathway/amino-acid-metabolism": "amino-acids",
  "/pathway/cholesterol": "cholesterol",
  "/pathway/cholesterol-synthesis": "cholesterol",
};

const PROFILE_LIST: MoleculeProfile[] = Object.values(MOLECULE_PROFILES);

function groupIdOf(profile: MoleculeProfile): NavItemId | "other" {
  const route = profile.pathways[0]?.href.split("?")[0] ?? "";
  return ROUTE_TO_NAV[route] ?? "other";
}

function matchQuery(profile: MoleculeProfile, query: string): boolean {
  if (!query) return true;
  const q = query.toLowerCase();
  return (
    profile.name.toLowerCase().includes(q) ||
    profile.id.toLowerCase().includes(q) ||
    profile.aliases.some((alias) => alias.toLowerCase().includes(q))
  );
}

interface IndexGroup {
  id: string;
  name: string;
  plateNo: string;
  route: string | null;
  profiles: MoleculeProfile[];
}

/** 组顺序跟随全站导航（PLATE 00–12），未归入通路的档案排在最后 */
function buildGroups(profiles: MoleculeProfile[]): IndexGroup[] {
  const groups: IndexGroup[] = [];
  for (const entry of PATHWAY_NAV) {
    if (entry.id === "home") continue;
    groups.push({
      id: entry.id,
      name: entry.name,
      plateNo: entry.plateNo,
      route: entry.route,
      profiles: [],
    });
  }
  groups.push({ id: "other", name: "未归入通路", plateNo: "—", route: null, profiles: [] });
  const byId = new Map(groups.map((group) => [group.id, group]));
  for (const profile of profiles) {
    const group = byId.get(groupIdOf(profile)) ?? byId.get("other")!;
    group.profiles.push(profile);
  }
  for (const group of groups) {
    group.profiles.sort((a, b) => a.name.localeCompare(b.name, "zh-Hans-CN"));
  }
  return groups.filter((group) => group.profiles.length > 0);
}

export default function MoleculesIndexPage() {
  const [query, setQuery] = useState("");
  const groups = useMemo(() => buildGroups(PROFILE_LIST), []);
  const filtered = useMemo(() => {
    const q = query.trim();
    if (!q) return groups;
    return groups
      .map((group) => ({
        ...group,
        profiles: group.profiles.filter((profile) => matchQuery(profile, q)),
      }))
      .filter((group) => group.profiles.length > 0);
  }, [groups, query]);

  const shown = filtered.reduce((total, group) => total + group.profiles.length, 0);

  return (
    <main className="mp-page mol-index" data-testid="molecules-index">
      <div className="mp-topbar">
        <nav className="mp-crumb" aria-label="面包屑">
          <Link to="/">首页</Link>
          <span aria-hidden="true">›</span>
          <span aria-current="page">物质索引</span>
        </nav>
        <Link className="mp-back" to="/">
          ← 返回首页
        </Link>
      </div>

      <header className="mp-head">
        <p className="mp-kicker">物质索引 · MOLECULE INDEX</p>
        <h1>全部物质</h1>
        <p className="mp-alias">
          共 {PROFILE_LIST.length} 条，按挂图通路分组；每条进入自己的物质简介页。可按名称、别名或 id 过滤。
        </p>
      </header>

      <div className="mol-search">
        <label htmlFor="mol-search-input">搜索物质</label>
        <input
          id="mol-search-input"
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="名称 / 别名 / id，例如 丙酮酸、Pyr、pyr"
          autoComplete="off"
          data-testid="molecules-search"
        />
        <span className="mol-count" aria-live="polite" data-testid="molecules-count">
          显示 {shown} / {PROFILE_LIST.length}
        </span>
      </div>

      {filtered.length === 0 ? (
        <p className="mol-empty" data-testid="molecules-empty">
          没有匹配的物质。可只输入中文名、别名或 id 的一部分。
        </p>
      ) : (
        <div className="mol-groups">
          {filtered.map((group) => (
            <section className="mol-group" key={group.id} data-group={group.id}>
              <h2>
                <span className="mol-plate num">{group.plateNo}</span>
                {group.route ? (
                  <Link className="mol-group-link" to={group.route}>
                    {group.name}
                  </Link>
                ) : (
                  group.name
                )}
                <span className="mol-group-count">{group.profiles.length}</span>
              </h2>
              <ul className="mol-list">
                {group.profiles.map((profile) => (
                  <li key={profile.id}>
                    <Link to={`/molecule/${profile.id}`} data-testid="molecules-index-item" data-mol-id={profile.id}>
                      <span className="mol-name">{profile.name}</span>
                      <span className="mol-meta">
                        <span className="mol-alias">{profile.aliases.join(" / ")}</span>
                        <span className="mol-id">{profile.id}</span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </main>
  );
}
