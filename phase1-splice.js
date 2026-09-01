const fs = require('fs');
const html = fs.readFileSync('index.html', 'utf8');
const css = fs.readFileSync('two-lights.css', 'utf8');
const reader = fs.readFileSync('new-reader.txt', 'utf8');
const render = fs.readFileSync('new-render.txt', 'utf8');

let out = html;

// 1) Fonts + design system into <head>
let headAt = out.indexOf('</head>');
if (headAt < 0) { console.error('no </head> found'); process.exit(1); }
const headBlock =
  '<link rel="preconnect" href="https://fonts.googleapis.com">\n' +
  '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n' +
  '<link href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700&family=Literata:ital,wght@0,400;0,500;0,600;1,400&family=IBM+Plex+Mono:wght@400;500&display=swap" rel="stylesheet">\n' +
  '<style>\n' + css + '\n</style>\n';
out = out.slice(0, headAt) + headBlock + out.slice(headAt);

// 2) Replace MoonReaderModal
const readerStart = '    const MoonReaderModal = ({ open, onClose, text, chapters, currentIdx, onChapterChange, theme, setTheme, font, setFont, fontSize, setFontSize, tgtLang }) => {';
const readerEnd = '    // ERROR BOUNDARY';
let s = out.indexOf(readerStart), e = out.indexOf(readerEnd);
if (s < 0 || e < 0 || e < s) { console.error('reader anchors not found:', s, e); process.exit(1); }
out = out.slice(0, s) + reader + '\n\n' + out.slice(e);

// 3) Replace the render region
const renderStart = '      // (layoutMode was referenced without a definition — restored as a render constant)';
const renderEnd = '    const root = document.getElementById(\'root\');';
s = out.indexOf(renderStart); e = out.indexOf(renderEnd);
if (s < 0 || e < 0 || e < s) { console.error('render anchors not found:', s, e); process.exit(1); }
out = out.slice(0, s) + render + '\n' + out.slice(e);

fs.writeFileSync('index.html', out);
console.log('Spliced OK. Total length:', out.length);
