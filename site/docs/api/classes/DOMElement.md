# Class: DOMElement

Base reactive element wrapper around an HTML/SVG DOM node on the presentation stage.

## Implements

- [`ReactiveElementBase`](../interfaces/ReactiveElementBase.md)

## Constructors

### Constructor

> **new DOMElement**(`kind`: `string`, `html`: `string` \| `HTMLElement` \| `DocumentFragment` \| `SVGElement` \| `DOMElement`, `options?`: [`ElementOptions`](../interfaces/ElementOptions.md)): `DOMElement`

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `kind` | `string` |
| `html` | `string` \| `HTMLElement` \| `DocumentFragment` \| `SVGElement` \| `DOMElement` |
| `options` | [`ElementOptions`](../interfaces/ElementOptions.md) |

#### Returns

`DOMElement`

## Properties

| Property | Type | Default value |
| ------ | ------ | ------ |
| <a id="anchor"></a> `anchor` | `ElementAnchor` | `undefined` |
| <a id="blur"></a> `blur` | `ReactiveProp`\<`number`\> | `0` |
| <a id="brightness"></a> `brightness` | `ReactiveProp`\<`number`\> | `1` |
| <a id="color"></a> `color?` | `ReactiveProp`\<`string`\> | `undefined` |
| <a id="domelement"></a> `domElement` | `HTMLElement` | `undefined` |
| <a id="height"></a> `height?` | `ReactiveProp`\<`string` \| `number`\> | `undefined` |
| <a id="id"></a> `id` | `string` | `undefined` |
| <a id="kind"></a> `kind` | `string` | `undefined` |
| <a id="opacity"></a> `opacity` | `ReactiveProp`\<`number`\> | `1` |
| <a id="rotation"></a> `rotation` | `ReactiveProp`\<`number`\> | `0` |
| <a id="scale"></a> `scale` | `ReactiveProp`\<`number`\> | `1` |
| <a id="size"></a> `size?` | `ReactiveProp`\<`string` \| `number`\> | `undefined` |
| <a id="width"></a> `width?` | `ReactiveProp`\<`string` \| `number`\> | `undefined` |
| <a id="x"></a> `x` | `ReactiveProp`\<`string` \| `number`\> | `0` |
| <a id="y"></a> `y` | `ReactiveProp`\<`string` \| `number`\> | `0` |

## Methods

### decorate()

> **decorate**(`decorator`: [`ElementDecorator`](../type-aliases/ElementDecorator.md)): `this`

Applies a decorator function to enhance this element with custom styles, animations, or behaviors.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `decorator` | [`ElementDecorator`](../type-aliases/ElementDecorator.md) |

#### Returns

`this`

***

### onClick()

> **onClick**(`handler`: (`event`: `MouseEvent`) => `void`): `this`

Registers a click interaction handler on this element.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `handler` | (`event`: `MouseEvent`) => `void` |

#### Returns

`this`

#### Implementation of

[`ReactiveElementBase`](../interfaces/ReactiveElementBase.md).[`onClick`](../interfaces/ReactiveElementBase.md#onclick)

***

### onPause()

> **onPause**(`fn`: () => `void`): () => `void`

Registers a callback triggered whenever this element enters paused state.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `fn` | () => `void` |

#### Returns

() => `void`

***

### onPlay()

> **onPlay**(`fn`: () => `void`): () => `void`

Registers a callback triggered whenever this element enters active playback state.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `fn` | () => `void` |

#### Returns

() => `void`

***

### pause()

> **pause**(): `void`

Pauses all CSS and Web Animations running on this element and its subtree to save CPU/GPU cycles.

#### Returns

`void`

#### Implementation of

[`ReactiveElementBase`](../interfaces/ReactiveElementBase.md).[`pause`](../interfaces/ReactiveElementBase.md#pause)

***

### play()

> **play**(): `void`

Resumes all CSS and Web Animations running on this element and its subtree.

#### Returns

`void`

#### Implementation of

[`ReactiveElementBase`](../interfaces/ReactiveElementBase.md).[`play`](../interfaces/ReactiveElementBase.md#play)
