/**
 * Type definitions for StageRoutine Presenter Pointer Plugins.
 */

export interface PointerContext {
  /** The stage top-level container element (screen space) */
  container: HTMLElement;
  /** The scaled virtual viewport element (1920x1080) */
  viewport: HTMLElement;
  /** Virtual stage width */
  width: number;
  /** Virtual stage height */
  height: number;
}

export interface PointerCoordinates {
  /** Screen space coordinates in physical browser pixels */
  screenX: number;
  screenY: number;
  /** Virtual stage coordinates mapped to canvas bounds (e.g. 0..1920, 0..1080) */
  virtualX: number;
  virtualY: number;
}

export interface PointerPlugin {
  /** Unique plugin identifier */
  readonly id: string;
  /** Invoked once when stage initializes */
  mount(ctx: PointerContext): void;
  /** Toggled when presenter enables or disables pointer mode */
  setActive(active: boolean): void;
  /** Updated on pointer movement with both screen and virtual coordinates */
  moveTo(coords: PointerCoordinates): void;
  /** Triggered on click / ping in pointer mode */
  ping?(coords: PointerCoordinates): void;
  /** Triggered on mouse/pointer button down */
  onPointerDown?(coords: PointerCoordinates): void;
  /** Triggered on mouse/pointer button up */
  onPointerUp?(coords: PointerCoordinates): void;
  /** Cleans up DOM nodes and timers */
  destroy(): void;
  /** Optional diagnostics metrics provider */
  getMetrics?(): Record<string, unknown>;
}
