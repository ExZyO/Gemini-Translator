/**
 * app_tab_translate.js - Tab 1 (Translator & Text Input) for Gemini Translator
 * Handles source/target language selection, prompt instructions, glossary profiles,
 * live translation streaming & progress, split input/output view, diffs/QA audit,
 * celebratory export card, token cost telemetry, and execution logs.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    const exports = factory();
    Object.assign(root, exports);
  }
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  function TabTranslate(props) {
    const h = typeof React !== 'undefined' ? React.createElement : window.React?.createElement;
    const toast = (typeof window !== 'undefined' && window.toast) || props?.toast || function() {};
    const ic = (typeof window !== 'undefined' && window.ic) || props?.ic || function() { return null; };
    const btn = (typeof window !== 'undefined' && window.btn) || props?.btn || function(p, ...ch) { return h('button', p, ...ch); };
    const ArrowRightLeft = (typeof window !== 'undefined' && window.ArrowRightLeft) || props?.ArrowRightLeft || 'ArrowRightLeft';
    const LANGUAGES = (typeof window !== 'undefined' && window.LANGUAGES) || props?.LANGUAGES || ['Auto-detect', 'English', 'Spanish', 'French', 'German', 'Italian', 'Portuguese', 'Russian', 'Japanese', 'Korean', 'Chinese (Simplified)', 'Chinese (Traditional)', 'Arabic', 'Hindi', 'Indonesian', 'Vietnamese', 'Thai', 'Polish', 'Dutch', 'Turkish', 'Ukrainian', 'Czech', 'Swedish', 'Romanian', 'Greek', 'Hungarian', 'Danish', 'Finnish', 'Norwegian', 'Hebrew', 'Malay', 'Tagalog', 'Bengali', 'Persian', 'Slovak', 'Bulgarian', 'Serbian', 'Croatian', 'Lithuanian', 'Slovenian', 'Latvian', 'Estonian'];
    const TARGET_LANGUAGES = (typeof window !== 'undefined' && window.TARGET_LANGUAGES) || props?.TARGET_LANGUAGES || LANGUAGES.filter(l => l !== 'Auto-detect');

    const {
      error,
      setError = function() {},
      srcLang = 'Auto-detect',
      setSrcLang = function() {},
      tgtLang = 'English',
      setTgtLang = function() {},
      handleSwapLanguages = function() {},
      chunkSizePreset = 'turbo',
      concurrency = 2,
      inputText = '',
      setInputText = function() {},
      handleInputChange = function() {},
      inputCharCount = 0,
      inputTokenCount = 0,
      inputRef = { current: null },
      fileInputRef = { current: null },
      uploadingFile = false,
      processFile = function() {},
      onDragOver = function() {},
      onDragLeave = function() {},
      onDrop = function() {},
      isDragOver = false,
      handlePasteFromClipboard = function() {},
      inputBoxHeight,
      glossaryCardOpen = false,
      setGlossaryCardOpen = function() {},
      glossaryTermCount = 0,
      applyGlossaryPreset = function() {},
      newGlossaryName = '',
      setNewGlossaryName = function() {},
      handleSaveGlossary = function() {},
      activeGlossaryId = null,
      setActiveGlossaryId = function() {},
      handleLoadGlossary = function() {},
      handleDeleteGlossary = function() {},
      handleUnloadGlossary = function() {},
      savedGlossaries = [],
      defaultGlossaryName = '',
      setDefaultGlossaryName = function() {},
      clearDefaultGloss = function() {},
      smartGlossary = true,
      setSmartGlossary = function() {},
      setGlossaryEditorOpen = function() {},
      handleOpenAutoGlossary = function() {},
      handleRunConsistencyCheck = function() {},
      isAuditingConsistency = false,
      customInstructions = '',
      setCustomInstructions = function() {},
      instructionsRef = { current: null },
      terminology = '',
      setTerminology = function() {},
      savedTranslationSession = null,
      isTranslationPaused = false,
      activeSession = null,
      activeSessionRef = { current: null },
      resumeSavedTranslation = function() {},
      discardSavedTranslation = function() {},
      chapters = [],
      setChapters = function() {},
      isTranslating = false,
      progress = 0,
      progressLabel = '',
      elapsedSec = 0,
      handlePauseTranslation = function() {},
      cancelTranslation = function() {},
      assembledText = '',
      setAssembledText = function() {},
      handleAssembledTextChange = function() {},
      translatedChapters = [],
      setTranslatedChapters = function() {},
      outputWordCount = 0,
      outputRef = { current: null },
      outputBoxHeight,
      handleOpenActiveQaModal = function() {},
      handleOpenDiffModal = function() {},
      copyText = async function() {},
      handleDownloadEPUB = function() {},
      handleSaveTranslationToLibrarySpace = function() {},
      activeNovelRecord = null,
      activeCrawlSession = null,
      webImportData = null,
      webImportHistory = [],
      currentDocCover = '',
      setCurrentDocCover = function() {},
      currentDocTitle = '',
      fileName = '',
      handleLnoriDirectEpubDownload = function() {},
      setReaderChapterIdx = function() {},
      setReaderNovelId = function() {},
      setReaderNovelTitle = function() {},
      setReaderOpen = function() {},
      lastUsageStats = null,
      setLastUsageStats = function() {},
      showLiveLogs = false,
      setShowLiveLogs = function() {},
      liveLogs = [],
      logsContainerRef = { current: null },
      copyDiagnosticsReport = function() {},
      copyLogsWithReport = function() {},
      setLogsModalOpen = function() {},
      handleStartTranslation = function() {},
      handleOpenCostEstimator = function() {},
      setSheetOpen = function() {},
      setActiveTab = function() {},
      setWebImportUrl = function() {},
      disabled = props?.disabled !== undefined ? props.disabled : (isTranslating || uploadingFile),
      switchRow = props?.switchRow || ((label, checked, onChange) => h('div', { className: 'set-row' },
        h('span', null, label),
        h('label', { className: 'sw' },
          h('input', { type: 'checkbox', checked: !!checked, onChange }),
          h('span', null)
        )
      )),
      renderBoxResizeBar = props?.renderBoxResizeBar || ((boxType) => null)
    } = props || {};

    return h(React.Fragment, null,
      error && h('div', {
                className: 'card',
                style: {
                  background: 'rgba(239, 68, 68, 0.12)',
                  borderColor: 'rgba(239, 68, 68, 0.4)',
                  padding: '10px 14px',
                  marginBottom: 14,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  borderRadius: 10
                }
              },
                h('div', { style: { display: 'flex', alignItems: 'center', gap: 8 } },
                  h('span', { style: { fontSize: 16 } }, '⚠️'),
                  h('span', { style: { fontSize: 12.5, fontWeight: 600, color: '#fca5a5' } }, error)
                ),
                h('button', {
                  type: 'button',
                  onClick: () => setError(''),
                  style: { background: 'none', border: 'none', color: '#fca5a5', cursor: 'pointer', fontSize: 16, fontWeight: 'bold' }
                }, '✕')
              ),
              /lnori\.(?:org|com)/i.test(inputText) && h('div', {
                className: 'card',
                style: {
                  background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.12), rgba(16, 185, 129, 0.12))',
                  border: '1px solid rgba(99, 102, 241, 0.4)',
                  padding: '12px 14px',
                  marginBottom: 14,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: 8,
                  flexWrap: 'wrap'
                }
              },
                h('div', null,
                  h('div', { style: { fontWeight: 700, fontSize: 13, color: 'var(--paper)', display: 'flex', alignItems: 'center', gap: 6 } },
                    h('span', null, '✨ Lnori Link Detected (English Light Novel)'),
                    h('span', { className: 'chip', style: { color: '#10b981', borderColor: 'rgba(16, 185, 129, 0.4)', fontSize: '10.5px' } }, '🇬🇧 English Original')
                  ),
                  h('div', { style: { fontSize: 11.5, color: 'var(--slate)', marginTop: 2 } },
                    'Lnori light novels are already in official English! You can download the clean EPUB directly without translating.'
                  )
                ),
                h('button', {
                  type: 'button',
                  className: 'mini-btn',
                  style: { background: 'linear-gradient(90deg, #6366f1, #10b981)', color: '#fff', fontWeight: 700, border: 'none', padding: '7px 14px' },
                  onClick: () => {
                    const match = inputText.match(/https?:\/\/[^\s\n"']+/);
                    const url = match ? match[0] : inputText.trim();
                    setWebImportUrl(url);
                    setActiveTab('web_importer');
                    handleLnoriDirectEpubDownload(url);
                  }
                }, '⚡ Download Clean EPUB')
              ),
              (savedTranslationSession || isTranslationPaused || activeSessionRef.current) && !isTranslating && (() => {
                const s = savedTranslationSession || activeSessionRef.current || activeSession;
                if (!s) return null;
                const cCount = s.completedCount || 0;
                const tCount = s.total || s.totalChunks || '?';
                const isDelta = Boolean(s.isDeltaUpdate);
                const deltaLabel = `Ch ${s.deltaStart || (cCount + 1)}–${s.deltaEnd || tCount}`;
                return h('div', {
                  className: 'card',
                  style: {
                    background: isDelta
                      ? 'linear-gradient(135deg, rgba(37, 99, 235, 0.12), rgba(124, 58, 237, 0.12))'
                      : 'linear-gradient(135deg, rgba(99, 102, 241, 0.12), rgba(168, 85, 247, 0.12))',
                    borderColor: isDelta ? '#3b82f6' : 'var(--accent, #6366f1)',
                    marginBottom: 14
                  }
                },
                  h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 } },
                    h('div', null,
                      h('div', { style: { fontWeight: 700, fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 } },
                        h('span', null, isDelta ? '⚡ New Chapters Staged for Update' : '⏸ Saved Translation Session'),
                        h('span', { className: 'badge', style: { background: isDelta ? '#3b82f6' : 'var(--accent)', color: '#fff' } },
                          isDelta ? `${deltaLabel} waiting (${cCount} translated)` : `${cCount} / ${tCount} completed`
                        )
                      ),
                      h('div', { style: { fontSize: 11.5, opacity: 0.8, marginTop: 2 } },
                        isDelta
                          ? `${s?.title || 'Novel'} · Chapters 1–${cCount} preserved in library`
                          : `${s?.title || 'Translation'} · Saved ${new Date(s?.timestamp || Date.now()).toLocaleTimeString()}`
                      )
                    ),
                    h('div', { style: { display: 'flex', gap: 6 } },
                      h('button', {
                        type: 'button',
                        className: 'btn-primary',
                        style: {
                          padding: '5px 14px',
                          fontSize: 12,
                          background: isDelta ? 'linear-gradient(135deg, #2563eb, #7c3aed)' : 'linear-gradient(135deg, #10b981, #059669)',
                          color: '#fff',
                          border: 'none',
                          borderRadius: 6,
                          fontWeight: 700,
                          boxShadow: isDelta ? '0 2px 8px rgba(124, 58, 237, 0.35)' : 'none'
                        },
                        onClick: () => resumeSavedTranslation(s)
                      }, isDelta ? `▶ Translate Only New Chapters (${deltaLabel})` : '▶ Resume Translation'),
                      h('button', {
                        type: 'button',
                        className: 'chip-act',
                        style: { padding: '5px 10px', fontSize: 12 },
                        onClick: () => discardSavedTranslation(s.id)
                      }, 'Discard')
                    )
                  )
                );
              })(),

              h('div', { className: 'langrow' },
                h('select', { className: 'lang', value: srcLang, onChange: e => setSrcLang(e.target.value), disabled }, LANGUAGES.map(l => h('option', { key: l, value: l }, l))),
                h('button', { type: 'button', className: 'swap', title: 'Swap Languages', disabled: disabled || srcLang === 'Auto-detect', onClick: handleSwapLanguages }, ic(ArrowRightLeft, 14)),
                h('select', { className: 'lang', value: tgtLang, onChange: e => setTgtLang(e.target.value), disabled }, TARGET_LANGUAGES.map(l => h('option', { key: l, value: l }, l)))
              ),
              h('div', { className: 'meta', style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 6 } },
                h('div', { style: { display: 'flex', gap: 6, alignItems: 'center' } },
                  h('span', { className: 'chip' }, `${concurrency} streams`),
                  h('span', { className: 'chip' }, `${(chunkSizePreset || 'turbo').toUpperCase()}`)
                ),
                h('div', {
                  className: 'chip-act',
                  style: {
                    background: glossaryTermCount > 0 ? 'rgba(99, 102, 241, 0.22)' : 'var(--ember-2)',
                    color: glossaryTermCount > 0 ? '#c7d2fe' : 'var(--paper-dim)',
                    border: glossaryTermCount > 0 ? '1px solid var(--accent, #6366f1)' : '1px solid var(--hairline)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    cursor: 'pointer',
                    fontWeight: 600,
                    padding: '4px 10px',
                    borderRadius: 8
                  },
                  onClick: () => setGlossaryCardOpen(v => !v)
                },
                  h('span', null, '📖'),
                  h('span', null, activeGlossaryId ? `Glossary: ${activeGlossaryId}` : (glossaryTermCount > 0 ? 'Glossary: Custom' : 'Glossary: None')),
                  h('span', { style: { opacity: 0.85, fontSize: 10.5, fontWeight: 500 } }, `(${glossaryTermCount} terms${smartGlossary ? ' · Smart' : ''})`),
                  h('span', { style: { fontSize: 9, opacity: 0.7 } }, glossaryCardOpen ? '▲' : '▼')
                )
              ),

              h('div', { className: 'pane', onDragOver, onDragLeave, onDrop, style: isDragOver ? { borderColor: 'var(--iris-deep)' } : null },
                h('div', { className: 'pane-head' },
                  h('span', { className: 'lbl' }, 'Source'),
                  h('div', { className: 'pane-acts' },
                    inputText.trim() && h('button', { type: 'button', className: 'chip-act', disabled, onClick: () => { setInputText(''); setChapters([]); localStorage.removeItem('inputText'); } }, 'Clear'),
                    h('button', { type: 'button', className: 'chip-act', disabled, onClick: handlePasteFromClipboard }, 'Paste'),
                    h('button', { type: 'button', className: 'chip-act', disabled: disabled || uploadingFile, onClick: () => fileInputRef.current && fileInputRef.current.click() }, uploadingFile ? 'Loading…' : 'File'),
                    inputText.trim() && h('span', { className: 'count' }, `${inputCharCount.toLocaleString()} chars · ~${inputTokenCount.toLocaleString()} tok`)
                  )
                ),
                h('textarea', {
                  className: 'pane-textarea', ref: inputRef, value: inputText, disabled,
                  onChange: e => handleInputChange(e.target.value),
                  placeholder: 'Paste raw novel text or drop an EPUB/TXT/DOCX/PDF book here…',
                  style: { height: `${inputBoxHeight}px` }
                }),
                h('input', { type: 'file', ref: fileInputRef, onChange: (e) => { const f = e.target.files && e.target.files[0]; if (f) processFile(f); }, accept: '.txt,.epub,.docx,.pdf,.md,.html,.xml', style: { display: 'none' } })
              ),
              renderBoxResizeBar('input'),

              h('div', { className: 'pane' },
                h('div', { className: 'pane-head' },
                  h('span', { className: 'lbl' }, 'Translated'),
                  h('div', { className: 'pane-acts' },
                    h('button', { type: 'button', className: 'chip-act', disabled: isTranslating || !assembledText.trim(), onClick: () => { if (assembledText) copyText(assembledText).then(() => toast('Copied!')); } }, 'Copy'),
                    h('button', { type: 'button', className: 'chip-act', disabled: isTranslating || !assembledText.trim(), onClick: () => {
                      const docKey = currentDocTitle || fileName || 'translated_doc';
                      setReaderNovelId(docKey);
                      setReaderNovelTitle(currentDocTitle || fileName || 'Document');
                      const savedProg = window.getReadingProgress ? window.getReadingProgress(docKey) : null;
                      const resumeIdx = (savedProg && typeof savedProg.chapterIdx === 'number') ? savedProg.chapterIdx : 0;
                      setReaderChapterIdx(resumeIdx);
                      setReaderOpen(true);
                      if (savedProg && resumeIdx > 0) {
                        toast(`Resuming "${currentDocTitle || fileName || 'Document'}" at Chapter ${resumeIdx + 1}!`, 'success');
                      }
                    } }, 'Reader'),
                    h('button', { type: 'button', className: 'chip-act', disabled: isTranslating || (!assembledText.trim() && chapters.length === 0), onClick: handleOpenActiveQaModal, title: 'Audit translation for CJK leaks, empty chapters, loops, and AI refusals' }, '🩺 QA'),
                    h('button', { type: 'button', className: 'chip-act', disabled: isTranslating || (!assembledText.trim() && (!translatedChapters || translatedChapters.length === 0)), onClick: () => handleOpenDiffModal(0), title: 'Translation Revision Diffs & Rollbacks (§8.6)' }, '📜 Diffs'),
                    h('button', { type: 'button', className: 'chip-act', disabled: isTranslating || !assembledText.trim(), onClick: handleSaveTranslationToLibrarySpace, style: { borderColor: 'rgba(245, 158, 11, 0.4)', color: '#f59e0b', fontWeight: 600 } }, '⭐ Save to Space'),
                    assembledText.trim() && h('span', { className: 'count' }, `${outputWordCount.toLocaleString()} words`)
                  )
                ),
                h('textarea', {
                  className: 'pane-textarea out', ref: outputRef, value: assembledText, disabled: isTranslating, readOnly: isTranslating,
                  onChange: e => handleAssembledTextChange(e.target.value),
                  placeholder: 'Translated text will appear here…',
                  style: { height: `${outputBoxHeight}px` }
                })
              ),
              renderBoxResizeBar('output'),

              // ═══ GLOSSARY & BOOK PROFILES PANEL (TRANSLATE SCREEN) ═══
              h('div', { className: 'card', style: { marginTop: 12, borderColor: glossaryTermCount > 0 ? 'rgba(99, 102, 241, 0.4)' : 'var(--hairline)' } },
                h('div', { className: 'card-title', style: { marginBottom: glossaryCardOpen ? 10 : 0 } },
                  h('div', { style: { display: 'flex', alignItems: 'center', gap: 8 } },
                    h('span', { style: { fontWeight: 700 } }, '📖 Glossary & Profiles'),
                    activeGlossaryId
                      ? h('span', { className: 'badge', style: { background: 'var(--accent, #6366f1)', color: '#fff', fontSize: 10.5, padding: '2px 8px' } }, `Active: ${activeGlossaryId}`)
                      : (glossaryTermCount > 0
                          ? h('span', { className: 'badge', style: { background: 'rgba(99, 102, 241, 0.25)', color: '#a5b4fc', fontSize: 10.5, padding: '2px 8px' } }, 'Active: Custom')
                          : h('span', { className: 'count', style: { fontSize: 10.5 } }, 'None Active')
                        )
                  ),
                  h('div', { style: { display: 'flex', gap: 6, alignItems: 'center' } },
                    h('button', { type: 'button', className: 'mini-btn', disabled, onClick: () => setGlossaryEditorOpen(true), style: { fontSize: 11, padding: '3px 8px' } }, 'Editor'),
                    h('button', {
                      type: 'button',
                      className: 'chip-act',
                      onClick: () => setGlossaryCardOpen(v => !v),
                      style: { fontSize: 11 }
                    }, glossaryCardOpen ? '▲ Collapse' : '▼ Expand')
                  )
                ),
                glossaryCardOpen && h(React.Fragment, null,
                  // Quick Preset Chips
                  h('div', { className: 'seg', style: { marginBottom: 8 } },
                    h('button', { type: 'button', className: 'seg-btn', disabled, onClick: () => applyGlossaryPreset('ri') }, 'RI Preset'),
                    h('button', { type: 'button', className: 'seg-btn', disabled, onClick: () => applyGlossaryPreset('lotm') }, 'LOTM Preset'),
                    h('button', { type: 'button', className: 'seg-btn', disabled, onClick: () => applyGlossaryPreset('cote') }, 'COTE Preset'),
                    h('button', { type: 'button', className: 'seg-btn', disabled, onClick: () => applyGlossaryPreset('xianxia') }, 'Xianxia Preset')
                  ),

                  // Quick Term Bar
                  h('div', {
                    className: 'mini-input',
                    style: { cursor: disabled ? 'not-allowed' : 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', opacity: disabled ? 0.6 : 1 },
                    onClick: () => { if (!disabled) setGlossaryEditorOpen(true); }
                  },
                    h('span', null, `${glossaryTermCount} terms loaded · tap to open full table editor`),
                    h('span', { style: { fontSize: 11, color: 'var(--iris)' } }, 'Edit ➔')
                  ),

                  // Controls: AI Auto-Extract, Consistency Audit, Full Editor, Clear, Smart Filter Toggle
                  h('div', { style: { display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap', alignItems: 'center' } },
                    h('button', {
                      type: 'button',
                      className: 'mini-btn',
                      style: { background: 'rgba(99, 102, 241, 0.2)', color: 'var(--iris)', border: '1px solid currentColor', fontWeight: 600 },
                      disabled,
                      onClick: handleOpenAutoGlossary
                    }, '⚡ AI Auto-Extract'),
                    h('button', {
                      type: 'button',
                      className: 'mini-btn',
                      style: { background: 'rgba(16, 185, 129, 0.2)', color: 'var(--pine)', border: '1px solid currentColor', fontWeight: 600 },
                      onClick: handleRunConsistencyCheck,
                      disabled: disabled || isAuditingConsistency
                    }, isAuditingConsistency ? 'Auditing…' : '🔍 Verify Names'),
                    h('button', { type: 'button', className: 'mini-btn', disabled, onClick: () => setGlossaryEditorOpen(true) }, 'Open Full Editor'),
                    h('button', { type: 'button', className: 'mini-btn ghost', disabled, onClick: () => { setTerminology(''); localStorage.removeItem('terminology'); setActiveGlossaryId(null); localStorage.removeItem('activeGlossaryId'); toast('Glossary cleared.', 'info'); } }, 'Clear'),
                    switchRow('Smart Glossary Filter', smartGlossary, (v) => { if (!disabled) { setSmartGlossary(v); localStorage.setItem('smartGlossary', v); } })
                  ),

                  // Save Profile Row
                  h('div', { style: { display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap', alignItems: 'center' } },
                    activeGlossaryId && h('button', {
                      type: 'button',
                      className: 'mini-btn',
                      style: { background: 'var(--accent, #6366f1)', color: '#fff', fontWeight: 600 },
                      disabled,
                      onClick: () => handleSaveGlossary(activeGlossaryId)
                    }, `💾 Save to "${activeGlossaryId}"`),
                    h('input', { type: 'text', value: newGlossaryName, disabled, onChange: e => setNewGlossaryName(e.target.value), placeholder: activeGlossaryId ? 'Or save as new profile…' : 'Save current terms as profile name…', style: { background: 'var(--ember-2)', border: '1px solid var(--hairline)', borderRadius: 10, padding: '8px 10px', fontSize: 12, color: 'var(--paper-dim)', outline: 'none', flex: 1, minWidth: 140 } }),
                    h('button', { type: 'button', className: 'mini-btn ghost', disabled, onClick: () => handleSaveGlossary(newGlossaryName) }, 'Save Profile'),
                    activeGlossaryId && h('button', { type: 'button', className: 'mini-btn ghost', disabled, onClick: handleUnloadGlossary }, 'Unload')
                  ),

                  // Saved Profiles List
                  savedGlossaries.length > 0 && h(React.Fragment, null,
                    h('div', { className: 'card-title', style: { marginTop: 12, fontSize: 12 } },
                      h('span', null, `Saved Book Profiles (${savedGlossaries.length})`)
                    ),
                    savedGlossaries.map(g => h('div', { key: g.name, className: 'set-row', style: { padding: '5px 0' } },
                      h('span', { className: 'l', style: { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: activeGlossaryId === g.name ? 700 : 400, color: activeGlossaryId === g.name ? 'var(--iris)' : 'inherit' } },
                        `${g.name}${activeGlossaryId === g.name ? ' (Active)' : ''}${defaultGlossaryName === g.name ? ' (Default)' : ''}`
                      ),
                      h('div', { className: 'pane-acts' },
                        h('button', { type: 'button', className: `chip-act ${activeGlossaryId === g.name ? 'active' : ''}`, disabled, onClick: () => handleLoadGlossary(g) }, activeGlossaryId === g.name ? 'Loaded' : 'Load'),
                        h('button', { type: 'button', className: 'chip-act', disabled, onClick: () => { localStorage.setItem('defaultGlossaryName', g.name); setDefaultGlossaryName(g.name); toast(`Set "${g.name}" as default.`); } }, 'Default'),
                        h('button', { type: 'button', className: 'chip-act', disabled, onClick: () => handleDeleteGlossary(g.name) }, '✕')
                      )
                    )),
                    defaultGlossaryName && h('div', { style: { marginTop: 6 } },
                      h('button', { type: 'button', className: 'mini-btn danger', disabled, style: { fontSize: 11, padding: '3px 8px' }, onClick: clearDefaultGloss }, 'Clear Default Profile')
                    )
                  ),

                  // Custom Instructions Box
                  h('div', { style: { marginTop: 12, paddingTop: 10, borderTop: '1px solid var(--hairline)' } },
                    h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 } },
                      h('span', { style: { fontSize: 12, fontWeight: 600 } }, 'Custom Translation Instructions'),
                      h('div', { className: 'seg' },
                        h('button', { type: 'button', className: 'seg-btn', disabled, onClick: () => applyGlossaryPreset('literary') }, 'Literary'),
                        h('button', { type: 'button', className: 'seg-btn', disabled, onClick: () => applyGlossaryPreset('dialogue') }, 'Dialogue')
                      )
                    ),
                    h('textarea', {
                      className: 'mini-input', ref: instructionsRef, value: customInstructions, disabled,
                      onChange: e => { setCustomInstructions(e.target.value); localStorage.setItem('customInstructions', e.target.value); },
                      placeholder: 'e.g. "Use formal tone", "Keep Chinese honorifics", "Pallez speaks like an old gentleman"',
                      style: { width: '100%', height: 60, resize: 'vertical' }
                    })
                  )
                )
              ),

              isTranslating && h('div', { className: 'card', style: { borderColor: 'rgba(124,135,255,.45)' } },
                h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, marginBottom: 10 } },
                  h('span', { style: { fontSize: 12.5, fontWeight: 700, color: 'var(--iris)' } }, progressLabel || 'Translating…'),
                  h('div', { style: { display: 'flex', gap: 10, alignItems: 'center' } },
                    h('span', { className: 'count' }, `${Math.floor(elapsedSec / 60)}:${String(elapsedSec % 60).padStart(2, '0')}`),
                    h('button', { type: 'button', className: 'mini-btn secondary', onClick: handlePauseTranslation, title: 'Pause translation and save state to resume anytime' }, '⏸ Pause'),
                    h('button', { type: 'button', className: 'mini-btn danger', onClick: cancelTranslation }, 'Cancel')
                  )
                ),
                h('div', { className: 'mini-progress' }, h('i', { style: { width: `${progress}%` } })),
                h('div', { className: 'count', style: { marginTop: 8 } }, `${progress}%`)
              ),

              !isTranslating && (savedTranslationSession || isTranslationPaused || activeSessionRef.current) && (() => {
                const session = savedTranslationSession || activeSessionRef.current || activeSession;
                const completedCount = session?.completedCount || (translatedChapters || []).filter(c => c && (c.content || c.text)).length || 0;
                const totalCount = session?.total || session?.totalChunks || (chapters ? chapters.length : 1);
                const isDelta = Boolean(session?.isDeltaUpdate);
                const pct = totalCount > 0 ? Math.min(100, Math.round((completedCount / totalCount) * 100)) : (progress || 0);
                const sessionTitle = session?.title || (fileName && fileName.trim()) || activeNovelRecord?.title || 'Novel Translation';
                const deltaLabel = `Ch ${session?.deltaStart || (completedCount + 1)}–${session?.deltaEnd || totalCount}`;
                return h('div', {
                  className: 'card',
                  style: {
                    background: isDelta
                      ? 'linear-gradient(135deg, rgba(37, 99, 235, 0.08), rgba(124, 58, 237, 0.10))'
                      : 'linear-gradient(135deg, rgba(245, 158, 11, 0.08), rgba(99, 102, 241, 0.10))',
                    borderColor: isDelta ? '#3b82f6' : '#f59e0b',
                    borderWidth: '1.5px',
                    boxShadow: isDelta ? '0 4px 16px rgba(59, 130, 246, 0.15)' : '0 4px 16px rgba(245, 158, 11, 0.15)',
                    marginBottom: 14,
                    padding: '14px 16px'
                  }
                },
                  h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginBottom: 10 } },
                    h('div', { style: { display: 'flex', alignItems: 'center', gap: 8 } },
                      h('span', { style: { fontSize: 16 } }, isDelta ? '⚡' : '⏸'),
                      h('div', null,
                        h('div', { style: { fontWeight: 800, fontSize: 13.5, color: 'var(--paper)', display: 'flex', alignItems: 'center', gap: 6 } },
                          isDelta ? 'Novel Update Staged' : 'Translation Paused',
                          h('span', { className: 'badge', style: { background: isDelta ? '#2563eb' : '#f59e0b', color: isDelta ? '#fff' : '#000', fontWeight: 700 } },
                            isDelta ? `${deltaLabel} waiting to translate` : `${completedCount} / ${totalCount} completed`
                          )
                        ),
                        h('div', { style: { fontSize: 11.5, opacity: 0.8, marginTop: 2 } },
                          isDelta
                            ? `${sessionTitle} · ${completedCount} chapters already translated · ${Math.max(0, totalCount - completedCount)} new chapters staged`
                            : `${sessionTitle} · Progress safely preserved in database`
                        )
                      )
                    ),
                    h('span', { className: 'count', style: { fontWeight: 700, color: isDelta ? '#3b82f6' : '#f59e0b' } }, `${pct}%`)
                  ),
                  h('div', { className: 'mini-progress', style: { background: isDelta ? 'rgba(59, 130, 246, 0.2)' : 'rgba(245, 158, 11, 0.2)', height: 8, borderRadius: 4, marginBottom: 12 } },
                    h('i', { style: { width: `${pct}%`, background: isDelta ? 'linear-gradient(90deg, #2563eb, #7c3aed)' : 'linear-gradient(90deg, #f59e0b, #6366f1)', borderRadius: 4 } })
                  ),
                  h('div', { style: { display: 'flex', gap: 8, alignItems: 'center' } },
                    h('button', {
                      type: 'button',
                      className: 'btn-primary',
                      style: {
                        background: isDelta ? 'linear-gradient(135deg, #2563eb, #7c3aed)' : 'linear-gradient(135deg, #10b981, #059669)',
                        color: '#fff',
                        fontWeight: 700,
                        fontSize: 13,
                        padding: '9px 18px',
                        flex: 1,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 8,
                        boxShadow: isDelta ? '0 2px 10px rgba(124, 58, 237, 0.35)' : '0 2px 10px rgba(16, 185, 129, 0.35)',
                        border: 'none',
                        cursor: 'pointer',
                        borderRadius: 8
                      },
                      onClick: () => resumeSavedTranslation(session)
                    }, isDelta ? `▶ Translate Only New Chapters (${deltaLabel})` : '▶ Resume Translation'),
                    h('button', {
                      type: 'button',
                      className: 'chip-act',
                      style: { padding: '9px 14px', fontSize: 12, borderRadius: 8 },
                      title: 'Discard staged/paused session and start over',
                      onClick: () => discardSavedTranslation(session?.id)
                    }, 'Discard')
                  )
                );
              })(),

              // ═══ CELEBRATORY COMPLETION & EXPORT CARD ═══
              !isTranslating && !(savedTranslationSession || isTranslationPaused || activeSessionRef.current) && assembledText && translatedChapters && translatedChapters.filter(c => c && (c.content || c.text)).length > 0 && (activeNovelRecord || (chapters && chapters.length > 0)) && (() => {
                const transCount = translatedChapters.filter(c => c && (c.content || c.text)).length;
                const novelTitle = (activeNovelRecord && activeNovelRecord.title) || (fileName && fileName.trim()) || 'Translated Novel';
                const cleanNT = (typeof window !== 'undefined' && window.normalizeTitleKey)
                  ? window.normalizeTitleKey(novelTitle)
                  : String(novelTitle || '').replace(/\.[^/.]+$/, '').replace(/\s*\((?:Translated|Translation)\)/gi, '').trim().toLowerCase();
                const historyMatch = (typeof webImportHistory !== 'undefined' && Array.isArray(webImportHistory))
                  ? webImportHistory.find(n => {
                      const nt = (typeof window !== 'undefined' && window.normalizeTitleKey)
                        ? window.normalizeTitleKey(n?.title)
                        : String(n?.title || '').replace(/\s*\((?:Translated|Translation)\)/gi, '').trim().toLowerCase();
                      return nt && (nt === cleanNT || cleanNT.includes(nt) || nt.includes(cleanNT)) && n.cover;
                    })
                  : null;
                const effectiveCover = currentDocCover || activeNovelRecord?.cover || activeCrawlSession?.cover || webImportData?.cover || historyMatch?.cover || (typeof localStorage !== 'undefined' ? localStorage.getItem('gemini_current_doc_cover') : '') || '';

                const handleCoverFileSelect = (e) => {
                  const file = e.target?.files?.[0];
                  if (!file) return;
                  const r = new FileReader();
                  r.onload = ev => {
                    const dataUrl = ev.target.result;
                    setCurrentDocCover(dataUrl);
                    if (activeNovelRecord) {
                      activeNovelRecord.cover = dataUrl;
                    }
                    toast('EPUB cover art updated!', 'success');
                  };
                  r.readAsDataURL(file);
                };

                return h('div', {
                  className: 'card',
                  style: {
                    background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.12), rgba(99, 102, 241, 0.12))',
                    borderColor: '#22c55e',
                    borderWidth: '1.5px',
                    boxShadow: '0 4px 16px rgba(34, 197, 94, 0.15)',
                    marginBottom: 14,
                    padding: '16px 18px'
                  }
                },
                  h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10, marginBottom: 12 } },
                    h('div', { style: { display: 'flex', alignItems: 'center', gap: 12 } },
                      effectiveCover
                        ? h('div', { style: { position: 'relative', width: 44, height: 60, flexShrink: 0, borderRadius: 6, overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.2)' } },
                            h('img', { src: effectiveCover, alt: 'Cover', style: { width: '100%', height: '100%', objectFit: 'cover' } })
                          )
                        : h('div', {
                            style: {
                              width: 44,
                              height: 60,
                              flexShrink: 0,
                              borderRadius: 6,
                              background: 'linear-gradient(135deg, #10b981, #059669)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: 20,
                              boxShadow: '0 4px 12px rgba(16, 185, 129, 0.35)'
                            }
                          }, '🎉'),
                      h('div', null,
                        h('div', { style: { fontWeight: 800, fontSize: 14, color: 'var(--paper)', display: 'flex', alignItems: 'center', gap: 8 } },
                          'Translation Complete & Saved to Library',
                          h('span', { className: 'badge', style: { background: '#22c55e', color: '#000', fontWeight: 700 } }, `${transCount} Chapters`)
                        ),
                        h('div', { style: { fontSize: 11.5, opacity: 0.85, marginTop: 2 } },
                          `${novelTitle} · All progress safely preserved in database`
                        )
                      )
                    ),
                    h('label', {
                      className: 'chip-act',
                      style: { cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11.5, padding: '6px 12px', borderRadius: 6, border: '1px solid rgba(34, 197, 94, 0.4)', background: 'var(--bg-card-hover, rgba(255, 255, 255, 0.08))' },
                      title: 'Upload or replace EPUB cover art'
                    },
                      h('span', null, effectiveCover ? '🖼️ Change Cover' : '🖼️ Add Cover'),
                      h('input', {
                        type: 'file',
                        accept: 'image/*',
                        style: { display: 'none' },
                        onChange: handleCoverFileSelect
                      })
                    )
                  ),
                  h('div', { style: { display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' } },
                    h('button', {
                      type: 'button',
                      className: 'btn-primary',
                      style: {
                        background: 'linear-gradient(135deg, #22c55e, #15803d)',
                        color: '#fff',
                        fontWeight: 700,
                        fontSize: 13,
                        padding: '9px 18px',
                        flex: 1,
                        minWidth: 200,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 8,
                        boxShadow: '0 2px 10px rgba(34, 197, 94, 0.35)',
                        border: 'none',
                        borderRadius: 8,
                        cursor: 'pointer'
                      },
                      onClick: handleDownloadEPUB
                    }, `📥 Download Updated EPUB (${transCount} Chapters)`),
                    h('button', {
                      type: 'button',
                      className: 'mini-btn',
                      style: { background: 'var(--accent, #6366f1)', color: '#fff', fontWeight: 600, padding: '9px 16px', borderRadius: 8 },
                      onClick: () => {
                        const docKey = currentDocTitle || fileName || 'translated_doc';
                        setReaderNovelId(docKey);
                        setReaderNovelTitle(currentDocTitle || fileName || 'Document');
                        const savedProg = window.getReadingProgress ? window.getReadingProgress(docKey) : null;
                        const resumeIdx = (savedProg && typeof savedProg.chapterIdx === 'number') ? savedProg.chapterIdx : 0;
                        setReaderChapterIdx(resumeIdx);
                        setReaderOpen(true);
                        if (savedProg && resumeIdx > 0) {
                          toast(`Resuming "${currentDocTitle || fileName || 'Document'}" at Chapter ${resumeIdx + 1}!`, 'success');
                        }
                      }
                    }, '📖 Read in Reader'),
                    h('button', {
                      type: 'button',
                      className: 'chip-act',
                      style: { borderColor: 'rgba(245, 158, 11, 0.5)', color: '#f59e0b', fontWeight: 600, padding: '9px 14px', borderRadius: 8 },
                      onClick: handleSaveTranslationToLibrarySpace
                    }, '⭐ Save to Space')
                  )
                );
              })(),

              lastUsageStats && !isTranslating && h('div', { className: 'card', style: { borderColor: 'var(--accent, #6366f1)' } },
                h('div', { className: 'card-title' },
                  h('span', null, '📊 Last Translation Summary'),
                  h('div', { style: { display: 'flex', gap: 6 } },
                    h('button', { type: 'button', className: 'chip-act', title: 'Copy Report & Logs to Clipboard', onClick: () => copyDiagnosticsReport(), style: { background: 'var(--accent, #6366f1)', color: '#fff', fontWeight: 600 } }, '📋 Copy Report'),
                    h('button', { type: 'button', className: 'chip-act', title: 'Open Live Logs Viewer', onClick: () => setLogsModalOpen(true) }, '📜 Logs'),
                    h('button', { type: 'button', className: 'chip-act', onClick: () => setLastUsageStats(null) }, '✕')
                  )
                ),
                h('div', { className: 'set-row' }, h('span', { className: 'l' }, 'Model'), h('span', { className: 'count' }, `${lastUsageStats.provider || ''} · ${lastUsageStats.model || ''}`)),
                h('div', { className: 'set-row' }, h('span', { className: 'l' }, 'Engine Mode'), h('span', { className: 'count' }, `Thinking: ${lastUsageStats.enableThinking ? 'ON' : 'OFF'} · Stream: ${lastUsageStats.enableStreaming ? 'ON' : 'OFF'}`)),
                h('div', { className: 'set-row' }, h('span', { className: 'l' }, 'Pipeline Config'), h('span', { className: 'count' }, `Context: ${lastUsageStats.contextAware ? 'ON' : 'OFF'} · ${lastUsageStats.concurrency || 1} Stream(s)`)),
                h('div', { className: 'set-row' }, h('span', { className: 'l' }, 'Chunk Size'), h('span', { className: 'count' }, `${(lastUsageStats.chunkSizePreset || 'turbo').toUpperCase()}`)),
                h('div', { className: 'set-row' }, h('span', { className: 'l' }, 'Smart Glossary'), h('span', { className: 'count' }, `${lastUsageStats.smartGlossary ? 'ON' : 'OFF'} (${lastUsageStats.glossaryTermCount || 0} terms loaded)`)),
                h('div', { className: 'set-row' }, h('span', { className: 'l' }, 'Tokens'), h('span', { className: 'count', style: { fontWeight: 700 } }, `${(lastUsageStats.totalTokens || 0).toLocaleString()} (${(lastUsageStats.promptTokens || 0).toLocaleString()} in · ${(lastUsageStats.outputTokens || 0).toLocaleString()} out)`)),
                lastUsageStats.breakdown && h('div', {
                  style: {
                    background: 'var(--bg-card-hover, rgba(255, 255, 255, 0.04))',
                    border: '1px solid var(--border-color, rgba(255, 255, 255, 0.08))',
                    borderRadius: 8,
                    padding: '8px 12px',
                    margin: '6px 0 8px 0',
                    fontSize: 12,
                    lineHeight: 1.6
                  }
                },
                  h('div', { style: { display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontWeight: 600, color: 'var(--accent, #6366f1)' } },
                    h('span', null, '📊 Token Breakdown'),
                    h('span', { style: { fontSize: 11, opacity: 0.8 } }, `${lastUsageStats.promptTokens.toLocaleString()} in · ${lastUsageStats.outputTokens.toLocaleString()} out`)
                  ),
                  lastUsageStats.breakdown.glossaryTokens > 0 && h('div', { style: { display: 'flex', justifyContent: 'space-between', color: '#38bdf8' } },
                    h('span', null, '├─ Injected Glossary'),
                    h('span', { style: { fontFamily: 'monospace', fontWeight: 600 } }, `${lastUsageStats.breakdown.glossaryTokens.toLocaleString()} (${lastUsageStats.breakdown.glossaryPct}%)`)
                  ),
                  h('div', { style: { display: 'flex', justifyContent: 'space-between', color: '#4ade80' } },
                    h('span', null, '├─ Raw Source Text'),
                    h('span', { style: { fontFamily: 'monospace', fontWeight: 600 } }, `${lastUsageStats.breakdown.sourceTokens.toLocaleString()} (${lastUsageStats.breakdown.sourcePct}%)`)
                  ),
                  lastUsageStats.breakdown.genderTokens > 0 && h('div', { style: { display: 'flex', justifyContent: 'space-between', color: '#f472b6' } },
                    h('span', null, '├─ Gender Lock Protocol'),
                    h('span', { style: { fontFamily: 'monospace', fontWeight: 600 } }, `${lastUsageStats.breakdown.genderTokens.toLocaleString()} (${lastUsageStats.breakdown.genderPct}%)`)
                  ),
                  lastUsageStats.breakdown.contextTokens > 0 && h('div', { style: { display: 'flex', justifyContent: 'space-between', color: '#fbbf24' } },
                    h('span', null, '├─ Context-Aware Memory'),
                    h('span', { style: { fontFamily: 'monospace', fontWeight: 600 } }, `${lastUsageStats.breakdown.contextTokens.toLocaleString()} (${lastUsageStats.breakdown.contextPct}%)`)
                  ),
                  h('div', { style: { display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary, #94a3b8)' } },
                    h('span', null, '└─ System & Rules Overhead'),
                    h('span', { style: { fontFamily: 'monospace', fontWeight: 600 } }, `${lastUsageStats.breakdown.systemTokens.toLocaleString()} (${lastUsageStats.breakdown.systemPct}%)`)
                  )
                ),
                h('div', { className: 'set-row' }, h('span', { className: 'l' }, 'Cost'), h('span', { className: 'count' }, lastUsageStats.cost || '$0.0000')),
                h('div', { className: 'set-row' }, h('span', { className: 'l' }, 'Time & Speed'), h('span', { className: 'count' }, `${lastUsageStats.duration || ''}${lastUsageStats.speed ? ' · ' + lastUsageStats.speed : ''}`)),
                h('div', { className: 'set-row' }, h('span', { className: 'l' }, 'Words Translated'), h('span', { className: 'count' }, outputWordCount.toLocaleString()))
              ),

              // ═══ TRANSLATOR BOTTOM LOGS PANEL ═══
              h('div', { className: 'card', style: { marginTop: 12, marginBottom: 12 } },
                h('div', { className: 'card-title', style: { marginBottom: showLiveLogs ? 8 : 0 } },
                  h('span', { style: { display: 'flex', alignItems: 'center', gap: 6 } },
                    h('span', null, '📜 Live Diagnostics & API Logs'),
                    h('span', { className: 'count', style: { fontSize: 10 } }, `${liveLogs.length} events`)
                  ),
                  h('div', { style: { display: 'flex', gap: 6, alignItems: 'center' } },
                    showLiveLogs && h('button', {
                      type: 'button',
                      className: 'chip-act',
                      title: 'Copy All Logs to Clipboard',
                      onClick: copyLogsWithReport
                    }, '📋 Copy Logs'),
                    showLiveLogs && h('button', {
                      type: 'button',
                      className: 'chip-act',
                      title: 'Clear Logs',
                      onClick: () => {
                        window.AppLogger?.clear();
                        toast('Logs cleared', 'info');
                      }
                    }, '🗑 Clear'),
                    h('button', {
                      type: 'button',
                      className: `chip-act ${showLiveLogs ? 'active' : ''}`,
                      onClick: () => setShowLiveLogs(v => !v),
                      style: showLiveLogs ? { background: 'var(--accent, #6366f1)', color: '#fff', fontWeight: 600 } : {}
                    }, showLiveLogs ? 'ON' : 'OFF')
                  )
                ),
                showLiveLogs && h('div', {
                  ref: logsContainerRef,
                  style: {
                    maxHeight: 220,
                    overflowY: 'auto',
                    background: '#07090e',
                    color: '#e2e8f0',
                    fontFamily: "'IBM Plex Mono', monospace",
                    fontSize: 10.5,
                    lineHeight: 1.5,
                    padding: 10,
                    borderRadius: 8,
                    border: '1px solid var(--hairline)',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-all'
                  }
                },
                  liveLogs.length === 0
                    ? h('div', { style: { color: '#64748b', textAlign: 'center', padding: '20px 0' } }, 'Ready. Run a translation to see live API calls, key leases, and responses.')
                    : liveLogs.map((l, idx) => {
                        const color = l.level === 'warn' ? '#f59e0b' : (l.level === 'error' ? '#ef4444' : '#38bdf8');
                        const det = l.details ? ' ' + (typeof l.details === 'object' ? JSON.stringify(l.details) : String(l.details)) : '';
                        return h('div', { key: idx, style: { marginBottom: 3 } },
                          h('span', { style: { color: '#64748b' } }, `[${l.time}] `),
                          h('span', { style: { color, fontWeight: 600 } }, `[${l.tag}] `),
                          h('span', null, l.message),
                          det && h('span', { style: { color: '#94a3b8' } }, det)
                        );
                      })
                )
              ),

              chapters.length > 0 && h('div', { className: 'count', style: { margin: '0 2px 8px' } }, `${chapters.length} chapters loaded`),

              h('div', { className: 'actionbar' },
                (savedTranslationSession || isTranslationPaused || activeSessionRef.current) && !isTranslating ? (() => {
                  const s = savedTranslationSession || activeSessionRef.current || activeSession;
                  const cCount = s?.completedCount || 0;
                  const tCount = s?.total || s?.totalChunks || '?';
                  const isDelta = Boolean(s?.isDeltaUpdate);
                  const deltaLabel = `Ch ${s?.deltaStart || (cCount + 1)}–${s?.deltaEnd || tCount}`;
                  return h(React.Fragment, null,
                    h('button', {
                      type: 'button',
                      className: 'primary',
                      style: {
                        background: isDelta ? 'linear-gradient(135deg, #2563eb, #7c3aed)' : 'linear-gradient(135deg, #10b981, #059669)',
                        fontWeight: 700,
                        flex: 1,
                        boxShadow: isDelta ? '0 2px 10px rgba(124, 58, 237, 0.4)' : undefined
                      },
                      onClick: () => resumeSavedTranslation(s)
                    }, isDelta ? `▶ Translate Only New Chapters (${deltaLabel})` : `▶ Resume Translation (${cCount}/${tCount} done)`),
                    h('button', {
                      type: 'button',
                      className: 'chip-act',
                      style: { padding: '8px 12px', fontSize: 12 },
                      title: 'Discard staged/paused session and start fresh',
                      onClick: () => discardSavedTranslation(s?.id)
                    }, 'Start New')
                  );
                })() : h('button', {
                  type: 'button',
                  className: 'primary',
                  disabled: isTranslating || (!inputText.trim() && (!chapters || chapters.length === 0)),
                  onClick: () => handleStartTranslation()
                }, isTranslating ? 'Translating…' : '◐ Translate'),
                h('button', {
                  type: 'button',
                  className: 'chip-act',
                  style: { padding: '8px 12px', fontSize: 13, background: 'rgba(99, 102, 241, 0.15)', borderColor: 'var(--iris)', color: 'var(--iris)', fontWeight: 600 },
                  disabled: isTranslating || (!inputText.trim() && (!chapters || chapters.length === 0)),
                  onClick: handleOpenCostEstimator,
                  title: 'Calculate exact tokens, model costs, and time projections before translating (§7.2 / §3.6)'
                }, '💰 Estimate'),
                h('button', { type: 'button', className: 'overflow', title: 'More actions', disabled: isTranslating, onClick: () => setSheetOpen(true) }, '⋯')
              )
            
    );
  }

  return { TabTranslate };
}));
