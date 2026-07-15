const fs = require("fs");

const code = fs.readFileSync("src/components/AdminPanel.tsx", "utf8");
const lines = code.split("\n");

let tagStack = [];

const VALID_TAGS = new Set([
  "div", "p", "button", "span", "h3", "h4", "h5", "form", "select", "option",
  "label", "textarea", "a", "Plus", "Trash2", "Edit2", "ArrowUp", "ArrowDown",
  "Cpu", "Award", "FileDown", "Edit", "Check", "X", "Clock", "User", "Calendar",
  "ChevronDown", "ChevronUp", "Info", "Search"
]);

for (let lineNum = 3374; lineNum <= 5922; lineNum++) {
  const line = lines[lineNum - 1];
  
  let i = 0;
  while (i < line.length) {
    if (line.substring(i, i + 2) === "//") {
      break;
    }
    
    // Look for tags
    if (line[i] === "<") {
      // Is it a closing tag?
      if (line[i + 1] === "/") {
        const match = line.substring(i).match(/^<\/([a-zA-Z0-9.-]+)>/);
        if (match) {
          const tagName = match[1];
          if (VALID_TAGS.has(tagName)) {
            if (tagStack.length === 0) {
              console.log(`Error: Closed </${tagName}> on line ${lineNum} but stack was empty`);
            } else {
              const last = tagStack.pop();
              if (last.name !== tagName) {
                console.log(`Error: Closed </${tagName}> on line ${lineNum} but expected </${last.name}> (opened on line ${last.line})`);
                tagStack.push(last); // keep it
              }
            }
          }
          i += match[0].length;
          continue;
        }
      } else {
        // Is it an opening tag?
        const match = line.substring(i).match(/^<([a-zA-Z0-9.-]+)/);
        if (match) {
          const tagName = match[1];
          
          if (VALID_TAGS.has(tagName)) {
            // Let's see if this is self-closing or ends on this/future lines
            let isSelfClosing = false;
            let tempDepth = 0;
            let j = i;
            let foundEnd = false;
            // Scan line for closure
            while (j < line.length) {
              if (line[j] === "{") tempDepth++;
              if (line[j] === "}") tempDepth--;
              if (tempDepth === 0) {
                if (line.substring(j, j + 2) === "/>") {
                  isSelfClosing = true;
                  i = j + 1;
                  foundEnd = true;
                  break;
                }
                if (line[j] === ">") {
                  i = j;
                  foundEnd = true;
                  break;
                }
              }
              j++;
            }
            
            if (!isSelfClosing && foundEnd) {
              tagStack.push({ name: tagName, line: lineNum });
            }
          }
        }
      }
    }
    i++;
  }
}

console.log("\n--- Tag Stack at End ---");
tagStack.forEach((t) => {
  console.log(`Unclosed <${t.name}> opened on line ${t.line}`);
});
