type FilterContribution = (props: Readonly<Record<string, unknown>>) => string;
const contributions = new WeakMap<HTMLElement, FilterContribution[]>();

/** Effects contribute filters; the DOM renderer writes the composed result. */
export function addFilterContribution(node: HTMLElement, render: FilterContribution): void {
  const entries = contributions.get(node) ?? [];
  entries.push(render);
  contributions.set(node, entries);
}

/** Blur and brightness apply first, followed by effects in attachment order. */
export function renderElementFilters(
  node: HTMLElement,
  props: Readonly<Record<string, unknown>>,
): void {
  const filters: string[] = [];
  const blur = (props.blur as number) ?? 0;
  const brightness = (props.brightness as number) ?? 1;
  if (blur > 0) filters.push(`blur(${blur}px)`);
  if (brightness !== 1) filters.push(`brightness(${brightness})`);
  for (const render of contributions.get(node) ?? []) {
    const filter = render(props);
    if (filter) filters.push(filter);
  }
  if (filters.length > 0) node.style.filter = filters.join(" ");
  else node.style.removeProperty("filter");
}
