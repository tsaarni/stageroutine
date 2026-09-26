/**
 * Metrics collection and Prometheus-style diagnostic registry for StageRoutine.
 * Provides on-demand, zero-overhead metrics with inline descriptions, units, and labels.
 */

export type MetricType = "counter" | "gauge";

export type MetricLabelValue = string | number | boolean;
export type MetricLabels = Record<string, MetricLabelValue | null | undefined>;

export interface LabeledItem {
  readonly labels: MetricLabels;
  readonly value?: number;
}

export type MetricGaugeValue =
  | number
  | boolean
  | null
  | undefined
  | LabeledItem[]
  | { readonly labels: MetricLabels; readonly value?: number };

export interface BaseMetricOptions {
  readonly name: string;
  readonly help: string;
  readonly unit?: string;
}

export interface CounterOptions extends BaseMetricOptions {
  readonly initial?: number;
  /** Dynamic resolver function. When provided, manual inc() and reset() calls are disallowed. */
  readonly collect?: () => number;
}

export interface GaugeOptions extends BaseMetricOptions {
  readonly initial?: number | boolean;
  readonly labels?: MetricLabels;
  readonly collect?: () => MetricGaugeValue;
}

export interface MetricSample {
  readonly name: string;
  readonly labels?: MetricLabels;
  readonly value: number;
}

export interface MetricFamily {
  readonly name: string;
  readonly help: string;
  readonly type: MetricType;
  readonly unit?: string;
  collect(): MetricSample[];
}

/** Sanitize metric names to Prometheus identifier standard ([a-zA-Z_:][a-zA-Z0-9_:]*). */
export function sanitizeMetricName(name: string): string {
  const sanitized = name.replace(/[^a-zA-Z0-9_:]/g, "_");
  return /^[a-zA-Z_:]/.test(sanitized) ? sanitized : `sr_${sanitized}`;
}

/** Sanitize label names to Prometheus identifier standard ([a-zA-Z_][a-zA-Z0-9_]*). */
export function sanitizeLabelName(name: string): string {
  const sanitized = name.replace(/[^a-zA-Z0-9_]/g, "_");
  return /^[a-zA-Z_]/.test(sanitized) ? sanitized : `label_${sanitized}`;
}

/** Escape Prometheus label value. */
export function escapeLabelValue(val: string): string {
  return val.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\n/g, "\\n");
}

/** Escape Prometheus HELP line text. */
export function escapeHelpText(text: string): string {
  return text.replace(/\\/g, "\\\\").replace(/\n/g, "\\n");
}

/** Format a dictionary of labels into `{k="v",...}` syntax. */
export function formatLabels(labels?: MetricLabels): string {
  if (!labels) return "";
  const entries: string[] = [];
  for (const [k, v] of Object.entries(labels)) {
    if (v === null || v === undefined) continue;
    const key = sanitizeLabelName(k);
    const val = escapeLabelValue(String(v));
    entries.push(`${key}="${val}"`);
  }
  return entries.length > 0 ? `{${entries.join(",")}}` : "";
}

/**
 * Counter metric: monotonically increasing integer or float.
 */
export class Counter implements MetricFamily {
  readonly name: string;
  readonly help: string;
  readonly type = "counter" as const;
  readonly unit?: string;
  private value: number;
  private readonly resolver?: () => number;
  private readonly onDispose: () => void;

  constructor(opts: CounterOptions, onDispose: () => void) {
    this.name = sanitizeMetricName(opts.name);
    this.help = opts.help;
    this.unit = opts.unit;
    this.value = opts.initial ?? 0;
    this.resolver = opts.collect;
    this.onDispose = onDispose;
  }

  inc(amount = 1): void {
    if (this.resolver) {
      throw new Error(
        `Counter ${this.name} uses a dynamic collect resolver and cannot be manually incremented.`,
      );
    }
    if (amount < 0) {
      throw new Error(`Counter ${this.name} cannot be incremented by a negative value: ${amount}`);
    }
    this.value += amount;
  }

  reset(): void {
    if (this.resolver) {
      throw new Error(`Counter ${this.name} uses a dynamic collect resolver and cannot be reset.`);
    }
    this.value = 0;
  }

  get(): number {
    return this.resolver ? this.resolver() : this.value;
  }

  collect(): MetricSample[] {
    return [{ name: this.name, value: this.get() }];
  }

  dispose(): void {
    this.onDispose();
  }
}

/**
 * Gauge metric: can go up and down, be set directly, or be dynamically sampled via `collect()`.
 */
export class Gauge implements MetricFamily {
  readonly name: string;
  readonly help: string;
  readonly type = "gauge" as const;
  readonly unit?: string;
  readonly labels?: MetricLabels;
  private value: number;
  private readonly resolver?: () => MetricGaugeValue;
  private readonly onDispose: () => void;

  constructor(opts: GaugeOptions, onDispose: () => void) {
    this.name = sanitizeMetricName(opts.name);
    this.help = opts.help;
    this.unit = opts.unit;
    this.labels = opts.labels;
    if (typeof opts.initial === "boolean") {
      this.value = opts.initial ? 1 : 0;
    } else {
      this.value = opts.initial ?? 0;
    }
    this.resolver = opts.collect;
    this.onDispose = onDispose;
  }

  set(val: number | boolean): void {
    if (typeof val === "boolean") {
      this.value = val ? 1 : 0;
    } else {
      this.value = val;
    }
  }

  inc(amount = 1): void {
    this.value += amount;
  }

  dec(amount = 1): void {
    this.value -= amount;
  }

  get(): number {
    if (this.resolver) {
      const res = this.resolver();
      if (res === null || res === undefined) return 0;
      if (typeof res === "number") return res;
      if (typeof res === "boolean") return res ? 1 : 0;
      if (Array.isArray(res)) return res.length;
      return res.value ?? 1;
    }
    return this.value;
  }

  collect(): MetricSample[] {
    if (this.resolver) {
      let res: MetricGaugeValue;
      try {
        res = this.resolver();
      } catch (err) {
        return [
          {
            name: `${this.name}_error`,
            labels: { error: String(err) },
            value: 1,
          },
        ];
      }

      if (res === null || res === undefined) {
        return [];
      }

      if (typeof res === "number") {
        return [{ name: this.name, labels: this.labels, value: res }];
      }

      if (typeof res === "boolean") {
        return [{ name: this.name, labels: this.labels, value: res ? 1 : 0 }];
      }

      if (Array.isArray(res)) {
        // Output count line first
        const samples: MetricSample[] = [
          {
            name: `${this.name}_count`,
            labels: this.labels,
            value: res.length,
          },
        ];

        for (const item of res) {
          const mergedLabels = this.labels ? { ...this.labels, ...item.labels } : item.labels;
          samples.push({
            name: this.name,
            labels: mergedLabels,
            value: item.value ?? 1,
          });
        }
        return samples;
      }

      if (typeof res === "object" && res !== null) {
        const mergedLabels = this.labels ? { ...this.labels, ...res.labels } : res.labels;
        return [{ name: this.name, labels: mergedLabels, value: res.value ?? 1 }];
      }
    }

    return [{ name: this.name, labels: this.labels, value: this.value }];
  }

  dispose(): void {
    this.onDispose();
  }
}

/**
 * MetricRegistry holds diagnostic metrics and formats them in Prometheus text exposition format.
 */
export class MetricRegistry {
  private families = new Map<string, MetricFamily[]>();

  /**
   * Register a new Counter.
   */
  counter(opts: CounterOptions): Counter {
    const counter = new Counter(opts, () => {
      this.unregister(counter.name, counter);
    });
    this.addFamily(counter.name, counter);
    return counter;
  }

  /**
   * Register a new Gauge.
   */
  gauge(opts: GaugeOptions): Gauge {
    const gauge = new Gauge(opts, () => {
      this.unregister(gauge.name, gauge);
    });
    this.addFamily(gauge.name, gauge);
    return gauge;
  }

  private addFamily(name: string, member: MetricFamily): void {
    const existing = this.families.get(name);
    if (existing) {
      existing.push(member);
    } else {
      this.families.set(name, [member]);
    }
  }

  private unregister(name: string, member: MetricFamily): void {
    const existing = this.families.get(name);
    if (!existing) return;
    const filtered = existing.filter((m) => m !== member);
    if (filtered.length > 0) {
      this.families.set(name, filtered);
    } else {
      this.families.delete(name);
    }
  }

  /**
   * Clears all registered metrics.
   */
  clear(): void {
    this.families.clear();
  }

  /**
   * Returns a snapshot of metrics as a structured map.
   */
  collect(): Record<string, unknown> {
    const result: Record<string, unknown> = {};

    for (const members of this.families.values()) {
      for (const member of members) {
        const samples = member.collect();
        for (const sample of samples) {
          const key = sample.labels ? `${sample.name}${formatLabels(sample.labels)}` : sample.name;
          result[key] = sample.value;
        }
      }
    }

    return result;
  }

  /**
   * Formats all registered metrics into standard Prometheus exposition text.
   */
  exportText(): string {
    const lines: string[] = [];

    for (const [name, members] of this.families.entries()) {
      if (members.length === 0) continue;
      const allSamples = members.flatMap((m) => m.collect());
      if (allSamples.length === 0) continue;

      const first = members[0];
      const help = escapeHelpText(first.help);
      lines.push(`# HELP ${name} ${help}`);
      lines.push(`# TYPE ${name} ${first.type}`);

      for (const sample of allSamples) {
        const labelsStr = formatLabels(sample.labels);
        lines.push(`${sample.name}${labelsStr} ${sample.value}`);
      }

      lines.push("");
    }

    return lines.join("\n");
  }

  /**
   * Primary inspection hook called by DevTools MCP or window.__STAGEROUTINE_DEV__.getMetrics().
   */
  getMetrics(): string {
    return this.exportText();
  }
}
