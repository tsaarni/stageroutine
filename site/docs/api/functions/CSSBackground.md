# Function: CSSBackground()

> **CSSBackground**(`cssOrOptions?`: `string` \| [`CSSBackgroundOptions`](../interfaces/CSSBackgroundOptions.md)): `CSSBackgroundElement`

Creates a full-bleed CSS background supporting colors, gradients, and images.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `cssOrOptions` | `string` \| [`CSSBackgroundOptions`](../interfaces/CSSBackgroundOptions.md) |

## Returns

`CSSBackgroundElement`

## Example

```ts
CSSBackground("#0f172a");
CSSBackground("linear-gradient(135deg, #1e293b, #0f172a)");
CSSBackground("url('/wallpaper.jpg') center / cover no-repeat");
```
