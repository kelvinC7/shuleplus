import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

const root = path.resolve(import.meta.dirname, '..');
const sourceRoot = path.join(root, 'src');
const languageCodes = ['en', 'rw', 'fr', 'lg', 'pt', 'sw', 'rn'];
const usedKeys = new Set();
const catalogKeys = new Set();
const catalogPath = path.join(sourceRoot, 'constants', 'translations.ts');
const catalogSource = ts.createSourceFile(
  catalogPath,
  fs.readFileSync(catalogPath, 'utf8'),
  ts.ScriptTarget.Latest,
  true,
  ts.ScriptKind.TS,
);

function propertyName(property) {
  if (ts.isStringLiteral(property.name) || ts.isIdentifier(property.name)) {
    return property.name.text;
  }
  return undefined;
}

function findCatalogs(node) {
  if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.initializer) {
    if (['TRANSLATIONS', 'EXTENDED_TRANSLATIONS'].includes(node.name.text) && ts.isObjectLiteralExpression(node.initializer)) {
      for (const property of node.initializer.properties) {
        const key = propertyName(property);
        if (key) catalogKeys.add(key);
      }
    }
  }
  ts.forEachChild(node, findCatalogs);
}

function scanSource(filePath) {
  const kind = filePath.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS;
  const source = ts.createSourceFile(filePath, fs.readFileSync(filePath, 'utf8'), ts.ScriptTarget.Latest, true, kind);
  function visit(node) {
    if (
      ts.isCallExpression(node) &&
      ts.isIdentifier(node.expression) &&
      node.expression.text === 't' &&
      node.arguments.length > 0 &&
      ts.isStringLiteral(node.arguments[0])
    ) {
      usedKeys.add(node.arguments[0].text);
    }
    ts.forEachChild(node, visit);
  }
  visit(source);
}

function scanDirectory(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const filePath = path.join(directory, entry.name);
    if (entry.isDirectory()) scanDirectory(filePath);
    else if (/\.(tsx?|jsx?)$/.test(entry.name) && filePath !== catalogPath) scanSource(filePath);
  }
}

findCatalogs(catalogSource);
scanDirectory(sourceRoot);

const missing = [...usedKeys].filter((key) => !catalogKeys.has(key)).sort();
if (missing.length) {
  console.error(`Missing translations (${missing.length}):\n${missing.map((key) => `- ${key}`).join('\n')}`);
  process.exitCode = 1;
} else {
  console.log(`Translation audit passed: ${usedKeys.size} literal keys across ${languageCodes.length} supported languages.`);
}