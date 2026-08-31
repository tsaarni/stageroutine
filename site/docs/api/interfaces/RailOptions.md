# Interface: RailOptions

Configuration options for the accent rail / keyline decorator.

## Properties

| Property | Type | Description |
| ------ | ------ | ------ |
| <a id="bracket"></a> `bracket?` | `number` \| `boolean` | Alias for `curve`. |
| <a id="classname"></a> `className?` | `string` | Additional CSS class name. |
| <a id="color"></a> `color?` | `string` | Solid accent color (default: "rgba(255, 255, 255, 0.2)"). |
| <a id="curve"></a> `curve?` | `number` \| `boolean` | Curves the rail around the adjacent top and bottom (or left and right) corners, creating a stylized bracket / corner-hugging accent. Pass `true` or an explicit bracket extension length in pixels (default: 20px). |
| <a id="glow"></a> `glow?` | `string` \| `boolean` | Whether the rail emits a subtle neon bloom glow (default: false). |
| <a id="gradient"></a> `gradient?` | `string`[] | Gradient color stops (e.g. ["#38bdf8", "#a855f7"]). Overrides color if provided. |
| <a id="inset"></a> `inset?` | `string` \| `number` | Inset offset from element edges in pixels (default: 0). |
| <a id="radius"></a> `radius?` | `string` \| `number` | Corner radius for the rail or curved corners in pixels (default: 10 when curved, 2 for straight rail). |
| <a id="side"></a> `side?` | `"top"` \| `"bottom"` \| `"left"` \| `"right"` | Which side the rail sits on ("left" | "right" | "top" | "bottom", default: "left"). |
| <a id="thickness"></a> `thickness?` | `string` \| `number` | Rail stroke thickness in pixels (default: 3). |
