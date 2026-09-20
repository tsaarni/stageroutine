/**
 * Dream-like rolling liquid ripple entrance decorator using dynamic SVG displacement.
 */

import type { DOMElement, ElementDecorator } from "../dom/element";

/**
 * Configuration options for the dream liquid decorator.
 * @category Decorators
 * @inline
 */
export interface DreamOptions {
  /** Entrance animation duration in seconds (default: 1.4). */
  duration?: number;
  /** Delay before entrance animation starts in seconds (default: 0). */
  delay?: number;
  /** Initial liquid displacement wave height in pixels (default: 32). */
  intensity?: number;
  /** Optical defocus blur in pixels that resolves into sharp focus (default: 8). */
  blur?: number;
  /** Prismatic chromatic dispersion strength (default: 0.15). Set to false or 0 to disable. */
  prismatic?: boolean | number;
  /** Vertical micro-drift distance in pixels (default: 12). Set to 0 to disable. */
  float?: number;
}

let filterCounter = 0;
let isShaderWarmedUp = false;

/**
 * Renders an offscreen canvas pixel during idle time.
 * Compiles GPU filter shaders in advance to avoid first-frame animation stutter.
 */
function warmUpDreamShader(filterId: string): void {
  if (isShaderWarmedUp) return;
  isShaderWarmedUp = true;

  const run = () => {
    try {
      const canvas = document.createElement("canvas");
      canvas.width = 4;
      canvas.height = 4;
      const ctx = canvas.getContext("2d");
      if (ctx && "filter" in ctx) {
        ctx.filter = `blur(4px) url(#${filterId})`;
        ctx.fillRect(0, 0, 4, 4);
      }
    } catch {
      // Non-blocking fallback if canvas filter is restricted
    }
  };

  if (typeof requestIdleCallback !== "undefined") {
    requestIdleCallback(run);
  } else {
    setTimeout(run, 50);
  }
}

/**
 * Decorates an element with an optical liquid dream entrance.
 *
 * The element materializes through undulating liquid ripples, prismatic dispersion,
 * and a soft optical blur that settles into razor-sharp focus.
 *
 * @category Decorators
 */
export function dream(options: DreamOptions = {}): ElementDecorator {
  const {
    duration = 1.4,
    delay = 0,
    intensity = 32,
    blur = 8,
    prismatic = 0.15,
    float = 12,
  } = options;

  let chromaRatio = 0;
  if (typeof prismatic === "number") {
    chromaRatio = Math.max(0, prismatic);
  } else if (prismatic) {
    chromaRatio = 0.15;
  }

  return (element: DOMElement) => {
    element.enterDuration = duration;
    if (delay > 0) {
      element.enterDelay = delay;
    }

    const el = element.domElement;

    const filterId = `sr-dream-liquid-${++filterCounter}`;

    let turb!: SVGFETurbulenceElement;
    let disp: SVGFEDisplacementMapElement | null = null;
    let dispRed: SVGFEDisplacementMapElement | null = null;
    let dispCyan: SVGFEDisplacementMapElement | null = null;

    const svg = (
      <svg style="position:absolute;width:0;height:0;pointer-events:none" aria-hidden="true">
        <filter
          id={filterId}
          x="-30%"
          y="-30%"
          width="160%"
          height="160%"
          color-interpolation-filters="sRGB"
        >
          <feTurbulence
            ref={(node: SVGFETurbulenceElement) => {
              turb = node;
            }}
            type="fractalNoise"
            baseFrequency="0.016 0.028"
            numOctaves="2"
            result="waterNoise"
          />
          {chromaRatio > 0 ? (
            <>
              <feColorMatrix
                in="SourceGraphic"
                type="matrix"
                values="1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0"
                result="redChannel"
              />
              <feDisplacementMap
                ref={(node: SVGFEDisplacementMapElement) => {
                  dispRed = node;
                }}
                in="redChannel"
                in2="waterNoise"
                scale="0"
                xChannelSelector="R"
                yChannelSelector="G"
                result="redDisplaced"
              />
              <feColorMatrix
                in="SourceGraphic"
                type="matrix"
                values="0 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 1 0"
                result="cyanChannel"
              />
              <feDisplacementMap
                ref={(node: SVGFEDisplacementMapElement) => {
                  dispCyan = node;
                }}
                in="cyanChannel"
                in2="waterNoise"
                scale="0"
                xChannelSelector="R"
                yChannelSelector="G"
                result="cyanDisplaced"
              />
              <feBlend in="redDisplaced" in2="cyanDisplaced" mode="screen" />
            </>
          ) : (
            <feDisplacementMap
              ref={(node: SVGFEDisplacementMapElement) => {
                disp = node;
              }}
              in="SourceGraphic"
              in2="waterNoise"
              scale="0"
              xChannelSelector="R"
              yChannelSelector="G"
            />
          )}
        </filter>
      </svg>
    );

    document.body.appendChild(svg);
    warmUpDreamShader(filterId);

    const reset = () => {
      el.style.filter = "";
      el.style.translate = "";
      if (dispRed) dispRed.setAttribute("scale", "0");
      if (dispCyan) dispCyan.setAttribute("scale", "0");
      if (disp) disp.setAttribute("scale", "0");
    };

    element.onUpdate((progress) => {
      if (progress <= 0 || progress >= 1) {
        reset();
        return;
      }

      // Calming curve: ripples and defocus gently settle as element materializes
      const remaining = 1 - progress;
      const currentIntensity = intensity * remaining;
      const currentBlur = blur * remaining;
      const currentFloat = float * remaining;

      // Dynamic multi-harmonic wave oscillation across the liquid surface
      const waveTime = progress * duration * 3.6;
      const freqX = (0.016 + 0.007 * Math.sin(waveTime)).toFixed(4);
      const freqY = (0.028 + 0.009 * Math.cos(waveTime * 0.85)).toFixed(4);
      turb.setAttribute("baseFrequency", `${freqX} ${freqY}`);

      if (chromaRatio > 0) {
        dispRed?.setAttribute("scale", (currentIntensity * (1 + chromaRatio)).toFixed(2));
        dispCyan?.setAttribute("scale", (currentIntensity * (1 - chromaRatio)).toFixed(2));
      } else {
        disp?.setAttribute("scale", currentIntensity.toFixed(2));
      }

      if (currentBlur > 0.15) {
        el.style.filter = `blur(${currentBlur.toFixed(2)}px) url(#${filterId})`;
      } else if (currentIntensity > 0.5) {
        el.style.filter = `url(#${filterId})`;
      } else {
        el.style.filter = "";
      }

      if (currentFloat > 0.1) {
        el.style.translate = `0px ${currentFloat.toFixed(2)}px`;
      } else {
        el.style.translate = "";
      }
    });

    element.onDeactivate(reset);
    element.onUnmount(() => {
      reset();
      svg.remove();
    });
  };
}
