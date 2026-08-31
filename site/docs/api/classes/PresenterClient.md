# Class: PresenterClient

Client for synchronizing presenter view with the main presentation window via BroadcastChannel.

## Constructors

### Constructor

> **new PresenterClient**(): `PresenterClient`

#### Returns

`PresenterClient`

## Methods

### gotoScene()

> **gotoScene**(`sceneIndex`: `number`): `void`

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `sceneIndex` | `number` |

#### Returns

`void`

***

### next()

> **next**(): `void`

#### Returns

`void`

***

### onUpdate()

> **onUpdate**(`callback`: (`msg`: `PresenterMessage`) => `void`): `void`

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `callback` | (`msg`: `PresenterMessage`) => `void` |

#### Returns

`void`

***

### prev()

> **prev**(): `void`

#### Returns

`void`
