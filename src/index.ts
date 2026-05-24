#!/usr/bin/env node

import { Command } from "commander";
import { configCmd } from "./commands/config.js";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const pkg = JSON.parse(
  readFileSync(
    join(dirname(fileURLToPath(import.meta.url)), "..", "package.json"),
    "utf-8",
  ),
) as { version: string };

const program = new Command()
  .name("ownbench")
  .description("A basic TypeScript CLI")
  .version(pkg.version);

program.addCommand(configCmd);
program.parse();
