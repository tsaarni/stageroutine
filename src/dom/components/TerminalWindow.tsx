/**
 * Terminal window component with macOS-style window controls and line-by-line output.
 */

import type { ElementOptions } from "../element";

export interface TerminalWindowProps extends ElementOptions {
  title?: string;
  lines?: string[];
  className?: string;
}

export function TerminalWindow(props: TerminalWindowProps = {}) {
  const lines = props.lines || [
    "$ pnpm create stageroutine@latest my-talk",
    "✔ Initialized reactive stage runtime",
    "⚡ Stage live on http://localhost:5173",
  ];
  const classes = ["sr-terminal-window", props.className].filter(Boolean).join(" ");

  return (
    <div className={classes} {...props}>
      <div className="sr-terminal-header">
        <div className="sr-terminal-dot red" />
        <div className="sr-terminal-dot yellow" />
        <div className="sr-terminal-dot green" />
        <span className="sr-terminal-title">{props.title || "bash - 80x24"}</span>
      </div>
      <div className="sr-terminal-body">
        {lines.map((l) => (
          <div key={`line-${l}`}>{l}</div>
        ))}
      </div>
    </div>
  );
}
