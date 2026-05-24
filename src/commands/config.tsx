import { Command } from "commander";
import { render } from "ink";
import { App } from "../tui/app.js";
import { ensureInit } from "../lib/config.js";

export const configCmd = new Command("config")
  .description("Edit benchgen configuration")
  .action(() => {
    ensureInit();
    render(<App />);
  });
