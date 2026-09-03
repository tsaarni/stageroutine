/**
 * Built-in theme presets for StageRoutine.
 */

import type { ThemeConfig } from "./tokens";

export const defaultDark: ThemeConfig = {
  background: "#09090b",
  text: "#ffffff",
  primary: "#f97316",
};

export const defaultLight: ThemeConfig = {
  background: "#fafafa",
  text: "#09090b",
  primary: "#ea580c",
};

export const dracula: ThemeConfig = {
  background: "#282a36",
  text: "#f8f8f2",
  primary: "#ff79c6",
};

export const tokyoNight: ThemeConfig = {
  background: "#1a1b26",
  text: "#c0caf5",
  primary: "#7aa2f7",
};

export const cyberpunk: ThemeConfig = {
  background: "#0d0221",
  text: "#00f0ff",
  primary: "#ff003c",
};

export const themes = {
  defaultDark,
  defaultLight,
  dracula,
  tokyoNight,
  cyberpunk,
} as const;
