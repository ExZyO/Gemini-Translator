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

// ═══════════════════════════════════════
// GLOBAL CONSTANTS
// ═══════════════════════════════════════
const MAX_PAYLOAD = 12000;
const PROMPT_OVERHEAD = 800;
const MAX_HISTORY = 20;
const DEFAULT_CONCURRENCY = 3;

const LANGUAGES = [
    'Auto-detect', 'English', 'Spanish', 'French', 'German', 'Italian', 'Portuguese',
    'Chinese (Simplified)', 'Chinese (Traditional)', 'Japanese', 'Korean', 'Russian',
    'Arabic', 'Hindi', 'Bengali', 'Urdu', 'Vietnamese', 'Turkish', 'Polish', 'Dutch',
    'Swedish', 'Norwegian', 'Danish', 'Finnish', 'Greek', 'Hebrew', 'Thai', 'Indonesian',
    'Malay', 'Filipino', 'Romanian', 'Hungarian', 'Czech', 'Slovak', 'Bulgarian',
    'Serbian', 'Croatian', 'Ukrainian', 'Lithuanian', 'Latvian', 'Estonian', 'Slovenian',
    'Catalan', 'Basque', 'Galician'
];
const TARGET_LANGUAGES = LANGUAGES.filter(l => l !== 'Auto-detect');

const DEEPL_LANG_MAP = {
    'English': 'EN', 'Spanish': 'ES', 'French': 'FR', 'German': 'DE', 'Italian': 'IT',
    'Portuguese': 'PT', 'Chinese (Simplified)': 'ZH', 'Chinese (Traditional)': 'ZH',
    'Japanese': 'JA', 'Korean': 'KO', 'Russian': 'RU', 'Arabic': 'AR', 'Hindi': 'HI',
    'Vietnamese': 'VI', 'Turkish': 'TR', 'Polish': 'PL', 'Dutch': 'NL', 'Swedish': 'SV',
    'Norwegian': 'NB', 'Danish': 'DA', 'Finnish': 'FI', 'Greek': 'EL', 'Hebrew': 'HE',
    'Indonesian': 'ID', 'Romanian': 'RO', 'Hungarian': 'HU', 'Czech': 'CS', 'Slovak': 'SK',
    'Bulgarian': 'BG', 'Serbian': 'SR', 'Croatian': 'HR', 'Ukrainian': 'UK', 'Lithuanian': 'LT',
    'Latvian': 'LV', 'Estonian': 'ET', 'Slovenian': 'SL'
};

const LIBRE_LANG_MAP = {
    'English': 'en', 'Spanish': 'es', 'French': 'fr', 'German': 'de', 'Italian': 'it',
    'Portuguese': 'pt', 'Chinese (Simplified)': 'zh', 'Chinese (Traditional)': 'zt',
    'Japanese': 'ja', 'Korean': 'ko', 'Russian': 'ru', 'Arabic': 'ar', 'Hindi': 'hi',
    'Vietnamese': 'vi', 'Turkish': 'tr', 'Polish': 'pl', 'Dutch': 'nl', 'Swedish': 'sv',
    'Norwegian': 'nb', 'Danish': 'da', 'Finnish': 'fi', 'Greek': 'el', 'Hebrew': 'he',
    'Indonesian': 'id', 'Filipino': 'tl', 'Romanian': 'ro', 'Hungarian': 'hu', 'Czech': 'cs',
    'Slovak': 'sk', 'Bulgarian': 'bg', 'Serbian': 'sr', 'Croatian': 'hr', 'Ukrainian': 'uk'
};

const DEFAULT_GEMINI_MODELS = [
    { id: 'gemini-3.8-flash', name: 'Gemini 3.8 Flash (Latest Flagship · Fast & Literary)' },
    { id: 'gemini-3.7-flash', name: 'Gemini 3.7 Flash (Flagship Hybrid & Fast)' },
    { id: 'gemini-3.6-flash', name: 'Gemini 3.6 Flash (Official 2026 Recommended)' },
    { id: 'gemini-3.5-flash', name: 'Gemini 3.5 Flash (Ultra Fast)' },
    { id: 'gemini-3.5-flash-lite', name: 'Gemini 3.5 Flash-Lite (Highest Free Quota)' },
    { id: 'gemini-3.1-flash-lite', name: 'Gemini 3.1 Flash-Lite (High Quota & Fast)' },
    { id: 'gemini-3.1-pro-preview', name: 'Gemini 3.1 Pro (Deep Literary Reasoning)' },
    { id: 'gemini-3-flash-preview', name: 'Gemini 3 Flash (Preview)' }
];

const DEFAULT_DEEPSEEK_MODELS = [
    { id: 'deepseek-chat', name: 'DeepSeek V3 / V4 Chat (Ultra Fast & Cheap)' },
    { id: 'deepseek-reasoner', name: 'DeepSeek R1 / V4 Pro (Deep Reasoning)' }
];

// ═══════════════════════════════════════
// METRICS, MATH & STRING HELPERS
// ═══════════════════════════════════════
const estimateTokens = (text) => {
    if (!text) return 0;
    const cjkMatch = text.match(/[\u4e00-\u9fa5\u3040-\u30ff\uac00-\ud7af]/g) || [];
    const nonCjk = text.replace(/[\u4e00-\u9fa5\u3040-\u30ff\uac00-\ud7af]/g, '');
    const words = nonCjk.trim().split(/\s+/).filter(Boolean);
    return Math.ceil(cjkMatch.length * 1.2 + words.length * 1.3);
};

const estimateCost = (tokens, modelId = 'gemini-3.7-flash', provider = 'gemini') => {
    let perMillion = 0.075;
    if (provider === 'deepseek') {
        if (modelId === 'deepseek-reasoner') perMillion = 0.55;
        else perMillion = 0.14;
    } else {
        if (modelId.includes('3.1-pro') || modelId.includes('pro')) perMillion = 1.25;
        else if (modelId.includes('flash-lite') || modelId.includes('8b')) perMillion = 0.0375;
        else if (modelId.includes('3.7-flash') || modelId.includes('3.6-flash') || modelId.includes('3.5-flash') || modelId.includes('3-flash')) perMillion = 0.075;
    }
    return ((tokens / 1000000) * perMillion).toFixed(4);
};

const calculateRealCost = (promptTokens, outputTokens, modelId = 'gemini-3.7-flash', provider = 'gemini') => {
    let inPerM = 0.075;
    let outPerM = 0.30;
    if (provider === 'deepseek') {
        if (modelId === 'deepseek-reasoner') {
            inPerM = 0.55;
            outPerM = 2.19;
        } else {
            inPerM = 0.14;
            outPerM = 0.28;
        }
    } else {
        if (modelId.includes('3.1-pro') || modelId.includes('pro')) {
            inPerM = 1.25;
            outPerM = 5.00;
        } else if (modelId.includes('flash-lite') || modelId.includes('8b')) {
            inPerM = 0.0375;
            outPerM = 0.15;
        } else {
            inPerM = 0.075;
            outPerM = 0.30;
        }
    }
    const cost = ((promptTokens / 1000000) * inPerM) + ((outputTokens / 1000000) * outPerM);
    return cost < 0.0001 && cost > 0 ? '$0.0001' : `$${cost.toFixed(4)}`;
};

const formatDuration = (ms) => {
    if (!ms || ms <= 0) return '0.0s';
    const totalSec = ms / 1000;
    if (totalSec < 1) {
        return `${totalSec.toFixed(2)}s`;
    }
    if (totalSec < 60) {
        return `${totalSec.toFixed(1)}s`;
    }
    const totalMin = Math.floor(totalSec / 60);
    const remSec = Math.floor(totalSec % 60);
    if (totalMin < 60) {
        return `${totalMin}m ${remSec}s`;
    }
    const totalHours = Math.floor(totalMin / 60);
    const remMin = totalMin % 60;
    if (totalHours < 24) {
        return `${totalHours}h ${remMin}m ${remSec}s`;
    }
    const days = Math.floor(totalHours / 24);
    const remHours = totalHours % 24;
    return `${days}d ${remHours}h ${remMin}m`;
};

const wordCount = (t) => {
    if (!t) return 0;
    let count = 0;
    let inWord = false;
    for (let i = 0; i < t.length; i++) {
        const code = t.charCodeAt(i);
        if ((code >= 0x4e00 && code <= 0x9fa5) ||
            (code >= 0x3040 && code <= 0x30ff) ||
            (code >= 0xac00 && code <= 0xd7af)) {
            if (inWord) inWord = false;
            count++;
        } else if (
            (code >= 48 && code <= 57) ||
            (code >= 65 && code <= 90) ||
            (code >= 97 && code <= 122) ||
            code === 95 ||
            (code > 127 && /\w/.test(t[i]))
        ) {
            if (!inWord) {
                inWord = true;
                count++;
            }
        } else {
            inWord = false;
        }
    }
    return count;
};

const charCount = t => (t ? t.length : 0);
const genId = () => Date.now().toString(36) + Math.random().toString(36).slice(2);

const cleanText = t => {
    if (!t || typeof t !== 'string') return '';
    let c = t.replace(/\r\n|\r/g, '\n');
    c = c.replace(/[ \t]{2,}/g, ' ');
    c = c.replace(/(\n\s*){2,}/g, '\n\n');
    return c.trim();
};

const copyText = async t => {
    if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(t);
    }
};

const generateJobId = (text, isFile = false) => {
    let hash = 0; const s = isFile ? text : (text ? text.substring(0, 1000) : '');
    for (let i = 0; i < s.length; i++) { hash = ((hash << 5) - hash) + s.charCodeAt(i); hash |= 0; }
    return `job_${Math.abs(hash)}`;
};

// ═══════════════════════════════════════
// NETWORKING & PARALLELISM
// ═══════════════════════════════════════
const fetchRetry = async (url, opts, retries = 3, timeoutMs = 75000) => {
    let delay = 1500;
    for (let i = 0; i < retries; i++) {
        if (opts?.signal?.aborted) {
            const err = new Error('Translation paused.');
            err.name = 'AbortError';
            throw err;
        }

        const attemptController = new AbortController();
        let timeoutId = setTimeout(() => {
            attemptController.abort(new Error(`Request timed out (${Math.round(timeoutMs / 1000)}s).`));
        }, timeoutMs);

        const onParentAbort = () => {
            clearTimeout(timeoutId);
            attemptController.abort(opts.signal?.reason || new Error('Translation paused.'));
        };

        if (opts?.signal) {
            opts.signal.addEventListener('abort', onParentAbort, { once: true });
        }

        try {
            const fetchOpts = { ...opts, signal: attemptController.signal };
            const r = await fetch(url, fetchOpts);
            clearTimeout(timeoutId);
            if (opts?.signal) opts.signal.removeEventListener('abort', onParentAbort);

            if (r.status === 429) {
                const errText = await r.text().catch(() => '');
                const err = new Error(`Rate limit (429): ${errText.substring(0, 150)}`);
                err.status = 429;
                throw err;
            }
            if (r.status >= 500 && i < retries - 1) {
                if (opts?.signal?.aborted) {
                    const err = new Error('Translation paused.');
                    err.name = 'AbortError';
                    throw err;
                }
                const msg = r.status === 503
                    ? `Google server high demand (503). Retrying in ${(delay / 1000).toFixed(1)}s... (${i + 1}/${retries})`
                    : `API Error ${r.status}. Retrying in ${(delay / 1000).toFixed(1)}s... (${i + 1}/${retries})`;
                console.warn(msg);

                await new Promise((resolve, reject) => {
                    const timer = setTimeout(resolve, delay);
                    if (opts?.signal) {
                        const onAbort = () => {
                            clearTimeout(timer);
                            const err = new Error('Translation paused.');
                            err.name = 'AbortError';
                            reject(err);
                        };
                        opts.signal.addEventListener('abort', onAbort, { once: true });
                    }
                });
                delay *= 1.5;
                continue;
            }
            return r;
        } catch (e) {
            clearTimeout(timeoutId);
            if (opts?.signal) opts.signal.removeEventListener('abort', onParentAbort);

            if (opts?.signal?.aborted || (e.name === 'AbortError' && opts?.signal?.aborted)) {
                const err = new Error('Translation paused.');
                err.name = 'AbortError';
                throw err;
            }

            if (e.status === 429 || (e.message || '').includes('429')) {
                throw e;
            }

            if (i === retries - 1) throw e;
            const msg = e.message?.includes('timed out')
                ? `Request timed out. Retrying in ${(delay / 1000).toFixed(1)}s... (${i + 1}/${retries})`
                : `Connection busy. Retrying in ${(delay / 1000).toFixed(1)}s... (${i + 1}/${retries})`;
            console.warn(msg);

            await new Promise((resolve, reject) => {
                const timer = setTimeout(resolve, delay);
                if (opts?.signal) {
                    const onAbort = () => {
                        clearTimeout(timer);
                        const err = new Error('Translation paused.');
                        err.name = 'AbortError';
                        reject(err);
                    };
                    opts.signal.addEventListener('abort', onAbort, { once: true });
                }
            });
            delay *= 1.5;
        }
    }
};

const batchParallel = async (items, fn, concurrency = 3, signal = null) => {
    if (!items || items.length === 0) return [];
    const results = new Array(items.length);
    let nextIndex = 0;
    const numWorkers = Math.max(1, Math.min(concurrency, items.length));

    const workers = Array.from({ length: numWorkers }, async (_, workerId) => {
        if (workerId > 0) {
            await new Promise(r => setTimeout(r, workerId * 350));
        }
        while (nextIndex < items.length) {
            if (signal?.aborted) {
                const err = new Error('Translation paused.');
                err.name = 'AbortError';
                throw err;
            }
            const currentIndex = nextIndex++;
            const item = items[currentIndex];
            try {
                const res = await fn(item, currentIndex, workerId);
                results[currentIndex] = res;
            } catch (err) {
                if (signal?.aborted || err.name === 'AbortError') throw err;
                results[currentIndex] = { error: err.message || 'Unknown error' };
            }
        }
    });

    await Promise.all(workers);
    return results;
};

const CHUNK_PAYLOAD_MAP = {
    turbo: 4500,
    large: 3800,
    medium: 2800,
    small: 1800
};

const splitChunks = (text, effectiveTermLength = 0, smartGlossary = false, preset = null) => {
    if (!text || typeof text !== 'string') return [];
    const activePreset = preset || (typeof localStorage !== 'undefined' ? localStorage.getItem('chunkSizePreset') : null) || 'turbo';
    const basePayload = CHUNK_PAYLOAD_MAP[activePreset] || 4500;
    const glossaryLen = typeof effectiveTermLength === 'number' ? effectiveTermLength : 0;
    const effectiveGlossaryLen = smartGlossary ? Math.min(glossaryLen, 1500) : glossaryLen;
    const promptOverhead = typeof PROMPT_OVERHEAD !== 'undefined' ? PROMPT_OVERHEAD : 800;
    let max = basePayload - Math.min(promptOverhead + effectiveGlossaryLen, 1800);
    if (max > 3500) max = 3500;
    if (max <= 0) max = 1800;
    const chunks = []; let rem = text;
    while (rem.length > 0) {
        if (rem.length <= max) { chunks.push(rem); break; }
        let sp = max;
        // Priority 1: Paragraph break (\n\n)
        let idx = rem.lastIndexOf('\n\n', max);
        if (idx !== -1 && idx >= max * 0.4) {
            sp = idx + 2;
        } else {
            // Priority 2: Single newline (\n)
            idx = rem.lastIndexOf('\n', max);
            if (idx !== -1 && idx >= max * 0.4) {
                sp = idx + 1;
            } else {
                // Priority 3: Sentence terminators
                const punctIndices = [
                    rem.lastIndexOf('。\n', max),
                    rem.lastIndexOf('。', max),
                    rem.lastIndexOf('！\n', max),
                    rem.lastIndexOf('！', max),
                    rem.lastIndexOf('？\n', max),
                    rem.lastIndexOf('？', max),
                    rem.lastIndexOf('”\n', max),
                    rem.lastIndexOf('”', max),
                    rem.lastIndexOf('…\n', max),
                    rem.lastIndexOf('…', max),
                    rem.lastIndexOf('.\n', max),
                    rem.lastIndexOf('.', max),
                    rem.lastIndexOf('!\n', max),
                    rem.lastIndexOf('!', max),
                    rem.lastIndexOf('?\n', max),
                    rem.lastIndexOf('?', max)
                ].filter(i => i >= max * 0.3);

                if (punctIndices.length > 0) {
                    sp = Math.max(...punctIndices) + 1;
                } else {
                    // Priority 4: Fallback to any newline or period in the first half rather than cutting mid-sentence
                    const anyPunct = [
                        rem.lastIndexOf('\n\n', max),
                        rem.lastIndexOf('\n', max),
                        rem.lastIndexOf('。', max),
                        rem.lastIndexOf('.', max)
                    ].filter(i => i > 0);
                    if (anyPunct.length > 0) {
                        sp = Math.max(...anyPunct) + 1;
                    }
                }
            }
        }
        if (sp <= 0) sp = max;
        chunks.push(rem.substring(0, sp));
        rem = rem.substring(sp);
    }
    return chunks;
};

// ═══════════════════════════════════════
// BACKGROUND WEB WORKER BRIDGE
// ═══════════════════════════════════════
let appWorker = null;
let workerMsgId = 0;
const workerCallbacks = new Map();

const initAppWorker = () => {
    try {
        if (typeof window !== 'undefined' && window.Worker && !appWorker) {
            appWorker = new Worker('./worker.js');
            appWorker.onmessage = (e) => {
                const { id, success, error, ...rest } = e.data || {};
                if (workerCallbacks.has(id)) {
                    const { resolve, reject } = workerCallbacks.get(id);
                    workerCallbacks.delete(id);
                    if (success) resolve(rest);
                    else reject(new Error(error || 'Worker operation failed'));
                }
            };
            appWorker.onerror = (err) => {
                console.warn('Worker error:', err);
            };
        }
    } catch (e) {
        console.warn('Web Worker not available, falling back seamlessly to main thread:', e);
    }
};

const callWorker = (type, payload) => {
    return new Promise((resolve, reject) => {
        try {
            if (!appWorker) initAppWorker();
            if (!appWorker) return resolve(null);
            const id = ++workerMsgId;
            workerCallbacks.set(id, { resolve, reject });
            appWorker.postMessage({ id, type, payload });
        } catch (e) {
            resolve(null);
        }
    });
};

// ═══════════════════════════════════════
// INFO TOOLTIP (Responsive & Touch-Friendly)
// ═══════════════════════════════════════
const InfoTooltip = ({ title, text, tip }) => {
    const ReactObj = (typeof window !== 'undefined' && window.React) || (typeof React !== 'undefined' ? React : null);
    if (!ReactObj) return null;
    const { useState, useEffect, useRef, createElement: h } = ReactObj;
    const ic = (typeof window !== 'undefined' && window.ic) || ((Icon, size, className) => h('span', { className }));
    const Info = (typeof window !== 'undefined' && window.Info) || 'Info';
    const X = (typeof window !== 'undefined' && window.X) || 'X';

    const [show, setShow] = useState(false);
    const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' ? window.innerWidth < 640 : false);
    const [placement, setPlacement] = useState('top');
    const btnRef = useRef(null);

    useEffect(() => {
        const handleResize = () => setIsMobile(typeof window !== 'undefined' ? window.innerWidth < 640 : false);
        if (typeof window !== 'undefined') {
            window.addEventListener('resize', handleResize, { passive: true });
            return () => window.removeEventListener('resize', handleResize);
        }
    }, []);

    const checkPlacement = () => {
        if (btnRef.current) {
            const rect = btnRef.current.getBoundingClientRect();
            if (rect.top < 240) {
                setPlacement('bottom');
            } else {
                setPlacement('top');
            }
        }
    };

    const handleOpen = () => {
        checkPlacement();
        setShow(true);
    };

    const isBottom = placement === 'bottom';

    return h('span', { className: 'relative inline-flex items-center ml-1' },
        h('button', {
            ref: btnRef,
            type: 'button',
            onClick: (e) => { e.preventDefault(); e.stopPropagation(); checkPlacement(); setShow(p => !p); },
            onMouseEnter: () => { if (!isMobile) handleOpen(); },
            onMouseLeave: () => { if (!isMobile) setShow(false); },
            className: 'text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 p-1 rounded-full hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors cursor-pointer inline-flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-indigo-500/40 min-w-[24px] min-h-[24px]',
            'aria-label': `${title} information`
        }, ic(Info, 14)),

        // Mobile Centered Modal Popover with Backdrop
        show && isMobile && h('div', {
            className: 'fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 animate-fade-in',
            onClick: (e) => { e.stopPropagation(); setShow(false); }
        },
            h('div', {
                className: 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 p-5 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-sm max-h-[85vh] overflow-y-auto space-y-3 relative',
                onClick: (e) => e.stopPropagation()
            },
                h('div', { className: 'flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2.5' },
                    h('div', { className: 'font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-2 text-sm' },
                        ic(Info, 16),
                        title
                    ),
                    h('button', {
                        type: 'button',
                        onClick: () => setShow(false),
                        className: 'p-1 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer',
                        'aria-label': 'Close info'
                    }, ic(X, 16))
                ),
                h('p', { className: 'text-slate-600 dark:text-slate-300 text-xs leading-relaxed' }, text),
                tip && h('div', { className: 'bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/60 p-2.5 rounded-xl text-[11px] text-indigo-800 dark:text-indigo-300' },
                    h('strong', { className: 'font-semibold text-indigo-900 dark:text-indigo-200' }, 'Tip: '), tip
                ),
                h('button', {
                    type: 'button',
                    onClick: () => setShow(false),
                    className: 'w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl transition-all cursor-pointer'
                }, 'Got it')
            )
        ),

        // Desktop Sleek Popover
        show && !isMobile && h('div', {
            className: `absolute ${isBottom ? 'top-full mt-2' : 'bottom-full mb-2'} left-1/2 -translate-x-1/2 w-80 max-w-[calc(100vw-32px)] p-3.5 bg-slate-900 dark:bg-slate-900 text-white text-xs rounded-xl shadow-2xl border border-slate-700 z-50 transition-all pointer-events-none`
        },
            h('div', { className: 'font-bold text-indigo-300 mb-1 flex items-center gap-1.5' },
                ic(Info, 13),
                title
            ),
            h('p', { className: 'text-slate-200 leading-relaxed mb-1.5' }, text),
            tip && h('p', { className: 'text-slate-400 border-t border-slate-700 pt-1.5 text-[11px]' },
                h('strong', { className: 'text-indigo-300' }, 'Tip: '), tip
            )
        )
    );
};

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

window.DEFAULT_GEMINI_MODELS = DEFAULT_GEMINI_MODELS;
window.DEFAULT_DEEPSEEK_MODELS = DEFAULT_DEEPSEEK_MODELS;
window.LANGUAGES = LANGUAGES;
window.TARGET_LANGUAGES = TARGET_LANGUAGES;
window.DEEPL_LANG_MAP = DEEPL_LANG_MAP;
window.LIBRE_LANG_MAP = LIBRE_LANG_MAP;
window.MAX_PAYLOAD = MAX_PAYLOAD;
window.PROMPT_OVERHEAD = PROMPT_OVERHEAD;
window.MAX_HISTORY = MAX_HISTORY;
window.DEFAULT_CONCURRENCY = DEFAULT_CONCURRENCY;

window.estimateTokens = estimateTokens;
window.estimateCost = estimateCost;
window.calculateRealCost = calculateRealCost;
window.formatDuration = formatDuration;
window.wordCount = wordCount;
window.charCount = charCount;
window.genId = genId;
window.cleanText = cleanText;
window.copyText = copyText;
window.generateJobId = generateJobId;

window.fetchRetry = fetchRetry;
window.batchParallel = batchParallel;
window.CHUNK_PAYLOAD_MAP = CHUNK_PAYLOAD_MAP;
window.splitChunks = splitChunks;

window.initAppWorker = initAppWorker;
window.callWorker = callWorker;

window.InfoTooltip = InfoTooltip;

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        escapeXml,
        sanitizeFilename,
        sanitize,
        setSmartTitle,
        forceNewIdentifier,
        logMsg,
        showToast,
        addExportEntry,
        saveUniversalBlob,
        parseChapterTitleComponents,
        normalizeTextForComparison,
        getWordStems,
        isSimilarToTitle,
        isTitleEcho,
        stripLeadingTitleFromContent,
        decodeHtmlEntities,
        cleanNovelProse,
        sanitizeChapterTitle,
        DEFAULT_GEMINI_MODELS,
        DEFAULT_DEEPSEEK_MODELS,
        LANGUAGES,
        TARGET_LANGUAGES,
        DEEPL_LANG_MAP,
        LIBRE_LANG_MAP,
        MAX_PAYLOAD,
        PROMPT_OVERHEAD,
        MAX_HISTORY,
        DEFAULT_CONCURRENCY,
        estimateTokens,
        estimateCost,
        calculateRealCost,
        formatDuration,
        wordCount,
        charCount,
        genId,
        cleanText,
        copyText,
        generateJobId,
        CHUNK_PAYLOAD_MAP,
        fetchRetry,
        batchParallel,
        splitChunks,
        initAppWorker,
        callWorker,
        InfoTooltip
    };
}
})();
