/**
 * Client for building custom presenter views that sync with the main presentation
 * window over BroadcastChannel, and the in-browser screen recorder.
 */

import type { StageStateChangedEvent } from "../core/types";

/**
 * Client for synchronizing a custom presenter view with the main presentation window
 * via BroadcastChannel.
 * @category Presenter
 */
export class PresenterClient {
  private channel: BroadcastChannel;
  private onUpdateCallback?: (msg: StageStateChangedEvent) => void;

  constructor() {
    this.channel = new BroadcastChannel("stageroutine-channel");
    this.channel.onmessage = (event) => {
      const msg = event.data;
      if (msg?.event === "stage:stateChanged" && msg.data?.total > 0) {
        this.onUpdateCallback?.(msg.data as StageStateChangedEvent);
      }
    };
    // Request initial state from active presentation tab
    this.channel.postMessage({ event: "stage:requestState" });
  }

  /**
   * Registers a callback invoked whenever the presentation state changes.
   * @param callback Receives the latest {@link StageStateChangedEvent} payload.
   */
  onUpdate(callback: (msg: StageStateChangedEvent) => void): void {
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

export { PresenterRecorder } from "./recorder";
