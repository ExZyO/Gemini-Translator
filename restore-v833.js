const fs = require('fs');

const www = fs.readFileSync('www/index.html', 'utf8');
let root = fs.readFileSync('index.html', 'utf8');

// 1) Extract v8.3.3 translation block: buildPrompt .. streamDeepSeek
const wwwStart = www.indexOf('    const buildPrompt = (text, srcLang, tgtLang, glossary, instructions, context, smartGlossary = true) => {');
const wwwEnd = www.indexOf('    const translateDeepL = async');
if (wwwStart < 0 || wwwEnd < 0 || wwwEnd < wwwStart) { console.error('www anchors:', wwwStart, wwwEnd); process.exit(1); }
const block = www.slice(wwwStart, wwwEnd).trimEnd();

// 2) Replace root's equivalent block (buildPrompt .. translateDeepL)
const rootStart = root.indexOf('    const buildPrompt = (');
const rootEnd = root.indexOf('    const translateDeepL = async');
if (rootStart < 0 || rootEnd < 0 || rootEnd < rootStart) { console.error('root anchors:', rootStart, rootEnd); process.exit(1); }

const stripLeak =
`
    // Strips any leaked CONTEXT_UPDATE section (model echo with any dash variant)
    const stripContextLeak = (t) => (t || '').split(/[\\n\\r]*[-—–]{2,}CONTEXT_UPDATE[-—–]{2,}[\\s\\S]*$/i)[0].trim();
`;

root = root.slice(0, rootStart) + block + stripLeak + '\n' + root.slice(rootEnd);

// 3) Dash-tolerant marker handling (kept robustness for em-dash model output)
root = root.replace(/\\n\*---CONTEXT_UPDATE---\\n\*/gi, '[\\n\\r]*[-—–]{2,}CONTEXT_UPDATE[-—–]{2,}[\\n\\r]*');
root = root.replace("text.includes('---CONTEXT_UPDATE---')", "text.includes('CONTEXT_UPDATE')");

fs.writeFileSync('index.html', root);
console.log('Restored v8.3.3 translation block. New length:', root.length);
