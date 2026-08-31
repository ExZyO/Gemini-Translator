const fs = require('fs');
const code = fs.readFileSync('index.html', 'utf8');
const scripts = [...code.matchAll(/<script(?:\s+[^>]*)?>([\s\S]*?)<\/script>/gi)];

let hasError = false;
scripts.forEach((match, idx) => {
  const content = match[1].trim();
  if (!content) return;
  try {
    new Function('React', 'ReactDOM', 'lucide', content);
  } catch (e) {
    console.error(`Syntax error in script #${idx + 1}:`, e.message);
    hasError = true;
  }
});

if (!hasError) {
  console.log('Syntax is valid for all inline scripts!');
} else {
  process.exit(1);
}

