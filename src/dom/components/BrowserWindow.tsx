import "./TerminalBlock.css";
import "./BrowserWindow.css";
import { DOMElement, type ElementOptions, mount } from "../element";
import { createTerminalFrame, type TerminalFrame } from "./terminal-chrome";

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

/** @internal */
class BrowserWindowElementImpl extends DOMElement implements BrowserWindowElement {
  static override _reactiveKeys: ReadonlySet<string> = new Set([
    ...DOMElement._reactiveKeys,
    "url",
    "title",
  ]);

  private readonly frame: TerminalFrame;
  private readonly address: HTMLAnchorElement;
  private readonly placeholder: HTMLDivElement;
  private readonly interactive: boolean;
  private iframe: HTMLIFrameElement | null = null;
  private loadedURL: string | null = null;
  private source: string;
  private label: string;

  constructor(options: BrowserWindowOptions) {
    const url = resolvePageURL(options.url);
    const label = options.title ?? "Browser";
    const frame = createTerminalFrame({ title: label, className: "sr-browser-window" });
    const toolbar = document.createElement("div");
    toolbar.className = "sr-browser-toolbar";
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
    address.title = "Open configured page in a new tab";
    address.setAttribute("aria-label", `Open ${options.url} in a new tab`);
    toolbar.append(reload, address);
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
    this.placeholder = placeholder;
    this.source = options.url;
    this.label = label;
    this.interactive = options.interactive ?? true;

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
    this.address.textContent = value;
    this.address.href = url;
    this.address.setAttribute("aria-label", `Open ${value} in a new tab`);
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

  private releasePage(): void {
    this.iframe?.remove();
    this.iframe = null;
    this.loadedURL = null;
    this.placeholder.hidden = false;
    this.frame.body.setAttribute("aria-busy", "false");
  }
}

/** Creates an interactive webpage in a browser window. @category Components */
export function BrowserWindow(options: BrowserWindowOptions): BrowserWindowElement {
  return mount(new BrowserWindowElementImpl(options));
}
