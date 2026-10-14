import type { ThemeConfig } from "./tokens";

interface StageStyleContext {
  theme: ThemeConfig;
  scale: number;
}

const contexts = new WeakMap<object, () => StageStyleContext>();

/** Shares the current theme with offscreen layout measurement without exposing runtime state. */
export function registerStageStyleContext(stage: object, read: () => StageStyleContext): void {
  contexts.set(stage, read);
}

export function getStageStyleContext(stage: object): StageStyleContext | undefined {
  return contexts.get(stage)?.();
}
