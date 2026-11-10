// 统一通路切换器：挂图页、结构对照页、首页共用。
// 体例：单行文字 + 两位 PLATE 编号；当前项加粗并在字下压一条实线，其余为点线下划线。
// 2026-11 口径：条目增长到 22 条后，单行压字号已不可持续，改为「两行分组」：
//   · 主线行：PLATE 00–12（首页 + 12 张基础挂图，13 项），字号 13px，编号可见；
//   · 延伸行：PLATE 13–22（10 项），字号 11.5px（不低于 11px），可收起；
//   · 收起时若当前页在延伸行，单独留一个「当前」锚定行，保证位置始终可判断。
// 仍不做卡片 / 胶囊 / 圆角 / 投影 / 下拉；每行内不换行，1440 下整行不溢出，
// 更窄视口才退化为行内横向滚动（不影响正文，页面级横向滚动仍为 0）。
import { type ReactNode, useId, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { PATHWAY_NAV, type NavItemId, type PathwayNavEntry } from "../data/pathways";
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

/** 主线 / 延伸行分界：PLATE 13 及以后收进延伸行（按 plateNo 排序后的下标切分） */
const SPLIT_AT = 13;
const PRIMARY = PATHWAY_NAV.slice(0, SPLIT_AT);
const EXTENDED = PATHWAY_NAV.slice(SPLIT_AT);
const EXTENDED_RANGE = EXTENDED.length
  ? `PLATE ${EXTENDED[0].plateNo}–${EXTENDED[EXTENDED.length - 1].plateNo}`
  : "";

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
  const moreId = `ps-more-${useId().replace(/[:]/g, "")}`;
  const [extendedOpen, setExtendedOpen] = useState(true);
  const currentInExtended = EXTENDED.some((entry) => entry.id === current);

  const renderItem = (entry: PathwayNavEntry, index: number, showSep: boolean) => {
    const isCurrent = entry.id === current;
    return (
      <span className="ps-item" data-nav-id={entry.id} key={entry.id}>
        {showSep && index > 0 && (
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
  };

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
        data-nav-rows={EXTENDED.length ? "2" : "1"}
        data-nav-extended={extendedOpen ? "open" : "closed"}
        data-current={current}
        aria-label="通路切换"
      >
        <div className="ps-row ps-row--main" data-nav-row="main">
          {PRIMARY.map((entry, index) => renderItem(entry, index, true))}
          {EXTENDED.length > 0 && (
            <button
              type="button"
              className="ps-more"
              data-nav-toggle="1"
              aria-expanded={extendedOpen}
              aria-controls={moreId}
              onClick={() => setExtendedOpen((v) => !v)}
            >
              <span aria-hidden="true">{extendedOpen ? "▾" : "▸"}</span>
              延伸区 {EXTENDED_RANGE}
            </button>
          )}
        </div>
        {EXTENDED.length > 0 && extendedOpen && (
          <div className="ps-row ps-row--extended" id={moreId} data-nav-row="extended">
            {EXTENDED.map((entry, index) => renderItem(entry, index, true))}
          </div>
        )}
        {EXTENDED.length > 0 && !extendedOpen && currentInExtended && (
          <div className="ps-row ps-row--extended ps-row--pinned" data-nav-row="extended-current">
            <span className="ps-row-label">当前</span>
            {renderItem(EXTENDED.find((entry) => entry.id === current)!, 0, false)}
          </div>
        )}
        {/* 上下文（当前步 / 版面说明）单独一行：主行 13 项 + 开关已占满 1440，不能再挤 */}
        {context ? (
          <div className="ps-row ps-row--context" data-nav-row="context">
            <span className="ps-context">{context}</span>
          </div>
        ) : null}
      </nav>
      {/* skip link 的落点：导航之后、正文之前；零尺寸，不参与版式 */}
      <span id={skipId} className="ps-after-nav" tabIndex={-1} />
    </>
  );
}
