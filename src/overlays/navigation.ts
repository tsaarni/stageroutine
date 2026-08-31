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
 * Creates a navigation overlay plugin with prev scene, prev step, next step, and next scene buttons.
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
      const btnNext = createButton("›", "Next step");
      const btnNextScene = createButton("»", "Next scene");

      bar.appendChild(btnPrevScene);
      bar.appendChild(btnPrev);
      bar.appendChild(btnNext);
      bar.appendChild(btnNextScene);

      btnPrevScene.addEventListener("click", (e) => {
        e.stopPropagation();
        ctx.prevScene();
      });
      btnPrev.addEventListener("click", (e) => {
        e.stopPropagation();
        ctx.prev();
      });
      btnNext.addEventListener("click", (e) => {
        e.stopPropagation();
        ctx.next();
      });
      btnNextScene.addEventListener("click", (e) => {
        e.stopPropagation();
        ctx.nextScene();
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
