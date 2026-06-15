import * as ts from "typescript";
import { readFileSync } from "node:fs";
import { join } from "node:path";

export interface ExtractedFunction {
  file: string;
  name: string;
  startLine: number;
  endLine: number;
}

function lineOf(sourceFile: ts.SourceFile, pos: number): number {
  return sourceFile.getLineAndCharacterOfPosition(pos).line + 1;
}

function visitNode(
  node: ts.Node,
  sourceFile: ts.SourceFile,
  result: ExtractedFunction[],
  filePath: string,
): void {
  if (ts.isFunctionDeclaration(node) && node.name) {
    result.push({
      file: filePath,
      name: node.name.text,
      startLine: lineOf(sourceFile, node.getStart(sourceFile)),
      endLine: lineOf(sourceFile, node.getEnd()),
    });
  } else if (ts.isMethodDeclaration(node) && node.name) {
    result.push({
      file: filePath,
      name: node.name.getText(sourceFile),
      startLine: lineOf(sourceFile, node.getStart(sourceFile)),
      endLine: lineOf(sourceFile, node.getEnd()),
    });
  } else if (
    ts.isVariableStatement(node) &&
    node.declarationList.declarations.length > 0
  ) {
    for (const decl of node.declarationList.declarations) {
      if (decl.name && ts.isIdentifier(decl.name) && decl.initializer) {
        const init = decl.initializer;
        if (
          ts.isArrowFunction(init) ||
          ts.isFunctionExpression(init)
        ) {
          result.push({
            file: filePath,
            name: decl.name.text,
            startLine: lineOf(sourceFile, node.getStart(sourceFile)),
            endLine: lineOf(sourceFile, node.getEnd()),
          });
        }
      }
    }
  }
  ts.forEachChild(node, (child) => visitNode(child, sourceFile, result, filePath));
}

export function extractFunctions(
  projectDir: string,
  filePaths: string[],
): ExtractedFunction[] {
  const result: ExtractedFunction[] = [];

  for (const relPath of filePaths) {
    const fullPath = join(projectDir, relPath);
    let sourceText: string;
    try {
      sourceText = readFileSync(fullPath, "utf-8");
    } catch {
      continue;
    }

    const sourceFile = ts.createSourceFile(
      relPath,
      sourceText,
      ts.ScriptTarget.Latest,
      true,
    );

    ts.forEachChild(sourceFile, (node) =>
      visitNode(node, sourceFile, result, relPath),
    );
  }

  return result;
}
