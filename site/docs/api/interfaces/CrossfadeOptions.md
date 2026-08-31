# Interface: CrossfadeOptions

Configuration options for asymmetric crossfade transitions between two elements.

## Properties

| Property | Type | Description |
| ------ | ------ | ------ |
| <a id="duration"></a> `duration?` | `number` | Total choreography duration in seconds (default: 0.5s). |
| <a id="ease"></a> `ease?` | [`BuiltinEase`](../type-aliases/BuiltinEase.md) \| [`EaseCurve`](../type-aliases/EaseCurve.md) | Easing curve for the incoming element (default: "quartOut"). |
| <a id="matchposition"></a> `matchPosition?` | `boolean` | Automatically match incoming element's (x, y) coordinates to outgoing element (default: true). |
| <a id="overlap"></a> `overlap?` | `number` | Overlap hand-off point as a fraction of exit progress (default: 0.55). |
| <a id="scale"></a> `scale?` | `number` \| `boolean` | Subtle depth scaling factor during swap (default: 0.96, or false to disable). |
