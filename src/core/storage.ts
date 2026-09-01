/**
 * Coordinated, type-safe localStorage engine with in-memory fallback and multi-window sync.
 */

export interface StorageOptions {
  /** Prefix for raw storage keys. Defaults to "sr". */
  prefix?: string;
}

export type StorageListener<T = unknown> = (
  newValue: T | undefined,
  oldValue: T | undefined,
) => void;

/**
 * Coordinated StageRoutine storage manager.
 * @category Core
 */
export class StageStorage {
  private prefix: string;
  private memoryStore = new Map<string, string>();
  private listeners = new Map<string, Set<StorageListener<unknown>>>();
  private isAvailable: boolean;

  constructor(options: StorageOptions = {}) {
    this.prefix = options.prefix ?? "sr";
    this.isAvailable = this.checkAvailability();

    if (typeof window !== "undefined" && typeof window.addEventListener === "function") {
      window.addEventListener("storage", this.handleStorageEvent);
    }
  }

  private checkAvailability(): boolean {
    if (typeof window === "undefined" || !window.localStorage) {
      return false;
    }
    try {
      const testKey = `__${this.prefix}_test__`;
      window.localStorage.setItem(testKey, "1");
      window.localStorage.removeItem(testKey);
      return true;
    } catch {
      return false;
    }
  }

  private rawKey(key: string): string {
    return `${this.prefix}:${key}`;
  }

  private stripKey(rawKey: string): string | null {
    if (rawKey.startsWith(`${this.prefix}:`)) {
      return rawKey.slice(this.prefix.length + 1);
    }
    return null;
  }

  private handleStorageEvent = (event: StorageEvent): void => {
    if (!event.key) return;
    const cleanKey = this.stripKey(event.key);
    if (!cleanKey) return;

    const oldVal = event.oldValue ? this.deserialize(event.oldValue) : undefined;
    const newVal = event.newValue ? this.deserialize(event.newValue) : undefined;
    this.notify(cleanKey, newVal, oldVal);
  };

  private serialize(value: unknown): string {
    return JSON.stringify(value);
  }

  private deserialize<T>(str: string): T {
    try {
      return JSON.parse(str) as T;
    } catch {
      return str as unknown as T;
    }
  }

  private notify(key: string, newValue: unknown, oldValue: unknown): void {
    const keyListeners = this.listeners.get(key);
    if (keyListeners) {
      for (const fn of keyListeners) {
        try {
          fn(newValue, oldValue);
        } catch {
          // ignore listener errors
        }
      }
    }
  }

  /**
   * Retrieves a typed value from storage by dot-separated key, returning defaultValue if not found.
   *
   * @example
   * ```ts
   * const deviceId = storage.get("webcam.deviceId", "default");
   * ```
   */
  get<T>(key: string, defaultValue?: T): T {
    const rKey = this.rawKey(key);
    let raw: string | null | undefined;

    if (this.isAvailable) {
      try {
        raw = window.localStorage.getItem(rKey);
      } catch {
        raw = this.memoryStore.get(rKey);
      }
    } else {
      raw = this.memoryStore.get(rKey);
    }

    if (raw === null || raw === undefined) {
      return defaultValue as T;
    }

    return this.deserialize<T>(raw);
  }

  /**
   * Stores a value by dot-separated key, serializing to JSON and notifying subscribers.
   *
   * @example
   * ```ts
   * storage.set("webcam.deviceId", "camera-123");
   * ```
   */
  set<T>(key: string, value: T): void {
    const rKey = this.rawKey(key);
    const oldVal = this.get<T>(key);
    const serialized = this.serialize(value);

    if (this.isAvailable) {
      try {
        window.localStorage.setItem(rKey, serialized);
      } catch {
        this.memoryStore.set(rKey, serialized);
      }
    } else {
      this.memoryStore.set(rKey, serialized);
    }

    this.notify(key, value, oldVal);
  }

  /**
   * Removes an entry by dot-separated key.
   */
  delete(key: string): void {
    const rKey = this.rawKey(key);
    const oldVal = this.get(key);

    if (this.isAvailable) {
      try {
        window.localStorage.removeItem(rKey);
      } catch {
        this.memoryStore.delete(rKey);
      }
    } else {
      this.memoryStore.delete(rKey);
    }

    this.notify(key, undefined, oldVal);
  }

  /**
   * Checks if an entry exists by dot-separated key.
   */
  has(key: string): boolean {
    const rKey = this.rawKey(key);
    if (this.isAvailable) {
      try {
        return window.localStorage.getItem(rKey) !== null;
      } catch {
        return this.memoryStore.has(rKey);
      }
    }
    return this.memoryStore.has(rKey);
  }

  /**
   * Returns all stored dot-separated keys.
   */
  keys(): string[] {
    const result: string[] = [];
    const prefix = `${this.prefix}:`;

    if (this.isAvailable) {
      try {
        for (let i = 0; i < window.localStorage.length; i++) {
          const k = window.localStorage.key(i);
          if (k?.startsWith(prefix)) {
            result.push(k.slice(prefix.length));
          }
        }
        return result;
      } catch {
        // fallback to memoryStore
      }
    }

    for (const k of this.memoryStore.keys()) {
      if (k.startsWith(prefix)) {
        result.push(k.slice(prefix.length));
      }
    }
    return result;
  }

  /**
   * Clears all StageRoutine entries.
   */
  clear(): void {
    const allKeys = this.keys();
    for (const k of allKeys) {
      this.delete(k);
    }
  }

  /**
   * Subscribes to changes on a dot-separated key across windows and local mutations.
   * Returns an unsubscribe callback function.
   *
   * @example
   * ```ts
   * const unsubscribe = storage.subscribe("webcam.deviceId", (newId) => {
   *   console.log("Camera switched:", newId);
   * });
   * ```
   */
  subscribe<T>(key: string, listener: StorageListener<T>): () => void {
    let set = this.listeners.get(key);
    if (!set) {
      set = new Set();
      this.listeners.set(key, set);
    }
    set.add(listener as StorageListener<unknown>);

    return () => {
      const currentSet = this.listeners.get(key);
      if (currentSet) {
        currentSet.delete(listener as StorageListener<unknown>);
        if (currentSet.size === 0) {
          this.listeners.delete(key);
        }
      }
    };
  }
}

/**
 * Global coordinated storage instance.
 * @category Core
 */
export const storage = new StageStorage();
