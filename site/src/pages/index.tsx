import Link from "@docusaurus/Link";
import useBaseUrl from "@docusaurus/useBaseUrl";
import useDocusaurusContext from "@docusaurus/useDocusaurusContext";
import Layout from "@theme/Layout";
import type React from "react";
import { useEffect, useState } from "react";
import { AsciiFluidCanvas } from "../components/AsciiFluidCanvas";
import { StageLighting } from "../components/StageLighting";
import StageRoutineLogo from "../components/StageRoutineLogo";
import { StageSubtitle } from "../components/StageSubtitle";
import styles from "./index.module.css";

function HomepageHeader() {
  const { siteConfig } = useDocusaurusContext();
  const demoUrl = useBaseUrl("/demo/");
  const [fontsReady, setFontsReady] = useState(false);

  useEffect(() => {
    if (document.fonts) {
      document.fonts.ready.then(() => setFontsReady(true));
    } else {
      setFontsReady(true);
    }
  }, []);

  return (
    <header className={styles.heroWrapper}>
      <AsciiFluidCanvas color="#38bdf8" backgroundColor="#09090b" opacity={0.38} cellSize={18} />
      <div className={styles.heroVignette} aria-hidden="true" />
      <StageLighting />
      <div className={styles.letterboxTop} aria-hidden="true" />
      <div className={styles.letterboxBottom} aria-hidden="true" />
      <div
        className={styles.heroContent}
        style={{
          opacity: fontsReady ? 1 : 0,
          transition: "opacity 0.25s ease-out",
        }}
      >
        <div className={styles.heroLogoWrapper}>
          <StageRoutineLogo className={styles.heroLogo} aria-hidden="true" role="img" />
        </div>
        <h1 className={styles.heroTitle}>{siteConfig.title}</h1>
        <StageSubtitle>Code-driven presentations built for the stage.</StageSubtitle>
        <div className={styles.buttons}>
          <Link className={styles.primaryButton} to="/docs/getting-started/quickstart">
            Get Started
          </Link>
          <a
            className={`${styles.secondaryButton} ${styles.demoButton}`}
            href={demoUrl}
            target="_top"
          >
            Live Demo
          </a>
          <Link className={styles.secondaryButton} to="/docs/intro">
            Documentation
          </Link>
        </div>
      </div>
    </header>
  );
}

export default function Home(): React.JSX.Element {
  const { siteConfig } = useDocusaurusContext();
  return (
    <Layout
      title={siteConfig.title}
      description={siteConfig.tagline}
      wrapperClassName={`${styles.homePageWrapper} homepage`}
      noFooter
    >
      <HomepageHeader />
    </Layout>
  );
}
