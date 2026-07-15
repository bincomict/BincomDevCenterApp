const ts = require("typescript");
const fs = require("fs");

const fileContent = fs.readFileSync("src/components/AdminPanel.tsx", "utf8");

const scanner = ts.createScanner(
  ts.ScriptTarget.Latest,
  true, // skipTrivia (comments, whitespace)
  ts.LanguageVariant.JSX,
  fileContent
);

let token = scanner.scan();
let braceStack = [];
let parenStack = [];

// Helper to get line number from character position
function getLineNum(pos) {
  return fileContent.substring(0, pos).split("\n").length;
}

while (token !== ts.SyntaxKind.EndOfFileToken) {
  const pos = scanner.getStartPos();
  const line = getLineNum(pos);
  
  if (token === ts.SyntaxKind.OpenBraceToken) {
    braceStack.push({ line, pos });
  } else if (token === ts.SyntaxKind.CloseBraceToken) {
    if (braceStack.length === 0) {
      console.log(`Error: Extra } at line ${line}`);
    } else {
      braceStack.pop();
    }
  } else if (token === ts.SyntaxKind.OpenParenToken) {
    parenStack.push({ line, pos });
  } else if (token === ts.SyntaxKind.CloseParenToken) {
    if (parenStack.length === 0) {
      console.log(`Error: Extra ) at line ${line}`);
    } else {
      parenStack.pop();
    }
  }
  
  token = scanner.scan();
}

console.log("\n--- Remaining Braces ---");
braceStack.forEach(b => console.log(`Unclosed { from line ${b.line}`));

console.log("\n--- Remaining Parentheses ---");
parenStack.forEach(p => console.log(`Unclosed ( from line ${p.line}`));
