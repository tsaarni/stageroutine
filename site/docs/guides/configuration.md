---
sidebar_position: 2
---

# Configuration

## Stage Options

```typescript
interface StageOptions {
  /** Animation steps */
  steps: Step[];

  /** Visual decorators */
  decorators?: Decorator[];

  /** Auto-play on creation */
  autoPlay?: boolean;

  /** Loop the animation */
  loop?: boolean;
}
```

## Step Options

```typescript
interface Step {
  /** Duration in milliseconds */
  duration: number;

  /** Render function called each frame */
  render: (progress: number) => void;

  /** Optional easing function */
  easing?: (t: number) => number;
}
```

## Decorators

Decorators add visual effects that persist across steps:

| Decorator | Description |
|-----------|-------------|
| `Vignette` | Darkens edges of the viewport |
| `Grain` | Adds film grain effect |
| `Glow` | Adds glow effect to elements |
| `Gradient` | Animated gradient backgrounds |

### Example

```typescript
import { Stage, Vignette, Grain } from 'stageroutine';

const stage = new Stage({
  decorators: [
    new Vignette({ intensity: 0.5 }),
    new Grain({ opacity: 0.1 }),
  ],
  steps: [
    { duration: 1000, render: (t) => { /* ... */ } },
  ],
});
```
