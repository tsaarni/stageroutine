# Interface: CircleLayoutOptions

Options for orbital circular / elliptical layout arrangements.

## Properties

| Property | Type | Description |
| ------ | ------ | ------ |
| <a id="animate"></a> `animate?` | `boolean` | Whether to animate into the circular positions (default: false). |
| <a id="center"></a> `center?` | `LayoutElement` \| \{ `x`: `number`; `y`: `number`; \} | Center anchor point as \{ x, y \} or a center element. |
| <a id="centerelements"></a> `centerElements?` | `boolean` | Whether each element is centered on its orbit point (default: true). |
| <a id="centerx"></a> `centerX?` | `number` | Center X coordinate in stage cqw (default: 50). |
| <a id="centery"></a> `centerY?` | `number` | Center Y coordinate in stage cqh (default: 50). |
| <a id="duration"></a> `duration?` | `number` | Duration in seconds if animated (default: 0.6s). |
| <a id="flatten"></a> `flatten?` | `number` | Vertical squash factor, 0 = perfect circle, 1 = flat line (default: 0). |
| <a id="radius"></a> `radius?` | `number` | Horizontal orbit radius in cqw (default: 18). |
| <a id="span"></a> `span?` | `number` | Angular span in degrees (default: 360 for full circle). |
| <a id="startangle"></a> `startAngle?` | `number` | Starting angle in degrees (default: -90 for 12 o'clock top). |
