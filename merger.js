
function validateZipHeader(buffer, filename) {
    if (!buffer || buffer.byteLength < 22) {
        throw new Error(`"${filename}" is too small or empty (${buffer ? buffer.byteLength : 0} bytes). If stored in OneDrive/cloud, please make sure it is downloaded locally.`);
    }
    const bytes = new Uint8Array(buffer.slice(0, 4));
    if (bytes[0] !== 0x50 || bytes[1] !== 0x4B) {
        throw new Error(`"${filename}" is not a valid EPUB/ZIP file (missing PK signature). The file may be corrupted.`);
    }
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

window.initMerger = function() {
let mergeFiles = [];
let customCoverFile = null;
let mergeChapterCounts = new Map(); // file.name -> chapter count
let mergeWordCounts = new Map(); // file.name -> word count

const mergeInput = document.getElementById('merge-input');
const mergeUploadBox = document.getElementById('merge-upload-box');
const mergeListContainer = document.getElementById('merge-list-container');
const mergeFileList = document.getElementById('merge-file-list');
const btnExecuteMerge = document.getElementById('btn-execute-merge');
const mergeTitleInput = document.getElementById('merge-title');
const memoryWarning = document.getElementById('memory-warning');
const btnClearAllMerge = document.getElementById('btn-clear-all-merge');

const coverInput = document.getElementById('cover-input');
const btnSelectCover = document.getElementById('btn-select-cover');
const btnRemoveCover = document.getElementById('btn-remove-cover');
const coverPreview = document.getElementById('cover-preview');

// Cover handling
btnSelectCover?.addEventListener('click', () => coverInput.click());
coverPreview?.addEventListener('click', () => coverInput.click());

coverInput?.addEventListener('change', (e) => {
    if (e.target.files && e.target.files[0]) {
        customCoverFile = e.target.files[0];
        const reader = new FileReader();
        reader.onload = (event) => {
            coverPreview.innerHTML = `<img src="${event.target.result}" class="w-full h-full object-cover">`;
            btnRemoveCover.classList.remove('hidden');
        };
        reader.readAsDataURL(customCoverFile);
    }
});

btnRemoveCover?.addEventListener('click', () => {
    customCoverFile = null;
    if (coverInput) coverInput.value = '';
    if (coverPreview) coverPreview.innerHTML = `<span class="text-[10px] leading-tight text-slate-400 text-center px-1">Book 1<br>Cover</span>`;
    btnRemoveCover.classList.add('hidden');
});

// Upload Handlers
mergeUploadBox?.addEventListener('click', (e) => {
    if (e.target !== mergeInput) mergeInput.click();
});
document.getElementById('btn-add-more-merge')?.addEventListener('click', () => mergeInput.click());

// Clear All Logic
btnClearAllMerge?.addEventListener('click', () => {
    if (confirm("Are you sure you want to clear all queued books?")) {
        mergeFiles = [];
        if (mergeTitleInput) mergeTitleInput.value = '';
        renderMergeList();
    }
});

// Natural Alphanumeric Sort (Book 1, Book 2... Book 10)
document.getElementById('btn-sort-merge-natural')?.addEventListener('click', () => {
    if (mergeFiles.length === 0) return showToast('No files in merge list', 'warn');
    const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });
    mergeFiles.sort((a, b) => collator.compare(a.name, b.name));
    mergeFiles.forEach((f, i) => {
        if (/^Book \d+$/.test(f.customLabel)) f.customLabel = `Book ${i + 1}`;
    });
    renderMergeList();
    showToast('Sorted books in natural order (A–Z)!', 'success');
});

mergeInput?.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
        handleMergeFiles(Array.from(e.target.files));
    }
    e.target.value = '';
});

window.handleMergeFiles = handleMergeFiles;
function handleMergeFiles(files) {
    const validFiles = files.filter(f => {
        const n = (f.name || '').toLowerCase();
        const isEpub = n.endsWith('.epub') || n.endsWith('.zip') || f.type === 'application/epub+zip';
        const hasSize = (f.size || 0) > 0;
        if (isEpub && !hasSize) {
            showToast(`Skipped empty/0-byte file: ${f.name}`, 'warn');
        }
        return isEpub && hasSize;
    });
    if (validFiles.length === 0) return;

    // Duplicate detection
    const existingNames = new Set(mergeFiles.map(f => f.name));
    const dupes = validFiles.filter(f => existingNames.has(f.name));
    if (dupes.length > 0) {
        showToast(`Duplicate${dupes.length > 1 ? 's' : ''} detected: ${dupes.map(f => f.name).join(', ')}`, 'warn');
    }

    mergeFiles = mergeFiles.concat(validFiles);
    mergeUploadBox?.classList.add('hidden');
    mergeListContainer?.classList.remove('hidden');

    if (mergeFiles.length > 0 && mergeTitleInput && !mergeTitleInput.value) {
        let baseName = mergeFiles[0].name.replace(/\.epub$/i, '').replace(/\([^\)]+\)/g, '').trim();
        mergeTitleInput.value = `${baseName} (Merged)`;
    }

    // Auto-extract cover from the first EPUB if no custom cover is set
    if (!customCoverFile && mergeFiles.length > 0) {
        extractCoverFromEpub(mergeFiles[0]);
    }

    // Extract chapter counts for newly added files
    extractEpubStats(validFiles);

    renderMergeList();
}

async function extractCoverFromEpub(file) {
    try {
        const buf = await file.arrayBuffer();
        const zip = await new JSZip().loadAsync(buf);
        const containerXml = await zip.file("META-INF/container.xml").async("text");
        const parser = new DOMParser();
        const opfPath = parser.parseFromString(containerXml, "text/xml").querySelector("rootfile").getAttribute("full-path");
        const opfDir = opfPath.includes("/") ? opfPath.substring(0, opfPath.lastIndexOf('/') + 1) : "";
        const opfText = await zip.file(opfPath).async("text");
        const opfDoc = parser.parseFromString(opfText, "text/xml");

        let coverItem = opfDoc.querySelector('item[properties~="cover-image"]');
        if (!coverItem) {
            const metaCover = opfDoc.querySelector('meta[name="cover"]');
            if (metaCover) {
                const coverId = metaCover.getAttribute("content");
                coverItem = opfDoc.querySelector(`item[id="${coverId}"]`);
            }
        }
        if (!coverItem) {
            coverItem = Array.from(opfDoc.querySelectorAll('item[media-type^="image"]')).find(item => {
                const h = (item.getAttribute('href') || '').toLowerCase();
                const id = (item.getAttribute('id') || '').toLowerCase();
                return h.includes('cover') || id.includes('cover');
            });
        }

        if (coverItem && coverPreview) {
            let coverHref = coverItem.getAttribute("href");
            if (coverHref.startsWith('../')) coverHref = coverHref.replace('../', '');
            const fullCoverPath = opfDir + coverHref;
            const coverFile = zip.file(fullCoverPath);
            if (coverFile) {
                const coverBlob = await coverFile.async("blob");
                const blobUrl = URL.createObjectURL(coverBlob);
                coverPreview.innerHTML = `<img src="${blobUrl}" class="w-full h-full object-cover">`;
            }
        }
    } catch (e) {
        console.log("Cover extraction skipped:", e.message);
    }
}

async function extractEpubStats(files) {
    const parser = new DOMParser();
    for (const file of files) {
        try {
            const buf = await file.arrayBuffer();
            const zip = await new JSZip().loadAsync(buf);
            const containerXml = await zip.file("META-INF/container.xml").async("text");
            const opfPath = parser.parseFromString(containerXml, "text/xml").querySelector("rootfile").getAttribute("full-path");
            const opfDir = opfPath.includes("/") ? opfPath.substring(0, opfPath.lastIndexOf('/') + 1) : "";
            const opfText = await zip.file(opfPath).async("text");
            const opfDoc = parser.parseFromString(opfText, "text/xml");

            const spineItems = opfDoc.querySelectorAll('spine itemref');
            mergeChapterCounts.set(file.name, spineItems.length);

            const manifest = {};
            opfDoc.querySelectorAll('manifest item').forEach(item => {
                manifest[item.getAttribute('id')] = item.getAttribute('href');
            });

            let totalWords = 0;
            for (const itemref of spineItems) {
                const idref = itemref.getAttribute('idref');
                const href = manifest[idref];
                if (!href) continue;
                const fullPath = href.startsWith('../') ? href.replace('../', '') : opfDir + href;
                const entry = zip.file(fullPath);
                if (!entry) continue;
                try {
                    const xhtml = await entry.async("text");
                    const doc = parser.parseFromString(xhtml, "text/html");
                    const text = (doc.body ? doc.body.textContent : doc.documentElement.textContent) || '';
                    const cjk = (text.match(/[\u4e00-\u9fa5\u3040-\u30ff\uac00-\ud7af]/g) || []).length;
                    const nonCjk = (text.replace(/[\u4e00-\u9fa5\u3040-\u30ff\uac00-\ud7af]/g, ' ').match(/\b\w+\b/g) || []).length;
                    totalWords += (cjk + nonCjk);
                } catch (_) {}
            }
            mergeWordCounts.set(file.name, totalWords);
        } catch (e) {
            console.log("Stats extraction skipped for", file.name, e.message);
        }
    }
    renderMergeList();
}

let draggedIdx = null;

function renderMergeList() {
    if (!mergeFileList) return;
    mergeFileList.innerHTML = '';
    let totalBytes = mergeFiles.reduce((acc, f) => acc + f.size, 0);
    if (memoryWarning) {
        if (totalBytes > 300 * 1024 * 1024) memoryWarning.classList.remove('hidden');
        else memoryWarning.classList.add('hidden');
    }

    if (mergeFiles.length === 0) {
        mergeListContainer?.classList.add('hidden');
        mergeUploadBox?.classList.remove('hidden');
        btnClearAllMerge?.classList.add('hidden');
        return;
    } else {
        btnClearAllMerge?.classList.remove('hidden');
    }

    mergeFiles.forEach((f, idx) => {
        const div = document.createElement('div');
        div.className = "p-2.5 bg-white/90 dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-700/80 rounded-xl flex items-center justify-between gap-2 shadow-2xs hover:border-fuchsia-400/50 transition-all";

        div.draggable = true;
        div.addEventListener('dragstart', () => draggedIdx = idx);
        div.addEventListener('dragover', (e) => {
            e.preventDefault();
            div.classList.add('drag-over');
        });
        div.addEventListener('dragleave', () => {
            div.classList.remove('drag-over');
        });
        div.addEventListener('drop', (e) => {
            e.preventDefault();
            div.classList.remove('drag-over');
            if (draggedIdx === null || draggedIdx === idx) return;
            const item = mergeFiles.splice(draggedIdx, 1)[0];
            mergeFiles.splice(idx, 0, item);
            renderMergeList();
        });

        if (!f.customLabel) {
            f.customLabel = `Book ${idx + 1}`;
        }

        const chCount = mergeChapterCounts.get(f.name);
        const wCount = mergeWordCounts.get(f.name);
        const sizeKB = (f.size / 1024).toFixed(0);
        const sizeMB = (f.size / (1024 * 1024)).toFixed(1);
        const sizeLabel = f.size >= 1024 * 1024 ? `${sizeMB} MB` : `${sizeKB} KB`;
        const chapLabel = chCount != null ? `${chCount} ch` : '';
        const wordLabel = wCount != null ? formatWordStat(wCount) : '…';
        const infoParts = [sizeLabel, chapLabel, wordLabel].filter(Boolean).join(' · ');

        div.innerHTML = `
            <div class="flex items-start gap-2.5 min-w-0 flex-1 cursor-move select-none p-1">
                <span class="text-xs font-bold text-fuchsia-600 dark:text-fuchsia-400 mt-2">${idx + 1}.</span>
                <div class="flex flex-col min-w-0 flex-1">
                    <span class="font-semibold text-xs break-words whitespace-normal leading-tight pr-1 text-slate-800 dark:text-slate-200 max-h-10 overflow-hidden text-ellipsis">${f.name}</span>
                    <span class="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">${infoParts}</span>
                    <input type="text" class="book-label-input mt-1.5 w-full bg-slate-50/70 dark:bg-slate-950/70 border border-slate-300/80 dark:border-slate-700/80 rounded-lg px-2.5 py-1 text-xs font-bold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-fuchsia-500/30 focus:border-fuchsia-500" value="${f.customLabel}" placeholder="e.g. Volume 1">
                </div>
            </div>
            <div class="flex items-center gap-1.5 shrink-0">
                <button type="button" class="btn-up w-8 h-8 flex items-center justify-center text-slate-500 hover:text-fuchsia-600 bg-slate-100 dark:bg-slate-800 rounded-lg disabled:opacity-30 transition-all cursor-pointer font-bold" ${idx === 0 ? 'disabled' : ''}>↑</button>
                <button type="button" class="btn-down w-8 h-8 flex items-center justify-center text-slate-500 hover:text-fuchsia-600 bg-slate-100 dark:bg-slate-800 rounded-lg disabled:opacity-30 transition-all cursor-pointer font-bold" ${idx === mergeFiles.length - 1 ? 'disabled' : ''}>↓</button>
                <button type="button" class="btn-remove w-8 h-8 flex items-center justify-center text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg text-sm font-bold transition-all cursor-pointer" aria-label="Remove">✕</button>
            </div>
        `;

        div.querySelector('.btn-up').onclick = (e) => {
            e.stopPropagation();
            if (idx > 0) {
                const item = mergeFiles.splice(idx, 1)[0];
                mergeFiles.splice(idx - 1, 0, item);
                renderMergeList();
            }
        };

        div.querySelector('.btn-down').onclick = (e) => {
            e.stopPropagation();
            if (idx < mergeFiles.length - 1) {
                const item = mergeFiles.splice(idx, 1)[0];
                mergeFiles.splice(idx + 1, 0, item);
                renderMergeList();
            }
        };

        div.querySelector('.btn-remove').onclick = (e) => {
            e.stopPropagation();
            mergeFiles.splice(idx, 1);
            renderMergeList();
        };

        div.querySelector('.book-label-input').addEventListener('input', (e) => {
            mergeFiles[idx].customLabel = e.target.value;
        });

        mergeFileList.appendChild(div);
    });

    const totalSize = mergeFiles.reduce((acc, f) => acc + f.size, 0);
    const totalSizeMB = (totalSize / (1024 * 1024)).toFixed(1);
    const totalChapters = mergeFiles.reduce((acc, f) => acc + (mergeChapterCounts.get(f.name) || 0), 0);
    const totalWords = mergeFiles.reduce((acc, f) => acc + (mergeWordCounts.get(f.name) || 0), 0);
    const wordsKnown = mergeFiles.filter(f => mergeWordCounts.has(f.name)).length;
    const summaryDiv = document.createElement('div');
    summaryDiv.className = 'mt-3 px-3 py-2 rounded-lg bg-slate-100/60 dark:bg-slate-800/60 text-xs text-slate-500 dark:text-slate-400 text-center';
    const wordTotal = totalWords >= 1000 ? `${(totalWords / 1000).toFixed(1)}k` : totalWords;
    const wordText = wordsKnown === mergeFiles.length ? `${wordTotal} words` : `${wordTotal}+ words (scanning…)`;
    summaryDiv.textContent = `${mergeFiles.length} books · ${totalChapters} ch · ${wordText} · ${totalSizeMB} MB`;
    mergeFileList.appendChild(summaryDiv);
}

function updateParsingProgress(current, total, label = '') {
    const pWrapper = document.getElementById('merge-progress-wrapper');
    const pBar = document.getElementById('merge-progress-bar');
    const pPercent = document.getElementById('merge-progress-percent');
    const pStatus = document.getElementById('merge-progress-status');

    if (pWrapper) pWrapper.classList.remove('hidden');

    const percent = Math.floor((current / total) * 100);
    if (pBar) pBar.style.width = percent + '%';
    if (pPercent) pPercent.textContent = percent + '%';
    if (pStatus) pStatus.textContent = label || `Merging Book ${current} of ${total}...`;
}

function resolveRelativePath(baseDir, relativePath) {
    if (!relativePath) return "";
    const stack = baseDir ? baseDir.split('/').filter(Boolean) : [];
    const parts = relativePath.split('/');
    for (let p of parts) {
        if (p === '.' || p === '') continue;
        if (p === '..') stack.pop();
        else stack.push(p);
    }
    return stack.join('/');
}

// Merge execution
btnExecuteMerge?.addEventListener('click', async () => {
    if (mergeFiles.length < 2) return showToast("Add at least 2 books to merge", "warn");

    const btnText = document.getElementById('merge-btn-text');
    const btnSpinner = document.getElementById('merge-spinner');
    if (btnText) btnText.textContent = "Merging Books...";
    if (btnSpinner) btnSpinner.classList.remove('hidden');
    btnExecuteMerge.disabled = true;

    try {
        const parser = new DOMParser();
        const serializer = new XMLSerializer();

        updateParsingProgress(1, mergeFiles.length, `Reading Master Book Buffer (1/${mergeFiles.length})...`);

        const masterBuffer = await mergeFiles[0].arrayBuffer();
        validateZipHeader(masterBuffer, mergeFiles[0].name);
        const masterZip = await new JSZip().loadAsync(masterBuffer);

        const newZip = new JSZip();
        newZip.file("mimetype", "application/epub+zip", { compression: "STORE" });

        // Clone master entries cleanly as in-memory Uint8Arrays to prevent detached stream errors
        for (let p in masterZip.files) {
            if (p === "mimetype" || masterZip.files[p].dir) continue;
            const data = await masterZip.files[p].async("uint8array");
            newZip.file(p, data);
        }

        const containerXml = await masterZip.file("META-INF/container.xml").async("text");
        const masterOpfPath = parser.parseFromString(containerXml, "text/xml").querySelector("rootfile").getAttribute("full-path");
        const masterOpfDir = masterOpfPath.includes("/") ? masterOpfPath.substring(0, masterOpfPath.lastIndexOf('/') + 1) : "";
        const masterOpfDoc = parser.parseFromString(await masterZip.file(masterOpfPath).async("text"), "text/xml");

        const cleanTitle = (mergeTitleInput?.value || "Merged Book").trim();
        setSmartTitle(masterOpfDoc, cleanTitle);

        const preserveBookId = document.getElementById('preserve-book-id')?.checked ?? true;
        if (!preserveBookId) forceNewIdentifier(masterOpfDoc);

        // Apply Metadata
        const metadataEl = masterOpfDoc.querySelector("metadata");
        if (metadataEl) {
            const mAuthor = document.getElementById("merge-author")?.value.trim();
            const mPublisher = document.getElementById("merge-publisher")?.value.trim();
            const mLanguage = document.getElementById("merge-language")?.value.trim();

            if (mAuthor) {
                Array.from(metadataEl.getElementsByTagName("dc:creator")).forEach(el => el.remove());
                const creatorNode = masterOpfDoc.createElementNS("http://purl.org/dc/elements/1.1/", "dc:creator");
                creatorNode.textContent = mAuthor;
                metadataEl.appendChild(creatorNode);
            }
            if (mPublisher) {
                Array.from(metadataEl.getElementsByTagName("dc:publisher")).forEach(el => el.remove());
                const pubNode = masterOpfDoc.createElementNS("http://purl.org/dc/elements/1.1/", "dc:publisher");
                pubNode.textContent = mPublisher;
                metadataEl.appendChild(pubNode);
            }
            if (mLanguage) {
                Array.from(metadataEl.getElementsByTagName("dc:language")).forEach(el => el.remove());
                const langNode = masterOpfDoc.createElementNS("http://purl.org/dc/elements/1.1/", "dc:language");
                langNode.textContent = mLanguage;
                metadataEl.appendChild(langNode);
            }
        }

        // Custom Cover
        if (customCoverFile) {
            let coverItem = masterOpfDoc.querySelector('item[properties~="cover-image"]') ||
                masterOpfDoc.querySelector(`item[id="${masterOpfDoc.querySelector('meta[name="cover"]')?.getAttribute("content")}"]`);
            const data = await customCoverFile.arrayBuffer();
            if (coverItem) newZip.file(masterOpfDir + coverItem.getAttribute("href"), data);
        }

        // 1. Initialize Master EPUB 2 NCX
        let masterNcxPath = null, masterNcxDoc = null, masterNavMap = null;
        const ncxItem = masterOpfDoc.querySelector('item[media-type="application/x-dtbncx+xml"]');
        if (ncxItem) {
            masterNcxPath = masterOpfDir + ncxItem.getAttribute("href");
            if (masterZip.file(masterNcxPath)) {
                masterNcxDoc = parser.parseFromString(await masterZip.file(masterNcxPath).async("text"), "application/xml");
                masterNavMap = masterNcxDoc.querySelector("navMap");

                if (masterNavMap) {
                    const originalNavPoints = Array.from(masterNavMap.children).filter(el => el.tagName === 'navPoint');
                    const labelStr = (mergeFiles[0].customLabel || 'Book 1').trim();
                    
                    const masterPoint = masterNcxDoc.createElement("navPoint");
                    masterPoint.setAttribute("id", "vol_master_1");
                    masterPoint.setAttribute("playOrder", "1");

                    const navLabel = masterNcxDoc.createElement("navLabel");
                    const textNode = masterNcxDoc.createElement("text");
                    textNode.textContent = labelStr;
                    navLabel.appendChild(textNode);
                    masterPoint.appendChild(navLabel);

                    if (originalNavPoints.length > 0) {
                        const firstContent = originalNavPoints[0].querySelector("content");
                        if (firstContent) {
                            const masterContent = masterNcxDoc.createElement("content");
                            masterContent.setAttribute("src", firstContent.getAttribute("src"));
                            masterPoint.appendChild(masterContent);
                        }
                    }

                    originalNavPoints.forEach(np => masterPoint.appendChild(np));
                    masterNavMap.innerHTML = '';
                    masterNavMap.appendChild(masterPoint);
                }
            }
        }

        // 2. Initialize Master EPUB 3 NAV (nav.xhtml)
        const navItem = masterOpfDoc.querySelector('item[properties~="nav"]') || masterOpfDoc.querySelector('item[id*="nav"]') || masterOpfDoc.querySelector('item[id*="toc"]');
        let masterNavPath = null, masterNavDoc = null, masterNavOl = null;
        if (navItem) {
            masterNavPath = masterOpfDir + navItem.getAttribute("href");
            if (masterZip.file(masterNavPath)) {
                masterNavDoc = parser.parseFromString(await masterZip.file(masterNavPath).async("text"), "application/xhtml+xml");
                const navEl = masterNavDoc.querySelector('nav[epub\\:type="toc"], nav[type="toc"], nav#toc, nav');
                if (navEl) {
                    masterNavOl = navEl.querySelector('ol');
                    if (masterNavOl) {
                        const originalLis = Array.from(masterNavOl.children).filter(el => el.tagName.toLowerCase() === 'li');
                        const labelStr = (mergeFiles[0].customLabel || 'Book 1').trim();

                        const masterLi = masterNavDoc.createElement("li");
                        const subOl = masterNavDoc.createElement("ol");

                        const firstA = originalLis[0]?.querySelector('a');
                        if (firstA) {
                            const masterA = masterNavDoc.createElement("a");
                            masterA.setAttribute("href", firstA.getAttribute("href"));
                            masterA.textContent = labelStr;
                            masterLi.appendChild(masterA);
                        } else {
                            const masterSpan = masterNavDoc.createElement("span");
                            masterSpan.textContent = labelStr;
                            masterLi.appendChild(masterSpan);
                        }

                        originalLis.forEach(li => subOl.appendChild(li));
                        masterLi.appendChild(subOl);

                        masterNavOl.innerHTML = '';
                        masterNavOl.appendChild(masterLi);
                    }
                }
            }
        }

        // 3. Loop and merge remaining books (Book 2, Book 3, ...)
        for (let i = 1; i < mergeFiles.length; i++) {
            updateParsingProgress(i + 1, mergeFiles.length, `Merging Book ${i + 1} of ${mergeFiles.length} (${mergeFiles[i].name})...`);

            const subBuffer = await mergeFiles[i].arrayBuffer();
            validateZipHeader(subBuffer, mergeFiles[i].name);
            const subZip = await new JSZip().loadAsync(subBuffer);
            const subContainerXml = await subZip.file("META-INF/container.xml").async("text");
            const subOpfPath = parser.parseFromString(subContainerXml, "text/xml").querySelector("rootfile").getAttribute("full-path");
            const subOpfDir = subOpfPath.includes("/") ? subOpfPath.substring(0, subOpfPath.lastIndexOf('/') + 1) : "";
            const subOpfDoc = parser.parseFromString(await subZip.file(subOpfPath).async("text"), "text/xml");

            const subManifest = Array.from(subOpfDoc.querySelectorAll("manifest > item"));
            const idMap = {};
            const hrefMap = {};

            // Build collision-free IDs and filenames
            subManifest.forEach((it, idx) => {
                const oldId = it.getAttribute("id") || `item_${idx}`;
                const oldHref = (it.getAttribute("href") || '').trim();
                const newId = `b${i}_${oldId}`;
                const fileName = oldHref.split('/').pop();
                const newHref = `b${i}_${fileName}`;
                idMap[oldId] = newId;
                hrefMap[oldHref] = newHref;
                hrefMap[oldHref.replace(/^\.\//, '')] = newHref;
                hrefMap[fileName] = newHref;
            });

            // Copy assets and chapter files with re-written relative paths
            for (let it of subManifest) {
                const oldHref = (it.getAttribute("href") || '').trim();
                const mime = it.getAttribute("media-type") || "";
                const newHref = hrefMap[oldHref] || `b${i}_${oldHref.split('/').pop()}`;
                const fullPath = subOpfDir + oldHref;

                if (subZip.file(fullPath)) {
                    if (mime.includes("html") || mime.includes("xml") || mime.includes("css")) {
                        let txt = await subZip.file(fullPath).async("text");
                        const oDir = oldHref.includes('/') ? oldHref.substring(0, oldHref.lastIndexOf('/') + 1) : "";
                        txt = txt.replace(/(href|src)=["']([^"']+)["']/g, (m, attr, val) => {
                            let lp = val.split('#')[0];
                            let h = val.split('#')[1] ? '#' + val.split('#')[1] : '';
                            if (lp.startsWith('http') || lp.startsWith('data:')) return m;
                            let res = resolveRelativePath(oDir, lp);
                            let mapped = hrefMap[res] || hrefMap[lp] || hrefMap[lp.split('/').pop()];
                            if (mapped) return `${attr}="${mapped}${h}"`;
                            return m;
                        });
                        newZip.file(masterOpfDir + newHref, txt);
                    } else {
                        newZip.file(masterOpfDir + newHref, await subZip.file(fullPath).async("uint8array"));
                    }

                    const ni = masterOpfDoc.createElement("item");
                    ni.setAttribute("id", idMap[it.getAttribute("id")]);
                    ni.setAttribute("href", newHref);
                    ni.setAttribute("media-type", mime);
                    masterOpfDoc.querySelector("manifest")?.appendChild(ni);
                }
            }

            // Append spine items
            const subSpine = subOpfDoc.querySelectorAll("spine > itemref");
            subSpine.forEach(ref => {
                const sid = ref.getAttribute("idref");
                if (idMap[sid]) {
                    const nr = masterOpfDoc.createElement("itemref");
                    nr.setAttribute("idref", idMap[sid]);
                    masterOpfDoc.querySelector("spine")?.appendChild(nr);
                }
            });

            const labelStr = (mergeFiles[i].customLabel || `Book ${i + 1}`).trim();

            // Append to EPUB 2 NCX (toc.ncx)
            if (masterNcxDoc && masterNavMap) {
                const subNcx = subOpfDoc.querySelector('item[media-type="application/x-dtbncx+xml"]');
                if (subNcx) {
                    const snPath = subOpfDir + subNcx.getAttribute("href");
                    const snDir = subNcx.getAttribute("href").includes('/') ? subNcx.getAttribute("href").substring(0, subNcx.getAttribute("href").lastIndexOf('/') + 1) : "";
                    if (subZip.file(snPath)) {
                        const snd = parser.parseFromString(await subZip.file(snPath).async("text"), "application/xml");

                        const masterPoint = masterNcxDoc.createElement("navPoint");
                        masterPoint.setAttribute("id", `vol_master_${i + 1}`);

                        const navLabel = masterNcxDoc.createElement("navLabel");
                        const textNode = masterNcxDoc.createElement("text");
                        textNode.textContent = labelStr;
                        navLabel.appendChild(textNode);
                        masterPoint.appendChild(navLabel);

                        let firstContentFound = false;
                        let childIdx = 0;

                        snd.querySelectorAll("navMap > navPoint").forEach(np => {
                            const cl = masterNcxDoc.importNode(np, true);
                            cl.setAttribute("id", `b${i}_np_${++childIdx}`);
                            
                            cl.querySelectorAll("content").forEach(c => {
                                let s = (c.getAttribute("src") || '').trim();
                                let lp = s.split('#')[0];
                                let h = s.split('#')[1] ? '#' + s.split('#')[1] : '';
                                let res = resolveRelativePath(snDir, lp);
                                let mapped = hrefMap[res] || hrefMap[lp] || hrefMap[lp.split('/').pop()];
                                if (mapped) {
                                    const finalSrc = mapped + h;
                                    c.setAttribute("src", finalSrc);

                                    if (!firstContentFound) {
                                        const masterContent = masterNcxDoc.createElement("content");
                                        masterContent.setAttribute("src", finalSrc);
                                        masterPoint.appendChild(masterContent);
                                        firstContentFound = true;
                                    }
                                }
                            });
                            masterPoint.appendChild(cl);
                        });

                        masterNavMap.appendChild(masterPoint);
                    }
                }
            }

            // Append to EPUB 3 NAV (nav.xhtml)
            if (masterNavDoc && masterNavOl) {
                const subNavItem = subOpfDoc.querySelector('item[properties~="nav"]') || subOpfDoc.querySelector('item[id*="nav"]') || subOpfDoc.querySelector('item[id*="toc"]');
                const masterLi = masterNavDoc.createElement("li");
                const subOl = masterNavDoc.createElement("ol");
                let firstAHref = null;

                if (subNavItem) {
                    const snNavPath = subOpfDir + subNavItem.getAttribute("href");
                    const snNavDir = subNavItem.getAttribute("href").includes('/') ? subNavItem.getAttribute("href").substring(0, subNavItem.getAttribute("href").lastIndexOf('/') + 1) : "";
                    if (subZip.file(snNavPath)) {
                        const subNavDoc = parser.parseFromString(await subZip.file(snNavPath).async("text"), "application/xhtml+xml");
                        const subNavEl = subNavDoc.querySelector('nav[epub\\:type="toc"], nav[type="toc"], nav#toc, nav');
                        const subOlSource = subNavEl?.querySelector('ol');

                        if (subOlSource) {
                            Array.from(subOlSource.children).forEach(childLi => {
                                const cl = masterNavDoc.importNode(childLi, true);
                                cl.querySelectorAll('a').forEach(a => {
                                    let href = (a.getAttribute('href') || '').trim();
                                    let lp = href.split('#')[0];
                                    let h = href.split('#')[1] ? '#' + href.split('#')[1] : '';
                                    let res = resolveRelativePath(snNavDir, lp);
                                    let mapped = hrefMap[res] || hrefMap[lp] || hrefMap[lp.split('/').pop()];
                                    if (mapped) {
                                        const finalHref = mapped + h;
                                        a.setAttribute('href', finalHref);
                                        if (!firstAHref) firstAHref = finalHref;
                                    }
                                });
                                subOl.appendChild(cl);
                            });
                        }
                    }
                }

                if (firstAHref) {
                    const masterA = masterNavDoc.createElement("a");
                    masterA.setAttribute("href", firstAHref);
                    masterA.textContent = labelStr;
                    masterLi.appendChild(masterA);
                } else {
                    const masterSpan = masterNavDoc.createElement("span");
                    masterSpan.textContent = labelStr;
                    masterLi.appendChild(masterSpan);
                }

                if (subOl.children.length > 0) {
                    masterLi.appendChild(subOl);
                }
                masterNavOl.appendChild(masterLi);
            }
        }

        // Sequential playOrder renumbering across all merged NCX navPoints
        if (masterNcxDoc) {
            let playOrderCounter = 1;
            masterNcxDoc.querySelectorAll("navPoint").forEach(np => {
                np.setAttribute("playOrder", String(playOrderCounter++));
            });
            newZip.file(masterNcxPath, serializer.serializeToString(masterNcxDoc));
        }

        if (masterNavDoc && masterNavPath) {
            newZip.file(masterNavPath, serializer.serializeToString(masterNavDoc));
        }

        newZip.file(masterOpfPath, serializer.serializeToString(masterOpfDoc));

        // Compression & Export Stage
        if (btnText) btnText.textContent = "Compressing Final File...";
        const compressionLevel = document.getElementById('merge-compression')?.value || "DEFLATE";
        const pStatus = document.getElementById('merge-progress-status');
        if (pStatus) pStatus.textContent = "Compressing Final Merged EPUB...";
        const pBar = document.getElementById('merge-progress-bar');
        if (pBar) pBar.style.width = '0%';

        // Direct, fast, offline-bulletproof generation
        const mergedBlob = await newZip.generateAsync({
            type: "blob",
            compression: compressionLevel,
            mimeType: "application/epub+zip"
        }, function updateCallback(metadata) {
            const pWrapper = document.getElementById('merge-progress-wrapper');
            const pBar = document.getElementById('merge-progress-bar');
            const pPercent = document.getElementById('merge-progress-percent');
            if (pWrapper) pWrapper.classList.remove('hidden');
            if (pBar) pBar.style.width = metadata.percent.toFixed(0) + '%';
            if (pPercent) pPercent.textContent = metadata.percent.toFixed(0) + '%';
        });

        const a = document.createElement("a");
        a.href = URL.createObjectURL(mergedBlob);
        a.download = `${cleanTitle}.epub`;
        a.click();
        showToast("✨ Books merged successfully!", "success");
        if (typeof addExportEntry === 'function') {
            addExportEntry(cleanTitle, 'merge', `${mergeFiles.length} books`);
        }

    } catch (err) {
        console.error("Merge error:", err);
        showToast("Merge failed: " + err.message, "error");
    } finally {
        if (btnText) btnText.textContent = "Merge & Download";
        if (btnSpinner) btnSpinner.classList.add('hidden');
        btnExecuteMerge.disabled = false;

        const pWrapper = document.getElementById('merge-progress-wrapper');
        const pBar = document.getElementById('merge-progress-bar');
        if (pWrapper) pWrapper.classList.add('hidden');
        if (pBar) pBar.style.width = '0%';
    }
});

};
