import type { Locator, Page } from "@playwright/test";
import {
  TERMINAL_ENDPOINT,
  type TerminalClientMessage,
  type TerminalOpenMessage,
  type TerminalServerMessage,
  terminalTokenPath,
} from "../../src/core/terminal-protocol";

/** Emulates the terminal server while keeping browser fetch and WebSocket intact. */
export async function mockTerminal(
  page: Page,
  replay = "$ ",
): Promise<{ input: string[]; opened: TerminalOpenMessage[] }> {
  const input: string[] = [];
  const opened: TerminalOpenMessage[] = [];
  await page.route(`**${terminalTokenPath(TERMINAL_ENDPOINT)}`, (route) =>
    route.fulfill({ contentType: "text/plain", body: "test-token" }),
  );
  await page.routeWebSocket(`**${TERMINAL_ENDPOINT}`, (socket) => {
    socket.onMessage((raw) => {
      const message = JSON.parse(String(raw)) as TerminalClientMessage;
      if (message.type === "open") {
        opened.push(message);
        socket.send(
          JSON.stringify({
            type: "ready",
            id: message.id,
            cols: message.cols,
            rows: message.rows,
            running: true,
            replay,
          } satisfies TerminalServerMessage),
        );
      } else if (message.type === "input") {
        input.push(message.data);
      }
    });
  });
  await page.evaluate((endpoint) => {
    (globalThis as { __STAGEROUTINE_TERMINAL__?: string }).__STAGEROUTINE_TERMINAL__ = endpoint;
  }, TERMINAL_ENDPOINT);
  return { input, opened };
}

/** Drags across terminal cells. Row and column indices start at 0; end is exclusive. */
export async function dragTerminalCells(
  page: Page,
  terminal: Locator,
  grid: { cols: number; rows: number },
  row: number,
  startColumn: number,
  endColumn: number,
): Promise<void> {
  const screen = await terminal.locator(".xterm-screen").boundingBox();
  if (!screen) throw new Error("Terminal screen is not visible");
  const cellWidth = screen.width / grid.cols;
  const y = screen.y + ((row + 0.5) * screen.height) / grid.rows;
  await page.mouse.move(screen.x + (startColumn + 0.1) * cellWidth, y);
  await page.mouse.down();
  await page.mouse.move(screen.x + (endColumn + 0.1) * cellWidth, y, { steps: 10 });
  await page.mouse.up();
}

/** Reads selected terminal text through its copy event without using the system clipboard. */
export async function selectedTerminalText(terminal: Locator): Promise<string> {
  return terminal.locator(".xterm").evaluate((node) => {
    const clipboardData = new DataTransfer();
    node.dispatchEvent(
      new ClipboardEvent("copy", { bubbles: true, cancelable: true, clipboardData }),
    );
    return clipboardData.getData("text/plain");
  });
}
