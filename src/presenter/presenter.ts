/**
 * Controller for the presenter console UI, managing live notes, timers, jump menus, and screen recording.
 */

import { PresenterRecorder, createPresenterClient } from "./index";

const client = createPresenterClient();
const recorder = new PresenterRecorder();

// DOM References
const stepText = document.getElementById("step-text");
const currentNotes = document.getElementById("current-notes");
const nextScene = document.getElementById("next-scene");
const nextNotes = document.getElementById("next-notes");
const progressBar = document.getElementById("progress-bar");
const wallClock = document.getElementById("wall-clock");

const timer = document.getElementById("timer");
const btnTimerToggle = document.getElementById("btn-timer-toggle");
const timerToggleIcon = document.getElementById("timer-toggle-icon");
const btnTimerReset = document.getElementById("btn-timer-reset");

const btnRecord = document.getElementById("btn-record");
const recLabel = document.getElementById("rec-label");

const stepBadge = document.getElementById("step-badge");
const stepMenu = document.getElementById("step-menu");

const btnNext = document.getElementById("btn-next") as HTMLButtonElement | null;
const btnPrev = document.getElementById("btn-prev") as HTMLButtonElement | null;
const btnFontInc = document.getElementById("btn-font-inc");
const btnFontDec = document.getElementById("btn-font-dec");

// ============================================================================
// 0. GPU Screen Recorder Integration
// ============================================================================
recorder.onUpdate((state) => {
  if (btnRecord && recLabel) {
    if (state.isRecording) {
      btnRecord.classList.add("recording");
      recLabel.textContent = `REC ${state.formattedTime} (Stop)`;
    } else {
      btnRecord.classList.remove("recording");
      recLabel.textContent = "Record";
    }
  }
});

btnRecord?.addEventListener("click", () => {
  recorder.toggle();
});

// ============================================================================
// 0.1 Scene / Step Jump Dropdown Popup
// ============================================================================
let currentStepIndex = 0;
let registeredSteps: { stepIndex: number; sceneName: string }[] = [];

function renderStepMenu(
  steps: { stepIndex: number; sceneName: string }[],
  activeIdx: number,
): void {
  if (!stepMenu) return;
  stepMenu.innerHTML = "";

  for (const step of steps) {
    const item = document.createElement("button");
    item.className = `m3-dropdown-item ${step.stepIndex === activeIdx ? "active" : ""}`;
    const stepNum = String(step.stepIndex + 1).padStart(2, "0");
    item.innerHTML = `
      <span class="dropdown-step-num">${stepNum}</span>
      <span>${step.sceneName || `Scene ${step.stepIndex + 1}`}</span>
    `;

    item.addEventListener("click", (e) => {
      e.stopPropagation();
      client.goto(step.stepIndex);
      closeStepMenu();
    });

    stepMenu.appendChild(item);
  }
}

function openStepMenu(): void {
  stepBadge?.classList.add("open");
  stepMenu?.classList.add("open");
}

function closeStepMenu(): void {
  stepBadge?.classList.remove("open");
  stepMenu?.classList.remove("open");
}

function toggleStepMenu(): void {
  if (stepMenu?.classList.contains("open")) {
    closeStepMenu();
  } else {
    openStepMenu();
  }
}

stepBadge?.addEventListener("click", (e) => {
  e.stopPropagation();
  toggleStepMenu();
});

window.addEventListener("click", (e) => {
  if (!stepMenu?.contains(e.target as Node) && !stepBadge?.contains(e.target as Node)) {
    closeStepMenu();
  }
});

// ============================================================================
// 1. Presentation Timer with Pause & Reset
// ============================================================================
let elapsedSec = 0;
let isTimerRunning = true;
let timerInterval: ReturnType<typeof setInterval> | null = null;

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0");
  const s = (seconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

function updateTimerDisplay(): void {
  if (timer) {
    timer.textContent = formatTime(elapsedSec);
    if (isTimerRunning) {
      timer.classList.remove("paused");
    } else {
      timer.classList.add("paused");
    }
  }
  if (timerToggleIcon) {
    timerToggleIcon.textContent = isTimerRunning ? "pause" : "play_arrow";
  }
}

function startTimer(): void {
  if (timerInterval) clearInterval(timerInterval);
  isTimerRunning = true;
  updateTimerDisplay();
  timerInterval = setInterval(() => {
    elapsedSec++;
    updateTimerDisplay();
  }, 1000);
}

function pauseTimer(): void {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
  isTimerRunning = false;
  updateTimerDisplay();
}

function toggleTimer(): void {
  if (isTimerRunning) {
    pauseTimer();
  } else {
    startTimer();
  }
}

function resetTimer(): void {
  elapsedSec = 0;
  updateTimerDisplay();
}

btnTimerToggle?.addEventListener("click", toggleTimer);
btnTimerReset?.addEventListener("click", resetTimer);

// Start timer on load
startTimer();

// ============================================================================
// 2. Wall Clock (Local Time)
// ============================================================================
function updateWallClock(): void {
  if (wallClock) {
    const now = new Date();
    wallClock.textContent = now.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  }
}
updateWallClock();
setInterval(updateWallClock, 1000);

// ============================================================================
// 3. Notes Formatting Helper
// ============================================================================
function renderNotesContent(notesRaw: string | undefined): void {
  if (!currentNotes) return;

  if (!notesRaw || notesRaw.trim().length === 0) {
    currentNotes.innerHTML =
      '<span class="notes-empty-state">No speaker notes for this step.</span>';
    return;
  }

  const lines = notesRaw
    .trim()
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  const hasBullets = lines.some((l) => l.startsWith("-") || l.startsWith("*") || l.startsWith("•"));

  if (hasBullets) {
    const listItems = lines
      .map((l) => {
        const cleaned = l.replace(/^[-*•]\s*/, "");
        return `<li>${cleaned}</li>`;
      })
      .join("");
    currentNotes.innerHTML = `<ul>${listItems}</ul>`;
  } else {
    currentNotes.textContent = notesRaw;
  }
}

// ============================================================================
// 4. Font Size Zooming
// ============================================================================
let currentFontSize = 20; // px
function setFontSize(size: number): void {
  currentFontSize = Math.min(36, Math.max(14, size));
  if (currentNotes) {
    currentNotes.style.fontSize = `${currentFontSize}px`;
  }
}

btnFontInc?.addEventListener("click", () => setFontSize(currentFontSize + 2));
btnFontDec?.addEventListener("click", () => setFontSize(currentFontSize - 2));

// ============================================================================
// 5. Presenter Client State Sync
// ============================================================================
client.onUpdate((msg) => {
  currentStepIndex = msg.currentStep;
  if (stepText) {
    stepText.textContent = `Step ${msg.currentStep + 1} of ${msg.totalSteps}${
      msg.sceneName ? ` · ${msg.sceneName}` : ""
    }`;
  }

  // Update dropdown menu
  if (msg.steps && msg.steps.length > 0) {
    registeredSteps = msg.steps;
    renderStepMenu(registeredSteps, currentStepIndex);
  }

  // Update progress bar
  if (progressBar) {
    const progress = msg.totalSteps > 1 ? (msg.currentStep / (msg.totalSteps - 1)) * 100 : 100;
    progressBar.style.width = `${Math.min(100, Math.max(0, progress))}%`;
  }

  // Current speaker notes
  renderNotesContent(msg.notes);

  // Coming up next
  if (msg.nextSceneName) {
    if (nextScene) nextScene.textContent = msg.nextSceneName;
    if (nextNotes) {
      nextNotes.textContent = msg.nextNotes
        ? msg.nextNotes.replace(/\n+/g, " • ").trim()
        : "(No notes for next step)";
    }
  } else {
    if (nextScene) nextScene.textContent = "End of presentation 🎉";
    if (nextNotes) nextNotes.textContent = "No further steps";
  }

  // Navigation button states
  if (btnPrev) {
    btnPrev.disabled = msg.currentStep <= 0;
  }
  if (btnNext) {
    btnNext.disabled = msg.currentStep >= msg.totalSteps - 1;
  }
});

btnNext?.addEventListener("click", () => client.next());
btnPrev?.addEventListener("click", () => client.prev());

// ============================================================================
// 6. Keyboard Shortcuts
// ============================================================================
window.addEventListener("keydown", (e) => {
  // Don't intercept if user is inside an input/textarea
  if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

  if (e.key === "Escape") {
    closeStepMenu();
  } else if (e.key === "ArrowRight" || e.key === " " || e.key === "PageDown") {
    e.preventDefault();
    closeStepMenu();
    client.next();
  } else if (e.key === "ArrowLeft" || e.key === "PageUp") {
    e.preventDefault();
    closeStepMenu();
    client.prev();
  } else if (e.key === "p" || e.key === "P") {
    toggleTimer();
  } else if ((e.key === "r" || e.key === "R") && (e.altKey || e.metaKey || e.ctrlKey)) {
    e.preventDefault();
    recorder.toggle();
  } else if (e.key === "r" || e.key === "R") {
    resetTimer();
  } else if (e.key === "+" || e.key === "=") {
    setFontSize(currentFontSize + 4);
  } else if (e.key === "-" || e.key === "_") {
    setFontSize(currentFontSize - 4);
  }
});
