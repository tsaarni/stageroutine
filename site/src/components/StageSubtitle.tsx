import type React from "react";
import { useEffect, useState } from "react";
import styles from "./StageSubtitle.module.css";

interface StageSubtitleProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * React component mirroring StageRoutine's glow() and gradient() decorators
 * and using the framework's Newsreader serif font token (--sr-font-serif).
 *
 * Eagerly awaits document.fonts.ready before revealing to eliminate any FOUT / font-shift glitch.
 */
export function StageSubtitle({ children, className }: StageSubtitleProps): React.JSX.Element {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (document.fonts) {
      document.fonts.ready.then(() => {
        setReady(true);
      });
    } else {
      setReady(true);
    }
  }, []);

  return (
    <p className={`${styles.glowContainer} ${className ?? ""}`} style={{ opacity: ready ? 1 : 0 }}>
      <span className={styles.gradientText}>{children}</span>
    </p>
  );
}
