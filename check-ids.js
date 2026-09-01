const fs = require('fs');
const html = fs.readFileSync('index.html', 'utf8');
const files = ['new-render.txt', 'new-reader.txt'];
const skip = new Set(['h', 'React', 'window', 'document', 'localStorage', 'navigator', 'console', 'CustomEvent', 'SpeechSynthesisUtterance', 'Math', 'Date', 'JSON', 'File', 'Blob', 'setTimeout', 'setInterval', 'parseInt', 'parseFloat', 'String', 'Array', 'Object', 'Number', 'Boolean', 'Promise', 'Error', 'Infinity', 'NaN', 'undefined', 'null', 'true', 'false']);
const styleKeys = new Set(['display', 'alignItems', 'justifyContent', 'gap', 'flex', 'flexWrap', 'marginTop', 'marginBottom', 'margin', 'padding', 'paddingTop', 'fontSize', 'fontWeight', 'fontFamily', 'fontStyle', 'lineHeight', 'border', 'borderColor', 'borderBottom', 'borderRadius', 'background', 'color', 'outline', 'width', 'height', 'minWidth', 'minHeight', 'maxWidth', 'maxHeight', 'objectFit', 'position', 'top', 'left', 'right', 'bottom', 'textAlign', 'textOverflow', 'whiteSpace', 'cursor', 'resize', 'vertical', 'pointer', 'accentColor', 'transform', 'transition', 'boxShadow', 'overflow', 'zIndex', 'backdropFilter', 'letterSpacing', 'textTransform', 'animation']);
const propKeys = new Set(['type', 'value', 'checked', 'onChange', 'onClick', 'onScroll', 'onDragOver', 'onDragLeave', 'onDrop', 'placeholder', 'disabled', 'title', 'style', 'accept', 'className', 'key', 'ref', 'open', 'min', 'max', 'step', 'onClose', 'text', 'chapters', 'currentIdx', 'onChapterChange', 'theme', 'setTheme', 'font', 'setFont', 'fontSize', 'setFontSize', 'tgtLang', 'src', 'alt', 'loading', 'role', 'aria', 'id', 'tabIndex', 'readOnly', 'rows', 'cols']);
const missing = new Set();
for (const fn of files) {
  const src = fs.readFileSync(fn, 'utf8');
  const ids = [...new Set(src.match(/[A-Za-z_$][A-Za-z0-9_$]{4,}/g) || [])];
  for (const id of ids) {
    if (skip.has(id) || styleKeys.has(id) || propKeys.has(id)) continue;
    if (/^on[A-Z]/.test(id) || id.startsWith('__')) continue;
    const esc = id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const re = new RegExp('[^A-Za-z0-9_$]' + esc + '[^A-Za-z0-9_$]', 'g');
    const count = (html.match(re) || []).length;
    if (count < 2) missing.add(id + ' (' + count + ')');
  }
}
console.log(missing.size ? [...missing].sort().join('\n') : 'ALL OK');
