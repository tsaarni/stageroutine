/**
 * Controller for the presenter console, managing speaker notes, timers, scene navigation, and screen recording.
 */

import "@fontsource/inter/400.css";
import "@fontsource/inter/500.css";
import "@fontsource/inter/600.css";
import "@fontsource/inter/700.css";
import "@fontsource/jetbrains-mono/400.css";
import "@fontsource/jetbrains-mono/500.css";
import "@fontsource/jetbrains-mono/700.css";
import "@fontsource/material-symbols-outlined/400.css";

import { TimerWidget } from "./components/TimerWidget";
import { WallClock } from "./components/WallClock";
import { PresenterRecorder, type PresenterSceneInfo, createPresenterClient } from "./index";

const client = createPresenterClient();
const recorder = new PresenterRecorder();

// DOM References
const sceneText = document.getElementById("scene-text");
const currentNotes = document.getElementById("current-notes");
const nextScene = document.getElementById("next-scene");
const nextNotes = document.getElementById("next-notes");
const progressBar = document.getElementById("progress-bar");
const headerRight = document.getElementById("header-right");

const recordPill = document.getElementById("record-pill");
const btnRecord = document.getElementById("btn-record");
const recLabel = document.getElementById("rec-label");
const btnMic = document.getElementById("btn-mic");
const micIcon = document.getElementById("mic-icon");

const sceneBadge = document.getElementById("scene-badge");
const sceneMenu = document.getElementById("scene-menu");

const btnNext = document.getElementById("btn-next") as HTMLButtonElement | null;
const btnPrev = document.getElementById("btn-prev") as HTMLButtonElement | null;
const btnFontInc = document.getElementById("btn-font-inc");
const btnFontDec = document.getElementById("btn-font-dec");
const btnFontReset = document.getElementById("btn-font-reset");

// Mount Header Widgets (Clock & Timer)
if (headerRight) {
  headerRight.appendChild(WallClock());
  headerRight.appendChild(TimerWidget());
}

// ============================================================================
// 0. GPU Screen Recorder Integration
// ============================================================================
recorder.onUpdate((state) => {
  if (recordPill) {
    recordPill.classList.toggle("recording", state.isRecording);
  }
  if (btnRecord) {
    btnRecord.title = state.isRecording
      ? "Stop Recording (Key: Alt+R)"
      : "Record Presentation directly via GPU (Key: Alt+R)";
  }

  if (btnMic && micIcon) {
    micIcon.textContent = state.isMicEnabled ? "mic" : "mic_off";
    const isLive = state.isRecording && state.isMicEnabled;
    btnMic.classList.toggle("active", isLive);
    btnMic.title = state.isMicEnabled
      ? state.isRecording
        ? "Microphone recording live (Click to mute)"
        : "Microphone enabled (Click to mute)"
      : "Microphone muted (Click to unmute)";
  }
});

btnRecord?.addEventListener("click", () => {
  recorder.toggle();
});

btnMic?.addEventListener("click", () => {
  recorder.toggleMic();
});

// ============================================================================
// 0.1 Scene Jump Dropdown Popup (Outlines major chapters/scenes)
// ============================================================================
let registeredScenes: PresenterSceneInfo[] = [];

function renderSceneMenu(scenes: PresenterSceneInfo[], activeSceneIdx: number): void {
  if (!sceneMenu) return;

  const items = scenes.map((scene) => {
    const rawIdx =
      typeof scene.sceneIndex === "number" && !Number.isNaN(scene.sceneIndex)
        ? scene.sceneIndex
        : 0;
    const sceneNum = String(rawIdx + 1).padStart(2, "0");
    const isActive = scene.sceneIndex === activeSceneIdx;
    return (
      <button
        key={scene.sceneIndex}
        type="button"
        class={`m3-dropdown-item ${isActive ? "active" : ""}`}
        onclick={(e: MouseEvent) => {
          e.stopPropagation();
          client.gotoScene(scene.sceneIndex);
          closeSceneMenu();
        }}
      >
        <span class="dropdown-scene-num">{sceneNum}</span>
        <span>{scene.sceneName}</span>
      </button>
    );
  });

  sceneMenu.replaceChildren(...items);
}

function openSceneMenu(): void {
  sceneBadge?.classList.add("open");
  sceneMenu?.classList.add("open");
}

function closeSceneMenu(): void {
  sceneBadge?.classList.remove("open");
  sceneMenu?.classList.remove("open");
}

function toggleSceneMenu(): void {
  if (sceneMenu?.classList.contains("open")) {
    closeSceneMenu();
  } else {
    openSceneMenu();
  }
}

sceneBadge?.addEventListener("click", (e) => {
  e.stopPropagation();
  toggleSceneMenu();
});

window.addEventListener("click", (e) => {
  if (!sceneMenu?.contains(e.target as Node) && !sceneBadge?.contains(e.target as Node)) {
    closeSceneMenu();
  }
});

// ============================================================================
// 1. Notes Formatting Helper
// ============================================================================
function renderNotesContent(notesRaw: string | undefined): void {
  if (!currentNotes) return;

  if (!notesRaw || notesRaw.trim().length === 0) {
    currentNotes.replaceChildren(
      <span class="notes-empty-state">No speaker notes for this step.</span>,
    );
    return;
  }

  const lines = notesRaw
    .trim()
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  const hasBullets = lines.some((l) => l.startsWith("-") || l.startsWith("*") || l.startsWith("•"));

  if (hasBullets) {
    currentNotes.replaceChildren(
      <ul>
        {lines.map((l) => (
          <li key={l}>{l.replace(/^[-*•]\s*/, "")}</li>
        ))}
      </ul>,
    );
  } else {
    currentNotes.textContent = notesRaw;
  }
}

const DEFAULT_FONT_SIZE = 15;
let currentFontSize = DEFAULT_FONT_SIZE; // px
function setFontSize(size: number): void {
  currentFontSize = Math.min(36, Math.max(10, size));
  if (currentNotes) {
    currentNotes.style.fontSize = `${currentFontSize}px`;
  }
}

btnFontInc?.addEventListener("click", () => setFontSize(currentFontSize + 2));
btnFontDec?.addEventListener("click", () => setFontSize(currentFontSize - 2));
btnFontReset?.addEventListener("click", () => setFontSize(DEFAULT_FONT_SIZE));

// ============================================================================
// 2. Presenter Client State Sync
// ============================================================================
client.onUpdate((msg) => {
  const currentSceneIdx =
    typeof msg.sceneIndex === "number" && !Number.isNaN(msg.sceneIndex) ? msg.sceneIndex : 0;
  const totalScenes =
    typeof msg.totalScenes === "number" && !Number.isNaN(msg.totalScenes) && msg.totalScenes > 0
      ? msg.totalScenes
      : 1;

  if (sceneText) {
    sceneText.textContent = `Scene ${currentSceneIdx + 1} of ${totalScenes}${
      msg.scene ? ` · ${msg.scene}` : ""
    }`;
  }

  // Update scene outline dropdown menu
  if (msg.scenes) {
    registeredScenes = msg.scenes;
    renderSceneMenu(registeredScenes, currentSceneIdx);
  }

  // Update step progress bar across all linear pause points
  if (progressBar) {
    const progress = msg.total > 1 ? (msg.step / (msg.total - 1)) * 100 : 100;
    progressBar.style.width = `${Math.min(100, Math.max(0, progress))}%`;
  }

  // Current speaker notes for this step
  renderNotesContent(msg.notes);

  // Coming up next
  if (msg.nextScene) {
    if (nextScene) nextScene.textContent = msg.nextScene;
    if (nextNotes) {
      nextNotes.textContent = msg.nextNotes
        ? msg.nextNotes.replace(/\n+/g, " • ").trim()
        : "(No notes for next step)";
    }
  } else {
    if (nextScene) nextScene.textContent = "End of presentation 🎉";
    if (nextNotes) nextNotes.textContent = "No further steps";
  }

  // Navigation button states (based on linear step index)
  if (btnPrev) {
    btnPrev.disabled = msg.step <= 0;
  }
  if (btnNext) {
    btnNext.disabled = msg.step >= msg.total - 1;
  }
});

btnNext?.addEventListener("click", () => client.next());
btnPrev?.addEventListener("click", () => client.prev());

// ============================================================================
// 3. Keyboard Shortcuts
// ============================================================================
window.addEventListener("keydown", (e) => {
  // Don't intercept if user is inside an input/textarea
  if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

  if (e.key === "Escape") {
    closeSceneMenu();
  } else if (e.key === "ArrowRight" || e.key === " " || e.key === "PageDown") {
    e.preventDefault();
    closeSceneMenu();
    client.next();
  } else if (e.key === "ArrowLeft" || e.key === "PageUp") {
    e.preventDefault();
    closeSceneMenu();
    client.prev();
  } else if ((e.key === "r" || e.key === "R") && (e.altKey || e.metaKey || e.ctrlKey)) {
    e.preventDefault();
    recorder.toggle();
  } else if (e.key === "+" || e.key === "=") {
    setFontSize(currentFontSize + 4);
  } else if (e.key === "-" || e.key === "_") {
    setFontSize(currentFontSize - 4);
  }
});
