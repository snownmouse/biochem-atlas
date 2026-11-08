// ============================================================
// SubstancesIndexPage —— /substances 常见物质目录
//
// 六类分区按教材口径列条目：已有简介档案的直接进 /molecule/:id，
// 尚无档案的进 /substance/:id 骨架页，并明确标「内容整理中」。
// 版式沿用 .mp-page 骨架，新增样式全部收在 .sub- 作用域内。
// ============================================================
import { Link } from "react-router-dom";
import {
  SUBSTANCE_CATEGORIES,
  SUBSTANCE_TOTAL,
  type SubstanceEntry,
} from "../data/substances";

function destinationOf(entry: SubstanceEntry): string {
  return entry.moleculeId ? `/molecule/${entry.moleculeId}` : `/substance/${entry.id}`;
}

export default function SubstancesIndexPage() {
  return (
    <main className="mp-page sub-index" data-testid="substances-index">
      <div className="mp-topbar">
        <nav className="mp-crumb" aria-label="面包屑">
          <Link to="/">首页</Link>
          <span aria-hidden="true">›</span>
          <span aria-current="page">常见物质</span>
        </nav>
        <Link className="mp-back" to="/">
          ← 返回首页
        </Link>
      </div>

      <header className="mp-head">
        <p className="mp-kicker">常见物质 · SUBSTANCES</p>
        <h1>常见物质</h1>
        <p className="mp-alias">
          共 {SUBSTANCE_TOTAL} 条，按教材六类分区。已有简介档案的条目直接进入
          {" "}
          <code>/molecule/:id</code>
          ；尚无档案的条目先进入骨架页，页内明确标注「内容整理中」。目前写满四段的只有维生素 A、维生素 C、蔗糖三条。
        </p>
      </header>

      {SUBSTANCE_CATEGORIES.map((category) => (
        <section
          className="sub-category"
          key={category.id}
          data-sub-category={category.id}
          data-sub-count={category.entries.length}
        >
          <div className="sub-category-head">
            <h2>
              {category.name}
              <span className="sub-category-en">{category.en}</span>
              <span className="sub-category-count">{category.entries.length}</span>
            </h2>
            <p className="sub-category-intro">{category.intro}</p>
          </div>

          <ul className="sub-list">
            {category.entries.map((entry) => {
              const done = Boolean(entry.dossier);
              const existing = Boolean(entry.moleculeId);
              return (
                <li key={`${category.id}-${entry.id}`}>
                  <Link
                    to={destinationOf(entry)}
                    className="sub-item"
                    data-substance-item={entry.id}
                    data-substance-status={existing ? "existing" : done ? "complete" : "pending"}
                  >
                    <span className="sub-item-name">{entry.name}</span>
                    <span className="sub-item-summary">{entry.summary}</span>
                    <span
                      className={`sub-item-state${existing ? " is-existing" : done ? " is-complete" : ""}`}
                      data-substance-state={existing ? "existing" : done ? "complete" : "pending"}
                    >
                      {existing ? "已有简介 →" : done ? "已整理 →" : "内容整理中 →"}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </main>
  );
}
