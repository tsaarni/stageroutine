/**
 * Presenter synchronization client and speaker notes utilities over BroadcastChannel.
 */

import { getActiveStage } from "../core/index";
import type { StageStateChangedEvent } from "../core/types";

/**
 * Attaches the complete speaker notes Markdown document to the stage.
 * @category Presenter
 */
export function notes(content: string): void {
  getActiveStage().setNotesDocument(content);
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
 * Message payload received by the presenter from the stage via BroadcastChannel.
 * Mirrors the StageStateChangedEvent shape.
 * @internal
 */
export type PresenterMessage = StageStateChangedEvent;

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
      const msg = event.data;
      if (msg?.event === "stage:stateChanged" && msg.data?.total > 0) {
        this.onUpdateCallback?.(msg.data as PresenterMessage);
      }
    };
    // Request initial state from active presentation tab
    this.channel.postMessage({ event: "stage:requestState" });
  }

  onUpdate(callback: (msg: PresenterMessage) => void): void {
    this.onUpdateCallback = callback;
  }

  next(): void {
    this.channel.postMessage({ event: "nav:nextStep" });
  }

  prev(): void {
    this.channel.postMessage({ event: "nav:prevStep" });
  }

  gotoStep(stepIndex: number): void {
    this.channel.postMessage({ event: "nav:gotoStep", data: { index: stepIndex } });
  }

  gotoScene(sceneIndex: number): void {
    this.channel.postMessage({ event: "nav:gotoScene", data: { index: sceneIndex } });
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
