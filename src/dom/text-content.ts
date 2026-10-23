/** Text layers share the stage clock and disappear when a transition settles. */
export function createTextContent(node: Text) {
  let layers:
    | {
        root: HTMLSpanElement;
        outgoing: HTMLSpanElement;
        incoming: HTMLSpanElement;
        from: string;
        to: string;
      }
    | undefined;
  function clear() {
    if (!layers) return;
    layers.root.replaceWith(node);
    layers = undefined;
  }
  return {
    get value() {
      return node.data;
    },
    set value(value: string) {
      clear();
      node.data = value;
    },
    clear,
    render(from: unknown, to: unknown, progress: number) {
      const source = String(from ?? "");
      const destination = String(to ?? "");
      const blend = Math.max(0, Math.min(1, progress));
      if (blend === 0 || blend === 1 || source === destination) {
        clear();
        return;
      }
      if (!layers || layers.from !== source || layers.to !== destination) {
        clear();
        if (!node.parentNode) return;
        const root = document.createElement("span");
        root.className = "sr-text-transition";
        const outgoing = document.createElement("span");
        outgoing.setAttribute("aria-hidden", "true");
        const incoming = document.createElement("span");
        incoming.textContent = destination;
        node.replaceWith(root);
        outgoing.appendChild(node);
        root.append(outgoing, incoming);
        layers = { root, outgoing, incoming, from: source, to: destination };
      }
      layers.outgoing.style.opacity = String(1 - blend);
      layers.incoming.style.opacity = String(blend);
    },
  };
}
