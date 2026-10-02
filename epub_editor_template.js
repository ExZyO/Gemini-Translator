// ══════════════════════════════════════════════════════════════════════
// GEMINI TRANSLATOR - EPUB STUDIO & EDITOR HTML TEMPLATE
// Standalone UI DOM layout for EPUB Studio workspace and modals
// ══════════════════════════════════════════════════════════════════════
(function(root) {
  'use strict';

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
                <div id="edit-ch-modal-subtoolbar" class="px-3 py-2 flex items-center justify-between gap-2 flex-wrap text-xs shrink-0"
                     style="border-bottom:1px solid var(--hairline); background:rgba(255,255,255,0.02);">
                    <div class="flex items-center gap-1.5 flex-wrap">
                        <!-- Group 1: Typography Formatting -->
                        <div class="flex items-center gap-1 bg-black/30 p-1 rounded-lg border border-slate-700/50">
                            <button type="button" id="fmt-btn-bold" class="chip-act" style="padding:4px 8px; font-weight:800; font-size:12px;" title="Bold (Ctrl+B)"><b>B</b></button>
                            <button type="button" id="fmt-btn-italic" class="chip-act" style="padding:4px 8px; font-style:italic; font-size:12px;" title="Italic (Ctrl+I)"><i>I</i></button>
                            <button type="button" id="fmt-btn-underline" class="chip-act" style="padding:4px 8px; text-decoration:underline; font-size:12px;" title="Underline (Ctrl+U)"><u>U</u></button>
                            <button type="button" id="fmt-btn-strike" class="chip-act" style="padding:4px 8px; text-decoration:line-through; font-size:12px;" title="Strikethrough"><s>S</s></button>
                        </div>

                        <!-- Group 2: Headings & Blocks -->
                        <div class="flex items-center gap-1 bg-black/30 p-1 rounded-lg border border-slate-700/50">
                            <button type="button" id="fmt-btn-h2" class="chip-act" style="padding:4px 7px; font-weight:700; font-size:11.5px;" title="Scene Subheading (H2)">H2</button>
                            <button type="button" id="fmt-btn-h3" class="chip-act" style="padding:4px 7px; font-weight:700; font-size:11.5px;" title="Minor Heading (H3)">H3</button>
                            <button type="button" id="fmt-btn-quote" class="chip-act" style="padding:4px 8px; font-size:11.5px;" title="Quote / Monologue / Thought">❝ Quote</button>
                            <button type="button" id="fmt-btn-center" class="chip-act" style="padding:4px 8px; font-size:11.5px;" title="Center Text (Letters, Poems, Statuses)">↔ Center</button>
                        </div>

                        <!-- Group 3: Spacing & Breaks -->
                        <div class="flex items-center gap-1 bg-black/30 p-1 rounded-lg border border-slate-700/50">
                            <button type="button" id="fmt-btn-divider" class="chip-act" style="padding:4px 8px; font-size:11.5px;" title="Scene Divider (✦ ✦ ✦)">❖ Break</button>
                            <button type="button" id="fmt-btn-spacer" class="chip-act" style="padding:4px 8px; font-size:11.5px; color:#38bdf8;" title="Extra Paragraph Spacing (Guaranteed Blank Line)">↕ Spacer</button>
                            <button type="button" id="btn-edit-modal-clean-spacing" class="chip-act" style="padding:4px 8px; font-size:11.5px;" title="Clean extra blank lines & trailing spaces">🧹 Clean</button>
                        </div>

                        <!-- Group 4: Illustration Picker & History -->
                        <div class="flex items-center gap-1 bg-black/30 p-1 rounded-lg border border-slate-700/50">
                            <button type="button" id="btn-edit-modal-insert-img" class="chip-act accent" style="padding:4px 9px; font-size:11.5px; font-weight:600;" title="Insert Book Illustration or Upload New Image">🖼️ Illustration</button>
                            <button type="button" id="btn-edit-modal-undo" class="chip-act" style="padding:4px 7px; font-size:11.5px;" title="Undo (Ctrl+Z)">↶</button>
                            <button type="button" id="btn-edit-modal-redo" class="chip-act" style="padding:4px 7px; font-size:11.5px;" title="Redo (Ctrl+Y)">↷</button>
                        </div>

                        <button type="button" id="btn-edit-modal-preview-toggle" class="tl-btn accent" style="padding:5px 11px; font-size:11.5px; font-weight:700;">
                            👁️ Preview HTML
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

        <!-- ═══ MODAL 1.8: NOVEL ILLUSTRATION PICKER MODAL (INSERT INTO CHAPTER) ═══ -->
        <div id="edit-novel-image-picker-modal" class="hidden fixed inset-0 z-[65] flex items-center justify-center p-3 sm:p-5"
             style="background:rgba(0,0,0,.75); backdrop-filter:blur(8px);"
             onclick="if(event.target===this) document.getElementById('edit-novel-image-picker-modal').classList.add('hidden');">
            <div class="rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col overflow-hidden"
                 style="background:var(--ember); border:1px solid var(--hairline); max-height:85vh; max-height:85dvh;">
                <!-- Header -->
                <div class="flex items-center justify-between p-4 shrink-0" style="border-bottom:1px solid var(--hairline); background:var(--ember-2);">
                    <div class="flex items-center gap-2">
                        <span class="text-lg">🖼️</span>
                        <div>
                            <h4 class="text-sm sm:text-base font-bold" style="color:var(--paper);">Insert Book Illustration</h4>
                            <p class="text-xs" style="color:var(--slate);">Select an illustration already inside this novel or upload a new one</p>
                        </div>
                    </div>
                    <button type="button" onclick="document.getElementById('edit-novel-image-picker-modal').classList.add('hidden')"
                            class="w-8 h-8 rounded-lg flex items-center justify-center text-base font-bold shrink-0" style="color:var(--slate);">✕</button>
                </div>
                <!-- Body: Grid of existing images -->
                <div class="p-4 overflow-y-auto custom-scrollbar flex-1" style="min-height:220px; max-height:60vh;">
                    <div class="mb-3 flex items-center justify-between">
                        <span id="novel-image-picker-count" class="text-xs font-semibold" style="color:var(--slate);">0 images available</span>
                        <button type="button" id="btn-picker-upload-new" class="tl-btn accent" style="padding:5px 12px; font-size:11.5px;">
                            ➕ Upload from Device…
                        </button>
                    </div>
                    <div id="novel-image-picker-grid" class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                        <!-- Populated dynamically with image cards -->
                    </div>
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

  if (typeof window !== 'undefined') {
    window.editHtml = editHtml;
    window.EpubEditorTemplate = editHtml;
  }
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { editHtml };
  }
})(typeof self !== 'undefined' ? self : this);
