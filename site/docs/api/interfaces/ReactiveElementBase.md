# Interface: ReactiveElementBase

Base interface for all reactive presentation elements on stage.

## Properties

| Property | Type |
| ------ | ------ |
| <a id="anchor"></a> `anchor?` | `ReactiveProp`\<`ElementAnchor`\> |
| <a id="blur"></a> `blur` | `ReactiveProp`\<`number`\> |
| <a id="brightness"></a> `brightness` | `ReactiveProp`\<`number`\> |
| <a id="color"></a> `color?` | `ReactiveProp`\<`string`\> |
| <a id="domelement"></a> `domElement` | `HTMLElement` |
| <a id="id"></a> `id` | `string` |
| <a id="kind"></a> `kind` | `string` |
| <a id="opacity"></a> `opacity` | `ReactiveProp`\<`number`\> |
| <a id="rotation"></a> `rotation` | `ReactiveProp`\<`number`\> |
| <a id="scale"></a> `scale` | `ReactiveProp`\<`number`\> |
| <a id="x"></a> `x` | `ReactiveProp`\<`string` \| `number`\> |
| <a id="y"></a> `y` | `ReactiveProp`\<`string` \| `number`\> |

## Methods

### onClick()?

> `optional` **onClick**(`handler`: (`event`: `MouseEvent`) => `void`): `this`

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `handler` | (`event`: `MouseEvent`) => `void` |

#### Returns

`this`

***

### pause()?

> `optional` **pause**(): `void`

#### Returns

`void`

***

### play()?

> `optional` **play**(): `void`

#### Returns

`void`
