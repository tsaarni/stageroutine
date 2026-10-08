/**
 * Stage unit system.
 *
 * The stage is 90 units tall. Width follows the aspect ratio, so a 16:9 stage is
 * 160 units wide. One unit is the same distance on both axes.
 */

/** Stage height in stage units. */
export const STAGE_UNITS_TALL = 90;

/** CSS custom property holding the length of one stage unit. */
export const STAGE_UNIT_VAR = "--sr-u";

/** Stage width in stage units, from the canvas aspect ratio. */
export function stageUnitsWide(canvasWidth: number, canvasHeight: number): number {
  if (canvasHeight <= 0) return STAGE_UNITS_TALL;
  return (canvasWidth / canvasHeight) * STAGE_UNITS_TALL;
}

/** Length of one stage unit in canvas pixels. */
export function stageUnitPx(canvasHeight: number): number {
  return canvasHeight / STAGE_UNITS_TALL;
}

/** Formats stage units as a CSS length. */
export function units(value: number): string {
  return `calc(${value} * var(${STAGE_UNIT_VAR}))`;
}

/** Formats a coordinate or size as a CSS length. Numbers are stage units, strings pass through. */
export function cssLength(value: number | string | undefined): string | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value === "number") return units(value);
  const str = String(value).trim();
  return str === "" ? undefined : str;
}
