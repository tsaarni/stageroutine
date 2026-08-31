# Interface: ScrimOptions

Configuration options for the background scrim underlay decorator.

## Properties

| Property | Type | Description |
| ------ | ------ | ------ |
| <a id="blur"></a> `blur?` | `number` | Optional backdrop blur in pixels behind the scrim (default: 0). |
| <a id="color"></a> `color?` | `string` | Color of the radial dark aura (default: "#09090b"). |
| <a id="opacity"></a> `opacity?` | `number` | Background darkness opacity from 0 to 1 (default: 0.85). |
| <a id="spread"></a> `spread?` | \{ `x`: `number`; `y`: `number`; \} \| `"tight"` \| `"medium"` \| `"wide"` | Horizontal and vertical expansion/spread factor (default: "medium"). |
