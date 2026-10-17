/**
 * Navigation overlay providing prev/next scene and step controls on top of the stage.
 */

import type { OverlayContext, OverlayPlugin } from "../core/types";

/**
 * Options for the navigation overlay.
 * @category Presenter
 * @inline
 */
export interface NavigationOverlayOptions {
  /** Height of the trigger zone at the bottom of the screen, in pixels. Defaults to 100. */
  triggerZone?: number;
}

/**
 * Creates a navigation overlay plugin with prev scene, prev step, next step, next scene,
 * and pointer toggle buttons.
 *
 * Hover near the bottom to show controls with a mouse. Tap the bottom zone on touch.
 * Swipe horizontally to navigate on touch.
 *
 * @example
 * ```ts
 * stage.overlay(NavigationOverlay());
 * ```
 *
 * @category Presenter
 */
export function NavigationOverlay(options: NavigationOverlayOptions = {}): OverlayPlugin {
  const triggerZone = options.triggerZone ?? 100;

  let bar: HTMLDivElement | null = null;
  let cleanupInput: (() => void) | null = null;
  let unsubPointerState: (() => void) | null = null;
  let isPointerActive = false;
  let isVisible = false;

  const showBar = () => {
    if (isPointerActive) return;
    if (isVisible) return;
    isVisible = true;
    bar?.classList.add("sr-nav-visible");
    bar?.classList.remove("sr-nav-hidden");
  };

  const hideBar = () => {
    isVisible = false;
    bar?.classList.remove("sr-nav-visible");
    bar?.classList.add("sr-nav-hidden");
  };

  return {
    mount(ctx: OverlayContext) {
      bar = document.createElement("div");
      bar.className = "sr-nav-overlay sr-nav-hidden";

      const btnPrevScene = createButton("«", "Previous scene (Shift+←)");
      const btnPrev = createButton("‹", "Previous step (←)");
      const btnPointer = createPointerButton();
      const btnNext = createButton("›", "Next step (→)");
      const btnNextScene = createButton("»", "Next scene (Shift+→)");

      bar.appendChild(btnPrevScene);
      bar.appendChild(btnPrev);
      bar.appendChild(btnNext);
      bar.appendChild(btnNextScene);
      bar.appendChild(btnPointer);

      btnPrevScene.addEventListener("click", (e) => {
        e.stopPropagation();
        ctx.emit("req:nav:prevScene");
      });
      btnPrev.addEventListener("click", (e) => {
        e.stopPropagation();
        ctx.emit("req:nav:prevStep");
      });
      btnPointer.addEventListener("click", (e) => {
        e.stopPropagation();
        ctx.emit("req:pointer:setState", { active: !isPointerActive });
      });
      btnNext.addEventListener("click", (e) => {
        e.stopPropagation();
        ctx.emit("req:nav:nextStep");
      });
      btnNextScene.addEventListener("click", (e) => {
        e.stopPropagation();
        ctx.emit("req:nav:nextScene");
      });

      // Track pointer active state to style the toggle button and suppress bar
      unsubPointerState = ctx.on("evt:pointer:stateChanged", ({ active }) => {
        isPointerActive = active;
        btnPointer.classList.toggle("sr-nav-btn-active", active);
        if (active) {
          hideBar();
        }
      });

      ctx.container.appendChild(bar);

      const controller = new AbortController();
      const { signal } = controller;
      const mouse = matchMedia("(any-hover: hover) and (any-pointer: fine)");
      const updatePointerButton = () => {
        btnPointer.hidden = !mouse.matches;
      };
      updatePointerButton();
      mouse.addEventListener("change", updatePointerButton, { signal });

      let gesture: {
        id: number;
        type: string;
        x: number;
        y: number;
        distance: number;
        time: number;
      } | null = null;
      const pointers = new Set<number>();
      const inBottomZone = (y: number) => y >= window.innerHeight - triggerZone;
      const excluded = (target: EventTarget | null) => {
        if (!(target instanceof Element)) return true;
        if (
          target.closest(
            "button, a, input, textarea, select, video, audio, iframe, [contenteditable]:not([contenteditable=false]), [role=button], .sr-clickable, .xterm, [data-prevent-swipe], .sr-nav-overlay",
          )
        )
          return true;
        for (
          let node: Element | null = target;
          node && node !== ctx.container;
          node = node.parentElement
        ) {
          const style = getComputedStyle(node);
          if (/(auto|scroll)/.test(style.overflowX + style.overflowY)) return true;
        }
        return false;
      };
      ctx.container.addEventListener(
        "pointerdown",
        (e) => {
          pointers.add(e.pointerId);
          if (pointers.size > 1) {
            gesture = null;
            return;
          }
          if (
            e.pointerType !== "touch" ||
            !e.isPrimary ||
            e.button !== 0 ||
            isPointerActive ||
            excluded(e.target)
          )
            return;
          gesture = {
            id: e.pointerId,
            type: e.pointerType,
            x: e.clientX,
            y: e.clientY,
            distance: 0,
            time: e.timeStamp,
          };
        },
        { signal },
      );
      window.addEventListener(
        "pointermove",
        (e) => {
          if (e.pointerType === "mouse") {
            if (inBottomZone(e.clientY)) showBar();
            else hideBar();
          }
          if (gesture?.id !== e.pointerId) return;
          gesture.distance = Math.max(
            gesture.distance,
            Math.hypot(e.clientX - gesture.x, e.clientY - gesture.y),
          );
        },
        { signal, passive: true },
      );
      // Claim only horizontal navigation gestures. Native scrolling and zoom keep
      // their defaults, including inside excluded content.
      ctx.container.addEventListener(
        "touchmove",
        (e) => {
          if (gesture?.type !== "touch" || e.touches.length !== 1) return;
          const touch = e.touches[0];
          if (!touch) return;
          const dx = Math.abs(touch.clientX - gesture.x);
          const dy = Math.abs(touch.clientY - gesture.y);
          if (dx > 10 && dx > dy * 1.5 && e.cancelable) e.preventDefault();
        },
        { signal, passive: false },
      );
      window.addEventListener(
        "pointerup",
        (e) => {
          pointers.delete(e.pointerId);
          if (gesture?.id !== e.pointerId) return;
          const start = gesture;
          gesture = null;
          if (isPointerActive || excluded(e.target) || !ctx.container.contains(e.target as Node))
            return;
          const dx = e.clientX - start.x;
          const dy = e.clientY - start.y;
          const distance = Math.max(start.distance, Math.hypot(dx, dy));
          if (
            start.type === "touch" &&
            Math.abs(dx) >= 50 &&
            Math.abs(dx) > Math.abs(dy) * 1.5 &&
            e.timeStamp - start.time < 1000
          ) {
            hideBar();
            ctx.emit(dx < 0 ? "req:nav:nextStep" : "req:nav:prevStep");
          } else if (distance <= 10 && e.timeStamp - start.time < 500) {
            if (isVisible) hideBar();
            else if (inBottomZone(start.y) && inBottomZone(e.clientY)) showBar();
          }
        },
        { signal },
      );
      window.addEventListener(
        "pointercancel",
        (e) => {
          pointers.delete(e.pointerId);
          gesture = null;
        },
        { signal },
      );
      window.addEventListener(
        "blur",
        () => {
          pointers.clear();
          gesture = null;
        },
        { signal },
      );
      window.addEventListener(
        "keydown",
        (e) => {
          if (e.key === "Escape") hideBar();
        },
        { signal },
      );
      cleanupInput = () => {
        controller.abort();
      };
    },

    show() {
      showBar();
    },

    hide() {
      hideBar();
    },

    destroy() {
      cleanupInput?.();
      cleanupInput = null;
      isVisible = false;
      isPointerActive = false;
      if (unsubPointerState) {
        unsubPointerState();
        unsubPointerState = null;
      }
      bar?.remove();
      bar = null;
    },
  };
}

function createButton(label: string, title: string): HTMLButtonElement {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "sr-nav-btn";
  btn.textContent = label;
  btn.title = title;
  btn.setAttribute("aria-label", title);
  return btn;
}

function createPointerButton(): HTMLButtonElement {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "sr-nav-btn sr-nav-btn-pointer";
  btn.title = "Pointer & annotate (P)";
  btn.setAttribute("aria-label", "Pointer and annotate");
  // Diagonal wand/pen with a glowing tip — standard laser pointer iconography
  btn.innerHTML = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="display:block">
    <line x1="5" y1="19" x2="17" y2="7" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
    <circle cx="18" cy="6" r="3" fill="currentColor"/>
  </svg>`;
  return btn;
}
