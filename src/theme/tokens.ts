/**
 * Strictly typed design tokens and theme engine for StageRoutine.
 */

/**
 * Theme configuration object for customizing stage canvas, typography, surfaces, and colors.
 * All properties are optional and strictly typed.
 * @category Theme
 */
export interface ThemeConfig {
  /* --- Canvas & Palette --- */
  background?: string;
  text?: string;
  primary?: string;
  accent?: string;

  /* --- Secondary Text --- */
  textMuted?: string;
  textDim?: string;

  /* --- Surfaces & Borders --- */
  surface?: string;
  surfaceBorder?: string;
  surfaceHighlight?: string;
  surfaceShadow?: string;
  surfaceBackdrop?: string;

  /* --- Spatial Scale --- */
  radius?: string;
  spaceXs?: string;
  spaceSm?: string;
  spaceMd?: string;
  spaceLg?: string;
  spaceXl?: string;

  /* --- Typography Hierarchy --- */
  fontSans?: string;
  fontSerif?: string;
  fontMono?: string;
  fontHero?: string;
  fontTitle?: string;
  fontLead?: string;
  fontBody?: string;
  fontCode?: string;
  fontKicker?: string;
}

/**
 * Maps ThemeConfig properties to their corresponding CSS custom properties.
 */
export const TOKEN_MAP: Record<keyof ThemeConfig, string> = {
  background: "--sr-background",
  text: "--sr-text",
  primary: "--sr-primary",
  accent: "--sr-accent",
  textMuted: "--sr-text-muted",
  textDim: "--sr-text-dim",
  surface: "--sr-surface",
  surfaceBorder: "--sr-surface-border",
  surfaceHighlight: "--sr-surface-highlight",
  surfaceShadow: "--sr-surface-shadow",
  surfaceBackdrop: "--sr-surface-backdrop",
  radius: "--sr-radius",
  spaceXs: "--sr-space-xs",
  spaceSm: "--sr-space-sm",
  spaceMd: "--sr-space-md",
  spaceLg: "--sr-space-lg",
  spaceXl: "--sr-space-xl",
  fontSans: "--sr-font-sans",
  fontSerif: "--sr-font-serif",
  fontMono: "--sr-font-mono",
  fontHero: "--sr-font-hero",
  fontTitle: "--sr-font-title",
  fontLead: "--sr-font-lead",
  fontBody: "--sr-font-body",
  fontCode: "--sr-font-code",
  fontKicker: "--sr-font-kicker",
};

/**
 * Applies a partial ThemeConfig to a DOM element by setting CSS custom properties.
 */
export function applyThemeTokens(element: HTMLElement, theme: Partial<ThemeConfig>): void {
  for (const [key, value] of Object.entries(theme)) {
    if (value !== undefined) {
      const cssVar = TOKEN_MAP[key as keyof ThemeConfig];
      if (cssVar) {
        element.style.setProperty(cssVar, String(value));
        // If primary is set but accent is omitted, keep them in sync
        if (key === "primary" && theme.accent === undefined) {
          element.style.setProperty("--sr-accent", String(value));
        }
      }
    }
  }
}
