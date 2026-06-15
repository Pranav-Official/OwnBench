# AGENTS.md

## Project

OwnBench is a TypeScript CLI (`ownbench`) that runs LLM-based code analysis workflows to generate a set of benchmarking test suite to bench llm models on use code base. Uses Commander.js for CLI routing, Ink (React) for terminal UI, and `@earendil-works/pi-coding-agent` for agent sessions.

it generate everything inside .ownbench folder in a codebase.

## Commands

- `npm run dev` — run CLI via tsx (no build step)
- `npm run build` — compile TS to `dist/` via `tsc`
- `npm test` — run vitest (single run)
- `npm run test:watch` — run vitest in watch mode

There is no lint or typecheck script. `tsc` (via `npm run build`) is the type checker.

## Architecture

- `src/index.ts` — CLI entrypoint, registers `config` and `generate` commands
- `src/commands/` — Commander command definitions, render Ink components
- `src/tui/` — Ink/React terminal UI components and hooks
- `src/lib/` — shared utilities: config read/write, provider/model lists, types
- `src/agents/` — agent session creation (`pi-coding-agent` wrapper); `bench.ts` is a stub
- `src/generate/` — workflow registry and metadata pipeline
- `src/generate/workflows/` — individual workflow implementations; only `unit-tests-to-code` is active
- `src/generate/extractFunctions.ts` — TypeScript AST parser, extracts function names/lines
- `src/generate/findTestFile.ts` — test file discovery by convention
- `src/lib/checkpoint.ts` — checkpoint/resume system for metadata and workflows
- `tests/` — mirrors `src/` structure; vitest with jsdom environment (required for Ink/React)
- `.ownbench/` — runtime config directory (gitignored), created by `ensureInit()`

## Metadata pipeline

Metadata generation (`generateMetadata`) runs three steps sequentially before any workflow:

1. **Functional files** (`generateFunctionalFiles`) — LLM scans codebase, writes `functional_files.json` (max 100 files)
2. **Candidate functions** (`generateCandidateFunctions`) — LLM reads each file from the functional files list, identifies up to 3 functions per file (max 100 total) that have good structure, low global dependency, and strong test coverage. Writes `candidate_functions.json`.
3. **Dashboard** (`generateDashboard`) — writes `index.html` that fetches both JSON files at runtime

All output goes to `.ownbench/metadata/`. JSON is the source of truth; HTML is for human readability.

## Checkpoint system

- State file: `.ownbench/checkpoint.json`
- Tracks completed steps (metadata and workflow)
- Each step validates output file existence before skipping
- Corrupted/invalid output automatically re-runs the step
- `ownbench generate` resumes from checkpoint by default
- `ownbench generate --stale` clears all checkpoints and regenerates from scratch

## Key conventions

- ESM throughout (`"type": "module"`, `"module": "ES2022"`). All imports use `.js` extensions.
- JSX configured as `react-jsx` in tsconfig.
- Agent sessions write output via a custom `write_ownbench` tool that is sandboxed to `.ownbench/`. Never use `write` or `edit` on project files from within an agent session.
- Workflows register in `src/generate/registry.ts`. Only workflows with `status: "active"` are selectable.
- `bench.ts` is unimplemented — do not call `runBenchmark()`.
- `runPrompt` is the shared session runner for LLM prompts. All LLM-driven steps use it.
