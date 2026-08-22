/**
 * Stat metric component displaying key performance indicators, values, and trends.
 */

import type { ElementOptions } from "../element";

export interface MetricProps extends ElementOptions {
  label: string;
  value: string;
  trend?: string;
  icon?: string;
  className?: string;
}

export function Metric(props: MetricProps) {
  const classes = ["sr-metric", props.className].filter(Boolean).join(" ");

  return (
    <div className={classes} {...props}>
      <div className="sr-metric-header">
        <span className="sr-metric-label">{props.label}</span>
        {props.icon && <span className="sr-metric-icon">{props.icon}</span>}
      </div>
      <h2 className="sr-metric-value">{props.value}</h2>
      {props.trend && <span className="sr-metric-trend">{props.trend}</span>}
    </div>
  );
}
