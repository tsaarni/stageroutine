# Contributing

## Commands

| Command | Description |
|---|---|
| `pnpm dev` | Start Vite dev server |
| `pnpm build` | Build production bundles for stage and presenter console |
| `pnpm preview` | Preview production build |
| `pnpm typecheck` | Run TypeScript check (`tsc --noEmit`) |
| `pnpm check` | Run Biome linter and formatter check |
| `pnpm format` | Format files with Biome |
| `pnpm chrome-dev` | Launch Chrome with remote debugging on port 9222 |

## Remote Debugging and MCP

To connect the presentation with MCP clients or developer tooling via Chrome DevTools:

1. Start the dev server:
   ```bash
   pnpm dev
   ```
2. In a separate terminal, launch Chrome with remote debugging enabled on port 9222:
   ```bash
   pnpm chrome-dev
   ```
