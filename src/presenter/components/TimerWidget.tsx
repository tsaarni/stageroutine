/**
 * Interactive timer component with play, pause, reset, and inline click-to-edit features.
 */

export function TimerWidget(): HTMLElement {
  let elapsedSec = 0;
  let isTimerRunning = true;
  let isEditingTimer = false;
  let timerInterval: ReturnType<typeof setInterval> | null = null;

  const formatTime = (seconds: number): string => {
    const m = Math.floor(seconds / 60)
      .toString()
      .padStart(2, "0");
    const s = (seconds % 60).toString().padStart(2, "0");
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

  const timerDisplay = (
    <div class="timer-display" title="Elapsed Presentation Timer (Click to edit)">
      00:00
    </div>
  ) as unknown as HTMLElement;

  const toggleIcon = (
    <span class="material-symbols-outlined">pause</span>
  ) as unknown as HTMLElement;

  const updateDisplay = () => {
    if (!isEditingTimer) {
      timerDisplay.textContent = formatTime(elapsedSec);
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

    const currentVal = formatTime(elapsedSec);
    timerDisplay.classList.add("editing");

    let committed = false;

    const finishEdit = (commit: boolean) => {
      if (!isEditingTimer) return;
      isEditingTimer = false;
      timerDisplay.classList.remove("editing");

      if (commit) {
        const parsed = parseTimeString(input.value);
        if (parsed !== null) {
          elapsedSec = parsed;
        }
      }

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
    input.focus();
    input.select();
  };

  timerDisplay.onclick = startEditing;

  // Keyboard shortcut integration for P and R
  window.addEventListener("keydown", (e) => {
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
    if (e.key === "p" || e.key === "P") {
      toggleTimer();
    } else if (e.key === "r" || e.key === "R") {
      if (!e.altKey && !e.ctrlKey && !e.metaKey) {
        resetTimer();
      }
    }
  });

  // Start on mount
  startTimer();

  return (
    <div class="timer-widget">
      {timerDisplay}
      <div class="timer-actions">
        <button
          type="button"
          class="m3-icon-btn tonal"
          title="Pause / Resume Timer (Key: P)"
          onclick={toggleTimer}
        >
          {toggleIcon}
        </button>
        <button
          type="button"
          class="m3-icon-btn tonal"
          title="Reset Timer (Key: R)"
          onclick={resetTimer}
        >
          <span class="material-symbols-outlined">replay</span>
        </button>
      </div>
    </div>
  ) as unknown as HTMLElement;
}
