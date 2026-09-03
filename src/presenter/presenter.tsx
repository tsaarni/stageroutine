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

import { MetricRegistry } from "../core/metrics";
import { TimerWidget } from "./components/TimerWidget";
import { WallClock } from "./components/WallClock";
import {
  type PresenterMessage,
  PresenterRecorder,
  type PresenterSceneInfo,
  createPresenterClient,
} from "./index";

const client = createPresenterClient();
const recorder = new PresenterRecorder();

// Metrics & Diagnostics
const metrics = new MetricRegistry();
let updatesReceived = 0;
let notesRendered = 0;
let scrollInvocations = 0;
let lastUpdateTime = 0;

metrics.register("presenter", () => ({
  updates_received: updatesReceived,
  notes_rendered: notesRendered,
  scroll_invocations: scrollInvocations,
  last_update_elapsed_ms: lastUpdateTime > 0 ? Math.round(performance.now() - lastUpdateTime) : -1,
}));

if (typeof window !== "undefined") {
  (
    window as unknown as {
      __STAGEROUTINE_DEV__?: { getMetrics: () => Record<string, unknown> };
    }
  ).__STAGEROUTINE_DEV__ = {
    getMetrics: () => metrics.collect(),
  };
}

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

import { marked } from "marked";

// ============================================================================
// 1. Markdown Notes Formatting Helper
// ============================================================================
function slugifyScene(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function parseMarkdownDocument(doc: string): string {
  if (!doc || !doc.trim()) return "";

  const stepBreakHtml = (stepIdx: number) => `
<div class="notes-step-break" data-break-index="${stepIdx}">
  <span class="step-break-bullet">▸</span>
  <span class="step-break-label">Step ${stepIdx + 1}</span>
  <span class="kbd">Space</span>
  <span class="step-break-line"></span>
</div>
`;

  // Split document by ## Scene Headings
  const sections = doc.split(/(?=^##\s+)/m);
  const renderedSections: string[] = [];

  for (const sec of sections) {
    const trimmed = sec.trim();
    if (!trimmed) continue;

    const match = trimmed.match(/^##\s+([^\n]+)/m);
    const sceneTitle = match ? match[1].trim() : "";
    const slug = slugifyScene(sceneTitle);
    const bodyWithoutHeading = trimmed.replace(/^##\s+[^\n]+\n?/, "");

    // Split scene into individual step blocks by <!-- step -->
    const stepChunks = bodyWithoutHeading.split(/<!--\s*step\s*-->/gi);
    const renderedBlocks = stepChunks.map((chunk, idx) => {
      const html = marked.parse(chunk.trim()) as string;
      return `<div class="notes-step-block" data-step-index="${idx}">${html}</div>`;
    });

    let bodyHtml = "";
    for (let i = 0; i < renderedBlocks.length; i++) {
      if (i > 0) {
        bodyHtml += stepBreakHtml(i);
      }
      bodyHtml += renderedBlocks[i];
    }

    renderedSections.push(
      `<section class="notes-scene-section" id="notes-scene-${slug}" data-scene="${sceneTitle}">
        <h2 class="notes-scene-heading"><span class="scene-heading-tag">SCENE</span>${sceneTitle}</h2>
        <div class="notes-scene-body">
          ${bodyHtml}
        </div>
      </section>`,
    );
  }

  return renderedSections.join("\n");
}

let lastRenderedDoc = "";

function updateNotesDisplay(msg: PresenterMessage): void {
  if (!currentNotes) return;

  const doc = msg.notesDoc || msg.notes || "";
  if (!doc) {
    currentNotes.replaceChildren(<span class="notes-empty-state">No speaker notes loaded.</span>);
    return;
  }

  if (doc !== lastRenderedDoc) {
    lastRenderedDoc = doc;
    notesRendered++;
    currentNotes.innerHTML = parseMarkdownDocument(doc);
  }

  // Determine current active scene and step within scene
  const activeScene = msg.scenes?.find(
    (sc) => msg.step >= sc.startStepIndex && msg.step < sc.startStepIndex + sc.stepCount,
  );
  const activeSceneName = activeScene?.sceneName || msg.scene;
  const stepInScene = activeScene ? msg.step - activeScene.startStepIndex : 0;

  if (activeSceneName) {
    const slug = slugifyScene(activeSceneName);
    const targetSection =
      document.getElementById(`notes-scene-${slug}`) ||
      currentNotes.querySelector(`[data-scene="${activeSceneName}"]`);

    for (const sec of currentNotes.querySelectorAll(".notes-scene-section")) {
      const isCurrentScene = sec === targetSection;
      sec.classList.toggle("active-scene", isCurrentScene);

      if (isCurrentScene) {
        // Highlight the specific active step block within the current scene
        const stepBlocks = sec.querySelectorAll(".notes-step-block");
        const totalBlocks = stepBlocks.length;
        const targetStepIdx = Math.min(stepInScene, Math.max(0, totalBlocks - 1));

        for (const block of stepBlocks) {
          const blockIdx = Number(block.getAttribute("data-step-index"));
          block.classList.toggle("active-step", blockIdx === targetStepIdx);
          block.classList.toggle("past-step", blockIdx < targetStepIdx);
          block.classList.toggle("future-step", blockIdx > targetStepIdx);
        }

        // Update step break badges
        for (const brk of sec.querySelectorAll(".notes-step-break")) {
          const brkIdx = Number(brk.getAttribute("data-break-index"));
          brk.classList.toggle("passed-break", brkIdx <= targetStepIdx);
        }
      } else {
        for (const block of sec.querySelectorAll(".notes-step-block")) {
          block.classList.remove("active-step", "past-step", "future-step");
        }
      }
    }

    if (targetSection) {
      const stepBlocks = targetSection.querySelectorAll(".notes-step-block");
      const targetStepIdx = Math.min(stepInScene, Math.max(0, stepBlocks.length - 1));
      const activeBlock =
        targetSection.querySelector(`.notes-step-block[data-step-index="${targetStepIdx}"]`) ||
        targetSection;
      scrollInvocations++;
      activeBlock.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }
}

// Click to select/jump directly to a scene or step
currentNotes?.addEventListener("click", (e) => {
  // If user is selecting/highlighting text, do not trigger navigation
  if (window.getSelection()?.toString().length) return;

  const target = e.target as HTMLElement;

  // 1. Check if clicked a step block
  const stepBlock = target.closest(".notes-step-block") as HTMLElement | null;
  if (stepBlock) {
    const sceneSection = stepBlock.closest(".notes-scene-section") as HTMLElement | null;
    const sceneName = sceneSection?.getAttribute("data-scene");
    const stepOffset = Number(stepBlock.getAttribute("data-step-index")) || 0;

    const sceneInfo = registeredScenes.find((s) => s.sceneName === sceneName);
    if (sceneInfo) {
      const targetStep = sceneInfo.startStepIndex + stepOffset;
      client.gotoStep(targetStep);
      return;
    }
  }

  // 2. Check if clicked a scene heading
  const sceneHeading = target.closest(".notes-scene-heading") as HTMLElement | null;
  if (sceneHeading) {
    const sceneSection = sceneHeading.closest(".notes-scene-section") as HTMLElement | null;
    const sceneName = sceneSection?.getAttribute("data-scene");
    const sceneInfo = registeredScenes.find((s) => s.sceneName === sceneName);
    if (sceneInfo) {
      client.gotoScene(sceneInfo.sceneIndex);
    }
  }
});

// ============================================================================
// 2. Presenter Client State Sync
// ============================================================================
client.onUpdate((msg) => {
  updatesReceived++;
  lastUpdateTime = performance.now();
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

  // Render markdown document and track active scene
  updateNotesDisplay(msg);

  // Coming up next: always show the next scene
  const nextSceneObj = registeredScenes[currentSceneIdx + 1];

  if (nextSceneObj) {
    if (nextScene) nextScene.textContent = nextSceneObj.sceneName;
    if (nextNotes) {
      nextNotes.textContent = `Scene ${nextSceneObj.sceneIndex + 1} of ${totalScenes}`;
    }
  } else {
    if (nextScene) nextScene.textContent = "End of presentation";
    if (nextNotes) nextNotes.textContent = "All scenes completed";
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
  }
});
