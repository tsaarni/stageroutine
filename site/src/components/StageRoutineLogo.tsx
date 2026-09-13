import DisplayLogo from "@site/static/img/stageroutine-logo.svg";
import MicroLogo from "@site/static/img/stageroutine-logo-micro.svg";
import type { SVGProps } from "react";

export interface StageRoutineLogoProps extends SVGProps<SVGSVGElement> {
  size?: number;
}

/**
 * Adaptive StageRoutine brand logomark.
 * Automatically switches between the display master and the dedicated
 * micro vector SVG for small scales (<= 20px).
 */
export default function StageRoutineLogo({
  size,
  width,
  height,
  style,
  ...props
}: StageRoutineLogoProps) {
  const effectiveSize =
    (typeof width === "number" ? width : undefined) ??
    (typeof height === "number" ? height : undefined) ??
    (typeof width === "string" ? Number.parseInt(width, 10) : undefined) ??
    size ??
    32;

  const isMicro = !Number.isNaN(effectiveSize) && effectiveSize <= 20;
  const Component = isMicro ? MicroLogo : DisplayLogo;
  const w = width ?? size ?? (isMicro ? 16 : 512);
  const h = height ?? size ?? (isMicro ? 16 : 512);

  return <Component width={w} height={h} style={{ color: "inherit", ...style }} {...props} />;
}
