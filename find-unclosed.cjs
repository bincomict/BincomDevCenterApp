const fs = require("fs");

function analyze() {
  const code = fs.readFileSync("src/components/AdminPanel.tsx", "utf8");
  
  let lineNum = 1;
  let inString = null;
  let inJsComment = false;
  let inJsBlockComment = false;
  
  const braceStack = [];
  const parenStack = [];

  for (let i = 0; i < code.length; i++) {
    const char = code[i];
    
    if (char === "\n") {
      lineNum++;
    }

    if (inString) {
      if (char === inString && code[i - 1] !== "\\") {
        inString = null;
      }
      continue;
    }

    if (inJsComment) {
      if (char === "\n") {
        inJsComment = false;
      }
      continue;
    }

    if (inJsBlockComment) {
      if (code.substring(i, i + 2) === "*/") {
        inJsBlockComment = false;
        i++;
      }
      continue;
    }

    // Detect comments & strings
    if (code.substring(i, i + 2) === "//") {
      inJsComment = true;
      i++;
      continue;
    }
    if (code.substring(i, i + 2) === "/*") {
      inJsBlockComment = true;
      i++;
      continue;
    }
    if (char === '"' || char === "'" || char === "`") {
      inString = char;
      continue;
    }

    // Track braces
    if (char === "{") {
      braceStack.push(lineNum);
    } else if (char === "}") {
      if (braceStack.length === 0) {
        console.log(`Unmatched } on line ${lineNum}`);
      } else {
        braceStack.pop();
      }
    }

    // Track parentheses
    if (char === "(") {
      parenStack.push(lineNum);
    } else if (char === ")") {
      if (parenStack.length === 0) {
        console.log(`Unmatched ) on line ${lineNum}`);
      } else {
        parenStack.pop();
      }
    }
  }

  console.log(`\n----- Brace stack size: ${braceStack.length} -----`);
  if (braceStack.length > 0) {
    console.log(`First unclosed { opened on line: ${braceStack[0]}`);
    console.log(`Last unclosed { opened on line: ${braceStack[braceStack.length - 1]}`);
  }

  console.log(`\n----- Paren stack size: ${parenStack.length} -----`);
  if (parenStack.length > 0) {
    console.log(`First unclosed ( opened on line: ${parenStack[0]}`);
    console.log(`Last unclosed ( opened on line: ${parenStack[parenStack.length - 1]}`);
  }
}

analyze();
