import type { DOMElement, ElementDecorator } from "../element";

export type TypewriterStep = string | { delete: number; pause?: number } | { pause: number };

export interface TypewriterOptions {
  /** Average speed per character in milliseconds (default: 45). */
  speed?: number;
  /** Backspace deletion speed per character in milliseconds (default: 28). */
  deleteSpeed?: number;
  /** Jitter/randomness factor from 0 to 1 for humanized typing cadence (default: 0.35). */
  jitter?: number;
  /** Extra pause in milliseconds on punctuation like .,!? (default: 250). */
  punctuationPause?: number;
  /** Pause in milliseconds after noticing a mistake before backspacing (default: 300). */
  mistakePause?: number;
  /** Initial delay in seconds before typing begins once visible (default: 0). */
  delay?: number;
  /** Cursor symbol to display while typing (default: "▋", pass false to disable). */
  cursor?: string | false;
  /** Custom typing and deletion script. */
  script?: TypewriterStep[];
}

/**
 * Decorates an element with human-like, realistic typing cadence, typo corrections, and blinking cursor.
 */
export function typewriter(options: TypewriterOptions = {}): ElementDecorator {
  const {
    speed = 45,
    deleteSpeed = 28,
    jitter = 0.35,
    punctuationPause = 250,
    mistakePause = 300,
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

    const steps: TypewriterStep[] = script || parseTextWithDeletes(initialText);

    let stepIndex = 0;
    let charIndex = 0;
    let activeTimer: ReturnType<typeof setTimeout> | null = null;
    let isPlaying = false;

    function getNextCharDelay(char: string): number {
      const randomJitter = (Math.random() * 2 - 1) * jitter * speed;
      let charDelay = Math.max(15, speed + randomJitter);

      if (/[.,!?;:]/.test(char)) {
        charDelay += punctuationPause;
      }
      return charDelay;
    }

    function executeStep() {
      if (stepIndex >= steps.length) {
        isPlaying = false;
        return;
      }

      const currentStep = steps[stepIndex];

      if (typeof currentStep === "string") {
        if (charIndex < currentStep.length) {
          const char = currentStep[charIndex];
          textSpan.textContent += char;
          charIndex++;
          activeTimer = setTimeout(executeStep, getNextCharDelay(char));
        } else {
          stepIndex++;
          charIndex = 0;
          activeTimer = setTimeout(executeStep, speed);
        }
      } else if ("pause" in currentStep && !("delete" in currentStep)) {
        stepIndex++;
        activeTimer = setTimeout(executeStep, currentStep.pause);
      } else if ("delete" in currentStep) {
        const countToDelete = currentStep.delete;
        const pauseBefore = currentStep.pause ?? mistakePause;

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
              activeTimer = setTimeout(backspaceChar, deleteSpeed);
            } else {
              stepIndex++;
              activeTimer = setTimeout(executeStep, speed + 50);
            }
          }
          backspaceChar();
        }, pauseBefore);
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
      isPlaying = true;

      if (delay > 0) {
        activeTimer = setTimeout(executeStep, delay * 1000);
      } else {
        executeStep();
      }
    }

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
        if (activeTimer) {
          clearTimeout(activeTimer);
          activeTimer = null;
        }
        isPlaying = false;
        textSpan.textContent = "";
      }

      wasVisible = currentlyVisible;
    });

    observer.observe(el, { attributes: true, attributeFilter: ["style"] });
  };
}

/**
 * Helper that parses inline `<del:N>` tokens into structured typing steps.
 * E.g. "simulatte<del:2>e" -> ["simulatte", { delete: 2 }, "e"]
 */
function parseTextWithDeletes(text: string): TypewriterStep[] {
  const steps: TypewriterStep[] = [];
  const regex = /<del:(\d+)>/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null = regex.exec(text);

  while (match !== null) {
    if (match.index > lastIndex) {
      steps.push(text.substring(lastIndex, match.index));
    }
    steps.push({ delete: Number.parseInt(match[1], 10) });
    lastIndex = regex.lastIndex;
    match = regex.exec(text);
  }

  if (lastIndex < text.length) {
    steps.push(text.substring(lastIndex));
  }

  return steps;
}
