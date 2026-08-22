/**
 * Presenter synchronization client and speaker notes utilities over BroadcastChannel.
 */

import { getActiveStage } from "../core/index";

export function notes(content: string): void {
  getActiveStage().setNotes(content.trim());
}

export interface PresenterStepInfo {
  stepIndex: number;
  sceneName: string;
}

export interface PresenterMessage {
  currentStep: number;
  totalSteps: number;
  sceneName: string;
  notes: string;
  nextSceneName: string;
  nextNotes: string;
  steps?: PresenterStepInfo[];
}

export class PresenterClient {
  private channel: BroadcastChannel;
  private onUpdateCallback?: (msg: PresenterMessage) => void;

  constructor() {
    this.channel = new BroadcastChannel("stageroutine-channel");
    this.channel.onmessage = (event) => {
      if (this.onUpdateCallback && event.data?.totalSteps !== undefined) {
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

  goto(stepIndex: number): void {
    this.channel.postMessage({ action: "goto", stepIndex });
  }
}

export function createPresenterClient(): PresenterClient {
  return new PresenterClient();
}

export { PresenterRecorder } from "./recorder";
