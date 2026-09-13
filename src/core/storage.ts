/**
 * Multi-tier storage engine with local, session, and runtime scopes.
 */

const PREFIX = "sr";

export type StorageListener<T = unknown> = (
  newValue: T | undefined,
  oldValue: T | undefined,
) => void;

/**
 * Minimal key-value backend interface. Native localStorage and sessionStorage implement this directly.
 */
export interface StorageBackend {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

/**
 * Isolated storage scope providing typed read, write, and reactive subscriptions.
 */
export class StorageScope {
  private backend: StorageBackend;
  private listeners = new Map<string, Set<StorageListener<unknown>>>();

  constructor(backend: StorageBackend) {
    this.backend = backend;
  }

  private rawKey(key: string): string {
    return `${PREFIX}:${key}`;
  }

  private stripKey(rawKey: string): string | null {
    if (rawKey.startsWith(`${PREFIX}:`)) {
      return rawKey.slice(PREFIX.length + 1);
    }
    return null;
  }

  /** @internal Dispatches external events (e.g. window storage events) */
  _handleExternalChange(rawKey: string, rawNewVal: string | null, rawOldVal: string | null): void {
    const cleanKey = this.stripKey(rawKey);
    if (!cleanKey) return;
    const newVal = rawNewVal ? this.deserialize(rawNewVal) : undefined;
    const oldVal = rawOldVal ? this.deserialize(rawOldVal) : undefined;
    this.notify(cleanKey, newVal, oldVal);
  }

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

  get<T = unknown>(key: string, defaultValue?: T): T {
    try {
      const raw = this.backend.getItem(this.rawKey(key));
      if (raw === null || raw === undefined) {
        return defaultValue as T;
      }
      return this.deserialize<T>(raw);
    } catch {
      return defaultValue as T;
    }
  }

  set<T = unknown>(key: string, value: T): void {
    const rKey = this.rawKey(key);
    const oldVal = this.get<T>(key);
    const serialized = this.serialize(value);
    try {
      this.backend.setItem(rKey, serialized);
    } catch {
      // ignore quota or storage disabled errors
    }
    this.notify(key, value, oldVal);
  }

  delete(key: string): void {
    const rKey = this.rawKey(key);
    const oldVal = this.get(key);
    try {
      this.backend.removeItem(rKey);
    } catch {
      // ignore errors
    }
    this.notify(key, undefined, oldVal);
  }

  has(key: string): boolean {
    try {
      return this.backend.getItem(this.rawKey(key)) !== null;
    } catch {
      return false;
    }
  }

  subscribe<T = unknown>(key: string, listener: StorageListener<T>): () => void {
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

function createMemoryBackend(): StorageBackend {
  const store = new Map<string, string>();
  return {
    getItem: (key) => store.get(key) ?? null,
    setItem: (key, value) => {
      store.set(key, value);
    },
    removeItem: (key) => {
      store.delete(key);
    },
  };
}

function getWebStorage(type: "localStorage" | "sessionStorage"): StorageBackend {
  try {
    const s = window[type];
    if (s) return s;
  } catch {
    // Fall back to memory if the browser blocks access (e.g. privacy mode)
  }
  return createMemoryBackend();
}

function getRuntimeStorage(): StorageBackend {
  const win = window as unknown as { __sr_runtime_storage__?: StorageBackend };
  if (!win.__sr_runtime_storage__) {
    win.__sr_runtime_storage__ = createMemoryBackend();
  }
  return win.__sr_runtime_storage__;
}

/**
 * Coordinated StageRoutine multi-tier storage manager.
 * @category Core
 */
export class StageStorage {
  /** Persistent storage surviving browser restarts. */
  readonly local: StorageScope;
  /** Session storage surviving page reloads, cleared when tab closes. */
  readonly session: StorageScope;
  /** In-memory runtime storage surviving HMR, reset on page reload. */
  readonly runtime: StorageScope;

  constructor() {
    this.local = new StorageScope(getWebStorage("localStorage"));
    this.session = new StorageScope(getWebStorage("sessionStorage"));
    this.runtime = new StorageScope(getRuntimeStorage());

    window.addEventListener("storage", (e: StorageEvent) => {
      if (!e.key) return;
      this.local._handleExternalChange(e.key, e.newValue, e.oldValue);
    });
  }
}

export const storage = new StageStorage();
