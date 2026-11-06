// 统一通路切换器：挂图页、结构对照页、首页共用。
// 体例：单行文字 + 两位 PLATE 编号；当前项加粗并在字下压一条实线，其余为点线下划线。
// 不做卡片 / 胶囊 / 圆角 / 投影 / 下拉；条目增长时靠单行横向滚动兜底，不换行、不遮内容。
import type { ReactNode } from "react";
import { useId } from "react";
import { Link, useLocation } from "react-router-dom";
import { PATHWAY_NAV, type NavItemId } from "../data/pathways";
import PathwayRail from "./PathwayRail";
import "../styles/pathway-nav.css";

interface PathwaySwitcherProps {
  /** 当前页所属条目：通路 id 或 "home" */
  current: NavItemId;
  /** 版面位置微调：挂图 / 结构页 / 首页 */
  variant?: "poster" | "structure" | "home";
  /** 追加在当前项之后的上下文（如「第 Ⅳ 步 · 异柠檬酸」） */
  context?: ReactNode;
}

/** 同一通路内切换时保留的参数（跨通路时 step id 无意义，不携带） */
const KEEP_PARAMS = ["step", "organ"];

function hrefFor(route: string, isCurrent: boolean, search: string): string {
  if (!isCurrent) return route;
  const source = new URLSearchParams(search);
  const keep = new URLSearchParams();
  for (const key of KEEP_PARAMS) {
    const value = source.get(key);
    if (value) keep.set(key, value);
  }
  const qs = keep.toString();
  return qs ? `${route}?${qs}` : route;
}

export default function PathwaySwitcher({ current, variant = "poster", context }: PathwaySwitcherProps) {
  const { search } = useLocation();
  const skipId = `ps-skip-${useId().replace(/[:]/g, "")}`;

  return (
    <>
      <a
        className="ps-skip"
        href={`#${skipId}`}
        data-skip-link="1"
        onClick={(event) => {
          event.preventDefault();
          document.getElementById(skipId)?.focus();
        }}
      >
        跳到主要内容
      </a>
      {variant !== "home" ? (
        <PathwayRail current={current} layer={variant === "structure" ? "structure" : "poster"} />
      ) : null}
      <nav
        className={`crumb pathway-switcher pathway-switcher--${variant}${variant === "home" ? " home-crumb" : ""}`}
        data-testid="pathway-switcher"
        data-pathway-nav="1"
        data-current={current}
        aria-label="通路切换"
      >
        {PATHWAY_NAV.map((entry, index) => {
          const isCurrent = entry.id === current;
          return (
            <span className="ps-item" data-nav-id={entry.id} key={entry.id}>
              {index > 0 && (
                <span className="ps-sep" aria-hidden="true">
                  ／
                </span>
              )}
              <Link
                to={hrefFor(entry.route, isCurrent, search)}
                className={isCurrent ? "ps-link ps-cur" : "ps-link"}
                aria-current={isCurrent ? "page" : undefined}
                data-nav-route={entry.route}
              >
                <span className="ps-no num">{entry.plateNo}</span>
                {entry.name}
              </Link>
            </span>
          );
        })}
        {context ? <span className="ps-context">{context}</span> : null}
      </nav>
      {/* skip link 的落点：导航之后、正文之前；零尺寸，不参与版式 */}
      <span id={skipId} className="ps-after-nav" tabIndex={-1} />
    </>
  );
}
