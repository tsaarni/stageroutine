# Function: to()

> **to**\<`T`\>(`target`: `T`): `TransitionDescriptor`\<`UnwrapTransition`\<`T`\>\>

Creates a fluent transition modifier.
e.g. `card.x = to(200).duration(1.5).ease("quartOut")`

## Type Parameters

| Type Parameter |
| ------ |
| `T` |

## Parameters

| Parameter | Type |
| ------ | ------ |
| `target` | `T` |

## Returns

`TransitionDescriptor`\<`UnwrapTransition`\<`T`\>\>
