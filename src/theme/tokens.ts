/**
 * Strictly typed design tokens and theme engine for StageRoutine.
 */

/**
 * Theme configuration object for customizing stage canvas, typography, surfaces, and colors.
 * All properties are optional and strictly typed.
 * @category Theme
 */
export interface ThemeConfig {
  /** Stage canvas background color or CSS gradient. */
  background?: string;
  /** Primary text color. */
  text?: string;
  /** Primary brand accent color. */
  primary?: string;
  /** Secondary accent or highlight color. */
  accent?: string;

  /** Muted secondary text color. */
  textMuted?: string;
  /** Dim tertiary text color. */
  textDim?: string;

  /** Component surface background color. */
  surface?: string;
  /** Component surface border stroke. */
  surfaceBorder?: string;
  /** Subtle surface highlight color. */
  surfaceHighlight?: string;
  /** Box shadow applied to raised surfaces. */
  surfaceShadow?: string;
  /** Backdrop overlay behind elevated layers. */
  surfaceBackdrop?: string;

  /** Base border radius (e.g. "12px"). */
  radius?: string;
  /** Extra-small spacing token. */
  spaceXs?: string;
  /** Small spacing token. */
  spaceSm?: string;
  /** Medium spacing token. */
  spaceMd?: string;
  /** Large spacing token. */
  spaceLg?: string;
  /** Extra-large spacing token. */
  spaceXl?: string;

  /** Sans-serif font family. */
  fontSans?: string;
  /** Serif font family. */
  fontSerif?: string;
  /** Monospace font family. */
  fontMono?: string;
  /** Hero title typography scale. */
  fontSizeHero?: string;
  /** Title typography scale. */
  fontSizeTitle?: string;
  /** Lead paragraph typography scale. */
  fontSizeLead?: string;
  /** Body paragraph typography scale. */
  fontSizeBody?: string;
  /** Code snippet typography scale. */
  fontSizeCode?: string;
  /** Kicker label typography scale. */
  fontSizeKicker?: string;
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
  fontSizeHero: "--sr-font-size-hero",
  fontSizeTitle: "--sr-font-size-title",
  fontSizeLead: "--sr-font-size-lead",
  fontSizeBody: "--sr-font-size-body",
  fontSizeCode: "--sr-font-size-code",
  fontSizeKicker: "--sr-font-size-kicker",
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
