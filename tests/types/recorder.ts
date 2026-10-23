import { PresenterRecorder, type PresenterRecorderState } from "../../src/index";

export function recorderTypes() {
  const recorder = new PresenterRecorder();
  const started: Promise<boolean> = recorder.start();
  const stopped: Promise<void> = recorder.stop();
  const state: PresenterRecorderState = recorder.getState();
  const unsubscribe: () => void = recorder.onUpdate((next) => {
    const status: PresenterRecorderState["status"] = next.status;
    // @ts-expect-error State snapshots are read-only.
    next.seconds = 10;
    return status;
  });
  const disposed: Promise<void> = recorder.dispose();
  return { started, stopped, state, unsubscribe, disposed };
}
