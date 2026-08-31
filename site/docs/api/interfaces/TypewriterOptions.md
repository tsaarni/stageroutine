# Interface: TypewriterOptions

Configuration options for the `typewriter` element decorator.
All time durations are expressed in **seconds** (float).

## Properties

| Property | Type | Description |
| ------ | ------ | ------ |
| <a id="cursor"></a> `cursor?` | `string` \| `false` | Cursor symbol to display while typing (default: `"▋"`, pass `false` to disable). |
| <a id="delay"></a> `delay?` | `number` | Initial delay in seconds before typing begins once the element becomes visible (default: `0`). |
| <a id="deletespeed"></a> `deleteSpeed?` | `number` | Default backspace deletion speed per character in seconds (default: `0.028`). |
| <a id="jitter"></a> `jitter?` | `number` | Jitter/randomness factor from 0 to 1 for humanized typing cadence (default: `0.35`). |
| <a id="mistakepause"></a> `mistakePause?` | `number` | Pause in seconds after noticing a mistake before backspacing (default: `0.3`). |
| <a id="punctuationpause"></a> `punctuationPause?` | `number` | Extra pause in seconds on punctuation characters like `.,!?` (default: `0.25`). |
| <a id="script"></a> `script?` | [`TypewriterStep`](../type-aliases/TypewriterStep.md)[] | Custom typing, backspacing, and pause steps. All time values in script steps are in **seconds** (float). |
| <a id="speed"></a> `speed?` | `number` | Default typing speed per character in seconds (default: `0.045`). |
