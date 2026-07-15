const fs = require("fs");

function analyze() {
  const code = fs.readFileSync("src/components/AdminPanel.tsx", "utf8");
  
  let lineNum = 1;
  let inString = null;
  let inComment = false;
  let inBlockComment = false;
  
  const stack = [];
  
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
    
    if (inComment) {
      if (char === "\n") {
        inComment = false;
      }
      continue;
    }
    
    if (inBlockComment) {
      if (code.substring(i, i + 2) === "*/") {
        inBlockComment = false;
        i++;
      }
      continue;
    }
    
    if (code.substring(i, i + 2) === "//") {
      inComment = true;
      i++;
      continue;
    }
    if (code.substring(i, i + 2) === "/*") {
      inBlockComment = true;
      i++;
      continue;
    }
    if (char === '"' || char === "'" || char === "`") {
      inString = char;
      continue;
    }
    
    // Track brackets
    if (char === "{") {
      stack.push({ type: "{", line: lineNum });
    } else if (char === "}") {
      const top = stack.pop();
      if (!top || top.type !== "{") {
        console.log(`Unmatched } on line ${lineNum}`);
        if (top) stack.push(top);
      }
    } else if (char === "(") {
      stack.push({ type: "(", line: lineNum });
    } else if (char === ")") {
      const top = stack.pop();
      if (!top || top.type !== "(") {
        console.log(`Unmatched ) on line ${lineNum}`);
        if (top) stack.push(top);
      }
    } else if (char === "<") {
      // Check if it is a tag
      // Simple regex check for tag name, avoiding < space or < number or <= etc.
      const match = code.substring(i).match(/^<([a-zA-Z][a-zA-Z0-9.-]*)/);
      const isClosing = code[i + 1] === "/";
      const closingMatch = isClosing && code.substring(i).match(/^<\/([a-zA-Z][a-zA-Z0-9.-]*)/);
      
      if (closingMatch) {
        const tagName = closingMatch[1];
        // Find matching opening tag in stack
        let found = false;
        const temp = [];
        while (stack.length > 0) {
          const item = stack.pop();
          if (item.type === "tag" && item.name === tagName) {
            found = true;
            break;
          }
          temp.push(item);
        }
        if (!found) {
          console.log(`Unmatched closing tag </${tagName}> on line ${lineNum}`);
          // restore stack
          while (temp.length > 0) stack.push(temp.pop());
        } else {
          // keep other things, but discard items above the tag
          // actually, in JSX, elements must be strictly nested, so any non-tag items (like { or () shouldn't be crossed, but let's check
          const tagIndex = temp.findIndex(x => x.type === "tag");
          if (tagIndex !== -1) {
            console.log(`Strict nesting violation: closed </${tagName}> on line ${lineNum} but top tag was <${temp[tagIndex].name}> opened on line ${temp[tagIndex].line}`);
          }
          // put back non-tag items if any
          for (let j = temp.length - 1; j >= 0; j--) {
            if (temp[j].type !== "tag") stack.push(temp[j]);
          }
        }
        i += closingMatch[0].length;
      } else if (match) {
        const tagName = match[1];
        // Scan for end of opening tag to see if it's self-closing
        let isSelfClosing = false;
        let depth = 0;
        let j = i;
        while (j < code.length) {
          if (code[j] === "{") depth++;
          if (code[j] === "}") depth--;
          if (depth === 0) {
            if (code.substring(j, j + 2) === "/>") {
              isSelfClosing = true;
              i = j + 1;
              break;
            }
            if (code[j] === ">") {
              i = j;
              break;
            }
          }
          j++;
        }
        if (!isSelfClosing) {
          // Ignore standard self-closing HTML tags
          const selfClosingHTML = ["img", "input", "br", "hr", "meta", "link"];
          if (!selfClosingHTML.includes(tagName.toLowerCase())) {
            stack.push({ type: "tag", name: tagName, line: lineNum });
          }
        }
      }
    }
  }
  
  console.log("\n----- REMAINING STACK -----");
  stack.forEach(item => {
    console.log(`Unclosed ${item.type === "tag" ? "<" + item.name + ">" : item.type} opened on line ${item.line}`);
  });
}

analyze();
