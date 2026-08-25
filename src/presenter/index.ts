/**
 * Presenter synchronization client and speaker notes utilities over BroadcastChannel.
 */

import { getActiveStage } from "../core/index";

export function notes(content: string | string[]): void {
  getActiveStage().setNotes(content);
}

export interface PresenterSceneInfo {
  sceneIndex: number;
  sceneName: string;
  startStepIndex: number;
  stepCount: number;
}

export interface PresenterStepInfo {
  stepIndex: number;
  sceneName: string;
}

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

export function createPresenterClient(): PresenterClient {
  return new PresenterClient();
}

export { PresenterRecorder } from "./recorder";
