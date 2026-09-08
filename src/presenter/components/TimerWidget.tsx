/**
 * Interactive timer component with play, pause, reset, countdown, and inline click-to-edit features.
 */

export interface TimerWidgetElement extends HTMLElement {
  setConfig(durationSec: number | null, warningSec?: number | null): void;
}

export function TimerWidget(): TimerWidgetElement {
  let targetDurationSec = 0;
  let warnDurationSec: number | null = null;
  let elapsedSec = 0;
  let isTimerRunning = true;
  let isEditingTimer = false;
  let timerInterval: ReturnType<typeof setInterval> | null = null;

  const formatTime = (seconds: number): string => {
    const abs = Math.abs(seconds);
    const m = Math.floor(abs / 60)
      .toString()
      .padStart(2, "0");
    const s = (abs % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  const parseTimeString = (raw: string): number | null => {
    const trimmed = raw.trim();
    if (!trimmed) return null;

    if (trimmed.includes(":")) {
      const parts = trimmed.split(":");
      const min = Number.parseInt(parts[0] || "0", 10);
      const sec = Number.parseInt(parts[1] || "0", 10);
      if (!Number.isNaN(min) && !Number.isNaN(sec) && min >= 0 && sec >= 0 && sec < 60) {
        return min * 60 + sec;
      }
    } else {
      const min = Number.parseInt(trimmed, 10);
      if (!Number.isNaN(min) && min >= 0) {
        return min * 60;
      }
    }
    return null;
  };

  const signSpan = (<span class="timer-sign">-</span>) as unknown as HTMLElement;

  const digitsSpan = (<span class="timer-digits">00:00</span>) as unknown as HTMLElement;

  const timerDisplay = (
    <div class="timer-display" title="Presentation Timer (Click to edit)">
      {signSpan}
      {digitsSpan}
    </div>
  ) as unknown as HTMLElement;

  const toggleIcon = (
    <span class="material-symbols-outlined">pause</span>
  ) as unknown as HTMLElement;

  const updateDisplay = () => {
    if (!isEditingTimer) {
      const remaining = targetDurationSec - elapsedSec;
      digitsSpan.textContent = formatTime(remaining);

      if (remaining < 0) {
        signSpan.classList.add("visible");
        timerDisplay.classList.remove("warning");
        timerDisplay.classList.add("overtime");
      } else {
        signSpan.classList.remove("visible");
        timerDisplay.classList.remove("overtime");
        if (warnDurationSec !== null && remaining <= warnDurationSec) {
          timerDisplay.classList.add("warning");
        } else {
          timerDisplay.classList.remove("warning");
        }
      }

      if (isTimerRunning) {
        timerDisplay.classList.remove("paused");
      } else {
        timerDisplay.classList.add("paused");
      }
    }
    toggleIcon.textContent = isTimerRunning ? "pause" : "play_arrow";
  };

  const startTimer = () => {
    if (timerInterval) clearInterval(timerInterval);
    isTimerRunning = true;
    updateDisplay();
    timerInterval = setInterval(() => {
      elapsedSec++;
      updateDisplay();
    }, 1000);
  };

  const pauseTimer = () => {
    if (timerInterval) {
      clearInterval(timerInterval);
      timerInterval = null;
    }
    isTimerRunning = false;
    updateDisplay();
  };

  const toggleTimer = () => {
    if (isTimerRunning) {
      pauseTimer();
    } else {
      startTimer();
    }
  };

  const resetTimer = () => {
    elapsedSec = 0;
    updateDisplay();
  };

  const startEditing = () => {
    if (isEditingTimer) return;
    isEditingTimer = true;

    const wasRunning = isTimerRunning;
    if (isTimerRunning && timerInterval) {
      clearInterval(timerInterval);
      timerInterval = null;
    }

    const remaining = targetDurationSec - elapsedSec;
    const currentVal = formatTime(remaining);
    timerDisplay.classList.add("editing");

    let committed = false;

    const finishEdit = (commit: boolean) => {
      if (!isEditingTimer) return;
      isEditingTimer = false;
      timerDisplay.classList.remove("editing");

      if (commit) {
        const parsed = parseTimeString(input.value);
        if (parsed !== null) {
          targetDurationSec = parsed;
          elapsedSec = 0;
        }
      }

      timerDisplay.replaceChildren(signSpan, digitsSpan);

      if (wasRunning) {
        startTimer();
      } else {
        updateDisplay();
      }
    };

    const input = (
      <input
        type="text"
        class="timer-input"
        value={currentVal}
        placeholder="MM:SS"
        maxLength={7}
        spellcheck={false}
        onkeydown={(e: KeyboardEvent) => {
          if (e.key === "Enter") {
            e.preventDefault();
            committed = true;
            finishEdit(true);
          } else if (e.key === "Escape") {
            e.preventDefault();
            committed = true;
            finishEdit(false);
          }
        }}
        onblur={() => {
          if (!committed) {
            finishEdit(true);
          }
        }}
      />
    ) as unknown as HTMLInputElement;

    timerDisplay.replaceChildren(input);
    input.focus({ preventScroll: true });
    input.select();
  };

  timerDisplay.onclick = startEditing;

  // Start on mount
  startTimer();

  const root = (
    <div class="timer-widget">
      {timerDisplay}
      <div class="timer-actions">
        <button
          type="button"
          class="m3-icon-btn tonal"
          title="Pause / Resume Timer"
          onclick={toggleTimer}
        >
          {toggleIcon}
        </button>
        <button type="button" class="m3-icon-btn tonal" title="Reset Timer" onclick={resetTimer}>
          <span class="material-symbols-outlined">replay</span>
        </button>
      </div>
    </div>
  ) as unknown as TimerWidgetElement;

  root.setConfig = (durationSec: number | null, warningSec?: number | null) => {
    targetDurationSec = durationSec ?? 0;
    warnDurationSec = warningSec ?? null;
    elapsedSec = 0;
    updateDisplay();
  };

  return root;
}
