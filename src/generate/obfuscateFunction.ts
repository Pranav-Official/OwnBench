import * as ts from "typescript";
import { readFileSync } from "node:fs";
import { join } from "node:path";

function createStubBody(): ts.Block {
  return ts.factory.createBlock(
    [
      ts.factory.createThrowStatement(
        ts.factory.createNewExpression(
          ts.factory.createIdentifier("Error"),
          undefined,
          [ts.factory.createStringLiteral("Not implemented")],
        ),
      ),
    ],
    true,
  );
}

function replaceFunctionBody(
  node:
    | ts.FunctionDeclaration
    | ts.MethodDeclaration
    | ts.ArrowFunction
    | ts.FunctionExpression,
  stubBody: ts.Block,
): ts.Node {
  if (ts.isFunctionDeclaration(node)) {
    return ts.factory.updateFunctionDeclaration(
      node,
      node.modifiers,
      node.asteriskToken,
      node.name,
      node.typeParameters,
      node.parameters,
      node.type,
      stubBody,
    );
  }
  if (ts.isMethodDeclaration(node)) {
    return ts.factory.updateMethodDeclaration(
      node,
      node.modifiers,
      node.asteriskToken,
      node.name,
      node.questionToken,
      node.typeParameters,
      node.parameters,
      node.type,
      stubBody,
    );
  }
  if (ts.isArrowFunction(node)) {
    return ts.factory.updateArrowFunction(
      node,
      node.modifiers,
      node.typeParameters,
      node.parameters,
      node.type,
      node.equalsGreaterThanToken,
      stubBody,
    );
  }
  if (ts.isFunctionExpression(node)) {
    return ts.factory.updateFunctionExpression(
      node,
      node.modifiers,
      node.asteriskToken,
      node.name,
      node.typeParameters,
      node.parameters,
      node.type,
      stubBody,
    );
  }
  return node;
}

function replaceVariableStatementBody(
  node: ts.VariableStatement,
  stubBody: ts.Block,
): ts.VariableStatement {
  const oldDeclList = node.declarationList;
  const newDeclarations = oldDeclList.declarations.map((decl) => {
    if (
      decl.initializer &&
      (ts.isArrowFunction(decl.initializer) ||
        ts.isFunctionExpression(decl.initializer))
    ) {
      return ts.factory.updateVariableDeclaration(
        decl,
        decl.name,
        decl.exclamationToken,
        decl.type,
        replaceFunctionBody(
          decl.initializer,
          stubBody,
        ) as ts.ArrowFunction | ts.FunctionExpression,
      );
    }
    return decl;
  });
  return ts.factory.updateVariableStatement(
    node,
    node.modifiers,
    ts.factory.updateVariableDeclarationList(oldDeclList, newDeclarations),
  );
}

function getNameOfNode(node: ts.Node, sourceFile: ts.SourceFile): string | null {
  if (ts.isFunctionDeclaration(node) && node.name) return node.name.text;
  if (ts.isMethodDeclaration(node) && node.name)
    return node.name.getText(sourceFile);
  if (ts.isGetAccessorDeclaration(node) && node.name)
    return node.name.getText(sourceFile);
  if (ts.isSetAccessorDeclaration(node) && node.name)
    return node.name.getText(sourceFile);
  if (ts.isVariableStatement(node)) {
    for (const decl of node.declarationList.declarations) {
      if (decl.name && ts.isIdentifier(decl.name)) {
        if (
          decl.initializer &&
          (ts.isArrowFunction(decl.initializer) ||
            ts.isFunctionExpression(decl.initializer))
        ) {
          return decl.name.text;
        }
      }
    }
  }
  return null;
}

function hasBody(node: ts.Node): boolean {
  if (ts.isFunctionDeclaration(node)) return !!node.body;
  if (ts.isMethodDeclaration(node)) return !!node.body;
  if (ts.isGetAccessorDeclaration(node)) return !!node.body;
  if (ts.isSetAccessorDeclaration(node)) return !!node.body;
  if (ts.isVariableStatement(node)) {
    for (const decl of node.declarationList.declarations) {
      if (
        decl.initializer &&
        (ts.isArrowFunction(decl.initializer) ||
          ts.isFunctionExpression(decl.initializer))
      ) {
        return true;
      }
    }
  }
  return false;
}

function collectMatchingNodes(
  sourceFile: ts.SourceFile,
  name: string,
): ts.Node[] {
  const matches: ts.Node[] = [];
  const visit = (node: ts.Node) => {
    if (getNameOfNode(node, sourceFile) === name && hasBody(node)) {
      matches.push(node);
    }
    ts.forEachChild(node, visit);
  };
  ts.forEachChild(sourceFile, visit);
  return matches;
}

function findFunctionDeclarationTarget(
  sourceFile: ts.SourceFile,
  name: string,
): ts.FunctionDeclaration | null {
  const allDecls: ts.FunctionDeclaration[] = [];
  const visit = (node: ts.Node) => {
    if (ts.isFunctionDeclaration(node) && node.name?.text === name) {
      allDecls.push(node);
    }
    ts.forEachChild(node, visit);
  };
  ts.forEachChild(sourceFile, visit);
  return allDecls[allDecls.length - 1] ?? null;
}

export function obfuscateFunction(
  projectDir: string,
  sourceFile: string,
  name: string,
): string {
  const filePath = join(projectDir, sourceFile);
  const sourceText = readFileSync(filePath, "utf-8");

  const sourceFileNode = ts.createSourceFile(
    sourceFile,
    sourceText,
    ts.ScriptTarget.Latest,
    true,
  );

  const matches = collectMatchingNodes(sourceFileNode, name);
  if (matches.length === 0) {
    throw new Error(
      `Could not find function "${name}" in ${sourceFile}`,
    );
  }

  const stubBody = createStubBody();
  let funcDeclTarget: ts.FunctionDeclaration | null = null;

  const transformer: ts.TransformerFactory<ts.SourceFile> = (context) => {
    return (rootNode) => {
      funcDeclTarget = findFunctionDeclarationTarget(sourceFileNode, name);

      const visit: ts.Visitor = (node) => {
        if (ts.isMethodDeclaration(node)) {
          if (node.name.getText(sourceFileNode) === name) {
            return replaceFunctionBody(node, stubBody);
          }
        }
        if (ts.isGetAccessorDeclaration(node)) {
          if (node.name.getText(sourceFileNode) === name) {
            return ts.factory.updateGetAccessorDeclaration(
              node,
              node.modifiers,
              node.name,
              node.parameters,
              node.type,
              stubBody,
            );
          }
        }
        if (ts.isSetAccessorDeclaration(node)) {
          if (node.name.getText(sourceFileNode) === name) {
            return ts.factory.updateSetAccessorDeclaration(
              node,
              node.modifiers,
              node.name,
              node.parameters,
              stubBody,
            );
          }
        }
        if (ts.isVariableStatement(node)) {
          if (getNameOfNode(node, sourceFileNode) === name) {
            return replaceVariableStatementBody(node, stubBody);
          }
        }
        if (ts.isFunctionDeclaration(node) && node.name?.text === name) {
          if (funcDeclTarget && node === funcDeclTarget) {
            return replaceFunctionBody(node, stubBody);
          }
        }
        return ts.visitEachChild(node, visit, context);
      };
      return ts.visitNode(rootNode, visit) as ts.SourceFile;
    };
  };

  const result = ts.transform(sourceFileNode, [transformer]);
  const transformed = result.transformed[0];
  const printer = ts.createPrinter({ newLine: ts.NewLineKind.LineFeed });
  const printed = printer.printFile(transformed);
  result.dispose();
  return printed;
}
