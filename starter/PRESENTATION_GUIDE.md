# Creating presentations with StageRoutine

## Plan the explanation

- Infer the subject, purpose, audience knowledge, and scope from the request and supplied material. Ask only when missing information would materially change the result.
- Break the material into parts the audience can understand in sequence. Introduce required concepts before using them. Keep causes and consequences connected; compare alternatives using the same criteria.
- Choose a concrete example or visual demonstration for each difficult concept. Remove repetition and details that do not help explain the subject.
- Plan what appears, changes, and remains visible at each point. Carry familiar objects forward and transform the existing diagram as the explanation develops.
- Use scenes for changes of context and presenter pauses where the audience needs time to absorb a result. Let related actions unfold within a step.
- Keep visible text brief; put spoken explanation in notes.
- Proceed with the plan. Review the outline with the user if they request collaboration or a decision needs their input.

## Scenes and presenter steps

Create the stage first. Define scenes and steps in order, then mount once:

```typescript
import { Stage, Text, Title, to } from "stageroutine";

const stage = new Stage();
const title = Title("One system", {
  position: [10, 10],
  origin: "top-left",
});
const detail = Text("Two services share the same data.", {
  position: [10, 30],
  width: 100,
  opacity: 0,
});

stage.scene("Overview").with(title);
stage.pause();

stage.scene("Detail").with(title, detail);
title.to({ position: [10, 6], scale: 0.8 });
detail.opacity = to(1).after(title);
stage.pause();

stage.mount("#stage");
```

- `.with()` defines active scene elements. Shared instances persist; omitted elements exit.
- `stage.pause()` closes a step and records its final state. It does not block JavaScript or wait for an animation.
- Add more changes and pauses for additional steps in the same scene.
- Playback runs transitions within each step, then waits for presenter input.
- Scene membership supplies automatic enter and exit fades. An explicit opacity transition overrides the automatic fade for that element in that step.
- For a timed reveal, create the element with `opacity: 0`, include it in the scene, then animate opacity to `1`.

## Choose components

Import creation functions and types from `stageroutine`.

| Content or operation | API |
|---|---|
| Heading or body text | `Title`, `Text` |
| Content on a surface | `Card` |
| Progressive list or comparison | `BulletList`, `Table`, `.reveal()` |
| Code or recorded terminal output | `CodeBlock`, `TerminalBlock` |
| Images, icons, or video | `Image`, `Icon`, `Video` |
| Diagram nodes and edges | `Shape`, `Connector` |
| Ordered exchanges | `SequenceDiagram` |
| Position elements | `layout` |
| Change several properties | `element.to()` |
| Replace visible content | `replace()` |
| Cascade reveals | `stagger()` |
| Coordinate property transitions | `group()` |
| Show traffic along connections | `connector.pulse()`, `pulseSequence()` |
| Theme, background, or effects | `stage.theme()`, `CSSBackground`, `.decorate()` |

The installed package defines the available API. Follow the `types` entry in `node_modules/stageroutine/package.json` to its public exports. Check creation options and the returned element interface separately: an option accepted at creation may not be writable later. Detailed examples: [documentation](https://tsaarni.github.io/stageroutine/).

## State and property changes

Plain assignment changes a property immediately. `to(value)` adds a transition. Defaults: **0.6 seconds**, **cubicOut** easing, **0 seconds** delay.

```typescript
label.text = "Updated";
card.opacity = to(1);
card.to({ position: [80, 45], scale: 1.2 });
```

`ReactiveProp<T>` setters accept `to()`. Some snapshot-safe properties have plain types: use `label.text = "Updated"` for an immediate change or `label.to({ text: "Updated" })` to schedule it. Discrete values switch at the transition's end.

Backward navigation restores recorded properties. Replace arrays and tuples instead of mutating them in place. Direct DOM changes, timers, and external JavaScript state are not restored. Writability and successful type checking do not prove snapshot support; check reactive registration if the public contract is unclear.

Creation-only options include title `variant`/`kicker`, connector head types/sizes, and initial `style`/`className`. Changing the original options object does not update an element. Replace the element when fixed configuration must change.

## Coordinates and layout

The default **16:9** stage is **160 × 90 stage units**. Top-left is `(0, 0)`; center is `(80, 45)`. X increases rightward; Y increases downward. Numeric positions and dimensions use stage units.

`origin` selects the point placed at `position` and the pivot for scale and rotation. Its general default is `"top-left"`; centered coordinates can select centered origins automatically. Set it explicitly for moving elements. `align` controls content inside the element's box.

Use the stage as a spatial explanation. Reserve areas for context, the current action, and comparisons. Give the current subject the most space; move or reduce earlier content when it becomes supporting context. Use empty space to separate ideas and leave room for the next transformation.

Create clean layouts with consistent alignment, margins, and gaps. Constrain text width before arranging elements. Keep labels clear of nodes, connectors, and other labels. Avoid unintended overlap both at rest and during movement; reserve space for scaled elements and curved routes. Use overlap only when it expresses a relationship, such as containment or a deliberate handoff.

When content becomes crowded, rearrange it, move supporting context aside, or reveal detail later. Keep text readable instead of shrinking everything to fit.

Keep independently positioned elements as flat siblings. Use `layout.vstack`, `hstack`, `grid`, and relative helpers such as `below`. Component content such as `Card([Title(...), Text(...)])` is supported; arbitrary layout `<div>` wrappers are not needed.

Layout calculates coordinates once. Reapply it after content or geometry changes that affect placement; it overwrites existing positions. `region: { x, y, width, height }` reserves a layout area. The default region is the full stage. Numeric coordinates remain absolute; `x: "center"` and `y: "center"` center the arrangement.

See [layout](https://tsaarni.github.io/stageroutine/docs/building/layout) for nested arrays, sizing, and alignment.

## Timing and movement

Transitions in one step run together unless linked by `.after()`, `.when()`, or `.delay()`. A presenter pause starts a separate speaking point; it is not an animation delay.

```typescript
import { stagger, to } from "stageroutine";

title.to({ position: [10, 6], scale: 0.6 });
stagger(cards).after(title);
caption.opacity = to(1).when(title, "halfway");
```

Use movement to show transfer, spatial change, or continuity. Keep unrelated content still. Start with default timing; use a small set of durations and keep cascades short enough to read as one event.

`replace(oldElement, newElement)` coordinates an in-place handoff. It matches position by default. Defaults: **0.5 seconds** duration and incoming start at **0.55** of exit progress. `.overlap(1)` starts the entrance after the exit; `.overlap(0)` starts both together.

### Routes

`to(position)` defines the destination; `.path(route)` defines the route. Straight travel is the default. Paths preserve element rotation.

```typescript
import { motion, to } from "stageroutine";

title.to({
  position: to([10, 6]).path(motion.arc(25)),
  scale: 0.6,
});
```

`motion.arc(degrees)` accepts **-180 to 180 degrees**, default **0** (straight). Positive sweeps turn clockwise. `motion.bezier()` accepts fixed control points or a resolver using the movement's endpoints. `motion.spiral()` winds into the destination; default **1 clockwise turn**.

A custom `MotionPath` receives the start and destination and returns a pure position sampler. `t` ranges from **0** to **1**; coordinates use stage units. Sampled endpoints must match the supplied endpoints.

```typescript
import type { MotionPath } from "stageroutine";

const hop = (height: number): MotionPath => (from, to) => t => [
  from[0] + (to[0] - from[0]) * t,
  from[1] + (to[1] - from[1]) * t - 4 * height * t * (1 - t),
];

const lift = hop(20); // Height: 20 stage units.
card.position = to([100, 50]).path(lift);
```

Reuse a route across elements and destinations. Capture fixed configuration; route functions must not read clocks or changing state, or mutate elements. The engine applies easing to approximate travel distance. See [animation](https://tsaarni.github.io/stageroutine/docs/building/animation#custom-routes) for the complete contract.

### Layout movement

Layout callbacks receive the destination, element, and index:

```typescript
layout.hstack(cards, {
  x: "center",
  y: 45,
  gap: 5,
  width: 38,
  animate: position => to(position).path(lift),
});
```

`layout.group()` moves a formation while preserving offsets. Its animation callback receives only the center destination and runs once. `group()` coordinates property transitions; assigning the same absolute `x` to every member places them all at that x coordinate.

Author one position transition per element per step. Assigning `x` or `y` cancels a position transition. A new live position transition starts at the visible position. Backward navigation restores coordinates without replaying the route in reverse.

## Connections and exchanges

`Connector(a, b)` follows its endpoint elements. `fromAnchor` and `toAnchor` select attachment points independently of element origins. Create with `end: 0`, then assign `end = to(1)` to draw the connection. Use `.after(element)` to wait for endpoint movement.

For `SequenceDiagram`, declare messages and activations before including participants and `...seq.elements` in a scene. See [sequence diagrams](https://tsaarni.github.io/stageroutine/docs/components/sequence-diagram) for exchange steps.

## Speaker notes

Write notes in `src/notes.md`. Match `## Scene Name` headings to scene names; mark each paused step with `> [!STEP]`.

```typescript
import notes from "./notes.md?raw";

stage.notesDocument(notes);
```

For inline notes, call `stage.note(text)` before the corresponding `stage.pause()`.

## Verification

Use the project's package manager. With npm:

```bash
npm exec tsc -- --noEmit
npm run build
```

Type-check one representative scene before expanding the presentation. Resolve API errors against the installed signatures; do not bypass them with `any`, suppression comments, unsafe casts, weaker compiler settings, DOM patches, or dependency edits.

Check forward/backward navigation, text fit, spacing, active scene elements, and presenter stops. Animation and background effects must stop at rest. Follow the project's browser-tool and screenshot rules. Report checks performed and anything left unverified.
