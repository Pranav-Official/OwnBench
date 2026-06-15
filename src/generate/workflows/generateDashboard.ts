import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import type { WorkflowContext } from "../types.js";
import { writeCheckpoint } from "../../lib/checkpoint.js";

const DASHBOARD_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>OwnBench Dashboard</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    background: #fafafa;
    color: #24292f;
    line-height: 1.5;
    padding: 2rem;
  }
  h1 { font-size: 1.5rem; font-weight: 600; margin-bottom: 1.5rem; }
  h2 { font-size: 1.125rem; font-weight: 600; margin: 1.5rem 0 0.75rem; }
  .section { margin-bottom: 2rem; }
  .stats { display: flex; gap: 1rem; margin-bottom: 1.5rem; flex-wrap: wrap; }
  .stat {
    background: #fff;
    border: 1px solid #d0d7de;
    border-radius: 6px;
    padding: 0.75rem 1rem;
    min-width: 120px;
  }
  .stat-value { font-size: 1.5rem; font-weight: 700; color: #0969da; }
  .stat-label { font-size: 0.75rem; color: #57606a; text-transform: uppercase; letter-spacing: 0.05em; }
  table { width: 100%; border-collapse: collapse; background: #fff; border: 1px solid #d0d7de; border-radius: 6px; overflow: hidden; }
  th { background: #f6f8fa; font-size: 0.75rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: #57606a; text-align: left; padding: 0.5rem 0.75rem; border-bottom: 1px solid #d0d7de; }
  td { padding: 0.5rem 0.75rem; border-bottom: 1px solid #d0d7de; font-size: 0.875rem; }
  tr:last-child td { border-bottom: none; }
  tr:hover td { background: #f6f8fa; }
  code { font-family: "SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace; font-size: 0.8125rem; background: #f6f8fa; padding: 0.125rem 0.25rem; border-radius: 3px; }
  .empty { color: #57606a; font-style: italic; padding: 1rem; text-align: center; }
  .loading { color: #57606a; }
  .error { color: #cf222e; padding: 1rem; background: #fff1f0; border: 1px solid #ff8182; border-radius: 6px; }
  .tabs { display: flex; gap: 0; border-bottom: 1px solid #d0d7de; margin-bottom: 1rem; }
  .tab { padding: 0.5rem 1rem; cursor: pointer; font-size: 0.875rem; font-weight: 500; border-bottom: 2px solid transparent; color: #57606a; }
  .tab.active { color: #0969da; border-bottom-color: #0969da; }
  .tab:hover { color: #0969da; }
  .panel { display: none; }
  .panel.active { display: block; }
</style>
</head>
<body>
<h1>OwnBench Dashboard</h1>
<div class="stats" id="stats"></div>
<div class="tabs">
  <div class="tab active" data-panel="functions">Candidate Functions</div>
  <div class="tab" data-panel="files">Functional Files</div>
</div>
<div id="functions" class="panel active"></div>
<div id="files" class="panel"></div>
<script>
document.querySelectorAll(".tab").forEach(tab => {
  tab.addEventListener("click", () => {
    document.querySelectorAll(".tab").forEach(t => t.classList.remove("active"));
    document.querySelectorAll(".panel").forEach(p => p.classList.remove("active"));
    tab.classList.add("active");
    document.getElementById(tab.dataset.panel).classList.add("active");
  });
});

async function loadJSON(file) {
  try {
    const res = await fetch(file);
    if (!res.ok) return null;
    return await res.json();
  } catch { return null; }
}

function statsHTML(funcs, files) {
  const fileCount = files ? files.files.length : 0;
  const funcCount = funcs ? funcs.functions.length : 0;
  const testCount = funcs ? funcs.functions.filter(f => f.testFile).length : 0;
  return [
    { value: fileCount, label: "Source Files" },
    { value: funcCount, label: "Candidate Functions" },
    { value: testCount, label: "With Tests" },
  ].map(s => '<div class="stat"><div class="stat-value">' + s.value + '</div><div class="stat-label">' + s.label + '</div></div>').join("");
}

function renderFunctions(funcs) {
  if (!funcs || funcs.functions.length === 0) return '<div class="empty">No candidate functions found.</div>';
  const rows = funcs.functions.map(f =>
    "<tr><td><code>" + f.file + "</code></td><td><code>" + f.name + "</code></td><td>" + f.startLine + "</td><td>" + f.endLine + "</td><td>" + (f.testFile ? "<code>" + f.testFile + "</code>" : '<span style="color:#57606a">—</span>') + "</td></tr>"
  ).join("");
  return "<table><thead><tr><th>File</th><th>Function</th><th>Start</th><th>End</th><th>Test File</th></tr></thead><tbody>" + rows + "</tbody></table>";
}

function renderFiles(files) {
  if (!files || files.files.length === 0) return '<div class="empty">No functional files found.</div>';
  const rows = files.files.map(f =>
    "<tr><td><code>" + f.path + "</code></td><td>" + f.lines + "</td><td>" + f.description + "</td></tr>"
  ).join("");
  return "<table><thead><tr><th>File</th><th>Lines</th><th>Description</th></tr></thead><tbody>" + rows + "</tbody></table>";
}

async function main() {
  const stats = document.getElementById("stats");
  const funcPanel = document.getElementById("functions");
  const filePanel = document.getElementById("files");

  stats.innerHTML = '<span class="loading">Loading...</span>';
  funcPanel.innerHTML = '<span class="loading">Loading...</span>';

  const [funcs, files] = await Promise.all([
    loadJSON("candidate_functions.json"),
    loadJSON("functional_files.json"),
  ]);

  stats.innerHTML = statsHTML(funcs, files);
  funcPanel.innerHTML = renderFunctions(funcs);
  filePanel.innerHTML = renderFiles(files);
}

main();
</script>
</body>
</html>`;

export async function generateDashboard(ctx: WorkflowContext): Promise<void> {
  const metadataDir = join(ctx.cwd, ".ownbench", "metadata");
  mkdirSync(metadataDir, { recursive: true });

  const outPath = join(metadataDir, "index.html");
  writeFileSync(outPath, DASHBOARD_HTML, "utf-8");
  writeCheckpoint(ctx.cwd, "metadata.dashboard", "completed");
}
