    const { useState, useEffect, useRef, useCallback, useMemo } = React;
    const h = React.createElement;
    window.studioSubTab = 'split';

    // Global event listener for errors
    window.addEventListener('error', function(event) {
      console.warn("Global error caught:", event.message, event.filename, event.lineno);
    });

        let VERSION = '8.17.95';

    // Destructure Core App Utilities, Icons, Tooltips, Estimators, Models, and Constants from window
    const {
      // Icon helpers & Lucide icons
      createLucideIcon, LucideIcons, ic, btn,
      Download, Clipboard, Link, BookText, FileText, XCircle, Copy,
      Loader2, Eye, EyeOff, RefreshCcw, Save, Upload, Sun, Moon,
      Columns2, Rows2, History, ChevronDown, ChevronUp, Zap, X,
      CheckCircle2, AlertCircle, Info, Search, Trash2, RotateCcw,
      Square, FileDown, Settings, Globe, Sparkles, Brain, Languages,
      Check, ArrowRightLeft, Star, Clock, Layers, Scissors, Sliders,
      Plus, Minus, Maximize2, Minimize2, BookOpen, Library, Key, Shield, Lock, Unlock,
      Calendar, ArrowUpDown, Volume2, VolumeX, Play, Pause,
      SkipForward, SkipBack, MoreVertical, Type, Palette, List, Compass,
      Bookmark, Menu, ArrowLeft, ArrowRight, Maximize, Minimize,
      // Engine APIs
      openAppDB, dbGetAll, dbPut, dbDelete, dbClear, GeminiNovelDB,
      formatGlossaryString, legacyFilterGlossaryForChunk, filterGlossaryForChunk,
      splitGlossaryIntoChunks, formatExtractedTermsIntoMasterGlossary, parseUniversalGlossaryPairs,
      auditNameConsistency, batchFixNameDrift,
      aiPolishEpubToc, formatModelName, groupModelsByCompany, fetchGeminiModels,
      calculateTokenBreakdown, buildPromptResult, buildPrompt, cleanNovelProse,
      parseTranslationOutput, isLikelyHeadingOnlyTranslation, translateGemini,
      streamGemini, translateDeepSeek, streamDeepSeek, stripContextLeak,
      translateDeepL, translateLibre, translateOpenAI, translateClaude,
      streamWithRotation, translateWithRotation, translateChunk,
      BackupEngine, ExportEngine, DocumentParser, MoonReaderEngine, LibraryEngine,
      NovelEnrichmentEngine, KeyManagerEngine, GlossaryManagerEngine,
      TranslationLoopEngine, WebNovelCrawlerEngine, NavigationEngine, HistoryEngine,
      // Core Utilities, Estimators & Constants
      escapeXml, estimateTokens, estimateCost, calculateRealCost,
      formatDuration, fetchRetry, wordCount, charCount, genId,
      batchParallel, splitChunks, callWorker, initAppWorker,
      DEFAULT_GEMINI_MODELS, DEFAULT_DEEPSEEK_MODELS,
      LANGUAGES, TARGET_LANGUAGES, DEEPL_LANG_MAP, LIBRE_LANG_MAP,
      MAX_PAYLOAD, PROMPT_OVERHEAD, MAX_HISTORY, DEFAULT_CONCURRENCY,
      MoonReaderModal, AppModalsContainer, AppTabsContainer
    } = window;

    const copyText = window.copyText;
    const cleanText = window.cleanText;
    const generateJobId = window.generateJobId;
    const saveUniversalBlob = window.saveUniversalBlob;
    const updateOriginalEpubNavigation = window.updateOriginalEpubNavigation;
    const generateEpubFromChapters = window.generateEpubFromChapters;
    const InfoTooltip = window.InfoTooltip;

    // Helper adapters delegating to DocumentParser & ExportEngine
    const readFileAsText = f => window.DocumentParser ? window.DocumentParser.readFileAsText(f) : new Promise((res, rej) => { const r = new FileReader(); r.onload = e => res(e.target.result); r.onerror = e => rej(e.target.error); r.readAsText(f); });
    const readPdf = f => window.DocumentParser ? window.DocumentParser.readPdf(f) : Promise.reject(new Error('DocumentParser not loaded'));
    const readEpub = f => window.DocumentParser ? window.DocumentParser.readEpub(f) : Promise.reject(new Error('DocumentParser not loaded'));
    const readDocx = f => window.DocumentParser ? window.DocumentParser.readDocx(f) : Promise.reject(new Error('DocumentParser not loaded'));
    const isGenericTitle = t => window.ExportEngine ? window.ExportEngine.isGenericTitle(t) : (!t || t.trim() === '' || /^translated\s*(document|file)?$/i.test(t.trim()));
    const sanitizeTextForPdf = str => window.ExportEngine ? window.ExportEngine.sanitizeTextForPdf(str) : (str || '');
    window.readFileAsText = readFileAsText;
    window.readPdf = readPdf;
    window.readEpub = readEpub;
    window.readDocx = readDocx;
    window.isGenericTitle = isGenericTitle;
    window.sanitizeTextForPdf = sanitizeTextForPdf;

    // Global PWA install prompt handler to catch event before React renders
    let globalDeferredPrompt = null;
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      globalDeferredPrompt = e;
      window.dispatchEvent(new CustomEvent('pwa-prompt-ready'));
    });

    // ERROR BOUNDARY
    // ═══════════════════════════════════════
    class ErrorBoundary extends React.Component {
      constructor(p) { super(p); this.state = { hasError: false, error: null } }
      static getDerivedStateFromError(e) { return { hasError: true, error: e } }
      render() { if (this.state.hasError) return h('div', { className: 'min-h-screen flex items-center justify-center bg-red-50 dark:bg-gray-900 p-8' }, h('div', { className: 'max-w-lg text-center' }, h('h1', { className: 'text-2xl font-bold text-red-600 mb-4' }, 'Something went wrong'), h('p', { className: 'text-gray-700 dark:text-gray-300 mb-4' }, this.state.error?.message), h('button', { onClick: () => this.setState({ hasError: false, error: null }), className: 'px-6 py-2 bg-indigo-600 text-white rounded-lg' }, 'Try Again'))); return this.props.children }
    }

    // ═══════════════════════════════════════
    // MAIN APP
    // ═══════════════════════════════════════
    function App() {
      // --- Core State ---
      const [inputText, setInputText] = useState('');
      const [assembledText, setAssembledText] = useState('');
      const [terminology, setTerminology] = useState(() => localStorage.getItem('terminology') || '');
      const glossaryTermCount = (terminology || '').split(/\r?\n/).filter(l => l.trim().startsWith('-')).length;
      const [enableGlossary, setEnableGlossary] = useState(() => localStorage.getItem('enableGlossary') === 'true');
      const [customInstructions, setCustomInstructions] = useState(() => localStorage.getItem('customInstructions') || '');
      const [smartGlossary, setSmartGlossary] = useState(() => localStorage.getItem('smartGlossary') !== 'false');
      const [genderLocks, setGenderLocks] = useState(() => {
        try {
          const s = localStorage.getItem('gemini_gender_locks');
          return s ? JSON.parse(s) : {};
        } catch(e) { return {}; }
      });




      // --- Novel Health & QA Proofreader State (§5.9 + §7.1 + §7.5) ---
      const [healthAuditEnabled, setHealthAuditEnabled] = useState(() => localStorage.getItem('healthAuditEnabled') !== 'false');
      const [qaProofreaderEnabled, setQaProofreaderEnabled] = useState(() => localStorage.getItem('qaProofreaderEnabled') !== 'false');
      const [cjkLeakCheckEnabled, setCjkLeakCheckEnabled] = useState(() => localStorage.getItem('cjkLeakCheckEnabled') !== 'false');
      const [antiMtlGateEnabled, setAntiMtlGateEnabled] = useState(() => localStorage.getItem('antiMtlGateEnabled') !== 'false');

      const [qaModalOpen, setQaModalOpen] = useState(false);
      const [qaAuditResult, setQaAuditResult] = useState(null);
      const [qaAuditNovelRef, setQaAuditNovelRef] = useState(null);
      const [qaFilterCategory, setQaFilterCategory] = useState('all');
      const [qaCheckGaps, setQaCheckGaps] = useState(true);
      const [qaCheckCorrupt, setQaCheckCorrupt] = useState(true);
      const [qaCheckCjk, setQaCheckCjk] = useState(() => localStorage.getItem('cjkLeakCheckEnabled') !== 'false');
      const [qaCheckAntiMtl, setQaCheckAntiMtl] = useState(() => localStorage.getItem('antiMtlGateEnabled') !== 'false');
      const [qaCheckLoops, setQaCheckLoops] = useState(true);
      const [qaCheckDuplicates, setQaCheckDuplicates] = useState(true);

      // --- Translation Memory & Snapshots State (§8.2 + §8.6) ---
      const [translationMemoryEnabled, setTranslationMemoryEnabled] = useState(() => localStorage.getItem('translationMemoryEnabled') !== 'false');
      const [snapshotsEnabled, setSnapshotsEnabled] = useState(() => localStorage.getItem('snapshotsEnabled') !== 'false');
      const [diffModalOpen, setDiffModalOpen] = useState(false);
      const [activeDiffData, setActiveDiffData] = useState(null);
      const [diffSnapshotsList, setDiffSnapshotsList] = useState([]);
      const [selectedDiffSnapId, setSelectedDiffSnapId] = useState('');
      const [tmStats, setTmStats] = useState({ totalUnits: 0, tokensSaved: 0, exactHits: 0, fuzzyHits: 0 });

      const [activeTab, setActiveTab] = useState(() => localStorage.getItem('activeTab') || 'text');
      const [settingsCategory, setSettingsCategory] = useState(() => localStorage.getItem('gemini_settings_category') || 'engine');
      const [isFetchingUrl, setIsFetchingUrl] = useState(false);
      const [isFetchingPaused, setIsFetchingPaused] = useState(false);
      const [webImportStatus, setWebImportStatus] = useState('');
      const [webImportError, setWebImportError] = useState(null);
      const [activeCrawlSession, setActiveCrawlSession] = useState(() => {
        try {
          const s = localStorage.getItem('gemini_active_crawl_session');
          return s ? JSON.parse(s) : null;
        } catch (e) { return null; }
      });
      const [webImportData, setWebImportData] = useState(() => {
        try {
          const s = localStorage.getItem('gemini_active_crawl_session');
          return s ? JSON.parse(s) : null;
        } catch (e) { return null; }
      });
      const [webImportUrl, setWebImportUrl] = useState(() => {
        try {
          const s = localStorage.getItem('gemini_active_crawl_session');
          if (s) {
            const parsed = JSON.parse(s);
            return parsed.url || parsed.sourceUrl || '';
          }
          return '';
        } catch (e) { return ''; }
      });

      const activeNovelView = useMemo(() => {
        return webImportData || activeCrawlSession || null;
      }, [webImportData, activeCrawlSession]);

      // --- Web Novel Search State ---
      const [novelSearchResults, setNovelSearchResults] = useState([]);
      const [isSearchingNovels, setIsSearchingNovels] = useState(false);
      const [novelSearchFilter, setNovelSearchFilter] = useState('all');
      const [isSearchResultsCollapsed, setIsSearchResultsCollapsed] = useState(false);

      // --- SwiftAudio Engine & Player State ---
      const [swiftAudioResults, setSwiftAudioResults] = useState([]);
      const [isSwiftAudioSearching, setIsSwiftAudioSearching] = useState(false);
      const [isSwiftAudioMode, setIsSwiftAudioMode] = useState(false);
      const [activeAudiobook, setActiveAudiobook] = useState(null);
      const [audioPlayerState, setAudioPlayerState] = useState(() => window.SwiftAudioEngine?.Player?.getState() || { isLoaded: false });
      const [isFullPlayerOpen, setIsFullPlayerOpen] = useState(false);
      const [isPlayerFullscreen, setIsPlayerFullscreen] = useState(false);
      const [downloadingTrackId, setDownloadingTrackId] = useState(null);
      const [audioDownloadModal, setAudioDownloadModal] = useState(null);

      // --- Saved Audiobooks Library State ---
      const [savedAudiobooks, setSavedAudiobooks] = useState(() => {
        try {
          const raw = localStorage.getItem('gemini_saved_audiobooks');
          return raw ? JSON.parse(raw) : [];
        } catch (e) {
          return [];
        }
      });

      const isAudiobookInLibrary = useCallback((bookOrUrl) => {
        if (!bookOrUrl) return false;
        const targetUrl = typeof bookOrUrl === 'string' ? bookOrUrl : bookOrUrl.url;
        const targetTitle = typeof bookOrUrl === 'object' ? bookOrUrl.title : '';
        return (savedAudiobooks || []).some(b => (targetUrl && b.url === targetUrl) || (targetTitle && b.title === targetTitle));
      }, [savedAudiobooks]);

      const saveAudiobookToLibrary = useCallback((book) => {
        if (!book || (!book.title && !book.url)) return;
        setSavedAudiobooks(prev => {
          const list = prev || [];
          const exists = list.some(b => (b.url && b.url === book.url) || (b.title && b.title === book.title));
          if (exists) return list;
          const newEntry = {
            id: 'audio_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
            title: book.title || 'Untitled Audiobook',
            author: book.author || '',
            cover: book.cover || '',
            url: book.url || '',
            duration: book.duration || '',
            totalTracks: book.totalTracks || (book.tracks ? book.tracks.length : 0),
            tracks: book.tracks || null,
            addedAt: Date.now(),
            lastPlayedTrackIndex: 0,
            lastPlayedTrackTitle: '',
            lastPlayedTime: 0,
            lastListenedAt: null
          };
          const next = [newEntry, ...list];
          try {
            localStorage.setItem('gemini_saved_audiobooks', JSON.stringify(next));
          } catch (e) {}
          toast(`Added "${newEntry.title}" to Library!`, 'success');
          return next;
        });
      }, []);

      const removeAudiobookFromLibrary = useCallback((bookOrUrl) => {
        if (!bookOrUrl) return;
        const targetUrl = typeof bookOrUrl === 'string' ? bookOrUrl : bookOrUrl.url;
        const targetTitle = typeof bookOrUrl === 'object' ? bookOrUrl.title : '';
        const targetId = typeof bookOrUrl === 'object' ? bookOrUrl.id : '';
        setSavedAudiobooks(prev => {
          const next = (prev || []).filter(b => {
            if (targetId && b.id === targetId) return false;
            if (targetUrl && b.url === targetUrl) return false;
            if (targetTitle && b.title === targetTitle) return false;
            return true;
          });
          try {
            localStorage.setItem('gemini_saved_audiobooks', JSON.stringify(next));
          } catch (e) {}
          toast('Removed audiobook from Library.', 'info');
          return next;
        });
      }, []);

      // --- Ongoing EPUB Continuation & Moon+ Reader Continuity State ---
      const [ongoingEpubModal, setOngoingEpubModal] = useState(null);
      const ongoingEpubInputRef = useRef(null);

      useEffect(() => {
        const attachAudio = () => {
          if (window.SwiftAudioEngine && window.SwiftAudioEngine.Player) {
            return window.SwiftAudioEngine.Player.subscribe(st => {
              setAudioPlayerState(st);
              if (st.currentBook && !activeAudiobook) {
                setActiveAudiobook(st.currentBook);
              }
            });
          }
          return null;
        };

        let unsub = attachAudio();
        if (!unsub) {
          const timer = setInterval(() => {
            unsub = attachAudio();
            if (unsub) clearInterval(timer);
          }, 200);
          return () => { clearInterval(timer); if (unsub) unsub(); };
        }
        return unsub;
      }, []);

      const [isAiSorting, setIsAiSorting] = useState(false);
      const [webImportHistory, setWebImportHistory] = useState(() => {
        try {
          const saved = localStorage.getItem('gemini_web_import_history_meta') || localStorage.getItem('gemini_web_import_history');
          return saved ? JSON.parse(saved) : [];
        } catch (e) {
          return [];
        }
      });
      const historyNovels = webImportHistory || [];
      const [historySearchQuery, setHistorySearchQuery] = useState('');
      const [checkingUpdates, setCheckingUpdates] = useState({});
      const [downloadingUpdates, setDownloadingUpdates] = useState({});
      const [novelUpdateBadges, setNovelUpdateBadges] = useState({});
      const [isBatchChecking, setIsBatchChecking] = useState(false);
      const [collapsedVolumes, setCollapsedVolumes] = useState({});
      const [trashList, setTrashList] = useState([]);
      const [trashCount, setTrashCount] = useState(0);

      const loadTrashCount = useCallback(async () => {
        if (window.GeminiNovelDB) {
          try {
            const list = await window.GeminiNovelDB.getTrashNovels();
            setTrashList(list || []);
            setTrashCount((list || []).length);
          } catch (e) {
            setTrashList([]);
            setTrashCount(0);
          }
        }
      }, []);

      const getNovelFolderOptions = (novel) => window.MoonReaderEngine ? window.MoonReaderEngine.getNovelFolderOptions(novel) : {};

      const getCustomTitle = (novelOrUrl) => window.LibraryEngine ? window.LibraryEngine.getCustomTitle(novelOrUrl) : '';

      const handleSaveNovelRename = (novel, newTitle) => window.LibraryEngine?.Controller?.saveRename(novel, newTitle, { setWebImportHistory, setWebImportData, setActiveCrawlSession, setActiveNovelRecord, setReaderNovelTitle: (trimmed) => { if (typeof readerNovelId !== 'undefined' && readerNovelId && (readerNovelId === novel?.id || readerNovelId === novel?.title)) setReaderNovelTitle(trimmed); }, setRenameModalNovel, toast });
      const saveNovelToHistory = (novelData) => window.LibraryEngine?.Controller?.saveToHistory(novelData, { setWebImportHistory, setActiveCrawlSession });
      const toggleNovelSavedSpace = (id, fallback = null) => window.LibraryEngine?.Controller?.toggleSavedSpace(id, fallback, { setWebImportHistory, setActiveCrawlSession, setWebImportData, setActiveNovelRecord, toast });
      const handleCheckNovelUpdate = (item) => window.LibraryEngine?.Controller?.checkUpdate(item, novelUpdateBadges, { setCheckingUpdates, setNovelUpdateBadges, toast });
      const handleDownloadNewChapters = (item) => window.LibraryEngine?.Controller?.downloadUpdates(item, { novelUpdateBadges, getEpubOptions, exportCleanLnoriEpub, setEpubPackagingModal, setNovelUpdateBadges, setWebImportHistory, setActiveCrawlSession, setDownloadingUpdates, toast });
      const handleUpdateTranslateAndMakeEpub = (item) => window.LibraryEngine?.Controller?.stageUpdateTranslation(item, { novelUpdateBadges, loadFullNovel, saveNovelToHistory, setEpubPackagingModal, setNovelUpdateBadges, setInputText, setChapters, setTranslatedChapters, setAssembledText, setActiveNovelRecord, setFileName, activeSessionRef, setActiveSession, setSavedTranslationSession, setIsTranslationPaused, setActiveTab, setDownloadingUpdates, toast });
      const handleCheckAllUpdates = () => window.LibraryEngine?.Controller?.checkAllUpdates(webImportHistory, { loadFullNovel, setIsBatchChecking, setCheckingUpdates, setNovelUpdateBadges, toast });
      const loadFullNovel = (meta) => window.LibraryEngine?.Controller?.loadFullNovel(meta, webImportData);
      const loadNovelFromHistory = (meta) => window.LibraryEngine?.Controller?.loadNovelToImporter(meta, loadFullNovel, setWebImportData, toast);
      const deleteNovelFromHistory = (id) => window.LibraryEngine?.Controller?.moveToTrash(id, { setWebImportHistory, loadTrashCount, toast });
      const handleClearScopedBooks = (books, scope) => window.LibraryEngine?.Controller?.clearScoped(books, scope, { setWebImportHistory, loadTrashCount, handleRestoreSnapshot, toast });
      const handleClearSavedSpace = (books) => window.LibraryEngine?.Controller?.clearSavedSpace(books, toggleNovelSavedSpace, toast);
      const clearAllNovelHistory = () => window.LibraryEngine?.Controller?.clearAll(webImportHistory, { setWebImportHistory, loadTrashCount, handleRestoreSnapshot, toast });
      const handleRestoreNovel = (id) => window.LibraryEngine?.Controller?.restoreNovel(id, { setWebImportHistory, loadTrashCount, toast });
      const handleRestoreSnapshot = (snapshot) => window.LibraryEngine?.Controller?.restoreSnapshot(snapshot, { setWebImportHistory, loadTrashCount, toast });
      const handleRestoreAllTrash = () => window.LibraryEngine?.Controller?.restoreAll({ setWebImportHistory, loadTrashCount }, toast);
      const handlePermanentDelete = (id) => window.LibraryEngine?.Controller?.permanentDelete(id, { loadTrashCount, toast });
      const handleEmptyTrash = () => window.LibraryEngine?.Controller?.emptyTrash({ loadTrashCount, toast });
      const handleRestoreFromEpubFiles = (e) => window.LibraryEngine?.Controller?.restoreEpubFiles(e?.target?.files ? Array.from(e.target.files) : (Array.isArray(e) ? e : []), { setWebImportHistory, setActiveCrawlSession: () => setActiveCrawlSession(null) }, toast);
      const handleReindexFromTranslationHistory = () => window.LibraryEngine?.Controller?.reindex({ dbGetAll, webImportHistory, saveNovelToHistory, toast });

      // ══════════════════════════════════════════════════════════════════════════
      // ONGOING EPUB CONTINUATION & MOON+ READER CONTINUITY ENGINE
      // ══════════════════════════════════════════════════════════════════════════
      const handleSearchContinuationSources = async (query) => {
        if (window.MoonReaderEngine?.Continuation?.handleSearchContinuationSources) {
          return window.MoonReaderEngine.Continuation.handleSearchContinuationSources(query, {}, {
            setOngoingEpubModal
          });
        }
      };

      const handleSelectContinuationSource = async (srcItem) => {
        if (window.MoonReaderEngine?.Continuation?.handleSelectContinuationSource) {
          return window.MoonReaderEngine.Continuation.handleSelectContinuationSource(srcItem, { ongoingEpubModal }, {
            toast,
            setOngoingEpubModal,
            handleScanContinuationToc
          });
        }
      };

      const handleSelectOngoingEpubFile = async (file) => {
        if (window.MoonReaderEngine?.Continuation?.handleSelectOngoingEpubFile) {
          return window.MoonReaderEngine.Continuation.handleSelectOngoingEpubFile(file, { readEpub }, {
            toast,
            setOngoingEpubModal,
            handleSearchContinuationSources,
            handleScanContinuationToc
          });
        }
      };

      const handleOpenContinuationForNovel = async (novelItem) => {
        if (window.MoonReaderEngine?.Continuation?.handleOpenContinuationForNovel) {
          return window.MoonReaderEngine.Continuation.handleOpenContinuationForNovel(novelItem, { loadFullNovel, readEpub }, {
            toast,
            setOngoingEpubModal,
            handleSearchContinuationSources,
            handleScanContinuationToc
          });
        }
      };

      const handleScanContinuationToc = async (url, existingCount) => {
        if (window.MoonReaderEngine?.Continuation?.handleScanContinuationToc) {
          return window.MoonReaderEngine.Continuation.handleScanContinuationToc(url, { ongoingEpubModal, existingCount }, {
            toast,
            setOngoingEpubModal
          });
        }
      };

      const handleExecuteContinuation = async () => {
        if (window.MoonReaderEngine?.Continuation?.handleExecuteContinuation) {
          return window.MoonReaderEngine.Continuation.handleExecuteContinuation({ ongoingEpubModal }, {
            toast,
            setOngoingEpubModal,
            saveNovelToHistory
          });
        }
      };

      // Load persistent IndexedDB novels on mount, merging seamlessly with localStorage
      // Load persistent IndexedDB novels on mount, merging seamlessly with localStorage
      useEffect(() => {
        window.LibraryEngine?.loadInitialNovels({
          onHistory: setWebImportHistory,
          loadTrashCount
        });
      }, []);

      // Lazy cover art hydration from IndexedDB for any novels missing covers
      useEffect(() => {
        let isMounted = true;
        window.LibraryEngine?.hydrateMissingCovers(webImportHistory, {
          isMounted: () => isMounted,
          setWebImportHistory
        });
        return () => { isMounted = false; };
      }, [webImportHistory?.length]);

      const [studioSubTab, setStudioSubTab] = useState(() => localStorage.getItem('studioSubTab') || 'split');
      const [error, _setError] = useState('');

      // --- Translation State ---
      const [isTranslating, setIsTranslating] = useState(false);
      const [progress, setProgress] = useState(0);
      const [progressLabel, setProgressLabel] = useState('');
      const [translatedChapters, setTranslatedChapters] = useState([]);
      const [chapters, setChapters] = useState([]);
      const [lastUsageStats, setLastUsageStats] = useState(null);
      const [activeBookMenuNovel, setActiveBookMenuNovel] = useState(null);

      const partitionTextByChapters = (fullText, baseChapters) => {
        if (window.DocumentParser?.partitionTextByChapters) {
          return window.DocumentParser.partitionTextByChapters(fullText, baseChapters);
        }
        return null;
      };

      const parseAssembledTextToChapters = (text, fallbackTitle = 'Chapter 1', knownTitles = []) => {
        if (window.DocumentParser?.parseAssembledTextToChapters) {
          return window.DocumentParser.parseAssembledTextToChapters(text, fallbackTitle, knownTitles);
        }
        return [];
      };

      const handleAssembledTextChange = (newText) => {
        if (window.DocumentParser?.syncAssembledTextToChapters) {
          window.DocumentParser.syncAssembledTextToChapters({
            newText,
            translatedChapters,
            setAssembledText,
            setTranslatedChapters,
            defaultTitle: (translatedChapters && translatedChapters[0]?.title) || currentDocTitle || fileName || 'Chapter 1'
          });
        }
      };

      // --- Provider State ---
      const [provider, setProvider] = useState(() => localStorage.getItem('translationProvider') || 'gemini');
      const [apiKeysByProvider, setApiKeysByProvider] = useState(() => {
        const saved = localStorage.getItem('apiKeysByProvider');
        if (saved) {
          try {
            const p = JSON.parse(saved);
            if (p && typeof p === 'object') return p;
          } catch (e) {}
        }
        const gKey = localStorage.getItem('geminiApiKey') || '';
        const dsKey = localStorage.getItem('deepseekApiKey') || '';
        const dlKey = localStorage.getItem('deeplApiKey') || '';
        const oaiKey = localStorage.getItem('openaiApiKey') || '';
        const cldKey = localStorage.getItem('claudeApiKey') || '';
        return {
          gemini: gKey ? [{ id: 'gemini-init', name: 'Primary Gemini Key', key: gKey }] : [],
          deepseek: dsKey ? [{ id: 'deepseek-init', name: 'Primary DeepSeek Key', key: dsKey }] : [],
          openai: oaiKey ? [{ id: 'openai-init', name: 'Primary OpenAI Key', key: oaiKey }] : [],
          claude: cldKey ? [{ id: 'claude-init', name: 'Primary Claude Key', key: cldKey }] : [],
          deepl: dlKey ? [{ id: 'deepl-init', name: 'Primary DeepL Key', key: dlKey }] : [],
          libre: []
        };
      });
      const [activeKeyIds, setActiveKeyIds] = useState(() => {
        const saved = localStorage.getItem('activeKeyIds');
        if (saved) {
          try {
            const p = JSON.parse(saved);
            if (p && typeof p === 'object') return p;
          } catch (e) {}
        }
        return {
          gemini: 'gemini-init',
          deepseek: 'deepseek-init',
          openai: 'openai-init',
          claude: 'claude-init',
          deepl: 'deepl-init',
          libre: null
        };
      });
      const [showKeys, setShowKeys] = useState({});

      const [libreUrl, setLibreUrl] = useState(() => localStorage.getItem('libreUrl') || 'https://libretranslate.com');
      const [geminiModel, setGeminiModel] = useState(() => {
        const saved = localStorage.getItem('geminiModel');
        if (saved && (saved.includes('gemini-2') || saved.includes('gemini-1'))) {
          localStorage.setItem('geminiModel', 'gemini-3.7-flash');
          return 'gemini-3.7-flash';
        }
        return saved || 'gemini-3.7-flash';
      });
      const [deepseekModel, setDeepseekModel] = useState(() => localStorage.getItem('deepseekModel') || 'deepseek-chat');
      const [openaiModel, setOpenaiModel] = useState(() => localStorage.getItem('openaiModel') || 'gpt-4o-mini');
      const [claudeModel, setClaudeModel] = useState(() => localStorage.getItem('claudeModel') || 'claude-3-5-haiku-20241022');
      const [availableModels, setAvailableModels] = useState([]);
      const [customModel, setCustomModel] = useState(() => localStorage.getItem('customModel') || '');
      const [useCustomModel, setUseCustomModel] = useState(() => localStorage.getItem('useCustomModel') === 'true');
      const [customDeepseekModel, setCustomDeepseekModel] = useState(() => localStorage.getItem('customDeepseekModel') || '');
      const [useCustomDeepseekModel, setUseCustomDeepseekModel] = useState(() => localStorage.getItem('useCustomDeepseekModel') === 'true');
      const [customOpenaiModel, setCustomOpenaiModel] = useState('');
      const [useCustomOpenaiModel, setUseCustomOpenaiModel] = useState(false);
      const [customClaudeModel, setCustomClaudeModel] = useState('');
      const [useCustomClaudeModel, setUseCustomClaudeModel] = useState(false);
      const model = (provider === 'deepseek')
        ? (useCustomDeepseekModel && customDeepseekModel ? customDeepseekModel : deepseekModel)
        : (useCustomModel && customModel ? customModel : geminiModel);
      const isStandalone = typeof window !== 'undefined' && (window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true);
      const [deferredPrompt, setDeferredPrompt] = useState(globalDeferredPrompt);

      useEffect(() => {
        const handlePrompt = (e) => {
          e.preventDefault();
          globalDeferredPrompt = e;
          setDeferredPrompt(e);
        };
        const handleReady = () => {
          if (globalDeferredPrompt) setDeferredPrompt(globalDeferredPrompt);
        };
        window.addEventListener('beforeinstallprompt', handlePrompt);
        window.addEventListener('pwa-prompt-ready', handleReady);
        window.addEventListener('appinstalled', () => {
          globalDeferredPrompt = null;
          setDeferredPrompt(null);
          toast('Gemini Translator installed successfully!', 'success');
        });
        return () => {
          window.removeEventListener('beforeinstallprompt', handlePrompt);
          window.removeEventListener('pwa-prompt-ready', handleReady);
        };
      }, []);

      useEffect(() => {
        const handleLoadExtractedText = (e) => {
          const { title, text, count } = e.detail || {};
          if (text) {
            setInputText(text);
            setActiveTab('text');
            toast(`Loaded ${count ? count + ' ' : ''}chapters from EPUB Studio into Translator!`, 'success');
          }
        };
        window.addEventListener('load-extracted-text', handleLoadExtractedText);
        return () => window.removeEventListener('load-extracted-text', handleLoadExtractedText);
      }, []);


      const handleInstallPWA = async () => {
        const promptEvent = deferredPrompt || globalDeferredPrompt;
        if (promptEvent) {
          promptEvent.prompt();
          try {
            const choice = await promptEvent.userChoice;
            if (choice && choice.outcome === 'accepted') {
              toast('Gemini Translator installed successfully!', 'success');
            }
          } catch (e) {}
          globalDeferredPrompt = null;
          setDeferredPrompt(null);
        } else {
          alert(' How to install Gemini Translator on Samsung S24 / Microsoft Edge:\n\n1. Tap the "..." menu at the bottom.\n2. Look for "Install app" or tap "Add to phone" -> "Install app".\n (Make sure to select "Install app", NOT "Add shortcut")\n\n If you previously added a web shortcut, delete that shortcut from your home screen first, then reload this page.');
        }
      };

      // --- Multi-Key Profile Management Helpers ---
      const addApiKey = (prov) => window.KeyManagerEngine?.Controller?.addKey(prov, { apiKeysByProvider, activeKeyIds, genId, setApiKeysByProvider, setActiveKeyIds, toast });
      const deleteApiKey = (prov, id) => window.KeyManagerEngine?.Controller?.deleteKey(prov, id, { apiKeysByProvider, activeKeyIds, setApiKeysByProvider, setActiveKeyIds, toast, confirmAction });
      const updateApiKey = (prov, id, field, value) => window.KeyManagerEngine?.Controller?.updateKey(prov, id, field, value, setApiKeysByProvider);
      const setActiveKey = (prov, id) => window.KeyManagerEngine?.Controller?.setActiveKey(prov, id, { setActiveKeyIds, activeKeyIds, apiKeysByProvider, toast });

      const activeKeyIdsRef = useRef(activeKeyIds);
      useEffect(() => { activeKeyIdsRef.current = activeKeyIds; }, [activeKeyIds]);

      const rotateApiKey = (failingKey) => window.KeyManagerEngine?.Controller?.rotateKey(provider, failingKey, { apiKeysByProvider, activeKeyIdsRef, toast, setActiveKeyIds });
      if (typeof window !== 'undefined') window.rotateApiKey = rotateApiKey;

      const getActiveApiKey = (prov = provider) => window.KeyManagerEngine?.Controller?.getActiveKey(prov, apiKeysByProvider, activeKeyIds);

      const geminiKey = getActiveApiKey('gemini');
      const deepseekKey = getActiveApiKey('deepseek');
      const openaiKey = getActiveApiKey('openai');
      const claudeKey = getActiveApiKey('claude');
      const deeplKey = getActiveApiKey('deepl');
      const [enableStreaming, setEnableStreaming] = useState(() => localStorage.getItem('enableStreaming') === 'true');
      const [enableThinking, setEnableThinking] = useState(() => localStorage.getItem('enableThinking') === 'true');
      const [strictModel, setStrictModel] = useState(() => localStorage.getItem('strictModel') !== 'false');
      const [concurrency, setConcurrency] = useState(() => parseInt(localStorage.getItem('concurrency')) || DEFAULT_CONCURRENCY);
      const [contextAware, setContextAware] = useState(() => localStorage.getItem('contextAware') !== 'false');
      const [chunkSizePreset, setChunkSizePreset] = useState(() => localStorage.getItem('chunkSizePreset') || 'turbo');

      // ── EPUB Formatting & Typography Preferences ──
      const [epubDropCaps, setEpubDropCaps] = useState(() => localStorage.getItem('epubDropCaps') !== 'false');
      const [epubSmartQuotes, setEpubSmartQuotes] = useState(() => localStorage.getItem('epubSmartQuotes') !== 'false');
      const [epubCleanWebArtifacts, setEpubCleanWebArtifacts] = useState(() => localStorage.getItem('epubCleanWebArtifacts') !== 'false');
      const [epubFontTheme, setEpubFontTheme] = useState(() => localStorage.getItem('epubFontTheme') || 'literata');
      const [epubJustifyText, setEpubJustifyText] = useState(() => localStorage.getItem('epubJustifyText') !== 'false');
      const [epubIncludeImages, setEpubIncludeImages] = useState(() => localStorage.getItem('epubIncludeImages') !== 'false');
      const [epubFixedFilename, setEpubFixedFilename] = useState(() => localStorage.getItem('epubFixedFilename') !== 'false');
      const [scrapeImages, setScrapeImages] = useState(() => localStorage.getItem('scrapeImages') !== 'false');

      useEffect(() => { localStorage.setItem('strictModel', String(strictModel)); }, [strictModel]);
      useEffect(() => { localStorage.setItem('epubIncludeImages', String(epubIncludeImages)); }, [epubIncludeImages]);
      useEffect(() => { localStorage.setItem('epubFixedFilename', String(epubFixedFilename)); }, [epubFixedFilename]);
      useEffect(() => { localStorage.setItem('scrapeImages', String(scrapeImages)); if (typeof window !== 'undefined') window.__scrapeImages = scrapeImages; }, [scrapeImages]);

      useEffect(() => { localStorage.setItem('epubDropCaps', String(epubDropCaps)); }, [epubDropCaps]);
      useEffect(() => { localStorage.setItem('epubSmartQuotes', String(epubSmartQuotes)); }, [epubSmartQuotes]);
      useEffect(() => { localStorage.setItem('epubCleanWebArtifacts', String(epubCleanWebArtifacts)); }, [epubCleanWebArtifacts]);
      useEffect(() => { localStorage.setItem('epubFontTheme', epubFontTheme); }, [epubFontTheme]);
      useEffect(() => { localStorage.setItem('epubJustifyText', String(epubJustifyText)); }, [epubJustifyText]);

      const getEpubOptions = (extraOpts = {}) => {
        const fn = (window.EpubEngine && window.EpubEngine.getEpubOptions) || window.getEpubOptions;
        return fn ? fn(extraOpts, {
          activeNovelView,
          activeCrawlSession,
          webImportData,
          activeNovelRecord,
          currentDocCover,
          coverImage,
          fileName,
          currentDocTitle,
          webImportHistory,
          epubIncludeImages,
          scrapeImages,
          epubDropCaps,
          epubSmartQuotes,
          epubCleanWebArtifacts,
          epubFontTheme,
          epubJustifyText,
          epubFixedFilename
        }) : { ...extraOpts };
      };

      const getEpubFileName = (title, chapterCount = 0, isPartial = false) => {
        const fn = (window.EpubEngine && window.EpubEngine.getEpubFileName) || window.getEpubFileName;
        return fn ? fn(title, chapterCount, isPartial, epubFixedFilename) : `${title || 'Novel'}.epub`;
      };

      const cleanBookTitle = (t, fallbackChs = []) => {
        const fn = (window.EpubEngine && window.EpubEngine.cleanBookTitle) || window.cleanBookTitle;
        return fn ? fn(t, fallbackChs) : (t || 'Web Novel');
      };

      const cleanBookAuthor = (a) => {
        const fn = (window.EpubEngine && window.EpubEngine.cleanBookAuthor) || window.cleanBookAuthor;
        return fn ? fn(a) : (a || '');
      };

      // ══════════════════════════════════════════════════════════════════
      // STAGE 2: MOON+ READER PRO FOLDER BINDING & LOCAL OPDS SERVER
      // ══════════════════════════════════════════════════════════════════
      const [opdsRunning, setOpdsRunning] = useState(false);
      const [opdsUrl, setOpdsUrl] = useState('http://127.0.0.1:8080/opds');
      const [opdsWifiUrl, setOpdsWifiUrl] = useState('');

      useEffect(() => {
        if (window.NativeBridge && window.NativeBridge.getOpdsStatus) {
          window.NativeBridge.getOpdsStatus().then(status => {
            if (status) {
              setOpdsRunning(!!status.running);
              if (status.localUrl) setOpdsUrl(status.localUrl);
              if (status.wifiUrl) setOpdsWifiUrl(status.wifiUrl);
            }
          }).catch(() => {});
        }
      }, []);

      const updateNovelFolderRecord = async (novel, treeUri, displayPath) => {
        if (!window.MoonReaderEngine) return;
        return await window.MoonReaderEngine.bindNovelFolder(novel, treeUri, displayPath, {
          setWebImportHistory,
          setActiveCrawlSession,
          setWebImportData,
          setActiveNovelRecord
        });
      };

      const handleSetNovelFolder = async (novel) => {
        if (!window.MoonReaderEngine) return;
        return await window.MoonReaderEngine.handleSetNovelFolder(novel, { toast, setWebImportHistory });
      };

      const syncOpdsCatalogToNative = useCallback((novelsList) => {
        if (window.MoonReaderEngine) {
          window.MoonReaderEngine.syncOpdsCatalogToNative(novelsList || webImportHistory);
        }
      }, [webImportHistory]);

      useEffect(() => {
        if (webImportHistory && webImportHistory.length > 0) {
          syncOpdsCatalogToNative(webImportHistory);
        }
      }, [webImportHistory, syncOpdsCatalogToNative]);

      const toggleOpdsServer = async () => {
        if (!window.MoonReaderEngine) return;
        return await window.MoonReaderEngine.toggleOpdsServerUI(opdsRunning, {
          toast,
          setOpdsRunning,
          setOpdsUrl,
          setOpdsWifiUrl,
          webImportHistory
        });
      };

      // ── SWIFTAUDIO HANDLERS ──
      const handleSwiftAudioSearch = (queryOrUrl) => window.SwiftAudioEngine?.Controller?.handleSwiftAudioSearch(queryOrUrl, { webImportUrl, toast, setIsSwiftAudioSearching, setWebImportStatus, setActiveAudiobook, setSwiftAudioResults });

      // ── NOVEL SEARCH HANDLER ──
      const handleSearchNovels = (queryOrUrl, sourceOverride = 'all') => {
        const target = (queryOrUrl || webImportUrl || '').trim();
        if (sourceOverride === 'all') setNovelSearchFilter('all');
        return (window.WebNovelCrawlerEngine?.Controller || window.WebNovelCrawlerEngine)?.searchNovels(target, sourceOverride, {
          toast,
          onDirectUrl: (url) => handleStartFetch(false, null, false, url),
          onStart: () => { setIsSearchingNovels(true); setIsSearchResultsCollapsed(false); setWebImportStatus('Searching novel sources and installed plugins…'); },
          onEnd: () => { setIsSearchingNovels(false); setWebImportStatus(''); },
          onFilterFallback: (filter) => setNovelSearchFilter(filter),
          onResults: (results) => setNovelSearchResults(results)
        });
      };

      const handleStartPlayAudiobook = (bookOrResult, startTrack = 0) => window.SwiftAudioEngine?.Controller?.handleStartPlayAudiobook(bookOrResult, startTrack, { webImportUrl, toast, setActiveAudiobook, setIsFullPlayerOpen });
      const handleOpenAudioDownload = (bookOrResult) => window.SwiftAudioEngine?.Controller?.handleOpenAudioDownload(bookOrResult, { webImportUrl, getNovelFolderOptions, toast, setActiveAudiobook, setAudioDownloadModal });
      const handleExecuteAudioBatchDownload = () => window.SwiftAudioEngine?.Controller?.handleExecuteAudioBatchDownload({ audioDownloadModal, getNovelFolderOptions, setAudioDownloadModal, toast });

      // --- Language State ---
      const [srcLang, setSrcLang] = useState('Auto-detect');
      const [tgtLang, setTgtLang] = useState('English');

      // --- Glossary State ---
      const [savedGlossaries, setSavedGlossaries] = useState(() => {
        try { return JSON.parse(localStorage.getItem('savedGlossaries') || '[]'); } catch (e) { return []; }
      });
      const [newGlossaryName, setNewGlossaryName] = useState('');
      const [activeGlossaryId, setActiveGlossaryId] = useState(() => localStorage.getItem('activeGlossaryId') || null);
      const [defaultGlossaryName, setDefaultGlossaryName] = useState(() => localStorage.getItem('defaultGlossaryName') || null);

      // --- Reader Mode State ---
      const [readerOpen, setReaderOpen] = useState(false);
      const [readerTheme, setReaderTheme] = useState(() => localStorage.getItem('readerTheme') || 'sepia');
      const [readerFont, setReaderFont] = useState(() => localStorage.getItem('readerFont') || 'serif');
      const [readerFontSize, setReaderFontSize] = useState(() => parseInt(localStorage.getItem('readerFontSize')) || 18);
      const [readerChapterIdx, setReaderChapterIdx] = useState(0);
      const [readerNovelId, setReaderNovelId] = useState(null);
      const [readerNovelTitle, setReaderNovelTitle] = useState(null);

      // --- Session/Resume State ---
      const [activeSession, setActiveSession] = useState(null);
      const activeSessionRef = useRef(null);
      useEffect(() => { activeSessionRef.current = activeSession; }, [activeSession]);
      const [savedTranslationSession, setSavedTranslationSession] = useState(null);
      const [isTranslationPaused, setIsTranslationPaused] = useState(false);
      const isPausingRef = useRef(false);
      const [currentFileHash, setCurrentFileHash] = useState('');
      const [currentOriginalZip, setCurrentOriginalZip] = useState(null);
      const [currentIsEpub, setCurrentIsEpub] = useState(false);
      const [currentDocCover, setCurrentDocCover] = useState(() => {
        try { return localStorage.getItem('gemini_current_doc_cover') || ''; } catch (_) { return ''; }
      });
      useEffect(() => {
        try {
          if (currentDocCover) {
            localStorage.setItem('gemini_current_doc_cover', currentDocCover);
            window.currentDocCover = currentDocCover;
          }
        } catch (_) {}
      }, [currentDocCover]);
      const [fileName, setFileName] = useState('');
      const [currentDocTitle, setCurrentDocTitle] = useState('');

      // Check for active / paused translation in IndexedDB on launch
      useEffect(() => {
        (async () => {
          if (window.GeminiNovelDB) {
            try {
              const active = await window.GeminiNovelDB.getActiveTranslationSession();
              if (active) {
                activeSessionRef.current = active;
                setActiveSession(active);
                setSavedTranslationSession(active);
                setIsTranslationPaused(true);
              }
            } catch(e) {}
          }
        })();
      }, []);

      // Translator Input Performance Debouncer
      const inputSaveTimerRef = useRef(null);
      const handleInputChange = (val) => {
        setInputText(val);
        if (chapters.length > 0) {
          if (!val.trim()) {
            setChapters([]);
          } else if (chapters.length === 1) {
            setChapters([{ ...chapters[0], text: val, content: val }]);
          }
        }
        if (inputSaveTimerRef.current) clearTimeout(inputSaveTimerRef.current);
        inputSaveTimerRef.current = setTimeout(() => {
          try {
            if (val.length < 500000) {
              localStorage.setItem('inputText', val);
            } else {
              localStorage.removeItem('inputText');
            }
          } catch (e) {}
        }, 800);
      };

      // Memoized Performance Metrics
      const inputCharCount = useMemo(() => charCount(inputText), [inputText]);
      const inputTokenCount = useMemo(() => estimateTokens(inputText), [inputText]);
      const outputWordCount = useMemo(() => wordCount(assembledText), [assembledText]);

      const handlePauseTranslation = async () => {
        const engine = window.TranslationLoopEngine || TranslationLoopEngine;
        if (engine?.Controller?.pauseTranslation) {
          return engine.Controller.pauseTranslation({
            isPausingRef,
            setIsTranslationPaused,
            abortRef,
            activeSessionRef,
            activeSession,
            setActiveSession,
            setSavedTranslationSession,
            chapters,
            translatedChapters,
            fileName,
            activeNovelRecord,
            currentFileHash,
            currentIsEpub,
            currentDocCover,
            inputText,
            assembledText,
            toast
          });
        }
      };

      const resumeSavedTranslation = async (session) => {
        const engine = window.TranslationLoopEngine || TranslationLoopEngine;
        if (engine?.Controller?.resumeTranslation) {
          return engine.Controller.resumeTranslation({
            session,
            savedTranslationSession,
            activeSessionRef,
            activeSession,
            setActiveSession,
            setSavedTranslationSession,
            setIsTranslationPaused,
            isPausingRef,
            setCurrentDocCover,
            setActiveNovelRecord,
            setFileName,
            setCurrentDocTitle,
            setActiveTab,
            setTranslatedChapters,
            setAssembledText,
            chapters,
            handlers: {
              handleTranslateEbook,
              handleTranslateText
            },
            toast
          });
        }
      };

      const discardSavedTranslation = async (sessionId) => {
        const engine = window.TranslationLoopEngine || TranslationLoopEngine;
        if (engine?.Controller?.discardSession) {
          return engine.Controller.discardSession({
            sessionId,
            activeSessionRef,
            setSavedTranslationSession,
            setActiveSession,
            setIsTranslationPaused,
            toast
          });
        }
      };

      const handleSaveTranslationToLibrarySpace = async () => {
        const engine = window.TranslationLoopEngine || TranslationLoopEngine;
        if (engine?.Controller?.saveTranslationToLibrarySpace) {
          return engine.Controller.saveTranslationToLibrarySpace({
            assembledText,
            fileName,
            activeNovelRecord,
            currentDocTitle,
            translatedChapters,
            chapters,
            inputText,
            currentDocCover,
            webImportHistory,
            webImportData,
            webImportUrl: typeof webImportUrl !== 'undefined' ? webImportUrl : '',
            parseAssembledTextToChapters,
            saveNovelToHistory,
            toast
          });
        }
      };

      // --- UI State ---
      const [darkMode, setDarkMode] = useState(() => { const s = localStorage.getItem('darkMode'); return s !== null ? s === 'true' : window.matchMedia('(prefers-color-scheme:dark)').matches });
      const [amoledMode, setAmoledMode] = useState(() => localStorage.getItem('amoledMode') === 'true');
      useEffect(() => {
        localStorage.setItem('amoledMode', String(amoledMode));
        if (amoledMode) {
          document.documentElement.setAttribute('data-theme', 'amoled');
          document.body.classList.add('theme-amoled');
        } else {
          document.documentElement.removeAttribute('data-theme');
          document.body.classList.remove('theme-amoled');
        }
      }, [amoledMode]);

      // Android / Device WakeLock Setting
      const [deviceWakeLock, setDeviceWakeLock] = useState(() => localStorage.getItem('deviceWakeLock') !== 'false');
      useEffect(() => { localStorage.setItem('deviceWakeLock', String(deviceWakeLock)); }, [deviceWakeLock]);

      // WebDAV Sync State
      const [webdavUrl, setWebdavUrl] = useState(() => localStorage.getItem('webdavUrl') || '');
      const [webdavUser, setWebdavUser] = useState(() => localStorage.getItem('webdavUser') || '');
      const [webdavPass, setWebdavPass] = useState(() => localStorage.getItem('webdavPass') || '');
      const [webdavPath, setWebdavPath] = useState(() => localStorage.getItem('webdavPath') || 'GeminiTranslator');
      const [webdavAutoSync, setWebdavAutoSync] = useState(() => localStorage.getItem('webdavAutoSync') === 'true');
      const [webdavTesting, setWebdavTesting] = useState(false);
      const [webdavSyncing, setWebdavSyncing] = useState(false);
      const [webdavLastSync, setWebdavLastSync] = useState(() => localStorage.getItem('webdavLastSync') || null);

      useEffect(() => { localStorage.setItem('webdavUrl', webdavUrl); }, [webdavUrl]);
      useEffect(() => { localStorage.setItem('webdavUser', webdavUser); }, [webdavUser]);
      useEffect(() => { localStorage.setItem('webdavPass', webdavPass); }, [webdavPass]);
      useEffect(() => { localStorage.setItem('webdavPath', webdavPath); }, [webdavPath]);
      useEffect(() => { localStorage.setItem('webdavAutoSync', String(webdavAutoSync)); }, [webdavAutoSync]);

      // Cloud Provider & Google Drive Sync State (Mihon/Komikku Architecture)
      const [cloudProvider, setCloudProvider] = useState(() => localStorage.getItem('cloudProvider') || 'gdrive');
      useEffect(() => { localStorage.setItem('cloudProvider', cloudProvider); }, [cloudProvider]);

      const [gdriveClientId, setGdriveClientId] = useState(() => localStorage.getItem('gdrive_client_id') || window.GoogleDriveSync?.getClientId?.() || '');
      const [gdriveConnected, setGdriveConnected] = useState(() => Boolean(window.GoogleDriveSync?.isConnected()));
      const [gdriveUser, setGdriveUser] = useState(() => window.GoogleDriveSync?.userProfile || null);
      const [gdriveFolderMode, setGdriveFolderMode] = useState(() => localStorage.getItem('gdrive_folder_mode') || 'appDataFolder');
      const [gdriveAutoSync, setGdriveAutoSync] = useState(() => localStorage.getItem('gdrive_auto_sync') === 'true');
      const [gdriveLastSync, setGdriveLastSync] = useState(() => localStorage.getItem('gdrive_last_sync') || null);
      const [gdriveTesting, setGdriveTesting] = useState(false);
      const [gdriveSyncing, setGdriveSyncing] = useState(false);
      const [gdriveConfigModalOpen, setGdriveConfigModalOpen] = useState(false);
      const [gdriveManualToken, setGdriveManualToken] = useState('');

      useEffect(() => { localStorage.setItem('gdrive_folder_mode', gdriveFolderMode); }, [gdriveFolderMode]);
      useEffect(() => { localStorage.setItem('gdrive_auto_sync', String(gdriveAutoSync)); }, [gdriveAutoSync]);

      // AI Auto-Glossary Extractor State
      const [autoGlossaryModalOpen, setAutoGlossaryModalOpen] = useState(false);
      const [autoGlossaryChapterCount, setAutoGlossaryChapterCount] = useState(5);
      const [autoGlossaryTargetNovel, setAutoGlossaryTargetNovel] = useState(null);
      const [isExtractingGlossary, setIsExtractingGlossary] = useState(false);
      const [extractedTerms, setExtractedTerms] = useState([]);

      // Name Consistency Verifier State
      const [consistencyModalOpen, setConsistencyModalOpen] = useState(false);
      const [isAuditingConsistency, setIsAuditingConsistency] = useState(false);
      const [consistencyAuditResults, setConsistencyAuditResults] = useState(null);
      // Source Plugins State (§4.1)
      const [sourcePluginsModalOpen, setSourcePluginsModalOpen] = useState(false);
      const [pluginCatalog, setPluginCatalog] = useState([]);
      const [isCatalogLoading, setIsCatalogLoading] = useState(false);
      const [pluginSearchQuery, setPluginSearchQuery] = useState('');
      const [pluginSelectedTab, setPluginSelectedTab] = useState('installed');
      const [customPluginUrl, setCustomPluginUrl] = useState('');
      const [pluginCatalogTick, setPluginCatalogTick] = useState(0);
      const [pluginNovelSearchQuery, setPluginNovelSearchQuery] = useState('');
      const [pluginNovelSearchSource, setPluginNovelSearchSource] = useState('all');
      const [pluginNovelSearchResults, setPluginNovelSearchResults] = useState([]);
      const [isPluginNovelSearching, setIsPluginNovelSearching] = useState(false);
      const [pluginSelectedLangFilter, setPluginSelectedLangFilter] = useState('all');

      // Tachiyomi / Mihon Style Quick Toggles
      const [downloadedOnly, setDownloadedOnly] = useState(() => {
        try { return localStorage.getItem('downloadedOnly') === 'true'; } catch (_) { return false; }
      });
      const [incognitoMode, setIncognitoMode] = useState(() => {
        try { return localStorage.getItem('incognitoMode') === 'true'; } catch (_) { return false; }
      });

      // Cost & Time Estimator State (§7.2)
      const [costEstimatorModalOpen, setCostEstimatorModalOpen] = useState(false);
      const [costEstimatorData, setCostEstimatorData] = useState(null);

      // Cultural Context Footnotes Protocol (§5.10)
      const [culturalFootnotesEnabled, setCulturalFootnotesEnabled] = useState(() => {
        try { return localStorage.getItem('culturalFootnotesEnabled') !== 'false'; } catch (_) { return true; }
      });
      useEffect(() => {
        try { localStorage.setItem('culturalFootnotesEnabled', String(culturalFootnotesEnabled)); } catch (_) {}
      }, [culturalFootnotesEnabled]);

      const [toasts, setToasts] = useState([]);
      const [appVersion, setAppVersion] = useState(VERSION);
      const [appVersionCode, setAppVersionCode] = useState(8280);
      const [renameModalNovel, setRenameModalNovel] = useState(null);
      const [newNovelTitleInput, setNewNovelTitleInput] = useState('');
      const [installingPluginId, setInstallingPluginId] = useState(null);
      useEffect(() => {
        fetch('./version.json?t=' + Date.now())
          .then(r => r.json())
          .then(d => {
            if (d && d.version) {
              VERSION = d.version;
              setAppVersion(d.version);
              if (d.versionCode) setAppVersionCode(d.versionCode);
            }
          })
          .catch(() => {});
      }, []);
      const [availableUpdate, setAvailableUpdate] = useState(null);
      const [downloadSuccessModal, setDownloadSuccessModal] = useState(null);
      const [epubPackagingModal, setEpubPackagingModal] = useState(null);
      const [activeNovelRecord, setActiveNovelRecord] = useState(null);
      const [isUpdating, setIsUpdating] = useState(false);
      const [sideBySide, setSideBySide] = useState(false);
      const [showModal, setShowModal] = useState(false);
      const [modalMessage, setModalMessage] = useState('');
      const [modalCallback, setModalCallback] = useState(null);
      const [history, setHistory] = useState([]);
      const [historySearch, setHistorySearch] = useState('');
      const [showHistory, setShowHistory] = useState(false);
      const [showGlossaryManager, setShowGlossaryManager] = useState(true);
      const [uploadingFile, setUploadingFile] = useState(false);
      const [downloadingPdf, setDownloadingPdf] = useState(false);
      const [downloadingEpub, setDownloadingEpub] = useState(false);
      const [downloadingDocx, setDownloadingDocx] = useState(false);
      const [isOptimizingGlossary, setIsOptimizingGlossary] = useState(false);
      const [isDragOver, setIsDragOver] = useState(false);

      // Storage Diagnostics & Maintenance
      const [storageDiag, setStorageDiag] = useState({ usedMB: 0, quotaMB: 0, pct: 0, available: false });
      const [storageLoading, setStorageLoading] = useState(false);

      const refreshStorageDiag = useCallback(async () => {
        setStorageLoading(true);
        try {
          if (navigator.storage && navigator.storage.estimate) {
            const est = await navigator.storage.estimate();
            const usedMB = Math.round((est.usage || 0) / (1024 * 1024));
            const quotaMB = Math.round((est.quota || 0) / (1024 * 1024));
            const pct = quotaMB > 0 ? Math.min(100, Math.round((usedMB / quotaMB) * 100)) : 0;
            setStorageDiag(prev => {
              if (prev.usedMB === usedMB && prev.quotaMB === quotaMB && prev.pct === pct && prev.available) return prev;
              return { usedMB, quotaMB, pct, available: true };
            });
          } else {
            setStorageDiag(prev => prev.available ? prev : { usedMB: 0, quotaMB: 0, pct: 0, available: false });
          }
          if (typeof loadTrashCount === 'function') {
            await loadTrashCount();
          }
        } catch (e) {
          console.warn('Storage estimate failed:', e);
        } finally {
          setStorageLoading(false);
        }
      }, [loadTrashCount]);

      useEffect(() => {
        if (activeTab === 'settings') {
          refreshStorageDiag();
        }
      }, [activeTab]);

      // --- Core Toast Helper (Defined before any usage) ---
      const toast = (msg, type = 'success', action = null) => {
        if (!msg) return;
        setToasts(prev => {
          if (prev.some(t => t.msg === msg)) return prev;
          const id = genId();
          setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), action ? 7500 : 3200);
          return [...prev.slice(-2), { id, msg, type, action }];
        });
      };

      // Unmask silent errors with immediate toast notification
      const setError = useCallback((msg) => {
        _setError(msg || '');
        if (msg && typeof msg === 'string' && msg.trim()) {
          const isErr = /error|fail|invalid|corrupt/i.test(msg);
          toast(msg, isErr ? 'error' : 'warning');
        }
      }, []);

      // Bind global references for outer helpers
      window.__setDownloadModal = setDownloadSuccessModal;
      window.__toast = toast;
      window.setEpubPackagingModal = setEpubPackagingModal;
      window.notifyModelChange = (fromModel, toModel, reason) => {
        const msg = `⚠️ Model switched: ${fromModel} → ${toModel} (${reason})`;
        toast(msg, 'warning');
        window.NativeBridge?.haptic?.('warning');
      };

      // --- Novel Health & QA Proofreader Handlers (§5.9 + §7.1 + §7.5) ---
      const runNovelHealthAudit = (novel, optionsOverride = {}) => window.NovelEnrichmentEngine?.Controller?.runAudit(novel, { qaCheckGaps, qaCheckCorrupt, qaCheckCjk, qaCheckAntiMtl, qaCheckLoops, qaCheckDuplicates, cjkLeakCheckEnabled, antiMtlGateEnabled, ...optionsOverride }, { setQaAuditResult, toast });
      const handleOpenNovelHealthModal = (item) => window.NovelEnrichmentEngine?.Controller?.openHealthModal(item, loadFullNovel, { setQaModalOpen, setQaAuditResult, setQaAuditNovelRef, setQaFilterCategory, toast });
      const handleOpenActiveQaModal = (context) => window.NovelEnrichmentEngine?.Controller?.openActiveQaModal(context || { translatedChapters, chapters, fileName, assembledText, inputText, activeNovelRecord, currentDocTitle }, { setQaModalOpen, setQaAuditResult, setQaAuditNovelRef, setQaFilterCategory, toast });

      const handleInspectChapterInReader = (iss) => {
        const targetNovel = qaAuditNovelRef;
        if (targetNovel && targetNovel.chapters && targetNovel.chapters.length > 0) {
          const chs = targetNovel.chapters;
          const isTrans = targetNovel.isTranslated || (targetNovel.title || '').includes('(Translated)') || chs.some(c => c && (c.translated || c.targetLang || c.content));
          const cleanCh = c => typeof c === 'string' ? c : (c.content || c.text || c.rawContent || '');
          const cleanedChs = chs.map((c, i) => ({
            title: (typeof c === 'object' && c.title) ? c.title : `Chapter ${i + 1}`,
            content: cleanCh(c)
          }));
          if (targetNovel.title) {
            setCurrentDocTitle(targetNovel.title);
            setFileName(targetNovel.title);
          }
          setActiveNovelRecord(targetNovel);
          if (isTrans) {
            setAssembledText(cleanedChs.map(c => `# ${c.title}\n\n${c.content}`).join('\n\n'));
            setTranslatedChapters(cleanedChs);
            if (targetNovel.originalChapters && targetNovel.originalChapters.length > 0) {
              const srcChs = targetNovel.originalChapters;
              setInputText(srcChs.map(c => `# ${c.title || ''}\n\n${cleanCh(c)}`).join('\n\n'));
              setChapters(srcChs.map((c, i) => ({ title: c.title || `Chapter ${i + 1}`, content: cleanCh(c) })));
            }
          } else {
            setChapters(cleanedChs);
            setInputText(cleanedChs.map(c => `# ${c.title}\n\n${c.content}`).join('\n\n'));
            setAssembledText(cleanedChs.map(c => `# ${c.title}\n\n${c.content}`).join('\n\n'));
            setTranslatedChapters(cleanedChs);
          }
        }
        setReaderChapterIdx(Math.max(0, iss?.chapterIdx || 0));
        setReaderOpen(true);
        setQaModalOpen(false);
      };

      useEffect(() => {
        window.openNovelHealthAudit = () => {
          handleOpenActiveQaModal();
        };
      }, [translatedChapters, chapters, assembledText, inputText, fileName, currentDocTitle, activeNovelRecord, qaCheckGaps, qaCheckCorrupt, qaCheckCjk, qaCheckAntiMtl, qaCheckLoops, qaCheckDuplicates, cjkLeakCheckEnabled, antiMtlGateEnabled]);

      // --- Translation Memory & Snapshots Handlers (§8.2 + §8.6) ---
      window.__translationMemoryEnabled = translationMemoryEnabled;

      const refreshTmStats = async () => {
        const engine = window.NovelEnrichmentEngine || NovelEnrichmentEngine;
        if (!engine) return;
        try {
          const stats = await engine.TM.refreshStats();
          if (stats) setTmStats(stats);
        } catch (e) {
          console.warn('[TM] Stats refresh warning:', e);
        }
      };

      const handleClearTm = () => window.NovelEnrichmentEngine?.Controller?.clearTm(refreshTmStats, toast, confirmAction);
      const handleExportTmx = () => window.NovelEnrichmentEngine?.Controller?.exportTmx(toast);
      const handleOpenDiffModal = (idx = 0, novel = null) => window.NovelEnrichmentEngine?.Controller?.openDiffModal({ chapterIdx: idx, novelOverride: novel, activeNovelRecord, fileName, translatedChapters, chapters, assembledText, inputText, geminiModel, callbacks: { toast, setDiffSnapshotsList, setSelectedDiffSnapId, setActiveDiffData, setDiffModalOpen } });
      const handleManualSnapshot = () => window.NovelEnrichmentEngine?.Controller?.manualSnapshot({ activeDiffData, translatedChapters, activeNovelRecord, chapters, assembledText, inputText, geminiModel, callbacks: { toast, setDiffSnapshotsList, setSelectedDiffSnapId } });
      const handleSelectDiffSnapshot = (snapId) => window.NovelEnrichmentEngine?.Controller?.selectDiffSnapshot({ snapId, activeDiffData, diffSnapshotsList, translatedChapters, activeNovelRecord, chapters, assembledText, inputText, callbacks: { setSelectedDiffSnapId, setActiveDiffData } });
      const handleRollbackDiffSnapshot = (snapId) => window.NovelEnrichmentEngine?.Controller?.rollbackDiffSnapshot({ snapId, translatedChapters, activeNovelRecord, loadFullNovelFn: loadFullNovel, saveNovelRecordFn: saveNovelRecord, callbacks: { toast, confirm: confirmAction, setTranslatedChapters, setAssembledText, setDiffModalOpen } });

      useEffect(() => {
        window.openDiffInspector = (chapterIdx = 0, novelObj = null) => handleOpenDiffModal(chapterIdx, novelObj);
        refreshTmStats();
      }, [translatedChapters, chapters, assembledText, inputText, fileName, activeNovelRecord, geminiModel]);

      // --- Source Plugins Handlers (§4.1) ---
      const handleOpenSourcePluginsModal = () => window.NovelEnrichmentEngine?.Controller?.openPlugins(pluginCatalog, { setSourcePluginsModalOpen, setIsCatalogLoading, setPluginCatalog, toast });
      const handleInstallPlugin = (item) => window.NovelEnrichmentEngine?.Controller?.installPlugin(item, { setInstallingPluginId, setPluginCatalogTick, toast });
      const handleUninstallPlugin = (id) => window.NovelEnrichmentEngine?.Controller?.uninstallPlugin(id, { setPluginCatalogTick, toast });
      const handleInstallCustomPluginUrl = (url) => window.NovelEnrichmentEngine?.Controller?.installCustomUrl(url, { setPluginCatalogTick, setCustomPluginUrl, toast });
      const handleSearchNovelsInPlugins = (q, src = 'all') => window.NovelEnrichmentEngine?.Controller?.searchPlugins(q, src, { setIsPluginNovelSearching, setPluginNovelSearchResults, setPluginNovelSearchSource, onSetWebImportUrl: setWebImportUrl, onProgress: setWebImportStatus, toast, onStartFetch: handleStartFetch });
      const handleCheckRezeroUpdates = () => window.NovelEnrichmentEngine?.Plugins?.checkRezeroUpdates({ webImportHistory, activeCrawlSession, chapters, activeNovelRecord, callbacks: { onSetWebImportUrl: setWebImportUrl, onProgress: setWebImportStatus, toast, onStartFetch: handleStartFetch } });

      // --- Cost & Time Estimator Handlers (§7.2) ---
      const handleOpenCostEstimator = () => window.NovelEnrichmentEngine?.Controller?.openCostEstimator({ chapters, inputText, glossaryTermCount, smartGlossary, genderLocks, setCostEstimatorData, setCostEstimatorModalOpen, toast });

      // --- AniList Metadata Enrichment Handlers (§7.4) ---
      const handleEnrichNovelMetadata = (novel) => window.NovelEnrichmentEngine?.Controller?.enrichMetadata(novel, { setWebImportHistory, setActiveNovelView, activeNovelView, toast, confirm: confirmAction });

      // --- Split Novel into Arcs Handler (§7.3) ---
      const handleSplitNovelIntoArcs = (novel) => window.NovelEnrichmentEngine?.Controller?.splitIntoArcs(novel, { loadFullNovel, setActiveTab, setStudioSubTab, toast, cleanBookTitle, cleanBookAuthor, generateEpubFromChapters, sanitizeFilename });

      // Update Handlers
      
      
      const testSingleKey = (prov, keyStr, keyId) => window.KeyManagerEngine?.Controller?.testSingleKey(prov, keyStr, keyId, geminiModel, setKeyHealth);
      const handleTestAllKeys = (prov) => window.KeyManagerEngine?.Controller?.testAllKeys(prov, apiKeysByProvider, geminiModel, setTestingKeys, setKeyHealth, toast);
      const handleBulkImportKeys = () => window.KeyManagerEngine?.Controller?.bulkImport(bulkKeyText, provider, { apiKeysByProvider, activeKeyIds, setApiKeysByProvider, setActiveKeyIds, setBulkKeyText, setBulkKeyModalOpen, toast, genId });
      const getReportSummaryText = (overrideStats = null) => window.KeyManagerEngine?.Controller?.formatReport({ stats: overrideStats || lastUsageStats, provider, geminiModel, deepseekModel, enableStreaming, enableThinking, strictModel, contextAware, concurrency, chunkSizePreset, smartGlossary, glossaryTermCount, assembledText, wordCount });
      const copyDiagnosticsReport = () => window.KeyManagerEngine?.Controller?.copyReport(getReportSummaryText(), toast);
      const copyLogsWithReport = () => window.KeyManagerEngine?.Controller?.copyLogs(getReportSummaryText(), toast);

      const checkForAppUpdate = async (isManual = false) => {
        if (window.NovelEnrichmentEngine?.AppUpdate?.checkForUpdate) {
          await window.NovelEnrichmentEngine.AppUpdate.checkForUpdate(VERSION, isManual, {
            toast,
            onUpdateAvailable: (update) => setAvailableUpdate(update),
            onUpToDate: () => setAvailableUpdate(null),
            onError: (err, manual) => {
              if (manual) toast('Failed to check for updates: ' + (err?.message || err), 'error');
            }
          });
        }
      };

      const handlePerformUpdate = async () => {
        if (window.NovelEnrichmentEngine?.AppUpdate?.installUpdate) {
          await window.NovelEnrichmentEngine.AppUpdate.installUpdate(availableUpdate, {
            toast,
            onStart: () => setIsUpdating(true),
            onComplete: () => setIsUpdating(false)
          });
        }
      };

      useEffect(() => {
        checkForAppUpdate(false);
      }, []);

      // --- Refs for Text Areas & Files ---
      // --- Refs for Text Areas & Files ---
      const inputRef = useRef(null);
      const outputRef = useRef(null);
      const instructionsRef = useRef(null);
      const glossaryRef = useRef(null);
      const fileInputRef = useRef(null);
      const epubRestoreInputRef = useRef(null);
      const glossaryFileRef = useRef(null);
      const backupFileInputRef = useRef(null);
      const abortRef = useRef(null);

      // --- Resizable Text Boxes Height State (Touch & Desktop) ---
      const [inputBoxHeight, setInputBoxHeight] = useState(() => parseInt(localStorage.getItem('inputBoxHeight'), 10) || 220);
      const [outputBoxHeight, setOutputBoxHeight] = useState(() => parseInt(localStorage.getItem('outputBoxHeight'), 10) || 250);
      const [instructionsBoxHeight, setInstructionsBoxHeight] = useState(() => parseInt(localStorage.getItem('instructionsBoxHeight'), 10) || 80);
      const [glossaryBoxHeight, setGlossaryBoxHeight] = useState(() => parseInt(localStorage.getItem('glossaryBoxHeight'), 10) || 140);

      const { handlePointerResizeStart, handleTouchResizeStart, setBoxPreset, toggleBoxExpand, renderBoxResizeBar } = (window.NavigationEngine || NavigationEngine).initBoxResizer({
        getHeights: () => ({
          input: inputBoxHeight,
          output: outputBoxHeight,
          instructions: instructionsBoxHeight,
          glossary: glossaryBoxHeight
        }),
        setHeight: (boxType, val) => {
          if (boxType === 'input') setInputBoxHeight(val);
          else if (boxType === 'output') setOutputBoxHeight(val);
          else if (boxType === 'instructions') setInstructionsBoxHeight(val);
          else if (boxType === 'glossary') setGlossaryBoxHeight(val);
        },
        refs: {
          input: inputRef,
          output: outputRef,
          instructions: instructionsRef,
          glossary: glossaryRef
        },
        h
      });

// (toast is defined above)

      // --- Effects ---
      useEffect(() => {
        const toastListener = (e) => {
          if (e.detail && e.detail.msg) {
            toast(e.detail.msg, e.detail.type || 'success');
          }
        };
        window.addEventListener('app-toast', toastListener);
        return () => window.removeEventListener('app-toast', toastListener);
      }, []);

      // Deep Linking & URL Scheme Router (§10.8)
      useEffect(() => {
        return (window.NavigationEngine || NavigationEngine).initDeepLinkRouter({
          loadFullNovel,
          onRouteNovel: (target, cleanedChs, targetIdx) => {
            setChapters(cleanedChs);
            setReaderChapterIdx(targetIdx);
            setReaderOpen(true);
            toast(`🔗 Deep link routed to "${target.title}" (Ch ${targetIdx + 1})`, 'success');
          }
        });
      }, []);

      useEffect(() => {
        localStorage.setItem('activeTab', activeTab);
        window.setActiveAppTab = (tab, subTab) => {
          if (tab) { setActiveTab(tab); localStorage.setItem('activeTab', tab); }
          if (subTab) { setStudioSubTab(subTab); localStorage.setItem('studioSubTab', subTab); }
        };
        if (activeTab === 'studio') {
          setTimeout(() => {
            if (studioSubTab === 'edit' && typeof window.initEpubEditor === 'function') {
              try { window.initEpubEditor(); } catch (e) { console.warn('Editor init error:', e); }
            }
            if (studioSubTab === 'split' && typeof window.initSplitter === 'function') {
              try { window.initSplitter(); } catch (e) { console.warn('Splitter init error:', e); }
            }
            if (studioSubTab === 'merge' && typeof window.initMerger === 'function') {
              try { window.initMerger(); } catch (e) { console.warn('Merger init error:', e); }
            }
          }, 40);
        }
      }, [activeTab, studioSubTab]);

      // ── Centralized Android Hardware & Edge-Swipe Back Button Handler ──
      useEffect(() => {
        return (window.NavigationEngine || NavigationEngine).initBackButtonHandler({
          closeActiveModal: () => {
            if (ongoingEpubModal && ongoingEpubModal.isOpen) {
              if (!ongoingEpubModal.isFetching) setOngoingEpubModal(null);
              return true;
            }
            if (readerOpen) {
              setReaderOpen(false);
              return true;
            }
            if (activeNovelView) {
              setActiveNovelView(null);
              return true;
            }
            if (audioDownloadModal) {
              setAudioDownloadModal(null);
              return true;
            }
            if (costEstimatorModalOpen) {
              setCostEstimatorModalOpen(false);
              return true;
            }
            if (epubPackagingModal) {
              setEpubPackagingModal(null);
              return true;
            }
            if (typeof renameModalNovel !== 'undefined' && renameModalNovel) {
              setRenameModalNovel(null);
              return true;
            }
            return false;
          },
          popTab: () => {
            if (activeTab === 'studio' || activeTab === 'web_importer' || activeTab === 'settings') {
              setActiveTab('history');
              localStorage.setItem('activeTab', 'history');
              return true;
            }
            return false;
          },
          toast
        });
      }, [ongoingEpubModal, readerOpen, activeNovelView, audioDownloadModal, costEstimatorModalOpen, epubPackagingModal, typeof renameModalNovel !== 'undefined' ? renameModalNovel : null, activeTab]);

      useEffect(() => { document.documentElement.classList.add('dark'); localStorage.setItem('darkMode', 'true'); }, []);
      useEffect(() => { localStorage.setItem('enableStreaming', String(enableStreaming)) }, [enableStreaming]);
      useEffect(() => { localStorage.setItem('translationProvider', provider) }, [provider]);
      useEffect(() => { localStorage.setItem('concurrency', String(concurrency)) }, [concurrency]);
      useEffect(() => { localStorage.setItem('contextAware', String(contextAware)) }, [contextAware]);
      useEffect(() => { localStorage.setItem('chunkSizePreset', chunkSizePreset) }, [chunkSizePreset]);

      useEffect(() => {
        if (isTranslating || isTranslationPaused) return;
        if (!inputText && !currentFileHash) {
          if (!savedTranslationSession) {
            setActiveSession(null);
            activeSessionRef.current = null;
          }
          return;
        }
        const id = inputText ? generateJobId(inputText) : currentFileHash;
        const saved = localStorage.getItem(id);
        if (saved) {
          try {
            const parsed = JSON.parse(saved);
            activeSessionRef.current = parsed;
            setActiveSession(parsed);
            if (parsed.result) {
              setAssembledText(parsed.result);
            } else if (parsed.allParts && Array.isArray(parsed.allParts)) {
              setAssembledText(parsed.allParts.filter(Boolean).join('\n\n\n').trim());
            }
            if (parsed.newChapters && Array.isArray(parsed.newChapters)) {
              setTranslatedChapters(parsed.newChapters);
            }
          } catch(e) {}
        } else {
          if (!savedTranslationSession) {
            setActiveSession(null);
            activeSessionRef.current = null;
          }
        }
      }, [inputText, currentFileHash, provider, contextAware]);

      useEffect(() => {
        const localG = JSON.parse(localStorage.getItem('savedGlossaries') || '[]');
        setSavedGlossaries(localG);
        const localH = JSON.parse(localStorage.getItem('translationHistory') || '[]');
        setHistory(localH);
        
        const dg = localStorage.getItem('defaultGlossaryName');
        if (dg) {
          setDefaultGlossaryName(dg);
        }

        // Async IndexedDB hydration & auto-migration
        (async () => {
          try {
            const dbHist = await dbGetAll('history');
            if (dbHist && dbHist.length > 0) {
              const sorted = dbHist.sort((a, b) => new Date(b.ts) - new Date(a.ts));
              setHistory(sorted);
            } else if (localH && localH.length > 0) {
              for (const item of localH) {
                await dbPut('history', item);
              }
            }

            const dbGloss = await dbGetAll('glossaries');
            const currentLocalG = JSON.parse(localStorage.getItem('savedGlossaries') || '[]');
            const gMap = new Map();
            (dbGloss || []).forEach(g => { if (g && g.name) gMap.set(g.name, g); });
            currentLocalG.forEach(g => { if (g && g.name) gMap.set(g.name, g); });
            const mergedG = Array.from(gMap.values());
            if (mergedG.length > 0) {
              setSavedGlossaries(mergedG);
              localStorage.setItem('savedGlossaries', JSON.stringify(mergedG));
              for (const gItem of mergedG) {
                await dbPut('glossaries', gItem);
              }
            }
          } catch (e) {
            console.warn('IndexedDB initial sync note:', e);
          }
        })();

        initAppWorker();
        if (typeof window.pdfjsLib !== 'undefined') window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js';
      }, []);

      useEffect(() => {
        if (geminiKey) {
          fetchGeminiModels(geminiKey).then(m => {
            setAvailableModels(m);
            if (m.length && !m.find(x => x.id === geminiModel) && !useCustomModel) {
              const preferred = m.find(x => x.id.includes('3.7-flash')) || m.find(x => x.id.includes('3.6-flash')) || m.find(x => x.id.includes('3.5-flash')) || m.find(x => x.id.includes('3.1-flash-lite')) || m[0];
              if (preferred) setGeminiModel(preferred.id);
            }
          }).catch(() => { });
        }
      }, [apiKeysByProvider.gemini, activeKeyIds.gemini]);

      // Keyboard shortcuts
      useEffect(() => {
        const handler = e => {
          if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
            e.preventDefault();
            if (!isTranslating) handleStartTranslation();
          }
          if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'C') {
            e.preventDefault();
            if (assembledText) copyText(assembledText).then(() => toast('Copied!')).catch(() => { });
          }
          if ((e.ctrlKey || e.metaKey) && e.altKey && (e.key === 'r' || e.key === 'R')) {
            e.preventDefault();
            const currentDisplay = assembledText || (translatedChapters || []).filter(Boolean).map(c => `${c?.title || ''}\n\n${c?.content || c?.text || ''}`).join('\n\n\n').trim();
            if (currentDisplay) setReaderOpen(prev => !prev);
          }
          if (e.key === 'Escape') {
            if (readerOpen) setReaderOpen(false);
            if (showModal) setShowModal(false);
          }
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
      }, [isTranslating, assembledText, translatedChapters, readerOpen, showModal]);

      // --- API Key Handlers ---
      // (legacy single-key handlers removed — multi-key profiles replace them)

      // --- Profile/Glossary Handlers ---
      const handleSaveGlossary = (targetName = null, customContent = null) => {
        let name = (targetName || newGlossaryName || activeGlossaryId || '').trim();
        if (!name) {
          const prompted = prompt('Enter a name for this glossary profile:');
          if (!prompted || !prompted.trim()) return;
          name = prompted.trim();
        }
        const contentToSave = customContent !== null ? customContent : terminology;
        return window.GlossaryManagerEngine?.Profiles?.save(name, contentToSave, customInstructions, savedGlossaries, { setSavedGlossaries, setActiveGlossaryId, setTerminology, setNewGlossaryName, setError, toast, dbPut });
      };

      const handleLoadGlossary = (g) => {
        setTerminology(g.content || '');
        setCustomInstructions(g.instructions || '');
        setActiveGlossaryId(g.name);
        localStorage.setItem('activeGlossaryId', g.name);
        localStorage.setItem('terminology', g.content || '');
        localStorage.setItem('customInstructions', g.instructions || '');
        toast(`Loaded "${g.name}"`);
      };

      const checkAndApplyNovelGlossary = (novelRecord) => {
        if (!novelRecord) return;
        if (novelRecord.glossaryProfile) {
          const match = savedGlossaries.find(g => g.name === novelRecord.glossaryProfile);
          if (match) return handleLoadGlossary(match);
        }
        if (novelRecord.glossary && (!terminology || !terminology.trim())) {
          setTerminology(novelRecord.glossary);
          localStorage.setItem('terminology', novelRecord.glossary);
          const profName = novelRecord.glossaryProfile || `${novelRecord.title || 'Novel'} Glossary`;
          setActiveGlossaryId(profName);
          localStorage.setItem('activeGlossaryId', profName);
          toast(`Loaded bound glossary for "${novelRecord.title || 'Novel'}"!`, 'info');
        }
      };

      const handleUnloadGlossary = () => {
        setTerminology('');
        setActiveGlossaryId(null);
        localStorage.removeItem('terminology');
        localStorage.removeItem('activeGlossaryId');
        toast('Profile unloaded and glossary text cleared.', 'info');
      };

      const handleDeleteGlossary = (n) => window.GlossaryManagerEngine?.Profiles?.delete(n, savedGlossaries, activeGlossaryId, defaultGlossaryName, { setSavedGlossaries, setActiveGlossaryId, setDefaultGlossaryName, setTerminology, toast, confirmAction, dbDelete });
      const handleUpdateGlossary = (n) => window.GlossaryManagerEngine?.Profiles?.save(n, terminology, customInstructions, savedGlossaries, { setSavedGlossaries, setActiveGlossaryId, setError, toast: () => toast(`Saved changes to "${n}"!`), dbPut });
      const handleRenameGlossary = (oldName) => {
        const newName = window.prompt(`Enter new name for profile "${oldName}":`, oldName);
        if (!newName || !newName.trim() || newName.trim() === oldName) return;
        return window.GlossaryManagerEngine?.Profiles?.rename(oldName, newName, savedGlossaries, activeGlossaryId, defaultGlossaryName, { setSavedGlossaries, setActiveGlossaryId, setDefaultGlossaryName, setError, toast, dbPut, dbDelete });
      };

      const handleUnlinkGlossary = () => {
        setActiveGlossaryId(null);
        localStorage.removeItem('activeGlossaryId');
        toast('Unlinked active profile.', 'info');
      };

      const setDefaultGloss = () => { if (!activeGlossaryId) return setError('Load a profile first.'); localStorage.setItem('defaultGlossaryName', activeGlossaryId); setDefaultGlossaryName(activeGlossaryId); toast(`"${activeGlossaryId}" set as default!`) };
      const clearDefaultGloss = () => { confirmAction('Clear default profile?', () => { localStorage.removeItem('defaultGlossaryName'); setDefaultGlossaryName(null); toast('Default cleared.', 'info') }) };
      const exportGlossaries = () => window.GlossaryManagerEngine?.Profiles?.exportAll(savedGlossaries, toast);
      const importGlossaries = (e) => {
        const f = e?.target?.files?.[0];
        if (!f) return;
        f.text().then(txt => window.GlossaryManagerEngine?.Profiles?.import(txt, savedGlossaries, { setSavedGlossaries, setError, toast })).catch(err => { setError('Invalid glossary file: ' + err.message); toast('Invalid glossary file: ' + err.message, 'error'); }).finally(() => { if (e.target) e.target.value = ''; });
      };
      const handleGlossaryFile = async (e) => {
        const f = e?.target?.files?.[0];
        if (!f) return;
        try {
          const txt = await f.text();
          if (!txt || !txt.trim()) throw new Error('Selected glossary file is empty.');
          setTerminology(txt);
          localStorage.setItem('terminology', txt);
          setNewGlossaryName(f.name.replace(/\.[^.]+$/, ''));
          toast(`Glossary loaded from ${f.name}`, 'success');
        } catch (err) {
          setError('Failed to read file: ' + err.message);
          toast('Failed to read file: ' + err.message, 'error');
        }
        e.target.value = '';
      };

      const applyGlossaryPreset = (type) => window.GlossaryManagerEngine?.Profiles?.applyPreset(type, terminology, customInstructions, { setTerminology, setCustomInstructions, toast });
      const formatGlossaryContent = () => {
        if (!terminology.trim()) { toast('Glossary is empty.', 'warning'); return setError('Glossary is empty.'); }
        setTerminology((window.GlossaryManagerEngine || GlossaryManagerEngine).formatGlossaryContent(terminology));
        toast('Glossary formatted cleanly!', 'success');
      };
      const exportGlossaryTxt = () => window.GlossaryManagerEngine?.Profiles?.exportTxt(terminology, activeGlossaryId, toast, setError);
      const copyAiGlossaryPrompt = () => window.GlossaryManagerEngine?.Profiles?.copyAiPrompt(toast);
      const handleAiOptimizeGlossary = () => window.GlossaryManagerEngine?.Controller?.aiOptimize({ terminology, provider, getActiveApiKey, geminiModel, customModel, useCustomModel, customDeepseekModel, useCustomDeepseekModel, splitGlossaryIntoChunks, setTerminology, setIsOptimizingGlossary, setError, toast, fetchRetry, telemetryLog: window.telemetryLog });

      // --- AI Auto-Glossary & Character Extractor Engine ---
      const escapeRegExp = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

      const callAiAnalysis = async (prompt, systemInstruction = '', modelOverride = null, providerOverride = null) => {
        const controller = window.GlossaryManagerEngine?.Controller || GlossaryManagerEngine?.Controller;
        const fn = controller?.callAiAnalysis || (window.GlossaryManagerEngine || GlossaryManagerEngine)?.callAiAnalysis;
        return await fn(prompt, systemInstruction, {
          modelOverride,
          providerOverride,
          customDeepseekModel,
          useCustomDeepseekModel,
          customModel,
          useCustomModel,
          geminiModel,
          fetchRetry
        });
      };

      const handleOpenAutoGlossary = (targetNovel = null) => {
        setAutoGlossaryTargetNovel(targetNovel);
        const targetChs = targetNovel?.chapters || targetNovel?.rawChapters || chapters || [];
        const maxCh = (targetChs && targetChs.length > 0) ? targetChs.length : 1;
        setAutoGlossaryChapterCount(Math.min(5, maxCh));
        setExtractedTerms([]);
        setAutoGlossaryModalOpen(true);
      };

      const handleExtractGlossary = async () => {
        setIsExtractingGlossary(true);
        const controller = window.GlossaryManagerEngine?.Controller || GlossaryManagerEngine?.Controller;
        const extractFn = controller?.extractGlossary || (window.GlossaryManagerEngine || GlossaryManagerEngine)?.extractGlossaryWorkflow;
        await extractFn({
          targetNovel: autoGlossaryTargetNovel,
          chapters,
          chapterCount: autoGlossaryChapterCount,
          inputText,
          options: {
            provider,
            geminiModel,
            customModel,
            useCustomModel,
            customDeepseekModel,
            useCustomDeepseekModel,
            fetchRetry
          },
          callbacks: {
            onStart: (sampleText) => {
              window.telemetryLog?.('AUTO_GLOSSARY', `Started AI glossary extraction with ${sampleText.length} chars of novel text sample.`);
            },
            onSuccess: (parsed) => {
              if (!parsed || parsed.length === 0) {
                toast('No terms identified. Try increasing chapter count or check chapter content.', 'info');
                window.telemetryLog?.('AUTO_GLOSSARY', 'No terms identified from novel sample.');
              } else {
                setExtractedTerms(parsed);
                toast(`Extracted ${parsed.length} terms from novel!`, 'success');
                window.telemetryLog?.('AUTO_GLOSSARY', `Successfully extracted ${parsed.length} terms from novel!`, { termCount: parsed.length });
                try { window.NativeBridge?.showCompletionNotification?.('AI Glossary Extracted! ⚡', `Discovered ${parsed.length} character names and lore terms.`); } catch(e) {}
              }
            },
            onError: (err) => {
              console.error('Auto-glossary extraction error:', err);
              window.telemetryLog?.('AUTO_GLOSSARY', `Extraction failed: ${err.message}`, null, 'error');
              toast(err.message.includes('Please load a novel') ? err.message : 'Extraction failed: ' + err.message, err.message.includes('Please load a novel') ? 'warning' : 'error');
            }
          }
        });
        setIsExtractingGlossary(false);
      };

      const handleApplyExtractedTerms = async (asNewProfile = false) => {
        const selected = extractedTerms.filter(t => t.checked);
        if (selected.length === 0) return toast('No terms selected', 'warning');

        const controller = window.GlossaryManagerEngine?.Controller || GlossaryManagerEngine?.Controller;
        const applyFn = controller?.applyExtractedTerms || (window.GlossaryManagerEngine || GlossaryManagerEngine)?.applyExtractedTermsWorkflow;
        await applyFn({
          selected,
          asNewProfile,
          currentTerminology: terminology,
          genderLocks,
          targetNovel: autoGlossaryTargetNovel,
          activeNovelRecord,
          chapters,
          savedGlossaries,
          callbacks: {
            onSaveProfile: async (name, structuredGlossary) => {
              await handleSaveGlossary(name, structuredGlossary);
            },
            onComplete: ({ updatedLocks, updatedTerminology, newProfileName, autoLockedCount }) => {
              if (autoLockedCount > 0) {
                setGenderLocks(updatedLocks);
                const lockedList = selected
                  .filter(t => t.gender || (/\b(?:female|f)\b/i.test(t.category)) || (/\b(?:male|m)\b/i.test(t.category)))
                  .map(t => `${t.trans || t.orig} [${(t.gender || (/\b(?:female|f)\b/i.test(t.category) ? 'female' : 'male')).toUpperCase()}]`);
                window.telemetryLog?.('GENDER_LOCK', `Auto-locked ${autoLockedCount} character genders from extracted terms!`, {
                  autoLockedCount,
                  lockedCharacters: lockedList,
                  totalActiveLocks: Object.keys(updatedLocks).length
                });
              }

              if (asNewProfile && newProfileName) {
                setAutoGlossaryModalOpen(false);
                setAutoGlossaryTargetNovel(null);
                window.telemetryLog?.('AUTO_GLOSSARY', `Saved ${selected.length} terms as profile "${newProfileName}".`);
                toast(`Saved ${selected.length} terms as profile "${newProfileName}"!`, 'success');
              } else {
                setTerminology(updatedTerminology);
                setAutoGlossaryModalOpen(false);
                setAutoGlossaryTargetNovel(null);
                window.telemetryLog?.('AUTO_GLOSSARY', `Applied ${selected.length} terms to active glossary.`);
                toast(`Applied ${selected.length} terms to active glossary!`, 'success');
              }
            }
          }
        });
      };

      // --- Feature 4: Name Consistency Verifier Engine ---
      const handleRunConsistencyCheck = () => {
        const controller = window.GlossaryManagerEngine?.Controller || GlossaryManagerEngine?.Controller;
        setIsAuditingConsistency(true);
        const checkFn = controller?.runConsistencyCheck || (window.GlossaryManagerEngine || GlossaryManagerEngine)?.runConsistencyCheckWorkflow;
        const results = checkFn({
          terminology,
          translatedChapters,
          chapters,
          assembledText,
          inputText,
          callbacks: {
            onNoPairs: () => {
              toast('No glossary pairs found in active glossary. Use format "Original -> Translation" or "Original = Translation".', 'warning');
            }
          }
        });
        setIsAuditingConsistency(false);
        if (results === null) return;
        setConsistencyAuditResults(results);
        setConsistencyModalOpen(true);
      };

      const handleBatchFixDrift = (foundWord, targetWord) => {
        if (!foundWord || !targetWord) return;
        const controller = window.GlossaryManagerEngine?.Controller || GlossaryManagerEngine?.Controller;
        const fixFn = controller?.batchFixDrift || (window.GlossaryManagerEngine || GlossaryManagerEngine)?.batchFixDriftWorkflow;
        const { updatedChapters, updatedAssembledText, replacedCount } = fixFn({
          foundWord, targetWord, translatedChapters, assembledText
        });
        if (translatedChapters && translatedChapters.length > 0) setTranslatedChapters(updatedChapters);
        if (assembledText) setAssembledText(updatedAssembledText);

        toast(`Replaced ${replacedCount} occurrences of "${foundWord}" with "${targetWord}"!`, 'success');
        try { window.NativeBridge?.showCompletionNotification?.('Name Drift Fixed! 🔍', `Replaced ${replacedCount} occurrences of "${foundWord}" with "${targetWord}".`); } catch(e) {}
        handleRunConsistencyCheck();
      };

      // --- Full App Backup & Restore & WebDAV Cloud Sync (Delegated to BackupEngine.Controller) ---
      const getBackupSetters = () => (window.BackupEngine?.Controller || BackupEngine?.Controller)?.buildBackupSetters({
        setSavedGlossaries, setTerminology, setActiveGlossaryId, setHistory, setCustomInstructions,
        setDefaultGlossaryName, setSmartGlossary, setEnableGlossary, setProvider, setGeminiModel,
        setDeepseekModel, setOpenaiModel, setClaudeModel, setConcurrency, setContextAware,
        setChunkSizePreset, setEnableThinking, setStrictModel, setEnableStreaming, setCustomModel,
        setUseCustomModel, setCustomDeepseekModel, setUseCustomDeepseekModel, setEpubDropCaps,
        setEpubSmartQuotes, setEpubCleanWebArtifacts, setEpubFontTheme, setEpubJustifyText,
        setEpubIncludeImages, setScrapeImages, setReaderTheme, setReaderFont, setReaderFontSize,
        setWebImportHistory, setApiKeysByProvider, setActiveKeyIds, setLibreUrl
      }) || {};

      const getBackupAppState = () => (window.BackupEngine?.Controller || BackupEngine?.Controller)?.buildBackupState({
        VERSION, savedGlossaries, terminology, customInstructions, history, provider,
        geminiModel, deepseekModel, openaiModel, claudeModel, concurrency, contextAware,
        chunkSizePreset, enableThinking, strictModel, enableStreaming, enableGlossary,
        customModel, useCustomModel, customDeepseekModel, useCustomDeepseekModel,
        defaultGlossaryName, smartGlossary, epubDropCaps, epubSmartQuotes, epubCleanWebArtifacts,
        epubFontTheme, epubJustifyText, epubIncludeImages, scrapeImages, readerTheme,
        readerFont, readerFontSize, apiKeysByProvider, activeKeyIds, libreUrl
      }) || {};

      const generateBackupPayload = async (shouldIncludeKeys = false) => {
        const engine = window.BackupEngine;
        if (!engine) throw new Error('Backup Engine is loading...');
        return await engine.generatePayload({
          shouldIncludeKeys,
          version: VERSION,
          state: getBackupAppState()
        });
      };

      const exportFullBackup = async (forceIncludeKeys = null) => {
        try {
          const shouldIncludeKeys = forceIncludeKeys !== null ? forceIncludeKeys : includeApiKeysInBackup;
          const engine = window.BackupEngine;
          const res = await engine.exportBackup({
            shouldIncludeKeys,
            version: VERSION,
            state: getBackupAppState()
          });
          const details = [];
          if (res.novelCount > 0) details.push(`${res.novelCount} novel(s)`);
          if (res.historyCount > 0) details.push(`${res.historyCount} history item(s)`);
          details.push('all settings');
          if (res.hasKeys) details.push('keys');
          toast(`Full backup (${details.join(', ')}) saved to Downloads!`, 'success');
        } catch(e) {
          console.error('Full backup error:', e);
          toast('Backup save error: ' + e.message, 'error');
        }
      };

      const testWebDavConnection = () => window.BackupEngine?.Controller?.performWebDav('test', { webdavUrl, webdavUser, webdavPass }, { setTesting: setWebdavTesting, toast });
      const backupToWebDav = () => window.BackupEngine?.Controller?.performWebDav('backup', { webdavUrl, webdavPath, webdavUser, webdavPass, version: VERSION, state: getBackupAppState() }, { setSyncing: setWebdavSyncing, setLastSync: setWebdavLastSync, toast });
      const restoreFromWebDav = () => window.BackupEngine?.Controller?.performWebDav('restore', { webdavUrl, webdavPath, webdavUser, webdavPass, setters: getBackupSetters() }, { setSyncing: setWebdavSyncing, confirm: (msg) => confirm(msg), toast });
      const testGoogleDriveConnection = () => window.BackupEngine?.Controller?.performGoogleDrive('test', {}, { setTesting: setGdriveTesting, setProfile: setGdriveUser, setConnected: setGdriveConnected, toast });
      const backupToGoogleDrive = () => window.BackupEngine?.Controller?.performGoogleDrive('backup', { includeKeys: includeApiKeysInBackup, version: VERSION, state: getBackupAppState() }, { setSyncing: setGdriveSyncing, setLastSync: setGdriveLastSync, toast });
      const restoreFromGoogleDrive = () => window.BackupEngine?.Controller?.performGoogleDrive('restore', { setters: getBackupSetters() }, { setSyncing: setGdriveSyncing, confirm: (msg) => confirm(msg), toast });
      const connectGoogleDrive = () => window.BackupEngine?.Controller?.performGoogleDrive('connect', {}, { setConfigModalOpen: setGdriveConfigModalOpen, setConnected: setGdriveConnected, setProfile: setGdriveUser, toast });

      const backupToGoogleDriveFile = async () => {
        try {
          const { backup, novelLibrary, fullHistory } = await generateBackupPayload(includeApiKeysInBackup);
          const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
          await saveUniversalBlob(blob, 'gemini_translator_backup.json', 'application/json', true);
          toast(`📁 Backup exported! (${novelLibrary.length} novels, ${fullHistory.length} history items)`, 'success');
        } catch (e) {
          toast('Backup error: ' + e.message, 'error');
        }
      };

      const disconnectGoogleDrive = () => window.BackupEngine?.Controller?.performGoogleDrive('disconnect', {}, { setConnected: setGdriveConnected, setProfile: setGdriveUser, toast });

      const applyRestoredData = async (data) => {
        const engine = window.BackupEngine;
        if (!engine) throw new Error('Backup Engine not loaded.');
        const res = await engine.applyRestoredData(data, getBackupSetters());
        if (res.isGlossaryOnly) {
          toast(`Imported ${res.count} glossaries!`);
        } else {
          toast(`Restored ${res.summary} successfully!`);
        }
        return res;
      };

      const importFullBackup = (e) => window.BackupEngine?.Controller?.performFullBackup('file', { event: e, setters: getBackupSetters() }, { setError, toast });
      const pasteAndRestoreBackup = () => window.BackupEngine?.Controller?.performFullBackup('paste', { setters: getBackupSetters() }, { setError, toast });

      // --- Web Novel Crawl Pause, Cancel & Resume Controls (Delegated to WebNovelCrawlerEngine.Controller) ---
      const handleStartFetch = (isResume = false, resumeSessionData = null, autoExportEpub = false, overrideUrl = null) => window.WebNovelCrawlerEngine?.Controller?.startFetch({ overrideUrl, isResume, resumeSessionData, autoExportEpub, options: { activeCrawlSession, webImportUrl, scrapeImages, getNovelFolderOptions, getCustomTitle, cleanBookTitle, cleanBookAuthor, getEpubOptions, getEpubFileName, generateEpubFromChapters, saveUniversalBlob }, callbacks: { setIsFetchingUrl, setIsFetchingPaused, setWebImportStatus, setWebImportError, setActiveCrawlSession, setWebImportData, saveNovelToHistory, toast, exportCleanLnoriEpub } });
      const handlePauseFetch = () => window.WebNovelCrawlerEngine?.Controller?.pauseFetch({ setIsFetchingPaused, setIsFetchingUrl, setWebImportStatus, toast });
      const handleCancelFetch = () => window.WebNovelCrawlerEngine?.Controller?.cancelFetch({ setIsFetchingPaused, setIsFetchingUrl, setWebImportStatus, toast });
      const exportCleanLnoriEpub = (novelData) => (window.WebNovelCrawlerEngine?.exportCleanLnoriEpub ? window.WebNovelCrawlerEngine.exportCleanLnoriEpub(novelData, { cleanBookTitle, cleanBookAuthor, getEpubOptions, getEpubFileName, getNovelFolderOptions, saveUniversalBlob, generateEpubFromChapters }, { setEpubPackagingModal, toast }) : toast('Crawler Engine export not available.', 'error'));
      const handleLnoriDirectEpubDownload = (targetUrl) => window.WebNovelCrawlerEngine?.Controller?.directEpubDownload({ targetUrl, webImportUrl, currentData: (activeCrawlSession?.chapters?.length >= (webImportData?.chapters?.length || 0)) ? activeCrawlSession : (webImportData || activeCrawlSession), history: webImportHistory, options: { activeCrawlSession, webImportData, webImportHistory, loadFullNovel, cleanBookTitle, cleanBookAuthor, getEpubOptions, getEpubFileName, getNovelFolderOptions, saveUniversalBlob, generateEpubFromChapters }, callbacks: { setWebImportUrl, setScrapeImages, setEpubIncludeImages, setIsFetchingUrl, setIsFetchingPaused, setWebImportStatus, setWebImportError, setActiveCrawlSession, setWebImportData, saveNovelToHistory, toast, exportCleanLnoriEpub, handleStartFetch } });
      const resumeCrawlFromSession = (sessionOrNovel) => window.WebNovelCrawlerEngine?.Controller?.resumeCrawl(sessionOrNovel, { loadFullNovel, activeCrawlSession, webImportUrl, scrapeImages, getNovelFolderOptions, getCustomTitle, cleanBookTitle, cleanBookAuthor, getEpubOptions, getEpubFileName, generateEpubFromChapters, saveUniversalBlob }, { setActiveTab, setWebImportUrl, setActiveCrawlSession, setWebImportData, setIsFetchingUrl, setIsFetchingPaused, setWebImportStatus, setWebImportError, saveNovelToHistory, toast, exportCleanLnoriEpub, handleStartFetch });
      const dismissCrawlSession = () => window.WebNovelCrawlerEngine?.Controller?.dismissCrawl({ setActiveCrawlSession, setIsFetchingPaused, toast });

      // --- Modal ---
      const confirmAction = (msg, cb) => { setModalMessage(msg); setModalCallback(() => () => { cb(); setShowModal(false) }); setShowModal(true) };

      // --- History (IndexedDB Unlimited Storage + LocalStorage Fallback) ---
      const addToHistory = async (src, tgt, prov, input, output, stats = null) => {
        const engine = window.HistoryEngine || HistoryEngine;
        if (engine?.addToHistory) {
          return engine.addToHistory({
            src,
            tgt,
            prov,
            input,
            output,
            stats,
            chapters,
            history,
            callbacks: {
              saveNovelToHistory,
              onHistoryUpdated: (newHistory) => setHistory(newHistory)
            }
          });
        }
      };

      const loadFromHistory = async (entry) => {
        const engine = window.HistoryEngine || HistoryEngine;
        if (engine?.loadFromHistory) {
          return engine.loadFromHistory(entry, {
            onLoaded: ({ inputText, assembledText, srcLang, tgtLang, chapters: loadedChapters }) => {
              setInputText(inputText);
              setAssembledText(assembledText);
              setSrcLang(srcLang);
              setTgtLang(tgtLang);
              if (loadedChapters && loadedChapters.length > 1) {
                setChapters(loadedChapters);
              }
              setActiveTab('text');
              toast('Loaded translation from history!');
            }
          });
        }
      };

      const clearHistory = () => {
        confirmAction('Clear all translation history?', async () => {
          const engine = window.HistoryEngine || HistoryEngine;
          if (engine?.clearHistory) {
            await engine.clearHistory({
              onCleared: () => {
                setHistory([]);
                toast('Translation history cleared.', 'info');
              }
            });
          }
        });
      };

      const deleteHistoryItem = async (id) => {
        const engine = window.HistoryEngine || HistoryEngine;
        if (engine?.deleteHistoryItem) {
          await engine.deleteHistoryItem(id, history, {
            onDeleted: (updatedList) => {
              setHistory(updatedList);
            }
          });
        }
      };

      const exportHistoryJSON = async () => {
        const engine = window.HistoryEngine || HistoryEngine;
        if (engine?.exportHistoryJSON) {
          await engine.exportHistoryJSON(history, VERSION, {
            onSuccess: (res) => toast(`Exported ${res.count} history records (IndexedDB)!`, 'success'),
            onWarning: (msg) => toast(msg, 'warning'),
            onError: (err) => toast('Export history error: ' + (err?.message || err), 'error')
          });
        }
      };

      const exportSingleHistoryItem = async (entry) => {
        const engine = window.HistoryEngine || HistoryEngine;
        if (engine?.exportSingleHistoryItem) {
          await engine.exportSingleHistoryItem(entry, {
            onSuccess: () => toast('History entry exported as .txt file!', 'success'),
            onError: (err) => toast('Export item error: ' + (err?.message || err), 'error')
          });
        }
      };

      // --- Translation ---
      const getTranslateOpts = (signal) => (window.TranslationLoopEngine?.Controller || TranslationLoopEngine?.Controller)?.buildTranslateOpts({
        provider,
        deepseekKey,
        geminiKey,
        deeplKey,
        rotateApiKey,
        useCustomDeepseekModel,
        customDeepseekModel,
        deepseekModel,
        useCustomModel,
        customModel,
        geminiModel,
        srcLang,
        tgtLang,
        terminology,
        customInstructions,
        genderLocks,
        activeNovelView,
        smartGlossary,
        epubSmartQuotes,
        epubCleanWebArtifacts,
        enableThinking,
        strictModel,
        signal,
        libreUrl
      });

      // --- HTML DOM Node Extraction Helper (Delegated to TranslationLoopEngine) ---
      const extractTextNodes = (element) => {
        const engine = window.TranslationLoopEngine || TranslationLoopEngine;
        return engine ? engine.extractTextNodes(element) : [];
      };

      const translationCtx = {
        inputText, provider, enableStreaming, enableThinking, strictModel, contextAware, concurrency,
        chunkSizePreset, smartGlossary, enableGlossary, terminology, glossaryTermCount,
        customInstructions, antiMtlGateEnabled, snapshotsEnabled, fileName, activeNovelRecord,
        setActiveNovelRecord, activeCrawlSession, webImportHistory, webImportData,
        webImportUrl: typeof webImportUrl !== 'undefined' ? webImportUrl : '',
        currentIsEpub, setCurrentIsEpub, currentOriginalZip, setCurrentOriginalZip, currentFileHash,
        currentDocCover, setCurrentDocCover, currentDocTitle, apiKeysByProvider, model,
        geminiModel, customModel, useCustomModel, deepseekModel, customDeepseekModel,
        useCustomDeepseekModel, deepseekKey, geminiKey, deeplKey, rotateApiKey,
        translationMemoryEnabled, srcLang, tgtLang, genderLocks, activeNovelView,
        epubSmartQuotes, epubCleanWebArtifacts, libreUrl, abortRef, isPausingRef,
        activeSessionRef, activeSession, setIsTranslating, setProgress, setProgressLabel,
        setError, setAssembledText, setTranslatedChapters, setActiveSession,
        setSavedTranslationSession, setIsTranslationPaused, setLastUsageStats, setNovelUpdateBadges,
        toast, addToHistory, saveNovelToHistory, getReportSummaryText, getTranslateOpts,
        webdavAutoSync, webdavUrl, backupToWebDav, gdriveAutoSync, backupToGoogleDrive
      };

      const translationDispatcher = (window.TranslationLoopEngine || TranslationLoopEngine)?.Controller?.createTranslationDispatcher(translationCtx);
      const handleTranslateText = async (resume = false) => translationDispatcher?.translateText(resume);
      const handleTranslateEbook = async (chapters, resume = false, isEpubParam = false, originalZipParam = null) => translationDispatcher?.translateEbook(chapters, resume, isEpubParam, originalZipParam);

      const handleStartTranslation = async (resume = false) => {
        window.NativeBridge?.acquireWakeLock();
        if (chapters && chapters.length > 0) {
          window.NativeBridge?.showProgressNotification('Gemini Ebook Translator', resume ? 'Resuming book...' : 'Analyzing chapters...', 0);
          await handleTranslateEbook(chapters, resume, currentIsEpub, currentOriginalZip);
        } else {
          window.NativeBridge?.showProgressNotification('Gemini Translator', resume ? 'Resuming translation...' : 'Starting text translation...', 0);
          await handleTranslateText(resume);
        }
      };

      const cancelTranslation = () => {
        if (abortRef.current) {
          try { abortRef.current.abort(); } catch (err) {}
        }
        window.NativeBridge?.clearProgressNotification(false);
        window.NativeBridge?.releaseWakeLock();
        setIsTranslating(false);
        setProgressLabel('');
      };

      // --- File Handling (Delegated to DocumentParser.Controller) ---
      const processFile = (f) => window.DocumentParser?.Controller?.handleFile(f, { parseAssembledTextToChapters: typeof parseAssembledTextToChapters === 'function' ? parseAssembledTextToChapters : null, generateJobId, cleanText }, { setUploadingFile, setError, toast, onResetState: () => { setInputText(''); setAssembledText(''); setTranslatedChapters([]); setChapters([]); }, onBackupJson: file => importFullBackup({ target: { files: [file] } }), onFileHash: hashId => setCurrentFileHash(hashId), onResumeSession: async ({ savedSession, cleanedChapters, isEpub, originalZip }) => { setActiveSession(savedSession); await handleTranslateEbook(cleanedChapters, true, isEpub, originalZip); }, onLoaded: data => { if (data.rawText && !data.isEpub) setInputText(data.rawText); setCurrentIsEpub(data.isEpub); setCurrentOriginalZip(data.originalZip); setCurrentDocCover(data.cover || ''); setFileName(data.fileName); setCurrentDocTitle(data.docTitle); setChapters(data.chapters); }, onFinally: () => { if (fileInputRef.current) fileInputRef.current.value = ''; } });

      // --- Drag & Drop ---
      const onDragOver = e => { e.preventDefault(); setIsDragOver(true) };
      const onDragLeave = () => setIsDragOver(false);
      const onDrop = e => { e.preventDefault(); setIsDragOver(false); const f = e.dataTransfer.files[0]; if (f) processFile(f) };

      // Clipboard and Split handlers (Delegated to DocumentParser.Controller)
      const handlePasteFromClipboard = () => window.DocumentParser?.Controller?.handlePaste({ onPasted: text => { setInputText(text); setChapters([]); localStorage.setItem('inputText', text); }, toast });
      const handleAutoDetectSplit = () => window.DocumentParser?.Controller?.handleAutoSplit(inputText, { onSplit: chapters => setChapters(chapters), toast });
      const handleSwapLanguages = () => window.DocumentParser?.Controller?.handleSwap(srcLang, tgtLang, { onSwapped: (newSrc, newTgt) => { setSrcLang(newSrc); setTgtLang(newTgt); }, toast });

      // --- Download Handlers (Delegated to ExportEngine.Controller) ---
      const isGenericTitle = t => window.ExportEngine ? window.ExportEngine.isGenericTitle(t) : (!t || t.trim() === '' || /^translated\s*(document|file)?$/i.test(t.trim()));

      const getExportChapters = () => {
        if (window.ExportEngine?.getExportChapters) {
          return window.ExportEngine.getExportChapters({
            assembledText,
            translatedChapters,
            chapters,
            currentDocTitle,
            fileName,
            parseAssembledTextToChapters: typeof parseAssembledTextToChapters === 'function' ? parseAssembledTextToChapters : null,
            partitionTextByChapters: typeof partitionTextByChapters === 'function' ? partitionTextByChapters : null
          });
        }
        return [];
      };

      const handleDownloadPDF = () => window.ExportEngine?.Controller?.export('pdf', { chaptersToExport: getExportChapters(), tgtLang, fileName }, { setDownloadingPdf, setError, toast });
      const handleDownloadEPUB = () => window.ExportEngine?.Controller?.export('epub', { chaptersToExport: getExportChapters(), fileName, activeNovelRecord, currentDocTitle, webImportHistory, currentDocCover, activeCrawlSession, webImportData, tgtLang, currentIsEpub, currentOriginalZip }, { setDownloadingEpub, setEpubPackagingModal, setError, toast });
      const handleDownloadDOCX = () => window.ExportEngine?.Controller?.export('docx', { chaptersToExport: getExportChapters(), tgtLang }, { setDownloadingDocx, setError, toast });

      const disabled = isTranslating || uploadingFile;
      const activeModel = useCustomModel && customModel ? customModel : geminiModel;

      // ═══════════════════════════════════════
      // RENDER
      // ═══════════════════════════════════════
      // ═══════════════════════════════════
      // TWO LIGHTS RENDER (Phase 1)
      // ═══════════════════════════════════
      const [sheetOpen, setSheetOpen] = useState(false);
      const [glossaryEditorOpen, setGlossaryEditorOpen] = useState(false);
      const [logsModalOpen, setLogsModalOpen] = useState(false);
      const [glossaryCardOpen, setGlossaryCardOpen] = useState(() => localStorage.getItem('glossaryCardOpen') !== 'false');
      useEffect(() => { localStorage.setItem('glossaryCardOpen', String(glossaryCardOpen)); }, [glossaryCardOpen]);
      const [bulkKeyModalOpen, setBulkKeyModalOpen] = useState(false);
      const [keyHealth, setKeyHealth] = useState({});
      const [testingKeys, setTestingKeys] = useState(false);
      const [bulkKeyText, setBulkKeyText] = useState('');
      const [showLiveLogs, setShowLiveLogs] = useState(() => localStorage.getItem('showLiveLogs') === 'true');
      useEffect(() => { localStorage.setItem('showLiveLogs', String(showLiveLogs)); }, [showLiveLogs]);
      const logsContainerRef = useRef(null);
      const [liveLogs, setLiveLogs] = useState(() => window.AppLogger ? [...window.AppLogger.logs] : []);
      useEffect(() => {
        if ((!logsModalOpen && !showLiveLogs) || !window.AppLogger) return;
        setLiveLogs([...window.AppLogger.logs]);
        let rafId = null;
        let latestLogs = null;
        const unsub = window.AppLogger.subscribe(logs => {
          latestLogs = logs;
          if (!rafId) {
            rafId = requestAnimationFrame(() => {
              rafId = null;
              if (latestLogs) {
                setLiveLogs([...latestLogs]);
                if (logsContainerRef.current) {
                  logsContainerRef.current.scrollTop = logsContainerRef.current.scrollHeight;
                }
              }
            });
          }
        });
        return () => {
          if (rafId) cancelAnimationFrame(rafId);
          if (unsub) unsub();
        };
      }, [logsModalOpen, showLiveLogs]);

      // Live Agent Telemetry & Debugging (Method 2 Wireless Wi-Fi)
      const [telemetryEnabled, setTelemetryEnabled] = useState(() => localStorage.getItem('telemetry_enabled') !== 'false');
      const [telemetryVerbose, setTelemetryVerbose] = useState(() => localStorage.getItem('telemetry_verbose') !== 'false');
      const [telemetryServerUrl, setTelemetryServerUrl] = useState(() => localStorage.getItem('telemetry_server_url') || 'http://192.168.1.216:9090');
      const [telemetryTesting, setTelemetryTesting] = useState(false);
      const [telemetryStatus, setTelemetryStatus] = useState('idle');
      const [telemetryStatusMsg, setTelemetryStatusMsg] = useState('');

      const handleTestTelemetryConnection = () => window.TelemetryController?.testConnection(telemetryServerUrl, { setTesting: setTelemetryTesting, setStatus: setTelemetryStatus, setStatusMsg: setTelemetryStatusMsg, toast });
      const handleClearTelemetryServer = () => window.TelemetryController?.clearServerLogs(telemetryServerUrl, { toast });
      const [elapsedSec, setElapsedSec] = useState(0);
      const [libCollapsed, setLibCollapsed] = useState({ books: false, history: false });
      const [libQuery, setLibQuery] = useState('');
      const [libTab, setLibTab] = useState('all');
      const libMetrics = useMemo(() => {
        if (window.LibraryEngine?.computeLibraryMetrics) {
          return window.LibraryEngine.computeLibraryMetrics({
            webImportHistory,
            history,
            savedAudiobooks,
            libQuery,
            libTab,
            savedTranslationSession
          });
        }
        return {
          filteredBooks: webImportHistory || [],
          filteredHistory: history || [],
          filteredAudiobooks: savedAudiobooks || [],
          displayedBooks: webImportHistory || [],
          savedSpaceCount: 0,
          transCount: 0,
          incCount: 0,
          allCountLabel: (webImportHistory || []).length
        };
      }, [webImportHistory, history, savedAudiobooks, libQuery, libTab, savedTranslationSession]);
      const filteredBooks = libMetrics.filteredBooks;
      const filteredHistory = libMetrics.filteredHistory;
      const filteredAudiobooks = libMetrics.filteredAudiobooks;
      const displayedBooks = libMetrics.displayedBooks;
      const savedSpaceCount = libMetrics.savedSpaceCount;
      const transCount = libMetrics.transCount;
      const incCount = libMetrics.incCount;
      const allCountLabel = libMetrics.allCountLabel;
      const translateStartRef = useRef(null);
      useEffect(() => {
        if (!isTranslating) {
          translateStartRef.current = null;
          setElapsedSec(0);
          return;
        }
        if (!translateStartRef.current) {
          translateStartRef.current = Date.now();
        }
        const updateElapsed = () => {
          if (translateStartRef.current) {
            setElapsedSec(Math.max(0, Math.floor((Date.now() - translateStartRef.current) / 1000)));
          }
        };
        updateElapsed();
        const t = setInterval(updateElapsed, 1000);
        const handleVisibilityChange = () => {
          if (!document.hidden) updateElapsed();
        };
        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => {
          clearInterval(t);
          document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
      }, [isTranslating]);

      useEffect(() => { localStorage.setItem('readerTheme', readerTheme); }, [readerTheme]);
      useEffect(() => { localStorage.setItem('readerFont', readerFont); }, [readerFont]);
      useEffect(() => { localStorage.setItem('readerFontSize', String(readerFontSize)); }, [readerFontSize]);

      useEffect(() => {
        const openGloss = () => setGlossaryEditorOpen(true);
        window.addEventListener('open-glossary-editor', openGloss);
        return () => window.removeEventListener('open-glossary-editor', openGloss);
      }, []);

      useEffect(() => {
        const esc = (e) => {
          if (e.key === 'Escape') {
            setSheetOpen(false);
            setGlossaryEditorOpen(false);
          }
        };
        window.addEventListener('keydown', esc);
        return () => window.removeEventListener('keydown', esc);
      }, []);

      useEffect(() => {
        try {
          window.NativeBridge?.requestNotificationPermission?.();
        } catch (e) {}
      }, []);

      const importGlossaryFile = (e) => {
        const f = e.target.files && e.target.files[0];
        if (!f) return;
        readFileAsText(f)
          .then(t => { setTerminology(t); localStorage.setItem('terminology', t); toast('Glossary imported.'); })
          .catch(err => toast('Import failed: ' + err.message, 'error'));
        e.target.value = '';
      };

      const syncCrawlSessionChapters = (updatedChapters) => window.WebNovelCrawlerEngine?.ChapterList?.syncSession(updatedChapters, setActiveCrawlSession);
      const removeImportChapter = (idx) => window.WebNovelCrawlerEngine?.ChapterList?.removeChapter(idx, { webImportData, activeCrawlSession, setWebImportData, syncSession: syncCrawlSessionChapters, confirmAction });
      const moveImportChapter = (idx, dir) => window.WebNovelCrawlerEngine?.ChapterList?.moveChapter(idx, dir, { webImportData, activeCrawlSession, setWebImportData, syncSession: syncCrawlSessionChapters });
      const moveImportChapterToEdge = (idx, edge) => window.WebNovelCrawlerEngine?.ChapterList?.moveChapterToEdge(idx, edge, { webImportData, activeCrawlSession, setWebImportData, syncSession: syncCrawlSessionChapters, toast });
      const autoSortImportChapters = () => window.WebNovelCrawlerEngine?.ChapterList?.autoSort({ webImportData, activeCrawlSession, setWebImportData, syncSession: syncCrawlSessionChapters, toast });
      const reverseImportChapters = () => window.WebNovelCrawlerEngine?.ChapterList?.reverse({ webImportData, activeCrawlSession, setWebImportData, syncSession: syncCrawlSessionChapters, toast });
      const aiReorderImportChapters = () => window.WebNovelCrawlerEngine?.ChapterList?.aiReorder({ webImportData, activeCrawlSession, provider, getActiveApiKey, geminiModel, customModel, useCustomModel, customDeepseekModel, useCustomDeepseekModel }, { setIsAiSorting, setWebImportData, syncSession: syncCrawlSessionChapters, autoSort: autoSortImportChapters, toast });
      const handleExportRow = (kind) => window.ExportEngine?.Controller?.export(kind, { isTranslating, chaptersToExport: getExportChapters(), fileName, activeNovelRecord, currentDocTitle, webImportHistory, currentDocCover, activeCrawlSession, webImportData, tgtLang, currentIsEpub, currentOriginalZip }, { setSheetOpen, setDownloadingPdf, setDownloadingEpub, setDownloadingDocx, setEpubPackagingModal, setError, toast });

      const switchRow = (label, checked, onChange) => h('div', { className: 'set-row' },
        h('span', { className: 'l' }, label),
        h('button', { type: 'button', className: `switch ${checked ? 'on' : ''}`, onClick: () => onChange(!checked), 'aria-pressed': checked })
      );

      const chipSelectStyle = { background: 'var(--void)', border: '1px solid var(--hairline)', color: 'var(--paper-dim)', borderRadius: 8, padding: '4px 6px', fontSize: 11, outline: 'none', maxWidth: 170 };

      const tabTitle = activeTab === 'text' ? 'Translate' : activeTab === 'web_importer' ? 'Import' : activeTab === 'studio' ? 'Studio' : activeTab === 'history' ? 'Library' : 'Settings';
      const tabSub = activeTab === 'text'
        ? `${provider.toUpperCase()} · ${provider === 'gemini' ? geminiModel : provider === 'deepseek' ? deepseekModel : provider}`
        : activeTab === 'web_importer' ? 'AO3 · Lofter · Syosetu · Witch Cult'
        : activeTab === 'studio' ? 'Lossless EPUB Splitter & Merger'
        : activeTab === 'history' ? 'Novel Library & Saved Sessions'
        : 'API Keys, Typography & Sync';

      const navItems = [['text', 'Translate', Languages], ['web_importer', 'Import', Globe], ['studio', 'Studio', Layers], ['history', 'Library', Library], ['settings', 'Settings', Settings]];
      const appTabProps = {
        activeTab,
        // Tab 1: Translation
        error, setError, srcLang, setSrcLang, tgtLang, setTgtLang, handleSwapLanguages,
        chunkSizePreset, concurrency, inputText, setInputText, handleInputChange,
        inputCharCount, inputTokenCount, inputRef, fileInputRef, uploadingFile, processFile,
        onDragOver, onDragLeave, onDrop, isDragOver, handlePasteFromClipboard, inputBoxHeight,
        glossaryCardOpen, setGlossaryCardOpen, glossaryTermCount, applyGlossaryPreset,
        newGlossaryName, setNewGlossaryName, handleSaveGlossary, activeGlossaryId, setActiveGlossaryId,
        handleLoadGlossary, handleDeleteGlossary, handleUnloadGlossary, savedGlossaries,
        defaultGlossaryName, setDefaultGlossaryName, clearDefaultGloss, smartGlossary, setSmartGlossary,
        setGlossaryEditorOpen, handleOpenAutoGlossary, handleRunConsistencyCheck, isAuditingConsistency,
        customInstructions, setCustomInstructions, instructionsRef, terminology, setTerminology,
        savedTranslationSession, isTranslationPaused, activeSession, activeSessionRef,
        resumeSavedTranslation, discardSavedTranslation, chapters, setChapters, isTranslating,
        progress, progressLabel, elapsedSec, handlePauseTranslation, cancelTranslation,
        assembledText, setAssembledText, handleAssembledTextChange, translatedChapters,
        setTranslatedChapters, outputWordCount, outputRef, outputBoxHeight,
        handleOpenActiveQaModal, handleOpenDiffModal, copyText, handleDownloadEPUB,
        handleSaveTranslationToLibrarySpace, activeNovelRecord, activeCrawlSession,
        webImportData, webImportHistory, currentDocCover, setCurrentDocCover, currentDocTitle,
        fileName, handleLnoriDirectEpubDownload, setReaderChapterIdx, setReaderNovelId,
        setReaderNovelTitle, setReaderOpen, lastUsageStats, setLastUsageStats,
        showLiveLogs, setShowLiveLogs, liveLogs, logsContainerRef, copyDiagnosticsReport,
        copyLogsWithReport, setLogsModalOpen, handleStartTranslation, handleOpenCostEstimator,
        setSheetOpen, setActiveTab, setWebImportUrl, disabled, renderBoxResizeBar, switchRow,

        // Tab 2: Web Importer
        webImportUrl, webImportStatus, setWebImportStatus, webImportError, setWebImportError,
        isFetchingUrl, isFetchingPaused, activeNovelView, setActiveNovelRecord,
        novelSearchResults, setNovelSearchResults, novelSearchFilter, setNovelSearchFilter,
        isSearchingNovels, isSearchResultsCollapsed, setIsSearchResultsCollapsed,
        swiftAudioResults, setSwiftAudioResults, isSwiftAudioMode, setIsSwiftAudioMode,
        isSwiftAudioSearching, setIsSwiftAudioSearching, collapsedVolumes, setCollapsedVolumes,
        isAiSorting, epubPackagingModal, setEpubPackagingModal, epubIncludeImages, setEpubIncludeImages,
        scrapeImages, setScrapeImages, handleStartFetch, handlePauseFetch, handleCancelFetch,
        dismissCrawlSession, handleSearchNovels, handleSwiftAudioSearch, handleOpenSourcePluginsModal,
        handleCheckRezeroUpdates, exportCleanLnoriEpub, handleStartPlayAudiobook, handleOpenAudioDownload,
        isAudiobookInLibrary, saveAudiobookToLibrary, removeAudiobookFromLibrary, handleSetNovelFolder,
        toggleNovelSavedSpace, autoSortImportChapters, reverseImportChapters, aiReorderImportChapters,
        moveImportChapter, moveImportChapterToEdge, removeImportChapter, checkAndApplyNovelGlossary,
        loadFullNovel, getCustomTitle, setRenameModalNovel, setNewNovelTitleInput, setFileName,
        ongoingEpubInputRef, cleanBookTitle, cleanBookAuthor, generateEpubFromChapters,
        getEpubFileName, getEpubOptions, getNovelFolderOptions, saveUniversalBlob, InfoTooltip,

        // Tab 3: EPUB Studio
        studioSubTab, setStudioSubTab,

        // Tab 4: Novel Library
        libQuery, setLibQuery, epubRestoreInputRef, handleRestoreFromEpubFiles,
        handleSelectOngoingEpubFile, libTab, setLibTab, allCountLabel, filteredAudiobooks,
        savedSpaceCount, transCount, incCount, loadTrashCount, trashCount, trashList,
        savedAudiobooks, setSavedAudiobooks, confirmAction, audioPlayerState, setIsFullPlayerOpen,
        displayedBooks, handleClearSavedSpace, handleClearScopedBooks, handleCheckAllUpdates,
        isBatchChecking, checkingUpdates, downloadingUpdates, handleEmptyTrash, handleRestoreAllTrash,
        handleUpdateTranslateAndMakeEpub, handleDownloadNewChapters, handleCheckNovelUpdate,
        handleOpenContinuationForNovel, setActiveBookMenuNovel, handleRestoreNovel,
        handlePermanentDelete, clearAllNovelHistory, libCollapsed, setLibCollapsed,
        history, filteredHistory, loadFromHistory, deleteHistoryItem, clearHistory, novelUpdateBadges,

        // Tab 5: Settings
        appVersion, appVersionCode, checkForAppUpdate, downloadedOnly, setDownloadedOnly,
        incognitoMode, setIncognitoMode, settingsCategory, setSettingsCategory,
        provider, setProvider, apiKeysByProvider, activeKeyIds, showKeys, setShowKeys,
        addApiKey, deleteApiKey, updateApiKey, setActiveKey, testSingleKey, handleTestAllKeys,
        keyHealth, testingKeys, setBulkKeyModalOpen, libreUrl, setLibreUrl, geminiModel,
        setGeminiModel, deepseekModel, setDeepseekModel, customModel, setCustomModel,
        useCustomModel, setUseCustomModel, customDeepseekModel, setCustomDeepseekModel,
        useCustomDeepseekModel, setUseCustomDeepseekModel, enableStreaming, setEnableStreaming,
        enableThinking, setEnableThinking, strictModel, setStrictModel, setConcurrency,
        contextAware, setContextAware, setChunkSizePreset, healthAuditEnabled, setHealthAuditEnabled,
        qaProofreaderEnabled, setQaProofreaderEnabled, cjkLeakCheckEnabled, setCjkLeakCheckEnabled,
        antiMtlGateEnabled, setAntiMtlGateEnabled, translationMemoryEnabled, setTranslationMemoryEnabled,
        refreshTmStats, tmStats, handleClearTm, handleExportTmx, snapshotsEnabled, setSnapshotsEnabled,
        culturalFootnotesEnabled, setCulturalFootnotesEnabled, amoledMode, setAmoledMode,
        deviceWakeLock, setDeviceWakeLock, epubDropCaps, setEpubDropCaps, epubSmartQuotes,
        setEpubSmartQuotes, epubCleanWebArtifacts, setEpubCleanWebArtifacts, epubFontTheme,
        setEpubFontTheme, epubJustifyText, setEpubJustifyText, epubIncludeImages, setEpubIncludeImages,
        epubFixedFilename, setEpubFixedFilename, storageDiag, storageLoading, refreshStorageDiag,
        exportFullBackup, importFullBackup, pasteAndRestoreBackup, cloudProvider, setCloudProvider,
        webdavUrl, setWebdavUrl, webdavUser, setWebdavUser, webdavPass, setWebdavPass,
        webdavPath, setWebdavPath, webdavAutoSync, setWebdavAutoSync, webdavTesting,
        webdavSyncing, webdavLastSync, testWebDavConnection, backupToWebDav, restoreFromWebDav,
        gdriveConnected, gdriveUser, gdriveFolderMode, setGdriveFolderMode, gdriveAutoSync,
        setGdriveAutoSync, gdriveLastSync, gdriveTesting, gdriveSyncing, setGdriveConfigModalOpen,
        testGoogleDriveConnection, backupToGoogleDrive, restoreFromGoogleDrive, connectGoogleDrive,
        backupToGoogleDriveFile, disconnectGoogleDrive, opdsRunning, opdsUrl, opdsWifiUrl,
        toggleOpdsServer, telemetryEnabled, setTelemetryEnabled, telemetryVerbose, setTelemetryVerbose,
        telemetryServerUrl, setTelemetryServerUrl, telemetryTesting, telemetryStatus,
        telemetryStatusMsg, handleTestTelemetryConnection, handleClearTelemetryServer,
        handleInstallPWA, DEFAULT_GEMINI_MODELS, DEFAULT_DEEPSEEK_MODELS
      };

      return h(React.Fragment, null,
        h('div', { className: 'tl-app' },

          // ── HEADER ──
          h('header', { className: 'tl-head' },
            h('div', { className: 'tl-head-inner' },
              h('div', null,
                h('div', { className: 'tl-title' }, tabTitle),
                h('div', { className: 'tl-subtitle' }, tabSub)
              ),
              h('div', { style: { display: 'flex', gap: 8, alignItems: 'center' } },
                h('button', { type: 'button', className: 'version-chip', title: 'Check for updates', onClick: () => checkForAppUpdate(true) },
                  `v${appVersion}`, availableUpdate ? h('span', { className: 'dot' }) : null
                ),
                !isStandalone && h('button', { type: 'button', className: 'icon-btn', title: 'Install App on Device', onClick: handleInstallPWA }, ic(Download, 16))
              )
            )
          ),

          // ── UPDATE BANNER ──
          availableUpdate && h('div', { className: 'tl-wrap', style: { marginTop: 16 } },
            h('div', { className: 'card', style: { borderColor: 'rgba(124,135,255,.5)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 0 } },
              h('div', null,
                h('div', { style: { fontWeight: 700, fontSize: 13 } }, `Update Ready: v${availableUpdate.latestVersion}`),
                h('div', { style: { fontSize: 11.5, color: 'var(--slate)' } }, 'Tap to install the latest features and fixes.')
              ),
              h('div', { style: { display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' } },
                h('button', { type: 'button', className: 'mini-btn', disabled: isUpdating, onClick: handlePerformUpdate }, isUpdating ? 'Downloading…' : '⚡ Update Now'),
                h('button', {
                  type: 'button',
                  className: 'mini-btn ghost',
                  title: 'Download APK directly using your device browser',
                  onClick: () => {
                    const apkUrl = availableUpdate?.apkUrl || "https://github.com/ExZyO/Gemini-Translator/releases/latest/download/GeminiTranslator.apk";
                    window.AppLogger?.log('info', 'Updater', 'Opening browser download: ' + apkUrl);
                    window.open(apkUrl, '_blank');
                  }
                }, '🌐 Browser Download'),
                h('button', { type: 'button', className: 'icon-btn', onClick: () => setAvailableUpdate(null) }, '✕')
              )
            )
          ),

          h('main', { className: 'tl-wrap', style: { paddingTop: 16 } },
            h(window.AppTabsContainer || AppTabsContainer, appTabProps)
          ),

        // ── BOTTOM NAV ──
          h('nav', { className: 'bottomnav' },
            navItems.map(([key, label, Icon]) => {
              const isActive = activeTab === key;
              return h('button', {
                key,
                type: 'button',
                className: `nav-item ${isActive ? 'active' : ''}`,
                onClick: () => {
                  setActiveTab(key);
                  localStorage.setItem('activeTab', key);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }
              }, ic(Icon, 18), h('span', null, label));
            })
          )
        ),

        // ══════════════════════════════════════════════════════════════════════
        // CONSOLIDATED ROOT MODALS CONTAINER
        // ══════════════════════════════════════════════════════════════════════
        h(window.AppModalsContainer || AppModalsContainer, {
          // Export Tools Sheet
          sheetOpen, setSheetOpen, handleExportRow, isTranslating, handleAutoDetectSplit,
          setBoxPreset, setGlossaryEditorOpen, toast,

          // Diagnostics Logs Modal
          logsModalOpen, setLogsModalOpen, liveLogs, copyLogsWithReport,

          // Bulk API Key Import Modal
          bulkKeyModalOpen, setBulkKeyModalOpen, provider, bulkKeyText, setBulkKeyText, handleBulkImportKeys,

          // Glossary Editor Modal
          glossaryEditorOpen, setGlossaryEditorOpen, terminology, setTerminology, glossaryTermCount,
          activeGlossaryId, handleSaveGlossary, applyGlossaryPreset, handleAiOptimizeGlossary,
          isOptimizingGlossary, importGlossaryFile, exportGlossaryTxt, smartGlossary, setSmartGlossary,

          // Toast System
          toasts, setToasts,

          // Confirmation Dialog
          showModal, setShowModal, modalMessage, modalCallback, setModalCallback,

          // EPUB Packaging Progress Dock & Success
          epubPackagingModal, setEpubPackagingModal, downloadSuccessModal, setDownloadSuccessModal,

          // Moon+ Reader Modal
          MoonReaderModal, readerOpen, setReaderOpen, assembledText, getExportChapters,
          readerChapterIdx, setReaderChapterIdx, readerTheme, setReaderTheme, readerFont,
          setReaderFont, readerFontSize, setFontSize: setReaderFontSize, tgtLang,
          readerNovelId, readerNovelTitle, handleRunConsistencyCheck, handleOpenActiveQaModal, handleOpenDiffModal,

          // Library Novel Action Sheet
          activeBookMenuNovel, setActiveBookMenuNovel, getNovelFolderOptions, setRenameModalNovel,
          setNewNovelTitleInput, getCustomTitle, loadFullNovel, setActiveTab, setStudioSubTab,
          handleCheckNovelUpdate, handleOpenContinuationForNovel, handleOpenAutoGlossary,
          toggleNovelSavedSpace, handleSetNovelFolder, handleOpenNovelHealthModal,
          handleEnrichNovelMetadata, handleSplitNovelIntoArcs, confirmAction, deleteNovelFromHistory,

          // Ongoing EPUB Continuation Modal
          ongoingEpubModal, setOngoingEpubModal, updateNovelFolderRecord, handleScanContinuationToc,
          handleSearchContinuationSources, handleSelectContinuationSource, handleExecuteContinuation,

          // QA Report Modal
          qaModalOpen, setQaModalOpen, qaAuditResult, qaFilterCategory, setQaFilterCategory,
          qaCheckGaps, setQaCheckGaps, qaCheckCorrupt, setQaCheckCorrupt, qaCheckCjk,
          setQaCheckCjk, qaCheckAntiMtl, setQaCheckAntiMtl, qaCheckLoops, setQaCheckLoops,
          qaCheckDuplicates, setQaCheckDuplicates, qaAuditNovelRef, runNovelHealthAudit,
          onInspectChapterInReader: handleInspectChapterInReader,

          // Translation Diff & Revision History Modal
          diffModalOpen, setDiffModalOpen, activeDiffData, selectedDiffSnapId,
          handleSelectDiffSnapshot, diffSnapshotsList, handleManualSnapshot, handleRollbackDiffSnapshot,

          // Auto-Glossary Modal
          autoGlossaryModalOpen, setAutoGlossaryModalOpen, autoGlossaryTargetNovel,
          setAutoGlossaryTargetNovel, chapters, activeNovelRecord, autoGlossaryChapterCount,
          setAutoGlossaryChapterCount, isExtractingGlossary, handleExtractGlossary,
          extractedTerms, setExtractedTerms, handleApplyExtractedTerms,

          // Name Consistency Modal
          consistencyModalOpen, setConsistencyModalOpen, consistencyAuditResults,
          handleBatchFixDrift, isAuditingConsistency,

          // Google Drive Config Modal
          gdriveConfigModalOpen, setGdriveConfigModalOpen, gdriveClientId, setGdriveClientId,
          gdriveManualToken, setGdriveManualToken, setGdriveConnected, testGoogleDriveConnection,

          // SwiftAudio Player & Batch Downloader
          audioPlayerState, amoledMode, isFullPlayerOpen, setIsFullPlayerOpen,
          isPlayerFullscreen, setIsPlayerFullscreen, isAudiobookInLibrary, saveAudiobookToLibrary,
          removeAudiobookFromLibrary, handleOpenAudioDownload, downloadingTrackId,
          setDownloadingTrackId, audioDownloadModal, setAudioDownloadModal, handleExecuteAudioBatchDownload,

          // Novel Rename Modal
          renameModalNovel, newNovelTitleInput, handleSaveNovelRename,

          // Source Extensions Modal
          sourcePluginsModalOpen, setSourcePluginsModalOpen, pluginSelectedTab,
          setPluginSelectedTab, pluginCatalog, isCatalogLoading, pluginSearchQuery,
          setPluginSearchQuery, pluginSelectedLangFilter, setPluginSelectedLangFilter,
          installingPluginId, handleUninstallPlugin, handleInstallPlugin,
          customPluginUrl, setCustomPluginUrl, handleInstallCustomPluginUrl,

          // Cost Estimator Modal
          costEstimatorModalOpen, setCostEstimatorModalOpen, costEstimatorData, handleStartTranslation,

          // EPUB Studio Preview Modal
          modalHtml: window.modalHtml || (typeof modalHtml !== 'undefined' ? modalHtml : '')
        })
      );
    }


    const root = document.getElementById('root');
    if (root) ReactDOM.createRoot(root).render(h(ErrorBoundary, null, h(App)));