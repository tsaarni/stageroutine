/**
 * Navigation overlay providing prev/next scene and step controls on top of the stage.
 */

import type { OverlayContext, OverlayPlugin } from "../core/types";

/**
 * Options for the navigation overlay.
 * @category Overlays
 */
export interface NavigationOverlayOptions {
  /** Height of the trigger zone at the bottom of the screen, in pixels. Defaults to 100. */
  triggerZone?: number;
}

/**
 * Creates a navigation overlay plugin with prev scene, prev step, next step, next scene,
 * and pointer toggle buttons.
 *
 * The overlay appears when the mouse cursor moves near the bottom of the screen and
 * hides immediately when the cursor moves away.
 *
 * @example
 * ```ts
 * stage.overlay(NavigationOverlay());
 * ```
 *
 * @category Overlays
 */
export function NavigationOverlay(options: NavigationOverlayOptions = {}): OverlayPlugin {
  const triggerZone = options.triggerZone ?? 100;

  let bar: HTMLDivElement | null = null;
  let boundOnPointerMove: ((e: PointerEvent) => void) | null = null;
  let isVisible = false;

  const showBar = () => {
    if (isVisible) return;
    isVisible = true;
    bar?.classList.add("sr-nav-visible");
    bar?.classList.remove("sr-nav-hidden");
  };

  const hideBar = () => {
    if (!isVisible) return;
    isVisible = false;
    bar?.classList.remove("sr-nav-visible");
    bar?.classList.add("sr-nav-hidden");
  };

  return {
    mount(ctx: OverlayContext) {
      bar = document.createElement("div");
      bar.className = "sr-nav-overlay sr-nav-hidden";

      const btnPrevScene = createButton("«", "Previous scene");
      const btnPrev = createButton("‹", "Previous step");
      const btnPointer = createPointerButton();
      const btnNext = createButton("›", "Next step");
      const btnNextScene = createButton("»", "Next scene");

      bar.appendChild(btnPrevScene);
      bar.appendChild(btnPrev);
      bar.appendChild(btnNext);
      bar.appendChild(btnNextScene);
      bar.appendChild(btnPointer);

      btnPrevScene.addEventListener("click", (e) => {
        e.stopPropagation();
        ctx.emit("nav:prevScene");
      });
      btnPrev.addEventListener("click", (e) => {
        e.stopPropagation();
        ctx.emit("nav:prevStep");
      });
      btnPointer.addEventListener("click", (e) => {
        e.stopPropagation();
        ctx.emit("pointer:toggle");
      });
      btnNext.addEventListener("click", (e) => {
        e.stopPropagation();
        ctx.emit("nav:nextStep");
      });
      btnNextScene.addEventListener("click", (e) => {
        e.stopPropagation();
        ctx.emit("nav:nextScene");
      });

      // Track pointer active state to style the toggle button
      ctx.on("pointer:toggled", ({ active }) => {
        btnPointer.classList.toggle("sr-nav-btn-active", active);
      });

      ctx.container.appendChild(bar);

      boundOnPointerMove = (e: PointerEvent) => {
        const distFromBottom = window.innerHeight - e.clientY;
        if (distFromBottom <= triggerZone) {
          showBar();
        } else {
          hideBar();
        }
      };
      window.addEventListener("pointermove", boundOnPointerMove, { passive: true });
    },

    show() {
      showBar();
    },

    hide() {
      hideBar();
    },

    destroy() {
      if (boundOnPointerMove) {
        window.removeEventListener("pointermove", boundOnPointerMove);
      }
      bar?.remove();
      bar = null;
    },
  };
}

function createButton(label: string, title: string): HTMLButtonElement {
  const btn = document.createElement("button");
  btn.className = "sr-nav-btn";
  btn.textContent = label;
  btn.title = title;
  btn.setAttribute("aria-label", title);
  return btn;
}

function createPointerButton(): HTMLButtonElement {
  const btn = document.createElement("button");
  btn.className = "sr-nav-btn sr-nav-btn-pointer";
  btn.title = "Toggle pointer (L)";
  btn.setAttribute("aria-label", "Toggle pointer");
  // Diagonal wand/pen with a glowing tip — standard laser pointer iconography
  btn.innerHTML = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="display:block">
    <line x1="5" y1="19" x2="17" y2="7" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
    <circle cx="18" cy="6" r="3" fill="currentColor"/>
  </svg>`;
  return btn;
}
