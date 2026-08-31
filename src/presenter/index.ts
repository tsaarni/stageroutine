/**
 * Presenter synchronization client and speaker notes utilities over BroadcastChannel.
 */

import { getActiveStage } from "../core/index";

/**
 * Attaches speaker notes to the current stage step.
 * @category Presenter
 */
export function notes(content: string | string[]): void {
  getActiveStage().setNotes(content);
}

/**
 * @internal
 */
export interface PresenterSceneInfo {
  sceneIndex: number;
  sceneName: string;
  startStepIndex: number;
  stepCount: number;
}

/**
 * @internal
 */
export interface PresenterStepInfo {
  stepIndex: number;
  sceneName: string;
}

/**
 * @internal
 */
export interface PresenterMessage {
  // Step-level linear state
  currentStep: number;
  totalSteps: number;
  notes: string;

  // Scene-level structural state
  currentSceneIndex: number;
  totalScenes: number;
  sceneName: string;
  nextSceneName: string;
  nextNotes: string;

  // Jump outlines
  scenes?: PresenterSceneInfo[];
  steps?: PresenterStepInfo[];
}

/**
 * Client for synchronizing presenter view with the main presentation window via BroadcastChannel.
 * @category Presenter
 */
export class PresenterClient {
  private channel: BroadcastChannel;
  private onUpdateCallback?: (msg: PresenterMessage) => void;

  constructor() {
    this.channel = new BroadcastChannel("stageroutine-channel");
    this.channel.onmessage = (event) => {
      if (
        this.onUpdateCallback &&
        event.data?.totalSteps !== undefined &&
        event.data.totalSteps > 0
      ) {
        this.onUpdateCallback(event.data as PresenterMessage);
      }
    };
    // Request initial state from active presentation tab
    this.channel.postMessage({ action: "requestState" });
  }

  onUpdate(callback: (msg: PresenterMessage) => void): void {
    this.onUpdateCallback = callback;
  }

  next(): void {
    this.channel.postMessage({ action: "next" });
  }

  prev(): void {
    this.channel.postMessage({ action: "prev" });
  }

  gotoScene(sceneIndex: number): void {
    this.channel.postMessage({ action: "gotoScene", sceneIndex });
  }
}

/**
 * Creates a new PresenterClient instance.
 * @category Presenter
 */
export function createPresenterClient(): PresenterClient {
  return new PresenterClient();
}

export { PresenterRecorder } from "./recorder";
