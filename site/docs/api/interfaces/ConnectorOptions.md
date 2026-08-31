# Interface: ConnectorOptions

Configuration options for creating a reactive Connector between two elements or points.

## Extends

- `Omit`\<[`ElementOptions`](ElementOptions.md), `"style"`\>

## Properties

| Property | Type | Description |
| ------ | ------ | ------ |
| <a id="anchor"></a> `anchor?` | `ElementAnchor` | - |
| <a id="animated"></a> `animated?` | `boolean` | Alias for traveling animation. |
| <a id="blur"></a> `blur?` | `ReactiveProp`\<`number`\> | - |
| <a id="brightness"></a> `brightness?` | `ReactiveProp`\<`number`\> | - |
| <a id="classname"></a> `className?` | `string` | - |
| <a id="color"></a> `color?` | `string` | Stroke color of the connector line (defaults to #38bdf8). |
| <a id="curvature"></a> `curvature?` | `number` | Curvature bow factor for "arc" routing (defaults to 0.2). Positive bows outward, negative bows inward. |
| <a id="dashed"></a> `dashed?` | `boolean` | Whether the line is styled with dashed strokes. |
| <a id="dotted"></a> `dotted?` | `boolean` | Whether the line is styled with dotted strokes. |
| <a id="end"></a> `end?` | `ReactiveProp`\<`number`\> | Trim-path end offset from 0.0 to 1.0 (useful for draw-in transitions). |
| <a id="endhead"></a> `endHead?` | [`ConnectorHeadType`](../type-aliases/ConnectorHeadType.md) | Head marker at the end/destination endpoint (defaults to "arrow"). |
| <a id="endheadsize"></a> `endHeadSize?` | `number` | Size of the end head marker in virtual canvas pixels (defaults to 16). |
| <a id="fromanchor"></a> `fromAnchor?` | `"auto"` \| `CardinalSide` | Cardinal attachment face on the origin target ("auto" | "top" | "bottom" | "left" | "right"). |
| <a id="frompadding"></a> `fromPadding?` | `number` | Custom perimeter clearance at the origin card. |
| <a id="height"></a> `height?` | `ReactiveProp`\<`string` \| `number`\> | - |
| <a id="id"></a> `id?` | `string` | - |
| <a id="label"></a> `label?` | `string` | Optional text label rendered at the connector's midpoint or specified placement. |
| <a id="labeloffset"></a> `labelOffset?` | `ReactiveProp`\<`LabelOffset`\> | Responsive offset to nudge the label (\{ x, y \} in px, cqw, cqh, or rem). Reactive. |
| <a id="labeloffsetx"></a> `labelOffsetX?` | `ReactiveProp`\<`string` \| `number`\> | Horizontal offset for the label in virtual pixels or container units. Reactive. |
| <a id="labeloffsety"></a> `labelOffsetY?` | `ReactiveProp`\<`string` \| `number`\> | Vertical offset for the label in virtual pixels or container units. Reactive. |
| <a id="labelplacement"></a> `labelPlacement?` | `ReactiveProp`\<`LabelPlacement`\> | Position of the label along the path ("start" | "center" | "end" | 0..1 ratio). Reactive. |
| <a id="messagey"></a> `messageY?` | `ReactiveProp`\<`string` \| `number`\> | Vertical alignment Y coordinate for sequence diagram horizontal messages. |
| <a id="opacity"></a> `opacity?` | `ReactiveProp`\<`number`\> | - |
| <a id="padding"></a> `padding?` | `number` | Outer clearance padding around card perimeters in virtual pixels (defaults to 6). |
| <a id="periodicpulse"></a> `periodicPulse?` | `number` \| `boolean` \| `PeriodicPulseOptions` | Alias for pulseInterval. |
| <a id="pulseinterval"></a> `pulseInterval?` | `number` \| `PeriodicPulseOptions` | Continuous periodic pulse configuration or interval in seconds (e.g. 1.5 or \{ interval: 2.0, color: '#38bdf8' \}). |
| <a id="radius"></a> `radius?` | `number` | Corner radius for rounded box intersections (defaults to 12). |
| <a id="rotation"></a> `rotation?` | `ReactiveProp`\<`number`\> | - |
| <a id="routing"></a> `routing?` | `"straight"` \| `"corner"` \| `"bezier"` \| `"arc"` | Routing style: straight line, 90° orthogonal corners, smooth cubic Bézier, or single-curvature circular arc. |
| <a id="scale"></a> `scale?` | `ReactiveProp`\<`number`\> | - |
| <a id="size"></a> `size?` | `ReactiveProp`\<`string` \| `number`\> | - |
| <a id="start"></a> `start?` | `ReactiveProp`\<`number`\> | Trim-path start offset from 0.0 to 1.0 (useful for draw-in transitions). |
| <a id="starthead"></a> `startHead?` | [`ConnectorHeadType`](../type-aliases/ConnectorHeadType.md) | Head marker at the start/origin endpoint (defaults to "none"). |
| <a id="startheadsize"></a> `startHeadSize?` | `number` | Size of the start head marker in virtual canvas pixels (defaults to 16). |
| <a id="strokewidth"></a> `strokeWidth?` | `number` | Stroke width in virtual pixels (defaults to 3). |
| <a id="style"></a> `style?` | `Partial`\<`CSSStyleDeclaration`\> \| `"straight"` \| `"corner"` \| `"bezier"` \| `"arc"` | CSS style declaration or routing shortcut. |
| <a id="toanchor"></a> `toAnchor?` | `"auto"` \| `CardinalSide` | Cardinal attachment face on the destination target ("auto" | "top" | "bottom" | "left" | "right"). |
| <a id="topadding"></a> `toPadding?` | `number` | Custom perimeter clearance at the destination card. |
| <a id="traveling"></a> `traveling?` | `boolean` | Whether dotted strokes stream continuously in a traveling particle animation. |
| <a id="width"></a> `width?` | `ReactiveProp`\<`string` \| `number`\> | - |
| <a id="x"></a> `x?` | `ReactiveProp`\<`string` \| `number`\> | - |
| <a id="y"></a> `y?` | `ReactiveProp`\<`string` \| `number`\> | - |
