import type React from "react";
import { useEffect, useRef } from "react";
import styles from "./StageLighting.module.css";

/**
 * Centralized theatrical stage lighting parameters.
 * Modify these constants to adjust light source, target, or motion behavior in one place.
 */
export const STAGE_LIGHTING_CONFIG = {
  // Overhead light fixture at the ceiling
  fixture: {
    x: 680,
    y: 40,
    volumetricWidth: 72,
    coreWidth: 33,
    gradientX: "72%",
    gradientY: "0%",
  },
  // Default beam target coordinates on the stage floor
  target: {
    baseX: 560,
    baseY: 480,
    volumetricRadiusX: 282,
    volumetricRadiusY: 68,
    coreRadiusX: 184,
    coreRadiusY: 45,
    gradientX: "50%",
    gradientY: "58%",
  },
  // Cursor tracking responsiveness & limits
  motion: {
    maxOffsetX: 60,
    damping: 0.08,
    epsilon: 0.05,
  },
  // Logo bloom coupling parameters
  logoBloom: {
    logoX: 600,
    heightRatio: 0.56,
    proximityRadius: 140,
    shiftFactorX: 0.08,
    baseBlur: 14,
    maxBlurBonus: 10,
  },
} as const;

export function StageLighting(): React.JSX.Element {
  const rootRef = useRef<HTMLDivElement>(null);
  const volBeamRef = useRef<SVGPathElement>(null);
  const coreBeamRef = useRef<SVGPathElement>(null);

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReducedMotion) {
      if (rootRef.current) {
        rootRef.current.classList.add(styles.stageLightingOn);
      }
      return;
    }

    const parent = rootRef.current?.parentElement;
    if (parent) {
      parent.style.setProperty("--logo-bloom-filter", "drop-shadow(0 0 0px transparent)");
    }

    const { fixture, target, motion, logoBloom } = STAGE_LIGHTING_CONFIG;

    const volLeft = fixture.x - fixture.volumetricWidth / 2;
    const volRight = fixture.x + fixture.volumetricWidth / 2;
    const coreLeft = fixture.x - fixture.coreWidth / 2;
    const coreRight = fixture.x + fixture.coreWidth / 2;

    let targetX = 0;
    let currentX = 0;
    let rafId: number | null = null;
    let isAnimating = false;
    let isLightOn = false;

    const updateLogoBloom = (cx: number, active: boolean) => {
      const parentEl = rootRef.current?.parentElement;
      if (!parentEl) return;

      if (!active) {
        parentEl.style.setProperty("--logo-bloom-filter", "drop-shadow(0 0 0px transparent)");
        return;
      }

      const beamXAtLogo = fixture.x + (cx - fixture.x) * logoBloom.heightRatio;
      const relX = beamXAtLogo - logoBloom.logoX;
      const proximity = Math.max(0, 1 - Math.abs(relX) / logoBloom.proximityRadius);

      const bloomX = (-relX * logoBloom.shiftFactorX).toFixed(1);
      const bloomY = (1 + Math.abs(relX) * 0.02).toFixed(1);
      const blur = (logoBloom.baseBlur + proximity * logoBloom.maxBlurBonus).toFixed(1);
      const haloAlpha = (0.18 + proximity * 0.14).toFixed(2);
      const coreAlpha = (0.32 + proximity * 0.2).toFixed(2);

      parentEl.style.setProperty(
        "--logo-bloom-filter",
        `drop-shadow(${bloomX}px ${bloomY}px ${blur}px rgba(224, 242, 254, ${haloAlpha})) drop-shadow(0 0 5px rgba(255, 255, 255, ${coreAlpha}))`,
      );
    };

    const updateScene = (cx: number, cy: number) => {
      // 1. Update volumetric beam cone path directly in DOM (zero React re-renders)
      volBeamRef.current?.setAttribute(
        "d",
        `M ${volRight},${fixture.y} L ${cx + target.volumetricRadiusX},${cy} A ${target.volumetricRadiusX},${target.volumetricRadiusY} 0 0,1 ${cx - target.volumetricRadiusX},${cy} L ${volLeft},${fixture.y} Z`,
      );

      // 2. Update dense central core beam path
      coreBeamRef.current?.setAttribute(
        "d",
        `M ${coreRight},${fixture.y} L ${cx + target.coreRadiusX},${cy} A ${target.coreRadiusX},${target.coreRadiusY} 0 0,1 ${cx - target.coreRadiusX},${cy} L ${coreLeft},${fixture.y} Z`,
      );

      // 3. Modulate logo bloom via CSS variable on the parent hero wrapper
      if (isLightOn) {
        updateLogoBloom(cx, true);
      }
    };

    const tick = () => {
      const dx = targetX - currentX;

      // When settled within epsilon, halt the RAF loop completely
      if (Math.abs(dx) < motion.epsilon) {
        currentX = targetX;
        updateScene(target.baseX + currentX, target.baseY);
        isAnimating = false;
        rafId = null;
        return;
      }

      currentX += dx * motion.damping;
      updateScene(target.baseX + currentX, target.baseY);

      rafId = requestAnimationFrame(tick);
    };

    const startAnimation = () => {
      if (!isAnimating) {
        isAnimating = true;
        rafId = requestAnimationFrame(tick);
      }
    };

    const turnOn = () => {
      if (isLightOn) return;
      isLightOn = true;

      const el = rootRef.current;
      if (el) {
        el.classList.add(styles.stageLightingOn);
      }

      updateLogoBloom(target.baseX + currentX, true);
      startAnimation();
    };

    const handlePointerMove = (e: PointerEvent) => {
      if (!isLightOn) {
        window.clearTimeout(loadTimer);
        turnOn();
      }

      const container = rootRef.current?.parentElement ?? rootRef.current;
      if (!container) return;

      const rect = container.getBoundingClientRect();
      if (rect.width <= 0) return;

      const nx = Math.max(-1, Math.min(1, ((e.clientX - rect.left) / rect.width - 0.5) * 2));
      targetX = nx * motion.maxOffsetX;

      startAnimation();
    };

    const handlePointerLeave = () => {
      targetX = 0;
      startAnimation();
    };

    // Delay light turn-on after initial page load (~400ms)
    const loadTimer = window.setTimeout(() => {
      turnOn();
    }, 400);

    window.addEventListener("pointermove", handlePointerMove, { passive: true });
    window.addEventListener("pointerleave", handlePointerLeave);
    document.addEventListener("mouseleave", handlePointerLeave);

    return () => {
      window.clearTimeout(loadTimer);
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerleave", handlePointerLeave);
      document.removeEventListener("mouseleave", handlePointerLeave);
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
      }
    };
  }, []);

  const { fixture, target } = STAGE_LIGHTING_CONFIG;
  const volLeft = fixture.x - fixture.volumetricWidth / 2;
  const volRight = fixture.x + fixture.volumetricWidth / 2;
  const coreLeft = fixture.x - fixture.coreWidth / 2;
  const coreRight = fixture.x + fixture.coreWidth / 2;

  const initialVolPath = `M ${volRight},${fixture.y} L ${target.baseX + target.volumetricRadiusX},${target.baseY} A ${target.volumetricRadiusX},${target.volumetricRadiusY} 0 0,1 ${target.baseX - target.volumetricRadiusX},${target.baseY} L ${volLeft},${fixture.y} Z`;
  const initialCorePath = `M ${coreRight},${fixture.y} L ${target.baseX + target.coreRadiusX},${target.baseY} A ${target.coreRadiusX},${target.coreRadiusY} 0 0,1 ${target.baseX - target.coreRadiusX},${target.baseY} L ${coreLeft},${fixture.y} Z`;

  return (
    <div ref={rootRef} className={styles.stageLighting} aria-hidden="true">
      <svg
        className={styles.stageLightingSvg}
        viewBox="0 0 1200 800"
        preserveAspectRatio="xMidYMid meet"
      >
        <title>Stage Lighting</title>
        <defs>
          {/* Optical edge blur with penumbra */}
          <filter id="srBeamOptical" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="9" />
          </filter>

          {/* Inner core beam diffusion */}
          <filter id="srBeamCoreBlur" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="16" />
          </filter>

          {/* Main volumetric beam gradient */}
          <linearGradient
            id="srVolBeamGrad"
            x1={fixture.gradientX}
            y1={fixture.gradientY}
            x2={target.gradientX}
            y2={target.gradientY}
          >
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.48" />
            <stop offset="12%" stopColor="#e0f2fe" stopOpacity="0.32" />
            <stop offset="38%" stopColor="#38bdf8" stopOpacity="0.16" />
            <stop offset="72%" stopColor="#38bdf8" stopOpacity="0.06" />
            <stop offset="100%" stopColor="#818cf8" stopOpacity="0.02" />
          </linearGradient>

          {/* Dense core beam gradient */}
          <linearGradient
            id="srCoreBeamGrad"
            x1={fixture.gradientX}
            y1={fixture.gradientY}
            x2={target.gradientX}
            y2={target.gradientY}
          >
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.85" />
            <stop offset="15%" stopColor="#ffffff" stopOpacity="0.5" />
            <stop offset="45%" stopColor="#bae6fd" stopOpacity="0.26" />
            <stop offset="80%" stopColor="#38bdf8" stopOpacity="0.06" />
            <stop offset="100%" stopColor="#38bdf8" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* 1. Wide volumetric beam cone */}
        <path
          ref={volBeamRef}
          d={initialVolPath}
          fill="url(#srVolBeamGrad)"
          filter="url(#srBeamOptical)"
        />

        {/* 2. Dense central light column */}
        <path
          ref={coreBeamRef}
          d={initialCorePath}
          fill="url(#srCoreBeamGrad)"
          filter="url(#srBeamCoreBlur)"
        />
      </svg>
    </div>
  );
}
