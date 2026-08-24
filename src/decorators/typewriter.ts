/**
 * Animates text letter-by-letter with realistic typing, backspaces, pauses, and a blinking cursor.
 */

import type { DOMElement, ElementDecorator } from "../dom/element";

/**
 * Represents an individual action in a structured typewriter script:
 * - `string`: Types out the text at default speed.
 * - `{ text: string; speed?: number }`: Types out text at an optional custom per-character speed in seconds.
 * - `{ delete: number; pause?: number; speed?: number }`: Backspaces `delete` count of characters after an optional `pause` in seconds, with optional backspace `speed` in seconds.
 * - `{ pause: number }`: Pauses typing for a given duration in seconds.
 *
 * All time durations across typewriter steps are expressed in **seconds** (float).
 */
export type TypewriterStep =
  | string
  | { text: string; speed?: number }
  | { delete: number; pause?: number; speed?: number }
  | { pause: number };

/**
 * Configuration options for the `typewriter` element decorator.
 * All time durations are expressed in **seconds** (float).
 */
export interface TypewriterOptions {
  /** Default typing speed per character in seconds (default: `0.045`). */
  speed?: number;
  /** Default backspace deletion speed per character in seconds (default: `0.028`). */
  deleteSpeed?: number;
  /** Jitter/randomness factor from 0 to 1 for humanized typing cadence (default: `0.35`). */
  jitter?: number;
  /** Extra pause in seconds on punctuation characters like `.,!?` (default: `0.25`). */
  punctuationPause?: number;
  /** Pause in seconds after noticing a mistake before backspacing (default: `0.3`). */
  mistakePause?: number;
  /** Initial delay in seconds before typing begins once the element becomes visible (default: `0`). */
  delay?: number;
  /** Cursor symbol to display while typing (default: `"▋"`, pass `false` to disable). */
  cursor?: string | false;
  /**
   * Custom typing, backspacing, and pause steps.
   * All time values in script steps are in **seconds** (float).
   */
  script?: TypewriterStep[];
}

/**
 * Decorates an element with human-like, realistic typing cadence, typo corrections, and blinking cursor.
 *
 * All duration and timing values are expressed in **seconds** (float).
 *
 * @example
 * ```ts
 * // 1. Typing initial element text with entrance delay
 * heading.decorate(typewriter({ delay: 0.5 }));
 *
 * // 2. Custom script with simulated typos, pauses, and backspacing
 * text.decorate(typewriter({
 *   delay: 0.6,
 *   script: [
 *     "Decorators can simulatte",
 *     { delete: 2 },
 *     "e realistic typing...",
 *   ],
 * }));
 *
 * // 3. Passing a script array directly
 * label.decorate(typewriter([
 *   "Loading...",
 *   { pause: 0.5 },
 *   { delete: 10 },
 *   "Ready!",
 * ]));
 * ```
 */
export function typewriter(
  optionsOrScript: TypewriterOptions | TypewriterStep[] = {},
): ElementDecorator {
  const options: TypewriterOptions = Array.isArray(optionsOrScript)
    ? { script: optionsOrScript }
    : optionsOrScript;

  const {
    speed = 0.045,
    deleteSpeed = 0.028,
    jitter = 0.35,
    punctuationPause = 0.25,
    mistakePause = 0.3,
    delay = 0,
    cursor = "▋",
    script,
  } = options;

  return (element: DOMElement) => {
    const el = element.domElement;
    const initialText = el.textContent || "";
    el.textContent = "";

    const textSpan = document.createElement("span");
    el.appendChild(textSpan);

    let cursorSpan: HTMLSpanElement | undefined;
    if (cursor) {
      cursorSpan = document.createElement("span");
      cursorSpan.textContent = cursor;
      cursorSpan.style.display = "inline-block";
      cursorSpan.style.marginLeft = "2px";
      cursorSpan.style.opacity = "1";
      cursorSpan.animate([{ opacity: 1 }, { opacity: 0 }], {
        duration: 530,
        iterations: Number.POSITIVE_INFINITY,
        direction: "alternate",
      });
      el.appendChild(cursorSpan);
    }

    const steps: TypewriterStep[] = script || [initialText];

    let stepIndex = 0;
    let charIndex = 0;
    let activeTimer: ReturnType<typeof setTimeout> | null = null;
    let _isPlaying = false;

    function getNextCharDelay(char: string, baseSpeedSec: number): number {
      const randomJitter = (Math.random() * 2 - 1) * jitter * baseSpeedSec;
      let charDelay = Math.max(0.015, baseSpeedSec + randomJitter);

      if (/[.,!?;:]/.test(char)) {
        charDelay += punctuationPause;
      }
      return charDelay * 1000;
    }

    function executeStep() {
      if (stepIndex >= steps.length) {
        _isPlaying = false;
        return;
      }

      const currentStep = steps[stepIndex];

      if (
        typeof currentStep === "string" ||
        ("text" in currentStep && typeof currentStep.text === "string")
      ) {
        const text = typeof currentStep === "string" ? currentStep : currentStep.text;
        const charSpeed = (typeof currentStep === "object" && currentStep.speed) || speed;

        if (charIndex < text.length) {
          const char = text[charIndex];
          textSpan.textContent += char;
          charIndex++;
          activeTimer = setTimeout(executeStep, getNextCharDelay(char, charSpeed));
        } else {
          stepIndex++;
          charIndex = 0;
          activeTimer = setTimeout(executeStep, charSpeed * 1000);
        }
      } else if ("pause" in currentStep && !("delete" in currentStep)) {
        stepIndex++;
        activeTimer = setTimeout(executeStep, currentStep.pause * 1000);
      } else if ("delete" in currentStep) {
        const countToDelete = currentStep.delete;
        const pauseBefore = currentStep.pause ?? mistakePause;
        const stepDeleteSpeed = currentStep.speed ?? deleteSpeed;

        activeTimer = setTimeout(() => {
          let deleted = 0;
          function backspaceChar() {
            if (
              deleted < countToDelete &&
              textSpan.textContent &&
              textSpan.textContent.length > 0
            ) {
              textSpan.textContent = textSpan.textContent.slice(0, -1);
              deleted++;
              activeTimer = setTimeout(backspaceChar, stepDeleteSpeed * 1000);
            } else {
              stepIndex++;
              activeTimer = setTimeout(executeStep, (speed + 0.05) * 1000);
            }
          }
          backspaceChar();
        }, pauseBefore * 1000);
      }
    }

    function startTyping() {
      if (activeTimer) {
        clearTimeout(activeTimer);
        activeTimer = null;
      }
      textSpan.textContent = "";
      stepIndex = 0;
      charIndex = 0;
      _isPlaying = true;

      if (delay > 0) {
        activeTimer = setTimeout(executeStep, delay * 1000);
      } else {
        executeStep();
      }
    }

    function stopTyping() {
      if (activeTimer) {
        clearTimeout(activeTimer);
        activeTimer = null;
      }
      _isPlaying = false;
    }

    element.onPlay(() => {
      startTyping();
    });

    element.onPause(() => {
      stopTyping();
      textSpan.textContent = "";
    });

    // Auto-trigger and replay whenever element transitions into view
    const isCurrentlyVisible = () => {
      const op = Number.parseFloat(el.style.opacity);
      const vis = el.style.visibility;
      return (Number.isNaN(op) || op > 0.05) && vis !== "hidden";
    };

    let wasVisible = isCurrentlyVisible();

    if (wasVisible) {
      startTyping();
    }

    const observer = new MutationObserver(() => {
      const currentlyVisible = isCurrentlyVisible();

      if (currentlyVisible && !wasVisible) {
        startTyping();
      } else if (!currentlyVisible && wasVisible) {
        stopTyping();
        textSpan.textContent = "";
      }

      wasVisible = currentlyVisible;
    });

    observer.observe(el, { attributes: true, attributeFilter: ["style"] });
  };
}
