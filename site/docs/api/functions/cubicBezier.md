# Function: cubicBezier()

> **cubicBezier**(`p1x`: `number`, `p1y`: `number`, `p2x`: `number`, `p2y`: `number`): [`EaseCurve`](../type-aliases/EaseCurve.md)

High-precision Cubic Bézier curve solver.
Solves B_x(t) = x for t via Newton-Raphson, then evaluates B_y(t).

## Parameters

| Parameter | Type |
| ------ | ------ |
| `p1x` | `number` |
| `p1y` | `number` |
| `p2x` | `number` |
| `p2y` | `number` |

## Returns

[`EaseCurve`](../type-aliases/EaseCurve.md)
