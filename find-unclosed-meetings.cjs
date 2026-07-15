const fs = require("fs");

const code = fs.readFileSync("src/components/AdminPanel.tsx", "utf8");
const lines = code.split("\n");

let braceStack = [];
let parenStack = [];

let inString = null;
let inComment = false;
let inBlockComment = false;

for (let lineNum = 3374; lineNum <= 5922; lineNum++) {
  const line = lines[lineNum - 1];
  
  let i = 0;
  while (i < line.length) {
    const char = line[i];
    
    if (inString) {
      if (char === inString && line[i - 1] !== "\\") {
        inString = null;
      }
      i++;
      continue;
    }
    
    if (inComment) {
      break; // comment till end of line
    }
    
    if (inBlockComment) {
      if (line.substring(i, i + 2) === "*/") {
        inBlockComment = false;
        i++;
      }
      i++;
      continue;
    }
    
    if (line.substring(i, i + 2) === "//") {
      inComment = true;
      i++;
      continue;
    }
    
    if (line.substring(i, i + 2) === "/*") {
      inBlockComment = true;
      i++;
      continue;
    }
    
    if (char === '"' || char === "'" || char === "`") {
      inString = char;
      i++;
      continue;
    }
    
    // Check brackets
    if (char === "{") {
      braceStack.push({ line: lineNum, col: i + 1 });
    } else if (char === "}") {
      if (braceStack.length === 0) {
        console.log(`Error: Extra } at line ${lineNum}:${i + 1}`);
      } else {
        braceStack.pop();
      }
    } else if (char === "(") {
      parenStack.push({ line: lineNum, col: i + 1 });
    } else if (char === ")") {
      if (parenStack.length === 0) {
        console.log(`Error: Extra ) at line ${lineNum}:${i + 1}`);
      } else {
        parenStack.pop();
      }
    }
    
    i++;
  }
  inComment = false; // Reset line comment at end of line
}

console.log("\n--- Brace Stack at End ---");
braceStack.forEach(b => console.log(`Unclosed { opened on line ${b.line}:${b.col}`));

console.log("\n--- Paren Stack at End ---");
parenStack.forEach(p => console.log(`Unclosed ( opened on line ${p.line}:${p.col}`));
