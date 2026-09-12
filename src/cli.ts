/**
 * Command-line interface for StageRoutine presentations.
 */

import { parseArgs } from "node:util";
import { build, createServer, preview } from "vite";
import { stageRoutine } from "./vite-plugin.ts";

export async function runCli(args: string[] = process.argv.slice(2)): Promise<void> {
  const { values, positionals } = parseArgs({
    args,
    allowPositionals: true,
    options: {
      port: { type: "string", short: "p" },
      host: { type: "boolean", short: "h" },
      open: { type: "boolean", short: "o" },
      base: { type: "string", short: "b" },
      width: { type: "string" },
      height: { type: "string" },
      channel: { type: "string" },
      presenter: { type: "boolean" },
      "no-presenter": { type: "boolean" },
      help: { type: "boolean" },
    },
    strict: false,
  });

  const command = positionals[0] || "dev";

  if (values.help) {
    console.log(`
Usage: stageroutine [command] [options]

Commands:
  dev       Start the development server (default)
  build     Build the presentation and presenter console for production
  preview   Locally preview production build

Options:
  -p, --port <number>     Specify port
  -h, --host              Expose server to network
  -o, --open              Open browser on startup
  -b, --base <path>       Base public path
      --width <number>    Virtual stage width in pixels (default: 1920)
      --height <number>   Virtual stage height in pixels (default: 1080)
      --channel <name>    BroadcastChannel name for presenter sync
      --no-presenter      Disable presenter console build and routes
      --help              Show help
`);
    return;
  }

  const isPresenterEnabled = values["no-presenter"]
    ? false
    : values.presenter !== undefined
      ? Boolean(values.presenter)
      : undefined;

  const basePluginOptions = {
    ...(values.base ? { base: String(values.base) } : {}),
    ...(values.width ? { width: Number(values.width) } : {}),
    ...(values.height ? { height: Number(values.height) } : {}),
    ...(values.channel !== undefined
      ? {
          channel:
            values.channel === "false" || values.channel === "none"
              ? (false as const)
              : String(values.channel),
        }
      : {}),
    ...(isPresenterEnabled !== undefined ? { presenter: isPresenterEnabled } : {}),
  };

  const serverOptions = {
    ...(values.port ? { port: Number(values.port) } : {}),
    ...(values.host ? { host: true } : {}),
    ...(values.open ? { open: true } : {}),
  };

  if (command === "dev") {
    const server = await createServer({
      plugins: [stageRoutine(basePluginOptions)],
      server: serverOptions,
    });
    await server.listen();
    server.printUrls();
    server.bindCLIShortcuts({ print: true });
  } else if (command === "build") {
    await build({
      plugins: [stageRoutine(basePluginOptions)],
    });
  } else if (command === "preview") {
    const previewServer = await preview({
      plugins: [stageRoutine(basePluginOptions)],
      preview: serverOptions,
    });
    previewServer.printUrls();
    previewServer.bindCLIShortcuts({ print: true });
  } else {
    console.error(`Unknown command: ${command}. Use "stageroutine --help" for available commands.`);
    process.exit(1);
  }
}
