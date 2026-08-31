# Type Alias: TypewriterStep

> **TypewriterStep** = `string` \| \{ `speed?`: `number`; `text`: `string`; \} \| \{ `delete`: `number`; `pause?`: `number`; `speed?`: `number`; \} \| \{ `pause`: `number`; \}

Represents an individual action in a structured typewriter script:
- `string`: Types out the text at default speed.
- `{ text: string; speed?: number }`: Types out text at an optional custom per-character speed in seconds.
- `{ delete: number; pause?: number; speed?: number }`: Backspaces `delete` count of characters after an optional `pause` in seconds, with optional backspace `speed` in seconds.
- `{ pause: number }`: Pauses typing for a given duration in seconds.

All time durations across typewriter steps are expressed in **seconds** (float).
