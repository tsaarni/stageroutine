import { type DOMElement, DOMElementImpl, type ElementOptions, mount } from "../element";
import { createWindowFrame, type WindowFrame } from "./WindowFrame";

/** Browser window options. Default size: 120 × 65 stage units. @category Components @inline */
export interface BrowserWindowOptions extends ElementOptions {
  /** Page URL. Relative URLs resolve against the presentation URL. */
  url: string;
  /** Window label. Default: "Browser". */
  title?: string;
  /** Whether the page accepts pointer and keyboard input. Default: true. */
  interactive?: boolean;
}

/** Public browser window controls. @category Components */
export interface BrowserWindowElement extends DOMElement {
  /** Configured page URL; restored when stepping backward. */
  url: string;
  /** Window label. Default: "Browser". */
  title: string;
  /** Loads the configured URL again without clearing stored website data. */
  reload(): void;
}

function resolvePageURL(value: string): string {
  const url = new URL(value, window.location.href);
  if (!value.trim() || (url.protocol !== "http:" && url.protocol !== "https:")) {
    throw new TypeError("BrowserWindow url must be an HTTP(S) URL or a relative page path.");
  }
  return url.href;
}

/** Navigation API surface used by the window toolbar. */
interface PageNavigation extends EventTarget {
  readonly canGoBack: boolean;
  readonly canGoForward: boolean;
  back(): { committed: Promise<unknown>; finished: Promise<unknown> };
  forward(): { committed: Promise<unknown>; finished: Promise<unknown> };
}

function navigationButton(label: string, glyph: string): HTMLButtonElement {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "sr-browser-action";
  button.textContent = glyph;
  button.title = label;
  button.setAttribute("aria-label", label);
  button.disabled = true;
  return button;
}

/** @internal */
class BrowserWindowElementImpl extends DOMElementImpl implements BrowserWindowElement {
  static override _reactiveKeys: ReadonlySet<string> = new Set([
    ...DOMElementImpl._reactiveKeys,
    "url",
    "title",
  ]);

  private readonly frame: WindowFrame;
  private readonly address: HTMLAnchorElement;
  private readonly backButton: HTMLButtonElement;
  private readonly forwardButton: HTMLButtonElement;
  private removeNavigationListeners: (() => void) | null = null;
  private readonly placeholder: HTMLDivElement;
  private readonly interactive: boolean;
  private iframe: HTMLIFrameElement | null = null;
  private loadedURL: string | null = null;
  private source: string;
  private label: string;

  constructor(options: BrowserWindowOptions) {
    const url = resolvePageURL(options.url);
    const label = options.title ?? "Browser";
    const frame = createWindowFrame({ title: label, className: "sr-browser-window" });
    const toolbar = document.createElement("div");
    toolbar.className = "sr-browser-toolbar";
    const back = navigationButton("Back", "←");
    const forward = navigationButton("Forward", "→");
    const reload = document.createElement("button");
    reload.type = "button";
    reload.className = "sr-browser-action";
    reload.textContent = "↻";
    reload.title = "Reload page";
    reload.setAttribute("aria-label", "Reload page");
    const address = document.createElement("a");
    address.className = "sr-browser-address";
    address.textContent = options.url;
    address.href = url;
    address.target = "_blank";
    address.rel = "noopener noreferrer";
    address.title = "Open page in a new tab";
    address.setAttribute("aria-label", `Open ${options.url} in a new tab`);
    toolbar.append(back, forward, reload, address);
    frame.root.insertBefore(toolbar, frame.body);
    frame.body.className = "sr-browser-body";
    const placeholder = document.createElement("div");
    placeholder.className = "sr-browser-loading";
    placeholder.textContent = "Loading page…";
    placeholder.setAttribute("role", "status");
    frame.body.appendChild(placeholder);

    super("BrowserWindow", frame.root, {
      ...options,
      width: options.width ?? options.size ?? 120,
      height: options.height ?? options.size ?? 65,
    });
    this.frame = frame;
    this.address = address;
    this.backButton = back;
    this.forwardButton = forward;
    this.placeholder = placeholder;
    this.source = options.url;
    this.label = label;
    this.interactive = options.interactive ?? true;

    back.addEventListener("click", () => {
      back.blur();
      this.navigate("back");
    });
    forward.addEventListener("click", () => {
      forward.blur();
      this.navigate("forward");
    });
    reload.addEventListener("click", () => {
      reload.blur();
      this.reload();
    });
    toolbar.addEventListener("click", (event) => event.stopPropagation());
    toolbar.addEventListener("keydown", (event) => event.stopPropagation());
    this.onActivate(() => this.syncPage());
    this.onUpdate(() => this.syncPage());
    this.onDeactivate(() => this.releasePage());
    this.onUnmount(() => this.releasePage());
  }

  get url(): string {
    return this.source;
  }

  set url(value: string) {
    const url = resolvePageURL(value);
    this.source = value;
    this.setAddress(value, url);
  }

  get title(): string {
    return this.label;
  }

  set title(value: string) {
    this.label = value;
    this.frame.setTitle(value);
    if (this.iframe) this.iframe.title = value;
  }

  reload(): void {
    this.releasePage();
    this.syncPage();
  }

  /** @internal */
  _resetOnBackwardNavigation(): void {
    // The stage has restored url. Activation/update creates exactly one fresh frame.
    this.releasePage();
  }

  private syncPage(): void {
    if (!this.isActive) return;
    const url = resolvePageURL(this.source);
    if (this.iframe && this.loadedURL === url) return;
    this.releasePage();
    const iframe = document.createElement("iframe");
    iframe.className = "sr-browser-page";
    iframe.title = this.label;
    iframe.style.visibility = "hidden";
    if (!this.interactive) {
      iframe.inert = true;
      iframe.tabIndex = -1;
      iframe.style.pointerEvents = "none";
    }
    iframe.addEventListener("load", () => {
      if (this.iframe !== iframe) return;
      this.attachNavigation();
      iframe.style.visibility = "visible";
      this.placeholder.hidden = true;
      this.frame.body.setAttribute("aria-busy", "false");
    });
    iframe.src = url;
    this.iframe = iframe;
    this.loadedURL = url;
    this.frame.body.setAttribute("aria-busy", "true");
    this.frame.body.appendChild(iframe);
  }

  private pageNavigation(): PageNavigation | null {
    try {
      return (
        (this.iframe?.contentWindow as (Window & { navigation?: PageNavigation }) | null)
          ?.navigation ?? null
      );
    } catch {
      // Cross-origin frames do not expose their navigation API.
      return null;
    }
  }

  private setAddress(value: string, url: string): void {
    this.address.textContent = value;
    this.address.href = url;
    this.address.setAttribute("aria-label", `Open ${value} in a new tab`);
  }

  private syncAddress(): void {
    let value = this.source;
    try {
      const current = this.iframe?.contentWindow?.location.href;
      if (current && /^https?:/.test(current)) value = current;
    } catch {
      // Cross-origin frames do not expose their current URL.
    }
    this.setAddress(value, resolvePageURL(value));
  }

  private syncNavigation(): void {
    this.syncAddress();
    const navigation = this.pageNavigation();
    this.backButton.disabled = !navigation?.canGoBack;
    this.forwardButton.disabled = !navigation?.canGoForward;
  }

  private attachNavigation(): void {
    this.removeNavigationListeners?.();
    this.removeNavigationListeners = null;
    const navigation = this.pageNavigation();
    if (navigation) {
      const sync = () => this.syncNavigation();
      navigation.addEventListener("currententrychange", sync);
      navigation.addEventListener("navigatesuccess", sync);
      this.removeNavigationListeners = () => {
        navigation.removeEventListener("currententrychange", sync);
        navigation.removeEventListener("navigatesuccess", sync);
      };
    }
    this.syncNavigation();
  }

  private navigate(direction: "back" | "forward"): void {
    const navigation = this.pageNavigation();
    if (!navigation || !(direction === "back" ? navigation.canGoBack : navigation.canGoForward)) {
      return;
    }
    try {
      const result = navigation[direction]();
      void Promise.all([result.committed, result.finished]).catch(() => this.syncNavigation());
    } catch {
      this.syncNavigation();
    }
  }

  private releasePage(): void {
    this.removeNavigationListeners?.();
    this.removeNavigationListeners = null;
    this.iframe?.remove();
    this.iframe = null;
    this.loadedURL = null;
    this.syncNavigation();
    this.placeholder.hidden = false;
    this.frame.body.setAttribute("aria-busy", "false");
  }
}

/** Creates an interactive webpage in a browser window. @category Components */
export function BrowserWindow(options: BrowserWindowOptions): BrowserWindowElement {
  return mount(new BrowserWindowElementImpl(options));
}
