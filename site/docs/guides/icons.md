---
sidebar_position: 3
---

# Icons

StageRoutine bundles only the icons you use at build time, keeping your presentation fast and lightweight. You can use standard [Iconify collections](https://icon-sets.iconify.design/) or add custom icon sets using JSON format.

## Using Iconify Collections

Browse and pick an icon set from the [Iconify Collections Explorer](https://icon-sets.iconify.design/), then install it:

```bash
pnpm add -D @iconify-json/lucide
```

Import icons directly with the `~icons/` syntax:

```typescript
import Database from "~icons/lucide/database";
import Cpu from "~icons/lucide/cpu";
```

Use them as standalone stage elements or pass them to cards:

```typescript
// Standalone element
const dbIcon = Database({ x: 10, y: 20, width: 48, height: 48 });

// Inside a card
const dbCard = Card({
  icon: Database(),
  kicker: "DATABASE",
  title: "Vector Store",
});
```

## Adding Custom Icon Sets (JSON Format)

You can define custom icons in the standard [Iconify JSON format](https://iconify.design/docs/types/iconify-json/) and register them at build time.

### 1. Create the Icon JSON File

Create a file named `mycompany-icons.json`:

```json
{
  "prefix": "mycompany",
  "icons": {
    "gateway": {
      "body": "<rect x=\"2\" y=\"2\" width=\"20\" height=\"20\" rx=\"4\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\"/><circle cx=\"12\" cy=\"12\" r=\"3\" fill=\"currentColor\"/>",
      "width": 24,
      "height": 24
    },
    "edge-device": {
      "body": "<circle cx=\"12\" cy=\"12\" r=\"9\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\"/><path d=\"M12 7v10M7 12h10\" stroke=\"currentColor\" stroke-width=\"2\"/>",
      "width": 24,
      "height": 24
    }
  }
}
```

### 2. Register in Vite Configuration

Import the JSON file in `vite.config.ts` and pass it to `customCollections`:

```typescript
import { defineConfig } from "vite";
import { stageRoutinePlugin } from "stageroutine/vite";
import mycompanyIcons from "./mycompany-icons.json";

export default defineConfig({
  plugins: [
    stageRoutinePlugin({
      iconsOptions: {
        customCollections: {
          mycompany: mycompanyIcons,
        },
      },
    }),
  ],
});
```

### 3. Import and Use

Import your custom icons using the `~icons/mycompany/` prefix:

```typescript
import Gateway from "~icons/mycompany/gateway";
import EdgeDevice from "~icons/mycompany/edge-device";

const node = Card({
  icon: Gateway(),
  kicker: "API GATEWAY",
});
```
