const fs = require('fs');
const root = fs.readFileSync('index.html', 'utf8');
const s = root.indexOf('    const buildPrompt = (');
const e = root.indexOf('    const translateDeepL = async');
const block = root.slice(s, e);
const skip = new Set(['h', 'React', 'window', 'document', 'localStorage', 'navigator', 'console', 'Math', 'Date', 'JSON', 'File', 'Blob', 'setTimeout', 'Promise', 'Error', 'String', 'Array', 'Object', 'Number', 'Boolean', 'parseInt', 'parseFloat', 'Infinity', 'NaN', 'undefined', 'null', 'true', 'false', 'fetch', 'AbortController', 'DOMParser', 'XMLSerializer', 'TextDecoder', 'crypto', 'structuredClone', 'performance']);
const missing = new Set();
const ids = [...new Set(block.match(/[A-Za-z_$][A-Za-z0-9_$]{4,}/g) || [])];
for (const id of ids) {
  if (skip.has(id) || /^on[A-Z]/.test(id)) continue;
  const esc = id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp('[^A-Za-z0-9_$]' + esc + '[^A-Za-z0-9_$]', 'g');
  const count = (root.match(re) || []).length;
  if (count < 2) missing.add(id + '(' + count + ')');
}
console.log(missing.size ? [...missing].sort().join('\n') : 'ALL BLOCK REFS RESOLVE');
