# Interface: ShapeOptions

Configuration options for the Shape, Card, Circle, Pill, and Diamond components.

## Extends

- [`ElementOptions`](ElementOptions.md)

## Properties

| Property | Type | Description |
| ------ | ------ | ------ |
| <a id="active"></a> `active?` | `boolean` | Highlighted / glowing active state. |
| <a id="align"></a> `align?` | `"center"` \| `"left"` \| `"right"` | Content alignment inside the shape container ("left" | "center" | "right"). |
| <a id="anchor"></a> `anchor?` | `ElementAnchor` | - |
| <a id="background"></a> `background?` | `string` | Background fill color. |
| <a id="blur"></a> `blur?` | `ReactiveProp`\<`number`\> | - |
| <a id="bordercolor"></a> `borderColor?` | `string` | Border stroke color. |
| <a id="brightness"></a> `brightness?` | `ReactiveProp`\<`number`\> | - |
| <a id="children"></a> `children?` | `unknown` | Optional child elements or text nodes. |
| <a id="classname"></a> `className?` | `string` | - |
| <a id="color"></a> `color?` | `string` | Foreground text / accent color. |
| <a id="doubleborder"></a> `doubleBorder?` | `boolean` | Double border outline (e.g. for final states, nested rings). |
| <a id="height"></a> `height?` | `string` \| `number` | Explicit height in pixels or container units. |
| <a id="id"></a> `id?` | `string` | - |
| <a id="kind"></a> `kind?` | [`ShapeKind`](../type-aliases/ShapeKind.md) | Geometric silhouette: "box" (default), "circle", "pill", or "diamond". |
| <a id="opacity"></a> `opacity?` | `ReactiveProp`\<`number`\> | - |
| <a id="rotation"></a> `rotation?` | `ReactiveProp`\<`number`\> | - |
| <a id="scale"></a> `scale?` | `ReactiveProp`\<`number`\> | - |
| <a id="size"></a> `size?` | `string` \| `number` | Uniform width and height shorthand (ideal for circles and diamonds). |
| <a id="style"></a> `style?` | `Partial`\<`CSSStyleDeclaration`\> | - |
| <a id="variant"></a> `variant?` | [`ShapeVariant`](../type-aliases/ShapeVariant.md) | Surface material preset: "surface" (glass card, default), "ghost" (outline), or "solid" (opaque fill). |
| <a id="width"></a> `width?` | `string` \| `number` | Explicit width in pixels or container units. |
| <a id="x"></a> `x?` | `ReactiveProp`\<`string` \| `number`\> | - |
| <a id="y"></a> `y?` | `ReactiveProp`\<`string` \| `number`\> | - |
