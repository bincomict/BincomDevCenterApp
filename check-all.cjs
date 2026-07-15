const fs = require("fs");

const code = fs.readFileSync("src/components/AdminPanel.tsx", "utf8");
const lines = code.split("\n");

let braceStack = [];
let parenStack = [];

let inString = null;
let inComment = false;
let inBlockComment = false;

for (let lineNum = 1; lineNum <= lines.length; lineNum++) {
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
      break;
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
    
    if (char === "{") {
      braceStack.push({ line: lineNum, col: i + 1 });
    } else if (char === "}") {
      if (braceStack.length === 0) {
      } else {
        braceStack.pop();
      }
    } else if (char === "(") {
      parenStack.push({ line: lineNum, col: i + 1 });
      if (lineNum >= 6290 && lineNum <= 6452) {
        console.log(`PUSH ( from line ${lineNum}:${i + 1}`);
      }
    } else if (char === ")") {
      if (parenStack.length === 0) {
        if (lineNum >= 6290 && lineNum <= 6452) {
          console.log(`POP extra ) on line ${lineNum}:${i + 1}`);
        }
      } else {
        const popped = parenStack.pop();
        if (lineNum >= 6290 && lineNum <= 6452) {
          console.log(`POP ( from line ${popped.line}:${popped.col} on line ${lineNum}:${i + 1}`);
        }
      }
    }
    
    i++;
  }
  inComment = false;
}
