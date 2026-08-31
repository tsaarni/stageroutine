# Interface: BracketOptions

Configuration options for the grouping bracket decorator.

## Properties

| Property | Type | Description |
| ------ | ------ | ------ |
| <a id="classname"></a> `className?` | `string` | Additional CSS class name. |
| <a id="color"></a> `color?` | `string` | Solid stroke color (default: "rgba(255, 255, 255, 0.25)"). |
| <a id="dashed"></a> `dashed?` | `boolean` | Dashed stroke pattern. |
| <a id="depth"></a> `depth?` | `number` | Bracket depth / breadth in pixels (default: 16). |
| <a id="dotted"></a> `dotted?` | `boolean` | Dotted stroke pattern. |
| <a id="glow"></a> `glow?` | `string` \| `boolean` | Whether the bracket emits a neon bloom glow (default: false). |
| <a id="label"></a> `label?` | `string` | Optional label text placed at the bracket apex/center. |
| <a id="offset"></a> `offset?` | `number` | Spacing distance between element border and bracket in pixels (default: 8). |
| <a id="radius"></a> `radius?` | `number` | Corner radius / curvature in pixels (default: 8). |
| <a id="side"></a> `side?` | `"top"` \| `"bottom"` \| `"left"` \| `"right"` | Which side the bracket sits on ("left" | "right" | "top" | "bottom", default: "left"). |
| <a id="strokewidth"></a> `strokeWidth?` | `number` | Bracket stroke thickness in pixels (default: 1.5). |
| <a id="style"></a> `style?` | [`BracketStyle`](../type-aliases/BracketStyle.md) | Bracket style: "curly" (default), "square", "round", or "corners". |
