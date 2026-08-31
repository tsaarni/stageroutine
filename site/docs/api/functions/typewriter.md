# Function: typewriter()

> **typewriter**(`optionsOrScript?`: [`TypewriterOptions`](../interfaces/TypewriterOptions.md) \| [`TypewriterStep`](../type-aliases/TypewriterStep.md)[]): [`ElementDecorator`](../type-aliases/ElementDecorator.md)

Decorates an element with human-like, realistic typing cadence, typo corrections, and blinking cursor.

All duration and timing values are expressed in **seconds** (float).

## Parameters

| Parameter | Type |
| ------ | ------ |
| `optionsOrScript` | [`TypewriterOptions`](../interfaces/TypewriterOptions.md) \| [`TypewriterStep`](../type-aliases/TypewriterStep.md)[] |

## Returns

[`ElementDecorator`](../type-aliases/ElementDecorator.md)

## Example

```ts
// 1. Typing initial element text with entrance delay
heading.decorate(typewriter({ delay: 0.5 }));

// 2. Custom script with simulated typos, pauses, and backspacing
text.decorate(typewriter({
  delay: 0.6,
  script: [
    "Decorators can simulatte",
    { delete: 2 },
    "e realistic typing...",
  ],
}));

// 3. Passing a script array directly
label.decorate(typewriter([
  "Loading...",
  { pause: 0.5 },
  { delete: 10 },
  "Ready!",
]));
```
