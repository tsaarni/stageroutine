# Function: crossfade()

> **crossfade**(`fromElement`: [`ReactiveElementBase`](../interfaces/ReactiveElementBase.md) \| [`DOMElement`](../classes/DOMElement.md), `toElement`: [`ReactiveElementBase`](../interfaces/ReactiveElementBase.md) \| [`DOMElement`](../classes/DOMElement.md), `options?`: [`CrossfadeOptions`](../interfaces/CrossfadeOptions.md)): `CrossfadeBuilder`

Creates an asymmetric phase swap between two elements in place.
Outgoing element exits quickly; incoming element enters smoothly with zero text double-vision.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `fromElement` | [`ReactiveElementBase`](../interfaces/ReactiveElementBase.md) \| [`DOMElement`](../classes/DOMElement.md) |
| `toElement` | [`ReactiveElementBase`](../interfaces/ReactiveElementBase.md) \| [`DOMElement`](../classes/DOMElement.md) |
| `options?` | [`CrossfadeOptions`](../interfaces/CrossfadeOptions.md) |

## Returns

`CrossfadeBuilder`
