// 顶部三停导航檐 + 页脚导航行。
// 顺序全部取自 PATHWAY_NAV（按 PLATE 00–12 排序），不在组件里硬编码通路列表。
// 三停：总图 / <当前通路> / 结构对照；右侧：上一条 / 下一条 / 结构对照 / 回总图。
// 上下一条只在 01–12 的通路序列内走，00 总图由「← 回总图」承担。
import { useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { PATHWAY_NAV, type NavItemId, type PathwayNavEntry } from "../data/pathways";
import "../styles/pathway-nav.css";

export type RailLayer = "poster" | "structure" | "step";

/** 01–12 通路序列（去掉 00 总图）；上下一条的依据就是这一份顺序 */
const SEQUENCE: PathwayNavEntry[] = PATHWAY_NAV.filter((entry) => entry.id !== "home");

function entryOf(current: NavItemId): PathwayNavEntry | undefined {
  return PATHWAY_NAV.find((entry) => entry.id === current);
}

function neighborOf(current: NavItemId, delta: -1 | 1): PathwayNavEntry | null {
  const index = SEQUENCE.findIndex((entry) => entry.id === current);
  if (index < 0) return null;
  return SEQUENCE[index + delta] ?? null;
}

interface PathwayRailProps {
  /** 当前页所属通路 */
  current: NavItemId;
  /** 当前所在层：挂图 / 结构对照 / 单步 */
  layer?: RailLayer;
  /** 单步页可带上具体 step，让结构对照停落到对应步 */
  structureHref?: string;
}

export default function PathwayRail({ current, layer = "poster", structureHref }: PathwayRailProps) {
  const entry = entryOf(current);
  const prev = neighborOf(current, -1);
  const next = neighborOf(current, 1);
  const navigate = useNavigate();

  // Alt+←/→ 切换上/下一条；普通 ←/→ 与画布横向拖动保留给页面。
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!event.altKey || event.metaKey || event.ctrlKey || event.shiftKey) return;
      if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
      const target = event.target as HTMLElement | null;
      if (
        target &&
        (target.isContentEditable ||
          target.closest?.("[contenteditable='true']") ||
          /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName))
      )
        return;
      const to = event.key === "ArrowLeft" ? prev : next;
      if (!to) return;
      event.preventDefault();
      navigate(to.route);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [prev, next, navigate]);

  if (!entry) return null;

  const structureTo = structureHref ?? entry.structureRoute;
  const posterCurrent = layer !== "structure";
  const structureCurrent = layer === "structure";

  return (
    <nav
      className="pathway-rail"
      data-testid="pathway-rail"
      data-current={current}
      data-layer={layer}
      aria-label="页面导航"
    >
      <div className="rr-left">
        <Link className="rr-stop" to="/" data-rail-stop="home">
          总图
        </Link>
        <span className="rr-sep" aria-hidden="true">
          /
        </span>
        <Link
          className={posterCurrent ? "rr-stop is-current" : "rr-stop"}
          to={entry.route}
          data-rail-stop="poster"
          aria-current={posterCurrent ? "page" : undefined}
        >
          {entry.name}
        </Link>
        <span className="rr-sep" aria-hidden="true">
          /
        </span>
        {structureTo ? (
          <Link
            className={structureCurrent ? "rr-stop is-current" : "rr-stop"}
            to={structureTo}
            data-rail-stop="structure"
            aria-current={structureCurrent ? "page" : undefined}
          >
            结构对照
          </Link>
        ) : (
          <span className="rr-stop is-off" data-rail-stop="structure" data-rail-disabled="1" aria-disabled="true">
            结构对照
          </span>
        )}
      </div>

      <div className="rr-right">
        {prev ? (
          <Link
            className="rr-act"
            to={prev.route}
            data-rail-action="prev"
            data-rail-target={prev.id}
            aria-label={`上一条：${prev.name}`}
          >
            ← 上一条
          </Link>
        ) : (
          <span className="rr-act is-off" data-rail-action="prev" data-rail-disabled="1" aria-disabled="true">
            ← 上一条
          </span>
        )}
        {next ? (
          <Link
            className="rr-act"
            to={next.route}
            data-rail-action="next"
            data-rail-target={next.id}
            aria-label={`下一条：${next.name}`}
          >
            下一条 →
          </Link>
        ) : (
          <span className="rr-act is-off" data-rail-action="next" data-rail-disabled="1" aria-disabled="true">
            下一条 →
          </span>
        )}
        {structureTo ? (
          <Link className="rr-act" to={structureTo} data-rail-action="structure" aria-label="结构对照">
            结构对照 ↗
          </Link>
        ) : (
          <span className="rr-act is-off" data-rail-action="structure" data-rail-disabled="1" aria-disabled="true">
            结构对照 ↗
          </span>
        )}
        <Link className="rr-act" to="/" data-rail-action="home">
          ← 回总图
        </Link>
      </div>
    </nav>
  );
}

/** 挂图页脚一行：← 总图 · 上一条：<名称> · 下一条：<名称> → */
export function PathwayRailFoot({ current }: { current: NavItemId }) {
  const entry = entryOf(current);
  const prev = neighborOf(current, -1);
  const next = neighborOf(current, 1);
  if (!entry) return null;

  return (
    <nav className="pathway-rail-foot" data-testid="pathway-rail-foot" data-current={current} aria-label="页脚导航">
      <Link to="/" data-rail-action="home">
        ← 总图
      </Link>
      <span className="rr-sep" aria-hidden="true">
        ·
      </span>
      {prev ? (
        <Link to={prev.route} data-rail-action="prev" data-rail-target={prev.id}>
          上一条：{prev.name}
        </Link>
      ) : (
        <span className="is-off" data-rail-action="prev" data-rail-disabled="1" aria-disabled="true">
          上一条：—
        </span>
      )}
      <span className="rr-sep" aria-hidden="true">
        ·
      </span>
      {next ? (
        <Link to={next.route} data-rail-action="next" data-rail-target={next.id}>
          下一条：{next.name} →
        </Link>
      ) : (
        <span className="is-off" data-rail-action="next" data-rail-disabled="1" aria-disabled="true">
          下一条：— →
        </span>
      )}
    </nav>
  );
}
