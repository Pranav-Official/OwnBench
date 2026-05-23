#!/usr/bin/env node

import { argv, exit, cwd } from "node:process";
import { mkdirSync, existsSync } from "node:fs";
import { join } from "node:path";

function init() {
  const dir = join(cwd(), ".ownbench");

  if (existsSync(dir)) {
    console.log(".ownbench already exists in this directory.");
    exit(0);
  }

  mkdirSync(dir);
  console.log("Initialized .ownbench directory.");
}

function main(args: string[]) {
  const command = args[0];

  if (command === "init") {
    init();
  } else {
    console.log("Usage: ownbench init");
    exit(1);
  }
}

main(argv.slice(2));
exit(0);
