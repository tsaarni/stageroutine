---
sidebar_position: 1
---

# Getting Started

## Installation

```bash
npm install stageroutine
# or
pnpm add stageroutine
# or
yarn add stageroutine
```

## Basic Usage

### 1. Create a Stage

```typescript
import { Stage } from 'stageroutine';

const stage = new Stage({
  steps: [
    {
      duration: 1000,
      render: (progress) => {
        // progress is 0..1
        console.log(`Step 1: ${Math.round(progress * 100)}%`);
      },
    },
  ],
});
```

### 2. Play the Animation

```typescript
stage.play();
```

### 3. Control Playback

```typescript
// Pause
stage.pause();

// Resume
stage.resume();

// Go to specific step
stage.goTo(0);
```

## Using Decorators

Decorators add visual effects to your stages:

```typescript
import { Stage, Vignette, Grain } from 'stageroutine';

const stage = new Stage({
  decorators: [
    new Vignette({ intensity: 0.5 }),
    new Grain({ opacity: 0.1 }),
  ],
  steps: [/* ... */],
});
```

## Next Steps

- [Configuration](./configuration) — learn about all available options
- [API Reference](../api/) — detailed API docs
