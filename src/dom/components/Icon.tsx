/**
 * Standalone reactive Icon element for presentation slides and technical diagrams.
 */

import "./Icon.css";
import { getActiveStage } from "../../core/index";
import { DOMElement, type ElementOptions } from "../element";

/**
 * Definition for registering an icon namespace or resolver.
 * @category Components
 */
export interface IconDefinition {
  prefix: string;
  icons?: Record<string, string>;
  resolver?: (name: string) => string | undefined;
}

const iconRegistry = new Map<string, (name: string) => string | undefined>();

/**
 * Registers an icon set or custom SVG icons.
 *
 * @category Components
 * @example
 * ```ts
 * defineIcons({
 *   prefix: "brand",
 *   icons: {
 *     logo: "<svg ...>...</svg>",
 *   },
 * });
 * ```
 */
export function defineIcons(def: IconDefinition): void {
  if (def.icons) {
    const iconsMap = def.icons;
    iconRegistry.set(def.prefix, (name) => iconsMap[name]);
  } else if (def.resolver) {
    iconRegistry.set(def.prefix, def.resolver);
  }
}

/**
 * Resolves an icon name or raw SVG to an SVG string.
 */
export function resolveIconSvg(nameOrSvg: string): string | undefined {
  if (nameOrSvg.trim().startsWith("<svg") || nameOrSvg.includes("<svg")) {
    return nameOrSvg;
  }

  const colonIdx = nameOrSvg.indexOf(":");
  if (colonIdx === -1) {
    // Direct lookup across default or all registered prefixes
    const defaultResolver = iconRegistry.get("default");
    if (defaultResolver) {
      const res = defaultResolver(nameOrSvg);
      if (res) return res;
    }
    for (const resolver of iconRegistry.values()) {
      const res = resolver(nameOrSvg);
      if (res) return res;
    }
    return undefined;
  }

  const prefix = nameOrSvg.slice(0, colonIdx);
  const name = nameOrSvg.slice(colonIdx + 1);
  const resolver = iconRegistry.get(prefix);
  return resolver ? resolver(name) : undefined;
}

/**
 * Configuration options for the Icon component.
 * @category Components
 */
export interface IconOptions extends ElementOptions {
  /** Icon identifier (e.g. "lucide:heart", "mycompany:logo") or raw SVG markup. */
  name?: string;
  /** Force registration as top-level stage element. */
  asElement?: boolean;
}

/**
 * Reactive Icon element wrapping an SVG icon on the presentation stage.
 * @category Components
 */
export class IconElement extends DOMElement {
  private _name: string;

  get name(): string {
    return this._name;
  }

  set name(val: string) {
    this._name = val;
    this.updateSvg();
  }

  constructor(nameOrOptions: string | IconOptions = {}, maybeOptions: IconOptions = {}) {
    const options =
      typeof nameOrOptions === "string" ? { ...maybeOptions, name: nameOrOptions } : nameOrOptions;

    const container = document.createElement("div");
    const classes = ["sr-icon", options.className].filter(Boolean).join(" ");
    container.className = classes;

    const initialSize = options.size ?? options.width ?? options.height ?? 32;
    const formattedSize =
      typeof initialSize === "number" ? `${initialSize}px` : String(initialSize);
    container.style.width = formattedSize;
    container.style.height = formattedSize;

    const finalOptions: IconOptions = {
      size: initialSize,
      ...options,
    };

    if (options.color && typeof options.color === "string") {
      container.style.color = options.color;
    }

    super("Icon", container, finalOptions);

    const hasPlacement = options.x !== undefined || options.y !== undefined;
    if (!hasPlacement) {
      container.style.position = "relative";
      container.style.left = "auto";
      container.style.top = "auto";
      container.style.transform = "none";
    }

    this._name = options.name ?? "";
    this.updateSvg();
  }

  private updateSvg(): void {
    if (!this._name) {
      this.domElement.innerHTML = "";
      return;
    }

    const svg = resolveIconSvg(this._name);
    if (svg) {
      this.domElement.innerHTML = svg;
    } else {
      console.warn(`[StageRoutine] Icon "${this._name}" could not be resolved.`);
      this.domElement.innerHTML = `<svg viewBox="0 0 24 24" width="100%" height="100%"><rect width="24" height="24" fill="none" stroke="currentColor" stroke-dasharray="2 2" rx="4"/></svg>`;
    }
  }
}

/**
 * Creates a reactive Icon element on stage.
 *
 * @category Components
 * @example
 * ```ts
 * const heart = Icon("lucide:heart", {
 *   x: "center",
 *   y: 40,
 *   size: 48,
 *   color: "#f43f5e",
 * });
 * ```
 */
export function Icon(
  nameOrOptions: string | IconOptions = {},
  maybeOptions: IconOptions = {},
): IconElement {
  const options =
    typeof nameOrOptions === "string" ? { ...maybeOptions, name: nameOrOptions } : nameOrOptions;
  const stage = getActiveStage();
  const el = new IconElement(nameOrOptions, maybeOptions);
  const hasStagePlacement =
    options.x !== undefined ||
    options.y !== undefined ||
    options.id !== undefined ||
    options.asElement === true;

  if (hasStagePlacement && stage && typeof stage.registerElement === "function") {
    return stage.registerElement(el) as IconElement;
  }
  return el;
}
