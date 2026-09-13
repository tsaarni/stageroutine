import Link from "@docusaurus/Link";
import StageRoutineLogo from "@site/src/components/StageRoutineLogo";
import MicroLogo from "@site/static/img/stageroutine-logo-micro.svg";
import Layout from "@theme/Layout";
import type React from "react";
import { useState } from "react";
import styles from "./brand.module.css";

interface ThemePreset {
  id: string;
  name: string;
  tag: string;
  background: string;
  text: string;
  primary: string;
  textMuted: string;
  textDim: string;
  surfaceBg: string;
  surfaceBorder: string;
  badgeBg: string;
  btnTextColor: string;
}

const THEME_PRESETS: ThemePreset[] = [
  {
    id: "defaultDark",
    name: "Default Dark",
    tag: "Native Dark",
    background: "#09090b",
    text: "#ffffff",
    primary: "#38bdf8",
    textMuted: "rgba(255, 255, 255, 0.65)",
    textDim: "rgba(255, 255, 255, 0.40)",
    surfaceBg:
      "linear-gradient(180deg, rgba(255, 255, 255, 0.05) 0%, rgba(255, 255, 255, 0.015) 100%)",
    surfaceBorder: "rgba(255, 255, 255, 0.10)",
    badgeBg: "rgba(56, 189, 248, 0.12)",
    btnTextColor: "#09090b",
  },
  {
    id: "tokyoNight",
    name: "Tokyo Night",
    tag: "Navy & Blue",
    background: "#1a1b26",
    text: "#c0caf5",
    primary: "#7aa2f7",
    textMuted: "rgba(192, 202, 245, 0.65)",
    textDim: "rgba(192, 202, 245, 0.40)",
    surfaceBg:
      "linear-gradient(180deg, rgba(192, 202, 245, 0.06) 0%, rgba(192, 202, 245, 0.02) 100%)",
    surfaceBorder: "rgba(192, 202, 245, 0.12)",
    badgeBg: "rgba(122, 162, 247, 0.15)",
    btnTextColor: "#1a1b26",
  },
  {
    id: "dracula",
    name: "Dracula",
    tag: "Violet & Pink",
    background: "#282a36",
    text: "#f8f8f2",
    primary: "#ff79c6",
    textMuted: "rgba(248, 248, 242, 0.65)",
    textDim: "rgba(248, 248, 242, 0.40)",
    surfaceBg:
      "linear-gradient(180deg, rgba(248, 248, 242, 0.06) 0%, rgba(248, 248, 242, 0.02) 100%)",
    surfaceBorder: "rgba(248, 248, 242, 0.12)",
    badgeBg: "rgba(255, 121, 198, 0.15)",
    btnTextColor: "#282a36",
  },
  {
    id: "cyberpunk",
    name: "Cyberpunk",
    tag: "Neon & Crimson",
    background: "#0d0221",
    text: "#00f0ff",
    primary: "#ff003c",
    textMuted: "rgba(0, 240, 255, 0.65)",
    textDim: "rgba(0, 240, 255, 0.40)",
    surfaceBg: "linear-gradient(180deg, rgba(0, 240, 255, 0.08) 0%, rgba(0, 240, 255, 0.02) 100%)",
    surfaceBorder: "rgba(0, 240, 255, 0.16)",
    badgeBg: "rgba(255, 0, 60, 0.15)",
    btnTextColor: "#ffffff",
  },
  {
    id: "defaultLight",
    name: "Clean Light",
    tag: "Editorial Light",
    background: "#fafafa",
    text: "#09090b",
    primary: "#0284c7",
    textMuted: "rgba(9, 9, 11, 0.65)",
    textDim: "rgba(9, 9, 11, 0.40)",
    surfaceBg: "linear-gradient(180deg, rgba(9, 9, 11, 0.04) 0%, rgba(9, 9, 11, 0.015) 100%)",
    surfaceBorder: "rgba(9, 9, 11, 0.10)",
    badgeBg: "rgba(2, 132, 199, 0.12)",
    btnTextColor: "#ffffff",
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

          {/* Section 1: Adaptive Color Engine */}
          <section className={styles.section}>
            <div className={styles.sectionHeader}>
              <span className={styles.sectionTag}>01 / Color Scheming</span>
              <h2 className={styles.sectionTitle}>Theme Engine</h2>
              <p className={styles.sectionSubtitle}>
                Themes define three base properties: <code>background</code>, <code>text</code>, and{" "}
                <code>primary</code>. Secondary shades and surfaces are derived automatically.
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
                    background: activePreset.surfaceBg,
                    border: `1px solid ${activePreset.surfaceBorder}`,
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

                  <p className={styles.sandboxSubtitle} style={{ color: activePreset.textMuted }}>
                    Secondary description demonstrating layout hierarchy.
                  </p>

                  <div
                    className={styles.sandboxFooterRow}
                    style={{ borderColor: activePreset.surfaceBorder }}
                  >
                    <span
                      className={styles.sandboxCodeSnippet}
                      style={{ color: activePreset.textDim }}
                    >
                      stage.theme(themes.{activePreset.id})
                    </span>

                    <button
                      type="button"
                      className={styles.sandboxBtn}
                      style={{
                        background: activePreset.primary,
                        color: activePreset.btnTextColor,
                      }}
                    >
                      <span>Action</span>
                      <MicroLogo
                        width={14}
                        height={14}
                        style={{ color: activePreset.btnTextColor }}
                        aria-hidden="true"
                        role="img"
                      />
                    </button>
                  </div>
                </div>
              </div>

              {/* Real-time Config Details */}
              <div className={styles.sandboxConfigRow}>
                <div>
                  <code>background: "{activePreset.background}"</code> &middot;{" "}
                  <code>text: "{activePreset.text}"</code> &middot;{" "}
                  <code>primary: "{activePreset.primary}"</code>
                </div>
                <div style={{ color: activePreset.primary }}>
                  &check; Logo and surfaces inherit CSS custom properties
                </div>
              </div>
            </div>

            {/* Derived Tokens */}
            <div className={styles.derivationGrid}>
              <div className={styles.derivationCard}>
                <span className={styles.derivationFormula}>
                  color-mix(in srgb, var(--sr-text) 65%, transparent)
                </span>
                <h3 className={styles.derivationName}>--sr-text-muted</h3>
                <p className={styles.derivationDesc}>Secondary text color with 65% opacity.</p>
              </div>

              <div className={styles.derivationCard}>
                <span className={styles.derivationFormula}>linear-gradient(text 5% to 1.5%)</span>
                <h3 className={styles.derivationName}>--sr-surface</h3>
                <p className={styles.derivationDesc}>
                  Translucent surface gradient for cards and dialogs.
                </p>
              </div>

              <div className={styles.derivationCard}>
                <span className={styles.derivationFormula}>
                  1px solid color-mix(text 10%, transparent)
                </span>
                <h3 className={styles.derivationName}>--sr-surface-border</h3>
                <p className={styles.derivationDesc}>
                  Subtle border stroke derived from text color.
                </p>
              </div>
            </div>
          </section>

          {/* Section 2: Color Tokens */}
          <section className={styles.section}>
            <div className={styles.sectionHeader}>
              <span className={styles.sectionTag}>02 / Color Tokens</span>
              <h2 className={styles.sectionTitle}>Default Palette</h2>
              <p className={styles.sectionSubtitle}>
                Default tokens for canvas, surfaces, text, and accents.
              </p>
            </div>

            <div className={styles.paletteGrid}>
              {[
                { name: "Canvas Background", hex: "#09090b", role: "Base canvas background" },
                { name: "Text Primary", hex: "#ffffff", role: "Headings and primary text" },
                { name: "Accent Primary", hex: "#38bdf8", role: "Primary accent color" },
                { name: "Accent Secondary", hex: "#7dd3fc", role: "Secondary highlight color" },
                { name: "Text Muted", hex: "#a1a1aa", role: "Secondary text (65% opacity)" },
                { name: "Surface Dark", hex: "#18181b", role: "Base surface color" },
                {
                  name: "Surface Border",
                  hex: "rgba(255,255,255,0.1)",
                  role: "Card and dialog borders",
                },
                {
                  name: "Accent Highlight",
                  hex: "rgba(56,189,248,0.15)",
                  role: "Focus ring and glow",
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
                      border:
                        swatch.hex === "#09090b" ? "1px solid rgba(255,255,255,0.1)" : undefined,
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
          </section>

          {/* Section 3: Typography System */}
          <section className={styles.section}>
            <div className={styles.sectionHeader}>
              <span className={styles.sectionTag}>03 / Typography</span>
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

          {/* Section 4: The Logomark */}
          <section className={styles.section}>
            <div className={styles.sectionHeader}>
              <span className={styles.sectionTag}>04 / Logomark</span>
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
                  <p className={styles.lockupDesc}>Application icons, favicons, and avatars.</p>
                  <div className={styles.specRow}>
                    <span className={styles.specItem}>
                      Aspect: <span>1:1</span>
                    </span>
                    <span className={styles.specItem}>
                      Scale: <span>16px - 128px (Adaptive)</span>
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
                    Header navigation. Sized at 28px height with 11px margin.
                  </p>
                  <div className={styles.specRow}>
                    <span className={styles.specItem}>
                      Mark: <span>28px</span>
                    </span>
                    <span className={styles.specItem}>
                      Gap: <span>11px</span>
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
                    Centered layouts for title cards and splash screens.
                  </p>
                  <div className={styles.specRow}>
                    <span className={styles.specItem}>
                      Mark: <span>44px - 64px</span>
                    </span>
                    <span className={styles.specItem}>
                      Align: <span>Center</span>
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
                  Display
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
                  Control
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
                  Navbar
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
                  Micro UI
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
                  Favicon
                </div>
              </div>
            </div>
          </section>
        </div>
      </main>
    </Layout>
  );
}
