/**
 * Host-side bridge connecting a Stage instance to BroadcastChannel for
 * remote control by PresenterClient.
 */

import type { StageEventMap } from "../core/types";
import type { PresenterChannelMessage, PresenterNotification } from "./messages";

/**
 * Minimal event bus target satisfied by the Stage.
 * @internal
 */
export interface PresenterHostTarget {
  on<K extends keyof StageEventMap>(
    event: K,
    listener: (data: StageEventMap[K]) => void,
  ): () => void;
  emit<K extends keyof StageEventMap>(
    event: K,
    ...args: StageEventMap[K] extends undefined ? [] : [data: StageEventMap[K]]
  ): void;
}

/**
 * Manages the presentation host's connection to the dual-screen presenter console.
 * Strictly asymmetric: receives PresenterCommands from PresenterClient and emits
 * PresenterNotifications (stage:stateChanged).
 * @category Presenter
 */
export class PresenterHost {
  private channel: BroadcastChannel | null = null;
  private unbind?: () => void;
  messagesSent = 0;
  messagesReceived = 0;
  lastMsgTime = 0;

  constructor(target: PresenterHostTarget, channelName: string) {
    if (typeof window === "undefined" || !channelName) return;

    try {
      this.channel = new BroadcastChannel(channelName);

      // Presenter Protocol: listen ONLY for remote control commands from PresenterClient
      this.channel.onmessage = (event: MessageEvent<PresenterChannelMessage>) => {
        const msg = event.data;
        if (!msg || typeof msg.event !== "string") return;

        // Discard state notifications from other stages to eliminate loops
        if (msg.event === "stage:stateChanged") return;

        this.messagesReceived++;
        this.lastMsgTime = performance.now();

        switch (msg.event) {
          case "stage:requestState":
            target.emit("stage:requestState");
            break;
          case "nav:nextStep":
            target.emit("nav:nextStep");
            break;
          case "nav:prevStep":
            target.emit("nav:prevStep");
            break;
          case "nav:nextScene":
            target.emit("nav:nextScene");
            break;
          case "nav:prevScene":
            target.emit("nav:prevScene");
            break;
          case "nav:gotoStep":
            if (typeof msg.data?.index === "number") {
              target.emit("nav:gotoStep", { index: msg.data.index });
            }
            break;
          case "nav:gotoScene":
            if (typeof msg.data?.index === "number") {
              target.emit("nav:gotoScene", { index: msg.data.index });
            }
            break;
        }
      };

      // Outgoing: publish state changes to PresenterClient
      this.unbind = target.on("stage:stateChanged", (data) => {
        this.messagesSent++;
        this.lastMsgTime = performance.now();
        this.channel?.postMessage({
          event: "stage:stateChanged",
          data,
        } satisfies PresenterNotification);
      });
    } catch {
      // BroadcastChannel unavailable in this environment
    }
  }

  /** Closes the presenter communication channel and disconnects event listeners. */
  dispose(): void {
    this.unbind?.();
    this.channel?.close();
    this.channel = null;
  }
}
