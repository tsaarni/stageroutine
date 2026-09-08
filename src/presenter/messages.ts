/**
 * Internal presenter synchronization message types shared between the stage and the presenter console.
 */

import type { StageStateChangedEvent } from "../core/types";

/**
 * Commands sent by PresenterClient to control the presentation Stage.
 * @internal
 */
export type PresenterCommand =
  | { event: "stage:requestState" }
  | { event: "nav:nextStep" }
  | { event: "nav:prevStep" }
  | { event: "nav:nextScene" }
  | { event: "nav:prevScene" }
  | { event: "nav:gotoStep"; data: { index: number } }
  | { event: "nav:gotoScene"; data: { index: number } };

/**
 * Notifications sent by Stage to inform PresenterClient of state updates.
 * @internal
 */
export type PresenterNotification = {
  event: "stage:stateChanged";
  data: StageStateChangedEvent;
};

/**
 * All messages transmitted over the presenter BroadcastChannel.
 * @internal
 */
export type PresenterChannelMessage = PresenterCommand | PresenterNotification;

/**
 * Scene metadata included in presenter state payloads.
 * @internal
 */
export interface PresenterSceneInfo {
  sceneIndex: number;
  sceneName: string;
  startStepIndex: number;
  stepCount: number;
}

/**
 * Step metadata included in presenter state payloads.
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
