const fs = require('fs');
const code = fs.readFileSync('index.html', 'utf8');
const scriptMatch = code.match(/<script type="module">([\s\S]*?)<\/script>/);
const scriptContent = scriptMatch[1].replace(/import /g, '//import ').replace(/export /g, '//export ');
try {
  new Function(scriptContent);
  console.log('Syntax is valid');
} catch (e) {
  console.log('Syntax error:', e.message);
}
