/**
 * Ambient type declarations for Vite client features and CSS modules.
 */

/// <reference types="vite/client" />

declare module "*.module.css" {
  const classes: { readonly [key: string]: string };
  export default classes;
}

declare module "~icons/*" {
  import type { IconElement, IconOptions } from "./dom/components/Icon";
  const iconFactory: (options?: IconOptions) => IconElement;
  export default iconFactory;
}
