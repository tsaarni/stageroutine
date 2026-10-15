/*
 * Component authoring: keep transforms on the outer container and put painted
 * fills, borders, and content on visual layers when a child uses backdrop-filter.
 * Ancestor opacity below 1 blocks sampling outside that ancestor. Fade the
 * filtered layer itself; changing only its background alpha does not fade blur.
 * This applies to any component or decorator, regardless of its shape or mask.
 *
 * Route snapshot opacity through applyDOMOpacity. Preserve each layer's own
 * opacity separately so repeated updates and backward navigation do not compound it.
 * Discover filters after mounting (to include CSS rules) and after decoration.
 * If custom code adds backdrop layers later, call discoverBackdropLayers again.
 *
 * Ancestor masks, clips, and filters can still bound backdrop sampling. Frame's
 * content mask intentionally does this. Layer fading does not remove that boundary.
 * Do not restore blur by cloning nodes or forcing layout at fade completion:
 * neither fixes blur during the fade. Regression coverage: transparency.spec.ts.
 */

type OpacityNode = HTMLElement | SVGElement;

interface LayerOpacity {
  base: string;
  rendered: string;
  needsComputedBase: boolean;
}

const layers = new WeakMap<OpacityNode, LayerOpacity>();
const containers = new WeakMap<OpacityNode, number>();

/** Keep backdrop containers opaque and distribute opacity to their visual layers. */
export function enableLayerOpacity(node: OpacityNode): void {
  containers.set(node, 1);
}

/** Discover backdrop layers at mount or after decoration, outside animation ticks. */
export function discoverBackdropLayers(root: OpacityNode): void {
  for (const child of root.querySelectorAll("*")) {
    if (!(child instanceof HTMLElement || child instanceof SVGElement)) continue;
    const filter = child.isConnected
      ? getComputedStyle(child).backdropFilter
      : child.style.backdropFilter;
    if (!filter || filter === "none") continue;
    let ancestor = child.parentElement;
    while (ancestor && (ancestor === root || root.contains(ancestor))) {
      if (!containers.has(ancestor)) enableLayerOpacity(ancestor);
      // Give raw text its own layer when its sibling uses backdrop filtering.
      for (const node of Array.from(ancestor.childNodes)) {
        if (node.nodeType === Node.TEXT_NODE && node.textContent?.trim()) {
          const span = document.createElement("span");
          node.replaceWith(span);
          span.appendChild(node);
        }
      }
      if (ancestor === root) break;
      ancestor = ancestor.parentElement;
    }
  }
  refreshLayerOpacity(root);
}

/** Whether opacity belongs on visual layers instead of this node. */
export function usesLayerOpacity(node: OpacityNode): boolean {
  return containers.has(node);
}

function paintOpacity(node: OpacityNode, inherited: number): void {
  let layer = layers.get(node);
  if (!layer) {
    layer = { base: node.style.opacity, rendered: node.style.opacity, needsComputedBase: true };
    layers.set(node, layer);
  }
  if (node.style.opacity !== layer.rendered) {
    layer.base = node.style.opacity;
    layer.needsComputedBase = true;
  }
  if (layer.needsComputedBase && node.isConnected) {
    // Read author CSS before replacing opacity with the multiplied value.
    node.style.opacity = layer.base;
    layer.base = getComputedStyle(node).opacity || "1";
    layer.needsComputedBase = false;
  }
  if (containers.has(node)) {
    const opacity = Number(layer.base || 1) * inherited;
    containers.set(node, opacity);
    node.style.opacity = "1";
    for (const child of node.children) {
      if (child instanceof HTMLElement || child instanceof SVGElement) {
        paintOpacity(child, opacity);
      }
    }
  } else {
    node.style.opacity =
      inherited === 1 ? layer.base : `calc((${layer.base || "1"}) * ${inherited})`;
  }
  layer.rendered = node.style.opacity;
}

/** Render a snapshot opacity (default 1), preserving each child layer's own opacity. */
export function applyDOMOpacity(node: OpacityNode, opacity: number): void {
  layers.set(node, {
    base: String(opacity),
    rendered: node.style.opacity,
    needsComputedBase: false,
  });
  paintOpacity(node, containers.get(node.parentElement as OpacityNode) ?? 1);
}

/** Include newly added visual layers without changing the container's snapshot opacity. */
export function refreshLayerOpacity(node: OpacityNode): void {
  if (containers.has(node)) {
    paintOpacity(node, containers.get(node.parentElement as OpacityNode) ?? 1);
  }
}
