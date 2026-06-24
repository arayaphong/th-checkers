// Entry point for the TUI REPL application.

import { Repl } from './Repl.js';

async function main(): Promise<void> {
  await new Repl().run();
}

main().catch((err: unknown) => {
  console.error(err);
  process.exitCode = 1;
});
