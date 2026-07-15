const ts = require("typescript");
const fs = require("fs");

const filePath = "src/components/AdminPanel.tsx";
const content = fs.readFileSync(filePath, "utf8");

const sourceFile = ts.createSourceFile(
  filePath,
  content,
  ts.ScriptTarget.Latest,
  true,
  ts.ScriptKind.TSX
);

// Get syntax diagnostics
const diagnostics = ts.getPreEmitDiagnostics(
  ts.createProgram([filePath], { jsx: ts.JsxEmit.ReactJSX })
);

if (diagnostics.length === 0) {
  console.log("No TypeScript syntax errors found!");
} else {
  console.log(`Found ${diagnostics.length} diagnostic issue(s):`);
  diagnostics.forEach((diagnostic) => {
    if (diagnostic.file) {
      const { line, character } = ts.getLineAndCharacterOfPosition(
        diagnostic.file,
        diagnostic.start
      );
      const message = ts.flattenDiagnosticMessageText(
        diagnostic.messageText,
        "\n"
      );
      console.log(`Error: ${diagnostic.file.fileName} (${line + 1}:${character + 1}): ${message}`);
    } else {
      console.log(`Error: ${ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n")}`);
    }
  });
}
