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
    if (!channelName) return;

    try {
      this.channel = new BroadcastChannel(channelName);

      // Presenter Protocol: listen ONLY for remote control commands from PresenterClient
      this.channel.onmessage = (event: MessageEvent<PresenterChannelMessage>) => {
        const msg = event.data;
        if (!msg || typeof msg.event !== "string") return;

        // Discard state notifications from other stages to eliminate loops
        if (msg.event === "evt:stage:stateChanged") return;

        this.messagesReceived++;
        this.lastMsgTime = performance.now();

        switch (msg.event) {
          case "req:stage:requestState":
            target.emit("req:stage:requestState");
            break;
          case "req:nav:nextStep":
            target.emit("req:nav:nextStep");
            break;
          case "req:nav:prevStep":
            target.emit("req:nav:prevStep");
            break;
          case "req:nav:nextScene":
            target.emit("req:nav:nextScene");
            break;
          case "req:nav:prevScene":
            target.emit("req:nav:prevScene");
            break;
          case "req:nav:gotoStep":
            if (typeof msg.data?.index === "number") {
              target.emit("req:nav:gotoStep", { index: msg.data.index });
            }
            break;
          case "req:nav:gotoScene":
            if (typeof msg.data?.index === "number") {
              target.emit("req:nav:gotoScene", { index: msg.data.index });
            }
            break;
        }
      };

      // Outgoing: publish state changes to PresenterClient
      this.unbind = target.on("evt:stage:stateChanged", (data) => {
        this.messagesSent++;
        this.lastMsgTime = performance.now();
        this.channel?.postMessage({
          event: "evt:stage:stateChanged",
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
