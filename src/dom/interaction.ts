/**
 * Generic range selection and interactive focus utilities for StageRoutine components.
 */

export interface RangeSelectionOptions {
  /** The container DOM element hosting the selectable items */
  container: HTMLElement;
  /** Function returning the list of selectable child DOM elements */
  getItems: () => HTMLElement[];
  /** Whether interaction is active. Defaults to true. */
  interactive?: boolean;
  /** Optional callback fired whenever the selected range changes */
  onRangeChange?: (range: [number, number] | null) => void;
}

export interface RangeSelectionController {
  readonly focusedRange: [number, number] | null;
  readonly focusedIndex: number | null;
  focus(start: number, end?: number): void;
  unfocus(): void;
  refresh(): void;
  destroy(): void;
}

/**
 * Attaches high-performance event-delegated range selection to any container.
 */
export function attachRangeSelection(options: RangeSelectionOptions): RangeSelectionController {
  const { container, getItems, interactive = true, onRangeChange } = options;

  let currentRange: [number, number] | null = null;
  let isDragging = false;
  let dragAnchorIndex: number | null = null;
  let hadFocusBeforeDown = false;

  const updateRange = (range: [number, number] | null) => {
    currentRange = range;
    const items = getItems();

    if (!range) {
      container.classList.remove("has-focus");
      for (const el of items) {
        el.classList.remove("is-focused", "is-range-start", "is-range-end");
      }
      onRangeChange?.(null);
      return;
    }

    const [start, end] = [Math.min(range[0], range[1]), Math.max(range[0], range[1])];
    container.classList.add("has-focus");

    for (let i = 0; i < items.length; i++) {
      const el = items[i];
      const inRange = i >= start && i <= end;
      el.classList.toggle("is-focused", inRange);
      el.classList.toggle("is-range-start", inRange && i === start);
      el.classList.toggle("is-range-end", inRange && i === end);
    }

    onRangeChange?.(currentRange);
  };

  const markClickable = () => {
    if (!interactive) return;
    for (const el of getItems()) {
      el.classList.add("sr-clickable");
    }
  };

  const onContainerPointerDown = (e: PointerEvent) => {
    const items = getItems();
    const target = (e.target as HTMLElement).closest<HTMLElement>(".sr-clickable");
    if (!target || !container.contains(target)) return;

    const idx = items.indexOf(target);
    if (idx === -1) return;

    e.stopPropagation();
    isDragging = true;
    dragAnchorIndex = idx;
    hadFocusBeforeDown =
      currentRange !== null && currentRange[0] === idx && currentRange[1] === idx;
    updateRange([idx, idx]);
  };

  const onContainerPointerOver = (e: PointerEvent) => {
    if (!isDragging || dragAnchorIndex === null) return;
    const items = getItems();
    const target = (e.target as HTMLElement).closest<HTMLElement>(".sr-clickable");
    if (!target || !container.contains(target)) return;

    const idx = items.indexOf(target);
    if (idx !== -1) {
      updateRange([dragAnchorIndex, idx]);
    }
  };

  const onPointerUp = () => {
    if (!isDragging) return;
    isDragging = false;

    // Toggle off if clicking the single item that was already focused
    if (
      dragAnchorIndex !== null &&
      currentRange &&
      currentRange[0] === dragAnchorIndex &&
      currentRange[1] === dragAnchorIndex &&
      hadFocusBeforeDown
    ) {
      updateRange(null);
    }
    dragAnchorIndex = null;
  };

  const onWindowClick = (e: MouseEvent) => {
    if (!container.contains(e.target as Node)) {
      updateRange(null);
    }
  };

  const onStepChange = () => {
    updateRange(null);
  };

  if (interactive && typeof window !== "undefined") {
    container.addEventListener("pointerdown", onContainerPointerDown);
    container.addEventListener("pointerover", onContainerPointerOver);
    window.addEventListener("pointerup", onPointerUp);
    window.addEventListener("click", onWindowClick);
    window.addEventListener("stageroutine:stepchange", onStepChange);
  }

  markClickable();

  return {
    get focusedRange() {
      return currentRange;
    },
    get focusedIndex() {
      return currentRange && currentRange[0] === currentRange[1] ? currentRange[0] : null;
    },
    focus(start: number, end: number = start) {
      const items = getItems();
      if (start >= 0 && start < items.length) {
        updateRange([start, Math.min(end, items.length - 1)]);
      }
    },
    unfocus() {
      updateRange(null);
    },
    refresh() {
      markClickable();
      if (currentRange !== null) {
        updateRange(currentRange);
      }
    },
    destroy() {
      if (interactive && typeof window !== "undefined") {
        container.removeEventListener("pointerdown", onContainerPointerDown);
        container.removeEventListener("pointerover", onContainerPointerOver);
        window.removeEventListener("pointerup", onPointerUp);
        window.removeEventListener("click", onWindowClick);
        window.removeEventListener("stageroutine:stepchange", onStepChange);
      }
    },
  };
}
