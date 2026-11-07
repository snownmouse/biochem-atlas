// ============================================================
// ContentBubble —— 内容气泡（单例）
//
// 只做一件事：在页面唯一的 .poster 根上做事件委托，命中可点目标后
// 用 resolve(target) 取内容模型；有模型 → 纸白墨线气泡，无模型 → 不接管
// （由 PlateInteraction 的「去向浮签」降级）。
//
// 时序（与文档一致）：
//   hover 280ms 弹出 / 移出 220ms 关闭
//   focus 120ms 弹出
//   触屏长按 450ms 弹出完整气泡（不自动收起），移动 >10px 取消
//   Shift+单击固定；Esc / 点空白 / 滚动 / resize 关闭（固定态同样关闭）
//
// 约束：不预渲染、不逐目标绑事件、不新增字号；气泡不接收 hover，
// 用 document pointermove 判断指针是否落在气泡矩形内。
// ============================================================
import { createPortal } from "react-dom";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import type { BubbleModel } from "../lib/bubbleModel";

const TARGET_SELECTOR = [
  "[data-step-id]",
  "[data-node-id]",
  "[data-step-block]",
  "[data-link-step]",
  "[data-plate-row]",
  "[data-mol-id]",
].join(",");

const HOVER_DELAY = 280;
const FOCUS_DELAY = 120;
const CLOSE_DELAY = 220;
const TOUCH_DELAY = 450;
const CLICK_SUPPRESS = 500;
/** 图框非文本区的软上限（px²，文档口径） */
const FRAME_CAP = 12000;
/** 网格兜底步长（px） */
const GRID = 16;
/** 合规位允许的最大位移（px，目标中心到气泡中心） */
const NEAR_LIMIT = 300;
/** 图框：与 layout-audit 的图框清单保持一致 */
const FRAME_SELECTOR = [
  ".plate-scroll",
  ".plate-canvas",
  ".e3d-stage",
  ".mol3d-stage",
  ".stage-canvas",
  ".poster.step-poster .s-figure",
].join(",");

type Source = "hover" | "focus" | "touch";

interface BubbleState {
  model: BubbleModel;
  target: Element | null;
  pinned: boolean;
  source: Source;
  left: number;
  top: number;
  width: number;
  height: number;
  lines: string[];
  delayMs: number;
}

interface ContentBubbleProps {
  enabled: boolean;
  resolve: (target: Element) => BubbleModel | null;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/** 尺寸：宽 200–260；高度同时受 5% 视口面积与 180px 上限约束，超出先减行。 */
function layoutSize(model: BubbleModel, vw: number, vh: number) {
  const width = clamp(Math.floor(vw * 0.3), 200, 260);
  const areaCap = Math.floor(vw * vh * 0.05);
  const capHeight = Math.max(96, Math.min(180, Math.floor(areaCap / width)));
  const entryHeight = model.entry ? 22 : 0;
  const baseHeight = 20 + 18 + entryHeight;
  const allowed = Math.max(1, Math.floor((capHeight - baseHeight) / 18));
  const lines = model.lines.slice(0, Math.min(6, allowed));
  return { width, height: Math.min(capHeight, baseHeight + lines.length * 18), lines };
}

function intersects(a: DOMRect, left: number, top: number, width: number, height: number): number {
  const w = Math.min(left + width, a.right) - Math.max(left, a.left);
  const h = Math.min(top + height, a.bottom) - Math.max(top, a.top);
  return w > 0 && h > 0 ? w * h : 0;
}

/** 视口内可见的文字块：只用于避让，不改变任何页面元素。 */
function textRectsNear(root: Element | null): DOMRect[] {
  if (!root) return [];
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const rects: DOMRect[] = [];
  const nodes = root.querySelectorAll("text, p, h1, h2, h3, dd, dt, li, td, th");
  for (const node of nodes) {
    if (!(node instanceof Element)) continue;
    const style = window.getComputedStyle(node);
    if (style.visibility === "hidden" || style.display === "none" || Number(style.opacity) === 0) continue;
    const r = node.getBoundingClientRect();
    if (r.width < 2 || r.height < 2) continue;
    if (r.right <= 0 || r.left >= vw || r.bottom <= 0 || r.top >= vh) continue;
    rects.push(r);
  }
  return rects;
}

/**
 * 定位：三条约束按优先级——
 *   硬：与目标交集 0、与图框内正文文本交集 0（找不到就不弹）；
 *   软：与图框非文本区 ≤ 12,000 px²，且离目标 ≤ 300px。
 * 先试 上→下→右→左 四候选位；四候选位都压字或都压图框时，按 16px 网格扫视口，
 * 取最近的合规位；仍无合规位则退回「最近且不压字的位」，由调用方如实记录软上限。
 */
function place(
  rect: DOMRect,
  width: number,
  height: number,
  vw: number,
  vh: number,
  avoid: DOMRect[],
  frame: DOMRect | null
): { left: number; top: number } | null {
  const gap = 8;
  const margin = 8;
  const maxX = vw - width - margin;
  const maxY = vh - height - margin;
  if (maxX < margin || maxY < margin) return null;
  const centerX = rect.left + rect.width / 2;
  const centerY = rect.top + rect.height / 2;
  const distanceOf = (left: number, top: number) =>
    Math.hypot(left + width / 2 - centerX, top + height / 2 - centerY);
  const textOverlap = (left: number, top: number, list: DOMRect[]) => {
    let area = 0;
    for (const item of list) area += intersects(item, left, top, width, height);
    return area;
  };
  const frameOverlap = (left: number, top: number) =>
    frame ? intersects(frame, left, top, width, height) : 0;

  const candidates: { left: number; top: number }[] = [
    { left: rect.left + rect.width / 2 - width / 2, top: rect.top - height - gap },
    { left: rect.left + rect.width / 2 - width / 2, top: rect.bottom + gap },
    { left: rect.right + gap, top: rect.top + rect.height / 2 - height / 2 },
    { left: rect.left - width - gap, top: rect.top + rect.height / 2 - height / 2 },
  ];
  let soft: { left: number; top: number; frame: number; distance: number } | null = null;
  for (const candidate of candidates) {
    const left = clamp(candidate.left, margin, maxX);
    const top = clamp(candidate.top, margin, maxY);
    if (intersects(rect, left, top, width, height) > 0) continue;
    if (textOverlap(left, top, avoid) > 0) continue;
    const overlap = frameOverlap(left, top);
    const distance = distanceOf(left, top);
    if (overlap <= FRAME_CAP) return { left, top };
    if (!soft || overlap < soft.frame || (overlap === soft.frame && distance < soft.distance)) {
      soft = { left, top, frame: overlap, distance };
    }
  }

  let compliant: { left: number; top: number; distance: number } | null = null;
  let nearest: { left: number; top: number; distance: number } | null = null;
  for (let top = margin; top <= maxY; top += GRID) {
    const band = avoid.filter((item) => item.bottom > top && item.top < top + height);
    for (let left = margin; left <= maxX; left += GRID) {
      if (intersects(rect, left, top, width, height) > 0) continue;
      if (band.length && textOverlap(left, top, band) > 0) continue;
      const distance = distanceOf(left, top);
      if (!nearest || distance < nearest.distance) nearest = { left, top, distance };
      if (distance > NEAR_LIMIT) continue;
      if (frameOverlap(left, top) > FRAME_CAP) continue;
      if (!compliant || distance < compliant.distance) compliant = { left, top, distance };
    }
  }
  if (compliant) return { left: compliant.left, top: compliant.top };
  if (soft) return { left: soft.left, top: soft.top };
  return nearest ? { left: nearest.left, top: nearest.top } : null;
}

export default function ContentBubble({ enabled, resolve }: ContentBubbleProps) {
  const [state, setState] = useState<BubbleState | null>(null);
  const bubbleId = `cb-${useId().replace(/:/g, "")}`;

  const stateRef = useRef<BubbleState | null>(null);
  const rootRef = useRef<Element | null>(null);
  const showTimer = useRef<number | null>(null);
  const hideTimer = useRef<number | null>(null);
  const pressTimer = useRef<number | null>(null);
  const pressStart = useRef<{ x: number; y: number; target: Element } | null>(null);
  const suppressClickUntil = useRef(0);
  const pendingStart = useRef(0);
  const pendingKey = useRef("");
  const prevDescribedBy = useRef<string | null>(null);

  const clearShowTimer = useCallback(() => {
    if (showTimer.current !== null) {
      window.clearTimeout(showTimer.current);
      showTimer.current = null;
    }
  }, []);

  const clearHideTimer = useCallback(() => {
    if (hideTimer.current !== null) {
      window.clearTimeout(hideTimer.current);
      hideTimer.current = null;
    }
  }, []);

  const clearPressTimer = useCallback(() => {
    if (pressTimer.current !== null) {
      window.clearTimeout(pressTimer.current);
      pressTimer.current = null;
    }
  }, []);

  const restoreAria = useCallback(() => {
    const target = stateRef.current?.target;
    if (!target) return;
    if (prevDescribedBy.current === null) target.removeAttribute("aria-describedby");
    else target.setAttribute("aria-describedby", prevDescribedBy.current);
    prevDescribedBy.current = null;
  }, []);

  const close = useCallback(() => {
    clearShowTimer();
    clearHideTimer();
    clearPressTimer();
    restoreAria();
    pendingKey.current = "";
    stateRef.current = null;
    setState(null);
  }, [clearHideTimer, clearPressTimer, clearShowTimer, restoreAria]);

  const open = useCallback(
    (target: Element, model: BubbleModel, source: Source, pinned: boolean, delayMs: number): boolean => {
      clearShowTimer();
      clearHideTimer();
      restoreAria();
      const rect = target.getBoundingClientRect();
      const { width, height, lines } = layoutSize(model, window.innerWidth, window.innerHeight);
      const avoid = textRectsNear(rootRef.current);
      const frameEl = target.closest(FRAME_SELECTOR);
      const frame = frameEl ? frameEl.getBoundingClientRect() : null;
      const spot = place(rect, width, height, window.innerWidth, window.innerHeight, avoid, frame);
      // 找不到「不压目标、不压正文」的位置就不弹，宁缺勿压。
      if (!spot) return false;

      if (!prevDescribedBy.current) {
        prevDescribedBy.current = target.getAttribute("aria-describedby");
        target.setAttribute("aria-describedby", bubbleId);
      }

      const next: BubbleState = {
        model,
        target,
        pinned,
        source,
        left: spot.left,
        top: spot.top,
        width,
        height,
        lines,
        delayMs,
      };
      stateRef.current = next;
      setState(next);
      return true;
    },
    [bubbleId, clearHideTimer, clearShowTimer, restoreAria]
  );

  const openFor = useCallback(
    (target: Element, source: Source, delayMs: number, pinned = false) => {
      const model = resolve(target);
      if (!model) return false;
      return open(target, model, source, pinned, delayMs);
    },
    [open, resolve]
  );

  // 根节点与事件委托
  useEffect(() => {
    if (!enabled) {
      close();
      return;
    }
    const root = document.querySelector<HTMLElement>(".poster");
    rootRef.current = root;
    if (!root) return;

    const findTarget = (event: Event): Element | null => {
      const raw = event.target;
      if (!(raw instanceof Element)) return null;
      return raw.closest(TARGET_SELECTOR);
    };

    const onPointerOver = (event: PointerEvent) => {
      if (event.pointerType === "touch") return;
      if (stateRef.current?.pinned) return;
      const target = findTarget(event);
      if (!target) return;
      const model = resolve(target);
      if (!model) return;
      const key = model.key;
      if (pendingKey.current === key) return;
      pendingKey.current = key;
      pendingStart.current = performance.now();
      clearShowTimer();
      clearHideTimer();
      showTimer.current = window.setTimeout(() => {
        if (pendingKey.current !== key) return;
        openFor(target, "hover", Math.round(performance.now() - pendingStart.current));
      }, HOVER_DELAY);
    };

    const onPointerOut = (event: PointerEvent) => {
      if (event.pointerType === "touch") return;
      const target = findTarget(event);
      if (!target) return;
      const related = event.relatedTarget;
      if (related instanceof Element && target.contains(related)) return;
      pendingKey.current = "";
      clearShowTimer();
      if (stateRef.current && !stateRef.current.pinned && stateRef.current.source === "hover") {
        clearHideTimer();
        hideTimer.current = window.setTimeout(close, CLOSE_DELAY);
      }
    };

    const onFocusIn = (event: FocusEvent) => {
      if (stateRef.current?.pinned) return;
      const target = findTarget(event);
      if (!target) return;
      const model = resolve(target);
      if (!model) return;
      pendingKey.current = model.key;
      pendingStart.current = performance.now();
      clearShowTimer();
      clearHideTimer();
      showTimer.current = window.setTimeout(() => {
        openFor(target, "focus", Math.round(performance.now() - pendingStart.current));
      }, FOCUS_DELAY);
    };

    const onFocusOut = (event: FocusEvent) => {
      const target = findTarget(event);
      if (!target) return;
      clearShowTimer();
      if (stateRef.current && !stateRef.current.pinned && stateRef.current.source === "focus") {
        clearHideTimer();
        hideTimer.current = window.setTimeout(close, CLOSE_DELAY);
      }
    };

    const onPointerDown = (event: PointerEvent) => {
      if (event.pointerType !== "touch") {
        // 固定态点空白处关闭；点气泡本体不关。
        if (stateRef.current?.pinned) {
          const bubble = (event.target as Element | null)?.closest?.(".content-bubble");
          if (!bubble) close();
        }
        return;
      }
      const target = findTarget(event);
      if (!target) {
        if (stateRef.current?.pinned) close();
        return;
      }
      const model = resolve(target);
      if (!model) return;
      pressStart.current = { x: event.clientX, y: event.clientY, target };
      clearPressTimer();
      pressTimer.current = window.setTimeout(() => {
        pressStart.current = null;
        suppressClickUntil.current = performance.now() + CLICK_SUPPRESS;
        openFor(target, "touch", TOUCH_DELAY);
      }, TOUCH_DELAY);
    };

    const onPointerMove = (event: PointerEvent) => {
      const state = stateRef.current;
      if (state && !state.pinned) {
        const { left, top, width: bubbleWidth, height: bubbleHeight } = state;
        const insideBubble =
          event.clientX >= left &&
          event.clientX <= left + bubbleWidth &&
          event.clientY >= top &&
          event.clientY <= top + bubbleHeight;
        if (insideBubble) {
          clearHideTimer();
        } else if (state.source === "hover" && hideTimer.current === null) {
          // 指针从目标移开后若既不在气泡内、也不在目标上，按常规 220ms 收起；
          // 否则进入气泡正文会永远停留。
          const raw = event.target;
          const overTarget =
            raw instanceof Element &&
            state.target instanceof Element &&
            state.target.contains(raw);
          if (!overTarget) hideTimer.current = window.setTimeout(close, CLOSE_DELAY);
        }
      }
      if (pressStart.current) {
        const dx = Math.abs(event.clientX - pressStart.current.x);
        const dy = Math.abs(event.clientY - pressStart.current.y);
        if (dx > 10 || dy > 10) {
          clearPressTimer();
          pressStart.current = null;
        }
      }
    };

    const onPointerUp = () => {
      clearPressTimer();
      pressStart.current = null;
    };

    const onClickCapture = (event: MouseEvent) => {
      if (performance.now() < suppressClickUntil.current) {
        event.preventDefault();
        event.stopPropagation();
        return;
      }
      const target = findTarget(event);
      if (!target) return;
      if (event.shiftKey) {
        const model = resolve(target);
        if (!model) return;
        event.preventDefault();
        event.stopPropagation();
        openFor(target, "hover", 0, true);
      }
    };

    const onDocPointerDown = (event: PointerEvent) => {
      const current = stateRef.current;
      if (!current?.pinned) return;
      const raw = event.target instanceof Element ? event.target : null;
      if (raw?.closest(".content-bubble")) return;
      if (current.target && raw && current.target.contains(raw)) return;
      close();
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && stateRef.current) {
        event.stopPropagation();
        close();
      }
    };

    const onScroll = () => {
      if (stateRef.current) close();
    };

    const onResize = () => {
      if (stateRef.current) close();
    };

    root.addEventListener("pointerover", onPointerOver);
    root.addEventListener("pointerout", onPointerOut);
    root.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("pointermove", onPointerMove);
    root.addEventListener("pointerup", onPointerUp);
    root.addEventListener("focusin", onFocusIn);
    root.addEventListener("focusout", onFocusOut);
    root.addEventListener("click", onClickCapture, true);
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("pointerdown", onDocPointerDown);
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onResize);

    return () => {
      root.removeEventListener("pointerover", onPointerOver);
      root.removeEventListener("pointerout", onPointerOut);
      root.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("pointermove", onPointerMove);
      root.removeEventListener("pointerup", onPointerUp);
      root.removeEventListener("focusin", onFocusIn);
      root.removeEventListener("focusout", onFocusOut);
      root.removeEventListener("click", onClickCapture, true);
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("pointerdown", onDocPointerDown);
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onResize);
    };
  }, [clearHideTimer, clearPressTimer, clearShowTimer, close, enabled, openFor, resolve]);

  useEffect(() => {
    if (!enabled) close();
    return () => close();
  }, [close, enabled]);

  if (!enabled || !state) return null;

  const { model, pinned, left, top, width, lines, delayMs } = state;

  return createPortal(
    <div
      id={bubbleId}
      className={`content-bubble${pinned ? " is-pinned" : ""}`}
      style={{ left, top, width }}
      role={pinned && model.entry ? "dialog" : "tooltip"}
      aria-label={pinned && model.entry ? model.summary : undefined}
      data-bubble-key={model.key}
      data-bubble-pinned={pinned ? "1" : "0"}
      data-bubble-delay={delayMs}
    >
      <div className="cb-head">
        <span className="cb-title">{model.title}</span>
        {pinned ? (
          <button type="button" className="cb-close" aria-label="关闭气泡" onClick={close}>
            ×
          </button>
        ) : null}
      </div>
      {lines.map((line, index) => (
        <p className="cb-line" key={`${index}-${line}`}>
          {line}
        </p>
      ))}
      {model.entry ? (
        <a className="cb-entry" href={model.entry.href}>
          {model.entry.label}
        </a>
      ) : null}
    </div>,
    document.body
  );
}
