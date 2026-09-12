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
        s = s.replace(/^.*[\\\/]/, '');
        s = s.replace(/\.(?:xhtml|html|xml)$/i, '');
        s = s.replace(/^b\d+_/i, '');
        if (s.includes('_')) s = s.replace(/_/g, ' ');
        s = s.replace(/\s+/g, ' ').trim();

        if (/^\d+\.\d+$/.test(s)) return s;
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

        const isSpecialSection = /^(?:year\s*\d+|volume\s*\d+|vol\s*\d+|book\s*\d+|arc\s*\d+|prologue|epilogue|interlude|monologue|afterword|synopsis|illustration|illustrations|side\s*story|\bss\b|part\s*\d+|extra|character\s*intro|short\s*story)/i.test(s);
        if (isSpecialSection) {
            s = s.replace(/^(Year\s*\d+)[,\s]+(Volume\s*[\d\.]+)[,\s:\-]*(.*)$/i, (m, y, v, rest) => rest ? `${y}, ${v} - ${rest.trim()}` : `${y}, ${v}`);
            s = s.replace(/^(Volume\s*[\d\.]+)[,\s:\-]+(?:Volume\s*[\d\.]+)?[,\s:\-]*(.*)$/i, (m, v, rest) => rest ? `${v} - ${rest.trim()}` : v);
            s = s.replace(/^Illustration(?:s)?\s*#?(\d+)/i, 'Illustration $1');
            s = s.replace(/^Part\s*(\d+)[\s:\.\-]+(.*)$/i, (m, p, rest) => rest ? `Part ${p} - ${rest}` : `Part ${p}`);
            return s;
        }

        s = s.replace(/^(?:\d+[\s\.\-_]+)+(?:Chapter|\bCh\b)/i, 'Chapter');
        s = s.replace(/^\d+[\s:\.\-]+(?:Chapter|\bCh\b)\s*(\d+)[\s:\.\-]+(?:\d+[\s:\.\-]+)?/i, 'Chapter $1 - ');
        s = s.replace(/^(?:Chapter|\bCh\b)\s*(\d+)[\s:\.\-]+(?:\d+[\s:\.\-]+)?/i, 'Chapter $1 - ');
        s = s.replace(/^(?:Chapter|\bCh\b)\s*(\d+)\s*[:\-]\s*(?:Chapter|\bCh\b)\s*\1\s*[:\-]\s*/i, 'Chapter $1 - ');
        s = s.replace(/^Chapter\s*(\d+)\s*[\-:]\s*[\-:]\s*/i, 'Chapter $1 - ');
        s = s.replace(/^Chapter\s*(\d+)\s*-\s*:\s*/i, 'Chapter $1 - ');
        s = s.replace(/^Chapter\s*(\d+)\s*:\s*-\s*/i, 'Chapter $1 - ');

        if (/^\d+[\.\-:]\s+/.test(s)) {
            const num = s.match(/^(\d+)/)[1];
            const rest = s.replace(/^\d+[\.\-:]\s+/, '');
            s = 'Chapter ' + parseInt(num, 10) + ' - ' + rest;
        }
        s = s.trim().replace(/^Chapter\s*(\d+)\s*[\-:]\s*$/i, 'Chapter $1');
        return s || ('Chapter ' + fallbackIndex);
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

    function generateSvgCover(title, author) {
        const safeTitle = escapeXml(title || 'Web Novel');
        const safeAuthor = escapeXml(author || 'Author');
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
  <circle cx="400" cy="320" r="140" fill="none" stroke="url(#goldGrad)" stroke-width="1" opacity="0.25" />
  <text x="400" y="335" font-family="sans-serif" font-size="64" font-weight="900" fill="#a5b4fc" text-anchor="middle" letter-spacing="4">✦</text>
  <text x="400" y="560" font-family="'Cinzel', 'Noto Serif', serif, sans-serif" font-size="46" font-weight="bold" fill="#ffffff" text-anchor="middle">
    ${safeTitle.length > 25 ? safeTitle.slice(0, 24) + '…' : safeTitle}
  </text>
  <line x1="260" y1="620" x2="540" y2="620" stroke="url(#goldGrad)" stroke-width="2" opacity="0.6" />
  <text x="400" y="680" font-family="sans-serif" font-size="24" font-weight="500" fill="#c7d2fe" text-anchor="middle" letter-spacing="2">
    ${safeAuthor}
  </text>
  <text x="400" y="1080" font-family="sans-serif" font-size="14" font-weight="600" fill="#94a3b8" text-anchor="middle" letter-spacing="6">
    GEMINI TRANSLATOR · STUDIO EDITION
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
        chapters: [], // [{ id, title, level, content, words, images: [] }]
        imageRepository: new Map(), // key (filename/dataUrl) -> { dataUrl, mime, name }
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
                    <div style="display:flex; align-items:center; gap:8px;">
                        <span class="cap" style="font-size:12px; letter-spacing:.12em;">Table of Contents & Hierarchy</span>
                        <span id="edit-toc-badge" class="chip-act" style="background:rgba(99,102,241,.15); color:var(--iris); border-color:transparent;">0 Chapters</span>
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
             onclick="if(event.target===this) document.getElementById('edit-chapter-modal').classList.add('hidden');">
            <div class="rounded-2xl shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden"
                 style="background:var(--ember); border:1px solid var(--hairline);">
                <!-- Modal Top Header -->
                <div class="flex items-center justify-between p-4" style="border-bottom:1px solid var(--hairline); background:var(--ember-2);">
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
                    <button type="button" onclick="document.getElementById('edit-chapter-modal').classList.add('hidden')"
                            class="w-8 h-8 rounded-lg flex items-center justify-center text-base font-bold" style="color:var(--slate);">✕</button>
                </div>

                <!-- Modal Sub-Toolbar -->
                <div class="px-4 py-2 flex items-center justify-between gap-3 flex-wrap text-xs"
                     style="border-bottom:1px solid var(--hairline); background:rgba(255,255,255,0.02);">
                    <div class="flex items-center gap-2 flex-wrap">
                        <button type="button" id="btn-edit-modal-insert-img" class="tl-btn" style="padding:5px 10px; font-size:11.5px;">
                            🖼️ Insert Image into Chapter
                        </button>
                        <button type="button" id="btn-edit-modal-preview-toggle" class="tl-btn" style="padding:5px 10px; font-size:11.5px;">
                            👁️ Preview HTML
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

                <!-- Modal Body (Textarea or Rendered Preview) -->
                <div class="flex-1 overflow-hidden relative flex flex-col" style="min-height:360px;">
                    <textarea id="edit-ch-modal-textarea"
                              placeholder="Type or paste chapter prose here… Markdown headings (# Title) and images (![Alt](url)) are supported."
                              style="width:100%; height:100%; min-height:360px; border:none; background:transparent; color:var(--paper); font-family:serif,Georgia,Cambria; font-size:15px; line-height:1.75; padding:18px 22px; resize:none; outline:none; overflow-y:auto;"
                              class="custom-scrollbar"></textarea>
                    <div id="edit-ch-modal-preview" class="hidden flex-1 p-6 overflow-y-auto custom-scrollbar font-serif text-sm leading-relaxed"
                         style="color:var(--paper-dim); background:rgba(0,0,0,0.15);"></div>
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
                <div class="p-3 sm:p-4 flex items-center justify-between gap-3" style="border-top:1px solid var(--hairline); background:var(--ember-2);">
                    <div class="flex gap-2">
                        <button type="button" id="btn-edit-modal-prev-ch" class="tl-btn" style="padding:6px 12px; font-size:12px;">← Previous Chapter</button>
                        <button type="button" id="btn-edit-modal-next-ch" class="tl-btn" style="padding:6px 12px; font-size:12px;">Next Chapter →</button>
                    </div>
                    <div class="flex gap-2">
                        <button type="button" onclick="document.getElementById('edit-chapter-modal').classList.add('hidden')" class="tl-btn">Close</button>
                        <button type="button" id="btn-edit-modal-save" class="tl-btn accent">✓ Save Chapter</button>
                    </div>
                </div>
            </div>
        </div>

        <!-- ═══ MODAL 2: BOOK-WIDE ILLUSTRATION GALLERY ═══ -->
        <div id="edit-gallery-modal" class="hidden fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5"
             style="background:rgba(0,0,0,.75); backdrop-filter:blur(8px);"
             onclick="if(event.target===this) document.getElementById('edit-gallery-modal').classList.add('hidden');">
            <div class="rounded-2xl shadow-2xl w-full max-w-4xl max-h-[88vh] flex flex-col overflow-hidden"
                 style="background:var(--ember); border:1px solid var(--hairline);">
                <div class="flex items-center justify-between p-4" style="border-bottom:1px solid var(--hairline); background:var(--ember-2);">
                    <div class="flex items-center gap-2.5">
                        <span class="text-lg">🖼️</span>
                        <div>
                            <h3 class="font-bold text-base" style="color:var(--paper);">Book Illustration Gallery</h3>
                            <p class="text-xs" style="color:var(--slate);">Manage all illustrations, set book cover, or download images</p>
                        </div>
                    </div>
                    <button type="button" onclick="document.getElementById('edit-gallery-modal').classList.add('hidden')"
                            class="w-8 h-8 rounded-lg flex items-center justify-center font-bold" style="color:var(--slate);">✕</button>
                </div>
                <!-- Gallery Grid -->
                <div id="edit-gallery-grid" class="p-5 overflow-y-auto custom-scrollbar flex-1 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4"
                     style="max-height:60vh;">
                    <!-- Dynamically populated with image cards -->
                </div>
                <div class="p-4 flex items-center justify-between gap-3" style="border-top:1px solid var(--hairline); background:var(--ember-2);">
                    <span id="edit-gallery-total" class="text-xs font-mono" style="color:var(--slate);">0 images total</span>
                    <div class="flex gap-2">
                        <button type="button" id="btn-edit-gallery-upload-new" class="tl-btn">➕ Upload New Illustration</button>
                        <button type="button" onclick="document.getElementById('edit-gallery-modal').classList.add('hidden')" class="tl-btn accent">Done</button>
                    </div>
                </div>
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
                    <div class="flex items-center justify-between pt-1">
                        <label class="tl-check">
                            <input type="checkbox" id="edit-find-case-sensitive"> Match Case
                        </label>
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
                            <option value="simple">Chapter {N}</option>
                            <option value="decimal">1.{N} (Light Novel Sub-Chapter)</option>
                        </select>
                    </div>
                    <div>
                        <label class="cap" style="display:block; margin-bottom:4px;">Start Number</label>
                        <input type="number" id="edit-autonumber-start" value="1" min="0" class="tl-field" style="width:100%;">
                    </div>
                    <p class="text-xs" style="color:var(--slate);">Existing titles will be cleanly formatted with sequential numbering.</p>
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
    </div>
    `;

    // ── Parse EPUB Archive using JSZip ──
    async function parseEpubFile(file) {
        const JSZipClass = (typeof window !== 'undefined' && window.JSZip) ? window.JSZip : (typeof JSZip !== 'undefined' ? JSZip : null);
        if (!JSZipClass) {
            alert('JSZip library is required to unpack EPUBs.');
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

            // 1. Locate OPF
            const containerFile = zip.file('META-INF/container.xml');
            if (!containerFile) throw new Error('Invalid EPUB: META-INF/container.xml missing');
            const containerXml = await containerFile.async('text');
            const parser = new DOMParser();
            const containerDoc = parser.parseFromString(containerXml, 'application/xml');
            const opfPath = containerDoc.querySelector('rootfile')?.getAttribute('full-path') || 'OEBPS/content.opf';
            const opfDir = opfPath.includes('/') ? opfPath.substring(0, opfPath.lastIndexOf('/') + 1) : '';

            const opfFile = zip.file(opfPath);
            if (!opfFile) throw new Error(`Cannot find package document: ${opfPath}`);
            const opfXml = await opfFile.async('text');
            const opfDoc = parser.parseFromString(opfXml, 'application/xml');

            // 2. Metadata
            updateProgress('Extracting metadata & assets…', 35);
            const titleEl = opfDoc.querySelector('metadata > title, metadata > dc\\:title') || opfDoc.getElementsByTagName('dc:title')[0];
            const authorEl = opfDoc.querySelector('metadata > creator, metadata > dc\\:creator') || opfDoc.getElementsByTagName('dc:creator')[0];
            const langEl = opfDoc.querySelector('metadata > language, metadata > dc\\:language') || opfDoc.getElementsByTagName('dc:language')[0];
            const descEl = opfDoc.querySelector('metadata > description, metadata > dc\\:description') || opfDoc.getElementsByTagName('dc:description')[0];

            state.title = (titleEl ? titleEl.textContent : file.name.replace(/\.epub$/i, '')).trim();
            state.author = (authorEl ? authorEl.textContent : 'Unknown Author').trim();
            state.lang = (langEl ? langEl.textContent : 'en').trim();
            state.description = (descEl ? descEl.textContent : '').trim();
            state.series = '';
            state.imageRepository.clear();
            state.chapters = [];
            state.coverUrl = '';

            // 3. Manifest & Image repository
            const manifestItems = Array.from(opfDoc.querySelectorAll('manifest > item'));
            const manifestMap = new Map();
            let coverHref = '';

            // Check meta cover
            const metaCover = opfDoc.querySelector('metadata > meta[name="cover"]');
            const metaCoverId = metaCover ? metaCover.getAttribute('content') : '';

            for (const item of manifestItems) {
                const id = item.getAttribute('id');
                const href = item.getAttribute('href');
                const mediaType = item.getAttribute('media-type') || '';
                const properties = item.getAttribute('properties') || '';
                manifestMap.set(id, { href, mediaType, properties });

                if (properties.includes('cover-image') || id === metaCoverId || (id && id.toLowerCase() === 'cover-image')) {
                    coverHref = href;
                }

                if (mediaType.startsWith('image/')) {
                    const fullImgPath = opfDir + href;
                    const imgZipFile = zip.file(fullImgPath) || zip.file(href);
                    if (imgZipFile) {
                        try {
                            const b64 = await imgZipFile.async('base64');
                            const dataUrl = `data:${mediaType};base64,${b64}`;
                            state.imageRepository.set(href, { dataUrl, mime: mediaType, name: href.split('/').pop() });
                            state.imageRepository.set(fullImgPath, { dataUrl, mime: mediaType, name: href.split('/').pop() });
                            state.imageRepository.set(href.split('/').pop(), { dataUrl, mime: mediaType, name: href.split('/').pop() });
                        } catch(e) {}
                    }
                }
            }

            if (coverHref && state.imageRepository.has(coverHref)) {
                state.coverUrl = state.imageRepository.get(coverHref).dataUrl;
            }

            // 4. TOC hierarchy from NCX or nav.xhtml
            updateProgress('Parsing Table of Contents & Hierarchy…', 50);
            const tocMap = new Map(); // href/filename -> { title, level }
            const ncxItem = manifestItems.find(i => (i.getAttribute('media-type') || '').includes('dtbncx'));
            if (ncxItem) {
                const ncxPath = opfDir + ncxItem.getAttribute('href');
                const ncxZipFile = zip.file(ncxPath) || zip.file(ncxItem.getAttribute('href'));
                if (ncxZipFile) {
                    try {
                        const ncxXml = await ncxZipFile.async('text');
                        const ncxDoc = parser.parseFromString(ncxXml, 'application/xml');
                        const walkNavPoints = (parentEl, currentLevel) => {
                            const navPoints = Array.from(parentEl.children).filter(c => c.tagName.toLowerCase() === 'navpoint');
                            navPoints.forEach(np => {
                                const contentEl = Array.from(np.children).find(c => c.tagName.toLowerCase() === 'content');
                                const textEl = np.querySelector('navLabel > text');
                                if (contentEl && textEl) {
                                    const src = (contentEl.getAttribute('src') || '').split('#')[0].trim();
                                    const label = textEl.textContent.trim();
                                    const fname = src.split('/').pop();
                                    const entry = { title: label, level: currentLevel };
                                    if (src) tocMap.set(src, entry);
                                    if (fname) tocMap.set(fname, entry);
                                }
                                walkNavPoints(np, currentLevel + 1);
                            });
                        };
                        const navMapEl = ncxDoc.querySelector('navMap');
                        if (navMapEl) walkNavPoints(navMapEl, 1);
                    } catch(e) {}
                }
            }

            // 5. Spine Chapters Extraction
            updateProgress('Extracting chapter prose…', 65);
            const spineItems = Array.from(opfDoc.querySelectorAll('spine > itemref'));
            let chIdx = 0;

            for (const itemRef of spineItems) {
                const idref = itemRef.getAttribute('idref');
                const item = manifestMap.get(idref);
                if (!item) continue;
                const fullChPath = opfDir + item.href;
                const chFile = zip.file(fullChPath) || zip.file(item.href);
                if (!chFile) continue;

                chIdx++;
                const xhtml = await chFile.async('text');
                const chDoc = parser.parseFromString(xhtml, 'text/html');

                // Check if this is dedicated cover page
                const isCoverPage = item.id === 'cover_page' || item.href.toLowerCase().includes('cover');
                const imgs = Array.from(chDoc.querySelectorAll('img, image'));
                if (isCoverPage && imgs.length === 1 && chDoc.body.textContent.trim().length < 50) {
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
                const tocEntry = tocMap.get(item.href) || tocMap.get(fname);
                let rawTitle = tocEntry?.title || '';
                if (!rawTitle) {
                    const h1 = chDoc.querySelector('h1, h2, h3, .title, .chapter-title');
                    rawTitle = h1 ? h1.textContent.trim() : (chDoc.title ? chDoc.title.trim() : `Chapter ${chIdx}`);
                }
                const chTitle = cleanTitle(rawTitle, chIdx);
                const chLevel = tocEntry ? (tocEntry.level > 1 ? 2 : 1) : 1;

                // Extract prose and format into clean markdown
                // Convert <img src="..."> to ![Illustration](img_key)
                imgs.forEach(img => {
                    const src = img.getAttribute('src') || img.getAttribute('xlink:href') || '';
                    const imgFname = src.split('/').pop();
                    const repoItem = state.imageRepository.get(imgFname) || state.imageRepository.get(src);
                    const finalSrc = repoItem ? repoItem.dataUrl : src;
                    const alt = img.getAttribute('alt') || 'Illustration';
                    const mdNode = chDoc.createTextNode(`\n\n![${alt}](${finalSrc})\n\n`);
                    img.parentNode?.replaceChild(mdNode, img);
                });

                // Extract paragraphs & scene breaks
                const blocks = Array.from(chDoc.body.querySelectorAll('p, h1, h2, h3, h4, h5, h6, blockquote, hr, div'));
                let prose = '';
                if (blocks.length > 0) {
                    const lines = [];
                    blocks.forEach(b => {
                        const tag = b.tagName.toLowerCase();
                        if (tag === 'hr') {
                            lines.push('---');
                        } else if (tag.startsWith('h')) {
                            const lvl = tag.replace('h', '');
                            const hText = b.textContent.trim();
                            if (hText && hText !== chTitle) {
                                lines.push(`${'#'.repeat(parseInt(lvl, 10))} ${hText}`);
                            }
                        } else if (tag === 'blockquote') {
                            lines.push(`> ${b.textContent.trim()}`);
                        } else if (tag === 'p') {
                            const pText = b.textContent.trim();
                            if (pText) lines.push(pText);
                        }
                    });
                    prose = lines.join('\n\n');
                }
                if (!prose.trim()) {
                    prose = chDoc.body.textContent.replace(/\r?\n\s*\r?\n/g, '\n\n').trim();
                }

                const chImages = extractImagesFromContent(prose);
                state.chapters.push({
                    id: 'ch_' + chIdx,
                    title: chTitle,
                    originalTitle: rawTitle || chTitle,
                    level: chLevel,
                    content: prose,
                    words: countWords(prose),
                    images: chImages
                });
            }

            updateProgress('Finished parsing book!', 100);
            renderEditorView();
            if (typeof window.toast === 'function') {
                window.toast(`Loaded "${state.title}" (${state.chapters.length} chapters, ${state.imageRepository.size} images)!`, 'success');
            }
        } catch (err) {
            console.error('EPUB parse error:', err);
            alert('Failed to parse EPUB: ' + err.message);
        } finally {
            if (spinner) spinner.classList.add('hidden');
            if (progWrap) progWrap.classList.add('hidden');
        }
    }

    // ── Load Book from Library Object (GeminiNovelDB record) ──
    function loadBookFromRecord(record) {
        if (!record) return;
        state.title = (record.title || 'Novel').replace(/\s*\((?:Translated|Translation)\)/gi, '').trim();
        state.author = (record.author || 'Gemini Translator').trim();
        state.series = '';
        state.lang = record.targetLang || 'en';
        state.description = record.summary || record.description || '';
        state.coverUrl = record.cover || '';
        state.imageRepository.clear();
        state.chapters = [];

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
                images: chImages
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
            preview.innerHTML = `<img src="${state.coverUrl}" style="width:100%; height:100%; object-fit:cover;" alt="Cover" />`;
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

    // ── Render Interactive Chapters List ──
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

        state.chapters.forEach((ch, idx) => {
            if (filterVal && !ch.title.toLowerCase().includes(filterVal)) {
                return;
            }

            const isSub = ch.level === 2;
            const row = document.createElement('div');
            row.className = `chap-row flex items-center justify-between gap-2 p-2.5 rounded-lg border transition-all ${
                isSub ? 'ml-6 bg-slate-900/40 border-indigo-950/60' : 'bg-slate-900/80 border-slate-800'
            }`;
            row.style.background = isSub ? 'rgba(99,102,241,0.04)' : 'rgba(255,255,255,0.02)';
            row.style.borderColor = isSub ? 'rgba(99,102,241,0.3)' : 'var(--hairline)';

            // Left side: hierarchy marker, reorder buttons, inline title input
            const left = document.createElement('div');
            left.className = 'flex items-center gap-2 flex-1 min-w-0';

            // Hierarchy indent/outdent toggle
            const levelBtn = document.createElement('button');
            levelBtn.type = 'button';
            levelBtn.className = 'chip-act shrink-0';
            levelBtn.style.padding = '3px 7px';
            levelBtn.style.fontSize = '10px';
            levelBtn.style.fontWeight = '700';
            if (isSub) {
                levelBtn.textContent = '← Main';
                levelBtn.title = 'Promote to Level 1 Main Chapter';
                levelBtn.style.color = '#a5b4fc';
                levelBtn.style.borderColor = '#6366f1';
            } else {
                levelBtn.textContent = '→ Sub';
                levelBtn.title = 'Nest as Level 2 Sub-Chapter under previous chapter';
                levelBtn.style.color = 'var(--slate)';
            }
            levelBtn.onclick = () => {
                ch.level = isSub ? 1 : 2;
                renderChapterList();
            };
            left.appendChild(levelBtn);

            // Reorder buttons (▲ / ▼)
            const reorderGroup = document.createElement('div');
            reorderGroup.className = 'flex items-center gap-1 shrink-0';

            const upBtn = document.createElement('button');
            upBtn.type = 'button';
            upBtn.className = 'chip-act';
            upBtn.style.padding = '2px 5px';
            upBtn.style.fontSize = '9px';
            upBtn.textContent = '▲';
            upBtn.disabled = idx === 0;
            upBtn.title = 'Move chapter up';
            upBtn.onclick = () => {
                if (idx > 0) {
                    const temp = state.chapters[idx - 1];
                    state.chapters[idx - 1] = state.chapters[idx];
                    state.chapters[idx] = temp;
                    renderChapterList();
                }
            };

            const downBtn = document.createElement('button');
            downBtn.type = 'button';
            downBtn.className = 'chip-act';
            downBtn.style.padding = '2px 5px';
            downBtn.style.fontSize = '9px';
            downBtn.textContent = '▼';
            downBtn.disabled = idx === state.chapters.length - 1;
            downBtn.title = 'Move chapter down';
            downBtn.onclick = () => {
                if (idx < state.chapters.length - 1) {
                    const temp = state.chapters[idx + 1];
                    state.chapters[idx + 1] = state.chapters[idx];
                    state.chapters[idx] = temp;
                    renderChapterList();
                }
            };

            reorderGroup.appendChild(upBtn);
            reorderGroup.appendChild(downBtn);
            left.appendChild(reorderGroup);

            // Index badge
            const numBadge = document.createElement('span');
            numBadge.className = 'text-[11px] font-mono font-bold shrink-0';
            numBadge.style.color = isSub ? '#818cf8' : 'var(--paper-dim)';
            numBadge.textContent = `#${idx + 1}`;
            left.appendChild(numBadge);

            // Inline Title Input
            const titleInput = document.createElement('input');
            titleInput.type = 'text';
            titleInput.value = ch.title;
            titleInput.className = 'tl-field';
            titleInput.style.padding = '4px 8px';
            titleInput.style.fontSize = '12.5px';
            titleInput.style.fontWeight = isSub ? '500' : '600';
            titleInput.style.margin = '0';
            titleInput.style.flex = '1';
            titleInput.onchange = (e) => {
                ch.title = e.target.value.trim() || `Chapter ${idx + 1}`;
            };
            left.appendChild(titleInput);
            row.appendChild(left);

            // Right side: Badges (words, images) and Actions (Edit, Delete)
            const right = document.createElement('div');
            right.className = 'flex items-center gap-2 shrink-0';

            // Word count badge
            const wordBadge = document.createElement('span');
            wordBadge.className = 'text-[10.5px] font-mono';
            wordBadge.style.color = 'var(--slate)';
            wordBadge.textContent = `${(ch.words || 0).toLocaleString()}w`;
            right.appendChild(wordBadge);

            // Illustration badge
            const imgCount = (ch.images || []).length;
            if (imgCount > 0) {
                const imgBadge = document.createElement('span');
                imgBadge.className = 'chip-act';
                imgBadge.style.padding = '2px 5px';
                imgBadge.style.fontSize = '10px';
                imgBadge.style.color = '#38bdf8';
                imgBadge.style.borderColor = 'rgba(56,189,248,0.3)';
                imgBadge.textContent = `🖼️ ${imgCount}`;
                right.appendChild(imgBadge);
            }

            // Edit Prose Button
            const editBtn = document.createElement('button');
            editBtn.type = 'button';
            editBtn.className = 'tl-btn accent';
            editBtn.style.padding = '4px 10px';
            editBtn.style.fontSize = '11.5px';
            editBtn.textContent = '✏️ Edit';
            editBtn.title = 'Open chapter prose & image editor';
            editBtn.onclick = () => openChapterModal(idx);
            right.appendChild(editBtn);

            // Delete Chapter Button
            const delBtn = document.createElement('button');
            delBtn.type = 'button';
            delBtn.className = 'tl-btn danger';
            delBtn.style.padding = '4px 8px';
            delBtn.style.fontSize = '11.5px';
            delBtn.textContent = '✕';
            delBtn.title = 'Remove chapter';
            delBtn.onclick = () => {
                if (confirm(`Delete "${ch.title}"?`)) {
                    state.chapters.splice(idx, 1);
                    renderChapterList();
                    updateStats();
                }
            };
            right.appendChild(delBtn);

            row.appendChild(right);
            frag.appendChild(row);
        });

        list.appendChild(frag);
    }

    // ── Chapter Prose & Image Modal Logic ──
    let modalActiveIdx = 0;
    let isPreviewMode = false;

    function openChapterModal(idx) {
        if (idx < 0 || idx >= state.chapters.length) return;
        modalActiveIdx = idx;
        isPreviewMode = false;

        const ch = state.chapters[idx];
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
        }
        if (preview) preview.classList.add('hidden');

        if (prevBtn) prevBtn.disabled = idx === 0;
        if (nextBtn) nextBtn.disabled = idx >= state.chapters.length - 1;

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

        if (modalTitle) ch.title = modalTitle.value.trim() || `Chapter ${modalActiveIdx + 1}`;
        if (modalLevel) ch.level = parseInt(modalLevel.value, 10) || 1;
        if (textarea) ch.content = textarea.value;

        ch.words = countWords(ch.content);
        ch.images = extractImagesFromContent(ch.content);

        renderChapterList();
        updateStats();
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
            const card = document.createElement('div');
            card.className = 'flex items-center gap-1.5 p-1 rounded bg-black/40 border border-slate-700/60 shrink-0';
            card.innerHTML = `
                <img src="${imgUrl}" style="width:36px; height:36px; object-fit:cover; border-radius:4px;" />
                <div class="flex flex-col gap-1">
                    <button type="button" class="chip-act" style="padding:1px 4px; font-size:9px; color:#fbbf24;" title="Set as Book Cover">👑 Cover</button>
                    <button type="button" class="chip-act danger" style="padding:1px 4px; font-size:9px;" title="Remove image from chapter">✕ Delete</button>
                </div>
            `;

            // Cover button
            card.querySelectorAll('button')[0].onclick = () => {
                state.coverUrl = imgUrl;
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
    function openGalleryModal() {
        const modal = document.getElementById('edit-gallery-modal');
        const grid = document.getElementById('edit-gallery-grid');
        const totalSpan = document.getElementById('edit-gallery-total');
        if (!modal || !grid) return;

        grid.innerHTML = '';
        const allImagesMap = new Map();

        // 1. Gather images from book repository
        state.imageRepository.forEach((entry, key) => {
            allImagesMap.set(entry.dataUrl || key, {
                url: entry.dataUrl || key,
                name: entry.name || key,
                mime: entry.mime || 'image/jpeg'
            });
        });

        // 2. Gather images embedded in chapter contents
        state.chapters.forEach((ch, chIdx) => {
            (ch.images || []).forEach(imgUrl => {
                if (!allImagesMap.has(imgUrl)) {
                    allImagesMap.set(imgUrl, {
                        url: imgUrl,
                        name: `Chapter ${chIdx + 1} Illustration`,
                        mime: 'image/jpeg'
                    });
                }
            });
        });

        // 3. Current cover
        if (state.coverUrl && !allImagesMap.has(state.coverUrl)) {
            allImagesMap.set(state.coverUrl, {
                url: state.coverUrl,
                name: 'Book Cover',
                mime: 'image/jpeg'
            });
        }

        const items = Array.from(allImagesMap.values());
        if (totalSpan) totalSpan.textContent = `${items.length} illustrations total`;

        if (items.length === 0) {
            grid.innerHTML = `<div class="col-span-4 text-center py-12 italic text-xs" style="color:var(--slate);">No illustrations in this book yet. Click "➕ Upload New Illustration" to add some!</div>`;
        } else {
            items.forEach((item, idx) => {
                const isCover = state.coverUrl && (state.coverUrl === item.url);
                const card = document.createElement('div');
                card.className = 'flex flex-col rounded-xl overflow-hidden border border-slate-800 bg-slate-900/60 transition-all hover:border-indigo-500/50';
                card.innerHTML = `
                    <div style="height:140px; background:#08090C; display:flex; align-items:center; justify-content:center; overflow:hidden; position:relative;">
                        <img src="${item.url}" style="width:100%; height:100%; object-fit:contain;" alt="${escapeXml(item.name)}" />
                        ${isCover ? '<span class="absolute top-2 left-2 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500 text-black">👑 COVER</span>' : ''}
                    </div>
                    <div class="p-2.5 flex flex-col gap-1.5" style="border-top:1px solid var(--hairline); background:var(--ember-2);">
                        <span class="text-[11px] font-mono truncate" style="color:var(--paper);">${escapeXml(item.name)}</span>
                        <div class="flex items-center gap-1.5 pt-1">
                            <button type="button" class="chip-act shrink-0 text-[10px] set-cover-btn" style="color:#fbbf24;">👑 Cover</button>
                            <button type="button" class="chip-act shrink-0 text-[10px] dl-btn">📥 Download</button>
                            <button type="button" class="chip-act danger shrink-0 text-[10px] del-btn">✕</button>
                        </div>
                    </div>
                `;

                // Set as Cover
                card.querySelector('.set-cover-btn').onclick = () => {
                    state.coverUrl = item.url;
                    updateCoverPreview();
                    openGalleryModal(); // re-render to update badge
                    if (typeof window.toast === 'function') window.toast('Updated book cover!', 'success');
                };

                // Download image
                card.querySelector('.dl-btn').onclick = () => {
                    const a = document.createElement('a');
                    a.href = item.url;
                    a.download = item.name || `illustration_${idx + 1}.jpg`;
                    a.click();
                };

                // Delete image
                card.querySelector('.del-btn').onclick = () => {
                    if (confirm(`Remove this illustration from book?`)) {
                        allImagesMap.delete(item.url);
                        state.imageRepository.delete(item.url);
                        if (state.coverUrl === item.url) state.coverUrl = '';
                        // Remove from chapters
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
        }

        modal.classList.remove('hidden');
    }

    // ── Global Find & Replace Logic ──
    function openFindReplaceModal() {
        const modal = document.getElementById('edit-find-replace-modal');
        const findIn = document.getElementById('edit-find-input');
        const replaceIn = document.getElementById('edit-replace-input');
        const countSpan = document.getElementById('edit-find-matches-count');
        if (countSpan) countSpan.textContent = '0 occurrences';
        modal?.classList.remove('hidden');
        findIn?.focus();

        const updateCount = () => {
            const query = findIn?.value || '';
            const caseSens = document.getElementById('edit-find-case-sensitive')?.checked;
            if (!query) {
                if (countSpan) countSpan.textContent = '0 occurrences';
                return;
            }
            let total = 0;
            const flags = caseSens ? 'g' : 'gi';
            const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const regex = new RegExp(escaped, flags);
            state.chapters.forEach(c => {
                const matches = (c.content || '').match(regex);
                if (matches) total += matches.length;
            });
            if (countSpan) countSpan.textContent = `${total} occurrence${total === 1 ? '' : 's'}`;
        };

        if (findIn) findIn.oninput = updateCount;
        document.getElementById('edit-find-case-sensitive').onchange = updateCount;
    }

    function doGlobalReplace() {
        const findIn = document.getElementById('edit-find-input');
        const replaceIn = document.getElementById('edit-replace-input');
        const query = findIn?.value || '';
        const replacement = replaceIn?.value || '';
        const caseSens = document.getElementById('edit-find-case-sensitive')?.checked;

        if (!query) return;

        const flags = caseSens ? 'g' : 'gi';
        const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(escaped, flags);

        let replacedCount = 0;
        let affectedChapters = 0;

        state.chapters.forEach(c => {
            const matches = (c.content || '').match(regex);
            if (matches && matches.length > 0) {
                replacedCount += matches.length;
                affectedChapters++;
                c.content = c.content.replace(regex, replacement);
                c.words = countWords(c.content);
            }
        });

        document.getElementById('edit-find-replace-modal')?.classList.add('hidden');
        renderChapterList();
        updateStats();

        if (typeof window.toast === 'function') {
            window.toast(`Replaced ${replacedCount} occurrences across ${affectedChapters} chapters!`, 'success');
        }
    }

    // ── Auto-Numbering Logic ──
    function doAutoNumber() {
        const style = document.getElementById('edit-autonumber-style')?.value || 'prefix';
        const start = parseInt(document.getElementById('edit-autonumber-start')?.value, 10) || 1;

        state.chapters.forEach((ch, i) => {
            const num = start + i;
            if (style === 'simple') {
                ch.title = `Chapter ${num}`;
            } else if (style === 'decimal') {
                ch.title = `1.${num}`;
            } else {
                // Strip existing leading chapter numbers
                let clean = ch.title.replace(/^(?:Chapter|\bCh\b)?\s*\d+[\s:\.\-]+/i, '').trim();
                ch.title = `Chapter ${num} - ${clean || 'Untitled'}`;
            }
        });

        document.getElementById('edit-autonumber-modal')?.classList.add('hidden');
        renderChapterList();
        if (typeof window.toast === 'function') {
            window.toast(`Auto-numbered ${state.chapters.length} chapters!`, 'success');
        }
    }

    // ── Save to IndexedDB Library & Reader Sync ──
    async function saveEditedBookToLibrary() {
        if (!window.GeminiNovelDB) {
            alert('Novel Database is not available.');
            return;
        }

        // Sync metadata inputs
        state.title = document.getElementById('edit-book-title')?.value.trim() || state.title || 'Novel';
        state.author = document.getElementById('edit-book-author')?.value.trim() || state.author || 'Author';
        state.series = document.getElementById('edit-book-series')?.value.trim() || '';
        state.lang = document.getElementById('edit-book-lang')?.value.trim() || 'en';
        state.description = document.getElementById('edit-book-desc')?.value.trim() || '';

        const novelId = 'novel_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
        const totalWords = state.chapters.reduce((acc, c) => acc + (c.words || 0), 0);

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
            chapterCount: state.chapters.length,
            isEdited: true,
            isTranslated: true,
            translatedChapters: state.chapters.map(c => ({
                title: c.title,
                content: c.content,
                level: c.level || 1,
                words: c.words || countWords(c.content)
            }))
        };

        const success = await window.GeminiNovelDB.saveNovel(record);
        if (success) {
            if (typeof window.toast === 'function') {
                window.toast(`✓ Saved "${state.title}" to Library!`, 'success');
            }
            // Update library view if open
            if (typeof window.loadSavedNovels === 'function') {
                window.loadSavedNovels();
            }
        } else {
            alert('Failed to save novel to database.');
        }
    }

    // ── Export Clean EPUB File ──
    async function exportCleanEpub() {
        if (!state.chapters || state.chapters.length === 0) {
            alert('No chapters to export.');
            return;
        }

        if (typeof window.generateEpubFromChapters !== 'function') {
            alert('EPUB packaging engine is not available.');
            return;
        }

        // Sync metadata
        state.title = document.getElementById('edit-book-title')?.value.trim() || state.title || 'Novel';
        state.author = document.getElementById('edit-book-author')?.value.trim() || state.author || 'Author';
        state.lang = document.getElementById('edit-book-lang')?.value.trim() || 'en';

        const btnExport = document.getElementById('btn-edit-export-epub');
        if (btnExport) {
            btnExport.disabled = true;
            btnExport.textContent = '⏳ Packaging…';
        }

        try {
            const chaptersForPackaging = state.chapters.map((c, i) => ({
                id: c.id || `ch_${i + 1}`,
                title: c.title,
                content: c.content,
                level: c.level || 1,
                words: c.words || countWords(c.content)
            }));

            const opts = {
                coverUrl: state.coverUrl,
                cover: state.coverUrl,
                hierarchicalToc: true
            };

            const blob = await window.generateEpubFromChapters(
                chaptersForPackaging,
                state.title,
                state.author,
                state.lang,
                (status, pct) => {
                    if (btnExport) btnExport.textContent = `⏳ ${pct}%`;
                },
                opts
            );

            const fileName = `${state.title} - ${state.chapters.length} Chapters.epub`.replace(/[\\/:*?"<>|]/g, '_');

            if (typeof window.saveUniversalBlob === 'function') {
                await window.saveUniversalBlob(blob, fileName, 'application/epub+zip', false);
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
            alert('Failed to package EPUB: ' + err.message);
        } finally {
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

        // Quick Toolbar Actions
        document.getElementById('btn-edit-sanitize-titles')?.addEventListener('click', () => {
            let count = 0;
            state.chapters.forEach((c, idx) => {
                const cleaned = cleanTitle(c.title, idx + 1);
                if (cleaned !== c.title) {
                    c.title = cleaned;
                    count++;
                }
            });
            renderChapterList();
            if (typeof window.toast === 'function') window.toast(`Sanitized ${count} chapter titles!`, 'success');
        });

        document.getElementById('btn-edit-auto-number')?.addEventListener('click', () => {
            document.getElementById('edit-autonumber-modal')?.classList.remove('hidden');
        });
        document.getElementById('btn-edit-do-autonumber')?.addEventListener('click', doAutoNumber);

        document.getElementById('btn-edit-find-replace')?.addEventListener('click', openFindReplaceModal);
        document.getElementById('btn-edit-do-replace')?.addEventListener('click', doGlobalReplace);

        document.getElementById('btn-edit-gallery')?.addEventListener('click', openGalleryModal);
        document.getElementById('btn-edit-gallery-upload-new')?.addEventListener('click', () => chImgInput?.click());

        // Add Chapter
        document.getElementById('btn-edit-add-chapter')?.addEventListener('click', () => {
            const newIdx = state.chapters.length + 1;
            const newCh = {
                id: 'ch_' + newIdx,
                title: `Chapter ${newIdx}`,
                originalTitle: `Chapter ${newIdx}`,
                level: 1,
                content: '',
                words: 0,
                images: []
            };
            state.chapters.push(newCh);
            renderChapterList();
            updateStats();
            openChapterModal(state.chapters.length - 1);
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
                updateModalWordCount();
                if (typeof window.toast === 'function') window.toast('Cleaned paragraph spacing!', 'info');
            }
        });

        // Modal: Preview Toggle
        document.getElementById('btn-edit-modal-preview-toggle')?.addEventListener('click', () => {
            const textarea = document.getElementById('edit-ch-modal-textarea');
            const preview = document.getElementById('edit-ch-modal-preview');
            const btn = document.getElementById('btn-edit-modal-preview-toggle');
            if (!textarea || !preview) return;

            isPreviewMode = !isPreviewMode;
            if (isPreviewMode) {
                textarea.classList.add('hidden');
                preview.classList.remove('hidden');
                if (btn) btn.textContent = '✏️ Edit Markdown';

                // Render preview
                const raw = textarea.value || '';
                const paras = raw.split(/\n\s*\n/);
                const htmlParts = [];
                paras.forEach(p => {
                    let trimmed = p.trim();
                    if (!trimmed) return;
                    if (trimmed === '---' || trimmed === '***') {
                        htmlParts.push('<hr style="border:none; border-top:1px solid var(--hairline); margin:24px 0;" />');
                    } else if (/^#{1,6}\s+/.test(trimmed)) {
                        htmlParts.push(`<h3 style="font-weight:700; color:var(--paper); margin:16px 0 8px;">${escapeXml(trimmed.replace(/^#+\s+/, ''))}</h3>`);
                    } else if (/!\[(.*?)\]\((.*?)\)/.test(trimmed)) {
                        const m = trimmed.match(/!\[(.*?)\]\((.*?)\)/);
                        htmlParts.push(`<div style="text-align:center; margin:18px 0;"><img src="${m[2]}" alt="${escapeXml(m[1])}" style="max-width:100%; max-height:400px; border-radius:8px; margin:0 auto; display:inline-block;" /><p style="font-size:11px; color:var(--slate); margin-top:4px;">${escapeXml(m[1])}</p></div>`);
                    } else {
                        htmlParts.push(`<p style="margin-bottom:14px; text-indent:1.5em;">${escapeXml(trimmed)}</p>`);
                    }
                });
                preview.innerHTML = htmlParts.join('\n');
            } else {
                preview.classList.add('hidden');
                textarea.classList.remove('hidden');
                if (btn) btn.textContent = '👁️ Preview HTML';
            }
        });

        // Modal: Word count on textarea typing
        document.getElementById('edit-ch-modal-textarea')?.addEventListener('input', updateModalWordCount);

        // Modal: Insert Image file picker
        document.getElementById('btn-edit-modal-insert-img')?.addEventListener('click', () => chImgInput?.click());
        chImgInput?.addEventListener('change', (e) => {
            if (e.target.files && e.target.files[0]) {
                const file = e.target.files[0];
                const reader = new FileReader();
                reader.onload = () => {
                    const dataUrl = reader.result;
                    const imgName = file.name || `image_${Date.now()}.jpg`;
                    state.imageRepository.set(imgName, { dataUrl, mime: file.type, name: imgName });

                    const textarea = document.getElementById('edit-ch-modal-textarea');
                    if (textarea) {
                        const start = textarea.selectionStart || textarea.value.length;
                        const end = textarea.selectionEnd || textarea.value.length;
                        const mdImg = `\n\n![Illustration](${dataUrl})\n\n`;
                        textarea.value = textarea.value.substring(0, start) + mdImg + textarea.value.substring(end);
                        textarea.selectionStart = textarea.selectionEnd = start + mdImg.length;
                        textarea.focus();

                        const ch = state.chapters[modalActiveIdx];
                        if (ch) {
                            ch.content = textarea.value;
                            ch.images = extractImagesFromContent(ch.content);
                            renderInChapterImages(ch);
                        }
                        updateModalWordCount();
                        if (typeof window.toast === 'function') window.toast('Inserted image into chapter!', 'success');
                    }
                };
                reader.readAsDataURL(file);
            }
        });
    }

    // ── Global Exports ──
    if (typeof window !== 'undefined') {
        window.editHtml = editHtml;
        window.initEpubEditor = initEpubEditor;
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
