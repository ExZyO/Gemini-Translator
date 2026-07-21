
const fs = require('fs');
const code = fs.readFileSync('index.html', 'utf8');
const lines = code.split('\n');
let stack = [];
for (let i = 0; i < lines.length; i++) {
  let l = lines[i];
  for (let j = 0; j < l.length; j++) {
    if (l[j] === '(') stack.push({line: i+1, col: j+1});
    if (l[j] === ')') {
      let open = stack.pop();
      if (i + 1 == 1200) {
        console.log('Line 1200 ) closes ( at line ' + open.line + ' col ' + open.col);
      }
    }
  }
}

