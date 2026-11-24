/**
 * app_tab_translate.js - Tabbed Full-Bleed Translator Workspace for Gemini Translator
 * Chimanew Elevated Dark workspace (#0F1014 canvas, #181A20 surfaces, #23262F controls):
 * 25px header + 7px icon triggers, bounded Language Pair Bar, unboxed 4-col Telemetry Strip,
 * underline pane switcher (Source / Translated / Live Stream), smart chapter-windowed + 250ms buffered
 * editor (zero lag on huge novels), and bounded #16181F distraction-free prose canvas.
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

  const LARGE_DOC_THRESHOLD = 60000;
  const LARGE_WINDOW_CHARS = 30000;
  const DRAFT_FLUSH_MS = 250;

  function TabTranslate(props) {
    const ReactObj = typeof React !== 'undefined' ? React : (typeof window !== 'undefined' ? window.React : null);
    const useState = ReactObj?.useState || function (init) { return [typeof init === 'function' ? init() : init, function () {}]; };
    const useEffect = ReactObj?.useEffect || function () {};
    const useRef = ReactObj?.useRef || function (init) { return { current: init }; };
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
      setAssembledText = function () {},
      handleAssembledTextChange = function () {},
      translatedChapters = [],
      setTranslatedChapters = function () {},
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
    const [activeSourceChapIdx, setActiveSourceChapIdx] = useState(0);
    const [activeTransChapIdx, setActiveTransChapIdx] = useState(0);
    const [showFullRawSource, setShowFullRawSource] = useState(false);
    const [showFullRawTrans, setShowFullRawTrans] = useState(false);

    // Buffered local typing state to prevent 30fps parent re-renders on big novels
    const [sourceDraft, setSourceDraft] = useState({ key: '', text: '', dirty: false });
    const [transDraft, setTransDraft] = useState({ key: '', text: '', dirty: false });
    const sourceTimerRef = useRef(null);
    const transTimerRef = useRef(null);
    const pendingSourceRef = useRef(null);
    const pendingTransRef = useRef(null);

    useEffect(() => {
      if (isTranslating) {
        setActivePaneTab('stream');
      }
    }, [isTranslating]);

    useEffect(() => () => {
      if (sourceTimerRef.current) clearTimeout(sourceTimerRef.current);
      if (transTimerRef.current) clearTimeout(transTimerRef.current);
    }, []);

    // Source window computation
    const isMultiSourceChapters = Array.isArray(chapters) && chapters.length > 1;
    const safeSrcChapIdx = isMultiSourceChapters ? Math.max(0, Math.min(activeSourceChapIdx, chapters.length - 1)) : 0;
    const currentSrcChap = isMultiSourceChapters ? (chapters[safeSrcChapIdx] || {}) : null;
    const parentSrcChapText = currentSrcChap ? (currentSrcChap.text ?? currentSrcChap.content ?? '') : '';
    const rawSourceStr = inputText || '';
    const isLargeRawSource = !isMultiSourceChapters && rawSourceStr.length > LARGE_DOC_THRESHOLD && !showFullRawSource;
    const rawSrcSplitOffset = isLargeRawSource ? Math.max(0, rawSourceStr.length - LARGE_WINDOW_CHARS) : 0;
    const srcWindowKey = isMultiSourceChapters ? `ch:${safeSrcChapIdx}` : (isLargeRawSource ? `tail:${rawSrcSplitOffset}` : 'full');
    const parentVisibleSource = isMultiSourceChapters
      ? parentSrcChapText
      : (isLargeRawSource ? rawSourceStr.slice(rawSrcSplitOffset) : rawSourceStr);
    const displayedSourceValue = (sourceDraft.dirty && sourceDraft.key === srcWindowKey) ? sourceDraft.text : parentVisibleSource;

    // Translated window computation
    const isMultiTransChapters = Array.isArray(translatedChapters) && translatedChapters.length > 1;
    const safeTransChapIdx = isMultiTransChapters ? Math.max(0, Math.min(activeTransChapIdx, translatedChapters.length - 1)) : 0;
    const currentTransChap = isMultiTransChapters ? (translatedChapters[safeTransChapIdx] || {}) : null;
    const parentTransChapText = currentTransChap ? (currentTransChap.content ?? currentTransChap.text ?? '') : '';
    const rawTransStr = assembledText || '';
    const isLargeRawTrans = !isMultiTransChapters && rawTransStr.length > LARGE_DOC_THRESHOLD && !showFullRawTrans;
    const rawTransSplitOffset = isLargeRawTrans ? Math.max(0, rawTransStr.length - LARGE_WINDOW_CHARS) : 0;
    const transWindowKey = isMultiTransChapters ? `ch:${safeTransChapIdx}` : (isLargeRawTrans ? `tail:${rawTransSplitOffset}` : 'full');
    const parentVisibleTrans = isMultiTransChapters
      ? parentTransChapText
      : (isLargeRawTrans ? rawTransStr.slice(rawTransSplitOffset) : rawTransStr);
    const displayedTransValue = (transDraft.dirty && transDraft.key === transWindowKey) ? transDraft.text : parentVisibleTrans;

    const flushSourceDraft = () => {
      if (sourceTimerRef.current) { clearTimeout(sourceTimerRef.current); sourceTimerRef.current = null; }
      const pending = pendingSourceRef.current;
      pendingSourceRef.current = null;
      setSourceDraft(d => (d.dirty ? { key: d.key, text: '', dirty: false } : d));
      if (!pending) return;
      if (pending.isMultiChapter && Array.isArray(chapters) && chapters.length > 1) {
        const nextChaps = [...chapters];
        const idx = Math.max(0, Math.min(pending.chapIdx, nextChaps.length - 1));
        nextChaps[idx] = { ...(nextChaps[idx] || {}), text: pending.val, content: pending.val };
        setChapters(nextChaps);
      } else {
        handleInputChange(pending.prefix + pending.val);
      }
    };

    const flushTransDraft = () => {
      if (transTimerRef.current) { clearTimeout(transTimerRef.current); transTimerRef.current = null; }
      const pending = pendingTransRef.current;
      pendingTransRef.current = null;
      setTransDraft(d => (d.dirty ? { key: d.key, text: '', dirty: false } : d));
      if (!pending) return;
      if (pending.isMultiChapter && Array.isArray(translatedChapters) && translatedChapters.length > 1) {
        const nextChaps = [...translatedChapters];
        const idx = Math.max(0, Math.min(pending.chapIdx, nextChaps.length - 1));
        nextChaps[idx] = { ...(nextChaps[idx] || {}), content: pending.val, text: pending.val };
        setTranslatedChapters(nextChaps);
        const joined = nextChaps.map(c => c ? (c.content || c.text || '') : '').filter(Boolean).join('\n\n\n').trim();
        setAssembledText(joined);
      } else {
        handleAssembledTextChange(pending.prefix + pending.val);
      }
    };

    const onSourceTextChange = (nextVal) => {
      const prefix = isLargeRawSource ? rawSourceStr.slice(0, rawSrcSplitOffset) : '';
      pendingSourceRef.current = {
        isMultiChapter: isMultiSourceChapters,
        chapIdx: safeSrcChapIdx,
        prefix,
        val: nextVal
      };
      setSourceDraft({ key: srcWindowKey, text: nextVal, dirty: true });
      if (sourceTimerRef.current) clearTimeout(sourceTimerRef.current);
      sourceTimerRef.current = setTimeout(flushSourceDraft, DRAFT_FLUSH_MS);
    };

    const onTransTextChange = (nextVal) => {
      const prefix = isLargeRawTrans ? rawTransStr.slice(0, rawTransSplitOffset) : '';
      pendingTransRef.current = {
        isMultiChapter: isMultiTransChapters,
        chapIdx: safeTransChapIdx,
        prefix,
        val: nextVal
      };
      setTransDraft({ key: transWindowKey, text: nextVal, dirty: true });
      if (transTimerRef.current) clearTimeout(transTimerRef.current);
      transTimerRef.current = setTimeout(flushTransDraft, DRAFT_FLUSH_MS);
    };

    const renderChapterWindowBar = (items, activeIdx, onChangeIdx, curTextLen) => h('div', {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        marginTop: 8,
        padding: '6px 8px',
        background: 'var(--omni-surface)',
        border: '1px solid var(--omni-border)',
        borderRadius: 6
      }
    },
      h('button', {
        type: 'button',
        className: 'omni-soft-tab',
        style: { padding: '4px 8px', fontSize: 11.5 },
        disabled: activeIdx <= 0,
        onClick: () => { if (activeIdx > 0) onChangeIdx(activeIdx - 1); }
      }, ic('ChevronLeft', 13)),
      h('select', {
        className: 'omni-lang-select',
        style: { fontSize: 12, padding: '4px 8px', fontWeight: 650 },
        value: activeIdx,
        onChange: (e) => onChangeIdx(Number(e.target.value) || 0)
      }, items.map((ch, idx) => {
        const title = (ch && ch.title) ? ch.title : `Chapter ${idx + 1}`;
        return h('option', { key: idx, value: idx }, `Ch ${idx + 1}/${items.length} · ${title}`);
      })),
      h('button', {
        type: 'button',
        className: 'omni-soft-tab',
        style: { padding: '4px 8px', fontSize: 11.5 },
        disabled: activeIdx >= items.length - 1,
        onClick: () => { if (activeIdx < items.length - 1) onChangeIdx(activeIdx + 1); }
      }, ic('ChevronRight', 13)),
      h('span', { style: { fontSize: 10.5, color: 'var(--omni-text-muted)', whiteSpace: 'nowrap', marginLeft: 2 } },
        `${(curTextLen || 0).toLocaleString()} ch`
      )
    );

    const renderLargeWindowBar = (totalChars, showingFull, onToggle) => h('div', {
      style: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 8,
        marginTop: 8,
        padding: '6px 10px',
        background: 'var(--omni-surface)',
        border: '1px solid var(--omni-border)',
        borderRadius: 6
      }
    },
      h('span', { style: { fontSize: 11.5, color: 'var(--omni-text-sub)' } },
        showingFull
          ? `Full document (${totalChars.toLocaleString()} chars)`
          : `Large doc (${totalChars.toLocaleString()} chars) · Showing writable last 30k chars`
      ),
      h('button', {
        type: 'button',
        className: 'omni-soft-tab',
        style: { padding: '3px 9px', fontSize: 11 },
        onClick: onToggle
      }, showingFull ? 'Windowed Mode' : 'Show All')
    );

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
          h('div', { className: 'omni-stat-val', style: { color: glossaryTermCount > 0 ? 'var(--omni-accent)' : 'var(--omni-text)' } }, `${glossaryTermCount}`),
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
          h('div', { style: { fontSize: 11.5, color: 'var(--omni-text-sub)' } }, 'Download clean formatted EPUB directly without translating tokens.')
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

      (savedTranslationSession || isTranslationPaused || activeSessionRef?.current) && !isTranslating && (() => {
        const s = savedTranslationSession || activeSessionRef?.current || activeSession;
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
            h('div', { style: { fontSize: 11.5, color: 'var(--omni-text-sub)', marginTop: 2 } },
              s.title || currentDocTitle || 'Translation Progress Preserved'
            )
          ),
          h('div', { style: { display: 'flex', gap: 8 } },
            h('button', { type: 'button', className: 'omni-flat-cta', style: { flex: 'none', height: 34, padding: '0 14px', fontSize: 12 }, onClick: () => { flushSourceDraft(); resumeSavedTranslation(s); } },
              isDelta ? `Translate New (${deltaLabel})` : 'Resume'
            ),
            h('button', { type: 'button', className: 'omni-soft-tab', style: { color: '#F87171' }, onClick: () => discardSavedTranslation(s.id) }, 'Discard')
          )
        );
      })(),

      // 5. Collapsible Glossary & Prompt Rules Drawer (Elevated Hairline Layout)
      glossaryCardOpen && h('div', { style: { padding: '12px 0', borderBottom: '1px solid var(--omni-hairline)' } },
        h('div', { className: 'omni-section-label-row', style: { marginTop: 0 } },
          h('span', { className: 'omni-section-label' }, `Glossary & Profiles (${glossaryTermCount} terms)`),
          h('button', { type: 'button', className: 'omni-soft-tab', style: { padding: '3px 9px', fontSize: 11 }, onClick: () => setGlossaryCardOpen(false) }, 'Done')
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
          h('span', { style: { fontSize: 12.5, color: 'var(--omni-text)' } }, 'Smart Glossary Filter'),
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
            h('span', { style: { fontSize: 12.5, fontWeight: activeGlossaryId === g.name ? 700 : 500, color: activeGlossaryId === g.name ? 'var(--omni-accent)' : 'var(--omni-text)' }, onClick: () => handleLoadGlossary(g) },
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
            style: { width: '100%', height: 64, background: 'var(--omni-input)', border: '1px solid var(--omni-border)', borderRadius: 6, padding: 8, color: 'var(--omni-text)', fontSize: 12.5, outline: 'none' }
          })
        )
      ),

      // 6. Option A: Editorial Underline Pane Switcher (Source / Translated / Live Stream)
      h('div', { className: 'omni-underline-tabs' },
        h('button', { type: 'button', className: `omni-underline-tab ${activePaneTab === 'source' ? 'active' : ''}`, onClick: () => { flushTransDraft(); setActivePaneTab('source'); } },
          'Source', chapters?.length > 1 ? ` (${chapters.length} Ch)` : (inputCharCount > 0 ? ` (${Math.max(1, Math.round(inputCharCount / 1000))}k)` : '')
        ),
        h('button', { type: 'button', className: `omni-underline-tab ${activePaneTab === 'translated' ? 'active' : ''}`, onClick: () => { flushSourceDraft(); setActivePaneTab('translated'); } },
          'Translated', translatedChapters?.length > 1 ? ` (${translatedChapters.length} Ch)` : (outputWordCount > 0 ? ` (${outputWordCount.toLocaleString()}w)` : '')
        ),
        h('button', { type: 'button', className: `omni-underline-tab ${activePaneTab === 'stream' ? 'active' : ''}`, onClick: () => { flushSourceDraft(); flushTransDraft(); setActivePaneTab('stream'); } },
          isTranslating ? `Live Stream · ${progress}%` : 'Live Stream'
        )
      ),

      // PANE 1: Bounded Lifted Prose Source Canvas
      activePaneTab === 'source' && h('div', { onDragOver, onDragLeave, onDrop, style: isDragOver ? { outline: '1px dashed var(--omni-accent)', outlineOffset: 4 } : null },
        chapters && chapters.length > 0 && h('div', { className: 'omni-hairline-row' },
          h('div', { style: { display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 } },
            currentDocCover && h('div', { className: 'omni-poster-frame', style: { width: 34, height: 51 } }, h('img', { src: currentDocCover, alt: 'Cover' })),
            h('div', { style: { flex: 1, minWidth: 0 } },
              h('div', { style: { fontSize: 13.5, fontWeight: 700, color: 'var(--omni-text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' } }, currentDocTitle || fileName || 'Loaded Ebook'),
              h('div', { style: { fontSize: 11.5, color: 'var(--omni-text-sub)' } }, `${chapters.length} chapters loaded`)
            )
          ),
          h('button', {
            type: 'button',
            className: 'omni-soft-tab',
            style: { color: '#F87171' },
            disabled,
            onClick: () => {
              if (sourceTimerRef.current) clearTimeout(sourceTimerRef.current);
              pendingSourceRef.current = null;
              setSourceDraft({ key: '', text: '', dirty: false });
              setChapters([]);
              setInputText('');
              setFileName('');
            }
          }, 'Clear Book')
        ),
        h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0 0', gap: 8 } },
          h('div', { style: { display: 'flex', gap: 6 } },
            h('button', { type: 'button', className: 'omni-soft-tab', style: { padding: '4px 9px', fontSize: 11.5 }, disabled, onClick: handlePasteFromClipboard }, 'Paste'),
            h('button', { type: 'button', className: 'omni-soft-tab', style: { padding: '4px 9px', fontSize: 11.5 }, disabled: disabled || uploadingFile, onClick: () => fileInputRef.current?.click() }, uploadingFile ? 'Loading...' : 'Pick File'),
            (inputText.trim() || displayedSourceValue.trim()) && h('button', {
              type: 'button',
              className: 'omni-soft-tab',
              style: { padding: '4px 9px', fontSize: 11.5, color: '#F87171' },
              disabled,
              onClick: () => {
                if (sourceTimerRef.current) clearTimeout(sourceTimerRef.current);
                pendingSourceRef.current = null;
                setSourceDraft({ key: '', text: '', dirty: false });
                setInputText('');
                setChapters([]);
                localStorage.removeItem('inputText');
              }
            }, 'Clear')
          ),
          inputCharCount > 0 && h('span', { style: { fontSize: 11, color: 'var(--omni-text-muted)' } }, `${inputCharCount.toLocaleString()} chars`)
        ),
        isMultiSourceChapters && renderChapterWindowBar(
          chapters,
          safeSrcChapIdx,
          (nextIdx) => { flushSourceDraft(); setActiveSourceChapIdx(nextIdx); },
          displayedSourceValue.length
        ),
        !isMultiSourceChapters && rawSourceStr.length > LARGE_DOC_THRESHOLD && renderLargeWindowBar(
          rawSourceStr.length,
          showFullRawSource,
          () => { flushSourceDraft(); setShowFullRawSource(v => !v); }
        ),
        h('textarea', {
          className: 'omni-prose-textarea',
          ref: inputRef,
          value: displayedSourceValue,
          disabled,
          onBlur: flushSourceDraft,
          onChange: e => onSourceTextChange(e.target.value),
          placeholder: 'Paste raw story prose here, or tap Upload above to import EPUB, TXT, DOCX, or PDF...',
          style: { height: `${Math.max(260, inputBoxHeight || 260)}px` }
        }),
        renderBoxResizeBar('input')
      ),

      // PANE 2: Bounded Lifted Translated Canvas
      activePaneTab === 'translated' && h('div', null,
        hasCompletedTranslation && h('div', { className: 'omni-hairline-row', style: { flexWrap: 'wrap' } },
          h('div', { style: { flex: 1, minWidth: 180 } },
            h('div', { style: { fontSize: 13, fontWeight: 700, color: 'var(--omni-jade)' } }, 'Translation Complete & Saved'),
            h('div', { style: { fontSize: 11.5, color: 'var(--omni-text-sub)' } }, `${translatedChapters.filter(c => c && (c.content || c.text)).length} chapters ready`)
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
            h('button', { type: 'button', className: 'omni-soft-tab', style: { padding: '4px 9px', fontSize: 11.5 }, disabled: !assembledText.trim(), onClick: () => { flushTransDraft(); copyText(assembledText).then(() => toast('Copied!')); } }, 'Copy'),
            h('button', { type: 'button', className: 'omni-soft-tab', style: { padding: '4px 9px', fontSize: 11.5 }, disabled: isTranslating || (!assembledText.trim() && (!translatedChapters || !translatedChapters.length)), onClick: () => { flushTransDraft(); handleOpenDiffModal(isMultiTransChapters ? safeTransChapIdx : 0); } }, 'Diffs'),
            h('button', { type: 'button', className: 'omni-soft-tab', style: { padding: '4px 9px', fontSize: 11.5, color: 'var(--omni-accent)' }, disabled: isTranslating || !assembledText.trim(), onClick: () => { flushTransDraft(); handleSaveTranslationToLibrarySpace(); } }, 'Save to Space')
          ),
          assembledText.trim() && h('span', { style: { fontSize: 11, color: 'var(--omni-jade)' } }, `${outputWordCount.toLocaleString()} words`)
        ),
        isMultiTransChapters && renderChapterWindowBar(
          translatedChapters,
          safeTransChapIdx,
          (nextIdx) => { flushTransDraft(); setActiveTransChapIdx(nextIdx); },
          displayedTransValue.length
        ),
        !isMultiTransChapters && rawTransStr.length > LARGE_DOC_THRESHOLD && renderLargeWindowBar(
          rawTransStr.length,
          showFullRawTrans,
          () => { flushTransDraft(); setShowFullRawTrans(v => !v); }
        ),
        h('textarea', {
          className: 'omni-prose-textarea',
          ref: outputRef,
          value: displayedTransValue,
          disabled: isTranslating,
          readOnly: isTranslating,
          onBlur: flushTransDraft,
          onChange: e => onTransTextChange(e.target.value),
          placeholder: 'Translated prose will appear here...',
          style: { height: `${Math.max(280, outputBoxHeight || 280)}px` }
        }),
        renderBoxResizeBar('output')
      ),

      // PANE 3: Live Stream, Progress, Token Telemetry & Logs
      activePaneTab === 'stream' && h('div', { style: { paddingTop: 12 } },
        isTranslating ? h('div', { style: { paddingBottom: 14, borderBottom: '1px solid var(--omni-hairline)' } },
          h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 } },
            h('span', { style: { fontSize: 13.5, fontWeight: 700, color: 'var(--omni-accent)' } }, progressLabel || 'Translating...'),
            h('span', { style: { fontSize: 12, fontFamily: "'IBM Plex Mono', monospace", color: 'var(--omni-text-sub)' } }, `${progress}% · ${Math.floor(elapsedSec / 60)}:${String(elapsedSec % 60).padStart(2, '0')}`)
          ),
          h('div', { className: 'omni-hero-prog-track', style: { height: 4 } },
            h('div', { className: 'omni-hero-prog-fill', style: { width: `${progress}%` } })
          ),
          h('div', { style: { display: 'flex', gap: 8, marginTop: 10 } },
            h('button', { type: 'button', className: 'omni-soft-tab active', onClick: handlePauseTranslation }, 'Pause & Save'),
            h('button', { type: 'button', className: 'omni-soft-tab', style: { color: '#F87171' }, onClick: cancelTranslation }, 'Cancel')
          )
        ) : null,

        lastUsageStats && h('div', { style: { paddingBottom: 12, borderBottom: '1px solid var(--omni-hairline)' } },
          h('div', { className: 'omni-section-label-row' },
            h('span', { className: 'omni-section-label' }, 'Last Translation Summary'),
            h('div', { style: { display: 'flex', gap: 6 } },
              h('button', { type: 'button', className: 'omni-soft-tab active', style: { fontSize: 11, padding: '3px 9px' }, onClick: copyDiagnosticsReport }, 'Copy Report'),
              h('button', { type: 'button', className: 'omni-soft-tab', style: { fontSize: 11, padding: '3px 9px', color: '#F87171' }, onClick: () => setLastUsageStats(null) }, 'Dismiss')
            )
          ),
          h('div', { className: 'omni-hairline-row', style: { minHeight: 40, padding: '6px 0' } }, h('span', { style: { fontSize: 12.5, color: 'var(--omni-text-sub)' } }, 'Model'), h('span', { style: { fontSize: 12.5, fontWeight: 650, color: 'var(--omni-text)' } }, `${lastUsageStats.provider || ''} · ${lastUsageStats.model || ''}`)),
          h('div', { className: 'omni-hairline-row', style: { minHeight: 40, padding: '6px 0' } }, h('span', { style: { fontSize: 12.5, color: 'var(--omni-text-sub)' } }, 'Tokens'), h('span', { style: { fontSize: 12.5, fontWeight: 650, color: 'var(--omni-text)' } }, `${(lastUsageStats.totalTokens || 0).toLocaleString()} (${(lastUsageStats.promptTokens || 0).toLocaleString()} in / ${(lastUsageStats.outputTokens || 0).toLocaleString()} out)`)),
          h('div', { className: 'omni-hairline-row', style: { minHeight: 40, padding: '6px 0', borderBottom: 'none' } }, h('span', { style: { fontSize: 12.5, color: 'var(--omni-text-sub)' } }, 'Cost & Duration'), h('span', { style: { fontSize: 12.5, fontWeight: 650, color: 'var(--omni-text)' } }, `${lastUsageStats.cost || '$0.0000'} · ${lastUsageStats.duration || ''}`))
        ),

        h('div', { className: 'omni-section-label-row' },
          h('span', { className: 'omni-section-label' }, `Live Stream & API Logs (${liveLogs.length})`),
          h('div', { style: { display: 'flex', gap: 6 } },
            h('button', { type: 'button', className: 'omni-soft-tab', style: { fontSize: 11, padding: '3px 9px' }, onClick: copyLogsWithReport }, 'Copy'),
            h('button', { type: 'button', className: 'omni-soft-tab active', style: { fontSize: 11, padding: '3px 9px' }, onClick: () => setLogsModalOpen(true) }, 'Full Logs')
          )
        ),
        assembledText && h('div', {
          style: {
            fontFamily: "'Literata', Georgia, serif",
            fontSize: 13.5,
            lineHeight: 1.65,
            color: 'var(--omni-text)',
            maxHeight: 200,
            overflowY: 'auto',
            whiteSpace: 'pre-wrap',
            padding: '10px 12px',
            background: '#16181F',
            border: '1px solid var(--omni-border)',
            borderRadius: 6,
            marginBottom: 8
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
            color: 'var(--omni-text-sub)'
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
        (savedTranslationSession || isTranslationPaused || activeSessionRef?.current) && !isTranslating
          ? (() => {
              const s = savedTranslationSession || activeSessionRef?.current || activeSession;
              return h('button', { type: 'button', className: 'omni-flat-cta', onClick: () => { flushSourceDraft(); resumeSavedTranslation(s); } },
                ic('Play', 14), s?.isDeltaUpdate ? 'Translate New Chapters' : 'Resume Translation'
              );
            })()
          : h('button', {
              type: 'button',
              className: 'omni-flat-cta',
              disabled: isTranslating ? false : (!inputText.trim() && !displayedSourceValue.trim() && (!chapters || chapters.length === 0)),
              onClick: () => {
                if (isTranslating) return handlePauseTranslation();
                flushSourceDraft();
                handleStartTranslation();
              }
            }, ic(isTranslating ? 'Pause' : 'Languages', 15), isTranslating ? 'Pause Translation' : (chapters?.length > 0 ? `Translate Ebook (${chapters.length} Ch)` : 'Translate Text')),
        h('button', { type: 'button', className: 'omni-flat-icon-btn', title: 'Cost & Token Estimator', disabled: isTranslating || (!inputText.trim() && !displayedSourceValue.trim() && (!chapters || !chapters.length)), onClick: () => { flushSourceDraft(); handleOpenCostEstimator(); } }, ic('Clock', 16)),
        h('button', { type: 'button', className: 'omni-flat-icon-btn', title: 'QA Health Audit', disabled: isTranslating || (!assembledText.trim() && !chapters.length), onClick: () => { flushTransDraft(); handleOpenActiveQaModal(); } }, ic('Activity', 16)),
        h('button', { type: 'button', className: 'omni-flat-icon-btn', title: 'Open in Reader', disabled: !assembledText.trim() && (!translatedChapters || !translatedChapters.length) && (!chapters || !chapters.length), onClick: () => { flushTransDraft(); openTranslatedInReader(); } }, ic('BookOpen', 16)),
        h('button', { type: 'button', className: 'omni-flat-icon-btn', title: 'Export EPUB / Formats', disabled: isTranslating, onClick: () => { flushTransDraft(); assembledText.trim() ? setSheetOpen(true) : handleDownloadEPUB(); } }, ic('Download', 16))
      )
    );
  }

  return { TabTranslate };
}));
