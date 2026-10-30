(function() {
'use strict';

const splitHtml = `<div id="epub-split-tab" class="stu-page-container" style="width:100%; padding-bottom: calc(120px + env(safe-area-inset-bottom, 24px));">
            <input type="file" id="epub-input" accept="*/*,.epub" class="hidden" />

            <!-- 1. EMPTY / HERO DROP ZONE -->
            <div id="upload-section"
                class="stu-drop-canvas"
                ondragover="event.preventDefault(); this.classList.add('stu-drop-active');"
                ondragleave="this.classList.remove('stu-drop-active');"
                ondrop="event.preventDefault(); this.classList.remove('stu-drop-active'); if(event.dataTransfer.files.length>0 && event.dataTransfer.files[0].name.toLowerCase().endsWith('.epub')) processSplitFile(event.dataTransfer.files[0]);">
                <div class="stu-drop-icon-wrap">
                    <svg id="upload-icon" xmlns="http://www.w3.org/2000/svg" width="34" height="34" viewBox="0 0 24 24"
                        fill="none" stroke="#38bdf8" stroke-width="2" stroke-linecap="round"
                        stroke-linejoin="round">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                        <polyline points="17 8 12 3 7 8" />
                        <line x1="12" y1="3" x2="12" y2="15" />
                    </svg>
                </div>
                <div id="loading-spinner"
                    class="hidden w-10 h-10 border-4 border-t-transparent rounded-full animate-spin"
                    style="border-color: #38bdf8; border-top-color: transparent; margin: 0 auto 16px;">
                </div>
                <h3 id="upload-title" class="stu-drop-title">Select your .epub file to Split</h3>
                <p id="upload-desc" class="stu-drop-subtitle">Click here or drag and drop your EPUB book to split into custom volumes</p>
                <div id="loading-progress-wrapper" class="hidden w-full max-w-sm mx-auto mt-6">
                    <div class="flex justify-between text-xs mb-1.5 font-semibold" style="color: var(--slate);">
                        <span id="loading-progress-status">Loading EPUB...</span>
                        <span id="loading-progress-percent" class="font-mono">0%</span>
                    </div>
                    <div class="w-full rounded-full h-2.5 overflow-hidden" style="background: rgba(255,255,255,0.06);">
                        <div id="loading-progress-bar" class="h-2.5 rounded-full transition-all duration-200 ease-out"
                            style="width: 0%; background: linear-gradient(90deg, #38bdf8, #818cf8);"></div>
                    </div>
                </div>
            </div>

            <!-- 2. ACTIVE SPLITTER WORKSPACE -->
            <div id="editor-section" class="hidden">

                <!-- Split Hero Inspector Card -->
                <div class="stu-hero-card">
                    <div style="flex:1; min-width:240px;">
                        <label class="stu-field-label">Active Book Title</label>
                        <input type="text" id="split-title-input" placeholder="Book Title" class="stu-title-input" style="font-size:20px;">
                        <p id="chapter-count" class="stu-stats-bar" style="margin-top:10px; font-size:12px; font-weight:600; color:#38bdf8;">0 books · 0 ch · 0 words · 0.0 MB</p>
                    </div>
                    <div class="flex items-center gap-3 shrink-0 flex-wrap">
                        <input type="file" id="split-cover-input" accept="image/jpeg, image/png, image/webp" class="hidden">
                        <div id="split-cover-preview" class="w-16 h-24 rounded-xl flex items-center justify-center overflow-hidden cursor-pointer shrink-0"
                            style="background:#181d28; border:1px solid rgba(255,255,255,0.1); box-shadow:0 8px 20px rgba(0,0,0,0.5);" title="Click to upload custom cover">
                            <span style="font-size:10.5px; color:var(--slate); font-weight:600; text-align:center; padding:0 6px;">Current<br>Cover</span>
                        </div>
                        <div class="flex flex-col gap-2">
                            <button type="button" id="btn-split-cover" class="stu-chip-btn">Change Cover</button>
                            <button id="btn-reset" class="stu-chip-btn ghost">Load Different Book</button>
                            <button type="button" id="btn-remove-split-cover" class="hidden stu-chip-btn danger">Remove Cover</button>
                        </div>
                    </div>
                </div>

                <!-- Metadata Viewer Drawer -->
                <div id="metadata-viewer" class="hidden stu-card" style="margin-bottom:20px;">
                    <div class="flex items-center justify-between mb-3">
                        <span class="stu-section-title" style="font-size:14px;">Book Metadata</span>
                        <button id="btn-toggle-metadata" class="stu-chip-btn ghost text-xs">Hide</button>
                    </div>
                    <div id="metadata-content" class="grid grid-cols-2 sm:grid-cols-4 gap-3.5 text-xs">
                    </div>
                </div>

                <!-- Range Extraction Card -->
                <div class="stu-card" style="margin-bottom:20px;">
                    <div class="flex items-center justify-between mb-3.5">
                        <span class="stu-section-title" style="font-size:15px;">Extract Chapter Range</span>
                        <button type="button" id="btn-quick-range-preset" class="stu-chip-btn ghost text-xs">Select Range in List</button>
                    </div>
                    <div class="flex items-end gap-3.5 flex-wrap">
                        <div class="stu-field-group" style="flex:1; min-width:130px;">
                            <label class="stu-field-label">Start Chapter</label>
                            <input type="number" id="range-start" min="1" class="stu-text-input">
                        </div>
                        <div class="font-bold text-slate-400 text-xs pb-3.5">TO</div>
                        <div class="stu-field-group" style="flex:1; min-width:130px;">
                            <label class="stu-field-label">End Chapter</label>
                            <input type="number" id="range-end" min="1" class="stu-text-input">
                        </div>
                        <button id="btn-export-range" class="stu-btn-radiant-sky" style="height:46px; padding:0 22px;">Download Range</button>
                        <button id="btn-apply-range-selection" class="stu-chip-btn" style="height:46px;" title="Check these chapters in the selection list">Select in List</button>
                    </div>
                </div>

                <!-- Split into Volumes Configuration Card -->
                <div class="stu-card" style="margin-bottom:20px;">
                    <span class="stu-section-title" style="font-size:15px; display:block; margin-bottom:14px;">Split into Volumes</span>

                    <!-- Mode selector pills -->
                    <div class="flex gap-4 mb-4">
                        <label class="stu-check-label">
                            <input type="radio" name="split-mode" value="chapters" checked>
                            By Chapters
                        </label>
                        <label class="stu-check-label">
                            <input type="radio" name="split-mode" value="size">
                            By Size
                        </label>
                    </div>

                    <div class="flex gap-3.5 flex-wrap mb-4">
                        <div id="split-mode-chapters-wrapper" class="stu-field-group" style="flex:1; min-width:160px;">
                            <label class="stu-field-label">Chapters per book</label>
                            <input type="number" id="chunk-size" value="100" min="1" class="stu-text-input">
                        </div>
                        <div id="split-mode-size-wrapper" class="hidden stu-field-group" style="flex:1; min-width:160px;">
                            <label class="stu-field-label">Target Size per book (MB)</label>
                            <input type="number" id="chunk-size-mb" value="20" min="1" class="stu-text-input">
                        </div>
                        <div class="stu-field-group" style="flex:1; min-width:180px;">
                            <label class="stu-field-label">Reading Theme</label>
                            <select id="css-theme-inject" class="stu-select">
                                <option value="none">None (keep original)</option>
                                <option value="publisher">Publisher-Grade Typography (Literata, Drop Caps)</option>
                                <option value="dark">Dark Mode Reading</option>
                                <option value="sepia">Sepia / Warm</option>
                                <option value="large">Large Text</option>
                            </select>
                        </div>
                    </div>

                    <div class="flex flex-col gap-2.5 mb-4 p-3.5 rounded-2xl" style="background:rgba(255,255,255,0.02); border:1px solid rgba(255,255,255,0.05);">
                        <label class="stu-check-label"><input type="checkbox" id="keep-only-text"><span>Keep Only Text (strip images, fonts, CSS)</span></label>
                        <label class="stu-check-label"><input type="checkbox" id="asset-tree-shake" checked><span title="Only packages images/assets referenced in selected chapters">Asset Tree-Shaking (Compact Volume Size)</span></label>
                        <label class="stu-check-label"><input type="checkbox" id="preserve-book-id" checked><span title="Preserves original EPUB unique identifier (UUID) so Moon+ Reader / Kindle retain your bookmarks, notes, and highlights">Preserve Book ID (Links Reader Bookmarks)</span></label>
                    </div>

                    <div class="flex gap-2.5 flex-wrap mb-4">
                        <select id="export-presets" class="stu-select" style="flex:1; min-width:160px;">
                            <option value="">Load Preset...</option>
                        </select>
                        <button id="btn-save-preset" class="stu-chip-btn accent" style="height:44px; padding:0 20px;">Save</button>
                    </div>

                    <div class="flex gap-3 flex-wrap">
                        <button id="btn-export-chunks" class="stu-btn-radiant-sky" style="flex:1; min-width:160px; height:48px;">Download All Parts</button>
                        <button id="btn-export-batch-zip" class="stu-btn-radiant-emerald" style="flex:1; min-width:180px; height:48px;">Download Volumes ZIP</button>
                        <button id="btn-export-zip" class="stu-chip-btn" style="flex:1; min-width:140px; height:48px;">Export Plain ZIP</button>
                    </div>
                </div>

                <!-- Chapter Selection Card -->
                <div class="stu-card" style="margin-bottom:20px;">
                    <div class="flex items-center justify-between gap-2.5 mb-3.5 flex-wrap">
                        <div class="flex items-center gap-2.5">
                            <span class="stu-section-title" style="font-size:15px;">Chapter Selection</span>
                            <span id="preview-count" class="stu-badge-sky">0 selected</span>
                        </div>
                        <div class="flex gap-2 items-center flex-wrap">
                            <button type="button" id="btn-ai-polish-toc" class="stu-chip-btn accent" title="AI automatically standardizes and cleans all chapter names & TOC">AI Polish TOC</button>
                            <button id="btn-select-all" class="stu-chip-btn ghost">Select All</button>
                            <button id="btn-deselect-all" class="stu-chip-btn ghost">Deselect All</button>
                            <button id="btn-invert-select" class="stu-chip-btn ghost" style="color:#fbbf24;">Invert</button>
                            <button id="btn-batch-rename" class="stu-chip-btn ghost" style="color:#34d399;">Batch Rename</button>
                        </div>
                    </div>

                    <input type="text" id="chapter-search" placeholder="Search chapters…" class="stu-filter-input mb-3" style="width:100%;">

                    <div id="chapter-list" class="custom-scrollbar stu-chapter-list" style="max-height:420px; font-family:-apple-system,BlinkMacSystemFont,'Inter',sans-serif; font-size:13px;">
                    </div>

                    <div id="estimated-size" class="hidden mt-3 text-xs font-semibold text-center" style="color:var(--slate);">
                        Estimated output: <span id="estimated-size-value" class="font-bold text-white">0</span> MB
                    </div>

                    <div class="flex gap-2.5 flex-wrap mt-4 pt-3 border-t border-white/[0.05]">
                        <button id="btn-export-custom" class="stu-btn-radiant-sky" style="flex:1; min-width:140px; height:44px;">Download Checked</button>
                        <button id="btn-send-to-translator" class="stu-btn-radiant-emerald" style="flex:1; min-width:150px; height:44px;" title="Load selected chapters directly into the Translator text workbench">Translate Selected</button>
                        <button id="btn-share-export" class="stu-chip-btn" style="flex:0 0 auto; min-width:80px; height:44px;" title="Share via Web Share API">Share</button>
                    </div>

                    <div id="split-stats-summary" class="mt-3.5 px-4 py-2.5 rounded-xl text-xs text-center font-medium" style="background:rgba(255,255,255,0.03); color:var(--slate); border:1px solid rgba(255,255,255,0.05);">
                        0 books · 0 ch · 0 words · 0.0 MB
                    </div>
                </div>

                <!-- Activity Console Card -->
                <div class="stu-card">
                    <span class="stu-field-label" style="display:block; margin-bottom:8px;">Activity Console</span>
                    <div id="status-log" class="custom-scrollbar stu-console">
                        <div style="color:#818cf8;">&gt; System ready.</div>
                    </div>
                    <div id="split-progress-wrapper" class="hidden mt-3 pt-3" style="border-top:1px solid rgba(255,255,255,0.06);">
                        <div class="flex justify-between text-xs mb-1 font-semibold" style="color:var(--slate);">
                            <span id="split-progress-status">Compressing...</span>
                            <span id="split-progress-percent" class="font-mono">0%</span>
                        </div>
                        <div class="w-full rounded-full h-2 overflow-hidden" style="background:rgba(255,255,255,0.06);">
                            <div id="split-progress-bar" class="h-2 transition-all duration-100 ease-out" style="width:0%; background:linear-gradient(90deg, #38bdf8, #818cf8);"></div>
                        </div>
                    </div>
                </div>

            </div>
        </div>
        `;

const mergeHtml = `<div id="epub-merge-tab" class="stu-page-container" style="width:100%; padding-bottom: calc(120px + env(safe-area-inset-bottom, 24px));">
            <div style="max-width: 740px; margin: 0 auto;">
                <div style="text-align:center; margin-bottom:24px;">
                    <h2 class="stu-drop-title" style="font-size:22px; margin-bottom:6px;">Smart Novel Merger</h2>
                    <p class="stu-drop-subtitle" style="margin-bottom:0;">Combine multiple EPUB parts into a unified single book with preserved Table of Contents.</p>
                    <div id="memory-warning" class="hidden mt-3 inline-block px-4 py-2 rounded-xl text-xs font-semibold"
                        style="background:rgba(245,158,11,0.12); color:#fbbf24; border:1px solid rgba(245,158,11,0.35);">
                        Warning: Total size exceeds 300MB. The browser tab may crash if your device runs out of RAM.
                    </div>
                </div>

                <input type="file" id="merge-input" accept="*/*,.epub" multiple class="hidden" />

                <!-- Upload Canvas -->
                <div id="merge-upload-box" class="stu-drop-canvas" style="margin-bottom:24px; padding:36px 20px;">
                    <div class="stu-drop-icon-wrap" style="width:52px; height:52px; margin-bottom:12px;">
                        <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none"
                             stroke="#38bdf8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                            <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
                        </svg>
                    </div>
                    <span class="stu-drop-title" style="font-size:16px;">Click to Select EPUB Books</span>
                    <span class="block stu-drop-subtitle" style="font-size:12.5px; margin-top:4px;">or drag and drop multiple volumes here</span>
                    <div class="mt-4">
                        <span class="px-3.5 py-1.5 rounded-full text-[11.5px] font-semibold" style="background:rgba(255,255,255,0.06); color:#94a3b8; border:1px solid rgba(255,255,255,0.1);">
                            Phone Tip: Long-press files in your file manager to multi-select
                        </span>
                    </div>
                </div>

                <!-- Active Merge Workbench Container -->
                <div id="merge-list-container" class="hidden">
                    <div class="flex items-center justify-between flex-wrap gap-2.5" style="margin-bottom:14px;">
                        <span class="stu-section-title" style="font-size:15px;">Files to Merge</span>
                        <div class="flex items-center gap-2.5 flex-wrap">
                            <button id="btn-sort-merge-natural" type="button" class="stu-chip-btn ghost text-xs" title="Sort files by natural number ordering (Book 1, Book 2... Book 10)">Sort A–Z (Natural)</button>
                            <button id="btn-clear-all-merge" class="hidden stu-chip-btn danger text-xs">Clear All</button>
                            <button id="btn-add-more-merge" class="stu-chip-btn accent text-xs">+ Add More Files</button>
                        </div>
                    </div>

                    <!-- Merge File List -->
                    <div id="merge-file-list" class="custom-scrollbar" style="display:flex; flex-direction:column; gap:10px; max-height:320px; overflow-y:auto; padding-right:4px; margin-bottom:20px;">
                    </div>

                    <!-- Output Book Metadata Card -->
                    <div class="stu-card" style="margin-bottom:20px;">
                        <div class="flex gap-4 flex-wrap">
                            <div class="stu-field-group" style="flex:1; min-width:220px;">
                                <label class="stu-field-label">New Book Title</label>
                                <input type="text" id="merge-title" placeholder="e.g. Web Novel (Complete Edition)" class="stu-text-input">
                            </div>
                            <div class="stu-field-group" style="flex:1; min-width:220px;">
                                <label class="stu-field-label">Custom Cover (Optional)</label>
                                <div class="flex items-center gap-3">
                                    <div id="cover-preview" class="w-14 h-20 rounded-xl flex items-center justify-center overflow-hidden shrink-0 cursor-pointer"
                                        style="background:#181d28; border:1px solid rgba(255,255,255,0.1); box-shadow:0 6px 16px rgba(0,0,0,0.4);" title="Click to upload custom cover">
                                        <span style="font-size:10px; font-weight:600; color:var(--slate); text-align:center; padding:0 4px;">Book 1<br>Cover</span>
                                    </div>
                                    <input type="file" id="cover-input" accept="image/jpeg, image/png, image/webp" class="hidden">
                                    <div class="flex flex-col gap-2">
                                        <button type="button" id="btn-select-cover" class="stu-chip-btn">Upload Image</button>
                                        <button type="button" id="btn-remove-cover" class="hidden stu-chip-btn danger">Remove</button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Advanced Options Drawer -->
                    <details class="stu-card" style="margin-bottom:20px; padding:16px 20px;">
                        <summary class="cursor-pointer text-xs font-bold uppercase tracking-wider flex items-center justify-between select-none" style="color:var(--paper-dim); padding:4px 0;">
                            <span>Advanced Options, TOC Hierarchy & Compression</span>
                            <span style="color:var(--slate); font-size:14px;">▾</span>
                        </summary>
                        <div style="padding-top:16px;">
                            <div class="flex flex-col gap-2.5 mb-4 p-3.5 rounded-2xl" style="background:rgba(255,255,255,0.02); border:1px solid rgba(255,255,255,0.05);">
                                <label class="stu-check-label"><input type="checkbox" id="merge-nested-toc" checked><span>Multi-Level Hierarchical TOC (Volume &gt; Chapters)</span></label>
                                <label class="stu-check-label"><input type="checkbox" id="merge-strip-dupes" checked><span>Strip Redundant Covers / Front-Matter from Book 2+</span></label>
                            </div>

                            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                                <div class="stu-field-group">
                                    <label class="stu-field-label">Author / Creator</label>
                                    <input type="text" id="merge-author" class="stu-text-input">
                                </div>
                                <div class="stu-field-group">
                                    <label class="stu-field-label">Publisher</label>
                                    <input type="text" id="merge-publisher" class="stu-text-input">
                                </div>
                                <div class="stu-field-group">
                                    <label class="stu-field-label">Language</label>
                                    <input type="text" id="merge-language" value="en" class="stu-text-input">
                                </div>
                                <div class="stu-field-group">
                                    <label class="stu-field-label">Typography & Theme</label>
                                    <select id="merge-css-theme" class="stu-select">
                                        <option value="none">Keep Original Styling</option>
                                        <option value="publisher">Publisher-Grade (Literata, Drop Caps)</option>
                                        <option value="dark">Dark Mode Reading</option>
                                        <option value="sepia">Sepia / Warm</option>
                                        <option value="large">Large Text</option>
                                    </select>
                                </div>
                                <div class="stu-field-group sm:col-span-2">
                                    <label class="stu-field-label">Compression</label>
                                    <select id="merge-compression" class="stu-select">
                                        <option value="DEFLATE">Small File (DEFLATE max)</option>
                                        <option value="STORE" selected>Fast Speed (STORE uncompressed)</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                    </details>

                    <!-- Execute Merge Action Card -->
                    <div class="stu-card" style="padding:20px;">
                        <button id="btn-execute-merge" class="stu-btn-radiant-sky w-full" style="height:52px; font-size:15px; font-weight:800;">
                            <span id="merge-btn-text">Merge & Download Consolidated EPUB</span>
                            <span id="merge-spinner" class="hidden w-5 h-5 border-2 border-t-transparent rounded-full animate-spin"
                                style="border-color:#E6E9FF; border-top-color:transparent; vertical-align:-3px; margin-left:8px;"></span>
                        </button>

                        <div id="merge-progress-wrapper" class="hidden mt-4">
                            <div class="flex justify-between text-xs mb-1.5 font-semibold" style="color:var(--slate);">
                                <span id="merge-progress-status">Compressing Final File...</span>
                                <span id="merge-progress-percent" class="font-mono">0%</span>
                            </div>
                            <div class="w-full rounded-full h-2.5 overflow-hidden" style="background:rgba(255,255,255,0.06);">
                                <div id="merge-progress-bar" class="h-2.5 transition-all duration-100 ease-out" style="width:0%; background:linear-gradient(90deg, #38bdf8, #818cf8);"></div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
`;

const modalHtml = `<!-- Chapter Preview Modal -->
    <div id="chapter-preview-modal"
        class="hidden stu-modal-overlay"
        onclick="if(event.target===this)this.classList.add('hidden')">
        <div class="stu-modal-sheet max-w-2xl max-h-[85vh]">
            <div class="stu-modal-header">
                <h3 id="preview-modal-title" class="font-bold truncate text-white">Chapter Preview</h3>
                <button onclick="document.getElementById('chapter-preview-modal').classList.add('hidden')"
                    class="stu-modal-close-btn">&times;</button>
            </div>
            <div id="preview-modal-body"
                class="p-6 overflow-y-auto custom-scrollbar text-base leading-relaxed font-serif flex-1 text-slate-200"
                style="min-height:0; -webkit-overflow-scrolling: touch; touch-action: pan-y; overscroll-behavior-y: contain;">
            </div>
            <div class="stu-modal-footer">
                <button type="button" onclick="document.getElementById('chapter-preview-modal').classList.add('hidden')" class="stu-btn-radiant-sky" style="padding: 8px 20px; font-weight:700;">Close</button>
            </div>
        </div>
    </div>

    <!-- AI Polish TOC Modal -->
    <div id="ai-toc-polish-modal"
        class="hidden stu-modal-overlay"
        onclick="if(event.target===this)this.classList.add('hidden')">
        <div class="stu-modal-sheet max-w-3xl max-h-[88vh]">
            <div class="stu-modal-header">
                <div class="flex items-center gap-3">
                    <span class="stu-badge-idx" style="background:rgba(56,189,248,.15); color:#38bdf8;">TOC</span>
                    <div>
                        <h3 class="font-bold text-base sm:text-lg text-white">AI Table of Contents & Title Polisher</h3>
                        <p class="text-xs text-slate-400">Standardize chapter numbering, clean scraped tags, and organize arcs</p>
                    </div>
                </div>
                <button onclick="document.getElementById('ai-toc-polish-modal').classList.add('hidden')"
                    class="stu-modal-close-btn">&times;</button>
            </div>

            <div class="px-5 py-4 text-xs flex items-center justify-between gap-3 flex-wrap" style="border-bottom: 1px solid rgba(255,255,255,0.06); background: rgba(255,255,255,0.02);">
                <div class="flex items-center gap-2.5 flex-wrap">
                    <label class="font-bold text-slate-300">Provider:</label>
                    <select id="ai-polish-provider-select" class="stu-select" style="width:auto; height:36px; padding:0 12px;">
                        <option value="gemini">Google Gemini</option>
                        <option value="deepseek">DeepSeek (Zero Quota Limits)</option>
                        <option value="openai">OpenAI</option>
                        <option value="claude">Anthropic Claude</option>
                    </select>
                </div>
                <div class="flex items-center gap-2 flex-wrap">
                    <button type="button" id="btn-instant-extract-toc" class="stu-chip-btn" title="Extract real chapter headings directly from XHTML without using any API">Offline Extract</button>
                    <button type="button" id="btn-run-ai-toc-polish" class="stu-btn-radiant-sky"><span id="ai-polish-btn-text">Generate AI Cleaned TOC</span></button>
                </div>
            </div>

            <div class="px-5 py-3" style="border-bottom: 1px solid rgba(255,255,255,0.06); background: rgba(0,0,0,0.15);">
                <div class="flex items-center gap-3">
                    <span class="text-xs font-bold shrink-0 text-slate-300">Custom Prompt (Optional):</span>
                    <input type="text" id="ai-toc-custom-instruction" placeholder="e.g. Keep Year & Volume names, format Side Stories as 'SS - Name', keep decimals like 1.1"
                        class="stu-text-input" style="flex:1; margin:0; height:38px;">
                </div>
            </div>

            <div id="ai-toc-results-container" class="p-5 sm:p-6 overflow-y-auto custom-scrollbar flex-1 space-y-3 font-mono text-xs" style="max-height: 50vh;">
                <p class="italic text-center py-8 text-slate-400">Click "Generate AI Cleaned TOC" above to start analyzing and standardizing chapter titles.</p>
            </div>

            <div class="stu-modal-footer">
                <span id="ai-toc-stats" class="text-xs text-slate-400 font-mono">0 chapters ready</span>
                <div class="flex gap-2.5">
                    <button onclick="document.getElementById('ai-toc-polish-modal').classList.add('hidden')" class="stu-chip-btn">Cancel</button>
                    <button id="btn-apply-ai-toc" disabled class="stu-btn-radiant-sky"><span>Apply Cleaned Titles & TOC</span></button>
                </div>
            </div>
        </div>
    </div>
`;

if (typeof window !== 'undefined') {
    window.splitHtml = splitHtml;
    window.mergeHtml = mergeHtml;
    window.modalHtml = modalHtml;
}
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { splitHtml, mergeHtml, modalHtml };
}
})();
