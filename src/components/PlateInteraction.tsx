import { useCallback, useEffect, useState, type RefObject } from "react";
import { createPortal } from "react-dom";
import ContentBubble from "./ContentBubble";
import { posterBubbleModel } from "../lib/bubbleModel";

/**
 * 挂图页共享交互层。
 *
 * 输入：指向挂图 SVG 的 ref。
 * 职责（全部由这一处实现，页面不再手写）：
 * - 把既有可点目标（data-step-id / data-node-id / data-step-block / data-link-step /
 *   data-module-id / data-transport-id / data-plate-row）补成 Tab 可达目标；
 * - Enter / Space 激活；页面上已有键盘处理的元素不重复接管；
 * - 静止折角、hover 墨线加粗、focus 2px 砖红描边；
 * - 桌面 hover / 键盘 focus / 触屏 450ms 长按的「去向浮签」；
 * - 总开关关闭时撤掉全部新增属性、浮层与监听，并拦截目标点击回到纯静态。
 *
 * 目标选择器取自各页已有的 data-* 标记，因此不需要在 12 页各写一份交互逻辑。
 */

const TARGET_SELECTOR = [
  "[data-step-id]",
  "[data-node-id]",
  "[data-step-block]",
  "[data-link-step]",
  "[data-module-id]",
  "[data-transport-id]",
  "[data-plate-row]",
].join(",");

interface TipState {
  text: string;
  x: number;
  y: number;
}

interface PrevAttrs {
  tabindex: string | null;
  role: string | null;
  aria: string | null;
  native: boolean;
}

function tipTextFor(el: Element): string {
  if (el.hasAttribute("data-module-id")) return "→ 模块详情";
  if (el.hasAttribute("data-transport-id")) return "→ 转运详情";
  if (
    el.hasAttribute("data-node-id") &&
    !el.hasAttribute("data-step-id") &&
    !el.hasAttribute("data-link-step") &&
    !el.hasAttribute("data-step-block")
  )
    return "→ 相关步骤";
  return "→ 步骤详情";
}

function targetIdOf(el: Element): string {
  return (
    el.getAttribute("data-module-id") ??
    el.getAttribute("data-transport-id") ??
    el.getAttribute("data-step-id") ??
    el.getAttribute("data-step-block") ??
    el.getAttribute("data-link-step") ??
    el.getAttribute("data-node-id") ??
    el.getAttribute("data-plate-row") ??
    ""
  );
}

export default function PlateInteraction({
  svgRef,
  pathwayId,
}: {
  svgRef: RefObject<SVGSVGElement | null>;
  /** 当前挂图的通路 id，用于内容气泡按通路取步骤字段 */
  pathwayId: string;
}) {
  const [on, setOn] = useState(true);
  const [tip, setTip] = useState<TipState | null>(null);

  // 有内容模型 → 交给 ContentBubble；没有 → 保留原有去向浮签。
  const resolveBubble = useCallback(
    (target: Element) => posterBubbleModel(target, pathwayId),
    [pathwayId]
  );

  useEffect(() => {
    if (!on) return;
    const svg = svgRef.current;
    if (!svg) return;
    const canvas = svg.parentElement;
    const root = svg.closest(".poster");
    if (!canvas || !root) return;

    // 糖原 / 胆固醇两页的 <svg class="plate-canvas"> 直接挂在 .plate-scroll 下，
    // 父容器是 static 时覆盖层会逃逸到更外层；就地补 relative，关闭时原样还原。
    const prevPosition = canvas.style.position;
    if (window.getComputedStyle(canvas).position === "static") canvas.style.position = "relative";

    const prev = new Map<Element, PrevAttrs>();
    const overlay = document.createElement("div");
    overlay.className = "plate-aff-layer";
    overlay.setAttribute("aria-hidden", "true");
    const focusBox = document.createElement("i");
    focusBox.className = "plate-aff-focus";
    overlay.appendChild(focusBox);
    canvas.appendChild(overlay);

    let marks: HTMLElement[] = [];
    let hovered: Element | null = null;
    let hideTimer = 0;
    let pressTimer = 0;
    let suppressClickUntil = 0;
    let pressPoint: { x: number; y: number } | null = null;
    let raf = 0;

    const scheduleScan = () => {
      if (raf) return;
      raf = window.requestAnimationFrame(() => {
        raf = 0;
        scan();
      });
    };

    const scan = () => {
      const found = Array.from(root.querySelectorAll(TARGET_SELECTOR));
      for (const mark of marks) mark.remove();
      marks = [];
      const rects: { el: Element; left: number; top: number }[] = [];
      const canvasRect = canvas.getBoundingClientRect();
      // 父容器自身是滚动容器时，绝对定位子元素相对其可视框定位，需要补滚动偏移
      const scrollX = canvas.scrollLeft;
      const scrollY = canvas.scrollTop;
      for (const el of found) {
        let saved = prev.get(el);
        if (!saved) {
          const tabindex = el.getAttribute("tabindex");
          const role = el.getAttribute("role");
          const aria = el.getAttribute("aria-label");
          saved = {
            tabindex,
            role,
            aria,
            // 糖原 / 胆固醇两页原本已有键盘处理，不能重复接管 Enter。
            native: tabindex === "0" && role === "button" && aria !== null,
          };
          prev.set(el, saved);
        }
        el.setAttribute("data-plate-aff", "1");
        if (!saved.native) {
          el.setAttribute("tabindex", "0");
          if (el.tagName.toLowerCase() !== "tr") el.setAttribute("role", "button");
          el.setAttribute("aria-label", `${tipTextFor(el)} · ${targetIdOf(el)}`);
        }
        if (el.tagName.toLowerCase() !== "tr") {
          const r = el.getBoundingClientRect();
          // 部分步骤组只含一条水平线（bbox 高度为 0），折角要压在线上而不是被跳过。
          if (r.width > 0 || r.height > 0) {
            const top = r.height < 8 ? r.top - 4 : r.top;
            rects.push({ el, left: r.right - canvasRect.left - 8 + scrollX, top: top - canvasRect.top + scrollY });
          }
        }
      }
      for (const item of rects) {
        const mark = document.createElement("i");
        mark.className = "plate-aff-corner";
        mark.style.left = `${item.left}px`;
        mark.style.top = `${item.top}px`;
        overlay.appendChild(mark);
        marks.push(mark);
      }
      overlay.appendChild(focusBox);
    };

    const targetOf = (node: EventTarget | null): Element | null => {
      if (!(node instanceof Element)) return null;
      const el = node.closest(TARGET_SELECTOR);
      return el && root.contains(el) ? el : null;
    };

    const showTip = (el: Element) => {
      window.clearTimeout(hideTimer);
      const text = tipTextFor(el);
      const r = el.getBoundingClientRect();
      const width = Math.min(240, text.length * 13 + 24);
      let x = r.left + r.width / 2 - width / 2;
      x = Math.max(8, Math.min(x, window.innerWidth - width - 8));
      let y = r.top - 30;
      if (y < 8) y = r.bottom + 8;
      setTip({ text, x, y });
    };

    const hideTipSoon = () => {
      window.clearTimeout(hideTimer);
      hideTimer = window.setTimeout(() => setTip(null), 120);
    };

    const positionFocus = (el: Element) => {
      const r = el.getBoundingClientRect();
      const b = canvas.getBoundingClientRect();
      focusBox.style.left = `${r.left - b.left - 2 + canvas.scrollLeft}px`;
      focusBox.style.top = `${r.top - b.top - 2 + canvas.scrollTop}px`;
      focusBox.style.width = `${r.width + 4}px`;
      focusBox.style.height = `${r.height + 4}px`;
      focusBox.setAttribute("data-on", "1");
    };

    const clearHover = () => {
      if (hovered) hovered.removeAttribute("data-plate-hover");
      hovered = null;
    };

    const onPointerOver = (e: PointerEvent) => {
      if (e.pointerType === "touch") return;
      // 长按松手后浏览器会补发鼠标兼容事件，别把刚收起的浮签又拉起来
      if (performance.now() < suppressClickUntil) return;
      const el = targetOf(e.target);
      if (!el) return;
      if (hovered === el) return;
      if (hovered && el.contains(hovered)) return;
      clearHover();
      hovered = el;
      el.setAttribute("data-plate-hover", "1");
      if (resolveBubble(el)) return;
      showTip(el);
    };

    const onPointerOut = (e: PointerEvent) => {
      if (e.pointerType === "touch") return;
      const el = targetOf(e.target);
      if (!el || el !== hovered) return;
      const to = e.relatedTarget instanceof Element ? targetOf(e.relatedTarget) : null;
      if (to && el.contains(to)) return;
      clearHover();
      hideTipSoon();
    };

    const onFocusIn = (e: FocusEvent) => {
      const el = targetOf(e.target);
      if (!el) return;
      el.setAttribute("data-plate-focus", "1");
      if (el.tagName.toLowerCase() === "tr") {
        focusBox.removeAttribute("data-on");
      } else {
        positionFocus(el);
      }
      // 长按松手后浏览器会把焦点落到目标上；此刻不要再 showTip，否则会清掉自动收起计时器
      if (performance.now() < suppressClickUntil) return;
      if (resolveBubble(el)) return;
      showTip(el);
    };

    const onFocusOut = (e: FocusEvent) => {
      const el = targetOf(e.target);
      if (!el) return;
      el.removeAttribute("data-plate-focus");
      focusBox.removeAttribute("data-on");
      hideTipSoon();
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Enter" && e.key !== " ") return;
      const el = targetOf(document.activeElement);
      if (!el) return;
      const saved = prev.get(el);
      if (saved?.native) return;
      e.preventDefault();
      el.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, view: window }));
    };

    const onPointerDown = (e: PointerEvent) => {
      if (e.pointerType === "mouse") return;
      const el = targetOf(e.target);
      if (!el) return;
      // 有内容模型时由 ContentBubble 接管 450ms 长按并抑制合成点击；
      // 这里不再重复计时，避免浮签与气泡互相清计时器。
      if (resolveBubble(el)) return;
      pressPoint = { x: e.clientX, y: e.clientY };
      window.clearTimeout(pressTimer);
      pressTimer = window.setTimeout(() => {
        suppressClickUntil = performance.now() + 500;
        el.setAttribute("data-plate-hover", "1");
        showTip(el);
        hideTimer = window.setTimeout(() => {
          setTip(null);
          el.removeAttribute("data-plate-hover");
        }, 2600);
      }, 450);
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!pressPoint) return;
      if (Math.hypot(e.clientX - pressPoint.x, e.clientY - pressPoint.y) > 10) {
        window.clearTimeout(pressTimer);
        pressPoint = null;
      }
    };

    const onPointerUp = () => {
      window.clearTimeout(pressTimer);
      pressPoint = null;
    };

    const onClickCapture = (e: Event) => {
      if (performance.now() < suppressClickUntil) {
        e.preventDefault();
        e.stopPropagation();
      }
    };

    const onClickScan = () => scheduleScan();
    const onScroll = () => {
      setTip(null);
      clearHover();
      // 父容器自身可横向滚动时角标坐标随内容变化，需要重扫；常规画布无需重扫。
      if (canvas.scrollWidth > canvas.clientWidth + 1) scheduleScan();
    };

    root.addEventListener("pointerover", onPointerOver as EventListener, true);
    root.addEventListener("pointerout", onPointerOut as EventListener, true);
    root.addEventListener("pointerdown", onPointerDown as EventListener, true);
    root.addEventListener("pointermove", onPointerMove as EventListener, true);
    root.addEventListener("pointerup", onPointerUp as EventListener, true);
    root.addEventListener("pointercancel", onPointerUp as EventListener, true);
    root.addEventListener("focusin", onFocusIn as EventListener, true);
    root.addEventListener("focusout", onFocusOut as EventListener, true);
    root.addEventListener("keydown", onKeyDown as EventListener, true);
    root.addEventListener("click", onClickCapture, true);
    root.addEventListener("click", onClickScan, false);
    root.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", scheduleScan);

    scheduleScan();

    return () => {
      window.cancelAnimationFrame(raf);
      window.clearTimeout(hideTimer);
      window.clearTimeout(pressTimer);
      root.removeEventListener("pointerover", onPointerOver as EventListener, true);
      root.removeEventListener("pointerout", onPointerOut as EventListener, true);
      root.removeEventListener("pointerdown", onPointerDown as EventListener, true);
      root.removeEventListener("pointermove", onPointerMove as EventListener, true);
      root.removeEventListener("pointerup", onPointerUp as EventListener, true);
      root.removeEventListener("pointercancel", onPointerUp as EventListener, true);
      root.removeEventListener("focusin", onFocusIn as EventListener, true);
      root.removeEventListener("focusout", onFocusOut as EventListener, true);
      root.removeEventListener("keydown", onKeyDown as EventListener, true);
      root.removeEventListener("click", onClickCapture, true);
      root.removeEventListener("click", onClickScan, false);
      root.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", scheduleScan);
      for (const [el, saved] of prev) {
        el.removeAttribute("data-plate-aff");
        el.removeAttribute("data-plate-hover");
        el.removeAttribute("data-plate-focus");
        if (!saved.native) {
          if (saved.tabindex === null) el.removeAttribute("tabindex");
          else el.setAttribute("tabindex", saved.tabindex);
          if (saved.role === null) el.removeAttribute("role");
          else el.setAttribute("role", saved.role);
          if (saved.aria === null) el.removeAttribute("aria-label");
          else el.setAttribute("aria-label", saved.aria);
        }
      }
      overlay.remove();
      canvas.style.position = prevPosition;
      setTip(null);
    };
  }, [on, svgRef, resolveBubble]);

  // 关闭后目标不再响应鼠标点击：图回到纯静态，控件本身不受影响。
  useEffect(() => {
    if (on) return;
    const svg = svgRef.current;
    const root = svg?.closest(".poster");
    if (!root) return;
    root.setAttribute("data-plate-aff-off", "1");
    const blocker = (e: Event) => {
      const el = e.target instanceof Element ? e.target.closest(TARGET_SELECTOR) : null;
      if (!el || !root.contains(el)) return;
      e.preventDefault();
      e.stopPropagation();
    };
    root.addEventListener("click", blocker, true);
    return () => {
      root.removeAttribute("data-plate-aff-off");
      root.removeEventListener("click", blocker, true);
    };
  }, [on, svgRef]);

  return (
    <>
      <span className={`plate-aff${on ? "" : " is-off"}`} data-testid="plate-aff">
        <i className="plate-aff-glyph" aria-hidden="true" />
        <span className="plate-aff-legend">折角 = 可点</span>
        <button
          type="button"
          className="plate-aff-toggle"
          aria-pressed={on}
          aria-label={on ? "关闭可点提示，回到纯静态挂图" : "开启可点提示与键盘可达"}
          data-testid="plate-aff-toggle"
          onClick={() => setOn((value) => !value)}
        >
          {on ? "交互 开" : "交互 关"}
        </button>
      </span>
      {on && tip
        ? createPortal(
            <div className="plate-tip" data-testid="plate-tip" style={{ left: `${tip.x}px`, top: `${tip.y}px` }}>
              {tip.text}
            </div>,
            document.body,
          )
        : null}
      <ContentBubble enabled={on} resolve={resolveBubble} />
    </>
  );
}

