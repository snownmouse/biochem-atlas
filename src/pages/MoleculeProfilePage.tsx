// ============================================================
// MoleculeProfilePage —— 物质简介页原型 /molecule/:id
//
// 一个物质一页，按教材小节写法组织：
//   判断句主标题 → 分类归属 → 01 在链上的位置 → 02 生成与去路
//   → 03 生理/临床落点 → 04 考点与易错
// 右栏放结构特征（有 3D 就嵌现有查看器）与教材/数据出处。
// 面包屑与返回按钮保证来路可回；未知 id 给出五个样板入口，不落死胡同。
// ============================================================
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import Molecule3D, { type Mol3DAsset } from "../components/Molecule3D";
import { MOLECULE_PROFILES, profileForMolecule } from "../data/moleculeProfiles";

function ProfileNotFound() {
  const samples = Object.values(MOLECULE_PROFILES);
  return (
    <main className="mp-page">
      <nav className="mp-crumb" aria-label="面包屑">
        <Link to="/">首页</Link>
        <span aria-hidden="true">›</span>
        <span>物质简介</span>
      </nav>
      <header className="mp-head">
        <p className="mp-kicker">物质简介</p>
        <h1>没有这个物质</h1>
        <p className="mp-alias">暂未收录该物质，下面是全部物质入口：</p>
      </header>
      <ul className="mp-links mp-links-wide">
        {samples.map((p) => (
          <li key={p.id}>
            <Link to={`/molecule/${p.id}`}>
              <span>{p.name}</span>
              <span className="mp-arrow">→</span>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}

export default function MoleculeProfilePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const profile = useMemo(() => profileForMolecule(id), [id]);
  const [asset, setAsset] = useState<Mol3DAsset | null>(null);
  const [assetState, setAssetState] = useState<"idle" | "loading" | "ok" | "error">("idle");

  useEffect(() => {
    if (!profile?.asset3d) {
      setAsset(null);
      setAssetState("idle");
      return;
    }
    let alive = true;
    setAsset(null);
    setAssetState("loading");
    fetch(`/assets/ligands3d/${profile.asset3d}.json`)
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error("missing"))))
      .then((json: Mol3DAsset) => {
        if (!alive) return;
        setAsset(json);
        setAssetState("ok");
      })
      .catch(() => {
        if (!alive) return;
        setAsset(null);
        setAssetState("error");
      });
    return () => {
      alive = false;
    };
  }, [profile?.asset3d]);

  if (!profile) return <ProfileNotFound />;

  const goBack = () => {
    if (window.history.length > 1) navigate(-1);
    else navigate("/");
  };

  return (
    <main className="mp-page" data-testid="molecule-profile" data-mol-key={profile.id}>
      <div className="mp-topbar">
        <nav className="mp-crumb" aria-label="面包屑">
          <Link to="/">首页</Link>
          <span aria-hidden="true">›</span>
          <span>物质简介</span>
          <span aria-hidden="true">›</span>
          <span aria-current="page">{profile.name}</span>
        </nav>
        <button type="button" className="mp-back" onClick={goBack} data-testid="molecule-profile-back">
          ← 返回上一页
        </button>
      </div>

      <header className="mp-head">
        <p className="mp-kicker">物质简介</p>
        <h1>{profile.claim}</h1>
        <p className="mp-alias" data-testid="profile-classification">
          分类：{profile.classification}
        </p>
        <p className="mp-alias" data-testid="molecule-profile-aliases">
          别名：{profile.aliases.join(" / ")}
        </p>
      </header>

      <div className="mp-grid">
        <div className="mp-main">
          <section className="mp-sec" data-testid="profile-position">
            <span className="mp-sec-no">01</span>
            <div>
              <h2>{profile.position.title}</h2>
              <p>{profile.position.body}</p>
              <ul className="mp-links">
                {profile.pathways.map((p) => (
                  <li key={p.href}>
                    <Link to={p.href} data-testid="profile-pathway-link">
                      <span>{p.label}</span>
                      <span className="mp-arrow">→</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </section>

          <section className="mp-sec" data-testid="profile-flow">
            <span className="mp-sec-no">02</span>
            <div>
              <h2>{profile.flow.title}</h2>
              <p>{profile.flow.body}</p>
            </div>
          </section>

          <section className="mp-sec" data-testid="profile-significance">
            <span className="mp-sec-no">03</span>
            <div>
              <h2>{profile.significance.title}</h2>
              <p>{profile.significance.body}</p>
            </div>
          </section>

          <section className="mp-sec" data-testid="profile-exam">
            <span className="mp-sec-no">04</span>
            <div>
              <h2>{profile.exam.title}</h2>
              <ul className="mp-props">
                {profile.exam.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          </section>
        </div>

        <aside className="mp-side">
          <section className="mp-card" data-testid="profile-structure">
            <h2>结构特征</h2>
            {profile.asset3d ? (
              <>
                <Molecule3D asset={asset} />
                {assetState === "error" && (
                  <p className="mp-muted">3D 资产未载入，先用下面的文字说明。</p>
                )}
                <p className="mp-muted">{profile.structure}</p>
              </>
            ) : (
              <p className="mp-structure-text" data-testid="profile-structure-text">
                {profile.structure}
                <span className="mp-muted">本物质暂无 3D 资产，结构以文字说明。</span>
              </p>
            )}
          </section>

          <section className="mp-card" data-testid="profile-sources">
            <h2>教材与数据出处</h2>
            <ul>
              {profile.sources.map((source) => (
                <li key={source}>{source}</li>
              ))}
            </ul>
          </section>
        </aside>
      </div>

      <footer className="mp-foot">
        <Link to="/">← 返回首页</Link>
        <button type="button" className="mp-back" onClick={goBack}>
          ← 返回上一页
        </button>
      </footer>
    </main>
  );
}
