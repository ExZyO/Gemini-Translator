/**
 * app_tab_translate.js - Tabbed Full-Bleed Translator Workspace for Gemini Translator
 * OmniTrack Pure-AMOLED Editorial Option A layout:
 * 25px header + circular icon triggers, 0.6px hairline Language Pair Bar,
 * unboxed 4-col Telemetry Strip, underline pane switcher (Source / Translated / Live Stream),
 * and full-bleed distraction-free prose canvas with inline Action Bar.
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
    const ReactObj = typeof React !== 'undefined' ? React : (typeof window !== 'undefined' ? window.React : null);
    const useState = ReactObj?.useState || function (init) { return [typeof init === 'function' ? init() : init, function () {}]; };
    const useEffect = ReactObj?.useEffect || function () {};
    const h = typeof React !== 'undefined' ? React.createElement : window.React?.createElement;
    const toast = (typeof window !== 'undefined' && window.toast) || props?.toast || function () {};
    const ic = (typeof window !== 'undefined' && window.ic) || props?.ic || function () { return null; };
    const ArrowRightLeft = (typeof window !== 'undefined' && window.ArrowRightLeft) || props?.ArrowRightLeft || 'ArrowRightLeft';
    const LANGUAGES = (typeof window !== 'undefined' && window.LANGUAGES) || props?.LANGUAGES || ['Auto-detect', 'English', 'Spanish', 'French', 'German', 'Italian', 'Portuguese', 'Russian', 'Japanese', 'Korean', 'Chinese (Simplified)', 'Chinese (Traditional)', 'Arabic', 'Hindi', 'Indonesian', 'Vietnamese', 'Thai', 'Polish', 'Dutch', 'Turkish', 'Ukrainian', 'Czech', 'Swedish', 'Romanian', 'Greek', 'Hungarian', 'Danish', 'Finnish', 'Norwegian', 'Hebrew', 'Malay', 'Tagalog', 'Bengali', 'Persian', 'Slovak', 'Bulgarian', 'Serbian', 'Croatian', 'Lithuanian', 'Slovenian', 'Latvian', 'Estonian'];
    const TARGET_LANGUAGES = (typeof window !== 'undefined' && window.TARGET_LANGUAGES) || props?.TARGET_LANGUAGES || LANGUAGES.filter(l => l !== 'Auto-detect');

    const {
      error,
      setError = function () {},
      srcLang = 'Auto-detect',
      setSrcLang = function () {},
      tgtLang = 'English',
      setTgtLang = function () {},
      provider = 'gemini',
      geminiModel = 'gemini-3.7-flash',
      deepseekModel = 'deepseek-chat',
      customModel = '',
      useCustomModel = false,
      customDeepseekModel = '',
      useCustomDeepseekModel = false,
      handleSwapLanguages = function () {},
      handleResetTranslateTab = function () {},
      chunkSizePreset = 'turbo',
      concurrency = 2,
      inputText = '',
      setInputText = function () {},
      handleInputChange = function () {},
      inputCharCount = 0,
      inputTokenCount = 0,
      inputRef = { current: null },
      fileInputRef = { current: null },
      uploadingFile = false,
      processFile = function () {},
      onDragOver = function () {},
      onDragLeave = function () {},
      onDrop = function () {},
      isDragOver = false,
      handlePasteFromClipboard = function () {},
      inputBoxHeight = 260,
      glossaryCardOpen = false,
      setGlossaryCardOpen = function () {},
      glossaryTermCount = 0,
      applyGlossaryPreset = function () {},
      newGlossaryName = '',
      setNewGlossaryName = function () {},
      handleSaveGlossary = function () {},
      activeGlossaryId = null,
      setActiveGlossaryId = function () {},
      handleLoadGlossary = function () {},
      handleDeleteGlossary = function () {},
      handleUnloadGlossary = function () {},
      savedGlossaries = [],
      defaultGlossaryName = '',
      setDefaultGlossaryName = function () {},
      clearDefaultGloss = function () {},
      smartGlossary = true,
      setSmartGlossary = function () {},
      setGlossaryEditorOpen = function () {},
      handleOpenAutoGlossary = function () {},
      handleRunConsistencyCheck = function () {},
      isAuditingConsistency = false,
      customInstructions = '',
      setCustomInstructions = function () {},
      instructionsRef = { current: null },
      setTerminology = function () {},
      savedTranslationSession = null,
      isTranslationPaused = false,
      activeSession = null,
      activeSessionRef = { current: null },
      resumeSavedTranslation = function () {},
      discardSavedTranslation = function () {},
      chapters = [],
      setChapters = function () {},
      isTranslating = false,
      progress = 0,
      progressLabel = '',
      elapsedSec = 0,
      handlePauseTranslation = function () {},
      cancelTranslation = function () {},
      assembledText = '',
      handleAssembledTextChange = function () {},
      translatedChapters = [],
      outputWordCount = 0,
      outputRef = { current: null },
      outputBoxHeight = 280,
      handleOpenActiveQaModal = function () {},
      handleOpenDiffModal = function () {},
      copyText = async function () {},
      handleDownloadEPUB = function () {},
      handleSaveTranslationToLibrarySpace = function () {},
      activeNovelRecord = null,
      activeCrawlSession = null,
      webImportData = null,
      webImportHistory = [],
      currentDocCover = '',
      setCurrentDocCover = function () {},
      currentDocTitle = '',
      fileName = '',
      handleLnoriDirectEpubDownload = function () {},
      setReaderChapterIdx = function () {},
      setReaderNovelId = function () {},
      setReaderNovelTitle = function () {},
      setReaderOpen = function () {},
      setReaderChapters = function () {},
      lastUsageStats = null,
      setLastUsageStats = function () {},
      setShowLiveLogs = function () {},
      liveLogs = [],
      logsContainerRef = { current: null },
      copyDiagnosticsReport = function () {},
      copyLogsWithReport = function () {},
      setLogsModalOpen = function () {},
      handleStartTranslation = function () {},
      handleOpenCostEstimator = function () {},
      setSheetOpen = function () {},
      setActiveTab = function () {},
      setWebImportUrl = function () {},
      setFileName = function () {},
      getExportChapters,
      disabled = props?.disabled !== undefined ? props.disabled : (isTranslating || uploadingFile),
      renderBoxResizeBar = props?.renderBoxResizeBar || (() => null)
    } = props || {};

    const [activePaneTab, setActivePaneTab] = useState('source'); // 'source' | 'translated' | 'stream'

    useEffect(() => {
      if (isTranslating) {
        setActivePaneTab('stream');
      }
    }, [isTranslating]);

    const activeModelDisplay = (provider || 'gemini') === 'gemini'
      ? (String((useCustomModel && customModel ? customModel : geminiModel) || 'Flash').replace(/^gemini-/, '') || 'Flash')
      : (provider === 'deepseek' ? String((useCustomDeepseekModel && customDeepseekModel ? customDeepseekModel : deepseekModel) || 'DeepSeek') : provider.toUpperCase());

    const openTranslatedInReader = () => {
      if (!assembledText.trim() && (!translatedChapters || translatedChapters.length === 0) && (!chapters || chapters.length === 0)) {
        toast('Nothing loaded to open in Reader yet.', 'info');
        return;
      }
      const docKey = currentDocTitle || fileName || 'translated_doc';
      setReaderNovelId(docKey);
      setReaderNovelTitle(currentDocTitle || fileName || 'Document');
      if (typeof setReaderChapters === 'function') {
        const exportChs = (typeof getExportChapters === 'function')
          ? getExportChapters()
          : ((translatedChapters && translatedChapters.length > 0) ? translatedChapters : chapters);
        if (Array.isArray(exportChs) && exportChs.length > 0) setReaderChapters(exportChs);
      }
      const savedProg = window.getReadingProgress ? window.getReadingProgress(docKey) : null;
      const resumeIdx = (savedProg && typeof savedProg.chapterIdx === 'number') ? savedProg.chapterIdx : 0;
      setReaderChapterIdx(resumeIdx);
      setReaderOpen(true);
    };

    const hasAnyContent = Boolean(inputText || assembledText || (chapters && chapters.length > 0) || savedTranslationSession || activeSessionRef?.current);
    const hasCompletedTranslation = !isTranslating && !(savedTranslationSession || isTranslationPaused || activeSessionRef.current) && assembledText && translatedChapters && translatedChapters.filter(c => c && (c.content || c.text)).length > 0 && (activeNovelRecord || (chapters && chapters.length > 0));

    return h(React.Fragment, null,
      // Hidden file picker mounted unconditionally so Upload trigger always works
      h('input', {
        type: 'file',
        ref: fileInputRef,
        onChange: (e) => { const f = e.target.files && e.target.files[0]; if (f) processFile(f); },
        accept: '.txt,.epub,.docx,.pdf,.md,.html,.xml',
        style: { display: 'none' }
      }),

      // 1. Clean 25px Header + Circular Action Triggers
      h('div', { className: 'omni-page-hd' },
        h('div', null,
          h('h1', { className: 'omni-page-title' }, 'Translate')
        ),
        h('div', { className: 'omni-header-actions' },
          h('button', {
            type: 'button',
            className: 'omni-circle-btn',
            title: 'Import EPUB, TXT, DOCX, or PDF',
            disabled: disabled || uploadingFile,
            onClick: () => fileInputRef.current && fileInputRef.current.click()
          }, ic('Upload', 16)),
          h('button', {
            type: 'button',
            className: `omni-circle-btn ${(glossaryCardOpen || glossaryTermCount > 0) ? 'active' : ''}`,
            title: 'Glossary & Custom Prompt Rules',
            onClick: () => setGlossaryCardOpen(v => !v)
          }, ic('BookOpen', 16)),
          h('button', {
            type: 'button',
            className: 'omni-circle-btn',
            title: 'Export & Split Tools',
            disabled: isTranslating,
            onClick: () => setSheetOpen(true)
          }, ic('Sliders', 16)),
          hasAnyContent && h('button', {
            type: 'button',
            className: 'omni-circle-btn',
            style: { color: '#F87171' },
            title: 'Reset Translate Tab',
            disabled: isTranslating,
            onClick: handleResetTranslateTab
          }, ic('RotateCcw', 15))
        )
      ),

      // 2. Frameless 0.6px Hairline Language Pair Bar
      h('div', { className: 'omni-lang-bar' },
        h('select', { className: 'omni-lang-select', value: srcLang, onChange: e => setSrcLang(e.target.value), disabled },
          LANGUAGES.map(l => h('option', { key: l, value: l }, l))
        ),
        h('button', {
          type: 'button',
          className: 'omni-circle-btn',
          style: { width: 32, height: 32 },
          title: 'Swap Languages',
          disabled: disabled || srcLang === 'Auto-detect',
          onClick: handleSwapLanguages
        }, ic(ArrowRightLeft, 14)),
        h('select', { className: 'omni-lang-select', style: { textAlign: 'right' }, value: tgtLang, onChange: e => setTgtLang(e.target.value), disabled },
          TARGET_LANGUAGES.map(l => h('option', { key: l, value: l }, l))
        )
      ),

      // 3. Unboxed 4-Column Telemetry Strip
      h('div', { className: 'omni-hairline-strip', style: { marginTop: 8, marginBottom: 8 } },
        h('div', { className: 'omni-stat-cell' },
          h('div', { className: 'omni-stat-val' }, activeModelDisplay),
          h('div', { className: 'omni-stat-lbl' }, 'Model')
        ),
        h('div', { className: 'omni-stat-cell' },
          h('div', { className: 'omni-stat-val' }, chapters?.length > 0 ? `${chapters.length} Ch` : `${concurrency}x ${(chunkSizePreset || 'turbo').toUpperCase()}`),
          h('div', { className: 'omni-stat-lbl' }, chapters?.length > 0 ? 'Chapters' : 'Speed')
        ),
        h('div', { className: 'omni-stat-cell' },
          h('div', { className: 'omni-stat-val' }, inputTokenCount > 0 ? `~${inputTokenCount.toLocaleString()}` : '0'),
          h('div', { className: 'omni-stat-lbl' }, 'Tokens')
        ),
        h('div', { className: 'omni-stat-cell', style: { cursor: 'pointer' }, onClick: () => setGlossaryCardOpen(v => !v) },
          h('div', { className: 'omni-stat-val', style: { color: glossaryTermCount > 0 ? 'var(--omni-accent)' : '#F5F5F5' } }, `${glossaryTermCount}`),
          h('div', { className: 'omni-stat-lbl' }, 'Glossary')
        )
      ),

      // 4. Contextual Hairline Banners (Zero Boxes)
      error && h('div', { className: 'omni-hairline-row', style: { color: '#F87171' } },
        h('div', { style: { display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 0 } },
          ic('AlertCircle', 15),
          h('span', { style: { fontSize: 12.5, fontWeight: 600 } }, error)
        ),
        h('button', { type: 'button', className: 'omni-circle-btn', style: { width: 26, height: 26 }, onClick: () => setError('') }, ic('X', 12))
      ),

      /lnori\.(?:org|com)/i.test(inputText) && h('div', { className: 'omni-hairline-row', style: { flexWrap: 'wrap' } },
        h('div', { style: { flex: 1, minWidth: 200 } },
          h('div', { style: { fontSize: 13, fontWeight: 700, color: 'var(--omni-jade)' } }, 'Official English Link Detected'),
          h('div', { style: { fontSize: 11.5, color: 'rgba(255,255,255,0.52)' } }, 'Download clean formatted EPUB directly without translating tokens.')
        ),
        h('button', {
          type: 'button',
          className: 'omni-flat-cta',
          style: { flex: 'none', height: 34, padding: '0 14px', fontSize: 12 },
          onClick: () => {
            const match = inputText.match(/https?:\/\/[^\s\n"']+/);
            const url = match ? match[0] : inputText.trim();
            setWebImportUrl(url);
            setActiveTab('web_importer');
            handleLnoriDirectEpubDownload(url);
          }
        }, 'Download Clean EPUB')
      ),

      (savedTranslationSession || isTranslationPaused || activeSessionRef.current) && !isTranslating && (() => {
        const s = savedTranslationSession || activeSessionRef.current || activeSession;
        if (!s) return null;
        const cCount = s.completedCount || 0;
        const tCount = s.total || s.totalChunks || '?';
        const isDelta = Boolean(s.isDeltaUpdate);
        const deltaLabel = `Ch ${s.deltaStart || (cCount + 1)}-${s.deltaEnd || tCount}`;
        return h('div', { className: 'omni-hairline-row', style: { flexWrap: 'wrap' } },
          h('div', { style: { flex: 1, minWidth: 190 } },
            h('div', { style: { fontSize: 13, fontWeight: 700, color: 'var(--omni-accent)' } },
              isDelta ? `Update Staged · ${deltaLabel}` : `Paused Session · ${cCount} / ${tCount} done`
            ),
            h('div', { style: { fontSize: 11.5, color: 'rgba(255,255,255,0.52)', marginTop: 2 } },
              s.title || currentDocTitle || 'Translation Progress Preserved'
            )
          ),
          h('div', { style: { display: 'flex', gap: 8 } },
            h('button', { type: 'button', className: 'omni-flat-cta', style: { flex: 'none', height: 34, padding: '0 14px', fontSize: 12 }, onClick: () => resumeSavedTranslation(s) },
              isDelta ? `Translate New (${deltaLabel})` : 'Resume'
            ),
            h('button', { type: 'button', className: 'omni-soft-tab', style: { color: '#F87171' }, onClick: () => discardSavedTranslation(s.id) }, 'Discard')
          )
        );
      })(),

      // 5. Collapsible Glossary & Prompt Rules Drawer (Frameless Hairline Layout)
      glossaryCardOpen && h('div', { style: { padding: '12px 0', borderBottom: '0.6px solid var(--omni-hairline)' } },
        h('div', { className: 'omni-section-label-row', style: { marginTop: 0 } },
          h('span', { className: 'omni-section-label' }, `Glossary & Profiles (${glossaryTermCount} terms)`),
          h('button', { type: 'button', className: 'omni-soft-tab', style: { padding: '2px 8px', fontSize: 11 }, onClick: () => setGlossaryCardOpen(false) }, 'Done')
        ),
        h('div', { className: 'omni-soft-tabs', style: { paddingBottom: 8 } },
          ['ri', 'lotm', 'cote', 'xianxia'].map(p => h('button', {
            key: p,
            type: 'button',
            className: 'omni-soft-tab',
            disabled,
            onClick: () => applyGlossaryPreset(p)
          }, `${p.toUpperCase()} Preset`))
        ),
        h('div', { style: { display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 } },
          h('button', { type: 'button', className: 'omni-soft-tab active', disabled, onClick: () => setGlossaryEditorOpen(true) }, 'Full Editor'),
          h('button', { type: 'button', className: 'omni-soft-tab', disabled, onClick: handleOpenAutoGlossary }, 'AI Auto-Extract'),
          h('button', { type: 'button', className: 'omni-soft-tab', disabled: disabled || isAuditingConsistency, onClick: handleRunConsistencyCheck }, isAuditingConsistency ? 'Auditing...' : 'Verify Names'),
          h('button', { type: 'button', className: 'omni-soft-tab', style: { color: '#F87171' }, disabled, onClick: () => { setTerminology(''); localStorage.removeItem('terminology'); setActiveGlossaryId(null); localStorage.removeItem('activeGlossaryId'); toast('Glossary cleared.', 'info'); } }, 'Clear')
        ),
        h('div', { className: 'omni-hairline-row', style: { minHeight: 44, padding: '6px 0', cursor: 'default' } },
          h('span', { style: { fontSize: 12.5, color: '#F5F5F5' } }, 'Smart Glossary Filter'),
          h('button', { type: 'button', className: `switch ${smartGlossary ? 'on' : ''}`, onClick: () => { if (!disabled) { setSmartGlossary(!smartGlossary); localStorage.setItem('smartGlossary', !smartGlossary); } } })
        ),
        h('div', { style: { display: 'flex', gap: 8, marginTop: 10, alignItems: 'center', flexWrap: 'wrap' } },
          activeGlossaryId && h('button', { type: 'button', className: 'omni-flat-cta', style: { flex: 'none', height: 34, padding: '0 12px', fontSize: 12 }, disabled, onClick: () => handleSaveGlossary(activeGlossaryId) }, `Update "${activeGlossaryId}"`),
          h('div', { className: 'omni-search-bar', style: { flex: 1, minWidth: 140, height: 36, marginBottom: 0 } },
            h('input', { type: 'text', value: newGlossaryName, disabled, onChange: e => setNewGlossaryName(e.target.value), placeholder: 'Save terms as profile...' })
          ),
          h('button', { type: 'button', className: 'omni-soft-tab active', disabled, onClick: () => handleSaveGlossary(newGlossaryName) }, 'Save'),
          activeGlossaryId && h('button', { type: 'button', className: 'omni-soft-tab', disabled, onClick: handleUnloadGlossary }, 'Unload')
        ),
        savedGlossaries.length > 0 && h('div', { style: { marginTop: 8 } },
          savedGlossaries.map(g => h('div', { key: g.name, className: 'omni-hairline-row', style: { minHeight: 42, padding: '6px 0' } },
            h('span', { style: { fontSize: 12.5, fontWeight: activeGlossaryId === g.name ? 700 : 500, color: activeGlossaryId === g.name ? 'var(--omni-accent)' : '#F5F5F5' }, onClick: () => handleLoadGlossary(g) },
              `${g.name}${activeGlossaryId === g.name ? ' (Active)' : ''}${defaultGlossaryName === g.name ? ' (Default)' : ''}`
            ),
            h('div', { style: { display: 'flex', gap: 6 } },
              h('button', { type: 'button', className: 'omni-soft-tab', style: { fontSize: 11, padding: '3px 8px' }, disabled, onClick: () => handleLoadGlossary(g) }, 'Load'),
              h('button', { type: 'button', className: 'omni-soft-tab', style: { fontSize: 11, padding: '3px 8px' }, disabled, onClick: () => { localStorage.setItem('defaultGlossaryName', g.name); setDefaultGlossaryName(g.name); toast(`Default: ${g.name}`); } }, 'Default'),
              h('button', { type: 'button', className: 'omni-circle-btn', style: { width: 26, height: 26, color: '#F87171' }, disabled, onClick: () => handleDeleteGlossary(g.name) }, ic('X', 11))
            )
          )),
          defaultGlossaryName && h('button', { type: 'button', className: 'omni-soft-tab', style: { fontSize: 11, color: '#F87171', marginTop: 4 }, disabled, onClick: clearDefaultGloss }, 'Clear Default Profile')
        ),
        h('div', { style: { marginTop: 10 } },
          h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 } },
            h('span', { className: 'omni-section-label' }, 'Custom Instructions'),
            h('div', { style: { display: 'flex', gap: 6 } },
              h('button', { type: 'button', className: 'omni-soft-tab', style: { fontSize: 11, padding: '2px 8px' }, disabled, onClick: () => applyGlossaryPreset('literary') }, 'Literary'),
              h('button', { type: 'button', className: 'omni-soft-tab', style: { fontSize: 11, padding: '2px 8px' }, disabled, onClick: () => applyGlossaryPreset('dialogue') }, 'Dialogue')
            )
          ),
          h('textarea', {
            ref: instructionsRef,
            value: customInstructions,
            disabled,
            onChange: e => { setCustomInstructions(e.target.value); localStorage.setItem('customInstructions', e.target.value); },
            placeholder: 'e.g. "Formal literary prose", "Keep honorifics"...',
            style: { width: '100%', height: 64, background: 'rgba(255,255,255,0.04)', border: '0.6px solid var(--omni-hairline)', borderRadius: 6, padding: 8, color: '#F5F5F5', fontSize: 12.5, outline: 'none' }
          })
        )
      ),

      // 6. Option A: Editorial Underline Pane Switcher (Source / Translated / Live Stream)
      h('div', { className: 'omni-underline-tabs' },
        h('button', { type: 'button', className: `omni-underline-tab ${activePaneTab === 'source' ? 'active' : ''}`, onClick: () => setActivePaneTab('source') },
          'Source', inputCharCount > 0 ? ` (${Math.round(inputCharCount / 1000)}k)` : ''
        ),
        h('button', { type: 'button', className: `omni-underline-tab ${activePaneTab === 'translated' ? 'active' : ''}`, onClick: () => setActivePaneTab('translated') },
          'Translated', outputWordCount > 0 ? ` (${outputWordCount.toLocaleString()}w)` : ''
        ),
        h('button', { type: 'button', className: `omni-underline-tab ${activePaneTab === 'stream' ? 'active' : ''}`, onClick: () => setActivePaneTab('stream') },
          isTranslating ? `Live Stream · ${progress}%` : 'Live Stream'
        )
      ),

      // PANE 1: Full-Bleed Source Canvas
      activePaneTab === 'source' && h('div', { onDragOver, onDragLeave, onDrop, style: isDragOver ? { outline: '1px dashed var(--omni-accent)', outlineOffset: 4 } : null },
        chapters && chapters.length > 0 && h('div', { className: 'omni-hairline-row' },
          h('div', { style: { display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 } },
            currentDocCover && h('div', { className: 'omni-poster-frame', style: { width: 34, height: 51 } }, h('img', { src: currentDocCover, alt: 'Cover' })),
            h('div', { style: { flex: 1, minWidth: 0 } },
              h('div', { style: { fontSize: 13.5, fontWeight: 700, color: '#F5F5F5', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' } }, currentDocTitle || fileName || 'Loaded Ebook'),
              h('div', { style: { fontSize: 11.5, color: 'rgba(255,255,255,0.48)' } }, `${chapters.length} chapters loaded`)
            )
          ),
          h('button', {
            type: 'button',
            className: 'omni-soft-tab',
            style: { color: '#F87171' },
            disabled,
            onClick: () => { setChapters([]); setInputText(''); setFileName(''); }
          }, 'Clear Book')
        ),
        h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0 0', gap: 8 } },
          h('div', { style: { display: 'flex', gap: 6 } },
            h('button', { type: 'button', className: 'omni-soft-tab', style: { padding: '4px 9px', fontSize: 11.5 }, disabled, onClick: handlePasteFromClipboard }, 'Paste'),
            h('button', { type: 'button', className: 'omni-soft-tab', style: { padding: '4px 9px', fontSize: 11.5 }, disabled: disabled || uploadingFile, onClick: () => fileInputRef.current?.click() }, uploadingFile ? 'Loading...' : 'Pick File'),
            inputText.trim() && h('button', { type: 'button', className: 'omni-soft-tab', style: { padding: '4px 9px', fontSize: 11.5, color: '#F87171' }, disabled, onClick: () => { setInputText(''); setChapters([]); localStorage.removeItem('inputText'); } }, 'Clear')
          ),
          inputCharCount > 0 && h('span', { style: { fontSize: 11, color: 'rgba(255,255,255,0.42)' } }, `${inputCharCount.toLocaleString()} chars`)
        ),
        h('textarea', {
          className: 'omni-prose-textarea',
          ref: inputRef,
          value: inputText,
          disabled,
          onChange: e => handleInputChange(e.target.value),
          placeholder: 'Paste raw story prose here, or tap Upload above to import EPUB, TXT, DOCX, or PDF...',
          style: { height: `${Math.max(260, inputBoxHeight || 260)}px` }
        }),
        renderBoxResizeBar('input')
      ),

      // PANE 2: Full-Bleed Translated Canvas
      activePaneTab === 'translated' && h('div', null,
        hasCompletedTranslation && h('div', { className: 'omni-hairline-row', style: { flexWrap: 'wrap' } },
          h('div', { style: { flex: 1, minWidth: 180 } },
            h('div', { style: { fontSize: 13, fontWeight: 700, color: 'var(--omni-jade)' } }, 'Translation Complete & Saved'),
            h('div', { style: { fontSize: 11.5, color: 'rgba(255,255,255,0.52)' } }, `${translatedChapters.filter(c => c && (c.content || c.text)).length} chapters ready`)
          ),
          h('label', { className: 'omni-soft-tab active', style: { cursor: 'pointer', fontSize: 11.5 } },
            currentDocCover ? 'Change Cover' : 'Add Cover',
            h('input', {
              type: 'file',
              accept: 'image/*',
              style: { display: 'none' },
              onChange: (e) => {
                const file = e.target?.files?.[0];
                if (!file) return;
                const r = new FileReader();
                r.onload = ev => {
                  setCurrentDocCover(ev.target.result);
                  if (activeNovelRecord) activeNovelRecord.cover = ev.target.result;
                  toast('Cover updated.', 'success');
                };
                r.readAsDataURL(file);
              }
            })
          )
        ),
        h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0 0', flexWrap: 'wrap', gap: 6 } },
          h('div', { style: { display: 'flex', gap: 6, flexWrap: 'wrap' } },
            h('button', { type: 'button', className: 'omni-soft-tab', style: { padding: '4px 9px', fontSize: 11.5 }, disabled: !assembledText.trim(), onClick: () => copyText(assembledText).then(() => toast('Copied!')) }, 'Copy'),
            h('button', { type: 'button', className: 'omni-soft-tab', style: { padding: '4px 9px', fontSize: 11.5 }, disabled: isTranslating || (!assembledText.trim() && (!translatedChapters || !translatedChapters.length)), onClick: () => handleOpenDiffModal(0) }, 'Diffs'),
            h('button', { type: 'button', className: 'omni-soft-tab', style: { padding: '4px 9px', fontSize: 11.5, color: 'var(--omni-accent)' }, disabled: isTranslating || !assembledText.trim(), onClick: handleSaveTranslationToLibrarySpace }, 'Save to Space')
          ),
          assembledText.trim() && h('span', { style: { fontSize: 11, color: 'var(--omni-jade)' } }, `${outputWordCount.toLocaleString()} words`)
        ),
        h('textarea', {
          className: 'omni-prose-textarea',
          ref: outputRef,
          value: assembledText,
          disabled: isTranslating,
          readOnly: isTranslating,
          onChange: e => handleAssembledTextChange(e.target.value),
          placeholder: 'Translated prose will appear here cleanly without boxes...',
          style: { height: `${Math.max(280, outputBoxHeight || 280)}px` }
        }),
        renderBoxResizeBar('output')
      ),

      // PANE 3: Live Stream, Progress, Token Telemetry & Logs
      activePaneTab === 'stream' && h('div', { style: { paddingTop: 12 } },
        isTranslating ? h('div', { style: { paddingBottom: 14, borderBottom: '0.6px solid var(--omni-hairline)' } },
          h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 } },
            h('span', { style: { fontSize: 13.5, fontWeight: 700, color: 'var(--omni-accent)' } }, progressLabel || 'Translating...'),
            h('span', { style: { fontSize: 12, fontFamily: "'IBM Plex Mono', monospace", color: 'rgba(255,255,255,0.65)' } }, `${progress}% · ${Math.floor(elapsedSec / 60)}:${String(elapsedSec % 60).padStart(2, '0')}`)
          ),
          h('div', { className: 'omni-hero-prog-track', style: { height: 4 } },
            h('div', { className: 'omni-hero-prog-fill', style: { width: `${progress}%` } })
          ),
          h('div', { style: { display: 'flex', gap: 8, marginTop: 10 } },
            h('button', { type: 'button', className: 'omni-soft-tab active', onClick: handlePauseTranslation }, 'Pause & Save'),
            h('button', { type: 'button', className: 'omni-soft-tab', style: { color: '#F87171' }, onClick: cancelTranslation }, 'Cancel')
          )
        ) : null,

        lastUsageStats && h('div', { style: { paddingBottom: 12, borderBottom: '0.6px solid var(--omni-hairline)' } },
          h('div', { className: 'omni-section-label-row' },
            h('span', { className: 'omni-section-label' }, 'Last Translation Summary'),
            h('div', { style: { display: 'flex', gap: 6 } },
              h('button', { type: 'button', className: 'omni-soft-tab active', style: { fontSize: 11, padding: '2px 8px' }, onClick: copyDiagnosticsReport }, 'Copy Report'),
              h('button', { type: 'button', className: 'omni-soft-tab', style: { fontSize: 11, padding: '2px 8px', color: '#F87171' }, onClick: () => setLastUsageStats(null) }, 'Dismiss')
            )
          ),
          h('div', { className: 'omni-hairline-row', style: { minHeight: 40, padding: '6px 0' } }, h('span', { style: { fontSize: 12.5, color: 'rgba(255,255,255,0.55)' } }, 'Model'), h('span', { style: { fontSize: 12.5, fontWeight: 650 } }, `${lastUsageStats.provider || ''} · ${lastUsageStats.model || ''}`)),
          h('div', { className: 'omni-hairline-row', style: { minHeight: 40, padding: '6px 0' } }, h('span', { style: { fontSize: 12.5, color: 'rgba(255,255,255,0.55)' } }, 'Tokens'), h('span', { style: { fontSize: 12.5, fontWeight: 650 } }, `${(lastUsageStats.totalTokens || 0).toLocaleString()} (${(lastUsageStats.promptTokens || 0).toLocaleString()} in / ${(lastUsageStats.outputTokens || 0).toLocaleString()} out)`)),
          h('div', { className: 'omni-hairline-row', style: { minHeight: 40, padding: '6px 0', borderBottom: 'none' } }, h('span', { style: { fontSize: 12.5, color: 'rgba(255,255,255,0.55)' } }, 'Cost & Duration'), h('span', { style: { fontSize: 12.5, fontWeight: 650 } }, `${lastUsageStats.cost || '$0.0000'} · ${lastUsageStats.duration || ''}`))
        ),

        h('div', { className: 'omni-section-label-row' },
          h('span', { className: 'omni-section-label' }, `Live Stream & API Logs (${liveLogs.length})`),
          h('div', { style: { display: 'flex', gap: 6 } },
            h('button', { type: 'button', className: 'omni-soft-tab', style: { fontSize: 11, padding: '2px 8px' }, onClick: copyLogsWithReport }, 'Copy'),
            h('button', { type: 'button', className: 'omni-soft-tab active', style: { fontSize: 11, padding: '2px 8px' }, onClick: () => setLogsModalOpen(true) }, 'Full Logs')
          )
        ),
        assembledText && h('div', {
          style: {
            fontFamily: "'Literata', Georgia, serif",
            fontSize: 13.5,
            lineHeight: 1.65,
            color: 'rgba(255,255,255,0.82)',
            maxHeight: 200,
            overflowY: 'auto',
            whiteSpace: 'pre-wrap',
            padding: '10px 0',
            borderBottom: '0.6px solid var(--omni-hairline)'
          }
        }, assembledText.slice(-2600)),
        h('div', {
          ref: logsContainerRef,
          style: {
            maxHeight: 190,
            overflowY: 'auto',
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: 10.5,
            lineHeight: 1.5,
            padding: '10px 0',
            color: 'rgba(255,255,255,0.68)'
          }
        },
          liveLogs.length === 0
            ? 'Ready. Start translating to watch live model chunks and key rotation events.'
            : liveLogs.slice(-30).map((l, idx) => h('div', { key: idx, style: { padding: '2px 0' } },
                `[${l.time}] [${(l.tag || 'INFO').toUpperCase()}] ${l.message}`
              ))
        )
      ),

      // 7. Flat Inline Action Bar
      h('div', { className: 'omni-cta-row', style: { marginTop: 14, marginBottom: 16 } },
        (savedTranslationSession || isTranslationPaused || activeSessionRef.current) && !isTranslating
          ? (() => {
              const s = savedTranslationSession || activeSessionRef.current || activeSession;
              return h('button', { type: 'button', className: 'omni-flat-cta', onClick: () => resumeSavedTranslation(s) },
                ic('Play', 14), s?.isDeltaUpdate ? 'Translate New Chapters' : 'Resume Translation'
              );
            })()
          : h('button', {
              type: 'button',
              className: 'omni-flat-cta',
              disabled: isTranslating ? false : (!inputText.trim() && (!chapters || chapters.length === 0)),
              onClick: () => isTranslating ? handlePauseTranslation() : handleStartTranslation()
            }, ic(isTranslating ? 'Pause' : 'Languages', 15), isTranslating ? 'Pause Translation' : (chapters?.length > 0 ? `Translate Ebook (${chapters.length} Ch)` : 'Translate Text')),
        h('button', { type: 'button', className: 'omni-flat-icon-btn', title: 'Cost & Token Estimator', disabled: isTranslating || (!inputText.trim() && (!chapters || !chapters.length)), onClick: handleOpenCostEstimator }, ic('Clock', 16)),
        h('button', { type: 'button', className: 'omni-flat-icon-btn', title: 'QA Health Audit', disabled: isTranslating || (!assembledText.trim() && !chapters.length), onClick: handleOpenActiveQaModal }, ic('Activity', 16)),
        h('button', { type: 'button', className: 'omni-flat-icon-btn', title: 'Open in Reader', disabled: !assembledText.trim() && (!translatedChapters || !translatedChapters.length) && (!chapters || !chapters.length), onClick: openTranslatedInReader }, ic('BookOpen', 16)),
        h('button', { type: 'button', className: 'omni-flat-icon-btn', title: 'Export EPUB / Formats', disabled: isTranslating, onClick: () => assembledText.trim() ? setSheetOpen(true) : handleDownloadEPUB() }, ic('Download', 16))
      )
    );
  }

  return { TabTranslate };
}));
