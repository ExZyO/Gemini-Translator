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
async function saveUniversalBlob(blob, fileName, mimeType = 'application/epub+zip', openChooser = false) {
    try {
        // 1. Native Android Bridge (Downloads folder via MediaStore)
        if (window.NativeBridge && window.NativeBridge.saveBlob) {
            const res = await window.NativeBridge.saveBlob(blob, fileName, mimeType, openChooser);
            if (window.__setDownloadModal) {
                window.__setDownloadModal({ fileName, path: res?.path || ('Download/GeminiTranslator/' + fileName), mimeType });
            }
            if (typeof showToast === 'function') {
                showToast(` Saved "${fileName}" to Downloads!`, 'success');
            }
            try {
                window.NativeBridge?.showCompletionNotification?.('File Saved! 💾', `Saved "${fileName}" to Downloads.`);
            } catch(e) {}
            return res;
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


// ── Title Deduplication & Heading Similarity Utilities ──
function normalizeTextForComparison(str) {
    if (!str) return '';
    return str
        .replace(/^第[0-9零一二三四五六七八九十百千万]+[章回卷节篇]\s*/i, '')
        .replace(/^(?:chapter|ch\.?)\s*\d+[\s:.-]*/i, '')
        .replace(/[^\p{L}\p{N}]+/gu, ' ')
        .trim()
        .toLowerCase();
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
    if (/^(?:author'?s?\s*note|translator'?s?\s*note|editor'?s?\s*note|t\/n|a\/n|synopsis|summary|foreword|preface|prologue|epilogue|afterword|interlude|warning|content\s*warning)\b/i.test(cleanLine.replace(/^#{1,6}\s*/, '').trim())) {
        return false;
    }

    const headingMatch = cleanLine.match(/^(#{1,6})\s+(.+)$/);
    const isMarkdownHeading = Boolean(headingMatch);
    const innerText = isMarkdownHeading
        ? headingMatch[2].replace(/^(\*{1,2}|_{1,2})(.+?)\1$/, '$2').trim()
        : cleanLine.replace(/^(\*{1,2}|_{1,2})(.+?)\1$/, '$2').trim();

    // If it is NOT a markdown heading, it must be short (< 90 chars) and not a full prose sentence ending in period
    if (!isMarkdownHeading) {
        if (cleanLine.length > 90) return false;
        if (/[.!?]$/.test(cleanLine) && !/[.!?]$/.test(title || '')) {
            const cNorm = normalizeTextForComparison(innerText);
            const tNorm = normalizeTextForComparison(title);
            if (cNorm !== tNorm) return false;
        }
    }

    // 1. Direct match with original title (e.g. Chinese source)
    if (originalTitle && originalTitle.trim()) {
        const oNorm = normalizeTextForComparison(originalTitle);
        const iNorm = normalizeTextForComparison(innerText);
        if (oNorm && (oNorm === iNorm || (isMarkdownHeading && (iNorm.includes(oNorm) || oNorm.includes(iNorm))))) {
            return true;
        }
    }

    // 2. Direct match with translated title
    if (title && title.trim()) {
        const tNorm = normalizeTextForComparison(title);
        const iNorm = normalizeTextForComparison(innerText);
        if (tNorm && (tNorm === iNorm || (isMarkdownHeading && (iNorm.includes(tNorm) || tNorm.includes(iNorm))))) {
            return true;
        }
        // 3. High word/stem similarity
        if (isMarkdownHeading && isSimilarToTitle(innerText, title)) {
            return true;
        }
    }

    // 4. Pure chapter heading line e.g. "### Chapter 1", "Chapter 1", "第1章"
    if (/^(?:第[0-9零一二三四五六七八九十百千万]+[章回卷节篇]|chapter\s*\d+|ch\.?\s*\d+)$/i.test(innerText)) {
        return true;
    }

    // 5. If it's a markdown heading at the very start of the text and shorter than 120 chars
    // and not a recognized special section:
    if (isMarkdownHeading && innerText.length < 120) {
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
