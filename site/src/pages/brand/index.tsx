import Link from "@docusaurus/Link";
import StageRoutineLogo from "@site/src/components/StageRoutineLogo";
import MicroLogo from "@site/static/img/stageroutine-logo-micro.svg";
import Layout from "@theme/Layout";
import type React from "react";
import { useState } from "react";
import { themes } from "../../../../src/theme/presets";
import styles from "./brand.module.css";

interface ThemePreset {
  id: string;
  name: string;
  tag: string;
  background: string;
  text: string;
  primary: string;
}

const THEME_PRESETS: ThemePreset[] = [
  {
    id: "defaultDark",
    name: "Default Dark",
    tag: "Native Dark",
    background: themes.defaultDark.background ?? "#0c0d12",
    text: themes.defaultDark.text ?? "#ffffff",
    primary: themes.defaultDark.primary ?? "#38bdf8",
  },
  {
    id: "tokyoNight",
    name: "Tokyo Night",
    tag: "Navy & Blue",
    background: themes.tokyoNight.background ?? "#1a1b26",
    text: themes.tokyoNight.text ?? "#c0caf5",
    primary: themes.tokyoNight.primary ?? "#7aa2f7",
  },
  {
    id: "dracula",
    name: "Dracula",
    tag: "Violet & Pink",
    background: themes.dracula.background ?? "#282a36",
    text: themes.dracula.text ?? "#f8f8f2",
    primary: themes.dracula.primary ?? "#ff79c6",
  },
  {
    id: "cyberpunk",
    name: "Cyberpunk",
    tag: "Neon & Crimson",
    background: themes.cyberpunk.background ?? "#0d0221",
    text: themes.cyberpunk.text ?? "#00f0ff",
    primary: themes.cyberpunk.primary ?? "#ff003c",
  },
  {
    id: "defaultLight",
    name: "Clean Light",
    tag: "Editorial Light",
    background: themes.defaultLight.background ?? "#fafafa",
    text: themes.defaultLight.text ?? "#09090b",
    primary: themes.defaultLight.primary ?? "#0284c7",
  },
];

export default function BrandGuidelines(): React.JSX.Element {
  const [activePreset, setActivePreset] = useState<ThemePreset>(THEME_PRESETS[0]);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => {
      setCopiedKey(null);
    }, 2000);
  };

  return (
    <Layout
      title="Brand & Visual System"
      description="Design tokens, color schemes, typography hierarchy, and asset specifications."
      noFooter={false}
    >
      <main className={styles.pageContainer}>
        <div className={styles.ambientGlow} aria-hidden="true" />

        <div className={styles.contentWrapper}>
          {/* Header */}
          <header className={styles.header}>
            <div className={styles.kickerPill}>
              <span className={styles.kickerDot} />
              Design System &middot; Specification
            </div>
            <h1 className={styles.title}>Brand &amp; Visual System</h1>
            <p className={styles.description}>
              Design tokens, color schemes, typography hierarchy, and asset specifications.
            </p>

            <div className={styles.heroActions}>
              <Link className={styles.actionButton} to="/docs/advanced/theming">
                Theming Documentation &rarr;
              </Link>
            </div>
          </header>

          {/* Section 1: Theme & Adaptive Color System */}
          <section className={styles.section}>
            <div className={styles.sectionHeader}>
              <span className={styles.sectionTag}>01 / Color Scheming</span>
              <h2 className={styles.sectionTitle}>Theme Engine &amp; Adaptive Palette</h2>
              <p className={styles.sectionSubtitle}>
                Themes define 3 base properties: <code>background</code>, <code>text</code>, and{" "}
                <code>primary</code>. Selecting a preset updates the stage canvas, foundation
                tokens, and derived opacity scales in real time.
              </p>
            </div>

            {/* Interactive Theme Sandbox */}
            <div className={styles.sandboxContainer}>
              <div className={styles.sandboxToolbar}>
                <div className={styles.presetTabs}>
                  {THEME_PRESETS.map((preset) => (
                    <button
                      key={preset.id}
                      type="button"
                      className={`${styles.presetTab} ${
                        activePreset.id === preset.id ? styles.presetTabActive : ""
                      }`}
                      onClick={() => setActivePreset(preset)}
                    >
                      <span className={styles.tabDot} style={{ background: preset.primary }} />
                      {preset.name}
                    </button>
                  ))}
                </div>
                <div
                  style={{
                    fontFamily: "var(--sr-font-mono)",
                    fontSize: "0.75rem",
                    color: "#a1a1aa",
                  }}
                >
                  Active Preset:{" "}
                  <span style={{ color: "#ffffff", fontWeight: 600 }}>
                    themes.{activePreset.id}
                  </span>
                </div>
              </div>

              {/* Simulated Stage Canvas */}
              <div
                className={styles.sandboxStageCanvas}
                style={{ backgroundColor: activePreset.background }}
              >
                <div
                  className={styles.sandboxStageCard}
                  style={{
                    background: `linear-gradient(180deg, color-mix(in srgb, ${activePreset.text} 9%, transparent) 0%, color-mix(in srgb, ${activePreset.text} 3.5%, transparent) 100%)`,
                    border: `1px solid color-mix(in srgb, ${activePreset.text} 15%, transparent)`,
                    boxShadow: `0 20px 48px rgba(0, 0, 0, 0.45), inset 0 1px 0 0 color-mix(in srgb, ${activePreset.text} 18%, transparent)`,
                    color: activePreset.text,
                  }}
                >
                  <div className={styles.sandboxHeaderRow}>
                    <div>
                      <span
                        className={styles.sandboxKicker}
                        style={{ color: activePreset.primary }}
                      >
                        Category &middot; Overview
                      </span>
                      <h3 className={styles.sandboxTitle} style={{ color: activePreset.text }}>
                        Component Title
                      </h3>
                    </div>

                    <div style={{ color: activePreset.text }}>
                      <StageRoutineLogo
                        width={44}
                        height={44}
                        style={{ color: activePreset.text }}
                        aria-hidden="true"
                        role="img"
                      />
                    </div>
                  </div>

                  <p
                    className={styles.sandboxSubtitle}
                    style={{ color: `color-mix(in srgb, ${activePreset.text} 72%, transparent)` }}
                  >
                    Secondary description demonstrating layout hierarchy.
                  </p>

                  <div
                    className={styles.sandboxFooterRow}
                    style={{
                      borderColor: `color-mix(in srgb, ${activePreset.text} 15%, transparent)`,
                    }}
                  >
                    <span
                      className={styles.sandboxCodeSnippet}
                      style={{ color: `color-mix(in srgb, ${activePreset.text} 50%, transparent)` }}
                    >
                      stage.theme(themes.{activePreset.id})
                    </span>

                    <button
                      type="button"
                      className={styles.sandboxBtn}
                      style={{
                        background: activePreset.primary,
                        color:
                          activePreset.id === "defaultLight" || activePreset.id === "cyberpunk"
                            ? "#ffffff"
                            : activePreset.background,
                      }}
                    >
                      <span>Action</span>
                      <MicroLogo
                        width={14}
                        height={14}
                        style={{
                          color:
                            activePreset.id === "defaultLight" || activePreset.id === "cyberpunk"
                              ? "#ffffff"
                              : activePreset.background,
                        }}
                        aria-hidden="true"
                        role="img"
                      />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Subsection 1.1: Core Input Tokens for Active Preset */}
            <h3 className={styles.subSectionTitle}>
              Foundation Input Tokens (<code>themes.{activePreset.id}</code>)
            </h3>
            <p className={styles.subSectionSubtitle}>
              The 3 explicit properties configured in <code>stage.theme()</code> for the selected
              theme.
            </p>

            <div className={styles.paletteGrid}>
              {[
                {
                  name: "Canvas Background",
                  hex: activePreset.background,
                  role: "Base canvas background (--sr-background)",
                },
                {
                  name: "Primary Text",
                  hex: activePreset.text,
                  role: "Typography root & surface base (--sr-text)",
                },
                {
                  name: "Primary Accent",
                  hex: activePreset.primary,
                  role: "Active brand accent & focus (--sr-primary)",
                },
              ].map((swatch) => (
                <button
                  type="button"
                  key={swatch.name}
                  className={styles.swatchCard}
                  onClick={() => copyToClipboard(swatch.hex, swatch.name)}
                >
                  <div
                    className={styles.swatchPreview}
                    style={{
                      background: swatch.hex,
                      border: "1px solid rgba(255,255,255,0.12)",
                    }}
                  />
                  <div className={styles.swatchMeta}>
                    <div className={styles.swatchName}>{swatch.name}</div>
                    <div className={styles.swatchCode}>
                      <span>{swatch.hex}</span>
                      <span>{copiedKey === swatch.name ? "✓" : "Copy"}</span>
                    </div>
                  </div>
                </button>
              ))}
            </div>

            {/* Subsection 1.2: Mathematically Derived Scales */}
            <h3 className={styles.subSectionTitle}>
              Adaptive Derived Scales (Computed from <code>{activePreset.text}</code>)
            </h3>
            <p className={styles.subSectionSubtitle}>
              Component glass fills, borders, and text contrasts generated dynamically via CSS{" "}
              <code>color-mix()</code>.
            </p>

            <div className={styles.derivationGrid}>
              {/* Token 1: Muted Text */}
              <div className={styles.derivationCard}>
                <div
                  className={styles.derivationPreview}
                  style={{
                    backgroundColor: activePreset.background,
                    color: `color-mix(in srgb, ${activePreset.text} 72%, transparent)`,
                  }}
                >
                  72% Text Opacity
                </div>
                <span className={styles.derivationFormula}>
                  color-mix(in srgb, {activePreset.text} 72%, transparent)
                </span>
                <h4 className={styles.derivationName}>--sr-text-muted</h4>
                <p className={styles.derivationDesc}>
                  Secondary text. Use for subtitles, body paragraphs, and descriptive labels.
                </p>
              </div>

              {/* Token 2: Dim Text */}
              <div className={styles.derivationCard}>
                <div
                  className={styles.derivationPreview}
                  style={{
                    backgroundColor: activePreset.background,
                    color: `color-mix(in srgb, ${activePreset.text} 50%, transparent)`,
                  }}
                >
                  50% Text Opacity
                </div>
                <span className={styles.derivationFormula}>
                  color-mix(in srgb, {activePreset.text} 50%, transparent)
                </span>
                <h4 className={styles.derivationName}>--sr-text-dim</h4>
                <p className={styles.derivationDesc}>
                  Low-contrast text. Use for code snippets, line numbers, and metadata.
                </p>
              </div>

              {/* Token 3: Surface Gradient */}
              <div className={styles.derivationCard}>
                <div
                  className={styles.derivationPreview}
                  style={{
                    background: `linear-gradient(180deg, color-mix(in srgb, ${activePreset.text} 8%, color-mix(in srgb, ${activePreset.background} 88%, transparent)) 0%, color-mix(in srgb, ${activePreset.text} 3%, color-mix(in srgb, ${activePreset.background} 82%, transparent)) 100%)`,
                    border: `1px solid color-mix(in srgb, ${activePreset.text} 15%, transparent)`,
                    boxShadow: `inset 0 1px 0 0 color-mix(in srgb, ${activePreset.text} 18%, transparent)`,
                    color: activePreset.text,
                  }}
                >
                  8% &rarr; 3% Surface
                </div>
                <span className={styles.derivationFormula}>
                  linear-gradient(text 8% / bg 88% to text 3% / bg 82%)
                </span>
                <h4 className={styles.derivationName}>--sr-surface</h4>
                <p className={styles.derivationDesc}>
                  Container background. Use for card surfaces, dialog boxes, and floating panels.
                </p>
              </div>

              {/* Token 4: Surface Border */}
              <div className={styles.derivationCard}>
                <div
                  className={styles.derivationPreview}
                  style={{
                    backgroundColor: activePreset.background,
                    border: `2px solid color-mix(in srgb, ${activePreset.text} 15%, transparent)`,
                    color: `color-mix(in srgb, ${activePreset.text} 90%, transparent)`,
                  }}
                >
                  15% Border Stroke
                </div>
                <span className={styles.derivationFormula}>
                  1px solid color-mix({activePreset.text} 15%, transparent)
                </span>
                <h4 className={styles.derivationName}>--sr-surface-border</h4>
                <p className={styles.derivationDesc}>
                  Container outline. Use for card borders, table gridlines, and section dividers.
                </p>
              </div>

              {/* Token 5: Surface Highlight */}
              <div className={styles.derivationCard}>
                <div
                  className={styles.derivationPreview}
                  style={{
                    backgroundColor: `color-mix(in srgb, ${activePreset.text} 25%, transparent)`,
                    color: activePreset.text,
                  }}
                >
                  25% Surface Fill
                </div>
                <span className={styles.derivationFormula}>
                  color-mix(in srgb, {activePreset.text} 25%, transparent)
                </span>
                <h4 className={styles.derivationName}>--sr-surface-highlight</h4>
                <p className={styles.derivationDesc}>
                  Interactive feedback. Use for hover fills, active row states, and focus rings.
                </p>
              </div>

              {/* Token 6: Secondary Accent Sync */}
              <div className={styles.derivationCard}>
                <div
                  className={styles.derivationPreview}
                  style={{
                    backgroundColor: activePreset.primary,
                    color:
                      activePreset.id === "defaultLight" || activePreset.id === "cyberpunk"
                        ? "#ffffff"
                        : activePreset.background,
                  }}
                >
                  Accent: {activePreset.primary}
                </div>
                <span className={styles.derivationFormula}>
                  var(--sr-primary) &rarr; {activePreset.primary}
                </span>
                <h4 className={styles.derivationName}>--sr-accent</h4>
                <p className={styles.derivationDesc}>
                  Secondary accent. Use for badges, status indicators, and divider rule accents.
                </p>
              </div>
            </div>
          </section>

          {/* Section 2: Typography System */}
          <section className={styles.section}>
            <div className={styles.sectionHeader}>
              <span className={styles.sectionTag}>02 / Typography</span>
              <h2 className={styles.sectionTitle}>Type Families &amp; Scale</h2>
              <p className={styles.sectionSubtitle}>
                Three font families used for interface elements, editorial text, and code.
              </p>
            </div>

            <div className={styles.typeGrid}>
              {/* Font 1: Inter */}
              <div className={styles.typeCard}>
                <div className={styles.typeCardPreview}>
                  <span
                    style={{
                      fontFamily: "var(--sr-font-sans)",
                      fontSize: "2rem",
                      fontWeight: 700,
                      color: "#ffffff",
                    }}
                  >
                    Aa Bb Gg 123
                  </span>
                  <span
                    style={{
                      fontFamily: "var(--sr-font-sans)",
                      fontSize: "0.88rem",
                      color: "#a1a1aa",
                      marginTop: "6px",
                    }}
                  >
                    System Interface
                  </span>
                </div>
                <div className={styles.typeCardMeta}>
                  <span className={styles.typeRoleBadge}>Sans-serif</span>
                  <h3 className={styles.typeName}>Inter</h3>
                  <span className={styles.typeToken}>--sr-font-sans</span>
                  <p className={styles.typeDesc}>
                    Used for headings, labels, navigation, and body copy.
                  </p>
                </div>
              </div>

              {/* Font 2: Newsreader */}
              <div className={styles.typeCard}>
                <div className={styles.typeCardPreview}>
                  <span
                    style={{
                      fontFamily: "var(--sr-font-serif)",
                      fontStyle: "italic",
                      fontSize: "2.1rem",
                      color: "#ffffff",
                    }}
                  >
                    Editorial Text &amp;
                  </span>
                  <span
                    style={{
                      fontFamily: "var(--sr-font-serif)",
                      fontStyle: "italic",
                      fontSize: "0.95rem",
                      color: "#a1a1aa",
                      marginTop: "6px",
                    }}
                  >
                    Secondary Narrative
                  </span>
                </div>
                <div className={styles.typeCardMeta}>
                  <span className={styles.typeRoleBadge}>Serif Italic</span>
                  <h3 className={styles.typeName}>Newsreader</h3>
                  <span className={styles.typeToken}>--sr-font-serif</span>
                  <p className={styles.typeDesc}>
                    Used for subtitles, quotes, and narrative callouts.
                  </p>
                </div>
              </div>

              {/* Font 3: JetBrains Mono */}
              <div className={styles.typeCard}>
                <div className={styles.typeCardPreview}>
                  <span
                    style={{
                      fontFamily: "var(--sr-font-mono)",
                      fontSize: "1.45rem",
                      color: "#38bdf8",
                    }}
                  >
                    const value = 42;
                  </span>
                  <span
                    style={{
                      fontFamily: "var(--sr-font-mono)",
                      fontSize: "0.82rem",
                      color: "#a1a1aa",
                      marginTop: "6px",
                    }}
                  >
                    x: 100, y: 200
                  </span>
                </div>
                <div className={styles.typeCardMeta}>
                  <span className={styles.typeRoleBadge}>Monospace</span>
                  <h3 className={styles.typeName}>JetBrains Mono</h3>
                  <span className={styles.typeToken}>--sr-font-mono</span>
                  <p className={styles.typeDesc}>
                    Used for code blocks, terminal components, and data values.
                  </p>
                </div>
              </div>
            </div>

            {/* Typographic Scale Ladder */}
            <div className={styles.typeScaleLadder}>
              <div className={styles.typeScaleRow}>
                <div className={styles.typeScaleInfo}>
                  <span className={styles.typeScaleName}>Hero Scale</span>
                  <span className={styles.typeScaleVar}>--sr-font-hero (6.5rem)</span>
                </div>
                <div
                  className={styles.typeScaleSample}
                  style={{ fontFamily: "var(--sr-font-sans)", fontSize: "2rem", fontWeight: 800 }}
                >
                  Display Headline
                </div>
              </div>

              <div className={styles.typeScaleRow}>
                <div className={styles.typeScaleInfo}>
                  <span className={styles.typeScaleName}>Title Scale</span>
                  <span className={styles.typeScaleVar}>--sr-font-title (3.85rem)</span>
                </div>
                <div
                  className={styles.typeScaleSample}
                  style={{ fontFamily: "var(--sr-font-sans)", fontSize: "1.5rem", fontWeight: 700 }}
                >
                  Section Heading
                </div>
              </div>

              <div className={styles.typeScaleRow}>
                <div className={styles.typeScaleInfo}>
                  <span className={styles.typeScaleName}>Lead / Subtitle</span>
                  <span className={styles.typeScaleVar}>--sr-font-lead (2.45rem)</span>
                </div>
                <div
                  className={styles.typeScaleSample}
                  style={{
                    fontFamily: "var(--sr-font-serif)",
                    fontStyle: "italic",
                    fontSize: "1.25rem",
                    color: "rgba(255,255,255,0.75)",
                  }}
                >
                  A secondary lead sentence demonstrating typographic scale.
                </div>
              </div>

              <div className={styles.typeScaleRow}>
                <div className={styles.typeScaleInfo}>
                  <span className={styles.typeScaleName}>Body &amp; Code</span>
                  <span className={styles.typeScaleVar}>--sr-font-body / code</span>
                </div>
                <div
                  className={styles.typeScaleSample}
                  style={{
                    fontFamily: "var(--sr-font-mono)",
                    fontSize: "0.95rem",
                    color: "#38bdf8",
                  }}
                >
                  const result = compute(options);
                </div>
              </div>
            </div>
          </section>

          {/* Section 3: The Logomark */}
          <section className={styles.section}>
            <div className={styles.sectionHeader}>
              <span className={styles.sectionTag}>03 / Logomark</span>
              <h2 className={styles.sectionTitle}>Mark &amp; Lockups</h2>
              <p className={styles.sectionSubtitle}>
                A responsive vector mark combining bracket syntax with a playhead. Automatically
                adapts to an optically tuned, antialiased micro vector at &le;20px.
              </p>
            </div>

            <div className={styles.cardGrid3}>
              {/* Standalone Mark */}
              <div className={styles.card}>
                <div className={styles.lockupPreview}>
                  <StageRoutineLogo
                    width={64}
                    height={64}
                    style={{ color: "#ffffff" }}
                    aria-hidden="true"
                    role="img"
                  />
                </div>
                <div className={styles.lockupInfo}>
                  <h3 className={styles.lockupTitle}>Standalone Mark</h3>
                  <p className={styles.lockupDesc}>
                    Mark only. Use for application icons, favicons, and compact avatar spaces.
                  </p>
                  <div className={styles.specRow}>
                    <span className={styles.specItem}>
                      Type: <span>Mark Only</span>
                    </span>
                    <span className={styles.specItem}>
                      Aspect: <span>1:1 Square</span>
                    </span>
                  </div>
                </div>
              </div>

              {/* Horizontal Lockup */}
              <div className={styles.card}>
                <div className={styles.lockupPreview}>
                  <div className={styles.horizontalLockup}>
                    <StageRoutineLogo
                      width={28}
                      height={28}
                      style={{ color: "#ffffff" }}
                      aria-hidden="true"
                      role="img"
                    />
                    <span className={styles.horizontalLockupTitle}>StageRoutine</span>
                  </div>
                </div>
                <div className={styles.lockupInfo}>
                  <h3 className={styles.lockupTitle}>Horizontal Lockup</h3>
                  <p className={styles.lockupDesc}>
                    Inline mark and wordmark. Use for header navigation, title bars, and banners.
                  </p>
                  <div className={styles.specRow}>
                    <span className={styles.specItem}>
                      Type: <span>Inline</span>
                    </span>
                    <span className={styles.specItem}>
                      Align: <span>Horizontal Baseline</span>
                    </span>
                  </div>
                </div>
              </div>

              {/* Stacked Lockup */}
              <div className={styles.card}>
                <div className={styles.lockupPreview}>
                  <div className={styles.heroStackLockup}>
                    <div className={styles.heroStackMark}>
                      <StageRoutineLogo
                        width={44}
                        height={44}
                        style={{ color: "#ffffff" }}
                        aria-hidden="true"
                        role="img"
                      />
                    </div>
                    <span className={styles.heroStackTitle}>StageRoutine</span>
                    <span className={styles.heroStackSubtitle}>Sub-headline text</span>
                  </div>
                </div>
                <div className={styles.lockupInfo}>
                  <h3 className={styles.lockupTitle}>Stacked Lockup</h3>
                  <p className={styles.lockupDesc}>
                    Centered mark above wordmark. Use for title cards, presentation slides, and
                    splash screens.
                  </p>
                  <div className={styles.specRow}>
                    <span className={styles.specItem}>
                      Type: <span>Stacked</span>
                    </span>
                    <span className={styles.specItem}>
                      Align: <span>Center Column</span>
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Sizing Ladder */}
            <div className={styles.sizeLadder} style={{ marginTop: "1.75rem" }}>
              <div className={styles.sizeCol}>
                <div className={styles.sizeIconBox}>
                  <StageRoutineLogo
                    width={64}
                    height={64}
                    style={{ color: "#ffffff" }}
                    aria-hidden="true"
                    role="img"
                  />
                </div>
                <div className={styles.sizeLabel}>
                  <strong>64px</strong>
                </div>
              </div>

              <div className={styles.sizeCol}>
                <div className={styles.sizeIconBox}>
                  <StageRoutineLogo
                    width={44}
                    height={44}
                    style={{ color: "#ffffff" }}
                    aria-hidden="true"
                    role="img"
                  />
                </div>
                <div className={styles.sizeLabel}>
                  <strong>44px</strong>
                </div>
              </div>

              <div className={styles.sizeCol}>
                <div className={styles.sizeIconBox}>
                  <StageRoutineLogo
                    width={28}
                    height={28}
                    style={{ color: "#ffffff" }}
                    aria-hidden="true"
                    role="img"
                  />
                </div>
                <div className={styles.sizeLabel}>
                  <strong>28px</strong>
                </div>
              </div>

              <div className={styles.sizeCol}>
                <div className={styles.sizeIconBox}>
                  <MicroLogo
                    width={20}
                    height={20}
                    style={{ color: "#ffffff" }}
                    aria-hidden="true"
                    role="img"
                  />
                </div>
                <div className={styles.sizeLabel}>
                  <strong>20px</strong>
                </div>
              </div>

              <div className={styles.sizeCol}>
                <div className={styles.sizeIconBox}>
                  <MicroLogo
                    width={16}
                    height={16}
                    style={{ color: "#ffffff" }}
                    aria-hidden="true"
                    role="img"
                  />
                </div>
                <div className={styles.sizeLabel}>
                  <strong>16px</strong>
                </div>
              </div>
            </div>
          </section>
        </div>
      </main>
    </Layout>
  );
}
