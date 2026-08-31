# Class: Stage

Presentation director managing scenes, step transitions, snapshots, and the virtual viewport.

## Implements

- `ElementHost`

## Constructors

### Constructor

> **new Stage**(`options?`: [`StageOptions`](../interfaces/StageOptions.md)): `Stage`

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `options` | [`StageOptions`](../interfaces/StageOptions.md) |

#### Returns

`Stage`

## Properties

| Property | Type |
| ------ | ------ |
| <a id="metrics"></a> `metrics` | `MetricRegistry` |

## Accessors

### laserActive

#### Get Signature

> **get** **laserActive**(): `boolean`

##### Returns

`boolean`

#### Set Signature

> **set** **laserActive**(`active`: `boolean`): `void`

##### Parameters

| Parameter | Type |
| ------ | ------ |
| `active` | `boolean` |

##### Returns

`void`

***

### pointerActive

#### Get Signature

> **get** **pointerActive**(): `boolean`

##### Returns

`boolean`

#### Set Signature

> **set** **pointerActive**(`active`: `boolean`): `void`

##### Parameters

| Parameter | Type |
| ------ | ------ |
| `active` | `boolean` |

##### Returns

`void`

## Methods

### \_setActiveScene()

> **\_setActiveScene**(`name`: `string`, `elements`: [`ReactiveElementBase`](../interfaces/ReactiveElementBase.md)[]): `void`

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `name` | `string` |
| `elements` | [`ReactiveElementBase`](../interfaces/ReactiveElementBase.md)[] |

#### Returns

`void`

***

### background()

> **background**(`bg`: `string` \| [`ReactiveElementBase`](../interfaces/ReactiveElementBase.md) \| [`Background`](../interfaces/Background.md)): `this`

Sets the stage background (color string, gradient, or procedural element).

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `bg` | `string` \| [`ReactiveElementBase`](../interfaces/ReactiveElementBase.md) \| [`Background`](../interfaces/Background.md) |

#### Returns

`this`

#### Example

```ts
stage.background("#0f172a");
stage.background(new Starfield());
```

***

### emit()

> **emit**\<`K` *extends* keyof `StageEventMap`\>(`event`: `K`, `data`: `StageEventMap`\[`K`\]): `void`

#### Type Parameters

| Type Parameter |
| ------ |
| `K` *extends* keyof `StageEventMap` |

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `event` | `K` |
| `data` | `StageEventMap`\[`K`\] |

#### Returns

`void`

***

### getCurrentPropertyValue()

> **getCurrentPropertyValue**(`elementId`: `string`, `property`: `string`): `unknown`

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `elementId` | `string` |
| `property` | `string` |

#### Returns

`unknown`

#### Implementation of

`ElementHost.getCurrentPropertyValue`

***

### gotoScene()

> **gotoScene**(`sceneIndex`: `number`): `void`

Jump to a specific scene by 0-indexed scene number.
Restores the recorded state of the first step of that scene.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `sceneIndex` | `number` |

#### Returns

`void`

***

### isMounted()

> **isMounted**(): `boolean`

#### Returns

`boolean`

***

### mount()

> **mount**(`target?`: `string` \| `HTMLElement`): `this`

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `target?` | `string` \| `HTMLElement` |

#### Returns

`this`

***

### next()

> **next**(): `void`

#### Returns

`void`

***

### on()

> **on**\<`K` *extends* keyof `StageEventMap`\>(`event`: `K`, `handler`: (`data`: `StageEventMap`\[`K`\]) => `void`): () => `void`

#### Type Parameters

| Type Parameter |
| ------ |
| `K` *extends* keyof `StageEventMap` |

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `event` | `K` |
| `handler` | (`data`: `StageEventMap`\[`K`\]) => `void` |

#### Returns

() => `void`

***

### pause()

> **pause**(): `void`

#### Returns

`void`

***

### prev()

> **prev**(): `void`

#### Returns

`void`

***

### recordAction()

> **recordAction**(`action`: () => `void`): `void`

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `action` | () => `void` |

#### Returns

`void`

***

### recordMutation()

> **recordMutation**(`elementId`: `string`, `property`: `string`, `from`: `unknown`, `to`: `unknown`, `durationMs`: `number`, `delayMs`: `number`, `curve`: [`EaseCurve`](../type-aliases/EaseCurve.md), `triggerElementId?`: `string`, `triggerMilestone?`: `AnimationMilestone`, `triggerProperty?`: `string`): `void`

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `elementId` | `string` |
| `property` | `string` |
| `from` | `unknown` |
| `to` | `unknown` |
| `durationMs` | `number` |
| `delayMs` | `number` |
| `curve` | [`EaseCurve`](../type-aliases/EaseCurve.md) |
| `triggerElementId?` | `string` |
| `triggerMilestone?` | `AnimationMilestone` |
| `triggerProperty?` | `string` |

#### Returns

`void`

#### Implementation of

`ElementHost.recordMutation`

***

### registerElement()

> **registerElement**\<`T` *extends* [`ReactiveElementBase`](../interfaces/ReactiveElementBase.md)\>(`element`: `T`): `T`

#### Type Parameters

| Type Parameter |
| ------ |
| `T` *extends* [`ReactiveElementBase`](../interfaces/ReactiveElementBase.md) |

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `element` | `T` |

#### Returns

`T`

***

### registerPendingFlush()

> **registerPendingFlush**(`flush`: () => `void`): () => `void`

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `flush` | () => `void` |

#### Returns

() => `void`

***

### scene()

> **scene**(`name`: `string`): `SceneBuilder`

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `name` | `string` |

#### Returns

`SceneBuilder`

***

### setCurrentPropertyValue()

> **setCurrentPropertyValue**(`elementId`: `string`, `property`: `string`, `value`: `unknown`): `void`

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `elementId` | `string` |
| `property` | `string` |
| `value` | `unknown` |

#### Returns

`void`

#### Implementation of

`ElementHost.setCurrentPropertyValue`

***

### setNotes()

> **setNotes**(`text`: `string` \| `string`[]): `void`

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `text` | `string` \| `string`[] |

#### Returns

`void`

***

### theme()

> **theme**(`config`: [`ThemeConfig`](../interfaces/ThemeConfig.md)): `this`

Apply global or per-scene theme variable overrides.
Updates CSS custom properties on the stage container and preserves them across step snapshots.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `config` | [`ThemeConfig`](../interfaces/ThemeConfig.md) |

#### Returns

`this`

#### Example

```ts
stage.theme({
  background: "#0f172a",
  surface: "#1e293b",
  surfaceBorder: "1px solid #334155",
  text: "#f8fafc",
});
```

***

### usePointer()

> **usePointer**(`pointer`: `PointerPlugin`): `this`

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `pointer` | `PointerPlugin` |

#### Returns

`this`
