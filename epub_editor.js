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

    // ── HTML UI Template ──
    const editHtml = `
    <div id="epub-edit-tab" style="width:100%;">
        <input type="file" id="edit-epub-input" accept="*/*,.epub" class="hidden" />
        <input type="file" id="edit-cover-file-input" accept="image/jpeg,image/png,image/webp,image/gif" class="hidden" />
        <input type="file" id="edit-chapter-img-input" accept="image/jpeg,image/png,image/webp,image/gif" class="hidden" />

        <!-- 1. EMPTY / DROP ZONE -->
        <div id="edit-upload-section" class="tl-drop"
             ondragover="event.preventDefault(); this.classList.add('ring-4','ring-indigo-400');"
             ondragleave="this.classList.remove('ring-4','ring-indigo-400');"
             ondrop="event.preventDefault(); this.classList.remove('ring-4','ring-indigo-400'); if(event.dataTransfer.files.length>0) window.loadEpubForEditing(event.dataTransfer.files[0]);">
            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none"
                 stroke="var(--iris)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-bottom:8px;">
                <path d="M12 20h9" />
                <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
            </svg>
            <div id="edit-loading-spinner" class="hidden w-8 h-8 border-4 border-t-transparent rounded-full animate-spin"
                 style="border-color: var(--iris); border-top-color: transparent; margin: 0 auto 8px;"></div>
            <h3 id="edit-upload-title" style="font-size: 17px; font-weight: 700; color: var(--paper); margin-bottom: 4px;">
                Open EPUB Book in Studio Editor
            </h3>
            <p id="edit-upload-desc" style="font-size: 12.5px; color: var(--slate); font-weight: 500; margin-bottom: 12px;">
                Drop an .epub file here, select from your device, or load directly from your library
            </p>
            <div style="display:flex; gap:10px; justify-content:center; flex-wrap:wrap;">
                <button type="button" id="btn-edit-pick-file" class="tl-btn primary">📁 Select EPUB File</button>
                <button type="button" id="btn-edit-load-library" class="tl-btn">📚 Load from Saved Library</button>
            </div>
            <div id="edit-load-progress-wrapper" class="hidden w-full max-w-xs mx-auto mt-4">
                <div class="flex justify-between text-xs mb-1 font-semibold" style="color: var(--slate);">
                    <span id="edit-load-status">Extracting Chapters & Assets…</span>
                    <span id="edit-load-percent">0%</span>
                </div>
                <div class="w-full rounded-full h-2 overflow-hidden" style="background: var(--ember-2);">
                    <div id="edit-load-progress-bar" class="h-2 rounded-full transition-all duration-200 ease-out"
                         style="width: 0%; background: var(--iris);"></div>
                </div>
            </div>
        </div>

        <!-- 2. MAIN ACTIVE WORKSPACE (Hidden until book loaded) -->
        <div id="edit-workspace" class="hidden">
            <!-- Book Metadata & Cover Bar -->
            <div class="stu-sec" style="display:flex; gap:20px; align-items:flex-start; flex-wrap:wrap; padding-top:4px;">
                <!-- Cover Card & Studio Actions -->
                <div style="display:flex; flex-direction:column; align-items:center; gap:8px; width:130px; shrink:0;">
                    <div id="edit-cover-preview"
                         style="width:120px; height:170px; border-radius:8px; overflow:hidden; background:var(--ember-2); border:1px solid var(--hairline); display:flex; align-items:center; justify-content:center; box-shadow:0 8px 16px rgba(0,0,0,0.35); position:relative; cursor:pointer;"
                         title="Click to change book cover">
                        <span style="font-size:11px; color:var(--slate); text-align:center; padding:8px;">No Cover</span>
                    </div>
                    <div style="display:flex; flex-direction:column; gap:4px; width:100%;">
                        <button type="button" id="btn-edit-change-cover" class="tl-btn" style="padding:5px 8px; font-size:11px; width:100%;">📁 Upload</button>
                        <button type="button" id="btn-edit-svg-cover" class="tl-btn" style="padding:5px 8px; font-size:11px; width:100%;" title="Generate clean typography SVG cover">🎨 Make Cover</button>
                        <button type="button" id="btn-edit-remove-cover" class="tl-btn danger" style="padding:4px 8px; font-size:10px; width:100%;">Remove</button>
                    </div>
                </div>

                <!-- Metadata Inputs -->
                <div style="flex:1; min-width:260px; display:flex; flex-direction:column; gap:10px;">
                    <div>
                        <label class="cap" style="display:block; margin-bottom:4px;">Book Title</label>
                        <input type="text" id="edit-book-title" placeholder="Book Title" class="tl-field"
                               style="font-size:17px; font-weight:700; color:var(--paper); padding:8px 12px;">
                    </div>
                    <div style="display:flex; gap:12px; flex-wrap:wrap;">
                        <div style="flex:1; min-width:140px;">
                            <label class="cap" style="display:block; margin-bottom:4px;">Author</label>
                            <input type="text" id="edit-book-author" placeholder="Author" class="tl-field" style="padding:7px 10px; font-size:13px;">
                        </div>
                        <div style="flex:1; min-width:140px;">
                            <label class="cap" style="display:block; margin-bottom:4px;">Series / Arc</label>
                            <input type="text" id="edit-book-series" placeholder="Optional Series Name" class="tl-field" style="padding:7px 10px; font-size:13px;">
                        </div>
                        <div style="width:90px;">
                            <label class="cap" style="display:block; margin-bottom:4px;">Language</label>
                            <input type="text" id="edit-book-lang" value="en" class="tl-field" style="padding:7px 10px; font-size:13px;">
                        </div>
                    </div>
                    <div>
                        <label class="cap" style="display:block; margin-bottom:4px;">Description / Synopsis</label>
                        <textarea id="edit-book-desc" rows="2" placeholder="Book description or synopsis…" class="tl-field"
                                  style="resize:vertical; font-size:12px; padding:6px 10px; min-height:48px;"></textarea>
                    </div>
                    <!-- Live Statistics Bar -->
                    <div id="edit-stats-bar" style="display:flex; gap:12px; align-items:center; flex-wrap:wrap; font-size:11.5px; color:var(--slate); font-family:'IBM Plex Mono',monospace; padding-top:4px;">
                        <span id="edit-stat-ch-count" style="color:var(--iris); font-weight:600;">0 chapters</span> ·
                        <span id="edit-stat-words">0 words</span> ·
                        <span id="edit-stat-images">0 images</span>
                    </div>
                </div>
            </div>

            <!-- Quick Action Toolbar -->
            <div class="stu-sec" style="display:flex; gap:8px; align-items:center; justify-content:space-between; flex-wrap:wrap; padding:12px 0;">
                <div style="display:flex; gap:6px; align-items:center; flex-wrap:wrap;">
                    <button type="button" id="btn-edit-sanitize-titles" class="tl-btn" title="Strip scraped tags, website names, and duplicate prefixes from all chapter titles">
                        🧹 Sanitize Titles
                    </button>
                    <button type="button" id="btn-edit-auto-number" class="tl-btn" title="Renumber chapters sequentially (e.g. Chapter 1 - [Title])">
                        🔢 Auto-Number
                    </button>
                    <button type="button" id="btn-edit-auto-hierarchy" class="tl-btn" title="Automatically detect volume dividers and nest chapters into a collapsible tree">
                        🪄 Auto-Hierarchy
                    </button>
                    <button type="button" id="btn-edit-find-replace" class="tl-btn" title="Search and replace across all chapters">
                        🔍 Find & Replace
                    </button>
                    <button type="button" id="btn-edit-gallery" class="tl-btn" title="View all illustrations in book, set cover, or download">
                        🖼️ Image Gallery
                    </button>
                    <button type="button" id="btn-edit-add-chapter" class="tl-btn" style="color:var(--iris);" title="Add a new chapter">
                        ➕ Add Chapter
                    </button>
                </div>
                <div style="display:flex; gap:8px; align-items:center; flex-wrap:wrap;">
                    <button type="button" id="btn-edit-save-library" class="tl-btn accent" title="Save edited book to IndexedDB library and sync with Reader">
                        💾 Save to Library
                    </button>
                    <button type="button" id="btn-edit-export-epub" class="tl-btn primary" title="Download packaged clean EPUB file to device">
                        📥 Download EPUB
                    </button>
                </div>
            </div>

            <!-- Chapter TOC & Hierarchy Section -->
            <div class="stu-sec" style="border-bottom:none;">
                <div style="display:flex; align-items:center; justify-content:space-between; gap:12px; margin-bottom:12px; flex-wrap:wrap;">
                    <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
                        <span class="cap" style="font-size:12px; letter-spacing:.12em;">Table of Contents & Hierarchy</span>
                        <span id="edit-toc-badge" class="chip-act" style="background:rgba(99,102,241,.15); color:var(--iris); border-color:transparent;">0 Chapters</span>
                        <button type="button" id="btn-edit-open-toc-manager" class="tl-btn accent" style="padding:4px 11px; font-size:11.5px; font-weight:700;" title="Open full Table of Contents editor to edit titles, levels, and order">
                            📝 Edit TOC
                        </button>
                        <button type="button" id="btn-edit-flatten-all" class="tl-btn" style="padding:4px 11px; font-size:11.5px; font-weight:600; color:var(--paper-dim);" title="Reset all chapters to standard normal flat chapters in 1 tap">
                            📑 Flatten All
                        </button>
                    </div>
                    <div style="display:flex; gap:8px; align-items:center;">
                        <input type="text" id="edit-toc-filter" placeholder="Filter chapters…" class="tl-field"
                               style="width:160px; padding:4px 8px; font-size:11.5px; margin:0;">
                        <button type="button" id="btn-edit-reset-book" class="chip-act" style="color:var(--slate);">Close Book</button>
                    </div>
                </div>

                <!-- Chapters List Container -->
                <div id="edit-chapter-list" class="tl-list" style="max-height:580px; overflow-y:auto; padding:6px; display:flex; flex-direction:column; gap:6px;">
                    <!-- Dynamically populated rows -->
                </div>
            </div>
        </div>

        <!-- ═══ MODAL 1: CHAPTER PROSE & IN-CHAPTER IMAGE EDITOR ═══ -->
        <div id="edit-chapter-modal" class="hidden fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5"
             style="background:rgba(0,0,0,.75); backdrop-filter:blur(8px);"
             onclick="if(event.target===this) (window.requestCloseChapterModal ? window.requestCloseChapterModal() : this.classList.add('hidden'));">
            <div class="rounded-2xl shadow-2xl w-full max-w-4xl flex flex-col overflow-hidden"
                 style="background:var(--ember); border:1px solid var(--hairline); height:90vh; height:90dvh; max-height:90dvh; display:flex; flex-direction:column;">
                <!-- Modal Top Header -->
                <div class="flex items-center justify-between p-4 shrink-0" style="border-bottom:1px solid var(--hairline); background:var(--ember-2);">
                    <div class="flex items-center gap-3 flex-1 min-w-0 pr-4">
                        <span id="edit-ch-modal-idx" class="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold shrink-0"
                              style="background:rgba(99,102,241,.2); color:var(--iris);">#1</span>
                        <input type="text" id="edit-ch-modal-title" placeholder="Chapter Title" class="tl-field"
                                style="font-size:15px; font-weight:700; color:var(--paper); margin:0; flex:1;">
                        <!-- Level Switcher -->
                        <select id="edit-ch-modal-level" class="tl-field shrink-0" style="width:auto; font-size:12px; margin:0;">
                            <option value="1">Main Chapter (Level 1)</option>
                            <option value="2">↳ Sub-Chapter (Level 2)</option>
                        </select>
                    </div>
                    <button type="button" onclick="window.requestCloseChapterModal ? window.requestCloseChapterModal() : document.getElementById('edit-chapter-modal').classList.add('hidden')"
                            class="w-8 h-8 rounded-lg flex items-center justify-center text-base font-bold shrink-0" style="color:var(--slate);">✕</button>
                </div>

                <!-- Modal Sub-Toolbar (Prose Editor Mode) -->
                <div id="edit-ch-modal-subtoolbar" class="px-4 py-2 flex items-center justify-between gap-3 flex-wrap text-xs shrink-0"
                     style="border-bottom:1px solid var(--hairline); background:rgba(255,255,255,0.02);">
                    <div class="flex items-center gap-2 flex-wrap">
                        <button type="button" id="btn-edit-modal-insert-img" class="tl-btn" style="padding:5px 10px; font-size:11.5px;">
                            🖼️ Insert Image
                        </button>
                        <button type="button" id="btn-edit-modal-preview-toggle" class="tl-btn accent" style="padding:5px 10px; font-size:11.5px; font-weight:700;">
                            👁️ Preview HTML
                        </button>
                        <button type="button" id="btn-edit-modal-undo" class="tl-btn" style="padding:5px 8px; font-size:11.5px;" title="Undo">
                            ↶ Undo
                        </button>
                        <button type="button" id="btn-edit-modal-redo" class="tl-btn" style="padding:5px 8px; font-size:11.5px;" title="Redo">
                            ↷ Redo
                        </button>
                        <button type="button" id="btn-edit-modal-clean-spacing" class="tl-btn" style="padding:5px 10px; font-size:11.5px;" title="Clean consecutive blank lines & trailing spaces">
                            🧹 Clean Spacing
                        </button>
                    </div>
                    <div class="flex items-center gap-3 font-mono text-[11px]" style="color:var(--slate);">
                        <span id="edit-modal-word-count">0 words</span> ·
                        <span id="edit-modal-char-count">0 chars</span>
                    </div>
                </div>

                <!-- Modal Preview Top Bar (Dedicated, ALWAYS visible when previewing) -->
                <div id="edit-ch-modal-preview-bar" class="hidden px-4 py-2.5 flex items-center justify-between gap-3 shrink-0"
                     style="border-bottom:1px solid var(--hairline); background:var(--ember-2);">
                    <button type="button" id="btn-preview-back-to-edit" class="tl-btn accent" style="padding:7px 18px; font-weight:700; font-size:13px; display:inline-flex; align-items:center; gap:6px;">
                        ← Back to Editor
                    </button>
                    <div class="flex items-center gap-3 text-xs" style="color:var(--slate);">
                        <span class="font-semibold">👁️ Chapter Preview</span>
                        <span id="preview-modal-word-count" class="font-mono text-[11px]"></span>
                    </div>
                </div>

                <!-- Modal Body (Textarea or Rendered Preview) -->
                <div class="flex-1 overflow-hidden relative flex flex-col" style="min-height:0; flex:1 1 0px; height:100%;">
                    <textarea id="edit-ch-modal-textarea"
                              placeholder="Type or paste chapter prose here… Markdown headings (# Title) and images (![Alt](url)) are supported."
                              style="width:100%; height:100%; min-height:0; flex:1 1 0px; border:none; background:transparent; color:var(--paper); font-family:serif,Georgia,Cambria; font-size:15px; line-height:1.75; padding:18px 22px; resize:none; outline:none; overflow-y:auto; -webkit-overflow-scrolling:touch; touch-action:pan-y;"
                              class="custom-scrollbar"></textarea>
                    <div id="edit-ch-modal-preview" class="hidden flex-1 overflow-y-auto custom-scrollbar font-serif text-sm leading-relaxed"
                         style="color:var(--paper-dim); background:rgba(0,0,0,0.15); min-height:0; height:100%; flex:1 1 0px; -webkit-overflow-scrolling:touch; touch-action:pan-y; overscroll-behavior-y:contain; padding:18px 22px 90px 22px; position:relative;">
                        <div id="preview-html-content" style="max-width:100%; min-height:0;"></div>
                        <!-- Sticky floating return button inside preview container so user is never trapped -->
                        <div style="position:sticky; bottom:16px; display:flex; justify-content:flex-end; pointer-events:none; margin-top:24px;">
                            <button type="button" onclick="window.exitEpubEditorPreview ? window.exitEpubEditorPreview() : null"
                                    class="tl-btn accent shadow-xl"
                                    style="pointer-events:auto; font-weight:700; font-size:12px; padding:8px 18px; border-radius:9999px; box-shadow:0 8px 24px rgba(0,0,0,0.7); display:inline-flex; align-items:center; gap:6px;">
                                ← Back to Editor
                            </button>
                        </div>
                    </div>
                </div>

                <!-- In-Chapter Illustration Gallery Tray -->
                <div id="edit-ch-modal-img-tray" class="px-4 py-2.5 flex items-center gap-3 overflow-x-auto custom-scrollbar shrink-0"
                     style="border-top:1px solid var(--hairline); background:var(--ember-2); min-height:48px;">
                    <span class="text-[11px] font-bold shrink-0" style="color:var(--slate);">Chapter Images:</span>
                    <div id="edit-ch-modal-img-items" class="flex items-center gap-2">
                        <!-- Populated with in-chapter image thumbnails -->
                    </div>
                </div>

                <!-- Modal Footer -->
                <div class="p-3 sm:p-4 flex items-center justify-between gap-3 shrink-0" style="border-top:1px solid var(--hairline); background:var(--ember-2);">
                    <div class="flex gap-2">
                        <button type="button" id="btn-edit-modal-prev-ch" class="tl-btn" style="padding:6px 12px; font-size:12px;">← Previous Chapter</button>
                        <button type="button" id="btn-edit-modal-next-ch" class="tl-btn" style="padding:6px 12px; font-size:12px;">Next Chapter →</button>
                    </div>
                    <div class="flex gap-2">
                        <button type="button" onclick="window.requestCloseChapterModal ? window.requestCloseChapterModal() : document.getElementById('edit-chapter-modal').classList.add('hidden')" class="tl-btn">Close</button>
                        <button type="button" id="btn-edit-modal-save" class="tl-btn accent">✓ Save Chapter</button>
                    </div>
                </div>
            </div>
        </div>

        <!-- ═══ MODAL 1.5: UNSAVED CHANGES CONFIRMATION DIALOG ═══ -->
        <div id="edit-unsaved-confirm-modal" class="hidden fixed inset-0 z-[60] flex items-center justify-center p-4"
             style="background:rgba(0,0,0,.75); backdrop-filter:blur(6px);"
             onclick="if(event.target===this) document.getElementById('edit-unsaved-confirm-modal').classList.add('hidden');">
            <div class="rounded-2xl shadow-2xl p-6 max-w-sm w-full text-center"
                 style="background:var(--ember); border:1px solid var(--hairline);"
                 onclick="event.stopPropagation();">
                <div class="w-12 h-12 rounded-full mx-auto mb-3 flex items-center justify-center text-2xl"
                     style="background:rgba(245,158,11,0.15); color:#f59e0b;">⚠️</div>
                <h4 class="text-base font-bold mb-1" style="color:var(--paper);">Unsaved Prose Changes</h4>
                <p class="text-xs mb-5 leading-relaxed" style="color:var(--slate);">You have modified chapter prose or title. Save your edits before closing?</p>
                <div class="flex flex-col gap-2.5">
                    <button type="button" id="btn-unsaved-save-close" class="tl-btn accent w-full justify-center" style="padding:10px; font-weight:600;">✓ Save & Close</button>
                    <button type="button" id="btn-unsaved-discard" class="tl-btn danger w-full justify-center" style="padding:10px; color:#f87171; border-color:rgba(239,68,68,0.4);">🗑️ Discard Changes</button>
                    <button type="button" id="btn-unsaved-cancel" class="tl-btn w-full justify-center" style="padding:8px; font-size:12px;">Keep Editing</button>
                </div>
            </div>
        </div>

        <!-- ═══ MODAL 2: BOOK-WIDE ILLUSTRATION GALLERY (FULLSCREEN) ═══ -->
        <div id="edit-gallery-modal" class="hidden fixed inset-0 z-[9999]" style="position:fixed; inset:0; z-index:9999; background:#0c0e17 !important; display:none; flex-direction:column; width:100%; height:100%; overflow:hidden;">
            <!-- Header Bar -->
            <div class="flex items-center justify-between px-4 sm:px-6 py-3.5 border-b border-slate-800 bg-[#0d0f17] shrink-0">
                <div class="flex items-center gap-3">
                    <span class="text-xl">🖼️</span>
                    <div>
                        <div class="flex items-center gap-2">
                            <h3 class="font-bold text-sm sm:text-base text-white">Book Illustration & Cover Gallery</h3>
                            <span id="edit-gallery-total" class="text-xs px-2 py-0.5 rounded-full bg-indigo-950 text-indigo-300 border border-indigo-800 font-mono">0 images</span>
                        </div>
                        <p class="text-xs text-slate-400">View covers, chapter art, set book cover, or inspect full-size</p>
                    </div>
                </div>
                <div class="flex items-center gap-2">
                    <button type="button" id="btn-edit-gallery-upload-new" class="tl-btn text-xs" style="padding:6px 14px;">➕ Upload Image</button>
                    <button type="button" onclick="if(window.closeGalleryModal) window.closeGalleryModal(); else document.getElementById('edit-gallery-modal').style.display='none';"
                            class="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 transition-colors">✕</button>
                </div>
            </div>

            <!-- Filter Tabs & Controls -->
            <div class="flex items-center justify-between px-4 sm:px-6 py-2.5 bg-[#0e111a] border-b border-slate-800 shrink-0 flex-wrap gap-2">
                <div class="flex items-center gap-1.5" id="gallery-filter-tabs">
                    <button type="button" class="gallery-tab active px-3 py-1 rounded-lg text-xs font-semibold bg-indigo-600 text-white" data-filter="all">All Images</button>
                    <button type="button" class="gallery-tab px-3 py-1 rounded-lg text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800" data-filter="covers">Covers</button>
                    <button type="button" class="gallery-tab px-3 py-1 rounded-lg text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800" data-filter="chapters">Chapter Art</button>
                </div>
                <span class="text-xs text-slate-500 hidden sm:inline">💡 Tap any image to view in fullscreen lightbox</span>
            </div>

            <!-- Fullscreen Gallery Grid (Portrait Aspect Ratio for Full Covers) -->
            <div id="edit-gallery-grid" class="p-4 sm:p-6 overflow-y-auto custom-scrollbar flex-1 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 sm:gap-5"
                 style="touch-action:pan-y; -webkit-overflow-scrolling:touch;">
                <!-- Dynamically populated with portrait aspect-ratio image cards -->
            </div>

            <!-- Footer Bar -->
            <div class="px-4 sm:px-6 py-3 flex items-center justify-between border-t border-slate-800 bg-[#0d0f17] shrink-0">
                <span class="text-xs text-slate-400 font-mono">100% original illustrations & covers preserved</span>
                <button type="button" onclick="if(window.closeGalleryModal) window.closeGalleryModal(); else document.getElementById('edit-gallery-modal').style.display='none';" class="tl-btn accent" style="padding:7px 20px;">Done</button>
            </div>
        </div>

        <!-- ═══ MODAL 2B: FULLSCREEN IMAGE LIGHTBOX ═══ -->
        <div id="edit-gallery-lightbox" class="hidden fixed inset-0 z-[10000]"
             style="position:fixed; inset:0; z-index:10000; background:#000000 !important; display:none; flex-direction:column; align-items:center; justify-content:center; width:100%; height:100%; padding:12px;">
            <!-- Top bar -->
            <div class="w-full flex items-center justify-between py-2.5 px-3 text-white max-w-5xl shrink-0" style="background:transparent;">
                <span id="lightbox-img-name" class="font-mono text-xs sm:text-sm truncate text-slate-200 max-w-xs sm:max-w-md">image.jpg</span>
                <div class="flex items-center gap-2">
                    <button type="button" id="lightbox-set-cover-btn" class="tl-btn accent text-xs" style="padding:6px 12px;">👑 Set as Book Cover</button>
                    <button type="button" id="lightbox-download-btn" class="tl-btn text-xs" style="padding:6px 12px;">📥 Download</button>
                    <button type="button" onclick="if(window.closeGalleryLightbox) window.closeGalleryLightbox(); else document.getElementById('edit-gallery-lightbox').style.display='none';"
                            class="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-slate-400 hover:text-white bg-white/10 hover:bg-white/20 transition-colors">✕</button>
                </div>
            </div>
            <!-- Main image container -->
            <div class="flex-1 flex items-center justify-center w-full max-w-5xl overflow-hidden p-2" onclick="if(event.target===this && window.closeGalleryLightbox) window.closeGalleryLightbox();">
                <img id="lightbox-img" src="" alt="Fullscreen Illustration" class="max-w-full max-h-full object-contain rounded shadow-2xl transition-transform duration-200" />
            </div>
            <!-- Bottom caption -->
            <div class="py-2 text-center text-xs text-slate-400 font-mono shrink-0" id="lightbox-img-meta">
                Tap outside or ✕ to close
            </div>
        </div>

        <!-- ═══ MODAL 3: GLOBAL FIND & REPLACE ═══ -->
        <div id="edit-find-replace-modal" class="hidden fixed inset-0 z-50 flex items-center justify-center p-4"
             style="background:rgba(0,0,0,.7); backdrop-filter:blur(6px);"
             onclick="if(event.target===this) document.getElementById('edit-find-replace-modal').classList.add('hidden');">
            <div class="rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden" style="background:var(--ember); border:1px solid var(--hairline);">
                <div class="flex items-center justify-between p-4" style="border-bottom:1px solid var(--hairline); background:var(--ember-2);">
                    <h3 class="font-bold text-base" style="color:var(--paper);">Global Find & Replace</h3>
                    <button type="button" onclick="document.getElementById('edit-find-replace-modal').classList.add('hidden')"
                            class="w-8 h-8 flex items-center justify-center font-bold" style="color:var(--slate);">✕</button>
                </div>
                <div class="p-5 space-y-3">
                    <div>
                        <label class="cap" style="display:block; margin-bottom:4px;">Find</label>
                        <input type="text" id="edit-find-input" placeholder="Text to search…" class="tl-field" style="width:100%;">
                    </div>
                    <div>
                        <label class="cap" style="display:block; margin-bottom:4px;">Replace With</label>
                        <input type="text" id="edit-replace-input" placeholder="Replacement text…" class="tl-field" style="width:100%;">
                    </div>
                    <div class="flex items-center justify-between pt-1 flex-wrap gap-2">
                        <div style="display:flex; align-items:center; gap:14px; flex-wrap:wrap;">
                            <label class="tl-check">
                                <input type="checkbox" id="edit-find-case-sensitive"> Match Case
                            </label>
                            <label class="tl-check">
                                <input type="checkbox" id="edit-find-regex"> Regular Expression (.*)
                            </label>
                            <label class="tl-check">
                                <input type="checkbox" id="edit-find-in-titles" checked> Also in Titles
                            </label>
                        </div>
                        <span id="edit-find-matches-count" class="text-xs font-mono" style="color:var(--iris);">0 occurrences</span>
                    </div>
                </div>
                <div class="p-4 flex items-center justify-end gap-2" style="border-top:1px solid var(--hairline); background:var(--ember-2);">
                    <button type="button" onclick="document.getElementById('edit-find-replace-modal').classList.add('hidden')" class="tl-btn">Cancel</button>
                    <button type="button" id="btn-edit-do-replace" class="tl-btn accent">Replace in All Chapters</button>
                </div>
            </div>
        </div>

        <!-- ═══ MODAL 4: AUTO-NUMBERING ═══ -->
        <div id="edit-autonumber-modal" class="hidden fixed inset-0 z-50 flex items-center justify-center p-4"
             style="background:rgba(0,0,0,.7); backdrop-filter:blur(6px);"
             onclick="if(event.target===this) document.getElementById('edit-autonumber-modal').classList.add('hidden');">
            <div class="rounded-2xl shadow-2xl w-full max-w-md overflow-hidden" style="background:var(--ember); border:1px solid var(--hairline);">
                <div class="flex items-center justify-between p-4" style="border-bottom:1px solid var(--hairline); background:var(--ember-2);">
                    <h3 class="font-bold text-base" style="color:var(--paper);">Auto-Number Chapters</h3>
                    <button type="button" onclick="document.getElementById('edit-autonumber-modal').classList.add('hidden')"
                            class="w-8 h-8 flex items-center justify-center font-bold" style="color:var(--slate);">✕</button>
                </div>
                <div class="p-5 space-y-3">
                    <div>
                        <label class="cap" style="display:block; margin-bottom:4px;">Format Style</label>
                        <select id="edit-autonumber-style" class="tl-field" style="width:100%;">
                            <option value="prefix">Chapter {N} - {Original Title}</option>
                            <option value="colon">Chapter {N}: {Original Title}</option>
                            <option value="simple">Chapter {N}</option>
                            <option value="numdot">{N}. {Original Title}</option>
                            <option value="decimal">1.{N} (Sub-Chapter / Light Novel)</option>
                        </select>
                    </div>
                    <div class="grid grid-cols-2 gap-3">
                        <div>
                            <label class="cap" style="display:block; margin-bottom:4px;">Start Number</label>
                            <input type="number" id="edit-autonumber-start" value="1" min="0" class="tl-field" style="width:100%;">
                        </div>
                        <div>
                            <label class="cap" style="display:block; margin-bottom:4px;">Padding</label>
                            <select id="edit-autonumber-pad" class="tl-field" style="width:100%;">
                                <option value="1">No Padding (1, 2, 3)</option>
                                <option value="2">2 Digits (01, 02, 03)</option>
                                <option value="3">3 Digits (001, 002, 003)</option>
                            </select>
                        </div>
                    </div>
                    <div class="space-y-2 pt-1">
                        <label class="tl-check" style="display:flex; align-items:center; gap:8px;">
                            <input type="checkbox" id="edit-autonumber-respect-sub" checked>
                            <span class="text-xs text-slate-300">Respect Sub-Chapters (e.g. Level 2 chapters)</span>
                        </label>
                        <label class="tl-check" style="display:flex; align-items:center; gap:8px;">
                            <input type="checkbox" id="edit-autonumber-skip-special" checked>
                            <span class="text-xs text-slate-300">Skip Prologue, Epilogue, Side Stories & Notes</span>
                        </label>
                    </div>
                </div>
                <div class="p-4 flex items-center justify-end gap-2" style="border-top:1px solid var(--hairline); background:var(--ember-2);">
                    <button type="button" onclick="document.getElementById('edit-autonumber-modal').classList.add('hidden')" class="tl-btn">Cancel</button>
                    <button type="button" id="btn-edit-do-autonumber" class="tl-btn accent">Apply Auto-Numbering</button>
                </div>
            </div>
        </div>

        <!-- ═══ MODAL 5: LOAD FROM LIBRARY PICKER ═══ -->
        <div id="edit-library-modal" class="hidden fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5"
             style="background:rgba(0,0,0,.75); backdrop-filter:blur(8px);"
             onclick="if(event.target===this) document.getElementById('edit-library-modal').classList.add('hidden');">
            <div class="rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden"
                 style="background:var(--ember); border:1px solid var(--hairline);">
                <div class="flex items-center justify-between p-4" style="border-bottom:1px solid var(--hairline); background:var(--ember-2);">
                    <div class="flex items-center gap-2">
                        <span class="text-lg">📚</span>
                        <h3 class="font-bold text-base" style="color:var(--paper);">Choose Book from Saved Library</h3>
                    </div>
                    <button type="button" onclick="document.getElementById('edit-library-modal').classList.add('hidden')"
                            class="w-8 h-8 rounded-lg flex items-center justify-center font-bold" style="color:var(--slate);">✕</button>
                </div>
                <div class="p-4" style="border-bottom:1px solid var(--hairline);">
                    <input type="text" id="edit-lib-search" placeholder="Search library by title or author…" class="tl-field" style="width:100%; margin:0;">
                </div>
                <div id="edit-library-items" class="p-4 overflow-y-auto custom-scrollbar flex-1 space-y-2" style="max-height:55vh;">
                    <!-- Populated dynamically -->
                </div>
            </div>
        </div>

        <!-- ═══ MODAL 6: MOVE & HIERARCHY SHEET (MOBILE-FIRST) ═══ -->
        <div id="edit-move-chapter-modal" class="hidden fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
             style="background:rgba(0,0,0,.75); backdrop-filter:blur(6px);"
             onclick="if(event.target===this) document.getElementById('edit-move-chapter-modal').classList.add('hidden');">
            <div class="rounded-t-2xl sm:rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
                 style="background:var(--ember); border:1px solid var(--hairline); max-height:85vh;">
                <div class="flex items-center justify-between p-4" style="border-bottom:1px solid var(--hairline); background:var(--ember-2);">
                    <div class="flex items-center gap-2">
                        <span class="text-lg">↕</span>
                        <div>
                            <h3 id="edit-move-modal-title" class="font-bold text-sm" style="color:var(--paper);">Organize & Move Chapter</h3>
                            <p id="edit-move-modal-subtitle" class="text-xs truncate" style="color:var(--slate); max-width:280px;">Chapter</p>
                        </div>
                    </div>
                    <button type="button" onclick="document.getElementById('edit-move-chapter-modal').classList.add('hidden')"
                            class="w-8 h-8 flex items-center justify-center font-bold" style="color:var(--slate);">✕</button>
                </div>
                <div class="p-4 space-y-3.5">
                    <div>
                        <div style="font-size:11px; font-weight:700; color:var(--slate); text-transform:uppercase; letter-spacing:0.06em; margin-bottom:6px;">Order in Book</div>
                        <div class="grid grid-cols-2 gap-2">
                            <button type="button" id="btn-move-sheet-up" class="tl-btn" style="padding:10px 8px; justify-content:center; font-weight:600;">↑ Move Up</button>
                            <button type="button" id="btn-move-sheet-down" class="tl-btn" style="padding:10px 8px; justify-content:center; font-weight:600;">↓ Move Down</button>
                            <button type="button" id="btn-move-sheet-top" class="tl-btn" style="padding:10px 8px; justify-content:center; font-weight:600;">⤒ Move to Top</button>
                            <button type="button" id="btn-move-sheet-bottom" class="tl-btn" style="padding:10px 8px; justify-content:center; font-weight:600;">⤓ Move to Bottom</button>
                        </div>
                    </div>
                    <div>
                        <div style="font-size:11px; font-weight:700; color:var(--slate); text-transform:uppercase; letter-spacing:0.06em; margin-bottom:6px;">TOC Hierarchy</div>
                        <div class="grid grid-cols-2 gap-2">
                            <button type="button" id="btn-move-sheet-level1" class="tl-btn" style="padding:10px 8px; justify-content:center; font-weight:600;">↰ Normal Chapter</button>
                            <button type="button" id="btn-move-sheet-level2" class="tl-btn" style="padding:10px 8px; justify-content:center; font-weight:600;">↳ Nested Sub-Chapter</button>
                        </div>
                    </div>
                    <div>
                        <div style="font-size:11px; font-weight:700; color:var(--slate); text-transform:uppercase; letter-spacing:0.06em; margin-bottom:6px;">In-Place Chapter Insertion</div>
                        <div class="grid grid-cols-2 gap-2">
                            <button type="button" id="btn-move-sheet-insert-above" class="tl-btn accent" style="padding:10px 8px; justify-content:center; font-weight:600;">➕ Insert Above</button>
                            <button type="button" id="btn-move-sheet-insert-below" class="tl-btn accent" style="padding:10px 8px; justify-content:center; font-weight:600;">➕ Insert Below</button>
                        </div>
                    </div>
                </div>
                <div class="p-3 flex justify-end" style="border-top:1px solid var(--hairline); background:var(--ember-2);">
                    <button type="button" onclick="document.getElementById('edit-move-chapter-modal').classList.add('hidden')" class="tl-btn w-full justify-center" style="padding:10px; font-weight:700;">Done</button>
                </div>
            </div>
        </div>

        <!-- ═══ MODAL 7: RENAME CHAPTER MODAL (MOBILE-FIRST) ═══ -->
        <div id="edit-rename-modal" class="hidden fixed inset-0 z-50 flex items-center justify-center p-4"
             style="background:rgba(0,0,0,.75); backdrop-filter:blur(6px);"
             onclick="if(event.target===this) document.getElementById('edit-rename-modal').classList.add('hidden');">
            <div class="rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden"
                 style="background:var(--ember); border:1px solid var(--hairline);">
                <div class="flex items-center justify-between p-4" style="border-bottom:1px solid var(--hairline); background:var(--ember-2);">
                    <h3 class="font-bold text-sm" style="color:var(--paper);">Rename Chapter</h3>
                    <button type="button" onclick="document.getElementById('edit-rename-modal').classList.add('hidden')"
                            class="w-8 h-8 flex items-center justify-center font-bold" style="color:var(--slate);">✕</button>
                </div>
                <div class="p-4">
                    <label class="cap" style="display:block; margin-bottom:6px;">Chapter Title</label>
                    <input type="text" id="edit-rename-input" class="tl-field" style="width:100%; font-size:14px; padding:10px 12px; margin-bottom:14px;">
                    <div class="flex gap-2 justify-end">
                        <button type="button" onclick="document.getElementById('edit-rename-modal').classList.add('hidden')" class="tl-btn">Cancel</button>
                        <button type="button" id="btn-edit-rename-save" class="tl-btn accent" style="padding:8px 16px; font-weight:700;">Save Title</button>
                    </div>
                </div>
            </div>
        </div>

        <!-- ═══ MODAL 8: SANITIZE TITLES VISUAL PREVIEW MODAL ═══ -->
        <div id="edit-sanitize-preview-modal" class="hidden fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5"
             style="background:rgba(0,0,0,.75); backdrop-filter:blur(8px);"
             onclick="if(event.target===this) document.getElementById('edit-sanitize-preview-modal').classList.add('hidden');">
            <div class="rounded-2xl shadow-2xl w-full max-w-xl flex flex-col overflow-hidden"
                 style="background:var(--ember); border:1px solid var(--hairline); max-height:85vh;">
                <!-- Header -->
                <div class="flex items-center justify-between p-4 shrink-0" style="border-bottom:1px solid var(--hairline); background:var(--ember-2);">
                    <div class="flex items-center gap-2.5">
                        <span class="text-xl">🧹</span>
                        <div>
                            <h3 class="font-bold text-base" style="color:var(--paper);">Sanitize Chapter Titles</h3>
                            <p id="sanitize-preview-subtitle" class="text-xs" style="color:var(--slate);">Review proposed title cleanups</p>
                        </div>
                    </div>
                    <button type="button" onclick="document.getElementById('edit-sanitize-preview-modal').classList.add('hidden')"
                            class="w-8 h-8 rounded-lg flex items-center justify-center font-bold" style="color:var(--slate);">✕</button>
                </div>

                <!-- Diff Content List -->
                <div id="sanitize-preview-list" class="p-4 overflow-y-auto custom-scrollbar flex-1 space-y-2.5" style="max-height:55vh;">
                    <!-- Populated dynamically with diffs -->
                </div>

                <!-- Footer -->
                <div class="p-3.5 sm:p-4 flex items-center justify-between gap-3 shrink-0" style="border-top:1px solid var(--hairline); background:var(--ember-2);">
                    <button type="button" onclick="document.getElementById('edit-sanitize-preview-modal').classList.add('hidden')" class="tl-btn">Cancel</button>
                    <button type="button" id="btn-sanitize-apply-confirm" class="tl-btn accent font-bold" style="padding:8px 18px;">✓ Apply Clean Titles</button>
                </div>
            </div>
        </div>

        <!-- ═══ MODAL 9: AUTO-HIERARCHY VISUAL ASSISTANT MODAL ═══ -->
        <div id="edit-hierarchy-modal" class="hidden fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5"
             style="background:rgba(0,0,0,.75); backdrop-filter:blur(8px);"
             onclick="if(event.target===this) document.getElementById('edit-hierarchy-modal').classList.add('hidden');">
            <div class="rounded-2xl shadow-2xl w-full max-w-xl flex flex-col overflow-hidden"
                 style="background:var(--ember); border:1px solid var(--hairline); max-height:85vh;">
                <!-- Header -->
                <div class="flex items-center justify-between p-4 shrink-0" style="border-bottom:1px solid var(--hairline); background:var(--ember-2);">
                    <div class="flex items-center gap-2.5">
                        <span class="text-xl">🪄</span>
                        <div>
                            <h3 class="font-bold text-base" style="color:var(--paper);">Auto-Hierarchy Assistant</h3>
                            <p id="hierarchy-modal-subtitle" class="text-xs" style="color:var(--slate);">Organize book into collapsible volumes and sub-chapters</p>
                        </div>
                    </div>
                    <button type="button" onclick="document.getElementById('edit-hierarchy-modal').classList.add('hidden')"
                            class="w-8 h-8 rounded-lg flex items-center justify-center font-bold" style="color:var(--slate);">✕</button>
                </div>

                <!-- Detection Summary Banner -->
                <div id="hierarchy-modal-banner" class="px-4 py-3 flex items-center justify-between text-xs"
                     style="background:rgba(99,102,241,0.12); border-bottom:1px solid rgba(99,102,241,0.25); color:#c7d2fe;">
                    <!-- Populated dynamically -->
                </div>

                <!-- Tree Preview -->
                <div id="hierarchy-modal-tree" class="p-4 overflow-y-auto custom-scrollbar flex-1 space-y-1.5 font-mono text-xs" style="max-height:50vh;">
                    <!-- Populated dynamically -->
                </div>

                <!-- Footer -->
                <div class="p-3.5 sm:p-4 flex items-center justify-between gap-2 shrink-0 flex-wrap" style="border-top:1px solid var(--hairline); background:var(--ember-2);">
                    <button type="button" id="btn-hierarchy-flatten-all" class="tl-btn text-xs" style="color:var(--slate);" title="Reset all chapters to Level 1 flat main chapters">Flatten All (Level 1)</button>
                    <div class="flex items-center gap-2">
                        <button type="button" onclick="document.getElementById('edit-hierarchy-modal').classList.add('hidden')" class="tl-btn">Cancel</button>
                        <button type="button" id="btn-hierarchy-apply-confirm" class="tl-btn accent font-bold" style="padding:8px 18px;">✓ Apply Hierarchy</button>
                    </div>
                </div>
            </div>
        </div>

        <!-- ═══ MODAL 10: FULL TABLE OF CONTENTS MANAGER MODAL ═══ -->
        <div id="edit-toc-manager-modal" class="hidden fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5"
             style="background:rgba(0,0,0,.75); backdrop-filter:blur(8px);"
             onclick="if(event.target===this) document.getElementById('edit-toc-manager-modal').classList.add('hidden');">
            <div class="rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col overflow-hidden"
                 style="background:var(--ember); border:1px solid var(--hairline); height:88vh; height:88dvh; max-height:88dvh;">
                <!-- Header -->
                <div class="flex items-center justify-between p-4 shrink-0" style="border-bottom:1px solid var(--hairline); background:var(--ember-2);">
                    <div class="flex items-center gap-2.5">
                        <span class="text-xl">📑</span>
                        <div>
                            <h3 class="font-bold text-base" style="color:var(--paper);">Table of Contents Editor</h3>
                            <p id="toc-manager-subtitle" class="text-xs" style="color:var(--slate);">Edit chapter titles, adjust hierarchy levels, and reorder chapters</p>
                        </div>
                    </div>
                    <button type="button" onclick="document.getElementById('edit-toc-manager-modal').classList.add('hidden')"
                            class="w-8 h-8 rounded-lg flex items-center justify-center font-bold" style="color:var(--slate);">✕</button>
                </div>

                <!-- Subtoolbar / Filter & Quick Actions -->
                <div class="px-4 py-2.5 flex items-center justify-between gap-2 shrink-0 flex-wrap"
                     style="background:rgba(0,0,0,0.15); border-bottom:1px solid var(--hairline);">
                    <input type="text" id="toc-manager-search" placeholder="Search chapters in TOC…" class="tl-field"
                           style="width:200px; padding:5px 9px; font-size:12px; margin:0;">
                    <div class="flex items-center gap-1.5 flex-wrap">
                        <button type="button" id="btn-toc-manager-paste-titles" class="tl-btn text-xs" style="padding:4px 9px;" title="Paste a list of titles from clipboard">📋 Paste Titles</button>
                        <button type="button" id="btn-toc-manager-autonumber" class="tl-btn text-xs" style="padding:4px 9px;" title="Renumber chapters sequentially">🔢 Renumber</button>
                        <button type="button" id="btn-toc-manager-flatten-all" class="tl-btn text-xs" style="padding:4px 9px; color:var(--paper-dim);" title="Reset all chapters in TOC to normal flat chapters">📑 Flatten All</button>
                    </div>
                </div>

                <!-- Scrollable TOC List -->
                <div id="toc-manager-rows" class="p-3 sm:p-4 overflow-y-auto custom-scrollbar flex-1 space-y-2" style="min-height:0;">
                    <!-- Dynamically populated rows with text inputs -->
                </div>

                <!-- Footer -->
                <div class="p-3.5 sm:p-4 flex items-center justify-between gap-3 shrink-0" style="border-top:1px solid var(--hairline); background:var(--ember-2);">
                    <button type="button" onclick="document.getElementById('edit-toc-manager-modal').classList.add('hidden')" class="tl-btn">Cancel</button>
                    <button type="button" id="btn-toc-manager-save-all" class="tl-btn accent font-bold" style="padding:8px 20px;">✓ Save TOC Changes</button>
                </div>
            </div>
        </div>
    </div>
    `;

    // ── Universal XML & Zip Resolution Helpers ──
    function getXmlElements(doc, tagName) {
        if (!doc) return [];
        let list = [];
        if (typeof doc.getElementsByTagNameNS === 'function') {
            try { list = Array.from(doc.getElementsByTagNameNS('*', tagName)); } catch (e) {}
        }
        if (list.length === 0 && typeof doc.getElementsByTagName === 'function') {
            try { list = Array.from(doc.getElementsByTagName(tagName)); } catch (e) {}
        }
        if (list.length === 0 && typeof doc.querySelectorAll === 'function') {
            try { list = Array.from(doc.querySelectorAll(tagName)); } catch (e) {}
        }
        return list;
    }

    function getFirstXmlTag(doc, tagName) {
        const els = getXmlElements(doc, tagName);
        if (els.length > 0) return els[0];
        if (typeof doc.getElementsByTagName === 'function') {
            try {
                const dc = doc.getElementsByTagName('dc:' + tagName);
                if (dc.length > 0) return dc[0];
            } catch (e) {}
        }
        try {
            return doc.querySelector(tagName) || doc.querySelector('dc\\:' + tagName);
        } catch (e) {
            return null;
        }
    }

    function findZipEntry(zip, rawPath, opfDir = '') {
        if (!rawPath || !zip) return null;
        const cleanRaw = String(rawPath).split('#')[0].split('?')[0].trim();
        if (!cleanRaw) return null;

        const normalizePath = (p) => {
            const parts = p.replace(/\\/g, '/').split('/');
            const stack = [];
            for (const part of parts) {
                if (part === '.' || part === '') continue;
                if (part === '..') {
                    if (stack.length > 0) stack.pop();
                } else {
                    stack.push(part);
                }
            }
            return stack.join('/');
        };

        const candidates = new Set();
        const addCandidates = (p) => {
            if (!p) return;
            candidates.add(p);
            candidates.add(p.replace(/^\.\//, ''));
            candidates.add(p.replace(/^\//, ''));
            const norm = normalizePath(p);
            candidates.add(norm);
            try {
                const dec = decodeURIComponent(p);
                candidates.add(dec);
                candidates.add(dec.replace(/^\.\//, ''));
                candidates.add(dec.replace(/^\//, ''));
                candidates.add(normalizePath(dec));
            } catch (e) {}
        };

        addCandidates(cleanRaw);
        if (opfDir) {
            addCandidates(opfDir + cleanRaw);
            addCandidates(normalizePath(opfDir + cleanRaw));
            if (cleanRaw.startsWith('../')) {
                addCandidates(cleanRaw.replace(/^\.\.\//, ''));
            }
        }

        // 1. Direct candidate matches
        for (const c of candidates) {
            if (c && zip.file(c)) return zip.file(c);
        }

        // 2. Case-insensitive key matching across zip entries
        const zipKeys = Object.keys(zip.files || {});
        for (const c of candidates) {
            if (!c) continue;
            const lower = c.toLowerCase();
            const foundKey = zipKeys.find(k => k.toLowerCase() === lower);
            if (foundKey && zip.file(foundKey)) return zip.file(foundKey);
        }

        // 3. Basename/filename fallback (e.g. "ch01.xhtml")
        const baseName = cleanRaw.split('/').pop().toLowerCase();
        if (baseName) {
            const foundKey = zipKeys.find(k => {
                const kBase = k.split('/').pop().toLowerCase();
                return kBase === baseName && !k.endsWith('/');
            });
            if (foundKey && zip.file(foundKey)) return zip.file(foundKey);
        }

        return null;
    }

    function getRelativeZipHref(fromPath, toPath) {
        if (!fromPath || !toPath) return toPath || '';
        const norm = (p) => p.replace(/\\/g, '/');
        const fromParts = norm(fromPath).split('/');
        fromParts.pop(); // remove filename
        const toParts = norm(toPath).split('/');

        let i = 0;
        while (i < fromParts.length && i < toParts.length && fromParts[i] === toParts[i]) {
            i++;
        }
        const upCount = fromParts.length - i;
        const relParts = [];
        for (let u = 0; u < upCount; u++) {
            relParts.push('..');
        }
        for (let d = i; d < toParts.length; d++) {
            relParts.push(toParts[d]);
        }
        return relParts.join('/');
    }

    // ── Parse EPUB Archive using JSZip ──
    async function parseEpubFile(file) {
        const JSZipClass = (typeof window !== 'undefined' && window.JSZip) ? window.JSZip : (typeof JSZip !== 'undefined' ? JSZip : null);
        if (!JSZipClass) {
            if (typeof window.toast === 'function') window.toast('JSZip library is required to unpack EPUBs.', 'error');
            return;
        }

        const spinner = document.getElementById('edit-loading-spinner');
        const desc = document.getElementById('edit-upload-desc');
        const progWrap = document.getElementById('edit-load-progress-wrapper');
        const progBar = document.getElementById('edit-load-progress-bar');
        const progStatus = document.getElementById('edit-load-status');
        const progPct = document.getElementById('edit-load-percent');

        const updateProgress = (text, pct) => {
            if (progWrap) progWrap.classList.remove('hidden');
            if (progStatus) progStatus.textContent = text;
            if (progPct) progPct.textContent = `${pct}%`;
            if (progBar) progBar.style.width = `${pct}%`;
        };

        if (spinner) spinner.classList.remove('hidden');
        updateProgress('Opening EPUB archive…', 10);

        try {
            const zip = await JSZipClass.loadAsync(file);
            updateProgress('Reading container manifest…', 25);

            // 1. Locate container.xml and OPF file
            const containerFile = findZipEntry(zip, 'META-INF/container.xml');
            if (!containerFile) throw new Error('Invalid EPUB: META-INF/container.xml missing');
            const containerXml = await containerFile.async('text');
            const parser = new DOMParser();
            let containerDoc;
            try {
                containerDoc = parser.parseFromString(containerXml, 'text/xml');
                if (containerDoc.querySelector('parsererror')) containerDoc = parser.parseFromString(containerXml, 'text/html');
            } catch (e) {
                containerDoc = parser.parseFromString(containerXml, 'text/html');
            }
            const rootfileEls = getXmlElements(containerDoc, 'rootfile');
            const opfPath = (rootfileEls[0]?.getAttribute('full-path') || 'OEBPS/content.opf').trim();

            const opfFile = findZipEntry(zip, opfPath);
            if (!opfFile) throw new Error(`Cannot find package document: ${opfPath}`);
            const actualOpfPath = opfFile.name;
            const opfDir = actualOpfPath.includes('/') ? actualOpfPath.substring(0, actualOpfPath.lastIndexOf('/') + 1) : '';
            const opfXml = await opfFile.async('text');
            let opfDoc;
            try {
                opfDoc = parser.parseFromString(opfXml, 'text/xml');
                if (opfDoc.querySelector('parsererror')) opfDoc = parser.parseFromString(opfXml, 'text/html');
            } catch (e) {
                opfDoc = parser.parseFromString(opfXml, 'text/html');
            }

            // Store original container references for 100% style/asset preservation
            state.originalZip = zip;
            state.originalOpfPath = actualOpfPath;
            state.originalOpfDir = opfDir;
            state.originalFileName = file.name || 'novel.epub';

            // 2. Metadata
            updateProgress('Extracting metadata & assets…', 35);
            const titleEl = getFirstXmlTag(opfDoc, 'title');
            const authorEl = getFirstXmlTag(opfDoc, 'creator');
            const langEl = getFirstXmlTag(opfDoc, 'language');
            const descEl = getFirstXmlTag(opfDoc, 'description');

            state.title = (titleEl ? titleEl.textContent : (file.name ? file.name.replace(/\.epub$/i, '') : 'Untitled')).trim();
            state.author = (authorEl ? authorEl.textContent : 'Unknown Author').trim();
            state.lang = (langEl ? langEl.textContent : 'en').trim();
            state.description = (descEl ? descEl.textContent : '').trim();
            state.series = '';
            state.imageRepository.clear();
            state.chapters = [];
            state.coverUrl = '';

            // 3. Manifest & Image repository
            const manifestItems = getXmlElements(opfDoc, 'item');
            const manifestMap = new Map();
            let coverHref = '';

            // Check meta cover
            const metaCover = opfDoc.querySelector('metadata > meta[name="cover"]');
            const metaCoverId = (metaCover ? metaCover.getAttribute('content') : '').trim();

            for (const item of manifestItems) {
                const id = (item.getAttribute('id') || '').trim();
                const href = (item.getAttribute('href') || '').trim();
                const mediaType = (item.getAttribute('media-type') || '').trim().toLowerCase();
                const properties = (item.getAttribute('properties') || '').trim();
                const entry = { id, href, mediaType, properties };
                if (id) {
                    manifestMap.set(id, entry);
                    manifestMap.set(id.toLowerCase(), entry);
                }
                if (href) {
                    manifestMap.set(href, entry);
                    manifestMap.set(href.toLowerCase(), entry);
                }

                if (properties.includes('cover-image') || id === metaCoverId || (id && id.toLowerCase() === 'cover-image')) {
                    coverHref = href;
                }

                if (mediaType.startsWith('image/')) {
                    const imgZipFile = findZipEntry(zip, href, opfDir);
                    if (imgZipFile) {
                        try {
                            const b64 = await imgZipFile.async('base64');
                            const dataUrl = `data:${mediaType};base64,${b64}`;
                            const fName = href.split('/').pop();
                            const repoObj = { dataUrl, mime: mediaType, name: fName };
                            state.imageRepository.set(href, repoObj);
                            state.imageRepository.set(imgZipFile.name, repoObj);
                            state.imageRepository.set(fName, repoObj);
                        } catch (e) {}
                    }
                }
            }

            if (coverHref) {
                const foundCover = state.imageRepository.get(coverHref) || state.imageRepository.get(coverHref.split('/').pop());
                if (foundCover) state.coverUrl = foundCover.dataUrl;
            }

            // 4. TOC hierarchy from NCX or nav.xhtml
            updateProgress('Parsing Table of Contents & Hierarchy…', 50);
            const tocMap = new Map(); // href/filename -> { title, level }
            const ncxItem = manifestItems.find(i => (i.getAttribute('media-type') || '').includes('dtbncx'));
            if (ncxItem) {
                const ncxZipFile = findZipEntry(zip, ncxItem.getAttribute('href'), opfDir);
                if (ncxZipFile) {
                    try {
                        const ncxXml = await ncxZipFile.async('text');
                        const ncxDoc = parser.parseFromString(ncxXml, 'text/xml') || parser.parseFromString(ncxXml, 'text/html');
                        const walkNavPoints = (parentEl, currentLevel) => {
                            const navPoints = Array.from(parentEl.children).filter(c => c.tagName.toLowerCase().endsWith('navpoint'));
                            navPoints.forEach(np => {
                                const contentEl = Array.from(np.children).find(c => c.tagName.toLowerCase().endsWith('content'));
                                const textEl = np.querySelector('navLabel > text') || np.getElementsByTagName('text')[0];
                                if (contentEl && textEl) {
                                    const src = (contentEl.getAttribute('src') || '').split('#')[0].trim();
                                    const label = textEl.textContent.trim();
                                    const fname = src.split('/').pop();
                                    const entry = { title: label, level: currentLevel };
                                    if (src) {
                                        tocMap.set(src, entry);
                                        tocMap.set(src.toLowerCase(), entry);
                                    }
                                    if (fname) {
                                        tocMap.set(fname, entry);
                                        tocMap.set(fname.toLowerCase(), entry);
                                    }
                                }
                                walkNavPoints(np, currentLevel + 1);
                            });
                        };
                        const navMapEl = getXmlElements(ncxDoc, 'navMap')[0];
                        if (navMapEl) walkNavPoints(navMapEl, 1);
                    } catch (e) {}
                }
            } else {
                // Support EPUB 3 nav.xhtml navigation document
                const navItem = manifestItems.find(i => {
                    const props = (i.getAttribute('properties') || '').toLowerCase();
                    const href = (i.getAttribute('href') || '').toLowerCase();
                    return props.includes('nav') || href.includes('nav.xhtml') || href.includes('toc.xhtml');
                });
                if (navItem) {
                    const navZipFile = findZipEntry(zip, navItem.getAttribute('href'), opfDir);
                    if (navZipFile) {
                        try {
                            const navXhtml = await navZipFile.async('text');
                            const navDoc = parser.parseFromString(navXhtml, 'text/html');
                            const tocNav = navDoc.querySelector('nav[epub\\:type="toc"], nav[*|type="toc"], nav#toc, nav');
                            if (tocNav) {
                                const walkList = (parentOl, level) => {
                                    const lis = Array.from(parentOl.children).filter(c => c.tagName.toLowerCase() === 'li');
                                    lis.forEach(li => {
                                        const a = Array.from(li.children).find(c => c.tagName.toLowerCase() === 'a');
                                        if (a) {
                                            const src = (a.getAttribute('href') || '').split('#')[0].trim();
                                            const label = a.textContent.trim();
                                            const fname = src.split('/').pop();
                                            const entry = { title: label, level };
                                            if (src) {
                                                tocMap.set(src, entry);
                                                tocMap.set(src.toLowerCase(), entry);
                                            }
                                            if (fname) {
                                                tocMap.set(fname, entry);
                                                tocMap.set(fname.toLowerCase(), entry);
                                            }
                                        }
                                        const subOl = Array.from(li.children).find(c => c.tagName.toLowerCase() === 'ol' || c.tagName.toLowerCase() === 'ul');
                                        if (subOl) walkList(subOl, level + 1);
                                    });
                                };
                                const rootOl = tocNav.querySelector('ol, ul');
                                if (rootOl) walkList(rootOl, 1);
                            }
                        } catch (e) {}
                    }
                }
            }

            // 5. Spine Chapters Extraction with Manifest Fallback
            updateProgress('Extracting chapter prose…', 65);
            let spineItems = getXmlElements(opfDoc, 'itemref');
            let isManifestFallback = false;

            // Fallback to HTML/XHTML manifest items if spine is empty or malformed
            if (spineItems.length === 0) {
                spineItems = manifestItems.filter(i => {
                    const mt = (i.getAttribute('media-type') || '').toLowerCase();
                    const href = (i.getAttribute('href') || '').toLowerCase();
                    const props = (i.getAttribute('properties') || '').toLowerCase();
                    if (!mt.includes('xhtml') && !mt.includes('html')) return false;
                    if (props.includes('nav') || props.includes('cover')) return false;
                    if (/(?:^|\/)(?:toc|nav|cover)(?:[-_.]|\/|$)/i.test(href)) return false;
                    return true;
                });
                isManifestFallback = true;
            }

            let chIdx = 0;

            for (const itemRef of spineItems) {
                try {
                    const idref = (itemRef.getAttribute(isManifestFallback ? 'id' : 'idref') || '').trim();
                    const item = manifestMap.get(idref) || manifestMap.get(idref.toLowerCase()) || (isManifestFallback ? { id: idref, href: itemRef.getAttribute('href') } : null);
                    if (!item || !item.href) continue;

                    const chFile = findZipEntry(zip, item.href, opfDir);
                    if (!chFile) {
                        console.warn('Could not locate chapter file in zip:', item.href, 'opfDir:', opfDir);
                        continue;
                    }

                    chIdx++;
                    const xhtml = await chFile.async('text');
                    const chDoc = parser.parseFromString(xhtml, 'text/html');

                    // Check if this is dedicated cover page
                    const isCoverPage = (item.id || '').toLowerCase() === 'cover_page' || item.href.toLowerCase().includes('cover');
                    const imgs = Array.from(chDoc.querySelectorAll('img, image'));
                    if (isCoverPage && imgs.length === 1 && (chDoc.body ? chDoc.body.textContent.trim().length < 50 : true)) {
                        if (!state.coverUrl) {
                            const src = imgs[0].getAttribute('src') || imgs[0].getAttribute('xlink:href') || '';
                            const fname = src.split('/').pop();
                            const found = state.imageRepository.get(fname) || state.imageRepository.get(src);
                            if (found) state.coverUrl = found.dataUrl;
                        }
                        continue; // Skip cover page from chapters list
                    }

                    // Chapter title
                    const fname = item.href.split('/').pop();
                    const tocEntry = tocMap.get(item.href) || tocMap.get(fname) || tocMap.get(item.href.toLowerCase()) || tocMap.get(fname.toLowerCase());
                    let rawTitle = tocEntry?.title || '';
                    if (!rawTitle) {
                        const h1 = chDoc.querySelector('h1, h2, h3, .title, .chapter-title');
                        rawTitle = h1 ? h1.textContent.trim() : (chDoc.title ? chDoc.title.trim() : `Chapter ${chIdx}`);
                    }
                    const chTitle = cleanTitle(rawTitle, chIdx);
                    const chLevel = tocEntry ? (tocEntry.level > 1 ? 2 : 1) : 1;

                    // Extract prose and format into clean markdown
                    imgs.forEach(img => {
                        const src = img.getAttribute('src') || img.getAttribute('xlink:href') || '';
                        const imgFname = src.split('/').pop();
                        const alt = img.getAttribute('alt') || 'Illustration';
                        const mdNode = chDoc.createTextNode(`\n\n![${alt}](${imgFname})\n\n`);
                        img.parentNode?.replaceChild(mdNode, img);
                    });

                    // Extract paragraphs & scene breaks
                    const blocks = chDoc.body ? Array.from(chDoc.body.querySelectorAll('p, h1, h2, h3, h4, h5, h6, blockquote, hr, div')) : [];
                    let prose = '';
                    if (blocks.length > 0) {
                        const lines = [];
                        blocks.forEach(b => {
                            const tag = b.tagName.toLowerCase();
                            if (tag === 'hr') {
                                lines.push('---');
                            } else if (tag.match(/^h[1-6]$/)) {
                                const lvl = parseInt(tag.charAt(1), 10);
                                const hText = b.textContent.trim();
                                const isTitleEcho = (typeof window !== 'undefined' && window.isTitleEcho) ? window.isTitleEcho : null;
                                const isEcho = isTitleEcho ? isTitleEcho(hText, chTitle, rawTitle) : ((hText || '').toLowerCase().replace(/[^a-z0-9]/g, '') === (chTitle || '').toLowerCase().replace(/[^a-z0-9]/g, ''));
                                if (hText && !isEcho) {
                                    lines.push(`${'#'.repeat(lvl)} ${hText}`);
                                }
                            } else if (tag === 'blockquote') {
                                lines.push(`> ${b.textContent.trim()}`);
                            } else if (tag === 'p') {
                                const pText = b.textContent.trim();
                                if (pText) lines.push(pText);
                            } else if (tag === 'div' && !b.querySelector('p, div, h1, h2, h3, h4, h5, h6, blockquote')) {
                                const divText = b.textContent.trim();
                                if (divText) lines.push(divText);
                            }
                        });
                        prose = lines.join('\n\n');
                    }
                    if (!prose.trim()) {
                        prose = (chDoc.body?.textContent || chDoc.documentElement?.textContent || '').replace(/\r?\n\s*\r?\n/g, '\n\n').trim();
                    }

                    const chImages = extractImagesFromContent(prose);
                    state.chapters.push({
                        id: 'ch_' + chIdx,
                        title: chTitle,
                        originalTitle: rawTitle || chTitle,
                        level: chLevel,
                        content: prose,
                        words: countWords(prose),
                        images: chImages,
                        originalHead: chDoc.head ? chDoc.head.innerHTML : '',
                        bodyAttrs: Array.from(chDoc.body?.attributes || []).map(a => `${a.name}="${escapeXml(a.value)}"`).join(' '),
                        originalXhtml: xhtml,
                        fullPath: chFile.name,
                        href: item.href,
                        isNew: false
                    });
                } catch (chErr) {
                    console.warn('Error parsing chapter item:', chErr);
                }
            }

            // 6. Direct Zip File Fallback: If 0 chapters found via spine/manifest, scan zip directly!
            if (state.chapters.length === 0) {
                console.warn('Spine/manifest returned 0 chapters. Falling back to direct zip file scan...');
                const allZipKeys = Object.keys(zip.files || {});
                const htmlFiles = allZipKeys.filter(k => {
                    if (zip.files[k].dir) return false;
                    const lower = k.toLowerCase();
                    if (!lower.endsWith('.xhtml') && !lower.endsWith('.html') && !lower.endsWith('.htm')) return false;
                    if (/(?:^|\/)(?:toc|nav|cover|titlepage)(?:[-_.]|\/|$)/i.test(lower)) return false;
                    return true;
                });

                htmlFiles.sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));

                for (const k of htmlFiles) {
                    try {
                        const chFile = zip.files[k];
                        if (!chFile) continue;
                        chIdx++;
                        const xhtml = await chFile.async('text');
                        const chDoc = parser.parseFromString(xhtml, 'text/html');

                        const fname = k.split('/').pop();
                        const tocEntry = tocMap.get(k) || tocMap.get(fname) || tocMap.get(k.toLowerCase()) || tocMap.get(fname.toLowerCase());
                        let rawTitle = tocEntry?.title || '';
                        if (!rawTitle) {
                            const h1 = chDoc.querySelector('h1, h2, h3, .title, .chapter-title');
                            rawTitle = h1 ? h1.textContent.trim() : (chDoc.title ? chDoc.title.trim() : `Chapter ${chIdx}`);
                        }
                        const chTitle = cleanTitle(rawTitle, chIdx);
                        const chLevel = tocEntry ? (tocEntry.level > 1 ? 2 : 1) : 1;

                        const imgs = Array.from(chDoc.querySelectorAll('img, image'));
                        imgs.forEach(img => {
                            const src = img.getAttribute('src') || img.getAttribute('xlink:href') || '';
                            const imgFname = src.split('/').pop();
                            const alt = img.getAttribute('alt') || 'Illustration';
                            const mdNode = chDoc.createTextNode(`\n\n![${alt}](${imgFname})\n\n`);
                            img.parentNode?.replaceChild(mdNode, img);
                        });

                        const blocks = chDoc.body ? Array.from(chDoc.body.querySelectorAll('p, h1, h2, h3, h4, h5, h6, blockquote, hr, div')) : [];
                        let prose = '';
                        if (blocks.length > 0) {
                            const lines = [];
                            blocks.forEach(b => {
                                const tag = b.tagName.toLowerCase();
                                if (tag === 'hr') {
                                    lines.push('---');
                                } else if (tag.match(/^h[1-6]$/)) {
                                    const lvl = parseInt(tag.charAt(1), 10);
                                    const hText = b.textContent.trim();
                                    const isTitleEcho = (typeof window !== 'undefined' && window.isTitleEcho) ? window.isTitleEcho : null;
                                    const isEcho = isTitleEcho ? isTitleEcho(hText, chTitle, rawTitle) : ((hText || '').toLowerCase().replace(/[^a-z0-9]/g, '') === (chTitle || '').toLowerCase().replace(/[^a-z0-9]/g, ''));
                                    if (hText && !isEcho) {
                                        lines.push(`${'#'.repeat(lvl)} ${hText}`);
                                    }
                                } else if (tag === 'blockquote') {
                                    lines.push(`> ${b.textContent.trim()}`);
                                } else if (tag === 'p') {
                                    const pText = b.textContent.trim();
                                    if (pText) lines.push(pText);
                                } else if (tag === 'div' && !b.querySelector('p, div, h1, h2, h3, h4, h5, h6, blockquote')) {
                                    const divText = b.textContent.trim();
                                    if (divText) lines.push(divText);
                                }
                            });
                            prose = lines.join('\n\n');
                        }
                        if (!prose.trim()) {
                            prose = (chDoc.body?.textContent || chDoc.documentElement?.textContent || '').replace(/\r?\n\s*\r?\n/g, '\n\n').trim();
                        }

                        const chImages = extractImagesFromContent(prose);
                        state.chapters.push({
                            id: 'ch_' + chIdx,
                            title: chTitle,
                            originalTitle: rawTitle || chTitle,
                            level: chLevel,
                            content: prose,
                            words: countWords(prose),
                            images: chImages,
                            originalHead: chDoc.head ? chDoc.head.innerHTML : '',
                            bodyAttrs: Array.from(chDoc.body?.attributes || []).map(a => `${a.name}="${escapeXml(a.value)}"`).join(' '),
                            originalXhtml: xhtml,
                            fullPath: k,
                            href: fname,
                            isNew: false
                        });
                    } catch (zipChErr) {
                        console.warn('Error reading fallback zip file:', k, zipChErr);
                    }
                }
            }

            updateProgress('Finished parsing book!', 100);
            renderEditorView();
            if (typeof window.toast === 'function') {
                window.toast(`Loaded "${state.title}" (${state.chapters.length} chapters, ${state.imageRepository.size} images)!`, 'success');
            }
        } catch (err) {
            console.error('EPUB parse error:', err);
            if (typeof window.toast === 'function') window.toast('Failed to parse EPUB: ' + err.message, 'error');
        } finally {
            if (spinner) spinner.classList.add('hidden');
            if (progWrap) progWrap.classList.add('hidden');
        }
    }

    // ── Load Book from Library Object (GeminiNovelDB record) ──
    async function loadBookFromRecord(record) {
        if (!record) return;
        state.novelId = record.id || '';

        // If the record has a pre-built EPUB blob, parse it to preserve original fonts, styles, and illustrations
        if (record.epubBlob) {
            await parseEpubFile(record.epubBlob);
            if (state.chapters && state.chapters.length > 0) {
                return;
            }
            console.warn('EPUB blob in record yielded 0 chapters, falling back to stored chapters array');
        }

        state.title = (record.title || 'Novel').replace(/\s*\((?:Translated|Translation)\)/gi, '').trim();
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
            const chTitle = cleanTitle(c.title || `Chapter ${idx + 1}`, idx + 1);
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

    // ── Visual Modals: Sanitize Titles & Auto-Hierarchy Assistants ──
    let pendingSanitizeDiffs = [];
    let pendingHierarchyProposedChapters = null;

    function openSanitizePreviewModal() {
        if (!state.chapters || state.chapters.length === 0) {
            if (typeof window.toast === 'function') window.toast('No chapters in the book to sanitize.', 'warning');
            return;
        }

        pendingSanitizeDiffs = [];
        state.chapters.forEach((c, idx) => {
            const cleaned = cleanTitle(c.title, idx + 1);
            if (cleaned !== c.title) {
                pendingSanitizeDiffs.push({ idx, original: c.title, cleaned });
            }
        });

        const modal = document.getElementById('edit-sanitize-preview-modal');
        const subtitle = document.getElementById('sanitize-preview-subtitle');
        const list = document.getElementById('sanitize-preview-list');
        const confirmBtn = document.getElementById('btn-sanitize-apply-confirm');
        if (!modal || !list) return;

        if (pendingSanitizeDiffs.length === 0) {
            if (subtitle) subtitle.textContent = `All ${state.chapters.length} chapter titles are already clean`;
            list.innerHTML = `
                <div class="p-6 text-center rounded-xl flex flex-col items-center justify-center gap-2" style="background:rgba(16,185,129,0.08); border:1px solid rgba(16,185,129,0.25);">
                    <span class="text-3xl">✨</span>
                    <div class="font-bold text-sm" style="color:#34d399;">All Chapter Titles Are Clean!</div>
                    <p class="text-xs max-w-sm" style="color:var(--slate);">Every title in this book is properly formatted. No scraped watermarks, website names, broken prefixes, or unformatted titles detected.</p>
                </div>
            `;
            if (confirmBtn) {
                confirmBtn.disabled = true;
                confirmBtn.style.opacity = '0.5';
                confirmBtn.style.pointerEvents = 'none';
                confirmBtn.textContent = 'Nothing to Sanitize';
            }
        } else {
            if (subtitle) subtitle.textContent = `Found ${pendingSanitizeDiffs.length} title(s) to clean out of ${state.chapters.length} chapters`;
            list.innerHTML = '';
            pendingSanitizeDiffs.forEach(d => {
                const card = document.createElement('div');
                card.className = 'p-3 rounded-xl border flex flex-col gap-1.5';
                card.style.background = 'var(--ember-2)';
                card.style.borderColor = 'var(--hairline)';
                card.innerHTML = `
                    <div class="flex items-center justify-between text-xs">
                        <span class="font-bold font-mono px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-400">#${d.idx + 1}</span>
                        <span class="text-[11px]" style="color:var(--slate);">Title cleanup</span>
                    </div>
                    <div class="text-xs line-through text-red-400/80 break-words font-mono">${escapeXml(d.original)}</div>
                    <div class="text-xs font-semibold text-emerald-400 break-words font-mono flex items-center gap-1.5">
                        <span class="text-emerald-500 font-bold">➔</span> ${escapeXml(d.cleaned)}
                    </div>
                `;
                list.appendChild(card);
            });
            if (confirmBtn) {
                confirmBtn.disabled = false;
                confirmBtn.style.opacity = '1';
                confirmBtn.style.pointerEvents = 'auto';
                confirmBtn.textContent = `✓ Apply ${pendingSanitizeDiffs.length} Clean Title(s)`;
            }
        }

        modal.classList.remove('hidden');
    }

    function openHierarchyModal() {
        if (!state.chapters || state.chapters.length === 0) {
            if (typeof window.toast === 'function') window.toast('No chapters in the book.', 'warning');
            return;
        }

        const modal = document.getElementById('edit-hierarchy-modal');
        const banner = document.getElementById('hierarchy-modal-banner');
        const tree = document.getElementById('hierarchy-modal-tree');
        const subtitle = document.getElementById('hierarchy-modal-subtitle');
        const confirmBtn = document.getElementById('btn-hierarchy-apply-confirm');
        if (!modal || !tree) return;

        const volStandaloneRegex = /^(?:\[\s*)?(Volume|Vol\.?|Book|Arc|Part|Act|Season|Saga|Section|Episode|卷|部|篇)\s*(?:\d+|[IVXLCDM]+|[一二三四五六七八九十百]+)?[\s,;:–—-]*(.*)$/i;
        const hasChapterWord = /(?:chapter|\bch\b\.?\s*\d+|\bep\b\.?\s*\d+)/i;
        const decimalPattern = /(?:^|\s)(?:Chapter|\bCh\b\.?)?\s*(\d+)\.(\d+)\b/i;
        const embeddedVolPattern = /^(?:\[\s*)?(Volume|Vol\.?|Book|Arc|Part|Act|Season)\s*(\d+|[IVXLCDM]+)[\s,;:–—-]*(?:Chapter|\bCh\b\.?)\s*(\d+(?:\.\d+)?)/i;

        // 1. Check if book has standalone volume / arc / part headers
        let standaloneVolIndices = [];
        state.chapters.forEach((ch, idx) => {
            const t = (ch.title || '').trim();
            if (volStandaloneRegex.test(t) && !hasChapterWord.test(t)) {
                standaloneVolIndices.push(idx);
            }
        });

        // 2. Check if chapters have decimal sub-chapters
        let decimalCount = 0;
        state.chapters.forEach(ch => {
            if (decimalPattern.test(ch.title || '')) {
                decimalCount++;
            }
        });

        // 3. Check for embedded volume prefixes
        const volumeGroups = new Map();
        state.chapters.forEach(ch => {
            const m = (ch.title || '').trim().match(embeddedVolPattern);
            if (m) {
                const volKind = m[1].replace(/\.$/, '');
                const normKind = volKind.charAt(0).toUpperCase() + volKind.slice(1).toLowerCase();
                const volKey = `${normKind} ${m[2]}`;
                if (!volumeGroups.has(volKey)) volumeGroups.set(volKey, []);
                volumeGroups.get(volKey).push(ch);
            }
        });

        let detectedMode = 'none';
        let proposedChapters = [];
        let bannerHtml = '';

        if (standaloneVolIndices.length > 0) {
            detectedMode = 'standalone';
            let volumeCount = 0;
            let chapterCount = 0;
            let inVolume = false;

            proposedChapters = state.chapters.map(origCh => {
                const ch = { ...origCh };
                const t = (ch.title || '').trim();
                const isVolHeader = volStandaloneRegex.test(t) && !hasChapterWord.test(t);

                if (isVolHeader) {
                    ch.level = 1;
                    volumeCount++;
                    inVolume = true;
                } else if (inVolume) {
                    ch.level = 2;
                    chapterCount++;
                } else {
                    ch.level = 1;
                }
                return ch;
            });
            if (proposedChapters.length > 0) proposedChapters[0].level = 1;

            bannerHtml = `
                <div class="flex items-center gap-2">
                    <span class="font-bold text-emerald-400">✨ Pattern Detected:</span>
                    <span>Found <strong>${volumeCount}</strong> standalone volume headers and <strong>${chapterCount}</strong> sub-chapters</span>
                </div>
                <span class="px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-500/20 text-emerald-300">Collapsible Sections</span>
            `;
            if (subtitle) subtitle.textContent = `Auto-grouping into ${volumeCount} volumes`;
        } else if (volumeGroups.size >= 1) {
            detectedMode = 'embedded';
            let currentVolKey = null;
            let insertedVols = 0;
            let subCount = 0;

            state.chapters.forEach(origCh => {
                const ch = { ...origCh };
                const m = (ch.title || '').trim().match(embeddedVolPattern);
                if (m) {
                    const volKind = m[1].replace(/\.$/, '');
                    const normKind = volKind.charAt(0).toUpperCase() + volKind.slice(1).toLowerCase();
                    const volKey = `${normKind} ${m[2]}`;

                    if (volKey !== currentVolKey) {
                        currentVolKey = volKey;
                        insertedVols++;
                        proposedChapters.push({
                            id: 'ch_vol_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
                            title: volKey,
                            level: 1,
                            content: '',
                            words: 0,
                            isNew: true
                        });
                    }
                    ch.level = 2;
                    subCount++;
                    proposedChapters.push(ch);
                } else {
                    ch.level = 1;
                    proposedChapters.push(ch);
                }
            });

            bannerHtml = `
                <div class="flex items-center gap-2">
                    <span class="font-bold text-indigo-400">✨ Pattern Detected:</span>
                    <span>Found <strong>${volumeGroups.size}</strong> volume prefixes (${subCount} chapters)</span>
                </div>
                <span class="px-2 py-0.5 rounded text-[11px] font-semibold bg-indigo-500/20 text-indigo-300">Creates Volume Dividers</span>
            `;
            if (subtitle) subtitle.textContent = `Adding ${insertedVols} volume headers to organize TOC`;
        } else if (decimalCount > 0) {
            detectedMode = 'decimal';
            let mainCount = 0;
            let subCount = 0;

            proposedChapters = state.chapters.map(origCh => {
                const ch = { ...origCh };
                if (decimalPattern.test(ch.title || '')) {
                    ch.level = 2;
                    subCount++;
                } else {
                    ch.level = 1;
                    mainCount++;
                }
                return ch;
            });
            if (proposedChapters.length > 0) proposedChapters[0].level = 1;

            bannerHtml = `
                <div class="flex items-center gap-2">
                    <span class="font-bold text-amber-400">✨ Pattern Detected:</span>
                    <span>Found <strong>${decimalCount}</strong> decimal sub-chapters (e.g. 1.1, 1.2)</span>
                </div>
                <span class="px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-500/20 text-amber-300">Nested Sub-Chapters</span>
            `;
            if (subtitle) subtitle.textContent = `Nest ${subCount} sub-chapters under ${mainCount} main chapters`;
        } else {
            detectedMode = 'none';
            proposedChapters = state.chapters.map(ch => ({ ...ch }));
            const currentSubs = proposedChapters.filter(c => c.level === 2).length;
            bannerHtml = `
                <div class="flex items-center gap-2">
                    <span class="font-bold text-blue-400">ℹ️ Current Hierarchy:</span>
                    <span>No volume patterns detected. Showing current layout (${currentSubs} sub-chapters).</span>
                </div>
                <span class="px-2 py-0.5 rounded text-[11px] font-semibold bg-blue-500/20 text-blue-300">Manual / Flat</span>
            `;
            if (subtitle) subtitle.textContent = `Use "Nest Under" on individual chapters or "Flatten All" below`;
        }

        pendingHierarchyProposedChapters = proposedChapters;
        if (banner) banner.innerHTML = bannerHtml;

        // Render visual tree preview
        tree.innerHTML = '';
        const maxPreview = 120;
        const chaptersToDisplay = proposedChapters.slice(0, maxPreview);

        chaptersToDisplay.forEach((ch) => {
            const item = document.createElement('div');
            item.className = 'py-1 px-2 rounded flex items-center gap-2 transition-colors';
            if (ch.level === 2) {
                item.style.paddingLeft = '24px';
                item.style.background = 'rgba(99,102,241,0.06)';
                item.innerHTML = `
                    <span class="text-indigo-400 font-bold">↳</span>
                    <span class="text-[11px] font-semibold text-indigo-300 truncate flex-1">${escapeXml(ch.title || 'Untitled')}</span>
                    <span class="text-[10px] px-1.5 py-0.2 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">Sub</span>
                `;
            } else {
                item.style.background = ch.isNew ? 'rgba(56,189,248,0.12)' : 'rgba(255,255,255,0.03)';
                item.style.fontWeight = '700';
                item.innerHTML = `
                    <span class="text-sky-400">📁</span>
                    <span class="text-xs text-slate-100 truncate flex-1">${escapeXml(ch.title || 'Untitled')}</span>
                    <span class="text-[10px] px-1.5 py-0.2 rounded bg-sky-500/10 text-sky-400 border border-sky-500/20">${ch.isNew ? 'New Volume Header' : 'Main'}</span>
                `;
            }
            tree.appendChild(item);
        });

        if (proposedChapters.length > maxPreview) {
            const moreItem = document.createElement('div');
            moreItem.className = 'text-center py-2 text-xs italic text-slate-400 border-t border-white/5 mt-2';
            moreItem.textContent = `... and ${proposedChapters.length - maxPreview} more chapters formatted identically`;
            tree.appendChild(moreItem);
        }

        if (confirmBtn) {
            if (detectedMode === 'none') {
                confirmBtn.disabled = true;
                confirmBtn.style.opacity = '0.5';
                confirmBtn.style.pointerEvents = 'none';
                confirmBtn.textContent = 'No Auto Changes';
            } else {
                confirmBtn.disabled = false;
                confirmBtn.style.opacity = '1';
                confirmBtn.style.pointerEvents = 'auto';
                confirmBtn.textContent = '✓ Apply Hierarchy';
            }
        }

        modal.classList.remove('hidden');
    }

    function autoDetectHierarchy() {
        openHierarchyModal();
    }

    // ── Table of Contents Full Manager ──
    let tocManagerTempChapters = [];

    function openTocManagerModal() {
        if (!state.chapters || state.chapters.length === 0) {
            if (typeof window.toast === 'function') window.toast('No chapters in the book to edit.', 'warning');
            return;
        }

        tocManagerTempChapters = state.chapters.map(c => ({
            id: c.id,
            title: c.title || '',
            level: c.level || 1,
            words: c.words || 0
        }));

        const modal = document.getElementById('edit-toc-manager-modal');
        const subtitle = document.getElementById('toc-manager-subtitle');
        if (subtitle) subtitle.textContent = `Managing ${tocManagerTempChapters.length} chapters across the book`;
        const searchInput = document.getElementById('toc-manager-search');
        if (searchInput) searchInput.value = '';

        renderTocManagerRows();
        modal?.classList.remove('hidden');
    }

    function harvestTocManagerInputs() {
        const rows = document.querySelectorAll('#toc-manager-rows > div');
        rows.forEach(r => {
            const idxStr = r.dataset.idx;
            const inp = r.querySelector('input.tl-field');
            if (inp && idxStr !== undefined) {
                const idx = parseInt(idxStr, 10);
                if (!isNaN(idx) && tocManagerTempChapters && tocManagerTempChapters[idx]) {
                    tocManagerTempChapters[idx].title = inp.value;
                }
            }
        });
    }

    function renderTocManagerRows(filterQuery = '') {
        const container = document.getElementById('toc-manager-rows');
        if (!container) return;
        container.innerHTML = '';

        const q = (filterQuery || '').toLowerCase().trim();

        if (tocManagerTempChapters.length === 0) {
            container.innerHTML = '<p class="text-xs italic text-center py-6" style="color:var(--slate);">No chapters remaining in TOC.</p>';
            return;
        }

        tocManagerTempChapters.forEach((ch, idx) => {
            if (q && !ch.title.toLowerCase().includes(q)) {
                return;
            }

            const row = document.createElement('div');
            row.dataset.idx = idx;
            row.className = 'flex items-center gap-2 p-2 rounded-xl border transition-all';
            row.style.background = ch.level === 2 ? 'rgba(99,102,241,0.05)' : 'var(--ember-2)';
            row.style.borderColor = ch.level === 2 ? 'rgba(99,102,241,0.3)' : 'var(--hairline)';
            if (ch.level === 2) {
                row.style.marginLeft = '16px';
            }

            // Index badge
            const num = document.createElement('span');
            num.className = 'text-xs font-mono font-bold shrink-0 px-2 py-1 rounded bg-white/5';
            num.style.color = ch.level === 2 ? '#818cf8' : 'var(--paper-dim)';
            num.textContent = ch.level === 2 ? `↳ #${idx + 1}` : `#${idx + 1}`;
            row.appendChild(num);

            // Title input
            const input = document.createElement('input');
            input.type = 'text';
            input.className = 'tl-field';
            input.dataset.idx = idx;
            input.value = ch.title;
            input.placeholder = `Chapter ${idx + 1} Title`;
            input.style.flex = '1';
            input.style.fontSize = '13px';
            input.style.fontWeight = '600';
            input.style.padding = '6px 10px';
            input.style.margin = '0';
            input.oninput = (e) => {
                ch.title = e.target.value;
            };
            input.onchange = (e) => {
                ch.title = e.target.value;
            };
            row.appendChild(input);

            // Level toggle button
            const lvlBtn = document.createElement('button');
            lvlBtn.type = 'button';
            lvlBtn.className = 'chip-act shrink-0 text-xs font-semibold';
            lvlBtn.style.padding = '5px 9px';
            if (ch.level === 2) {
                lvlBtn.textContent = '↰ Normal';
                lvlBtn.style.color = '#34d399';
                lvlBtn.style.borderColor = 'rgba(52,211,153,0.3)';
                lvlBtn.title = 'Switch to Normal Chapter (Level 1)';
            } else {
                if (idx === 0) {
                    lvlBtn.textContent = 'Normal';
                    lvlBtn.style.color = 'var(--slate)';
                    lvlBtn.title = 'First chapter must remain a starting chapter';
                    lvlBtn.disabled = true;
                } else {
                    lvlBtn.textContent = '↳ Sub';
                    lvlBtn.style.color = '#818cf8';
                    lvlBtn.title = `Nest as Sub-Chapter under Chapter #${idx}`;
                }
            }
            lvlBtn.onclick = () => {
                if (idx === 0 && ch.level === 1) return;
                harvestTocManagerInputs();
                ch.level = ch.level === 2 ? 1 : 2;
                renderTocManagerRows(document.getElementById('toc-manager-search')?.value || '');
            };
            row.appendChild(lvlBtn);

            // Reorder buttons (▲ / ▼)
            const reorderBox = document.createElement('div');
            reorderBox.className = 'inline-flex items-center rounded-lg border border-white/10 bg-white/5 overflow-hidden shrink-0';

            const upBtn = document.createElement('button');
            upBtn.type = 'button';
            upBtn.className = 'px-2.5 py-1 text-xs font-bold text-slate-300 hover:text-white hover:bg-white/10 disabled:opacity-20';
            upBtn.textContent = '▲';
            upBtn.title = 'Move up';
            upBtn.disabled = idx === 0;
            upBtn.onclick = () => {
                harvestTocManagerInputs();
                if (idx > 0) {
                    const temp = tocManagerTempChapters[idx];
                    tocManagerTempChapters[idx] = tocManagerTempChapters[idx - 1];
                    tocManagerTempChapters[idx - 1] = temp;
                    renderTocManagerRows(document.getElementById('toc-manager-search')?.value || '');
                }
            };
            reorderBox.appendChild(upBtn);

            const divSep = document.createElement('div');
            divSep.className = 'w-px h-3.5 bg-white/10';
            reorderBox.appendChild(divSep);

            const downBtn = document.createElement('button');
            downBtn.type = 'button';
            downBtn.className = 'px-2.5 py-1 text-xs font-bold text-slate-300 hover:text-white hover:bg-white/10 disabled:opacity-20';
            downBtn.textContent = '▼';
            downBtn.title = 'Move down';
            downBtn.disabled = idx >= tocManagerTempChapters.length - 1;
            downBtn.onclick = () => {
                harvestTocManagerInputs();
                if (idx < tocManagerTempChapters.length - 1) {
                    const temp = tocManagerTempChapters[idx];
                    tocManagerTempChapters[idx] = tocManagerTempChapters[idx + 1];
                    tocManagerTempChapters[idx + 1] = temp;
                    renderTocManagerRows(document.getElementById('toc-manager-search')?.value || '');
                }
            };
            reorderBox.appendChild(downBtn);

            row.appendChild(reorderBox);

            // Delete button
            const delBtn = document.createElement('button');
            delBtn.type = 'button';
            delBtn.className = 'chip-act shrink-0 text-xs text-rose-400 hover:text-rose-300';
            delBtn.style.padding = '5px 8px';
            delBtn.textContent = '✕';
            delBtn.title = 'Remove chapter';
            delBtn.onclick = () => {
                harvestTocManagerInputs();
                if (confirm(`Remove "${ch.title || `Chapter ${idx + 1}`}" from Table of Contents?`)) {
                    tocManagerTempChapters.splice(idx, 1);
                    renderTocManagerRows(document.getElementById('toc-manager-search')?.value || '');
                }
            };
            row.appendChild(delBtn);

            container.appendChild(row);
        });
    }

    function saveTocManagerChanges() {
        if (!tocManagerTempChapters) return;

        harvestTocManagerInputs();

        const idMap = new Map();
        state.chapters.forEach(c => idMap.set(c.id, c));

        const newChapters = [];
        let renamedCount = 0;

        tocManagerTempChapters.forEach((tempCh, newIdx) => {
            const orig = idMap.get(tempCh.id);
            if (orig) {
                const trimmedTitle = (tempCh.title || '').trim() || `Chapter ${newIdx + 1}`;
                if (orig.title !== trimmedTitle) {
                    orig.title = trimmedTitle;
                    orig.originalTitle = trimmedTitle;
                    renamedCount++;
                    if (orig.content && /^#{1,6}\s+.+$/m.test(orig.content)) {
                        orig.content = orig.content.replace(/^#{1,6}\s+.+$/m, `# ${trimmedTitle}`);
                    }
                    if (orig.originalHead) {
                        orig.originalHead = orig.originalHead.replace(/<title>.*?<\/title>/gi, `<title>${escapeXml(trimmedTitle)}</title>`);
                    }
                }
                orig.level = tempCh.level || 1;
                newChapters.push(orig);
            }
        });

        if (newChapters.length > 0) {
            newChapters[0].level = 1;
            state.chapters = newChapters;
        }

        document.getElementById('edit-toc-manager-modal')?.classList.add('hidden');
        renderChapterList();
        updateStats();

        // Auto-save changes to DB / Library
        if (state.novelId || (state.chapters && state.chapters.length > 0)) {
            saveNovelToDatabase({ silent: true }).catch(e => console.warn('Auto-save TOC error:', e));
        }

        if (typeof window.toast === 'function') {
            window.toast(`✓ Saved Table of Contents! (${renamedCount} titles updated)`, 'success');
        }
    }

    function pasteBulkTitlesToToc() {
        harvestTocManagerInputs();
        const text = prompt('Paste your list of chapter titles (one title per line):');
        if (!text) return;
        const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
        if (lines.length === 0) return;

        let applied = 0;
        lines.forEach((line, idx) => {
            if (idx < tocManagerTempChapters.length) {
                tocManagerTempChapters[idx].title = line;
                applied++;
            }
        });
        renderTocManagerRows(document.getElementById('toc-manager-search')?.value || '');
        if (typeof window.toast === 'function') {
            window.toast(`✓ Applied ${applied} titles! Click "✓ Save TOC Changes" to commit.`, 'info');
        }
    }

    function renumberTocManager() {
        harvestTocManagerInputs();
        tocManagerTempChapters.forEach((ch, idx) => {
            const clean = ch.title.replace(/^(?:Chapter|\bCh\b\.?)\s*\d+[\s:–—-]*/i, '').trim();
            ch.title = `Chapter ${idx + 1}${clean ? ' - ' + clean : ''}`;
        });
        renderTocManagerRows(document.getElementById('toc-manager-search')?.value || '');
        if (typeof window.toast === 'function') {
            window.toast('✓ Renumbered chapters! Click "✓ Save TOC Changes" to commit.', 'info');
        }
    }

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

        const paras = cleanMd.split(/\n\s*\n/);
        const bodyParts = [];

        // Always render the canonical TOC chapter title as the heading
        if (title) {
            bodyParts.push(`<h2 class="chapter-title">${escapeXml(title)}</h2>`);
        }

        paras.forEach((p, idx) => {
            let trimmed = p.trim();
            if (!trimmed) return;
            // If the first paragraph is a leading markdown heading (# Title), skip it since title is already rendered
            if (idx === 0 && /^#{1,6}\s+/.test(trimmed)) {
                return;
            }
            if (trimmed === '---' || trimmed === '***') {
                bodyParts.push('<hr />');
            } else if (/^#{1,6}\s+/.test(trimmed)) {
                const lvl = trimmed.match(/^(#{1,6})/)[1].length;
                const text = trimmed.replace(/^#+\s+/, '');
                bodyParts.push(`<h${lvl}>${escapeXml(text)}</h${lvl}>`);
            } else if (/^>\s+/.test(trimmed)) {
                bodyParts.push(`<blockquote><p>${escapeXml(trimmed.replace(/^>\s+/, ''))}</p></blockquote>`);
            } else if (/!\[(.*?)\]\((.*?)\)/.test(trimmed)) {
                const m = trimmed.match(/!\[(.*?)\]\((.*?)\)/);
                const token = m[2];
                bodyParts.push(`<div class="illustration-wrap" style="text-align:center; margin:1.5em 0;"><img src="${escapeXml(token)}" alt="${escapeXml(m[1])}" style="max-width:100%; height:auto;" /></div>`);
            } else {
                bodyParts.push(`<p>${escapeXml(trimmed)}</p>`);
            }
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

        if (ch.content && /^#{1,6}\s+.+$/m.test(ch.content)) {
            ch.content = ch.content.replace(/^#{1,6}\s+.+$/m, `# ${ch.title}`);
        }
        if (ch.originalHead) {
            ch.originalHead = ch.originalHead.replace(/<title>.*?<\/title>/gi, `<title>${escapeXml(ch.title)}</title>`);
        }

        ch.words = countWords(ch.content);
        ch.images = extractImagesFromContent(ch.content);

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

    // ── Illustration Gallery Modal Logic ──
    let activeGalleryFilter = 'all';

    async function downloadImageItem(item, fallbackName = 'illustration.jpg') {
        try {
            let blob;
            let mime = item.mime || 'image/jpeg';
            let fName = item.name || fallbackName;
            if (!/\.(jpe?g|png|webp|gif|svg)$/i.test(fName)) {
                const ext = mime.includes('png') ? '.png' : mime.includes('webp') ? '.webp' : mime.includes('gif') ? '.gif' : '.jpg';
                fName += ext;
            }

            if (item.url && item.url.startsWith('data:')) {
                const parts = item.url.split(',');
                const byteString = atob(parts[1]);
                mime = parts[0].split(':')[1].split(';')[0];
                const ab = new ArrayBuffer(byteString.length);
                const ia = new Uint8Array(ab);
                for (let i = 0; i < byteString.length; i++) {
                    ia[i] = byteString.charCodeAt(i);
                }
                blob = new Blob([ab], { type: mime });
            } else if (item.url && item.url.startsWith('blob:')) {
                const resp = await fetch(item.url);
                blob = await resp.blob();
            } else if (item.url) {
                const resp = await fetch(item.url);
                blob = await resp.blob();
            } else {
                throw new Error('Image source URL is missing');
            }

            if (typeof window.saveUniversalBlob === 'function') {
                await window.saveUniversalBlob(blob, fName, mime);
            } else {
                const a = document.createElement('a');
                const blobUrl = URL.createObjectURL(blob);
                a.href = blobUrl;
                a.download = fName;
                document.body.appendChild(a);
                a.click();
                setTimeout(() => {
                    document.body.removeChild(a);
                    URL.revokeObjectURL(blobUrl);
                }, 1000);
            }
            if (typeof window.toast === 'function') window.toast(`Downloaded ${fName}`, 'success');
        } catch (err) {
            console.error('Download image error:', err);
            if (typeof window.toast === 'function') window.toast(`Failed to download image: ${err.message}`, 'error');
        }
    }

    function closeGalleryLightbox() {
        const lightbox = document.getElementById('edit-gallery-lightbox');
        if (lightbox) {
            lightbox.style.display = 'none';
            lightbox.classList.add('hidden');
        }
        const img = document.getElementById('lightbox-img');
        if (img) img.src = '';
    }

    function closeGalleryModal() {
        const modal = document.getElementById('edit-gallery-modal');
        if (modal) {
            modal.style.display = 'none';
            modal.classList.add('hidden');
        }
        closeGalleryLightbox();
    }

    function openGalleryModal() {
        const modal = document.getElementById('edit-gallery-modal');
        const grid = document.getElementById('edit-gallery-grid');
        const totalSpan = document.getElementById('edit-gallery-total');
        if (!modal || !grid) return;

        grid.innerHTML = '';
        const allImagesMap = new Map();

        // 1. Current cover
        if (state.coverUrl) {
            allImagesMap.set(state.coverUrl, {
                url: state.coverUrl,
                name: 'Book Cover',
                mime: 'image/jpeg',
                type: 'cover'
            });
        }

        // 2. Gather images from book repository
        state.imageRepository.forEach((entry, key) => {
            const url = entry.dataUrl || key;
            if (!allImagesMap.has(url)) {
                const isCov = (entry.name || key).toLowerCase().includes('cover');
                allImagesMap.set(url, {
                    url,
                    name: entry.name || key,
                    mime: entry.mime || 'image/jpeg',
                    type: isCov ? 'cover' : 'asset'
                });
            }
        });

        // 3. Gather images embedded in chapter contents
        state.chapters.forEach((ch, chIdx) => {
            (ch.images || []).forEach(imgUrl => {
                const resolved = state.imageRepository.get(imgUrl)?.dataUrl || imgUrl;
                if (!allImagesMap.has(resolved)) {
                    allImagesMap.set(resolved, {
                        url: resolved,
                        name: `Chapter ${chIdx + 1} Illustration`,
                        mime: 'image/jpeg',
                        type: 'chapter'
                    });
                }
            });
        });

        let allItems = Array.from(allImagesMap.values());
        if (totalSpan) totalSpan.textContent = `${allItems.length} images`;

        // Wire filter tabs
        const tabBtns = document.querySelectorAll('.gallery-tab');
        tabBtns.forEach(btn => {
            btn.onclick = () => {
                tabBtns.forEach(b => {
                    b.classList.remove('active', 'bg-indigo-600', 'text-white');
                    b.classList.add('text-slate-400');
                });
                btn.classList.add('active', 'bg-indigo-600', 'text-white');
                btn.classList.remove('text-slate-400');
                activeGalleryFilter = btn.dataset.filter || 'all';
                renderGalleryGrid();
            };
        });

        const renderGalleryGrid = () => {
            grid.innerHTML = '';
            let filtered = allItems;
            if (activeGalleryFilter === 'covers') {
                filtered = allItems.filter(i => i.type === 'cover' || (state.coverUrl && state.coverUrl === i.url) || i.name.toLowerCase().includes('cover'));
            } else if (activeGalleryFilter === 'chapters') {
                filtered = allItems.filter(i => i.type === 'chapter' || (!i.name.toLowerCase().includes('cover') && (!state.coverUrl || state.coverUrl !== i.url)));
            }

            if (filtered.length === 0) {
                grid.innerHTML = `<div class="col-span-full text-center py-16 italic text-sm text-slate-400">
                    No images found in this filter. Tap "➕ Upload Image" to add illustrations to your book!
                </div>`;
                return;
            }

            filtered.forEach((item, idx) => {
                const isCover = state.coverUrl && (state.coverUrl === item.url);
                const card = document.createElement('div');
                card.className = 'flex flex-col rounded-xl overflow-hidden border border-slate-800 bg-[#0c0e15] transition-all hover:border-indigo-500/60 shadow-lg group';
                card.innerHTML = `
                    <div class="relative flex items-center justify-center bg-[#050608] cursor-pointer overflow-hidden p-2"
                         style="aspect-ratio: 2/3; min-height: 200px;" title="Tap to inspect full screen">
                        <img src="${item.url}" class="w-full h-full object-contain rounded transition-transform duration-200 group-hover:scale-105" alt="${escapeXml(item.name)}" />
                        ${isCover ? '<span class="absolute top-2 left-2 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500 text-black shadow">👑 CURRENT COVER</span>' : ''}
                        <div class="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <span class="px-2.5 py-1 rounded bg-indigo-600/90 text-white text-xs font-semibold shadow">👁️ View Fullscreen</span>
                        </div>
                    </div>
                    <div class="p-2.5 flex flex-col gap-1.5 border-t border-slate-800/80 bg-[#0f111a]">
                        <span class="text-[11px] font-mono truncate text-slate-200 font-medium" title="${escapeXml(item.name)}">${escapeXml(item.name)}</span>
                        <div class="flex items-center gap-1 pt-1 flex-wrap">
                            <button type="button" class="chip-act shrink-0 text-[10px] set-cover-btn" style="color:#fbbf24;" title="Set as Book Cover">👑 Set as Cover</button>
                            <button type="button" class="chip-act shrink-0 text-[10px] view-btn" title="View Fullscreen">👁️ View</button>
                            <button type="button" class="chip-act shrink-0 text-[10px] dl-btn" title="Download image file">📥 Save</button>
                            <button type="button" class="chip-act danger shrink-0 text-[10px] del-btn" title="Remove from book">✕</button>
                        </div>
                    </div>
                `;

                // Tap image or view button to open fullscreen lightbox
                card.querySelector('img').parentElement.onclick = () => openGalleryLightbox(item);
                card.querySelector('.view-btn').onclick = () => openGalleryLightbox(item);

                // Set as Cover
                card.querySelector('.set-cover-btn').onclick = () => {
                    state.coverUrl = item.url;
                    updateCoverPreview();
                    renderGalleryGrid();
                    if (typeof window.toast === 'function') window.toast('👑 Updated book cover!', 'success');
                };

                // Download image
                card.querySelector('.dl-btn').onclick = () => downloadImageItem(item, item.name || `illustration_${idx + 1}.jpg`);

                // Delete image
                card.querySelector('.del-btn').onclick = () => {
                    if (confirm(`Remove "${item.name}" from book?`)) {
                        allImagesMap.delete(item.url);
                        state.imageRepository.delete(item.url);
                        if (state.coverUrl === item.url) state.coverUrl = '';
                        state.chapters.forEach(c => {
                            const escaped = item.url.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                            c.content = (c.content || '')
                                .replace(new RegExp(`!\\[[^\\]]*\\]\\(${escaped}\\)`, 'g'), '')
                                .replace(new RegExp(`<img[^>]*src=["']${escaped}["'][^>]*>`, 'gi'), '');
                            c.images = extractImagesFromContent(c.content);
                        });
                        updateCoverPreview();
                        updateStats();
                        openGalleryModal();
                    }
                };

                grid.appendChild(card);
            });
        };

        renderGalleryGrid();
        modal.style.display = 'flex';
        modal.classList.remove('hidden');
    }

    // ── Fullscreen Lightbox Logic ──
    function openGalleryLightbox(item) {
        const lightbox = document.getElementById('edit-gallery-lightbox');
        const img = document.getElementById('lightbox-img');
        const nameEl = document.getElementById('lightbox-img-name');
        const metaEl = document.getElementById('lightbox-img-meta');
        const setCoverBtn = document.getElementById('lightbox-set-cover-btn');
        const dlBtn = document.getElementById('lightbox-download-btn');
        if (!lightbox || !img) return;

        img.src = item.url;
        if (nameEl) nameEl.textContent = item.name || 'Illustration';
        if (metaEl) metaEl.textContent = `${item.name || 'Illustration'} · Tap outside or ✕ to close`;

        if (setCoverBtn) {
            setCoverBtn.onclick = () => {
                state.coverUrl = item.url;
                updateCoverPreview();
                if (typeof window.toast === 'function') window.toast('👑 Set as book cover!', 'success');
            };
        }

        if (dlBtn) {
            dlBtn.onclick = () => downloadImageItem(item, item.name || 'illustration.jpg');
        }

        lightbox.style.display = 'flex';
        lightbox.classList.remove('hidden');
    }

    // ── Global Find & Replace Logic ──
    let findCountDebounceTimer = null;

    function openFindReplaceModal() {
        const modal = document.getElementById('edit-find-replace-modal');
        const findIn = document.getElementById('edit-find-input');
        const countSpan = document.getElementById('edit-find-matches-count');
        if (countSpan) {
            countSpan.textContent = '0 occurrences';
            countSpan.style.color = 'var(--iris)';
        }
        modal?.classList.remove('hidden');
        findIn?.focus();

        const updateCount = () => {
            clearTimeout(findCountDebounceTimer);
            findCountDebounceTimer = setTimeout(() => {
                const query = findIn?.value || '';
                const caseSens = document.getElementById('edit-find-case-sensitive')?.checked;
                const isRegex = document.getElementById('edit-find-regex')?.checked;
                const alsoInTitles = document.getElementById('edit-find-in-titles')?.checked;

                if (!query) {
                    if (countSpan) {
                        countSpan.textContent = '0 occurrences';
                        countSpan.style.color = 'var(--iris)';
                    }
                    return;
                }

                let regex;
                try {
                    const flags = caseSens ? 'g' : 'gi';
                    if (isRegex) {
                        regex = new RegExp(query, flags);
                    } else {
                        const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                        regex = new RegExp(escaped, flags);
                    }
                } catch (e) {
                    if (countSpan) {
                        countSpan.textContent = 'Invalid regex: ' + e.message;
                        countSpan.style.color = '#ef4444';
                    }
                    return;
                }

                let total = 0;
                state.chapters.forEach(c => {
                    const matches = (c.content || '').match(regex);
                    if (matches) total += matches.length;
                    if (alsoInTitles && c.title) {
                        const tMatches = c.title.match(regex);
                        if (tMatches) total += tMatches.length;
                    }
                });
                if (countSpan) {
                    countSpan.textContent = `${total.toLocaleString()} occurrence${total === 1 ? '' : 's'}`;
                    countSpan.style.color = total > 0 ? '#10b981' : 'var(--slate)';
                }
            }, 180);
        };

        if (findIn) findIn.oninput = updateCount;
        const caseSensEl = document.getElementById('edit-find-case-sensitive');
        if (caseSensEl) caseSensEl.onchange = updateCount;
        const regexEl = document.getElementById('edit-find-regex');
        if (regexEl) regexEl.onchange = updateCount;
        const inTitlesEl = document.getElementById('edit-find-in-titles');
        if (inTitlesEl) inTitlesEl.onchange = updateCount;
    }

    function doGlobalReplace() {
        const findIn = document.getElementById('edit-find-input');
        const replaceIn = document.getElementById('edit-replace-input');
        const query = findIn?.value || '';
        const replacement = replaceIn?.value || '';
        const caseSens = document.getElementById('edit-find-case-sensitive')?.checked;
        const isRegex = document.getElementById('edit-find-regex')?.checked;
        const alsoInTitles = document.getElementById('edit-find-in-titles')?.checked;
        const replaceBtn = document.getElementById('btn-edit-do-replace');

        if (!query) {
            if (typeof window.toast === 'function') window.toast('Enter search text first.', 'warning');
            return;
        }

        let regex;
        try {
            const flags = caseSens ? 'g' : 'gi';
            if (isRegex) {
                regex = new RegExp(query, flags);
            } else {
                const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                regex = new RegExp(escaped, flags);
            }
        } catch (e) {
            if (typeof window.toast === 'function') window.toast('Invalid regex: ' + e.message, 'error');
            return;
        }

        if (replaceBtn) {
            replaceBtn.disabled = true;
            replaceBtn.textContent = '⏳ Replacing…';
        }

        let replacedCount = 0;
        let affectedChapters = 0;
        const total = state.chapters.length;
        const chunkSize = 25;
        let currentIdx = 0;

        function processChunk() {
            const limit = Math.min(currentIdx + chunkSize, total);
            for (let i = currentIdx; i < limit; i++) {
                const c = state.chapters[i];
                if (!c) continue;
                let chapterTouched = false;

                // Replace in title if enabled
                if (alsoInTitles && c.title) {
                    const tMatches = c.title.match(regex);
                    if (tMatches && tMatches.length > 0) {
                        replacedCount += tMatches.length;
                        c.title = c.title.replace(regex, replacement);
                        chapterTouched = true;
                    }
                }

                // Replace in content
                if (c.content) {
                    const matches = c.content.match(regex);
                    if (matches && matches.length > 0) {
                        replacedCount += matches.length;
                        c.content = c.content.replace(regex, replacement);
                        c.words = countWords(c.content);
                        chapterTouched = true;
                    }
                }

                if (chapterTouched) affectedChapters++;
            }
            currentIdx = limit;

            if (currentIdx < total) {
                if (replaceBtn) {
                    replaceBtn.textContent = `⏳ Replacing… (${currentIdx}/${total})`;
                }
                setTimeout(processChunk, 10);
            } else {
                if (replaceBtn) {
                    replaceBtn.disabled = false;
                    replaceBtn.textContent = 'Replace in All Chapters';
                }
                document.getElementById('edit-find-replace-modal')?.classList.add('hidden');
                renderChapterList();
                updateStats();

                if (typeof window.toast === 'function') {
                    window.toast(`Replaced ${replacedCount.toLocaleString()} occurrences across ${affectedChapters} chapters!`, 'success');
                }
            }
        }

        processChunk();
    }

    // ── Auto-Numbering Logic ──
    function doAutoNumber() {
        const style = document.getElementById('edit-autonumber-style')?.value || 'prefix';
        const start = parseInt(document.getElementById('edit-autonumber-start')?.value, 10) || 1;
        const pad = parseInt(document.getElementById('edit-autonumber-pad')?.value, 10) || 1;
        const respectSub = document.getElementById('edit-autonumber-respect-sub')?.checked ?? true;
        const skipSpecial = document.getElementById('edit-autonumber-skip-special')?.checked ?? true;

        let mainCounter = start;
        let subCounter = 1;
        let numberedCount = 0;

        const specialPattern = /^(?:prologue|epilogue|side\s*story|author'?s?\s*note|afterword|interlude|character|illustrations?)/i;

        state.chapters.forEach((ch) => {
            // Check if special chapter
            if (skipSpecial && specialPattern.test(ch.title.trim())) {
                return;
            }

            if (respectSub && ch.level === 2) {
                const subPad = String(subCounter).padStart(pad > 1 ? pad : 1, '0');
                if (style === 'decimal') {
                    ch.title = `1.${subCounter}`;
                } else {
                    let clean = ch.title.replace(/^(?:Chapter|\bCh\b)?\s*[\d\.]+[\s:\.\-]+/i, '').trim();
                    ch.title = `${mainCounter - 1}.${subCounter} - ${clean || 'Untitled'}`;
                }
                ch.originalTitle = ch.title;
                if (ch.content && /^#{1,6}\s+.+$/m.test(ch.content)) {
                    ch.content = ch.content.replace(/^#{1,6}\s+.+$/m, `# ${ch.title}`);
                }
                if (ch.originalHead) {
                    ch.originalHead = ch.originalHead.replace(/<title>.*?<\/title>/gi, `<title>${escapeXml(ch.title)}</title>`);
                }
                subCounter++;
                numberedCount++;
                return;
            }

            // Level 1 chapter
            subCounter = 1;
            const numStr = String(mainCounter).padStart(pad, '0');

            if (style === 'simple') {
                ch.title = `Chapter ${numStr}`;
            } else if (style === 'colon') {
                let clean = ch.title.replace(/^(?:Chapter|\bCh\b)?\s*\d+[\s:\.\-]+/i, '').trim();
                ch.title = `Chapter ${numStr}: ${clean || 'Untitled'}`;
            } else if (style === 'numdot') {
                let clean = ch.title.replace(/^(?:Chapter|\bCh\b)?\s*\d+[\s:\.\-]+/i, '').trim();
                ch.title = `${numStr}. ${clean || 'Untitled'}`;
            } else if (style === 'decimal') {
                ch.title = `1.${numStr}`;
            } else {
                // prefix: Chapter {N} - {Title}
                let clean = ch.title.replace(/^(?:Chapter|\bCh\b)?\s*\d+[\s:\.\-]+/i, '').trim();
                ch.title = `Chapter ${numStr} - ${clean || 'Untitled'}`;
            }

            ch.originalTitle = ch.title;
            if (ch.content && /^#{1,6}\s+.+$/m.test(ch.content)) {
                ch.content = ch.content.replace(/^#{1,6}\s+.+$/m, `# ${ch.title}`);
            }
            if (ch.originalHead) {
                ch.originalHead = ch.originalHead.replace(/<title>.*?<\/title>/gi, `<title>${escapeXml(ch.title)}</title>`);
            }

            mainCounter++;
            numberedCount++;
        });

        document.getElementById('edit-autonumber-modal')?.classList.add('hidden');
        renderChapterList();
        updateStats();

        if (state.novelId || (state.chapters && state.chapters.length > 0)) {
            saveNovelToDatabase({ silent: true }).catch(e => console.warn('Auto-save autonumber error:', e));
        }

        if (typeof window.toast === 'function') {
            window.toast(`✓ Auto-numbered ${numberedCount} chapters!`, 'success');
        }
    }

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

        const record = {
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
            translatedChapters: chsData
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
    async function exportCleanEpub() {
        if (!state.chapters || state.chapters.length === 0) {
            if (typeof window.toast === 'function') window.toast('No chapters to export.', 'warning');
            return;
        }

        const emptyChapters = state.chapters.filter(c => !c.content || !c.content.trim());
        if (emptyChapters.length > 0) {
            const proceed = confirm(`Warning: ${emptyChapters.length} chapter(s) have no content.\n\nDo you want to continue exporting?`);
            if (!proceed) return;
        }

        // Auto-save active chapter modal if currently open
        if (!document.getElementById('edit-chapter-modal')?.classList.contains('hidden')) {
            try {
                saveCurrentModalChapter();
            } catch (e) {}
        }

        // Auto-save TOC manager modal changes if currently open
        if (!document.getElementById('edit-toc-manager-modal')?.classList.contains('hidden')) {
            try {
                saveTocManagerChanges();
            } catch (e) {}
        }

        // Sync metadata
        state.title = document.getElementById('edit-book-title')?.value.trim() || state.title || 'Novel';
        state.author = document.getElementById('edit-book-author')?.value.trim() || state.author || 'Author';
        state.lang = document.getElementById('edit-book-lang')?.value.trim() || 'en';
        state.description = document.getElementById('edit-book-desc')?.value.trim() || state.description || '';

        const btnExport = document.getElementById('btn-edit-export-epub');
        if (btnExport) {
            btnExport.disabled = true;
            btnExport.textContent = '⏳ Packaging…';
        }

        if (typeof window.setEpubPackagingModal === 'function') {
            window.setEpubPackagingModal({ title: state.title, status: `Packaging ${state.chapters.length} chapters…`, pct: 5 });
        }

        try {
            let blob = null;
            const fileName = `${state.title} - ${state.chapters.length} Chapters.epub`.replace(/[\\/:*?"<>|]/g, '_');

            // ── STRATEGY 1: In-Place Preservation of Original Container ──
            if (state.originalZip && state.originalOpfPath) {
                const zip = state.originalZip;
                const opfPath = state.originalOpfPath;
                const opfDir = state.originalOpfDir;
                const parser = new DOMParser();
                const serializer = new XMLSerializer();
                let opfDoc = null;

                // 1. Update OPF metadata and spine
                const opfFile = zip.file(opfPath);
                if (opfFile) {
                    const opfXml = await opfFile.async('text');
                    try {
                        opfDoc = parser.parseFromString(opfXml, 'application/xml');
                        if (opfDoc.querySelector('parsererror')) {
                            opfDoc = parser.parseFromString(opfXml, 'text/html');
                        }
                    } catch (e) {
                        opfDoc = parser.parseFromString(opfXml, 'text/html');
                    }

                    if (opfDoc) {
                        const titleEl = opfDoc.querySelector('metadata > title, metadata > dc\\:title') || opfDoc.getElementsByTagName('dc:title')[0];
                        if (titleEl) titleEl.textContent = state.title;

                        const authorEl = opfDoc.querySelector('metadata > creator, metadata > dc\\:creator') || opfDoc.getElementsByTagName('dc:creator')[0];
                        if (authorEl) authorEl.textContent = state.author;

                        const langEl = opfDoc.querySelector('metadata > language, metadata > dc\\:language') || opfDoc.getElementsByTagName('dc:language')[0];
                        if (langEl) langEl.textContent = state.lang;

                        const descEl = opfDoc.querySelector('metadata > description, metadata > dc\\:description') || opfDoc.getElementsByTagName('dc:description')[0];
                        if (descEl) descEl.textContent = state.description;

                        const manifestEl = opfDoc.querySelector('manifest');
                        const spineEl = opfDoc.querySelector('spine');

                        if (spineEl) {
                            while (spineEl.firstChild) {
                                spineEl.removeChild(spineEl.firstChild);
                            }

                            for (let i = 0; i < state.chapters.length; i++) {
                                const ch = state.chapters[i];
                                let chId = ch.id;
                                let chHref = ch.href;
                                let chFullPath = ch.fullPath;

                                if (ch.isNew || !chFullPath || !zip.file(chFullPath)) {
                                    chId = `ch_new_${i + 1}_${Date.now()}`;
                                    const relFile = `Text/ch_${i + 1}.xhtml`;
                                    chHref = relFile;
                                    chFullPath = opfDir + relFile;
                                    ch.fullPath = chFullPath;
                                    ch.href = chHref;

                                    if (manifestEl) {
                                        const itemEl = opfDoc.createElement('item');
                                        itemEl.setAttribute('id', chId);
                                        itemEl.setAttribute('href', chHref);
                                        itemEl.setAttribute('media-type', 'application/xhtml+xml');
                                        manifestEl.appendChild(itemEl);
                                    }
                                }

                                const itemRef = opfDoc.createElement('itemref');
                                itemRef.setAttribute('idref', chId);
                                spineEl.appendChild(itemRef);

                                // Re-inject prose preserving original head styling and body attributes
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
                                zip.file(chFullPath, newXhtml);
                            }
                        }

                        // Update cover in zip if modified via Cover Studio or uploaded
                        if (state.coverUrl && state.coverUrl.startsWith('data:image/')) {
                            try {
                                const match = state.coverUrl.match(/^data:(image\/[a-zA-Z0-9+.-]+);base64,(.+)$/);
                                if (match) {
                                    const mime = match[1];
                                    const base64Data = match[2];
                                    const ext = mime.includes('png') ? 'png' : (mime.includes('webp') ? 'webp' : 'jpg');
                                    let coverItem = opfDoc.querySelector('manifest > item[properties*="cover-image"]') ||
                                                   opfDoc.querySelector('manifest > item[id="cover-image"]') ||
                                                   opfDoc.querySelector('manifest > item[id="cover"]') ||
                                                   opfDoc.querySelector('manifest > item[id="cover-img"]');
                                    if (coverItem) {
                                        const coverHref = coverItem.getAttribute('href');
                                        if (coverHref) {
                                            const existingCoverFile = findZipEntry(zip, coverHref, opfDir);
                                            if (existingCoverFile) {
                                                zip.file(existingCoverFile.name, base64Data, { base64: true });
                                            }
                                        }
                                    } else {
                                        const newCoverRel = `Images/cover.${ext}`;
                                        const newCoverPath = opfDir + newCoverRel;
                                        zip.file(newCoverPath, base64Data, { base64: true });
                                        if (manifestEl) {
                                            const itemEl = opfDoc.createElement('item');
                                            itemEl.setAttribute('id', 'cover-image');
                                            itemEl.setAttribute('href', newCoverRel);
                                            itemEl.setAttribute('media-type', mime);
                                            itemEl.setAttribute('properties', 'cover-image');
                                            manifestEl.appendChild(itemEl);
                                        }
                                    }
                                }
                            } catch (covErr) {
                                console.warn('Cover update in zip warning:', covErr);
                            }
                        }

                        zip.file(opfPath, serializer.serializeToString(opfDoc));
                    }
                }

                // 2. Update Table of Contents in NCX (EPUB 2) AND nav.xhtml (EPUB 3)
                // 2a. Update NCX
                let ncxFile = zip.file(opfDir + 'toc.ncx') || zip.file('toc.ncx');
                if (!ncxFile && opfDoc) {
                    const ncxManifest = opfDoc.querySelector('manifest > item[media-type*="dtbncx"], manifest > item[id="ncx"], manifest > item[id="toc"]');
                    if (ncxManifest) {
                        const href = ncxManifest.getAttribute('href');
                        if (href) ncxFile = findZipEntry(zip, href, opfDir);
                    }
                }
                if (ncxFile) {
                    try {
                        const ncxXml = await ncxFile.async('text');
                        let ncxDoc;
                        try {
                            ncxDoc = parser.parseFromString(ncxXml, 'application/xml');
                            if (ncxDoc.querySelector('parsererror')) {
                                ncxDoc = parser.parseFromString(ncxXml, 'text/html');
                            }
                        } catch (e) {
                            ncxDoc = parser.parseFromString(ncxXml, 'text/html');
                        }

                        const navMapEl = ncxDoc?.querySelector('navMap');
                        if (navMapEl) {
                            while (navMapEl.firstChild) navMapEl.removeChild(navMapEl.firstChild);

                            let playOrder = 1;
                            let currentParentNavPoint = null;

                            state.chapters.forEach((ch, idx) => {
                                const np = ncxDoc.createElement('navPoint');
                                np.setAttribute('id', `navPoint-${playOrder}`);
                                np.setAttribute('playOrder', String(playOrder));

                                const nl = ncxDoc.createElement('navLabel');
                                const txt = ncxDoc.createElement('text');
                                txt.textContent = ch.title;
                                nl.appendChild(txt);
                                np.appendChild(nl);

                                const cnt = ncxDoc.createElement('content');
                                const chTarget = ch.href || (ch.fullPath ? ch.fullPath.replace(opfDir, '') : `ch_${idx + 1}.xhtml`);
                                const relSrc = getRelativeZipHref(ncxFile.name, opfDir + chTarget);
                                cnt.setAttribute('src', relSrc);
                                np.appendChild(cnt);

                                if (ch.level === 2 && currentParentNavPoint) {
                                    currentParentNavPoint.appendChild(np);
                                } else {
                                    navMapEl.appendChild(np);
                                    currentParentNavPoint = np;
                                }
                                playOrder++;
                            });

                            zip.file(ncxFile.name, serializer.serializeToString(ncxDoc));
                        }
                    } catch (ncxErr) {
                        console.warn('NCX update error:', ncxErr);
                    }
                }

                // 2b. Update or Inject EPUB 3 Navigation Document (nav.xhtml)
                let navItem = opfDoc ? opfDoc.querySelector('manifest > item[properties~="nav"], manifest > item[properties*="nav"]') : null;
                let navFile = null;
                if (navItem) {
                    const navHref = navItem.getAttribute('href');
                    if (navHref) navFile = findZipEntry(zip, navHref, opfDir);
                }
                if (!navFile) {
                    navFile = zip.file(opfDir + 'nav.xhtml') || zip.file(opfDir + 'toc.xhtml') || zip.file('nav.xhtml') || zip.file('toc.xhtml');
                }

                const isEpub3 = Boolean(opfDoc?.documentElement?.getAttribute('version')?.startsWith('3'));

                if (navFile) {
                    try {
                        const navXml = await navFile.async('text');
                        let navDoc;
                        try {
                            navDoc = parser.parseFromString(navXml, 'application/xhtml+xml');
                            if (navDoc.querySelector('parsererror')) {
                                navDoc = parser.parseFromString(navXml, 'text/html');
                            }
                        } catch (e) {
                            navDoc = parser.parseFromString(navXml, 'text/html');
                        }

                        let tocNav = navDoc.querySelector('nav[epub\\:type="toc"], nav[*|type="toc"], nav#toc, nav');
                        if (!tocNav) {
                            tocNav = navDoc.createElement('nav');
                            tocNav.setAttribute('xmlns:epub', 'http://www.idpf.org/2007/ops');
                            tocNav.setAttribute('epub:type', 'toc');
                            tocNav.setAttribute('id', 'toc');
                            const h1 = navDoc.createElement('h1');
                            h1.textContent = 'Table of Contents';
                            tocNav.appendChild(h1);
                            (navDoc.body || navDoc.documentElement).appendChild(tocNav);
                        }

                        // Remove old lists in tocNav
                        const oldLists = tocNav.querySelectorAll('ol, ul');
                        oldLists.forEach(ol => ol.remove());

                        // Build updated hierarchical <ol>
                        const rootOl = navDoc.createElement('ol');
                        rootOl.style.listStyleType = 'none';
                        let currentParentLi = null;
                        let currentSubOl = null;

                        state.chapters.forEach((ch, idx) => {
                            const li = navDoc.createElement('li');
                            const a = navDoc.createElement('a');
                            const chTarget = ch.href || (ch.fullPath ? ch.fullPath.replace(opfDir, '') : `ch_${idx + 1}.xhtml`);
                            const relHref = getRelativeZipHref(navFile.name, opfDir + chTarget);
                            a.setAttribute('href', relHref);
                            a.textContent = ch.title;
                            li.appendChild(a);

                            if (ch.level === 2 && currentParentLi) {
                                if (!currentSubOl) {
                                    currentSubOl = navDoc.createElement('ol');
                                    currentSubOl.style.listStyleType = 'none';
                                    currentParentLi.appendChild(currentSubOl);
                                }
                                currentSubOl.appendChild(li);
                            } else {
                                rootOl.appendChild(li);
                                currentParentLi = li;
                                currentSubOl = null;
                            }
                        });

                        tocNav.appendChild(rootOl);
                        zip.file(navFile.name, serializer.serializeToString(navDoc));
                    } catch (navErr) {
                        console.warn('EPUB 3 nav.xhtml update error:', navErr);
                    }
                } else if (isEpub3 && opfDoc) {
                    // EPUB 3 book missing nav document: generate clean nav.xhtml and register in manifest
                    try {
                        const navRelPath = 'nav.xhtml';
                        const navFullPath = opfDir + navRelPath;

                        let olContent = '';
                        let currentParentOpen = false;
                        let currentSubOpen = false;

                        state.chapters.forEach((ch, idx) => {
                            const chTarget = ch.href || (ch.fullPath ? ch.fullPath.replace(opfDir, '') : `ch_${idx + 1}.xhtml`);
                            const relHref = getRelativeZipHref(navFullPath, opfDir + chTarget);

                            if (ch.level === 2 && currentParentOpen) {
                                if (!currentSubOpen) {
                                    olContent += '<ol style="list-style-type:none;">';
                                    currentSubOpen = true;
                                }
                                olContent += `<li><a href="${escapeXml(relHref)}">${escapeXml(ch.title)}</a></li>`;
                            } else {
                                if (currentSubOpen) {
                                    olContent += '</ol></li>';
                                    currentSubOpen = false;
                                    currentParentOpen = false;
                                } else if (currentParentOpen) {
                                    olContent += '</li>';
                                    currentParentOpen = false;
                                }
                                olContent += `<li><a href="${escapeXml(relHref)}">${escapeXml(ch.title)}</a>`;
                                currentParentOpen = true;
                            }
                        });
                        if (currentSubOpen) olContent += '</ol>';
                        if (currentParentOpen) olContent += '</li>';

                        const navXhtmlContent = `<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops">
<head>
  <title>Table of Contents</title>
  <meta charset="utf-8" />
  <style>
    nav#toc ol { list-style-type: none; margin: 0; padding: 0 0 0 1.2em; }
    nav#toc li { margin: 0.3em 0; }
    nav#toc a { text-decoration: none; }
  </style>
</head>
<body>
  <nav epub:type="toc" id="toc">
    <h1>Table of Contents</h1>
    <ol style="list-style-type:none;">
      ${olContent}
    </ol>
  </nav>
</body>
</html>`;
                        zip.file(navFullPath, navXhtmlContent);

                        const manifestEl = opfDoc.querySelector('manifest');
                        if (manifestEl && !manifestEl.querySelector('item[properties*="nav"]')) {
                            const navItemEl = opfDoc.createElement('item');
                            navItemEl.setAttribute('id', 'nav');
                            navItemEl.setAttribute('href', navRelPath);
                            navItemEl.setAttribute('media-type', 'application/xhtml+xml');
                            navItemEl.setAttribute('properties', 'nav');
                            manifestEl.appendChild(navItemEl);

                            zip.file(opfPath, serializer.serializeToString(opfDoc));
                        }
                    } catch (genNavErr) {
                        console.warn('Error generating nav.xhtml:', genNavErr);
                    }
                }

                // Ensure mimetype entry has STORE compression for strict EPUB compliance
                if (zip.file('mimetype')) {
                    zip.file('mimetype', 'application/epub+zip', { compression: 'STORE' });
                }

                // 3. Generate Blob from originalZip
                blob = await zip.generateAsync({
                    type: 'blob',
                    mimeType: 'application/epub+zip',
                    compression: 'DEFLATE',
                    compressionOptions: { level: 6 }
                }, (meta) => {
                    if (btnExport) btnExport.textContent = `⏳ ${Math.round(meta.percent)}%`;
                    if (typeof window.setEpubPackagingModal === 'function') {
                        window.setEpubPackagingModal({ title: state.title, status: `Packaging EPUB…`, pct: Math.round(meta.percent) });
                    }
                });
            } else {
                // ── STRATEGY 2: Fallback to Packaging Engine (for Library/imported records) ──
                if (typeof window.generateEpubFromChapters !== 'function') {
                    throw new Error('EPUB packaging engine is not available.');
                }

                const chaptersForPackaging = state.chapters.map((c, i) => ({
                    id: c.id || `ch_${i + 1}`,
                    title: c.title,
                    originalTitle: c.title,
                    content: c.content,
                    level: c.level || 1,
                    words: c.words || countWords(c.content)
                }));

                const opts = {
                    coverUrl: state.coverUrl,
                    cover: state.coverUrl,
                    hierarchicalToc: true
                };

                blob = await window.generateEpubFromChapters(
                    chaptersForPackaging,
                    state.title,
                    state.author,
                    state.lang,
                    (status, pct, elapsed) => {
                        if (btnExport) btnExport.textContent = `⏳ ${pct}%`;
                        if (typeof window.setEpubPackagingModal === 'function') {
                            window.setEpubPackagingModal({ title: state.title, status: status || `Packaging ${state.chapters.length} chapters…`, pct, elapsed });
                        }
                    },
                    opts
                );
            }

            const novelFolderOpts = (typeof window.getNovelFolderOptions === 'function') ? window.getNovelFolderOptions(state) : null;
            if (typeof window.saveUniversalBlob === 'function') {
                await window.saveUniversalBlob(blob, fileName, 'application/epub+zip', false, novelFolderOpts);
            } else {
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = fileName;
                a.click();
                setTimeout(() => URL.revokeObjectURL(url), 10000);
            }

            if (typeof window.toast === 'function') {
                window.toast(`✓ Clean EPUB exported! (${state.chapters.length} chapters)`, 'success');
            }
        } catch (err) {
            console.error('EPUB packaging error:', err);
            if (typeof window.toast === 'function') window.toast('Failed to package EPUB: ' + err.message, 'error');
        } finally {
            if (typeof window.setEpubPackagingModal === 'function') {
                window.setEpubPackagingModal(null);
            }
            if (btnExport) {
                btnExport.disabled = false;
                btnExport.textContent = '📥 Download EPUB';
            }
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
                    state.chapters[d.idx].title = d.cleaned;
                    state.chapters[d.idx].originalTitle = d.cleaned;
                    if (state.chapters[d.idx].content && /^#{1,6}\s+.+$/m.test(state.chapters[d.idx].content)) {
                        state.chapters[d.idx].content = state.chapters[d.idx].content.replace(/^#{1,6}\s+.+$/m, `# ${d.cleaned}`);
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

        // Modal: Clean Spacing
        document.getElementById('btn-edit-modal-clean-spacing')?.addEventListener('click', () => {
            const textarea = document.getElementById('edit-ch-modal-textarea');
            if (textarea) {
                let s = textarea.value;
                s = s.replace(/\r\n/g, '\n');
                s = s.replace(/[ \t]+$/gm, '');
                s = s.replace(/\n{3,}/g, '\n\n');
                textarea.value = s.trim();
                recordUndoState(textarea.value);
                updateModalWordCount();
                if (typeof window.toast === 'function') window.toast('Cleaned paragraph spacing!', 'info');
            }
        });

        // Modal: Undo & Redo
        document.getElementById('btn-edit-modal-undo')?.addEventListener('click', performUndo);
        document.getElementById('btn-edit-modal-redo')?.addEventListener('click', performRedo);

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
                const paras = cleanRaw.split(/\n\s*\n/);
                const htmlParts = [];
                if (currTitle) {
                    htmlParts.push(`<h2 class="chapter-title" style="font-weight:800; font-size:1.45em; color:var(--paper); margin:0 0 20px; padding-bottom:12px; border-bottom:1px solid var(--hairline); letter-spacing:-0.01em;">${escapeXml(currTitle)}</h2>`);
                }
                paras.forEach((p, idx) => {
                    let trimmed = p.trim();
                    if (!trimmed) return;
                    if (idx === 0 && /^#{1,6}\s+/.test(trimmed)) {
                        return; // Skip duplicate first-line markdown heading
                    }
                    if (trimmed === '---' || trimmed === '***') {
                        htmlParts.push('<hr style="border:none; border-top:1px solid var(--hairline); margin:24px 0;" />');
                    } else if (/^#{1,6}\s+/.test(trimmed)) {
                        htmlParts.push(`<h3 style="font-weight:700; color:var(--paper); margin:20px 0 10px; font-size:1.15em;">${escapeXml(trimmed.replace(/^#+\s+/, ''))}</h3>`);
                    } else if (/!\[(.*?)\]\((.*?)\)/.test(trimmed)) {
                        const m = trimmed.match(/!\[(.*?)\]\((.*?)\)/);
                        const token = m[2];
                        const imgSrc = (state.imageRepository.get(token)?.dataUrl) || token;
                        htmlParts.push(`<div style="text-align:center; margin:20px 0;"><img src="${imgSrc}" alt="${escapeXml(m[1])}" style="max-width:100%; max-height:420px; border-radius:8px; margin:0 auto; display:inline-block; box-shadow:0 4px 12px rgba(0,0,0,0.4);" /><p style="font-size:11px; color:var(--slate); margin-top:6px;">${escapeXml(m[1])}</p></div>`);
                    } else {
                        htmlParts.push(`<p style="margin-bottom:16px; text-indent:1.5em; line-height:1.8;">${escapeXml(trimmed)}</p>`);
                    }
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

        // Modal: Word count & Undo recording on typing
        document.getElementById('edit-ch-modal-textarea')?.addEventListener('input', () => {
            updateModalWordCount();
            clearTimeout(undoDebounceTimer);
            undoDebounceTimer = setTimeout(() => {
                const val = document.getElementById('edit-ch-modal-textarea')?.value || '';
                recordUndoState(val);
            }, 350);
        });

        // Modal: Insert Image file picker
        document.getElementById('btn-edit-modal-insert-img')?.addEventListener('click', () => chImgInput?.click());
        chImgInput?.addEventListener('change', (e) => {
            if (e.target.files && e.target.files[0]) {
                const file = e.target.files[0];
                const reader = new FileReader();
                reader.onload = () => {
                    const dataUrl = reader.result;
                    const imgName = file.name ? file.name.replace(/\s+/g, '_') : `illustration_${Date.now()}.jpg`;
                    state.imageRepository.set(imgName, { dataUrl, mime: file.type, name: imgName });

                    const textarea = document.getElementById('edit-ch-modal-textarea');
                    if (textarea) {
                        const start = textarea.selectionStart || textarea.value.length;
                        const end = textarea.selectionEnd || textarea.value.length;
                        const mdImg = `\n\n![Illustration](${imgName})\n\n`;
                        textarea.value = textarea.value.substring(0, start) + mdImg + textarea.value.substring(end);
                        textarea.selectionStart = textarea.selectionEnd = start + mdImg.length;
                        textarea.focus();

                        const ch = state.chapters[modalActiveIdx];
                        if (ch) {
                            ch.content = textarea.value;
                            ch.images = extractImagesFromContent(ch.content);
                            renderInChapterImages(ch);
                        }
                        recordUndoState(textarea.value);
                        updateModalWordCount();
                        if (typeof window.toast === 'function') window.toast('Inserted image into chapter!', 'success');
                    }
                };
                reader.readAsDataURL(file);
            }
        });

        // Rename Modal Handlers
        document.getElementById('btn-edit-rename-save')?.addEventListener('click', () => {
            if (activeRenameIdx >= 0 && activeRenameIdx < state.chapters.length) {
                const input = document.getElementById('edit-rename-input');
                const val = input?.value.trim();
                if (val) {
                    state.chapters[activeRenameIdx].title = val;
                    state.chapters[activeRenameIdx].originalTitle = val;
                    if (state.chapters[activeRenameIdx].content && /^#{1,6}\s+.+$/m.test(state.chapters[activeRenameIdx].content)) {
                        state.chapters[activeRenameIdx].content = state.chapters[activeRenameIdx].content.replace(/^#{1,6}\s+.+$/m, `# ${val}`);
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
