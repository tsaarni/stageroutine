import Link from "@docusaurus/Link";
import useBaseUrl from "@docusaurus/useBaseUrl";
import useDocusaurusContext from "@docusaurus/useDocusaurusContext";
import Layout from "@theme/Layout";
import type React from "react";
import { AsciiFluidCanvas } from "../components/AsciiFluidCanvas";
import styles from "./index.module.css";

function HomepageHeader() {
  const { siteConfig } = useDocusaurusContext();
  const demoUrl = useBaseUrl("/demo/");
  return (
    <header className={styles.heroWrapper}>
      <AsciiFluidCanvas color="#38bdf8" backgroundColor="#09090b" opacity={0.38} cellSize={16} />
      <div className={styles.heroContent}>
        <h1 className={styles.heroTitle}>{siteConfig.title}</h1>
        <p className={styles.heroSubtitle}>
          <span>Reactive, step-driven presentations and technical motion graphics.</span>
        </p>
        <div className={styles.buttons}>
          <Link className={styles.primaryButton} to="/docs/getting-started/quickstart">
            Get Started
          </Link>
          <a className={styles.secondaryButton} href={demoUrl} target="_top">
            Live Demo
          </a>
          <Link className={styles.secondaryButton} to="/docs/api/">
            API Reference
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
      wrapperClassName={styles.homePageWrapper}
      noFooter
    >
      <HomepageHeader />
    </Layout>
  );
}
