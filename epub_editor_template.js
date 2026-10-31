// ══════════════════════════════════════════════════════════════════════
// GEMINI TRANSLATOR - EPUB STUDIO & EDITOR HTML TEMPLATE
// Fluid, spacious, modern UI layout for EPUB Studio workspace & modals
// ══════════════════════════════════════════════════════════════════════
(function(root) {
  'use strict';

    const editHtml = `
    <div id="epub-edit-tab" class="stu-page-container" style="width:100%; padding-bottom: calc(120px + env(safe-area-inset-bottom, 24px));">
        <input type="file" id="edit-epub-input" accept="*/*,.epub" class="hidden" onchange="if(this.files && this.files[0]) { if(window.loadEpubForEditing) window.loadEpubForEditing(this.files[0]); else if(window.EpubEditorPacker?.parseEpubFile) window.EpubEditorPacker.parseEpubFile(this.files[0]); }" />
        <input type="file" id="edit-cover-file-input" accept="image/jpeg,image/png,image/webp,image/gif" class="hidden" />
        <input type="file" id="edit-chapter-img-input" accept="image/jpeg,image/png,image/webp,image/gif" class="hidden" />

        <!-- 1. EMPTY / HERO DROP ZONE -->
        <div id="edit-upload-section" class="stu-drop-canvas"
             ondragover="event.preventDefault(); this.classList.add('stu-drop-active');"
             ondragleave="this.classList.remove('stu-drop-active');"
             ondrop="event.preventDefault(); this.classList.remove('stu-drop-active'); if(event.dataTransfer.files.length>0) window.loadEpubForEditing(event.dataTransfer.files[0]);">
            <div class="stu-drop-icon-wrap">
                <svg xmlns="http://www.w3.org/2000/svg" width="34" height="34" viewBox="0 0 24 24" fill="none"
                     stroke="#38bdf8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M12 20h9" />
                    <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                </svg>
            </div>
            <div id="edit-loading-spinner" class="hidden w-10 h-10 border-4 border-t-transparent rounded-full animate-spin"
                 style="border-color: #38bdf8; border-top-color: transparent; margin: 0 auto 16px;"></div>
            <h3 id="edit-upload-title" class="stu-drop-title">
                Open EPUB Book in Studio Editor
            </h3>
            <p id="edit-upload-desc" class="stu-drop-subtitle">
                Drop your .epub file here, select from your device storage, or load directly from your saved library
            </p>
            <div class="stu-drop-actions">
                <button type="button" id="btn-edit-pick-file" class="stu-btn-radiant-sky" onclick="document.getElementById('edit-epub-input')?.click();">Select EPUB File</button>
                <button type="button" id="btn-edit-load-library" class="stu-btn-glass" onclick="if(window.openEpubEditorLibraryPicker) window.openEpubEditorLibraryPicker(); else if(window.initEpubEditor) { window.initEpubEditor(); window.openEpubEditorLibraryPicker?.(); }">Load from Saved Library</button>
            </div>
            <div id="edit-load-progress-wrapper" class="hidden w-full max-w-sm mx-auto mt-6">
                <div class="flex justify-between text-xs mb-1.5 font-semibold" style="color: var(--slate);">
                    <span id="edit-load-status">Extracting Chapters & Assets…</span>
                    <span id="edit-load-percent" class="font-mono">0%</span>
                </div>
                <div class="w-full rounded-full h-2.5 overflow-hidden" style="background: rgba(255,255,255,0.06);">
                    <div id="edit-load-progress-bar" class="h-2.5 rounded-full transition-all duration-200 ease-out"
                         style="width: 0%; background: linear-gradient(90deg, #38bdf8, #818cf8);"></div>
                </div>
            </div>
        </div>

        <!-- 2. MAIN ACTIVE WORKSPACE (Hidden until book loaded) -->
        <div id="edit-workspace" class="hidden">
            <!-- Book Metadata & Cover Bar: Apple Books Hero Inspector -->
            <div class="stu-hero-card">
                <!-- Cover Card & Studio Actions -->
                <div class="stu-cover-column">
                    <div id="edit-cover-preview" class="stu-book-cover" title="Click to change book cover">
                        <span style="font-size:12px; color:var(--slate); font-weight:600; text-align:center; padding:12px;">No Cover</span>
                    </div>
                    <div class="stu-cover-btn-deck">
                        <button type="button" id="btn-edit-change-cover" class="stu-chip-btn">Upload</button>
                        <button type="button" id="btn-edit-svg-cover" class="stu-chip-btn" title="Generate clean typography SVG cover">Make Cover</button>
                        <button type="button" id="btn-edit-remove-cover" class="stu-chip-btn danger">Remove</button>
                    </div>
                </div>

                <!-- Metadata Inputs -->
                <div class="stu-metadata-column">
                    <div class="stu-field-group">
                        <label class="stu-field-label">Book Title</label>
                        <input type="text" id="edit-book-title" placeholder="Book Title" class="stu-title-input">
                    </div>
                    <div class="stu-meta-triplet">
                        <div class="stu-field-group" style="flex:1; min-width:140px;">
                            <label class="stu-field-label">Author</label>
                            <input type="text" id="edit-book-author" placeholder="Author" class="stu-text-input">
                        </div>
                        <div class="stu-field-group" style="flex:1; min-width:140px;">
                            <label class="stu-field-label">Series / Arc</label>
                            <input type="text" id="edit-book-series" placeholder="Optional Series Name" class="stu-text-input">
                        </div>
                        <div class="stu-field-group" style="width:110px;">
                            <label class="stu-field-label">Language</label>
                            <input type="text" id="edit-book-lang" value="en" class="stu-text-input" style="text-align:center;">
                        </div>
                    </div>
                    <div class="stu-field-group">
                        <label class="stu-field-label">Description / Synopsis</label>
                        <textarea id="edit-book-desc" rows="2" placeholder="Book description or synopsis…" class="stu-textarea"></textarea>
                    </div>
                    <!-- Live Statistics Bar -->
                    <div id="edit-stats-bar" class="stu-stats-bar">
                        <span id="edit-stat-ch-count" class="stu-stat-pill sky">0 chapters</span>
                        <span id="edit-stat-words" class="stu-stat-pill">0 words</span>
                        <span id="edit-stat-images" class="stu-stat-pill">0 images</span>
                    </div>
                </div>
            </div>

            <!-- Command Action Deck -->
            <div class="stu-action-deck">
                <div class="stu-tools-cluster">
                    <button type="button" id="btn-edit-sanitize-titles" class="stu-tool-btn" title="Strip scraped tags, website names, and duplicate prefixes from all chapter titles">
                        Sanitize Titles
                    </button>
                    <button type="button" id="btn-edit-auto-number" class="stu-tool-btn" title="Renumber chapters sequentially (e.g. Chapter 1 - [Title])">
                        Auto-Number
                    </button>
                    <button type="button" id="btn-edit-auto-hierarchy" class="stu-tool-btn" title="Automatically detect volume dividers and nest chapters into a collapsible tree">
                        Auto-Hierarchy
                    </button>
                    <button type="button" id="btn-edit-find-replace" class="stu-tool-btn" title="Search and replace across all chapters">
                        Find & Replace
                    </button>
                    <button type="button" id="btn-edit-gallery" class="stu-tool-btn" title="View all illustrations in book, set cover, or download">
                        Image Gallery
                    </button>
                    <button type="button" id="btn-edit-add-chapter" class="stu-tool-btn accent" title="Add a new chapter">
                        + Add Chapter
                    </button>
                </div>
                <div class="stu-exec-cluster">
                    <button type="button" id="btn-edit-save-library" class="stu-btn-radiant-emerald" title="Save edited book to IndexedDB library and sync with Reader">
                        Save to Library
                    </button>
                    <button type="button" id="btn-edit-export-epub" class="stu-btn-radiant-sky" title="Download packaged clean EPUB file to device">
                        Export EPUB
                    </button>
                </div>
            </div>

            <!-- Chapter TOC & Hierarchy Section -->
            <div class="stu-toc-section">
                <div class="stu-toc-header">
                    <div class="stu-toc-headline-cluster">
                        <h2 class="stu-section-title">Table of Contents & Hierarchy</h2>
                        <span id="edit-toc-badge" class="stu-badge-sky">0 Chapters</span>
                        <button type="button" id="btn-edit-open-toc-manager" class="stu-chip-btn accent" title="Open full Table of Contents editor to edit titles, levels, and order">
                            Edit TOC
                        </button>
                        <button type="button" id="btn-edit-flatten-all" class="stu-chip-btn ghost" title="Reset all chapters to standard normal flat chapters in 1 tap">
                            Flatten All
                        </button>
                    </div>
                    <div class="stu-toc-filter-cluster">
                        <input type="text" id="edit-toc-filter" placeholder="Filter chapters…" class="stu-filter-input">
                        <button type="button" id="btn-edit-reset-book" class="stu-chip-btn ghost">Close Book</button>
                    </div>
                </div>

                <!-- Chapters List Container -->
                <div id="edit-chapter-list" class="stu-chapter-list custom-scrollbar">
                    <!-- Dynamically populated rows -->
                </div>
            </div>
        </div>

        <!-- ═══ MODAL 1: CHAPTER PROSE & IN-CHAPTER IMAGE EDITOR ═══ -->
        <div id="edit-chapter-modal" class="hidden stu-modal-overlay"
             onclick="if(event.target===this) (window.requestCloseChapterModal ? window.requestCloseChapterModal() : this.classList.add('hidden'));">
            <div class="stu-modal-sheet max-w-4xl h-full sm:h-[90dvh]">
                <!-- Modal Top Header -->
                <div class="stu-modal-header" style="display:flex; flex-direction:column; gap:8px; padding:12px 18px;">
                    <div class="flex items-center justify-between gap-3 w-full">
                        <div class="flex items-center gap-2.5 flex-1 min-w-0">
                            <span id="edit-ch-modal-idx" class="stu-badge-idx shrink-0">#1</span>
                            <input type="text" id="edit-ch-modal-title" placeholder="Chapter Title" class="stu-modal-title-input min-w-0 flex-1">
                        </div>
                        <button type="button" onclick="window.closeChapterModalDirect ? window.closeChapterModalDirect() : (window.requestCloseChapterModal ? window.requestCloseChapterModal() : document.getElementById('edit-chapter-modal').classList.add('hidden'))"
                                class="stu-modal-close-btn shrink-0" title="Close" style="width:38px; height:38px; font-size:22px; line-height:1; display:flex; align-items:center; justify-content:center; border-radius:10px; z-index:10;">&times;</button>
                    </div>
                    <!-- Level Switcher Sub-Bar -->
                    <div class="flex items-center gap-2.5 text-xs" style="color:var(--slate);">
                        <span class="font-medium text-slate-300 shrink-0">Hierarchy Level:</span>
                        <select id="edit-ch-modal-level" class="stu-modal-select" style="padding:4px 10px; font-size:12px; height:32px;">
                            <option value="1">Main Chapter (Level 1)</option>
                            <option value="2">Sub-Chapter (Level 2)</option>
                        </select>
                    </div>
                </div>

                <!-- Modal Sub-Toolbar (Prose Editor Mode) -->
                <div id="edit-ch-modal-subtoolbar" class="stu-modal-subtoolbar">
                    <div class="flex items-center gap-2 flex-wrap">
                        <!-- Group 1: Typography Formatting -->
                        <div class="stu-toolbar-btn-group">
                            <button type="button" id="fmt-btn-bold" class="stu-tb-btn" title="Bold (Ctrl+B)"><b>B</b></button>
                            <button type="button" id="fmt-btn-italic" class="stu-tb-btn italic" title="Italic (Ctrl+I)"><i>I</i></button>
                            <button type="button" id="fmt-btn-underline" class="stu-tb-btn underline" title="Underline (Ctrl+U)"><u>U</u></button>
                            <button type="button" id="fmt-btn-strike" class="stu-tb-btn line-through" title="Strikethrough"><s>S</s></button>
                        </div>

                        <!-- Group 2: Headings & Blocks -->
                        <div class="stu-toolbar-btn-group">
                            <button type="button" id="fmt-btn-h2" class="stu-tb-btn font-bold" title="Scene Subheading (H2)">H2</button>
                            <button type="button" id="fmt-btn-h3" class="stu-tb-btn font-bold" title="Minor Heading (H3)">H3</button>
                            <button type="button" id="fmt-btn-quote" class="stu-tb-btn" title="Quote / Monologue / Thought">Quote</button>
                            <button type="button" id="fmt-btn-center" class="stu-tb-btn" title="Center Text (Letters, Poems, Statuses)">Center</button>
                        </div>

                        <!-- Group 3: Spacing & Breaks -->
                        <div class="stu-toolbar-btn-group">
                            <button type="button" id="fmt-btn-divider" class="stu-tb-btn" title="Scene Divider">Break</button>
                            <button type="button" id="fmt-btn-spacer" class="stu-tb-btn text-sky-400" title="Extra Paragraph Spacing (Guaranteed Blank Line)">Spacer</button>
                            <button type="button" id="btn-edit-modal-clean-spacing" class="stu-tb-btn" title="Clean extra blank lines & trailing spaces">Clean</button>
                        </div>

                        <!-- Group 4: Illustration Picker & History -->
                        <div class="stu-toolbar-btn-group">
                            <button type="button" id="btn-edit-modal-insert-img" class="stu-tb-btn text-indigo-300 font-semibold" title="Insert Book Illustration or Upload New Image">Illustration</button>
                            <button type="button" id="btn-edit-modal-undo" class="stu-tb-btn" title="Undo (Ctrl+Z)">Undo</button>
                            <button type="button" id="btn-edit-modal-redo" class="stu-tb-btn" title="Redo (Ctrl+Y)">Redo</button>
                        </div>

                        <button type="button" id="btn-edit-modal-preview-toggle" class="stu-chip-btn accent font-bold">
                            Preview HTML
                        </button>
                    </div>
                    <div class="flex items-center gap-3 font-mono text-[11.5px]" style="color:var(--slate);">
                        <span id="edit-modal-word-count">0 words</span> ·
                        <span id="edit-modal-char-count">0 chars</span>
                    </div>
                </div>

                <!-- Modal Preview Top Bar (Dedicated, ALWAYS visible when previewing) -->
                <div id="edit-ch-modal-preview-bar" class="hidden stu-modal-preview-bar">
                    <button type="button" id="btn-preview-back-to-edit" class="stu-btn-glass" style="padding:7px 18px; font-weight:700; font-size:13px; display:inline-flex; align-items:center; gap:6px;">
                        ← Back to Editor
                    </button>
                    <div class="flex items-center gap-3 text-xs" style="color:var(--slate);">
                        <span class="font-semibold text-slate-200">Chapter Preview</span>
                        <span id="preview-modal-word-count" class="font-mono text-[11px]"></span>
                    </div>
                </div>

                <!-- Modal Body (Textarea or Rendered Preview) -->
                <div class="flex-1 overflow-hidden relative flex flex-col" style="min-height:0; flex:1 1 0px; height:100%;">
                    <textarea id="edit-ch-modal-textarea"
                              placeholder="Type or paste chapter prose here… Markdown headings (# Title) and images (![Alt](url)) are supported."
                              class="stu-prose-textarea custom-scrollbar"></textarea>
                    <div id="edit-ch-modal-preview" class="hidden flex-1 overflow-y-auto custom-scrollbar font-serif text-base leading-relaxed"
                         style="color:var(--paper-dim); background:rgba(0,0,0,0.25); min-height:0; height:100%; flex:1 1 0px; -webkit-overflow-scrolling:touch; touch-action:pan-y; overscroll-behavior-y:contain; padding:24px 28px 100px 28px; position:relative;">
                        <div id="preview-html-content" style="max-width:100%; min-height:0;"></div>
                        <!-- Sticky floating return button inside preview container so user is never trapped -->
                        <div style="position:sticky; bottom:20px; display:flex; justify-content:flex-end; pointer-events:none; margin-top:24px;">
                            <button type="button" onclick="window.exitEpubEditorPreview ? window.exitEpubEditorPreview() : null"
                                    class="stu-btn-radiant-sky"
                                    style="pointer-events:auto; font-weight:700; font-size:13px; padding:10px 22px; border-radius:9999px; box-shadow:0 8px 24px rgba(0,0,0,0.7); display:inline-flex; align-items:center; gap:6px;">
                                ← Back to Editor
                            </button>
                        </div>
                    </div>
                </div>

                <!-- In-Chapter Illustration Gallery Tray -->
                <div id="edit-ch-modal-img-tray" class="stu-modal-img-tray custom-scrollbar">
                    <span class="text-[11px] font-bold shrink-0 text-slate-400">Chapter Images:</span>
                    <div id="edit-ch-modal-img-items" class="flex items-center gap-2.5">
                        <!-- Populated with in-chapter image thumbnails -->
                    </div>
                </div>

                <!-- Modal Footer -->
                <div class="stu-modal-footer">
                    <div class="flex gap-2">
                        <button type="button" id="btn-edit-modal-prev-ch" class="stu-chip-btn">← Previous Chapter</button>
                        <button type="button" id="btn-edit-modal-next-ch" class="stu-chip-btn">Next Chapter →</button>
                    </div>
                    <div class="flex gap-2.5">
                        <button type="button" onclick="window.requestCloseChapterModal ? window.requestCloseChapterModal() : document.getElementById('edit-chapter-modal').classList.add('hidden')" class="stu-chip-btn">Close</button>
                        <button type="button" id="btn-edit-modal-save" class="stu-btn-radiant-sky" style="padding:8px 22px;">Save Chapter</button>
                    </div>
                </div>
            </div>
        </div>

        <!-- ═══ MODAL 1.5: UNSAVED CHANGES CONFIRMATION DIALOG ═══ -->
        <div id="edit-unsaved-confirm-modal" class="hidden stu-modal-overlay" style="z-index:1010;"
             onclick="if(event.target===this) document.getElementById('edit-unsaved-confirm-modal').classList.add('hidden');">
            <div class="stu-modal-card max-w-sm text-center p-6" onclick="event.stopPropagation();">
                <div class="w-14 h-14 rounded-2xl mx-auto mb-3.5 flex items-center justify-center text-2xl font-bold"
                     style="background:rgba(245,158,11,0.15); color:#f59e0b;">!</div>
                <h4 class="text-base font-bold mb-1.5" style="color:var(--paper);">Unsaved Prose Changes</h4>
                <p class="text-xs mb-5 leading-relaxed" style="color:var(--slate);">You have modified chapter prose or title. Save your edits before closing?</p>
                <div class="flex flex-col gap-2.5">
                    <button type="button" id="btn-unsaved-save-close" class="stu-btn-radiant-emerald w-full justify-center">Save & Close</button>
                    <button type="button" id="btn-unsaved-discard" class="stu-chip-btn danger w-full justify-center" style="height:44px;">Discard Changes</button>
                    <button type="button" id="btn-unsaved-cancel" class="stu-chip-btn ghost w-full justify-center" style="height:40px;">Keep Editing</button>
                </div>
            </div>
        </div>

        <!-- ═══ MODAL 1.8: NOVEL ILLUSTRATION PICKER MODAL (INSERT INTO CHAPTER) ═══ -->
        <div id="edit-novel-image-picker-modal" class="hidden stu-modal-overlay" style="z-index:1005;"
             onclick="if(event.target===this) document.getElementById('edit-novel-image-picker-modal').classList.add('hidden');">
            <div class="stu-modal-sheet max-w-2xl max-h-[85vh]">
                <!-- Header -->
                <div class="stu-modal-header">
                    <div>
                        <h4 class="text-sm sm:text-base font-bold text-white">Insert Book Illustration</h4>
                        <p class="text-xs text-slate-400">Select an illustration already inside this novel or upload a new one</p>
                    </div>
                    <button type="button" onclick="document.getElementById('edit-novel-image-picker-modal').classList.add('hidden')"
                            class="stu-modal-close-btn" title="Close">&times;</button>
                </div>
                <!-- Body: Grid of existing images -->
                <div class="p-4 sm:p-5 overflow-y-auto custom-scrollbar flex-1" style="min-height:220px; max-height:60vh;">
                    <div class="mb-3.5 flex items-center justify-between">
                        <span id="novel-image-picker-count" class="text-xs font-semibold text-slate-400">0 images available</span>
                        <button type="button" id="btn-picker-upload-new" class="stu-chip-btn accent">
                            Upload from Device…
                        </button>
                    </div>
                    <div id="novel-image-picker-grid" class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3.5">
                        <!-- Populated dynamically with image cards -->
                    </div>
                </div>
            </div>
        </div>

        <!-- ═══ MODAL 2: BOOK-WIDE ILLUSTRATION GALLERY (FULLSCREEN) ═══ -->
        <div id="edit-gallery-modal" class="hidden fixed inset-0 z-[9999]" style="position:fixed; inset:0; z-index:9999; background:#0a0d14 !important; display:none; flex-direction:column; width:100%; height:100%; overflow:hidden;">
            <!-- Header Bar -->
            <div class="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-slate-800/80 bg-[#0c101a] shrink-0">
                <div class="flex items-center gap-3">
                    <div>
                        <div class="flex items-center gap-2.5">
                            <h3 class="font-bold text-base sm:text-lg text-white">Book Illustration & Cover Gallery</h3>
                            <span id="edit-gallery-total" class="text-xs px-2.5 py-0.5 rounded-full bg-slate-800 text-sky-300 border border-slate-700/60 font-mono">0 images</span>
                        </div>
                        <p class="text-xs text-slate-400 mt-0.5">View covers, chapter art, set book cover, or inspect full-size</p>
                    </div>
                </div>
                <div class="flex items-center gap-2.5">
                    <button type="button" id="btn-edit-gallery-upload-new" class="stu-chip-btn accent">Upload Image</button>
                    <button type="button" onclick="if(window.closeGalleryModal) window.closeGalleryModal(); else document.getElementById('edit-gallery-modal').style.display='none';"
                            class="stu-modal-close-btn" title="Close">&times;</button>
                </div>
            </div>

            <!-- Filter Tabs & Controls -->
            <div class="flex items-center justify-between px-4 sm:px-6 py-3 bg-[#0d121e] border-b border-slate-800/80 shrink-0 flex-wrap gap-2.5">
                <div class="flex items-center gap-2" id="gallery-filter-tabs">
                    <button type="button" class="gallery-tab active px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-sky-500/20 text-sky-200 border border-sky-500/30" data-filter="all">All Images</button>
                    <button type="button" class="gallery-tab px-3.5 py-1.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800" data-filter="covers">Covers</button>
                    <button type="button" class="gallery-tab px-3.5 py-1.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800" data-filter="chapters">Chapter Art</button>
                </div>
                <span class="text-xs text-slate-500 hidden sm:inline">Tap any image to view in fullscreen lightbox</span>
            </div>

            <!-- Fullscreen Gallery Grid (Portrait Aspect Ratio for Full Covers) -->
            <div id="edit-gallery-grid" class="p-4 sm:p-6 overflow-y-auto custom-scrollbar flex-1 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 sm:gap-5"
                 style="touch-action:pan-y; -webkit-overflow-scrolling:touch;">
                <!-- Dynamically populated with portrait aspect-ratio image cards -->
            </div>

            <!-- Footer Bar -->
            <div class="px-4 sm:px-6 py-3.5 flex items-center justify-between border-t border-slate-800/80 bg-[#0c101a] shrink-0" style="padding-bottom: max(16px, env(safe-area-inset-bottom, 16px));">
                <span class="text-xs text-slate-400 font-mono">100% original illustrations & covers preserved</span>
                <button type="button" onclick="if(window.closeGalleryModal) window.closeGalleryModal(); else document.getElementById('edit-gallery-modal').style.display='none';" class="stu-btn-radiant-sky" style="padding:8px 24px;">Done</button>
            </div>
        </div>

        <!-- ═══ MODAL 2B: FULLSCREEN IMAGE LIGHTBOX ═══ -->
        <div id="edit-gallery-lightbox" class="hidden fixed inset-0 z-[10000]"
             style="position:fixed; inset:0; z-index:10000; background:#000000 !important; display:none; flex-direction:column; align-items:center; justify-content:center; width:100%; height:100%; padding:14px;">
            <!-- Top bar -->
            <div class="w-full flex items-center justify-between py-3 px-4 text-white max-w-5xl shrink-0" style="background:transparent;">
                <span id="lightbox-img-name" class="font-mono text-xs sm:text-sm truncate text-slate-200 max-w-xs sm:max-w-md">image.jpg</span>
                <div class="flex items-center gap-2.5">
                    <button type="button" id="lightbox-set-cover-btn" class="stu-btn-radiant-sky text-xs" style="padding:7px 14px; height:36px;">Set as Book Cover</button>
                    <button type="button" id="lightbox-download-btn" class="stu-chip-btn text-xs" style="height:36px;">Download</button>
                    <button type="button" onclick="if(window.closeGalleryLightbox) window.closeGalleryLightbox(); else document.getElementById('edit-gallery-lightbox').style.display='none';"
                            class="stu-modal-close-btn" title="Close">&times;</button>
                </div>
            </div>
            <!-- Main image container -->
            <div class="flex-1 flex items-center justify-center w-full max-w-5xl overflow-hidden p-2" onclick="if(event.target===this && window.closeGalleryLightbox) window.closeGalleryLightbox();">
                <img id="lightbox-img" src="" alt="Fullscreen Illustration" class="max-w-full max-h-full object-contain rounded-xl shadow-2xl transition-transform duration-200" />
            </div>
            <!-- Bottom caption -->
            <div class="py-2.5 text-center text-xs text-slate-400 font-mono shrink-0" id="lightbox-img-meta">
                Tap outside to close
            </div>
        </div>

        <!-- ═══ MODAL 3: GLOBAL FIND & REPLACE ═══ -->
        <div id="edit-find-replace-modal" class="hidden stu-modal-overlay"
             onclick="if(event.target===this) document.getElementById('edit-find-replace-modal').classList.add('hidden');">
            <div class="stu-modal-card max-w-lg">
                <div class="stu-modal-header">
                    <h3 class="font-bold text-base text-white">Global Find & Replace</h3>
                    <button type="button" onclick="document.getElementById('edit-find-replace-modal').classList.add('hidden')"
                            class="stu-modal-close-btn" title="Close">&times;</button>
                </div>
                <div class="p-5 sm:p-6 space-y-4">
                    <div class="stu-field-group">
                        <label class="stu-field-label">Find</label>
                        <input type="text" id="edit-find-input" placeholder="Text to search…" class="stu-text-input">
                    </div>
                    <div class="stu-field-group">
                        <label class="stu-field-label">Replace With</label>
                        <input type="text" id="edit-replace-input" placeholder="Replacement text…" class="stu-text-input">
                    </div>
                    <div class="flex items-center justify-between pt-1 flex-wrap gap-2.5">
                        <div class="flex items-center gap-3.5 flex-wrap">
                            <label class="stu-check-label">
                                <input type="checkbox" id="edit-find-case-sensitive"> Match Case
                            </label>
                            <label class="stu-check-label">
                                <input type="checkbox" id="edit-find-regex"> Regular Expression (.*)
                            </label>
                            <label class="stu-check-label">
                                <input type="checkbox" id="edit-find-in-titles" checked> Also in Titles
                            </label>
                        </div>
                        <span id="edit-find-matches-count" class="text-xs font-mono font-semibold" style="color:#38bdf8;">0 occurrences</span>
                    </div>
                </div>
                <div class="stu-modal-footer">
                    <button type="button" onclick="document.getElementById('edit-find-replace-modal').classList.add('hidden')" class="stu-chip-btn">Cancel</button>
                    <button type="button" id="btn-edit-do-replace" class="stu-btn-radiant-sky">Replace in All Chapters</button>
                </div>
            </div>
        </div>

        <!-- ═══ MODAL 4: AUTO-NUMBERING ═══ -->
        <div id="edit-autonumber-modal" class="hidden stu-modal-overlay"
             onclick="if(event.target===this) document.getElementById('edit-autonumber-modal').classList.add('hidden');">
            <div class="stu-modal-card max-w-md">
                <div class="stu-modal-header">
                    <h3 class="font-bold text-base text-white">Auto-Number Chapters</h3>
                    <button type="button" onclick="document.getElementById('edit-autonumber-modal').classList.add('hidden')"
                            class="stu-modal-close-btn" title="Close">&times;</button>
                </div>
                <div class="p-5 sm:p-6 space-y-4">
                    <div class="stu-field-group">
                        <label class="stu-field-label">Format Style</label>
                        <select id="edit-autonumber-style" class="stu-select">
                            <option value="prefix">Chapter {N} - {Original Title}</option>
                            <option value="colon">Chapter {N}: {Original Title}</option>
                            <option value="simple">Chapter {N}</option>
                            <option value="numdot">{N}. {Original Title}</option>
                            <option value="decimal">1.{N} (Sub-Chapter / Light Novel)</option>
                        </select>
                    </div>
                    <div class="grid grid-cols-2 gap-3.5">
                        <div class="stu-field-group">
                            <label class="stu-field-label">Start Number</label>
                            <input type="number" id="edit-autonumber-start" value="1" min="0" class="stu-text-input">
                        </div>
                        <div class="stu-field-group">
                            <label class="stu-field-label">Padding</label>
                            <select id="edit-autonumber-pad" class="stu-select">
                                <option value="1">No Padding (1, 2, 3)</option>
                                <option value="2">2 Digits (01, 02, 03)</option>
                                <option value="3">3 Digits (001, 002, 003)</option>
                            </select>
                        </div>
                    </div>
                    <div class="space-y-2.5 pt-1">
                        <label class="stu-check-label">
                            <input type="checkbox" id="edit-autonumber-respect-sub" checked>
                            <span class="text-xs text-slate-300">Respect Sub-Chapters (e.g. Level 2 chapters)</span>
                        </label>
                        <label class="stu-check-label">
                            <input type="checkbox" id="edit-autonumber-skip-special" checked>
                            <span class="text-xs text-slate-300">Skip Prologue, Epilogue, Side Stories & Notes</span>
                        </label>
                    </div>
                </div>
                <div class="stu-modal-footer">
                    <button type="button" onclick="document.getElementById('edit-autonumber-modal').classList.add('hidden')" class="stu-chip-btn">Cancel</button>
                    <button type="button" id="btn-edit-do-autonumber" class="stu-btn-radiant-sky">Apply Auto-Numbering</button>
                </div>
            </div>
        </div>

        <!-- ═══ MODAL 5: LOAD FROM LIBRARY PICKER ═══ -->
        <div id="edit-library-modal" class="hidden stu-modal-overlay"
             onclick="if(event.target===this) document.getElementById('edit-library-modal').classList.add('hidden');">
            <div class="stu-modal-sheet max-w-2xl max-h-[85vh]">
                <div class="stu-modal-header">
                    <div>
                        <h3 class="font-bold text-base text-white">Choose Book from Saved Library</h3>
                        <p class="text-xs text-slate-400">Select an existing book in your local library to open in Studio</p>
                    </div>
                    <button type="button" onclick="document.getElementById('edit-library-modal').classList.add('hidden')"
                            class="stu-modal-close-btn" title="Close">&times;</button>
                </div>
                <div class="p-4 border-b border-white/5">
                    <input type="text" id="edit-lib-search" placeholder="Search library by title or author…" class="stu-filter-input w-full" style="width:100%;">
                </div>
                <div id="edit-library-items" class="p-4 sm:p-5 overflow-y-auto custom-scrollbar flex-1 space-y-2.5" style="max-height:55vh;">
                    <!-- Populated dynamically -->
                </div>
            </div>
        </div>

        <!-- ═══ MODAL 6: MOVE & HIERARCHY SHEET (MOBILE-FIRST) ═══ -->
        <div id="edit-move-chapter-modal" class="hidden stu-modal-overlay items-end sm:items-center"
             onclick="if(event.target===this) document.getElementById('edit-move-chapter-modal').classList.add('hidden');">
            <div class="stu-modal-sheet rounded-b-none sm:rounded-b-3xl max-w-md max-h-[85vh]">
                <div class="stu-modal-header">
                    <div>
                        <h3 id="edit-move-modal-title" class="font-bold text-sm text-white">Organize & Move Chapter</h3>
                        <p id="edit-move-modal-subtitle" class="text-xs truncate text-slate-400" style="max-width:280px;">Chapter</p>
                    </div>
                    <button type="button" onclick="document.getElementById('edit-move-chapter-modal').classList.add('hidden')"
                            class="stu-modal-close-btn" title="Close">&times;</button>
                </div>
                <div class="p-4 sm:p-5 space-y-4">
                    <div>
                        <div class="stu-field-label">Order in Book</div>
                        <div class="grid grid-cols-2 gap-2.5">
                            <button type="button" id="btn-move-sheet-up" class="stu-chip-btn w-full justify-center" style="height:44px; font-weight:600;">↑ Move Up</button>
                            <button type="button" id="btn-move-sheet-down" class="stu-chip-btn w-full justify-center" style="height:44px; font-weight:600;">↓ Move Down</button>
                            <button type="button" id="btn-move-sheet-top" class="stu-chip-btn w-full justify-center" style="height:44px; font-weight:600;">⤒ Move to Top</button>
                            <button type="button" id="btn-move-sheet-bottom" class="stu-chip-btn w-full justify-center" style="height:44px; font-weight:600;">⤓ Move to Bottom</button>
                        </div>
                    </div>
                    <div>
                        <div class="stu-field-label">TOC Hierarchy</div>
                        <div class="grid grid-cols-2 gap-2.5">
                            <button type="button" id="btn-move-sheet-level1" class="stu-chip-btn w-full justify-center" style="height:44px; font-weight:600;">↰ Normal Chapter</button>
                            <button type="button" id="btn-move-sheet-level2" class="stu-chip-btn w-full justify-center" style="height:44px; font-weight:600;">↳ Nested Sub-Chapter</button>
                        </div>
                    </div>
                    <div>
                        <div class="stu-field-label">In-Place Chapter Insertion</div>
                        <div class="grid grid-cols-2 gap-2.5">
                            <button type="button" id="btn-move-sheet-insert-above" class="stu-chip-btn accent w-full justify-center" style="height:44px; font-weight:600;">Insert Above</button>
                            <button type="button" id="btn-move-sheet-insert-below" class="stu-chip-btn accent w-full justify-center" style="height:44px; font-weight:600;">Insert Below</button>
                        </div>
                    </div>
                </div>
                <div class="stu-modal-footer">
                    <button type="button" onclick="document.getElementById('edit-move-chapter-modal').classList.add('hidden')" class="stu-btn-radiant-sky w-full justify-center">Done</button>
                </div>
            </div>
        </div>

        <!-- ═══ MODAL 7: RENAME CHAPTER MODAL (MOBILE-FIRST) ═══ -->
        <div id="edit-rename-modal" class="hidden stu-modal-overlay"
             onclick="if(event.target===this) document.getElementById('edit-rename-modal').classList.add('hidden');">
            <div class="stu-modal-card max-w-sm">
                <div class="stu-modal-header">
                    <h3 class="font-bold text-sm text-white">Rename Chapter</h3>
                    <button type="button" onclick="document.getElementById('edit-rename-modal').classList.add('hidden')"
                            class="stu-modal-close-btn" title="Close">&times;</button>
                </div>
                <div class="p-5 space-y-4">
                    <div class="stu-field-group">
                        <label class="stu-field-label">Chapter Title</label>
                        <input type="text" id="edit-rename-input" class="stu-text-input" style="font-size:15px; padding:12px 14px;">
                    </div>
                    <div class="flex gap-2.5 justify-end pt-2">
                        <button type="button" onclick="document.getElementById('edit-rename-modal').classList.add('hidden')" class="stu-chip-btn">Cancel</button>
                        <button type="button" id="btn-edit-rename-save" class="stu-btn-radiant-sky" style="padding:8px 20px;">Save Title</button>
                    </div>
                </div>
            </div>
        </div>

        <!-- ═══ MODAL 8: SANITIZE TITLES VISUAL PREVIEW MODAL ═══ -->
        <div id="edit-sanitize-preview-modal" class="hidden stu-modal-overlay"
             onclick="if(event.target===this) document.getElementById('edit-sanitize-preview-modal').classList.add('hidden');">
            <div class="stu-modal-sheet max-w-xl max-h-[85vh]">
                <!-- Header -->
                <div class="stu-modal-header">
                    <div>
                        <h3 class="font-bold text-base text-white">Sanitize Chapter Titles</h3>
                        <p id="sanitize-preview-subtitle" class="text-xs text-slate-400">Review proposed title cleanups</p>
                    </div>
                    <button type="button" onclick="document.getElementById('edit-sanitize-preview-modal').classList.add('hidden')"
                            class="stu-modal-close-btn" title="Close">&times;</button>
                </div>

                <!-- Diff Content List -->
                <div id="sanitize-preview-list" class="p-4 sm:p-5 overflow-y-auto custom-scrollbar flex-1 space-y-3" style="max-height:55vh;">
                    <!-- Populated dynamically with diffs -->
                </div>

                <!-- Footer -->
                <div class="stu-modal-footer">
                    <button type="button" onclick="document.getElementById('edit-sanitize-preview-modal').classList.add('hidden')" class="stu-chip-btn">Cancel</button>
                    <button type="button" id="btn-sanitize-apply-confirm" class="stu-btn-radiant-sky font-bold" style="padding:10px 22px;">Apply Clean Titles</button>
                </div>
            </div>
        </div>

        <!-- ═══ MODAL 9: AUTO-HIERARCHY VISUAL ASSISTANT MODAL ═══ -->
        <div id="edit-hierarchy-modal" class="hidden stu-modal-overlay"
             onclick="if(event.target===this) document.getElementById('edit-hierarchy-modal').classList.add('hidden');">
            <div class="stu-modal-sheet max-w-xl max-h-[85vh]">
                <!-- Header -->
                <div class="stu-modal-header">
                    <div>
                        <h3 class="font-bold text-base text-white">Auto-Hierarchy Assistant</h3>
                        <p id="hierarchy-modal-subtitle" class="text-xs text-slate-400">Organize book into collapsible volumes and sub-chapters</p>
                    </div>
                    <button type="button" onclick="document.getElementById('edit-hierarchy-modal').classList.add('hidden')"
                            class="stu-modal-close-btn" title="Close">&times;</button>
                </div>

                <!-- Detection Summary Banner -->
                <div id="hierarchy-modal-banner" class="px-5 py-3.5 flex items-center justify-between text-xs font-medium"
                     style="background:rgba(56,189,248,0.08); border-bottom:1px solid rgba(56,189,248,0.18); color:#bae6fd;">
                    <!-- Populated dynamically -->
                </div>

                <!-- Tree Preview -->
                <div id="hierarchy-modal-tree" class="p-4 sm:p-5 overflow-y-auto custom-scrollbar flex-1 space-y-2 text-xs" style="max-height:50vh; font-family:-apple-system,BlinkMacSystemFont,'Inter',sans-serif;">
                    <!-- Populated dynamically -->
                </div>

                <!-- Footer -->
                <div class="stu-modal-footer flex-wrap">
                    <button type="button" id="btn-hierarchy-flatten-all" class="stu-chip-btn ghost text-xs" style="color:var(--slate);" title="Reset all chapters to Level 1 flat main chapters">Flatten All (Level 1)</button>
                    <div class="flex items-center gap-2.5">
                        <button type="button" onclick="document.getElementById('edit-hierarchy-modal').classList.add('hidden')" class="stu-chip-btn">Cancel</button>
                        <button type="button" id="btn-hierarchy-apply-confirm" class="stu-btn-radiant-sky font-bold" style="padding:10px 22px;">Apply Hierarchy</button>
                    </div>
                </div>
            </div>
        </div>

        <!-- ═══ MODAL 10: FULL TABLE OF CONTENTS MANAGER MODAL ═══ -->
        <div id="edit-toc-manager-modal" class="hidden stu-modal-overlay"
             onclick="if(event.target===this) document.getElementById('edit-toc-manager-modal').classList.add('hidden');">
            <div class="stu-modal-sheet max-w-4xl w-full h-[88vh] sm:h-[88dvh] max-h-[88dvh]">
                <!-- Header -->
                <div class="stu-modal-header">
                    <div>
                        <h3 class="font-bold text-base text-white">Table of Contents Editor</h3>
                        <p id="toc-manager-subtitle" class="text-xs text-slate-400">Edit chapter titles, adjust hierarchy levels, and reorder chapters</p>
                    </div>
                    <button type="button" onclick="document.getElementById('edit-toc-manager-modal').classList.add('hidden')"
                            class="stu-modal-close-btn" title="Close">&times;</button>
                </div>

                <!-- Subtoolbar / Filter & Quick Actions -->
                <div class="px-5 py-3 flex items-center justify-between gap-3 shrink-0 flex-wrap"
                     style="background:rgba(0,0,0,0.2); border-bottom:1px solid rgba(255,255,255,0.06);">
                    <input type="text" id="toc-manager-search" placeholder="Search chapters in TOC…" class="stu-filter-input"
                           style="width:200px;">
                    <div class="flex items-center gap-2 flex-wrap">
                        <button type="button" id="btn-toc-manager-paste-titles" class="stu-chip-btn" title="Paste a list of titles from clipboard">Paste Titles</button>
                        <button type="button" id="btn-toc-manager-autonumber" class="stu-chip-btn" title="Renumber chapters sequentially">Renumber</button>
                        <button type="button" id="btn-toc-manager-flatten-all" class="stu-chip-btn ghost" title="Reset all chapters in TOC to normal flat chapters">Flatten All</button>
                    </div>
                </div>

                <!-- Scrollable TOC List -->
                <div id="toc-manager-rows" class="p-2 sm:p-4 overflow-y-auto custom-scrollbar flex-1" style="min-height:0;">
                    <!-- Dynamically populated rows with text inputs -->
                </div>

                <!-- Footer -->
                <div class="stu-modal-footer">
                    <button type="button" onclick="document.getElementById('edit-toc-manager-modal').classList.add('hidden')" class="stu-chip-btn">Cancel</button>
                    <button type="button" id="btn-toc-manager-save-all" class="stu-btn-radiant-emerald font-bold" style="padding:10px 24px;">Save TOC Changes</button>
                </div>
            </div>
        </div>
    </div>
    `;

  if (typeof window !== 'undefined') {
    window.editHtml = editHtml;
    window.EpubEditorTemplate = editHtml;
  }
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { editHtml };
  }
})(typeof self !== 'undefined' ? self : this);
