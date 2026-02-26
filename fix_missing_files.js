const fs = require('fs');
const path = require('path');

const projectDir = __dirname;
const epubDir = path.join(projectDir, 'EPUB-Studio');

// 1. Process splitter.js
const splitterPath = path.join(epubDir, 'splitter.js');
let splitterContent = fs.readFileSync(splitterPath, 'utf8');
splitterContent = `window.initSplitter = function() {\n${splitterContent}\n};\n`;
fs.writeFileSync(path.join(projectDir, 'splitter.js'), splitterContent);

// 2. Process merger.js
const mergerPath = path.join(epubDir, 'merger.js');
let mergerContent = fs.readFileSync(mergerPath, 'utf8');
mergerContent = `window.initMerger = function() {\n${mergerContent}\n};\n`;
fs.writeFileSync(path.join(projectDir, 'merger.js'), mergerContent);

// 3. Extract epub_studio_ui.js
const htmlPath = path.join(epubDir, 'index.html');
const htmlContent = fs.readFileSync(htmlPath, 'utf8');

const extractSection = (content, startMarker, endMarker) => {
    const startIndex = content.indexOf(startMarker);
    const endIndex = content.indexOf(endMarker, startIndex);
    if (startIndex !== -1 && endIndex !== -1) {
        return content.substring(startIndex, endIndex + endMarker.length);
    }
    return '';
};

// We need the split-tab, merge-tab, and modal
const splitHtml = extractSection(htmlContent, '<!-- ================ SPLIT TAB ================ -->', '<!-- ================ END SPLIT TAB ================ -->')
    .replace(/id="split-tab"/g, 'id="epub-split-tab"'); // rename ID to avoid conflicts if needed, but not strictly required

const mergeHtml = extractSection(htmlContent, '<!-- ================ MERGE TAB ================ -->', '<!-- ================ END MERGE TAB ================ -->')
    .replace(/id="merge-tab"/g, 'id="epub-merge-tab"');

const modalHtml = extractSection(htmlContent, '<!-- PREVIEW MODAL -->', '</div>\n    </div>\n</div>');

const uiJsContent = `
export const splitTabHtml = \`${splitHtml.replace(/`/g, '\\`').replace(/\\$/g, '\\\\$')}\`;
export const mergeTabHtml = \`${mergeHtml.replace(/`/g, '\\`').replace(/\\$/g, '\\\\$')}\`;
export const modalHtml = \`${modalHtml.replace(/`/g, '\\`').replace(/\\$/g, '\\\\$')}\`;
`;

fs.writeFileSync(path.join(projectDir, 'epub_studio_ui.js'), uiJsContent.trim() + '\n');
console.log('Successfully generated splitter.js, merger.js, and epub_studio_ui.js');
