// ══════════════════════════════════════════════════════════════════════
// GEMINI TRANSLATOR - EPUB STUDIO VISUAL TOOLS & MODALS
// TOC Manager, Auto-Hierarchy, Image Gallery Lightbox, Find & Replace
// ══════════════════════════════════════════════════════════════════════
(function(root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.EpubEditorTools = factory();
  }
}(typeof self !== 'undefined' ? self : this, function() {
  'use strict';

  // Access editor state and helpers from window
  const getState = () => (typeof window !== 'undefined' && window.epubEditorState) || {};
  const getHelpers = () => (typeof window !== 'undefined' && window.epubEditorHelpers) || {};
  let state = getState();
  const syncState = () => { if (typeof window !== 'undefined' && window.epubEditorState) state = window.epubEditorState; };

  const renderChapterList = () => (getHelpers().renderChapterList ? getHelpers().renderChapterList() : null);
  const updateStats = () => (getHelpers().updateStats ? getHelpers().updateStats() : null);
  const cleanTitle = (raw, idx) => (getHelpers().cleanTitle ? getHelpers().cleanTitle(raw, idx) : String(raw || '').trim() || `Chapter ${idx}`);
  const escapeXml = (str) => {
    if (!str) return '';
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
  };
  const saveNovelToDatabase = (opts) => (getHelpers().saveNovelToDatabase ? getHelpers().saveNovelToDatabase(opts) : Promise.resolve(false));

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
                    const prevTitle = orig.title;
                    orig.title = trimmedTitle;
                    orig.originalTitle = trimmedTitle;
                    renamedCount++;
                    if (orig.content) {
                        const firstLine = orig.content.split('\n')[0].trim();
                        if (/^#{1,6}\s+/.test(firstLine)) {
                            const hText = firstLine.replace(/^#{1,6}\s+/, '').trim();
                            const isEcho = (typeof window !== 'undefined' && window.isTitleEcho)
                                ? window.isTitleEcho(hText, prevTitle)
                                : (hText.toLowerCase() === (prevTitle || '').toLowerCase());
                            if (isEcho) {
                                orig.content = orig.content.replace(/^#{1,6}\s+.+/, `# ${trimmedTitle}`);
                            }
                        }
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
                const prevTitle = ch.title;
                const subPad = String(subCounter).padStart(pad > 1 ? pad : 1, '0');
                if (style === 'decimal') {
                    ch.title = `1.${subCounter}`;
                } else {
                    let clean = ch.title.replace(/^(?:Chapter|\bCh\b)?\s*[\d\.]+[\s:\.\-]+/i, '').trim();
                    ch.title = `${mainCounter - 1}.${subCounter} - ${clean || 'Untitled'}`;
                }
                ch.originalTitle = ch.title;
                if (ch.content) {
                    const firstLine = ch.content.split('\n')[0].trim();
                    if (/^#{1,6}\s+/.test(firstLine)) {
                        const hText = firstLine.replace(/^#{1,6}\s+/, '').trim();
                        const isEcho = (typeof window !== 'undefined' && window.isTitleEcho)
                            ? window.isTitleEcho(hText, prevTitle)
                            : (hText.toLowerCase() === (prevTitle || '').toLowerCase());
                        if (isEcho) {
                            ch.content = ch.content.replace(/^#{1,6}\s+.+/, `# ${ch.title}`);
                        }
                    }
                }
                if (ch.originalHead) {
                    ch.originalHead = ch.originalHead.replace(/<title>.*?<\/title>/gi, `<title>${escapeXml(ch.title)}</title>`);
                }
                subCounter++;
                numberedCount++;
                return;
            }

            // Level 1 chapter
            const prevTitle = ch.title;
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
            if (ch.content) {
                const firstLine = ch.content.split('\n')[0].trim();
                if (/^#{1,6}\s+/.test(firstLine)) {
                    const hText = firstLine.replace(/^#{1,6}\s+/, '').trim();
                    const isEcho = (typeof window !== 'undefined' && window.isTitleEcho)
                        ? window.isTitleEcho(hText, prevTitle)
                        : (hText.toLowerCase() === (prevTitle || '').toLowerCase());
                    if (isEcho) {
                        ch.content = ch.content.replace(/^#{1,6}\s+.+/, `# ${ch.title}`);
                    }
                }
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


  return {
    openSanitizePreviewModal,
    openHierarchyModal,
    autoDetectHierarchy,
    openTocManagerModal,
    harvestTocManagerInputs,
    renderTocManagerRows,
    saveTocManagerChanges,
    pasteBulkTitlesToToc,
    renumberTocManager,
    downloadImageItem,
    closeGalleryLightbox,
    closeGalleryModal,
    openGalleryModal,
    openGalleryLightbox,
    openFindReplaceModal,
    doGlobalReplace,
    doAutoNumber
  };
}));
