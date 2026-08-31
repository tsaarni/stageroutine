# Class: PresenterRecorder

In-browser screen recorder using MediaRecorder to capture and download presentation video.

## Constructors

### Constructor

> **new PresenterRecorder**(): `PresenterRecorder`

#### Returns

`PresenterRecorder`

## Methods

### getRecordingState()

> **getRecordingState**(): `object`

#### Returns

`object`

| Name | Type |
| ------ | ------ |
| `formattedTime` | `string` |
| `isMicEnabled` | `boolean` |
| `isRecording` | `boolean` |
| `seconds` | `number` |

***

### onUpdate()

> **onUpdate**(`callback`: (`state`: `object`) => `void`): `void`

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `callback` | (`state`: `object`) => `void` |

#### Returns

`void`

***

### start()

> **start**(): `Promise`\<`void`\>

#### Returns

`Promise`\<`void`\>

***

### stop()

> **stop**(): `void`

#### Returns

`void`

***

### toggle()

> **toggle**(): `void`

#### Returns

`void`

***

### toggleMic()

> **toggleMic**(): `void`

#### Returns

`void`
