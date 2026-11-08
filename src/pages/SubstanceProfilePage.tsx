// ============================================================
// SubstanceProfilePage —— /substance/:id 常见物质条目骨架
//
// 固定骨架：判断句主标题 → 分类 → 结构特征 → 01 位置/作用
// → 02 生成与来源 → 03 生理或临床落点 → 04 考点与易错 → 出处。
// 目前只有维生素 A、维生素 C、蔗糖写满；其余条目显示同一骨架，
// 并在页首明确标注「内容整理中」，不留白页、不假装写完。
// ============================================================
import { Link, useParams } from "react-router-dom";
import {
  SUBSTANCE_CATEGORIES,
  substanceById,
  type SubstanceEntry,
} from "../data/substances";

const PENDING_TEXT = "内容整理中。";

const PENDING_TITLES = {
  position: "它在链上的位置与作用",
  origin: "它从哪里来，到哪里去",
  significance: "生理或临床落点",
  exam: "考点与易错",
};

function categoryNameOf(entry: SubstanceEntry): string {
  const category = SUBSTANCE_CATEGORIES.find((item) => item.entries.includes(entry));
  return category?.name ?? "常见物质";
}

function SubstanceNotFound() {
  return (
    <main className="mp-page sub-page">
      <nav className="mp-crumb" aria-label="面包屑">
        <Link to="/">首页</Link>
        <span aria-hidden="true">›</span>
        <Link to="/substances">常见物质</Link>
        <span aria-hidden="true">›</span>
        <span aria-current="page">未收录</span>
      </nav>
      <header className="mp-head">
        <p className="mp-kicker">常见物质</p>
        <h1>没有这个物质</h1>
        <p className="mp-alias">该条目不在「常见物质」目录中，下面是完整目录入口。</p>
      </header>
      <ul className="mp-links mp-links-wide">
        <li>
          <Link to="/substances">
            <span>返回常见物质目录</span>
            <span className="mp-arrow">→</span>
          </Link>
        </li>
      </ul>
    </main>
  );
}

export default function SubstanceProfilePage() {
  const { id } = useParams<{ id: string }>();
  const entry = id ? substanceById.get(id) : undefined;

  if (!entry) return <SubstanceNotFound />;

  if (entry.moleculeId) {
    return (
      <main className="mp-page sub-page" data-testid="substance-profile" data-substance-id={entry.id}>
        <nav className="mp-crumb" aria-label="面包屑">
          <Link to="/">首页</Link>
          <span aria-hidden="true">›</span>
          <Link to="/substances">常见物质</Link>
          <span aria-hidden="true">›</span>
          <span aria-current="page">{entry.name}</span>
        </nav>
        <header className="mp-head">
          <p className="mp-kicker">常见物质</p>
          <h1>{entry.name} 已有完整简介档案</h1>
          <p className="mp-alias">
            本条目已收录在 114 条物质简介中，不在骨架页重复。请进入正式简介页。
          </p>
        </header>
        <ul className="mp-links mp-links-wide">
          <li>
            <Link to={`/molecule/${entry.moleculeId}`} data-testid="substance-existing-link">
              <span>{entry.name} · 物质简介</span>
              <span className="mp-arrow">→</span>
            </Link>
          </li>
        </ul>
      </main>
    );
  }

  const dossier = entry.dossier;
  const categoryName = categoryNameOf(entry);
  const done = Boolean(dossier);

  return (
    <main
      className="mp-page sub-page"
      data-testid="substance-profile"
      data-substance-id={entry.id}
      data-substance-complete={done ? "1" : "0"}
    >
      <div className="mp-topbar">
        <nav className="mp-crumb" aria-label="面包屑">
          <Link to="/">首页</Link>
          <span aria-hidden="true">›</span>
          <Link to="/substances">常见物质</Link>
          <span aria-hidden="true">›</span>
          <span aria-current="page">{entry.name}</span>
        </nav>
        <Link className="mp-back" to="/substances">
          ← 返回目录
        </Link>
      </div>

      <header className="mp-head">
        <p className="mp-kicker">
          常见物质 · {categoryName}
        </p>
        <h1>{dossier ? dossier.claim : entry.name}</h1>
        <p className="mp-alias" data-testid="substance-classification">
          分类：{dossier ? dossier.classification : categoryName}
        </p>
        <p className="mp-alias" data-testid="substance-summary">
          目录定位：{entry.summary}
        </p>
        {dossier ? null : (
          <span className="sub-pending" data-testid="substance-status" data-substance-state="pending">
            内容整理中 · 本页只有固定骨架，正文尚未整理
          </span>
        )}
      </header>

      <div className="mp-grid">
        <div className="mp-main">
          <section className="mp-sec" data-testid="substance-section" data-substance-section="position">
            <span className="mp-sec-no">01</span>
            <div>
              <h2>{dossier ? dossier.position.title : PENDING_TITLES.position}</h2>
              <p>{dossier ? dossier.position.body : PENDING_TEXT}</p>
            </div>
          </section>

          <section className="mp-sec" data-testid="substance-section" data-substance-section="origin">
            <span className="mp-sec-no">02</span>
            <div>
              <h2>{dossier ? dossier.origin.title : PENDING_TITLES.origin}</h2>
              <p>{dossier ? dossier.origin.body : PENDING_TEXT}</p>
            </div>
          </section>

          <section className="mp-sec" data-testid="substance-section" data-substance-section="significance">
            <span className="mp-sec-no">03</span>
            <div>
              <h2>{dossier ? dossier.significance.title : PENDING_TITLES.significance}</h2>
              <p>{dossier ? dossier.significance.body : PENDING_TEXT}</p>
            </div>
          </section>

          <section className="mp-sec" data-testid="substance-section" data-substance-section="exam">
            <span className="mp-sec-no">04</span>
            <div>
              <h2>{dossier ? dossier.exam.title : PENDING_TITLES.exam}</h2>
              <ul className="mp-props">
                {(dossier ? dossier.exam.items : [PENDING_TEXT]).map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          </section>
        </div>

        <aside className="mp-side">
          <section className="mp-card" data-testid="substance-structure">
            <h2>结构特征</h2>
            <p className="mp-structure-text">{dossier ? dossier.structure : PENDING_TEXT}</p>
          </section>

          <section className="mp-card" data-testid="substance-sources">
            <h2>出处</h2>
            <ul>
              {(dossier ? dossier.sources : ["内容整理中：出处待补。"]).map((source) => (
                <li key={source}>{source}</li>
              ))}
            </ul>
          </section>
        </aside>
      </div>

      <footer className="mp-foot">
        <Link to="/substances">← 返回常见物质目录</Link>
        <Link to="/">← 返回首页</Link>
      </footer>
    </main>
  );
}
