/**
 * Gemini Translator - In-App Ebook & EPUB Studio Editor
 * 100% Client-side & Offline EPUB Editor
 * - Full prose editing with live word count
 * - Chapter insertion, deletion, reordering (▲/▼)
 * - Table of Contents hierarchy edits (Indent '→ Sub' / Outdent '← Main')
 * - Illustration manager: insert images from phone/PC, book-wide gallery, 1-tap cover changer
 * - Batch title sanitizer & auto-numbering
 * - Global Find & Replace across all chapters
 * - 1-tap Save to Library & Reader / Direct EPUB export
 */
(function() {
    'use strict';

    // ── Helper functions ──
    const escapeXml = (str) => {
        if (!str) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&apos;');
    };

    const decodeEntities = (text) => {
        if (!text) return '';
        if (typeof window !== 'undefined' && typeof window.decodeHtmlEntities === 'function') {
            return window.decodeHtmlEntities(text);
        }
        return String(text)
            .replace(/&amp;/g, '&')
            .replace(/&quot;/g, '"')
            .replace(/&apos;|&#039;/g, "'")
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&nbsp;/g, ' ');
    };

    function cleanTitle(raw, fallbackIndex) {
        if (!raw) return 'Chapter ' + fallbackIndex;
        let s = String(raw).trim();

        // 1. Strip file path, extension, and system prefixes
        s = s.replace(/^.*[\\\/]/, '');
        s = s.replace(/\.(?:xhtml|html|xml)$/i, '');
        s = s.replace(/^b\d+_/i, '');

        // 2. Strip leading & inline markdown hashes
        s = s.replace(/^\s*#{1,6}\s*/, '');
        s = s.replace(/\s+#{1,6}\s+/g, ' ');

        if (s.includes('_')) s = s.replace(/_/g, ' ');
        s = s.replace(/\s+/g, ' ').trim();

        // 3. Strip web scraper watermarks and website signatures
        s = s.replace(/\s*(?:\||–|—|-)\s*(?:NovelFull|Royal\s*Road|Wuxiaworld|LightNovelPub|BoxNovel|Scribble\s*Hub|FreeWebNovel|AllNovelFull|ReadNovelFull|NovelBuddy|Re:Library|Witch\s*Cult\s*Translations|Translation\s*Chicken)[^–—\-]*/gi, '');
        s = s.replace(/\s*\[(?:NovelFull|Royal\s*Road|Wuxiaworld|LightNovelPub|BoxNovel|Scribble\s*Hub|FreeWebNovel|AllNovelFull|ReadNovelFull|NovelBuddy)\]/gi, '');
        s = s.replace(/\s*\((?:NovelFull|Royal\s*Road|Wuxiaworld|LightNovelPub|BoxNovel|Scribble\s*Hub|FreeWebNovel|AllNovelFull|ReadNovelFull|NovelBuddy)\)/gi, '');
        s = s.replace(/\s*\[(?:Sponsored|Early\s*Access|Patreon|Bonus|Unedited|Edited|Proofread|MTL|RAW)\]/gi, '');
        s = s.replace(/\s*\((?:Sponsored|Early\s*Access|Patreon|Bonus|Unedited|Edited|Proofread|MTL|RAW|End\s*of\s*Chapter)\)/gi, '');
        s = s.replace(/\s*(?:\[\d+\])?\s*[-—–]+\s*FOOTNOTES?\s*[-—–]+[\s\S]*/i, '');
        s = s.replace(/\s*\[\s*(?:TL|TN|Note|Translator'?s?\s*Note)[:\s][^\]]*\]\s*$/i, '');
        s = s.replace(/\s*\[[0-9¹²³⁴⁵⁶⁷⁸⁹]+\]\s*$/g, '');
        s = s.replace(/[¹²³⁴⁵⁶⁷⁸⁹]+$/g, '');

        // 4. Exact short formats & illustrations
        if (/^\d+(?:\.\d+)?$/.test(s)) {
            if (s.includes('.')) return s;
            return 'Chapter ' + parseInt(s, 10);
        }
        if (/^E\.?\s*(\d+)$/i.test(s)) return 'E.' + s.match(/^E\.?\s*(\d+)/i)[1];
        if (/^Image\s*(\d+)(?:[-_]?(\d+))?$/i.test(s)) {
            return s.replace(/^Image\s*(\d+)(?:[-_]?(\d+))?/i, (m, p1, p2) => p2 ? `Illustration ${p1}-${p2}` : `Illustration ${p1}`);
        }
        if (/^insert\s*(\d+)$/i.test(s)) return 'Illustration ' + s.match(/^insert\s*(\d+)/i)[1];
        if (/^part\d+$/i.test(s)) {
            const num = parseInt(s.replace(/\D/g, ''), 10);
            return 'Part ' + (isNaN(num) ? fallbackIndex : num);
        }
        if (/^section[-_]?\d+$/i.test(s) || /^page[-_]?\d+$/i.test(s)) return 'Chapter ' + fallbackIndex;

        // 5. Check if there's a volume/book/arc/part prefix at start
        let volPrefix = '';
        const volMatch = s.match(/^(?:\[\s*)?(Volume|Vol\.?|Book|Arc|Part|Act|Season)\s*(\d+|[IVXLCDM]+)[\s,;:–—-]*/i);
        if (volMatch && !/^(?:Volume|Vol\.?|Book|Arc|Part|Act|Season)\s*(?:\d+|[IVXLCDM]+)$/i.test(s.trim())) {
            const fullVolStr = volMatch[0];
            const kind = volMatch[1].replace(/\.$/, '');
            const normKind = kind.charAt(0).toUpperCase() + kind.slice(1).toLowerCase();
            volPrefix = `${normKind} ${volMatch[2]} - `;
            s = s.slice(fullVolStr.length).trim();
        }

        // 6. Handle pure special sections (Prologue, Epilogue, etc.)
        const isSpecialSection = /^(?:prologue|epilogue|interlude|monologue|afterword|synopsis|illustration|illustrations|side\s*story|\bss\b|extra|character\s*intro|short\s*story)/i.test(s);
        if (isSpecialSection) {
            s = s.replace(/^Illustration(?:s)?\s*#?(\d+)/i, 'Illustration $1');
            s = s.replace(/^(Prologue|Epilogue|Interlude|Monologue|Afterword|Synopsis)[\s:\.\-]+(?:\1\b[\s:\.\-]*)+/i, '$1 - ');
            s = s.replace(/[\s\-–—:]+$/, '').trim();
            return volPrefix ? (volPrefix + s) : s;
        }

        // 7. Deduplicate Chapter prefixes (supporting integers and decimals like 1.1)
        let prev = '';
        while (prev !== s) {
            prev = s;
            s = s.replace(/^(?:Chapter|\bCh\b\.?)\s*(\d+(?:\.\d+)?)(?:\s*[:\-–—]\s*|\.(?!\d)\s*|\s+)+(?:Chapter|\bCh\b\.?)\s*\1\b(?:\s*[:\-–—]\s*|\.(?!\d)\s*|\s+)*/i, 'Chapter $1 - ');
            s = s.replace(/^(\d+(?:\.\d+)?)(?:\s*[:\-–—]\s*|\.(?!\d)\s*|\s+)+(?:Chapter|\bCh\b\.?)\s*\1\b(?:\s*[:\-–—]\s*|\.(?!\d)\s*|\s+)*/i, 'Chapter $1 - ');
            s = s.replace(/^(?:Chapter|\bCh\b\.?)\s*(\d+(?:\.\d+)?)(?:\s*[:\-–—]\s*|\.(?!\d)\s*|\s+)+\1\b(?:\s*[:\-–—]\s*|\.(?!\d)\s*|\s+)*/i, 'Chapter $1 - ');
            s = s.replace(/^\bCh\b\.?\s*(\d+(?:\.\d+)?)(?:\s*[:\-–—]\s*|\.(?!\d)\s*|\s+)+/i, 'Chapter $1 - ');
            s = s.replace(/^(?:Chapter|\bCh\b\.?)\s*(\d+(?:\.\d+)?)\s+(?:Chapter|\bCh\b\.?)\s*\1\b(?:\s*[:\-–—]\s*|\.(?!\d)\s*|\s+)*/i, 'Chapter $1 - ');
        }

        // Standardize "Chapter X:" or "Chapter X -" or "Chapter X."
        s = s.replace(/^Chapter\s*(\d+(?:\.\d+)?)(?:\s*[:\-–—]\s*|\.(?!\d)\s*|\s+)/i, 'Chapter $1 - ');

        // Normalize leading bare number: e.g. "01. The Beginning" -> "Chapter 1 - The Beginning"
        if (/^\d+\s*[\.\-:]\s+/.test(s)) {
            const num = s.match(/^(\d+)/)[1];
            const rest = s.replace(/^\d+\s*[\.\-:]\s+/, '');
            s = 'Chapter ' + parseInt(num, 10) + ' - ' + rest;
        }

        // Clean stuttered punctuation: " - - " or " : : " or " - : "
        s = s.replace(/\s*[:\-–—]\s*[:\-–—]+\s*/g, ' - ');

        // Standalone chapter with no title: "Chapter 1 -" or "Chapter 1"
        s = s.replace(/^Chapter\s*(\d+(?:\.\d+)?)\s*[\-:]\s*$/i, 'Chapter $1');
        s = s.replace(/[\s\-–—:]+$/, '').trim();

        // 8. Deduplicate identical subtitle phrases:
        // e.g. "Chapter 1 - Title - Title" -> "Chapter 1 - Title"
        const subMatch = s.match(/^Chapter\s*(\d+(?:\.\d+)?)\s*-\s*(.+)$/i);
        if (subMatch) {
            const chPrefix = `Chapter ${subMatch[1]}`;
            let sub = subMatch[2].trim();
            const hypParts = sub.split(/\s*[-–—]\s*/);
            if (hypParts.length === 2 && hypParts[0].trim().toLowerCase() === hypParts[1].trim().toLowerCase()) {
                sub = hypParts[0].trim();
            } else {
                const words = sub.split(/\s+/);
                if (words.length >= 2 && words.length % 2 === 0) {
                    const mid = words.length / 2;
                    const firstHalf = words.slice(0, mid).join(' ');
                    const secondHalf = words.slice(mid).join(' ');
                    if (firstHalf.toLowerCase() === secondHalf.toLowerCase()) {
                        sub = firstHalf;
                    }
                }
            }
            s = `${chPrefix} - ${sub}`;
        }

        const finalResult = volPrefix ? (volPrefix + s) : s;
        return finalResult || ('Chapter ' + fallbackIndex);
    }

    function countWords(str) {
        if (!str) return 0;
        return (str.split(/\s+/).filter(Boolean)).length;
    }

    function extractImagesFromContent(content) {
        if (!content) return [];
        const set = new Set();
        const mdMatches = content.matchAll(/!\[(.*?)\]\((data:image\/[^\s\)]+|https?:\/\/[^\s\)]+|[^)\s]+)\)/gi);
        for (const m of mdMatches) {
            if (m[2]) set.add(m[2].trim());
        }
        const htmlMatches = content.matchAll(/<img[^>]+src=["']([^"']+)["']/gi);
        for (const m of htmlMatches) {
            if (m[1]) set.add(m[1].trim());
        }
        return Array.from(set);
    }

    function wrapSvgTitle(title, maxCharsPerLine = 20, maxLines = 4) {
        const words = (title || 'Web Novel').split(/\s+/);
        const lines = [];
        let cur = '';
        for (const w of words) {
            if (!cur) {
                cur = w;
            } else if ((cur + ' ' + w).length <= maxCharsPerLine) {
                cur += ' ' + w;
            } else {
                lines.push(cur);
                cur = w;
                if (lines.length >= maxLines - 1) break;
            }
        }
        if (cur) lines.push(cur);
        if (lines.length === 1 && lines[0].length > maxCharsPerLine) {
            const raw = lines[0];
            lines.length = 0;
            for (let i = 0; i < raw.length && lines.length < maxLines; i += maxCharsPerLine) {
                lines.push(raw.slice(i, i + maxCharsPerLine));
            }
        }
        return lines;
    }

    function generateSvgCover(title, author) {
        const safeTitle = escapeXml(title || 'Web Novel');
        const safeAuthor = escapeXml(author || 'Author');
        const titleLines = wrapSvgTitle(title, 20, 4);
        const fontSize = titleLines.length > 2 ? 36 : (titleLines.length > 1 ? 42 : 48);
        const lineHeight = fontSize + 12;
        const startY = 560 - Math.round(((titleLines.length - 1) * lineHeight) / 2);

        const tspanLines = titleLines.map((line, i) =>
            `<tspan x="400" y="${startY + (i * lineHeight)}">${escapeXml(line)}</tspan>`
        ).join('');

        return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 1200" width="100%" height="100%">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#1e1b4b" />
      <stop offset="50%" stop-color="#312e81" />
      <stop offset="100%" stop-color="#0f172a" />
    </linearGradient>
    <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#fbbf24" />
      <stop offset="100%" stop-color="#f59e0b" />
    </linearGradient>
  </defs>
  <rect width="800" height="1200" fill="url(#bgGrad)" />
  <rect x="40" y="40" width="720" height="1120" fill="none" stroke="url(#goldGrad)" stroke-width="2" opacity="0.4" rx="8" />
  <rect x="52" y="52" width="696" height="1096" fill="none" stroke="#e0e7ff" stroke-width="1" opacity="0.15" rx="6" />
  <circle cx="400" cy="300" r="130" fill="none" stroke="url(#goldGrad)" stroke-width="1" opacity="0.25" />
  <text x="400" y="315" font-family="sans-serif" font-size="64" font-weight="900" fill="#a5b4fc" text-anchor="middle" letter-spacing="4">✦</text>
  <text font-family="'Cinzel', 'Noto Serif', serif, sans-serif" font-size="${fontSize}" font-weight="bold" fill="#ffffff" text-anchor="middle">
    ${tspanLines}
  </text>
  <line x1="260" y1="${startY + (titleLines.length * lineHeight) + 20}" x2="540" y2="${startY + (titleLines.length * lineHeight) + 20}" stroke="url(#goldGrad)" stroke-width="2" opacity="0.6" />
  <text x="400" y="${startY + (titleLines.length * lineHeight) + 70}" font-family="sans-serif" font-size="24" font-weight="500" fill="#c7d2fe" text-anchor="middle" letter-spacing="2">
    ${safeAuthor}
  </text>
  <text x="400" y="1080" font-family="sans-serif" font-size="14" font-weight="600" fill="#94a3b8" text-anchor="middle" letter-spacing="4">
    SPECIAL EDITION
  </text>
</svg>`;
    }

    // ── Editor State ──
    const state = {
        title: '',
        author: '',
        series: '',
        lang: 'en',
        description: '',
        coverUrl: '',
        chapters: [], // [{ id, href, fullPath, title, originalTitle, level, content, originalXhtml, originalHead, bodyAttrs, isModified, words, images: [] }]
        imageRepository: new Map(), // key (filename/dataUrl) -> { dataUrl, mime, name, isNew: boolean }
        originalZip: null,
        originalOpfPath: '',
        originalOpfDir: '',
        originalFileName: '',
        collapsedVolumes: new Set(), // Set of volume chapter ids that are collapsed
        activeChapterIdx: -1,
        searchQuery: '',
        isDirty: false
    };
    if (typeof window !== "undefined") window.epubEditorState = state;

    // ── HTML UI Template (Delegated to epub_editor_template.js) ──
    const editHtml = (typeof window !== 'undefined' && window.editHtml) ? window.editHtml : '';

    // ── Universal XML & Zip Resolution Helpers (Delegated to epub_editor_packer.js) ──
    const getXmlElements = (...args) => (window.EpubEditorPacker?.getXmlElements ? window.EpubEditorPacker.getXmlElements(...args) : []);
    const getFirstXmlTag = (...args) => (window.EpubEditorPacker?.getFirstXmlTag ? window.EpubEditorPacker.getFirstXmlTag(...args) : null);
    const findZipEntry = (...args) => (window.EpubEditorPacker?.findZipEntry ? window.EpubEditorPacker.findZipEntry(...args) : null);
    const getRelativeZipHref = (...args) => (window.EpubEditorPacker?.getRelativeZipHref ? window.EpubEditorPacker.getRelativeZipHref(...args) : "");
    async function parseEpubFile(file) {
        if (window.EpubEditorPacker?.parseEpubFile) {
            return await window.EpubEditorPacker.parseEpubFile(file);
        }
    }
    // ── Load Book from Library Object (GeminiNovelDB record) ──
    async function loadBookFromRecord(record) {
        if (!record) return;
        state.novelId = record.id || '';

        // If the record has a pre-built EPUB blob, parse it to preserve original fonts, styles, and illustrations (only if not manually edited)
        if (record.epubBlob && !record.isEdited) {
            await parseEpubFile(record.epubBlob);
            if (state.chapters && state.chapters.length > 0) {
                return;
            }
            console.warn('EPUB blob in record yielded 0 chapters, falling back to stored chapters array');
        }

        state.title = (typeof window !== 'undefined' && window.cleanTranslatedTitle)
            ? window.cleanTranslatedTitle(record.title || 'Novel')
            : (record.title || 'Novel').replace(/\s*\((?:Translated|Translation)\)/gi, '').trim();
        state.author = (record.author || 'Gemini Translator').trim();
        state.series = record.series || '';
        state.lang = record.targetLang || 'en';
        state.description = record.summary || record.description || '';
        state.coverUrl = record.cover || '';
        state.imageRepository.clear();
        state.chapters = [];
        state.originalZip = null;
        state.originalOpfPath = '';
        state.originalOpfDir = '';
        state.originalFileName = (record.title || 'novel').replace(/[^a-zA-Z0-9_-]/g, '_') + '.epub';

        const srcChapters = record.translatedChapters && record.translatedChapters.length > 0
            ? record.translatedChapters
            : (record.rawChapters || record.chapters || []);

        srcChapters.forEach((c, idx) => {
            const rawContent = c.content || c.text || '';
            const chImages = extractImagesFromContent(rawContent);
            const chTitle = record.isEdited ? (c.title || `Chapter ${idx + 1}`) : cleanTitle(c.title || `Chapter ${idx + 1}`, idx + 1);
            state.chapters.push({
                id: 'ch_' + (idx + 1),
                title: chTitle,
                originalTitle: c.title || chTitle,
                level: c.level || 1,
                content: rawContent,
                words: c.words || countWords(rawContent),
                images: chImages,
                originalHead: '',
                bodyAttrs: '',
                originalXhtml: '',
                fullPath: '',
                href: `chapter_${idx + 1}.xhtml`,
                isNew: true
            });
        });

        renderEditorView();
        if (typeof window.toast === 'function') {
            window.toast(`Loaded "${state.title}" (${state.chapters.length} chapters) into Editor!`, 'success');
        }
    }

    // ── Render Workspace UI ──
    function renderEditorView() {
        const uploadSec = document.getElementById('edit-upload-section');
        const workspace = document.getElementById('edit-workspace');
        if (!uploadSec || !workspace) return;

        uploadSec.classList.add('hidden');
        workspace.classList.remove('hidden');

        // Populate metadata inputs
        const titleIn = document.getElementById('edit-book-title');
        const authorIn = document.getElementById('edit-book-author');
        const seriesIn = document.getElementById('edit-book-series');
        const langIn = document.getElementById('edit-book-lang');
        const descIn = document.getElementById('edit-book-desc');

        if (titleIn) titleIn.value = state.title;
        if (authorIn) authorIn.value = state.author;
        if (seriesIn) seriesIn.value = state.series;
        if (langIn) langIn.value = state.lang;
        if (descIn) descIn.value = state.description;

        updateCoverPreview();
        updateStats();
        renderChapterList();
    }

    function updateCoverPreview() {
        const preview = document.getElementById('edit-cover-preview');
        if (!preview) return;
        if (state.coverUrl) {
            preview.innerHTML = `<img src="${state.coverUrl}" style="width:100%; height:100%; object-fit:cover;" alt="Cover" onerror="this.style.display='none'; if(this.parentElement) this.parentElement.innerHTML='<span style=\\'font-size:10px; color:#ef4444; text-align:center; padding:6px;\\'>⚠️ Broken Cover Link</span>';" />`;
        } else {
            preview.innerHTML = `<span style="font-size:11px; color:var(--slate); text-align:center; padding:8px;">No Cover<br><span style="font-size:9px; opacity:0.7;">Click to set</span></span>`;
        }
    }

    function updateStats() {
        const statCh = document.getElementById('edit-stat-ch-count');
        const statW = document.getElementById('edit-stat-words');
        const statImg = document.getElementById('edit-stat-images');
        const tocBadge = document.getElementById('edit-toc-badge');

        const totalWords = state.chapters.reduce((acc, c) => acc + (c.words || 0), 0);
        const allImages = new Set();
        state.chapters.forEach(c => (c.images || []).forEach(img => allImages.add(img)));
        state.imageRepository.forEach((_, k) => allImages.add(k));

        if (statCh) statCh.textContent = `${state.chapters.length} chapters`;
        if (statW) statW.textContent = `${totalWords.toLocaleString()} words`;
        if (statImg) statImg.textContent = `${allImages.size} images`;
        if (tocBadge) tocBadge.textContent = `${state.chapters.length} Chapters`;
    }

    // ── Hierarchy & Block Range Helpers ──
    function getChapterBlockRange(idx) {
        if (idx < 0 || idx >= state.chapters.length) return [idx, idx];
        const ch = state.chapters[idx];
        if (ch.level !== 1) {
            return [idx, idx];
        }
        let end = idx;
        while (end + 1 < state.chapters.length && state.chapters[end + 1].level === 2) {
            end++;
        }
        return [idx, end];
    }

    function moveChapterBlock(startIdx, endIdx, dir) {
        if (state.chapters.length <= 1) return;
        const blockLen = endIdx - startIdx + 1;

        if (dir === 'top') {
            if (startIdx === 0) return;
            const block = state.chapters.splice(startIdx, blockLen);
            state.chapters.unshift(...block);
        } else if (dir === 'bottom') {
            if (endIdx >= state.chapters.length - 1) return;
            const block = state.chapters.splice(startIdx, blockLen);
            state.chapters.push(...block);
        } else if (dir === -1) {
            if (startIdx === 0) return;
            if (state.chapters[startIdx].level === 1) {
                let targetPos = startIdx - 1;
                while (targetPos > 0 && state.chapters[targetPos].level === 2) {
                    targetPos--;
                }
                const block = state.chapters.splice(startIdx, blockLen);
                state.chapters.splice(targetPos, 0, ...block);
            } else {
                const temp = state.chapters[startIdx - 1];
                state.chapters[startIdx - 1] = state.chapters[startIdx];
                state.chapters[startIdx] = temp;
            }
        } else if (dir === 1) {
            if (endIdx >= state.chapters.length - 1) return;
            if (state.chapters[startIdx].level === 1) {
                const nextTargetIdx = endIdx + 1;
                const [nextStart, nextEnd] = getChapterBlockRange(nextTargetIdx);
                const block = state.chapters.splice(startIdx, blockLen);
                const insertAt = nextEnd - blockLen + 1;
                state.chapters.splice(insertAt, 0, ...block);
            } else {
                const temp = state.chapters[startIdx + 1];
                state.chapters[startIdx + 1] = state.chapters[startIdx];
                state.chapters[startIdx] = temp;
            }
        }

        if (state.chapters.length > 0) state.chapters[0].level = 1;
        renderChapterList();
        updateStats();
        if (state.novelId || (state.chapters && state.chapters.length > 0)) {
            saveNovelToDatabase({ silent: true }).catch(e => console.warn('Auto-save reorder error:', e));
        }
    }

    // ── TOC Manager & Auto-Hierarchy (Delegated to epub_editor_tools.js) ──
    const openSanitizePreviewModal = (...args) => (window.EpubEditorTools?.openSanitizePreviewModal ? window.EpubEditorTools.openSanitizePreviewModal(...args) : null);
    const openHierarchyModal = (...args) => (window.EpubEditorTools?.openHierarchyModal ? window.EpubEditorTools.openHierarchyModal(...args) : null);
    const autoDetectHierarchy = (...args) => (window.EpubEditorTools?.autoDetectHierarchy ? window.EpubEditorTools.autoDetectHierarchy(...args) : null);
    const openTocManagerModal = (...args) => (window.EpubEditorTools?.openTocManagerModal ? window.EpubEditorTools.openTocManagerModal(...args) : null);
    const harvestTocManagerInputs = (...args) => (window.EpubEditorTools?.harvestTocManagerInputs ? window.EpubEditorTools.harvestTocManagerInputs(...args) : null);
    const renderTocManagerRows = (...args) => (window.EpubEditorTools?.renderTocManagerRows ? window.EpubEditorTools.renderTocManagerRows(...args) : null);
    const saveTocManagerChanges = (...args) => (window.EpubEditorTools?.saveTocManagerChanges ? window.EpubEditorTools.saveTocManagerChanges(...args) : null);
    const pasteBulkTitlesToToc = (...args) => (window.EpubEditorTools?.pasteBulkTitlesToToc ? window.EpubEditorTools.pasteBulkTitlesToToc(...args) : null);
    const renumberTocManager = (...args) => (window.EpubEditorTools?.renumberTocManager ? window.EpubEditorTools.renumberTocManager(...args) : null);
    // ── Chapter Insertion, Move & Rename Helpers ──
    let activeMoveIdx = -1;
    let activeRenameIdx = -1;

    function insertChapterAt(targetIdx, position = 'below') {
        const insertIdx = position === 'above' ? Math.max(0, targetIdx) : targetIdx + 1;
        const refLevel = (targetIdx >= 0 && targetIdx < state.chapters.length) ? state.chapters[targetIdx].level : 1;
        const newIdx = state.chapters.length + 1;

        const newCh = {
            id: 'ch_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
            title: `Chapter ${newIdx}`,
            originalTitle: `Chapter ${newIdx}`,
            level: refLevel,
            content: '',
            words: 0,
            images: [],
            isNew: true
        };

        state.chapters.splice(insertIdx, 0, newCh);
        renderChapterList();
        updateStats();
        openChapterModal(insertIdx);
        if (typeof window.toast === 'function') {
            window.toast(`Inserted new chapter at #${insertIdx + 1}!`, 'success');
        }
    }

    function openMoveChapterSheet(idx) {
        if (idx < 0 || idx >= state.chapters.length) return;
        activeMoveIdx = idx;
        const modal = document.getElementById('edit-move-chapter-modal');
        updateMoveSheet();
        modal?.classList.remove('hidden');
    }

    function updateMoveSheet() {
        if (activeMoveIdx < 0 || activeMoveIdx >= state.chapters.length) return;
        const ch = state.chapters[activeMoveIdx];
        const [blockStart, blockEnd] = getChapterBlockRange(activeMoveIdx);
        const hasChildren = ch.level === 1 && (activeMoveIdx + 1 < state.chapters.length && state.chapters[activeMoveIdx + 1].level === 2);

        const titleEl = document.getElementById('edit-move-modal-title');
        const subEl = document.getElementById('edit-move-modal-subtitle');
        if (titleEl) titleEl.textContent = `Organize "${ch.title}"`;
        if (subEl) subEl.textContent = `Position #${activeMoveIdx + 1} of ${state.chapters.length} (${ch.level === 2 ? 'Sub-Chapter' : (hasChildren ? 'Volume with sub-chapters' : 'Main Chapter')})`;

        const upBtn = document.getElementById('btn-move-sheet-up');
        const downBtn = document.getElementById('btn-move-sheet-down');
        const topBtn = document.getElementById('btn-move-sheet-top');
        const btmBtn = document.getElementById('btn-move-sheet-bottom');

        if (upBtn) upBtn.disabled = activeMoveIdx === 0;
        if (downBtn) downBtn.disabled = blockEnd >= state.chapters.length - 1;
        if (topBtn) topBtn.disabled = activeMoveIdx === 0;
        if (btmBtn) btmBtn.disabled = blockEnd >= state.chapters.length - 1;

        const lvl1Btn = document.getElementById('btn-move-sheet-level1');
        const lvl2Btn = document.getElementById('btn-move-sheet-level2');
        if (lvl1Btn) {
            lvl1Btn.style.borderColor = ch.level === 1 ? '#6366f1' : 'var(--hairline)';
            lvl1Btn.style.color = ch.level === 1 ? '#a5b4fc' : 'var(--paper)';
        }
        if (lvl2Btn) {
            lvl2Btn.style.borderColor = ch.level === 2 ? '#6366f1' : 'var(--hairline)';
            lvl2Btn.style.color = ch.level === 2 ? '#a5b4fc' : 'var(--paper)';
        }
    }

    function openRenameChapterModal(idx) {
        if (idx < 0 || idx >= state.chapters.length) return;
        activeRenameIdx = idx;
        const modal = document.getElementById('edit-rename-modal');
        const input = document.getElementById('edit-rename-input');
        const ch = state.chapters[idx];

        if (input) {
            input.value = ch.title;
        }
        modal?.classList.remove('hidden');
        setTimeout(() => {
            if (input) {
                input.focus();
                input.select();
            }
        }, 60);
    }

    // ── Preview Navigation & Edge-Swipe Integration ──
    function exitEpubEditorPreview() {
        const textarea = document.getElementById('edit-ch-modal-textarea');
        const preview = document.getElementById('edit-ch-modal-preview');
        const previewBar = document.getElementById('edit-ch-modal-preview-bar');
        const subtoolbar = document.getElementById('edit-ch-modal-subtoolbar');
        const imgTray = document.getElementById('edit-ch-modal-img-tray');
        const btn = document.getElementById('btn-edit-modal-preview-toggle');
        if (preview) {
            preview.classList.add('hidden');
            preview.style.display = 'none';
        }
        if (previewBar) {
            previewBar.classList.add('hidden');
            previewBar.style.display = 'none';
        }
        if (subtoolbar) {
            subtoolbar.classList.remove('hidden');
            subtoolbar.style.display = 'flex';
        }
        if (imgTray) {
            imgTray.classList.remove('hidden');
            imgTray.style.display = 'flex';
        }
        if (textarea) {
            textarea.classList.remove('hidden');
            textarea.style.display = 'block';
        }
        if (btn) btn.textContent = '👁️ Preview HTML';
        isPreviewMode = false;
        window.isEpubEditorPreviewActive = false;
    }
    if (typeof window !== 'undefined') {
        window.exitEpubEditorPreview = exitEpubEditorPreview;
        window.isEpubEditorPreviewActive = false;
    }

    // ── Undo / Redo History for Chapter Prose ──
    let modalUndoStack = [];
    let modalRedoStack = [];
    let lastRecordedText = '';
    let undoDebounceTimer = null;

    function resetUndoRedo(initialText) {
        modalUndoStack = [];
        modalRedoStack = [];
        lastRecordedText = initialText || '';
        updateUndoRedoButtons();
    }

    function recordUndoState(text) {
        if (text === lastRecordedText) return;
        modalUndoStack.push(lastRecordedText);
        if (modalUndoStack.length > 60) modalUndoStack.shift();
        modalRedoStack = [];
        lastRecordedText = text;
        updateUndoRedoButtons();
    }

    function updateUndoRedoButtons() {
        const undoBtn = document.getElementById('btn-edit-modal-undo');
        const redoBtn = document.getElementById('btn-edit-modal-redo');
        if (undoBtn) {
            undoBtn.disabled = modalUndoStack.length === 0;
            undoBtn.style.opacity = modalUndoStack.length === 0 ? '0.4' : '1';
        }
        if (redoBtn) {
            redoBtn.disabled = modalRedoStack.length === 0;
            redoBtn.style.opacity = modalRedoStack.length === 0 ? '0.4' : '1';
        }
    }

    function performUndo() {
        if (modalUndoStack.length === 0) return;
        const textarea = document.getElementById('edit-ch-modal-textarea');
        if (!textarea) return;
        modalRedoStack.push(textarea.value);
        const prev = modalUndoStack.pop();
        textarea.value = prev;
        lastRecordedText = prev;
        updateUndoRedoButtons();
        updateModalWordCount();
    }

    function performRedo() {
        if (modalRedoStack.length === 0) return;
        const textarea = document.getElementById('edit-ch-modal-textarea');
        if (!textarea) return;
        modalUndoStack.push(textarea.value);
        const next = modalRedoStack.pop();
        textarea.value = next;
        lastRecordedText = next;
        updateUndoRedoButtons();
        updateModalWordCount();
    }

    // ── Typography, Spacing & Prose Block Rendering ──
    function formatInlineTypography(text) {
        if (!text) return '';
        let out = String(text)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');

        // Whitelisted tags that the author or buttons insert
        out = out.replace(/&lt;u&gt;([\s\S]*?)&lt;\/u&gt;/gi, '<u>$1</u>');
        out = out.replace(/&lt;del&gt;([\s\S]*?)&lt;\/del&gt;/gi, '<del>$1</del>');
        out = out.replace(/&lt;s&gt;([\s\S]*?)&lt;\/s&gt;/gi, '<s>$1</s>');
        out = out.replace(/&lt;em&gt;([\s\S]*?)&lt;\/em&gt;/gi, '<em>$1</em>');
        out = out.replace(/&lt;strong&gt;([\s\S]*?)&lt;\/strong&gt;/gi, '<strong>$1</strong>');
        out = out.replace(/&amp;nbsp;/gi, '&#160;');
        out = out.replace(/&amp;#160;/gi, '&#160;');

        // Markdown inline bold (**text**)
        out = out.replace(/\*\*([^\*\s][^\*]*?[^\*\s]|[^\*\s])\*\*/g, '<strong>$1</strong>');

        // Markdown inline strikethrough (~~text~~)
        out = out.replace(/~~([^~\s][^~]*?[^~\s]|[^~\s])~~/g, '<del>$1</del>');

        // Markdown inline italic (*text*) - single asterisk not preceded/followed by another
        out = out.replace(/(^|[^\*])\*([^\*\s][^\*]*?[^\*\s]|[^\*\s])\*(?!\*)/g, '$1<em>$2</em>');

        // Markdown inline code (`code`)
        out = out.replace(/`([^`\n]+)`/g, '<code style="font-family:monospace; background:rgba(128,128,128,0.15); padding:1px 4px; border-radius:3px;">$1</code>');

        return out;
    }

    function isProseSpacer(trimmed) {
        if (!trimmed) return false;
        return (
            trimmed === '&nbsp;' ||
            trimmed === '&#160;' ||
            trimmed === '[spacer]' ||
            trimmed === '<br>' ||
            trimmed === '<br/>' ||
            trimmed === '<br />' ||
            /^<p\b[^>]*class=["'].*?para-spacer.*?["'][^>]*>.*?<\/p>$/i.test(trimmed) ||
            trimmed === '&lt;p class="para-spacer"&gt;&amp;nbsp;&lt;/p&gt;' ||
            trimmed === '&lt;p class="para-spacer"&gt;&#160;&lt;/p&gt;'
        );
    }

    function isProseDivider(trimmed) {
        return (
            trimmed === '---' ||
            trimmed === '***' ||
            trimmed === '* * *' ||
            trimmed === '- - -' ||
            trimmed === '———' ||
            trimmed === '–––' ||
            trimmed === '✦ ✦ ✦' ||
            trimmed === '❖ ❖ ❖'
        );
    }

    function isProseCenter(trimmed) {
        return /^<center>([\s\S]*?)<\/center>$/i.test(trimmed) || /^&lt;center&gt;([\s\S]*?)&lt;\/center&gt;$/i.test(trimmed);
    }

    function extractProseCenter(trimmed) {
        const m1 = trimmed.match(/^<center>([\s\S]*?)<\/center>$/i);
        if (m1) return m1[1];
        const m2 = trimmed.match(/^&lt;center&gt;([\s\S]*?)&lt;\/center&gt;$/i);
        if (m2) return m2[1];
        return trimmed;
    }

    function renderProseParagraphHtml(trimmed, isPreview = false) {
        if (!trimmed) return '';

        // 1. Spacers (Guaranteed non-collapsible vertical paragraph spacing)
        if (isProseSpacer(trimmed)) {
            if (isPreview) {
                return `<div class="para-spacer" style="margin:20px 0; height:24px; border-left:3px dashed rgba(56,189,248,0.45); padding-left:10px; display:flex; align-items:center; background:rgba(56,189,248,0.04); border-radius:4px;"><span style="font-size:10px; color:#38bdf8; font-weight:600; font-family:monospace; user-select:none;">↕ Extra Paragraph Spacing</span></div>`;
            }
            return `<p class="para-spacer" style="margin:1.8em 0; min-height:1.5em; line-height:1.8em; text-indent:0;">&#160;</p>`;
        }

        // 2. Scene dividers / Breaks
        if (isProseDivider(trimmed)) {
            if (isPreview) {
                return `<div class="scene-break" style="text-align:center; margin:24px 0; letter-spacing:0.4em; color:var(--paper); opacity:0.85; font-size:1.1em;">✦ ✦ ✦</div>`;
            }
            return `<div class="scene-break" style="text-align:center; margin:2em 0; letter-spacing:0.4em; opacity:0.85;">✦ ✦ ✦</div>`;
        }

        // 3. Center block (letters, notices, poems, system status)
        if (isProseCenter(trimmed)) {
            const cText = extractProseCenter(trimmed);
            if (isPreview) {
                return `<div class="prose-center" style="text-align:center; margin:18px 0; text-indent:0; font-style:italic; color:var(--paper);">${formatInlineTypography(cText)}</div>`;
            }
            return `<div class="prose-center" style="text-align:center; margin:1.2em 0; text-indent:0;">${formatInlineTypography(cText)}</div>`;
        }

        // 4. Markdown headings (## or ###)
        if (/^#{1,6}\s+/.test(trimmed)) {
            const lvl = trimmed.match(/^(#{1,6})/)[1].length;
            const text = trimmed.replace(/^#+\s+/, '');
            if (isPreview) {
                return `<h${lvl} style="font-weight:700; color:var(--paper); margin:20px 0 10px; font-size:${lvl === 2 ? '1.25em' : '1.1em'};">${formatInlineTypography(text)}</h${lvl}>`;
            }
            return `<h${lvl} style="margin:1.4em 0 0.6em; font-weight:bold;">${formatInlineTypography(text)}</h${lvl}>`;
        }

        // 5. Blockquotes (> quote)
        if (/^>\s+/.test(trimmed)) {
            const qText = trimmed.replace(/^>\s+/, '');
            if (isPreview) {
                return `<blockquote style="margin:16px 0; padding:8px 16px; border-left:3px solid #6366f1; background:rgba(99,102,241,0.06); border-radius:0 8px 8px 0; font-style:italic;"><p style="margin:0; text-indent:0;">${formatInlineTypography(qText)}</p></blockquote>`;
            }
            return `<blockquote style="margin:1.2em 1.5em; padding-left:1em; border-left:3px solid #888; font-style:italic;"><p style="text-indent:0;">${formatInlineTypography(qText)}</p></blockquote>`;
        }

        // 6. Illustrations (![alt](token))
        if (/!\[(.*?)\]\((.*?)\)/.test(trimmed)) {
            const m = trimmed.match(/!\[(.*?)\]\((.*?)\)/);
            const altText = m[1] || 'Illustration';
            const token = m[2];
            if (isPreview) {
                const imgSrc = (state.imageRepository && state.imageRepository.get(token)?.dataUrl) || token;
                return `<div style="text-align:center; margin:20px 0;"><img src="${imgSrc}" alt="${escapeXml(altText)}" style="max-width:100%; max-height:440px; border-radius:8px; margin:0 auto; display:inline-block; box-shadow:0 4px 16px rgba(0,0,0,0.5);" /><p style="font-size:11px; color:var(--slate); margin-top:6px;">${escapeXml(altText)}</p></div>`;
            }
            return `<div class="illustration-wrap" style="text-align:center; margin:1.5em 0;"><img src="${escapeXml(token)}" alt="${escapeXml(altText)}" style="max-width:100%; height:auto;" /></div>`;
        }

        // 7. Standard prose paragraph
        if (isPreview) {
            return `<p style="margin-bottom:16px; text-indent:1.5em; line-height:1.8;">${formatInlineTypography(trimmed)}</p>`;
        }
        return `<p style="margin-bottom:0.8em; text-indent:1.5em; line-height:1.75;">${formatInlineTypography(trimmed)}</p>`;
    }

    // Convert markdown prose back to clean XHTML body for in-place EPUB export
    function markdownToChapterHtml(md, title) {
        if (!md) return '';
        const stripFn = (typeof window !== 'undefined' && window.stripLeadingTitleFromContent)
            ? window.stripLeadingTitleFromContent
            : ((typeof stripLeadingTitleFromContent === 'function') ? stripLeadingTitleFromContent : null);

        let cleanMd = md;
        if (stripFn && title) {
            cleanMd = stripFn(cleanMd, title);
        }

        // Normalize newlines and convert 3+ consecutive newlines into guaranteed paragraph spacers
        let normalized = cleanMd.replace(/\r\n/g, '\n');
        normalized = normalized.replace(/\n{3,}/g, '\n\n<p class="para-spacer">&nbsp;</p>\n\n');

        const paras = normalized.split(/\n\s*\n/);
        const bodyParts = [];

        // Always render the canonical TOC chapter title as the heading
        if (title) {
            bodyParts.push(`<h2 class="chapter-title">${escapeXml(title)}</h2>`);
        }

        paras.forEach((p, idx) => {
            let trimmed = p.trim();
            if (!trimmed) return;
            // If the first paragraph is a leading markdown heading that echoes the chapter title, skip it since title is already rendered
            if (idx === 0 && /^#{1,6}\s+/.test(trimmed)) {
                const hText = trimmed.replace(/^#{1,6}\s+/, '').trim();
                const isEcho = (typeof window !== 'undefined' && window.isTitleEcho)
                    ? window.isTitleEcho(hText, title)
                    : (hText.toLowerCase() === (title || '').toLowerCase());
                if (isEcho) return;
            }
            bodyParts.push(renderProseParagraphHtml(trimmed, false));
        });
        return bodyParts.join('\n');
    }

    // ── Render Interactive Chapters List (Mobile-First 2-Line Cards) ──
    function renderChapterList() {
        const list = document.getElementById('edit-chapter-list');
        if (!list) return;

        const filterVal = (document.getElementById('edit-toc-filter')?.value || '').toLowerCase().trim();
        list.innerHTML = '';

        if (state.chapters.length === 0) {
            list.innerHTML = `<p class="italic text-center py-8 text-xs" style="color:var(--slate);">No chapters in this book. Click "➕ Add Chapter" to start writing.</p>`;
            return;
        }

        const frag = document.createDocumentFragment();
        let currentVolumeId = null;
        let isCurrentVolumeCollapsed = false;

        state.chapters.forEach((ch, idx) => {
            const isSub = ch.level === 2;
            const [blockStart, blockEnd] = getChapterBlockRange(idx);
            const hasChildren = !isSub && (idx + 1 < state.chapters.length && state.chapters[idx + 1].level === 2);
            const volRegex = /^(?:\[\s*)?(Volume|Vol\.?|Book|Arc|Part|Act|Season|Saga|Section|Episode|卷|部|篇)\b/i;
            const hasChWord = /(?:chapter|\bch\b\.?\s*\d+|\bep\b\.?\s*\d+)/i;
            const isExplicitVolume = !isSub && volRegex.test((ch.title || '').trim()) && !hasChWord.test((ch.title || '').trim());

            if (!isSub) {
                currentVolumeId = ch.id;
                isCurrentVolumeCollapsed = state.collapsedVolumes.has(ch.id);
            }

            // If sub-chapter and its parent volume is collapsed, do not show it unless searching/filtering
            if (isSub && isCurrentVolumeCollapsed && !filterVal) {
                return;
            }

            if (filterVal && !ch.title.toLowerCase().includes(filterVal)) {
                return;
            }

            const card = document.createElement('div');
            card.className = `chap-card flex flex-col gap-2 p-3 rounded-xl border transition-all ${
                isSub ? 'ml-4 sm:ml-6' : ''
            }`;
            card.style.background = isSub
                ? 'rgba(99,102,241,0.03)'
                : (isExplicitVolume ? 'rgba(99,102,241,0.08)' : (hasChildren ? 'rgba(99,102,241,0.04)' : 'rgba(255,255,255,0.03)'));
            card.style.borderColor = isSub
                ? 'rgba(99,102,241,0.2)'
                : (isExplicitVolume ? 'rgba(99,102,241,0.45)' : (hasChildren ? 'rgba(99,102,241,0.3)' : 'var(--hairline)'));
            if (isExplicitVolume) {
                card.style.borderLeft = '4px solid #6366f1';
            }

            // ── LINE 1: Title, Hierarchy, Badges ──
            const line1 = document.createElement('div');
            line1.className = 'flex items-center justify-between gap-2 min-w-0';

            const line1Left = document.createElement('div');
            line1Left.className = 'flex items-center gap-2 min-w-0 flex-1';

            // If volume header or has sub-chapters, add collapse toggle chevron
            if (hasChildren) {
                const collBtn = document.createElement('button');
                collBtn.type = 'button';
                collBtn.className = 'chip-act shrink-0';
                collBtn.style.padding = '3px 7px';
                collBtn.style.fontSize = '11px';
                collBtn.style.fontWeight = '700';
                collBtn.style.color = '#a5b4fc';
                const subCount = blockEnd - blockStart;
                const isCollapsed = state.collapsedVolumes.has(ch.id);
                collBtn.textContent = isCollapsed ? `▶ (${subCount})` : '▼';
                collBtn.title = isCollapsed ? `Expand ${subCount} sub-chapters` : 'Collapse sub-chapters';
                collBtn.onclick = (e) => {
                    e.stopPropagation();
                    if (state.collapsedVolumes.has(ch.id)) {
                        state.collapsedVolumes.delete(ch.id);
                    } else {
                        state.collapsedVolumes.add(ch.id);
                    }
                    renderChapterList();
                };
                line1Left.appendChild(collBtn);
            }

            // Index / Hierarchy Badge (Clickable to jump to position)
            const numBadge = document.createElement('span');
            numBadge.className = 'text-xs font-mono font-bold shrink-0 cursor-pointer select-none px-1.5 py-0.5 rounded';
            numBadge.style.color = isSub ? '#818cf8' : (isExplicitVolume ? '#a5b4fc' : 'var(--paper-dim)');
            numBadge.style.background = 'rgba(255,255,255,0.06)';
            numBadge.textContent = isSub ? `↳ #${idx + 1}` : (isExplicitVolume ? `📁 #${idx + 1}` : `#${idx + 1}`);
            numBadge.title = 'Click to jump to a specific position number';
            numBadge.onclick = (e) => {
                e.stopPropagation();
                const targetPos = prompt(`Move chapter #${idx + 1} to position (1 - ${state.chapters.length}):`, `${idx + 1}`);
                if (targetPos) {
                    const parsed = parseInt(targetPos, 10);
                    if (!isNaN(parsed) && parsed >= 1 && parsed <= state.chapters.length && parsed !== idx + 1) {
                        const targetIdx = parsed - 1;
                        const [bStart, bEnd] = getChapterBlockRange(idx);
                        const blockLen = bEnd - bStart + 1;
                        const block = state.chapters.splice(bStart, blockLen);
                        state.chapters.splice(targetIdx, 0, ...block);
                        if (state.chapters.length > 0) state.chapters[0].level = 1;
                        renderChapterList();
                        updateStats();
                        if (typeof window.toast === 'function') window.toast(`Moved to position #${parsed}!`, 'success');
                    }
                }
            };
            line1Left.appendChild(numBadge);

            // Chapter Title & Dedicated Rename Button
            const titleContainer = document.createElement('div');
            titleContainer.className = 'flex items-center gap-1.5 flex-1 min-w-0';

            const titleSpan = document.createElement('span');
            titleSpan.className = 'font-semibold text-sm truncate cursor-pointer select-none hover:underline';
            titleSpan.style.color = 'var(--paper)';
            titleSpan.textContent = ch.title;
            titleSpan.title = 'Click to rename chapter';
            titleSpan.onclick = (e) => {
                e.stopPropagation();
                openRenameChapterModal(idx);
            };

            const renameBtn = document.createElement('button');
            renameBtn.type = 'button';
            renameBtn.className = 'chip-act shrink-0 text-slate-400 hover:text-white flex items-center gap-1';
            renameBtn.style.padding = '2px 7px';
            renameBtn.style.fontSize = '11px';
            renameBtn.style.fontWeight = '600';
            renameBtn.innerHTML = '<span>✏️</span><span class="hidden sm:inline">Rename</span>';
            renameBtn.title = 'Rename this chapter';
            renameBtn.onclick = (e) => {
                e.stopPropagation();
                openRenameChapterModal(idx);
            };

            titleContainer.appendChild(titleSpan);
            titleContainer.appendChild(renameBtn);
            line1Left.appendChild(titleContainer);

            line1.appendChild(line1Left);

            // Right side of Line 1: Word Count & Image Badges
            const line1Right = document.createElement('div');
            line1Right.className = 'flex items-center gap-2 shrink-0';

            const wordBadge = document.createElement('span');
            wordBadge.className = 'text-[11px] font-mono';
            wordBadge.style.color = 'var(--slate)';
            wordBadge.textContent = `${(ch.words || 0).toLocaleString()}w`;
            line1Right.appendChild(wordBadge);

            const imgCount = (ch.images || []).length;
            if (imgCount > 0) {
                const imgBadge = document.createElement('span');
                imgBadge.className = 'chip-act';
                imgBadge.style.padding = '2px 5px';
                imgBadge.style.fontSize = '10px';
                imgBadge.style.color = '#38bdf8';
                imgBadge.style.borderColor = 'rgba(56,189,248,0.3)';
                imgBadge.textContent = `🖼️ ${imgCount}`;
                line1Right.appendChild(imgBadge);
            }

            line1.appendChild(line1Right);
            card.appendChild(line1);

            // ── LINE 2: Actions Bar (Sleek, Balanced & Visually Pleasing) ──
            const line2 = document.createElement('div');
            line2.className = 'flex items-center justify-between gap-2 pt-2 border-t border-white/5 flex-wrap';

            const line2Left = document.createElement('div');
            line2Left.className = 'flex items-center gap-2 flex-wrap';

            // Edit Prose Button
            const editBtn = document.createElement('button');
            editBtn.type = 'button';
            editBtn.className = 'tl-btn accent flex items-center gap-1';
            editBtn.style.padding = '5px 14px';
            editBtn.style.fontSize = '12px';
            editBtn.style.fontWeight = '700';
            editBtn.style.height = '34px';
            editBtn.textContent = '✏️ Edit Prose';
            editBtn.title = 'Open chapter prose editor';
            editBtn.onclick = () => openChapterModal(idx);
            line2Left.appendChild(editBtn);

            // Unified Segmented Reorder Control [ ▲ | ▼ | ⤒ Top | ⤓ Btm ]
            const reorderGroup = document.createElement('div');
            reorderGroup.className = 'inline-flex items-stretch rounded-xl border border-white/15 bg-slate-900/70 shadow-sm overflow-hidden shrink-0';
            reorderGroup.style.height = '34px';

            // Move Up
            const upBtn = document.createElement('button');
            upBtn.type = 'button';
            upBtn.className = 'px-3.5 py-1 text-sm font-black text-slate-200 hover:text-white hover:bg-indigo-500/25 active:bg-indigo-500/40 transition-all disabled:opacity-20 disabled:pointer-events-none flex items-center justify-center';
            upBtn.textContent = '▲';
            upBtn.title = 'Move up 1 position';
            upBtn.disabled = idx === 0;
            upBtn.onclick = (e) => {
                e.stopPropagation();
                const [bStart, bEnd] = getChapterBlockRange(idx);
                moveChapterBlock(bStart, bEnd, -1);
            };
            reorderGroup.appendChild(upBtn);

            const div1 = document.createElement('div');
            div1.className = 'w-px bg-white/15 self-stretch';
            reorderGroup.appendChild(div1);

            // Move Down
            const downBtn = document.createElement('button');
            downBtn.type = 'button';
            downBtn.className = 'px-3.5 py-1 text-sm font-black text-slate-200 hover:text-white hover:bg-indigo-500/25 active:bg-indigo-500/40 transition-all disabled:opacity-20 disabled:pointer-events-none flex items-center justify-center';
            downBtn.textContent = '▼';
            downBtn.title = 'Move down 1 position';
            downBtn.disabled = idx >= state.chapters.length - 1;
            downBtn.onclick = (e) => {
                e.stopPropagation();
                const [bStart, bEnd] = getChapterBlockRange(idx);
                moveChapterBlock(bStart, bEnd, 1);
            };
            reorderGroup.appendChild(downBtn);

            const div2 = document.createElement('div');
            div2.className = 'w-px bg-white/15 self-stretch';
            reorderGroup.appendChild(div2);

            // Move to Top
            const topBtn = document.createElement('button');
            topBtn.type = 'button';
            topBtn.className = 'px-2.5 py-1 text-xs font-bold text-slate-300 hover:text-white hover:bg-indigo-500/25 active:bg-indigo-500/40 transition-all disabled:opacity-20 disabled:pointer-events-none flex items-center justify-center gap-1';
            topBtn.innerHTML = '<span style="font-size:13px; font-weight:800; line-height:1;">⤒</span><span>Top</span>';
            topBtn.title = 'Move to top of book';
            topBtn.disabled = idx === 0;
            topBtn.onclick = (e) => {
                e.stopPropagation();
                const [bStart, bEnd] = getChapterBlockRange(idx);
                moveChapterBlock(bStart, bEnd, 'top');
            };
            reorderGroup.appendChild(topBtn);

            const div3 = document.createElement('div');
            div3.className = 'w-px bg-white/15 self-stretch';
            reorderGroup.appendChild(div3);

            // Move to Bottom
            const btmBtn = document.createElement('button');
            btmBtn.type = 'button';
            btmBtn.className = 'px-2.5 py-1 text-xs font-bold text-slate-300 hover:text-white hover:bg-indigo-500/25 active:bg-indigo-500/40 transition-all disabled:opacity-20 disabled:pointer-events-none flex items-center justify-center gap-1';
            btmBtn.innerHTML = '<span style="font-size:13px; font-weight:800; line-height:1;">⤓</span><span>Btm</span>';
            btmBtn.title = 'Move to bottom of book';
            btmBtn.disabled = idx >= state.chapters.length - 1;
            btmBtn.onclick = (e) => {
                e.stopPropagation();
                const [bStart, bEnd] = getChapterBlockRange(idx);
                moveChapterBlock(bStart, bEnd, 'bottom');
            };
            reorderGroup.appendChild(btmBtn);

            line2Left.appendChild(reorderGroup);

            // Hierarchy Level Action Pill
            const lvlToggleBtn = document.createElement('button');
            lvlToggleBtn.type = 'button';
            lvlToggleBtn.className = 'chip-act shrink-0 inline-flex items-center';
            lvlToggleBtn.style.padding = '5px 10px';
            lvlToggleBtn.style.height = '34px';
            lvlToggleBtn.style.fontSize = '11.5px';
            lvlToggleBtn.style.fontWeight = '600';

            if (isSub) {
                // Currently nested sub-chapter: 1-tap restore to normal
                lvlToggleBtn.textContent = '↰ Make Normal';
                lvlToggleBtn.title = 'Restore to normal flat chapter (Level 1)';
                lvlToggleBtn.style.color = '#34d399';
                lvlToggleBtn.style.borderColor = 'rgba(52,211,153,0.3)';
                lvlToggleBtn.onclick = (e) => {
                    e.stopPropagation();
                    ch.level = 1;
                    renderChapterList();
                    updateStats();
                    saveNovelToDatabase({ silent: true }).catch(err => console.warn('Auto-save error:', err));
                    if (typeof window.toast === 'function') window.toast(`Chapter #${idx + 1} restored to normal chapter!`, 'success');
                };
            } else if (hasChildren) {
                // Chapter with nested sub-chapters under it: 1-tap un-nest / flatten children
                const childCount = blockEnd - blockStart;
                lvlToggleBtn.textContent = '↰ Flatten Subs';
                lvlToggleBtn.title = `Reset all ${childCount} nested sub-chapters under this chapter back to normal flat chapters`;
                lvlToggleBtn.style.color = '#a78bfa';
                lvlToggleBtn.style.borderColor = 'rgba(167,139,250,0.3)';
                lvlToggleBtn.onclick = (e) => {
                    e.stopPropagation();
                    for (let cIdx = idx + 1; cIdx <= blockEnd; cIdx++) {
                        if (state.chapters[cIdx]) state.chapters[cIdx].level = 1;
                    }
                    renderChapterList();
                    updateStats();
                    saveNovelToDatabase({ silent: true }).catch(err => console.warn('Auto-save error:', err));
                    if (typeof window.toast === 'function') window.toast(`Un-nested ${childCount} sub-chapter(s) to normal flat chapters!`, 'success');
                };
            } else {
                // Normal chapter
                if (idx === 0) {
                    lvlToggleBtn.textContent = 'Normal';
                    lvlToggleBtn.title = 'Chapter 1 is the starting chapter and cannot be indented';
                    lvlToggleBtn.style.color = 'var(--slate)';
                    lvlToggleBtn.disabled = true;
                } else {
                    lvlToggleBtn.textContent = `↳ Nest Under #${idx}`;
                    lvlToggleBtn.title = `Nest as sub-chapter under Chapter #${idx}`;
                    lvlToggleBtn.style.color = '#818cf8';
                    lvlToggleBtn.onclick = (e) => {
                        e.stopPropagation();
                        ch.level = 2;
                        renderChapterList();
                        updateStats();
                        saveNovelToDatabase({ silent: true }).catch(err => console.warn('Auto-save error:', err));
                        if (typeof window.toast === 'function') window.toast(`Nested Chapter #${idx + 1} under #${idx}!`, 'success');
                    };
                }
            }
            line2Left.appendChild(lvlToggleBtn);

            line2.appendChild(line2Left);

            // Line 2 Right: Quick Actions (Insert Below, Delete)
            const line2Right = document.createElement('div');
            line2Right.className = 'flex items-center gap-1.5 shrink-0';

            const insBtn = document.createElement('button');
            insBtn.type = 'button';
            insBtn.className = 'chip-act';
            insBtn.style.padding = '5px 8px';
            insBtn.style.fontSize = '11px';
            insBtn.textContent = '➕ Below';
            insBtn.title = 'Insert a new chapter directly below this one';
            insBtn.onclick = () => insertChapterAt(idx, 'below');
            line2Right.appendChild(insBtn);

            const delBtn = document.createElement('button');
            delBtn.type = 'button';
            delBtn.className = 'chip-act danger';
            delBtn.style.padding = '5px 8px';
            delBtn.style.fontSize = '11px';
            delBtn.textContent = '✕';
            delBtn.title = 'Delete this chapter';
            delBtn.onclick = () => {
                if (confirm(`Delete "${ch.title}"?`)) {
                    state.chapters.splice(idx, 1);
                    renderChapterList();
                    updateStats();
                }
            };
            line2Right.appendChild(delBtn);

            line2.appendChild(line2Right);
            card.appendChild(line2);

            frag.appendChild(card);
        });

        list.appendChild(frag);
    }

    // ── Chapter Prose & Image Modal Logic ──
    let modalActiveIdx = 0;
    let isPreviewMode = false;
    let initialChapterSnapshot = { title: '', level: 1, content: '' };

    function isChapterModalDirty() {
        const modalTitle = document.getElementById('edit-ch-modal-title');
        const modalLevel = document.getElementById('edit-ch-modal-level');
        const textarea = document.getElementById('edit-ch-modal-textarea');
        if (!modalTitle && !textarea) return false;
        const curTitle = modalTitle ? modalTitle.value.trim() : '';
        const curLevel = modalLevel ? (parseInt(modalLevel.value, 10) || 1) : 1;
        const curContent = textarea ? textarea.value : '';
        return curTitle !== (initialChapterSnapshot.title || '').trim() ||
               curLevel !== initialChapterSnapshot.level ||
               curContent !== (initialChapterSnapshot.content || '');
    }

    function requestCloseChapterModal() {
        const confirmModal = document.getElementById('edit-unsaved-confirm-modal');
        const chapterModal = document.getElementById('edit-chapter-modal');
        if (!isChapterModalDirty()) {
            exitEpubEditorPreview();
            chapterModal?.classList.add('hidden');
            return;
        }

        if (confirmModal) {
            confirmModal.classList.remove('hidden');
        } else {
            if (confirm('You have unsaved changes in this chapter.\n\nClick OK to Save & Close.\nClick Cancel to Discard.')) {
                saveCurrentModalChapter();
                exitEpubEditorPreview();
                chapterModal?.classList.add('hidden');
                if (typeof window.toast === 'function') window.toast('Chapter saved!', 'success');
            } else {
                exitEpubEditorPreview();
                chapterModal?.classList.add('hidden');
                if (typeof window.toast === 'function') window.toast('Unsaved changes discarded.', 'info');
            }
        }
    }
    if (typeof window !== 'undefined') window.requestCloseChapterModal = requestCloseChapterModal;

    function openChapterModal(idx) {
        if (idx < 0 || idx >= state.chapters.length) return;
        modalActiveIdx = idx;
        exitEpubEditorPreview();

        const ch = state.chapters[idx];
        initialChapterSnapshot = {
            title: ch.title || '',
            level: ch.level || 1,
            content: ch.content || ''
        };

        const modal = document.getElementById('edit-chapter-modal');
        const modalIdx = document.getElementById('edit-ch-modal-idx');
        const modalTitle = document.getElementById('edit-ch-modal-title');
        const modalLevel = document.getElementById('edit-ch-modal-level');
        const textarea = document.getElementById('edit-ch-modal-textarea');
        const preview = document.getElementById('edit-ch-modal-preview');
        const prevBtn = document.getElementById('btn-edit-modal-prev-ch');
        const nextBtn = document.getElementById('btn-edit-modal-next-ch');

        if (modalIdx) modalIdx.textContent = `#${idx + 1}`;
        if (modalTitle) modalTitle.value = ch.title;
        if (modalLevel) modalLevel.value = String(ch.level || 1);
        if (textarea) {
            textarea.value = ch.content || '';
            textarea.classList.remove('hidden');
            textarea.style.display = 'block';
        }
        if (preview) {
            preview.classList.add('hidden');
            preview.style.display = 'none';
        }

        if (prevBtn) prevBtn.disabled = idx === 0;
        if (nextBtn) nextBtn.disabled = idx >= state.chapters.length - 1;

        resetUndoRedo(ch.content || '');
        updateModalWordCount();
        renderInChapterImages(ch);
        modal?.classList.remove('hidden');
    }

    function saveCurrentModalChapter() {
        const ch = state.chapters[modalActiveIdx];
        if (!ch) return;

        const modalTitle = document.getElementById('edit-ch-modal-title');
        const modalLevel = document.getElementById('edit-ch-modal-level');
        const textarea = document.getElementById('edit-ch-modal-textarea');

        if (modalTitle) {
            ch.title = modalTitle.value.trim() || `Chapter ${modalActiveIdx + 1}`;
            ch.originalTitle = ch.title;
        }
        if (modalLevel) ch.level = parseInt(modalLevel.value, 10) || 1;
        if (textarea) ch.content = textarea.value;

        if (ch.originalHead) {
            ch.originalHead = ch.originalHead.replace(/<title>.*?<\/title>/gi, `<title>${escapeXml(ch.title)}</title>`);
        }

        ch.words = countWords(ch.content);
        ch.images = extractImagesFromContent(ch.content);

        // Update clean snapshot so modal is recognized as saved
        initialChapterSnapshot = {
            title: ch.title || '',
            level: ch.level || 1,
            content: ch.content || ''
        };

        // Immediately sync to originalZip container if present
        if (state.originalZip && ch.fullPath) {
            try {
                let headContent = ch.originalHead || `<title>${escapeXml(ch.title)}</title>`;
                if (headContent.includes('<title>')) {
                    headContent = headContent.replace(/<title>.*?<\/title>/gi, `<title>${escapeXml(ch.title)}</title>`);
                } else {
                    headContent = `<title>${escapeXml(ch.title)}</title>\n` + headContent;
                }
                const bodyAttrs = ch.bodyAttrs ? ` ${ch.bodyAttrs}` : '';
                const bodyHtml = markdownToChapterHtml(ch.content, ch.title);
                const newXhtml = `<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops">
<head>
${headContent}
</head>
<body${bodyAttrs}>
${bodyHtml}
</body>
</html>`;
                state.originalZip.file(ch.fullPath, newXhtml);
            } catch (zipErr) {
                console.warn('Could not sync chapter to originalZip:', zipErr);
            }
        }

        renderChapterList();
        updateStats();

        if (state.novelId || (state.chapters && state.chapters.length > 0)) {
            saveNovelToDatabase({ silent: true }).catch(e => console.warn('Auto-save chapter error:', e));
        }
    }

    function updateModalWordCount() {
        const textarea = document.getElementById('edit-ch-modal-textarea');
        const wSpan = document.getElementById('edit-modal-word-count');
        const cSpan = document.getElementById('edit-modal-char-count');
        const text = textarea?.value || '';
        const wCount = countWords(text);
        if (wSpan) wSpan.textContent = `${wCount.toLocaleString()} words`;
        if (cSpan) cSpan.textContent = `${text.length.toLocaleString()} chars`;
    }

    function renderInChapterImages(ch) {
        const container = document.getElementById('edit-ch-modal-img-items');
        if (!container) return;
        container.innerHTML = '';

        const imgs = ch.images || [];
        if (imgs.length === 0) {
            container.innerHTML = `<span class="text-[11px] italic" style="color:var(--slate);">No images in this chapter. Click "🖼️ Insert Image" to add illustrations.</span>`;
            return;
        }

        imgs.forEach((imgUrl, i) => {
            const resolvedSrc = (state.imageRepository.get(imgUrl)?.dataUrl) || imgUrl;
            const card = document.createElement('div');
            card.className = 'flex items-center gap-1.5 p-1 rounded bg-black/40 border border-slate-700/60 shrink-0';
            card.innerHTML = `
                <img src="${resolvedSrc}" style="width:36px; height:36px; object-fit:cover; border-radius:4px;" />
                <div class="flex flex-col gap-1">
                    <button type="button" class="chip-act" style="padding:1px 4px; font-size:9px; color:#fbbf24;" title="Set as Book Cover">👑 Cover</button>
                    <button type="button" class="chip-act danger" style="padding:1px 4px; font-size:9px;" title="Remove image from chapter">✕ Delete</button>
                </div>
            `;

            // Cover button
            card.querySelectorAll('button')[0].onclick = () => {
                state.coverUrl = resolvedSrc;
                updateCoverPreview();
                if (typeof window.toast === 'function') window.toast('Set image as book cover!', 'success');
            };

            // Delete button
            card.querySelectorAll('button')[1].onclick = () => {
                const textarea = document.getElementById('edit-ch-modal-textarea');
                if (textarea) {
                    const escaped = imgUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                    textarea.value = textarea.value
                        .replace(new RegExp(`!\\[[^\\]]*\\]\\(${escaped}\\)`, 'g'), '')
                        .replace(new RegExp(`<img[^>]*src=["']${escaped}["'][^>]*>`, 'gi'), '');
                    ch.content = textarea.value;
                    ch.images = extractImagesFromContent(ch.content);
                    renderInChapterImages(ch);
                    updateModalWordCount();
                }
            };

            container.appendChild(card);
        });
    }

    // ── Chapter Prose Formatting Helper ──
    function applyTextareaFormat(formatType) {
        const textarea = document.getElementById('edit-ch-modal-textarea');
        if (!textarea) return;

        const start = textarea.selectionStart ?? 0;
        const end = textarea.selectionEnd ?? 0;
        const val = textarea.value || '';
        const before = val.substring(0, start);
        const sel = val.substring(start, end);
        const after = val.substring(end);

        let replacement = '';
        let selStartOffset = 0;
        let selEndOffset = 0;

        switch (formatType) {
            case 'bold':
                if (sel) {
                    if (sel.startsWith('**') && sel.endsWith('**') && sel.length >= 4) {
                        replacement = sel.slice(2, -2);
                        selStartOffset = 0;
                        selEndOffset = replacement.length;
                    } else {
                        replacement = `**${sel}**`;
                        selStartOffset = 0;
                        selEndOffset = replacement.length;
                    }
                } else {
                    replacement = '**bold text**';
                    selStartOffset = 2;
                    selEndOffset = replacement.length - 2;
                }
                break;

            case 'italic':
                if (sel) {
                    if (sel.startsWith('*') && sel.endsWith('*') && sel.length >= 2 && !sel.startsWith('**')) {
                        replacement = sel.slice(1, -1);
                        selStartOffset = 0;
                        selEndOffset = replacement.length;
                    } else {
                        replacement = `*${sel}*`;
                        selStartOffset = 0;
                        selEndOffset = replacement.length;
                    }
                } else {
                    replacement = '*italic text*';
                    selStartOffset = 1;
                    selEndOffset = replacement.length - 1;
                }
                break;

            case 'underline':
                if (sel) {
                    if (sel.startsWith('<u>') && sel.endsWith('</u>') && sel.length >= 7) {
                        replacement = sel.slice(3, -4);
                        selStartOffset = 0;
                        selEndOffset = replacement.length;
                    } else {
                        replacement = `<u>${sel}</u>`;
                        selStartOffset = 0;
                        selEndOffset = replacement.length;
                    }
                } else {
                    replacement = '<u>underlined text</u>';
                    selStartOffset = 3;
                    selEndOffset = replacement.length - 4;
                }
                break;

            case 'strike':
                if (sel) {
                    if (sel.startsWith('~~') && sel.endsWith('~~') && sel.length >= 4) {
                        replacement = sel.slice(2, -2);
                        selStartOffset = 0;
                        selEndOffset = replacement.length;
                    } else {
                        replacement = `~~${sel}~~`;
                        selStartOffset = 0;
                        selEndOffset = replacement.length;
                    }
                } else {
                    replacement = '~~strikethrough text~~';
                    selStartOffset = 2;
                    selEndOffset = replacement.length - 2;
                }
                break;

            case 'h2': {
                const lead = before.endsWith('\n\n') ? '' : (before.endsWith('\n') ? '\n' : (before ? '\n\n' : ''));
                const trail = after.startsWith('\n\n') ? '' : (after.startsWith('\n') ? '\n' : (after ? '\n\n' : ''));
                const text = sel ? sel.replace(/^#+\s*/, '') : 'Scene Heading';
                replacement = `${lead}## ${text}${trail}`;
                selStartOffset = lead.length + 3;
                selEndOffset = replacement.length - trail.length;
                break;
            }

            case 'h3': {
                const lead = before.endsWith('\n\n') ? '' : (before.endsWith('\n') ? '\n' : (before ? '\n\n' : ''));
                const trail = after.startsWith('\n\n') ? '' : (after.startsWith('\n') ? '\n' : (after ? '\n\n' : ''));
                const text = sel ? sel.replace(/^#+\s*/, '') : 'Minor Subheading';
                replacement = `${lead}### ${text}${trail}`;
                selStartOffset = lead.length + 4;
                selEndOffset = replacement.length - trail.length;
                break;
            }

            case 'quote': {
                const lead = before.endsWith('\n\n') ? '' : (before.endsWith('\n') ? '\n' : (before ? '\n\n' : ''));
                const trail = after.startsWith('\n\n') ? '' : (after.startsWith('\n') ? '\n' : (after ? '\n\n' : ''));
                if (sel) {
                    const lines = sel.split('\n');
                    const allQuoted = lines.every(l => l.trim().startsWith('>'));
                    const quotedText = allQuoted ? lines.map(l => l.replace(/^>\s?/, '')).join('\n') : lines.map(l => `> ${l}`).join('\n');
                    replacement = `${lead}${quotedText}${trail}`;
                    selStartOffset = lead.length;
                    selEndOffset = replacement.length - trail.length;
                } else {
                    replacement = `${lead}> Memorable quote or inner thought${trail}`;
                    selStartOffset = lead.length + 2;
                    selEndOffset = replacement.length - trail.length;
                }
                break;
            }

            case 'center': {
                const lead = before.endsWith('\n\n') ? '' : (before.endsWith('\n') ? '\n' : (before ? '\n\n' : ''));
                const trail = after.startsWith('\n\n') ? '' : (after.startsWith('\n') ? '\n' : (after ? '\n\n' : ''));
                if (sel) {
                    if (sel.startsWith('<center>') && sel.endsWith('</center>') && sel.length >= 17) {
                        replacement = sel.slice(8, -9);
                        selStartOffset = 0;
                        selEndOffset = replacement.length;
                    } else {
                        replacement = `<center>${sel}</center>`;
                        selStartOffset = 0;
                        selEndOffset = replacement.length;
                    }
                } else {
                    replacement = `${lead}<center>Centered Text</center>${trail}`;
                    selStartOffset = lead.length + 8;
                    selEndOffset = replacement.length - trail.length - 9;
                }
                break;
            }

            case 'divider': {
                const lead = before.endsWith('\n\n') ? '' : (before.endsWith('\n') ? '\n' : (before ? '\n\n' : ''));
                const trail = after.startsWith('\n\n') ? '' : (after.startsWith('\n') ? '\n' : (after ? '\n\n' : ''));
                replacement = `${lead}* * *${trail}`;
                selStartOffset = replacement.length;
                selEndOffset = replacement.length;
                break;
            }

            case 'spacer': {
                const lead = before.endsWith('\n\n') ? '' : (before.endsWith('\n') ? '\n' : (before ? '\n\n' : ''));
                const trail = after.startsWith('\n\n') ? '' : (after.startsWith('\n') ? '\n' : (after ? '\n\n' : ''));
                replacement = `${lead}<p class="para-spacer">&nbsp;</p>${trail}`;
                selStartOffset = replacement.length;
                selEndOffset = replacement.length;
                break;
            }

            default:
                return;
        }

        textarea.value = before + replacement + after;
        textarea.selectionStart = start + selStartOffset;
        textarea.selectionEnd = start + selEndOffset;
        textarea.focus();

        const ch = state.chapters[modalActiveIdx];
        if (ch) {
            ch.content = textarea.value;
            ch.words = countWords(ch.content);
        }
        recordUndoState(textarea.value);
        updateModalWordCount();
    }

    // ── Insert Image & Novel Image Picker Logic ──
    function insertImageIntoTextarea(imgName) {
        const textarea = document.getElementById('edit-ch-modal-textarea');
        if (!textarea) return;

        const start = textarea.selectionStart ?? textarea.value.length;
        const end = textarea.selectionEnd ?? textarea.value.length;
        const mdImg = `\n\n![Illustration](${imgName})\n\n`;

        textarea.value = textarea.value.substring(0, start) + mdImg + textarea.value.substring(end);
        textarea.selectionStart = textarea.selectionEnd = start + mdImg.length;
        textarea.focus();

        const ch = state.chapters[modalActiveIdx];
        if (ch) {
            ch.content = textarea.value;
            ch.words = countWords(ch.content);
            ch.images = extractImagesFromContent(ch.content);
            renderInChapterImages(ch);
        }
        recordUndoState(textarea.value);
        updateModalWordCount();
        if (typeof window.toast === 'function') window.toast(`Inserted "${imgName}" into chapter!`, 'success');
    }

    function openNovelImagePicker() {
        const modal = document.getElementById('edit-novel-image-picker-modal');
        const grid = document.getElementById('novel-image-picker-grid');
        const countSpan = document.getElementById('novel-image-picker-count');
        if (!modal || !grid) return;

        grid.innerHTML = '';
        const images = [];
        if (state.imageRepository && state.imageRepository.size > 0) {
            state.imageRepository.forEach((imgData, name) => {
                images.push({ name, ...imgData });
            });
        }

        if (countSpan) {
            countSpan.textContent = `${images.length} illustration${images.length === 1 ? '' : 's'} available in book`;
        }

        if (images.length === 0) {
            grid.innerHTML = `
                <div class="col-span-full py-8 text-center" style="color:var(--slate);">
                    <p class="text-sm font-semibold mb-1">No illustrations stored in this novel yet</p>
                    <p class="text-xs mb-3">You can upload illustrations from your device directly into this chapter.</p>
                    <button type="button" class="tl-btn accent" onclick="document.getElementById('edit-ch-modal-img-input')?.click();" style="padding:6px 14px; font-size:12px;">
                        ➕ Upload New Illustration
                    </button>
                </div>
            `;
        } else {
            images.forEach(img => {
                const card = document.createElement('div');
                card.className = 'group relative rounded-xl overflow-hidden border border-slate-700/60 bg-black/40 hover:border-indigo-500 transition-all cursor-pointer flex flex-col';
                card.title = `Click to insert "${img.name}" into chapter`;
                card.innerHTML = `
                    <div class="w-full aspect-[3/4] bg-black/60 flex items-center justify-center overflow-hidden">
                        <img src="${img.dataUrl || img.name}" alt="${escapeXml(img.name)}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200" loading="lazy" />
                    </div>
                    <div class="p-2 bg-slate-900/90 text-left">
                        <p class="text-xs font-semibold truncate" style="color:var(--paper);">${escapeXml(img.name)}</p>
                        <span class="text-[10px] text-indigo-400 group-hover:underline">Tap to insert ↵</span>
                    </div>
                `;
                card.onclick = () => {
                    insertImageIntoTextarea(img.name);
                    modal.classList.add('hidden');
                };
                grid.appendChild(card);
            });
        }

        modal.classList.remove('hidden');
    }

    // ── Illustration Gallery Modal Logic (Delegated to epub_editor_tools.js) ──
    const openGalleryModal = (...args) => (window.EpubEditorTools?.openGalleryModal ? window.EpubEditorTools.openGalleryModal(...args) : null);
    const closeGalleryModal = (...args) => (window.EpubEditorTools?.closeGalleryModal ? window.EpubEditorTools.closeGalleryModal(...args) : null);
    const openGalleryLightbox = (...args) => (window.EpubEditorTools?.openGalleryLightbox ? window.EpubEditorTools.openGalleryLightbox(...args) : null);
    const closeGalleryLightbox = (...args) => (window.EpubEditorTools?.closeGalleryLightbox ? window.EpubEditorTools.closeGalleryLightbox(...args) : null);
    const downloadImageItem = (...args) => (window.EpubEditorTools?.downloadImageItem ? window.EpubEditorTools.downloadImageItem(...args) : null);
    // ── Global Find & Replace & Auto-Numbering (Delegated to epub_editor_tools.js) ──
    const openFindReplaceModal = (...args) => (window.EpubEditorTools?.openFindReplaceModal ? window.EpubEditorTools.openFindReplaceModal(...args) : null);
    const doGlobalReplace = (...args) => (window.EpubEditorTools?.doGlobalReplace ? window.EpubEditorTools.doGlobalReplace(...args) : null);
    const doAutoNumber = (...args) => (window.EpubEditorTools?.doAutoNumber ? window.EpubEditorTools.doAutoNumber(...args) : null);
    // ── Save to IndexedDB Library & Reader Sync ──
    async function saveNovelToDatabase(opts = {}) {
        if (!window.GeminiNovelDB) {
            if (!opts.silent && typeof window.toast === 'function') window.toast('Novel Database is not available.', 'error');
            return false;
        }

        // Sync metadata inputs
        state.title = document.getElementById('edit-book-title')?.value.trim() || state.title || 'Novel';
        state.author = document.getElementById('edit-book-author')?.value.trim() || state.author || 'Author';
        state.series = document.getElementById('edit-book-series')?.value.trim() || '';
        state.lang = document.getElementById('edit-book-lang')?.value.trim() || 'en';
        state.description = document.getElementById('edit-book-desc')?.value.trim() || '';

        const novelId = state.novelId || ('novel_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7));
        state.novelId = novelId;
        const totalWords = state.chapters.reduce((acc, c) => acc + (c.words || 0), 0);

        const chsData = state.chapters.map(c => ({
            title: c.title,
            originalTitle: c.title,
            content: c.content,
            level: c.level || 1,
            words: c.words || countWords(c.content)
        }));

        let existing = null;
        if (novelId && window.GeminiNovelDB) {
            try {
                existing = await window.GeminiNovelDB.getNovel(novelId);
            } catch (e) {}
        }

        const record = {
            ...(existing || {}),
            id: novelId,
            title: state.title,
            author: state.author,
            series: state.series,
            targetLang: state.lang,
            summary: state.description,
            cover: state.coverUrl,
            timestamp: Date.now(),
            totalWords,
            wordCount: totalWords,
            chapterCount: state.chapters.length,
            totalChapterCount: state.chapters.length,
            isEdited: true,
            isTranslated: true,
            chapters: chsData,
            rawChapters: chsData,
            translatedChapters: chsData,
            epubBlob: undefined // Invalidate stale cached pre-built blob so downloads use updated edited prose
        };

        const success = await window.GeminiNovelDB.saveNovel(record);
        if (success) {
            // Update localStorage meta list so the Library shelf immediately shows updated book
            const metaRecord = {
                id: novelId,
                title: state.title,
                author: state.author,
                summary: state.description,
                cover: state.coverUrl,
                chapterCount: state.chapters.length,
                totalChapterCount: state.chapters.length,
                totalWords,
                wordCount: totalWords,
                timestamp: Date.now(),
                isEdited: true,
                isTranslated: true
            };

            try {
                const rawMeta = localStorage.getItem('gemini_web_import_history_meta');
                const metaList = rawMeta ? JSON.parse(rawMeta) : [];
                const updatedMeta = [metaRecord, ...metaList.filter(n => n.id !== novelId && (!metaRecord.title || (n.title || '').trim().toLowerCase() !== metaRecord.title.trim().toLowerCase()))].slice(0, 50);
                localStorage.setItem('gemini_web_import_history_meta', JSON.stringify(updatedMeta));
                if (typeof window !== 'undefined') {
                    window.dispatchEvent(new CustomEvent('gemini_library_updated', { detail: { novelId, metaRecord } }));
                }
            } catch (e) {}

            if (!opts.silent && typeof window.toast === 'function') {
                window.toast(`✓ Saved "${state.title}" to Library!`, 'success');
            }
            // Update library view if open
            if (typeof window.loadSavedNovels === 'function') {
                window.loadSavedNovels();
            }
            return true;
        } else {
            if (!opts.silent && typeof window.toast === 'function') window.toast('Failed to save novel to database.', 'error');
            return false;
        }
    }

    async function saveEditedBookToLibrary() {
        return await saveNovelToDatabase({ silent: false });
    }

    // ── Export Clean EPUB File ──
    // ── Export Clean EPUB File (Delegated to epub_editor_packer.js) ──
    async function exportCleanEpub() {
        if (window.EpubEditorPacker?.exportCleanEpub) {
            return await window.EpubEditorPacker.exportCleanEpub();
        }
    }
    // ── Open Library Picker Modal ──
    async function openLibraryPicker() {
        const modal = document.getElementById('edit-library-modal');
        const list = document.getElementById('edit-library-items');
        const searchInput = document.getElementById('edit-lib-search');
        if (!modal || !list) return;

        list.innerHTML = '<p class="text-xs italic text-center py-6" style="color:var(--slate);">Loading library books…</p>';
        modal.classList.remove('hidden');

        let novels = [];
        if (window.GeminiNovelDB) {
            novels = await window.GeminiNovelDB.getAllNovels();
        }

        const renderItems = (q = '') => {
            const query = q.toLowerCase().trim();
            const filtered = novels.filter(n => !query || (n.title || '').toLowerCase().includes(query) || (n.author || '').toLowerCase().includes(query));

            list.innerHTML = '';
            if (filtered.length === 0) {
                list.innerHTML = `<p class="text-xs italic text-center py-6" style="color:var(--slate);">No matching books in library.</p>`;
                return;
            }

            filtered.forEach(n => {
                const chs = n.translatedChapters || n.rawChapters || n.chapters || [];
                const item = document.createElement('div');
                item.className = 'flex items-center justify-between p-3 rounded-xl border border-slate-800 bg-slate-900/60 hover:border-indigo-500/50 cursor-pointer transition-all';
                item.innerHTML = `
                    <div class="flex items-center gap-3 min-w-0 flex-1">
                        ${n.cover ? `<img src="${n.cover}" class="w-10 h-14 object-cover rounded shrink-0" />` : `<div class="w-10 h-14 bg-slate-800 rounded flex items-center justify-center text-xs shrink-0 text-slate-500">📖</div>`}
                        <div class="min-w-0 flex-1">
                            <h4 class="font-bold text-sm truncate" style="color:var(--paper);">${escapeXml(n.title || 'Untitled')}</h4>
                            <p class="text-xs truncate" style="color:var(--slate);">${escapeXml(n.author || 'Author')} · ${chs.length} chapters</p>
                        </div>
                    </div>
                    <button type="button" class="tl-btn accent shrink-0" style="padding:6px 12px; font-size:11.5px;">Edit Book</button>
                `;
                item.onclick = () => {
                    modal.classList.add('hidden');
                    loadBookFromRecord(n);
                };
                list.appendChild(item);
            });
        };

        renderItems();
        if (searchInput) {
            searchInput.value = '';
            searchInput.oninput = (e) => renderItems(e.target.value);
            searchInput.focus();
        }
    }

    // ── Event Wire-up ──
    function initEpubEditor() {
        const fileInput = document.getElementById('edit-epub-input');
        const coverInput = document.getElementById('edit-cover-file-input');
        const chImgInput = document.getElementById('edit-chapter-img-input');

        // File drop/picker
        document.getElementById('btn-edit-pick-file')?.addEventListener('click', () => fileInput?.click());
        document.getElementById('btn-edit-load-library')?.addEventListener('click', openLibraryPicker);

        fileInput?.addEventListener('change', (e) => {
            if (e.target.files && e.target.files[0]) {
                parseEpubFile(e.target.files[0]);
            }
        });

        // Cover file upload
        document.getElementById('btn-edit-change-cover')?.addEventListener('click', () => coverInput?.click());
        document.getElementById('edit-cover-preview')?.addEventListener('click', () => coverInput?.click());
        coverInput?.addEventListener('change', (e) => {
            if (e.target.files && e.target.files[0]) {
                const reader = new FileReader();
                reader.onload = () => {
                    state.coverUrl = reader.result;
                    state.imageRepository.set('cover.jpg', { dataUrl: reader.result, mime: e.target.files[0].type, name: 'cover.jpg' });
                    updateCoverPreview();
                    if (typeof window.toast === 'function') window.toast('Custom cover image loaded!', 'success');
                };
                reader.readAsDataURL(e.target.files[0]);
            }
        });

        // SVG Typographic Cover Generator
        document.getElementById('btn-edit-svg-cover')?.addEventListener('click', () => {
            const title = document.getElementById('edit-book-title')?.value.trim() || state.title || 'Web Novel';
            const author = document.getElementById('edit-book-author')?.value.trim() || state.author || 'Author';
            const svgStr = generateSvgCover(title, author);
            const dataUrl = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgStr);
            state.coverUrl = dataUrl;
            state.imageRepository.set('cover.svg', { dataUrl, mime: 'image/svg+xml', name: 'cover.svg' });
            updateCoverPreview();
            if (typeof window.toast === 'function') window.toast('Generated typography SVG cover!', 'success');
        });

        // Remove Cover
        document.getElementById('btn-edit-remove-cover')?.addEventListener('click', () => {
            state.coverUrl = '';
            updateCoverPreview();
        });

        // Quick Toolbar Actions: Sanitize Titles & Auto-Hierarchy
        document.getElementById('btn-edit-sanitize-titles')?.addEventListener('click', openSanitizePreviewModal);
        document.getElementById('btn-sanitize-apply-confirm')?.addEventListener('click', () => {
            if (!pendingSanitizeDiffs || pendingSanitizeDiffs.length === 0) return;
            let appliedCount = 0;
            pendingSanitizeDiffs.forEach(d => {
                if (state.chapters[d.idx]) {
                    const prevTitle = state.chapters[d.idx].title;
                    state.chapters[d.idx].title = d.cleaned;
                    state.chapters[d.idx].originalTitle = d.cleaned;
                    if (state.chapters[d.idx].content) {
                        const firstLine = state.chapters[d.idx].content.split('\n')[0].trim();
                        if (/^#{1,6}\s+/.test(firstLine)) {
                            const hText = firstLine.replace(/^#{1,6}\s+/, '').trim();
                            const isEcho = (typeof window !== 'undefined' && window.isTitleEcho)
                                ? window.isTitleEcho(hText, prevTitle)
                                : (hText.toLowerCase() === (prevTitle || '').toLowerCase());
                            if (isEcho) {
                                state.chapters[d.idx].content = state.chapters[d.idx].content.replace(/^#{1,6}\s+.+/, `# ${d.cleaned}`);
                            }
                        }
                    }
                    if (state.chapters[d.idx].originalHead) {
                        state.chapters[d.idx].originalHead = state.chapters[d.idx].originalHead.replace(/<title>.*?<\/title>/gi, `<title>${escapeXml(d.cleaned)}</title>`);
                    }
                    appliedCount++;
                }
            });
            document.getElementById('edit-sanitize-preview-modal')?.classList.add('hidden');
            renderChapterList();
            updateStats();
            if (state.novelId || (state.chapters && state.chapters.length > 0)) {
                saveNovelToDatabase({ silent: true }).catch(e => console.warn('Auto-save sanitize error:', e));
            }
            if (typeof window.toast === 'function') {
                window.toast(`✓ Successfully sanitized ${appliedCount} chapter titles!`, 'success');
            }
        });

        document.getElementById('btn-edit-auto-number')?.addEventListener('click', () => {
            document.getElementById('edit-autonumber-modal')?.classList.remove('hidden');
        });
        document.getElementById('btn-edit-do-autonumber')?.addEventListener('click', doAutoNumber);
        document.getElementById('btn-edit-auto-hierarchy')?.addEventListener('click', openHierarchyModal);
        document.getElementById('btn-hierarchy-apply-confirm')?.addEventListener('click', () => {
            if (!pendingHierarchyProposedChapters || pendingHierarchyProposedChapters.length === 0) return;
            state.chapters = pendingHierarchyProposedChapters;
            document.getElementById('edit-hierarchy-modal')?.classList.add('hidden');
            renderChapterList();
            updateStats();
            if (state.novelId || (state.chapters && state.chapters.length > 0)) {
                saveNovelToDatabase({ silent: true }).catch(e => console.warn('Auto-save hierarchy error:', e));
            }
            if (typeof window.toast === 'function') {
                const subCount = state.chapters.filter(c => c.level === 2).length;
                window.toast(`✓ Hierarchy applied! (${subCount} nested sub-chapters)`, 'success');
            }
        });
        document.getElementById('btn-hierarchy-flatten-all')?.addEventListener('click', () => {
            if (!state.chapters || state.chapters.length === 0) return;
            state.chapters.forEach(c => { c.level = 1; });
            document.getElementById('edit-hierarchy-modal')?.classList.add('hidden');
            renderChapterList();
            updateStats();
            if (state.novelId || (state.chapters && state.chapters.length > 0)) {
                saveNovelToDatabase({ silent: true }).catch(e => console.warn('Auto-save flatten error:', e));
            }
            if (typeof window.toast === 'function') {
                window.toast(`✓ All chapters flattened to Main Chapters (Level 1)!`, 'info');
            }
        });

        // Table of Contents Full Manager Handlers
        const handleFlattenAllChapters = () => {
            if (!state.chapters || state.chapters.length === 0) return;
            const hasSubs = state.chapters.some(c => c.level === 2);
            if (!hasSubs) {
                if (typeof window.toast === 'function') window.toast('All chapters are already normal flat chapters.', 'info');
                return;
            }
            state.chapters.forEach(c => { c.level = 1; });
            renderChapterList();
            updateStats();
            if (state.novelId || (state.chapters && state.chapters.length > 0)) {
                saveNovelToDatabase({ silent: true }).catch(e => console.warn('Auto-save flatten error:', e));
            }
            if (typeof window.toast === 'function') {
                window.toast('✓ All chapters restored to normal flat chapters!', 'success');
            }
        };

        document.getElementById('btn-edit-flatten-all')?.addEventListener('click', handleFlattenAllChapters);
        document.getElementById('btn-toc-manager-flatten-all')?.addEventListener('click', () => {
            harvestTocManagerInputs();
            if (tocManagerTempChapters) {
                tocManagerTempChapters.forEach(c => { c.level = 1; });
                renderTocManagerRows(document.getElementById('toc-manager-search')?.value || '');
                if (typeof window.toast === 'function') window.toast('All chapters in TOC set to Normal (flat)!', 'info');
            }
        });

        document.getElementById('btn-edit-open-toc-manager')?.addEventListener('click', openTocManagerModal);
        document.getElementById('btn-toc-manager-save-all')?.addEventListener('click', saveTocManagerChanges);
        document.getElementById('btn-toc-manager-paste-titles')?.addEventListener('click', pasteBulkTitlesToToc);
        document.getElementById('btn-toc-manager-autonumber')?.addEventListener('click', renumberTocManager);
        document.getElementById('toc-manager-search')?.addEventListener('input', (e) => {
            renderTocManagerRows(e.target.value);
        });

        document.getElementById('btn-edit-find-replace')?.addEventListener('click', openFindReplaceModal);
        document.getElementById('btn-edit-do-replace')?.addEventListener('click', doGlobalReplace);

        document.getElementById('btn-edit-gallery')?.addEventListener('click', openGalleryModal);
        document.getElementById('btn-edit-gallery-upload-new')?.addEventListener('click', () => chImgInput?.click());

        // Add Chapter (at the end)
        document.getElementById('btn-edit-add-chapter')?.addEventListener('click', () => {
            insertChapterAt(state.chapters.length - 1, 'below');
        });

        // Save & Export
        document.getElementById('btn-edit-save-library')?.addEventListener('click', saveEditedBookToLibrary);
        document.getElementById('btn-edit-export-epub')?.addEventListener('click', exportCleanEpub);

        // Reset Book
        document.getElementById('btn-edit-reset-book')?.addEventListener('click', () => {
            if (confirm('Close current book? Make sure you have saved or downloaded your changes.')) {
                state.title = '';
                state.chapters = [];
                state.coverUrl = '';
                state.originalZip = null;
                state.originalOpfPath = '';
                state.originalOpfDir = '';
                state.originalFileName = '';
                state.collapsedVolumes.clear();
                document.getElementById('edit-workspace')?.classList.add('hidden');
                document.getElementById('edit-upload-section')?.classList.remove('hidden');
            }
        });

        // TOC Filter
        document.getElementById('edit-toc-filter')?.addEventListener('input', () => {
            renderChapterList();
        });

        // Modal: Save Chapter
        document.getElementById('btn-edit-modal-save')?.addEventListener('click', () => {
            saveCurrentModalChapter();
            exitEpubEditorPreview();
            document.getElementById('edit-chapter-modal')?.classList.add('hidden');
            if (typeof window.toast === 'function') window.toast('Chapter saved!', 'success');
        });

        // Modal: Previous / Next Chapter
        document.getElementById('btn-edit-modal-prev-ch')?.addEventListener('click', () => {
            saveCurrentModalChapter();
            if (modalActiveIdx > 0) openChapterModal(modalActiveIdx - 1);
        });
        document.getElementById('btn-edit-modal-next-ch')?.addEventListener('click', () => {
            saveCurrentModalChapter();
            if (modalActiveIdx < state.chapters.length - 1) openChapterModal(modalActiveIdx + 1);
        });

        // Modal: Typography & Formatting Toolbar Buttons
        document.getElementById('fmt-btn-bold')?.addEventListener('click', () => applyTextareaFormat('bold'));
        document.getElementById('fmt-btn-italic')?.addEventListener('click', () => applyTextareaFormat('italic'));
        document.getElementById('fmt-btn-underline')?.addEventListener('click', () => applyTextareaFormat('underline'));
        document.getElementById('fmt-btn-strike')?.addEventListener('click', () => applyTextareaFormat('strike'));
        document.getElementById('fmt-btn-h2')?.addEventListener('click', () => applyTextareaFormat('h2'));
        document.getElementById('fmt-btn-h3')?.addEventListener('click', () => applyTextareaFormat('h3'));
        document.getElementById('fmt-btn-quote')?.addEventListener('click', () => applyTextareaFormat('quote'));
        document.getElementById('fmt-btn-center')?.addEventListener('click', () => applyTextareaFormat('center'));
        document.getElementById('fmt-btn-divider')?.addEventListener('click', () => applyTextareaFormat('divider'));
        document.getElementById('fmt-btn-spacer')?.addEventListener('click', () => applyTextareaFormat('spacer'));

        // Modal: Clean Spacing (Preserves intentional double spacing and spacers)
        document.getElementById('btn-edit-modal-clean-spacing')?.addEventListener('click', () => {
            const textarea = document.getElementById('edit-ch-modal-textarea');
            if (textarea) {
                let s = textarea.value;
                s = s.replace(/\r\n/g, '\n');
                s = s.replace(/[ \t]+$/gm, '');
                // Allow up to 2 empty blank lines (\n\n\n) for dramatic scene transitions, collapsing 4+ down to 3
                s = s.replace(/\n{4,}/g, '\n\n\n');
                textarea.value = s.trim();
                const ch = state.chapters[modalActiveIdx];
                if (ch) {
                    ch.content = textarea.value;
                    ch.words = countWords(ch.content);
                }
                recordUndoState(textarea.value);
                updateModalWordCount();
                if (typeof window.toast === 'function') window.toast('Cleaned paragraph spacing!', 'info');
            }
        });

        // Modal: Undo & Redo
        document.getElementById('btn-edit-modal-undo')?.addEventListener('click', performUndo);
        document.getElementById('btn-edit-modal-redo')?.addEventListener('click', performRedo);

        // Modal: Novel Illustration Picker & Upload
        document.getElementById('btn-edit-modal-insert-img')?.addEventListener('click', openNovelImagePicker);
        document.getElementById('btn-picker-upload-new')?.addEventListener('click', () => chImgInput?.click());

        chImgInput?.addEventListener('change', (e) => {
            if (e.target.files && e.target.files[0]) {
                const file = e.target.files[0];
                const reader = new FileReader();
                reader.onload = () => {
                    const dataUrl = reader.result;
                    const imgName = file.name ? file.name.replace(/\s+/g, '_') : `illustration_${Date.now()}.jpg`;
                    state.imageRepository.set(imgName, { dataUrl, mime: file.type, name: imgName });
                    insertImageIntoTextarea(imgName);
                    document.getElementById('edit-novel-image-picker-modal')?.classList.add('hidden');
                };
                reader.readAsDataURL(file);
            }
        });

        // Modal: Preview Toggle & Back Button
        document.getElementById('btn-preview-back-to-edit')?.addEventListener('click', exitEpubEditorPreview);
        document.getElementById('btn-edit-modal-preview-toggle')?.addEventListener('click', () => {
            const textarea = document.getElementById('edit-ch-modal-textarea');
            const preview = document.getElementById('edit-ch-modal-preview');
            const previewBar = document.getElementById('edit-ch-modal-preview-bar');
            const subtoolbar = document.getElementById('edit-ch-modal-subtoolbar');
            const previewContent = document.getElementById('preview-html-content') || preview;
            const btn = document.getElementById('btn-edit-modal-preview-toggle');
            if (!textarea || !preview) return;

            isPreviewMode = !isPreviewMode;
            window.isEpubEditorPreviewActive = isPreviewMode;

            if (isPreviewMode) {
                textarea.classList.add('hidden');
                textarea.style.display = 'none';
                if (subtoolbar) {
                    subtoolbar.classList.add('hidden');
                    subtoolbar.style.display = 'none';
                }
                const imgTray = document.getElementById('edit-ch-modal-img-tray');
                if (imgTray) {
                    imgTray.classList.add('hidden');
                    imgTray.style.display = 'none';
                }
                if (previewBar) {
                    previewBar.classList.remove('hidden');
                    previewBar.style.display = 'flex';
                }
                preview.classList.remove('hidden');
                preview.style.display = 'block';
                preview.scrollTop = 0;
                if (btn) btn.textContent = '✏️ Edit Prose';

                const raw = textarea.value || '';
                const currTitle = (document.getElementById('edit-ch-modal-title')?.value || state.chapters[modalActiveIdx]?.title || '').trim();
                const stripFn = (typeof window !== 'undefined' && window.stripLeadingTitleFromContent)
                    ? window.stripLeadingTitleFromContent
                    : ((typeof stripLeadingTitleFromContent === 'function') ? stripLeadingTitleFromContent : null);
                let cleanRaw = raw;
                if (stripFn && currTitle) {
                    cleanRaw = stripFn(cleanRaw, currTitle);
                }

                // Normalize newlines and convert 3+ consecutive newlines into guaranteed paragraph spacers
                let normalized = cleanRaw.replace(/\r\n/g, '\n');
                normalized = normalized.replace(/\n{3,}/g, '\n\n<p class="para-spacer">&nbsp;</p>\n\n');

                const paras = normalized.split(/\n\s*\n/);
                const htmlParts = [];
                if (currTitle) {
                    htmlParts.push(`<h2 class="chapter-title" style="font-weight:800; font-size:1.45em; color:var(--paper); margin:0 0 20px; padding-bottom:12px; border-bottom:1px solid var(--hairline); letter-spacing:-0.01em;">${escapeXml(currTitle)}</h2>`);
                }
                paras.forEach((p, idx) => {
                    let trimmed = p.trim();
                    if (!trimmed) return;
                    if (idx === 0 && /^#{1,6}\s+/.test(trimmed)) {
                        const hText = trimmed.replace(/^#{1,6}\s+/, '').trim();
                        const isEcho = (typeof window !== 'undefined' && window.isTitleEcho)
                            ? window.isTitleEcho(hText, currTitle)
                            : (hText.toLowerCase() === (currTitle || '').toLowerCase());
                        if (isEcho) return;
                    }
                    htmlParts.push(renderProseParagraphHtml(trimmed, true));
                });
                if (htmlParts.length === 0 || (htmlParts.length === 1 && currTitle)) {
                    htmlParts.push('<p class="italic text-center py-8 text-xs" style="color:var(--slate);">Chapter prose is empty.</p>');
                }
                if (previewContent) {
                    previewContent.innerHTML = htmlParts.join('\n');
                }
                const wordSpan = document.getElementById('preview-modal-word-count');
                if (wordSpan) {
                    const wc = countWords(raw);
                    wordSpan.textContent = `${wc.toLocaleString()} words`;
                }
            } else {
                exitEpubEditorPreview();
            }
        });

        // Modal: Word count, in-memory sync, and auto-save on typing
        document.getElementById('edit-ch-modal-textarea')?.addEventListener('input', () => {
            updateModalWordCount();
            const ch = state.chapters[modalActiveIdx];
            if (ch) {
                ch.content = document.getElementById('edit-ch-modal-textarea')?.value || '';
                ch.words = countWords(ch.content);
            }
            clearTimeout(undoDebounceTimer);
            undoDebounceTimer = setTimeout(() => {
                const val = document.getElementById('edit-ch-modal-textarea')?.value || '';
                recordUndoState(val);
                if (state.novelId || (state.chapters && state.chapters.length > 0)) {
                    saveNovelToDatabase({ silent: true }).catch(() => {});
                }
            }, 800);
        });

        // Real-time title & level input sync
        document.getElementById('edit-ch-modal-title')?.addEventListener('input', () => {
            const ch = state.chapters[modalActiveIdx];
            if (ch) {
                ch.title = document.getElementById('edit-ch-modal-title')?.value.trim() || `Chapter ${modalActiveIdx + 1}`;
            }
        });
        document.getElementById('edit-ch-modal-level')?.addEventListener('change', () => {
            const ch = state.chapters[modalActiveIdx];
            if (ch) {
                ch.level = parseInt(document.getElementById('edit-ch-modal-level')?.value, 10) || 1;
            }
        });

        // Keyboard shortcuts for Chapter Modal
        document.getElementById('edit-chapter-modal')?.addEventListener('keydown', (e) => {
            const isCmdOrCtrl = e.ctrlKey || e.metaKey;
            if (isCmdOrCtrl && e.key.toLowerCase() === 's') {
                e.preventDefault();
                e.stopPropagation();
                document.getElementById('btn-edit-modal-save')?.click();
            } else if (isCmdOrCtrl && e.key.toLowerCase() === 'b') {
                e.preventDefault();
                e.stopPropagation();
                applyTextareaFormat('bold');
            } else if (isCmdOrCtrl && e.key.toLowerCase() === 'i') {
                e.preventDefault();
                e.stopPropagation();
                applyTextareaFormat('italic');
            } else if (isCmdOrCtrl && e.key.toLowerCase() === 'u') {
                e.preventDefault();
                e.stopPropagation();
                applyTextareaFormat('underline');
            } else if (isCmdOrCtrl && !e.shiftKey && e.key.toLowerCase() === 'z') {
                e.preventDefault();
                e.stopPropagation();
                performUndo();
            } else if ((isCmdOrCtrl && e.key.toLowerCase() === 'y') || (isCmdOrCtrl && e.shiftKey && e.key.toLowerCase() === 'z')) {
                e.preventDefault();
                e.stopPropagation();
                performRedo();
            } else if (e.key === 'Escape') {
                if (!document.getElementById('edit-novel-image-picker-modal')?.classList.contains('hidden')) {
                    document.getElementById('edit-novel-image-picker-modal')?.classList.add('hidden');
                } else if (!document.getElementById('edit-unsaved-confirm-modal')?.classList.contains('hidden')) {
                    document.getElementById('btn-unsaved-cancel')?.click();
                } else {
                    requestCloseChapterModal();
                }
            }
        });

        // Rename Modal Handlers
        document.getElementById('btn-edit-rename-save')?.addEventListener('click', () => {
            if (activeRenameIdx >= 0 && activeRenameIdx < state.chapters.length) {
                const input = document.getElementById('edit-rename-input');
                const val = input?.value.trim();
                if (val) {
                    const prevTitle = state.chapters[activeRenameIdx].title;
                    state.chapters[activeRenameIdx].title = val;
                    state.chapters[activeRenameIdx].originalTitle = val;
                    if (state.chapters[activeRenameIdx].content) {
                        const firstLine = state.chapters[activeRenameIdx].content.split('\n')[0].trim();
                        if (/^#{1,6}\s+/.test(firstLine)) {
                            const hText = firstLine.replace(/^#{1,6}\s+/, '').trim();
                            const isEcho = (typeof window !== 'undefined' && window.isTitleEcho)
                                ? window.isTitleEcho(hText, prevTitle)
                                : (hText.toLowerCase() === (prevTitle || '').toLowerCase());
                            if (isEcho) {
                                state.chapters[activeRenameIdx].content = state.chapters[activeRenameIdx].content.replace(/^#{1,6}\s+.+/, `# ${val}`);
                            }
                        }
                    }
                    if (state.chapters[activeRenameIdx].originalHead) {
                        state.chapters[activeRenameIdx].originalHead = state.chapters[activeRenameIdx].originalHead.replace(/<title>.*?<\/title>/gi, `<title>${escapeXml(val)}</title>`);
                    }
                    renderChapterList();
                    updateStats();
                    if (state.novelId || (state.chapters && state.chapters.length > 0)) {
                        saveNovelToDatabase({ silent: true }).catch(e => console.warn('Auto-save rename error:', e));
                    }
                    if (typeof window.toast === 'function') window.toast(`✓ Renamed to "${val}"!`, 'success');
                }
            }
            document.getElementById('edit-rename-modal')?.classList.add('hidden');
        });
        document.getElementById('edit-rename-input')?.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                document.getElementById('btn-edit-rename-save')?.click();
            }
        });

        // Move & Hierarchy Sheet Handlers
        document.getElementById('btn-move-sheet-up')?.addEventListener('click', () => {
            if (activeMoveIdx < 0 || activeMoveIdx >= state.chapters.length) return;
            const targetId = state.chapters[activeMoveIdx].id;
            const [bStart, bEnd] = getChapterBlockRange(activeMoveIdx);
            moveChapterBlock(bStart, bEnd, -1);
            activeMoveIdx = state.chapters.findIndex(c => c.id === targetId);
            updateMoveSheet();
        });
        document.getElementById('btn-move-sheet-down')?.addEventListener('click', () => {
            if (activeMoveIdx < 0 || activeMoveIdx >= state.chapters.length) return;
            const targetId = state.chapters[activeMoveIdx].id;
            const [bStart, bEnd] = getChapterBlockRange(activeMoveIdx);
            moveChapterBlock(bStart, bEnd, 1);
            activeMoveIdx = state.chapters.findIndex(c => c.id === targetId);
            updateMoveSheet();
        });
        document.getElementById('btn-move-sheet-top')?.addEventListener('click', () => {
            if (activeMoveIdx < 0 || activeMoveIdx >= state.chapters.length) return;
            const targetId = state.chapters[activeMoveIdx].id;
            const [bStart, bEnd] = getChapterBlockRange(activeMoveIdx);
            moveChapterBlock(bStart, bEnd, 'top');
            activeMoveIdx = state.chapters.findIndex(c => c.id === targetId);
            updateMoveSheet();
        });
        document.getElementById('btn-move-sheet-bottom')?.addEventListener('click', () => {
            if (activeMoveIdx < 0 || activeMoveIdx >= state.chapters.length) return;
            const targetId = state.chapters[activeMoveIdx].id;
            const [bStart, bEnd] = getChapterBlockRange(activeMoveIdx);
            moveChapterBlock(bStart, bEnd, 'bottom');
            activeMoveIdx = state.chapters.findIndex(c => c.id === targetId);
            updateMoveSheet();
        });
        document.getElementById('btn-move-sheet-level1')?.addEventListener('click', () => {
            if (activeMoveIdx >= 0 && activeMoveIdx < state.chapters.length) {
                state.chapters[activeMoveIdx].level = 1;
                renderChapterList();
                updateMoveSheet();
                saveNovelToDatabase({ silent: true }).catch(e => console.warn('Auto-save level error:', e));
            }
        });
        document.getElementById('btn-move-sheet-level2')?.addEventListener('click', () => {
            if (activeMoveIdx > 0 && activeMoveIdx < state.chapters.length) {
                state.chapters[activeMoveIdx].level = 2;
                renderChapterList();
                updateMoveSheet();
                saveNovelToDatabase({ silent: true }).catch(e => console.warn('Auto-save level error:', e));
            }
        });
        document.getElementById('btn-move-sheet-insert-above')?.addEventListener('click', () => {
            const curIdx = activeMoveIdx;
            document.getElementById('edit-move-chapter-modal')?.classList.add('hidden');
            insertChapterAt(curIdx, 'above');
        });
        document.getElementById('btn-move-sheet-insert-below')?.addEventListener('click', () => {
            const curIdx = activeMoveIdx;
            document.getElementById('edit-move-chapter-modal')?.classList.add('hidden');
            insertChapterAt(curIdx, 'below');
        });

        // Unsaved Confirmation Modal handlers
        document.getElementById('btn-unsaved-save-close')?.addEventListener('click', () => {
            saveCurrentModalChapter();
            exitEpubEditorPreview();
            document.getElementById('edit-unsaved-confirm-modal')?.classList.add('hidden');
            document.getElementById('edit-chapter-modal')?.classList.add('hidden');
            if (typeof window.toast === 'function') window.toast('Chapter saved!', 'success');
        });
        document.getElementById('btn-unsaved-discard')?.addEventListener('click', () => {
            exitEpubEditorPreview();
            document.getElementById('edit-unsaved-confirm-modal')?.classList.add('hidden');
            document.getElementById('edit-chapter-modal')?.classList.add('hidden');
            if (typeof window.toast === 'function') window.toast('Unsaved changes discarded.', 'info');
        });
        document.getElementById('btn-unsaved-cancel')?.addEventListener('click', () => {
            document.getElementById('edit-unsaved-confirm-modal')?.classList.add('hidden');
        });

        // Tab-Switch Redraw: Restore active workspace if book was already loaded
        if (state.chapters && state.chapters.length > 0) {
            renderEditorView();
        }
    }

    // ── Global Exports ──
    if (typeof window !== 'undefined') {
    if (typeof window !== "undefined") {
        window.epubEditorHelpers = {
            renderEditorView,
            renderChapterList,
            updateCoverPreview,
            updateStats,
            cleanTitle,
            countWords,
            extractImagesFromContent,
            saveNovelToDatabase
        };
    }
        window.editHtml = editHtml;
        window.initEpubEditor = initEpubEditor;
        window.openGalleryModal = openGalleryModal;
        window.closeGalleryModal = closeGalleryModal;
        window.closeGalleryLightbox = closeGalleryLightbox;
        window.loadEpubForEditing = function(bookOrFile) {
            if (!bookOrFile) return;
            if (bookOrFile instanceof Blob || bookOrFile instanceof File) {
                parseEpubFile(bookOrFile);
            } else if (typeof bookOrFile === 'object') {
                loadBookFromRecord(bookOrFile);
            }
        };
    }

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = { editHtml, initEpubEditor };
    }
})();
