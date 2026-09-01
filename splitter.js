
function extractTocEntriesFromXml(xmlText) {
    const map = new Map();
    if (!xmlText) return map;

    // 1. Robust NCX tree parser preserving chapter hierarchy (4 -> 1, 2, 3 -> 4.1, 4.2, 4.3)
    try {
        const parser = new DOMParser();
        const doc = parser.parseFromString(xmlText, 'application/xml');
        const navPoints = Array.from(doc.getElementsByTagName('navPoint'));

        navPoints.forEach(np => {
            const contentEl = Array.from(np.children).find(c => c.tagName.toLowerCase() === 'content') || np.querySelector('content');
            const textEl = np.querySelector('navLabel > text');
            if (contentEl && textEl) {
                const src = (contentEl.getAttribute('src') || '').split('#')[0].trim();
                let label = textEl.textContent.trim();

                // If label is just "1", "2", "3", check parent chapter for decimal notation (e.g. Chapter 4 -> 4.1, 4.2)
                if (/^\d+$/.test(label) || /^Part\s*\d+$/i.test(label)) {
                    const parentNp = np.parentElement?.closest('navPoint');
                    const parentLabel = parentNp?.querySelector('navLabel > text')?.textContent || '';
                    const pMatch = parentLabel.match(/(?:Chapter|Ch\.?)\s*(\d+)/i);
                    if (pMatch) {
                        const num = label.replace(/\D/g, '');
                        label = `${pMatch[1]}.${num}`;
                    }
                }

                if (src && label && !isMachineFilename(label)) {
                    const fname = src.split('/').pop();
                    map.set(src, label);
                    map.set(fname, label);
                }
            }
        });
    } catch (e) {}

    // Fallback regex scan for anything missed
    const itemRegex = /<navPoint[^>]*>[\s\S]*?<navLabel>[\s\S]*?<text>([\s\S]*?)<\/text>[\s\S]*?<\/navLabel>[\s\S]*?<content[^>]*src="([^"]*)"/gi;
    let match;
    while ((match = itemRegex.exec(xmlText)) !== null) {
        const label = match[1].replace(/<[^>]*>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").trim();
        const src = match[2].split('#')[0].trim();
        if (src && label && !isMachineFilename(label)) {
            const fname = src.split('/').pop();
            if (!map.has(src)) map.set(src, label);
            if (!map.has(fname)) map.set(fname, label);
        }
    }

    const navLinkRegex = /<a[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi;
    while ((match = navLinkRegex.exec(xmlText)) !== null) {
        const src = match[1].split('#')[0].trim();
        const label = match[2].replace(/<[^>]*>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").trim();
        if (src && label && !isMachineFilename(label)) {
            const fname = src.split('/').pop();
            if (!map.has(src)) map.set(src, label);
            if (!map.has(fname)) map.set(fname, label);
        }
    }

    return map;
}

let splitTocMap = new Map();

function escapeXml(unsafe) {
    if (!unsafe) return '';
    return String(unsafe)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
}

// Rewrites TOC (toc.ncx / nav.xhtml) and internal Chapter XHTML headings (<title> and <h1>)
async function applyCleanTitlesToZip(newZip, newOpfDoc, survivingChapters, splitOpfDir) {
    const parser = new DOMParser();
    const serializer = new XMLSerializer();

    const chapMapByOriginal = new Map();
    const chapMapByFilename = new Map();

    survivingChapters.forEach(c => {
        const clean = (c.customName || c.originalName || '').trim();
        if (clean) {
            chapMapByOriginal.set(c.originalName, clean);
            const fname = (c.originalName || '').split('/').pop();
            chapMapByFilename.set(fname, clean);
        }
    });

    // 1. Rewrite Chapter Headings inside every surviving Chapter XHTML file
    for (let c of survivingChapters) {
        const fullPath = splitOpfDir + c.originalName;
        const cleanTitle = (c.customName || '').trim();
        if (!cleanTitle) continue;

        if (newZip.files[fullPath]) {
            try {
                let html = await newZip.files[fullPath].async('text');
                
                // A. Update or inject <title> tag
                if (/<title[^>]*>[\s\S]*?<\/title>/i.test(html)) {
                    html = html.replace(/<title[^>]*>[\s\S]*?<\/title>/i, `<title>${escapeXml(cleanTitle)}</title>`);
                } else if (html.includes('<head>')) {
                    html = html.replace('<head>', `<head><title>${escapeXml(cleanTitle)}</title>`);
                }

                // B. Update top <h1>, <h2>, <h3> or <p class="chapter-title">
                if (/<h1[^>]*>[\s\S]*?<\/h1>/i.test(html)) {
                    html = html.replace(/<h1[^>]*>[\s\S]*?<\/h1>/i, `<h1>${escapeXml(cleanTitle)}</h1>`);
                } else if (/<h2[^>]*>[\s\S]*?<\/h2>/i.test(html)) {
                    html = html.replace(/<h2[^>]*>[\s\S]*?<\/h2>/i, `<h2>${escapeXml(cleanTitle)}</h2>`);
                } else if (/<p[^>]*class="[^"]*(?:title|chapter|head)[^"]*"[^>]*>[\s\S]*?<\/p>/i.test(html)) {
                    html = html.replace(/<p([^>]*class="[^"]*(?:title|chapter|head)[^"]*"[^>]*)>[\s\S]*?<\/p>/i, `<p$1>${escapeXml(cleanTitle)}</p>`);
                }

                newZip.file(fullPath, html);
            } catch (e) { console.warn('Failed to rewrite chapter html title:', e); }
        }
    }

    // 2. Rewrite EPUB 2 NCX Table of Contents (toc.ncx)
    const ncxItem = newOpfDoc.querySelector('item[media-type="application/x-dtbncx+xml"]');
    if (ncxItem) {
        const ncxHref = ncxItem.getAttribute('href');
        const ncxFullPath = splitOpfDir + ncxHref;
        if (newZip.files[ncxFullPath]) {
            try {
                const ncxXml = await newZip.files[ncxFullPath].async('text');
                const ncxDoc = parser.parseFromString(ncxXml, 'application/xml');
                const navPoints = Array.from(ncxDoc.querySelectorAll('navPoint'));
                let playOrder = 1;

                navPoints.forEach(np => {
                    const src = np.querySelector('content')?.getAttribute('src') || '';
                    const cleanSrc = src.split('#')[0].trim();
                    const fname = cleanSrc.split('/').pop();

                    let cleanTitle = chapMapByFilename.get(fname) || chapMapByOriginal.get(cleanSrc);
                    if (cleanTitle) {
                        const textNode = np.querySelector('navLabel > text');
                        if (textNode) textNode.textContent = cleanTitle;
                        np.setAttribute('playOrder', String(playOrder++));
                    } else {
                        // If not in surviving chapters, remove navPoint from TOC
                        np.parentNode?.removeChild(np);
                    }
                });

                newZip.file(ncxFullPath, serializer.serializeToString(ncxDoc));
            } catch (e) { console.warn('Failed to rewrite toc.ncx:', e); }
        }
    }

    // 3. Rewrite EPUB 3 Navigation Document (nav.xhtml / toc.xhtml)
    const navItem = newOpfDoc.querySelector('item[properties~="nav"]') || newOpfDoc.querySelector('item[id*="nav"]') || newOpfDoc.querySelector('item[id*="toc"]');
    if (navItem) {
        const navHref = navItem.getAttribute('href');
        const navFullPath = splitOpfDir + navHref;
        if (newZip.files[navFullPath]) {
            try {
                const navXml = await newZip.files[navFullPath].async('text');
                const navDoc = parser.parseFromString(navXml, 'application/xml');
                const links = Array.from(navDoc.querySelectorAll('a[href]'));

                links.forEach(a => {
                    const href = (a.getAttribute('href') || '').split('#')[0].trim();
                    const fname = href.split('/').pop();
                    let cleanTitle = chapMapByFilename.get(fname) || chapMapByOriginal.get(href);
                    if (cleanTitle) {
                        a.textContent = cleanTitle;
                    } else {
                        const li = a.closest('li');
                        if (li) li.parentNode?.removeChild(li);
                    }
                });

                newZip.file(navFullPath, serializer.serializeToString(navDoc));
            } catch (e) { console.warn('Failed to rewrite nav.xhtml:', e); }
        }
    }
}


function formatTelemetryDuration(ms) {
    if (!ms || ms < 0) return '0s';
    const totalSec = ms / 1000;
    if (totalSec < 60) return totalSec.toFixed(1) + 's';
    const mins = Math.floor(totalSec / 60);
    const secs = Math.round(totalSec % 60);
    return mins + 'm ' + (secs > 0 ? secs + 's' : '');
}

function calcTocCost(pTok, oTok, model, prov) {
    if (window.calculateRealCost) return window.calculateRealCost(pTok, oTok, model, prov);
    let inM = 0.075, outM = 0.30;
    if (prov === 'deepseek') { inM = 0.14; outM = 0.28; }
    else if (model.includes('flash-lite') || model.includes('8b')) { inM = 0.0375; outM = 0.15; }
    else if (model.includes('pro')) { inM = 1.25; outM = 5.00; }
    const cost = ((pTok / 1e6) * inM) + ((oTok / 1e6) * outM);
    return cost < 0.0001 && cost > 0 ? '$0.0001' : '$' + cost.toFixed(4);
}

function isMachineFilename(s) {
    if (!s) return true;
    const clean = s.trim().toLowerCase();
    return /^(?:b\d+_)?(?:part\d+|section[-_]?\d+|page[-_]?\d+|split[-_]?\d+|text[-_]?\d+|item[-_]?\d+|ch\d+|chapter[-_]?\d+)\.(?:xhtml|html)$/i.test(clean) ||
           /^(?:b\d+_)?(?:part\d+|section[-_]?\d+|page[-_]?\d+|split[-_]?\d+|text[-_]?\d+|item[-_]?\d+)$/i.test(clean);
}

function cleanChapterTitleString(raw, fallbackIndex) {
    if (!raw) return 'Chapter ' + fallbackIndex;
    let s = raw.trim();

    // Remove file paths and extensions (.xhtml, .html)
    s = s.replace(/^.*[\\\/]/, '');
    s = s.replace(/\.(?:xhtml|html|xml)$/i, '');

    // Strip b1_, b2_, b29_ prefixes from merged EPUBs
    s = s.replace(/^b\d+_/i, '');

    // Replace underscores with spaces if it looks like a filename
    if (s.includes('_')) s = s.replace(/_/g, ' ');

    // Normalize whitespace
    s = s.replace(/\s+/g, ' ').trim();

    // Preserve official Light Novel sub-chapter format: "1.1", "7.1", "7.2"
    if (/^\d+\.\d+$/.test(s)) {
        return s;
    }

    // Preserve official Light Novel epilogue sub-chapter format: "E.1", "E.2", "E.3"
    if (/^E\.?\s*(\d+)$/i.test(s)) {
        const num = s.match(/^E\.?\s*(\d+)/i)[1];
        return 'E.' + num;
    }

    // Clean up "Image2", "Image 2" -> "Illustration 2"
    if (/^Image\s*(\d+)(?:[-_]?(\d+))?$/i.test(s)) {
        return s.replace(/^Image\s*(\d+)(?:[-_]?(\d+))?/i, (m, p1, p2) => p2 ? `Illustration ${p1}-${p2}` : `Illustration ${p1}`);
    }

    // Clean up "insert1", "insert 12" -> "Illustration 1", "Illustration 12"
    if (/^insert\s*(\d+)$/i.test(s)) {
        const num = s.match(/^insert\s*(\d+)/i)[1];
        return 'Illustration ' + num;
    }

    // Clean up "part0001" -> "Part 1"
    if (/^part\d+$/i.test(s)) {
        const num = parseInt(s.replace(/\D/g, ''), 10);
        return 'Part ' + (isNaN(num) ? fallbackIndex : num);
    }
    if (/^section[-_]?\d+$/i.test(s) || /^page[-_]?\d+$/i.test(s)) {
        return 'Chapter ' + fallbackIndex;
    }

    // Check for special Light Novel / Anthology structures (Volumes, Years, Arcs, Prologues, etc.)
    const isSpecialSection = /^(?:year\s*\d+|volume\s*\d+|vol\s*\d+|book\s*\d+|arc\s*\d+|prologue|epilogue|interlude|monologue|afterword|synopsis|illustration|illustrations|side\s*story|\bss\b|part\s*\d+|extra|character\s*intro|short\s*story)/i.test(s);

    if (isSpecialSection) {
        s = s.replace(/^(Year\s*\d+)[,\s]+(Volume\s*[\d\.]+)[,\s:\-]*(.*)$/i, (m, y, v, rest) => {
            return rest ? `${y}, ${v} - ${rest.trim()}` : `${y}, ${v}`;
        });
        s = s.replace(/^(Volume\s*[\d\.]+)[,\s:\-]+(?:Volume\s*[\d\.]+)?[,\s:\-]*(.*)$/i, (m, v, rest) => {
            return rest ? `${v} - ${rest.trim()}` : v;
        });
        s = s.replace(/^Illustration(?:s)?\s*#?(\d+)/i, 'Illustration $1');
        s = s.replace(/^Part\s*(\d+)[\s:\.\-]+(.*)$/i, (m, p, rest) => rest ? `Part ${p} - ${rest}` : `Part ${p}`);
        return s;
    }

    // Strip leading scrape numbers like "0003 4 Chapter 4" or "0000 1 Chapter 1"
    s = s.replace(/^(?:\d+[\s\.\-_]+)+(?:Chapter|\bCh\b)/i, 'Chapter');

    // Pattern: "136: Chapter 136 - 136: Clash of brawn and brain"
    // "Chapter 4 - 4: Gu Yue Fang Yuan" or "Chapter 4 - 4 Gu Yue Fang Yuan"
    s = s.replace(/^\d+[\s:\.\-]+(?:Chapter|\bCh\b)\s*(\d+)[\s:\.\-]+(?:\d+[\s:\.\-]+)?/i, 'Chapter $1 - ');
    s = s.replace(/^(?:Chapter|\bCh\b)\s*(\d+)[\s:\.\-]+(?:\d+[\s:\.\-]+)?/i, 'Chapter $1 - ');
    s = s.replace(/^(?:Chapter|\bCh\b)\s*(\d+)\s*[:\-]\s*(?:Chapter|\bCh\b)\s*\1\s*[:\-]\s*/i, 'Chapter $1 - ');

    // Strip multiple dashes or colons
    s = s.replace(/^Chapter\s*(\d+)\s*[\-:]\s*[\-:]\s*/i, 'Chapter $1 - ');
    s = s.replace(/^Chapter\s*(\d+)\s*-\s*:\s*/i, 'Chapter $1 - ');
    s = s.replace(/^Chapter\s*(\d+)\s*:\s*-\s*/i, 'Chapter $1 - ');

    // If it starts with just a number like "0004 Title" or "4. Title"
    if (/^\d+[\.\-:]\s+/.test(s)) {
        const num = s.match(/^(\d+)/)[1];
        const rest = s.replace(/^\d+[\.\-:]\s+/, '');
        s = 'Chapter ' + parseInt(num, 10) + ' - ' + rest;
    }

    // Clean trailing junk
    s = s.trim().replace(/^Chapter\s*(\d+)\s*[\-:]\s*$/i, 'Chapter $1');

    return s || ('Chapter ' + fallbackIndex);
}

function extractHeadingFromXhtml(html, fallbackIndex, tocTitle = '') {
    if (tocTitle && !isMachineFilename(tocTitle)) {
        return cleanChapterTitleString(tocTitle, fallbackIndex);
    }
    if (!html) return 'Chapter ' + fallbackIndex;

    const lower = html.toLowerCase();

    // 1. Check for Image / Illustration pages (Inspect image attributes specifically, not <title> in <head>)
    if (lower.includes('<img') || lower.includes('<image')) {
        const textOnly = html.replace(/<head[\s\S]*?<\/head>/gi, '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
        if (textOnly.length < 60) {
            const imgMatch = html.match(/<(?:img|image)[^>]*?(?:src|href)="([^"]*)"[^>]*>/i);
            const imgSrc = (imgMatch ? imgMatch[1] : '').toLowerCase();
            const imgClass = (html.match(/class="([^"]*)"/i) || ['', ''])[1].toLowerCase();
            const combined = imgSrc + ' ' + imgClass;
            if (/cover/i.test(combined)) return 'Cover';
            if (/title[-_]?page|titlepage/i.test(combined)) return 'Title Page';
            if (/color|gallery|insert|illust|plate/i.test(combined)) return 'Illustrations';
            return 'Illustration';
        }
    }

    // 2. Check for Copyright / Credits pages
    if (lower.includes('all rights reserved') || lower.includes('isbn') || (lower.includes('copyright') && lower.includes('published'))) {
        return 'Credits and Copyright';
    }

    // 3. Check for Table of Contents page
    if (/<(?:h1|h2|h3|p)[^>]*>\s*(?:Table of Contents|Contents)\s*<\//i.test(html)) {
        return 'Table of Contents';
    }

    // 4. Look for h1, h2, h3, h4 tags
    const hMatch = html.match(/<(?:h1|h2|h3|h4)[^>]*>([\s\S]*?)<\/(?:h1|h2|h3|h4)>/i);
    if (hMatch) {
        const clean = hMatch[1].replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
        if (clean.length > 1 && clean.length < 140 && !isMachineFilename(clean)) {
            return cleanChapterTitleString(clean, fallbackIndex);
        }
    }

    // 5. Look for multi-line chapter headings: e.g. <p class="chapter-number">Chapter 1</p><p class="chapter-title">Title</p>
    const multiMatch = html.match(/<p[^>]*class="[^"]*(?:chapter[-_]?num|c[-_]?num)[^"]*"[^>]*>([\s\S]*?)<\/p>\s*<p[^>]*class="[^"]*(?:chapter[-_]?title|c[-_]?title)[^"]*"[^>]*>([\s\S]*?)<\/p>/i);
    if (multiMatch) {
        const numPart = multiMatch[1].replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
        const titlePart = multiMatch[2].replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
        if (numPart || titlePart) {
            const combined = numPart && titlePart ? `${numPart} - ${titlePart}` : (numPart || titlePart);
            return cleanChapterTitleString(combined, fallbackIndex);
        }
    }

    // 6. Look for class containing title/chapter/heading/c-title/calibre
    const pMatch = html.match(/<(?:p|div|span)[^>]*class="[^"]*(?:title|chapter|head|calibre_title|heading|c-title|c-head)[^"]*"[^>]*>([\s\S]*?)<\/(?:p|div|span)>/i);
    if (pMatch) {
        const clean = pMatch[1].replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
        if (clean.length > 1 && clean.length < 140 && !isMachineFilename(clean)) {
            return cleanChapterTitleString(clean, fallbackIndex);
        }
    }

    // 7. Look for bold/strong at top of body
    const bMatch = html.match(/<(?:b|strong)[^>]*>([\s\S]*?)<\/(?:b|strong)>/i);
    if (bMatch) {
        const clean = bMatch[1].replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
        if (clean.length > 2 && clean.length < 100 && !isMachineFilename(clean) && !clean.includes('http')) {
            return cleanChapterTitleString(clean, fallbackIndex);
        }
    }

    // 8. Look for title tag if meaningful
    const tMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    if (tMatch) {
        const clean = tMatch[1].replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
        if (clean.length > 1 && clean.length < 140 && !isMachineFilename(clean)) {
            return cleanChapterTitleString(clean, fallbackIndex);
        }
    }

    return 'Chapter ' + fallbackIndex;
}

function formatWordStat(count) {
    if (!count || count <= 0) return '0 words';
    if (count >= 1000000) {
        return `${(count / 1000000).toFixed(2).replace(/\.00$/, '')}M words`;
    }
    if (count >= 10000) {
        return `${(count / 1000).toFixed(1).replace(/\.0$/, '')}k words`;
    }
    if (count >= 1000) {
        return `${count.toLocaleString()} words`;
    }
    return `${count} words`;
}

window.initSplitter = function() {
let splitMasterZip = null;
let splitOpfPath = "";
let splitOpfDir = "";
let splitOpfDoc = null;
let allItems = [];
let spineItems = [];
let storyChapters = [];
let frontMatter = [];
let baseBookTitle = "Unknown Title";

let splitCustomCoverFile = null;
const splitCoverInput = document.getElementById('split-cover-input');
const btnSplitCover = document.getElementById('btn-split-cover');
const btnRemoveSplitCover = document.getElementById('btn-remove-split-cover');
const splitCoverPreview = document.getElementById('split-cover-preview');
const splitTitleInput = document.getElementById('split-title-input');

btnSplitCover.addEventListener('click', () => splitCoverInput.click());
splitCoverPreview.addEventListener('click', () => splitCoverInput.click());

splitCoverInput.addEventListener('change', (e) => {
    if (e.target.files && e.target.files[0]) {
        splitCustomCoverFile = e.target.files[0];
        const reader = new FileReader();
        reader.onload = (event) => {
            splitCoverPreview.innerHTML = `<img src="${event.target.result}" class="w-full h-full object-cover">`;
            btnRemoveSplitCover.classList.remove('hidden');
        };
        reader.readAsDataURL(splitCustomCoverFile);
    }
});

btnRemoveSplitCover.addEventListener('click', () => {
    splitCustomCoverFile = null;
    splitCoverInput.value = '';
    splitCoverPreview.innerHTML = `<span class="text-xs text-slate-400 text-center px-2">Current<br>Cover</span>`;
    btnRemoveSplitCover.classList.add('hidden');
});

// Added target checks to prevent click bubbling
document.getElementById('upload-section').addEventListener('click', (e) => {
    if (e.target !== document.getElementById('epub-input')) {
        document.getElementById('epub-input').click();
    }
});

document.getElementById('epub-input').addEventListener('change', (e) => {
    if (e.target.files.length > 0) processSplitFile(e.target.files[0]);
});

window.processSplitFile = processSplitFile;
async function processSplitFile(file) {
    // Show loading progress for large files
    const loadingWrapper = document.getElementById('loading-progress-wrapper');
    const loadingBar = document.getElementById('loading-progress-bar');
    const loadingPercent = document.getElementById('loading-progress-percent');
    const loadingStatus = document.getElementById('loading-progress-status');

    // Memory pressure warning for very large files
    const fileSizeMB = (file.size / (1024 * 1024)).toFixed(1);
    if (fileSizeMB > 100) {
        showToast(`Large file detected (${fileSizeMB}MB). Processing may use significant RAM.`, 'warn');
    }

    if (loadingWrapper) {
        loadingWrapper.classList.remove('hidden');
        loadingStatus.textContent = `Loading ${fileSizeMB}MB EPUB...`;
    }

    document.getElementById('editor-section').classList.add('hidden');

    const logEl = document.getElementById('status-log');
    logEl.innerHTML = '<div class="text-indigo-400">> System ready. Unpacking EPUB...</div>';

    try {
        splitMasterZip = await new JSZip().loadAsync(file, {
            // JSZip doesn't natively support loadAsync progress, so we use a wrapper
        });

        const containerXml = await splitMasterZip.file("META-INF/container.xml").async("text");
        const parser = new DOMParser();
        splitOpfPath = parser.parseFromString(containerXml, "text/xml").querySelector("rootfile").getAttribute("full-path");
        splitOpfDir = splitOpfPath.includes("/") ? splitOpfPath.substring(0, splitOpfPath.lastIndexOf('/') + 1) : "";

        const opfText = await splitMasterZip.file(splitOpfPath).async("text");
        splitOpfDoc = parser.parseFromString(opfText, "text/xml");

        // Set dynamic title input
        const titleNode = splitOpfDoc.getElementsByTagName("dc:title")[0];
        if (titleNode) baseBookTitle = titleNode.textContent;
        splitTitleInput.value = baseBookTitle;

        try {
            let coverItem = splitOpfDoc.querySelector('item[properties~="cover-image"]');
            if (!coverItem) {
                const metaCover = splitOpfDoc.querySelector('meta[name="cover"]');
                if (metaCover) {
                    const coverId = metaCover.getAttribute("content");
                    coverItem = splitOpfDoc.querySelector(`item[id="${coverId}"]`);
                }
            }
            if (!coverItem) {
                coverItem = Array.from(splitOpfDoc.querySelectorAll('item[media-type^="image"]')).find(item => {
                    const h = (item.getAttribute('href') || '').toLowerCase();
                    const id = (item.getAttribute('id') || '').toLowerCase();
                    return h.includes('cover') || id.includes('cover');
                });
            }

            if (coverItem) {
                let coverHref = coverItem.getAttribute("href");
                if (coverHref.startsWith('../')) coverHref = coverHref.replace('../', '');
                const fullCoverPath = splitOpfDir + coverHref;
                const coverFile = splitMasterZip.file(fullCoverPath);
                if (coverFile) {
                    const coverBlob = await coverFile.async("blob"); // Use blob instead of base64
                    const blobUrl = URL.createObjectURL(coverBlob);
                    splitCoverPreview.innerHTML = `<img src="${blobUrl}" class="w-full h-full object-cover">`;

                }
            }
        } catch (e) {
            console.log("Cover preview fallback used or no cover found.");
        }

        allItems = Array.from(splitOpfDoc.querySelectorAll("manifest > item")).map(el => ({
            id: el.getAttribute("id"),
            href: el.getAttribute("href"),
            mediaType: el.getAttribute("media-type")
        }));

        const spineNodes = Array.from(splitOpfDoc.querySelectorAll("spine > itemref"));
        spineItems = spineNodes.map(el => el.getAttribute("idref"));

        storyChapters = [];
        frontMatter = [];

        spineItems.forEach((idref, index) => {
            const item = allItems.find(i => i.id === idref);
            if (!item) return;

            const textCheck = (item.href + idref).toLowerCase();
            // Smarter front matter detection with configurable patterns
            const isFrontMatter = /cover|title[-_]?page|copyright|dedication|acknowledgment|toc|nav[-_]?doc|preface|foreword|front[-_]?matter|half[-_]?title|series[-_]?page|about[-_]?author|epigraph|also[-_]?by/.test(textCheck);

            if (isFrontMatter) {
                frontMatter.push({ idref, item, index, originalName: item.href });
            } else {
                storyChapters.push({ idref, item, index, originalName: item.href, displayIndex: storyChapters.length + 1 });
            }
        });

        // Compute word count + file size for each chapter
        let totalSplitWords = 0;
        for (let chap of storyChapters) {
            const fullPath = splitOpfDir + chap.originalName;
            const f = splitMasterZip.files[fullPath];
            chap.fileSize = 0;
            chap.wordCount = 0;
            if (f) {
                if (f._data && f._data.uncompressedSize) chap.fileSize = f._data.uncompressedSize;
                try {
                    const txt = await f.async('text');
                    const stripped = txt.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
                    const cjk = (stripped.match(/[\u4e00-\u9fa5\u3040-\u30ff\uac00-\ud7af]/g) || []).length;
                    const nonCjk = (stripped.replace(/[\u4e00-\u9fa5\u3040-\u30ff\uac00-\ud7af]/g, ' ').match(/\b\w+\b/g) || []).length;
                    chap.wordCount = cjk + nonCjk;
                    totalSplitWords += chap.wordCount;

                    // Auto-extract real chapter heading using original TOC map or internal XHTML
                    const fname = (chap.originalName || '').split('/').pop();
                    const tocTitle = splitTocMap.get(chap.originalName) || splitTocMap.get(fname) || '';
                    const extracted = extractHeadingFromXhtml(txt, chap.displayIndex, tocTitle);
                    if (extracted && extracted !== chap.originalName && !isMachineFilename(extracted)) {
                        chap.customName = extracted;
                    }
                } catch (e) { /* skip */ }
            }
        }

        const fileSizeMB = (file.size / (1024 * 1024)).toFixed(1);
        const wordText = formatWordStat(totalSplitWords);
        const statsBadgeText = `1 book · ${storyChapters.length} ch · ${wordText} · ${fileSizeMB} MB`;

        const chapCountEl = document.getElementById('chapter-count');
        if (chapCountEl) chapCountEl.textContent = statsBadgeText;

        const summaryStatsEl = document.getElementById('split-stats-summary');
        if (summaryStatsEl) summaryStatsEl.textContent = statsBadgeText;

        const listEl = document.getElementById('chapter-list');
        listEl.innerHTML = '';
        storyChapters.forEach(chap => {
            const sizeStr = chap.fileSize > 1024 ? `${(chap.fileSize / 1024).toFixed(0)}KB` : `${chap.fileSize}B`;
            const wcStr = chap.wordCount > 0 ? formatWordStat(chap.wordCount) : '';
            const div = document.createElement('div');
            div.className = "flex items-center gap-2.5 py-2 px-2 rounded-lg hover:bg-slate-100/70 dark:hover:bg-slate-800/50 transition-colors chap-row";
            div.setAttribute('data-idref', chap.idref);
            div.innerHTML = `
                <input type="checkbox" id="chk-${chap.idref}" value="${chap.idref}" class="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 cursor-pointer chap-checkbox accent-indigo-600 shrink-0" checked>
                <label for="chk-${chap.idref}" class="flex-1 cursor-pointer min-w-0 flex items-center justify-between gap-2">
                    <div class="truncate">
                        <span class="font-bold text-slate-800 dark:text-slate-200">#${chap.displayIndex}</span>
                        <span class="chap-name text-slate-600 dark:text-slate-400 ml-1 break-all whitespace-normal font-medium" data-idref="${chap.idref}" title="Double-click to rename, click to preview">${chap.customName || chap.originalName}</span>
                    </div>
                    <span class="text-[10px] text-slate-400 font-medium shrink-0">${sizeStr}${wcStr ? ' · ' + wcStr : ''}</span>
                </label>
            `;
            // Click chapter name to preview
            const nameSpan = div.querySelector('.chap-name');
            nameSpan.addEventListener('click', async (e) => {
                e.preventDefault();
                e.stopPropagation();
                const fullPath = splitOpfDir + chap.originalName;
                const f = splitMasterZip.files[fullPath];
                if (!f) return;
                try {
                    const html = await f.async('text');
                    const stripped = html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
                    const preview = stripped.substring(0, 2000) + (stripped.length > 2000 ? '...' : '');
                    document.getElementById('preview-modal-title').textContent = `#${chap.displayIndex} — ${chap.customName || chap.originalName}`;
                    document.getElementById('preview-modal-body').textContent = preview;
                    document.getElementById('chapter-preview-modal').classList.remove('hidden');
                } catch (err) { showToast('Cannot preview', 'error'); }
            });
            // Double-click to rename chapter
            nameSpan.addEventListener('dblclick', (e) => {
                e.preventDefault();
                e.stopPropagation();
                const input = document.createElement('input');
                input.type = 'text';
                input.value = chap.customName || chap.originalName;
                input.className = 'w-full bg-white dark:bg-slate-800 border border-indigo-400 rounded px-2 py-0.5 text-sm font-medium text-slate-800 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500';
                nameSpan.replaceWith(input);
                input.focus();
                input.select();
                const finishRename = () => {
                    const newName = input.value.trim();
                    if (newName) chap.customName = newName;
                    const newSpan = document.createElement('span');
                    newSpan.className = 'chap-name text-slate-500 dark:text-slate-400 ml-1 break-all whitespace-normal';
                    newSpan.setAttribute('data-idref', chap.idref);
                    newSpan.setAttribute('title', 'Double-click to rename, click to preview');
                    newSpan.textContent = chap.customName || chap.originalName;
                    input.replaceWith(newSpan);
                };
                input.addEventListener('blur', finishRename);
                input.addEventListener('keydown', (ev) => {
                    if (ev.key === 'Enter') input.blur();
                    if (ev.key === 'Escape') { input.value = chap.customName || chap.originalName; input.blur(); }
                });
            });
            listEl.appendChild(div);
        });

                const updateCount = () => {
            const checked = Array.from(document.querySelectorAll('.chap-checkbox:checked'));
            const previewEl = document.getElementById('preview-count');
            if (!previewEl) return;
            if (checked.length === 0) {
                previewEl.textContent = '0 selected';
                return;
            }
            let selWords = 0;
            let selBytes = 0;
            checked.forEach(cb => {
                const chap = storyChapters.find(c => c.idref === cb.value);
                if (chap) {
                    selWords += (chap.wordCount || 0);
                    selBytes += (chap.fileSize || 0);
                }
            });
            const wLabel = formatWordStat(selWords);
            const mbLabel = (selBytes / (1024 * 1024)).toFixed(1);
            previewEl.textContent = `${checked.length} / ${storyChapters.length} selected · ${wLabel} · ${mbLabel} MB`;
        };
        document.querySelectorAll('.chap-checkbox').forEach(cb => cb.addEventListener('change', updateCount));
        updateCount();

        // Populate metadata viewer
        try {
            const mc = document.getElementById('metadata-content');
            const mv = document.getElementById('metadata-viewer');
            if (mc && mv) {
                const getTag = (tag) => { const el = splitOpfDoc.getElementsByTagName(tag)[0]; return el ? el.textContent : '—'; };
                const descEl = splitOpfDoc.getElementsByTagName('dc:description')[0];
                const desc = descEl ? descEl.textContent.substring(0, 200) : '—';
                mc.innerHTML = `
                    <div><span class="text-slate-500">Author:</span> <span class="font-medium text-white">${getTag('dc:creator')}</span></div>
                    <div><span class="text-slate-500">Publisher:</span> <span class="font-medium text-white">${getTag('dc:publisher')}</span></div>
                    <div><span class="text-slate-500">Language:</span> <span class="font-medium text-white">${getTag('dc:language')}</span></div>
                    <div><span class="text-slate-500">Date:</span> <span class="font-medium text-white">${getTag('dc:date')}</span></div>
                    <div class="col-span-2 sm:col-span-4"><span class="text-slate-500">Description:</span> <span class="font-medium text-white">${desc}</span></div>
                `;
                mv.classList.remove('hidden');
            }
        } catch (e) { /* no metadata */ }

        document.getElementById('btn-toggle-metadata')?.addEventListener('click', () => {
            document.getElementById('metadata-viewer').classList.toggle('hidden');
        });

        logMsg("EPUB Loaded and parsed successfully.");
        logMsg(`File size: ${fileSizeMB}MB | ${storyChapters.length} chapters`);

        // Hide loading, show editor
        if (loadingWrapper) loadingWrapper.classList.add('hidden');
        document.getElementById('upload-section').classList.add('hidden');
        document.getElementById('editor-section').classList.remove('hidden');

        // Calculate and display estimated output size
        updateEstimatedSize();

    } catch (err) {
        console.error(err);
        if (loadingWrapper) loadingWrapper.classList.add('hidden');
        showToast("Failed to parse EPUB.", "error");
    }
}

async function executeSplit(selectedIdrefs, rangeSuffix) {
    logMsg(`Starting export...`);
    const btnCustom = document.getElementById('btn-export-custom');
    btnCustom.disabled = true;

    try {
        const newZip = new JSZip();
        newZip.file("mimetype", "application/epub+zip", { compression: "STORE" });

        const allowedIdrefs = new Set([...frontMatter.map(f => f.idref), ...selectedIdrefs]);
        const allowedHrefs = new Set();

        allItems.forEach(item => {
            if (allowedIdrefs.has(item.id)) allowedHrefs.add(item.href);
            else if (!item.mediaType.includes('html')) allowedHrefs.add(item.href);
        });

        // If "Keep Only Text" is checked, strip non-HTML assets
        const keepOnlyText = document.getElementById('keep-only-text')?.checked;

        
        // --- Asset Tree-Shaking ---
        const treeShakeEnabled = document.getElementById('asset-tree-shake')?.checked;
        const referencedAssets = new Set();
        if (treeShakeEnabled && !keepOnlyText) {
            for (let chap of storyChapters) {
                if (allowedIdrefs.has(chap.idref)) {
                    const fullPath = splitOpfDir + chap.originalName;
                    const f = splitMasterZip.files[fullPath];
                    if (f) {
                        try {
                            const content = await f.async('text');
                            const matches = content.match(/(?:src|href|xlink:href)\s*=\s*["']([^"']+)["']/gi) || [];
                            matches.forEach(m => {
                                const clean = m.replace(/^(?:src|href|xlink:href)\s*=\s*["']|["']$/gi, '').trim();
                                if (clean && !clean.startsWith('http:') && !clean.startsWith('https:') && !clean.startsWith('#') && !clean.startsWith('data:')) {
                                    const filename = clean.split('/').pop().split('?')[0];
                                    referencedAssets.add(filename);
                                    referencedAssets.add(clean);
                                }
                            });
                        } catch (e) { /* skip */ }
                    }
                }
            }
        }

        for (let path in splitMasterZip.files) {
            if (path === "mimetype" || splitMasterZip.files[path].dir) continue;
            let shouldInclude = true;
            if (path.endsWith('.html') || path.endsWith('.xhtml')) {
                shouldInclude = false;
                for (let href of allowedHrefs) {
                    if (path.endsWith(href)) { shouldInclude = true; break; }
                }
            }
            // Strip images, fonts, CSS if keepOnlyText
            if (keepOnlyText && shouldInclude) {
                const lp = path.toLowerCase();
                if (lp.endsWith('.jpg') || lp.endsWith('.jpeg') || lp.endsWith('.png') || lp.endsWith('.gif') || lp.endsWith('.webp') || lp.endsWith('.svg')) shouldInclude = false;
                if (lp.endsWith('.ttf') || lp.endsWith('.otf') || lp.endsWith('.woff') || lp.endsWith('.woff2')) shouldInclude = false;
                if (lp.endsWith('.css')) shouldInclude = false;
            }
            
            // Asset Tree-Shaking: Exclude images/media not referenced in surviving chapters
            if (treeShakeEnabled && !keepOnlyText && shouldInclude) {
                const lp = path.toLowerCase();
                const isImage = lp.endsWith('.jpg') || lp.endsWith('.jpeg') || lp.endsWith('.png') || lp.endsWith('.webp') || lp.endsWith('.gif') || lp.endsWith('.svg');
                if (isImage) {
                    const fname = path.split('/').pop();
                    const isCover = lp.includes('cover');
                    if (!isCover && !referencedAssets.has(fname) && !referencedAssets.has(path)) {
                        shouldInclude = false;
                    }
                }
            }

            if (shouldInclude || path.includes("META-INF") || path.endsWith(".opf") || path.endsWith(".ncx")) {
                newZip.file(path, await splitMasterZip.files[path].async("arraybuffer"));
            }
        }

        const newOpfDoc = splitOpfDoc.cloneNode(true);
        const spine = newOpfDoc.querySelector("spine");
        const manifest = newOpfDoc.querySelector("manifest");

        Array.from(spine.querySelectorAll("itemref")).forEach(ref => {
            if (!allowedIdrefs.has(ref.getAttribute("idref"))) spine.removeChild(ref);
        });

        Array.from(manifest.querySelectorAll("item")).forEach(item => {
            if (item.getAttribute("media-type").includes("html") && !allowedIdrefs.has(item.getAttribute("id"))) {
                manifest.removeChild(item);
            }
        });

        let currentTitle = splitTitleInput.value.trim() || baseBookTitle;
        let finalTitle, finalDisplayName;

        if (rangeSuffix === "Custom Extract") {
            finalTitle = currentTitle;
            finalDisplayName = finalTitle;
        } else {
            finalTitle = `${currentTitle} (${rangeSuffix})`;
            finalDisplayName = finalTitle;
        }

        setSmartTitle(newOpfDoc, finalTitle);
        const preserveBookId = document.getElementById('preserve-book-id')?.checked ?? true;
        if (!preserveBookId) forceNewIdentifier(newOpfDoc);

        if (splitCustomCoverFile) {
            try {
                logMsg("Applying custom cover...");
                const coverExt = splitCustomCoverFile.name.split('.').pop().toLowerCase();
                const coverMime = coverExt === 'png' ? 'image/png' : 'image/jpeg';
                const coverData = await splitCustomCoverFile.arrayBuffer();

                let coverItem = newOpfDoc.querySelector('item[properties~="cover-image"]');
                if (!coverItem) {
                    const metaCover = newOpfDoc.querySelector('meta[name="cover"]');
                    if (metaCover) {
                        const coverId = metaCover.getAttribute("content");
                        coverItem = newOpfDoc.querySelector(`item[id="${coverId}"]`);
                    }
                }
                if (coverItem) {
                    const existingHref = coverItem.getAttribute("href");
                    newZip.file(splitOpfDir + existingHref, coverData);
                    coverItem.setAttribute("media-type", coverMime);
                } else {
                    const newCoverHref = `custom_cover_${Date.now()}.${coverExt}`;
                    const newCoverId = `custom_cover_id`;
                    newZip.file(splitOpfDir + newCoverHref, coverData);
                    const newItem = newOpfDoc.createElement("item");
                    newItem.setAttribute("id", newCoverId);
                    newItem.setAttribute("href", newCoverHref);
                    newItem.setAttribute("media-type", coverMime);
                    newItem.setAttribute("properties", "cover-image");
                    manifest.appendChild(newItem);
                    let metadata = newOpfDoc.querySelector("metadata");
                    if (metadata) {
                        const meta = newOpfDoc.createElement("meta");
                        meta.setAttribute("name", "cover");
                        meta.setAttribute("content", newCoverId);
                        metadata.appendChild(meta);
                    }
                }
            } catch (e) { console.error("Failed to apply cover:", e); }
        }

        newZip.file(splitOpfPath, new XMLSerializer().serializeToString(newOpfDoc));

        // CSS Theme Injection
        const cssTheme = document.getElementById('css-theme-inject')?.value;
        if (cssTheme && cssTheme !== 'none') {
            const themeCSS = {
                dark: 'body{background:#1a1a2e!important;color:#e0e0e0!important}a{color:#8ab4f8!important}img{opacity:0.85}',
                sepia: 'body{background:#f4ecd8!important;color:#5b4636!important;font-family:Georgia,serif!important}a{color:#8b4513!important}',
                large: 'body{font-size:1.4em!important;line-height:1.8!important}'
            }[cssTheme];
            if (themeCSS) {
                const themeFileName = splitOpfDir + 'epub_studio_theme.css';
                newZip.file(themeFileName, themeCSS);
                // Inject link into every XHTML file
                for (let path in newZip.files) {
                    if (path.endsWith('.xhtml') || path.endsWith('.html')) {
                        try {
                            let content = await newZip.file(path).async('text');
                            const relPath = 'epub_studio_theme.css';
                            if (!content.includes('epub_studio_theme.css')) {
                                content = content.replace('</head>', `<link rel="stylesheet" type="text/css" href="${relPath}"/></head>`);
                                newZip.file(path, content);
                            }
                        } catch (e) { /* skip */ }
                    }
                }
                // Add to manifest
                const themeItem = newOpfDoc.createElement('item');
                themeItem.setAttribute('id', 'epub-studio-theme-css');
                themeItem.setAttribute('href', 'epub_studio_theme.css');
                themeItem.setAttribute('media-type', 'text/css');
                manifest.appendChild(themeItem);
                newZip.file(splitOpfPath, new XMLSerializer().serializeToString(newOpfDoc));
                logMsg(`Applied ${cssTheme} reading theme.`);
            }
        }

        const survivingChapters = storyChapters.filter(c => allowedIdrefs.has(c.idref));
        await applyCleanTitlesToZip(newZip, newOpfDoc, survivingChapters, splitOpfDir);
        logMsg(`Compressing & Zipping...`);

        let blob;
        try {
            const serializedFiles = {};
            let countSerial = 0;
            for (let path in newZip.files) {
                if (path === "mimetype" || newZip.files[path].dir) continue;
                serializedFiles[path] = await newZip.files[path].async("blob");
                if (++countSerial % 50 === 0) await new Promise(r => setTimeout(r, 2));
            }

            const workerCode = `
                importScripts('https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js');
                self.onmessage = async function(e) {
                    try {
                        const { filesConfig, compression } = e.data;
                        const zip = new JSZip();
                        zip.file("mimetype", "application/epub+zip", { compression: "STORE" });
                        for (let path in filesConfig) {
                            zip.file(path, filesConfig[path]);
                        }
                        const blob = await zip.generateAsync({ type: "blob", compression: compression || "DEFLATE", mimeType: "application/epub+zip" }, function updateCallback(metadata) {
                            self.postMessage({ type: 'progress', percent: metadata.percent });
                        });
                        self.postMessage({ type: 'success', blob: blob });
                    } catch (err) {
                        self.postMessage({ type: 'error', error: err.message });
                    }
                };
            `;
            const blobURL = URL.createObjectURL(new Blob([workerCode], { type: 'application/javascript' }));
            const worker = new Worker(blobURL);
            worker.postMessage({ filesConfig: serializedFiles, compression: "DEFLATE" });

            blob = await new Promise((resolve, reject) => {
                worker.onmessage = (e) => {
                    const data = e.data;
                    if (data.type === 'progress') {
                        const pWrapper = document.getElementById('split-progress-wrapper');
                        const pBar = document.getElementById('split-progress-bar');
                        const pPercent = document.getElementById('split-progress-percent');
                        if (pWrapper) pWrapper.classList.remove('hidden');
                        if (pBar) pBar.style.width = data.percent.toFixed(0) + '%';
                        if (pPercent) pPercent.textContent = data.percent.toFixed(0) + '%';
                    } else if (data.type === 'success') {
                        resolve(data.blob);
                        worker.terminate();
                        URL.revokeObjectURL(blobURL);
                    } else if (data.type === 'error') {
                        reject(new Error(data.error));
                        worker.terminate();
                        URL.revokeObjectURL(blobURL);
                    }
                };
                worker.onerror = (e) => {
                    reject(new Error(e.message || "Worker crashed"));
                    worker.terminate();
                    URL.revokeObjectURL(blobURL);
                };
            });
        } catch (workerErr) {
            console.warn("Web Worker failed or unsupported, using main-thread fallback:", workerErr);
            blob = await newZip.generateAsync(
                { type: "blob", compression: "DEFLATE", mimeType: "application/epub+zip" },
                function updateCallback(metadata) {
                    const pWrapper = document.getElementById('split-progress-wrapper');
                    const pBar = document.getElementById('split-progress-bar');
                    const pPercent = document.getElementById('split-progress-percent');
                    if (pWrapper) pWrapper.classList.remove('hidden');
                    if (pBar) pBar.style.width = metadata.percent.toFixed(0) + '%';
                    if (pPercent) pPercent.textContent = metadata.percent.toFixed(0) + '%';
                }
            );
        }

        // Store for share button
        lastExportBlob = blob;

        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${sanitizeFilename(finalDisplayName)}.epub`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);

        logMsg(`Success.`);
        showToast(`Exported`, "success");
        addExportEntry(finalDisplayName, 'split', rangeSuffix);

        // Quick EPUB Validation
        try {
            logMsg('Running validation...');
            const valZip = await new JSZip().loadAsync(blob);
            const valIssues = [];
            if (!valZip.file('mimetype')) valIssues.push('Missing mimetype file');
            if (!valZip.file('META-INF/container.xml')) valIssues.push('Missing container.xml');
            const valContainer = valZip.file('META-INF/container.xml');
            if (valContainer) {
                const vcXml = await valContainer.async('text');
                const vcDoc = new DOMParser().parseFromString(vcXml, 'text/xml');
                const opfRef = vcDoc.querySelector('rootfile');
                if (opfRef) {
                    const opfP = opfRef.getAttribute('full-path');
                    if (!valZip.file(opfP)) valIssues.push(`Missing OPF: ${opfP}`);
                    else {
                        const opfXml = await valZip.file(opfP).async('text');
                        const opfD = new DOMParser().parseFromString(opfXml, 'text/xml');
                        const spineRefs = Array.from(opfD.querySelectorAll('spine > itemref')).map(r => r.getAttribute('idref'));
                        const manifestIds = new Set(Array.from(opfD.querySelectorAll('manifest > item')).map(i => i.getAttribute('id')));
                        spineRefs.forEach(id => { if (!manifestIds.has(id)) valIssues.push(`Spine ref '${id}' missing from manifest`); });
                    }
                }
            }
            if (valIssues.length === 0) {
                logMsg('\u2705 Validation passed. EPUB looks healthy!');
            } else {
                valIssues.forEach(issue => logMsg(`\u26a0\ufe0f ${issue}`));
                showToast(`${valIssues.length} validation warning(s)`, 'warn');
            }
        } catch (valErr) {
            logMsg('Validation skipped: ' + valErr.message);
        }
    } catch (err) {
        console.error(err);
        showToast("Export failed!", "error");
    } finally {
        btnCustom.disabled = false;
        const pWrapper = document.getElementById('split-progress-wrapper');
        const pBar = document.getElementById('split-progress-bar');
        if (pWrapper) pWrapper.classList.add('hidden');
        if (pBar) pBar.style.width = '0%';
    }
}

document.getElementById('btn-select-all').addEventListener('click', () => {
    document.querySelectorAll('.chap-checkbox').forEach(cb => cb.checked = true);
    document.getElementById('preview-count').textContent = `${storyChapters.length} selected`;
});

document.getElementById('btn-deselect-all').addEventListener('click', () => {
    document.querySelectorAll('.chap-checkbox').forEach(cb => cb.checked = false);
    document.getElementById('preview-count').textContent = `0 selected`;
});

document.getElementById('btn-export-custom').addEventListener('click', () => {
    const selected = Array.from(document.querySelectorAll('.chap-checkbox:checked')).map(cb => cb.value);
    if (selected.length === 0) return showToast("No chapters selected!", "warn");
    executeSplit(selected, "Custom Extract");
});

document.getElementById('btn-export-range').addEventListener('click', () => {
    const start = parseInt(document.getElementById('range-start').value);
    const end = parseInt(document.getElementById('range-end').value);
    if (!start || !end || start > end || start < 1 || end > storyChapters.length) return showToast("Invalid range.", "warn");
    const selected = storyChapters.slice(start - 1, end).map(c => c.idref);
    executeSplit(selected, `${start}-${end}`);
});

document.getElementById('btn-export-chunks').addEventListener('click', async () => {
    const mode = document.querySelector('input[name="split-mode"]:checked').value;

    if (mode === 'chapters') {
        const size = parseInt(document.getElementById('chunk-size').value);
        if (!size || size < 1) return showToast("Invalid chunk size.", "warn");

        for (let i = 0; i < storyChapters.length; i += size) {
            const chunk = storyChapters.slice(i, i + size);
            const start = chunk[0].displayIndex;
            const end = chunk[chunk.length - 1].displayIndex;
            const selected = chunk.map(c => c.idref);
            await executeSplit(selected, `${start}-${end}`);
        }
    } else {
        const targetMb = parseFloat(document.getElementById('chunk-size-mb').value);
        if (!targetMb || targetMb <= 0) return showToast("Invalid target size.", "warn");
        const targetBytes = targetMb * 1024 * 1024;

        showToast("Estimating split sizes...", "info");

        let baselineSize = 0;
        // Estimate baseline size (frontmatter + assets)
        for (let path in splitMasterZip.files) {
            if (path === "mimetype" || splitMasterZip.files[path].dir) continue;
            if (!path.endsWith('.html') && !path.endsWith('.xhtml')) {
                const rawStats = splitMasterZip.files[path]._data; // uncompressed stats
                if (rawStats && rawStats.uncompressedSize) baselineSize += rawStats.uncompressedSize;
            }
        }

        let chunks = [];
        let currentChunk = [];
        let currentSize = baselineSize;

        for (let i = 0; i < storyChapters.length; i++) {
            const chap = storyChapters[i];
            let chapSize = 0;
            const fullPath = splitOpfDir + chap.originalName;
            const fileObj = splitMasterZip.files[fullPath];
            if (fileObj && fileObj._data && fileObj._data.uncompressedSize) {
                chapSize = fileObj._data.uncompressedSize;
            } else {
                chapSize = 50 * 1024; // fallback 50kb
            }

            if (currentChunk.length > 0 && (currentSize + chapSize) > targetBytes) {
                chunks.push(currentChunk);
                currentChunk = [chap];
                currentSize = baselineSize + chapSize;
            } else {
                currentChunk.push(chap);
                currentSize += chapSize;
            }
        }
        if (currentChunk.length > 0) chunks.push(currentChunk);

        for (let i = 0; i < chunks.length; i++) {
            const chunk = chunks[i];
            const start = chunk[0].displayIndex;
            const end = chunk[chunk.length - 1].displayIndex;
            const selected = chunk.map(c => c.idref);
            await executeSplit(selected, `Part ${i + 1}`);
        }
    }
});

document.querySelectorAll('input[name="split-mode"]').forEach(radio => {
    radio.addEventListener('change', (e) => {
        if (e.target.value === 'chapters') {
            document.getElementById('split-mode-chapters-wrapper').classList.remove('hidden');
            document.getElementById('split-mode-size-wrapper').classList.add('hidden');
        } else {
            document.getElementById('split-mode-chapters-wrapper').classList.add('hidden');
            document.getElementById('split-mode-size-wrapper').classList.remove('hidden');
        }
    });
});

document.getElementById('btn-reset')?.addEventListener('click', () => {
    // Reset state in place without reloading entire page
    splitMasterZip = null;
    splitOpfPath = "";
    splitOpfDir = "";
    splitOpfDoc = null;
    allItems = [];
    spineItems = [];
    storyChapters = [];
    frontMatter = [];
    baseBookTitle = "Unknown Title";
    splitCustomCoverFile = null;
    lastExportBlob = null;

    if (splitCoverInput) splitCoverInput.value = '';
    if (splitCoverPreview) splitCoverPreview.innerHTML = `<span class="text-xs text-slate-400 font-semibold text-center px-2">Current<br>Cover</span>`;
    if (btnRemoveSplitCover) btnRemoveSplitCover.classList.add('hidden');
    if (splitTitleInput) splitTitleInput.value = '';

    const epubInput = document.getElementById('epub-input');
    if (epubInput) epubInput.value = '';

    const listEl = document.getElementById('chapter-list');
    if (listEl) listEl.innerHTML = '';

    const statusLog = document.getElementById('status-log');
    if (statusLog) statusLog.innerHTML = '<div class="text-indigo-400">> System ready.</div>';

    const loadingWrapper = document.getElementById('loading-progress-wrapper');
    if (loadingWrapper) loadingWrapper.classList.add('hidden');

    const metaViewer = document.getElementById('metadata-viewer');
    if (metaViewer) metaViewer.classList.add('hidden');

    document.getElementById('editor-section').classList.add('hidden');
    document.getElementById('upload-section').classList.remove('hidden');

    // Immediately prompt user to choose the new book
    if (epubInput) epubInput.click();
});

// --- Chapter Search / Filter ---
document.getElementById('chapter-search')?.addEventListener('input', (e) => {
    const query = e.target.value.toLowerCase();
    const items = document.querySelectorAll('#chapter-list > div');
    items.forEach(item => {
        const text = item.textContent.toLowerCase();
        item.style.display = text.includes(query) ? '' : 'none';
    });
});

// --- Batch Rename ---
document.getElementById('btn-batch-rename')?.addEventListener('click', () => {
    const pattern = prompt(
        'Enter rename pattern.\n\nUse {n} for chapter number and {original} for original filename.\n\nExamples:\n  Chapter {n}\n  Ch. {n} - {original}',
        'Chapter {n}'
    );
    if (!pattern) return;

    storyChapters.forEach(chap => {
        chap.customName = pattern
            .replace('{n}', chap.displayIndex)
            .replace('{original}', chap.originalName);
    });

    document.querySelectorAll('#chapter-list .chap-name').forEach(span => {
        const idref = span.getAttribute('data-idref');
        const chap = storyChapters.find(c => c.idref === idref);
        if (chap) span.textContent = chap.customName || chap.originalName;
    });

    showToast(`Renamed ${storyChapters.length} chapters`, 'success');
});

// --- Estimated Output Size ---
function updateEstimatedSize() {
    const sizeEl = document.getElementById('estimated-size');
    const sizeValEl = document.getElementById('estimated-size-value');
    if (!sizeEl || !sizeValEl || !splitMasterZip) return;

    const checked = Array.from(document.querySelectorAll('.chap-checkbox:checked')).map(cb => cb.value);
    if (checked.length === 0) {
        sizeEl.classList.add('hidden');
        return;
    }

    let totalBytes = 0;
    for (let path in splitMasterZip.files) {
        if (path === "mimetype" || splitMasterZip.files[path].dir) continue;
        if (!path.endsWith('.html') && !path.endsWith('.xhtml')) {
            const f = splitMasterZip.files[path];
            if (f._data && f._data.uncompressedSize) totalBytes += f._data.uncompressedSize;
        }
    }
    checked.forEach(idref => {
        const chap = storyChapters.find(c => c.idref === idref);
        if (!chap) return;
        const fullPath = splitOpfDir + chap.originalName;
        const f = splitMasterZip.files[fullPath];
        if (f && f._data && f._data.uncompressedSize) totalBytes += f._data.uncompressedSize;
        else totalBytes += 50 * 1024;
    });

    sizeValEl.textContent = (totalBytes / (1024 * 1024)).toFixed(1);
    sizeEl.classList.remove('hidden');
}

document.addEventListener('change', (e) => {
    if (e.target.classList.contains('chap-checkbox')) updateEstimatedSize();
});

// --- Export as Plain ZIP ---
document.getElementById('btn-export-zip')?.addEventListener('click', async () => {
    if (!splitMasterZip || storyChapters.length === 0) return showToast('No EPUB loaded', 'warn');
    const checked = Array.from(document.querySelectorAll('.chap-checkbox:checked')).map(cb => cb.value);
    if (checked.length === 0) return showToast('Select chapters first', 'warn');

    logMsg('Exporting as plain ZIP...');
    const zip = new JSZip();

    for (const idref of checked) {
        const chap = storyChapters.find(c => c.idref === idref);
        if (!chap) continue;
        const fullPath = splitOpfDir + chap.originalName;
        const f = splitMasterZip.files[fullPath];
        if (f) {
            const name = chap.customName || chap.originalName;
            zip.file(name.endsWith('.xhtml') || name.endsWith('.html') ? name : name + '.xhtml', await f.async('arraybuffer'));
        }
    }

    const blob = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const title = (splitTitleInput.value.trim() || baseBookTitle);
    a.download = `${sanitizeFilename(title)}_chapters.zip`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('ZIP exported!', 'success');
    addExportEntry(title + ' (ZIP)', 'split', `${checked.length} chapters`);
});

// --- Share Button (Web Share API) ---
let lastExportBlob = null;

document.getElementById('btn-share-export')?.addEventListener('click', async () => {
    if (!splitMasterZip || storyChapters.length === 0) return showToast('No EPUB loaded', 'warn');

    if (!navigator.canShare) return showToast('Web Share API not supported in this browser', 'warn');

    const checked = Array.from(document.querySelectorAll('.chap-checkbox:checked')).map(cb => cb.value);
    if (checked.length === 0) return showToast('Select chapters first', 'warn');

    // Trigger a split and share
    showToast('Generating file for sharing...', 'info');
    await executeSplit(checked, 'Custom Extract');

    if (lastExportBlob) {
        const title = (splitTitleInput.value.trim() || baseBookTitle);
        const file = new File([lastExportBlob], `${sanitizeFilename(title)}.epub`, { type: 'application/epub+zip' });
        try {
            await navigator.share({ files: [file], title });
            showToast('Shared!', 'success');
        } catch (e) {
            if (e.name !== 'AbortError') showToast('Share failed: ' + e.message, 'error');
        }
    }
});

// --- Export Presets ---
function loadPresets() {
    try { return JSON.parse(localStorage.getItem('epub-studio-presets') || '[]'); } catch { return []; }
}

function savePresets(presets) {
    localStorage.setItem('epub-studio-presets', JSON.stringify(presets));
}

function renderPresetDropdown() {
    const sel = document.getElementById('export-presets');
    if (!sel) return;
    const presets = loadPresets();
    sel.innerHTML = '<option value="">Load Preset...</option>';
    presets.forEach((p, i) => {
        sel.innerHTML += `<option value="${i}">${p.name}</option>`;
    });
}

document.getElementById('btn-save-preset')?.addEventListener('click', () => {
    const name = prompt('Preset name:', 'My Preset');
    if (!name) return;
    const presets = loadPresets();
    presets.push({
        name,
        chunkSize: document.getElementById('chunk-size')?.value || '100',
        chunkSizeMb: document.getElementById('chunk-size-mb')?.value || '20',
        splitMode: document.querySelector('input[name="split-mode"]:checked')?.value || 'chapters',
        keepOnlyText: document.getElementById('keep-only-text')?.checked || false,
        cssTheme: document.getElementById('css-theme-inject')?.value || 'none'
    });
    savePresets(presets);
    renderPresetDropdown();
    showToast(`Preset "${name}" saved!`, 'success');
});

document.getElementById('export-presets')?.addEventListener('change', (e) => {
    const idx = parseInt(e.target.value);
    if (isNaN(idx)) return;
    const presets = loadPresets();
    const p = presets[idx];
    if (!p) return;
    if (document.getElementById('chunk-size')) document.getElementById('chunk-size').value = p.chunkSize;
    if (document.getElementById('chunk-size-mb')) document.getElementById('chunk-size-mb').value = p.chunkSizeMb;
    const radio = document.querySelector(`input[name="split-mode"][value="${p.splitMode}"]`);
    if (radio) { radio.checked = true; radio.dispatchEvent(new Event('change')); }
    if (document.getElementById('keep-only-text')) document.getElementById('keep-only-text').checked = p.keepOnlyText;
    if (document.getElementById('css-theme-inject')) document.getElementById('css-theme-inject').value = p.cssTheme;
    showToast(`Loaded preset: ${p.name}`, 'info');
    e.target.value = '';
});

renderPresetDropdown();

// --- Undo/Redo for Chapter Selection ---
let selectionHistory = [];
let selectionFuture = [];

function captureSelectionState() {
    return Array.from(document.querySelectorAll('.chap-checkbox')).map(cb => ({ id: cb.value, checked: cb.checked }));
}

function restoreSelectionState(state) {
    state.forEach(s => {
        const cb = document.querySelector(`.chap-checkbox[value="${s.id}"]`);
        if (cb) cb.checked = s.checked;
    });
    document.getElementById('preview-count').textContent = `${document.querySelectorAll('.chap-checkbox:checked').length} selected`;
    updateEstimatedSize();
}

document.addEventListener('change', (e) => {
    if (e.target.classList.contains('chap-checkbox')) {
        selectionHistory.push(captureSelectionState());
        selectionFuture = [];
    }
});

document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        const tag = document.activeElement.tagName.toLowerCase();
        if (tag === 'input' || tag === 'textarea') return;
        e.preventDefault();
        if (selectionHistory.length > 1) {
            selectionFuture.push(selectionHistory.pop());
            restoreSelectionState(selectionHistory[selectionHistory.length - 1]);
            showToast('Undo', 'info');
        }
    }
    if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        const tag = document.activeElement.tagName.toLowerCase();
        if (tag === 'input' || tag === 'textarea') return;
        e.preventDefault();
        if (selectionFuture.length > 0) {
            const state = selectionFuture.pop();
            selectionHistory.push(state);
            restoreSelectionState(state);
            showToast('Redo', 'info');
        }
    }
});

// ═══════════════════════════════════════════════════════════════
// NEW ADVANCED FEATURES: RANGE SELECT, BATCH ZIP, AI TOC, TRANSLATE
// ═══════════════════════════════════════════════════════════════

// --- Apply Range Selection in Checkbox List ---
document.getElementById('btn-apply-range-selection')?.addEventListener('click', () => {
    const start = parseInt(document.getElementById('range-start')?.value);
    const end = parseInt(document.getElementById('range-end')?.value);
    if (isNaN(start) || isNaN(end) || start < 1 || end < start) {
        return showToast('Please enter a valid Start and End chapter number', 'warn');
    }
    storyChapters.forEach(chap => {
        const cb = document.querySelector(`.chap-checkbox[value="${chap.idref}"]`);
        if (cb) {
            cb.checked = (chap.displayIndex >= start && chap.displayIndex <= end);
        }
    });
    const checkedCount = document.querySelectorAll('.chap-checkbox:checked').length;
    const previewEl = document.getElementById('preview-count');
    if (previewEl) previewEl.textContent = `${checkedCount} / ${storyChapters.length} selected`;
    updateEstimatedSize();
    showToast(`Selected Chapters ${start} to ${end} (${checkedCount} total)`, 'success');
});

document.getElementById('btn-quick-range-preset')?.addEventListener('click', () => {
    const startEl = document.getElementById('range-start');
    const endEl = document.getElementById('range-end');
    if (!startEl.value) startEl.value = '1';
    if (!endEl.value) endEl.value = Math.min(storyChapters.length, 100).toString();
    document.getElementById('btn-apply-range-selection')?.click();
});

// --- Invert Selection ---
document.getElementById('btn-invert-select')?.addEventListener('click', () => {
    document.querySelectorAll('.chap-checkbox').forEach(cb => {
        cb.checked = !cb.checked;
    });
    const checkedCount = document.querySelectorAll('.chap-checkbox:checked').length;
    const previewEl = document.getElementById('preview-count');
    if (previewEl) previewEl.textContent = `${checkedCount} / ${storyChapters.length} selected`;
    updateEstimatedSize();
    showToast(`Inverted selection (${checkedCount} selected)`, 'info');
});

// --- Send Selected Chapters to Translator ---
document.getElementById('btn-send-to-translator')?.addEventListener('click', async () => {
    if (!splitMasterZip || storyChapters.length === 0) return showToast('No EPUB loaded', 'warn');
    const checked = Array.from(document.querySelectorAll('.chap-checkbox:checked')).map(cb => cb.value);
    if (checked.length === 0) return showToast('Please select at least 1 chapter first', 'warn');

    showToast('Extracting selected chapter text...', 'info');
    let extractedText = '';
    const parser = new DOMParser();

    for (let i = 0; i < checked.length; i++) {
        const idref = checked[i];
        const chap = storyChapters.find(c => c.idref === idref);
        if (!chap) continue;
        const fullPath = splitOpfDir + chap.originalName;
        const f = splitMasterZip.files[fullPath];
        if (f) {
            try {
                const html = await f.async('text');
                const doc = parser.parseFromString(html, 'text/html');
                const title = chap.customName || (doc.querySelector('h1, h2, h3, title')?.textContent.trim()) || `Chapter ${chap.displayIndex}`;
                
                // Strip scripts and styles
                doc.querySelectorAll('script, style').forEach(el => el.remove());
                const bodyText = (doc.body ? doc.body.innerText || doc.body.textContent : doc.documentElement.textContent).trim();
                
                extractedText += `=== ${title} ===\n\n${bodyText}\n\n\n`;
            } catch (e) { console.warn('Failed to parse chapter text for translator:', e); }
        }
    }

    if (!extractedText.trim()) return showToast('No readable text found in selected chapters', 'error');

    if (window.loadExtractedChaptersIntoTranslator) {
        window.loadExtractedChaptersIntoTranslator({
            title: `${splitTitleInput.value.trim() || baseBookTitle} (${checked.length} Ch)`,
            text: extractedText.trim(),
            count: checked.length
        });
        showToast(`Loaded ${checked.length} chapters into Translator!`, 'success');
    } else {
        showToast('Translator bridge ready. Switch to Text tab to view.', 'info');
    }
});

// --- Download All Volumes as Single .ZIP ---
document.getElementById('btn-export-batch-zip')?.addEventListener('click', async () => {
    if (!splitMasterZip || storyChapters.length === 0) return showToast('No EPUB loaded', 'warn');
    const chunkSize = parseInt(document.getElementById('chunk-size')?.value) || 100;
    if (chunkSize <= 0) return showToast('Invalid chunk size', 'warn');

    const totalVolumes = Math.ceil(storyChapters.length / chunkSize);
    if (!confirm(`Generate ${totalVolumes} split EPUB volumes (every ${chunkSize} chapters) and pack them into a single .ZIP bundle?`)) return;

    logMsg(`Starting Batch Volume Export (${totalVolumes} volumes)...`);
    const masterZip = new JSZip();
    const btnBatch = document.getElementById('btn-export-batch-zip');
    btnBatch.disabled = true;

    try {
        for (let v = 0; v < totalVolumes; v++) {
            const startIdx = v * chunkSize;
            const endIdx = Math.min(startIdx + chunkSize, storyChapters.length);
            const volChapters = storyChapters.slice(startIdx, endIdx);
            const volIdrefs = volChapters.map(c => c.idref);
            const rangeSuffix = `Vol ${v + 1} (Ch ${startIdx + 1}-${endIdx})`;

            logMsg(`Building ${rangeSuffix}...`);
            
            // Build single volume zip in memory
            const volBlob = await buildSingleVolumeBlob(volIdrefs, rangeSuffix);
            if (volBlob) {
                const bookTitle = sanitizeFilename(splitTitleInput.value.trim() || baseBookTitle);
                const volFileName = `${bookTitle}_${sanitizeFilename(rangeSuffix)}.epub`;
                masterZip.file(volFileName, volBlob);
            }
        }

        logMsg('Compressing master .ZIP archive...');
        const zipBlob = await masterZip.generateAsync({ type: 'blob', compression: 'STORE' }, (meta) => {
            const pWrapper = document.getElementById('split-progress-wrapper');
            const pBar = document.getElementById('split-progress-bar');
            const pPercent = document.getElementById('split-progress-percent');
            if (pWrapper) pWrapper.classList.remove('hidden');
            if (pBar) pBar.style.width = meta.percent.toFixed(0) + '%';
            if (pPercent) pPercent.textContent = meta.percent.toFixed(0) + '%';
        });

        const bookTitle = sanitizeFilename(splitTitleInput.value.trim() || baseBookTitle);
        const url = URL.createObjectURL(zipBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${bookTitle}_All_Volumes.zip`;
        a.click();
        URL.revokeObjectURL(url);

        logMsg('✅ Batch Volume ZIP exported successfully!');
        showToast(`Exported ${totalVolumes} volumes in 1 ZIP bundle!`, 'success');
        addExportEntry(`${bookTitle} (${totalVolumes} Volumes)`, 'split', `Batch ${chunkSize} ch/vol`);
    } catch (err) {
        console.error('Batch export failed:', err);
        showToast('Batch export failed: ' + err.message, 'error');
    } finally {
        btnBatch.disabled = false;
        document.getElementById('split-progress-wrapper')?.classList.add('hidden');
    }
});

// Helper: build a single volume blob in memory without triggering automatic download
async function buildSingleVolumeBlob(selectedIdrefs, rangeSuffix) {
    const newZip = new JSZip();
    newZip.file("mimetype", "application/epub+zip", { compression: "STORE" });

    const allowedIdrefs = new Set([...frontMatter.map(f => f.idref), ...selectedIdrefs]);
    const allowedHrefs = new Set();

    allItems.forEach(item => {
        if (allowedIdrefs.has(item.id)) allowedHrefs.add(item.href);
        else if (!item.mediaType.includes('html')) allowedHrefs.add(item.href);
    });

    const keepOnlyText = document.getElementById('keep-only-text')?.checked;
    const treeShakeEnabled = document.getElementById('asset-tree-shake')?.checked;
    const referencedAssets = new Set();

    if (treeShakeEnabled && !keepOnlyText) {
        for (let chap of storyChapters) {
            if (allowedIdrefs.has(chap.idref)) {
                const fullPath = splitOpfDir + chap.originalName;
                const f = splitMasterZip.files[fullPath];
                if (f) {
                    try {
                        const content = await f.async('text');
                        const matches = content.match(/(?:src|href|xlink:href)\s*=\s*["']([^"']+)["']/gi) || [];
                        matches.forEach(m => {
                            const clean = m.replace(/^(?:src|href|xlink:href)\s*=\s*["']|["']$/gi, '').trim();
                            if (clean && !clean.startsWith('http:') && !clean.startsWith('https:') && !clean.startsWith('#') && !clean.startsWith('data:')) {
                                referencedAssets.add(clean.split('/').pop().split('?')[0]);
                                referencedAssets.add(clean);
                            }
                        });
                    } catch (e) {}
                }
            }
        }
    }

    for (let path in splitMasterZip.files) {
        if (path === "mimetype" || splitMasterZip.files[path].dir) continue;
        let shouldInclude = true;
        if (path.endsWith('.html') || path.endsWith('.xhtml')) {
            shouldInclude = false;
            for (let href of allowedHrefs) {
                if (path.endsWith(href)) { shouldInclude = true; break; }
            }
        }
        if (keepOnlyText && shouldInclude) {
            const lp = path.toLowerCase();
            if (lp.endsWith('.jpg') || lp.endsWith('.jpeg') || lp.endsWith('.png') || lp.endsWith('.gif') || lp.endsWith('.webp') || lp.endsWith('.svg') || lp.endsWith('.ttf') || lp.endsWith('.otf') || lp.endsWith('.woff') || lp.endsWith('.css')) shouldInclude = false;
        }
        if (treeShakeEnabled && !keepOnlyText && shouldInclude) {
            const lp = path.toLowerCase();
            const isImage = lp.endsWith('.jpg') || lp.endsWith('.jpeg') || lp.endsWith('.png') || lp.endsWith('.webp') || lp.endsWith('.gif') || lp.endsWith('.svg');
            if (isImage && !lp.includes('cover')) {
                const fname = path.split('/').pop();
                if (!referencedAssets.has(fname) && !referencedAssets.has(path)) shouldInclude = false;
            }
        }
        if (shouldInclude || path.includes("META-INF") || path.endsWith(".opf") || path.endsWith(".ncx")) {
            newZip.file(path, await splitMasterZip.files[path].async("arraybuffer"));
        }
    }

    const newOpfDoc = splitOpfDoc.cloneNode(true);
    const spine = newOpfDoc.querySelector("spine");
    const manifest = newOpfDoc.querySelector("manifest");

    Array.from(spine.querySelectorAll("itemref")).forEach(ref => {
        if (!allowedIdrefs.has(ref.getAttribute("idref"))) spine.removeChild(ref);
    });

    Array.from(manifest.querySelectorAll("item")).forEach(item => {
        if (item.getAttribute("media-type").includes("html") && !allowedIdrefs.has(item.getAttribute("id"))) {
            manifest.removeChild(item);
        }
    });

    let currentTitle = splitTitleInput.value.trim() || baseBookTitle;
    let finalTitle = `${currentTitle} (${rangeSuffix})`;
    setSmartTitle(newOpfDoc, finalTitle);
    const preserveBookIdVol = document.getElementById('preserve-book-id')?.checked ?? true;
    if (!preserveBookIdVol) forceNewIdentifier(newOpfDoc);

    const volChapters = storyChapters.filter(c => allowedIdrefs.has(c.idref));
    await applyCleanTitlesToZip(newZip, newOpfDoc, volChapters, splitOpfDir);
    newZip.file(splitOpfPath, new XMLSerializer().serializeToString(newOpfDoc));
    return await newZip.generateAsync({ type: "blob", compression: "DEFLATE", mimeType: "application/epub+zip" });
}

// ═══════════════════════════════════════════════════════════════
// AI TABLE OF CONTENTS & CHAPTER TITLE POLISHER
// ═══════════════════════════════════════════════════════════════

let aiPolishedResults = [];

document.getElementById('btn-ai-polish-toc')?.addEventListener('click', () => {
    if (!splitMasterZip || storyChapters.length === 0) return showToast('Please load an EPUB first', 'warn');
    const modal = document.getElementById('ai-toc-polish-modal');
    if (!modal) return;
    
    const provSelect = document.getElementById('ai-polish-provider-select');
    if (provSelect) {
        provSelect.value = localStorage.getItem('translationProvider') || 'gemini';
    }

    const statsEl = document.getElementById('ai-toc-stats');
    if (statsEl) statsEl.textContent = `${storyChapters.length} chapters loaded`;

    modal.classList.remove('hidden');
});


// ⚡ Instant Auto-Extract (Offline / 0s)
document.getElementById('btn-instant-extract-toc')?.addEventListener('click', async () => {
    if (!splitMasterZip || storyChapters.length === 0) return;
    const container = document.getElementById('ai-toc-results-container');
    const btnApply = document.getElementById('btn-apply-ai-toc');

    container.innerHTML = '<div class="text-center py-6 text-indigo-500 font-bold animate-pulse">⚡ Scanning internal chapter headings across all ' + storyChapters.length + ' chapters...</div>';
    
    aiPolishedResults = [];
    let html = '<div class="space-y-1.5 max-h-[42vh] overflow-y-auto custom-scrollbar pr-1">';

    for (let chap of storyChapters) {
        const fullPath = splitOpfDir + chap.originalName;
        const f = splitMasterZip.files[fullPath];
        const fname = (chap.originalName || '').split('/').pop();
        const tocTitle = splitTocMap.get(chap.originalName) || splitTocMap.get(fname) || '';
        let heading = 'Chapter ' + chap.displayIndex;
        if (f) {
            try {
                const txt = await f.async('text');
                heading = extractHeadingFromXhtml(txt, chap.displayIndex, tocTitle);
            } catch (e) {}
        }
        if (!heading || heading === 'Chapter ' + chap.displayIndex) {
            heading = cleanChapterTitleString(chap.customName || tocTitle || chap.originalName, chap.displayIndex);
        }
        aiPolishedResults.push({ index: chap.displayIndex, idref: chap.idref, cleanedName: heading });
        
        html += `
            <div class="p-2 bg-white/90 dark:bg-slate-800/90 rounded-lg flex items-center justify-between gap-3 border border-slate-200 dark:border-slate-700/70 text-xs shadow-2xs">
                <span class="text-purple-600 dark:text-purple-400 shrink-0 font-bold">#${chap.displayIndex}</span>
                <span class="text-slate-400 line-through truncate max-w-[35%]">${chap.originalName}</span>
                <span class="text-indigo-500 font-bold shrink-0">&rarr;</span>
                <span class="text-emerald-600 dark:text-emerald-400 font-semibold truncate flex-1">${heading}</span>
            </div>
        `;
    }
    html += '</div>';
    container.innerHTML = html;
    btnApply.disabled = false;
    showToast(`⚡ Extracted ${aiPolishedResults.length} chapter titles instantly!`, 'success');
});

document.getElementById('btn-run-ai-toc-polish')?.addEventListener('click', async () => {
    if (!splitMasterZip || storyChapters.length === 0) return;
    if (!window.aiPolishEpubToc) return showToast('AI engine not loaded yet. Please wait...', 'warn');

    const btn = document.getElementById('btn-run-ai-toc-polish');
    const btnText = document.getElementById('ai-polish-btn-text');
    const container = document.getElementById('ai-toc-results-container');
    const btnApply = document.getElementById('btn-apply-ai-toc');

    // Reset results so Regenerate Cleaned TOC always re-runs fresh
    aiPolishedResults = [];

    btn.disabled = true;
    btnApply.disabled = true;

    const batchSize = 50;
    const totalChapters = storyChapters.length;
    const totalBatches = Math.ceil(totalChapters / batchSize);
    let suggestedBookTitle = splitTitleInput.value.trim() || baseBookTitle;

    let totalPromptTok = 0;
    let totalOutputTok = 0;
    let activeModel = 'gemini-3.5-flash-lite';
    let activeProvider = document.getElementById('ai-polish-provider-select')?.value || localStorage.getItem('translationProvider') || 'gemini';
    const startTime = performance.now();

    // Render live progress & telemetry header
    container.innerHTML = `
        <div class="space-y-3">
            <div class="p-4 bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-950/40 dark:to-indigo-950/40 border border-purple-200 dark:border-purple-800/60 rounded-2xl shadow-sm space-y-2.5">
                <div class="flex items-center justify-between text-xs font-bold text-slate-800 dark:text-slate-200">
                    <span id="ai-batch-status-text" class="flex items-center gap-1.5 text-purple-700 dark:text-purple-300">
                        <span class="inline-block w-2.5 h-2.5 rounded-full bg-purple-500 animate-ping"></span>
                        Polishing ${aiPolishedResults.length} / ${totalChapters} chapters...
                    </span>
                    <span id="ai-batch-pct" class="font-mono text-purple-600 dark:text-purple-400">0%</span>
                </div>
                <div class="w-full bg-slate-200 dark:bg-slate-800 rounded-full h-2.5 overflow-hidden p-0.5">
                    <div id="ai-batch-progress-bar" class="bg-gradient-to-r from-purple-600 via-indigo-600 to-emerald-500 h-full rounded-full transition-all duration-300 ease-out" style="width: 0%"></div>
                </div>
                <p id="ai-batch-substatus" class="text-[11px] text-slate-500 dark:text-slate-400">Paced requests with auto-retry and multi-key quota rotation...</p>
            </div>

            <!-- LIVE TELEMETRY CARD -->
            <div id="ai-toc-telemetry-card" class="p-3.5 rounded-xl bg-slate-100/90 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-3">
                <div class="flex flex-wrap items-center gap-x-4 gap-y-1.5">
                    <span class="inline-flex items-center gap-1">
                        <strong class="text-emerald-600 dark:text-emerald-400 font-semibold">Input:</strong>
                        <span id="ai-tele-in">0 tokens</span>
                        <span class="text-slate-400 text-[11px]">(text + prompt)</span>
                    </span>
                    <span class="inline-flex items-center gap-1">
                        <strong class="text-teal-600 dark:text-teal-400 font-semibold">Output:</strong>
                        <span id="ai-tele-out">0 tokens</span>
                    </span>
                    <span class="inline-flex items-center gap-1">
                        <strong class="text-indigo-600 dark:text-indigo-400 font-semibold">Total:</strong>
                        <span id="ai-tele-tot">0 tokens</span>
                    </span>
                    <span class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-purple-50 dark:bg-purple-950/50 border border-purple-200 dark:border-purple-800/50">
                        <strong class="text-purple-600 dark:text-purple-400 font-semibold">Time:</strong>
                        <span id="ai-tele-time" class="font-bold text-purple-700 dark:text-purple-300">0.0s</span>
                        <span id="ai-tele-speed" class="text-slate-400 text-[11px]">(~0 tok/s)</span>
                    </span>
                </div>
                <div class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 font-semibold text-slate-900 dark:text-slate-100 shadow-2xs">
                    <span class="text-slate-500 dark:text-slate-400">Cost:</span>
                    <span id="ai-tele-cost" class="text-emerald-600 dark:text-emerald-400 font-bold">$0.0000</span>
                    <span id="ai-tele-model" class="text-slate-400 text-[11px] font-normal ml-0.5">(${activeModel})</span>
                </div>
            </div>

            <!-- Top Summary Badges -->
            <div id="ai-toc-telemetry-pills" class="flex items-center justify-between gap-2 flex-wrap text-xs px-1">
                <div class="inline-flex items-center gap-2 flex-wrap">
                    <span id="ai-pill-summary" class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-bold bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-300/80 dark:border-indigo-800/60 shadow-2xs">0 tok · $0.0000</span>
                    <span id="ai-pill-time" class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-bold bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-300/80 dark:border-purple-800/60 shadow-2xs">0.0s</span>
                </div>
                <span id="ai-pill-words" class="text-xs font-medium px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 shrink-0">0 words · 0 chars</span>
            </div>

            <div id="ai-live-feed" class="space-y-1.5 max-h-[32vh] overflow-y-auto custom-scrollbar pr-1"></div>
        </div>
    `;

    const liveFeed = document.getElementById('ai-live-feed');

    function updateTelemetryUI() {
        const elapsed = performance.now() - startTime;
        const durStr = formatTelemetryDuration(elapsed);
        const totTok = totalPromptTok + totalOutputTok;
        const speed = elapsed > 0 && totTok > 0 ? Math.round(totTok / (elapsed / 1000)) : 0;
        const costStr = calcTocCost(totalPromptTok, totalOutputTok, activeModel, activeProvider);

        const elIn = document.getElementById('ai-tele-in');
        const elOut = document.getElementById('ai-tele-out');
        const elTot = document.getElementById('ai-tele-tot');
        const elTime = document.getElementById('ai-tele-time');
        const elSpeed = document.getElementById('ai-tele-speed');
        const elCost = document.getElementById('ai-tele-cost');
        const elModel = document.getElementById('ai-tele-model');

        if (elIn) elIn.textContent = totalPromptTok.toLocaleString() + ' tokens';
        if (elOut) elOut.textContent = totalOutputTok.toLocaleString() + ' tokens';
        if (elTot) elTot.textContent = totTok.toLocaleString() + ' tokens';
        if (elTime) elTime.textContent = durStr;
        if (elSpeed) elSpeed.textContent = speed > 0 ? '(~' + speed + ' tok/s)' : '';
        if (elCost) elCost.textContent = costStr;
        if (elModel) elModel.textContent = '(' + activeModel + ')';

        const pSum = document.getElementById('ai-pill-summary');
        const pTime = document.getElementById('ai-pill-time');
        const pWords = document.getElementById('ai-pill-words');
        if (pSum) pSum.textContent = totTok.toLocaleString() + ' tok · ' + costStr;
        if (pTime) pTime.textContent = durStr;

        let totalChars = 0;
        let totalWords = 0;
        aiPolishedResults.forEach(r => {
            const name = r.cleanedName || '';
            totalChars += name.length;
            totalWords += (name.trim().split(/\s+/).filter(Boolean)).length;
        });
        if (pWords) pWords.textContent = totalWords + ' words · ' + totalChars + ' chars';
    }

    try {
        const alreadyDoneIndices = new Set(aiPolishedResults.map(r => r.index));

        // Save previous offline extraction map if available
        const offlineLookup = new Map();
        aiPolishedResults.forEach(r => {
            if (r.index && r.cleanedName) offlineLookup.set(r.index, r.cleanedName);
        });

        for (let b = 0; b < totalBatches; b++) {
            const startIdx = b * batchSize;
            const endIdx = Math.min(startIdx + batchSize, totalChapters);
            const batchSlice = storyChapters.slice(startIdx, endIdx);
            const batchChapters = [];

            for (let c of batchSlice) {
                const fname = (c.originalName || '').split('/').pop();
                const tocTitle = splitTocMap.get(c.originalName) || splitTocMap.get(fname) || '';
                let internalTitle = '';
                const fullPath = splitOpfDir + c.originalName;
                const f = splitMasterZip.files[fullPath];
                if (f) {
                    try {
                        const txt = await f.async('text');
                        const h = extractHeadingFromXhtml(txt, c.displayIndex, tocTitle);
                        if (h && h !== 'Chapter ' + c.displayIndex && !isMachineFilename(h)) {
                            internalTitle = h;
                        }
                    } catch (e) {}
                }
                if (!internalTitle && tocTitle && !isMachineFilename(tocTitle)) {
                    internalTitle = cleanChapterTitleString(tocTitle, c.displayIndex);
                }

                // If user did offline extraction first, give AI the offline title to verify
                const prevOffline = offlineLookup.get(c.displayIndex) || c.customName || '';
                const bestTitle = internalTitle || prevOffline || '';

                batchChapters.push({
                    index: c.displayIndex,
                    idref: c.idref,
                    rawName: c.originalName,
                    internalTitle: bestTitle
                });
            }

            if (batchChapters.length === 0) continue;

            const pText = document.getElementById('ai-batch-status-text');
            const pSub = document.getElementById('ai-batch-substatus');
            if (pText) pText.innerHTML = `<span class="inline-block w-2.5 h-2.5 rounded-full bg-purple-500 animate-ping"></span> Polishing Batch ${b + 1}/${totalBatches} (Chapters ${startIdx + 1}–${endIdx})...`;

            const onRetry = (msg) => {
                if (pSub) pSub.textContent = `⚠️ ${msg}`;
            };

            const customInstruction = document.getElementById('ai-toc-custom-instruction')?.value.trim() || '';
            const res = await window.aiPolishEpubToc(batchChapters, suggestedBookTitle, onRetry, activeProvider, customInstruction);
            if (res.cleanedTitle && b === 0) suggestedBookTitle = res.cleanedTitle;

            if (res.usage) {
                totalPromptTok += (res.usage.promptTokens || 0);
                totalOutputTok += (res.usage.outputTokens || 0);
                if (res.usage.model) activeModel = res.usage.model;
                if (res.usage.provider) activeProvider = res.usage.provider;
            }

            let items = [];
            if (Array.isArray(res.chapters)) items = res.chapters;
            else if (res.chapters && typeof res.chapters === 'object') items = Object.values(res.chapters);

            aiPolishedResults.push(...items);
            items.forEach(it => alreadyDoneIndices.add(it.index));

            // Update Progress Bar & Telemetry UI
            const pct = Math.min(100, Math.round((aiPolishedResults.length / totalChapters) * 100));
            const pBar = document.getElementById('ai-batch-progress-bar');
            const pPct = document.getElementById('ai-batch-pct');
            if (pBar) pBar.style.width = `${pct}%`;
            if (pPct) pPct.textContent = `${pct}%`;
            if (pSub) pSub.textContent = `Successfully cleaned ${aiPolishedResults.length} chapters so far.`;

            updateTelemetryUI();

            // Stream live result items into the view
            if (liveFeed) {
                items.forEach(item => {
                    const orig = storyChapters.find(c => c.displayIndex === item.index);
                    const row = document.createElement('div');
                    row.className = 'ai-row p-2 bg-white/90 dark:bg-slate-800/90 rounded-lg flex items-center justify-between gap-3 border border-slate-200 dark:border-slate-700/70 text-xs shadow-2xs';
                    row.innerHTML = `
                        <span class="text-purple-600 dark:text-purple-400 shrink-0 font-bold">#${item.index}</span>
                        <span class="text-slate-400 line-through truncate max-w-[35%]" title="${orig ? (orig.customName || orig.originalName) : ''}">${orig ? (orig.customName || orig.originalName) : ''}</span>
                        <span class="text-indigo-500 font-bold shrink-0">&rarr;</span>
                        <span class="text-emerald-600 dark:text-emerald-400 font-semibold truncate flex-1">${item.cleanedName}</span>
                    `;
                    liveFeed.appendChild(row);
                });
                liveFeed.scrollTop = liveFeed.scrollHeight;
            }

            await new Promise(r => setTimeout(r, 400));
        }

        aiPolishedResults.sort((a, b) => (a.index || 0) - (b.index || 0));

        // Finish state
        const pBar = document.getElementById('ai-batch-progress-bar');
        const pText = document.getElementById('ai-batch-status-text');
        const pPct = document.getElementById('ai-batch-pct');
        const pSub = document.getElementById('ai-batch-substatus');
        if (pBar) pBar.style.width = '100%';
        if (pPct) pPct.textContent = '100%';
        if (pText) pText.innerHTML = `✅ Complete! Polished ${aiPolishedResults.length} / ${totalChapters} chapters.`;
        if (pSub) pSub.textContent = 'All chapters standardized and ready to apply!';

        updateTelemetryUI();
        btnApply.disabled = false;
        showToast(`✨ Finished polishing ${aiPolishedResults.length} chapters!`, 'success');
    } catch (err) {
        console.error('AI TOC polish error:', err);
        const pSub = document.getElementById('ai-batch-substatus');
        if (pSub) pSub.innerHTML = `<span class="text-rose-500 font-bold">Paused: ${err.message}</span>`;
        if (aiPolishedResults.length > 0) {
            btnApply.disabled = false;
            showToast(`Paused. ${aiPolishedResults.length} chapters ready to apply or resume.`, 'warn');
        } else {
            showToast('AI Polish failed: ' + err.message, 'error');
        }
    } finally {
        btn.disabled = false;
        btnText.textContent = aiPolishedResults.length > 0 && aiPolishedResults.length < totalChapters ? 'Resume Polishing' : 'Regenerate Cleaned TOC';
    }
});

// Apply Cleaned AI Titles
document.getElementById('btn-apply-ai-toc')?.addEventListener('click', () => {
    if (!aiPolishedResults || aiPolishedResults.length === 0) return;
    let appliedCount = 0;

    aiPolishedResults.forEach(item => {
        const chap = storyChapters.find(c => c.displayIndex === item.index);
        if (chap && item.cleanedName) {
            chap.customName = item.cleanedName;
            appliedCount++;
        }
    });

    // Update DOM chapter list
    document.querySelectorAll('#chapter-list .chap-name').forEach(span => {
        const idref = span.getAttribute('data-idref');
        const chap = storyChapters.find(c => c.idref === idref);
        if (chap) span.textContent = chap.customName || chap.originalName;
    });

    document.getElementById('ai-toc-polish-modal')?.classList.add('hidden');
    showToast(`✨ Applied clean titles to ${appliedCount} chapters!`, 'success');
    logMsg(`AI Polish applied: standardized ${appliedCount} chapter titles.`);
});

};
