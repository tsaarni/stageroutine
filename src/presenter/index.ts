/**
 * Client for building custom presenter views that sync with the main presentation
 * window over BroadcastChannel, and the in-browser screen recorder.
 */

import type { StageStateChangedEvent } from "../core/types";
import type { PresenterChannelMessage, PresenterCommand } from "./messages";

/**
 * Client for synchronizing a custom presenter view with the main presentation window
 * via BroadcastChannel.
 * @category Presenter
 */
export class PresenterClient {
  private channel: BroadcastChannel;
  private onUpdateCallback?: (msg: StageStateChangedEvent) => void;

  constructor(channelName = "stageroutine-channel") {
    this.channel = new BroadcastChannel(channelName);
    this.channel.onmessage = (event: MessageEvent<PresenterChannelMessage>) => {
      const msg = event.data;
      // ONLY listen for state notifications from Stage; ignore commands
      if (msg?.event === "evt:stage:stateChanged" && msg.data?.total > 0) {
        this.onUpdateCallback?.(msg.data);
      }
    };
    // Request initial state from active presentation tab
    this.channel.postMessage({ event: "req:stage:requestState" } satisfies PresenterCommand);
  }

  /**
   * Registers a callback invoked whenever the presentation state changes.
   * @param callback Receives the latest {@link StageStateChangedEvent} payload.
   */
  onUpdate(callback: (msg: StageStateChangedEvent) => void): void {
    this.onUpdateCallback = callback;
  }

  /** Advances the presentation to the next step. */
  next(): void {
    this.channel.postMessage({ event: "req:nav:nextStep" } satisfies PresenterCommand);
  }

  /** Returns the presentation to the previous step. */
  prev(): void {
    this.channel.postMessage({ event: "req:nav:prevStep" } satisfies PresenterCommand);
  }

  /** Jumps directly to a step by 0-based index. */
  gotoStep(stepIndex: number): void {
    this.channel.postMessage({
      event: "req:nav:gotoStep",
      data: { index: stepIndex },
    } satisfies PresenterCommand);
  }

  /** Jumps directly to a scene by 0-based index. */
  gotoScene(sceneIndex: number): void {
    this.channel.postMessage({
      event: "req:nav:gotoScene",
      data: { index: sceneIndex },
    } satisfies PresenterCommand);
  }

  /** Closes the presenter communication channel. */
  close(): void {
    this.channel.close();
  }
}

export { PresenterRecorder } from "./recorder";
export { PresenterHost, type PresenterHostTarget } from "./host";
export type { StageStateChangedEvent } from "../core/types";
export type {
  PresenterCommand,
  PresenterNotification,
  PresenterChannelMessage,
  PresenterSceneInfo,
  PresenterStepInfo,
  PresenterMessage,
} from "./messages";
