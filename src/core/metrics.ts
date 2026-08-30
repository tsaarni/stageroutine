/**
 * Metrics collection and diagnostic registry for StageRoutine.
 * Provides on-demand, zero-overhead numerical and state metrics accessible via flat dot-namespaced keys.
 */

export type MetricValue = number | string | boolean | null | undefined;
export type MetricMap = Record<string, MetricValue>;
export type MetricGetter = () => MetricValue | Record<string, unknown> | unknown[];

export class MetricRegistry {
  private providers = new Map<string, MetricGetter>();

  /**
   * Register a metric provider under a dot-namespaced key or prefix.
   * Returns a cleanup function to unregister.
   */
  register(prefix: string, getter: MetricGetter): () => void {
    this.providers.set(prefix, getter);
    return () => {
      this.providers.delete(prefix);
    };
  }

  /**
   * Collect all registered metrics into a flat dot-namespaced dictionary.
   */
  collect(): MetricMap {
    const result: MetricMap = {};

    for (const [prefix, getter] of this.providers.entries()) {
      try {
        const val = getter();
        if (val === null || val === undefined) {
          result[prefix] = val;
        } else if (typeof val === "object" && !Array.isArray(val)) {
          this.flattenObject(prefix, val as Record<string, unknown>, result);
        } else if (Array.isArray(val)) {
          this.flattenArray(prefix, val, result);
        } else {
          result[prefix] = val;
        }
      } catch (err) {
        result[`${prefix}.error`] = String(err);
      }
    }

    return result;
  }

  private flattenObject(prefix: string, obj: Record<string, unknown>, target: MetricMap): void {
    for (const [key, value] of Object.entries(obj)) {
      const fullKey = prefix ? `${prefix}.${key}` : key;
      if (value !== null && typeof value === "object" && !Array.isArray(value)) {
        this.flattenObject(fullKey, value as Record<string, unknown>, target);
      } else if (Array.isArray(value)) {
        this.flattenArray(fullKey, value, target);
      } else if (
        typeof value === "number" ||
        typeof value === "string" ||
        typeof value === "boolean" ||
        value === null ||
        value === undefined
      ) {
        target[fullKey] = value;
      }
    }
  }

  private flattenArray(prefix: string, arr: unknown[], target: MetricMap): void {
    target[`${prefix}.count`] = arr.length;
    for (let i = 0; i < arr.length; i++) {
      const item = arr[i];
      const itemKey = `${prefix}.${i}`;
      if (item !== null && typeof item === "object" && !Array.isArray(item)) {
        this.flattenObject(itemKey, item as Record<string, unknown>, target);
      } else if (
        typeof item === "number" ||
        typeof item === "string" ||
        typeof item === "boolean" ||
        item === null ||
        item === undefined
      ) {
        target[itemKey] = item;
      }
    }
  }
}
