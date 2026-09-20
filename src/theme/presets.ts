/**
 * Built-in theme presets for StageRoutine.
 */

import type { ThemeConfig } from "./tokens";

/**
 * Default dark theme preset.
 * @category Theme
 */
export const defaultDark: ThemeConfig = {
  background: "#0c0d12",
  text: "#ffffff",
  primary: "#f97316",
};

/**
 * Default light theme preset.
 * @category Theme
 */
export const defaultLight: ThemeConfig = {
  background: "#fafafa",
  text: "#09090b",
  primary: "#ea580c",
};

/**
 * Dracula theme preset.
 * @category Theme
 */
export const dracula: ThemeConfig = {
  background: "#282a36",
  text: "#f8f8f2",
  primary: "#ff79c6",
};

/**
 * Tokyo Night theme preset.
 * @category Theme
 */
export const tokyoNight: ThemeConfig = {
  background: "#1a1b26",
  text: "#c0caf5",
  primary: "#7aa2f7",
};

/**
 * Cyberpunk theme preset.
 * @category Theme
 */
export const cyberpunk: ThemeConfig = {
  background: "#0d0221",
  text: "#00f0ff",
  primary: "#ff003c",
};

/**
 * Collection of all built-in theme presets.
 * @category Theme
 */
export const themes = {
  defaultDark,
  defaultLight,
  dracula,
  tokyoNight,
  cyberpunk,
} as const;
