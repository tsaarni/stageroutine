/**
 * Internal presenter synchronization message types shared between the stage and the presenter console.
 */

import type { StageStateChangedEvent } from "../core/types";

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
