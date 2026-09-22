/**
 * The package is distributed from GitHub as plain TypeScript source. There is
 * no build step and no compiled JavaScript is stored in the repo, so Vite
 * compiles the source for the browser. It is not published to npmjs yet.
 *
 * Some code must run in Node.js instead: the CLI (bin/stageroutine) and this
 * Vite plugin. After install both live under node_modules, where Node.js
 * refuses .ts files (ERR_UNSUPPORTED_NODE_MODULES_TYPE_STRIPPING). The ban is
 * deliberate: packages are expected to ship compiled JavaScript. Node.js
 * closed the request to lift it as "not planned"
 * (github.com/nodejs/typescript/issues/14).
 *
 * Fix: jiti transpiles TypeScript at load time. package.json maps ./vite to
 * this .js file because Node.js could not load a .ts entry either. Once the
 * package is published to npmjs, ship compiled output and drop jiti.
 */
import { createJiti } from "jiti";

const jiti = createJiti(import.meta.url);
const { stageRoutine } = await jiti.import("./vite-plugin.ts");

export { stageRoutine };
