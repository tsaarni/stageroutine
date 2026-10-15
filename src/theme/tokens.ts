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
  /** Primary accent color. Inherits from the surrounding theme. */
  primary?: string;
  /** Secondary accent color. Inherits from the surrounding theme. */
  secondary?: string;

  /** Muted secondary text color. */
  textMuted?: string;
  /** Dim tertiary text color. */
  textDim?: string;

  /** Component surface background color. */
  surface?: string;
  /** Surface border color (default: text at 15% opacity). */
  surfaceBorderColor?: string;
  /** Surface border width as a CSS length (default: "1px"). */
  surfaceBorderWidth?: string;
  /** Opaque surface background (default: "#18181b"). */
  surfaceSolid?: string;
  /** Subtle media backdrop (default: "#1e293b"). */
  surfaceSubtle?: string;
  /** Subtle surface highlight color. */
  surfaceHighlight?: string;
  /** Box shadow applied to raised surfaces. */
  surfaceShadow?: string;
  /** Backdrop overlay behind elevated layers. */
  surfaceBackdrop?: string;

  /** Base border radius (e.g. "12px"). */
  radius?: string;
  /** Triple-extra-small spacing token. */
  space3xs?: string;
  /** Double-extra-small spacing token. */
  space2xs?: string;
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
  secondary: "--sr-secondary",
  textMuted: "--sr-text-muted",
  textDim: "--sr-text-dim",
  surface: "--sr-surface",
  surfaceBorderColor: "--sr-surface-border-color",
  surfaceBorderWidth: "--sr-surface-border-width",
  surfaceSolid: "--sr-surface-solid",
  surfaceSubtle: "--sr-surface-subtle",
  surfaceHighlight: "--sr-surface-highlight",
  surfaceShadow: "--sr-surface-shadow",
  surfaceBackdrop: "--sr-surface-backdrop",
  radius: "--sr-radius",
  space3xs: "--sr-space-3xs",
  space2xs: "--sr-space-2xs",
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

/** Replaces managed theme overrides; omitted values return to CSS defaults. */
export function applyThemeTokens(element: HTMLElement, theme: ThemeConfig): void {
  const keys: string[] = [];
  for (const key of Object.keys(TOKEN_MAP) as (keyof ThemeConfig)[]) {
    const value = theme[key];
    if (value === undefined) {
      element.style.removeProperty(TOKEN_MAP[key]);
    } else {
      element.style.setProperty(TOKEN_MAP[key], value);
      keys.push(key);
    }
  }
  if (keys.length) element.dataset.srTheme = keys.join(" ");
  else delete element.dataset.srTheme;
}
