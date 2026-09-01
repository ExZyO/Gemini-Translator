(function() {
const splitHtml = `<div id="epub-split-tab" style="width:100%;">
            <input type="file" id="epub-input" accept="*/*,.epub" class="hidden" />

            <div id="upload-section"
                class="tl-drop"
                ondragover="event.preventDefault(); this.classList.add('ring-4','ring-indigo-400');"
                ondragleave="this.classList.remove('ring-4','ring-indigo-400');"
                ondrop="event.preventDefault(); this.classList.remove('ring-4','ring-indigo-400'); if(event.dataTransfer.files.length>0 && event.dataTransfer.files[0].name.toLowerCase().endsWith('.epub')) processSplitFile(event.dataTransfer.files[0]);">
                <svg id="upload-icon" xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24"
                    fill="none" stroke="var(--iris)" stroke-width="2" stroke-linecap="round"
                    stroke-linejoin="round" style="margin-bottom:8px;">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="17 8 12 3 7 8" />
                    <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
                <div id="loading-spinner"
                    class="hidden w-8 h-8 border-4 border-t-transparent rounded-full animate-spin"
                    style="border-color: var(--iris); border-top-color: transparent; margin: 0 auto 8px;">
                </div>
                <h3 id="upload-title" style="font-size: 17px; font-weight: 700; color: var(--paper); margin-bottom: 4px;">Select your .epub file to Split</h3>
                <p id="upload-desc" style="font-size: 12px; color: var(--slate); font-weight: 500;">Click here or drag and drop your EPUB book</p>
                <div id="loading-progress-wrapper" class="hidden w-full max-w-xs mx-auto mt-4">
                    <div class="flex justify-between text-xs mb-1 font-semibold" style="color: var(--slate);">
                        <span id="loading-progress-status">Loading EPUB...</span>
                        <span id="loading-progress-percent">0%</span>
                    </div>
                    <div class="w-full rounded-full h-2 overflow-hidden" style="background: var(--ember-2);">
                        <div id="loading-progress-bar" class="h-2 rounded-full transition-all duration-200 ease-out"
                            style="width: 0%; background: var(--iris);"></div>
                    </div>
                </div>
            </div>

            <div id="editor-section" class="hidden">

                <div class="stu-sec" style="display:flex; align-items:center; justify-content:space-between; gap:16px; flex-wrap:wrap;">
                    <div style="flex:1; min-width:220px;">
                        <input type="text" id="split-title-input" placeholder="Book Title"
                            style="width:100%; background:transparent; border:none; border-bottom:1px solid var(--hairline); font-size:20px; font-weight:700; color:var(--paper); padding:0 0 8px; outline:none;">
                        <p id="chapter-count" style="font-size:11.5px; color:var(--iris); font-weight:600; margin-top:8px; font-family:'IBM Plex Mono',monospace;">0 books · 0 ch · 0 words · 0.0 MB</p>
                    </div>
                    <div style="display:flex; gap:8px; align-items:center; flex-wrap:wrap;">
                        <input type="file" id="split-cover-input" accept="image/jpeg, image/png, image/webp" class="hidden">
                        <div id="split-cover-preview" class="w-14 h-20 rounded-lg flex items-center justify-center overflow-hidden cursor-pointer shrink-0"
                            style="background:var(--ember-2); border:1px solid var(--hairline);" title="Click to upload custom cover">
                            <span style="font-size:10px; color:var(--slate); font-weight:600; text-align:center; padding:0 4px;">Current<br>Cover</span>
                        </div>
                        <button type="button" id="btn-split-cover" class="tl-btn">Change Cover</button>
                        <button id="btn-reset" class="tl-btn">Load Different Book</button>
                        <button type="button" id="btn-remove-split-cover" class="hidden tl-btn danger">Remove Cover</button>
                    </div>
                </div>

                <div id="metadata-viewer" class="hidden stu-sec">
                    <div class="flex items-center justify-between mb-2">
                        <span class="cap">Book Metadata</span>
                        <button id="btn-toggle-metadata" class="chip-act">Hide</button>
                    </div>
                    <div id="metadata-content" class="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                    </div>
                </div>

                <div class="stu-sec">
                    <div class="flex items-center justify-between mb-3">
                        <span class="cap" style="font-size:11.5px; letter-spacing:.14em;">1 · Extract Range</span>
                        <button type="button" id="btn-quick-range-preset" class="chip-act">Select Range in List</button>
                    </div>
                    <div class="flex items-end gap-3 flex-wrap">
                        <div style="flex:1; min-width:130px;">
                            <label class="cap" style="display:block; margin-bottom:6px;">Start Chapter</label>
                            <input type="number" id="range-start" min="1" class="tl-field">
                        </div>
                        <div class="font-bold" style="color:var(--slate); font-size:11px; padding-bottom:11px;">TO</div>
                        <div style="flex:1; min-width:130px;">
                            <label class="cap" style="display:block; margin-bottom:6px;">End Chapter</label>
                            <input type="number" id="range-end" min="1" class="tl-field">
                        </div>
                        <button id="btn-export-range" class="tl-btn accent" style="margin-bottom:1px;">Download Range</button>
                        <button id="btn-apply-range-selection" class="tl-btn" title="Check these chapters in the selection list" style="margin-bottom:1px;">Select in List</button>
                    </div>
                </div>

                <div class="stu-sec">
                    <span class="cap" style="font-size:11.5px; letter-spacing:.14em; display:block; margin-bottom:12px;">2 · Split into Parts</span>

                    <div class="flex gap-4 mb-3">
                        <label class="tl-check">
                            <input type="radio" name="split-mode" value="chapters" checked>
                            By Chapters
                        </label>
                        <label class="tl-check">
                            <input type="radio" name="split-mode" value="size">
                            By Size
                        </label>
                    </div>

                    <div class="flex gap-3 flex-wrap mb-3">
                        <div id="split-mode-chapters-wrapper" style="flex:1; min-width:150px;">
                            <label class="cap" style="display:block; margin-bottom:6px;">Chapters per book</label>
                            <input type="number" id="chunk-size" value="100" min="1" class="tl-field">
                        </div>
                        <div id="split-mode-size-wrapper" class="hidden" style="flex:1; min-width:150px;">
                            <label class="cap" style="display:block; margin-bottom:6px;">Target Size per book (MB)</label>
                            <input type="number" id="chunk-size-mb" value="20" min="1" class="tl-field">
                        </div>
                        <div style="flex:1; min-width:150px;">
                            <label class="cap" style="display:block; margin-bottom:6px;">Reading Theme</label>
                            <select id="css-theme-inject" class="tl-field">
                                <option value="none">None (keep original)</option>
                                <option value="publisher">Publisher-Grade Typography (Literata, Drop Caps)</option>
                                <option value="dark">Dark Mode Reading</option>
                                <option value="sepia">Sepia / Warm</option>
                                <option value="large">Large Text</option>
                            </select>
                        </div>
                    </div>

                    <div style="display:flex; flex-direction:column; gap:6px; margin-bottom:12px;">
                        <label class="tl-check"><input type="checkbox" id="keep-only-text"><span>Keep Only Text (strip images, fonts, CSS)</span></label>
                        <label class="tl-check"><input type="checkbox" id="asset-tree-shake" checked><span title="Only packages images/assets referenced in selected chapters">Asset Tree-Shaking (Compact Volume Size)</span></label>
                        <label class="tl-check"><input type="checkbox" id="preserve-book-id" checked><span title="Preserves original EPUB unique identifier (UUID) so Moon+ Reader / Kindle retain your bookmarks, notes, and highlights">Preserve Book ID (Links Reader Bookmarks)</span></label>
                    </div>

                    <div class="flex gap-2 flex-wrap" style="margin-bottom:12px;">
                        <select id="export-presets" class="tl-field" style="flex:1; min-width:160px;">
                            <option value="">Load Preset...</option>
                        </select>
                        <button id="btn-save-preset" class="tl-btn accent">Save</button>
                    </div>

                    <div style="display:flex; gap:8px; flex-wrap:wrap;">
                        <button id="btn-export-chunks" class="tl-btn primary" style="flex:1; min-width:150px;">Download All Parts</button>
                        <button id="btn-export-batch-zip" class="tl-btn accent" style="flex:1; min-width:170px;">Download All Volumes as Single .ZIP</button>
                        <button id="btn-export-zip" class="tl-btn" style="flex:1; min-width:130px;">Export as Plain ZIP</button>
                    </div>
                </div>

                <div class="stu-sec">
                    <div class="flex items-center justify-between gap-2 mb-3 flex-wrap">
                        <span class="cap" style="font-size:11.5px; letter-spacing:.14em;">3 · Chapter Selection</span>
                        <div style="display:flex; gap:6px; align-items:center; flex-wrap:wrap;">
                            <button type="button" id="btn-ai-polish-toc" class="chip-act" title="AI automatically standardizes and cleans all chapter names & TOC">✦ AI Polish TOC</button>
                            <button id="btn-select-all" class="chip-act">Select All</button>
                            <button id="btn-deselect-all" class="chip-act">Deselect All</button>
                            <button id="btn-invert-select" class="chip-act" style="color:var(--lamp);">Invert</button>
                            <button id="btn-batch-rename" class="chip-act" style="color:var(--pine);">Batch Rename</button>
                        </div>
                    </div>

                    <div class="flex items-center px-3 py-1.5 rounded-xl mb-3" style="background:rgba(124,135,255,.1); border:1px solid var(--iris-deep);">
                        <span id="preview-count" class="mono" style="font-size:11px; font-weight:700; color:var(--iris);">0 selected</span>
                    </div>

                    <input type="text" id="chapter-search" placeholder="Search chapters..." class="tl-field" style="margin-bottom:10px;">

                    <div id="chapter-list" class="custom-scrollbar tl-list" style="max-height:300px; overflow-y:auto; padding:6px; font-family:'IBM Plex Mono',monospace; font-size:11px;">
                    </div>

                    <div id="estimated-size" class="hidden mt-3 text-xs font-semibold text-center" style="color:var(--slate);">
                        Estimated output: <span id="estimated-size-value" class="font-bold" style="color:var(--paper-dim);">0</span> MB
                    </div>

                    <div style="display:flex; gap:8px; flex-wrap:wrap; margin-top:12px;">
                        <button id="btn-export-custom" class="tl-btn primary" style="flex:1; min-width:140px;">Download Checked</button>
                        <button id="btn-send-to-translator" class="tl-btn accent" style="flex:1; min-width:140px;" title="Load selected chapters directly into the Translator text workbench">⇱ Translate Selected</button>
                        <button id="btn-share-export" class="tl-btn" style="flex:1; min-width:90px;" title="Share via Web Share API">Share</button>
                    </div>

                    <div id="split-stats-summary" class="mt-3 px-3 py-2 rounded-lg text-xs text-center font-medium" style="background:var(--ember-2); color:var(--slate);">
                        0 books · 0 ch · 0 words · 0.0 MB
                    </div>
                </div>

                <div class="stu-sec" style="border-bottom:none;">
                    <span class="cap" style="display:block; margin-bottom:8px;">Activity Console</span>
                    <div id="status-log" class="custom-scrollbar" style="max-height:140px; overflow-y:auto; color:var(--slate); font-family:'IBM Plex Mono',monospace; font-size:11px; line-height:1.7;">
                        <div style="color:var(--iris);">&gt; System ready.</div>
                    </div>
                    <div id="split-progress-wrapper" class="hidden mt-2 pt-2" style="border-top:1px solid var(--hairline);">
                        <div class="flex justify-between text-xs mb-1 font-semibold" style="color:var(--slate);">
                            <span id="split-progress-status">Compressing...</span>
                            <span id="split-progress-percent">0%</span>
                        </div>
                        <div class="w-full rounded-full h-1.5 overflow-hidden" style="background:var(--ember-2);">
                            <div id="split-progress-bar" class="h-1.5 transition-all duration-100 ease-out" style="width:0%; background:var(--iris);"></div>
                        </div>
                    </div>
                </div>

            </div>
        </div>
        `;

const mergeHtml = `<div id="epub-merge-tab" style="width:100%;">
            <div style="max-width: 680px; margin: 0 auto;">
                <div style="text-align:center; margin-bottom:16px;">
                    <h2 style="font-size:19px; font-weight:700; color:var(--paper);">Smart Novel Merger</h2>
                    <p style="color:var(--slate); margin-top:4px; font-size:12px;">Combine multiple EPUB parts into a unified single book with preserved Table of Contents.</p>
                    <div id="memory-warning" class="hidden mt-3 inline-block px-3.5 py-1.5 rounded-xl text-xs font-semibold"
                        style="background:rgba(255,180,84,.1); color:var(--lamp); border:1px solid rgba(255,180,84,.35);">
                        Warning: Total size exceeds 300MB. The browser tab may crash if your device runs out of RAM.
                    </div>
                </div>

                <input type="file" id="merge-input" accept="*/*,.epub" multiple class="hidden" />
                <div id="merge-upload-box" class="tl-drop" style="margin-bottom:16px;">
                    <span style="font-size:14px; font-weight:700; color:var(--iris);">Click to Select EPUB Books</span>
                    <span class="block" style="font-size:11.5px; color:var(--slate); margin-top:4px;">or drag and drop them here</span>
                    <div class="mt-3">
                        <span class="px-3 py-1 rounded-lg text-[11px] font-semibold" style="background:rgba(124,135,255,.1); color:var(--iris); border:1px solid var(--iris-deep);">
                             Phone Tip: Long-press to multi-select, or add books sequentially
                        </span>
                    </div>
                </div>

                <div id="merge-list-container" class="hidden">
                    <div class="flex items-center justify-between flex-wrap gap-2" style="margin-bottom:10px;">
                        <span class="cap" style="font-size:11.5px; letter-spacing:.14em;">Files to Merge</span>
                        <div class="flex items-center gap-3 flex-wrap">
                            <button id="btn-sort-merge-natural" type="button" class="chip-act" title="Sort files by natural number ordering (Book 1, Book 2... Book 10)">Sort A–Z (Natural)</button>
                            <button id="btn-clear-all-merge" class="hidden chip-act" style="color:var(--rose);">Clear All</button>
                            <button id="btn-add-more-merge" class="chip-act">+ Add More Files</button>
                        </div>
                    </div>

                    <div id="merge-file-list" class="custom-scrollbar" style="display:flex; flex-direction:column; gap:8px; max-height:300px; overflow-y:auto; padding-right:4px;">
                    </div>

                    <div class="stu-sec" style="margin-top:16px;">
                        <div class="flex gap-3 flex-wrap">
                            <div style="flex:1; min-width:200px;">
                                <label class="cap" style="display:block; margin-bottom:6px;">New Book Title</label>
                                <input type="text" id="merge-title" placeholder="e.g. Reverend Insanity (Complete)" class="tl-field">
                            </div>
                            <div style="flex:1; min-width:200px;">
                                <label class="cap" style="display:block; margin-bottom:6px;">Custom Cover (Optional)</label>
                                <div class="flex items-center gap-3">
                                    <div id="cover-preview" class="w-12 h-16 rounded-lg flex items-center justify-center overflow-hidden shrink-0 cursor-pointer"
                                        style="background:var(--ember-2); border:1px solid var(--hairline);" title="Click to upload custom cover">
                                        <span style="font-size:10px; font-weight:600; color:var(--slate); text-align:center; padding:0 4px;">Book 1<br>Cover</span>
                                    </div>
                                    <input type="file" id="cover-input" accept="image/jpeg, image/png, image/webp" class="hidden">
                                    <button type="button" id="btn-select-cover" class="tl-btn">Upload Image</button>
                                    <button type="button" id="btn-remove-cover" class="hidden tl-btn danger">Remove</button>
                                </div>
                            </div>
                        </div>
                    </div>

                    <details class="stu-sec" style="padding:10px 0;">
                        <summary class="cursor-pointer text-xs font-bold uppercase tracking-wider flex items-center justify-between select-none" style="color:var(--paper-dim); padding:4px 0;">
                            <span>Advanced Options, TOC Hierarchy & Compression</span>
                            <span style="color:var(--slate);">▾</span>
                        </summary>
                        <div style="padding-top:12px;">
                            <div class="flex flex-col gap-2" style="margin-bottom:12px;">
                                <label class="tl-check"><input type="checkbox" id="merge-nested-toc" checked><span>Multi-Level Hierarchical TOC (Volume &gt; Chapters)</span></label>
                                <label class="tl-check"><input type="checkbox" id="merge-strip-dupes" checked><span>Strip Redundant Covers / Front-Matter from Book 2+</span></label>
                            </div>

                            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <label class="cap" style="display:block; margin-bottom:6px;">Author / Creator</label>
                                    <input type="text" id="merge-author" class="tl-field">
                                </div>
                                <div>
                                    <label class="cap" style="display:block; margin-bottom:6px;">Publisher</label>
                                    <input type="text" id="merge-publisher" class="tl-field">
                                </div>
                                <div>
                                    <label class="cap" style="display:block; margin-bottom:6px;">Language</label>
                                    <input type="text" id="merge-language" value="en" class="tl-field">
                                </div>
                                <div>
                                    <label class="cap" style="display:block; margin-bottom:6px;">Typography & Theme</label>
                                    <select id="merge-css-theme" class="tl-field">
                                        <option value="none">Keep Original Styling</option>
                                        <option value="publisher">Publisher-Grade (Literata, Drop Caps)</option>
                                        <option value="dark">Dark Mode Reading</option>
                                        <option value="sepia">Sepia / Warm</option>
                                        <option value="large">Large Text</option>
                                    </select>
                                </div>
                                <div>
                                    <label class="cap" style="display:block; margin-bottom:6px;">Compression</label>
                                    <select id="merge-compression" class="tl-field">
                                        <option value="DEFLATE">Small File (DEFLATE max)</option>
                                        <option value="STORE" selected>Fast Speed (STORE uncompressed)</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                    </details>

                    <div class="stu-sec" style="border-bottom:none; padding-top:14px;">
                        <button id="btn-execute-merge" class="tl-btn primary" style="width:100%; padding:13px;">
                            <span id="merge-btn-text">Merge & Download</span>
                            <span id="merge-spinner" class="hidden w-4 h-4 border-2 border-t-transparent rounded-full animate-spin"
                                style="border-color:#E6E9FF; border-top-color:transparent; vertical-align:-3px; margin-left:8px;"></span>
                        </button>

                        <div id="merge-progress-wrapper" class="hidden mt-4">
                            <div class="flex justify-between text-xs mb-1 font-semibold" style="color:var(--slate);">
                                <span id="merge-progress-status">Compressing Final File...</span>
                                <span id="merge-progress-percent">0%</span>
                            </div>
                            <div class="w-full rounded-full h-2 overflow-hidden" style="background:var(--ember-2);">
                                <div id="merge-progress-bar" class="h-2 transition-all duration-100 ease-out" style="width:0%; background:var(--iris);"></div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
`;
const modalHtml = `<!-- Chapter Preview Modal -->
    <div id="chapter-preview-modal"
        class="hidden fixed inset-0 z-50 flex items-center justify-center p-4"
        style="background: rgba(0,0,0,.65); backdrop-filter: blur(6px);"
        onclick="if(event.target===this)this.classList.add('hidden')">
        <div class="rounded-2xl shadow-2xl max-w-2xl w-full max-h-[80vh] flex flex-col overflow-hidden"
            style="background: var(--ember); border: 1px solid var(--hairline);">
            <div class="flex items-center justify-between p-4" style="border-bottom: 1px solid var(--hairline);">
                <h3 id="preview-modal-title" class="font-bold truncate" style="color: var(--paper);">Chapter Preview
                </h3>
                <button onclick="document.getElementById('chapter-preview-modal').classList.add('hidden')"
                    class="w-8 h-8 flex items-center justify-center text-lg font-bold" style="color: var(--slate);">✕</button>
            </div>
            <div id="preview-modal-body"
                class="p-6 overflow-y-auto custom-scrollbar text-sm leading-relaxed font-serif" style="color: var(--paper-dim);">
            </div>
        </div>
    </div>

    <!-- AI Polish TOC Modal -->
    <div id="ai-toc-polish-modal"
        class="hidden fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4"
        style="background: rgba(0,0,0,.7); backdrop-filter: blur(8px);"
        onclick="if(event.target===this)this.classList.add('hidden')">
        <div class="rounded-2xl shadow-2xl max-w-3xl w-full max-h-[88vh] flex flex-col overflow-hidden"
            style="background: var(--ember); border: 1px solid var(--hairline);">
            <div class="flex items-center justify-between p-4 sm:p-5" style="border-bottom: 1px solid var(--hairline); background: var(--ember-2);">
                <div class="flex items-center gap-2.5">
                    <span class="w-8 h-8 rounded-xl flex items-center justify-center text-sm font-black"
                        style="background: rgba(124,135,255,.15); color: var(--iris);">✦</span>
                    <div>
                        <h3 class="font-extrabold text-base sm:text-lg" style="color: var(--paper);">AI Table of Contents & Title Polisher</h3>
                        <p class="text-xs" style="color: var(--slate);">Standardize chapter numbering, clean scraped tags, and organize arcs</p>
                    </div>
                </div>
                <button onclick="document.getElementById('ai-toc-polish-modal').classList.add('hidden')"
                    class="w-8 h-8 rounded-lg flex items-center justify-center font-bold" style="color: var(--slate);">✕</button>
            </div>

            <div class="p-4 sm:p-5 text-xs flex items-center justify-between gap-3 flex-wrap" style="border-bottom: 1px solid var(--hairline); background: rgba(124,135,255,.06); color: var(--paper-dim);">
                <div class="flex items-center gap-2 flex-wrap">
                    <label class="font-bold" style="color: var(--paper-dim);">Provider:</label>
                    <select id="ai-polish-provider-select" class="tl-field" style="width:auto;">
                        <option value="gemini">Google Gemini</option>
                        <option value="deepseek">DeepSeek (Zero Quota Limits)</option>
                        <option value="openai">OpenAI</option>
                        <option value="claude">Anthropic Claude</option>
                    </select>
                </div>
                <div class="flex items-center gap-2 flex-wrap">
                    <button type="button" id="btn-instant-extract-toc" class="tl-btn" title="Extract real chapter headings directly from XHTML without using any API">⌁ Instant Extract (Offline)</button>
                    <button type="button" id="btn-run-ai-toc-polish" class="tl-btn accent"><span id="ai-polish-btn-text">Generate AI Cleaned TOC</span></button>
                </div>
            </div>

            <div class="px-4 py-2.5 sm:px-5 sm:py-3" style="border-bottom: 1px solid var(--hairline); background: var(--ember-2);">
                <div class="flex items-center gap-2.5">
                    <span class="text-xs font-bold shrink-0" style="color: var(--paper-dim);">✦ Custom Prompt (Optional):</span>
                    <input type="text" id="ai-toc-custom-instruction" placeholder="e.g. Keep Year & Volume names, format Side Stories as 'SS - Name', keep decimals like 1.1"
                        class="tl-field" style="flex:1; margin:0;">
                </div>
            </div>

            <div id="ai-toc-results-container" class="p-4 sm:p-5 overflow-y-auto custom-scrollbar flex-1 space-y-3 font-mono text-xs" style="max-height: 50vh;">
                <p class="italic text-center py-8" style="color: var(--slate);">Click "Generate AI Cleaned TOC" above to start analyzing and standardizing chapter titles.</p>
            </div>

            <div class="p-4 sm:p-5 flex items-center justify-between gap-3" style="border-top: 1px solid var(--hairline); background: var(--ember-2);">
                <span id="ai-toc-stats" class="text-xs" style="color: var(--slate);">0 chapters ready</span>
                <div class="flex gap-2">
                    <button onclick="document.getElementById('ai-toc-polish-modal').classList.add('hidden')" class="tl-btn">Cancel</button>
                    <button id="btn-apply-ai-toc" disabled class="tl-btn accent"><span>Apply Cleaned Titles & TOC</span></button>
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
