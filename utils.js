(function() {
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
async function saveUniversalBlob(blob, fileName, mimeType = 'application/epub+zip') {
    try {
        // 1. Native Android Bridge (Downloads folder via MediaStore)
        if (window.NativeBridge && window.NativeBridge.saveBlob) {
            const res = await window.NativeBridge.saveBlob(blob, fileName, mimeType);
            if (window.__setDownloadModal) {
                window.__setDownloadModal({ fileName, path: res?.path || ('Download/GeminiTranslator/' + fileName), mimeType });
            }
            if (typeof showToast === 'function') {
                showToast(`💾 Saved "${fileName}" to Downloads!`, 'success');
            }
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
                    showToast(`💾 Saved "${fileName}"!`, 'success');
                }
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
            showToast(`💾 Downloading "${fileName}"...`, 'success');
        }
    } catch (e) {
        console.error('saveUniversalBlob failed:', e);
        if (typeof showToast === 'function') {
            showToast('Download error: ' + e.message, 'error');
        }
    }
}
window.saveUniversalBlob = saveUniversalBlob;


window.sanitizeFilename = sanitizeFilename;
window.sanitize = sanitize;
window.setSmartTitle = setSmartTitle;
window.forceNewIdentifier = forceNewIdentifier;
window.logMsg = logMsg;
window.showToast = showToast;
window.addExportEntry = addExportEntry;
window.saveUniversalBlob = saveUniversalBlob;
})();
