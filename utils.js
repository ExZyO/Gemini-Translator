(function() {

function escapeXml(unsafe) {
    if (unsafe === null || unsafe === undefined) return '';
    return String(unsafe)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
}
window.escapeXml = escapeXml;

// Utility functions for Gemini Translator & EPUB Studio

function sanitizeFilename(name) {
    if (!name) return "Unknown";
    return name.replace(/[<>:"/\\|?*\x00-\x1F]/g, "").trim() || "Unknown";
}

const sanitize = sanitizeFilename;

function setSmartTitle(opfDoc, title) {
    let dcTitle = opfDoc.getElementsByTagName("dc:title")[0] || opfDoc.getElementsByTagNameNS("http://purl.org/dc/elements/1.1/", "title")[0];
    if (dcTitle) {
        dcTitle.textContent = title;
    } else {
        const metadata = opfDoc.getElementsByTagName("metadata")[0];
        if (metadata) {
            const newTitle = opfDoc.createElementNS("http://purl.org/dc/elements/1.1/", "dc:title");
            newTitle.textContent = title;
            metadata.appendChild(newTitle);
        }
    }
}

function forceNewIdentifier(opfDoc) {
    let identifier = opfDoc.getElementsByTagName("dc:identifier")[0] || opfDoc.getElementsByTagNameNS("http://purl.org/dc/elements/1.1/", "identifier")[0];
    const uuid = 'urn:uuid:' + crypto.randomUUID();
    
    if (identifier) {
        identifier.textContent = uuid;
    } else {
        const metadata = opfDoc.getElementsByTagName("metadata")[0];
        if (metadata) {
            const newId = opfDoc.createElementNS("http://purl.org/dc/elements/1.1/", "dc:identifier");
            newId.setAttribute("id", "uuid_id");
            newId.textContent = uuid;
            metadata.appendChild(newId);
        }
    }
}

// Activity Console Logger for EPUB Studio
function logMsg(msg) {
    const logEl = document.getElementById('status-log');
    if (logEl) {
        const div = document.createElement('div');
        div.className = "text-slate-300";
        div.textContent = `> ${msg}`;
        logEl.appendChild(div);
        logEl.scrollTop = logEl.scrollHeight;
    }
    console.log(`[EPUB Studio] ${msg}`);
}

// Global Toast Dispatcher
function showToast(msg, type = 'success') {
    // Dispatch custom event for React toast listener
    if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('app-toast', { detail: { msg, type } }));
    }
}

// Export History Tracker
function addExportEntry(title, type, details) {
    try {
        const history = JSON.parse(localStorage.getItem('exportHistory') || '[]');
        history.unshift({
            id: Date.now().toString(36) + Math.random().toString(36).slice(2),
            title: title || 'Untitled Book',
            type: type || 'export',
            details: details || '',
            ts: new Date().toISOString()
        });
        localStorage.setItem('exportHistory', JSON.stringify(history.slice(0, 50)));
    } catch (e) {
        console.warn('Failed to save export history entry:', e);
    }
}



// Universal Native & Browser Blob Saver
async function saveUniversalBlob(blob, fileName, mimeType = 'application/epub+zip', openChooser = false, options = {}) {
    try {
        // 1. Native Android Bridge (Custom SAF Folder or Downloads)
        if (window.NativeBridge && window.NativeBridge.saveBlob) {
            const res = await window.NativeBridge.saveBlob(blob, fileName, mimeType, openChooser, options);
            const folderName = options?.folderPath || (options?.subDir ? options.subDir : 'Downloads');
            if (window.__setDownloadModal) {
                window.__setDownloadModal({ fileName, path: res?.path || (folderName + '/' + fileName), mimeType });
            }
            if (typeof showToast === 'function') {
                showToast(` Saved "${fileName}"!`, 'success');
            }
            try {
                window.NativeBridge?.showCompletionNotification?.('File Saved! 💾', `Saved "${fileName}".`);
            } catch(e) {}
            return res;
        }

        // 2. Browser Custom Directory Handle (if saved per novel)
        if (options?.dirHandle && typeof options.dirHandle.getFileHandle === 'function') {
            try {
                const fileHandle = await options.dirHandle.getFileHandle(fileName, { create: true });
                const writable = await fileHandle.createWritable();
                await writable.write(blob);
                await writable.close();
                if (typeof showToast === 'function') {
                    showToast(` Saved "${fileName}" to ${options.folderPath || 'folder'}!`, 'success');
                }
                return;
            } catch (err) {
                console.warn('dirHandle write failed, falling back:', err);
            }
        }

        // 2. Desktop Browser Native File System Access API
        if (typeof window !== 'undefined' && window.showSaveFilePicker) {
            try {
                const ext = fileName.split('.').pop();
                const handle = await window.showSaveFilePicker({
                    suggestedName: fileName,
                    types: [{
                        description: `${ext.toUpperCase()} File`,
                        accept: { [mimeType]: ['.' + ext] }
                    }]
                });
                const writable = await handle.createWritable();
                await writable.write(blob);
                await writable.close();
                if (typeof showToast === 'function') {
                    showToast(` Saved "${fileName}"!`, 'success');
                }
                try {
                    window.NativeBridge?.showCompletionNotification?.('File Saved! 💾', `Saved "${fileName}".`);
                } catch(e) {}
                return;
            } catch (err) {
                if (err.name === 'AbortError') return;
                console.warn('showSaveFilePicker fallback:', err);
            }
        }

        // 3. Standard Browser Blob Anchor Download
        const blobUrl = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = blobUrl;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        setTimeout(() => {
            document.body.removeChild(a);
            URL.revokeObjectURL(blobUrl);
        }, 2000);
        if (typeof showToast === 'function') {
            showToast(` Downloading "${fileName}"...`, 'success');
        }
        try {
            window.NativeBridge?.showCompletionNotification?.('File Downloaded! 💾', `Downloaded "${fileName}".`);
        } catch(e) {}
    } catch (e) {
        console.error('saveUniversalBlob failed:', e);
        if (typeof showToast === 'function') {
            showToast('Download error: ' + e.message, 'error');
        }
    }
}
window.saveUniversalBlob = saveUniversalBlob;
window.escapeXml = escapeXml;


// ── Semantic Title Decomposition & Heading Deduplication Utilities ──

function parseChapterTitleComponents(str) {
    if (!str) return { number: null, name: '', rawName: '', raw: '' };
    let s = String(str).trim();
    if (typeof decodeHtmlEntities === 'function') s = decodeHtmlEntities(s);

    // Strip BBCode tags (opening and closing: [center], [/center], [b], [/b], etc.)
    s = s.replace(/\[\/?(?:center|right|left|b|i|u|s|color|size|font|align)[^\]]*\]/gi, '');
    // Strip HTML tags: <center>, </center>, <p...>, </p>, <b>, </b>, etc.
    s = s.replace(/<\/?[a-z0-9]+[^>]*>/gi, '');
    // Strip leading markdown headings: ###
    s = s.replace(/^#{1,6}\s+/, '');
    // Strip leading and trailing markdown formatting: **, *, __, _, ~~, `, etc.
    s = s.replace(/^[*_~`]+|[*_~`]+$/g, '').trim();

    // Strip volume / book / arc prefix if present (e.g. "Volume 1 Chapter 29", "Vol. 1 -", "Book 2")
    s = s.replace(/^(?:volume|vol\.?|book|v\.?)\s*\d+[\s:–—-]*(?:chapter|ch\.?|ep\.?|episode|part|section|act)?\s*\d*[\s:–—-]*/i, '');

    let number = null;
    let name = s;

    // 1. Chapter/Episode/Part prefix: "Chapter 29: Title", "Ch. 29 - Title", "Episode 29 Title"
    const prefixMatch = s.match(/^(?:chapter|ch\.?|ep\.?|episode|part|section|act)\s*(\d+|[ivxlcdm]+)[\s:–—.-]*(.*)$/i);
    if (prefixMatch) {
        number = prefixMatch[1];
        name = prefixMatch[2];
    } else {
        // 2. CJK chapter markers: "第29章 Title", "第29节 Title", "第29话 Title"
        const cjkMatch = s.match(/^第\s*([0-9零一二三四五六七八九十百千万]+)\s*[章回卷节篇话話][\s:–—.-]*(.*)$/i);
        if (cjkMatch) {
            number = cjkMatch[1];
            name = cjkMatch[2];
        } else {
            // 3. Numeric prefix: "29. Title", "29 - Title", "29: Title", "29 Title", "#29 Title", "# 29: Title"
            const numMatch = s.match(/^#?\s*(\d+)[\s:–—.-]+(.*)$/i);
            if (numMatch) {
                number = numMatch[1];
                name = numMatch[2];
            } else {
                // 4. Standalone chapter number/label: "Chapter 29", "Chapter 001", "29.", "#29", "29"
                const pureNumMatch = s.match(/^(?:(?:chapter|ch\.?|ep\.?|episode|part)\s*)?(\d+)\.?$/i);
                if (pureNumMatch) {
                    number = pureNumMatch[1];
                    name = '';
                }
            }
        }
    }

    const normName = name.replace(/[^\p{L}\p{N}]+/gu, ' ').trim().toLowerCase();
    const numVal = number !== null ? parseInt(number, 10) : null;

    return {
        number: isNaN(numVal) ? (number ? String(number).toLowerCase() : null) : numVal,
        name: normName,
        rawName: name.trim(),
        raw: s
    };
}

function normalizeTextForComparison(str) {
    if (!str) return '';
    const parsed = parseChapterTitleComponents(str);
    return parsed.name;
}

function getWordStems(str) {
    if (!str) return [];
    const stopWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'is', 'are', 'was', 'were', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'from', 'does', 'not', 'no', 'this', 'that']);
    return str
        .toLowerCase()
        .replace(/[^\p{L}\p{N}]+/gu, ' ')
        .split(/\s+/)
        .filter(w => w.length > 1 && !stopWords.has(w))
        .map(w => w.length > 4 ? w.slice(0, 4) : w);
}

function isSimilarToTitle(candidate, title) {
    if (!candidate || !title) return false;
    const cNorm = normalizeTextForComparison(candidate);
    const tNorm = normalizeTextForComparison(title);
    if (!cNorm || !tNorm) return false;

    // Exact match
    if (cNorm === tNorm) return true;

    // Stem overlap
    const cStems = getWordStems(candidate);
    const tStems = getWordStems(title);
    if (cStems.length === 0 || tStems.length === 0) return false;

    const tSet = new Set(tStems);
    let common = 0;
    for (const stem of cStems) {
        if (tSet.has(stem)) common++;
    }

    const minLen = Math.min(cStems.length, tStems.length);
    const maxLen = Math.max(cStems.length, tStems.length);
    if (maxLen > minLen * 2.5 && maxLen > 6) return false;

    const ratio = common / minLen;
    return ratio >= 0.5 || (common >= 2 && minLen <= 4);
}

function isTitleEcho(line, title, originalTitle) {
    if (!line) return false;
    const cleanLine = line.trim();
    if (!cleanLine) return false;

    // Check special notes that must NEVER be stripped
    if (/^(?:author'?s?\s*note|translator'?s?\s*note|editor'?s?\s*note|t\/n|a\/n|synopsis|summary|foreword|preface|prologue|epilogue|afterword|interlude|warning|content\s*warning)\b/i.test(cleanLine.replace(/^#{1,6}\s*/, '').replace(/^(?:\[center\]|<center>|<p[^>]*>)\s*/i, '').trim())) {
        return false;
    }

    const headingMatch = cleanLine.match(/^(#{1,6})\s+(.+)$/);
    const isMarkdownHeading = Boolean(headingMatch);

    // If it is NOT a markdown heading, protect full prose sentences that end in period
    if (!isMarkdownHeading) {
        if (cleanLine.length > 140) return false;
        if (/[.!?]$/.test(cleanLine) && !/[.!?]$/.test(title || '')) {
            const cNorm = normalizeTextForComparison(cleanLine);
            const tNorm = normalizeTextForComparison(title);
            if (!cNorm || cNorm !== tNorm) return false;
        }
    }

    // 0. Template placeholder leak check e.g. "Chapter [number]: [Name]", "[number]: [Name]", "---Page End ---"
    if (/\[(?:number|\d+|name|title)\]/i.test(cleanLine) || /---\s*page\s*end\s*---/i.test(cleanLine)) {
        return true;
    }

    // 1. Semantic decomposition of line and chapter title
    const candParsed = parseChapterTitleComponents(cleanLine);
    const titleParsed = parseChapterTitleComponents(title);

    // 1a. Standalone chapter number/label matching chapter title number (e.g. "Chapter 001" or "29." vs "1. Good Morning Brother")
    if (!candParsed.name && candParsed.number !== null) {
        if (titleParsed.number !== null && candParsed.number === titleParsed.number) {
            return true;
        }
        // Standalone chapter label line without title text
        if (/^(?:(?:chapter|ch\.?|ep\.?|episode|part)\s*)?\d+\.?$/i.test(candParsed.raw)) {
            return true;
        }
    }

    // 1b. Exact normalized name match (e.g. "The Hunters and the Hunted" vs "29. The Hunters and the Hunted")
    if (candParsed.name && titleParsed.name && candParsed.name === titleParsed.name) {
        return true;
    }

    // 1c. Substring containment match for substantial names (>= 4 characters)
    if (candParsed.name && titleParsed.name && candParsed.name.length >= 4) {
        if (titleParsed.name.includes(candParsed.name) || candParsed.name.includes(titleParsed.name)) {
            return true;
        }
    }

    // 1d. Stem similarity match
    if (candParsed.name && titleParsed.name && isSimilarToTitle(candParsed.name, titleParsed.name)) {
        return true;
    }

    // 2. Direct match with original title (e.g. Japanese / Chinese source)
    if (originalTitle && originalTitle.trim()) {
        const origParsed = parseChapterTitleComponents(originalTitle);
        if (candParsed.name && origParsed.name) {
            if (candParsed.name === origParsed.name || candParsed.name.includes(origParsed.name) || origParsed.name.includes(candParsed.name)) {
                return true;
            }
        }
    }

    // 3. Standalone chapter heading patterns (e.g. "### Chapter 1", "Chapter 1: ...", "第1章")
    if (/^(?:第[0-9零一二三四五六七八九十百千万]+[章回卷节篇话話]|chapter\s*(?:\d+|\[(?:number|\d+)\])(?:\s*[:\-–—]\s*(?:\[(?:name|title)\]|.+))?|ch\.?\s*\d+|\[(?:chapter|number|name|title)\])/i.test(candParsed.raw)) {
        return true;
    }

    // 4. If it's an explicit markdown heading at the start of the chapter (< 120 chars)
    if (isMarkdownHeading && candParsed.raw.length < 120) {
        return true;
    }

    return false;
}

function stripLeadingTitleFromContent(content, title, originalTitle) {
    if (!content || typeof content !== 'string') return '';
    const lines = content.split(/\r?\n/);
    let startIdx = 0;

    while (startIdx < lines.length) {
        const line = lines[startIdx].trim();
        if (!line) {
            startIdx++;
            continue;
        }

        if (isTitleEcho(line, title, originalTitle)) {
            startIdx++;
            continue;
        }
        break;
    }

    return lines.slice(startIdx).join('\n').trim();
}

const NAMED_ENTITIES = {
    amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ',
    mdash: '\u2014', ndash: '\u2013', hellip: '\u2026',
    ldquo: '\u201c', rdquo: '\u201d', lsquo: '\u2018', rsquo: '\u2019',
    laquo: '\u00ab', raquo: '\u00bb', bull: '\u2022',
    cent: '\u00a2', pound: '\u00a3', yen: '\u00a5', euro: '\u20ac',
    copy: '\u00a9', reg: '\u00ae', deg: '\u00b0', plusmn: '\u00b1',
    times: '\u00d7', divide: '\u00f7'
};

function decodeHtmlEntities(str) {
    if (!str || typeof str !== 'string') return '';
    return str.replace(/&(?:#x([0-9a-fA-F]+)|#([0-9]+)|([a-zA-Z]+));/g, (match, hex, dec, named) => {
        if (hex) {
            const code = parseInt(hex, 16);
            return (code > 0 && code <= 0x10ffff) ? String.fromCodePoint(code) : match;
        }
        if (dec) {
            const code = parseInt(dec, 10);
            return (code > 0 && code <= 0x10ffff) ? String.fromCodePoint(code) : match;
        }
        if (named) {
            const lower = named.toLowerCase();
            if (NAMED_ENTITIES[lower]) return NAMED_ENTITIES[lower];
        }
        return match;
    });
}

function cleanNovelProse(text) {
    if (!text || typeof text !== 'string') return '';
    // Mask out protected tokens (Markdown illustrations, HTML images, and raw URLs) so prose typography never corrupts them
    const placeholders = [];
    let t = text.replace(/(?:!\[[^\]]*\]\([^\)]+\)|<img\b[^>]*>|https?:\/\/[^\s<>"'()]+)/gi, (match) => {
        const ph = `__PROTECTED_TOKEN_${placeholders.length}__`;
        placeholders.push(match);
        return ph;
    });

    t = decodeHtmlEntities(t);
    t = t.replace(/\u00a0/g, ' ');
    // Clean standalone markdown italic sound effects like *Rip!*, *Crack!*, *Whoosh!*
    t = t.replace(/^(\s*)\*([A-Za-z0-9!?,.\s'-]{1,30})\*(\s*)$/gm, '$1$2$3');
    // Strip residual web navigation artifacts
    t = t.replace(/^\s*(?:Previous Chapter|Next Chapter|Table of Contents|Prev|Next|TOC|Back to Top|Share this:?|Like this:?|Related|Loading\.\.\.|Leave a (?:Reply|Comment)|Click here to .+)\s*$/gim, '');
    // Strip prompt template / placeholder hallucinations like "Chapter [number]: [Name]", "[number]: [Name]", etc.
    t = t.replace(/^\s*(?:#{1,6}\s*)?Chapter\s*\[(?:number|\d+)\](?:\s*[:\-–—]\s*\[(?:name|title)\])?\s*$/gim, '');
    t = t.replace(/^\s*(?:#{1,6}\s*)?\[(?:chapter|number)\](?:\s*[:\-–—]\s*\[(?:name|title)\])?\s*$/gim, '');
    t = t.replace(/^\s*(?:#{1,6}\s*)?\[(?:Chapter\s*Name|Chapter\s*Title|Name|Title)\]\s*$/gim, '');
    t = t.replace(/^\s*---\s*Page\s*End\s*---\s*$/gim, '');
    // Strip residual WordPress / Tumblr / social widget lines
    t = t.replace(/^\s*(?:Advertisements?|Sponsored|Share on (?:Facebook|Twitter|Reddit)|Follow us on .+|Join our Discord.+|Support (?:us|me) on .+|Donate .+|Patreon .+|Buy me a coffee.+)\s*$/gim, '');
    // Strip residual BBCode alignment and formatting tags that should not appear as raw text in prose
    t = t.replace(/\[\/?(?:b|i|u|s|color|size|font|align)[^\]]*\]/gi, '');
    t = t.replace(/(?<!\[center\][\s\S]*?)\[\/center\]/gi, '');
    t = t.replace(/\*{4,}/g, '**');
    t = t.replace(/\*\*&gt;\s*/g, '**').replace(/\*\*>\s*/g, '**');
    t = t.replace(/__&gt;\s*/g, '__').replace(/__>\s*/g, '__');
    // Strip orphaned HTML tags (preserve markdown ![]() and html img if needed)
    t = t.replace(/<\/?(?:div|span|br|a|script|style|iframe|button|input|form|nav|header|footer|aside|section|figure|figcaption)[^>]*>/gi, '');
    // Normalize double+ blank lines into single blank line
    t = t.replace(/\n{3,}/g, '\n\n');
    // Fix broken hyphenation from OCR/web scrape (e.g. "trans-\nlation" -> "translation")
    t = t.replace(/(\w)-\s*\n\s*(\w)/g, '$1$2');
    // Normalize straight quotes to smart quotes
    t = t.replace(/"([^"]*?)"/g, '\u201c$1\u201d');
    t = t.replace(/(\w)'(\w)/g, '$1\u2019$2');
    // Normalize dashes and ellipsis
    t = t.replace(/---?/g, '\u2014');
    t = t.replace(/\.{3,}/g, '\u2026');
    // Remove accidental whitespace after opening quotation marks and at line edges.
    t = t.replace(/([\u201c\u2018"])\s+(?=[A-Za-z])/g, '$1');
    t = t.replace(/[ \t]+\n/g, '\n').replace(/\n[ \t]+/g, '\n');
    // Restore spaces lost when a model or chunk boundary joins sentences.
    t = t.replace(/([.!?\u2026]+)(["'\u201d\u2019)]?)(?=[A-Za-z])/g, '$1$2 ');

    // Restore protected tokens exactly as originally formatted
    placeholders.forEach((token, idx) => {
        t = t.replace(`__PROTECTED_TOKEN_${idx}__`, token);
    });

    return t.trim();
}

function sanitizeChapterTitle(title) {
    if (!title || typeof title !== 'string') return '';
    let t = title.trim();
    t = t.replace(/\s*(?:\[\d+\])?\s*[-—–]+\s*FOOTNOTES?\s*[-—–]+[\s\S]*/i, '');
    t = t.replace(/\s*\[\s*(?:TL|TN|Note|Translator'?s?\s*Note)[:\s][^\]]*\]\s*$/i, '');
    t = t.replace(/\s*\[[0-9¹²³⁴⁵⁶⁷⁸⁹]+\]\s*$/g, '');
    t = t.replace(/[¹²³⁴⁵⁶⁷⁸⁹]+$/g, '');
    t = t.replace(/^["'“”‘’](.*)["'“”‘’]$/, '$1');
    return t.trim() || title.trim();
}

window.decodeHtmlEntities = decodeHtmlEntities;
window.cleanNovelProse = cleanNovelProse;
window.sanitizeChapterTitle = sanitizeChapterTitle;

window.parseChapterTitleComponents = parseChapterTitleComponents;
window.normalizeTextForComparison = normalizeTextForComparison;
window.isSimilarToTitle = isSimilarToTitle;
window.isTitleEcho = isTitleEcho;
window.stripLeadingTitleFromContent = stripLeadingTitleFromContent;

window.sanitizeFilename = sanitizeFilename;
window.sanitize = sanitize;
window.setSmartTitle = setSmartTitle;
window.forceNewIdentifier = forceNewIdentifier;
window.logMsg = logMsg;
window.showToast = showToast;
window.addExportEntry = addExportEntry;
window.saveUniversalBlob = saveUniversalBlob;
})();
