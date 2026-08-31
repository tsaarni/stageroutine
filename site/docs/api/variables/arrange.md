# Variable: arrange

> `const` **arrange**: `object`

Layout helper providing procedural positioning engines (rows, columns, grids, splits, orbits).

## Type Declaration

| Name | Type | Description |
| ------ | ------ | ------ |
| `above()` | (`element`: `LayoutElement`, `target`: `LayoutElement`, `gap?`: `number`, `align?`: [`RelativeAlign`](../type-aliases/RelativeAlign.md)) => `void` | Positions an element above a target element, separated by `gap`. |
| `below()` | (`element`: `LayoutElement`, `target`: `LayoutElement`, `gap?`: `number`, `align?`: [`RelativeAlign`](../type-aliases/RelativeAlign.md)) => `void` | Positions an element below a target element, separated by `gap`. |
| `circle()` | (`elements`: `LayoutElement`[], `options?`: [`CircleLayoutOptions`](../interfaces/CircleLayoutOptions.md)) => `void` | Arranges elements in a circular orbit around a central point or anchor element. |
| `column()` | (`elements`: `LayoutElement`[], `options?`: [`LayoutOptions`](../interfaces/LayoutOptions.md)) => `ConnectorElement`[] | Arranges elements into a vertical column. Returns any created divider rules if options.rule is enabled. |
| `grid()` | (`elements`: `GridSlot`[] \| `GridSlot`[][], `options?`: [`LayoutOptions`](../interfaces/LayoutOptions.md)) => `void` | Arranges elements into a multi-column grid. Supports 2D row/column matrices (with `null` for empty slots) or flat 1D arrays with `cols`. |
| `leftOf()` | (`element`: `LayoutElement`, `target`: `LayoutElement`, `gap?`: `number`, `align?`: [`RelativeAlign`](../type-aliases/RelativeAlign.md)) => `void` | Positions an element to the left of a target element, separated by `gap`. |
| `rightOf()` | (`element`: `LayoutElement`, `target`: `LayoutElement`, `gap?`: `number`, `align?`: [`RelativeAlign`](../type-aliases/RelativeAlign.md)) => `void` | Positions an element to the right of a target element, separated by `gap`. |
| `row()` | (`elements`: `LayoutElement`[], `options?`: [`LayoutOptions`](../interfaces/LayoutOptions.md)) => `ConnectorElement`[] | Arranges elements into a horizontal row. Returns any created divider rules if options.rule is enabled. |
| `split()` | (`left`: `LayoutElement` \| `LayoutElement`[], `right`: `LayoutElement` \| `LayoutElement`[], `options?`: [`SplitLayoutOptions`](../interfaces/SplitLayoutOptions.md)) => `object` | Arranges two groups into a classic split slide layout (left column & right column). Returns the central column rule connector if options.rule is enabled. |
